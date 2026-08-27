// controllers/admin.js
const SUPER_OWNER_EMAIL = "lp5006352@gmail.com";

function handleGodAction(users, io, socket, data) {
  let requester = users[data.requesterEmail?.toLowerCase().trim()];
  if (!requester || requester.role !== 'owner') {
    socket.emit('god_success', "Access Denied: Owner only!");
    return;
  }

  let targetUser = Object.values(users).find(u => 
    u.username.toLowerCase() === data.target.toLowerCase() || 
    u.pbId === data.target || 
    u.email === data.target
  );

  if (!targetUser) {
    socket.emit('god_success', "User not found!");
    return;
  }

  // 1. अनलिमिटेड कॉइन्स/डायमंड्स जोड़ना
  if (data.action === 'coins') {
    targetUser.coins += parseInt(data.value) || 0;
    io.emit('wallet_synced', { email: targetUser.email, coins: targetUser.coins });
    socket.emit('god_success', `Sent ${data.value} coins to ${targetUser.username}`);
  } 
  // 2. VIP लेवल असाइन करना
  else if (data.action === 'vip') {
    targetUser.vipLevel = parseInt(data.value) || 10;
    socket.emit('god_success', `VIP ${data.value} granted to ${targetUser.username}`);
  } 
  // 3. कस्टम गोल्डन फ्रेम देना
  else if (data.action === 'frame') {
    targetUser.vipLevel = 10;
    targetUser.frame = 'frame-gold-glow';
    socket.emit('god_success', `Gold Frame granted to ${targetUser.username}`);
  }
}

module.exports = { handleGodAction, SUPER_OWNER_EMAIL };
