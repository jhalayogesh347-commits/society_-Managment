(function (global) {
  'use strict';
  function render(el) {
    const s = DB.getSettings();
    el.innerHTML = '<div class="page-intro"><div><h3>Society settings</h3><p>Contact details and maintenance defaults for this browser.</p></div></div>' +
      '<form id="settingsForm" class="card settings-form"><div class="card-head"><div><h3>Society profile</h3><p>Used in the application and printable receipts.</p></div></div><div class="card-body form-grid">' +
      field('societyName','Society name',s.societyName) + field('tagline','Tagline',s.tagline) + field('email','Contact email',s.email,'email') + field('phone','Phone number',s.phone,'tel') + field('address','Address',s.address,'text','span-2') + field('registrationNo','Registration number',s.registrationNo) + field('maintenanceRate','Rate per sq. ft. (₹)',s.maintenanceRate,'number') + field('defaultDueDay','Default due day',s.defaultDueDay,'number') + field('lateFee','Late fee (₹)',s.lateFee,'number') +
      '</div><div class="card-foot"><button class="btn" type="submit">Save settings</button></div></form>' +
      '<div class="card danger-zone"><div class="card-head"><div><h3>Demo data</h3><p>Reset this browser to the original interconnected demonstration data. Your current local records will be replaced.</p></div></div><div class="card-foot"><button type="button" class="btn danger" id="resetDemo">Reset demo data</button><span class="text-muted">No data is sent to a server.</span></div></div>';
    el.querySelector('#settingsForm').addEventListener('submit', function (e) { e.preventDefault(); const fd = new FormData(e.currentTarget); DB.saveSettings({ societyName: fd.get('societyName').trim(), tagline: fd.get('tagline').trim(), email: fd.get('email').trim(), phone: fd.get('phone').trim(), address: fd.get('address').trim(), registrationNo: fd.get('registrationNo').trim(), maintenanceRate: Number(fd.get('maintenanceRate')), defaultDueDay: Number(fd.get('defaultDueDay')), lateFee: Number(fd.get('lateFee')) }); Utils.toast('Society settings saved.', 'success'); App.rerender(); });
    el.querySelector('#resetDemo').addEventListener('click', function () { Utils.confirmDialog({ title: 'Reset all local demo data?', message: 'This replaces residents, flats, bills, payments, vendors, complaints, and settings in this browser.', confirmText: 'Reset data' }).then(function (ok) { if (!ok) return; DB.resetDatabase(); Utils.toast('Demo data restored.', 'success'); App.rerender(); }); });
  }
  function field(name,label,value,type,extra) { return '<div class="field '+(extra||'')+'"><label for="set-'+name+'">'+Utils.esc(label)+'</label><input id="set-'+name+'" name="'+name+'" type="'+(type||'text')+'" value="'+Utils.esc(value == null ? '' : value)+'" '+(type==='number'?'min="1"':'')+' required></div>'; }
  global.Modules = global.Modules || {}; global.Modules.settings = { render: render };
})(window);
