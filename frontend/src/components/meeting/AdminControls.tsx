import { useState, useEffect } from 'react';

interface Participant {
  id?: string;
  name: string;
  socketId: string;
  hasVideo: boolean;
  hasAudio: boolean;
  isHost?: boolean;
  role?: 'Admin' | 'Member';
}

interface AdminControlsProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
  permissions: {
    audio: boolean;
    video: boolean;
    screen: boolean;
  };
  onTogglePermission: (type: 'audio' | 'video' | 'screen', value: boolean) => void;
  onControlDevice: (userId: string, type: 'audio' | 'video', enabled: boolean) => void;
  onKickUser: (userId: string) => void;
}

export function AdminControls({
  isOpen,
  onClose,
  participants,
  permissions,
  onTogglePermission,
  onControlDevice,
  onKickUser,
}: AdminControlsProps) {
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('');

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

  // Reset selection if selected participant leaves
  useEffect(() => {
    if (selectedParticipantId && !participants.some(p => (p.id || p.socketId) === selectedParticipantId)) {
      setSelectedParticipantId('');
    }
  }, [participants, selectedParticipantId]);

  const selectedParticipant = participants.find(p => (p.id || p.socketId) === selectedParticipantId);

  return (
    <div
      className={`fixed top-0 right-0 h-full w-85 bg-slate-950/95 border-l border-slate-800/80 backdrop-blur-lg transform transition-transform duration-300 ease-out z-50 shadow-2xl flex flex-col ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg tracking-tight">Admin Control Center</h2>
          <p className="text-slate-400 text-xs mt-0.5">Manage room permissions and members</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          aria-label="Close admin controls"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Global Permissions Section */}
        <section className="space-y-4">
          <h3 className="text-slate-300 font-semibold text-sm uppercase tracking-wider">Global Room Permissions</h3>
          
          <div className="space-y-3 bg-slate-900/50 rounded-xl p-4 border border-slate-800/40">
            {/* Mic Permission */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">Allow Microphone</p>
                <p className="text-slate-500 text-xs">Let members unmute themselves</p>
              </div>
              <button
                onClick={() => onTogglePermission('audio', !permissions.audio)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  permissions.audio ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    permissions.audio ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Video Permission */}
            <div className="flex items-center justify-between border-t border-slate-800/60 pt-3">
              <div>
                <p className="text-white text-sm font-medium">Allow Camera</p>
                <p className="text-slate-500 text-xs">Let members share their video</p>
              </div>
              <button
                onClick={() => onTogglePermission('video', !permissions.video)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  permissions.video ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    permissions.video ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Screen Share Permission */}
            <div className="flex items-center justify-between border-t border-slate-800/60 pt-3">
              <div>
                <p className="text-white text-sm font-medium">Allow Screen Sharing</p>
                <p className="text-slate-500 text-xs">Let members present their screen</p>
              </div>
              <button
                onClick={() => onTogglePermission('screen', !permissions.screen)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  permissions.screen ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    permissions.screen ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Member Control Section */}
        <section className="space-y-4">
          <h3 className="text-slate-300 font-semibold text-sm uppercase tracking-wider">Participant Operations</h3>
          
          {participants.length === 0 ? (
            <div className="text-center p-4 bg-slate-900/30 border border-slate-800/40 rounded-xl py-6">
              <p className="text-slate-400 text-sm">No other participants in meeting</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Dropdown Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Select a Participant
                </label>
                <select
                  value={selectedParticipantId}
                  onChange={(e) => setSelectedParticipantId(e.target.value)}
                  className="w-full bg-slate-900 text-slate-200 text-sm rounded-xl border border-slate-800 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                >
                  <option value="">Choose a member...</option>
                  {participants
                    .filter((p) => p.role !== 'Admin' && !p.isHost)
                    .map((p) => (
                      <option key={p.socketId} value={p.id || p.socketId}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Operations UI */}
              {selectedParticipant ? (
                <div className="flex flex-col gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800/40 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate text-sm">{selectedParticipant.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Role: <span className="text-slate-400 font-semibold">{selectedParticipant.role || 'Member'}</span>
                      </p>
                    </div>
                    {selectedParticipant.isHost && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/20">
                        Host
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 border-t border-slate-800/60 pt-3 mt-1">
                    {/* Remote Mute Mic */}
                    <button
                      onClick={() => onControlDevice(selectedParticipant.id || selectedParticipant.socketId, 'audio', false)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1.5 border border-slate-700/50"
                      title="Mute participant microphone"
                    >
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      Mute Mic
                    </button>

                    {/* Remote Disable Video */}
                    <button
                      onClick={() => onControlDevice(selectedParticipant.id || selectedParticipant.socketId, 'video', false)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1.5 border border-slate-700/50"
                      title="Stop participant camera"
                    >
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Stop Cam
                    </button>

                    {/* Kick */}
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to remove ${selectedParticipant.name} from this meeting?`)) {
                          onKickUser(selectedParticipant.id || selectedParticipant.socketId);
                        }
                      }}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-xs text-red-400 hover:text-red-300 transition-colors flex items-center justify-center gap-1.5 border border-red-900/30"
                      title="Remove participant from call"
                    >
                      <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                      </svg>
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 bg-slate-900/30 border border-slate-800/40 rounded-xl">
                  <p className="text-slate-500 text-xs font-medium">Select a participant to perform operations</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
