// ---------------------------
// Estado y almacenamiento
// ---------------------------
const LS_KEY = 'farmacia_dp_demo_state_v2';
let state = {
  config: {
    negocio: 'Farmacia DP',
    ivaDefault: 0,
    mensajeTicket: '¡Gracias por su compra!',
    webTitle: 'Farmacia DP, salud y ahorro cerca de ti',
    webDescription: 'Medicamentos, perfumería y atención rápida por WhatsApp.',
    webWhatsapp: '',
    webAddress: '',
    webCTA: 'Pedir por WhatsApp',
    webSelectedProductIds: []
  },
  categorias: ['Original','Genérico','Controlado','Perfumería'],
  inventario: [],
  clientes: [],
  ventas: [], // historial de tickets
  ventasMayoreo: [], // historial de tickets mayoreo
  movMayoreo: [], // movimientos mayoreo (entradas/salidas)
  movimientos: [], // kardex simple (general)
};

function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      state = Object.assign(state, parsed);
    }
  }catch(e){console.error('loadState',e);}
  if(!Array.isArray(state.categorias) || !state.categorias.length){
    state.categorias = ['Original','Genérico','Controlado','Perfumería'];
  }

  // Compatibilidad hacia atrás
  if(!Array.isArray(state.ventasMayoreo)) state.ventasMayoreo = [];
  if(!Array.isArray(state.movMayoreo)) state.movMayoreo = [];
  if(!Array.isArray(state.movimientos)) state.movimientos = [];
  if(!state.config || typeof state.config !== 'object') state.config = {};
  if(typeof state.config.logoDataUrl !== 'string') state.config.logoDataUrl = '';
  if(!Array.isArray(state.config.webSelectedProductIds)) state.config.webSelectedProductIds = [];
  if(typeof state.config.webBanner1 !== 'string') state.config.webBanner1 = '';
  if(typeof state.config.webBanner2 !== 'string') state.config.webBanner2 = '';
}
function saveState(){
  try{
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }catch(e){console.error('saveState',e);}
}
function money(v){return '$'+(Number(v)||0).toFixed(2);}

loadState();

// Asegurar estructura de lotes en inventario
function ensureLotesStructure() {
  if (!Array.isArray(state.inventario)) state.inventario = [];
  state.inventario.forEach(p => {
    if (!Array.isArray(p.lotes)) p.lotes = [];
    // Normalizar campos numéricos
    p.stockPiso = Number(p.stockPiso ?? p.stock ?? 0) || 0;
    p.stockBodega = Number(p.stockBodega ?? 0) || 0;
    p.stockMin = Number(p.stockMin ?? 0) || 0;
  });
}
ensureLotesStructure();

// ---------------------------
// Navegación SPA
// ---------------------------
const navItems = document.querySelectorAll('.nav-item');
const pages = {
  dashboard: document.getElementById('page-dashboard'),
  dashboard_mayoreo: document.getElementById('page-dashboard_mayoreo'),
  ventas: document.getElementById('page-ventas'),
  inventario: document.getElementById('page-inventario'),
  bodega: document.getElementById('page-bodega'),
  clientes: document.getElementById('page-clientes'),
  historial: document.getElementById('page-historial'),
  reportes: document.getElementById('page-reportes'),
  ventas_mayoreo: document.getElementById('page-ventas_mayoreo'),
  inventario_mayoreo: document.getElementById('page-inventario_mayoreo'),
  historial_mayoreo: document.getElementById('page-historial_mayoreo'),
  reportes_mayoreo: document.getElementById('page-reportes_mayoreo'),
  clientes_mayoreo: document.getElementById('page-clientes_mayoreo'),
  config: document.getElementById('page-config'),
  pagina: document.getElementById('page-pagina'),
};
const pageTitle = document.getElementById('pageTitle');
const sidebar = document.getElementById('sidebar');
const btnBurger = document.getElementById('btnBurger');
const MOBILE_BREAKPOINT = 820;
let menuCollapsed = localStorage.getItem('farmacia_dp_menu_collapsed') === '1';

function syncMenuState(){
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  document.body.classList.toggle('menu-collapsed', menuCollapsed && !isMobile);
  if (isMobile){
    sidebar.classList.remove('open');
  } else {
    sidebar.classList.remove('open');
  }
}

function toggleMenu(){
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  if (isMobile){
    sidebar.classList.toggle('open');
    return;
  }
  menuCollapsed = !menuCollapsed;
  localStorage.setItem('farmacia_dp_menu_collapsed', menuCollapsed ? '1' : '0');
  syncMenuState();
}


function getPageFromHashSafe(){
  const raw = (window.location.hash || '').replace(/^#/, '').trim();
  if(!raw) return 'dashboard';
  const allowed = new Set(['dashboard','dashboard_mayoreo','ventas','ventas_mayoreo','inventario','inventario_mayoreo','bodega','clientes','clientes_mayoreo','historial','historial_mayoreo','reportes','reportes_mayoreo','pagina','config']);
  return allowed.has(raw) ? raw : 'dashboard';
}

function openPageSafe(page){
  const target = pages[page] ? page : 'dashboard';
  navItems.forEach(i => i.classList.toggle('active', i.dataset.page === target));
  Object.values(pages).forEach(p => p.classList.remove('active'));
  if (pages[target]) pages[target].classList.add('active');

  const activeItem = Array.from(navItems).find(i => i.dataset.page === target);
  if (pageTitle && activeItem) pageTitle.textContent = activeItem.textContent.trim();

  if (window.innerWidth <= MOBILE_BREAKPOINT && sidebar) sidebar.classList.remove('open');

  if(target==='dashboard' && typeof renderDashboard==='function') renderDashboard();
  if(target==='dashboard_mayoreo' && typeof renderDashboardMayoreo==='function') renderDashboardMayoreo();
  if(target==='ventas' && typeof renderVentas==='function') renderVentas();
  if(target==='ventas_mayoreo' && typeof renderVentasMayoreo==='function') renderVentasMayoreo();
  if(target==='inventario' && typeof renderInventario==='function') renderInventario();
  if(target==='inventario_mayoreo' && typeof renderInventarioMayoreo==='function') renderInventarioMayoreo();
  if(target==='bodega' && typeof renderBodega==='function') renderBodega();
  if(target==='clientes' && typeof renderClientes==='function') renderClientes();
  if(target==='clientes_mayoreo' && typeof renderClientesMayoreo==='function') renderClientesMayoreo();
  if(target==='historial' && typeof renderHistorial==='function') renderHistorial();
  if(target==='historial_mayoreo' && typeof renderHistorialMayoreo==='function') renderHistorialMayoreo();
  if(target==='reportes' && typeof renderReportes==='function') renderReportes();
  if(target==='reportes_mayoreo' && typeof renderReportesMayoreo==='function') renderReportesMayoreo();
  if(target==='pagina' && typeof renderWebPreview==='function') renderWebPreview();
}

window.addEventListener('hashchange', () => {
  try {
    openPageSafe(getPageFromHashSafe());
  } catch (err) {
    console.error('Error al cambiar de módulo por hash:', err);
    openPageSafe('dashboard');
  }
});

navItems.forEach(item=>{
  item.addEventListener('click',()=>{
    const page = item.dataset.page;
    navItems.forEach(i=>i.classList.remove('active'));
    item.classList.add('active');
    Object.values(pages).forEach(p=>p.classList.remove('active'));
    pages[page].classList.add('active');
    pageTitle.textContent = item.textContent.trim();
    if (window.innerWidth <= MOBILE_BREAKPOINT) sidebar.classList.remove('open');

    if(page==='dashboard') renderDashboard();
    if(page==='dashboard_mayoreo' && typeof renderDashboardMayoreo==='function') renderDashboardMayoreo();
    if(page==='ventas') { renderCatalog(currentFilter); paintCart(); }
    if(page==='ventas_mayoreo') { renderCatalogMay(currentFilterMay); paintCartMay(); }
    if(page==='inventario') renderInventario();
    if(page==='inventario_mayoreo') renderInventarioMayoreo();
    if(page==='bodega') renderBodega();
    if(page==='clientes') renderClientes();
    if(page==='clientes_mayoreo' && typeof renderClientesMayoreo==='function') renderClientesMayoreo();
    if(page==='historial') renderHistorial();
    if(page==='historial_mayoreo') renderHistorialMayoreo();
    if(page==='reportes') renderReportes();
    if(page==='reportes_mayoreo') renderReportesMayoreo();
    if(page==='config') loadConfigForm();
    if(page==='pagina') loadWebForm();
  });
});

btnBurger.addEventListener('click', toggleMenu);
window.addEventListener('resize', syncMenuState);
syncMenuState();

// ---------------------------


// ---------------------------
// PWA / instalación
// ---------------------------
let deferredPrompt = null;
const btnInstallApp = document.getElementById('btnInstallApp');
const storageBadge = document.getElementById('storageBadge');
const btnResetCache = document.getElementById('btnResetCache');

function updateStorageBadge(){
  if(!storageBadge) return;
  storageBadge.textContent = 'Guardado local activo';
}
updateStorageBadge();

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (btnInstallApp) btnInstallApp.style.display = 'inline-flex';
});

if (btnInstallApp){
  btnInstallApp.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    btnInstallApp.style.display = 'none';
  });
}

window.addEventListener('appinstalled', () => {
  if (btnInstallApp) btnInstallApp.style.display = 'none';
});

if (btnResetCache){
  btnResetCache.addEventListener('click', async () => {
    if (!('caches' in window)) {
      alert('La caché PWA no está disponible en este navegador.');
      return;
    }
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    alert('Caché reiniciada. Recarga la app.');
  });
}


window.addEventListener('error', (event) => {
  console.error('Error global de la app:', event.error || event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('Promesa no controlada:', event.reason);
});
