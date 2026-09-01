
let productoActual = null;

async function cargarDetalleProducto() {
    const urlParams = new URLSearchParams(window.location.search);
    const idProducto = urlParams.get('id');

    if (!idProducto) {
        window.location.href = 'index.html'; 
        return;
    }

    try {
        const respuesta = await fetch('https://justina-store-backend.onrender.com/api/productos');
        const productos = await respuesta.json();

        productoActual = productos.find(p => p.id === parseInt(idProducto));

        if (!productoActual) {
            document.querySelector('.vista-producto-detalle').innerHTML = '<h2>Producto no encontrado</h2>';
            return;
        }

        renderizarDetalles(productoActual);

    } catch (error) {
        console.error("Error al cargar producto:", error);
    }
}

function renderizarDetalles(prod) {
    const fotos = (prod.imagenes && prod.imagenes.length > 0) ? prod.imagenes : [prod.imagen];
    const contenedorGaleria = document.getElementById('detalle-galeria');

    if (fotos.length > 1) {
        contenedorGaleria.innerHTML = `
            <div style="display: flex; gap: 1.5rem; align-items: flex-start; position: relative;">
                
                <!-- 1. Tira vertical de miniaturas (opacas por defecto) -->
                <div style="display: flex; flex-direction: column; gap: 10px; max-height: 520px; overflow-y: auto; scrollbar-width: none;">
                    ${fotos.map((imgUrl, index) => `
                        <img src="${imgUrl}" alt="${prod.nombre}" id="mini-${index}"
                             onclick="cambiarFotoPrincipal(${index}, ${JSON.stringify(fotos).replace(/"/g, '&quot;')})"
                             style="width: 80px; height: 105px; object-fit: cover; border-radius: 4px; cursor: pointer; opacity: ${index === 0 ? '1' : '0.5'}; border: 1.5px solid ${index === 0 ? '#3b2314' : 'transparent'}; transition: all 0.2s;"
                             onmouseover="this.style.opacity='1'" 
                             onmouseout="this.style.opacity = window.indiceFotoActual === ${index} ? '1' : '0.5'">
                    `).join('')}
                </div>

                <!-- 2. Imagen principal con efecto Zoom y flechas laterales -->
                <div id="contenedor-zoom-img" style="flex: 1; position: relative; overflow: hidden; border-radius: 6px; cursor: zoom-in; max-height: 560px;"
                     onmousemove="aplicarZoom(event)" onmouseleave="quitarZoom(event)">
                    
                    <img id="imagen-principal-zoom" src="${fotos[0]}" alt="${prod.nombre}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.1s ease-out; display: block;">

                    <!-- Flecha Izquierda -->
                    <button onclick="cambiarFotoFlecha(-1, ${JSON.stringify(fotos).replace(/"/g, '&quot;')})" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.7); border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.9)'" onmouseout="this.style.background='rgba(255,255,255,0.7)'">❮</button>

                    <!-- Flecha Derecha -->
                    <button onclick="cambiarFotoFlecha(1, ${JSON.stringify(fotos).replace(/"/g, '&quot;')})" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.7); border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.9)'" onmouseout="this.style.background='rgba(255,255,255,0.7)'">❯</button>
                </div>
            </div>
        `;
        window.indiceFotoActual = 0;
    } else {
        contenedorGaleria.innerHTML = `<img src="${fotos[0]}" alt="${prod.nombre}" style="width: 100%; border-radius: 6px; object-fit: cover; max-height: 560px;">`;
    }
    document.getElementById('detalle-categoria').textContent = `MUJER / ${prod.categoria || 'PRENDA'}`;
    document.getElementById('detalle-titulo').textContent = prod.nombre;


    const btnFav = document.getElementById('btn-fav-detalle');
    const esFavorito = typeof favoritos !== 'undefined' && favoritos.includes(prod.id);

    btnFav.innerHTML = `<svg viewBox="0 0 24 24" class="icono-corazon"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;

    if (esFavorito) {
        btnFav.classList.add('liked');
    }

    btnFav.onclick = () => {
        toggleFavorito(prod.id, btnFav);
    };

    if (prod.descripcion && prod.descripcion.trim() !== '') {
        const textoFormateado = prod.descripcion.replace(/\n/g, '<br>');
        document.getElementById('detalle-descripcion').innerHTML = textoFormateado;
    } else {
        document.getElementById('detalle-descripcion').innerHTML = 'Sin descripción adicional.';
    }

    const precioNumerico = Number(prod.precio);
    const porcentajeDescuento = Number(prod.descuento || 20);
    let htmlPrecios = '';

    let htmlAlertaStock = `
        <div id="detalle-alerta-stock" style="display: none; background: #fff3cd; color: #856404; font-size: 0.8rem; font-weight: bold; padding: 0.3rem 0.6rem; border-radius: 4px; margin-bottom: 0.5rem; text-align: center; border: 1px solid #ffeeba;">
            🔥 ¡Última unidad disponible!
        </div>
    `;

    if (prod.en_oferta) {
        const precioRebajado = precioNumerico - (precioNumerico * (porcentajeDescuento / 100));
        document.getElementById('detalle-etiquetas').innerHTML = `<span class="etiqueta-sale" style="display:inline-block; margin-right:10px;">SALE</span> <span style="color:#c53030; font-weight:bold; font-size:0.85rem;">${porcentajeDescuento}% OFF</span>`;

        htmlPrecios = `
            ${htmlAlertaStock}
            <div class="precio-oferta-container">
                <span class="precio-original">$${precioNumerico.toLocaleString()}</span>
                <span class="precio-final">$${precioRebajado.toLocaleString()}</span>
            </div>
            <small class="texto-cuotas">3 cuotas sin interés de $${(precioRebajado / 3).toLocaleString()}</small>
        `;
    } else {
        htmlPrecios = `
            ${htmlAlertaStock}
            <div class="precio-final" style="margin-bottom:0.5rem;">$${precioNumerico.toLocaleString()}</div>
            <small class="texto-cuotas">3 cuotas sin interés de $${(precioNumerico / 3).toLocaleString()}</small>
        `;
    }
    document.getElementById('detalle-precios').innerHTML = htmlPrecios;

    const selectColor = document.getElementById('detalle-select-color');
    const selectTalle = document.getElementById('detalle-select-talle');

    if (Array.isArray(prod.variantes) && prod.variantes.length > 0) {
        const carritoActual = JSON.parse(localStorage.getItem('carrito_justina')) || [];

        const coloresConEstado = [...new Set(prod.variantes.map(v => v.color))].map(color => {
            const variantesDelColor = prod.variantes.filter(v => v.color === color);

            const stockTotalColor = variantesDelColor.reduce((acc, v) => {
                const cantEnCarrito = carritoActual
                    .filter(item => item.id === prod.id && item.talleElegido === v.talle && item.colorElegido === v.color)
                    .reduce((subAcc, item) => subAcc + (item.cantidad || 1), 0);
                return acc + Math.max(0, Number(v.stock) - cantEnCarrito);
            }, 0);

            return {
                color: color,
                sinStock: stockTotalColor <= 0
            };
        });

        selectColor.innerHTML = coloresConEstado.map(c =>
            `<option value="${c.color}">${c.color} ${c.sinStock ? '(Agotado)' : ''}</option>`
        ).join('');

        const primerColorConStock = coloresConEstado.find(c => !c.sinStock);
        if (primerColorConStock) {
            selectColor.value = primerColorConStock.color;
        }

        actualizarTallesDetalle();
    } else {
        selectColor.innerHTML = '<option value="Único">Único</option>';
        selectTalle.innerHTML = '<option value="Único">Único</option>';
    }

    const sesionDetalle = localStorage.getItem('usuario_tienda');
    let esAdminDetalle = false;
    if (sesionDetalle) {
        try {
            esAdminDetalle = JSON.parse(sesionDetalle).rol === 'admin';
        } catch (e) { }
    }
    if (esAdminDetalle) {
        if (btnFav) btnFav.style.display = 'none';
    } else {
        const esFavorito = typeof favoritos !== 'undefined' && favoritos.includes(prod.id);
        btnFav.innerHTML = `<svg viewBox="0 0 24 24" class="icono-corazon"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
        if (esFavorito) {
            btnFav.classList.add('liked');
        }
        btnFav.onclick = () => {
            toggleFavorito(prod.id, btnFav);
        };
    }

    const btnAgregar = document.getElementById('btn-agregar-detalle');
    if (esAdminDetalle) {
        if (btnAgregar) {
            btnAgregar.style.background = '#e9ecef';
            btnAgregar.style.color = '#6c757d';
            btnAgregar.style.cursor = 'not-allowed';
            btnAgregar.textContent = "Modo Administrador (Compra deshabilitada)";
            btnAgregar.onclick = (e) => e.preventDefault();
        }
    } else {
        btnAgregar.onclick = () => {
            const talleSeleccionado = selectTalle.value;
            const colorSeleccionado = selectColor.value;

            let stockDisponible = 1;
            if (Array.isArray(prod.variantes) && prod.variantes.length > 0) {
                const varianteElegida = prod.variantes.find(v =>
                    v.talle === talleSeleccionado && v.color === colorSeleccionado
                );
                if (varianteElegida) {
                    stockDisponible = Number(varianteElegida.stock);
                }
            } else if (prod.stock !== undefined) {
                stockDisponible = Number(prod.stock);
            }

            let carritoActual = JSON.parse(localStorage.getItem('carrito_justina')) || [];

            if (typeof carrito !== 'undefined') {
                carrito = carritoActual;
            }

            const cantidadEnCarrito = carritoActual
                .filter(item => item.id === prod.id && item.talleElegido === talleSeleccionado && item.colorElegido === colorSeleccionado)
                .reduce((acc, item) => acc + (item.cantidad || 1), 0);

            if (cantidadEnCarrito >= stockDisponible) {
                alert(`¡Ups! Solo tenemos ${stockDisponible} unidad(es) disponible(s) en talle ${talleSeleccionado} y color ${colorSeleccionado}.`);
                return;
            }

            const precioReal = prod.en_oferta ? (precioNumerico - (precioNumerico * (porcentajeDescuento / 100))) : precioNumerico;

            let indexExistente = carritoActual.findIndex(item =>
                item.id === prod.id && item.talleElegido === talleSeleccionado && item.colorElegido === colorSeleccionado
            );

            if (indexExistente !== -1) {
                carritoActual[indexExistente].cantidad = (carritoActual[indexExistente].cantidad || 1) + 1;
            } else {
                const productoParaCarrito = {
                    ...prod,
                    talleElegido: talleSeleccionado,
                    colorElegido: colorSeleccionado,
                    precio: precioReal,
                    cantidad: 1
                };
                carritoActual.push(productoParaCarrito);
            }

            localStorage.setItem('carrito_justina', JSON.stringify(carritoActual));

            if (typeof carrito !== 'undefined') {
                carrito = carritoActual;
            }

            if (typeof actualizarCarrito === 'function') {
                actualizarCarrito();
            }
            if (typeof actualizarContadorHeader === 'function') {
                actualizarContadorHeader();
            }

            const modalCarrito = document.getElementById('modal-carrito');
            if (modalCarrito) {
                modalCarrito.classList.add('activo');
            }

            actualizarTallesDetalle();
        };
    }
}

function actualizarTallesDetalle() {
    if (!productoActual || !Array.isArray(productoActual.variantes)) return;

    const selectColor = document.getElementById('detalle-select-color');
    const selectTalle = document.getElementById('detalle-select-talle');
    if (!selectColor || !selectTalle) return;

    const sesionDetalle = localStorage.getItem('usuario_tienda');
    let esAdminDetalle = false;
    if (sesionDetalle) {
        try {
            esAdminDetalle = JSON.parse(sesionDetalle).rol === 'admin';
        } catch (e) { }
    }

    const carritoActual = JSON.parse(localStorage.getItem('carrito_justina')) || [];
    const colorSeleccionadoActual = selectColor.value; 

    const coloresConEstado = [...new Set(productoActual.variantes.map(v => v.color))].map(color => {
        const variantesDelColor = productoActual.variantes.filter(v => v.color === color);
        
        const stockTotalColor = variantesDelColor.reduce((acc, v) => {
            const cantEnCarrito = carritoActual
                .filter(item => item.id === productoActual.id && item.talleElegido === v.talle && item.colorElegido === v.color)
                .reduce((subAcc, item) => subAcc + (item.cantidad || 1), 0);
            return acc + Math.max(0, Number(v.stock) - cantEnCarrito);
        }, 0);

        return {
            color: color,
            sinStock: stockTotalColor <= 0
        };
    });

    selectColor.innerHTML = coloresConEstado.map(c => 
        `<option value="${c.color}" ${c.color === colorSeleccionadoActual ? 'selected' : ''}>${c.color} ${c.sinStock ? '(Agotado)' : ''}</option>`
    ).join('');

    if (selectColor.selectedOptions[0]?.disabled || selectColor.value === '') {
        const primerColorConStock = coloresConEstado.find(c => !c.sinStock);
        if (primerColorConStock) {
            selectColor.value = primerColorConStock.color;
        }
    }

    const colorElegidoFinal = selectColor.value;
    const variantesDelColor = productoActual.variantes.filter(v => v.color === colorElegidoFinal);

    selectTalle.innerHTML = variantesDelColor.map(v => {
        const cantEnCarrito = carritoActual
            .filter(item => item.id === productoActual.id && item.talleElegido === v.talle && item.colorElegido === v.color)
            .reduce((acc, item) => acc + (item.cantidad || 1), 0);

        const stockRestante = Number(v.stock) - cantEnCarrito;
        const agotar = stockRestante <= 0;

        return `<option value="${v.talle}" ${agotar ? 'disabled' : ''}>${v.talle} ${agotar ? '(Agotado)' : ''}</option>`;
    }).join('');

    if (typeof verificarUltimaUnidadDetalle === 'function') {
        verificarUltimaUnidadDetalle();
    }

    const btnAgregar = document.getElementById('btn-agregar-detalle');
    if (btnAgregar && !esAdminDetalle) {
        const talleElegido = selectTalle.value;
        const colorElegido = selectColor.value;
        
        let stockActualVariante = 0;
        const varianteSeleccionada = productoActual.variantes.find(v => v.talle === talleElegido && v.color === colorElegido);
        
        if (varianteSeleccionada) {
            const cantEnCarrito = carritoActual
                .filter(item => item.id === productoActual.id && item.talleElegido === talleElegido && item.colorElegido === colorElegido)
                .reduce((acc, item) => acc + (item.cantidad || 1), 0);
            
            stockActualVariante = Number(varianteSeleccionada.stock) - cantEnCarrito;
        }

        if (stockActualVariante <= 0 || selectTalle.disabled || selectTalle.value === "") {
            btnAgregar.disabled = true;
            btnAgregar.style.background = '#ccc';
            btnAgregar.style.cursor = 'not-allowed';
            btnAgregar.textContent = "Agotado";
        } else {
            btnAgregar.disabled = false;
            btnAgregar.style.background = ''; 
            btnAgregar.style.cursor = 'pointer';
            btnAgregar.textContent = "Agregar al carrito";
        }
    }
}

// Lógica para los Desplegables
document.querySelectorAll('.acordeon-titulo').forEach(boton => {
    boton.addEventListener('click', () => {
        const contenido = boton.nextElementSibling;
        contenido.classList.toggle('abierto');
        boton.querySelector('span:last-child').textContent = contenido.classList.contains('abierto') ? '-' : '+';
    });
});

// Variable global para controlar qué foto se está viendo
window.indiceFotoActual = 0;

function cambiarFotoPrincipal(index, arrayFotos) {
    window.indiceFotoActual = index;
    const imgPrincipal = document.getElementById('imagen-principal-zoom');
    if (imgPrincipal) imgPrincipal.src = arrayFotos[index];

    arrayFotos.forEach((_, i) => {
        const mini = document.getElementById(`mini-${i}`);
        if (mini) {
            if (i === index) {
                mini.style.opacity = '1';
                mini.style.borderColor = '#3b2314';
            } else {
                mini.style.opacity = '0.5';
                mini.style.borderColor = 'transparent';
            }
        }
    });
}

function cambiarFotoFlecha(direccion, arrayFotos) {
    let nuevoIndice = window.indiceFotoActual + direccion;
    if (nuevoIndice < 0) nuevoIndice = arrayFotos.length - 1;
    if (nuevoIndice >= arrayFotos.length) nuevoIndice = 0;
    cambiarFotoPrincipal(nuevoIndice, arrayFotos);
}

function aplicarZoom(e) {
    const contenedor = e.currentTarget;
    const img = document.getElementById('imagen-principal-zoom');

    const rect = contenedor.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / contenedor.offsetWidth) * 100;
    const y = ((e.clientY - rect.top) / contenedor.offsetHeight) * 100;

    img.style.transformOrigin = `${x}% ${y}%`;
    img.style.transform = 'scale(1.8)';
}

function quitarZoom(e) {
    const img = document.getElementById('imagen-principal-zoom');
    img.style.transformOrigin = 'center center';
    img.style.transform = 'scale(1)';
}

function verificarUltimaUnidadDetalle() {
    if (!productoActual) return;

    const selectTalle = document.getElementById('detalle-select-talle');
    const selectColor = document.getElementById('detalle-select-color');
    const cartelAlerta = document.getElementById('detalle-alerta-stock');

    if (!cartelAlerta || !selectTalle || !selectColor) return;

    const talleElegido = selectTalle.value;
    const colorElegido = selectColor.value;

    let stockReal = 0;
    const carritoActual = JSON.parse(localStorage.getItem('carrito_justina')) || [];

    if (Array.isArray(productoActual.variantes) && productoActual.variantes.length > 0) {
        const varianteElegida = productoActual.variantes.find(v =>
            v.talle === talleElegido && v.color === colorElegido
        );
        if (varianteElegida) {
            const cantEnCarrito = carritoActual
                .filter(item => item.id === productoActual.id && item.talleElegido === talleElegido && item.colorElegido === colorElegido)
                .reduce((acc, item) => acc + (item.cantidad || 1), 0);

            stockReal = Number(varianteElegida.stock) - cantEnCarrito;
        }
    } else if (productoActual.stock !== undefined) {
        const cantEnCarrito = carritoActual
            .filter(item => item.id === productoActual.id)
            .reduce((acc, item) => acc + (item.cantidad || 1), 0);

        stockReal = Number(productoActual.stock) - cantEnCarrito;
    }

    if (stockReal === 1) {
        cartelAlerta.style.display = 'block';
    } else {
        cartelAlerta.style.display = 'none';
    }
}

// Inicializamos
cargarDetalleProducto();

document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'detalle-select-color') {
        actualizarTallesDetalle(); 
    } else if (e.target && e.target.id === 'detalle-select-talle') {
        verificarUltimaUnidadDetalle(); 
    }
});