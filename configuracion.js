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
        const res = await fetch('[https://justina-store-backend.onrender.com](https://justina-store-backend.onrender.com)api/configuracion');
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
            const respuesta = await fetch('[https://justina-store-backend.onrender.com](https://justina-store-backend.onrender.com)api/configuracion', {
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

// ==========================================
    // GESTIÓN DE BANNERS DEL SLIDER EN CONFIGURACIÓN
    // ==========================================
    const contenedorListaBanners = document.getElementById('lista-banners-admin');
    const btnGuardarBanner = document.getElementById('btn-guardar-banner');
    const btnCancelarEdicion = document.getElementById('btn-cancelar-edicion-banner');
    let listaBannersCache = []; // Para guardar temporalmente los datos y editarlos fácil

    async function cargarBannersConfig() {
        if (!contenedorListaBanners) return;
        try {
            const res = await fetch('[https://justina-store-backend.onrender.com](https://justina-store-backend.onrender.com)api/banners');
            if (!res.ok) return;
            listaBannersCache = await res.json();

            contenedorListaBanners.innerHTML = '';
            if (listaBannersCache.length === 0) {
                contenedorListaBanners.innerHTML = '<p style="font-size: 0.8rem; color: #888;">No hay banners cargados actualmente.</p>';
                return;
            }

            listaBannersCache.forEach(b => {
                const srcFoto = b.imagen.startsWith('imagenes/') ? `/${b.imagen}` : b.imagen;
                const fila = document.createElement('div');
                fila.style.cssText = "display: flex; align-items: center; justify-content: space-between; background: #fff; padding: 0.5rem 1rem; border: 1px solid #e0e0e0; border-radius: 4px;";
                
                fila.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <img src="${srcFoto}" style="width: 60px; height: 35px; object-fit: cover; border-radius: 3px;" onerror="this.src='https://via.placeholder.com/60?text=Foto'">
                        <div>
                            <b style="font-size: 0.85rem; color: #333;">${b.titulo || 'Sin título'}</b>
                            <br><small style="color: #666; font-size: 0.75rem;">${b.subtitulo || ''}</small>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.4rem;">
                        <button type="button" onclick="prepararEdicionBanner(${b.id})" style="background: #e3f2fd; color: #1565c0; border: none; padding: 0.3rem 0.6rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">✏️ Editar</button>
                        <button type="button" onclick="eliminarBannerConfig(${b.id})" style="background: #ffebee; color: #c62828; border: none; padding: 0.3rem 0.6rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">🗑️ Eliminar</button>
                    </div>
                `;
                contenedorListaBanners.appendChild(fila);
            });
        } catch (err) {
            console.error("Error al cargar banners:", err);
        }
    }

    cargarBannersConfig();

    // Rellenar los campos para editar un banner existente
    window.prepararEdicionBanner = function(id) {
        const banner = listaBannersCache.find(b => b.id === id);
        if (!banner) return;

        document.getElementById('edit-banner-id').value = banner.id;
        document.getElementById('nuevo-banner-titulo').value = banner.titulo || '';
        document.getElementById('nuevo-banner-sub').value = banner.subtitulo || '';
        document.getElementById('nuevo-banner-link').value = banner.link || '';
        
        document.getElementById('banner-form-titulo').textContent = `✏️ Editando Banner ID #${banner.id}`;
        btnGuardarBanner.textContent = 'Actualizar Banner';
        if (btnCancelarEdicion) btnCancelarEdicion.style.display = 'inline-block';
    };

    // Botón cancelar edición
    if (btnCancelarEdicion) {
        btnCancelarEdicion.addEventListener('click', () => {
            limpiarFormularioBanner();
        });
    }

    function limpiarFormularioBanner() {
        document.getElementById('edit-banner-id').value = '';
        document.getElementById('nuevo-banner-titulo').value = '';
        document.getElementById('nuevo-banner-sub').value = '';
        document.getElementById('nuevo-banner-link').value = 'index.html?categoria=Todos';
        document.getElementById('nuevo-banner-file').value = '';
        document.getElementById('banner-form-titulo').textContent = '➕ Subir Nuevo Banner';
        btnGuardarBanner.textContent = 'Guardar Banner';
        if (btnCancelarEdicion) btnCancelarEdicion.style.display = 'none';
    }

    // Guardar (Crear nuevo o Actualizar existente)
    if (btnGuardarBanner) {
        btnGuardarBanner.addEventListener('click', async () => {
            const idEdicion = document.getElementById('edit-banner-id').value;
            const titulo = document.getElementById('nuevo-banner-titulo').value.trim();
            const subtitulo = document.getElementById('nuevo-banner-sub').value.trim();
            const link = document.getElementById('nuevo-banner-link').value.trim();
            const inputArchivo = document.getElementById('nuevo-banner-file');

            const formData = new FormData();
            formData.append('titulo', titulo);
            formData.append('subtitulo', subtitulo);
            formData.append('link', link);
            if (inputArchivo.files[0]) {
                formData.append('fotoBanner', inputArchivo.files[0]);
            }

            try {
                let url = '[https://justina-store-backend.onrender.com](https://justina-store-backend.onrender.com)api/banners';
                let method = 'POST';

                if (idEdicion) {
                    url = `[https://justina-store-backend.onrender.com](https://justina-store-backend.onrender.com)api/banners/${idEdicion}`;
                    method = 'PUT';
                } else if (!inputArchivo.files[0]) {
                    alert("Por favor seleccioná una imagen para el nuevo banner.");
                    return;
                }

                const res = await fetch(url, {
                    method: method,
                    body: formData
                });

                if (res.ok) {
                    alert(idEdicion ? "¡Banner actualizado con éxito!" : "¡Banner agregado con éxito!");
                    limpiarFormularioBanner();
                    cargarBannersConfig();
                } else {
                    alert("Error al guardar el banner.");
                }
            } catch (err) {
                alert("Error de conexión con el servidor.");
            }
        });
    }

    window.eliminarBannerConfig = async function(id) {
        if (!confirm("¿Estás segura de eliminar este banner?")) return;
        try {
            const res = await fetch(`[https://justina-store-backend.onrender.com](https://justina-store-backend.onrender.com)api/banners/${id}`, { method: 'DELETE' });
            if (res.ok) {
                cargarBannersConfig();
                limpiarFormularioBanner();
            } else {
                alert("No se pudo eliminar el banner.");
            }
        } catch (err) {
            alert("Error de conexión con el servidor.");
        }
    };
});