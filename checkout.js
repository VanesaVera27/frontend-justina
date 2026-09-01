document.addEventListener('DOMContentLoaded', async () => {
    const sesionGuardada = localStorage.getItem('usuario_tienda');
    if (!sesionGuardada) {
        window.location.href = 'index.html';
        return;
    }

    const usuario = JSON.parse(sesionGuardada);

    // 2. Llenamos los inputs de Facturación
    document.getElementById('checkout-nombre').value = usuario.nombre || '';
    document.getElementById('checkout-email').value = usuario.email || '';
    
    const inputDni = document.getElementById('checkout-dni');
    const telefonoInput = document.getElementById('checkout-telefono');

    inputDni.value = usuario.dni || '';
    telefonoInput.value = usuario.telefono || '';

    // Si NO tiene DNI guardado, permitimos que lo escriba por primera vez.
    if (!usuario.dni || usuario.dni.trim() === '') {
        inputDni.removeAttribute('readonly');
        inputDni.style.background = '#fff';
        inputDni.style.cursor = 'text';
        inputDni.placeholder = 'Ingresá tu DNI (Obligatorio)';
    } else {
        // Si ya lo tiene, queda bloqueado por seguridad
        inputDni.setAttribute('readonly', true);
        inputDni.style.background = '#eee';
        inputDni.style.cursor = 'not-allowed';
    }

    // 2. Cargamos las direcciones guardadas del usuario usando tu ruta correcta con el ID en la URL
    let direccionesUsuario = [];
    try {
        const res = await fetch(`[https://justina-store-backend.onrender.com](https://justina-store-backend.onrender.com)api/direcciones/${usuario.id}`);
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

        const dniIngresado = inputDni.value.trim();
        const telefonoActualizado = telefonoInput.value.trim();

        if (!dniIngresado) {
            alert("El DNI es obligatorio para finalizar la compra.");
            return;
        }

        // Si el usuario no tenía DNI guardado y lo acaba de tipear, lo actualizamos en la BD
        if (!usuario.dni || usuario.dni !== dniIngresado) {
            try {
                await fetch(`[https://justina-store-backend.onrender.com](https://justina-store-backend.onrender.com)api/usuarios/${usuario.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nombre: usuario.nombre,
                        dni: dniIngresado,
                        telefono: telefonoActualizado
                    })
                });
                
                usuario.dni = dniIngresado;
                usuario.telefono = telefonoActualizado;
                localStorage.setItem('usuario_tienda', JSON.stringify(usuario));
            } catch (err) {
                console.error("No se pudo actualizar el DNI en la BD:", err);
            }
        }

        let domicilioFinal = '';

        if (!usandoNuevaDireccion && direccionesUsuario.length > 0) {
            domicilioFinal = selectDireccion.value;
        } else {
            const calleNumero = document.getElementById('nueva-calle').value.trim();
            const cp = document.getElementById('nuevo-cp').value.trim();
            const localidad = document.getElementById('nueva-localidad').value.trim();
            const provincia = document.getElementById('nueva-provincia').value.trim();
            const pais = document.getElementById('nuevo-pais').value.trim();

            if (!calleNumero || !cp || !localidad || !provincia) {
                alert("Por favor completa todos los campos obligatorios de la nueva dirección.");
                return;
            }

            domicilioFinal = `${calleNumero}, ${localidad}, ${provincia} - CP: ${cp} (${pais})`;

            // ⚡ GUARDAMOS LA NUEVA DIRECCIÓN USANDO LOS CAMPOS QUE ESPERA TU ENDPOINT
            try {
                await fetch('[https://justina-store-backend.onrender.com](https://justina-store-backend.onrender.com)api/direcciones', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        usuario_id: usuario.id,
                        calle_numero: calleNumero, // Coincide exactamente con tu backend
                        codigo_postal: cp,
                        localidad: localidad,
                        provincia: provincia,
                        pais: pais || 'Argentina'
                    })
                });
            } catch (err) {
                console.error("No se pudo guardar la dirección en BD:", err);
            }
        }

        // Actualizamos el teléfono en el localStorage del usuario por si lo cambió
        usuario.telefono = telefonoActualizado;
        localStorage.setItem('usuario_tienda', JSON.stringify(usuario));

        // Empaquetamos los datos de envío para la pasarela de pago
        const datosEnvio = {
            nombre: usuario.nombre,
            email: usuario.email,
            dni: dniIngresado,
            telefono: telefonoActualizado,
            domicilio: domicilioFinal,
            quienRecibe: document.getElementById('checkout-recibe').value.trim() || usuario.nombre
        };

        sessionStorage.setItem('datos_envio_temp', JSON.stringify(datosEnvio));

        // Redirigimos a la pantalla de pago mockeada
        window.location.href = 'pago.html';
    });
});