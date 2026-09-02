// ====================================================================
// 1. GUARDIÁN DE SEGURIDAD PARA FAVORITOS
// ====================================================================

// Validar que no sea admin en favoritos.html
const sesionFav = localStorage.getItem('usuario_tienda');
if (sesionFav) {
    const user = JSON.parse(sesionFav);
    if (user.rol === 'admin') {
        alert("⚠️ Los administradores no tienen acceso a la sección de favoritos.");
        window.location.href = 'index.html';
    }
} if (!sesionFav){
   alert("Debés iniciar sesión para ver tu lista de favoritos ❤️");
    window.location.href = 'index.html';
}

const usuarioFav = JSON.parse(sesionFav);
const grillaFavoritos = document.getElementById('grilla-favoritos');
let listaFavoritosIds = [];
let catalogoCompleto = [];

// ====================================================================
// 2. CARGAR Y DIBUJAR FAVORITOS
// ====================================================================
async function inicializarFavoritos() {
    try {
        // A. Traemos todos los productos de la tienda
        const resProductos = await fetch(`${API_URL}/api/productos`);
        catalogoCompleto = await resProductos.json();

        // B. Traemos solo los IDs que esta clienta guardó como favoritos
        const resFavs = await fetch(`${API_URL}/api/favoritos/${usuarioFav.id}`);
        listaFavoritosIds = await resFavs.json();

        renderizarFavoritos();
    } catch (error) {
        if (grillaFavoritos) grillaFavoritos.innerHTML = '<p style="color:red; grid-column: 1/-1; text-align:center;">Error al cargar tus favoritos.</p>';
    }
}

function renderizarFavoritos() {
    if (!grillaFavoritos) return;
    grillaFavoritos.innerHTML = '';

    // Filtramos el catálogo para quedarnos SOLO con los que están en la lista del usuario
    const productosFavoritos = catalogoCompleto.filter(prod => listaFavoritosIds.includes(prod.id));

    if (productosFavoritos.length === 0) {
        grillaFavoritos.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem;">
                <h3 style="color: #5a3d28; font-family: 'Abril Fatface', serif;">Aún no tenés prendas guardadas</h3>
                <p style="color: #88786b; margin-bottom: 2rem;">Explorá nuestra colección y guardá tus looks favoritos para más adelante.</p>
                <a href="index.html" class="btn-comprar" style="text-decoration:none; padding: 0.8rem 2rem;">Ver Colección</a>
            </div>`;
        return;
    }

    productosFavoritos.forEach(prod => {
        const card = document.createElement('div');
        card.classList.add('card-producto');

        const fotos = (prod.imagenes && prod.imagenes.length > 0) ? prod.imagenes : [prod.imagen];
        const tieneMasDeUnaFoto = fotos.length > 1;

        // LÓGICA DE STOCK (Idéntica a la tienda principal)
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
            sinStock = true; // Si no tiene variantes declaradas, por seguridad lo marcamos sin stock
            opcionesTalles = `<option disabled selected>Agotado</option>`;
            opcionesColores = `<option disabled selected>Agotado</option>`;
        }

        card.innerHTML = `
            <div class="carrusel-card ${tieneMasDeUnaFoto ? '' : 'sin-flechas'}">
                <img src="${fotos[0]}" alt="${prod.nombre}" id="img-card-fav-${prod.id}">
            </div>

            <h3>${prod.nombre}</h3>
            <p class="precio">$${Number(prod.precio).toLocaleString()}</p>
            
            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem; width: 100%;">
                <div style="flex: 1;">
                    <label style="font-size: 0.75rem; color: #666; display: block;">Talle:</label>
                    <select class="select-talle" id="talle-${prod.id}" style="width: 100%; padding: 0.4rem;" ${sinStock ? 'disabled' : ''}>
                        ${opcionesTalles}
                    </select>
                </div>
                <div style="flex: 1;">
                    <label style="font-size: 0.75rem; color: #666; display: block;">Color:</label>
                    <select class="select-color" id="color-${prod.id}" style="width: 100%; padding: 0.4rem;" ${sinStock ? 'disabled' : ''}>
                        ${opcionesColores}
                    </select>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">
                <button class="btn-comprar" onclick="agregarAlCarrito(${prod.id})" ${sinStock ? 'disabled style="background:#ccc; cursor:not-allowed; color:#666;"' : ''}>
                    ${sinStock ? 'Agotado' : '🛒 Agregar al carrito'}
                </button>
                <button type="button" onclick="quitarDeFavoritos(${prod.id})" style="background: transparent; border: 1px solid #d8cec4; color: #c53030; padding: 0.6rem; border-radius: 4px; font-weight: bold; cursor: pointer; transition: background 0.2s;">
                    ❌ Quitar de Favoritos
                </button>
            </div>
        `;
        grillaFavoritos.appendChild(card);
    });
}

// ====================================================================
// 3. FUNCIÓN PARA ELIMINAR DIRECTO DESDE ESTA PANTALLA
// ====================================================================
async function quitarDeFavoritos(idProducto) {
    try {
        const res = await fetch(`${API_URL}/api/favoritos/${usuarioFav.id}/${idProducto}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            // Actualizamos la lista local y redibujamos la grilla
            listaFavoritosIds = listaFavoritosIds.filter(id => id !== idProducto);
            
            // Reflejamos el cambio en la variable global de script.js por si navega
            if (typeof favoritos !== 'undefined') {
                favoritos = listaFavoritosIds;
                localStorage.setItem('favoritos_tienda', JSON.stringify(favoritos));
            }
            
            renderizarFavoritos();
        }
    } catch (err) {
        alert("Error al quitar el producto de favoritos.");
    }
}

// Arrancamos
inicializarFavoritos();