// ====================================================================
// --- 1. GUARDIÁN DE SEGURIDAD DEL PANEL 
// ====================================================================
(function verificarPermisoAdmin() {
    // Leemos la sesión general de la tienda
    const sesion = localStorage.getItem('usuario_tienda');
    
    if (!sesion) {
        alert("⛔ Acceso denegado. Debés iniciar sesión como Administradora para ver el stock.");
        window.location.href = 'index.html';
        return;
    }

    const usuario = JSON.parse(sesion);
    // Si entró un usuario normal (rol: 'cliente'), lo expulsamos del panel
    if (usuario.rol !== 'admin') {
        alert("⛔ No tenés permisos para ver el Control de Stock.");
        window.location.href = 'index.html';
    }
})();

// AGREGAMOS UN BOTÓN DE CERRAR SESIÓN EN EL HEADER DEL PANEL:
window.addEventListener('DOMContentLoaded', () => {
    const headerAdmin = document.querySelector('.header');
    if (headerAdmin) {
        const sesion = JSON.parse(localStorage.getItem('usuario_admin'));
        const infoUser = document.createElement('div');
        infoUser.style.cssText = "display: flex; align-items: center; gap: 1rem; color: white;";
        infoUser.innerHTML = `
            <span>👤 Dueña: <b>${sesion.nombre}</b></span>
            <button id="btn-salir-admin" style="background:#e74c3c; color:white; border:none; padding:0.4rem 0.8rem; border-radius:4px; cursor:pointer;">
                Cerrar Sesión
            </button>
        `;
        headerAdmin.appendChild(infoUser);

        document.getElementById('btn-salir-admin').addEventListener('click', () => {
            if (confirm("¿Querés cerrar tu sesión de administradora?")) {
                localStorage.removeItem('usuario_admin');
                window.location.href = 'index.html';
            }
        });
    }
});

const formAdmin = document.getElementById('form-nuevo-producto');
const contVariantes = document.getElementById('contenedor-variantes');
const btnAgregarVariante = document.getElementById('btn-agregar-variante');
const tablaInventario = document.getElementById('tabla-inventario');

// 1. Agregar más filas de combinación de Talle + Color + Stock
btnAgregarVariante.addEventListener('click', () => {
    const nuevaFila = document.createElement('div');
    nuevaFila.classList.add('fila-variante');
    nuevaFila.style.cssText = "display: flex; gap: 0.5rem; margin-bottom: 0.5rem;";
    nuevaFila.innerHTML = `
        <input type="text" placeholder="Talle" class="var-talle" required style="width: 30%;">
        <input type="text" placeholder="Color" class="var-color" required style="width: 45%;">
        <input type="number" placeholder="Stock" class="var-stock" required min="0" style="width: 25%;">
        <button type="button" onclick="this.parentElement.remove()" style="background:#ff4d4d; color:white; border:none; padding:0 0.5rem;">X</button>
    `;
    contVariantes.appendChild(nuevaFila);
});

// 2. Guardar nuevo producto 
formAdmin.addEventListener('submit', async (e) => {
    e.preventDefault();

    const filas = document.querySelectorAll('.fila-variante');
    const arrayVariantes = [];
    filas.forEach(fila => {
        arrayVariantes.push({
            talle: fila.querySelector('.var-talle').value.trim().toUpperCase(),
            color: fila.querySelector('.var-color').value.trim(),
            stock: parseInt(fila.querySelector('.var-stock').value)
        });
    });

    const formData = new FormData();
    formData.append('nombre', document.getElementById('prod-nombre').value.trim());
    formData.append('precio', document.getElementById('prod-precio').value);
    formData.append('categoria', document.getElementById('prod-categoria').value);
    // Pasamos el array de combinaciones como string para enviarlo por FormData
    formData.append('variantes', JSON.stringify(arrayVariantes));

    const foto = document.getElementById('prod-imagen').files[0];
    if (foto) formData.append('foto', foto);

    try {
        const resp = await fetch('http://localhost:3000/api/productos', {
            method: 'POST',
            body: formData
        });
        if (resp.ok) {
            alert("¡Prenda y variantes cargadas!");
            formAdmin.reset();
            cargarInventarioAdmin(); // Recargamos la tabla de abajo
        }
    } catch (err) {
        console.error(err);
    }
});

// 3. Cargar la tabla inferior con opción para Borrar o ver stock
async function cargarInventarioAdmin() {
    tablaInventario.innerHTML = '<tr><td colspan="4">Cargando catálogo...</td></tr>';
    try {
        const res = await fetch('http://localhost:3000/api/productos');
        const productos = await res.json();
        tablaInventario.innerHTML = '';

        productos.forEach(prod => {
            const resumenStock = prod.variantes
                ? prod.variantes.map(v => `${v.talle} ${v.color} (<b>${v.stock}</b>)`).join('<br>')
                : 'Sin stock';

            const tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid #eee";
            tr.innerHTML = `
                <td style="padding: 0.8rem 0;">
                    <b>${prod.nombre}</b><br>
                    <small style="color:#666;">ID: ${prod.id} - ${prod.categoria}</small>
                </td>
                <td>$${Number(prod.precio).toLocaleString()}</td>
                <td>${resumenStock}</td>
                <td>
                    <button onclick="editarProducto(${prod.id})" style="background:#f39c12; color:white; border:none; padding:0.4rem; border-radius:4px; cursor:pointer; margin-right:0.3rem;">✏️ Editar</button>
                    <button onclick="borrarProducto(${prod.id})" style="background:#e74c3c; color:white; border:none; padding:0.4rem; border-radius:4px; cursor:pointer;">🗑️ Borrar</button>
                </td>
            `;
            tablaInventario.appendChild(tr);
        });
    } catch (err) {
        tablaInventario.innerHTML = '<tr><td colspan="4">Error al cargar productos</td></tr>';
    }
}

// 4. Borrar un producto por su ID
async function borrarProducto(id) {
    if (confirm("¿Estás segura de eliminar esta prenda y todas sus variantes de stock?")) {
        await fetch(`http://localhost:3000/api/productos/${id}`, { method: 'DELETE' });
        cargarInventarioAdmin();
    }
}

// 5. Editar producto (muy basico)
async function editarProducto(id) {
    const nuevoNombre = prompt("Nuevo nombre para la prenda:");
    const nuevoPrecio = prompt("Nuevo precio ($):");
    
    if (nuevoNombre && nuevoPrecio) {
        await fetch(`http://localhost:3000/api/productos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: nuevoNombre,
                precio: Number(nuevoPrecio),
                categoria: "Calzas" 
            })
        });
        cargarInventarioAdmin();
    }
}

// Seleccionamos los elementos del DOM de categorías
const selectCategoria = document.getElementById('prod-categoria');
const btnNuevaCategoria = document.getElementById('btn-nueva-categoria');

// 1. FUNCIÓN PARA CARGAR LAS CATEGORÍAS DESDE POSTGRESQL AL MENU DESPLEGABLE
async function cargarCategorias(categoriaSeleccionada = null) {
    if (!selectCategoria) return;

    try {
        const respuesta = await fetch('http://localhost:3000/api/categorias');
        const categorias = await respuesta.json();

        selectCategoria.innerHTML = ''; // Limpiamos el select

        categorias.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.nombre;
            option.textContent = cat.nombre;
            selectCategoria.appendChild(option);
        });

        // Si creamos una categoría nueva, la dejamos seleccionada automáticamente
        if (categoriaSeleccionada) {
            selectCategoria.value = categoriaSeleccionada;
        }
    } catch (error) {
        console.error("Error al cargar categorías:", error);
    }
}

// 2. CREAR UNA CATEGORÍA NUEVA EN VIVO
if (btnNuevaCategoria) {
    btnNuevaCategoria.addEventListener('click', async () => {
        const nuevoNombre = prompt("Escribí el nombre de la nueva categoría (Ej: Accesorios, Bikinis, Shorts):");

        if (!nuevoNombre || !nuevoNombre.trim()) return;

        try {
            const respuesta = await fetch('http://localhost:3000/api/categorias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: nuevoNombre.trim() })
            });

            const datos = await respuesta.json();

            if (respuesta.ok) {
                alert(`¡Categoría "${datos.categoria.nombre}" creada y agregada a la lista!`);
                // Recargamos las categorías y dejamos la nueva seleccionada en el <select>
                await cargarCategorias(datos.categoria.nombre);
            } else {
                alert(`Error: ${datos.error}`);
            }
        } catch (error) {
            alert("No se pudo conectar con el servidor para crear la categoría.");
        }
    });
}


cargarCategorias();

cargarInventarioAdmin();