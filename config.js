// Detecta automáticamente si estás en tu compu (localhost) o en la nube (Vercel)
const API_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000" // Cambialo por tu puerto local del backend si es distinto
    : "https://justina-store-backend.onrender.com";