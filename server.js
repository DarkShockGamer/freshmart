const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

// ─── Constants ────────────────────────────────────────────────────
// All possible products — unlocked progressively via upgrades
const ALL_PRODUCTS = [
  // ── Grocery (always unlocked) ──
  { id: 'apple',    name: 'Apples',      emoji: '🍎', cost: 2,  basePrice: 4,  category: 'Grocery', section: 'grocery' },
  { id: 'bread',    name: 'Bread',       emoji: '🍞', cost: 1,  basePrice: 3,  category: 'Grocery', section: 'grocery' },
  { id: 'milk',     name: 'Milk',        emoji: '🥛', cost: 2,  basePrice: 5,  category: 'Grocery', section: 'grocery' },
  { id: 'banana',   name: 'Bananas',     emoji: '🍌', cost: 1,  basePrice: 3,  category: 'Grocery', section: 'grocery' },
  { id: 'water',    name: 'Water',       emoji: '💧', cost: 0,  basePrice: 2,  category: 'Grocery', section: 'grocery' },
  { id: 'cola',     name: 'Cola',        emoji: '🥤', cost: 1,  basePrice: 3,  category: 'Grocery', section: 'grocery' },
  // ── Unlocked via grocery_l2 ──
  { id: 'eggs',     name: 'Eggs',        emoji: '🥚', cost: 2,  basePrice: 5,  category: 'Grocery', section: 'grocery', requires: 'grocery_l2' },
  { id: 'cheese',   name: 'Cheese',      emoji: '🧀', cost: 3,  basePrice: 7,  category: 'Grocery', section: 'grocery', requires: 'grocery_l2' },
  { id: 'cereal',   name: 'Cereal',      emoji: '🥣', cost: 3,  basePrice: 6,  category: 'Grocery', section: 'grocery', requires: 'grocery_l2' },
  { id: 'cookie',   name: 'Cookies',     emoji: '🍪', cost: 2,  basePrice: 5,  category: 'Grocery', section: 'grocery', requires: 'grocery_l2' },
  // ── Unlocked via grocery_l3 ──
  { id: 'chicken',  name: 'Chicken',     emoji: '🍗', cost: 5,  basePrice: 10, category: 'Grocery', section: 'grocery', requires: 'grocery_l3' },
  { id: 'steak',    name: 'Steak',       emoji: '🥩', cost: 8,  basePrice: 16, category: 'Grocery', section: 'grocery', requires: 'grocery_l3' },
  { id: 'salmon',   name: 'Salmon',      emoji: '🐟', cost: 7,  basePrice: 14, category: 'Grocery', section: 'grocery', requires: 'grocery_l3' },
  { id: 'icecream', name: 'Ice Cream',   emoji: '🍦', cost: 3,  basePrice: 7,  category: 'Grocery', section: 'grocery', requires: 'grocery_l3' },
  // ── Unlocked via grocery_l4 ──
  { id: 'wine',     name: 'Wine',        emoji: '🍷', cost: 8,  basePrice: 18, category: 'Grocery', section: 'grocery', requires: 'grocery_l4' },
  { id: 'lobster',  name: 'Lobster',     emoji: '🦞', cost: 15, basePrice: 35, category: 'Grocery', section: 'grocery', requires: 'grocery_l4' },
  { id: 'truffle',  name: 'Truffles',    emoji: '🍄', cost: 20, basePrice: 50, category: 'Grocery', section: 'grocery', requires: 'grocery_l4' },

  // ── Clothing section ──
  { id: 'tshirt',   name: 'T-Shirt',     emoji: '👕', cost: 5,  basePrice: 18, category: 'Clothing', section: 'clothing', requires: 'clothing_l1' },
  { id: 'jeans',    name: 'Jeans',       emoji: '👖', cost: 10, basePrice: 30, category: 'Clothing', section: 'clothing', requires: 'clothing_l1' },
  { id: 'shoes',    name: 'Shoes',       emoji: '👟', cost: 12, basePrice: 35, category: 'Clothing', section: 'clothing', requires: 'clothing_l1' },
  { id: 'hat',      name: 'Hat',         emoji: '🧢', cost: 4,  basePrice: 15, category: 'Clothing', section: 'clothing', requires: 'clothing_l2' },
  { id: 'jacket',   name: 'Jacket',      emoji: '🧥', cost: 20, basePrice: 55, category: 'Clothing', section: 'clothing', requires: 'clothing_l2' },
  { id: 'dress',    name: 'Dress',       emoji: '👗', cost: 18, basePrice: 50, category: 'Clothing', section: 'clothing', requires: 'clothing_l2' },
  { id: 'suit',     name: 'Suit',        emoji: '🤵', cost: 40, basePrice: 110,category: 'Clothing', section: 'clothing', requires: 'clothing_l3' },
  { id: 'watch',    name: 'Watch',       emoji: '⌚', cost: 35, basePrice: 95, category: 'Clothing', section: 'clothing', requires: 'clothing_l3' },

  // ── Electronics section ──
  { id: 'phone',    name: 'Phone',       emoji: '📱', cost: 30, basePrice: 80, category: 'Electronics', section: 'electronics', requires: 'electronics_l1' },
  { id: 'headphones',name:'Headphones',  emoji: '🎧', cost: 20, basePrice: 55, category: 'Electronics', section: 'electronics', requires: 'electronics_l1' },
  { id: 'laptop',   name: 'Laptop',      emoji: '💻', cost: 60, basePrice: 160,category: 'Electronics', section: 'electronics', requires: 'electronics_l2' },
  { id: 'tablet',   name: 'Tablet',      emoji: '📲', cost: 40, basePrice: 110,category: 'Electronics', section: 'electronics', requires: 'electronics_l2' },
  { id: 'tv',       name: 'TV',          emoji: '📺', cost: 80, basePrice: 220,category: 'Electronics', section: 'electronics', requires: 'electronics_l3' },
  { id: 'camera',   name: 'Camera',      emoji: '📷', cost: 50, basePrice: 130,category: 'Electronics', section: 'electronics', requires: 'electronics_l3' },

  // ── Automotive section ──
  { id: 'wipers',   name: 'Wipers',      emoji: '🚗', cost: 5,  basePrice: 18, category: 'Auto', section: 'auto', requires: 'auto_l1' },
  { id: 'oilcan',   name: 'Motor Oil',   emoji: '🛢️', cost: 8,  basePrice: 22, category: 'Auto', section: 'auto', requires: 'auto_l1' },
  { id: 'battery',  name: 'Car Battery', emoji: '🔋', cost: 20, basePrice: 55, category: 'Auto', section: 'auto', requires: 'auto_l2' },
  { id: 'tires',    name: 'Tires',       emoji: '🔧', cost: 35, basePrice: 90, category: 'Auto', section: 'auto', requires: 'auto_l2' },
  { id: 'gps',      name: 'GPS Unit',    emoji: '🗺️', cost: 25, basePrice: 65, category: 'Auto', section: 'auto', requires: 'auto_l3' },
  { id: 'dashcam',  name: 'Dash Cam',    emoji: '📹', cost: 22, basePrice: 60, category: 'Auto', section: 'auto', requires: 'auto_l3' },

  // ── Sporting Goods / Outdoors section ──
  { id: 'arrow',    name: 'Bow & Arrow', emoji: '🏹', cost: 25, basePrice: 70, category: 'Outdoors', section: 'outdoors', requires: 'outdoors_l1' },
  { id: 'fishrod',  name: 'Fishing Rod', emoji: '🎣', cost: 15, basePrice: 40, category: 'Outdoors', section: 'outdoors', requires: 'outdoors_l1' },
  { id: 'tent',     name: 'Tent',        emoji: '⛺', cost: 30, basePrice: 80, category: 'Outdoors', section: 'outdoors', requires: 'outdoors_l2' },
  { id: 'rifle',    name: 'Hunting Rifle',emoji:'🔫', cost: 60, basePrice: 160,category: 'Outdoors', section: 'outdoors', requires: 'outdoors_l2' },
  { id: 'kayak',    name: 'Kayak',       emoji: '🛶', cost: 80, basePrice: 200,category: 'Outdoors', section: 'outdoors', requires: 'outdoors_l3' },
  { id: 'atv',      name: 'ATV',         emoji: '🏍️', cost: 150,basePrice: 400,category: 'Outdoors', section: 'outdoors', requires: 'outdoors_l3' },

  // ── Furniture section ──
  { id: 'chair',    name: 'Chair',       emoji: '🪑', cost: 15, basePrice: 45, category: 'Furniture', section: 'furniture', requires: 'furniture_l1' },
  { id: 'lamp',     name: 'Lamp',        emoji: '🪔', cost: 10, basePrice: 30, category: 'Furniture', section: 'furniture', requires: 'furniture_l1' },
  { id: 'sofa',     name: 'Sofa',        emoji: '🛋️', cost: 60, basePrice: 160,category: 'Furniture', section: 'furniture', requires: 'furniture_l2' },
  { id: 'bed',      name: 'Bed',         emoji: '🛏️', cost: 70, basePrice: 185,category: 'Furniture', section: 'furniture', requires: 'furniture_l2' },
  { id: 'desk',     name: 'Desk',        emoji: '🖥️', cost: 45, basePrice: 115,category: 'Furniture', section: 'furniture', requires: 'furniture_l3' },
  { id: 'bathtub',  name: 'Bathtub',     emoji: '🛁', cost: 90, basePrice: 240,category: 'Furniture', section: 'furniture', requires: 'furniture_l3' },
];

// Products available at game start (no requires)
const PRODUCTS = ALL_PRODUCTS.filter(p => !p.requires);

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

// ── Upgrade Tree ──────────────────────────────────────────────────
// Each node: { id, name, emoji, cost, desc, requires[], unlocks, section, tier }
const UPGRADES = [
  // ══════════════ GROCERY BRANCH ══════════════
  {
    id: 'grocery_l2', name: 'Expanded Grocery', emoji: '🥗', cost: 400, tier: 1, section: 'grocery',
    desc: 'Unlock dairy, eggs, cereal & cookies. Adds 4 new food products.',
    requires: [], unlocks: ['grocery_l3'],
  },
  {
    id: 'grocery_l3', name: 'Deli & Meat Counter', emoji: '🥩', cost: 900, tier: 2, section: 'grocery',
    desc: 'Unlock chicken, steak, salmon & ice cream. Premium food items.',
    requires: ['grocery_l2'], unlocks: ['grocery_l4'],
  },
  {
    id: 'grocery_l4', name: 'Gourmet Market', emoji: '🦞', cost: 2000, tier: 3, section: 'grocery',
    desc: 'Unlock wine, lobster & truffles. Highest-margin food items in the game.',
    requires: ['grocery_l3'], unlocks: [],
  },

  // ══════════════ STORE UPGRADES BRANCH ══════════════
  {
    id: 'shelves', name: 'Better Shelves', emoji: '🗄️', cost: 350, tier: 1, section: 'store',
    desc: 'Hold 15 more units of every product.',
    requires: [], unlocks: ['ads', 'fresh', 'smart_restock'],
  },
  {
    id: 'smart_restock', name: 'Smart Restocking', emoji: '📦', cost: 500, tier: 2, section: 'store',
    desc: 'Unlocks the Fill button — instantly restock any product to full capacity in one click.',
    requires: ['shelves'], unlocks: [],
  },
  {
    id: 'ads', name: 'Advertising', emoji: '📢', cost: 700, tier: 2, section: 'store',
    desc: '40% more customers arrive each wave.',
    requires: ['shelves'], unlocks: ['loyalty'],
  },
  {
    id: 'fresh', name: 'Fresh Guarantee', emoji: '✅', cost: 600, tier: 2, section: 'store',
    desc: 'Immune to spoilage events.',
    requires: ['shelves'], unlocks: ['security'],
  },
  {
    id: 'loyalty', name: 'Loyalty Program', emoji: '💳', cost: 1200, tier: 3, section: 'store',
    desc: 'Earn +15% on every sale.',
    requires: ['ads'], unlocks: [],
  },
  {
    id: 'security', name: 'Security Guard', emoji: '👮', cost: 800, tier: 3, section: 'store',
    desc: 'Auto-catches all shoplifters instantly.',
    requires: ['fresh'], unlocks: [],
  },

  // ══════════════ CLOTHING BRANCH ══════════════
  {
    id: 'clothing_l1', name: 'Clothing Section', emoji: '👕', cost: 800, tier: 1, section: 'clothing',
    desc: 'Open a clothing department. Unlock T-shirts, jeans & shoes.',
    requires: [], unlocks: ['clothing_l2'],
  },
  {
    id: 'clothing_l2', name: 'Fashion Floor', emoji: '👗', cost: 1500, tier: 2, section: 'clothing',
    desc: 'Expand with hats, jackets & dresses. Higher margins.',
    requires: ['clothing_l1'], unlocks: ['clothing_l3'],
  },
  {
    id: 'clothing_l3', name: 'Luxury Boutique', emoji: '🤵', cost: 3000, tier: 3, section: 'clothing',
    desc: 'Unlock suits & watches — the highest-margin clothing items.',
    requires: ['clothing_l2'], unlocks: [],
  },

  // ══════════════ ELECTRONICS BRANCH ══════════════
  {
    id: 'electronics_l1', name: 'Electronics Corner', emoji: '📱', cost: 1200, tier: 1, section: 'electronics',
    desc: 'Open electronics. Unlock phones & headphones.',
    requires: [], unlocks: ['electronics_l2'],
  },
  {
    id: 'electronics_l2', name: 'Tech Department', emoji: '💻', cost: 2500, tier: 2, section: 'electronics',
    desc: 'Unlock laptops & tablets. Big-ticket items, big profits.',
    requires: ['electronics_l1'], unlocks: ['electronics_l3'],
  },
  {
    id: 'electronics_l3', name: 'AV Showroom', emoji: '📺', cost: 5000, tier: 3, section: 'electronics',
    desc: 'Unlock TVs & cameras — the highest-value electronics.',
    requires: ['electronics_l2'], unlocks: [],
  },

  // ══════════════ AUTO BRANCH ══════════════
  {
    id: 'auto_l1', name: 'Auto Corner', emoji: '🚗', cost: 700, tier: 1, section: 'auto',
    desc: 'Open an auto section. Unlock wipers & motor oil.',
    requires: [], unlocks: ['auto_l2'],
  },
  {
    id: 'auto_l2', name: 'Auto Parts Aisle', emoji: '🔋', cost: 1600, tier: 2, section: 'auto',
    desc: 'Unlock car batteries & tires. Serious profit items.',
    requires: ['auto_l1'], unlocks: ['auto_l3'],
  },
  {
    id: 'auto_l3', name: 'Performance Shop', emoji: '🗺️', cost: 3200, tier: 3, section: 'auto',
    desc: 'Unlock GPS units & dash cams. Premium auto accessories.',
    requires: ['auto_l2'], unlocks: [],
  },

  // ══════════════ OUTDOORS BRANCH ══════════════
  {
    id: 'outdoors_l1', name: 'Outdoors & Sporting', emoji: '🏹', cost: 900, tier: 1, section: 'outdoors',
    desc: 'Open outdoors section. Unlock bow & arrow and fishing rods.',
    requires: [], unlocks: ['outdoors_l2'],
  },
  {
    id: 'outdoors_l2', name: 'Hunting & Camping', emoji: '⛺', cost: 2000, tier: 2, section: 'outdoors',
    desc: 'Unlock tents & hunting rifles. High-demand items.',
    requires: ['outdoors_l1'], unlocks: ['outdoors_l3'],
  },
  {
    id: 'outdoors_l3', name: 'Adventure Gear', emoji: '🛶', cost: 4500, tier: 3, section: 'outdoors',
    desc: 'Unlock kayaks & ATVs — the biggest-ticket items in the store.',
    requires: ['outdoors_l2'], unlocks: [],
  },

  // ══════════════ CHECKOUT BRANCH ══════════════
  {
    id: 'checkout_l2', name: 'Second Checkout Lane', emoji: '🏪', cost: 800, tier: 1, section: 'checkout',
    desc: 'Open a 2nd checkout lane. Assign a player or AI worker to it.',
    requires: [], unlocks: ['checkout_l3'],
  },
  {
    id: 'checkout_l3', name: 'Third Checkout Lane', emoji: '🏬', cost: 2000, tier: 2, section: 'checkout',
    desc: 'Open a 3rd checkout lane. Handle serious rush-hour volume.',
    requires: ['checkout_l2'], unlocks: ['checkout_l4'],
  },
  {
    id: 'checkout_l4', name: 'Fourth Checkout Lane', emoji: '🏢', cost: 4500, tier: 3, section: 'checkout',
    desc: 'Open a 4th lane. Maximum throughput for a booming store.',
    requires: ['checkout_l3'], unlocks: [],
  },

  // ══════════════ SELF-CHECKOUT BRANCH ══════════════
  {
    id: 'sco_unlock', name: 'Self-Checkout Area', emoji: '🤖', cost: 2500, tier: 1, section: 'selfcheckout',
    desc: 'Install a self-checkout zone. Buy Basic Kiosk machines in the Workers tab. Customers serve themselves — no wages!',
    requires: [], unlocks: ['sco_express_unlock'],
  },
  {
    id: 'sco_express_unlock', name: 'Express SCO Upgrade', emoji: '⚡', cost: 5000, tier: 2, section: 'selfcheckout',
    desc: 'Unlock faster Express SCO machines. Handles rush hour customers with bigger baskets.',
    requires: ['sco_unlock'], unlocks: ['sco_premium_unlock'],
  },
  {
    id: 'sco_premium_unlock', name: 'Premium SCO Station', emoji: '💎', cost: 10000, tier: 3, section: 'selfcheckout',
    desc: 'Unlock top-tier Premium self-checkout stations. Near-cashier speed with zero ongoing wages.',
    requires: ['sco_express_unlock'], unlocks: [],
  },

  // ══════════════ FURNITURE BRANCH ══════════════
  {
    id: 'furniture_l1', name: 'Home Goods', emoji: '🪑', cost: 700, tier: 1, section: 'furniture',
    desc: 'Open home goods. Unlock chairs & lamps.',
    requires: [], unlocks: ['furniture_l2'],
  },
  {
    id: 'furniture_l2', name: 'Furniture Floor', emoji: '🛋️', cost: 1800, tier: 2, section: 'furniture',
    desc: 'Unlock sofas & beds. Large-margin home items.',
    requires: ['furniture_l1'], unlocks: ['furniture_l3'],
  },
  {
    id: 'furniture_l3', name: 'Premium Living', emoji: '🛁', cost: 4000, tier: 3, section: 'furniture',
    desc: 'Unlock desks & bathtubs — top-tier home products.',
    requires: ['furniture_l2'], unlocks: [],
  },
];

const PLAYER_COLORS = ['#f97316','#6366f1','#10b981','#ec4899','#eab308','#06b6d4'];
const PLAYER_ROLES  = ['Store Manager','Head Cashier','Stock Clerk','Sales Associate','Floor Manager','Greeter'];

// ─── AI Worker Types ──────────────────────────────────────────────
const AI_WORKER_TYPES = [
  { id: 'rookie',      name: 'Rookie Cashier',    emoji: '🧑‍💼', speed: 1.0, cost: 400,  wage: 50,  desc: 'A new hire. Gets the job done, slowly.' },
  { id: 'experienced', name: 'Experienced Clerk',  emoji: '👩‍💼', speed: 1.5, cost: 900,  wage: 100, desc: 'Faster checkout, fewer mistakes.' },
  { id: 'veteran',     name: 'Veteran Cashier',    emoji: '🧓‍💼', speed: 2.0, cost: 2000, wage: 200, desc: 'Blazing fast. Handles rush hour like a pro.' },
  { id: 'manager',     name: 'Shift Manager',      emoji: '👔',   speed: 3.0, cost: 6000, wage: 400, desc: 'Serves VIPs for double the speed bonus.' },
];

// ─── Self-Checkout Machine Types ───────────────────────────────────
const SELF_CHECKOUT_TYPES = [
  { id: 'sco_basic',   name: 'Basic Kiosk',       emoji: '🖥️',  speed: 0.8, cost: 3000,  maintenance: 20,  desc: 'Slow but no wages. Serves 1 customer at a time.' },
  { id: 'sco_express', name: 'Express SCO',        emoji: '⚡',  speed: 1.5, cost: 7000,  maintenance: 40,  desc: 'Faster scanning. Great for small basket customers.' },
  { id: 'sco_premium', name: 'Premium Station',    emoji: '💎',  speed: 2.5, cost: 15000, maintenance: 80,  desc: 'Top-tier kiosk. Near-cashier speed, zero wages ever.' },
];

// ─── Difficulty Configs ───────────────────────────────────────────
const DIFFICULTY_CONFIGS = {
  easy: {
    label: 'Easy',
    emoji: '🌱',
    desc: 'Relaxed store sim — generous starting cash, cheap upgrades, patient customers.',
    startMoney: 400,
    upgradeCostMult: 0.5,       // easier to afford at new base prices
    spawnChance: 0.55,
    spawnInterval: 3500,
    customerPatience: 1.6,
    theftLoss: 5,
    inspectPenalty: 10,
    spoilageLoss: 3,
    repLossUnserved: 3,
    rushSpawnMult: 1.5,
  },
  normal: {
    label: 'Normal',
    emoji: '🏪',
    desc: 'Balanced challenge — manage your budget carefully and react to events.',
    startMoney: 200,
    upgradeCostMult: 1.0,       // base costs are already steep — no extra multiplier
    spawnChance: 0.72,
    spawnInterval: 3500,
    customerPatience: 1.0,
    theftLoss: 25,
    inspectPenalty: 40,
    spoilageLoss: 8,
    repLossUnserved: 5,
    rushSpawnMult: 2,
  },
  hard: {
    label: 'Hard',
    emoji: '🔥',
    desc: 'Brutal economy — tight cash, impatient customers, punishing events.',
    startMoney: 100,
    upgradeCostMult: 1.6,       // noticeable but not absurd on top of new base prices
    spawnChance: 0.88,
    spawnInterval: 2500,
    customerPatience: 0.6,
    theftLoss: 50,
    inspectPenalty: 80,
    spoilageLoss: 15,
    repLossUnserved: 8,
    rushSpawnMult: 2,
  },
};

// ─── Room Storage ─────────────────────────────────────────────────
const rooms = new Map();
const socketRoom = new Map(); // socketId → roomCode
const hostSaves  = new Map(); // socketId → [save0, save1, save2]

function getOrInitSaves(hostId) {
  if (!hostSaves.has(hostId)) hostSaves.set(hostId, [null, null, null]);
  return hostSaves.get(hostId);
}

function snapshotRoom(room) {
  return {
    money: room.money, day: room.day, totalScore: room.totalScore,
    reputation: room.reputation, upgrades: [...room.upgrades],
    capacityBonus: room.capacityBonus,
    inventory: { ...room.inventory },
    prices:    { ...room.prices    },
    shelves:   { ...room.shelves   },
    difficulty: room.difficulty || 'normal',
    aiWorkers: room.aiWorkers ? room.aiWorkers.map(w => ({...w})) : [],
    scoMachines: room.scoMachines ? room.scoMachines.map(m => ({...m})) : [],
    stats: room.stats ? {...room.stats} : null,
    savedAt: Date.now(),
  };
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(c) ? generateCode() : c;
}

function getUnlockedProducts(upgrades = []) {
  return ALL_PRODUCTS.filter(p => !p.requires || upgrades.includes(p.requires));
}

function freshStore(upgrades = []) {
  const inv = {}, prices = {}, shelves = {};
  getUnlockedProducts(upgrades).forEach(p => {
    if (!(p.id in inv)) { inv[p.id] = 10; prices[p.id] = p.basePrice; shelves[p.id] = true; }
  });
  return { inv, prices, shelves };
}

function createRoom(hostId, hostName, save = null, difficulty = 'normal') {
  const code = generateCode();
  // If loading from save, use the saved difficulty
  const effectiveDiff = (save && save.difficulty) ? save.difficulty : difficulty;
  const diff = DIFFICULTY_CONFIGS[effectiveDiff] || DIFFICULTY_CONFIGS.normal;
  let inv, prices, shelves, upgrades, money, day, totalScore, reputation, capacityBonus;

  if (save) {
    // Restore from save — ensure all products for unlocked upgrades exist
    upgrades = save.upgrades || [];
    const baseProd = freshStore(upgrades);
    inv          = { ...baseProd.inv,    ...save.inventory };
    prices       = { ...baseProd.prices, ...save.prices    };
    shelves      = { ...baseProd.shelves,...save.shelves   };
    money        = save.money;
    day          = save.day;
    totalScore   = save.totalScore;
    reputation   = save.reputation;
    capacityBonus= save.capacityBonus || 0;
  } else {
    ({ inv, prices, shelves } = freshStore());
    upgrades = []; money = diff.startMoney; day = 1; totalScore = 0; reputation = 100; capacityBonus = 0;
  }

  // Calculate how many checkout lanes are unlocked
  function getCheckoutLanes(upgs) {
    let lanes = 1;
    if (upgs.includes('checkout_l2')) lanes = 2;
    if (upgs.includes('checkout_l3')) lanes = 3;
    if (upgs.includes('checkout_l4')) lanes = 4;
    return lanes;
  }

  const savedWorkers = save?.aiWorkers || [];
  const savedScoMachines = save?.scoMachines || [];

  const room = {
    code, hostId,
    phase: 'lobby',
    players: {},
    money, day, totalScore, reputation,
    inventory: inv, prices, shelves,
    customers: [], eventLog: [],
    activeEvent: null, upgrades,
    nextCustomerId: 1, dayTimer: 120,
    rushActive: false, saleActive: false, theftActive: false,
    theftTimeout: null, capacityBonus,
    _cInt: null, _dInt: null, _eTimeout: null,
    isMorning: true, // always start in morning prep before first day
    difficulty: effectiveDiff, diff,
    // Checkout system
    checkoutLocked: null,  // socketId currently in checkout (null = free)
    // AI Workers: array of { uid, type, name, emoji, speed, assignedLane (null = unassigned), hired: true }
    aiWorkers: savedWorkers,
    nextWorkerId: savedWorkers.length > 0 ? Math.max(...savedWorkers.map(w => w.uid)) + 1 : 1,
    // Self-checkout machines: array of { uid, typeId, name, emoji, speed, maintenance, active, lastServeAt, currentActivity }
    scoMachines: savedScoMachines,
    nextScoId: savedScoMachines.length > 0 ? Math.max(...savedScoMachines.map(m => m.uid)) + 1 : 1,
    // AI worker checkout timers: { laneIdx: timeoutId }
    _aiCheckoutTimers: {},
    // Stats
    stats: save?.stats || {
      customersServed: 0,
      customersLost: 0,
      totalRevenue: 0,
      aiRevenue: 0,
      playerRevenue: 0,
      rushHoursTriggered: 0,
      theftsBlocked: 0,
      theftsLost: 0,
      vipServed: 0,
      daysCompleted: 0,
      byPlayer: {}, // playerId -> { served, revenue }
    },
  };
  room.players[hostId] = {
    id: hostId, name: hostName || 'Player 1',
    color: PLAYER_COLORS[0], role: PLAYER_ROLES[0],
    personalScore: 0,
  };
  rooms.set(code, room);
  if (save) {
    roomLog(room, `💾 Loaded save — Day ${day}, $${money} cash`);
  } else {
    roomLog(room, `🌅 Welcome to FreshMart! Prep your store, then start the day.`);
  }
  return room;
}

function roomLog(room, msg) {
  room.eventLog.unshift({ msg, t: Date.now() });
  if (room.eventLog.length > 40) room.eventLog.pop();
}

function getCheckoutLanes(upgs) {
  let lanes = 1;
  if (upgs.includes('checkout_l2')) lanes = 2;
  if (upgs.includes('checkout_l3')) lanes = 3;
  if (upgs.includes('checkout_l4')) lanes = 4;
  return lanes;
}

function emit(room) {
  const products = getUnlockedProducts(room.upgrades);
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
    isMorning: !!room.isMorning,
    products, upgradeList: UPGRADES,
    difficulty: room.difficulty,
    diffConfig: room.diff,
    checkoutLocked: room.checkoutLocked,
    checkoutLocks: room.checkoutLocks || {},
    checkoutLanes: getCheckoutLanes(room.upgrades),
    aiWorkers: room.aiWorkers || [],
    aiWorkerTypes: AI_WORKER_TYPES,
    scoMachines: room.scoMachines || [],
    scoTypes: SELF_CHECKOUT_TYPES,
    stats: room.stats || {},
  });
}

// ─── Customer Logic ───────────────────────────────────────────────
// Returns a 0-1 demand weight for a product based on price vs basePrice.
// At base price: weight = 1.0. Each 10% over base cuts demand by ~25%.
// At 3x base price: weight ~0.05 (almost nobody buys it).
function demandWeight(room, prod) {
  const price = room.prices[prod.id] || prod.basePrice;
  const ratio = price / prod.basePrice; // 1.0 = fair, >1 = overpriced
  if (ratio <= 1) return 1;            // at or below base: full demand
  // Exponential decay: demand = 1 / ratio^2
  return Math.max(0.02, 1 / (ratio * ratio));
}

// Weighted random pick from array using weight function
function weightedPick(arr, weightFn) {
  const weights = arr.map(weightFn);
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return arr[Math.floor(Math.random() * arr.length)];
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

function spawnCustomer(room) {
  if (room.phase !== 'playing') return;
  const unlocked = getUnlockedProducts(room.upgrades);
  // Filter to in-stock, on-shelf items that have any demand at all
  const avail = unlocked.filter(p =>
    (room.inventory[p.id] || 0) > 0 &&
    room.shelves[p.id] &&
    demandWeight(room, p) > 0.01
  );
  if (avail.length === 0) return;

  const isVip = room.activeEvent?.type === 'vip';
  const numItems = isVip ? Math.floor(Math.random()*4)+3 : Math.floor(Math.random()*3)+1;
  const wants = [];
  for (let i = 0; i < numItems; i++) {
    // Pick product weighted by demand — overpriced items are rarely chosen
    const prod = weightedPick(avail, p => demandWeight(room, p));
    if (!wants.find(w => w.id === prod.id))
      wants.push({ id: prod.id, qty: isVip ? Math.floor(Math.random()*4)+2 : Math.floor(Math.random()*3)+1 });
  }
  if (wants.length === 0) return;
  const diff = room.diff || DIFFICULTY_CONFIGS.normal;
  const basePatience = 15 + Math.floor(Math.random() * 12);
  const patience = Math.max(6, Math.round(basePatience * diff.customerPatience));
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
      const repLoss = (room.diff || DIFFICULTY_CONFIGS.normal).repLossUnserved;
      room.reputation = Math.max(0, room.reputation - repLoss);
      roomLog(room, `😤 ${c.name} left unserved! Rep -${repLoss}`);
      room.customers.splice(idx, 1);
      if (room.stats) room.stats.customersLost = (room.stats.customersLost||0) + 1;
      emit(room);
    }
  }, patience * 1000);
}

function serveCustomer(room, cid, sid, isAi = false, aiWorker = null) {
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

  // Stats tracking
  if (room.stats) {
    room.stats.customersServed = (room.stats.customersServed||0) + 1;
    room.stats.totalRevenue = (room.stats.totalRevenue||0) + total;
    if (c.isVip) room.stats.vipServed = (room.stats.vipServed||0) + 1;
  }

  if (isAi && aiWorker) {
    if (room.stats) room.stats.aiRevenue = (room.stats.aiRevenue||0) + total;
    room.customers.splice(idx, 1);
    const tag = c.isVip ? ' ⭐VIP×2' : '';
    const sTag = room.saleActive ? ' 🏷️+50%' : '';
    roomLog(room, `🤖 ${aiWorker.name} served ${c.name}${tag} — $${total}${sTag}`);
    return { ok: true, earned: total, isVip: c.isVip };
  }

  const p = room.players[sid];
  if (p) {
    p.personalScore += total;
    if (room.stats) {
      if (!room.stats.byPlayer) room.stats.byPlayer = {};
      if (!room.stats.byPlayer[sid]) room.stats.byPlayer[sid] = { served: 0, revenue: 0, name: p.name };
      room.stats.byPlayer[sid].served++;
      room.stats.byPlayer[sid].revenue += total;
      room.stats.byPlayer[sid].name = p.name;
      room.stats.playerRevenue = (room.stats.playerRevenue||0) + total;
    }
  }

  // Release checkout lock for this player
  if (room.checkoutLocked === sid) room.checkoutLocked = null;

  room.customers.splice(idx, 1);
  const tag = c.isVip ? ' ⭐VIP×2' : '';
  const sTag = room.saleActive ? ' 🏷️+50%' : '';
  roomLog(room, `✅ ${p?.name||'?'} served ${c.name}${tag} — $${total}${sTag}`);
  return { ok: true, earned: total, isVip: c.isVip };
}

// ─── Events ───────────────────────────────────────────────────────
function triggerEvent(room) {
  if (room.phase !== 'playing') return;
  const diff = room.diff || DIFFICULTY_CONFIGS.normal;
  const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  room.activeEvent = ev;
  roomLog(room, `⚡ ${ev.label} — ${ev.desc}`);
  emit(room);

  if (ev.type === 'rush') {
    room.rushActive = true;
    if (room.stats) room.stats.rushHoursTriggered = (room.stats.rushHoursTriggered||0) + 1;
    setTimeout(() => { room.rushActive = false; room.activeEvent = null; emit(room); }, ev.duration*1000);
  } else if (ev.type === 'sale') {
    room.saleActive = true;
    setTimeout(() => { room.saleActive = false; room.activeEvent = null; emit(room); }, ev.duration*1000);
  } else if (ev.type === 'theft') {
    if (room.upgrades.includes('security')) {
      roomLog(room, '👮 Security guard caught the thief instantly!');
      if (room.stats) room.stats.theftsBlocked = (room.stats.theftsBlocked||0) + 1;
      room.activeEvent = null; emit(room);
    } else {
      room.theftActive = true;
      room.theftTimeout = setTimeout(() => {
        if (room.theftActive) {
          room.money = Math.max(0, room.money - diff.theftLoss);
          room.theftActive = false; room.activeEvent = null;
          if (room.stats) room.stats.theftsLost = (room.stats.theftsLost||0) + 1;
          roomLog(room, `🦝 Thief escaped! Lost $${diff.theftLoss}`); emit(room);
        }
      }, ev.duration*1000);
    }
  } else if (ev.type === 'spoil') {
    if (room.upgrades.includes('fresh')) {
      roomLog(room, '✅ Fresh Guarantee blocked spoilage!');
    } else {
      const unlocked = getUnlockedProducts(room.upgrades);
      const t = unlocked.slice().sort(()=>Math.random()-0.5).find(p => room.inventory[p.id] > 0);
      if (t) { room.inventory[t.id] = Math.max(0, room.inventory[t.id]-diff.spoilageLoss); roomLog(room, `🤢 ${t.name} spoiled! -${diff.spoilageLoss} stock`); }
    }
    room.activeEvent = null; emit(room);
  } else if (ev.type === 'inspect') {
    const unlocked = getUnlockedProducts(room.upgrades);
    const low = unlocked.filter(p => room.shelves[p.id] && (room.inventory[p.id]||0) < 3);
    if (low.length > 0) {
      room.money = Math.max(0, room.money - diff.inspectPenalty);
      roomLog(room, `🕵️ Failed inspection! (${low.map(p=>p.name).join(', ')}) -$${diff.inspectPenalty}`);
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
  room.checkoutLocked = null;
  const diff = room.diff || DIFFICULTY_CONFIGS.normal;
  roomLog(room, `📅 Day ${room.day} open! You have 2 minutes.`);
  emit(room);

  room._cInt = setInterval(() => {
    if (room.phase !== 'playing') return;
    const boost = room.upgrades.includes('ads') ? 1.4 : 1;
    const times = room.rushActive ? diff.rushSpawnMult : 1;
    for (let i = 0; i < times; i++) if (Math.random() < diff.spawnChance * boost) spawnCustomer(room);

    // AI workers auto-serve customers assigned to their lane
    tickAiWorkers(room);
    // Self-checkout machines auto-serve customers
    tickScoMachines(room);

    emit(room);
  }, diff.spawnInterval);

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

// AI worker logic: each assigned AI worker periodically serves a customer.
// Two-phase: first tick CLAIMS the customer (sets attendedBy so clients see overlay),
// then after AI_CLAIM_DISPLAY_MS actually SERVES them (removes customer, logs revenue).
const AI_SERVE_BASE_MS = 8000; // base time between AI serves (at speed 1.0)
const AI_CLAIM_DISPLAY_MS = 2000; // ms to show "attending" overlay before serving

function tickAiWorkers(room) {
  if (!room.aiWorkers || room.phase !== 'playing') return;
  if (!room._aiWorkerCooldowns) room._aiWorkerCooldowns = {};
  if (!room._aiWorkerClaims) room._aiWorkerClaims = {};

  const now = Date.now();
  const lanes = getCheckoutLanes(room.upgrades);

  room.aiWorkers.forEach(w => {
    if (!w.assignedLane || w.assignedLane > lanes) return;
    if (!room.customers.length) return;

    // Phase 2: worker already claimed a customer — serve them after display delay
    const claim = room._aiWorkerClaims[w.uid];
    if (claim) {
      if (now - claim.claimedAt >= AI_CLAIM_DISPLAY_MS) {
        delete room._aiWorkerClaims[w.uid];
        room._aiWorkerCooldowns[w.uid] = now;
        const customer = room.customers.find(c => c.id === claim.customerId);
        if (customer) serveCustomer(room, customer.id, null, true, w);
      }
      return; // still in display window
    }

    // Phase 1: cooldown check, then claim an unattended customer
    const cooldown = AI_SERVE_BASE_MS / (w.speed || 1.0);
    if (now - (room._aiWorkerCooldowns[w.uid] || 0) < cooldown) return;

    const customer = room.customers.find(c => !c.attendedBy);
    if (!customer) return;

    // Claim: mark attendedBy so clients see the overlay immediately
    customer.attendedBy = { type: 'worker', name: w.name, emoji: w.emoji };
    room._aiWorkerClaims[w.uid] = { customerId: customer.id, claimedAt: now };
  });
}

// Self-checkout machine serve tick
const SCO_SERVE_BASE_MS = 10000; // base time between SCO serves at speed 1.0

function tickScoMachines(room) {
  if (!room.scoMachines || room.phase !== 'playing') return;
  const now = Date.now();

  room.scoMachines.forEach(m => {
    if (!room.customers.length) {
      m.currentActivity = null;
      return;
    }
    const cooldown = SCO_SERVE_BASE_MS / (m.speed || 1.0);
    const lastServe = m.lastServeAt || 0;
    if (now - lastServe < cooldown) return;

    const customer = room.customers.find(c => !c.attendedBy);
    if (!customer) return;

    m.lastServeAt = now;
    customer.attendedBy = { type: 'sco', name: m.name, emoji: m.emoji };
    // Build activity snapshot for client animation
    const items = customer.wants.map(w => {
      const prod = ALL_PRODUCTS.find(p => p.id === w.id);
      return { emoji: prod?.emoji || '📦', name: prod?.name || w.id, qty: w.qty };
    });
    m.currentActivity = {
      customerEmoji: customer.emoji,
      customerName: customer.name,
      items,
      total: customer.wants.reduce((sum, w) => sum + (room.prices[w.id] || 0) * w.qty, 0),
      startedAt: now,
    };

    const result = serveCustomer(room, customer.id, null, true, { name: m.name, uid: m.uid });
    if (!result.ok) { m.currentActivity = null; return; }

    const tag = customer.isVip ? ' ⭐VIP×2' : '';
    roomLog(room, `${m.emoji} ${m.name} processed ${customer.name}${tag} — $${result.earned}`);
  });
}

function endDay(room) {
  clearInterval(room._cInt); clearInterval(room._dInt); clearTimeout(room._eTimeout); clearTimeout(room.theftTimeout);
  room.phase = 'shop';
  room.customers = []; room.rushActive = false; room.saleActive = false; room.theftActive = false; room.activeEvent = null;
  room.checkoutLocked = null; room.checkoutLocks = {};
  room._aiWorkerCooldowns = {};
  if (room.stats) room.stats.daysCompleted = (room.stats.daysCompleted||0) + 1;

  // Pay AI worker wages
  if (room.aiWorkers && room.aiWorkers.length > 0) {
    let totalWages = 0;
    room.aiWorkers.forEach(w => { totalWages += (w.wage || 0); });
    if (totalWages > 0) {
      room.money = Math.max(0, room.money - totalWages);
      roomLog(room, `💸 Paid $${totalWages} in worker wages.`);
    }
  }
  // Pay SCO maintenance
  if (room.scoMachines && room.scoMachines.length > 0) {
    let totalMaint = 0;
    room.scoMachines.forEach(m => { totalMaint += (m.maintenance || 0); });
    if (totalMaint > 0) {
      room.money = Math.max(0, room.money - totalMaint);
      roomLog(room, `🔧 Paid $${totalMaint} in SCO maintenance.`);
    }
    // Clear activity animations
    room.scoMachines.forEach(m => { m.currentActivity = null; });
  }
  roomLog(room, `🌙 Day ${room.day} ended! Restock & upgrade before next day.`);
  room.day++;
  // Start periodic auto-save for the shop phase (saves immediately + every 30s)
  startShopAutosave(room);
  emit(room);
}

function stopRoom(room) {
  clearInterval(room._cInt); clearInterval(room._dInt); clearTimeout(room._eTimeout); clearTimeout(room.theftTimeout);
  stopShopAutosave(room);
}

function doShopSave(room) {
  if (room.saveSlot == null || room.phase !== 'shop') return;
  const snapshot = snapshotRoom(room);
  const saves = getOrInitSaves(room.hostId);
  saves[room.saveSlot] = snapshot;
  io.to(room.code).emit('autoSave', { slotIdx: room.saveSlot, save: snapshot });
}

function startShopAutosave(room) {
  stopShopAutosave(room);
  if (room.saveSlot == null) return;
  // Save immediately when shop phase starts, then every 30s
  doShopSave(room);
  room._shopSaveInt = setInterval(() => {
    if (room.phase !== 'shop') { stopShopAutosave(room); return; }
    doShopSave(room);
  }, 30000);
}

function stopShopAutosave(room) {
  if (room._shopSaveInt) { clearInterval(room._shopSaveInt); room._shopSaveInt = null; }
}

function resetRoom(room) {
  stopRoom(room);
  const { inv, prices, shelves } = freshStore([]); // reset to base products only
  const players = {};
  Object.entries(room.players).forEach(([id, p], i) => {
    players[id] = { ...p, personalScore: 0, role: PLAYER_ROLES[i % PLAYER_ROLES.length], color: PLAYER_COLORS[i % PLAYER_COLORS.length] };
  });
  Object.assign(room, {
    phase: 'lobby', money: room.diff?.startMoney || 200, day: 1, totalScore: 0, reputation: 100,
    inventory: inv, prices, shelves, customers: [], eventLog: [],
    activeEvent: null, upgrades: [], nextCustomerId: 1, dayTimer: 120,
    rushActive: false, saleActive: false, theftActive: false,
    theftTimeout: null, capacityBonus: 0, _cInt: null, _dInt: null, _eTimeout: null,
    isMorning: true, players,
    checkoutLocked: null, checkoutLocks: {}, aiWorkers: [], nextWorkerId: 1, _aiWorkerCooldowns: {},
    scoMachines: [], nextScoId: 1,
    stats: {
      customersServed: 0, customersLost: 0, totalRevenue: 0, aiRevenue: 0, playerRevenue: 0,
      rushHoursTriggered: 0, theftsBlocked: 0, theftsLost: 0, vipServed: 0, daysCompleted: 0, byPlayer: {},
    },
  });
  roomLog(room, '🔄 Game reset — back to lobby!');
  emit(room);
}

// ─── Socket.io ────────────────────────────────────────────────────
io.on('connection', (socket) => {

  // Send the host's save slots (only to the requesting socket)
  socket.on('getSaves', () => {
    const saves = getOrInitSaves(socket.id);
    socket.emit('savesData', saves);
  });

  // Host explicitly saves to a slot (can also be called manually later)
  socket.on('saveToSlot', (slotIdx) => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room || room.hostId !== socket.id) return;
    if (slotIdx < 0 || slotIdx > 2) return;
    const saves = getOrInitSaves(socket.id);
    saves[slotIdx] = snapshotRoom(room);
    room.saveSlot = slotIdx;
    socket.emit('savesData', saves);
    socket.emit('msg', { type:'success', text:`💾 Saved to slot ${slotIdx+1}!` });
  });

  socket.on('createRoom', ({ name, saveSlot, save, difficulty }) => {
    const playerName = (name||'').trim().slice(0,20) || 'Player 1';
    // Use save data sent from client (localStorage) - server memory resets on restart/reconnect
    const validSave = (save && typeof save === 'object' && save.day) ? save : null;
    const validDiff = ['easy','normal','hard'].includes(difficulty) ? difficulty : 'normal';
    const room = createRoom(socket.id, playerName, validSave, validDiff);
    room.saveSlot = (saveSlot != null && saveSlot >= 0 && saveSlot <= 2) ? saveSlot : 0;
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
    // Enter morning shop phase — players prep before starting Day 1
    room.phase = 'shop';
    room.isMorning = true;
    roomLog(room, `🌅 Morning! Restock shelves & buy upgrades, then start Day ${room.day}.`);
    startShopAutosave(room);
    emit(room);
  });

  socket.on('nextDay', () => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room || room.phase !== 'shop') return;
    if (room.hostId !== socket.id) { socket.emit('msg', { type:'error', text:'Only the host can start next day!' }); return; }
    stopShopAutosave(room);
    room.isMorning = false;
    startDay(room);
  });

  socket.on('manualSave', () => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room || room.phase !== 'shop') { socket.emit('msg', { type:'error', text:'Can only save during shop phase!' }); return; }
    if (room.hostId !== socket.id) { socket.emit('msg', { type:'error', text:'Only the host can save!' }); return; }
    doShopSave(room);
    socket.emit('msg', { type:'success', text:'💾 Game saved!' });
  });

  socket.on('lockCheckout', ({ customerId }) => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room || room.phase !== 'playing') return;
    if (!room.checkoutLocks) room.checkoutLocks = {};
    const lanes = getCheckoutLanes(room.upgrades);
    // If this player already has a lock, just update the customer
    if (room.checkoutLocks[socket.id]) {
      if (customerId != null) {
        const c = room.customers.find(c => c.id === customerId);
        const p = room.players[socket.id];
        if (c && !c.attendedBy) c.attendedBy = { type: 'player', name: p?.name || 'Player', emoji: '🧑‍💼' };
      }
      emit(room); return;
    }
    // Count how many OTHER players currently hold a checkout lock
    const activeLocks = Object.keys(room.checkoutLocks)
      .filter(pid => pid !== socket.id && room.players[pid]).length;
    if (activeLocks >= lanes) {
      socket.emit('checkoutDenied', { reason: `All ${lanes} checkout lane${lanes>1?'s':''} are busy! Buy more lanes in Upgrades.` });
      return;
    }
    room.checkoutLocks[socket.id] = true;
    if (customerId != null) {
      const c = room.customers.find(c => c.id === customerId);
      const p = room.players[socket.id];
      if (c && !c.attendedBy) c.attendedBy = { type: 'player', name: p?.name || 'Player', emoji: '🧑‍💼' };
    }
    emit(room);
  });

  socket.on('releaseCheckout', () => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room) return;
    if (!room.checkoutLocks) room.checkoutLocks = {};
    if (room.checkoutLocks[socket.id]) {
      delete room.checkoutLocks[socket.id];
      room.customers.forEach(c => { if (c.attendedBy?.type === 'player') c.attendedBy = null; });
      emit(room);
    }
  });

  socket.on('buyScoMachine', ({ typeId }) => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room || room.phase !== 'shop') { socket.emit('msg', { type:'error', text:'Only during shop phase!' }); return; }
    const type = SELF_CHECKOUT_TYPES.find(t => t.id === typeId);
    if (!type) return;
    // Check unlock requirement
    const unlockMap = { sco_basic: 'sco_unlock', sco_express: 'sco_express_unlock', sco_premium: 'sco_premium_unlock' };
    if (!room.upgrades.includes(unlockMap[typeId])) {
      socket.emit('msg', { type:'error', text:`Requires the Self-Checkout upgrade first!` }); return;
    }
    if (room.money < type.cost) { socket.emit('msg', { type:'error', text:`Need $${type.cost}!` }); return; }
    room.money -= type.cost;
    const m = {
      uid: room.nextScoId++,
      typeId: type.id,
      name: type.name,
      emoji: type.emoji,
      speed: type.speed,
      maintenance: type.maintenance,
      lastServeAt: 0,
      currentActivity: null,
    };
    room.scoMachines.push(m);
    roomLog(room, `${type.emoji} Installed ${type.name} self-checkout for $${type.cost}!`);
    emit(room);
  });

  socket.on('sellScoMachine', ({ uid }) => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room) return;
    const idx = room.scoMachines.findIndex(m => m.uid === uid);
    if (idx === -1) return;
    const m = room.scoMachines[idx];
    const type = SELF_CHECKOUT_TYPES.find(t => t.id === m.typeId);
    const refund = Math.round((type?.cost || 0) * 0.4);
    room.money += refund;
    room.scoMachines.splice(idx, 1);
    roomLog(room, `${m.emoji} Sold ${m.name} for $${refund} (40% refund).`);
    emit(room);
  });
  socket.on('hireWorker', ({ typeId }) => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room || room.phase !== 'shop') { socket.emit('msg', { type:'error', text:'Only during shop phase!' }); return; }
    const type = AI_WORKER_TYPES.find(t => t.id === typeId);
    if (!type) return;
    if (room.money < type.cost) { socket.emit('msg', { type:'error', text:`Need $${type.cost} to hire!` }); return; }
    room.money -= type.cost;
    const w = { uid: room.nextWorkerId++, typeId: type.id, name: type.name, emoji: type.emoji, speed: type.speed, wage: type.wage, assignedLane: null };
    room.aiWorkers.push(w);
    roomLog(room, `${type.emoji} Hired ${type.name} for $${type.cost}!`);
    emit(room);
  });

  socket.on('fireWorker', ({ uid }) => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room) return;
    const idx = room.aiWorkers.findIndex(w => w.uid === uid);
    if (idx === -1) return;
    const w = room.aiWorkers[idx];
    room.aiWorkers.splice(idx, 1);
    roomLog(room, `${w.emoji} ${w.name} was let go.`);
    emit(room);
  });

  socket.on('assignWorker', ({ uid, lane }) => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room) return;
    const lanes = getCheckoutLanes(room.upgrades);
    if (lane !== null && (lane < 1 || lane > lanes)) { socket.emit('msg', { type:'error', text:'Invalid lane!' }); return; }
    const w = room.aiWorkers.find(w => w.uid === uid);
    if (!w) return;
    w.assignedLane = lane;
    const msg = lane ? `${w.emoji} ${w.name} assigned to Lane ${lane}` : `${w.emoji} ${w.name} removed from checkout`;
    roomLog(room, msg);
    emit(room);
  });

  socket.on('serveCustomer', (cid) => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room) return;
    if (!room.checkoutLocks) room.checkoutLocks = {};
    // If player doesn't hold a lock yet (race condition: lockCheckout may not
    // have arrived before serveCustomer), try to acquire one now.
    if (!room.checkoutLocks[socket.id]) {
      const lanes = getCheckoutLanes(room.upgrades);
      const activeLocks = Object.keys(room.checkoutLocks)
        .filter(pid => pid !== socket.id && room.players[pid]).length;
      if (activeLocks >= lanes) {
        socket.emit('serveResult', { ok: false, msg: `All ${lanes} checkout lane${lanes>1?'s':''} are busy!` });
        return;
      }
      room.checkoutLocks[socket.id] = true;
    }
    const result = serveCustomer(room, cid, socket.id);
    delete room.checkoutLocks[socket.id]; // release after serve
    socket.emit('serveResult', result);
    if (result.ok) emit(room);
  });

  socket.on('stopThief', () => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room || !room.theftActive) return;
    clearTimeout(room.theftTimeout);
    room.theftActive = false; room.activeEvent = null;
    if (room.stats) room.stats.theftsBlocked = (room.stats.theftsBlocked||0) + 1;
    roomLog(room, `👮 ${room.players[socket.id]?.name||'?'} caught the thief! $10 saved!`);
    emit(room);
  });

  socket.on('restock', ({ productId, qty }) => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room || room.phase !== 'shop') { socket.emit('msg', { type:'error', text:'Only during shop phase!' }); return; }
    const prod = ALL_PRODUCTS.find(p => p.id === productId); if (!prod) return;
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
    room.prices[productId] = Math.max(1, Math.min(9999, Math.round(Number(price)||1)));
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
    // Check all prerequisites are owned
    const missingReq = upg.requires.find(r => !room.upgrades.includes(r));
    if (missingReq) {
      const reqUpg = UPGRADES.find(u => u.id === missingReq);
      socket.emit('msg', { type:'error', text:`Requires "${reqUpg?.name || missingReq}" first!` }); return;
    }
    const diff = room.diff || DIFFICULTY_CONFIGS.normal;
    const finalCost = Math.round(upg.cost * diff.upgradeCostMult);
    if (room.money < finalCost) { socket.emit('msg', { type:'error', text:`Need $${finalCost}!` }); return; }
    room.money -= finalCost;
    room.upgrades.push(uid);
    if (uid === 'shelves') room.capacityBonus += 15;
    // Initialize any newly unlocked products
    const newProds = ALL_PRODUCTS.filter(p => p.requires === uid);
    newProds.forEach(p => {
      if (!(p.id in room.inventory)) {
        room.inventory[p.id] = 0;
        room.prices[p.id] = p.basePrice;
        room.shelves[p.id] = true;
      }
    });
    const newCount = newProds.length;
    const msg = newCount > 0
      ? `⬆️ ${room.players[socket.id]?.name||'?'} unlocked: ${upg.name}! +${newCount} new product${newCount>1?'s':''}`
      : `⬆️ ${room.players[socket.id]?.name||'?'} bought: ${upg.name}!`;
    roomLog(room, msg);
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

    if (room.hostId === sock.id) {
      // Host left — kick everyone back to title
      stopRoom(room);
      io.to(code).emit('hostLeft');
      // Clean up all remaining players' socketRoom entries
      Object.keys(room.players).forEach(pid => socketRoom.delete(pid));
      rooms.delete(code);
      return;
    }

    if (Object.keys(room.players).length === 0) { stopRoom(room); rooms.delete(code); return; }
    roomLog(room, `👋 ${pname} left.`);
    emit(room);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🛒 FreshMart → http://localhost:${PORT}`));
