import React, { useState, useRef } from 'react';
import { useChatStore } from '../stores/chatStore';
import { Smile, PaperclipIcon, Send, X, Image, Film } from 'lucide-react';

interface MessageInputProps {
  userId: string;
  onTyping: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ userId, onTyping }) => {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { sendMessage, sendMediaMessage } = useChatStore();
  
  const handleSend = async () => {
    if ((!message.trim() && !selectedFile) || isUploading) return;
    
    try {
      setIsUploading(true);
      
      if (selectedFile) {
        await sendMediaMessage(userId, message.trim(), selectedFile);
        setSelectedFile(null);
      } else {
        await sendMessage(userId, message.trim());
      }
      
      setMessage('');
    } catch (error) {
      console.error('Send message error:', error);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    
    if (files && files.length > 0) {
      const file = files[0];
      
      // Check file type
      if (!file.type.match('image.*') && !file.type.match('video.*')) {
        alert('Please select an image or video file');
        return;
      }
      
      // Check file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size should not exceed 10MB');
        return;
      }
      
      setSelectedFile(file);
      setShowAttachMenu(false);
    }
  };
  
  return (
    <div className="border-t border-gray-200 bg-white p-4">
      {selectedFile && (
        <div className="mb-3 p-2 bg-gray-100 rounded flex items-center justify-between">
          <div className="flex items-center overflow-hidden">
            {selectedFile.type.startsWith('image/') ? (
              <Image className="h-5 w-5 text-gray-500 mr-2" />
            ) : (
              <Film className="h-5 w-5 text-gray-500 mr-2" />
            )}
            <span className="text-sm truncate">{selectedFile.name}</span>
          </div>
          <button
            onClick={() => setSelectedFile(null)}
            className="p-1 text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      
      <div className="flex items-end space-x-2">
        <div className="relative">
          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            title="Attach file"
          >
            <PaperclipIcon className="h-5 w-5" />
          </button>
          
          {showAttachMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2">
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded w-full text-left"
              >
                <Image className="h-5 w-5 text-blue-500" />
                <span>Image/Video</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}
        </div>
        
        <button className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100">
          <Smile className="h-5 w-5" />
        </button>
        
        <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden">
          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              onTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="w-full resize-none bg-transparent border-0 p-2 focus:ring-0 focus:outline-none"
            rows={1}
            style={{ maxHeight: '120px' }}
          />
        </div>
        
        <button
          onClick={handleSend}
          disabled={(!message.trim() && !selectedFile) || isUploading}
          className={`p-2 rounded-full ${
            !message.trim() && !selectedFile
              ? 'text-gray-400 bg-gray-100'
              : 'text-white bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isUploading ? (
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default MessageInput;