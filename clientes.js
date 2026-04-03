// CLIENTES
// ---------------------------
const elCliNombre = document.getElementById('cliNombre');
const elCliTel = document.getElementById('cliTel');
const elCliCorreo = document.getElementById('cliCorreo');
const elCliTipo = document.getElementById('cliTipo');
const elCliDescMay = document.getElementById('cliDescMay');
const elBtnAgregarCliente = document.getElementById('btnAgregarCliente');
const elListaClientes = document.getElementById('listaClientes');

function deleteClienteAt(i){
  state.clientes.splice(i,1);
  saveState();
  renderClientes();
  if(typeof renderClientesMayoreo==='function') renderClientesMayoreo();
  if(typeof renderDashboardMayoreo==='function') renderDashboardMayoreo();
}
function renderClientes(){
  if(!elListaClientes) return;
  elListaClientes.innerHTML='';
  if(!state.clientes.length){
    elListaClientes.innerHTML='<div class="list-empty" style="padding:10px 0;">Sin clientes registrados.</div>';
  }else{
    state.clientes.forEach((c,idx)=>{
      const row=document.createElement('div');
      row.className = 'cliente-row-general';
      const tipo = c.tipo || 'Minorista';
      const dmay = Number(c.descMayoreo||0) || 0;
      row.innerHTML = `
        <div>
          <div class="list-main">${c.nombre}</div>
          <div class="list-sub">${c.telefono || 'sin teléfono'}${c.correo ? ' · ' + c.correo : ''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span class="pill ${tipo.startsWith('Mayoreo') ? 'soft-purple' : 'soft-blue'}">${tipo}${tipo.startsWith('Mayoreo') ? ` · ${dmay}%` : ''}</span>
          <button data-idx="${idx}" class="btn btn-outline" style="padding:6px 10px;font-size:12px;">Eliminar</button>
        </div>`;
      elListaClientes.appendChild(row);
    });
    elListaClientes.querySelectorAll('button[data-idx]').forEach(btn=>{
      btn.addEventListener('click',()=>deleteClienteAt(Number(btn.dataset.idx)));
    });
  }
  fillClientesSelect();
  if(typeof fillClientesSelectMay==='function') fillClientesSelectMay();
}
function fillClientesSelect(){
  if(!elClienteSelect) return;
  elClienteSelect.innerHTML='<option value="">Sin cliente</option>';
  state.clientes.forEach(c=>{
    const opt=document.createElement('option');
    opt.value=c.nombre;opt.textContent=`${c.nombre} · ${c.tipo || 'Minorista'}`;
    elClienteSelect.appendChild(opt);
  });
}
if(elBtnAgregarCliente){
  elBtnAgregarCliente.addEventListener('click',()=>{
    const nombre=elCliNombre.value.trim();
    if(!nombre){alert('Nombre es obligatorio');return;}
    const tipo = (elCliTipo && elCliTipo.value) ? elCliTipo.value : 'Minorista';
    const descMayoreo = Number(elCliDescMay ? elCliDescMay.value : 0) || 0;
    state.clientes.push({nombre,telefono:elCliTel.value.trim(),correo:elCliCorreo.value.trim(),tipo,descMayoreo});
    elCliNombre.value='';elCliTel.value='';elCliCorreo.value='';
    if(elCliTipo) elCliTipo.value = 'Minorista';
    if(elCliDescMay) elCliDescMay.value = 0;
    saveState();
    renderClientes();
    if(typeof renderClientesMayoreo==='function') renderClientesMayoreo();
    if(typeof renderDashboardMayoreo==='function') renderDashboardMayoreo();
  });
}

// ---------------------------
