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

        let listaTalles = [S, M, L]; // Talles por defecto si no vienen definidos

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


// =========================================================
// --- CONTROL INTELIGENTE DEL HEADER SEGÚN EL ROL ---
// =========================================================

const btnLoginHeader = document.getElementById('btn-login-header');
const btnConfigAdmin = document.getElementById('btn-config-admin');
const modalLogin = document.getElementById('modal-login');
const formLogin = document.getElementById('form-login');

// 1. Función para actualizar los botones del Header en base a quién entró
function actualizarInterfazHeader() {
    const sesionGuardada = localStorage.getItem('usuario_tienda');

    if (sesionGuardada) {
        const usuario = JSON.parse(sesionGuardada);

        // A. Mostramos su nombre al lado del ícono de usuario y un botón de salir
        const primerNombre = usuario.nombre.split(' ')[0];
        btnLoginHeader.innerHTML = `👤 Hola, <b>${primerNombre}</b> (Salir)`;

        // B. MAGIA ADMIN: Si el rol es 'admin', hacemos visible el botón "Control de Stock"
        if (usuario.rol === 'admin' && btnConfigAdmin) {
            btnConfigAdmin.style.display = 'inline-block';
        } else if (btnConfigAdmin) {
            btnConfigAdmin.style.display = 'none';
        }
    } else {
        // Si no hay nadie logueado, dejamos todo como al principio
        btnLoginHeader.innerHTML = `👤 Iniciar Sesión`;
        if (btnConfigAdmin) btnConfigAdmin.style.display = 'none';
    }
}

// 2. Comportamiento del botón Iniciar Sesión / Salir del Header
if (btnLoginHeader) {
    btnLoginHeader.addEventListener('click', () => {
        const sesionGuardada = localStorage.getItem('usuario_tienda');

        if (sesionGuardada) {
            // Si ya inició sesión, le preguntamos si quiere cerrar su cuenta
            const usuario = JSON.parse(sesionGuardada);
            if (confirm(`¿Querés cerrar la sesión de ${usuario.nombre}?`)) {
                localStorage.removeItem('usuario_tienda');
                actualizarInterfazHeader(); // Se ocultará automáticamente el botón admin
            }
        } else {
            // Si no está logueado, abrimos el modal general de Login
            if (modalLogin) modalLogin.classList.add('activo');
        }
    });
}

// 3. Procesar el formulario del Modal de Login
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email-user').value.trim();
        // Nota: Agregá un id="password-user" a tu campo de clave en el HTML del login si aún no lo tiene
        const password = document.getElementById('password-user')?.value.trim() || 'admin1234';

        try {
            const respuesta = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const datos = await respuesta.json();

            if (respuesta.ok) {
                // Guardamos los datos del usuario (incluyendo su campo 'rol') en localStorage
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

// ¡Apenas carga index.html, revisamos quién está conectado para dibujar el header correcto!
actualizarInterfazHeader();


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

// ¡INICIO DE LA APP! Ahora llamamos a la carga del JSON:
cargarBaseDeDatos();
