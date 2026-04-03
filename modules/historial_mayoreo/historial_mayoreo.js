// HISTORIAL MAYOREO

const elHistMaySearch = document.getElementById('histMaySearch');
const elHistMayBtnHoy = document.getElementById('histMayBtnHoy');
const elHistMayBtnTodo = document.getElementById('histMayBtnTodo');
const elHistorialMayList = document.getElementById('historialMayList');

let histMayOnlyToday = false;

function sameDay(a,b){
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

function printTicketMayoreo(ticket){
  // Reusar builder de ventas mayoreo si está disponible
  const text = (typeof buildTicketTextMay === 'function') ? buildTicketTextMay(ticket) : JSON.stringify(ticket,null,2);
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>${ticket.negocio||'Farmacia'} - ${ticket.id}</title>
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
  const w = window.open('','ticketMay','width=380,height=600');
  if(!w){alert('No se pudo abrir ventana de impresión. Revisa bloqueador de popups.');return;}
  w.document.open();w.document.write(html);w.document.close();
}

function renderHistorialMayoreo(){
  if(!elHistorialMayList) return;
  elHistorialMayList.innerHTML='';

  const q = (elHistMaySearch ? elHistMaySearch.value.trim().toLowerCase() : '');
  const hoy = new Date();

  const list = (state.ventasMayoreo||[]).slice().reverse().filter(t=>{
    if(histMayOnlyToday){
      const d = new Date(t.ts || t.fecha || t.fechaISO || Date.now());
      if(!sameDay(d,hoy)) return false;
    }
    if(!q) return true;
    const hay = [t.id,t.cliente,t.tipoCliente,t.formaPago,t.notas]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if(hay.includes(q)) return true;
    // buscar en items
    if(Array.isArray(t.items)){
      return t.items.some(it=> (it.nombre||'').toLowerCase().includes(q) || (it.sku||'').toLowerCase().includes(q));
    }
    return false;
  });

  if(!list.length){
    elHistorialMayList.innerHTML='<div style="color:#6b7280;font-size:13px;">Sin tickets mayoreo.</div>';
    return;
  }

  list.forEach(t=>{
    const card = document.createElement('div');
    card.className='historial-item';
    const fecha = t.fechaTexto || new Date(t.ts||Date.now()).toLocaleString();
    const total = money(t.total||0);
    const cliente = t.cliente || '(Sin cliente)';
    const tipo = t.tipoCliente || '';

    const itemsTxt = (t.items||[]).map(it=>`${it.cant}x ${it.nombre}`).slice(0,3).join(' · ');

    card.innerHTML = `
      <div class="historial-left">
        <div class="historial-title">${t.id} · <strong>${total}</strong></div>
        <div class="historial-sub">${fecha} · ${cliente}${tipo?` · ${tipo}`:''}</div>
        <div class="historial-sub" style="margin-top:4px;">${itemsTxt}${(t.items||[]).length>3?' …':''}</div>
      </div>
      <div class="historial-right">
        <button class="btn btn-soft" data-act="print">Imprimir</button>
      </div>
    `;
    card.querySelector('[data-act="print"]').addEventListener('click',()=>printTicketMayoreo(t));
    elHistorialMayList.appendChild(card);
  });
}

if(elHistMaySearch){
  elHistMaySearch.addEventListener('input',renderHistorialMayoreo);
}
if(elHistMayBtnHoy){
  elHistMayBtnHoy.addEventListener('click',()=>{ histMayOnlyToday=true; renderHistorialMayoreo(); });
}
if(elHistMayBtnTodo){
  elHistMayBtnTodo.addEventListener('click',()=>{ histMayOnlyToday=false; renderHistorialMayoreo(); });
}

// Render inicial
try{ renderHistorialMayoreo(); }catch(e){ /* noop */ }
