import { Server, Socket } from "socket.io";

export const initializeSockets = (io: Server) => {
io.on("connection", (socket: Socket) => {
    console.log(`📡 [socket]: New connection: ${socket.id}`);

    socket.on("join-room", (meetingId: string, userId: string) => {
    socket.join(meetingId);
    console.log(`👥 [socket]: User ${userId} joined room: ${meetingId}`);

      // Tell others in the room to call this new user
    socket.to(meetingId).emit("user-connected", userId);
    });

    // Relay the Offer (The "Calling..." signal)
    socket.on("offer", (payload) => {
    console.log(`📞 [socket]: Relay Offer from ${payload.callerID} to ${payload.userToSignal}`);
    io.to(payload.userToSignal).emit("offer", {
        signal: payload.signal,
        callerID: payload.callerID,
    });
    });

    // Relay the Answer (The "Picked up!" signal)
    socket.on("answer", (payload) => {
    console.log(`✅ [socket]: Relay Answer from ${socket.id} to ${payload.callerID}`);
    io.to(payload.callerID).emit("answer", {
        signal: payload.signal,
        id: socket.id,
    });
    });

    socket.on("disconnect", () => {
    console.log(`🔌 [socket]: Disconnected: ${socket.id}`);
    });
});
};