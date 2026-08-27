// ====================================================================
// LÓGICA DE LA VISTA EN DETALLE
// ====================================================================

let productoActual = null;

async function cargarDetalleProducto() {
    // 1. Obtenemos el ID de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const idProducto = urlParams.get('id');

    if (!idProducto) {
        window.location.href = 'index.html'; // Si no hay ID, lo mandamos al inicio
        return;
    }

    try {
        const respuesta = await fetch('http://localhost:3000/api/productos');
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
        // Estructura avanzada: Miniaturas opacas, flechas laterales y contenedor con efecto zoom
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
        window.indiceFotoActual = 0; // Guardamos el índice actual
    } else {
        contenedorGaleria.innerHTML = `<img src="${fotos[0]}" alt="${prod.nombre}" style="width: 100%; border-radius: 6px; object-fit: cover; max-height: 560px;">`;
    }
    // Textos base
    document.getElementById('detalle-categoria').textContent = `MUJER / ${prod.categoria || 'PRENDA'}`;
    document.getElementById('detalle-titulo').textContent = prod.nombre;

    // =======================================================
    // MAGIA DEL BOTÓN DE FAVORITOS
    // =======================================================
    const btnFav = document.getElementById('btn-fav-detalle');
    const esFavorito = typeof favoritos !== 'undefined' && favoritos.includes(prod.id);

    // Le inyectamos el SVG del corazón
    btnFav.innerHTML = `<svg viewBox="0 0 24 24" class="icono-corazon"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;

    // Si ya era favorito, le ponemos la clase roja
    if (esFavorito) {
        btnFav.classList.add('liked');
    }

    // Le damos vida al botón reutilizando tu función global
    btnFav.onclick = () => {
        toggleFavorito(prod.id, btnFav);
    };
    // =======================================================

    // Verificamos que tenga descripción y no esté vacía
    if (prod.descripcion && prod.descripcion.trim() !== '') {
        // Reemplazamos los "Enters" invisibles (\n) por saltos de línea reales de HTML (<br>)
        const textoFormateado = prod.descripcion.replace(/\n/g, '<br>');
        document.getElementById('detalle-descripcion').innerHTML = textoFormateado;
    } else {
        // Mensaje por defecto si la prenda no tiene descripción escrita
        document.getElementById('detalle-descripcion').innerHTML = 'Sin descripción adicional.';
    }

    // Etiquetas y Precio
    const precioNumerico = Number(prod.precio);
    const porcentajeDescuento = Number(prod.descuento || 20);
    let htmlPrecios = '';

    if (prod.en_oferta) {
        const precioRebajado = precioNumerico - (precioNumerico * (porcentajeDescuento / 100));
        document.getElementById('detalle-etiquetas').innerHTML = `<span class="etiqueta-sale" style="display:inline-block; margin-right:10px;">SALE</span> <span style="color:#c53030; font-weight:bold; font-size:0.85rem;">${porcentajeDescuento}% OFF</span>`;

        htmlPrecios = `
            <div class="precio-oferta-container">
                <span class="precio-original">$${precioNumerico.toLocaleString()}</span>
                <span class="precio-final">$${precioRebajado.toLocaleString()}</span>
            </div>
            <small class="texto-cuotas">3 cuotas sin interés de $${(precioRebajado / 3).toLocaleString()}</small>
        `;
    } else {
        htmlPrecios = `
            <div class="precio-final" style="margin-bottom:0.5rem;">$${precioNumerico.toLocaleString()}</div>
            <small class="texto-cuotas">3 cuotas sin interés de $${(precioNumerico / 3).toLocaleString()}</small>
        `;
    }
    document.getElementById('detalle-precios').innerHTML = htmlPrecios;

    // Variantes (Selectores)
    const selectColor = document.getElementById('detalle-select-color');
    const selectTalle = document.getElementById('detalle-select-talle');

    if (Array.isArray(prod.variantes) && prod.variantes.length > 0) {
        const coloresUnicos = [...new Set(prod.variantes.map(v => v.color))];
        selectColor.innerHTML = coloresUnicos.map(c => `<option value="${c}">${c}</option>`).join('');
        actualizarTallesDetalle(); // Llena los talles según el primer color
    } else {
        selectColor.innerHTML = '<option value="Único">Único</option>';
        selectTalle.innerHTML = '<option value="Único">Único</option>';
    }

    // Botón Comprar
    const btnAgregar = document.getElementById('btn-agregar-detalle');
    btnAgregar.onclick = () => {
        // Aprovechamos tu función de script.js, pasándole los selects de esta pantalla
        const productoParaCarrito = {
            ...prod,
            talleElegido: selectTalle.value,
            colorElegido: selectColor.value,
            precio: prod.en_oferta ? (precioNumerico - (precioNumerico * (porcentajeDescuento / 100))) : precioNumerico
        };
        carrito.push(productoParaCarrito);
        actualizarCarrito();

        // Efecto visual
        btnAgregar.textContent = "¡Agregado!";
        setTimeout(() => btnAgregar.textContent = "Agregar al carrito", 2000);
    };
}

function actualizarTallesDetalle() {
    const colorElegido = document.getElementById('detalle-select-color').value;
    const selectTalle = document.getElementById('detalle-select-talle');

    if (productoActual && Array.isArray(productoActual.variantes)) {
        const variantesDelColor = productoActual.variantes.filter(v => v.color === colorElegido);
        selectTalle.innerHTML = variantesDelColor.map(v =>
            `<option value="${v.talle}" ${v.stock == 0 ? 'disabled' : ''}>${v.talle} ${v.stock == 0 ? '(Agotado)' : ''}</option>`
        ).join('');
    }
}

// Lógica para los Acordeones (Desplegables)
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

    // Actualizamos las opacidades y bordes de las miniaturas
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
    if (nuevoIndice < 0) nuevoIndice = arrayFotos.length - 1; // Vuelve al final si está en la primera
    if (nuevoIndice >= arrayFotos.length) nuevoIndice = 0;    // Vuelve al inicio si pasa la última
    cambiarFotoPrincipal(nuevoIndice, arrayFotos);
}

// Efecto Zoom al pasar el cursor por el centro de la imagen
function aplicarZoom(e) {
    const contenedor = e.currentTarget;
    const img = document.getElementById('imagen-principal-zoom');

    const rect = contenedor.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / contenedor.offsetWidth) * 100;
    const y = ((e.clientY - rect.top) / contenedor.offsetHeight) * 100;

    img.style.transformOrigin = `${x}% ${y}%`;
    img.style.transform = 'scale(1.8)'; // Escala de zoom (puedes ajustar el 1.8)
}

function quitarZoom(e) {
    const img = document.getElementById('imagen-principal-zoom');
    img.style.transformOrigin = 'center center';
    img.style.transform = 'scale(1)';
}

// Inicializamos
cargarDetalleProducto();