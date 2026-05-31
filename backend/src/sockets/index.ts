import { Server, Socket } from "socket.io";
import Meeting from "../models/meeting.model";
import Notification from "../models/notification.model";

export const initializeSockets = (io: Server) => {
  const activeMeetings = new Map<string, any>();

  io.on("connection", (socket: Socket) => {
    const userId = socket.handshake.query.userId as string;
    const tenantId = socket.handshake.query.tenantId as string;

    console.log(`📡 [socket]: New connection: ${socket.id} (User: ${userId})`);

    // ==================== MODERN WEBRTC SIGNALING (Fix for Video/Audio) ====================
    socket.on("webrtc:offer", (payload) => {
      // Route the offer specifically to the target socket while preserving userId/userName
      io.to(payload.to).emit("webrtc:offer", { ...payload, from: socket.id });
    });

    socket.on("webrtc:answer", (payload) => {
      io.to(payload.to).emit("webrtc:answer", { ...payload, from: socket.id });
    });

    socket.on("webrtc:ice-candidate", (payload) => {
      io.to(payload.to).emit("webrtc:ice-candidate", { ...payload, from: socket.id });
    });

    // ==================== LEGACY EVENTS (Kept for backward compatibility) ====================
    // 🚀 FIX: Accept the frontend's socket ID as a second parameter to prevent undefined user IDs
    socket.on("join-room", (meetingId: string, customId?: string) => {
      socket.join(meetingId);
      const joinedUserId = customId || userId || socket.id;
      socket.to(meetingId).emit("user-connected", joinedUserId);
    });

    socket.on("offer", (payload) => {
      io.to(payload.userToSignal).emit("offer", { signal: payload.signal, callerID: payload.callerID });
    });

    socket.on("answer", (payload) => {
      io.to(payload.callerID).emit("answer", { signal: payload.signal, id: socket.id });
    });

    socket.on("ice-candidate", (payload) => {
      io.to(payload.target).emit("ice-candidate", { candidate: payload.candidate, sender: socket.id });
    });

    // ==================== MEETING EVENTS ====================
    socket.on("meeting:join", (data) => {
      if (!data || !data.user || !data.meetingId || !userId) {
        console.error("❌ [socket]: Invalid join data or missing userId");
        return;
      }

      const { meetingId, user } = data;
      socket.join(meetingId);

      if (!activeMeetings.has(meetingId)) {
        activeMeetings.set(meetingId, {
          participants: new Map(),
          chatHistory: [],
          permissions: {
            audio: true,
            video: true,
            screen: true,
          }
        });
      }

      const meeting = activeMeetings.get(meetingId);
      
      // 🚀 CRITICAL FIX: Added socket.id so WebRTC knows exactly how to route peer connections!
      meeting.participants.set(userId, {
        ...user,
        socketId: socket.id, 
        joinedAt: new Date(),
        isAudioOn: true,
        isVideoOn: true,
      });

      console.log(`✅ [socket]: ${user.name} joined meeting ${meetingId}`);

      // Emit current room permissions to the joined user
      socket.emit("meeting:permissions", meeting.permissions || { audio: true, video: true, screen: true });

      io.to(meetingId).emit("participants:list", {
        participants: Array.from(meeting.participants.values()),
      });
    });

    socket.on("admin:kick-user", (data) => {
      if (!data || !data.meetingId || !data.targetUserId) return;
      const { meetingId, targetUserId } = data;
      const meeting = activeMeetings.get(meetingId);
      if (meeting) {
        const targetParticipant = meeting.participants.get(targetUserId);
        if (targetParticipant) {
          io.to(targetParticipant.socketId).emit("meeting:kicked");
          console.log(`⚡ [socket]: User ${targetUserId} kicked by admin from meeting ${meetingId}`);
        }
      }
    });

    socket.on("admin:control-device", (data) => {
      if (!data || !data.meetingId || !data.targetUserId || !data.type) return;
      const { meetingId, targetUserId, type, enabled } = data;
      const meeting = activeMeetings.get(meetingId);
      if (meeting) {
        const targetParticipant = meeting.participants.get(targetUserId);
        if (targetParticipant) {
          if (type === "audio") {
            targetParticipant.isAudioOn = enabled;
          } else if (type === "video") {
            targetParticipant.isVideoOn = enabled;
          }
          io.to(targetParticipant.socketId).emit("meeting:device-controlled", { type, enabled });
          io.to(meetingId).emit("participants:list", {
            participants: Array.from(meeting.participants.values()),
          });
          console.log(`⚡ [socket]: Device ${type} toggled to ${enabled} for user ${targetUserId} in meeting ${meetingId}`);
        }
      }
    });

    socket.on("admin:toggle-room-permission", (data) => {
      if (!data || !data.meetingId || !data.type) return;
      const { meetingId, type, enabled } = data;
      const meeting = activeMeetings.get(meetingId);
      if (meeting) {
        if (!meeting.permissions) {
          meeting.permissions = { audio: true, video: true, screen: true };
        }
        meeting.permissions[type] = enabled;
        io.to(meetingId).emit("meeting:room-permission-updated", { type, enabled });
        console.log(`⚡ [socket]: Global permission ${type} toggled to ${enabled} in meeting ${meetingId}`);
      }
    });

    socket.on("meeting:toggle-media", (data) => {
      if (!data || !data.meetingId || !userId || !data.type) return;
      const { meetingId, type, enabled } = data;
      const meeting = activeMeetings.get(meetingId);
      if (meeting) {
        const participant = meeting.participants.get(userId);
        if (participant) {
          if (type === "audio") {
            participant.isAudioOn = enabled;
          } else if (type === "video") {
            participant.isVideoOn = enabled;
          }
          io.to(meetingId).emit("participants:list", {
            participants: Array.from(meeting.participants.values()),
          });
          console.log(`⚡ [socket]: Media ${type} toggled to ${enabled} by user ${userId} in meeting ${meetingId}`);
        }
      }
    });

    socket.on("chat:message", (data) => {
      if (!userId) return; 
      const { meetingId, message, recipientId } = data;
      const meeting = activeMeetings.get(meetingId);
      if (meeting) {
        const participant = meeting.participants.get(userId);
        const userName = participant ? participant.name : "Participant";
        
        if (recipientId) {
          const recipient = meeting.participants.get(recipientId);
          if (recipient) {
            const msgData = {
              userId,
              userName,
              message,
              timestamp: new Date(),
              isPrivate: true,
              recipientId,
              recipientName: recipient.name,
            };
            socket.emit("chat:message", msgData);
            io.to(recipient.socketId).emit("chat:message", msgData);
          }
        } else {
          const msgData = { userId, userName, message, timestamp: new Date() };
          meeting.chatHistory.push(msgData);
          io.to(meetingId).emit("chat:message", msgData);
        }
      }
    });

    socket.on("mention:user", async (data) => {
      const { mentionedUserId, meetingId, message } = data;
      try {
        const meeting = await Meeting.findById(meetingId);
        await Notification.create({
          tenantId,
          userId: mentionedUserId,
          type: "mention",
          title: "You were mentioned in a meeting",
          message: `Someone mentioned you: "${message}"`,
          relatedId: meetingId,
        });
      } catch (error) {
        console.error("Error creating notification:", error);
      }
      socket.to(mentionedUserId).emit("notification:received", { type: "mention", message });
    });

    // ==================== DISCONNECTION & LEAVE CLEANUP ====================
    socket.on("meeting:leave", (data) => {
      if (!data || !data.meetingId || !userId) return;
      const { meetingId } = data;
      socket.leave(meetingId);
      
      const meeting = activeMeetings.get(meetingId);
      if (meeting && meeting.participants.has(userId)) {
        // 🚀 FIX: Prevent deleting another tab's connection if user reloads
        if (meeting.participants.get(userId)?.socketId === socket.id) {
          meeting.participants.delete(userId);
          io.to(meetingId).emit("participant:left", {
            userId,
            participants: Array.from(meeting.participants.values()),
          });
          if (meeting.participants.size === 0) activeMeetings.delete(meetingId);
        }
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔌 [socket]: Disconnected: ${socket.id} (User: ${userId})`);
      activeMeetings.forEach((meeting, meetingId) => {
        if (userId && meeting.participants.has(userId)) {
          // 🚀 FIX: Prevent deleting another tab's connection
          if (meeting.participants.get(userId)?.socketId === socket.id) {
            meeting.participants.delete(userId);
            io.to(meetingId).emit("participant:left", {
              userId,
              participants: Array.from(meeting.participants.values()),
            });
            if (meeting.participants.size === 0) activeMeetings.delete(meetingId);
          }
        }
      });
    });
  });
};