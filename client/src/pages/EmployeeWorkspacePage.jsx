import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Cake, CalendarDays, Download, Eye, FileCheck2, FileText, Forward, Megaphone,
  MessageCircle, MessagesSquare, Paperclip, Plus, Reply, Send, ShieldCheck, SmilePlus, Trash2, Upload, X,
} from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { feedback } from '../lib/feedback';
import {
  Avatar, EmptyState, ErrorState, LoadingState, MetricCard, Modal, PageHeader, Panel,
  ToolbarButton, formatDate, formatTime,
} from '../components/ui/EnterpriseUI';

const PAGE_CONFIG = {
  documents: { title: 'My Documents', section: 'Self Service', icon: FileText, endpoint: '/api/workspace/documents', empty: 'No documents uploaded', message: 'Your employment documents will appear here.' },
  announcements: { title: 'Announcements', section: 'Company', icon: Megaphone, endpoint: '/api/workspace/announcement', empty: 'No announcements', message: 'Company announcements will appear here.' },
  birthdays: { title: 'Birthdays', section: 'Company', icon: Cake, endpoint: '/api/workspace/birthdays', empty: 'No upcoming birthdays', message: 'Upcoming employee birthdays will appear here.' },
  events: { title: 'Events', section: 'Company', icon: CalendarDays, endpoint: '/api/workspace/event', empty: 'No upcoming events', message: 'Company events and important dates will appear here.' },
  directChat: { title: 'Direct Chat', section: 'Communication', icon: MessageCircle, chatType: 'direct', empty: 'No direct conversations', message: 'Start a private conversation with a team member.' },
  teamChat: { title: 'Team Chat', section: 'Communication', icon: MessagesSquare, chatType: 'team', empty: 'No team groups', message: 'Create a group to start a team conversation.' },
};

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏'];

const formatFileSize = (value) => {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Size unavailable';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
};

const documentTypeLabel = (item) => {
  const extension = String(item.name || '').split('.').pop();
  if (extension && extension !== item.name) return extension.toUpperCase();
  return String(item.type || 'File').split('/').pop().toUpperCase();
};

const getDaysToGo = (dateStr) => {
  const birthday = new Date(dateStr);
  birthday.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((birthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today! 🎉';
  if (diffDays === 1) return 'Tomorrow!';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
  return `${diffDays} days to go`;
};

const ServerImage = ({ src, alt, style }) => {
  const [failed, setFailed] = useState(false);
  const BASE = import.meta.env.VITE_API_URL || '';
  const fullSrc = src?.startsWith('http') ? src : `${BASE}${src}`;
  if (failed) return <span style={{ fontSize: 12, color: '#94a3b8' }}>Image unavailable</span>;
  return <img src={fullSrc} alt={alt || 'image'} style={style} onError={() => setFailed(true)} />;
};

const FileChip = ({ fileUrl, fileName }) => {
  const BASE = import.meta.env.VITE_API_URL || '';
  const fullUrl = fileUrl?.startsWith('http') ? fileUrl : `${BASE}${fileUrl}`;
  return (
    <a
      href={fullUrl}
      download={fileName}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px',
        background: 'rgba(255,255,255,0.15)', borderRadius: 8, fontSize: 12,
        color: 'inherit', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)',
        maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}
    >
      <Download size={13} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{fileName || 'Download file'}</span>
    </a>
  );
};

const ReplyPreview = ({ message, onCancel }) => {
  if (!message) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
      borderLeft: '3px solid #6366f1', background: '#f0f0ff', borderRadius: '0 8px 8px 0',
      fontSize: 12, color: '#475569', marginBottom: 6,
    }}>
      <Reply size={13} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <strong style={{ color: '#6366f1', display: 'block', fontSize: 11 }}>
          {message.sender?.name || 'User'}
        </strong>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
          {message.deletedAt ? 'This message was deleted' : (message.type !== 'text' ? `📎 ${message.fileName || 'File'}` : message.body)}
        </span>
      </div>
      {onCancel && (
        <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
          <X size={13} />
        </button>
      )}
    </div>
  );
};

const EMOJI_CATEGORIES = [
  { label: '😀 Smileys', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'] },
  { label: '👋 Gestures', emojis: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🤲', '🤝', '🙏', '✍', '💅', '🤳', '💪', '🦾', '🦵', '🦶', '👂', '🦻', '👃', '🫀', '🫁', '🧠', '🦷', '🦴', '👀', '👁', '👅', '👄', '💋'] },
  { label: '❤️ Hearts', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☯️', '♾️', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💬', '💭', '💤', '🔥', '⭐', '🌟', '✨', '⚡', '🎆', '🎇', '🌈'] },
  { label: '⚽ Activities', emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', '🥍', '🏑', '🏏', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🏇', '🧘', '🏄', '🧗', '🚵', '🎯', '🎳', '🎮', '🎰', '🎭', '🎨', '🖌️', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🎻', '🪕'] },
  { label: '🍕 Food', emojis: ['🍕', '🍔', '🌮', '🌯', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🥣', '🥗', '🍿', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🥪', '🍱', '🍛', '🍜', '🍝', '🍠', '🍢', '🍡', '🍣', '🍤', '🍙', '🍚', '🍘', '🍥', '🥮', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🫖', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾'] },
  { label: '🐶 Animals', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪲', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🦈', '🐊', '🐅', '🦓', '🦍', '🦧', '🦣', '🐘', '🦏', '🦛', '🦒', '🐃', '🫏', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐈', '🪶'] },
  { label: '🌸 Nature', emojis: ['🌸', '🌺', '🌻', '🌹', '🥀', '🌷', '🌱', '🪴', '🌿', '☘️', '🍀', '🎋', '🎍', '🍃', '🍂', '🍁', '🪸', '🍄', '🌾', '💐', '🌵', '🎄', '🌲', '🌳', '🌴', '🌼', '⭐', '🌟', '💫', '✨', '☀️', '🌤️', '⛅', '🌈', '❄️', '⛄', '🌊', '🌀', '🌪️', '⛈️', '⚡', '🔥', '💧', '🌍', '🌎', '🌏', '🪐', '🌕', '🌙', '🌛', '⛩️'] },
];

const EmojiPicker = ({ onPick, onClose, isMe }) => {
  const [expanded, setExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const pickerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={pickerRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        /* opens toward center of screen — right:0 for my msgs, left:0 for others */
        ...(isMe ? { right: 0 } : { left: 0 }),
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        zIndex: 100,
        overflow: 'hidden',
        width: expanded ? 304 : 'max-content',
      }}
    >
      {/* ── Quick bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '7px 8px', borderBottom: expanded ? '1px solid #f1f5f9' : 'none', whiteSpace: 'nowrap' }}>
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => { onPick(emoji); onClose(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 19, padding: '1px 3px', borderRadius: 6, lineHeight: 1 }}
          >
            {emoji}
          </button>
        ))}
        {/* ── "+" expand button ── */}
        <button
          type="button"
          title={expanded ? 'Less emojis' : 'More emojis'}
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          style={{
            marginLeft: 2,
            background: expanded ? '#ede9fe' : '#f1f5f9',
            border: '1px solid ' + (expanded ? '#c4b5fd' : '#e2e8f0'),
            borderRadius: 8, cursor: 'pointer',
            fontSize: 14, fontWeight: 800,
            color: '#6366f1',
            width: 26, height: 26,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1, flexShrink: 0,
          }}
        >
          {expanded ? '−' : '+'}
        </button>
      </div>

      {/* ── Full grid (shown when expanded) ── */}
      {expanded && (
        <div>
          {/* Category tabs */}
          <div style={{ display: 'flex', gap: 1, padding: '4px 6px', overflowX: 'auto', borderBottom: '1px solid #f1f5f9', scrollbarWidth: 'none' }}>
            {EMOJI_CATEGORIES.map((cat, idx) => (
              <button
                key={cat.label}
                type="button"
                onClick={() => setActiveCategory(idx)}
                title={cat.label}
                style={{
                  background: activeCategory === idx ? '#ede9fe' : 'transparent',
                  border: activeCategory === idx ? '1px solid #c4b5fd' : '1px solid transparent',
                  borderRadius: 7, cursor: 'pointer',
                  fontSize: 16, padding: '3px 5px', flexShrink: 0,
                }}
              >
                {cat.emojis[0]}
              </button>
            ))}
          </div>

          {/* Category label */}
          <div style={{ padding: '5px 10px 2px', fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {EMOJI_CATEGORIES[activeCategory].label}
          </div>

          {/* Emoji grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', padding: '4px 6px 8px', maxHeight: 192, overflowY: 'auto', gap: 0 }}>
            {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => { onPick(emoji); onClose(); }}
                title={emoji}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 21, padding: '4px 2px', borderRadius: 6, lineHeight: 1, textAlign: 'center' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f0ff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const MessageBubble = ({ item, isMe, user, onReply, onReact, onDelete, conversationList }) => {
  const [showActions, setShowActions] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showForward, setShowForward] = useState(false);

  const isDeleted = Boolean(item.deletedAt);

  const handleForwardSelect = async (targetConversationId) => {
    try {
      await api.post(`/api/chat/conversations/${targetConversationId}/messages`, {
        body: item.body || '',
        forwardedFrom: item._id,
      });
      feedback.success('Message forwarded');
    } catch (e) {
      feedback.error(getApiError(e, 'Unable to forward message'));
    }
    setShowForward(false);
  };

  return (
    <div
      style={{
        display: 'flex', gap: 8, alignItems: 'flex-end',
        flexDirection: isMe ? 'row-reverse' : 'row',
        alignSelf: isMe ? 'flex-end' : 'flex-start',
        maxWidth: '78%',
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmoji(false); }}
    >
      <Avatar user={item.sender} size="xs" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 2 }}>
        {/* sender name + time */}
        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500, display: 'flex', gap: 6, alignItems: 'center' }}>
          {!isMe && (item.sender?.name || 'Team member')}
          <time style={{ fontSize: 9, color: '#94a3b8' }}>{formatTime(item.createdAt)}</time>
        </span>

        {/* forwarded badge */}
        {item.forwardedFrom && (
          <span style={{ fontSize: 10, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Forward size={10} /> Forwarded
          </span>
        )}

        {/* reply-to snippet */}
        {item.replyTo && (
          <div style={{
            padding: '4px 8px', borderLeft: '2px solid #c7d2fe', background: isMe ? 'rgba(255,255,255,0.15)' : '#e0e7ff',
            borderRadius: '0 6px 6px 0', fontSize: 11, color: '#6366f1', maxWidth: 240,
            marginBottom: 2, overflow: 'hidden',
          }}>
            <strong style={{ display: 'block', fontSize: 10 }}>{item.replyTo.sender?.name || 'User'}</strong>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', color: '#475569' }}>
              {item.replyTo.deletedAt ? 'This message was deleted' : (item.replyTo.type !== 'text' ? `📎 ${item.replyTo.fileName || 'File'}` : item.replyTo.body)}
            </span>
          </div>
        )}

        {/* bubble wrapper – renders action bar above bubble as flex column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: isMe ? 'flex-end' : 'flex-start' }}>

          {/* action bar: appears above bubble on hover */}
          {showActions && !isDeleted && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 1,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 20,
              padding: '3px 8px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.13)',
              zIndex: 10,
              whiteSpace: 'nowrap',
              alignSelf: isMe ? 'flex-end' : 'flex-start',
            }}>
              <button type="button" title="Reply" onClick={() => onReply(item)} style={actionBtnStyle}><Reply size={14} /></button>
              <button type="button" title="Forward" onClick={() => setShowForward(true)} style={actionBtnStyle}><Forward size={14} /></button>
              <div style={{ position: 'relative' }}>
                <button type="button" title="React" onClick={() => setShowEmoji((v) => !v)} style={actionBtnStyle}><SmilePlus size={14} /></button>
                {showEmoji && <EmojiPicker isMe={isMe} onPick={(emoji) => { onReact(item._id, emoji); setShowEmoji(false); }} onClose={() => setShowEmoji(false)} />}
              </div>
              {isMe && (
                <button type="button" title="Delete" onClick={() => onDelete(item._id)} style={{ ...actionBtnStyle, color: '#ef4444' }}><Trash2 size={14} /></button>
              )}
            </div>
          )}

          {/* bubble */}
          <div
            style={{
              padding: isDeleted ? '8px 12px' : '10px 14px',
              borderRadius: 12,
              borderTopRightRadius: isMe ? 2 : 12,
              borderTopLeftRadius: isMe ? 12 : 2,
              background: isDeleted ? '#f1f5f9' : isMe ? '#2563eb' : '#f1f5f9',
              color: isDeleted ? '#94a3b8' : isMe ? '#ffffff' : '#1e293b',
              fontSize: 13, lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              fontStyle: isDeleted ? 'italic' : 'normal',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            {isDeleted ? 'This message was deleted' : (
              <>
                {item.type === 'image' && item.fileUrl && (
                  <ServerImage
                    src={item.fileUrl}
                    alt={item.fileName}
                    style={{ display: 'block', maxWidth: 240, maxHeight: 200, borderRadius: 8, marginBottom: item.body ? 6 : 0 }}
                  />
                )}
                {item.type === 'file' && item.fileUrl && (
                  <FileChip fileUrl={item.fileUrl} fileName={item.fileName} fileMime={item.fileMime} />
                )}
                {item.body && <span>{item.body}</span>}
              </>
            )}
          </div>
        </div>

        {/* reactions */}
        {item.reactions?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 2 }}>
            {item.reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onReact(item._id, r.emoji)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 3, padding: '1px 6px',
                  border: '1px solid #e2e8f0', borderRadius: 12,
                  background: r.users?.some((u) => (u._id || u) === user?._id) ? '#ede9fe' : '#f8fafc',
                  cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
                }}
                title={`${r.users?.length || 0} reaction(s)`}
              >
                <span style={{ fontSize: 13 }}>{r.emoji}</span>
                <span style={{ color: '#64748b' }}>{r.users?.length || 0}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* forward modal */}
      <Modal
        open={showForward}
        title="Forward Message"
        subtitle="Choose a conversation to forward to"
        onClose={() => setShowForward(false)}
        size="sm"
        footer={<ToolbarButton onClick={() => setShowForward(false)}>Cancel</ToolbarButton>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(conversationList || []).map((conv) => (
            <button
              key={conv._id}
              type="button"
              onClick={() => handleForwardSelect(conv._id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                border: '1px solid #e2e8f0', borderRadius: 8, background: '#fafafa',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              }}
            >
              <MessagesSquare size={15} style={{ color: '#6366f1', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                {conv.name || conv.members?.filter((m) => m._id !== item.sender?._id).map((m) => m.name).join(', ') || 'Conversation'}
              </span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
};

const actionBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
  padding: '3px 4px', borderRadius: 5, display: 'inline-flex', alignItems: 'center',
};

/* ─────────────────────────── Main Page ─────────────────────────── */

const EmployeeWorkspacePage = ({ type }) => {
  const { user } = useAuth();
  const config = PAGE_CONFIG[type];
  const Icon = config.icon;
  const isChat = Boolean(config.chatType);
  const [state, setState] = useState({ loading: true, error: '', items: [] });
  const [directory, setDirectory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [conversationName, setConversationName] = useState('');
  const [memberIds, setMemberIds] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [pendingFile, setPendingFile] = useState(null); // { file, previewUrl, isImage }
  const [sending, setSending] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentPreview, setDocumentPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const documentInput = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [form, setForm] = useState({ title: '', body: '', startsAt: '', endsAt: '' });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const load = async () => {
    setState((c) => ({ ...c, loading: true, error: '' }));
    try {
      if (isChat) {
        const [convRes, dirRes] = await Promise.all([
          api.get(`/api/chat/conversations?type=${config.chatType}`),
          api.get('/api/workspace/directory'),
        ]);
        setState({ loading: false, error: '', items: asArray(convRes.data) });
        setDirectory(asArray(dirRes.data));
      } else {
        const { data } = await api.get(config.endpoint);
        setState({ loading: false, error: '', items: asArray(data) });
      }
    } catch (error) {
      setState({ loading: false, error: getApiError(error, `Unable to load ${config.title.toLowerCase()}`), items: [] });
    }
  };

  useEffect(() => { load(); }, [type]);
  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => {
    if (!isChat) return undefined;
    const updateMessage = ({ detail }) => {
      if (String(detail.conversationId) !== String(selected?._id)) return;
      setMessages((items) => {
        const exists = items.some((item) => String(item._id) === String(detail.message._id));
        return exists ? items.map((item) => String(item._id) === String(detail.message._id) ? detail.message : item) : [...items, detail.message];
      });
    };
    window.addEventListener('teamhub:chat.message', updateMessage);
    window.addEventListener('teamhub:chat.reaction', updateMessage);
    return () => {
      window.removeEventListener('teamhub:chat.message', updateMessage);
      window.removeEventListener('teamhub:chat.reaction', updateMessage);
    };
  }, [isChat, selected?._id]);

  const openConversation = async (conv) => {
    setSelected(conv);
    setReplyingTo(null);
    setPendingFile(null);
    try {
      const { data } = await api.get(`/api/chat/conversations/${conv._id}/messages`);
      setMessages(asArray(data));
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to load messages'));
    }
  };

  const createConversation = async () => {
    if (!memberIds.length || (config.chatType === 'team' && !conversationName.trim())) return;
    try {
      const { data } = await api.post('/api/chat/conversations', {
        type: config.chatType, memberIds,
        ...(config.chatType === 'team' ? { name: conversationName.trim() } : {}),
      });
      setState((c) => ({ ...c, items: [data, ...c.items.filter((i) => i._id !== data._id)] }));
      setComposerOpen(false); setConversationName(''); setMemberIds([]);
      await openConversation(data);
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to create conversation'));
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImg = file.type.startsWith('image/');
    const previewUrl = isImg ? URL.createObjectURL(file) : null;
    setPendingFile({ file, previewUrl, isImage: isImg });
    e.target.value = '';
  };

  const cancelFile = () => {
    if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
    setPendingFile(null);
  };

  const sendMessage = async () => {
    if (!selected) return;
    if (!message.trim() && !pendingFile) return;
    setSending(true);
    try {
      let data;
      if (pendingFile) {
        const fd = new FormData();
        fd.append('file', pendingFile.file);
        if (message.trim()) fd.append('body', message.trim());
        if (replyingTo) fd.append('replyTo', replyingTo._id);
        ({ data } = await api.post(`/api/chat/conversations/${selected._id}/messages`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }));
        cancelFile();
      } else {
        const payload = { body: message.trim() };
        if (replyingTo) payload.replyTo = replyingTo._id;
        ({ data } = await api.post(`/api/chat/conversations/${selected._id}/messages`, payload));
      }
      setMessages((items) => items.some((item) => String(item._id) === String(data._id)) ? items : [...items, data]);
      setMessage('');
      setReplyingTo(null);
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to send message'));
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    const ok = await feedback.confirm('Delete this message?', { title: 'Delete message', confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    try {
      const { data } = await api.delete(`/api/chat/conversations/${selected._id}/messages/${msgId}`);
      setMessages((c) => c.map((m) => m._id === data._id ? { ...m, deletedAt: data.deletedAt } : m));
    } catch (e) {
      feedback.error(getApiError(e, 'Unable to delete message'));
    }
  };

  const handleReact = async (msgId, emoji) => {
    try {
      const { data } = await api.post(`/api/chat/conversations/${selected._id}/messages/${msgId}/react`, { emoji });
      setMessages((c) => c.map((m) => m._id === data._id ? data : m));
    } catch (e) {
      feedback.error(getApiError(e, 'Unable to react to message'));
    }
  };

  const uploadDocument = async (file) => {
    if (!file) return;
    const payload = new FormData(); payload.append('document', file);
    setUploadingDocument(true);
    try { await api.post('/api/users/profile/documents', payload); feedback.success('Document uploaded.'); await load(); }
    catch (error) { feedback.error(getApiError(error, 'Unable to upload document')); }
    finally {
      setUploadingDocument(false);
      if (documentInput.current) documentInput.current.value = '';
    }
  };

  const downloadDocument = async (item) => {
    try {
      const response = await api.get(`/api/users/${user._id}/documents/${item._id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = item.name || 'document';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to download document'));
    }
  };

  const closeDocumentPreview = () => {
    if (documentPreview?.url) URL.revokeObjectURL(documentPreview.url);
    setDocumentPreview(null);
  };

  const previewDocument = async (item) => {
    setPreviewLoading(true);
    try {
      const response = await api.get(`/api/users/${user._id}/documents/${item._id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      setDocumentPreview({ item, url, mime: response.data.type || item.type || '' });
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to preview document'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const conversationTitle = (conv) => conv.name
    || conv.members?.filter((m) => m._id !== user?._id).map((m) => m.name).join(', ')
    || 'Direct conversation';

  const conversationAvatarUser = (conv) => {
    if (conv.type === 'direct') return conv.members?.find((m) => m._id !== user?._id);
    return null;
  };

  const selectedMembers = useMemo(() => new Set(memberIds), [memberIds]);
  const isPrivileged = ['admin', 'super admin', 'hr'].includes(String(user?.role || '').trim().toLowerCase());

  const handleCreateContent = async () => {
    if (!form.title.trim() || !form.body.trim()) { feedback.error('Title and description/body are required.'); return; }
    if (type === 'events' && !form.startsAt) { feedback.error('Start date is required for events.'); return; }
    try {
      const payload = {
        title: form.title.trim(), body: form.body.trim(),
        ...(type === 'events' ? { startsAt: form.startsAt, ...(form.endsAt ? { endsAt: form.endsAt } : {}) } : {}),
      };
      await api.post(`/api/workspace/${type === 'announcements' ? 'announcement' : 'event'}`, payload);
      feedback.success(`${type === 'announcements' ? 'Announcement' : 'Event'} created successfully.`);
      setComposerOpen(false); setForm({ title: '', body: '', startsAt: '', endsAt: '' }); load();
    } catch (e) {
      feedback.error(getApiError(e, `Unable to create ${type === 'announcements' ? 'announcement' : 'event'}`));
    }
  };

  if (state.loading) return <LoadingState label={`Loading ${config.title.toLowerCase()}…`} />;
  if (state.error) return <ErrorState message={state.error} retry={load} />;

  if (isChat) return (
    <div>
      <input ref={fileInputRef} type="file" hidden accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx" onChange={handleFileSelect} />
      <div className="erp-chat-shell">
        {/* ── Sidebar ── */}
        <aside className="erp-chat-conversations">
          <header>
            <strong>{config.title}</strong>
            <button type="button" className="erp-icon-btn" onClick={() => setComposerOpen(true)} aria-label="New chat"
              style={{ background: 'var(--erp-orange-soft)', color: 'var(--erp-orange-dark)', border: '1px solid #ffd3c5', borderRadius: '50%', width: 26, height: 26, minWidth: 26, display: 'inline-grid', placeItems: 'center' }}>
              <Plus size={14} />
            </button>
          </header>
          {state.items.length ? state.items.map((conv) => {
            const otherUser = conversationAvatarUser(conv);
            return (
              <button type="button" key={conv._id}
                className={selected?._id === conv._id ? 'active' : ''}
                onClick={() => openConversation(conv)}>
                {conv.type === 'direct' && otherUser ? (
                  <Avatar user={otherUser} size="sm" />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 12 }}>
                    {conv.name ? conv.name.substring(0, 2).toUpperCase() : 'GP'}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ display: 'block', color: '#1e293b', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {conversationTitle(conv)}
                  </strong>
                  <small style={{ color: '#94a3b8', fontSize: 10 }}>{formatDate(conv.lastMessageAt)}</small>
                </div>
              </button>
            );
          }) : <EmptyState title={config.empty} message={config.message} />}
        </aside>

        {/* ── Chat panel ── */}
        <section className="erp-chat-panel">
          {selected ? (
            <>
              <header>
                <div>
                  <strong>{conversationTitle(selected)}</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    <span>{selected.members?.length || 0} member{selected.members?.length === 1 ? '' : 's'}</span>
                    {selected.type === 'team' && selected.createdBy && (
                      <>
                        <span style={{ color: '#e2e8f0' }}>•</span>
                        <span>Group Admin: <strong>{selected.createdBy._id === user?._id ? 'You' : selected.createdBy.name}</strong></span>
                      </>
                    )}
                  </div>
                </div>
              </header>

              {/* Messages */}
              <div className="erp-chat-messages" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
                {messages.length ? messages.map((item) => (
                  <MessageBubble
                    key={item._id}
                    item={item}
                    isMe={item.sender?._id === user?._id}
                    user={user}
                    onReply={setReplyingTo}
                    onForward={() => { }}
                    onReact={handleReact}
                    onDelete={handleDeleteMessage}
                    conversationList={state.items.filter((c) => c._id !== selected._id)}
                  />
                )) : <EmptyState title="No messages yet" message="Send the first message in this conversation." />}
                <div ref={messagesEndRef} />
              </div>

              {/* Compose area */}
              <div style={{ borderTop: '1px solid #f1f5f9' }}>
                {/* File preview */}
                {pendingFile && (
                  <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, background: '#fafafa', borderTop: '1px solid #f1f5f9' }}>
                    {pendingFile.isImage ? (
                      <img src={pendingFile.previewUrl} alt="preview" style={{ height: 48, width: 'auto', borderRadius: 6, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#e0e7ff', padding: '4px 10px', borderRadius: 8 }}>
                        <FileText size={14} style={{ color: '#2563eb' }} />
                        <span style={{ fontSize: 12, color: '#2563eb', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pendingFile.file.name}</span>
                      </div>
                    )}
                    <button type="button" onClick={cancelFile} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={14} /></button>
                  </div>
                )}
                {/* Reply preview */}
                {replyingTo && (
                  <div style={{ padding: '6px 12px' }}>
                    <ReplyPreview message={replyingTo} onCancel={() => setReplyingTo(null)} />
                  </div>
                )}
                <div className="erp-chat-compose">
                  <button type="button" onClick={() => fileInputRef.current?.click()} style={actionBtnStyle} title="Attach file">
                    <Paperclip size={17} />
                  </button>
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder={replyingTo ? `Replying to ${replyingTo.sender?.name || 'user'}…` : 'Type a message (Press Enter to send)…'}
                  />
                  <button type="button" onClick={sendMessage} disabled={sending || (!message.trim() && !pendingFile)} aria-label="Send message">
                    <Send size={17} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState title="Select a conversation" message="Choose a conversation or create a new one." />
          )}
        </section>
      </div>

      {/* New conversation modal */}
      <Modal
        open={composerOpen}
        title={config.chatType === 'team' ? 'Create Team Group' : 'Start Direct Chat'}
        subtitle="Select active team members."
        onClose={() => setComposerOpen(false)}
        size="sm"
        footer={<>
          <ToolbarButton onClick={() => setComposerOpen(false)}>Cancel</ToolbarButton>
          <ToolbarButton primary disabled={!memberIds.length || (config.chatType === 'team' && !conversationName.trim())} onClick={createConversation}>
            {config.chatType === 'team' ? 'Create Group' : 'Start Chat'}
          </ToolbarButton>
        </>}
      >
        {config.chatType === 'team' && (
          <div className="erp-field" style={{ marginBottom: 14 }}>
            <label>Group Name</label>
            <input value={conversationName} onChange={(e) => setConversationName(e.target.value)} placeholder="Enter group conversation name" />
          </div>
        )}
        <div className="erp-member-picker">
          {directory.map((person) => (
            <label key={person._id}>
              <input
                type={config.chatType === 'direct' ? 'radio' : 'checkbox'}
                name="chat-member"
                checked={selectedMembers.has(person._id)}
                onChange={() => setMemberIds((c) => config.chatType === 'direct' ? [person._id] : c.includes(person._id) ? c.filter((id) => id !== person._id) : [...c, person._id])}
              />
              <Avatar user={person} size="xs" />
              <span><strong>{person.name}</strong><small>{person.designation || person.department || person.employeeId}</small></span>
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );

  /* ── Non-chat workspace pages ── */
  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      <PageHeader
        title={config.title}
        breadcrumbs={[config.section, config.title]}
        actions={
          type === 'documents' ? (
            <>
              <input ref={documentInput} hidden type="file" accept=".pdf,.png,.jpg,.jpeg,.txt" onChange={(e) => uploadDocument(e.target.files?.[0])} />
              <ToolbarButton primary icon={Upload} disabled={uploadingDocument} onClick={() => documentInput.current?.click()}>{uploadingDocument ? 'Uploading…' : 'Upload Document'}</ToolbarButton>
            </>
          ) : (type === 'announcements' || type === 'events') && isPrivileged ? (
            <ToolbarButton primary icon={Plus} onClick={() => { setForm({ title: '', body: '', startsAt: '', endsAt: '' }); setComposerOpen(true); }}>
              {type === 'announcements' ? 'New Announcement' : 'New Event'}
            </ToolbarButton>
          ) : undefined
        }
      />
      {type === 'documents' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5">
          <MetricCard
            label="Total Documents"
            value={state.items.length}
            helper="Employment & HR records"
            icon={FileText}
            tone="blue"
          />
          <MetricCard
            label="Supported Formats"
            value="PDF, JPG, PNG, TXT"
            helper="Up to 10MB per document"
            icon={FileCheck2}
            tone="green"
          />
          <MetricCard
            label="Storage Status"
            value="Secure Cloud"
            helper="Encrypted workplace storage"
            icon={ShieldCheck}
            tone="purple"
          />
        </div>
      )}
      <Panel title={config.title} subtitle={config.message}>
        {state.items.length ? (
          type === 'announcements' ? (
            <div style={{ display: 'grid', gap: 16 }}>
              {state.items.map((item) => (
                <article key={item._id} style={{ border: '1px solid #cbd2dc', borderRadius: 8, padding: 20, background: '#ffffff', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ padding: 8, borderRadius: '50%', background: '#fef3c7', color: '#d97706' }}><Megaphone size={18} /></div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{item.title}</h3>
                      <small style={{ color: '#64748b' }}>Posted on {formatDate(item.createdAt)}</small>
                    </div>
                  </header>
                  <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.body}</div>
                  <footer style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 4 }}>
                    <Avatar user={item.createdBy} size="xs" />
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#475569' }}>Published by {item.createdBy?.name || 'Administrator'}</span>
                  </footer>
                </article>
              ))}
            </div>
          ) : type === 'events' ? (
            <div style={{ display: 'grid', gap: 16 }}>
              {state.items.map((item) => {
                const endDate = item.endsAt ? new Date(item.endsAt) : null;
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const start = new Date(item.startsAt); start.setHours(0, 0, 0, 0);
                const end = endDate ? new Date(endDate) : new Date(start); end.setHours(23, 59, 59, 999);
                const status = today > end ? 'Past' : today >= start ? 'In progress' : 'Upcoming';
                return (
                  <article key={item._id} style={{ border: '1px solid #cbd2dc', borderRadius: 8, padding: 20, background: '#ffffff', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ padding: 8, borderRadius: '50%', background: '#dbeafe', color: '#2563eb' }}><CalendarDays size={18} /></div>
                      <div style={{ minWidth: 0, flex: 1 }}><h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{item.title}</h3><small style={{ color: '#64748b' }}>{formatDate(item.startsAt)}{endDate ? ` — ${formatDate(endDate)}` : ''}</small></div>
                      <span style={{ padding: '4px 9px', borderRadius: 999, background: status === 'Past' ? '#f1f5f9' : status === 'In progress' ? '#ecfdf5' : '#eff6ff', color: status === 'Past' ? '#64748b' : status === 'In progress' ? '#059669' : '#2563eb', fontSize: 10, fontWeight: 700 }}>{status}</span>
                    </header>
                    <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.body}</div>
                    <footer style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 4 }}><Avatar user={item.createdBy} size="xs" /><span style={{ fontSize: 12, fontWeight: 500, color: '#475569' }}>Published by {item.createdBy?.name || 'Administrator'}</span></footer>
                  </article>
                );
              })}
            </div>
          ) : type === 'birthdays' ? (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16, padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc' }}>
                <div>
                  <strong style={{ display: 'block', color: '#0f172a', fontSize: 14 }}>
                    {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                  </strong>
                  <span style={{ color: '#64748b', fontSize: 11 }}>Birthdays in the current month only</span>
                </div>
                <span style={{ padding: '5px 10px', borderRadius: 999, background: '#eff6ff', color: '#2563eb', fontSize: 11, fontWeight: 700 }}>
                  {state.items.length} {state.items.length === 1 ? 'birthday' : 'birthdays'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 16 }}>
                {state.items.map((item) => {
                  const birthday = new Date(item.nextBirthday);
                  const daysToGoText = getDaysToGo(item.nextBirthday);
                  const isBirthdayToday = daysToGoText.startsWith('Today');
                  const isPast = birthday < new Date(new Date().setHours(0, 0, 0, 0));
                  return (
                    <article key={item._id} style={{ border: `1px solid ${isBirthdayToday ? '#fbbf24' : '#dbe3ee'}`, borderRadius: 12, padding: 16, background: isBirthdayToday ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' : '#ffffff', display: 'grid', gridTemplateColumns: '52px minmax(0, 1fr)', alignItems: 'center', gap: 14, boxShadow: isBirthdayToday ? '0 8px 24px rgba(217,119,6,0.12)' : '0 2px 8px rgba(15,23,42,0.05)', position: 'relative', overflow: 'hidden', minHeight: 118 }}>
                      {isBirthdayToday && <div style={{ position: 'absolute', top: 0, right: 0, background: '#d97706', color: '#ffffff', fontSize: 9, fontWeight: 800, padding: '3px 9px', borderBottomLeftRadius: 7, textTransform: 'uppercase', letterSpacing: '.04em' }}>Celebration 🎉</div>}

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                        <Avatar user={item} size="md" />
                        <span style={{ minWidth: 42, padding: '3px 6px', borderRadius: 7, textAlign: 'center', background: isBirthdayToday ? '#d97706' : '#eef2ff', color: isBirthdayToday ? '#ffffff' : '#4338ca', fontSize: 10, fontWeight: 800 }}>
                          {birthday.toLocaleString('en-US', { month: 'short' }).toUpperCase()} {birthday.getDate()}
                        </span>
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <h4 style={{ margin: 0, paddingRight: isBirthdayToday ? 70 : 0, fontSize: 14, fontWeight: 750, color: '#172033', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.name}>{item.name}</h4>
                        <div style={{ display: 'grid', gap: 3, marginTop: 5, minHeight: 33 }}>
                          <span style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.designation || 'Team Member'}>{item.designation || 'Team Member'}</span>
                          {item.department && <span style={{ fontSize: 10, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.department}>{item.department}</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 9, paddingTop: 9, borderTop: '1px solid rgba(148,163,184,0.2)' }}>
                          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{formatDate(item.nextBirthday)}</span>
                          <span style={{ padding: '3px 8px', borderRadius: 999, fontSize: 10, color: isBirthdayToday ? '#b45309' : isPast ? '#64748b' : '#2563eb', background: isBirthdayToday ? '#fef3c7' : isPast ? '#f1f5f9' : '#eff6ff', fontWeight: 700, whiteSpace: 'nowrap' }}>{daysToGoText}</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : type === 'documents' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.items.map((item, index) => (
                <article
                  key={item._id || `${item.name}-${index}`}
                  className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-blue-200 hover:shadow-xs transition-all flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wider">
                        {documentTypeLabel(item)}
                      </span>
                      <h4
                        className="text-xs font-bold text-slate-900 mt-1 truncate"
                        title={item.name}
                      >
                        {item.name || `Document ${index + 1}`}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatFileSize(item.size)} · {item.date ? formatDate(item.date) : 'Recent'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={previewLoading}
                      onClick={() => previewDocument(item)}
                      className="flex-1 py-1.5 px-3 rounded-lg border border-slate-200/80 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye size={13} />
                      <span>Preview</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadDocument(item)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100/70 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Download</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="erp-list">
              {state.items.map((item, index) => (
                <div className="erp-list-item" key={item._id || `${item.name}-${index}`}>
                  <span className="erp-metric-icon"><Icon size={16} /></span>
                  <div>
                    <strong>{item.title || item.name || `Document ${index + 1}`}</strong>
                    <span>{item.body || item.designation || item.department || item.type || item.size || 'Employee record'}</span>
                  </div>
                  <div>{item.createdAt ? <time>{formatDate(item.createdAt)}</time> : null}</div>
                </div>
              ))}
            </div>
          )
        ) : (
          <EmptyState title={config.empty} message={config.message} action={<Icon size={24} />} />
        )}
      </Panel>

      <Modal
        open={Boolean(documentPreview)}
        title={documentPreview?.item?.name || 'Document Preview'}
        subtitle={`${documentTypeLabel(documentPreview?.item || {})} · ${formatFileSize(documentPreview?.item?.size)}`}
        onClose={closeDocumentPreview}
        footer={<><ToolbarButton onClick={closeDocumentPreview}>Close</ToolbarButton><ToolbarButton primary icon={Download} onClick={() => downloadDocument(documentPreview.item)}>Download</ToolbarButton></>}
      >
        <div className="erp-document-preview">
          {documentPreview?.mime?.startsWith('image/') ? (
            <img src={documentPreview.url} alt={documentPreview.item.name || 'Document preview'} />
          ) : (
            <iframe src={documentPreview?.url} title={documentPreview?.item?.name || 'Document preview'} />
          )}
        </div>
      </Modal>

      <Modal
        open={composerOpen && (type === 'announcements' || type === 'events')}
        title={type === 'announcements' ? 'New Announcement' : 'New Event'}
        subtitle="Share updates with the company."
        onClose={() => setComposerOpen(false)}
        size="sm"
        footer={<><ToolbarButton onClick={() => setComposerOpen(false)}>Cancel</ToolbarButton><ToolbarButton primary onClick={handleCreateContent}>Create</ToolbarButton></>}
      >
        <div className="erp-form-grid one-column">
          <div className="erp-field">
            <label>Title <em>*</em></label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={type === 'announcements' ? 'e.g. Office Town Hall / Holiday Schedule' : 'e.g. Annual Team Outing 2026'} />
          </div>
          {type === 'events' && (
            <>
              <div className="erp-field">
                <label>Start Date <em>*</em></label>
                <input type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              </div>
              <div className="erp-field">
                <label>End Date</label>
                <input type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
              </div>
            </>
          )}
          <div className="erp-field">
            <label>Description / Message <em>*</em></label>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Provide announcement details, agenda, schedule, or instructions..." rows={4} />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EmployeeWorkspacePage;
