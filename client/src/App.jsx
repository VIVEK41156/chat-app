import React, { useState } from 'react';
import { ChatProvider, useChat } from './context/ChatContext';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { FriendsTab } from './components/FriendsTab';
import { UserSwitcherModal } from './components/UserSwitcherModal';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { VoiceCallModal } from './components/VoiceCallModal';
import { ScreenShareModal } from './components/ScreenShareModal';
import { DualSimulator } from './components/DualSimulator';
import { VideoPreloader } from './components/VideoPreloader';
import {
  SplitSquareVertical,
  CheckCircle2,
  MessageSquare,
  Circle,
  Users,
  UserPlus
} from 'lucide-react';

const MainLayout = ({ onToggleSimulator }) => {
  const {
    activeTab,
    setActiveTab,
    activeFriend,
    statusNotification,
    summary,
    incomingRequests,
    statusFeed,
    currentUser,
    loading,
    allUsers
  } = useChat();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  React.useEffect(() => {
    if (!loading && !currentUser) {
      setAuthModalOpen(true);
    }
  }, [loading, currentUser]);

  const friendsStatuses = statusFeed?.friendsStatuses || [];
  const unseenStatusCount = friendsStatuses.filter((g) => g.hasUnseen).length;

  if (loading && !currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#111b21] text-[#e9edef] p-4 text-center select-none">
        <div className="w-16 h-16 rounded-full bg-[#202c33] flex items-center justify-center mb-5 text-[#00a884] shadow-2xl border border-[#2a3942]">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="#00a884">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 6.46 17.5 2 12.04 2M12.05 20.16C10.59 20.16 9.16 19.77 7.91 19.03L7.61 18.85L4.5 19.67L5.33 16.63L5.13 16.31C4.32 15.02 3.88 13.5 3.88 11.91C3.88 7.42 7.54 3.75 12.05 3.75C14.23 3.75 16.28 4.6 17.82 6.14C19.36 7.68 20.21 9.73 20.21 11.91C20.21 16.42 16.55 20.16 12.05 20.16Z"/>
          </svg>
        </div>
        <div className="whatsapp-spin mb-4"></div>
        <h2 className="text-base font-semibold text-[#e9edef] tracking-wide">WhatsApp Web</h2>
        <p className="text-xs text-[#8696a0] mt-1">Connecting to real-time chat service...</p>
        <button
          onClick={() => setAuthModalOpen(true)}
          className="mt-5 px-4 py-2 bg-[#202c33] hover:bg-[#2a3942] text-[#00a884] border border-[#2a3942] rounded-xl text-xs font-semibold transition shadow"
        >
          Open Account Login / Switcher
        </button>
        <UserSwitcherModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full h-[100dvh] bg-[#0c1317] overflow-hidden p-0 sm:p-2 md:p-4 flex items-center justify-center">
      {/* WhatsApp Window Container */}
      <div className="flex flex-col h-full w-full max-w-[1700px] bg-[#111b21] shadow-2xl rounded-none sm:rounded-xl overflow-hidden border-0 sm:border border-[#222d34] min-h-0">
        {/* Top Control Bar (Hidden on Mobile if inside active chat) */}
        <div className={`bg-[#202c33] px-3.5 py-2 border-b border-[#222d34] items-center justify-between text-xs text-[#8696a0] flex-shrink-0 ${
          activeFriend ? 'hidden sm:flex' : 'flex'
        }`}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00a884]"></span>
            <span className="font-semibold text-[#e9edef] tracking-wide">WhatsApp Web</span>
            <span className="text-[11px] bg-[#111b21] text-[#00a884] px-2 py-0.5 rounded border border-[#2a3942] hidden sm:inline">
              Real-time SQLite Engine
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onToggleSimulator}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#00a884] hover:bg-[#008f6f] text-white text-xs font-semibold rounded-md transition shadow active:scale-95"
              title="Open dual screen to test 2 users chatting in real-time"
            >
              <SplitSquareVertical size={14} />
              <span className="hidden sm:inline">Launch Dual Simulator</span>
              <span className="sm:hidden">Dual Sim</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 flex overflow-hidden relative w-full h-full">
          {/* Desktop Left Sidebar OR Mobile Chat List / Status */}
          <div
            className={`w-full sm:w-[380px] md:w-[420px] flex-shrink-0 flex flex-col h-full min-h-0 border-r border-[#222d34] ${
              activeFriend ? 'hidden sm:flex' : (activeTab === 'friends' || activeTab === 'requests') ? 'hidden sm:flex' : 'flex'
            }`}
          >
            <Sidebar
              onOpenAuthModal={() => setAuthModalOpen(true)}
              onOpenProfileModal={() => setProfileModalOpen(true)}
            />
          </div>

          {/* Right Main Area on Desktop OR Mobile Active View */}
          <div
            className={`flex-1 min-h-0 flex flex-col h-full overflow-hidden ${
              activeFriend
                ? 'flex'
                : (activeTab === 'friends' || activeTab === 'requests')
                ? 'flex'
                : 'hidden sm:flex'
            }`}
          >
            {activeTab === 'friends' || activeTab === 'requests' ? (
              <FriendsTab />
            ) : (
              <ChatArea />
            )}
          </div>
        </div>

        {/* WhatsApp Mobile Bottom Navigation Bar (Visible only on mobile screens when not in active chat) */}
        {!activeFriend && (
          <div className="sm:hidden flex-shrink-0 flex items-center justify-around bg-[#202c33] border-t border-[#222d34] py-1.5 px-1 z-30 select-none pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <button
              onClick={() => setActiveTab('chats')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition relative ${
                activeTab === 'chats' ? 'text-[#00a884]' : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              <MessageSquare size={18} />
              <span className="text-[10px] font-medium">Chats</span>
              {summary?.unreadMessagesCount > 0 && (
                <span className="absolute top-0 right-2 bg-[#25D366] text-[#111b21] font-bold text-[9px] px-1.5 py-0.1 rounded-full">
                  {summary.unreadMessagesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('status')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition relative ${
                activeTab === 'status' ? 'text-[#00a884]' : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              <Circle size={18} className={unseenStatusCount > 0 ? 'text-[#25D366]' : ''} />
              <span className="text-[10px] font-medium">Status</span>
              {unseenStatusCount > 0 && (
                <span className="absolute top-1 right-3 w-2 h-2 bg-[#25D366] rounded-full animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('friends')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition relative ${
                activeTab === 'friends' ? 'text-[#00a884]' : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              <Users size={18} />
              <span className="text-[10px] font-medium">Friends</span>
              {summary?.friendsCount > 0 && (
                <span className="text-[9px] text-[#8696a0]">({summary.friendsCount})</span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('requests')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition relative ${
                activeTab === 'requests' ? 'text-[#00a884]' : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              <UserPlus size={18} />
              <span className="text-[10px] font-medium">Requests</span>
              {incomingRequests?.length > 0 && (
                <span className="absolute top-0 right-2 bg-[#00a884] text-white font-bold text-[9px] px-1.5 py-0.1 rounded-full animate-bounce">
                  {incomingRequests.length}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* User Auth & Login Modal (Email OTP) */}
      <UserSwitcherModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Profile Settings Modal */}
      <ProfileSettingsModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onOpenAuthModal={() => setAuthModalOpen(true)}
      />

      {/* WebRTC Real-Time Voice Call Modal */}
      <VoiceCallModal />

      {/* WebRTC Real-Time Screen Sharing Modal */}
      <ScreenShareModal />

      {/* Real-time Toast Banner */}
      {statusNotification && (
        <div className="fixed top-4 sm:top-6 right-4 sm:right-6 z-50 bg-[#00a884] text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-bounce border border-white/20 max-w-[90vw]">
          <CheckCircle2 size={16} className="flex-shrink-0" />
          <span className="truncate">{statusNotification.message}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [simulatorMode, setSimulatorMode] = useState(false);
  const [preloaderDone, setPreloaderDone] = useState(false);

  return (
    <>
      {!preloaderDone && (
        <VideoPreloader onFinished={() => setPreloaderDone(true)} />
      )}
      {simulatorMode ? (
        <DualSimulator onCloseSimulator={() => setSimulatorMode(false)} />
      ) : (
        <ChatProvider>
          <MainLayout onToggleSimulator={() => setSimulatorMode(true)} />
        </ChatProvider>
      )}
    </>
  );
}

