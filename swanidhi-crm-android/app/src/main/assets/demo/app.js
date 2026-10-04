// Swanidhi CRM — offline demo. Staff CRM, student portal and associate portal on dummy data
// (data.js), styled with the Zavtoo app theme. Hash routes, one render() per navigation.
(function () {
  'use strict';
  var app = document.getElementById('app');
  var SESSION_KEY = 'swanidhi_demo_session';
  var DEMO_PASSWORD = 'Demo@12345';
  var DAY = 86400000;
  var db = DB.get();

  // ---------- helpers ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function inr(n) { return '₹' + Math.round(n || 0).toLocaleString('en-IN'); }
  function inrShort(n) {
    if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
    if (n >= 100000) return '₹' + (n / 100000).toFixed(2) + ' L';
    if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
    return inr(n);
  }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function date(d) { d = new Date(d); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function dateShort(d) { d = new Date(d); return d.getDate() + ' ' + MONTHS[d.getMonth()]; }
  function ago(d) {
    var s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 86400 * 7) return Math.floor(s / 86400) + 'd ago';
    return dateShort(d);
  }
  function dayKey(d) { d = new Date(d); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function sameDay(a, b) { return dayKey(a) === dayKey(b); }
  // "Recent" windows are rolling 30 days so the demo never looks empty at the start of a month.
  function thisMonth(d) { var t = new Date(d).getTime(); return t <= Date.now() && Date.now() - t < 30 * DAY; }
  function initials(n) { return n.replace(/^Mohd\.\s*/, '').split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase(); }
  var TINTS = ['t-blue', 't-gold', 't-green', 't-purple', 't-teal', 't-red'];
  function tint(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return TINTS[Math.abs(h) % TINTS.length]; }
  function avatar(name, lg) { return '<div class="avatar ' + (lg ? 'lg ' : '') + tint(name) + '">' + esc(initials(name)) + '</div>'; }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function staff(id) { return byId(db.staff, id) || { name: '—' }; }
  function uid(p) { return p + Date.now().toString(36) + Math.floor(Math.random() * 1000); }
  function save() { DB.save(); }
  function digits(p) { return String(p).replace(/\D/g, ''); }
  function sum(list, f) { return list.reduce(function (a, x) { return a + (f ? f(x) : x); }, 0); }

  var LEAD_STATUS = {
    new: ['New', 't-blue'], contacted: ['Contacted', 't-purple'], interested: ['Interested', 't-gold'],
    counselled: ['Counselled', 't-teal'], document_received: ['Docs Received', 't-teal'], converted: ['Converted', 't-green'],
    lost: ['Lost', 't-red'], dnp: ['DNP', 't-gray'], switch_off: ['Switch Off', 't-gray'], not_reachable: ['Not Reachable', 't-gray'],
    not_interested: ['Not Interested', 't-red'],
  };
  var SOURCE = { website: 'Website', walk_in: 'Walk-in', referral: 'Referral', whatsapp: 'WhatsApp', phone: 'Phone', excel_import: 'Excel Import', social_media: 'Social Media', other: 'Other' };
  var PAY_MODE = { cash: 'Cash', upi: 'UPI', card: 'Card', neft: 'NEFT', rtgs: 'RTGS', cheque: 'Cheque', other: 'Other' };
  var EXP_CAT = { rent: 'Rent', utilities: 'Utilities', marketing: 'Marketing', travel: 'Travel', salary: 'Salary', vendor: 'Vendor', misc: 'Miscellaneous', other: 'Other' };
  var ROLE = { admin: 'Administrator', lead: 'Team Lead', counselor: 'Counsellor', backend: 'Backend / Accounts', housekeeping: 'Housekeeping' };
  function statusPill(s) { var m = LEAD_STATUS[s] || [s, 't-gray']; return '<span class="pill ' + m[1] + '">' + m[0] + '</span>'; }
  function deptName(slug) { var d = SW_DEPTS.filter(function (x) { return x.slug === slug; })[0]; return d ? d.short : slug; }

  // Stroke icons in the Zavtoo icon style (24px grid, round caps).
  var P = {
    home: '<path d="M3.5 10.5L12 4l8.5 6.5V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z"/>',
    users: '<path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="10" cy="8" r="3.5"/><path d="M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.5 4.6a3.5 3.5 0 0 1 0 6.8"/>',
    cap: '<path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5V16c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3v-4.5M21.5 9.5v5"/>',
    rupee: '<path d="M7 4.5h10M7 9h10M7 4.5c5 0 7 1.5 7 4.5S11.5 13.5 7 13.5L15 20"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/>',
    phone: '<path d="M5 4h3.5l1.5 4.5-2 1.5a11 11 0 0 0 6 6l1.5-2 4.5 1.5V19a1.5 1.5 0 0 1-1.5 1.5A15.5 15.5 0 0 1 3.5 5.5 1.5 1.5 0 0 1 5 4z"/>',
    chat: '<path d="M20 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.2A8 8 0 1 1 20 12z"/><path d="M9 10.5c0 2.5 2 4.5 4.5 4.5l1-1.2-1.6-.9-.7.6a3 3 0 0 1-1.7-1.7l.6-.7-.9-1.6z"/>',
    search: '<circle cx="11" cy="11" r="7.5"/><path d="M21 21l-4.6-4.6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    right: '<path d="M9 18l6-6-6-6"/>',
    left: '<path d="M15 18l-6-6 6-6"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="3.5" y="7.5" width="17" height="12" rx="2.5"/><path d="M16 13.5h2"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
    printer: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v6H7z"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10"/>',
    brief: '<rect x="3.5" y="7" width="17" height="12.5" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12.5h17"/>',
    trend: '<path d="M3.5 17l6-6 4 4 7-7.5"/><path d="M15 7.5h5.5V13"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    book: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/>',
    upload: '<path d="M12 16V5M7 9.5l5-5 5 5M5 20h14"/>',
    shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z"/><path d="M8.8 12l2.2 2.2 4.2-4.2"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.2a2.5 2.5 0 0 1 4.9.6c0 1.7-2.5 2-2.5 3.7M12 17h.01"/>',
    swap: '<path d="M7 4L3.5 7.5 7 11M3.5 7.5H17M17 13l3.5 3.5L17 20M20.5 16.5H7"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  };
  function I(name, size, color, w) {
    return '<svg width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="none" stroke="' + (color || 'currentColor') +
      '" stroke-width="' + (w || 1.9) + '" stroke-linecap="round" stroke-linejoin="round">' + P[name] + '</svg>';
  }

  // ---------- session ----------
  function session() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; } }
  function setSession(s) { try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); } catch (e) {} }
  function me() { var s = session(); return s && s.role === 'staff' ? staff(s.id) : null; }

  // ---------- toast / sheet ----------
  var toastTimer;
  function toast(msg, icon) {
    var t = document.getElementById('toast');
    t.innerHTML = (icon ? I(icon, 16, '#f5a623', 2.4) : '') + '<span>' + esc(msg) + '</span>';
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }
  var sheetOpen = false, afterSheet = null;
  var scrim = document.getElementById('scrim'), sheet = document.getElementById('sheet');
  function openSheet(title, html, mount) {
    sheet.innerHTML = '<div class="grab"></div><div class="sh"><h3>' + esc(title) + '</h3><button class="icon-btn" data-act="closeSheet">' + I('x', 22) + '</button></div>' + html;
    scrim.classList.remove('hidden'); sheet.classList.remove('hidden');
    requestAnimationFrame(function () { scrim.classList.add('show'); sheet.classList.add('show'); });
    sheet.scrollTop = 0;
    if (!sheetOpen) history.pushState({ sheet: true }, '');
    sheetOpen = true;
    if (mount) mount(sheet);
  }
  function hideSheet() {
    sheetOpen = false;
    scrim.classList.remove('show'); sheet.classList.remove('show');
    setTimeout(function () { if (!sheetOpen) { scrim.classList.add('hidden'); sheet.classList.add('hidden'); sheet.innerHTML = ''; } }, 280);
    var cb = afterSheet; afterSheet = null;
    if (cb) setTimeout(cb, 0);
  }
  // Closing goes through history so the Android back button and the X behave the same.
  function closeSheet(then) { afterSheet = then || null; if (sheetOpen) history.back(); else if (then) then(); }
  window.addEventListener('popstate', function () { if (sheetOpen) hideSheet(); });
  scrim.addEventListener('click', function () { closeSheet(); });

  // ---------- shells ----------
  var NAV = {
    staff: [['dashboard', 'Home', 'home'], ['leads', 'Leads', 'users'], ['students', 'Students', 'cap'], ['fees', 'Fees', 'rupee'], ['more', 'More', 'grid']],
    student: [['s/home', 'Home', 'home'], ['s/fees', 'Fees', 'rupee'], ['s/docs', 'Documents', 'file'], ['s/support', 'Support', 'help']],
    associate: [['a/home', 'Home', 'home'], ['a/leads', 'Leads', 'users'], ['a/students', 'Students', 'cap'], ['a/wallet', 'Wallet', 'wallet']],
  };
  function shell(o) {
    var s = session();
    var nav = NAV[s.role];
    var unread = db.notifications.filter(function (n) { return !n.read; }).length;
    var left = o.back
      ? '<button class="icon-btn" data-act="back">' + I('left', 24) + '</button>'
      : '<img src="logo.png" alt="">';
    var right = (o.right || '') + (s.role === 'staff' && !o.back
      ? '<button class="icon-btn" data-go="notifications">' + I('bell', 22) + (unread ? '<span class="dot"></span>' : '') + '</button>' : '');
    var active = o.tab || location.hash.slice(2);
    return '<header class="topbar">' + left + '<div class="ttl"><b>' + esc(o.title) + '</b>' + (o.sub ? '<small>' + esc(o.sub) + '</small>' : '') + '</div>' + right + '</header>' +
      '<main class="page fade-in">' + o.body + '</main>' + (o.fab || '') +
      '<nav class="bottomnav">' + nav.map(function (n) {
        return '<a href="#/' + n[0] + '" class="' + (active === n[0] ? 'on' : '') + '"><span class="ic">' + I(n[2], 21) + '</span>' + n[1] + '</a>';
      }).join('') + '</nav>';
  }
  function sec(title, link, href) { return '<div class="sec-h"><h3>' + esc(title) + '</h3>' + (link ? '<a href="#/' + href + '">' + esc(link) + '</a>' : '') + '</div>'; }
  function empty(icon, text) { return '<div class="empty"><div class="ico t-blue">' + I(icon, 32) + '</div>' + esc(text) + '</div>'; }
  function stat(icon, t, value, label, extra) {
    return '<div class="stat"><div class="ico ' + t + '">' + I(icon, 19) + '</div><b>' + value + (extra ? '<em>' + extra + '</em>' : '') + '</b><span>' + esc(label) + '</span></div>';
  }
  function greeting() { var h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }

  // ---------- computed ----------
  function paidFor(st) { return sum(db.payments.filter(function (p) { return p.student === st.id; }), function (p) { return p.amount; }); }
  function firstYearFee(st) { var y = parseFloat(st.duration) || 1; return Math.round(st.totalFee / Math.max(1, Math.round(y))); }
  function dueFor(st) { return Math.max(0, firstYearFee(st) - paidFor(st)); }
  function followupsDue() {
    var end = new Date(); end.setHours(23, 59, 59, 999);
    return db.leads.filter(function (l) { return l.followup && new Date(l.followup) <= end && l.status !== 'converted'; })
      .sort(function (a, b) { return new Date(a.followup) - new Date(b.followup); });
  }
  function leadItem(l) {
    var fu = l.followup ? (new Date(l.followup) < new Date(dayKey(new Date())) ? '<span class="pill t-red">Overdue</span>' : sameDay(l.followup, new Date()) ? '<span class="pill t-gold">Today</span>' : '') : '';
    return '<a class="list-item press" href="#/lead/' + l.id + '">' + avatar(l.name) +
      '<div class="main"><b>' + esc(l.name) + '</b><small>' + esc(l.course) + ' · ' + esc(l.city) + '</small>' +
      '<div style="margin-top:5px;display:flex;gap:6px">' + statusPill(l.status) + fu + '</div></div>' +
      '<div class="actions"><span class="round t-blue" data-act="call" data-phone="' + l.phone + '">' + I('phone', 17) + '</span>' +
      '<span class="round t-green" data-act="wa" data-phone="' + l.phone + '">' + I('chat', 17) + '</span></div></a>';
  }
  function paymentItem(p, printable) {
    var st = byId(db.students, p.student) || { name: '—', course: '' };
    return '<div class="list-item">' + '<div class="avatar t-green">' + I('rupee', 19) + '</div>' +
      '<div class="main"><b>' + esc(st.name) + '</b><small>' + esc(p.receipt) + ' · ' + PAY_MODE[p.mode] + ' · ' + dateShort(p.date) + '</small></div>' +
      '<div class="end"><b>' + inr(p.amount) + '</b>' + (printable ? '<small><span class="link" data-act="receipt" data-id="' + p.id + '">Receipt</span></small>' : '<small>' + ago(p.date) + '</small>') + '</div></div>';
  }
  function studentItem(st, href) {
    var paid = paidFor(st), fy = firstYearFee(st), pct = Math.min(100, Math.round(paid / fy * 100));
    return '<a class="list-item press" href="#/' + (href || 'student') + '/' + st.id + '">' + avatar(st.name) +
      '<div class="main"><b>' + esc(st.name) + '</b><small>' + esc(st.enrollment) + ' · ' + esc(st.course) + '</small>' +
      '<div class="progress" style="margin-top:7px"><i style="width:' + pct + '%"></i></div></div>' +
      '<div class="end"><b>' + inrShort(paid) + '</b><small>' + (dueFor(st) ? inrShort(dueFor(st)) + ' due' : 'Paid') + '</small></div></a>';
  }

  // ================= STAFF =================
  var listState = { leadStatus: 'all', leadQuery: '', studentDept: 'all', studentQuery: '', feeTab: 'recent', hrTab: 'employees' };

  function dashboard() {
    var u = me(), now = new Date();
    var monthPay = db.payments.filter(function (p) { return thisMonth(p.date); });
    var collected = sum(monthPay, function (p) { return p.amount; });
    var newToday = db.leads.filter(function (l) { return sameDay(l.created, now); }).length;
    var admissions = db.students.filter(function (s) { return thisMonth(s.enrolled); }).length;
    var fus = followupsDue();
    var days = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(now.getTime() - i * DAY);
      days.push({ d: d, n: db.leads.filter(function (l) { return sameDay(l.created, d); }).length });
    }
    var max = Math.max.apply(null, days.map(function (x) { return x.n; }).concat([1]));
    var counts = {};
    db.leads.forEach(function (l) { counts[l.status] = (counts[l.status] || 0) + 1; });
    var pipeKeys = ['new', 'contacted', 'interested', 'counselled', 'document_received', 'converted', 'lost'];
    var pmax = Math.max.apply(null, pipeKeys.map(function (k) { return counts[k] || 0; }).concat([1]));
    var tgt = sum(db.targets, function (t) { return t.revenue; });

    var body =
      '<div class="hero"><small>' + greeting() + ', ' + esc(u.name.split(' ')[0]) + ' · ' + date(now) + '</small>' +
      '<h2>Admissions 2026-27</h2><div style="display:flex;align-items:flex-end;justify-content:space-between;position:relative;z-index:1">' +
      '<div><small>Collected · last 30 days</small><div class="big">' + inr(collected) + '</div></div>' +
      '<span class="pill">' + Math.round(collected / tgt * 100) + '% of ' + inrShort(tgt) + '</span></div>' +
      '<div class="progress" style="margin-top:12px;background:rgba(255,255,255,.18)"><i style="width:' + Math.min(100, collected / tgt * 100) + '%"></i></div></div>' +
      '<div class="stats">' +
      stat('users', 't-blue', db.leads.length, 'Total leads', newToday ? '+' + newToday + ' today' : '') +
      stat('cap', 't-green', admissions, 'Admissions · 30 days') +
      stat('clock', 't-gold', fus.length, 'Follow-ups due') +
      stat('rupee', 't-purple', inrShort(sum(db.students, dueFor)), 'Fee outstanding') + '</div>' +
      '<div class="quick">' +
      '<a href="#/leads/new"><span class="ico">' + I('plus', 22, '#0b5cff') + '</span>Add lead</a>' +
      '<a data-act="recordFee"><span class="ico">' + I('rupee', 22, '#dd8f0d') + '</span>Record fee</a>' +
      '<a href="#/attendance"><span class="ico">' + I('pin', 22, '#15803d') + '</span>Punch in</a>' +
      '<a href="#/tasks"><span class="ico">' + I('list', 22, '#7c3aed') + '</span>Tasks</a></div>' +
      sec('Leads this week', 'All leads', 'leads') +
      '<div class="card"><div class="bars">' + days.map(function (x, k) {
        return '<div class="b' + (k === 6 ? ' today' : '') + '"><em>' + x.n + '</em><i style="height:' + Math.max(4, x.n / max * 80) + '%"></i><span>' + (k === 6 ? 'Today' : 'SMTWTFS'[x.d.getDay()]) + '</span></div>';
      }).join('') + '</div></div>' +
      sec('Lead pipeline') +
      '<div class="card"><div class="pipe">' + pipeKeys.map(function (k) {
        return '<div class="r"><span>' + LEAD_STATUS[k][0] + '</span><div class="progress"><i style="width:' + ((counts[k] || 0) / pmax * 100) + '%"></i></div><b>' + (counts[k] || 0) + '</b></div>';
      }).join('') + '</div></div>' +
      sec('Follow-ups due', fus.length ? 'View all' : '', 'leads') +
      (fus.length ? '<div class="card flush">' + fus.slice(0, 4).map(leadItem).join('') + '</div>' : '<div class="card">' + empty('check', 'No follow-ups due today') + '</div>') +
      sec('Recent fee payments', 'Fees', 'fees') +
      '<div class="card flush">' + db.payments.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 4).map(function (p) { return paymentItem(p); }).join('') + '</div>';
    return shell({ title: 'Swanidhi CRM', sub: u.name + ' · ' + ROLE[u.role], body: body, tab: 'dashboard' });
  }

  function leads() {
    var q = listState.leadQuery.toLowerCase(), f = listState.leadStatus;
    var counts = { all: db.leads.length };
    db.leads.forEach(function (l) { counts[l.status] = (counts[l.status] || 0) + 1; });
    var list = db.leads.filter(function (l) {
      return (f === 'all' || l.status === f) && (!q || (l.name + l.phone + l.course + l.city).toLowerCase().indexOf(q) >= 0);
    }).sort(function (a, b) { return new Date(b.created) - new Date(a.created); });
    var chips = ['all', 'new', 'contacted', 'interested', 'counselled', 'document_received', 'converted', 'dnp', 'not_reachable', 'switch_off', 'not_interested', 'lost'];
    var body =
      '<div class="search">' + I('search', 18, '#98a1b5') + '<input class="input" id="leadSearch" placeholder="Search name, phone, course, city" value="' + esc(listState.leadQuery) + '"></div>' +
      '<div class="chips">' + chips.filter(function (c) { return counts[c]; }).map(function (c) {
        return '<button class="chip' + (f === c ? ' on' : '') + '" data-act="leadFilter" data-v="' + c + '">' + (c === 'all' ? 'All' : LEAD_STATUS[c][0]) + '<span class="n">' + counts[c] + '</span></button>';
      }).join('') + '</div>' +
      '<div id="leadList">' + (list.length ? '<div class="card flush">' + list.map(leadItem).join('') + '</div>' : empty('users', 'No leads match your search')) + '</div>';
    return shell({
      title: 'Leads', sub: list.length + ' of ' + db.leads.length + ' leads', body: body,
      right: '<button class="icon-btn" data-act="exportLeads" title="Export CSV">' + I('download', 21) + '</button>',
      fab: '<button class="fab" data-go="leads/new">' + I('plus', 26, '#fff', 2.2) + '</button>',
    });
  }

  function leadDetail(id) {
    var l = byId(db.leads, id);
    if (!l) return notFound();
    var acts = db.activities.filter(function (a) { return a.lead === id; }).sort(function (a, b) { return new Date(b.at) - new Date(a.at); });
    var assoc = l.associate ? byId(db.associates, l.associate) : null;
    var body =
      '<div class="card" style="text-align:center;padding:20px 16px">' +
      '<div style="display:flex;justify-content:center;margin-bottom:10px">' + avatar(l.name, true) + '</div>' +
      '<h2 style="font-size:19px;font-weight:700">' + esc(l.name) + '</h2>' +
      '<p style="color:var(--ink-soft);font-size:13px;margin:2px 0 10px">+91 ' + esc(l.phone) + ' · ' + esc(l.city) + '</p>' + statusPill(l.status) +
      '<div class="btn-row" style="margin-top:16px">' +
      '<a class="btn sm ghost" style="flex:1" href="tel:+91' + l.phone + '">' + I('phone', 17) + 'Call</a>' +
      '<a class="btn sm ghost" style="flex:1;color:var(--green)" href="https://wa.me/91' + l.phone + '?text=' + encodeURIComponent('Namaste ' + l.name.split(' ')[0] + ', this is ' + me().name + ' from Swanidhi Group of Institutions regarding your enquiry for ' + l.course + '.') + '">' + I('chat', 17) + 'WhatsApp</a></div></div>' +
      '<div class="btn-row" style="margin-bottom:14px">' +
      '<button class="btn" data-act="updateLead" data-id="' + l.id + '">' + I('edit', 18, '#fff') + 'Update</button>' +
      (l.status !== 'converted' ? '<button class="btn gold" data-act="convertLead" data-id="' + l.id + '">' + I('cap', 18) + 'Convert</button>' : '') + '</div>' +
      '<div class="card"><dl class="kv">' +
      '<dt>Course</dt><dd>' + esc(l.course) + '</dd><dt>Department</dt><dd>' + esc(deptName(l.dept)) + '</dd>' +
      '<dt>Source</dt><dd>' + SOURCE[l.source] + '</dd>' + (assoc ? '<dt>Associate</dt><dd>' + esc(assoc.name) + '</dd>' : '') +
      '<dt>Assigned to</dt><dd>' + esc(staff(l.assigned).name) + '</dd><dt>Email</dt><dd>' + esc(l.email || '—') + '</dd>' +
      '<dt>Next follow-up</dt><dd>' + (l.followup ? date(l.followup) : '—') + '</dd><dt>Created</dt><dd>' + date(l.created) + '</dd></dl></div>' +
      sec('Activity') + '<div class="card"><div class="timeline">' + acts.map(function (a) {
        return '<div class="ev"><b>' + esc(a.text) + '</b><small>' + esc(staff(a.by).name) + ' · ' + ago(a.at) + '</small></div>';
      }).join('') + '</div></div>';
    return shell({ title: l.name, sub: l.id + ' · ' + l.course, body: body, back: true, tab: 'leads' });
  }

  function courseOptions(sel) {
    return SW_DEPTS.map(function (d) {
      var cs = SW_COURSES.filter(function (c) { return c.dept === d.slug; });
      return cs.length ? '<optgroup label="' + esc(d.name) + '">' + cs.map(function (c) {
        return '<option' + (c.name === sel ? ' selected' : '') + '>' + esc(c.name) + '</option>';
      }).join('') + '</optgroup>' : '';
    }).join('');
  }
  function staffOptions(sel, roles) {
    return db.staff.filter(function (s) { return !roles || roles.indexOf(s.role) >= 0; }).map(function (s) {
      return '<option value="' + s.id + '"' + (s.id === sel ? ' selected' : '') + '>' + esc(s.name) + '</option>';
    }).join('');
  }

  function leadForm(associateId) {
    var body =
      '<form data-form="addLead" data-assoc="' + (associateId || '') + '">' +
      '<div class="card">' +
      '<div class="field"><label>Full name *</label><input class="input" name="name" required placeholder="Student name"></div>' +
      '<div class="field"><label>Mobile number *</label><input class="input" name="phone" required inputmode="numeric" pattern="[6-9][0-9]{9}" maxlength="10" placeholder="10-digit mobile"></div>' +
      '<div class="row2"><div class="field"><label>City</label><input class="input" name="city" placeholder="City"></div>' +
      '<div class="field"><label>Source</label><select class="input" name="source">' + Object.keys(SOURCE).map(function (k) {
        return '<option value="' + k + '"' + (associateId && k === 'referral' ? ' selected' : '') + '>' + SOURCE[k] + '</option>';
      }).join('') + '</select></div></div>' +
      '<div class="field"><label>Interested course *</label><select class="input" name="course" required>' + courseOptions() + '</select></div>' +
      (associateId ? '' : '<div class="field"><label>Assign to</label><select class="input" name="assigned">' + staffOptions(me() && me().role !== 'admin' ? me().id : 'u3', ['lead', 'counselor']) + '</select></div>') +
      '<div class="field" style="margin:0"><label>Note</label><textarea class="input" name="note" placeholder="Anything the counsellor should know"></textarea></div></div>' +
      '<button class="btn" type="submit">' + I('check', 18, '#fff', 2.4) + 'Save lead</button></form>';
    return body;
  }
  function addLeadPage() { return shell({ title: 'Add lead', sub: 'New admission enquiry', body: leadForm(), back: true, tab: 'leads' }); }

  function students() {
    var q = listState.studentQuery.toLowerCase(), f = listState.studentDept;
    var depts = {};
    db.students.forEach(function (s) { depts[s.dept] = (depts[s.dept] || 0) + 1; });
    var list = db.students.filter(function (s) {
      return (f === 'all' || s.dept === f) && (!q || (s.name + s.enrollment + s.course + s.phone).toLowerCase().indexOf(q) >= 0);
    }).sort(function (a, b) { return new Date(b.enrolled) - new Date(a.enrolled); });
    var body =
      '<div class="stats">' + stat('cap', 't-blue', db.students.length, 'Active students') + stat('rupee', 't-gold', inrShort(sum(db.students, dueFor)), '1st-year fee due') + '</div>' +
      '<div class="search">' + I('search', 18, '#98a1b5') + '<input class="input" id="studentSearch" placeholder="Search name, enrollment no., course" value="' + esc(listState.studentQuery) + '"></div>' +
      '<div class="chips"><button class="chip' + (f === 'all' ? ' on' : '') + '" data-act="studentFilter" data-v="all">All<span class="n">' + db.students.length + '</span></button>' +
      Object.keys(depts).map(function (d) {
        return '<button class="chip' + (f === d ? ' on' : '') + '" data-act="studentFilter" data-v="' + d + '">' + esc(deptName(d)) + '<span class="n">' + depts[d] + '</span></button>';
      }).join('') + '</div>' +
      '<div id="studentList">' + (list.length ? '<div class="card flush">' + list.map(function (s) { return studentItem(s); }).join('') + '</div>' : empty('cap', 'No students found')) + '</div>';
    return shell({ title: 'Students', sub: 'Session 2026-27', body: body });
  }

  function studentDetail(id, portal) {
    var st = byId(db.students, id);
    if (!st) return notFound();
    var paid = paidFor(st), fy = firstYearFee(st), pays = db.payments.filter(function (p) { return p.student === id; }).sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    var docsDone = st.docs.filter(function (d) { return d.done; }).length;
    var body =
      '<div class="card" style="display:flex;gap:14px;align-items:center">' + avatar(st.name, true) +
      '<div style="min-width:0"><h2 style="font-size:18px;font-weight:700">' + esc(st.name) + '</h2>' +
      '<p style="color:var(--ink-soft);font-size:12.5px">' + esc(st.enrollment) + ' · ' + esc(st.course) + '</p>' +
      '<div style="margin-top:6px;display:flex;gap:6px"><span class="pill t-green">Active</span><span class="pill t-blue">' + esc(deptName(st.dept)) + '</span></div></div></div>' +
      '<div class="card"><div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:10px">' +
      '<div><small style="color:var(--ink-soft)">1st-year fee paid</small><div style="font-size:22px;font-weight:800">' + inr(paid) + '</div></div>' +
      '<div style="text-align:right"><small style="color:var(--ink-soft)">Due</small><div style="font-size:16px;font-weight:700;color:' + (dueFor(st) ? 'var(--red)' : 'var(--green)') + '">' + inr(dueFor(st)) + '</div></div></div>' +
      '<div class="progress"><i style="width:' + Math.min(100, paid / fy * 100) + '%"></i></div>' +
      '<p style="font-size:12px;color:var(--ink-soft);margin-top:8px">1st-year fee ' + inr(fy) + ' · Total course fee ' + inr(st.totalFee) + '</p>' +
      (portal ? '' : '<button class="btn" style="margin-top:14px" data-act="recordFee" data-id="' + st.id + '">' + I('plus', 18, '#fff', 2.2) + 'Record payment</button>') + '</div>' +
      sec('Payments') + (pays.length ? '<div class="card flush">' + pays.map(function (p) { return paymentItem(p, true); }).join('') + '</div>' : '<div class="card">' + empty('rupee', 'No payments yet') + '</div>') +
      sec('Documents · ' + docsDone + '/' + st.docs.length) + '<div class="card flush">' + st.docs.map(function (d, k) {
        return '<div class="list-item press" data-act="toggleDoc" data-id="' + st.id + '" data-k="' + k + '"><span class="check' + (d.done ? ' on' : '') + '">' + (d.done ? I('check', 14, '#fff', 3) : '') + '</span>' +
          '<div class="main"><b>' + esc(d.name) + '</b><small>' + (d.done ? 'Verified' : 'Pending') + '</small></div></div>';
      }).join('') + '</div>' +
      sec('Details') + '<div class="card"><dl class="kv">' +
      '<dt>Father\'s name</dt><dd>' + esc(st.father) + '</dd><dt>Mobile</dt><dd>+91 ' + esc(st.phone) + '</dd><dt>City</dt><dd>' + esc(st.city) + '</dd>' +
      '<dt>Duration</dt><dd>' + esc(st.duration) + '</dd><dt>Session</dt><dd>' + esc(st.session) + '</dd><dt>Counsellor</dt><dd>' + esc(staff(st.counsellor).name) + '</dd>' +
      '<dt>Enrolled</dt><dd>' + date(st.enrolled) + '</dd>' + (st.associate ? '<dt>Associate</dt><dd>' + esc(byId(db.associates, st.associate).name) + '</dd>' : '') + '</dl></div>';
    return shell({ title: st.name, sub: st.enrollment, body: body, back: true, tab: portal ? 'a/students' : 'students' });
  }

  function fees() {
    var monthPay = db.payments.filter(function (p) { return thisMonth(p.date); });
    var today = db.payments.filter(function (p) { return sameDay(p.date, new Date()); });
    var dues = db.students.filter(function (s) { return dueFor(s) > 0; }).sort(function (a, b) { return dueFor(b) - dueFor(a); });
    var byMode = {};
    monthPay.forEach(function (p) { byMode[p.mode] = (byMode[p.mode] || 0) + p.amount; });
    var total = sum(monthPay, function (p) { return p.amount; }) || 1;
    var tab = listState.feeTab;
    var body =
      '<div class="hero"><small>Collected · last 30 days</small><div class="big" style="margin:4px 0 10px">' + inr(sum(monthPay, function (p) { return p.amount; })) + '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;position:relative;z-index:1">' + Object.keys(byMode).map(function (m) {
        return '<span class="pill">' + PAY_MODE[m] + ' ' + Math.round(byMode[m] / total * 100) + '%</span>';
      }).join('') + '</div></div>' +
      '<div class="stats">' + stat('rupee', 't-green', inr(sum(today, function (p) { return p.amount; })), 'Collected today') +
      stat('clock', 't-red', inrShort(sum(dues, dueFor)), dues.length + ' students with dues') + '</div>' +
      '<button class="btn" data-act="recordFee" style="margin-bottom:14px">' + I('plus', 18, '#fff', 2.2) + 'Record fee payment</button>' +
      '<div class="tabs"><button class="' + (tab === 'recent' ? 'on' : '') + '" data-act="feeTab" data-v="recent">Recent payments</button>' +
      '<button class="' + (tab === 'dues' ? 'on' : '') + '" data-act="feeTab" data-v="dues">Pending dues</button></div>' +
      (tab === 'recent'
        ? '<div class="card flush">' + db.payments.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 30).map(function (p) { return paymentItem(p, true); }).join('') + '</div>'
        : '<div class="card flush">' + dues.map(function (s) {
          return '<a class="list-item press" href="#/student/' + s.id + '">' + avatar(s.name) + '<div class="main"><b>' + esc(s.name) + '</b><small>' + esc(s.course) + ' · +91 ' + s.phone + '</small></div>' +
            '<div class="end"><b style="color:var(--red)">' + inr(dueFor(s)) + '</b><small>of ' + inrShort(firstYearFee(s)) + '</small></div></a>';
        }).join('') + '</div>');
    return shell({ title: 'Fees', sub: 'Collections & dues', body: body });
  }

  function more() {
    var u = me();
    var items = [
      ['attendance', 'Attendance', 'pin', 't-green'], ['hrms', 'HRMS & Payroll', 'brief', 't-blue'], ['finance', 'Finance', 'trend', 't-purple'],
      ['associates', 'Associates', 'users', 't-teal'], ['targets', 'Targets', 'target', 't-gold'], ['tasks', 'Tasks', 'list', 't-blue'],
      ['courses', 'Courses & Fees', 'book', 't-gold'], ['notifications', 'Notifications', 'bell', 't-red'], ['team', 'Team', 'shield', 't-purple'],
    ];
    var body =
      '<div class="card" style="display:flex;gap:14px;align-items:center">' + avatar(u.name, true) +
      '<div><h2 style="font-size:17px;font-weight:700">' + esc(u.name) + '</h2><p style="color:var(--ink-soft);font-size:12.5px">' + esc(u.email) + '</p>' +
      '<span class="pill t-blue" style="margin-top:6px">' + ROLE[u.role] + '</span></div></div>' +
      '<div class="menu-grid">' + items.map(function (i) {
        return '<a href="#/' + i[0] + '" class="press"><span class="ico ' + i[3] + '">' + I(i[2], 22) + '</span>' + i[1] + '</a>';
      }).join('') + '</div>' +
      sec('Demo') + '<div class="banner">' + I('help', 18) + '<span>This app is running on dummy data stored on this phone. Connect Supabase to the CRM to use live data.</span></div>' +
      '<div class="card flush">' +
      '<div class="list-item press" data-act="resetDemo"><div class="avatar t-gold">' + I('refresh', 19) + '</div><div class="main"><b>Reset demo data</b><small>Restore the original dummy leads, students and fees</small></div>' + I('right', 18, '#98a1b5') + '</div>' +
      '<div class="list-item press" data-act="logout"><div class="avatar t-red">' + I('logout', 19) + '</div><div class="main"><b>Log out</b><small>Switch to another demo account</small></div>' + I('right', 18, '#98a1b5') + '</div></div>' +
      '<p style="text-align:center;color:var(--ink-mute);font-size:11.5px;margin-top:16px">Swanidhi CRM · v1.1 demo</p>';
    return shell({ title: 'More', sub: 'All CRM modules', body: body });
  }

  // ---- attendance ----
  function attendance() {
    var u = me(), todayK = dayKey(new Date());
    var punch = db.punches[u.id + '|' + todayK] || null;
    var monthStart = new Date(); monthStart.setDate(1);
    var cells = '', counts = { present: 0, late: 0, leave: 0, absent: 0, half_day: 0 };
    var COLORS = { present: 't-green', late: 't-gold', leave: 't-purple', absent: 't-red', half_day: 't-teal', holiday: 't-gray' };
    for (var b = 0; b < monthStart.getDay(); b++) cells += '<div></div>';
    var last = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    for (var d = 1; d <= last; d++) {
      var dt = new Date(monthStart.getFullYear(), monthStart.getMonth(), d), k = dayKey(dt);
      var rec = db.attendance[u.id + '|' + k];
      if (k === todayK && punch) rec = { status: 'present' };
      if (rec && counts[rec.status] != null) counts[rec.status]++;
      cells += '<div class="d ' + (rec ? COLORS[rec.status] : '') + '" style="' + (k === todayK ? 'box-shadow:0 0 0 2px var(--blue)' : rec ? '' : 'color:var(--ink-mute)') + '">' + d + '</div>';
    }
    var team = db.staff.map(function (s) {
      var r = s.id === u.id && punch ? { status: 'present', in: punch.in } : db.attendance[s.id + '|' + dayKey(new Date(Date.now() - DAY))];
      return { s: s, r: r };
    });
    var body =
      '<div class="card punch"><small style="color:var(--ink-soft)">' + date(new Date()) + '</small><div class="clock" id="liveClock">--:--</div>' +
      (punch && punch.out
        ? '<div class="ring" style="background:linear-gradient(135deg,#15803d,#166534);box-shadow:0 0 0 10px var(--green-tint)">' + I('check', 34, '#fff', 2.4) + 'Day complete</div>'
        : '<button class="ring' + (punch ? ' out' : '') + ' press" data-act="punch">' + I(punch ? 'logout' : 'pin', 34, punch ? '#0847c7' : '#fff') + (punch ? 'Punch out' : 'Punch in') + '</button>') +
      '<div class="btn-row" style="font-size:12.5px"><div style="flex:1"><small style="color:var(--ink-soft)">In</small><div style="font-weight:700">' + (punch ? punch.in : '--:--') + '</div></div>' +
      '<div style="flex:1"><small style="color:var(--ink-soft)">Out</small><div style="font-weight:700">' + (punch && punch.out ? punch.out : '--:--') + '</div></div>' +
      '<div style="flex:1.4"><small style="color:var(--ink-soft)">Location</small><div style="font-weight:700;font-size:11.5px">' + (punch && punch.loc ? esc(punch.loc) : '—') + '</div></div></div></div>' +
      sec(MONTHS[monthStart.getMonth()] + ' ' + monthStart.getFullYear()) +
      '<div class="card"><div class="cal">' + 'SMTWTFS'.split('').map(function (x) { return '<div class="h">' + x + '</div>'; }).join('') + cells + '</div>' +
      '<div class="legend"><span><i style="background:#dcfce7"></i>Present ' + counts.present + '</span><span><i style="background:#fff6e4"></i>Late ' + counts.late +
      '</span><span><i style="background:#f5f3ff"></i>Leave ' + counts.leave + '</span><span><i style="background:#e6fffa"></i>Half day ' + counts.half_day + '</span><span><i style="background:#fee2e2"></i>Absent ' + counts.absent + '</span></div></div>' +
      sec('Team · yesterday') + '<div class="card flush">' + team.map(function (t) {
        var r = t.r || { status: 'absent' };
        return '<div class="list-item">' + avatar(t.s.name) + '<div class="main"><b>' + esc(t.s.name) + '</b><small>' + ROLE[t.s.role] + (r.in ? ' · In ' + r.in + (r.out ? ' · Out ' + r.out : '') : '') + '</small></div>' +
          '<span class="pill ' + COLORS[r.status] + '">' + ({ present: 'Present', late: 'Late', leave: 'Leave', absent: 'Absent', half_day: 'Half day', holiday: 'Holiday' }[r.status]) + '</span></div>';
      }).join('') + '</div>';
    return shell({ title: 'Attendance', sub: 'Self punch with location', body: body, back: true, tab: 'more' });
  }

  // ---- HRMS ----
  function payrollRow(e) {
    var gross = e.basic + e.hra + e.allowances;
    var absent = 0, n = new Date();
    Object.keys(db.attendance).forEach(function (k) {
      var p = k.split('|');
      if (p[0] === e.user && db.attendance[k].status === 'absent') absent++;
      if (p[0] === e.user && db.attendance[k].status === 'half_day') absent += 0.5;
    });
    var leaveDed = Math.round(gross / 30 * absent);
    var pf = Math.round(Math.min(e.basic, 15000) * 0.12);
    var tds = gross > 40000 ? Math.round(gross * 0.05) : 0;
    return { gross: gross, pf: pf, tds: tds, leave: leaveDed, absent: absent, net: gross - pf - tds - leaveDed, month: MONTHS[n.getMonth()] + ' ' + n.getFullYear() };
  }
  function hrms() {
    var tab = listState.hrTab;
    var totalNet = sum(db.employees, function (e) { return payrollRow(e).net; });
    var body =
      '<div class="stats">' + stat('users', 't-blue', db.employees.length, 'Employees') + stat('wallet', 't-gold', inrShort(totalNet), 'Payroll this month') + '</div>' +
      '<div class="tabs"><button class="' + (tab === 'employees' ? 'on' : '') + '" data-act="hrTab" data-v="employees">Employees</button>' +
      '<button class="' + (tab === 'payroll' ? 'on' : '') + '" data-act="hrTab" data-v="payroll">Payroll</button></div>' +
      '<div class="card flush">' + db.employees.map(function (e) {
        var s = staff(e.user), pr = payrollRow(e);
        return tab === 'employees'
          ? '<div class="list-item">' + avatar(s.name) + '<div class="main"><b>' + esc(s.name) + '</b><small>' + esc(e.code) + ' · ' + esc(e.designation) + '</small></div>' +
            '<div class="end"><b>' + inr(e.basic + e.hra + e.allowances) + '</b><small>since ' + MONTHS[new Date(e.joined).getMonth()] + ' ' + new Date(e.joined).getFullYear() + '</small></div></div>'
          : '<div class="list-item">' + avatar(s.name) + '<div class="main"><b>' + esc(s.name) + '</b><small>Gross ' + inr(pr.gross) + ' · Ded. ' + inr(pr.pf + pr.tds + pr.leave) + '</small></div>' +
            '<div class="end"><b>' + inr(pr.net) + '</b><small><span class="link" data-act="slip" data-id="' + e.id + '">Salary slip</span></small></div></div>';
      }).join('') + '</div>';
    return shell({ title: 'HRMS', sub: 'Employees & payroll', body: body, back: true, tab: 'more' });
  }

  // ---- finance ----
  function finance() {
    var inc = sum(db.payments.filter(function (p) { return thisMonth(p.date); }), function (p) { return p.amount; });
    var exps = db.expenses.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    var exp = sum(exps.filter(function (e) { return thisMonth(e.date) && e.status !== 'rejected'; }), function (e) { return e.amount; });
    var cats = {};
    exps.forEach(function (e) { if (e.status !== 'rejected') cats[e.category] = (cats[e.category] || 0) + e.amount; });
    var cmax = Math.max.apply(null, Object.keys(cats).map(function (k) { return cats[k]; }).concat([1]));
    var body =
      '<div class="hero"><small>Net · last 30 days</small><div class="big" style="margin:2px 0 12px">' + inr(inc - exp) + '</div>' +
      '<div style="display:flex;gap:18px;position:relative;z-index:1"><div><small>Income</small><div style="font-weight:700">' + inr(inc) + '</div></div>' +
      '<div><small>Expenses</small><div style="font-weight:700">' + inr(exp) + '</div></div></div></div>' +
      '<button class="btn" data-act="addExpense" style="margin-bottom:6px">' + I('plus', 18, '#fff', 2.2) + 'Add expense</button>' +
      sec('Spend by category') + '<div class="card"><div class="pipe">' + Object.keys(cats).sort(function (a, b) { return cats[b] - cats[a]; }).map(function (k) {
        return '<div class="r" style="grid-template-columns:100px 1fr 70px"><span>' + EXP_CAT[k] + '</span><div class="progress gold"><i style="width:' + (cats[k] / cmax * 100) + '%"></i></div><b>' + inrShort(cats[k]) + '</b></div>';
      }).join('') + '</div></div>' +
      sec('Expenses') + '<div class="card flush">' + exps.map(function (e) {
        var pill = e.status === 'pending' ? '<span class="pill t-gold" data-act="approveExpense" data-id="' + e.id + '">Pending · Approve</span>' : e.status === 'approved' ? '<span class="pill t-green">Approved</span>' : '<span class="pill t-red">Rejected</span>';
        return '<div class="list-item"><div class="avatar t-purple">' + I('file', 19) + '</div><div class="main"><b>' + esc(e.description) + '</b><small>' + EXP_CAT[e.category] + ' · ' + dateShort(e.date) + ' · ' + esc(staff(e.by).name) + '</small>' +
          '<div style="margin-top:5px">' + pill + '</div></div><div class="end"><b>' + inr(e.amount) + '</b><small>' + PAY_MODE[e.mode] + '</small></div></div>';
      }).join('') + '</div>';
    return shell({ title: 'Finance', sub: 'Income & expenses', body: body, back: true, tab: 'more' });
  }

  // ---- associates ----
  function associateStats(a) {
    var ls = db.leads.filter(function (l) { return l.associate === a.id; });
    var ss = db.students.filter(function (s) { return s.associate === a.id; });
    var earned = Math.round(sum(ss, paidFor) * a.commission / 100);
    var paidOut = Math.round(earned * 0.6 / 1000) * 1000;
    return { leads: ls, students: ss, earned: earned, paidOut: paidOut, balance: earned - paidOut };
  }
  function associates() {
    var body = '<div class="card flush">' + db.associates.map(function (a) {
      var s = associateStats(a);
      return '<div class="list-item">' + avatar(a.name) + '<div class="main"><b>' + esc(a.name) + '</b><small>' + esc(a.owner) + ' · ' + esc(a.city) + ' · ' + a.commission + '%</small>' +
        '<div style="margin-top:5px;display:flex;gap:6px"><span class="pill t-blue">' + s.leads.length + ' leads</span><span class="pill t-green">' + s.students.length + ' admissions</span></div></div>' +
        '<div class="end"><b>' + inrShort(s.earned) + '</b><small>commission</small></div></div>';
    }).join('') + '</div>';
    return shell({ title: 'Associates', sub: db.associates.length + ' partner centres', body: body, back: true, tab: 'more' });
  }

  // ---- targets ----
  function targets() {
    var body = db.targets.map(function (t) {
      var u = staff(t.user);
      var adm = db.students.filter(function (s) { return s.counsellor === t.user && thisMonth(s.enrolled); });
      var rev = sum(db.payments.filter(function (p) { var s = byId(db.students, p.student); return s && s.counsellor === t.user && thisMonth(p.date); }), function (p) { return p.amount; });
      var a = Math.min(100, adm.length / t.admissions * 100), r = Math.min(100, rev / t.revenue * 100);
      return '<div class="card"><div style="display:flex;gap:12px;align-items:center;margin-bottom:14px">' + avatar(u.name) +
        '<div style="flex:1"><b style="font-weight:600">' + esc(u.name) + '</b><div style="font-size:12px;color:var(--ink-soft)">' + ROLE[u.role] + '</div></div>' +
        '<span class="pill ' + (a >= 100 ? 't-green' : a >= 50 ? 't-gold' : 't-red') + '">' + Math.round(a) + '%</span></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:6px"><span>Admissions</span><b>' + adm.length + ' / ' + t.admissions + '</b></div>' +
        '<div class="progress" style="margin-bottom:12px"><i style="width:' + a + '%"></i></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:6px"><span>Fee collection</span><b>' + inrShort(rev) + ' / ' + inrShort(t.revenue) + '</b></div>' +
        '<div class="progress gold"><i style="width:' + r + '%"></i></div></div>';
    }).join('');
    return shell({ title: 'Targets', sub: 'Last 30 days · counsellor targets', body: body, back: true, tab: 'more' });
  }

  // ---- tasks ----
  function tasks() {
    var list = db.tasks.slice().sort(function (a, b) { return (a.done - b.done) || (new Date(a.due) - new Date(b.due)); });
    var PR = { high: 't-red', medium: 't-gold', low: 't-gray' };
    var body = '<div class="card flush">' + list.map(function (t) {
      var overdue = !t.done && new Date(t.due) < new Date(dayKey(new Date()));
      return '<div class="list-item press' + (t.done ? ' strike' : '') + '" data-act="toggleTask" data-id="' + t.id + '"><span class="check' + (t.done ? ' on' : '') + '">' + (t.done ? I('check', 14, '#fff', 3) : '') + '</span>' +
        '<div class="main"><b style="white-space:normal">' + esc(t.title) + '</b><small>' + esc(staff(t.assigned).name) + ' · ' + (overdue ? '<span style="color:var(--red)">Overdue ' + dateShort(t.due) + '</span>' : 'Due ' + dateShort(t.due)) + '</small></div>' +
        '<span class="pill ' + PR[t.priority] + '">' + t.priority + '</span></div>';
    }).join('') + '</div>';
    return shell({ title: 'Tasks', sub: db.tasks.filter(function (t) { return !t.done; }).length + ' open', body: body, back: true, tab: 'more',
      fab: '<button class="fab" data-act="addTask">' + I('plus', 26, '#fff', 2.2) + '</button>' });
  }

  function courses() {
    var body = SW_DEPTS.map(function (d) {
      var cs = SW_COURSES.filter(function (c) { return c.dept === d.slug; });
      if (!cs.length) return '';
      return sec(d.name) + '<div class="card flush">' + cs.map(function (c) {
        return '<div class="list-item"><div class="avatar t-blue">' + I('book', 19) + '</div><div class="main"><b>' + esc(c.name) + '</b><small>' + esc(c.level) + ' · ' + esc(c.duration) + '</small></div>' +
          '<div class="end"><b>' + inrShort(c.fee) + '</b><small>total fee</small></div></div>';
      }).join('') + '</div>';
    }).join('');
    return shell({ title: 'Courses & Fees', sub: 'Session 2026-27 fee structure', body: body, back: true, tab: 'more' });
  }

  function team() {
    var body = '<div class="card flush">' + db.staff.map(function (s) {
      return '<div class="list-item">' + avatar(s.name) + '<div class="main"><b>' + esc(s.name) + '</b><small>' + esc(s.email) + '</small></div><span class="pill t-blue">' + ROLE[s.role] + '</span></div>';
    }).join('') + '</div>';
    return shell({ title: 'Team', sub: 'CRM users & roles', body: body, back: true, tab: 'more' });
  }

  function notifications() {
    var list = db.notifications.slice().sort(function (a, b) { return new Date(b.at) - new Date(a.at); });
    var body = '<div class="card flush">' + list.map(function (n) {
      return '<div class="list-item"><div class="avatar ' + (n.read ? 't-gray' : 't-gold') + '">' + I('bell', 19) + '</div><div class="main"><b>' + esc(n.title) + '</b><small style="white-space:normal">' + esc(n.body) + '</small></div><div class="end"><small>' + ago(n.at) + '</small></div></div>';
    }).join('') + '</div>';
    db.notifications.forEach(function (n) { n.read = true; });
    save();
    return shell({ title: 'Notifications', body: body, back: true, tab: 'more' });
  }

  // ================= STUDENT PORTAL =================
  function myStudent() { return byId(db.students, session().id) || db.students[0]; }
  function sHome() {
    var st = myStudent(), paid = paidFor(st), fy = firstYearFee(st);
    var docsDone = st.docs.filter(function (d) { return d.done; }).length;
    var steps = [['Enquiry', true], ['Counselling', true], ['Documents', docsDone === st.docs.length], ['Admission confirmed', paid > 0], ['Classes begin', false]];
    var body =
      '<div class="hero"><small>' + greeting() + '</small><h2 style="margin-bottom:4px">' + esc(st.name) + '</h2>' +
      '<small>' + esc(st.enrollment) + ' · ' + esc(st.course) + '</small>' +
      '<div style="margin-top:12px;display:flex;gap:8px;position:relative;z-index:1"><span class="pill">Session ' + st.session + '</span><span class="pill">' + esc(deptName(st.dept)) + '</span></div></div>' +
      '<div class="stats">' + stat('rupee', 't-green', inrShort(paid), 'Fee paid') + stat('clock', dueFor(st) ? 't-red' : 't-green', inrShort(dueFor(st)), 'Fee due') + '</div>' +
      sec('Admission status') + '<div class="card"><div class="timeline">' + steps.map(function (s) {
        return '<div class="ev' + (s[1] ? ' done' : '') + '" style="opacity:' + (s[1] ? 1 : .55) + '"><b>' + s[0] + '</b><small>' + (s[1] ? 'Completed' : 'Pending') + '</small></div>';
      }).join('') + '</div></div>' +
      sec('Documents', docsDone + '/' + st.docs.length + ' · View', 's/docs') +
      '<div class="card"><div class="progress"><i style="width:' + (docsDone / st.docs.length * 100) + '%"></i></div>' +
      '<p style="font-size:12.5px;color:var(--ink-soft);margin-top:8px">' + (st.docs.length - docsDone ? (st.docs.length - docsDone) + ' document(s) still to upload' : 'All documents verified') + '</p></div>';
    return shell({ title: 'Student Portal', sub: st.enrollment, body: body });
  }
  function sFees() {
    var st = myStudent(), pays = db.payments.filter(function (p) { return p.student === st.id; });
    var body =
      '<div class="hero"><small>1st-year fee</small><div class="big">' + inr(firstYearFee(st)) + '</div>' +
      '<div class="progress" style="margin:12px 0 8px;background:rgba(255,255,255,.18)"><i style="width:' + Math.min(100, paidFor(st) / firstYearFee(st) * 100) + '%"></i></div>' +
      '<small>Paid ' + inr(paidFor(st)) + ' · Due ' + inr(dueFor(st)) + '</small></div>' +
      (dueFor(st) ? '<div class="card"><b style="font-weight:700">Pay your fee</b><p style="font-size:12.5px;color:var(--ink-soft);margin:4px 0 12px">Pay at the accounts office or by UPI to <b>swanidhi@upi</b> and share the receipt with your counsellor.</p>' +
        '<button class="btn gold" data-act="share" data-text="' + esc('Fee payment for ' + st.name + ' (' + st.enrollment + '): ' + inr(dueFor(st)) + ' due.') + '">' + I('chat', 18) + 'Share payment details</button></div>' : '') +
      sec('Receipts') + (pays.length ? '<div class="card flush">' + pays.map(function (p) { return paymentItem(p, true); }).join('') + '</div>' : '<div class="card">' + empty('rupee', 'No payments yet') + '</div>');
    return shell({ title: 'My Fees', sub: st.course, body: body });
  }
  function sDocs() {
    var st = myStudent();
    var body = '<div class="banner">' + I('upload', 18) + '<span>Upload a clear photo or PDF. Your counsellor verifies it within a day.</span></div>' +
      '<div class="card flush">' + st.docs.map(function (d, k) {
        return '<div class="list-item"><div class="avatar ' + (d.done ? 't-green' : 't-gold') + '">' + I(d.done ? 'check' : 'file', 19) + '</div>' +
          '<div class="main"><b>' + esc(d.name) + '</b><small>' + (d.done ? (d.file ? esc(d.file) : 'Verified') : 'Not uploaded') + '</small></div>' +
          (d.done ? '<span class="pill t-green">Done</span>' : '<label class="btn sm" style="cursor:pointer">' + I('upload', 16, '#fff') + 'Upload<input type="file" accept="image/*,application/pdf" hidden data-upload="' + k + '"></label>') + '</div>';
      }).join('') + '</div>';
    return shell({ title: 'Documents', sub: st.docs.filter(function (d) { return d.done; }).length + ' of ' + st.docs.length + ' uploaded', body: body });
  }
  function sSupport() {
    var st = myStudent(), c = staff(st.counsellor);
    var faqs = [['When do classes start?', 'Classes for session 2026-27 begin after document verification. You will get a notification with your timetable.'],
      ['Can I pay the fee in instalments?', 'Yes — the 1st-year fee can be paid in up to three instalments. Talk to your counsellor.'],
      ['Is hostel available?', 'Separate hostels for boys and girls are available on campus. Ask the accounts office for charges.']];
    var body =
      '<div class="card" style="display:flex;gap:14px;align-items:center">' + avatar(c.name, true) + '<div style="flex:1"><small style="color:var(--ink-soft)">Your counsellor</small><h2 style="font-size:17px;font-weight:700">' + esc(c.name) + '</h2>' +
      '<div class="btn-row" style="margin-top:10px"><a class="btn sm ghost" href="tel:+91' + c.phone + '">' + I('phone', 16) + 'Call</a><a class="btn sm ghost" style="color:var(--green)" href="https://wa.me/91' + c.phone + '">' + I('chat', 16) + 'WhatsApp</a></div></div></div>' +
      sec('Frequently asked') + faqs.map(function (f) { return '<div class="card"><b style="font-weight:600">' + f[0] + '</b><p style="font-size:13px;color:var(--ink-soft);margin-top:6px;line-height:1.5">' + f[1] + '</p></div>'; }).join('') +
      '<button class="btn danger" data-act="logout" style="margin-top:8px">' + I('logout', 18) + 'Log out</button>';
    return shell({ title: 'Help & Support', body: body });
  }

  // ================= ASSOCIATE PORTAL =================
  function myAssoc() { return byId(db.associates, session().id) || db.associates[0]; }
  function aHome() {
    var a = myAssoc(), s = associateStats(a);
    var body =
      '<div class="hero"><small>' + esc(a.name) + '</small><h2 style="margin-bottom:6px">Wallet balance</h2><div class="big">' + inr(s.balance) + '</div>' +
      '<small>Earned ' + inr(s.earned) + ' · Paid out ' + inr(s.paidOut) + '</small></div>' +
      '<div class="stats">' + stat('users', 't-blue', s.leads.length, 'Leads referred') + stat('cap', 't-green', s.students.length, 'Admissions') + '</div>' +
      '<button class="btn" data-go="a/leads/new" style="margin-bottom:6px">' + I('plus', 18, '#fff', 2.2) + 'Refer a new student</button>' +
      sec('Recent leads', 'All', 'a/leads') + (s.leads.length ? '<div class="card flush">' + s.leads.slice(0, 4).map(assocLeadItem).join('') + '</div>' : '<div class="card">' + empty('users', 'No leads yet') + '</div>');
    return shell({ title: 'Partner Portal', sub: a.owner + ' · ' + a.city, body: body });
  }
  function assocLeadItem(l) {
    return '<div class="list-item">' + avatar(l.name) + '<div class="main"><b>' + esc(l.name) + '</b><small>' + esc(l.course) + ' · ' + ago(l.created) + '</small></div>' + statusPill(l.status) + '</div>';
  }
  function aLeads() {
    var s = associateStats(myAssoc());
    var body = s.leads.length ? '<div class="card flush">' + s.leads.slice().sort(function (a, b) { return new Date(b.created) - new Date(a.created); }).map(assocLeadItem).join('') + '</div>' : empty('users', 'No leads yet');
    return shell({ title: 'My Leads', sub: s.leads.length + ' referred', body: body, fab: '<button class="fab" data-go="a/leads/new">' + I('plus', 26, '#fff', 2.2) + '</button>' });
  }
  function aStudents() {
    var s = associateStats(myAssoc());
    var body = s.students.length ? '<div class="card flush">' + s.students.map(function (st) { return studentItem(st, 'a/student'); }).join('') + '</div>' : empty('cap', 'No admissions yet');
    return shell({ title: 'My Students', sub: s.students.length + ' admissions', body: body });
  }
  function aWallet() {
    var a = myAssoc(), s = associateStats(a);
    var body =
      '<div class="hero"><small>Available balance</small><div class="big">' + inr(s.balance) + '</div><small>Commission rate ' + a.commission + '% of fee collected</small></div>' +
      sec('Commission earned') + (s.students.length ? '<div class="card flush">' + s.students.map(function (st) {
        return '<div class="list-item">' + avatar(st.name) + '<div class="main"><b>' + esc(st.name) + '</b><small>' + esc(st.course) + ' · fee paid ' + inr(paidFor(st)) + '</small></div><div class="end"><b style="color:var(--green)">+' + inr(paidFor(st) * a.commission / 100) + '</b></div></div>';
      }).join('') + '</div>' : '<div class="card">' + empty('wallet', 'No commission yet') + '</div>') +
      sec('Payouts') + '<div class="card flush">' + (s.paidOut ? '<div class="list-item"><div class="avatar t-purple">' + I('wallet', 19) + '</div><div class="main"><b>Bank transfer</b><small>NEFT · ' + dateShort(Date.now() - 12 * DAY) + '</small></div><div class="end"><b>-' + inr(s.paidOut) + '</b></div></div>' : empty('wallet', 'No payouts yet')) + '</div>' +
      '<button class="btn danger" data-act="logout" style="margin-top:8px">' + I('logout', 18) + 'Log out</button>';
    return shell({ title: 'Wallet', body: body });
  }

  // ================= LOGIN =================
  var loginTab = 'staff';
  function login(err) {
    var t = loginTab;
    var fields = t === 'student'
      ? '<div class="field"><label>Enrollment number</label><input class="input" name="user" placeholder="e.g. DEMO-STU-001" autocapitalize="characters"></div>'
      : '<div class="field"><label>Email address</label><input class="input" name="user" type="email" placeholder="name@swanidhi.test"></div>';
    app.innerHTML =
      '<div class="login"><div class="login-hero"><img src="logo.png" alt=""><div><h1>Swanidhi Group<br>of Institutions</h1><p>Admissions · Fees · HRMS CRM</p></div></div>' +
      '<div class="login-card fade-in"><h2>Welcome <span>back</span></h2><p class="sub">Sign in to continue to your workspace.</p>' +
      '<div class="tabs">' + [['staff', 'Staff'], ['student', 'Student'], ['associate', 'Associate']].map(function (x) {
        return '<button class="' + (t === x[0] ? 'on' : '') + '" data-act="loginTab" data-v="' + x[0] + '">' + x[1] + '</button>';
      }).join('') + '</div>' +
      '<form data-form="login">' + fields +
      '<div class="field"><label>Password</label><input class="input" name="password" type="password" placeholder="••••••••"></div>' +
      (err ? '<p style="color:var(--red);font-size:12.5px;margin:-4px 0 12px">' + esc(err) + '</p>' : '') +
      '<button class="btn" type="submit">Sign in ' + I('right', 18, '#fff', 2.4) + '</button></form>' +
      '<div class="demo-box"><div class="t"><span>Demo login · dummy data</span><span>' + DEMO_PASSWORD + '</span></div><div class="demo-grid">' +
      '<button data-act="demo" data-v="staff">' + I('brief', 20, '#0b5cff') + 'Office Staff<small>Admin CRM</small></button>' +
      '<button data-act="demo" data-v="student">' + I('cap', 20, '#15803d') + 'Student<small>Student portal</small></button>' +
      '<button data-act="demo" data-v="associate">' + I('users', 20, '#0d9488') + 'Associate<small>Partner portal</small></button></div></div></div></div>';
  }
  function doLogin(role, user, password) {
    user = (user || '').trim().toLowerCase();
    if (password !== DEMO_PASSWORD) return 'Wrong password. Demo password is ' + DEMO_PASSWORD;
    if (role === 'staff') {
      var s = db.staff.filter(function (x) { return x.email === user; })[0];
      if (!s) return 'No staff account with that email. Try demo.admin@swanidhi.test';
      setSession({ role: 'staff', id: s.id });
    } else if (role === 'student') {
      var st = user === 'demo-stu-001' ? db.students[0] : db.students.filter(function (x) { return x.enrollment.toLowerCase() === user; })[0];
      if (!st) return 'Enrollment number not found. Try DEMO-STU-001';
      setSession({ role: 'student', id: st.id });
    } else {
      if (user !== 'demo.associate@swanidhi.test') return 'Associate not found. Try demo.associate@swanidhi.test';
      setSession({ role: 'associate', id: 'a1' });
    }
    return null;
  }
  function homeFor(s) { return s.role === 'staff' ? 'dashboard' : s.role === 'student' ? 's/home' : 'a/home'; }

  function notFound() { return shell({ title: 'Not found', body: empty('help', 'This page does not exist'), back: true }); }

  // ================= ROUTER =================
  var ROUTES = {
    staff: [
      [/^dashboard$/, dashboard], [/^leads$/, leads], [/^leads\/new$/, addLeadPage], [/^lead\/(\w+)$/, leadDetail],
      [/^students$/, students], [/^student\/(\w+)$/, function (id) { return studentDetail(id); }], [/^fees$/, fees], [/^more$/, more],
      [/^attendance$/, attendance], [/^hrms$/, hrms], [/^finance$/, finance], [/^associates$/, associates], [/^targets$/, targets],
      [/^tasks$/, tasks], [/^courses$/, courses], [/^team$/, team], [/^notifications$/, notifications],
    ],
    student: [[/^s\/home$/, sHome], [/^s\/fees$/, sFees], [/^s\/docs$/, sDocs], [/^s\/support$/, sSupport]],
    associate: [
      [/^a\/home$/, aHome], [/^a\/leads$/, aLeads], [/^a\/students$/, aStudents], [/^a\/wallet$/, aWallet],
      [/^a\/leads\/new$/, function () { return shell({ title: 'Refer a student', sub: myAssoc().name, body: leadForm(myAssoc().id), back: true, tab: 'a/leads' }); }],
      [/^a\/student\/(\w+)$/, function (id) { return studentDetail(id, true); }],
    ],
  };
  var clockTimer;
  function render() {
    clearInterval(clockTimer);
    var s = session();
    if (!s) { if (location.hash) history.replaceState(null, '', location.pathname); login(); return; }
    var path = location.hash.replace(/^#\/?/, '');
    var routes = ROUTES[s.role], html = null;
    for (var i = 0; i < routes.length && html === null; i++) {
      var m = path.match(routes[i][0]);
      if (m) html = routes[i][1].apply(null, m.slice(1));
    }
    if (html === null) { location.replace('#/' + homeFor(s)); return; }
    app.innerHTML = html;
    window.scrollTo(0, 0);
    var clock = document.getElementById('liveClock');
    if (clock) {
      var tick = function () { var d = new Date(); clock.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0'); };
      tick(); clockTimer = setInterval(tick, 1000);
    }
  }
  function rerenderKeepScroll() { var y = window.scrollY; render(); window.scrollTo(0, y); }
  function go(path) { location.hash = '#/' + path; }

  // ================= ACTIONS =================
  function nowTime() { var d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function receiptHtml(p) {
    var st = byId(db.students, p.student);
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Receipt ' + esc(p.receipt) + '</title>' +
      '<style>body{font-family:Arial,sans-serif;color:#0f1729;margin:24px}.h{display:flex;gap:14px;align-items:center;border-bottom:3px solid #f5a623;padding-bottom:12px}.h img{width:64px}' +
      '.h b{font-size:20px;color:#04246b}.h small{display:block;color:#5b6478}h2{text-align:center;letter-spacing:.1em;color:#0b5cff;margin:18px 0}table{width:100%;border-collapse:collapse}' +
      'td{padding:9px 6px;border-bottom:1px solid #e6eaf5;font-size:14px}td:first-child{color:#5b6478;width:40%}.amt{font-size:22px;font-weight:bold;color:#04246b}.f{margin-top:40px;display:flex;justify-content:space-between;color:#5b6478;font-size:12px}</style></head><body>' +
      '<div class="h"><img src="https://appassets.androidplatform.net/assets/demo/logo.png"><div><b>Swanidhi Group of Institutions</b><small>Medical • Nursing • Paramedical • Law • Management</small></div></div>' +
      '<h2>FEE RECEIPT</h2><table><tr><td>Receipt no.</td><td>' + esc(p.receipt) + '</td></tr><tr><td>Date</td><td>' + date(p.date) + '</td></tr>' +
      '<tr><td>Student</td><td>' + esc(st.name) + '</td></tr><tr><td>Enrollment no.</td><td>' + esc(st.enrollment) + '</td></tr><tr><td>Course</td><td>' + esc(st.course) + ' (' + st.session + ')</td></tr>' +
      '<tr><td>Payment mode</td><td>' + PAY_MODE[p.mode] + '</td></tr><tr><td>Amount</td><td class="amt">' + inr(p.amount) + '</td></tr><tr><td>Received by</td><td>' + esc(staff(p.by).name) + '</td></tr></table>' +
      '<div class="f"><span>Student\'s signature</span><span>Authorised signatory</span></div><p style="text-align:center;color:#98a1b5;font-size:11px;margin-top:30px">Demo receipt — dummy data</p>' +
      '<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>';
  }
  function slipHtml(e) {
    var s = staff(e.user), pr = payrollRow(e);
    var row = function (a, b) { return '<tr><td>' + a + '</td><td style="text-align:right">' + b + '</td></tr>'; };
    return '<!doctype html><html><head><meta charset="utf-8"><title>Salary slip ' + esc(s.name) + '</title><style>body{font-family:Arial,sans-serif;margin:24px;color:#0f1729}' +
      '.h{border-bottom:3px solid #f5a623;padding-bottom:10px}.h b{font-size:20px;color:#04246b}table{width:100%;border-collapse:collapse;margin-top:14px}td{padding:8px 6px;border-bottom:1px solid #e6eaf5;font-size:14px}' +
      '.net td{font-weight:bold;font-size:17px;color:#0b5cff;border-top:2px solid #0b5cff}</style></head><body><div class="h"><b>Swanidhi Group of Institutions</b><div>Salary slip — ' + pr.month + '</div></div>' +
      '<table>' + row('Employee', esc(s.name)) + row('Code', e.code) + row('Designation', esc(e.designation)) + row('Department', e.department) + '</table>' +
      '<table>' + row('Basic', inr(e.basic)) + row('HRA', inr(e.hra)) + row('Allowances', inr(e.allowances)) + row('<b>Gross</b>', '<b>' + inr(pr.gross) + '</b>') +
      row('PF (12%)', '-' + inr(pr.pf)) + row('TDS', '-' + inr(pr.tds)) + row('Leave deduction (' + pr.absent + ' days)', '-' + inr(pr.leave)) +
      '<tr class="net"><td>Net pay</td><td style="text-align:right">' + inr(pr.net) + '</td></tr></table>' +
      '<p style="text-align:center;color:#98a1b5;font-size:11px;margin-top:30px">Demo salary slip — dummy data</p><script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>';
  }
  function printHtml(html) {
    var w = window.open('', '_blank');
    if (!w) { toast('Allow pop-ups to print'); return; }
    w.document.write(html); w.document.close();
  }
  function downloadFile(name, content, type) {
    var url = URL.createObjectURL(new Blob([content], { type: type }));
    var a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function recordFeeSheet(studentId) {
    var opts = db.students.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (s) {
      return '<option value="' + s.id + '"' + (s.id === studentId ? ' selected' : '') + '>' + esc(s.name) + ' · ' + esc(s.enrollment) + '</option>';
    }).join('');
    var st = byId(db.students, studentId);
    openSheet('Record fee payment',
      '<form data-form="recordFee"><div class="card"><div class="field"><label>Student</label><select class="input" name="student" required>' + opts + '</select></div>' +
      '<div class="row2"><div class="field"><label>Amount (₹)</label><input class="input" name="amount" type="number" min="1" required inputmode="numeric" value="' + (st && dueFor(st) ? dueFor(st) : '') + '" placeholder="0"></div>' +
      '<div class="field"><label>Mode</label><select class="input" name="mode">' + Object.keys(PAY_MODE).map(function (k) { return '<option value="' + k + '">' + PAY_MODE[k] + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="field" style="margin:0"><label>Date</label><input class="input" name="date" type="date" value="' + dayKey(new Date()) + '"></div></div>' +
      '<button class="btn" type="submit">' + I('check', 18, '#fff', 2.4) + 'Save & print receipt</button></form>');
  }

  var ACTIONS = {
    back: function () { history.length > 1 ? history.back() : go(homeFor(session())); },
    closeSheet: function () { closeSheet(); },
    loginTab: function (el) { loginTab = el.dataset.v; login(); },
    demo: function (el) {
      var v = el.dataset.v;
      doLogin(v, v === 'staff' ? 'demo.admin@swanidhi.test' : v === 'student' ? 'DEMO-STU-001' : 'demo.associate@swanidhi.test', DEMO_PASSWORD);
      go(homeFor(session())); render();
    },
    logout: function () { setSession(null); loginTab = 'staff'; history.replaceState(null, '', location.pathname); render(); },
    resetDemo: function () {
      if (!confirm('Reset all demo data? Changes you made will be lost.')) return;
      DB.reset(); db = DB.get(); toast('Demo data restored', 'check'); render();
    },
    call: function (el, e) { e.preventDefault(); location.href = 'tel:+91' + el.dataset.phone; },
    wa: function (el, e) { e.preventDefault(); location.href = 'https://wa.me/91' + el.dataset.phone; },
    share: function (el) {
      if (navigator.share) navigator.share({ title: 'Swanidhi fee details', text: el.dataset.text });
    },
    leadFilter: function (el) { listState.leadStatus = el.dataset.v; rerenderKeepScroll(); },
    studentFilter: function (el) { listState.studentDept = el.dataset.v; rerenderKeepScroll(); },
    feeTab: function (el) { listState.feeTab = el.dataset.v; rerenderKeepScroll(); },
    hrTab: function (el) { listState.hrTab = el.dataset.v; rerenderKeepScroll(); },
    exportLeads: function () {
      var rows = [['Lead ID', 'Name', 'Phone', 'City', 'Course', 'Status', 'Source', 'Assigned to', 'Next follow-up', 'Created']];
      db.leads.forEach(function (l) {
        rows.push([l.id, l.name, l.phone, l.city, l.course, LEAD_STATUS[l.status][0], SOURCE[l.source], staff(l.assigned).name, l.followup ? date(l.followup) : '', date(l.created)]);
      });
      var csv = rows.map(function (r) { return r.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
      downloadFile('leads_export_' + dayKey(new Date()) + '.csv', '﻿' + csv, 'text/csv');
      toast('Exporting ' + db.leads.length + ' leads…', 'download');
    },
    updateLead: function (el) {
      var l = byId(db.leads, el.dataset.id);
      openSheet('Update lead',
        '<form data-form="updateLead" data-id="' + l.id + '"><div class="card">' +
        '<div class="field"><label>Status</label><select class="input" name="status">' + Object.keys(LEAD_STATUS).filter(function (k) { return k !== 'converted'; }).map(function (k) {
          return '<option value="' + k + '"' + (k === l.status ? ' selected' : '') + '>' + LEAD_STATUS[k][0] + '</option>';
        }).join('') + '</select></div>' +
        '<div class="row2"><div class="field"><label>Next follow-up</label><input class="input" type="date" name="followup" value="' + (l.followup ? dayKey(l.followup) : '') + '"></div>' +
        '<div class="field"><label>Assigned to</label><select class="input" name="assigned">' + staffOptions(l.assigned, ['lead', 'counselor']) + '</select></div></div>' +
        '<div class="field" style="margin:0"><label>Call note</label><textarea class="input" name="note" placeholder="What did the student say?"></textarea></div></div>' +
        '<button class="btn" type="submit">' + I('check', 18, '#fff', 2.4) + 'Save update</button></form>');
    },
    convertLead: function (el) {
      var l = byId(db.leads, el.dataset.id);
      var c = SW_COURSES.filter(function (x) { return x.name === l.course; })[0];
      openSheet('Convert to admission',
        '<form data-form="convertLead" data-id="' + l.id + '"><div class="card">' +
        '<p style="font-size:13px;color:var(--ink-soft);margin-bottom:14px">Creates a student record for <b style="color:var(--ink)">' + esc(l.name) + '</b> with an enrollment number for session 2026-27.</p>' +
        '<div class="field"><label>Course</label><select class="input" name="course">' + courseOptions(l.course) + '</select></div>' +
        '<div class="field"><label>Father\'s name</label><input class="input" name="father" required placeholder="Father / guardian name"></div>' +
        '<div class="field" style="margin:0"><label>Admission fee received now (₹)</label><input class="input" name="amount" type="number" min="0" inputmode="numeric" placeholder="Optional" value="' + (c ? Math.round(c.fee * 0.1 / 1000) * 1000 : '') + '"></div></div>' +
        '<button class="btn gold" type="submit">' + I('cap', 18) + 'Confirm admission</button></form>');
    },
    recordFee: function (el) { recordFeeSheet(el.dataset.id || null); },
    receipt: function (el) { printHtml(receiptHtml(byId(db.payments, el.dataset.id))); },
    slip: function (el) { printHtml(slipHtml(byId(db.employees, el.dataset.id))); },
    toggleDoc: function (el) {
      var st = byId(db.students, el.dataset.id), d = st.docs[+el.dataset.k];
      d.done = !d.done; save(); rerenderKeepScroll();
      toast(d.name + (d.done ? ' verified' : ' marked pending'), 'check');
    },
    toggleTask: function (el) { var t = byId(db.tasks, el.dataset.id); t.done = !t.done; save(); rerenderKeepScroll(); if (t.done) toast('Task completed', 'check'); },
    addTask: function () {
      openSheet('New task',
        '<form data-form="addTask"><div class="card"><div class="field"><label>Task</label><input class="input" name="title" required placeholder="What needs to be done?"></div>' +
        '<div class="row2"><div class="field"><label>Assign to</label><select class="input" name="assigned">' + staffOptions(me().id) + '</select></div>' +
        '<div class="field"><label>Due</label><input class="input" type="date" name="due" value="' + dayKey(Date.now() + DAY) + '"></div></div>' +
        '<div class="field" style="margin:0"><label>Priority</label><select class="input" name="priority"><option value="high">High</option><option value="medium" selected>Medium</option><option value="low">Low</option></select></div></div>' +
        '<button class="btn" type="submit">' + I('check', 18, '#fff', 2.4) + 'Add task</button></form>');
    },
    addExpense: function () {
      openSheet('Add expense',
        '<form data-form="addExpense"><div class="card"><div class="field"><label>Description</label><input class="input" name="description" required placeholder="e.g. Prospectus printing"></div>' +
        '<div class="row2"><div class="field"><label>Amount (₹)</label><input class="input" name="amount" type="number" min="1" required inputmode="numeric"></div>' +
        '<div class="field"><label>Category</label><select class="input" name="category">' + Object.keys(EXP_CAT).map(function (k) { return '<option value="' + k + '">' + EXP_CAT[k] + '</option>'; }).join('') + '</select></div></div>' +
        '<div class="row2" style="margin:0"><div class="field" style="margin:0"><label>Mode</label><select class="input" name="mode"><option value="upi">UPI</option><option value="cash">Cash</option><option value="neft">NEFT</option><option value="cheque">Cheque</option></select></div>' +
        '<div class="field" style="margin:0"><label>Date</label><input class="input" type="date" name="date" value="' + dayKey(new Date()) + '"></div></div></div>' +
        '<button class="btn" type="submit">' + I('check', 18, '#fff', 2.4) + 'Submit expense</button></form>');
    },
    approveExpense: function (el) { var e = byId(db.expenses, el.dataset.id); e.status = 'approved'; save(); rerenderKeepScroll(); toast('Expense approved', 'check'); },
    punch: function (el) {
      var u = me(), key = u.id + '|' + dayKey(new Date());
      var p = db.punches[key];
      el.disabled = true;
      var finish = function (loc) {
        if (!p) { db.punches[key] = { in: nowTime(), loc: loc }; toast('Punched in at ' + nowTime(), 'check'); }
        else { p.out = nowTime(); toast('Punched out at ' + nowTime(), 'check'); }
        save(); rerenderKeepScroll();
      };
      if (!navigator.geolocation) return finish('Location unavailable');
      el.innerHTML = I('pin', 34, p ? '#0847c7' : '#fff') + 'Locating…';
      navigator.geolocation.getCurrentPosition(function (pos) {
        finish(pos.coords.latitude.toFixed(4) + ', ' + pos.coords.longitude.toFixed(4));
      }, function () { finish('Location not shared'); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
    },
  };

  var FORMS = {
    login: function (f) {
      var err = doLogin(loginTab, f.user, f.password);
      if (err) return login(err);
      go(homeFor(session())); render();
    },
    addLead: function (f, form) {
      var c = SW_COURSES.filter(function (x) { return x.name === f.course; })[0];
      var assoc = form.dataset.assoc || null;
      var l = { id: 'L' + (1001 + db.leads.length), name: f.name.trim(), phone: digits(f.phone), city: f.city.trim() || '—', email: '', course: f.course, dept: c ? c.dept : '',
        status: 'new', source: f.source, associate: assoc, assigned: f.assigned || 'u2', created: new Date().toISOString(), updated: new Date().toISOString(),
        followup: new Date(Date.now() + DAY).toISOString(), note: f.note };
      db.leads.unshift(l);
      db.activities.push({ id: uid('A'), lead: l.id, type: 'created', text: 'Lead created' + (assoc ? ' by associate ' + byId(db.associates, assoc).name : '') + (f.note ? ' — ' + f.note : ''), by: me() ? me().id : 'u2', at: l.created });
      db.notifications.push({ id: uid('N'), title: 'New lead added', body: l.name + ' · ' + l.course, at: l.created, read: false });
      save(); toast('Lead saved', 'check');
      if (assoc) { history.back(); } else { location.replace('#/lead/' + l.id); }
    },
    updateLead: function (f, form) {
      var l = byId(db.leads, form.dataset.id), u = me();
      if (f.status !== l.status) db.activities.push({ id: uid('A'), lead: l.id, type: 'status_changed', text: 'Status changed to ' + LEAD_STATUS[f.status][0], by: u.id, at: new Date().toISOString() });
      if (f.assigned !== l.assigned) db.activities.push({ id: uid('A'), lead: l.id, type: 'assigned', text: 'Assigned to ' + staff(f.assigned).name, by: u.id, at: new Date().toISOString() });
      if (f.note.trim()) db.activities.push({ id: uid('A'), lead: l.id, type: 'note_added', text: f.note.trim(), by: u.id, at: new Date().toISOString() });
      l.status = f.status; l.assigned = f.assigned; l.followup = f.followup ? new Date(f.followup + 'T10:00').toISOString() : null; l.updated = new Date().toISOString();
      save(); closeSheet(function () { rerenderKeepScroll(); toast('Lead updated', 'check'); });
    },
    convertLead: function (f, form) {
      var l = byId(db.leads, form.dataset.id);
      var c = SW_COURSES.filter(function (x) { return x.name === f.course; })[0];
      var n = db.students.length + 1;
      var st = { id: 'S' + (100 + n) + Date.now().toString(36).slice(-3), enrollment: 'SGI-2026-' + String(n).padStart(4, '0'), name: l.name, phone: l.phone, city: l.city, father: f.father.trim(),
        course: c.name, dept: c.dept, duration: c.duration, totalFee: c.fee, session: '2026-27', counsellor: l.assigned, lead: l.id, associate: l.associate,
        enrolled: new Date().toISOString(), status: 'active',
        docs: ['10th Marksheet', '12th Marksheet', 'Aadhaar Card', 'Transfer Certificate', 'Passport Photo', 'Migration Certificate'].map(function (d) { return { name: d, done: false }; }) };
      db.students.unshift(st);
      var amt = +f.amount;
      if (amt > 0) db.payments.push({ id: uid('P'), student: st.id, amount: amt, mode: 'cash', date: new Date().toISOString(), receipt: 'SGI/RCP/' + String(db.payments.length + 1).padStart(5, '0'), by: me().id });
      l.status = 'converted'; l.followup = null; l.updated = new Date().toISOString();
      db.activities.push({ id: uid('A'), lead: l.id, type: 'converted', text: 'Converted to student ' + st.enrollment, by: me().id, at: l.updated });
      save();
      closeSheet(function () { location.replace('#/student/' + st.id); toast('Admission confirmed · ' + st.enrollment, 'check'); });
    },
    recordFee: function (f) {
      var st = byId(db.students, f.student);
      var p = { id: uid('P'), student: st.id, amount: Math.round(+f.amount), mode: f.mode, date: new Date(f.date + 'T' + nowTime()).toISOString(),
        receipt: 'SGI/RCP/' + String(db.payments.length + 1).padStart(5, '0'), by: me().id };
      db.payments.push(p);
      db.notifications.push({ id: uid('N'), title: 'Fee received', body: inr(p.amount) + ' from ' + st.name + ' via ' + PAY_MODE[p.mode], at: p.date, read: false });
      save();
      closeSheet(function () { rerenderKeepScroll(); toast(inr(p.amount) + ' recorded', 'check'); printHtml(receiptHtml(p)); });
    },
    addTask: function (f) {
      db.tasks.push({ id: uid('T'), title: f.title.trim(), assigned: f.assigned, due: new Date(f.due + 'T18:00').toISOString(), priority: f.priority, done: false });
      save(); closeSheet(function () { rerenderKeepScroll(); toast('Task added', 'check'); });
    },
    addExpense: function (f) {
      db.expenses.push({ id: uid('X'), category: f.category, description: f.description.trim(), amount: Math.round(+f.amount), date: new Date(f.date + 'T12:00').toISOString(), mode: f.mode, status: 'pending', by: me().id });
      save(); closeSheet(function () { rerenderKeepScroll(); toast('Expense submitted for approval', 'check'); });
    },
  };

  // ---------- event wiring ----------
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act],[data-go]');
    if (!el) return;
    if (el.dataset.act && ACTIONS[el.dataset.act]) {
      if (el.tagName === 'A' || el.closest('a')) e.preventDefault();
      e.stopPropagation();
      ACTIONS[el.dataset.act](el, e);
    } else if (el.dataset.go) {
      go(el.dataset.go);
    }
  });
  document.addEventListener('submit', function (e) {
    var form = e.target, name = form.dataset.form;
    if (!FORMS[name]) return;
    e.preventDefault();
    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });
    FORMS[name](data, form);
  });
  var searchTimer;
  document.addEventListener('input', function (e) {
    var id = e.target.id;
    if (id !== 'leadSearch' && id !== 'studentSearch') return;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      if (id === 'leadSearch') listState.leadQuery = e.target.value; else listState.studentQuery = e.target.value;
      var pos = e.target.selectionStart;
      rerenderKeepScroll();
      var input = document.getElementById(id);
      input.focus(); input.setSelectionRange(pos, pos);
    }, 250);
  });
  document.addEventListener('change', function (e) {
    var k = e.target.dataset && e.target.dataset.upload;
    if (k == null || !e.target.files.length) return;
    var st = myStudent(), d = st.docs[+k];
    d.done = true; d.file = e.target.files[0].name;
    save(); rerenderKeepScroll(); toast(d.name + ' uploaded', 'check');
  });
  window.addEventListener('hashchange', function () { if (sheetOpen) hideSheet(); render(); });

  render();
})();
