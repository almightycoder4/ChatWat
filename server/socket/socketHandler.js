import User from '../models/User.js';
import jwt from 'jsonwebtoken';

// Map to store active users: userId -> socketId
const activeUsers = new Map();
// Map to store typing status: userId -> { recipientId -> boolean }
const typingUsers = new Map();

export const socketHandler = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      
      // Update user status to online
      await User.findByIdAndUpdate(decoded.id, { status: 'online' });
      
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);
    
    // Add user to active users
    activeUsers.set(socket.userId, socket.id);
    
    // Initialize typing status for user
    if (!typingUsers.has(socket.userId)) {
      typingUsers.set(socket.userId, new Map());
    }
    
    // Broadcast user status to all connected clients
    io.emit('userStatus', {
      userId: socket.userId,
      status: 'online'
    });
    
    // Handle private messages
    socket.on('privateMessage', async ({ recipientId, message }) => {
      const recipientSocketId = activeUsers.get(recipientId);
      
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('newMessage', {
          senderId: socket.userId,
          message
        });
      }
    });
    
    // Handle typing status
    socket.on('typing', ({ recipientId, isTyping }) => {
      const recipientSocketId = activeUsers.get(recipientId);
      
      // Update typing status
      typingUsers.get(socket.userId).set(recipientId, isTyping);
      
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('userTyping', {
          senderId: socket.userId,
          isTyping
        });
      }
    });
    
    // Handle video/voice call signaling
    socket.on('callUser', ({ recipientId, signal, callType }) => {
      const recipientSocketId = activeUsers.get(recipientId);
      
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('incomingCall', {
          senderId: socket.userId,
          signal,
          callType
        });
      }
    });
    
    socket.on('answerCall', ({ recipientId, signal }) => {
      const recipientSocketId = activeUsers.get(recipientId);
      
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('callAccepted', {
          senderId: socket.userId,
          signal
        });
      }
    });
    
    socket.on('endCall', ({ recipientId }) => {
      const recipientSocketId = activeUsers.get(recipientId);
      
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('callEnded');
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.userId}`);
      
      // Remove user from active users
      activeUsers.delete(socket.userId);
      
      // Clear typing status
      typingUsers.delete(socket.userId);
      
      // Update user status to offline
      await User.findByIdAndUpdate(socket.userId, {
        status: 'offline',
        lastSeen: Date.now()
      });
      
      // Broadcast user status to all connected clients
      io.emit('userStatus', {
        userId: socket.userId,
        status: 'offline'
      });
    });
  });
};