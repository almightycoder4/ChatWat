import { create } from 'zustand';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { toast } from 'react-toastify';
import { API_URL } from '../utils/constants';
import { useAuthStore } from './authStore';
import { getEncryptionKey } from '../utils/encryption';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  status: 'online' | 'offline';
  lastSeen?: Date;
}

export interface Message {
  _id: string;
  sender: string;
  recipient: string;
  content: string;
  media?: string;
  mediaType?: 'image' | 'video';
  read: boolean;
  createdAt: string;
  encrypted: boolean;
}

interface ChatState {
  activeChat: string | null;
  conversations: Record<string, Message[]>;
  contacts: User[];
  isTyping: Record<string, boolean>;
  currentlyTyping: boolean;
  loadingContacts: boolean;
  loadingMessages: boolean;
  searchResults: User[];
  searchQuery: string;
  deletingMessage: boolean;
  deletingConversation: boolean;
  setActiveChat: (userId: string | null) => void;
  fetchContacts: () => Promise<void>;
  fetchMessages: (userId: string) => Promise<void>;
  sendMessage: (recipientId: string, content: string) => Promise<void>;
  sendMediaMessage: (recipientId: string, content: string, file: File) => Promise<void>;
  markAsRead: (senderId: string) => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
  setTypingStatus: (userId: string, isTyping: boolean) => void;
  setCurrentlyTyping: (typing: boolean) => void;
  updateUserStatus: (userId: string, status: 'online' | 'offline') => void;
  addMessage: (message: Message) => void;
  deleteMessage: (messageId: string, userId: string) => Promise<void>;
  deleteConversation: (userId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  activeChat: null,
  conversations: {},
  contacts: [],
  isTyping: {},
  currentlyTyping: false,
  loadingContacts: false,
  loadingMessages: false,
  searchResults: [],
  searchQuery: '',
  deletingMessage: false,
  deletingConversation: false,
  
  setActiveChat: async (userId) => {
    set({ activeChat: userId });
    if (userId) {
      // Fetch user details and add to contacts if not already present
      const { token } = useAuthStore.getState();
      if (!token) return;
      
      try {
        const res = await axios.get(`${API_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const user = res.data.user;
        set(state => ({
          contacts: state.contacts.some(contact => contact._id === userId)
            ? state.contacts
            : [...state.contacts, user]
        }));
        
        // Fetch messages for the active chat
        await get().fetchMessages(userId);
      } catch (error) {
        console.error('Set active chat error:', error);
        toast.error('Failed to load chat');
      }
    }
  },
  
  fetchContacts: async () => {
    const { token } = useAuthStore.getState();
    
    if (!token) return;
    
    set({ loadingContacts: true });
    
    try {
      // Get all users from search results and recent chats
      const recentChats = Object.keys(get().conversations);
      const searchResults = get().searchResults;
      
      // Combine unique user IDs
      const uniqueUserIds = [...new Set([...recentChats, ...searchResults.map(user => user._id)])];
      
      const contactPromises = uniqueUserIds.map(userId => 
        axios.get(`${API_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      
      const responses = await Promise.all(contactPromises);
      const contacts = responses.map(res => res.data.user);
      
      set({ contacts, loadingContacts: false });
    } catch (error) {
      console.error('Fetch contacts error:', error);
      set({ loadingContacts: false });
    }
  },
  
  fetchMessages: async (userId) => {
    const { token } = useAuthStore.getState();
    
    if (!token) return;
    
    set({ loadingMessages: true });
    
    try {
      const res = await axios.get(`${API_URL}/messages/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const messages = res.data.messages;
      
      // Decrypt message content if encrypted
      const decryptedMessages = messages.map((msg: Message) => {
        if (msg.encrypted && msg.content) {
          try {
            const key = getEncryptionKey();
            const decrypted = CryptoJS.AES.decrypt(msg.content, key).toString(CryptoJS.enc.Utf8);
            return { ...msg, content: decrypted };
          } catch (error) {
            console.error('Decryption error:', error);
            return msg;
          }
        }
        return msg;
      });
      
      set(state => ({
        conversations: {
          ...state.conversations,
          [userId]: decryptedMessages
        },
        loadingMessages: false
      }));
    } catch (error) {
      console.error('Fetch messages error:', error);
      set({ loadingMessages: false });
    }
  },
  
  sendMessage: async (recipientId, content) => {
    const { token } = useAuthStore.getState();
    const { user } = useAuthStore.getState();
    
    if (!token || !user) return;
    
    // Validate recipient exists in contacts
    const recipient = get().contacts.find(contact => contact._id === recipientId);
    if (!recipient) {
      toast.error('Invalid recipient');
      return;
    }
    
    try {
      // Encrypt message content
      const key = getEncryptionKey();
      const encryptedContent = CryptoJS.AES.encrypt(content, key).toString();
      
      const res = await axios.post(`${API_URL}/messages`, {
        recipientId,
        content: encryptedContent
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const message = res.data.message;
      
      // Add the decrypted message to the store for display
      const decryptedMessage = { ...message, content };
      
      set(state => ({
        conversations: {
          ...state.conversations,
          [recipientId]: [
            ...(state.conversations[recipientId] || []),
            decryptedMessage
          ]
        }
      }));
      
      // Emit the message via socket for real-time updates
      import('../utils/socket').then(({ emitPrivateMessage }) => {
        emitPrivateMessage(recipientId, message);
      });
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
    }
  },
  
  sendMediaMessage: async (recipientId, content, file) => {
    const { token } = useAuthStore.getState();
    const { user } = useAuthStore.getState();
    
    if (!token || !user) return;
    
    try {
      // Encrypt message content
      const key = getEncryptionKey();
      const encryptedContent = content ? CryptoJS.AES.encrypt(content, key).toString() : '';
      
      const formData = new FormData();
      formData.append('recipientId', recipientId);
      formData.append('content', encryptedContent);
      formData.append('media', file);
      
      const res = await axios.post(`${API_URL}/messages/media`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const message = res.data.message;
      
      // Add the decrypted message to the store for display
      const decryptedMessage = { ...message, content: content || '' };
      
      set(state => ({
        conversations: {
          ...state.conversations,
          [recipientId]: [
            ...(state.conversations[recipientId] || []),
            decryptedMessage
          ]
        }
      }));
    } catch (error) {
      console.error('Send media message error:', error);
      toast.error('Failed to send media');
    }
  },
  
  markAsRead: async (senderId) => {
    const { token } = useAuthStore.getState();
    
    if (!token) return;
    
    try {
      await axios.put(`${API_URL}/messages/read/${senderId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local messages
      set(state => {
        const conversation = state.conversations[senderId];
        
        if (!conversation) return state;
        
        const updatedConversation = conversation.map(msg => 
          msg.sender === senderId && !msg.read ? { ...msg, read: true } : msg
        );
        
        return {
          conversations: {
            ...state.conversations,
            [senderId]: updatedConversation
          }
        };
      });
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  },
  
  searchUsers: async (query) => {
    const { token } = useAuthStore.getState();
    
    if (!token || !query.trim()) {
      set({ searchResults: [], searchQuery: '' });
      return;
    }
    
    set({ searchQuery: query });
    
    try {
      const res = await axios.get(`${API_URL}/users/search?query=${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      set({ searchResults: res.data.users });
    } catch (error) {
      console.error('Search users error:', error);
      set({ searchResults: [] });
    }
  },
  
  setTypingStatus: (userId, isTyping) => {
    console.log(userId,'userId');
    console.log(isTyping,'isTyping');
    set(state => ({
      isTyping: {
        ...state.isTyping,
        [userId]: isTyping
      }
    }));
  },
  
  setCurrentlyTyping: (typing) => {
    set({ currentlyTyping: typing });
  },
  
  updateUserStatus: (userId, status) => {
    set(state => {
      // Update in contacts
      const updatedContacts = state.contacts.map(contact => 
        contact._id === userId ? { ...contact, status } : contact
      );
      
      // Update in search results
      const updatedSearchResults = state.searchResults.map(user => 
        user._id === userId ? { ...user, status } : user
      );
      
      return {
        contacts: updatedContacts,
        searchResults: updatedSearchResults
      };
    });
  },
  
  addMessage: (message) => {
    const { user } = useAuthStore.getState();
    
    if (!user) return;
    
    // Determine the conversation partner (sender or recipient)
    const conversationPartnerId = message.sender === user._id ? message.recipient : message.sender;
    
    // Decrypt message if encrypted
    let decryptedMessage = message;
    if (message.encrypted && message.content) {
      try {
        const key = getEncryptionKey();
        const decrypted = CryptoJS.AES.decrypt(message.content, key).toString(CryptoJS.enc.Utf8);
        decryptedMessage = { ...message, content: decrypted };
      } catch (error) {
        console.error('Decryption error:', error);
      }
    }
    
    // Check if this message already exists in the conversation to avoid duplicates
    const existingConversation = get().conversations[conversationPartnerId] || [];
    const messageExists = existingConversation.some(msg => msg._id === message._id);
    
    if (!messageExists) {
      set(state => ({
        conversations: {
          ...state.conversations,
          [conversationPartnerId]: [
            ...(state.conversations[conversationPartnerId] || []),
            decryptedMessage
          ]
        }
      }));
      
      // Mark message as read if it's an incoming message and the chat is active
      if (message.sender !== user._id && get().activeChat === message.sender) {
        get().markAsRead(message.sender);
      }
    }
  },
  
  deleteMessage: async (messageId, userId) => {
    const { token } = useAuthStore.getState();
    
    if (!token) return;
    
    set({ deletingMessage: true });
    
    try {
      await axios.delete(`${API_URL}/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state by removing the message
      set(state => {
        const conversation = state.conversations[userId];
        
        if (!conversation) return state;
        
        const updatedConversation = conversation.filter(msg => msg._id !== messageId);
        
        return {
          conversations: {
            ...state.conversations,
            [userId]: updatedConversation
          },
          deletingMessage: false
        };
      });
      
      toast.success('Message deleted');
    } catch (error) {
      console.error('Delete message error:', error);
      toast.error('Failed to delete message');
      set({ deletingMessage: false });
    }
  },
  
  deleteConversation: async (userId) => {
    const { token } = useAuthStore.getState();
    
    if (!token) return;
    
    set({ deletingConversation: true });
    
    try {
      await axios.delete(`${API_URL}/messages/conversations/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state by removing the conversation
      set(state => {
        const { [userId]: _, ...remainingConversations } = state.conversations;
        
        return {
          conversations: remainingConversations,
          deletingConversation: false
        };
      });
      
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Delete conversation error:', error);
      toast.error('Failed to delete conversation');
      set({ deletingConversation: false });
    }
  }
}));