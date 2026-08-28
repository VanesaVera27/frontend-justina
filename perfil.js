// ==========================================================
// 1. VERIFICACIÓN Y CARGA DE SESIÓN
// ==========================================================
const sesion = localStorage.getItem('usuario_tienda');
if (!sesion) {
    alert("Debés iniciar sesión para acceder a tu perfil.");
    window.location.href = 'index.html';
}

// Definimos la variable global 'usuario' para que todo el script la reconozca
let usuario = JSON.parse(sesion);

// Rellenamos los inputs de inmediato con los datos que ya tenemos en sesión
document.getElementById('perfil-nombre').value = usuario.nombre || '';
document.getElementById('perfil-email').value = usuario.email || '';
document.getElementById('perfil-dni').value = usuario.dni || '';
document.getElementById('perfil-telefono').value = usuario.telefono || ''; 

// Alternar entre pestañas
function cambiarTab(pestaña) {
    document.querySelectorAll('.vista-perfil').forEach(v => v.classList.remove('activo'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activo'));

    document.getElementById(`tab-${pestaña}`).classList.add('activo');
    event.currentTarget.classList.add('activo');

    if (pestaña === 'direcciones') cargarDirecciones();
    if (pestaña === 'pedidos') cargarMisPedidos();
}

document.getElementById('perfil-nombre').value = usuario.nombre || '';
document.getElementById('perfil-email').value = usuario.email || '';
document.getElementById('perfil-dni').value = usuario.dni || '';
document.getElementById('perfil-telefono').value = usuario.telefono || ''; 

// Actualizar Datos o Clave
document.getElementById('form-perfil').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nuevoNombre = document.getElementById('perfil-nombre').value.trim();
    const nuevaClave = document.getElementById('perfil-pass').value.trim();
    
    // 1. Capturamos los valores de los nuevos inputs
    const nuevoDni = document.getElementById('perfil-dni').value.trim();
    const nuevoTelefono = document.getElementById('perfil-telefono').value.trim();

    try {
        const resp = await fetch(`http://localhost:3000/api/usuarios/${usuario.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                nombre: nuevoNombre, 
                password: nuevaClave || undefined,
                dni: nuevoDni,          
                telefono: nuevoTelefono   
            })
        });
        const datos = await resp.json();
        if (resp.ok) {
            alert("¡Perfil actualizado con éxito!");
            localStorage.setItem('usuario_tienda', JSON.stringify(datos.usuario));
            document.getElementById('perfil-pass').value = '';
        }
    } catch (err) {
        alert("Error al guardar cambios.");
    }
});

// Eliminar Cuenta
document.getElementById('btn-eliminar-cuenta').addEventListener('click', async () => {
    if (confirm("⚠️ ¿Estás totalmente segura de eliminar tu cuenta? Esta acción no se puede deshacer.")) {
        await fetch(`http://localhost:3000/api/usuarios/${usuario.id}`, { method: 'DELETE' });
        localStorage.removeItem('usuario_tienda');
        alert("Tu cuenta ha sido eliminada.");
        window.location.href = 'index.html';
    }
});

// ====================================================================
// 3. GESTIÓN DE DIRECCIONES (CON VERIFICACIÓN DE CONTRASEÑA)
// ====================================================================

// A. Función auxiliar: Pedir contraseña y validarla con el backend
async function verificarPasswordSeguridad() {
    const passwordIngresada = prompt("🔐 Por seguridad, ingresá tu contraseña para confirmar esta acción:");
    if (!passwordIngresada) return false; // Si tocó cancelar o dejó vacío

    try {
        const resp = await fetch('http://localhost:3000/api/usuarios/verificar-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id: usuario.id, password: passwordIngresada })
        });

        if (resp.ok) {
            return true;
        } else {
            alert("❌ Contraseña incorrecta. Acción cancelada por seguridad.");
            return false;
        }
    } catch (err) {
        alert("Error al conectar con el servidor para verificar seguridad.");
        return false;
    }
}

// B. Cargar direcciones en pantalla sumando botones de Editar y Eliminar
async function cargarDirecciones() {
    const cont = document.getElementById('lista-direcciones');
    cont.innerHTML = '<p>Cargando direcciones...</p>';
    try {
        const res = await fetch(`http://localhost:3000/api/direcciones/${usuario.id}`);
        const direcciones = await res.json();
        cont.innerHTML = '';

        if (direcciones.length === 0) {
            cont.innerHTML = '<p style="color:#888;">Todavía no tenés direcciones guardadas.</p>';
            return;
        }

        direcciones.forEach(d => {
            const div = document.createElement('div');
            div.className = 'card-dir';

            // Usamos encodeURIComponent para pasar el objeto completo a la función de edición
            const datosDirJson = encodeURIComponent(JSON.stringify(d));

            div.innerHTML = `
                <div>
                    <b style="color: #3b2314; font-size: 1.05rem;">📍 ${d.calle_numero}</b><br>
                    <small style="color: #666; font-size: 0.9rem;">
                        ${d.localidad}, ${d.provincia} — CP: <b>${d.codigo_postal}</b> (${d.pais})
                    </small>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button type="button" onclick="iniciarEdicionDir('${datosDirJson}')"
                            style="background: #efe8de; border: none; padding: 0.5rem 0.8rem; border-radius: 4px; cursor: pointer; color: #3b2314;" 
                            title="Editar dirección">
                        ✏️
                    </button>
                    <button type="button" onclick="eliminarDireccion(${d.id})"
                            style="background: #fff0f0; border: 1px solid #ffccd0; padding: 0.5rem 0.8rem; border-radius: 4px; cursor: pointer; color: #c53030;" 
                            title="Eliminar dirección">
                        🗑️
                    </button>
                </div>
            `;
            cont.appendChild(div);
        });
    } catch (err) {
        cont.innerHTML = '<p>Error cargando direcciones.</p>';
    }
}

// C. ELIMINAR DIRECCIÓN (Pidiendo contraseña primero)
async function eliminarDireccion(idDireccion) {
    // 1. Verificamos contraseña
    const esValido = await verificarPasswordSeguridad();
    if (!esValido) return;

    // 2. Si la clave es correcta, borramos la dirección
    try {
        const resp = await fetch(`http://localhost:3000/api/direcciones/${idDireccion}`, {
            method: 'DELETE'
        });
        if (resp.ok) {
            alert("🗑️ Dirección eliminada correctamente.");
            cargarDirecciones();
        }
    } catch (err) {
        alert("Error al intentar eliminar la dirección.");
    }
}

// D. INICIAR MODO EDICIÓN (Llenamos el formulario con los datos viejos)
function iniciarEdicionDir(datosCifrados) {
    const d = JSON.parse(decodeURIComponent(datosCifrados));

    // Llenamos el form con los valores actuales
    document.getElementById('dir-id-edicion').value = d.id;
    document.getElementById('dir-calle').value = d.calle_numero;
    document.getElementById('dir-cp').value = d.codigo_postal;
    document.getElementById('dir-localidad').value = d.localidad;
    document.getElementById('dir-provincia').value = d.provincia;
    document.getElementById('dir-pais').value = d.pais;

    // Cambiamos el texto del botón y mostramos "Cancelar"
    document.getElementById('titulo-form-direccion').textContent = "✏️ Editar Dirección";
    document.getElementById('btn-submit-dir').textContent = "💾 Actualizar Dirección";
    document.getElementById('btn-cancelar-edicion').style.display = 'inline-block';

    // Scrolleamos suavemente hasta el formulario para que la clienta vea dónde editar
    document.getElementById('form-nueva-direccion').scrollIntoView({ behavior: 'smooth' });
}

// E. CANCELAR EDICIÓN (Limpiamos y volvemos a modo "Crear")
function cancelarEdicionDir() {
    document.getElementById('form-nueva-direccion').reset();
    document.getElementById('dir-id-edicion').value = "";
    document.getElementById('titulo-form-direccion').textContent = "➕ Agregar una nueva dirección";
    document.getElementById('btn-submit-dir').textContent = "📍 Guardar Dirección";
    document.getElementById('btn-cancelar-edicion').style.display = 'none';
}

// F. SUBMIT: Sirve tanto para CREAR NUEVA como para ACTUALIZAR UNA VIEJA
document.getElementById('form-nueva-direccion').addEventListener('submit', async (e) => {
    e.preventDefault();

    const idEdicion = document.getElementById('dir-id-edicion').value;

    // Si está editando una dirección existente -> PEDIMOS CONTRASEÑA POR SEGURIDAD
    if (idEdicion !== "") {
        const esValido = await verificarPasswordSeguridad();
        if (!esValido) return;
    }

    const datosDir = {
        usuario_id: usuario.id,
        calle_numero: document.getElementById('dir-calle').value.trim(),
        codigo_postal: document.getElementById('dir-cp').value.trim(),
        localidad: document.getElementById('dir-localidad').value.trim(),
        provincia: document.getElementById('dir-provincia').value.trim(),
        pais: document.getElementById('dir-pais').value.trim()
    };

    try {
        let resp;
        if (idEdicion === "") {
            // CREAR NUEVA (POST)
            resp = await fetch('http://localhost:3000/api/direcciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosDir)
            });
        } else {
            // ACTUALIZAR EXISTENTE (PUT)
            resp = await fetch(`http://localhost:3000/api/direcciones/${idEdicion}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosDir)
            });
        }

        if (resp.ok) {
            alert(idEdicion === "" ? "¡Dirección guardada con éxito!" : "¡Dirección actualizada con éxito!");
            cancelarEdicionDir(); // Limpia el formulario y resetea los botones
            cargarDirecciones();  // Recarga la lista
        }
    } catch (err) {
        alert("Error al guardar la dirección.");
    }
});

// ====================================================================
// 4. GESTIÓN DE MIS PEDIDOS Y CANCELACIONES
// ====================================================================

async function cargarMisPedidos() {
    const tbody = document.getElementById('lista-mis-pedidos');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Cargando tus pedidos...</td></tr>';

    try {
        const res = await fetch(`http://localhost:3000/api/mis-pedidos/${usuario.id}`);
        const pedidos = await res.json();
        tbody.innerHTML = '';

        if (pedidos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem;">Aún no has realizado compras.</td></tr>';
            return;
        }

        pedidos.forEach(p => {
            const detalle = p.items.map(i => `${i.nombre_producto} (${i.talle}/${i.color})`).join(', ');

            // Evaluamos las condiciones para ver si se puede cancelar
            const estadoPed = (p.estado_pedido || '').toLowerCase();
            const estadoPag = (p.estado_pago || '').toLowerCase();

            const sePuedeCancelar =
                (estadoPed !== 'despachado' && estadoPed !== 'enviado' && estadoPed !== 'cancelado') &&
                (estadoPag === 'pendiente' || estadoPag === 'en progreso' || estadoPag === 'aceptado');

            // Armamos el botón o dejamos un guión si no aplica
            let botonAccion = '-';
            if (sePuedeCancelar) {
                botonAccion = `
                    <button type="button" onclick="cancelarPedido(${p.id})"
                        style="background: #fff0f0; border: 1px solid #ffccd0; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; color: #c53030; font-weight: bold; font-size: 0.8rem; transition: all 0.2s;"
                        onmouseover="this.style.background='#ffe0e0'" 
                        onmouseout="this.style.background='#fff0f0'">
                        ❌ Cancelar
                    </button>
                `;
            } else if (estadoPed === 'cancelado') {
                botonAccion = '<span style="color: #888; font-size: 0.85rem; font-style: italic;">Cancelado</span>';
            }

            // Colores dinámicos para los estados (opcional, para darle más estilo)
            const colorFondoPed = estadoPed === 'cancelado' ? '#ffebee' : '#e8f5e9';
            const colorTextoPed = estadoPed === 'cancelado' ? '#c62828' : '#2e7d32';

            const colorFondoPag = estadoPag === 'cancelado' ? '#ffebee' : '#e3f2fd';
            const colorTextoPag = estadoPag === 'cancelado' ? '#c62828' : '#1565c0';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><b>#${p.id}</b></td>
                <td>${new Date(p.fecha).toLocaleDateString()}</td>
                <td style="max-width: 250px; line-height: 1.4;">${detalle}</td>
                <td><b>$${Number(p.total).toLocaleString()}</b></td>
                <td><span style="background:${colorFondoPed}; color:${colorTextoPed}; padding:4px 8px; border-radius:4px; font-weight:bold; font-size: 0.85rem;">${p.estado_pedido}</span></td>
                <td><span style="background:${colorFondoPag}; color:${colorTextoPag}; padding:4px 8px; border-radius:4px; font-weight:bold; font-size: 0.85rem;">${p.estado_pago}</span></td>
                <td style="text-align: center;">${botonAccion}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: red;">Error cargando pedidos.</td></tr>';
    }
}

// Función para enviar la orden de cancelación al backend
async function cancelarPedido(idPedido) {
    if (confirm("⚠️ ¿Estás segura de que querés cancelar esta compra? Esta acción no se puede deshacer.")) {
        try {
            const res = await fetch(`http://localhost:3000/api/pedidos/${idPedido}/cancelar`, {
                method: 'PUT' // Usamos PUT porque estamos actualizando un dato existente
            });

            const data = await res.json();

            if (res.ok) {
                alert("¡Pedido cancelado correctamente!");
                cargarMisPedidos(); // Refresca la tabla automáticamente
            } else {
                alert(`No se pudo cancelar: ${data.error}`);
            }
        } catch (err) {
            alert("Error de conexión al intentar cancelar el pedido.");
        }
    }
}