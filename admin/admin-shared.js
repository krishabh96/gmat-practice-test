// ══════════════════════════════════════
// SHARED ADMIN UTILITIES
// All admin pages include this file
// ══════════════════════════════════════

const ADMIN_PWD = 'gmat2024'; // Change before deploying
const SECTION_TARGETS = { Q:21, V:23, D:20 };
const SECTION_NAMES   = { Q:'Quantitative', V:'Verbal', D:'Data Insights' };
const SECTION_DESC    = { Q:'Problem Solving', V:'CR & Reading Comp', D:'DS & Data Analysis' };

// ── Supabase credentials ──
const SUPA_URL = 'https://uavoffiwmocvvymtrsat.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhdm9mZml3bW9jdnZ5bXRyc2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MjkxMjAsImV4cCI6MjA5NDQwNTEyMH0.YSob4QEO0lIZl9GNdjEKS4RHFSB7yhc7eLekV6PuWAY';

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
// ── Supabase client (shared across all admin pages) ──
// ── Supabase client (lazy — created on first use) ──
let _adminSb = null;
function getDb(){
  if(!_adminSb) _adminSb = supabase.createClient(SUPA_URL, SUPA_KEY);
  return _adminSb;
}

// ── DB: Supabase-backed question store ──
// All methods are async — await them in calling code
const DB = {

  // ── READ ──
  async getQs(filters = {}) {
    let q = getDb().from('questions').select('*');
    if(filters.section)   q = q.eq('section', filters.section);
    if(filters.sectional) q = q.eq('sectional', filters.sectional);
    if(filters.difficulty) q = q.eq('difficulty', filters.difficulty);
    const { data, error } = await q.order('created_at', { ascending: false });
    if(error){ console.error('DB.getQs error:', error); return []; }
    return (data || []).map(r => ({
      ...r,
      options: typeof r.options === 'string' ? JSON.parse(r.options) : r.options
    }));
  },

  // ── COUNTS ──
  async counts() {
    const { data, error } = await getDb().from('questions').select('section, sectional');
    if(error) return { total:0, tagged:0, untagged:0, Q:0, V:0, D:0 };
    const qs = data || [];
    return {
      total:    qs.length,
      tagged:   qs.filter(q => q.sectional).length,
      untagged: qs.filter(q => !q.sectional).length,
      Q:        qs.filter(q => q.section === 'Q').length,
      V:        qs.filter(q => q.section === 'V').length,
      D:        qs.filter(q => q.section === 'D').length,
    };
  },

  // ── ADD ──
  async add(q) {
    q.id = q.id || 'Q_' + Date.now() + '_' + Math.floor(Math.random()*9999);
    q.options = typeof q.options === 'string' ? q.options : JSON.stringify(q.options);
    // Convert empty string sectional to null (Supabase expects integer or null)
    if(q.sectional === '' || q.sectional === undefined) q.sectional = null;
    else q.sectional = parseInt(q.sectional) || null;
    const { data, error } = await getDb().from('questions').insert([q]).select().single();
    if(error){ console.error('DB.add error:', error); throw error; }
    return data;
  },

  // ── ADD MANY ──
  async addMany(qs) {
    const rows = qs.map(q => {
      // Convert empty string sectional to null
      let sectional = q.sectional;
      if(sectional === '' || sectional === undefined) sectional = null;
      else sectional = parseInt(sectional) || null;
      return {
        ...q,
        id: q.id || 'Q_' + Date.now() + '_' + Math.floor(Math.random()*9999),
        options: typeof q.options === 'string' ? q.options : JSON.stringify(q.options),
        sectional
      };
    });
    const { data, error } = await getDb().from('questions').insert(rows).select();
    if(error){ console.error('DB.addMany error:', error); throw error; }
    return data || [];
  },

  // ── UPDATE ──
  async update(id, upd) {
    if(upd.options && typeof upd.options !== 'string'){
      upd.options = JSON.stringify(upd.options);
    }
    if('sectional' in upd){
      if(upd.sectional === '' || upd.sectional === undefined) upd.sectional = null;
      else upd.sectional = parseInt(upd.sectional) || null;
    }
    const { error } = await getDb().from('questions').update(upd).eq('id', id);
    if(error){ console.error('DB.update error:', error); return false; }
    return true;
  },

  // ── DELETE ──
  async delete(id) {
    const { error } = await getDb().from('questions').delete().eq('id', id);
    if(error){ console.error('DB.delete error:', error); return false; }
    return true;
  },

  // ── DELETE MANY ──
  async deleteMany(ids) {
    const { error } = await getDb().from('questions').delete().in('id', ids);
    if(error){ console.error('DB.deleteMany error:', error); return false; }
    return true;
  },

  // ── CLEAR ALL ──
  async clearAll() {
    const { error } = await getDb().from('questions').delete().neq('id', '');
    if(error){ console.error('DB.clearAll error:', error); return false; }
    return true;
  },

  // ── MIGRATE: push localStorage questions to Supabase ──
  async migrateFromLocalStorage() {
    try {
      const raw = localStorage.getItem('admin_questions');
      if(!raw) return 0;
      const qs = JSON.parse(raw);
      if(!qs.length) return 0;
      await this.addMany(qs);
      return qs.length;
    } catch(e) {
      console.error('Migration error:', e);
      throw e;
    }
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

  // ── Fix char-by-char line splitting ──
  const lines = text.split('\n');
  const shortLines = lines.filter(l => l.trim().length <= 2).length;
  if(lines.length > 4 && shortLines / lines.length > 0.5){
    text = lines.map(l => l.trim()).join(' ').replace(/  +/g,' ').trim();
  }

  // ── Remove duplicate consecutive expressions (with or without space) ──
  for(let i=0; i<3; i++){
    text = text.replace(/(.{8,}?)\s+\1/g,'$1');
    text = text.replace(/(\d[\d,x+\-y≤≥=\s]{4,20})\1/g,'$1');
  }

  // ── Remove duplicate lines ──
  const allLines = text.split('\n');
  const seenLines = new Set();
  const dedupedLines = [];
  for(const line of allLines){
    const key = line.trim().toLowerCase().replace(/\s+/g,' ');
    if(key.length < 4){ dedupedLines.push(line); continue; }
    if(!seenLines.has(key)){ seenLines.add(key); dedupedLines.push(line); }
  }
  text = dedupedLines.join('\n');

  // ── Remove duplicate paragraphs ──
  const paras = text.split(/\n\n+/);
  const seenParas = new Set();
  const dedupedParas = [];
  for(const para of paras){
    const key = para.trim().toLowerCase().replace(/\s+/g,' ').slice(0,100);
    if(key.length < 10){ dedupedParas.push(para); continue; }
    if(!seenParas.has(key)){ seenParas.add(key); dedupedParas.push(para); }
  }
  text = dedupedParas.join('\n\n');

  // ── Format equations onto their own lines ──
  // If inequalities/equations appear at start of text before the question, split them
  // Pattern: equation block + question text all run together
  text = text
    // Add newline before numbered steps: "1)" "2)" "3)" etc in explanations
    .replace(/\s+(\d+\))\s+/g, '\n\n$1 ')
    // Add newline before "Step 1", "Step 2" etc
    .replace(/\s+(Step\s+\d+[:\.]?)\s+/gi, '\n\n$1 ')
    // Add newline before "Notice", "Therefore", "Thus", "Hence" at sentence start
    .replace(/\s+(Notice|Therefore|Thus|Hence|So|This means|We get|The answer)\s+/g, '\n$1 ')
    // Add newline before "We can ADD", "We can SUBTRACT" pattern
    .replace(/\s+(We can [A-Z]+)/g, '\n\n$1')
    // Add newline before inequality/equation lines that are concatenated with text
    // e.g. "...28000 A manufacturer" → "...28000\n\nA manufacturer"
    .replace(/(\d{3,})\s+([A-Z][a-z])/g, '$1\n\n$2')
    // Separate equations that run together: "7x+6y≤38,000 4x+5y≤28,000" → newline between
    .replace(/([\d,]+)\s+(\d+[a-z])/g, '$1\n$2');

  // Clean up excess spaces and blank lines
  text = text
    .replace(/ {2,}/g,' ')
    .replace(/\n{3,}/g,'\n\n')
    .trim();

  return text;
}

function removeDuplicates(text){ return cleanText(text); }

function cleanField(taId, pvId){
  const el = g(taId); if(!el) return;
  const before = el.value.length;
  el.value = cleanText(el.value);
  const removed = before - el.value.length;
  if(pvId) updatePreview(taId, pvId);
  showToast(removed > 10 ? `Cleaned ✓ — removed ${removed} duplicate chars` : 'Cleaned ✓','success');
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
    const before = t.value;
    const cleaned = cleanText(t.value);
    if(cleaned !== before){
      t.value = cleaned;
      showToast('Auto-cleaned ✓ (duplicates removed)','success');
    }
    // Trigger preview
    const pvId = t.dataset.preview;
    if(pvId) updatePreview(t.id, pvId);
  }, 80);
});

// ── DOCX/TXT PARSER ──
// Parses the exact format from GMAT Official Guide docx:
// Question: \t\t- text  OR  numbered "1. text"
// Options:  \t- text  OR  "A. text"
// ── FLEXIBLE MULTI-FORMAT PARSER ──
// Detects answer in ANY of these formats:
//   "The correct answer is B."
//   "Answer: B"
//   "Correct Answer: B"
//   "OA: B"
//   "OA - B"
//   "Answer is B"
//   "Ans: B"
//   "Ans - B"
//   "(B)" on its own line after options
//   "Choice B is correct"
//   "B is correct"
//   "B is the answer"
//   "B." or "B)" on its own line (after options block)


// ── FLEXIBLE MULTI-FORMAT PARSER ──
// Supports: GMAT OG, Answer:X, OA:X, Ans:X, Correct Answer:X,
//           Choice X is correct, B is correct, standalone letter after options

function detectAnswer(text){
  // Strip ** bold markers before matching
  const t = text.trim().replace(/\*\*/g,'');
  const patterns = [
    /[Tt]he\s+correct\s+answer\s+is\s*[:\-]?\s*([A-E])/,
    /[Cc]orrect\s+[Aa]nswer\s*[:\-]\s*([A-E])/,
    /\b[Aa]nswer\s*[:\-]\s*([A-E])\b/,
    /\bOA\s*[:\-]\s*([A-E])\b/i,
    /\b[Aa]ns\s*[:\-]\s*([A-E])\b/,
    /[Cc]hoice\s+([A-E])\s+is\s+correct/i,
    /\b([A-E])\s+is\s+(?:the\s+)?(?:correct\s+)?answer/i,
    /\b([A-E])\s+is\s+correct\b/i,
  ];
  for(const r of patterns){ const m = t.match(r); if(m) return m[1].toUpperCase(); }
  return null;
}

function isJunkLine(line){
  const t = line.trim().replace(/\*\*/g,'');
  if(!t) return true;
  // Markdown headings (when # is preserved)
  if(t.match(/^#{1,4}\s/)) return true;
  // Plain heading lines that mammoth produces (strips # markers)
  if(t.match(/^Question\s+\d+$/i)) return true;
  if(t.match(/^(PART|SECTION)\s+(I{1,3}|[IVX]+|\d+)\b/i)) return true;
  if(t.match(/^(EASY|MEDIUM|HARD)\s+(CR|RC|DI)\s+QUESTIONS?/i)) return true;
  // Meta lines like *(Difficulty: Easy | Type: CR)* or (Difficulty: Easy | Type: CR)
  if(t.match(/^\*?\(?(Difficulty|Type)\s*:/i)) return true;
  // Italic subtitle lines like *18 Critical Reasoning + ...*
  if(t.match(/^\*.+\*$/) && t.length < 120 && !t.includes('?')) return true;
  if(t.match(/^---+$/)) return true;
  if(t.match(/^Difficulty:/i)) return true;
  if(t.match(/^Format\s+\d/i)) return true;
  if(t.match(/^Sasta\s+GMAT/i)) return true;
  if(t.match(/^(Tips|Rules|Optional|Part|Section|Chapter)\b/i)) return true;
  if(t.match(/^GMAT\s+(Verbal|Quant|Data|Practice)/i)) return true;
  // Section headers
  if(t.match(/^PART I|PART II|CRITICAL REASONING|READING COMPREHENSION/i) && t.length < 60) return true;
  return false;
}

function isExplLine(line){
  const t = line.trim().replace(/\*\*/g,'').toLowerCase();
  return t.startsWith('explanation') || t.startsWith('solution') || t.startsWith('rationale');
}

function parseDocText(rawText, defaultSection, defaultDifficulty){
  const questions = [];
  const lines = rawText.split('\n');
  let lastDiff = defaultDifficulty || 'Medium';

  // ── STEP 1: Find all answer line positions ──
  const segments = [];
  lines.forEach((line, i) => {
    const clean = line.replace(/\*\*/g,'').toLowerCase();
    if(clean.includes('difficulty') && clean.includes('easy'))   lastDiff = 'Easy';
    if(clean.includes('difficulty') && clean.includes('medium')) lastDiff = 'Medium';
    if(clean.includes('difficulty') && clean.includes('hard'))   lastDiff = 'Hard';

    const ans = detectAnswer(line);
    if(ans){ segments.push({ ansIdx: i, ans, diff: lastDiff }); return; }

    // Standalone single letter only if previous lines have options
    const t = line.trim().replace(/\*\*/g,'');
    if(t.match(/^[A-E]$/)){
      const prev = lines.slice(Math.max(0,i-10), i);
      const hasOpts = prev.some(l => l.trim().replace(/\*\*/g,'').match(/^[A-E][.)]\s+\S/));
      if(hasOpts) segments.push({ ansIdx: i, ans: t, diff: lastDiff });
    }
  });

  if(!segments.length) return [];

  // ── STEP 2: Compute block ends ──
  // Stop at next "Question N" heading OR markdown heading
  // Mammoth strips # from headings, so we detect "Question 1", "Question 2" etc.
  const isHeadingLine = (l) => {
    const t = l.trim().replace(/\*\*/g,'');
    if(t.match(/^#{1,4}\s/)) return true;           // markdown heading
    if(t.match(/^Question\s+\d+$/i)) return true;   // "Question 1" plain text
    if(t.match(/^Q\s*\d+\s*[:\-–]?\s*$/i)) return true; // "Q1" or "Q 1"
    return false;
  };

  const blockEnds = segments.map(({ ansIdx }, qi) => {
    const nextAnsIdx = qi+1 < segments.length ? segments[qi+1].ansIdx : lines.length;
    let end = ansIdx;
    for(let j = ansIdx+1; j < nextAnsIdx; j++){
      if(isHeadingLine(lines[j])) break;
      end = j;
    }
    return end;
  });

  // ── STEP 3: Extract each question ──
  segments.forEach(({ ansIdx, ans: answer, diff }, qi) => {
    const blockStart = qi > 0 ? blockEnds[qi-1]+1 : 0;
    const block = lines.slice(blockStart, ansIdx+1);

    // Trailing explanation (after answer line, before next heading)
    const trailingText = lines.slice(ansIdx+1, blockEnds[qi]+1)
      .map(l => l.replace(/\*\*/g,'').trim())
      .filter(l => l && !detectAnswer(l))
      .join('\n').replace(/\n{3,}/g,'\n\n').trim();

    // Find explanation marker inside block
    let explIdx = -1, topic = '';
    for(let j = block.length-2; j >= 0; j--){
      const l = block[j].trim().replace(/\*\*/g,'');
      if(!l) continue;
      if(isExplLine(block[j])){ explIdx = j; break; }
      if(l.startsWith('#') && !detectAnswer(l)){
        topic = l.replace(/^#+\s*/,'').trim(); explIdx = j; break;
      }
    }

    // Build explanation
    let explanation = '';
    if(explIdx >= 0){
      const markerLine = block[explIdx].trim().replace(/\*\*/g,'')
        .replace(/^(Explanation|Solution|Rationale)\s*:\s*/i,'').trim();
      const innerLines = block.slice(explIdx+1, block.length-1)
        .map(l=>l.replace(/\*\*/g,'').trim()).filter(Boolean).join('\n');
      explanation = [markerLine, innerLines, trailingText].filter(Boolean)
        .join('\n').replace(/\n{3,}/g,'\n\n').trim();
    } else if(trailingText){
      explanation = trailingText;
    }

    const contentEnd = explIdx >= 0 ? explIdx : block.length-1;
    const content = block.slice(0, contentEnd);

    // ── Extract options ──
    // KEY FIX: options have blank lines between them (one option per paragraph in docx)
    // Scan ALL lines — blank lines between options are fine
    const options = {}, optIdxs = [];
    content.forEach((l, j) => {
      const s = l.trim().replace(/\*\*/g,'');
      const ltr = s.match(/^[\(\[]?([A-E])[\)\].]\s+(.+)/);
      if(ltr && !detectAnswer(s)){ options[ltr[1]] = ltr[2].trim(); optIdxs.push(j); return; }
      if(s.match(/^-\s+\S/) && !detectAnswer(s)){
        const text = s.replace(/^-\s+/,'').trim();
        if(text && optIdxs.length < 5){
          options[['A','B','C','D','E'][optIdxs.length]] = text;
          optIdxs.push(j);
        }
      }
    });

    if(Object.keys(options).length < 2) return;

    // ── Extract question text ──
    const firstOpt = optIdxs.length ? Math.min(...optIdxs) : content.length;
    const qText = content.slice(0, firstOpt)
      .map(l => l.replace(/\*\*/g,'').replace(/^\t+/,'')
                  .replace(/^\d+\.\s*/,'').replace(/^[-–•]\s+/,'').trim())
      .filter(l => l && !isJunkLine(l))
      .join('\n').trim();

    if(!qText || qText.length < 8) return;

    // Extract per-question difficulty from meta line in this block
    let qDiff = diff;
    for(const l of content){
      const dl = l.replace(/\*\*/g,'').toLowerCase();
      if(dl.includes('difficulty') && dl.includes('easy'))   qDiff='Easy';
      if(dl.includes('difficulty') && dl.includes('medium')) qDiff='Medium';
      if(dl.includes('difficulty') && dl.includes('hard'))   qDiff='Hard';
    }

    // Extract topic from *(Type: CR — Strengthen/Weaken)* meta line
    if(!topic){
      for(const l of content){
        const s = l.replace(/\*\*/g,'').replace(/[*()]/g,'').trim();
        const typeMatch = s.match(/Type:\s*(.+)/i);
        if(typeMatch){ topic = typeMatch[1].trim(); break; }
      }
    }

    // Fallback topic from short title-case line after options
    if(!topic){
      for(let j = content.length-1; j >= firstOpt; j--){
        const l = content[j].trim().replace(/\*\*/g,'');
        if(l.match(/^[A-Z][a-zA-Z\s]+$/) && l.length>4 && l.length<55 && !l.match(/[?.!]/)){
          topic = l; break;
        }
      }
    }

    questions.push({
      id: 'Q_'+Date.now()+'_'+qi+'_'+Math.floor(Math.random()*9999),
      section:    defaultSection || 'Q',
      difficulty: qDiff,
      topic:      topic.trim(),
      question:   qText,
      options,
      answer,
      explanation,
      sectional:  null
    });
  });

  return questions;
}


// Detect which answer format a doc uses
function detectDocFormat(text){
  const formats = [
    { p: /[Tt]he correct answer is\s+[A-E]/,  label: 'GMAT Official Guide format' },
    { p: /[Cc]orrect [Aa]nswer\s*:\s*[A-E]/,  label: '"Correct Answer: X" format' },
    { p: /\bOA\s*:\s*[A-E]/i,                 label: '"OA: X" format (GMATClub)' },
    { p: /\b[Aa]ns(?:wer)?\s*:\s*[A-E]/,      label: '"Answer: X" format' },
    { p: /[Cc]hoice\s+[A-E]\s+is correct/,    label: '"Choice X is correct" format' },
  ];
  for(const f of formats){ if(f.p.test(text)) return f.label; }
  return 'Unknown — will attempt auto-detection';
}

function dlFile(blob, name){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name; a.click();
  URL.revokeObjectURL(a.href);
}
