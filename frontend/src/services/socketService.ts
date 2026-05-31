import type { Socket } from 'socket.io-client'

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
  | 'notification:received'
  | 'join-room'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  // 🚀 FIX: Added required WebRTC definitions for webrtcManager.ts
  | 'webrtc:offer'
  | 'webrtc:answer'
  | 'webrtc:ice-candidate'

export type SocketEventData = Record<string, unknown>

export type MeetingUser = {
  id: string
  name: string
  avatar?: string
}

type SocketLike = Pick<Socket, 'emit' | 'on' | 'off' | 'disconnect' | 'connected'>
type SocketHandler = (data: SocketEventData) => void

export class SocketService {
  private socket: SocketLike | null

  constructor(socket: SocketLike | null) {
    this.socket = socket
  }

  setSocket(socket: SocketLike | null) {
    this.socket = socket
  }

  joinMeeting(meetingId: string, user: MeetingUser) {
    this.emit('meeting:join', { meetingId, user })
  }

  leaveMeeting(meetingId: string) {
    this.emit('meeting:leave', { meetingId })
  }

  sendMessage(meetingId: string, message: string, senderName: string) {
    this.emit('chat:message', { meetingId, message, senderName })
  }

  onMessageReceived(handler: SocketHandler) {
    return this.on('chat:message', handler)
  }

  onParticipantJoined(handler: SocketHandler) {
    return this.on('participant:joined', handler)
  }

  onParticipantLeft(handler: SocketHandler) {
    return this.on('participant:left', handler)
  }

  muteAudio(meetingId: string) {
    this.emit('participant:mute', { meetingId, type: 'audio' })
  }

  unmuteAudio(meetingId: string) {
    this.emit('participant:unmute', { meetingId, type: 'audio' })
  }

  muteVideo(meetingId: string) {
    this.emit('participant:mute', { meetingId, type: 'video' })
  }

  unmuteVideo(meetingId: string) {
    this.emit('participant:unmute', { meetingId, type: 'video' })
  }

  getParticipantsList(handler: SocketHandler) {
    return this.on('participants:list', handler)
  }

  onParticipantsUpdated(handler: SocketHandler) {
    return this.on('participants:updated', handler)
  }

  startScreenShare(meetingId: string) {
    this.emit('screen:share:start', { meetingId })
  }

  onScreenShareStarted(handler: SocketHandler) {
    return this.on('screen:share:started', handler)
  }

  stopScreenShare(meetingId: string) {
    this.emit('screen:share:stop', { meetingId })
  }

  onScreenShareStopped(handler: SocketHandler) {
    return this.on('screen:share:stopped', handler)
  }

  startRecording(meetingId: string) {
    this.emit('recording:start', { meetingId })
  }

  onRecordingStarted(handler: SocketHandler) {
    return this.on('recording:started', handler)
  }

  stopRecording(meetingId: string) {
    this.emit('recording:stop', { meetingId })
  }

  onRecordingStopped(handler: SocketHandler) {
    return this.on('recording:stopped', handler)
  }

  mentionUser(mentionedUserId: string, meetingId: string, message: string) {
    this.emit('mention:user', { mentionedUserId, meetingId, message })
  }

  onNotificationReceived(handler: SocketHandler) {
    return this.on('notification:received', handler)
  }

  joinRoom(meetingId: string) {
    this.emit('join-room', { meetingId })
  }

  sendOffer(payload: SocketEventData) {
    this.emit('offer', payload)
  }

  sendAnswer(payload: SocketEventData) {
    this.emit('answer', payload)
  }

  disconnect() {
    this.socket?.disconnect()
  }

  isConnected() {
    return this.socket?.connected ?? false
  }

  private emit(event: MeetingEvent, data?: SocketEventData) {
    if (!this.socket) {
      console.warn(`[SocketService] Cannot emit "${event}" because socket is not connected`)
      return
    }

    this.socket.emit(event, data)
  }

  private on(event: MeetingEvent, handler: SocketHandler) {
    if (!this.socket) {
      console.warn(`[SocketService] Cannot subscribe to "${event}" because socket is not connected`)
      return () => undefined
    }

    this.socket.on(event, handler as any)
    return () => {
      this.socket?.off(event, handler as any)
    }
  }
}

export default SocketService