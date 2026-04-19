/* ═══════════════════════════════════════════════════
   INSULT ENGINE — app.js
   Fully modular SPA logic
═══════════════════════════════════════════════════ */

// ─── STATE ───────────────────────────────────────────
let STATE = {
  insults: [],
  collection: [],
  xp: 0,
  achievements: {},
  lootbox: { count: 0, lastReset: null },
  lastRandomIndex: -1,
  lastComboIndexes: []
};

// ─── ACHIEVEMENTS DEFINITIONS ────────────────────────
const ACHIEVEMENTS_DEF = [
  { id: 'first_insult',   emoji: '🎯', name: 'Premier Trait',      desc: '1ère insulte générée' },
  { id: 'ten_insults',    emoji: '🔥', name: 'Orateur',            desc: '10 insultes générées' },
  { id: 'first_combo',    emoji: '⚡', name: 'Alchimiste',          desc: '1er combo réalisé' },
  { id: 'five_combos',    emoji: '💥', name: 'Maître Fusionneur',   desc: '5 combos réalisés' },
  { id: 'situation',      emoji: '🎭', name: 'Contextualisateur',  desc: '1er ciblage de situation' },
  { id: 'first_lootbox',  emoji: '🎁', name: 'Déballeur',          desc: '1ère lootbox ouverte' },
  { id: 'five_lootboxes', emoji: '👑', name: 'Collectionneur',     desc: '5 lootboxes ouvertes' },
  { id: 'collection_start',emoji: '📦',name: 'Archiviste',         desc: '1 insulte dans la collection' },
  { id: 'collection_10',  emoji: '🏆', name: 'Encyclopédiste',     desc: '10 insultes collectées' },
  { id: 'legendary',      emoji: '✨', name: 'Légendaire',          desc: 'Obtenu une rareté LEGENDARY' },
  { id: 'chaos',          emoji: '🌀', name: 'Chaos Agent',         desc: 'Obtenu une rareté CHAOS' },
  { id: 'all_themes',     emoji: '🗂', name: 'Taxinomiste',         desc: 'Exploré tous les thèmes' }
];

// Counters separate from achievements (for progress tracking)
let COUNTERS = { insults_generated: 0, combos_done: 0, lootboxes_opened: 0, situations_done: 0 };

// ─── INIT ────────────────────────────────────────────
async function initApp() {
  loadState();
  await loadData();
  setupNavigation();
  renderList();
  renderCollection();
  renderAchievements();
  updateXPUI();
  updateLootboxCounter();
  setupNotificationOffer();
}

// ─── DATA ────────────────────────────────────────────
async function loadData() {
  try {
    const res = await fetch('insults.json');
    STATE.insults = await res.json();
    document.getElementById('list-count').textContent = STATE.insults.length;
  } catch (e) {
    console.error('Failed to load insults.json', e);
    STATE.insults = [];
    showToast('⚠️ Impossible de charger les données');
  }
}

// ─── STATE PERSISTENCE ───────────────────────────────
function saveState() {
  try {
    localStorage.setItem('ie_xp', STATE.xp);
    localStorage.setItem('ie_collection', JSON.stringify(STATE.collection));
    localStorage.setItem('ie_achievements', JSON.stringify(STATE.achievements));
    localStorage.setItem('ie_lootbox', JSON.stringify(STATE.lootbox));
    localStorage.setItem('ie_counters', JSON.stringify(COUNTERS));
  } catch (e) {}
}

function loadState() {
  try {
    STATE.xp = parseInt(localStorage.getItem('ie_xp') || '0');
    STATE.collection = JSON.parse(localStorage.getItem('ie_collection') || '[]');
    STATE.achievements = JSON.parse(localStorage.getItem('ie_achievements') || '{}');
    STATE.lootbox = JSON.parse(localStorage.getItem('ie_lootbox') || '{"count":0,"lastReset":null}');
    COUNTERS = JSON.parse(localStorage.getItem('ie_counters') || '{"insults_generated":0,"combos_done":0,"lootboxes_opened":0,"situations_done":0}');
  } catch (e) {
    STATE.xp = 0; STATE.collection = []; STATE.achievements = {};
    STATE.lootbox = { count: 0, lastReset: null }; COUNTERS = { insults_generated: 0, combos_done: 0, lootboxes_opened: 0, situations_done: 0 };
  }

  // Reset lootbox if > 24h
  if (STATE.lootbox.lastReset) {
    const elapsed = Date.now() - STATE.lootbox.lastReset;
    if (elapsed > 86400000) {
      STATE.lootbox.count = 0;
      STATE.lootbox.lastReset = Date.now();
      saveState();
    }
  } else {
    STATE.lootbox.lastReset = Date.now();
    saveState();
  }
}

// ─── NAVIGATION ──────────────────────────────────────
function setupNavigation() {
  const btns = document.querySelectorAll('.nav-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      switchView(view);
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Generator buttons
  document.getElementById('btn-random').addEventListener('click', randomInsult);
  document.getElementById('btn-combo').addEventListener('click', comboInsult);
  document.getElementById('btn-situation').addEventListener('click', situationEngine);
  document.getElementById('situation-input').addEventListener('keyup', e => {
    if (e.key === 'Enter') situationEngine();
  });
  document.getElementById('btn-save-result').addEventListener('click', saveCurrentResult);
  document.getElementById('btn-save-combo').addEventListener('click', saveCurrentCombo);

  // List controls
  document.getElementById('search-input').addEventListener('input', filterList);
  document.getElementById('theme-filter').addEventListener('change', filterList);
  document.getElementById('sort-btn').addEventListener('click', toggleSort);

  // Lootbox
  document.getElementById('btn-open-lootbox').addEventListener('click', lootboxOpen);
}

function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active');
    v.style.display = 'none';
    v.style.opacity = '0';
  });
  const target = document.getElementById('view-' + viewId);
  if (target) {
    target.style.display = 'block';
    target.classList.add('active');
    // Reflow then animate
    requestAnimationFrame(() => {
      target.style.opacity = '1';
    });
  }
}

// ─── RANDOM INSULT ───────────────────────────────────
let _currentInsult = null;
let _currentCombo = null;

function randomInsult() {
  if (!STATE.insults.length) return;

  let idx;
  do { idx = Math.floor(Math.random() * STATE.insults.length); }
  while (idx === STATE.lastRandomIndex && STATE.insults.length > 1);
  STATE.lastRandomIndex = idx;

  const ins = STATE.insults[idx];
  _currentInsult = ins;

  displayResult('INSULTE ALÉATOIRE', ins.text, ins.definition, ins.theme);
  hideCombo();

  xpUpdate(1);
  COUNTERS.insults_generated++;
  achievementCheck();
  saveState();
}

function displayResult(type, text, def, theme) {
  const card = document.getElementById('result-card');
  card.classList.remove('revealing');
  // Force reflow
  void card.offsetWidth;
  card.classList.add('revealing');

  document.getElementById('result-type').textContent = type;
  document.getElementById('result-insult').textContent = text;
  document.getElementById('result-def').textContent = def;

  const themeEl = document.getElementById('result-theme');
  themeEl.textContent = themeLabel(theme);
  themeEl.className = 'result-theme ' + themeClass(theme);

  document.getElementById('btn-save-result').style.display = 'inline-block';
}

function hideCombo() {
  document.getElementById('combo-wrapper').style.display = 'none';
}

function saveCurrentResult() {
  if (!_currentInsult) return;
  addToCollection(_currentInsult, 'common');
}

// ─── COMBO SYSTEM ────────────────────────────────────
function comboInsult() {
  if (STATE.insults.length < 2) return;

  let a, b;
  do {
    a = Math.floor(Math.random() * STATE.insults.length);
    b = Math.floor(Math.random() * STATE.insults.length);
  } while (a === b || (STATE.lastComboIndexes[0] === a && STATE.lastComboIndexes[1] === b));

  STATE.lastComboIndexes = [a, b];
  const insA = STATE.insults[a];
  const insB = STATE.insults[b];

  const combined = buildComboText(insA, insB);
  _currentCombo = { text: combined.text, definition: combined.def, theme: insA.theme };

  document.getElementById('combo-a').textContent = insA.text;
  document.getElementById('combo-b').textContent = insB.text;
  document.getElementById('combo-result-text').textContent = combined.text;
  document.getElementById('combo-result-def').textContent = combined.def;

  const wrapper = document.getElementById('combo-wrapper');
  wrapper.style.display = 'block';

  // Reset animation
  wrapper.style.animation = 'none';
  void wrapper.offsetWidth;
  wrapper.style.animation = '';

  // Clear single result
  document.getElementById('btn-save-result').style.display = 'none';

  xpUpdate(2);
  COUNTERS.insults_generated++;
  COUNTERS.combos_done++;
  achievementCheck();
  saveState();
}

function buildComboText(a, b) {
  const connectors = [
    (x, y) => `${x} & ${y}`,
    (x, y) => `${x}-${y}`,
    (x, y) => `Grand ${x} du ${y}`,
    (x, y) => `${x} de pacotille à tête de ${y}`,
    (x, y) => `Illustre ${x}, véritable ${y}`,
    (x, y) => `${x} notoire, ${y} confirmé`,
    (x, y) => `Seigneur ${x} et Baron ${y}`,
  ];
  const fn = connectors[Math.floor(Math.random() * connectors.length)];
  const text = fn(a.text, b.text);

  const defIntros = [
    'Hybride rare combinant ',
    'Fusion lexicale réunissant ',
    'Alliance redoutable : ',
    'Double malédiction : ',
    'Assemblage d\'excellence — ',
  ];
  const intro = defIntros[Math.floor(Math.random() * defIntros.length)];
  const def = intro + a.definition.toLowerCase() + ', et par-dessus tout ' + b.definition.toLowerCase() + '.';

  return { text, def };
}

function saveCurrentCombo() {
  if (!_currentCombo) return;
  addToCollection(_currentCombo, 'combo');
}

// ─── SITUATION ENGINE ─────────────────────────────────
const SITUATION_MAP = [
  { keywords: ['lent', 'lente', 'lenteur', 'lentement', 'traîne', 'tarde', 'slow'], themes: ['inutile', 'enfantin'] },
  { keywords: ['bug', 'crash', 'erreur', 'code', 'programmer', 'développer', 'tech'], themes: ['tech', 'punchline'] },
  { keywords: ['nul', 'nulle', 'incompétent', 'inutile', 'incapable', 'raté'], themes: ['inutile', 'ridicule'] },
  { keywords: ['intelligent', 'intelligente', 'génie', 'savant', 'surdoué', 'expert'], themes: ['intelligence', 'ridicule'] },
  { keywords: ['travail', 'boulot', 'boss', 'chef', 'réunion', 'meeting', 'corporate', 'collègue'], themes: ['inutile', 'relou', 'hypocrisie'] },
  { keywords: ['menteur', 'mensonge', 'ment', 'trahi', 'traîtrise', 'faux', 'hypocrite'], themes: ['hypocrisie', 'médiéval'] },
  { keywords: ['bavard', 'parle', 'parler', 'paroles', 'discours', 'bruit', 'crier'], themes: ['relou', 'ridicule'] },
  { keywords: ['sale', 'dirty', 'porc', 'dégoûtant', 'hygiène'], themes: ['sale', 'enfantin'] },
  { keywords: ['prétentieux', 'arrogant', 'snob', 'vanité', 'orgueilleux'], themes: ['renaissance', 'ridicule'] },
  { keywords: ['lâche', 'peur', 'peurer', 'fuir', 'fuite', 'couard'], themes: ['médiéval', 'inutile'] },
  { keywords: ['réseaux', 'instagram', 'tiktok', 'influenceur', 'like', 'post'], themes: ['tech', 'punchline'] },
];

function situationEngine() {
  const input = document.getElementById('situation-input').value.trim().toLowerCase();
  if (!STATE.insults.length) return;

  let matchedThemes = [];

  for (const rule of SITUATION_MAP) {
    if (rule.keywords.some(kw => input.includes(kw))) {
      matchedThemes = matchedThemes.concat(rule.themes);
    }
  }

  let pool;
  if (matchedThemes.length > 0 && input.length > 0) {
    pool = STATE.insults.filter(ins => matchedThemes.includes(ins.theme));
    if (pool.length === 0) pool = STATE.insults;
  } else {
    pool = STATE.insults;
  }

  const ins = pool[Math.floor(Math.random() * pool.length)];
  _currentInsult = ins;

  const label = input ? `SITUATION: "${input.slice(0, 30)}"` : 'INSULTE ALÉATOIRE';
  displayResult(label, ins.text, ins.definition, ins.theme);
  hideCombo();

  xpUpdate(1);
  COUNTERS.insults_generated++;
  COUNTERS.situations_done++;
  achievementCheck();
  saveState();
}

// ─── LIST VIEW ───────────────────────────────────────
let sortDir = 'asc';

function renderList() {
  const grid = document.getElementById('list-grid');
  const search = document.getElementById('search-input')?.value.toLowerCase() || '';
  const theme = document.getElementById('theme-filter')?.value || '';

  let filtered = STATE.insults.filter(ins => {
    const matchSearch = !search || ins.text.toLowerCase().includes(search) || ins.definition.toLowerCase().includes(search);
    const matchTheme = !theme || ins.theme === theme;
    return matchSearch && matchTheme;
  });

  filtered.sort((a, b) => {
    const cmp = a.text.localeCompare(b.text, 'fr');
    return sortDir === 'asc' ? cmp : -cmp;
  });

  document.getElementById('list-count').textContent = filtered.length;

  if (!filtered.length) {
    grid.innerHTML = '<div class="no-results">Aucune insulte trouvée pour cette recherche</div>';
    return;
  }

  grid.innerHTML = filtered.map(ins => `
    <div class="insult-card" onclick="quickView('${escHtml(ins.text)}')">
      <div class="card-word">${escHtml(ins.text)}</div>
      <div class="card-def">${escHtml(ins.definition)}</div>
      <span class="card-theme ${themeClass(ins.theme)}">${themeLabel(ins.theme)}</span>
    </div>
  `).join('');
}

function filterList() { renderList(); }

function toggleSort() {
  sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  document.getElementById('sort-btn').textContent = sortDir === 'asc' ? 'A→Z' : 'Z→A';
  renderList();
}

function quickView(text) {
  const ins = STATE.insults.find(i => i.text === text);
  if (!ins) return;
  // Switch to generator and show
  switchView('generator');
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === 'generator');
  });
  _currentInsult = ins;
  displayResult('DEPUIS L\'ENCYCLOPÉDIE', ins.text, ins.definition, ins.theme);
  hideCombo();
}

// ─── LOOTBOX ─────────────────────────────────────────
const RARITIES = [
  { id: 'rare',      label: '★ RARE',       weight: 50, cssClass: 'rarity-rare' },
  { id: 'epic',      label: '★★ ÉPIQUE',    weight: 30, cssClass: 'rarity-epic' },
  { id: 'legendary', label: '★★★ LÉGENDAIRE',weight: 15, cssClass: 'rarity-legendary' },
  { id: 'chaos',     label: '☠ CHAOS',       weight: 5,  cssClass: 'rarity-chaos' },
];

function pickRarity() {
  const total = RARITIES.reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * total;
  for (const r of RARITIES) { roll -= r.weight; if (roll <= 0) return r; }
  return RARITIES[0];
}

const RARITY_COLORS = {
  rare: '#3498db', epic: '#c0392b', legendary: '#f39c12', chaos: '#8b00ff'
};

let _lootboxAnimating = false;

function lootboxOpen() {
  if (_lootboxAnimating) return;

  if (STATE.lootbox.count >= 5) {
    const remaining = 86400000 - (Date.now() - STATE.lootbox.lastReset);
    const hrs = Math.floor(remaining / 3600000);
    const mins = Math.floor((remaining % 3600000) / 60000);
    showToast(`⏳ Recharge dans ${hrs}h${mins}m`);
    return;
  }

  _lootboxAnimating = true;

  const box = document.getElementById('lootbox-box');
  const rewardEl = document.getElementById('lootbox-reward');
  const btn = document.getElementById('btn-open-lootbox');

  btn.disabled = true;
  rewardEl.style.display = 'none';
  box.style.display = 'flex';

  // Pick result
  const rarity = pickRarity();
  const insult = STATE.insults[Math.floor(Math.random() * STATE.insults.length)];

  // Phase 1: shake
  box.className = 'lootbox-box shaking';

  setTimeout(() => {
    // Phase 2: open
    box.className = 'lootbox-box opening';

    // Screen flash
    const flash = document.createElement('div');
    flash.className = 'flash-overlay';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 400);

    setTimeout(() => {
      // Phase 3: reveal
      box.style.display = 'none';

      // Particles
      spawnParticles(rarity.id);

      // Show reward
      rewardEl.style.display = 'block';
      rewardEl.className = 'lootbox-reward ' + rarity.cssClass;

      document.getElementById('reward-rarity').textContent = rarity.label;
      document.getElementById('reward-insult').textContent = insult.text;
      document.getElementById('reward-def').textContent = insult.definition;

      const themeEl = document.getElementById('reward-theme');
      themeEl.textContent = themeLabel(insult.theme);
      themeEl.className = 'reward-theme ' + themeClass(insult.theme);

      // Update state
      STATE.lootbox.count++;
      STATE.lootbox.lastReset = STATE.lootbox.lastReset || Date.now();
      COUNTERS.lootboxes_opened++;

      addToCollection(insult, rarity.id);
      xpUpdate(3);
      achievementCheck();
      updateLootboxCounter();
      saveState();

      btn.disabled = false;
      _lootboxAnimating = false;

      // Regen box after viewing
      setTimeout(() => {
        box.className = 'lootbox-box';
        box.style.display = 'flex';
        rewardEl.style.display = 'none';
      }, 6000);

    }, 600);
  }, 500);
}

function spawnParticles(rarityId) {
  const container = document.getElementById('particles');
  container.innerHTML = '';
  const color = RARITY_COLORS[rarityId] || '#c9a96e';
  const count = rarityId === 'legendary' ? 30 : rarityId === 'chaos' ? 25 : 16;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const angle = (Math.random() * Math.PI * 2);
    const dist = 80 + Math.random() * 120;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist - 40;
    const dur = (0.6 + Math.random() * 0.6).toFixed(2) + 's';
    const delay = (Math.random() * 0.3).toFixed(2) + 's';

    p.style.cssText = `
      background: ${color};
      left: calc(50% - 3px);
      top: 50%;
      --tx: ${tx}px;
      --ty: ${ty}px;
      --dur: ${dur};
      --delay: ${delay};
      opacity: 0;
    `;
    // Stagger
    p.style.animationDelay = delay;
    container.appendChild(p);
    // Force animation start
    requestAnimationFrame(() => { p.style.animation = `particleBurst ${dur} ${delay} ease-out forwards`; });
  }
}

function updateLootboxCounter() {
  const remaining = Math.max(0, 5 - STATE.lootbox.count);
  document.getElementById('lootbox-remaining').textContent = remaining;
  const btn = document.getElementById('btn-open-lootbox');
  const hint = document.getElementById('lootbox-hint');

  if (remaining === 0) {
    btn.disabled = true;
    hint.textContent = 'Recharge dans 24h';
  } else {
    btn.disabled = false;
    hint.textContent = `${remaining} ouverture${remaining > 1 ? 's' : ''} disponible${remaining > 1 ? 's' : ''}`;
  }
}

// ─── COLLECTION ──────────────────────────────────────
function addToCollection(insult, rarity) {
  const exists = STATE.collection.find(i => i.text === insult.text);
  if (exists) { showToast('Déjà dans votre collection'); return; }

  STATE.collection.push({ ...insult, rarity: typeof rarity === 'string' ? rarity : 'common', addedAt: Date.now() });
  saveState();
  renderCollection();
  achievementCheck();
  showToast(`📦 "${insult.text}" ajouté à votre collection`);
}

function renderCollection() {
  const grid = document.getElementById('collection-grid');
  const count = document.getElementById('collection-count');
  count.textContent = STATE.collection.length;

  if (!STATE.collection.length) {
    grid.innerHTML = '<p class="collection-empty">Ouvrez des lootboxes pour commencer votre collection...</p>';
    return;
  }

  const sorted = [...STATE.collection].sort((a, b) => b.addedAt - a.addedAt);
  grid.innerHTML = sorted.map(item => `
    <div class="collection-item ci-${item.rarity}">
      <div class="collection-item-rarity"></div>
      <div class="ci-name">${escHtml(item.text)}</div>
      <div class="ci-def">${escHtml(item.definition)}</div>
    </div>
  `).join('');
}

// ─── XP SYSTEM ───────────────────────────────────────
function xpUpdate(amount) {
  STATE.xp += amount;
  updateXPUI();
}

function updateXPUI() {
  const level = Math.floor(STATE.xp / 10);
  const xpInLevel = STATE.xp % 10;
  const pct = (xpInLevel / 10) * 100;

  document.getElementById('xp-level').textContent = level;
  document.getElementById('nav-level').textContent = level;
  document.getElementById('xp-current').textContent = STATE.xp;
  document.getElementById('xp-next').textContent = (level + 1) * 10;

  const fill = document.getElementById('xp-fill');
  const fillMini = document.getElementById('xp-fill-mini');
  if (fill) fill.style.width = pct + '%';
  if (fillMini) fillMini.style.width = pct + '%';
}

// ─── ACHIEVEMENTS ─────────────────────────────────────
function achievementCheck() {
  const unlock = (id) => {
    if (STATE.achievements[id]) return;
    STATE.achievements[id] = true;
    const def = ACHIEVEMENTS_DEF.find(a => a.id === id);
    if (def) showAchievementPopup(def);
    renderAchievements();
    saveState();
  };

  if (COUNTERS.insults_generated >= 1) unlock('first_insult');
  if (COUNTERS.insults_generated >= 10) unlock('ten_insults');
  if (COUNTERS.combos_done >= 1) unlock('first_combo');
  if (COUNTERS.combos_done >= 5) unlock('five_combos');
  if (COUNTERS.situations_done >= 1) unlock('situation');
  if (COUNTERS.lootboxes_opened >= 1) unlock('first_lootbox');
  if (COUNTERS.lootboxes_opened >= 5) unlock('five_lootboxes');
  if (STATE.collection.length >= 1) unlock('collection_start');
  if (STATE.collection.length >= 10) unlock('collection_10');

  // Check legendary/chaos
  const hasLegendary = STATE.collection.some(i => i.rarity === 'legendary');
  const hasChaos = STATE.collection.some(i => i.rarity === 'chaos');
  if (hasLegendary) unlock('legendary');
  if (hasChaos) unlock('chaos');

  // All themes
  const themes = [...new Set(STATE.collection.map(i => i.theme))];
  const allThemes = ['enfantin','médiéval','renaissance','littéraire','intelligence','inutile','hypocrisie','relou','ridicule','sale','tech','punchline'];
  if (allThemes.every(t => themes.includes(t))) unlock('all_themes');
}

function renderAchievements() {
  const grid = document.getElementById('achievements-grid');
  if (!grid) return;
  grid.innerHTML = ACHIEVEMENTS_DEF.map(ach => {
    const unlocked = !!STATE.achievements[ach.id];
    return `
      <div class="achievement-badge ${unlocked ? 'unlocked' : 'locked'}">
        <span class="ach-emoji">${ach.emoji}</span>
        <div class="ach-info">
          <div class="ach-name">${escHtml(ach.name)}</div>
          <div class="ach-hint">${escHtml(ach.desc)}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ─── UI HELPERS ──────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

let achTimer;
function showAchievementPopup(def) {
  const popup = document.getElementById('achievement-popup');
  document.getElementById('ach-icon').textContent = def.emoji;
  document.getElementById('ach-title').textContent = '🏅 ' + def.name;
  document.getElementById('ach-desc').textContent = def.desc;
  popup.style.display = 'flex';
  popup.classList.add('show');
  clearTimeout(achTimer);
  achTimer = setTimeout(() => {
    popup.classList.remove('show');
    setTimeout(() => { popup.style.display = 'none'; }, 350);
  }, 3500);
}

function themeClass(theme) {
  return 'theme-' + (theme || 'punchline').replace(/[^a-záéèêàâùûôîïœ]/g, '');
}

function themeLabel(theme) {
  const labels = {
    enfantin: '🧸 Enfantin', médiéval: '⚔️ Médiéval', renaissance: '🎭 Renaissance',
    'littéraire': '📚 Littéraire', intelligence: '🧠 Intelligence', inutile: '😴 Inutile',
    hypocrisie: '🐍 Hypocrisie', relou: '😤 Relou', ridicule: '🎭 Ridicule',
    sale: '🧹 Sale', tech: '💻 Tech', punchline: '⚡ Punchline'
  };
  return labels[theme] || theme;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── NOTIFICATIONS ───────────────────────────────────
function setupNotificationOffer() {
  // Only offer once
  if (localStorage.getItem('ie_notif_asked')) return;
  if (!('Notification' in window)) return;

  setTimeout(() => {
    if (Notification.permission === 'default') {
      showToast('🔔 Activez les notifs pour l\'insulte du jour !');
      // Schedule a reminder offer after brief delay
      setTimeout(() => {
        if (confirm('🎩 INSULT ENGINE\nRecevoir une insulte du jour + rappel lootbox ?\n(Optionnel)')) {
          Notification.requestPermission().then(perm => {
            if (perm === 'granted') {
              showToast('✅ Notifications activées !');
              scheduleNotification();
            }
          });
        }
        localStorage.setItem('ie_notif_asked', '1');
      }, 1200);
    }
  }, 3000);
}

function scheduleNotification() {
  if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') return;
  // Simple daily notification using setTimeout (best effort, tab must be open)
  const msUntilMidnight = new Date().setHours(9, 0, 0, 0) - Date.now();
  const delay = msUntilMidnight > 0 ? msUntilMidnight : msUntilMidnight + 86400000;
  setTimeout(() => {
    if (STATE.insults.length) {
      const ins = STATE.insults[Math.floor(Math.random() * STATE.insults.length)];
      new Notification('🎩 Insulte du jour', {
        body: `"${ins.text}" — ${ins.definition}\nVos lootboxes vous attendent !`,
        icon: '🎩'
      });
    }
  }, Math.min(delay, 2147483647));
}

// ─── uiRender (alias) ─────────────────────────────────
function uiRender() { renderList(); renderCollection(); renderAchievements(); updateXPUI(); }

// ─── BOOT ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initApp);
