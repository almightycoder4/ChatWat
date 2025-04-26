import React, { useEffect, useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useCallStore } from '../stores/callStore';
import { Phone, Video, Menu, User, Trash2, X } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../utils/constants';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';

interface ChatHeaderProps {
  userId: string;
  onMobileMenuClick: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ userId, onMobileMenuClick }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { isTyping, deleteConversation, deletingConversation } = useChatStore();
  const { initiateCall } = useCallStore();
  
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        
        const res = await axios.get(`${API_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setUser(res.data.user);
      } catch (error) {
        console.error('Fetch user error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (userId && token) {
      fetchUser();
    }
  }, [userId, token]);
  
  const handleVoiceCall = () => {
    initiateCall(userId, 'audio');
  };
  
  const handleVideoCall = () => {
    initiateCall(userId, 'video');
  };
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="px-4 sm:px-6 py-2 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMobileMenuClick}
            className="p-1 rounded-md text-gray-400 hover:text-gray-500 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          {loading ? (
            <div className="animate-pulse flex items-center space-x-3">
              <div className="rounded-full bg-gray-200 h-10 w-10"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 relative">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="h-10 w-10 rounded-full"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-500" />
                  </div>
                )}
                <span className={`absolute bottom-0 right-0 block h-2 w-2 rounded-full ring-1 ring-white ${
                  user?.status === 'online' ? 'bg-green-400' : 'bg-gray-300'
                }`}></span>
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  {user?.username}

                </h2>
                <p className="text-sm text-gray-500">
                  {isTyping[userId] ? (
                    <span className="text-blue-500">typing...</span>
                  ) : (
                    user?.status === 'online' ? 'Online' : 'Offline'
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleVoiceCall}
            className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            title="Voice Call"
          >
            <Phone className="h-5 w-5" />
          </button>
          <button
            onClick={handleVideoCall}
            className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            title="Video Call"
          >
            <Video className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-gray-100"
            title="Delete Conversation"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Delete conversation confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Delete Conversation</h3>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4">Are you sure you want to delete this entire conversation? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={deletingConversation}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteConversation(userId);
                  setShowDeleteConfirm(false);
                  navigate('/');
                }}
                className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700 focus:outline-none"
                disabled={deletingConversation}
              >
                {deletingConversation ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHeader;