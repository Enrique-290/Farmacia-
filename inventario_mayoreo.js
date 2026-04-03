// INVENTARIO MAYOREO
// Entradas manuales + movimientos generados por Ventas Mayoreo

const elMayEntProd = document.getElementById('mayEntProd');
const elMayEntCant = document.getElementById('mayEntCant');
const elMayEntCosto = document.getElementById('mayEntCosto');
const elMayEntNotas = document.getElementById('mayEntNotas');
const elMayEntBtn = document.getElementById('mayEntBtn');
const elMayMovList = document.getElementById('mayMovList');

function fillMayoreoProductosSelect(){
  if(!elMayEntProd) return;
  elMayEntProd.innerHTML='';
  const opt0 = document.createElement('option');
  opt0.value='';
  opt0.textContent='Selecciona producto';
  elMayEntProd.appendChild(opt0);
  (state.inventario||[]).forEach(p=>{
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.sku} · ${p.nombre}`;
    elMayEntProd.appendChild(opt);
  });
}

function logMovMayoreo(mov){
  if(!Array.isArray(state.movMayoreo)) state.movMayoreo = [];
  if(!Array.isArray(state.movimientos)) state.movimientos = [];
  state.movMayoreo.push(mov);
  state.movimientos.push(mov); // general
}

function renderInventarioMayoreo(){
  fillMayoreoProductosSelect();
  if(!elMayMovList) return;

  const movs = (state.movMayoreo||[]).slice().reverse();
  if(!movs.length){
    elMayMovList.innerHTML = '<div style="color:#6b7280;font-size:13px;">Sin movimientos mayoreo.</div>';
    return;
  }

  const top = movs.slice(0, 60);
  elMayMovList.innerHTML = top.map(m=>{
    const dt = new Date(m.ts || Date.now());
    const f = dt.toLocaleString();
    const badge = m.tipo==='Entrada' ? '🟢' : (m.tipo==='Salida' ? '🔴' : '•');
    const ref = m.ref ? ` · <strong>${m.ref}</strong>` : '';
    const notas = m.notas ? ` · ${m.notas}` : '';
    return `<div class="mini-row">
      <div><strong>${badge} ${m.tipo}</strong>${ref}</div>
      <div style="color:#64748b;">${f}${notas}</div>
    </div>`;
  }).join('');
}

if(elMayEntBtn){
  elMayEntBtn.addEventListener('click',()=>{
    const prodId = elMayEntProd.value;
    const cant = Number(elMayEntCant.value)||0;
    const costo = Number(elMayEntCosto.value)||0;
    const notas = (elMayEntNotas.value||'').trim();

    if(!prodId){alert('Selecciona un producto.');return;}
    if(cant<=0){alert('Cantidad debe ser mayor a 0.');return;}

    const prod = (state.inventario||[]).find(p=>p.id===prodId);
    if(!prod){alert('Producto no encontrado.');return;}

    // Entrada a bodega (mayoreo normalmente entra a bodega)
    prod.stockBodega = Number(prod.stockBodega||0) + cant;
    saveState();

    logMovMayoreo({
      ts: Date.now(),
      canal: 'Mayoreo',
      tipo: 'Entrada',
      ref: prod.sku,
      productoId: prod.id,
      producto: prod.nombre,
      cantidad: cant,
      costo,
      notas
    });

    saveState();
    elMayEntCant.value = 1;
    elMayEntCosto.value = 0;
    elMayEntNotas.value = '';

    renderInventario();
    renderBodega();
    renderDashboard();
    renderInventarioMayoreo();
    alert('Entrada mayoreo registrada.');
  });
}

// Dejar disponible para otros módulos
window.renderInventarioMayoreo = renderInventarioMayoreo;
window.logMovMayoreo = logMovMayoreo;
