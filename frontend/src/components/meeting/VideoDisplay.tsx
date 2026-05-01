import { useEffect, useRef } from 'react';

interface VideoDisplayProps {
  stream: MediaStream | null;
  userName?: string;
  isLocal?: boolean;
  className?: string;
}

export function VideoDisplay({
  stream,
  userName = 'User',
  isLocal = false,
  className = '',
}: VideoDisplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={`relative bg-slate-900 rounded-lg overflow-hidden aspect-video flex items-center justify-center ${className}`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-cover"
      />
      {!stream && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center mb-3">
            <svg
              className="w-8 h-8 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <p className="text-white font-medium">{userName}</p>
          <p className="text-slate-400 text-sm">Camera off</p>
        </div>
      )}
      <div className="absolute bottom-3 left-3">
        <p className="text-white text-sm font-medium truncate bg-black/40 px-2 py-1 rounded">
          {userName}
        </p>
      </div>
    </div>
  );
}
