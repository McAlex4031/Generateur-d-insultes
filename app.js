/* ═══════════════════════════════════════════════════
   INSULT ENGINE — app.js
   Progressive XP · 4h lootbox · Collapsible collection
   Button animations · Vibration · Rarity panel
═══════════════════════════════════════════════════ */

// ─── JSON FILES ───────────────────────────────────────
const JSON_FILES = [
  { file: 'enfantines.json',  category: 'enfantines_absurdes' },
  { file: 'moyen_age.json',   category: 'moyen_age' },
  { file: 'renaissance.json', category: 'renaissance_xviie' },
  { file: 'litteraire.json',  category: 'xixe_litterature' },
  { file: 'intelligence.json',category: 'intelligence' },
  { file: 'inutiles.json',    category: 'inutiles_faibles' },
  { file: 'hypocrisie.json',  category: 'hypocrisie' },
  { file: 'relous.json',      category: 'relous' },
  { file: 'ridicule.json',    category: 'ridicule' },
  { file: 'ventes.json',      category: 'sales' },
  { file: 'tech.json',        category: 'tech' },
  { file: 'punchlines.json',  category: 'punchlines' },
  { file: 'insultes.json',    category: null },
];

// ─── XP SYSTEM ───────────────────────────────────────
// Level N requires xpForLevel(N) total XP to reach
// Cost to go from level N to N+1 = 5 + (N * 3)
// Level 0→1 = 5xp, 1→2 = 8xp, 2→3 = 11xp, 3→4 = 14xp ...
function xpNeededForLevel(level) {
  // Total XP needed to reach this level (cumulative)
  let total = 0;
  for (let i = 0; i < level; i++) {
    total += 5 + (i * 3);
  }
  return total;
}

function getLevelFromXP(xp) {
  let level = 0;
  while (xp >= xpNeededForLevel(level + 1)) {
    level++;
  }
  return level;
}

function getXPForCurrentLevel(xp) {
  const level = getLevelFromXP(xp);
  return xp - xpNeededForLevel(level);
}

function getXPNeededForNextLevel(xp) {
  const level = getLevelFromXP(xp);
  return (5 + level * 3); // cost of this level
}

// ─── LOOTBOX COOLDOWN ────────────────────────────────
const LOOTBOX_MAX      = 5;
const LOOTBOX_COOLDOWN = 4 * 60 * 60 * 1000; // 4 heures

// ─── STATE ───────────────────────────────────────────
let STATE = {
  insults: [],
  collection: [],
  xp: 0,
  achievements: {},
  lootbox: { count: 0, lastReset: null },
  lastRandomIndex: -1,
  lastComboIndexes: [],
  collectionOpen: true,
};

let COUNTERS = {
  insults_generated: 0,
  combos_done: 0,
  lootboxes_opened: 0,
  situations_done: 0
};

// ─── ACHIEVEMENTS ────────────────────────────────────
const ACHIEVEMENTS_DEF = [
  { id: 'first_insult',    emoji: '🎯', name: 'Premier Trait',     desc: '1ère insulte générée' },
  { id: 'ten_insults',     emoji: '🔥', name: 'Orateur',           desc: '10 insultes générées' },
  { id: 'first_combo',     emoji: '⚡', name: 'Alchimiste',         desc: '1er combo réalisé' },
  { id: 'five_combos',     emoji: '💥', name: 'Maître Fusionneur',  desc: '5 combos réalisés' },
  { id: 'situation',       emoji: '🎭', name: 'Contextualisateur', desc: '1er ciblage de situation' },
  { id: 'first_lootbox',   emoji: '🎁', name: 'Déballeur',         desc: '1ère lootbox ouverte' },
  { id: 'five_lootboxes',  emoji: '👑', name: 'Collectionneur',    desc: '5 lootboxes ouvertes' },
  { id: 'collection_start',emoji: '📦', name: 'Archiviste',        desc: '1 insulte dans la collection' },
  { id: 'collection_10',   emoji: '🏆', name: 'Encyclopédiste',    desc: '10 insultes collectées' },
  { id: 'legendary',       emoji: '✨', name: 'Légendaire',         desc: 'Obtenu une rareté LEGENDARY' },
  { id: 'chaos',           emoji: '🌀', name: 'Chaos Agent',        desc: 'Obtenu une rareté CHAOS' },
  { id: 'all_themes',      emoji: '🗂',  name: 'Taxinomiste',       desc: 'Exploré tous les thèmes' }
];

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
  startLootboxTimer();
}

// ─── DATA LOADING ────────────────────────────────────
async function loadData() {
  const results = await Promise.allSettled(
    JSON_FILES.map(({ file, category }) => fetchFile(file, category))
  );

  STATE.insults = [];
  let loaded = 0;
  results.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value) {
      STATE.insults.push(...result.value);
      loaded++;
    } else {
      console.warn(`⚠️ Fichier non chargé : ${JSON_FILES[i].file}`);
    }
  });

  const countEl = document.getElementById('list-count');
  if (countEl) countEl.textContent = STATE.insults.length;

  if (!STATE.insults.length) {
    showToast('⚠️ Aucune donnée — vérifiez vos fichiers JSON');
  } else {
    console.log(`✅ ${STATE.insults.length} insultes depuis ${loaded}/${JSON_FILES.length} fichiers`);
  }
}

async function fetchFile(file, categoryOverride) {
  try {
    const res = await fetch(file);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // Format { insults: [...] } — chaque insulte peut avoir "name"/"text" et "theme"/"category"
    if (data.insults && Array.isArray(data.insults)) {
      return data.insults.map(ins => ({
        name: ins.name || ins.text || '?',
        definition: ins.definition || '',
        // categoryOverride wins if set; else read per-insult theme; else file-level category
        category: categoryOverride || ins.theme || data.category || 'unknown'
      }));
    }
    // Format tableau plat
    if (Array.isArray(data)) {
      return data.map(ins => ({
        name: ins.name || ins.text || '?',
        definition: ins.definition || '',
        category: categoryOverride || ins.theme || 'unknown'
      }));
    }
    return [];
  } catch (e) {
    console.warn(`Erreur ${file} :`, e.message);
    return null;
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
    localStorage.setItem('ie_col_open', STATE.collectionOpen ? '1' : '0');
  } catch (e) {
    console.warn('localStorage indisponible:', e);
  }
}

function loadState() {
  try {
    STATE.xp = parseInt(localStorage.getItem('ie_xp') || '0');
    STATE.collection = JSON.parse(localStorage.getItem('ie_collection') || '[]');
    STATE.achievements = JSON.parse(localStorage.getItem('ie_achievements') || '{}');
    STATE.lootbox = JSON.parse(localStorage.getItem('ie_lootbox') || '{"count":0,"lastReset":null}');
    COUNTERS = JSON.parse(localStorage.getItem('ie_counters') || '{"insults_generated":0,"combos_done":0,"lootboxes_opened":0,"situations_done":0}');
    STATE.collectionOpen = localStorage.getItem('ie_col_open') !== '0';
  } catch (e) {
    STATE.xp = 0; STATE.collection = []; STATE.achievements = {};
    STATE.lootbox = { count: 0, lastReset: null };
    COUNTERS = { insults_generated: 0, combos_done: 0, lootboxes_opened: 0, situations_done: 0 };
    STATE.collectionOpen = true;
  }

  // Reset lootbox if cooldown elapsed
  if (STATE.lootbox.lastReset) {
    if (Date.now() - STATE.lootbox.lastReset > LOOTBOX_COOLDOWN) {
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
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  bindBtn('btn-random', randomInsult);
  bindBtn('btn-combo', comboInsult);
  bindBtn('btn-situation', situationEngine);
  bindBtn('btn-save-result', saveCurrentResult);
  bindBtn('btn-save-combo', saveCurrentCombo);
  bindBtn('btn-open-lootbox', lootboxOpen);
  bindBtn('sort-btn', toggleSort);

  document.getElementById('situation-input')?.addEventListener('keyup', e => {
    if (e.key === 'Enter') situationEngine();
  });
  document.getElementById('search-input')?.addEventListener('input', filterList);
  document.getElementById('theme-filter')?.addEventListener('change', filterList);

  // Collapsible collection
  const toggle = document.getElementById('collection-toggle');
  if (toggle) {
    toggle.addEventListener('click', toggleCollection);
    applyCollectionState(false);
  }
}

function bindBtn(id, fn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('click', () => {
    pulseButton(el);
    fn();
  });
}

function pulseButton(el) {
  el.classList.remove('btn-pulse');
  void el.offsetWidth;
  el.classList.add('btn-pulse');
  setTimeout(() => el.classList.remove('btn-pulse'), 400);
  // Vibration on mobile
  if (navigator.vibrate) navigator.vibrate(30);
}

function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active');
    v.style.display = 'none';
  });
  const target = document.getElementById('view-' + viewId);
  if (!target) return;
  target.style.display = 'block';
  target.classList.add('active');
  requestAnimationFrame(() => { target.style.opacity = '1'; });
}

// ─── COLLAPSIBLE COLLECTION ───────────────────────────
function toggleCollection() {
  STATE.collectionOpen = !STATE.collectionOpen;
  applyCollectionState(true);
  saveState();
}

function applyCollectionState(animate) {
  const grid   = document.getElementById('collection-grid');
  const arrow  = document.getElementById('toggle-arrow');
  const toggle = document.getElementById('collection-toggle');
  if (!grid) return;

  if (STATE.collectionOpen) {
    grid.style.display = 'grid';
    if (arrow) arrow.textContent = '▲';
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
  } else {
    grid.style.display = 'none';
    if (arrow) arrow.textContent = '▼';
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }
}

// ─── RANDOM INSULT ───────────────────────────────────
let _currentInsult = null;
let _currentCombo  = null;

function randomInsult() {
  if (!STATE.insults.length) return;
  let idx;
  do { idx = Math.floor(Math.random() * STATE.insults.length); }
  while (idx === STATE.lastRandomIndex && STATE.insults.length > 1);
  STATE.lastRandomIndex = idx;

  const ins = STATE.insults[idx];
  _currentInsult = ins;
  displayResult('INSULTE ALÉATOIRE', ins.name, ins.definition, ins.category);
  hideCombo();
  xpUpdate(2);
  COUNTERS.insults_generated++;
  achievementCheck();
  saveState();
}

function displayResult(type, name, definition, category) {
  const card = document.getElementById('result-card');
  if (!card) return;

  card.classList.remove('revealing');
  void card.offsetWidth;
  card.classList.add('revealing');
  card.dataset.loaded = 'true';

  const typeEl   = document.getElementById('result-type');
  const insultEl = document.getElementById('result-insult');
  const defEl    = document.getElementById('result-def');
  const themeEl  = document.getElementById('result-theme');
  const saveBtn  = document.getElementById('btn-save-result');

  if (typeEl)   typeEl.textContent = type;
  if (insultEl) insultEl.textContent = name;
  if (defEl)    defEl.textContent = definition;
  if (themeEl) {
    themeEl.textContent = themeLabel(category);
    themeEl.className = 'result-theme ' + themeClass(category);
  }
  if (saveBtn) saveBtn.style.display = 'inline-block';
}

function hideCombo() {
  const combo = document.getElementById('combo-wrapper');
  if (combo) combo.style.display = 'none';
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
  } while (
    a === b ||
    (STATE.lastComboIndexes[0] === a && STATE.lastComboIndexes[1] === b)
  );

  STATE.lastComboIndexes = [a, b];
  const insA = STATE.insults[a];
  const insB = STATE.insults[b];
  const combined = buildComboText(insA, insB);
  _currentCombo = { name: combined.text, definition: combined.def, category: insA.category };

  const comboA    = document.getElementById('combo-a');
  const comboB    = document.getElementById('combo-b');
  const comboText = document.getElementById('combo-result-text');
  const comboDef  = document.getElementById('combo-result-def');
  const wrapper   = document.getElementById('combo-wrapper');
  const saveBtn   = document.getElementById('btn-save-result');

  if (comboA)    comboA.textContent = insA.name;
  if (comboB)    comboB.textContent = insB.name;
  if (comboText) comboText.textContent = combined.text;
  if (comboDef)  comboDef.textContent = combined.def;
  if (saveBtn)   saveBtn.style.display = 'none';
  if (wrapper) {
    wrapper.style.display = 'block';
    wrapper.style.animation = 'none';
    void wrapper.offsetWidth;
    wrapper.style.animation = '';
  }

  xpUpdate(5);
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
  const text = fn(a.name, b.name);
  const intros = [
    'Hybride rare combinant ',
    'Fusion lexicale réunissant ',
    'Alliance redoutable : ',
    'Double malédiction : ',
    'Assemblage d\'excellence — ',
  ];
  const intro = intros[Math.floor(Math.random() * intros.length)];
  const def = intro + a.definition.toLowerCase() + ', et par-dessus tout ' + b.definition.toLowerCase() + '.';
  return { text, def };
}

function saveCurrentCombo() {
  if (!_currentCombo) return;
  addToCollection(_currentCombo, 'combo');
}

// ─── SITUATION ENGINE ────────────────────────────────
const SITUATION_MAP = [
  { keywords: ['lent', 'lente', 'lenteur', 'traîne', 'tarde'],              categories: ['inutiles_faibles', 'enfantines_absurdes'] },
  { keywords: ['bug', 'crash', 'erreur', 'code', 'programmer', 'tech'],     categories: ['tech', 'punchlines'] },
  { keywords: ['nul', 'nulle', 'incompétent', 'inutile', 'incapable'],      categories: ['inutiles_faibles', 'ridicule'] },
  { keywords: ['intelligent', 'génie', 'savant', 'surdoué', 'expert'],      categories: ['intelligence', 'ridicule'] },
  { keywords: ['travail', 'boulot', 'boss', 'chef', 'réunion', 'collègue'], categories: ['inutiles_faibles', 'relous', 'hypocrisie'] },
  { keywords: ['menteur', 'mensonge', 'trahi', 'faux', 'hypocrite'],        categories: ['hypocrisie', 'moyen_age'] },
  { keywords: ['bavard', 'parle', 'bruit', 'crier'],                        categories: ['relous', 'ridicule'] },
  { keywords: ['sale', 'porc', 'dégoûtant'],                                categories: ['sales', 'enfantines_absurdes'] },
  { keywords: ['prétentieux', 'arrogant', 'snob', 'vanité'],                categories: ['renaissance_xviie', 'ridicule'] },
  { keywords: ['lâche', 'peur', 'fuir', 'couard'],                          categories: ['moyen_age', 'inutiles_faibles'] },
  { keywords: ['réseaux', 'instagram', 'tiktok', 'influenceur', 'like'],    categories: ['tech', 'punchlines'] },
];

function situationEngine() {
  const input = (document.getElementById('situation-input')?.value || '').trim().toLowerCase();
  if (!STATE.insults.length) return;

  let matchedCategories = [];
  if (input) {
    for (const rule of SITUATION_MAP) {
      if (rule.keywords.some(kw => input.includes(kw))) {
        matchedCategories = matchedCategories.concat(rule.categories);
      }
    }
  }

  let pool = matchedCategories.length > 0
    ? STATE.insults.filter(ins => matchedCategories.includes(ins.category))
    : STATE.insults;
  if (!pool.length) pool = STATE.insults;

  const ins = pool[Math.floor(Math.random() * pool.length)];
  _currentInsult = ins;

  const label = input ? `SITUATION: "${input.slice(0, 30)}"` : 'INSULTE ALÉATOIRE';
  displayResult(label, ins.name, ins.definition, ins.category);
  hideCombo();
  xpUpdate(6);
  COUNTERS.insults_generated++;
  COUNTERS.situations_done++;
  achievementCheck();
  saveState();
}

// ─── LIST VIEW ───────────────────────────────────────
let sortDir = 'asc';

function renderList() {
  const grid = document.getElementById('list-grid');
  if (!grid) return;

  const search   = (document.getElementById('search-input')?.value || '').toLowerCase();
  const category = document.getElementById('theme-filter')?.value || '';

  let filtered = STATE.insults.filter(ins => {
    const matchSearch = !search ||
      ins.name.toLowerCase().includes(search) ||
      ins.definition.toLowerCase().includes(search);
    const matchCat = !category || ins.category === category;
    return matchSearch && matchCat;
  });

  filtered.sort((a, b) => {
    const cmp = a.name.localeCompare(b.name, 'fr');
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const countEl = document.getElementById('list-count');
  if (countEl) countEl.textContent = filtered.length;

  if (!filtered.length) {
    grid.innerHTML = '<div class="no-results">Aucune insulte trouvée pour cette recherche</div>';
    return;
  }

  grid.innerHTML = filtered.map(ins => `
    <div class="insult-card" onclick="quickView(${JSON.stringify(ins.name)})">
      <div class="card-word">${escHtml(ins.name)}</div>
      <div class="card-def">${escHtml(ins.definition)}</div>
      <span class="card-theme ${themeClass(ins.category)}">${themeLabel(ins.category)}</span>
    </div>
  `).join('');
}

function filterList() { renderList(); }

function toggleSort() {
  sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  const btn = document.getElementById('sort-btn');
  if (btn) btn.textContent = sortDir === 'asc' ? 'A→Z' : 'Z→A';
  renderList();
}

function quickView(name) {
  const ins = STATE.insults.find(i => i.name === name);
  if (!ins) return;
  switchView('generator');
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === 'generator');
  });
  _currentInsult = ins;
  displayResult('DEPUIS L\'ENCYCLOPÉDIE', ins.name, ins.definition, ins.category);
  hideCombo();
}

// ─── LOOTBOX ─────────────────────────────────────────
const RARITIES = [
  { id: 'rare',      label: '★ RARE',         weight: 50, cssClass: 'rarity-rare' },
  { id: 'epic',      label: '★★ ÉPIQUE',      weight: 30, cssClass: 'rarity-epic' },
  { id: 'legendary', label: '★★★ LÉGENDAIRE', weight: 15, cssClass: 'rarity-legendary' },
  { id: 'chaos',     label: '☠ CHAOS',         weight: 5,  cssClass: 'rarity-chaos' },
];

const RARITY_COLORS = {
  rare: '#3498db', epic: '#c0392b', legendary: '#f39c12', chaos: '#8b00ff'
};

// Vibration patterns per rarity
const RARITY_VIBRATE = {
  rare:      [40],
  epic:      [60, 30, 60],
  legendary: [80, 40, 80, 40, 120],
  chaos:     [30, 20, 30, 20, 30, 20, 200]
};

function pickRarity() {
  const total = RARITIES.reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * total;
  for (const r of RARITIES) { roll -= r.weight; if (roll <= 0) return r; }
  return RARITIES[0];
}

let _lootboxAnimating = false;

function lootboxOpen() {
  if (_lootboxAnimating) return;

  if (STATE.lootbox.count >= LOOTBOX_MAX) {
    const remaining = LOOTBOX_COOLDOWN - (Date.now() - STATE.lootbox.lastReset);
    const hrs  = Math.floor(remaining / 3600000);
    const mins = Math.floor((remaining % 3600000) / 60000);
    showToast(`⏳ Recharge dans ${hrs}h${mins}m`);
    return;
  }

  if (!STATE.insults.length) return;
  _lootboxAnimating = true;

  const box      = document.getElementById('lootbox-box');
  const rewardEl = document.getElementById('lootbox-reward');
  const btn      = document.getElementById('btn-open-lootbox');
  if (!box || !rewardEl || !btn) { _lootboxAnimating = false; return; }

  btn.disabled = true;
  rewardEl.style.display = 'none';
  box.style.display = 'flex';

  const rarity = pickRarity();
  const insult = STATE.insults[Math.floor(Math.random() * STATE.insults.length)];

  // Vibrate on open
  if (navigator.vibrate) navigator.vibrate(50);

  box.className = 'lootbox-box shaking';

  setTimeout(() => {
    box.className = 'lootbox-box opening';

    const flash = document.createElement('div');
    flash.className = 'flash-overlay';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 400);

    setTimeout(() => {
      box.style.display = 'none';
      spawnParticles(rarity.id);

      // Rarity vibration
      if (navigator.vibrate) navigator.vibrate(RARITY_VIBRATE[rarity.id] || [40]);

      rewardEl.style.display = 'block';
      rewardEl.className = 'lootbox-reward ' + rarity.cssClass;

      const rarityEl = document.getElementById('reward-rarity');
      const insultEl = document.getElementById('reward-insult');
      const defEl    = document.getElementById('reward-def');
      const themeEl  = document.getElementById('reward-theme');

      if (rarityEl) rarityEl.textContent = rarity.label;
      if (insultEl) insultEl.textContent = insult.name;
      if (defEl)    defEl.textContent = insult.definition;
      if (themeEl) {
        themeEl.textContent = themeLabel(insult.category);
        themeEl.className = 'reward-theme ' + themeClass(insult.category);
      }

      STATE.lootbox.count++;
      if (!STATE.lootbox.lastReset) STATE.lootbox.lastReset = Date.now();
      COUNTERS.lootboxes_opened++;

      addToCollection(insult, rarity.id);
      xpUpdate(50);
      achievementCheck();
      updateLootboxCounter();
      saveState();

      btn.disabled = false;
      _lootboxAnimating = false;

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
  if (!container) return;
  container.innerHTML = '';

  const color = RARITY_COLORS[rarityId] || '#c9a96e';
  const count = rarityId === 'legendary' ? 40 : rarityId === 'chaos' ? 32 : rarityId === 'epic' ? 24 : 16;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const angle = Math.random() * Math.PI * 2;
    const dist  = 80 + Math.random() * 140;
    const dur   = (0.6 + Math.random() * 0.7).toFixed(2) + 's';
    const delay = (Math.random() * 0.35).toFixed(2) + 's';

    p.style.cssText = `background:${color};left:calc(50% - 3px);top:50%;`;
    p.style.setProperty('--tx', (Math.cos(angle) * dist) + 'px');
    p.style.setProperty('--ty', (Math.sin(angle) * dist - 50) + 'px');
    p.style.setProperty('--dur', dur);
    p.style.setProperty('--delay', delay);
    container.appendChild(p);
    requestAnimationFrame(() => {
      p.style.animation = `particleBurst ${dur} ${delay} ease-out forwards`;
    });
  }
}

// ─── LOOTBOX TIMER ───────────────────────────────────
let _timerInterval = null;

function startLootboxTimer() {
  clearInterval(_timerInterval);
  _timerInterval = setInterval(tickLootboxTimer, 10000); // update every 10s
  tickLootboxTimer();
}

function tickLootboxTimer() {
  updateLootboxCounter();
  // Auto-reset check
  if (STATE.lootbox.count >= LOOTBOX_MAX && STATE.lootbox.lastReset) {
    if (Date.now() - STATE.lootbox.lastReset > LOOTBOX_COOLDOWN) {
      STATE.lootbox.count = 0;
      STATE.lootbox.lastReset = Date.now();
      saveState();
      updateLootboxCounter();
      showToast('🎁 Vos lootboxes sont rechargées !');
    }
  }
}

function updateLootboxCounter() {
  const remaining = Math.max(0, LOOTBOX_MAX - STATE.lootbox.count);
  const el    = document.getElementById('lootbox-remaining');
  const btn   = document.getElementById('btn-open-lootbox');
  const hint  = document.getElementById('lootbox-hint');
  const timer = document.getElementById('lootbox-timer');

  if (el) el.textContent = remaining;

  if (remaining === 0) {
    if (btn) btn.disabled = true;
    if (hint) hint.textContent = 'Recharge en cours...';
    // Show countdown
    if (timer && STATE.lootbox.lastReset) {
      const elapsed = Date.now() - STATE.lootbox.lastReset;
      const left = Math.max(0, LOOTBOX_COOLDOWN - elapsed);
      const hrs  = Math.floor(left / 3600000);
      const mins = Math.floor((left % 3600000) / 60000);
      const secs = Math.floor((left % 60000) / 1000);
      timer.textContent = ` — ${hrs > 0 ? hrs + 'h' : ''}${mins}m${secs}s`;
    }
  } else {
    if (btn) btn.disabled = false;
    if (hint) hint.textContent = `${remaining} ouverture${remaining > 1 ? 's' : ''} disponible${remaining > 1 ? 's' : ''}`;
    if (timer) timer.textContent = '';
  }
}

// ─── COLLECTION ──────────────────────────────────────
function addToCollection(insult, rarity) {
  if (!insult || !insult.name) return;
  const exists = STATE.collection.some(i => i.name === insult.name);
  if (exists) { showToast('Déjà dans votre collection'); return; }

  STATE.collection.push({
    name: insult.name,
    definition: insult.definition,
    category: insult.category,
    rarity: typeof rarity === 'string' ? rarity : 'common',
    addedAt: Date.now()
  });

  saveState();
  renderCollection();
  achievementCheck();
  showToast(`📦 "${insult.name}" ajouté à la collection`);
}

function renderCollection() {
  const grid  = document.getElementById('collection-grid');
  const count = document.getElementById('collection-count');
  if (count) count.textContent = STATE.collection.length;
  if (!grid) return;

  if (!STATE.collection.length) {
    grid.innerHTML = '<p class="collection-empty">Ouvrez des lootboxes pour commencer votre collection...</p>';
    applyCollectionState(false);
    return;
  }

  const sorted = [...STATE.collection].sort((a, b) => b.addedAt - a.addedAt);
  grid.innerHTML = sorted.map(item => `
    <div class="collection-item ci-${item.rarity}">
      <div class="collection-item-rarity"></div>
      <div class="ci-name">${escHtml(item.name)}</div>
      <div class="ci-def">${escHtml(item.definition)}</div>
    </div>
  `).join('');

  applyCollectionState(false);
}

// ─── XP SYSTEM ───────────────────────────────────────
function xpUpdate(amount) {
  const prevLevel = getLevelFromXP(STATE.xp);
  STATE.xp += amount;
  const newLevel = getLevelFromXP(STATE.xp);

  updateXPUI();

  if (newLevel > prevLevel) {
    showLevelUp(newLevel);
    if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
  }
}

function updateXPUI() {
  const level   = getLevelFromXP(STATE.xp);
  const current = getXPForCurrentLevel(STATE.xp);
  const needed  = getXPNeededForNextLevel(STATE.xp);
  const pct     = Math.min(100, (current / needed) * 100);

  const lvlEl    = document.getElementById('xp-level');
  const navLvl   = document.getElementById('nav-level');
  const curEl    = document.getElementById('xp-current');
  const nextEl   = document.getElementById('xp-next');
  const fill     = document.getElementById('xp-fill');
  const fillMini = document.getElementById('xp-fill-mini');

  if (lvlEl)    lvlEl.textContent = level;
  if (navLvl)   navLvl.textContent = level;
  if (curEl)    curEl.textContent = STATE.xp;
  if (nextEl)   nextEl.textContent = xpNeededForLevel(level + 1);
  if (fill)     fill.style.width = pct + '%';
  if (fillMini) fillMini.style.width = pct + '%';
}

function showLevelUp(level) {
  const popup = document.getElementById('levelup-popup');
  const num   = document.getElementById('levelup-number');
  if (!popup || !num) return;

  num.textContent = level;
  popup.style.display = 'flex';
  popup.classList.add('show');

  setTimeout(() => {
    popup.classList.remove('show');
    setTimeout(() => { popup.style.display = 'none'; }, 500);
  }, 2500);
}

// ─── ACHIEVEMENTS ────────────────────────────────────
function achievementCheck() {
  const unlock = (id) => {
    if (STATE.achievements[id]) return;
    STATE.achievements[id] = true;
    const def = ACHIEVEMENTS_DEF.find(a => a.id === id);
    if (def) showAchievementPopup(def);
    renderAchievements();
    saveState();
  };

  if (COUNTERS.insults_generated >= 1)  unlock('first_insult');
  if (COUNTERS.insults_generated >= 10) unlock('ten_insults');
  if (COUNTERS.combos_done >= 1)        unlock('first_combo');
  if (COUNTERS.combos_done >= 5)        unlock('five_combos');
  if (COUNTERS.situations_done >= 1)    unlock('situation');
  if (COUNTERS.lootboxes_opened >= 1)   unlock('first_lootbox');
  if (COUNTERS.lootboxes_opened >= 5)   unlock('five_lootboxes');
  if (STATE.collection.length >= 1)     unlock('collection_start');
  if (STATE.collection.length >= 10)    unlock('collection_10');
  if (STATE.collection.some(i => i.rarity === 'legendary')) unlock('legendary');
  if (STATE.collection.some(i => i.rarity === 'chaos'))     unlock('chaos');

  const collectedCats = [...new Set(STATE.collection.map(i => i.category))];
  if (JSON_FILES.map(f => f.category).every(c => collectedCats.includes(c))) unlock('all_themes');
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
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

let achTimer;
function showAchievementPopup(def) {
  const popup = document.getElementById('achievement-popup');
  if (!popup) return;
  const iconEl  = document.getElementById('ach-icon');
  const titleEl = document.getElementById('ach-title');
  const descEl  = document.getElementById('ach-desc');
  if (iconEl)  iconEl.textContent = def.emoji;
  if (titleEl) titleEl.textContent = '🏅 ' + def.name;
  if (descEl)  descEl.textContent = def.desc;
  popup.style.display = 'flex';
  popup.classList.add('show');
  clearTimeout(achTimer);
  achTimer = setTimeout(() => {
    popup.classList.remove('show');
    setTimeout(() => { popup.style.display = 'none'; }, 350);
  }, 3500);
}

// ─── THEME HELPERS ───────────────────────────────────
function themeClass(category) {
  const map = {
    // Clés longues (fichiers thématiques)
    enfantines_absurdes: 'theme-enfantin',
    moyen_age:           'theme-medieval',
    renaissance_xviie:   'theme-renaissance',
    xixe_litterature:    'theme-litteraire',
    intelligence:        'theme-intelligence',
    inutiles_faibles:    'theme-inutile',
    hypocrisie:          'theme-hypocrisie',
    relous:              'theme-relou',
    ridicule:            'theme-ridicule',
    sales:               'theme-sale',
    tech:                'theme-tech',
    punchlines:          'theme-punchline',
    // Aliases courts (insultes.json utilise ces valeurs)
    renaissance:         'theme-renaissance',
    'littéraire':        'theme-litteraire',
    inutile:             'theme-inutile',
    punchline:           'theme-punchline',
    sale:                'theme-sale',
    relou:               'theme-relou',
  };
  return map[category] || 'theme-default';
}

function themeLabel(category) {
  const map = {
    enfantines_absurdes: '🧸 Enfantin',
    moyen_age:           '⚔️ Médiéval',
    renaissance_xviie:   '🎭 Renaissance',
    xixe_litterature:    '📚 Littéraire',
    intelligence:        '🧠 Intelligence',
    inutiles_faibles:    '😴 Inutile',
    hypocrisie:          '🐍 Hypocrisie',
    relous:              '😤 Relou',
    ridicule:            '🎭 Ridicule',
    sales:               '🧹 Sale',
    tech:                '💻 Tech',
    punchlines:          '⚡ Punchline',
    // Aliases courts (insultes.json)
    renaissance:         '🎭 Renaissance',
    'littéraire':        '📚 Littéraire',
    inutile:             '😴 Inutile',
    punchline:           '⚡ Punchline',
    sale:                '🧹 Sale',
    relou:               '😤 Relou',
  };
  return map[category] || category;
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
  if (localStorage.getItem('ie_notif_asked')) return;
  if (!('Notification' in window)) return;
  setTimeout(() => {
    if (Notification.permission === 'default') {
      showToast('🔔 Activez les notifs pour l\'insulte du jour !');
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
  if (Notification.permission !== 'granted' || !STATE.insults.length) return;
  let delay = new Date().setHours(9, 0, 0, 0) - Date.now();
  if (delay <= 0) delay += 86400000;
  setTimeout(() => {
    const ins = STATE.insults[Math.floor(Math.random() * STATE.insults.length)];
    new Notification('🎩 Insulte du jour', {
      body: `"${ins.name}" — ${ins.definition}\nVos lootboxes vous attendent !`
    });
  }, Math.min(delay, 2147483647));
}

// ─── BOOT ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initApp);
