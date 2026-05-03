interface Participant {
  id?: string;
  name: string;
  socketId: string;
  hasVideo: boolean;
  hasAudio: boolean;
  isHost?: boolean;
}

interface ParticipantsListProps {
  participants: Participant[];
  isOpen: boolean;
  onClose: () => void;
}

export function ParticipantsList({
  participants,
  isOpen,
  onClose,
}: ParticipantsListProps) {
  return (
    <div
      className={`fixed top-0 right-0 h-full w-80 bg-slate-800 border-l border-slate-700 transform transition-transform duration-300 z-40 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold">Participants</h2>
          <p className="text-slate-400 text-sm">{participants.length} in call</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="overflow-y-auto h-[calc(100%-60px)]">
        {participants.length === 0 ? (
          <div className="p-4 text-center text-slate-400 py-8">
            <p className="text-sm">No other participants</p>
          </div>
        ) : (
          <div className="space-y-2 p-3">
            {participants.map((participant) => (
              <div
                key={participant.socketId}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium truncate">
                      {participant.name}
                    </p>
                    {participant.isHost && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-600/30 text-indigo-300 whitespace-nowrap">
                        Host
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-1">
                    {!participant.hasAudio && (
                      <div className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19.89 11a8 8 0 0 0-7.89-7.89m0 15.78A8 8 0 0 1 4.11 11" />
                          <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        Muted
                      </div>
                    )}
                    {!participant.hasVideo && (
                      <div className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17 10.5V7c0 .55-.45 1-1 1H4c-.55 0-1-.45-1-1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                        </svg>
                        Camera off
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0 flex gap-1">
                  {participant.hasAudio && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Audio enabled" />
                  )}
                  {participant.hasVideo && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" title="Video enabled" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
