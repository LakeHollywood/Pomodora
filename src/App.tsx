import { useState, useEffect, useCallback } from 'react';
import { useTimer, TimerMode } from './hooks/useTimer';
import { useLocalStorage } from './hooks/useLocalStorage';

interface FocusSession {
  date: string;
  duration: number; // in minutes
  completedAt: string;
}

interface Stats {
  sessions: FocusSession[];
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function App() {
  const [durations, setDurations] = useLocalStorage('pomodoro-durations', {
    focus: 25,
    shortBreak: 5,
    longBreak: 15,
  });

  const [stats, setStats] = useLocalStorage<Stats>('pomodoro-stats', { sessions: [] });
  const [showSettings, setShowSettings] = useState(false);
  const [tempDurations, setTempDurations] = useState(durations);

  const timer = useTimer(durations);

  const handleTimerComplete = useCallback(() => {
    if (timer.mode === 'focus') {
      const session: FocusSession = {
        date: getToday(),
        duration: durations.focus,
        completedAt: new Date().toISOString(),
      };
      setStats(prev => ({
        sessions: [...prev.sessions, session],
      }));
    }
  }, [timer.mode, durations.focus, setStats]);

  useEffect(() => {
    timer.setOnComplete(handleTimerComplete);
  }, [handleTimerComplete, timer.setOnComplete]);

  // Get today's stats
  const today = getToday();
  const todaySessions = stats.sessions.filter(s => s.date === today);
  const todayPomodoros = todaySessions.length;
  const todayFocusMinutes = todaySessions.reduce((sum, s) => sum + s.duration, 0);
  const todayFocusHours = Math.floor(todayFocusMinutes / 60);
  const todayRemainingMinutes = todayFocusMinutes % 60;

  // Weekly stats
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekStart = weekAgo.toISOString().split('T')[0];
  const weekSessions = stats.sessions.filter(s => s.date >= weekStart);
  const weekPomodoros = weekSessions.length;
  const weekFocusMinutes = weekSessions.reduce((sum, s) => sum + s.duration, 0);

  const modeConfig: Record<TimerMode, { label: string; color: string; bgColor: string; ringColor: string }> = {
    focus: { label: 'Focus', color: 'text-rose-600', bgColor: 'bg-rose-50', ringColor: '#e11d48' },
    shortBreak: { label: 'Short Break', color: 'text-emerald-600', bgColor: 'bg-emerald-50', ringColor: '#059669' },
    longBreak: { label: 'Long Break', color: 'text-blue-600', bgColor: 'bg-blue-50', ringColor: '#2563eb' },
  };

  const currentMode = modeConfig[timer.mode];

  const handleSaveSettings = () => {
    setDurations(tempDurations);
    setShowSettings(false);
  };

  const handleResetStats = () => {
    if (window.confirm('Are you sure you want to reset all statistics?')) {
      setStats({ sessions: [] });
    }
  };

  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (timer.progress / 100) * circumference;

  return (
    <div className={`min-h-screen ${currentMode.bgColor} transition-colors duration-700`}>
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
            <span className="text-3xl">🍅</span>
            Pomodoro Focus
          </h1>
          <p className="text-gray-500 text-sm mt-1">Stay focused, take breaks</p>
        </header>

        {/* Mode Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          {(['focus', 'shortBreak', 'longBreak'] as TimerMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => timer.switchMode(mode)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                timer.mode === mode
                  ? `${modeConfig[mode].bgColor} ${modeConfig[mode].color} shadow-md scale-105`
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
              }`}
            >
              {modeConfig[mode].label}
            </button>
          ))}
        </div>

        {/* Timer Circle */}
        <div className="flex justify-center mb-8">
          <div className="relative w-72 h-72">
            {/* SVG Circle */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 260 260">
              {/* Background circle */}
              <circle
                cx="130"
                cy="130"
                r="120"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              {/* Progress circle */}
              <circle
                cx="130"
                cy="130"
                r="120"
                fill="none"
                stroke={currentMode.ringColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            {/* Timer Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-mono font-bold text-gray-800 tracking-tight">
                {formatTime(timer.timeLeft)}
              </span>
              <span className={`text-sm font-medium mt-2 ${currentMode.color}`}>
                {currentMode.label}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={timer.reset}
            className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-gray-500 hover:text-gray-700 hover:shadow-lg transition-all active:scale-95"
            title="Reset"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button
            onClick={timer.isRunning ? timer.pause : timer.start}
            className={`w-16 h-16 rounded-full shadow-lg flex items-center justify-center text-white transition-all active:scale-95 hover:shadow-xl ${
              timer.mode === 'focus'
                ? 'bg-rose-500 hover:bg-rose-600'
                : timer.mode === 'shortBreak'
                ? 'bg-emerald-500 hover:bg-emerald-600'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
            title={timer.isRunning ? 'Pause' : 'Start'}
          >
            {timer.isRunning ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => {
              setTempDurations(durations);
              setShowSettings(!showSettings);
            }}
            className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-gray-500 hover:text-gray-700 hover:shadow-lg transition-all active:scale-95"
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 animate-in">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Timer Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-600">Focus Duration (min)</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTempDurations(prev => ({ ...prev, focus: Math.max(1, prev.focus - 1) }))}
                    className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={tempDurations.focus}
                    onChange={(e) => setTempDurations(prev => ({ ...prev, focus: Math.min(120, Math.max(1, parseInt(e.target.value) || 1)) }))}
                    className="w-16 text-center border border-gray-200 rounded-lg py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                  <button
                    onClick={() => setTempDurations(prev => ({ ...prev, focus: Math.min(120, prev.focus + 1) }))}
                    className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-600">Short Break (min)</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTempDurations(prev => ({ ...prev, shortBreak: Math.max(1, prev.shortBreak - 1) }))}
                    className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={tempDurations.shortBreak}
                    onChange={(e) => setTempDurations(prev => ({ ...prev, shortBreak: Math.min(30, Math.max(1, parseInt(e.target.value) || 1)) }))}
                    className="w-16 text-center border border-gray-200 rounded-lg py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                  <button
                    onClick={() => setTempDurations(prev => ({ ...prev, shortBreak: Math.min(30, prev.shortBreak + 1) }))}
                    className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-600">Long Break (min)</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTempDurations(prev => ({ ...prev, longBreak: Math.max(1, prev.longBreak - 1) }))}
                    className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={tempDurations.longBreak}
                    onChange={(e) => setTempDurations(prev => ({ ...prev, longBreak: Math.min(60, Math.max(1, parseInt(e.target.value) || 1)) }))}
                    className="w-16 text-center border border-gray-200 rounded-lg py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <button
                    onClick={() => setTempDurations(prev => ({ ...prev, longBreak: Math.min(60, prev.longBreak + 1) }))}
                    className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full mt-5 py-2.5 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors active:scale-[0.98]"
            >
              Save Settings
            </button>
          </div>
        )}

        {/* Statistics */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Today's Focus</h2>
            <span className="text-xs text-gray-400">{today}</span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-rose-50 rounded-xl">
              <div className="text-2xl font-bold text-rose-600">{todayPomodoros}</div>
              <div className="text-xs text-gray-500 mt-1">Pomodoros</div>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-xl">
              <div className="text-2xl font-bold text-amber-600">
                {todayFocusHours > 0 ? `${todayFocusHours}h` : ''}{todayRemainingMinutes}m
              </div>
              <div className="text-xs text-gray-500 mt-1">Focus Time</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-xl">
              <div className="text-2xl font-bold text-purple-600">{todayFocusMinutes}</div>
              <div className="text-xs text-gray-500 mt-1">Minutes</div>
            </div>
          </div>

          {/* Weekly Summary */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-600">This Week</h3>
              <button
                onClick={handleResetStats}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Reset All
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-gray-800">{weekPomodoros}</span>
                  <span className="text-xs text-gray-500">sessions</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-gray-800">{Math.floor(weekFocusMinutes / 60)}h {weekFocusMinutes % 60}m</span>
                  <span className="text-xs text-gray-500">total</span>
                </div>
              </div>
            </div>

            {/* Mini bar chart for last 7 days */}
            <div className="mt-4 flex items-end gap-1 h-16">
              {Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                const dateStr = date.toISOString().split('T')[0];
                const daySessions = stats.sessions.filter(s => s.date === dateStr);
                const dayMinutes = daySessions.reduce((sum, s) => sum + s.duration, 0);
                const maxMinutes = Math.max(...Array.from({ length: 7 }, (_, j) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (6 - j));
                  const ds = d.toISOString().split('T')[0];
                  return stats.sessions.filter(s => s.date === ds).reduce((sum, s) => sum + s.duration, 0);
                }), 1);
                const height = maxMinutes > 0 ? (dayMinutes / maxMinutes) * 100 : 0;
                const isToday = dateStr === today;
                const dayLabel = date.toLocaleDateString('en', { weekday: 'short' }).charAt(0);

                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center h-12">
                      <div
                        className={`w-full max-w-[20px] rounded-t-sm transition-all ${
                          isToday ? 'bg-rose-400' : 'bg-gray-200'
                        }`}
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                    </div>
                    <span className={`text-[10px] ${isToday ? 'font-bold text-rose-500' : 'text-gray-400'}`}>
                      {dayLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-8 text-xs text-gray-400">
          <p>Stay focused. Take breaks. Be productive.</p>
        </footer>
      </div>
    </div>
  );
}
