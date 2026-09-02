// ====================================================================
// 1. GUARDIÁN DE SEGURIDAD
// ====================================================================
(function verificarPermisoAdmin() {
    const sesion = localStorage.getItem('usuario_tienda');
    if (!sesion || JSON.parse(sesion).rol !== 'admin') {
        alert("⛔ No tenés permisos para ver la gestión de pedidos.");
        window.location.href = 'index.html';
    }
})();

const tablaPedidos = document.getElementById('lista-pedidos-admin');

// ====================================================================
// 2. CARGAR PEDIDOS DESDE EL SERVIDOR
// ====================================================================
async function cargarPedidosAdmin() {
    if (!tablaPedidos) return;
    tablaPedidos.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;">Cargando pedidos...</td></tr>';

    try {
        const res = await fetch(`${API_URL}/api/pedidos`);
        const pedidos = await res.json();

        tablaPedidos.innerHTML = '';

        if (pedidos.length === 0) {
            tablaPedidos.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;">Todavía no se han recibido pedidos.</td></tr>';
            return;
        }

        pedidos.forEach(p => {
            // Formateamos las prendas
            const resumenPrendas = p.items && p.items.length > 0
                ? p.items.map(i => `• <b>${i.nombre_producto}</b> <small>(${i.talle} - ${i.color})</small>`).join('<br>')
                : 'Sin detalle';

            const fechaFormat = new Date(p.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

            // Normalizamos los textos a minúsculas para evaluar las condiciones
            const estadoPed = (p.estado_pedido || 'pendiente').toLowerCase();
            const estadoPag = (p.estado_pago || 'pendiente').toLowerCase();

            // A. COLUMNA ESTADO PAGO: 100% Automatizado (Etiqueta de Solo Lectura)
            let colorFondoPag = '#e3f2fd'; // Azul claro por defecto (Pendiente/En progreso)
            let colorTextoPag = '#1565c0'; 

            if (estadoPag === 'cancelado' || estadoPag === 'rechazado') {
                colorFondoPag = '#ffebee';
                colorTextoPag = '#c62828';
            } else if (estadoPag === 'pagado' || estadoPag === 'aceptado') {
                colorFondoPag = '#e8f5e9';
                colorTextoPag = '#2e7d32';
            }
            
            const badgePago = `<span style="background:${colorFondoPag}; color:${colorTextoPag}; padding:5px 12px; border-radius:6px; font-weight:bold; font-size: 0.85rem; display: inline-block; text-transform: capitalize; border: 1px solid ${colorTextoPag}40;">${p.estado_pago || 'Pendiente'}</span>`;

            // B. COLUMNA ESTADO PEDIDO: Bloqueo condicional si está cancelado
            let selectorPedido = '';
            
            if (estadoPed === 'cancelado') {
                // Si está cancelado, bloqueamos la modificación logística
                selectorPedido = `<span style="background:#fff0f0; border: 1px solid #ffccd0; color:#c62828; padding:5px 12px; border-radius:6px; font-weight:bold; font-size: 0.85rem; display: inline-block;">🔴 Cancelado</span>`;
            } else {
                // Si está activo, mostramos el select para avanzar con el envío
                // Le pasamos el estado de pago actual a la función para no borrarlo en la base de datos
                selectorPedido = `
                    <select onchange="actualizarLogistica(${p.id}, this.value, '${p.estado_pago}')" 
                            style="padding: 0.4rem; border-radius: 6px; border: 1px solid #d8cec4; background: #fff; color: #3b2314; font-weight: 600; cursor: pointer; width: 100%;">
                        <option value="Pendiente" ${estadoPed === 'pendiente' ? 'selected' : ''}>⏳ Pendiente</option>
                        <option value="En proceso" ${estadoPed === 'en proceso' ? 'selected' : ''}>⚙️ En proceso</option>
                        <option value="Despachado" ${estadoPed === 'despachado' ? 'selected' : ''}>📦 Despachado</option>
                        <option value="Enviado" ${estadoPed === 'enviado' ? 'selected' : ''}>🚚 Enviado</option>
                    </select>
                `;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="vertical-align: middle;"><b>#${p.id}</b><br><small style="color:#88786b;">${fechaFormat}</small></td>
                <td style="vertical-align: middle;">
                    <b style="color: #3b2314;">${p.nombre_comprador}</b><br>
                    <small>✉️ ${p.email_comprador}</small><br>
                    <span style="color:#27ae60; font-weight:600; font-size: 0.9rem;">📍 ${p.domicilio}</span>
                </td>
                <td style="vertical-align: middle; line-height: 1.4;">${resumenPrendas}</td>
                <td style="vertical-align: middle;"><b>$${Number(p.total).toLocaleString()}</b></td>
                <td style="text-align: center; vertical-align: middle;">${badgePago}</td>
                <td style="text-align: center; vertical-align: middle;">${selectorPedido}</td>
            `;
            tablaPedidos.appendChild(tr);
        });
    } catch (error) {
        tablaPedidos.innerHTML = '<tr><td colspan="6" style="text-align:center; color: red;">Error al cargar pedidos del servidor.</td></tr>';
    }
}

// ====================================================================
// 3. ACTUALIZAR EXCLUSIVAMENTE LA LOGÍSTICA
// ====================================================================
async function actualizarLogistica(idPedido, nuevoPedidoEstado, estadoPagoActual) {
    try {
        const respuesta = await fetch(`${API_URL}/api/pedidos/${idPedido}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            // Mantenemos el pago intacto y solo mandamos el nuevo estado de envío
            body: JSON.stringify({
                estado_pago: estadoPagoActual,
                estado_pedido: nuevoPedidoEstado
            })
        });

        if (respuesta.ok) {
            console.log(`Logística del pedido #${idPedido} actualizada a: ${nuevoPedidoEstado}`);
            // Opcional: mostrar un mini-alerta visual que confirme el cambio sin interrumpir
        } else {
            alert("Error al actualizar el estado logístico en la base de datos.");
        }
    } catch (error) {
        alert("No se pudo conectar con el servidor.");
    }
}

// Carga inicial
cargarPedidosAdmin();