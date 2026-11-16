/* ==========================================================================
   storage.js — LocalStorage data layer, schema, seeding, domain logic
   Exposed globally as `DB` (low level) and `Domain` (business rules)
   ========================================================================== */

(function (global) {
  'use strict';

  const KEYS = {
    users: 'sms_users',
    residents: 'sms_residents',
    flats: 'sms_flats',
    maintenance: 'sms_maintenance',
    vendors: 'sms_vendors',
    complaints: 'sms_complaints',
    payments: 'sms_payments',
    settings: 'sms_settings',
    meta: 'sms_meta'
  };

  const SCHEMA_VERSION = 3;

  /* ======================================================================
     Low-level storage helpers
     ====================================================================== */

  function readRaw(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      const parsed = JSON.parse(raw);
      return parsed === null ? fallback : parsed;
    } catch (err) {
      console.warn('[SMS] Corrupted data in "' + key + '", restoring defaults.', err);
      return fallback;
    }
  }

  function writeRaw(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error('[SMS] Failed to write "' + key + '"', err);
      if (global.Utils && Utils.toast) {
        Utils.toast('Browser storage is full or unavailable. Free some space and try again.',
          'error', 'Could not save');
      }
      return false;
    }
  }

  /** getData(collection) -> array (always an array, never null) */
  function getData(collection) {
    const key = KEYS[collection];
    if (!key) throw new Error('Unknown collection: ' + collection);
    const data = readRaw(key, []);
    return Array.isArray(data) ? data : [];
  }

  function saveData(collection, rows) {
    const key = KEYS[collection];
    if (!key) throw new Error('Unknown collection: ' + collection);
    return writeRaw(key, Array.isArray(rows) ? rows : []);
  }

  function getSettings() {
    const s = readRaw(KEYS.settings, null);
    return (s && typeof s === 'object') ? s : {};
  }

  function saveSettings(obj) {
    return writeRaw(KEYS.settings, Object.assign({}, getSettings(), obj));
  }

  /** Generate a readable sequential id: ('residents','R') -> "R-020" */
  function generateId(collection, prefix) {
    const rows = getData(collection);
    const p = prefix || 'ID';
    const re = new RegExp('^' + p + '-(\\d+)$');
    let max = 0;
    rows.forEach(function (r) {
      const m = re.exec(String(r.id || ''));
      if (m) max = Math.max(max, Number(m[1]));
    });
    return p + '-' + String(max + 1).padStart(3, '0');
  }

  function addRecord(collection, record) {
    const rows = getData(collection);
    rows.push(record);
    saveData(collection, rows);
    return record;
  }

  function updateRecord(collection, id, patch) {
    const rows = getData(collection);
    let updated = null;
    const next = rows.map(function (r) {
      if (String(r.id) === String(id)) {
        updated = Object.assign({}, r, patch);
        return updated;
      }
      return r;
    });
    if (updated) saveData(collection, next);
    return updated;
  }

  function deleteRecord(collection, id) {
    const rows = getData(collection);
    const next = rows.filter(function (r) { return String(r.id) !== String(id); });
    if (next.length === rows.length) return false;
    saveData(collection, next);
    return true;
  }

  function findById(collection, id) {
    if (!id) return null;
    return getData(collection).find(function (r) { return String(r.id) === String(id); }) || null;
  }

  /* ======================================================================
     Settings defaults
     ====================================================================== */

  const DEFAULT_SETTINGS = {
    societyName: 'Green Valley Residency',
    tagline: 'Co-operative Housing Society',
    address: 'Plot 24, Sector 18, Kharghar, Navi Mumbai – 410210',
    registrationNo: 'NMV/HSG/2011/0482',
    email: 'office@greenvalleyresidency.in',
    phone: '022-2756 4410',
    maintenanceRate: 18,           // ₹ per sq.ft. (used as the default suggestion)
    defaultDueDay: 10,             // bill due on the 10th of the billing month
    lateFee: 100,
    currency: 'INR',
    buildings: ['Block A', 'Block B', 'Block C']
  };

  /* ======================================================================
     Demo data seed
     ====================================================================== */

  const FLATS_SEED = [
    //  flatNo, building, floor, type, area, vacant?
    ['A-101', 'Block A', 1, '2 BHK', 920, false],
    ['A-102', 'Block A', 1, '2 BHK', 920, false],
    ['A-103', 'Block A', 1, '3 BHK', 1180, false],
    ['A-104', 'Block A', 1, '2 BHK', 880, true],
    ['A-201', 'Block A', 2, '2 BHK', 920, false],
    ['A-202', 'Block A', 2, '3 BHK', 1180, false],
    ['A-203', 'Block A', 2, '1 BHK', 640, false],
    ['A-301', 'Block A', 3, '3 BHK', 1240, false],
    ['A-302', 'Block A', 3, '2 BHK', 940, false],
    ['B-101', 'Block B', 1, '2 BHK', 900, false],
    ['B-102', 'Block B', 1, '2 BHK', 900, false],
    ['B-201', 'Block B', 2, '3 BHK', 1150, false],
    ['B-202', 'Block B', 2, '2 BHK', 900, false],
    ['B-203', 'Block B', 2, '4 BHK', 1480, true],
    ['B-301', 'Block B', 3, '3 BHK', 1150, false],
    ['B-302', 'Block B', 3, '2 BHK', 900, false],
    ['C-101', 'Block C', 1, '2 BHK', 960, false],
    ['C-201', 'Block C', 2, '2 BHK', 960, false],
    ['C-202', 'Block C', 2, '3 BHK', 1210, false],
    ['C-301', 'Block C', 3, '3 BHK', 1210, false],
    ['C-302', 'Block C', 3, '2 BHK', 960, true],
    ['C-401', 'Block C', 4, '3 BHK', 1300, false],
    ['C-402', 'Block C', 4, '4 BHK', 1560, true],
    ['C-403', 'Block C', 4, '2 BHK', 980, false]
  ];

  // name, email-prefix, phone, type, joinDate, family
  const RESIDENTS_SEED = [
    ['Rohit Sharma', 'rohit.sharma', '9820014471', 'Owner', '2016-04-11', 4],
    ['Priya Nair', 'priya.nair', '9930221145', 'Tenant', '2023-06-01', 3],
    ['Anil Deshmukh', 'anil.deshmukh', '9867342210', 'Owner', '2014-09-22', 5],
    ['Sunita Rao', 'sunita.rao', '9769812234', 'Owner', '2018-01-15', 2],
    ['Vikram Patel', 'vikram.patel', '9892334471', 'Owner', '2012-11-05', 4],
    ['Meera Iyer', 'meera.iyer', '9004567821', 'Tenant', '2024-02-19', 3],
    ['Arjun Kulkarni', 'arjun.kulkarni', '9821567734', 'Owner', '2017-07-30', 6],
    ['Deepa Menon', 'deepa.menon', '9819453312', 'Tenant', '2022-10-08', 2],
    ['Suresh Gupta', 'suresh.gupta', '9920448890', 'Owner', '2013-03-17', 5],
    ['Kavita Joshi', 'kavita.joshi', '9867234018', 'Owner', '2019-08-26', 3],
    ['Rahul Verma', 'rahul.verma', '9820017734', 'Owner', '2015-12-02', 4],
    ['Sneha Bhatt', 'sneha.bhatt', '9769223456', 'Tenant', '2024-05-13', 2],
    ['Nitin Chavan', 'nitin.chavan', '9975112267', 'Owner', '2011-06-09', 5],
    ['Pooja Agarwal', 'pooja.agarwal', '9820773411', 'Tenant', '2023-09-04', 3],
    ['Manoj Pillai', 'manoj.pillai', '9845671123', 'Owner', '2016-02-21', 4],
    ['Aarti Singh', 'aarti.singh', '9812340098', 'Owner', '2020-01-28', 3],
    ['Ramesh Kamath', 'ramesh.kamath', '9900117723', 'Owner', '2010-10-14', 2],
    ['Divya Saxena', 'divya.saxena', '9833445566', 'Tenant', '2025-01-06', 1],
    ['Karan Malhotra', 'karan.malhotra', '9867012398', 'Owner', '2018-05-19', 4]
  ];

  const VENDORS_SEED = [
    ['Sharma Electricals', 'Deepak Sharma', '9820112233', 'sharma.electricals@example.com',
      'Electrician', 'Shop 4, Market Lane, Sector 18, Kharghar', 'UPI – sharma@okhdfcbank', 'Active'],
    ['AquaFix Plumbing Works', 'Imran Shaikh', '9930445566', 'aquafix.plumbing@example.com',
      'Plumber', '12, Sai Complex, Sector 20, Kharghar', 'Bank Transfer – HDFC ****4192', 'Active'],
    ['SecureGuard Services', 'Ravindra Pawar', '9702334455', 'contact@secureguard.example.com',
      'Security', 'Office 3, Plot 9, Sector 15, Belapur', 'NEFT – ICICI ****7731', 'Active'],
    ['CleanPro Housekeeping', 'Lata Gawde', '9876002211', 'cleanpro.hk@example.com',
      'Housekeeping', 'Shop 7, Green Plaza, Sector 21, Kharghar', 'UPI – cleanpro@okaxis', 'Active'],
    ['Elevate Lift Care', 'Sanjay Bhosale', '9820776655', 'service@elevatelift.example.com',
      'Lift Maintenance', 'Unit 21, Industrial Estate, Taloja', 'Bank Transfer – SBI ****9021', 'Active'],
    ['GreenLeaf Gardening', 'Asha Patil', '9769112233', 'greenleaf.garden@example.com',
      'Gardening', 'Nursery Road, Sector 24, Kharghar', 'Cash on service', 'Inactive']
  ];

  /** Monthly rate for a flat type — keeps bills inside the ₹1,500–₹3,000 band. */
  function rateForType(type) {
    const base = { '1 BHK': 1500, '2 BHK': 1800, '3 BHK': 2200, '4 BHK': 2800 };
    return base[type] || 1800;
  }

  function seedDatabase() {
    const now = new Date();
    const months = Utils.lastMonths(3); // [2 back, 1 back, current]

    /* ---------------- flats ---------------- */
    const flats = FLATS_SEED.map(function (f, i) {
      return {
        id: 'F-' + String(i + 1).padStart(3, '0'),
        flatNo: f[0],
        building: f[1],
        floor: f[2],
        type: f[3],
        area: f[4],
        status: f[5] ? 'Vacant' : 'Occupied',
        residentId: null,
        createdAt: '2024-04-01'
      };
    });

    const occupiedFlats = flats.filter(function (f) { return f.status === 'Occupied'; });

    /* ---------------- residents ---------------- */
    const residents = RESIDENTS_SEED.map(function (r, i) {
      const flat = occupiedFlats[i];
      const id = 'R-' + String(i + 1).padStart(3, '0');
      flat.residentId = id;
      return {
        id: id,
        name: r[0],
        email: r[1] + '@example.com',
        phone: r[2],
        flatId: flat.id,
        flatNo: flat.flatNo,
        building: flat.building,
        type: r[3],
        joinDate: r[4],
        familyMembers: r[5],
        status: 'Active',
        userId: null,
        createdAt: r[4]
      };
    });

    /* ---------------- vendors ---------------- */
    const vendors = VENDORS_SEED.map(function (v, i) {
      return {
        id: 'V-' + String(i + 1).padStart(3, '0'),
        name: v[0],
        contactPerson: v[1],
        phone: v[2],
        email: v[3],
        category: v[4],
        address: v[5],
        paymentDetails: v[6],
        status: v[7],
        userId: null,
        createdAt: '2024-05-02'
      };
    });

    /* ---------------- users ---------------- */
    const users = [
      {
        id: 'U-001', name: 'Aditya Menon', email: 'admin@society.com',
        password: 'admin123', role: 'admin', linkedId: null,
        designation: 'Society Administrator', createdAt: '2024-04-01'
      },
      {
        id: 'U-002', name: residents[0].name, email: 'resident@society.com',
        password: 'resident123', role: 'resident', linkedId: residents[0].id,
        designation: 'Resident – ' + residents[0].flatNo, createdAt: residents[0].joinDate
      },
      {
        id: 'U-003', name: vendors[0].contactPerson, email: 'vendor@society.com',
        password: 'vendor123', role: 'vendor', linkedId: vendors[0].id,
        designation: 'Vendor – ' + vendors[0].category, createdAt: '2024-05-02'
      }
    ];
    residents[0].userId = 'U-002';
    vendors[0].userId = 'U-003';

    /* ---------------- maintenance bills ---------------- */
    const bills = [];
    const payments = [];
    let billSeq = 1;
    let paySeq = 1;

    // Which residents get a bill in each of the 3 months
    const billPlan = [
      // 2 months ago — fully settled
      { mIdx: 0, residents: [0, 1, 2, 3, 4, 5], paidRatio: 1 },
      // last month — mostly settled, one partial, one unpaid
      { mIdx: 1, residents: [0, 1, 2, 3, 6, 7, 8], paidRatio: 'mixed' },
      // current month — freshly generated, unpaid
      { mIdx: 2, residents: [0, 1, 2, 4, 9, 10], paidRatio: 0 }
    ];

    billPlan.forEach(function (plan) {
      const bucket = months[plan.mIdx];
      plan.residents.forEach(function (rx, idx) {
        const res = residents[rx];
        const flat = flats.find(function (f) { return f.id === res.flatId; });
        const amount = rateForType(flat.type);
        const extra = (idx % 4 === 0) ? 200 : 0;   // occasional water tanker / repair charge
        const total = amount + extra;
        const dueDate = Utils.toISO(new Date(bucket.year, bucket.month - 1, DEFAULT_SETTINGS.defaultDueDay));
        const billId = 'B-' + String(billSeq).padStart(3, '0');

        let paidAmount = 0;
        if (plan.paidRatio === 1) paidAmount = total;
        else if (plan.paidRatio === 'mixed') paidAmount = [total, total, total, Math.round(total * 0.5), 0, total, 0][idx] || 0;

        bills.push({
          id: billId,
          billNo: 'MB-' + bucket.year + String(bucket.month).padStart(2, '0') + '-' + String(billSeq).padStart(3, '0'),
          residentId: res.id,
          residentName: res.name,
          flatId: flat.id,
          flatNo: flat.flatNo,
          building: flat.building,
          month: bucket.month,
          year: bucket.year,
          amount: amount,
          additionalCharges: extra,
          additionalNote: extra ? 'Water tanker usage' : '',
          totalAmount: total,
          paidAmount: paidAmount,
          dueDate: dueDate,
          status: 'Pending',
          generatedAt: Utils.toISO(new Date(bucket.year, bucket.month - 1, 1)),
          notes: ''
        });

        /* ---- matching payment rows for settled amounts ---- */
        if (paidAmount > 0) {
          const payDate = new Date(bucket.year, bucket.month - 1,
            Math.min(DEFAULT_SETTINGS.defaultDueDay - 2 + (idx % 3), 27));
          if (payDate > now) payDate.setDate(now.getDate() - 2);
          const methods = ['UPI', 'Bank Transfer', 'Cash', 'UPI'];
          payments.push({
            id: 'T-' + String(paySeq).padStart(3, '0'),
            billId: billId,
            residentId: res.id,
            residentName: res.name,
            flatId: flat.id,
            flatNo: flat.flatNo,
            building: flat.building,
            amount: paidAmount,
            date: Utils.toISO(payDate),
            method: methods[paySeq % methods.length],
            reference: 'REF' + (72100450 + paySeq * 137),
            status: 'Success',
            recordedBy: 'Aditya Menon',
            note: paidAmount < total ? 'Part payment received' : '',
            createdAt: Utils.toISO(payDate)
          });
          paySeq++;
        }
        billSeq++;
      });
    });

    /* ---------------- complaints ---------------- */
    const complaintsSeed = [
      // residentIdx, category, title, description, status, priority, vendorIdx, daysAgo
      [2, 'Lift', 'Lift in Block A making noise',
        'The passenger lift in Block A has been making a grinding noise after the 3rd floor stop since yesterday evening. Residents are avoiding it. Please get it checked at the earliest.',
        'Resolved', 'High', 4, 26],
      [5, 'Water Supply', 'No water supply in A-203 since morning',
        'There has been no water supply in our flat since 6:30 AM. Neighbours on the same line seem unaffected. Requesting a plumber visit today.',
        'Resolved', 'Urgent', 1, 19],
      [1, 'Cleaning', 'Staircase not cleaned for four days',
        'The common staircase between the 1st and 2nd floor of Block A has not been swept for four days. There is a lot of dust and litter near the landing.',
        'In Progress', 'Low', 3, 11],
      [8, 'Security', 'Security guard absent at B gate after 11 PM',
        'For the last three nights the main gate of Block B has been unattended after 11 PM. The intercom is also not being answered.',
        'In Progress', 'High', 2, 8],
      [10, 'Electricity', 'Corridor light not working on 2nd floor',
        'Both tube lights in the Block B second floor corridor are not working. It is completely dark at night and unsafe for children and senior citizens.',
        'Pending', 'Medium', null, 6],
      [6, 'Parking', 'Unauthorized vehicle in allotted slot B-301',
        'A white sedan without a society sticker has been parked in my allotted slot B-301 for two days. Kindly trace the owner and take action.',
        'Pending', 'Medium', null, 5],
      [12, 'Noise', 'Loud renovation work during afternoon hours',
        'Flat B-202 is carrying out drilling work between 1 PM and 4 PM which is disturbing children and elderly residents during rest hours.',
        'Pending', 'Low', null, 4],
      [3, 'Other', 'Garbage bins overflowing near Block A lobby',
        'The two bins near the Block A lobby have been overflowing since Sunday. The collection vehicle has not arrived for three days.',
        'In Progress', 'Medium', 3, 3],
      [14, 'Electricity', 'Frequent tripping of main MCB in C-101',
        'The main MCB in our flat trips repeatedly when the geyser and microwave run together. Suspecting a wiring fault — please arrange an electrician.',
        'Pending', 'Urgent', 0, 2],
      [16, 'Water Supply', 'Low water pressure in Block C top floor',
        'Water pressure on the 4th floor of Block C is very low during morning hours. Bucket filling takes over 30 minutes.',
        'Pending', 'Medium', null, 1]
    ];

    const complaints = complaintsSeed.map(function (c, i) {
      const res = residents[c[0]];
      const flat = flats.find(function (f) { return f.id === res.flatId; });
      const vendor = c[6] !== null ? vendors[c[6]] : null;
      const submitted = new Date(now.getTime() - c[7] * 86400000);
      const remarks = [];
      if (vendor) {
        remarks.push({
          by: 'Aditya Menon',
          role: 'admin',
          text: 'Assigned to ' + vendor.name + ' (' + vendor.category + ') for inspection and resolution.',
          at: Utils.toISO(new Date(submitted.getTime() + 86400000))
        });
      }
      if (c[4] === 'Resolved') {
        remarks.push({
          by: vendor ? vendor.contactPerson : 'Society Office',
          role: 'vendor',
          text: 'Work completed on site and tested. Issue resolved; closing with the society office.',
          at: Utils.toISO(new Date(submitted.getTime() + 3 * 86400000))
        });
        remarks.push({
          by: 'Aditya Menon',
          role: 'admin',
          text: 'Verified with the resident. Marking the complaint as resolved.',
          at: Utils.toISO(new Date(submitted.getTime() + 4 * 86400000))
        });
      } else if (c[4] === 'In Progress' && vendor) {
        remarks.push({
          by: vendor.contactPerson,
          role: 'vendor',
          text: 'Site visit done. Required material ordered; work will be completed within 2 working days.',
          at: Utils.toISO(new Date(submitted.getTime() + 2 * 86400000))
        });
      }

      return {
        id: 'C-' + String(i + 1).padStart(3, '0'),
        residentId: res.id,
        residentName: res.name,
        flatId: flat.id,
        flatNo: flat.flatNo,
        building: flat.building,
        category: c[1],
        title: c[2],
        description: c[3],
        submittedAt: Utils.toISO(submitted),
        vendorId: vendor ? vendor.id : null,
        vendorName: vendor ? vendor.name : null,
        priority: c[5],
        status: c[4],
        remarks: remarks,
        resolvedAt: c[4] === 'Resolved'
          ? Utils.toISO(new Date(submitted.getTime() + 4 * 86400000)) : null,
        createdAt: Utils.toISO(submitted)
      };
    });

    /* ---------------- write everything ---------------- */
    writeRaw(KEYS.settings, Object.assign({}, DEFAULT_SETTINGS, {
      createdAt: Utils.todayISO(),
      schemaVersion: SCHEMA_VERSION
    }));
    writeRaw(KEYS.flats, flats);
    writeRaw(KEYS.residents, residents);
    writeRaw(KEYS.vendors, vendors);
    writeRaw(KEYS.users, users);
    writeRaw(KEYS.maintenance, bills);
    writeRaw(KEYS.payments, payments);
    writeRaw(KEYS.complaints, complaints);
    writeRaw(KEYS.meta, { seededAt: new Date().toISOString(), schemaVersion: SCHEMA_VERSION });
  }

  /** Wipe and re-seed demo data. Returns true on success. */
  function resetDatabase() {
    Object.keys(KEYS).forEach(function (k) {
      try { localStorage.removeItem(KEYS[k]); } catch (e) { /* ignore */ }
    });
    initDatabase(true);
    syncAll();
    return true;
  }

  function initDatabase(force) {
    const meta = readRaw(KEYS.meta, null);
    const hasUsers = getData('users').length > 0;
    if (force || !hasUsers) {
      seedDatabase();
      return true;
    }
    // Repair any missing collection without touching existing data
    Object.keys(KEYS).forEach(function (k) {
      if (localStorage.getItem(KEYS[k]) === null) {
        if (k === 'settings') writeRaw(KEYS.settings, DEFAULT_SETTINGS);
        else if (k === 'meta') writeRaw(KEYS.meta, { schemaVersion: SCHEMA_VERSION });
        else writeRaw(KEYS[k], []);
      }
    });
    // Schema upgrades must preserve an existing society's records. Only an
    // explicit reset or a genuinely empty database should reseed the demo.
    if (!meta || meta.schemaVersion !== SCHEMA_VERSION) {
      writeRaw(KEYS.meta, Object.assign({}, meta || {}, { schemaVersion: SCHEMA_VERSION }));
    }
    return false;
  }

  /* ======================================================================
     Domain logic — keeps records consistent
     ====================================================================== */

  const ACTIVE_BILL = function (b) { return b.status !== 'Paid'; };

  /** Recompute bill status from paid amount + due date. Returns count changed. */
  function syncBillStatuses() {
    const bills = getData('maintenance');
    const today = Utils.todayISO();
    let changed = 0;

    const next = bills.map(function (b) {
      const total = Number(b.totalAmount) || 0;
      const paid = Number(b.paidAmount) || 0;
      let status;
      if (paid >= total && total > 0) status = 'Paid';
      else if (b.dueDate && b.dueDate < today) status = 'Overdue';
      else status = 'Pending';

      if (status !== b.status) {
        changed++;
        return Object.assign({}, b, { status: status });
      }
      return b;
    });

    if (changed) saveData('maintenance', next);

    // Roll any overdue bill's total into its resident's outstanding figure lazily
    return changed;
  }

  /** Rebuild flat occupancy from the resident table. */
  function syncFlatOccupancy() {
    const flats = getData('flats');
    const residents = getData('residents');

    const activeByFlat = {};
    residents.forEach(function (r) {
      if (r.status === 'Active' && r.flatId) {
        activeByFlat[r.flatId] = r;
      }
    });

    let changed = 0;
    const next = flats.map(function (f) {
      const res = activeByFlat[f.id];
      const status = res ? 'Occupied' : 'Vacant';
      const residentId = res ? res.id : null;
      if (f.status !== status || f.residentId !== residentId) {
        changed++;
        return Object.assign({}, f, { status: status, residentId: residentId });
      }
      return f;
    });

    if (changed) saveData('flats', next);

    // Keep resident.flatNo / building in step with the flats table
    let resChanged = 0;
    const resNext = residents.map(function (r) {
      if (!r.flatId) return r;
      const f = next.find(function (x) { return x.id === r.flatId; });
      if (!f) return r;
      if (r.flatNo !== f.flatNo || r.building !== f.building) {
        resChanged++;
        return Object.assign({}, r, { flatNo: f.flatNo, building: f.building });
      }
      return r;
    });
    if (resChanged) saveData('residents', resNext);

    return changed + resChanged;
  }

  /** Run all consistency passes. */
  function syncAll() {
    syncFlatOccupancy();
    syncBillStatuses();
  }

  /* ---------------------------- queries ---------------------------- */

  function billOutstanding(bill) {
    const total = Number(bill.totalAmount) || 0;
    const paid = Number(bill.paidAmount) || 0;
    return Math.max(0, Math.round((total - paid) * 100) / 100);
  }

  function activeBillCount() {
    return getData('maintenance').filter(ACTIVE_BILL).length;
  }

  /** Aggregate dashboard/report numbers straight from stored data. */
  function calculateTotals() {
    const residents = getData('residents');
    const flats = getData('flats');
    const bills = getData('maintenance');
    const vendors = getData('vendors');
    const complaints = getData('complaints');
    const payments = getData('payments');

    const occupied = flats.filter(function (f) { return f.status === 'Occupied'; }).length;
    const collected = Utils.sum(payments, 'amount');
    const billed = Utils.sum(bills, 'totalAmount');
    const outstanding = bills.reduce(function (a, b) { return a + billOutstanding(b); }, 0);

    const byStatus = Utils.groupCount(bills, 'status');
    const complByStatus = Utils.groupCount(complaints, 'status');

    return {
      totalResidents: residents.filter(function (r) { return r.status === 'Active'; }).length,
      allResidents: residents.length,
      owners: residents.filter(function (r) { return r.type === 'Owner'; }).length,
      tenants: residents.filter(function (r) { return r.type === 'Tenant'; }).length,
      totalFlats: flats.length,
      occupiedFlats: occupied,
      vacantFlats: flats.length - occupied,
      occupancyRate: flats.length ? Math.round((occupied / flats.length) * 100) : 0,
      totalCollected: Math.round(collected),
      totalBilled: Math.round(billed),
      outstanding: Math.round(outstanding),
      totalBills: bills.length,
      paidBills: byStatus.Paid || 0,
      pendingBills: byStatus.Pending || 0,
      overdueBills: byStatus.Overdue || 0,
      collectionRate: billed ? Math.round((collected / billed) * 100) : 0,
      totalVendors: vendors.length,
      activeVendors: vendors.filter(function (v) { return v.status === 'Active'; }).length,
      totalComplaints: complaints.length,
      openComplaints: (complByStatus.Pending || 0) + (complByStatus['In Progress'] || 0),
      resolvedComplaints: complByStatus.Resolved || 0,
      pendingComplaints: complByStatus.Pending || 0,
      inProgressComplaints: complByStatus['In Progress'] || 0,
      rejectedComplaints: complByStatus.Rejected || 0,
      totalPayments: payments.length,
      totalTransactions: payments.length
    };
  }

  /* --------------------------- bill creation --------------------------- */

  /**
   * Create a maintenance bill for one flat/resident for a period.
   * Returns { ok, bill } or { ok:false, reason }.
   */
  function createBill(input) {
    const flats = getData('flats');
    const residents = getData('residents');
    const bills = getData('maintenance');

    const flat = flats.find(function (f) { return f.id === input.flatId; });
    if (!flat) return { ok: false, reason: 'Select a valid flat.' };
    if (flat.status !== 'Occupied') return { ok: false, reason: 'Flat ' + flat.flatNo + ' is vacant — bills can only be raised on occupied flats.' };

    const resident = input.residentId
      ? residents.find(function (r) { return r.id === input.residentId; })
      : residents.find(function (r) { return r.id === flat.residentId; });
    if (!resident || resident.status !== 'Active') {
      return { ok: false, reason: 'No active resident is assigned to flat ' + flat.flatNo + '.' };
    }

    const dup = bills.find(function (b) {
      return b.flatId === flat.id && Number(b.month) === Number(input.month) && Number(b.year) === Number(input.year);
    });
    if (dup) {
      return {
        ok: false,
        reason: 'A bill already exists for flat ' + flat.flatNo + ' for ' +
          Utils.formatMonthYear(input.month, input.year) + ' (' + dup.billNo + ').'
      };
    }

    const amount = Number(input.amount);
    const extra = Number(input.additionalCharges) || 0;
    if (!isFinite(amount) || amount <= 0) return { ok: false, reason: 'Maintenance amount must be greater than zero.' };
    if (extra < 0) return { ok: false, reason: 'Additional charges cannot be negative.' };

    const id = generateId('maintenance', 'B');
    const bill = {
      id: id,
      billNo: 'MB-' + input.year + String(input.month).padStart(2, '0') + '-' +
        String(getData('maintenance').length + 1).padStart(3, '0'),
      residentId: resident.id,
      residentName: resident.name,
      flatId: flat.id,
      flatNo: flat.flatNo,
      building: flat.building,
      month: Number(input.month),
      year: Number(input.year),
      amount: amount,
      additionalCharges: extra,
      additionalNote: input.additionalNote || '',
      totalAmount: amount + extra,
      paidAmount: 0,
      dueDate: input.dueDate,
      status: 'Pending',
      generatedAt: Utils.todayISO(),
      notes: input.notes || ''
    };

    bills.push(bill);
    saveData('maintenance', bills);
    syncBillStatuses();
    return { ok: true, bill: bill };
  }

  /** Bulk-generate bills for every occupied flat for a period. */
  function generateBulkBills(month, year, additionalRate) {
    const flats = getData('flats');
    const residents = getData('residents');
    const results = { created: 0, skipped: 0, skippedList: [] };

    flats.forEach(function (flat) {
      if (flat.status !== 'Occupied') return;
      const resident = residents.find(function (r) { return r.id === flat.residentId; });
      if (!resident) { results.skipped++; results.skippedList.push(flat.flatNo + ' (no resident)'); return; }

      const amount = rateForType(flat.type);
      const dueDay = getSettings().defaultDueDay || 10;
      const res = createBill({
        flatId: flat.id,
        residentId: resident.id,
        month: month,
        year: year,
        amount: amount,
        additionalCharges: additionalRate || 0,
        dueDate: Utils.toISO(new Date(year, month - 1, dueDay))
      });
      if (res.ok) results.created++;
      else { results.skipped++; results.skippedList.push(flat.flatNo); }
    });

    return results;
  }

  /* --------------------------- payment recording --------------------------- */

  /**
   * Record a payment against a bill, validating against the outstanding amount.
   * Returns { ok, payment } or { ok:false, reason }.
   */
  function recordPayment(input) {
    const bills = getData('maintenance');
    const payments = getData('payments');

    const bill = bills.find(function (b) { return b.id === input.billId; });
    if (!bill) return { ok: false, reason: 'Select a valid maintenance bill.' };

    const outstanding = billOutstanding(bill);
    if (outstanding <= 0) {
      return { ok: false, reason: 'Bill ' + bill.billNo + ' is already fully paid. Duplicate payments are not allowed.' };
    }

    const amount = Number(input.amount);
    if (!isFinite(amount) || amount <= 0) return { ok: false, reason: 'Payment amount must be greater than zero.' };
    if (amount > outstanding) {
      return {
        ok: false,
        reason: 'Payment of ' + Utils.formatCurrency(amount) + ' exceeds the outstanding balance of ' +
          Utils.formatCurrency(outstanding) + ' for bill ' + bill.billNo + '.'
      };
    }

    const id = generateId('payments', 'T');
    const payment = {
      id: id,
      billId: bill.id,
      billNo: bill.billNo,
      residentId: bill.residentId,
      residentName: bill.residentName,
      flatId: bill.flatId,
      flatNo: bill.flatNo,
      building: bill.building,
      amount: amount,
      date: input.date || Utils.todayISO(),
      method: input.method || 'UPI',
      reference: input.reference || '',
      status: 'Success',
      recordedBy: input.recordedBy || (global.Auth && Auth.currentUser() ? Auth.currentUser().name : 'System'),
      note: input.note || '',
      createdAt: Utils.todayISO()
    };

    payments.push(payment);
    saveData('payments', payments);

    const newPaid = Math.round((Number(bill.paidAmount || 0) + amount) * 100) / 100;
    updateRecord('maintenance', bill.id, { paidAmount: newPaid });
    syncBillStatuses();

    return { ok: true, payment: payment, bill: findById('maintenance', bill.id) };
  }

  /* --------------------------- helper lookups --------------------------- */

  function residentsWithFlats() {
    const residents = getData('residents');
    const flats = getData('flats');
    return residents.map(function (r) {
      const f = flats.find(function (x) { return x.id === r.flatId; });
      return Object.assign({}, r, { flatType: f ? f.type : '—', floor: f ? f.floor : '—' });
    });
  }

  /** Bills belonging to a resident, newest period first. */
  function billsForResident(residentId) {
    return getData('maintenance')
      .filter(function (b) { return b.residentId === residentId; })
      .sort(function (a, b) {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
  }

  function paymentsForResident(residentId) {
    return getData('payments')
      .filter(function (p) { return p.residentId === residentId; })
      .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  }

  function outstandingForResident(residentId) {
    return billsForResident(residentId).reduce(function (a, b) { return a + billOutstanding(b); }, 0);
  }

  function complaintsForResident(residentId) {
    return getData('complaints')
      .filter(function (c) { return c.residentId === residentId; })
      .sort(function (a, b) { return String(b.submittedAt).localeCompare(String(a.submittedAt)); });
  }

  function complaintsForVendor(vendorId) {
    return getData('complaints')
      .filter(function (c) { return c.vendorId === vendorId; })
      .sort(function (a, b) { return String(b.submittedAt).localeCompare(String(a.submittedAt)); });
  }

  function freeFlatList() {
    const flats = getData('flats');
    const residents = getData('residents');
    return flats.filter(function (f) {
      if (f.status !== 'Occupied') return true;
      // occupied but resident inactive/removed -> effectively free
      return !residents.some(function (r) { return r.id === f.residentId && r.status === 'Active'; });
    });
  }

  /** Residents who don't currently hold an active flat assignment. */
  function unassignedResidents() {
    const residents = getData('residents');
    const flats = getData('flats');
    return residents.filter(function (r) {
      if (!r.flatId) return true;
      const f = flats.find(function (x) { return x.id === r.flatId; });
      return !f || f.residentId !== r.id;
    });
  }

  /** Monthly collection series for charts (last N months). */
  function monthlyCollectionSeries(count) {
    const n = count || 6;
    const buckets = Utils.lastMonths(n);
    const payments = getData('payments');
    const bills = getData('maintenance');

    return buckets.map(function (b) {
      const billedInMonth = bills.filter(function (x) {
        return Number(x.month) === b.month && Number(x.year) === b.year;
      });
      const paidInMonth = payments.filter(function (p) {
        const d = Utils.parseDate(p.date);
        return d && (d.getMonth() + 1) === b.month && d.getFullYear() === b.year;
      });
      return {
        label: Utils.monthShort(b.month) + " '" + String(b.year).slice(2),
        month: b.month,
        year: b.year,
        billed: Utils.sum(billedInMonth, 'totalAmount'),
        collected: Utils.sum(paidInMonth, 'amount')
      };
    });
  }

  global.DB = {
    KEYS: KEYS,
    getData: getData,
    saveData: saveData,
    getSettings: getSettings,
    saveSettings: saveSettings,
    generateId: generateId,
    addRecord: addRecord,
    updateRecord: updateRecord,
    deleteRecord: deleteRecord,
    findById: findById,
    initDatabase: initDatabase,
    resetDatabase: resetDatabase,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    rateForType: rateForType
  };

  global.Domain = {
    syncAll: syncAll,
    syncBillStatuses: syncBillStatuses,
    syncFlatOccupancy: syncFlatOccupancy,
    calculateTotals: calculateTotals,
    billOutstanding: billOutstanding,
    createBill: createBill,
    generateBulkBills: generateBulkBills,
    recordPayment: recordPayment,
    residentsWithFlats: residentsWithFlats,
    billsForResident: billsForResident,
    paymentsForResident: paymentsForResident,
    outstandingForResident: outstandingForResident,
    complaintsForResident: complaintsForResident,
    complaintsForVendor: complaintsForVendor,
    freeFlatList: freeFlatList,
    unassignedResidents: unassignedResidents,
    monthlyCollectionSeries: monthlyCollectionSeries
  };
})(window);
