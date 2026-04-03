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
const elCfgColorBg      = document.getElementById('cfgColorBg');
const elCfgColorBgText  = document.getElementById('cfgColorBgText');
const elCfgColorSidebar = document.getElementById('cfgColorSidebar');
const elCfgColorSidebarText = document.getElementById('cfgColorSidebarText');
const elCfgColorPrimary = document.getElementById('cfgColorPrimary');
const elCfgColorPrimaryText = document.getElementById('cfgColorPrimaryText');
const elCfgColorCard    = document.getElementById('cfgColorCard');
const elCfgColorCardText = document.getElementById('cfgColorCardText');
const elBtnResetTheme   = document.getElementById('btnResetTheme');
const elThemePreviewPanel = document.getElementById('themePreviewPanel');
const elThemePreviewMenu = document.getElementById('themePreviewMenu');
const elThemePreviewBtn = document.getElementById('themePreviewBtn');
const elThemePreviewCard = document.getElementById('themePreviewCard');
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




function normalizeHexColor(value, fallback){
  const v = String(value || '').trim();
  if(/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if(/^#[0-9a-fA-F]{3}$/.test(v)) return '#' + v.slice(1).split('').map(x => x + x).join('');
  return fallback;
}

function setColorPair(inputColor, inputText, value){
  const safe = normalizeHexColor(value, '#ffffff');
  if(inputColor) inputColor.value = safe;
  if(inputText) inputText.value = safe;
  return safe;
}

function getThemeValuesFromInputs(){
  return {
    bg: normalizeHexColor(elCfgColorBgText?.value || elCfgColorBg?.value, '#f4f7fb'),
    sidebar: normalizeHexColor(elCfgColorSidebarText?.value || elCfgColorSidebar?.value, '#0f62ff'),
    primary: normalizeHexColor(elCfgColorPrimaryText?.value || elCfgColorPrimary?.value, '#2563eb'),
    card: normalizeHexColor(elCfgColorCardText?.value || elCfgColorCard?.value, '#ffffff'),
  };
}

function renderThemePreview(){
  const colors = getThemeValuesFromInputs();
  if(elThemePreviewPanel) elThemePreviewPanel.style.background = colors.bg;
  if(elThemePreviewMenu) elThemePreviewMenu.style.background = colors.sidebar;
  if(elThemePreviewBtn) elThemePreviewBtn.style.background = colors.primary;
  if(elThemePreviewCard) elThemePreviewCard.style.background = colors.card;
}

function applyThemeFromInputsLive(){
  const colors = getThemeValuesFromInputs();
  setColorPair(elCfgColorBg, elCfgColorBgText, colors.bg);
  setColorPair(elCfgColorSidebar, elCfgColorSidebarText, colors.sidebar);
  setColorPair(elCfgColorPrimary, elCfgColorPrimaryText, colors.primary);
  setColorPair(elCfgColorCard, elCfgColorCardText, colors.card);

  state.config.themeBg = colors.bg;
  state.config.themeSidebar = colors.sidebar;
  state.config.themePrimary = colors.primary;
  state.config.themeCard = colors.card;

  if(typeof applyTheme === 'function') applyTheme();
  renderThemePreview();
}

function renderLogoPreview(){
  if(!elCfgLogoPreview || !elCfgLogoPreviewWrap) return;
  const logo = state.config.logoDataUrl || '';
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
  if(elCfgNegocio) elCfgNegocio.value = state.config.negocio || '';
  if(elCfgRFC) elCfgRFC.value = state.config.rfc || '';
  if(elCfgDireccion) elCfgDireccion.value = state.config.direccion || '';
  if(elCfgTelefono) elCfgTelefono.value = state.config.telefono || '';
  if(elCfgIva) elCfgIva.value = state.config.ivaDefault || 0;
  if(elCfgMensaje) elCfgMensaje.value = state.config.mensajeTicket || '';

  setColorPair(elCfgColorBg, elCfgColorBgText, state.config.themeBg || '#f4f7fb');
  setColorPair(elCfgColorSidebar, elCfgColorSidebarText, state.config.themeSidebar || '#0f62ff');
  setColorPair(elCfgColorPrimary, elCfgColorPrimaryText, state.config.themePrimary || '#2563eb');
  setColorPair(elCfgColorCard, elCfgColorCardText, state.config.themeCard || '#ffffff');

  renderLogoPreview();
  renderSidebarLogo();
  renderThemePreview();
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


[elCfgColorBg, elCfgColorSidebar, elCfgColorPrimary, elCfgColorCard].filter(Boolean).forEach(inp => {
  inp.addEventListener('input', applyThemeFromInputsLive);
  inp.addEventListener('change', applyThemeFromInputsLive);
});
[elCfgColorBgText, elCfgColorSidebarText, elCfgColorPrimaryText, elCfgColorCardText].filter(Boolean).forEach(inp => {
  inp.addEventListener('input', renderThemePreview);
  inp.addEventListener('change', applyThemeFromInputsLive);
});

if (elBtnResetTheme){
  elBtnResetTheme.addEventListener('click', () => {
    state.config.themeBg = '#f4f7fb';
    state.config.themeSidebar = '#0f62ff';
    state.config.themePrimary = '#2563eb';
    state.config.themeCard = '#ffffff';
    saveState();
    loadConfigForm();
if(typeof applyTheme === 'function') applyTheme();
    renderThemePreview();
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
  state.config.negocio = elCfgNegocio.value.trim() || 'Farmacia DP';
  state.config.rfc = elCfgRFC.value.trim() || '';
  state.config.direccion = elCfgDireccion.value.trim() || '';
  state.config.telefono = elCfgTelefono.value.trim() || '';
  state.config.ivaDefault = Number(elCfgIva.value || 0);
  state.config.mensajeTicket = elCfgMensaje.value.trim() || '';

  const colors = getThemeValuesFromInputs();
  state.config.themeBg = colors.bg;
  state.config.themeSidebar = colors.sidebar;
  state.config.themePrimary = colors.primary;
  state.config.themeCard = colors.card;

  saveState();
  loadConfigForm();
  if(typeof applyTheme === 'function') applyTheme();
  renderSidebarLogo();
  renderLogoPreview();
  renderThemePreview();
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
  const productos = getSelectedWebProducts().map(p => ({
    nombre: p.nombre || 'Producto',
    precio: money(p.precioVenta || p.precio || 0),
    stock: Number(p.stockPiso ?? p.stock ?? 0)
  }));
  const cards = productos.map(p => `<article class="item"><h3>${escapeHtml(p.nombre)}</h3><p>${escapeHtml(p.precio)}</p><small>Stock: ${p.stock}</small></article>`).join('');
  const waLink = wa ? `https://wa.me/${wa}` : '#';
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>body{font-family:Arial,sans-serif;margin:0;background:#f8fbff;color:#0f172a}header{background:linear-gradient(135deg,#1d4ed8,#60a5fa);color:#fff;padding:48px 20px}main{max-width:1100px;margin:0 auto;padding:24px 20px}a.btn{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;margin-top:14px}.panel{background:#fff;border:1px solid #dbeafe;border-radius:18px;padding:18px;box-shadow:0 10px 25px rgba(15,23,42,.06)}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-top:16px}.item{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:14px}.item h3{margin:0 0 8px;font-size:16px}.muted{color:#475569}.footer{padding:24px 20px;color:#64748b;text-align:center}</style>
</head>
<body>
<header><h1>${escapeHtml(title)}</h1><p>${escapeHtml(desc)}</p><a class="btn" href="${waLink}">${escapeHtml(cta)}</a></header>
<main><section class="panel"><h2>Contacto</h2><p class="muted">${escapeHtml(addr || 'Dirección pendiente')}</p><p class="muted">WhatsApp: ${escapeHtml(wa || 'Pendiente')}</p></section><section style="margin-top:18px;"><h2>Productos publicados</h2><div class="grid">${cards || '<p class="muted">No has seleccionado productos para publicar.</p>'}</div></section></main>
<div class="footer">Sitio generado desde Farmacia DP</div>
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
    const html = generarHtmlWeb();
    const blob = new Blob([html], { type:'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'farmacia_web_simple.html';
    a.click();
    URL.revokeObjectURL(url);
  });
}
