(function (global) {
  'use strict';
  const S = { q: '', status: '', method: '' };
  const METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Other'];
  function bills() { return DB.getData('maintenance'); }
  function filtered() {
    return DB.getData('payments').filter(function (p) {
      const q = S.q.toLowerCase();
      return (!q || [p.id,p.billNo,p.residentName,p.flatNo,p.reference].join(' ').toLowerCase().includes(q)) && (!S.method || p.method === S.method) && (!S.status || p.status === S.status);
    }).sort(function (a,b) { return String(b.date).localeCompare(String(a.date)); });
  }
  function render(el) {
    const rows = filtered();
    const sum = rows.reduce(function (a,p) { return a + Number(p.amount || 0); }, 0);
    el.innerHTML = '<div class="stat-grid compact-stats"><div class="stat-card"><div class="stat-label">Transactions</div><div class="stat-value">'+rows.length+'</div></div><div class="stat-card"><div class="stat-label">Collected in results</div><div class="stat-value">'+Utils.formatCurrencyCompact(sum)+'</div></div><div class="stat-card"><div class="stat-label">Outstanding bills</div><div class="stat-value">'+bills().filter(function(b){return Domain.billOutstanding(b)>0;}).length+'</div></div></div>' +
      '<div class="card"><div class="card-head"><div><h3>Payment transactions</h3><p>Every receipt is linked to a maintenance bill.</p></div><div class="head-actions"><button id="payAdd" class="btn">'+App.icon('plus')+' Record payment</button><button id="payExport" class="btn secondary">'+App.icon('download')+' Export CSV</button></div></div>' +
      '<div class="toolbar"><input id="paySearch" type="search" placeholder="Search transaction, resident, flat…" value="'+Utils.esc(S.q)+'"><select id="payStatus"><option value="">All statuses</option><option '+(S.status==='Success'?'selected':'')+'>Success</option><option '+(S.status==='Refunded'?'selected':'')+'>Refunded</option></select><select id="payMethod"><option value="">All methods</option>'+METHODS.map(function(m){return '<option '+(S.method===m?'selected':'')+'>'+m+'</option>';}).join('')+'</select></div>'+
      '<div class="table-wrap"><table class="data"><thead><tr><th>Transaction</th><th>Resident</th><th>Bill / Flat</th><th>Date</th><th>Method</th><th>Reference</th><th>Amount</th><th>Status</th><th class="text-right">Receipt</th></tr></thead><tbody>'+(rows.length?rows.map(function(p){return '<tr><td><strong>'+Utils.esc(p.id)+'</strong></td><td>'+Utils.esc(p.residentName)+'</td><td>'+Utils.esc((p.billNo||p.billId)+' · '+p.flatNo)+'</td><td>'+Utils.esc(Utils.formatDate(p.date))+'</td><td>'+Utils.esc(p.method)+'</td><td>'+Utils.esc(p.reference||'—')+'</td><td><strong>'+Utils.formatCurrency(p.amount)+'</strong></td><td><span class="badge '+App.statusClass(p.status)+'">'+Utils.esc(p.status)+'</span></td><td class="text-right"><button class="act-btn" data-receipt="'+p.id+'" title="Print receipt">'+App.icon('printer')+'</button></td></tr>';}).join(''):'<tr><td colspan="9"><div class="empty-mini">No payment transactions match your filters.</div></td></tr>')+'</tbody></table></div></div>';
    el.querySelector('#paySearch').addEventListener('input',Utils.debounce(function(e){S.q=e.target.value;render(el);},200));
    el.querySelector('#payStatus').addEventListener('change',function(e){S.status=e.target.value;render(el);});
    el.querySelector('#payMethod').addEventListener('change',function(e){S.method=e.target.value;render(el);});
    el.querySelector('#payExport').addEventListener('click',function(){Utils.exportCSV('payments-'+Utils.todayISO()+'.csv',filtered(),columns);});
    el.querySelector('#payAdd').addEventListener('click',function(){openForm();});
    el.querySelectorAll('[data-receipt]').forEach(function(b){b.addEventListener('click',function(){receipt(b.dataset.receipt);});});
  }
  const columns=[{key:'id',label:'Transaction ID'},{key:'billNo',label:'Bill ID'},{key:'residentName',label:'Resident'},{key:'flatNo',label:'Flat'},{key:'amount',label:'Amount'},{key:'date',label:'Payment Date'},{key:'method',label:'Method'},{key:'reference',label:'Reference'},{key:'status',label:'Status'}];
  function openForm(preselected) {
    const eligible=bills().filter(function(b){return Domain.billOutstanding(b)>0;});
    if(!eligible.length){Utils.toast('There are no bills with an outstanding balance.','info');return;}
    const overlay=document.createElement('div'); overlay.className='modal-overlay'; overlay.innerHTML='<div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><div><h3>Record a payment</h3><p>Record a simulated cash, UPI or bank payment.</p></div><button class="modal-close" data-close>×</button></div><form id="paymentForm"><div class="modal-body"><div class="form-grid"><div class="field span-2"><label for="pf-bill">Maintenance bill</label><select required id="pf-bill" name="billId"><option value="">Choose a bill</option>'+eligible.map(function(b){return '<option value="'+b.id+'" '+(preselected===b.id?'selected':'')+'>'+Utils.esc(b.billNo+' · '+b.flatNo+' · '+b.residentName+' · due '+Utils.formatCurrency(Domain.billOutstanding(b)))+'</option>';}).join('')+'</select></div><div class="field"><label for="pf-amount">Amount (₹)</label><input id="pf-amount" name="amount" required type="number" min="1" step="0.01"></div><div class="field"><label for="pf-date">Payment date</label><input id="pf-date" name="date" required type="date" value="'+Utils.todayISO()+'"></div><div class="field"><label for="pf-method">Method</label><select id="pf-method" name="method">'+METHODS.map(function(m){return '<option>'+m+'</option>';}).join('')+'</select></div><div class="field"><label for="pf-ref">Reference number</label><input id="pf-ref" name="reference" placeholder="Optional"></div></div><p class="hint" id="pf-due">Select a bill to see its outstanding balance.</p></div><div class="modal-foot"><button type="button" class="btn secondary" data-close>Cancel</button><button class="btn" type="submit">Record payment</button></div></form></div>';
    document.body.appendChild(overlay); overlay.querySelectorAll('[data-close]').forEach(function(b){b.addEventListener('click',function(){overlay.remove();});}); overlay.addEventListener('mousedown',function(e){if(e.target===overlay)overlay.remove();});
    const select=overlay.querySelector('#pf-bill'), amount=overlay.querySelector('#pf-amount'), hint=overlay.querySelector('#pf-due');
    function update(){const b=DB.findById('maintenance',select.value); if(!b)return; const due=Domain.billOutstanding(b); amount.max=due; hint.textContent='Outstanding balance: '+Utils.formatCurrency(due);}
    select.addEventListener('change',update); if(preselected)update();
    overlay.querySelector('#paymentForm').addEventListener('submit',function(e){e.preventDefault();const fd=new FormData(e.currentTarget);const result=Domain.recordPayment({billId:fd.get('billId'),amount:fd.get('amount'),date:fd.get('date'),method:fd.get('method'),reference:fd.get('reference')});if(!result.ok){Utils.toast(result.reason,'error');return;}overlay.remove();Utils.toast('Payment recorded. Transaction '+result.payment.id+'.','success');App.rerender();});
    requestAnimationFrame(function(){overlay.classList.add('show');});
  }
  function receipt(id) {
    const p=DB.findById('payments',id); if(!p)return;
    const society=DB.getSettings(); const root=document.createElement('div'); root.className='receipt';
    root.innerHTML='<div class="receipt-brand"><div><strong>'+Utils.esc(society.societyName||'Society')+'</strong><p>'+Utils.esc(society.address||'')+'</p></div><span>PAYMENT RECEIPT</span></div><div class="receipt-total"><small>Amount received</small><strong>'+Utils.formatCurrency(p.amount)+'</strong></div><div class="detail-grid"><div class="detail-item"><div class="dt">Receipt / transaction</div><div class="dd">'+Utils.esc(p.id)+'</div></div><div class="detail-item"><div class="dt">Date</div><div class="dd">'+Utils.esc(Utils.formatDate(p.date))+'</div></div><div class="detail-item"><div class="dt">Received from</div><div class="dd">'+Utils.esc(p.residentName)+'</div></div><div class="detail-item"><div class="dt">Flat</div><div class="dd">'+Utils.esc(p.flatNo)+'</div></div><div class="detail-item"><div class="dt">For bill</div><div class="dd">'+Utils.esc(p.billNo||p.billId)+'</div></div><div class="detail-item"><div class="dt">Payment method</div><div class="dd">'+Utils.esc(p.method)+'</div></div><div class="detail-item"><div class="dt">Reference</div><div class="dd">'+Utils.esc(p.reference||'—')+'</div></div></div><p class="receipt-foot">This is a computer-generated receipt for a simulated payment record.</p>';
    Utils.printElement(root);
  }
  global.Modules=global.Modules||{};global.Modules.payments={render:render,openWithBill:openForm,receipt:receipt};
})(window);
