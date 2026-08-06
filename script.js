//Arreglo de productos
let productos = [];

// Arreglo vacío donde se irán guardando los productos elegidos
let carrito = [];

// Elementos del DOM
const grilla = document.getElementById('grilla-productos');
const elemContador = document.getElementById('contador-carrito');
const modalCarrito = document.getElementById('modal-carrito');
const listaCarrito = document.getElementById('lista-carrito');
const elemTotal = document.getElementById('total-precio');
const botonAbrirCarrito = document.querySelector('.carrito');
const botonCerrarModal = document.getElementById('btn-cerrar-modal');



// 1. CARGAR BASE DE DATOS DESDE EL SERVIDOR BACKEND 
async function cargarBaseDeDatos() {
    try {
        // Consultamos al servidor en el puerto 3000
        const respuesta = await fetch('http://localhost:3000/api/productos');

        if (!respuesta.ok) {
            throw new Error('No se pudo obtener la respuesta del servidor');
        }

        // Recibimos las filas de la tabla "productos" desde SQLite
        productos = await respuesta.json();

        // Dibujamos las tarjetas en la página
        mostrarProductosEnPantalla(productos);
    } catch (error) {
        console.error("Error al conectar con el backend:", error);
        if (grilla) {
            grilla.innerHTML = `
 <p style="text-align:center; width:100%; color:red;">
No se pudieron cargar los productos. Asegurate de que tu terminal con <b>node server.js</b> esté corriendo.
 </p>`;
        }
    }
}



// Objeto en memoria para saber qué índice de foto está mirando el cliente en cada tarjeta
const indiceImagenActual = {};

function cambiarImagenCard(idProducto, direccion) {
    const producto = productos.find(p => p.id === idProducto);
    if (!producto || !producto.imagenes || producto.imagenes.length <= 1) return;

    // Si aún no se tocó, empieza en el índice 0
    if (indiceImagenActual[idProducto] === undefined) {
        indiceImagenActual[idProducto] = 0;
    }

    const totalFotos = producto.imagenes.length;
    // Sumamos o restamos (con lógica circular para que al pasar la última vuelva a la primera)
    indiceImagenActual[idProducto] = (indiceImagenActual[idProducto] + direccion + totalFotos) % totalFotos;

    const imgElemento = document.getElementById(`img-card-${idProducto}`);
    if (imgElemento) {
        // Efecto suave al cambiar
        imgElemento.style.opacity = '0.3';
        setTimeout(() => {
            imgElemento.src = producto.imagenes[indiceImagenActual[idProducto]];
            imgElemento.style.opacity = '1';
        }, 150);
    }
}


// Mostrar las tarjetas de productos 
function mostrarProductosEnPantalla(listaProductos) {
    if (!grilla) return;
    grilla.innerHTML = '';

    listaProductos.forEach(prod => {
        const card = document.createElement('div');
        card.classList.add('card-producto');

        // Nos aseguramos de tener al menos una imagen en el array
        const fotos = (prod.imagenes && prod.imagenes.length > 0) ? prod.imagenes : [prod.imagen];
        const tieneMasDeUnaFoto = fotos.length > 1;

        // (... acá va tu lógica de selectores de Talles, Colores y sinStock que ya armamos ...)
        let opcionesTalles = '';
        let opcionesColores = '';
        let sinStock = false;

        if (Array.isArray(prod.variantes) && prod.variantes.length > 0) {
            const variantesConStock = prod.variantes.filter(v => Number(v.stock) > 0);
            if (variantesConStock.length > 0) {
                const tallesUnicos = [...new Set(variantesConStock.map(v => v.talle))];
                tallesUnicos.forEach(t => opcionesTalles += `<option value="${t}">${t}</option>`);

                const primerTalle = tallesUnicos[0];
                const coloresDelPrimerTalle = [...new Set(
                    variantesConStock.filter(v => v.talle === primerTalle).map(v => v.color)
                )];
                coloresDelPrimerTalle.forEach(c => opcionesColores += `<option value="${c}">${c}</option>`);
            } else {
                sinStock = true;
                opcionesTalles = `<option disabled selected>Sin stock</option>`;
                opcionesColores = `<option disabled selected>Sin stock</option>`;
            }
        } else {
            let listaTalles = Array.isArray(prod.talles) ? prod.talles : (prod.talles || 'U').split(',').map(t => t.trim());
            listaTalles.forEach(t => opcionesTalles += `<option value="${t}">${t}</option>`);
            opcionesColores = `<option value="Único">Único</option>`;
        }
        // =================================================================

        // Armamos el HTML con el carrusel de imágenes
        card.innerHTML = `
            <div class="carrusel-card ${tieneMasDeUnaFoto ? '' : 'sin-flechas'}">
                <img src="${fotos[0]}" alt="${prod.nombre}" id="img-card-${prod.id}">
                <button class="btn-flecha prev" onclick="cambiarImagenCard(${prod.id}, -1)" title="Anterior">◄</button>
                <button class="btn-flecha next" onclick="cambiarImagenCard(${prod.id}, 1)" title="Siguiente">►</button>
            </div>

            <h3>${prod.nombre}</h3>
            <p class="precio">$${Number(prod.precio).toLocaleString()}</p>
            
            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem; width: 100%;">
                <div style="flex: 1;">
                    <label style="font-size: 0.75rem; color: #666; display: block;">Talle:</label>
                    <select class="select-talle" id="talle-${prod.id}" 
                            onchange="actualizarColoresDisponibles(${prod.id})" 
                            style="width: 100%; padding: 0.4rem;" ${sinStock ? 'disabled' : ''}>
                        ${opcionesTalles}
                    </select>
                </div>
                <div style="flex: 1;">
                    <label style="font-size: 0.75rem; color: #666; display: block;">Color:</label>
                    <select class="select-color" id="color-${prod.id}" 
                            style="width: 100%; padding: 0.4rem;" ${sinStock ? 'disabled' : ''}>
                        ${opcionesColores}
                    </select>
                </div>
            </div>

            <button onclick="agregarAlCarrito(${prod.id})" ${sinStock ? 'disabled style="background:#ccc; cursor:not-allowed;"' : ''}>
                ${sinStock ? 'Agotado' : 'Agregar al carrito'}
            </button>
        `;

        grilla.appendChild(card);
    });
}

// Actualiza los colores en el <select> según el talle elegido
function actualizarColoresDisponibles(idProducto) {
    const producto = productos.find(p => p.id === idProducto);
    if (!producto || !Array.isArray(producto.variantes)) return;

    const selectTalle = document.getElementById(`talle-${idProducto}`);
    const selectColor = document.getElementById(`color-${idProducto}`);
    if (!selectTalle || !selectColor) return;

    const talleElegido = selectTalle.value;

    // Buscamos qué colores tienen stock > 0 PARA ESE TALLE en particular
    const coloresDisponibles = [...new Set(
        producto.variantes
            .filter(v => v.talle === talleElegido && Number(v.stock) > 0)
            .map(v => v.color)
    )];

    // Dibujamos de nuevo las opciones del select de Color
    selectColor.innerHTML = '';
    coloresDisponibles.forEach(color => {
        const option = document.createElement('option');
        option.value = color;
        option.textContent = color;
        selectColor.appendChild(option);
    });
}


// 3. AGREGAR AL CARRITO 
function agregarAlCarrito(idProducto) {
    const productoOriginal = productos.find(p => p.id === idProducto);

    if (productoOriginal) {
        const selectTalle = document.getElementById(`talle-${idProducto}`);
        const selectColor = document.getElementById(`color-${idProducto}`);

        const talleSeleccionado = selectTalle ? selectTalle.value : 'Único';
        const colorSeleccionado = selectColor ? selectColor.value : 'Único';

        // Creamos la copia de la prenda agregando talleElegido y colorElegido
        const productoParaCarrito = {
            ...productoOriginal,
            talleElegido: talleSeleccionado,
            colorElegido: colorSeleccionado
        };

        carrito.push(productoParaCarrito);
        actualizarCarrito();
    }
}

// 4. ELIMINAR DEL CARRITO
function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarCarrito();
}

// 5.VISTA DEL CARRITO 
function actualizarCarrito() {
    if (elemContador) elemContador.textContent = carrito.length;
    if (!listaCarrito || !elemTotal) return;

    listaCarrito.innerHTML = '';

    if (carrito.length === 0) {
        listaCarrito.innerHTML = '<p class="carrito-vacio">El carrito está vacío.</p>';
        elemTotal.textContent = '$0';
        return;
    }

    carrito.forEach((prod, index) => {
        const item = document.createElement('div');
        item.classList.add('item-carrito');

        // Muestra: "Remera Boxy (Talle: L | Color: Negro)"
        item.innerHTML = `
            <div class="item-info">
                <h4>${prod.nombre}</h4>
                <small style="color:#666; font-size:0.85rem;">
                    Talle: <b>${prod.talleElegido}</b> | Color: <b>${prod.colorElegido}</b>
                </small>
                <p style="margin: 0.2rem 0 0; font-weight: bold;">$${Number(prod.precio).toLocaleString()}</p>
            </div>
            <button class="btn-eliminar" onclick="eliminarDelCarrito(${index})">X</button>
        `;
        listaCarrito.appendChild(item);
    });

    const sumaTotal = carrito.reduce((acum, prod) => acum + Number(prod.precio), 0);
    elemTotal.textContent = `$${sumaTotal.toLocaleString()}`;
}

// Cargar direcciones del usuario en el <select> del carrito
async function cargarDireccionesEnCarrito() {
    const selectDir = document.getElementById('select-direccion-envio');
    if (!selectDir) return;

    const sesion = localStorage.getItem('usuario_tienda');
    if (!sesion) {
        selectDir.innerHTML = '<option value="">Iniciá sesión para ver tus direcciones</option>';
        return;
    }

    const usuario = JSON.parse(sesion);
    try {
        const res = await fetch(`http://localhost:3000/api/direcciones/${usuario.id}`);
        const direcciones = await res.json();
        selectDir.innerHTML = '';

        if (direcciones.length === 0) {
            selectDir.innerHTML = '<option value="">Sin direcciones. Cargá una en Mi Perfil</option>';
        } else {
            direcciones.forEach(d => {
                const opt = document.createElement('option');
                // Guardamos el string formateado como valor para enviarlo en el pedido
                opt.value = `${d.calle_numero}, ${d.localidad}, ${d.provincia} (CP: ${d.codigo_postal})`;
                opt.textContent = `${d.calle_numero} - ${d.localidad}`;
                selectDir.appendChild(opt);
            });
        }
    } catch (err) {
        selectDir.innerHTML = '<option value="">Error al cargar direcciones</option>';
    }
}


// 6. EVENTOS DEL MODAL
if (botonAbrirCarrito && modalCarrito) {
    botonAbrirCarrito.addEventListener('click', () => {
        modalCarrito.classList.add('activo');
        cargarDireccionesEnCarrito();
    });
}

if (botonCerrarModal && modalCarrito) {
    botonCerrarModal.addEventListener('click', () => {
        modalCarrito.classList.remove('activo');
    });
}

window.addEventListener('click', (e) => {
    if (modalCarrito && e.target === modalCarrito) {
        modalCarrito.classList.remove('activo');
    }
});

// =========================================================
// --- LÓGICA DE FINALIZAR COMPRA CON DOMICILIO Y STOCK ---
// =========================================================
const btnFinalizarCompra = document.getElementById('btn-finalizar-compra');

if (btnFinalizarCompra) {
    btnFinalizarCompra.addEventListener('click', async () => {
        if (carrito.length === 0) {
            alert("Tu carrito está vacío. ¡Agregá prendas antes de finalizar!");
            return;
        }

        const sesionGuardada = localStorage.getItem('usuario_tienda');
        if (!sesionGuardada) {
            if (modalCarrito) modalCarrito.classList.remove('activo');
            alert("¡Ya casi es tuyo! Para finalizar la compra necesitás iniciar sesión o crear una cuenta.");
            if (modalLogin) {
                modalLogin.classList.add('activo');
                document.getElementById('tab-login')?.click();
            }
            return;
        }

        // 1. Validamos que hayan ingresado su domicilio
        const selectDir = document.getElementById('select-direccion-envio');
        const domicilio = selectDir ? selectDir.value : '';

        if (!domicilio) {
            alert("Por favor elegí una dirección o cargá una nueva en 'Mi Perfil' para el envío.");
            return;
        }

        const usuario = JSON.parse(sesionGuardada);
        const totalCompra = carrito.reduce((acum, p) => acum + Number(p.precio), 0);

        // 2. Armamos el paquete del pedido
        const nuevoPedido = {
            usuario_id: usuario.id || null,
            nombre: usuario.nombre,
            email: usuario.email,
            domicilio: domicilio,
            total: totalCompra,
            items: carrito
        };

        try {
            // 3. Enviamos el pedido a PostgreSQL para descontar stock
            const respuesta = await fetch('http://localhost:3000/api/pedidos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoPedido)
            });

            const datos = await respuesta.json();

            if (respuesta.ok) {
                alert(`¡Gracias por tu compra, ${usuario.nombre}! 📦\nTu pedido #${datos.pedido_id} fue registrado y está en proceso de despacho.`);

                // Limpiamos todo
                carrito = [];
                actualizarCarrito();
                if (inputDomicilio) inputDomicilio.value = '';
                if (modalCarrito) modalCarrito.classList.remove('activo');

                // VOLVEMOS A CARGAR LA TIENDA PARA QUE REFRESQUE EL STOCK REAL EN PANTALLA
                await cargarBaseDeDatos();
            } else {
                alert(`No se pudo completar el pedido: ${datos.error}`);
            }
        } catch (error) {
            alert("Error conectando con el servidor para procesar la compra.");
        }
    });
}


// =========================================================
// --- CONTROL INTELIGENTE DEL HEADER SEGÚN EL ROL ---
// =========================================================


const formLogin = document.getElementById('form-login');

const btnLoginHeader = document.getElementById('btn-login-header');
const btnConfigAdmin = document.getElementById('btn-config-admin');
const btnPedidosAdmin = document.getElementById('btn-pedidos-admin');
const btnPerfil = document.getElementById('btn-perfil');
const btnLogoutHeader = document.getElementById('btn-logout-header');
const contenedorDropdown = document.getElementById('contenedor-dropdown-user');
const modalLogin = document.getElementById('modal-login');
const btnCarrito = document.getElementById('boton-carrito');

// 1. Función para actualizar el header según quién entró
function actualizarInterfazHeader() {
    const sesionGuardada = localStorage.getItem('usuario_tienda');

    if (sesionGuardada) {
        const usuario = JSON.parse(sesionGuardada);
        const primerNombre = usuario.nombre.split(' ')[0];

        // Cambiamos el texto del botón y activamos el desplegable
        btnLoginHeader.innerHTML = `Hola, ${primerNombre.toLowerCase()} ▾`;
        if (contenedorDropdown) contenedorDropdown.classList.add('sesion-activa');

        // A. Opciones comunes para cualquier logueado (Cliente o Admin)
        if (btnPerfil) btnPerfil.style.display = 'block';
        if (btnLogoutHeader) btnLogoutHeader.style.display = 'block';

        // B. Opciones exclusivas si el rol es 'admin'
        if (usuario.rol === 'admin') {
            if (btnConfigAdmin) btnConfigAdmin.style.display = 'block';
            if (btnPedidosAdmin) btnPedidosAdmin.style.display = 'block';
            btnCarrito.style.display = 'none';
        } else {
            if (btnConfigAdmin) btnConfigAdmin.style.display = 'none';
            if (btnPedidosAdmin) btnPedidosAdmin.style.display = 'none';
        }
    } else {
        // NO HAY SESIÓN: dejamos el botón normal y ocultamos todo el menú
        btnLoginHeader.innerHTML = `👤 Iniciar Sesión`;
        if (contenedorDropdown) contenedorDropdown.classList.remove('sesion-activa');

        if (btnConfigAdmin) btnConfigAdmin.style.display = 'none';
        if (btnPedidosAdmin) btnPedidosAdmin.style.display = 'none';
        if (btnPerfil) btnPerfil.style.display = 'none';
        if (btnLogoutHeader) btnLogoutHeader.style.display = 'none';
    }
}

// 2. Comportamiento al hacer clic en "👤 Iniciar Sesión" o el nombre
if (btnLoginHeader) {
    btnLoginHeader.addEventListener('click', () => {
        const sesionGuardada = localStorage.getItem('usuario_tienda');

        // Si NO inició sesión, abrimos el modal de login
        if (!sesionGuardada) {
            if (modalLogin) modalLogin.classList.add('activo');
        }
        // Si YA inició sesión, no hace falta hacer nada porque al pasar el mouse ya se abre el menú
    });
}

// 3. Comportamiento de "Cerrar Sesión" desde el menú desplegable
if (btnLogoutHeader) {
    btnLogoutHeader.addEventListener('click', (e) => {
        e.preventDefault();
        const sesionGuardada = localStorage.getItem('usuario_tienda');
        if (sesionGuardada) {
            const usuario = JSON.parse(sesionGuardada);
            if (confirm(`¿Querés cerrar la sesión de ${usuario.nombre}?`)) {
                localStorage.removeItem('usuario_tienda');
                actualizarInterfazHeader();
            }
        }
    });
}

// 3. Procesar el formulario del Modal de Login
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email-user').value.trim();
        const password = document.getElementById('password-user')?.value.trim();

        try {
            const respuesta = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const datos = await respuesta.json();

            if (respuesta.ok) {
                localStorage.setItem('usuario_tienda', JSON.stringify(datos.usuario));

                // Actualizamos el header en vivo sin recargar la página
                actualizarInterfazHeader();

                // Cerramos la ventana modal
                if (modalLogin) modalLogin.classList.remove('activo');
                alert(`¡Bienvenida/o, ${datos.usuario.nombre}!`);
            } else {
                alert(`Error: ${datos.error}`);
            }
        } catch (error) {
            alert("No se pudo conectar con el servidor backend en puerto 3000.");
        }
    });
}




// =========================================================
// --- CONTROL DE PESTAÑAS: LOGIN vs REGISTRO ---
// =========================================================
const tabLogin = document.getElementById('tab-login');
const tabRegistro = document.getElementById('tab-registro');

const formRegistro = document.getElementById('form-registro');
const btnCerrarModalLogin = document.getElementById('btn-cerrar-modal-login');

// 1. Cerrar modal al tocar la X
if (btnCerrarModalLogin) {
    btnCerrarModalLogin.addEventListener('click', () => {
        if (modalLogin) modalLogin.classList.remove('activo');
    });
}

// 2. Alternar visualmente entre "Ingresar" y "Crear Cuenta"
if (tabLogin && tabRegistro) {
    tabLogin.addEventListener('click', () => {
        formLogin.style.display = 'flex';
        formRegistro.style.display = 'none';
        tabLogin.style.color = '#1a1a1a';
        tabLogin.style.borderBottom = '2px solid #1a1a1a';
        tabRegistro.style.color = '#888';
        tabRegistro.style.borderBottom = 'none';
    });

    tabRegistro.addEventListener('click', () => {
        formLogin.style.display = 'none';
        formRegistro.style.display = 'flex';
        tabRegistro.style.color = '#1a1a1a';
        tabRegistro.style.borderBottom = '2px solid #1a1a1a';
        tabLogin.style.color = '#888';
        tabLogin.style.borderBottom = 'none';
    });
}

// 3. Procesar el formulario de Registro de un cliente nuevo
if (formRegistro) {
    formRegistro.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nombre = document.getElementById('reg-nombre').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-pass').value.trim();

        try {
            // Llamamos a tu ruta POST de registro en el backend
            const respuesta = await fetch('http://localhost:3000/api/usuarios/registro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, email, password })
            });

            const datos = await respuesta.json();

            if (respuesta.ok) {
                // Al crearse la cuenta en tu tabla, por defecto recibe rol: 'cliente'
                const nuevoUsuario = {
                    id: datos.idUsuario,
                    nombre: nombre,
                    email: email,
                    rol: 'cliente'
                };

                // Guardamos la sesión local e iniciamos su cuenta automáticamente
                localStorage.setItem('usuario_tienda', JSON.stringify(nuevoUsuario));
                actualizarInterfazHeader(); // Dibuja su nombre en el header

                formRegistro.reset();
                if (modalLogin) modalLogin.classList.remove('activo');
                alert(`¡Cuenta creada con éxito! Bienvenida/o, ${nombre}.`);
            } else {
                alert(`No se pudo registrar: ${datos.error}`);
            }
        } catch (error) {
            alert("Error al conectar con el servidor para registrar la cuenta.");
        }
    });
}
// =========================================================
// --- NAVEGACIÓN: INICIO, COLECCIÓN Y FILTROS ---
// =========================================================

const menuCategorias = document.getElementById('menu-categorias');
const navInicio = document.getElementById('nav-inicio');

// 1. CARGAR CATEGORÍAS DESDE POSTGRESQL AL MENÚ DESPLEGABLE
async function cargarCategoriasEnHeader() {
    if (!menuCategorias) return;

    try {
        const respuesta = await fetch('http://localhost:3000/api/categorias');
        const categorias = await respuesta.json();

        // Mantenemos la primera opción "Ver Todo" y agregamos las de la base de datos
        menuCategorias.innerHTML = `<a href="#" onclick="filtrarPorCategoria('Todos')">Ver Todo</a>`;

        categorias.forEach(cat => {
            const link = document.createElement('a');
            link.href = "#";
            link.textContent = cat.nombre;
            // Al hacer clic, ejecuta el filtro pasando el nombre de la categoría
            link.onclick = (e) => {
                e.preventDefault();
                filtrarPorCategoria(cat.nombre);
            };
            menuCategorias.appendChild(link);
        });
    } catch (error) {
        console.error("Error cargando categorías en el menú:", error);
    }
}

// 2. FUNCIÓN PARA FILTRAR PRODUCTOS POR CATEGORÍA
function filtrarPorCategoria(categoriaSeleccionada) {
    if (!grilla) return;

    if (categoriaSeleccionada === 'Todos') {
        // Si elige "Ver Todo", mostramos el array completo original
        mostrarProductosEnPantalla(productos);
    } else {
        // Filtramos el array global "productos" buscando coincidencia en .categoria
        const productosFiltrados = productos.filter(
            prod => prod.categoria && prod.categoria.toLowerCase() === categoriaSeleccionada.toLowerCase()
        );

        if (productosFiltrados.length > 0) {
            mostrarProductosEnPantalla(productosFiltrados);
        } else {
            grilla.innerHTML = `
                <p style="text-align: center; width: 100%; color: #666; font-size: 1.1rem; margin: 3rem 0;">
                    Por el momento no hay prendas cargadas en la categoría <b>${categoriaSeleccionada}</b>.
                </p>`;
        }
    }

    // Scroll suave hacia la sección de productos
    const seccionContenedor = document.querySelector('.contenedor');
    if (seccionContenedor) {
        seccionContenedor.scrollIntoView({ behavior: 'smooth' });
    }
}

// 3. COMPORTAMIENTO DEL BOTÓN "INICIO" O LOGO JUSTINA

const logoLink = document.getElementById('logo-link');

// Armamos una función reutilizable para ir al home
function irAlInicio(e) {
    const paginaActual = window.location.pathname;
    const estamosEnIndex = paginaActual.endsWith('index.html') || paginaActual === '/' || paginaActual.endsWith('/');

    if (estamosEnIndex) {
        // SI YA ESTAMOS EN EL HOME: Refresh suave sin recargar
        e.preventDefault();

        if (typeof mostrarProductosEnPantalla === 'function' && typeof productos !== 'undefined') {
            mostrarProductosEnPantalla(productos);
        }
        if (typeof cargarBaseDeDatos === 'function') {
            cargarBaseDeDatos();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // SI ESTAMOS EN CONTACTO O PERFIL:
    // Dejamos que el href="index.html" funcione normal y te lleve a casa
}

if (navInicio) navInicio.addEventListener('click', irAlInicio);
if (logoLink) logoLink.addEventListener('click', irAlInicio);




// ¡INICIO DE LA APP!
cargarBaseDeDatos();
// ¡Llamamos a cargar las categorías del menú apenas inicia la tienda!
cargarCategoriasEnHeader();

// ¡Apenas carga index.html, revisamos quién está conectado para dibujar el header correcto!
actualizarInterfazHeader();
