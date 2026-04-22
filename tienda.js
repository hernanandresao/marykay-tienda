// MARY KAY HONDURAS — Tienda v6
// Reescritura completa desde cero

const SB_URL = 'https://knoxphxvmjvkdioeopbi.supabase.co'
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtub3hwaHh2bWp2a2Rpb2VvcGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzUxNjEsImV4cCI6MjA5MTQxMTE2MX0.4XSZGDibY6z0wdA0UysExc1Yt-yMmckfNs7nxU3fZUo'
const WA = '50498589303'

const { createClient } = supabase
const db = createClient(SB_URL, SB_KEY)
const L = n => `L ${Number(n||0).toLocaleString('es-HN',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

// ─── Estado ──────────────────────────────────────────────
let productos  = []   // todos los productos activos de v_productos
let variantes  = {}   // { productoId: [variante,...] }
let banners    = []   // banners de la tabla banners
let carrito    = []   // items del carrito
let pActual    = 'novedades'
let prodModal  = null
let qtyModal   = 1
let varSel     = null   // variante seleccionada
let userActual = null
let clienteAct = null

// ─── Mapa: subcategoria DB → id de grid en HTML ─────────
const SUBCAT_GRID = {
  'Clinical Solutions': 'g-clinical',
  'TimeWise':           'g-timewise',
  'TimeWise Repair':    'g-repair',
  'Skincare Básica':    'g-basica',
  'Clear Proof':        'g-clearproof',
  'MKMen':              'g-mkmen',
  'Soluciones Especiales': 'g-especial',
  'Rostro':             'g-rostro',
  'Ojos':               'g-ojos',
  'Labios':             'g-labios',
  'Chromafusion':       'g-ojos',   // mismo grid que ojos
  'Fragancias Ella':    'g-ella',
  'Fragancias Él':      'g-el',
  'Satin':              'g-satin',
  'Corporales':         'g-corpo',
  'TimeWise Set':       'g-set-tw',
  'TimeWise Repair Set':'g-set-repair',
  'Skin Care Set':      'g-set-skin',
  'Clear Proof Set':    'g-set-cp',
  'MKMen Set':          'g-set-men',
  'Satin Set':          'g-set-satin',
}

// ─── Sub-sección → id de elemento en HTML ───────────────
const SUB_EL = {
  clinical:'sub-clinical', timewise:'sub-timewise', repair:'sub-repair',
  basica:'sub-basica', clearproof:'sub-clearproof', mkmen:'sub-mkmen',
  especial:'sub-especial',
  rostro:'sub-rostro', ojos:'sub-ojos', labios:'sub-labios',
  ella:'sub-ella', el:'sub-el',
  satin:'sub-satin', corpo:'sub-corpo',
  'set-tw':'sub-set-tw', 'set-repair':'sub-set-repair',
  'set-skin':'sub-set-skin', 'set-cp':'sub-set-cp',
  'set-men':'sub-set-men', 'set-satin':'sub-set-satin',
}

// ════════════════════════════════════════════════════════
// 1. INICIALIZAR NAV — dropdown con position:fixed
// ════════════════════════════════════════════════════════
function initNav() {
  const nav = document.getElementById('cat-nav')
  if (!nav) return

  let ddAbierto = null

  function cerrarTodos() {
    nav.querySelectorAll('.nav-item-dd.open').forEach(el => el.classList.remove('open'))
    ddAbierto = null
  }

  function abrirDD(item, dropdown) {
    cerrarTodos()
    // Calcular posición fixed
    const rect = item.querySelector('.nav-btn').getBoundingClientRect()
    const header = document.getElementById('site-header')
    const bottom = header ? header.getBoundingClientRect().bottom : rect.bottom
    dropdown.style.top  = bottom + 'px'
    dropdown.style.left = rect.left + 'px'
    item.classList.add('open')
    ddAbierto = item
  }

  // Botones del nav
  nav.querySelectorAll('.nav-item-dd').forEach(item => {
    const btn = item.querySelector('.nav-btn')
    const dd  = item.querySelector('.dropdown')
    if (!btn || !dd) return

    btn.addEventListener('click', e => {
      e.stopPropagation()
      if (item.classList.contains('open')) {
        cerrarTodos()
      } else {
        abrirDD(item, dd)
      }
    })

    // Items del dropdown
    dd.querySelectorAll('.dd-item').forEach(di => {
      di.addEventListener('click', e => {
        e.stopPropagation()
        const page = di.dataset.page
        const sub  = di.dataset.sub || null
        cerrarTodos()
        irA(page, sub)
      })
    })
  })

  // Botones simples (sin dropdown)
  nav.querySelectorAll('.nav-btn').forEach(btn => {
    if (btn.closest('.nav-item-dd')) return  // ya manejados
    btn.addEventListener('click', () => {
      cerrarTodos()
      irA(btn.dataset.page)
    })
  })

  // Cerrar al hacer click fuera
  document.addEventListener('click', cerrarTodos)
  window.addEventListener('resize', cerrarTodos)
  window.addEventListener('scroll', cerrarTodos, { passive: true })
}

// ════════════════════════════════════════════════════════
// 2. NAVEGACIÓN
// ════════════════════════════════════════════════════════
function irA(pagina, sub) {
  pActual = pagina

  // Ocultar búsqueda si está activa
  document.getElementById('page-search').style.display = 'none'
  document.getElementById('search-input').value = ''

  // Cambiar página
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  const pg = document.getElementById('page-' + pagina)
  if (pg) pg.classList.add('active')

  // Nav activo
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === pagina)
  })

  // Renderizar
  renderPagina(pagina)

  // Scroll
  window.scrollTo({ top: 0, behavior: 'smooth' })

  // Si hay sub-sección, hacer scroll a ella
  if (sub && SUB_EL[sub]) {
    setTimeout(() => {
      const el = document.getElementById(SUB_EL[sub])
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
  }
}

// ════════════════════════════════════════════════════════
// 3. CARGAR DATOS
// ════════════════════════════════════════════════════════
async function cargarDatos() {
  // Mostrar loading en novedades
  const gn = document.getElementById('grid-novedades')
  if (gn) gn.innerHTML = '<div class="grid-loading"><div class="loader"></div>Cargando productos...</div>'

  const [{ data: prods }, { data: bans }, { data: varis }] = await Promise.all([
    db.from('v_productos').select('*').order('nombre'),
    db.from('banners').select('*').eq('activo', true).order('orden'),
    db.from('producto_variantes').select('*').eq('activo', true).order('orden'),
  ])

  productos = prods || []
  banners   = bans  || []

  variantes = {}
  ;(varis || []).forEach(v => {
    if (!variantes[v.producto_id]) variantes[v.producto_id] = []
    variantes[v.producto_id].push(v)
  })

  renderPagina(pActual)

  // Suscripción tiempo real
  db.channel('tienda-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' },   cargarDatos)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' },     cargarDatos)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'producto_variantes' }, cargarDatos)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_items' }, cargarDatos)
    .subscribe()
}

// ════════════════════════════════════════════════════════
// 4. RENDERIZAR PÁGINAS
// ════════════════════════════════════════════════════════
function renderPagina(pagina) {
  switch(pagina) {
    case 'novedades':
      renderBanners()
      renderGrid('grid-novedades', productos.filter(p => p.es_novedad))
      break

    case 'skincare':
      renderPorSubcat(['Clinical Solutions'], 'g-clinical')
      renderPorSubcat(['TimeWise'], 'g-timewise')
      renderPorSubcat(['TimeWise Repair'], 'g-repair')
      renderPorSubcat(['Skincare Básica'], 'g-basica')
      renderPorSubcat(['Clear Proof'], 'g-clearproof')
      renderPorSubcat(['MKMen'], 'g-mkmen')
      renderPorSubcat(['Soluciones Especiales'], 'g-especial')
      break

    case 'maquillaje':
      renderPorSubcat(['Rostro'], 'g-rostro')
      renderPorSubcat(['Ojos', 'Chromafusion'], 'g-ojos')
      renderPorSubcat(['Labios'], 'g-labios')
      break

    case 'fragancias':
      renderPorSubcat(['Fragancias Ella'], 'g-ella')
      renderPorSubcat(['Fragancias Él'], 'g-el')
      break

    case 'cuidado':
      renderPorSubcat(['Satin'], 'g-satin')
      renderPorSubcat(['Corporales'], 'g-corpo')
      break

    case 'herramientas':
      renderGrid('g-herramientas', productos.filter(p => p.categoria === 'Herramientas'))
      break

    case 'sets':
      renderPorSubcat(['TimeWise Set'], 'g-set-tw')
      renderPorSubcat(['TimeWise Repair Set'], 'g-set-repair')
      renderPorSubcat(['Skin Care Set'], 'g-set-skin')
      renderPorSubcat(['Clear Proof Set'], 'g-set-cp')
      renderPorSubcat(['MKMen Set'], 'g-set-men')
      renderPorSubcat(['Satin Set'], 'g-set-satin')
      break
  }
}

function renderPorSubcat(subcats, gridId) {
  const lista = productos.filter(p => subcats.includes(p.subcategoria))
  renderGrid(gridId, lista)
}

function renderGrid(gridId, lista) {
  const grid = document.getElementById(gridId)
  if (!grid) return

  if (!lista || !lista.length) {
    grid.innerHTML = '<div class="grid-empty">Sin productos disponibles en este momento.</div>'
    return
  }

  grid.innerHTML = lista.map(p => {
    const agotado = p.alerta === 'AGOTADO'
    const bajo    = p.alerta === 'BAJO'
    const nuevo   = p.es_novedad

    const imgHtml = p.imagen_url
      ? `<img src="${esc(p.imagen_url)}" alt="${esc(p.nombre)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : ''

    const badge = agotado ? '<span class="pcard-badge badge-agotado">Agotado</span>'
                : bajo    ? '<span class="pcard-badge badge-bajo">Últimas</span>'
                : nuevo   ? '<span class="pcard-badge badge-nuevo">¡Nuevo!</span>'
                : ''

    return `
    <div class="pcard ${agotado ? 'agotado' : ''}" onclick="abrirModal('${p.id}')">
      <div class="pcard-img">
        ${imgHtml}
        <div class="pcard-ph" style="${p.imagen_url ? 'display:none' : ''}">💄</div>
        ${badge}
        <div class="pcard-hover">${agotado ? 'Agotado' : '🛍️ Ver producto'}</div>
      </div>
      <div class="pcard-body">
        <div class="pcard-cat">${esc(p.subcategoria || p.categoria)}</div>
        <div class="pcard-name">${esc(p.nombre)}</div>
        <div class="pcard-foot">
          <span class="pcard-price">${L(p.precio_venta)}</span>
          <span class="pcard-stock stock-${p.alerta.toLowerCase()}">${agotado ? 'Agotado' : bajo ? 'Últimas' : 'Disponible'}</span>
        </div>
      </div>
    </div>`
  }).join('')
}

function renderBanners() {
  const wrap = document.getElementById('banners-novedades')
  if (!wrap) return

  const bansNov = banners.filter(b => b.pagina === 'novedades')

  if (!bansNov.length) {
    // Banners por defecto si no hay en DB
    wrap.innerHTML = `
      <div class="promo-card promo-mask"><div><span class="pc-tag">¡NUEVO!</span><h3>Hydrating Cream Mask</h3><p>Tu aliada para hidratar sin enjuagar. 12 horas de hidratación.</p></div><span class="pc-emoji">🫧</span></div>
      <div class="promo-card promo-gloss"><div><span class="pc-tag">Ed. Limitada</span><h3>Lip Gloss Primavera</h3><p>Lilac Love, Cherry Red y Rose Noir. Hidrata y brilla.</p></div><span class="pc-emoji">💋</span></div>
      <div class="promo-card promo-bronzer"><div><span class="pc-tag">Ed. Limitada</span><h3>Illuminating Bronzer</h3><p>Medium Glow y Deep Glow para todo tono de piel.</p></div><span class="pc-emoji">☀️</span></div>
      <div class="promo-card promo-aftersun"><div><span class="pc-tag">Ed. Especial</span><h3>After-Sun Gel</h3><p>¡De vuelta! Calma tu piel después del sol.</p></div><span class="pc-emoji">🌊</span></div>`
    return
  }

  wrap.innerHTML = bansNov.map(b => `
    <div class="promo-card ${esc(b.estilo || 'promo-mask')}">
      <div><span class="pc-tag">${esc(b.etiqueta || '')}</span><h3>${esc(b.titulo)}</h3><p>${esc(b.descripcion || '')}</p></div>
      <span class="pc-emoji">${b.emoji || '🌸'}</span>
    </div>`).join('')
}

// ════════════════════════════════════════════════════════
// 5. BÚSQUEDA
// ════════════════════════════════════════════════════════
document.getElementById('search-input').addEventListener('input', e => {
  const q = e.target.value.toLowerCase().trim()
  if (!q) {
    document.getElementById('page-search').style.display = 'none'
    document.querySelectorAll('.page').forEach(p => {
      p.style.display = p.id === 'page-' + pActual ? 'block' : 'none'
    })
    document.getElementById('page-' + pActual).classList.add('active')
    return
  }
  document.querySelectorAll('.page').forEach(p => { p.style.display = 'none'; p.classList.remove('active') })
  const sp = document.getElementById('page-search')
  sp.style.display = 'block'
  const found = productos.filter(p =>
    p.nombre.toLowerCase().includes(q) ||
    (p.categoria || '').toLowerCase().includes(q) ||
    (p.subcategoria || '').toLowerCase().includes(q) ||
    (p.codigo || '').toLowerCase().includes(q)
  )
  document.getElementById('search-title').textContent = `${found.length} resultado${found.length !== 1 ? 's' : ''} para "${e.target.value}"`
  renderGrid('g-search', found)
})

// ════════════════════════════════════════════════════════
// 6. MODAL DE PRODUCTO
// ════════════════════════════════════════════════════════
function abrirModal(id) {
  const p = productos.find(x => x.id === id)
  if (!p) return
  prodModal = p; qtyModal = 1; varSel = null

  // Imagen
  const imgWrap = document.getElementById('modal-img-wrap')
  imgWrap.innerHTML = p.imagen_url
    ? `<img src="${esc(p.imagen_url)}" alt="${esc(p.nombre)}" onerror="this.parentElement.innerHTML='<div class=modal-img-ph>💄</div>'">`
    : '<div class="modal-img-ph">💄</div>'

  // Info
  document.getElementById('modal-cat').textContent    = p.subcategoria || p.categoria
  document.getElementById('modal-nombre').textContent = p.nombre
  document.getElementById('modal-precio').textContent = L(p.precio_venta)

  const stockEl = document.getElementById('modal-stock')
  stockEl.textContent = p.alerta === 'AGOTADO' ? 'Sin stock' : p.alerta === 'BAJO' ? `¡Solo ${p.stock_actual} disponibles!` : `En stock (${p.stock_actual} unidades)`
  stockEl.style.color = p.alerta === 'AGOTADO' ? 'var(--red)' : p.alerta === 'BAJO' ? 'var(--amb)' : 'var(--grn)'

  // Variantes
  const varis = variantes[id] || []
  const vWrap = document.getElementById('modal-variantes')
  if (varis.length) {
    const nombre = varis[0].nombre_variante || 'Opción'
    vWrap.innerHTML = `
      <span class="var-label">${esc(nombre)}</span>
      <div class="var-btns">
        ${varis.map(v => `<button class="var-btn" onclick="selVar('${v.id}',this,${v.precio_extra||0})">${esc(v.valor)}</button>`).join('')}
      </div>`
    vWrap.style.display = 'block'
  } else {
    vWrap.innerHTML = ''
    vWrap.style.display = 'none'
  }

  document.getElementById('qty-val').textContent = '1'
  const btn = document.getElementById('btn-add-cart')
  btn.disabled    = p.alerta === 'AGOTADO'
  btn.textContent = p.alerta === 'AGOTADO' ? '🚫 Agotado' : '🛍️ Agregar al carrito'

  document.getElementById('modal-prod').classList.add('open')
  document.body.style.overflow = 'hidden'
}

function selVar(vid, btn, precioExtra) {
  document.querySelectorAll('.var-btn').forEach(b => b.classList.remove('sel'))
  btn.classList.add('sel')
  const v = (variantes[prodModal?.id] || []).find(x => x.id === vid)
  varSel = v
  const total = Number(prodModal.precio_venta) + Number(precioExtra || 0)
  document.getElementById('modal-precio').textContent = L(total)
}

function cambiarQty(delta) {
  if (!prodModal) return
  qtyModal = Math.max(1, Math.min(qtyModal + delta, prodModal.stock_actual || 99))
  document.getElementById('qty-val').textContent = qtyModal
}

function cerrarModal() {
  document.getElementById('modal-prod').classList.remove('open')
  document.body.style.overflow = ''
  prodModal = null; varSel = null
}

function agregarAlCarrito() {
  if (!prodModal || prodModal.alerta === 'AGOTADO') return
  const varis = variantes[prodModal.id] || []
  if (varis.length && !varSel) {
    alert(`Por favor elige un ${varis[0].nombre_variante || 'Tono'} antes de agregar.`)
    return
  }
  const precio  = Number(prodModal.precio_venta) + Number(varSel?.precio_extra || 0)
  const varTxt  = varSel ? `${varSel.nombre_variante}: ${varSel.valor}` : null
  const key     = prodModal.id + (varSel ? '-' + varSel.id : '')
  const ex      = carrito.find(x => x.key === key)
  for (let i = 0; i < qtyModal; i++) {
    if (ex) ex.qty++
    else carrito.push({ key, id: prodModal.id, nombre: prodModal.nombre, precio, img: prodModal.imagen_url || '', qty: 1, varTxt, varId: varSel?.id || null })
  }
  actualizarCarrito()
  cerrarModal()
  abrirCarrito()
}

// ════════════════════════════════════════════════════════
// 7. CARRITO
// ════════════════════════════════════════════════════════
function actualizarCarrito() {
  const total = carrito.reduce((s, i) => s + i.qty * i.precio, 0)
  const uds   = carrito.reduce((s, i) => s + i.qty, 0)
  const badge = document.getElementById('cart-badge')
  badge.textContent = uds
  badge.style.display = uds > 0 ? 'flex' : 'none'

  const body = document.getElementById('cart-body')
  if (!carrito.length) {
    body.innerHTML = '<div class="cart-empty"><span class="ce-ico">🛍️</span><p>Tu carrito está vacío</p></div>'
    document.getElementById('cart-footer').style.display = 'none'
    return
  }
  body.innerHTML = carrito.map(i => `
    <div class="cart-item">
      <div class="ci-img">${i.img ? `<img src="${esc(i.img)}" alt="" onerror="this.style.display='none'">` : '💄'}</div>
      <div class="ci-info">
        <div class="ci-name">${esc(i.nombre)}</div>
        ${i.varTxt ? `<div class="ci-var">${esc(i.varTxt)}</div>` : ''}
        <div class="ci-price">${L(i.precio)} c/u</div>
        <div class="ci-qty-row">
          <button class="ci-qb" onclick="cambiarQtyCarrito('${i.key}',-1)">−</button>
          <span class="ci-q">${i.qty}</span>
          <button class="ci-qb" onclick="cambiarQtyCarrito('${i.key}',1)">+</button>
        </div>
      </div>
      <span class="ci-sub">${L(i.qty * i.precio)}</span>
      <button class="ci-rm" onclick="quitarItem('${i.key}')">×</button>
    </div>`).join('')

  document.getElementById('cart-total').textContent = L(total)
  document.getElementById('cart-uds').textContent   = `${uds} unidad${uds !== 1 ? 'es' : ''} en total`
  document.getElementById('cart-footer').style.display = 'block'
}

function cambiarQtyCarrito(key, delta) {
  const item = carrito.find(x => x.key === key)
  if (!item) return
  item.qty = Math.max(0, item.qty + delta)
  if (item.qty === 0) carrito = carrito.filter(x => x.key !== key)
  actualizarCarrito()
}
function quitarItem(key) {
  carrito = carrito.filter(x => x.key !== key)
  actualizarCarrito()
}
function abrirCarrito() {
  document.getElementById('cart-overlay').classList.add('open')
  document.body.style.overflow = 'hidden'
}
function cerrarCarrito() {
  document.getElementById('cart-overlay').classList.remove('open')
  document.body.style.overflow = ''
}

// ════════════════════════════════════════════════════════
// 8. CHECKOUT
// ════════════════════════════════════════════════════════
function abrirCheckout() {
  if (!carrito.length) return
  cerrarCarrito()
  const total = carrito.reduce((s, i) => s + i.qty * i.precio, 0)

  const resumen = document.getElementById('checkout-resumen')
  resumen.innerHTML = `
    <div class="cs-title">Resumen del pedido</div>
    ${carrito.map(i => `<div class="cs-item"><span>${esc(i.nombre)}${i.varTxt ? ` (${i.varTxt})` : ''} × ${i.qty}</span><strong>${L(i.qty * i.precio)}</strong></div>`).join('')}
    <div class="cs-total"><span>Total</span><strong>${L(total)}</strong></div>`

  if (clienteAct) {
    const f = id => document.getElementById(id)
    if (f('co-nombre')) f('co-nombre').value = clienteAct.nombre || ''
    if (f('co-tel'))    f('co-tel').value    = clienteAct.telefono || ''
    if (f('co-ciudad')) f('co-ciudad').value = clienteAct.ciudad || ''
  }

  document.getElementById('checkout-overlay').classList.add('open')
  document.body.style.overflow = 'hidden'
}
function cerrarCheckout() {
  document.getElementById('checkout-overlay').classList.remove('open')
  document.body.style.overflow = ''
}

function toggleCardPanel(pago) {
  document.getElementById('card-panel').style.display = pago === 'Tarjeta' ? 'block' : 'none'
  document.getElementById('btn-place').textContent = pago === 'Tarjeta' ? '💳 Pagar y confirmar' : '✅ Confirmar pedido'
}

async function hacerPedido() {
  const g = id => document.getElementById(id)?.value?.trim()
  const nombre = g('co-nombre'); const tel = g('co-tel')
  const ciudad = g('co-ciudad'); const pago  = g('co-pago')
  const notas  = g('co-notas'); const registrar = document.getElementById('co-registrar')?.checked

  if (!nombre || !tel) { alert('Por favor completa tu nombre y WhatsApp.'); return }

  if (pago === 'Tarjeta') {
    if (!g('card-num') || !g('card-exp') || !g('card-cvv')) {
      alert('Completa los datos de la tarjeta.')
      return
    }
  }

  const btn = document.getElementById('btn-place')
  btn.disabled = true; btn.textContent = 'Procesando...'

  try {
    let clienteId = null

    if (userActual && clienteAct) {
      clienteId = clienteAct.id
      await db.from('clientes').update({ nombre, telefono: tel, ciudad: ciudad || null }).eq('id', clienteId)
    } else {
      const { data: cli } = await db.from('clientes').select('id').eq('telefono', tel).maybeSingle()
      if (cli) {
        clienteId = cli.id
        await db.from('clientes').update({ nombre, ciudad: ciudad || null }).eq('id', clienteId)
      } else {
        const { data: nvo } = await db.from('clientes').insert({ nombre, telefono: tel, ciudad: ciudad || null, etiqueta: 'Nueva' }).select('id').single()
        clienteId = nvo?.id
      }
      if (registrar) {
        const email = document.getElementById('co-email')?.value?.trim()
        const pass  = document.getElementById('co-pass')?.value
        const pass2 = document.getElementById('co-pass2')?.value
        if (email && pass && pass === pass2 && pass.length >= 6) {
          const { data: au } = await db.auth.signUp({ email, password: pass, options: { data: { nombre } } })
          if (au?.user && clienteId) await db.from('clientes').update({ auth_user_id: au.user.id, email }).eq('id', clienteId)
        }
      }
    }

    const { data: num } = await db.rpc('generar_numero_pedido')
    const { data: ped } = await db.from('pedidos').insert({
      numero: num, cliente_id: clienteId, canal: 'Tienda online',
      metodo_pago: pago, notas: notas || null,
      estado: pago === 'Tarjeta' ? 'Pagado' : 'Pendiente',
      fecha: new Date().toISOString().split('T')[0]
    }).select('id').single()

    await db.from('pedido_items').insert(
      carrito.map(i => ({
        pedido_id: ped.id, producto_id: i.id,
        cantidad: i.qty, precio_unitario: i.precio,
        variante_id: i.varId || null,
        variante_texto: i.varTxt || null
      }))
    )

    const total = carrito.reduce((s, i) => s + i.qty * i.precio, 0)
    const msg   = encodeURIComponent(`Hola 🌸 Hice el pedido *${num}* por *${L(total)}*. ¿Me confirman? ¡Gracias!`)

    document.getElementById('confirm-num').textContent   = num
    document.getElementById('confirm-name').textContent  = nombre
    document.getElementById('confirm-total').textContent = L(total)

    const waBtn   = document.getElementById('btn-wa-confirm')
    const cardOk  = document.getElementById('card-ok')
    if (pago === 'Tarjeta') {
      waBtn.style.display  = 'none'
      cardOk.style.display = 'flex'
    } else {
      waBtn.href = `https://wa.me/${WA}?text=${msg}`
      waBtn.style.display  = 'flex'
      cardOk.style.display = 'none'
    }

    carrito = []; actualizarCarrito()
    cerrarCheckout()
    document.getElementById('confirm-overlay').style.display = 'flex'

  } catch (err) {
    console.error('Error pedido:', err)
    alert('Error al procesar el pedido. Intenta de nuevo.')
  }
  btn.disabled = false
  btn.textContent = document.getElementById('co-pago')?.value === 'Tarjeta' ? '💳 Pagar y confirmar' : '✅ Confirmar pedido'
}

// ════════════════════════════════════════════════════════
// 9. AUTH
// ════════════════════════════════════════════════════════
async function initAuth() {
  const { data: { session } } = await db.auth.getSession()
  if (session?.user) await loadUser(session.user)
  db.auth.onAuthStateChange(async (ev, sess) => {
    if (ev === 'SIGNED_IN'  && sess?.user) await loadUser(sess.user)
    if (ev === 'SIGNED_OUT') { userActual = null; clienteAct = null; renderUser() }
  })
}
async function loadUser(user) {
  userActual = user
  const { data } = await db.from('clientes').select('*').eq('auth_user_id', user.id).maybeSingle()
  clienteAct = data
  renderUser()
}
function renderUser() {
  const area = document.getElementById('user-area')
  if (!area) return
  if (userActual) {
    const nom = clienteAct?.nombre || userActual.email.split('@')[0]
    area.innerHTML = `<div class="user-chip"><span class="user-av">${nom.charAt(0).toUpperCase()}</span><span class="user-nm">${esc(nom.split(' ')[0])}</span><button class="btn-logout" onclick="doLogout()">↩</button></div>`
  } else {
    area.innerHTML = `<button class="btn-login-hdr" onclick="abrirAuth()">Mi cuenta</button>`
  }
}
function abrirAuth(tab) { 
  authTab(tab || 'login')
  document.getElementById('auth-overlay').classList.add('open')
  document.body.style.overflow = 'hidden'
}
function cerrarAuth() {
  document.getElementById('auth-overlay').classList.remove('open')
  document.body.style.overflow = ''
}
function authTab(t) {
  document.getElementById('panel-login').style.display = t === 'login' ? 'block' : 'none'
  document.getElementById('panel-reg').style.display   = t === 'reg'   ? 'block' : 'none'
  document.getElementById('tab-login').classList.toggle('active', t === 'login')
  document.getElementById('tab-reg').classList.toggle('active', t === 'reg')
}
async function doLogin() {
  const email = document.getElementById('login-email').value.trim()
  const pass  = document.getElementById('login-pass').value
  const al    = document.getElementById('alert-login')
  if (!email || !pass) { al.innerHTML = '<div class="auth-alert err">Completa todos los campos.</div>'; return }
  const { error } = await db.auth.signInWithPassword({ email, password: pass })
  if (error) { al.innerHTML = `<div class="auth-alert err">Correo o contraseña incorrectos.</div>`; return }
  cerrarAuth()
}
async function doRegister() {
  const nom  = document.getElementById('reg-nombre').value.trim()
  const tel  = document.getElementById('reg-tel').value.trim()
  const em   = document.getElementById('reg-email').value.trim()
  const pw   = document.getElementById('reg-pass').value
  const pw2  = document.getElementById('reg-pass2').value
  const al   = document.getElementById('alert-reg')
  if (!nom || !tel || !em || !pw) { al.innerHTML = '<div class="auth-alert err">Completa todos los campos.</div>'; return }
  if (pw !== pw2) { al.innerHTML = '<div class="auth-alert err">Las contraseñas no coinciden.</div>'; return }
  if (pw.length < 6) { al.innerHTML = '<div class="auth-alert err">Contraseña mínimo 6 caracteres.</div>'; return }
  const { data: au, error } = await db.auth.signUp({ email: em, password: pw, options: { data: { nombre: nom } } })
  if (error) { al.innerHTML = `<div class="auth-alert err">${error.message}</div>`; return }
  if (au?.user) await db.from('clientes').update({ nombre: nom, telefono: tel, email: em }).eq('auth_user_id', au.user.id)
  al.innerHTML = '<div class="auth-alert ok">✓ Cuenta creada. Ya puedes iniciar sesión.</div>'
  setTimeout(() => authTab('login'), 2000)
}
async function doLogout() { await db.auth.signOut() }

// ════════════════════════════════════════════════════════
// 10. MODALES DE INFORMACIÓN
// ════════════════════════════════════════════════════════
const INFO = {
  envios: { t: 'Envíos y entregas', b: '<h3>Cobertura</h3><p>Enviamos a todos los departamentos de Honduras. Tegucigalpa 1-2 días, San Pedro Sula 2-3 días, resto del país 3-5 días hábiles.</p><h3>Costo</h3><p>El costo de envío varía según tu ubicación. Te informamos al confirmar por WhatsApp.</p>' },
  pagos:  { t: 'Métodos de pago', b: '<p><strong>💵 Efectivo al recibir</strong> — Pagas cuando llega tu pedido.</p><p><strong>💳 Tarjeta</strong> — Visa y Mastercard al confirmar el pedido en línea.</p><p><strong>🏦 Transferencia BAC</strong> — Te enviamos los datos por WhatsApp.</p><p><strong>💻 PayPal</strong> — Pago seguro en línea.</p>' },
  cambios:{ t: 'Política de cambios', b: '<p>Si el producto llega dañado o incorrecto, lo cambiamos sin costo. Contáctanos dentro de las 48 horas de recibido con foto del producto. Por higiene, no se aceptan cambios en maquillaje ya abierto o usado.</p>' },
}
function abrirInfo(key) {
  const c = INFO[key]; if (!c) return
  document.getElementById('info-title').textContent = c.t
  document.getElementById('info-body').innerHTML    = c.b
  document.getElementById('info-overlay').classList.add('open')
  document.body.style.overflow = 'hidden'
}
function cerrarInfo() {
  document.getElementById('info-overlay').classList.remove('open')
  document.body.style.overflow = ''
}

// ════════════════════════════════════════════════════════
// ARRANQUE
// ════════════════════════════════════════════════════════
initNav()
initAuth()
actualizarCarrito()
cargarDatos()
irA('novedades')
