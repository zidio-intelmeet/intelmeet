import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useAuthStore } from '../../stores/authStore';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isPrivate?: boolean;
  recipientId?: string;
  recipientName?: string;
}

interface Participant {
  id?: string;
  name: string;
  socketId: string;
  hasVideo: boolean;
  hasAudio: boolean;
  isHost?: boolean;
  role?: 'Admin' | 'Member';
}

interface MeetingChatProps {
  messages: ChatMessage[];
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (content: string, recipientId?: string) => void;
  currentUserId?: string;
  variant?: 'drawer' | 'inline';
  participants?: Participant[];
  selectedRecipientId?: string;
  onRecipientChange?: (recipientId: string) => void;
}

export function MeetingChat({
  messages,
  isOpen,
  onClose,
  onSendMessage,
  currentUserId,
  variant = 'drawer',
  participants = [],
  selectedRecipientId,
  onRecipientChange,
}: MeetingChatProps) {
  const [input, setInput] = useState('');
  const [localRecipientId, setLocalRecipientId] = useState('Everyone');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = useAuthStore((s) => s.user);

  const activeRecipientId = selectedRecipientId !== undefined ? selectedRecipientId : localRecipientId;

  const handleRecipientChange = (value: string) => {
    if (onRecipientChange) {
      onRecipientChange(value);
    } else {
      setLocalRecipientId(value);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(
        input.trim(),
        activeRecipientId === 'Everyone' ? undefined : activeRecipientId
      );
      setInput('');
    }
  };

  // Helper to parse mentions and highlight them
  const renderMessageContent = (msg: ChatMessage) => {
    const text = msg.content;
    const isUserMentioned =
      currentUser &&
      (text.toLowerCase().includes(`@${currentUser.name.toLowerCase()}`) ||
        text.toLowerCase().includes(`@${currentUser.name.split(' ')[0].toLowerCase()}`));

    const words = text.split(/(\s+)/); // Split keeping whitespace

    return (
      <p className={`text-sm leading-relaxed break-words ${isUserMentioned ? 'text-amber-200 font-medium' : 'text-slate-100'}`}>
        {words.map((word, i) => {
          if (word.startsWith('@')) {
            const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const isMatch =
              participants.some(
                (p) =>
                  p.name.toLowerCase().includes(cleanWord) ||
                  p.name.split(' ')[0].toLowerCase() === cleanWord
              ) ||
              (currentUser && currentUser.name.toLowerCase().includes(cleanWord));

            if (isMatch) {
              return (
                <span
                  key={i}
                  className="bg-indigo-500/30 text-indigo-300 px-1 py-0.5 rounded font-semibold text-xs border border-indigo-500/20"
                >
                  {word}
                </span>
              );
            }
          }
          return word;
        })}
      </p>
    );
  };

  const isMessageMentioned = (content: string) => {
    if (!currentUser) return false;
    const norm = content.toLowerCase();
    return (
      norm.includes(`@${currentUser.name.toLowerCase()}`) ||
      norm.includes(`@${currentUser.name.split(' ')[0].toLowerCase()}`)
    );
  };

  return (
    <div
      className={
        variant === 'inline'
          ? 'relative h-full w-full bg-slate-950/95 flex flex-col border-l border-slate-900'
          : `fixed top-0 left-0 h-full w-85 bg-slate-950/95 border-r border-slate-900/80 backdrop-blur-lg transform transition-transform duration-300 z-40 shadow-2xl flex flex-col ${
              isOpen ? 'translate-x-0' : '-translate-x-full'
            }`
      }
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-900/80 flex items-center justify-between bg-slate-950">
        <div>
          <h2 className="text-white font-bold text-base tracking-tight">Meeting Chat</h2>
          <p className="text-slate-500 text-[10px] mt-0.5">Instant message call participants</p>
        </div>
        {variant !== 'inline' && (
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/40 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="text-center text-slate-500 py-12">
            <svg className="w-10 h-10 mx-auto text-slate-700 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-xs">No messages yet</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              const hasMention = isMessageMentioned(msg.content);
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                >
                  {/* Sender Name & Time */}
                  <div className="flex items-center gap-1.5 px-1">
                    <span className="text-[10px] font-bold text-slate-400">
                      {isMe ? 'You' : msg.senderName}
                    </span>
                    <span className="text-[9px] text-slate-600">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Private Label (if private) */}
                  {msg.isPrivate && (
                    <span className="text-[8px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 px-1.5 py-0.5 rounded-full">
                      {isMe ? `Private to ${msg.recipientName || 'Member'}` : 'Private to you'}
                    </span>
                  )}

                  {/* Bubble Container */}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 shadow-md ${
                      isMe
                        ? msg.isPrivate
                          ? 'bg-indigo-950/80 border border-indigo-500/40 rounded-tr-none text-indigo-100'
                          : 'bg-indigo-600 rounded-tr-none text-white'
                        : msg.isPrivate
                        ? 'bg-slate-900/90 border border-indigo-500/20 rounded-tl-none text-slate-100'
                        : hasMention
                        ? 'bg-amber-950/30 border border-amber-500/30 rounded-tl-none'
                        : 'bg-slate-900/80 border border-slate-800/40 rounded-tl-none'
                    }`}
                  >
                    {renderMessageContent(msg)}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Recipient Dropdown Selection */}
      <div className="px-4 py-2 border-t border-slate-900/80 bg-slate-950/90 flex items-center justify-between gap-3 shrink-0">
        <span className="text-xs text-slate-400 font-semibold">Send to:</span>
        <select
          value={activeRecipientId}
          onChange={(e) => handleRecipientChange(e.target.value)}
          className="bg-slate-900 text-slate-200 text-xs rounded-lg border border-slate-850 px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500 max-w-[70%]"
        >
          <option value="Everyone">Everyone (Public)</option>
          {participants.map((p) => (
            <option key={p.socketId} value={p.id || p.socketId}>
              {p.name} {p.role === 'Admin' ? '(Admin)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Footer Form */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-slate-900 bg-slate-950 shrink-0"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              activeRecipientId === 'Everyone'
                ? "Type a message..."
                : `Type private message...`
            }
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-850 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-600/10"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
