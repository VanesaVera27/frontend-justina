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



// 1. CARGAR BASE DE DATOS DESDE EL SERVIDOR BACKEND (NODE.JS + SQLITE)
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

// Mostrar las tarjetas de productos
function mostrarProductosEnPantalla(listaProductos) {
    if (!grilla) return;
    grilla.innerHTML = '';
    
    listaProductos.forEach(prod => {
        const card = document.createElement('div');
        card.classList.add('card-producto');
        
        // =========================================================================
        // --- SOLUCIÓN: Nos aseguramos de tener una lista válida de talles ---
        // =========================================================================
        let listaTalles = ["S", "M", "L", "XL"]; // Talles por defecto si no vienen definidos
        
        if (Array.isArray(prod.talles)) {
            listaTalles = prod.talles; // Si es un array real (ej. de un JSON), lo usamos
        } else if (typeof prod.talles === 'string') {
            // Si viene de SQL como un texto "S, M, L", lo separamos por las comas
            listaTalles = prod.talles.split(',').map(t => t.trim());
        }

        // Ahora sí, generamos las opciones sin peligro de que .forEach() dé error
        let opcionesTalles = '';
        listaTalles.forEach(talle => {
            opcionesTalles += `<option value="${talle}">${talle}</option>`;
        });
        // =========================================================================

        card.innerHTML = `
            <img src="${prod.imagen}" alt="${prod.nombre}">
            <h3>${prod.nombre}</h3>
            <p class="precio">$${prod.precio.toLocaleString()}</p>
            
            <select class="select-talle" id="talle-${prod.id}">
                ${opcionesTalles}
            </select>

            <button onclick="agregarAlCarrito(${prod.id})">Agregar al carrito</button>
        `;
        
        grilla.appendChild(card);
    });
}

// 3. AGREGAR AL CARRITO 
function agregarAlCarrito(idProducto) {
    // A. Buscamos el producto original en la base de datos
    const productoOriginal = productos.find(p => p.id === idProducto);
    
    if (productoOriginal) {
        // B. Buscamos el elemento <select> de ese producto específico y leemos su valor
        const selectTalle = document.getElementById(`talle-${idProducto}`);
        const talleSeleccionado = selectTalle ? selectTalle.value : 'Único';

        // C. Creamos una COPIA del producto para agregarle el talle elegido
        // (Esto es clave por si el cliente compra la misma remera en talle S y luego en L)
        const productoParaCarrito = {
            ...productoOriginal,
            talleElegido: talleSeleccionado
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

// 5. ACTUALIZAR VISTA DEL CARRITO (Muestra el talle al lado del nombre)
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
        
        // Ahora mostramos el nombre junto con (Talle: X)
        item.innerHTML = `
            <div class="item-info">
                <h4>${prod.nombre} <span style="color:#666; font-size:0.85rem;">(Talle: ${prod.talleElegido})</span></h4>
                <p>$${prod.precio.toLocaleString()}</p>
            </div>
            <button class="btn-eliminar" onclick="eliminarDelCarrito(${index})">X</button>
        `;
        listaCarrito.appendChild(item);
    });

    const sumaTotal = carrito.reduce((acum, prod) => acum + prod.precio, 0);
    elemTotal.textContent = `$${sumaTotal.toLocaleString()}`;
}

// 6. EVENTOS DEL MODAL
if (botonAbrirCarrito && modalCarrito) {
    botonAbrirCarrito.addEventListener('click', () => {
        modalCarrito.classList.add('activo');
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

// ¡INICIO DE LA APP! Ahora llamamos a la carga del JSON:
cargarBaseDeDatos();