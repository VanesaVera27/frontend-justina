// 1. GUARDIÁN DE SEGURIDAD
(function verificarPermisoAdmin() {
    const sesion = localStorage.getItem('usuario_tienda');
    if (!sesion || JSON.parse(sesion).rol !== 'admin') {
        alert("⛔ No tenés permisos para ver la gestión de pedidos.");
        window.location.href = 'index.html';
    }
})();

const tablaPedidos = document.getElementById('lista-pedidos-admin');

// 2. CARGAR PEDIDOS DESDE EL SERVIDOR
async function cargarPedidosAdmin() {
    if (!tablaPedidos) return;
    tablaPedidos.innerHTML = '<tr><td colspan="6">Cargando pedidos...</td></tr>';

    try {
        const res = await fetch('http://localhost:3000/api/pedidos');
        const pedidos = await res.json();

        tablaPedidos.innerHTML = '';

        if (pedidos.length === 0) {
            tablaPedidos.innerHTML = '<tr><td colspan="6" style="text-align:center;">Todavía no se han recibido pedidos.</td></tr>';
            return;
        }

        pedidos.forEach(p => {
            // Formateamos las prendas que compró (Ej: "1x Remera Boxy (L - Negro)")
            const resumenPrendas = p.items && p.items.length > 0
                ? p.items.map(i => `• <b>${i.nombre_producto}</b> <small>(${i.talle} - ${i.color})</small>`).join('<br>')
                : 'Sin detalle';

            const fechaFormat = new Date(p.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><b>#${p.id}</b><br><small style="color:#666;">${fechaFormat}</small></td>
                <td>
                    <b>${p.nombre_comprador}</b><br>
                    <small>📧 ${p.email_comprador}</small><br>
                    <span style="color:#27ae60; font-weight:bold;">📍 ${p.domicilio}</span>
                </td>
                <td>${resumenPrendas}</td>
                <td><b>$${Number(p.total).toLocaleString()}</b></td>
                <td>
                    <select onchange="cambiarEstadoPedido(${p.id}, this.value, '${p.estado_pedido}')" style="padding: 0.3rem;">
                        <option value="Pendiente" ${p.estado_pago === 'Pendiente' ? 'selected' : ''}>⏳ Pendiente</option>
                        <option value="Pagado" ${p.estado_pago === 'Pagado' ? 'selected' : ''}>✅ Pagado</option>
                        <option value="Rechazado" ${p.estado_pago === 'Rechazado' ? 'selected' : ''}>❌ Rechazado</option>
                    </select>
                </td>
                <td>
                    <select onchange="cambiarEstadoPedido(${p.id}, '${p.estado_pago}', this.value)" style="padding: 0.3rem;">
                        <option value="En proceso" ${p.estado_pedido === 'En proceso' ? 'selected' : ''}>📦 En proceso</option>
                        <option value="Confirmado" ${p.estado_pedido === 'Confirmado' ? 'selected' : ''}>🚀 Confirmado / Despachado</option>
                        <option value="Cancelado" ${p.estado_pedido === 'Cancelado' ? 'selected' : ''}>🛑 Cancelado</option>
                    </select>
                </td>
            `;
            tablaPedidos.appendChild(tr);
        });
    } catch (error) {
        tablaPedidos.innerHTML = '<tr><td colspan="6">Error al cargar pedidos del servidor.</td></tr>';
    }
}

// 3. ACTUALIZAR ESTADO DE PAGO O DESPACHO EN VIVO
async function cambiarEstadoPedido(idPedido, nuevoPago, nuevoPedidoEstado) {
    try {
        const respuesta = await fetch(`http://localhost:3000/api/pedidos/${idPedido}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                estado_pago: nuevoPago,
                estado_pedido: nuevoPedidoEstado
            })
        });

        if (respuesta.ok) {
            console.log(`Pedido #${idPedido} actualizado correctamente.`);
        } else {
            alert("Error al actualizar el estado en la base de datos.");
        }
    } catch (error) {
        alert("No se pudo conectar con el servidor.");
    }
}

// Carga inicial
cargarPedidosAdmin();