// ═══════════════════════════════════════════════════════
// MARY KAY HONDURAS — Tienda Oficial v2
// ═══════════════════════════════════════════════════════

const SUPABASE_URL = 'https://knoxphxvmjvkdioeopbi.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtub3hwaHh2bWp2a2Rpb2VvcGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzUxNjEsImV4cCI6MjA5MTQxMTE2MX0.4XSZGDibY6z0wdA0UysExc1Yt-yMmckfNs7nxU3fZUo'

const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Helpers ───────────────────────────────────────────
const fmt  = n => `L ${Number(n||0).toLocaleString('es-HN',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const esc  = s => String(s||'').replace(/'/g,"&#39;").replace(/"/g,'&quot;')

// ── Estado ────────────────────────────────────────────
let todosProductos  = []
let carrito         = []
let categoriaActiva = 'Todas'
let busqueda        = ''
let productoModal   = null
let qtyModal        = 1

// ════════════════════════════════════════════════════════
// PRODUCTOS
// ════════════════════════════════════════════════════════
async function cargarProductos() {
  document.getElementById('products-grid').innerHTML = `
    <div class="loading-state">
      <div class="loader-ring"></div>
      <p>Cargando productos...</p>
    </div>`

  const { data, error } = await db
    .from('v_productos')
    .select('id,codigo,nombre,categoria,precio_venta,stock_actual,alerta,imagen_url')
    .eq('estado','Activo')
    .order('categoria').order('nombre')

  if (error || !data) {
    document.getElementById('products-grid').innerHTML =
      '<div class="empty-state"><span class="es-icon">⚠️</span><p>Error al cargar. Recarga la página.</p></div>'
    return
  }

  todosProductos = data
  buildCatNav()
  buildFooterCats()
  renderProductos()

  // Tiempo real — si cambia el inventario, se actualiza la tienda
  db.channel('tienda-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, cargarProductos)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_items' }, cargarProductos)
    .subscribe()
}

// ── Navegación de categorías ──────────────────────────
function buildCatNav() {
  const cats = ['Todas', ...new Set(todosProductos.map(p => p.categoria))]
  const nav  = document.getElementById('cat-nav')
  nav.innerHTML = cats.map(c =>
    `<button class="cat-nav-btn ${c === categoriaActiva ? 'active' : ''}"
      onclick="filtrarCat('${esc(c)}')">${c}</button>`
  ).join('')
}

function buildFooterCats() {
  const cats = ['Todas', ...new Set(todosProductos.map(p => p.categoria))]
  const ul   = document.getElementById('footer-cats')
  ul.innerHTML = cats.map(c =>
    `<li><a href="#" onclick="filtrarCat('${esc(c)}');document.getElementById('productos-section').scrollIntoView({behavior:'smooth'});return false">${c}</a></li>`
  ).join('')
}

function filtrarCat(cat) {
  categoriaActiva = cat
  document.querySelectorAll('.cat-nav-btn').forEach(b =>
    b.classList.toggle('active', b.textContent.trim() === cat)
  )
  renderProductos()
  document.getElementById('productos-section').scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ── Búsqueda ──────────────────────────────────────────
document.getElementById('buscar-input')?.addEventListener('input', e => {
  busqueda = e.target.value.toLowerCase()
  if (busqueda) categoriaActiva = 'Todas'
  document.querySelectorAll('.cat-nav-btn').forEach(b =>
    b.classList.toggle('active', !busqueda && b.textContent.trim() === 'Todas')
  )
  renderProductos()
})

// ── Render ────────────────────────────────────────────
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
    const agotado  = p.alerta === 'AGOTADO'
    const bajo     = p.alerta === 'BAJO'
    const enCarrito = carrito.find(i => i.id === p.id)

    const img = p.imagen_url
      ? `<img src="${p.imagen_url}" alt="${esc(p.nombre)}" loading="lazy"
           onerror="this.parentElement.innerHTML='<div class=pc-placeholder>💄</div>'">`
      : `<div class="pc-placeholder">💄</div>`

    const badgeHtml = agotado
      ? `<span class="pc-overlay-badge agotado">Agotado</span>`
      : bajo
      ? `<span class="pc-overlay-badge bajo">Últimas unidades</span>`
      : ''

    const quickLabel = agotado
      ? 'Producto agotado'
      : enCarrito
      ? '✓ Ya está en tu carrito — ver más'
      : '🛍️ Ver producto y agregar'

    return `
      <div class="product-card ${agotado ? 'agotado' : ''}" onclick="abrirModalProducto('${p.id}')">
        <div class="pc-img-wrap">
          ${img}
          ${badgeHtml}
          <div class="pc-quick-add">${quickLabel}</div>
        </div>
        <div class="pc-body">
          <div class="pc-cat">${p.categoria}</div>
          <div class="pc-name">${p.nombre}</div>
          <div class="pc-price-row">
            <span class="pc-price">${fmt(p.precio_venta)}</span>
            <span class="pc-stock-badge ${p.alerta.toLowerCase()}">
              ${agotado ? 'Agotado' : bajo ? 'Últimas' : 'Disponible'}
            </span>
          </div>
        </div>
      </div>`
  }).join('')
}

// ════════════════════════════════════════════════════════
// MODAL DE PRODUCTO
// ════════════════════════════════════════════════════════
function abrirModalProducto(id) {
  const p = todosProductos.find(x => x.id === id)
  if (!p) return
  productoModal = p
  qtyModal = 1

  // Imagen
  const imgWrap = document.getElementById('pm-img-wrap')
  imgWrap.innerHTML = p.imagen_url
    ? `<img src="${p.imagen_url}" alt="${esc(p.nombre)}"
         onerror="this.parentElement.innerHTML='<div class=pm-img-placeholder>💄</div>'">`
    : `<div class="pm-img-placeholder">💄</div>`

  // Info
  document.getElementById('pm-cat').textContent    = p.categoria
  document.getElementById('pm-nombre').textContent = p.nombre
  document.getElementById('pm-precio').textContent = fmt(p.precio_venta)
  document.getElementById('pm-qty').textContent    = '1'

  const stockEl = document.getElementById('pm-stock')
  stockEl.textContent = p.alerta === 'AGOTADO' ? 'Sin stock disponible'
    : p.alerta === 'BAJO' ? `¡Solo quedan ${p.stock_actual} unidades!`
    : `Disponible · ${p.stock_actual} en stock`
  stockEl.style.color = p.alerta === 'AGOTADO' ? 'var(--red)' : p.alerta === 'BAJO' ? 'var(--amber)' : 'var(--green)'

  // Badge
  document.getElementById('pm-badge-row').innerHTML = `
    <span style="font-size:11px;background:var(--mk-light);color:var(--mk-dark);padding:4px 10px;border-radius:99px;font-weight:700">${p.categoria}</span>
    ${p.alerta !== 'OK' ? `<span style="font-size:11px;background:${p.alerta==='AGOTADO'?'var(--red-bg)':'#fffbeb'};color:${p.alerta==='AGOTADO'?'var(--red)':'var(--amber)'};padding:4px 10px;border-radius:99px;font-weight:700">${p.alerta==='AGOTADO'?'Agotado':'Pocas unidades'}</span>` : ''}`

  // Botón
  const addBtn = document.getElementById('pm-add-btn')
  addBtn.disabled   = p.alerta === 'AGOTADO'
  addBtn.textContent = p.alerta === 'AGOTADO' ? '🚫 Producto agotado' : '🛍️ Agregar al carrito'

  // Meta info
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
    const existe = carrito.find(x => x.id === id)
    if (existe) existe.cantidad++
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
function agregarAlCarrito(id) {
  const p = todosProductos.find(x => x.id === id)
  if (!p || p.alerta === 'AGOTADO') return
  const existe = carrito.find(x => x.id === id)
  if (existe) existe.cantidad++
  else carrito.push({ id, nombre: p.nombre, precio: p.precio_venta, imagen: p.imagen_url || '', cantidad: 1 })
  actualizarCarritoUI()
  renderProductos()
}

function cambiarCantidad(id, delta) {
  const item = carrito.find(x => x.id === id)
  if (!item) return
  item.cantidad = Math.max(0, item.cantidad + delta)
  if (item.cantidad === 0) carrito = carrito.filter(x => x.id !== id)
  actualizarCarritoUI()
  renderProductos()
}

function quitarItem(id) {
  carrito = carrito.filter(x => x.id !== id)
  actualizarCarritoUI()
  renderProductos()
}

function actualizarCarritoUI() {
  const total    = carrito.reduce((s, i) => s + i.cantidad * i.precio, 0)
  const totalUds = carrito.reduce((s, i) => s + i.cantidad, 0)

  // Badge
  const badge = document.getElementById('cart-badge')
  badge.textContent = totalUds
  badge.style.display = totalUds > 0 ? 'flex' : 'none'

  // Items
  const body = document.getElementById('cart-items')
  if (carrito.length === 0) {
    body.innerHTML = `
      <div class="cart-empty-state">
        <span class="ce-icon">🛍️</span>
        <p>Tu carrito está vacío.<br>Explora nuestros productos y agrega lo que te guste.</p>
      </div>`
    document.getElementById('cart-footer').style.display = 'none'
    return
  }

  body.innerHTML = carrito.map(i => `
    <div class="cart-item">
      <div class="ci-img">
        ${i.imagen ? `<img src="${i.imagen}" alt="${esc(i.nombre)}" onerror="this.parentElement.innerHTML='💄'">` : '💄'}
      </div>
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
// CHECKOUT
// ════════════════════════════════════════════════════════
function abrirCheckout() {
  if (carrito.length === 0) return
  cerrarCarrito()

  const total = carrito.reduce((s, i) => s + i.cantidad * i.precio, 0)
  document.getElementById('cs-items').innerHTML = carrito.map(i =>
    `<div class="csb-item"><span>${i.nombre} × ${i.cantidad}</span><strong>${fmt(i.cantidad * i.precio)}</strong></div>`
  ).join('')
  document.getElementById('cs-total').textContent = fmt(total)

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

  if (!nombre || !tel) {
    alert('Por favor ingresa tu nombre y número de WhatsApp.')
    return
  }

  const btn = document.getElementById('btn-place-order')
  btn.disabled = true
  btn.textContent = 'Procesando...'

  try {
    // 1. Buscar o crear cliente por teléfono
    let clienteId
    const { data: cli } = await db.from('clientes').select('id').eq('telefono', tel).maybeSingle()
    if (cli) {
      clienteId = cli.id
      await db.from('clientes').update({ nombre, ciudad: ciudad || null }).eq('id', clienteId)
    } else {
      const { data: nvo } = await db.from('clientes')
        .insert({ nombre, telefono: tel, ciudad: ciudad || null, etiqueta: 'Nueva' })
        .select('id').single()
      clienteId = nvo.id
    }

    // 2. Número de pedido
    const { data: num } = await db.rpc('generar_numero_pedido')

    // 3. Crear pedido
    const { data: ped } = await db.from('pedidos')
      .insert({
        numero: num, cliente_id: clienteId,
        canal: 'Tienda online', metodo_pago: pago,
        notas: notas || null, estado: 'Pendiente',
        fecha: new Date().toISOString().split('T')[0],
      })
      .select('id').single()

    // 4. Items
    await db.from('pedido_items').insert(
      carrito.map(i => ({ pedido_id: ped.id, producto_id: i.id, cantidad: i.cantidad, precio_unitario: i.precio }))
    )

    // 5. Éxito
    const total = carrito.reduce((s, i) => s + i.cantidad * i.precio, 0)
    const telNum = tel.replace(/\D/g, '')
    const waMsg  = encodeURIComponent(`Hola! 🌸 Acabo de hacer el pedido *${num}* por *${fmt(total)}*. ¿Me pueden confirmar? Gracias!`)

    document.getElementById('confirm-num').textContent  = num
    document.getElementById('confirm-name').textContent = nombre
    document.getElementById('confirm-total-text').textContent = fmt(total)
    document.getElementById('confirm-wa').href = `https://wa.me/504${telNum}?text=${waMsg}`

    carrito = []
    actualizarCarritoUI()
    renderProductos()
    cerrarCheckout()

    // Reset form
    ;['co-nombre','co-tel','co-ciudad','co-notas'].forEach(id => document.getElementById(id).value = '')

    document.getElementById('confirm-overlay').style.display = 'flex'

  } catch (err) {
    console.error(err)
    alert('Hubo un error al procesar tu pedido. Por favor intenta de nuevo.')
  }

  btn.disabled = false
  btn.textContent = '✅ Confirmar pedido'
})

// ── Inicio ────────────────────────────────────────────
actualizarCarritoUI()
cargarProductos()
