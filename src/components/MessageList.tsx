import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { formatDistanceToNow } from 'date-fns';
import { User, Check, CheckCheck, Trash2, MoreVertical, X } from 'lucide-react';

interface MessageListProps {
  userId: string;
}

const MessageList: React.FC<MessageListProps> = ({ userId }) => {
  const { user } = useAuthStore();
  const { conversations, loadingMessages, fetchMessages, deleteMessage, deletingMessage } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const messages = conversations[userId] || [];
  
  useEffect(() => {
    fetchMessages(userId);
  }, [userId, fetchMessages]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Group messages by date
  const groupedMessages: { [date: string]: typeof messages } = {};
  
  messages.forEach(message => {
    const date = new Date(message.createdAt).toLocaleDateString();
    if (!groupedMessages[date]) {
      groupedMessages[date] = [];
    }
    groupedMessages[date].push(message);
  });
  
  if (loadingMessages) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 p-4 overflow-y-auto">
      {Object.entries(groupedMessages).map(([date, dateMessages]) => (
        <div key={date}>
          <div className="flex justify-center my-4">
            <div className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-500">
              {date === new Date().toLocaleDateString() ? 'Today' : date}
            </div>
          </div>
          
          {dateMessages.map(message => {
            const isOwn = message.sender === user?.id;
            
            return (
              <div
                key={message._id}
                className={`flex mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-[70%] ${isOwn ? 'flex-row-reverse' : ''} group`}>
                  {!isOwn && (
                    <div className="flex-shrink-0 mr-3">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-500" />
                      </div>
                    </div>
                  )}
                  
                  <div className={`${isOwn ? 'mr-3' : ''} relative`}>
                    <div
                      className={`text-sm py-2 px-4 shadow-sm rounded-lg ${
                        isOwn
                          ? 'bg-blue-500 text-white rounded-tr-none'
                          : 'bg-white border border-gray-200 rounded-tl-none'
                      }`}
                    >
                      {message.content}
                      
                      {message.media && (
                        <div className="mt-2">
                          {message.mediaType === 'image' ? (
                            <img
                              src={`${API_URL}/${message.media}`}
                              alt="Shared image"
                              className="rounded max-w-full h-auto"
                            />
                          ) : message.mediaType === 'video' ? (
                            <video
                              src={`${API_URL}/${message.media}`}
                              controls
                              className="rounded max-w-full h-auto"
                            />
                          ) : null}
                        </div>
                      )}
                      
                      {/* Delete message button (only visible on hover) */}
                      <button
                        onClick={() => {
                          setMessageToDelete(message._id);
                          setShowDeleteConfirm(true);
                        }}
                        className={`absolute ${isOwn ? 'left-0' : 'right-0'} top-0 -m-2 p-1 rounded-full bg-white shadow-md text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity`}
                        title="Delete message"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    
                    <div
                      className={`text-xs mt-1 text-gray-500 flex items-center ${
                        isOwn ? 'justify-end' : ''
                      }`}
                    >
                      {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                      
                      {isOwn && (
                        <span className="ml-1">
                          {message.read ? (
                            <CheckCheck className="h-3 w-3 text-blue-500" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
          <div className="mb-4 p-4 rounded-full bg-gray-100 inline-block">
            <MessageSquare className="h-8 w-8 text-gray-400" />
          </div>
          <p>No messages yet</p>
          <p className="text-sm mt-1">Start a conversation</p>
        </div>
      )}
      
      <div ref={messagesEndRef} />
      
      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Delete Message</h3>
              <button 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setMessageToDelete(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4">Are you sure you want to delete this message? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setMessageToDelete(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={deletingMessage}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (messageToDelete) {
                    deleteMessage(messageToDelete, userId);
                    setShowDeleteConfirm(false);
                    setMessageToDelete(null);
                  }
                }}
                className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700 focus:outline-none"
                disabled={deletingMessage}
              >
                {deletingMessage ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import { MessageSquare } from 'lucide-react';
import { API_URL } from '../utils/constants';

export default MessageList;