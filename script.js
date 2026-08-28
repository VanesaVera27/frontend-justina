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
const btnConfigWAdmin = document.getElementById('btn-configw-admin');
const btnPerfil = document.getElementById('btn-perfil');
const btnLogoutHeader = document.getElementById('btn-logout-header');
const contenedorDropdown = document.getElementById('contenedor-dropdown-user');
const modalLogin = document.getElementById('modal-login');
const btnCarrito = document.getElementById('boton-carrito');
const btnFavorito = document.getElementById('boton-favorito');

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
                // ⚡ Sumamos la cantidad acumulada en lugar de contar elementos sueltos
                const cantEnCarrito = carrito
                    .filter(item => item.id === prod.id && item.talleElegido === v.talle && item.colorElegido === v.color)
                    .reduce((acc, item) => acc + (item.cantidad || 1), 0);

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
            // ⚡ Sumamos la cantidad acumulada para productos sin variantes
            const cantEnCarrito = carrito
                .filter(item => item.id === prod.id)
                .reduce((acc, item) => acc + (item.cantidad || 1), 0);

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

        // Verificamos si el usuario actual es admin
        const sesionCheck = localStorage.getItem('usuario_tienda');
        let esAdmin = false;
        if (sesionCheck) {
            try {
                esAdmin = JSON.parse(sesionCheck).rol === 'admin';
            } catch (e) { }
        }

        // Dependiendo si es admin, anulamos el botón de favoritos y el de comprar
        const botonFavoritoHtml = esAdmin ? '' : `
            <button type="button" 
                    class="btn-favorito ${esFavorito ? 'liked' : ''}" 
                    onclick="toggleFavorito(${prod.id}, this)" 
                    title="${esFavorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
                <svg viewBox="0 0 24 24" class="icono-corazon">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
            </button>
        `;

        const botonAccionHtml = esAdmin ? `
            <div style="background: #f8f9fa; color: #6c757d; text-align: center; padding: 0.6rem; border-radius: 4px; font-size: 0.85rem; border: 1px dashed #ced4da;">
                🔒 Vista de Administrador
            </div>
        ` : `
            <button onclick="agregarAlCarrito(${prod.id})">
                Agregar al carrito
            </button>
        `;

        card.innerHTML = `
            <div class="carrusel-card ${tieneMasDeUnaFoto ? '' : 'sin-flechas'}" style="position: relative;">
                ${botonFavoritoHtml}
                
                <!-- ⚡ CARTEL FLOTANTE DE ÚLTIMA UNIDAD SOBRE LA FOTO -->
                <div id="alerta-stock-${prod.id}" style="display: none; position: absolute; top: 10px; left: 10px; z-index: 5; background: rgba(255, 243, 205, 0.95); color: #856404; font-size: 0.7rem; font-weight: bold; padding: 0.2rem 0.5rem; border-radius: 4px; border: 1px solid #ffeeba; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    🔥 ¡Última unidad!
                </div>

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
                    <select class="select-talle" id="talle-${prod.id}" onchange="actualizarColoresYVerificarStock(${prod.id})" style="width: 100%; padding: 0.4rem;">
                        ${opcionesTalles}
                    </select>
                </div>
                <div style="flex: 1;">
                    <label style="font-size: 0.75rem; color: #666; display: block;">Color:</label>
                    <select class="select-color" id="color-${prod.id}" onchange="verificarUltimaUnidad(${prod.id})" style="width: 100%; padding: 0.4rem;">
                        ${opcionesColores}
                    </select>
                </div>
            </div>

            ${botonAccionHtml}
        `;

        grilla.appendChild(card);
        setTimeout(() => verificarUltimaUnidad(prod.id), 0);
    });
}

// Función para verificar si la variante seleccionada tiene exactamente 1 unidad restante
function verificarUltimaUnidad(idProducto) {
    const productoOriginal = productos.find(p => p.id === idProducto);
    if (!productoOriginal) return;

    const selectTalle = document.getElementById(`talle-${idProducto}`);
    const selectColor = document.getElementById(`color-${idProducto}`);
    const cartelAlerta = document.getElementById(`alerta-stock-${idProducto}`);

    if (!cartelAlerta) return;

    const talleSeleccionado = selectTalle ? selectTalle.value : 'Único';
    const colorSeleccionado = selectColor ? selectColor.value : 'Único';

    let stockReal = 1;

    let carritoActual = JSON.parse(localStorage.getItem('carrito_justina')) || [];

    if (Array.isArray(productoOriginal.variantes) && productoOriginal.variantes.length > 0) {
        const varianteElegida = productoOriginal.variantes.find(v =>
            v.talle === talleSeleccionado && v.color === colorSeleccionado
        );
        if (varianteElegida) {
            const cantEnCarrito = carritoActual
                .filter(item => item.id === idProducto && item.talleElegido === talleSeleccionado && item.colorElegido === colorSeleccionado)
                .reduce((acc, item) => acc + (item.cantidad || 1), 0);

            stockReal = Number(varianteElegida.stock) - cantEnCarrito;
        }
    } else if (productoOriginal.stock !== undefined) {
        const cantEnCarrito = carritoActual
            .filter(item => item.id === idProducto)
            .reduce((acc, item) => acc + (item.cantidad || 1), 0);

        stockReal = Number(productoOriginal.stock) - cantEnCarrito;
    }

    // Si queda exactamente 1 sola unidad disponible, mostramos el cartel flotante
    if (stockReal === 1) {
        cartelAlerta.style.display = 'block';
    } else {
        cartelAlerta.style.display = 'none';
    }
}

// Función combinada para actualizar colores cuando cambia el talle y revisar el stock
function actualizarColoresYVerificarStock(idProducto) {
    // Si ya tenías una función para actualizar colores, llamala acá (ej: actualizarColoresDisponibles(idProducto))
    if (typeof actualizarColoresDisponibles === 'function') {
        actualizarColoresDisponibles(idProducto);
    }
    verificarUltimaUnidad(idProducto);
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
// FUNCIONES GLOBALES DE CARRITO (CON SOPORTE DE CANTIDADES)
// ====================================================================

function agregarAlCarrito(idProducto) {
    const productoOriginal = productos.find(p => p.id === idProducto);

    if (productoOriginal) {
        const selectTalle = document.getElementById(`talle-${idProducto}`);
        const selectColor = document.getElementById(`color-${idProducto}`);

        const talleSeleccionado = selectTalle ? selectTalle.value : 'Único';
        const colorSeleccionado = selectColor ? selectColor.value : 'Único';

        // 1. Calculamos el stock real disponible
        let stockDisponible = 1;
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

        // 2. Contamos cuántas unidades de esta variante exacta ya están en el carrito
        let indexExistente = carrito.findIndex(prod =>
            prod.id === idProducto &&
            prod.talleElegido === talleSeleccionado &&
            prod.colorElegido === colorSeleccionado
        );

        let cantidadActualEnCarrito = indexExistente !== -1 ? (carrito[indexExistente].cantidad || 1) : 0;

        // 3. Validamos stock
        if (cantidadActualEnCarrito >= stockDisponible) {
            alert(`¡Ups! Solo tenemos ${stockDisponible} unidad(es) disponible(s) en talle ${talleSeleccionado} y color ${colorSeleccionado}.`);
            return;
        }

        const precioReal = productoOriginal.en_oferta
            ? (Number(productoOriginal.precio) - (Number(productoOriginal.precio) * (Number(productoOriginal.descuento || 20) / 100)))
            : Number(productoOriginal.precio);

        if (indexExistente !== -1) {
            carrito[indexExistente].cantidad = (carrito[indexExistente].cantidad || 1) + 1;
        } else {
            const productoParaCarrito = {
                ...productoOriginal,
                talleElegido: talleSeleccionado,
                colorElegido: colorSeleccionado,
                precio: precioReal,
                cantidad: 1
            };
            carrito.push(productoParaCarrito);
        }

        actualizarCarrito();
        mostrarProductosEnPantalla(productos);

        // Abrimos el modal brevemente para mostrar que se agregó
        const modalCarrito = document.getElementById('modal-carrito');
        if (modalCarrito) {
            modalCarrito.classList.add('activo');
        }
    }
}
function actualizarContadorHeader() {
    let carritoActual = JSON.parse(localStorage.getItem('carrito_justina')) || [];
    // Sumamos las cantidades totales de todos los ítems para la burbuja del header
    const totalItems = carritoActual.reduce((acc, item) => acc + (item.cantidad || 1), 0);

    const elemContador = document.getElementById('contador-carrito');
    if (elemContador) elemContador.textContent = totalItems;
}

// ====================================================================
// FUNCION PARA ELIMINAR DEL CARRITO  
// ====================================================================

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarCarrito();
    if (typeof mostrarProductosEnPantalla === 'function' && typeof productos !== 'undefined') {
        mostrarProductosEnPantalla(productos);
    }
}

// ====================================================================
// FUNCION PARA ACTUALIZAR EL CARRITO  
// ====================================================================

function actualizarCarrito() {
    localStorage.setItem('carrito_justina', JSON.stringify(carrito));

    const totalUnidades = carrito.reduce((acc, item) => acc + (item.cantidad || 1), 0);
    if (elemContador) elemContador.textContent = totalUnidades;

    if (!listaCarrito || !elemTotal) return;

    listaCarrito.innerHTML = '';

    if (carrito.length === 0) {
        listaCarrito.innerHTML = '<p class="carrito-vacio">El carrito está vacío.</p>';
        elemTotal.textContent = '$0';
        return;
    }

    let sumaTotal = 0;

    carrito.forEach((prod, index) => {
        const cantidad = prod.cantidad || 1;
        const subtotalItem = Number(prod.precio) * cantidad;
        sumaTotal += subtotalItem;

        const item = document.createElement('div');
        item.classList.add('item-carrito');

        item.innerHTML = `
            <div class="item-info">
                <h4>${prod.nombre}</h4>
                <small style="color:#666; font-size:0.85rem;">
                    Talle: <b>${prod.talleElegido}</b> | Color: <b>${prod.colorElegido}</b> | Cant: <b>${cantidad}</b>
                </small>
                <p style="margin: 0.2rem 0 0; font-weight: bold;">$${subtotalItem.toLocaleString()}</p>
            </div>
            <button class="btn-eliminar" onclick="eliminarDelCarrito(${index})">X</button>
        `;
        listaCarrito.appendChild(item);
    });

    elemTotal.textContent = `$${sumaTotal.toLocaleString()}`;
}

// ====================================================================
// EVENTO DEL MODAL CARRITO, ABRIR Y CERRAR
// ====================================================================
if (botonAbrirCarrito) {
    botonAbrirCarrito.addEventListener('click', () => {
        window.location.href = 'carrito.html';
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

// Y hacé lo mismo si hacés clic en el fondo  para cerrar:
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
    btnFinalizarCompra.addEventListener('click', () => {
        window.location.href = 'carrito.html';
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
            if (btnConfigWAdmin) btnConfigWAdmin.style.display = 'block';
            if (btnPerfil) btnPerfil.style.display = 'none';
            btnCarrito.style.display = 'none';
            btnFavorito.style.display = 'none';
        } else {
            if (btnConfigAdmin) btnConfigAdmin.style.display = 'none';
            if (btnPedidosAdmin) btnPedidosAdmin.style.display = 'none';
            if (btnConfigWAdmin) btnConfigWAdmin.style.display = 'none';
            if (btnPerfil) btnPerfil.style.display = 'block';
            btnCarrito.style.display = 'block';
            btnFavorito.style.display = 'block';
        }
    } else {
        btnLoginHeader.innerHTML = `<span class="icono-user">${iconoUserSVG}</span> <span class="texto-user">Iniciar Sesión</span>`;

        btnCarrito.style.display = "block";
        btnFavorito.style.display = "block";
        if (contenedorDropdown) contenedorDropdown.classList.remove('sesion-activa');
        if (btnConfigAdmin) btnConfigAdmin.style.display = 'none';
        if (btnConfigWAdmin) btnConfigWAdmin.style.display = 'none';
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
    actualizarContadorHeader();

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

//PARA LA CONFIGURACION WEB DE ADMIN

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('http://localhost:3000/api/configuracion');
        if (res.ok) {
            const config = await res.json();

            // 1. WhatsApp (Footer y Botón Flotante)
            if (config.whatsapp) {
                const footerWsp = document.getElementById('footer-wsp');
                const linkWsp = document.getElementById('link-footer-wsp');
                const btnWspFlotante = document.getElementById('btn-whatsapp-flotante');
                
                if (footerWsp) footerWsp.textContent = config.whatsapp;
                const numeroLimpio = config.whatsapp.replace(/\D/g, '');
                const urlWsp = `https://wa.me/${numeroLimpio}?text=%C2%A1Hola!%20Quer%C3%ADa%20hacer%20una%20consulta%20sobre%20las%20prendas%20de%20la%20tienda...`;

                if (linkWsp) linkWsp.href = `https://wa.me/${numeroLimpio}`;
                if (btnWspFlotante) btnWspFlotante.href = urlWsp;
            }

            // 2. Email de Contacto
            if (config.email_contacto) {
                const footerEmail = document.getElementById('footer-email');
                const linkEmail = document.getElementById('link-footer-email');
                if (footerEmail) footerEmail.textContent = config.email_contacto;
                if (linkEmail) linkEmail.href = `mailto:${config.email_contacto}`;
            }

            // 3. Instagram
            if (config.instagram) {
                const footerIg = document.getElementById('footer-ig');
                const linkIg = document.getElementById('link-footer-ig');
                if (footerIg) footerIg.textContent = config.instagram;
                const usuarioIg = config.instagram.replace('@', '').trim();
                if (linkIg) linkIg.href = `https://instagram.com/${usuarioIg}`;
            }

            // 4. TikTok
            if (config.tiktok) {
                const footerTk = document.getElementById('footer-tk');
                const linkTk = document.getElementById('link-footer-tk');
                if (footerTk) footerTk.textContent = config.tiktok;
                const usuarioTk = config.tiktok.replace('@', '').trim();
                if (linkTk) linkTk.href = `https://tiktok.com/@${usuarioTk}`;
            }

            // 5. Color principal de la tienda
            if (config.color_principal) {
                document.documentElement.style.setProperty('--color-principal', config.color_principal);
            }

            // 6. Cinta de Promociones Superior
            if (config.texto_promocion) {
                const cintaTrack = document.getElementById('cinta-promos-track');
                if (cintaTrack) {
                    let arrayPromos = [];
                    try {
                        arrayPromos = JSON.parse(config.texto_promocion);
                    } catch (e) {
                        arrayPromos = [config.texto_promocion];
                    }

                    if (arrayPromos.length > 0) {
                        const spansHtml = arrayPromos.map(texto => `<span>${texto}</span>`).join(' ');
                        cintaTrack.innerHTML = `
                            <div class="cinta-texto">${spansHtml} &nbsp;&nbsp;&nbsp;&nbsp; ${spansHtml}</div>
                            <div class="cinta-texto">${spansHtml} &nbsp;&nbsp;&nbsp;&nbsp; ${spansHtml}</div>
                        `;
                    }
                }
            }

            // 7. Actualizar datos en la página de Contacto 
            if (config.whatsapp) {
                const contactoWspText = document.getElementById('contacto-wsp-text');
                const contactoWspLink = document.getElementById('contacto-wsp-link');
                const contactoTelText = document.getElementById('contacto-tel-text');
                const contactoTelLink = document.getElementById('contacto-tel-link');

                const numeroLimpio = config.whatsapp.replace(/\D/g, '');

                if (contactoWspText) contactoWspText.textContent = config.whatsapp;
                if (contactoWspLink) contactoWspLink.href = `https://wa.me/${numeroLimpio}?text=%C2%A1Hola!%20Quer%C3%ADa%20hacer%20una%20consulta...`;

                if (contactoTelText) contactoTelText.textContent = config.whatsapp; 
                if (contactoTelLink) contactoTelLink.href = `tel:+${numeroLimpio}`;
            }

            if (config.email_contacto) {
                const contactoEmailText = document.getElementById('contacto-email-text');
                const contactoEmailLink = document.getElementById('contacto-email-link');

                if (contactoEmailText) contactoEmailText.textContent = config.email_contacto;
                if (contactoEmailLink) contactoEmailLink.href = `mailto:${config.email_contacto}`;
            }

            // 8. Actualizar Ubicación y enlace de Google Maps en la página de Contacto
            if (config.ubicacion) {
                const ubicacionText = document.getElementById('contacto-ubicacion-text');
                const mapaLink = document.getElementById('contacto-mapa-link');

                if (ubicacionText) ubicacionText.textContent = config.ubicacion;
                if (mapaLink) {
                    // Genera automáticamente la búsqueda en Google Maps basada en el texto ingresado
                    const queryMap = encodeURIComponent(config.ubicacion);
                    mapaLink.href = `https://maps.google.com/?q=${queryMap}`;
                }
            }
        }
    } catch (err) {
        console.error("Error al cargar la configuración global:", err);
    }
});