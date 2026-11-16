/* ==========================================================================
   residents.js — resident management (list, add, edit, delete, details)
   ========================================================================== */

(function (global) {
  'use strict';

  const S = {
    search: '',
    building: '',
    type: '',
    status: '',
    sort: { key: 'id', dir: 'asc' },
    page: 1,
    perPage: 8,
    editingId: null
  };

  const MODAL = 'residentModal';

  /* --------------------------------------------------------------- filtering */

  function filtered() {
    let rows = Domain.residentsWithFlats();

    if (S.search) {
      const q = S.search.toLowerCase();
      rows = rows.filter(function (r) {
        return [r.name, r.email, r.phone, r.flatNo, r.id, r.building]
          .join(' ').toLowerCase().indexOf(q) !== -1;
      });
    }
    if (S.building) rows = rows.filter(function (r) { return r.building === S.building; });
    if (S.type) rows = rows.filter(function (r) { return r.type === S.type; });
    if (S.status) rows = rows.filter(function (r) { return r.status === S.status; });

    return App.sortData(rows, S.sort);
  }

  function buildings() {
    const fromFlats = DB.getData('flats').map(function (f) { return f.building; });
    const fromSettings = DB.getSettings().buildings || [];
    return Utils.unique(fromFlats.concat(fromSettings)).filter(Boolean).sort();
  }

  /* ------------------------------------------------------------------- table */

  function tableHTML(rows) {
    if (!rows.length) {
      return App.emptyState({
        icon: 'residents',
        title: 'No residents found',
        message: 'Add your first resident or adjust the search and filters above.',
        action: 'Add Resident'
      });
    }

    const head = [
      { key: 'name', label: 'Resident' },
      { key: 'flatNo', label: 'Flat / Block' },
      { key: 'type', label: 'Type' },
      { key: 'phone', label: 'Contact' },
      { key: 'familyMembers', label: 'Family', right: true },
      { key: 'joinDate', label: 'Joined' },
      { key: 'status', label: 'Status' },
      { key: null, label: 'Actions', right: true }
    ].map(function (c) {
      if (!c.key) return '<th class="text-right">' + c.label + '</th>';
      const sorted = S.sort.key === c.key;
      return '<th class="sortable' + (sorted ? ' sorted' : '') + (c.right ? ' text-right' : '') +
        '" data-sort="' + c.key + '">' + c.label +
        '<span class="sort-ind">' + (sorted ? (S.sort.dir === 'asc' ? '▲' : '▼') : '▾') + '</span></th>';
    }).join('');

    const body = rows.map(function (r) {
      return '<tr>' +
        '<td><div class="cell-user">' +
        '<div class="avatar sm">' + Utils.esc(Utils.initials(r.name)) + '</div>' +
        '<div class="info"><strong>' + Utils.esc(r.name) + '</strong>' +
        '<span>' + Utils.esc(r.email) + '</span></div></div></td>' +
        '<td class="strong">' + Utils.esc(r.flatNo || '—') +
        '<div style="font-size:11.5px;font-weight:400;color:var(--muted)">' + Utils.esc(r.building || '') + '</div></td>' +
        '<td><span class="badge ' + (r.type === 'Owner' ? 'navy' : 'violet') + '">' +
        Utils.esc(r.type) + '</span></td>' +
        '<td>' + Utils.esc(r.phone) +
        '<div style="font-size:11.5px;color:var(--muted)">' + Utils.esc(r.id) + '</div></td>' +
        '<td class="text-right mono">' + r.familyMembers + '</td>' +
        '<td class="nowrap">' + Utils.esc(Utils.formatDate(r.joinDate)) + '</td>' +
        '<td><span class="badge ' + (r.status === 'Active' ? 'success' : 'neutral') + '">' +
        Utils.esc(r.status) + '</span></td>' +
        '<td><div class="row-actions">' +
        '<button class="act-btn" data-view="' + r.id + '" title="View details" aria-label="View">' +
        App.icon('eye') + '</button>' +
        '<button class="act-btn" data-edit="' + r.id + '" title="Edit resident" aria-label="Edit">' +
        App.icon('edit') + '</button>' +
        '<button class="act-btn del" data-del="' + r.id + '" title="Delete resident" aria-label="Delete">' +
        App.icon('trash') + '</button>' +
        '</div></td></tr>';
    }).join('');

    return '<div class="table-wrap"><table class="data"><thead><tr>' + head +
      '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }

  /* ------------------------------------------------------------------ modal */

  function fieldHTML(opts) {
    const o = opts;
    return '<div class="field' + (o.span ? ' ' + o.span : '') + '">' +
      '<label for="rf-' + o.name + '">' + Utils.esc(o.label) +
      (o.required ? '<span class="req">*</span>' : '') + '</label>' +
      o.control +
      (o.hint ? '<span class="hint">' + Utils.esc(o.hint) + '</span>' : '') +
      '<span class="error-msg"></span></div>';
  }

  function inputHTML(name, value, type, placeholder, extra) {
    return '<input id="rf-' + name + '" name="' + name + '" type="' + (type || 'text') + '" ' +
      'value="' + Utils.esc(value || '') + '" placeholder="' + Utils.esc(placeholder || '') + '" ' +
      (extra || '') + '>';
  }

  function openForm(resident) {
    S.editingId = resident ? resident.id : null;

    const flats = DB.getData('flats').slice().sort(function (a, b) {
      return String(a.flatNo).localeCompare(String(b.flatNo));
    });
    const currentResidents = DB.getData('residents');

    // A flat is selectable if vacant, or if it's already assigned to the resident being edited
    const flatOptions = flats.map(function (f) {
      const takenBy = currentResidents.find(function (r) {
        return r.flatId === f.id && r.status === 'Active' && (!resident || r.id !== resident.id);
      });
      const mine = resident && resident.flatId === f.id;
      const disabled = takenBy && !mine;
      return '<option value="' + f.id + '"' +
        ((resident && resident.flatId === f.id) ? ' selected' : '') +
        (disabled ? ' disabled' : '') + '>' +
        Utils.esc(f.flatNo + ' · ' + f.building + ' · ' + f.type) +
        (disabled ? ' (occupied)' : '') + '</option>';
    }).join('');

    const bl = buildings().map(function (b) {
      return '<option value="' + Utils.esc(b) + '"' +
        (resident && resident.building === b ? ' selected' : '') + '>' + Utils.esc(b) + '</option>';
    }).join('');

    Utils.qs('#residentModalTitle').textContent = resident ? 'Edit Resident' : 'Add New Resident';
    Utils.qs('#residentModalSub').textContent = resident
      ? 'Update the details for ' + resident.name + '.'
      : 'Register a new owner or tenant and assign them to a flat.';

    Utils.qs('#residentFormBody').innerHTML =
      '<div class="form-grid">' +
      fieldHTML({
        name: 'name', label: 'Full Name', required: true, span: 'span-2',
        control: inputHTML('name', resident && resident.name, 'text', 'e.g. Rohit Sharma')
      }) +
      fieldHTML({
        name: 'email', label: 'Email Address', required: true,
        control: inputHTML('email', resident && resident.email, 'email', 'name@example.com')
      }) +
      fieldHTML({
        name: 'phone', label: 'Phone Number', required: true,
        control: inputHTML('phone', resident && resident.phone, 'tel', '10-digit mobile number')
      }) +
      fieldHTML({
        name: 'flatId', label: 'Assign Flat', required: true,
        control: '<select id="rf-flatId" name="flatId"><option value="">Select a flat…</option>' +
          flatOptions + '</select>'
      }) +
      fieldHTML({
        name: 'type', label: 'Resident Type', required: true,
        control: '<select id="rf-type" name="type">' +
          '<option value="Owner"' + (resident && resident.type === 'Owner' ? ' selected' : '') + '>Owner</option>' +
          '<option value="Tenant"' + (resident && resident.type === 'Tenant' ? ' selected' : '') + '>Tenant</option>' +
          '</select>'
      }) +
      fieldHTML({
        name: 'joinDate', label: 'Date of Joining', required: true,
        control: inputHTML('joinDate', resident ? resident.joinDate : Utils.todayISO(), 'date')
      }) +
      fieldHTML({
        name: 'familyMembers', label: 'Number of Family Members', required: true,
        control: inputHTML('familyMembers', resident ? resident.familyMembers : 1, 'number',
          'e.g. 4', 'min="1" max="20"')
      }) +
      fieldHTML({
        name: 'status', label: 'Account Status', required: true,
        control: '<select id="rf-status" name="status">' +
          '<option value="Active"' + (!resident || resident.status === 'Active' ? ' selected' : '') + '>Active</option>' +
          '<option value="Inactive"' + (resident && resident.status === 'Inactive' ? ' selected' : '') + '>Inactive</option>' +
          '</select>'
      }) +
      '</div>' +
      '<div class="alert info" style="margin-top:18px;margin-bottom:0">' + App.icon('info') +
      '<span>A login account is created automatically using this email address with the ' +
      'default password <strong>demo1234</strong>, so the resident can sign in to the resident portal.</span></div>';

    Utils.openModal(MODAL);
  }

  function save() {
    const form = Utils.qs('#residentForm');
    const rules = {
      name: { required: true, label: 'Full name', custom: function (v) {
        return v.trim().length < 3 ? 'Name must be at least 3 characters.' : '';
      } },
      email: { required: true, email: true, label: 'Email', custom: function (v) {
        const dup = DB.getData('residents').find(function (r) {
          return String(r.email).toLowerCase() === v.toLowerCase() && r.id !== S.editingId;
        });
        return dup ? 'This email is already used by ' + dup.name + ' (' + dup.id + ').' : '';
      } },
      phone: { required: true, phone: true, label: 'Phone number' },
      flatId: { required: true, label: 'Flat' },
      type: { required: true, label: 'Resident type' },
      joinDate: { required: true, label: 'Joining date' },
      familyMembers: { required: true, number: true, min: 1, max: 20, label: 'Family members' },
      status: { required: true, label: 'Status' }
    };

    if (!Utils.validateForm(form, rules)) return;

    const data = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim().toLowerCase(),
      phone: Utils.normalisePhone(form.elements.phone.value),
      flatId: form.elements.flatId.value,
      type: form.elements.type.value,
      joinDate: form.elements.joinDate.value,
      familyMembers: Number(form.elements.familyMembers.value),
      status: form.elements.status.value
    };

    const flat = DB.findById('flats', data.flatId);
    if (!flat) { Utils.toast('The selected flat could not be found.', 'error'); return; }

    data.flatNo = flat.flatNo;
    data.building = flat.building;

    if (S.editingId) {
      const before = DB.findById('residents', S.editingId);
      DB.updateRecord('residents', S.editingId, data);

      // Keep the linked login account in step
      if (before && before.email !== data.email) {
        Auth.updateLinkedUserEmail(before.email, data.email, data.name);
      } else if (before && before.userId) {
        DB.updateRecord('users', before.userId, { name: data.name });
      }
      Utils.toast(data.name + "'s details have been updated.", 'success', 'Resident updated');
    } else {
      const id = DB.generateId('residents', 'R');
      const record = Object.assign({ id: id }, data, {
        userId: null,
        createdAt: Utils.todayISO()
      });
      DB.addRecord('residents', record);

      const user = Auth.createLinkedUser({
        name: data.name,
        email: data.email,
        role: 'resident',
        linkedId: id,
        password: 'demo1234',
        designation: 'Resident – ' + flat.flatNo
      });
      if (user) DB.updateRecord('residents', id, { userId: user.id });

      Utils.toast(data.name + ' added and assigned to ' + flat.flatNo + '.', 'success', 'Resident added');
    }

    // A flat can host one active resident only
    Domain.syncAll();
    Utils.closeModal(MODAL);
    App.rerender();
    App.updateBadges();
  }

  function remove(id) {
    const r = DB.findById('residents', id);
    if (!r) return;

    const bills = DB.getData('maintenance').filter(function (b) { return b.residentId === id; });
    const outstanding = bills.reduce(function (a, b) { return a + Domain.billOutstanding(b); }, 0);

    let msg = 'Resident ' + r.name + ' (' + r.id + ') will be removed and flat ' +
      r.flatNo + ' will be marked vacant.';
    if (bills.length) {
      msg += ' Their ' + bills.length + ' maintenance bill(s) and payment history will be kept for audit';
      if (outstanding > 0) msg += ', including ' + Utils.formatCurrency(outstanding) + ' outstanding';
      msg += '.';
    }

    Utils.confirmDialog({
      title: 'Delete this resident?',
      message: msg,
      confirmText: 'Delete resident'
    }).then(function (ok) {
      if (!ok) return;
      Auth.removeLinkedUser(r.userId);
      DB.deleteRecord('residents', id);

      // Unassign from any complaint-free context: mark vendor links untouched
      Domain.syncAll();
      Utils.toast(r.name + ' has been removed from the society records.', 'success', 'Resident deleted');
      App.rerender();
      App.updateBadges();
    });
  }

  /* ---------------------------------------------------------------- details */

  function view(id) {
    const r = DB.findById('residents', id);
    if (!r) return;
    const flat = DB.findById('flats', r.flatId);
    const bills = Domain.billsForResident(id);
    const payments = Domain.paymentsForResident(id);
    const complaints = Domain.complaintsForResident(id);
    const outstanding = Domain.outstandingForResident(id);
    const paidTotal = Utils.sum(payments, 'amount');
    const openComplaints = complaints.filter(function (c) {
      return c.status === 'Pending' || c.status === 'In Progress';
    }).length;

    const billRows = bills.length
      ? bills.slice(0, 6).map(function (b) {
          return '<tr><td class="strong">' + Utils.esc(Utils.formatMonthYear(b.month, b.year)) + '</td>' +
            '<td class="text-right mono">' + Utils.formatCurrency(b.totalAmount) + '</td>' +
            '<td class="text-right mono">' + Utils.formatCurrency(b.paidAmount) + '</td>' +
            '<td><span class="badge ' + App.statusClass(b.status) + '">' + Utils.esc(b.status) + '</span></td></tr>';
        }).join('')
      : '<tr><td colspan="4"><div class="empty-mini">No maintenance bills raised yet.</div></td></tr>';

    Utils.qs('#residentViewTitle').textContent = 'Resident Details';
    Utils.qs('#residentViewSub').textContent = r.id + ' · ' + r.name;

    Utils.qs('#residentViewBody').innerHTML =
      '<div class="profile-hero" style="margin-bottom:20px">' +
      '<div class="avatar lg">' + Utils.esc(Utils.initials(r.name)) + '</div>' +
      '<div class="profile-meta"><h2>' + Utils.esc(r.name) + '</h2>' +
      '<div class="pm-line">' +
      '<span>' + App.icon('mail') + Utils.esc(r.email) + '</span>' +
      '<span>' + App.icon('phone') + Utils.esc(r.phone) + '</span>' +
      '<span>' + App.icon('mapPin') + Utils.esc(r.flatNo + ', ' + r.building) + '</span>' +
      '</div></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<span class="badge ' + (r.type === 'Owner' ? 'navy' : 'violet') + '">' + Utils.esc(r.type) + '</span>' +
      '<span class="badge ' + (r.status === 'Active' ? 'success' : 'neutral') + '">' + Utils.esc(r.status) + '</span>' +
      '</div></div>' +

      '<div class="stat-strip" style="margin-bottom:20px">' +
      '<div><div class="ss-lbl">Resident ID</div><div class="ss-val mono" style="font-size:14px">' +
      Utils.esc(r.id) + '</div></div>' +
      '<div><div class="ss-lbl">Family Members</div><div class="ss-val">' + r.familyMembers + '</div></div>' +
      '<div><div class="ss-lbl">Joined On</div><div class="ss-val" style="font-size:14px">' +
      Utils.esc(Utils.formatDate(r.joinDate)) + '</div></div>' +
      '<div><div class="ss-lbl">Total Paid</div><div class="ss-val" style="font-size:15px">' +
      Utils.formatCurrency(paidTotal) + '</div></div>' +
      '<div><div class="ss-lbl">Outstanding</div><div class="ss-val" style="font-size:15px;color:' +
      (outstanding > 0 ? 'var(--danger)' : 'var(--success)') + '">' +
      Utils.formatCurrency(outstanding) + '</div></div>' +
      '</div>' +

      '<div class="detail-grid" style="margin-bottom:22px">' +
      '<div class="detail-item"><div class="dt">Flat Number</div><div class="dd">' +
      Utils.esc(r.flatNo) + '</div></div>' +
      '<div class="detail-item"><div class="dt">Building / Block</div><div class="dd">' +
      Utils.esc(r.building) + '</div></div>' +
      '<div class="detail-item"><div class="dt">Flat Type</div><div class="dd">' +
      Utils.esc(flat ? flat.type : '—') + '</div></div>' +
      '<div class="detail-item"><div class="dt">Floor</div><div class="dd">' +
      Utils.esc(flat ? String(flat.floor) : '—') + '</div></div>' +
      '<div class="detail-item"><div class="dt">Bills Raised</div><div class="dd">' + bills.length + '</div></div>' +
      '<div class="detail-item"><div class="dt">Open Complaints</div><div class="dd">' +
      openComplaints + '</div></div>' +
      '</div>' +

      '<div class="card-head" style="padding:0 0 12px;border-bottom:1px solid var(--border);margin-bottom:12px">' +
      '<h3 style="font-size:14px">Maintenance History</h3></div>' +
      '<div class="table-wrap"><table class="data" style="min-width:0">' +
      '<thead><tr><th>Billing Period</th><th class="text-right">Total</th>' +
      '<th class="text-right">Paid</th><th>Status</th></tr></thead>' +
      '<tbody>' + billRows + '</tbody></table></div>' +

      '<div class="card-head" style="padding:20px 0 12px;border-bottom:1px solid var(--border);margin-bottom:12px">' +
      '<h3 style="font-size:14px">Complaints</h3></div>' +
      (complaints.length
        ? '<div class="mini-list">' + complaints.slice(0, 4).map(function (c) {
            return '<div class="mini-row" style="padding:11px 0">' +
              '<div class="info"><strong>' + Utils.esc(c.title) + '</strong>' +
              '<span>' + Utils.esc(c.category) + ' · ' + Utils.esc(Utils.formatDate(c.submittedAt)) + '</span></div>' +
              '<span class="badge ' + App.statusClass(c.status) + '">' + Utils.esc(c.status) + '</span></div>';
          }).join('') + '</div>'
        : '<div class="empty-mini">No complaints raised by this resident.</div>');

    Utils.openModal('residentViewModal');
  }

  /* ----------------------------------------------------------------- render */

  function render(el) {
    el.innerHTML =
      '<div class="card">' +
      '<div class="card-head">' +
      '<div><h3>Resident Directory</h3><p id="resCount">Manage owners and tenants across all blocks</p></div>' +
      '<div class="head-actions">' +
      '<button class="btn secondary sm" id="resExport">' + App.icon('download') + 'Export CSV</button>' +
      '<button class="btn sm" id="resAdd">' + App.icon('plus') + 'Add Resident</button>' +
      '</div></div>' +

      '<div class="toolbar">' +
      '<div class="search-box">' + App.icon('search') +
      '<input type="search" id="resSearch" placeholder="Search by name, email, phone or flat…" ' +
      'value="' + Utils.esc(S.search) + '"></div>' +
      '<select id="resBuilding"><option value="">All Buildings</option>' +
      buildings().map(function (b) {
        return '<option value="' + Utils.esc(b) + '"' +
          (S.building === b ? ' selected' : '') + '>' + Utils.esc(b) + '</option>';
      }).join('') + '</select>' +
      '<select id="resType"><option value="">All Types</option>' +
      ['Owner', 'Tenant'].map(function (t) {
        return '<option value="' + t + '"' + (S.type === t ? ' selected' : '') + '>' + t + '</option>';
      }).join('') + '</select>' +
      '<select id="resStatus"><option value="">All Statuses</option>' +
      ['Active', 'Inactive'].map(function (t) {
        return '<option value="' + t + '"' + (S.status === t ? ' selected' : '') + '>' + t + '</option>';
      }).join('') + '</select>' +
      '<div class="spacer"></div>' +
      '<span class="result-count" id="resResultCount"></span>' +
      '</div>' +

      '<div id="resTableBody"></div>' +
      '<div id="resPager"></div>' +
      '</div>';

    bind(el);
    paint();
  }

  function paint() {
    const rows = filtered();
    const page = App.paginate(rows, S.page, S.perPage);
    S.page = page.page;

    const body = Utils.qs('#resTableBody');
    if (body) body.innerHTML = tableHTML(page.rows);

    const pagerEl = Utils.qs('#resPager');
    if (pagerEl) {
      pagerEl.innerHTML = rows.length ? App.pager(page, 'resPagerInner') : '';
      if (rows.length) {
        App.bindPager('resPagerInner', function (p) { S.page = p; paint(); });
      }
    }

    const count = Utils.qs('#resResultCount');
    if (count) {
      const t = Domain.calculateTotals();
      count.textContent = rows.length + ' of ' + t.allResidents + ' residents';
    }
  }

  function bind(el) {
    const search = Utils.qs('#resSearch', el);
    if (search) {
      search.addEventListener('input', Utils.debounce(function () {
        S.search = search.value.trim();
        S.page = 1;
        paint();
      }, 200));
    }

    ['resBuilding', 'resType', 'resStatus'].forEach(function (id) {
      const sel = Utils.qs('#' + id, el);
      if (!sel) return;
      sel.addEventListener('change', function () {
        if (id === 'resBuilding') S.building = sel.value;
        if (id === 'resType') S.type = sel.value;
        if (id === 'resStatus') S.status = sel.value;
        S.page = 1;
        paint();
      });
    });

    const addBtn = Utils.qs('#resAdd', el);
    if (addBtn) addBtn.addEventListener('click', function () { openForm(null); });

    const exportBtn = Utils.qs('#resExport', el);
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        Utils.exportCSV('residents-' + Utils.todayISO() + '.csv', filtered(), [
          { key: 'id', label: 'Resident ID' },
          { key: 'name', label: 'Full Name' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'flatNo', label: 'Flat Number' },
          { key: 'building', label: 'Building' },
          { key: 'type', label: 'Resident Type' },
          { key: 'joinDate', label: 'Date of Joining' },
          { key: 'familyMembers', label: 'Family Members' },
          { key: 'status', label: 'Status' }
        ]);
      });
    }

    // Delegated row + sort actions
    const body = Utils.qs('#resTableBody', el);
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

        const viewBtn = e.target.closest('[data-view]');
        if (viewBtn) { view(viewBtn.getAttribute('data-view')); return; }

        const editBtn = e.target.closest('[data-edit]');
        if (editBtn) {
          const r = DB.findById('residents', editBtn.getAttribute('data-edit'));
          if (r) openForm(r);
          return;
        }

        const delBtn = e.target.closest('[data-del]');
        if (delBtn) { remove(delBtn.getAttribute('data-del')); return; }

        const emptyBtn = e.target.closest('[data-empty-action]');
        if (emptyBtn) openForm(null);
      });
    }

    // Footer buttons inside the add/edit modal
    const saveBtn = Utils.qs('#residentSave');
    if (saveBtn) saveBtn.addEventListener('click', save);

    const form = Utils.qs('#residentForm');
    if (form) {
      form.addEventListener('submit', function (e) { e.preventDefault(); save(); });
      form.addEventListener('input', function (e) {
        const field = e.target.closest('.field');
        if (field && field.classList.contains('invalid')) field.classList.remove('invalid');
      });
    }
  }

  /** Called by dashboard quick actions. */
  function quick(action) {
    if (action === 'add') openForm(null);
  }

  global.Modules = global.Modules || {};
  global.Modules.residents = { render: render, quick: quick, openForm: openForm, view: view };
})(window);
