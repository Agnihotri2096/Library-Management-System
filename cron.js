const cron       = require('node-cron');
const nodemailer  = require('nodemailer');
const { db, FINE_PER_DAY } = require('./db');
require('dotenv').config();

/* ── Mailer ── */
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendReminderEmail(to, name, bookTitle, dueDate, type, fine = 0) {
  if (!process.env.SMTP_USER) {
    console.log(`📧 [DEMO] ${type.toUpperCase()} reminder → ${to} | "${bookTitle}"`);
    return;
  }

  const subjects = {
    '3day':   `📚 Book Due in 3 Days: ${bookTitle}`,
    '1day':   `⚠️  Book Due Tomorrow: ${bookTitle}`,
    'due':    `🚨 Book Due TODAY: ${bookTitle}`,
    'overdue':`❌ Overdue Book: ${bookTitle} — Fine ₹${fine}`,
  };

  const messages = {
    '3day':   `Your book "<b>${bookTitle}</b>" is due on <b>${new Date(dueDate).toLocaleDateString('en-IN')}</b>. Please return it on time to avoid fines.`,
    '1day':   `Your book "<b>${bookTitle}</b>" is due <b>TOMORROW</b> (${new Date(dueDate).toLocaleDateString('en-IN')}). Visit the library before closing time.`,
    'due':    `Your book "<b>${bookTitle}</b>" is due <b>TODAY</b>. Please return it immediately to avoid a fine of ₹${FINE_PER_DAY}/day.`,
    'overdue':`Your book "<b>${bookTitle}</b>" was due on ${new Date(dueDate).toLocaleDateString('en-IN')}. <br>Current fine: <b>₹${fine}</b> (₹${FINE_PER_DAY}/day). Return immediately to stop accruing fines.`,
  };

  await transporter.sendMail({
    from: `"Library — College LMS" <${process.env.SMTP_USER}>`,
    to,
    subject: subjects[type],
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0a0e1a;color:#e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px;">
          <h1 style="margin:0;font-size:22px;color:#fff;">📚 Library Management System</h1>
        </div>
        <div style="padding:32px;">
          <p style="font-size:18px;font-weight:600;margin-bottom:8px;color:#f1f5f9;">Hello, ${name}!</p>
          <p style="font-size:15px;line-height:1.7;color:#94a3b8;">${messages[type]}</p>
          <div style="background:#1e2235;padding:20px;border-radius:12px;margin:24px 0;border-left:4px solid #6366f1;">
            <p style="margin:0 0 8px;color:#e2e8f0;"><b>Book:</b> ${bookTitle}</p>
            <p style="margin:0 0 8px;color:#e2e8f0;"><b>Due Date:</b> ${new Date(dueDate).toLocaleDateString('en-IN')}</p>
            ${fine > 0 ? `<p style="margin:0;color:#f87171;"><b>Current Fine:</b> ₹${fine}</p>` : ''}
          </div>
          <p style="color:#64748b;font-size:13px;">Log in to your student portal to view all your issued books.</p>
        </div>
      </div>
    `,
  }).catch(err => console.error(`Email failed for ${to}:`, err.message));
}

/* ── Mark issues overdue ── */
function markOverdue() {
  const { changes } = db.prepare(`
    UPDATE issued_books SET status='overdue'
    WHERE status='active' AND due_date < datetime('now')
  `).run();
  if (changes) console.log(`📋 Marked ${changes} issue(s) as overdue`);
}

/* ── Send daily reminders ── */
async function sendReminders() {
  const now   = new Date();
  const today = now.toISOString().slice(0, 10);

  const issues = db.prepare(`
    SELECT ib.id, ib.due_date, ib.status,
           s.name, s.email,
           b.title
    FROM issued_books ib
    JOIN students s ON ib.student_id = s.id
    JOIN books    b ON ib.book_id    = b.id
    WHERE ib.status IN ('active','overdue')
  `).all();

  for (const issue of issues) {
    const due      = new Date(issue.due_date);
    const daysLeft = Math.ceil((due - now) / 86400000);

    let type = null;
    let fine = 0;

    if      (daysLeft === 3)  type = '3day';
    else if (daysLeft === 1)  type = '1day';
    else if (daysLeft === 0)  type = 'due';
    else if (daysLeft <  0) { type = 'overdue'; fine = Math.abs(daysLeft) * FINE_PER_DAY; }

    if (!type) continue;

    // Avoid duplicate sends on the same day
    const already = db.prepare(`
      SELECT id FROM reminders
      WHERE issue_id=? AND reminder_type=? AND DATE(sent_at)=?
    `).get(issue.id, type, today);

    if (already) continue;

    await sendReminderEmail(issue.email, issue.name, issue.title, issue.due_date, type, fine);
    db.prepare('INSERT INTO reminders (issue_id,reminder_type) VALUES (?,?)').run(issue.id, type);
  }
}

/* ── Scheduled jobs ── */
// Daily at 9:00 AM IST
cron.schedule('0 9 * * *', async () => {
  console.log('⏰ Daily reminder job running...');
  markOverdue();
  await sendReminders();
}, { timezone: 'Asia/Kolkata' });

// Overdue check every hour
cron.schedule('0 * * * *', markOverdue);

console.log('⏰ Cron jobs scheduled (reminders @ 9 AM IST, overdue check hourly)');

module.exports = { sendReminderEmail };
