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
import { AdminControls } from '../components/meeting/AdminControls';
import { ShareMeetingModal } from '../components/meeting/ShareMeetingModal';
import { AISummaryPanel } from '../components/meeting/AISummaryPanel';
import { useMeetingStore } from '../stores/meetingStore';
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
  role?: 'Admin' | 'Member';
  isAudioOn?: boolean;
  isVideoOn?: boolean;
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
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const meetingStartTimeRef = useRef<Date>(new Date());
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [showAdminControls, setShowAdminControls] = useState(false);
  const [roomPermissions, setRoomPermissions] = useState({
    audio: true,
    video: true,
    screen: true,
  });
  const [showShareModal, setShowShareModal] = useState(false);
  const [showLeaveOptions, setShowLeaveOptions] = useState(false);
  const [chatRecipientId, setChatRecipientId] = useState('Everyone');
  const isCompactMode = searchParams.get('compact') === '1';
  const calculatedParticipants = participants.map((p) => {
    const isTargetAdmin = p.role === 'Admin' || p.isHost;
    return {
      ...p,
      hasAudio: isTargetAdmin ? p.isAudioOn !== false : (roomPermissions.audio && p.isAudioOn !== false),
      hasVideo: isTargetAdmin ? p.isVideoOn !== false : (roomPermissions.video && p.isVideoOn !== false),
    };
  });
  const isAdminOrHost = !!(user?.role === 'Admin' || (meeting && (typeof meeting.host === 'string' ? meeting.host === user?.id : meeting.host._id === user?.id)));
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
        if (fetchedMeeting) {
          if (fetchedMeeting.summary) {
            useMeetingStore.getState().setSummary(fetchedMeeting.summary);
          } else {
            useMeetingStore.getState().setSummary("");
          }
          if (fetchedMeeting.actionItems) {
            useMeetingStore.getState().setActionItems(fetchedMeeting.actionItems);
          } else {
            useMeetingStore.getState().setActionItems([]);
          }
          if (fetchedMeeting.transcript) {
            useMeetingStore.getState().setTranscript(fetchedMeeting.transcript);
          } else {
            useMeetingStore.getState().setTranscript("");
          }
          
          if (fetchedMeeting.status === 'Completed') {
            navigate(`/dashboard/meetings/${meetingId}/review`, { replace: true });
            return;
          }
          
          if (fetchedMeeting.status !== 'Ongoing') {
            void syncMeetingAsOngoing(meetingId);
          }
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
      meetingStartTimeRef.current = new Date();
      
      // Start client-side recording
      try {
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9'
            : 'video/webm'
        });
        recordedChunksRef.current = [];
        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };
        mediaRecorder.start(1000); // Collect data every second
        mediaRecorderRef.current = mediaRecorder;
      } catch (recErr) {
        console.warn('MediaRecorder not available:', recErr);
      }
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
    if (meeting) {
      initializeLocalStream();
    }
  }, [meeting, initializeLocalStream]);

  useEffect(() => {
    if (!socket || !meetingId || !meeting || !localStream) return;
    webrtcManager.setSocket(socket);
    const joinMeeting = () => {
      emit('meeting:join', { meetingId, user });
    };
    socket.on('connect', joinMeeting);
    if (socket.connected) {
      joinMeeting();
    }
    return () => {
      socket.off('connect', joinMeeting);
    };
  }, [socket, meetingId, meeting, emit, localStream, user]);
  useEffect(() => {
    if (!socket) return;
    const handleParticipants = (data: { participants: Participant[] }) => {
      setParticipants(data.participants);
      data.participants.forEach((participant) => {
        if (participant.socketId !== socket.id) {
          const isInitiator = socket.id ? socket.id < participant.socketId : false;
          if (
            !remoteUsersRef.current.find(
              (u) => u.socketId === participant.socketId
            )
          ) {
            webrtcManager.createPeerConnection(participant.socketId, isInitiator, user?.id, user?.name);
          }
        }
      });
    };

    const unsubscribe = on('participants:list', handleParticipants);
    return unsubscribe;
  }, [socket, on, user?.id, user?.name]);

  useEffect(() => {
    if (!socket) return;
    const handleParticipantLeft = (data: { userId: string; participants: Participant[] }) => {
      const leavingParticipant = participants.find(p => p.id === data.userId)
        || remoteUsersRef.current.find(u => u.userId === data.userId);
      if (leavingParticipant) {
        webrtcManager.closePeerConnection(leavingParticipant.socketId);
      }
      setParticipants(data.participants);
    };
    const unsubscribe = on('participant:left', handleParticipantLeft);
    return unsubscribe;
  }, [socket, on, participants]);
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
      userId?: string;
      userName?: string;
    }) => {
      console.log('Received offer from:', data.from);
      webrtcManager.handleOffer(data.from, data.offer, user?.id, user?.name);
      if (data.userId && data.userName) {
        webrtcManager.updateRemoteUserInfo(data.from, data.userId, data.userName);
      }
    };
    const unsubscribe = on('webrtc:offer', handleOffer);
    return unsubscribe;
  }, [socket, on, user?.id, user?.name]);

  useEffect(() => {
    if (!socket) return;
    const handleAnswer = (data: {
      from: string;
      answer: RTCSessionDescriptionInit;
      userId?: string;
      userName?: string;
    }) => {
      console.log('Received answer from:', data.from);
      webrtcManager.handleAnswer(data.from, data.answer);
      if (data.userId && data.userName) {
        webrtcManager.updateRemoteUserInfo(data.from, data.userId, data.userName);
      }
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
    const updateStreams = (streams: any[]) => {
      const newRemoteUsers: RemoteUser[] = streams.map((rs) => {
        const match = participants.find((p) => p.socketId === rs.socketId);
        return {
          socketId: rs.socketId,
          userId: match?.id || rs.userId || rs.socketId,
          userName: match?.name || rs.userName || 'User',
          stream: rs.stream,
        };
      });
      setRemoteUsers(newRemoteUsers);
      remoteUsersRef.current = newRemoteUsers;
    };

    webrtcManager.onRemoteStreamsChange = updateStreams;
    updateStreams(webrtcManager.getRemoteStreams());

    return () => {
      webrtcManager.onRemoteStreamsChange = undefined;
    };
  }, [participants]);
  useEffect(() => {
    if (!socket) return;
    const handleChatMessage = (data: {
      userId: string;
      userName?: string;
      message: string;
      timestamp: string;
      isPrivate?: boolean;
      recipientId?: string;
      recipientName?: string;
    }) => {
      setChatMessages((prev) => [...prev, {
        id: data.timestamp,
        senderId: data.userId,
        senderName: data.userId === user?.id ? "You" : (data.userName || "Participant"),
        content: data.message,
        timestamp: data.timestamp,
        isPrivate: data.isPrivate,
        recipientId: data.recipientId,
        recipientName: data.recipientName
      }]);
    };
    const unsubscribe = on('chat:message', handleChatMessage);
    return unsubscribe;
  }, [socket, on, user?.id]);
  useEffect(() => {
    if (!meeting) return;
    const interval = setInterval(() => {
      setMeetingDuration(getMeetingElapsedSeconds(meeting));
    }, 1000);
    return () => clearInterval(interval);
  }, [meeting]);
  const handleToggleMic = useCallback((enabled: boolean) => {
    setMicEnabled(enabled);
    webrtcManager.toggleAudio(enabled);
    if (meetingId) {
      emit('meeting:toggle-media', { meetingId, type: 'audio', enabled });
    }
  }, [meetingId, emit]);
  const handleToggleCamera = useCallback((enabled: boolean) => {
    setCameraEnabled(enabled);
    webrtcManager.toggleVideo(enabled);
    if (meetingId) {
      emit('meeting:toggle-media', { meetingId, type: 'video', enabled });
    }
  }, [meetingId, emit]);
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
    (content: string, recipientId?: string) => {
      if (!meetingId) return;
      emit('chat:message', { meetingId, message: content, recipientId });
    },
    [meetingId, emit]
  );
  const buildTimestampedTranscript = useCallback(() => {
    if (chatMessages.length === 0) return "No voice or chat activity detected.";
    return chatMessages.map(msg => {
      const msgDate = new Date(msg.timestamp);
      const elapsed = Math.max(0, Math.floor((msgDate.getTime() - meetingStartTimeRef.current.getTime()) / 1000));
      const hours = String(Math.floor(elapsed / 3600)).padStart(2, '0');
      const mins = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
      const secs = String(elapsed % 60).padStart(2, '0');
      return `[${hours}:${mins}:${secs}] ${msg.senderName}: ${msg.content}`;
    }).join('\n');
  }, [chatMessages]);
  const refreshAISummary = useCallback(async () => {
    if (!meetingId) return;
    try {
      const transcriptText = buildTimestampedTranscript();
      useMeetingStore.getState().setTranscript(transcriptText);
      await apiService.submitTranscript(meetingId, transcriptText);
      
      const summaryRes = await apiService.generateSummary(meetingId);
      if (summaryRes.data?.summary) {
        useMeetingStore.getState().setSummary(summaryRes.data.summary);
      }
      
      const itemsRes = await apiService.extractActionItems(meetingId);
      if (itemsRes.data?.actionItems) {
        useMeetingStore.getState().setActionItems(itemsRes.data.actionItems);
      }
    } catch (err) {
      console.error("Failed to refresh AI summary:", err);
    }
  }, [meetingId, buildTimestampedTranscript]);
  const handleLeaveMeeting = useCallback(async (endForEveryone = false) => {
    try {
      if (meetingId) {
        emit('meeting:leave', { meetingId });
        
        // Stop recording if active
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        
        // Build recording blob
        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          useMeetingStore.getState().setRecordingUrl(url);
          useMeetingStore.getState().setRecordingBlob(blob);
        }
        
        if (isAdminOrHost && endForEveryone) {
          await apiService.endMeeting(meetingId);
          emit('meeting:end', { meetingId });
          
          // Trigger AI features using timestamped transcript
          try {
            const transcriptText = buildTimestampedTranscript();
            useMeetingStore.getState().setTranscript(transcriptText);
            await apiService.submitTranscript(meetingId, transcriptText);
            await apiService.generateSummary(meetingId);
            await apiService.extractActionItems(meetingId);
            await apiService.analyzeSentiment(meetingId);
          } catch (aiErr) { console.error("AI Generation failed:", aiErr); }
        } else {
          // Non-host or host just leaving: still save transcript locally
          const transcriptText = buildTimestampedTranscript();
          useMeetingStore.getState().setTranscript(transcriptText);
        }

        clearActiveMeeting();
      }
      webrtcManager.stopLocalStream();
      webrtcManager.closeAllPeerConnections();
      // Navigate to Post Meeting Dashboard
      navigate(`/dashboard/meetings/${meetingId}/review`);
    } catch (err) {
      console.error('Error leaving meeting:', err);
      clearActiveMeeting();
      navigate(`/dashboard/meetings/${meetingId}/review`);
    }
  }, [meetingId, emit, navigate, buildTimestampedTranscript, isAdminOrHost]);

  const handleToggleRoomPermission = useCallback((type: 'audio' | 'video' | 'screen', value: boolean) => {
    if (!meetingId) return;
    emit('admin:toggle-room-permission', { meetingId, type, enabled: value });
  }, [meetingId, emit]);

  const handleControlDevice = useCallback((targetUserId: string, type: 'audio' | 'video', enabled: boolean) => {
    if (!meetingId) return;
    emit('admin:control-device', { meetingId, targetUserId, type, enabled });
  }, [meetingId, emit]);

  const handleKickUser = useCallback((targetUserId: string) => {
    if (!meetingId) return;
    emit('admin:kick-user', { meetingId, targetUserId });
  }, [meetingId, emit]);

  useEffect(() => {
    if (!socket) return;
    const handlePermissions = (perms: { audio: boolean; video: boolean; screen: boolean }) => {
      setRoomPermissions(perms);
      if (isAdminOrHost) return;
      if (!perms.audio) {
        setMicEnabled(false);
        webrtcManager.toggleAudio(false);
      }
      if (!perms.video) {
        setCameraEnabled(false);
        webrtcManager.toggleVideo(false);
      }
    };
    const handleRoomPermissionUpdated = (data: { type: 'audio' | 'video' | 'screen'; enabled: boolean }) => {
      setRoomPermissions((prev) => {
        const updated = { ...prev, [data.type]: data.enabled };
        if (isAdminOrHost) return updated;
        if (data.type === 'audio' && !data.enabled) {
          setMicEnabled(false);
          webrtcManager.toggleAudio(false);
          alert("The host has disabled microphone access for the room.");
        }
        if (data.type === 'video' && !data.enabled) {
          setCameraEnabled(false);
          webrtcManager.toggleVideo(false);
          alert("The host has disabled camera access for the room.");
        }
        if (data.type === 'screen' && !data.enabled && isScreenSharing) {
          void handleToggleScreenShare(false);
          alert("The host has disabled screen sharing for the room.");
        }
        return updated;
      });
    };
    const handleDeviceControlled = (data: { type: 'audio' | 'video'; enabled: boolean }) => {
      if (data.type === 'audio') {
        setMicEnabled(data.enabled);
        webrtcManager.toggleAudio(data.enabled);
        alert(data.enabled ? "The host has unmuted your microphone." : "The host has muted your microphone.");
      }
      if (data.type === 'video') {
        setCameraEnabled(data.enabled);
        webrtcManager.toggleVideo(data.enabled);
        alert(data.enabled ? "The host has enabled your camera." : "The host has disabled your camera.");
      }
    };
    const handleKicked = () => {
      alert("You have been removed from the meeting by the host.");
      void handleLeaveMeeting(false);
    };
    const handleMeetingEnded = () => {
      alert("The host has ended this meeting for everyone.");
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      webrtcManager.stopLocalStream();
      webrtcManager.closeAllPeerConnections();
      clearActiveMeeting();
      navigate(`/dashboard/meetings/${meetingId}/review`);
    };

    const unsubPerms = on('meeting:permissions', handlePermissions);
    const unsubPermUpdated = on('meeting:room-permission-updated', handleRoomPermissionUpdated);
    const unsubDeviceControlled = on('meeting:device-controlled', handleDeviceControlled);
    const unsubKicked = on('meeting:kicked', handleKicked);
    const unsubEnded = on('meeting:ended', handleMeetingEnded);

    return () => {
      unsubPerms();
      unsubPermUpdated();
      unsubDeviceControlled();
      unsubKicked();
      unsubEnded();
    };
  }, [socket, on, isScreenSharing, handleToggleScreenShare, handleLeaveMeeting, isAdminOrHost, localStream, meetingId, navigate]);

  const handleCompactEndMeeting = useCallback(async (endForEveryone = false) => {
    await handleLeaveMeeting(endForEveryone);
  }, [handleLeaveMeeting]);
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
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
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
              onClick={isAdminOrHost ? () => setShowLeaveOptions(true) : () => { void handleCompactEndMeeting(false); }}
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
                participants={calculatedParticipants}
                selectedRecipientId={chatRecipientId}
                onRecipientChange={setChatRecipientId}
              />
            </div>
          )}
        </main>
        <footer className="border-t border-slate-700 px-4 py-3">
          <AudioVideoControls
            onToggleMic={handleToggleMic}
            onToggleCamera={handleToggleCamera}
            onToggleScreenShare={handleToggleScreenShare}
            onLeave={isAdminOrHost ? () => setShowLeaveOptions(true) : () => { void handleCompactEndMeeting(false); }}
            onToggleChat={() => setShowChat(!showChat)}
            onToggleAI={() => { setShowAIPanel(!showAIPanel); if (!showAIPanel) refreshAISummary(); }}
            onShareLink={() => setShowShareModal(true)}
            isScreenSharing={isScreenSharing}
            showChat={showChat}
            showAI={showAIPanel}
            showLeave
            micEnabled={micEnabled}
            cameraEnabled={cameraEnabled}
          />
        </footer>
      </div>
    );
  }
  return (
    <div className="w-full h-screen bg-black flex">
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
            participants={calculatedParticipants}
            selectedRecipientId={chatRecipientId}
            onRecipientChange={setChatRecipientId}
          />
        )}
        {showParticipants && (
          <ParticipantsList
            participants={calculatedParticipants}
            isOpen={showParticipants}
            onClose={() => setShowParticipants(false)}
            localUser={user}
            localMicEnabled={micEnabled}
            localCameraEnabled={cameraEnabled}
            isAdminOrHost={isAdminOrHost}
            onControlDevice={handleControlDevice}
            onKickUser={handleKickUser}
            onSelectParticipantChat={(participantId) => {
              setChatRecipientId(participantId);
              setShowChat(true);
              setShowParticipants(false);
            }}
          />
        )}
        {showAdminControls && (
          <AdminControls
            isOpen={showAdminControls}
            onClose={() => setShowAdminControls(false)}
            participants={calculatedParticipants}
            permissions={roomPermissions}
            onTogglePermission={handleToggleRoomPermission}
            onControlDevice={handleControlDevice}
            onKickUser={handleKickUser}
          />
        )}
        {showAIPanel && (
          <div className="fixed top-0 right-0 h-full w-85 bg-slate-950/95 border-l border-slate-900/80 backdrop-blur-lg transform transition-transform duration-300 ease-out z-50 shadow-2xl flex flex-col translate-x-0">
            {/* Header */}
            <div className="p-4 border-b border-slate-900/80 flex items-center justify-between bg-slate-950">
              <div>
                <h2 className="text-white font-bold text-base tracking-tight">AI Meeting Assistant</h2>
                <p className="text-slate-500 text-[10px] mt-0.5">Real-time notes, summaries & decisions</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={refreshAISummary}
                  className="p-1.5 hover:bg-slate-900 rounded-lg text-indigo-400 hover:text-indigo-300 transition-colors"
                  title="Regenerate notes"
                >
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18v3" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowAIPanel(false)}
                  className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-950/40">
              <AISummaryPanel />
            </div>
          </div>
        )}
      </div>
      <div className="bg-black border-t border-slate-800 px-6 py-4 flex items-center justify-center">
        <AudioVideoControls
          onToggleMic={handleToggleMic}
          onToggleCamera={handleToggleCamera}
          onToggleScreenShare={handleToggleScreenShare}
          onLeave={isAdminOrHost ? () => setShowLeaveOptions(true) : () => { void handleLeaveMeeting(false); }}
          onToggleChat={() => setShowChat(!showChat)}
          onToggleParticipants={() => setShowParticipants(!showParticipants)}
          onToggleAdmin={isAdminOrHost ? () => setShowAdminControls(!showAdminControls) : undefined}
          onToggleAI={() => { setShowAIPanel(!showAIPanel); if (!showAIPanel) refreshAISummary(); }}
          onShareLink={() => setShowShareModal(true)}
          isScreenSharing={isScreenSharing}
          showChat={showChat}
          showParticipants={showParticipants}
          showAdmin={showAdminControls}
          showAI={showAIPanel}
          micEnabled={micEnabled}
          cameraEnabled={cameraEnabled}
        />
      </div>
      </div>
      {meeting && (
        <ShareMeetingModal
          isOpen={showShareModal}
          meetingCode={meeting.meetingId}
          meetingId={meeting._id || ''}
          onClose={() => setShowShareModal(false)}
        />
      )}
      {showLeaveOptions && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-white mb-2">Leave or End Meeting?</h3>
            <p className="text-slate-400 text-sm mb-6 font-normal">
              As the host, you can end this meeting for all participants, or just leave the meeting yourself.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowLeaveOptions(false);
                  void handleLeaveMeeting(true);
                }}
                className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                End Meeting for Everyone
              </button>
              <button
                onClick={() => {
                  setShowLeaveOptions(false);
                  void handleLeaveMeeting(false);
                }}
                className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                Just Leave Meeting
              </button>
              <button
                onClick={() => setShowLeaveOptions(false)}
                className="w-full py-3 px-4 rounded-xl bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
