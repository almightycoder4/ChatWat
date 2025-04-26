import React, { useState, useEffect, useRef } from 'react';
import { useChatStore, User } from '../stores/chatStore';
import { X, Search, User as UserIcon } from 'lucide-react';

interface UserSearchProps {
  onSelectUser: (user: User) => void;
  onClose?: () => void;
}

const UserSearch: React.FC<UserSearchProps> = ({ onSelectUser, onClose }) => {
  const [query, setQuery] = useState('');
  const { searchUsers, searchResults, searchQuery } = useChatStore();
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    // Focus the input when the component mounts
    inputRef.current?.focus();
  }, []);
  
  useEffect(() => {
    if (query.trim()) {
      const delayDebounceFn = setTimeout(() => {
        searchUsers(query);
      }, 300);
      
      return () => clearTimeout(delayDebounceFn);
    }
  }, [query, searchUsers]);
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };
  
  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };
  
  const handleUserSelect = (user: User) => {
    if (user && user._id) {
      onSelectUser(user);
    }
  };

  return (
    <div>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Search users..."
          value={query}
          onChange={handleSearch}
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-500" />
          </button>
        )}
      </div>
      
      {onClose && (
        <div className="flex justify-end mt-2">
          <button
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}
      
      {query.trim() && (
        <div className="mt-4">
          {searchQuery === query && searchResults.length > 0 ? (
            <ul className="space-y-2">
              {searchResults.map(user => (
                <li key={user._id}>
                  <button
                    onClick={() => handleUserSelect(user)}
                    className="w-full text-left flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50"
                  >
                    <div className="flex-shrink-0 relative">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.username}
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-gray-500" />
                        </div>
                      )}
                      <span className={`absolute bottom-0 right-0 block h-2 w-2 rounded-full ring-1 ring-white ${
                        user.status === 'online' ? 'bg-green-400' : 'bg-gray-300'
                      }`}></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.username}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : searchQuery === query && searchResults.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">No users found</p>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Searching...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserSearch;