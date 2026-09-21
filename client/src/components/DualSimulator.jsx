import React, { useState, useEffect } from 'react';
import { ChatProvider, useChat } from '../context/ChatContext';
import { Sidebar } from './Sidebar';
import { ChatArea } from './ChatArea';
import { FriendsTab } from './FriendsTab';
import { UserSwitcherModal } from './UserSwitcherModal';
import { VoiceCallModal } from './VoiceCallModal';
import { Smartphone, SplitSquareVertical, CheckCircle2 } from 'lucide-react';

const SingleChatInstance = ({ title, defaultUserId, onOpenModal }) => {
  const { activeTab, statusNotification, friends, activeFriend, openChatWithFriend } = useChat();

  // Auto select first friend for instant side-by-side interactive chatting & typing testing
  useEffect(() => {
    if (!activeFriend && friends.length > 0) {
      openChatWithFriend(friends[0]);
    }
  }, [friends, activeFriend]);

  return (
    <div className="flex flex-col h-full bg-[#111b21] border border-[#222d34] rounded-xl overflow-hidden shadow-2xl relative">
      {/* Mini top bar header */}
      <div className="bg-[#182229] px-3 py-1.5 border-b border-[#222d34] flex items-center justify-between text-xs text-[#8696a0]">
        <div className="flex items-center gap-1.5">
          <Smartphone size={14} className="text-[#00a884]" />
          <span className="font-semibold text-[#e9edef]">{title}</span>
        </div>
        <span className="text-[11px] text-[#00a884] flex items-center gap-1 font-medium">
          <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" /> Live Real-Time Socket
        </span>
      </div>

      {/* Main chat client body */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-[300px] sm:w-[320px] flex-shrink-0 flex flex-col h-full border-r border-[#222d34]">
          <Sidebar onOpenUserModal={onOpenModal} isSplitView={true} />
        </div>

        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {activeTab === 'friends' || activeTab === 'requests' ? (
            <FriendsTab />
          ) : (
            <ChatArea />
          )}
        </div>
      </div>

      {/* WebRTC Real-Time Voice Call Modal */}
      <VoiceCallModal />

      {/* Floating toast */}
      {statusNotification && (
        <div className="absolute top-12 right-4 z-40 bg-[#00a884] text-white px-3 py-1.5 rounded-lg shadow-xl text-xs font-medium animate-bounce flex items-center gap-1.5">
          <CheckCircle2 size={14} />
          <span>{statusNotification.message}</span>
        </div>
      )}
    </div>
  );
};

export const DualSimulator = ({ onCloseSimulator }) => {
  const [modalLeftOpen, setModalLeftOpen] = useState(false);
  const [modalRightOpen, setModalRightOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0c1317] p-3 overflow-hidden select-none">
      {/* Top Banner */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#202c33] rounded-lg border border-[#2a3942] mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[#00a884] font-bold text-sm">
            <SplitSquareVertical size={18} />
            <span>WhatsApp Dual Real-Time Simulator</span>
          </div>
          <span className="hidden md:inline text-xs text-[#8696a0] bg-[#111b21] px-2.5 py-1 rounded-full border border-[#2a3942]">
            Type on Left (Alice) ➔ Right (Bob) instantly sees typing! Type on Right (Bob) ➔ Left (Alice) sees typing!
          </span>
        </div>

        <button
          onClick={onCloseSimulator}
          className="px-3 py-1.5 bg-[#111b21] hover:bg-[#2a3942] text-[#e9edef] text-xs font-semibold rounded-md transition border border-[#2a3942]"
        >
          Exit Simulator (Single View)
        </button>
      </div>

      {/* Split Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 min-h-0">
        {/* Left Simulator Window: Alice */}
        <ChatProvider initialUserId="usr_alice_01">
          <SingleChatInstance
            title="Simulator Client 1: Alice Johnson"
            defaultUserId="usr_alice_01"
            onOpenModal={() => setModalLeftOpen(true)}
          />
          <ModalWrapper isOpen={modalLeftOpen} onClose={() => setModalLeftOpen(false)} />
        </ChatProvider>

        {/* Right Simulator Window: Bob */}
        <ChatProvider initialUserId="usr_bob_02">
          <SingleChatInstance
            title="Simulator Client 2: Bob Smith"
            defaultUserId="usr_bob_02"
            onOpenModal={() => setModalRightOpen(true)}
          />
          <ModalWrapper isOpen={modalRightOpen} onClose={() => setModalRightOpen(false)} />
        </ChatProvider>
      </div>
    </div>
  );
};

const ModalWrapper = ({ isOpen, onClose }) => {
  return <UserSwitcherModal isOpen={isOpen} onClose={onClose} />;
};

export default DualSimulator;
