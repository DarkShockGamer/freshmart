const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// ─── Game Constants ───────────────────────────────────────────────
const PRODUCTS = [
  { id: 'apple',    name: 'Apples',      emoji: '🍎', cost: 2,  basePrice: 4,  category: 'produce'   },
  { id: 'bread',    name: 'Bread',       emoji: '🍞', cost: 1,  basePrice: 3,  category: 'bakery'    },
  { id: 'milk',     name: 'Milk',        emoji: '🥛', cost: 2,  basePrice: 5,  category: 'dairy'     },
  { id: 'cheese',   name: 'Cheese',      emoji: '🧀', cost: 3,  basePrice: 7,  category: 'dairy'     },
  { id: 'chicken',  name: 'Chicken',     emoji: '🍗', cost: 5,  basePrice: 10, category: 'meat'      },
  { id: 'cola',     name: 'Cola',        emoji: '🥤', cost: 1,  basePrice: 3,  category: 'beverages' },
  { id: 'cereal',   name: 'Cereal',      emoji: '🥣', cost: 3,  basePrice: 6,  category: 'dry goods' },
  { id: 'eggs',     name: 'Eggs',        emoji: '🥚', cost: 2,  basePrice: 5,  category: 'dairy'     },
  { id: 'banana',   name: 'Bananas',     emoji: '🍌', cost: 1,  basePrice: 3,  category: 'produce'   },
  { id: 'cookie',   name: 'Cookies',     emoji: '🍪', cost: 2,  basePrice: 5,  category: 'bakery'    },
  { id: 'water',    name: 'Water',       emoji: '💧', cost: 0,  basePrice: 2,  category: 'beverages' },
  { id: 'steak',    name: 'Steak',       emoji: '🥩', cost: 8,  basePrice: 16, category: 'meat'      },
];

const CUSTOMER_NAMES = ['Alice','Bob','Carol','Dave','Eve','Frank','Grace','Hank','Iris','Jack'];
const EVENTS = [
  { type: 'rush',    label: '🏃 Rush Hour!',      desc: 'Customers arrive twice as fast for 30s',  duration: 30 },
  { type: 'sale',    label: '🏷️ Flash Sale!',     desc: 'Customers spend 50% more for 20s',        duration: 20 },
  { type: 'theft',   label: '🦝 Shoplifter!',     desc: 'Lose $10 unless you click STOP THIEF',    duration: 10 },
  { type: 'spoil',   label: '🤢 Spoilage!',       desc: 'Random product stock drops by 5',         duration: 0  },
  { type: 'inspect', label: '🕵️ Health Inspection',desc: 'Lose $20 if any stock is below 3',       duration: 0  },
];

const UPGRADES = [
  { id: 'cashier',  name: 'Extra Cashier',     emoji: '🧑‍💼', cost: 80,  desc: 'Serve customers 25% faster',   effect: 'speed',    value: 0.25 },
  { id: 'shelves',  name: 'Better Shelves',    emoji: '🗄️',  cost: 60,  desc: 'Hold 10 more of each item',    effect: 'capacity', value: 10   },
  { id: 'ads',      name: 'Advertising',       emoji: '📢',  cost: 100, desc: '30% more customers per wave',  effect: 'customers',value: 0.30 },
  { id: 'fresh',    name: 'Fresh Guarantee',   emoji: '✅',  cost: 120, desc: 'Immune to spoilage events',    effect: 'nospoil',  value: 1    },
  { id: 'security', name: 'Security Guard',    emoji: '👮',  cost: 90,  desc: 'Immune to theft events',       effect: 'nosecure', value: 1    },
  { id: 'discount', name: 'Loyalty Program',   emoji: '💳',  cost: 150, desc: 'Earn 15% bonus on every sale', effect: 'bonus',    value: 0.15 },
];

// ─── Game State ──────────────────────────────────────────────────
let gameState = null;

function createGameState() {
  const inventory = {};
  const prices = {};
  const shelves = {};
  PRODUCTS.forEach(p => {
    inventory[p.id] = 10;
    prices[p.id] = p.basePrice;
    shelves[p.id] = true;
  });

  return {
    phase: 'lobby',       // lobby | playing | gameover
    money: 200,
    day: 1,
    score: 0,
    reputation: 100,
    inventory,
    prices,
    shelves,
    customers: [],
    eventLog: [],
    activeEvent: null,
    upgrades: [],
    players: {},
    nextCustomerId: 1,
    customerInterval: null,
    eventTimeout: null,
    dayTimer: 120,        // seconds per day
    dayTimerInterval: null,
    rushActive: false,
    saleActive: false,
    theftActive: false,
    capacityBonus: 0,
  };
}

function resetGame() {
  if (gameState) {
    clearInterval(gameState.customerInterval);
    clearInterval(gameState.dayTimerInterval);
    clearTimeout(gameState.eventTimeout);
  }
  gameState = createGameState();
  // restore player connections
  io.sockets.sockets.forEach(sock => {
    if (gameState.players[sock.id] === undefined) {
      // will be re-added on reconnect, skip
    }
  });
}

// ─── Customer Logic ───────────────────────────────────────────────
function spawnCustomer() {
  if (!gameState || gameState.phase !== 'playing') return;
  const avail = PRODUCTS.filter(p => gameState.inventory[p.id] > 0 && gameState.shelves[p.id]);
  if (avail.length === 0) return;

  const name = CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)];
  const wants = [];
  const numItems = Math.floor(Math.random() * 3) + 1;
  for (let i = 0; i < numItems; i++) {
    const prod = avail[Math.floor(Math.random() * avail.length)];
    if (!wants.find(w => w.id === prod.id)) {
      wants.push({ id: prod.id, qty: Math.floor(Math.random() * 3) + 1 });
    }
  }
  const patience = 15 + Math.floor(Math.random() * 10); // seconds
  const customer = {
    id: gameState.nextCustomerId++,
    name,
    wants,
    patience,
    maxPatience: patience,
    served: false,
    emoji: ['🧑','👩','👨','🧓','👴','👵','🧒','👦','👧'][Math.floor(Math.random() * 9)],
  };
  gameState.customers.push(customer);

  // auto-serve after patience runs out
  setTimeout(() => {
    if (!gameState) return;
    const idx = gameState.customers.findIndex(c => c.id === customer.id);
    if (idx !== -1 && !gameState.customers[idx].served) {
      // customer leaves unhappy
      gameState.reputation = Math.max(0, gameState.reputation - 5);
      addLog(`😤 ${name} left without being served! Rep -5`);
      gameState.customers.splice(idx, 1);
      broadcastState();
    }
  }, patience * 1000);
}

function serveCustomer(customerId, playerId) {
  if (!gameState || gameState.phase !== 'playing') return { ok: false, msg: 'Game not active' };
  const idx = gameState.customers.findIndex(c => c.id === customerId);
  if (idx === -1) return { ok: false, msg: 'Customer already gone' };
  const customer = gameState.customers[idx];
  if (customer.served) return { ok: false, msg: 'Already served' };

  let total = 0;
  const issues = [];
  for (const want of customer.wants) {
    const available = gameState.inventory[want.id] || 0;
    const qty = Math.min(want.qty, available);
    if (qty < want.qty) issues.push(`low on ${PRODUCTS.find(p=>p.id===want.id)?.name}`);
    const price = gameState.prices[want.id] * qty;
    total += price;
    gameState.inventory[want.id] = Math.max(0, available - qty);
  }

  let multiplier = 1;
  if (gameState.saleActive) multiplier = 1.5;

  const hasBonus = gameState.upgrades.includes('discount');
  if (hasBonus) multiplier *= 1.15;

  total = Math.round(total * multiplier);
  gameState.money += total;
  gameState.score += total;

  const repChange = issues.length > 0 ? -2 : +1;
  gameState.reputation = Math.max(0, Math.min(100, gameState.reputation + repChange));

  customer.served = true;
  gameState.customers.splice(idx, 1);

  const playerName = gameState.players[playerId]?.name || 'Someone';
  const saleNote = gameState.saleActive ? ' 🏷️ +50%' : '';
  addLog(`✅ ${playerName} served ${customer.name} — $${total}${saleNote}`);

  return { ok: true, earned: total };
}

// ─── Events ───────────────────────────────────────────────────────
function triggerRandomEvent() {
  if (!gameState || gameState.phase !== 'playing') return;
  const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  gameState.activeEvent = ev;
  addLog(`⚡ EVENT: ${ev.label} — ${ev.desc}`);
  broadcastState();

  if (ev.type === 'rush') {
    gameState.rushActive = true;
    setTimeout(() => { if (gameState) { gameState.rushActive = false; gameState.activeEvent = null; broadcastState(); } }, ev.duration * 1000);
  } else if (ev.type === 'sale') {
    gameState.saleActive = true;
    setTimeout(() => { if (gameState) { gameState.saleActive = false; gameState.activeEvent = null; broadcastState(); } }, ev.duration * 1000);
  } else if (ev.type === 'theft') {
    if (gameState.upgrades.includes('security')) {
      addLog('👮 Security guard stopped the thief!');
      gameState.activeEvent = null;
    } else {
      gameState.theftActive = true;
      // players have 10s to click "Stop Thief"
      gameState.theftTimeout = setTimeout(() => {
        if (gameState && gameState.theftActive) {
          gameState.money = Math.max(0, gameState.money - 10);
          gameState.theftActive = false;
          gameState.activeEvent = null;
          addLog('🦝 Thief escaped! Lost $10');
          broadcastState();
        }
      }, ev.duration * 1000);
    }
  } else if (ev.type === 'spoil') {
    if (gameState.upgrades.includes('fresh')) {
      addLog('✅ Fresh Guarantee prevented spoilage!');
    } else {
      const prod = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
      gameState.inventory[prod.id] = Math.max(0, (gameState.inventory[prod.id] || 0) - 5);
      addLog(`🤢 ${prod.name} spoiled! -5 stock`);
    }
    gameState.activeEvent = null;
  } else if (ev.type === 'inspect') {
    const lowStock = PRODUCTS.filter(p => (gameState.inventory[p.id] || 0) < 3 && gameState.shelves[p.id]);
    if (lowStock.length > 0) {
      gameState.money = Math.max(0, gameState.money - 20);
      addLog(`🕵️ Failed inspection (${lowStock.map(p=>p.name).join(', ')} low)! Lost $20`);
    } else {
      addLog('🕵️ Passed health inspection! ✅');
    }
    gameState.activeEvent = null;
  }

  broadcastState();
}

// ─── Day Timer ────────────────────────────────────────────────────
function startDay() {
  gameState.phase = 'playing';
  gameState.dayTimer = 120;
  addLog(`📅 Day ${gameState.day} begins! Run your store for 2 minutes.`);
  broadcastState();

  // spawn customers
  const baseInterval = 4000;
  gameState.customerInterval = setInterval(() => {
    if (!gameState) return;
    const interval = gameState.rushActive ? baseInterval / 2 : baseInterval;
    const adsBonus = gameState.upgrades.includes('ads') ? 1.3 : 1;
    const roll = Math.random();
    if (roll < (0.7 * adsBonus)) spawnCustomer();
    broadcastState();
  }, 3000);

  // random events every 20-35s
  const scheduleEvent = () => {
    const delay = (20 + Math.random() * 15) * 1000;
    gameState.eventTimeout = setTimeout(() => {
      triggerRandomEvent();
      if (gameState && gameState.phase === 'playing') scheduleEvent();
    }, delay);
  };
  scheduleEvent();

  // day countdown
  gameState.dayTimerInterval = setInterval(() => {
    if (!gameState) return;
    gameState.dayTimer--;
    if (gameState.dayTimer <= 0) {
      endDay();
    } else {
      broadcastState();
    }
  }, 1000);
}

function endDay() {
  clearInterval(gameState.customerInterval);
  clearInterval(gameState.dayTimerInterval);
  clearTimeout(gameState.eventTimeout);
  gameState.phase = 'shop'; // shopping / upgrade phase

  // leftover customers leave
  gameState.customers = [];
  gameState.rushActive = false;
  gameState.saleActive = false;
  gameState.theftActive = false;
  gameState.activeEvent = null;

  addLog(`🌙 Day ${gameState.day} ended! Time to restock and upgrade.`);
  gameState.day++;
  broadcastState();
}

function addLog(msg) {
  if (!gameState) return;
  gameState.eventLog.unshift({ msg, time: Date.now() });
  if (gameState.eventLog.length > 30) gameState.eventLog.pop();
}

function broadcastState() {
  if (!gameState) return;
  const safe = {
    phase: gameState.phase,
    money: gameState.money,
    day: gameState.day,
    score: gameState.score,
    reputation: gameState.reputation,
    inventory: gameState.inventory,
    prices: gameState.prices,
    shelves: gameState.shelves,
    customers: gameState.customers,
    eventLog: gameState.eventLog.slice(0, 12),
    activeEvent: gameState.activeEvent,
    upgrades: gameState.upgrades,
    players: gameState.players,
    dayTimer: gameState.dayTimer,
    rushActive: gameState.rushActive,
    saleActive: gameState.saleActive,
    theftActive: gameState.theftActive,
    capacityBonus: gameState.capacityBonus,
    products: PRODUCTS,
    upgradeList: UPGRADES,
  };
  io.emit('state', safe);
}

// ─── Socket.io ───────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  if (!gameState) gameState = createGameState();

  const playerNum = Object.keys(gameState.players).length + 1;
  const colors = ['#f97316','#6366f1','#10b981','#ec4899','#eab308'];
  gameState.players[socket.id] = {
    id: socket.id,
    name: `Player ${playerNum}`,
    color: colors[(playerNum - 1) % colors.length],
    role: playerNum === 1 ? 'Manager' : 'Clerk',
    score: 0,
  };

  addLog(`👋 ${gameState.players[socket.id].name} joined the store!`);
  broadcastState();

  socket.on('setName', (name) => {
    if (gameState.players[socket.id]) {
      gameState.players[socket.id].name = name.slice(0, 20);
      broadcastState();
    }
  });

  socket.on('startGame', () => {
    if (gameState.phase === 'lobby' || gameState.phase === 'shop') {
      if (gameState.phase === 'lobby') {
        // fresh start
      }
      startDay();
    }
  });

  socket.on('serveCustomer', (customerId) => {
    const result = serveCustomer(customerId, socket.id);
    if (result.ok) {
      if (gameState.players[socket.id]) gameState.players[socket.id].score += result.earned;
      broadcastState();
    }
    socket.emit('serveResult', result);
  });

  socket.on('stopThief', () => {
    if (gameState && gameState.theftActive) {
      clearTimeout(gameState.theftTimeout);
      gameState.theftActive = false;
      gameState.activeEvent = null;
      const pname = gameState.players[socket.id]?.name || 'A player';
      addLog(`👮 ${pname} caught the thief! Saved $10`);
      broadcastState();
    }
  });

  socket.on('restock', ({ productId, qty }) => {
    if (!gameState || gameState.phase !== 'shop') return;
    const prod = PRODUCTS.find(p => p.id === productId);
    if (!prod) return;
    const amount = Math.min(qty, 30);
    const cost = prod.cost * amount;
    const maxCap = 30 + gameState.capacityBonus;
    const currentStock = gameState.inventory[productId] || 0;
    const canAdd = Math.min(amount, maxCap - currentStock);
    const actualCost = prod.cost * canAdd;
    if (actualCost > gameState.money) {
      socket.emit('msg', { type: 'error', text: 'Not enough money!' });
      return;
    }
    gameState.money -= actualCost;
    gameState.inventory[productId] = currentStock + canAdd;
    const pname = gameState.players[socket.id]?.name || 'Someone';
    addLog(`📦 ${pname} restocked ${prod.name} ×${canAdd} (-$${actualCost})`);
    broadcastState();
  });

  socket.on('setPrice', ({ productId, price }) => {
    if (!gameState) return;
    const p = Math.max(1, Math.min(50, Math.round(price)));
    gameState.prices[productId] = p;
    broadcastState();
  });

  socket.on('toggleShelf', ({ productId }) => {
    if (!gameState) return;
    gameState.shelves[productId] = !gameState.shelves[productId];
    broadcastState();
  });

  socket.on('buyUpgrade', (upgradeId) => {
    if (!gameState || gameState.phase !== 'shop') return;
    if (gameState.upgrades.includes(upgradeId)) {
      socket.emit('msg', { type: 'error', text: 'Already purchased!' });
      return;
    }
    const upg = UPGRADES.find(u => u.id === upgradeId);
    if (!upg) return;
    if (gameState.money < upg.cost) {
      socket.emit('msg', { type: 'error', text: 'Not enough money!' });
      return;
    }
    gameState.money -= upg.cost;
    gameState.upgrades.push(upgradeId);
    if (upg.effect === 'capacity') gameState.capacityBonus += upg.value;
    const pname = gameState.players[socket.id]?.name || 'Someone';
    addLog(`⬆️ ${pname} bought upgrade: ${upg.name}!`);
    broadcastState();
  });

  socket.on('nextDay', () => {
    if (gameState && gameState.phase === 'shop') {
      startDay();
    }
  });

  socket.on('resetGame', () => {
    resetGame();
    // re-add all connected players
    io.sockets.sockets.forEach((s, sid) => {
      const num = Object.keys(gameState.players).length + 1;
      const colors = ['#f97316','#6366f1','#10b981','#ec4899','#eab308'];
      gameState.players[sid] = {
        id: sid,
        name: `Player ${num}`,
        color: colors[(num - 1) % colors.length],
        role: num === 1 ? 'Manager' : 'Clerk',
        score: 0,
      };
    });
    addLog('🔄 Game reset!');
    broadcastState();
  });

  socket.on('disconnect', () => {
    if (gameState && gameState.players[socket.id]) {
      const name = gameState.players[socket.id].name;
      delete gameState.players[socket.id];
      addLog(`👋 ${name} left the store.`);
      broadcastState();
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🛒 Supermarket game running at http://localhost:${PORT}`);
});
