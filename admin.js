// =======================================================================
// CONTROL DE USUARIO ADMIN, si no es admin no tiene acceso a esta pantalla
// =======================================================================
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
// ELEMENTOS DEL DOM Y VARIABLES
// ====================================================================
const formAdmin = document.getElementById('form-admin');
const contVariantes = document.getElementById('contenedor-variantes');
const btnAgregarVariante = document.getElementById('btn-agregar-variante');
const tablaInventario = document.getElementById('tabla-inventario');
const selectCategoria = document.getElementById('prod-categoria');
const btnNuevaCategoria = document.getElementById('btn-nueva-categoria');

const btnAbrirForm = document.getElementById('btn-abrir-form');
const btnCerrarForm = document.getElementById('btn-cerrar-form');
const panelNuevoProducto = document.getElementById('panel-nuevo-producto');

const modalCrear = document.getElementById('modal-backdrop-crear');
const modalEditar = document.getElementById('modal-backdrop-editar');
const btnCerrarEditar = document.getElementById('btn-cerrar-editar');
const formEditar = document.getElementById('form-editar');

// Variable temporal para el buscador rápido
let listaProductosAdmin = [];


// Variable temporal para manipular el orden de las fotos mientras editamos
let fotosEditTemporal = [];

// ====================================================================
// GESTIÓN DE LAS VENTANAS MODALES
// ====================================================================

// 1. Abrir y cerrar Modal de Nueva Prenda
if (btnAbrirForm && modalCrear) {
    btnAbrirForm.addEventListener('click', () => modalCrear.classList.remove('oculto'));
}
if (btnCerrarForm && modalCrear) {
    btnCerrarForm.addEventListener('click', () => modalCrear.classList.add('oculto'));
}

// 2. Cerrar Modal de Edición
if (btnCerrarEditar && modalEditar) {
    btnCerrarEditar.addEventListener('click', () => modalEditar.classList.add('oculto'));
}

// 3. Cerrar modales si hacen clic en el fondo oscuro de afuera
window.addEventListener('click', (e) => {
    if (e.target === modalCrear) modalCrear.classList.add('oculto');
    if (e.target === modalEditar) modalEditar.classList.add('oculto');
});

// ====================================================================
// COMBINACIONES DE TALLE, COLOR Y STOCK
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
// GUARDAR NUEVO PRODUCTO
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
        formData.append('descripcion', document.getElementById('admin-descripcion').value.trim());
        formData.append('variantes', JSON.stringify(arrayVariantes));

        const archivosFotos = document.getElementById('prod-imagenes').files;
        for (let i = 0; i < archivosFotos.length; i++) {
            formData.append('fotos', archivosFotos[i]);
        }

        try {
            const resp = await fetch('https://justina-store-backend.onrender.com/api/productos', {
                method: 'POST',
                body: formData
            });
            if (resp.ok) {
                alert("¡Prenda y variantes cargadas con éxito!");
                formAdmin.reset();
                panelNuevoProducto.classList.add('oculto'); // Ocultamos el panel al guardar
                cargarInventarioAdmin(); // Recargamos la tabla de inventario
            }
        } catch (err) {
            console.error(err);
            alert("Error al conectar con el servidor para guardar la prenda.");
        }
    });
}

// ====================================================================
//  CARGAR INVENTARIO CON FOTOS Y TAGS DE STOCK
// ====================================================================

async function cargarInventarioAdmin() {
    if (!tablaInventario) return;
    tablaInventario.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem;">Cargando inventario...</td></tr>';

    try {
        const res = await fetch('https://justina-store-backend.onrender.com/api/productos');
        listaProductosAdmin = await res.json();
        renderizarTablaAdmin(listaProductosAdmin);
    } catch (err) {
        tablaInventario.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem; color: #c53030;">Error al cargar productos del servidor</td></tr>';
    }
}

// ====================================================================
// CARGAR INVENTARIO CON FOTOS, TAGS DE STOCK Y MENÚ DESPLEGABLE
// ====================================================================

// Imagen por defecto en formato SVG
const FOTO_DEFAULT = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='60' viewBox='0 0 50 60'%3E%3Crect width='50' height='60' fill='%23efe8de'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%23694a32'%3EFoto%3C/text%3E%3C/svg%3E";

function renderizarTablaAdmin(productos) {
    tablaInventario.innerHTML = '';

    if (productos.length === 0) {
        tablaInventario.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem;">No se encontraron prendas.</td></tr>';
        return;
    }

    productos.forEach(prod => {
        // 1. Obtenemos el nombre del archivo 
        const nombreArchivo = (Array.isArray(prod.fotos) && prod.fotos.length > 0)
            ? prod.fotos[0]
            : (prod.imagen || (typeof prod.fotos === 'string' ? prod.fotos : null));

        // 2. Ruta de la foto
        const rutaFoto = nombreArchivo
            ? `/${nombreArchivo}`
            : FOTO_DEFAULT;

        // 3. Badges visuales de stock 
        const badgesStock = prod.variantes
            ? prod.variantes.map(v => {
                const claseCero = v.stock === 0 ? 'sin-stock' : '';
                return `<span class="tag-stock ${claseCero}">
                            <b>${v.talle}</b> ${v.color} (${v.stock})
                        </span>`;
            }).join('')
            : '<span class="tag-stock">Sin variantes</span>';

        // 4. Variables de estado para el menú desplegable
        const estaEnOferta = prod.en_oferta === true;
        const descuentoActual = prod.descuento || 20;
        const textoOferta = estaEnOferta ? `Quitar Oferta (${descuentoActual}% OFF)` : 'Poner en Oferta';

        const estaDestacado = Boolean(prod.destacado);
        const textoDestacado = estaDestacado ? 'Quitar de Inicio' : 'Destacar en Inicio';

        // 5. Estructura de la celda de acciones con el menú de 3 puntos (⋮)
        const tdAccionesHTML = `
            <div class="contenedor-acciones">
                <button type="button" class="btn-menu-puntos" onclick="toggleMenuAcciones(event, ${prod.id})">⋮</button>
                <div id="menu-${prod.id}" class="menu-desplegable">
                    <button onclick="toggleDestacado(${prod.id}, ${estaDestacado})">⭐ ${textoDestacado}</button>
                    <button onclick="toggleOferta(${prod.id}, ${estaEnOferta}, ${prod.precio})">🏷️ ${textoOferta}</button>
                    <hr>
                    <button onclick="editarProducto(${prod.id})">✏️ Editar Prenda</button>
                    <button class="borrar-opcion" onclick="borrarProducto(${prod.id})">🗑️ Eliminar Prenda</button>
                </div>
            </div>
        `;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <!-- Columna 1: Foto -->
            <td>
                <a href="producto.html?id=${prod.id}">
                    <img src="${rutaFoto}" alt="${prod.nombre}" class="mini-foto-admin" 
                        onerror="this.onerror=null; this.src='${FOTO_DEFAULT}';">
                </a>
            </td>

            <!-- Columna 2: Nombre e ID -->
            <td>
                <b style="font-size: 1.05rem; color:#3b2314;">${prod.nombre}</b><br>
                <small style="color:#694a32;">ID: #${prod.id} — ${prod.categoria}</small>
            </td>

            <!-- Columna 3: Precio -->
            <td style="font-weight: 600;">$${Number(prod.precio).toLocaleString()}</td>

            <!-- Columna 4: Badges de stock -->
            <td>
                <div class="lista-tags-stock">
                    ${badgesStock}
                </div>
            </td>

            <!-- Columna 5: Acciones con menú desplegable -->
            <td class="td-acciones" style="text-align: right; position: relative;">
                ${tdAccionesHTML}
            </td>
        `;
        tablaInventario.appendChild(tr);
    });
}

// ====================================================================
// PRENDER / APAGAR OFERTA (Con cálculo inteligente de descuentos)
// ====================================================================
async function toggleOferta(idProducto, estadoActualOferta, precioOriginal) {
    let nuevoEstado = !estadoActualOferta;
    let porcentajeDescuento = 20; // Valor base por si acaso

    if (nuevoEstado === true) {
        // Si lo estamos PRENDIENDO, le preguntamos al admin qué hacer
        let input = prompt(
            `El precio regular de la prenda es $${precioOriginal.toLocaleString()}.\n\n` +
            `Opción 1: Ingresá el PORCENTAJE (ej: 20, 30, 50)\n` +
            `Opción 2: Ingresá el PRECIO FINAL que querés cobrar (ej: 12000)`
        );

        if (input === null || input.trim() === '') return; // Si tocaste Cancelar, frenamos todo

        // Limpiamos el texto por si escribiste el símbolo "$" o "%" sin querer
        let inputLimpio = input.replace(/[^0-9]/g, '');
        let valorIngresado = parseInt(inputLimpio);

        if (isNaN(valorIngresado) || valorIngresado <= 0) {
            alert("Por favor ingresá un número válido.");
            return;
        }

        if (valorIngresado < 100) {
            // Si el número es menor a 100, asumimos que escribiste un PORCENTAJE (ej: 20)
            porcentajeDescuento = valorIngresado;
        } else {
            // Si el número es grande, asumimos que es el PRECIO FINAL (ej: 12000)
            if (valorIngresado >= precioOriginal) {
                alert("El precio de oferta tiene que ser menor al precio original.");
                return;
            }
            // Matemática: Calculamos el porcentaje real
            porcentajeDescuento = Math.round(100 - ((valorIngresado * 100) / precioOriginal));
            alert(`¡Perfecto! Eso equivale a un descuento del ${porcentajeDescuento}% OFF.`);
        }
    }

    try {
        const respuesta = await fetch(`https://justina-store-backend.onrender.com/api/productos/${idProducto}/oferta`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                en_oferta: nuevoEstado,
                descuento: porcentajeDescuento // Mandamos el cálculo final al backend
            })
        });

        if (respuesta.ok) {
            window.location.reload();
        } else {
            alert("Error al actualizar la oferta en la base de datos.");
        }
    } catch (error) {
        alert("Error de conexión con el servidor.");
    }
}


// ====================================================================
// PRENDER / APAGAR DESTACADO 
// ====================================================================
async function toggleDestacado(idProducto, estadoActualDestacado) {
    const nuevoEstado = !estadoActualDestacado;

    try {
        const respuesta = await fetch(`https://justina-store-backend.onrender.com/api/productos/${idProducto}/destacado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destacado: nuevoEstado })
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            await cargarInventarioAdmin();
        } else {
            // Mostramos el mensaje exacto que mandó el backend (ej: "No se puede destacar sin stock")
            alert(`⚠️ ${datos.error || "No se pudo actualizar el destacado."}`);
        }
    } catch (error) {
        console.error("Error de conexión:", error);
        alert("Error de conexión con el servidor.");
    }
}

// ====================================================================
// BUSCADOR RAPIDO
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
// ABRIR MODAL DE EDICIÓN CON FOTOS Y ORDEN
// ====================================================================
function editarProducto(id) {
    const prod = listaProductosAdmin.find(p => p.id === id);
    if (!prod || !modalEditar) return;

    document.getElementById('edit-prod-id').value = prod.id;
    document.getElementById('edit-prod-nombre').value = prod.nombre;
    document.getElementById('edit-prod-precio').value = prod.precio;
    document.getElementById('edit-descripcion').value = prod.descripcion || '';

    const selectCatEdit = document.getElementById('edit-prod-categoria');
    const selectCatMain = document.getElementById('prod-categoria');
    if (selectCatEdit && selectCatMain) {
        selectCatEdit.innerHTML = selectCatMain.innerHTML;
        selectCatEdit.value = prod.categoria;
    }

    const contVariantesEdit = document.getElementById('contenedor-edit-variantes');
    contVariantesEdit.innerHTML = '';
    if (prod.variantes) {
        prod.variantes.forEach(varItem => {
            const fila = document.createElement('div');
            fila.classList.add('fila-variante');
            fila.innerHTML = `
                <input type="text" value="${varItem.talle}" class="edit-var-talle" readonly style="width: 30%; background:#eae4dc; font-weight:bold;">
                <input type="text" value="${varItem.color}" class="edit-var-color" readonly style="width: 45%; background:#eae4dc;">
                <input type="number" value="${varItem.stock}" class="edit-var-stock" required min="0" style="width: 25%; font-weight:600; border:2px solid #3b2314;">
            `;
            contVariantesEdit.appendChild(fila);
        });
    }

    let datoFotos = prod.imagenes || prod.fotos || prod.imagen || [];

    if (typeof datoFotos === 'string') {
        const texto = datoFotos.trim();
        if (texto.startsWith('[') && texto.endsWith(']')) {
            try { datoFotos = JSON.parse(texto); } catch (e) { datoFotos = [texto]; }
        } else if (texto.includes(',')) {
            datoFotos = texto.split(',').map(n => n.trim()).filter(n => n !== '');
        } else if (texto !== '') {
            datoFotos = [texto];
        } else {
            datoFotos = [];
        }
    }

    fotosEditTemporal = Array.isArray(datoFotos) ? [...datoFotos] : [];

    renderizarFotosEdicion();
    modalEditar.classList.remove('oculto');
}

// ====================================================================
// DIBUJAR LAS FOTOS Y SUS CONTROLES DE PORTADA/BORRAR
// ====================================================================
function renderizarFotosEdicion() {
    const contenedorFotos = document.getElementById('contenedor-edit-fotos');
    if (!contenedorFotos) return;
    contenedorFotos.innerHTML = '';

    if (fotosEditTemporal.length === 0) {
        contenedorFotos.innerHTML = '<p style="font-size:0.8rem; color:#888; grid-column: 1/-1;">No hay imágenes guardadas.</p>';
        return;
    }

    fotosEditTemporal.forEach((rutaFoto, index) => {
        const esPortada = (index === 0);
        const srcFinal = rutaFoto.startsWith('imagenes/') ? rutaFoto : `/${rutaFoto}`;

        const tarjeta = document.createElement('div');
        tarjeta.className = `tarjeta-foto-edit ${esPortada ? 'es-portada' : ''}`;

        tarjeta.innerHTML = `
            ${esPortada ? '<div class="badge-portada">Portada #1</div>' : ''}
            <img src="${srcFinal}" alt="Foto ${index + 1}" onerror="this.src='https://via.placeholder.com/80?text=Foto'">
            <div class="botones-foto-edit">
                ${!esPortada ? `<button type="button" class="btn-foto-accion" onclick="hacerFotoPortada(${index})" title="Poner primero en la tienda">⭐ Portada</button>` : ''}
                <button type="button" class="btn-foto-accion borrar" onclick="borrarFotoEdicion(${index})" title="Eliminar imagen">🗑️</button>
            </div>
        `;
        contenedorFotos.appendChild(tarjeta);
    });
}
// Mover una imagen a la posición 0 (Portada de la card)
window.hacerFotoPortada = function (index) {
    const fotoSeleccionada = fotosEditTemporal.splice(index, 1)[0];
    fotosEditTemporal.unshift(fotoSeleccionada); // La mandamos adelante de todo
    renderizarFotosEdicion();
};

// Quitar una imagen de la lista
window.borrarFotoEdicion = function (index) {
    if (confirm("¿Sacar esta foto del producto?")) {
        fotosEditTemporal.splice(index, 1);
        renderizarFotosEdicion();
    }
};

// ====================================================================
// GUARDAR TODO 
// ====================================================================
if (formEditar) {
    formEditar.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-prod-id').value;

        const filasEdit = document.querySelectorAll('#contenedor-edit-variantes .fila-variante');
        const variantesActualizadas = [];
        filasEdit.forEach(fila => {
            variantesActualizadas.push({
                talle: fila.querySelector('.edit-var-talle').value,
                color: fila.querySelector('.edit-var-color').value,
                stock: parseInt(fila.querySelector('.edit-var-stock').value)
            });
        });

        // Usamos FormData porque ahora podemos estar enviando archivos nuevos + el array ordenado
        const formData = new FormData();
        formData.append('nombre', document.getElementById('edit-prod-nombre').value.trim());
        formData.append('precio', document.getElementById('edit-prod-precio').value);
        formData.append('categoria', document.getElementById('edit-prod-categoria').value);
        formData.append('descripcion', document.getElementById('edit-descripcion').value.trim());
        formData.append('variantes', JSON.stringify(variantesActualizadas));

        // Enviamos el array con el NUEVO ORDEN de las fotos que ya existían
        formData.append('fotosExistentes', JSON.stringify(fotosEditTemporal));

        // Si subió archivos nuevos los sumamos
        const archivosNuevos = document.getElementById('edit-prod-imagenes').files;
        for (let i = 0; i < archivosNuevos.length; i++) {
            formData.append('fotosNuevas', archivosNuevos[i]);
        }

        try {
            const res = await fetch(`https://justina-store-backend.onrender.com/api/productos/${id}`, {
                method: 'PUT',
                body: formData
            });

            if (res.ok) {
                alert("¡Prenda, orden de fotos y stock actualizados!");
                modalEditar.classList.add('oculto');
                formEditar.reset();
                cargarInventarioAdmin();
            }
        } catch (err) {
            console.error("Error actualizando prenda:", err);
            alert("Error al conectar con el servidor para guardar los cambios.");
        }
    });
}
// ====================================================================
// CARGAR Y CREAR CATEGORÍAS EN EL DESPLEGABLE
// ====================================================================
async function cargarCategorias(categoriaSeleccionada = null) {
    if (!selectCategoria) return;

    try {
        const respuesta = await fetch('https://justina-store-backend.onrender.com/api/categorias');
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
            const respuesta = await fetch('https://justina-store-backend.onrender.com/api/categorias', {
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

// Cargar inventario al entrar a la página
cargarInventarioAdmin();


// ====================================================================
// CONTROL DEL MENÚ DESPLEGABLE DE ACCIONES
// ====================================================================
window.toggleMenuAcciones = function(event, id) {
    event.stopPropagation();
    
    // Cerramos cualquier otro menú abierto
    document.querySelectorAll('.menu-desplegable').forEach(menu => {
        if (menu.id !== `menu-${id}`) {
            menu.classList.remove('activo');
        }
    });

    const menuActual = document.getElementById(`menu-${id}`);
    if (menuActual) {
        menuActual.classList.toggle('activo');
    }
};

// Cerrar menús al hacer clic fuera
window.addEventListener('click', () => {
    document.querySelectorAll('.menu-desplegable').forEach(menu => {
        menu.classList.remove('activo');
    });
});