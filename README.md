# 📚 GHEC Library — Digital Library Management System

A full-stack digital library system for issuing books via QR scan, tracking due dates, calculating fines, and managing student digital ID cards.

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

## 📄 Licence

MIT — free to use for educational and institutional purposes.
