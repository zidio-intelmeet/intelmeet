import { Server, Socket } from "socket.io";
import Meeting from "../models/meeting.model";
import Notification from "../models/notification.model";

export const initializeSockets = (io: Server) => {
  // Store active meeting sessions: { meetingId: { participants: {...}, chat: [...] } }
  const activeMeetings = new Map<string, any>();

  io.on("connection", (socket: Socket) => {
    const userId = socket.handshake.query.userId as string;
    const tenantId = socket.handshake.query.tenantId as string;

    console.log(`📡 [socket]: New connection: ${socket.id} (User: ${userId})`);

    // ==================== LEGACY EVENTS (WebRTC Signaling) ====================

    socket.on("join-room", (meetingId: string) => {
      socket.join(meetingId);
      console.log(`👥 [socket]: User ${userId} joined room: ${meetingId}`);
      socket.to(meetingId).emit("user-connected", userId);
    });

    socket.on("offer", (payload) => {
      console.log(`📞 [socket]: Relay Offer from ${payload.callerID}`);
      io.to(payload.userToSignal).emit("offer", {
        signal: payload.signal,
        callerID: payload.callerID,
      });
    });

    socket.on("answer", (payload) => {
      console.log(`✅ [socket]: Relay Answer from ${socket.id}`);
      io.to(payload.callerID).emit("answer", {
        signal: payload.signal,
        id: socket.id,
      });
    });

    // ==================== NEW MEETING EVENTS ====================

    // EVENT: meeting:join - User joins meeting (with metadata)
    socket.on("meeting:join", (data) => {
      const { meetingId, user } = data;
      socket.join(meetingId);

      // Initialize meeting if first participant
      if (!activeMeetings.has(meetingId)) {
        activeMeetings.set(meetingId, {
          startedAt: new Date(),
          participants: new Map(),
          chatHistory: [],
          recordingActive: false,
        });
      }

      // Add participant
      const meeting = activeMeetings.get(meetingId);
      meeting.participants.set(userId, {
        ...user,
        joinedAt: new Date(),
        isAudioOn: true,
        isVideoOn: true,
      });

      console.log(
        `✅ [meeting:join]: ${user.name} joined meeting ${meetingId}`
      );

      // Broadcast to others
      socket.to(meetingId).emit("participant:joined", {
        userId,
        user,
        participants: Array.from(meeting.participants.values()),
      });

      // Send current participants to new user
      socket.emit("participants:list", {
        participants: Array.from(meeting.participants.values()),
      });
    });

    // EVENT: meeting:leave - User leaves meeting
    socket.on("meeting:leave", (data) => {
      const { meetingId } = data;
      socket.leave(meetingId);

      const meeting = activeMeetings.get(meetingId);
      if (meeting) {
        meeting.participants.delete(userId);

        console.log(`🚪 [meeting:leave]: User ${userId} left meeting ${meetingId}`);

        // Broadcast to remaining participants
        socket.to(meetingId).emit("participant:left", {
          userId,
          participants: Array.from(meeting.participants.values()),
        });

        // Clean up if no participants left
        if (meeting.participants.size === 0) {
          activeMeetings.delete(meetingId);
          console.log(`🧹 [cleanup]: Meeting ${meetingId} removed from active meetings`);
        }
      }
    });

    // EVENT: chat:message - Real-time chat in meeting
    socket.on("chat:message", (data) => {
      const { meetingId, message, senderName } = data;
      const chatEntry = {
        userId,
        senderName,
        message,
        timestamp: new Date(),
      };

      const meeting = activeMeetings.get(meetingId);
      if (meeting) {
        meeting.chatHistory.push(chatEntry);
      }

      console.log(`💬 [chat:message]: ${senderName} in ${meetingId}: ${message}`);

      // Broadcast to all in meeting
      io.to(meetingId).emit("chat:message", chatEntry);
    });

    // EVENT: participant:mute/unmute
    socket.on("participant:mute", (data) => {
      const { meetingId, type } = data; // type: 'audio' | 'video'

      const meeting = activeMeetings.get(meetingId);
      if (meeting?.participants.has(userId)) {
        if (type === "audio") {
          meeting.participants.get(userId).isAudioOn = false;
        } else if (type === "video") {
          meeting.participants.get(userId).isVideoOn = false;
        }
      }

      console.log(`🔇 [participant:mute]: ${userId} muted ${type}`);

      io.to(meetingId).emit("participants:updated", {
        participants: Array.from(meeting?.participants.values() || []),
      });
    });

    socket.on("participant:unmute", (data) => {
      const { meetingId, type } = data;

      const meeting = activeMeetings.get(meetingId);
      if (meeting?.participants.has(userId)) {
        if (type === "audio") {
          meeting.participants.get(userId).isAudioOn = true;
        } else if (type === "video") {
          meeting.participants.get(userId).isVideoOn = true;
        }
      }

      console.log(`🔊 [participant:unmute]: ${userId} unmuted ${type}`);

      io.to(meetingId).emit("participants:updated", {
        participants: Array.from(meeting?.participants.values() || []),
      });
    });

    // EVENT: screen:share:start
    socket.on("screen:share:start", (data) => {
      const { meetingId } = data;

      console.log(`📺 [screen:share:start]: ${userId} started screen share`);

      io.to(meetingId).emit("screen:share:started", {
        userId,
        socketId: socket.id,
      });
    });

    // EVENT: screen:share:stop
    socket.on("screen:share:stop", (data) => {
      const { meetingId } = data;

      console.log(`📺 [screen:share:stop]: ${userId} stopped screen share`);

      io.to(meetingId).emit("screen:share:stopped", {
        userId,
      });
    });

    // EVENT: recording:start
    socket.on("recording:start", (data) => {
      const { meetingId } = data;

      const meeting = activeMeetings.get(meetingId);
      if (meeting) {
        meeting.recordingActive = true;
      }

      console.log(`🎥 [recording:start]: Meeting ${meetingId} recording started`);

      io.to(meetingId).emit("recording:started", {
        recordingStartedAt: new Date(),
      });
    });

    // EVENT: recording:stop
    socket.on("recording:stop", (data) => {
      const { meetingId } = data;

      const meeting = activeMeetings.get(meetingId);
      if (meeting) {
        meeting.recordingActive = false;
      }

      console.log(`🎥 [recording:stop]: Meeting ${meetingId} recording stopped`);

      io.to(meetingId).emit("recording:stopped", {
        recordingStoppedAt: new Date(),
      });
    });

    // EVENT: mention:user - Send notification on mention
    socket.on("mention:user", async (data) => {
      const { mentionedUserId, meetingId, message } = data;

      // Create notification
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

      socket.to(mentionedUserId).emit("notification:received", {
        type: "mention",
        message,
      });
    });

    // ==================== DISCONNECTION ====================

    socket.on("disconnect", () => {
      console.log(`🔌 [socket]: Disconnected: ${socket.id} (User: ${userId})`);

      // Clean up from all active meetings
      activeMeetings.forEach((meeting, meetingId) => {
        if (meeting.participants.has(userId)) {
          meeting.participants.delete(userId);
          io.to(meetingId).emit("participant:left", {
            userId,
            participants: Array.from(meeting.participants.values()),
          });

          if (meeting.participants.size === 0) {
            activeMeetings.delete(meetingId);
          }
        }
      });
    });
  });
};