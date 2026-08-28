const btnIniciarCompra = document.getElementById('btn-iniciar-compra');

async function renderizarPaginaCarrito() {
    const contenedorLista = document.getElementById('lista-carrito-pagina');
    const tituloCarrito = document.getElementById('titulo-carrito-pagina');
    const resumenSubtotal = document.getElementById('resumen-subtotal');
    const resumenImpuestos = document.getElementById('resumen-impuestos');
    const resumenTotal = document.getElementById('resumen-total');

    if (!contenedorLista) return;

    let carritoActual = JSON.parse(localStorage.getItem('carrito_justina')) || [];

    if (carritoActual.length === 0) {
        if (tituloCarrito) tituloCarrito.textContent = "TU CARRITO (0 productos)";
        contenedorLista.innerHTML = `
            <div style="text-align: center; padding: 3rem; background: #fff; border: 1px solid #e0e0e0; border-radius: 4px;">
                <p style="font-size: 1.1rem; color: #666; margin-bottom: 1rem;">¡No hay productos en tu carrito!</p>
                <a href="index.html" style="display: inline-block; background: #000; color: #fff; padding: 0.8rem 1.5rem; text-decoration: none; border-radius: 4px; font-weight: bold;">Comprar Ahora</a>
            </div>
        `;
        if (resumenSubtotal) resumenSubtotal.textContent = "$0";
        if (resumenImpuestos) resumenImpuestos.textContent = "$0";
        if (resumenTotal) resumenTotal.textContent = "$0";
        return;
    }

    const totalUnidades = carritoActual.reduce((acc, item) => acc + (item.cantidad || 1), 0);
    if (tituloCarrito) tituloCarrito.textContent = `TU CARRITO (${totalUnidades} producto${totalUnidades > 1 ? 's' : ''})`;

    let htmlProductos = '';
    let subtotalGeneral = 0;

    carritoActual.forEach((item, index) => {
        const precioItem = Number(item.precio || 0);
        const cantidadItem = Number(item.cantidad || 1);
        const subtotalItem = precioItem * cantidadItem;
        subtotalGeneral += subtotalItem;

        const fotoItem = (item.imagenes && item.imagenes.length > 0) ? item.imagenes[0] : (item.imagen || '');

        htmlProductos += `
            <div style="display: flex; align-items: center; justify-content: space-between; background: #fff; border: 1px solid #e0e0e0; padding: 1.2rem; border-radius: 4px; margin-bottom: 1rem;">
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <img src="${fotoItem}" alt="${item.nombre}" style="width: 80px; height: 100px; object-fit: cover; border-radius: 4px;">
                    <div>
                        <h4 style="font-size: 1rem; margin-bottom: 0.3rem; font-weight: bold;">${item.nombre}</h4>
                        <p style="font-size: 0.8rem; color: #666; margin-bottom: 0.2rem;">TALLE: ${item.talleElegido || 'Único'}</p>
                        <p style="font-size: 0.8rem; color: #666; margin-bottom: 0.5rem;">COLOR: ${item.colorElegido || 'Único'}</p>
                        
                        <!-- Control de cantidad -->
                        <div style="display: flex; align-items: center; border: 1px solid #ccc; width: fit-content; border-radius: 3px;">
                            <button onclick="cambiarCantidadPagina(${index}, -1)" style="background: none; border: none; padding: 0.2rem 0.6rem; cursor: pointer; font-weight: bold;">-</button>
                            <span style="padding: 0.2rem 0.6rem; font-size: 0.9rem; border-left: 1px solid #ccc; border-right: 1px solid #ccc;">${cantidadItem}</span>
                            <button onclick="cambiarCantidadPagina(${index}, 1)" style="background: none; border: none; padding: 0.2rem 0.6rem; cursor: pointer; font-weight: bold;">+</button>
                        </div>
                    </div>
                </div>

                <div style="text-align: right;">
                    <p style="font-size: 1.1rem; font-weight: bold; margin-bottom: 0.5rem;">$${subtotalItem.toLocaleString()}</p>
                    <button onclick="eliminarItemPagina(${index})" style="background: none; border: none; color: #999; cursor: pointer; font-size: 1.1rem;" title="Eliminar producto">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    });

    contenedorLista.innerHTML = htmlProductos;

    const impuestosEstimados = Math.round(subtotalGeneral * 0.21);
    if (resumenSubtotal) resumenSubtotal.textContent = `$${subtotalGeneral.toLocaleString()}`;
    if (resumenImpuestos) resumenImpuestos.textContent = `$${impuestosEstimados.toLocaleString()}`;
    if (resumenTotal) resumenTotal.textContent = `$${subtotalGeneral.toLocaleString()}`;
}

async function cambiarCantidadPagina(index, delta) {
    let carritoActual = JSON.parse(localStorage.getItem('carrito_justina')) || [];
    const item = carritoActual[index];
    const nuevaCantidad = (item.cantidad || 1) + delta;

    if (nuevaCantidad <= 0) {
        carritoActual.splice(index, 1);
    } else {
        // Consultamos el stock real al servidor antes de sumar
        let stockPermitido = 999;
        try {
            const respuesta = await fetch('http://localhost:3000/api/productos');
            const productosServidor = await respuesta.json();
            const productoOriginal = productosServidor.find(p => p.id === item.id);

            if (productoOriginal) {
                if (Array.isArray(productoOriginal.variantes) && productoOriginal.variantes.length > 0) {
                    const varianteElegida = productoOriginal.variantes.find(v =>
                        v.talle === item.talleElegido && v.color === item.colorElegido
                    );
                    if (varianteElegida) stockPermitido = Number(varianteElegida.stock);
                } else if (productoOriginal.stock !== undefined) {
                    stockPermitido = Number(productoOriginal.stock);
                }
            }
        } catch (err) {
            console.error("Error al consultar stock:", err);
        }

        if (nuevaCantidad > stockPermitido) {
            alert(`⚠️ No podés agregar más unidades. Solo hay ${stockPermitido} disponible(s) en talle ${item.talleElegido || 'Único'} y color ${item.colorElegido || 'Único'}.`);
            return;
        }

        item.cantidad = nuevaCantidad;
    }

    localStorage.setItem('carrito_justina', JSON.stringify(carritoActual));
    renderizarPaginaCarrito();
    actualizarContadorHeader();
}

function eliminarItemPagina(index) {
    let carritoActual = JSON.parse(localStorage.getItem('carrito_justina')) || [];
    carritoActual.splice(index, 1);
    
    localStorage.setItem('carrito_justina', JSON.stringify(carritoActual));
    renderizarPaginaCarrito();
    actualizarContadorHeader();
}

if (btnIniciarCompra) {
    btnIniciarCompra.addEventListener('click', () => {
        let carritoActual = JSON.parse(localStorage.getItem('carrito_justina')) || [];
        if (carritoActual.length === 0) {
            alert("Tu carrito está vacío. ¡Agregá prendas antes de finalizar!");
            return;
        }

        const sesionGuardada = localStorage.getItem('usuario_tienda');
        if (!sesionGuardada) {
            alert("¡Ya casi es tuyo! Para finalizar la compra necesitás iniciar sesión o crear una cuenta.");
            const modalLogin = document.getElementById('modal-login');
            if (modalLogin) {
                modalLogin.classList.add('activo');
                document.getElementById('tab-login')?.click();
            }
            return;
        }

        // Si está logueada y tiene productos, la mandamos directo a la pantalla de Checkout profesional
        window.location.href = 'checkout.html';
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


document.addEventListener('DOMContentLoaded', () => {
    renderizarPaginaCarrito();
});