import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { apiService, type MeetingData } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { useAuthStore } from '../stores/authStore';
import { webrtcManager } from '../utils/webrtcManager';
import { VideoDisplay } from '../components/meeting/VideoDisplay';
import { AudioVideoControls } from '../components/meeting/AudioVideoControls';
import { ParticipantsList } from '../components/meeting/ParticipantsList';
import { MeetingChat } from '../components/meeting/MeetingChat';
import { VideoRoomSidebar } from './VideoRoomSidebar';
import { clearActiveMeeting, getMeetingElapsedSeconds, rememberActiveMeeting } from './videoRoomHelpers';
interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
}
interface Participant {
  id?: string;
  name: string;
  socketId: string;
  hasVideo: boolean;
  hasAudio: boolean;
  isHost?: boolean;
}
interface RemoteUser {
  socketId: string;
  userId: string;
  userName: string;
  stream?: MediaStream;
  isLocal?: boolean;
}
export default function VideoRoom() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const { socket, emit, on } = useSocket();
  const [meeting, setMeeting] = useState<MeetingData | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const isCompactMode = searchParams.get('compact') === '1';
  const remoteUsersRef = useRef<RemoteUser[]>([]);
  const streamInitializedRef = useRef(false);
  const syncMeetingAsOngoing = useCallback(async (currentMeetingId: string) => {
    try {
      const started = await apiService.startMeeting(currentMeetingId);
      if (started.data) {
        setMeeting(started.data);
      }
    } catch {
    }
  }, []);
  useEffect(() => {
    const fetchMeeting = async () => {
      if (!meetingId) return;
      try {
        const res = await apiService.getMeeting(meetingId);
        const fetchedMeeting = res.data || null;
        setMeeting(fetchedMeeting);
        setMeetingDuration(getMeetingElapsedSeconds(fetchedMeeting));
        if (fetchedMeeting && fetchedMeeting.status !== 'Ongoing') {
          void syncMeetingAsOngoing(meetingId);
        }
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch meeting');
        setLoading(false);
      }
    };
    fetchMeeting();
  }, [meetingId, syncMeetingAsOngoing]);
  useEffect(() => {
    if (meetingId) {
      rememberActiveMeeting(meetingId);
    }
  }, [meetingId]);
  useEffect(() => {
    if (!meeting) return;
    setMeetingDuration(getMeetingElapsedSeconds(meeting));
  }, [meeting]);
  const initializeLocalStream = useCallback(async () => {
    if (streamInitializedRef.current) return;
    streamInitializedRef.current = true;
    try {
      const stream = await webrtcManager.getLocalStream(true, true);
      setLocalStream(stream);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to access camera/microphone'
      );
      console.error('Stream initialization error:', err);
    }
  }, []);
  useEffect(() => {
    if (!socket || !meetingId || !meeting) return;
    webrtcManager.setSocket(socket);
    initializeLocalStream();
    const joinMeeting = () => {
      emit('meeting:join', { meetingId });
    };
    if (socket.connected) {
      joinMeeting();
    } else {
      socket.on('connect', joinMeeting);
    }
    return () => {
      socket.off('connect', joinMeeting);
    };
  }, [socket, meetingId, meeting, emit, initializeLocalStream]);
  useEffect(() => {
    if (!socket) return;
    const handleParticipants = (data: { participants: Participant[] }) => {
      setParticipants(
        data.participants.map((p) => ({
          ...p,
          hasVideo: true,
          hasAudio: true,
        }))
      );
      data.participants.forEach((participant) => {
        if (participant.socketId !== socket.id) {
          if (
            !remoteUsersRef.current.find(
              (u) => u.socketId === participant.socketId
            )
          ) {
            webrtcManager.createPeerConnection(participant.socketId, true);
          }
        }
      });
    };
    const unsubscribe = on('meeting:participants', handleParticipants);
    return unsubscribe;
  }, [socket, on]);
  useEffect(() => {
    if (!socket) return;
    const handleUserJoined = (data: {
      userId: string;
      userName: string;
      timestamp: string;
    }) => {
      console.log('User joined:', data);
    };
    const unsubscribe = on('meeting:user-joined', handleUserJoined);
    return unsubscribe;
  }, [socket, on]);
  useEffect(() => {
    if (!socket) return;
    const handleOffer = (data: {
      from: string;
      offer: RTCSessionDescriptionInit;
      userId: string;
      userName: string;
    }) => {
      console.log('Received offer from:', data.from);
      webrtcManager.handleOffer(data.from, data.offer);
      webrtcManager.updateRemoteUserInfo(data.from, data.userId, data.userName);
    };
    const unsubscribe = on('webrtc:offer', handleOffer);
    return unsubscribe;
  }, [socket, on]);
  useEffect(() => {
    if (!socket) return;
    const handleAnswer = (data: {
      from: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      console.log('Received answer from:', data.from);
      webrtcManager.handleAnswer(data.from, data.answer);
    };
    const unsubscribe = on('webrtc:answer', handleAnswer);
    return unsubscribe;
  }, [socket, on]);
  useEffect(() => {
    if (!socket) return;
    const handleIceCandidate = (data: {
      from: string;
      candidate: RTCIceCandidateInit;
    }) => {
      webrtcManager.handleIceCandidate(data.from, data.candidate);
    };
    const unsubscribe = on('webrtc:ice-candidate', handleIceCandidate);
    return unsubscribe;
  }, [socket, on]);
  useEffect(() => {
    const interval = setInterval(() => {
      const remoteStreams = webrtcManager.getRemoteStreams();
      const newRemoteUsers: RemoteUser[] = remoteStreams.map((rs) => ({
        socketId: rs.socketId,
        userId: rs.userId,
        userName: rs.userName,
        stream: rs.stream,
      }));
      if (
        JSON.stringify(newRemoteUsers) !==
        JSON.stringify(remoteUsersRef.current)
      ) {
        remoteUsersRef.current = newRemoteUsers;
        setRemoteUsers(newRemoteUsers);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!socket) return;
    const handleChatMessage = (data: {
      id: string;
      senderId: string;
      senderName: string;
      content: string;
      timestamp: string;
    }) => {
      setChatMessages((prev) => [...prev, data]);
    };
    const unsubscribe = on('chat:message', handleChatMessage);
    return unsubscribe;
  }, [socket, on]);
  useEffect(() => {
    if (!meeting) return;
    const interval = setInterval(() => {
      setMeetingDuration(getMeetingElapsedSeconds(meeting));
    }, 1000);
    return () => clearInterval(interval);
  }, [meeting]);
  const handleToggleMic = useCallback((enabled: boolean) => {
    webrtcManager.toggleAudio(enabled);
  }, []);
  const handleToggleCamera = useCallback((enabled: boolean) => {
    webrtcManager.toggleVideo(enabled);
  }, []);
  const handleToggleScreenShare = useCallback(async (sharing: boolean) => {
    try {
      if (sharing) {
        const nextStream = await webrtcManager.startScreenShare();
        const nextTrack = nextStream.getVideoTracks()[0];
        if (nextTrack) {
          nextTrack.onended = () => {
            void handleToggleScreenShare(false);
          };
        }
        setLocalStream(nextStream);
        setIsScreenSharing(true);
      } else {
        const nextStream = await webrtcManager.stopScreenShare();
        setLocalStream(nextStream);
        setIsScreenSharing(false);
      }
    } catch (err) {
      console.error('Screen share failed:', err);
      setError(err instanceof Error ? err.message : 'Screen share failed');
      setIsScreenSharing(false);
    }
  }, []);
  const handleSendMessage = useCallback(
    (content: string) => {
      if (!meetingId) return;
      emit('chat:message', { meetingId, content });
    },
    [meetingId, emit]
  );
  const handleLeaveMeeting = useCallback(async () => {
    try {
      if (meetingId) {
        emit('meeting:leave', { meetingId });
        await apiService.endMeeting(meetingId);
        clearActiveMeeting();
      }
      webrtcManager.stopLocalStream();
      webrtcManager.closeAllPeerConnections();
      navigate(`/transition?to=${encodeURIComponent('/workspace')}`);
    } catch (err) {
      console.error('Error leaving meeting:', err);
      clearActiveMeeting();
      navigate(`/transition?to=${encodeURIComponent('/workspace')}`);
    }
  }, [meetingId, emit, navigate]);
  const handleCompactEndMeeting = useCallback(async () => {
    try {
      if (meetingId) {
        emit('meeting:leave', { meetingId });
        await apiService.endMeeting(meetingId);
        clearActiveMeeting();
      }
      webrtcManager.stopLocalStream();
      webrtcManager.closeAllPeerConnections();
      window.close();
    } catch (err) {
      console.error('Error ending compact meeting:', err);
      window.close();
    }
  }, [meetingId, emit]);
  const handleWorkspaceNavigation = useCallback((destination: string) => {
    if (!meetingId) return;
    rememberActiveMeeting(meetingId);
    const popupUrl = `${window.location.origin}/dashboard/meetings/${meetingId}/video?compact=1`;
    const popup = window.open(
      popupUrl,
      'intellmeet-meeting-popout',
      'popup=yes,width=420,height=640,resizable=yes,scrollbars=no'
    );
    if (popup) {
      popup.focus();
      navigate(destination);
    } else {
      alert('Popup blocked. Please allow popups for IntellMeet and try again.');
    }
  }, [meetingId, navigate]);
  if (loading) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <svg
            className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-white font-medium">Starting meeting...</p>
        </div>
      </div>
    );
  }
  if (error || !meeting) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-white font-bold text-lg mb-2">Meeting not found</h2>
          <p className="text-slate-400 mb-6">{error || 'The meeting does not exist'}</p>
          <button
            onClick={() => navigate('/meetings')}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
          >
            Go back to meetings
          </button>
        </div>
      </div>
    );
  }
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  if (isCompactMode) {
    return (
      <div className="h-screen bg-black text-white flex flex-col">
        <header className="border-b border-slate-700 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold">{meeting.title}</h1>
              <p className="text-xs text-slate-400">{formatDuration(meetingDuration)}</p>
            </div>
            <button
              type="button"
              onClick={() => { void handleCompactEndMeeting(); }}
              className="shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-500/20 hover:text-red-200"
            >
              End
            </button>
          </div>
        </header>
        <main className="flex-1 min-h-0 p-3 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 flex-1 min-h-0">
            {remoteUsers[0] ? (
              <div className="rounded-xl overflow-hidden min-h-40">
                <VideoDisplay
                  stream={remoteUsers[0].stream || null}
                  userName={remoteUsers[0].userName}
                  className="h-full"
                />
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden min-h-40">
                <VideoDisplay
                  stream={localStream}
                  userName={user?.name || 'You'}
                  isLocal
                  className="h-full"
                />
              </div>
            )}
          </div>
          {showChat && (
            <div className="h-64 rounded-xl overflow-hidden border border-slate-700">
              <MeetingChat
                messages={chatMessages}
                isOpen={showChat}
                onClose={() => setShowChat(false)}
                onSendMessage={handleSendMessage}
                currentUserId={user?.id}
                variant="inline"
              />
            </div>
          )}
        </main>
        <footer className="border-t border-slate-700 px-4 py-3">
          <AudioVideoControls
            onToggleMic={handleToggleMic}
            onToggleCamera={handleToggleCamera}
            onToggleScreenShare={handleToggleScreenShare}
            onLeave={() => { void handleCompactEndMeeting(); }}
            onToggleChat={() => setShowChat(!showChat)}
            isScreenSharing={isScreenSharing}
            showChat={showChat}
            showLeave
          />
        </footer>
      </div>
    );
  }
  return (
    <div className="w-full h-screen bg-black flex">
      <VideoRoomSidebar onNavigate={handleWorkspaceNavigation} />
      <div className="min-w-0 flex-1 flex flex-col">
      <div className="bg-black border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-lg">{meeting.title}</h1>
          <p className="text-slate-400 text-xs">
            Code: <span className="font-mono">{meeting.meetingId}</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {formatDuration(meetingDuration)}
          </div>
          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {participants.length + 1}
          </div>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden gap-4 p-4">
        <div className="flex-1 flex flex-col gap-4 overflow-auto">
          {(() => {
            const totalUsers = remoteUsers.length + 1; // +1 for local user
            const getCols = () => {
              if (totalUsers <= 2) return 2;
              if (totalUsers <= 4) return 2;
              if (totalUsers <= 6) return 3;
              return 4;
            };
            const allUsers = [
              { 
                socketId: 'local', 
                userName: user?.name || 'You', 
                stream: localStream, 
                isLocal: true 
              },
              ...remoteUsers,
            ];
            const cols = getCols();
            const gridClass = {
              2: 'grid-cols-2',
              3: 'grid-cols-3',
              4: 'grid-cols-4',
            }[cols] || 'grid-cols-2';
            return (
              <div className={`grid ${gridClass} gap-3 h-full auto-rows-fr`}>
                {allUsers.map((user) => (
                  <div key={user.socketId} className="rounded-lg overflow-hidden">
                    <VideoDisplay
                      stream={user.stream || null}
                      userName={user.userName}
                      isLocal={user.isLocal}
                      className="h-full"
                    />
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
        {showChat && (
          <MeetingChat
            messages={chatMessages}
            isOpen={showChat}
            onClose={() => setShowChat(false)}
            onSendMessage={handleSendMessage}
            currentUserId={user?.id}
          />
        )}
        {showParticipants && (
          <ParticipantsList
            participants={participants}
            isOpen={showParticipants}
            onClose={() => setShowParticipants(false)}
          />
        )}
      </div>
      <div className="bg-black border-t border-slate-800 px-6 py-4 flex items-center justify-center">
        <AudioVideoControls
          onToggleMic={handleToggleMic}
          onToggleCamera={handleToggleCamera}
          onToggleScreenShare={handleToggleScreenShare}
          onLeave={handleLeaveMeeting}
          onToggleChat={() => setShowChat(!showChat)}
          onToggleParticipants={() => setShowParticipants(!showParticipants)}
          isScreenSharing={isScreenSharing}
          showChat={showChat}
          showParticipants={showParticipants}
        />
      </div>
      </div>
    </div>
  );
}
