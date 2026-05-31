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
  private cameraTrack: MediaStreamTrack | null = null;
  private screenTrack: MediaStreamTrack | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remoteStreams: Map<string, RemoteStream> = new Map();
  private socket: Socket | null = null;
  private config: WebRTCConfig;
  private iceCandidateQueues: Map<string, RTCIceCandidateInit[]> = new Map();
  
  // 🚀 CRITICAL FIX: Add callback to notify React when a stream arrives
  public onRemoteStreamsChange?: (streams: RemoteStream[]) => void;

  constructor(config: Partial<WebRTCConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setSocket(socket: Socket) {
    this.socket = socket;
  }

  // 🚀 CRITICAL FIX: Helper to push updates to the UI
  private notifyStreamChange() {
    if (this.onRemoteStreamsChange) {
      this.onRemoteStreamsChange(Array.from(this.remoteStreams.values()));
    }
  }

  async getLocalStream(audio = true, video = true, videoConstraints?: MediaTrackConstraints): Promise<MediaStream> {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        if (track.kind === 'video' && !video) track.stop();
        if (track.kind === 'audio' && !audio) track.stop();
      });
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
        video: video ? videoConstraints || { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      });
      this.cameraTrack = this.localStream.getVideoTracks()[0] || null;
      this.screenTrack = null;
      return this.localStream;
    } catch (err) {
      console.error('Failed to get local stream:', err);
      throw err;
    }
  }

  getLocalStream_(): MediaStream | null { return this.localStream; }

  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    this.cameraTrack = null;
    this.screenTrack = null;
  }

  toggleAudio(enabled: boolean) {
    if (this.localStream) this.localStream.getAudioTracks().forEach((track) => { track.enabled = enabled; });
  }

  toggleVideo(enabled: boolean) {
    if (this.localStream) this.localStream.getVideoTracks().forEach((track) => { track.enabled = enabled; });
  }

  private async replaceOutgoingVideoTrack(nextTrack: MediaStreamTrack | null) {
    const updates = Array.from(this.peerConnections.values()).map(async (peerConnection) => {
      const sender = peerConnection.getSenders().find((item) => item.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(nextTrack);
      } else if (nextTrack && this.localStream) {
        peerConnection.addTrack(nextTrack, this.localStream);
      }
    });
    await Promise.all(updates);
  }

  async startScreenShare(): Promise<MediaStream> {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const screenTrack = screenStream.getVideoTracks()[0];
    if (!screenTrack) throw new Error('No screen track available.');

    if (!this.localStream) this.localStream = new MediaStream();

    const currentVideoTrack = this.localStream.getVideoTracks()[0];
    if (currentVideoTrack) this.localStream.removeTrack(currentVideoTrack);

    this.localStream.addTrack(screenTrack);
    this.screenTrack = screenTrack;
    await this.replaceOutgoingVideoTrack(screenTrack);

    return this.localStream;
  }

  async stopScreenShare(): Promise<MediaStream | null> {
    if (!this.localStream) return this.localStream;
    const currentVideoTrack = this.localStream.getVideoTracks()[0];
    if (currentVideoTrack) this.localStream.removeTrack(currentVideoTrack);

    this.screenTrack?.stop();
    this.screenTrack = null;

    if (this.cameraTrack && this.cameraTrack.readyState === 'live') {
      this.localStream.addTrack(this.cameraTrack);
      await this.replaceOutgoingVideoTrack(this.cameraTrack);
    } else {
      await this.replaceOutgoingVideoTrack(null);
    }
    return this.localStream;
  }

  async createPeerConnection(
    remoteSocketId: string, 
    initiator: boolean = false,
    localUserId?: string,
    localUserName?: string
  ): Promise<RTCPeerConnection> {
    if (this.peerConnections.has(remoteSocketId)) return this.peerConnections.get(remoteSocketId)!;

    const peerConnection = new RTCPeerConnection({ iceServers: this.config.iceServers });

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    peerConnection.ontrack = (event) => {
      console.log('⚡ [webrtc]: Received remote track', event.track.kind, 'from', remoteSocketId);
      let remoteStream = event.streams[0];
      if (!remoteStream) {
        const existing = this.remoteStreams.get(remoteSocketId);
        if (existing && existing.stream) {
          remoteStream = existing.stream;
          if (!remoteStream.getTracks().includes(event.track)) {
            remoteStream.addTrack(event.track);
          }
        } else {
          remoteStream = new MediaStream();
          remoteStream.addTrack(event.track);
        }
      }

      this.remoteStreams.set(remoteSocketId, {
        userId: this.remoteStreams.get(remoteSocketId)?.userId || remoteSocketId,
        userName: this.remoteStreams.get(remoteSocketId)?.userName || 'User',
        stream: remoteStream,
        socketId: remoteSocketId,
      });
      this.notifyStreamChange(); // 🚀 Tell React to re-render the video grid!
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket?.emit('webrtc:ice-candidate', { to: remoteSocketId, candidate: event.candidate });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'closed') {
        this.closePeerConnection(remoteSocketId);
      }
    };

    this.peerConnections.set(remoteSocketId, peerConnection);

    if (initiator) {
      try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        this.socket?.emit('webrtc:offer', { 
          to: remoteSocketId, 
          offer,
          userId: localUserId,
          userName: localUserName
        });
      } catch (err) {
        console.error('Failed to create offer:', err);
      }
    }

    return peerConnection;
  }

  private async drainIceCandidates(remoteSocketId: string, peerConnection: RTCPeerConnection) {
    const queue = this.iceCandidateQueues.get(remoteSocketId);
    if (queue && queue.length > 0) {
      console.log(`⚡ [webrtc]: Draining ${queue.length} queued ICE candidates for ${remoteSocketId}`);
      for (const cand of queue) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(cand));
        } catch (err) {
          console.error('Failed to add queued ICE candidate:', err);
        }
      }
      this.iceCandidateQueues.delete(remoteSocketId);
    }
  }

  async handleOffer(
    remoteSocketId: string, 
    offer: RTCSessionDescriptionInit,
    localUserId?: string,
    localUserName?: string
  ): Promise<void> {
    try {
      const peerConnection = await this.createPeerConnection(remoteSocketId, false, localUserId, localUserName);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      await this.drainIceCandidates(remoteSocketId, peerConnection);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      this.socket?.emit('webrtc:answer', { 
        to: remoteSocketId, 
        answer,
        userId: localUserId,
        userName: localUserName
      });
    } catch (err) {
      console.error('Failed to handle offer:', err);
    }
  }

  async handleAnswer(remoteSocketId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    try {
      const peerConnection = this.peerConnections.get(remoteSocketId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        await this.drainIceCandidates(remoteSocketId, peerConnection);
      }
    } catch (err) {
      console.error('Failed to handle answer:', err);
    }
  }

  async handleIceCandidate(remoteSocketId: string, candidate: RTCIceCandidateInit): Promise<void> {
    try {
      const peerConnection = this.peerConnections.get(remoteSocketId);
      if (peerConnection && peerConnection.remoteDescription) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        if (!this.iceCandidateQueues.has(remoteSocketId)) {
          this.iceCandidateQueues.set(remoteSocketId, []);
        }
        this.iceCandidateQueues.get(remoteSocketId)!.push(candidate);
        console.log(`⏳ [webrtc]: Queued ICE candidate for ${remoteSocketId} (remoteDescription is null)`);
      }
    } catch (err) {
      console.error('Failed to add ICE candidate:', err);
    }
  }

  closePeerConnection(remoteSocketId: string) {
    const peerConnection = this.peerConnections.get(remoteSocketId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(remoteSocketId);
    }
    this.remoteStreams.delete(remoteSocketId);
    this.iceCandidateQueues.delete(remoteSocketId);
    this.notifyStreamChange(); // 🚀 Tell React to remove the video!
  }

  closeAllPeerConnections() {
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.remoteStreams.clear();
    this.notifyStreamChange();
  }

  getRemoteStreams(): RemoteStream[] { return Array.from(this.remoteStreams.values()); }
  getRemoteStream(socketId: string): RemoteStream | undefined { return this.remoteStreams.get(socketId); }

  updateRemoteUserInfo(socketId: string, userId: string, userName: string) {
    const remoteStream = this.remoteStreams.get(socketId);
    if (remoteStream) {
      remoteStream.userId = userId;
      remoteStream.userName = userName;
      this.notifyStreamChange();
    }
  }
}

export const webrtcManager = new WebRTCManager();