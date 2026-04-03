// DASHBOARD V1
const elDashKpis = document.getElementById('dashKpis');
const elChart7dias = document.getElementById('chart7dias');
const elChartPagos = document.getElementById('chartPagos');
const elLegendPagos = document.getElementById('legendPagos');
const elListaUltimasVentas = document.getElementById('listaUltimasVentas');
const elListaKardex = document.getElementById('listaKardex');
const elDashTopProductos = document.getElementById('dashTopProductos');
const elDashLowStock = document.getElementById('dashLowStock');
const elDashHeroPills = document.getElementById('dashHeroPills');
const elDashHeroMetrics = document.getElementById('dashHeroMetrics');

function safeDate(v){
  const d = new Date(v || Date.now());
  return isNaN(d.getTime()) ? new Date() : d;
}
function sameDayDash(a,b){
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function formatDayLabel(d){
  return d.toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit'});
}
function inLastDays(d, days){
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - (days-1));
  return d >= start;
}
function listLightHTML(items, emptyText){
  if(!items.length) return `<div class="list-empty">${emptyText}</div>`;
  return items.map(item => `
    <div class="list-row">
      <div>
        <div class="list-main">${item.title}</div>
        <div class="list-sub">${item.sub || ''}</div>
      </div>
      <div class="list-right">${item.right || ''}</div>
    </div>
  `).join('');
}
function paymentSummary(tickets, onlyToday=false){
  const now = new Date();
  const map = {Efectivo:0, Tarjeta:0, Transferencia:0, Mixto:0, Otros:0};
  tickets.forEach(t=>{
    const d = safeDate(t.ts || t.fechaISO || t.fecha);
    if(onlyToday && !sameDayDash(d, now)) return;
    const keyRaw = (t.formaPago || 'Otros').toLowerCase();
    let key = 'Otros';
    if(keyRaw.includes('efec')) key = 'Efectivo';
    else if(keyRaw.includes('tar')) key = 'Tarjeta';
    else if(keyRaw.includes('trans')) key = 'Transferencia';
    else if(keyRaw.includes('mixto')) key = 'Mixto';
    map[key] += Number(t.total || 0);
  });
  return map;
}
function renderBars(el, rows){
  if(!el) return;
  const max = Math.max(...rows.map(r=>r.total), 0);
  if(!max){
    el.innerHTML = `<div class="chart-empty">Sin movimientos suficientes.</div>`;
    return;
  }
  el.innerHTML = rows.map(r=>`
    <div class="bar-row">
      <span class="bar-label">${r.label}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(4,(r.total/max)*100)}%;"></div></div>
      <span class="bar-value">${money(r.total)}</span>
    </div>
  `).join('');
}
function renderPaymentBox(elBox, elLegend, payments){
  if(!elBox || !elLegend) return;
  const total = Object.values(payments).reduce((a,b)=>a+b,0);
  if(!total){
    elBox.innerHTML = `<div class="chart-empty">Sin ventas hoy.</div>`;
    elLegend.innerHTML = '';
    return;
  }
  const entries = Object.entries(payments).filter(([,v])=>v>0);
  elBox.innerHTML = `<div class="donut-text">${
    entries.map(([label,val])=>`<div class="donut-item"><span>${label}</span><strong>${Math.round((val/total)*100)}%</strong></div>`).join('')
  }</div>`;
  const clsMap = {Efectivo:'efectivo', Tarjeta:'tarjeta', Transferencia:'transfer', Mixto:'otros', Otros:'otros'};
  elLegend.innerHTML = entries.map(([label,val])=>`<span class="donut-legend-item"><span class="donut-dot ${clsMap[label]||'otros'}"></span>${label}: ${money(val)}</span>`).join('');
}
function buildLast7DaysRows(tickets){
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate()-6);
  const rows = [];
  for(let i=0;i<7;i++){
    const d = new Date(start);
    d.setDate(start.getDate()+i);
    const total = tickets
      .filter(t => sameDayDash(safeDate(t.ts || t.fechaISO || t.fecha), d))
      .reduce((a,t)=>a + Number(t.total || 0), 0);
    rows.push({label:formatDayLabel(d), total});
  }
  return rows;
}
function computeTopProducts(tickets, take=5){
  const map = {};
  tickets.forEach(t=>{
    (t.items || []).forEach(it=>{
      const key = `${it.nombre || 'Producto'}|${it.sku || ''}`;
      if(!map[key]) map[key] = {nombre: it.nombre || 'Producto', sku: it.sku || '', piezas:0, total:0};
      map[key].piezas += Number(it.cant || 0);
      map[key].total += Number(it.cant || 0) * Number(it.precio || 0);
    });
  });
  return Object.values(map).sort((a,b)=>b.piezas-a.piezas || b.total-a.total).slice(0,take);
}

function renderDashboard(){
  const tickets = Array.isArray(state.ventas) ? state.ventas.slice() : [];
  const inventario = Array.isArray(state.inventario) ? state.inventario : [];
  const now = new Date();

  const ventasHoy = tickets.filter(t => sameDayDash(safeDate(t.ts || t.fechaISO || t.fecha), now));
  const ventasMes = tickets.filter(t => {
    const d = safeDate(t.ts || t.fechaISO || t.fecha);
    return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
  });

  const totalHoy = ventasHoy.reduce((a,t)=>a + Number(t.total || 0), 0);
  const totalMes = ventasMes.reduce((a,t)=>a + Number(t.total || 0), 0);
  const totalHistorico = tickets.reduce((a,t)=>a + Number(t.total || 0), 0);
  const ticketProm = tickets.length ? totalHistorico / tickets.length : 0;
  const productosActivos = inventario.filter(p => Number(p.stockPiso ?? p.stock ?? 0) > 0).length;
  const stockTotal = inventario.reduce((a,p)=>a + Number(p.stockPiso ?? p.stock ?? 0), 0);
  const lowStock = inventario
    .filter(p => Number(p.stockPiso ?? p.stock ?? 0) <= Number(p.stockMin ?? 0))
    .sort((a,b)=>(Number(a.stockPiso ?? a.stock ?? 0) - Number(b.stockPiso ?? b.stock ?? 0)));

  if(elDashHeroPills){
    elDashHeroPills.innerHTML = `
      <span class="pill soft-blue">${inventario.length} productos</span>
      <span class="pill soft-green">${tickets.length} tickets</span>
      <span class="pill soft-amber">${lowStock.length} alertas stock</span>
    `;
  }
  if(elDashHeroMetrics){
    elDashHeroMetrics.innerHTML = `
      <div class="metric-card">
        <span>Venta de hoy</span>
        <strong>${money(totalHoy)}</strong>
      </div>
      <div class="metric-card">
        <span>Stock en piso</span>
        <strong>${stockTotal} pzas</strong>
      </div>
      <div class="metric-card">
        <span>Ticket promedio</span>
        <strong>${money(ticketProm)}</strong>
      </div>
    `;
  }

  if(elDashKpis){
    elDashKpis.innerHTML = `
      <div class="kpi-card kpi-card-blue">
        <div class="kpi-label">VENTAS HOY</div>
        <div class="kpi-value">${money(totalHoy)}</div>
        <div class="kpi-extra">${ventasHoy.length} tickets cobrados</div>
      </div>
      <div class="kpi-card kpi-card-indigo">
        <div class="kpi-label">VENTAS DEL MES</div>
        <div class="kpi-value">${money(totalMes)}</div>
        <div class="kpi-extra">${ventasMes.length} tickets del mes</div>
      </div>
      <div class="kpi-card kpi-card-green">
        <div class="kpi-label">PRODUCTOS ACTIVOS</div>
        <div class="kpi-value">${productosActivos}</div>
        <div class="kpi-extra">${inventario.length} registrados</div>
      </div>
      <div class="kpi-card kpi-card-dark">
        <div class="kpi-label">HISTÓRICO GENERAL</div>
        <div class="kpi-value">${money(totalHistorico)}</div>
        <div class="kpi-extra">${tickets.length} tickets acumulados</div>
      </div>
    `;
  }

  renderBars(elChart7dias, buildLast7DaysRows(tickets));
  renderPaymentBox(elChartPagos, elLegendPagos, paymentSummary(tickets, true));

  const ultimas = tickets.slice().sort((a,b)=>safeDate(b.ts || b.fechaISO || b.fecha) - safeDate(a.ts || a.fechaISO || a.fecha)).slice(0,6)
    .map(t=>({
      title: `${t.id || 'Ticket'} · ${money(t.total || 0)}`,
      sub: `${t.cliente || 'Sin cliente'} · ${safeDate(t.ts || t.fechaISO || t.fecha).toLocaleString('es-MX')}`,
      right: t.formaPago || '—'
    }));
  if(elListaUltimasVentas) elListaUltimasVentas.innerHTML = listLightHTML(ultimas, 'Sin ventas registradas.');

  const topProductos = computeTopProducts(tickets, 6).map(p=>({
    title: `${p.nombre}`,
    sub: `${p.sku ? 'SKU ' + p.sku + ' · ' : ''}${p.piezas} pzas vendidas`,
    right: money(p.total)
  }));
  if(elDashTopProductos) elDashTopProductos.innerHTML = listLightHTML(topProductos, 'Aún no hay productos vendidos.');

  const lowStockRows = lowStock.slice(0,6).map(p=>({
    title: p.nombre || 'Producto',
    sub: `${p.sku || 'Sin SKU'} · mínimo ${Number(p.stockMin || 0)}`,
    right: `<span class="pill soft-red">${Number(p.stockPiso ?? p.stock ?? 0)} pzas</span>`
  }));
  if(elDashLowStock) elDashLowStock.innerHTML = listLightHTML(lowStockRows, 'Inventario saludable por ahora.');

  const movs = (state.movimientos || []).slice().reverse().slice(0,6).map(m=>({
    title: `${m.producto || m.nombre || m.sku || 'Movimiento'}`,
    sub: `${m.tipo || 'Ajuste'} · ${safeDate(m.fecha || m.ts).toLocaleString('es-MX')}`,
    right: `${Number(m.cantidad || 0)>0?'+':''}${Number(m.cantidad || 0)}`
  }));
  if(elListaKardex) elListaKardex.innerHTML = listLightHTML(movs, 'Sin movimientos recientes.');
}

// Inicialización base
if(typeof fillCategoriasSelect === 'function') fillCategoriasSelect();
if(typeof renderCatalog === 'function') renderCatalog('');
if(typeof paintCart === 'function') paintCart();
if(typeof renderDashboard === 'function') renderDashboard();
if(typeof renderClientes === 'function') renderClientes();
if(typeof renderHistorial === 'function') renderHistorial();
if(typeof renderReportes === 'function') renderReportes();
if(typeof renderInventario === 'function') renderInventario();
if(typeof renderBodega === 'function') renderBodega();
