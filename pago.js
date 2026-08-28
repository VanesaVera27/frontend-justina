let metodoSeleccionado = 'tarjeta';

function cambiarMetodo(metodo, elementoBtn) {
    metodoSeleccionado = metodo;

    // Cambiamos el estado activo de los botones de pago
    document.querySelectorAll('.metodo-pago-btn').forEach(btn => btn.classList.remove('activo'));
    elementoBtn.classList.add('activo');

    // Ocultamos todas las secciones de pago y mostramos la seleccionada
    document.querySelectorAll('.seccion-pago').forEach(sec => sec.classList.remove('activo'));
    
    if (metodo === 'tarjeta') {
        document.getElementById('pago-tarjeta').classList.add('activo');
        document.getElementById('input-tarjeta').required = true;
    } else {
        document.getElementById('input-tarjeta').required = false;
        if (metodo === 'transferencia') {
            document.getElementById('pago-transferencia').classList.add('activo');
        } else if (metodo === 'efectivo') {
            document.getElementById('pago-efectivo').classList.add('activo');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const sesionGuardada = localStorage.getItem('usuario_tienda');
    const datosEnvioTemp = sessionStorage.getItem('datos_envio_temp');
    let carritoActual = JSON.parse(localStorage.getItem('carrito_justina')) || [];

    if (!sesionGuardada || !datosEnvioTemp || carritoActual.length === 0) {
        alert("Faltan datos de la compra o el carrito está vacío.");
        window.location.href = 'index.html';
        return;
    }

    const usuario = JSON.parse(sesionGuardada);
    const datosEnvio = JSON.parse(datosEnvioTemp);

    // Renderizamos el resumen rápido
    const contenedorResumen = document.getElementById('resumen-items-pago');
    const spanTotal = document.getElementById('resumen-total-pago');

    let totalCompra = 0;
    contenedorResumen.innerHTML = carritoActual.map(item => {
        const subtotal = Number(item.precio) * (item.cantidad || 1);
        totalCompra += subtotal;
        return `
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span>${item.cantidad || 1}x ${item.nombre} (${item.talleElegido || 'U'})</span>
                <span>$${subtotal.toLocaleString()}</span>
            </div>
        `;
    }).join('');

    spanTotal.textContent = `$${totalCompra.toLocaleString()}`;

    // Envío del pedido a PostgreSQL
    const formPago = document.getElementById('form-pago');
    formPago.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btnSubmit = document.getElementById('btn-finalizar-pedido');
        btnSubmit.disabled = true;
        btnSubmit.textContent = "Procesando pedido...";

        const nuevoPedido = {
            usuario_id: usuario.id || null,
            nombre: datosEnvio.nombre,
            email: datosEnvio.email,
            dni: datosEnvio.dni,
            telefono: datosEnvio.telefono,
            domicilio: `${datosEnvio.domicilio} (Recibe: ${datosEnvio.quienRecibe}) [Pago: ${metodoSeleccionado.toUpperCase()}]`,
            total: totalCompra,
            items: carritoActual
        };

        try {
            const respuesta = await fetch('http://localhost:3000/api/pedidos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoPedido)
            });

            const datos = await respuesta.json();

            if (respuesta.ok) {
                let mensajeExito = `¡Pedido registrado con éxito! 🎉\nGracias ${datosEnvio.nombre}, tu orden es la #${datos.pedido_id}.`;
                if (metodoSeleccionado === 'transferencia') {
                    mensajeExito += `\n\nRecordá realizar la transferencia al Alias: justina.store.mp para despachar tu pedido.`;
                } else if (metodoSeleccionado === 'efectivo') {
                    mensajeExito += `\n\nTe enviamos las instrucciones de pago en efectivo a tu correo (${datosEnvio.email}).`;
                }

                alert(mensajeExito);

                localStorage.removeItem('carrito_justina');
                sessionStorage.removeItem('datos_envio_temp');
                window.location.href = 'index.html';
            } else {
                alert(`No se pudo procesar el pedido: ${datos.error}`);
                btnSubmit.disabled = false;
                btnSubmit.textContent = "Pagar y Finalizar Compra";
            }
        } catch (error) {
            console.error("Error al registrar pedido:", error);
            alert("Ocurrió un error de conexión al registrar el pedido.");
            btnSubmit.disabled = false;
            btnSubmit.textContent = "Pagar y Finalizar Compra";
        }
    });
});