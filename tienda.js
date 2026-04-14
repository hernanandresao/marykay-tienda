// ═══════════════════════════════════════════════════════
// MARY KAY HONDURAS — Tienda Oficial v3
// Con autenticación, políticas y links activos
// ═══════════════════════════════════════════════════════

const SUPABASE_URL = 'https://knoxphxvmjvkdioeopbi.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtub3hwaHh2bWp2a2Rpb2VvcGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzUxNjEsImV4cCI6MjA5MTQxMTE2MX0.4XSZGDibY6z0wdA0UysExc1Yt-yMmckfNs7nxU3fZUo'

const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Helpers ───────────────────────────────────────────
const fmt = n => `L ${Number(n||0).toLocaleString('es-HN',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const esc = s => String(s||'').replace(/'/g,"&#39;").replace(/"/g,'&quot;')

// ── Estado global ─────────────────────────────────────
let todosProductos  = []
let carrito         = []
let categoriaActiva = 'Todas'
let busqueda        = ''
let productoModal   = null
let qtyModal        = 1
let usuarioActual   = null   // Supabase Auth user
let clienteActual   = null   // Registro en tabla clientes

// ════════════════════════════════════════════════════════
// AUTENTICACIÓN
// ════════════════════════════════════════════════════════

// Verificar sesión al cargar
async function inicializarAuth() {
  const { data: { session } } = await db.auth.getSession()
  if (session?.user) await cargarUsuario(session.user)

  // Escuchar cambios de sesión
  db.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN'  && session?.user) await cargarUsuario(session.user)
    if (event === 'SIGNED_OUT') {
      usuarioActual = null
      clienteActual = null
      renderUserArea()
    }
  })
}

async function cargarUsuario(user) {
  usuarioActual = user
  // Cargar perfil de clientes
  const { data } = await db.from('clientes').select('*').eq('auth_user_id', user.id).maybeSingle()
  clienteActual = data
  renderUserArea()
  // Pre-llenar checkout si hay datos
  if (clienteActual) {
    document.getElementById('co-nombre').value = clienteActual.nombre || ''
    document.getElementById('co-tel').value    = clienteActual.telefono || ''
    document.getElementById('co-ciudad').value = clienteActual.ciudad || ''
  }
}

function renderUserArea() {
  const area = document.getElementById('user-area')
  if (usuarioActual) {
    const nombre = clienteActual?.nombre || usuarioActual.email.split('@')[0]
    area.innerHTML = `
      <div class="user-chip">
        <span class="user-avatar">${nombre.charAt(0).toUpperCase()}</span>
        <span class="user-name">Hola, ${nombre.split(' ')[0]}</span>
        <button class="btn-logout" onclick="cerrarSesion()" title="Cerrar sesión">↩</button>
      </div>`
  } else {
    area.innerHTML = `
      <button class="btn-login-header" onclick="abrirAuth('login')">Iniciar sesión</button>
      <button class="btn-register-header" onclick="abrirAuth('register')">Crear cuenta</button>`
  }
}

// ── Abrir/cerrar modal de auth ────────────────────────
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

// ── Login ─────────────────────────────────────────────
async function hacerLogin() {
  const email = document.getElementById('login-email').value.trim()
  const pass  = document.getElementById('login-pass').value
  const alertEl = document.getElementById('auth-login-alert')
  const btn   = document.getElementById('btn-login')

  if (!email || !pass) { mostrarAuthAlert(alertEl, 'Completa todos los campos.', 'error'); return }

  btn.disabled = true; btn.textContent = 'Ingresando...'
  const { error } = await db.auth.signInWithPassword({ email, password: pass })
  btn.disabled = false; btn.textContent = 'Iniciar sesión'

  if (error) {
    const msg = error.message.includes('Invalid') ? 'Correo o contraseña incorrectos.' : error.message
    mostrarAuthAlert(alertEl, msg, 'error')
    return
  }
  cerrarAuth()
}

// ── Registro ──────────────────────────────────────────
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

  if (!nombre || !tel || !email || !pass) { mostrarAuthAlert(alertEl, 'Completa todos los campos obligatorios (*).', 'error'); return }
  if (pass !== pass2) { mostrarAuthAlert(alertEl, 'Las contraseñas no coinciden.', 'error'); return }
  if (pass.length < 6) { mostrarAuthAlert(alertEl, 'La contraseña debe tener al menos 6 caracteres.', 'error'); return }
  if (!terms) { mostrarAuthAlert(alertEl, 'Debes aceptar los términos y condiciones.', 'error'); return }

  btn.disabled = true; btn.textContent = 'Creando cuenta...'

  const { data: authData, error: authError } = await db.auth.signUp({
    email, password: pass,
    options: { data: { nombre } }
  })

  if (authError) {
    btn.disabled = false; btn.textContent = 'Crear mi cuenta'
    const msg = authError.message.includes('already registered') ? 'Este correo ya tiene una cuenta. Inicia sesión.' : authError.message
    mostrarAuthAlert(alertEl, msg, 'error')
    return
  }

  // Actualizar el perfil de clientes con datos completos
  if (authData.user) {
    await db.from('clientes')
      .update({ nombre, telefono: tel, ciudad: ciudad || null, email })
      .eq('auth_user_id', authData.user.id)
  }

  btn.disabled = false; btn.textContent = 'Crear mi cuenta'
  mostrarAuthAlert(alertEl,
    '✓ Cuenta creada exitosamente. Revisa tu correo para confirmar (opcional) e inicia sesión.',
    'success')
  setTimeout(() => cambiarTab('login'), 2500)
}

// ── Cerrar sesión ─────────────────────────────────────
async function cerrarSesion() {
  await db.auth.signOut()
  renderUserArea()
}

function mostrarAuthAlert(el, msg, tipo) {
  el.innerHTML = `<div class="auth-alert auth-alert-${tipo}">${msg}</div>`
}

// ════════════════════════════════════════════════════════
// PRODUCTOS
// ════════════════════════════════════════════════════════
async function cargarProductos() {
  document.getElementById('products-grid').innerHTML = `
    <div class="loading-state"><div class="loader-ring"></div><p>Cargando productos...</p></div>`

  const { data, error } = await db
    .from('v_productos')
    .select('id,codigo,nombre,categoria,precio_venta,stock_actual,alerta,imagen_url')
    .eq('estado','Activo').order('categoria').order('nombre')

  if (error || !data) {
    document.getElementById('products-grid').innerHTML =
      '<div class="empty-state"><span class="es-icon">⚠️</span><p>Error al cargar. Recarga la página.</p></div>'
    return
  }

  todosProductos = data
  buildCatNav()
  buildFooterCats()
  renderProductos()

  db.channel('tienda-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, cargarProductos)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_items' }, cargarProductos)
    .subscribe()
}

function buildCatNav() {
  const cats = ['Todas', ...new Set(todosProductos.map(p => p.categoria))]
  document.getElementById('cat-nav').innerHTML = cats.map(c =>
    `<button class="cat-nav-btn ${c === categoriaActiva ? 'active' : ''}" onclick="filtrarCat('${esc(c)}')">${c}</button>`
  ).join('')
}

function buildFooterCats() {
  const cats = ['Todas', ...new Set(todosProductos.map(p => p.categoria))]
  document.getElementById('footer-cats').innerHTML = cats.map(c =>
    `<li><a href="#" onclick="filtrarCat('${esc(c)}');scrollTop();return false">${c}</a></li>`
  ).join('')
}

function scrollTop() { document.getElementById('productos-section').scrollIntoView({ behavior: 'smooth' }) }

function filtrarCat(cat) {
  categoriaActiva = cat
  document.querySelectorAll('.cat-nav-btn').forEach(b => b.classList.toggle('active', b.textContent.trim() === cat))
  renderProductos()
  scrollTop()
}

document.getElementById('buscar-input')?.addEventListener('input', e => {
  busqueda = e.target.value.toLowerCase()
  if (busqueda) categoriaActiva = 'Todas'
  document.querySelectorAll('.cat-nav-btn').forEach(b => b.classList.toggle('active', !busqueda && b.textContent.trim() === 'Todas'))
  renderProductos()
})

function renderProductos() {
  const lista = todosProductos.filter(p => {
    const porCat  = categoriaActiva === 'Todas' || p.categoria === categoriaActiva
    const porBusq = !busqueda || p.nombre.toLowerCase().includes(busqueda) || p.categoria.toLowerCase().includes(busqueda)
    return porCat && porBusq
  })

  const grid = document.getElementById('products-grid')
  if (lista.length === 0) {
    grid.innerHTML = `<div class="empty-state"><span class="es-icon">🔍</span><p>No encontramos productos.<br>Prueba con otra búsqueda.</p></div>`
    return
  }

  grid.innerHTML = lista.map(p => {
    const agotado   = p.alerta === 'AGOTADO'
    const bajo      = p.alerta === 'BAJO'
    const enCarrito = carrito.find(i => i.id === p.id)
    const img = p.imagen_url
      ? `<img src="${p.imagen_url}" alt="${esc(p.nombre)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=pc-placeholder>💄</div>'">`
      : `<div class="pc-placeholder">💄</div>`

    return `
      <div class="product-card ${agotado ? 'agotado' : ''}" onclick="abrirModalProducto('${p.id}')">
        <div class="pc-img-wrap">
          ${img}
          ${agotado ? '<span class="pc-overlay-badge agotado">Agotado</span>' : bajo ? '<span class="pc-overlay-badge bajo">Últimas unidades</span>' : ''}
          <div class="pc-quick-add">${agotado ? 'Producto agotado' : enCarrito ? '✓ En carrito — ver más' : '🛍️ Ver y agregar'}</div>
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
  stockEl.textContent = p.alerta === 'AGOTADO' ? 'Sin stock disponible' : p.alerta === 'BAJO' ? `¡Solo quedan ${p.stock_actual} unidades!` : `Disponible · ${p.stock_actual} en stock`
  stockEl.style.color = p.alerta === 'AGOTADO' ? 'var(--red)' : p.alerta === 'BAJO' ? 'var(--amber)' : 'var(--green)'

  document.getElementById('pm-badge-row').innerHTML = `
    <span style="font-size:11px;background:var(--mk-xlight);color:var(--mk-dark);padding:4px 10px;border-radius:99px;font-weight:700">${p.categoria}</span>
    ${p.alerta !== 'OK' ? `<span style="font-size:11px;background:${p.alerta==='AGOTADO'?'var(--red-bg)':'#fffbeb'};color:${p.alerta==='AGOTADO'?'var(--red)':'var(--amber)'};padding:4px 10px;border-radius:99px;font-weight:700">${p.alerta==='AGOTADO'?'Agotado':'Pocas unidades'}</span>` : ''}`

  const addBtn = document.getElementById('pm-add-btn')
  addBtn.disabled    = p.alerta === 'AGOTADO'
  addBtn.textContent = p.alerta === 'AGOTADO' ? '🚫 Producto agotado' : '🛍️ Agregar al carrito'

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
  renderProductos()
}

// ════════════════════════════════════════════════════════
// CARRITO
// ════════════════════════════════════════════════════════
function cambiarCantidad(id, delta) {
  const item = carrito.find(x => x.id === id)
  if (!item) return
  item.cantidad = Math.max(0, item.cantidad + delta)
  if (item.cantidad === 0) carrito = carrito.filter(x => x.id !== id)
  actualizarCarritoUI(); renderProductos()
}

function quitarItem(id) {
  carrito = carrito.filter(x => x.id !== id)
  actualizarCarritoUI(); renderProductos()
}

function actualizarCarritoUI() {
  const total    = carrito.reduce((s, i) => s + i.cantidad * i.precio, 0)
  const totalUds = carrito.reduce((s, i) => s + i.cantidad, 0)

  const badge = document.getElementById('cart-badge')
  badge.textContent    = totalUds
  badge.style.display  = totalUds > 0 ? 'flex' : 'none'

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

// Ir a checkout — requiere sesión iniciada
function irACheckout() {
  if (carrito.length === 0) return
  if (!usuarioActual) {
    cerrarCarrito()
    abrirAuth('login')
    // Mostrar mensaje de que necesita iniciar sesión
    setTimeout(() => {
      document.getElementById('auth-login-alert').innerHTML =
        '<div class="auth-alert auth-alert-info">💄 Inicia sesión o crea una cuenta para completar tu pedido.</div>'
    }, 300)
    return
  }
  cerrarCarrito()
  abrirCheckout()
}

// ════════════════════════════════════════════════════════
// CHECKOUT
// ════════════════════════════════════════════════════════
function abrirCheckout() {
  const total = carrito.reduce((s, i) => s + i.cantidad * i.precio, 0)
  document.getElementById('cs-items').innerHTML = carrito.map(i =>
    `<div class="csb-item"><span>${i.nombre} × ${i.cantidad}</span><strong>${fmt(i.cantidad * i.precio)}</strong></div>`
  ).join('')
  document.getElementById('cs-total').textContent = fmt(total)

  // Pre-llenar con datos del usuario
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
  const nombre = document.getElementById('co-nombre').value.trim()
  const tel    = document.getElementById('co-tel').value.trim()
  const ciudad = document.getElementById('co-ciudad').value.trim()
  const pago   = document.getElementById('co-pago').value
  const notas  = document.getElementById('co-notas').value.trim()

  if (!nombre || !tel) { alert('Por favor completa tu nombre y WhatsApp.'); return }
  if (!usuarioActual)  { cerrarCheckout(); abrirAuth('login'); return }

  const btn = document.getElementById('btn-place-order')
  btn.disabled = true; btn.textContent = 'Procesando...'

  try {
    // Actualizar datos del cliente si cambiaron
    if (clienteActual) {
      await db.from('clientes').update({ nombre, telefono: tel, ciudad: ciudad || null }).eq('id', clienteActual.id)
    }

    const clienteId = clienteActual?.id
    const { data: num } = await db.rpc('generar_numero_pedido')

    const { data: ped } = await db.from('pedidos').insert({
      numero: num, cliente_id: clienteId,
      canal: 'Tienda online', metodo_pago: pago,
      notas: notas || null, estado: 'Pendiente',
      fecha: new Date().toISOString().split('T')[0],
    }).select('id').single()

    await db.from('pedido_items').insert(
      carrito.map(i => ({ pedido_id: ped.id, producto_id: i.id, cantidad: i.cantidad, precio_unitario: i.precio }))
    )

    const total   = carrito.reduce((s, i) => s + i.cantidad * i.precio, 0)
    const telNum  = tel.replace(/\D/g, '')
    const waMsg   = encodeURIComponent(`Hola! 🌸 Acabo de hacer el pedido *${num}* por *${fmt(total)}*. ¿Me pueden confirmar? Gracias!`)

    document.getElementById('confirm-num').textContent        = num
    document.getElementById('confirm-name').textContent       = nombre
    document.getElementById('confirm-total-text').textContent = fmt(total)
    document.getElementById('confirm-wa').href                = `https://wa.me/504${telNum}?text=${waMsg}`

    carrito = []
    actualizarCarritoUI()
    renderProductos()
    cerrarCheckout()
    ;['co-nombre','co-tel','co-ciudad','co-notas'].forEach(id => document.getElementById(id).value = '')
    document.getElementById('confirm-overlay').style.display = 'flex'

  } catch (err) {
    console.error(err)
    alert('Error al procesar el pedido. Intenta de nuevo.')
  }

  btn.disabled = false; btn.textContent = '✅ Confirmar pedido'
})

// ════════════════════════════════════════════════════════
// MODALES DE INFORMACIÓN / POLÍTICAS
// ════════════════════════════════════════════════════════
const infoContent = {
  'como-comprar': {
    titulo: '¿Cómo comprar?',
    html: `
      <div class="info-steps">
        <div class="info-step"><div class="step-num">1</div><div><strong>Explora nuestros productos</strong><p>Navega por categorías o usa el buscador para encontrar lo que necesitas.</p></div></div>
        <div class="info-step"><div class="step-num">2</div><div><strong>Crea tu cuenta</strong><p>Regístrate gratis con tu correo. Solo necesitas hacerlo una vez.</p></div></div>
        <div class="info-step"><div class="step-num">3</div><div><strong>Agrega al carrito</strong><p>Haz clic en el producto que te guste y agrégalo a tu carrito.</p></div></div>
        <div class="info-step"><div class="step-num">4</div><div><strong>Completa tu pedido</strong><p>Ingresa tu dirección y método de pago preferido.</p></div></div>
        <div class="info-step"><div class="step-num">5</div><div><strong>Confirmamos y enviamos</strong><p>Te contactamos por WhatsApp para confirmar y coordinar la entrega.</p></div></div>
        <div class="info-step"><div class="step-num">6</div><div><strong>¡Recibe tus productos!</strong><p>Disfruta tus productos Mary Kay 100% originales en la puerta de tu casa.</p></div></div>
      </div>`
  },
  'metodos-pago': {
    titulo: 'Métodos de pago',
    html: `
      <div class="info-list">
        <div class="info-pago-item"><span class="pago-ico">💵</span><div><strong>Efectivo al recibir</strong><p>Pagas cuando tu pedido llega a tus manos. Sin riesgo.</p></div></div>
        <div class="info-pago-item"><span class="pago-ico">🏦</span><div><strong>Transferencia BAC Credomatic</strong><p>Transferencia bancaria directa. Te enviamos los datos por WhatsApp.</p></div></div>
        <div class="info-pago-item"><span class="pago-ico">💻</span><div><strong>PayPal</strong><p>Pago seguro en línea con tu cuenta PayPal o tarjeta de crédito.</p></div></div>
        <div class="info-pago-item"><span class="pago-ico">💳</span><div><strong>Tarjeta de crédito/débito</strong><p>Aceptamos Visa y Mastercard a través de pasarela segura.</p></div></div>
        <div class="info-pago-item"><span class="pago-ico">📅</span><div><strong>Pago en partes</strong><p>Dividimos tu pedido en cuotas. Consulta disponibilidad por WhatsApp.</p></div></div>
      </div>
      <div class="info-note">💡 Todos los pagos son 100% seguros. Nunca compartimos tu información financiera.</div>`
  },
  'envios': {
    titulo: 'Envíos y entregas',
    html: `
      <h3 style="color:var(--mk);margin-bottom:12px">Cobertura nacional 🚚</h3>
      <p>Realizamos envíos a <strong>todos los departamentos de Honduras</strong>. No importa dónde estés, hacemos llegar tus productos Mary Kay.</p>
      <div class="info-table" style="margin:16px 0">
        <div class="info-table-row header"><span>Zona</span><span>Tiempo estimado</span></div>
        <div class="info-table-row"><span>Tegucigalpa</span><span>1-2 días hábiles</span></div>
        <div class="info-table-row"><span>San Pedro Sula</span><span>2-3 días hábiles</span></div>
        <div class="info-table-row"><span>Otras ciudades</span><span>3-5 días hábiles</span></div>
        <div class="info-table-row"><span>Zonas rurales</span><span>5-7 días hábiles</span></div>
      </div>
      <h3 style="color:var(--mk);margin:16px 0 8px">Costos de envío</h3>
      <p>El costo de envío varía según tu ubicación. Te lo informamos exactamente al confirmar tu pedido por WhatsApp.</p>
      <div class="info-note">📦 Todos los pedidos son empacados cuidadosamente para que lleguen en perfectas condiciones.</div>`
  },
  'cambios': {
    titulo: 'Política de cambios y devoluciones',
    html: `
      <h3 style="color:var(--mk);margin-bottom:12px">Nuestra garantía</h3>
      <p>Tu satisfacción es nuestra prioridad. Si por alguna razón no estás conforme con tu pedido, estamos aquí para ayudarte.</p>
      <div class="info-list" style="margin-top:16px">
        <div class="info-pago-item"><span class="pago-ico">✅</span><div><strong>Producto dañado o incorrecto</strong><p>Si recibes un producto dañado o diferente al pedido, lo cambiamos sin costo adicional.</p></div></div>
        <div class="info-pago-item"><span class="pago-ico">📸</span><div><strong>¿Cómo proceder?</strong><p>Toma una foto del producto y contáctanos por WhatsApp dentro de las 48 horas de recibido.</p></div></div>
        <div class="info-pago-item"><span class="pago-ico">⏰</span><div><strong>Plazo para cambios</strong><p>Aceptamos cambios dentro de los 7 días calendario después de recibir tu pedido.</p></div></div>
        <div class="info-pago-item"><span class="pago-ico">🚫</span><div><strong>Productos no elegibles</strong><p>Por higiene, no se aceptan devoluciones de productos de maquillaje ya abiertos o usados.</p></div></div>
      </div>
      <div class="info-note">💬 Para cualquier gestión, contáctanos por WhatsApp. Respondemos en horario de lunes a sábado.</div>`
  },
  'terminos': {
    titulo: 'Términos y condiciones',
    html: `
      <p style="color:var(--gray-400);font-size:12px;margin-bottom:16px">Última actualización: Enero 2025</p>
      <h3>1. Aceptación de términos</h3>
      <p>Al crear una cuenta y realizar compras en nuestra tienda, aceptas estos términos y condiciones en su totalidad.</p>
      <h3>2. Cuenta de usuario</h3>
      <p>Para realizar pedidos debes crear una cuenta con información verídica. Eres responsable de mantener la confidencialidad de tu contraseña.</p>
      <h3>3. Productos</h3>
      <p>Todos los productos ofrecidos son Mary Kay originales adquiridos a través de canales oficiales. Nos reservamos el derecho de modificar precios y disponibilidad sin previo aviso.</p>
      <h3>4. Pedidos</h3>
      <p>Un pedido se considera confirmado cuando recibes confirmación por WhatsApp. Nos reservamos el derecho de cancelar pedidos en caso de errores de precio o falta de stock.</p>
      <h3>5. Precios</h3>
      <p>Todos los precios están expresados en Lempiras Hondureños (L). Los precios incluyen impuestos aplicables.</p>
      <h3>6. Envíos y entregas</h3>
      <p>Los tiempos de entrega son estimados y pueden variar. No nos hacemos responsables por retrasos causados por factores externos.</p>
      <h3>7. Pagos</h3>
      <p>El pago debe realizarse al momento de la entrega (efectivo) o antes del envío (transferencia/PayPal). No se envía mercadería sin confirmación de pago para pagos electrónicos.</p>
      <h3>8. Modificaciones</h3>
      <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios serán comunicados a través de nuestros canales oficiales.</p>`
  },
  'privacidad': {
    titulo: 'Política de privacidad',
    html: `
      <p style="color:var(--gray-400);font-size:12px;margin-bottom:16px">Última actualización: Enero 2025</p>
      <h3>1. Información que recopilamos</h3>
      <p>Recopilamos información que nos proporcionas directamente: nombre, correo electrónico, número de teléfono, ciudad y dirección de entrega.</p>
      <h3>2. Uso de la información</h3>
      <p>Usamos tu información para:</p>
      <ul style="margin:8px 0 8px 20px;line-height:2">
        <li>Procesar y entregar tus pedidos</li>
        <li>Comunicarnos contigo sobre tu pedido</li>
        <li>Enviarte información sobre productos (con tu consentimiento)</li>
        <li>Mejorar nuestros servicios</li>
      </ul>
      <h3>3. Protección de datos</h3>
      <p>Tu información está protegida mediante cifrado SSL y almacenada en servidores seguros. No vendemos ni compartimos tu información personal con terceros.</p>
      <h3>4. Contraseñas</h3>
      <p>Las contraseñas se almacenan de forma cifrada. Nunca tenemos acceso a tu contraseña en texto plano.</p>
      <h3>5. Cookies</h3>
      <p>Usamos cookies técnicas necesarias para el funcionamiento del sitio. No usamos cookies de seguimiento de publicidad.</p>
      <h3>6. Tus derechos</h3>
      <p>Tienes derecho a acceder, corregir o eliminar tu información personal. Para ejercer estos derechos, contáctanos por WhatsApp.</p>
      <h3>7. Contacto</h3>
      <p>Para consultas sobre privacidad, contáctanos a través de nuestro WhatsApp oficial.</p>`
  }
}

function abrirInfo(key) {
  const content = infoContent[key]
  if (!content) return
  document.getElementById('info-title').textContent    = content.titulo
  document.getElementById('info-body').innerHTML       = content.html
  document.getElementById('modal-info').classList.add('open')
  document.body.style.overflow = 'hidden'
}
function cerrarInfo() {
  document.getElementById('modal-info').classList.remove('open')
  document.body.style.overflow = ''
}

// ── Inicio ────────────────────────────────────────────
inicializarAuth()
actualizarCarritoUI()
cargarProductos()
