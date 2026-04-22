/* ═══════════════════════════════════════════════════
   INSULT ENGINE — app.js
   Analyse linguistique · Quiz · Stats · Mode Prof
   Insulte du jour · Replay · XP éducatif
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
function xpNeededForLevel(level) {
  let total = 0;
  for (let i = 0; i < level; i++) total += 5 + (i * 3);
  return total;
}
function getLevelFromXP(xp) {
  let level = 0;
  while (xp >= xpNeededForLevel(level + 1)) level++;
  return level;
}
function getXPForCurrentLevel(xp) {
  return xp - xpNeededForLevel(getLevelFromXP(xp));
}
function getXPNeededForNextLevel(xp) {
  return 5 + getLevelFromXP(xp) * 3;
}

// Titres selon le niveau
function getTitleFromLevel(level) {
  if (level >= 50) return 'Maître Rhéteur';
  if (level >= 30) return 'Académicien';
  if (level >= 20) return 'Explorateur Littéraire';
  if (level >= 10) return 'Apprenti Linguiste';
  if (level >= 5)  return 'Lecteur Curieux';
  return 'Novice';
}

// ─── LOOTBOX ─────────────────────────────────────────
const LOOTBOX_MAX      = 5;
const LOOTBOX_COOLDOWN = 4 * 60 * 60 * 1000;

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
  profMode: false,
  // Stats linguistiques
  stats: {
    registres: { familier: 0, neutre: 0, soutenu: 0, tres_litteraire: 0 },
    figures: { Hyperbole: 0, Métaphore: 0, Ironie: 0, Personnification: 0, Aucune: 0 },
    themes: {},
    literary_scores: [],
    quiz_score: 0,
    quiz_best_streak: 0,
  }
};

let COUNTERS = {
  insults_generated: 0,
  combos_done: 0,
  lootboxes_opened: 0,
  situations_done: 0
};

// ─── ACHIEVEMENTS ────────────────────────────────────
const ACHIEVEMENTS_DEF = [
  { id: 'first_insult',     emoji: '🎯', name: 'Premier Trait',       desc: '1ère insulte générée' },
  { id: 'ten_insults',      emoji: '🔥', name: 'Orateur',             desc: '10 insultes générées' },
  { id: 'first_combo',      emoji: '⚡', name: 'Alchimiste',           desc: '1er combo réalisé' },
  { id: 'five_combos',      emoji: '💥', name: 'Maître Fusionneur',    desc: '5 combos réalisés' },
  { id: 'situation',        emoji: '🎭', name: 'Contextualisateur',   desc: '1er ciblage de situation' },
  { id: 'first_lootbox',    emoji: '🎁', name: 'Déballeur',           desc: '1ère lootbox ouverte' },
  { id: 'five_lootboxes',   emoji: '👑', name: 'Collectionneur',      desc: '5 lootboxes ouvertes' },
  { id: 'collection_start', emoji: '📦', name: 'Archiviste',          desc: '1 insulte dans la collection' },
  { id: 'collection_10',    emoji: '🏆', name: 'Encyclopédiste',      desc: '10 insultes collectées' },
  { id: 'legendary',        emoji: '✨', name: 'Légendaire',           desc: 'Obtenu une rareté LEGENDARY' },
  { id: 'chaos',            emoji: '🌀', name: 'Chaos Agent',          desc: 'Obtenu une rareté CHAOS' },
  { id: 'all_themes',       emoji: '🗂',  name: 'Taxinomiste',         desc: 'Exploré tous les thèmes' },
  // Achievements éducatifs
  { id: 'first_quiz',       emoji: '🎓', name: 'Premier Cours',       desc: '1er quiz complété' },
  { id: 'quiz_perfect',     emoji: '💯', name: 'Sans Faute',          desc: 'Quiz parfait (3/3)' },
  { id: 'quiz_streak_5',    emoji: '🔥', name: 'Série de 5',          desc: '5 bonnes réponses quiz de suite' },
  { id: 'literary_high',    emoji: '📖', name: 'Très Littéraire',     desc: 'Score littéraire ≥ 80 obtenu' },
  { id: 'prof_mode',        emoji: '👨‍🏫', name: 'Mode Prof',           desc: 'Mode prof activé' },
  { id: 'seen_hyperbole',   emoji: '💫', name: 'Hyperboliste',        desc: 'Hyperbole détectée 5 fois' },
  { id: 'seen_ironie',      emoji: '😏', name: 'Ironiste',            desc: 'Ironie détectée 5 fois' },
];

// ─── LINGUISTIC ANALYSIS ─────────────────────────────

function detectStyle(text, definition, category) {
  const t = (text + ' ' + (definition || '')).toLowerCase();
  const figures = [];
  const explanations = [];

  // HYPERBOLE
  const hyperboleWords = [
    'infini', 'cosmique', 'galactique', 'absolu', 'extrême', 'incroyable',
    'monstrueux', 'gigantesque', 'immense', 'universel', 'mondial', 'éternel',
    'jamais', 'toujours', 'tout', 'rien', 'entier', 'masse', 'total',
    'pacifique', 'océan', 'orbite', 'milliard'
  ];
  if (hyperboleWords.some(w => t.includes(w))) {
    figures.push('Hyperbole');
    explanations.push('Exagération volontaire pour amplifier l\'effet.');
  }

  // IRONIE
  const ironyWords = [
    'bravo', 'magnifique', 'génial', 'félicitations', 'brillant',
    'génie', 'quel talent', 'remarquable', 'extraordinaire', 'très bien',
    'certes', 'bien sûr', 'naturellement', 'évidemment'
  ];
  if (ironyWords.some(w => t.includes(w))) {
    figures.push('Ironie');
    explanations.push('Mots positifs utilisés pour exprimer le contraire.');
  }

  // MÉTAPHORE
  const words = t.split(/\s+/);
  const metaphoreIndicators = ['est un', 'est une', 'est le', 'est la', 'semble', 'comme un', 'comme une'];
  if (words.length > 5 && metaphoreIndicators.some(m => t.includes(m))) {
    figures.push('Métaphore');
    explanations.push('Comparaison implicite sans "comme" explicite.');
  }

  // PERSONNIFICATION
  const personWords = ['qui parle', 'qui pleure', 'qui vit', 'qui pense', 'qui ressent', 'qui souffre', 'qui rit'];
  if (personWords.some(w => t.includes(w))) {
    figures.push('Personnification');
    explanations.push('Objet ou abstraction traité comme un être vivant.');
  }

  // ANTITHÈSE
  const antithese = [['lumière', 'ombre'], ['brillant', 'vide'], ['beau', 'laid'], ['grand', 'petit']];
  if (antithese.some(([a, b]) => t.includes(a) && t.includes(b))) {
    figures.push('Antithèse');
    explanations.push('Opposition de deux termes contraires pour créer un effet.');
  }

  if (!figures.length) {
    figures.push('Aucune');
    explanations.push('Expression directe sans figure de style identifiable.');
  }

  return { figures, explanations };
}

function calculateLiteraryLevel(insult) {
  const text = (insult.name || insult.text || '');
  const def  = insult.definition || '';
  const cat  = insult.category || '';
  const t    = (text + ' ' + def).toLowerCase();

  let score = 50;

  // Bonus mots soutenus
  const soutenusWords = [
    'illustre', 'véritable', 'notoire', 'baroque', 'majestueux', 'raffiné',
    'érudit', 'ancestral', 'mythique', 'sublime', 'insigne', 'éminent',
    'fascinant', 'remarquable', 'singulier', 'prodigieux', 'lamentable',
    'magistral', 'insignifiant', 'médiocre', 'inconcevable', 'impétueux',
    'votre', 'monsieur', 'madame', 'seigneur', 'baron', 'illustre',
    'crétin', 'galactique', 'cosmique', 'absolu', 'universel'
  ];
  soutenusWords.forEach(w => { if (t.includes(w)) score += 8; });

  // Bonus thème élevé
  const elevatedThemes = ['renaissance_xviie', 'xixe_litterature', 'moyen_age', 'renaissance', 'littéraire'];
  if (elevatedThemes.includes(cat)) score += 15;

  // Bonus longueur (max +15)
  const words = text.split(/\s+/).length;
  score += Math.min(15, Math.floor(words / 3));

  // Bonus figures de style
  const { figures } = detectStyle(text, def, cat);
  const realFigures = figures.filter(f => f !== 'Aucune');
  score += realFigures.length * 7;

  // Bonus définition élaborée
  if (def.split(/\s+/).length > 5) score += 5;

  // Pénalités mots simples
  const simpleWords = ['nul', 'bête', 'idiot', 'stupide', 'lent', 'con', 'naze', 'crétin', 'débile'];
  simpleWords.forEach(w => { if (t.includes(w)) score -= 8; });

  score = Math.max(0, Math.min(100, Math.round(score)));
  return score;
}

function getLiteraryClass(score) {
  if (score >= 81) return { label: 'Très littéraire', key: 'tres_litteraire', color: '#f39c12' };
  if (score >= 61) return { label: 'Soutenu',          key: 'soutenu',        color: '#9b59b6' };
  if (score >= 31) return { label: 'Neutre',            key: 'neutre',         color: '#3498db' };
  return               { label: 'Familier',             key: 'familier',       color: '#7f8c8d' };
}

function getRegistreFromScore(score) {
  return getLiteraryClass(score).key;
}

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
  showDailyInsult();
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
    if (data.insults && Array.isArray(data.insults)) {
      return data.insults.map(ins => ({
        name: ins.name || ins.text || '?',
        definition: ins.definition || '',
        category: categoryOverride || ins.theme || data.category || 'unknown'
      }));
    }
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
    localStorage.setItem('ie_stats', JSON.stringify(STATE.stats));
    localStorage.setItem('ie_prof', STATE.profMode ? '1' : '0');
  } catch (e) { console.warn('localStorage indisponible:', e); }
}

function loadState() {
  try {
    STATE.xp            = parseInt(localStorage.getItem('ie_xp') || '0');
    STATE.collection    = JSON.parse(localStorage.getItem('ie_collection') || '[]');
    STATE.achievements  = JSON.parse(localStorage.getItem('ie_achievements') || '{}');
    STATE.lootbox       = JSON.parse(localStorage.getItem('ie_lootbox') || '{"count":0,"lastReset":null}');
    COUNTERS            = JSON.parse(localStorage.getItem('ie_counters') || '{"insults_generated":0,"combos_done":0,"lootboxes_opened":0,"situations_done":0}');
    STATE.collectionOpen= localStorage.getItem('ie_col_open') !== '0';
    STATE.profMode      = localStorage.getItem('ie_prof') === '1';
    const savedStats    = localStorage.getItem('ie_stats');
    if (savedStats) STATE.stats = JSON.parse(savedStats);
  } catch (e) {
    STATE.xp = 0; STATE.collection = []; STATE.achievements = {};
    STATE.lootbox = { count: 0, lastReset: null };
    COUNTERS = { insults_generated: 0, combos_done: 0, lootboxes_opened: 0, situations_done: 0 };
    STATE.collectionOpen = true; STATE.profMode = false;
  }
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

// ─── DAILY INSULT ─────────────────────────────────────
function showDailyInsult() {
  if (!STATE.insults.length) {
    setTimeout(showDailyInsult, 500);
    return;
  }
  const today = new Date().toDateString();
  const saved = localStorage.getItem('ie_daily');
  let daily;

  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed.date === today) {
      daily = parsed.insult;
    }
  }

  if (!daily) {
    // Seed aléatoire basé sur le jour (même insulte toute la journée)
    const seed = new Date().toDateString().split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const idx  = seed % STATE.insults.length;
    daily = STATE.insults[idx];
    localStorage.setItem('ie_daily', JSON.stringify({ date: today, insult: daily }));
  }

  const banner = document.getElementById('daily-banner');
  const text   = document.getElementById('daily-text');
  const score  = document.getElementById('daily-score');
  if (!banner || !text) return;

  const lvl = calculateLiteraryLevel(daily);
  const cls = getLiteraryClass(lvl);

  text.textContent  = daily.name;
  score.textContent = `📚 ${lvl}/100 — ${cls.label}`;
  banner.style.display = 'flex';
}

// ─── NAVIGATION ──────────────────────────────────────
function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (btn.dataset.view === 'stats') renderStats();
    });
  });

  bindBtn('btn-random',    randomInsult);
  bindBtn('btn-combo',     comboInsult);
  bindBtn('btn-situation', situationEngine);
  bindBtn('btn-save-result', saveCurrentResult);
  bindBtn('btn-save-combo',  saveCurrentCombo);
  bindBtn('btn-open-lootbox', lootboxOpen);
  bindBtn('sort-btn',      toggleSort);
  bindBtn('btn-replay',    replayInsult);
  bindBtn('btn-prof-toggle', toggleProfMode);

  document.getElementById('situation-input')?.addEventListener('keyup', e => {
    if (e.key === 'Enter') situationEngine();
  });
  document.getElementById('search-input')?.addEventListener('input', filterList);
  document.getElementById('theme-filter')?.addEventListener('change', filterList);
  document.getElementById('level-filter')?.addEventListener('change', filterList);

  const toggleEl = document.getElementById('collection-toggle');
  if (toggleEl) toggleEl.addEventListener('click', toggleCollection);

  // Quiz
  bindBtn('btn-quiz-start',    startQuiz);
  bindBtn('btn-quiz-validate', validateQuiz);
  bindBtn('btn-quiz-next',     nextQuiz);

  document.querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', () => selectQuizOption(btn));
  });

  // Init prof mode UI
  applyProfMode();
}

function bindBtn(id, fn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('click', () => { pulseButton(el); fn(); });
}

function pulseButton(el) {
  el.classList.remove('btn-pulse');
  void el.offsetWidth;
  el.classList.add('btn-pulse');
  setTimeout(() => el.classList.remove('btn-pulse'), 400);
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

// ─── PROF MODE ───────────────────────────────────────
function toggleProfMode() {
  STATE.profMode = !STATE.profMode;
  applyProfMode();
  achievementCheck();
  saveState();
  showToast(STATE.profMode ? '🎓 Mode prof activé — insultes élaborées uniquement' : '🎓 Mode prof désactivé');
}

function applyProfMode() {
  const btn  = document.getElementById('btn-prof-toggle');
  const hint = document.getElementById('prof-hint');
  if (!btn) return;
  btn.setAttribute('aria-pressed', STATE.profMode ? 'true' : 'false');
  btn.classList.toggle('prof-active', STATE.profMode);
  if (hint) hint.textContent = STATE.profMode ? 'Seules les insultes avec score ≥ 40 sont affichées' : '';
}

function getProfPool() {
  if (!STATE.profMode) return STATE.insults;
  return STATE.insults.filter(ins => calculateLiteraryLevel(ins) >= 40);
}

// ─── REPLAY ──────────────────────────────────────────
function replayInsult() {
  if (!_currentInsult) return;
  displayResult(
    document.getElementById('result-type')?.textContent || 'INSULTE',
    _currentInsult.name,
    _currentInsult.definition,
    _currentInsult.category
  );
}

// ─── RANDOM INSULT ───────────────────────────────────
let _currentInsult = null;
let _currentCombo  = null;

function randomInsult() {
  const pool = getProfPool();
  if (!pool.length) return;
  let idx;
  do { idx = Math.floor(Math.random() * pool.length); }
  while (idx === STATE.lastRandomIndex && pool.length > 1);
  STATE.lastRandomIndex = idx;
  const ins = pool[idx];
  _currentInsult = ins;
  displayResult('INSULTE ALÉATOIRE', ins.name, ins.definition, ins.category);
  hideCombo();
  xpUpdate(2);
  COUNTERS.insults_generated++;
  trackInsultStats(ins);
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
  const replayBtn= document.getElementById('btn-replay');

  if (typeEl)    typeEl.textContent = type;
  if (insultEl)  insultEl.textContent = name;
  if (defEl)     defEl.textContent = definition;
  if (themeEl) {
    themeEl.textContent = themeLabel(category);
    themeEl.className = 'result-theme ' + themeClass(category);
  }
  if (saveBtn)   saveBtn.style.display = 'inline-block';
  if (replayBtn) replayBtn.style.display = 'inline-block';

  // Analyse linguistique
  const insultObj = { name, definition, category };
  showLinguisticAnalysis(insultObj);
}

function showLinguisticAnalysis(insult) {
  const analysisEl = document.getElementById('result-analysis');
  if (!analysisEl) return;

  const score   = calculateLiteraryLevel(insult);
  const cls     = getLiteraryClass(score);
  const { figures, explanations } = detectStyle(insult.name, insult.definition, insult.category);

  const scoreVal   = document.getElementById('analysis-score-value');
  const scoreCls   = document.getElementById('analysis-score-class');
  const scoreFill  = document.getElementById('analysis-score-fill');
  const detailsEl  = document.getElementById('analysis-details');

  if (scoreVal)  scoreVal.textContent = score + '/100';
  if (scoreCls) {
    scoreCls.textContent = cls.label;
    scoreCls.style.color = cls.color;
  }
  if (scoreFill) {
    scoreFill.style.width = score + '%';
    scoreFill.style.background = cls.color;
  }

  const realFigures = figures.filter(f => f !== 'Aucune');
  if (detailsEl) {
    detailsEl.innerHTML = `
      <div class="analysis-row">
        <span class="analysis-icon">🎭</span>
        <span class="analysis-label">Figure${realFigures.length > 1 ? 's' : ''} de style :</span>
        <span class="analysis-value">${figures.join(', ')}</span>
      </div>
      <div class="analysis-row analysis-expl">
        <span class="analysis-icon">💡</span>
        <span>${explanations.join(' ')}</span>
      </div>
    `;
  }

  analysisEl.style.display = 'block';

  // Achievement score élevé
  if (score >= 80) achievementCheck('literary_high');
}

function hideCombo() {
  const combo = document.getElementById('combo-wrapper');
  if (combo) combo.style.display = 'none';
}

function saveCurrentResult() {
  if (!_currentInsult) return;
  addToCollection(_currentInsult, 'common');
}

// ─── COMBO ───────────────────────────────────────────
function comboInsult() {
  const pool = getProfPool();
  if (pool.length < 2) return;
  let a, b;
  do {
    a = Math.floor(Math.random() * pool.length);
    b = Math.floor(Math.random() * pool.length);
  } while (
    a === b ||
    (STATE.lastComboIndexes[0] === a && STATE.lastComboIndexes[1] === b)
  );
  STATE.lastComboIndexes = [a, b];
  const insA = pool[a];
  const insB = pool[b];
  const combined = buildComboText(insA, insB);
  _currentCombo = { name: combined.text, definition: combined.def, category: insA.category };

  const comboA    = document.getElementById('combo-a');
  const comboB    = document.getElementById('combo-b');
  const comboText = document.getElementById('combo-result-text');
  const comboDef  = document.getElementById('combo-result-def');
  const wrapper   = document.getElementById('combo-wrapper');
  const saveBtn   = document.getElementById('btn-save-result');
  const replayBtn = document.getElementById('btn-replay');

  if (comboA)    comboA.textContent = insA.name;
  if (comboB)    comboB.textContent = insB.name;
  if (comboText) comboText.textContent = combined.text;
  if (comboDef)  comboDef.textContent = combined.def;
  if (saveBtn)   saveBtn.style.display = 'none';
  if (replayBtn) replayBtn.style.display = 'none';

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
  const fn   = connectors[Math.floor(Math.random() * connectors.length)];
  const text = fn(a.name, b.name);
  const intros = [
    'Hybride rare combinant ', 'Fusion lexicale réunissant ',
    'Alliance redoutable : ', 'Double malédiction : ', 'Assemblage d\'excellence — ',
  ];
  const intro = intros[Math.floor(Math.random() * intros.length)];
  const def   = intro + a.definition.toLowerCase() + ', et par-dessus tout ' + b.definition.toLowerCase() + '.';
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
  { keywords: ['bavard', 'parle', 'bruit', 'crier', 'râle'],                categories: ['relous', 'ridicule'] },
  { keywords: ['sale', 'porc', 'dégoûtant'],                                categories: ['sales', 'enfantines_absurdes'] },
  { keywords: ['prétentieux', 'arrogant', 'snob', 'vanité'],                categories: ['renaissance_xviie', 'ridicule'] },
  { keywords: ['lâche', 'peur', 'fuir', 'couard'],                          categories: ['moyen_age', 'inutiles_faibles'] },
  { keywords: ['réseaux', 'instagram', 'tiktok', 'influenceur', 'like'],    categories: ['tech', 'punchlines'] },
  { keywords: ['rien', 'fait rien', 'paresseux', 'fainéant'],               categories: ['inutiles_faibles', 'relous'] },
];

function situationEngine() {
  const input = (document.getElementById('situation-input')?.value || '').trim().toLowerCase();
  const pool  = getProfPool();
  if (!pool.length) return;

  let matchedCategories = [];
  if (input) {
    for (const rule of SITUATION_MAP) {
      if (rule.keywords.some(kw => input.includes(kw))) {
        matchedCategories = matchedCategories.concat(rule.categories);
      }
    }
  }

  let subPool = matchedCategories.length > 0
    ? pool.filter(ins => matchedCategories.includes(ins.category))
    : pool;
  if (!subPool.length) subPool = pool;

  const ins = subPool[Math.floor(Math.random() * subPool.length)];
  _currentInsult = ins;

  const label = input ? `SITUATION: "${input.slice(0, 30)}"` : 'INSULTE ALÉATOIRE';
  displayResult(label, ins.name, ins.definition, ins.category);
  hideCombo();
  xpUpdate(6);
  COUNTERS.insults_generated++;
  COUNTERS.situations_done++;
  trackInsultStats(ins);
  achievementCheck();
  saveState();
}

// ─── STATS TRACKING ──────────────────────────────────
function trackInsultStats(ins) {
  const score   = calculateLiteraryLevel(ins);
  const regKey  = getRegistreFromScore(score);
  const { figures } = detectStyle(ins.name, ins.definition, ins.category);

  // Registre
  if (STATE.stats.registres[regKey] !== undefined) STATE.stats.registres[regKey]++;

  // Figures
  figures.forEach(f => {
    if (STATE.stats.figures[f] !== undefined) STATE.stats.figures[f]++;
    else STATE.stats.figures[f] = 1;
  });

  // Thème
  const cat = ins.category || 'unknown';
  STATE.stats.themes[cat] = (STATE.stats.themes[cat] || 0) + 1;

  // Score moyen
  STATE.stats.literary_scores.push(score);
  if (STATE.stats.literary_scores.length > 200) STATE.stats.literary_scores.shift();
}

// ─── LIST VIEW ───────────────────────────────────────
let sortDir = 'asc';

function renderList() {
  const grid = document.getElementById('list-grid');
  if (!grid) return;

  const search    = (document.getElementById('search-input')?.value || '').toLowerCase();
  const category  = document.getElementById('theme-filter')?.value || '';
  const levelKey  = document.getElementById('level-filter')?.value || '';

  let filtered = STATE.insults.filter(ins => {
    const matchSearch = !search ||
      ins.name.toLowerCase().includes(search) ||
      ins.definition.toLowerCase().includes(search);
    const matchCat   = !category || ins.category === category;
    let matchLevel   = true;
    if (levelKey) {
      const sc  = calculateLiteraryLevel(ins);
      const cls = getLiteraryClass(sc);
      matchLevel = cls.key === levelKey;
    }
    return matchSearch && matchCat && matchLevel;
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

  grid.innerHTML = filtered.map(ins => {
    const sc  = calculateLiteraryLevel(ins);
    const cls = getLiteraryClass(sc);
    return `
      <div class="insult-card" onclick="quickView(${JSON.stringify(ins.name)})">
        <div class="card-word">${escHtml(ins.name)}</div>
        <div class="card-def">${escHtml(ins.definition)}</div>
        <div class="card-footer">
          <span class="card-theme ${themeClass(ins.category)}">${themeLabel(ins.category)}</span>
          <span class="card-literary-score" style="color:${cls.color}" title="Niveau littéraire">${sc}/100</span>
        </div>
      </div>
    `;
  }).join('');
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
const RARITY_COLORS   = { rare: '#3498db', epic: '#c0392b', legendary: '#f39c12', chaos: '#8b00ff' };
const RARITY_VIBRATE  = { rare: [40], epic: [60,30,60], legendary: [80,40,80,40,120], chaos: [30,20,30,20,30,20,200] };

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
      if (navigator.vibrate) navigator.vibrate(RARITY_VIBRATE[rarity.id] || [40]);

      rewardEl.style.display = 'block';
      rewardEl.className = 'lootbox-reward ' + rarity.cssClass;

      const rarityEl = document.getElementById('reward-rarity');
      const insultEl = document.getElementById('reward-insult');
      const defEl    = document.getElementById('reward-def');
      const themeEl  = document.getElementById('reward-theme');

      if (rarityEl) rarityEl.textContent = rarity.label;
      if (insultEl) insultEl.textContent = insult.name;
      if (defEl)    defEl.textContent    = insult.definition;
      if (themeEl) {
        themeEl.textContent = themeLabel(insult.category);
        themeEl.className   = 'reward-theme ' + themeClass(insult.category);
      }

      STATE.lootbox.count++;
      if (!STATE.lootbox.lastReset) STATE.lootbox.lastReset = Date.now();
      COUNTERS.lootboxes_opened++;

      addToCollection(insult, rarity.id);
      xpUpdate(50);
      achievementCheck();
      updateLootboxCounter();
      saveState();

      btn.disabled      = false;
      _lootboxAnimating = false;

      setTimeout(() => {
        box.className      = 'lootbox-box';
        box.style.display  = 'flex';
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
    const p     = document.createElement('div');
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
    requestAnimationFrame(() => { p.style.animation = `particleBurst ${dur} ${delay} ease-out forwards`; });
  }
}

let _timerInterval = null;
function startLootboxTimer() {
  clearInterval(_timerInterval);
  _timerInterval = setInterval(tickLootboxTimer, 10000);
  tickLootboxTimer();
}

function tickLootboxTimer() {
  updateLootboxCounter();
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
    if (btn)  btn.disabled = true;
    if (hint) hint.textContent = 'Recharge en cours...';
    if (timer && STATE.lootbox.lastReset) {
      const left = Math.max(0, LOOTBOX_COOLDOWN - (Date.now() - STATE.lootbox.lastReset));
      const hrs  = Math.floor(left / 3600000);
      const mins = Math.floor((left % 3600000) / 60000);
      const secs = Math.floor((left % 60000) / 1000);
      timer.textContent = ` — ${hrs > 0 ? hrs + 'h' : ''}${mins}m${secs}s`;
    }
  } else {
    if (btn)  btn.disabled = false;
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
    name: insult.name, definition: insult.definition,
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
    if (arrow)  arrow.textContent = '▲';
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
  } else {
    grid.style.display = 'none';
    if (arrow)  arrow.textContent = '▼';
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }
}

// ─── XP ──────────────────────────────────────────────
function xpUpdate(amount) {
  const prevLevel = getLevelFromXP(STATE.xp);
  STATE.xp += amount;
  const newLevel  = getLevelFromXP(STATE.xp);
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
  const lvlEl   = document.getElementById('xp-level');
  const navLvl  = document.getElementById('nav-level');
  const curEl   = document.getElementById('xp-current');
  const nextEl  = document.getElementById('xp-next');
  const fill    = document.getElementById('xp-fill');
  const fillMini= document.getElementById('xp-fill-mini');
  if (lvlEl)    lvlEl.textContent  = level;
  if (navLvl)   navLvl.textContent = level;
  if (curEl)    curEl.textContent  = STATE.xp;
  if (nextEl)   nextEl.textContent = xpNeededForLevel(level + 1);
  if (fill)     fill.style.width   = pct + '%';
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

// ─── QUIZ ─────────────────────────────────────────────
let _quizInsult   = null;
let _quizAnswers  = {};
let _quizStreak   = 0;
let _quizScore    = 0;

function startQuiz() {
  const pool = STATE.insults;
  if (!pool.length) return;

  document.getElementById('quiz-start').style.display    = 'none';
  document.getElementById('quiz-questions').style.display = 'block';
  document.getElementById('quiz-correction').style.display= 'none';

  _quizInsult  = pool[Math.floor(Math.random() * pool.length)];
  _quizAnswers = {};

  const textEl = document.getElementById('quiz-insult-text');
  const defEl  = document.getElementById('quiz-insult-def');
  if (textEl) textEl.textContent = _quizInsult.name;
  if (defEl)  defEl.textContent  = _quizInsult.definition;

  // Reset options
  document.querySelectorAll('.quiz-option').forEach(btn => {
    btn.classList.remove('selected', 'correct', 'wrong');
    btn.disabled = false;
  });
  const validateBtn = document.getElementById('btn-quiz-validate');
  if (validateBtn) validateBtn.style.display = 'none';
}

function selectQuizOption(btn) {
  const q = btn.dataset.q;
  const v = btn.dataset.v;
  // Deselect others in same group
  document.querySelectorAll(`.quiz-option[data-q="${q}"]`).forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  _quizAnswers[q] = v;

  // Show validate when all 3 answered
  if (_quizAnswers.registre && _quizAnswers.figure && _quizAnswers.theme) {
    const btn = document.getElementById('btn-quiz-validate');
    if (btn) btn.style.display = 'block';
  }
}

function validateQuiz() {
  if (!_quizInsult) return;

  const score   = calculateLiteraryLevel(_quizInsult);
  const regKey  = getRegistreFromScore(score);
  const { figures } = detectStyle(_quizInsult.name, _quizInsult.definition, _quizInsult.category);
  const mainFigure  = figures[0] || 'Aucune';
  const correctTheme= _quizInsult.category;

  const correct = {
    registre: regKey,
    figure:   mainFigure,
    theme:    correctTheme,
  };

  let goodCount = 0;
  const lines   = [];

  for (const [q, ans] of Object.entries(_quizAnswers)) {
    const isOk = ans === correct[q];
    if (isOk) goodCount++;

    // Color options
    document.querySelectorAll(`.quiz-option[data-q="${q}"]`).forEach(btn => {
      btn.disabled = true;
      if (btn.dataset.v === correct[q]) btn.classList.add('correct');
      else if (btn.dataset.v === ans && !isOk) btn.classList.add('wrong');
    });

    const qLabels = { registre: 'Registre', figure: 'Figure de style', theme: 'Thème' };
    const ansLabel = getLabelForValue(q, ans);
    const corLabel = getLabelForValue(q, correct[q]);
    lines.push(`<div class="correction-line ${isOk ? 'line-ok' : 'line-ko'}">
      <span>${isOk ? '✅' : '❌'} ${qLabels[q]} :</span>
      <strong>${corLabel}</strong>
      ${!isOk ? `<span class="your-ans">(votre réponse : ${ansLabel})</span>` : ''}
    </div>`);
  }

  // XP éducatif
  const xpGained = goodCount * 8;
  if (goodCount === 3) _quizStreak++;
  else _quizStreak = 0;

  _quizScore += goodCount;
  STATE.stats.quiz_score = (_quizScore);
  if (_quizStreak > STATE.stats.quiz_best_streak) STATE.stats.quiz_best_streak = _quizStreak;

  xpUpdate(xpGained);

  const correctionBody = document.getElementById('correction-body');
  const correctionXP   = document.getElementById('correction-xp');
  const streakText     = _quizStreak > 1 ? ` 🔥 Série de ${_quizStreak} !` : '';

  if (correctionBody) correctionBody.innerHTML = lines.join('');
  if (correctionXP)   correctionXP.textContent = `+${xpGained} XP${streakText} — ${goodCount}/3 bonnes réponses`;

  document.getElementById('quiz-questions').style.display  = 'none';
  document.getElementById('quiz-correction').style.display = 'block';

  // Update score display
  const scoreVal = document.getElementById('quiz-score-val');
  const streakEl = document.getElementById('quiz-streak');
  if (scoreVal) scoreVal.textContent = _quizScore;
  if (streakEl) streakEl.textContent = _quizStreak > 1 ? `🔥 ×${_quizStreak}` : '';

  COUNTERS.insults_generated++;
  achievementCheck('first_quiz');
  if (goodCount === 3) achievementCheck('quiz_perfect');
  if (_quizStreak >= 5) achievementCheck('quiz_streak_5');
  saveState();
}

function getLabelForValue(q, v) {
  if (q === 'registre') {
    const m = { familier: '💬 Familier', neutre: '📖 Neutre', soutenu: '🎭 Soutenu', tres_litteraire: '✨ Très littéraire' };
    return m[v] || v;
  }
  if (q === 'theme') return themeLabel(v);
  return v;
}

function nextQuiz() {
  document.getElementById('quiz-correction').style.display = 'none';
  startQuiz();
}

// ─── STATS VIEW ───────────────────────────────────────
function renderStats() {
  const level = getLevelFromXP(STATE.xp);

  // Profile
  const levelBig   = document.getElementById('stats-level-big');
  const titleBadge = document.getElementById('stats-title-badge');
  const xpTotal    = document.getElementById('stats-xp-total');
  if (levelBig)   levelBig.textContent   = level;
  if (titleBadge) titleBadge.textContent  = getTitleFromLevel(level);
  if (xpTotal)    xpTotal.textContent    = STATE.xp;

  // Chiffres
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('stat-generated',   COUNTERS.insults_generated);
  set('stat-combos',      COUNTERS.combos_done);
  set('stat-lootboxes',   COUNTERS.lootboxes_opened);
  set('stat-collection',  STATE.collection.length);
  set('stat-quiz-score',  STATE.stats.quiz_score || 0);
  set('stat-quiz-streak', STATE.stats.quiz_best_streak || 0);

  // Niveau littéraire moyen
  const scores = STATE.stats.literary_scores;
  if (scores.length) {
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const cls = getLiteraryClass(avg);
    const avgNum   = document.getElementById('literary-avg-number');
    const avgLabel = document.getElementById('literary-avg-label');
    const avgFill  = document.getElementById('literary-avg-fill');
    if (avgNum)   { avgNum.textContent   = avg + '/100'; avgNum.style.color = cls.color; }
    if (avgLabel) avgLabel.textContent   = cls.label;
    if (avgFill)  { avgFill.style.width  = avg + '%'; avgFill.style.background = cls.color; }
  }

  // Répartition registres
  const regBars = document.getElementById('registre-bars');
  if (regBars) {
    const regs = STATE.stats.registres;
    const total = Object.values(regs).reduce((a, b) => a + b, 0) || 1;
    const regLabels = { familier: '💬 Familier', neutre: '📖 Neutre', soutenu: '🎭 Soutenu', tres_litteraire: '✨ Très littéraire' };
    const regColors = { familier: '#7f8c8d', neutre: '#3498db', soutenu: '#9b59b6', tres_litteraire: '#f39c12' };
    regBars.innerHTML = Object.entries(regs).map(([k, v]) => `
      <div class="stat-bar-row">
        <span class="stat-bar-label">${regLabels[k]}</span>
        <div class="stat-bar-wrap">
          <div class="stat-bar-fill" style="width:${Math.round(v/total*100)}%;background:${regColors[k]}"></div>
        </div>
        <span class="stat-bar-count">${v}</span>
      </div>
    `).join('');
  }

  // Figures
  const figBars = document.getElementById('figures-bars');
  if (figBars) {
    const figs   = STATE.stats.figures;
    const ftotal = Object.values(figs).reduce((a, b) => a + b, 0) || 1;
    const figColors = { Hyperbole: '#e74c3c', Métaphore: '#3498db', Ironie: '#2ecc71', Personnification: '#9b59b6', Antithèse: '#e67e22', Aucune: '#555' };
    figBars.innerHTML = Object.entries(figs)
      .sort(([,a],[,b]) => b - a)
      .map(([k, v]) => `
        <div class="stat-bar-row">
          <span class="stat-bar-label">${k}</span>
          <div class="stat-bar-wrap">
            <div class="stat-bar-fill" style="width:${Math.round(v/ftotal*100)}%;background:${figColors[k]||'#888'}"></div>
          </div>
          <span class="stat-bar-count">${v}</span>
        </div>
      `).join('');
  }

  // Thèmes
  const themeBars = document.getElementById('themes-bars');
  if (themeBars) {
    const themes = STATE.stats.themes;
    const ttotal = Object.values(themes).reduce((a, b) => a + b, 0) || 1;
    themeBars.innerHTML = Object.entries(themes)
      .sort(([,a],[,b]) => b - a)
      .slice(0, 8)
      .map(([k, v]) => `
        <div class="stat-bar-row">
          <span class="stat-bar-label">${themeLabel(k)}</span>
          <div class="stat-bar-wrap">
            <div class="stat-bar-fill" style="width:${Math.round(v/ttotal*100)}%;background:var(--accent2)"></div>
          </div>
          <span class="stat-bar-count">${v}</span>
        </div>
      `).join('');
  }
}

// ─── ACHIEVEMENTS ────────────────────────────────────
function achievementCheck(forceId) {
  const unlock = (id) => {
    if (STATE.achievements[id]) return;
    STATE.achievements[id] = true;
    const def = ACHIEVEMENTS_DEF.find(a => a.id === id);
    if (def) showAchievementPopup(def);
    renderAchievements();
    saveState();
  };

  if (forceId) { unlock(forceId); return; }

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
  if (STATE.profMode)                   unlock('prof_mode');

  if ((STATE.stats.figures.Hyperbole || 0) >= 5)  unlock('seen_hyperbole');
  if ((STATE.stats.figures.Ironie    || 0) >= 5)  unlock('seen_ironie');

  const collectedCats = [...new Set(STATE.collection.map(i => i.category))];
  if (JSON_FILES.map(f => f.category).filter(Boolean).every(c => collectedCats.includes(c))) unlock('all_themes');
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
  if (iconEl)  iconEl.textContent  = def.emoji;
  if (titleEl) titleEl.textContent = '🏅 ' + def.name;
  if (descEl)  descEl.textContent  = def.desc;
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
    enfantines_absurdes: 'theme-enfantin',   moyen_age:       'theme-medieval',
    renaissance_xviie:   'theme-renaissance', xixe_litterature:'theme-litteraire',
    intelligence:        'theme-intelligence', inutiles_faibles:'theme-inutile',
    hypocrisie:          'theme-hypocrisie',  relous:           'theme-relou',
    ridicule:            'theme-ridicule',    sales:            'theme-sale',
    tech:                'theme-tech',        punchlines:       'theme-punchline',
    renaissance:         'theme-renaissance', 'littéraire':     'theme-litteraire',
    inutile:             'theme-inutile',     punchline:        'theme-punchline',
    sale:                'theme-sale',        relou:            'theme-relou',
  };
  return map[category] || 'theme-default';
}

function themeLabel(category) {
  const map = {
    enfantines_absurdes: '🧸 Enfantin',   moyen_age:        '⚔️ Médiéval',
    renaissance_xviie:   '🎭 Renaissance', xixe_litterature: '📚 Littéraire',
    intelligence:        '🧠 Intelligence',inutiles_faibles:  '😴 Inutile',
    hypocrisie:          '🐍 Hypocrisie', relous:            '😤 Relou',
    ridicule:            '🎭 Ridicule',   sales:             '🧹 Sale',
    tech:                '💻 Tech',       punchlines:        '⚡ Punchline',
    renaissance:         '🎭 Renaissance','littéraire':      '📚 Littéraire',
    inutile:             '😴 Inutile',    punchline:         '⚡ Punchline',
    sale:                '🧹 Sale',       relou:             '😤 Relou',
  };
  return map[category] || category;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
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
            if (perm === 'granted') { showToast('✅ Notifications activées !'); scheduleNotification(); }
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
    new Notification('🎩 Insulte du jour', { body: `"${ins.name}" — ${ins.definition}` });
  }, Math.min(delay, 2147483647));
}

// ─── BOOT ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initApp);
