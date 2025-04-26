import { create } from 'zustand';
import Peer from 'peerjs';
import { toast } from 'react-toastify';
import { useAuthStore } from './authStore';
import { v4 as uuidv4 } from 'uuid';

type CallType = 'audio' | 'video';

interface CallState {
  isCallInProgress: boolean;
  incomingCall: {
    isReceiving: boolean;
    from: string | null;
    callType: CallType | null;
    signal: any;
  };
  outgoingCall: {
    isCalling: boolean;
    to: string | null;
    callType: CallType | null;
  };
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peer: Peer | null;
  peerId: string | null;
  callId: string | null;
  initiateCall: (userId: string, callType: CallType) => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  setIncomingCall: (from: string | null, signal: any, callType: CallType | null) => void;
  setupCallHandlers: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  isCallInProgress: false,
  incomingCall: {
    isReceiving: false,
    from: null,
    callType: null,
    signal: null
  },
  outgoingCall: {
    isCalling: false,
    to: null,
    callType: null
  },
  localStream: null,
  remoteStream: null,
  peer: null,
  peerId: null,
  callId: null,
  
  initiateCall: async (userId, callType) => {
    try {
      const constraints = {
        audio: true,
        video: callType === 'video'
      };
      
      const localStream = await navigator.mediaDevices.getUserMedia(constraints);
      const peerId = `${useAuthStore.getState().user?._id || uuidv4()}-${Date.now()}`;
      const peer = new Peer(peerId, {
        debug: 3
      });
      
      set({
        localStream,
        peer,
        peerId,
        outgoingCall: {
          isCalling: true,
          to: userId,
          callType
        },
        callId: uuidv4()
      });
      
      peer.on('open', (id) => {
        const call = peer.call(userId, localStream, {
          metadata: { callType }
        });
        
        call.on('stream', (remoteStream) => {
          set({ remoteStream, isCallInProgress: true });
          
          // Reset outgoing call state
          set(state => ({
            outgoingCall: {
              ...state.outgoingCall,
              isCalling: false
            }
          }));
        });
        
        call.on('close', () => {
          get().endCall();
        });
        
        call.on('error', (err) => {
          console.error('Call error:', err);
          toast.error('Call failed');
          get().endCall();
        });
      });
    } catch (error) {
      console.error('Initiate call error:', error);
      toast.error('Failed to start call. Please check camera/microphone permissions.');
      get().endCall();
    }
  },
  
  answerCall: async () => {
    try {
      const { from, callType } = get().incomingCall;
      
      if (!from || !callType) {
        throw new Error('Invalid call information');
      }
      
      const constraints = {
        audio: true,
        video: callType === 'video'
      };
      
      const localStream = await navigator.mediaDevices.getUserMedia(constraints);
      const peerId = `${useAuthStore.getState().user?._id || uuidv4()}-${Date.now()}`;
      const peer = new Peer(peerId, {
        debug: 3
      });
      
      set({
        localStream,
        peer,
        peerId,
        isCallInProgress: true,
        incomingCall: {
          isReceiving: false,
          from: null,
          callType: null,
          signal: null
        }
      });
      
      peer.on('open', (id) => {
        peer.on('call', (call) => {
          call.answer(localStream);
          
          call.on('stream', (remoteStream) => {
            set({ remoteStream });
          });
          
          call.on('close', () => {
            get().endCall();
          });
          
          call.on('error', (err) => {
            console.error('Call error:', err);
            toast.error('Call failed');
            get().endCall();
          });
        });
      });
    } catch (error) {
      console.error('Answer call error:', error);
      toast.error('Failed to answer call. Please check camera/microphone permissions.');
      get().rejectCall();
    }
  },
  
  rejectCall: () => {
    set({
      incomingCall: {
        isReceiving: false,
        from: null,
        callType: null,
        signal: null
      }
    });
  },
  
  endCall: () => {
    // Stop media streams
    const { localStream, remoteStream, peer } = get();
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    // Close peer connection
    if (peer) {
      peer.destroy();
    }
    
    // Reset state
    set({
      isCallInProgress: false,
      localStream: null,
      remoteStream: null,
      peer: null,
      peerId: null,
      callId: null,
      outgoingCall: {
        isCalling: false,
        to: null,
        callType: null
      }
    });
  },
  
  setIncomingCall: (from, signal, callType) => {
    if (from && signal && callType) {
      set({
        incomingCall: {
          isReceiving: true,
          from,
          callType,
          signal
        }
      });
    } else {
      set({
        incomingCall: {
          isReceiving: false,
          from: null,
          callType: null,
          signal: null
        }
      });
    }
  },
  
  setupCallHandlers: () => {
    const peerId = `${useAuthStore.getState().user?._id}-${Date.now()}`;
    
    if (!peerId) return;
    
    const peer = new Peer(peerId, {
      debug: 3
    });
    
    set({ peer, peerId });
    
    peer.on('open', (id) => {
      console.log('Peer connection opened with ID:', id);
      
      peer.on('call', async (call) => {
        const callType = call.metadata?.callType || 'audio';
        
        set({
          incomingCall: {
            isReceiving: true,
            from: call.peer,
            callType,
            signal: call
          }
        });
      });
    });
    
    peer.on('error', (err) => {
      console.error('Peer error:', err);
    });
  }
}));