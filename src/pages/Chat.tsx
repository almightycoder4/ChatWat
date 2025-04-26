import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useCallStore } from '../stores/callStore';
import { initializeSocket, disconnectSocket, emitTyping } from '../utils/socket';
import { TYPING_TIMEOUT } from '../utils/constants';

// Components
import Sidebar from '../components/Sidebar';
import ChatHeader from '../components/ChatHeader';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import UserSearch from '../components/UserSearch';
import IncomingCallDialog from '../components/IncomingCallDialog';
import VideoCall from '../components/VideoCall';

const Chat: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  const { user, logout } = useAuthStore();
  const { activeChat, setActiveChat, fetchMessages, markAsRead, setCurrentlyTyping } = useChatStore();
  const { isCallInProgress, incomingCall, setupCallHandlers } = useCallStore();
  
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Initialize socket connection
  useEffect(() => {
    initializeSocket();
    setupCallHandlers();
    
    return () => {
      disconnectSocket();
    };
  }, [setupCallHandlers]);
  
  // Set active chat when userId changes
  useEffect(() => {
    if (userId) {
      setActiveChat(userId);
    }
  }, [userId, setActiveChat]);
  
  // Fetch messages for active chat
  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat);
      markAsRead(activeChat);
    }
  }, [activeChat, fetchMessages, markAsRead]);
  
  // Handle typing indicator
  const handleTyping = () => {
    setCurrentlyTyping(true);
    
    if (activeChat) {
      emitTyping(activeChat, true);
    }
    
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    const timeout = setTimeout(() => {
      setCurrentlyTyping(false);
      
      if (activeChat) {
        emitTyping(activeChat, false);
      }
    }, TYPING_TIMEOUT);
    
    setTypingTimeout(timeout);
  };
  
  // Clean up typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [typingTimeout]);
  
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  if (isCallInProgress) {
    return <VideoCall />;
  }
  
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Main chat layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          isMobileOpen={isMobileSidebarOpen} 
          onClose={() => setIsMobileSidebarOpen(false)}
          onLogout={handleLogout}
        />
        
        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeChat ? (
            <>
              <ChatHeader 
                userId={activeChat} 
                onMobileMenuClick={() => setIsMobileSidebarOpen(true)} 
              />
              <MessageList userId={activeChat} />
              <MessageInput userId={activeChat} onTyping={handleTyping} />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900">Welcome, {user?.username}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Select a conversation or search for users to start chatting
                </p>
                <div className="mt-6 max-w-sm mx-auto">
                  <UserSearch onSelectUser={(user) => navigate(`/chat/${user._id}`)} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Incoming call dialog */}
      {incomingCall.isReceiving && <IncomingCallDialog />}
    </div>
  );
};

export default Chat;