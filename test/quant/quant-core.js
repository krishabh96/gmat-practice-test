// ══════════════════════════════════════
// GMAT TEST CORE ENGINE
// Shared by all 30 sectional test pages
// Each page sets: SECTION, SECTIONAL_NUM, TOTAL_QS, SECTION_NAME
// ══════════════════════════════════════

// ── Supabase client ──
const _sb = supabase.createClient(SUPA_URL, SUPA_KEY);

// ── State ──
let currentUser = null;
let TEST = {
  pool: [],
  entries: [], idx: 0,
  secsLeft: 45 * 60,
  interval: null, qStart: null, sel: null,
  bookmarks: new Set(),
  isPaused: false,
  editEditsLeft: 3, editingIdx: -1, editSelLetter: null
};

// ── Adaptive Engine ──
const Adaptive = {
  diff: 'Medium', last2: [], used: new Set(),
  pools: { Easy: [], Medium: [], Hard: [] },

  init(qs) {
    const by = { Easy: [], Medium: [], Hard: [] };
    qs.forEach(q => by[q.difficulty] && by[q.difficulty].push(q));
    this.pools.Easy   = shuffle([...by.Easy]);
    this.pools.Medium = shuffle([...by.Medium]);
    this.pools.Hard   = shuffle([...by.Hard]);
    this.diff = 'Medium'; this.last2 = []; this.used = new Set();
  },

  update(r) {
    if(r === 'skip') return;
    this.last2.push(r);
    if(this.last2.length > 2) this.last2.shift();
    const l = this.last2;
    if(l.length === 2 && l.every(x => x === 'correct')) {
      if(this.diff === 'Easy')   this.diff = 'Medium';
      else if(this.diff === 'Medium') this.diff = 'Hard';
    } else if(l.length === 2 && l.every(x => x === 'wrong')) {
      if(this.diff === 'Hard')   this.diff = 'Medium';
      else if(this.diff === 'Medium') this.diff = 'Easy';
    }
  },

  next() {
    let q = this._pick(this.diff); if(q) return q;
    const fb = this.diff === 'Hard' ? ['Medium','Easy'] :
               this.diff === 'Easy' ? ['Medium','Hard'] : ['Hard','Easy'];
    for(const d of fb) { q = this._pick(d); if(q) return q; }
    return null;
  },

  _pick(d) {
    const a = this.pools[d].filter(q => !this.used.has(q.id));
    if(!a.length) return null;
    this.used.add(a[0].id);
    return a[0];
  }
};

// ── Auth ──
async function initAuth() {
  const { data: { session } } = await _sb.auth.getSession();
  if(!session) { window.location.href = '../../index.html'; return; }
  currentUser = session.user;
  g('auth-loading').style.display = 'none';
  showInstruction();
}

// ── Load questions from Supabase ──
async function loadPoolFromSupabase() {
  showLoadingState('Fetching your question pool...');

  const { data, error } = await _sb
    .from('questions')
    .select('*')
    .eq('section', SECTION)
    .eq('sectional', SECTIONAL_NUM)
    .order('difficulty');

  if(error) {
    console.error('Supabase fetch error:', error);
    return [];
  }

  // Normalise: options stored as jsonb in Supabase
  return (data || []).map(q => ({
    ...q,
    options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
  }));
}

function showLoadingState(msg) {
  const el = g('loading-msg');
  if(el) el.textContent = msg;
}

// ── Show Instruction ──
function showInstruction() {
  const instMap = {
    Q: {
      title: 'Quantitative Reasoning Instructions',
      body: `<p>You are about to start the <strong>Quantitative Reasoning</strong> section — <strong>Sectional Test ${SECTIONAL_NUM}</strong>.</p>
<p>You will have <strong>45.0 minutes</strong> to complete <strong>${TOTAL_QS} questions</strong>.</p>
<p>For each <strong>Problem Solving</strong> question, solve the problem and select the best answer choice.</p>
<p><u>Numbers:</u> All numbers used are real numbers.</p>
<p><u>Figures:</u> Drawn as accurately as possible unless noted otherwise.</p>
<p>The test adapts to your performance — answer correctly and difficulty increases, struggle and it adjusts down.</p>
<p>You may <strong>Bookmark</strong> questions to review at the end, and <strong>Pause</strong> the timer if needed.</p>
<p>At the end, if time remains, you may edit up to <strong>3 answers</strong>.</p>
<p>Click <strong>Next</strong> to begin.</p>`
    },
    V: {
      title: 'Verbal Reasoning Instructions',
      body: `<p>You are about to start the <strong>Verbal Reasoning</strong> section — <strong>Sectional Test ${SECTIONAL_NUM}</strong>.</p>
<p>You will have <strong>45.0 minutes</strong> to complete <strong>${TOTAL_QS} questions</strong>.</p>
<p>There are two types of questions: <strong>Critical Reasoning</strong> and <strong>Reading Comprehension</strong>.</p>
<p>For each question, select the best of the answer choices given.</p>
<p>The test adapts to your performance throughout the session.</p>
<p>At the end, if time remains, you may edit up to <strong>3 answers</strong>.</p>
<p>Click <strong>Next</strong> to begin.</p>`
    },
    D: {
      title: 'Data Insights Instructions',
      body: `<p>You are about to start the <strong>Data Insights</strong> section — <strong>Sectional Test ${SECTIONAL_NUM}</strong>.</p>
<p>You will have <strong>45.0 minutes</strong> to complete <strong>${TOTAL_QS} questions</strong>.</p>
<p>Question types include: <strong>Data Sufficiency</strong>, <strong>Multi-Source Reasoning</strong>, <strong>Table Analysis</strong>, <strong>Graphic Interpretation</strong>, and <strong>Two-Part Analysis</strong>.</p>
<p>The test adapts to your performance throughout the session.</p>
<p>At the end, if time remains, you may edit up to <strong>3 answers</strong>.</p>
<p>Click <strong>Next</strong> to begin.</p>`
    }
  };

  const inst = instMap[SECTION] || instMap.Q;
  g('inst-title').textContent = inst.title;
  g('inst-body').innerHTML = inst.body;
  showScreen('instruction');
}

// ── Start Test ──
async function startTest() {
  showScreen('loading');

  // Fetch pool from Supabase
  const pool = await loadPoolFromSupabase();

  if(!pool.length) {
    showScreen('instruction');
    alert(`No questions found for ${SECTION_NAME} Sectional ${SECTIONAL_NUM}.\n\nPlease add and assign questions via the Admin panel.`);
    return;
  }

  if(pool.length < 3) {
    showScreen('instruction');
    alert(`Only ${pool.length} question(s) found for this sectional. Please assign at least 3 questions via Admin → Sectionals.`);
    return;
  }

  console.log(`✅ Loaded ${pool.length} questions for ${SECTION_NAME} Sectional ${SECTIONAL_NUM}`);
  console.log(`   Easy: ${pool.filter(q=>q.difficulty==='Easy').length}, Medium: ${pool.filter(q=>q.difficulty==='Medium').length}, Hard: ${pool.filter(q=>q.difficulty==='Hard').length}`);

  TEST.pool = pool;
  Adaptive.init(pool);
  TEST.entries = []; TEST.idx = 0; TEST.secsLeft = 45 * 60; TEST.sel = null;
  TEST.bookmarks = new Set(); TEST.isPaused = false; TEST.editEditsLeft = 3;
  clearInterval(TEST.interval);

  const first = Adaptive.next();
  if(!first) { showScreen('instruction'); alert('Pool exhausted.'); return; }
  TEST.entries.push({ q: first, selected: null, result: null, time: 0, edited: false });

  showScreen('test');
  renderQuestion();
  startTimer();
}

// ── Question Render ──
function renderQuestion() {
  const e = TEST.entries[TEST.idx], q = e.q;
  TEST.sel = e.selected || null;
  TEST.qStart = Date.now();

  g('q-num-badge').textContent  = 'Q' + (TEST.idx + 1);
  g('q-of-label').textContent   = 'of ' + TOTAL_QS;
  g('q-pos-label').textContent  = 'Question ' + (TEST.idx + 1) + ' of ' + TOTAL_QS;
  g('progress-fill').style.width = (TEST.idx / TOTAL_QS * 100) + '%';
  g('q-text').textContent       = q.question;

  if(q.topic) g('q-topic').textContent = q.topic;

  // Bookmark state
  const bm = TEST.bookmarks.has(TEST.idx);
  g('bookmark-btn').className = 'bookmark-btn' + (bm ? ' bookmarked' : '');
  g('bookmark-icon').textContent = bm ? '★' : '☆';
  g('bookmark-label').textContent = bm ? 'Bookmarked' : 'Bookmark';

  // Options
  const ol = g('opts-list'); ol.innerHTML = '';
  ['A','B','C','D','E'].forEach(l => {
    if(!q.options[l]) return;
    const row = document.createElement('div');
    row.className = 'option-row' + (TEST.sel === l ? ' confirmed' : '');
    row.dataset.l = l;
    row.innerHTML = `<div class="option-circle"></div><span class="option-letter">${l}.</span><span class="option-text">${q.options[l]}</span>`;
    if(TEST.sel !== l) row.addEventListener('click', () => pickOption(l));
    ol.appendChild(row);
  });

  g('btn-next').disabled = !TEST.sel;
  renderBookmarkChips();
}

function pickOption(l) {
  TEST.sel = l;
  document.querySelectorAll('.option-row').forEach(r => {
    r.classList.toggle('selected', r.dataset.l === l);
    r.classList.remove('confirmed');
  });
  g('btn-next').disabled = false;
}

function renderBookmarkChips() {
  const wrap = g('bookmark-chips'); wrap.innerHTML = '';
  TEST.bookmarks.forEach(idx => {
    const chip = document.createElement('span');
    chip.className = 'bookmark-chip';
    chip.textContent = 'Q' + (idx + 1);
    wrap.appendChild(chip);
  });
}

function toggleBookmark() {
  if(TEST.bookmarks.has(TEST.idx)) TEST.bookmarks.delete(TEST.idx);
  else TEST.bookmarks.add(TEST.idx);
  renderQuestion();
}

// ── Confirm Next ──
function confirmNext() {
  if(!TEST.sel) return;
  const q = TEST.entries[TEST.idx].q;
  g('confirm-sel').textContent = 'Option ' + TEST.sel + ' — "' + q.options[TEST.sel].slice(0,60) + (q.options[TEST.sel].length > 60 ? '…' : '') + '"';
  g('confirm-dialog').classList.add('show');
}
function closeConfirm() { g('confirm-dialog').classList.remove('show'); }
function confirmYes()   { closeConfirm(); advanceQuestion(false); }

function skipQuestion() { g('skip-dialog').classList.add('show'); }
function closeSkip()    { g('skip-dialog').classList.remove('show'); }
function confirmSkip()  { closeSkip(); advanceQuestion(true); }

function advanceQuestion(skip = false) {
  const e = TEST.entries[TEST.idx];
  e.time = Math.round((Date.now() - TEST.qStart) / 1000);
  if(skip) {
    e.selected = null; e.result = 'skip'; Adaptive.update('skip');
  } else {
    e.selected = TEST.sel;
    e.result = TEST.sel === e.q.answer ? 'correct' : 'wrong';
    Adaptive.update(e.result);
  }

  TEST.idx++;
  if(TEST.idx >= TOTAL_QS) { endTest(); return; }

  const next = Adaptive.next();
  if(!next) { endTest(); return; }
  TEST.entries.push({ q: next, selected: null, result: null, time: 0, edited: false });
  TEST.sel = null;
  renderQuestion();
}

// ── Timer ──
function startTimer() {
  const el = g('test-timer');
  TEST.interval = setInterval(() => {
    if(TEST.isPaused) return;
    TEST.secsLeft--;
    const m = Math.floor(TEST.secsLeft / 60), s = TEST.secsLeft % 60;
    const str = m + ':' + String(s).padStart(2, '0');
    el.textContent = str;
    const et = g('edit-timer'); if(et) et.textContent = str;
    if(TEST.secsLeft <= 300) el.classList.add('urgent');
    if(TEST.secsLeft <= 0) { clearInterval(TEST.interval); endTest(); }
  }, 1000);
}

function togglePause() {
  TEST.isPaused = !TEST.isPaused;
  if(TEST.isPaused) {
    const m = Math.floor(TEST.secsLeft/60), s = TEST.secsLeft%60;
    g('pause-timer-display').textContent = m + ':' + String(s).padStart(2,'0');
    g('pause-overlay').classList.add('show');
  } else {
    g('pause-overlay').classList.remove('show');
  }
}

// ── End Test ──
function endTest() {
  clearInterval(TEST.interval);
  g('progress-fill').style.width = '100%';
  if(TEST.secsLeft > 30) showEditScreen();
  else submitFinal();
}

// ── Edit Answers ──
function showEditScreen() {
  showScreen('edit');
  updateEditCounter();
  renderEditTable();
  g('edit-q-panel').classList.remove('show');
}

function updateEditCounter() {
  g('edit-counter').textContent = 'Edits remaining: ' + TEST.editEditsLeft;
}

function renderEditTable() {
  const tbody = g('edit-tbody'); tbody.innerHTML = '';
  TEST.entries.forEach((e, i) => {
    const bm = TEST.bookmarks.has(i);
    const statusText = e.edited ? 'Edited' : bm ? 'Bookmarked' : e.result === 'skip' ? 'Skipped' : 'Answered';
    const statusClass = e.edited ? 'editing' : bm ? 'bookmarked' : e.result === 'skip' ? 'skipped' : 'answered';
    const short = e.q.question.replace(/\n/g,' ').slice(0,60) + (e.q.question.length > 60 ? '…' : '');
    const tr = document.createElement('tr');
    if(TEST.editingIdx === i) tr.classList.add('selected-for-edit');
    tr.innerHTML = `
      <td class="edit-row-num">${i+1}</td>
      <td>${short}</td>
      <td><strong>${e.selected || '—'}</strong></td>
      <td><span class="edit-status ${statusClass}">${statusText}</span></td>
      <td><span class="dpill ${e.q.difficulty}">${e.q.difficulty}</span></td>`;
    tr.addEventListener('click', () => openEditQ(i));
    tbody.appendChild(tr);
  });
}

function openEditQ(idx) {
  if(TEST.editEditsLeft <= 0 && TEST.editingIdx !== idx) {
    alert('No edits remaining. You have used all 3 edits.'); return;
  }
  TEST.editingIdx = idx;
  TEST.editSelLetter = TEST.entries[idx].selected;
  const e = TEST.entries[idx];
  g('edit-q-text').textContent = e.q.question;
  const opts = g('edit-opts'); opts.innerHTML = '';
  ['A','B','C','D','E'].forEach(l => {
    if(!e.q.options[l]) return;
    const row = document.createElement('div');
    row.className = 'option-row' + (TEST.editSelLetter === l ? ' confirmed' : '');
    row.dataset.l = l;
    row.innerHTML = `<div class="option-circle"></div><span class="option-letter">${l}.</span><span class="option-text">${e.q.options[l]}</span>`;
    row.addEventListener('click', () => {
      TEST.editSelLetter = l;
      opts.querySelectorAll('.option-row').forEach(r => {
        r.classList.toggle('selected', r.dataset.l === l);
        r.classList.remove('confirmed');
      });
    });
    opts.appendChild(row);
  });
  g('edit-q-panel').classList.add('show');
  g('edit-q-panel').scrollIntoView({ behavior:'smooth', block:'nearest' });
  renderEditTable();
}

function saveEdit() {
  if(TEST.editingIdx < 0) return;
  const e = TEST.entries[TEST.editingIdx];
  if(TEST.editSelLetter === e.selected) { cancelEdit(); return; }
  e.selected = TEST.editSelLetter;
  e.result = TEST.editSelLetter === e.q.answer ? 'correct' : 'wrong';
  if(!e.edited) { TEST.editEditsLeft--; e.edited = true; }
  TEST.editingIdx = -1; TEST.editSelLetter = null;
  updateEditCounter(); renderEditTable();
  g('edit-q-panel').classList.remove('show');
}

function cancelEdit() {
  TEST.editingIdx = -1; TEST.editSelLetter = null;
  renderEditTable(); g('edit-q-panel').classList.remove('show');
}

// ── Submit & Save Session ──
function submitFinal() {
  clearInterval(TEST.interval);
  saveSession();
  renderReport();
  showScreen('report');
}

// ─────────────────────────────────────────────────────────────
// GMAT FOCUS EDITION — IRT SCORING ENGINE
// Mimics GMAC's Item Response Theory adaptive algorithm
// Scale: 60–90 for all three sections
// ─────────────────────────────────────────────────────────────

function gmatIRTScore(entries, section) {
  // section: 'V' (23 Qs), 'Q' (21 Qs), 'D' (20 Qs)
  if(!entries || !entries.length) return 60;

  const total = entries.length;

  // ── SECTION CONFIG ──
  const cfg = {
    V: { base: 75, easyPenalty: 2.2,  medPenalty: 1.5,  hardPenalty: 0.9,  easyReward: 0.8, medReward: 1.2, hardReward: 1.8, unansweredFlat: 4.5, positionBias: 1.6 },
    Q: { base: 75, easyPenalty: 3.2,  medPenalty: 2.2,  hardPenalty: 0.8,  easyReward: 0.9, medReward: 1.4, hardReward: 2.1, unansweredFlat: 5.0, positionBias: 2.0 },
    D: { base: 74, easyPenalty: 1.8,  medPenalty: 1.3,  hardPenalty: 0.7,  easyReward: 0.7, medReward: 1.1, hardReward: 1.6, unansweredFlat: 4.0, positionBias: 1.4 },
  };
  const c = cfg[section] || cfg.V;

  let ability = c.base;          // current ability estimate (theta)
  let consecutiveWrong = 0;      // track consecutive wrong for exponential drop
  let consecutiveRight = 0;
  let unansweredCount  = 0;

  entries.forEach((e, idx) => {
    const pos      = idx + 1;
    const isEarly  = pos <= 7;
    const isLate   = pos > total * 0.67;
    const diff     = (e.q?.difficulty || 'Medium');
    const result   = e.result || 'skip';

    // Position bias multiplier — early questions matter more
    const posMult  = isEarly ? c.positionBias : isLate ? 1.1 : 1.0;

    // Difficulty weights
    const penaltyBase = diff==='Easy' ? c.easyPenalty : diff==='Hard' ? c.hardPenalty : c.medPenalty;
    const rewardBase  = diff==='Easy' ? c.easyReward  : diff==='Hard' ? c.hardReward  : c.medReward;

    if(result === 'skip' || result === 'unanswered') {
      // Unanswered: flat severe penalty
      ability -= c.unansweredFlat * posMult;
      unansweredCount++;
      consecutiveWrong++;
      consecutiveRight = 0;
    } else if(result === 'wrong') {
      // Base penalty × position × consecutive multiplier
      const consec = consecutiveWrong >= 2
        ? Math.pow(1.3, consecutiveWrong - 1)   // exponential for streaks
        : 1.0;
      ability -= penaltyBase * posMult * consec;
      consecutiveWrong++;
      consecutiveRight = 0;
    } else {
      // Correct
      // Bonus for recovering after wrong streak
      const recovery = consecutiveWrong >= 3 ? 0.7 : 1.0;
      ability += rewardBase * recovery;
      consecutiveRight++;
      consecutiveWrong = 0;
    }

    // Cap ability drift — can't go below floor or above ceiling mid-test
    ability = Math.max(60, Math.min(92, ability));
  });

  // Final scaling: map ability to 60–90 scale
  // Apply end-of-test unanswered flat deduction
  if(unansweredCount > 0){
    ability -= unansweredCount * 1.5; // additional late deduction on top
  }

  return Math.min(90, Math.max(60, Math.round(ability)));
}

function gmatPercentile(score, section){
  const tables={
    Q:{60:1,61:2,62:4,63:6,64:9,65:12,66:15,67:19,68:23,69:27,70:32,71:37,72:42,73:47,74:52,75:57,76:62,77:67,78:72,79:76,80:80,81:83,82:86,83:89,84:91,85:93,86:95,87:97,88:98,89:99,90:99},
    V:{60:1,61:2,62:3,63:5,64:7,65:9,66:11,67:14,68:17,69:20,70:24,71:28,72:32,73:36,74:41,75:46,76:51,77:56,78:60,79:65,80:69,81:73,82:77,83:80,84:83,85:86,86:89,87:91,88:93,89:96,90:99},
    D:{60:1,61:2,62:4,63:6,64:8,65:11,66:14,67:17,68:21,69:25,70:29,71:34,72:39,73:44,74:49,75:54,76:59,77:64,78:69,79:73,80:77,81:81,82:84,83:87,84:90,85:92,86:94,87:96,88:97,89:98,90:99},
  };
  const map=tables[section]||tables.Q;
  const keys=Object.keys(map).map(Number).sort((a,b)=>a-b);
  for(let i=keys.length-1;i>=0;i--) if(score>=keys[i]) return map[keys[i]];
  return 1;
}

function buildDiagnostic(entries, section){
  if(!entries||!entries.length) return null;
  const total=entries.length;
  const correct=entries.filter(e=>e.result==='correct').length;
  const skipped=entries.filter(e=>e.result==='skip').length;
  const earlyCorrect=entries.slice(0,7).filter(e=>e.result==='correct').length;
  const easyWrong=entries.filter(e=>e.q?.difficulty==='Easy'&&e.result!=='correct').length;
  let maxStreak=0,cur=0;
  entries.forEach(e=>{if(e.result!=='correct'){cur++;maxStreak=Math.max(maxStreak,cur);}else cur=0;});
  let curve='';
  if(7-earlyCorrect>=3) curve='Early struggles (Q1-7: '+earlyCorrect+'/7) constrained your difficulty trajectory. ';
  else if(earlyCorrect>=6) curve='Strong early performance (Q1-7: '+earlyCorrect+'/7) established a high-difficulty path. ';
  else curve='Mixed early performance (Q1-7: '+earlyCorrect+'/7) created a moderate trajectory. ';
  if(maxStreak>=3) curve+='A consecutive wrong streak of '+maxStreak+' triggered exponential IRT penalties.';
  else if(easyWrong>=2&&section==='Q') curve+='Missing '+easyWrong+' Easy Quant questions carries the heaviest IRT penalty — each Easy error lowers your ceiling more than multiple Hard misses.';
  else if(easyWrong>=2) curve+='Missing '+easyWrong+' Easy questions carries disproportionate penalties in the IRT model.';
  else if(correct/total>=0.78) curve+='Consistent accuracy ensured steady ability growth with minimal penalty compounding.';
  else curve+='Sporadic errors prevented sustained upward momentum in your ability estimate.';
  let pacing='';
  if(skipped>0) pacing=skipped+' unanswered question'+(skipped>1?'s':'')+' received a flat penalty worse than a wrong answer — always guess rather than leaving blank.';
  else if(maxStreak>=4&&entries.slice(-6).filter(e=>e.result!=='correct').length>=3) pacing='Late-game wrong streak suggests time pressure. Aim to finish 2-3 minutes early.';
  else pacing='No unanswered questions. Section pacing was well-managed.';
  return {curve,pacing};
}

function saveSession() {
  const es = TEST.entries;
  const correct = es.filter(e => e.result === 'correct').length;
  const total = es.length;
  const elapsed = 45*60 - TEST.secsLeft;
  const em = Math.floor(elapsed/60), esec = elapsed%60;
  const sessKey = 'gmat_sessions_' + (currentUser?.id || 'guest');
  const sessions = JSON.parse(localStorage.getItem(sessKey) || '[]');
  sessions.unshift({
    id: Date.now(), date: new Date().toISOString(),
    section: SECTION, testNum: SECTIONAL_NUM,
    entries: es.map(e => ({
      result: e.result, selected: e.selected, time: e.time, edited: e.edited,
      q: { question: e.q.question, answer: e.q.answer, difficulty: e.q.difficulty,
           topic: e.q.topic, options: e.q.options, explanation: e.q.explanation, passage: e.q.passage||null }
    })),
    correct, total,
    pct: total ? Math.round(correct/total*100) : 0,
    avgTime: total ? Math.round(es.reduce((s,e) => s+e.time, 0)/total) : 0,
    elapsed: em + 'm ' + esec + 's',
    markedGuess: TEST.markedGuess ? TEST.markedGuess.size : 0,
    markedGuessArr: TEST.markedGuess ? [...TEST.markedGuess] : []
  });
  localStorage.setItem(sessKey, JSON.stringify(sessions.slice(0, 50)));
}

// ── Report ──
function renderReport() {
  const es = TEST.entries;
  const correct = es.filter(e => e.result === 'correct').length;
  const wrong   = es.filter(e => e.result === 'wrong').length;
  const skip    = es.filter(e => e.result === 'skip').length;
  const edited  = es.filter(e => e.edited).length;
  const total   = es.length;
  const pct     = total ? Math.round(correct/total*100) : 0;
  const avgT    = total ? Math.round(es.reduce((s,e) => s+e.time,0)/total) : 0;
  const elapsed = 45*60 - TEST.secsLeft;
  const em = Math.floor(elapsed/60), esec = elapsed%60;

  g('report-sub').textContent = `${SECTION_NAME} Sectional ${SECTIONAL_NUM} · ${total} questions · ${em}m ${esec}s · ${edited} edited`;

  const irtScore   = gmatIRTScore(es, SECTION);
  const pctile     = gmatPercentile(irtScore, SECTION);
  const diagnostic = buildDiagnostic(es, SECTION);

  g('report-scorecard').innerHTML = `
    <div class="score-cell"><span class="score-val blue" style="font-size:28px;font-weight:900">${irtScore}</span><span class="score-lbl">Score (60-90)</span></div>
    <div class="score-cell"><span class="score-val" style="color:#7c3aed;font-size:20px">${pctile}th</span><span class="score-lbl">Percentile</span></div>
    <div class="score-cell"><span class="score-val green">${correct}</span><span class="score-lbl">Correct</span></div>
    <div class="score-cell"><span class="score-val red">${wrong}</span><span class="score-lbl">Wrong</span></div>
    <div class="score-cell"><span class="score-val amber">${avgT}s</span><span class="score-lbl">Avg/Q</span></div>`;

  const diagEl = g('report-diagnostic');
  if(diagEl && diagnostic){
    diagEl.innerHTML = '<div style="background:#fff;border:1px solid #ddd;border-radius:6px;padding:16px 20px;margin-bottom:20px;font-family:Arial,sans-serif">'
      + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:8px">Performance Curve Analysis</div>'
      + '<div style="font-size:13px;line-height:1.7;color:#333;margin-bottom:12px">' + diagnostic.curve + '</div>'
      + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:6px">Pacing Indicator</div>'
      + '<div style="font-size:13px;line-height:1.7;color:' + (diagnostic.pacing.startsWith('No unanswered')?'#2e7d32':'#c62828') + '">' + diagnostic.pacing + '</div>'
      + '</div>';
  }

  // Trail
  const trail = g('adaptive-trail'); trail.innerHTML = '';
  es.forEach((e, i) => {
    const d0 = e.q.difficulty[0];
    const cls = e.result === 'skip' ? 'sk' : e.result === 'correct' ? 'c'+d0 : 'w'+d0;
    const bm  = TEST.bookmarks.has(i) ? ' bm' : '';
    const dot = document.createElement('div');
    dot.className = `trail-dot ${cls}${bm}`;
    dot.textContent = d0;
    dot.title = `Q${i+1}: ${e.q.difficulty} · ${e.result}`;
    dot.addEventListener('click', () => {
      const row = document.getElementById('rrow-'+i);
      if(row) { row.scrollIntoView({behavior:'smooth',block:'center'}); row.click(); }
    });
    trail.appendChild(dot);
  });

  // Difficulty bars
  const diffWrap = g('diff-bars'); diffWrap.innerHTML = '';
  ['Easy','Medium','Hard'].forEach(diff => {
    const dqs = es.filter(e => e.q.difficulty === diff);
    const dc  = dqs.filter(e => e.result === 'correct').length;
    const dpct = dqs.length ? Math.round(dc/dqs.length*100) : 0;
    const col = dpct >= 70 ? '#2e7d32' : dpct >= 50 ? '#f57f17' : '#c62828';
    diffWrap.innerHTML += `<div class="diff-card">
      <div class="diff-card-title">${diff}</div>
      <div class="diff-pct" style="color:${col}">${dqs.length ? dpct+'%' : '—'}</div>
      <div class="diff-bar-wrap"><div class="diff-bar" style="width:${dpct}%;background:${col}"></div></div>
      <div class="diff-attempted">${dc}/${dqs.length} correct</div>
    </div>`;
  });

  // Review table
  const tbody = g('review-tbody'); tbody.innerHTML = '';
  es.forEach((e, i) => {
    const cls  = e.result === 'correct' ? 'row-c' : e.result === 'wrong' ? 'row-w' : 'row-s';
    const pill = e.result === 'correct' ? '<span class="rpill C">✓ Correct</span>' :
                 e.result === 'wrong'   ? '<span class="rpill W">✗ Wrong</span>' :
                                          '<span class="rpill S">— Skipped</span>';
    const bm   = TEST.bookmarks.has(i) ? '⭐ ' : '';
    const editB = e.edited ? ' <span style="font-size:10px;color:#005487;font-weight:700">[Edited]</span>' : '';
    const short = e.q.question.replace(/\n/g,' ').slice(0,55) + (e.q.question.length > 55 ? '…' : '');
    const tr = document.createElement('tr');
    tr.className = cls; tr.id = 'rrow-'+i;
    tr.innerHTML = `
      <td style="font-family:Arial,sans-serif;font-weight:700;color:#005487">${bm}${i+1}</td>
      <td style="font-size:13px">${short}${editB}</td>
      <td>${pill}</td>
      <td><span class="dpill ${e.q.difficulty}">${e.q.difficulty}</span></td>
      <td style="font-weight:700;color:#005487">${e.selected||'—'}</td>
      <td style="font-weight:700;color:#2e7d32">${e.q.answer}</td>
      <td style="font-family:Arial,sans-serif;color:#888">${e.time}s</td>`;

    const expTr = document.createElement('tr');
    expTr.style.display = 'none';
    const expTd = document.createElement('td');
    expTd.colSpan = 7; expTd.style.padding = '0';
    const expDiv = document.createElement('div');
    expDiv.className = 'exp-panel';
    const expQ = document.createElement('div'); expQ.className = 'exp-q'; expQ.textContent = e.q.question;
    const expOpts = document.createElement('div');
    ['A','B','C','D','E'].forEach(l => {
      if(!e.q.options[l]) return;
      const d = document.createElement('div');
      d.className = 'exp-opt' + (l === e.q.answer ? ' ca' : l === e.selected && l !== e.q.answer ? ' wa' : '');
      d.textContent = l + '. ' + e.q.options[l];
      expOpts.appendChild(d);
    });
    const expText = document.createElement('div'); expText.className = 'exp-text';
    expText.textContent = e.q.explanation ? 'Explanation: ' + e.q.explanation : 'The correct answer is ' + e.q.answer + '.';
    expDiv.appendChild(expQ); expDiv.appendChild(expOpts); expDiv.appendChild(expText);
    expTd.appendChild(expDiv); expTr.appendChild(expTd);

    let open = false;
    tr.addEventListener('click', () => {
      open = !open;
      expTr.style.display = open ? '' : 'none';
      expDiv.classList.toggle('show', open);
    });
    tbody.appendChild(tr); tbody.appendChild(expTr);
  });
}

// ── Utils ──
function showHelp()  { g('help-dialog').classList.add('show'); }
function closeHelp() { g('help-dialog').classList.remove('show'); }
function goBack()    { window.location.href = '../../dashboard.html'; }
const g = id => document.getElementById(id);
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  g('screen-' + name).classList.add('active');
  window.scrollTo(0, 0);
}
function shuffle(a) {
  const b = [...a];
  for(let i = b.length-1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [b[i],b[j]] = [b[j],b[i]];
  }
  return b;
}
document.addEventListener('keydown', e => {
  if(e.key === 'Escape') { closeConfirm(); closeHelp(); closeSkip(); if(TEST.isPaused) togglePause(); }
  if(e.key === 'Enter')  { if(g('confirm-dialog').classList.contains('show')) confirmYes(); }
});
