/* ═══════════════════════════════════════════════════
   INSULT ENGINE — app.js v5
   Quiz double-mode · Figures garanties · Score rewampé
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
  { file: 'insultes2.json',   category: null },
];

// ─── BARÈME MOT → SCORE ───────────────────────────────
const WORD_SCORES = {
  'brêle':15,'naze':15,'boulet':20,'glandeur':20,'abruti':25,'plouc':25,
  'tocard':25,'zigoto':29,'andouille':29,'bête':29,'crétin':29,'minus':29,
  'âne':35,'bouffon':35,'lavette':35,'pignouf':35,'trouillard':35,
  'incapable':45,'inutile':45,'mauviette':45,'raté':45,'imbécile':50,
  'mollusque':55,'vide':55,'misérable':60,'confus':60,'creux':60,
  'limité':60,'triste':60,'simplet':60,'benêt':60,'médiocre':65,
  'nigaud':65,'niais':65,'grotesque':70,'obtus':70,'borné':70,
  'inepte':70,'insensé':70,'pitoyable':70,'lamentable':70,'rustre':70,
  'hurluberlu':70,'niaisard':70,'inconséquent':70,'énergumène':75,
  'inconcevable':75,'vaniteux':75,'orgueilleux':75,'cucurbitacée':75,
  'vaurien':75,'sot':80,'fat':80,'présomptueux':80,'vil':80,'goujat':80,
  'outrecuidant':90,'olibrius':85,'malotru':85,'cuistre':85,
  'faquin':85,'gredin':85,'scélérat':90,'histrion':90,
};

// ─── BONUS LONGUEUR ───────────────────────────────────
function bonusLongueur(text) {
  const n = text.trim().split(/\s+/).length;
  if (n >= 4) return 5;
  if (n === 3) return 3;
  if (n === 2) return 2;
  return 0;
}

// ─── DETECT STYLE (garantit TOUJOURS une figure) ─────
// Logique : détection textuelle + fallback catégorie + dernier recours par longueur
function detectStyle(insult) {
  const text = insult.name || insult.text || '';
  const def  = insult.definition || '';
  const cat  = insult.category || '';
  const full = (text + ' ' + def).toLowerCase();
  const wc   = full.split(/\s+/).length;

  const figures = [];
  const explanations = [];

  // 1. Figure explicite dans le JSON (champ .figure, depuis insultes2.json)
  if (insult.figure && insult.figure !== 'Aucune') {
    figures.push(insult.figure);
    const expls = {
      'Comparaison':      'Rapprochement explicite entre deux éléments avec un marqueur.',
      'Métaphore':        'Image directe sans mot comparatif.',
      'Hyperbole':        'Exagération volontaire pour amplifier l\'effet.',
      'Ironie':           'Sens opposé aux mots employés.',
      'Personnification': 'Abstraction traitée comme un être vivant.',
      'Antithèse':        'Opposition de deux termes contraires.',
    };
    explanations.push(expls[insult.figure] || 'Figure de style identifiée.');
  }

  // 2. COMPARAISON — marqueurs explicites
  if (!figures.includes('Comparaison')) {
    const similes = ['comme un','comme une','comme le','comme la','comme les',
      'tel un','telle une','tel que','telle que','aussi que','autant que'];
    if (similes.some(m => full.includes(m))) {
      figures.push('Comparaison');
      explanations.push('Rapprochement explicite entre deux éléments avec un marqueur comparatif.');
    }
  }

  // 3. MÉTAPHORE — est un/une + verbes imagés
  if (!figures.includes('Métaphore') && !figures.includes('Comparaison')) {
    const metaM = ['est un ','est une ','est le ','est la ','n\'est qu\'','n\'est que'];
    const metaV = [' porte ',' fuit ',' refuse ',' étouffe ',' hante ',' habite ',
      ' ronge ',' coule ',' gèle ',' brûle ',' envahit '];
    if (wc > 4 && (metaM.some(m => full.includes(m)) || metaV.some(v => full.includes(v)))) {
      figures.push('Métaphore');
      explanations.push('Image directe sans mot comparatif explicite.');
    }
  }

  // 4. HYPERBOLE
  if (!figures.includes('Hyperbole')) {
    const hyp = ['infini','cosmique','galactique','absolu','extrême','incroyable',
      'monstrueux','gigantesque','immense','universel','mondial','éternel',
      'jamais','toujours','entier','total','pacifique','océan','orbite',
      'milliard','cube','intersidéral','abysses','sine die','démesurée',
      'perpétuel','sans fond','sans limite','illimitée','si totale','si vaste',
      'si profonde','si ancienne','si constante','si naturelle','si absolue'];
    if (hyp.some(w => full.includes(w))) {
      figures.push('Hyperbole');
      explanations.push('Exagération volontaire pour amplifier l\'effet.');
    }
  }

  // 5. IRONIE
  if (!figures.includes('Ironie')) {
    const iron = ['bravo','magnifique','génial','félicitations','brillant',
      'génie','remarquable','extraordinaire','très bien','certes','bien sûr',
      'naturellement','évidemment','heureuse surprise','presque classique',
      'vocation assumée','presque artistique','chef-d\'œuvre involontaire',
      'malgré eux','si joyeux de sa propre bêtise'];
    if (iron.some(w => full.includes(w))) {
      figures.push('Ironie');
      explanations.push('Mots positifs détournés pour exprimer le contraire.');
    }
  }

  // 6. PERSONNIFICATION
  if (!figures.includes('Personnification')) {
    const perso = ['qui parle','qui pleure','qui vit','qui pense','qui ressent',
      'qui souffre','qui rit','lui refuse','détourne les yeux','hésite à',
      'se sont croisés','ne se reverront','l\'anonymat','la compassion',
      'même le silence','même son ombre','la politesse'];
    if (perso.some(w => full.includes(w))) {
      figures.push('Personnification');
      explanations.push('Objet ou abstraction traité comme un être vivant.');
    }
  }

  // 7. ANTITHÈSE
  if (!figures.includes('Antithèse')) {
    const pairs = [
      ['lumière','ombre'],['brillant','vide'],['beau','laid'],['grand','petit'],
      ['ni ','ni '],['sans','avec'],['génie','vide'],['simple','absolu'],
      ['fort','faible'],['lumière','nuit'],['plein','creux']
    ];
    if (pairs.some(([a,b]) => full.includes(a) && full.includes(b))) {
      figures.push('Antithèse');
      explanations.push('Opposition de deux termes contraires pour créer un effet de contraste.');
    }
  }

  // ── FALLBACK : si rien détecté, on attribue selon la longueur du texte ──
  if (figures.length === 0) {
    const words = text.trim().split(/\s+/);
    if (words.length >= 4) {
      // Longue insulte → probablement métaphore implicite
      figures.push('Métaphore');
      explanations.push('Image implicite construite par l\'association d\'idées.');
    } else if (cat === 'renaissance_xviie' || cat === 'xixe_litterature' || cat === 'moyen_age') {
      figures.push('Antithèse');
      explanations.push('Contraste inhérent au registre littéraire de l\'époque.');
    } else if (cat === 'punchlines' || cat === 'tech') {
      figures.push('Hyperbole');
      explanations.push('Exagération caractéristique du registre punchline.');
    } else if (cat === 'ridicule' || cat === 'comique') {
      figures.push('Ironie');
      explanations.push('Sens second révélé par le contexte comique.');
    } else {
      // Dernier recours absolu : comparaison implicite
      figures.push('Comparaison');
      explanations.push('Rapprochement implicite entre la personne et le terme employé.');
    }
  }

  return { figures, explanations };
}

// ─── CALCUL SCORE LITTÉRAIRE ──────────────────────────
function calculateLiteraryLevel(insult) {
  const text = insult.name || insult.text || '';
  const def  = insult.definition || '';
  const cat  = insult.category || '';
  const full = (text + ' ' + def).toLowerCase();

  let score = 50;

  // Barème par mot
  for (const [word, pts] of Object.entries(WORD_SCORES)) {
    if (full.includes(word)) score += (pts - 50) * 0.5;
  }

  // Bonus longueur du terme
  score += bonusLongueur(text);

  // Bonus longueur de mot (max +10 par mot)
  [...new Set(full.split(/\s+/))].forEach(w => {
    if (w.length >= 6) score += Math.min(10, w.length / 2);
  });

  // Bonus thème élevé
  if (['renaissance_xviie','xixe_litterature','moyen_age','renaissance','littéraire'].includes(cat)) score += 12;

  // Bonus figures de style
  const { figures } = detectStyle(insult);
  score += figures.filter(f => f !== 'Aucune').length * 6;

  // Bonus figure explicite JSON
  if (insult.figure && insult.figure !== 'Aucune') score += 5;

  // Bonus définition longue
  if (def.split(/\s+/).length > 8) score += 5;

  // Pénalités
  ['nul','idiot','stupide','con','débile','lent'].forEach(w => { if (full.includes(w)) score -= 5; });

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getLiteraryClass(score) {
  if (score >= 81) return { label:'Très littéraire', key:'tres_litteraire', color:'#f39c12' };
  if (score >= 61) return { label:'Soutenu',          key:'soutenu',        color:'#9b59b6' };
  if (score >= 31) return { label:'Neutre',            key:'neutre',         color:'#3498db' };
  return               { label:'Familier',             key:'familier',       color:'#7f8c8d' };
}
function getRegistreFromScore(score) { return getLiteraryClass(score).key; }

// ─── XP ──────────────────────────────────────────────
function xpNeededForLevel(level) {
  let t = 0; for (let i = 0; i < level; i++) t += 5 + i * 3; return t;
}
function getLevelFromXP(xp) {
  let l = 0; while (xp >= xpNeededForLevel(l + 1)) l++; return l;
}
function getXPForCurrentLevel(xp) { return xp - xpNeededForLevel(getLevelFromXP(xp)); }
function getXPNeededForNextLevel(xp) { return 5 + getLevelFromXP(xp) * 3; }
function getTitleFromLevel(l) {
  if (l>=50) return 'Maître Rhéteur'; if (l>=30) return 'Académicien';
  if (l>=20) return 'Explorateur Littéraire'; if (l>=10) return 'Apprenti Linguiste';
  if (l>=5)  return 'Lecteur Curieux'; return 'Novice';
}

// ─── CONSTANTES ───────────────────────────────────────
const LOOTBOX_MAX      = 5;
const LOOTBOX_COOLDOWN = 4 * 60 * 60 * 1000;

// ─── STATE ───────────────────────────────────────────
let STATE = {
  insults: [], collection: [], xp: 0, achievements: {},
  lootbox: { count: 0, lastReset: null },
  lastRandomIndex: -1, lastComboIndexes: [],
  collectionOpen: true, profMode: false,
  stats: {
    registres: { familier:0, neutre:0, soutenu:0, tres_litteraire:0 },
    figures: {}, themes: {}, literary_scores: [],
    quiz_score: 0, quiz_best_streak: 0,
  }
};
let COUNTERS = { insults_generated:0, combos_done:0, lootboxes_opened:0, situations_done:0 };

// ─── ACHIEVEMENTS ────────────────────────────────────
const ACHIEVEMENTS_DEF = [
  { id:'first_insult',    emoji:'🎯', name:'Premier Trait',      desc:'1ère insulte générée' },
  { id:'ten_insults',     emoji:'🔥', name:'Orateur',            desc:'10 insultes générées' },
  { id:'first_combo',     emoji:'⚡', name:'Alchimiste',          desc:'1er combo réalisé' },
  { id:'five_combos',     emoji:'💥', name:'Maître Fusionneur',   desc:'5 combos réalisés' },
  { id:'situation',       emoji:'🎭', name:'Contextualisateur',  desc:'1er ciblage' },
  { id:'first_lootbox',   emoji:'🎁', name:'Déballeur',          desc:'1ère lootbox ouverte' },
  { id:'five_lootboxes',  emoji:'👑', name:'Collectionneur',     desc:'5 lootboxes ouvertes' },
  { id:'collection_start',emoji:'📦', name:'Archiviste',         desc:'1 insulte collectée' },
  { id:'collection_10',   emoji:'🏆', name:'Encyclopédiste',     desc:'10 insultes collectées' },
  { id:'legendary',       emoji:'✨', name:'Légendaire',          desc:'Rareté LEGENDARY obtenue' },
  { id:'chaos',           emoji:'🌀', name:'Chaos Agent',         desc:'Rareté CHAOS obtenue' },
  { id:'all_themes',      emoji:'🗂',  name:'Taxinomiste',        desc:'Tous les thèmes explorés' },
  { id:'first_quiz',      emoji:'🎓', name:'Premier Cours',      desc:'1er quiz complété' },
  { id:'quiz_perfect',    emoji:'💯', name:'Sans Faute',         desc:'Quiz parfait (3/3)' },
  { id:'quiz_streak_5',   emoji:'🔥', name:'Série de 5',         desc:'5 bonnes réponses de suite' },
  { id:'literary_high',   emoji:'📖', name:'Très Littéraire',    desc:'Score ≥ 80 obtenu' },
  { id:'prof_mode',       emoji:'👨‍🏫', name:'Mode Prof',          desc:'Mode prof activé' },
  { id:'seen_metaphore',  emoji:'🖼',  name:'Métaphoriste',       desc:'Métaphore vue 5 fois' },
  { id:'seen_ironie',     emoji:'😏', name:'Ironiste',           desc:'Ironie vue 5 fois' },
  { id:'seen_hyperbole',  emoji:'💫', name:'Hyperboliste',       desc:'Hyperbole vue 5 fois' },
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
  showDailyInsult();
}

// ─── DATA ────────────────────────────────────────────
async function loadData() {
  const results = await Promise.allSettled(
    JSON_FILES.map(({ file, category }) => fetchFile(file, category))
  );
  STATE.insults = [];
  let loaded = 0;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) {
      r.value.forEach(ins => {
        // Déduplication par nom (insensible à la casse)
        if (!STATE.insults.some(x => x.name.toLowerCase() === ins.name.toLowerCase())) {
          STATE.insults.push(ins);
        }
      });
      loaded++;
    } else {
      console.warn(`⚠️ Non chargé : ${JSON_FILES[i].file}`);
    }
  });
  const el = document.getElementById('list-count');
  if (el) el.textContent = STATE.insults.length;
  console.log(`✅ ${STATE.insults.length} insultes (${loaded}/${JSON_FILES.length} fichiers)`);
}

async function fetchFile(file, categoryOverride) {
  try {
    const res = await fetch(file);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const map = ins => ({
      name:       ins.name || ins.text || '?',
      definition: ins.definition || '',
      category:   categoryOverride || ins.theme || data.category || 'unknown',
      figure:     ins.figure || null,
    });
    if (data.insults && Array.isArray(data.insults)) return data.insults.map(map);
    if (Array.isArray(data)) return data.map(map);
    return [];
  } catch (e) { console.warn(`Erreur ${file}:`, e.message); return null; }
}

// ─── PERSISTENCE ─────────────────────────────────────
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
  } catch(e) { console.warn('localStorage:', e); }
}

function loadState() {
  try {
    STATE.xp           = parseInt(localStorage.getItem('ie_xp') || '0');
    STATE.collection   = JSON.parse(localStorage.getItem('ie_collection') || '[]');
    STATE.achievements = JSON.parse(localStorage.getItem('ie_achievements') || '{}');
    STATE.lootbox      = JSON.parse(localStorage.getItem('ie_lootbox') || '{"count":0,"lastReset":null}');
    COUNTERS           = JSON.parse(localStorage.getItem('ie_counters') || '{"insults_generated":0,"combos_done":0,"lootboxes_opened":0,"situations_done":0}');
    STATE.collectionOpen = localStorage.getItem('ie_col_open') !== '0';
    STATE.profMode     = localStorage.getItem('ie_prof') === '1';
    const ss           = localStorage.getItem('ie_stats');
    if (ss) STATE.stats = { ...STATE.stats, ...JSON.parse(ss) };
  } catch(e) {}
  if (STATE.lootbox.lastReset) {
    if (Date.now() - STATE.lootbox.lastReset > LOOTBOX_COOLDOWN) {
      STATE.lootbox.count = 0; STATE.lootbox.lastReset = Date.now(); saveState();
    }
  } else { STATE.lootbox.lastReset = Date.now(); saveState(); }
}

// ─── DAILY ───────────────────────────────────────────
function showDailyInsult() {
  if (!STATE.insults.length) { setTimeout(showDailyInsult, 500); return; }
  const today = new Date().toDateString();
  let daily;
  try {
    const p = JSON.parse(localStorage.getItem('ie_daily') || '{}');
    if (p.date === today) daily = p.insult;
  } catch(e) {}
  if (!daily) {
    const seed = today.split('').reduce((a,c) => a + c.charCodeAt(0), 0);
    daily = STATE.insults[seed % STATE.insults.length];
    localStorage.setItem('ie_daily', JSON.stringify({ date: today, insult: daily }));
  }
  const banner = document.getElementById('daily-banner');
  const textEl = document.getElementById('daily-text');
  const scoreEl= document.getElementById('daily-score');
  if (!banner) return;
  const lvl = calculateLiteraryLevel(daily);
  const cls = getLiteraryClass(lvl);
  if (textEl)  textEl.textContent  = daily.name;
  if (scoreEl) scoreEl.textContent = `📚 ${lvl}/100 — ${cls.label}`;
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

  bindBtn('btn-random',      randomInsult);
  bindBtn('btn-combo',       comboInsult);
  bindBtn('btn-situation',   situationEngine);
  bindBtn('btn-save-result', saveCurrentResult);
  bindBtn('btn-save-combo',  saveCurrentCombo);
  bindBtn('btn-open-lootbox',lootboxOpen);
  bindBtn('sort-btn',        toggleSort);
  bindBtn('btn-replay',      replayInsult);
  bindBtn('btn-prof-toggle', toggleProfMode);

  document.getElementById('situation-input')?.addEventListener('keyup', e => {
    if (e.key === 'Enter') situationEngine();
  });
  document.getElementById('search-input')?.addEventListener('input', filterList);
  document.getElementById('theme-filter')?.addEventListener('change', filterList);
  document.getElementById('level-filter')?.addEventListener('change', filterList);
  document.getElementById('collection-toggle')?.addEventListener('click', toggleCollection);

  // QUIZ — boutons de sélection de mode
  document.getElementById('btn-quiz-start-analyse')?.addEventListener('click', () => startQuiz('analyse'));
  document.getElementById('btn-quiz-start-def')?.addEventListener('click', () => startQuiz('definition'));

  // QUIZ — options cliquables (mode analyse)
  document.querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', () => selectAnalyseOption(btn));
  });

  // QUIZ — valider et suivant
  document.getElementById('btn-quiz-validate-analyse')?.addEventListener('click', validateAnalyse);
  document.getElementById('btn-quiz-validate-def')?.addEventListener('click', validateDefinition);
  document.getElementById('btn-quiz-next')?.addEventListener('click', nextQuestion);
  document.getElementById('btn-quiz-change-mode')?.addEventListener('click', returnToModeSelect);

  applyProfMode();
}

function bindBtn(id, fn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('click', () => { pulseBtn(el); fn(); });
}
function pulseBtn(el) {
  el.classList.remove('btn-pulse'); void el.offsetWidth; el.classList.add('btn-pulse');
  setTimeout(() => el.classList.remove('btn-pulse'), 400);
  if (navigator.vibrate) navigator.vibrate(30);
}
function switchView(id) {
  document.querySelectorAll('.view').forEach(v => { v.classList.remove('active'); v.style.display='none'; });
  const t = document.getElementById('view-' + id);
  if (!t) return;
  t.style.display = 'block'; t.classList.add('active');
  requestAnimationFrame(() => { t.style.opacity = '1'; });
}

// ─── PROF MODE ───────────────────────────────────────
function toggleProfMode() {
  STATE.profMode = !STATE.profMode; applyProfMode(); achievementCheck(); saveState();
  showToast(STATE.profMode ? '🎓 Mode prof — score ≥ 60 uniquement' : '🎓 Mode prof désactivé');
}
function applyProfMode() {
  const btn = document.getElementById('btn-prof-toggle');
  const hint= document.getElementById('prof-hint');
  if (!btn) return;
  btn.setAttribute('aria-pressed', STATE.profMode ? 'true' : 'false');
  btn.classList.toggle('prof-active', STATE.profMode);
  if (hint) hint.textContent = STATE.profMode ? 'Seules les insultes avec score ≥ 60' : '';
}
function getProfPool() {
  if (!STATE.profMode) return STATE.insults;
  return STATE.insults.filter(i => calculateLiteraryLevel(i) >= 60);
}

// ─── REPLAY ──────────────────────────────────────────
function replayInsult() {
  if (!_currentInsult) return;
  displayResult(document.getElementById('result-type')?.textContent||'INSULTE',
    _currentInsult.name, _currentInsult.definition, _currentInsult.category, _currentInsult);
}

// ─── GENERATOR ───────────────────────────────────────
let _currentInsult = null;
let _currentCombo  = null;

function randomInsult() {
  const pool = getProfPool();
  if (!pool.length) return;
  let idx;
  do { idx = Math.floor(Math.random() * pool.length); }
  while (idx === STATE.lastRandomIndex && pool.length > 1);
  STATE.lastRandomIndex = idx;
  const ins = pool[idx]; _currentInsult = ins;
  displayResult('INSULTE ALÉATOIRE', ins.name, ins.definition, ins.category, ins);
  hideCombo(); xpUpdate(2); COUNTERS.insults_generated++;
  trackInsultStats(ins); achievementCheck(); saveState();
}

function displayResult(type, name, definition, category, insultObj) {
  const card = document.getElementById('result-card');
  if (!card) return;
  card.classList.remove('revealing'); void card.offsetWidth; card.classList.add('revealing');
  card.dataset.loaded = 'true';
  const $ = id => document.getElementById(id);
  const t = $('result-type'); if (t) t.textContent = type;
  const i = $('result-insult'); if (i) i.textContent = name;
  const d = $('result-def'); if (d) d.textContent = definition;
  const th = $('result-theme');
  if (th) { th.textContent = themeLabel(category); th.className = 'result-theme ' + themeClass(category); }
  const sb = $('btn-save-result'); if (sb) sb.style.display = 'inline-block';
  const rb = $('btn-replay'); if (rb) rb.style.display = 'inline-block';
  showLinguisticAnalysis(insultObj || { name, definition, category });
}

function showLinguisticAnalysis(insult) {
  const el = document.getElementById('result-analysis');
  if (!el) return;
  const score = calculateLiteraryLevel(insult);
  const cls   = getLiteraryClass(score);
  const { figures, explanations } = detectStyle(insult);
  const sv = document.getElementById('analysis-score-value');
  const sc = document.getElementById('analysis-score-class');
  const sf = document.getElementById('analysis-score-fill');
  const sd = document.getElementById('analysis-details');
  if (sv) sv.textContent = score + '/100';
  if (sc) { sc.textContent = cls.label; sc.style.color = cls.color; }
  if (sf) { sf.style.width = score + '%'; sf.style.background = cls.color; }
  if (sd) sd.innerHTML = `
    <div class="analysis-row">
      <span class="analysis-icon">🎭</span>
      <span class="analysis-label">Figure${figures.length>1?'s':''} de style :</span>
      <span class="analysis-value">${figures.join(', ')}</span>
    </div>
    <div class="analysis-row analysis-expl">
      <span class="analysis-icon">💡</span>
      <span>${explanations.join(' ')}</span>
    </div>`;
  el.style.display = 'block';
  if (score >= 80) achievementCheck('literary_high');
}

function hideCombo() { const c=document.getElementById('combo-wrapper'); if(c) c.style.display='none'; }
function saveCurrentResult() { if(_currentInsult) addToCollection(_currentInsult,'common'); }

// ─── COMBO ───────────────────────────────────────────
function comboInsult() {
  const pool = getProfPool();
  if (pool.length < 2) return;
  let a, b;
  do { a=Math.floor(Math.random()*pool.length); b=Math.floor(Math.random()*pool.length); }
  while (a===b||(STATE.lastComboIndexes[0]===a&&STATE.lastComboIndexes[1]===b));
  STATE.lastComboIndexes=[a,b];
  const insA=pool[a], insB=pool[b];
  const combined=buildComboText(insA,insB);
  _currentCombo={name:combined.text,definition:combined.def,category:insA.category};
  const $=id=>document.getElementById(id);
  const setTxt=(id,v)=>{const e=$(id);if(e)e.textContent=v;};
  setTxt('combo-a',insA.name); setTxt('combo-b',insB.name);
  setTxt('combo-result-text',combined.text); setTxt('combo-result-def',combined.def);
  const sb=$('btn-save-result');if(sb)sb.style.display='none';
  const rb=$('btn-replay');if(rb)rb.style.display='none';
  const w=$('combo-wrapper');
  if(w){w.style.display='block';w.style.animation='none';void w.offsetWidth;w.style.animation='';}
  xpUpdate(5); COUNTERS.insults_generated++; COUNTERS.combos_done++;
  achievementCheck(); saveState();
}
function buildComboText(a,b) {
  const fns=[(x,y)=>`${x} & ${y}`,(x,y)=>`${x}-${y}`,(x,y)=>`Grand ${x} du ${y}`,
    (x,y)=>`${x} de pacotille à tête de ${y}`,(x,y)=>`Illustre ${x}, véritable ${y}`,
    (x,y)=>`${x} notoire, ${y} confirmé`,(x,y)=>`Seigneur ${x} et Baron ${y}`];
  const text=fns[Math.floor(Math.random()*fns.length)](a.name,b.name);
  const intros=['Hybride rare combinant ','Fusion lexicale réunissant ','Alliance redoutable : ',
    'Double malédiction : ','Assemblage d\'excellence — '];
  const def=intros[Math.floor(Math.random()*intros.length)]+a.definition.toLowerCase()+', et par-dessus tout '+b.definition.toLowerCase()+'.';
  return {text,def};
}
function saveCurrentCombo() { if(_currentCombo) addToCollection(_currentCombo,'combo'); }

// ─── SITUATION ───────────────────────────────────────
const SITUATION_MAP = [
  {keywords:['lent','lente','lenteur','traîne','tarde'],           categories:['inutiles_faibles','enfantines_absurdes']},
  {keywords:['bug','crash','erreur','code','programmer','tech'],    categories:['tech','punchlines']},
  {keywords:['nul','nulle','incompétent','inutile','incapable'],   categories:['inutiles_faibles','ridicule']},
  {keywords:['intelligent','génie','savant','surdoué','expert'],   categories:['intelligence','ridicule']},
  {keywords:['travail','boulot','boss','chef','réunion','collègue'],categories:['inutiles_faibles','relous','hypocrisie']},
  {keywords:['menteur','mensonge','trahi','faux','hypocrite'],     categories:['hypocrisie','moyen_age']},
  {keywords:['bavard','parle','bruit','crier','râle'],             categories:['relous','ridicule']},
  {keywords:['sale','porc','dégoûtant'],                           categories:['sales','enfantines_absurdes']},
  {keywords:['prétentieux','arrogant','snob','vanité'],            categories:['renaissance_xviie','ridicule']},
  {keywords:['lâche','peur','fuir','couard'],                      categories:['moyen_age','inutiles_faibles']},
  {keywords:['réseaux','instagram','tiktok','influenceur'],        categories:['tech','punchlines']},
  {keywords:['rien','fait rien','paresseux','fainéant'],           categories:['inutiles_faibles','relous']},
];
function situationEngine() {
  const input=(document.getElementById('situation-input')?.value||'').trim().toLowerCase();
  const pool=getProfPool(); if(!pool.length) return;
  let cats=[];
  if(input) for(const r of SITUATION_MAP) if(r.keywords.some(k=>input.includes(k))) cats=cats.concat(r.categories);
  let sub=cats.length>0?pool.filter(i=>cats.includes(i.category)):pool;
  if(!sub.length) sub=pool;
  const ins=sub[Math.floor(Math.random()*sub.length)]; _currentInsult=ins;
  displayResult(input?`SITUATION: "${input.slice(0,30)}"` : 'INSULTE ALÉATOIRE',
    ins.name,ins.definition,ins.category,ins);
  hideCombo(); xpUpdate(6); COUNTERS.insults_generated++; COUNTERS.situations_done++;
  trackInsultStats(ins); achievementCheck(); saveState();
}

// ─── STATS TRACKING ──────────────────────────────────
function trackInsultStats(ins) {
  const score=calculateLiteraryLevel(ins);
  const rk=getRegistreFromScore(score);
  if(STATE.stats.registres[rk]!==undefined) STATE.stats.registres[rk]++;
  const {figures}=detectStyle(ins);
  figures.forEach(f=>{STATE.stats.figures[f]=(STATE.stats.figures[f]||0)+1;});
  const cat=ins.category||'unknown';
  STATE.stats.themes[cat]=(STATE.stats.themes[cat]||0)+1;
  STATE.stats.literary_scores.push(score);
  if(STATE.stats.literary_scores.length>200) STATE.stats.literary_scores.shift();
}

// ─── LIST ─────────────────────────────────────────────
let sortDir='asc';
function renderList() {
  const grid=document.getElementById('list-grid'); if(!grid) return;
  const search=(document.getElementById('search-input')?.value||'').toLowerCase();
  const cat=document.getElementById('theme-filter')?.value||'';
  const lvlKey=document.getElementById('level-filter')?.value||'';
  let filtered=STATE.insults.filter(ins=>{
    const ms=!search||ins.name.toLowerCase().includes(search)||ins.definition.toLowerCase().includes(search);
    const mc=!cat||ins.category===cat;
    let ml=true; if(lvlKey){const sc=calculateLiteraryLevel(ins);ml=getLiteraryClass(sc).key===lvlKey;}
    return ms&&mc&&ml;
  });
  filtered.sort((a,b)=>{ const c=a.name.localeCompare(b.name,'fr'); return sortDir==='asc'?c:-c; });
  const ce=document.getElementById('list-count'); if(ce) ce.textContent=filtered.length;
  if(!filtered.length){grid.innerHTML='<div class="no-results">Aucune insulte trouvée</div>';return;}
  grid.innerHTML=filtered.map(ins=>{
    const sc=calculateLiteraryLevel(ins),cls=getLiteraryClass(sc);
    return `<div class="insult-card" onclick="quickView(${JSON.stringify(ins.name)})">
      <div class="card-word">${escHtml(ins.name)}</div>
      <div class="card-def">${escHtml(ins.definition)}</div>
      <div class="card-footer">
        <span class="card-theme ${themeClass(ins.category)}">${themeLabel(ins.category)}</span>
        <span class="card-literary-score" style="color:${cls.color}">${sc}/100</span>
      </div>
    </div>`;
  }).join('');
}
function filterList() { renderList(); }
function toggleSort() {
  sortDir=sortDir==='asc'?'desc':'asc';
  const b=document.getElementById('sort-btn');if(b) b.textContent=sortDir==='asc'?'A→Z':'Z→A';
  renderList();
}
function quickView(name) {
  const ins=STATE.insults.find(i=>i.name===name); if(!ins) return;
  switchView('generator');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view==='generator'));
  _currentInsult=ins; displayResult('DEPUIS L\'ENCYCLOPÉDIE',ins.name,ins.definition,ins.category,ins); hideCombo();
}

// ═══════════════════════════════════════════════════
// ─── QUIZ ─────────────────────────────────────────
// ═══════════════════════════════════════════════════
let _quizInsult      = null;
let _quizMode        = null;  // 'analyse' | 'definition' | 'trouve_terme'
let _quizAnswers     = {};    // pour mode analyse
let _quizDefChoices  = [];    // pour mode définition
let _quizSelectedDef = null;
let _quizStreak      = 0;
let _quizScore       = 0;

function showQuizBloc(id) {
  ['quiz-start','quiz-bloc-analyse','quiz-bloc-def','quiz-correction'].forEach(el => {
    const e=document.getElementById(el); if(e) e.style.display='none';
  });
  const t=document.getElementById(id); if(t) t.style.display='block';
}

function startQuiz(mode) {
  if (!STATE.insults.length) { showToast('⚠️ Chargement en cours...'); return; }
  _quizInsult  = STATE.insults[Math.floor(Math.random() * STATE.insults.length)];
  _quizAnswers = {};
  _quizSelectedDef = null;

  if (mode === 'analyse') {
    _quizMode = 'analyse';
    showQuizBloc('quiz-bloc-analyse');
    // Remplir l'insulte
    const textEl=document.getElementById('quiz-insult-text');
    const defEl =document.getElementById('quiz-insult-def');
    if (textEl) textEl.textContent=_quizInsult.name;
    if (defEl)  defEl.textContent =_quizInsult.definition;
    // Reset options
    document.querySelectorAll('.quiz-option').forEach(b=>{
      b.classList.remove('selected','correct','wrong'); b.disabled=false;
    });
    const vb=document.getElementById('btn-quiz-validate-analyse'); if(vb) vb.style.display='none';

  } else {
    // Alterner aléatoirement : terme→def ou def→terme
    _quizMode = Math.random() < 0.5 ? 'definition' : 'trouve_terme';
    showQuizBloc('quiz-bloc-def');

    const badge   =document.getElementById('quiz-def-badge');
    const termEl  =document.getElementById('quiz-def-term');
    const questionEl=document.getElementById('quiz-def-question');

    if (_quizMode === 'definition') {
      if (badge) badge.textContent='📖 TERME → DÉFINITION';
      if (questionEl) questionEl.textContent='Quelle est la bonne définition ?';
      if (termEl) { termEl.textContent=_quizInsult.name; termEl.className='quiz-insult-text'; }
    } else {
      if (badge) badge.textContent='📖 DÉFINITION → TERME';
      if (questionEl) questionEl.textContent='Quel terme correspond à cette définition ?';
      if (termEl) { termEl.textContent=_quizInsult.definition; termEl.className='quiz-insult-def'; }
    }

    // Générer 4 choix
    const pool=[...STATE.insults].filter(i=>i.name!==_quizInsult.name);
    const distractors=[];
    while(distractors.length<3&&pool.length>0) {
      const idx=Math.floor(Math.random()*pool.length);
      distractors.push(pool.splice(idx,1)[0]);
    }
    _quizDefChoices=[_quizInsult,...distractors].sort(()=>Math.random()-0.5);

    const optGrid=document.getElementById('quiz-def-options');
    if (optGrid) {
      optGrid.innerHTML=_quizDefChoices.map((ins,i)=>{
        const label=_quizMode==='definition' ? ins.definition : ins.name;
        return `<button class="quiz-option-def" data-idx="${i}">${escHtml(label)}</button>`;
      }).join('');
      // Attacher les listeners
      optGrid.querySelectorAll('.quiz-option-def').forEach(btn=>{
        btn.addEventListener('click', ()=>selectDefOption(btn));
      });
    }
    const vb=document.getElementById('btn-quiz-validate-def'); if(vb) vb.style.display='none';
  }
}

// ── Sélection mode analyse ────────────────────────────
function selectAnalyseOption(btn) {
  const q=btn.dataset.q, v=btn.dataset.v;
  document.querySelectorAll(`.quiz-option[data-q="${q}"]`).forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  _quizAnswers[q]=v;
  // Montrer valider quand les 3 questions sont répondues
  if (_quizAnswers.registre && _quizAnswers.figure && _quizAnswers.theme) {
    const vb=document.getElementById('btn-quiz-validate-analyse'); if(vb) vb.style.display='block';
  }
}

// ── Sélection mode définition ─────────────────────────
function selectDefOption(btn) {
  document.querySelectorAll('.quiz-option-def').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  _quizSelectedDef=parseInt(btn.dataset.idx);
  const vb=document.getElementById('btn-quiz-validate-def'); if(vb) vb.style.display='block';
}

// ── Valider mode analyse ──────────────────────────────
function validateAnalyse() {
  if (!_quizInsult) return;
  const score   =calculateLiteraryLevel(_quizInsult);
  const regKey  =getRegistreFromScore(score);
  const {figures}=detectStyle(_quizInsult);
  const mainFig =figures.filter(f=>f!=='Aucune')[0]||'Comparaison';
  const correct ={registre:regKey, figure:mainFig, theme:_quizInsult.category};

  let good=0; const lines=[];
  for (const [q,ans] of Object.entries(_quizAnswers)) {
    const isOk=ans===correct[q]; if(isOk) good++;
    document.querySelectorAll(`.quiz-option[data-q="${q}"]`).forEach(btn=>{
      btn.disabled=true;
      if(btn.dataset.v===correct[q]) btn.classList.add('correct');
      else if(btn.dataset.v===ans&&!isOk) btn.classList.add('wrong');
    });
    const qL={registre:'Registre',figure:'Figure de style',theme:'Thème'};
    lines.push(`<div class="correction-line ${isOk?'line-ok':'line-ko'}">
      <span>${isOk?'✅':'❌'} ${qL[q]} :</span>
      <strong>${getLabelForValue(q,correct[q])}</strong>
      ${!isOk?`<span class="your-ans">(vous : ${getLabelForValue(q,ans)})</span>`:''}
    </div>`);
  }
  finishQuiz(good,3,lines,'analyse');
}

// ── Valider mode définition ───────────────────────────
function validateDefinition() {
  if (_quizSelectedDef===null||!_quizInsult) return;
  const chosen=_quizDefChoices[_quizSelectedDef];
  const isOk=chosen.name===_quizInsult.name;
  const correctIdx=_quizDefChoices.findIndex(c=>c.name===_quizInsult.name);

  document.querySelectorAll('.quiz-option-def').forEach((btn,i)=>{
    btn.disabled=true;
    if(i===correctIdx) btn.classList.add('correct');
    else if(i===_quizSelectedDef&&!isOk) btn.classList.add('wrong');
  });

  const correctLabel=_quizMode==='definition'?_quizInsult.definition:_quizInsult.name;
  const chosenLabel =_quizMode==='definition'?chosen.definition:chosen.name;
  const lines=[`<div class="correction-line ${isOk?'line-ok':'line-ko'}">
    <span>${isOk?'✅':'❌'} Bonne réponse :</span>
    <strong>${escHtml(correctLabel)}</strong>
    ${!isOk?`<span class="your-ans">(vous : ${escHtml(chosenLabel)})</span>`:''}
  </div>`];
  finishQuiz(isOk?1:0,1,lines,'definition');
}

// ── Finaliser quiz ────────────────────────────────────
function finishQuiz(good, max, lines, mode) {
  const xpGained=good*8;
  if(good===max) _quizStreak++; else _quizStreak=0;
  _quizScore+=good;
  STATE.stats.quiz_score=_quizScore;
  if(_quizStreak>STATE.stats.quiz_best_streak) STATE.stats.quiz_best_streak=_quizStreak;

  xpUpdate(xpGained);

  const cb=document.getElementById('correction-body');
  const cx=document.getElementById('correction-xp');
  const streak=_quizStreak>1?` 🔥 Série de ${_quizStreak} !`:'';
  if(cb) cb.innerHTML=lines.join('');
  if(cx) cx.textContent=`+${xpGained} XP${streak} — ${good}/${max} bonne${good>1?'s':''} réponse${good>1?'s':''}`;

  showQuizBloc('quiz-correction');

  const sv=document.getElementById('quiz-score-val'); if(sv) sv.textContent=_quizScore;
  const se=document.getElementById('quiz-streak'); if(se) se.textContent=_quizStreak>1?`🔥 ×${_quizStreak}`:'';

  COUNTERS.insults_generated++;
  if(_quizScore>=1) achievementCheck('first_quiz');
  if(good===max&&max>=3) achievementCheck('quiz_perfect');
  if(_quizStreak>=5) achievementCheck('quiz_streak_5');
  trackInsultStats(_quizInsult);
  saveState();
}

// ── Navigation quiz ───────────────────────────────────
function nextQuestion() {
  // Relancer dans le même mode
  startQuiz(_quizMode==='analyse'?'analyse':'definition');
}
function returnToModeSelect() {
  showQuizBloc('quiz-start');
}

function getLabelForValue(q, v) {
  if (q==='registre') return {familier:'💬 Familier',neutre:'📖 Neutre',soutenu:'🎭 Soutenu',tres_litteraire:'✨ Très littéraire'}[v]||v;
  if (q==='theme') return themeLabel(v);
  return v;
}

// ─── LOOTBOX ─────────────────────────────────────────
const RARITIES=[
  {id:'rare',label:'★ RARE',weight:50,cssClass:'rarity-rare'},
  {id:'epic',label:'★★ ÉPIQUE',weight:30,cssClass:'rarity-epic'},
  {id:'legendary',label:'★★★ LÉGENDAIRE',weight:15,cssClass:'rarity-legendary'},
  {id:'chaos',label:'☠ CHAOS',weight:5,cssClass:'rarity-chaos'},
];
const RARITY_COLORS={rare:'#3498db',epic:'#c0392b',legendary:'#f39c12',chaos:'#8b00ff'};
const RARITY_VIBRATE={rare:[40],epic:[60,30,60],legendary:[80,40,80,40,120],chaos:[30,20,30,20,30,20,200]};

function pickRarity(){
  const t=RARITIES.reduce((s,r)=>s+r.weight,0);let roll=Math.random()*t;
  for(const r of RARITIES){roll-=r.weight;if(roll<=0) return r;} return RARITIES[0];
}

let _lootboxAnimating=false;
function lootboxOpen(){
  if(_lootboxAnimating) return;
  if(STATE.lootbox.count>=LOOTBOX_MAX){
    const left=LOOTBOX_COOLDOWN-(Date.now()-STATE.lootbox.lastReset);
    showToast(`⏳ Recharge dans ${Math.floor(left/3600000)}h${Math.floor((left%3600000)/60000)}m`);
    return;
  }
  if(!STATE.insults.length) return;
  _lootboxAnimating=true;
  const box=document.getElementById('lootbox-box');
  const rwEl=document.getElementById('lootbox-reward');
  const btn=document.getElementById('btn-open-lootbox');
  if(!box||!rwEl||!btn){_lootboxAnimating=false;return;}
  btn.disabled=true;rwEl.style.display='none';box.style.display='flex';
  const rarity=pickRarity();
  const insult=STATE.insults[Math.floor(Math.random()*STATE.insults.length)];
  if(navigator.vibrate) navigator.vibrate(50);
  box.className='lootbox-box shaking';
  setTimeout(()=>{
    box.className='lootbox-box opening';
    const flash=document.createElement('div');flash.className='flash-overlay';
    document.body.appendChild(flash);setTimeout(()=>flash.remove(),400);
    setTimeout(()=>{
      box.style.display='none';spawnParticles(rarity.id);
      if(navigator.vibrate) navigator.vibrate(RARITY_VIBRATE[rarity.id]||[40]);
      rwEl.style.display='block';rwEl.className='lootbox-reward '+rarity.cssClass;
      const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
      set('reward-rarity',rarity.label);set('reward-insult',insult.name);set('reward-def',insult.definition);
      const the=document.getElementById('reward-theme');
      if(the){the.textContent=themeLabel(insult.category);the.className='reward-theme '+themeClass(insult.category);}
      STATE.lootbox.count++;if(!STATE.lootbox.lastReset)STATE.lootbox.lastReset=Date.now();
      COUNTERS.lootboxes_opened++;
      addToCollection(insult,rarity.id);xpUpdate(50);achievementCheck();updateLootboxCounter();saveState();
      btn.disabled=false;_lootboxAnimating=false;
      setTimeout(()=>{box.className='lootbox-box';box.style.display='flex';rwEl.style.display='none';},6000);
    },600);
  },500);
}

function spawnParticles(rarityId){
  const c=document.getElementById('particles');if(!c) return;c.innerHTML='';
  const color=RARITY_COLORS[rarityId]||'#c9a96e';
  const count=rarityId==='legendary'?40:rarityId==='chaos'?32:rarityId==='epic'?24:16;
  for(let i=0;i<count;i++){
    const p=document.createElement('div');p.className='particle';
    const angle=Math.random()*Math.PI*2,dist=80+Math.random()*140;
    const dur=(0.6+Math.random()*0.7).toFixed(2)+'s',delay=(Math.random()*0.35).toFixed(2)+'s';
    p.style.cssText=`background:${color};left:calc(50% - 3px);top:50%;`;
    p.style.setProperty('--tx',(Math.cos(angle)*dist)+'px');
    p.style.setProperty('--ty',(Math.sin(angle)*dist-50)+'px');
    p.style.setProperty('--dur',dur);p.style.setProperty('--delay',delay);
    c.appendChild(p);
    requestAnimationFrame(()=>{p.style.animation=`particleBurst ${dur} ${delay} ease-out forwards`;});
  }
}

let _timerInterval=null;
function startLootboxTimer(){
  clearInterval(_timerInterval);_timerInterval=setInterval(tickLootboxTimer,10000);tickLootboxTimer();
}
function tickLootboxTimer(){
  updateLootboxCounter();
  if(STATE.lootbox.count>=LOOTBOX_MAX&&STATE.lootbox.lastReset&&Date.now()-STATE.lootbox.lastReset>LOOTBOX_COOLDOWN){
    STATE.lootbox.count=0;STATE.lootbox.lastReset=Date.now();saveState();updateLootboxCounter();
    showToast('🎁 Vos lootboxes sont rechargées !');
  }
}
function updateLootboxCounter(){
  const rem=Math.max(0,LOOTBOX_MAX-STATE.lootbox.count);
  const el=document.getElementById('lootbox-remaining');
  const btn=document.getElementById('btn-open-lootbox');
  const hint=document.getElementById('lootbox-hint');
  const timer=document.getElementById('lootbox-timer');
  if(el) el.textContent=rem;
  if(rem===0){
    if(btn) btn.disabled=true;if(hint) hint.textContent='Recharge en cours...';
    if(timer&&STATE.lootbox.lastReset){
      const left=Math.max(0,LOOTBOX_COOLDOWN-(Date.now()-STATE.lootbox.lastReset));
      const h=Math.floor(left/3600000),m=Math.floor((left%3600000)/60000),s=Math.floor((left%60000)/1000);
      timer.textContent=` — ${h>0?h+'h':''}${m}m${s}s`;
    }
  } else {
    if(btn) btn.disabled=false;
    if(hint) hint.textContent=`${rem} ouverture${rem>1?'s':''} disponible${rem>1?'s':''}`;
    if(timer) timer.textContent='';
  }
}

// ─── COLLECTION ──────────────────────────────────────
function addToCollection(insult,rarity){
  if(!insult||!insult.name) return;
  if(STATE.collection.some(i=>i.name===insult.name)){showToast('Déjà dans la collection');return;}
  STATE.collection.push({name:insult.name,definition:insult.definition,category:insult.category,
    rarity:typeof rarity==='string'?rarity:'common',addedAt:Date.now()});
  saveState();renderCollection();achievementCheck();
  showToast(`📦 "${insult.name}" ajouté`);
}
function renderCollection(){
  const grid=document.getElementById('collection-grid');
  const count=document.getElementById('collection-count');
  if(count) count.textContent=STATE.collection.length;
  if(!grid) return;
  if(!STATE.collection.length){
    grid.innerHTML='<p class="collection-empty">Ouvrez des lootboxes pour commencer...</p>';
    applyCollectionState();return;
  }
  const sorted=[...STATE.collection].sort((a,b)=>b.addedAt-a.addedAt);
  grid.innerHTML=sorted.map(item=>`<div class="collection-item ci-${item.rarity}">
    <div class="collection-item-rarity"></div>
    <div class="ci-name">${escHtml(item.name)}</div>
    <div class="ci-def">${escHtml(item.definition)}</div>
  </div>`).join('');
  applyCollectionState();
}
function toggleCollection(){STATE.collectionOpen=!STATE.collectionOpen;applyCollectionState();saveState();}
function applyCollectionState(){
  const grid=document.getElementById('collection-grid');
  const arrow=document.getElementById('toggle-arrow');
  const tog=document.getElementById('collection-toggle');
  if(!grid) return;
  grid.style.display=STATE.collectionOpen?'grid':'none';
  if(arrow) arrow.textContent=STATE.collectionOpen?'▲':'▼';
  if(tog) tog.setAttribute('aria-expanded',STATE.collectionOpen?'true':'false');
}

// ─── XP ──────────────────────────────────────────────
function xpUpdate(amount){
  const prev=getLevelFromXP(STATE.xp); STATE.xp+=amount; const next=getLevelFromXP(STATE.xp);
  updateXPUI();
  if(next>prev){showLevelUp(next);if(navigator.vibrate)navigator.vibrate([80,40,80]);}
}
function updateXPUI(){
  const level=getLevelFromXP(STATE.xp);
  const cur=getXPForCurrentLevel(STATE.xp);
  const need=getXPNeededForNextLevel(STATE.xp);
  const pct=Math.min(100,(cur/need)*100);
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  set('xp-level',level);set('nav-level',level);set('xp-current',STATE.xp);set('xp-next',xpNeededForLevel(level+1));
  const fill=document.getElementById('xp-fill');if(fill) fill.style.width=pct+'%';
  const mini=document.getElementById('xp-fill-mini');if(mini) mini.style.width=pct+'%';
}
function showLevelUp(level){
  const p=document.getElementById('levelup-popup');const n=document.getElementById('levelup-number');
  if(!p||!n) return;n.textContent=level;p.style.display='flex';p.classList.add('show');
  setTimeout(()=>{p.classList.remove('show');setTimeout(()=>{p.style.display='none';},500);},2500);
}

// ─── ACHIEVEMENTS ────────────────────────────────────
function achievementCheck(forceId){
  const unlock=id=>{
    if(STATE.achievements[id]) return;
    STATE.achievements[id]=true;
    const def=ACHIEVEMENTS_DEF.find(a=>a.id===id);
    if(def) showAchievementPopup(def);
    renderAchievements();saveState();
  };
  if(forceId){unlock(forceId);return;}
  if(COUNTERS.insults_generated>=1)  unlock('first_insult');
  if(COUNTERS.insults_generated>=10) unlock('ten_insults');
  if(COUNTERS.combos_done>=1)        unlock('first_combo');
  if(COUNTERS.combos_done>=5)        unlock('five_combos');
  if(COUNTERS.situations_done>=1)    unlock('situation');
  if(COUNTERS.lootboxes_opened>=1)   unlock('first_lootbox');
  if(COUNTERS.lootboxes_opened>=5)   unlock('five_lootboxes');
  if(STATE.collection.length>=1)     unlock('collection_start');
  if(STATE.collection.length>=10)    unlock('collection_10');
  if(STATE.collection.some(i=>i.rarity==='legendary')) unlock('legendary');
  if(STATE.collection.some(i=>i.rarity==='chaos'))     unlock('chaos');
  if(STATE.profMode)                 unlock('prof_mode');
  if((STATE.stats.figures?.Hyperbole||0)>=5)  unlock('seen_hyperbole');
  if((STATE.stats.figures?.Ironie||0)>=5)     unlock('seen_ironie');
  if((STATE.stats.figures?.Métaphore||0)>=5)  unlock('seen_metaphore');
  const cats=[...new Set(STATE.collection.map(i=>i.category))];
  if(JSON_FILES.map(f=>f.category).filter(Boolean).every(c=>cats.includes(c))) unlock('all_themes');
}
function renderAchievements(){
  const grid=document.getElementById('achievements-grid');if(!grid) return;
  grid.innerHTML=ACHIEVEMENTS_DEF.map(ach=>{
    const u=!!STATE.achievements[ach.id];
    return `<div class="achievement-badge ${u?'unlocked':'locked'}">
      <span class="ach-emoji">${ach.emoji}</span>
      <div class="ach-info"><div class="ach-name">${escHtml(ach.name)}</div><div class="ach-hint">${escHtml(ach.desc)}</div></div>
    </div>`;
  }).join('');
}

// ─── STATS VIEW ───────────────────────────────────────
function renderStats(){
  const level=getLevelFromXP(STATE.xp);
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  set('stats-level-big',level);set('stats-title-badge',getTitleFromLevel(level));set('stats-xp-total',STATE.xp);
  set('stat-generated',COUNTERS.insults_generated);set('stat-combos',COUNTERS.combos_done);
  set('stat-lootboxes',COUNTERS.lootboxes_opened);set('stat-collection',STATE.collection.length);
  set('stat-quiz-score',STATE.stats.quiz_score||0);set('stat-quiz-streak',STATE.stats.quiz_best_streak||0);
  const scores=STATE.stats.literary_scores;
  if(scores.length){
    const avg=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
    const cls=getLiteraryClass(avg);
    const an=document.getElementById('literary-avg-number');
    const al=document.getElementById('literary-avg-label');
    const af=document.getElementById('literary-avg-fill');
    if(an){an.textContent=avg+'/100';an.style.color=cls.color;}
    if(al) al.textContent=cls.label;
    if(af){af.style.width=avg+'%';af.style.background=cls.color;}
  }
  const bars=(elId,data,colors)=>{
    const el=document.getElementById(elId);if(!el) return;
    const total=Object.values(data).reduce((a,b)=>a+b,0)||1;
    el.innerHTML=Object.entries(data).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,8)
      .map(([k,v])=>`<div class="stat-bar-row">
        <span class="stat-bar-label">${escHtml(k)}</span>
        <div class="stat-bar-wrap"><div class="stat-bar-fill" style="width:${Math.round(v/total*100)}%;background:${colors?.[k]||'var(--accent2)'}"></div></div>
        <span class="stat-bar-count">${v}</span>
      </div>`).join('');
  };
  const regC={familier:'#7f8c8d',neutre:'#3498db',soutenu:'#9b59b6',tres_litteraire:'#f39c12'};
  const figC={Comparaison:'#2ecc71',Métaphore:'#3498db',Hyperbole:'#e74c3c',Ironie:'#f39c12',Personnification:'#9b59b6',Antithèse:'#e67e22'};
  bars('registre-bars',STATE.stats.registres,regC);
  bars('figures-bars',STATE.stats.figures,figC);
  bars('themes-bars',STATE.stats.themes,null);
}

// ─── UI HELPERS ──────────────────────────────────────
let toastTimer;
function showToast(msg){
  const t=document.getElementById('toast');if(!t) return;
  t.textContent=msg;t.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2800);
}
let achTimer;
function showAchievementPopup(def){
  const p=document.getElementById('achievement-popup');if(!p) return;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  set('ach-icon',def.emoji);set('ach-title','🏅 '+def.name);set('ach-desc',def.desc);
  p.style.display='flex';p.classList.add('show');
  clearTimeout(achTimer);
  achTimer=setTimeout(()=>{p.classList.remove('show');setTimeout(()=>{p.style.display='none';},350);},3500);
}

// ─── THEMES ──────────────────────────────────────────
function themeClass(cat){
  const m={
    enfantines_absurdes:'theme-enfantin',moyen_age:'theme-medieval',
    renaissance_xviie:'theme-renaissance',xixe_litterature:'theme-litteraire',
    intelligence:'theme-intelligence',inutiles_faibles:'theme-inutile',
    hypocrisie:'theme-hypocrisie',relous:'theme-relou',
    ridicule:'theme-ridicule',sales:'theme-sale',
    tech:'theme-tech',punchlines:'theme-punchline',
    renaissance:'theme-renaissance','littéraire':'theme-litteraire',
    inutile:'theme-inutile',punchline:'theme-punchline',
    sale:'theme-sale',relou:'theme-relou',
    familier:'theme-enfantin',expression:'theme-litteraire',comique:'theme-ridicule',
  };
  return m[cat]||'theme-default';
}
function themeLabel(cat){
  const m={
    enfantines_absurdes:'🧸 Enfantin',moyen_age:'⚔️ Médiéval',
    renaissance_xviie:'🎭 Renaissance',xixe_litterature:'📚 Littéraire',
    intelligence:'🧠 Intelligence',inutiles_faibles:'😴 Inutile',
    hypocrisie:'🐍 Hypocrisie',relous:'😤 Relou',
    ridicule:'🎭 Ridicule',sales:'🧹 Sale',tech:'💻 Tech',punchlines:'⚡ Punchline',
    renaissance:'🎭 Renaissance','littéraire':'📚 Littéraire',
    inutile:'😴 Inutile',punchline:'⚡ Punchline',sale:'🧹 Sale',relou:'😤 Relou',
    familier:'💬 Familier',expression:'🗣️ Expression',comique:'😄 Comique',
  };
  return m[cat]||cat;
}
function escHtml(str){
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// ─── NOTIFICATIONS ───────────────────────────────────
function setupNotificationOffer(){
  if(localStorage.getItem('ie_notif_asked')) return;
  if(!('Notification' in window)) return;
  setTimeout(()=>{
    if(Notification.permission==='default'){
      showToast('🔔 Activez les notifs pour l\'insulte du jour !');
      setTimeout(()=>{
        if(confirm('🎩 INSULT ENGINE\nRecevoir une insulte du jour ?\n(Optionnel)')){
          Notification.requestPermission().then(p=>{
            if(p==='granted'){showToast('✅ Activées !');scheduleNotification();}
          });
        }
        localStorage.setItem('ie_notif_asked','1');
      },1200);
    }
  },3000);
}
function scheduleNotification(){
  if(Notification.permission!=='granted'||!STATE.insults.length) return;
  let delay=new Date().setHours(9,0,0,0)-Date.now();
  if(delay<=0) delay+=86400000;
  setTimeout(()=>{
    const ins=STATE.insults[Math.floor(Math.random()*STATE.insults.length)];
    new Notification('🎩 Insulte du jour',{body:`"${ins.name}" — ${ins.definition}`});
  },Math.min(delay,2147483647));
}

document.addEventListener('DOMContentLoaded', initApp);
