import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import { MessageTicks } from './MessageTicks';
import { WallpaperModal } from './WallpaperModal';
import {
  Send,
  Smile,
  Paperclip,
  MoreVertical,
  Search,
  Phone,
  Video,
  Lock,
  MessageSquare,
  Image as ImageIcon,
  FileText,
  Music,
  Download,
  X,
  File,
  Trash2,
  Clock,
  User,
  ShieldAlert,
  Check,
  AlertTriangle,
  Palette,
  ArrowLeft,
  Pencil,
  Copy,
  Ban,
  ChevronDown
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

const QUICK_EMOJIS = ['😀', '😂', '😍', '👍', '🔥', '🎉', '❤️', '🚀', '💯', '🙌', '😎', '🙏', '✨', '👋'];

const TIMER_OPTIONS = [
  { label: 'Off', seconds: 0, desc: 'Messages will not expire' },
  { label: '30 seconds (Live Demo)', seconds: 30, desc: 'Messages disappear 30s after sending' },
  { label: '1 minute (Live Demo)', seconds: 60, desc: 'Messages disappear 1m after sending' },
  { label: '24 hours', seconds: 86400, desc: 'Standard WhatsApp daily disappearing' },
  { label: '7 days', seconds: 604800, desc: 'Messages disappear after 1 week' },
  { label: '90 days', seconds: 7776000, desc: 'Messages disappear after 3 months' }
];

const getFileUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return url.startsWith('/') ? url : `/${url}`;
};

export const ChatArea = () => {
  const {
    currentUser,
    activeFriend,
    messages,
    sendMessage,
    sendFileMessage,
    editMessage,
    deleteForEveryone,
    deleteForMe,
    clearActiveChat,
    updateDisappearingTimer,
    emitTyping,
    typingMap,
    showToast,
    setActiveFriend,
    chatWallpaper
  } = useChat();

  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [selectedTimer, setSelectedTimer] = useState(0);

  const [pendingFile, setPendingFile] = useState(null);
  const [fileCaption, setFileCaption] = useState('');
  const [previewModalImage, setPreviewModalImage] = useState(null);

  // Message Context & Action states
  const [selectedMessageForAction, setSelectedMessageForAction] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editInputText, setEditInputText] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const touchTimerRef = useRef(null);
  const touchMovedRef = useRef(false);

  const handleTouchStart = (msg) => {
    touchMovedRef.current = false;
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      if (!touchMovedRef.current) {
        if (window.navigator?.vibrate) {
          try { window.navigator.vibrate(40); } catch (e) {}
        }
        setSelectedMessageForAction(msg);
        setShowActionModal(true);
      }
    }, 450);
  };

  const handleTouchMove = () => {
    touchMovedRef.current = true;
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
  };

  const handleContextMenu = (msg, e) => {
    e.preventDefault();
    setSelectedMessageForAction(msg);
    setShowActionModal(true);
  };

  const openEditModal = (msg) => {
    setSelectedMessageForAction(msg);
    setEditInputText(msg.content || '');
    setShowActionModal(false);
    setShowEditModal(true);
  };

  const openDeleteModal = (msg) => {
    setSelectedMessageForAction(msg);
    setShowActionModal(false);
    setShowDeleteModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedMessageForAction || !editInputText.trim()) return;
    setIsSubmittingAction(true);
    try {
      await editMessage(selectedMessageForAction.id, editInputText.trim());
      setShowEditModal(false);
      setSelectedMessageForAction(null);
      setEditInputText('');
    } catch (err) {
      // handled in context
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleDeleteForEveryone = async () => {
    if (!selectedMessageForAction) return;
    setIsSubmittingAction(true);
    try {
      await deleteForEveryone(selectedMessageForAction.id);
      setShowDeleteModal(false);
      setSelectedMessageForAction(null);
    } catch (err) {
      // handled
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleDeleteForMe = async () => {
    if (!selectedMessageForAction) return;
    setIsSubmittingAction(true);
    try {
      await deleteForMe(selectedMessageForAction.id);
      setShowDeleteModal(false);
      setSelectedMessageForAction(null);
    } catch (err) {
      // handled
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleCopyText = (msg) => {
    if (!msg?.content) return;
    try {
      navigator.clipboard.writeText(msg.content);
      showToast('Message copied to clipboard', 'info');
    } catch (e) {
      showToast('Failed to copy text', 'error');
    }
    setShowActionModal(false);
  };

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const moreMenuRef = useRef(null);

  const isFriendTyping = Boolean(activeFriend && typingMap[activeFriend.id]);
  const activeTimer = activeFriend?.disappearingTimer || 0;

  // Auto update selected timer when active friend changes
  useEffect(() => {
    if (activeFriend) {
      setSelectedTimer(activeFriend.disappearingTimer || 0);
    }
  }, [activeFriend?.id, activeFriend?.disappearingTimer]);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('auto');
  }, [activeFriend?.id]);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, isFriendTyping]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    if (val.trim().length > 0) {
      emitTyping(true);
    } else {
      emitTyping(false);
    }
  };

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    emitTyping(false);
    sendMessage(inputText.trim(), 'text');
    setInputText('');
    setShowEmojiPicker(false);
    setShowAttachMenu(false);
  };

  const handleEmojiClick = (emoji) => {
    setInputText((prev) => prev + emoji);
    inputRef.current?.focus();
    emitTyping(true);
  };

  const handleFileSelect = (e, customType = null) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowAttachMenu(false);
    setPendingFile({
      file,
      customType,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    });
    setFileCaption('');
    e.target.value = '';
  };

  const handleSendPendingFile = async (e) => {
    e?.preventDefault();
    if (!pendingFile) return;

    await sendFileMessage(pendingFile.file, fileCaption.trim(), pendingFile.customType);
    setPendingFile(null);
    setFileCaption('');
  };

  const handleClearChatConfirm = async () => {
    setShowClearConfirm(false);
    await clearActiveChat();
  };

  const handleSaveTimer = async () => {
    setShowTimerModal(false);
    await updateDisappearingTimer(selectedTimer);
  };

  const formatMessageTime = (dateString) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'HH:mm');
    } catch {
      return '';
    }
  };

  const formatHeaderStatus = () => {
    if (isFriendTyping) {
      return (
        <span className="text-[#25D366] font-medium flex items-center gap-1 animate-pulse">
          typing...
        </span>
      );
    }
    if (activeFriend?.is_online) {
      return <span className="text-[#25D366]">online</span>;
    }
    if (activeFriend?.last_seen) {
      try {
        const d = new Date(activeFriend.last_seen);
        if (isToday(d)) return `last seen today at ${format(d, 'HH:mm')}`;
        if (isYesterday(d)) return `last seen yesterday at ${format(d, 'HH:mm')}`;
        return `last seen on ${format(d, 'dd/MM/yyyy')}`;
      } catch {
        return 'offline';
      }
    }
    return 'offline';
  };

  const formatTimerLabel = (seconds) => {
    const opt = TIMER_OPTIONS.find((o) => o.seconds === seconds);
    return opt ? opt.label : `${seconds}s`;
  };

  if (!activeFriend) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#222e35] text-[#8696a0] p-6 text-center select-none border-b-[6px] border-[#00a884]">
        <div className="w-24 h-24 rounded-full bg-[#111b21] flex items-center justify-center mb-6 shadow-xl border border-[#2a3942]">
          <MessageSquare size={48} className="text-[#00a884]" />
        </div>
        <h2 className="text-2xl font-light text-[#e9edef] mb-2">WhatsApp Web Real-Time</h2>
        <p className="text-sm max-w-md text-[#8696a0] leading-relaxed mb-6">
          Send and receive messages and attachments in real time with online presence, single ticks, double ticks, and read blue ticks.
        </p>
        <div className="flex items-center gap-2 text-xs text-[#667781] bg-[#111b21]/70 px-4 py-2 rounded-full border border-[#2a3942]">
          <Lock size={13} className="text-[#00a884]" /> End-to-end verified friend connections
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b141a] relative">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'image')}
      />
      <input
        type="file"
        ref={fileInputRef}
        accept="*/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'document')}
      />
      <input
        type="file"
        ref={audioInputRef}
        accept="audio/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'audio')}
      />

      {/* Top Chat Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 bg-[#202c33] border-b border-[#222d34] select-none z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Back button for mobile navigation */}
          <button
            onClick={() => setActiveFriend(null)}
            className="p-1.5 -ml-1 rounded-full text-[#aebac1] hover:text-[#e9edef] hover:bg-[#374248] transition flex items-center justify-center sm:hidden"
            title="Back to Chats"
          >
            <ArrowLeft size={20} />
          </button>

          <div
            onClick={() => setShowContactInfo(true)}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group min-w-0"
            title="Click to view contact info"
          >
            <div className="relative flex-shrink-0">
              <img
                src={activeFriend.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${activeFriend.username}`}
                alt={activeFriend.name}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover group-hover:ring-2 group-hover:ring-[#00a884] transition"
              />
              {activeFriend.is_online ? (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[#25D366] rounded-full border-2 border-[#202c33]" />
              ) : null}
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-[#e9edef] group-hover:text-[#00a884] transition truncate max-w-[130px] sm:max-w-[200px]">
                  {activeFriend.name}
                </span>
                {activeTimer > 0 && (
                  <span title={`Disappearing messages on: ${formatTimerLabel(activeTimer)}`}>
                    <Clock size={13} className="text-[#00a884] flex-shrink-0" />
                  </span>
                )}
              </div>
              <div className="text-[11px] sm:text-xs text-[#8696a0] leading-tight truncate">
                {formatHeaderStatus()}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[#aebac1] relative" ref={moreMenuRef}>
          <button
            onClick={() => showToast('Voice calling demo feature', 'info')}
            className="p-2 rounded-full hover:bg-[#374248] hover:text-[#e9edef] transition"
            title="Start voice call"
          >
            <Phone size={18} />
          </button>
          <button
            onClick={() => showToast('Video calling demo feature', 'info')}
            className="p-2 rounded-full hover:bg-[#374248] hover:text-[#e9edef] transition"
            title="Start video call"
          >
            <Video size={18} />
          </button>
          <button
            onClick={() => showToast('Search within conversation', 'info')}
            className="p-2 rounded-full hover:bg-[#374248] hover:text-[#e9edef] transition"
            title="Search in conversation"
          >
            <Search size={18} />
          </button>

          {/* Three Dots Menu Button */}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`p-2 rounded-full transition ${
              showMoreMenu ? 'bg-[#374248] text-[#00a884]' : 'hover:bg-[#374248] hover:text-[#e9edef]'
            }`}
            title="More Options"
          >
            <MoreVertical size={18} />
          </button>

          {/* WhatsApp-Style Three Dots Dropdown Menu */}
          {showMoreMenu && (
            <div className="absolute top-12 right-0 z-40 bg-[#202c33] border border-[#2a3942] rounded-xl shadow-2xl py-2 w-60 animate-fade-in text-xs select-none">
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  setShowContactInfo(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#2a3942] text-[#e9edef] text-left transition"
              >
                <User size={16} className="text-[#8696a0]" />
                <span>Contact info</span>
              </button>

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  setSelectedTimer(activeTimer);
                  setShowTimerModal(true);
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#2a3942] text-[#e9edef] text-left transition"
              >
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-[#00a884]" />
                  <span>Disappearing messages</span>
                </div>
                <span className="text-[10.5px] text-[#00a884] bg-[#00a884]/10 px-2 py-0.5 rounded font-medium">
                  {formatTimerLabel(activeTimer)}
                </span>
              </button>

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  setShowWallpaperModal(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#2a3942] text-[#e9edef] text-left transition"
              >
                <Palette size={16} className="text-[#00a884]" />
                <span>Chat wallpaper</span>
              </button>

              <div className="my-1 border-t border-[#2a3942]/60"></div>

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  setShowClearConfirm(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 text-[#ff5b5b] text-left transition"
              >
                <Trash2 size={16} />
                <span>Clear chat</span>
              </button>

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  setActiveFriend(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#2a3942] text-[#8696a0] text-left transition"
              >
                <X size={16} />
                <span>Close chat</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages Stream */}
      <div
        className={`flex-1 overflow-y-auto px-4 sm:px-12 py-4 space-y-2.5 ${chatWallpaper?.className || 'whatsapp-chat-bg bg-[#0b141a]'}`}
        style={chatWallpaper?.style || {}}
      >
        {/* Disappearing Messages Active Banner */}
        {activeTimer > 0 && (
          <div className="flex justify-center my-1 select-none">
            <div
              onClick={() => setShowTimerModal(true)}
              className="flex items-center gap-1.5 bg-[#182229] border border-[#00a884]/40 text-[#00a884] text-[11px] px-3.5 py-1.5 rounded-lg shadow max-w-md text-center cursor-pointer hover:bg-[#202c33] transition"
            >
              <Clock size={13} className="flex-shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
              <span>
                Disappearing messages active: New messages vanish after <strong>{formatTimerLabel(activeTimer)}</strong>. Tap to change.
              </span>
            </div>
          </div>
        )}

        {/* Encryption notice banner */}
        <div className="flex justify-center my-1 select-none">
          <div className="flex items-center gap-1.5 bg-[#182229] border border-[#222d34] text-[#ffd279] text-[11px] px-3.5 py-1.5 rounded-lg shadow max-w-md text-center">
            <Lock size={12} className="flex-shrink-0" />
            <span>Messages are protected. Only accepted friends can view and exchange messages.</span>
          </div>
        </div>

        {/* Empty state when chat is cleared */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-[#8696a0]">
            <MessageSquare size={36} className="opacity-30 mb-2" />
            <p className="text-xs">No messages in this chat yet. Send a message or photo to start!</p>
          </div>
        )}

        {/* Message Bubbles */}
        {messages.map((msg) => {
          const isFromMe = msg.sender_id === currentUser?.id;
          const isDeleted = Boolean(msg.is_deleted_everyone);
          const isEdited = Boolean(msg.is_edited);
          const isImage = !isDeleted && (msg.message_type === 'image' || (msg.file_url && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(msg.file_url)));
          const isVideo = !isDeleted && (msg.message_type === 'video' || (msg.file_url && /\.(mp4|webm|mov)$/i.test(msg.file_url)));
          const isAudio = !isDeleted && (msg.message_type === 'audio' || (msg.file_url && /\.(mp3|wav|ogg|m4a)$/i.test(msg.file_url)));
          const isDoc = !isDeleted && (msg.file_url && !isImage && !isVideo && !isAudio);
          const isDisappearing = Boolean(msg.expires_at);

          return (
            <div
              key={msg.id}
              className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} animate-fade-in group`}
            >
              <div
                onTouchStart={() => handleTouchStart(msg)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onContextMenu={(e) => handleContextMenu(msg, e)}
                className={`max-w-[85%] sm:max-w-[70%] md:max-w-[55%] rounded-lg shadow text-sm relative break-words overflow-hidden select-text transition-all ${
                  isFromMe
                    ? isDeleted ? 'bg-[#005c4b]/40 text-[#8696a0] bubble-out rounded-tr-none' : 'bg-[#005c4b] text-[#e9edef] bubble-out rounded-tr-none'
                    : isDeleted ? 'bg-[#202c33]/40 text-[#8696a0] bubble-in rounded-tl-none' : 'bg-[#202c33] text-[#e9edef] bubble-in rounded-tl-none'
                }`}
              >
                {/* Desktop dropdown menu trigger */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMessageForAction(msg);
                    setShowActionModal(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[#8696a0] hover:text-white transition rounded-full hover:bg-black/30 absolute top-1 right-1 z-10"
                  title="Message options"
                >
                  <ChevronDown size={14} />
                </button>

                {/* Deleted for Everyone State */}
                {isDeleted ? (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 text-[#8696a0] italic select-none text-[13px]">
                    <Ban size={15} className="text-[#8696a0]/70 flex-shrink-0" />
                    <span>{isFromMe ? 'You deleted this message' : 'This message was deleted'}</span>
                  </div>
                ) : (
                  <>
                    {/* 1. Image Attachment */}
                    {isImage && (
                      <div className="p-1">
                        <img
                          src={getFileUrl(msg.file_url)}
                          alt={msg.file_name || 'Attachment'}
                          onClick={() => setPreviewModalImage(getFileUrl(msg.file_url))}
                          onError={(e) => {
                            if (msg.file_url && !e.currentTarget.src.includes(':5000')) {
                              e.currentTarget.src = `http://localhost:5000${msg.file_url.startsWith('/') ? '' : '/'}${msg.file_url}`;
                            }
                          }}
                          className="rounded-lg max-h-[340px] min-h-[120px] w-full object-cover cursor-pointer hover:opacity-95 transition bg-[#111b21]"
                        />
                      </div>
                    )}

                    {/* 2. Video Attachment */}
                    {isVideo && (
                      <div className="p-1">
                        <video
                          src={getFileUrl(msg.file_url)}
                          controls
                          onError={(e) => {
                            if (msg.file_url && !e.currentTarget.src.includes(':5000')) {
                              e.currentTarget.src = `http://localhost:5000${msg.file_url.startsWith('/') ? '' : '/'}${msg.file_url}`;
                            }
                          }}
                          className="rounded-lg max-h-[300px] w-full bg-black"
                        />
                      </div>
                    )}

                    {/* 3. Audio Attachment */}
                    {isAudio && (
                      <div className="p-3">
                        <div className="flex items-center gap-2 mb-1.5 text-xs text-[#aebac1]">
                          <Music size={16} className="text-[#00a884]" />
                          <span className="font-medium truncate">{msg.file_name || 'Audio file'}</span>
                        </div>
                        <audio
                          src={getFileUrl(msg.file_url)}
                          controls
                          onError={(e) => {
                            if (msg.file_url && !e.currentTarget.src.includes(':5000')) {
                              e.currentTarget.src = `http://localhost:5000${msg.file_url.startsWith('/') ? '' : '/'}${msg.file_url}`;
                            }
                          }}
                          className="w-full h-8"
                        />
                      </div>
                    )}

                    {/* 4. Document / File Attachment */}
                    {isDoc && (
                      <div className="p-2.5">
                        <div className="flex items-center gap-3 bg-[#111b21]/70 p-3 rounded-lg border border-white/5">
                          <div className="w-10 h-10 rounded-lg bg-[#00a884]/20 flex items-center justify-center text-[#00a884] flex-shrink-0">
                            <FileText size={22} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#e9edef] truncate">{msg.file_name || 'Document'}</p>
                            <p className="text-[11px] text-[#8696a0] mt-0.5">{msg.file_size || 'File'}</p>
                          </div>
                          <a
                            href={getFileUrl(msg.file_url)}
                            download={msg.file_name || 'download'}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-full bg-[#202c33] hover:bg-[#00a884] text-white transition flex-shrink-0"
                            title="Download file"
                          >
                            <Download size={15} />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Text Content / Caption */}
                    {msg.content && (
                      <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap select-text px-3 py-1.5 pr-14">
                        {msg.content}
                      </p>
                    )}
                  </>
                )}

                {/* Timestamp & Ticks Footer */}
                <div
                  className={`flex items-center justify-end gap-1 select-none text-[10.5px] text-[#8696a0] px-2.5 pb-1 ${
                    !msg.content && (isImage || isVideo) ? 'absolute bottom-2 right-2 bg-black/50 px-2 py-0.5 rounded-full text-white' : ''
                  }`}
                >
                  {isEdited && !isDeleted && (
                    <span className="text-[10px] text-[#8696a0]/90 italic mr-0.5 font-medium">edited</span>
                  )}
                  {isDisappearing && (
                    <Clock size={11} className="text-[#00a884] mr-0.5" title="Disappearing message" />
                  )}
                  <span>{formatMessageTime(msg.created_at)}</span>
                  {isFromMe && !isDeleted && <MessageTicks status={msg.status} />}
                </div>
              </div>
            </div>
          );
        })}

        {/* Dynamic Typing Indicator */}
        {isFriendTyping && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-[#202c33] text-[#25D366] px-4 py-2.5 rounded-lg bubble-in rounded-tl-none flex items-center gap-2 shadow">
              <span className="text-xs font-medium">{activeFriend.name} is typing</span>
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-[#25D366] rounded-full typing-dot"></span>
                <span className="w-1.5 h-1.5 bg-[#25D366] rounded-full typing-dot"></span>
                <span className="w-1.5 h-1.5 bg-[#25D366] rounded-full typing-dot"></span>
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Options Menu Popup */}
      {showAttachMenu && (
        <div className="absolute bottom-16 left-6 z-30 bg-[#202c33] border border-[#2a3942] rounded-2xl shadow-2xl p-3 flex flex-col gap-2 animate-fade-in w-56">
          <button
            onClick={() => {
              setShowAttachMenu(false);
              imageInputRef.current?.click();
            }}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#2a3942] transition text-[#e9edef] text-xs font-semibold"
          >
            <div className="w-9 h-9 rounded-full bg-[#bf59cf] flex items-center justify-center text-white">
              <ImageIcon size={18} />
            </div>
            <span>Photos & Videos</span>
          </button>

          <button
            onClick={() => {
              setShowAttachMenu(false);
              fileInputRef.current?.click();
            }}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#2a3942] transition text-[#e9edef] text-xs font-semibold"
          >
            <div className="w-9 h-9 rounded-full bg-[#5f66cd] flex items-center justify-center text-white">
              <FileText size={18} />
            </div>
            <span>Document / File</span>
          </button>

          <button
            onClick={() => {
              setShowAttachMenu(false);
              audioInputRef.current?.click();
            }}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#2a3942] transition text-[#e9edef] text-xs font-semibold"
          >
            <div className="w-9 h-9 rounded-full bg-[#e15d64] flex items-center justify-center text-white">
              <Music size={18} />
            </div>
            <span>Audio Message</span>
          </button>
        </div>
      )}

      {/* File Upload Preview Drawer */}
      {pendingFile && (
        <div className="bg-[#182229] border-t border-[#2a3942] p-4 flex flex-col gap-3 animate-fade-in z-20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#00a884] flex items-center gap-1.5">
              <Paperclip size={14} /> Ready to send attachment
            </span>
            <button
              onClick={() => setPendingFile(null)}
              className="p-1 rounded-full text-[#8696a0] hover:text-white hover:bg-[#202c33]"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex items-center gap-3 bg-[#202c33] p-3 rounded-lg border border-[#2a3942]">
            {pendingFile.previewUrl ? (
              <img
                src={pendingFile.previewUrl}
                alt="Preview"
                className="w-14 h-14 rounded-lg object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-[#00a884]/20 flex items-center justify-center text-[#00a884]">
                <File size={26} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#e9edef] truncate">{pendingFile.file.name}</p>
              <p className="text-[11px] text-[#8696a0] mt-0.5">
                {(pendingFile.file.size / (1024 * 1024)).toFixed(2)} MB • {pendingFile.file.type || 'Attachment'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSendPendingFile} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Add a caption..."
              value={fileCaption}
              onChange={(e) => setFileCaption(e.target.value)}
              className="flex-1 bg-[#2a3942] border border-[#374248] rounded-lg px-3 py-2 text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]"
              autoFocus
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] text-white text-xs font-semibold rounded-lg transition shadow flex items-center gap-1.5"
            >
              <Send size={15} /> Send File
            </button>
          </form>
        </div>
      )}

      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
        <div className="bg-[#202c33] border-t border-[#2a3942] p-2.5 flex flex-wrap gap-2 animate-fade-in z-20">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              className="text-xl p-1.5 hover:bg-[#2a3942] rounded-lg transition transform hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Message Input Footer */}
      {!pendingFile && (
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#202c33] border-t border-[#222d34] select-none z-10"
        >
          <button
            type="button"
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowAttachMenu(false);
            }}
            className={`p-2 rounded-full hover:bg-[#374248] transition ${
              showEmojiPicker ? 'text-[#00a884]' : 'text-[#8696a0] hover:text-[#e9edef]'
            }`}
            title="Emojis"
          >
            <Smile size={22} />
          </button>

          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(!showAttachMenu);
              setShowEmojiPicker(false);
            }}
            className={`p-2 rounded-full transition ${
              showAttachMenu ? 'text-[#00a884] bg-[#2a3942]' : 'text-[#8696a0] hover:text-[#e9edef] hover:bg-[#374248]'
            }`}
            title="Attach Photos, Documents, Audio"
          >
            <Paperclip size={20} />
          </button>

          <div className="flex-1 bg-[#2a3942] rounded-lg px-3 py-2 flex items-center">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a message..."
              value={inputText}
              onChange={handleInputChange}
              onBlur={() => emitTyping(false)}
              className="bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none w-full select-text"
            />
          </div>

          <button
            type="submit"
            disabled={!inputText.trim()}
            className={`p-2.5 rounded-full transition shadow flex items-center justify-center ${
              inputText.trim()
                ? 'bg-[#00a884] text-white hover:bg-[#008f6f] cursor-pointer scale-105'
                : 'bg-[#2a3942] text-[#8696a0] cursor-not-allowed opacity-60'
            }`}
            title="Send message"
          >
            <Send size={18} />
          </button>
        </form>
      )}

      {/* Clear Chat Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#202c33] border border-[#2a3942] rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <Trash2 size={20} />
              </div>
              <h3 className="text-base font-semibold text-[#e9edef]">Clear this chat?</h3>
            </div>

            <p className="text-xs text-[#8696a0] leading-relaxed">
              This will permanently delete all messages and media exchanged with <strong className="text-[#e9edef]">{activeFriend.name}</strong> from the database.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 bg-[#111b21] hover:bg-[#2a3942] text-[#e9edef] text-xs font-medium rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleClearChatConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition shadow flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Clear Messages
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disappearing Messages Modal */}
      {showTimerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#202c33] border border-[#2a3942] rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2a3942] pb-3">
              <div className="flex items-center gap-2 text-[#00a884]">
                <Clock size={20} />
                <h3 className="text-base font-semibold text-[#e9edef]">Disappearing Messages</h3>
              </div>
              <button
                onClick={() => setShowTimerModal(false)}
                className="text-[#8696a0] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[#8696a0] leading-relaxed">
              For more privacy, new messages sent in this chat will automatically vanish after the selected duration.
            </p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {TIMER_OPTIONS.map((opt) => (
                <div
                  key={opt.seconds}
                  onClick={() => setSelectedTimer(opt.seconds)}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                    selectedTimer === opt.seconds
                      ? 'bg-[#00a884]/15 border-[#00a884] text-white'
                      : 'bg-[#111b21] border-[#2a3942] text-[#8696a0] hover:border-[#00a884]/40 hover:text-[#e9edef]'
                  }`}
                >
                  <div>
                    <p className="text-xs font-semibold text-[#e9edef]">{opt.label}</p>
                    <p className="text-[11px] text-[#8696a0] mt-0.5">{opt.desc}</p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedTimer === opt.seconds
                        ? 'border-[#00a884] bg-[#00a884]'
                        : 'border-[#8696a0]'
                    }`}
                  >
                    {selectedTimer === opt.seconds && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#2a3942]">
              <button
                onClick={() => setShowTimerModal(false)}
                className="px-4 py-2 bg-[#111b21] hover:bg-[#2a3942] text-[#e9edef] text-xs font-medium rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTimer}
                className="px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] text-white text-xs font-semibold rounded-lg transition shadow flex items-center gap-1.5"
              >
                <Check size={14} /> Apply Timer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Info Modal */}
      {showContactInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#202c33] border border-[#2a3942] rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2a3942] pb-3">
              <h3 className="text-sm font-semibold text-[#e9edef]">Contact Info</h3>
              <button onClick={() => setShowContactInfo(false)} className="text-[#8696a0] hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col items-center text-center">
              <img
                src={activeFriend.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${activeFriend.username}`}
                alt={activeFriend.name}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-[#00a884]/30 mb-3"
              />
              <h4 className="text-base font-semibold text-[#e9edef]">{activeFriend.name}</h4>
              <p className="text-xs text-[#8696a0]">@{activeFriend.username}</p>
            </div>

            <div className="bg-[#111b21] p-3 rounded-lg border border-[#2a3942] space-y-2 text-xs">
              <div>
                <span className="text-[#8696a0] block text-[10px] uppercase font-bold tracking-wider">About / Status</span>
                <p className="text-[#e9edef] mt-0.5">{activeFriend.status_message || 'Hey there! I am using WhatsApp.'}</p>
              </div>

              <div>
                <span className="text-[#8696a0] block text-[10px] uppercase font-bold tracking-wider">Disappearing Timer</span>
                <p className="text-[#00a884] font-semibold mt-0.5">{formatTimerLabel(activeTimer)}</p>
              </div>
            </div>

            <button
              onClick={() => setShowContactInfo(false)}
              className="w-full py-2 bg-[#111b21] hover:bg-[#2a3942] text-[#e9edef] text-xs font-semibold rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Image Lightbox Modal */}
      {previewModalImage && (
        <div
          onClick={() => setPreviewModalImage(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur cursor-pointer animate-fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewModalImage}
              alt="Enlarged preview"
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
            />
            <button
              onClick={() => setPreviewModalImage(null)}
              className="absolute top-2 right-2 p-2 bg-black/60 rounded-full text-white hover:bg-black transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
      {/* Wallpaper Picker Modal */}
      <WallpaperModal
        isOpen={showWallpaperModal}
        onClose={() => setShowWallpaperModal(false)}
      />

      {/* Message Action Menu Modal / Bottom Sheet */}
      {showActionModal && selectedMessageForAction && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => {
            setShowActionModal(false);
            setSelectedMessageForAction(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#202c33] border-t sm:border border-[#2a3942] rounded-t-2xl sm:rounded-2xl max-w-sm w-full p-4 shadow-2xl space-y-3 animate-slide-up sm:animate-none"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#2a3942]/70">
              <span className="text-xs font-semibold text-[#8696a0] uppercase tracking-wider">Message Options</span>
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setSelectedMessageForAction(null);
                }}
                className="text-[#8696a0] hover:text-white p-1 rounded-full hover:bg-[#2a3942]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Message snippet preview */}
            <div className="bg-[#111b21] p-2.5 rounded-lg border border-[#2a3942]/60 text-xs text-[#aebac1] truncate">
              {selectedMessageForAction.is_deleted_everyone ? (
                <span className="italic text-[#8696a0]">🚫 Deleted message</span>
              ) : selectedMessageForAction.content ? (
                <span>&ldquo;{selectedMessageForAction.content}&rdquo;</span>
              ) : (
                <span>📎 Attachment ({selectedMessageForAction.message_type || 'File'})</span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-1">
              {/* Edit (Sender only, not deleted, and has text) */}
              {selectedMessageForAction.sender_id === currentUser?.id &&
                !selectedMessageForAction.is_deleted_everyone &&
                selectedMessageForAction.content && (
                  <button
                    onClick={() => openEditModal(selectedMessageForAction)}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-[#2a3942] text-[#e9edef] rounded-xl text-left transition font-medium text-xs sm:text-sm"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#00a884]/20 flex items-center justify-center text-[#00a884]">
                      <Pencil size={15} />
                    </div>
                    <span>Edit message</span>
                  </button>
                )}

              {/* Copy Text */}
              {selectedMessageForAction.content && !selectedMessageForAction.is_deleted_everyone && (
                <button
                  onClick={() => handleCopyText(selectedMessageForAction)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-[#2a3942] text-[#e9edef] rounded-xl text-left transition font-medium text-xs sm:text-sm"
                >
                  <div className="w-7 h-7 rounded-full bg-[#8696a0]/20 flex items-center justify-center text-[#8696a0]">
                    <Copy size={15} />
                  </div>
                  <span>Copy text</span>
                </button>
              )}

              {/* Delete message */}
              <button
                onClick={() => openDeleteModal(selectedMessageForAction)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-red-500/10 text-[#ff5b5b] rounded-xl text-left transition font-medium text-xs sm:text-sm"
              >
                <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center text-[#ff5b5b]">
                  <Trash2 size={15} />
                </div>
                <span>Delete message</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Delete Confirmation Modal */}
      {showDeleteModal && selectedMessageForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#202c33] border border-[#2a3942] rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-[#2a3942]">
              <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center text-[#ff5b5b] flex-shrink-0">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#e9edef]">Delete message?</h3>
                <p className="text-[11px] text-[#8696a0]">Choose how you would like to delete this message</p>
              </div>
            </div>

            <div className="space-y-2">
              {/* Option 1: Delete for everyone (Sender only and not already deleted) */}
              {selectedMessageForAction.sender_id === currentUser?.id &&
                !selectedMessageForAction.is_deleted_everyone && (
                  <button
                    disabled={isSubmittingAction}
                    onClick={handleDeleteForEveryone}
                    className="w-full py-2.5 px-4 bg-red-500/20 hover:bg-red-500/30 text-[#ff5b5b] border border-red-500/30 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2"
                  >
                    <Ban size={14} />
                    <span>Delete for everyone</span>
                  </button>
                )}

              {/* Option 2: Delete for me */}
              <button
                disabled={isSubmittingAction}
                onClick={handleDeleteForMe}
                className="w-full py-2.5 px-4 bg-[#111b21] hover:bg-[#2a3942] text-[#e9edef] border border-[#2a3942] rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                <Trash2 size={14} className="text-[#8696a0]" />
                <span>Delete for me only</span>
              </button>

              {/* Option 3: Cancel */}
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedMessageForAction(null);
                }}
                className="w-full py-2 text-[#8696a0] hover:text-[#e9edef] text-xs font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Edit Message Modal */}
      {showEditModal && selectedMessageForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#202c33] border border-[#2a3942] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a3942]">
              <div className="flex items-center gap-2">
                <Pencil size={17} className="text-[#00a884]" />
                <h3 className="text-sm font-semibold text-[#e9edef]">Edit Message</h3>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedMessageForAction(null);
                }}
                className="text-[#8696a0] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <textarea
                value={editInputText}
                onChange={(e) => setEditInputText(e.target.value)}
                rows={4}
                className="w-full bg-[#111b21] text-[#e9edef] placeholder-[#8696a0] text-sm p-3.5 rounded-xl border border-[#2a3942] focus:outline-none focus:border-[#00a884] resize-none"
                placeholder="Edit your message..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit();
                  }
                }}
              />
              <p className="text-[11px] text-[#8696a0] italic">
                ℹ️ Edited messages are marked with an <strong>(edited)</strong> tag for all participants.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#2a3942]">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedMessageForAction(null);
                }}
                className="px-4 py-2 bg-[#111b21] hover:bg-[#2a3942] text-[#e9edef] text-xs font-medium rounded-lg transition"
              >
                Cancel
              </button>
              <button
                disabled={isSubmittingAction || !editInputText.trim()}
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition shadow flex items-center gap-1.5"
              >
                <Check size={14} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatArea;
