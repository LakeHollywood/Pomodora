#!/usr/bin/env python3
"""
STS Daemon Consumer
Polls the SQLite quarantine queue, triages anchors by risk score,
processes them, and handles exponential backoff for retries.
"""
import sqlite3
import time
import json
import os
import random

QUEUE_DB = os.getenv("STS_QUEUE_DB", "/tmp/sts/anchor_queue.db")
MAX_RETRIES = 3

def process_anchor(payload_str):
    """Simulates ledger submission and anchor verification."""
    data = json.loads(payload_str)
    risk = data.get("risk_score", 0)

    # Simulate occasional processing failure for high-risk items to test retry backoff
    if risk >= 75 and random.random() < 0.25:
        raise RuntimeError("Ledger congestion / signature verification timeout")

    time.sleep(0.4) # Simulate processing time

def run_daemon():
    print("🛡️ Starting STS Daemon Consumer (Press Ctrl+C to stop)")
    while True:
        now = time.time()
        with sqlite3.connect(QUEUE_DB) as conn:
            conn.execute("PRAGMA busy_timeout=5000;")
            cursor = conn.cursor()

            # Fetch pending or retry-ready anchors
            cursor.execute("""
                SELECT id, ledger_seq, payload, retry_count 
                FROM quarantine_queue 
                WHERE status IN ('PENDING', 'RETRY') AND next_retry <= ?
                LIMIT 10
            """, (now,))
            rows = cursor.fetchall()

            if not rows:
                time.sleep(1)
                continue

            # Triage items: Parse payload and sort by risk_score DESC (highest risk first)
            batch = []
            for row in rows:
                row_id, ledger_seq, payload_str, retry_count = row
                try:
                    payload_data = json.loads(payload_str)
                    risk_score = payload_data.get("risk_score", 0)
                except Exception:
                    risk_score = 0
                batch.append((risk_score, row_id, ledger_seq, payload_str, retry_count))

            batch.sort(key=lambda x: x[0], reverse=True)

            for risk_score, row_id, ledger_seq, payload_str, retry_count in batch:
                print(f"⚙️ Processing Seq #{ledger_seq} | Risk: {risk_score} | Attempt: {retry_count + 1}")
                try:
                    process_anchor(payload_str)

                    # Mark Success
                    conn.execute("""
                        UPDATE quarantine_queue 
                        SET status = 'SUCCESS' 
                        WHERE id = ?
                    """, (row_id,))
                    conn.commit()
                    print(f"✨ Successfully anchored Seq #{ledger_seq}")

                except Exception as e:
                    new_retry_count = retry_count + 1
                    if new_retry_count >= MAX_RETRIES:
                        # Mark Failed permanently
                        conn.execute("""
                            UPDATE quarantine_queue 
                            SET status = 'FAILED', retry_count = ? 
                            WHERE id = ?
                        """, (new_retry_count, row_id))
                        conn.commit()
                        print(f"❌ Anchor Seq #{ledger_seq} FAILED permanently after {new_retry_count} retries: {e}")
                    else:
                        # Exponential backoff: 2^retry_count seconds (e.g., 2s, 4s, 8s...)
                        backoff = 2 ** new_retry_count
                        next_retry_time = time.time() + backoff
                        conn.execute("""
                            UPDATE quarantine_queue 
                            SET status = 'RETRY', retry_count = ?, next_retry = ? 
                            WHERE id = ?
                        """, (new_retry_count, next_retry_time, row_id))
                        conn.commit()
                        print(f"🔄 Anchor Seq #{ledger_seq} failed. Retry #{new_retry_count} scheduled in {backoff}s: {e}")

if __name__ == "__main__":
    if not os.path.exists(QUEUE_DB):
        print(f"⚠️ Queue DB not found at {QUEUE_DB}. Start the producer first.")
    else:
        try:
            run_daemon()
        except KeyboardInterrupt:
            print("\n🛑 Daemon stopped.")
