import { useEffect, useState, useRef, memo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../stores/sessionStore';
import { useGoalStore } from '../stores/goalStore';
import { useFrameworkStore } from '../stores/frameworkStore';
import { motion } from 'framer-motion';
import { logClientError } from '../utils/logClientError';
import { logUserFailure } from '../utils/failureReporter';
import { useToastStore } from '../stores/toastStore';



const TimerDisplay = memo(function TimerDisplay({
  seconds,
  isCountdown,
}: {
  seconds: number;
  isCountdown: boolean;
}) {
  const formatTime = (s: number): string => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="text-center">
      <span className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mb-4 block opacity-80">
        {isCountdown ? 'Counting Down' : 'Focus Active'}
      </span>
      <h1 className={`text-8xl font-black mb-6 tracking-tighter tabular-nums ${seconds === 0 && isCountdown ? 'text-rose-500 animate-pulse' : 'text-white'}`}>
        {formatTime(seconds)}
      </h1>
    </div>
  );
});

export const Session = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const goalId = params.get('goalId') || '';
  const { goals, load: loadGoals } = useGoalStore();
  const { frameworks, load: loadFrameworks } = useFrameworkStore();
  const { activeSession, start, end, skip, restoreSession } = useSessionStore();
  const { showToast } = useToastStore();

  const [selectedFw, setSelectedFw] = useState<string>('');

  const [didAchieveGoal, setDidAchieveGoal] = useState<boolean | null>(null);
  const [showEndForm, setShowEndForm] = useState(false);
  const [mistake, setMistake] = useState('');
  const [improvementSuggestion, setImprovementSuggestion] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [isFocusMode, setIsFocusMode] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // AudioContext — created once on first user gesture
  const audioCtxRef = useRef<AudioContext | null>(null);
  // Ref-mirror of alarmSound so the setInterval closure never has a stale value
  const alarmSoundRef = useRef<string>('none');
  // Ref guard — prevents the alarm firing more than once per session.
  // Tracks the session ID so that restoreSession re-setting the same session
  // object does NOT reset the guard mid-session.
  const alarmFiredForSessionRef = useRef<string | null>(null);
  // Ref to hold the stop function for the continuously looping alarm
  const stopAlarmRef = useRef<(() => void) | null>(null);
  const playSoundRef = useRef<() => void>(() => undefined);


  // New features state
  const [frameworkInputs, setFrameworkInputs] = useState<{ key: string; value: string }[]>(
    [{ key: 'focus', value: '' }, { key: 'method', value: '' }]
  );
  const [alarmSound, setAlarmSound] = useState<string>('none');

  // Keep ref in sync whenever the user changes the sound selection
  useEffect(() => { alarmSoundRef.current = alarmSound; }, [alarmSound]);
  const [workDuration, setWorkDuration] = useState<number>(25);
  const [restDuration, setRestDuration] = useState<number>(5);
  const [alarmTriggered, setAlarmTriggered] = useState(false);

  const goal = goals.find(g => String(g.id) === String(goalId));

  useEffect(() => {
    void loadGoals();
    void loadFrameworks();
    void restoreSession();
  }, [loadGoals, loadFrameworks, restoreSession]);

  // Bug #2: restore framework inputs when an active session is found on load
  useEffect(() => {
    if (activeSession?.status === 'active' && activeSession.frameworkData) {
      try {
        const parsed = JSON.parse(activeSession.frameworkData as string) as Record<string, string>;
        const entries = Object.entries(parsed);
        if (entries.length > 0) {
          setFrameworkInputs(entries.map(([key, value]) => ({ key, value })));
        }
      } catch {
        // frameworkData not parseable — leave defaults in place
      }
    }
  }, [activeSession]);

  // Create (or resume) the AudioContext on user gesture — required by browser autoplay policy
  const initAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    } else if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const stopAlarm = () => {
    if (stopAlarmRef.current) {
      stopAlarmRef.current();
      stopAlarmRef.current = null;
    }
    setAlarmTriggered(false);
  };

  // Play a continuous tone via Web Audio API until stopped
  const playSound = () => {
    const key = alarmSoundRef.current;
    if (key === 'none') return;

    const ctx = audioCtxRef.current ?? new AudioContext();
    audioCtxRef.current = ctx;

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => startContinuousSound(ctx, key));
    } else {
      startContinuousSound(ctx, key);
    }
  };

  const startContinuousSound = (ctx: AudioContext, type: string) => {
    if (stopAlarmRef.current) stopAlarmRef.current(); // Stop any existing
    
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(ctx.destination);
    
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const nodesToStop: { stop: () => void; disconnect: () => void }[] = [];

    if (type === 'nuke') {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      const lfo = ctx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.setValueAtTime(4, ctx.currentTime); 
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(50, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(masterGain);
      osc.start(); lfo.start();
      nodesToStop.push(osc, lfo);
    } else if (type === 'sirens') {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      const lfo = ctx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.setValueAtTime(1, ctx.currentTime); 
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(200, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(masterGain);
      osc.start(); lfo.start();
      nodesToStop.push(osc, lfo);
    } else if (type === 'chimes') {
      let noteIdx = 0;
      const notes = [880, 1108, 1318];
      const playChime = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = notes[noteIdx % notes.length];
        noteIdx++;
        osc.connect(gain);
        gain.connect(masterGain);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.5);
      };
      playChime();
      intervalId = setInterval(playChime, 600);
    }

    stopAlarmRef.current = () => {
      masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      setTimeout(() => {
        nodesToStop.forEach((n) => {
          try {
            n.stop();
            n.disconnect();
          } catch (err) {
            logClientError('Session.audioTeardown', err);
          }
        });
        if (intervalId) clearInterval(intervalId);
        masterGain.disconnect();
      }, 150);
    };
  };

  useEffect(() => {
    // Only reset alarm guard when the SESSION ID changes (new session),
    // NOT on every activeSession object change (e.g. restoreSession re-set).
    const currentSessionId = activeSession?.id ?? null;
    const guardedId = alarmFiredForSessionRef.current;
    const isNewSession = currentSessionId !== guardedId;

    if (!activeSession || activeSession.status !== 'active') {
      // No active session — clear timer and alarm
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      if (isNewSession) {
        // Moving away from a session — reset guard
        alarmFiredForSessionRef.current = null;
        setAlarmTriggered(false);
        if (stopAlarmRef.current) stopAlarmRef.current();
      }
      return;
    }

    if (isNewSession) {
      // Genuinely new session — reset alarm guard and stop any prior alarm
      alarmFiredForSessionRef.current = currentSessionId;
      setAlarmTriggered(false);
      if (stopAlarmRef.current) stopAlarmRef.current();
    }

    // Keep playSoundRef current inside this closure
    playSoundRef.current = playSound;

    const startMs = activeSession.startTime;
    const workTimeMin = activeSession.workTime;

    // Clear any existing interval before creating a new one
    if (timerRef.current) clearInterval(timerRef.current);

    // Immediately calculate elapsed to catch post-refresh case where time already passed
    const immediateElapsed = Math.floor((Date.now() - startMs) / 1000);
    setElapsed(immediateElapsed);
    if (workTimeMin && workTimeMin > 0) {
      const totalSeconds = workTimeMin * 60;
      if (immediateElapsed >= totalSeconds && alarmFiredForSessionRef.current === currentSessionId) {
        // Time already exceeded — trigger alarm immediately without waiting for next tick
        setAlarmTriggered(true);
        playSoundRef.current();
        // Mark as fired so the interval doesn't re-trigger it
        alarmFiredForSessionRef.current = `fired:${currentSessionId}`;
      }
    }

    timerRef.current = setInterval(() => {
      const newElapsed = Math.floor((Date.now() - startMs) / 1000);
      setElapsed(newElapsed);

      if (workTimeMin && workTimeMin > 0) {
        const totalSeconds = workTimeMin * 60;
        const alreadyFired = alarmFiredForSessionRef.current === `fired:${currentSessionId}`;
        if (newElapsed >= totalSeconds && !alreadyFired) {
          alarmFiredForSessionRef.current = `fired:${currentSessionId}`;
          setAlarmTriggered(true);
          playSoundRef.current();
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      // Do NOT stop the alarm here — let the user dismiss it manually
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id, activeSession?.status, activeSession?.startTime, activeSession?.workTime]);

  const handleStart = async () => {
    const gid = goalId.trim();
    if (!gid) return;

    // Initialize AudioContext on this user gesture — satisfies browser autoplay policy
    initAudioCtx();

    // Convert inputs to record
    const data: Record<string, string> = {};
    frameworkInputs.forEach(input => {
      if (input.key && input.value) data[input.key] = input.value;
    });

    await start(gid, data, workDuration, restDuration);
  };

  const handleEnd = async () => {
    if (didAchieveGoal === null) return;
    if (didAchieveGoal === false && activeSession?.goalId) {
      await logUserFailure({
        goalId: String(activeSession.goalId),
        linkedId: String(activeSession.id),
        type: 'session',
        message: mistake || 'Session journal marked as not completed',
        timestamp: new Date().toISOString(),
      });
      showToast('Session failure logged', 'info');
    }
    await end(didAchieveGoal, mistake, improvementSuggestion);
    stopAlarm();
    setShowEndForm(false);
    navigate('/goals');
  };

  const handleSkip = async () => {
    const ok = window.confirm('Are you sure you want to skip this session?');
    if (ok) {
      await skip('User skipped');
      navigate('/goals');
    }
  };

  const addFrameworkField = () => {
    setFrameworkInputs([...frameworkInputs, { key: '', value: '' }]);
  };

  const updateFrameworkField = (index: number, field: 'key' | 'value', val: string) => {
    const next = [...frameworkInputs];
    next[index][field] = val;
    setFrameworkInputs(next);
  };

  const removeFrameworkField = (index: number) => {
    if (frameworkInputs.length <= 2) return;
    setFrameworkInputs(frameworkInputs.filter((_, i) => i !== index));
  };

  // Setup View
  if (!activeSession && !showEndForm) {
    const isReady = frameworkInputs.filter(f => f.key.trim() && f.value.trim()).length >= 2;

    return (
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[80vh] p-4 font-sans text-slate-100">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg bg-[#13151A] border border-white/5 rounded-3xl p-8 shadow-2xl relative max-h-[95vh] overflow-y-auto no-scrollbar"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-cyan-400 opacity-50" />
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black tracking-tight mb-2">Initialize Session</h2>
            {goal ? (
              <p className="text-slate-400 font-medium">Goal: <span className="text-cyan-400">{goal.title || 'Unknown'}</span></p>
            ) : (
              <p className="text-rose-400 mb-4 text-sm font-bold">Please select a goal first.</p>
            )}
          </div>

          {goal && (
            <div className="space-y-6">
              {/* Framework Inputs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Session Framework (Min 2)</label>
                  <button 
                    onClick={addFrameworkField}
                    className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-all duration-300 flex items-center gap-1 uppercase"
                  >
                    <span>+ Add Field</span>
                  </button>
                </div>

                <select
                  value={selectedFw}
                  onChange={e => {
                    const fwId = e.target.value;
                    setSelectedFw(fwId);
                    if (!fwId) {
                      setFrameworkInputs([{ key: 'focus', value: '' }, { key: 'method', value: '' }]);
                      return;
                    }
                    const fw = frameworks.find(f => String(f.id) === String(fwId));
                    if (fw) {
                      setFrameworkInputs(fw.keys.map(k => ({ key: k.label || k.key, value: '' })));
                    }
                  }}
                  className="w-full bg-white/5 border border-white/10 p-3 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-bold text-slate-200 mb-2 appearance-none"
                >
                  <option value="" className="bg-[#13151A]">Custom Framework (Manual)</option>
                  {frameworks.map(f => (
                    <option key={f.id} value={f.id} className="bg-[#13151A]">{f.name}</option>
                  ))}
                </select>
                
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 no-scrollbar">
                  {frameworkInputs.map((input, i) => (
                    <div key={i} className="flex gap-2 group">
                      <input
                        type="text"
                        placeholder="Key (e.g. Focus)"
                        value={input.key}
                        onChange={e => updateFrameworkField(i, 'key', e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 p-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={input.value}
                        onChange={e => updateFrameworkField(i, 'value', e.target.value)}
                        className="flex-[2] bg-white/5 border border-white/10 p-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600"
                      />
                      {frameworkInputs.length > 2 && (
                        <button 
                          onClick={() => removeFrameworkField(i)}
                          className="p-2 text-slate-600 hover:text-rose-500 transition-all duration-300"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Duration Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Work (min)</label>
                  <input
                    type="number"
                    min="0"
                    value={workDuration}
                    onChange={e => setWorkDuration(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 p-3 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-bold"
                  />
                  <p className="text-[8px] text-slate-600 mt-1 uppercase tracking-tighter">0 = Stopwatch mode</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Rest (min)</label>
                  <input
                    type="number"
                    min="0"
                    value={restDuration}
                    onChange={e => setRestDuration(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 p-3 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-bold"
                  />
                </div>
              </div>

              {/* Alarm Selection */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3">Alarm Sound (On End)</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['none', 'chimes', 'sirens', 'nuke'] as const).map(sound => (
                    <button
                      key={sound}
                      onClick={() => setAlarmSound(sound)}
                      className={`py-2 text-[10px] font-bold rounded-xl border transition-all uppercase ${
                        alarmSound === sound 
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                          : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'
                      }`}
                    >
                      {sound}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleStart}
                  disabled={!isReady}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black py-4 text-sm rounded-2xl hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all disabled:opacity-20 disabled:grayscale uppercase tracking-widest"
                >
                  Start Session
                </button>
                <button 
                  onClick={() => navigate('/goals')} 
                  className="w-full mt-4 text-slate-600 text-[10px] font-bold hover:text-slate-400 uppercase tracking-widest transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // End Form View
  if (showEndForm) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[60vh] p-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-secondary/10 border border-secondary/20 rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-6 text-center text-accent">Session Journaling</h2>
          
          <div className="flex flex-col gap-5">
            <div>
              <label className="text-sm font-semibold text-secondary block mb-3">Did you achieve your goal? *</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setDidAchieveGoal(true)}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                    didAchieveGoal === true ? 'bg-success text-background shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-secondary/10 text-secondary'
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setDidAchieveGoal(false)}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                    didAchieveGoal === false ? 'bg-error text-background shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-secondary/10 text-secondary'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-secondary block mb-1">Mistake (optional)</label>
              <input
                type="text"
                placeholder="What went wrong?"
                value={mistake}
                onChange={e => setMistake(e.target.value)}
                className="w-full bg-background border border-secondary/20 p-3 rounded-xl text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-secondary block mb-1">Improvement Suggestion (optional)</label>
              <input
                type="text"
                placeholder="How can you do better next time?"
                value={improvementSuggestion}
                onChange={e => setImprovementSuggestion(e.target.value)}
                className="w-full bg-background border border-secondary/20 p-3 rounded-xl text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <button
              onClick={handleEnd}
              disabled={didAchieveGoal === null}
              className="w-full bg-accent text-background font-bold py-4 mt-2 rounded-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-shadow disabled:opacity-30"
            >
              Complete Session
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const isCountdown = (activeSession?.workTime ?? 0) > 0;
  const displaySeconds = isCountdown 
    ? Math.max(0, (activeSession?.workTime ?? 0) * 60 - elapsed)
    : elapsed;

  // Active Session View
  return (
    <div className={`flex flex-col items-center justify-center w-full h-full min-h-[70vh] p-4 font-sans text-slate-100 transition-all duration-1000 ${alarmTriggered && displaySeconds === 0 ? 'bg-rose-900/20' : ''}`}>
      <div className={`transition-all duration-500 flex flex-col items-center ${isFocusMode ? 'scale-110 mb-20' : 'mb-10'}`}>
        <TimerDisplay seconds={displaySeconds} isCountdown={isCountdown} />

        {goal && !isFocusMode && (
          <motion.p 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent"
          >
            {goal.title || 'Unknown'}
          </motion.p>
        )}
      </div>

      {/* Focus Mode Toggle */}
      <button 
        onClick={() => setIsFocusMode(!isFocusMode)}
        className="fixed bottom-32 md:bottom-10 left-10 md:left-80 text-[10px] font-black text-secondary hover:text-accent transition-all duration-300 uppercase tracking-[0.2em] z-50 flex items-center justify-center gap-2"
      >
        <div className={`w-8 h-4 rounded-full border border-white/20 relative transition-all duration-300 ${isFocusMode ? 'bg-accent/20' : 'bg-transparent'}`}>
          <div className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full transition-all ${isFocusMode ? 'right-0.5 bg-accent shadow-[0_0_8px_cyan]' : 'left-0.5 bg-secondary'}`} />
        </div>
        Focus Mode
      </button>

      {/* Framework Data Display (Only if not in focus mode) */}
      {!isFocusMode && activeSession?.frameworkData && (
        <div className="mb-10 w-full max-w-md flex flex-col items-center overflow-hidden">
          <div className="w-full grid grid-cols-2 gap-3">
            {Object.entries(
              (() => {
                try {
                  return JSON.parse(activeSession.frameworkData as string) as Record<string, string>;
                } catch (err) {
                  logClientError('Session.frameworkData', err);
                  return {} as Record<string, string>;
                }
              })()
            ).map(([k, v]) => (
              <div key={k} className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{k}</p>
                <p className="text-xs font-bold text-slate-200">{v as string}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {alarmTriggered && displaySeconds === 0 ? (
        <button
          onClick={stopAlarm}
          className="mb-8 bg-rose-500 text-white px-12 py-6 rounded-3xl font-black text-2xl hover:bg-rose-600 shadow-[0_0_40px_rgba(244,63,94,0.6)] hover:shadow-[0_0_60px_rgba(244,63,94,0.8)] transition-all uppercase tracking-widest animate-pulse"
        >
          Turn Off Alarm
        </button>
      ) : null}

      <div className="flex gap-4">
        <button
          onClick={() => {
            stopAlarm();
            setShowEndForm(true);
          }}
          className="bg-accent text-background px-10 py-4 rounded-2xl font-black text-base hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all uppercase tracking-widest"
        >
          End Session
        </button>
        {!isFocusMode && (
          <button
            onClick={() => {
              stopAlarm();
              handleSkip();
            }}
            className="bg-white/5 border border-white/10 text-slate-400 px-8 py-4 rounded-2xl font-black text-base hover:bg-white/10 transition-all uppercase tracking-widest"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
};
