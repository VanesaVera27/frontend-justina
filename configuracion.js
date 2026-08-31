document.addEventListener('DOMContentLoaded', async () => {
    // 1. Validar que sea admin
    const sesion = localStorage.getItem('usuario_tienda');
    if (!sesion) {
        window.location.href = 'index.html';
        return;
    }
    const usuario = JSON.parse(sesion);
    if (usuario.rol !== 'admin') {
        alert("Acceso denegado.");
        window.location.href = 'index.html';
        return;
    }

    // 2. TRAER LOS DATOS DE LA BD Y LLENAR LOS CAMPOS DEL FORMULARIO
    // Al cargar la configuración en el panel:
    try {
        const res = await fetch('http://localhost:3000/api/configuracion');
        if (res.ok) {
            const config = await res.json();

            // Cargamos las promos separadas (si están guardadas como JSON o las inicializamos vacías)
            let promosArray = [];
            try {
                promosArray = JSON.parse(config.texto_promocion || '[]');
            } catch (e) {
                // Si antes era un texto plano, lo ponemos en la primera posición
                promosArray = config.texto_promocion ? [config.texto_promocion] : [];
            }

            document.getElementById('cfg-promo-1').value = promosArray[0] || '';
            document.getElementById('cfg-promo-2').value = promosArray[1] || '';
            document.getElementById('cfg-promo-3').value = promosArray[2] || '';
            document.getElementById('cfg-promo-4').value = promosArray[3] || '';

            document.getElementById('cfg-whatsapp').value = config.whatsapp || '';
            document.getElementById('cfg-email').value = config.email_contacto || '';
            document.getElementById('cfg-instagram').value = config.instagram || '';
            document.getElementById('cfg-tiktok').value = config.tiktok || '';
            document.getElementById('cfg-ubicacion').value = config.ubicacion || '';
            document.getElementById('cfg-color').value = config.color_principal || '#3b2314';
            document.getElementById('cfg-faqs').value = config.preguntas_frecuentes || '';
            document.getElementById('cfg-envios').value = config.envios_devoluciones || '';
            document.getElementById('cfg-terminos').value = config.terminos_condiciones || '';
            document.getElementById('cfg-avisos').value = config.avisos_legales || '';
        }
    } catch (err) {
        console.error("Error al cargar configuración:", err);
    }

    // Al guardar los cambios:
    const formConfig = document.getElementById('form-config-web');
    formConfig.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Recolectamos solo los inputs que tengan texto escrito
        const p1 = document.getElementById('cfg-promo-1').value.trim();
        const p2 = document.getElementById('cfg-promo-2').value.trim();
        const p3 = document.getElementById('cfg-promo-3').value.trim();
        const p4 = document.getElementById('cfg-promo-4').value.trim();

        const arrayPromos = [p1, p2, p3, p4].filter(texto => texto !== '');

        const datosActualizados = {
            whatsapp: document.getElementById('cfg-whatsapp').value.trim(),
            email_contacto: document.getElementById('cfg-email').value.trim(),
            instagram: document.getElementById('cfg-instagram').value.trim(),
            tiktok: document.getElementById('cfg-tiktok').value.trim(),
            ubicacion: document.getElementById('cfg-ubicacion').value.trim(),
            texto_promocion: JSON.stringify(arrayPromos),
            color_principal: document.getElementById('cfg-color').value,
            preguntas_frecuentes: document.getElementById('cfg-faqs').value.trim(),
            envios_devoluciones: document.getElementById('cfg-envios').value.trim(),
            terminos_condiciones: document.getElementById('cfg-terminos').value.trim(),
            avisos_legales: document.getElementById('cfg-avisos').value.trim()
        };

        try {
            const respuesta = await fetch('http://localhost:3000/api/configuracion', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosActualizados)
            });

            if (respuesta.ok) {
                alert("¡Configuración web actualizada con éxito! 🚀");
                
            } else {
                alert("No se pudo actualizar la configuración.");
            }
        } catch (err) {
            console.error("Error de conexión:", err);
            alert("Error de conexión con el servidor.");
        }
        window.location.reload();
    });
});