import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { X, Search, LogOut, MessageSquare, User } from 'lucide-react';
import UserSearch from './UserSearch';
import { formatDistanceToNow } from 'date-fns';

interface SidebarProps {
  isMobileOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onClose, onLogout }) => {
  const { user } = useAuthStore();
  const { conversations, contacts, loadingContacts, fetchContacts, isTyping, activeChat } = useChatStore();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts, conversations]);
  const handleSelectUser = (user: any) => {
    // Set active chat in the store
    const { setActiveChat } = useChatStore.getState();
    setActiveChat(user._id);
    
    // Navigate to the chat route
    navigate(`/chat/${user._id}`);
    
    // Close the search and sidebar on mobile
    setIsSearchOpen(false);
    onClose();
  };
  
  // Get list of users with conversations
  const conversationUsers = Object.keys(conversations).map(userId => {
    const contact = contacts.find(contact => contact._id === userId);
    return contact || null;
  }).filter(Boolean);
  
  return (
    <>
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden transition-opacity duration-300 ${
          isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      ></div>
      
      <div
        className={`absolute inset-y-0 left-0 flex flex-col w-72 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar header */}
        <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-6 w-6 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">SecureChat</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-500 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* User profile */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-500" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.username}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="p-1 rounded-md text-gray-400 hover:text-gray-500"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          {isSearchOpen ? (
            <UserSearch onSelectUser={handleSelectUser} onClose={() => setIsSearchOpen(false)} />
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center px-3 py-2 text-sm text-gray-500 rounded-md border border-gray-300 hover:bg-gray-50"
            >
              <Search className="h-4 w-4 mr-2" />
              Search users...
            </button>
          )}
        </div>
        
        {/* Conversations */}
        <div className="flex-1 overflow-y-auto py-2">
          <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Recent Conversations
          </h3>
          
          {loadingContacts ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : conversationUsers.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {conversationUsers.map((contact) => (
                <li key={contact!._id}>
                  <Link
                    to={`/chat/${contact!._id}`}
                    className={`block px-4 py-2 text-sm hover:bg-gray-50 relative ${
                      activeChat === contact!.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 relative">
                        {contact!.avatar ? (
                          <img
                            src={contact!.avatar}
                            alt={contact!.username}
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-500" />
                          </div>
                        )}
                        <span className={`absolute bottom-0 right-0 block h-2 w-2 rounded-full ring-1 ring-white ${
                          contact!.status === 'online' ? 'bg-green-400' : 'bg-gray-300'
                        }`}></span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {contact!.username}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {isTyping[contact!._id] ? (
                            <span className="text-blue-500">typing...</span>
                          ) : (
                            contact!.status === 'offline' && contact!.lastSeen ? (
                              `Last seen ${formatDistanceToNow(new Date(contact!.lastSeen))} ago`
                            ) : (
                              contact!.status === 'online' ? 'Online' : 'Offline'
                            )
                          )}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-500">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Search for users to start chatting
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;