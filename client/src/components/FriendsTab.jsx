import React, { useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { Avatar } from './Avatar';
import {
  UserPlus,
  UserCheck,
  Clock,
  Check,
  X,
  Search,
  MessageSquare,
  Phone,
  UserMinus,
  Users,
  Inbox,
  Sparkles,
  ArrowLeft
} from 'lucide-react';

export const FriendsTab = () => {
  const {
    allUsers,
    friends,
    incomingRequests,
    outgoingRequests,
    currentUser,
    sendFriendRequest,
    respondFriendRequest,
    cancelFriendRequest,
    removeFriend,
    openChatWithFriend,
    startVoiceCall,
    activeTab,
    setActiveTab,
    setActiveFriend
  } = useChat();

  const [filterSearch, setFilterSearch] = useState('');
  const [subTab, setSubTab] = useState(activeTab === 'requests' ? 'requests' : 'friends');

  // Sync subTab whenever activeTab in context changes
  useEffect(() => {
    if (activeTab === 'requests') {
      setSubTab('requests');
    } else if (activeTab === 'friends') {
      setSubTab('friends');
    }
  }, [activeTab]);

  // Filter users based on search
  const filteredUsers = allUsers.filter(
    (u) =>
      u.name?.toLowerCase().includes(filterSearch.toLowerCase()) ||
      u.username?.toLowerCase().includes(filterSearch.toLowerCase())
  );

  const filteredFriends = friends.filter(
    (f) =>
      f.name?.toLowerCase().includes(filterSearch.toLowerCase()) ||
      f.username?.toLowerCase().includes(filterSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#111b21] select-none">
      {/* Top Header & Sub Tabs Navigation */}
      <div className="bg-[#202c33] border-b border-[#222d34] flex flex-col flex-shrink-0">
        <div className="flex items-center justify-between px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveFriend(null)}
              className="sm:hidden p-1.5 -ml-1 text-[#8696a0] hover:text-[#e9edef] rounded-full"
              title="Back"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-base font-bold text-[#e9edef] tracking-wide">
              {subTab === 'friends' ? 'My Friends' : subTab === 'requests' ? 'Friend Requests' : 'Discover People'}
            </h2>
          </div>

          <span className="text-[11px] text-[#00a884] bg-[#111b21] px-2.5 py-1 rounded-full border border-[#2a3942]">
            {friends.length} Friends
          </span>
        </div>

        {/* 3 Nav Tabs: Friends | Requests | Discover */}
        <div className="flex bg-[#182229] p-1 gap-1 border-t border-[#222d34]">
          <button
            onClick={() => setSubTab('friends')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
              subTab === 'friends'
                ? 'bg-[#00a884] text-white shadow-md'
                : 'text-[#8696a0] hover:text-[#e9edef] hover:bg-[#202c33]'
            }`}
          >
            <Users size={14} />
            <span>Friends</span>
            {friends.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                subTab === 'friends' ? 'bg-white/20 text-white' : 'bg-[#202c33] text-[#8696a0]'
              }`}>
                {friends.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('requests')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 relative ${
              subTab === 'requests'
                ? 'bg-[#00a884] text-white shadow-md'
                : 'text-[#8696a0] hover:text-[#e9edef] hover:bg-[#202c33]'
            }`}
          >
            <Inbox size={14} />
            <span>Requests</span>
            {incomingRequests.length > 0 ? (
              <span className="bg-[#25D366] text-[#111b21] px-1.5 py-0.2 rounded-full text-[10px] font-bold animate-pulse">
                {incomingRequests.length}
              </span>
            ) : outgoingRequests.length > 0 ? (
              <span className="text-[10px] bg-[#202c33] text-[#8696a0] px-1.5 py-0.2 rounded-full">
                {outgoingRequests.length}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setSubTab('discover')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
              subTab === 'discover'
                ? 'bg-[#00a884] text-white shadow-md'
                : 'text-[#8696a0] hover:text-[#e9edef] hover:bg-[#202c33]'
            }`}
          >
            <Search size={14} />
            <span>Discover</span>
            {allUsers.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                subTab === 'discover' ? 'bg-white/20 text-white' : 'bg-[#202c33] text-[#8696a0]'
              }`}>
                {allUsers.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SUBTAB 1: CONFIRMED FRIENDS LIST */}
      {/* ========================================================= */}
      {subTab === 'friends' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search box if friends exist */}
          {friends.length > 0 && (
            <div className="p-3 bg-[#111b21] border-b border-[#222d34]">
              <div className="flex items-center gap-2 bg-[#202c33] px-3 py-1.5 rounded-lg border border-[#2a3942]/50">
                <Search size={15} className="text-[#8696a0]" />
                <input
                  type="text"
                  placeholder="Search friends..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none w-full"
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto divide-y divide-[#202c33]/40 p-2">
            {friends.length === 0 ? (
              <div className="p-8 text-center text-[#8696a0] flex flex-col items-center justify-center h-full space-y-3">
                <div className="w-16 h-16 rounded-full bg-[#202c33] flex items-center justify-center text-[#00a884]">
                  <Users size={30} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#e9edef]">No friends yet</h4>
                  <p className="text-xs text-[#8696a0] max-w-xs mt-1">
                    Connect with candidates by searching them in the <strong>Discover</strong> tab or accepting incoming requests!
                  </p>
                </div>
                <button
                  onClick={() => setSubTab('discover')}
                  className="px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] text-white text-xs font-semibold rounded-lg transition shadow flex items-center gap-1.5 mt-2"
                >
                  <Search size={14} /> Find & Add People
                </button>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="p-8 text-center text-[#8696a0]">
                <p className="text-sm">No friends match "{filterSearch}"</p>
              </div>
            ) : (
              filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-[#202c33]/70 transition my-1"
                >
                  <div
                    onClick={() => openChatWithFriend(friend)}
                    className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                  >
                    <Avatar
                      src={friend.avatar}
                      name={friend.name}
                      username={friend.username}
                      size="md"
                      showOnline={true}
                      isOnline={friend.is_online}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#e9edef] truncate">{friend.name}</span>
                        <span className="text-xs text-[#8696a0]">@{friend.username}</span>
                      </div>
                      <p className="text-xs text-[#8696a0] truncate max-w-[200px] mt-0.5">
                        {friend.status_message || 'Hey there! I am using WhatsApp.'}
                      </p>
                    </div>
                  </div>

                  {/* Actions: Chat & Voice Call & Remove */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    <button
                      onClick={() => openChatWithFriend(friend)}
                      className="p-2 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-lg transition shadow"
                      title="Chat with friend"
                    >
                      <MessageSquare size={15} />
                    </button>
                    <button
                      onClick={() => startVoiceCall(friend)}
                      className="p-2 bg-[#202c33] hover:bg-[#2a3942] text-[#25D366] border border-[#2a3942] rounded-lg transition shadow"
                      title="Start voice call"
                    >
                      <Phone size={15} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Remove ${friend.name} from your friends?`)) {
                          removeFriend(friend.id);
                        }
                      }}
                      className="p-2 text-[#8696a0] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      title="Remove friend"
                    >
                      <UserMinus size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 2: FRIEND REQUESTS (INCOMING & SENT) */}
      {/* ========================================================= */}
      {subTab === 'requests' && (
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-6">
          {/* Section A: Incoming Requests (Must accept/decline) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#8696a0] uppercase tracking-wider flex items-center gap-1.5">
                <span>Incoming Friend Requests</span>
                <span className="bg-[#00a884] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {incomingRequests.length}
                </span>
              </h3>
            </div>

            {incomingRequests.length === 0 ? (
              <div className="p-5 bg-[#202c33]/40 rounded-xl text-center text-xs text-[#8696a0] border border-[#2a3942]/30">
                No pending incoming requests
              </div>
            ) : (
              <div className="space-y-2">
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 bg-[#202c33] rounded-xl border border-[#00a884]/30 shadow-md flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={req.avatar}
                        name={req.name}
                        username={req.username}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#e9edef] truncate">{req.name}</p>
                        <p className="text-xs text-[#00a884]">@{req.username} wants to connect</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <button
                        onClick={() => respondFriendRequest(req.id, 'accept')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#00a884] hover:bg-[#008f6f] text-white text-xs font-semibold rounded-lg transition shadow"
                      >
                        <Check size={14} /> Accept
                      </button>
                      <button
                        onClick={() => respondFriendRequest(req.id, 'reject')}
                        className="p-1.5 bg-[#182229] hover:bg-[#2a3942] text-red-400 border border-red-500/20 rounded-lg transition"
                        title="Decline request"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section B: Sent Requests (Waiting for other person to accept) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#8696a0] uppercase tracking-wider flex items-center gap-1.5">
                <span>Sent Requests (Waiting for approval)</span>
                <span className="bg-[#202c33] text-[#8696a0] text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {outgoingRequests.length}
                </span>
              </h3>
            </div>

            {outgoingRequests.length === 0 ? (
              <div className="p-4 bg-[#202c33]/30 rounded-xl text-center text-xs text-[#8696a0] border border-[#2a3942]/20">
                No pending sent requests
              </div>
            ) : (
              <div className="space-y-2">
                {outgoingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 bg-[#202c33]/70 rounded-xl border border-[#2a3942]/60 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={req.avatar}
                        name={req.name}
                        username={req.username}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#e9edef] truncate">{req.name}</p>
                        <p className="text-xs text-[#8696a0]">@{req.username}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <button
                        onClick={() => respondFriendRequest(req.id, 'accept')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#00a884] hover:bg-[#008f6f] text-white text-xs font-semibold rounded-lg transition shadow"
                        title="Accept & Connect instantly to start chatting"
                      >
                        <Check size={14} /> Accept & Connect
                      </button>
                      <button
                        onClick={() => cancelFriendRequest(req.id)}
                        className="p-1.5 bg-[#182229] hover:bg-red-500/20 text-[#8696a0] hover:text-red-400 rounded-lg transition text-xs flex items-center gap-1 border border-[#2a3942]"
                        title="Cancel friend request"
                      >
                        <X size={13} />
                        <span className="hidden sm:inline">Cancel</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 3: DISCOVER USERS (SEARCH & ADD FRIEND) */}
      {/* ========================================================= */}
      {subTab === 'discover' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search box */}
          <div className="p-3 bg-[#111b21] border-b border-[#222d34]">
            <div className="flex items-center gap-2 bg-[#202c33] px-3 py-1.5 rounded-lg border border-[#2a3942]/50">
              <Search size={15} className="text-[#8696a0]" />
              <input
                type="text"
                placeholder="Search registered people in DB..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none w-full"
              />
            </div>
          </div>

          {/* List of registered persons */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#202c33]/40 p-2">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-[#8696a0]">
                <p className="text-sm">No registered users found matching "{filterSearch}"</p>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isFriend = user.friendshipStatus === 'friends';
                const isPendingSent = user.friendshipStatus === 'pending_sent';
                const isPendingReceived = user.friendshipStatus === 'pending_received';

                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 hover:bg-[#202c33]/60 rounded-xl transition my-0.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={user.avatar}
                        name={user.name}
                        username={user.username}
                        size="md"
                        showOnline={true}
                        isOnline={user.is_online}
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#e9edef] truncate">{user.name}</span>
                          <span className="text-xs text-[#8696a0]">@{user.username}</span>
                        </div>
                        <p className="text-xs text-[#8696a0] truncate max-w-[190px] mt-0.5">
                          {user.status_message || 'Hey there! I am using WhatsApp.'}
                        </p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex-shrink-0 ml-2">
                      {isFriend ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-xs text-[#00a884] font-semibold bg-[#00a884]/10 px-2 py-1 rounded-md">
                            <UserCheck size={14} /> Friends
                          </span>
                          <button
                            onClick={() => {
                              const fObj = friends.find((f) => f.id === user.id) || user;
                              openChatWithFriend(fObj);
                            }}
                            className="p-1.5 bg-[#00a884] text-white rounded-md hover:bg-[#008f6f] transition"
                            title="Chat now"
                          >
                            <MessageSquare size={14} />
                          </button>
                        </div>
                      ) : isPendingSent ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-[#8696a0] bg-[#202c33] border border-[#2a3942] px-2.5 py-1 rounded-md font-medium flex items-center gap-1">
                            <Clock size={12} className="text-[#00a884]" /> Request Sent
                          </span>
                          <button
                            onClick={() => cancelFriendRequest(user.requestId)}
                            className="p-1.5 text-[#8696a0] hover:text-red-400 hover:bg-red-500/10 rounded-md transition text-xs"
                            title="Cancel request"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : isPendingReceived ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => respondFriendRequest(user.requestId, 'accept')}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#00a884] text-white text-xs font-semibold rounded-lg hover:bg-[#008f6f] transition shadow"
                          >
                            <Check size={14} /> Accept
                          </button>
                          <button
                            onClick={() => respondFriendRequest(user.requestId, 'reject')}
                            className="p-1.5 bg-[#202c33] text-red-400 hover:bg-[#2a3942] rounded-lg transition border border-red-500/20"
                            title="Decline"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => sendFriendRequest(user.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00a884] hover:bg-[#008f6f] text-white text-xs font-semibold rounded-lg transition shadow"
                        >
                          <UserPlus size={14} /> Add Friend
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendsTab;
