import http from 'http';
import { initDB, dbGet, dbAll, dbRun } from './src/db.js';
import { initSocket } from './src/socket.js';
import express from 'express';
import cors from 'cors';
import authRoutes from './src/routes/auth.js';
import usersRoutes from './src/routes/users.js';
import friendsRoutes from './src/routes/friends.js';
import messagesRoutes from './src/routes/messages.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/messages', messagesRoutes);

const server = http.createServer(app);

const runTests = async () => {
  await initDB();
  initSocket(server);

  await new Promise((resolve) => server.listen(5099, resolve));
  console.log('Test server running on port 5099');

  const BASE_URL = 'http://localhost:5099/api';

  const makeReq = async (url, method = 'GET', body = null) => {
    const res = await fetch(`${BASE_URL}${url}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : null
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  };

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  };

  try {
    // 1. Test registration
    const testUsername = `user_${Date.now().toString().slice(-4)}`;
    const regRes = await makeReq('/auth/register', 'POST', {
      name: 'Integration Tester',
      username: testUsername,
      status_message: 'Testing WhatsApp logic'
    });
    assert(regRes.status === 201 && regRes.data.user?.id, '1. User Registration API stores user in DB');
    const newUserId = regRes.data.user.id;

    // 2. Test user discovery relative to current user
    const usersRes = await makeReq(`/users?current_user_id=${newUserId}`);
    assert(usersRes.status === 200 && Array.isArray(usersRes.data.users) && usersRes.data.users.length > 0, '2. Discovery API lists registered persons');

    // 3. Test non-friend message rejection
    const targetUser = usersRes.data.users[0]; // e.g. Alice
    const blockedMsgRes = await makeReq('/messages/send', 'POST', {
      sender_id: newUserId,
      receiver_id: targetUser.id,
      content: 'Hey, I am not your friend yet!'
    });
    assert(blockedMsgRes.status === 403, '3. Non-friend messaging is strictly blocked with 403');

    // 4. Send Friend Request
    const sendReqRes = await makeReq('/friends/request', 'POST', {
      sender_id: newUserId,
      receiver_id: targetUser.id
    });
    assert(sendReqRes.status === 201 && sendReqRes.data.requestId, '4. Friend request created and saved as pending');
    const reqId = sendReqRes.data.requestId;

    // 5. Target user fetches pending requests
    const getReqsRes = await makeReq(`/friends/requests/${targetUser.id}`);
    const foundIncoming = getReqsRes.data.incoming?.some((r) => r.id === reqId);
    assert(foundIncoming, '5. Target user receives pending friend request in requests list');

    // 6. Target user accepts friend request
    const acceptRes = await makeReq('/friends/respond', 'POST', {
      request_id: reqId,
      user_id: targetUser.id,
      action: 'accept'
    });
    assert(acceptRes.status === 200 && acceptRes.data.status === 'accepted', '6. Friend request accepted successfully');

    // 7. Verify both users are now in each other\'s friends list
    const friendsResA = await makeReq(`/friends/list/${newUserId}`);
    const friendsResB = await makeReq(`/friends/list/${targetUser.id}`);
    const isFriendInA = friendsResA.data.friends?.some((f) => f.id === targetUser.id);
    const isFriendInB = friendsResB.data.friends?.some((f) => f.id === newUserId);
    assert(isFriendInA && isFriendInB, '7. Both users confirmed as friends in friends list');

    // 8. Now send real message between accepted friends
    const sendMsgRes = await makeReq('/messages/send', 'POST', {
      sender_id: newUserId,
      receiver_id: targetUser.id,
      content: 'Hello friend! Real-time WhatsApp tick test 🚀'
    });
    assert(sendMsgRes.status === 201 && sendMsgRes.data.data?.status === 'sent', '8. Friend message sent with status "sent" (single tick)');
    const msgId = sendMsgRes.data.data.id;

    // 9. Target user reads message
    const readRes = await makeReq('/messages/read', 'POST', {
      reader_id: targetUser.id,
      friend_id: newUserId
    });
    assert(readRes.status === 200 && readRes.data.count >= 1, '9. Message marked as read (blue double tick)');

    // 10. Fetch message history
    const historyRes = await makeReq(`/messages/${newUserId}/${targetUser.id}`);
    const savedMsg = historyRes.data.messages?.find((m) => m.id === msgId);
    assert(savedMsg?.status === 'read', '10. Message history accurately preserves "read" status in DB');

    // 11. Person-wise summary endpoint
    const summaryRes = await makeReq(`/users/${newUserId}/summary`);
    assert(summaryRes.status === 200 && summaryRes.data.friendsCount >= 1, '11. Person-wise summary endpoint provides live metrics');

    console.log(`\n===========================================`);
    console.log(`Integration Test Results: ${passed} PASSED, ${failed} FAILED`);
    console.log(`===========================================\n`);

    server.close();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    server.close();
    process.exit(1);
  }
};

runTests();
