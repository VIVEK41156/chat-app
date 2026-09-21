import React, { useState, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import {
  Plus,
  Camera,
  Edit3,
  Eye,
  Sparkles,
  X,
  Send,
  Trash2,
  Check,
  Palette
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const STATUS_COLORS = [
  '#00a884',
  '#70389c',
  '#e54238',
  '#3875d7',
  '#d97706',
  '#059669',
  '#db2777',
  '#1e293b'
];

export const StatusTab = ({ onOpenStatusViewer }) => {
  const {
    currentUser,
    statusFeed,
    uploadStatusMedia,
    uploadTextStatus,
    showToast
  } = useChat();

  const [showTextModal, setShowTextModal] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(STATUS_COLORS[0]);

  const [pendingMedia, setPendingMedia] = useState(null);
  const [mediaCaption, setMediaCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);

  const myStatuses = statusFeed?.myStatuses || [];
  const friendsStatuses = statusFeed?.friendsStatuses || [];

  const handleMediaSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingMedia({
      file,
      previewUrl: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image'
    });
    setMediaCaption('');
    e.target.value = '';
  };

  const handleSendMediaStatus = async (e) => {
    e?.preventDefault();
    if (!pendingMedia) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('user_id', currentUser.id);
      formData.append('media', pendingMedia.file);
      formData.append('caption', mediaCaption.trim());
      formData.append('media_type', pendingMedia.type);

      await uploadStatusMedia(formData);
      setPendingMedia(null);
      setMediaCaption('');
      showToast('Status posted successfully!', 'success');
    } catch (err) {
      showToast('Failed to post status', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendTextStatus = async (e) => {
    e?.preventDefault();
    if (!textContent.trim()) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('user_id', currentUser.id);
      formData.append('text', textContent.trim());
      formData.append('caption', textContent.trim());
      formData.append('bg_color', selectedColor);
      formData.append('media_type', 'text');

      await uploadTextStatus(formData);
      setShowTextModal(false);
      setTextContent('');
      showToast('Status posted successfully!', 'success');
    } catch (err) {
      showToast('Failed to post status', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenMyStatus = () => {
    if (myStatuses.length > 0) {
      onOpenStatusViewer({
        name: 'My Status',
        username: currentUser?.username,
        avatar: currentUser?.avatar,
        statuses: myStatuses
      });
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#111b21] overflow-y-auto select-none">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,video/*"
        className="hidden"
        onChange={handleMediaSelect}
      />

      {/* My Status Section */}
      <div className="p-3 border-b border-[#222d34] bg-[#182229]">
        <div className="flex items-center justify-between">
          <div
            onClick={handleOpenMyStatus}
            className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
          >
            <div className="relative flex-shrink-0">
              <img
                src={currentUser?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=me`}
                alt="My Status"
                className={`w-12 h-12 rounded-full object-cover ring-2 ${
                  myStatuses.length > 0 ? 'ring-[#25D366]' : 'ring-transparent'
                }`}
              />
              {myStatuses.length === 0 ? (
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#00a884] text-white rounded-full flex items-center justify-center border-2 border-[#111b21]">
                  <Plus size={12} />
                </div>
              ) : (
                <div className="absolute -top-1 -right-1 bg-[#25D366] text-[#111b21] text-[10px] font-bold px-1.5 py-0.2 rounded-full shadow">
                  {myStatuses.length}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#e9edef] group-hover:text-[#00a884] transition truncate">
                My Status
              </p>
              <p className="text-xs text-[#8696a0] truncate mt-0.5">
                {myStatuses.length > 0
                  ? `${myStatuses.length} update${myStatuses.length > 1 ? 's' : ''} • Tap to view`
                  : 'Tap to add status update'}
              </p>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1.5 ml-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full bg-[#202c33] hover:bg-[#2a3942] text-[#00a884] transition"
              title="Add photo/video status"
            >
              <Camera size={16} />
            </button>
            <button
              onClick={() => setShowTextModal(true)}
              className="p-2 rounded-full bg-[#202c33] hover:bg-[#2a3942] text-[#00a884] transition"
              title="Add text status"
            >
              <Edit3 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Friends Status Feed */}
      <div className="p-3">
        <h3 className="text-xs font-bold text-[#8696a0] uppercase tracking-wider mb-2">
          Recent Updates ({friendsStatuses.length})
        </h3>

        {friendsStatuses.length === 0 ? (
          <div className="p-8 text-center text-[#8696a0] text-xs">
            <Sparkles size={32} className="mx-auto mb-2 opacity-30 text-[#00a884]" />
            <p>No recent status updates from friends.</p>
            <p className="mt-1">Add friends or post your own status above!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {friendsStatuses.map((group) => (
              <div
                key={group.userId}
                onClick={() => onOpenStatusViewer(group)}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#202c33] cursor-pointer transition"
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={group.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${group.username}`}
                    alt={group.name}
                    className={`w-12 h-12 rounded-full object-cover ring-2 ${
                      group.hasUnseen ? 'ring-[#25D366]' : 'ring-[#8696a0]/50'
                    }`}
                  />
                  {group.statuses.length > 1 && (
                    <span className="absolute bottom-0 right-0 bg-[#111b21] border border-[#2a3942] text-white text-[10px] font-bold px-1.5 rounded-full">
                      {group.statuses.length}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#e9edef] truncate">{group.name}</p>
                  <p className="text-xs text-[#8696a0] truncate mt-0.5">
                    {formatDistanceToNow(new Date(group.lastUpdated), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Media Upload Preview Modal */}
      {pendingMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#202c33] border border-[#2a3942] rounded-2xl max-w-md w-full p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#00a884]">Preview Status</span>
              <button onClick={() => setPendingMedia(null)} className="text-[#8696a0] hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden bg-black max-h-[360px] flex items-center justify-center">
              {pendingMedia.type === 'video' ? (
                <video src={pendingMedia.previewUrl} controls className="max-h-[340px] w-full" />
              ) : (
                <img src={pendingMedia.previewUrl} alt="Preview" className="max-h-[340px] object-contain" />
              )}
            </div>

            <form onSubmit={handleSendMediaStatus} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add a caption..."
                value={mediaCaption}
                onChange={(e) => setMediaCaption(e.target.value)}
                className="flex-1 bg-[#111b21] border border-[#2a3942] rounded-lg px-3 py-2 text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]"
              />
              <button
                type="submit"
                disabled={isUploading}
                className="px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] text-white text-xs font-semibold rounded-lg transition shadow flex items-center gap-1.5"
              >
                <Send size={15} /> Post
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Text Status Creation Modal */}
      {showTextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fade-in">
          <div
            className="rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative flex flex-col justify-between min-h-[420px]"
            style={{ backgroundColor: selectedColor }}
          >
            <div className="flex items-center justify-between text-white">
              <span className="text-xs font-semibold bg-black/30 px-2.5 py-1 rounded-full">Text Status</span>
              <button onClick={() => setShowTextModal(false)} className="p-1 rounded-full bg-black/30 hover:bg-black/50">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center my-4">
              <textarea
                placeholder="Type a status..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="bg-transparent text-2xl sm:text-3xl font-bold text-white text-center placeholder-white/60 focus:outline-none resize-none w-full max-h-48 drop-shadow"
                rows={3}
                autoFocus
              />
            </div>

            <div className="space-y-3">
              {/* Color Selector Palette */}
              <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 bg-black/30 p-2 rounded-xl">
                {STATUS_COLORS.map((col) => (
                  <div
                    key={col}
                    onClick={() => setSelectedColor(col)}
                    className={`w-7 h-7 rounded-full cursor-pointer transition border-2 flex items-center justify-center ${
                      selectedColor === col ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: col }}
                  >
                    {selectedColor === col && <Check size={12} className="text-white" />}
                  </div>
                ))}
              </div>

              <button
                onClick={handleSendTextStatus}
                disabled={isUploading || !textContent.trim()}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition shadow-xl flex items-center justify-center gap-2 ${
                  textContent.trim()
                    ? 'bg-white text-[#111b21] hover:bg-white/90 cursor-pointer'
                    : 'bg-white/30 text-white/50 cursor-not-allowed'
                }`}
              >
                <Send size={16} />
                <span>Post Text Status</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusTab;
