const _sb = supabase.createClient(SUPA_URL, SUPA_KEY);
let currentUser = null;
const Q_TYPE = { CR:'CR', RC:'RC' };

// ── State ──
let TEST = {
  queue:[], entries:[], idx:0,
  secsLeft:45*60, interval:null, qStart:null, sel:null,
  savedForLater:new Set(), markedGuess:new Set(),
  isPaused:false, editEditsLeft:3, editingIdx:-1, editSelLetter:null
};

const g = id => document.getElementById(id);

// ── Auth ──
async function initAuth(){
  const loader = document.getElementById('auth-loading');
  const rootUrl = window.location.origin + '/';

  // Show what's happening in the loader text
  const span = loader ? loader.querySelector('span') : null;
  if(span) span.textContent = 'Checking session...';

  // Safety net: if still loading after 8s, redirect to login
  const killSwitch = setTimeout(() => {
    console.warn('Auth killswitch triggered — redirecting');
    window.location.href = rootUrl;
  }, 8000);

  try {
    if(typeof supabase === 'undefined'){
      console.error('Supabase library not loaded');
      clearTimeout(killSwitch);
      window.location.href = rootUrl;
      return;
    }

    const result = await _sb.auth.getSession();
    clearTimeout(killSwitch);

    const session = result?.data?.session;
    if(!session){
      window.location.href = rootUrl;
      return;
    }

    currentUser = session.user;
    if(loader) loader.style.display = 'none';
    showScreen('instruction');

  } catch(err){
    clearTimeout(killSwitch);
    console.error('initAuth error:', err);
    window.location.href = rootUrl;
  }
}


// ── Load pool ──
async function loadPool(){
  const { data, error } = await _sb.from('questions').select('*')
    .eq('section', SECTION).eq('sectional', SECTIONAL_NUM);
  if(error){ console.error(error); return []; }
  return (data||[]).map(q => ({
    ...q,
    options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
  }));
}

// ── Detect type ──
function detectType(q){
  const t = (q.topic||'').toLowerCase();
  if(t.includes('rc') || t.includes('reading') || q.passage) return Q_TYPE.RC;
  return Q_TYPE.CR;
}

// ── Build queue ──
function buildQueue(pool){
  const crAll = shuffle(pool.filter(q => detectType(q) === Q_TYPE.CR));
  const rcAll = pool.filter(q => detectType(q) === Q_TYPE.RC);

  // Group RC by passage
  const passageGroups = {};
  rcAll.forEach(q => {
    const key = q.passage ? q.passage.slice(0,80) : ('solo_'+q.id);
    if(!passageGroups[key]) passageGroups[key] = [];
    passageGroups[key].push(q);
  });
  const passages = shuffle(Object.values(passageGroups));

  const totalRC = rcAll.length;
  const totalCR = Math.min(crAll.length, TOTAL_QS - totalRC);
  const totalQ  = Math.min(TOTAL_QS, totalCR + totalRC);

  // Distribute: [CR block] [RC passage] [CR block] [RC passage] ... [CR block]
  const numP = passages.length;
  const crPerSeg = Math.floor(totalCR / (numP + 1));
  const crExtra  = totalCR % (numP + 1);

  // Adaptive state for CR
  const crPools = { Easy:[], Medium:[], Hard:[] };
  crAll.forEach(q => crPools[q.difficulty] && crPools[q.difficulty].push(q));
  let crDiff = 'Medium', crLast2 = [];
  const usedCR = new Set();

  function nextCR(){
    const order = crDiff==='Hard' ? ['Hard','Medium','Easy']
                : crDiff==='Easy' ? ['Easy','Medium','Hard']
                : ['Medium','Hard','Easy'];
    for(const d of order){
      const a = crPools[d].filter(q => !usedCR.has(q.id));
      if(a.length){ usedCR.add(a[0].id); return a[0]; }
    }
    return null;
  }

  function updCRDiff(r){
    if(r==='skip') return;
    crLast2.push(r); if(crLast2.length>2) crLast2.shift();
    if(crLast2.length===2 && crLast2.every(x=>x==='correct')){
      if(crDiff==='Easy') crDiff='Medium'; else if(crDiff==='Medium') crDiff='Hard';
    } else if(crLast2.length===2 && crLast2.every(x=>x==='wrong')){
      if(crDiff==='Hard') crDiff='Medium'; else if(crDiff==='Medium') crDiff='Easy';
    }
  }

  const queue = [];
  passages.forEach((block, pi) => {
    const seg = crPerSeg + (pi===0 ? crExtra : 0);
    for(let i=0; i<seg && queue.length<totalQ; i++){
      const q = nextCR();
      if(q) queue.push({ q, type:Q_TYPE.CR, onResult: updCRDiff });
    }
    for(const rcQ of block){
      if(queue.length < totalQ) queue.push({ q:rcQ, type:Q_TYPE.RC, onResult:()=>{} });
    }
  });
  // Final CR tail
  while(queue.length < totalQ){
    const q = nextCR(); if(!q) break;
    queue.push({ q, type:Q_TYPE.CR, onResult: updCRDiff });
  }
  return queue;
}

// ── Start test ──
async function startTest(){
  showScreen('loading');
  g('loading-msg').textContent = 'Loading question pool...';
  const pool = await loadPool();
  if(!pool.length){
    showScreen('instruction');
    alert('No questions found for Verbal Sectional '+SECTIONAL_NUM);
    return;
  }
  const queue = buildQueue(pool);
  if(!queue.length){ showScreen('instruction'); return; }

  TEST = {
    queue, entries:[], idx:0,
    secsLeft:45*60, interval:null, qStart:null, sel:null,
    savedForLater:new Set(), markedGuess:new Set(),
    isPaused:false, editEditsLeft:3, editingIdx:-1, editSelLetter:null
  };

  // Push first entry
  const first = queue[0];
  TEST.entries.push({ q:first.q, type:first.type, selected:null, result:null, time:0, edited:false });

  showScreen(first.type === Q_TYPE.CR ? 'test-cr' : 'test-rc');
  renderQuestion();
  startTimer();
}

// ── Render question ──
function renderQuestion(){
  const idx = TEST.idx;
  const entry = TEST.entries[idx];
  const q = entry.q;
  const type = entry.type;

  TEST.sel = entry.selected || null;
  TEST.qStart = Date.now();

  const pos = 'Question '+(idx+1)+' of '+TOTAL_QS;
  const pct = (idx / TOTAL_QS) * 100;

  if(type === Q_TYPE.CR){
    showScreen('test-cr');

    // Update timer/progress/position labels
    const timerEl = g('cr-timer');
    if(timerEl) timerEl.textContent = formatTime(TEST.secsLeft);
    const progEl = g('cr-progress');
    if(progEl) progEl.style.width = pct+'%';
    const posEl = g('cr-pos-label');
    if(posEl) posEl.textContent = pos;

    // Split: argument above divider, stem below
    const { argument, stem } = splitCRQuestion(q.question || '');
    const passageEl = g('cr-passage');
    const questionEl = g('cr-question');
    if(passageEl) passageEl.innerHTML = safeHtml(argument);
    if(questionEl) questionEl.innerHTML = stem ? '<em>'+safeHtml(stem)+'</em>' : '';

    buildOptions(g('cr-options'), 'cr-option', q, TEST.sel);

    const markEl = g('cr-mark-guess');
    if(markEl) markEl.checked = TEST.markedGuess.has(idx);

    setNextBtn('cr-next-btn', !!TEST.sel);

  } else {
    showScreen('test-rc');

    const timerEl = g('rc-timer');
    if(timerEl) timerEl.textContent = formatTime(TEST.secsLeft);
    const progEl = g('rc-progress');
    if(progEl) progEl.style.width = pct+'%';
    const posEl = g('rc-pos-label');
    if(posEl) posEl.textContent = pos;
    const qNumEl = g('rc-q-num');
    if(qNumEl) qNumEl.textContent = idx+1;

    // Passage left panel
    const passEl = g('rc-passage-text');
    if(passEl){
      passEl.innerHTML = q.passage
        ? formatPassage(q.passage)
        : '<p style="color:#888;font-style:italic;font-size:13px;font-family:Arial">Passage not attached to this question.</p>';
    }

    // Question stem right panel
    const stemEl = g('rc-question');
    if(stemEl) stemEl.innerHTML = safeHtml(q.question || '');

    buildOptions(g('rc-options'), 'rc-option', q, TEST.sel);

    const markEl = g('rc-mark-guess');
    if(markEl) markEl.checked = TEST.markedGuess.has(idx);

    setNextBtn('rc-next-btn', !!TEST.sel);
  }
}

// ── Build options (completely fresh each time) ──
function buildOptions(container, cls, q, currentSel){
  if(!container){ console.error('Options container not found'); return; }
  container.innerHTML = '';
  ['A','B','C','D','E'].forEach(letter => {
    if(!q.options || !q.options[letter]) return;

    const row = document.createElement('div');
    // Only selected — never 'confirmed' during rendering
    row.className = cls + (currentSel === letter ? ' selected' : '');
    row.dataset.letter = letter;

    const circle = document.createElement('div');
    circle.className = 'opt-circle';

    const text = document.createElement('span');
    text.className = 'opt-text';
    text.innerHTML = safeHtml(q.options[letter]);

    row.appendChild(circle);
    row.appendChild(text);

    // Click handler — always enabled, no pointer-events blocking
    row.onclick = function(){
      // Remove selected from all
      container.querySelectorAll('.'+cls).forEach(r => {
        r.classList.remove('selected');
      });
      // Add to clicked
      row.classList.add('selected');
      TEST.sel = letter;
      // Enable next button
      setNextBtn(cls === 'cr-option' ? 'cr-next-btn' : 'rc-next-btn', true);
    };

    container.appendChild(row);
  });
}

function setNextBtn(id, enabled){
  const btn = g(id);
  if(btn) btn.disabled = !enabled;
}

// ── Safe HTML (escape & handle **bold**) ──
function safeHtml(text){
  if(!text) return '';
  return text
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\n/g,'<br>');
}

function formatPassage(text){
  if(!text) return '';
  return text.split(/\n\n+/)
    .map(p => '<p>'+safeHtml(p.trim())+'</p>')
    .join('');
}

// ── Split CR question ──
function splitCRQuestion(text){
  if(!text) return { argument:'', stem:'' };

  // These phrases always start the question stem
  const stemTriggers = [
    'Which of the following',
    'which of the following',
    'Which one of the following',
    'The argument above',
    'the argument above',
    'In the argument above',
    'The two boldface',
    'Each of the following',
    'What is the',
    'What does',
    'Based on the above',
    'If the above',
  ];

  for(const trigger of stemTriggers){
    const idx = text.indexOf(trigger);
    if(idx > 0 && idx > text.length * 0.15){
      // Walk back to start of sentence
      let start = idx;
      for(let i = idx-1; i >= 0; i--){
        if(text[i] === '\n'){ start = i+1; break; }
        if(text[i] === ' ' && i > 0 && (text[i-1] === '.' || text[i-1] === '?'|| text[i-1] === '!')){
          start = i+1; break;
        }
        if(i === 0) start = 0;
      }
      return {
        argument: text.slice(0, start).trim(),
        stem: text.slice(start).trim()
      };
    }
  }

  // Fallback: last sentence boundary before final '?'
  const lastQ = text.lastIndexOf('?');
  if(lastQ > text.length * 0.3){
    // Find sentence start by scanning backwards for '. Upper'
    for(let i = lastQ-1; i > text.length*0.15; i--){
      if(text[i] === ' ' && text[i-1] === '.' && text[i+1] >= 'A' && text[i+1] <= 'Z'){
        return {
          argument: text.slice(0, i).trim(),
          stem: text.slice(i+1).trim()
        };
      }
      if(text[i] === '\n'){
        return {
          argument: text.slice(0, i).trim(),
          stem: text.slice(i+1).trim()
        };
      }
    }
  }

  return { argument: text, stem: '' };
}

// ── Navigation ──
function confirmNext(){
  if(!TEST.sel){
    g('skip-dialog').classList.add('show');
    return;
  }
  g('confirm-dialog').classList.add('show');
}
function closeConfirm(){ g('confirm-dialog').classList.remove('show'); }
function confirmYes(){ closeConfirm(); advance(false); }
function closeSkip(){ g('skip-dialog').classList.remove('show'); }
function confirmSkip(){ closeSkip(); advance(true); }

function advance(skip){
  const entry = TEST.entries[TEST.idx];
  entry.time = Math.round((Date.now() - TEST.qStart) / 1000);

  const mg = (g('cr-mark-guess')||{checked:false}).checked || (g('rc-mark-guess')||{checked:false}).checked;
  if(mg) TEST.markedGuess.add(TEST.idx); else TEST.markedGuess.delete(TEST.idx);

  if(skip){
    entry.selected = null;
    entry.result = 'skip';
    TEST.queue[TEST.idx]?.onResult('skip');
  } else {
    entry.selected = TEST.sel;
    entry.result = TEST.sel === entry.q.answer ? 'correct' : 'wrong';
    TEST.queue[TEST.idx]?.onResult(entry.result);
  }

  TEST.idx++;
  if(TEST.idx >= TEST.queue.length){ endTest(); return; }

  const next = TEST.queue[TEST.idx];
  TEST.entries.push({ q:next.q, type:next.type, selected:null, result:null, time:0, edited:false });
  TEST.sel = null;
  renderQuestion();
}

// ── Timer ──
function startTimer(){
  TEST.interval = setInterval(() => {
    if(TEST.isPaused) return;
    TEST.secsLeft--;
    const t = formatTime(TEST.secsLeft);
    ['cr-timer','rc-timer','edit-timer','pause-timer-display'].forEach(id => {
      const el = g(id); if(el) el.textContent = t;
    });
    if(TEST.secsLeft <= 300){
      ['cr-timer','rc-timer'].forEach(id => { const el=g(id); if(el) el.classList.add('urgent'); });
    }
    if(TEST.secsLeft <= 0){ clearInterval(TEST.interval); endTest(); }
  }, 1000);
}

function formatTime(s){ return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); }

function togglePause(){
  TEST.isPaused = !TEST.isPaused;
  if(TEST.isPaused){
    const el = g('pause-timer-display');
    if(el) el.textContent = formatTime(TEST.secsLeft);
    g('pause-overlay').classList.add('show');
  } else {
    g('pause-overlay').classList.remove('show');
  }
}

function toggleSaveForLater(){
  if(TEST.savedForLater.has(TEST.idx)) TEST.savedForLater.delete(TEST.idx);
  else TEST.savedForLater.add(TEST.idx);
}

function toggleFullscreen(){
  if(!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
  else document.exitFullscreen();
}

// ── End test ──
function endTest(){
  clearInterval(TEST.interval);
  if(TEST.secsLeft > 30) showEditScreen();
  else submitFinal();
}

// ── Edit answers ──
function showEditScreen(){
  showScreen('edit');
  g('edit-counter').textContent = 'Edits remaining: '+TEST.editEditsLeft;
  renderEditTable();
  g('edit-q-panel').classList.remove('show');
}

function renderEditTable(){
  const tbody = g('edit-tbody'); tbody.innerHTML='';
  TEST.entries.forEach((e, i) => {
    const mk = TEST.markedGuess.has(i);
    const sv = TEST.savedForLater.has(i);
    const status = e.edited?'Edited':mk?'Marked Guess':sv?'Saved':e.result==='skip'?'Skipped':'Answered';
    const sCls   = e.edited?'editing':mk?'marked':e.result==='skip'?'skipped':'answered';
    const short  = (e.q.question||'').replace(/\n/g,' ').slice(0,55)+'…';
    const tr = document.createElement('tr');
    if(TEST.editingIdx===i) tr.classList.add('sel-edit');
    tr.innerHTML = `<td class="edit-row-num">${i+1}</td><td style="font-size:12px">${short}</td>
      <td><span class="type-pill">${e.type}</span></td>
      <td><strong>${e.selected||'—'}</strong></td>
      <td><span class="edit-status ${sCls}">${status}</span></td>
      <td><span class="dpill ${e.q.difficulty}">${e.q.difficulty}</span></td>`;
    tr.addEventListener('click', () => openEditQ(i));
    tbody.appendChild(tr);
  });
}

function openEditQ(idx){
  if(TEST.editEditsLeft <= 0 && TEST.editingIdx !== idx){ alert('No edits remaining.'); return; }
  TEST.editingIdx = idx;
  TEST.editSelLetter = TEST.entries[idx].selected;
  const e = TEST.entries[idx];
  g('edit-q-text').innerHTML = safeHtml((e.q.question||'').slice(0,350));
  const opts = g('edit-opts'); opts.innerHTML='';
  ['A','B','C','D','E'].forEach(l => {
    if(!e.q.options||!e.q.options[l]) return;
    const row = document.createElement('div');
    row.className = 'cr-option'+(TEST.editSelLetter===l?' selected':'');
    row.dataset.letter = l;
    row.innerHTML = `<div class="opt-circle"></div><span class="opt-text">${safeHtml(e.q.options[l])}</span>`;
    row.onclick = () => {
      TEST.editSelLetter = l;
      opts.querySelectorAll('.cr-option').forEach(r => r.classList.remove('selected'));
      row.classList.add('selected');
    };
    opts.appendChild(row);
  });
  g('edit-q-panel').classList.add('show');
  g('edit-q-panel').scrollIntoView({behavior:'smooth', block:'nearest'});
  renderEditTable();
}

function saveEdit(){
  if(TEST.editingIdx < 0) return;
  const e = TEST.entries[TEST.editingIdx];
  if(TEST.editSelLetter === e.selected){ cancelEdit(); return; }
  e.selected = TEST.editSelLetter;
  e.result = TEST.editSelLetter === e.q.answer ? 'correct' : 'wrong';
  if(!e.edited){ TEST.editEditsLeft--; e.edited=true; }
  TEST.editingIdx=-1; TEST.editSelLetter=null;
  g('edit-counter').textContent = 'Edits remaining: '+TEST.editEditsLeft;
  renderEditTable();
  g('edit-q-panel').classList.remove('show');
}

function cancelEdit(){
  TEST.editingIdx=-1; TEST.editSelLetter=null;
  renderEditTable(); g('edit-q-panel').classList.remove('show');
}

// ── Submit & report ──
function submitFinal(){
  clearInterval(TEST.interval);
  saveSession();
  renderReport();
  showScreen('report');
}

function saveSession(){
  const es = TEST.entries;
  const correct = es.filter(e=>e.result==='correct').length;
  const elapsed = 45*60-TEST.secsLeft;
  const sessKey = 'gmat_sessions_'+(currentUser?.id||'guest');
  const sessions = JSON.parse(localStorage.getItem(sessKey)||'[]');
  sessions.unshift({
    id:Date.now(), date:new Date().toISOString(),
    section:SECTION, testNum:SECTIONAL_NUM,
    entries:es.map(e=>({
      result:e.result, selected:e.selected, time:e.time, edited:e.edited, type:e.type,
      q:{question:e.q.question, answer:e.q.answer, difficulty:e.q.difficulty,
         topic:e.q.topic, options:e.q.options, explanation:e.q.explanation,
         passage:e.q.passage||null}
    })),
    correct, total:es.length,
    markedGuess: TEST.markedGuess.size,
    markedGuessArr: [...TEST.markedGuess],
    pct: es.length ? Math.round(correct/es.length*100) : 0,
    avgTime: es.length ? Math.round(es.reduce((s,e)=>s+e.time,0)/es.length) : 0,
    elapsed: Math.floor(elapsed/60)+'m '+(elapsed%60)+'s'
  });
  localStorage.setItem(sessKey, JSON.stringify(sessions.slice(0,50)));
}

function calcVerbalScore(correct, total){
  // GMAT Verbal scaled score: V60-V90
  // Based on GMAC scoring: roughly linear mapping adjusted for difficulty
  // V60 = ~0% correct, V90 = ~100% correct (with realistic curve)
  if(total === 0) return 60;
  const pct = correct / total;
  // Sigmoid-ish curve matching real GMAT verbal score distribution
  // V60 baseline, V90 max, inflection around 55% accuracy
  const raw = 60 + Math.round(pct * pct * 30 + pct * 10 * (1 - pct * 0.3));
  return Math.min(90, Math.max(60, raw));
}

function calcPercentile(score){
  // Approximate GMAT Verbal percentile mapping (GMAC 2024 data)
  const map = {60:1,62:3,64:6,66:10,68:15,70:21,72:28,74:36,76:45,78:54,80:63,82:71,84:78,86:85,88:91,90:99};
  const keys = Object.keys(map).map(Number).sort((a,b)=>a-b);
  for(let i=keys.length-1;i>=0;i--){
    if(score>=keys[i]) return map[keys[i]];
  }
  return 1;
}

function makeDonut(svgId, correctPct, wrongPct){
  const circumference = 2 * Math.PI * 35; // r=35
  const cLen = circumference * correctPct;
  const wLen = circumference * wrongPct;
  const gapStart = cLen;
  // correct arc
  const cArc = document.getElementById(svgId+'-correct-arc');
  const wArc = document.getElementById(svgId+'-wrong-arc');
  if(cArc) cArc.setAttribute('stroke-dasharray', cLen+' '+(circumference-cLen));
  if(wArc){
    wArc.setAttribute('stroke-dasharray', wLen+' '+(circumference-wLen));
    // Offset wrong arc to start after correct arc
    const offsetDeg = (cLen / circumference) * 360;
    wArc.setAttribute('transform', 'rotate('+(offsetDeg-90)+' 45 45)');
  }
}

function makeDiffDonut(containerId, correctPct){
  const r=28, circ=2*Math.PI*r;
  const cLen = circ * correctPct;
  const wLen = circ * (1-correctPct);
  return `<svg width="70" height="70" viewBox="0 0 70 70">
    <circle cx="35" cy="35" r="${r}" fill="none" stroke="#f0f0f0" stroke-width="8"/>
    <circle cx="35" cy="35" r="${r}" fill="none" stroke="#2e7d32" stroke-width="8"
      stroke-dasharray="${cLen.toFixed(1)} ${(circ-cLen).toFixed(1)}" stroke-dashoffset="${(circ*0.25).toFixed(1)}"
      transform="rotate(-90 35 35)"/>
    ${correctPct<1?`<circle cx="35" cy="35" r="${r}" fill="none" stroke="#c62828" stroke-width="8"
      stroke-dasharray="${wLen.toFixed(1)} ${(circ-wLen).toFixed(1)}"
      transform="rotate(${(correctPct*360-90).toFixed(1)} 35 35)"/>`:''}
  </svg>`;
}

function renderReport(){
  const es = TEST.entries;
  const correct = es.filter(e=>e.result==='correct').length;
  const wrong    = es.filter(e=>e.result==='wrong').length;
  const skip     = es.filter(e=>e.result==='skip').length;
  const total    = es.length;
  const elapsed  = 45*60 - TEST.secsLeft;
  const elapsedMin = Math.floor(elapsed/60);
  const elapsedSec = elapsed % 60;
  const avgT = total ? Math.round(es.reduce((s,e)=>s+e.time,0)/total) : 0;

  const score = calcVerbalScore(correct, total);
  const percentile = calcPercentile(score);
  const pct = total ? Math.round(correct/total*100) : 0;

  const crEs = es.filter(e=>e.type===Q_TYPE.CR);
  const rcEs = es.filter(e=>e.type===Q_TYPE.RC);

  // ── Hero ──
  const g = id => document.getElementById(id);
  g('rpt-score').textContent = score;
  g('rpt-percentile').textContent = percentile+'th percentile';
  g('rpt-date').textContent = new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  g('rpt-mode').textContent = 'Standard Mode · '+total+'Q used';
  g('rpt-time-used').textContent = elapsedMin+'m';
  g('rpt-correct').textContent = correct;
  g('rpt-wrong').textContent = wrong;
  g('rpt-accuracy').textContent = pct+'%';
  g('report-topbar-title') && (g('report-topbar-title').textContent = SECTION_NAME+' Sectional '+SECTIONAL_NUM);
  g('rpt-elapsed-display').textContent = elapsedMin+':'+String(elapsedSec).padStart(2,'0');
  g('rpt-avg-time').textContent = Math.floor(avgT/60)+':'+String(avgT%60).padStart(2,'0');
  g('rpt-guessed').textContent = TEST.markedGuess.size;
  g('rpt-skipped').textContent = skip;
  g('rpt-edited').textContent = es.filter(e=>e.edited).length;
  g('rpt-cr-count').textContent = crEs.length;
  g('rpt-rc-count').textContent = rcEs.length;
  g('leg-correct').textContent = correct;
  g('leg-correct-pct').textContent = pct+'%';
  g('leg-wrong').textContent = wrong;
  g('leg-wrong-pct').textContent = total?Math.round(wrong/total*100)+'%':'';
  g('leg-skip').textContent = skip;

  // Donut animation after a tick
  setTimeout(()=>{
    const circ = 2*Math.PI*35;
    const cPct = total ? correct/total : 0;
    const wPct = total ? wrong/total : 0;
    makeDonut('donut', cPct, wPct);
  }, 100);

  // ── Answer number tiles ──
  const numsEl = g('ans-nums'); numsEl.innerHTML='';
  es.forEach((e,i)=>{
    const cls = e.result==='correct'?'c':e.result==='wrong'?'w':'s';
    const btn = document.createElement('button');
    btn.className='ans-num '+cls; btn.textContent=i+1;
    btn.onclick=()=>{ const row=g('ans-row-'+i); if(row){row.scrollIntoView({behavior:'smooth',block:'center'});row.click();} };
    numsEl.appendChild(btn);
  });

  // ── Difficulty cards ──
  const diffGrid = g('diff-grid'); diffGrid.innerHTML='';
  ['Easy','Medium','Hard'].forEach(diff=>{
    const dqs = es.filter(e=>e.q.difficulty===diff);
    const dc  = dqs.filter(e=>e.result==='correct').length;
    const dw  = dqs.filter(e=>e.result==='wrong').length;
    const dpct = dqs.length ? dc/dqs.length : 0;
    const avgDT = dqs.length ? Math.round(dqs.reduce((s,e)=>s+e.time,0)/dqs.length) : 0;
    const avgDTStr = Math.floor(avgDT/60)+':'+String(avgDT%60).padStart(2,'0');
    diffGrid.innerHTML += `<div class="diff-card-new">
      <div class="diff-card-label">${diff}</div>
      <div class="diff-donut-wrap">
        ${dqs.length ? makeDiffDonut('diff-'+diff, dpct) : '<div style="width:70px;height:70px;background:#f5f5f5;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;color:#888">N/A</div>'}
        <div class="diff-stats">
          <div class="diff-correct"><span style="background:#2e7d32;color:#fff;width:18px;height:18px;border-radius:3px;display:inline-flex;align-items:center;justify-content:center;font-size:11px">✓</span> ${dc} Correct</div>
          <div class="diff-wrong"><span style="background:#c62828;color:#fff;width:18px;height:18px;border-radius:3px;display:inline-flex;align-items:center;justify-content:center;font-size:11px">✗</span> ${dw} Incorrect</div>
          <div class="diff-avgtime">Average Time: <strong>${avgDTStr}</strong></div>
        </div>
      </div>
    </div>`;
  });

  // ── Question type bars ──
  const qtypeEl = g('qtype-section'); qtypeEl.innerHTML='';
  [
    {label:'Verbal - Critical Reasoning', qs: crEs},
    {label:'Verbal - Reading Comprehension', qs: rcEs}
  ].forEach(({label, qs})=>{
    if(!qs.length) return;
    const qc = qs.filter(e=>e.result==='correct').length;
    const qw = qs.filter(e=>e.result==='wrong').length;
    const cpct = Math.round(qc/qs.length*100);
    const wpct = Math.round(qw/qs.length*100);
    qtypeEl.innerHTML += `<div class="qtype-row">
      <div class="qtype-header">
        <span class="qtype-name">${label}</span>
        <span class="qtype-pcts">
          <span class="qtype-pct-c">✓ ${cpct}%</span>
          <span class="qtype-pct-w">✗ ${wpct}%</span>
        </span>
      </div>
      <div class="qtype-bar-track">
        <div class="qtype-bar-c" style="width:${cpct}%"></div>
        <div class="qtype-bar-w" style="width:${wpct}%"></div>
      </div>
    </div>`;
  });

  // ── Answers table ──
  window._reportEntries = es; // store for filtering
  renderAnswerTable(es);
}

function renderAnswerTable(entries){
  const tbody = document.getElementById('ans-tbody');
  if(!tbody) return;
  tbody.innerHTML='';
  entries.forEach((e,i)=>{
    const origIdx = window._reportEntries.indexOf(e);
    const rowCls = e.result==='correct'?'ans-row-c':e.result==='wrong'?'ans-row-w':'ans-row-s';
    const icon = e.result==='correct'?'<span style="color:#2e7d32;font-size:18px">✓</span>':e.result==='wrong'?'<span style="color:#c62828;font-size:18px">✗</span>':'<span style="color:#bbb;font-size:16px">—</span>';
    const tStr = Math.floor(e.time/60)+':'+String(e.time%60).padStart(2,'0');
    const guessed = TEST.markedGuess.has(origIdx)?'<span style="color:#f59e0b">★</span>':'—';
    const tr = document.createElement('tr');
    tr.className=rowCls; tr.id='ans-row-'+origIdx;
    tr.innerHTML = `<td style="font-weight:700;color:#005487;text-align:center">${origIdx+1}</td>
      <td style="font-size:11px;color:#888">${e.q.topic||e.type}</td>
      <td><span class="ans-type-pill">${e.type} / ${(e.q.topic||'').replace(/^(CR|RC)\s*[—-]?\s*/i,'').slice(0,20)||e.type}</span></td>
      <td style="text-align:center">${icon}</td>
      <td><span class="ans-diff-pill ${e.q.difficulty}">${e.q.difficulty}</span></td>
      <td style="font-family:'Courier New',monospace;color:#555">${tStr}</td>
      <td style="text-align:center">${guessed}</td>`;

    // Expandable explanation row
    const expTr = document.createElement('tr');
    expTr.style.display='none';
    const expTd = document.createElement('td');
    expTd.colSpan=7; expTd.style.padding='0';
    const expDiv = document.createElement('div');
    expDiv.className='exp-panel-new';

    // Full question text
    const qDiv = document.createElement('div');
    qDiv.className='exp-q-full';
    qDiv.innerHTML = safeHtml(e.q.question||'');
    expDiv.appendChild(qDiv);

    // Options grid
    const optsDiv = document.createElement('div');
    optsDiv.className='exp-opts-grid';
    ['A','B','C','D','E'].forEach(l=>{
      if(!e.q.options||!e.q.options[l]) return;
      const d=document.createElement('div');
      const isCorrect = l===e.q.answer;
      const isWrong = l===e.selected && !isCorrect;
      d.className='exp-opt-item '+(isCorrect?'correct-ans':isWrong?'wrong-sel':'neutral');
      d.innerHTML='<strong>'+l+'.</strong> '+safeHtml(e.q.options[l]);
      optsDiv.appendChild(d);
    });
    expDiv.appendChild(optsDiv);

    // Your answer vs correct
    const ansRow = document.createElement('div');
    ansRow.style.cssText='display:flex;gap:16px;margin-bottom:10px;font-family:Arial,sans-serif;font-size:12px';
    ansRow.innerHTML=`<span>Your answer: <strong style="color:${e.result==='correct'?'#2e7d32':'#c62828'}">${e.selected||'Skipped'}</strong></span>
      <span>Correct: <strong style="color:#2e7d32">${e.q.answer}</strong></span>
      <span>Time: <strong>${Math.floor(e.time/60)+':'+String(e.time%60).padStart(2,'0')}</strong></span>`;
    expDiv.appendChild(ansRow);

    // Explanation
    if(e.q.explanation){
      const explDiv=document.createElement('div');
      explDiv.className='exp-explanation';
      explDiv.innerHTML='<strong>Explanation:</strong> '+safeHtml(e.q.explanation);
      expDiv.appendChild(explDiv);
    }

    expTd.appendChild(expDiv);
    expTr.appendChild(expTd);
    let open=false;
    tr.onclick=()=>{
      open=!open;
      expTr.style.display=open?'':'none';
      expDiv.classList.toggle('show',open);
    };
    tbody.appendChild(tr);
    tbody.appendChild(expTr);
  });
}

function filterAnswers(){
  const type = document.getElementById('filter-type').value;
  const diff = document.getElementById('filter-diff').value;
  const ans  = document.getElementById('filter-ans').value;
  let filtered = window._reportEntries || [];
  if(type) filtered = filtered.filter(e=>e.type===type);
  if(diff) filtered = filtered.filter(e=>e.q.difficulty===diff);
  if(ans)  filtered = filtered.filter(e=>e.result===ans);
  renderAnswerTable(filtered);
}

// ── Help / dialogs ──
function showHelp(){ g('help-dialog').classList.add('show'); }
function closeHelp(){ g('help-dialog').classList.remove('show'); }
function goBack(){ window.location.href = window.location.origin + '/dashboard.html'; }

function showScreen(name){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = g('screen-'+name);
  if(el) el.classList.add('active');
  window.scrollTo(0,0);
}

function shuffle(a){
  const b=[...a];
  for(let i=b.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [b[i],b[j]]=[b[j],b[i]];
  }
  return b;
}

document.addEventListener('keydown', e => {
  if(e.key==='Escape'){ closeConfirm(); closeHelp(); closeSkip(); if(TEST.isPaused) togglePause(); }
  if(e.key==='Enter' && g('confirm-dialog').classList.contains('show')) confirmYes();
});