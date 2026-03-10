/******************************************
  script.js - Versión final integrada (con modalAddEquipment y provider)
******************************************/
document.addEventListener('DOMContentLoaded', () => {

  /* KEYS / DATA */
  const KEY_INV = 'mp_inv_v1';
  const KEY_ORD = 'mp_ord_v1';
  const KEY_EVT = 'mp_evt_v1';
  // usuario logeado (sesión simple)
  const KEY_USER = 'mp_user_v1';
  // sesión persistente (usuario actualmente logeado)
  const KEY_SESSION = 'mp_logged_user';
  // lista de usuarios permitidos
  const KEY_USERS = 'mp_users_v1';

  let inventory = JSON.parse(localStorage.getItem(KEY_INV)) || [];
  let orders = JSON.parse(localStorage.getItem(KEY_ORD)) || [];
  let events = JSON.parse(localStorage.getItem(KEY_EVT)) || [];

  // Usuarios permitidos (si no existe la lista, se crea una por defecto)
  // Nota: puedes administrar estos usuarios directamente en localStorage (KEY_USERS)
  let allowedUsers = JSON.parse(localStorage.getItem(KEY_USERS) || 'null');
  if(!Array.isArray(allowedUsers) || allowedUsers.length === 0){
    allowedUsers = [
      { username: 'admin', password: 'admin123', name: 'Administrador' },
      { username: 'demo',  password: 'demo123',  name: 'Usuario Demo' }
    ];
    localStorage.setItem(KEY_USERS, JSON.stringify(allowedUsers));
  }

  function getSession(){
    try{ return JSON.parse(localStorage.getItem(KEY_SESSION) || 'null'); }
    catch(e){ return null; }
  }
  function setSession(userObj){
    localStorage.setItem(KEY_SESSION, JSON.stringify(userObj));
  }
  function clearSession(){
    localStorage.removeItem(KEY_SESSION);
  }

  /* UI REFS */
  const loginForm = document.getElementById('loginForm');
  const loginView = document.getElementById('loginView');
  const app = document.getElementById('app');
  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.view');
  const toggleSidebar = document.getElementById('toggleSidebar');
  const userName = document.getElementById('userName');

  // menu simple de usuario (logout)
  let userMenuEl = null;
  function ensureUserMenu(){
    if(!userName) return;
    if(userMenuEl) return;

    userMenuEl = document.createElement('div');
    userMenuEl.className = 'user-menu hidden';
    userMenuEl.innerHTML = `<button type="button" class="user-menu-item" id="btnLogout">Cerrar sesión</button>`;
    document.body.appendChild(userMenuEl);

    // cerrar al hacer click fuera
    document.addEventListener('click', (e)=>{
      if(!userMenuEl || userMenuEl.classList.contains('hidden')) return;
      if(e.target === userName || userMenuEl.contains(e.target)) return;
      userMenuEl.classList.add('hidden');
    });

    // toggle al click del nombre
    userName.addEventListener('click', (e)=>{
      e.stopPropagation();
      const rect = userName.getBoundingClientRect();
      userMenuEl.style.top = (rect.bottom + window.scrollY + 6) + 'px';
      userMenuEl.style.left = (rect.right + window.scrollX - 160) + 'px';
      userMenuEl.classList.toggle('hidden');
    });

    // logout
    userMenuEl.querySelector('#btnLogout').addEventListener('click', ()=>{
      doLogout();
    });
  }

  function setHeaderUser(displayName){
    if(userName) userName.textContent = (displayName || 'Usuario') + ' ▾';
  }

  function enforceAuth(){
    const sess = getSession();
    if(sess){
      loginView.classList.add('hidden');
      app.classList.remove('hidden');
      setHeaderUser(sess.name || sess.username || sess.email);
      ensureUserMenu();
      refreshAll();
      scheduleAlerts();
    } else {
      app.classList.add('hidden');
      loginView.classList.remove('hidden');
      setHeaderUser('—');
      if(userMenuEl) userMenuEl.classList.add('hidden');
    }
  }

  function doLogout(){
    clearSession();
    // evitar que "atrás" reviva la vista anterior: recargar en modo replace
    try{ history.replaceState(null, '', location.href); }catch(e){}
    // forzar estado de login
    enforceAuth();
    // recargar para limpiar estado en memoria
    location.replace('index.html');
  }

  const equipCount = document.getElementById('equipCount');
  const maintCount = document.getElementById('maintCount');
  const orderCount = document.getElementById('orderCount');
  const outCount = document.getElementById('outCount');
  const inventoryTable = document.querySelector('#inventoryTable tbody');
  const ordersTable = document.querySelector('#ordersTable tbody');
  const recentTable = document.querySelector('#recentTable tbody');
  const calendarEl = document.getElementById('calendar');
  const calendarList = document.getElementById('calendarList');

  const modalAddEquipment = document.getElementById('modalAddEquipment');
  const formAddEquipment = document.getElementById('formAddEquipment');
  const btnAddEquipment = document.getElementById('btnAddEquipment');
  const cancelAddEquipment = document.getElementById('cancelAddEquipment');

  const modalCal = document.getElementById('modalCalEvent');
  const formCal = document.getElementById('formCalEvent');
  const calEqSelect = document.getElementById('calEqSelect');
  const cancelCal = document.getElementById('cancelCal');

  const modalDayEvents = document.getElementById('modalDayEvents');
  const dayEventsContent = document.getElementById('dayEventsContent');
  const btnAddEventFromDay = document.getElementById('btnAddEventFromDay');
  const closeDayEvents = document.getElementById('closeDayEvents');

  const modalNewOrder = document.getElementById('modalNewOrder');
  const formNewOrder = document.getElementById('formNewOrder');
  const btnNewOrder = document.getElementById('btnNewOrder');
  const cancelNewOrder = document.getElementById('cancelNewOrder');

  const modalEdit = document.getElementById('modalEditOrder');
  const formEdit = document.getElementById('formEditOrder');
  const cancelEdit = document.getElementById('cancelEdit');

  const modalDetail = document.getElementById('modalOrderDetail');
  const orderDetailContent = document.getElementById('orderDetailContent');
  const btnCloseDownload = document.getElementById('btnCloseDownload');
  const btnCloseDetail = document.getElementById('btnCloseDetail');

  const modalHistory = document.getElementById('modalHistory');
  const historyContent = document.getElementById('historyContent');
  const closeHistoryBtn = document.getElementById('closeHistory');

  const searchInput = document.getElementById('searchInput');
  const btnRestore = document.getElementById('btnRestore');

  const calendarViewSelect = document.getElementById('calendarViewSelect');
  const filterArea = document.getElementById('filterArea');
  const filterType = document.getElementById('filterType');
  const filterEq = document.getElementById('filterEq');

  /* helpers */
  let calSelectedDate = null;
  let currentOrder = null;
  let editingEventId = null;

  let technicians = ['Pedro M.','Laura R.','Ana G.','Técnico Externo'];

  /* UTILITIES */
  function persistAll(){
    localStorage.setItem(KEY_INV, JSON.stringify(inventory));
    localStorage.setItem(KEY_ORD, JSON.stringify(orders));
    localStorage.setItem(KEY_EVT, JSON.stringify(events));
    // backups (keep last 5)
    const ts = new Date().toISOString();
    const key = 'mp_backup_' + ts;
    localStorage.setItem(key, JSON.stringify({inventory,orders,events,ts}));
    let backs = JSON.parse(localStorage.getItem('mp_backups')||'[]');
    backs.push(key);
    if(backs.length>5){ localStorage.removeItem(backs.shift()); }
    localStorage.setItem('mp_backups', JSON.stringify(backs));
  }

  function genEventId(){ return 'EV-' + Date.now().toString().slice(-6); }
  function genOrderId(){ return 'OT-' + Date.now().toString().slice(-6); }
  function addMonths(dateStr, months){
    const [y,m,d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m-1, d);
    dt.setMonth(dt.getMonth()+months);
    return dt.toISOString().slice(0,10);
  }

  /* FIND equipment robust */
  function findEquipmentByRef(ref){
    if(!ref) return null;
    const r = String(ref).trim();
    let found = inventory.find(i=> i.serial === r);
    if(found) return found;
    found = inventory.find(i=> i.inventory === r);
    if(found) return found;
    const m = r.match(/\((.*?)\)/);
    if(m && m[1]){ found = inventory.find(i=> i.serial === m[1] || i.inventory === m[1]); if(found) return found; }
    found = inventory.find(i=> r.includes(i.serial));
    if(found) return found;
    found = inventory.find(i=> `${i.type} ${i.serial}`.toLowerCase() === r.toLowerCase());
    if(found) return found;
    found = inventory.find(i=> (`${i.type} ${i.brand} ${i.model} ${i.serial} ${i.inventory}`).toLowerCase().includes(r.toLowerCase()));
    return found || null;
  }

  /* HISTORY */
  function addHistoryEntry(serial, text){
    const date = new Date().toISOString().slice(0,10);
    const eq = inventory.find(i=> i.serial === serial);
    if(eq){
      eq.history = eq.history || [];
      eq.history.unshift({date, text});
      if(eq.history.length>100) eq.history = eq.history.slice(0,100);
      persistAll();
    }
  }

  function showHistoryModal(serial){
    historyContent.innerHTML = '';
    const eq = inventory.find(i=> i.serial === serial);
    if(!eq){ historyContent.textContent = 'Equipo no encontrado.'; modalHistory.classList.remove('hidden'); return; }
    if(!eq.history || !eq.history.length){ historyContent.textContent = 'No hay historial.'; modalHistory.classList.remove('hidden'); return; }
    eq.history.forEach(h=>{
      const div = document.createElement('div');
      div.style.padding='6px 0'; div.style.borderBottom='1px solid #eee';
      div.innerHTML = `<strong>${h.date}</strong><div>${h.text}</div>`;
      historyContent.appendChild(div);
    });
    modalHistory.classList.remove('hidden');
  }
  closeHistoryBtn && closeHistoryBtn.addEventListener('click', ()=> modalHistory.classList.add('hidden'));

  /* RESTORE */
  function restoreLastBackup(){
    const backs = JSON.parse(localStorage.getItem('mp_backups')||'[]');
    if(!backs.length) return alert('No hay respaldos.');
    const key = backs[backs.length-1];
    const snap = JSON.parse(localStorage.getItem(key) || '{}');
    if(!snap) return alert('Respaldo inválido');
    inventory = snap.inventory || [];
    orders = snap.orders || [];
    events = snap.events || [];
    persistAll();
    refreshAll();
    alert('Restaurado.');
  }
  btnRestore && btnRestore.addEventListener('click', restoreLastBackup);

  /* RENDER INVENTORY (with delete) */
  function renderInventory(filter=''){
    inventoryTable.innerHTML = '';
    const q = (filter||'').toLowerCase();
    inventory.forEach(eq=>{
      const combined = `${eq.type} ${eq.brand} ${eq.model} ${eq.serial} ${eq.inventory} ${eq.area}`.toLowerCase();
      if(q && !combined.includes(q)) return;
      const tr = document.createElement('tr');
      const cls = eq.status === 'Operativo' ? 'green' : (eq.status === 'En mantenimiento' ? 'yellow' : 'red');
      tr.innerHTML = `<td>${eq.type}</td><td>${eq.brand}</td><td>${eq.model}</td><td>${eq.serial}</td><td>${eq.inventory}</td><td>${eq.area}</td>
        <td><span class="tag ${cls}">${eq.status}</span></td>
        <td style="display:flex;gap:6px">
          <button class="btn small histBtn" data-serial="${eq.serial}">Historial</button>
          <button class="btn small secondary editEqBtn" data-serial="${eq.serial}">Editar</button>
          <button class="btn small secondary delEqBtn" data-serial="${eq.serial}">Eliminar</button>
        </td>`;
      inventoryTable.appendChild(tr);
    });

    inventoryTable.querySelectorAll('button.histBtn').forEach(b=> b.addEventListener('click', ()=> showHistoryModal(b.dataset.serial)));
    inventoryTable.querySelectorAll('button.delEqBtn').forEach(b=> b.addEventListener('click', ()=> {
      const s = b.dataset.serial;
      if(!confirm(`¿Eliminar equipo con No. serie ${s}?`)) return;
      deleteEquipmentBySerial(s);
    }));
    inventoryTable.querySelectorAll('button.editEqBtn').forEach(b=> b.addEventListener('click', ()=>{
      const s = b.dataset.serial;
      const eq = inventory.find(i=> i.serial === s);
      if(!eq) return alert('No encontrado');
      const newArea = prompt('Área:', eq.area) || eq.area;
      eq.area = newArea;
      persistAll(); renderInventory(); populateSelects();
    }));
  }

  function deleteEquipmentBySerial(serial){
    const idx = inventory.findIndex(i=> i.serial === serial);
    if(idx < 0) return alert('Equipo no encontrado');
    const removed = inventory.splice(idx,1)[0];
    events = events.filter(ev=> ev.serial !== serial);
    orders.forEach(o=>{
      if(o.equipment && o.equipment.serial === serial){ o.equipment = null; o.eq = `${removed.type} (${removed.serial}) [ELIMINADO]`; }
      else if(String(o.eq).includes(serial)){ o.eq = `${o.eq} [EQUIPO NO DISPONIBLE]`; }
    });
    addHistoryEntry(removed.serial, 'Equipo eliminado del inventario');
    persistAll();
    renderInventory(); renderOrders(); renderCalendar(); populateSelects(); scheduleAlerts();
    alert('Equipo eliminado correctamente.');
  }

  /* ADD INVENTORY (formAddEquipment) */
  btnAddEquipment && btnAddEquipment.addEventListener('click', ()=> modalAddEquipment.classList.remove('hidden'));
  cancelAddEquipment && cancelAddEquipment.addEventListener('click', ()=> modalAddEquipment.classList.add('hidden'));

  formAddEquipment && formAddEquipment.addEventListener('submit', (e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(formAddEquipment).entries());
    const item = {
      type: data.type, brand: data.brand, model: data.model,
      serial: data.serial, inventory: data.inventory, area: data.area,
      status: data.status, frequency: Number(data.frequency) || 0,
      provider: data.provider || '', notes: data.notes || '', critical: false, history: []
    };
    inventory.push(item);
    addHistoryEntry(item.serial, 'Equipo registrado');
    if(item.frequency && item.frequency>0) createRecurringEventsForEquipment(item, 12);
    persistAll(); formAddEquipment.reset(); modalAddEquipment.classList.add('hidden'); populateSelects(); refreshAll();
  });

  /* RECURRING EVENTS */
  function createRecurringEventsForEquipment(item, monthsAhead=12){
    if(!item.frequency || item.frequency<=0) return;
    const today = new Date().toISOString().slice(0,10);
    for(let m = item.frequency; m <= monthsAhead; m+= item.frequency){
      const d = addMonths(today, m);
      const exists = events.some(ev=> ev.serial === item.serial && ev.date === d && ev.type === 'Preventivo');
      if(!exists) events.push({id: genEventId(), date: d, serial: item.serial, type: 'Preventivo', technician:'', priority:'normal', notes:'Automático (recurrencia)'});
    }
    persistAll();
  }

  /* SELECTS / TECHS */
  function populateSelects(){
    // areas
    const areas = Array.from(new Set(inventory.map(i=> i.area).filter(Boolean)));
    filterArea.innerHTML = '<option value="all">Todas</option>';
    areas.forEach(a=> { const o = document.createElement('option'); o.value = a; o.textContent = a; filterArea.appendChild(o); });

    // calendar equipment select
    calEqSelect.innerHTML = '';
    const newEqSel = document.querySelector('#formNewOrder [name="eq"]');
    if(newEqSel) newEqSel.innerHTML = '<option value="">-- Seleccione un equipo --</option>';

    inventory.forEach(eq=>{
      const opt = document.createElement('option'); opt.value = eq.serial; opt.textContent = `${eq.type} - ${eq.brand} ${eq.model} (${eq.serial})`;
      calEqSelect.appendChild(opt);
      if(newEqSel){
        const o2 = document.createElement('option'); o2.value = `${eq.serial}`; o2.textContent = `${eq.type} - ${eq.brand} ${eq.model} (${eq.serial})`;
        newEqSel.appendChild(o2);
      }
    });

    // technicians
    const techSel = document.getElementById('calTechnician');
    if(techSel){
      techSel.innerHTML = '<option value="">-- No asignado --</option>';
      technicians.forEach(t=> { const o = document.createElement('option'); o.value = t; o.textContent = t; techSel.appendChild(o); });
    }
  }

  /* CALENDAR RENDER */
  function renderCalendar(){
    const areaF = filterArea ? filterArea.value : 'all';
    const typeF = filterType ? filterType.value : 'all';
    const eqF = filterEq ? filterEq.value.trim().toLowerCase() : '';

    calendarEl.innerHTML = '';
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month+1, 0);
    const start = first.getDay();

    const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    days.forEach(d=> {
      const hd = document.createElement('div'); hd.className='day'; hd.style.fontWeight='700'; hd.style.textAlign='center'; hd.textContent = d;
      calendarEl.appendChild(hd);
    });

    for(let i=0;i<start;i++){ const e = document.createElement('div'); e.className='day'; calendarEl.appendChild(e); }

    for(let d=1; d<=last.getDate(); d++){
      const box = document.createElement('div'); box.className='day';
      const dateDiv = document.createElement('div'); dateDiv.className='date'; dateDiv.textContent = d;
      box.appendChild(dateDiv);
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

      const evs = events.filter(ev=> ev.date === dateStr).filter(ev=>{
        const eq = inventory.find(i=> i.serial === ev.serial) || {};
        if(areaF !== 'all' && eq.area !== areaF) return false;
        if(typeF !== 'all' && ev.type !== typeF) return false;
        if(eqF){
          const combined = `${eq.type || ''} ${eq.brand || ''} ${eq.model || ''} ${eq.serial || ''}`.toLowerCase();
          if(!combined.includes(eqF)) return false;
        }
        return true;
      });

      evs.forEach(ev=>{
        const dot = document.createElement('span'); dot.className='event-dot';
        dot.classList.add(ev.type === 'Preventivo' ? 'green' : (ev.type === 'Predictivo' ? 'yellow' : 'red'));
        box.appendChild(dot);
        if(ev.priority && ev.priority !== 'normal'){
          const p = document.createElement('span'); p.className='priority-dot ' + (ev.priority === 'alta' ? 'alta' : 'critica');
          box.appendChild(p);
        }
      });

      box.addEventListener('click', ()=> {
        const evsForDay = events.filter(ev=> ev.date === dateStr);
        openDayEventsModal(dateStr, evsForDay);
      });

      calendarEl.appendChild(box);
    }

    renderCalendarList();
  }

  function renderCalendarList(){
    calendarList.innerHTML = '';
    if(events.length === 0){ calendarList.textContent = 'No hay mantenimientos programados.'; return; }
    const sorted = events.slice().sort((a,b)=> a.date.localeCompare(b.date));
    sorted.forEach(ev=>{
      const eq = inventory.find(i=> i.serial === ev.serial) || { type:'N/D', brand:'' , model:''};
      const div = document.createElement('div'); div.style.padding='6px 0'; div.style.borderBottom='1px solid #eee';
      div.textContent = `${ev.date} — ${eq.type} ${eq.brand} ${eq.model} (${ev.serial}) — ${ev.type} — ${ev.technician || 'No asignado'}`;
      calendarList.appendChild(div);
    });
  }

  /* OPEN DAY EVENTS MODAL (separate modal) */
  function openDayEventsModal(dateStr, eventsList){
    dayEventsContent.innerHTML = '';
    const header = document.createElement('div'); header.innerHTML = `<strong>Fecha: ${dateStr}</strong>`; dayEventsContent.appendChild(header);

    if(!eventsList || !eventsList.length){
      const p = document.createElement('p'); p.textContent = 'No hay mantenimientos programados para este día.'; p.style.marginTop='8px';
      dayEventsContent.appendChild(p);
    } else {
      eventsList.forEach(ev=>{
        const eq = inventory.find(i=> i.serial === ev.serial) || { type:'N/D', brand:'', model:'', serial: ev.serial || 'N/D' };
        const row = document.createElement('div'); row.style.borderBottom='1px solid #eee'; row.style.padding='10px 6px';
        row.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-weight:700">${eq.type} ${eq.brand} ${eq.model} (${ev.serial})</div>
              <div style="font-size:13px;color:#555">Tipo: ${ev.type} — Técnico: ${ev.technician || 'No asignado'} — Prioridad: ${ev.priority}</div>
              <div style="font-size:13px;color:#666;margin-top:6px">Notas: ${ev.notes || '—'}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px">
              <button class="btn small" data-action="gen" data-id="${ev.id}">Generar orden</button>
              <button class="btn small secondary" data-action="edit" data-id="${ev.id}">Editar</button>
              <button class="btn small secondary" data-action="delEvt" data-id="${ev.id}">Eliminar</button>
            </div>
          </div>
        `;
        dayEventsContent.appendChild(row);
      });
    }

    modalDayEvents.classList.remove('hidden');

    closeDayEvents.onclick = ()=> { modalDayEvents.classList.add('hidden'); renderCalendar(); };

    btnAddEventFromDay.onclick = ()=> {
      modalDayEvents.classList.add('hidden');
      calSelectedDate = dateStr;
      populateSelects();
      modalCal.classList.remove('hidden');
    };

    // dynamic buttons
    dayEventsContent.querySelectorAll('button[data-action]').forEach(b=>{
      b.onclick = ()=>{
        const id = b.dataset.id;
        const act = b.dataset.action;
        if(act === 'gen'){ modalDayEvents.classList.add('hidden'); createOrderFromEvent(id); }
        if(act === 'edit'){ modalDayEvents.classList.add('hidden'); editEvent(id); }
        if(act === 'delEvt'){
          if(!confirm('Eliminar este evento?')) return;
          const idx = events.findIndex(e=> e.id === id);
          if(idx>=0){ const rem = events.splice(idx,1)[0]; addHistoryEntry(rem.serial, `Evento eliminado: ${rem.type} ${rem.date}`); persistAll(); renderCalendar(); openDayEventsModal(dateStr, events.filter(ev=> ev.date === dateStr)); }
        }
      };
    });
  }

  /* CALENDAR FORM HANDLERS */
  cancelCal && cancelCal.addEventListener('click', ()=> { modalCal.classList.add('hidden'); editingEventId = null; formCal.reset(); });

  formCal && formCal.addEventListener('submit', (e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(formCal).entries());
    const date = calSelectedDate || new Date().toISOString().slice(0,10);

    if(editingEventId){
      const ev = events.find(x=> x.id === editingEventId);
      if(ev){
        ev.serial = data.eq;
        ev.type = data.type;
        ev.technician = data.technician;
        ev.priority = data.priority;
        ev.notes = data.notes;
        addHistoryEntry(ev.serial, `Evento editado: ${ev.type} ${ev.date}`);
      }
      editingEventId = null;
    } else {
      const newEv = { id: genEventId(), date, serial: data.eq, type: data.type, technician: data.technician || '', priority: data.priority || 'normal', notes: data.notes || '' };
      events.push(newEv);
      addHistoryEntry(newEv.serial, `Mantenimiento programado: ${newEv.type} ${newEv.date}`);
    }
    persistAll(); modalCal.classList.add('hidden'); formCal.reset(); renderCalendar(); scheduleAlerts();
  });

  function editEvent(evId){
    const ev = events.find(e=> e.id === evId);
    if(!ev) return alert('Evento no encontrado');
    calSelectedDate = ev.date;
    populateSelects();
    modalCal.classList.remove('hidden');
    editingEventId = ev.id;
    formCal.eq.value = ev.serial;
    formCal.type.value = ev.type;
    formCal.technician.value = ev.technician || '';
    formCal.priority.value = ev.priority || 'normal';
    formCal.notes.value = ev.notes || '';
  }

  function createOrderFromEvent(evId){
    const ev = events.find(e=> e.id === evId);
    if(!ev) return alert('Evento no encontrado');
    populateSelects();
    modalNewOrder.classList.remove('hidden');
    // prefill order form (select)
    const sel = document.querySelector('#formNewOrder [name="eq"]');
    if(sel) sel.value = ev.serial;
    const dateInput = document.querySelector('#formNewOrder [name="date"]');
    if(dateInput) dateInput.value = ev.date;
    const typeSel = document.querySelector('#formNewOrder [name="otype"]');
    if(typeSel) typeSel.value = ev.type;
  }

  /* ORDERS */
  btnNewOrder && btnNewOrder.addEventListener('click', ()=> { populateSelects(); modalNewOrder.classList.remove('hidden'); });
  cancelNewOrder && cancelNewOrder.addEventListener('click', ()=> modalNewOrder.classList.add('hidden'));

  formNewOrder && formNewOrder.addEventListener('submit', (e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(formNewOrder).entries());
    if(!data.eq){ return alert('Debe seleccionar un equipo del inventario.'); }
    const id = genOrderId();
    const eqObj = findEquipmentByRef(data.eq);
    const order = { id, eq: data.eq, equipment: eqObj || null, type: data.otype, tech: data.tech, date: data.date, notes: data.notes, status: 'Abierta' };
    orders.push(order);
    const serialForHistory = eqObj ? eqObj.serial : extractSerialFromEq(order.eq);
    addHistoryEntry(serialForHistory, `Orden creada: ${order.id} (${order.type})`);
    persistAll(); modalNewOrder.classList.add('hidden'); formNewOrder.reset(); renderOrders(); refreshAll();
  });

  function extractSerialFromEq(eqString){
    const m = String(eqString).match(/\((.*?)\)/);
    if(m && m[1]) return m[1];
    return eqString;
  }

  function renderOrders(){
    ordersTable.innerHTML = ''; recentTable.innerHTML = '';
    orders.slice().reverse().forEach(o=>{
      const tr = document.createElement('tr');
      const cls = o.status === 'Cerrada' ? 'green' : (o.status === 'En proceso' ? 'yellow' : 'red');
      tr.innerHTML = `<td>${o.id}</td><td>${o.eq}</td><td>${o.type}</td><td>${o.tech}</td><td>${o.date}</td><td><span class="tag ${cls}">${o.status}</span></td>
        <td><button class="btn small viewBtn">Ver</button> <button class="btn small editBtn">Editar</button></td>`;
      tr.querySelector('.viewBtn').addEventListener('click', ()=> openOrderDetail(o));
      tr.querySelector('.editBtn').addEventListener('click', ()=> openOrderEdit(o));
      ordersTable.appendChild(tr);
      const rr = tr.cloneNode(true); const last = rr.querySelector('td:last-child'); if(last) last.remove(); recentTable.appendChild(rr);
    });
  }

  function openOrderDetail(order){
    currentOrder = order;
    let equipmentHtml = '';
    if(order.equipment){
      const eq = order.equipment;
      equipmentHtml = `<p><strong>Equipo:</strong> ${eq.type} - ${eq.brand} ${eq.model} (${eq.serial})</p>
        <p><strong>Área:</strong> ${eq.area} - <strong>No. Inventario:</strong> ${eq.inventory}</p>
        <p><strong>Proveedor:</strong> ${eq.provider || 'N/D'}</p>`;
    } else {
      equipmentHtml = `<p><strong>Equipo:</strong> ${order.eq}</p>`;
    }
    orderDetailContent.innerHTML = `<p><strong>Número:</strong> ${order.id}</p>
      ${equipmentHtml}
      <p><strong>Tipo:</strong> ${order.type}</p>
      <p><strong>Técnico:</strong> ${order.tech}</p>
      <p><strong>Fecha:</strong> ${order.date}</p>
      <p><strong>Estado:</strong> ${order.status}</p>
      <p><strong>Observaciones:</strong><br>${order.notes || ''}</p>`;
    modalDetail.classList.remove('hidden');
  }
  btnCloseDetail && btnCloseDetail.addEventListener('click', ()=> { modalDetail.classList.add('hidden'); currentOrder = null; });

  function openOrderEdit(order){
    currentOrder = order;
    formEdit.eq.value = order.eq;
    formEdit.tech.value = order.tech;
    formEdit.notes.value = order.notes || '';
    modalEdit.classList.remove('hidden');
  }
  cancelEdit && cancelEdit.addEventListener('click', ()=> modalEdit.classList.add('hidden'));
  formEdit && formEdit.addEventListener('submit', (e)=>{
    e.preventDefault();
    if(!currentOrder) return;
    const data = Object.fromEntries(new FormData(formEdit).entries());
    currentOrder.eq = data.eq; currentOrder.tech = data.tech; currentOrder.notes = data.notes;
    const eqObj = findEquipmentByRef(currentOrder.eq);
    currentOrder.equipment = eqObj || currentOrder.equipment || null;
    addHistoryEntry(extractSerialFromEq(currentOrder.eq), `Orden editada: ${currentOrder.id}`);
    persistAll(); modalEdit.classList.add('hidden'); renderOrders(); refreshAll();
  });

  btnCloseDownload && btnCloseDownload.addEventListener('click', async ()=>{
    if(!currentOrder) return;
    currentOrder.status = 'Cerrada';
    const serialForHistory = currentOrder.equipment ? currentOrder.equipment.serial : extractSerialFromEq(currentOrder.eq);
    addHistoryEntry(serialForHistory, `Orden cerrada: ${currentOrder.id}`);
    persistAll(); renderOrders();
    await generateOrderPDF(currentOrder);
    modalDetail.classList.add('hidden'); refreshAll();
  });

  /* PDF generation (logo + QR) */
  async function generateOrderPDF(order){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:'pt', format:'a4' });
    doc.setFillColor(10,68,136); doc.rect(0,0,595,60,'F');
    doc.setTextColor(255,255,255); doc.setFontSize(16);
    doc.text('Hospital Civil Nuevo de Guadalajara', 40, 28);
    doc.setFontSize(10); doc.text('Departamento de Ingeniería Biomédica - Mantenimiento Predictivo', 40, 44);

    // logo
    try {
      const resp = await fetch('assets/logo.png');
      if(resp.ok){
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        doc.addImage(url, 'PNG', 430, 8, 120, 44);
      }
    } catch(e){}

    // QR
    const qrText = `${order.id} | ${order.date}`;
    const qrUrl = `https://chart.googleapis.com/chart?chs=120x120&cht=qr&chl=${encodeURIComponent(qrText)}`;
    try{
      const qresp = await fetch(qrUrl);
      if(qresp.ok){
        const qblob = await qresp.blob();
        const qurl = URL.createObjectURL(qblob);
        doc.addImage(qurl, 'PNG', 450, 70, 100, 100);
      }
    } catch(e){}

    doc.setTextColor(20,20,20); doc.setFontSize(12);
    let y = 100;
    doc.text('ORDEN DE TRABAJO', 40, y); y+=18;
    doc.setFontSize(10);
    doc.text(`Número de orden: ${order.id}`, 40, y); y+=14;
    doc.text(`Fecha (registro/cierre): ${order.date}`, 40, y); y+=14;
    doc.text(`Técnico responsable: ${order.tech}`, 40, y); y+=18;

    // equipment (prefer order.equipment)
    let eq = order.equipment || findEquipmentByRef(order.eq) || null;
    const tableY = y + 6;
    doc.setFillColor(245,245,245); doc.rect(40, tableY - 8, 515, 70, 'F');
    doc.setTextColor(30,30,30);
    doc.text(`Tipo: ${eq ? eq.type : 'N/D'}`, 50, tableY);
    doc.text(`Marca: ${eq ? eq.brand : 'N/D'}`, 250, tableY);
    doc.text(`Modelo: ${eq ? eq.model : 'N/D'}`, 50, tableY+16);
    doc.text(`No. Serie: ${eq ? eq.serial : 'N/D'}`, 250, tableY+16);
    doc.text(`No. Inventario: ${eq ? eq.inventory : 'N/D'}`, 50, tableY+32);
    doc.text(`Área: ${eq ? eq.area : 'N/D'}`, 250, tableY+32);

    y = tableY + 90;
    doc.text('Tipo de mantenimiento:', 40, y); doc.text(order.type, 180, y); y+=18;
    doc.text('Observaciones:', 40, y); y+=12;
    const notes = order.notes || 'Sin observaciones';
    const wrapped = doc.splitTextToSize(notes, 500);
    doc.text(wrapped, 40, y); y += wrapped.length * 12 + 20;

    doc.text('__________________________', 60, y);
    doc.text('Firma del Técnico', 80, y + 16);
    doc.text('__________________________', 360, y);
    doc.text('Firma del Supervisor', 380, y + 16);
    doc.setFontSize(8); doc.setTextColor(120);
    doc.text('Generado por el Sistema de Mantenimiento Predictivo - Hospital Civil Nuevo de Guadalajara', 40, 780);

    doc.save(`${order.id}_OrdenTrabajo.pdf`);
  }

  /* ALERTS */
  function scheduleAlerts(){
    const msgs = [];
    const today = new Date();
    events.forEach(ev=>{
      const evDate = new Date(ev.date);
      const diff = Math.ceil((evDate - today) / (1000*60*60*24));
      if(diff <= 5 && diff > 1) msgs.push(`Mantenimiento próximo (${diff} días): ${ev.type} - ${ev.serial} (${ev.date})`);
      else if(diff === 1) msgs.push(`Mantenimiento mañana: ${ev.type} - ${ev.serial} (${ev.date})`);
      else if(diff < 0) msgs.push(`Mantenimiento vencido: ${ev.type} - ${ev.serial} (${ev.date})`);
    });
    const calView = document.getElementById('view-calendar');
    if(!calView) return;
    calView.querySelectorAll('.banner-alert').forEach(n=>n.remove());
    if(msgs.length){
      const b = document.createElement('div'); b.className='banner-alert';
      b.innerHTML = `<strong>Alertas:</strong><br>${msgs.slice(0,6).map(m=>`- ${m}`).join('<br>')}`;
      calView.insertBefore(b, calView.firstChild.nextSibling);
    }
  }

  /* REFRESH */
  function refreshAll(){
    renderInventory();
    renderOrders();
    renderCalendar();
    renderCalendarList();
    populateSelects();
    refreshCounters();
    scheduleAlerts();
  }
  function refreshCounters(){
    equipCount.textContent = inventory.length;
    maintCount.textContent = events.length;
    orderCount.textContent = orders.filter(o=> o.status !== 'Cerrada').length;
    outCount.textContent = inventory.filter(i=> i.status === 'Fuera de servicio').length;
  }

  /* INIT SAMPLE if empty */
  if(!inventory.length && !orders.length && !events.length){
    inventory.push({type:'Incubadora',brand:'BrandX',model:'IC-200',serial:'S12345',inventory:'INV-001',area:'Neonatos',status:'Operativo',frequency:3,provider:'Proveedor A',notes:'',critical:false,history:[]});
    inventory.push({type:'Ventilador',brand:'RespirTech',model:'V-9',serial:'V54321',inventory:'INV-002',area:'Neonatos',status:'Fuera de servicio',frequency:6,provider:'Proveedor B',notes:'',critical:true,history:[]});
    orders.push({id:'OT-1001',eq:'Incubadora (S12345)',equipment: findEquipmentByRef('S12345') || null, type:'Preventivo',tech:'Pedro M.',date:new Date().toISOString().slice(0,10),notes:'Revisión mensual',status:'Abierta'});
    events.push({id:'EV-001',date:new Date().toISOString().slice(0,10),serial:'S12345',type:'Preventivo',technician:'Pedro M.',priority:'normal',notes:'Recordatorio inicial'});
    persistAll();
  }

  /* LOGIN (validado + sesión persistente) */
  loginForm.addEventListener('submit', e=>{
    e.preventDefault();

    // recargar usuarios por si se registró alguien en otra pestaña
    try{
      const fresh = JSON.parse(localStorage.getItem(KEY_USERS) || '[]');
      if(Array.isArray(fresh) && fresh.length) allowedUsers = fresh;
    }catch(err){}

    const userInput = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    if(!userInput || !pass){ alert('Ingrese usuario y contraseña'); return; }

    const uLower = userInput.toLowerCase();
    const match = allowedUsers.find(u =>
      (String(u.username||'').toLowerCase() === uLower || String(u.email||'').toLowerCase() === uLower)
      && String(u.password||'') === pass
    );

    if(!match){
      alert('Usuario o contraseña incorrectos');
      return;
    }

    // guardar sesión persistente
    setSession({
      username: match.username,
      email: match.email || '',
      name: match.name || match.username,
      ts: Date.now()
    });

    // mantener compatibilidad con el key anterior (si algo lo usaba)
    localStorage.setItem(KEY_USER, JSON.stringify({ username: match.username, name: match.name }));

    enforceAuth();
  });

  /* NAV */
  function showView(name){
    views.forEach(v=> v.classList.add('hidden'));
    const el = document.getElementById('view-' + name);
    if(el) el.classList.remove('hidden');
    navItems.forEach(n=> n.classList.toggle('active', n.dataset.view === name));
    if(name === 'calendar'){ renderCalendar(); scheduleAlerts(); }
  }
  navItems.forEach(n=> n.addEventListener('click', ()=> showView(n.dataset.view)));
  toggleSidebar && toggleSidebar.addEventListener('click', ()=> {
    const sb = document.getElementById('sidebar');
    sb.style.display = (sb.style.display === 'none') ? 'flex' : 'none';
  });

  /* INITIAL auth check (sesión persistente) */
  enforceAuth();

  /* Abrir vista desde URL param: index.html?view=settings */
  const _urlParams = new URLSearchParams(window.location.search);
  const _viewParam = _urlParams.get("view");
  if (_viewParam) showView(_viewParam);

  // si el usuario intenta navegar "atrás", vuelve a validar sesión
  window.addEventListener('popstate', ()=>{
    enforceAuth();
  });

  /* Extra UI events */
  searchInput && searchInput.addEventListener('input', ()=> renderInventory(searchInput.value));

});

let currentDate = new Date(); 
let selectedDate = null;

// Render calendar
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    // Mostrar mes actual
    document.getElementById("currentMonth").textContent = `${monthNames[month]} ${year}`;

    // Primer día y número de días del mes
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const calendarGrid = document.getElementById("calendarGrid");
    if (!calendarGrid) return;

    calendarGrid.innerHTML = "";

    // Agregar celdas vacías antes del día 1
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement("div");
        emptyCell.classList.add("empty-cell");
        calendarGrid.appendChild(emptyCell);
    }

    // Crear los días del mes
    for (let day = 1; day <= totalDays; day++) {
        const cell = document.createElement("div");
        cell.classList.add("day-cell");
        cell.textContent = day;

        const dateString = `${year}-${month + 1}-${day}`;

        // Detectar si hay mantenimientos en este día
        const hasMaintenance = maintenanceEvents.some(ev => ev.date === dateString);

        if (hasMaintenance) {
            cell.classList.add("maintenance-day");
        }

        cell.addEventListener("click", () => {
            selectedDate = dateString;
            openAddMaintenanceModal(dateString);
        });

        calendarGrid.appendChild(cell);
    }
}


// Inicializar calendario al abrir la página
document.addEventListener("DOMContentLoaded", renderCalendar);



