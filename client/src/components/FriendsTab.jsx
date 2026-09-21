import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { UserPlus, UserCheck, Clock, Check, X, Search, ShieldCheck, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

export const FriendsTab = () => {
  const {
    allUsers,
    friends,
    incomingRequests,
    outgoingRequests,
    currentUser,
    sendFriendRequest,
    respondFriendRequest,
    openChatWithFriend,
    activeTab
  } = useChat();

  const [filterSearch, setFilterSearch] = useState('');
  const [subTab, setSubTab] = useState(activeTab === 'requests' ? 'requests' : 'discover');

  // Filter users based on search
  const filteredUsers = allUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(filterSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(filterSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#111b21]">
      {/* Sub Tabs */}
      <div className="flex bg-[#202c33] p-1.5 gap-1.5 border-b border-[#222d34]">
        <button
          onClick={() => setSubTab('discover')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded transition ${
            subTab === 'discover'
              ? 'bg-[#00a884] text-white shadow'
              : 'text-[#8696a0] hover:text-[#e9edef] hover:bg-[#111b21]'
          }`}
        >
          Discover Users ({allUsers.length})
        </button>
        <button
          onClick={() => setSubTab('requests')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded transition relative ${
            subTab === 'requests'
              ? 'bg-[#00a884] text-white shadow'
              : 'text-[#8696a0] hover:text-[#e9edef] hover:bg-[#111b21]'
          }`}
        >
          <span>Requests</span>
          {incomingRequests.length > 0 && (
            <span className="ml-1.5 bg-[#25D366] text-[#111b21] px-1.5 py-0.2 rounded-full text-[10px] font-bold">
              {incomingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Discover SubTab */}
      {subTab === 'discover' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search box */}
          <div className="p-3 bg-[#111b21] border-b border-[#222d34]">
            <div className="flex items-center gap-2 bg-[#202c33] px-3 py-1.5 rounded-lg">
              <Search size={16} className="text-[#8696a0]" />
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
          <div className="flex-1 overflow-y-auto divide-y divide-[#202c33]/50">
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
                    className="flex items-center justify-between p-3.5 hover:bg-[#202c33]/60 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex-shrink-0">
                        <img
                          src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                          alt={user.name}
                          className="w-11 h-11 rounded-full object-cover"
                        />
                        {user.is_online ? (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#25D366] rounded-full border-2 border-[#111b21]" />
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#e9edef] truncate">{user.name}</span>
                          <span className="text-xs text-[#8696a0]">@{user.username}</span>
                        </div>
                        <p className="text-xs text-[#8696a0] truncate max-w-[200px] mt-0.5">
                          {user.status_message || 'Hey there! I am using WhatsApp.'}
                        </p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex-shrink-0 ml-2">
                      {isFriend ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-xs text-[#00a884] font-medium bg-[#00a884]/10 px-2 py-1 rounded">
                            <UserCheck size={14} /> Friends
                          </span>
                          <button
                            onClick={() => {
                              const fObj = friends.find((f) => f.id === user.id) || user;
                              openChatWithFriend(fObj);
                            }}
                            className="p-1.5 bg-[#00a884] text-white rounded hover:bg-[#008f6f] transition"
                            title="Chat now"
                          >
                            <MessageSquare size={14} />
                          </button>
                        </div>
                      ) : isPendingSent ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[#e9edef] bg-[#202c33] border border-[#8696a0]/30 px-2.5 py-1.5 rounded">
                          <Clock size={14} className="text-yellow-400" /> Pending
                        </span>
                      ) : isPendingReceived ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => respondFriendRequest(user.requestId, 'accept')}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#00a884] text-white text-xs font-semibold rounded hover:bg-[#008f6f] transition shadow"
                          >
                            <Check size={14} /> Accept
                          </button>
                          <button
                            onClick={() => respondFriendRequest(user.requestId, 'reject')}
                            className="p-1.5 bg-[#202c33] text-[#ff5b5b] hover:bg-[#2a3942] rounded transition"
                            title="Decline"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => sendFriendRequest(user.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00a884] text-white text-xs font-semibold rounded hover:bg-[#008f6f] transition shadow"
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

      {/* Requests SubTab */}
      {subTab === 'requests' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Incoming Requests */}
          <div>
            <h3 className="text-xs font-bold text-[#8696a0] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>Incoming Friend Requests</span>
              <span className="bg-[#00a884] text-white text-[10px] px-1.5 py-0.2 rounded-full">
                {incomingRequests.length}
              </span>
            </h3>

            {incomingRequests.length === 0 ? (
              <div className="p-5 bg-[#202c33]/50 rounded-lg text-center text-xs text-[#8696a0]">
                No pending incoming requests
              </div>
            ) : (
              <div className="space-y-2">
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 bg-[#202c33] rounded-lg border border-[#2a3942] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={req.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.username}`}
                        alt={req.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-sm font-semibold text-[#e9edef]">{req.name}</p>
                        <p className="text-xs text-[#8696a0]">@{req.username} wants to connect</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => respondFriendRequest(req.id, 'accept')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#00a884] text-white text-xs font-semibold rounded hover:bg-[#008f6f] transition shadow"
                      >
                        <Check size={14} /> Accept
                      </button>
                      <button
                        onClick={() => respondFriendRequest(req.id, 'reject')}
                        className="p-1.5 bg-[#111b21] text-[#ff5b5b] hover:bg-[#2a3942] rounded transition"
                        title="Decline"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing Requests */}
          <div>
            <h3 className="text-xs font-bold text-[#8696a0] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>Sent Requests (Waiting for approval)</span>
              <span className="bg-[#202c33] text-[#8696a0] text-[10px] px-1.5 py-0.2 rounded-full">
                {outgoingRequests.length}
              </span>
            </h3>

            {outgoingRequests.length === 0 ? (
              <div className="p-4 bg-[#202c33]/30 rounded-lg text-center text-xs text-[#8696a0]">
                No pending sent requests
              </div>
            ) : (
              <div className="space-y-2">
                {outgoingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-2.5 bg-[#202c33]/60 rounded-lg border border-[#2a3942]/50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={req.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.username}`}
                        alt={req.name}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-xs font-semibold text-[#e9edef]">{req.name}</p>
                        <p className="text-[11px] text-[#8696a0]">@{req.username}</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded flex items-center gap-1">
                      <Clock size={12} /> Pending...
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendsTab;
