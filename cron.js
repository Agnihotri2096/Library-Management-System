const cron      = require('node-cron');
const nodemailer = require('nodemailer');
const { db, FINE_PER_DAY } = require('./db');
require('dotenv').config();

/* ── Mailer (supports EMAIL_USER/PASS or SMTP_USER/PASS) ── */
const smtpUser = process.env.EMAIL_USER || process.env.SMTP_USER;
const smtpPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: smtpUser, pass: smtpPass },
});

const APP_URL = process.env.CLIENT_URL || 'https://library-management-system-kappa-lime.vercel.app';

/* ── Beautiful HTML email ── */
function buildEmailHTML({ name, bookTitle, dueDate, type, fine }) {
  const dueFmt = new Date(dueDate).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });

  const bannerColor = {
    '3day':   '#7c3aed',
    '1day':   '#f59e0b',
    'due':    '#ef4444',
    'overdue':'#dc2626',
  }[type] || '#7c3aed';

  const icon = { '3day':'📅', '1day':'⚠️', 'due':'🚨', 'overdue':'❌' }[type];

  const headline = {
    '3day':   `Due in 3 Days`,
    '1day':   `Due Tomorrow`,
    'due':    `Due TODAY`,
    'overdue':`Overdue — Fine Accruing`,
  }[type];

  const body = {
    '3day':   `Your book <b>"${bookTitle}"</b> is due on <b>${dueFmt}</b>. Please return it on time to avoid a fine of ₹${FINE_PER_DAY}/day.`,
    '1day':   `Your book <b>"${bookTitle}"</b> is due <b>tomorrow (${dueFmt})</b>. Visit the library before closing time.`,
    'due':    `Your book <b>"${bookTitle}"</b> is due <b>TODAY</b>. Please return it immediately to avoid fines of ₹${FINE_PER_DAY}/day.`,
    'overdue':`Your book <b>"${bookTitle}"</b> was due on ${dueFmt}.<br>Current fine: <b style="color:#f87171">₹${fine}</b> (₹${FINE_PER_DAY}/day). Return immediately to stop accruing more.`,
  }[type];

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#0a0e1a;font-family:'Segoe UI',Inter,Arial,sans-serif;">
  <div style="max-width:540px;margin:0 auto;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,${bannerColor},${bannerColor}cc);padding:28px 32px;">
      <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,.7);margin-bottom:6px;">
        Govt. Hydro Engineering College · GHEC Library
      </div>
      <div style="font-size:24px;font-weight:800;color:#fff;">${icon} ${headline}</div>
    </div>

    <!-- Body -->
    <div style="background:#111827;padding:32px;">
      <p style="font-size:17px;font-weight:600;color:#f1f5f9;margin:0 0 12px;">Hello, ${name}!</p>
      <p style="font-size:15px;line-height:1.75;color:#94a3b8;margin:0 0 24px;">${body}</p>

      <!-- Book card -->
      <div style="background:#1e2235;border-radius:12px;padding:20px 24px;border-left:4px solid ${bannerColor};margin-bottom:28px;">
        <div style="font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:10px;">Book Details</div>
        <div style="font-size:16px;font-weight:700;color:#e2e8f0;margin-bottom:4px;">${bookTitle}</div>
        <div style="font-size:13.5px;color:#94a3b8;">Due Date: ${dueFmt}</div>
        ${fine > 0 ? `<div style="font-size:14px;color:#f87171;font-weight:700;margin-top:8px;">Fine: ₹${fine}</div>` : ''}
      </div>

      <!-- CTA -->
      <a href="${APP_URL}/student/login"
        style="display:inline-block;background:${bannerColor};color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;margin-bottom:28px;">
        View My Library Portal →
      </a>

      <p style="font-size:12px;color:#475569;border-top:1px solid rgba(255,255,255,.07);padding-top:20px;margin:0;">
        This is an automated reminder from the GHEC Library System.<br>
        Bandla, Bilaspur, Himachal Pradesh · <a href="https://ghec.ac.in" style="color:#7c3aed;">ghec.ac.in</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

/* ── Send one reminder ── */
async function sendReminderEmail(to, name, bookTitle, dueDate, type, fine = 0) {
  if (!smtpUser) {
    console.log(`📧 [DEMO — no EMAIL_USER set] ${type} reminder → ${to} | "${bookTitle}"`);
    return;
  }

  const subjects = {
    '3day':   `📅 Book Due in 3 Days: ${bookTitle} — GHEC Library`,
    '1day':   `⚠️  Book Due Tomorrow: ${bookTitle} — GHEC Library`,
    'due':    `🚨 Return TODAY: ${bookTitle} — GHEC Library`,
    'overdue':`❌ Overdue: ${bookTitle} — Fine ₹${fine} — GHEC Library`,
  };

  await transporter.sendMail({
    from:    `"GHEC Library" <${smtpUser}>`,
    to,
    subject: subjects[type],
    html:    buildEmailHTML({ name, bookTitle, dueDate, type, fine }),
  }).catch(err => console.error(`❌ Email failed for ${to}:`, err.message));

  console.log(`📧 Sent ${type} reminder → ${to}`);
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

  let sent = 0;
  for (const issue of issues) {
    const due      = new Date(issue.due_date);
    const daysLeft = Math.ceil((due - now) / 86400000);

    let type = null;
    let fine = 0;

    if      (daysLeft === 3)  type = '3day';
    else if (daysLeft === 1)  type = '1day';
    else if (daysLeft === 0)  type = 'due';
    else if (daysLeft  <  0) { type = 'overdue'; fine = Math.abs(daysLeft) * FINE_PER_DAY; }

    if (!type) continue;

    // Avoid duplicate sends on the same day
    const already = db.prepare(`
      SELECT id FROM reminders
      WHERE issue_id=? AND reminder_type=? AND DATE(sent_at)=?
    `).get(issue.id, type, today);

    if (already) continue;

    await sendReminderEmail(issue.email, issue.name, issue.title, issue.due_date, type, fine);
    db.prepare('INSERT INTO reminders (issue_id,reminder_type) VALUES (?,?)').run(issue.id, type);
    sent++;
  }
  console.log(`📧 Reminder run complete — ${sent} email(s) sent`);
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
