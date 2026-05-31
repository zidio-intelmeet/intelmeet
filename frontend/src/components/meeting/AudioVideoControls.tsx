import { useState } from 'react';

interface AudioVideoControlsProps {
  onToggleMic: (enabled: boolean) => void;
  onToggleCamera: (enabled: boolean) => void;
  onToggleScreenShare?: (sharing: boolean) => void;
  onLeave: () => void;
  onToggleChat?: (open: boolean) => void;
  onToggleParticipants?: (open: boolean) => void;
  onToggleAdmin?: () => void;
  onToggleAI?: () => void;
  onShareLink?: () => void;
  showChat?: boolean;
  showParticipants?: boolean;
  showAdmin?: boolean;
  showAI?: boolean;
  isScreenSharing?: boolean;
  showLeave?: boolean;
  className?: string;
  micEnabled?: boolean;
  cameraEnabled?: boolean;
}

export function AudioVideoControls({
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onLeave,
  onToggleChat,
  onToggleParticipants,
  onToggleAdmin,
  onToggleAI,
  onShareLink,
  showChat = false,
  showParticipants = false,
  showAdmin = false,
  showAI = false,
  isScreenSharing = false,
  showLeave = true,
  className = '',
  micEnabled,
  cameraEnabled,
}: AudioVideoControlsProps) {
  const [localMicEnabled, setLocalMicEnabled] = useState(true);
  const [localCameraEnabled, setLocalCameraEnabled] = useState(true);

  const activeMic = micEnabled !== undefined ? micEnabled : localMicEnabled;
  const activeCamera = cameraEnabled !== undefined ? cameraEnabled : localCameraEnabled;

  const handleToggleMic = () => {
    const newState = !activeMic;
    setLocalMicEnabled(newState);
    onToggleMic(newState);
  };

  const handleToggleCamera = () => {
    const newState = !activeCamera;
    setLocalCameraEnabled(newState);
    onToggleCamera(newState);
  };

  const handleToggleChat = () => {
    onToggleChat?.(!showChat);
  };

  const handleToggleParticipants = () => {
    onToggleParticipants?.(!showParticipants);
  };

  const handleToggleScreenShare = () => {
    onToggleScreenShare?.(!isScreenSharing);
  };

  return (
    <div
      className={`flex items-center justify-center gap-3 bg-slate-900/80 backdrop-blur-md rounded-full p-4 ${className}`}
    >
      {/* Microphone */}
      <button
        onClick={handleToggleMic}
        className={`relative p-3 rounded-full transition-all ${
          activeMic
            ? 'bg-slate-700 hover:bg-slate-600 text-white'
            : 'bg-red-600 hover:bg-red-700 text-white'
        }`}
        title={activeMic ? 'Mute microphone' : 'Unmute microphone'}
      >
        {activeMic ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3s-3 1.34-3 3v6c0 1.66 1.34 3 3 3zm0-8c.55 0 1 .45 1 1v4c0 .55-.45 1-1 1s-1-.45-1-1V7c0-.55.45-1 1-1z" />
            <path d="M18 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H6c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3s-3 1.34-3 3v.48L5.84 4.5C5.02 4.13 4 4.97 4 6.27l5.02 5.02c.14.01.27.05.41.05 1.66 0 3-1.34 3-3zm5.5-.5l1.58 1.58c.75-1.23 1.21-2.63 1.21-4.08 0-2.76-2.24-5-5-5-.99 0-1.93.3-2.74.82l1.46 1.46c.64-.12 1.33.03 1.88.5.79.7 1.25 1.71 1.25 2.78h2z" />
            <path d="M12 4L9.91 6.09C9.97 6.4 10 6.74 10 7.09V11c0 1.66 1.34 3 3 3 .35 0 .69-.03 1-09-.09l2.09 2.09c.33-.53.64-1.05.89-1.6l-4.5-4.5z" />
            <line
              x1="3"
              y1="3"
              x2="21"
              y2="21"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>

      {/* Camera */}
      <button
        onClick={handleToggleCamera}
        className={`relative p-3 rounded-full transition-all ${
          activeCamera
            ? 'bg-slate-700 hover:bg-slate-600 text-white'
            : 'bg-red-600 hover:bg-red-700 text-white'
        }`}
        title={activeCamera ? 'Turn off camera' : 'Turn on camera'}
      >
        {activeCamera ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17 10.5V7c0 .55-.45 1-1 1H4c-.55 0-1-.45-1-1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17 10.5V7c0 .55-.45 1-1 1H4c-.55 0-1-.45-1-1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
            <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {onToggleScreenShare && (
        <button
          onClick={handleToggleScreenShare}
          className={`relative p-3 rounded-full transition-all ${
            isScreenSharing
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-white'
          }`}
          title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 5.75A2.75 2.75 0 015.75 3h12.5A2.75 2.75 0 0121 5.75v8.5A2.75 2.75 0 0118.25 17H13.5v1.5h2.25a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h2.25V17H5.75A2.75 2.75 0 013 14.25v-8.5zm2.75-1.25a1.25 1.25 0 00-1.25 1.25v8.5c0 .69.56 1.25 1.25 1.25h12.5c.69 0 1.25-.56 1.25-1.25v-8.5c0-.69-.56-1.25-1.25-1.25H5.75z" />
          </svg>
        </button>
      )}

      {onShareLink && (
        <button
          onClick={onShareLink}
          className="relative p-3 rounded-full bg-slate-700 hover:bg-slate-600 text-white transition-all animate-in zoom-in duration-200"
          title="Share meeting invitation link"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.748a3.001 3.001 0 110 2.504m0-2.504a3.001 3.001 0 100 2.504m0-2.504L15.316 7.24m0 9.52L8.684 13.26M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      )}

      {/* Divider */}
      <div className="w-px h-6 bg-slate-600" />

      {/* Participants (if provided) */}
      {onToggleParticipants && (
        <button
          onClick={handleToggleParticipants}
          className={`relative p-3 rounded-full transition-all ${
            showParticipants
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-white'
          }`}
          title="Show participants"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
        </button>
      )}

      {/* Chat (if provided) */}
      {onToggleChat && (
        <button
          onClick={handleToggleChat}
          className={`relative p-3 rounded-full transition-all ${
            showChat
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-white'
          }`}
          title="Open chat"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
        </button>
      )}

      {/* AI Panel (if provided) */}
      {onToggleAI && (
        <button
          onClick={onToggleAI}
          className={`relative p-3 rounded-full transition-all ${
            showAI
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-white'
          }`}
          title="Open AI Meeting Assistant"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364.364l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </button>
      )}

      {/* Admin Panel (if provided) */}
      {onToggleAdmin && (
        <button
          onClick={onToggleAdmin}
          className={`relative p-3 rounded-full transition-all ${
            showAdmin
              ? 'bg-rose-600 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-white'
          }`}
          title="Open admin controls"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </button>
      )}

      {showLeave && (
        <>
          {/* Divider */}
          <div className="w-px h-6 bg-slate-600" />

          {/* Leave */}
          <button
            onClick={onLeave}
            className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all"
            title="Leave meeting"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 10.5V7c0 .55-.45 1-1 1H4c-.55 0-1-.45-1-1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
              <path d="M19 13h2v4h-2z" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
