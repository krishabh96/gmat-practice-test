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
         topic:e.q.topic, options:e.q.options, explanation:e.q.explanation}
    })),
    correct, total:es.length,
    pct: es.length ? Math.round(correct/es.length*100) : 0,
    avgTime: es.length ? Math.round(es.reduce((s,e)=>s+e.time,0)/es.length) : 0,
    elapsed: Math.floor(elapsed/60)+'m '+(elapsed%60)+'s'
  });
  localStorage.setItem(sessKey, JSON.stringify(sessions.slice(0,50)));
}

function renderReport(){
  const es = TEST.entries;
  const correct=es.filter(e=>e.result==='correct').length;
  const wrong=es.filter(e=>e.result==='wrong').length;
  const skip=es.filter(e=>e.result==='skip').length;
  const total=es.length;
  const pct=total?Math.round(correct/total*100):0;
  const avgT=total?Math.round(es.reduce((s,e)=>s+e.time,0)/total):0;
  const elapsed=45*60-TEST.secsLeft;
  g('report-sub').textContent=SECTION_NAME+' Sectional '+SECTIONAL_NUM+' · '+total+' questions · '+Math.floor(elapsed/60)+'m '+(elapsed%60)+'s';
  g('report-scorecard').innerHTML=`
    <div class="score-cell"><span class="score-val blue">${pct}%</span><span class="score-lbl">Accuracy</span></div>
    <div class="score-cell"><span class="score-val green">${correct}</span><span class="score-lbl">Correct</span></div>
    <div class="score-cell"><span class="score-val red">${wrong}</span><span class="score-lbl">Wrong</span></div>
    <div class="score-cell"><span class="score-val grey">${skip}</span><span class="score-lbl">Skipped</span></div>
    <div class="score-cell"><span class="score-val amber">${avgT}s</span><span class="score-lbl">Avg/Q</span></div>`;

  const trail=g('adaptive-trail'); trail.innerHTML='';
  es.forEach((e,i)=>{
    const d0=e.q.difficulty[0];
    const cls=e.result==='skip'?'sk':e.result==='correct'?'c'+d0:'w'+d0;
    const dot=document.createElement('div');
    dot.className='trail-dot '+cls+(TEST.markedGuess.has(i)?' mk':'');
    dot.textContent=e.type; dot.title='Q'+(i+1)+': '+e.type+' '+e.q.difficulty+' '+e.result;
    dot.onclick=()=>{ const r=g('rrow-'+i); if(r){r.scrollIntoView({behavior:'smooth',block:'center'});r.click();} };
    trail.appendChild(dot);
  });

  const dw=g('diff-bars'); dw.innerHTML='';
  ['Easy','Medium','Hard'].forEach(diff=>{
    const dqs=es.filter(e=>e.q.difficulty===diff);
    const dc=dqs.filter(e=>e.result==='correct').length;
    const dpct=dqs.length?Math.round(dc/dqs.length*100):0;
    const col=dpct>=70?'#2e7d32':dpct>=50?'#f57f17':'#c62828';
    dw.innerHTML+=`<div class="diff-card"><div class="diff-card-title">${diff}</div>
      <div class="diff-pct" style="color:${col}">${dqs.length?dpct+'%':'—'}</div>
      <div class="diff-bar-wrap"><div class="diff-bar" style="width:${dpct}%;background:${col}"></div></div>
      <div class="diff-attempted">${dc}/${dqs.length} correct</div></div>`;
  });

  const tbody=g('review-tbody'); tbody.innerHTML='';
  es.forEach((e,i)=>{
    const cls=e.result==='correct'?'row-c':e.result==='wrong'?'row-w':'row-s';
    const pill=e.result==='correct'?'<span class="rpill C">✓</span>':e.result==='wrong'?'<span class="rpill W">✗</span>':'<span class="rpill S">—</span>';
    const short=(e.q.question||'').replace(/\n/g,' ').replace(/\*\*/g,'').slice(0,50)+'…';
    const editB=e.edited?' <span style="font-size:10px;color:#005487;font-weight:700">[Edited]</span>':'';
    const tr=document.createElement('tr'); tr.className=cls; tr.id='rrow-'+i;
    tr.innerHTML=`<td style="font-weight:700;color:#005487">${i+1}</td>
      <td style="font-size:12px">${short}${editB}</td>
      <td><span class="type-pill">${e.type}</span></td>
      <td>${pill}</td>
      <td><span class="dpill ${e.q.difficulty}">${e.q.difficulty}</span></td>
      <td style="font-weight:700;color:#005487">${e.selected||'—'}</td>
      <td style="font-weight:700;color:#2e7d32">${e.q.answer}</td>
      <td style="color:#888;font-family:Arial">${e.time}s</td>`;
    const expTr=document.createElement('tr'); expTr.style.display='none';
    const expTd=document.createElement('td'); expTd.colSpan=8; expTd.style.padding='0';
    const expDiv=document.createElement('div'); expDiv.className='exp-panel';
    const expQ=document.createElement('div'); expQ.className='exp-q';
    expQ.innerHTML=safeHtml(e.q.question||'');
    const expOpts=document.createElement('div');
    ['A','B','C','D','E'].forEach(l=>{
      if(!e.q.options||!e.q.options[l]) return;
      const d=document.createElement('div');
      d.className='exp-opt'+(l===e.q.answer?' ca':l===e.selected&&l!==e.q.answer?' wa':'');
      d.innerHTML=l+'. '+safeHtml(e.q.options[l]); expOpts.appendChild(d);
    });
    const expText=document.createElement('div'); expText.className='exp-text';
    expText.textContent=e.q.explanation?'Explanation: '+e.q.explanation:'Correct answer: '+e.q.answer;
    expDiv.appendChild(expQ); expDiv.appendChild(expOpts); expDiv.appendChild(expText);
    expTd.appendChild(expDiv); expTr.appendChild(expTd);
    let open=false;
    tr.onclick=()=>{ open=!open; expTr.style.display=open?'':'none'; expDiv.classList.toggle('show',open); };
    tbody.appendChild(tr); tbody.appendChild(expTr);
  });
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