// ====================================================================
// CARGAR BASE DE DATOS 
// ====================================================================
async function cargarBaseDeDatos() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/productos');

        if (!respuesta.ok) {
            throw new Error('No se pudo obtener la respuesta del servidor');
        }

        productos = await respuesta.json();
        mostrarProductosEnPantalla(productos);
    } catch (error) {
        console.error("Error al conectar con el backend:", error);
        if (grilla) {
            grilla.innerHTML = `
            <p style="text-align:center; width:100%; color:red;">
            No se pudieron cargar los productos. Asegurate de que tu terminal con <b>node server.js</b> esté corriendo.
            </p>`;
        }
    }
}

