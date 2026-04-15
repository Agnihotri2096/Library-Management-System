const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

// Use /data/library.db on Render (persistent disk), or DB_PATH env var, else local
const dbPath = process.env.DB_PATH
  || (process.env.NODE_ENV === 'production' ? '/data/library.db' : path.join(__dirname, 'library.db'));
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const FINE_PER_DAY = parseFloat(process.env.FINE_PER_DAY || '2');

async function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      branch TEXT NOT NULL CHECK(branch IN ('CSE','EE','Civil')),
      semester INTEGER DEFAULT 1,
      phone TEXT DEFAULT '',
      password_hash TEXT NOT NULL,
      card_theme TEXT DEFAULT 'neon',
      card_avatar TEXT DEFAULT '🎓',
      card_font TEXT DEFAULT 'Inter',
      card_border TEXT DEFAULT 'glow',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS librarians (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      isbn TEXT,
      total_copies INTEGER DEFAULT 1,
      available_copies INTEGER DEFAULT 1,
      shelf_location TEXT DEFAULT '',
      category TEXT DEFAULT 'General',
      cover_color TEXT DEFAULT '#6366f1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS issued_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL REFERENCES students(id),
      book_id TEXT NOT NULL REFERENCES books(id),
      issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      due_date DATETIME NOT NULL,
      returned_at DATETIME,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','returned','overdue')),
      fine_amount REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER REFERENCES issued_books(id),
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reminder_type TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_issued_student ON issued_books(student_id);
    CREATE INDEX IF NOT EXISTS idx_issued_book    ON issued_books(book_id);
    CREATE INDEX IF NOT EXISTS idx_issued_status  ON issued_books(status);
    CREATE INDEX IF NOT EXISTS idx_students_branch ON students(branch);
  `);

  /* ── Seed librarians ── */
  const libCount = db.prepare('SELECT COUNT(*) as c FROM librarians').get().c;
  if (libCount === 0) {
    const h1 = await bcrypt.hash('admin123', 10);
    const h2 = await bcrypt.hash('lib123', 10);
    db.prepare('INSERT INTO librarians (name,email,password_hash) VALUES (?,?,?)')
      .run('Admin Librarian',  'admin@library.com',       h1);
    db.prepare('INSERT INTO librarians (name,email,password_hash) VALUES (?,?,?)')
      .run('Main Librarian',   'librarian@college.com',   h2);
    console.log('✅ Seeded librarians → admin@library.com / admin123');
  }

  /* ── Seed books ── */
  const bookCount = db.prepare('SELECT COUNT(*) as c FROM books').get().c;
  if (bookCount === 0) {
    const books = [
      // CSE
      { id:'BK001', title:'Introduction to Algorithms',    author:'CLRS',               isbn:'978-0262033848', cat:'CSE',     shelf:'A-01', color:'#6366f1', copies:3 },
      { id:'BK002', title:'Computer Networks',             author:'Andrew Tanenbaum',   isbn:'978-0132126953', cat:'CSE',     shelf:'A-02', color:'#8b5cf6', copies:2 },
      { id:'BK003', title:'Operating System Concepts',     author:'Silberschatz',       isbn:'978-1119320913', cat:'CSE',     shelf:'A-03', color:'#0284c7', copies:2 },
      { id:'BK004', title:'Database System Concepts',      author:'Silberschatz',       isbn:'978-0073523323', cat:'CSE',     shelf:'A-04', color:'#0891b2', copies:2 },
      { id:'BK005', title:'Clean Code',                    author:'Robert C. Martin',   isbn:'978-0132350884', cat:'CSE',     shelf:'A-05', color:'#059669', copies:1 },
      // EE
      { id:'BK006', title:'Electronic Devices & Circuits', author:'Boylestad',          isbn:'978-0132622264', cat:'EE',      shelf:'B-01', color:'#d97706', copies:3 },
      { id:'BK007', title:'Signals and Systems',           author:'Oppenheim',          isbn:'978-0138147570', cat:'EE',      shelf:'B-02', color:'#b45309', copies:2 },
      { id:'BK008', title:'Power Systems Analysis',        author:'Stevenson',          isbn:'978-0070612990', cat:'EE',      shelf:'B-03', color:'#dc2626', copies:2 },
      { id:'BK009', title:'Control Systems Engineering',   author:'Norman Nise',        isbn:'978-1118170519', cat:'EE',      shelf:'B-04', color:'#c2410c', copies:1 },
      // Civil
      { id:'BK010', title:'Structural Analysis',           author:'R.C. Hibbeler',      isbn:'978-0134610672', cat:'Civil',   shelf:'C-01', color:'#16a34a', copies:3 },
      { id:'BK011', title:'Soil Mechanics',                author:'Das & Sivakugan',    isbn:'978-1305970939', cat:'Civil',   shelf:'C-02', color:'#15803d', copies:2 },
      { id:'BK012', title:'Fluid Mechanics',               author:'Frank White',        isbn:'978-0073398273', cat:'Civil',   shelf:'C-03', color:'#0369a1', copies:2 },
      // General
      { id:'BK013', title:'Engineering Mathematics',       author:'H.K. Dass',          isbn:'978-8121914307', cat:'General', shelf:'D-01', color:'#7c3aed', copies:4 },
      { id:'BK014', title:'Discrete Mathematics',          author:'Kenneth Rosen',      isbn:'978-0073383095', cat:'General', shelf:'D-02', color:'#a21caf', copies:3 },
    ];

    const ins = db.prepare(`
      INSERT INTO books (id,title,author,isbn,total_copies,available_copies,shelf_location,category,cover_color)
      VALUES (?,?,?,?,?,?,?,?,?)
    `);
    books.forEach(b => ins.run(b.id, b.title, b.author, b.isbn, b.copies, b.copies, b.shelf, b.cat, b.color));
    console.log(`✅ Seeded ${books.length} books`);
  }

  console.log('✅ Database ready →', dbPath);
}

module.exports = { db, initDB, FINE_PER_DAY };
