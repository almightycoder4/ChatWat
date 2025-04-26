import { io } from 'socket.io-client';
import { SOCKET_URL } from './constants';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useCallStore } from '../stores/callStore';

let socket: any = null;

export const initializeSocket = () => {
  const { token, user } = useAuthStore.getState();
  
  if (!token || !user || socket) return;
  
  // Initialize socket connection
  socket = io(SOCKET_URL, {
    auth: { token }
  });
  
  // Socket event handlers
  socket.on('connect', () => {
    console.log('Socket connected');
  });
  
  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });
  
  socket.on('error', (error: any) => {
    console.error('Socket error:', error);
  });
  
  // Chat related events
  socket.on('newMessage', ({ senderId, message }: { senderId: string, message: any }) => {
    useChatStore.getState().addMessage(message);
  });
  
  socket.on('userTyping', ({ senderId, isTyping }: { senderId: string, isTyping: boolean }) => {
    useChatStore.getState().setTypingStatus(senderId, isTyping);
  });
  
  socket.on('userStatus', ({ userId, status }: { userId: string, status: 'online' | 'offline' }) => {
    useChatStore.getState().updateUserStatus(userId, status);
  });
  
  // Call related events
  socket.on('incomingCall', ({ senderId, signal, callType }: { senderId: string, signal: any, callType: 'audio' | 'video' }) => {
    useCallStore.getState().setIncomingCall(senderId, signal, callType);
  });
  
  socket.on('callAccepted', ({ senderId, signal }: { senderId: string, signal: any }) => {
    // Handle call accepted
  });
  
  socket.on('callEnded', () => {
    useCallStore.getState().endCall();
  });
  
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initializeSocket();
  }
  return socket;
};

export const emitTyping = (recipientId: string, isTyping: boolean) => {
  const socket = getSocket();
  if (socket) {
    socket.emit('typing', { recipientId, isTyping });
  }
};

export const emitPrivateMessage = (recipientId: string, message: any) => {
  const socket = getSocket();
  if (socket) {
    socket.emit('privateMessage', { recipientId, message });
  }
};

export const emitCallUser = (recipientId: string, signal: any, callType: 'audio' | 'video') => {
  const socket = getSocket();
  if (socket) {
    socket.emit('callUser', { recipientId, signal, callType });
  }
};

export const emitAnswerCall = (recipientId: string, signal: any) => {
  const socket = getSocket();
  if (socket) {
    socket.emit('answerCall', { recipientId, signal });
  }
};

export const emitEndCall = (recipientId: string) => {
  const socket = getSocket();
  if (socket) {
    socket.emit('endCall', { recipientId });
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};