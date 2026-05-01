import type { Socket } from 'socket.io-client';

export interface RemoteStream {
  userId: string;
  userName: string;
  stream: MediaStream;
  socketId: string;
}

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

const DEFAULT_CONFIG: WebRTCConfig = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302'] },
    { urls: ['stun:stun1.l.google.com:19302'] },
  ],
};

export class WebRTCManager {
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remoteStreams: Map<string, RemoteStream> = new Map();
  private socket: Socket | null = null;
  private config: WebRTCConfig;

  constructor(config: Partial<WebRTCConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setSocket(socket: Socket) {
    this.socket = socket;
  }

  /**
   * Get local media stream (camera + microphone)
   */
  async getLocalStream(
    audio = true,
    video = true,
    videoConstraints?: MediaTrackConstraints
  ): Promise<MediaStream> {
    if (this.localStream) {
      // Update existing stream tracks
      this.localStream.getTracks().forEach((track) => {
        if (track.kind === 'video' && !video) track.stop();
        if (track.kind === 'audio' && !audio) track.stop();
      });
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
        video: video
          ? videoConstraints || { width: { ideal: 1280 }, height: { ideal: 720 } }
          : false,
      });
      return this.localStream;
    } catch (err) {
      console.error('Failed to get local stream:', err);
      throw err;
    }
  }

  getLocalStream_(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Stop all local tracks
   */
  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
  }

  /**
   * Toggle audio track
   */
  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Toggle video track
   */
  toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Create peer connection with a remote user
   */
  async createPeerConnection(
    remoteSocketId: string,
    initiator: boolean = false
  ): Promise<RTCPeerConnection> {
    if (this.peerConnections.has(remoteSocketId)) {
      return this.peerConnections.get(remoteSocketId)!;
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: this.config.iceServers,
    });

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('Remote track received:', event.track.kind);
      const remoteStream = event.streams[0];
      if (remoteStream) {
        this.remoteStreams.set(remoteSocketId, {
          userId: remoteSocketId,
          userName: 'User',
          stream: remoteStream,
          socketId: remoteSocketId,
        });
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket?.emit('webrtc:ice-candidate', {
          to: remoteSocketId,
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.connectionState);
      if (peerConnection.connectionState === 'failed') {
        this.closePeerConnection(remoteSocketId);
      }
    };

    this.peerConnections.set(remoteSocketId, peerConnection);

    // If initiator, create and send offer
    if (initiator) {
      try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        this.socket?.emit('webrtc:offer', {
          to: remoteSocketId,
          offer,
        });
      } catch (err) {
        console.error('Failed to create offer:', err);
      }
    }

    return peerConnection;
  }

  /**
   * Handle incoming offer
   */
  async handleOffer(
    remoteSocketId: string,
    offer: RTCSessionDescriptionInit
  ): Promise<void> {
    try {
      const peerConnection = await this.createPeerConnection(remoteSocketId, false);

      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      this.socket?.emit('webrtc:answer', {
        to: remoteSocketId,
        answer,
      });
    } catch (err) {
      console.error('Failed to handle offer:', err);
    }
  }

  /**
   * Handle incoming answer
   */
  async handleAnswer(
    remoteSocketId: string,
    answer: RTCSessionDescriptionInit
  ): Promise<void> {
    try {
      const peerConnection = this.peerConnections.get(remoteSocketId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      }
    } catch (err) {
      console.error('Failed to handle answer:', err);
    }
  }

  /**
   * Handle ICE candidate
   */
  async handleIceCandidate(
    remoteSocketId: string,
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    try {
      const peerConnection = this.peerConnections.get(remoteSocketId);
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.error('Failed to add ICE candidate:', err);
    }
  }

  /**
   * Close specific peer connection
   */
  closePeerConnection(remoteSocketId: string) {
    const peerConnection = this.peerConnections.get(remoteSocketId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(remoteSocketId);
    }
    this.remoteStreams.delete(remoteSocketId);
  }

  /**
   * Close all peer connections
   */
  closeAllPeerConnections() {
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.remoteStreams.clear();
  }

  /**
   * Get remote streams
   */
  getRemoteStreams(): RemoteStream[] {
    return Array.from(this.remoteStreams.values());
  }

  getRemoteStream(socketId: string): RemoteStream | undefined {
    return this.remoteStreams.get(socketId);
  }

  /**
   * Update remote user info
   */
  updateRemoteUserInfo(
    socketId: string,
    userId: string,
    userName: string
  ) {
    const remoteStream = this.remoteStreams.get(socketId);
    if (remoteStream) {
      remoteStream.userId = userId;
      remoteStream.userName = userName;
    }
  }
}

export const webrtcManager = new WebRTCManager();
