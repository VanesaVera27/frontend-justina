// ====================================================================
// CARGAR Y DIBUJAR SOLO LAS OFERTAS
// ====================================================================
const grillaOfertas = document.getElementById('grilla-ofertas');

async function cargarOfertas() {
    if (!grillaOfertas) return;

    try {
        // 1. Usamos la ruta principal que ya trae el stock y las variantes completas
        const respuesta = await fetch('http://localhost:3000/api/productos');
        const todosLosProductos = await respuesta.json();

        // 2. Filtramos mágicamente solo los que tienen la etiqueta en_oferta
        const productosEnOferta = todosLosProductos.filter(prod => prod.en_oferta === true);

        grillaOfertas.innerHTML = '';

        if (productosEnOferta.length === 0) {
            grillaOfertas.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem;">
                    <h3 style="color: #5a3d28; font-family: 'Abril Fatface', serif;">Por el momento no hay ofertas activas</h3>
                    <p style="color: #88786b; margin-bottom: 2rem;">Mantenete atenta a nuestras redes para enterarte de los próximos descuentos.</p>
                    <a href="index.html" class="btn-comprar" style="text-decoration:none; padding: 0.8rem 2rem;">Ver Nueva Colección</a>
                </div>`;
            return;
        }

        productosEnOferta.forEach(prod => {
            const card = document.createElement('div');
            card.classList.add('card-producto');

            // 1. Manejo de fotos
            const fotos = (prod.imagenes && prod.imagenes.length > 0) ? prod.imagenes : (Array.isArray(prod.fotos) ? prod.fotos : [prod.imagen]);
            const fotoPrincipal = fotos ? fotos[0] : '';
            const tieneMasDeUnaFoto = fotos && fotos.length > 1;

            // 2. LÓGICA COMPLETA DE STOCK (Igual a la de script.js)
            let opcionesTalles = '';
            let opcionesColores = '';
            let sinStock = false;

            if (Array.isArray(prod.variantes) && prod.variantes.length > 0) {
                const variantesConStock = prod.variantes.filter(v => {
                    // Contamos lo que ya está en el carrito (asumiendo que 'carrito' es global)
                    const cantEnCarrito = (typeof carrito !== 'undefined' ? carrito : []).filter(item => 
                        item.id === prod.id && item.talleElegido === v.talle && item.colorElegido === v.color
                    ).length;
                    return (Number(v.stock) - cantEnCarrito) > 0;
                });

                if (variantesConStock.length > 0) {
                    const tallesUnicos = [...new Set(variantesConStock.map(v => v.talle))];
                    tallesUnicos.forEach(t => opcionesTalles += `<option value="${t}">${t}</option>`);

                    const primerTalle = tallesUnicos[0];
                    const coloresDelPrimerTalle = [...new Set(variantesConStock.filter(v => v.talle === primerTalle).map(v => v.color))];
                    coloresDelPrimerTalle.forEach(c => opcionesColores += `<option value="${c}">${c}</option>`);
                } else {
                    sinStock = true;
                    opcionesTalles = `<option disabled selected>Agotado</option>`;
                    opcionesColores = `<option disabled selected>Agotado</option>`;
                }
            } else {
                // Lógica de respaldo si el producto usa stock general sin variantes
                const cantEnCarrito = (typeof carrito !== 'undefined' ? carrito : []).filter(item => item.id === prod.id).length;
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

            // 3. Detalles estéticos (Cartel agotado y Favoritos)
            const htmlCartelAgotado = sinStock ? `<div class="cartel-sin-stock">Agotado</div>` : '';
            const claseImgAgotada = sinStock ? 'img-agotada' : '';
            const esFavorito = typeof favoritos !== 'undefined' && favoritos.includes(prod.id);

// =======================================================
            // LÓGICA DE PRECIOS, DESCUENTOS Y CUOTAS
            // =======================================================
            const precioNumerico = Number(prod.precio);
            const porcentajeDescuento = Number(prod.descuento || 20); // 20% por defecto
            
            let htmlPrecio = '';
            let htmlBadgeOferta = '';
            let htmlLabelSale = '';
            let precioParaCalculo = precioNumerico;

            if (prod.en_oferta) {
                // Si está en oferta, calculamos el precio nuevo
                precioParaCalculo = precioNumerico - (precioNumerico * (porcentajeDescuento / 100));
                
                htmlBadgeOferta = `<div class="badge-descuento">${porcentajeDescuento}% OFF</div>`;
                htmlLabelSale = `<span class="etiqueta-sale">SALE</span>`;
                
                htmlPrecio = `
                    <div class="precio-oferta-container">
                        <span class="precio-original">$${precioNumerico.toLocaleString()}</span>
                        <span class="precio-final">$${precioParaCalculo.toLocaleString()}</span>
                    </div>
                `;
            } else {
                // Si es un producto normal
                htmlPrecio = `<p class="precio" style="margin-bottom: 0.2rem;">$${precioNumerico.toLocaleString()}</p>`;
            }

            // Calculamos 3 cuotas sobre el precio final (sea el de oferta o el normal)
            const valorCuota = (precioParaCalculo / 3).toLocaleString();
            const htmlCuotas = `<small class="texto-cuotas">3 cuotas de $${valorCuota}</small>`;

            // =======================================================
            // ARMADO DEL HTML DE LA TARJETA
            // =======================================================
            card.innerHTML = `
                <div class="carrusel-card ${tieneMasDeUnaFoto ? '' : 'sin-flechas'}">
                    ${htmlCartelAgotado}
                    ${htmlBadgeOferta}
                    
                    <button type="button" class="btn-favorito ${esFavorito ? 'liked' : ''}" onclick="toggleFavorito(${prod.id}, this)">
                        <svg viewBox="0 0 24 24" class="icono-corazon"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    </button>
                    

                    <!-- ADENTRO DEL ARMADO DE TU TARJETA EN SCRIPT.JS -->
                    <a href="producto.html?id=${prod.id}">
                        <img src="${fotos[0]}" alt="${prod.nombre}" id="img-card-${prod.id}">
                    </a>
                    
                    <!-- AGREGAMOS LOS BOTONES DEL CARRUSEL -->
                    <button class="btn-flecha prev" onclick="cambiarImagenCard(${prod.id}, -1)" title="Anterior">◄</button>
                    <button class="btn-flecha next" onclick="cambiarImagenCard(${prod.id}, 1)" title="Siguiente">►</button>
                </div>
                
                ${htmlLabelSale}
                <h3 style="margin-top: ${prod.en_oferta ? '0' : '0.5rem'};">${prod.nombre}</h3>
                
                ${htmlPrecio}
                ${htmlCuotas}
                
                <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem; width: 100%;">
                    <div style="flex: 1;">
                        <label style="font-size: 0.75rem; color: #666; display: block;">Talle:</label>
                        <select class="select-talle" id="talle-${prod.id}" style="width: 100%; padding: 0.4rem;" ${sinStock ? 'disabled' : ''}>${opcionesTalles}</select>
                    </div>
                    <div style="flex: 1;">
                        <label style="font-size: 0.75rem; color: #666; display: block;">Color:</label>
                        <select class="select-color" id="color-${prod.id}" style="width: 100%; padding: 0.4rem;" ${sinStock ? 'disabled' : ''}>${opcionesColores}</select>
                    </div>
                </div>

                <button class="btn-comprar" onclick="agregarAlCarrito(${prod.id})" ${sinStock ? 'disabled style="background:#ccc; cursor:not-allowed;"' : ''}>
                    ${sinStock ? 'Agotado' : '🛒 Agregar al carrito'}
                </button>
            `;
            grillaOfertas.appendChild(card);
        });

    } catch (error) {
        grillaOfertas.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:red;">No se pudieron cargar las ofertas.</p>';
    }
}

// Arrancamos
cargarOfertas();