import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';

const Forbidden = () => (
  <div className="min-h-[70vh] flex items-center justify-center p-6 text-center">
    <div className="max-w-md">
      <ShieldX className="mx-auto text-rose-500" size={52} aria-hidden="true" />
      <p className="mt-5 text-xs font-black uppercase tracking-[0.25em] text-rose-500">403 · Restricted</p>
      <h1 className="mt-2 text-3xl font-black text-slate-900">Access is not permitted</h1>
      <p className="mt-3 text-slate-500">Your account does not have permission to open this workspace.</p>
      <Link to="/" className="mt-7 inline-flex rounded-xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-slate-800">Return to dashboard</Link>
    </div>
  </div>
);

export default Forbidden;
