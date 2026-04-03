// DASHBOARD MAYOREO V1
const elDashMayKpis = document.getElementById('dashMayKpis');
const elChart7diasMay = document.getElementById('chart7diasMay');
const elChartPagosMay = document.getElementById('chartPagosMay');
const elLegendPagosMay = document.getElementById('legendPagosMay');
const elListaUltimasVentasMay = document.getElementById('listaUltimasVentasMay');
const elListaTopClientesMay = document.getElementById('listaTopClientesMay');
const elListaTopProductosMay = document.getElementById('listaTopProductosMay');
const elListaClientesActivosMay = document.getElementById('listaClientesActivosMay');
const elDashMayHeroPills = document.getElementById('dashMayHeroPills');
const elDashMayHeroMetrics = document.getElementById('dashMayHeroMetrics');

function getMayoreoClients(){
  return (state.clientes || []).filter(c => String(c.tipo || '').toLowerCase().startsWith('mayoreo'));
}

function renderDashboardMayoreo(){
  const tickets = Array.isArray(state.ventasMayoreo) ? state.ventasMayoreo.slice() : [];
  const clientes = getMayoreoClients();
  const now = new Date();

  const ventasHoy = tickets.filter(t => sameDayDash(safeDate(t.ts || t.fechaISO || t.fecha), now));
  const ventasMes = tickets.filter(t => {
    const d = safeDate(t.ts || t.fechaISO || t.fecha);
    return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
  });
  const totalHoy = ventasHoy.reduce((a,t)=>a + Number(t.total || 0), 0);
  const totalMes = ventasMes.reduce((a,t)=>a + Number(t.total || 0), 0);
  const totalHistorico = tickets.reduce((a,t)=>a + Number(t.total || 0), 0);
  const descTotal = tickets.reduce((a,t)=>a + Number(t.descMonto || 0), 0);
  const ticketProm = tickets.length ? totalHistorico / tickets.length : 0;

  const topClientesMap = {};
  tickets.forEach(t=>{
    const key = t.cliente || 'Sin cliente';
    topClientesMap[key] = (topClientesMap[key] || 0) + Number(t.total || 0);
  });
  const topClientes = Object.entries(topClientesMap).sort((a,b)=>b[1]-a[1]).slice(0,6);

  const topProductos = computeTopProducts(tickets, 6);

  if(elDashMayHeroPills){
    elDashMayHeroPills.innerHTML = `
      <span class="pill soft-blue">${clientes.length} clientes mayoreo</span>
      <span class="pill soft-green">${tickets.length} tickets mayoreo</span>
      <span class="pill soft-purple">${money(descTotal)} descuentos</span>
    `;
  }
  if(elDashMayHeroMetrics){
    elDashMayHeroMetrics.innerHTML = `
      <div class="metric-card">
        <span>Venta mayoreo hoy</span>
        <strong>${money(totalHoy)}</strong>
      </div>
      <div class="metric-card">
        <span>Promedio ticket</span>
        <strong>${money(ticketProm)}</strong>
      </div>
      <div class="metric-card">
        <span>Clientes activos</span>
        <strong>${new Set(tickets.map(t=>t.cliente).filter(Boolean)).size}</strong>
      </div>
    `;
  }

  if(elDashMayKpis){
    elDashMayKpis.innerHTML = `
      <div class="kpi-card kpi-card-blue">
        <div class="kpi-label">MAYOREO HOY</div>
        <div class="kpi-value">${money(totalHoy)}</div>
        <div class="kpi-extra">${ventasHoy.length} tickets hoy</div>
      </div>
      <div class="kpi-card kpi-card-indigo">
        <div class="kpi-label">MAYOREO DEL MES</div>
        <div class="kpi-value">${money(totalMes)}</div>
        <div class="kpi-extra">${ventasMes.length} tickets del mes</div>
      </div>
      <div class="kpi-card kpi-card-purple">
        <div class="kpi-label">DESCUENTOS OTORGADOS</div>
        <div class="kpi-value">${money(descTotal)}</div>
        <div class="kpi-extra">Acumulado del canal</div>
      </div>
      <div class="kpi-card kpi-card-dark">
        <div class="kpi-label">CLIENTES MAYOREO</div>
        <div class="kpi-value">${clientes.length}</div>
        <div class="kpi-extra">Cartera registrada</div>
      </div>
    `;
  }

  renderBars(elChart7diasMay, buildLast7DaysRows(tickets));
  renderPaymentBox(elChartPagosMay, elLegendPagosMay, paymentSummary(tickets, true));

  if(elListaUltimasVentasMay){
    const rows = tickets.slice().sort((a,b)=>safeDate(b.ts || b.fechaISO || b.fecha) - safeDate(a.ts || a.fechaISO || a.fecha)).slice(0,6).map(t=>({
      title: `${t.id || 'Ticket'} · ${money(t.total || 0)}`,
      sub: `${t.cliente || 'Sin cliente'} · ${t.tipoCliente || 'Mayoreo'} · ${safeDate(t.ts || t.fechaISO || t.fecha).toLocaleString('es-MX')}`,
      right: `${Number(t.descPorc || 0)}%`
    }));
    elListaUltimasVentasMay.innerHTML = listLightHTML(rows, 'Sin tickets mayoreo todavía.');
  }

  if(elListaTopClientesMay){
    const rows = topClientes.map(([name,total])=>({
      title: name,
      sub: 'Cliente mayoreo',
      right: money(total)
    }));
    elListaTopClientesMay.innerHTML = listLightHTML(rows, 'Aún no hay clientes con compra.');
  }

  if(elListaTopProductosMay){
    const rows = topProductos.map(p=>({
      title: p.nombre,
      sub: `${p.piezas} pzas · ${p.sku ? 'SKU ' + p.sku : 'sin SKU'}`,
      right: money(p.total)
    }));
    elListaTopProductosMay.innerHTML = listLightHTML(rows, 'Sin productos vendidos en mayoreo.');
  }

  if(elListaClientesActivosMay){
    const rows = clientes.slice().sort((a,b)=>(Number(b.descMayoreo||0) - Number(a.descMayoreo||0))).slice(0,6).map(c=>({
      title: c.nombre,
      sub: `${c.tipo || 'Mayoreo'} · ${c.telefono || 'sin teléfono'}`,
      right: `${Number(c.descMayoreo || 0)}%`
    }));
    elListaClientesActivosMay.innerHTML = listLightHTML(rows, 'No hay clientes mayoreo cargados.');
  }
}

try{ renderDashboardMayoreo(); }catch(e){}
