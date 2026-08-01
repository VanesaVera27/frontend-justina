// 1. Verificar sesión
const sesion = localStorage.getItem('usuario_tienda');
if (!sesion) {
    alert("Debés iniciar sesión para acceder a tu perfil.");
    window.location.href = 'index.html';
}
const usuario = JSON.parse(sesion);

// Alternar entre pestañas
function cambiarTab(pestaña) {
    document.querySelectorAll('.vista-perfil').forEach(v => v.classList.remove('activo'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activo'));
    
    document.getElementById(`tab-${pestaña}`).classList.add('activo');
    event.currentTarget.classList.add('activo');

    if (pestaña === 'direcciones') cargarDirecciones();
    if (pestaña === 'pedidos') cargarMisPedidos();
}

// 2. CARGAR MIS DATOS INICIALES
document.getElementById('perfil-nombre').value = usuario.nombre;
document.getElementById('perfil-email').value = usuario.email;

// Actualizar Datos o Clave
document.getElementById('form-perfil').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nuevoNombre = document.getElementById('perfil-nombre').value.trim();
    const nuevaClave = document.getElementById('perfil-pass').value.trim();

    try {
        const resp = await fetch(`http://localhost:3000/api/usuarios/${usuario.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nuevoNombre, password: nuevaClave || undefined })
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

// 3. CARGAR DIRECCIONES
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
            div.innerHTML = `
                <b>📍 ${d.calle_numero}</b><br>
                <small>${d.localidad}, ${d.provincia} (CP: ${d.codigo_postal}) - ${d.pais}</small>
            `;
            cont.appendChild(div);
        });
    } catch (err) {
        cont.innerHTML = '<p>Error cargando direcciones.</p>';
    }
}

// Guardar nueva dirección
document.getElementById('form-nueva-direccion').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nuevaDir = {
        usuario_id: usuario.id,
        calle_numero: document.getElementById('dir-calle').value.trim(),
        codigo_postal: document.getElementById('dir-cp').value.trim(),
        localidad: document.getElementById('dir-localidad').value.trim(),
        provincia: document.getElementById('dir-provincia').value.trim(),
        pais: document.getElementById('dir-pais').value.trim()
    };
    try {
        const resp = await fetch('http://localhost:3000/api/direcciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevaDir)
        });
        if (resp.ok) {
            alert("¡Dirección guardada!");
            document.getElementById('form-nueva-direccion').reset();
            cargarDirecciones();
        }
    } catch (err) {
        alert("Error al guardar la dirección.");
    }
});

// 4. CARGAR MIS PEDIDOS
async function cargarMisPedidos() {
    const tbody = document.getElementById('lista-mis-pedidos');
    tbody.innerHTML = '<tr><td colspan="6">Cargando tus pedidos...</td></tr>';
    try {
        const res = await fetch(`http://localhost:3000/api/mis-pedidos/${usuario.id}`);
        const pedidos = await res.json();
        tbody.innerHTML = '';
        if (pedidos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">Aún no has realizado compras.</td></tr>';
            return;
        }
        pedidos.forEach(p => {
            const detalle = p.items.map(i => `${i.nombre_producto} (${i.talle}/${i.color})`).join(', ');
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><b>#${p.id}</b></td>
                <td>${new Date(p.fecha).toLocaleDateString()}</td>
                <td>${detalle}</td>
                <td><b>$${Number(p.total).toLocaleString()}</b></td>
                <td><span style="background:#e8f5e9; color:#2e7d32; padding:3px 8px; border-radius:4px; font-weight:bold;">${p.estado_pedido}</span></td>
                <td><span style="background:#e3f2fd; color:#1565c0; padding:3px 8px; border-radius:4px; font-weight:bold;">${p.estado_pago}</span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6">Error cargando pedidos.</td></tr>';
    }
}