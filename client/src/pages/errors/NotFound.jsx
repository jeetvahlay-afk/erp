import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';

const NotFound = () => (
  <div className="min-h-[70vh] flex items-center justify-center p-6 text-center">
    <div className="max-w-md">
      <SearchX className="mx-auto text-slate-400" size={52} aria-hidden="true" />
      <p className="mt-5 text-xs font-black uppercase tracking-[0.25em] text-slate-400">404 · Not found</p>
      <h1 className="mt-2 text-3xl font-black text-slate-900">This page does not exist</h1>
      <p className="mt-3 text-slate-500">The link may be outdated or the page may have moved.</p>
      <Link to="/" className="mt-7 inline-flex rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-500">Open dashboard</Link>
    </div>
  </div>
);

export default NotFound;
