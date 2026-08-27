// ====================================================================
// ELEMENTOS DEL DOM Y VARIABLES
// ====================================================================
const grilla = document.getElementById('grilla-productos');
const elemContador = document.getElementById('contador-carrito');
const modalCarrito = document.getElementById('modal-carrito');
const listaCarrito = document.getElementById('lista-carrito');
const elemTotal = document.getElementById('total-precio');
const botonAbrirCarrito = document.querySelector('.carrito');
const botonCerrarModal = document.getElementById('btn-cerrar-modal');
const btnFinalizarCompra = document.getElementById('btn-finalizar-compra');

//CONTROL DEL HEADER SEGÚN ROL
const formLogin = document.getElementById('form-login');
const btnLoginHeader = document.getElementById('btn-login-header');
const btnConfigAdmin = document.getElementById('btn-config-admin');
const btnPedidosAdmin = document.getElementById('btn-pedidos-admin');
const btnPerfil = document.getElementById('btn-perfil');
const btnLogoutHeader = document.getElementById('btn-logout-header');
const contenedorDropdown = document.getElementById('contenedor-dropdown-user');
const modalLogin = document.getElementById('modal-login');
const btnCarrito = document.getElementById('boton-carrito');

//CONTROL DE LOGIN Y REGISTRO
const tabLogin = document.getElementById('tab-login');
const tabRegistro = document.getElementById('tab-registro');
const formRegistro = document.getElementById('form-registro');
const btnCerrarModalLogin = document.getElementById('btn-cerrar-modal-login');

//NAVEGACION DE HEADER
const menuCategorias = document.getElementById('menu-categorias');
const navInicio = document.getElementById('nav-inicio');
const logoLink = document.getElementById('logo-link');

//NAVEGACION MOBILE
const btnMenuMobile = document.getElementById('btn-menu-mobile');
const navPrincipal = document.getElementById('nav-principal');

//VARIABLES

//Arreglo de productos
let productos = [];
// Arreglo vacío donde se irán guardando los productos elegidos
let carrito = JSON.parse(localStorage.getItem('carrito_justina')) || [];
// Objeto en memoria para saber qué índice de foto está mirando el cliente en cada tarjeta
const indiceImagenActual = {};
// Arreglo que carga los IDs de productos favoritos desde el navegador
let favoritos = [];




// ====================================================================
// CARGAR BASE DE DATOS 
// ====================================================================
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


// ====================================================================
// FUNCIÓN PARA CAMBIAR LAS IMAGENES DEL CARRETE
// ====================================================================
function cambiarImagenCard(idProducto, direccion) {
    const producto = productos.find(p => p.id === idProducto);
    if (!producto || !producto.imagenes || producto.imagenes.length <= 1) return;

    // Si aún no se tocó, empieza en el índice 0
    if (indiceImagenActual[idProducto] === undefined) {
        indiceImagenActual[idProducto] = 0;
    }

    const totalFotos = producto.imagenes.length;
    indiceImagenActual[idProducto] = (indiceImagenActual[idProducto] + direccion + totalFotos) % totalFotos;

    const imgElemento = document.getElementById(`img-card-${idProducto}`);
    if (imgElemento) {
        imgElemento.style.opacity = '0.3';
        setTimeout(() => {
            imgElemento.src = producto.imagenes[indiceImagenActual[idProducto]];
            imgElemento.style.opacity = '1';
        }, 150);
    }
}

// ====================================================================
// FUNCIÓN PARA MOSTRAR LOS PRODUCTOS 
// ====================================================================

function mostrarProductosEnPantalla(listaProductos) {
    if (!grilla) return;
    grilla.innerHTML = '';

    listaProductos.forEach(prod => {
        let opcionesTalles = '';
        let opcionesColores = '';
        let sinStock = false;

        // 1. Calculamos el stock real restando el carrito
        if (Array.isArray(prod.variantes) && prod.variantes.length > 0) {
            const variantesConStock = prod.variantes.filter(v => {
                const cantEnCarrito = carrito.filter(item =>
                    item.id === prod.id && item.talleElegido === v.talle && item.colorElegido === v.color
                ).length;
                return (Number(v.stock) - cantEnCarrito) > 0;
            });

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
                opcionesTalles = `<option disabled selected>Agotado</option>`;
                opcionesColores = `<option disabled selected>Agotado</option>`;
            }
        } else {
            const cantEnCarrito = carrito.filter(item => item.id === prod.id).length;
            const stockTotal = Number(prod.stock || 0);

            if ((stockTotal - cantEnCarrito) > 0) {
                let listaTalles = Array.isArray(prod.talles) ? prod.talles : (prod.talles || 'U').split(',').map(t => t.trim());
                listaTalles.forEach(t => opcionesTalles += `<option value="${t}">${t}</option>`);
                opcionesColores = `<option value="Único">Único</option>`;
            } else {
                sinStock = true;
                opcionesTalles = `<option disabled selected>Agotado</option>`;
                opcionesColores = `<option disabled selected>Agotado</option>`;
            }
        }

        // =======================================================
        // 2. FILTRO DE INICIO: DESCARTAR SIN STOCK Y OFERTAS
        // =======================================================
        // Si el producto está en oferta o si nos quedamos sin stock, 
        // usamos 'return' para saltar a la siguiente prenda sin dibujarla.
        if (prod.en_oferta || sinStock) {
            return;
        }

        // 3. Preparamos los datos visuales
        const card = document.createElement('div');
        card.classList.add('card-producto');

        const fotos = (prod.imagenes && prod.imagenes.length > 0) ? prod.imagenes : [prod.imagen];
        const tieneMasDeUnaFoto = fotos.length > 1;
        const esFavorito = favoritos.includes(prod.id);

        const precioNumerico = Number(prod.precio);
        const valorCuota = (precioNumerico / 3).toLocaleString();

        // 4. Armado de la tarjeta (Ya limpia, sin código de ofertas ni carteles de agotado porque los filtramos arriba)
        card.innerHTML = `
            <div class="carrusel-card ${tieneMasDeUnaFoto ? '' : 'sin-flechas'}">
                <button type="button" 
                        class="btn-favorito ${esFavorito ? 'liked' : ''}" 
                        onclick="toggleFavorito(${prod.id}, this)" 
                        title="${esFavorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
                    <svg viewBox="0 0 24 24" class="icono-corazon">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </button>

            <!-- ADENTRO DEL ARMADO DE TU TARJETA EN SCRIPT.JS -->
                <a href="producto.html?id=${prod.id}">
                    <img src="${fotos[0]}" alt="${prod.nombre}" id="img-card-${prod.id}">
                </a>
                
                <button class="btn-flecha prev" onclick="cambiarImagenCard(${prod.id}, -1)" title="Anterior">◄</button>
                <button class="btn-flecha next" onclick="cambiarImagenCard(${prod.id}, 1)" title="Siguiente">►</button>
            </div>

            <h3 style="margin-top: 0.5rem;">${prod.nombre}</h3>
            <p class="precio" style="margin-bottom: 0.2rem;">$${precioNumerico.toLocaleString()}</p>
            <small class="texto-cuotas">3 cuotas de $${valorCuota}</small>
            
            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem; width: 100%;">
                <div style="flex: 1;">
                    <label style="font-size: 0.75rem; color: #666; display: block;">Talle:</label>
                    <select class="select-talle" id="talle-${prod.id}" 
                            onchange="actualizarColoresDisponibles(${prod.id})" 
                            style="width: 100%; padding: 0.4rem;">
                        ${opcionesTalles}
                    </select>
                </div>
                <div style="flex: 1;">
                    <label style="font-size: 0.75rem; color: #666; display: block;">Color:</label>
                    <select class="select-color" id="color-${prod.id}" 
                            style="width: 100%; padding: 0.4rem;">
                        ${opcionesColores}
                    </select>
                </div>
            </div>

            <button onclick="agregarAlCarrito(${prod.id})">
                Agregar al carrito
            </button>
        `;

        grilla.appendChild(card);
    });
}

// ====================================================================
// CARGAR FAVORITOS DEL USUARIO DESDE POSTGRESQL
// ====================================================================
async function cargarFavoritosDesdeBD() {
    const sesion = localStorage.getItem('usuario_tienda');
    if (!sesion) {
        favoritos = [];
        return;
    }

    const usuario = JSON.parse(sesion);
    try {
        const res = await fetch(`http://localhost:3000/api/favoritos/${usuario.id}`);
        if (res.ok) {
            favoritos = await res.json();
            // Si las tarjetas ya estaban dibujadas en pantalla, actualizamos qué corazones están rojos
            actualizarCorazonesEnPantalla();
        }
    } catch (err) {
        console.error("No se pudieron cargar los favoritos desde la base de datos:", err);
    }
}

// Función auxiliar que repinta los corazones sin tener que recargar toda la página
function actualizarCorazonesEnPantalla() {
    productos.forEach(prod => {
        const btnFav = document.querySelector(`.card-producto #img-card-${prod.id}`)
            ?.closest('.carrusel-card')
            ?.querySelector('.btn-favorito');

        if (btnFav) {
            const esFav = favoritos.includes(prod.id);
            if (esFav) {
                btnFav.classList.add('liked');
                btnFav.title = "Quitar de favoritos";
            } else {
                btnFav.classList.remove('liked');
                btnFav.title = "Agregar a favoritos";
            }
        }
    });
}

// ====================================================================
// FUNCION PARA ACTUALIZAR LOS COLORES SEGUN EL TALLE ELEGIDO
// ====================================================================

function actualizarColoresDisponibles(idProducto) {
    const producto = productos.find(p => p.id === idProducto);
    if (!producto || !Array.isArray(producto.variantes)) return;

    const selectTalle = document.getElementById(`talle-${idProducto}`);
    const selectColor = document.getElementById(`color-${idProducto}`);
    if (!selectTalle || !selectColor) return;

    const talleElegido = selectTalle.value;

    // Buscamos colores disponibles descontando lo que ya hay en el carrito
    const coloresDisponibles = [...new Set(
        producto.variantes
            .filter(v => {
                if (v.talle !== talleElegido) return false;
                const cantEnCarrito = carrito.filter(item => item.id === idProducto && item.talleElegido === v.talle && item.colorElegido === v.color).length;
                return (Number(v.stock) - cantEnCarrito) > 0;
            })
            .map(v => v.color)
    )];

    selectColor.innerHTML = '';
    if (coloresDisponibles.length > 0) {
        coloresDisponibles.forEach(color => {
            const option = document.createElement('option');
            option.value = color;
            option.textContent = color;
            selectColor.appendChild(option);
        });
    } else {
        selectColor.innerHTML = '<option disabled selected>Agotado</option>';
    }
}

// ====================================================================
// FUNCIÓN PARA AGREGAR / QUITAR DE FAVORITOS 
// ====================================================================
async function toggleFavorito(idProducto, btnElemento) {
    const sesion = localStorage.getItem('usuario_tienda');

    // 1. SI NO INICIÓ SESIÓN: Le avisamos de forma profesional que ingrese
    if (!sesion) {
        alert("Iniciá sesión o creá una cuenta gratis para guardar productos en tu lista de favoritos ❤️");
        if (modalLogin) {
            modalLogin.classList.add('activo');
            document.getElementById('tab-login')?.click();
        }
        return;
    }

    const usuario = JSON.parse(sesion);
    const yaEraFavorito = favoritos.includes(idProducto);

    try {
        if (!yaEraFavorito) {
            // A. AGREGAR A LA BASE DE DATOS
            const res = await fetch('http://localhost:3000/api/favoritos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario_id: usuario.id, producto_id: idProducto })
            });

            if (res.ok) {
                favoritos.push(idProducto);
                btnElemento.classList.add('liked');
                btnElemento.title = "Quitar de favoritos";
            }
        } else {
            // B. BORRAR DE LA BASE DE DATOS
            const res = await fetch(`http://localhost:3000/api/favoritos/${usuario.id}/${idProducto}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                favoritos = favoritos.filter(id => id !== idProducto);
                btnElemento.classList.remove('liked');
                btnElemento.title = "Agregar a favoritos";
            }
        }
    } catch (err) {
        alert("Hubo un error al guardar tu favorito. Verificá tu conexión.");
    }
}

// ====================================================================
// FUNCION PARA AGREGAR AL CARRITO  
// ====================================================================

function agregarAlCarrito(idProducto) {
    const productoOriginal = productos.find(p => p.id === idProducto);

    if (productoOriginal) {
        const selectTalle = document.getElementById(`talle-${idProducto}`);
        const selectColor = document.getElementById(`color-${idProducto}`);

        const talleSeleccionado = selectTalle ? selectTalle.value : 'Único';
        const colorSeleccionado = selectColor ? selectColor.value : 'Único';

        // 1. Calculamos el stock real disponible en la base de datos para esta combinación exacta
        let stockDisponible = 1; // Valor por defecto en caso de no usar variantes
        if (Array.isArray(productoOriginal.variantes) && productoOriginal.variantes.length > 0) {
            const varianteElegida = productoOriginal.variantes.find(v =>
                v.talle === talleSeleccionado && v.color === colorSeleccionado
            );
            if (varianteElegida) {
                stockDisponible = Number(varianteElegida.stock);
            }
        } else if (productoOriginal.stock !== undefined) {
            stockDisponible = Number(productoOriginal.stock);
        }

        // 2. Contamos cuántas unidades idénticas (mismo id, talle y color) ya están en el carrito
        const cantidadEnCarrito = carrito.filter(prod =>
            prod.id === idProducto &&
            prod.talleElegido === talleSeleccionado &&
            prod.colorElegido === colorSeleccionado
        ).length;

        // 3. Bloqueamos la acción si el cliente intenta superar el stock físico
        if (cantidadEnCarrito >= stockDisponible) {
            alert(`¡Ups! Solo tenemos ${stockDisponible} unidad(es) disponible(s) en talle ${talleSeleccionado} y color ${colorSeleccionado}.`);
            return; // Cortamos la ejecución acá para que no se guarde
        }

        // 4. Si hay stock suficiente, empaquetamos y agregamos al carrito
        // Calculamos el precio real que va a pagar
        const precioReal = productoOriginal.en_oferta
            ? (Number(productoOriginal.precio) - (Number(productoOriginal.precio) * (Number(productoOriginal.descuento || 20) / 100)))
            : Number(productoOriginal.precio);

        const productoParaCarrito = {
            ...productoOriginal,
            talleElegido: talleSeleccionado,
            colorElegido: colorSeleccionado,
            precio: precioReal // ¡Guardamos el precio ya rebajado!
        };

        carrito.push(productoParaCarrito);
        actualizarCarrito();
        mostrarProductosEnPantalla(productos);
    }
}

// ====================================================================
// FUNCION PARA ELIMINAR DEL CARRITO  
// ====================================================================

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarCarrito();
}

// ====================================================================
// FUNCION PARA ACTUALIZAR EL CARRITO (VISUALMENTE) 
// ====================================================================

function actualizarCarrito() {
    // MAGIA ACÁ: Cada vez que el carrito cambia, lo guardamos fijo en el navegador
    localStorage.setItem('carrito_justina', JSON.stringify(carrito));

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

// ====================================================================
// FUNCION PARA ELEGIR UNA DIRECCION EN EL CARRITO  
// ====================================================================
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
                opt.value = `${d.calle_numero}, ${d.localidad}, ${d.provincia} (CP: ${d.codigo_postal})`;
                opt.textContent = `${d.calle_numero} - ${d.localidad}`;
                selectDir.appendChild(opt);
            });
        }
    } catch (err) {
        selectDir.innerHTML = '<option value="">Error al cargar direcciones</option>';
    }
}

// ====================================================================
// EVENTO DEL MODAL CARRITO, ABRIR Y CERRAR
// ====================================================================
if (botonAbrirCarrito && modalCarrito) {
    botonAbrirCarrito.addEventListener('click', () => {
        modalCarrito.classList.add('activo');
        cargarDireccionesEnCarrito();
    });
}

if (botonCerrarModal && modalCarrito) {
    botonCerrarModal.addEventListener('click', () => {
        const modalCarrito = document.getElementById('modal-carrito');
        if (modalCarrito) modalCarrito.classList.remove('activo');

        // 🧹 BORRAMOS EL CARTEL AMARILLO PARA QUE NO VUELVA A APARECER
        const avisoStock = document.getElementById('aviso-stock-recuperado');
        if (avisoStock) avisoStock.remove();
    });
}

// Y hacé lo mismo si hacés clic en el fondo oscuro (overlay) para cerrar:
const modalOverlay = document.getElementById('modal-carrito');
if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.classList.remove('activo');
            
            // 🧹 BORRAMOS EL CARTEL AMARILLO ACÁ TAMBIÉN
            const avisoStock = document.getElementById('aviso-stock-recuperado');
            if (avisoStock) avisoStock.remove();
        }
    });
}

window.addEventListener('click', (e) => {
    if (modalCarrito && e.target === modalCarrito) {
        modalCarrito.classList.remove('activo');
    }
});

// =========================================================
// FUNCION PARA BOTON FINALIZAR COMPRA DEL CARRITO
// =========================================================

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

        const usuario = JSON.parse(sesionGuardada);

        // VALIDACIÓN OBLIGATORIA DE DNI Y TELÉFONO
        if (!usuario.dni || !usuario.telefono || usuario.dni.trim() === '' || usuario.telefono.trim() === '') {
            if (modalCarrito) modalCarrito.classList.remove('activo');
            alert("⚠️ Por favor, completá tu DNI y Teléfono en tu perfil antes de finalizar la compra.");
            window.location.href = 'perfil.html'; // Te manda directo a completarlo
            return;
        }

        // Validamos que hayan ingresado su domicilio
        const selectDir = document.getElementById('select-direccion-envio');
        const domicilio = selectDir ? selectDir.value : '';

        if (!domicilio) {
            alert("Por favor elegí una dirección o cargá una nueva en 'Mi Perfil' para el envío.");
            return;
        }

        const totalCompra = carrito.reduce((acum, p) => acum + Number(p.precio), 0);

        // Armamos el paquete del pedido enviando también DNI y teléfono
        const nuevoPedido = {
            usuario_id: usuario.id || null,
            nombre: usuario.nombre,
            email: usuario.email,
            dni: usuario.dni,
            telefono: usuario.telefono,
            domicilio: domicilio,
            total: totalCompra,
            items: carrito
        };

        try {
            // Enviamos el pedido a PostgreSQL
            const respuesta = await fetch('http://localhost:3000/api/pedidos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoPedido)
            });

            const datos = await respuesta.json();

            if (respuesta.ok) {
                // 1. Mostramos el éxito PRIMERO
                alert(`¡Gracias por tu compra, ${usuario.nombre}! 📦\nTu pedido #${datos.pedido_id} fue registrado con éxito.`);

                // 2. Limpiamos el carrito local
                carrito = [];
                localStorage.removeItem('carrito_justina');

                // 3. Recargamos la página completa. 
                window.location.reload();

            } else {
                alert(`No se pudo completar el pedido: ${datos.error}`);
            }
        } catch (error) {
            alert("El pedido se procesó, pero ocurrió un error en la pantalla: " + error.message);
            console.error("Detalle técnico del error:", error);
        }
    });
}

// =========================================================
// FUNCIÓN PARA VERIFICAR CARRITO PENDIENTE AL LOGUEARSE
// =========================================================
async function verificarCarritoPendiente(usuarioId) {
    const clavePendiente = `carrito_pendiente_${usuarioId}`;
    const carritoGuardado = localStorage.getItem(clavePendiente);

    if (!carritoGuardado) return;

    const itemsAntiguos = JSON.parse(carritoGuardado);
    if (itemsAntiguos.length === 0) return;

    let itemsValidos = [];
    let cantidadSinStock = 0;

    // 1. Chequeamos el stock real en la base de datos
    for (const item of itemsAntiguos) {
        try {
            // Modificá el fetch dentro del for de verificarCarritoPendiente para que quede así:
            const res = await fetch(`http://localhost:3000/api/variantes/stock?producto_id=${item.id}&talle=${item.talleElegido}&color=${item.colorElegido}`);
            const data = await res.json();

            // Verificamos si hay stock disponible real en la base de datos
            if (data.stock !== undefined && data.stock > 0) {
                itemsValidos.push(item);
            } else {
                cantidadSinStock++; // Si el stock es 0 o menor, lo contamos para borrarlo y avisar
            }
        } catch (err) {
        itemsValidos.push(item);
    }
}

// 2. Guardamos los ítems válidos en el carrito principal
if (itemsValidos.length > 0) {
    carrito = itemsValidos;
    localStorage.setItem('carrito_justina', JSON.stringify(carrito));
    actualizarCarrito();

    localStorage.removeItem(clavePendiente);

    // 3. Dejamos una orden guardada en sessionStorage para abrir el modal y mostrar el aviso post-recarga
    sessionStorage.setItem('abrir_carrito_recuperado', 'true');
    if (cantidadSinStock > 0) {
        sessionStorage.setItem('aviso_stock_faltante', cantidadSinStock);
    }

    // Recargamos la página para que la interfaz limpie el login y muestre todo fresco
    window.location.reload();

} else {
    localStorage.removeItem(clavePendiente);
    alert("⚠️ Tenías productos guardados en tu carrito anterior, pero lamentablemente ya no hay stock disponible.");
}
}

// =========================================================
// CONTROL DEL HEADER SEGUN ROL
// =========================================================
function actualizarInterfazHeader() {
    const sesionGuardada = localStorage.getItem('usuario_tienda');

    // 1. Definimos el ícono SVG minimalista (trazo fino, sin relleno)
    const iconoUserSVG = `
        <svg viewBox="0 0 24 24" class="icono-svg-user" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
        </svg>
    `;

    if (sesionGuardada) {
        const usuario = JSON.parse(sesionGuardada);
        const primerNombre = usuario.nombre.split(' ')[0];

        btnLoginHeader.innerHTML = `<span class="icono-user">${iconoUserSVG}</span> <span class="texto-user">Hola, ${primerNombre} ▾</span>`;

        if (contenedorDropdown) contenedorDropdown.classList.add('sesion-activa');
        if (btnLogoutHeader) btnLogoutHeader.style.display = 'block'; // El logout lo ven todos

        // 2. Separamos la lógica según el ROL
        if (usuario.rol === 'admin') {
            if (btnConfigAdmin) btnConfigAdmin.style.display = 'block';
            if (btnPedidosAdmin) btnPedidosAdmin.style.display = 'block';
            if (btnPerfil) btnPerfil.style.display = 'none';
            btnCarrito.style.display = 'none';
        } else {
            if (btnConfigAdmin) btnConfigAdmin.style.display = 'none';
            if (btnPedidosAdmin) btnPedidosAdmin.style.display = 'none';
            if (btnPerfil) btnPerfil.style.display = 'block'; // Solo los clientes ven su perfil
            btnCarrito.style.display = 'block'; // Aseguramos que el cliente vea su carrito
        }
    } else {
        btnLoginHeader.innerHTML = `<span class="icono-user">${iconoUserSVG}</span> <span class="texto-user">Iniciar Sesión</span>`;

        btnCarrito.style.display = "block";
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

        // 1. Si hay una sesión activa y productos en el carrito, los guardamos a su nombre
        const sesionActual = localStorage.getItem('usuario_tienda');
        if (sesionActual && typeof carrito !== 'undefined' && carrito.length > 0) {
            const usuario = JSON.parse(sesionActual);
            localStorage.setItem(`carrito_pendiente_${usuario.id}`, JSON.stringify(carrito));
        }

        // 2. Limpiamos la sesión general y el carrito visual actual
        localStorage.removeItem('usuario_tienda');
        localStorage.removeItem('carrito_justina');
        carrito = [];

        // 3. Actualizamos la interfaz del header y recargamos o mandamos al inicio
        actualizarInterfazHeader();
        window.location.href = 'index.html';
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
                actualizarInterfazHeader();
                await verificarCarritoPendiente(datos.usuario.id);
                if (modalLogin) modalLogin.classList.remove('activo');
                window.location.reload();
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
// CONTROL DE MODAL DE LOGIN Y REGISTRO
// =========================================================

// 1. Cerrar modal
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
                actualizarInterfazHeader();
                cargarFavoritosDesdeBD();

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
//  NAVEGACIÓN DE HEADER
// =========================================================

// CARGAR CATEGORÍAS DESDE POSTGRESQL AL MENÚ DESPLEGABLE
async function cargarCategoriasEnHeader() {
    const contenedorMenu = document.getElementById('menu-categorias');
    if (!contenedorMenu) return;

    try {
        const res = await fetch('http://localhost:3000/api/categorias');
        const categorias = await res.json();

        let html = `<a href="index.html?categoria=Todos">Ver Todo</a>`;

        categorias.forEach(cat => {
            const nombreCat = (typeof cat === 'object' && cat !== null) ? (cat.categoria || cat.nombre || Object.values(cat)[0]) : cat;

            if (nombreCat) {
                html += `<a href="index.html?categoria=${encodeURIComponent(nombreCat)}">${nombreCat}</a>`;
            }
        });

        contenedorMenu.innerHTML = html;
    } catch (err) {
        console.error("Error cargando categorías en el header:", err);
    }
}

// FUNCIÓN PARA FILTRAR PRODUCTOS POR CATEGORÍA
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
    const seccionContenedor = document.querySelector('.contenedor');
    if (seccionContenedor) {
        seccionContenedor.scrollIntoView({ behavior: 'smooth' });
    }
}

// COMPORTAMIENTO DEL BOTÓN "INICIO" O LOGO 

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
}
if (navInicio) navInicio.addEventListener('click', irAlInicio);
if (logoLink) logoLink.addEventListener('click', irAlInicio);


// CONTROL DEL MENÚ EN MÓVILES
if (btnMenuMobile && navPrincipal) {
    btnMenuMobile.addEventListener('click', () => {
        // Toggle: Si no tiene la clase 'activo' se la pone, si la tiene se la saca
        navPrincipal.classList.toggle('activo');
    });
}


// ¡INICIO DE LA APP!
cargarBaseDeDatos();

// ¡Llamamos a cargar las categorías del menú apenas inicia la tienda!
cargarCategoriasEnHeader();

// ¡Apenas carga index.html, revisamos quién está conectado para dibujar el header correcto!
actualizarInterfazHeader();

cargarFavoritosDesdeBD();


// Apenas carga index.html, revisamos si la URL trae una categoría seleccionada
document.addEventListener('DOMContentLoaded', async () => {
    actualizarCarrito();

    const parametrosUrl = new URLSearchParams(window.location.search);
    const categoriaUrl = parametrosUrl.get('categoria');

    if (categoriaUrl) {
        // Esperamos a que los productos se carguen de la base de datos y filtramos
        await cargarBaseDeDatos();
        filtrarPorCategoria(categoriaUrl);
    }
});

// Apenas carga cualquier página, revisamos si hay que abrir el carrito recuperado
document.addEventListener('DOMContentLoaded', () => {
    actualizarCarrito();

    if (sessionStorage.getItem('abrir_carrito_recuperado') === 'true') {
        sessionStorage.removeItem('abrir_carrito_recuperado'); // Se limpia de inmediato

        const modalCarrito = document.getElementById('modal-carrito');
        if (modalCarrito) {
            modalCarrito.classList.add('activo');
            cargarDireccionesEnCarrito();
        }

        const cantSinStock = sessionStorage.getItem('aviso_stock_faltante');
        if (cantSinStock) {
            sessionStorage.removeItem('aviso_stock_faltante'); // Se limpia para que no se repita

            let avisoStock = document.getElementById('aviso-stock-recuperado');
            if (!avisoStock) {
                avisoStock = document.createElement('div');
                avisoStock.id = 'aviso-stock-recuperado';
                avisoStock.style.cssText = "background: #fff3cd; color: #856404; padding: 0.6rem; font-size: 0.85rem; border-radius: 4px; margin-bottom: 0.8rem; border: 1px solid #ffeeba;";
                
                const cuerpoModal = document.getElementById('lista-carrito');
                if (cuerpoModal) {
                    cuerpoModal.before(avisoStock);
                }
            }
            avisoStock.innerHTML = `⚠️ ${cantSinStock} producto(s) de tu carrito anterior fueron eliminados automáticamente por falta de stock.`;
        }
    }
});