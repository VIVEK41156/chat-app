import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { createSocketConnection } from '../services/socket';
import confetti from 'canvas-confetti';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export const ChatProvider = ({ children, initialUserId = null }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [activeFriend, setActiveFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [summary, setSummary] = useState({ unreadMessagesCount: 0, pendingRequestsCount: 0, friendsCount: 0 });
  const [typingMap, setTypingMap] = useState({}); // friendId -> boolean
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'friends' | 'requests'
  const [loading, setLoading] = useState(true);
  const [statusNotification, setStatusNotification] = useState(null);

  // WebRTC Voice Call States
  const [callState, setCallState] = useState('idle'); // 'idle' | 'outgoing' | 'incoming' | 'connected'
  const [activeCall, setActiveCall] = useState(null); // { callId, peerId, contactName, contactAvatar, isCaller }
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState('00:00');

  const [statusFeed, setStatusFeed] = useState({ myStatuses: [], friendsStatuses: [] });
  const [chatWallpaper, setChatWallpaperState] = useState(() => {
    try {
      const saved = localStorage.getItem('whatsapp_chat_wallpaper');
      return saved ? JSON.parse(saved) : { id: 'doodle_dark', name: 'WhatsApp Doodle (Dark)', className: 'whatsapp-chat-bg bg-[#0b141a]' };
    } catch {
      return { id: 'doodle_dark', name: 'WhatsApp Doodle (Dark)', className: 'whatsapp-chat-bg bg-[#0b141a]' };
    }
  });

  const setChatWallpaper = (wp) => {
    setChatWallpaperState(wp);
    try {
      localStorage.setItem('whatsapp_chat_wallpaper', JSON.stringify(wp));
    } catch (e) {
      console.error('Failed to save wallpaper preference:', e);
    }
  };

  const socketRef = useRef(null);
  const activeFriendRef = useRef(activeFriend);
  activeFriendRef.current = activeFriend;

  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const typingTimeoutRef = useRef(null);
  const incomingTypingTimers = useRef({});

  // WebRTC Refs
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const callTimerRef = useRef(null);
  const callStartTimeRef = useRef(null);
  const callStateRef = useRef('idle');
  callStateRef.current = callState;
  const activeCallRef = useRef(activeCall);
  activeCallRef.current = activeCall;

  // Show quick toast notification
  const showToast = (message, type = 'info') => {
    setStatusNotification({ message, type, id: Date.now() });
    setTimeout(() => {
      setStatusNotification(null);
    }, 4000);
  };

  // WebRTC Timer & Cleanup helpers
  const startCallTimer = () => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    callStartTimeRef.current = Date.now();
    setCallDuration('00:00');

    callTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      setCallDuration(`${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`);
    }, 1000);
  };

  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    setCallDuration('00:00');
  };

  const cleanupCall = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    stopCallTimer();
    setCallState('idle');
    callStateRef.current = 'idle';
    setActiveCall(null);
    activeCallRef.current = null;
    setIsMuted(false);
  }, []);

  const createPeerConnection = (targetPeerId) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // Send local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle remote track
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote audio stream track:', event.streams[0]);
      if (remoteAudioRef.current && event.streams && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch((err) => {
          console.warn('[WebRTC] Audio auto-play note:', err);
        });
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current && currentUserRef.current) {
        const dest = targetPeerId || activeCallRef.current?.peerId;
        if (dest) {
          socketRef.current.emit('webrtc:ice_candidate', {
            toUserId: dest,
            fromUserId: currentUserRef.current.id,
            candidate: event.candidate
          });
        }
      }
    };

    return pc;
  };

  // Start outgoing voice call
  const startVoiceCall = async (friend) => {
    if (!currentUser || !friend) return;
    if (callStateRef.current !== 'idle') {
      showToast('A call is already in progress', 'info');
      return;
    }

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch (err) {
        console.error('Microphone access error:', err);
        showToast('Microphone access is required for voice calling', 'error');
        return;
      }

      localStreamRef.current = stream;

      const callInfo = {
        callId: `call_${Date.now()}`,
        peerId: friend.id,
        contactName: friend.name,
        contactAvatar: friend.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${friend.username}`,
        isCaller: true
      };

      setActiveCall(callInfo);
      activeCallRef.current = callInfo;
      setCallState('outgoing');
      callStateRef.current = 'outgoing';

      const socket = socketRef.current;
      if (socket && socket.connected) {
        socket.emit('call:initiate', {
          toUserId: friend.id,
          callerId: currentUser.id,
          callerName: currentUser.name,
          callerAvatar: currentUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`,
          isVideo: false
        });
      }
    } catch (err) {
      console.error('Error starting voice call:', err);
      showToast('Failed to start voice call', 'error');
      cleanupCall();
    }
  };

  // Accept incoming call
  const acceptVoiceCall = async () => {
    const currentCall = activeCallRef.current;
    if (!currentUser || !currentCall) return;

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch (err) {
        console.error('Microphone access error:', err);
        showToast('Microphone access is required to accept the call', 'error');
        rejectVoiceCall();
        return;
      }

      localStreamRef.current = stream;
      createPeerConnection(currentCall.peerId);

      setCallState('connected');
      callStateRef.current = 'connected';
      startCallTimer();

      const socket = socketRef.current;
      if (socket && socket.connected) {
        socket.emit('call:accept', {
          callerId: currentCall.peerId,
          receiverId: currentUser.id,
          receiverName: currentUser.name
        });
      }
    } catch (err) {
      console.error('Error accepting call:', err);
      showToast('Failed to accept call', 'error');
      cleanupCall();
    }
  };

  // Reject incoming call
  const rejectVoiceCall = () => {
    const currentCall = activeCallRef.current;
    const socket = socketRef.current;
    if (currentCall && socket && socket.connected && currentUser) {
      socket.emit('call:reject', {
        callerId: currentCall.peerId,
        receiverId: currentUser.id,
        reason: 'Call declined'
      });
    }
    cleanupCall();
  };

  // End active call
  const endVoiceCall = () => {
    const currentCall = activeCallRef.current;
    const socket = socketRef.current;
    if (currentCall && socket && socket.connected && currentUser) {
      socket.emit('call:end', {
        toUserId: currentCall.peerId,
        fromUserId: currentUser.id
      });
    }
    cleanupCall();
    showToast('Call ended', 'info');
  };

  // Toggle Microphone Mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextMuted = !isMuted;
        audioTracks.forEach((track) => {
          track.enabled = !nextMuted;
        });
        setIsMuted(nextMuted);
      }
    } else {
      setIsMuted((prev) => !prev);
    }
  };

  // Toggle Speaker Output
  const toggleSpeaker = () => {
    setIsSpeakerOn((prev) => !prev);
  };

  // Fetch status feed
  const refreshStatuses = useCallback(async (userId = null) => {
    const uid = userId || currentUserRef.current?.id;
    if (!uid) return;
    try {
      const feed = await api.getStatusFeed(uid);
      setStatusFeed(feed || { myStatuses: [], friendsStatuses: [] });
    } catch (err) {
      console.error('Error fetching statuses:', err);
    }
  }, []);

  // Fetch person-wise summary & friends & requests
  const refreshData = useCallback(async (userId = null) => {
    const uid = userId || currentUserRef.current?.id;
    if (!uid) return;

    try {
      const [friendsList, requestsData, userSummary, usersList] = await Promise.all([
        api.getFriendsList(uid),
        api.getFriendRequests(uid),
        api.getUserSummary(uid),
        api.getUsers(uid)
      ]);

      setFriends(friendsList || []);
      setIncomingRequests(requestsData.incoming || []);
      setOutgoingRequests(requestsData.outgoing || []);
      setSummary(userSummary || {});
      setAllUsers(usersList || []);
      refreshStatuses(uid);
    } catch (err) {
      console.error('Error refreshing user data:', err);
    }
  }, [refreshStatuses]);

  // Setup Real-Time Socket Listeners
  const setupSocketListeners = (socket, userId) => {
    if (!socket) return;

    socket.off('message:receive');
    socket.off('message:status_update');
    socket.off('messages:delivered_batch');
    socket.off('messages:read_receipt');
    socket.off('user:presence');
    socket.off('typing:started');
    socket.off('typing:stopped');
    socket.off('friend:request_received');
    socket.off('friend:request_accepted');
    socket.off('friend:request_rejected');
    socket.off('messages:cleared');
    socket.off('message:expired');
    socket.off('friend:timer_updated');
    socket.off('status:created');
    socket.off('status:view_updated');
    socket.off('user:profile_updated');
    socket.off('message:edited');
    socket.off('message:deleted_everyone');
    socket.off('message:deleted_for_me');
    socket.off('call:incoming');
    socket.off('call:accepted');
    socket.off('call:rejected');
    socket.off('call:ended');
    socket.off('webrtc:offer');
    socket.off('webrtc:answer');
    socket.off('webrtc:ice_candidate');

    // 1. Incoming new message
    socket.on('message:receive', (newMsg) => {
      console.log('[Socket] message:receive:', newMsg);
      const active = activeFriendRef.current;

      if (active && (newMsg.sender_id === active.id || newMsg.receiver_id === active.id)) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        if (newMsg.sender_id === active.id) {
          socket.emit('messages:mark_read', {
            readerId: userId,
            friendId: active.id
          });
        }
      } else {
        showToast(`New message from ${newMsg.sender_name || 'a friend'}`, 'info');
      }

      refreshData(userId);
    });

    // 2. Message status update
    socket.on('message:status_update', (update) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === update.messageId ? { ...msg, status: update.status, delivered_at: update.delivered_at } : msg
        )
      );
    });

    // 3. Batch delivered update
    socket.on('messages:delivered_batch', ({ messageIds, deliveredAt }) => {
      const idSet = new Set(messageIds);
      setMessages((prev) =>
        prev.map((msg) => (idSet.has(msg.id) ? { ...msg, status: 'delivered', delivered_at: deliveredAt } : msg))
      );
    });

    // 4. Message Read Receipt
    socket.on('messages:read_receipt', ({ readerId, readAt }) => {
      const active = activeFriendRef.current;
      if (active && active.id === readerId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.sender_id === userId && msg.receiver_id === readerId
              ? { ...msg, status: 'read', read_at: readAt }
              : msg
          )
        );
      }
      refreshData(userId);
    });

    // 5. User presence update
    socket.on('user:presence', ({ userId: changedId, is_online, last_seen }) => {
      setFriends((prev) =>
        prev.map((f) => (f.id === changedId ? { ...f, is_online, last_seen } : f))
      );
      setAllUsers((prev) =>
        prev.map((u) => (u.id === changedId ? { ...u, is_online, last_seen } : u))
      );

      const active = activeFriendRef.current;
      if (active && active.id === changedId) {
        setActiveFriend((prev) => (prev ? { ...prev, is_online, last_seen } : null));
      }
    });

    // 6. Typing indicators
    socket.on('typing:started', ({ senderId, senderName }) => {
      setTypingMap((prev) => ({ ...prev, [senderId]: true }));

      if (incomingTypingTimers.current[senderId]) {
        clearTimeout(incomingTypingTimers.current[senderId]);
      }
      incomingTypingTimers.current[senderId] = setTimeout(() => {
        setTypingMap((prev) => {
          const next = { ...prev };
          delete next[senderId];
          return next;
        });
      }, 3500);
    });

    socket.on('typing:stopped', ({ senderId }) => {
      if (incomingTypingTimers.current[senderId]) {
        clearTimeout(incomingTypingTimers.current[senderId]);
      }
      setTypingMap((prev) => {
        const next = { ...prev };
        delete next[senderId];
        return next;
      });
    });

    // 7. Friend Request events
    socket.on('friend:request_received', (reqData) => {
      showToast(`🔔 Friend request received from ${reqData.name || reqData.username}!`, 'success');
      refreshData(userId);
    });

    socket.on('friend:request_accepted', ({ friend }) => {
      showToast(`🎉 You and ${friend.name} are now friends! You can start chatting.`, 'success');
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
      refreshData(userId);
    });

    socket.on('friend:request_rejected', () => {
      refreshData(userId);
    });

    // 8. Chat Cleared Event
    socket.on('messages:cleared', ({ friendId }) => {
      const active = activeFriendRef.current;
      if (active && active.id === friendId) {
        setMessages([]);
        showToast('Chat history was cleared', 'info');
      }
      refreshData(userId);
    });

    // 9. Disappearing Message Expired
    socket.on('message:expired', ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    // 10. Disappearing Timer Updated
    socket.on('friend:timer_updated', ({ friendId, timer }) => {
      setFriends((prev) =>
        prev.map((f) => (f.id === friendId ? { ...f, disappearingTimer: timer } : f))
      );
      const active = activeFriendRef.current;
      if (active && active.id === friendId) {
        setActiveFriend((prev) => (prev ? { ...prev, disappearingTimer: timer } : null));
      }
      showToast(
        timer === 0 ? 'Disappearing messages turned off' : `Disappearing messages set (${timer >= 86400 ? `${timer/86400}d` : `${timer}s`})`,
        'info'
      );
    });

    // 11. WhatsApp Stories / Status Events
    socket.on('status:created', () => {
      refreshStatuses(userId);
    });

    socket.on('status:view_updated', () => {
      refreshStatuses(userId);
    });

    // 12. User Profile / Custom Avatar Updated
    socket.on('user:profile_updated', ({ userId: updatedUserId, avatar, user }) => {
      if (currentUserRef.current?.id === updatedUserId) {
        setCurrentUser((prev) => (prev ? { ...prev, avatar, ...user } : prev));
      }
      setFriends((prev) =>
        prev.map((f) => (f.id === updatedUserId ? { ...f, avatar, ...user } : f))
      );
      setAllUsers((prev) =>
        prev.map((u) => (u.id === updatedUserId ? { ...u, avatar, ...user } : u))
      );
      const active = activeFriendRef.current;
      if (active && active.id === updatedUserId) {
        setActiveFriend((prev) => (prev ? { ...prev, avatar, ...user } : prev));
      }
    });

    // 13. Message Edited in Real-Time
    socket.on('message:edited', (updatedMsg) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === updatedMsg.id ? { ...msg, ...updatedMsg } : msg))
      );
    });

    // 14. Message Deleted for Everyone in Real-Time
    socket.on('message:deleted_everyone', ({ messageId, message }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, ...message, is_deleted_everyone: 1, content: '', file_url: null, file_name: null }
            : msg
        )
      );
    });

    // 15. Message Deleted for Me
    socket.on('message:deleted_for_me', ({ messageId }) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    });

    // ==========================================
    // WebRTC Voice Calling Socket Handlers
    // ==========================================

    // 16. Incoming Call
    socket.on('call:incoming', ({ callerId, callerName, callerAvatar }) => {
      console.log('[Socket] Incoming call from:', callerName, callerId);
      if (callStateRef.current !== 'idle') {
        socket.emit('call:reject', {
          callerId,
          receiverId: userId,
          reason: 'User is busy on another call'
        });
        return;
      }

      const callInfo = {
        callId: `call_${Date.now()}`,
        peerId: callerId,
        contactName: callerName || 'WhatsApp Friend',
        contactAvatar: callerAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${callerId}`,
        isCaller: false
      };

      setActiveCall(callInfo);
      activeCallRef.current = callInfo;
      setCallState('incoming');
      callStateRef.current = 'incoming';
    });

    // 17. Call Accepted by Receiver (Caller side)
    socket.on('call:accepted', async ({ receiverId, receiverName }) => {
      console.log('[Socket] Call accepted by:', receiverName || receiverId);
      if (callStateRef.current !== 'outgoing') return;

      setCallState('connected');
      callStateRef.current = 'connected';
      startCallTimer();

      try {
        const pc = createPeerConnection(receiverId);
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        });
        await pc.setLocalDescription(offer);

        socket.emit('webrtc:offer', {
          toUserId: receiverId,
          fromUserId: userId,
          offer
        });
      } catch (err) {
        console.error('[WebRTC] Failed to create SDP offer:', err);
        showToast('WebRTC connection failed', 'error');
        cleanupCall();
      }
    });

    // 18. Call Rejected
    socket.on('call:rejected', ({ reason }) => {
      console.log('[Socket] Call rejected:', reason);
      showToast(reason || 'Call was declined', 'info');
      cleanupCall();
    });

    // 19. Call Ended by Remote Peer
    socket.on('call:ended', () => {
      console.log('[Socket] Remote peer ended call');
      showToast('Call ended by other user', 'info');
      cleanupCall();
    });

    // 20. WebRTC SDP Offer Received (Receiver side)
    socket.on('webrtc:offer', async ({ fromUserId, offer }) => {
      console.log('[Socket] Received WebRTC offer from:', fromUserId);
      try {
        let pc = peerConnectionRef.current;
        if (!pc) {
          pc = createPeerConnection(fromUserId);
        }

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc:answer', {
          toUserId: fromUserId,
          fromUserId: userId,
          answer
        });
      } catch (err) {
        console.error('[WebRTC] Failed to handle SDP offer & send answer:', err);
      }
    });

    // 21. WebRTC SDP Answer Received (Caller side)
    socket.on('webrtc:answer', async ({ fromUserId, answer }) => {
      console.log('[Socket] Received WebRTC answer from:', fromUserId);
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.error('[WebRTC] Failed to set remote description answer:', err);
      }
    });

    // 22. WebRTC ICE Candidate Received
    socket.on('webrtc:ice_candidate', async ({ fromUserId, candidate }) => {
      try {
        if (peerConnectionRef.current && candidate) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('[WebRTC] Error adding ICE candidate:', err);
      }
    });
  };

  // Login or select user
  const selectUser = async (user) => {
    setLoading(true);
    cleanupCall();
    setCurrentUser(user);
    currentUserRef.current = user;
    setActiveFriend(null);
    activeFriendRef.current = null;
    setMessages([]);
    setTypingMap({});

    try {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const socket = createSocketConnection(user.id);
      socketRef.current = socket;
      setupSocketListeners(socket, user.id);

      await refreshData(user.id);
    } catch (err) {
      console.error('Error setting up user:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial boot
  useEffect(() => {
    const init = async () => {
      try {
        const users = await api.getUsers();
        setAllUsers(users || []);

        if (users && users.length > 0) {
          const target = initialUserId ? users.find((u) => u.id === initialUserId) || users[0] : users[0];
          await selectUser(target);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();

    return () => {
      cleanupCall();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [initialUserId, cleanupCall]);

  // Load chat history when active friend is clicked
  const openChatWithFriend = async (friend) => {
    if (!currentUser) return;
    setActiveFriend(friend);
    activeFriendRef.current = friend;
    setActiveTab('chats');

    try {
      const chatHistory = await api.getMessages(currentUser.id, friend.id);
      setMessages(chatHistory || []);

      const socket = socketRef.current;
      if (socket && socket.connected) {
        socket.emit('messages:mark_read', {
          readerId: currentUser.id,
          friendId: friend.id
        });
      }

      setFriends((prev) =>
        prev.map((f) => (f.id === friend.id ? { ...f, unreadCount: 0 } : f))
      );
    } catch (err) {
      console.error('Failed to load chat history:', err);
      showToast(err.response?.data?.error || 'Could not load chat messages', 'error');
    }
  };

  // Send regular text message
  const sendMessage = async (content, messageType = 'text') => {
    if (!currentUser || !activeFriend || !content.trim()) return;

    const socket = socketRef.current;
    const tempId = `tmp_${Date.now()}`;
    const now = new Date().toISOString();

    const optimisticMsg = {
      id: tempId,
      sender_id: currentUser.id,
      receiver_id: activeFriend.id,
      content: content.trim(),
      message_type: messageType,
      status: 'sent',
      created_at: now
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    emitTyping(false);

    if (socket && socket.connected) {
      socket.emit(
        'message:send',
        {
          sender_id: currentUser.id,
          receiver_id: activeFriend.id,
          content: content.trim(),
          message_type: messageType
        },
        (response) => {
          if (response?.error) {
            showToast(response.error, 'error');
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
          } else if (response?.message) {
            setMessages((prev) =>
              prev.map((m) => (m.id === tempId ? response.message : m))
            );
            refreshData(currentUser.id);
          }
        }
      );
    } else {
      try {
        const saved = await api.sendMessage(currentUser.id, activeFriend.id, content.trim(), messageType);
        setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
        refreshData(currentUser.id);
      } catch (err) {
        showToast(err.response?.data?.error || 'Failed to send message', 'error');
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    }
  };

  // Emit typing indicator with debounce
  const emitTyping = (isTyping) => {
    const socket = socketRef.current;
    const current = currentUserRef.current;
    const active = activeFriendRef.current;

    if (!current || !active || !socket) return;

    if (isTyping) {
      socket.emit('typing:start', {
        senderId: current.id,
        receiverId: active.id,
        senderName: current.name
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit('typing:stop', {
            senderId: current.id,
            receiverId: active.id
          });
        }
      }, 3000);
    } else {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.emit('typing:stop', {
        senderId: current.id,
        receiverId: active.id
      });
    }
  };

  // Send File / Attachment Message
  const sendFileMessage = async (file, caption = '', customType = null) => {
    if (!currentUser || !activeFriend || !file) return;

    const tempId = `tmp_file_${Date.now()}`;
    const now = new Date().toISOString();
    const localPreviewUrl = URL.createObjectURL(file);

    let detectedType = customType;
    if (!detectedType) {
      if (file.type.startsWith('image/')) detectedType = 'image';
      else if (file.type.startsWith('video/')) detectedType = 'video';
      else if (file.type.startsWith('audio/')) detectedType = 'audio';
      else detectedType = 'document';
    }

    const optimisticMsg = {
      id: tempId,
      sender_id: currentUser.id,
      receiver_id: activeFriend.id,
      content: caption || '',
      message_type: detectedType,
      file_url: localPreviewUrl,
      file_name: file.name,
      file_size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      status: 'sent',
      created_at: now
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    emitTyping(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sender_id', currentUser.id);
      formData.append('receiver_id', activeFriend.id);
      formData.append('content', caption || '');
      if (detectedType) formData.append('custom_type', detectedType);

      const savedMsg = await api.sendFileMessage(formData);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? savedMsg : m)));
      refreshData(currentUser.id);
    } catch (err) {
      console.error('File upload error:', err);
      showToast(err.response?.data?.error || 'Failed to send attachment', 'error');
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  // Edit sent message
  const editMessage = async (messageId, newContent) => {
    if (!currentUser || !messageId || !newContent.trim()) return;
    try {
      const res = await api.editMessage(messageId, currentUser.id, newContent);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, ...res.data } : m))
      );
      showToast('Message edited', 'success');
      return res.data;
    } catch (err) {
      console.error('Error editing message:', err);
      showToast(err.response?.data?.error || 'Failed to edit message', 'error');
      throw err;
    }
  };

  // Delete message for everyone (sender only)
  const deleteForEveryone = async (messageId) => {
    if (!currentUser || !messageId) return;
    try {
      const res = await api.deleteForEveryone(messageId, currentUser.id);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, ...res.data, is_deleted_everyone: 1, content: '', file_url: null, file_name: null }
            : m
        )
      );
      showToast('Message deleted for everyone', 'info');
      return res.data;
    } catch (err) {
      console.error('Error deleting for everyone:', err);
      showToast(err.response?.data?.error || 'Failed to delete message for everyone', 'error');
      throw err;
    }
  };

  // Delete message for me only
  const deleteForMe = async (messageId) => {
    if (!currentUser || !messageId) return;
    try {
      await api.deleteForMe(messageId, currentUser.id);
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      showToast('Message deleted for you', 'info');
    } catch (err) {
      console.error('Error deleting for me:', err);
      showToast(err.response?.data?.error || 'Failed to delete message for you', 'error');
      throw err;
    }
  };

  // Send friend request
  const sendFriendRequest = async (receiverId) => {
    if (!currentUser) return;
    try {
      const res = await api.sendFriendRequest(currentUser.id, receiverId);
      showToast(res.message || 'Friend request sent!', 'success');
      await refreshData(currentUser.id);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to send friend request', 'error');
    }
  };

  // Respond to friend request (accept / reject)
  const respondFriendRequest = async (requestId, action) => {
    if (!currentUser) return;
    try {
      const res = await api.respondFriendRequest(requestId, currentUser.id, action);
      if (action === 'accept') {
        showToast('Friend request accepted! You can now chat.', 'success');
        confetti({ particleCount: 70, spread: 50, origin: { y: 0.7 } });
      } else {
        showToast('Friend request declined.', 'info');
      }
      await refreshData(currentUser.id);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to respond to request', 'error');
    }
  };

  // Cancel pending sent friend request
  const cancelFriendRequest = async (requestId) => {
    if (!currentUser || !requestId) return;
    try {
      await api.cancelFriendRequest(requestId, currentUser.id);
      showToast('Friend request canceled', 'info');
      await refreshData(currentUser.id);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to cancel request', 'error');
    }
  };

  // Remove confirmed friend
  const removeFriend = async (friendId) => {
    if (!currentUser || !friendId) return;
    try {
      await api.removeFriend(currentUser.id, friendId);
      if (activeFriend?.id === friendId) {
        setActiveFriend(null);
      }
      showToast('Friend removed', 'info');
      await refreshData(currentUser.id);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to remove friend', 'error');
    }
  };

  // Register new user
  const registerUser = async (formData) => {
    try {
      const res = await api.register(formData);
      showToast('Account registered successfully!', 'success');
      await selectUser(res.user);
      return res.user;
    } catch (err) {
      showToast(err.response?.data?.error || 'Registration failed', 'error');
      throw err;
    }
  };

  // Clear Active Chat
  const clearActiveChat = async () => {
    if (!currentUser || !activeFriend) return;
    try {
      await api.clearChat(currentUser.id, activeFriend.id);
      setMessages([]);
      showToast('Chat history cleared', 'info');
      refreshData(currentUser.id);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to clear chat', 'error');
    }
  };

  // Update Disappearing Messages Timer
  const updateDisappearingTimer = async (timerSeconds) => {
    if (!currentUser || !activeFriend) return;
    try {
      const res = await api.setDisappearingTimer(currentUser.id, activeFriend.id, timerSeconds);
      setActiveFriend((prev) => (prev ? { ...prev, disappearingTimer: timerSeconds } : null));
      setFriends((prev) =>
        prev.map((f) => (f.id === activeFriend.id ? { ...f, disappearingTimer: timerSeconds } : f))
      );
      showToast(res.message, 'success');
      refreshData(currentUser.id);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update timer', 'error');
    }
  };

  // Custom Avatar Upload
  const uploadCustomAvatar = async (file) => {
    if (!currentUser || !file) return;
    try {
      const res = await api.uploadAvatar(currentUser.id, file);
      if (res.user) {
        setCurrentUser(res.user);
        currentUserRef.current = res.user;
      }
      showToast('Profile picture updated successfully!', 'success');
      refreshData(currentUser.id);
      return res;
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update profile picture', 'error');
      throw err;
    }
  };

  // Update Profile Data (Name, Status Message, Avatar)
  const updateProfile = async (profileData) => {
    if (!currentUser) return;
    try {
      const res = await api.updateProfile(currentUser.id, profileData);
      if (res.user) {
        setCurrentUser(res.user);
        currentUserRef.current = res.user;
      }
      refreshData(currentUser.id);
      return res.user;
    } catch (err) {
      console.error('Update profile error:', err);
      throw err;
    }
  };

  // Log Out of Account
  const logout = () => {
    localStorage.removeItem('whatsapp_active_user_id');
    cleanupCall();
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    setCurrentUser(null);
    currentUserRef.current = null;
    setActiveFriend(null);
    setMessages([]);
    setFriends([]);
    setIncomingRequests([]);
    setOutgoingRequests([]);
    showToast('Logged out of your account', 'info');
  };

  // Status Actions
  const uploadStatusMedia = async (formData) => {
    const res = await api.uploadStatus(formData);
    await refreshStatuses();
    return res;
  };

  const uploadTextStatus = async (formData) => {
    const res = await api.uploadStatus(formData);
    await refreshStatuses();
    return res;
  };

  const recordStatusView = async (statusId) => {
    if (!currentUser || !statusId) return;
    try {
      await api.recordStatusView(statusId, currentUser.id);
    } catch (err) {
      console.error('Error recording status view:', err);
    }
  };

  const deleteStatusItem = async (statusId) => {
    if (!statusId) return;
    try {
      await api.deleteStatus(statusId);
      await refreshStatuses();
    } catch (err) {
      console.error('Error deleting status:', err);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        currentUser,
        allUsers,
        friends,
        activeFriend,
        messages,
        incomingRequests,
        outgoingRequests,
        summary,
        typingMap,
        activeTab,
        loading,
        statusNotification,
        statusFeed,
        chatWallpaper,
        setChatWallpaper,
        setActiveTab,
        setActiveFriend,
        selectUser,
        openChatWithFriend,
        sendMessage,
        sendFileMessage,
        editMessage,
        deleteForEveryone,
        deleteForMe,
        clearActiveChat,
        updateDisappearingTimer,
        emitTyping,
        sendFriendRequest,
        respondFriendRequest,
        cancelFriendRequest,
        removeFriend,
        registerUser,
        uploadCustomAvatar,
        updateProfile,
        logout,
        uploadStatusMedia,
        uploadTextStatus,
        recordStatusView,
        deleteStatusItem,
        refreshStatuses: () => refreshStatuses(currentUser?.id),
        refreshData: () => refreshData(currentUser?.id),
        showToast,
        // WebRTC Voice Calling exports
        callState,
        activeCall,
        callDuration,
        isMuted,
        isSpeakerOn,
        startVoiceCall,
        acceptVoiceCall,
        rejectVoiceCall,
        endVoiceCall,
        toggleMute,
        toggleSpeaker,
        remoteAudioRef
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
