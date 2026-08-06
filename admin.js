// ====================================================================
// --- 1. GUARDIÁN DE SEGURIDAD DEL PANEL 
// ====================================================================
(function verificarPermisoAdmin() {
    const sesion = localStorage.getItem('usuario_tienda');

    if (!sesion) {
        alert("⛔ Acceso denegado. Debés iniciar sesión como Administradora para ver el stock.");
        window.location.href = 'index.html';
        return;
    }

    const usuario = JSON.parse(sesion);
    if (usuario.rol !== 'admin') {
        alert("⛔ No tenés permisos para ver el Control de Stock.");
        window.location.href = 'index.html';
    }
})();

// ====================================================================
// --- 2. ELEMENTOS DEL DOM
// ====================================================================
const formAdmin = document.getElementById('form-admin'); // <-- Corregido para coincidir con tu HTML
const contVariantes = document.getElementById('contenedor-variantes');
const btnAgregarVariante = document.getElementById('btn-agregar-variante');
const tablaInventario = document.getElementById('tabla-inventario');
const selectCategoria = document.getElementById('prod-categoria');
const btnNuevaCategoria = document.getElementById('btn-nueva-categoria');

const btnAbrirForm = document.getElementById('btn-abrir-form');
const btnCerrarForm = document.getElementById('btn-cerrar-form');
const panelNuevoProducto = document.getElementById('panel-nuevo-producto');

// ====================================================================
// --- 3. ABRIR Y CERRAR EL FORMULARIO DE NUEVA PRENDA
// ====================================================================
if (btnAbrirForm && panelNuevoProducto) {
    btnAbrirForm.addEventListener('click', () => {
        panelNuevoProducto.classList.remove('oculto');
        panelNuevoProducto.scrollIntoView({ behavior: 'smooth' });
    });
}

if (btnCerrarForm && panelNuevoProducto) {
    btnCerrarForm.addEventListener('click', () => {
        panelNuevoProducto.classList.add('oculto');
    });
}

// ====================================================================
// --- 4. COMBINACIONES DE TALLE, COLOR Y STOCK
// ====================================================================
if (btnAgregarVariante) {
    btnAgregarVariante.addEventListener('click', () => {
        const nuevaFila = document.createElement('div');
        nuevaFila.classList.add('fila-variante');
        nuevaFila.style.cssText = "display: flex; gap: 0.5rem; margin-bottom: 0.5rem;";
        nuevaFila.innerHTML = `
            <input type="text" placeholder="Talle" class="var-talle" required style="width: 30%;">
            <input type="text" placeholder="Color" class="var-color" required style="width: 45%;">
            <input type="number" placeholder="Stock" class="var-stock" required min="0" style="width: 25%;">
            <button type="button" onclick="this.parentElement.remove()" style="background:#c53030; color:white; border:none; padding:0 0.6rem; border-radius:4px; cursor:pointer;">✕</button>
        `;
        contVariantes.appendChild(nuevaFila);
    });
}

// ====================================================================
// --- 5. GUARDAR NUEVO PRODUCTO
// ====================================================================
if (formAdmin) {
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
        formData.append('variantes', JSON.stringify(arrayVariantes));

        const archivosFotos = document.getElementById('prod-imagenes').files;
        for (let i = 0; i < archivosFotos.length; i++) {
            formData.append('fotos', archivosFotos[i]);
        }

        try {
            const resp = await fetch('http://localhost:3000/api/productos', {
                method: 'POST',
                body: formData
            });
            if (resp.ok) {
                alert("¡Prenda y variantes cargadas con éxito!");
                formAdmin.reset();
                panelNuevoProducto.classList.add('oculto'); // Ocultamos el panel al guardar
                cargarInventarioAdmin(); // Recargamos la tabla inferior
            }
        } catch (err) {
            console.error(err);
            alert("Error al conectar con el servidor para guardar la prenda.");
        }
    });
}

// ====================================================================
// --- CARGAR INVENTARIO CON FOTOS Y TAGS DE STOCK
// ====================================================================
let listaProductosAdmin = []; // Guardamos en memoria para el buscador rápido

async function cargarInventarioAdmin() {
    if (!tablaInventario) return;
    tablaInventario.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem;">Cargando inventario...</td></tr>';
    
    try {
        const res = await fetch('http://localhost:3000/api/productos');
        listaProductosAdmin = await res.json();
        renderizarTablaAdmin(listaProductosAdmin);
    } catch (err) {
        tablaInventario.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem; color: #c53030;">Error al cargar productos del servidor</td></tr>';
    }
}

// ====================================================================
// --- CARGAR INVENTARIO CON FOTOS Y TAGS DE STOCK
// ====================================================================

// ====================================================================
// --- CARGAR INVENTARIO CON FOTOS LOCALES (CARPETA /imagenes)
// ====================================================================

// Imagen por defecto en formato SVG (No consume internet ni genera errores en consola)
const FOTO_DEFAULT = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='60' viewBox='0 0 50 60'%3E%3Crect width='50' height='60' fill='%23efe8de'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%23694a32'%3EFoto%3C/text%3E%3C/svg%3E";

function renderizarTablaAdmin(productos) {
    tablaInventario.innerHTML = '';

    if (productos.length === 0) {
        tablaInventario.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem;">No se encontraron prendas.</td></tr>';
        return;
    }

    productos.forEach(prod => {
        // 1. Obtenemos el nombre del archivo (soporta si está en un array prod.fotos[0] o como texto simple en prod.imagen/prod.fotos)
        const nombreArchivo = (Array.isArray(prod.fotos) && prod.fotos.length > 0) 
            ? prod.fotos[0] 
            : (prod.imagen || (typeof prod.fotos === 'string' ? prod.fotos : null));

        // 2. Apuntamos directo a tu carpeta del frontend "imagenes/"
        const rutaFoto = nombreArchivo 
            ? `/${nombreArchivo}` 
            : FOTO_DEFAULT;

        // 3. Badges visuales de stock (con alerta en rojo si es 0)
        const badgesStock = prod.variantes
            ? prod.variantes.map(v => {
                const claseCero = v.stock === 0 ? 'sin-stock' : '';
                return `<span class="tag-stock ${claseCero}">
                            <b>${v.talle}</b> ${v.color} (${v.stock})
                        </span>`;
              }).join('')
            : '<span class="tag-stock">Sin variantes</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <!-- Columna 1: Foto desde la carpeta local /imagenes -->
            <td>
                <img src="${rutaFoto}" alt="${prod.nombre}" class="mini-foto-admin" 
                     onerror="this.onerror=null; this.src='${FOTO_DEFAULT}';">
            </td>

            <!-- Columna 2: Nombre e ID -->
            <td>
                <b style="font-size: 1.05rem; color:#3b2314;">${prod.nombre}</b><br>
                <small style="color:#694a32;">ID: #${prod.id} — ${prod.categoria}</small>
            </td>

            <!-- Columna 3: Precio -->
            <td style="font-weight: 600;">$${Number(prod.precio).toLocaleString()}</td>

            <!-- Columna 4: Badges visuales de stock -->
            <td>
                <div class="lista-tags-stock">
                    ${badgesStock}
                </div>
            </td>

            <!-- Columna 5: Botones de acción -->
            <td class="td-acciones">
                <button onclick="editarProducto(${prod.id})" class="btn-accion-icon">✏️ Editar</button>
                <button onclick="borrarProducto(${prod.id})" class="btn-accion-icon borrar">🗑️</button>
            </td>
        `;
        tablaInventario.appendChild(tr);
    });
}

// ====================================================================
// --- BUSCADOR RÁPIDO EN VIVO
// ====================================================================
const inputBuscarAdmin = document.getElementById('buscar-inventario');
if (inputBuscarAdmin) {
    inputBuscarAdmin.addEventListener('input', (e) => {
        const busqueda = e.target.value.toLowerCase().trim();
        const filtrados = listaProductosAdmin.filter(p => 
            p.nombre.toLowerCase().includes(busqueda) || 
            p.categoria.toLowerCase().includes(busqueda)
        );
        renderizarTablaAdmin(filtrados);
    });
}

// ====================================================================
// --- 7. ACCIONES: BORRAR Y EDITAR
// ====================================================================
async function borrarProducto(id) {
    if (confirm("⚠️ ¿Estás segura de eliminar esta prenda y todas sus variantes de stock?")) {
        await fetch(`http://localhost:3000/api/productos/${id}`, { method: 'DELETE' });
        cargarInventarioAdmin();
    }
}

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
                categoria: "Calzas" // Podés cambiarlo para pedir categoría también si querés
            })
        });
        cargarInventarioAdmin();
    }
}

// ====================================================================
// --- 8. CARGAR Y CREAR CATEGORÍAS EN EL DESPLEGABLE
// ====================================================================
async function cargarCategorias(categoriaSeleccionada = null) {
    if (!selectCategoria) return;

    try {
        const respuesta = await fetch('http://localhost:3000/api/categorias');
        const categorias = await respuesta.json();

        selectCategoria.innerHTML = '';

        categorias.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.nombre;
            option.textContent = cat.nombre;
            selectCategoria.appendChild(option);
        });

        if (categoriaSeleccionada) {
            selectCategoria.value = categoriaSeleccionada;
        }
    } catch (error) {
        console.error("Error al cargar categorías:", error);
    }
}

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
                await cargarCategorias(datos.categoria.nombre);
            } else {
                alert(`Error: ${datos.error}`);
            }
        } catch (error) {
            alert("No se pudo conectar con el servidor para crear la categoría.");
        }
    });
}

// Cargas iniciales al entrar a la página
cargarCategorias();
cargarInventarioAdmin();