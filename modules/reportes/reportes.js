// REPORTES avanzados
  // ---------------------------
  const elReportesResumen = document.getElementById('reportesResumen');
  const elRepDesde       = document.getElementById('repDesde');
  const elRepHasta       = document.getElementById('repHasta');
  const elRepFormaPago   = document.getElementById('repFormaPago');
  const elRepChartDias   = document.getElementById('repChartDias');
  const elRepChartPagos  = document.getElementById('repChartPagos');
  const elRepLegendPagos = document.getElementById('repLegendPagos');
  const elRepTopProductos = document.getElementById('repTopProductos');
  const btnRepHoy        = document.getElementById('btnRepHoy');
  const btnRepMes        = document.getElementById('btnRepMes');
  const btnRepTodo       = document.getElementById('btnRepTodo');

  // Filtro base de reportes (se apoya en state.ventas)
  function getVentasPeriodo() {
    let arr = state.ventas.slice();

    const dDesde = elRepDesde.value;
    const dHasta = elRepHasta.value;
    const forma  = elRepFormaPago.value;

    if (dDesde) {
      arr = arr.filter(v => v.fechaISO.slice(0, 10) >= dDesde);
    }
    if (dHasta) {
      arr = arr.filter(v => v.fechaISO.slice(0, 10) <= dHasta);
    }
    if (forma) {
      arr = arr.filter(v => v.formaPago === forma);
    }
    return arr;
  }

  function renderReportes() {
    const ventas = getVentasPeriodo();
    const total = ventas.reduce((a, v) => a + v.total, 0);
    const tickets = ventas.length;
    const iva = ventas.reduce((a, v) => a + (v.ivaMonto || 0), 0);
    const descuentos = ventas.reduce((a, v) => a + (v.descMonto || 0), 0);
    const promedio = tickets ? total / tickets : 0;

    const totalHistorico = state.ventas.reduce((a, v) => a + v.total, 0);
    const ticketsHistorico = state.ventas.length;

    // KPIs en el contenedor reportesResumen (reutilizamos estilos de dashboard)
    elReportesResumen.innerHTML = `
      <div class="dash-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total periodo</div>
          <div class="kpi-value">${money(total)}</div>
          <div class="kpi-extra">${tickets} tickets</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Ticket promedio</div>
          <div class="kpi-value">${money(promedio)}</div>
          <div class="kpi-extra">Con base en el filtro actual</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">IVA en periodo</div>
          <div class="kpi-value">${money(iva)}</div>
          <div class="kpi-extra">Descuentos: ${money(descuentos)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Histórico general</div>
          <div class="kpi-value">${money(totalHistorico)}</div>
          <div class="kpi-extra">${ticketsHistorico} tickets acumulados</div>
        </div>
      </div>
    `;

    // --- Gráfica: ventas por día ---
    elRepChartDias.innerHTML = '';
    if (!ventas.length) {
      const p = document.createElement('p');
      p.style.fontSize = '12px';
      p.style.color = '#6b7280';
      p.textContent = 'Sin ventas para los filtros seleccionados.';
      elRepChartDias.appendChild(p);

      elRepChartPagos.innerHTML = '';
      elRepLegendPagos.innerHTML = '';
      elRepTopProductos.innerHTML = '';
      return;
    }

    // Agrupar por día
    const mapaDias = {};
    ventas.forEach(v => {
      const d = v.fechaISO.slice(0, 10); // YYYY-MM-DD
      mapaDias[d] = (mapaDias[d] || 0) + v.total;
    });
    const diasOrdenados = Object.keys(mapaDias).sort();
    const datosDias = diasOrdenados.map(d => ({
      fecha: d.slice(5), // MM-DD
      total: mapaDias[d]
    }));
    const maxDia = Math.max(...datosDias.map(d => d.total), 1);

    datosDias.forEach(d => {
      const row = document.createElement('div');
      row.className = 'bar-row';
      const lbl = document.createElement('div');
      lbl.className = 'bar-label';
      lbl.textContent = d.fecha;
      const track = document.createElement('div');
      track.className = 'bar-track';
      const fill = document.createElement('div');
      fill.className = 'bar-fill';
      fill.style.width = (d.total / maxDia * 100) + '%';
      track.appendChild(fill);
      row.appendChild(lbl);
      row.appendChild(track);
      elRepChartDias.appendChild(row);
    });

    // --- Gráfica: formas de pago ---
    const pagos = { Efectivo: 0, Tarjeta: 0, Transferencia: 0, Mixto: 0 };
    ventas.forEach(v => {
      if (pagos[v.formaPago] != null) {
        pagos[v.formaPago] += v.total;
      }
    });
    elRepChartPagos.innerHTML = '';
    elRepLegendPagos.innerHTML = '';
    const totalPagos = Object.values(pagos).reduce((a, v) => a + v, 0) || 1;

    Object.entries(pagos).forEach(([medio, valor]) => {
      const row = document.createElement('div');
      row.className = 'bar-row';
      const lbl = document.createElement('div');
      lbl.className = 'bar-label';
      lbl.textContent = medio;
      const track = document.createElement('div');
      track.className = 'bar-track';
      const fill = document.createElement('div');
      fill.className = 'bar-fill';
      fill.style.width = (valor / totalPagos * 100) + '%';
      track.appendChild(fill);
      row.appendChild(lbl);
      row.appendChild(track);
      elRepChartPagos.appendChild(row);

      const pill = document.createElement('span');
      pill.className = 'pill';
      pill.textContent = `${medio}: ${money(valor)}`;
      elRepLegendPagos.appendChild(pill);
    });

    // --- Top productos (por total de venta) ---
    const mapaProd = {};
    ventas.forEach(v => {
      (v.items || []).forEach(it => {
        const key = it.nombre || it.sku || 'SIN NOMBRE';
        if (!mapaProd[key]) {
          mapaProd[key] = { nombre: key, cant: 0, total: 0 };
        }
        mapaProd[key].cant += it.cant || 0;
        mapaProd[key].total += (it.cant || 0) * (it.precio || 0);
      });
    });

    const listaProd = Object.values(mapaProd)
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);

    elRepTopProductos.innerHTML = '';
    listaProd.forEach(p => {
      const tr = document.createElement('tr');
      const tdNom = document.createElement('td');
      tdNom.textContent = p.nombre;
      const tdCant = document.createElement('td');
      tdCant.textContent = p.cant;
      const tdTotal = document.createElement('td');
      tdTotal.textContent = money(p.total);
      tr.appendChild(tdNom);
      tr.appendChild(tdCant);
      tr.appendChild(tdTotal);
      elRepTopProductos.appendChild(tr);
    });
  }

  // Listeners de filtros de reportes
  [elRepDesde, elRepHasta, elRepFormaPago].forEach(ctrl => {
    if (!ctrl) return;
    ctrl.addEventListener('input', renderReportes);
    ctrl.addEventListener('change', renderReportes);
  });

  if (btnRepHoy) {
    btnRepHoy.addEventListener('click', () => {
      const hoy = new Date().toISOString().slice(0, 10);
      elRepDesde.value = hoy;
      elRepHasta.value = hoy;
      renderReportes();
    });
  }
  if (btnRepMes) {
    btnRepMes.addEventListener('click', () => {
      const ahora = new Date();
      const y = ahora.getFullYear();
      const m = String(ahora.getMonth() + 1).padStart(2, '0');
      elRepDesde.value = `${y}-${m}-01`;
      // último día del mes
      const ultimoDia = new Date(y, ahora.getMonth() + 1, 0).getDate();
      elRepHasta.value = `${y}-${m}-${String(ultimoDia).padStart(2, '0')}`;
      renderReportes();
    });
  }
  if (btnRepTodo) {
    btnRepTodo.addEventListener('click', () => {
      elRepDesde.value = '';
      elRepHasta.value = '';
      elRepFormaPago.value = '';
      renderReportes();
    });
  } 

// ---------------------------
// CONFIG
// ---------------------------
const elCfgNegocio      = document.getElementById('cfgNegocio');
const elCfgRFC          = document.getElementById('cfgRFC');
const elCfgDireccion    = document.getElementById('cfgDireccion');
const elCfgTelefono     = document.getElementById('cfgTelefono');
const elCfgIva          = document.getElementById('cfgIva');
const elCfgMensaje      = document.getElementById('cfgMensaje');
const elCfgLogoFile     = document.getElementById('cfgLogoFile');
const elCfgLogoPreview  = document.getElementById('cfgLogoPreview');
const elCfgLogoPreviewWrap = document.getElementById('cfgLogoPreviewWrap');
const elBtnQuitarLogo   = document.getElementById('btnQuitarLogo');
const elBtnGuardarCfg   = document.getElementById('btnGuardarCfg');
const elBtnExportJson   = document.getElementById('btnExportJson');
const elInputImportJson = document.getElementById('inputImportJson');
const elWebHeroTitle   = document.getElementById('webHeroTitle');
const elWebHeroDesc    = document.getElementById('webHeroDesc');
const elWebWhatsapp    = document.getElementById('webWhatsapp');
const elWebAddress     = document.getElementById('webAddress');
const elWebCTA         = document.getElementById('webCTA');
const elBtnGuardarWeb  = document.getElementById('btnGuardarWeb');
const elBtnDescargarWeb= document.getElementById('btnDescargarWeb');
const elWebPreview     = document.getElementById('webPreview');
const elWebProductsPicker = document.getElementById('webProductsPicker');
const elWebProductSearch = document.getElementById('webProductSearch');
const elWebSelectedInfo = document.getElementById('webSelectedInfo');
const elBtnWebSelectAll = document.getElementById('btnWebSelectAll');
const elBtnWebClearAll = document.getElementById('btnWebClearAll');
const elWebBanner1File = document.getElementById('webBanner1File');
const elWebBanner2File = document.getElementById('webBanner2File');
const elWebBanner1Preview = document.getElementById('webBanner1Preview');
const elWebBanner2Preview = document.getElementById('webBanner2Preview');
const elBtnRemoveBanner1 = document.getElementById('btnRemoveBanner1');
const elBtnRemoveBanner2 = document.getElementById('btnRemoveBanner2');


function renderLogoPreview(){
  if(!elCfgLogoPreview || !elCfgLogoPreviewWrap) return;
  const logo = state.config.logoDataUrl || '';
  const banner1 = state.config.webBanner1 || '';
  const banner2 = state.config.webBanner2 || '';
  const ok = typeof logo === 'string' && logo.startsWith('data:image/');
  if(ok){
    elCfgLogoPreview.src = logo;
    elCfgLogoPreviewWrap.classList.add('has-logo');
  }else{
    elCfgLogoPreview.removeAttribute('src');
    elCfgLogoPreviewWrap.classList.remove('has-logo');
  }
}

function renderSidebarLogo(){
  const badge = document.getElementById('logoBadge');
  const title = document.getElementById('sidebarTitle');
  if(title) title.textContent = state.config.negocio || 'Farmacia DP';
  if(!badge) return;
  const logo = state.config.logoDataUrl || '';
  const ok = typeof logo === 'string' && logo.startsWith('data:image/');
  if(ok){
    badge.classList.add('has-logo');
    badge.innerHTML = `<img src="${logo}" alt="Logo">`;
  }else{
    badge.classList.remove('has-logo');
    badge.textContent = 'Rx';
  }
}

function loadConfigForm(){
  elCfgNegocio.value   = state.config.negocio   || '';
  elCfgRFC.value       = state.config.rfc       || '';
  elCfgDireccion.value = state.config.direccion || '';
  elCfgTelefono.value  = state.config.telefono  || '';
  elCfgIva.value       = state.config.ivaDefault || 0;
  elCfgMensaje.value   = state.config.mensajeTicket || '';
  renderLogoPreview();
  renderSidebarLogo();
}


if (elCfgLogoFile){
  elCfgLogoFile.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    if(!String(file.type || '').startsWith('image/')){
      alert('Selecciona una imagen válida.');
      elCfgLogoFile.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      if(!result.startsWith('data:image/')){
        alert('No se pudo leer el logo.');
        elCfgLogoFile.value = '';
        return;
      }
      state.config.logoDataUrl = result;
      saveState();
      renderLogoPreview();
      renderSidebarLogo();
      elCfgLogoFile.value = '';
    };
    reader.onerror = () => {
      alert('Hubo un problema al cargar el logo.');
      elCfgLogoFile.value = '';
    };
    reader.readAsDataURL(file);
  });
}

if (elBtnQuitarLogo){
  elBtnQuitarLogo.addEventListener('click', () => {
    state.config.logoDataUrl = '';
    saveState();
    renderLogoPreview();
    renderSidebarLogo();
  });
}

elBtnGuardarCfg.addEventListener('click', () => {
  state.config.negocio       = elCfgNegocio.value.trim()   || 'Farmacia DP';
  state.config.rfc           = elCfgRFC.value.trim()       || '';
  state.config.direccion     = elCfgDireccion.value.trim() || '';
  state.config.telefono      = elCfgTelefono.value.trim()  || '';
  state.config.ivaDefault    = Number(elCfgIva.value) || 0;
  state.config.mensajeTicket = elCfgMensaje.value.trim() || '¡Gracias por su compra!';

  saveState();
  renderSidebarLogo();
  renderLogoPreview();
  alert('Configuración guardada.');
});

elBtnExportJson.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state,null,2)], { type:'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = 'farmacia_dp_backup.json';
  a.click();
  URL.revokeObjectURL(url);
});

elInputImportJson.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(ev){
    try {
      const imported = JSON.parse(ev.target.result);
      state = Object.assign(state, imported);
      ensureLotesStructure();
      if (!Array.isArray(state.categorias) || !state.categorias.length){
        state.categorias = ['Original','Genérico','Controlado','Perfumería'];
      }
      saveState();
      alert('Backup restaurado. Recarga la página para aplicar todo.');
    } catch(err){
      alert('Error al importar JSON');
    }
  };
  reader.readAsText(file);
});

// ---------------------------


function getSelectedWebProducts(limit=12){
  const ids = Array.isArray(state.config.webSelectedProductIds) ? state.config.webSelectedProductIds : [];
  let productos = state.inventario.filter(p => ids.includes(String(p.id ?? p.sku ?? '')));
  productos = productos.filter(p => Number(p.stockPiso ?? p.stock ?? 0) > 0);
  if(!productos.length && !ids.length){
    productos = [...state.inventario]
      .filter(p => Number(p.stockPiso ?? p.stock ?? 0) > 0)
      .sort((a,b)=> Number(b.stockPiso ?? b.stock ?? 0) - Number(a.stockPiso ?? a.stock ?? 0))
      .slice(0, limit);
  }
  return productos.slice(0, limit);
}

function getFilteredWebPickerProducts(){
  const term = (elWebProductSearch?.value || '').trim().toLowerCase();
  let productos = [...state.inventario].sort((a,b)=> String(a.nombre || '').localeCompare(String(b.nombre || '')));
  if(term){
    productos = productos.filter(p =>
      String(p.nombre || '').toLowerCase().includes(term) ||
      String(p.sku || '').toLowerCase().includes(term) ||
      String(p.categoria || '').toLowerCase().includes(term)
    );
  }
  return productos;
}

function renderWebProductsPicker(){
  if(!elWebProductsPicker) return;
  const selected = Array.isArray(state.config.webSelectedProductIds) ? state.config.webSelectedProductIds.map(String) : [];
  const productos = getFilteredWebPickerProducts();

  if(elWebSelectedInfo){
    elWebSelectedInfo.textContent = `${selected.length} producto${selected.length === 1 ? '' : 's'} seleccionado${selected.length === 1 ? '' : 's'}`;
  }

  if(!productos.length){
    elWebProductsPicker.innerHTML = '<div class="web-empty-picker">No hay productos para mostrar. Agrega inventario o cambia la búsqueda.</div>';
    return;
  }

  elWebProductsPicker.innerHTML = productos.map(p => {
    const id = String(p.id ?? p.sku ?? '');
    const checked = selected.includes(id) ? 'checked' : '';
    const precio = money(p.precioVenta || p.precio || 0);
    const stock = Number(p.stockPiso ?? p.stock ?? 0);
    return `<label class="web-product-row">
      <input type="checkbox" class="web-product-check" data-id="${escapeHtml(id)}" ${checked}>
      <div class="web-product-meta">
        <strong>${escapeHtml(p.nombre || 'Producto')}</strong>
        <span>SKU: ${escapeHtml(p.sku || '-')} · ${escapeHtml(p.categoria || 'Sin categoría')}</span>
        <span>${precio} · Stock piso: ${stock}</span>
      </div>
      <span class="web-product-badge">${checked ? 'Visible' : 'Oculto'}</span>
    </label>`;
  }).join('');

  elWebProductsPicker.querySelectorAll('.web-product-check').forEach(chk => {
    chk.addEventListener('change', () => {
      const id = String(chk.dataset.id || '');
      let ids = Array.isArray(state.config.webSelectedProductIds) ? state.config.webSelectedProductIds.map(String) : [];
      if(chk.checked){
        if(!ids.includes(id)) ids.push(id);
      }else{
        ids = ids.filter(x => x !== id);
      }
      state.config.webSelectedProductIds = ids;
      saveState();
      renderWebProductsPicker();
      renderWebProductsPicker();
  renderWebPreview();
    });
  });
}

function renderWebPreview(){
  if (!elWebPreview) return;
  const title = state.config.webTitle || state.config.negocio || 'Farmacia DP';
  const desc = state.config.webDescription || 'Atención rápida por WhatsApp';
  const wa = (state.config.webWhatsapp || '').replace(/\D/g,'');
  const cta = state.config.webCTA || 'Pedir por WhatsApp';
  const addr = state.config.webAddress || state.config.direccion || '';
  const productos = getSelectedWebProducts();
  const productosHtml = productos.length
    ? productos.map(p => `<div class="web-mini-product"><strong>${escapeHtml(p.nombre || 'Producto')}</strong><span>${money(p.precioVenta || p.precio || 0)}</span><span>Stock: ${Number(p.stockPiso ?? p.stock ?? 0)}</span><em>Publicado manualmente</em></div>`).join('')
    : '<div class="web-card">Agrega productos en inventario para verlos aquí.</div>';

  elWebPreview.innerHTML = `
    <div class="web-hero">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(desc)}</p>
    </div>
    <div class="web-card">
      <strong>Contacto</strong>
      <div style="font-size:13px;color:#475569;margin-top:6px;">${escapeHtml(addr || 'Sin dirección capturada')}</div>
      <div style="font-size:13px;color:#475569;margin-top:4px;">WhatsApp: ${escapeHtml(wa || 'Sin número')}</div>
      <div style="margin-top:10px;"><button class="btn btn-primary" type="button">${escapeHtml(cta)}</button></div>
    </div>
    <div style="margin-top:12px;">
      <strong style="font-size:13px;">Productos publicados</strong>
      <div class="web-grid-products">${productosHtml}</div>
    </div>
  `;
}

function loadWebForm(){
  if (!elWebHeroTitle) return;
  elWebHeroTitle.value = state.config.webTitle || state.config.negocio || '';
  elWebHeroDesc.value = state.config.webDescription || '';
  elWebWhatsapp.value = state.config.webWhatsapp || '';
  elWebAddress.value = state.config.webAddress || state.config.direccion || '';
  elWebCTA.value = state.config.webCTA || 'Pedir por WhatsApp';
  renderWebPreview();
}

function escapeHtml(str=''){
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function generarHtmlWeb(){
  const title = state.config.webTitle || state.config.negocio || 'Farmacia DP';
  const desc = state.config.webDescription || 'Atención rápida por WhatsApp';
  const wa = (state.config.webWhatsapp || '').replace(/\D/g,'');
  const cta = state.config.webCTA || 'Pedir por WhatsApp';
  const addr = state.config.webAddress || state.config.direccion || '';
  const logo = state.config.logoDataUrl || '';
  const banner1 = state.config.webBanner1 || '';
  const banner2 = state.config.webBanner2 || '';
  const productos = getSelectedWebProducts(99).map(p => ({
    id: getWebProductId(p),
    nombre: p.nombre || 'Producto',
    precioNum: Number(p.precio || p.precioVenta || 0) || 0,
    precio: money(p.precio || p.precioVenta || 0),
    stock: Number(p.stockPiso ?? p.stock ?? 0),
    categoria: p.categoria || 'Sin categoría',
    imagen: getWebProductImage(p)
  }));
  const categorias = Array.from(new Set(productos.map(p => p.categoria || 'General'))).slice(0, 8);

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
body{font-family:Arial,sans-serif;margin:0;background:#f8fbff;color:#0f172a}
.top{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #e5e7eb;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px}
.brand{display:flex;align-items:center;gap:10px}
.logo{width:48px;height:48px;border-radius:14px;background:#eff6ff;border:1px solid #dbeafe;display:flex;align-items:center;justify-content:center;overflow:hidden;color:#2563eb;font-weight:800}
.logo img{width:100%;height:100%;object-fit:contain;padding:6px;background:#fff}
.cartbtn{border:none;border-radius:999px;padding:10px 14px;background:#0f172a;color:#fff;font-weight:700;cursor:pointer}
.count{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;border-radius:999px;background:#fff;color:#0f172a;font-size:12px;margin-left:8px;padding:0 6px}
.hero{background:linear-gradient(135deg,#1d4ed8,#60a5fa);color:#fff;padding:28px 16px}
.bannerwrap{padding:14px 16px 0}
.bannermain{display:grid;grid-template-columns:1.45fr .95fr;gap:12px}
.bannercard{border-radius:20px;overflow:hidden;background:#dbeafe;min-height:150px;position:relative;display:flex;align-items:flex-end;justify-content:flex-start;color:#fff}
.bannercard img{width:100%;height:100%;object-fit:cover;display:block}
.overlay{position:absolute;inset:auto 0 0 0;padding:18px 16px;background:linear-gradient(180deg,rgba(15,23,42,0) 0%, rgba(15,23,42,.65) 100%)}
.chip{display:inline-flex;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.18);font-size:12px;font-weight:700}
main{max-width:1180px;margin:0 auto;padding:0 0 22px}
.contact{margin:14px 16px 0;padding:14px;background:#fff;border:1px solid #e5e7eb;border-radius:18px}
.cats{display:flex;gap:8px;flex-wrap:wrap;padding:14px 16px 0}
.cat{border:1px solid #dbeafe;background:#fff;color:#1d4ed8;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:700}
.sectionhead{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:16px 16px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;padding:16px}
.item{border:1px solid #e5e7eb;border-radius:18px;background:#fff;overflow:hidden;display:flex;flex-direction:column}
.media{height:160px;background:#eff6ff;display:flex;align-items:center;justify-content:center;color:#2563eb;font-size:34px}
.media img{width:100%;height:100%;object-fit:cover;display:block}
.body{padding:12px}
.title{font-size:15px;font-weight:700}
.meta{font-size:12px;color:#64748b;margin-top:4px}
.price{font-size:17px;font-weight:800;color:#1d4ed8;margin-top:8px}
.note{font-size:11px;color:#2563eb;font-weight:700;margin-top:6px}
.actions{display:flex;gap:8px;margin-top:10px}
.btn{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border:none;border-radius:999px;cursor:pointer;flex:1}
.btn.secondary{background:#eff6ff;color:#1d4ed8}
.drawer{position:fixed;top:0;right:0;width:min(360px,92%);height:100%;background:#fff;border-left:1px solid #dbeafe;box-shadow:-10px 0 30px rgba(15,23,42,.08);transform:translateX(100%);transition:transform .22s ease;display:flex;flex-direction:column;z-index:20}
.drawer.open{transform:translateX(0)}
.dhead{display:flex;justify-content:space-between;align-items:center;padding:14px;border-bottom:1px solid #e5e7eb}
.close{border:none;background:#eff6ff;color:#1d4ed8;width:34px;height:34px;border-radius:999px;cursor:pointer;font-weight:800}
.items{flex:1;overflow:auto;padding:12px 14px}
.line{display:grid;grid-template-columns:1fr auto;gap:10px;padding:10px 0;border-bottom:1px dashed #e5e7eb}
.line small{display:block;color:#64748b;margin-top:4px}
.qty{display:flex;gap:6px;align-items:center;margin-top:8px}
.qty button{width:28px;height:28px;border:none;border-radius:999px;background:#eff6ff;color:#1d4ed8;cursor:pointer;font-weight:800}
.footer{padding:14px;border-top:1px solid #e5e7eb}
.total{display:flex;justify-content:space-between;align-items:center;font-weight:800;margin-bottom:12px}
.empty{padding:20px 8px;color:#64748b;text-align:center;font-size:13px}
@media(max-width:720px){.grid{grid-template-columns:1fr}.bannermain{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="top">
  <div class="brand">
    <div class="logo">${logo ? `<img src="${logo}" alt="Logo">` : 'Rx'}</div>
    <div><strong style="display:block;">${escapeHtml(title)}</strong><small style="color:#64748b">Catálogo web simple</small></div>
  </div>
  <button class="cartbtn" id="cartBtn">🛒 Carrito <span class="count" id="cartCount">0</span></button>
</div>
<div class="hero">
  <h1 style="margin:0">${escapeHtml(title)}</h1>
  <p style="margin:8px 0 0">${escapeHtml(desc)}</p>
</div>
<div class="bannerwrap">
  <div class="bannermain">
    <div class="bannercard">${banner1 ? `<img src="${banner1}" alt="Banner 1">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:42px;">💊</div>`}<div class="overlay"><span class="chip">Promociones destacadas</span><div style="margin-top:10px;font-size:22px;font-weight:800;">Salud y ahorro cerca de ti</div></div></div>
    <div class="bannercard">${banner2 ? `<img src="${banner2}" alt="Banner 2">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:42px;">🛍️</div>`}<div class="overlay"><span class="chip">Pedidos por WhatsApp</span><div style="margin-top:10px;font-size:18px;font-weight:800;">Arma tu carrito y envía tu pedido</div></div></div>
  </div>
</div>
<main>
  <section class="contact">
    <strong>Contacto</strong>
    <div style="font-size:13px;color:#475569;margin-top:6px;">${escapeHtml(addr || 'Sin dirección capturada')}</div>
    <div style="font-size:13px;color:#475569;margin-top:4px;">WhatsApp: ${escapeHtml(wa || 'Sin número')}</div>
  </section>
  <section class="cats">${categorias.map(cat => `<span class="cat">${escapeHtml(cat)}</span>`).join('')}</section>
  <section class="sectionhead"><strong>Productos destacados</strong><span>${productos.length} publicados</span></section>
  <section class="grid" id="catalogGrid"></section>
</main>

<aside class="drawer" id="drawer">
  <div class="dhead">
    <strong>Tu carrito</strong>
    <button class="close" id="closeBtn" type="button">×</button>
  </div>
  <div class="items" id="cartItems"></div>
  <div class="footer">
    <div class="total"><span>Total</span><span id="cartTotal">$0.00</span></div>
    <button class="btn" id="sendBtn" type="button">${escapeHtml(cta)}</button>
  </div>
</aside>

<script>
const productos = ${JSON.stringify(productos)};
const wa = ${JSON.stringify(wa)};
const title = ${JSON.stringify(title)};
const cart = {};

const fmt = v => '$' + (Number(v)||0).toFixed(2);
const $grid = document.getElementById('catalogGrid');
const $drawer = document.getElementById('drawer');
const $cartBtn = document.getElementById('cartBtn');
const $closeBtn = document.getElementById('closeBtn');
const $cartItems = document.getElementById('cartItems');
const $cartTotal = document.getElementById('cartTotal');
const $cartCount = document.getElementById('cartCount');
const $sendBtn = document.getElementById('sendBtn');

function esc(s=''){return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function renderCatalog(){
  $grid.innerHTML = productos.length ? productos.map(p => `<article class="item">
    <div class="media">${p.imagen ? `<img src="${p.imagen}" alt="${esc(p.nombre)}">` : '💊'}</div>
    <div class="body">
      <div class="title">${esc(p.nombre)}</div>
      <div class="meta">${esc(p.categoria)} · Stock: ${p.stock}</div>
      <div class="price">${esc(p.precio)}</div>
      <div class="note">Publicado manualmente</div>
      <div class="actions"><button class="btn addBtn" type="button" data-id="${esc(p.id)}">Agregar</button><button class="btn secondary" type="button">Ver</button></div>
    </div>
  </article>`).join('') : '<div class="empty">No hay productos publicados.</div>';

  document.querySelectorAll('.addBtn').forEach(btn => btn.addEventListener('click', () => {
    const id = String(btn.dataset.id || '');
    cart[id] = (cart[id] || 0) + 1;
    renderCart();
    $drawer.classList.add('open');
  }));
}
function renderCart(){
  const items = Object.entries(cart).map(([id, qty]) => {
    const prod = productos.find(p => p.id === id);
    if(!prod || qty <= 0) return null;
    return { ...prod, qty };
  }).filter(Boolean);

  const count = items.reduce((a,i)=>a+i.qty,0);
  const total = items.reduce((a,i)=>a+(i.qty*i.precioNum),0);

  $cartCount.textContent = count;
  $cartTotal.textContent = fmt(total);

  $cartItems.innerHTML = items.length ? items.map(i => `<div class="line">
    <div>
      <strong>${esc(i.nombre)}</strong>
      <small>${fmt(i.precioNum)} c/u</small>
      <div class="qty">
        <button type="button" class="minusBtn" data-id="${esc(i.id)}">−</button>
        <span>${i.qty}</span>
        <button type="button" class="plusBtn" data-id="${esc(i.id)}">+</button>
      </div>
    </div>
    <div><strong>${fmt(i.qty*i.precioNum)}</strong></div>
  </div>`).join('') : '<div class="empty">Tu carrito está vacío.</div>';

  document.querySelectorAll('.minusBtn').forEach(btn => btn.addEventListener('click', () => {
    const id = String(btn.dataset.id || '');
    cart[id] = Math.max((cart[id] || 0) - 1, 0);
    if(cart[id] <= 0) delete cart[id];
    renderCart();
    $drawer.classList.add('open');
  }));
  document.querySelectorAll('.plusBtn').forEach(btn => btn.addEventListener('click', () => {
    const id = String(btn.dataset.id || '');
    cart[id] = (cart[id] || 0) + 1;
    renderCart();
    $drawer.classList.add('open');
  }));

  $sendBtn.onclick = () => {
    if(!wa){ alert('No hay número de WhatsApp configurado.'); return; }
    if(!items.length){ alert('Agrega productos al carrito.'); return; }
    const lines = items.map(i => '• ' + i.nombre + ' x' + i.qty + ' = ' + fmt(i.qty*i.precioNum));
    const msg = encodeURIComponent(title + '\nPedido desde la web:\n\n' + lines.join('\n') + '\n\nTotal: ' + fmt(total));
    window.open('https://wa.me/' + wa + '?text=' + msg, '_blank');
  };
}
$cartBtn.onclick = () => $drawer.classList.add('open');
$closeBtn.onclick = () => $drawer.classList.remove('open');
renderCatalog();
renderCart();
</script>
</body>
</html>`;
}


if (elBtnGuardarWeb){
  elBtnGuardarWeb.addEventListener('click', () => {
    state.config.webTitle = elWebHeroTitle.value.trim() || state.config.negocio || 'Farmacia DP';
    state.config.webDescription = elWebHeroDesc.value.trim() || 'Atención rápida por WhatsApp';
    state.config.webWhatsapp = elWebWhatsapp.value.trim();
    state.config.webAddress = elWebAddress.value.trim();
    state.config.webCTA = elWebCTA.value.trim() || 'Pedir por WhatsApp';
    saveState();
    renderWebProductsPicker();
    renderWebPreview();
    alert('Contenido web guardado.');
  });
}



handleWebBannerUpload(elWebBanner1File, 'webBanner1', elWebBanner1Preview);
handleWebBannerUpload(elWebBanner2File, 'webBanner2', elWebBanner2Preview);

if (elBtnRemoveBanner1){
  elBtnRemoveBanner1.addEventListener('click', () => {
    state.config.webBanner1 = '';
    saveState();
    loadWebBannerInputs();
    renderWebPreview();
  });
}
if (elBtnRemoveBanner2){
  elBtnRemoveBanner2.addEventListener('click', () => {
    state.config.webBanner2 = '';
    saveState();
    loadWebBannerInputs();
    renderWebPreview();
  });
}

if (elWebProductSearch){
  elWebProductSearch.addEventListener('input', () => {
    renderWebProductsPicker();
  });
}

if (elBtnWebSelectAll){
  elBtnWebSelectAll.addEventListener('click', () => {
    const ids = getFilteredWebPickerProducts().map(p => String(p.id ?? p.sku ?? ''));
    const current = Array.isArray(state.config.webSelectedProductIds) ? state.config.webSelectedProductIds.map(String) : [];
    state.config.webSelectedProductIds = Array.from(new Set([...current, ...ids]));
    saveState();
    renderWebProductsPicker();
    renderWebPreview();
  });
}

if (elBtnWebClearAll){
  elBtnWebClearAll.addEventListener('click', () => {
    state.config.webSelectedProductIds = [];
    saveState();
    renderWebProductsPicker();
    renderWebPreview();
  });
}

if (elBtnDescargarWeb){
  elBtnDescargarWeb.addEventListener('click', () => {
    try{
      const html = generarHtmlWeb();
      const blob = new Blob([html], { type:'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pagina_farmacia_dp.html';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 300);
    }catch(err){
      console.error('Error al descargar HTML web:', err);
      alert('No se pudo descargar el HTML. Revisa la consola o vuelve a intentar.');
    }
  });
}

function renderWebBannerPreview(el, src, label='Sin banner'){
  if(!el) return;
  const ok = typeof src === 'string' && src.startsWith('data:image/');
  el.innerHTML = ok ? `<img src="${src}" alt="Banner">` : label;
}

function loadWebBannerInputs(){
  renderWebBannerPreview(elWebBanner1Preview, state.config.webBanner1 || '', 'Sin banner 1');
  renderWebBannerPreview(elWebBanner2Preview, state.config.webBanner2 || '', 'Sin banner 2');
}

function handleWebBannerUpload(inputEl, key, previewEl){
  if(!inputEl) return;
  inputEl.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    if(!String(file.type || '').startsWith('image/')){
      alert('Selecciona una imagen válida para el banner.');
      inputEl.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      if(!result.startsWith('data:image/')){
        alert('No se pudo leer la imagen del banner.');
        inputEl.value = '';
        return;
      }
      state.config[key] = result;
      saveState();
      renderWebBannerPreview(previewEl, result);
      renderWebPreview();
      elWebPreview.querySelector('#webCartDrawer')?.classList.add('open');
      inputEl.value = '';
    };
    reader.onerror = () => {
      alert('Hubo un problema al cargar el banner.');
      inputEl.value = '';
    };
    reader.readAsDataURL(file);
  });
}

function getWebProductId(prod){
  return String(prod?.id ?? prod?.sku ?? '');
}

function getWebProductImage(prod){
  const src = prod?.imagen || '';
  return (typeof src === 'string' && src.startsWith('data:image/')) ? src : '';
}

function getSelectedWebProducts(limit=100){
  const ids = Array.isArray(state.config.webSelectedProductIds) ? state.config.webSelectedProductIds.map(String) : [];
  let productos = state.inventario
    .filter(p => ids.includes(getWebProductId(p)))
    .filter(p => Number(p.stockPiso ?? p.stock ?? 0) > 0);

  if(!productos.length && !ids.length){
    productos = [...state.inventario]
      .filter(p => Number(p.stockPiso ?? p.stock ?? 0) > 0)
      .sort((a,b) => String(a.nombre || '').localeCompare(String(b.nombre || '')))
      .slice(0, limit);
  }
  return productos.slice(0, limit);
}

function getFilteredWebPickerProducts(){
  const term = (elWebProductSearch?.value || '').trim().toLowerCase();
  let productos = [...state.inventario]
    .filter(p => Number(p.stockPiso ?? p.stock ?? 0) > 0)
    .sort((a,b)=> String(a.nombre || '').localeCompare(String(b.nombre || '')));

  if(term){
    productos = productos.filter(p =>
      String(p.nombre || '').toLowerCase().includes(term) ||
      String(p.sku || '').toLowerCase().includes(term) ||
      String(p.categoria || '').toLowerCase().includes(term)
    );
  }
  return productos;
}

function renderWebProductsPicker(){
  if(!elWebProductsPicker) return;
  const selected = Array.isArray(state.config.webSelectedProductIds) ? state.config.webSelectedProductIds.map(String) : [];
  const productos = getFilteredWebPickerProducts();

  if(elWebSelectedInfo){
    elWebSelectedInfo.textContent = `${selected.length} producto${selected.length === 1 ? '' : 's'} seleccionado${selected.length === 1 ? '' : 's'}`;
  }

  if(!productos.length){
    elWebProductsPicker.innerHTML = '<div class="web-empty-picker">No hay productos para mostrar. Agrega productos con stock en inventario o cambia la búsqueda.</div>';
    return;
  }

  elWebProductsPicker.innerHTML = productos.map(p => {
    const id = getWebProductId(p);
    const checked = selected.includes(id) ? 'checked' : '';
    const precio = money(p.precio || p.precioVenta || 0);
    const stock = Number(p.stockPiso ?? p.stock ?? 0);
    const img = getWebProductImage(p);
    return `<label class="web-product-row">
      <input type="checkbox" class="web-product-check" data-id="${escapeHtml(id)}" ${checked}>
      <div class="web-product-thumb">${img ? `<img src="${img}" alt="${escapeHtml(p.nombre || 'Producto')}">` : '💊'}</div>
      <div class="web-product-meta">
        <strong>${escapeHtml(p.nombre || 'Producto')}</strong>
        <span>SKU: ${escapeHtml(p.sku || '-')} · ${escapeHtml(p.categoria || 'Sin categoría')}</span>
        <span>${precio} · Stock piso: ${stock}</span>
      </div>
      <span class="web-product-badge">${checked ? 'Visible' : 'Oculto'}</span>
    </label>`;
  }).join('');

  elWebProductsPicker.querySelectorAll('.web-product-check').forEach(chk => {
    chk.addEventListener('change', () => {
      const id = String(chk.dataset.id || '');
      let ids = Array.isArray(state.config.webSelectedProductIds) ? state.config.webSelectedProductIds.map(String) : [];
      if(chk.checked){
        if(!ids.includes(id)) ids.push(id);
      } else {
        ids = ids.filter(x => x !== id);
      }
      state.config.webSelectedProductIds = ids;
      saveState();
      renderWebProductsPicker();
      renderWebPreview();
    });
  });
}

function getPreviewCartState(){
  if(!window.__webPreviewCart) window.__webPreviewCart = {};
  return window.__webPreviewCart;
}

function getPreviewCartItems(){
  const cart = getPreviewCartState();
  const selected = getSelectedWebProducts(999);
  return Object.entries(cart).map(([id, qty]) => {
    const prod = selected.find(p => getWebProductId(p) === id);
    if(!prod || qty <= 0) return null;
    return {
      id,
      qty,
      nombre: prod.nombre || 'Producto',
      precio: Number(prod.precio || prod.precioVenta || 0) || 0
    };
  }).filter(Boolean);
}

function renderWebPreview(){
  if (!elWebPreview) return;
  const title = state.config.webTitle || state.config.negocio || 'Farmacia DP';
  const desc = state.config.webDescription || 'Atención rápida por WhatsApp';
  const wa = (state.config.webWhatsapp || '').replace(/\D/g,'');
  const cta = state.config.webCTA || 'Pedir por WhatsApp';
  const addr = state.config.webAddress || state.config.direccion || '';
  const productos = getSelectedWebProducts(50);
  const logo = state.config.logoDataUrl || '';
  const banner1 = state.config.webBanner1 || '';
  const banner2 = state.config.webBanner2 || '';
  const cart = getPreviewCartItems();
  const cartCount = cart.reduce((a, item) => a + item.qty, 0);
  const cartTotal = cart.reduce((a, item) => a + item.qty * item.precio, 0);
  const categorias = Array.from(new Set(productos.map(p => p.categoria || 'General'))).slice(0, 6);

  const productosHtml = productos.length
    ? productos.map(p => {
        const id = getWebProductId(p);
        const img = getWebProductImage(p);
        return `<article class="web-item">
          <div class="web-item-media">${img ? `<img src="${img}" alt="${escapeHtml(p.nombre || 'Producto')}">` : '💊'}</div>
          <div class="web-item-body">
            <div class="web-item-title">${escapeHtml(p.nombre || 'Producto')}</div>
            <div class="web-item-meta">${escapeHtml(p.categoria || 'Sin categoría')} · Stock: ${Number(p.stockPiso ?? p.stock ?? 0)}</div>
            <div class="web-item-price">${money(p.precio || p.precioVenta || 0)}</div>
            <div class="web-mini-note">Publicado manualmente</div>
            <div class="web-item-actions">
              <button class="btn btn-primary web-add-cart" type="button" data-id="${escapeHtml(id)}">Agregar</button>
              <button class="btn web-secondary" type="button">Ver</button>
            </div>
          </div>
        </article>`;
      }).join('')
    : '<div class="web-cart-empty">No hay productos seleccionados para la página web.</div>';

  const cartHtml = cart.length
    ? cart.map(item => `<div class="web-cart-line">
        <div>
          <strong>${escapeHtml(item.nombre)}</strong>
          <small>${money(item.precio)} c/u</small>
          <div class="web-cart-qty">
            <button type="button" class="web-cart-minus" data-id="${escapeHtml(item.id)}">−</button>
            <span>${item.qty}</span>
            <button type="button" class="web-cart-plus" data-id="${escapeHtml(item.id)}">+</button>
          </div>
        </div>
        <div><strong>${money(item.qty * item.precio)}</strong></div>
      </div>`).join('')
    : '<div class="web-cart-empty">Tu carrito está vacío.</div>';

  elWebPreview.innerHTML = `
    <div class="web-preview-shell">
      <div class="web-preview-topbar">
        <div class="web-preview-brand">
          <div class="web-preview-logo">${logo ? `<img src="${logo}" alt="Logo">` : 'Rx'}</div>
          <div>
            <strong style="display:block;">${escapeHtml(title)}</strong>
            <small style="color:#64748b;">Catálogo web simple</small>
          </div>
        </div>
        <button class="web-preview-cartbtn" id="webPreviewCartBtn" type="button">🛒 Carrito <span class="web-cart-count">${cartCount}</span></button>
      </div>

      <div class="web-preview-hero">
        <h3 style="margin:0;">${escapeHtml(title)}</h3>
        <p>${escapeHtml(desc)}</p>
      </div>

      <div class="web-preview-banner-wrap">
        <div class="web-preview-banner-main">
          <div class="web-banner-card">
            ${banner1 ? `<img src="${banner1}" alt="Banner 1">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:42px;">💊</div>`}
            <div class="web-banner-overlay">
              <span class="web-banner-chip">Promociones destacadas</span>
              <div style="margin-top:10px;font-size:22px;font-weight:800;">Salud y ahorro cerca de ti</div>
            </div>
          </div>
          <div class="web-banner-card">
            ${banner2 ? `<img src="${banner2}" alt="Banner 2">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:42px;">🛍️</div>`}
            <div class="web-banner-overlay">
              <span class="web-banner-chip">Pedidos por WhatsApp</span>
              <div style="margin-top:10px;font-size:18px;font-weight:800;">Arma tu carrito y envía tu pedido</div>
            </div>
          </div>
        </div>
      </div>

      <div class="web-preview-categories">
        ${categorias.map(cat => `<span class="web-cat-pill">${escapeHtml(cat)}</span>`).join('')}
      </div>

      <div class="web-preview-contact">
        <strong>Contacto</strong>
        <div style="font-size:13px;color:#475569;margin-top:6px;">${escapeHtml(addr || 'Sin dirección capturada')}</div>
        <div style="font-size:13px;color:#475569;margin-top:4px;">WhatsApp: ${escapeHtml(wa || 'Sin número')}</div>
      </div>

      <div class="web-preview-section-head">
        <strong>Productos destacados</strong>
        <span>${productos.length} publicados</span>
      </div>

      <div class="web-preview-products">${productosHtml}</div>

      <aside class="web-cart-drawer" id="webCartDrawer">
        <div class="web-cart-head">
          <strong>Tu carrito</strong>
          <button class="web-cart-close" id="webCartClose" type="button">×</button>
        </div>
        <div class="web-cart-items">${cartHtml}</div>
        <div class="web-cart-footer">
          <div class="web-cart-total"><span>Total</span><span>${money(cartTotal)}</span></div>
          <button class="btn btn-primary" id="webSendOrderBtn" type="button" ${wa ? '' : 'disabled'}>${escapeHtml(cta)}</button>
        </div>
      </aside>
    </div>
  `;

  elWebPreview.querySelectorAll('.web-add-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = String(btn.dataset.id || '');
      const cartMap = getPreviewCartState();
      cartMap[id] = (cartMap[id] || 0) + 1;
      renderWebPreview();
    });
  });

  elWebPreview.querySelector('#webPreviewCartBtn')?.addEventListener('click', () => {
    elWebPreview.querySelector('#webCartDrawer')?.classList.add('open');
  });
  elWebPreview.querySelector('#webCartClose')?.addEventListener('click', () => {
    elWebPreview.querySelector('#webCartDrawer')?.classList.remove('open');
  });

  elWebPreview.querySelectorAll('.web-cart-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = String(btn.dataset.id || '');
      const cartMap = getPreviewCartState();
      cartMap[id] = Math.max((cartMap[id] || 0) - 1, 0);
      if(cartMap[id] <= 0) delete cartMap[id];
      renderWebPreview();
      elWebPreview.querySelector('#webCartDrawer')?.classList.add('open');
    });
  });
  elWebPreview.querySelectorAll('.web-cart-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = String(btn.dataset.id || '');
      const cartMap = getPreviewCartState();
      cartMap[id] = (cartMap[id] || 0) + 1;
      renderWebPreview();
      elWebPreview.querySelector('#webCartDrawer')?.classList.add('open');
    });
  });

  elWebPreview.querySelector('#webSendOrderBtn')?.addEventListener('click', () => {
    const items = getPreviewCartItems();
    if(!items.length){
      alert('Agrega productos al carrito.');
      return;
    }
    if(!wa){
      alert('Captura un WhatsApp en la configuración web.');
      return;
    }
    const lines = items.map(item => `• ${item.nombre} x${item.qty} = ${money(item.qty * item.precio)}`);
    const msg = encodeURIComponent(`${title}\nPedido desde la web:\n\n${lines.join('\n')}\n\nTotal: ${money(cartTotal)}`);
    window.open(`https://wa.me/${wa}?text=${msg}`, '_blank');
  });
}

function loadWebForm(){
  if (!elWebHeroTitle) return;
  elWebHeroTitle.value = state.config.webTitle || state.config.negocio || '';
  elWebHeroDesc.value = state.config.webDescription || '';
  elWebWhatsapp.value = state.config.webWhatsapp || '';
  elWebAddress.value = state.config.webAddress || state.config.direccion || '';
  elWebCTA.value = state.config.webCTA || 'Pedir por WhatsApp';
  loadWebBannerInputs();
  renderWebProductsPicker();
  renderWebPreview();
}

function escapeHtml(str=''){
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function generarHtmlWeb(){
  const title = state.config.webTitle || state.config.negocio || 'Farmacia DP';
  const desc = state.config.webDescription || 'Atención rápida por WhatsApp';
  const wa = (state.config.webWhatsapp || '').replace(/\D/g,'');
  const cta = state.config.webCTA || 'Pedir por WhatsApp';
  const addr = state.config.webAddress || state.config.direccion || '';
  const logo = state.config.logoDataUrl || '';
  const productos = getSelectedWebProducts(99).map(p => ({
    id: getWebProductId(p),
    nombre: p.nombre || 'Producto',
    precioNum: Number(p.precio || p.precioVenta || 0) || 0,
    precio: money(p.precio || p.precioVenta || 0),
    stock: Number(p.stockPiso ?? p.stock ?? 0),
    categoria: p.categoria || 'Sin categoría',
    imagen: getWebProductImage(p)
  }));
  const categorias = Array.from(new Set(productos.map(p => p.categoria || 'General'))).slice(0, 8);

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
body{font-family:Arial,sans-serif;margin:0;background:#f8fbff;color:#0f172a}
.top{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #e5e7eb;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px}
.brand{display:flex;align-items:center;gap:10px}
.logo{width:48px;height:48px;border-radius:14px;background:#eff6ff;border:1px solid #dbeafe;display:flex;align-items:center;justify-content:center;overflow:hidden;color:#2563eb;font-weight:800}
.logo img{width:100%;height:100%;object-fit:contain;padding:6px;background:#fff}
.cartbtn{border:none;border-radius:999px;padding:10px 14px;background:#0f172a;color:#fff;font-weight:700;cursor:pointer}
.count{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;border-radius:999px;background:#fff;color:#0f172a;font-size:12px;margin-left:8px;padding:0 6px}
.hero{background:linear-gradient(135deg,#1d4ed8,#60a5fa);color:#fff;padding:28px 16px}
main{max-width:1180px;margin:0 auto;padding:0 0 22px}
.contact{margin:14px 16px 0;padding:14px;background:#fff;border:1px solid #e5e7eb;border-radius:18px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;padding:16px}
.item{border:1px solid #e5e7eb;border-radius:18px;background:#fff;overflow:hidden;display:flex;flex-direction:column}
.media{height:160px;background:#eff6ff;display:flex;align-items:center;justify-content:center;color:#2563eb;font-size:34px}
.media img{width:100%;height:100%;object-fit:cover;display:block}
.body{padding:12px}
.title{font-size:15px;font-weight:700}
.meta{font-size:12px;color:#64748b;margin-top:4px}
.price{font-size:17px;font-weight:800;color:#1d4ed8;margin-top:8px}
.note{font-size:11px;color:#2563eb;font-weight:700;margin-top:6px}
.btn{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border:none;border-radius:999px;cursor:pointer}
.drawer{position:fixed;top:0;right:0;width:min(360px,92%);height:100%;background:#fff;border-left:1px solid #dbeafe;box-shadow:-10px 0 30px rgba(15,23,42,.08);transform:translateX(100%);transition:transform .22s ease;display:flex;flex-direction:column;z-index:20}
.drawer.open{transform:translateX(0)}
.dhead{display:flex;justify-content:space-between;align-items:center;padding:14px;border-bottom:1px solid #e5e7eb}
.close{border:none;background:#eff6ff;color:#1d4ed8;width:34px;height:34px;border-radius:999px;cursor:pointer;font-weight:800}
.items{flex:1;overflow:auto;padding:12px 14px}
.line{display:grid;grid-template-columns:1fr auto;gap:10px;padding:10px 0;border-bottom:1px dashed #e5e7eb}
.line small{display:block;color:#64748b;margin-top:4px}
.qty{display:flex;gap:6px;align-items:center;margin-top:8px}
.qty button{width:28px;height:28px;border:none;border-radius:999px;background:#eff6ff;color:#1d4ed8;cursor:pointer;font-weight:800}
.footer{padding:14px;border-top:1px solid #e5e7eb}
.total{display:flex;justify-content:space-between;align-items:center;font-weight:800;margin-bottom:12px}
.empty{padding:20px 8px;color:#64748b;text-align:center;font-size:13px}
@media(max-width:720px){.grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="top">
  <div class="brand">
    <div class="logo">${logo ? `<img src="${logo}" alt="Logo">` : 'Rx'}</div>
    <div><strong style="display:block;">${escapeHtml(title)}</strong><small style="color:#64748b">Catálogo web simple</small></div>
  </div>
  <button class="cartbtn" id="cartBtn">🛒 Carrito <span class="count" id="cartCount">0</span></button>
</div>
<div class="hero">
  <h1 style="margin:0">${escapeHtml(title)}</h1>
  <p style="margin:8px 0 0">${escapeHtml(desc)}</p>
</div>
<div class="bannerwrap"><div class="bannermain"><div class="bannercard">${banner1 ? `<img src="${banner1}" alt="Banner 1">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:42px;">💊</div>`}<div class="overlay"><span class="chip">Promociones destacadas</span><div style="margin-top:10px;font-size:22px;font-weight:800;">Salud y ahorro cerca de ti</div></div></div><div class="bannercard">${banner2 ? `<img src="${banner2}" alt="Banner 2">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:42px;">🛍️</div>`}<div class="overlay"><span class="chip">Pedidos por WhatsApp</span><div style="margin-top:10px;font-size:18px;font-weight:800;">Arma tu carrito y envía tu pedido</div></div></div></div></div>
<main>
  <section class="contact">
    <strong>Contacto</strong>
    <div style="font-size:13px;color:#475569;margin-top:6px;">${escapeHtml(addr || 'Sin dirección capturada')}</div>
    <div style="font-size:13px;color:#475569;margin-top:4px;">WhatsApp: ${escapeHtml(wa || 'Sin número')}</div>
  </section>
  <section class="cats">${categorias.map(cat => `<span class="cat">${escapeHtml(cat)}</span>`).join('')}</section>
  <section class="sectionhead"><strong>Productos destacados</strong><span>${productos.length} publicados</span></section>
  <section class="grid" id="catalogGrid"></section>
</main>

<aside class="drawer" id="drawer">
  <div class="dhead">
    <strong>Tu carrito</strong>
    <button class="close" id="closeBtn" type="button">×</button>
  </div>
  <div class="items" id="cartItems"></div>
  <div class="footer">
    <div class="total"><span>Total</span><span id="cartTotal">$0.00</span></div>
    <button class="btn" id="sendBtn" type="button">${escapeHtml(cta)}</button>
  </div>
</aside>

<script>
const productos = ${JSON.stringify(productos)};
const wa = ${JSON.stringify(wa)};
const title = ${JSON.stringify(title)};
const cart = {};

const fmt = v => '$' + (Number(v)||0).toFixed(2);
const $grid = document.getElementById('catalogGrid');
const $drawer = document.getElementById('drawer');
const $cartBtn = document.getElementById('cartBtn');
const $closeBtn = document.getElementById('closeBtn');
const $cartItems = document.getElementById('cartItems');
const $cartTotal = document.getElementById('cartTotal');
const $cartCount = document.getElementById('cartCount');
const $sendBtn = document.getElementById('sendBtn');

function esc(s=''){return String(s).replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[m]));}
function renderCatalog(){
  $grid.innerHTML = productos.length ? productos.map(p => \`<article class="item">
    <div class="media">\${p.imagen ? \`<img src="\${p.imagen}" alt="\${esc(p.nombre)}">\` : '💊'}</div>
    <div class="body">
      <div class="title">\${esc(p.nombre)}</div>
      <div class="meta">\${esc(p.categoria)} · Stock: \${p.stock}</div>
      <div class="price">\${esc(p.precio)}</div>
      <div class="note">Publicado manualmente</div>
      <div style="margin-top:10px"><button class="btn addBtn" type="button" data-id="\${esc(p.id)}">Agregar</button></div>
    </div>
  </article>\`).join('') : '<div class="empty">No hay productos publicados.</div>';

  document.querySelectorAll('.addBtn').forEach(btn => btn.addEventListener('click', () => {
    const id = String(btn.dataset.id || '');
    cart[id] = (cart[id] || 0) + 1;
    renderCart();
    $drawer.classList.add('open');
  }));
}
function renderCart(){
  const items = Object.entries(cart).map(([id, qty]) => {
    const prod = productos.find(p => p.id === id);
    if(!prod || qty <= 0) return null;
    return { ...prod, qty };
  }).filter(Boolean);

  const count = items.reduce((a,i)=>a+i.qty,0);
  const total = items.reduce((a,i)=>a+(i.qty*i.precioNum),0);

  $cartCount.textContent = count;
  $cartTotal.textContent = fmt(total);

  $cartItems.innerHTML = items.length ? items.map(i => \`<div class="line">
    <div>
      <strong>\${esc(i.nombre)}</strong>
      <small>\${fmt(i.precioNum)} c/u</small>
      <div class="qty">
        <button type="button" class="minusBtn" data-id="\${esc(i.id)}">−</button>
        <span>\${i.qty}</span>
        <button type="button" class="plusBtn" data-id="\${esc(i.id)}">+</button>
      </div>
    </div>
    <div><strong>\${fmt(i.qty*i.precioNum)}</strong></div>
  </div>\`).join('') : '<div class="empty">Tu carrito está vacío.</div>';

  document.querySelectorAll('.minusBtn').forEach(btn => btn.addEventListener('click', () => {
    const id = String(btn.dataset.id || '');
    cart[id] = Math.max((cart[id] || 0) - 1, 0);
    if(cart[id] <= 0) delete cart[id];
    renderCart();
    $drawer.classList.add('open');
  }));
  document.querySelectorAll('.plusBtn').forEach(btn => btn.addEventListener('click', () => {
    const id = String(btn.dataset.id || '');
    cart[id] = (cart[id] || 0) + 1;
    renderCart();
    $drawer.classList.add('open');
  }));

  $sendBtn.onclick = () => {
    if(!wa){ alert('No hay número de WhatsApp configurado.'); return; }
    if(!items.length){ alert('Agrega productos al carrito.'); return; }
    const lines = items.map(i => '• ' + i.nombre + ' x' + i.qty + ' = ' + fmt(i.qty*i.precioNum));
    const msg = encodeURIComponent(title + '\\nPedido desde la web:\\n\\n' + lines.join('\\n') + '\\n\\nTotal: ' + fmt(total));
    window.open('https://wa.me/' + wa + '?text=' + msg, '_blank');
  };
}
$cartBtn.onclick = () => $drawer.classList.add('open');
$closeBtn.onclick = () => $drawer.classList.remove('open');
renderCatalog();
renderCart();
</script>
</body>
</html>`;
}

if (elBtnGuardarWeb){
  elBtnGuardarWeb.addEventListener('click', () => {
    state.config.webTitle = (elWebHeroTitle?.value || '').trim() || state.config.negocio || 'Farmacia DP';
    state.config.webDescription = (elWebHeroDesc?.value || '').trim();
    state.config.webWhatsapp = (elWebWhatsapp?.value || '').trim();
    state.config.webAddress = (elWebAddress?.value || '').trim();
    state.config.webCTA = (elWebCTA?.value || '').trim() || 'Pedir por WhatsApp';
    saveState();
    renderWebProductsPicker();
    renderWebPreview();
    alert('Contenido web guardado.');
  });
}

if (elBtnDescargarWeb){
  elBtnDescargarWeb.addEventListener('click', () => {
    const html = generarHtmlWeb();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pagina_farmacia_dp.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}

if (elWebProductSearch){
  elWebProductSearch.addEventListener('input', renderWebProductsPicker);
}
if (elBtnWebSelectAll){
  elBtnWebSelectAll.addEventListener('click', () => {
    const ids = getFilteredWebPickerProducts().map(getWebProductId);
    state.config.webSelectedProductIds = Array.from(new Set(ids));
    saveState();
    renderWebProductsPicker();
    renderWebPreview();
  });
}
if (elBtnWebClearAll){
  elBtnWebClearAll.addEventListener('click', () => {
    state.config.webSelectedProductIds = [];
    saveState();
    renderWebProductsPicker();
    renderWebPreview();
  });
}



