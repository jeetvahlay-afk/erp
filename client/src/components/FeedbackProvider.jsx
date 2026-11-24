import { useEffect, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, Bell, CheckCircle2, Info, X } from 'lucide-react';
import { FEEDBACK_EVENT } from '../lib/feedback';

const iconByTone = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const ToastItem = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const duration = toast.duration || (toast.type === 'notification' ? 7000 : 4500);
  const timerRef = useRef(null);
  const remainingRef = useRef(duration);
  const startTimeRef = useRef(0);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 250);
  };

  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearTimeout(timerRef.current);
      remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startTimeRef.current));
      return;
    }

    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, remainingRef.current);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPaused]);

  if (toast.type === 'notification') {
    return (
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className={`pointer-events-auto w-full overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/15 backdrop-blur-md transition-all ${
          isExiting ? 'animate-notification-exit' : 'animate-notification-pop'
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50/70 dark:bg-slate-800/60">
          <span className="grid size-6 place-items-center rounded-lg bg-blue-600 text-white shadow-xs">
            <Bell size={13} className="animate-bounce" />
          </span>
          <span className="flex-1 font-bold tracking-tight">TeamHub Notification</span>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
        <button
          type="button"
          className="block w-full px-4 py-3 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
          onClick={() => {
            handleDismiss();
            toast.onClick?.();
          }}
        >
          <strong className="block truncate text-sm font-bold text-slate-900 dark:text-white">
            {toast.title || 'New notification'}
          </strong>
          <span className="mt-1 block line-clamp-2 text-xs font-normal leading-relaxed text-slate-600 dark:text-slate-400">
            {toast.message}
          </span>
        </button>
        {/* Subtle auto-dismiss countdown bar */}
        <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all ease-linear"
            style={{
              animation: `progress-shrink ${duration}ms linear forwards`,
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
          />
        </div>
      </div>
    );
  }

  const Icon = iconByTone[toast.tone] || Info;
  const toneConfig = {
    success: {
      card: 'border-emerald-200/80 bg-white dark:bg-slate-900 text-slate-900 dark:text-white',
      badge: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
      bar: 'bg-emerald-500',
    },
    error: {
      card: 'border-rose-200/80 bg-white dark:bg-slate-900 text-slate-900 dark:text-white',
      badge: 'bg-rose-50 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400 border border-rose-200 dark:border-rose-800',
      bar: 'bg-rose-500',
    },
    warning: {
      card: 'border-amber-200/80 bg-white dark:bg-slate-900 text-slate-900 dark:text-white',
      badge: 'bg-amber-50 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
      bar: 'bg-amber-500',
    },
    info: {
      card: 'border-blue-200/80 bg-white dark:bg-slate-900 text-slate-900 dark:text-white',
      badge: 'bg-blue-50 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
      bar: 'bg-blue-500',
    },
  }[toast.tone] || {
    card: 'border-blue-200/80 bg-white dark:bg-slate-900 text-slate-900 dark:text-white',
    badge: 'bg-blue-50 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
    bar: 'bg-blue-500',
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`pointer-events-auto relative w-full overflow-hidden rounded-2xl border p-3.5 shadow-2xl shadow-slate-900/10 backdrop-blur-md transition-all ${
        toneConfig.card
      } ${isExiting ? 'animate-notification-exit' : 'animate-notification-pop'}`}
    >
      <div className="flex items-start gap-3">
        <span className={`grid size-7 shrink-0 place-items-center rounded-xl ${toneConfig.badge}`}>
          <Icon size={16} />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-xs font-semibold leading-relaxed text-slate-800 dark:text-slate-100">{toast.message}</p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          aria-label="Dismiss message"
        >
          <X size={14} />
        </button>
      </div>
      {/* Auto-dismiss progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full ${toneConfig.bar} transition-all ease-linear`}
          style={{
            animation: `progress-shrink ${duration}ms linear forwards`,
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        />
      </div>
    </div>
  );
};

const FeedbackProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmation, setConfirmation] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const handleFeedback = ({ detail }) => {
      if (detail.type === 'confirm') {
        setConfirmation(detail);
        return;
      }
      const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      setToasts((current) => [...current, { ...detail, id }]);
    };
    window.addEventListener(FEEDBACK_EVENT, handleFeedback);
    return () => window.removeEventListener(FEEDBACK_EVENT, handleFeedback);
  }, []);

  const dismissToast = (id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const dismissAll = () => {
    setToasts([]);
    setIsExpanded(false);
  };

  const resolveConfirmation = (accepted) => {
    confirmation?.resolve(accepted);
    setConfirmation(null);
  };

  const hasMultiple = toasts.length > 1;
  const showExpanded = hasMultiple && (isExpanded || isHovered);
  // In stacked mode, show latest on top, and at most 3 cards visible
  const reversedToasts = [...toasts].reverse();

  return (
    <>
      {children}
      {/* Top-Right Stacked Notification Container ("right upside") */}
      {toasts.length > 0 && (
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="fixed right-4 sm:right-6 top-4 sm:top-6 z-[99999] flex w-[min(24rem,calc(100vw-2rem))] flex-col transition-all duration-300"
          aria-live="polite"
        >
          {/* Stack Management Header Bar when multiple notifications exist */}
          {hasMultiple && (
            <div className="pointer-events-auto mb-2 flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-3 py-1.5 text-xs font-semibold shadow-lg shadow-slate-900/5 backdrop-blur-md transition-all">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="size-2 rounded-full bg-blue-600 animate-pulse" />
                <strong className="font-bold text-blue-600 dark:text-blue-400">{toasts.length}</strong> notifications stacked
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpanded((prev) => !prev)}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                >
                  {isExpanded ? 'Collapse' : 'Expand all'}
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  type="button"
                  onClick={dismissAll}
                  className="text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 cursor-pointer transition-colors"
                >
                  Dismiss all
                </button>
              </div>
            </div>
          )}

          {/* Stacked Cards Area */}
          {showExpanded ? (
            /* Expanded Mode: cleanly scrollable vertical list capped at 75vh */
            <div className="flex max-h-[75vh] flex-col gap-2.5 overflow-y-auto pr-1">
              {reversedToasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
              ))}
            </div>
          ) : (
            /* Collapsed Stacked Mode: neatly stacked cards taking height of just 1 card + offset */
            <div className="relative h-28 w-full">
              {reversedToasts.slice(0, 3).map((toast, idx) => {
                // idx 0 is top/newest, idx 1 is middle, idx 2 is bottom
                const zIndex = 30 - idx * 10;
                const translateY = idx * 8; // 0px, 8px, 16px
                const scale = 1 - idx * 0.04; // 1, 0.96, 0.92
                const opacity = 1 - idx * 0.15; // 1, 0.85, 0.70

                return (
                  <div
                    key={toast.id}
                    className="absolute inset-x-0 top-0 transition-all duration-300 ease-out"
                    style={{
                      zIndex,
                      transform: `translateY(${translateY}px) scale(${scale})`,
                      transformOrigin: 'top center',
                      opacity,
                    }}
                  >
                    <ToastItem toast={toast} onDismiss={dismissToast} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {confirmation && (
        <div className="fixed inset-0 z-[100000] grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
          <button type="button" aria-label="Cancel confirmation" className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => resolveConfirmation(false)} />
          <section className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl sm:p-8 animate-notification-pop">
            <span className={`mb-5 grid size-14 place-items-center rounded-2xl ${confirmation.tone === 'danger' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400' : 'bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400'}`}>
              <AlertCircle size={26} />
            </span>
            <h2 id="confirmation-title" className="text-xl font-black text-slate-950 dark:text-white">{confirmation.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{confirmation.message}</p>
            <div className="mt-7 flex justify-end gap-3">
              <button type="button" onClick={() => resolveConfirmation(false)} className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => resolveConfirmation(true)}
                className={`rounded-xl px-5 py-2.5 text-sm font-black text-white shadow-lg cursor-pointer transition-transform active:scale-95 ${
                  confirmation.tone === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                    : 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/30'
                }`}
              >
                {confirmation.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
};

export default FeedbackProvider;
