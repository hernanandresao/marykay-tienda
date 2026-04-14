// ═══════════════════════════════════════════════════════
// MARY KAY HONDURAS — Tienda online (tienda.js)
// Misma base de datos que el inventario — conectadas en vivo
// ═══════════════════════════════════════════════════════

const SUPABASE_URL = 'https://knoxphxvmjvkdioeopbi.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtub3hwaHh2bWp2a2Rpb2VvcGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzUxNjEsImV4cCI6MjA5MTQxMTE2MX0.4XSZGDibY6z0wdA0UysExc1Yt-yMmckfNs7nxU3fZUo'

const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Helpers ───────────────────────────────────────────
const fmt = (n) => `L ${Number(n||0).toLocaleString('es-HN',{minimumFractionDigits:2,maximumFractionDigits:2})}`

// ── Estado global ─────────────────────────────────────
let todosProductos = []
let carrito        = []
let categoriaActiva = 'Todas'
let busqueda        = ''

// ════════════════════════════════════════════════════════
// CARGAR PRODUCTOS (desde v_productos — stock en tiempo real)
// ════════════════════════════════════════════════════════
async function cargarProductos() {
  document.getElementById('products-grid').innerHTML = `
    <div class="loading-grid">
      <span class="spin">🌸</span>
      <p style="margin-top:12px">Cargando productos...</p>
    </div>`

  const { data, error } = await db
    .from('v_productos')
    .select('id,codigo,nombre,categoria,precio_venta,stock_actual,alerta,imagen_url')
    .eq('estado','Activo')
    .order('categoria')
    .order('nombre')

  if (error) {
    document.getElementById('products-grid').innerHTML =
      '<div class="loading-grid"><p>Error al cargar productos. Recarga la página.</p></div>'
    return
  }

  todosProductos = data || []
  construirFiltros()
  renderProductos()

  // Suscripción en tiempo real: si el inventario cambia, se actualiza la tienda
  db.channel('productos-cambios')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => {
      cargarProductos()
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_items' }, () => {
      cargarProductos()
    })
    .subscribe()
}

// ── Construir filtros de categoría dinámicamente ──────
function construirFiltros() {
  const cats = ['Todas', ...new Set(todosProductos.map(p => p.categoria))]
  const container = document.getElementById('cat-filters')
  container.innerHTML = cats.map(c => `
    <button class="cat-btn ${c === categoriaActiva ? 'active' : ''}" onclick="filtrarCategoria('${c}')">
      ${c}
    </button>`).join('')
}

function filtrarCategoria(cat) {
  categoriaActiva = cat
  document.querySelectorAll('.cat-btn').forEach(b => {
    b.classList.toggle('active', b.textContent.trim() === cat)
  })
  renderProductos()
}

// ── Búsqueda ──────────────────────────────────────────
document.getElementById('buscar-input')?.addEventListener('input', e => {
  busqueda = e.target.value.toLowerCase()
  renderProductos()
})

// ── Render grid de productos ──────────────────────────
function renderProductos() {
  const lista = todosProductos.filter(p => {
    const porCat   = categoriaActiva === 'Todas' || p.categoria === categoriaActiva
    const porBusq  = !busqueda ||
      p.nombre.toLowerCase().includes(busqueda) ||
      p.categoria.toLowerCase().includes(busqueda)
    return porCat && porBusq
  })

  const grid = document.getElementById('products-grid')

  if (lista.length === 0) {
    grid.innerHTML = `
      <div class="empty-products">
        <span class="ep-icon">🔍</span>
        <p>No se encontraron productos.<br>Intenta con otra búsqueda.</p>
      </div>`
    return
  }

  grid.innerHTML = lista.map(p => {
    const agotado  = p.alerta === 'AGOTADO'
    const bajo     = p.alerta === 'BAJO'
    const enCarrito = carrito.find(i => i.id === p.id)
    const img = p.imagen_url
      ? `<img src="${p.imagen_url}" alt="${p.nombre}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=img-placeholder>💄</div>'">`
      : `<div class="img-placeholder">💄</div>`

    return `
      <div class="product-card ${agotado ? 'agotado' : ''}" onclick="verProducto('${p.id}')">
        <div class="product-img">
          ${img}
          ${agotado ? '<span class="badge-agotado-overlay">Agotado</span>' : ''}
          ${bajo && !agotado ? '<span class="badge-bajo-overlay">Últimas unidades</span>' : ''}
        </div>
        <div class="product-info">
          <div class="product-cat">${p.categoria}</div>
          <div class="product-name">${p.nombre}</div>
          <div class="product-price-row">
            <span class="product-price">${fmt(p.precio_venta)}</span>
            <button class="btn-add ${enCarrito ? 'in-cart' : ''} ${agotado ? '' : ''}"
              ${agotado ? 'disabled' : ''}
              onclick="event.stopPropagation(); agregarAlCarrito('${p.id}','${escapar(p.nombre)}',${p.precio_venta},'${p.imagen_url||''}')">
              ${agotado ? 'Agotado' : enCarrito ? '✓ Agregado' : '+ Agregar'}
            </button>
          </div>
        </div>
      </div>`
  }).join('')
}

// ════════════════════════════════════════════════════════
// CARRITO
// ════════════════════════════════════════════════════════
function agregarAlCarrito(id, nombre, precio, imagen) {
  const existe = carrito.find(i => i.id === id)
  if (existe) {
    existe.cantidad++
  } else {
    carrito.push({ id, nombre, precio, imagen, cantidad: 1 })
  }
  actualizarCarrito()
  renderProductos()
  // Feedback visual: abrir carrito si es el primer item
  if (carrito.length === 1) abrirCarrito()
}

function cambiarCantidadCarrito(id, delta) {
  const item = carrito.find(i => i.id === id)
  if (!item) return
  item.cantidad = Math.max(1, item.cantidad + delta)
  if (item.cantidad === 0) carrito = carrito.filter(i => i.id !== id)
  actualizarCarrito()
}

function quitarDelCarrito(id) {
  carrito = carrito.filter(i => i.id !== id)
  actualizarCarrito()
  renderProductos()
}

function actualizarCarrito() {
  const total    = carrito.reduce((s,i) => s + i.cantidad * i.precio, 0)
  const totalUds = carrito.reduce((s,i) => s + i.cantidad, 0)

  // Contador en header
  document.getElementById('cart-count').textContent = totalUds
  document.getElementById('cart-count').style.display = totalUds > 0 ? 'flex' : 'none'

  // Render items del panel
  const itemsEl = document.getElementById('cart-items')
  if (carrito.length === 0) {
    itemsEl.innerHTML = `
      <div class="cart-empty">
        <span class="ce-icon">🛍️</span>
        <p>Tu carrito está vacío.<br>Agrega productos para comenzar.</p>
      </div>`
    document.getElementById('cart-total-section').style.display = 'none'
    return
  }

  itemsEl.innerHTML = carrito.map(i => `
    <div class="cart-item">
      <div class="ci-img">
        ${i.imagen
          ? `<img src="${i.imagen}" alt="${i.nombre}" onerror="this.parentElement.innerHTML='💄'">`
          : '💄'}
      </div>
      <div class="ci-info">
        <div class="ci-name">${i.nombre}</div>
        <div class="ci-price">${fmt(i.precio)} c/u</div>
        <div class="ci-controls">
          <button class="ci-qty-btn" onclick="cambiarCantidadCarrito('${i.id}',-1)">−</button>
          <span class="ci-qty">${i.cantidad}</span>
          <button class="ci-qty-btn" onclick="cambiarCantidadCarrito('${i.id}',1)">+</button>
        </div>
      </div>
      <span class="ci-subtotal">${fmt(i.cantidad * i.precio)}</span>
      <button class="ci-remove" onclick="quitarDelCarrito('${i.id}')">×</button>
    </div>`).join('')

  document.getElementById('cart-total-value').textContent = fmt(total)
  document.getElementById('cart-units').textContent = `${totalUds} unidad${totalUds!==1?'es':''}`
  document.getElementById('cart-total-section').style.display = 'block'
}

// Panel carrito
function abrirCarrito() {
  document.getElementById('cart-overlay').classList.add('open')
}
function cerrarCarrito() {
  document.getElementById('cart-overlay').classList.remove('open')
}
document.getElementById('cart-overlay')?.addEventListener('click', e => {
  if (e.target === document.getElementById('cart-overlay')) cerrarCarrito()
})

// ════════════════════════════════════════════════════════
// CHECKOUT
// ════════════════════════════════════════════════════════
function abrirCheckout() {
  if (carrito.length === 0) return
  cerrarCarrito()

  // Render resumen en el modal
  const total = carrito.reduce((s,i) => s + i.cantidad * i.precio, 0)
  document.getElementById('cs-items').innerHTML = carrito.map(i =>
    `<div class="cs-item">
      <span>${i.nombre} × ${i.cantidad}</span>
      <strong>${fmt(i.cantidad * i.precio)}</strong>
    </div>`).join('')
  document.getElementById('cs-total-value').textContent = fmt(total)
  document.getElementById('checkout-overlay').classList.add('open')
}

function cerrarCheckout() {
  document.getElementById('checkout-overlay').classList.remove('open')
}

document.getElementById('btn-place-order')?.addEventListener('click', async () => {
  const nombre = document.getElementById('co-nombre').value.trim()
  const tel    = document.getElementById('co-tel').value.trim()
  const ciudad = document.getElementById('co-ciudad').value.trim()
  const pago   = document.getElementById('co-pago').value
  const notas  = document.getElementById('co-notas').value.trim()

  if (!nombre || !tel) {
    alert('Por favor ingresa tu nombre y teléfono.')
    return
  }

  const btn = document.getElementById('btn-place-order')
  btn.disabled = true
  btn.textContent = 'Procesando pedido...'

  try {
    // 1. Buscar o crear cliente por teléfono
    let clienteId
    const { data: existente } = await db
      .from('clientes')
      .select('id')
      .eq('telefono', tel)
      .maybeSingle()

    if (existente) {
      clienteId = existente.id
      // Actualizar nombre si cambió
      await db.from('clientes').update({ nombre, ciudad: ciudad||null }).eq('id', clienteId)
    } else {
      const { data: nuevo, error: errCli } = await db
        .from('clientes')
        .insert({ nombre, telefono: tel, ciudad: ciudad||null, etiqueta: 'Nueva' })
        .select('id')
        .single()
      if (errCli) throw errCli
      clienteId = nuevo.id
    }

    // 2. Generar número de pedido
    const { data: numPedido } = await db.rpc('generar_numero_pedido')

    // 3. Crear el pedido
    const { data: pedido, error: errPed } = await db
      .from('pedidos')
      .insert({
        numero:      numPedido,
        cliente_id:  clienteId,
        canal:       'Tienda online',
        metodo_pago: pago,
        notas:       notas || null,
        estado:      'Pendiente',
        fecha:       new Date().toISOString().split('T')[0],
      })
      .select('id')
      .single()
    if (errPed) throw errPed

    // 4. Insertar items
    const { error: errItems } = await db.from('pedido_items').insert(
      carrito.map(i => ({
        pedido_id:       pedido.id,
        producto_id:     i.id,
        cantidad:        i.cantidad,
        precio_unitario: i.precio,
      }))
    )
    if (errItems) throw errItems

    // 5. Éxito
    const total = carrito.reduce((s,i) => s + i.cantidad * i.precio, 0)
    mostrarConfirmacion(numPedido, nombre, tel, fmt(total))
    carrito = []
    actualizarCarrito()
    renderProductos()
    cerrarCheckout()
    document.getElementById('co-nombre').value = ''
    document.getElementById('co-tel').value = ''
    document.getElementById('co-ciudad').value = ''
    document.getElementById('co-notas').value = ''

  } catch(err) {
    console.error(err)
    alert('Hubo un error al procesar tu pedido. Intenta de nuevo.')
  }

  btn.disabled = false
  btn.textContent = 'Confirmar pedido'
})

function mostrarConfirmacion(numero, nombre, tel, total) {
  const telLimpio = tel.replace(/\D/g,'')
  const msg = encodeURIComponent(`Hola! Acabo de hacer el pedido *${numero}* por ${total}. ¿Me pueden confirmar? 🌸`)
  document.getElementById('confirm-numero').textContent = numero
  document.getElementById('confirm-nombre').textContent = nombre
  document.getElementById('confirm-total').textContent  = total
  document.getElementById('confirm-wa').href = `https://wa.me/504${telLimpio}?text=${msg}`
  document.getElementById('confirm-overlay').classList.add('open')
}

document.getElementById('btn-new-order')?.addEventListener('click', () => {
  document.getElementById('confirm-overlay').classList.remove('open')
})

// ════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════
function escapar(s) {
  return String(s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;')
}

function verProducto(id) {
  // Por ahora simplemente agrega al carrito
  // En el futuro puede abrir un modal de detalle
  const p = todosProductos.find(x => x.id === id)
  if (p && p.alerta !== 'AGOTADO') {
    agregarAlCarrito(p.id, p.nombre, p.precio_venta, p.imagen_url||'')
  }
}

// ── Inicio ────────────────────────────────────────────
actualizarCarrito()
cargarProductos()
