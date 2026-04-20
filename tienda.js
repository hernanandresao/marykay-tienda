// ═══════════════════════════════════════════════════════
// MARY KAY HONDURAS — Tienda Oficial v4
// Categorías como páginas, compra sin cuenta, WA actualizado
// ═══════════════════════════════════════════════════════

const SUPABASE_URL = 'https://knoxphxvmjvkdioeopbi.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtub3hwaHh2bWp2a2Rpb2VvcGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzUxNjEsImV4cCI6MjA5MTQxMTE2MX0.4XSZGDibY6z0wdA0UysExc1Yt-yMmckfNs7nxU3fZUo'
const WA_NUMBER = '50498589303'

const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

const fmt = n => `L ${Number(n||0).toLocaleString('es-HN',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const esc = s => String(s||'').replace(/'/g,"&#39;").replace(/"/g,'&quot;')

// ── Estado ────────────────────────────────────────────
let todosProductos  = []
let carrito         = []
let paginaActiva    = 'novedades'
let busqueda        = ''
let productoModal   = null
let qtyModal        = 1
let usuarioActual   = null
let clienteActual   = null

// Códigos de productos NUEVOS Primavera 2026
const CODIGOS_NUEVOS = ['MK-NV001','MK-NV002','MK-NV003','MK-NV004','MK-NV005',
  'MK-NV006','MK-NV007','MK-NV008','MK-NV009']

// ════════════════════════════════════════════════════════
// NAVEGACIÓN DE PÁGINAS
// ════════════════════════════════════════════════════════
function cambiarPagina(pagina) {
  // Ocultar búsqueda si hay
  if (busqueda) {
    document.getElementById('buscar-input').value = ''
    busqueda = ''
    ocultarResultadosBusqueda()
  }

  // Cambiar tab activo
  document.querySelectorAll('.cat-nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === pagina)
  })

  // Cambiar página activa
  document.querySelectorAll('.cat-page').forEach(p => p.classList.remove('active'))
  const nuevaPagina = document.getElementById('page-' + pagina)
  if (nuevaPagina) nuevaPagina.classList.add('active')

  paginaActiva = pagina
  window.scrollTo({ top: 0, behavior: 'smooth' })
  renderPagina(pagina)
}

function renderPagina(pagina) {
  if (!todosProductos.length) return

  switch(pagina) {
    case 'novedades':
      renderGrid('grid-novedades', todosProductos.filter(p => CODIGOS_NUEVOS.includes(p.codigo)))
      break
    case 'skincare':
      renderGrid('grid-sk-clinical', todosProductos.filter(p => p.categoria === 'Skincare' && p.codigo.startsWith('MK-CS')))
      renderGrid('grid-sk-timewise', todosProductos.filter(p => p.categoria === 'Skincare' && p.codigo.startsWith('MK-TW')))
      renderGrid('grid-sk-repair',   todosProductos.filter(p => p.categoria === 'Skincare' && p.codigo.startsWith('MK-TR')))
      renderGrid('grid-sk-basica',   todosProductos.filter(p => p.categoria === 'Skincare' && (p.codigo.startsWith('MK-SK') || p.codigo.startsWith('MK-NV001'))))
      renderGrid('grid-sk-clearproof',todosProductos.filter(p => p.categoria === 'Skincare' && p.codigo.startsWith('MK-CP')))
      renderGrid('grid-sk-mkmen',    todosProductos.filter(p => p.categoria === 'Cuidado Personal' && p.codigo.startsWith('MK-MN')))
      renderGrid('grid-sk-especial', todosProductos.filter(p => p.categoria === 'Cuidado Personal' && p.codigo.startsWith('MK-CE')))
      break
    case 'maquillaje':
      renderGrid('grid-mq-rostro', todosProductos.filter(p => p.categoria === 'Maquillaje' && (p.codigo.startsWith('MK-RO') || p.codigo.startsWith('MK-CF'))))
      renderGrid('grid-mq-ojos',   todosProductos.filter(p => p.categoria === 'Maquillaje' && (p.codigo.startsWith('MK-OJ') || p.codigo.startsWith('MK-MA') || p.codigo.startsWith('MK-DE') || p.codigo.startsWith('MK-CF0'))))
      renderGrid('grid-mq-labios', todosProductos.filter(p => p.categoria === 'Maquillaje' && (p.codigo.startsWith('MK-LA') || p.codigo.startsWith('MK-CF002') || p.codigo.startsWith('MK-CF003') || p.codigo.startsWith('MK-CF004') || p.codigo.startsWith('MK-NV003') || p.codigo.startsWith('MK-NV004') || p.codigo.startsWith('MK-NV005') || p.codigo.startsWith('MK-NV006') || p.codigo.startsWith('MK-NV007'))))
      break
    case 'fragancias':
      renderGrid('grid-fr-ella', todosProductos.filter(p => p.categoria === 'Fragancias' && p.codigo.startsWith('MK-FR')))
      renderGrid('grid-fr-el',   todosProductos.filter(p => p.categoria === 'Fragancias' && p.codigo.startsWith('MK-FH')))
      break
    case 'cuidado':
      renderGrid('grid-cp-satin', todosProductos.filter(p => p.categoria === 'Cuidado Personal' && (p.codigo.startsWith('MK-SB') || p.codigo.startsWith('MK-NV008') || p.codigo.startsWith('MK-NV009'))))
      renderGrid('grid-cp-corpo', todosProductos.filter(p => p.categoria === 'Cuidado Personal' && (p.codigo.startsWith('MK-GL') || p.codigo.startsWith('MK-CE')) && !p.codigo.startsWith('MK-CE0')))
      // Also add MKMen individual
      const skCpCorpo = document.getElementById('grid-cp-corpo')
      if (skCpCorpo) {
        const extras = todosProductos.filter(p => p.categoria === 'Cuidado Personal' && p.codigo.startsWith('MK-CE'))
        renderGrid('grid-cp-corpo', [...todosProductos.filter(p => p.categoria === 'Cuidado Personal' && p.codigo.startsWith('MK-GL')), ...extras])
      }
      break
    case 'herramientas':
      renderGrid('grid-herramientas', todosProductos.filter(p => p.categoria === 'Herramientas'))
      break
    case 'sets':
      renderGrid('grid-set-timewise',  todosProductos.filter(p => p.categoria === 'Sets y Regalos' && p.codigo.startsWith('MK-SET-TW')))
      renderGrid('grid-set-repair',    todosProductos.filter(p => p.categoria === 'Sets y Regalos' && p.codigo.startsWith('MK-SET-TR')))
      renderGrid('grid-set-skincare',  todosProductos.filter(p => p.categoria === 'Sets y Regalos' && p.codigo.startsWith('MK-SET-SK')))
      renderGrid('grid-set-clearproof',todosProductos.filter(p => p.categoria === 'Sets y Regalos' && p.codigo.startsWith('MK-SET-CP')))
      renderGrid('grid-set-mkmen',     todosProductos.filter(p => p.categoria === 'Sets y Regalos' && p.codigo.startsWith('MK-SET-MN')))
      renderGrid('grid-set-satin',     todosProductos.filter(p => p.categoria === 'Sets y Regalos' && (p.codigo.startsWith('MK-SET-SB') || p.codigo.startsWith('MK-SET-HC') || p.codigo.startsWith('MK-NV002') || p.codigo.startsWith('MK-NV008'))))
      break
  }
}

// ════════════════════════════════════════════════════════
// CARGAR PRODUCTOS
// ════════════════════════════════════════════════════════
async function cargarProductos() {
  const { data, error } = await db
    .from('v_productos')
    .select('id,codigo,nombre,categoria,precio_venta,stock_actual,alerta,imagen_url')
    .eq('estado','Activo').order('nombre')

  if (error || !data) return

  todosProductos = data
  renderPagina(paginaActiva)

  // Tiempo real
  db.channel('tienda-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, cargarProductos)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_items' }, cargarProductos)
    .subscribe()
}

// ── Render de una grilla ──────────────────────────────
function renderGrid(gridId, lista) {
  const grid = document.getElementById(gridId)
  if (!grid) return

  if (!lista.length) {
    grid.innerHTML = `<div class="grid-empty">No hay productos disponibles en este momento.</div>`
    return
  }

  grid.innerHTML = lista.map(p => {
    const agotado   = p.alerta === 'AGOTADO'
    const bajo      = p.alerta === 'BAJO'
    const esNuevo   = CODIGOS_NUEVOS.includes(p.codigo)
    const enCarrito = carrito.find(i => i.id === p.id)

    const img = p.imagen_url
      ? `<img src="${p.imagen_url}" alt="${esc(p.nombre)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=pc-placeholder>💄</div>'">`
      : `<div class="pc-placeholder">💄</div>`

    const badge = agotado
      ? `<span class="pc-overlay-badge agotado">Agotado</span>`
      : bajo
      ? `<span class="pc-overlay-badge bajo">Últimas</span>`
      : esNuevo
      ? `<span class="pc-overlay-badge nuevo">¡Nuevo!</span>`
      : ''

    return `
      <div class="product-card ${agotado ? 'agotado' : ''}" onclick="abrirModalProducto('${p.id}')">
        <div class="pc-img-wrap">
          ${img}
          ${badge}
          <div class="pc-quick-add">${agotado ? 'Agotado' : enCarrito ? '✓ En carrito' : '🛍️ Ver y agregar'}</div>
        </div>
        <div class="pc-body">
          <div class="pc-cat">${p.categoria}</div>
          <div class="pc-name">${p.nombre}</div>
          <div class="pc-price-row">
            <span class="pc-price">${fmt(p.precio_venta)}</span>
            <span class="pc-stock-badge ${p.alerta.toLowerCase()}">${agotado ? 'Agotado' : bajo ? 'Últimas' : 'Disponible'}</span>
          </div>
        </div>
      </div>`
  }).join('')
}

// ════════════════════════════════════════════════════════
// BÚSQUEDA
// ════════════════════════════════════════════════════════
document.getElementById('buscar-input')?.addEventListener('input', e => {
  busqueda = e.target.value.toLowerCase().trim()
  if (!busqueda) {
    ocultarResultadosBusqueda()
    return
  }
  mostrarResultadosBusqueda()
})

function mostrarResultadosBusqueda() {
  // Crear sección de resultados si no existe
  let sr = document.getElementById('search-results-page')
  if (!sr) {
    sr = document.createElement('div')
    sr.id = 'search-results-page'
    document.querySelector('.site-main').prepend(sr)
  }

  const found = todosProductos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda) ||
    p.categoria.toLowerCase().includes(busqueda) ||
    p.codigo.toLowerCase().includes(busqueda)
  )

  // Ocultar páginas de categoría
  document.querySelectorAll('.cat-page').forEach(p => p.style.display = 'none')

  sr.style.display = 'block'
  sr.innerHTML = `
    <h3>${found.length} resultado${found.length !== 1 ? 's' : ''} para "<em>${busqueda}</em>"</h3>
    <div class="products-grid" id="grid-search"></div>`

  renderGrid('grid-search', found)
}

function ocultarResultadosBusqueda() {
  const sr = document.getElementById('search-results-page')
  if (sr) sr.style.display = 'none'
  document.querySelectorAll('.cat-page').forEach(p => p.style.display = '')
  // Restaurar la página activa
  const pa = document.getElementById('page-' + paginaActiva)
  if (pa) pa.classList.add('active')
}

// ════════════════════════════════════════════════════════
// MODAL PRODUCTO
// ════════════════════════════════════════════════════════
function abrirModalProducto(id) {
  const p = todosProductos.find(x => x.id === id)
  if (!p) return
  productoModal = p; qtyModal = 1

  const imgWrap = document.getElementById('pm-img-wrap')
  imgWrap.innerHTML = p.imagen_url
    ? `<img src="${p.imagen_url}" alt="${esc(p.nombre)}" onerror="this.parentElement.innerHTML='<div class=pm-img-placeholder>💄</div>'">`
    : `<div class="pm-img-placeholder">💄</div>`

  document.getElementById('pm-cat').textContent    = p.categoria
  document.getElementById('pm-nombre').textContent = p.nombre
  document.getElementById('pm-precio').textContent = fmt(p.precio_venta)
  document.getElementById('pm-qty').textContent    = '1'

  const stockEl = document.getElementById('pm-stock')
  stockEl.textContent = p.alerta === 'AGOTADO' ? 'Sin stock disponible'
    : p.alerta === 'BAJO' ? `¡Solo quedan ${p.stock_actual} unidades!`
    : `Disponible · ${p.stock_actual} en stock`
  stockEl.style.color = p.alerta === 'AGOTADO' ? 'var(--red)' : p.alerta === 'BAJO' ? 'var(--amber)' : 'var(--green)'

  const esNuevo = CODIGOS_NUEVOS.includes(p.codigo)
  document.getElementById('pm-badge-row').innerHTML = `
    <span style="font-size:11px;background:var(--mk-xlight);color:var(--mk-dark);padding:4px 10px;border-radius:99px;font-weight:700">${p.categoria}</span>
    ${esNuevo ? `<span style="font-size:11px;background:var(--mk);color:#fff;padding:4px 10px;border-radius:99px;font-weight:700">¡Nuevo!</span>` : ''}
    ${p.alerta !== 'OK' && p.alerta !== 'AGOTADO' ? `<span style="font-size:11px;background:#fffbeb;color:var(--amber);padding:4px 10px;border-radius:99px;font-weight:700">Pocas unidades</span>` : ''}`

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

function cerrarModalProducto() {
  document.getElementById('modal-producto').classList.remove('open')
  document.body.style.overflow = ''
  productoModal = null
}

function cambiarQtyModal(delta) {
  if (!productoModal) return
  qtyModal = Math.max(1, Math.min(qtyModal + delta, productoModal.stock_actual || 99))
  document.getElementById('pm-qty').textContent = qtyModal
}

function agregarDesdeModal() {
  if (!productoModal || productoModal.alerta === 'AGOTADO') return
  const { id, nombre, precio_venta, imagen_url } = productoModal
  for (let i = 0; i < qtyModal; i++) {
    const ex = carrito.find(x => x.id === id)
    if (ex) ex.cantidad++
    else carrito.push({ id, nombre, precio: precio_venta, imagen: imagen_url || '', cantidad: 1 })
  }
  actualizarCarritoUI()
  cerrarModalProducto()
  abrirCarrito()
  // Re-render la página actual para actualizar badges
  renderPagina(paginaActiva)
}

// ════════════════════════════════════════════════════════
// CARRITO
// ════════════════════════════════════════════════════════
function cambiarCantidad(id, delta) {
  const item = carrito.find(x => x.id === id)
  if (!item) return
  item.cantidad = Math.max(0, item.cantidad + delta)
  if (item.cantidad === 0) carrito = carrito.filter(x => x.id !== id)
  actualizarCarritoUI()
}

function quitarItem(id) {
  carrito = carrito.filter(x => x.id !== id)
  actualizarCarritoUI()
}

function actualizarCarritoUI() {
  const total    = carrito.reduce((s, i) => s + i.cantidad * i.precio, 0)
  const totalUds = carrito.reduce((s, i) => s + i.cantidad, 0)
  const badge = document.getElementById('cart-badge')
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
      <div class="ci-img">${i.imagen ? `<img src="${i.imagen}" alt="${esc(i.nombre)}" onerror="this.parentElement.innerHTML='💄'">` : '💄'}</div>
      <div class="ci-info">
        <div class="ci-name">${i.nombre}</div>
        <div class="ci-price">${fmt(i.precio)} c/u</div>
        <div class="ci-qty-row">
          <button class="ci-qty-btn" onclick="cambiarCantidad('${i.id}',-1)">−</button>
          <span class="ci-qty">${i.cantidad}</span>
          <button class="ci-qty-btn" onclick="cambiarCantidad('${i.id}',1)">+</button>
        </div>
      </div>
      <span class="ci-subtotal">${fmt(i.cantidad * i.precio)}</span>
      <button class="ci-remove" onclick="quitarItem('${i.id}')">×</button>
    </div>`).join('')

  document.getElementById('cart-total').textContent = fmt(total)
  document.getElementById('cart-units').textContent = `${totalUds} unidad${totalUds !== 1 ? 'es' : ''} en total`
  document.getElementById('cart-footer').style.display = 'block'
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
// CHECKOUT — No requiere cuenta
// ════════════════════════════════════════════════════════
function abrirCheckout() {
  if (carrito.length === 0) return
  cerrarCarrito()

  const total = carrito.reduce((s, i) => s + i.cantidad * i.precio, 0)
  document.getElementById('cs-items').innerHTML = carrito.map(i =>
    `<div class="csb-item"><span>${i.nombre} × ${i.cantidad}</span><strong>${fmt(i.cantidad * i.precio)}</strong></div>`
  ).join('')
  document.getElementById('cs-total').textContent = fmt(total)

  // Pre-llenar si hay sesión
  if (clienteActual) {
    document.getElementById('co-nombre').value = clienteActual.nombre || ''
    document.getElementById('co-tel').value    = clienteActual.telefono || ''
    document.getElementById('co-ciudad').value = clienteActual.ciudad || ''
  }

  document.getElementById('checkout-overlay').classList.add('open')
  document.body.style.overflow = 'hidden'
}
function cerrarCheckout() {
  document.getElementById('checkout-overlay').classList.remove('open')
  document.body.style.overflow = ''
}

document.getElementById('btn-place-order')?.addEventListener('click', async () => {
  const nombre   = document.getElementById('co-nombre').value.trim()
  const tel      = document.getElementById('co-tel').value.trim()
  const ciudad   = document.getElementById('co-ciudad').value.trim()
  const pago     = document.getElementById('co-pago').value
  const notas    = document.getElementById('co-notas').value.trim()
  const registrar = document.getElementById('co-registrar')?.checked

  if (!nombre || !tel) { alert('Por favor completa tu nombre y número de WhatsApp.'); return }

  const btn = document.getElementById('btn-place-order')
  btn.disabled = true; btn.textContent = 'Procesando...'

  try {
    let clienteId = null

    if (usuarioActual && clienteActual) {
      // Usuario con sesión activa
      clienteId = clienteActual.id
      await db.from('clientes').update({ nombre, telefono: tel, ciudad: ciudad || null }).eq('id', clienteId)
    } else {
      // Sin cuenta — buscar por teléfono o crear
      const { data: cli } = await db.from('clientes').select('id').eq('telefono', tel).maybeSingle()
      if (cli) {
        clienteId = cli.id
        await db.from('clientes').update({ nombre, ciudad: ciudad || null }).eq('id', clienteId)
      } else {
        const { data: nvo } = await db.from('clientes')
          .insert({ nombre, telefono: tel, ciudad: ciudad || null, etiqueta: 'Nueva' })
          .select('id').single()
        clienteId = nvo?.id
      }

      // Registro opcional
      if (registrar) {
        const email = document.getElementById('co-email')?.value.trim()
        const pass  = document.getElementById('co-pass')?.value
        const pass2 = document.getElementById('co-pass2')?.value
        if (email && pass && pass === pass2 && pass.length >= 6) {
          const { data: authData } = await db.auth.signUp({
            email, password: pass,
            options: { data: { nombre } }
          })
          if (authData?.user && clienteId) {
            await db.from('clientes').update({ auth_user_id: authData.user.id, email }).eq('id', clienteId)
          }
        }
      }
    }

    // Número de pedido
    const { data: num } = await db.rpc('generar_numero_pedido')

    // Crear pedido
    const { data: ped } = await db.from('pedidos').insert({
      numero: num, cliente_id: clienteId,
      canal: 'Tienda online', metodo_pago: pago,
      notas: notas || null, estado: 'Pendiente',
      fecha: new Date().toISOString().split('T')[0],
    }).select('id').single()

    // Items
    await db.from('pedido_items').insert(
      carrito.map(i => ({ pedido_id: ped.id, producto_id: i.id, cantidad: i.cantidad, precio_unitario: i.precio }))
    )

    // Éxito
    const total   = carrito.reduce((s, i) => s + i.cantidad * i.precio, 0)
    const telNum  = tel.replace(/\D/g, '')
    const waMsg   = encodeURIComponent(`Hola! 🌸 Acabo de hacer el pedido *${num}* por *${fmt(total)}*. ¿Me pueden confirmar? Gracias!`)

    document.getElementById('confirm-num').textContent        = num
    document.getElementById('confirm-name').textContent       = nombre
    document.getElementById('confirm-total-text').textContent = fmt(total)
    document.getElementById('confirm-wa').href = `https://wa.me/${WA_NUMBER}?text=${waMsg}`

    carrito = []; actualizarCarritoUI(); renderPagina(paginaActiva)
    cerrarCheckout()
    ;['co-nombre','co-tel','co-ciudad','co-notas'].forEach(id => { const el = document.getElementById(id); if(el) el.value = '' })
    document.getElementById('confirm-overlay').style.display = 'flex'

  } catch (err) {
    console.error(err)
    alert('Error al procesar el pedido. Intenta de nuevo.')
  }
  btn.disabled = false; btn.textContent = '✅ Confirmar pedido'
})

// ════════════════════════════════════════════════════════
// AUTH — Opcional
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
    area.innerHTML = `
      <div class="user-chip">
        <span class="user-avatar">${nombre.charAt(0).toUpperCase()}</span>
        <span class="user-name">${nombre.split(' ')[0]}</span>
        <button class="btn-logout" onclick="cerrarSesion()" title="Cerrar sesión">↩</button>
      </div>`
  } else {
    area.innerHTML = `<button class="btn-login-header" onclick="abrirAuth('login')">Mi cuenta</button>`
  }
}

function abrirAuth(tab = 'login') {
  document.getElementById('modal-auth').classList.add('open')
  cambiarTab(tab)
  document.body.style.overflow = 'hidden'
}
function cerrarAuth() {
  document.getElementById('modal-auth').classList.remove('open')
  document.body.style.overflow = ''
}
function cambiarTab(tab) {
  document.getElementById('panel-login').style.display    = tab === 'login'    ? 'block' : 'none'
  document.getElementById('panel-register').style.display = tab === 'register' ? 'block' : 'none'
  document.getElementById('tab-login').classList.toggle('active',    tab === 'login')
  document.getElementById('tab-register').classList.toggle('active', tab === 'register')
  document.getElementById('auth-login-alert').innerHTML    = ''
  document.getElementById('auth-register-alert').innerHTML = ''
}

async function hacerLogin() {
  const email = document.getElementById('login-email').value.trim()
  const pass  = document.getElementById('login-pass').value
  const alertEl = document.getElementById('auth-login-alert')
  const btn   = document.getElementById('btn-login')
  if (!email || !pass) { mostrarAuthAlert(alertEl,'Completa todos los campos.','error'); return }
  btn.disabled = true; btn.textContent = 'Ingresando...'
  const { error } = await db.auth.signInWithPassword({ email, password: pass })
  btn.disabled = false; btn.textContent = 'Iniciar sesión'
  if (error) { mostrarAuthAlert(alertEl, error.message.includes('Invalid') ? 'Correo o contraseña incorrectos.' : error.message, 'error'); return }
  cerrarAuth()
}

async function hacerRegistro() {
  const nombre = document.getElementById('reg-nombre').value.trim()
  const tel    = document.getElementById('reg-tel').value.trim()
  const ciudad = document.getElementById('reg-ciudad').value.trim()
  const email  = document.getElementById('reg-email').value.trim()
  const pass   = document.getElementById('reg-pass').value
  const pass2  = document.getElementById('reg-pass2').value
  const terms  = document.getElementById('reg-terms').checked
  const alertEl = document.getElementById('auth-register-alert')
  const btn    = document.getElementById('btn-register')
  if (!nombre || !tel || !email || !pass) { mostrarAuthAlert(alertEl,'Completa todos los campos obligatorios.','error'); return }
  if (pass !== pass2) { mostrarAuthAlert(alertEl,'Las contraseñas no coinciden.','error'); return }
  if (pass.length < 6) { mostrarAuthAlert(alertEl,'La contraseña debe tener al menos 6 caracteres.','error'); return }
  if (!terms) { mostrarAuthAlert(alertEl,'Debes aceptar los términos y condiciones.','error'); return }
  btn.disabled = true; btn.textContent = 'Creando cuenta...'
  const { data: authData, error: authError } = await db.auth.signUp({
    email, password: pass, options: { data: { nombre } }
  })
  if (authError) {
    btn.disabled = false; btn.textContent = 'Crear mi cuenta'
    mostrarAuthAlert(alertEl, authError.message.includes('already registered') ? 'Este correo ya tiene una cuenta.' : authError.message, 'error')
    return
  }
  if (authData?.user) {
    await db.from('clientes').update({ nombre, telefono: tel, ciudad: ciudad || null, email }).eq('auth_user_id', authData.user.id)
  }
  btn.disabled = false; btn.textContent = 'Crear mi cuenta'
  mostrarAuthAlert(alertEl, '✓ Cuenta creada. Ya puedes iniciar sesión.', 'success')
  setTimeout(() => cambiarTab('login'), 2000)
}

async function cerrarSesion() {
  await db.auth.signOut()
}

function mostrarAuthAlert(el, msg, tipo) {
  el.innerHTML = `<div class="auth-alert auth-alert-${tipo}">${msg}</div>`
}

// ════════════════════════════════════════════════════════
// MODALES DE INFORMACIÓN
// ════════════════════════════════════════════════════════
const infoContent = {
  'como-comprar': {
    titulo: '¿Cómo comprar?',
    html: `
      <div class="info-steps">
        <div class="info-step"><div class="step-num">1</div><div><strong>Explora nuestros productos</strong><p>Navega por categorías o usa el buscador para encontrar lo que necesitas.</p></div></div>
        <div class="info-step"><div class="step-num">2</div><div><strong>Agrega al carrito</strong><p>Haz clic en el producto y agrégalo a tu carrito. No necesitas crear una cuenta.</p></div></div>
        <div class="info-step"><div class="step-num">3</div><div><strong>Completa tu pedido</strong><p>Ingresa tu nombre, número de WhatsApp y dirección de entrega.</p></div></div>
        <div class="info-step"><div class="step-num">4</div><div><strong>Confirmamos por WhatsApp</strong><p>Te contactamos al número que nos diste para confirmar y coordinar la entrega.</p></div></div>
        <div class="info-step"><div class="step-num">5</div><div><strong>¡Recibe tus productos!</strong><p>Disfruta tus productos Mary Kay 100% originales en la puerta de tu casa.</p></div></div>
      </div>
      <div class="info-note" style="margin-top:16px">💡 ¿Quieres llevar un historial de tus pedidos? Puedes crear una cuenta gratuita al momento de hacer tu pedido.</div>`
  },
  'metodos-pago': {
    titulo: 'Métodos de pago',
    html: `
      <div class="info-list">
        <div class="info-pago-item"><span class="pago-ico">💵</span><div><strong>Efectivo al recibir</strong><p>Pagas cuando tu pedido llega a tus manos. Sin riesgo.</p></div></div>
        <div class="info-pago-item"><span class="pago-ico">🏦</span><div><strong>Transferencia BAC Credomatic</strong><p>Transferencia bancaria directa. Te enviamos los datos por WhatsApp.</p></div></div>
        <div class="info-pago-item"><span class="pago-ico">💻</span><div><strong>PayPal</strong><p>Pago seguro en línea con tu cuenta PayPal o tarjeta de crédito.</p></div></div>
        <div class="info-pago-item"><span class="pago-ico">💳</span><div><strong>Tarjeta de crédito/débito</strong><p>Aceptamos Visa y Mastercard.</p></div></div>
        <div class="info-pago-item"><span class="pago-ico">📅</span><div><strong>Pago en partes</strong><p>Dividimos tu pedido en cuotas. Consulta disponibilidad por WhatsApp.</p></div></div>
      </div>`
  },
  'envios': {
    titulo: 'Envíos y entregas',
    html: `
      <p>Realizamos envíos a <strong>todos los departamentos de Honduras</strong>.</p>
      <div class="info-table" style="margin:14px 0">
        <div class="info-table-row header"><span>Zona</span><span>Tiempo estimado</span></div>
        <div class="info-table-row"><span>Tegucigalpa</span><span>1-2 días hábiles</span></div>
        <div class="info-table-row"><span>San Pedro Sula</span><span>2-3 días hábiles</span></div>
        <div class="info-table-row"><span>Otras ciudades</span><span>3-5 días hábiles</span></div>
        <div class="info-table-row"><span>Zonas rurales</span><span>5-7 días hábiles</span></div>
      </div>
      <p>El costo de envío varía según tu ubicación. Te lo informamos al confirmar tu pedido por WhatsApp.</p>
      <div class="info-note">📦 Todos los pedidos son empacados cuidadosamente para que lleguen en perfectas condiciones.</div>`
  },
  'cambios': {
    titulo: 'Política de cambios',
    html: `
      <div class="info-list">
        <div class="info-pago-item"><span class="pago-ico">✅</span><div><strong>Producto dañado o incorrecto</strong><p>Lo cambiamos sin costo adicional.</p></div></div>
        <div class="info-pago-item"><span class="pago-ico">📸</span><div><strong>¿Cómo proceder?</strong><p>Toma una foto y contáctanos por WhatsApp dentro de las 48 horas de recibido.</p></div></div>
        <div class="info-pago-item"><span class="pago-ico">⏰</span><div><strong>Plazo</strong><p>7 días calendario después de recibir tu pedido.</p></div></div>
        <div class="info-pago-item"><span class="pago-ico">🚫</span><div><strong>Productos no elegibles</strong><p>Por higiene, no se aceptan devoluciones de maquillaje ya abierto o usado.</p></div></div>
      </div>`
  },
  'terminos': {
    titulo: 'Términos y condiciones',
    html: `
      <h3>1. Aceptación</h3><p>Al realizar compras en nuestra tienda, aceptas estos términos en su totalidad.</p>
      <h3>2. Cuenta de usuario (opcional)</h3><p>Puedes comprar sin cuenta. Si creas una cuenta, eres responsable de mantener la confidencialidad de tu contraseña.</p>
      <h3>3. Productos</h3><p>Todos los productos son Mary Kay originales. Nos reservamos el derecho de modificar precios y disponibilidad.</p>
      <h3>4. Pedidos</h3><p>Un pedido se confirma cuando recibes confirmación por WhatsApp.</p>
      <h3>5. Precios</h3><p>Precios en Lempiras Hondureños (L). Incluyen impuestos aplicables.</p>
      <h3>6. Envíos</h3><p>Los tiempos de entrega son estimados. No nos responsabilizamos por retrasos externos.</p>
      <h3>7. Pagos</h3><p>Para pagos electrónicos, no se envía mercadería sin confirmación de pago.</p>`
  },
  'privacidad': {
    titulo: 'Política de privacidad',
    html: `
      <h3>1. Información que recopilamos</h3><p>Nombre, correo (si aplica), teléfono, ciudad y dirección de entrega.</p>
      <h3>2. Uso de la información</h3><p>Para procesar pedidos, coordinar entregas y enviarte información de productos (con tu consentimiento).</p>
      <h3>3. Protección de datos</h3><p>Tu información está protegida con cifrado SSL. No vendemos ni compartimos datos con terceros.</p>
      <h3>4. Tus derechos</h3><p>Puedes solicitar acceso, corrección o eliminación de tu información contactándonos por WhatsApp.</p>
      <h3>5. Cookies</h3><p>Usamos cookies técnicas necesarias para el funcionamiento del sitio, sin seguimiento publicitario.</p>`
  }
}

function abrirInfo(key) {
  const c = infoContent[key]; if (!c) return
  document.getElementById('info-title').textContent = c.titulo
  document.getElementById('info-body').innerHTML    = c.html
  document.getElementById('modal-info').classList.add('open')
  document.body.style.overflow = 'hidden'
}
function cerrarInfo() {
  document.getElementById('modal-info').classList.remove('open')
  document.body.style.overflow = ''
}

// ── Inicio ────────────────────────────────────────────
inicializarAuth()
renderUserArea()
actualizarCarritoUI()
cargarProductos()
