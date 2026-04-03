// CLIENTES MAYOREO V1
const elCliMayNombre = document.getElementById('cliMayNombre');
const elCliMayTel = document.getElementById('cliMayTel');
const elCliMayCorreo = document.getElementById('cliMayCorreo');
const elCliMayTipo = document.getElementById('cliMayTipo');
const elCliMayDesc = document.getElementById('cliMayDesc');
const elCliMayNotas = document.getElementById('cliMayNotas');
const elBtnAgregarClienteMay = document.getElementById('btnAgregarClienteMay');
const elListaClientesMay = document.getElementById('listaClientesMay');
const elCliMaySearch = document.getElementById('cliMaySearch');
const elCliMayStatTotal = document.getElementById('cliMayStatTotal');
const elCliMayStatDesc = document.getElementById('cliMayStatDesc');
const elCliMayStatTickets = document.getElementById('cliMayStatTickets');

function getClientesMayoreoList(){
  return (state.clientes || []).map((c,idx)=>({idx, ...c})).filter(c => String(c.tipo || '').toLowerCase().startsWith('mayoreo'));
}
function resetClienteMayForm(){
  if(elCliMayNombre) elCliMayNombre.value = '';
  if(elCliMayTel) elCliMayTel.value = '';
  if(elCliMayCorreo) elCliMayCorreo.value = '';
  if(elCliMayTipo) elCliMayTipo.value = 'Mayoreo A';
  if(elCliMayDesc) elCliMayDesc.value = 0;
  if(elCliMayNotas) elCliMayNotas.value = '';
}
function renderClientesMayoreo(){
  if(!elListaClientesMay) return;
  const all = getClientesMayoreoList();
  const q = (elCliMaySearch?.value || '').trim().toLowerCase();
  const rows = all.filter(c => [c.nombre,c.telefono,c.correo,c.tipo,c.notas].filter(Boolean).join(' ').toLowerCase().includes(q));

  const promedioDesc = all.length ? (all.reduce((a,c)=>a + Number(c.descMayoreo || 0), 0) / all.length) : 0;
  const ticketsMay = Array.isArray(state.ventasMayoreo) ? state.ventasMayoreo.length : 0;
  if(elCliMayStatTotal) elCliMayStatTotal.textContent = String(all.length);
  if(elCliMayStatDesc) elCliMayStatDesc.textContent = `${promedioDesc.toFixed(1)}%`;
  if(elCliMayStatTickets) elCliMayStatTickets.textContent = String(ticketsMay);

  if(!rows.length){
    elListaClientesMay.innerHTML = '<div class="list-empty" style="padding:14px;">Sin clientes mayoreo registrados.</div>';
    return;
  }

  elListaClientesMay.innerHTML = rows.map(c=>`
    <div class="cliente-may-card">
      <div class="cliente-may-main">
        <div class="cliente-may-title">${c.nombre}</div>
        <div class="cliente-may-sub">${c.tipo || 'Mayoreo'} · ${c.telefono || 'sin teléfono'}${c.correo ? ' · ' + c.correo : ''}</div>
        <div class="cliente-may-notes">${c.notas || 'Sin notas guardadas.'}</div>
      </div>
      <div class="cliente-may-side">
        <span class="pill soft-purple">${Number(c.descMayoreo || 0)}%</span>
        <button class="btn btn-outline btn-delete-clientemay" data-idx="${c.idx}">Eliminar</button>
      </div>
    </div>
  `).join('');

  elListaClientesMay.querySelectorAll('.btn-delete-clientemay').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const idx = Number(btn.dataset.idx);
      state.clientes.splice(idx, 1);
      saveState();
      if(typeof renderClientes === 'function') renderClientes();
      renderClientesMayoreo();
      if(typeof renderDashboardMayoreo === 'function') renderDashboardMayoreo();
    });
  });
}

if(elBtnAgregarClienteMay){
  elBtnAgregarClienteMay.addEventListener('click',()=>{
    const nombre = (elCliMayNombre?.value || '').trim();
    if(!nombre){ alert('Nombre o razón social es obligatorio.'); return; }
    const nuevo = {
      nombre,
      telefono: (elCliMayTel?.value || '').trim(),
      correo: (elCliMayCorreo?.value || '').trim(),
      tipo: (elCliMayTipo?.value || 'Mayoreo A'),
      descMayoreo: Number(elCliMayDesc?.value || 0) || 0,
      notas: (elCliMayNotas?.value || '').trim()
    };
    state.clientes.push(nuevo);
    saveState();
    resetClienteMayForm();
    if(typeof renderClientes === 'function') renderClientes();
    renderClientesMayoreo();
    if(typeof renderDashboardMayoreo === 'function') renderDashboardMayoreo();
  });
}
if(elCliMaySearch){
  elCliMaySearch.addEventListener('input', renderClientesMayoreo);
}
try{ renderClientesMayoreo(); }catch(e){}
