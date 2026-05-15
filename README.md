# GMAT Quant Practice — Deployment Guide

## Files in this project
- `index.html`      — User-facing test app
- `admin.html`      — Admin panel (password protected)
- `questions.js`    — Preloaded question bank
- `vercel.json`     — Vercel routing config

---

## Deploy to Vercel (5 minutes)

### Step 1 — Push to GitHub
1. Create a new repo on github.com (e.g. `gmat-practice`)
2. Upload all 4 files to the repo

### Step 2 — Connect to Vercel
1. Go to vercel.com → Sign up free with GitHub
2. Click "Add New Project" → Import your GitHub repo
3. No build settings needed — click Deploy
4. Vercel gives you a URL like `gmat-practice.vercel.app`

### Step 3 — Share
- User URL:  `https://your-url.vercel.app`
- Admin URL: `https://your-url.vercel.app/admin.html`

---

## Admin Panel

**Default password:** `gmat2024`

To change it: open `admin.html`, find this line near the top of the script:
```
const ADMIN_PASSWORD = 'gmat2024';
```
Change it to anything you want before deploying.

### What you can do as admin:
- **Add questions** — paste a question block (auto-parses) or fill the form manually
- **Edit / delete** questions
- **Create tests** — name them, assign specific questions to each
- **Export questions.js** — download updated file, replace in project, redeploy

---

## Adding Questions (Admin Workflow)

1. Open `your-url.vercel.app/admin.html`
2. Enter password
3. Go to **Add Question** → paste a question block:

```
The cost to rent a van is $120 plus $0.30 per mile...
A. 100 miles
B. 120 miles
C. 150 miles
D. 180 miles
E. 200 miles
The correct answer is C.
Explanation: Set costs equal: 120 + 0.30m = 90 + 0.50m...
```

4. Click **Parse Question** → select difficulty → **Save to Bank**
5. Go to **Export / Deploy** → click **Download questions.js**
6. Replace `questions.js` in your GitHub repo
7. Vercel auto-redeploys in ~30 seconds — friends instantly see new questions

---

## Adaptive Algorithm

- Starts every test with **Medium** questions
- **2 correct in a row** → next question is **Hard**
- **2 wrong in a row**  → next question is **Easy**
- **Mixed**             → stays at **Medium**
- No feedback during test — full review with explanations at the end

---

## Updating the Admin Password

Before deploying, open `admin.html` and change:
```javascript
const ADMIN_PASSWORD = 'gmat2024';
```
to something secure. This is client-side only — fine for a private study tool.
