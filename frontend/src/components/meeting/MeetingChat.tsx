import { useState, useEffect, useRef, FormEvent } from 'react';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
}

interface MeetingChatProps {
  messages: ChatMessage[];
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (content: string) => void;
  currentUserId?: string;
}

export function MeetingChat({
  messages,
  isOpen,
  onClose,
  onSendMessage,
  currentUserId,
}: MeetingChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div
      className={`fixed top-0 left-0 h-full w-80 bg-slate-800 border-r border-slate-700 transform transition-transform duration-300 z-40 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-white font-semibold">Chat</h2>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="h-[calc(100%-140px)] overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 py-6">
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${
                  msg.senderId === currentUserId ? 'flex-row-reverse' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                  {msg.senderName.charAt(0).toUpperCase()}
                </div>
                <div
                  className={`flex-1 ${
                    msg.senderId === currentUserId ? 'text-right' : ''
                  }`}
                >
                  <div className="flex gap-1 mb-1 items-baseline">
                    <p className="text-white text-sm font-medium">
                      {msg.senderName}
                    </p>
                    <p className="text-slate-400 text-xs">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div
                    className={`inline-block px-3 py-1.5 rounded-lg text-sm ${
                      msg.senderId === currentUserId
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700 text-slate-100'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-700 bg-slate-800"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type message..."
            className="flex-1 px-3 py-2 rounded-lg bg-slate-700 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
