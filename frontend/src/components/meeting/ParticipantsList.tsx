import { useEffect, useState } from 'react';

interface Participant {
  id?: string;
  name: string;
  socketId: string;
  hasVideo: boolean;
  hasAudio: boolean;
  isHost?: boolean;
  role?: 'Admin' | 'Member';
}

interface ParticipantsListProps {
  participants: Participant[];
  isOpen: boolean;
  onClose: () => void;
  localUser?: { id: string; name: string; role?: 'Admin' | 'Member'; socketId?: string } | null;
  localMicEnabled?: boolean;
  localCameraEnabled?: boolean;
  isAdminOrHost?: boolean;
  onControlDevice?: (userId: string, type: 'audio' | 'video', enabled: boolean) => void;
  onKickUser?: (userId: string) => void;
  onSelectParticipantChat?: (userId: string) => void;
}

export function ParticipantsList({
  participants,
  isOpen,
  onClose,
  localUser,
  localMicEnabled = true,
  localCameraEnabled = true,
  isAdminOrHost = false,
  onControlDevice,
  onKickUser,
  onSelectParticipantChat,
}: ParticipantsListProps) {
  const [activeMenuSocketId, setActiveMenuSocketId] = useState<string | null>(null);

  // Prevent body scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const remoteParticipants = participants.filter(
    (p) => p.socketId !== localUser?.socketId && (localUser?.id ? p.id !== localUser.id : true)
  );

  return (
    <div
      className={`fixed top-0 right-0 h-full w-85 bg-slate-950/95 border-l border-slate-900/80 backdrop-blur-lg transform transition-transform duration-300 ease-out z-50 shadow-2xl flex flex-col ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-900/80 flex items-center justify-between bg-slate-950">
        <div>
          <h2 className="text-white font-bold text-base tracking-tight">Participants</h2>
          <p className="text-slate-500 text-[10px] mt-0.5">
            {remoteParticipants.length + (localUser ? 1 : 0)} in call
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors"
          aria-label="Close participants list"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/40">
        
        {/* 1. Local User ("You") */}
        {localUser && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              {/* Avatar Icon */}
              <div className="flex-shrink-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                  <span className="text-xs font-bold text-indigo-300">You</span>
                </div>
              </div>
              
              {/* Details */}
              <div className="min-w-0">
                <p className="text-slate-100 font-semibold text-xs truncate">
                  {localUser.name} (You)
                </p>
                <div className="flex gap-1.5 mt-0.5 flex-wrap">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-500/20 whitespace-nowrap">
                    Host
                  </span>
                  {localUser.role && (
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold whitespace-nowrap ${
                      localUser.role === 'Admin'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                    }`}>
                      {localUser.role}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Local Status Indicators */}
            <div className="flex items-center gap-2">
              {/* Mic Icon */}
              <span className={`p-1 rounded-md ${localMicEnabled ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                {localMicEnabled ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" />
                  </svg>
                )}
              </span>

              {/* Cam Icon */}
              <span className={`p-1 rounded-md ${localCameraEnabled ? 'text-indigo-400 bg-indigo-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                {localCameraEnabled ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" />
                  </svg>
                )}
              </span>
            </div>
          </div>
        )}

        {/* 2. Remote Participants */}
        {remoteParticipants.length === 0 ? (
          <div className="text-center p-8 bg-slate-900/30 border border-slate-900/30 rounded-2xl py-12 animate-in fade-in duration-200">
            <svg className="w-10 h-10 mx-auto text-slate-700 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="text-slate-500 text-xs font-medium">No other participants in call</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {remoteParticipants.map((participant) => (
              <div
                key={participant.socketId}
                className="flex flex-col p-3 rounded-xl bg-slate-900/60 border border-slate-900/40 hover:bg-slate-900/80 transition-all shadow-sm"
              >
                {/* Main Row Info */}
                <div className="flex items-center justify-between">
                  <div
                    onClick={() => setActiveMenuSocketId(activeMenuSocketId === participant.socketId ? null : participant.socketId)}
                    className="flex items-center gap-3 min-w-0 cursor-pointer select-none"
                  >
                    {/* Avatar Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center">
                        <span className="text-xs font-bold text-slate-300">
                          {participant.name.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    {/* Details */}
                    <div className="min-w-0">
                      <p className="text-slate-100 font-semibold text-xs truncate hover:text-indigo-400 transition-colors">
                        {participant.name}
                      </p>
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {participant.isHost && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 whitespace-nowrap">
                            Host
                          </span>
                        )}
                        {participant.role && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold whitespace-nowrap ${
                            participant.role === 'Admin'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                          }`}>
                            {participant.role}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Indicators & Options Toggle */}
                  <div className="flex items-center gap-1.5">
                    {/* Mic Status */}
                    <span className={`p-1 rounded-md ${participant.hasAudio ? 'text-emerald-400 bg-emerald-500/5' : 'text-rose-500 bg-rose-500/5'}`}>
                      {participant.hasAudio ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      )}
                    </span>

                    {/* Cam Status */}
                    <span className={`p-1 rounded-md ${participant.hasVideo ? 'text-indigo-400 bg-indigo-500/5' : 'text-rose-500 bg-rose-500/5'}`}>
                      {participant.hasVideo ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      )}
                    </span>

                    {/* Options Toggle */}
                    <button
                      onClick={() => setActiveMenuSocketId(activeMenuSocketId === participant.socketId ? null : participant.socketId)}
                      className={`p-1 rounded-md hover:bg-slate-800 transition-colors ${activeMenuSocketId === participant.socketId ? 'text-indigo-400' : 'text-slate-400'}`}
                      title="Participant options"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Dropdown Options Context Menu */}
                {activeMenuSocketId === participant.socketId && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/40 flex flex-col gap-2 animate-in slide-in-from-top-1 duration-200">
                    {/* Chat Button */}
                    <button
                      onClick={() => {
                        onSelectParticipantChat?.(participant.id || participant.socketId);
                        setActiveMenuSocketId(null);
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950/70 hover:bg-indigo-600 hover:text-white text-left text-xs text-slate-200 transition-all flex items-center gap-2 border border-slate-850/50"
                    >
                      <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Chat Privately
                    </button>

                    {/* Admin Actions (Mute, Camera Off, Kick) - ONLY shown on Members, NOT Admins/Hosts */}
                    {isAdminOrHost && participant.role !== 'Admin' && !participant.isHost && (
                      <div className="flex gap-2 w-full mt-0.5">
                        <button
                          onClick={() => {
                            onControlDevice?.(participant.id || participant.socketId, 'audio', false);
                            setActiveMenuSocketId(null);
                          }}
                          className="flex-1 px-2 py-2 rounded-lg bg-slate-950/70 hover:bg-slate-800 text-[10px] text-slate-300 font-semibold transition-colors flex items-center justify-center gap-1.5 border border-slate-850/50"
                          title="Mute participant microphone"
                        >
                          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                          Mute
                        </button>
                        <button
                          onClick={() => {
                            onControlDevice?.(participant.id || participant.socketId, 'video', false);
                            setActiveMenuSocketId(null);
                          }}
                          className="flex-1 px-2 py-2 rounded-lg bg-slate-950/70 hover:bg-slate-800 text-[10px] text-slate-300 font-semibold transition-colors flex items-center justify-center gap-1.5 border border-slate-850/50"
                          title="Stop participant camera"
                        >
                          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Stop Cam
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${participant.name} from meeting?`)) {
                              onKickUser?.(participant.id || participant.socketId);
                            }
                            setActiveMenuSocketId(null);
                          }}
                          className="flex-1 px-2 py-2 rounded-lg bg-red-950/30 hover:bg-red-900/40 text-[10px] text-red-400 font-bold transition-colors flex items-center justify-center gap-1.5 border border-red-900/20"
                          title="Remove participant from call"
                        >
                          <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                          </svg>
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
