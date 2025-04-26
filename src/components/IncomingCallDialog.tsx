import React from 'react';
import { useCallStore } from '../stores/callStore';
import { Phone, Video, X } from 'lucide-react';

const IncomingCallDialog: React.FC = () => {
  const { incomingCall, answerCall, rejectCall } = useCallStore();
  
  if (!incomingCall.isReceiving) {
    return null;
  }
  
  const isVideoCall = incomingCall.callType === 'video';
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl overflow-hidden max-w-md w-full mx-4">
        <div className="bg-blue-500 p-4 text-white text-center">
          <h3 className="text-lg font-semibold">
            Incoming {isVideoCall ? 'Video' : 'Voice'} Call
          </h3>
        </div>
        
        <div className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center">
              {isVideoCall ? (
                <Video className="h-10 w-10 text-blue-500" />
              ) : (
                <Phone className="h-10 w-10 text-blue-500" />
              )}
            </div>
          </div>
          
          <p className="text-lg font-medium text-gray-900 mb-6">
            From: {incomingCall.from}
          </p>
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={rejectCall}
              className="flex items-center justify-center p-4 rounded-full bg-red-100 text-red-600 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              title="Decline"
            >
              <X className="h-6 w-6" />
            </button>
            
            <button
              onClick={answerCall}
              className="flex items-center justify-center p-4 rounded-full bg-green-100 text-green-600 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              title="Accept"
            >
              {isVideoCall ? (
                <Video className="h-6 w-6" />
              ) : (
                <Phone className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallDialog;