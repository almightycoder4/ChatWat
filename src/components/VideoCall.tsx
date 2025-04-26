import React, { useEffect, useRef } from 'react';
import { useCallStore } from '../stores/callStore';
import { Mic, MicOff, Video, VideoOff, PhoneOff, User } from 'lucide-react';

const VideoCall: React.FC = () => {
  const { localStream, remoteStream, endCall, outgoingCall } = useCallStore();
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const [isMuted, setIsMuted] = React.useState(false);
  const [isVideoOff, setIsVideoOff] = React.useState(false);
  
  // Set up local and remote video streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);
  
  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };
  
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };
  
  const isVideoCall = outgoingCall.callType === 'video';
  
  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col">
      {/* Remote video (full screen) */}
      {remoteStream && (
        <div className="absolute inset-0">
          {isVideoCall ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <div className="h-32 w-32 rounded-full bg-gray-700 flex items-center justify-center">
                <User className="h-20 w-20 text-gray-400" />
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Local video (picture-in-picture) */}
      {localStream && (
        <div className="absolute top-4 right-4 w-1/4 max-w-xs rounded-lg overflow-hidden shadow-lg z-10">
          {isVideoCall && !isVideoOff ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full aspect-video bg-gray-800 flex items-center justify-center">
              <User className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>
      )}
      
      {/* Call controls */}
      <div className="absolute bottom-0 inset-x-0 p-4 flex justify-center items-center">
        <div className="bg-gray-800 bg-opacity-75 p-3 rounded-full flex items-center space-x-4">
          <button
            onClick={toggleMute}
            className={`p-3 rounded-full ${
              isMuted ? 'bg-red-500 text-white' : 'bg-gray-700 text-white'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>
          
          <button
            onClick={endCall}
            className="p-3 rounded-full bg-red-600 text-white"
            title="End Call"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
          
          {isVideoCall && (
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full ${
                isVideoOff ? 'bg-red-500 text-white' : 'bg-gray-700 text-white'
              }`}
              title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
            >
              {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCall;