# 📚 GHEC Library — Digital Library Management System

> **Government Hydro Engineering College, Bandla, Bilaspur — Himachal Pradesh**  
> [ghec.ac.in](https://ghec.ac.in) · AICTE Approved · HPTU Affiliated

A full-stack digital library system for issuing books via QR scan, tracking due dates, calculating fines, and managing student digital ID cards.

---

## ✨ Features

### Librarian Portal
- 📊 Dashboard with live stats (books out, overdue count, branch-wise breakdown)
- 📷 QR scan + manual issue flow (3-step: student → book → confirm)
- ↩️ Return books with automatic fine calculation (₹2/day)
- 👥 Branch-wise student browser with full issue history
- 📖 Book inventory — add, label, print QR codes

### Student Portal
- 📋 View currently issued books with due-date progress bar
- 🚨 Overdue alerts with live fine amount
- 🎴 Customisable 3D digital ID card (6 themes, emoji avatar, 5 fonts)
- ⬇️ Download ID card as PNG
- 📱 QR code on back of card — librarian scans to issue

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router v6 |
| Styling | Vanilla CSS (custom design system) |
| Backend | Node.js, Express.js |
| Database | SQLite via `better-sqlite3` |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| QR | `html5-qrcode` (scan) + `qrcode.react` (generate) |
| Email | Nodemailer (overdue reminders via cron) |
| ID Card download | html2canvas |

---

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js ≥ 18
- npm

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/ghec-library.git
cd ghec-library

# 2. Install backend dependencies
npm install

# 3. Install frontend dependencies
cd client && npm install && cd ..

# 4. Create env file
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET

# 5. Start backend (port 3000)
npm start

# 6. In a new terminal — start frontend (port 5173)
npm run dev:client
```

Open **http://localhost:5173**

### Default Credentials

| Portal | Email | Password |
|--------|-------|----------|
| Librarian (Admin) | `admin@library.com` | `admin123` |
| Librarian | `librarian@college.com` | `lib123` |
| Student | Register at `/student/register` | — |

---

## 🌐 Deployment

**Architecture:** Vercel (frontend) + Render.com (backend + SQLite)

### 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ghec-library.git
git push -u origin main
```

### 2 — Deploy Backend on Render.com

1. [render.com](https://render.com) → **New → Web Service** → Connect `ghec-library`
2. Settings:

   | Field | Value |
   |-------|-------|
   | Runtime | `Node` |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Plan | Free |

3. **Add Persistent Disk** → Mount Path: `/data` · Size: `1 GB`
4. **Environment Variables:**

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | *(click Generate)* |
   | `CLIENT_URL` | *(your Vercel URL — set after step 3)* |

5. Deploy → copy your URL e.g. `https://ghec-library-api.onrender.com`
6. Test: `https://ghec-library-api.onrender.com/api/health` → `{"status":"ok"}`

### 3 — Deploy Frontend on Vercel

1. [vercel.com](https://vercel.com) → **New Project** → Import `ghec-library`
2. **Root Directory:** `client`
3. Framework: `Vite` | Build: `npm run build` | Output: `dist`
4. **Environment Variables:**

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://ghec-library-api.onrender.com` |

5. Deploy → copy your URL e.g. `https://ghec-library.vercel.app`

### 4 — Link Frontend → Backend

On Render: Environment → set `CLIENT_URL` = `https://ghec-library.vercel.app` → Save

### 5 — Keep Backend Always Warm (UptimeRobot)

1. [uptimerobot.com](https://uptimerobot.com) → **Add New Monitor**
2. Type: `HTTP(s)` | URL: `https://ghec-library-api.onrender.com/api/health` | Interval: `5 min`

> This prevents Render's free tier from sleeping — backend stays warm 24/7.

---

## 📁 Project Structure

```
ghec-library/
├── server.js          # Express API server
├── db.js              # SQLite schema + seed data
├── cron.js            # Overdue fine calculator (runs nightly)
├── render.yaml        # Render.com deployment config
├── .env.example       # Environment variable reference
│
└── client/            # React frontend (Vite)
    ├── vercel.json    # Vercel SPA routing config
    ├── src/
    │   ├── App.jsx               # Routes
    │   ├── index.css             # Design system
    │   ├── api.js                # Fetch wrapper
    │   ├── context/
    │   │   └── AuthContext.jsx   # JWT auth state
    │   ├── components/
    │   │   ├── Sidebar.jsx       # Navigation
    │   │   ├── StatCard.jsx      # Animated stat cards
    │   │   ├── BookCard.jsx      # Book item card
    │   │   ├── Modal.jsx         # Portal modal
    │   │   ├── Spinner.jsx       # Loading states
    │   │   ├── EmptyState.jsx    # Empty placeholders
    │   │   └── QRScanner.jsx     # Camera QR reader
    │   ├── pages/
    │   │   ├── Landing.jsx
    │   │   ├── librarian/
    │   │   │   ├── Login.jsx
    │   │   │   ├── Dashboard.jsx
    │   │   │   ├── Scan.jsx      # Issue book flow
    │   │   │   ├── Return.jsx    # Return + fine
    │   │   │   ├── Students.jsx
    │   │   │   └── Books.jsx
    │   │   └── student/
    │   │       ├── Login.jsx
    │   │       ├── Register.jsx
    │   │       ├── Dashboard.jsx
    │   │       └── IDCard.jsx    # 3D ID card
    │   └── hooks/
    │       └── useToast.jsx
    └── public/
```

---

## ⚙️ Environment Variables

### Backend (Render / `.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` on Render |
| `JWT_SECRET` | Yes | Random string for signing tokens |
| `CLIENT_URL` | Yes | Your Vercel URL (for CORS) |
| `PORT` | No | Default: `3000` |
| `DB_PATH` | No | SQLite path (auto: `/data/library.db` on Render) |
| `FINE_PER_DAY` | No | Default: `2` (₹2/day) |
| `EMAIL_USER` | No | Gmail address for overdue alerts |
| `EMAIL_PASS` | No | Gmail App Password |

### Frontend (Vercel / `client/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes (production) | Render backend URL |

---

## 📡 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | None | Health check |
| POST | `/api/auth/librarian/login` | None | Librarian login |
| POST | `/api/auth/student/login` | None | Student login |
| POST | `/api/auth/student/register` | None | Student register |
| GET | `/api/librarian/stats` | Librarian | Dashboard stats |
| GET | `/api/librarian/students` | Librarian | All students |
| GET | `/api/librarian/students/:id` | Librarian | Student + history |
| GET | `/api/books` | Librarian | All books |
| POST | `/api/books` | Librarian | Add book |
| DELETE | `/api/books/:id` | Librarian | Delete book |
| POST | `/api/issues` | Librarian | Issue book |
| GET | `/api/issues/book/:bookId` | Librarian | Get active issue |
| PUT | `/api/issues/:id/return` | Librarian | Return + fine |
| GET | `/api/students/me` | Student | My profile |
| GET | `/api/students/me/books` | Student | My issued books |
| PUT | `/api/students/me/card` | Student | Save card style |

---

## 🏛️ About GHEC

**Government Hydro Engineering College** was established in 2017 at Bandla, Bilaspur (HP) with financial support from NHPC and NTPC. It offers B.Tech programmes in:

- Computer Science & Engineering (AI & Data Science)
- Electrical Engineering
- Civil Engineering

> *"To nurture skilled engineers for the energy sector and other emerging domains."*

---

## 📄 Licence

MIT — free to use for educational and institutional purposes.
