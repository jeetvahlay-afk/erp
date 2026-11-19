import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArrowLeft,
  Check,
  Clock,
  FileEdit,
  Inbox,
  Mail,
  MailOpen,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Send,
  Settings,
  Star,
  Trash2,
  Undo2,
  User,
  X,
} from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { feedback } from '../lib/feedback';
import {
  ErrorState,
  LoadingState,
  Modal,
  PageHeader,
  formatDate,
} from '../components/ui/EnterpriseUI';

const folders = [
  ['inbox', 'Inbox', Inbox],
  ['starred', 'Starred', Star],
  ['sent', 'Sent', Send],
  ['draft', 'Drafts', FileEdit],
  ['archive', 'Archive', Archive],
  ['trash', 'Trash', Trash2],
];

const emptyForm = { id: '', recipientEmails: '', subject: '', body: '' };

const MailboxPage = ({ folder = 'inbox', composeInitially = false }) => {
  const [activeFolder, setActiveFolder] = useState(folder);
  const [state, setState] = useState({ loading: true, error: '', items: [] });
  const [directory, setDirectory] = useState([]);
  const [compose, setCompose] = useState(composeInitially);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mailSettings, setMailSettings] = useState({ displayName: '', signature: '', accountId: '', isEnabled: true });
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const [mail, users, settings] = await Promise.all([
        api.get(`/api/mailbox?folder=${activeFolder}${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''}`),
        api.get('/api/workspace/directory'),
        api.get('/api/mailbox/config'),
      ]);
      setState({ loading: false, error: '', items: asArray(mail.data) });
      setDirectory(asArray(users.data));
      setMailSettings(settings.data || {});
    } catch (error) {
      setState({ loading: false, error: getApiError(error, 'Unable to load mailbox'), items: [] });
    }
  }, [activeFolder, search]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  useEffect(() => {
    setActiveFolder(folder);
  }, [folder]);

  useEffect(() => {
    if (composeInitially) setCompose(true);
  }, [composeInitially]);

  const openCompose = (values = emptyForm) => {
    setForm(values);
    setCompose(true);
  };

  const save = async (status) => {
    setSending(true);
    try {
      await api.post('/api/mailbox', { ...form, status });
      feedback.success(status === 'sent' ? 'Email sent successfully.' : 'Draft saved.');
      setCompose(false);
      setForm(emptyForm);
      load();
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to process email'));
    } finally {
      setSending(false);
    }
  };

  const action = async (item, name) => {
    if (name === 'delete') {
      const accepted = await feedback.confirm(
        'Permanently delete this email? This action cannot be undone.',
        {
          title: 'Delete Forever',
          confirmLabel: 'Delete',
          tone: 'danger',
        }
      );
      if (!accepted) return;
    }
    try {
      await api.patch(`/api/mailbox/${item._id}`, { action: name });
      if (name === 'read') {
        setSelected({ ...item, readBy: [...(item.readBy || []), 'me'] });
      } else {
        setSelected(null);
        load();
      }
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to update mail status'));
    }
  };

  const openMessage = (item) => {
    setSelected(item);
    if (activeFolder === 'inbox' && !(item.readBy || []).length) {
      action(item, 'read');
    }
  };

  const editDraft = (item) => {
    openCompose({
      id: item._id,
      recipientEmails: item.recipients?.map((person) => person.email).filter(Boolean).join(', ') || '',
      subject: item.subject,
      body: item.body,
    });
  };

  const reply = (item) => {
    openCompose({
      id: '',
      recipientEmails: item.sender?.email || '',
      subject: item.subject.startsWith('Re:') ? item.subject : `Re: ${item.subject}`,
      body: `\n\n--- Original message ---\nFrom: ${item.sender?.name || 'Sender'} <${item.sender?.email || ''}>\nDate: ${formatDate(item.sentAt || item.updatedAt)}\nSubject: ${item.subject}\n\n${item.body}`,
    });
  };

  const saveSettings = async () => {
    try {
      const { data } = await api.put('/api/mailbox/config', {
        displayName: mailSettings.displayName,
        signature: mailSettings.signature,
      });
      setMailSettings(data);
      setSettingsOpen(false);
      feedback.success('Mail settings updated.');
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to save settings'));
    }
  };

  const currentUserId = useMemo(
    () => directory.find((person) => person.email === mailSettings.accountId)?._id,
    [directory, mailSettings.accountId]
  );

  const activeFolderMeta = useMemo(
    () => folders.find(([key]) => key === activeFolder) || ['inbox', 'Inbox', Inbox],
    [activeFolder]
  );

  const unreadCount = useMemo(() => {
    if (activeFolder !== 'inbox') return 0;
    return state.items.filter((item) => !(item.readBy || []).some((id) => String(id) === String(currentUserId))).length;
  }, [activeFolder, state.items, currentUserId]);

  const filteredDirectorySuggestions = useMemo(() => {
    if (!form.recipientEmails.trim()) return [];
    const parts = form.recipientEmails.split(',');
    const currentQuery = parts[parts.length - 1].trim().toLowerCase();
    if (!currentQuery || currentQuery.length < 2) return [];
    return directory
      .filter((person) =>
        person.email?.toLowerCase().includes(currentQuery) ||
        person.name?.toLowerCase().includes(currentQuery)
      )
      .slice(0, 5);
  }, [directory, form.recipientEmails]);

  const selectDirectorySuggestion = (email) => {
    const parts = form.recipientEmails.split(',').map((p) => p.trim());
    parts[parts.length - 1] = email;
    setForm({ ...form, recipientEmails: parts.join(', ') + ', ' });
  };

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* Page Header */}
      <PageHeader
        title="Mailbox"
        breadcrumbs={['Workspace', 'Mailbox', activeFolderMeta[1]]}
        actions={
          <>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer transition"
            >
              <Settings size={14} className="text-slate-500" />
              <span>Mail Settings</span>
            </button>
            <button
              type="button"
              onClick={load}
              className="border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer transition"
              title="Refresh Mailbox"
            >
              <RefreshCw size={14} className={`text-slate-500 ${state.loading ? 'animate-spin text-blue-600' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => openCompose()}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-3.5 py-1.5 text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition active:scale-[0.98]"
            >
              <Plus size={15} />
              <span>Compose</span>
            </button>
          </>
        }
      />

      {/* Main Mail Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col md:flex-row min-h-[660px]">
        {/* Left Folder Sidebar */}
        <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200/80 bg-slate-50/60 p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => openCompose()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-xs transition active:scale-[0.98] cursor-pointer"
            >
              <Plus size={16} />
              <span>Compose Email</span>
            </button>

            <div>
              <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Folders</p>
              <nav className="space-y-1">
                {folders.map(([key, label, Icon]) => {
                  const isActive = activeFolder === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setActiveFolder(key);
                        setSelected(null);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                        <span>{label}</span>
                      </div>
                      {key === 'inbox' && unreadCount > 0 && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isActive ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Account Profile Footer */}
          <div className="pt-4 mt-6 border-t border-slate-200/70">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 border border-blue-100">
                  <User size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {mailSettings.displayName || 'Mail Account'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {mailSettings.accountId || 'Internal ERP Mail'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                title="Mail Settings"
              >
                <Settings size={15} />
              </button>
            </div>
          </div>
        </aside>

        {/* Right Main Mail Workspace */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Top Search & Filter Bar */}
          <header className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between gap-4 bg-white/90">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search mail by sender, subject, or content..."
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 hidden sm:inline-block font-medium">
                {state.loading ? 'Updating...' : `${state.items.length} ${state.items.length === 1 ? 'message' : 'messages'}`}
              </span>
              <button
                type="button"
                title="Refresh"
                onClick={load}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <RefreshCw size={15} className={state.loading ? 'animate-spin text-blue-600' : ''} />
              </button>
            </div>
          </header>

          {/* Mail Content Area */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
            {state.loading ? (
              <LoadingState label="Loading messages…" />
            ) : state.error ? (
              <ErrorState message={state.error} retry={load} />
            ) : selected ? (
              /* Mail Reader / Inspection View */
              <article className="space-y-6">
                {/* Reader Action Bar */}
                <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-3 py-1.5 rounded-xl transition cursor-pointer"
                  >
                    <ArrowLeft size={15} />
                    <span>Back to {activeFolderMeta[1]}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      title={selected.starredBy?.length ? 'Unstar message' : 'Star message'}
                      onClick={() => action(selected, selected.starredBy?.length ? 'unstar' : 'star')}
                      className="p-2 text-slate-500 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition cursor-pointer"
                    >
                      <Star
                        size={16}
                        className={selected.starredBy?.length ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}
                      />
                    </button>
                    {activeFolder === 'trash' ? (
                      <>
                        <button
                          type="button"
                          title="Restore to Inbox"
                          onClick={() => action(selected, 'restore')}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-xl border border-slate-200/80 transition cursor-pointer"
                        >
                          <Undo2 size={14} className="text-emerald-600" />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          title="Delete Permanently"
                          onClick={() => action(selected, 'delete')}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200/80 transition cursor-pointer"
                        >
                          <Trash2 size={14} />
                          <span>Delete forever</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          title="Archive"
                          onClick={() => action(selected, 'archive')}
                          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                        >
                          <Archive size={16} />
                        </button>
                        <button
                          type="button"
                          title="Move to Trash"
                          onClick={() => action(selected, 'trash')}
                          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => reply(selected)}
                      className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-xs transition ml-2 cursor-pointer"
                    >
                      <Reply size={14} />
                      <span>Reply</span>
                    </button>
                  </div>
                </div>

                {/* Message Header */}
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-4">
                    {selected.subject}
                  </h2>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50/80 border border-slate-200/60">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm uppercase shrink-0">
                        {(selected.sender?.name || 'U').charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900">{selected.sender?.name || 'Me'}</span>
                          <span className="text-xs text-slate-500">&lt;{selected.sender?.email}&gt;</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          To:{' '}
                          {selected.recipients?.map((r) => r.name || r.email).filter(Boolean).join(', ') || 'Me'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium whitespace-nowrap">
                      <Clock size={13} />
                      <span>{formatDate(selected.sentAt || selected.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Message Body */}
                <div className="p-6 bg-slate-50/30 rounded-xl border border-slate-200/80 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans min-h-[240px]">
                  {selected.body}
                </div>

                {/* Bottom Reply Bar */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => reply(selected)}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <Reply size={15} />
                    <span>Reply to this email</span>
                  </button>
                </div>
              </article>
            ) : state.items.length ? (
              /* Message List */
              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
                {state.items.map((item) => {
                  const people = activeFolder === 'inbox' ? [item.sender] : item.recipients;
                  const unread =
                    activeFolder === 'inbox' &&
                    !(item.readBy || []).some((id) => String(id) === String(currentUserId));
                  const isStarred = item.starredBy?.length > 0;
                  const displayName =
                    people?.map((person) => person?.name).filter(Boolean).join(', ') || 'No recipients';

                  return (
                    <article
                      key={item._id}
                      className={`group flex items-center gap-3 px-4 py-3.5 transition cursor-pointer select-none ${
                        unread
                          ? 'bg-blue-50/30 hover:bg-blue-50/60 font-semibold'
                          : 'bg-white hover:bg-slate-50/80'
                      }`}
                      onClick={() => (activeFolder === 'draft' ? editDraft(item) : openMessage(item))}
                    >
                      {/* Star Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          action(item, isStarred ? 'unstar' : 'star');
                        }}
                        className="p-1 text-slate-300 group-hover:text-slate-400 hover:text-amber-500! transition shrink-0 cursor-pointer"
                        title={isStarred ? 'Unstar' : 'Star'}
                      >
                        <Star size={16} className={isStarred ? 'text-amber-400 fill-amber-400' : ''} />
                      </button>

                      {/* Unread indicator dot */}
                      <div className="w-2 shrink-0">
                        {unread && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                      </div>

                      {/* Sender / Recipient */}
                      <div
                        className={`w-36 sm:w-48 shrink-0 truncate text-xs ${
                          unread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                        }`}
                      >
                        {displayName}
                      </div>

                      {/* Subject & Body Preview */}
                      <div className="flex-1 min-w-0 flex items-baseline gap-2">
                        <span
                          className={`text-xs truncate ${
                            unread ? 'font-bold text-slate-900' : 'font-medium text-slate-800'
                          }`}
                        >
                          {item.subject}
                        </span>
                        <span className="text-xs text-slate-400 truncate hidden sm:inline">
                          — {item.body}
                        </span>
                      </div>

                      {/* Date & Hover Quick Actions */}
                      <div className="shrink-0 flex items-center gap-2">
                        <span className="text-[11px] font-medium text-slate-400 group-hover:hidden">
                          {formatDate(item.sentAt || item.updatedAt)}
                        </span>
                        <div
                          className="hidden group-hover:flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {activeFolder === 'trash' ? (
                            <>
                              <button
                                type="button"
                                title="Restore"
                                onClick={() => action(item, 'restore')}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                              >
                                <Undo2 size={15} />
                              </button>
                              <button
                                type="button"
                                title="Delete Forever"
                                onClick={() => action(item, 'delete')}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                title="Archive"
                                onClick={() => action(item, 'archive')}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              >
                                <Archive size={15} />
                              </button>
                              <button
                                type="button"
                                title="Trash"
                                onClick={() => action(item, 'trash')}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              /* Clean MatDash Empty State */
              <div className="h-full min-h-[380px] flex flex-col items-center justify-center p-8 text-center rounded-2xl border-2 border-dashed border-slate-200/80 bg-slate-50/40">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3.5 shadow-2xs">
                  {activeFolder === 'inbox' ? (
                    <MailOpen size={28} />
                  ) : activeFolder === 'trash' ? (
                    <Trash2 size={28} />
                  ) : activeFolder === 'starred' ? (
                    <Star size={28} />
                  ) : (
                    <Mail size={28} />
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  No {activeFolderMeta[1].toLowerCase()} mail
                </h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  {search
                    ? `No messages matched "${search}". Try searching for another keyword.`
                    : `Messages in your ${activeFolderMeta[1].toLowerCase()} folder will appear here.`}
                </p>
                {activeFolder !== 'inbox' && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveFolder('inbox');
                      setSearch('');
                    }}
                    className="mt-4 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    Go to Inbox &rarr;
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modern Compose Modal */}
      <Modal
        open={compose}
        title={form.id ? 'Edit Draft' : 'New Message'}
        subtitle="Compose internal company email"
        onClose={() => setCompose(false)}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => setCompose(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Discard
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={sending}
                onClick={() => save('draft')}
                className="border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 rounded-xl px-4 py-2 text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
              >
                <FileEdit size={14} className="text-slate-500" />
                <span>Save Draft</span>
              </button>
              <button
                type="button"
                disabled={sending || !form.subject.trim() || !form.body.trim() || !form.recipientEmails.trim()}
                onClick={() => save('sent')}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2 text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                <Send size={14} />
                <span>{sending ? 'Sending...' : 'Send Message'}</span>
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* To field */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              To <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.recipientEmails}
              onChange={(event) => setForm({ ...form, recipientEmails: event.target.value })}
              placeholder="employee@company.com, coworker@company.com"
              autoComplete="off"
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Enter one or more employee email addresses separated by commas.
            </p>

            {/* Suggestions dropdown */}
            {filteredDirectorySuggestions.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden py-1">
                <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Directory Suggestions
                </p>
                {filteredDirectorySuggestions.map((person) => (
                  <button
                    key={person._id}
                    type="button"
                    onClick={() => selectDirectorySuggestion(person.email)}
                    className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center justify-between text-xs transition cursor-pointer"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{person.name}</p>
                      <p className="text-[11px] text-slate-500">{person.email}</p>
                    </div>
                    <span className="text-[10px] text-blue-600 font-semibold bg-blue-100/70 px-2 py-0.5 rounded-full">
                      Add
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Subject field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Subject <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.subject}
              onChange={(event) => setForm({ ...form, subject: event.target.value })}
              placeholder="Enter subject..."
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Message field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Message <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={8}
              value={form.body}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
              placeholder="Write your email message here..."
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition leading-relaxed resize-y"
            />
          </div>
        </div>
      </Modal>

      {/* Modern Mail Settings Modal */}
      <Modal
        open={settingsOpen}
        title="Mail Settings"
        subtitle={mailSettings.accountId || 'Internal ERP Mailbox'}
        onClose={() => setSettingsOpen(false)}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveSettings}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2 text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition active:scale-[0.98]"
            >
              <Check size={14} />
              <span>Save Settings</span>
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Sender Display Name
            </label>
            <input
              type="text"
              value={mailSettings.displayName || ''}
              onChange={(event) => setMailSettings({ ...mailSettings, displayName: event.target.value })}
              placeholder="e.g. John Doe"
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              The name recipients will see in their inbox.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email Signature
            </label>
            <textarea
              rows={5}
              value={mailSettings.signature || ''}
              onChange={(event) => setMailSettings({ ...mailSettings, signature: event.target.value })}
              placeholder="e.g. Best regards,&#10;John Doe&#10;Senior Engineer"
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition leading-relaxed resize-y"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Your default signature to append to outgoing emails.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MailboxPage;
