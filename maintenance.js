/* ==========================================================================
   maintenance.js — maintenance bills: generate, view, filter, pay
   ========================================================================== */

(function (global) {
  'use strict';

  const S = {
    search: '',
    month: '',
    status: '',
    building: '',
    sort: { key: 'period', dir: 'desc' },
    page: 1,
    perPage: 10
  };

  const MODAL = 'billModal';
  const GEN_MODAL = 'generateModal';

  /* ---------------------------------------------------------------- helpers */

  function allBills() {
    return DB.getData('maintenance').map(function (b) {
      return Object.assign({}, b, {
        period: Number(b.year) * 100 + Number(b.month),
        periodLabel: Utils.formatMonthYear(b.month, b.year),
        outstanding: Domain.billOutstanding(b)
      });
    });
  }

  function monthOptions() {
    const now = new Date();
    const opts = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push({ month: d.getMonth() + 1, year: d.getFullYear() });
    }
    return opts;
  }

  function filtered() {
    let rows = allBills();

    if (S.search) {
      const q = S.search.toLowerCase();
      rows = rows.filter(function (b) {
        return [b.billNo, b.residentName, b.flatNo, b.building, b.id]
          .join(' ').toLowerCase().indexOf(q) !== -1;
      });
    }
    if (S.month) {
      const parts = S.month.split('-');
      rows = rows.filter(function (b) {
        return Number(b.month) === Number(parts[1]) && Number(b.year) === Number(parts[0]);
      });
    }
    if (S.status) rows = rows.filter(function (b) { return b.status === S.status; });
    if (S.building) rows = rows.filter(function (b) { return b.building === S.building; });

    return App.sortData(rows, S.sort);
  }

  function buildings() {
    const a = DB.getData('flats').map(function (f) { return f.building; });
    const b = DB.getSettings().buildings || [];
    return Utils.unique(a.concat(b)).filter(Boolean).sort();
  }

  /* ------------------------------------------------------------------- table */

  function tableHTML(rows) {
    if (!rows.length) {
      return App.emptyState({
        icon: 'maintenance',
        title: 'No maintenance bills found',
        message: 'Generate bills for this period, or adjust the filters to see existing records.',
        action: 'Generate Bills'
      });
    }

    const head = [
      { key: 'billNo', label: 'Bill No.' },
      { key: 'residentName', label: 'Resident' },
      { key: 'flatNo', label: 'Flat' },
      { key: 'period', label: 'Period' },
      { key: 'totalAmount', label: 'Total', right: true },
      { key: 'outstanding', label: 'Outstanding', right: true },
      { key: 'dueDate', label: 'Due Date' },
      { key: 'status', label: 'Status' },
      { key: null, label: 'Actions', right: true }
    ].map(function (c) {
      if (!c.key) return '<th class="text-right">' + c.label + '</th>';
      const sorted = S.sort.key === c.key;
      return '<th class="sortable' + (sorted ? ' sorted' : '') + (c.right ? ' text-right' : '') +
        '" data-sort="' + c.key + '">' + c.label +
        '<span class="sort-ind">' + (sorted ? (S.sort.dir === 'asc' ? '▲' : '▼') : '▾') + '</span></th>';
    }).join('');

    const body = rows.map(function (b) {
      const overdueDays = b.status === 'Overdue' ? Math.abs(Utils.daysBetween(Utils.todayISO(), b.dueDate)) : 0;
      return '<tr>' +
        '<td class="strong">' + Utils.esc(b.billNo) +
        '<div class="cell-id">' + Utils.esc(b.id) + '</div></td>' +
        '<td><div class="cell-user" style="gap:8px">' +
        '<div class="avatar sm">' + Utils.esc(Utils.initials(b.residentName)) + '</div>' +
        '<div class="info"><strong style="font-size:13px">' + Utils.esc(b.residentName) + '</strong></div>' +
        '</div></td>' +
        '<td class="strong">' + Utils.esc(b.flatNo) +
        '<div style="font-size:11.5px;font-weight:400;color:var(--muted)">' +
        Utils.esc(b.building) + '</div></td>' +
        '<td class="nowrap">' + Utils.esc(b.periodLabel) + '</td>' +
        '<td class="text-right mono strong">' + Utils.formatCurrency(b.totalAmount) + '</td>' +
        '<td class="text-right mono" style="color:' +
        (b.outstanding > 0 ? 'var(--danger)' : 'var(--success)') + ';font-weight:600">' +
        Utils.formatCurrency(b.outstanding) + '</td>' +
        '<td class="nowrap">' + Utils.esc(Utils.formatDate(b.dueDate)) +
        (overdueDays ? '<div style="font-size:11.5px;color:var(--danger)">' + overdueDays +
          ' day(s) late</div>' : '') + '</td>' +
        '<td><span class="badge ' + App.statusClass(b.status) + '">' + Utils.esc(b.status) + '</span></td>' +
        '<td><div class="row-actions">' +
        '<button class="act-btn" data-view="' + b.id + '" title="View bill" aria-label="View">' +
        App.icon('eye') + '</button>' +
        (b.outstanding > 0
          ? '<button class="act-btn ok" data-pay="' + b.id + '" title="Record payment" aria-label="Record payment">' +
            App.icon('wallet') + '</button>'
          : '') +
        '<button class="act-btn" data-edit="' + b.id + '" title="Edit bill" aria-label="Edit">' +
        App.icon('edit') + '</button>' +
        '<button class="act-btn del" data-del="' + b.id + '" title="Delete bill" aria-label="Delete">' +
        App.icon('trash') + '</button>' +
        '</div></td></tr>';
    }).join('');

    return '<div class="table-wrap"><table class="data"><thead><tr>' + head +
      '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }

  /* ------------------------------------------------------- generate dialog */

  function openGenerate() {
    const now = new Date();
    const settings = DB.getSettings();
    const dueDay = settings.defaultDueDay || 10;

    const flatOpts = DB.getData('flats')
      .filter(function (f) { return f.status === 'Occupied'; })
      .sort(function (a, b) { return String(a.flatNo).localeCompare(String(b.flatNo)); })
      .map(function (f) {
        return '<option value="' + f.id + '">' +
          Utils.esc(f.flatNo + ' · ' + f.building + ' · ' + f.type) + '</option>';
      }).join('');

    const monthOpts = Utils.MONTHS.map(function (m, i) {
      return '<option value="' + (i + 1) + '"' +
        (i + 1 === now.getMonth() + 1 ? ' selected' : '') + '>' + m + '</option>';
    }).join('');

    const yearOpts = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]
      .map(function (y) {
        return '<option value="' + y + '"' + (y === now.getFullYear() ? ' selected' : '') + '>' + y + '</option>';
      }).join('');

    Utils.qs('#generateBody').innerHTML =
      '<div class="tabs" style="padding:0;margin-bottom:20px">' +
      '<button type="button" class="tab active" data-gen-tab="single">Single Flat</button>' +
      '<button type="button" class="tab" data-gen-tab="bulk">All Occupied Flats</button>' +
      '</div>' +

      '<div id="genSingle">' +
      '<div class="form-grid">' +
      '<div class="field span-2"><label for="bg-flat">Select Flat<span class="req">*</span></label>' +
      '<select id="bg-flat" name="flatId"><option value="">Choose an occupied flat…</option>' +
      flatOpts + '</select><span class="hint" id="bg-flat-hint">The assigned resident will be billed.</span>' +
      '<span class="error-msg"></span></div>' +

      '<div class="field"><label for="bg-month">Billing Month<span class="req">*</span></label>' +
      '<select id="bg-month" name="month">' + monthOpts + '</select><span class="error-msg"></span></div>' +

      '<div class="field"><label for="bg-year">Billing Year<span class="req">*</span></label>' +
      '<select id="bg-year" name="year">' + yearOpts + '</select><span class="error-msg"></span></div>' +

      '<div class="field"><label for="bg-amount">Maintenance Amount (₹)<span class="req">*</span></label>' +
      '<input id="bg-amount" name="amount" type="number" min="1" step="50" value="1800">' +
      '<span class="hint">Auto-filled from the flat type when a flat is selected.</span>' +
      '<span class="error-msg"></span></div>' +

      '<div class="field"><label for="bg-extra">Additional Charges (₹)</label>' +
      '<input id="bg-extra" name="additionalCharges" type="number" min="0" step="50" value="0">' +
      '<span class="error-msg"></span></div>' +

      '<div class="field span-2"><label for="bg-note">Additional Charge Note</label>' +
      '<input id="bg-note" name="additionalNote" type="text" ' +
      'placeholder="e.g. Water tanker usage, repair contribution"></div>' +

      '<div class="field"><label for="bg-due">Due Date<span class="req">*</span></label>' +
      '<input id="bg-due" name="dueDate" type="date" value="' +
      Utils.toISO(new Date(now.getFullYear(), now.getMonth(), dueDay)) + '">' +
      '<span class="error-msg"></span></div>' +

      '<div class="field"><label>Total Amount</label>' +
      '<input type="text" id="bg-total" disabled value="' + Utils.formatCurrency(1800) + '"></div>' +
      '</div></div>' +

      '<div id="genBulk" class="hidden">' +
      '<div class="alert info">' + App.icon('info') +
      '<span>This will generate bills for <strong>all occupied flats</strong> for the selected month. ' +
      'Flats that already have a bill for that period are skipped automatically.</span></div>' +
      '<div class="form-grid">' +
      '<div class="field"><label for="bk-month">Billing Month<span class="req">*</span></label>' +
      '<select id="bk-month" name="bulkMonth">' + monthOpts + '</select></div>' +
      '<div class="field"><label for="bk-year">Billing Year<span class="req">*</span></label>' +
      '<select id="bk-year" name="bulkYear">' + yearOpts + '</select></div>' +
      '<div class="field"><label for="bk-extra">Additional Charges per Flat (₹)</label>' +
      '<input id="bk-extra" name="bulkExtra" type="number" min="0" step="50" value="0"></div>' +
      '<div class="field"><label>Occupied Flats</label>' +
      '<input type="text" disabled value="' + DB.getData('flats').filter(function (f) {
        return f.status === 'Occupied';
      }).length + ' flats will be billed"></div>' +
      '</div></div>';

    S.modeless = true;
    Utils.openModal(GEN_MODAL);
    bindGenerate();
  }

  function bindGenerate() {
    const root = Utils.qs('#generateBody');

    // Tab switching
    Utils.qsa('[data-gen-tab]', root).forEach(function (tab) {
      tab.addEventListener('click', function () {
        Utils.qsa('[data-gen-tab]', root).forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        const mode = tab.getAttribute('data-gen-tab');
        Utils.qs('#genSingle').classList.toggle('hidden', mode !== 'single');
        Utils.qs('#genBulk').classList.toggle('hidden', mode !== 'bulk');
        const btn = Utils.qs('#generateSave');
        if (btn) btn.textContent = mode === 'bulk' ? 'Generate Bills' : 'Generate Bill';
        root.dataset.mode = mode;
      });
    });
    root.dataset.mode = 'single';

    // Auto-calc total & auto-fill amount from flat type
    const amountEl = Utils.qs('#bg-amount');
    const extraEl = Utils.qs('#bg-extra');
    const totalEl = Utils.qs('#bg-total');
    const flatEl = Utils.qs('#bg-flat');

    function recalc() {
      const total = (Number(amountEl.value) || 0) + (Number(extraEl.value) || 0);
      totalEl.value = Utils.formatCurrency(total);
    }

    if (flatEl) {
      flatEl.addEventListener('change', function () {
        const f = DB.findById('flats', flatEl.value);
        if (f) {
          amountEl.value = DB.rateForType(f.type);
          const hint = Utils.qs('#bg-flat-hint');
          const res = DB.findById('residents', f.residentId);
          if (hint) hint.textContent = res ? 'Billed to: ' + res.name : 'No resident assigned.';
        }
        recalc();
      });
    }
    if (amountEl) amountEl.addEventListener('input', recalc);
    if (extraEl) extraEl.addEventListener('input', recalc);
  }

  function saveGenerate() {
    const root = Utils.qs('#generateBody');
    const mode = root.dataset.mode || 'single';

    if (mode === 'bulk') {
      const month = Number(Utils.qs('#bk-month').value);
      const year = Number(Utils.qs('#bk-year').value);
      const extra = Number(Utils.qs('#bk-extra').value) || 0;

      if (extra < 0) {
        Utils.toast('Additional charges cannot be negative.', 'error');
        return;
      }

      const result = Domain.generateBulkBills(month, year, extra);

      if (result.created === 0) {
        Utils.toast('No bills were created — every occupied flat already has a bill for ' +
          Utils.formatMonthYear(month, year) + '.', 'warning', 'Nothing generated');
      } else {
        Utils.toast(result.created + ' bill(s) generated for ' + Utils.formatMonthYear(month, year) +
          (result.skipped ? '. ' + result.skipped + ' flat(s) skipped.' : '.'), 'success', 'Bulk generation complete');
      }
      Utils.closeModal(GEN_MODAL);
      App.rerender();
      App.updateBadges();
      return;
    }

    const form = Utils.qs('#generateForm');
    const rules = {
      flatId: { required: true, label: 'Flat' },
      month: { required: true, label: 'Billing month' },
      year: { required: true, label: 'Billing year' },
      amount: { required: true, number: true, min: 1, label: 'Maintenance amount' },
      additionalCharges: { number: true, min: 0, label: 'Additional charges' },
      dueDate: { required: true, label: 'Due date' }
    };

    if (!Utils.validateForm(form, rules)) return;

    const res = Domain.createBill({
      flatId: form.elements.flatId.value,
      month: Number(form.elements.month.value),
      year: Number(form.elements.year.value),
      amount: Number(form.elements.amount.value),
      additionalCharges: Number(form.elements.additionalCharges.value) || 0,
      additionalNote: form.elements.additionalNote.value.trim(),
      dueDate: form.elements.dueDate.value
    });

    if (!res.ok) {
      Utils.toast(res.reason, 'error', 'Bill not generated');
      return;
    }

    Utils.toast('Bill ' + res.bill.billNo + ' raised for ' + res.bill.flatNo + ' — ' +
      Utils.formatCurrency(res.bill.totalAmount) + '.', 'success', 'Bill generated');
    Utils.closeModal(GEN_MODAL);
    App.rerender();
    App.updateBadges();
  }

  /* ------------------------------------------------------------ view / edit */

  function view(id) {
    const b = DB.findById('maintenance', id);
    if (!b) return;

    const payments = DB.getData('payments').filter(function (p) { return p.billId === id; });
    const outstanding = Domain.billOutstanding(b);

    const payRows = payments.length
      ? payments.map(function (p) {
          return '<tr><td class="mono">' + Utils.esc(p.id) + '</td>' +
            '<td>' + Utils.esc(Utils.formatDate(p.date)) + '</td>' +
            '<td>' + Utils.esc(p.method) + '</td>' +
            '<td class="text-right mono strong">' + Utils.formatCurrency(p.amount) + '</td></tr>';
        }).join('')
      : '<tr><td colspan="4"><div class="empty-mini">No payments recorded against this bill.</div></td></tr>';

    Utils.qs('#billViewTitle').textContent = 'Bill ' + b.billNo;
    Utils.qs('#billViewSub').textContent = Utils.formatMonthYear(b.month, b.year) + ' · ' + b.flatNo;

    Utils.qs('#billViewBody').innerHTML =
      '<div class="detail-grid" style="margin-bottom:20px">' +
      [['Bill Number', b.billNo], ['Billing Period', Utils.formatMonthYear(b.month, b.year)],
        ['Resident', b.residentName], ['Flat', b.flatNo + ' · ' + b.building],
        ['Due Date', Utils.formatDate(b.dueDate)], ['Generated On', Utils.formatDate(b.generatedAt)]]
        .map(function (p) {
          return '<div class="detail-item"><div class="dt">' + p[0] + '</div>' +
            '<div class="dd">' + Utils.esc(p[1]) + '</div></div>';
        }).join('') +
      '</div>' +

      '<div class="stat-strip" style="margin-bottom:20px">' +
      '<div><div class="ss-lbl">Maintenance</div><div class="ss-val">' +
      Utils.formatCurrency(b.amount) + '</div></div>' +
      '<div><div class="ss-lbl">Additional</div><div class="ss-val">' +
      Utils.formatCurrency(b.additionalCharges) + '</div></div>' +
      '<div><div class="ss-lbl">Total</div><div class="ss-val">' +
      Utils.formatCurrency(b.totalAmount) + '</div></div>' +
      '<div><div class="ss-lbl">Paid</div><div class="ss-val" style="color:var(--success)">' +
      Utils.formatCurrency(b.paidAmount) + '</div></div>' +
      '<div><div class="ss-lbl">Outstanding</div><div class="ss-val" style="color:' +
      (outstanding > 0 ? 'var(--danger)' : 'var(--success)') + '">' +
      Utils.formatCurrency(outstanding) + '</div></div>' +
      '</div>' +

      (b.additionalNote
        ? '<div class="alert info" style="margin-bottom:18px">' + App.icon('info') +
          '<span><strong>Additional charge:</strong> ' + Utils.esc(b.additionalNote) + '</span></div>'
        : '') +

      '<div class="info-row"><span class="k">Payment Status</span>' +
      '<span class="v"><span class="badge ' + App.statusClass(b.status) + '">' +
      Utils.esc(b.status) + '</span></span></div>' +
      '<div class="info-row"><span class="k">Collection</span><span class="v">' +
      (b.totalAmount ? Math.round((b.paidAmount / b.totalAmount) * 100) : 0) + '% of total</span></div>' +
      '<div style="margin:10px 0 20px"><div class="progress"><span class="' +
      (outstanding > 0 ? 'orange' : 'green') + '" style="width:' +
      (b.totalAmount ? Math.min(100, Math.round((b.paidAmount / b.totalAmount) * 100)) : 0) +
      '%"></span></div></div>' +

      '<div class="card-head" style="padding:0 0 12px;margin-bottom:10px">' +
      '<h3 style="font-size:14px">Payment Records</h3></div>' +
      '<div class="table-wrap"><table class="data" style="min-width:0">' +
      '<thead><tr><th>Transaction</th><th>Date</th><th>Method</th>' +
      '<th class="text-right">Amount</th></tr></thead><tbody>' + payRows + '</tbody></table></div>';

    const payBtn = Utils.qs('#billViewPay');
    if (payBtn) {
      payBtn.hidden = outstanding <= 0;
      payBtn.onclick = function () {
        Utils.closeModal('billViewModal');
        setTimeout(function () {
          if (global.Modules.payments) global.Modules.payments.openWithBill(id);
        }, 160);
      };
    }

    Utils.openModal('billViewModal');
  }

  function openEdit(id) {
    const b = DB.findById('maintenance', id);
    if (!b) return;

    if (b.status === 'Paid') {
      Utils.toast('Bill ' + b.billNo + ' is fully paid and can no longer be edited.', 'warning', 'Locked record');
      return;
    }

    Utils.qs('#billEditTitle').textContent = 'Edit Bill ' + b.billNo;
    Utils.qs('#billEditSub').textContent = b.flatNo + ' · ' + b.residentName + ' · ' +
      Utils.formatMonthYear(b.month, b.year);

    Utils.qs('#billEditBody').innerHTML =
      '<div class="form-grid">' +
      '<div class="field"><label for="be-amount">Maintenance Amount (₹)<span class="req">*</span></label>' +
      '<input id="be-amount" name="amount" type="number" min="1" step="50" value="' + b.amount + '">' +
      '<span class="error-msg"></span></div>' +
      '<div class="field"><label for="be-extra">Additional Charges (₹)</label>' +
      '<input id="be-extra" name="additionalCharges" type="number" min="0" step="50" ' +
      'value="' + b.additionalCharges + '"><span class="error-msg"></span></div>' +
      '<div class="field span-2"><label for="be-note">Additional Charge Note</label>' +
      '<input id="be-note" name="additionalNote" type="text" value="' +
      Utils.esc(b.additionalNote || '') + '"></div>' +
      '<div class="field"><label for="be-due">Due Date<span class="req">*</span></label>' +
      '<input id="be-due" name="dueDate" type="date" value="' + Utils.esc(b.dueDate) + '">' +
      '<span class="error-msg"></span></div>' +
      '<div class="field"><label>Already Paid</label>' +
      '<input type="text" disabled value="' + Utils.formatCurrency(b.paidAmount) + '"></div>' +
      '</div>' +
      '<div class="alert warning" style="margin-top:18px;margin-bottom:0">' + App.icon('alert') +
      '<span>The new total cannot be lower than the ' + Utils.formatCurrency(b.paidAmount) +
      ' already collected for this bill.</span></div>';

    Utils.qs('#billEditSave').onclick = function () {
      const form = Utils.qs('#billEditForm');
      const amount = Number(form.elements.amount.value);
      const extra = Number(form.elements.additionalCharges.value) || 0;
      const total = amount + extra;

      const ok = Utils.validateForm(form, {
        amount: { required: true, number: true, min: 1, label: 'Maintenance amount',
          custom: function () {
            return total < Number(b.paidAmount)
              ? 'Total ' + Utils.formatCurrency(total) + ' is below the ' +
                Utils.formatCurrency(b.paidAmount) + ' already paid.'
              : '';
          } },
        additionalCharges: { number: true, min: 0, label: 'Additional charges' },
        dueDate: { required: true, label: 'Due date' }
      });
      if (!ok) return;

      DB.updateRecord('maintenance', id, {
        amount: amount,
        additionalCharges: extra,
        additionalNote: form.elements.additionalNote.value.trim(),
        totalAmount: total,
        dueDate: form.elements.dueDate.value
      });
      Domain.syncBillStatuses();

      Utils.toast('Bill ' + b.billNo + ' updated successfully.', 'success', 'Bill updated');
      Utils.closeModal('billEditModal');
      App.rerender();
      App.updateBadges();
    };

    Utils.openModal('billEditModal');
  }

  function remove(id) {
    const b = DB.findById('maintenance', id);
    if (!b) return;

    const linked = DB.getData('payments').filter(function (p) { return p.billId === id; });

    Utils.confirmDialog({
      title: 'Delete bill ' + b.billNo + '?',
      message: 'This maintenance bill for ' + b.flatNo + ' (' + Utils.formatMonthYear(b.month, b.year) +
        ') will be removed permanently.' +
        (linked.length ? ' Its ' + linked.length + ' payment record(s) will remain in the transaction history.' : ''),
      confirmText: 'Delete bill'
    }).then(function (ok) {
      if (!ok) return;
      DB.deleteRecord('maintenance', id);
      Domain.syncBillStatuses();
      Utils.toast('Bill ' + b.billNo + ' deleted.', 'success', 'Bill deleted');
      App.rerender();
      App.updateBadges();
    });
  }

  /* ----------------------------------------------------------------- render */

  function render(el) {
    const t = Domain.calculateTotals();

    el.innerHTML =
      '<div class="stat-grid" style="margin-bottom:20px">' +
      '<div class="stat-card"><div class="stat-top"><div>' +
      '<div class="stat-label">Total Billed</div><div class="stat-value">' +
      Utils.formatCurrencyCompact(t.totalBilled) + '</div></div>' +
      '<div class="stat-icon navy">' + App.icon('maintenance') + '</div></div>' +
      '<div class="stat-foot">' + t.totalBills + ' bills raised</div></div>' +

      '<div class="stat-card"><div class="stat-top"><div>' +
      '<div class="stat-label">Collected</div><div class="stat-value">' +
      Utils.formatCurrencyCompact(t.totalCollected) + '</div></div>' +
      '<div class="stat-icon green">' + App.icon('wallet') + '</div></div>' +
      '<div class="stat-foot">' + t.paidBills + ' bills fully paid</div></div>' +

      '<div class="stat-card"><div class="stat-top"><div>' +
      '<div class="stat-label">Outstanding</div><div class="stat-value">' +
      Utils.formatCurrencyCompact(t.outstanding) + '</div></div>' +
      '<div class="stat-icon orange">' + App.icon('clock') + '</div></div>' +
      '<div class="stat-foot">' + t.pendingBills + ' pending · ' + t.overdueBills + ' overdue</div></div>' +

      '<div class="stat-card"><div class="stat-top"><div>' +
      '<div class="stat-label">Collection Rate</div><div class="stat-value">' + t.collectionRate +
      '<span class="unit">%</span></div></div>' +
      '<div class="stat-icon blue">' + App.icon('trendUp') + '</div></div>' +
      '<div class="stat-foot"><div class="progress" style="margin-top:2px">' +
      '<span class="green" style="width:' + t.collectionRate + '%"></span></div></div></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head">' +
      '<div><h3>Maintenance Bills</h3><p>Generate and track monthly maintenance charges</p></div>' +
      '<div class="head-actions">' +
      '<button class="btn secondary sm" id="billExport">' + App.icon('download') + 'Export CSV</button>' +
      '<button class="btn sm" id="billGenerate">' + App.icon('maintenance') + 'Generate Bills</button>' +
      '</div></div>' +

      '<div class="toolbar">' +
      '<div class="search-box">' + App.icon('search') +
      '<input type="search" id="billSearch" placeholder="Search by bill no., resident or flat…" ' +
      'value="' + Utils.esc(S.search) + '"></div>' +
      '<select id="billMonth"><option value="">All Periods</option>' +
      monthOptions().map(function (o) {
        const v = o.year + '-' + o.month;
        return '<option value="' + v + '"' + (S.month === v ? ' selected' : '') + '>' +
          Utils.formatMonthYear(o.month, o.year) + '</option>';
      }).join('') + '</select>' +
      '<select id="billStatus"><option value="">All Statuses</option>' +
      ['Paid', 'Pending', 'Overdue'].map(function (s) {
        return '<option value="' + s + '"' + (S.status === s ? ' selected' : '') + '>' + s + '</option>';
      }).join('') + '</select>' +
      '<select id="billBuilding"><option value="">All Blocks</option>' +
      buildings().map(function (b) {
        return '<option value="' + Utils.esc(b) + '"' +
          (S.building === b ? ' selected' : '') + '>' + Utils.esc(b) + '</option>';
      }).join('') + '</select>' +
      '<div class="spacer"></div>' +
      '<span class="result-count" id="billResultCount"></span>' +
      '</div>' +

      '<div id="billTableBody"></div>' +
      '<div id="billPager"></div>' +
      '</div>';

    bind(el);
    paint();
  }

  function paint() {
    const rows = filtered();
    const page = App.paginate(rows, S.page, S.perPage);
    S.page = page.page;

    const body = Utils.qs('#billTableBody');
    if (body) body.innerHTML = tableHTML(page.rows);

    const pagerEl = Utils.qs('#billPager');
    if (pagerEl) {
      pagerEl.innerHTML = rows.length ? App.pager(page, 'billPagerInner') : '';
      if (rows.length) App.bindPager('billPagerInner', function (p) { S.page = p; paint(); });
    }

    const count = Utils.qs('#billResultCount');
    if (count) {
      const total = Utils.sum(rows, 'totalAmount');
      count.textContent = rows.length + ' bill(s) · ' + Utils.formatCurrency(total) + ' billed';
    }
  }

  function bind(el) {
    const search = Utils.qs('#billSearch', el);
    if (search) {
      search.addEventListener('input', Utils.debounce(function () {
        S.search = search.value.trim(); S.page = 1; paint();
      }, 200));
    }

    [['billMonth', 'month'], ['billStatus', 'status'], ['billBuilding', 'building']].forEach(function (pair) {
      const sel = Utils.qs('#' + pair[0], el);
      if (sel) sel.addEventListener('change', function () {
        S[pair[1]] = sel.value; S.page = 1; paint();
      });
    });

    const genBtn = Utils.qs('#billGenerate', el);
    if (genBtn) genBtn.addEventListener('click', openGenerate);

    const expBtn = Utils.qs('#billExport', el);
    if (expBtn) {
      expBtn.addEventListener('click', function () {
        Utils.exportCSV('maintenance-bills-' + Utils.todayISO() + '.csv', filtered(), [
          { key: 'billNo', label: 'Bill No.' },
          { key: 'residentName', label: 'Resident' },
          { key: 'flatNo', label: 'Flat' },
          { key: 'building', label: 'Block' },
          { key: 'periodLabel', value: function (r) {
            return Utils.formatMonthYear(r.month, r.year);
          }, label: 'Billing Period' },
          { key: 'amount', label: 'Maintenance Amount' },
          { key: 'additionalCharges', label: 'Additional Charges' },
          { key: 'totalAmount', label: 'Total Amount' },
          { key: 'paidAmount', label: 'Amount Paid' },
          { key: 'outstanding', label: 'Outstanding' },
          { key: 'dueDate', label: 'Due Date' },
          { key: 'status', label: 'Status' }
        ]);
      });
    }

    const body = Utils.qs('#billTableBody', el);
    if (body) {
      body.addEventListener('click', function (e) {
        const sortTh = e.target.closest('[data-sort]');
        if (sortTh) {
          const key = sortTh.getAttribute('data-sort');
          if (S.sort.key === key) S.sort.dir = S.sort.dir === 'asc' ? 'desc' : 'asc';
          else S.sort = { key: key, dir: key === 'dueDate' || key === 'period' ? 'desc' : 'asc' };
          paint();
          return;
        }
        const v = e.target.closest('[data-view]');
        if (v) { view(v.getAttribute('data-view')); return; }

        const pay = e.target.closest('[data-pay]');
        if (pay) {
          const id = pay.getAttribute('data-pay');
          if (global.Modules.payments) global.Modules.payments.openWithBill(id);
          return;
        }

        const ed = e.target.closest('[data-edit]');
        if (ed) { openEdit(ed.getAttribute('data-edit')); return; }

        const del = e.target.closest('[data-del]');
        if (del) { remove(del.getAttribute('data-del')); return; }

        const emptyBtn = e.target.closest('[data-empty-action]');
        if (emptyBtn) openGenerate();
      });
    }

    const genSave = Utils.qs('#generateSave');
    if (genSave && !genSave.dataset.bound) {
      genSave.dataset.bound = '1';
      genSave.addEventListener('click', saveGenerate);
    }

    const genForm = Utils.qs('#generateForm');
    if (genForm) {
      genForm.addEventListener('submit', function (e) { e.preventDefault(); saveGenerate(); });
    }
  }

  function quick(action) {
    if (action === 'generate') openGenerate();
  }

  global.Modules = global.Modules || {};
  global.Modules.maintenance = {
    render: render,
    quick: quick,
    view: view,
    openGenerate: openGenerate
  };
})(window);
