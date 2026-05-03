import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import Peer from "simple-peer";
const SOCKET_SERVER_URL = "http://localhost:3001";

const MeetingRoom = () => {
const { meetingId } = useParams();
const [stream, setStream] = useState<MediaStream | null>(null);
const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

const myVideoRef = useRef<HTMLVideoElement>(null);
const remoteVideoRef = useRef<HTMLVideoElement>(null);
const socketRef = useRef<Socket | null>(null);
const peersRef = useRef<{ [key: string]: Peer.Instance }>({});

useEffect(() => {
    // 1. Turn on Camera & Mic FIRST
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((currentStream) => {
        setStream(currentStream);
        if (myVideoRef.current) myVideoRef.current.srcObject = currentStream;

        // 2. Connect to Backend AFTER camera is ready
        socketRef.current = io(SOCKET_SERVER_URL);

        // 3. Wait for the socket to ACTUALLY connect before joining
        socketRef.current.on("connect", () => {
        console.log("✅ [socket]: Connected with ID:", socketRef.current?.id);
        socketRef.current?.emit("join-room", meetingId, socketRef.current?.id);
        });

        // --- WEBRTC SIGNALING LOGIC ---
        
        // Someone else joined, we must call them
        socketRef.current.on("user-connected", (userId) => {
        console.log("📤 [webrtc]: New user joined! Calling:", userId);
        const peer = createPeer(userId, socketRef.current!.id!, currentStream);
        peersRef.current[userId] = peer;
        });

        // Someone is calling us, we must answer
        socketRef.current.on("offer", (payload) => {
        console.log("📥 [webrtc]: Receiving call from:", payload.callerID);
        const peer = addPeer(payload.signal, payload.callerID, currentStream);
        peersRef.current[payload.callerID] = peer;
        });

        // The person we called picked up
        socketRef.current.on("answer", (payload) => {
        console.log("🎯 [webrtc]: Call answered by:", payload.id);
        const peer = peersRef.current[payload.id];
        if (peer) {
            peer.signal(payload.signal);
        } else {
            console.error("❌ [webrtc]: Received answer, but peer not found!");
        }
        });
    })
    .catch((err) => {
        console.error("❌ [camera]: Failed to get local stream", err);
        alert("Could not access camera/microphone. Please allow permissions.");
    });

    return () => {
    socketRef.current?.disconnect();
    stream?.getTracks().forEach((track) => track.stop());
    };
}, [meetingId]);

function createPeer(userToSignal: string, callerID: string, stream: MediaStream) {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    
    peer.on("signal", (signal) => {
    console.log("📡 [webrtc]: Generating OFFER signal...");
    socketRef.current?.emit("offer", { userToSignal, callerID, signal });
    });
    
    peer.on("stream", (remoteStreamData) => {
    console.log("🎥 [webrtc]: Remote stream connected!");
    setRemoteStream(remoteStreamData);
    });

    peer.on("error", (err) => console.error("❌ [peer error]:", err));

    return peer;
}

function addPeer(incomingSignal: any, callerID: string, stream: MediaStream) {
    const peer = new Peer({ initiator: false, trickle: false, stream });
    
    peer.on("signal", (signal) => {
    console.log("📡 [webrtc]: Generating ANSWER signal...");
    socketRef.current?.emit("answer", { signal, callerID });
    });
    
    peer.on("stream", (remoteStreamData) => {
    console.log("🎥 [webrtc]: Remote stream connected!");
    setRemoteStream(remoteStreamData);
    });

    peer.on("error", (err) => console.error("❌ [peer error]:", err));

    peer.signal(incomingSignal);
    return peer;
}

useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
    remoteVideoRef.current.srcObject = remoteStream;
    }
}, [remoteStream]);

return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
    <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Room: {meetingId}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
          {/* Your Camera */}
        <div className="bg-gray-800 rounded-lg overflow-hidden aspect-video border border-gray-700 relative">
            <video ref={myVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
            <span className="absolute bottom-4 left-4 bg-black/60 px-2 py-1 rounded text-sm">You</span>
        </div>

          {/* Their Camera */}
        <div className="bg-gray-800 rounded-lg flex items-center justify-center aspect-video border border-gray-700 relative overflow-hidden">
            {remoteStream ? (
            <>
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <span className="absolute bottom-4 left-4 bg-black/60 px-2 py-1 rounded text-sm">Participant</span>
            </>
            ) : (
            <p className="text-gray-400 font-medium animate-pulse">Waiting for others to join...</p>
            )}
        </div>

        </div>
    </div>
    </div>
);
};

export default MeetingRoom;