const express   = require('express');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const path      = require('path');
const cors      = require('cors');
require('dotenv').config();

const { db, initDB, FINE_PER_DAY } = require('./db');

const app        = express();
const PORT       = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'lms_secret_2024_change_me';

app.use(express.json());

// CORS — allow the Vercel frontend (or any origin in dev)
const ALLOWED_ORIGINS = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174']
  : true;  // true = allow all (dev)
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}));

// Serve built React app in production (only when not split-deployed)
if (process.env.SERVE_CLIENT === 'true') {
  app.use(express.static(path.join(__dirname, 'client', 'dist')));
}

/* ── Health check (used by UptimeRobot to keep backend warm) ── */
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

/* ══════════════════════════════════════
   AUTH MIDDLEWARE
══════════════════════════════════════ */
const authenticate = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalid or expired' });
  }
};

const isLibrarian = (req, res, next) =>
  req.user?.role === 'librarian' ? next() : res.status(403).json({ error: 'Librarian access required' });

/* ══════════════════════════════════════
   AUTH ROUTES
══════════════════════════════════════ */

// Student → Register
app.post('/api/auth/student/register', async (req, res) => {
  try {
    const { id, name, email, branch, semester, phone, password } = req.body;
    if (!id || !name || !email || !branch || !password)
      return res.status(400).json({ error: 'id, name, email, branch, password are required' });

    if (!['CSE','EE','Civil'].includes(branch))
      return res.status(400).json({ error: 'Branch must be CSE, EE or Civil' });

    const exists = db.prepare('SELECT id FROM students WHERE id=? OR email=?').get(id, email);
    if (exists) return res.status(409).json({ error: 'Student ID or email already registered' });

    const hash = await bcrypt.hash(password, 10);
    db.prepare(`
      INSERT INTO students (id,name,email,branch,semester,phone,password_hash)
      VALUES (?,?,?,?,?,?,?)
    `).run(id, name, email, branch, semester || 1, phone || '', hash);

    const token = jwt.sign({ id, role:'student', name, email, branch }, JWT_SECRET, { expiresIn:'7d' });
    res.json({ token, student: { id, name, email, branch, semester: semester||1, role:'student' } });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT')
      return res.status(409).json({ error: 'Student ID or email already registered' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Student → Login
app.post('/api/auth/student/login', async (req, res) => {
  try {
    const { id, password } = req.body;
    const s = db.prepare('SELECT * FROM students WHERE id=?').get(id);
    if (!s || !(await bcrypt.compare(password, s.password_hash)))
      return res.status(401).json({ error: 'Invalid student ID or password' });

    const token = jwt.sign(
      { id: s.id, role:'student', name: s.name, email: s.email, branch: s.branch },
      JWT_SECRET, { expiresIn:'7d' }
    );
    res.json({ token, student: { id:s.id, name:s.name, email:s.email, branch:s.branch, semester:s.semester, role:'student' } });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// Librarian → Login
app.post('/api/auth/librarian/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const l = db.prepare('SELECT * FROM librarians WHERE email=?').get(email);
    if (!l || !(await bcrypt.compare(password, l.password_hash)))
      return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      { id: l.id, role:'librarian', name: l.name, email: l.email },
      JWT_SECRET, { expiresIn:'12h' }
    );
    res.json({ token, librarian: { id:l.id, name:l.name, email:l.email, role:'librarian' } });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

/* ══════════════════════════════════════
   STUDENT ROUTES
══════════════════════════════════════ */

// Get own profile
app.get('/api/students/me', authenticate, (req, res) => {
  const s = db.prepare(
    'SELECT id,name,email,branch,semester,phone,card_theme,card_avatar,card_font,card_border,created_at FROM students WHERE id=?'
  ).get(req.user.id);
  if (!s) return res.status(404).json({ error: 'Student not found' });
  res.json(s);
});

// Update card customisation
app.put('/api/students/me/card', authenticate, (req, res) => {
  const { card_theme, card_avatar, card_font, card_border } = req.body;
  db.prepare('UPDATE students SET card_theme=?,card_avatar=?,card_font=?,card_border=? WHERE id=?')
    .run(card_theme, card_avatar, card_font, card_border, req.user.id);
  res.json({ success: true });
});

// Get own issued books
app.get('/api/students/me/books', authenticate, (req, res) => {
  const books = db.prepare(`
    SELECT ib.id, ib.issued_at, ib.due_date, ib.returned_at, ib.status, ib.fine_amount,
           b.title, b.author, b.isbn, b.category, b.cover_color, b.shelf_location
    FROM issued_books ib
    JOIN books b ON ib.book_id = b.id
    WHERE ib.student_id=?
    ORDER BY ib.issued_at DESC
  `).all(req.user.id);

  const now = new Date();
  books.forEach(book => {
    if (book.status !== 'returned' && new Date(book.due_date) < now) {
      const d = Math.ceil((now - new Date(book.due_date)) / 86400000);
      book.fine_amount = d * FINE_PER_DAY;
      book.status      = 'overdue';
      book.days_overdue = d;
    }
  });
  res.json(books);
});

// Get notifications
app.get('/api/students/me/notifications', authenticate, (req, res) => {
  const now = new Date();
  const active = db.prepare(`
    SELECT ib.id, ib.due_date, b.title
    FROM issued_books ib
    JOIN books b ON ib.book_id=b.id
    WHERE ib.student_id=? AND ib.status IN ('active','overdue')
    ORDER BY ib.due_date ASC
  `).all(req.user.id);

  const notifs = active.map(book => {
    const days = Math.ceil((new Date(book.due_date) - now) / 86400000);
    if (days < 0)  return { ...book, type:'overdue', message:`"${book.title}" is ${Math.abs(days)} day(s) overdue!`, priority:'high' };
    if (days <= 3) return { ...book, type:'warning',  message:`"${book.title}" due in ${days} day(s)`, priority:'medium' };
    return null;
  }).filter(Boolean);

  res.json(notifs);
});

/* ══════════════════════════════════════
   BOOKS ROUTES
══════════════════════════════════════ */

app.get('/api/books', authenticate, (req, res) => {
  const { search, category } = req.query;
  let q = 'SELECT * FROM books', params = [], conds = [];
  if (search)   { conds.push('(title LIKE ? OR author LIKE ? OR isbn LIKE ?)'); params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
  if (category) { conds.push('category=?'); params.push(category); }
  if (conds.length) q += ' WHERE ' + conds.join(' AND ');
  q += ' ORDER BY title';
  res.json(db.prepare(q).all(...params));
});

app.get('/api/books/:id', authenticate, (req, res) => {
  const b = db.prepare('SELECT * FROM books WHERE id=?').get(req.params.id);
  if (!b) return res.status(404).json({ error: 'Book not found' });
  res.json(b);
});

app.post('/api/books', authenticate, isLibrarian, (req, res) => {
  const { id, title, author, isbn, total_copies, shelf_location, category, cover_color } = req.body;
  if (!id || !title || !author) return res.status(400).json({ error: 'id, title, author required' });
  try {
    db.prepare(`
      INSERT INTO books (id,title,author,isbn,total_copies,available_copies,shelf_location,category,cover_color)
      VALUES (?,?,?,?,?,?,?,?,?)
    `).run(id, title, author, isbn||'', total_copies||1, total_copies||1, shelf_location||'', category||'General', cover_color||'#6366f1');
    res.json({ success:true, id });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'Book ID already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/books/:id', authenticate, isLibrarian, (req, res) => {
  const { title, author, isbn, total_copies, shelf_location, category, cover_color } = req.body;
  db.prepare(`
    UPDATE books SET title=?,author=?,isbn=?,total_copies=?,shelf_location=?,category=?,cover_color=? WHERE id=?
  `).run(title,author,isbn,total_copies,shelf_location,category,cover_color, req.params.id);
  res.json({ success:true });
});

app.delete('/api/books/:id', authenticate, isLibrarian, (req, res) => {
  const active = db.prepare("SELECT id FROM issued_books WHERE book_id=? AND status!='returned'").get(req.params.id);
  if (active) return res.status(400).json({ error: 'Cannot delete — book currently issued to a student' });
  db.prepare('DELETE FROM books WHERE id=?').run(req.params.id);
  res.json({ success:true });
});

/* ══════════════════════════════════════
   ISSUE / RETURN ROUTES
══════════════════════════════════════ */

// Issue a book
app.post('/api/issues', authenticate, isLibrarian, (req, res) => {
  const { student_id, book_id } = req.body;

  const student = db.prepare('SELECT * FROM students WHERE id=?').get(student_id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const book = db.prepare('SELECT * FROM books WHERE id=?').get(book_id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  if (book.available_copies < 1) return res.status(400).json({ error: 'No copies available right now' });

  const dup = db.prepare("SELECT id FROM issued_books WHERE student_id=? AND book_id=? AND status!='returned'").get(student_id, book_id);
  if (dup) return res.status(400).json({ error: 'Student already has this book issued' });

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO issued_books (student_id,book_id,due_date,status) VALUES (?,?,?,'active')
  `).run(student_id, book_id, dueDate.toISOString());

  db.prepare('UPDATE books SET available_copies=available_copies-1 WHERE id=?').run(book_id);

  res.json({
    success:   true,
    issue_id:  lastInsertRowid,
    due_date:  dueDate.toISOString(),
    student:   { id:student.id, name:student.name, branch:student.branch },
    book:      { id:book.id, title:book.title, author:book.author },
  });
});

// Lookup active issue by book ID (for return flow)
app.get('/api/issues/book/:bookId', authenticate, isLibrarian, (req, res) => {
  const issue = db.prepare(`
    SELECT ib.*, s.name AS student_name, s.branch AS student_branch, s.email AS student_email,
           b.title AS book_title, b.author AS book_author
    FROM issued_books ib
    JOIN students s ON ib.student_id=s.id
    JOIN books    b ON ib.book_id   =b.id
    WHERE ib.book_id=? AND ib.status!='returned'
    ORDER BY ib.issued_at DESC LIMIT 1
  `).get(req.params.bookId);

  if (!issue) return res.status(404).json({ error: 'No active issue found for this book' });

  const now = new Date();
  if (new Date(issue.due_date) < now) {
    const d = Math.ceil((now - new Date(issue.due_date)) / 86400000);
    issue.days_overdue = d;
    issue.fine_amount  = d * FINE_PER_DAY;
    issue.status       = 'overdue';
  }
  res.json(issue);
});

// Lookup active issue by student ID
app.get('/api/issues/student-active/:studentId', authenticate, isLibrarian, (req, res) => {
  const issues = db.prepare(`
    SELECT ib.*, b.title AS book_title, b.author AS book_author, b.cover_color
    FROM issued_books ib
    JOIN books b ON ib.book_id=b.id
    WHERE ib.student_id=? AND ib.status!='returned'
    ORDER BY ib.issued_at DESC
  `).all(req.params.studentId);
  res.json(issues);
});

// Mark as returned
app.put('/api/issues/:id/return', authenticate, isLibrarian, (req, res) => {
  const issue = db.prepare('SELECT * FROM issued_books WHERE id=?').get(req.params.id);
  if (!issue)                       return res.status(404).json({ error: 'Issue record not found' });
  if (issue.status === 'returned')  return res.status(400).json({ error: 'Book already returned' });

  const now  = new Date();
  const due  = new Date(issue.due_date);
  const fine = now > due ? Math.ceil((now - due) / 86400000) * FINE_PER_DAY : 0;

  db.prepare(`
    UPDATE issued_books SET status='returned', returned_at=?, fine_amount=? WHERE id=?
  `).run(now.toISOString(), fine, req.params.id);

  db.prepare('UPDATE books SET available_copies=available_copies+1 WHERE id=?').run(issue.book_id);

  res.json({ success:true, fine_amount:fine });
});

/* ══════════════════════════════════════
   LIBRARIAN — DASHBOARD & MANAGEMENT
══════════════════════════════════════ */

// Stats
app.get('/api/librarian/stats', authenticate, isLibrarian, (req, res) => {
  const today = new Date().toISOString().slice(0,10);
  res.json({
    totalBooks:    db.prepare('SELECT COUNT(*) c FROM books').get().c,
    totalStudents: db.prepare('SELECT COUNT(*) c FROM students').get().c,
    issuedToday:   db.prepare("SELECT COUNT(*) c FROM issued_books WHERE DATE(issued_at)=?").get(today).c,
    activeIssues:  db.prepare("SELECT COUNT(*) c FROM issued_books WHERE status='active'").get().c,
    overdueCount:  db.prepare("SELECT COUNT(*) c FROM issued_books WHERE status!='returned' AND due_date < datetime('now')").get().c,
    branchStats:   db.prepare(`
      SELECT s.branch,
             COUNT(DISTINCT s.id)                                   AS students,
             COUNT(CASE WHEN ib.status!='returned' THEN 1 END)      AS active_issues
      FROM students s
      LEFT JOIN issued_books ib ON s.id=ib.student_id
      GROUP BY s.branch
    `).all(),
    recentActivity: db.prepare(`
      SELECT ib.id, ib.issued_at, ib.returned_at, ib.status,
             s.name AS student_name, s.branch AS student_branch,
             b.title AS book_title
      FROM issued_books ib
      JOIN students s ON ib.student_id=s.id
      JOIN books    b ON ib.book_id   =b.id
      ORDER BY ib.issued_at DESC LIMIT 10
    `).all(),
  });
});

// Students (branch-wise, searchable)
app.get('/api/librarian/students', authenticate, isLibrarian, (req, res) => {
  const { branch, search } = req.query;
  let q = `
    SELECT s.id, s.name, s.email, s.branch, s.semester, s.phone, s.created_at,
           COUNT(CASE WHEN ib.status='active'   THEN 1 END) AS active_books,
           COUNT(CASE WHEN ib.status='overdue'  THEN 1 END) AS overdue_books
    FROM students s
    LEFT JOIN issued_books ib ON s.id=ib.student_id
  `, params = [], conds = [];
  if (branch && branch !== 'all') { conds.push('s.branch=?'); params.push(branch); }
  if (search) {
    conds.push('(s.name LIKE ? OR s.id LIKE ? OR s.email LIKE ?)');
    params.push(`%${search}%`,`%${search}%`,`%${search}%`);
  }
  if (conds.length) q += ' WHERE ' + conds.join(' AND ');
  q += ' GROUP BY s.id ORDER BY s.branch, s.name';
  res.json(db.prepare(q).all(...params));
});

// Single student detail
app.get('/api/librarian/students/:id', authenticate, isLibrarian, (req, res) => {
  const s = db.prepare(
    'SELECT id,name,email,branch,semester,phone,created_at FROM students WHERE id=?'
  ).get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Student not found' });

  const books = db.prepare(`
    SELECT ib.id, ib.issued_at, ib.due_date, ib.returned_at, ib.status, ib.fine_amount,
           b.title, b.author, b.isbn, b.cover_color
    FROM issued_books ib
    JOIN books b ON ib.book_id=b.id
    WHERE ib.student_id=?
    ORDER BY ib.issued_at DESC
  `).all(req.params.id);

  res.json({ ...s, books });
});

// All issues (librarian)
app.get('/api/librarian/issues', authenticate, isLibrarian, (req, res) => {
  const { status } = req.query;
  let q = `
    SELECT ib.id, ib.issued_at, ib.due_date, ib.returned_at, ib.status, ib.fine_amount,
           s.id AS student_id, s.name AS student_name, s.branch AS student_branch,
           b.id AS book_id, b.title AS book_title, b.author AS book_author
    FROM issued_books ib
    JOIN students s ON ib.student_id=s.id
    JOIN books    b ON ib.book_id   =b.id
  `;
  if (status) q += ` WHERE ib.status='${status}'`;
  q += ' ORDER BY ib.issued_at DESC LIMIT 200';

  const issues = db.prepare(q).all();
  const now = new Date();
  issues.forEach(i => {
    if (i.status !== 'returned' && new Date(i.due_date) < now) {
      i.fine_amount = Math.ceil((now - new Date(i.due_date)) / 86400000) * FINE_PER_DAY;
      i.status      = 'overdue';
    }
  });
  res.json(issues);
});

/* ── SPA fallback — only in monolith mode (SERVE_CLIENT=true) ── */
if (process.env.SERVE_CLIENT === 'true') {
  app.use((req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
  });
} else {
  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
}

/* ── Boot ── */
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🏛️  Library Management System`);
    console.log(`🚀  http://localhost:${PORT}`);
    console.log(`📚  Fine: ₹${FINE_PER_DAY}/day | Loan: 14 days\n`);
  });
  require('./cron');
});

module.exports = app;
