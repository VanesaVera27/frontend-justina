// ====================================================================
// ELEMENTOS DEL DOM Y VARIABLES
// ====================================================================
const grilla = document.getElementById('grilla-productos');

//NAVEGACION DE HEADER
const navInicio = document.getElementById('nav-inicio');
const logoLink = document.getElementById('logo-link');

//NAVEGACION MOBILE
const btnMenu = document.getElementById('#btn-menu-mobile');
const navPrincipal = document.getElementById('nav-principal');

//VARIABLES
let productos = [];
let carrito = JSON.parse(localStorage.getItem('carrito_justina')) || [];
const indiceImagenActual = {};
let favoritos = [];


// ====================================================================
// CARGAR BASE DE DATOS 
// ====================================================================
async function cargarBaseDeDatos() {
    try {
        const respuesta = await fetch(`${API_URL}/api/productos`);

        if (!respuesta.ok) {
            throw new Error('No se pudo obtener la respuesta del servidor');
        }
        productos = await respuesta.json();

        // 🔍 Agregá esto para ver en la consola del navegador qué productos llegan filtrados
        const productosDestacados = productos.filter(p => p.destacado === true);
        console.log("Productos destacados encontrados:", productosDestacados);

        mostrarProductosEnPantalla(productosDestacados);
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

        if (Array.isArray(prod.variantes) && prod.variantes.length > 0) {
            const variantesConStock = prod.variantes.filter(v => {
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

        if (prod.en_oferta) {
            return;
        }

        const card = document.createElement('div');
        card.classList.add('card-producto');

        const fotos = (prod.imagenes && prod.imagenes.length > 0) ? prod.imagenes : [prod.imagen];
        const tieneMasDeUneFoto = fotos.length > 1;
        const esFavorito = favoritos.includes(prod.id);

        const precioNumerico = Number(prod.precio);
        const valorCuota = (precioNumerico / 3).toLocaleString();

        const sesionCheck = localStorage.getItem('usuario_tienda');
        let esAdmin = false;
        if (sesionCheck) {
            try {
                esAdmin = JSON.parse(sesionCheck).rol === 'admin';
            } catch (e) { }
        }

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

        // 🛑 Lógica para bloquear el botón o mostrar aviso si no hay stock
        let botonAccionHtml = '';
        if (esAdmin) {
            botonAccionHtml = `
                <div style="background: #f8f9fa; color: #6c757d; text-align: center; padding: 0.6rem; border-radius: 4px; font-size: 0.85rem; border: 1px dashed #ced4da;">
                    🔒 Vista de Administrador
                </div>
            `;
        } else if (sinStock) {
            botonAccionHtml = `
                <button disabled style="background-color: #cccccc !important; color: #666666 !important; cursor: not-allowed !important; border: none;">
                    Agotado
                </button>
            `;
        } else {
            botonAccionHtml = `
                <button onclick="agregarAlCarrito(${prod.id})">
                    Agregar al carrito
                </button>
            `;
        }

        // Badge visual de sin stock arriba a la izquierda
        const badgeSinStockHtml = sinStock ? `
            <div style="position: absolute; top: 10px; left: 10px; z-index: 5; background: rgba(85, 85, 85, 0.95); color: #ffffff; font-size: 0.7rem; font-weight: bold; padding: 0.2rem 0.5rem; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                Sin stock
            </div>
        ` : '';

        card.innerHTML = `
            <div class="carrusel-card ${tieneMasDeUneFoto ? '' : 'sin-flechas'}" style="position: relative;">
                ${botonFavoritoHtml}
                ${badgeSinStockHtml}
                
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
                    <select class="select-talle" id="talle-${prod.id}" onchange="actualizarColoresYVerificarStock(${prod.id})" style="width: 100%; padding: 0.4rem;" ${sinStock ? 'disabled' : ''}>
                        ${opcionesTalles}
                    </select>
                </div>
                <div style="flex: 1;">
                    <label style="font-size: 0.75rem; color: #666; display: block;">Color:</label>
                    <select class="select-color" id="color-${prod.id}" onchange="verificarUltimaUnidad(${prod.id})" style="width: 100%; padding: 0.4rem;" ${sinStock ? 'disabled' : ''}>
                        ${opcionesColores}
                    </select>
                </div>
            </div>

            ${botonAccionHtml}
        `;

        grilla.appendChild(card);
        if (!sinStock) {
            setTimeout(() => verificarUltimaUnidad(prod.id), 0);
        }
    });
}


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

    if (stockReal === 1) {
        cartelAlerta.style.display = 'block';
    } else {
        cartelAlerta.style.display = 'none';
    }
}


function actualizarColoresYVerificarStock(idProducto) {
    if (typeof actualizarColoresDisponibles === 'function') {
        actualizarColoresDisponibles(idProducto);
    }
    verificarUltimaUnidad(idProducto);
}


// ====================================================================
// CONTROL GENERAL DEL HERO BANNER / SLIDER DINÁMICO (INDEX Y PÁGINAS)
// ====================================================================
let slideActual = 0;
let intervaloSlide;

function mostrarSlide(indice) {
    const slides = document.querySelectorAll('.hero-slide');
    const puntos = document.querySelectorAll('.punto');

    if (slides.length === 0) return;

    slides.forEach(slide => slide.classList.remove('activo'));
    puntos.forEach(punto => punto.classList.remove('activo'));

    slideActual = (indice + slides.length) % slides.length;

    slides[slideActual].classList.add('activo');
    if (puntos[slideActual]) {
        puntos[slideActual].classList.add('activo');
    }
}

function siguienteSlide() {
    mostrarSlide(slideActual + 1);
}

function irASlide(indice) {
    mostrarSlide(indice);
    clearInterval(intervaloSlide);
    intervaloSlide = setInterval(siguienteSlide, 5000);
}

// ====================================================================
// CARGAR SLIDER EN EL INDEX
// ====================================================================
async function cargarHeroSliderDinamico() {
    const contenedorSlider = document.getElementById('hero-slider-dinamico');
    if (!contenedorSlider) return;

    try {
        const res = await fetch(`${API_URL}/api/banners`);
        if (!res.ok) return;
        const banners = await res.json();

        if (banners.length === 0) {
            contenedorSlider.style.display = 'none';
            return;
        }

        let slidesHtml = '';
        let puntosHtml = '';

        banners.forEach((b, index) => {
            const claseActiva = index === 0 ? 'activo' : '';
            const srcFoto = b.imagen.startsWith('imagenes/') ? b.imagen : `/${b.imagen}`;

            slidesHtml += `
                <div class="hero-slide ${claseActiva}" style="background-image: url('${srcFoto}');">
                    <div class="hero-overlay"></div>
                    <div class="hero-contenido">
                        ${b.subtitulo ? `<span class="hero-sub">${b.subtitulo}</span>` : ''}
                        ${b.titulo ? `<h2>${b.titulo}</h2>` : ''}
                        ${b.descripcion ? `<p>${b.descripcion}</p>` : ''}
                        ${b.link ? `<a href="${b.link}" class="btn-hero">Ver Más</a>` : ''}
                    </div>
                </div>
            `;

            puntosHtml += `<span class="punto ${claseActiva}" onclick="irASlide(${index})"></span>`;
        });

        contenedorSlider.innerHTML = `
            ${slidesHtml}
            <div class="hero-puntos">${puntosHtml}</div>
        `;

        const slidesDinamicos = document.querySelectorAll('.hero-slide');
        if (slidesDinamicos.length > 1) {
            clearInterval(intervaloSlide);
            intervaloSlide = setInterval(siguienteSlide, 5000);
        }

    } catch (err) {
        console.error("Error al cargar el slider dinámico:", err);
    }
}

// ====================================================================
// CARGAR BANNER DINÁMICO EN PÁGINAS ESPECÍFICAS (PRODUCTOS / OFERTAS)
// ====================================================================
async function cargarBannerPaginaEspecifica() {
    const contenedor = document.getElementById('banner-dinamico-pagina');
    if (!contenedor) return;

    try {
        const res = await fetch(`${API_URL}/api/banners`);
        if (!res.ok) return;
        const banners = await res.json();

        const rutaActual = window.location.pathname.split('/').pop() || 'index.html';

        const bannersDeEstaPagina = banners.filter(b => {
            if (!b.link) return false;
            return b.link.includes(rutaActual);
        });

        if (bannersDeEstaPagina.length === 0) {
            contenedor.style.display = 'none';
            return;
        }

        let slidesHtml = '';
        let puntosHtml = '';

        bannersDeEstaPagina.forEach((b, index) => {
            const claseActiva = index === 0 ? 'activo' : '';
            const srcFoto = b.imagen.startsWith('imagenes/') ? `/${b.imagen}` : b.imagen;

            slidesHtml += `
                <div class="hero-slide ${claseActiva}" style="background-image: url('${srcFoto}');">
                    <div class="hero-overlay"></div>
                    <div class="hero-contenido">
                        ${b.subtitulo ? `<span class="hero-sub">${b.subtitulo}</span>` : ''}
                        ${b.titulo ? `<h2>${b.titulo}</h2>` : ''}
                        ${b.descripcion ? `<p>${b.descripcion}</p>` : ''}
                    </div>
                </div>
            `;

            puntosHtml += `<span class="punto ${claseActiva}" onclick="irASlide(${index})"></span>`;
        });

        contenedor.innerHTML = `
            ${slidesHtml}
            <div class="hero-puntos">
                ${puntosHtml}
            </div>
        `;

        const slidesDinamicos = contenedor.querySelectorAll('.hero-slide');
        if (slidesDinamicos.length > 1) {
            clearInterval(intervaloSlide);
            intervaloSlide = setInterval(siguienteSlide, 5000);
        }

    } catch (err) {
        console.error("Error al cargar el banner de la página:", err);
    }
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
        const res = await fetch(`${API_URL}/api/favoritos/${usuario.id}`);
        if (res.ok) {
            favoritos = await res.json();
            actualizarCorazonesEnPantalla();
        }
    } catch (err) {
        console.error("No se pudieron cargar los favoritos desde la base de datos:", err);
    }
}


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


function actualizarColoresDisponibles(idProducto) {
    const producto = productos.find(p => p.id === idProducto);
    if (!producto || !Array.isArray(producto.variantes)) return;

    const selectTalle = document.getElementById(`talle-${idProducto}`);
    const selectColor = document.getElementById(`color-${idProducto}`);
    if (!selectTalle || !selectColor) return;

    const talleElegido = selectTalle.value;

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
            const res = await fetch(`${API_URL}/api/favoritos`, {
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
            const res = await fetch(`${API_URL}/api/favoritos/${usuario.id}/${idProducto}`, {
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
// FUNCIONES GLOBALES DE CARRITO
// ====================================================================
function agregarAlCarrito(idProducto) {
    const productoOriginal = productos.find(p => p.id === idProducto);
    if (!productoOriginal) return;

    if (productoOriginal) {
        const selectTalle = document.getElementById(`talle-${idProducto}`);
        const selectColor = document.getElementById(`color-${idProducto}`);

        const talleSeleccionado = selectTalle ? selectTalle.value : 'Único';
        const colorSeleccionado = selectColor ? selectColor.value : 'Único';

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

        let indexExistente = carrito.findIndex(prod =>
            prod.id === idProducto &&
            prod.talleElegido === talleSeleccionado &&
            prod.colorElegido === colorSeleccionado
        );

        let cantidadActualEnCarrito = indexExistente !== -1 ? (carrito[indexExistente].cantidad || 1) : 0;

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

        // 🛑 VALIDACIÓN INTELIGENTE SEGÚN LA PÁGINA EN LA QUE ESTÉS:
        const paginaActual = window.location.pathname;

        if (paginaActual.includes('productos.html')) {
            // Si estamos en el catálogo general, actualizamos el catálogo completo
            if (typeof mostrarProductosEnPantalla === 'function') {
                mostrarProductosEnPantalla(productos);
            }
        } else {
            // Si estamos en el index, filtramos y mostramos solo los destacados
            const productosDestacados = productos.filter(p => p.destacado === true);
            if (typeof mostrarProductosEnPantalla === 'function') {
                mostrarProductosEnPantalla(productosDestacados);
            }
        }

        // Abrimos el modal lateral del carrito
        const modalCarritoDinamico = document.getElementById('modal-carrito');
        if (modalCarritoDinamico) {
            modalCarritoDinamico.classList.add('activo');
        }
    }
}


function actualizarContadorHeader() {
    let carritoActual = JSON.parse(localStorage.getItem('carrito_justina')) || [];
    const totalItems = carritoActual.reduce((acc, item) => acc + (item.cantidad || 1), 0);

    const elemContador = document.getElementById('contador-carrito');
    if (elemContador) elemContador.textContent = totalItems;
}


function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarCarrito();

    const paginaActual = window.location.pathname;

    if (paginaActual.includes('productos.html')) {
        if (typeof mostrarProductosEnPantalla === 'function') {
            mostrarProductosEnPantalla(productos);
        }
    } else {
        const productosDestacados = productos.filter(p => p.destacado === true);
        if (typeof mostrarProductosEnPantalla === 'function') {
            mostrarProductosEnPantalla(productosDestacados);
        }
    }
}


function actualizarCarrito() {
    localStorage.setItem('carrito_justina', JSON.stringify(carrito));

    const totalUnidades = carrito.reduce((acc, item) => acc + (item.cantidad || 1), 0);
    const elemContador = document.getElementById('contador-carrito');
    if (elemContador) elemContador.textContent = totalUnidades;

    const listaCarritoDinamica = document.getElementById('lista-carrito');
    const elemTotalDinamico = document.getElementById('total-precio');

    if (!listaCarritoDinamica || !elemTotalDinamico) return;

    listaCarritoDinamica.innerHTML = '';

    if (carrito.length === 0) {
        listaCarritoDinamica.innerHTML = '<p class="carrito-vacio">El carrito está vacío.</p>';
        elemTotalDinamico.textContent = '$0';
        return;
    }

    let sumaTotal = 0;

    carrito.forEach((prod, index) => {
        const cantidad = prod.cantidad || 1;
        const subtotalItem = Number(prod.precio) * cantidad;
        sumaTotal += subtotalItem;

        // Aseguramos que la ruta de la imagen sea correcta
        const fotoItem = prod.imagen ? (prod.imagen.startsWith('imagenes/') ? prod.imagen : `imagenes/${prod.imagen}`) : 'imagenes/default.jpg';

        const item = document.createElement('div');
        item.classList.add('item-carrito');

        item.innerHTML = `
            <img src="${fotoItem}" alt="${prod.nombre}" onerror="this.src='https://via.placeholder.com/65x75?text=Foto'">
            <div class="item-info">
                <h4>${prod.nombre}</h4>
                <small>
                    Talle: <b>${prod.talleElegido}</b><br>
                    Color: <b>${prod.colorElegido}</b><br>
                    Cant: <b>${cantidad}</b>
                </small>
                <p>$${subtotalItem.toLocaleString()}</p>
            </div>
            <button class="btn-eliminar" onclick="eliminarDelCarrito(${index})" title="Eliminar producto">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        `;
        listaCarritoDinamica.appendChild(item);
    });

    elemTotalDinamico.textContent = `$${sumaTotal.toLocaleString()}`;
}

// =========================================================
// VERIFICAR CARRITO PENDIENTE AL LOGUEARSE
// =========================================================
async function verificarCarritoPendiente(usuarioId) {
    const clavePendiente = `carrito_pendiente_${usuarioId}`;
    const carritoGuardado = localStorage.getItem(clavePendiente);

    if (!carritoGuardado) return;

    const itemsAntiguos = JSON.parse(carritoGuardado);
    if (itemsAntiguos.length === 0) return;

    let itemsValidos = [];
    let cantidadSinStock = 0;

    for (const item of itemsAntiguos) {
        try {
            const res = await fetch(`${API_URL}/api/variantes/stock?producto_id=${item.id}&talle=${item.talleElegido}&color=${item.colorElegido}`);
            const data = await res.json();

            if (data.stock !== undefined && data.stock > 0) {
                itemsValidos.push(item);
            } else {
                cantidadSinStock++;
            }
        } catch (err) {
            itemsValidos.push(item);
        }
    }

    if (itemsValidos.length > 0) {
        carrito = itemsValidos;
        localStorage.setItem('carrito_justina', JSON.stringify(carrito));
        actualizarCarrito();
        localStorage.removeItem(clavePendiente);

        sessionStorage.setItem('abrir_carrito_recuperado', 'true');
        if (cantidadSinStock > 0) {
            sessionStorage.setItem('aviso_stock_faltante', cantidadSinStock);
        }

        window.location.reload();
    } else {
        localStorage.removeItem(clavePendiente);
        alert("⚠️ Tenías productos guardados en tu carrito anterior, pero lamentablemente ya no hay stock disponible.");
    }
}


// =========================================================
// CONTROL DEL HEADER SEGUN ROL 
// =========================================================
async function inicializarHeader() {
    try {
        const respuesta = await fetch('./componentes/header.html');
        if (!respuesta.ok) throw new Error('No se pudo cargar el header');

        const htmlHeader = await respuesta.text();

        const parser = new DOMParser();
        const docHeader = parser.parseFromString(htmlHeader, 'text/html');

        const testBtn = docHeader.getElementById('btn-login-header');
        // Inyectamos el contenido en el contenedor de la página principal
        const contenedorHeader = document.getElementById('header-container');
        if (contenedorHeader) {
            contenedorHeader.innerHTML = htmlHeader;
        }

        // Seleccionamos los elementos directamente del DOM ya actualizado
        const btnLoginHeader = document.getElementById('btn-login-header');
        const btnConfigAdmin = document.getElementById('btn-config-admin');
        const btnPedidosAdmin = document.getElementById('btn-pedidos-admin');
        const btnConfigWAdmin = document.getElementById('btn-configw-admin');
        const btnPerfil = document.getElementById('btn-perfil');
        const btnLogoutHeader = document.getElementById('btn-logout-header');
        const contenedorDropdown = document.getElementById('contenedor-dropdown-user');
        const btnCarrito = document.getElementById('boton-carrito');
        const btnFavorito = document.getElementById('boton-favorito');

        const sesionGuardada = localStorage.getItem('usuario_tienda');

        if (sesionGuardada) {
            const usuario = JSON.parse(sesionGuardada);
            const primerNombre = usuario.nombre.split(' ')[0];

            if (btnLoginHeader) {
                const spanTexto = btnLoginHeader.querySelector('.texto-user');
                if (spanTexto) {
                    spanTexto.textContent = `Hola, ${primerNombre} ▾`;
                } else {
                    btnLoginHeader.innerHTML = `<span class="texto-user">Hola, ${primerNombre} ▾</span>`;
                }
            }

            if (contenedorDropdown) contenedorDropdown.classList.add('sesion-activa');
            if (btnLogoutHeader) btnLogoutHeader.style.display = 'block';

            if (usuario.rol === 'admin') {
                if (btnConfigAdmin) btnConfigAdmin.style.display = 'block';
                if (btnPedidosAdmin) btnPedidosAdmin.style.display = 'block';
                if (btnConfigWAdmin) btnConfigWAdmin.style.display = 'block';
                if (btnPerfil) btnPerfil.style.display = 'none';
                if (btnCarrito) btnCarrito.style.display = 'none';
                if (btnFavorito) btnFavorito.style.display = 'none';
            } else {
                if (btnConfigAdmin) btnConfigAdmin.style.display = 'none';
                if (btnPedidosAdmin) btnPedidosAdmin.style.display = 'none';
                if (btnConfigWAdmin) btnConfigWAdmin.style.display = 'none';
                if (btnPerfil) btnPerfil.style.display = 'block';
                if (btnCarrito) btnCarrito.style.display = 'block';
                if (btnFavorito) btnFavorito.style.display = 'block';
            }
        } else {
            if (btnLoginHeader) {
                btnLoginHeader.innerHTML = `<span class="icono-user">${iconoUserSVG}</span> <span class="texto-user">Iniciar Sesión</span>`;
            }
            if (btnCarrito) btnCarrito.style.display = "block";
            if (btnFavorito) btnFavorito.style.display = "block";
            if (contenedorDropdown) contenedorDropdown.classList.remove('sesion-activa');
            if (btnConfigAdmin) btnConfigAdmin.style.display = 'none';
            if (btnConfigWAdmin) btnConfigWAdmin.style.display = 'none';
            if (btnPedidosAdmin) btnPedidosAdmin.style.display = 'none';
            if (btnPerfil) btnPerfil.style.display = 'none';
            if (btnLogoutHeader) btnLogoutHeader.style.display = 'none';
        }
        const modalLogin = document.getElementById('modal-login');

        if (btnLoginHeader) {

            btnLoginHeader.onclick = (e) => {
                const sesion = localStorage.getItem('usuario_tienda');
                if (!sesion) {
                    if (modalLogin) modalLogin.classList.add('activo');
                } else {
                    e.stopPropagation();
                    if (contenedorDropdown) {
                        contenedorDropdown.classList.toggle('activo-click');
                    }
                }
            };
        }

        document.addEventListener('click', (e) => {
            const dropdownUser = document.getElementById('contenedor-dropdown-user');
            if (dropdownUser && !dropdownUser.contains(e.target)) {
                dropdownUser.classList.remove('activo-click');
            }
        });

        if (btnLogoutHeader) {
            btnLogoutHeader.addEventListener('click', (e) => {
                e.preventDefault();
                const sesionActual = localStorage.getItem('usuario_tienda');
                if (sesionActual && typeof carrito !== 'undefined' && carrito.length > 0) {
                    const usuario = JSON.parse(sesionActual);
                    localStorage.setItem(`carrito_pendiente_${usuario.id}`, JSON.stringify(carrito));
                }

                localStorage.removeItem('usuario_tienda');
                localStorage.removeItem('carrito_justina');
                carrito = [];
                window.location.href = 'index.html';
            });
        }

        cargarCategoriasEnHeader();

    } catch (error) {
        console.error("Hubo un error al cargar el header:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    inicializarHeader();
});

// =========================================================
// NAVEGACIÓN 
// =========================================================
async function cargarCategoriasEnHeader() {
    const contenedorMenu = document.getElementById('menu-categorias');
    if (!contenedorMenu) return;

    try {
        const res = await fetch(`${API_URL}/api/categorias`);
        const categorias = await res.json();
        let html = `<a href="productos.html?categoria=Todos">Ver Todo</a>`;

        categorias.forEach(cat => {
            const nombreCat = (typeof cat === 'object' && cat !== null) ? (cat.categoria || cat.nombre || Object.values(cat)[0]) : cat;

            if (nombreCat) {
                html += `<a href="productos.html?categoria=${encodeURIComponent(nombreCat)}">${nombreCat}</a>`;
            }
        });

        contenedorMenu.innerHTML = html;
    } catch (err) {
        console.error("Error cargando categorías en el header:", err);
    }
}


function filtrarPorCategoria(categoriaSeleccionada) {
    if (!grilla) return;

    if (categoriaSeleccionada === 'Todos') {
        mostrarProductosEnPantalla(productos);
    } else {
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


function irAlInicio(e) {
    const paginaActual = window.location.pathname;
    const estamosEnIndex = paginaActual.endsWith('index.html') || paginaActual === '/' || paginaActual.endsWith('/');

    if (estamosEnIndex) {
        e.preventDefault();
        if (typeof mostrarProductosEnPantalla === 'function' && typeof productos !== 'undefined') {
            mostrarProductosEnPantalla(productos);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

if (navInicio) navInicio.addEventListener('click', irAlInicio);
if (logoLink) logoLink.addEventListener('click', irAlInicio);


// =========================================================
// LÓGICA DEL MENÚ HAMBURGUESA, COLECCIÓN Y USUARIO MÓVIL
// =========================================================
document.addEventListener("click", (e) => {
    const btnMenu = e.target.closest("#btn-menu-mobile");
    const navPrincipal = document.getElementById("nav-principal");
    const btnColeccion = e.target.closest(".dropdown-btn");
    const dropdownColeccion = e.target.closest(".dropdown-coleccion");
    
    const contenedorDropdownUser = document.getElementById("contenedor-dropdown-user");
    const menuOpciones = document.getElementById("menu-opciones");

    // 1. Menú hamburguesa principal (solo móvil)
    if (navPrincipal) {
        if (btnMenu) {
            navPrincipal.classList.toggle("activo");
            return;
        }

        // 2. Desplegable de Colección (Permitir clic en mobile o si prefieren click manual)
        if (window.innerWidth <= 768 && btnColeccion && dropdownColeccion) {
            e.preventDefault();
            const contenido = dropdownColeccion.querySelector(".dropdown-contenido");
            if (contenido) {
                const actual = window.getComputedStyle(contenido).display;
                contenido.style.display = (actual === "block") ? "none" : "block";
            }
            return;
        }

        // 3. Cierre automático del menú principal al hacer clic fuera
        if (!navPrincipal.contains(e.target) && !btnMenu) {
            navPrincipal.classList.remove("activo");
        }
    }

    // 4. Control seguro del menú de usuario
    if (contenedorDropdownUser) {
        if (!contenedorDropdownUser.contains(e.target)) {
            contenedorDropdownUser.classList.remove('activo-click');
            if (menuOpciones) {
                menuOpciones.style.display = "none";
            }
        }
    }
});




async function inicializarFooter() {
    try {
        const contenedorFooter = document.getElementById('contenedor-footer');
        if (!contenedorFooter) return;

        const res = await fetch('componentes/footer.html');
        if (res.ok) {
            const htmlFooter = await res.text();
            contenedorFooter.innerHTML = htmlFooter;
        }
    } catch (err) {
        console.error("Error al cargar el footer:", err);
    }
}

async function inicializarModales() {
    try {
        const contenedorModales = document.getElementById('contenedor-modales');
        if (!contenedorModales) return;

        const res = await fetch('componentes/modales.html');
        if (res.ok) {
            const htmlModales = await res.text();
            contenedorModales.innerHTML = htmlModales;

            // 🚀 Activamos los eventos acá adentro para que detecten los elementos ya inyectados
            configurarEventosModales();
        }
    } catch (err) {
        console.error("Error al cargar las modales:", err);
    }
}

function configurarEventosModales() {
    // --- MODAL LOGIN Y REGISTRO ---
    const modalLogin = document.getElementById('modal-login');
    const btnCerrarModalLogin = document.getElementById('btn-cerrar-modal-login');
    const tabLogin = document.getElementById('tab-login');
    const tabRegistro = document.getElementById('tab-registro');
    const formLogin = document.getElementById('form-login');
    const formRegistro = document.getElementById('form-registro');

    document.addEventListener('click', (e) => {
        const btnLoginHeader = e.target.closest('#btn-login-header');
        if (btnLoginHeader) {
            const sesion = localStorage.getItem('usuario_tienda');
            if (!sesion) {
                if (modalLogin) {
                    modalLogin.classList.add('activo');
                }
            }
        }
    });

    if (btnCerrarModalLogin) {
        btnCerrarModalLogin.addEventListener('click', () => {
            if (modalLogin) modalLogin.classList.remove('activo');
        });
    }

    if (tabLogin && tabRegistro && formLogin && formRegistro) {
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

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email-user').value.trim();
            const password = document.getElementById('password-user')?.value.trim();

            try {
                const respuesta = await fetch(`${API_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const datos = await respuesta.json();

                if (respuesta.ok) {
                    localStorage.setItem('usuario_tienda', JSON.stringify(datos.usuario));
                    await verificarCarritoPendiente(datos.usuario.id);
                    if (modalLogin) modalLogin.classList.remove('activo');
                    alert(`¡Bienvenida/o, ${datos.usuario.nombre}!`);
                    window.location.reload();
                } else {
                    alert(`Error: ${datos.error}`);
                }
            } catch (error) {
                alert("No se pudo conectar con el servidor backend en puerto 3000.");
            }
        });
    }

    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('reg-nombre').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-pass').value.trim();

            try {
                const respuesta = await fetch(`${API_URL}/api/usuarios/registro`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, email, password })
                });

                const datos = await respuesta.json();

                if (respuesta.ok) {
                    const nuevoUsuario = {
                        id: datos.idUsuario,
                        nombre: nombre,
                        email: email,
                        rol: 'cliente'
                    };

                    localStorage.setItem('usuario_tienda', JSON.stringify(nuevoUsuario));
                    cargarFavoritosDesdeBD();

                    formRegistro.reset();
                    if (modalLogin) modalLogin.classList.remove('activo');
                    alert(`¡Cuenta creada con éxito! Bienvenida/o, ${nombre}.`);
                    window.location.reload();
                } else {
                    alert(`No se pudo registrar: ${datos.error}`);
                }
            } catch (error) {
                alert("Error al conectar con el servidor para registrar la cuenta.");
            }
        });
    }

    // --- MODAL CARRITO ---
    const modalCarritoLocal = document.getElementById('modal-carrito');
    const botonCerrarModal = document.getElementById('btn-cerrar-modal');
    const btnFinalizarCompra = document.getElementById('btn-finalizar-compra');
    const btnSeguirComprando = document.getElementById('btn-cerrar-modal-secundario');

    // Usamos delegación para el botón de abrir carrito del header (que viene de un fetch)
    document.addEventListener('click', (e) => {
        const botonAbrirCarrito = e.target.closest('.carrito');
        if (botonAbrirCarrito) {
            window.location.href = 'carrito.html';
        }
    });

    if (btnSeguirComprando && modalCarritoLocal) {
        btnSeguirComprando.addEventListener('click', () => {
            modalCarritoLocal.classList.remove('activo');
        });
    }

    if (botonCerrarModal && modalCarritoLocal) {
        botonCerrarModal.addEventListener('click', () => {
            modalCarritoLocal.classList.remove('activo');
            const avisoStock = document.getElementById('aviso-stock-recuperado');
            if (avisoStock) avisoStock.remove();
        });
    }

    if (modalCarritoLocal) {
        modalCarritoLocal.addEventListener('click', (e) => {
            if (e.target === modalCarritoLocal) {
                modalCarritoLocal.classList.remove('activo');
                const avisoStock = document.getElementById('aviso-stock-recuperado');
                if (avisoStock) avisoStock.remove();
            }
        });
    }

    if (btnFinalizarCompra) {
        btnFinalizarCompra.addEventListener('click', () => {
            window.location.href = 'carrito.html';
        });
    }
}


// ====================================================================
// CONFIGURACIÓN WEB DE ADMIN Y CARGA GLOBAL AL INICIAR
// ====================================================================
document.addEventListener('DOMContentLoaded', async () => {
    await inicializarModales();
    await inicializarHeader();
    await cargarHeroSliderDinamico();
    await cargarBannerPaginaEspecifica();
    await inicializarFooter();

    await cargarBaseDeDatos();
    actualizarCarrito();
    actualizarContadorHeader();
    await cargarFavoritosDesdeBD();

    // Filtro por categoría desde URL si aplica
    const parametrosUrl = new URLSearchParams(window.location.search);
    const categoriaUrl = parametrosUrl.get('categoria');
    if (categoriaUrl) {
        filtrarPorCategoria(categoriaUrl);
    }

    // Modal de carrito recuperado
    if (sessionStorage.getItem('abrir_carrito_recuperado') === 'true') {
        sessionStorage.removeItem('abrir_carrito_recuperado');

        if (modalCarrito) {
            modalCarrito.classList.add('activo');
        }

        const cantSinStock = sessionStorage.getItem('aviso_stock_faltante');
        if (cantSinStock) {
            sessionStorage.removeItem('aviso_stock_faltante');

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

    // Petición de configuración web global
    try {
        const res = await fetch(`${API_URL}/api/configuracion`);
        if (res.ok) {
            const config = await res.json();

            if (config.whatsapp) {
                const footerWsp = document.getElementById('footer-wsp');
                const linkWsp = document.getElementById('link-footer-wsp');
                const btnWspFlotante = document.getElementById('btn-whatsapp-flotante');

                if (footerWsp) footerWsp.textContent = config.whatsapp;
                const numeroLimpio = config.whatsapp.replace(/\D/g, '');
                const urlWsp = `https://wa.me/${numeroLimpio}?text=%C2%A1Hola!%20Quer%C3%ADa%20hacer%20una%20consulta%20sobre%20las%20prendas%20de%20la%20tienda...`;

                if (linkWsp) linkWsp.href = `https://wa.me/${numeroLimpio}`;
                if (btnWspFlotante) btnWspFlotante.href = urlWsp;

                const contactoWspText = document.getElementById('contacto-wsp-text');
                const contactoWspLink = document.getElementById('contacto-wsp-link');
                const contactoTelText = document.getElementById('contacto-tel-text');
                const contactoTelLink = document.getElementById('contacto-tel-link');

                if (contactoWspText) contactoWspText.textContent = config.whatsapp;
                if (contactoWspLink) contactoWspLink.href = `https://wa.me/${numeroLimpio}?text=%C2%A1Hola!%20Quer%C3%ADa%20hacer%20una%20consulta...`;
                if (contactoTelText) contactoTelText.textContent = config.whatsapp;
                if (contactoTelLink) contactoTelLink.href = `tel:+${numeroLimpio}`;
            }

            if (config.email_contacto) {
                const footerEmail = document.getElementById('footer-email');
                const linkEmail = document.getElementById('link-footer-email');
                if (footerEmail) footerEmail.textContent = config.email_contacto;
                if (linkEmail) linkEmail.href = `mailto:${config.email_contacto}`;

                const contactoEmailText = document.getElementById('contacto-email-text');
                const contactoEmailLink = document.getElementById('contacto-email-link');
                if (contactoEmailText) contactoEmailText.textContent = config.email_contacto;
                if (contactoEmailLink) contactoEmailLink.href = `mailto:${config.email_contacto}`;
            }

            if (config.instagram) {
                const footerIg = document.getElementById('footer-ig');
                const linkIg = document.getElementById('link-footer-ig');
                if (footerIg) footerIg.textContent = config.instagram;
                const usuarioIg = config.instagram.replace('@', '').trim();
                if (linkIg) linkIg.href = `https://instagram.com/${usuarioIg}`;
            }

            if (config.tiktok) {
                const footerTk = document.getElementById('footer-tk');
                const linkTk = document.getElementById('link-footer-tk');
                if (footerTk) footerTk.textContent = config.tiktok;
                const usuarioTk = config.tiktok.replace('@', '').trim();
                if (linkTk) linkTk.href = `https://tiktok.com/@${usuarioTk}`;
            }

            if (config.color_principal) {
                document.documentElement.style.setProperty('--color-principal', config.color_principal);
            }

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
                            <div class="cinta-texto">${spansHtml}     ${spansHtml}</div>
                            <div class="cinta-texto">${spansHtml}     ${spansHtml}</div>
                        `;
                    }
                }
            }

            if (config.ubicacion) {
                const ubicacionText = document.getElementById('contacto-ubicacion-text');
                const mapaLink = document.getElementById('contacto-mapa-link');

                if (ubicacionText) ubicacionText.textContent = config.ubicacion;
                if (mapaLink) {
                    const queryMap = encodeURIComponent(config.ubicacion);
                    mapaLink.href = `https://www.google.com/maps/search/?api=1&query=${queryMap}`;
                }
            }
        }
    } catch (err) {
        console.error("Error al cargar la configuración global:", err);
    }
});