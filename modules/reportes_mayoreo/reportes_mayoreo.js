// REPORTES MAYOREO

const elRepMayDesde = document.getElementById('repMayDesde');
const elRepMayHasta = document.getElementById('repMayHasta');
const elRepMayBtn = document.getElementById('repMayBtn');
const elRepMayBtnCsv = document.getElementById('repMayBtnCsv');
const elRepMayBtnPrint = document.getElementById('repMayBtnPrint');
const elRepMayOut = document.getElementById('repMayOut');

let lastRepMay = null;

function parseDateInput(v){
  if(!v) return null;
  const d = new Date(v+'T00:00:00');
  if(isNaN(d.getTime())) return null;
  return d;
}

function inRange(ts, desde, hasta){
  if(!desde && !hasta) return true;
  const d = new Date(ts);
  if(desde && d < desde) return false;
  if(hasta){
    // incluir todo el día
    const end = new Date(hasta.getTime());
    end.setHours(23,59,59,999);
    if(d > end) return false;
  }
  return true;
}

function buildMayoreoReport(desde, hasta){
  const ventas = (state.ventasMayoreo||[]).filter(t=>inRange(t.ts, desde, hasta));
  const tot = {
    tickets: ventas.length,
    subtotal: 0,
    desc: 0,
    iva: 0,
    total: 0,
    porCliente: {},
    porProducto: {},
    detalle: []
  };

  ventas.forEach(t=>{
    tot.subtotal += Number(t.subtotal||0);
    tot.desc += Number(t.descMonto||0);
    tot.iva += Number(t.ivaMonto||0);
    tot.total += Number(t.total||0);

    const cli = t.cliente || 'Sin cliente';
    tot.porCliente[cli] = (tot.porCliente[cli]||0) + Number(t.total||0);

    (t.items||[]).forEach(it=>{
      const key = `${it.sku||''} · ${it.nombre||''}`.trim();
      if(!tot.porProducto[key]) tot.porProducto[key] = {cant:0,total:0};
      tot.porProducto[key].cant += Number(it.cant||0);
      tot.porProducto[key].total += Number(it.cant||0) * Number(it.precio||0);
      tot.detalle.push({
        ticket: t.id,
        fecha: t.fechaTexto,
        cliente: t.cliente||'',
        tipoCliente: t.tipoCliente||'',
        descuento: Number(t.descPorc||0),
        sku: it.sku||'',
        producto: it.nombre||'',
        cant: Number(it.cant||0),
        precio: Number(it.precio||0),
        subtotal: Number(it.cant||0)*Number(it.precio||0),
        totalTicket: Number(t.total||0),
        pago: t.formaPago||''
      });
    });
  });

  return tot;
}

function renderReportSummaryMay(rep){
  if(!rep){ elRepMayOut.innerHTML = ''; return; }

  const topClientes = Object.entries(rep.porCliente)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,8);

  const topProductos = Object.entries(rep.porProducto)
    .sort((a,b)=>b[1].total-a[1].total)
    .slice(0,10);

  const html = [];
  html.push(`<div style="display:flex;gap:12px;flex-wrap:wrap;">`);
  html.push(`<div style="padding:10px;border:1px solid var(--border);border-radius:12px;min-width:200px;">
    <div style="font-size:12px;color:#64748b;">Tickets</div>
    <div style="font-size:18px;font-weight:700;">${rep.tickets}</div>
  </div>`);
  html.push(`<div style="padding:10px;border:1px solid var(--border);border-radius:12px;min-width:200px;">
    <div style="font-size:12px;color:#64748b;">Total</div>
    <div style="font-size:18px;font-weight:700;">${money(rep.total)}</div>
  </div>`);
  html.push(`<div style="padding:10px;border:1px solid var(--border);border-radius:12px;min-width:200px;">
    <div style="font-size:12px;color:#64748b;">Descuentos</div>
    <div style="font-size:18px;font-weight:700;">${money(rep.desc)}</div>
  </div>`);
  html.push(`</div>`);

  html.push(`<div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:12px;">`);

  html.push(`<div style="border:1px solid var(--border);border-radius:12px;padding:10px;">
    <div style="font-weight:700;margin-bottom:6px;">Top clientes</div>
    ${topClientes.length? topClientes.map(([n,v])=>`<div style="display:flex;justify-content:space-between;border-bottom:1px dashed #e5e7eb;padding:3px 0;"><span>${n}</span><strong>${money(v)}</strong></div>`).join('') : '<div style="color:#6b7280;font-size:13px;">Sin datos</div>'}
  </div>`);

  html.push(`<div style="border:1px solid var(--border);border-radius:12px;padding:10px;">
    <div style="font-weight:700;margin-bottom:6px;">Top productos</div>
    ${topProductos.length? topProductos.map(([k,obj])=>`<div style="display:flex;justify-content:space-between;border-bottom:1px dashed #e5e7eb;padding:3px 0;"><span>${k}<br><span style="color:#64748b;font-size:12px;">${obj.cant} pzas</span></span><strong>${money(obj.total)}</strong></div>`).join('') : '<div style="color:#6b7280;font-size:13px;">Sin datos</div>'}
  </div>`);

  html.push(`</div>`);

  elRepMayOut.innerHTML = html.join('');
}

function exportReportMayCsv(rep){
  if(!rep || !rep.detalle || !rep.detalle.length){
    alert('No hay datos para exportar.');
    return;
  }
  const header = ['Ticket','Fecha','Cliente','TipoCliente','Descuento(%)','SKU','Producto','Cantidad','Precio','Subtotal','TotalTicket','Pago'];
  const rows = rep.detalle.map(r=>[
    r.ticket,r.fecha,r.cliente,r.tipoCliente,r.descuento,r.sku,r.producto,r.cant,r.precio.toFixed(2),r.subtotal.toFixed(2),r.totalTicket.toFixed(2),r.pago
  ]);
  const csvLines = [
    header.join(','),
    ...rows.map(r=>r.map(v=>{
      const s = String(v ?? '');
      return '"'+s.replace(/"/g,'""')+'"';
    }).join(','))
  ];
  const blob = new Blob([csvLines.join('\n')],{type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url;
  a.download='reporte_mayoreo_detalle.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function printReportMay(rep, desde, hasta){
  if(!rep){ alert('Genera el reporte primero.'); return; }
  const rango = `${desde?desde.toISOString().slice(0,10):'...'} a ${hasta?hasta.toISOString().slice(0,10):'...'}`;
  const topClientes = Object.entries(rep.porCliente).sort((a,b)=>b[1]-a[1]).slice(0,12);
  const topProductos = Object.entries(rep.porProducto).sort((a,b)=>b[1].total-a[1].total).slice(0,15);

  let html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reporte Mayoreo</title>
  <style>
  @page { size: A4; margin: 12mm; }
  body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:11px;color:#111827;}
  h1{font-size:16px;margin:0 0 6px 0;}
  .muted{color:#64748b;}
  table{width:100%;border-collapse:collapse;}
  th,td{border:1px solid #e5e7eb;padding:4px 6px;text-align:left;}
  th{background:#f3f4f6;}
  </style>
  </head><body>
  <h1>Reporte Mayoreo - ${state.config.negocio||'Farmacia DP'}</h1>
  <div class="muted">Rango: ${rango}</div>
  <p><strong>Tickets:</strong> ${rep.tickets} &nbsp; <strong>Total:</strong> ${money(rep.total)} &nbsp; <strong>Descuentos:</strong> ${money(rep.desc)}</p>

  <h2 style="font-size:13px;">Top clientes</h2>
  <table><thead><tr><th>Cliente</th><th>Total</th></tr></thead><tbody>
  ${topClientes.map(([n,v])=>`<tr><td>${n}</td><td>${money(v)}</td></tr>`).join('')}
  </tbody></table>

  <h2 style="font-size:13px;margin-top:12px;">Top productos</h2>
  <table><thead><tr><th>Producto</th><th>Pzas</th><th>Total</th></tr></thead><tbody>
  ${topProductos.map(([k,obj])=>`<tr><td>${k}</td><td>${obj.cant}</td><td>${money(obj.total)}</td></tr>`).join('')}
  </tbody></table>

  <script>window.onload=function(){window.print();setTimeout(()=>window.close(),600)};<\/script>
  </body></html>`;

  const w = window.open('','repMay','width=900,height=700');
  if(!w){ alert('No se pudo abrir ventana de impresión. Revisa bloqueador de popups.'); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function renderReportesMayoreo(){
  // Valores por defecto: este mes
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth()+1, 0);
  if(!elRepMayDesde.value) elRepMayDesde.value = start.toISOString().slice(0,10);
  if(!elRepMayHasta.value) elRepMayHasta.value = end.toISOString().slice(0,10);
  // Si ya se generó algo, mostrar
  if(lastRepMay) renderReportSummaryMay(lastRepMay);
}

elRepMayBtn.addEventListener('click',()=>{
  const desde = parseDateInput(elRepMayDesde.value);
  const hasta = parseDateInput(elRepMayHasta.value);
  lastRepMay = buildMayoreoReport(desde, hasta);
  renderReportSummaryMay(lastRepMay);
});

elRepMayBtnCsv.addEventListener('click',()=>exportReportMayCsv(lastRepMay));

elRepMayBtnPrint.addEventListener('click',()=>{
  const desde = parseDateInput(elRepMayDesde.value);
  const hasta = parseDateInput(elRepMayHasta.value);
  printReportMay(lastRepMay, desde, hasta);
});

// Auto render si el módulo ya está visible en carga
try{ if(document.getElementById('page-reportes_mayoreo')?.classList.contains('active')) renderReportesMayoreo(); }catch(e){}
