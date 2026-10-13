import { useState, useEffect, useRef, useCallback } from 'react';

export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

interface TimerState {
  timeLeft: number;
  isRunning: boolean;
  mode: TimerMode;
  totalTime: number;
}

export function useTimer(durations: { focus: number; shortBreak: number; longBreak: number }) {
  const [state, setState] = useState<TimerState>(() => ({
    timeLeft: durations.focus * 60,
    isRunning: false,
    mode: 'focus' as TimerMode,
    totalTime: durations.focus * 60,
  }));

  const intervalRef = useRef<number | null>(null);
  const onCompleteRef = useRef<(() => void) | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    setState(prev => ({ ...prev, isRunning: true }));
  }, []);

  const pause = useCallback(() => {
    setState(prev => ({ ...prev, isRunning: false }));
    clearTimer();
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    const duration = durations[state.mode] * 60;
    setState(prev => ({
      ...prev,
      timeLeft: duration,
      totalTime: duration,
      isRunning: false,
    }));
  }, [clearTimer, durations, state.mode]);

  const switchMode = useCallback((mode: TimerMode) => {
    clearTimer();
    const duration = durations[mode] * 60;
    setState({
      timeLeft: duration,
      isRunning: false,
      mode,
      totalTime: duration,
    });
  }, [clearTimer, durations]);

  const setOnComplete = useCallback((callback: () => void) => {
    onCompleteRef.current = callback;
  }, []);

  useEffect(() => {
    if (state.isRunning && state.timeLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setState(prev => {
          if (prev.timeLeft <= 1) {
            if (onCompleteRef.current) {
              onCompleteRef.current();
            }
            return { ...prev, timeLeft: 0, isRunning: false };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    } else if (state.timeLeft === 0) {
      clearTimer();
    }

    return clearTimer;
  }, [state.isRunning, state.timeLeft, clearTimer]);

  // Update timeLeft when durations change and timer is not running
  useEffect(() => {
    if (!state.isRunning) {
      const duration = durations[state.mode] * 60;
      setState(prev => ({
        ...prev,
        timeLeft: duration,
        totalTime: duration,
      }));
    }
  }, [durations, state.mode, state.isRunning]);

  const progress = state.totalTime > 0 ? ((state.totalTime - state.timeLeft) / state.totalTime) * 100 : 0;

  return {
    ...state,
    progress,
    start,
    pause,
    reset,
    switchMode,
    setOnComplete,
  };
}
