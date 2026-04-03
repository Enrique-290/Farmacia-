// VENTAS MAYOREO
// Mayoreo por piezas + descuento por tipo de cliente

const elSearchMay = document.getElementById('searchMay');
const elScanMay = document.getElementById('scanMay');
const elBtnClearMay = document.getElementById('btnClearMay');
const elBtnDemoInvMay = document.getElementById('btnDemoInvMay');
const elProductosGridMay = document.getElementById('productosGridMay');
const elProductosEmptyMay = document.getElementById('productosEmptyMay');

const elClienteSelectMay = document.getElementById('clienteSelectMay');
const elClienteInfoMay = document.getElementById('clienteInfoMay');
const elDescPorcMay = document.getElementById('descPorcMay');
const elIvaPorcMay = document.getElementById('ivaPorcMay');
const elFormaPagoMay = document.getElementById('formaPagoMay');
const elBtnVaciarMay = document.getElementById('btnVaciarMay');
const elBtnCobrarMay = document.getElementById('btnCobrarMay');

const elTablaCarritoBodyMay = document.getElementById('tablaCarritoBodyMay');
const elLblSubtotalMay = document.getElementById('lblSubtotalMay');
const elLblDescMay = document.getElementById('lblDescMay');
const elLblIvaMay = document.getElementById('lblIvaMay');
const elLblTotalMay = document.getElementById('lblTotalMay');
const elTicketPreviewMay = document.getElementById('ticketPreviewMay');

let CART_MAY = [];
let currentFilterMay = '';

function fillClientesSelectMay(){
  if(!elClienteSelectMay) return;
  elClienteSelectMay.innerHTML = '<option value="">Selecciona cliente</option>';
  const clientesMay = (state.clientes || []).filter(c => String(c.tipo || '').toLowerCase().startsWith('mayoreo'));
  clientesMay.forEach(c=>{
    const tipo = c.tipo || 'Mayoreo';
    const dmay = Number(c.descMayoreo||0) || 0;
    const opt = document.createElement('option');
    opt.value = c.nombre;
    opt.textContent = `${c.nombre} · ${tipo} · ${dmay}%`;
    opt.dataset.tipo = tipo;
    opt.dataset.desc = String(dmay);
    elClienteSelectMay.appendChild(opt);
  });
  if(!clientesMay.length && elClienteInfoMay){
    elClienteInfoMay.textContent = 'Primero crea clientes en el módulo Clientes mayoreo.';
  }
}

function getSelectedClienteMay(){
  const name = (elClienteSelectMay && elClienteSelectMay.value) ? elClienteSelectMay.value : '';
  if(!name) return null;
  return state.clientes.find(c=>c.nombre===name) || null;
}

function syncDescuentoFromCliente(){
  const c = getSelectedClienteMay();
  if(!c){
    if(elClienteInfoMay) elClienteInfoMay.textContent = 'Selecciona un cliente mayoreo para aplicar descuento.';
    return;
  }
  const tipo = c.tipo || 'Minorista';
  const dmay = Number(c.descMayoreo||0) || 0;
  if(elClienteInfoMay){
    elClienteInfoMay.textContent = `${tipo}${tipo.startsWith('Mayoreo') ? ` · Descuento sugerido: ${dmay}%` : ''}`;
  }
  // Solo auto-aplica si el usuario no cambió manualmente (o si está en 0)
  const actual = Number(elDescPorcMay ? elDescPorcMay.value : 0) || 0;
  if(actual===0 && dmay>0 && elDescPorcMay){
    elDescPorcMay.value = dmay;
  }
}

function renderCatalogMay(filter=''){
  currentFilterMay = filter;
  if(!elProductosGridMay) return;
  const q = (filter||'').toLowerCase().trim();
  const items = state.inventario.filter(p=>{
    const hay = `${p.nombre||''} ${p.sku||''}`.toLowerCase();
    return !q || hay.includes(q);
  });

  elProductosGridMay.innerHTML='';
  if(!items.length){
    elProductosEmptyMay.style.display = state.inventario.length ? 'block' : 'block';
  } else {
    elProductosEmptyMay.style.display = 'none';
  }

  items.forEach(p=>{
    const card = document.createElement('div');
    card.className = 'producto-card';
    const stock = Number(p.stockPiso ?? p.stock ?? 0) || 0;
    const img = p.imagen ? `<img src="${p.imagen}" alt="">` : '💊';
    card.innerHTML = `
      <div class="producto-img">${img}</div>
      <div class="producto-info">
        <div class="producto-nombre">${p.nombre}</div>
        <div class="producto-meta">SKU: <strong>${p.sku||''}</strong> · Stock piso: <strong>${stock}</strong></div>
        <div class="producto-precio">${money(p.precio)}</div>
        <button class="btn btn-primary" style="width:100%;margin-top:8px;" data-id="${p.id}">Agregar</button>
      </div>
    `;
    elProductosGridMay.appendChild(card);
  });

  elProductosGridMay.querySelectorAll('button[data-id]').forEach(btn=>{
    btn.addEventListener('click',()=>addToCartMay(btn.dataset.id));
  });
}

function addToCartMay(prodId){
  const prod = state.inventario.find(p=>p.id===prodId);
  if(!prod) return;
  const item = CART_MAY.find(i=>i.id===prodId);
  if(item){ item.cant += 1; }
  else { CART_MAY.push({id:prodId, cant:1}); }
  paintCartMay();
}

function setCantMay(prodId, cant){
  const item = CART_MAY.find(i=>i.id===prodId);
  if(!item) return;
  item.cant = Math.max(1, Number(cant)||1);
  paintCartMay();
}

function removeFromCartMay(prodId){
  CART_MAY = CART_MAY.filter(i=>i.id!==prodId);
  paintCartMay();
}

function buildTicketMayObject(){
  const now = new Date();
  const id = 'M'+now.getTime();
  const clienteObj = getSelectedClienteMay();
  const cliente = clienteObj ? clienteObj.nombre : '';
  const tipoCliente = clienteObj ? (clienteObj.tipo||'') : '';

  const descPorc = Number(elDescPorcMay ? elDescPorcMay.value : 0) || 0;
  const ivaPorc = Number(elIvaPorcMay ? elIvaPorcMay.value : 0) || 0;

  const items = CART_MAY.map(i=>{
    const p = state.inventario.find(pp=>pp.id===i.id);
    return {
      id:i.id,
      sku:p?.sku||'',
      nombre:p?.nombre||'',
      cant:i.cant,
      precio:Number(p?.precio||0)
    };
  });

  const subtotal = items.reduce((a,it)=>a + (it.cant*it.precio), 0);
  const descMonto = subtotal * (descPorc/100);
  const base = Math.max(0, subtotal - descMonto);
  const ivaMonto = base * (ivaPorc/100);
  const total = base + ivaMonto;

  return {
    canal: 'Mayoreo',
    negocio: state.config.negocio || 'Farmacia DP',
    id,
    fecha: now.toISOString(),
    fechaTexto: now.toLocaleString(),
    cliente,
    tipoCliente,
    descPorc,
    descMonto,
    ivaPorc,
    ivaMonto,
    subtotal,
    total,
    formaPago: elFormaPagoMay ? elFormaPagoMay.value : 'Efectivo',
    items,
    mensajeFinal: state.config.mensajeTicket || '¡Gracias por su compra!'
  };
}

function buildTicketMayText(ticket){
  const lines=[];
  lines.push(ticket.negocio);
  lines.push('*** MAYOREO ***');
  lines.push('----------------------------------------');
  lines.push('Ticket: '+ticket.id);
  lines.push('Fecha: '+ticket.fechaTexto);
  if(ticket.cliente){
    lines.push('Cliente: '+ticket.cliente);
    if(ticket.tipoCliente) lines.push('Tipo: '+ticket.tipoCliente);
  }
  lines.push('----------------------------------------');
  ticket.items.forEach(it=>{
    lines.push(`${it.nombre}`);
    lines.push(`  ${it.cant} x ${money(it.precio)} = ${money(it.cant*it.precio)}`);
  });
  lines.push('----------------------------------------');
  lines.push('Subtotal: '+money(ticket.subtotal));
  lines.push(`Descuento (${ticket.descPorc}%): `+money(ticket.descMonto));
  if(ticket.ivaPorc>0){lines.push(`IVA (${ticket.ivaPorc}%): ${money(ticket.ivaMonto)}`);}
  lines.push('TOTAL:   '+money(ticket.total));
  lines.push('Pago: '+ticket.formaPago);
  lines.push('----------------------------------------');
  lines.push(ticket.mensajeFinal);
  return lines.join('\n');
}

function paintTicketPreviewMay(){
  if(!elTicketPreviewMay) return;
  if(!CART_MAY.length){ elTicketPreviewMay.textContent='(Vacío)'; return; }
  elTicketPreviewMay.textContent = buildTicketMayText(buildTicketMayObject());
}

function paintTotalsMay(){
  const t = buildTicketMayObject();
  if(elLblSubtotalMay) elLblSubtotalMay.textContent = money(t.subtotal);
  if(elLblDescMay) elLblDescMay.textContent = money(t.descMonto);
  if(elLblIvaMay) elLblIvaMay.textContent = money(t.ivaMonto);
  if(elLblTotalMay) elLblTotalMay.textContent = money(t.total);
  paintTicketPreviewMay();
}

function paintCartMay(){
  if(!elTablaCarritoBodyMay) return;
  elTablaCarritoBodyMay.innerHTML='';
  CART_MAY.forEach(item=>{
    const p = state.inventario.find(pp=>pp.id===item.id);
    const nombre = p?.nombre || item.id;
    const precio = Number(p?.precio||0);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${nombre}</td>
      <td><input class="input" style="width:70px;padding:6px;" type="number" min="1" step="1" value="${item.cant}" data-qty="${item.id}"></td>
      <td>${money(precio)}</td>
      <td>${money(precio*item.cant)}</td>
      <td><button class="btn btn-outline" style="padding:2px 8px;" data-del="${item.id}">✕</button></td>
    `;
    elTablaCarritoBodyMay.appendChild(tr);
  });

  elTablaCarritoBodyMay.querySelectorAll('input[data-qty]').forEach(inp=>{
    inp.addEventListener('change',()=>setCantMay(inp.dataset.qty, inp.value));
  });
  elTablaCarritoBodyMay.querySelectorAll('button[data-del]').forEach(btn=>{
    btn.addEventListener('click',()=>removeFromCartMay(btn.dataset.del));
  });

  paintTotalsMay();
}

function printTicketMay(ticket){
  const text = buildTicketMayText(ticket);
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>${ticket.negocio} - ${ticket.id}</title>
<style>
@page { size: 58mm auto; margin: 4mm; }
body{font-family:"Consolas","SF Mono",ui-monospace,monospace;font-size:11px;margin:0;padding:0;}
pre{white-space:pre-wrap;}
</style>
</head><body>
<pre>${text}</pre>
<script>
window.onload = function(){ window.print(); setTimeout(function(){ window.close(); }, 500); };
<\/script>
</body></html>`;
  const w = window.open('','ticket_may','width=380,height=600');
  if(!w){alert('No se pudo abrir ventana de impresión. Revisa bloqueador de popups.');return;}
  w.document.open();w.document.write(html);w.document.close();
}

function registrarMovMayoreo(mov){
  if(!Array.isArray(state.movMayoreo)) state.movMayoreo = [];
  state.movMayoreo.push(mov);
  if(!Array.isArray(state.movimientos)) state.movimientos = [];
  state.movimientos.push(mov);
}

// Eventos
if(elSearchMay){
  elSearchMay.addEventListener('input',()=>renderCatalogMay(elSearchMay.value));
}
if(elScanMay){
  elScanMay.addEventListener('keydown',e=>{
    if(e.key==='Enter'){
      const code = elScanMay.value.trim();
      if(!code) return;
      const prod = state.inventario.find(p=>(p.sku||'').toLowerCase()===code.toLowerCase());
      if(prod){ addToCartMay(prod.id); } else { alert('SKU no encontrado: '+code); }
      elScanMay.value='';
      setTimeout(()=>elScanMay.focus(),0);
    }
  });
}
if(elBtnClearMay){
  elBtnClearMay.addEventListener('click',()=>{
    if(elSearchMay) elSearchMay.value='';
    if(elScanMay) elScanMay.value='';
    renderCatalogMay('');
  });
}
if(elBtnDemoInvMay){
  elBtnDemoInvMay.addEventListener('click',()=>{
    ensureDemoInventory();
    saveState();
    renderCatalogMay(elSearchMay ? elSearchMay.value : '');
    alert('Inventario demo cargado.');
  });
}
if(elBtnVaciarMay){
  elBtnVaciarMay.addEventListener('click',()=>{ CART_MAY=[]; paintCartMay(); });
}

[elDescPorcMay, elIvaPorcMay, elFormaPagoMay, elClienteSelectMay].forEach(ctrl=>{
  if(!ctrl) return;
  ctrl.addEventListener('input',()=>{ if(ctrl===elClienteSelectMay) syncDescuentoFromCliente(); paintTotalsMay(); });
  ctrl.addEventListener('change',()=>{ if(ctrl===elClienteSelectMay) syncDescuentoFromCliente(); paintTotalsMay(); });
});

if(elBtnCobrarMay){
  elBtnCobrarMay.addEventListener('click',()=>{
    if(!CART_MAY.length){alert('Carrito vacío.');return;}
    const clienteObj = getSelectedClienteMay();
    if(!clienteObj){
      alert('En mayoreo es obligatorio seleccionar cliente.');
      return;
    }
    const ticket = buildTicketMayObject();

    // Descontar stock (piso)
    CART_MAY.forEach(item=>{
      const prod = state.inventario.find(p=>p.id===item.id);
      if(prod){
        const actual = Number(prod.stockPiso || prod.stock || 0);
        let nuevo = actual - item.cant;
        if(nuevo<0) nuevo=0;
        prod.stockPiso = nuevo;
      }
    });

    // Registrar movimientos
    registrarMovMayoreo({
      ts: Date.now(),
      fecha: new Date().toISOString(),
      canal: 'Mayoreo',
      tipo: 'Salida',
      ref: ticket.id,
      cliente: ticket.cliente,
      items: ticket.items.map(i=>({sku:i.sku,nombre:i.nombre,cant:i.cant,precio:i.precio}))
    });

    if(!Array.isArray(state.ventasMayoreo)) state.ventasMayoreo = [];
    state.ventasMayoreo.push(ticket);

    saveState();
    printTicketMay(ticket);

    CART_MAY=[];
    if(elDescPorcMay) elDescPorcMay.value = 0;
    if(elClienteSelectMay) elClienteSelectMay.value = '';
    if(elIvaPorcMay) elIvaPorcMay.value = state.config.ivaDefault || 0;
    paintCartMay();

    // Refrescar módulos relacionados
    renderCatalogMay(currentFilterMay);
    if(typeof renderDashboard==='function') renderDashboard();
    if(typeof renderDashboardMayoreo==='function') renderDashboardMayoreo();
    if(typeof renderClientesMayoreo==='function') renderClientesMayoreo();
    if(typeof renderHistorialMayoreo==='function') renderHistorialMayoreo();
    if(typeof renderReportesMayoreo==='function') renderReportesMayoreo();
    if(typeof renderInventarioMayoreo==='function') renderInventarioMayoreo();
    if(typeof renderInventario==='function') renderInventario();
    if(typeof renderBodega==='function') renderBodega();
  });
}

// Init defaults
(function initVentasMayoreo(){
  if(elIvaPorcMay) elIvaPorcMay.value = state.config.ivaDefault || 0;
  fillClientesSelectMay();
  syncDescuentoFromCliente();
})();

