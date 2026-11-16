/* ==========================================================================
   complaints.js — admin complaint desk: assign vendors, update status, remarks
   ========================================================================== */

(function (global) {
  'use strict';

  const S = {
    search: '',
    category: '',
    status: '',
    priority: '',
    sort: { key: 'submittedAt', dir: 'desc' },
    page: 1,
    perPage: 8
  };

  const MODAL = 'complaintModal';
  const CATEGORIES = ['Water Supply', 'Electricity', 'Cleaning', 'Security', 'Lift', 'Parking', 'Noise', 'Other'];
  const STATUSES = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
  const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

  const CAT_ICON = {
    'Water Supply': 'droplet',
    Electricity: 'zap',
    Cleaning: 'sparkles',
    Security: 'shield',
    Lift: 'layers',
    Parking: 'flats',
    Noise: 'alert',
    Other: 'tools'
  };

  /* ---------------------------------------------------------------- helpers */

  function all() {
    return DB.getData('complaints').slice();
  }

  function filtered() {
    let rows = all();

    if (S.search) {
      const q = S.search.toLowerCase();
      rows = rows.filter(function (c) {
        return [c.id, c.title, c.residentName, c.flatNo, c.category, c.vendorName || '', c.description]
          .join(' ').toLowerCase().indexOf(q) !== -1;
      });
    }
    if (S.category) rows = rows.filter(function (c) { return c.category === S.category; });
    if (S.status) rows = rows.filter(function (c) { return c.status === S.status; });
    if (S.priority) rows = rows.filter(function (c) { return c.priority === S.priority; });

    return App.sortData(rows, S.sort);
  }

  /* ------------------------------------------------------------------- table */

  function tableHTML(rows) {
    if (!rows.length) {
      return App.emptyState({
        icon: 'complaints',
        title: 'No complaints match your filters',
        message: 'Residents can raise complaints from their portal, or adjust the filters here.',
      });
    }

    const head = [
      { key: 'id', label: 'Complaint' },
      { key: 'residentName', label: 'Resident' },
      { key: 'category', label: 'Category' },
      { key: 'priority', label: 'Priority' },
      { key: 'vendorName', label: 'Assigned Vendor' },
      { key: 'submittedAt', label: 'Submitted' },
      { key: 'status', label: 'Status' },
      { key: null, label: 'Actions', right: true }
    ].map(function (c) {
      if (!c.key) return '<th class="text-right">' + c.label + '</th>';
      const sorted = S.sort.key === c.key;
      return '<th class="sortable' + (sorted ? ' sorted' : '') + (c.right ? ' text-right' : '') +
        '" data-sort="' + c.key + '">' + c.label +
        '<span class="sort-ind">' + (sorted ? (S.sort.dir === 'asc' ? '▲' : '▼') : '▾') + '</span></th>';
    }).join('');

    const body = rows.map(function (c) {
      const age = Math.abs(Utils.daysBetween(Utils.todayISO(), c.submittedAt));
      return '<tr>' +
        '<td><div class="cell-user" style="gap:9px">' +
        '<div class="stat-icon ' + (c.status === 'Resolved' ? 'green' : c.status === 'Rejected' ? 'red' :
          c.status === 'In Progress' ? 'blue' : 'orange') +
        '" style="width:32px;height:32px;border-radius:8px">' +
        App.icon(CAT_ICON[c.category] || 'tools') + '</div>' +
        '<div class="info"><strong>' + Utils.esc(Utils.truncate(c.title, 34)) + '</strong>' +
        '<span>' + Utils.esc(c.id + ' · ' + c.flatNo) + '</span></div></div></td>' +
        '<td>' + Utils.esc(c.residentName) + '</td>' +
        '<td><span class="badge plain neutral">' + Utils.esc(c.category) + '</span></td>' +
        '<td><span class="prio ' + c.priority.toLowerCase() + '">' + Utils.esc(c.priority) + '</span></td>' +
        '<td>' + (c.vendorName
          ? Utils.esc(Utils.truncate(c.vendorName, 22))
          : '<span class="text-muted">Unassigned</span>') + '</td>' +
        '<td class="nowrap">' + Utils.esc(Utils.formatDate(c.submittedAt)) +
        '<div style="font-size:11.5px;color:var(--muted)">' + age + ' day(s) ago</div></td>' +
        '<td><span class="badge ' + App.statusClass(c.status) + '">' + Utils.esc(c.status) + '</span></td>' +
        '<td><div class="row-actions">' +
        '<button class="act-btn" data-view="' + c.id + '" title="Open complaint" aria-label="View">' +
        App.icon('eye') + '</button>' +
        (c.status !== 'Resolved' && c.status !== 'Rejected'
          ? '<button class="act-btn ok" data-resolve="' + c.id + '" title="Mark resolved" aria-label="Resolve">' +
            App.icon('check') + '</button>'
          : '') +
        '<button class="act-btn del" data-del="' + c.id + '" title="Delete complaint" aria-label="Delete">' +
        App.icon('trash') + '</button>' +
        '</div></td></tr>';
    }).join('');

    return '<div class="table-wrap"><table class="data"><thead><tr>' + head +
      '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }

  /* ------------------------------------------------------------- detail view */

  function view(id) {
    const c = DB.findById('complaints', id);
    if (!c) return;

    const vendors = DB.getData('vendors');
    const vendorOpts = vendors.map(function (v) {
      return '<option value="' + v.id + '"' + (c.vendorId === v.id ? ' selected' : '') + '>' +
        Utils.esc(v.name + ' · ' + v.category) + (v.status !== 'Active' ? ' (inactive)' : '') + '</option>';
    }).join('');

    const statusOpts = STATUSES.map(function (s) {
      return '<option value="' + s + '"' + (c.status === s ? ' selected' : '') + '>' + s + '</option>';
    }).join('');

    const remarks = (c.remarks || []).map(function (r) {
      return '<div class="tl-item ' + (r.role === 'admin' ? 'current' : r.role === 'vendor' ? 'open' : 'done') + '">' +
        '<strong>' + Utils.esc(r.by) + ' <span style="font-weight:400;color:var(--muted)">(' +
        Utils.esc(r.role) + ')</span></strong>' +
        '<span>' + Utils.esc(Utils.formatDate(r.at)) + '</span>' +
        '<p>' + Utils.esc(r.text) + '</p></div>';
    }).join('') || '<div class="empty-mini">No remarks added yet.</div>';

    Utils.qs('#complaintViewTitle').textContent = c.title;
    Utils.qs('#complaintViewSub').textContent = c.id + ' · ' + c.flatNo + ' · ' + c.residentName;

    Utils.qs('#complaintViewBody').innerHTML =
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px">' +
      '<span class="badge ' + App.statusClass(c.status) + '">' + Utils.esc(c.status) + '</span>' +
      '<span class="badge plain neutral">' + Utils.esc(c.category) + '</span>' +
      '<span class="badge plain info"><span class="prio ' + c.priority.toLowerCase() + '">' +
      Utils.esc(c.priority) + ' priority</span></span>' +
      '</div>' +

      '<div class="alert info">' + App.icon('info') +
      '<span>' + Utils.esc(c.description) + '</span></div>' +
      (c.vendorCompleted
        ? '<div class="alert success"><span>The vendor marked this assignment complete. Review the update below and confirm resolution when ready.</span></div>'
        : '') +

      '<div class="detail-grid" style="margin-bottom:22px">' +
      '<div class="detail-item"><div class="dt">Resident</div><div class="dd">' +
      Utils.esc(c.residentName) + '</div></div>' +
      '<div class="detail-item"><div class="dt">Flat</div><div class="dd">' +
      Utils.esc(c.flatNo + ' · ' + (c.building || '')) + '</div></div>' +
      '<div class="detail-item"><div class="dt">Submitted On</div><div class="dd">' +
      Utils.esc(Utils.formatDate(c.submittedAt)) + '</div></div>' +
      '<div class="detail-item"><div class="dt">Assigned Vendor</div><div class="dd">' +
      Utils.esc(c.vendorName || 'Not assigned') + '</div></div>' +
      '</div>' +

      '<div class="form-grid" style="margin-bottom:18px">' +
      '<div class="field"><label for="cv-status">Update Status</label>' +
      '<select id="cv-status">' + statusOpts + '</select></div>' +
      '<div class="field"><label for="cv-vendor">Assign Vendor</label>' +
      '<select id="cv-vendor"><option value="">— Not assigned —</option>' + vendorOpts + '</select></div>' +
      '</div>' +

      '<div class="field" style="margin-bottom:18px"><label for="cv-remark">Add Admin Remarks</label>' +
      '<textarea id="cv-remark" rows="3" placeholder="Record action taken, vendor visit notes, or closure remarks…"></textarea>' +
      '<span class="hint">Remarks are visible to the resident in their portal.</span></div>' +

      '<div class="card-head" style="padding:0 0 12px;border-bottom:1px solid var(--border);margin-bottom:14px">' +
      '<h3 style="font-size:14px">Activity Timeline</h3></div>' +
      '<div class="timeline">' +
      '<div class="tl-item done"><strong>' + Utils.esc(c.residentName) + ' <span style="font-weight:400;color:var(--muted)">(resident)</span></strong>' +
      '<span>' + Utils.esc(Utils.formatDate(c.submittedAt)) + '</span>' +
      '<p>Complaint registered under "' + Utils.esc(c.category) + '" with ' +
      Utils.esc(c.priority.toLowerCase()) + ' priority.</p></div>' +
      remarks + '</div>';

    S.viewingId = id;
    Utils.openModal(MODAL);
  }

  function saveView() {
    const id = S.viewingId;
    if (!id) return;
    const c = DB.findById('complaints', id);
    if (!c) return;

    const statusEl = Utils.qs('#cv-status');
    const vendorEl = Utils.qs('#cv-vendor');
    const remarkEl = Utils.qs('#cv-remark');

    const newStatus = statusEl.value;
    const newVendorId = vendorEl.value || null;
    const remark = remarkEl.value.trim();

    const remarks = (c.remarks || []).slice();
    const changes = [];

    let vendorName = c.vendorName;
    if (newVendorId !== (c.vendorId || null)) {
      if (newVendorId) {
        const v = DB.findById('vendors', newVendorId);
        vendorName = v ? v.name : null;
        changes.push('assigned to ' + vendorName);
        remarks.push({
          by: App.state.user ? App.state.user.name : 'Administrator',
          role: 'admin',
          text: 'Assigned to ' + vendorName + ' (' + (v ? v.category : 'service provider') + ').' +
            (remark ? ' ' + remark : ''),
          at: Utils.todayISO()
        });
      } else {
        vendorName = null;
        changes.push('vendor unassigned');
        remarks.push({
          by: App.state.user ? App.state.user.name : 'Administrator',
          role: 'admin',
          text: 'Vendor assignment removed.' + (remark ? ' ' + remark : ''),
          at: Utils.todayISO()
        });
      }
    } else if (remark) {
      remarks.push({
        by: App.state.user ? App.state.user.name : 'Administrator',
        role: 'admin',
        text: remark,
        at: Utils.todayISO()
      });
    }

    if (newStatus !== c.status) {
      changes.push('status set to ' + newStatus);
      if (!remark && (newStatus === 'Resolved' || newStatus === 'Rejected')) {
        remarks.push({
          by: App.state.user ? App.state.user.name : 'Administrator',
          role: 'admin',
          text: newStatus === 'Resolved'
            ? 'Complaint verified and marked as resolved.'
            : 'Complaint reviewed and rejected as not actionable at this time.',
          at: Utils.todayISO()
        });
      }
    }

    if (newStatus === 'Resolved' && newVendorId && !c.vendorId) {
      // nothing extra — vendor is recorded above
    }

    if (!changes.length && !remark) {
      Utils.toast('No changes were made to this complaint.', 'info', 'Nothing to update');
      return;
    }

    DB.updateRecord('complaints', id, {
      status: newStatus,
      vendorId: newVendorId,
      vendorName: vendorName,
      remarks: remarks,
      vendorCompleted: newStatus === 'Resolved' || newVendorId !== (c.vendorId || null) ? false : !!c.vendorCompleted,
      resolvedAt: newStatus === 'Resolved' ? Utils.todayISO() : (newStatus === 'Pending' ? null : c.resolvedAt || null)
    });

    Utils.toast('Complaint ' + c.id + ' updated' + (changes.length ? ': ' + changes.join(', ') : '') + '.',
      'success', 'Complaint updated');
    Utils.closeModal(MODAL);
    App.rerender();
    App.updateBadges();
  }

  function resolveQuick(id) {
    const c = DB.findById('complaints', id);
    if (!c) return;

    Utils.confirmDialog({
      title: 'Mark complaint as resolved?',
      message: '"' + c.title + '" raised by ' + c.residentName + ' will be closed as resolved.',
      confirmText: 'Mark resolved',
      danger: false
    }).then(function (ok) {
      if (!ok) return;
      const remarks = (c.remarks || []).concat([{
        by: App.state.user ? App.state.user.name : 'Administrator',
        role: 'admin',
        text: 'Complaint marked as resolved by the society office.',
        at: Utils.todayISO()
      }]);
      DB.updateRecord('complaints', id, {
        status: 'Resolved',
        resolvedAt: Utils.todayISO(),
        remarks: remarks
      });
      Utils.toast(c.id + ' marked as resolved.', 'success', 'Complaint closed');
      App.rerender();
      App.updateBadges();
    });
  }

  function remove(id) {
    const c = DB.findById('complaints', id);
    if (!c) return;

    Utils.confirmDialog({
      title: 'Delete this complaint?',
      message: '"' + c.title + '" (' + c.id + ') raised by ' + c.residentName +
        ' will be permanently removed from the register.',
      confirmText: 'Delete complaint'
    }).then(function (ok) {
      if (!ok) return;
      DB.deleteRecord('complaints', id);
      Utils.toast('Complaint ' + c.id + ' deleted.', 'success', 'Complaint deleted');
      App.rerender();
      App.updateBadges();
    });
  }

  /* ----------------------------------------------------------------- render */

  function render(el) {
    const t = Domain.calculateTotals();
    const list = all();

    el.innerHTML =
      '<div class="stat-grid" style="margin-bottom:20px">' +
      '<div class="stat-card"><div class="stat-top"><div>' +
      '<div class="stat-label">Total Complaints</div><div class="stat-value">' + list.length + '</div></div>' +
      '<div class="stat-icon navy">' + App.icon('complaints') + '</div></div>' +
      '<div class="stat-foot">All registered complaints</div></div>' +

      '<div class="stat-card"><div class="stat-top"><div>' +
      '<div class="stat-label">Pending</div><div class="stat-value">' + t.pendingComplaints + '</div></div>' +
      '<div class="stat-icon orange">' + App.icon('clock') + '</div></div>' +
      '<div class="stat-foot">Awaiting assignment or action</div></div>' +

      '<div class="stat-card"><div class="stat-top"><div>' +
      '<div class="stat-label">In Progress</div><div class="stat-value">' + t.inProgressComplaints + '</div></div>' +
      '<div class="stat-icon blue">' + App.icon('tools') + '</div></div>' +
      '<div class="stat-foot">Being worked on by vendors</div></div>' +

      '<div class="stat-card"><div class="stat-top"><div>' +
      '<div class="stat-label">Resolved</div><div class="stat-value">' + t.resolvedComplaints + '</div></div>' +
      '<div class="stat-icon green">' + App.icon('checkCircle') + '</div></div>' +
      '<div class="stat-foot">' + (list.length
        ? Math.round((t.resolvedComplaints / list.length) * 100) : 0) + '% resolution rate</div></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head">' +
      '<div><h3>Complaint Register</h3><p>Track, assign and resolve resident complaints</p></div>' +
      '<div class="head-actions">' +
      '<button class="btn secondary sm" id="compExport">' + App.icon('download') + 'Export CSV</button>' +
      '</div></div>' +

      '<div class="toolbar">' +
      '<div class="search-box">' + App.icon('search') +
      '<input type="search" id="compSearch" placeholder="Search by complaint, resident or flat…" ' +
      'value="' + Utils.esc(S.search) + '"></div>' +
      '<select id="compCategory"><option value="">All Categories</option>' +
      CATEGORIES.map(function (c) {
        return '<option value="' + c + '"' + (S.category === c ? ' selected' : '') + '>' + c + '</option>';
      }).join('') + '</select>' +
      '<select id="compStatus"><option value="">All Statuses</option>' +
      STATUSES.map(function (s) {
        return '<option value="' + s + '"' + (S.status === s ? ' selected' : '') + '>' + s + '</option>';
      }).join('') + '</select>' +
      '<select id="compPriority"><option value="">All Priorities</option>' +
      PRIORITIES.map(function (p) {
        return '<option value="' + p + '"' + (S.priority === p ? ' selected' : '') + '>' + p + '</option>';
      }).join('') + '</select>' +
      '<div class="spacer"></div>' +
      '<span class="result-count" id="compResultCount"></span>' +
      '</div>' +

      '<div id="compTableBody"></div>' +
      '<div id="compPager"></div>' +
      '</div>';

    bind(el);
    paint();
  }

  function paint() {
    const rows = filtered();
    const page = App.paginate(rows, S.page, S.perPage);
    S.page = page.page;

    const body = Utils.qs('#compTableBody');
    if (body) body.innerHTML = tableHTML(page.rows);

    const pagerEl = Utils.qs('#compPager');
    if (pagerEl) {
      pagerEl.innerHTML = rows.length ? App.pager(page, 'compPagerInner') : '';
      if (rows.length) App.bindPager('compPagerInner', function (p) { S.page = p; paint(); });
    }

    const count = Utils.qs('#compResultCount');
    if (count) count.textContent = rows.length + ' of ' + all().length + ' complaints';
  }

  function bind(el) {
    const search = Utils.qs('#compSearch', el);
    if (search) {
      search.addEventListener('input', Utils.debounce(function () {
        S.search = search.value.trim(); S.page = 1; paint();
      }, 200));
    }

    [['compCategory', 'category'], ['compStatus', 'status'], ['compPriority', 'priority']]
      .forEach(function (pair) {
        const sel = Utils.qs('#' + pair[0], el);
        if (sel) sel.addEventListener('change', function () {
          S[pair[1]] = sel.value; S.page = 1; paint();
        });
      });

    const expBtn = Utils.qs('#compExport', el);
    if (expBtn) {
      expBtn.addEventListener('click', function () {
        Utils.exportCSV('complaints-' + Utils.todayISO() + '.csv', filtered(), [
          { key: 'id', label: 'Complaint ID' },
          { key: 'residentName', label: 'Resident' },
          { key: 'flatNo', label: 'Flat' },
          { key: 'category', label: 'Category' },
          { key: 'title', label: 'Title' },
          { key: 'priority', label: 'Priority' },
          { key: 'vendorName', label: 'Assigned Vendor' },
          { key: 'submittedAt', label: 'Submitted On' },
          { key: 'status', label: 'Status' },
          { key: 'resolvedAt', label: 'Resolved On' }
        ]);
      });
    }

    const body = Utils.qs('#compTableBody', el);
    if (body) {
      body.addEventListener('click', function (e) {
        const sortTh = e.target.closest('[data-sort]');
        if (sortTh) {
          const key = sortTh.getAttribute('data-sort');
          if (S.sort.key === key) S.sort.dir = S.sort.dir === 'asc' ? 'desc' : 'asc';
          else S.sort = { key: key, dir: key === 'submittedAt' ? 'desc' : 'asc' };
          paint();
          return;
        }
        const v = e.target.closest('[data-view]');
        if (v) { view(v.getAttribute('data-view')); return; }

        const res = e.target.closest('[data-resolve]');
        if (res) { resolveQuick(res.getAttribute('data-resolve')); return; }

        const del = e.target.closest('[data-del]');
        if (del) { remove(del.getAttribute('data-del')); return; }
      });
    }

    const saveBtn = Utils.qs('#complaintSave');
    if (saveBtn && !saveBtn.dataset.bound) {
      saveBtn.dataset.bound = '1';
      saveBtn.addEventListener('click', saveView);
    }
  }

  global.Modules = global.Modules || {};
  global.Modules.complaints = {
    render: render,
    view: view,
    CATEGORIES: CATEGORIES,
    STATUSES: STATUSES,
    PRIORITIES: PRIORITIES
  };
})(window);
