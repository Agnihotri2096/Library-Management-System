/* ── Shared auth + API helpers ── */

const LMS = (() => {
  const TOKEN_KEY = 'lms_token';
  const USER_KEY  = 'lms_user';

  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function getUser()  {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); }
    catch { return null; }
  }
  function isLoggedIn() {
    const t = getToken();
    if (!t) return false;
    try {
      const payload = JSON.parse(atob(t.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    } catch { return false; }
  }
  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = '/';
  }

  async function api(method, endpoint, data = null) {
    const token = getToken();
    const opts  = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
    if (data && method !== 'GET') opts.body = JSON.stringify(data);
    const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint}`;
    const res = await fetch(url, opts);
    const json = await res.json();
    if (res.status === 401) { logout(); throw new Error('Session expired'); }
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json;
  }

  /* ── Toast ── */
  function toast(msg, type = 'info', ms = 4000) {
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span style="font-size:18px">${icons[type]||'ℹ️'}</span>
      <span class="toast-msg">${msg}</span>
      <button class="toast-x" onclick="this.closest('.toast').remove()">×</button>`;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.animation = 'toastOut .3s ease forwards';
      setTimeout(() => el.remove(), 300);
    }, ms);
  }

  /* ── Utilities ── */
  function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  }
  function fmtDT(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
  }
  function daysLeft(due) {
    return Math.ceil((new Date(due) - new Date()) / 86400000);
  }
  function branchBadge(b) {
    const map = { CSE:'badge-cse', EE:'badge-ee', Civil:'badge-civil' };
    return `<span class="badge ${map[b]||'badge-p'}">${b}</span>`;
  }
  function statusBadge(s) {
    const map = { active:'badge-active', overdue:'badge-overdue', returned:'badge-returned' };
    const lbl = { active:'Active', overdue:'Overdue', returned:'Returned' };
    return `<span class="badge ${map[s]||'badge-p'}">${lbl[s]||s}</span>`;
  }

  /* ── Counter animation ── */
  function counter(el, target, dur = 900) {
    const start = performance.now();
    (function update(now) {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = Math.floor(p * p * target); // ease-in
      if (p < 1) requestAnimationFrame(update);
      else el.textContent = target;
    })(start);
  }

  /* ── Auth guards ── */
  function requireStudent() {
    if (!isLoggedIn()) { window.location.href = '/student/login.html'; return null; }
    const u = getUser();
    if (u?.role !== 'student') { window.location.href = '/student/login.html'; return null; }
    return u;
  }
  function requireLibrarian() {
    if (!isLoggedIn()) { window.location.href = '/librarian/login.html'; return null; }
    const u = getUser();
    if (u?.role !== 'librarian') { window.location.href = '/librarian/login.html'; return null; }
    return u;
  }

  /* ── Sidebar mobile toggle ── */
  function initSidebar() {
    const sb  = document.querySelector('.sidebar');
    const bd  = document.querySelector('.sidebar-backdrop');
    const btn = document.querySelector('#menu-toggle');
    if (!sb) return;
    btn?.addEventListener('click', () => { sb.classList.toggle('open'); bd?.classList.toggle('open'); });
    bd?.addEventListener('click',  () => { sb.classList.remove('open'); bd.classList.remove('open'); });
  }

  /* ── Populate user chip in sidebar ── */
  function fillSidebarUser(user) {
    const avEl   = document.querySelector('.user-chip-av');
    const nameEl = document.querySelector('.user-chip-name');
    const roleEl = document.querySelector('.user-chip-role');
    if (avEl)   avEl.textContent   = user.card_avatar || user.name?.[0]?.toUpperCase() || '👤';
    if (nameEl) nameEl.textContent = user.name || user.email;
    if (roleEl) roleEl.textContent = user.role === 'student' ? `${user.branch} • Sem ${user.semester||'—'}` : 'Librarian';
  }

  return { setSession, getToken, getUser, isLoggedIn, logout, api,
           toast, fmtDate, fmtDT, daysLeft, branchBadge, statusBadge,
           counter, requireStudent, requireLibrarian, initSidebar, fillSidebarUser };
})();
