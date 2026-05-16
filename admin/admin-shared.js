// ══════════════════════════════════════
// SHARED ADMIN UTILITIES
// All admin pages include this file
// ══════════════════════════════════════

const ADMIN_PWD = 'gmat2024'; // Change before deploying
const SECTION_TARGETS = { Q:21, V:23, D:20 };
const SECTION_NAMES   = { Q:'Quantitative', V:'Verbal', D:'Data Insights' };
const SECTION_DESC    = { Q:'Problem Solving', V:'CR & Reading Comp', D:'DS & Data Analysis' };

// ── AUTH ──
function checkAuth() {
  if(sessionStorage.getItem('admin_auth') !== '1') {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}
function adminLogin(pwd) {
  if(pwd === ADMIN_PWD) {
    sessionStorage.setItem('admin_auth','1');
    return true;
  }
  return false;
}
function adminLogout() {
  sessionStorage.removeItem('admin_auth');
  window.location.href = 'index.html';
}

// ── STORAGE ──
const DB = {
  getQs()    { try{ return JSON.parse(localStorage.getItem('admin_questions')||'[]'); }catch(e){ return []; } },
  saveQs(qs) { localStorage.setItem('admin_questions', JSON.stringify(qs)); },
  add(q)     {
    const qs = this.getQs();
    q.id = q.id || 'Q_' + Date.now() + '_' + Math.floor(Math.random()*9999);
    qs.push(q); this.saveQs(qs); return q;
  },
  update(id, upd) {
    const qs = this.getQs();
    const i = qs.findIndex(x => x.id === id);
    if(i >= 0){ qs[i] = {...qs[i], ...upd}; this.saveQs(qs); return true; }
    return false;
  },
  delete(id) { this.saveQs(this.getQs().filter(q => q.id !== id)); },
  counts() {
    const qs = this.getQs();
    const tagged = qs.filter(q => q.sectional).length;
    return {
      total:qs.length, tagged, untagged:qs.length - tagged,
      Q:qs.filter(q=>q.section==='Q').length,
      V:qs.filter(q=>q.section==='V').length,
      D:qs.filter(q=>q.section==='D').length
    };
  }
};

// ── TOPBAR HTML ──
function renderTopbar(activePage) {
  const pages = [
    { id:'dashboard', label:'Dashboard',  href:'dashboard.html',  icon:'📊' },
    { id:'questions', label:'Add Questions', href:'questions.html', icon:'➕' },
    { id:'bank',      label:'Question Bank', href:'bank.html',      icon:'🗃️' },
    { id:'sectionals',label:'Sectionals', href:'sectionals.html',  icon:'🧩' },
    { id:'export',    label:'Export',     href:'export.html',      icon:'📦' },
  ];
  return `
    <div class="topbar">
      <a class="topbar-logo" href="dashboard.html">Sasta GMAT <span class="topbar-tag">Admin</span></a>
      <nav class="topbar-nav">
        ${pages.map(p=>`<a class="topbar-link ${p.id===activePage?'active':''}" href="${p.href}">${p.icon} ${p.label}</a>`).join('')}
      </nav>
      <div class="topbar-right">
        <a class="btn-ghost" href="../index.html" target="_blank">View Site ↗</a>
        <button class="btn-danger" onclick="adminLogout()">Sign Out</button>
      </div>
    </div>`;
}

// ── SHARED STYLES ──
const SHARED_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@700&display=swap');
:root{
  --navy:#0F172A;--teal:#14B8A6;--teal-d:#0D9488;--teal-l:rgba(20,184,166,0.1);
  --bg:#F0F2F5;--white:#FFFFFF;--text:#111827;--muted:#6B7280;
  --border:#E5E7EB;--green:#22C55E;--red:#EF4444;--amber:#F59E0B;
  --shadow:0 1px 3px rgba(0,0,0,0.07),0 4px 12px rgba(0,0,0,0.05);
  --shadow-lg:0 8px 32px rgba(15,23,42,0.12);--radius:10px;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;font-size:14px}

/* TOPBAR */
.topbar{background:var(--navy);height:56px;display:flex;align-items:center;padding:0 24px;gap:0;border-bottom:1px solid rgba(255,255,255,.06);position:sticky;top:0;z-index:100}
.topbar-logo{font-family:'Playfair Display',serif;font-size:17px;color:#fff;text-decoration:none;display:flex;align-items:center;gap:8px;margin-right:28px;flex-shrink:0}
.topbar-tag{background:var(--teal);color:var(--navy);font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:2px 7px;border-radius:4px}
.topbar-nav{display:flex;align-items:center;gap:2px;flex:1}
.topbar-link{color:rgba(255,255,255,.6);text-decoration:none;font-size:13px;padding:6px 12px;border-radius:6px;transition:all .15s;white-space:nowrap}
.topbar-link:hover{color:#fff;background:rgba(255,255,255,.08)}
.topbar-link.active{color:#fff;background:rgba(20,184,166,.2)}
.topbar-right{display:flex;gap:8px;flex-shrink:0}
.btn-ghost{font-size:12px;padding:6px 12px;border-radius:6px;cursor:pointer;font-family:'Inter',sans-serif;font-weight:600;background:transparent;border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.7);text-decoration:none;transition:all .2s}
.btn-ghost:hover{border-color:rgba(255,255,255,.5);color:#fff}
.btn-danger{font-size:12px;padding:6px 12px;border-radius:6px;cursor:pointer;font-family:'Inter',sans-serif;font-weight:600;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);color:#fca5a5;transition:all .2s}
.btn-danger:hover{background:rgba(239,68,68,.25)}

/* PAGE */
.page{max-width:1200px;margin:0 auto;padding:28px 24px 80px}
.page-title{font-size:20px;font-weight:700;color:var(--navy);margin-bottom:4px}
.page-sub{font-size:13px;color:var(--muted);margin-bottom:24px}

/* CARDS */
.card{background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:20px 22px;margin-bottom:18px}
.card-title{font-size:13px;font-weight:700;color:var(--navy);margin-bottom:14px;display:flex;align-items:center;gap:8px}

/* BUTTONS */
.btn{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all .2s}
.btn-blue{background:var(--navy);color:#fff}.btn-blue:hover{background:#1e293b}
.btn-teal{background:var(--teal);color:var(--navy)}.btn-teal:hover{background:var(--teal-d)}
.btn-outline{background:var(--white);color:var(--navy);border:1.5px solid var(--border)}.btn-outline:hover{border-color:var(--navy)}
.btn-red{background:var(--red);color:#fff}.btn-red:hover{background:#dc2626}
.btn-green{background:var(--green);color:#fff}.btn-green:hover{background:#16a34a}
.btn-sm{padding:6px 12px;font-size:12px}.btn-xs{padding:4px 9px;font-size:11px}

/* FORM */
.form-group{margin-bottom:14px}
.form-label{display:block;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--muted);margin-bottom:5px}
.form-input,.form-select{width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:7px;font-size:13px;font-family:'Inter',sans-serif;color:var(--text);background:var(--white);outline:none;transition:border-color .2s}
.form-input:focus,.form-select:focus{border-color:var(--teal)}
.form-textarea{width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:7px;font-size:13px;font-family:'Inter',sans-serif;color:var(--text);background:#fafaf8;outline:none;resize:vertical;min-height:100px;line-height:1.7;transition:border-color .2s;white-space:pre-wrap;word-break:break-word}
.form-textarea:focus{border-color:var(--teal)}
.form-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.form-grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.form-grid-4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px}

/* PREVIEW */
.textarea-wrap{position:relative}
.clean-btn{position:absolute;top:7px;right:8px;font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;background:var(--teal-l);color:var(--teal-d);border:1px solid rgba(20,184,166,.25);cursor:pointer;font-family:'Inter',sans-serif;z-index:2;transition:all .2s}
.clean-btn:hover{background:var(--teal);color:var(--navy)}
.preview-wrap{margin-top:6px}
.preview-label{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
.preview-box{background:#fff;border:1px solid var(--border);border-radius:7px;padding:10px 14px;font-size:13px;line-height:1.8;color:var(--text);display:none;min-height:36px}
.preview-box.show{display:block}

/* PILLS */
.dpill{font-size:10px;font-weight:600;padding:2px 7px;border-radius:4px;display:inline-block}
.dpill.Easy{background:#e8f5e8;color:#2e7d32}.dpill.Medium{background:#fff8e1;color:#f57f17}.dpill.Hard{background:#fce8e8;color:#c62828}
.spill{font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;display:inline-block}
.spill-Q{background:#e8f0f8;color:#003865}.spill-V{background:#fce8e8;color:#c62828}.spill-D{background:#e8f5e8;color:#2e7d32}

/* TOAST */
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);font-size:13px;padding:11px 22px;border-radius:8px;z-index:500;display:none;box-shadow:var(--shadow-lg);font-family:'Inter',sans-serif;white-space:nowrap}
.toast.info{background:var(--navy);color:#fff;border:1px solid rgba(255,255,255,.1)}
.toast.success{background:#052e16;color:#4ade80;border:1px solid rgba(34,197,94,.3)}
.toast.error{background:#450a0a;color:#fca5a5;border:1px solid rgba(239,68,68,.3)}

/* MODAL */
.modal-ov{position:fixed;inset:0;z-index:200;background:rgba(15,23,42,.6);backdrop-filter:blur(3px);display:none;align-items:center;justify-content:center;padding:20px}
.modal-ov.open{display:flex}
.modal{background:var(--white);border-radius:14px;width:100%;max-width:640px;max-height:90vh;overflow-y:auto;box-shadow:var(--shadow-lg);animation:mIn .22s ease}
@keyframes mIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.modal-hdr{background:var(--navy);padding:18px 22px;position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;border-radius:14px 14px 0 0}
.modal-title{font-size:14px;font-weight:700;color:#fff}
.modal-close{background:rgba(255,255,255,.1);border:none;color:rgba(255,255,255,.7);width:26px;height:26px;border-radius:6px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center}
.modal-close:hover{background:rgba(255,255,255,.2)}
.modal-body{padding:20px 22px}
`;

// ── SHARED JS UTILITIES ──
function g(id){ return document.getElementById(id); }

let _toastTimer;
function showToast(msg, type='info'){
  const t = g('toast');
  if(!t) return;
  t.textContent = msg; t.className = 'toast ' + type; t.style.display = 'block';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.style.display = 'none', 3500);
}

function cleanText(raw){
  let text = raw
    .replace(/\r\n/g,'\n').replace(/\r/g,'\n')
    .replace(/[\u200B-\u200D\uFEFF]/g,'')
    .replace(/\u00A0/g,' ')
    .replace(/[\u2018\u2019]/g,"'")
    .replace(/[\u201C\u201D]/g,'"')
    .replace(/\u2013/g,'–').replace(/\u2014/g,'—')
    .replace(/\u2026/g,'...');

  const lines = text.split('\n');
  const shortLines = lines.filter(l => l.trim().length <= 2).length;
  if(lines.length > 4 && shortLines / lines.length > 0.5){
    text = lines.map(l => l.trim()).join(' ').replace(/  +/g,' ').trim();
  }
  return text.replace(/\n{3,}/g,'\n\n').trim();
}

function cleanField(taId, pvId){
  const el = g(taId); if(!el) return;
  el.value = cleanText(el.value);
  if(pvId) updatePreview(taId, pvId);
  showToast('Cleaned ✓','success');
}

function updatePreview(taId, pvId){
  const el = g(taId); const pv = g(pvId);
  if(!el || !pv) return;
  const txt = el.value.trim();
  if(!txt){ pv.classList.remove('show'); return; }
  pv.classList.add('show');
  pv.innerHTML = txt.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  renderMath(pv);
}

function renderMath(el){
  if(typeof renderMathInElement === 'function'){
    try{
      renderMathInElement(el,{
        delimiters:[
          {left:'$$',right:'$$',display:true},
          {left:'$',right:'$',display:false},
          {left:'\\(',right:'\\)',display:false},
          {left:'\\[',right:'\\]',display:true}
        ],
        throwOnError:false
      });
    }catch(e){}
  }
}

// Auto-clean on paste
document.addEventListener('paste', e => {
  const t = e.target;
  if(!t.classList.contains('form-textarea')) return;
  setTimeout(() => {
    const lines = t.value.split('\n');
    const short = lines.filter(l => l.trim().length <= 2).length;
    if(lines.length > 4 && short/lines.length > 0.5){
      t.value = cleanText(t.value);
      showToast('Auto-cleaned line breaks ✓','success');
    }
    // Trigger preview if exists
    const pvId = t.dataset.preview;
    if(pvId) updatePreview(t.id, pvId);
  }, 50);
});

// ── DOCX/TXT PARSER ──
// Parses the exact format from GMAT Official Guide docx:
// Question: \t\t- text  OR  numbered "1. text"
// Options:  \t- text  OR  "A. text"
// Topic:    # Arithmetic Statistics
// Answer:   # The correct answer is X.
// Explanation: text between topic and answer lines

function parseDocText(rawText, defaultSection, defaultDifficulty){
  const questions = [];
  const lines = rawText.split('\n');

  // Detect difficulty from section headers
  let currentDiff = defaultDifficulty || 'Medium';
  const diffMap = {
    'easy': 'Easy', 'medium': 'Medium', 'hard': 'Hard'
  };

  // Split into blocks by "The correct answer is X" lines
  // First collect all answer positions
  const answerLines = [];
  lines.forEach((line, i) => {
    const m = line.match(/[Tt]he correct answer is\s+([A-E])[\.\s]?/);
    if(m) answerLines.push({ lineIdx: i, answer: m[1].toUpperCase() });
  });

  if(!answerLines.length) return [];

  // For each answer, work backwards to find question + options + explanation
  answerLines.forEach(({ lineIdx, answer }, qi) => {
    // Determine block start (line after previous answer, or 0)
    const blockStart = qi > 0 ? answerLines[qi-1].lineIdx + 1 : 0;
    const blockLines = lines.slice(blockStart, lineIdx + 1);

    // Detect difficulty from header lines in block
    blockLines.forEach(l => {
      const dl = l.toLowerCase();
      Object.entries(diffMap).forEach(([k,v]) => {
        if(dl.includes('difficulty:') && dl.includes(k)) currentDiff = v;
      });
    });

    // Find topic line (# Arithmetic Statistics etc.)
    let topic = '';
    let topicLineIdx = -1;
    for(let i = blockLines.length - 1; i >= 0; i--){
      const l = blockLines[i].trim();
      if(l.startsWith('#') && !l.toLowerCase().includes('correct answer')){
        topic = l.replace(/^#+\s*/,'').trim();
        topicLineIdx = i;
        break;
      }
    }

    // Explanation = lines between topic and answer line
    let explanation = '';
    if(topicLineIdx >= 0 && topicLineIdx < blockLines.length - 1){
      explanation = blockLines
        .slice(topicLineIdx + 1, blockLines.length - 1)
        .map(l => l.replace(/^\t+/,'').replace(/^#+\s*/,'').trim())
        .filter(l => l && !l.match(/^[Tt]he correct answer/))
        .join(' ')
        .trim();
    }

    // Lines before topic = question + options
    const contentLines = topicLineIdx >= 0
      ? blockLines.slice(0, topicLineIdx)
      : blockLines.slice(0, -1);

    // Identify options: lines starting with \t- or A. B. C. etc
    const optRegex = /^(?:\t-\s+|([A-E])[.)]\s+)/;
    const options = {};
    const optionLineIdxs = [];
    contentLines.forEach((l, i) => {
      const stripped = l.replace(/^\t+/,'');
      const m = stripped.match(/^([A-E])[.)]\s+(.+)/);
      if(m){ options[m[1]] = m[2].trim(); optionLineIdxs.push(i); return; }
      // Single-tab lines that are options (no letter prefix)
      if(l.startsWith('\t-') && !l.startsWith('\t\t')){
        const text = l.replace(/^\t-\s*/,'').trim();
        if(text) {
          const letters = ['A','B','C','D','E'];
          const idx = optionLineIdxs.length;
          if(idx < 5){ options[letters[idx]] = text; optionLineIdxs.push(i); }
        }
      }
    });

    // Question = everything before first option, using double-tab lines or numbered
    const firstOptIdx = optionLineIdxs.length ? Math.min(...optionLineIdxs) : contentLines.length;
    let questionText = contentLines
      .slice(0, firstOptIdx)
      .map(l => {
        // Remove markdown bold artifacts
        let t = l.replace(/\*\*/g,'').replace(/\t\t-\s*/,'').replace(/^\t+/,'').replace(/^[-–]\s*/,'').replace(/^\d+\.\s*/,'');
        return t.trim();
      })
      .filter(l => l.length > 0)
      .join('\n')
      .trim();

    // Skip if no valid question or options
    if(!questionText || questionText.length < 10) return;
    if(Object.keys(options).length < 2) return;

    questions.push({
      id: 'Q_' + Date.now() + '_' + qi + '_' + Math.floor(Math.random()*9999),
      section: defaultSection || 'Q',
      difficulty: currentDiff,
      topic: topic,
      question: questionText,
      options: options,
      answer: answer,
      explanation: explanation,
      sectional: ''
    });
  });

  return questions;
}

function dlFile(blob, name){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name; a.click();
  URL.revokeObjectURL(a.href);
}
