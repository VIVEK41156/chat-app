import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import { api } from '../services/api';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Clock,
  Play,
  Pause,
  User,
  CheckCircle2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const getFileUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return url.startsWith('/') ? url : `/${url}`;
};

export const StatusViewerModal = ({ isOpen, onClose, userStatusGroup }) => {
  const { currentUser, recordStatusView, deleteStatusItem, showToast } = useChat();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showViewersSheet, setShowViewersSheet] = useState(false);
  const [viewersList, setViewersList] = useState([]);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const [progress, setProgress] = useState(0);

  const statuses = userStatusGroup?.statuses || [];
  const currentStatus = statuses[currentIndex];
  const isOwner = currentStatus?.user_id === currentUser?.id;

  // Reset index when opening new status
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setProgress(0);
      setShowViewersSheet(false);
    }
  }, [isOpen, userStatusGroup]);

  // Record view when current status changes
  useEffect(() => {
    if (isOpen && currentStatus && currentUser) {
      recordStatusView(currentStatus.id);
    }
  }, [isOpen, currentStatus?.id]);

  // Auto advance timer with progress bar
  useEffect(() => {
    if (!isOpen || isPaused || showViewersSheet || !currentStatus) return;

    const interval = 50; // 50ms tick
    const totalDuration = 5000; // 5 seconds per story
    const step = (interval / totalDuration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isOpen, currentIndex, isPaused, showViewersSheet, currentStatus]);

  if (!isOpen || !currentStatus) return null;

  const handleNext = () => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  };

  const handleOpenViewers = async () => {
    setIsPaused(true);
    setShowViewersSheet(true);
    setLoadingViewers(true);
    try {
      const list = await api.getStatusViewers(currentStatus.id);
      setViewersList(list || []);
    } catch (err) {
      console.error('Failed to load viewers:', err);
    } finally {
      setLoadingViewers(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this status update?')) {
      await deleteStatusItem(currentStatus.id);
      showToast('Status deleted', 'info');
      if (statuses.length <= 1) {
        onClose();
      } else {
        handleNext();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none animate-fade-in backdrop-blur-md">
      {/* Main Container */}
      <div className="relative w-full max-w-md h-[90vh] max-h-[850px] bg-[#111b21] rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between border border-[#2a3942]">
        {/* Top Progress Segment Bars */}
        <div className="absolute top-0 left-0 right-0 z-30 p-3 pt-4 flex gap-1.5 bg-gradient-to-b from-black/80 to-transparent">
          {statuses.map((st, idx) => (
            <div key={st.id || idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#25D366] transition-all duration-75"
                style={{
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Top Header */}
        <div className="absolute top-6 left-0 right-0 z-30 px-4 py-2 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent text-white">
          <div className="flex items-center gap-2.5">
            <img
              src={userStatusGroup.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userStatusGroup.username}`}
              alt={userStatusGroup.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-[#25D366]"
            />
            <div>
              <p className="text-sm font-semibold">{userStatusGroup.name}</p>
              <p className="text-[11px] text-white/70">
                {formatDistanceToNow(new Date(currentStatus.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-1.5 rounded-full hover:bg-white/20 transition text-white"
            >
              {isPaused ? <Play size={18} /> : <Pause size={18} />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/20 transition text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body Area */}
        <div
          className="flex-1 flex flex-col items-center justify-center relative overflow-hidden"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Navigation Click Zones */}
          <div
            onClick={handlePrev}
            className="absolute left-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer"
          />
          <div
            onClick={handleNext}
            className="absolute right-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer"
          />

          {/* 1. Image Status */}
          {currentStatus.media_type === 'image' && currentStatus.media_url && (
            <img
              src={getFileUrl(currentStatus.media_url)}
              alt="Status"
              className="max-h-full max-w-full object-contain"
            />
          )}

          {/* 2. Video Status */}
          {currentStatus.media_type === 'video' && currentStatus.media_url && (
            <video
              src={getFileUrl(currentStatus.media_url)}
              autoPlay
              controls={false}
              className="max-h-full max-w-full object-contain"
            />
          )}

          {/* 3. Text Status */}
          {currentStatus.media_type === 'text' && (
            <div
              className="w-full h-full flex items-center justify-center p-8 text-center"
              style={{ backgroundColor: currentStatus.bg_color || '#00a884' }}
            >
              <p className="text-2xl sm:text-3xl font-bold text-white leading-relaxed drop-shadow-md whitespace-pre-wrap">
                {currentStatus.caption}
              </p>
            </div>
          )}

          {/* Caption overlay for media */}
          {currentStatus.caption && currentStatus.media_type !== 'text' && (
            <div className="absolute bottom-16 left-0 right-0 z-20 px-6 py-3 bg-gradient-to-t from-black/90 to-transparent text-center">
              <p className="text-sm font-medium text-white drop-shadow">
                {currentStatus.caption}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Bar: Owner View Count & Viewers / Viewer details */}
        <div className="z-30 px-4 py-3 bg-[#111b21] border-t border-[#222d34] flex items-center justify-between text-xs text-white">
          {isOwner ? (
            <div className="flex items-center justify-between w-full">
              <button
                onClick={handleOpenViewers}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#202c33] hover:bg-[#2a3942] rounded-full transition text-[#00a884] font-semibold"
              >
                <Eye size={16} />
                <span>{currentStatus.viewCount || 0} {currentStatus.viewCount === 1 ? 'view' : 'views'}</span>
              </button>

              <button
                onClick={handleDelete}
                className="p-2 rounded-full hover:bg-red-500/20 text-red-400 transition"
                title="Delete status"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ) : (
            <div className="text-center w-full text-[#8696a0] text-[11px]">
              WhatsApp 24h Status Update
            </div>
          )}
        </div>

        {/* Viewers Bottom Sheet (For Owner) */}
        {showViewersSheet && (
          <div className="absolute inset-x-0 bottom-0 z-40 bg-[#202c33] rounded-t-2xl border-t border-[#2a3942] p-4 shadow-2xl max-h-[60%] flex flex-col animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#2a3942] pb-2 mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#e9edef]">
                <Eye size={18} className="text-[#00a884]" />
                <span>Viewed by {viewersList.length}</span>
              </div>
              <button
                onClick={() => {
                  setShowViewersSheet(false);
                  setIsPaused(false);
                }}
                className="text-[#8696a0] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#2a3942]/50">
              {loadingViewers ? (
                <div className="p-4 text-center text-xs text-[#8696a0]">Loading viewers...</div>
              ) : viewersList.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#8696a0]">
                  No views yet. Friends who view your status will appear here!
                </div>
              ) : (
                viewersList.map((viewer) => (
                  <div key={viewer.id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={viewer.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${viewer.username}`}
                        alt={viewer.name}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-xs font-semibold text-[#e9edef]">{viewer.name}</p>
                        <p className="text-[10px] text-[#8696a0]">@{viewer.username}</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-[#8696a0]">
                      {format(new Date(viewer.viewed_at), 'HH:mm')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusViewerModal;
