import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Award,
  Flame,
  Glasses,
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
  { id: 'floss', label: 'The Floss', icon: Zap, desc: 'Rhythmic hip whipping & side arm swings' },
  { id: 'twerk', label: 'Cartoon Twerk', icon: Flame, desc: 'Energetic hip bounce & knee groove' },
  { id: 'disco', label: 'Disco Fever', icon: Sparkles, desc: 'Travolta sky point & groovy step' },
  { id: 'jelly', label: 'Jelly Noodle', icon: RotateCw, desc: 'Rubber-hose noodle arms & wavy groove' },
  { id: 'rockout', label: 'Air Guitar', icon: Flame, desc: 'Rockstar guitar shredding & power stance' },
  { id: 'moonwalk', label: 'Moonwalk', icon: Award, desc: 'Smooth slider glide & toe pop' },
];

const COMIC_PHRASES = [
  '🎉 WOOHOO! 🎉',
  '🔥 PARTY LEGEND! 🔥',
  '🕺 DANCE LEVEL 9000! 🕺',
  '🎂 CAKE TIME! 🎂',
  '⚡ UNSTOPPABLE! ⚡',
  '✨ BIRTHDAY HERO! ✨',
  '💥 GROOVE MASTER! 💥',
];

export const BirthdayCelebrationOverlay = ({ celebrant, user, onClose, isOpen = true }) => {
  const targetUser = celebrant || user;
  const [danceMove, setDanceMove] = useState('floss');
  const [autoFreestyle, setAutoFreestyle] = useState(true);
  const [showShades, setShowShades] = useState(false); // Default off so real profile picture is fully visible
  const [showHorn, setShowHorn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [confettiBurstCount, setConfettiBurstCount] = useState(0);
  const [activePhrase, setActivePhrase] = useState(COMIC_PHRASES[0]);
  const audioCtxRef = useRef(null);
  const isPlayingRef = useRef(false);
  const canvasRef = useRef(null);

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

  const userName = targetUser?.name || targetUser?.firstName || 'Valued Team Member';
  const userInitials = useMemo(() => {
    if (!userName) return '🎂';
    return userName
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [userName]);

  // Handle keyboard shortcut Esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Corner Confetti Cannons Animation System
  const fireCornerConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#fbbf24', '#ffffff', '#06b6d4'];
    const particles = [];

    // Left cannon particles (shooting from bottom left up-right towards center)
    for (let i = 0; i < 70; i++) {
      const angle = (Math.PI / 4) + (Math.random() * 0.45 - 0.22);
      const speed = 15 + Math.random() * 19;
      particles.push({
        x: 30,
        y: canvas.height - 30,
        vx: Math.cos(angle) * speed,
        vy: -Math.sin(angle) * speed,
        size: 7 + Math.random() * 9,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 14,
        gravity: 0.38,
        opacity: 1,
      });
    }

    // Right cannon particles (shooting from bottom right up-left towards center)
    for (let i = 0; i < 70; i++) {
      const angle = (3 * Math.PI / 4) + (Math.random() * 0.45 - 0.22);
      const speed = 15 + Math.random() * 19;
      particles.push({
        x: canvas.width - 30,
        y: canvas.height - 30,
        vx: Math.cos(angle) * speed,
        vy: -Math.sin(angle) * speed,
        size: 7 + Math.random() * 9,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 14,
        gravity: 0.38,
        opacity: 1,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        if (p.opacity <= 0.01) continue;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.985;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.0075;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
        ctx.restore();
      }
      if (alive) {
        requestAnimationFrame(render);
      }
    };
    render();
  };

  // Trigger corner confetti on mount and whenever burst count increments
  useEffect(() => {
    if (isOpen) {
      fireCornerConfetti();
    }
  }, [isOpen, confettiBurstCount]);

  // Auto-Freestyle DJ Mode: Cycles dance moves every 4 seconds
  useEffect(() => {
    if (!autoFreestyle || !isOpen) return;
    const interval = setInterval(() => {
      setDanceMove((current) => {
        const moves = DANCE_ROUTINES.map((r) => r.id);
        const currentIndex = moves.indexOf(current);
        const nextIndex = (currentIndex + 1) % moves.length;
        return moves[nextIndex];
      });
      setActivePhrase(COMIC_PHRASES[Math.floor(Math.random() * COMIC_PHRASES.length)]);
    }, 4200);
    return () => clearInterval(interval);
  }, [autoFreestyle, isOpen]);

  // Audio Playback: Cheerful Birthday Tune Synthesizer
  useEffect(() => {
    if (!isOpen || isMuted) {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      isPlayingRef.current = false;
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      let stepTime = ctx.currentTime + 0.15;
      BIRTHDAY_NOTES.forEach((step) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(step.note, stepTime);

        gain.gain.setValueAtTime(0.001, stepTime);
        gain.gain.exponentialRampToValueAtTime(0.12, stepTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, stepTime + step.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(stepTime);
        osc.stop(stepTime + step.dur + 0.05);

        stepTime += step.dur + step.pause;
      });
    } catch {
      // Audio autoplay restrictions silently caught
    }

    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [isOpen, isMuted, confettiBurstCount]);

  // Pre-generate 16 floating balloons
  const balloons = useMemo(() => {
    return Array.from({ length: 16 }).map((_, i) => {
      const leftPercent = 3 + (i * 6.2);
      const color = BALLOON_COLORS[i % BALLOON_COLORS.length];
      const duration = 8 + (i % 4) * 1.5;
      const delay = (i * 0.4) % 5;
      const size = 52 + (i % 3) * 10;
      return {
        id: i,
        left: `${Math.min(94, Math.max(3, leftPercent))}%`,
        color,
        duration: `${duration}s`,
        delay: `${delay}s`,
        size,
        swayType: i % 2 === 0 ? 'balloon-sway-left' : 'balloon-sway-right',
        swayDuration: `${2.3 + (i % 3) * 0.4}s`,
      };
    });
  }, []);

  // Pre-generate 45 falling confetti particles
  const confettiParticles = useMemo(() => {
    const confettiColors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#fbbf24', '#ffffff'];
    return Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      left: `${(i * 2.2) + ((i % 4) * 0.5)}%`,
      delay: `${(i * 0.15) % 4}s`,
      duration: `${3.5 + ((i % 5) * 0.6)}s`,
      bg: confettiColors[i % confettiColors.length],
      width: (i % 3 === 0) ? '12px' : '8px',
      height: (i % 2 === 0) ? '14px' : '9px',
      rounded: i % 4 === 0 ? 'rounded-full' : 'rounded-xs',
    }));
  }, []);

  // Floating musical notes
  const musicNotes = useMemo(() => {
    const symbols = ['♪', '♫', '♬', '♩', '✨'];
    return Array.from({ length: 6 }).map((_, i) => ({
      id: i,
      symbol: symbols[i % symbols.length],
      xOffset: (i % 2 === 0 ? 1 : -1) * (25 + (i * 12)),
      rotOffset: (i % 2 === 0 ? 1 : -1) * (15 + (i * 8)),
      delay: `${i * 0.7}s`,
      duration: '3.2s',
      color: ['#facc15', '#38bdf8', '#f472b6', '#4ade80'][i % 4],
    }));
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex flex-col justify-between select-none bg-gradient-to-b from-[#881337] via-[#9f1239] to-[#4c0519] animate-in fade-in duration-200">
      {/* 1. Stage Light Spotlights */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-32 -left-20 w-[600px] h-[750px] opacity-40 blur-3xl transform -rotate-12"
          style={{
            background: 'radial-gradient(circle at 50% 20%, rgba(251,191,36,0.85) 0%, rgba(244,63,94,0.4) 50%, transparent 80%)',
            animation: 'stage-spotlight-left 4.5s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute -top-32 -right-20 w-[600px] h-[750px] opacity-40 blur-3xl transform rotate-12"
          style={{
            background: 'radial-gradient(circle at 50% 20%, rgba(59,130,246,0.85) 0%, rgba(236,72,153,0.4) 50%, transparent 80%)',
            animation: 'stage-spotlight-right 4.5s ease-in-out infinite alternate',
          }}
        />
      </div>

      {/* 2. Corner Confetti Cannons Canvas ("cornervert") */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-20 w-full h-full" />

      {/* 3. Floating Background Balloons */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-5">
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
                className="relative rounded-[50%_50%_50%_50%/40%_40%_60%_60%] shadow-xl"
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
              <svg width="20" height="55" viewBox="0 0 20 55" fill="none" className="opacity-60">
                <path d="M10 0 C16 12, 4 25, 12 38 C16 45, 8 50, 10 55" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Falling Confetti Layer */}
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

      {/* 5. Top Navigation & Action Bar */}
      <header className="relative z-30 w-full max-w-7xl mx-auto px-5 pt-4 pb-2 flex items-center justify-between text-white">
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 text-xs font-semibold shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-amber-300 font-extrabold uppercase tracking-wide">LIVE CELEBRATION:</span>
          <span className="truncate max-w-[150px] sm:max-w-none text-white font-bold">{userName}</span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Confetti Cannon Burst Trigger */}
          <button
            type="button"
            onClick={() => setConfettiBurstCount((c) => c + 1)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg transition-transform active:scale-95 cursor-pointer ring-2 ring-amber-200/60"
            title="Fire Corner Confetti Cannons!"
          >
            <PartyPopper size={14} className="animate-bounce" />
            <span>Confetti Blast!</span>
          </button>

          {/* Audio Mute/Unmute Toggle */}
          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white transition cursor-pointer"
            title={isMuted ? 'Unmute Melody' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} className="text-amber-300 animate-pulse" />}
          </button>

          {/* Close / Return to ERP Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-black/40 hover:bg-rose-600/80 backdrop-blur-md border border-white/20 text-white transition cursor-pointer"
            title="Close Celebration"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* 6. Center Stage: Celebratory Typography & Dancing Cartoon Stickman */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center text-center px-4 -mt-2">
        <div className="pointer-events-none mb-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[11px] font-bold tracking-widest text-amber-200 uppercase mb-1 shadow-sm">
            <Sparkles size={12} className="text-amber-400" />
            <span>IT'S CELEBRATION TIME!</span>
            <Sparkles size={12} className="text-amber-400" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.65)] leading-tight">
            HAPPY BIRTHDAY!
          </h1>
          <p className="text-base sm:text-lg text-white font-semibold mt-1 drop-shadow-md">
            Wishing <span className="underline decoration-wavy decoration-yellow-400 font-black">{userName}</span> an extraordinary day! 🎂🎈
          </p>
        </div>

        {/* Comic Shoutout Banner */}
        <div
          key={activePhrase + confettiBurstCount}
          style={{ animation: 'comic-bubble-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
          className="pointer-events-none mb-1 inline-block px-4 py-1.5 rounded-2xl bg-gradient-to-r from-yellow-300 via-amber-400 to-rose-400 text-slate-950 font-black text-xs sm:text-sm shadow-2xl border-2 border-white ring-4 ring-yellow-400/40 select-none"
        >
          {activePhrase}
        </div>

        {/* The Dancing Stickman Character Stage */}
        <div className="relative mt-2 flex flex-col items-center">
          {/* Floating Musical Notes */}
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

          {/* Disco Ring Dance Floor */}
          <div
            className="w-64 sm:w-80 h-10 rounded-full -mt-2 pointer-events-none opacity-90"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.95) 0%, rgba(244,63,94,0.6) 45%, rgba(59,130,246,0.2) 70%, transparent 100%)',
              animation: 'disco-floor-glow 1.2s ease-in-out infinite',
            }}
          />
        </div>
      </main>

      {/* 7. Bottom Interactive Dance & Prop Controls (Clean Executive Theme - Zero Overflow) */}
      <footer className="relative z-30 w-full max-w-5xl mx-auto px-4 pb-6 pt-2">
        <div className="bg-slate-950/80 backdrop-blur-2xl border border-white/20 rounded-3xl p-4 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col gap-3.5">
          {/* Header Row: Title & Action Toggles */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5 text-white/95">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="text-left">
                <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                  Dance Moves & Choreography
                </h4>
                <p className="text-[11px] text-white/70">
                  Select a dance routine or let Auto-DJ groove continuously
                </p>
              </div>
            </div>

            {/* Quick Controls: Auto-DJ, Party Shades, Blower */}
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
              <button
                type="button"
                onClick={() => setAutoFreestyle((v) => !v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
                  autoFreestyle
                    ? 'bg-emerald-500 text-white shadow-emerald-500/25 ring-2 ring-emerald-400/50'
                    : 'bg-white/10 text-white/75 border border-white/15 hover:bg-white/20'
                }`}
                title="Toggle automated freestyle dance rotation"
              >
                <RotateCw size={12} className={autoFreestyle ? 'animate-spin' : ''} />
                <span>Auto-DJ: {autoFreestyle ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowShades((v) => !v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
                  showShades
                    ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                    : 'bg-white/10 text-white/75 border border-white/15 hover:bg-white/20'
                }`}
                title="Toggle cool party sunglasses"
              >
                <Glasses size={13} />
                <span>Party Shades</span>
              </button>

              <button
                type="button"
                onClick={() => setShowHorn((v) => !v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
                  showHorn
                    ? 'bg-rose-500 text-white ring-2 ring-rose-300'
                    : 'bg-white/10 text-white/75 border border-white/15 hover:bg-white/20'
                }`}
                title="Toggle celebratory party blower"
              >
                <span>🎉 Blower</span>
              </button>
            </div>
          </div>

          {/* Dance Move Chips Grid: 6 buttons perfectly fitting without overflow */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 w-full">
            {DANCE_ROUTINES.map((routine) => {
              const active = danceMove === routine.id;
              const Icon = routine.icon;
              return (
                <button
                  key={routine.id}
                  type="button"
                  onClick={() => {
                    setAutoFreestyle(false);
                    setDanceMove(routine.id);
                  }}
                  className={`p-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 select-none active:scale-95 ${
                    active
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-extrabold shadow-lg shadow-amber-500/25 ring-2 ring-white'
                      : 'bg-white/10 hover:bg-white/15 text-white/90 border border-white/15'
                  }`}
                  title={routine.desc}
                >
                  <Icon size={14} className={active ? 'text-slate-950 shrink-0' : 'text-amber-300 shrink-0'} />
                  <span className="truncate">{routine.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </footer>
    </div>
  );
};

/**
 * Articulated Cartoon Stickman Character
 * Features:
 * - Prominent, high-contrast, crystal-clear celebrant avatar head (w-32 h-32).
 * - Articulated golden limbs with clean natural geometry for all 6 routines.
 * - Zero torso looping or overlapping limbs.
 */
const ArticulatedStickmanCharacter = ({
  danceMove,
  profilePhoto,
  userInitials,
  userName,
  showShades = false,
  showHorn = true,
}) => {
  // Container groove bounce
  const grooveAnimationClass =
    danceMove === 'floss'
      ? 'animate-[stickman-floss-groove_0.75s_ease-in-out_infinite]'
      : danceMove === 'twerk'
      ? 'animate-[stickman-twerk-groove_0.42s_cubic-bezier(0.36,0.07,0.19,0.97)_infinite]'
      : danceMove === 'jelly'
      ? 'animate-[stickman-jelly-groove_0.85s_ease-in-out_infinite]'
      : danceMove === 'rockout'
      ? 'animate-[stickman-rockout-groove_0.8s_cubic-bezier(0.4,0,0.6,1)_infinite]'
      : danceMove === 'moonwalk'
      ? 'animate-[stickman-moonwalk-groove_2.2s_linear_infinite]'
      : 'animate-[stickman-bounce-groove_1s_cubic-bezier(0.45,0.05,0.55,0.95)_infinite]';

  return (
    <div className={`relative flex flex-col items-center select-none ${grooveAnimationClass}`}>
      {/* 1. Cartoon Party Hat */}
      <div className="absolute -top-11 z-30 flex flex-col items-center pointer-events-none transform -rotate-6 animate-[stickman-head-bob_1s_ease-in-out_infinite]">
        <div className="w-5 h-5 rounded-full bg-yellow-300 shadow-[0_0_12px_rgba(253,224,71,0.95)] border-2 border-yellow-100 animate-bounce" />
        <div
          className="w-10 h-10 -mt-1 shadow-md"
          style={{
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            background: 'repeating-linear-gradient(45deg, #ef4444, #ef4444 6px, #facc15 6px, #facc15 12px, #3b82f6 12px, #3b82f6 18px)',
          }}
        />
      </div>

      {/* 2. Prominent, Crystal-Clear Profile Picture Head */}
      <div
        className="relative z-20 w-32 h-32 sm:w-36 sm:h-36 rounded-full p-1.5 bg-gradient-to-tr from-amber-400 via-yellow-200 to-rose-400 shadow-[0_0_36px_rgba(251,191,36,0.9)] border-3 border-white animate-[stickman-head-bob_0.9s_ease-in-out_infinite]"
        title={`${userName}'s Face`}
      >
        <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center ring-2 ring-amber-300 relative">
          {profilePhoto ? (
            <img
              src={profilePhoto}
              alt={userName}
              className="w-full h-full object-cover contrast-105 brightness-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextElementSibling) {
                  e.currentTarget.nextElementSibling.style.display = 'flex';
                }
              }}
            />
          ) : null}
          <div
            className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white font-black text-3xl sm:text-4xl select-none ${profilePhoto ? 'hidden' : 'flex'}`}
          >
            <span>{userInitials}</span>
          </div>

          {/* Optional Cool Party Sunglasses Prop */}
          {showShades && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none drop-shadow-md">
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-4 rounded-b-xl bg-gradient-to-b from-indigo-950/85 to-purple-900/85 border-2 border-amber-300 relative overflow-hidden backdrop-blur-xs">
                  <div className="absolute top-0.5 left-1 w-3 h-1 bg-white/70 rotate-[-20deg] rounded-full" />
                </div>
                <div className="w-2.5 h-1 bg-amber-400 -mt-1" />
                <div className="w-8 h-4 rounded-b-xl bg-gradient-to-b from-indigo-950/85 to-purple-900/85 border-2 border-amber-300 relative overflow-hidden backdrop-blur-xs">
                  <div className="absolute top-0.5 left-1 w-3 h-1 bg-white/70 rotate-[-20deg] rounded-full" />
                </div>
              </div>
            </div>
          )}

          {/* Unfurling Party Blower / Noisemaker Prop */}
          {showHorn && (
            <div
              className="absolute bottom-3 right-1.5 origin-left z-20 pointer-events-none"
              style={{
                animation: 'party-blower-extend 1.4s ease-in-out infinite',
              }}
            >
              <div className="flex items-center">
                <div className="w-2.5 h-3 bg-red-600 rounded-l-sm border border-yellow-200" />
                <div className="w-9 sm:w-11 h-2.5 bg-gradient-to-r from-yellow-300 via-pink-500 to-cyan-400 rounded-r-full shadow-sm" />
                <div className="w-3 h-3 rounded-full bg-cyan-400 border border-white -ml-1 animate-pulse" />
              </div>
            </div>
          )}
        </div>

        {/* Rosy Cheeks */}
        <div className="absolute bottom-5 left-3 w-4 h-2.5 bg-rose-500/70 rounded-full blur-[2px] pointer-events-none" />
        <div className="absolute bottom-5 right-3 w-4 h-2.5 bg-rose-500/70 rounded-full blur-[2px] pointer-events-none" />
      </div>

      {/* 3. Articulated Cartoon Stickman SVG Body & Limbs */}
      <div className="-mt-3 w-72 h-80 sm:w-80 sm:h-88 pointer-events-none relative flex justify-center">
        <svg
          viewBox="0 0 240 270"
          className="w-full h-full filter drop-shadow-[0_8px_18px_rgba(0,0,0,0.55)]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="stickmanGrad" x1="0" y1="0" x2="240" y2="270" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#facc15" />
            </linearGradient>
          </defs>

          {/* Neck */}
          <path
            d="M120,4 L120,28"
            stroke="#facc15"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Festive Bowtie */}
          <polygon points="106,20 134,20 120,29" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
          <polygon points="106,38 134,38 120,29" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="120" cy="29" r="4" fill="#facc15" stroke="#ffffff" strokeWidth="1" />

          {/* Spine / Torso - Solid, prominent cartoon middle body */}
          <path
            d="M120,28 L120,132"
            stroke="#facc15"
            strokeWidth="11"
            strokeLinecap="round"
          />
          {/* Torso Highlight & Festive Cartoon Buttons */}
          <path
            d="M120,33 L120,125"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeOpacity="0.85"
          />
          <circle cx="120" cy="54" r="3.5" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
          <circle cx="120" cy="78" r="3.5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1" />
          <circle cx="120" cy="102" r="3.5" fill="#10b981" stroke="#ffffff" strokeWidth="1" />

          {/* Waistband / Belt connecting middle body to legs */}
          <ellipse cx="120" cy="128" rx="16" ry="6" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
          <rect x="114" y="124" width="12" height="8" rx="2" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />

          {/* ================================================================= */}
          {/* ARMS: Cleanly articulated without self-looping                    */}
          {/* ================================================================= */}

          {/* 1. THE FLOSS DANCE ARMS: Clean side-to-side sweeping motion */}
          {danceMove === 'floss' && (
            <g style={{ animation: 'stickman-leg-floss-left 0.75s ease-in-out infinite' }}>
              {/* Left Arm */}
              <polyline
                points="120,45 80,85 50,130"
                stroke="url(#stickmanGrad)"
                strokeWidth="8.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle cx="50" cy="130" r="7.5" fill="#facc15" stroke="#ffffff" strokeWidth="2" />

              {/* Right Arm */}
              <polyline
                points="120,45 160,85 190,130"
                stroke="url(#stickmanGrad)"
                strokeWidth="8.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle cx="190" cy="130" r="7.5" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
            </g>
          )}

          {/* 2. THE TWERK ARMS: Hands firmly placed on knees */}
          {danceMove === 'twerk' && (
            <g>
              {/* Left Arm on knee */}
              <polyline
                points="120,45 75,95 82,150"
                stroke="url(#stickmanGrad)"
                strokeWidth="8.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle cx="82" cy="150" r="7.5" fill="#facc15" stroke="#ffffff" strokeWidth="2" />

              {/* Right Arm on knee */}
              <polyline
                points="120,45 165,95 158,150"
                stroke="url(#stickmanGrad)"
                strokeWidth="8.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle cx="158" cy="150" r="7.5" fill="#facc15" stroke="#ffffff" strokeWidth="2" />

              {/* Booty Cheek Bounce Pop */}
              <g style={{ animation: 'stickman-booty-twerk 0.42s ease-in-out infinite' }}>
                <ellipse cx="102" cy="122" rx="16" ry="13" fill="#facc15" stroke="#ffffff" strokeWidth="2.5" />
                <ellipse cx="138" cy="122" rx="16" ry="13" fill="#facc15" stroke="#ffffff" strokeWidth="2.5" />
              </g>
            </g>
          )}

          {/* 3. DISCO FEVER: Classic Travolta Sky Point & Hand on Hip */}
          {danceMove === 'disco' && (
            <g>
              {/* Left Hand on Hip */}
              <polyline
                points="120,45 78,80 102,110"
                stroke="url(#stickmanGrad)"
                strokeWidth="8.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle cx="102" cy="110" r="7" fill="#facc15" stroke="#ffffff" strokeWidth="2" />

              {/* Right Arm: Pointing High at Sky */}
              <g style={{ animation: 'stickman-arm-disco-right 1s ease-in-out infinite' }}>
                <polyline
                  points="120,45 165,30 205,10"
                  stroke="url(#stickmanGrad)"
                  strokeWidth="8.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <circle cx="205" cy="10" r="7" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
                {/* Sparkle burst at finger */}
                <path d="M205,0 L205,20 M195,10 L215,10" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              </g>
            </g>
          )}

          {/* 4. JELLY NOODLE: Rubber-hose wavy arms */}
          {danceMove === 'jelly' && (
            <g>
              <path
                d="M120,45 Q70,70 50,110 T40,150"
                stroke="url(#stickmanGrad)"
                strokeWidth="8.5"
                strokeLinecap="round"
                fill="none"
                style={{ animation: 'stickman-arm-wave-left 0.85s ease-in-out infinite' }}
              />
              <circle cx="40" cy="150" r="7" fill="#facc15" stroke="#ffffff" strokeWidth="2" />

              <path
                d="M120,45 Q170,70 190,110 T200,150"
                stroke="url(#stickmanGrad)"
                strokeWidth="8.5"
                strokeLinecap="round"
                fill="none"
                style={{ animation: 'stickman-arm-wave-right 0.85s ease-in-out infinite' }}
              />
              <circle cx="200" cy="150" r="7" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
            </g>
          )}

          {/* 5. AIR GUITAR ROCKOUT: Electric guitar shredding */}
          {danceMove === 'rockout' && (
            <g>
              {/* Electric Guitar Vector Body */}
              <g transform="translate(68, 55) rotate(-30)">
                <line x1="10" y1="20" x2="90" y2="20" stroke="#f59e0b" strokeWidth="4.5" strokeLinecap="round" />
                <circle cx="90" cy="17" r="2.5" fill="#ffffff" />
                <circle cx="90" cy="23" r="2.5" fill="#ffffff" />
                <polygon points="0,0 26,20 0,40 18,20" fill="#ec4899" stroke="#ffffff" strokeWidth="2" />
                <polygon points="3,5 20,20 3,35 15,20" fill="#a855f7" />
              </g>

              {/* Left Arm: Fretting up high */}
              <polyline
                points="120,45 100,55 135,42"
                stroke="url(#stickmanGrad)"
                strokeWidth="8.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle cx="135" cy="42" r="7" fill="#facc15" stroke="#ffffff" strokeWidth="2" />

              {/* Right Arm: Strumming */}
              <polyline
                points="120,45 80,75 88,105"
                stroke="url(#stickmanGrad)"
                strokeWidth="8.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                style={{ animation: 'stickman-arm-guitar-strum 0.8s ease-in-out infinite' }}
              />
              <circle cx="88" cy="105" r="7" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
            </g>
          )}

          {/* 6. MOONWALK: Smooth slider stance */}
          {danceMove === 'moonwalk' && (
            <g>
              <polyline
                points="120,45 80,75 60,115"
                stroke="url(#stickmanGrad)"
                strokeWidth="8.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle cx="60" cy="115" r="7" fill="#facc15" stroke="#ffffff" strokeWidth="2" />

              <polyline
                points="120,45 155,70 175,105"
                stroke="url(#stickmanGrad)"
                strokeWidth="8.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle cx="175" cy="105" r="7" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
            </g>
          )}

          {/* ================================================================= */}
          {/* LEGS: Articulated hip, knee, and dancing shoes                    */}
          {/* ================================================================= */}

          {/* Left Leg */}
          <g>
            <polyline
              points={
                danceMove === 'floss'
                  ? '120,125 90,175 65,228'
                  : danceMove === 'twerk'
                  ? '120,125 80,165 72,228'
                  : danceMove === 'disco'
                  ? '120,125 82,175 58,228'
                  : danceMove === 'rockout'
                  ? '120,125 75,175 50,225'
                  : '120,125 90,175 65,228'
              }
              stroke="url(#stickmanGrad)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Left Dancing Shoe */}
            <ellipse
              cx={
                danceMove === 'rockout' ? 45 : danceMove === 'twerk' ? 68 : danceMove === 'disco' ? 52 : 60
              }
              cy="232"
              rx="15"
              ry="7"
              fill="#facc15"
              stroke="#ffffff"
              strokeWidth="2"
            />
          </g>

          {/* Right Leg */}
          <g>
            <polyline
              points={
                danceMove === 'floss'
                  ? '120,125 150,175 175,228'
                  : danceMove === 'twerk'
                  ? '120,125 160,165 168,228'
                  : danceMove === 'disco'
                  ? '120,125 155,175 180,228'
                  : danceMove === 'rockout'
                  ? '120,125 165,175 190,225'
                  : '120,125 150,175 175,228'
              }
              stroke="url(#stickmanGrad)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Right Dancing Shoe */}
            <ellipse
              cx={
                danceMove === 'rockout' ? 195 : danceMove === 'twerk' ? 172 : danceMove === 'disco' ? 185 : 180
              }
              cy="232"
              rx="15"
              ry="7"
              fill="#facc15"
              stroke="#ffffff"
              strokeWidth="2"
            />
          </g>
        </svg>
      </div>
    </div>
  );
};

export default BirthdayCelebrationOverlay;
