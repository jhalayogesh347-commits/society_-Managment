(function () {
  'use strict';
  DB.initDatabase();
  Domain.syncAll();
  const role = document.body.getAttribute('data-role');
  const user = Auth.requireRole([role]);
  if (!user) return;
  const pages = {
    admin: {
      dashboard: ['Dashboard', 'A live view of your society', Dashboard.render],
      residents: ['Residents', 'Manage people and household records', Modules.residents.render],
      flats: ['Flats', 'Track inventory and occupancy', Modules.flats.render],
      maintenance: ['Maintenance', 'Bills, dues and collection', Modules.maintenance.render],
      vendors: ['Vendors', 'Service partners and assignments', Modules.vendors.render],
      complaints: ['Complaints', 'Review and coordinate service requests', Modules.complaints.render],
      payments: ['Payments', 'Transactions and receipts', Modules.payments.render],
      reports: ['Reports', 'Operational and collection reporting', Modules.reports.render],
      settings: ['Settings', 'Society details and local demo data', Modules.settings.render]
    },
    resident: {
      dashboard: ['My dashboard', 'Your home at a glance', function (el) { Modules.portals.render(el, 'residentDashboard'); }],
      profile: ['My profile', 'Your resident account', function (el) { Modules.portals.render(el, 'profile'); }],
      myflat: ['My flat', 'Your assigned home', function (el) { Modules.portals.render(el, 'myflat'); }],
      mymaintenance: ['My maintenance', 'Bills and outstanding balance', function (el) { Modules.portals.render(el, 'mymaintenance'); }],
      mypayments: ['My payments', 'Your payment history and receipts', function (el) { Modules.portals.render(el, 'mypayments'); }],
      mycomplaints: ['My complaints', 'Raise a request and follow progress', function (el) { Modules.portals.render(el, 'mycomplaints'); }]
    },
    vendor: {
      dashboard: ['Vendor dashboard', 'Your service work at a glance', function (el) { Modules.portals.render(el, 'vendorDashboard'); }],
      profile: ['My profile', 'Your vendor account', function (el) { Modules.portals.render(el, 'vendorProfile'); }],
      assigned: ['Assigned complaints', 'Work requests assigned to you', function (el) { Modules.portals.render(el, 'assigned'); }],
      history: ['Service history', 'Completed service assignments', function (el) { Modules.portals.render(el, 'history'); }]
    }
  };
  const sections = {};
  Object.keys(pages[role] || {}).forEach(function (key) {
    const p = pages[role][key]; sections[key] = { title: p[0], subtitle: p[1], render: p[2] };
  });
  App.mount({ role: role, sections: sections });
})();
