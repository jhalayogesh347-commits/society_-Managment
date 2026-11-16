/* ==========================================================================
   utils.js — formatting, DOM helpers, notifications, dialogs, validation
   Exposed globally as `Utils`
   ========================================================================== */

(function (global) {
  'use strict';

  /* ---------------------------------------------------------------- money */

  const inr = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  });

  /** Format a number as Indian Rupees: 2500 -> "₹2,500" */
  function formatCurrency(value) {
    const n = Number(value);
    if (!isFinite(n)) return '₹0';
    return inr.format(n);
  }

  /** Compact currency for stat cards: 125000 -> "₹1.25L" */
  function formatCurrencyCompact(value) {
    const n = Number(value) || 0;
    if (Math.abs(n) >= 10000000) return '₹' + (n / 10000000).toFixed(2).replace(/\.00$/, '') + ' Cr';
    if (Math.abs(n) >= 100000) return '₹' + (n / 100000).toFixed(2).replace(/\.00$/, '') + ' L';
    if (Math.abs(n) >= 1000) return '₹' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return formatCurrency(n);
  }

  function formatNumber(value) {
    const n = Number(value);
    return isFinite(n) ? new Intl.NumberFormat('en-IN').format(n) : '0';
  }

  /* ---------------------------------------------------------------- dates */

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /** Parse 'YYYY-MM-DD' safely into a local Date (avoids UTC shift). */
  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value) ? null : value;
    const s = String(value).trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const d = new Date(s);
    return isNaN(d) ? null : d;
  }

  /** '2025-03-14' -> "14 Mar 2025" */
  function formatDate(value, opts) {
    const d = parseDate(value);
    if (!d) return '—';
    const o = opts || {};
    if (o.long) {
      return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    }
    return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
  }

  /** "14 Mar 2025, 4:30 PM" */
  function formatDateTime(value) {
    const d = parseDate(value);
    if (!d) return '—';
    let h = d.getHours();
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const mm = String(d.getMinutes()).padStart(2, '0');
    return formatDate(d) + ', ' + h + ':' + mm + ' ' + ap;
  }

  /** Today's date as 'YYYY-MM-DD' in local time. */
  function todayISO() {
    return toISO(new Date());
  }

  function toISO(date) {
    const d = date || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
      '-' + String(d.getDate()).padStart(2, '0');
  }

  /** "March 2025" from month(1-12) + year */
  function formatMonthYear(month, year) {
    const m = Number(month);
    if (!m || m < 1 || m > 12) return '—';
    return MONTHS[m - 1] + ' ' + year;
  }

  function monthShort(month) {
    const m = Number(month);
    return (m >= 1 && m <= 12) ? MONTHS_SHORT[m - 1] : '—';
  }

  /** Whole days between two dates (b - a). */
  function daysBetween(a, b) {
    const d1 = parseDate(a);
    const d2 = parseDate(b);
    if (!d1 || !d2) return 0;
    return Math.round((d2 - d1) / 86400000);
  }

  function relativeDays(value) {
    const d = parseDate(value);
    if (!d) return '—';
    const diff = daysBetween(todayISO(), d);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    if (diff < 0) return Math.abs(diff) + ' days ago';
    return 'in ' + diff + ' days';
  }

  /** Add N months to a date, clamped to the last valid day. */
  function addMonths(date, n) {
    const d = new Date(date.getTime());
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + n);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    return d;
  }

  function monthKey(month, year) {
    return String(year) + '-' + String(month).padStart(2, '0');
  }

  /** Last 6 month buckets ending with the current month. */
  function lastMonths(count) {
    const out = [];
    const now = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const d = addMonths(now, -i);
      out.push({ month: d.getMonth() + 1, year: d.getFullYear() });
    }
    return out;
  }

  function fiscalYearLabel(date) {
    const d = parseDate(date) || new Date();
    const y = d.getFullYear();
    return d.getMonth() >= 3 ? y + '-' + String(y + 1).slice(2) : (y - 1) + '-' + String(y).slice(2);
  }

  /* ------------------------------------------------------------------ dom */

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /** Escape user-supplied text before injecting into HTML. */
  function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Initials for avatars: "Rohit Sharma" -> "RS" */
  function initials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function debounce(fn, wait) {
    let t;
    return function () {
      const args = arguments;
      const ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait || 220);
    };
  }

  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* --------------------------------------------------------------- toasts */

  const TOAST_ICONS = {
    success: '<polyline points="20 6 9 17 4 12"/>',
    error: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    warning: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
  };

  function toastStack() {
    let stack = qs('#toastStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'toastStack';
      stack.className = 'toast-stack';
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    return stack;
  }

  /**
   * Show a toast notification.
   * @param {string} message  Body text
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {string} [title]
   */
  function toast(message, type, title) {
    const t = type || 'success';
    const stack = toastStack();
    const node = document.createElement('div');
    node.className = 'toast ' + t;

    const titles = { success: 'Success', error: 'Error', warning: 'Please check', info: 'Notice' };
    node.innerHTML =
      '<div class="t-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
      (TOAST_ICONS[t] || TOAST_ICONS.info) + '</svg></div>' +
      '<div class="t-body"><strong>' + esc(title || titles[t]) + '</strong>' +
      '<span>' + esc(message) + '</span></div>' +
      '<button class="t-close" type="button" aria-label="Dismiss">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
      'stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</button>';

    function dismiss() {
      if (!node.parentNode) return;
      node.classList.add('leaving');
      setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 210);
    }

    node.querySelector('.t-close').addEventListener('click', dismiss);
    stack.appendChild(node);
    setTimeout(dismiss, 4200);
    return node;
  }

  /* --------------------------------------------------------------- modals */

  /**
   * Open a modal by id (element with class .modal-overlay).
   * Scrolls the overlay to top and focuses the first input.
   */
  function openModal(id) {
    const overlay = typeof id === 'string' ? qs('#' + id) : id;
    if (!overlay) return;
    overlay.classList.add('open');
    overlay.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    setTimeout(function () {
      const input = overlay.querySelector('input:not([type=hidden]):not([disabled]), select, textarea');
      if (input) { try { input.focus(); } catch (e) { /* ignore */ } }
    }, 60);
  }

  function closeModal(id) {
    const overlay = typeof id === 'string' ? qs('#' + id) : id;
    if (!overlay) return;
    overlay.classList.remove('open');
    if (!qs('.modal-overlay.open')) document.body.style.overflow = '';
  }

  /** Wire backdrop-click + [data-close] + Escape for every modal on the page. */
  function initModals() {
    qsa('.modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('mousedown', function (e) {
        if (e.target === overlay) closeModal(overlay);
      });
      qsa('[data-close]', overlay).forEach(function (btn) {
        btn.addEventListener('click', function () { closeModal(overlay); });
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        const open = qsa('.modal-overlay.open');
        if (open.length) {
          closeModal(open[open.length - 1]);
        } else {
          closeSidebar();
        }
      }
    });
  }

  function closeSidebar() {
    const sb = qs('#sidebar');
    if (sb) sb.classList.remove('open');
    const bd = qs('#sidebarBackdrop');
    if (bd) bd.classList.remove('show');
  }

  /* ------------------------------------------------------- confirm dialog */

  /**
   * Promise-based confirmation dialog. Resolves true when confirmed.
   * @param {{title?:string, message?:string, confirmText?:string, cancelText?:string, danger?:boolean}} opts
   */
  function confirmDialog(opts) {
    const o = opts || {};
    return new Promise(function (resolve) {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay open';
      overlay.style.zIndex = '500';
      overlay.innerHTML =
        '<div class="modal narrow" role="dialog" aria-modal="true">' +
        '<div class="confirm-body">' +
        '<div class="confirm-icon" style="' + (o.danger === false
          ? 'background:var(--warning-bg);color:var(--warning)' : '') + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>' +
        '<line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
        '</div><div class="confirm-text"><h3>' + esc(o.title || 'Are you sure?') + '</h3>' +
        '<p>' + esc(o.message || 'This action cannot be undone.') + '</p></div></div>' +
        '<div class="modal-foot">' +
        '<button type="button" class="btn secondary" data-act="cancel">' + esc(o.cancelText || 'Cancel') + '</button>' +
        '<button type="button" class="btn ' + (o.danger === false ? 'warn' : 'danger') + '" data-act="ok">' +
        esc(o.confirmText || 'Delete') + '</button>' +
        '</div></div>';

      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';

      function done(val) {
        overlay.remove();
        if (!qs('.modal-overlay.open')) document.body.style.overflow = '';
        document.removeEventListener('keydown', onKey);
        resolve(val);
      }

      function onKey(e) { if (e.key === 'Escape') done(false); }

      overlay.querySelector('[data-act="ok"]').addEventListener('click', function () { done(true); });
      overlay.querySelector('[data-act="cancel"]').addEventListener('click', function () { done(false); });
      overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) done(false); });
      document.addEventListener('keydown', onKey);
      setTimeout(function () { overlay.querySelector('[data-act="ok"]').focus(); }, 50);
    });
  }

  /* ------------------------------------------------------------ validation */

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  const PHONE_RE = /^[6-9]\d{9}$/;

  function isEmail(v) { return EMAIL_RE.test(String(v || '').trim()); }

  /** Accepts 10-digit Indian mobile numbers, ignoring +91 / spaces / dashes. */
  function isPhone(v) {
    const digits = String(v || '').replace(/[\s\-()]/g, '').replace(/^\+?91/, '');
    return PHONE_RE.test(digits);
  }

  function normalisePhone(v) {
    return String(v || '').replace(/[\s\-()]/g, '').replace(/^\+?91/, '');
  }

  function isPositiveNumber(v) {
    const n = Number(v);
    return isFinite(n) && n > 0;
  }

  function isNonNegativeNumber(v) {
    const n = Number(v);
    return isFinite(n) && n >= 0;
  }

  /**
   * Declarative form validation.
   * rules: { fieldName: { required, email, phone, number, min, max, label, custom } }
   * Returns true when valid; marks .field wrappers with .invalid + message.
   */
  function validateForm(formEl, rules) {
    let ok = true;
    let firstBad = null;

    Object.keys(rules).forEach(function (name) {
      const rule = rules[name] || {};
      const input = formEl.querySelector('[name="' + name + '"]');
      if (!input) return;

      const field = input.closest('.field');
      const label = rule.label || name;
      let msg = '';
      const raw = input.type === 'checkbox' ? (input.checked ? 'on' : '') : String(input.value || '').trim();

      if (rule.required && !raw) {
        msg = label + ' is required.';
      } else if (raw) {
        if (rule.email && !isEmail(raw)) msg = 'Enter a valid email address.';
        else if (rule.phone && !isPhone(raw)) msg = 'Enter a valid 10-digit mobile number.';
        else if (rule.number && !isFinite(Number(raw))) msg = label + ' must be a number.';
        else if (rule.min !== undefined && Number(raw) < rule.min) msg = label + ' must be at least ' + rule.min + '.';
        else if (rule.max !== undefined && Number(raw) > rule.max) msg = label + ' must not exceed ' + rule.max + '.';
        else if (rule.pattern && !rule.pattern.test(raw)) msg = rule.patternMessage || (label + ' is invalid.');
        else if (typeof rule.custom === 'function') {
          const res = rule.custom(raw, formEl);
          if (res) msg = res;
        }
      }

      if (field) {
        const errEl = field.querySelector('.error-msg');
        if (msg) {
          field.classList.add('invalid');
          if (errEl) errEl.textContent = msg;
          if (!firstBad) firstBad = input;
          ok = false;
        } else {
          field.classList.remove('invalid');
        }
      }
    });

    if (firstBad) {
      try { firstBad.focus(); } catch (e) { /* ignore */ }
      firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    return ok;
  }

  /** Clear all .invalid marks inside a form. */
  function resetFormState(formEl) {
    if (!formEl) return;
    qsa('.field.invalid', formEl).forEach(function (f) { f.classList.remove('invalid'); });
  }

  /* -------------------------------------------------------------- CSV/print */

  /** Download an array of objects as a CSV file. */
  function exportCSV(filename, rows, columns) {
    if (!rows || !rows.length) {
      toast('There is nothing to export for this selection.', 'warning', 'Nothing to export');
      return;
    }
    const cols = columns || Object.keys(rows[0]).map(function (k) { return { key: k, label: k }; });

    function cell(v) {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }

    const lines = [cols.map(function (c) { return cell(c.label); }).join(',')];
    rows.forEach(function (r) {
      lines.push(cols.map(function (c) {
        const val = typeof c.value === 'function' ? c.value(r) : r[c.key];
        return cell(val);
      }).join(','));
    });

    // BOM keeps ₹ and Indian characters intact in Excel
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1200);

    toast('Downloaded ' + filename, 'success', 'CSV exported');
  }

  function printElement(el) {
    if (!el) { window.print(); return; }
    const win = window.open('', '_blank', 'width=900,height=680');
    if (!win) {
      toast('Allow pop-ups to print this document.', 'warning', 'Print blocked');
      return;
    }
    const styles = qsa('link[rel="stylesheet"]').map(function (l) {
      return '<link rel="stylesheet" href="' + l.href + '">';
    }).join('');
    win.document.write(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Print</title>' + styles +
      '<style>body{background:#fff;padding:18px;font-family:Inter,sans-serif}' +
      '.no-print,.btn,.act-btn,.row-actions{display:none!important}' +
      'table.data{min-width:0}table.data thead th{position:static}</style>' +
      '</head><body>' + el.innerHTML + '</body></html>'
    );
    win.document.close();
    win.focus();
    setTimeout(function () { win.print(); }, 450);
  }

  /* ---------------------------------------------------------------- misc */

  /** Sort an array of records by a key, ascending or descending. */
  function sortBy(arr, key, dir) {
    const sign = dir === 'desc' ? -1 : 1;
    return arr.slice().sort(function (a, b) {
      let x = a[key];
      let y = b[key];
      if (typeof x === 'string') x = x.toLowerCase();
      if (typeof y === 'string') y = y.toLowerCase();
      if (x === y) return 0;
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      return x < y ? -sign : sign;
    });
  }

  function unique(arr) {
    return arr.filter(function (v, i, self) { return self.indexOf(v) === i; });
  }

  function sum(arr, key) {
    return arr.reduce(function (acc, item) {
      const v = key ? item[key] : item;
      const n = Number(v);
      return acc + (isFinite(n) ? n : 0);
    }, 0);
  }

  function groupCount(arr, key) {
    const out = {};
    arr.forEach(function (item) {
      const k = typeof key === 'function' ? key(item) : item[key];
      out[k] = (out[k] || 0) + 1;
    });
    return out;
  }

  /** Line-clamp helper for long text in tables. */
  function truncate(str, len) {
    const s = String(str || '');
    return s.length > len ? s.slice(0, len - 1) + '…' : s;
  }

  function downloadJSON(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  global.Utils = {
    // money
    formatCurrency: formatCurrency,
    formatCurrencyCompact: formatCurrencyCompact,
    formatNumber: formatNumber,
    // dates
    MONTHS: MONTHS,
    MONTHS_SHORT: MONTHS_SHORT,
    parseDate: parseDate,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    todayISO: todayISO,
    toISO: toISO,
    formatMonthYear: formatMonthYear,
    monthShort: monthShort,
    daysBetween: daysBetween,
    relativeDays: relativeDays,
    addMonths: addMonths,
    monthKey: monthKey,
    lastMonths: lastMonths,
    fiscalYearLabel: fiscalYearLabel,
    // dom
    qs: qs,
    qsa: qsa,
    esc: esc,
    initials: initials,
    debounce: debounce,
    uid: uid,
    // feedback
    toast: toast,
    openModal: openModal,
    closeModal: closeModal,
    initModals: initModals,
    closeSidebar: closeSidebar,
    confirmDialog: confirmDialog,
    // validation
    isEmail: isEmail,
    isPhone: isPhone,
    normalisePhone: normalisePhone,
    isPositiveNumber: isPositiveNumber,
    isNonNegativeNumber: isNonNegativeNumber,
    validateForm: validateForm,
    resetFormState: resetFormState,
    // io
    exportCSV: exportCSV,
    printElement: printElement,
    downloadJSON: downloadJSON,
    // collections
    sortBy: sortBy,
    unique: unique,
    sum: sum,
    groupCount: groupCount,
    truncate: truncate
  };
})(window);
