import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import Peer from "simple-peer";
import logo from "../assets/logowobg.png";
import { apiService } from "../services/api";

const SOCKET_SERVER_URL = "http://localhost:3001";

const navLinks = [
  { label: "Dashboard", to: "/workspace", icon: "M3 11.5 12 4l9 7.5M5 10v9h5v-5h4v5h5v-9" },
  { label: "Teams",     to: "/teams",     icon: "M17 20h5v-1a4 4 0 00-5-3.87M17 20H7m10 0v-1c0-.653-.084-1.287-.24-1.89M7 20H2v-1a4 4 0 015-3.87M7 20v-1c0-.653.084-1.287.24-1.89m0 0a5.002 5.002 0 019.52 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { label: "Meetings",  to: "/meetings",  icon: "M4 7h11a2 2 0 0 1 2 2v1.5l3-2v7l-3-2V15a2 2 0 0 1-2 2H4z" },
  { label: "Schedule",  to: "/schedule",  icon: "M7 3v4M17 3v4M4 9h16M5 5h14v15H5z" },
  { label: "Settings",  to: "/settings",  icon: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 12h2M18 12h2M12 4v2M12 18v2" },
];

const MeetingRoom = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [mySocketId, setMySocketId] = useState("");
  const [showParticipants, setShowParticipants] = useState(true);
  const [chatMessages, setChatMessages] = useState<Array<{ user: string; message: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);

  const myVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<{ [key: string]: Peer.Instance }>({});
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function createPeer(userToSignal: string, callerID: string, currentStream: MediaStream) {
      const peer = new Peer({ initiator: true, trickle: false, stream: currentStream });
      peer.on("signal", (signal) => {
        socketRef.current?.emit("offer", { userToSignal, callerID, signal });
      });
      peer.on("stream", (remoteStreamData) => setRemoteStream(remoteStreamData));
      peer.on("error", (err) => console.error("❌ [peer error]:", err));
      return peer;
    }

    function addPeer(incomingSignal: Peer.SignalData, callerID: string, currentStream: MediaStream) {
      const peer = new Peer({ initiator: false, trickle: false, stream: currentStream });
      peer.on("signal", (signal) => {
        socketRef.current?.emit("answer", { signal, callerID });
      });
      peer.on("stream", (remoteStreamData) => setRemoteStream(remoteStreamData));
      peer.on("error", (err) => console.error("❌ [peer error]:", err));
      peer.signal(incomingSignal);
      return peer;
    }

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        streamRef.current = currentStream;
        if (myVideoRef.current) myVideoRef.current.srcObject = currentStream;

        socketRef.current = io(SOCKET_SERVER_URL);

        socketRef.current.on("connect", () => {
          const id = socketRef.current?.id ?? "";
          setMySocketId(id);
          setParticipants([id]);
          socketRef.current?.emit("join-room", meetingId, id);
        });

        socketRef.current.on("user-connected", (userId: string) => {
          setParticipants((prev) => [...new Set([...prev, userId])]);
          const peer = createPeer(userId, socketRef.current!.id!, currentStream);
          peersRef.current[userId] = peer;
        });

        socketRef.current.on("offer", (payload: { signal: Peer.SignalData; callerID: string }) => {
          const peer = addPeer(payload.signal, payload.callerID, currentStream);
          peersRef.current[payload.callerID] = peer;
        });

        socketRef.current.on("answer", (payload: { id: string; signal: Peer.SignalData }) => {
          const peer = peersRef.current[payload.id];
          if (peer) peer.signal(payload.signal);
        });

        socketRef.current.on("chat:message", (data: { userId: string; userName?: string; message: string; timestamp: string }) => {
          setChatMessages((prev) => {
            // Avoid echoing your own messages
            if (data.userId === socketRef.current?.id) return prev;
            return [...prev, { user: data.userName || "Participant", message: data.message }];
          });
        });
      })
      .catch((err) => {
        console.error("❌ [camera]: Failed to get local stream", err);
        alert("Could not access camera/microphone. Please allow permissions.");
      });

    return () => {
      socketRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    };
  }, [meetingId]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks().forEach((track) => { track.enabled = !track.enabled; });
      setIsMicMuted(!isMicMuted);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach((track) => { track.enabled = !track.enabled; });
      setIsVideoOff(!isVideoOff);
    }
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const videoTrack = screenStream.getVideoTracks()[0];
      setIsScreenSharing(true);
      videoTrack.onended = () => setIsScreenSharing(false);
    } catch (err) {
      console.error("Screen share failed:", err);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    alert(`Recording stopped.\n\nAI Summary: Meeting with ${participants.length} participants\nDuration: ${Math.floor(recordingTime / 60)}m ${recordingTime % 60}s`);
  };

  const startRecording = () => {
    setRecordingTime(0);
    setIsRecording(true);
    recordingIntervalRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const sendChatMessage = () => {
    if (chatInput.trim()) {
      socketRef.current?.emit("chat:message", { meetingId, message: chatInput });
      setChatMessages((prev) => [...prev, { user: "You", message: chatInput }]);
      setChatInput("");
    }
  };

  const handleViewSummary = async () => {
    try {
      alert("Generating mid-meeting AI summary, please wait...");
      const transcriptText = chatMessages.length > 0 
        ? chatMessages.map(msg => `${msg.user}: ${msg.message}`).join('\n')
        : "No voice or chat activity detected.";
      await apiService.submitTranscript(meetingId as string, transcriptText);
      const response = await apiService.generateSummary(meetingId as string);
      if (response.data?.summary) {
        alert(`AI Summary:\n\n${response.data.summary}`);
      }
    } catch (err) {
      console.error("Failed to generate summary:", err);
      alert("Could not generate summary at this time.");
    }
  };

  const handleViewTranscript = () => {
    const transcriptText = chatMessages.length > 0 
      ? chatMessages.map(msg => `${msg.user}: ${msg.message}`).join('\n')
      : "No voice or chat activity detected yet.";
    alert(`Current Transcript:\n\n${transcriptText}`);
  };

  const endMeeting = async () => {
    if (window.confirm("Are you sure you want to end this meeting?")) {
      socketRef.current?.disconnect();

      try {
        const transcriptText = chatMessages.length > 0 
          ? chatMessages.map(msg => `${msg.user}: ${msg.message}`).join('\n')
          : "No voice or chat activity detected.";
        await apiService.submitTranscript(meetingId as string, transcriptText);
        await apiService.generateSummary(meetingId as string);
        await apiService.extractActionItems(meetingId as string);
        await apiService.analyzeSentiment(meetingId as string);
      } catch (err) { console.error("AI Gen Failed:", err); }

      stream?.getTracks().forEach((track) => track.stop());
      navigate(`/transition?to=${encodeURIComponent("/workspace")}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Left Nav Sidebar — white, icon-only */}
      <aside className="flex w-16 flex-col items-center border-r border-slate-200 bg-white py-4 gap-6">
        <button
          type="button"
          aria-label="Dashboard"
          title="Dashboard"
          onClick={() => setActivePanel(activePanel === "/workspace" ? null : "/workspace")}
          className={`rounded-xl p-1 transition ${activePanel === "/workspace" ? "bg-emerald-50" : "hover:bg-slate-100"}`}
        >
          <img src={logo} alt="IntellMeet" className="h-9 w-9 object-contain grayscale" />
        </button>
        <nav className="flex flex-col items-center gap-2 mt-2">
          {navLinks.map((item) => (
            <button
              key={item.to}
              type="button"
              aria-label={item.label}
              title={item.label}
              onClick={() => setActivePanel(activePanel === item.to ? null : item.to)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                activePanel === item.to
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
            </button>
          ))}
        </nav>
      </aside>

      {/* Workspace panel — iframe, no navigation away from meeting */}
      {activePanel && (
        <div className="flex w-96 flex-col border-r border-white/10 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-2">
            <span className="text-sm font-semibold text-slate-700">
              {navLinks.find((l) => l.to === activePanel)?.label ?? "Workspace"}
            </span>
            <button
              type="button"
              onClick={() => setActivePanel(null)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close panel"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <iframe
            key={activePanel}
            src={activePanel}
            title="Workspace"
            className="flex-1 w-full border-0"
          />
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black px-6 py-3">
          <div>
            <h1 className="text-lg font-bold text-white">Meeting: {meetingId}</h1>
            {isRecording && (
              <p className="text-xs font-semibold text-red-400">
                ● Recording… {Math.floor(recordingTime / 60)}m {recordingTime % 60}s
              </p>
            )}
          </div>
        </div>

        {/* Body: video + right panel */}
        <div className="flex flex-1 overflow-hidden">
          {/* Video Area */}
          <div className="flex flex-1 flex-col p-4">
            <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
              {/* Your Camera */}
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-neutral-900 aspect-video">
                <video
                  ref={myVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`h-full w-full object-cover ${isVideoOff ? "hidden" : ""}`}
                  style={{ transform: "scaleX(-1)" }}
                />
                {isVideoOff && (
                  <div className="flex h-full w-full items-center justify-center bg-neutral-900">
                    <p className="text-sm text-slate-400">Video is off</p>
                  </div>
                )}
                <span className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-0.5 text-xs">
                  You {isMicMuted && "🔇"}
                </span>
              </div>

              {/* Remote Camera */}
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-neutral-900 aspect-video flex items-center justify-center">
                {remoteStream ? (
                  <>
                    <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
                    <span className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-0.5 text-xs">Participant</span>
                  </>
                ) : (
                  <p className="animate-pulse text-sm text-slate-400">Waiting for others to join…</p>
                )}
              </div>
            </div>

            {/* Control Toolbar */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 rounded-xl border border-white/10 bg-neutral-900 p-4">
              <button
                onClick={toggleMic}
                className={`${isMicMuted ? "bg-red-600 hover:bg-red-700" : "bg-white/10 hover:bg-white/20"} flex h-11 w-11 items-center justify-center rounded-full text-white text-xl transition`}
                title={isMicMuted ? "Unmute" : "Mute"}
                aria-label={isMicMuted ? "Unmute microphone" : "Mute microphone"}
              >
                <span aria-hidden="true">{isMicMuted ? "🔇︎" : "🎙︎"}</span>
              </button>

              <button
                onClick={toggleVideo}
                className={`${isVideoOff ? "bg-red-600 hover:bg-red-700" : "bg-white/10 hover:bg-white/20"} flex h-11 w-11 items-center justify-center rounded-full text-white text-xl transition`}
                title={isVideoOff ? "Turn video on" : "Turn video off"}
                aria-label={isVideoOff ? "Turn video on" : "Turn video off"}
              >
                <span aria-hidden="true">{isVideoOff ? "📷︎" : "📹︎"}</span>
              </button>

              <button
                onClick={startScreenShare}
                disabled={isScreenSharing}
                className={`${isScreenSharing ? "cursor-not-allowed bg-white/5" : "bg-white/10 hover:bg-white/20"} flex h-11 w-11 items-center justify-center rounded-full text-white text-xl transition`}
                title={isScreenSharing ? "Sharing screen" : "Share screen"}
                aria-label={isScreenSharing ? "Sharing screen" : "Share screen"}
              >
                <span aria-hidden="true">🖥︎</span>
              </button>

              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`${isRecording ? "bg-red-600 hover:bg-red-700" : "bg-white/10 hover:bg-white/20"} flex h-11 w-11 items-center justify-center rounded-full text-white text-xl transition`}
                title={isRecording ? "Stop recording" : "Start recording"}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
              >
                <span aria-hidden="true">{isRecording ? "⏹︎" : "⏺︎"}</span>
              </button>

              <button
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white text-xl transition hover:bg-white/20"
                onClick={handleViewSummary}
                title="AI summary"
                aria-label="AI summary"
              >
                <span aria-hidden="true">▤</span>
              </button>

              <button
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white text-xl transition hover:bg-white/20"
                onClick={handleViewTranscript}
                title="AI transcript"
                aria-label="AI transcript"
              >
                <span aria-hidden="true">✎</span>
              </button>

              <div className="h-8 w-px bg-white/10" />

              {/* End Call */}
              <button
                onClick={endMeeting}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700"
                title="End call"
                aria-label="End call"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right Panel — Participants & Chat */}
          <div className="flex w-72 flex-col border-l border-white/10 bg-neutral-900">
            <div className="flex border-b border-white/10">
              <button
                onClick={() => setShowParticipants(true)}
                className={`flex-1 p-3 text-sm font-semibold transition ${showParticipants ? "border-b-2 border-emerald-500 text-white" : "text-slate-400 hover:text-white"}`}
              >
                👥 Participants ({participants.length})
              </button>
              <button
                onClick={() => setShowParticipants(false)}
                className={`flex-1 p-3 text-sm font-semibold transition ${!showParticipants ? "border-b-2 border-emerald-500 text-white" : "text-slate-400 hover:text-white"}`}
              >
                💬 Chat
              </button>
            </div>

            {showParticipants && (
              <div className="flex-1 overflow-y-auto p-4">
                <h3 className="mb-3 text-sm font-bold text-slate-300">In this meeting</h3>
                {participants.map((participant, idx) => (
                  <div key={idx} className="mb-2 flex items-center gap-2 rounded-lg bg-white/5 p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold">
                      {participant.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="text-sm text-slate-200">
                      {participant === mySocketId ? "You" : participant}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {!showParticipants && (
              <div className="flex flex-1 flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.length === 0 ? (
                    <p className="text-xs text-slate-500">No messages yet</p>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div key={idx} className="rounded-lg bg-white/5 p-3">
                        <p className="text-xs font-semibold text-emerald-400">{msg.user}</p>
                        <p className="mt-1 text-sm text-slate-200">{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2 border-t border-white/10 p-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                    placeholder="Type a message…"
                    className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    onClick={sendChatMessage}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingRoom;
