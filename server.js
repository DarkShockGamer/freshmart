const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

// ─── Constants ────────────────────────────────────────────────────
const PRODUCTS = [
  { id: 'apple',   name: 'Apples',   emoji: '🍎', cost: 2, basePrice: 4,  category: 'Produce'   },
  { id: 'bread',   name: 'Bread',    emoji: '🍞', cost: 1, basePrice: 3,  category: 'Bakery'    },
  { id: 'milk',    name: 'Milk',     emoji: '🥛', cost: 2, basePrice: 5,  category: 'Dairy'     },
  { id: 'cheese',  name: 'Cheese',   emoji: '🧀', cost: 3, basePrice: 7,  category: 'Dairy'     },
  { id: 'chicken', name: 'Chicken',  emoji: '🍗', cost: 5, basePrice: 10, category: 'Meat'      },
  { id: 'cola',    name: 'Cola',     emoji: '🥤', cost: 1, basePrice: 3,  category: 'Beverages' },
  { id: 'cereal',  name: 'Cereal',   emoji: '🥣', cost: 3, basePrice: 6,  category: 'Dry Goods' },
  { id: 'eggs',    name: 'Eggs',     emoji: '🥚', cost: 2, basePrice: 5,  category: 'Dairy'     },
  { id: 'banana',  name: 'Bananas',  emoji: '🍌', cost: 1, basePrice: 3,  category: 'Produce'   },
  { id: 'cookie',  name: 'Cookies',  emoji: '🍪', cost: 2, basePrice: 5,  category: 'Bakery'    },
  { id: 'water',   name: 'Water',    emoji: '💧', cost: 0, basePrice: 2,  category: 'Beverages' },
  { id: 'steak',   name: 'Steak',    emoji: '🥩', cost: 8, basePrice: 16, category: 'Meat'      },
];

const CUSTOMER_NAMES = ['Alice','Bob','Carol','Dave','Eve','Frank','Grace','Hank','Iris','Jack','Karen','Leo'];
const CUSTOMER_EMOJIS = ['🧑','👩','👨','🧓','👴','👵','🧒','👦','👧','🧔','👱','🧕'];

const EVENTS = [
  { type: 'rush',    label: '🏃 Rush Hour!',        desc: 'Customers arrive twice as fast for 30s', duration: 30 },
  { type: 'sale',    label: '🏷️ Flash Sale!',       desc: 'All sales earn 50% more for 20s',        duration: 20 },
  { type: 'theft',   label: '🦝 Shoplifter!',       desc: 'Click STOP THIEF within 10s!',           duration: 10 },
  { type: 'spoil',   label: '🤢 Spoilage Alert!',   desc: 'A product batch has spoiled',             duration: 0  },
  { type: 'inspect', label: '🕵️ Health Inspection', desc: 'Shelves must be stocked',                duration: 0  },
  { type: 'vip',     label: '⭐ VIP Customer!',     desc: 'Big spender incoming — serve them well!', duration: 0  },
];

const UPGRADES = [
  { id: 'cashier',  name: 'Extra Cashier',   emoji: '🧑‍💼', cost: 80,  desc: 'Customers are served 25% faster' },
  { id: 'shelves',  name: 'Better Shelves',  emoji: '🗄️',  cost: 60,  desc: 'Hold 15 more units of every product' },
  { id: 'ads',      name: 'Advertising',     emoji: '📢',  cost: 100, desc: '40% more customers each wave' },
  { id: 'fresh',    name: 'Fresh Guarantee', emoji: '✅',  cost: 120, desc: 'Immune to spoilage events' },
  { id: 'security', name: 'Security Guard',  emoji: '👮',  cost: 90,  desc: 'Auto-catches all shoplifters' },
  { id: 'loyalty',  name: 'Loyalty Program', emoji: '💳',  cost: 150, desc: 'Earn +15% on every sale' },
];

const PLAYER_COLORS = ['#f97316','#6366f1','#10b981','#ec4899','#eab308','#06b6d4'];
const PLAYER_ROLES  = ['Store Manager','Head Cashier','Stock Clerk','Sales Associate','Floor Manager','Greeter'];

// ─── Room Storage ─────────────────────────────────────────────────
const rooms = new Map();
const socketRoom = new Map(); // socketId → roomCode

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(c) ? generateCode() : c;
}

function freshStore() {
  const inv = {}, prices = {}, shelves = {};
  PRODUCTS.forEach(p => { inv[p.id] = 10; prices[p.id] = p.basePrice; shelves[p.id] = true; });
  return { inv, prices, shelves };
}

function createRoom(hostId, hostName) {
  const code = generateCode();
  const { inv, prices, shelves } = freshStore();
  const room = {
    code, hostId,
    phase: 'lobby',
    players: {},
    money: 200, day: 1, totalScore: 0, reputation: 100,
    inventory: inv, prices, shelves,
    customers: [], eventLog: [],
    activeEvent: null, upgrades: [],
    nextCustomerId: 1, dayTimer: 120,
    rushActive: false, saleActive: false, theftActive: false,
    theftTimeout: null, capacityBonus: 0,
    _cInt: null, _dInt: null, _eTimeout: null,
  };
  const idx = 0;
  room.players[hostId] = {
    id: hostId, name: hostName || 'Player 1',
    color: PLAYER_COLORS[idx], role: PLAYER_ROLES[idx],
    personalScore: 0,
  };
  rooms.set(code, room);
  return room;
}

function roomLog(room, msg) {
  room.eventLog.unshift({ msg, t: Date.now() });
  if (room.eventLog.length > 40) room.eventLog.pop();
}

function emit(room) {
  io.to(room.code).emit('roomState', {
    code: room.code, phase: room.phase, hostId: room.hostId,
    players: room.players,
    money: room.money, day: room.day, totalScore: room.totalScore, reputation: room.reputation,
    inventory: room.inventory, prices: room.prices, shelves: room.shelves,
    customers: room.customers,
    eventLog: room.eventLog.slice(0, 15),
    activeEvent: room.activeEvent, upgrades: room.upgrades,
    dayTimer: room.dayTimer,
    rushActive: room.rushActive, saleActive: room.saleActive, theftActive: room.theftActive,
    capacityBonus: room.capacityBonus,
    products: PRODUCTS, upgradeList: UPGRADES,
  });
}

// ─── Customer Logic ───────────────────────────────────────────────
function spawnCustomer(room) {
  if (room.phase !== 'playing') return;
  const avail = PRODUCTS.filter(p => (room.inventory[p.id] || 0) > 0 && room.shelves[p.id]);
  if (avail.length === 0) return;

  const isVip = room.activeEvent?.type === 'vip';
  const numItems = isVip ? Math.floor(Math.random()*4)+3 : Math.floor(Math.random()*3)+1;
  const wants = [];
  for (let i = 0; i < numItems; i++) {
    const prod = avail[Math.floor(Math.random() * avail.length)];
    if (!wants.find(w => w.id === prod.id))
      wants.push({ id: prod.id, qty: isVip ? Math.floor(Math.random()*4)+2 : Math.floor(Math.random()*3)+1 });
  }
  const patience = 15 + Math.floor(Math.random() * 12);
  const c = {
    id: room.nextCustomerId++,
    name: CUSTOMER_NAMES[Math.floor(Math.random()*CUSTOMER_NAMES.length)],
    emoji: CUSTOMER_EMOJIS[Math.floor(Math.random()*CUSTOMER_EMOJIS.length)],
    wants, patience, maxPatience: patience, spawnTime: Date.now(), isVip,
  };
  room.customers.push(c);
  setTimeout(() => {
    const idx = room.customers.findIndex(x => x.id === c.id);
    if (idx !== -1) {
      room.reputation = Math.max(0, room.reputation - 5);
      roomLog(room, `😤 ${c.name} left unserved! Rep -5`);
      room.customers.splice(idx, 1);
      emit(room);
    }
  }, patience * 1000);
}

function serveCustomer(room, cid, sid) {
  if (room.phase !== 'playing') return { ok: false, msg: 'Game not active' };
  const idx = room.customers.findIndex(c => c.id === cid);
  if (idx === -1) return { ok: false, msg: 'Customer already gone!' };
  const c = room.customers[idx];
  let total = 0, hasIssues = false;
  for (const w of c.wants) {
    const avail = room.inventory[w.id] || 0;
    const qty = Math.min(w.qty, avail);
    if (qty < w.qty) hasIssues = true;
    total += room.prices[w.id] * qty;
    room.inventory[w.id] = Math.max(0, avail - qty);
  }
  let mult = 1;
  if (room.saleActive) mult *= 1.5;
  if (room.upgrades.includes('loyalty')) mult *= 1.15;
  if (c.isVip) mult *= 2;
  total = Math.round(total * mult);
  room.money += total;
  room.totalScore += total;
  room.reputation = Math.max(0, Math.min(100, room.reputation + (hasIssues ? -2 : 1)));
  const p = room.players[sid];
  if (p) p.personalScore += total;
  room.customers.splice(idx, 1);
  const tag = c.isVip ? ' ⭐VIP×2' : '';
  const sTag = room.saleActive ? ' 🏷️+50%' : '';
  roomLog(room, `✅ ${p?.name||'?'} served ${c.name}${tag} — $${total}${sTag}`);
  return { ok: true, earned: total, isVip: c.isVip };
}

// ─── Events ───────────────────────────────────────────────────────
function triggerEvent(room) {
  if (room.phase !== 'playing') return;
  const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  room.activeEvent = ev;
  roomLog(room, `⚡ ${ev.label} — ${ev.desc}`);
  emit(room);

  if (ev.type === 'rush') {
    room.rushActive = true;
    setTimeout(() => { room.rushActive = false; room.activeEvent = null; emit(room); }, ev.duration*1000);
  } else if (ev.type === 'sale') {
    room.saleActive = true;
    setTimeout(() => { room.saleActive = false; room.activeEvent = null; emit(room); }, ev.duration*1000);
  } else if (ev.type === 'theft') {
    if (room.upgrades.includes('security')) {
      roomLog(room, '👮 Security guard caught the thief instantly!');
      room.activeEvent = null; emit(room);
    } else {
      room.theftActive = true;
      room.theftTimeout = setTimeout(() => {
        if (room.theftActive) {
          room.money = Math.max(0, room.money - 10);
          room.theftActive = false; room.activeEvent = null;
          roomLog(room, '🦝 Thief escaped! Lost $10'); emit(room);
        }
      }, ev.duration*1000);
    }
  } else if (ev.type === 'spoil') {
    if (room.upgrades.includes('fresh')) {
      roomLog(room, '✅ Fresh Guarantee blocked spoilage!');
    } else {
      const t = PRODUCTS.slice().sort(()=>Math.random()-0.5).find(p => room.inventory[p.id] > 0);
      if (t) { room.inventory[t.id] = Math.max(0, room.inventory[t.id]-5); roomLog(room, `🤢 ${t.name} spoiled! -5 stock`); }
    }
    room.activeEvent = null; emit(room);
  } else if (ev.type === 'inspect') {
    const low = PRODUCTS.filter(p => room.shelves[p.id] && (room.inventory[p.id]||0) < 3);
    if (low.length > 0) {
      room.money = Math.max(0, room.money-20);
      roomLog(room, `🕵️ Failed inspection! (${low.map(p=>p.name).join(', ')}) -$20`);
    } else { roomLog(room, '🕵️ Passed health inspection! ✅'); }
    room.activeEvent = null; emit(room);
  } else if (ev.type === 'vip') {
    setTimeout(() => { spawnCustomer(room); emit(room); }, 800);
    setTimeout(() => { room.activeEvent = null; emit(room); }, 8000);
  }
}

// ─── Day Flow ─────────────────────────────────────────────────────
function startDay(room) {
  room.phase = 'playing';
  room.dayTimer = 120;
  room.customers = [];
  roomLog(room, `📅 Day ${room.day} open! You have 2 minutes.`);
  emit(room);

  room._cInt = setInterval(() => {
    if (room.phase !== 'playing') return;
    const boost = room.upgrades.includes('ads') ? 1.4 : 1;
    const times = room.rushActive ? 2 : 1;
    for (let i = 0; i < times; i++) if (Math.random() < 0.72 * boost) spawnCustomer(room);
    emit(room);
  }, 3500);

  const schedEv = () => {
    const d = (18 + Math.random()*15)*1000;
    room._eTimeout = setTimeout(() => { if (room.phase==='playing') { triggerEvent(room); schedEv(); } }, d);
  };
  schedEv();

  room._dInt = setInterval(() => {
    room.dayTimer--;
    if (room.dayTimer <= 0) endDay(room); else emit(room);
  }, 1000);
}

function endDay(room) {
  clearInterval(room._cInt); clearInterval(room._dInt); clearTimeout(room._eTimeout); clearTimeout(room.theftTimeout);
  room.phase = 'shop';
  room.customers = []; room.rushActive = false; room.saleActive = false; room.theftActive = false; room.activeEvent = null;
  roomLog(room, `🌙 Day ${room.day} ended! Restock & upgrade before next day.`);
  room.day++;
  emit(room);
}

function stopRoom(room) {
  clearInterval(room._cInt); clearInterval(room._dInt); clearTimeout(room._eTimeout); clearTimeout(room.theftTimeout);
}

function resetRoom(room) {
  stopRoom(room);
  const { inv, prices, shelves } = freshStore();
  const players = {};
  Object.entries(room.players).forEach(([id, p], i) => {
    players[id] = { ...p, personalScore: 0, role: PLAYER_ROLES[i % PLAYER_ROLES.length], color: PLAYER_COLORS[i % PLAYER_COLORS.length] };
  });
  Object.assign(room, {
    phase: 'lobby', money: 200, day: 1, totalScore: 0, reputation: 100,
    inventory: inv, prices, shelves, customers: [], eventLog: [],
    activeEvent: null, upgrades: [], nextCustomerId: 1, dayTimer: 120,
    rushActive: false, saleActive: false, theftActive: false,
    theftTimeout: null, capacityBonus: 0, _cInt: null, _dInt: null, _eTimeout: null,
    players,
  });
  roomLog(room, '🔄 Game reset — back to lobby!');
  emit(room);
}

// ─── Socket.io ────────────────────────────────────────────────────
io.on('connection', (socket) => {

  socket.on('createRoom', ({ name }) => {
    const playerName = (name||'').trim().slice(0,20) || 'Player 1';
    const room = createRoom(socket.id, playerName);
    socketRoom.set(socket.id, room.code);
    socket.join(room.code);
    socket.emit('roomJoined', { code: room.code, playerId: socket.id });
    emit(room);
  });

  socket.on('joinRoom', ({ code, name }) => {
    const roomCode = (code||'').toUpperCase().trim();
    const room = rooms.get(roomCode);
    if (!room) { socket.emit('joinError', 'Room not found — double-check your code!'); return; }
    if (room.phase !== 'lobby') { socket.emit('joinError', 'Game already started!'); return; }
    if (Object.keys(room.players).length >= 6) { socket.emit('joinError', 'Room is full (max 6)!'); return; }
    const idx = Object.keys(room.players).length;
    const playerName = (name||'').trim().slice(0,20) || `Player ${idx+1}`;
    room.players[socket.id] = { id: socket.id, name: playerName, color: PLAYER_COLORS[idx%6], role: PLAYER_ROLES[idx%6], personalScore: 0 };
    socketRoom.set(socket.id, roomCode);
    socket.join(roomCode);
    roomLog(room, `👋 ${playerName} joined!`);
    socket.emit('roomJoined', { code: roomCode, playerId: socket.id });
    emit(room);
  });

  socket.on('setName', ({ name }) => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room || !room.players[socket.id]) return;
    const n = (name||'').trim().slice(0,20); if (!n) return;
    room.players[socket.id].name = n; emit(room);
  });

  socket.on('startGame', () => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room || room.phase !== 'lobby') return;
    if (room.hostId !== socket.id) { socket.emit('msg', { type:'error', text:'Only the host can start!' }); return; }
    roomLog(room, `🎉 ${room.players[socket.id]?.name} opened the store!`);
    startDay(room);
  });

  socket.on('nextDay', () => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room || room.phase !== 'shop') return;
    if (room.hostId !== socket.id) { socket.emit('msg', { type:'error', text:'Only the host can start next day!' }); return; }
    startDay(room);
  });

  socket.on('serveCustomer', (cid) => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room) return;
    const result = serveCustomer(room, cid, socket.id);
    socket.emit('serveResult', result);
    if (result.ok) emit(room);
  });

  socket.on('stopThief', () => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room || !room.theftActive) return;
    clearTimeout(room.theftTimeout);
    room.theftActive = false; room.activeEvent = null;
    roomLog(room, `👮 ${room.players[socket.id]?.name||'?'} caught the thief! $10 saved!`);
    emit(room);
  });

  socket.on('restock', ({ productId, qty }) => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room || room.phase !== 'shop') { socket.emit('msg', { type:'error', text:'Only during shop phase!' }); return; }
    const prod = PRODUCTS.find(p => p.id === productId); if (!prod) return;
    const maxCap = 30 + room.capacityBonus;
    const cur = room.inventory[productId]||0;
    const canAdd = Math.min(Math.max(0, qty), maxCap - cur);
    if (canAdd===0) { socket.emit('msg', { type:'error', text:'Shelves are full!' }); return; }
    const cost = prod.cost * canAdd;
    if (cost > room.money) { socket.emit('msg', { type:'error', text:`Need $${cost}, only have $${room.money}!` }); return; }
    room.money -= cost;
    room.inventory[productId] = cur + canAdd;
    roomLog(room, `📦 ${room.players[socket.id]?.name||'?'} restocked ${prod.name} ×${canAdd} (-$${cost})`);
    emit(room);
  });

  socket.on('setPrice', ({ productId, price }) => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room) return;
    room.prices[productId] = Math.max(1, Math.min(99, Math.round(Number(price)||1)));
    emit(room);
  });

  socket.on('toggleShelf', ({ productId }) => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room) return;
    room.shelves[productId] = !room.shelves[productId];
    emit(room);
  });

  socket.on('buyUpgrade', (uid) => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room || room.phase !== 'shop') { socket.emit('msg', { type:'error', text:'Only during shop phase!' }); return; }
    if (room.upgrades.includes(uid)) { socket.emit('msg', { type:'error', text:'Already owned!' }); return; }
    const upg = UPGRADES.find(u => u.id === uid); if (!upg) return;
    if (room.money < upg.cost) { socket.emit('msg', { type:'error', text:`Need $${upg.cost}!` }); return; }
    room.money -= upg.cost;
    room.upgrades.push(uid);
    if (uid === 'shelves') room.capacityBonus += 15;
    roomLog(room, `⬆️ ${room.players[socket.id]?.name||'?'} bought: ${upg.name}!`);
    emit(room);
  });

  socket.on('resetGame', () => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room) return;
    if (room.hostId !== socket.id) { socket.emit('msg', { type:'error', text:'Only the host can reset!' }); return; }
    resetRoom(room);
  });

  socket.on('leaveRoom', () => handleLeave(socket));
  socket.on('disconnect', () => handleLeave(socket));

  function handleLeave(sock) {
    const code = socketRoom.get(sock.id);
    if (!code) return;
    const room = rooms.get(code);
    socketRoom.delete(sock.id);
    if (!room) return;
    const pname = room.players[sock.id]?.name || 'A player';
    delete room.players[sock.id];
    sock.leave(code);
    if (Object.keys(room.players).length === 0) { stopRoom(room); rooms.delete(code); return; }
    if (room.hostId === sock.id) {
      room.hostId = Object.keys(room.players)[0];
      roomLog(room, `👑 ${room.players[room.hostId].name} is now host.`);
    }
    roomLog(room, `👋 ${pname} left.`);
    emit(room);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🛒 FreshMart → http://localhost:${PORT}`));
