import React, { useState, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import { MessageTicks } from './MessageTicks';
import { StatusTab } from './StatusTab';
import { StatusViewerModal } from './StatusViewerModal';
import { WallpaperModal } from './WallpaperModal';
import { Avatar } from './Avatar';
import {
  MessageSquare,
  Users,
  UserPlus,
  Search,
  RefreshCw,
  UserCheck,
  MoreVertical,
  Check,
  X,
  Circle,
  Plus,
  Sparkles,
  Camera,
  Upload,
  Palette
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

export const Sidebar = ({ onOpenAuthModal, onOpenProfileModal, isSplitView = false }) => {
  const {
    currentUser,
    friends,
    activeFriend,
    incomingRequests,
    summary,
    activeTab,
    setActiveTab,
    openChatWithFriend,
    refreshData,
    typingMap,
    statusFeed,
    uploadCustomAvatar
  } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedStatusGroup, setSelectedStatusGroup] = useState(null);
  const [wallpaperModalOpen, setWallpaperModalOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const avatarInputRef = useRef(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      await uploadCustomAvatar(file);
    } catch (err) {
      console.error('Failed to upload custom avatar:', err);
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const formatMessageTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isToday(date)) return format(date, 'HH:mm');
      if (isYesterday(date)) return 'Yesterday';
      return format(date, 'dd/MM/yyyy');
    } catch {
      return '';
    }
  };

  const filteredFriends = friends.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const friendsStatuses = statusFeed?.friendsStatuses || [];
  const unseenStatusCount = friendsStatuses.filter((g) => g.hasUnseen).length;

  return (
    <div className="flex flex-col h-full bg-[#111b21] border-r border-[#222d34] select-none">
      {/* Hidden file input for custom profile avatar */}
      <input
        type="file"
        ref={avatarInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleAvatarFileChange}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-3 bg-[#202c33] border-b border-[#222d34]">
        <div className="flex items-center gap-2.5">
          {/* Avatar with click to open Profile Settings */}
          <div
            onClick={onOpenProfileModal}
            className="relative cursor-pointer group"
            title="Click to Open Profile Settings"
          >
            <Avatar
              src={currentUser?.avatar}
              name={currentUser?.name}
              username={currentUser?.username}
              size="md"
              ringColor={isUploadingAvatar ? 'ring-2 ring-yellow-400 animate-pulse' : 'ring-2 ring-[#00a884] group-hover:ring-[#25D366] transition'}
              showOnline={true}
              isOnline={currentUser?.is_online}
            />
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white pointer-events-none">
              <Camera size={14} />
            </div>
          </div>

          <div
            onClick={onOpenProfileModal}
            className="flex flex-col max-w-[120px] sm:max-w-[150px] cursor-pointer group"
            title="Click to Open Profile Settings"
          >
            <span className="text-sm font-semibold text-[#e9edef] truncate group-hover:text-[#00a884] transition">
              {currentUser?.name || 'Guest User'}
            </span>
            <span className="text-xs text-[#8696a0] truncate">@{currentUser?.username || 'user'}</span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWallpaperModalOpen(true)}
            className="p-2 rounded-full text-[#aebac1] hover:bg-[#374248] hover:text-[#00a884] transition"
            title="Customize Chat Wallpaper"
          >
            <Palette size={17} />
          </button>

          <button
            onClick={handleRefresh}
            className={`p-2 rounded-full text-[#aebac1] hover:bg-[#374248] hover:text-[#e9edef] transition ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            title="Refresh All APIs & Data"
          >
            <RefreshCw size={17} />
          </button>

          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-[#00a884] text-white hover:bg-[#008f6f] transition shadow ml-0.5"
            title="Log In / Switch Account"
          >
            <Plus size={13} />
            <span className="hidden sm:inline">Switch</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Chats, Status, Friends, Requests) */}
      <div className="grid grid-cols-4 bg-[#111b21] border-b border-[#222d34] px-1 py-1">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex items-center justify-center gap-1 py-2 text-xs font-medium rounded transition relative ${
            activeTab === 'chats'
              ? 'text-[#00a884] bg-[#202c33] border-b-2 border-[#00a884]'
              : 'text-[#8696a0] hover:text-[#e9edef] hover:bg-[#182229]'
          }`}
          title="Chats"
        >
          <MessageSquare size={15} />
          <span className="hidden sm:inline">Chats</span>
          {summary.unreadMessagesCount > 0 && (
            <span className="bg-[#25D366] text-[#111b21] font-bold text-[10px] px-1.5 py-0.2 rounded-full">
              {summary.unreadMessagesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('status')}
          className={`flex items-center justify-center gap-1 py-2 text-xs font-medium rounded transition relative ${
            activeTab === 'status'
              ? 'text-[#00a884] bg-[#202c33] border-b-2 border-[#00a884]'
              : 'text-[#8696a0] hover:text-[#e9edef] hover:bg-[#182229]'
          }`}
          title="WhatsApp Status Updates"
        >
          <Circle size={15} className={unseenStatusCount > 0 ? 'text-[#25D366]' : ''} />
          <span className="hidden sm:inline">Status</span>
          {unseenStatusCount > 0 && (
            <span className="w-2 h-2 bg-[#25D366] rounded-full animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('friends')}
          className={`flex items-center justify-center gap-1 py-2 text-xs font-medium rounded transition ${
            activeTab === 'friends'
              ? 'text-[#00a884] bg-[#202c33] border-b-2 border-[#00a884]'
              : 'text-[#8696a0] hover:text-[#e9edef] hover:bg-[#182229]'
          }`}
          title="Friends List"
        >
          <Users size={15} />
          <span className="hidden sm:inline">Friends</span>
          {summary.friendsCount > 0 && (
            <span className="text-[10px] text-[#8696a0]">({summary.friendsCount})</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center justify-center gap-1 py-2 text-xs font-medium rounded transition relative ${
            activeTab === 'requests'
              ? 'text-[#00a884] bg-[#202c33] border-b-2 border-[#00a884]'
              : 'text-[#8696a0] hover:text-[#e9edef] hover:bg-[#182229]'
          }`}
          title="Friend Requests"
        >
          <UserPlus size={15} />
          <span className="hidden sm:inline">Requests</span>
          {incomingRequests.length > 0 && (
            <span className="bg-[#00a884] text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full animate-bounce">
              {incomingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Search Bar (Only shown in Chats tab) */}
      {activeTab === 'chats' && (
        <div className="px-3 py-2 bg-[#111b21] border-b border-[#222d34]">
          <div className="flex items-center gap-2 bg-[#202c33] px-3 py-1.5 rounded-lg">
            <Search size={16} className="text-[#8696a0]" />
            <input
              type="text"
              placeholder="Search chats or start new message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none w-full"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-[#8696a0] hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main List Section */}
      <div className="flex-1 overflow-y-auto">
        {/* Tab 1: Chats Feed */}
        {activeTab === 'chats' && (
          <div>
            {filteredFriends.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-[#8696a0]">
                <MessageSquare size={44} className="opacity-30 mb-3" />
                <p className="text-sm font-medium text-[#e9edef]">No chats yet</p>
                <p className="text-xs mt-1 max-w-[220px]">
                  Go to the <span className="text-[#00a884] cursor-pointer font-medium" onClick={() => setActiveTab('friends')}>Friends Tab</span> to add persons and start chatting once they accept!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#202c33]/50">
                {filteredFriends.map((friend) => {
                  const isSelected = activeFriend?.id === friend.id;
                  const isTyping = Boolean(typingMap[friend.id]);
                  const lastMsg = friend.lastMessage;
                  const isFromMe = lastMsg?.sender_id === currentUser?.id;

                  return (
                    <div
                      key={friend.id}
                      onClick={() => openChatWithFriend(friend)}
                      className={`flex items-center gap-3 px-3.5 py-3 cursor-pointer transition ${
                        isSelected ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'
                      }`}
                    >
                      {/* Avatar & Online Dot */}
                      <Avatar
                        src={friend.avatar}
                        name={friend.name}
                        username={friend.username}
                        size="lg"
                        showOnline={true}
                        isOnline={friend.is_online}
                        ringColor={isSelected ? 'ring-2 ring-[#00a884]' : ''}
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-[#e9edef] truncate">{friend.name}</span>
                          <span className={`text-[11px] ${friend.unreadCount > 0 ? 'text-[#25D366] font-semibold' : 'text-[#8696a0]'}`}>
                            {formatMessageTime(lastMsg?.created_at || friend.friendsSince)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs truncate max-w-[190px]">
                            {isTyping ? (
                              <span className="text-[#25D366] font-medium flex items-center gap-1">
                                <span>typing...</span>
                                <span className="flex gap-0.5">
                                  <span className="w-1 h-1 bg-[#25D366] rounded-full typing-dot"></span>
                                  <span className="w-1 h-1 bg-[#25D366] rounded-full typing-dot"></span>
                                  <span className="w-1 h-1 bg-[#25D366] rounded-full typing-dot"></span>
                                </span>
                              </span>
                            ) : lastMsg ? (
                              <>
                                {isFromMe && <MessageTicks status={lastMsg.status} />}
                                <span className="text-[#8696a0] truncate">{lastMsg.content || 'Attachment'}</span>
                              </>
                            ) : (
                              <span className="text-[#8696a0] italic">Tap to start conversation</span>
                            )}
                          </div>

                          {/* Unread badge */}
                          {friend.unreadCount > 0 && (
                            <span className="bg-[#25D366] text-[#111b21] text-[11px] font-bold px-2 py-0.5 rounded-full">
                              {friend.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: WhatsApp Stories / Status Tab */}
        {activeTab === 'status' && (
          <StatusTab onOpenStatusViewer={(group) => setSelectedStatusGroup(group)} />
        )}
      </div>

      {/* Story / Status Fullscreen Viewer Modal */}
      <StatusViewerModal
        isOpen={Boolean(selectedStatusGroup)}
        onClose={() => setSelectedStatusGroup(null)}
        userStatusGroup={selectedStatusGroup}
      />

      {/* Wallpaper Picker Modal */}
      <WallpaperModal
        isOpen={wallpaperModalOpen}
        onClose={() => setWallpaperModalOpen(false)}
      />
    </div>
  );
};

export default Sidebar;

