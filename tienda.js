// ════════════════════════════════════════════════════════
// DROPDOWN NAV — click para abrir/cerrar
// ════════════════════════════════════════════════════════
function initDropdowns() {
  document.querySelectorAll('.cat-nav-item').forEach(item => {
    const btn      = item.querySelector('.cat-nav-btn')
    const dropdown = item.querySelector('.cat-dropdown')
    if (!btn || !dropdown) return

    // Toggle al hacer click en el botón
    btn.addEventListener('click', (e) => {
      const isOpen = item.classList.contains('open')
      // Cerrar todos los dropdowns
      document.querySelectorAll('.cat-nav-item.open').forEach(i => i.classList.remove('open'))
      // Si estaba cerrado, abrir este
      if (!isOpen) {
        e.stopPropagation()
        item.classList.add('open')
      }
    })

    // Click en un item del dropdown navega y cierra
    dropdown.querySelectorAll('.cat-dropdown-item').forEach(di => {
      di.addEventListener('click', () => {
        document.querySelectorAll('.cat-nav-item.open').forEach(i => i.classList.remove('open'))
      })
    })
  })

  // Cerrar dropdown al hacer click fuera
  document.addEventListener('click', () => {
    document.querySelectorAll('.cat-nav-item.open').forEach(i => i.classList.remove('open'))
  })
}

// ═══════════════════════════════════════════════════════
// MARY KAY HONDURAS — Tienda v5
// Cambios: dropdown nav, banners dinámicos, variantes,
// pago con tarjeta, sin plazos, subcategorías
// ═══════════════════════════════════════════════════════

const SUPABASE_URL = 'https://knoxphxvmjvkdioeopbi.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtub3hwaHh2bWp2a2Rpb2VvcGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzUxNjEsImV4cCI6MjA5MTQxMTE2MX0.4XSZGDibY6z0wdA0UysExc1Yt-yMmckfNs7nxU3fZUo'
const WA_NUMBER = '50498589303'

const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_KEY)
const fmt = n => `L ${Number(n||0).toLocaleString('es-HN',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const esc = s => String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')

// ── Estado global ──────────────────────────────────────
let todosProductos = []
let banners        = []
let variantesMap   = {}   // { productoId: [variante,...] }
let carrito        = []
let paginaActiva   = 'novedades'
let productoModal  = null
let qtyModal       = 1
let varianteSeleccionada = null
let usuarioActual  = null
let clienteActual  = null

// ── Definición de sub-secciones por categoría ──────────
const SUBSECCIONES = {
  skincare: [
    { id:'clinical',   label:'Clinical Solutions', icon:'🔬', clase:'sb-clinical' },
    { id:'timewise',   label:'TimeWise®',           icon:'⏱️', clase:'sb-timewise' },
    { id:'repair',     label:'TimeWise Repair®',    icon:'✨', clase:'sb-repair'   },
    { id:'basica',     label:'Skincare Básica',      icon:'🧴', clase:'sb-basica'   },
    { id:'clearproof', label:'Clear Proof® — Acné', icon:'💧', clase:'sb-clearproof'},
    { id:'mkmen',      label:'MKMen® — Para Él',    icon:'🧔', clase:'sb-mkmen'    },
    { id:'especial',   label:'Soluciones Especiales',icon:'💎', clase:'sb-especial' },
  ],
  maquillaje: [
    { id:'rostro', label:'Rostro',    icon:'🎨', clase:'sb-rostro' },
    { id:'ojos',   label:'Ojos',      icon:'👁️', clase:'sb-ojos'  },
    { id:'labios', label:'Labios',    icon:'💋', clase:'sb-labios' },
  ],
  fragancias: [
    { id:'fragella', label:'Para Ella', icon:'🌸', clase:'sb-fragella' },
    { id:'fragel',   label:'Para Él',   icon:'🧔', clase:'sb-fragel'   },
  ],
  cuidado: [
    { id:'satin', label:'Satin Body / Hands / Lips', icon:'🛁', clase:'sb-satin' },
    { id:'corpo', label:'Geles y Lociones',           icon:'🚿', clase:'sb-corpo' },
  ],
  sets: [
    { id:'set-timewise',   label:'TimeWise®',           icon:'⏱️', clase:'sb-set-timewise'   },
    { id:'set-repair',     label:'TimeWise Repair®',    icon:'✨', clase:'sb-set-repair'     },
    { id:'set-skincare',   label:'Skin Care Básico',    icon:'🧴', clase:'sb-set-skincare'   },
    { id:'set-clearproof', label:'Clear Proof®',        icon:'💧', clase:'sb-set-clearproof' },
    { id:'set-mkmen',      label:'MKMen®',              icon:'🧔', clase:'sb-set-mkmen'      },
    { id:'set-satin',      label:'Satin & Especiales',  icon:'🎁', clase:'sb-set-satin'      },
  ],
}

// Mapa de subcategoria DB → id de subsección
const SUBCAT_MAP = {
  'Clinical Solutions':'clinical','TimeWise':'timewise','TimeWise Repair':'repair',
  'Skincare Básica':'basica','Clear Proof':'clearproof','MKMen':'mkmen',
  'Soluciones Especiales':'especial',
  'Rostro':'rostro','Ojos':'ojos','Labios':'labios','Chromafusion':'ojos',
  'Fragancias Ella':'fragella','Fragancias Él':'fragel',
  'Satin':'satin','Corporales':'corpo',
  'TimeWise Set':'set-timewise','TimeWise Repair Set':'set-repair',
  'Skin Care Set':'set-skincare','Clear Proof Set':'set-clearproof',
  'MKMen Set':'set-mkmen','Satin Set':'set-satin',
}

// ════════════════════════════════════════════════════════
// CARGA DE DATOS
// ════════════════════════════════════════════════════════
async function cargarTodo() {
  const [{ data: prods }, { data: bans }, { data: varis }] = await Promise.all([
    db.from('v_productos').select('*').order('nombre'),
    db.from('banners').select('*').eq('activo', true).order('orden'),
    db.from('producto_variantes').select('*').eq('activo', true).order('orden'),
  ])

  todosProductos = prods || []
  banners        = bans  || []

  // Agrupar variantes por producto
  variantesMap = {}
  ;(varis || []).forEach(v => {
    if (!variantesMap[v.producto_id]) variantesMap[v.producto_id] = []
    variantesMap[v.producto_id].push(v)
  })

  renderPagina(paginaActiva)

  // Tiempo real
  db.channel('tienda-realtime')
    .on('postgres_changes',{event:'*',schema:'public',table:'productos'},  cargarTodo)
    .on('postgres_changes',{event:'*',schema:'public',table:'banners'},     cargarTodo)
    .on('postgres_changes',{event:'*',schema:'public',table:'producto_variantes'}, cargarTodo)
    .on('postgres_changes',{event:'*',schema:'public',table:'pedido_items'},cargarTodo)
    .subscribe()
}

// ════════════════════════════════════════════════════════
// 1. NAVEGACIÓN — cambiar página
// ════════════════════════════════════════════════════════
function cambiarPagina(pagina, subseccion) {
  if (busquedaActiva) limpiarBusqueda()

  document.querySelectorAll('.cat-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === pagina))
  document.querySelectorAll('.cat-page').forEach(p => p.classList.remove('active'))
  const pg = document.getElementById('page-' + pagina)
  if (pg) pg.classList.add('active')
  paginaActiva = pagina

  renderPagina(pagina)
  window.scrollTo({ top: 0, behavior: 'smooth' })

  // Scroll a subsección si se indicó
  if (subseccion) {
    setTimeout(() => {
      const el = document.getElementById('sub-' + subseccion)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
  }
}

// ════════════════════════════════════════════════════════
// 2. RENDER DE CADA PÁGINA
// ════════════════════════════════════════════════════════
function renderPagina(pagina) {
  if (!todosProductos.length && pagina !== 'novedades') return

  switch(pagina) {
    case 'novedades':
      renderBannersNovedades()
      renderGrid('grid-novedades', todosProductos.filter(p => p.es_novedad))
      break
    case 'skincare':
      renderSubsecciones('skincare', p => p.categoria === 'Skincare' || (p.categoria === 'Cuidado Personal' && ['mkmen','especial'].includes(SUBCAT_MAP[p.subcategoria])))
      break
    case 'maquillaje':
      renderSubsecciones('maquillaje', p => p.categoria === 'Maquillaje')
      break
    case 'fragancias':
      renderSubsecciones('fragancias', p => p.categoria === 'Fragancias')
      break
    case 'cuidado':
      renderSubsecciones('cuidado', p => p.categoria === 'Cuidado Personal' && !['mkmen','especial'].includes(SUBCAT_MAP[p.subcategoria]))
      break
    case 'herramientas':
      renderGrid('grid-herramientas', todosProductos.filter(p => p.categoria === 'Herramientas'))
      break
    case 'sets':
      renderSubsecciones('sets', p => p.categoria === 'Sets y Regalos')
      break
  }
}

// Renderiza sub-secciones dinámicamente dentro de una página
function renderSubsecciones(pagina, filtroGlobal) {
  const subs = SUBSECCIONES[pagina] || []
  subs.forEach(sub => {
    const gridId = 'grid-' + pagina + '-' + sub.id
    const prods  = todosProductos.filter(p => filtroGlobal(p) && SUBCAT_MAP[p.subcategoria] === sub.id)
    renderGrid(gridId, prods)
  })
}

// Banners dinámicos desde Supabase
function renderBannersNovedades() {
  const wrap = document.getElementById('banners-novedades')
  if (!wrap) return
  const bansNov = banners.filter(b => b.pagina === 'novedades')
  // Si no hay banners en DB, mostrar banners estáticos por defecto
  if (!bansNov.length) {
    wrap.innerHTML = `
      <div class="promo-card promo-mask"><div class="pc-text"><span class="pc-tag">¡NUEVO!</span><h3>Hydrating Cream Mask</h3><p>Tu aliada para hidratar sin enjuagar. 12 horas de hidratación.</p></div><span class="pc-emoji">🫧</span></div>
      <div class="promo-card promo-gloss"><div class="pc-text"><span class="pc-tag">Edición Limitada</span><h3>Lip Gloss Primavera</h3><p>Lilac Love, Cherry Red y Rose Noir. Hidrata y brilla.</p></div><span class="pc-emoji">💋</span></div>
      <div class="promo-card promo-bronzer"><div class="pc-text"><span class="pc-tag">Edición Limitada</span><h3>Illuminating Bronzer</h3><p>Medium Glow y Deep Glow para cada tono de piel.</p></div><span class="pc-emoji">☀️</span></div>
      <div class="promo-card promo-aftersun"><div class="pc-text"><span class="pc-tag">Edición Especial</span><h3>After-Sun Gel</h3><p>¡De vuelta por demanda popular! Calma tu piel post-sol.</p></div><span class="pc-emoji">🌊</span></div>`
    return
  }
  wrap.style.display = ''
  wrap.innerHTML = bansNov.map(b => `
    <div class="promo-card ${b.estilo || 'promo-mask'}">
      <div class="pc-text">
        <span class="pc-tag">${esc(b.etiqueta)}</span>
        <h3>${esc(b.titulo)}</h3>
        <p>${esc(b.descripcion || '')}</p>
      </div>
      <span class="pc-emoji">${b.emoji || '🌸'}</span>
    </div>`).join('')
}

// ════════════════════════════════════════════════════════
// RENDER GRILLA
// ════════════════════════════════════════════════════════
function renderGrid(gridId, lista) {
  const grid = document.getElementById(gridId)
  if (!grid) return
  if (!lista.length) { grid.innerHTML = ''; return }

  grid.innerHTML = lista.map(p => {
    const agotado  = p.alerta === 'AGOTADO'
    const bajo     = p.alerta === 'BAJO'
    const enCarrito = carrito.find(i => i.id === p.id)
    const img = p.imagen_url
      ? `<img src="${p.imagen_url}" alt="${esc(p.nombre)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=pc-placeholder>💄</div>'">`
      : `<div class="pc-placeholder">💄</div>`

    return `
    <div class="product-card ${agotado?'agotado':''}" onclick="abrirModalProducto('${p.id}')">
      <div class="pc-img-wrap">
        ${img}
        ${agotado?'<span class="pc-overlay-badge agotado">Agotado</span>':bajo?'<span class="pc-overlay-badge bajo">Últimas</span>':p.es_novedad?'<span class="pc-overlay-badge nuevo">¡Nuevo!</span>':''}
        <div class="pc-quick-add">${agotado?'Agotado':enCarrito?'✓ En carrito':'🛍️ Ver y agregar'}</div>
      </div>
      <div class="pc-body">
        <div class="pc-cat">${p.subcategoria || p.categoria}</div>
        <div class="pc-name">${esc(p.nombre)}</div>
        <div class="pc-price-row">
          <span class="pc-price">${fmt(p.precio_venta)}</span>
          <span class="pc-stock-badge ${p.alerta.toLowerCase()}">${agotado?'Agotado':bajo?'Últimas':'Disponible'}</span>
        </div>
      </div>
    </div>`
  }).join('')
}

// ════════════════════════════════════════════════════════
// BÚSQUEDA
// ════════════════════════════════════════════════════════
let busquedaActiva = false
document.getElementById('buscar-input')?.addEventListener('input', e => {
  const q = e.target.value.toLowerCase().trim()
  if (!q) { limpiarBusqueda(); return }
  busquedaActiva = true
  document.querySelectorAll('.cat-page').forEach(p => p.style.display = 'none')
  let sr = document.getElementById('search-results-page')
  if (!sr) {
    sr = document.createElement('div')
    sr.id = 'search-results-page'
    document.querySelector('.site-main').prepend(sr)
  }
  const found = todosProductos.filter(p =>
    p.nombre.toLowerCase().includes(q) || (p.categoria||'').toLowerCase().includes(q) || (p.subcategoria||'').toLowerCase().includes(q))
  sr.style.display = 'block'
  sr.innerHTML = `<div style="max-width:1200px;margin:0 auto;padding:24px">
    <p style="font-size:14px;color:#9ca3af;margin-bottom:18px">${found.length} resultado${found.length!==1?'s':''} para "<strong>${q}</strong>"</p>
    <div class="products-grid" id="grid-search"></div></div>`
  renderGrid('grid-search', found)
})

function limpiarBusqueda() {
  busquedaActiva = false
  const sr = document.getElementById('search-results-page')
  if (sr) sr.style.display = 'none'
  document.querySelectorAll('.cat-page').forEach(p => p.style.display='')
  document.getElementById('page-'+paginaActiva)?.classList.add('active')
}

// ════════════════════════════════════════════════════════
// 6. MODAL PRODUCTO CON VARIANTES
// ════════════════════════════════════════════════════════
function abrirModalProducto(id) {
  const p = todosProductos.find(x => x.id === id)
  if (!p) return
  productoModal = p; qtyModal = 1; varianteSeleccionada = null

  const imgWrap = document.getElementById('pm-img-wrap')
  imgWrap.innerHTML = p.imagen_url
    ? `<img src="${p.imagen_url}" alt="${esc(p.nombre)}" onerror="this.parentElement.innerHTML='<div class=pm-img-placeholder>💄</div>'">`
    : `<div class="pm-img-placeholder">💄</div>`

  document.getElementById('pm-cat').textContent    = p.subcategoria || p.categoria
  document.getElementById('pm-nombre').textContent = p.nombre
  document.getElementById('pm-precio').textContent = fmt(p.precio_venta)
  document.getElementById('pm-qty').textContent    = '1'

  const stockEl = document.getElementById('pm-stock')
  stockEl.textContent = p.alerta==='AGOTADO'?'Sin stock disponible':p.alerta==='BAJO'?`¡Solo quedan ${p.stock_actual} unidades!`:`Disponible · ${p.stock_actual} en stock`
  stockEl.style.color = p.alerta==='AGOTADO'?'var(--red)':p.alerta==='BAJO'?'var(--amber)':'var(--green)'

  // Variantes
  const varis = variantesMap[id] || []
  const varSection = document.getElementById('pm-variantes')
  if (varis.length) {
    const nombre = varis[0].nombre_variante || 'Opción'
    varSection.innerHTML = `
      <label>${esc(nombre)}</label>
      <div class="variantes-grid">
        ${varis.map(v => `<button class="variante-btn" onclick="seleccionarVariante('${v.id}',this)" data-vid="${v.id}" data-valor="${esc(v.valor)}" data-precio="${v.precio_extra||0}">${esc(v.valor)}</button>`).join('')}
      </div>`
    varSection.style.display = 'block'
  } else {
    varSection.innerHTML = ''
    varSection.style.display = 'none'
  }

  document.getElementById('pm-badge-row').innerHTML = `
    <span style="font-size:11px;background:var(--mk-xlight);color:var(--mk-dark);padding:4px 10px;border-radius:99px;font-weight:700">${esc(p.subcategoria||p.categoria)}</span>
    ${p.es_novedad?'<span style="font-size:11px;background:var(--mk);color:#fff;padding:4px 10px;border-radius:99px;font-weight:700">¡Nuevo!</span>':''}
    ${p.alerta==='BAJO'?'<span style="font-size:11px;background:#fffbeb;color:var(--amber);padding:4px 10px;border-radius:99px;font-weight:700">Pocas unidades</span>':''}`

  const addBtn = document.getElementById('pm-add-btn')
  addBtn.disabled    = p.alerta === 'AGOTADO'
  addBtn.textContent = p.alerta === 'AGOTADO' ? '🚫 Agotado' : '🛍️ Agregar al carrito'

  document.getElementById('pm-meta').innerHTML = `
    <span class="pm-meta-item">Código: ${p.codigo}</span>
    <span class="pm-meta-item">Producto Mary Kay original</span>
    <span class="pm-meta-item">Envío a todo Honduras</span>`

  document.getElementById('modal-producto').classList.add('open')
  document.body.style.overflow = 'hidden'
}

function seleccionarVariante(vid, btn) {
  document.querySelectorAll('.variante-btn').forEach(b => b.classList.remove('selected'))
  btn.classList.add('selected')
  const v = (variantesMap[productoModal?.id] || []).find(x => x.id === vid)
  varianteSeleccionada = v
  // Actualizar precio si hay precio extra
  if (v && productoModal) {
    const total = Number(productoModal.precio_venta) + Number(v.precio_extra || 0)
    document.getElementById('pm-precio').textContent = fmt(total)
  }
}

function cerrarModalProducto() {
  document.getElementById('modal-producto').classList.remove('open')
  document.body.style.overflow = ''
  productoModal = null; varianteSeleccionada = null
}

function cambiarQtyModal(delta) {
  if (!productoModal) return
  qtyModal = Math.max(1, Math.min(qtyModal + delta, productoModal.stock_actual || 99))
  document.getElementById('pm-qty').textContent = qtyModal
}

function agregarDesdeModal() {
  if (!productoModal || productoModal.alerta === 'AGOTADO') return
  const varis = variantesMap[productoModal.id] || []
  if (varis.length && !varianteSeleccionada) {
    alert(`Por favor elige una opción de ${varis[0].nombre_variante || 'variante'} antes de agregar al carrito.`)
    return
  }
  const precioFinal = Number(productoModal.precio_venta) + Number(varianteSeleccionada?.precio_extra || 0)
  const varTexto    = varianteSeleccionada ? `${varianteSeleccionada.nombre_variante}: ${varianteSeleccionada.valor}` : null
  const key         = productoModal.id + (varianteSeleccionada ? '-'+varianteSeleccionada.id : '')

  const ex = carrito.find(x => x.key === key)
  for (let i = 0; i < qtyModal; i++) {
    if (ex) ex.cantidad++
    else carrito.push({ key, id: productoModal.id, nombre: productoModal.nombre, precio: precioFinal, imagen: productoModal.imagen_url||'', cantidad: 1, variante: varTexto, variante_id: varianteSeleccionada?.id||null })
  }
  actualizarCarritoUI()
  cerrarModalProducto()
  abrirCarrito()
  renderPagina(paginaActiva)
}

// ════════════════════════════════════════════════════════
// CARRITO
// ════════════════════════════════════════════════════════
function cambiarCantidad(key, delta) {
  const item = carrito.find(x => x.key === key)
  if (!item) return
  item.cantidad = Math.max(0, item.cantidad + delta)
  if (item.cantidad === 0) carrito = carrito.filter(x => x.key !== key)
  actualizarCarritoUI()
}
function quitarItem(key) {
  carrito = carrito.filter(x => x.key !== key)
  actualizarCarritoUI()
}

function actualizarCarritoUI() {
  const total    = carrito.reduce((s,i) => s + i.cantidad * i.precio, 0)
  const totalUds = carrito.reduce((s,i) => s + i.cantidad, 0)
  const badge    = document.getElementById('cart-badge')
  badge.textContent   = totalUds
  badge.style.display = totalUds > 0 ? 'flex' : 'none'

  const body = document.getElementById('cart-items')
  if (carrito.length === 0) {
    body.innerHTML = `<div class="cart-empty-state"><span class="ce-icon">🛍️</span><p>Tu carrito está vacío.<br>Explora nuestros productos.</p></div>`
    document.getElementById('cart-footer').style.display = 'none'
    return
  }
  body.innerHTML = carrito.map(i => `
    <div class="cart-item">
      <div class="ci-img">${i.imagen?`<img src="${i.imagen}" alt="" onerror="this.parentElement.innerHTML='💄'">`:'💄'}</div>
      <div class="ci-info">
        <div class="ci-name">${esc(i.nombre)}</div>
        ${i.variante?`<div class="ci-variante">${esc(i.variante)}</div>`:''}
        <div class="ci-price">${fmt(i.precio)} c/u</div>
        <div class="ci-qty-row">
          <button class="ci-qty-btn" onclick="cambiarCantidad('${i.key}',-1)">−</button>
          <span class="ci-qty">${i.cantidad}</span>
          <button class="ci-qty-btn" onclick="cambiarCantidad('${i.key}',1)">+</button>
        </div>
      </div>
      <span class="ci-subtotal">${fmt(i.cantidad*i.precio)}</span>
      <button class="ci-remove" onclick="quitarItem('${i.key}')">×</button>
    </div>`).join('')

  document.getElementById('cart-total').textContent = fmt(total)
  document.getElementById('cart-units').textContent = `${totalUds} unidad${totalUds!==1?'es':''} en total`
  document.getElementById('cart-footer').style.display = 'block'
}

function abrirCarrito()  { document.getElementById('cart-overlay').classList.add('open');document.body.style.overflow='hidden' }
function cerrarCarrito() { document.getElementById('cart-overlay').classList.remove('open');document.body.style.overflow='' }

// ════════════════════════════════════════════════════════
// 4. CHECKOUT — con pago con tarjeta
// 7. Sin pago a plazos
// ════════════════════════════════════════════════════════
function abrirCheckout() {
  if (!carrito.length) return
  cerrarCarrito()
  const total = carrito.reduce((s,i) => s + i.cantidad*i.precio, 0)
  document.getElementById('cs-items').innerHTML = carrito.map(i =>
    `<div class="csb-item"><span>${esc(i.nombre)}${i.variante?' ('+esc(i.variante)+')':''} × ${i.cantidad}</span><strong>${fmt(i.cantidad*i.precio)}</strong></div>`
  ).join('')
  document.getElementById('cs-total').textContent = fmt(total)
  if (clienteActual) {
    const el = id => document.getElementById(id)
    el('co-nombre') && (el('co-nombre').value = clienteActual.nombre||'')
    el('co-tel')    && (el('co-tel').value    = clienteActual.telefono||'')
    el('co-ciudad') && (el('co-ciudad').value = clienteActual.ciudad||'')
  }
  document.getElementById('checkout-overlay').classList.add('open')
  document.body.style.overflow = 'hidden'
}
function cerrarCheckout() {
  document.getElementById('checkout-overlay').classList.remove('open')
  document.body.style.overflow = ''
}

// Mostrar/ocultar panel de tarjeta según método de pago
document.getElementById('co-pago')?.addEventListener('change', function() {
  const panel = document.getElementById('card-payment-panel')
  if (!panel) return
  panel.classList.toggle('visible', this.value === 'Tarjeta')
  // Actualizar texto del botón
  const btn = document.getElementById('btn-place-order')
  if (btn) btn.textContent = this.value === 'Tarjeta' ? '💳 Pagar y confirmar' : '✅ Confirmar pedido'
})

document.getElementById('btn-place-order')?.addEventListener('click', async () => {
  const g  = id => document.getElementById(id)?.value?.trim()
  const nombre = g('co-nombre'); const tel = g('co-tel')
  const ciudad = g('co-ciudad'); const pago = g('co-pago')
  const notas  = g('co-notas'); const registrar = document.getElementById('co-registrar')?.checked

  if (!nombre || !tel) { alert('Por favor completa tu nombre y WhatsApp.'); return }

  // Validar tarjeta si es el método seleccionado
  if (pago === 'Tarjeta') {
    const cardNum = g('card-number'); const cardExp = g('card-exp'); const cardCvv = g('card-cvv')
    if (!cardNum || !cardExp || !cardCvv) { alert('Por favor completa todos los datos de la tarjeta.'); return }
    // En producción real: aquí iría la llamada a Stripe/PayPal
    // Por ahora simulamos aprobación
  }

  const btn = document.getElementById('btn-place-order')
  btn.disabled = true; btn.textContent = 'Procesando...'

  try {
    let clienteId = null
    if (usuarioActual && clienteActual) {
      clienteId = clienteActual.id
      await db.from('clientes').update({ nombre, telefono: tel, ciudad: ciudad||null }).eq('id', clienteId)
    } else {
      const { data: cli } = await db.from('clientes').select('id').eq('telefono', tel).maybeSingle()
      if (cli) {
        clienteId = cli.id
        await db.from('clientes').update({ nombre, ciudad: ciudad||null }).eq('id', clienteId)
      } else {
        const { data: nvo } = await db.from('clientes').insert({ nombre, telefono: tel, ciudad: ciudad||null, etiqueta: 'Nueva' }).select('id').single()
        clienteId = nvo?.id
      }
      // Registro opcional
      if (registrar) {
        const email = document.getElementById('co-email')?.value?.trim()
        const pass  = document.getElementById('co-pass')?.value
        const pass2 = document.getElementById('co-pass2')?.value
        if (email && pass && pass === pass2 && pass.length >= 6) {
          const { data: authData } = await db.auth.signUp({ email, password: pass, options:{ data:{ nombre } } })
          if (authData?.user && clienteId) await db.from('clientes').update({ auth_user_id: authData.user.id, email }).eq('id', clienteId)
        }
      }
    }

    const { data: num } = await db.rpc('generar_numero_pedido')
    const { data: ped } = await db.from('pedidos').insert({
      numero: num, cliente_id: clienteId, canal: 'Tienda online',
      metodo_pago: pago, notas: notas||null, estado: pago==='Tarjeta'?'Pagado':'Pendiente',
      fecha: new Date().toISOString().split('T')[0]
    }).select('id').single()

    await db.from('pedido_items').insert(
      carrito.map(i => ({
        pedido_id: ped.id, producto_id: i.id, cantidad: i.cantidad,
        precio_unitario: i.precio, variante_id: i.variante_id||null,
        variante_texto: i.variante||null
      }))
    )

    const total = carrito.reduce((s,i) => s+i.cantidad*i.precio, 0)
    const waMsg = encodeURIComponent(`Hola! 🌸 Acabo de hacer el pedido *${num}* por *${fmt(total)}*. ¿Me pueden confirmar? Gracias!`)

    document.getElementById('confirm-num').textContent        = num
    document.getElementById('confirm-name').textContent       = nombre
    document.getElementById('confirm-total-text').textContent = fmt(total)

    // Si es tarjeta, no se necesita confirmar por WA
    const waBtn = document.getElementById('confirm-wa')
    if (pago === 'Tarjeta') {
      waBtn.style.display = 'none'
      document.getElementById('confirm-pagado').style.display = 'flex'
    } else {
      waBtn.style.display = 'flex'
      waBtn.href = `https://wa.me/${WA_NUMBER}?text=${waMsg}`
      document.getElementById('confirm-pagado').style.display = 'none'
    }

    carrito = []; actualizarCarritoUI(); renderPagina(paginaActiva)
    cerrarCheckout()
    document.getElementById('confirm-overlay').style.display = 'flex'

  } catch (err) {
    console.error(err)
    alert('Error al procesar el pedido. Intenta de nuevo.')
  }
  btn.disabled = false
  btn.textContent = document.getElementById('co-pago')?.value === 'Tarjeta' ? '💳 Pagar y confirmar' : '✅ Confirmar pedido'
})

// ════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════
async function inicializarAuth() {
  const { data: { session } } = await db.auth.getSession()
  if (session?.user) await cargarUsuario(session.user)
  db.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN'  && session?.user) await cargarUsuario(session.user)
    if (event === 'SIGNED_OUT') { usuarioActual = null; clienteActual = null; renderUserArea() }
  })
}
async function cargarUsuario(user) {
  usuarioActual = user
  const { data } = await db.from('clientes').select('*').eq('auth_user_id', user.id).maybeSingle()
  clienteActual = data
  renderUserArea()
}
function renderUserArea() {
  const area = document.getElementById('user-area')
  if (!area) return
  if (usuarioActual) {
    const nombre = clienteActual?.nombre || usuarioActual.email.split('@')[0]
    area.innerHTML = `<div class="user-chip"><span class="user-avatar">${nombre.charAt(0).toUpperCase()}</span><span class="user-name">${esc(nombre.split(' ')[0])}</span><button class="btn-logout" onclick="cerrarSesion()" title="Cerrar sesión">↩</button></div>`
  } else {
    area.innerHTML = `<button class="btn-login-header" onclick="abrirAuth('login')">Mi cuenta</button>`
  }
}
function abrirAuth(tab='login') { document.getElementById('modal-auth').classList.add('open');cambiarTab(tab);document.body.style.overflow='hidden' }
function cerrarAuth()           { document.getElementById('modal-auth').classList.remove('open');document.body.style.overflow='' }
function cambiarTab(tab) {
  document.getElementById('panel-login').style.display    = tab==='login'   ?'block':'none'
  document.getElementById('panel-register').style.display = tab==='register'?'block':'none'
  document.getElementById('tab-login').classList.toggle('active',    tab==='login')
  document.getElementById('tab-register').classList.toggle('active', tab==='register')
}
async function hacerLogin() {
  const email = document.getElementById('login-email').value.trim()
  const pass  = document.getElementById('login-pass').value
  const alertEl = document.getElementById('auth-login-alert')
  const btn = document.getElementById('btn-login')
  if (!email||!pass) { mostrarAuthAlert(alertEl,'Completa todos los campos.','error'); return }
  btn.disabled=true; btn.textContent='Ingresando...'
  const { error } = await db.auth.signInWithPassword({ email, password: pass })
  btn.disabled=false; btn.textContent='Iniciar sesión'
  if (error) { mostrarAuthAlert(alertEl,'Correo o contraseña incorrectos.','error'); return }
  cerrarAuth()
}
async function hacerRegistro() {
  const el  = id => document.getElementById(id)
  const nombre = el('reg-nombre')?.value.trim()
  const tel    = el('reg-tel')?.value.trim()
  const ciudad = el('reg-ciudad')?.value.trim()
  const email  = el('reg-email')?.value.trim()
  const pass   = el('reg-pass')?.value
  const pass2  = el('reg-pass2')?.value
  const terms  = el('reg-terms')?.checked
  const alertEl= el('auth-register-alert')
  const btn    = el('btn-register')
  if (!nombre||!tel||!email||!pass) { mostrarAuthAlert(alertEl,'Completa todos los campos.','error'); return }
  if (pass!==pass2) { mostrarAuthAlert(alertEl,'Las contraseñas no coinciden.','error'); return }
  if (pass.length<6){ mostrarAuthAlert(alertEl,'Contraseña mínimo 6 caracteres.','error'); return }
  if (!terms)       { mostrarAuthAlert(alertEl,'Debes aceptar los términos.','error'); return }
  btn.disabled=true; btn.textContent='Creando cuenta...'
  const { data: authData, error: authError } = await db.auth.signUp({ email, password: pass, options:{ data:{ nombre } } })
  if (authError) { btn.disabled=false; btn.textContent='Crear mi cuenta'; mostrarAuthAlert(alertEl, authError.message.includes('already')?'Este correo ya tiene cuenta.':authError.message,'error'); return }
  if (authData?.user) await db.from('clientes').update({ nombre, telefono: tel, ciudad: ciudad||null, email }).eq('auth_user_id', authData.user.id)
  btn.disabled=false; btn.textContent='Crear mi cuenta'
  mostrarAuthAlert(alertEl,'✓ Cuenta creada. Revisa tu correo para confirmar.','success')
  setTimeout(()=>cambiarTab('login'),2000)
}
async function cerrarSesion() { await db.auth.signOut() }
function mostrarAuthAlert(el, msg, tipo) { el.innerHTML=`<div class="auth-alert auth-alert-${tipo}">${msg}</div>` }

// ════════════════════════════════════════════════════════
// MODALES INFORMACIÓN
// ════════════════════════════════════════════════════════
const infoContent = {
  'como-comprar':{ titulo:'¿Cómo comprar?', html:`<div class="info-steps">
    <div class="info-step"><div class="step-num">1</div><div><strong>Explora</strong><p>Navega por categorías o usa el buscador.</p></div></div>
    <div class="info-step"><div class="step-num">2</div><div><strong>Agrega al carrito</strong><p>Haz clic en el producto. No necesitas cuenta.</p></div></div>
    <div class="info-step"><div class="step-num">3</div><div><strong>Completa tu pedido</strong><p>Ingresa nombre, WhatsApp y ciudad.</p></div></div>
    <div class="info-step"><div class="step-num">4</div><div><strong>Confirmamos</strong><p>Te contactamos por WhatsApp o procesamos el pago si pagaste con tarjeta.</p></div></div>
    <div class="info-step"><div class="step-num">5</div><div><strong>¡Recibe!</strong><p>Productos Mary Kay 100% originales en tu puerta.</p></div></div>
  </div>` },
  'metodos-pago':{ titulo:'Métodos de pago', html:`<div class="info-list">
    <div class="info-pago-item"><span class="pago-ico">💵</span><div><strong>Efectivo al recibir</strong><p>Pagas cuando tu pedido llega. Sin riesgo.</p></div></div>
    <div class="info-pago-item"><span class="pago-ico">💳</span><div><strong>Tarjeta de crédito/débito</strong><p>Pago seguro en línea al momento del pedido. Visa y Mastercard.</p></div></div>
    <div class="info-pago-item"><span class="pago-ico">🏦</span><div><strong>Transferencia BAC</strong><p>Te enviamos los datos por WhatsApp.</p></div></div>
    <div class="info-pago-item"><span class="pago-ico">💻</span><div><strong>PayPal</strong><p>Pago seguro con tu cuenta PayPal.</p></div></div>
  </div>` },
  'envios':{ titulo:'Envíos y entregas', html:`<p>Enviamos a <strong>todos los departamentos de Honduras</strong>. Tegucigalpa 1-2 días, San Pedro Sula 2-3 días, resto del país 3-5 días.</p>
    <div class="info-note">📦 Todos los pedidos se empacan cuidadosamente.</div>` },
  'cambios':{ titulo:'Política de cambios', html:`<div class="info-list">
    <div class="info-pago-item"><span class="pago-ico">✅</span><div><strong>Producto dañado</strong><p>Lo cambiamos sin costo adicional.</p></div></div>
    <div class="info-pago-item"><span class="pago-ico">📸</span><div><strong>¿Cómo?</strong><p>Foto + WhatsApp dentro de 48 horas de recibido.</p></div></div>
    <div class="info-pago-item"><span class="pago-ico">🚫</span><div><strong>No elegibles</strong><p>Maquillaje ya abierto por higiene.</p></div></div>
  </div>` },
  'terminos':{ titulo:'Términos y condiciones', html:`<h3>1. Aceptación</h3><p>Al comprar aceptas estos términos.</p><h3>2. Productos</h3><p>Productos Mary Kay 100% originales.</p><h3>3. Precios</h3><p>En Lempiras hondureños (L).</p><h3>4. Pagos</h3><p>Para tarjeta, el cargo se realiza al confirmar el pedido.</p>` },
  'privacidad':{ titulo:'Política de privacidad', html:`<h3>Datos que recopilamos</h3><p>Nombre, correo (opcional), teléfono, ciudad.</p><h3>Uso</h3><p>Para procesar pedidos y enviar ofertas (con tu consentimiento).</p><h3>Protección</h3><p>Cifrado SSL. No vendemos ni compartimos tus datos.</p>` }
}
function abrirInfo(key) {
  const c = infoContent[key]; if(!c) return
  document.getElementById('info-title').textContent = c.titulo
  document.getElementById('info-body').innerHTML    = c.html
  document.getElementById('modal-info').classList.add('open')
  document.body.style.overflow = 'hidden'
}
function cerrarInfo() { document.getElementById('modal-info').classList.remove('open');document.body.style.overflow='' }

// ── Inicio ─────────────────────────────────────────────
inicializarAuth()
initDropdowns()
renderUserArea()
actualizarCarritoUI()
cargarTodo()

// Toggle registro en checkout
document.getElementById('co-registrar')?.addEventListener('change', function() {
  document.getElementById('ro-pass-wrap').style.display = this.checked ? 'block' : 'none'
})
