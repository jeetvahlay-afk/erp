import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Award,
  Flame,
  Glasses,
  Music,
  PartyPopper,
  RotateCw,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';

// Cheerful "Happy Birthday" melody frequencies and timings via native Web Audio API
const BIRTHDAY_NOTES = [
  { note: 261.63, dur: 0.35, pause: 0.08 }, // C4
  { note: 261.63, dur: 0.25, pause: 0.06 }, // C4
  { note: 293.66, dur: 0.5, pause: 0.08 },  // D4
  { note: 261.63, dur: 0.5, pause: 0.08 },  // C4
  { note: 349.23, dur: 0.5, pause: 0.08 },  // F4
  { note: 329.63, dur: 0.8, pause: 0.2 },   // E4

  { note: 261.63, dur: 0.35, pause: 0.08 }, // C4
  { note: 261.63, dur: 0.25, pause: 0.06 }, // C4
  { note: 293.66, dur: 0.5, pause: 0.08 },  // D4
  { note: 261.63, dur: 0.5, pause: 0.08 },  // C4
  { note: 392.00, dur: 0.5, pause: 0.08 },  // G4
  { note: 349.23, dur: 0.8, pause: 0.2 },   // F4

  { note: 261.63, dur: 0.35, pause: 0.08 }, // C4
  { note: 261.63, dur: 0.25, pause: 0.06 }, // C4
  { note: 523.25, dur: 0.5, pause: 0.08 },  // C5
  { note: 440.00, dur: 0.5, pause: 0.08 },  // A4
  { note: 349.23, dur: 0.5, pause: 0.08 },  // F4
  { note: 329.63, dur: 0.5, pause: 0.08 },  // E4
  { note: 293.66, dur: 0.8, pause: 0.2 },   // D4

  { note: 466.16, dur: 0.35, pause: 0.08 }, // Bb4
  { note: 466.16, dur: 0.25, pause: 0.06 }, // Bb4
  { note: 440.00, dur: 0.5, pause: 0.08 },  // A4
  { note: 349.23, dur: 0.5, pause: 0.08 },  // F4
  { note: 392.00, dur: 0.5, pause: 0.08 },  // G4
  { note: 349.23, dur: 0.9, pause: 0.35 },  // F4
];

const BALLOON_COLORS = [
  { bg: 'radial-gradient(circle at 35% 35%, #ff8da1, #ef4444 65%, #991b1b)', border: '#f87171' },
  { bg: 'radial-gradient(circle at 35% 35%, #fde68a, #f59e0b 65%, #b45309)', border: '#fbbf24' },
  { bg: 'radial-gradient(circle at 35% 35%, #93c5fd, #3b82f6 65%, #1d4ed8)', border: '#60a5fa' },
  { bg: 'radial-gradient(circle at 35% 35%, #86efac, #10b981 65%, #047857)', border: '#34d399' },
  { bg: 'radial-gradient(circle at 35% 35%, #d8b4fe, #a855f7 65%, #6b21a8)', border: '#c084fc' },
  { bg: 'radial-gradient(circle at 35% 35%, #fbcfe8, #ec4899 65%, #9d174d)', border: '#f472b6' },
  { bg: 'radial-gradient(circle at 35% 35%, #fed7aa, #f97316 65%, #c2410c)', border: '#fb923c' },
  { bg: 'radial-gradient(circle at 35% 35%, #a5f3fc, #06b6d4 65%, #0e7490)', border: '#22d3ee' },
];

const DANCE_ROUTINES = [
  { id: 'floss', label: '🤪 The Floss', icon: Zap, desc: 'Ultra-fast cartoon hip whipping & arm swings' },
  { id: 'disco', label: '🕺 Disco Fever', icon: Sparkles, desc: 'Travolta finger point & groovy pelvic thrust' },
  { id: 'jelly', label: '🍮 Jelly Noodle', icon: RotateCw, desc: 'Rubber-hose noodle arms & wobbly bouncy knees' },
  { id: 'rockout', label: '🎸 Air Guitar', icon: Flame, desc: 'Electric shredding, headbanging & high jumps' },
  { id: 'moonwalk', label: '👟 Moonwalk Glide', icon: Award, desc: 'Smooth slider glide & breakdance freeze pops' },
];

const COMIC_PHRASES = [
  '🎉 WOOHOO! 🎉',
  '🔥 PARTY LEGEND! 🔥',
  '🕺 DANCE LEVEL 9000! 🕺',
  '🎂 CAKE TIME! 🎂',
  '⚡ UNSTOPPABLE! ⚡',
  '✨ BIRTHDAY HERO! ✨',
];

export const BirthdayCelebrationOverlay = ({ celebrant, user, onClose, isOpen = true }) => {
  const targetUser = celebrant || user;
  const [danceMove, setDanceMove] = useState('floss');
  const [autoFreestyle, setAutoFreestyle] = useState(true);
  const [showShades, setShowShades] = useState(true);
  const [showHorn, setShowHorn] = useState(true);
  const [timelineStep, setTimelineStep] = useState(0); // 0: enter, 1: title, 2: full dance
  const [isMuted, setIsMuted] = useState(false);
  const [confettiBurstCount, setConfettiBurstCount] = useState(0);
  const [activePhrase, setActivePhrase] = useState(COMIC_PHRASES[0]);
  const audioCtxRef = useRef(null);
  const isPlayingRef = useRef(false);

  // Compute profile photo URL from the birthday celebrant
  const profilePhoto = useMemo(() => {
    if (!targetUser) return null;
    if (targetUser.profileImage) {
      return /^(https?:|data:|blob:|\/)/.test(targetUser.profileImage)
        ? targetUser.profileImage
        : `/uploads/avatars/${targetUser.profileImage}`;
    }
    return targetUser.avatar || null;
  }, [targetUser]);

  const userName = targetUser?.name || 'Birthday Star';
  const firstName = targetUser?.name ? targetUser.name.split(' ')[0] : 'Hero';
  const userInitials = useMemo(() => {
    if (!targetUser?.name) return 'HB';
    const parts = targetUser.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }, [targetUser?.name]);

  // Handle ESC key to exit
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Orchestrate entrance sequence
  useEffect(() => {
    if (!isOpen) return;
    setTimelineStep(1);
    const timer1 = setTimeout(() => setTimelineStep(2), 500);
    return () => clearTimeout(timer1);
  }, [isOpen]);

  // Auto-Freestyle Mode: Automatically changes dance moves every 5 seconds for a non-stop funny cartoon show
  useEffect(() => {
    if (!isOpen || !autoFreestyle) return;
    const interval = setInterval(() => {
      setDanceMove((prev) => {
        const moves = DANCE_ROUTINES.map((r) => r.id);
        const idx = moves.indexOf(prev);
        const next = moves[(idx + 1) % moves.length];
        return next;
      });
      // Also pop a new random comic phrase
      setActivePhrase(COMIC_PHRASES[Math.floor(Math.random() * COMIC_PHRASES.length)]);
    }, 4500);
    return () => clearInterval(interval);
  }, [isOpen, autoFreestyle]);

  // Continuous celebratory birthday tune & party beats via Web Audio synthesis
  useEffect(() => {
    if (!isOpen || isMuted) {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      isPlayingRef.current = false;
      return;
    }

    let isCancelled = false;

    const playCelebrationChime = async () => {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;
        isPlayingRef.current = true;

        let currentTime = ctx.currentTime + 0.1;
        BIRTHDAY_NOTES.forEach((step) => {
          if (isCancelled) return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle'; // Warm chime tone
          osc.frequency.setValueAtTime(step.note, currentTime);

          gain.gain.setValueAtTime(0.001, currentTime);
          gain.gain.exponentialRampToValueAtTime(0.22, currentTime + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, currentTime + step.dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(currentTime);
          osc.stop(currentTime + step.dur);

          // Cheerful percussion click on beat
          const clickOsc = ctx.createOscillator();
          const clickGain = ctx.createGain();
          clickOsc.type = 'sine';
          clickOsc.frequency.setValueAtTime(140, currentTime);
          clickGain.gain.setValueAtTime(0.04, currentTime);
          clickGain.gain.exponentialRampToValueAtTime(0.0001, currentTime + 0.08);
          clickOsc.connect(clickGain);
          clickGain.connect(ctx.destination);
          clickOsc.start(currentTime);
          clickOsc.stop(currentTime + 0.08);

          currentTime += step.dur + step.pause;
        });
      } catch {
        // Audio policy fallback
      }
    };

    playCelebrationChime();

    return () => {
      isCancelled = true;
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      isPlayingRef.current = false;
    };
  }, [isOpen, isMuted, confettiBurstCount]);

  // Pre-generate 20 floating balloons with randomized sway & speed
  const balloons = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => {
      const leftPercent = 2 + (i * 4.9) + ((i % 3) * 1.5);
      const color = BALLOON_COLORS[i % BALLOON_COLORS.length];
      const duration = 7.5 + (i % 5) * 1.4;
      const delay = (i * 0.4) % 5.5;
      const size = 52 + (i % 4) * 11;
      const swayType = i % 2 === 0 ? 'balloon-sway-left' : 'balloon-sway-right';
      const swayDuration = 2.2 + (i % 3) * 0.5;
      return {
        id: i,
        left: `${Math.min(95, Math.max(2, leftPercent))}%`,
        color,
        duration: `${duration}s`,
        delay: `${delay}s`,
        size,
        swayType,
        swayDuration: `${swayDuration}s`,
      };
    });
  }, []);

  // Pre-generate 54 confetti particles
  const confettiParticles = useMemo(() => {
    const confettiColors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#fbbf24', '#ffffff'];
    return Array.from({ length: 54 }).map((_, i) => ({
      id: i,
      left: `${(i * 1.85) + ((i % 5) * 0.4)}%`,
      delay: `${(i * 0.12) % 3.8}s`,
      duration: `${3.2 + ((i % 6) * 0.7)}s`,
      bg: confettiColors[i % confettiColors.length],
      width: (i % 3 === 0) ? '13px' : '8px',
      height: (i % 2 === 0) ? '15px' : '9px',
      rounded: i % 4 === 0 ? 'rounded-full' : 'rounded-sm',
    }));
  }, []);

  // Pre-generate floating musical notes
  const musicNotes = useMemo(() => {
    const symbols = ['♪', '♫', '♬', '♩', '✨'];
    return Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      symbol: symbols[i % symbols.length],
      xOffset: (i % 2 === 0 ? 1 : -1) * (20 + (i * 12)),
      rotOffset: (i % 2 === 0 ? 1 : -1) * (15 + (i * 8)),
      delay: `${i * 0.6}s`,
      duration: '3.2s',
      color: ['#facc15', '#38bdf8', '#f472b6', '#4ade80'][i % 4],
    }));
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] overflow-hidden select-none flex flex-col items-center justify-between transition-opacity duration-500 ease-out"
      style={{
        background: 'radial-gradient(ellipse at 50% 25%, #dc2626 0%, #b91c1c 28%, #881337 62%, #450a0a 100%)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Birthday Celebration"
    >
      {/* 1. Dual Sweeping Disco Stage Spotlights */}
      <div
        className="pointer-events-none absolute -top-24 left-10 w-96 h-[120vh] origin-top blur-xl opacity-40 mix-blend-screen"
        style={{
          background: 'linear-gradient(180deg, rgba(254, 240, 138, 0.7) 0%, rgba(239, 68, 68, 0.35) 45%, transparent 85%)',
          animation: 'stage-spotlight-left 5s ease-in-out infinite alternate',
        }}
      />
      <div
        className="pointer-events-none absolute -top-24 right-10 w-96 h-[120vh] origin-top blur-xl opacity-40 mix-blend-screen"
        style={{
          background: 'linear-gradient(180deg, rgba(147, 197, 253, 0.7) 0%, rgba(168, 85, 247, 0.35) 45%, transparent 85%)',
          animation: 'stage-spotlight-right 5.5s ease-in-out infinite alternate',
        }}
      />

      {/* 2. Floating Balloons Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        {balloons.map((b) => (
          <div
            key={b.id}
            className="absolute bottom-0"
            style={{
              left: b.left,
              animation: `balloon-float ${b.duration} linear ${b.delay} infinite`,
              willChange: 'transform',
            }}
          >
            <div
              style={{
                animation: `${b.swayType} ${b.swayDuration} ease-in-out infinite`,
                willChange: 'transform',
              }}
              className="flex flex-col items-center"
            >
              <div
                className="relative rounded-[50%_50%_50%_50%/40%_40%_60%_60%] shadow-2xl"
                style={{
                  width: `${b.size}px`,
                  height: `${b.size * 1.25}px`,
                  background: b.color.bg,
                  boxShadow: `0 8px 24px rgba(0,0,0,0.35), inset 2px 2px 8px rgba(255,255,255,0.45)`,
                }}
              >
                <div className="absolute top-2 left-2.5 w-3.5 h-6 rounded-full bg-white/40 blur-[1px] rotate-[-25deg]" />
              </div>
              <div
                className="w-2.5 h-2 -mt-0.5 rounded-b-sm"
                style={{ background: b.color.border }}
              />
              <svg width="24" height="65" viewBox="0 0 24 65" fill="none" className="opacity-60">
                <path d="M12 0 C18 15, 6 30, 14 45 C18 53, 10 60, 12 65" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Falling Confetti Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        {confettiParticles.map((c) => (
          <div
            key={c.id}
            className={`absolute top-0 ${c.rounded}`}
            style={{
              left: c.left,
              width: c.width,
              height: c.height,
              backgroundColor: c.bg,
              animation: `confetti-fall ${c.duration} linear ${c.delay} infinite`,
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              willChange: 'transform',
            }}
          />
        ))}
      </div>

      {/* 4. Top Navigation & Action Bar */}
      <header className="relative z-30 w-full max-w-7xl mx-auto px-5 pt-4 pb-2 flex items-center justify-between text-white">
        <div className="flex items-center gap-2 bg-black/35 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-xs font-semibold shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-amber-300 font-extrabold">LIVE PARTY:</span>
          <span className="truncate max-w-[140px] sm:max-w-none text-white">{userName}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Confetti Cannon Burst Trigger */}
          <button
            type="button"
            onClick={() => setConfettiBurstCount((c) => c + 1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg transition-transform active:scale-90 cursor-pointer"
            title="Pop Confetti Cannon!"
          >
            <PartyPopper size={14} className="animate-bounce" />
            <span className="hidden sm:inline">Confetti Blast!</span>
          </button>

          {/* Audio Mute/Unmute Toggle */}
          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            className="p-2 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md border border-white/15 text-white/90 hover:text-white transition cursor-pointer"
            title={isMuted ? 'Unmute Birthday Melody' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} className="text-amber-300 animate-pulse" />}
          </button>

          {/* Close / Return to ERP Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-black/40 hover:bg-rose-600 backdrop-blur-md border border-white/20 text-white transition-colors cursor-pointer group"
            title="Back to ERP (Esc)"
          >
            <X size={18} className="group-hover:rotate-90 transition-transform" />
          </button>
        </div>
      </header>

      {/* 5. Center Stage: Celebratory Typography & Dancing Cartoon Stickman */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 w-full max-w-4xl mx-auto my-auto text-center">
        {/* Animated Celebration Title */}
        <div className="mb-2 sm:mb-3">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-400/20 backdrop-blur-md border border-amber-300/40 text-amber-200 text-xs sm:text-sm font-extrabold uppercase tracking-widest mb-1 animate-pulse">
            <Sparkles size={14} className="text-yellow-300" />
            <span>IT'S CELEBRATION TIME!</span>
            <Sparkles size={14} className="text-yellow-300" />
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)] animate-birthday-title">
            <span
              className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-100 inline-block animate-birthday-bounce"
              style={{
                textShadow: '0 4px 30px rgba(251, 191, 36, 0.45)',
                WebkitTextStroke: '1px rgba(255,255,255,0.3)',
              }}
            >
              HAPPY BIRTHDAY!
            </span>
          </h1>

          <p className="text-lg sm:text-2xl font-black text-rose-100 mt-0.5 drop-shadow-md">
            Wishing <strong className="text-amber-300 underline decoration-wavy decoration-amber-400">{userName}</strong> an extraordinary day! 🎂🎈
          </p>
        </div>

        {/* Comic Floating Exclamation Bubble */}
        <div
          key={activePhrase + confettiBurstCount}
          style={{ animation: 'comic-bubble-pop 3.8s ease-out forwards' }}
          className="pointer-events-none mb-1 inline-block px-4 py-1.5 rounded-2xl bg-gradient-to-r from-yellow-300 via-amber-400 to-rose-400 text-slate-950 font-black text-xs sm:text-sm shadow-2xl border-2 border-white ring-4 ring-yellow-400/40 select-none"
        >
          {activePhrase}
        </div>

        {/* The Funny Dancing Stickman Character Stage */}
        <div className="relative mt-2 flex flex-col items-center">
          {/* Floating Musical Notes popping out */}
          <div className="absolute inset-0 pointer-events-none z-20">
            {musicNotes.map((note) => (
              <span
                key={note.id}
                className="absolute top-1/2 left-1/2 font-black text-xl select-none"
                style={{
                  color: note.color,
                  '--note-x': `${note.xOffset}px`,
                  '--note-rot': `${note.rotOffset}deg`,
                  animation: `music-note-rise ${note.duration} ease-out ${note.delay} infinite`,
                  textShadow: '0 0 8px rgba(0,0,0,0.4)',
                }}
              >
                {note.symbol}
              </span>
            ))}
          </div>

          {/* The Articulated Cartoon Dancing Stickman */}
          <ArticulatedStickmanCharacter
            danceMove={danceMove}
            profilePhoto={profilePhoto}
            userInitials={userInitials}
            userName={userName}
            showShades={showShades}
            showHorn={showHorn}
          />

          {/* Pulsating Disco Ring Dance Floor directly under the stickman's feet */}
          <div
            className="w-56 sm:w-72 h-10 rounded-full mt-[-10px] pointer-events-none opacity-85"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.9) 0%, rgba(244,63,94,0.6) 45%, rgba(59,130,246,0.2) 70%, transparent 100%)',
              animation: 'disco-floor-glow 1.2s ease-in-out infinite',
            }}
          />
        </div>
      </main>

      {/* 6. Bottom Interactive Dance & Prop Controls */}
      <footer className="relative z-30 w-full max-w-4xl mx-auto px-4 pb-5 pt-2">
        <div className="bg-black/45 backdrop-blur-xl border border-white/20 rounded-3xl p-3 sm:p-4 shadow-2xl flex flex-col gap-3">
          {/* Row 1: Dance Routine Selectors */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-white/90">
              <Sparkles size={16} className="text-amber-400 shrink-0" />
              <div className="text-left">
                <p className="text-xs font-black text-amber-200 uppercase tracking-wider">Funny Cartoon Choreography</p>
                <p className="text-[11px] text-white/70">Wacky rubber-hose animations that dance on their own!</p>
              </div>
            </div>

            {/* Dance Move Chips */}
            <div className="grid grid-cols-2 sm:flex items-center gap-1.5 w-full sm:w-auto">
              {DANCE_ROUTINES.map((routine) => {
                const active = danceMove === routine.id;
                const Icon = routine.icon;
                return (
                  <button
                    key={routine.id}
                    type="button"
                    onClick={() => {
                      setAutoFreestyle(false); // User manually took over
                      setDanceMove(routine.id);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-md active:scale-95 flex items-center justify-center gap-1.5 ${
                      active
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 ring-2 ring-yellow-200 font-extrabold shadow-amber-500/30'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                    }`}
                    title={routine.desc}
                  >
                    <Icon size={13} className={active ? 'text-slate-950' : 'text-amber-300'} />
                    <span>{routine.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2: Comedy Props & Automated Freestyle Toggle */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              {/* Auto-Freestyle DJ Mode Toggle */}
              <button
                type="button"
                onClick={() => setAutoFreestyle((v) => !v)}
                className={`px-3 py-1 rounded-full font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  autoFreestyle
                    ? 'bg-emerald-500/80 text-white border border-emerald-300/60 ring-2 ring-emerald-400/40 shadow-xs'
                    : 'bg-white/10 text-white/70 border border-white/15 hover:bg-white/20'
                }`}
                title="Automatically cycles hilarious dance moves continuously!"
              >
                <RotateCw size={12} className={autoFreestyle ? 'animate-spin' : ''} />
                <span>Auto-DJ Freestyle: {autoFreestyle ? 'ON' : 'OFF'}</span>
              </button>

              {/* Sunglasses Prop Toggle */}
              <button
                type="button"
                onClick={() => setShowShades((v) => !v)}
                className={`px-2.5 py-1 rounded-full font-bold flex items-center gap-1 transition cursor-pointer ${
                  showShades
                    ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-200 shadow-xs'
                    : 'bg-white/10 text-white/70 border border-white/15'
                }`}
                title="Toggle cool party shades"
              >
                <Glasses size={13} />
                <span>Party Shades</span>
              </button>

              {/* Party Horn Prop Toggle */}
              <button
                type="button"
                onClick={() => setShowHorn((v) => !v)}
                className={`px-2.5 py-1 rounded-full font-bold flex items-center gap-1 transition cursor-pointer ${
                  showHorn
                    ? 'bg-rose-500 text-white ring-2 ring-rose-300 shadow-xs'
                    : 'bg-white/10 text-white/70 border border-white/15'
                }`}
                title="Toggle funny party noisemaker blower"
              >
                <span>🎉 Blower</span>
              </button>
            </div>

            <span className="text-[11px] text-white/60 italic hidden md:inline">
              Press <strong>Esc</strong> to return to ERP
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

/**
 * Articulated Cartoon Stickman Character
 *
 * Designed with rubber-hose physics & funny cartoon mechanics:
 * 1. Head: Dynamically displays the celebrant's profile picture, fitted with an elastic
 *    bouncy cone hat, optional party shades, and a rhythmic unfurling party noisemaker.
 * 2. Limbs: True articulated joints (shoulders, elbows, hips, knees, shoes) that pump,
 *    swivel, step, kick, and wave according to the chosen cartoon choreography.
 * 3. Dynamic Props: Includes an electric air guitar with lightning strings in 'rockout' mode
 *    and a classic cartoon microphone in 'disco' mode!
 */
const ArticulatedStickmanCharacter = ({
  danceMove,
  profilePhoto,
  userInitials,
  userName,
  showShades = true,
  showHorn = true,
}) => {
  // Global container groove animation (squash & stretch bounce)
  const grooveAnimationClass =
    danceMove === 'floss'
      ? 'animate-[stickman-floss-groove_0.75s_ease-in-out_infinite]'
      : danceMove === 'jelly'
      ? 'animate-[stickman-jelly-groove_0.85s_ease-in-out_infinite]'
      : danceMove === 'rockout'
      ? 'animate-[stickman-rockout-groove_0.8s_cubic-bezier(0.4,0,0.6,1)_infinite]'
      : danceMove === 'moonwalk'
      ? 'animate-[stickman-moonwalk-groove_2.2s_linear_infinite]'
      : 'animate-[stickman-bounce-groove_1s_cubic-bezier(0.45,0.05,0.55,0.95)_infinite]';

  return (
    <div className={`relative flex flex-col items-center select-none ${grooveAnimationClass}`}>
      {/* ========================================================================= */}
      {/* 1. CARTOON PARTY HAT (Bouncing Elastic Pom-Pom)                            */}
      {/* ========================================================================= */}
      <div className="absolute -top-12 z-30 flex flex-col items-center pointer-events-none transform -rotate-12 animate-[stickman-head-bob_1s_ease-in-out_infinite]">
        {/* Fluffy Bouncing Pom-Pom */}
        <div className="w-5 h-5 rounded-full bg-yellow-300 shadow-[0_0_12px_rgba(253,224,71,0.95)] border-2 border-yellow-100 animate-bounce" />
        {/* Striped Party Cone */}
        <div
          className="w-10 h-10 -mt-1 shadow-lg"
          style={{
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            background: 'repeating-linear-gradient(45deg, #ef4444, #ef4444 6px, #facc15 6px, #facc15 12px, #3b82f6 12px, #3b82f6 18px)',
          }}
        />
      </div>

      {/* ========================================================================= */}
      {/* 2. DYNAMIC CELEBRANT HEAD WITH COMIC PROPS                                 */}
      {/* ========================================================================= */}
      <div
        className="relative z-20 w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-yellow-200 to-rose-400 shadow-[0_0_28px_rgba(251,191,36,0.9)] border-2 border-white animate-[stickman-head-bob_0.9s_ease-in-out_infinite]"
        title={`${userName}'s Dancing Cartoon Face`}
      >
        <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center ring-2 ring-amber-300 relative">
          {profilePhoto ? (
            <img
              src={profilePhoto}
              alt={userName}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextElementSibling) {
                  e.currentTarget.nextElementSibling.style.display = 'flex';
                }
              }}
            />
          ) : null}
          <div
            className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white font-black text-2xl sm:text-3xl select-none ${profilePhoto ? 'hidden' : 'flex'}`}
          >
            <span>{userInitials}</span>
          </div>

          {/* Cool Party Sunglasses Prop */}
          {showShades && (
            <div className="absolute top-7 sm:top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none drop-shadow-md">
              <div className="flex items-center gap-1">
                {/* Left Lens */}
                <div className="w-7 sm:w-8 h-4 rounded-b-xl bg-black border-2 border-amber-300 relative overflow-hidden">
                  <div className="absolute top-0.5 left-1 w-3 h-1 bg-white/70 rotate-[-20deg] rounded-full" />
                </div>
                {/* Bridge */}
                <div className="w-2 h-1 bg-amber-400 -mt-1" />
                {/* Right Lens */}
                <div className="w-7 sm:w-8 h-4 rounded-b-xl bg-black border-2 border-amber-300 relative overflow-hidden">
                  <div className="absolute top-0.5 left-1 w-3 h-1 bg-white/70 rotate-[-20deg] rounded-full" />
                </div>
              </div>
            </div>
          )}

          {/* Unfurling Party Blower / Noisemaker Prop */}
          {showHorn && (
            <div
              className="absolute bottom-3 right-1 origin-left z-20 pointer-events-none"
              style={{
                animation: 'party-blower-extend 1.4s ease-in-out infinite',
              }}
            >
              <div className="flex items-center">
                {/* Red Mouthpiece */}
                <div className="w-2.5 h-3 bg-red-600 rounded-l-sm border border-yellow-200" />
                {/* Colorful Blower Tube */}
                <div className="w-8 sm:w-11 h-2.5 bg-gradient-to-r from-yellow-300 via-pink-500 to-cyan-400 rounded-r-full shadow-sm" />
                {/* Curly Tip */}
                <div className="w-3 h-3 rounded-full bg-cyan-400 border border-white -ml-1 animate-pulse" />
              </div>
            </div>
          )}
        </div>

        {/* Rosy Cheeks */}
        <div className="absolute bottom-4 left-2.5 w-4 h-2.5 bg-rose-500/70 rounded-full blur-[2px] pointer-events-none" />
        <div className="absolute bottom-4 right-2.5 w-4 h-2.5 bg-rose-500/70 rounded-full blur-[2px] pointer-events-none" />
      </div>

      {/* ========================================================================= */}
      {/* 3. ARTICULATED CARTOON STICKMAN SVG BODY & LIMBS                           */}
      {/* ========================================================================= */}
      <div className="-mt-2 w-64 h-72 sm:w-72 sm:h-80 pointer-events-none relative">
        <svg
          viewBox="0 0 240 260"
          className="w-full h-full filter drop-shadow-[0_8px_18px_rgba(0,0,0,0.55)]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="stickmanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#facc15" />
            </linearGradient>
            <filter id="neonGlow" x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#facc15" floodOpacity="0.65" />
            </filter>
          </defs>

          {/* Neck */}
          <line
            x1="120"
            y1="8"
            x2="120"
            y2="30"
            stroke="url(#stickmanGradient)"
            strokeWidth="9"
            strokeLinecap="round"
          />

          {/* Festive Party Bowtie at Neck */}
          <polygon points="108,24 132,24 120,32" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
          <polygon points="108,40 132,40 120,32" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="120" cy="32" r="3.5" fill="#facc15" />

          {/* Elastic Torso / Spine */}
          <path
            d={
              danceMove === 'jelly'
                ? 'M120,30 Q145,75 120,120'
                : danceMove === 'floss'
                ? 'M120,30 Q105,75 120,120'
                : danceMove === 'rockout'
                ? 'M120,30 Q138,70 120,120'
                : 'M120,30 Q126,75 120,120'
            }
            stroke="url(#stickmanGradient)"
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
          />

          {/* ===================================================================== */}
          {/* ARMS: Fully Articulated according to dance move                       */}
          {/* ===================================================================== */}

          {/* 1. THE FLOSS ARMS (Rapid cartoon whipping sweeps across body) */}
          {danceMove === 'floss' && (
            <g>
              {/* Left Arm: Swings across */}
              <g
                style={{
                  transformOrigin: '105px 45px',
                  animation: 'stickman-arm-floss-left 0.75s ease-in-out infinite',
                }}
              >
                <polyline
                  points="120,45 80,65 40,95"
                  stroke="url(#stickmanGradient)"
                  strokeWidth="8.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <circle cx="40" cy="95" r="7" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
              </g>

              {/* Right Arm: Swings opposite */}
              <g
                style={{
                  transformOrigin: '135px 45px',
                  animation: 'stickman-arm-floss-right 0.75s ease-in-out infinite',
                }}
              >
                <polyline
                  points="120,45 160,65 200,95"
                  stroke="url(#stickmanGradient)"
                  strokeWidth="8.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <circle cx="200" cy="95" r="7" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
              </g>
            </g>
          )}

          {/* 2. DISCO FEVER ARMS (Travolta high finger point & low hip pump) */}
          {danceMove === 'disco' && (
            <g>
              {/* Left Arm: High Sky Point */}
              <g
                style={{
                  transformOrigin: '110px 45px',
                  animation: 'stickman-arm-disco-left 1s ease-in-out infinite',
                }}
              >
                <polyline
                  points="120,45 75,25 45,-15"
                  stroke="url(#stickmanGradient)"
                  strokeWidth="8.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <circle cx="45" cy="-15" r="7" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
                {/* Finger sparkle burst */}
                <circle cx="40" cy="-22" r="3.5" fill="#ffffff" className="animate-ping" />
              </g>

              {/* Right Arm: Holding Cartoon Microphone */}
              <g
                style={{
                  transformOrigin: '130px 45px',
                  animation: 'stickman-arm-disco-right 1s ease-in-out infinite',
                }}
              >
                <polyline
                  points="120,45 160,65 185,100"
                  stroke="url(#stickmanGradient)"
                  strokeWidth="8.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <circle cx="185" cy="100" r="7" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
                {/* Cartoon Mic */}
                <line x1="185" y1="100" x2="195" y2="120" stroke="#94a3b8" strokeWidth="4.5" strokeLinecap="round" />
                <circle cx="183" cy="95" r="6" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
              </g>
            </g>
          )}

          {/* 3. JELLY NOODLE ARMS (Rubber-hose wavy cartoon noodle arms) */}
          {danceMove === 'jelly' && (
            <g>
              <g
                style={{
                  transformOrigin: '110px 45px',
                  animation: 'stickman-arm-wave-left 0.85s ease-in-out infinite',
                }}
              >
                <path
                  d="M120,45 Q70,25 50,75 T35,115"
                  stroke="url(#stickmanGradient)"
                  strokeWidth="8.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="35" cy="115" r="7" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
              </g>

              <g
                style={{
                  transformOrigin: '130px 45px',
                  animation: 'stickman-arm-wave-right 0.85s ease-in-out infinite',
                }}
              >
                <path
                  d="M120,45 Q170,25 190,75 T205,115"
                  stroke="url(#stickmanGradient)"
                  strokeWidth="8.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="205" cy="115" r="7" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
              </g>
            </g>
          )}

          {/* 4. AIR GUITAR ROCKOUT ARMS & ELECTRIC GUITAR PROP */}
          {danceMove === 'rockout' && (
            <g>
              {/* Electric Guitar Vector Body */}
              <g transform="translate(75, 45) rotate(-35)">
                {/* Guitar Neck & Headstock */}
                <line x1="10" y1="20" x2="85" y2="20" stroke="#f59e0b" strokeWidth="4.5" strokeLinecap="round" />
                {/* Tuning Pegs */}
                <circle cx="85" cy="17" r="2.5" fill="#ffffff" />
                <circle cx="85" cy="23" r="2.5" fill="#ffffff" />
                {/* Flying V Guitar Body */}
                <polygon points="0,0 25,20 0,40 18,20" fill="#ec4899" stroke="#ffffff" strokeWidth="2" />
                <polygon points="3,5 20,20 3,35 15,20" fill="#a855f7" />
                {/* Sound Pickup */}
                <rect x="18" y="15" width="8" height="10" rx="1.5" fill="#ffffff" />
              </g>

              {/* Left Arm: Fretting up high */}
              <g
                style={{
                  transformOrigin: '110px 45px',
                  animation: 'stickman-arm-guitar-fret 0.8s ease-in-out infinite',
                }}
              >
                <polyline
                  points="120,45 80,45 55,25"
                  stroke="url(#stickmanGradient)"
                  strokeWidth="8.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <circle cx="55" cy="25" r="7" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
              </g>

              {/* Right Arm: Furiously Strumming */}
              <g
                style={{
                  transformOrigin: '135px 45px',
                  animation: 'stickman-arm-guitar-strum 0.8s ease-in-out infinite',
                }}
              >
                <polyline
                  points="120,45 145,65 125,75"
                  stroke="url(#stickmanGradient)"
                  strokeWidth="8.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <circle cx="125" cy="75" r="7" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
              </g>
            </g>
          )}

          {/* 5. MOONWALK GLIDE ARMS (Breakdance freeze pop) */}
          {danceMove === 'moonwalk' && (
            <g>
              <g
                style={{
                  transformOrigin: '110px 45px',
                  animation: 'stickman-arm-disco-left 1.1s ease-in-out infinite alternate',
                }}
              >
                <polyline
                  points="120,45 70,55 35,45"
                  stroke="url(#stickmanGradient)"
                  strokeWidth="8.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="35" cy="45" r="7" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
              </g>

              <g
                style={{
                  transformOrigin: '130px 45px',
                  animation: 'stickman-arm-disco-right 1.1s ease-in-out infinite alternate',
                }}
              >
                <polyline
                  points="120,45 170,55 205,45"
                  stroke="url(#stickmanGradient)"
                  strokeWidth="8.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="205" cy="45" r="7" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
              </g>
            </g>
          )}

          {/* ===================================================================== */}
          {/* LEGS: Articulated stepping, kicking, and bouncing knees & shoes       */}
          {/* ===================================================================== */}

          {/* 1. FLOSS LEGS (Hip-swivel alternating side-kicks) */}
          {danceMove === 'floss' && (
            <g>
              <g
                style={{
                  transformOrigin: '115px 120px',
                  animation: 'stickman-leg-floss-left 0.75s ease-in-out infinite',
                }}
              >
                <polyline
                  points="120,120 90,165 65,225"
                  stroke="url(#stickmanGradient)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <ellipse cx="58" cy="227" rx="13" ry="6" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
              </g>

              <g
                style={{
                  transformOrigin: '125px 120px',
                  animation: 'stickman-leg-floss-right 0.75s ease-in-out infinite',
                }}
              >
                <polyline
                  points="120,120 150,165 175,225"
                  stroke="url(#stickmanGradient)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <ellipse cx="183" cy="227" rx="13" ry="6" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
              </g>
            </g>
          )}

          {/* 2. DISCO LEGS (Alternating heel tap & knee pump) */}
          {danceMove === 'disco' && (
            <g>
              <g
                style={{
                  transformOrigin: '110px 120px',
                  animation: 'stickman-leg-step-left 1s ease-in-out infinite',
                }}
              >
                <polyline
                  points="120,120 85,165 65,225"
                  stroke="url(#stickmanGradient)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <ellipse cx="57" cy="227" rx="13" ry="6" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
              </g>

              <g
                style={{
                  transformOrigin: '130px 120px',
                  animation: 'stickman-leg-step-right 1s ease-in-out infinite',
                }}
              >
                <polyline
                  points="120,120 155,165 180,225"
                  stroke="url(#stickmanGradient)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <ellipse cx="190" cy="227" rx="13" ry="6" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
              </g>
            </g>
          )}

          {/* 3. JELLY LEGS (Wobbly rubber-hose knock-knees) */}
          {danceMove === 'jelly' && (
            <g>
              <g
                style={{
                  transformOrigin: '115px 120px',
                  animation: 'stickman-leg-floss-left 0.85s ease-in-out infinite',
                }}
              >
                <path
                  d="M120,120 Q95,170 70,225"
                  stroke="url(#stickmanGradient)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  fill="none"
                />
                <ellipse cx="62" cy="227" rx="13" ry="6" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
              </g>

              <g
                style={{
                  transformOrigin: '125px 120px',
                  animation: 'stickman-leg-floss-right 0.85s ease-in-out infinite',
                }}
              >
                <path
                  d="M120,120 Q145,170 170,225"
                  stroke="url(#stickmanGradient)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  fill="none"
                />
                <ellipse cx="178" cy="227" rx="13" ry="6" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
              </g>
            </g>
          )}

          {/* 4. ROCKOUT LEGS (High power jump & stomp) */}
          {danceMove === 'rockout' && (
            <g>
              <g
                style={{
                  transformOrigin: '115px 120px',
                  animation: 'stickman-leg-step-left 0.8s ease-in-out infinite',
                }}
              >
                <polyline
                  points="120,120 75,155 85,215"
                  stroke="url(#stickmanGradient)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <ellipse cx="88" cy="218" rx="13" ry="6" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
              </g>

              <g
                style={{
                  transformOrigin: '125px 120px',
                  animation: 'stickman-leg-step-right 0.8s ease-in-out infinite',
                }}
              >
                <polyline
                  points="120,120 165,155 155,215"
                  stroke="url(#stickmanGradient)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <ellipse cx="152" cy="218" rx="13" ry="6" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
              </g>
            </g>
          )}

          {/* 5. MOONWALK LEGS (Smooth backward glide steps) */}
          {danceMove === 'moonwalk' && (
            <g>
              <g
                style={{
                  transformOrigin: '115px 120px',
                  animation: 'stickman-leg-step-left 1.1s linear infinite',
                }}
              >
                <polyline
                  points="120,120 100,165 75,225"
                  stroke="url(#stickmanGradient)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <ellipse cx="68" cy="227" rx="13" ry="6" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
              </g>

              <g
                style={{
                  transformOrigin: '125px 120px',
                  animation: 'stickman-leg-step-right 1.1s linear infinite',
                }}
              >
                <polyline
                  points="120,120 140,165 165,225"
                  stroke="url(#stickmanGradient)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <ellipse cx="173" cy="227" rx="13" ry="6" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
              </g>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};

export default BirthdayCelebrationOverlay;
