import React, { useState } from 'react';
import { ChatProvider, useChat } from './context/ChatContext';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { FriendsTab } from './components/FriendsTab';
import { UserSwitcherModal } from './components/UserSwitcherModal';
import { DualSimulator } from './components/DualSimulator';
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

  const [userModalOpen, setUserModalOpen] = useState(false);

  React.useEffect(() => {
    if (!loading && (!currentUser || allUsers.length === 0)) {
      setUserModalOpen(true);
    }
  }, [loading, currentUser, allUsers?.length]);

  const friendsStatuses = statusFeed?.friendsStatuses || [];
  const unseenStatusCount = friendsStatuses.filter((g) => g.hasUnseen).length;

  return (
    <div className="flex h-screen h-[100dvh] w-screen bg-[#0c1317] overflow-hidden p-0 sm:p-3 md:p-4 items-center justify-center">
      {/* WhatsApp Window Container */}
      <div className="flex flex-col h-full w-full max-w-[1700px] bg-[#111b21] shadow-2xl rounded-none sm:rounded-xl overflow-hidden border border-[#222d34]">
        {/* Top Control Bar (Hidden on Mobile if inside active chat) */}
        <div className={`bg-[#202c33] px-3.5 py-2 border-b border-[#222d34] items-center justify-between text-xs text-[#8696a0] ${
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
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#00a884] hover:bg-[#008f6f] text-white text-xs font-semibold rounded-md transition shadow"
              title="Open dual screen to test 2 users chatting in real-time"
            >
              <SplitSquareVertical size={14} />
              <span className="hidden sm:inline">Launch Dual Simulator</span>
              <span className="sm:hidden">Dual Sim</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Desktop Left Sidebar OR Mobile Chat List / Status */}
          <div
            className={`w-full sm:w-[380px] md:w-[420px] flex-shrink-0 flex flex-col h-full border-r border-[#222d34] ${
              activeFriend ? 'hidden sm:flex' : (activeTab === 'friends' || activeTab === 'requests') ? 'hidden sm:flex' : 'flex'
            }`}
          >
            <Sidebar onOpenUserModal={() => setUserModalOpen(true)} />
          </div>

          {/* Right Main Area on Desktop OR Mobile Active View */}
          <div
            className={`flex-1 flex-col h-full overflow-hidden ${
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
          <div className="sm:hidden flex items-center justify-around bg-[#202c33] border-t border-[#222d34] py-2 px-1 z-30 select-none">
            <button
              onClick={() => setActiveTab('chats')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition relative ${
                activeTab === 'chats' ? 'text-[#00a884]' : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              <MessageSquare size={18} />
              <span className="text-[10px] font-medium">Chats</span>
              {summary.unreadMessagesCount > 0 && (
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
              {summary.friendsCount > 0 && (
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
              {incomingRequests.length > 0 && (
                <span className="absolute top-0 right-2 bg-[#00a884] text-white font-bold text-[9px] px-1.5 py-0.1 rounded-full animate-bounce">
                  {incomingRequests.length}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* User Switcher / Registration Modal */}
      <UserSwitcherModal isOpen={userModalOpen} onClose={() => setUserModalOpen(false)} />

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

  if (simulatorMode) {
    return <DualSimulator onCloseSimulator={() => setSimulatorMode(false)} />;
  }

  return (
    <ChatProvider>
      <MainLayout onToggleSimulator={() => setSimulatorMode(true)} />
    </ChatProvider>
  );
}

