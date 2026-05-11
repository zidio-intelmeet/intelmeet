import { Socket } from 'socket.io-client';

export type MeetingEvent = 
  | 'meeting:join'
  | 'meeting:leave'
  | 'chat:message'
  | 'participant:joined'
  | 'participant:left'
  | 'participant:mute'
  | 'participant:unmute'
  | 'participant:updated'
  | 'participants:list'
  | 'participants:updated'
  | 'screen:share:start'
  | 'screen:share:started'
  | 'screen:share:stop'
  | 'screen:share:stopped'
  | 'recording:start'
  | 'recording:started'
  | 'recording:stop'
  | 'recording:stopped'
  | 'mention:user'
  | 'notification:received';

/**
 * Centralized Socket.io event manager
 * Provides type-safe methods for emitting and subscribing to events
 */
export class SocketService {
  constructor(private socket: Socket | null) {}

  // ==================== MEETING EVENTS ====================

  joinMeeting(meetingId: string, user: { id: string; name: string; avatar?: string }) {
    this.emit('meeting:join', { meetingId, user });
  }

  leaveMeeting(meetingId: string) {
    this.emit('meeting:leave', { meetingId });
  }

  // ==================== CHAT EVENTS ====================

  sendMessage(meetingId: string, message: string, senderName: string) {
    this.emit('chat:message', { meetingId, message, senderName });
  }

  onMessageReceived(handler: (data: any) => void) {
    return this.on('chat:message', handler);
  }

  // ==================== PARTICIPANT EVENTS ====================

  onParticipantJoined(handler: (data: any) => void) {
    return this.on('participant:joined', handler);
  }

  onParticipantLeft(handler: (data: any) => void) {
    return this.on('participant:left', handler);
  }

  muteAudio(meetingId: string) {
    this.emit('participant:mute', { meetingId, type: 'audio' });
  }

  unmuteAudio(meetingId: string) {
    this.emit('participant:unmute', { meetingId, type: 'audio' });
  }

  muteVideo(meetingId: string) {
    this.emit('participant:mute', { meetingId, type: 'video' });
  }

  unmuteVideo(meetingId: string) {
    this.emit('participant:unmute', { meetingId, type: 'video' });
  }

  getParticipantsList(handler: (data: any) => void) {
    return this.on('participants:list', handler);
  }

  onParticipantsUpdated(handler: (data: any) => void) {
    return this.on('participants:updated', handler);
  }

  // ==================== SCREEN SHARING EVENTS ====================

  startScreenShare(meetingId: string) {
    this.emit('screen:share:start', { meetingId });
  }

  onScreenShareStarted(handler: (data: any) => void) {
    return this.on('screen:share:started', handler);
  }

  stopScreenShare(meetingId: string) {
    this.emit('screen:share:stop', { meetingId });
  }

  onScreenShareStopped(handler: (data: any) => void) {
    return this.on('screen:share:stopped', handler);
  }

  // ==================== RECORDING EVENTS ====================

  startRecording(meetingId: string) {
    this.emit('recording:start', { meetingId });
  }

  onRecordingStarted(handler: (data: any) => void) {
    return this.on('recording:started', handler);
  }

  stopRecording(meetingId: string) {
    this.emit('recording:stop', { meetingId });
  }

  onRecordingStopped(handler: (data: any) => void) {
    return this.on('recording:stopped', handler);
  }

  // ==================== NOTIFICATIONS ====================

  mentionUser(mentionedUserId: string, meetingId: string, message: string) {
    this.emit('mention:user', { mentionedUserId, meetingId, message });
  }

  onNotificationReceived(handler: (data: any) => void) {
    return this.on('notification:received', handler);
  }

  // ==================== LEGACY WEBRTC EVENTS ====================

  joinRoom(meetingId: string) {
    this.emit('join-room', meetingId);
  }

  sendOffer(payload: any) {
    this.emit('offer', payload);
  }

  sendAnswer(payload: any) {
    this.emit('answer', payload);
  }

  // ==================== INTERNAL METHODS ====================

  private emit(event: string, data?: unknown) {
    if (!this.socket) {
      console.warn(`⚠️ [SocketService] Cannot emit "${event}" - socket not connected`);
      return;
    }
    this.socket.emit(event, data);
  }

  private on(event: string, handler: (...args: unknown[]) => void) {
    if (!this.socket) {
      console.warn(`⚠️ [SocketService] Cannot subscribe to "${event}" - socket not connected`);
      return () => {};
    }
    this.socket.on(event, handler);
    return () => this.socket?.off(event, handler);
  }

  disconnect() {
    this.socket?.disconnect();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export default SocketService;
