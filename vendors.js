/* ==========================================================================
   vendors.js — vendor directory, CRUD, assigned complaints, service history
   ========================================================================== */

(function (global) {
  'use strict';

  const S = {
    search: '',
    category: '',
    status: '',
    sort: { key: 'name', dir: 'asc' },
    page: 1,
    perPage: 8,
    editingId: null
  };

  const MODAL = 'vendorModal';
  const CATEGORIES = ['Electrician', 'Plumber', 'Security', 'Housekeeping', 'Lift Maintenance', 'Gardening', 'Other'];

  const CAT_ICON = {
    Electrician: 'zap',
    Plumber: 'droplet',
    Security: 'shield',
    Housekeeping: 'sparkles',
    'Lift Maintenance': 'layers',
    Gardening: 'home',
    Other: 'tools'
  };

  /* ---------------------------------------------------------------- helpers */

  function withStats() {
    const vendors = DB.getData('vendors');
    const complaints = DB.getData('complaints');

    return vendors.map(function (v) {
      const assigned = complaints.filter(function (c) { return c.vendorId === v.id; });
      return Object.assign({}, v, {
        assignedCount: assigned.length,
        openCount: assigned.filter(function (c) {
          return c.status === 'Pending' || c.status === 'In Progress';
        }).length,
        resolvedCount: assigned.filter(function (c) { return c.status === 'Resolved'; }).length
      });
    });
  }

  function filtered() {
    let rows = withStats();

    if (S.search) {
      const q = S.search.toLowerCase();
      rows = rows.filter(function (v) {
        return [v.name, v.contactPerson, v.phone, v.email, v.category, v.id]
          .join(' ').toLowerCase().indexOf(q) !== -1;
      });
    }
    if (S.category) rows = rows.filter(function (v) { return v.category === S.category; });
    if (S.status) rows = rows.filter(function (v) { return v.status === S.status; });

    return App.sortData(rows, S.sort);
  }

  /* ------------------------------------------------------------------- table */

  function tableHTML(rows) {
    if (!rows.length) {
      return App.emptyState({
        icon: 'vendors',
        title: 'No vendors found',
        message: 'Add service providers so complaints can be assigned to them.',
        action: 'Add Vendor'
      });
    }

    const head = [
      { key: 'name', label: 'Vendor' },
      { key: 'category', label: 'Service Category' },
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'phone', label: 'Phone' },
      { key: 'openCount', label: 'Open Jobs', right: true },
      { key: 'resolvedCount', label: 'Completed', right: true },
      { key: 'status', label: 'Status' },
      { key: null, label: 'Actions', right: true }
    ].map(function (c) {
      if (!c.key) return '<th class="text-right">' + c.label + '</th>';
      const sorted = S.sort.key === c.key;
      return '<th class="sortable' + (sorted ? ' sorted' : '') + (c.right ? ' text-right' : '') +
        '" data-sort="' + c.key + '">' + c.label +
        '<span class="sort-ind">' + (sorted ? (S.sort.dir === 'asc' ? '▲' : '▼') : '▾') + '</span></th>';
    }).join('');

    const body = rows.map(function (v) {
      return '<tr>' +
        '<td><div class="cell-user">' +
        '<div class="stat-icon navy" style="width:34px;height:34px;border-radius:9px">' +
        App.icon(CAT_ICON[v.category] || 'tools') + '</div>' +
        '<div class="info"><strong>' + Utils.esc(v.name) + '</strong>' +
        '<span>' + Utils.esc(v.id) + '</span></div></div></td>' +
        '<td><span class="badge plain info">' + Utils.esc(v.category) + '</span></td>' +
        '<td>' + Utils.esc(v.contactPerson) + '</td>' +
        '<td class="nowrap">' + Utils.esc(v.phone) + '</td>' +
        '<td class="text-right mono">' + (v.openCount
          ? '<span class="badge warning plain">' + v.openCount + '</span>' : '0') + '</td>' +
        '<td class="text-right mono">' + v.resolvedCount + '</td>' +
        '<td><span class="badge ' + (v.status === 'Active' ? 'success' : 'neutral') + '">' +
        Utils.esc(v.status) + '</span></td>' +
        '<td><div class="row-actions">' +
        '<button class="act-btn" data-view="' + v.id + '" title="View vendor" aria-label="View">' +
        App.icon('eye') + '</button>' +
        '<button class="act-btn" data-edit="' + v.id + '" title="Edit vendor" aria-label="Edit">' +
        App.icon('edit') + '</button>' +
        '<button class="act-btn del" data-del="' + v.id + '" title="Delete vendor" aria-label="Delete">' +
        App.icon('trash') + '</button>' +
        '</div></td></tr>';
    }).join('');

    return '<div class="table-wrap"><table class="data"><thead><tr>' + head +
      '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }

  /* ------------------------------------------------------------------ modal */

  function openForm(vendor) {
    S.editingId = vendor ? vendor.id : null;

    const catOpts = CATEGORIES.map(function (c) {
      return '<option value="' + c + '"' +
        (vendor && vendor.category === c ? ' selected' : '') + '>' + c + '</option>';
    }).join('');

    Utils.qs('#vendorModalTitle').textContent = vendor ? 'Edit Vendor' : 'Add New Vendor';
    Utils.qs('#vendorModalSub').textContent = vendor
      ? 'Update the profile for ' + vendor.name + '.'
      : 'Register a service provider for the society.';

    Utils.qs('#vendorFormBody').innerHTML =
      '<div class="form-grid">' +
      '<div class="field span-2"><label for="vf-name">Vendor / Business Name<span class="req">*</span></label>' +
      '<input id="vf-name" name="name" type="text" placeholder="e.g. Sharma Electricals" value="' +
      Utils.esc(vendor ? vendor.name : '') + '"><span class="error-msg"></span></div>' +

      '<div class="field"><label for="vf-contactPerson">Contact Person<span class="req">*</span></label>' +
      '<input id="vf-contactPerson" name="contactPerson" type="text" placeholder="e.g. Deepak Sharma" value="' +
      Utils.esc(vendor ? vendor.contactPerson : '') + '"><span class="error-msg"></span></div>' +

      '<div class="field"><label for="vf-phone">Phone Number<span class="req">*</span></label>' +
      '<input id="vf-phone" name="phone" type="tel" placeholder="10-digit mobile number" value="' +
      Utils.esc(vendor ? vendor.phone : '') + '"><span class="error-msg"></span></div>' +

      '<div class="field"><label for="vf-email">Email Address<span class="req">*</span></label>' +
      '<input id="vf-email" name="email" type="email" placeholder="vendor@example.com" value="' +
      Utils.esc(vendor ? vendor.email : '') + '"><span class="error-msg"></span></div>' +

      '<div class="field"><label for="vf-category">Service Category<span class="req">*</span></label>' +
      '<select id="vf-category" name="category">' + catOpts + '</select><span class="error-msg"></span></div>' +

      '<div class="field span-2"><label for="vf-address">Address</label>' +
      '<input id="vf-address" name="address" type="text" placeholder="Shop / office address" value="' +
      Utils.esc(vendor ? vendor.address : '') + '"></div>' +

      '<div class="field span-2"><label for="vf-payment">Payment Details</label>' +
      '<input id="vf-payment" name="paymentDetails" type="text" ' +
      'placeholder="e.g. UPI – vendor@okbank / Bank A/C details" value="' +
      Utils.esc(vendor ? vendor.paymentDetails : '') + '">' +
      '<span class="hint">Optional — bank account, UPI handle or preferred payment mode.</span></div>' +

      '<div class="field"><label for="vf-status">Vendor Status<span class="req">*</span></label>' +
      '<select id="vf-status" name="status">' +
      '<option value="Active"' + (!vendor || vendor.status === 'Active' ? ' selected' : '') + '>Active</option>' +
      '<option value="Inactive"' + (vendor && vendor.status === 'Inactive' ? ' selected' : '') + '>Inactive</option>' +
      '</select></div>' +
      '</div>' +
      '<div class="alert info" style="margin-top:18px;margin-bottom:0">' + App.icon('info') +
      '<span>A vendor login is created for this email with the default password <strong>demo1234</strong>, ' +
      'so they can access assigned complaints from the vendor portal.</span></div>';

    Utils.openModal(MODAL);
  }

  function save() {
    const form = Utils.qs('#vendorForm');
    const rules = {
      name: { required: true, label: 'Vendor name', custom: function (v) {
        return v.trim().length < 3 ? 'Vendor name must be at least 3 characters.' : '';
      } },
      contactPerson: { required: true, label: 'Contact person' },
      phone: { required: true, phone: true, label: 'Phone number' },
      email: { required: true, email: true, label: 'Email', custom: function (v) {
        const dup = DB.getData('vendors').find(function (x) {
          return String(x.email).toLowerCase() === v.toLowerCase() && x.id !== S.editingId;
        });
        return dup ? 'This email is already used by ' + dup.name + '.' : '';
      } },
      category: { required: true, label: 'Service category' },
      status: { required: true, label: 'Status' }
    };

    if (!Utils.validateForm(form, rules)) return;

    const data = {
      name: form.elements.name.value.trim(),
      contactPerson: form.elements.contactPerson.value.trim(),
      phone: Utils.normalisePhone(form.elements.phone.value),
      email: form.elements.email.value.trim().toLowerCase(),
      category: form.elements.category.value,
      address: form.elements.address.value.trim(),
      paymentDetails: form.elements.paymentDetails.value.trim(),
      status: form.elements.status.value
    };

    if (S.editingId) {
      const before = DB.findById('vendors', S.editingId);
      DB.updateRecord('vendors', S.editingId, data);

      // Keep complaint rows in sync with the vendor's display name
      if (before && before.name !== data.name) {
        const complaints = DB.getData('complaints').map(function (c) {
          return c.vendorId === S.editingId ? Object.assign({}, c, { vendorName: data.name }) : c;
        });
        DB.saveData('complaints', complaints);
      }
      if (before && before.email !== data.email) {
        Auth.updateLinkedUserEmail(before.email, data.email, data.contactPerson);
      } else if (before && before.userId) {
        DB.updateRecord('users', before.userId, { name: data.contactPerson });
      }
      Utils.toast(data.name + ' has been updated.', 'success', 'Vendor updated');
    } else {
      const id = DB.generateId('vendors', 'V');
      DB.addRecord('vendors', Object.assign({ id: id, userId: null, createdAt: Utils.todayISO() }, data));

      const user = Auth.createLinkedUser({
        name: data.contactPerson,
        email: data.email,
        role: 'vendor',
        linkedId: id,
        password: 'demo1234',
        designation: 'Vendor – ' + data.category
      });
      if (user) DB.updateRecord('vendors', id, { userId: user.id });

      Utils.toast(data.name + ' added as a ' + data.category.toLowerCase() + ' vendor.', 'success', 'Vendor added');
    }

    Utils.closeModal(MODAL);
    App.rerender();
    App.updateBadges();
  }

  function remove(id) {
    const v = DB.findById('vendors', id);
    if (!v) return;

    const assigned = DB.getData('complaints').filter(function (c) { return c.vendorId === id; });
    const open = assigned.filter(function (c) { return c.status === 'Pending' || c.status === 'In Progress'; });

    Utils.confirmDialog({
      title: 'Delete this vendor?',
      message: v.name + ' will be removed from the directory.' +
        (open.length
          ? ' ' + open.length + ' open complaint(s) will be unassigned and returned to the admin queue.'
          : ''),
      confirmText: 'Delete vendor'
    }).then(function (ok) {
      if (!ok) return;

      Auth.removeLinkedUser(v.userId);
      DB.deleteRecord('vendors', id);

      // Unassign any complaints that pointed at this vendor
      const complaints = DB.getData('complaints').map(function (c) {
        if (c.vendorId !== id) return c;
        return Object.assign({}, c, {
          vendorId: null,
          vendorName: null,
          remarks: (c.remarks || []).concat([{
            by: 'Aditya Menon', role: 'admin',
            text: 'Vendor ' + v.name + ' was removed from the directory. Complaint returned to the admin queue.',
            at: Utils.todayISO()
          }])
        });
      });
      DB.saveData('complaints', complaints);

      Utils.toast(v.name + ' deleted.' + (open.length ? ' ' + open.length + ' complaint(s) unassigned.' : ''),
        'success', 'Vendor deleted');
      App.rerender();
      App.updateBadges();
    });
  }

  /* ---------------------------------------------------------------- details */

  function view(id) {
    const v = DB.findById('vendors', id);
    if (!v) return;

    const complaints = Domain.complaintsForVendor(id);
    const open = complaints.filter(function (c) {
      return c.status === 'Pending' || c.status === 'In Progress';
    });
    const done = complaints.filter(function (c) { return c.status === 'Resolved'; });

    const rows = complaints.length
      ? complaints.map(function (c) {
          return '<tr><td class="strong">' + Utils.esc(Utils.truncate(c.title, 46)) +
            '<div class="cell-id">' + Utils.esc(c.id) + ' · ' + Utils.esc(c.flatNo) + '</div></td>' +
            '<td><span class="badge plain info">' + Utils.esc(c.category) + '</span></td>' +
            '<td><span class="prio ' + c.priority.toLowerCase() + '">' + Utils.esc(c.priority) + '</span></td>' +
            '<td class="nowrap">' + Utils.esc(Utils.formatDate(c.submittedAt)) + '</td>' +
            '<td><span class="badge ' + App.statusClass(c.status) + '">' + Utils.esc(c.status) + '</span></td></tr>';
        }).join('')
      : '<tr><td colspan="5"><div class="empty-mini">No complaints assigned to this vendor yet.</div></td></tr>';

    Utils.qs('#vendorViewTitle').textContent = 'Vendor Details';
    Utils.qs('#vendorViewSub').textContent = v.id + ' · ' + v.category;

    Utils.qs('#vendorViewBody').innerHTML =
      '<div class="profile-hero" style="margin-bottom:20px">' +
      '<div class="avatar lg">' + Utils.esc(Utils.initials(v.name)) + '</div>' +
      '<div class="profile-meta"><h2>' + Utils.esc(v.name) + '</h2>' +
      '<div class="pm-line">' +
      '<span>' + App.icon('user') + Utils.esc(v.contactPerson) + '</span>' +
      '<span>' + App.icon('phone') + Utils.esc(v.phone) + '</span>' +
      '<span>' + App.icon('mail') + Utils.esc(v.email) + '</span>' +
      '</div></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<span class="badge info plain">' + Utils.esc(v.category) + '</span>' +
      '<span class="badge ' + (v.status === 'Active' ? 'success' : 'neutral') + '">' +
      Utils.esc(v.status) + '</span></div></div>' +

      '<div class="stat-strip" style="margin-bottom:20px">' +
      '<div><div class="ss-lbl">Total Assigned</div><div class="ss-val">' + complaints.length + '</div></div>' +
      '<div><div class="ss-lbl">Open Jobs</div><div class="ss-val" style="color:var(--warning)">' +
      open.length + '</div></div>' +
      '<div><div class="ss-lbl">Completed</div><div class="ss-val" style="color:var(--success)">' +
      done.length + '</div></div>' +
      '<div><div class="ss-lbl">Completion Rate</div><div class="ss-val">' +
      (complaints.length ? Math.round((done.length / complaints.length) * 100) : 0) + '%</div></div>' +
      '</div>' +

      '<div class="detail-grid" style="margin-bottom:22px">' +
      '<div class="detail-item"><div class="dt">Address</div><div class="dd">' +
      Utils.esc(v.address || '—') + '</div></div>' +
      '<div class="detail-item"><div class="dt">Payment Details</div><div class="dd">' +
      Utils.esc(v.paymentDetails || '—') + '</div></div>' +
      '<div class="detail-item"><div class="dt">Registered On</div><div class="dd">' +
      Utils.esc(Utils.formatDate(v.createdAt)) + '</div></div>' +
      '</div>' +

      '<div class="card-head" style="padding:0 0 12px;margin-bottom:10px">' +
      '<h3 style="font-size:14px">Assigned Complaints &amp; Service History</h3></div>' +
      '<div class="table-wrap"><table class="data" style="min-width:0">' +
      '<thead><tr><th>Complaint</th><th>Category</th><th>Priority</th>' +
      '<th>Submitted</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div>';

    Utils.openModal('vendorViewModal');
  }

  /* ----------------------------------------------------------------- render */

  function render(el) {
    const vs = withStats();
    const activeCount = vs.filter(function (v) { return v.status === 'Active'; }).length;
    const totalOpen = Utils.sum(vs, 'openCount');

    el.innerHTML =
      '<div class="stat-grid" style="margin-bottom:20px">' +
      '<div class="stat-card"><div class="stat-top"><div>' +
      '<div class="stat-label">Total Vendors</div><div class="stat-value">' + vs.length + '</div></div>' +
      '<div class="stat-icon violet">' + App.icon('vendors') + '</div></div>' +
      '<div class="stat-foot">Across ' + Utils.unique(vs.map(function (v) { return v.category; })).length +
      ' service categories</div></div>' +

      '<div class="stat-card"><div class="stat-top"><div>' +
      '<div class="stat-label">Active Vendors</div><div class="stat-value">' + activeCount + '</div></div>' +
      '<div class="stat-icon green">' + App.icon('checkCircle') + '</div></div>' +
      '<div class="stat-foot">' + (vs.length - activeCount) + ' inactive</div></div>' +

      '<div class="stat-card"><div class="stat-top"><div>' +
      '<div class="stat-label">Open Jobs</div><div class="stat-value">' + totalOpen + '</div></div>' +
      '<div class="stat-icon orange">' + App.icon('tools') + '</div></div>' +
      '<div class="stat-foot">Complaints awaiting vendor action</div></div>' +

      '<div class="stat-card"><div class="stat-top"><div>' +
      '<div class="stat-label">Completed Jobs</div><div class="stat-value">' +
      Utils.sum(vs, 'resolvedCount') + '</div></div>' +
      '<div class="stat-icon blue">' + App.icon('checkCircle') + '</div></div>' +
      '<div class="stat-foot">Resolved vendor assignments</div></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head">' +
      '<div><h3>Vendor Directory</h3><p>Service providers registered with the society</p></div>' +
      '<div class="head-actions">' +
      '<button class="btn secondary sm" id="vendExport">' + App.icon('download') + 'Export CSV</button>' +
      '<button class="btn sm" id="vendAdd">' + App.icon('plus') + 'Add Vendor</button>' +
      '</div></div>' +

      '<div class="toolbar">' +
      '<div class="search-box">' + App.icon('search') +
      '<input type="search" id="vendSearch" placeholder="Search by vendor, contact or service…" ' +
      'value="' + Utils.esc(S.search) + '"></div>' +
      '<select id="vendCategory"><option value="">All Categories</option>' +
      CATEGORIES.map(function (c) {
        return '<option value="' + c + '"' + (S.category === c ? ' selected' : '') + '>' + c + '</option>';
      }).join('') + '</select>' +
      '<select id="vendStatus"><option value="">All Statuses</option>' +
      ['Active', 'Inactive'].map(function (s) {
        return '<option value="' + s + '"' + (S.status === s ? ' selected' : '') + '>' + s + '</option>';
      }).join('') + '</select>' +
      '<div class="spacer"></div>' +
      '<span class="result-count" id="vendResultCount"></span>' +
      '</div>' +

      '<div id="vendTableBody"></div>' +
      '<div id="vendPager"></div>' +
      '</div>';

    bind(el);
    paint();
  }

  function paint() {
    const rows = filtered();
    const page = App.paginate(rows, S.page, S.perPage);
    S.page = page.page;

    const body = Utils.qs('#vendTableBody');
    if (body) body.innerHTML = tableHTML(page.rows);

    const pagerEl = Utils.qs('#vendPager');
    if (pagerEl) {
      pagerEl.innerHTML = rows.length ? App.pager(page, 'vendPagerInner') : '';
      if (rows.length) App.bindPager('vendPagerInner', function (p) { S.page = p; paint(); });
    }

    const count = Utils.qs('#vendResultCount');
    if (count) count.textContent = rows.length + ' of ' + DB.getData('vendors').length + ' vendors';
  }

  function bind(el) {
    const search = Utils.qs('#vendSearch', el);
    if (search) {
      search.addEventListener('input', Utils.debounce(function () {
        S.search = search.value.trim(); S.page = 1; paint();
      }, 200));
    }

    const cSel = Utils.qs('#vendCategory', el);
    if (cSel) cSel.addEventListener('change', function () { S.category = cSel.value; S.page = 1; paint(); });

    const sSel = Utils.qs('#vendStatus', el);
    if (sSel) sSel.addEventListener('change', function () { S.status = sSel.value; S.page = 1; paint(); });

    const addBtn = Utils.qs('#vendAdd', el);
    if (addBtn) addBtn.addEventListener('click', function () { openForm(null); });

    const expBtn = Utils.qs('#vendExport', el);
    if (expBtn) {
      expBtn.addEventListener('click', function () {
        Utils.exportCSV('vendors-' + Utils.todayISO() + '.csv', filtered(), [
          { key: 'id', label: 'Vendor ID' },
          { key: 'name', label: 'Vendor Name' },
          { key: 'contactPerson', label: 'Contact Person' },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' },
          { key: 'category', label: 'Service Category' },
          { key: 'address', label: 'Address' },
          { key: 'status', label: 'Status' },
          { key: 'assignedCount', label: 'Total Assigned' },
          { key: 'openCount', label: 'Open Jobs' },
          { key: 'resolvedCount', label: 'Completed Jobs' }
        ]);
      });
    }

    const body = Utils.qs('#vendTableBody', el);
    if (body) {
      body.addEventListener('click', function (e) {
        const sortTh = e.target.closest('[data-sort]');
        if (sortTh) {
          const key = sortTh.getAttribute('data-sort');
          if (S.sort.key === key) S.sort.dir = S.sort.dir === 'asc' ? 'desc' : 'asc';
          else S.sort = { key: key, dir: 'asc' };
          paint();
          return;
        }
        const v = e.target.closest('[data-view]');
        if (v) { view(v.getAttribute('data-view')); return; }

        const ed = e.target.closest('[data-edit]');
        if (ed) {
          const vend = DB.findById('vendors', ed.getAttribute('data-edit'));
          if (vend) openForm(vend);
          return;
        }

        const del = e.target.closest('[data-del]');
        if (del) { remove(del.getAttribute('data-del')); return; }

        const emptyBtn = e.target.closest('[data-empty-action]');
        if (emptyBtn) openForm(null);
      });
    }

    const saveBtn = Utils.qs('#vendorSave');
    if (saveBtn && !saveBtn.dataset.bound) {
      saveBtn.dataset.bound = '1';
      saveBtn.addEventListener('click', save);
    }

    const form = Utils.qs('#vendorForm');
    if (form) {
      form.addEventListener('submit', function (e) { e.preventDefault(); save(); });
      form.addEventListener('input', function (e) {
        const field = e.target.closest('.field');
        if (field && field.classList.contains('invalid')) field.classList.remove('invalid');
      });
    }
  }

  function quick(action) {
    if (action === 'add') openForm(null);
  }

  global.Modules = global.Modules || {};
  global.Modules.vendors = { render: render, quick: quick, openForm: openForm, view: view, CATEGORIES: CATEGORIES };
})(window);
