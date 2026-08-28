document.addEventListener('DOMContentLoaded', async () => {
    const sesionGuardada = localStorage.getItem('usuario_tienda');
    if (!sesionGuardada) {
        window.location.href = 'index.html';
        return;
    }

    const usuario = JSON.parse(sesionGuardada);

    // 1. Campos fijos protegidos (Nombre, Email y DNI no se pueden modificar si ya están)
    document.getElementById('checkout-nombre').value = usuario.nombre || '';
    document.getElementById('checkout-email').value = usuario.email || '';
    document.getElementById('checkout-dni').value = usuario.dni || '';
    document.getElementById('checkout-telefono').value = usuario.telefono || '';

    // 2. Cargamos las direcciones guardadas del usuario usando tu ruta correcta con el ID en la URL
    let direccionesUsuario = [];
    try {
        const res = await fetch(`http://localhost:3000/api/direcciones/${usuario.id}`);
        if (res.ok) {
            direccionesUsuario = await res.json();
        }
    } catch (e) {
        console.error("Error al cargar direcciones:", e);
    }

    const selectDireccion = document.getElementById('select-direccion-guardada');
    const seccionGuardadas = document.getElementById('seccion-direcciones-guardadas');
    const seccionNuevaDir = document.getElementById('seccion-nueva-direccion');

    let usandoNuevaDireccion = false;

    if (direccionesUsuario.length > 0) {
        selectDireccion.innerHTML = direccionesUsuario.map(d => `
            <option value="${d.calle_numero || d.calle}, ${d.localidad}, ${d.provincia} (CP: ${d.codigo_postal})">
                📍 ${d.calle_numero || d.calle} - ${d.localidad}, ${d.provincia} (CP: ${d.codigo_postal})
            </option>
        `).join('');
    } else {
        seccionGuardadas.style.display = 'none';
        seccionNuevaDir.style.display = 'block';
        usandoNuevaDireccion = true;
    }

    // Botones para alternar entre dirección guardada y nueva dirección
    document.getElementById('btn-mostrar-nueva-dir').addEventListener('click', () => {
        seccionGuardadas.style.display = 'none';
        seccionNuevaDir.style.display = 'block';
        usandoNuevaDireccion = true;
    });

    document.getElementById('btn-cancelar-nueva-dir').addEventListener('click', () => {
        if (direccionesUsuario.length > 0) {
            seccionNuevaDir.style.display = 'none';
            seccionGuardadas.style.display = 'block';
            usandoNuevaDireccion = false;
        } else {
            alert("Debes ingresar al menos una dirección de envío.");
        }
    });

    // Envío del formulario
    const formCheckout = document.getElementById('form-checkout');
    formCheckout.addEventListener('submit', async (e) => {
        e.preventDefault();

        let domicilioFinal = '';

        if (!usandoNuevaDireccion && direccionesUsuario.length > 0) {
            domicilioFinal = selectDireccion.value;
        } else {
            const calle = document.getElementById('nueva-calle').value.trim();
            const cp = document.getElementById('nuevo-cp').value.trim();
            const localidad = document.getElementById('nueva-localidad').value.trim();
            const provincia = document.getElementById('nueva-provincia').value.trim();
            const pais = document.getElementById('nuevo-pais').value.trim();

            if (!calle || !cp || !localidad || !provincia) {
                alert("Por favor completa todos los campos obligatorios de la nueva dirección.");
                return;
            }

            domicilioFinal = `${calle}, ${localidad}, ${provincia} - CP: ${cp} (${pais})`;

            // Opcional: Si querés guardar esta nueva dirección en la base de datos del usuario automáticamente
            try {
                await fetch('http://localhost:3000/api/direcciones', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        usuario_id: usuario.id,
                        calle, codigo_postal: cp, localidad, provincia, pais
                    })
                });
            } catch (err) {
                console.error("No se pudo guardar la dirección en BD:", err);
            }
        }

        const telefonoActualizado = document.getElementById('checkout-telefono').value;

        // Actualizamos el teléfono en el localStorage del usuario por si lo cambió
        usuario.telefono = telefonoActualizado;
        localStorage.setItem('usuario_tienda', JSON.stringify(usuario));

        // Empaquetamos los datos de envío para la pasarela de pago
        const datosEnvio = {
            nombre: usuario.nombre,
            email: usuario.email,
            dni: usuario.dni,
            telefono: telefonoActualizado,
            domicilio: domicilioFinal,
            quienRecibe: document.getElementById('checkout-recibe').value.trim() || usuario.nombre
        };

        sessionStorage.setItem('datos_envio_temp', JSON.stringify(datosEnvio));

        // Redirigimos a la pantalla de pago mockeada
        window.location.href = 'pago.html';
    });
});