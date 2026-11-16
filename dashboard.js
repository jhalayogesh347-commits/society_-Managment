/* ==========================================================================
   dashboard.js — admin dashboard: KPI cards, charts, recent activity
   ========================================================================== */

(function (global) {
  'use strict';

  const S = { ready: false };

  /* ------------------------------------------------------------ stat cards */

  function statCards(t) {
    const cards = [
      {
        label: 'Total Residents', value: t.totalResidents, icon: 'residents', tone: 'blue',
        foot: t.owners + ' owners · ' + t.tenants + ' tenants', link: 'residents'
      },
      {
        label: 'Total Flats', value: t.totalFlats, icon: 'flats', tone: 'navy',
        foot: t.occupancyRate + '% occupancy', link: 'flats'
      },
      {
        label: 'Occupied Flats', value: t.occupiedFlats, icon: 'home', tone: 'green',
        foot: t.vacantFlats + ' vacant', link: 'flats'
      },
      {
        label: 'Vacant Flats', value: t.vacantFlats, icon: 'building', tone: 'orange',
        foot: 'Available for allotment', link: 'flats'
      },
      {
        label: 'Maintenance Collected', value: Utils.formatCurrencyCompact(t.totalCollected),
        raw: t.totalCollected, icon: 'wallet', tone: 'green',
        foot: t.collectionRate + '% of ' + Utils.formatCurrencyCompact(t.totalBilled) + ' billed',
        link: 'payments'
      },
      {
        label: 'Pending Maintenance', value: Utils.formatCurrencyCompact(t.outstanding),
        raw: t.outstanding, icon: 'alert', tone: 'orange',
        foot: t.pendingBills + ' pending · ' + t.overdueBills + ' overdue', link: 'maintenance'
      },
      {
        label: 'Total Vendors', value: t.totalVendors, icon: 'vendors', tone: 'violet',
        foot: t.activeVendors + ' active vendors', link: 'vendors'
      },
      {
        label: 'Open Complaints', value: t.openComplaints, icon: 'complaints', tone: 'red',
        foot: t.resolvedComplaints + ' resolved to date', link: 'complaints'
      }
    ];

    return '<div class="stat-grid">' + cards.map(function (c) {
      return '<div class="stat-card" data-goto="' + c.link + '" style="cursor:pointer" ' +
        'title="Open ' + c.label + '">' +
        '<div class="stat-top">' +
        '<div><div class="stat-label">' + Utils.esc(c.label) + '</div>' +
        '<div class="stat-value">' + Utils.esc(String(c.value)) + '</div></div>' +
        '<div class="stat-icon ' + c.tone + '">' + App.icon(c.icon) + '</div>' +
        '</div>' +
        '<div class="stat-foot">' + Utils.esc(c.foot) + '</div>' +
        '</div>';
    }).join('') + '</div>';
  }

  /* ----------------------------------------------------------- quick actions */

  function quickActions() {
    const actions = [
      { label: 'Add Resident', icon: 'plus', section: 'residents', action: 'add' },
      { label: 'Add Flat', icon: 'flats', section: 'flats', action: 'add' },
      { label: 'Generate Bills', icon: 'maintenance', section: 'maintenance', action: 'generate' },
      { label: 'Add Vendor', icon: 'vendors', section: 'vendors', action: 'add' },
      { label: 'View Complaints', icon: 'complaints', section: 'complaints', action: 'view' }
    ];
    return '<div class="quick-grid">' + actions.map(function (a) {
      return '<button type="button" class="quick-action" data-quick="' + a.section + '" ' +
        'data-quick-action="' + a.action + '">' +
        '<span class="qa-icon">' + App.icon(a.icon) + '</span>' +
        '<span>' + Utils.esc(a.label) + '</span></button>';
    }).join('') + '</div>';
  }

  /* ---------------------------------------------------------------- recent lists */

  function recentPayments() {
    const rows = DB.getData('payments')
      .slice()
      .sort(function (a, b) {
        const d = String(b.date).localeCompare(String(a.date));
        return d !== 0 ? d : String(b.id).localeCompare(String(a.id));
      })
      .slice(0, 5);

    if (!rows.length) {
      return '<div class="empty-mini">No payments recorded yet.</div>';
    }

    return '<div class="mini-list">' + rows.map(function (p) {
      return '<div class="mini-row">' +
        '<div class="avatar sm">' + Utils.esc(Utils.initials(p.residentName)) + '</div>' +
        '<div class="info"><strong>' + Utils.esc(p.residentName) + '</strong>' +
        '<span>' + Utils.esc(p.flatNo) + ' · ' + Utils.esc(p.method) + ' · ' +
        Utils.esc(Utils.formatDate(p.date)) + '</span></div>' +
        '<div class="trail"><div class="amt">' + Utils.formatCurrency(p.amount) + '</div>' +
        '<div class="meta">' + Utils.esc(p.id) + '</div></div>' +
        '</div>';
    }).join('') + '</div>';
  }

  function recentComplaints() {
    const rows = DB.getData('complaints')
      .slice()
      .sort(function (a, b) { return String(b.submittedAt).localeCompare(String(a.submittedAt)); })
      .slice(0, 5);

    if (!rows.length) return '<div class="empty-mini">No complaints registered yet.</div>';

    return '<div class="mini-list">' + rows.map(function (c) {
      return '<div class="mini-row">' +
        '<div class="stat-icon ' + (c.status === 'Resolved' ? 'green' : c.status === 'Rejected' ? 'red' : 'orange') +
        '" style="width:34px;height:34px;border-radius:9px">' + App.icon('complaints') + '</div>' +
        '<div class="info"><strong>' + Utils.esc(Utils.truncate(c.title, 42)) + '</strong>' +
        '<span>' + Utils.esc(c.flatNo) + ' · ' + Utils.esc(c.category) + '</span></div>' +
        '<div class="trail"><span class="badge ' + App.statusClass(c.status) + '">' +
        Utils.esc(c.status) + '</span></div>' +
        '</div>';
    }).join('') + '</div>';
  }

  function recentResidents() {
    const rows = DB.getData('residents')
      .slice()
      .sort(function (a, b) { return String(b.joinDate).localeCompare(String(a.joinDate)); })
      .slice(0, 5);

    if (!rows.length) return '<div class="empty-mini">No residents registered yet.</div>';

    return '<div class="mini-list">' + rows.map(function (r) {
      return '<div class="mini-row">' +
        '<div class="avatar sm">' + Utils.esc(Utils.initials(r.name)) + '</div>' +
        '<div class="info"><strong>' + Utils.esc(r.name) + '</strong>' +
        '<span>' + Utils.esc(r.flatNo) + ' · ' + Utils.esc(r.type) + ' · ' +
        r.familyMembers + ' member' + (r.familyMembers === 1 ? '' : 's') + '</span></div>' +
        '<div class="trail"><div class="meta">Joined</div>' +
        '<div class="meta">' + Utils.esc(Utils.formatDate(r.joinDate)) + '</div></div>' +
        '</div>';
    }).join('') + '</div>';
  }

  /* ------------------------------------------------------------------ charts */

  function drawCollectionChart() {
    const series = Domain.monthlyCollectionSeries(6);
    App.chart('chartCollection', {
      type: 'bar',
      data: {
        labels: series.map(function (s) { return s.label; }),
        datasets: [
          {
            label: 'Billed',
            data: series.map(function (s) { return s.billed; }),
            backgroundColor: 'rgba(37, 99, 235, 0.16)',
            borderColor: 'rgba(37, 99, 235, 0.42)',
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.62,
            categoryPercentage: 0.68
          },
          {
            label: 'Collected',
            data: series.map(function (s) { return s.collected; }),
            backgroundColor: App.PALETTE.blue,
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.62,
            categoryPercentage: 0.68
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return ctx.dataset.label + ': ' + Utils.formatCurrency(ctx.parsed.y);
              }
            }
          }
        },
        scales: {
          x: Object.assign({}, App.AXIS),
          y: Object.assign({}, App.AXIS, {
            beginAtZero: true,
            ticks: {
              padding: 8,
              callback: function (v) { return Utils.formatCurrencyCompact(v); }
            }
          })
        }
      }
    }, 'collection');
  }

  function drawPaymentDonut(t) {
    App.chart('chartPayments', {
      type: 'doughnut',
      data: {
        labels: ['Paid', 'Pending', 'Overdue'],
        datasets: [{
          data: [t.paidBills, t.pendingBills, t.overdueBills],
          backgroundColor: ['#16a34a', '#f59e0b', '#dc2626'],
          borderColor: '#fff',
          borderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '66%',
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                const total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0) || 1;
                const pct = Math.round((ctx.parsed / total) * 100);
                return ' ' + ctx.label + ': ' + ctx.parsed + ' bill(s) (' + pct + '%)';
              }
            }
          }
        }
      }
    }, 'payDonut');
  }

  function drawComplaintChart(t) {
    App.chart('chartComplaints', {
      type: 'bar',
      data: {
        labels: ['Pending', 'In Progress', 'Resolved', 'Rejected'],
        datasets: [{
          label: 'Complaints',
          data: [t.pendingComplaints, t.inProgressComplaints, t.resolvedComplaints, t.rejectedComplaints],
          backgroundColor: ['#f59e0b', '#0891b2', '#16a34a', '#dc2626'],
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.58,
          categoryPercentage: 0.62
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) { return ' ' + ctx.parsed.x + ' complaint(s)'; }
            }
          }
        },
        scales: {
          x: Object.assign({}, App.AXIS, { beginAtZero: true, ticks: { padding: 8, precision: 0 } }),
          y: Object.assign({}, App.AXIS, { grid: { display: false } })
        }
      }
    }, 'complaintChart');
  }

  /* ------------------------------------------------------------------ render */

  function template(t) {
    const settings = DB.getSettings();
    const hero = '<div class="hero-banner">' +
      '<div class="hero-text">' +
      '<div class="eyebrow">' + Utils.esc(settings.societyName || 'Society') + '</div>' +
      '<h2>Society overview at a glance</h2>' +
      '<p>Live figures for residents, flats, maintenance collection and complaints — ' +
      'everything recalculated from the records stored in this browser.</p>' +
      '</div>' +
      '<div class="hero-stats">' +
      '<div class="hero-stat"><div class="hs-val">' + t.occupancyRate + '%</div>' +
      '<div class="hs-lbl">Occupancy</div></div>' +
      '<div class="hero-stat"><div class="hs-val">' + Utils.formatCurrencyCompact(t.totalCollected) + '</div>' +
      '<div class="hs-lbl">Collected</div></div>' +
      '<div class="hero-stat"><div class="hs-val">' + t.openComplaints + '</div>' +
      '<div class="hs-lbl">Open complaints</div></div>' +
      '</div></div>';

    return hero + statCards(t) +

      // Row 1 : collection chart + donut
      '<div class="chart-grid">' +
      '<div class="card col-8">' +
      '<div class="card-head"><div><h3>Monthly Maintenance Collection</h3>' +
      '<p>Billed versus collected over the last 6 months</p></div></div>' +
      '<div class="card-body"><div class="chart-holder"><canvas id="chartCollection"></canvas></div></div>' +
      '</div>' +
      '<div class="card col-4">' +
      '<div class="card-head"><div><h3>Payment Status</h3><p>Bills by status</p></div></div>' +
      '<div class="card-body"><div class="chart-holder"><canvas id="chartPayments"></canvas></div></div>' +
      '</div>' +
      '</div>' +

      // Row 2 : complaints chart + quick actions
      '<div class="dash-grid" style="margin-bottom:20px">' +
      '<div class="card col-7">' +
      '<div class="card-head"><div><h3>Complaint Status Distribution</h3>' +
      '<p>How registered complaints are progressing</p></div></div>' +
      '<div class="card-body"><div class="chart-holder short"><canvas id="chartComplaints"></canvas></div></div>' +
      '</div>' +
      '<div class="card col-5">' +
      '<div class="card-head"><div><h3>Quick Actions</h3><p>Common administrative tasks</p></div></div>' +
      '<div class="card-body">' + quickActions() + '</div>' +
      '</div>' +
      '</div>' +

      // Row 3 : three activity feeds
      '<div class="dash-grid">' +
      '<div class="card col-6">' +
      '<div class="card-head"><div><h3>Recent Payments</h3><p>Latest transactions recorded</p></div>' +
      '<div class="head-actions"><button class="btn sm secondary" data-goto="payments">View all</button></div></div>' +
      '<div class="card-body flush">' + recentPayments() + '</div>' +
      '</div>' +
      '<div class="card col-6">' +
      '<div class="card-head"><div><h3>Recent Complaints</h3><p>Newest complaints raised</p></div>' +
      '<div class="head-actions"><button class="btn sm secondary" data-goto="complaints">View all</button></div></div>' +
      '<div class="card-body flush">' + recentComplaints() + '</div>' +
      '</div>' +
      '</div>' +

      '<div class="card" style="margin-top:20px">' +
      '<div class="card-head"><div><h3>Recently Registered Residents</h3>' +
      '<p>Newest members of the society</p></div>' +
      '<div class="head-actions"><button class="btn sm secondary" data-goto="residents">View all residents</button></div></div>' +
      '<div class="card-body flush">' + recentResidents() + '</div>' +
      '</div>';
  }

  function render(el) {
    const t = Domain.calculateTotals();
    el.innerHTML = template(t);

    // Navigation bindings
    Utils.qsa('[data-goto]', el).forEach(function (node) {
      node.addEventListener('click', function () {
        App.go(node.getAttribute('data-goto'));
      });
    });

    Utils.qsa('[data-quick]', el).forEach(function (btn) {
      btn.addEventListener('click', function () {
        const section = btn.getAttribute('data-quick');
        const action = btn.getAttribute('data-quick-action');
        App.go(section);
        setTimeout(function () {
          const fn = global.Modules && Modules[section] && Modules[section].quick;
          if (fn) fn(action);
        }, 90);
      });
    });

    drawCollectionChart();
    drawPaymentDonut(t);
    drawComplaintChart(t);
    S.ready = true;
  }

  global.Dashboard = { render: render };
})(window);
