/* ==========================================================================
   flats.js — flat management: CRUD, occupancy, filters
   ========================================================================== */

(function (global) {
  'use strict';

  const S = {
    search: '',
    building: '',
    occupancy: '',
    sort: { key: 'flatNo', dir: 'asc' },
    page: 1,
    perPage: 10,
    editingId: null
  };

  const MODAL = 'flatModal';
  const FLAT_TYPES = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', 'Studio'];

  /* --------------------------------------------------------------- filtering */

  function withResident() {
    const flats = DB.getData('flats');
    const residents = DB.getData('residents');
    return flats.map(function (f) {
      const res = residents.find(function (r) { return r.id === f.residentId; });
      return Object.assign({}, f, {
        residentName: res ? res.name : null,
        residentType: res ? res.type : null
      });
    });
  }

  function buildings() {
    const fromFlats = DB.getData('flats').map(function (f) { return f.building; });
    const fromSettings = DB.getSettings().buildings || [];
    return Utils.unique(fromFlats.concat(fromSettings)).filter(Boolean).sort();
  }

  function filtered() {
    let rows = withResident();

    if (S.search) {
      const q = S.search.toLowerCase();
      rows = rows.filter(function (f) {
        return [f.flatNo, f.building, f.type, f.id, f.residentName || '']
          .join(' ').toLowerCase().indexOf(q) !== -1;
      });
    }
    if (S.building) rows = rows.filter(function (f) { return f.building === S.building; });
    if (S.occupancy) rows = rows.filter(function (f) { return f.status === S.occupancy; });

    return App.sortData(rows, S.sort);
  }

  /* ------------------------------------------------------------------- table */

  function tableHTML(rows) {
    if (!rows.length) {
      return App.emptyState({
        icon: 'flats',
        title: 'No flats match your filters',
        message: 'Try clearing the search box or filters, or add a new flat to the society.',
        action: 'Add Flat'
      });
    }

    const head = [
      { key: 'flatNo', label: 'Flat' },
      { key: 'building', label: 'Block' },
      { key: 'floor', label: 'Floor', right: true },
      { key: 'type', label: 'Type' },
      { key: 'area', label: 'Area (sq.ft.)', right: true },
      { key: 'residentName', label: 'Assigned Resident' },
      { key: 'status', label: 'Occupancy' },
      { key: null, label: 'Actions', right: true }
    ].map(function (c) {
      if (!c.key) return '<th class="text-right">' + c.label + '</th>';
      const sorted = S.sort.key === c.key;
      return '<th class="sortable' + (sorted ? ' sorted' : '') + (c.right ? ' text-right' : '') +
        '" data-sort="' + c.key + '">' + c.label +
        '<span class="sort-ind">' + (sorted ? (S.sort.dir === 'asc' ? '▲' : '▼') : '▾') + '</span></th>';
    }).join('');

    const body = rows.map(function (f) {
      return '<tr>' +
        '<td class="strong">' + Utils.esc(f.flatNo) +
        '<div class="cell-id">' + Utils.esc(f.id) + '</div></td>' +
        '<td>' + Utils.esc(f.building) + '</td>' +
        '<td class="text-right mono">' + f.floor + '</td>' +
        '<td><span class="badge plain neutral">' + Utils.esc(f.type) + '</span></td>' +
        '<td class="text-right mono">' + (f.area ? Utils.formatNumber(f.area) : '—') + '</td>' +
        '<td>' + (f.residentName
          ? '<div class="cell-user" style="gap:8px">' +
            '<div class="avatar sm">' + Utils.esc(Utils.initials(f.residentName)) + '</div>' +
            '<div class="info"><strong style="font-size:13px">' + Utils.esc(f.residentName) + '</strong>' +
            '<span class="badge plain ' + (f.residentType === 'Owner' ? 'navy' : 'violet') +
            '" style="margin-top:2px">' + Utils.esc(f.residentType) + '</span></div></div>'
          : '<span class="text-muted">Unassigned</span>') + '</td>' +
        '<td><span class="badge ' + (f.status === 'Occupied' ? 'success' : 'neutral') + '">' +
        Utils.esc(f.status) + '</span></td>' +
        '<td><div class="row-actions">' +
        (f.status === 'Vacant'
          ? '<button class="act-btn ok" data-assign="' + f.id + '" title="Assign resident" aria-label="Assign">' +
            App.icon('plus') + '</button>'
          : '<button class="act-btn" data-viewres="' + f.id + '" title="View resident" aria-label="View resident">' +
            App.icon('eye') + '</button>') +
        '<button class="act-btn" data-edit="' + f.id + '" title="Edit flat" aria-label="Edit">' +
        App.icon('edit') + '</button>' +
        '<button class="act-btn del" data-del="' + f.id + '" title="Delete flat" aria-label="Delete">' +
        App.icon('trash') + '</button>' +
        '</div></td></tr>';
    }).join('');

    return '<div class="table-wrap"><table class="data"><thead><tr>' + head +
      '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }

  /* ------------------------------------------------------------------ modal */

  function openForm(flat) {
    S.editingId = flat ? flat.id : null;

    const buildingOpts = buildings().map(function (b) {
      return '<option value="' + Utils.esc(b) + '"' +
        (flat && flat.building === b ? ' selected' : '') + '>' + Utils.esc(b) + '</option>';
    }).join('');

    const typeOpts = FLAT_TYPES.map(function (t) {
      return '<option value="' + t + '"' +
        (flat && flat.type === t ? ' selected' : '') + '>' + t + '</option>';
    }).join('');

    Utils.qs('#flatModalTitle').textContent = flat ? 'Edit Flat' : 'Add New Flat';
    Utils.qs('#flatModalSub').textContent = flat
      ? 'Update details for flat ' + flat.flatNo + '.'
      : 'Register a new flat in the society inventory.';

    Utils.qs('#flatFormBody').innerHTML =
      '<div class="form-grid">' +
      '<div class="field"><label for="ff-flatNo">Flat Number<span class="req">*</span></label>' +
      '<input id="ff-flatNo" name="flatNo" type="text" placeholder="e.g. A-105" ' +
      'value="' + Utils.esc(flat ? flat.flatNo : '') + '">' +
      '<span class="hint">Format: Block-FlatNumber, e.g. A-105</span>' +
      '<span class="error-msg"></span></div>' +

      '<div class="field"><label for="ff-building">Building / Block<span class="req">*</span></label>' +
      '<select id="ff-building" name="building">' + buildingOpts + '</select>' +
      '<span class="error-msg"></span></div>' +

      '<div class="field"><label for="ff-floor">Floor Number<span class="req">*</span></label>' +
      '<input id="ff-floor" name="floor" type="number" min="0" max="40" ' +
      'value="' + (flat ? flat.floor : 1) + '">' +
      '<span class="error-msg"></span></div>' +

      '<div class="field"><label for="ff-type">Flat Type<span class="req">*</span></label>' +
      '<select id="ff-type" name="type">' + typeOpts + '</select>' +
      '<span class="error-msg"></span></div>' +

      '<div class="field"><label for="ff-area">Carpet Area (sq.ft.)</label>' +
      '<input id="ff-area" name="area" type="number" min="0" step="10" placeholder="e.g. 920" ' +
      'value="' + (flat && flat.area ? flat.area : '') + '">' +
      '<span class="hint">Optional — used to suggest the maintenance amount.</span>' +
      '<span class="error-msg"></span></div>' +

      '<div class="field"><label for="ff-status">Occupancy Status</label>' +
      '<input id="ff-status" name="status" type="text" disabled ' +
      'value="' + Utils.esc(flat ? flat.status : 'Vacant') + '">' +
      '<span class="hint">Occupancy updates automatically when residents are assigned.</span></div>' +
      '</div>';

    Utils.openModal(MODAL);
  }

  function save() {
    const form = Utils.qs('#flatForm');
    const rules = {
      flatNo: {
        required: true,
        label: 'Flat number',
        pattern: /^[A-Za-z]{1,3}[-\s]?\d{2,4}$/,
        patternMessage: 'Enter a valid flat number such as A-101.',
        custom: function (v) {
          const dup = DB.getData('flats').find(function (f) {
            return String(f.flatNo).toLowerCase() === String(v).toLowerCase() && f.id !== S.editingId;
          });
          return dup ? 'Flat ' + dup.flatNo + ' already exists (' + dup.id + ').' : '';
        }
      },
      building: { required: true, label: 'Building' },
      floor: { required: true, number: true, min: 0, max: 40, label: 'Floor' },
      type: { required: true, label: 'Flat type' },
      area: { custom: function (v) {
        if (!v) return '';
        return Utils.isPositiveNumber(v) ? '' : 'Area must be a positive number.';
      } }
    };

    if (!Utils.validateForm(form, rules)) return;

    const data = {
      flatNo: form.elements.flatNo.value.trim().toUpperCase(),
      building: form.elements.building.value,
      floor: Number(form.elements.floor.value),
      type: form.elements.type.value,
      area: form.elements.area.value ? Number(form.elements.area.value) : null
    };

    if (S.editingId) {
      DB.updateRecord('flats', S.editingId, data);
      Utils.toast('Flat ' + data.flatNo + ' has been updated.', 'success', 'Flat updated');
    } else {
      const record = Object.assign({
        id: DB.generateId('flats', 'F'),
        status: 'Vacant',
        residentId: null,
        createdAt: Utils.todayISO()
      }, data);
      DB.addRecord('flats', record);
      Utils.toast('Flat ' + data.flatNo + ' added to ' + data.building + '.', 'success', 'Flat added');
    }

    Domain.syncAll();
    Utils.closeModal(MODAL);
    App.rerender();
    App.updateBadges();
  }

  function remove(id) {
    const f = DB.findById('flats', id);
    if (!f) return;

    if (f.status === 'Occupied') {
      const res = DB.findById('residents', f.residentId);
      Utils.toast('Flat ' + f.flatNo + ' is occupied' + (res ? ' by ' + res.name : '') +
        '. Reassign or deactivate the resident first.', 'error', 'Cannot delete flat');
      return;
    }

    const bills = DB.getData('maintenance').filter(function (b) { return b.flatId === id; });

    Utils.confirmDialog({
      title: 'Delete flat ' + f.flatNo + '?',
      message: 'This flat will be permanently removed from the inventory.' +
        (bills.length
          ? ' Its ' + bills.length + ' maintenance bill record(s) will be retained for accounting history.'
          : ''),
      confirmText: 'Delete flat'
    }).then(function (ok) {
      if (!ok) return;
      DB.deleteRecord('flats', id);
      Domain.syncAll();
      Utils.toast('Flat ' + f.flatNo + ' deleted.', 'success', 'Flat deleted');
      App.rerender();
      App.updateBadges();
    });
  }

  /** Assign an unassigned resident to a vacant flat. */
  function assignResident(flatId) {
    const flat = DB.findById('flats', flatId);
    if (!flat) return;

    const candidates = DB.getData('residents').filter(function (r) { return r.status === 'Active'; });
    const free = Domain.unassignedResidents();

    const options = candidates.map(function (r) {
      const hasFlat = !free.some(function (x) { return x.id === r.id; });
      return '<option value="' + r.id + '"' + (hasFlat ? ' disabled' : '') + '>' +
        Utils.esc(r.name + ' · ' + r.id + (hasFlat ? ' · already assigned to ' + r.flatNo : '')) +
        '</option>';
    }).join('');

    if (!free.length) {
      Utils.toast('All active residents already have a flat assigned. Add a resident first or free up a flat.',
        'warning', 'No unassigned residents');
      return;
    }

    Utils.qs('#flatModalTitle').textContent = 'Assign Resident';
    Utils.qs('#flatModalSub').textContent = 'Flat ' + flat.flatNo + ' · ' + flat.building + ' · ' + flat.type;
    Utils.qs('#flatFormBody').innerHTML =
      '<div class="alert info">' + App.icon('info') +
      '<span>Only active residents without a flat assignment are listed. ' +
      'The flat will be marked <strong>Occupied</strong> automatically.</span></div>' +
      '<div class="field"><label for="fa-resident">Select Resident<span class="req">*</span></label>' +
      '<select id="fa-resident" name="residentId"><option value="">Choose a resident…</option>' +
      options + '</select><span class="error-msg"></span></div>';

    S.editingId = null;

    // Swap save behaviour for this transient mode
    const saveBtn = Utils.qs('#flatSave');
    const newBtn = saveBtn.cloneNode(true);
    newBtn.textContent = 'Assign Resident';
    saveBtn.parentNode.replaceChild(newBtn, saveBtn);
    newBtn.addEventListener('click', function () {
      const form = Utils.qs('#flatForm');
      if (!Utils.validateForm(form, { residentId: { required: true, label: 'Resident' } })) return;

      const rid = form.elements.residentId.value;
      const res = DB.findById('residents', rid);
      if (!res) return;

      DB.updateRecord('flats', flatId, { residentId: rid, status: 'Occupied' });
      DB.updateRecord('residents', rid, { flatId: flatId, flatNo: flat.flatNo, building: flat.building });
      Domain.syncAll();

      Utils.toast(res.name + ' assigned to flat ' + flat.flatNo + '.', 'success', 'Resident assigned');
      Utils.closeModal(MODAL);
      restoreSaveButton();
      App.rerender();
      App.updateBadges();
    });

    Utils.openModal(MODAL);
  }

  function restoreSaveButton() {
    const existing = Utils.qs('#flatSave');
    if (!existing) return;
    const btn = existing.cloneNode(true);
    btn.textContent = 'Save Flat';
    existing.parentNode.replaceChild(btn, existing);
    btn.addEventListener('click', save);
  }

  /* ---------------------------------------------------------------- details */

  function viewResident(flatId) {
    const flat = DB.findById('flats', flatId);
    if (!flat) return;
    const res = DB.findById('residents', flat.residentId);
    if (!res) {
      Utils.toast('No active resident is currently assigned to this flat.', 'info');
      return;
    }
    App.go('residents');
    setTimeout(function () { global.Modules.residents.view(res.id); }, 120);
  }

  /* ----------------------------------------------------------------- render */

  function render(el) {
    const t = Domain.calculateTotals();

    el.innerHTML =
      '<div class="stat-grid" style="margin-bottom:20px">' +
      '<div class="stat-card"><div class="stat-top"><div>' +
      '<div class="stat-label">Total Flats</div><div class="stat-value">' + t.totalFlats + '</div></div>' +
      '<div class="stat-icon navy">' + App.icon('flats') + '</div></div>' +
      '<div class="stat-foot">Across ' + buildings().length + ' blocks</div></div>' +

      '<div class="stat-card"><div class="stat-top"><div>' +
      '<div class="stat-label">Occupied</div><div class="stat-value">' + t.occupiedFlats + '</div></div>' +
      '<div class="stat-icon green">' + App.icon('home') + '</div></div>' +
      '<div class="stat-foot">' + t.occupancyRate + '% of all flats</div></div>' +

      '<div class="stat-card"><div class="stat-top"><div>' +
      '<div class="stat-label">Vacant</div><div class="stat-value">' + t.vacantFlats + '</div></div>' +
      '<div class="stat-icon orange">' + App.icon('building') + '</div></div>' +
      '<div class="stat-foot">Ready for allotment</div></div>' +

      '<div class="stat-card"><div class="stat-top"><div>' +
      '<div class="stat-label">Occupancy Rate</div><div class="stat-value">' + t.occupancyRate +
      '<span class="unit">%</span></div></div>' +
      '<div class="stat-icon blue">' + App.icon('trendUp') + '</div></div>' +
      '<div class="stat-foot"><div class="progress" style="margin-top:2px">' +
      '<span class="green" style="width:' + t.occupancyRate + '%"></span></div></div></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head">' +
      '<div><h3>Flat Inventory</h3><p>Occupancy status updates automatically from resident assignments</p></div>' +
      '<div class="head-actions">' +
      '<button class="btn secondary sm" id="flatExport">' + App.icon('download') + 'Export CSV</button>' +
      '<button class="btn sm" id="flatAdd">' + App.icon('plus') + 'Add Flat</button>' +
      '</div></div>' +

      '<div class="toolbar">' +
      '<div class="search-box">' + App.icon('search') +
      '<input type="search" id="flatSearch" placeholder="Search by flat number, block or resident…" ' +
      'value="' + Utils.esc(S.search) + '"></div>' +
      '<select id="flatBuilding"><option value="">All Buildings</option>' +
      buildings().map(function (b) {
        return '<option value="' + Utils.esc(b) + '"' +
          (S.building === b ? ' selected' : '') + '>' + Utils.esc(b) + '</option>';
      }).join('') + '</select>' +
      '<select id="flatOccupancy"><option value="">All Occupancy</option>' +
      ['Occupied', 'Vacant'].map(function (o) {
        return '<option value="' + o + '"' + (S.occupancy === o ? ' selected' : '') + '>' + o + '</option>';
      }).join('') + '</select>' +
      '<div class="spacer"></div>' +
      '<span class="result-count" id="flatResultCount"></span>' +
      '</div>' +

      '<div id="flatTableBody"></div>' +
      '<div id="flatPager"></div>' +
      '</div>';

    bind(el);
    paint();
  }

  function paint() {
    const rows = filtered();
    const page = App.paginate(rows, S.page, S.perPage);
    S.page = page.page;

    const body = Utils.qs('#flatTableBody');
    if (body) body.innerHTML = tableHTML(page.rows);

    const pagerEl = Utils.qs('#flatPager');
    if (pagerEl) {
      pagerEl.innerHTML = rows.length ? App.pager(page, 'flatPagerInner') : '';
      if (rows.length) App.bindPager('flatPagerInner', function (p) { S.page = p; paint(); });
    }

    const count = Utils.qs('#flatResultCount');
    if (count) count.textContent = rows.length + ' of ' + DB.getData('flats').length + ' flats';
  }

  function bind(el) {
    const search = Utils.qs('#flatSearch', el);
    if (search) {
      search.addEventListener('input', Utils.debounce(function () {
        S.search = search.value.trim();
        S.page = 1;
        paint();
      }, 200));
    }

    const bSel = Utils.qs('#flatBuilding', el);
    if (bSel) bSel.addEventListener('change', function () {
      S.building = bSel.value; S.page = 1; paint();
    });

    const oSel = Utils.qs('#flatOccupancy', el);
    if (oSel) oSel.addEventListener('change', function () {
      S.occupancy = oSel.value; S.page = 1; paint();
    });

    const addBtn = Utils.qs('#flatAdd', el);
    if (addBtn) addBtn.addEventListener('click', function () { openForm(null); });

    const exportBtn = Utils.qs('#flatExport', el);
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        Utils.exportCSV('flats-' + Utils.todayISO() + '.csv', filtered(), [
          { key: 'id', label: 'Flat ID' },
          { key: 'flatNo', label: 'Flat Number' },
          { key: 'building', label: 'Building' },
          { key: 'floor', label: 'Floor' },
          { key: 'type', label: 'Type' },
          { key: 'area', label: 'Area (sq.ft.)' },
          { key: 'status', label: 'Occupancy' },
          { key: 'residentName', label: 'Assigned Resident' }
        ]);
      });
    }

    const body = Utils.qs('#flatTableBody', el);
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
        const assign = e.target.closest('[data-assign]');
        if (assign) { assignResident(assign.getAttribute('data-assign')); return; }

        const viewRes = e.target.closest('[data-viewres]');
        if (viewRes) { viewResident(viewRes.getAttribute('data-viewres')); return; }

        const edit = e.target.closest('[data-edit]');
        if (edit) {
          const f = DB.findById('flats', edit.getAttribute('data-edit'));
          if (f) openForm(f);
          return;
        }

        const del = e.target.closest('[data-del]');
        if (del) { remove(del.getAttribute('data-del')); return; }

        const emptyBtn = e.target.closest('[data-empty-action]');
        if (emptyBtn) openForm(null);
      });
    }

    const saveBtn = Utils.qs('#flatSave');
    if (saveBtn && !saveBtn.dataset.bound) {
      saveBtn.dataset.bound = '1';
      saveBtn.addEventListener('click', save);
    }

    const form = Utils.qs('#flatForm');
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
  global.Modules.flats = { render: render, quick: quick, openForm: openForm, restoreSaveButton: restoreSaveButton };
})(window);
