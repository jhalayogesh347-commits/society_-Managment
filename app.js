/* ==========================================================================
   app.js — application shell: sidebar, topbar, hash router, chart registry
   Exposed globally as `App`
   ========================================================================== */

(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ icons */

  const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    residents: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    flats: '<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-5h6v5"/><path d="M9 11h.01"/><path d="M15 11h.01"/>',
    maintenance: '<rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><path d="M8 15h3"/>',
    vendors: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11h-6"/><path d="M19 8v6"/>',
    complaints: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="13" y2="13"/>',
    payments: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><path d="M6 15h4"/>',
    reports: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="3" y1="20" x2="21" y2="20"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    fileText: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    tools: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
    wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    trendUp: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 6 12 13 2 6"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    mapPin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    droplet: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
    sparkles: '<path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/>',
    arrowRight: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    clipboard: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>'
  };

  function icon(name, cls) {
    const path = ICONS[name] || ICONS.info;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
      'stroke-linecap="round" stroke-linejoin="round"' + (cls ? ' class="' + cls + '"' : '') + '>' +
      path + '</svg>';
  }

  /* -------------------------------------------------------------- nav config */

  const ADMIN_NAV = [
    { label: 'Overview', items: [
      { section: 'dashboard', label: 'Dashboard', icon: 'dashboard' }
    ] },
    { label: 'Society', items: [
      { section: 'residents', label: 'Residents', icon: 'residents', badge: 'residents' },
      { section: 'flats', label: 'Flats', icon: 'flats', badge: 'flats' }
    ] },
    { label: 'Operations', items: [
      { section: 'maintenance', label: 'Maintenance', icon: 'maintenance', badge: 'maintenance' },
      { section: 'payments', label: 'Payments', icon: 'payments' },
      { section: 'complaints', label: 'Complaints', icon: 'complaints', badge: 'complaints' },
      { section: 'vendors', label: 'Vendors', icon: 'vendors', badge: 'vendors' }
    ] },
    { label: 'Insights', items: [
      { section: 'reports', label: 'Reports', icon: 'reports' },
      { section: 'settings', label: 'Settings', icon: 'settings' }
    ] }
  ];

  const RESIDENT_NAV = [
    { label: 'Overview', items: [
      { section: 'dashboard', label: 'Dashboard', icon: 'dashboard' }
    ] },
    { label: 'My Account', items: [
      { section: 'profile', label: 'My Profile', icon: 'user' },
      { section: 'myflat', label: 'My Flat', icon: 'home' },
      { section: 'mymaintenance', label: 'My Maintenance', icon: 'fileText' },
      { section: 'mypayments', label: 'My Payments', icon: 'wallet' },
      { section: 'mycomplaints', label: 'My Complaints', icon: 'complaints', badge: 'openComplaints' }
    ] }
  ];

  const VENDOR_NAV = [
    { label: 'Overview', items: [
      { section: 'dashboard', label: 'Dashboard', icon: 'dashboard' }
    ] },
    { label: 'My Work', items: [
      { section: 'profile', label: 'My Profile', icon: 'user' },
      { section: 'assigned', label: 'Assigned Complaints', icon: 'clipboard', badge: 'assigned' },
      { section: 'history', label: 'Service History', icon: 'clock' }
    ] }
  ];

  const NAV_BY_ROLE = { admin: ADMIN_NAV, resident: RESIDENT_NAV, vendor: VENDOR_NAV };

  /* ------------------------------------------------------------------ state */

  const state = {
    role: 'admin',
    items: [],
    sections: {},
    current: null,
    charts: {},
    user: null
  };

  /* ------------------------------------------------------------- shell build */

  function buildSidebar() {
    const settings = DB.getSettings();
    const societyName = settings.societyName || 'Society Management';
    const nav = NAV_BY_ROLE[state.role] || [];

    const scroll = nav.map(function (group) {
      const items = group.items.map(function (it) {
        return '<a class="nav-item" href="#/' + it.section + '" data-section="' + it.section + '">' +
          icon(it.icon) +
          '<span class="nav-label">' + Utils.esc(it.label) + '</span>' +
          (it.badge ? '<span class="nav-badge" data-badge="' + it.badge + '" hidden></span>' : '') +
          '</a>';
      }).join('');
      return '<div class="nav-section-label">' + Utils.esc(group.label) + '</div>' + items;
    }).join('');

    const user = state.user || Auth.currentUser() || {};
    const roleLabel = Auth.ROLE_LABEL[state.role] || state.role;

    return '<aside class="sidebar" id="sidebar">' +
      '<div class="sidebar-brand">' +
      '<div class="brand-mark">' + icon('building') + '</div>' +
      '<div class="brand-text"><h1>' + Utils.esc(societyName) + '</h1>' +
      '<span>Society Management System</span></div>' +
      '</div>' +
      '<div class="sidebar-scroll">' + scroll + '</div>' +
      '<div class="sidebar-footer">' +
      '<div class="sidebar-user">' +
      '<div class="avatar">' + Utils.esc(Utils.initials(user.name || roleLabel)) + '</div>' +
      '<div class="sidebar-user-info"><strong>' + Utils.esc(user.name || 'User') + '</strong>' +
      '<span>' + Utils.esc(roleLabel) + '</span></div>' +
      '</div>' +
      '<a class="nav-item logout" href="#" id="logoutBtn">' + icon('logout') +
      '<span>Logout</span></a>' +
      '</div></aside>';
  }

  function buildTopbar() {
    const user = state.user || {};
    const roleLabel = Auth.ROLE_LABEL[state.role] || state.role;
    const today = new Date();
    const dateStr = Utils.formatDate(today, { long: true });

    return '<button class="hamburger" id="menuToggle" aria-label="Toggle navigation">' + icon('menu') + '</button>' +
      '<div class="topbar-left"><div class="page-heading">' +
      '<h2 id="pageTitle">Dashboard</h2>' +
      '<p id="pageSubtitle">Loading…</p>' +
      '</div></div>' +
      '<div class="topbar-right">' +
      '<div class="topbar-date">' + icon('calendar') + '<span>' + Utils.esc(dateStr) + '</span></div>' +
      (state.role === 'admin'
        ? '<button class="icon-btn" id="notifBtn" aria-label="Notifications" title="Notifications">' +
          icon('bell') + '<span class="dot" id="notifDot" hidden></span></button>'
        : '') +
      '<button class="user-chip" id="userChip" aria-label="Account">' +
      '<div class="avatar">' + Utils.esc(Utils.initials(user.name || roleLabel)) + '</div>' +
      '<div class="user-chip-info"><strong>' + Utils.esc(user.name || 'User') + '</strong>' +
      '<span>' + Utils.esc(roleLabel) + '</span></div>' +
      '</button></div>';
  }

  /* ---------------------------------------------------------------- routing */

  function sectionFromHash() {
    const h = (window.location.hash || '').replace(/^#\/?/, '').trim();
    return h || state.items[0].section;
  }

  function go(section, opts) {
    if (!state.sections[section]) section = state.items[0].section;
    window.location.hash = '#/' + section;
    if (opts && opts.replace) history.replaceState(null, '', '#/' + section);
  }

  function activate(section) {
    if (!state.sections[section]) section = state.items[0].section;
    state.current = section;

    Utils.qsa('.page').forEach(function (p) {
      p.classList.toggle('active', p.id === 'page-' + section);
    });

    Utils.qsa('.nav-item[data-section]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-section') === section);
    });

    const def = state.sections[section];
    const titleEl = Utils.qs('#pageTitle');
    const subEl = Utils.qs('#pageSubtitle');
    if (titleEl) titleEl.textContent = def.title;
    if (subEl) subEl.textContent = def.subtitle || '';

    document.title = def.title + ' · ' + (DB.getSettings().societyName || 'Society Management');
    Utils.closeSidebar();
    window.scrollTo({ top: 0, behavior: 'auto' });

    try {
      if (typeof def.render === 'function') def.render(def.el, def);
    } catch (err) {
      console.error('[SMS] Render failed for "' + section + '"', err);
      if (def.el) {
        def.el.innerHTML = '<div class="card"><div class="empty-state">' +
          '<div class="empty-icon">' + icon('alert') + '</div>' +
          '<h4>Something went wrong rendering this page</h4>' +
          '<p>' + Utils.esc(err.message) + '</p>' +
          '<button class="btn" onclick="location.reload()">Reload page</button>' +
          '</div></div>';
      }
    }

    updateBadges();
  }

  function rerender() {
    if (state.current) activate(state.current);
  }

  /* ---------------------------------------------------------------- badges */

  function updateBadges() {
    const t = Domain.calculateTotals();

    const badgeValues = {
      residents: t.allResidents,
      flats: t.totalFlats,
      maintenance: t.pendingBills + t.overdueBills,
      complaints: t.openComplaints,
      vendors: t.totalVendors
    };

    if (state.role === 'resident') {
      const res = Auth.currentResident();
      const myOpen = res ? Domain.complaintsForResident(res.id)
        .filter(function (c) { return c.status === 'Pending' || c.status === 'In Progress'; }).length : 0;
      badgeValues.openComplaints = myOpen;
    }

    if (state.role === 'vendor') {
      const v = Auth.currentVendor();
      badgeValues.assigned = v ? Domain.complaintsForVendor(v.id)
        .filter(function (c) { return c.status !== 'Resolved' && c.status !== 'Rejected'; }).length : 0;
    }

    Utils.qsa('[data-badge]').forEach(function (el) {
      const key = el.getAttribute('data-badge');
      const val = badgeValues[key];
      if (val === undefined || val === null || Number(val) === 0) {
        el.hidden = true;
        el.textContent = '';
      } else {
        el.hidden = false;
        el.textContent = String(val);
        el.classList.toggle('danger', key === 'complaints' && Number(val) > 0);
      }
    });

    // Notification dot for admin: anything needing attention
    const dot = Utils.qs('#notifDot');
    if (dot) {
      const alertCount = t.overdueBills + t.pendingComplaints + t.vacantFlats;
      dot.hidden = alertCount === 0;
    }
  }

  /* ---------------------------------------------------------------- charts */

  /** Create/replace a Chart.js chart bound to a canvas id. */
  function chart(canvasId, config, key) {
    const canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
    if (!canvas) return null;
    if (typeof Chart === 'undefined') {
      const holder = canvas.closest('.chart-holder');
      if (holder) {
        holder.innerHTML = '<div class="empty-mini">Charts require an internet connection (Chart.js CDN).</div>';
      }
      return null;
    }
    const id = key || canvas.id;
    if (state.charts[id]) {
      try { state.charts[id].destroy(); } catch (e) { /* ignore */ }
      delete state.charts[id];
    }
    const instance = new Chart(canvas.getContext('2d'), config);
    state.charts[id] = instance;
    return instance;
  }

  function destroyChart(id) {
    if (state.charts[id]) {
      try { state.charts[id].destroy(); } catch (e) { /* ignore */ }
      delete state.charts[id];
    }
  }

  function destroyAllCharts() {
    Object.keys(state.charts).forEach(function (k) {
      try { state.charts[k].destroy(); } catch (e) { /* ignore */ }
      delete state.charts[k];
    });
  }

  /* -------------------------------------------------------------- helpers */

  const PALETTE = {
    blue: '#2563eb',
    blueSoft: 'rgba(37, 99, 235, 0.12)',
    green: '#16a34a',
    greenSoft: 'rgba(22, 163, 74, 0.12)',
    orange: '#f59e0b',
    red: '#dc2626',
    violet: '#7c3aed',
    cyan: '#0891b2',
    navy: '#1e293b',
    slate: '#94a3b8'
  };

  /** Apply consistent Chart.js look & feel. */
  function chartDefaults() {
    if (typeof Chart === 'undefined') return;
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 11.5;
    Chart.defaults.color = '#78829b';
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 8;
    Chart.defaults.plugins.legend.labels.boxHeight = 8;
    Chart.defaults.plugins.legend.labels.padding = 14;
    Chart.defaults.plugins.legend.position = 'bottom';
    Chart.defaults.plugins.tooltip.backgroundColor = '#0b1533';
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.titleFont = { weight: '600', size: 12 };
    Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };
    Chart.defaults.plugins.tooltip.displayColors = true;
    Chart.defaults.plugins.tooltip.boxPadding = 4;
    Chart.defaults.maintainAspectRatio = false;
  }

  const AXIS = {
    grid: { color: '#eef1f8', drawTicks: false, drawBorder: false },
    border: { display: false },
    ticks: { padding: 8 }
  };

  /* ------------------------------------------------------------- table utils */

  /**
   * Generic sorted-table helper: keeps a sort state per table and renders.
   * @param {{key:string, dir:'asc'|'desc'}} sortState
   */
  function sortData(rows, sortState) {
    if (!sortState || !sortState.key) return rows;
    return Utils.sortBy(rows, sortState.key, sortState.dir);
  }

  function emptyState(opts) {
    const o = opts || {};
    return '<div class="empty-state"><div class="empty-icon">' + icon(o.icon || 'inbox') + '</div>' +
      '<h4>' + Utils.esc(o.title || 'Nothing here yet') + '</h4>' +
      '<p>' + Utils.esc(o.message || '') + '</p>' +
      (o.action ? '<button class="btn" data-empty-action>' + icon('plus') + Utils.esc(o.action) + '</button>' : '') +
      '</div>';
  }

  /** Badge class for a status string. */
  function statusClass(status) {
    const map = {
      Paid: 'success', Active: 'success', Resolved: 'success', Occupied: 'success', Success: 'success',
      Pending: 'warning', 'In Progress': 'info', Vacant: 'neutral', Inactive: 'neutral',
      Overdue: 'danger', Rejected: 'danger', Urgent: 'danger',
      Owner: 'navy', Tenant: 'violet', Low: 'neutral', Medium: 'info', High: 'warning'
    };
    return map[status] || 'neutral';
  }

  /* ------------------------------------------------------------------ mount */

  /**
   * Mount the shell.
   * @param {{role:string, sections:Object}} opts
   */
  function mount(opts) {
    state.role = opts.role;
    state.user = Auth.currentUser();
    state.sections = opts.sections || {};
    state.items = [];
    (NAV_BY_ROLE[state.role] || []).forEach(function (g) {
      g.items.forEach(function (i) { state.items.push(i); });
    });

    const appEl = Utils.qs('#app');
    if (!appEl) return;

    // Create one panel per section inside .content
    const content = Utils.qs('#content');
    if (content) {
      content.innerHTML = '';
      state.items.forEach(function (item) {
        const def = state.sections[item.section];
        if (!def) return;
        const page = document.createElement('div');
        page.className = 'page';
        page.id = 'page-' + item.section;
        content.appendChild(page);
        def.el = page;
      });
    }

    // Sidebar goes first inside .app; backdrop + main already exist
    const backdrop = Utils.qs('#sidebarBackdrop');
    appEl.insertAdjacentHTML('afterbegin', buildSidebar());
    if (!backdrop) {
      const bd = document.createElement('div');
      bd.className = 'sidebar-backdrop';
      bd.id = 'sidebarBackdrop';
      appEl.insertBefore(bd, Utils.qs('.main'));
    }

    const topbar = Utils.qs('#topbar');
    if (topbar) topbar.innerHTML = buildTopbar();

    // Bind shell controls
    const menuBtn = Utils.qs('#menuToggle');
    if (menuBtn) {
      menuBtn.addEventListener('click', function () {
        const sb = Utils.qs('#sidebar');
        sb.classList.toggle('open');
        Utils.qs('#sidebarBackdrop').classList.toggle('show', sb.classList.contains('open'));
      });
    }
    const bdEl = Utils.qs('#sidebarBackdrop');
    if (bdEl) bdEl.addEventListener('click', Utils.closeSidebar);

    const logoutBtn = Utils.qs('#logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function (e) {
        e.preventDefault();
        Utils.confirmDialog({
          title: 'Log out of the system?',
          message: 'You will need to sign in again to access your dashboard.',
          confirmText: 'Log out',
          cancelText: 'Stay signed in'
        }).then(function (ok) { if (ok) Auth.logout(); });
      });
    }

    const notifBtn = Utils.qs('#notifBtn');
    if (notifBtn) {
      notifBtn.addEventListener('click', function () {
        showNotifications();
      });
    }

    const userChip = Utils.qs('#userChip');
    if (userChip) {
      userChip.addEventListener('click', function () {
        const target = state.role === 'admin' ? 'settings' : 'profile';
        go(target);
      });
    }

    // Router
    window.addEventListener('hashchange', function () {
      const s = sectionFromHash();
      if (s !== state.current) activate(s);
    });

    // Intercept in-page links to sections
    document.addEventListener('click', function (e) {
      const link = e.target.closest('a[data-section]');
      if (!link) return;
      e.preventDefault();
      go(link.getAttribute('data-section'));
    });

    chartDefaults();
    Utils.initModals();

    const first = sectionFromHash();
    if (window.location.hash) {
      activate(first);
    } else {
      go(first, { replace: true });
      activate(first);
    }

    // Keep derived data consistent on load
    Domain.syncAll();
    updateBadges();

    // Refresh relative timestamps / badges every minute
    setInterval(updateBadges, 60000);
  }

  /** Notification panel for admin (overdue bills + pending complaints + vacant flats). */
  function showNotifications() {
    const t = Domain.calculateTotals();
    const overdue = DB.getData('maintenance').filter(function (b) { return b.status === 'Overdue'; });
    const pending = DB.getData('complaints').filter(function (c) { return c.status === 'Pending'; });
    const vacant = DB.getData('flats').filter(function (f) { return f.status === 'Vacant'; });

    const rows = [];
    overdue.slice(0, 4).forEach(function (b) {
      rows.push({ icon: 'alert', cls: 'red', title: 'Bill overdue · ' + b.flatNo,
        sub: b.residentName + ' · ' + Utils.formatCurrency(Domain.billOutstanding(b)) + ' due ' + Utils.formatDate(b.dueDate),
        section: 'maintenance' });
    });
    pending.slice(0, 3).forEach(function (c) {
      rows.push({ icon: 'complaints', cls: 'orange', title: c.title,
        sub: c.flatNo + ' · raised ' + Utils.formatDate(c.submittedAt), section: 'complaints' });
    });
    if (vacant.length) {
      rows.push({ icon: 'flats', cls: 'blue', title: vacant.length + ' flat(s) vacant',
        sub: vacant.map(function (f) { return f.flatNo; }).slice(0, 5).join(', '), section: 'flats' });
    }

    const body = rows.length
      ? rows.map(function (r) {
          return '<a class="mini-row" href="#/' + r.section + '" data-section="' + r.section + '" ' +
            'style="text-decoration:none">' +
            '<div class="stat-icon ' + r.cls + '" style="width:34px;height:34px;border-radius:9px">' +
            icon(r.icon) + '</div>' +
            '<div class="info"><strong>' + Utils.esc(r.title) + '</strong>' +
            '<span>' + Utils.esc(r.sub) + '</span></div></a>';
        }).join('')
      : '<div class="empty-mini">You are all caught up — no pending items.</div>';

    let overlay = Utils.qs('#notifOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'notifOverlay';
      overlay.innerHTML = '<div class="modal narrow" role="dialog">' +
        '<div class="modal-head"><div><h3>Notifications</h3>' +
        '<p>' + t.overdueBills + ' overdue bill(s) · ' + t.pendingComplaints + ' pending complaint(s)</p></div>' +
        '<button class="modal-close" data-close aria-label="Close">' + icon('x') + '</button></div>' +
        '<div class="modal-body flush" id="notifBody"></div>' +
        '<div class="modal-foot"><button class="btn secondary" data-close>Close</button></div></div>';
      document.body.appendChild(overlay);
      overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) Utils.closeModal(overlay); });
      Utils.qsa('[data-close]', overlay).forEach(function (b) {
        b.addEventListener('click', function () { Utils.closeModal(overlay); });
      });
    }
    Utils.qs('#notifBody').innerHTML = '<div class="mini-list">' + body + '</div>';
    Utils.openModal('notifOverlay');
  }

  /* --------------------------------------------------------------- pagination */

  /** Slice rows for the current page. */
  function paginate(rows, page, perPage) {
    const size = perPage || 10;
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / size));
    const current = Math.min(Math.max(1, page || 1), pages);
    const start = (current - 1) * size;
    return {
      rows: rows.slice(start, start + size),
      page: current,
      pages: pages,
      total: total,
      from: total ? start + 1 : 0,
      to: Math.min(start + size, total)
    };
  }

  /** HTML for a pager bar. Buttons carry data-page for the module to bind. */
  function pager(result, pagerId) {
    if (result.pages <= 1) {
      return '<div class="pager" id="' + pagerId + '">' +
        '<span class="pager-info">' + result.total + ' record' + (result.total === 1 ? '' : 's') + '</span>' +
        '</div>';
    }
    let buttons = '';
    const pages = [];
    const cur = result.page;
    for (let i = 1; i <= result.pages; i++) {
      if (i === 1 || i === result.pages || (i >= cur - 1 && i <= cur + 1)) pages.push(i);
      else if (pages[pages.length - 1] !== '…') pages.push('…');
    }
    pages.forEach(function (p) {
      if (p === '…') {
        buttons += '<span class="pager-gap">…</span>';
      } else {
        buttons += '<button type="button" class="pager-btn' + (p === cur ? ' active' : '') +
          '" data-page="' + p + '">' + p + '</button>';
      }
    });
    return '<div class="pager" id="' + pagerId + '">' +
      '<span class="pager-info">Showing ' + result.from + '–' + result.to + ' of ' + result.total + '</span>' +
      '<div class="pager-controls">' +
      '<button type="button" class="pager-btn" data-page="' + (cur - 1) + '"' +
      (cur === 1 ? ' disabled' : '') + ' aria-label="Previous page">‹</button>' +
      buttons +
      '<button type="button" class="pager-btn" data-page="' + (cur + 1) + '"' +
      (cur === result.pages ? ' disabled' : '') + ' aria-label="Next page">›</button>' +
      '</div></div>';
  }

  /** Wire pager buttons to a callback receiving the clicked page number. */
  function bindPager(pagerId, onPage) {
    const el = document.getElementById(pagerId);
    if (!el) return;
    Utils.qsa('.pager-btn', el).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        const p = Number(btn.getAttribute('data-page'));
        if (isFinite(p) && p > 0) onPage(p);
      });
    });
  }

  /* ----------------------------------------------------------------- export */

  global.App = {
    paginate: paginate,
    pager: pager,
    bindPager: bindPager,
    ICONS: ICONS,
    PALETTE: PALETTE,
    AXIS: AXIS,
    state: state,
    icon: icon,
    mount: mount,
    go: go,
    rerender: rerender,
    updateBadges: updateBadges,
    chart: chart,
    destroyChart: destroyChart,
    destroyAllCharts: destroyAllCharts,
    chartDefaults: chartDefaults,
    sortData: sortData,
    emptyState: emptyState,
    statusClass: statusClass,
    NAV_BY_ROLE: NAV_BY_ROLE
  };
})(window);
