import { useEffect, useState } from 'react';
import { AlertCircle, Bell, CheckCircle2, Info, X } from 'lucide-react';
import { FEEDBACK_EVENT } from '../lib/feedback';

const iconByTone = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const FeedbackProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    const handleFeedback = ({ detail }) => {
      if (detail.type === 'confirm') {
        setConfirmation(detail);
        return;
      }
      const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      setToasts((current) => [...current, { ...detail, id }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, detail.type === 'notification' ? 8000 : 4500);
    };
    window.addEventListener(FEEDBACK_EVENT, handleFeedback);
    return () => window.removeEventListener(FEEDBACK_EVENT, handleFeedback);
  }, []);

  const resolveConfirmation = (accepted) => {
    confirmation?.resolve(accepted);
    setConfirmation(null);
  };

  return (
    <>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[150] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        {toasts.map((toast) => {
          if (toast.type === 'notification') return (
            <div key={toast.id} className="pointer-events-auto overflow-hidden rounded-md border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-600">
                <span className="grid size-6 place-items-center rounded-sm bg-[#5b5fc7] text-white"><Bell size={14} /></span>
                <span className="flex-1">TeamHub</span>
                <button type="button" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} className="rounded-sm p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Dismiss notification"><X size={15} /></button>
              </div>
              <button type="button" className="block w-full px-4 py-3.5 text-left hover:bg-slate-50" onClick={() => { setToasts((current) => current.filter((item) => item.id !== toast.id)); toast.onClick?.(); }}>
                <strong className="block truncate text-sm text-slate-950">{toast.title || 'New notification'}</strong>
                <span className="mt-1 block line-clamp-2 text-sm font-normal leading-5 text-slate-600">{toast.message}</span>
              </button>
            </div>
          );
          const Icon = iconByTone[toast.tone] || Info;
          const toneClass = toast.tone === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : toast.tone === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-900'
              : 'border-blue-200 bg-blue-50 text-blue-900';
          return (
            <div key={toast.id} className={`pointer-events-auto flex items-start gap-3 rounded-md border p-4 shadow-xl ${toneClass}`}>
              <Icon size={20} className="mt-0.5 shrink-0" />
              <p className="min-w-0 flex-1 text-sm font-semibold leading-5">{toast.message}</p>
              <button type="button" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} className="rounded-sm p-1 opacity-60 hover:bg-black/5 hover:opacity-100" aria-label="Dismiss message"><X size={16} /></button>
            </div>
          );
        })}
      </div>

      {confirmation && (
        <div className="fixed inset-0 z-[160] grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
          <button type="button" aria-label="Cancel confirmation" className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={() => resolveConfirmation(false)} />
          <section className="relative w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
            <span className={`mb-5 grid size-14 place-items-center rounded-md ${confirmation.tone === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-orange-50 text-orange-600'}`}><AlertCircle size={25} /></span>
            <h2 id="confirmation-title" className="text-xl font-black text-slate-950">{confirmation.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{confirmation.message}</p>
            <div className="mt-7 flex justify-end gap-3">
              <button type="button" onClick={() => resolveConfirmation(false)} className="rounded-sm border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={() => resolveConfirmation(true)} className={`rounded-sm px-4 py-2.5 text-sm font-black text-white ${confirmation.tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-orange-600 hover:bg-orange-700'}`}>{confirmation.confirmLabel}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
};

export default FeedbackProvider;
