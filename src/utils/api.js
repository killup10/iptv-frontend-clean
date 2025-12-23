// src/utils/api.js
import axiosInstance from './axiosInstance.js'; // O usa el alias: import axiosInstance from '@/utils/axiosInstance.js';

/* =================== TV EN VIVO - USUARIO =================== */
export async function fetchUserChannels(sectionName = "Todos") {
  const relativePath = "/api/channels/list";
  const params = {};
  if (sectionName && sectionName.toLowerCase() !== 'todos') {
    params.section = sectionName;
  }
  console.log(`API (fetchUserChannels - axios): GET ${relativePath} con params:`, params);
  try {
    const response = await axiosInstance.get(relativePath, { params });
    return response.data || [];
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Error al cargar canales.";
    console.error(`API Error (fetchUserChannels - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function fetchChannelFilterSections() {
  const relativePath = "/api/channels/sections";
  console.log(`API (fetchChannelFilterSections - axios): GET ${relativePath}`);
  try {
    const response = await axiosInstance.get(relativePath);
    return response.data || [];
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Error al cargar categorías de filtro.";
    console.error(`API Error (fetchChannelFilterSections - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function fetchChannelForPlayback(channelId) {
  const relativePath = `/api/channels/id/${channelId}`;
  console.log(`API (fetchChannelForPlayback - axios): GET ${relativePath}`);
  try {
    const response = await axiosInstance.get(relativePath);
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Error al obtener datos del canal.";
    console.error(`API Error (fetchChannelForPlayback - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

/* =================== VOD - USUARIO =================== */
export async function fetchUserMovies(page = 1, limit = 20, mainSection = null, genre = null, searchTerm = null) {
  const relativePath = "/api/videos";
  const params = { tipo: "pelicula", page, limit };
  if (mainSection) {
    params.mainSection = mainSection;
  }
  if (genre && genre !== 'Todas') {
    params.genre = genre;
  }
  if (searchTerm) {
    // Normalizar búsqueda: eliminar tildes y convertir a minúsculas
    const normalizedSearch = searchTerm
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    params.search = normalizedSearch;
  }
  console.log(`API (fetchUserMovies - axios): GET ${relativePath} con params:`, params);
  try {
    const response = await axiosInstance.get(relativePath, { params });
    return response.data; 
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Error al obtener películas.";
    console.error(`API Error (fetchUserMovies - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function fetchUserSeries(page = 1, limit = 20, subcategoria = "TODOS") {
  const relativePath = "/api/videos";
  const params = { tipo: "serie", page, limit };
  if (subcategoria && subcategoria !== "TODOS") {
    params.subcategoria = subcategoria;
  }
  console.log(`API (fetchUserSeries - axios): GET ${relativePath} con params:`, params);
  try {
    const response = await axiosInstance.get(relativePath, { params });
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Error al obtener series.";
    console.error(`API Error (fetchUserSeries - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function fetchVideosByType(tipo, page = 1, limit = 100) {
  const relativePath = "/api/videos";
  const params = { tipo, page, limit };
  console.log(`API (fetchVideosByType - axios): GET ${relativePath} con params:`, params);
  try {
    const response = await axiosInstance.get(relativePath, { params });
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || `Error al obtener contenido de tipo ${tipo}.`;
    console.error(`API Error (fetchVideosByType - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function fetchVideoById(id) {
  if (!id) {
    console.error('fetchVideoById: ID no proporcionado');
    throw new Error('ID de video no proporcionado');
  }
  
  const relativePath = `/api/videos/${id}`;
  console.log(`API (fetchVideoById - axios): GET ${relativePath}`);
  
  try {
    const response = await axiosInstance.get(relativePath);
    console.log('fetchVideoById response:', response.data);
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Error al obtener video por ID.";
    console.error(`API Error (fetchVideoById - axios): ${errorMsg}`, {
      error: error.response?.data,
      status: error.response?.status,
      url: relativePath
    });
    throw new Error(errorMsg);
  }
}

export async function fetchMainMovieSections() {
  const relativePath = "/api/videos/main-sections";
  console.log(`API (fetchMainMovieSections - axios): GET ${relativePath}`);
  try {
    const response = await axiosInstance.get(relativePath);
    return response.data || [];
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Error al obtener secciones de VOD.";
    console.error(`API Error (fetchMainMovieSections - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

/* =================== USER PROGRESS - CONTINUAR VIENDO =================== */
export async function getUserProgress() {
  const relativePath = "/api/progress";
  try {
    const response = await axiosInstance.get(relativePath);
    return response.data || [];
  } catch (error) {
    console.error("Error fetching user progress:", error.response?.data || error.message);
    return []; // Devuelve un array vacío en caso de error para no romper la UI
  }
}

export async function updateUserProgress(videoId, progress) {
  const relativePath = "/api/progress";
  try {
    // No esperamos una respuesta significativa, solo que se complete
    await axiosInstance.post(relativePath, { videoId, progress });
  } catch (error) {
    console.error("Error updating user progress:", error.response?.data || error.message);
    // El error no se lanza para no interrumpir la reproducción
  }
}

// =========================================================
// FUNCIÓN AÑADIDA PARA CORREGIR EL ERROR
// =========================================================
export async function fetchContinueWatching() {
  try {
    // axiosInstance ya debería tener el token configurado, por lo que la llamada es directa.
    const response = await axiosInstance.get("/api/videos/user/continue-watching");
    return response.data || [];
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message || "Error al cargar 'Continuar Viendo'.";
    console.error(`API Error (fetchContinueWatching - axios): ${errorMsg}`);
    // Devolvemos un array vacío en caso de error para que la aplicación no se rompa.
    return []; 
  }
}

/* =================== DESTACADOS - HOME =================== */
export async function fetchFeaturedChannels() {
  const relativePath = "/api/channels/list";
  const params = { featured: "true" };
  console.log(`API (fetchFeaturedChannels - axios): GET ${relativePath} con params:`, params);
  try {
    const response = await axiosInstance.get(relativePath, { params });
    const data = response.data;
    if (!Array.isArray(data)) {
        console.warn(`API (fetchFeaturedChannels - axios): La respuesta no fue un array, fue:`, data);
        return [];
    }
    return data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Error al cargar canales destacados.";
    console.error(`API Error (fetchFeaturedChannels - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function fetchFeaturedMovies() {
  const relativePath = "/api/videos/public/featured-movies";
  console.log(`API (fetchFeaturedMovies - axios): GET ${relativePath}`);
  try {
    const response = await axiosInstance.get(relativePath);
    const data = response.data;
    if (!Array.isArray(data)) {
        console.warn(`API (fetchFeaturedMovies - axios): La respuesta no fue un array, fue:`, data);
        return [];
    }
    return data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Error al cargar películas destacadas.";
    console.error(`API Error (fetchFeaturedMovies - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function fetchFeaturedSeries() {
  const relativePath = "/api/videos/public/featured-series";
  console.log(`API (fetchFeaturedSeries - axios): GET ${relativePath}`);
  try {
    const response = await axiosInstance.get(relativePath);
    const data = response.data;
    if (!Array.isArray(data)) {
        console.warn(`API (fetchFeaturedSeries - axios): La respuesta no fue un array, fue:`, data);
        return [];
    }
    return data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Error al cargar series destacadas.";
    console.error(`API Error (fetchFeaturedSeries - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function fetchFeaturedAnimes() {
  const relativePath = "/api/videos/public/featured-animes";
  console.log(`API (fetchFeaturedAnimes - axios): GET ${relativePath}`);
  try {
    const response = await axiosInstance.get(relativePath);
    const data = response.data;
    if (!Array.isArray(data)) {
        console.warn(`API (fetchFeaturedAnimes - axios): La respuesta no fue un array, fue:`, data);
        return [];
    }
    return data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Error al cargar animes destacados.";
    console.error(`API Error (fetchFeaturedAnimes - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function fetchFeaturedDoramas() {
  const relativePath = "/api/videos/public/featured-doramas";
  console.log(`API (fetchFeaturedDoramas - axios): GET ${relativePath}`);
  try {
    const response = await axiosInstance.get(relativePath);
    const data = response.data;
    if (!Array.isArray(data)) {
        console.warn(`API (fetchFeaturedDoramas - axios): La respuesta no fue un array, fue:`, data);
        return [];
    }
    return data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Error al cargar doramas destacados.";
    console.error(`API Error (fetchFeaturedDoramas - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function fetchFeaturedNovelas() {
  const relativePath = "/api/videos/public/featured-novelas";
  console.log(`API (fetchFeaturedNovelas - axios): GET ${relativePath}`);
  try {
    const response = await axiosInstance.get(relativePath);
    const data = response.data;
    if (!Array.isArray(data)) {
        console.warn(`API (fetchFeaturedNovelas - axios): La respuesta no fue un array, fue:`, data);
        return [];
    }
    return data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Error al cargar novelas destacadas.";
    console.error(`API Error (fetchFeaturedNovelas - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function fetchFeaturedDocumentales() {
  const relativePath = "/api/videos/public/featured-documentales";
  console.log(`API (fetchFeaturedDocumentales - axios): GET ${relativePath}`);
  try {
    const response = await axiosInstance.get(relativePath);
    const data = response.data;
    if (!Array.isArray(data)) {
        console.warn(`API (fetchFeaturedDocumentales - axios): La respuesta no fue un array, fue:`, data);
        return [];
    }
    return data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Error al cargar documentales destacados.";
    console.error(`API Error (fetchFeaturedDocumentales - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function fetchRecentlyAdded() {
  const relativePath = "/api/videos/public/recently-added";
  console.log(`API (fetchRecentlyAdded - axios): GET ${relativePath}`);
  try {
    const response = await axiosInstance.get(relativePath);
    const data = response.data;
    if (!Array.isArray(data)) {
        console.warn(`API (fetchRecentlyAdded - axios): La respuesta no fue un array, fue:`, data);
        return [];
    }
    return data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Error al cargar contenido recientemente agregado.";
    console.error(`API Error (fetchRecentlyAdded - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

/* =================== ADMIN - CANALES =================== */
export async function fetchAdminChannels() {
  const relativePath = "/api/channels/admin/list";
  console.log(`API (fetchAdminChannels - axios): GET ${relativePath}`);
  try {
    const response = await axiosInstance.get(relativePath);
    return response.data || [];
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Admin: Error al cargar canales.";
    console.error(`API Error (fetchAdminChannels - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function createAdminChannel(channelData) {
  const relativePath = "/api/channels/admin";
  console.log(`API (createAdminChannel - axios): POST ${relativePath} con data:`, channelData);
  try {
    const response = await axiosInstance.post(relativePath, channelData);
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Admin: Error al crear canal.";
    console.error(`API Error (createAdminChannel - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function updateAdminChannel(channelId, channelData) {
  const relativePath = `/api/channels/admin/${channelId}`;
  console.log(`API (updateAdminChannel - axios): PUT ${relativePath} con data:`, channelData);
  try {
    const response = await axiosInstance.put(relativePath, channelData);
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Admin: Error al actualizar canal.";
    console.error(`API Error (updateAdminChannel - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function deleteAdminChannel(channelId) {
  const relativePath = `/api/channels/admin/${channelId}`;
  console.log(`API (deleteAdminChannel - axios): DELETE ${relativePath}`);
  try {
    const response = await axiosInstance.delete(relativePath);
    if (response.status === 204) return { message: "Canal eliminado correctamente." };
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Admin: Error al eliminar canal.";
    console.error(`API Error (deleteAdminChannel - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function processM3UForAdmin(formData) {
  const relativePath = "/api/channels/admin/process-m3u";
  console.log(`API (processM3UForAdmin - axios): POST ${relativePath}`);
  try {
    const response = await axiosInstance.post(relativePath, formData); // Axios maneja FormData Content-Type
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Admin: Error al procesar M3U.";
    console.error(`API Error (processM3UForAdmin - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

/* =================== ADMIN - VIDEOS (VOD) =================== */
export async function fetchAdminVideos() {
  const relativePath = "/api/videos";
  // Pedir explícitamente tipo=pelicula y un límite grande para que el Admin vea todos los VODs de películas
  const params = { view: "admin", tipo: "pelicula", page: 1, limit: 5000 };
  console.log(`API (fetchAdminVideos - axios): GET ${relativePath} con params:`, params);
  try {
    const response = await axiosInstance.get(relativePath, { params });
    return response.data || [];
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Admin: Error al cargar VODs.";
    console.error(`API Error (fetchAdminVideos - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function createAdminVideo(videoData) {
  const relativePath = "/api/videos";
  console.log(`API (createAdminVideo - axios): POST ${relativePath} con data:`, videoData);
  try {
    // Asegurar que subcategoria se envíe si existe
    const payload = { ...videoData };
    if (videoData.subcategoria) {
      payload.subcategoria = videoData.subcategoria;
    }
    const response = await axiosInstance.post(relativePath, payload);
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Admin: Error al crear VOD.";
    console.error(`API Error (createAdminVideo - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function updateAdminVideo(videoId, videoData) {
  const relativePath = `/api/videos/${videoId}`;
  console.log(`API (updateAdminVideo - axios): PUT ${relativePath} con data:`, videoData);
  try {
    const response = await axiosInstance.put(relativePath, videoData);
    return response.data;
  } catch (error) {
    // Prefer detailed backend validation info when available
    const respData = error.response?.data;
    const baseMsg = respData?.error || respData?.message || error.message || "Admin: Error al actualizar VOD.";
    let detailsMsg = '';
    if (respData?.details) {
      try { detailsMsg = ' Details: ' + JSON.stringify(respData.details); } catch (e) { detailsMsg = ' Details present (unserializable).'; }
    }
    const errorMsg = baseMsg + detailsMsg;
    console.error(`API Error (updateAdminVideo - axios): ${errorMsg}`, respData);
    throw new Error(errorMsg);
  }
}

export async function deleteAdminVideo(videoId) {
  const relativePath = `/api/videos/${videoId}`;
  console.log(`API (deleteAdminVideo - axios): DELETE ${relativePath}`);
  try {
    const response = await axiosInstance.delete(relativePath);
    if (response.status === 204) return { message: "VOD eliminado correctamente." };
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Admin: Error al eliminar VOD.";
    console.error(`API Error (deleteAdminVideo - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

/* =================== ADMIN - GESTIÓN DE USUARIOS =================== */

export async function fetchAdminUsers() {
  const relativePath = "/api/admin/users"; // Según definimos en admin.routes.js
  console.log(`API (fetchAdminUsers - axios): GET ${relativePath}`);
  try {
    const response = await axiosInstance.get(relativePath);
    return response.data || []; // Espera un array de usuarios
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message || "Admin: Error al cargar la lista de usuarios.";
    console.error(`API Error (fetchAdminUsers - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function updateAdminUserPlan(userId, plan) {
  const relativePath = `/api/admin/users/${userId}/plan`;
  console.log(`API (updateAdminUserPlan - axios): PUT ${relativePath} con plan: ${plan}`);
  try {
    const response = await axiosInstance.put(relativePath, { plan }); // El cuerpo es { plan: 'nuevoPlan' }
    return response.data; // Espera { message: "...", user: {...} }
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message || "Admin: Error al actualizar el plan del usuario.";
    console.error(`API Error (updateAdminUserPlan - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function updateAdminUserStatus(userId, isActive, expiresAt = null, observations = null) {
  const relativePath = `/api/admin/users/${userId}/status`;
  const payload = { isActive };
  if (expiresAt !== null) { // Solo incluir expiresAt si se proporciona un valor
    payload.expiresAt = expiresAt;
  }
  if (observations !== null) { // Solo incluir observations si se proporciona un valor
    payload.observations = observations;
  }
  console.log(`API (updateAdminUserStatus - axios): PUT ${relativePath} con payload:`, payload);
  try {
    const response = await axiosInstance.put(relativePath, payload); 
    return response.data; // Espera { message: "...", user: {...} }
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message || "Admin: Error al actualizar el estado del usuario.";
    console.error(`API Error (updateAdminUserStatus - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function deleteAdminUser(userId) {
  const relativePath = `/api/admin/users/${userId}`;
  console.log(`API (deleteAdminUser - axios): DELETE ${relativePath}`);
  try {
    const response = await axiosInstance.delete(relativePath);
    return response.data; // Espera { message: "...", user: {...} }
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message || "Admin: Error al eliminar el usuario.";
    console.error(`API Error (deleteAdminUser - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}/* =================== COLLECTIONS =================== */
export async function getCollections() {
  const relativePath = "/api/collections";
  console.log(`API (getCollections - axios): GET ${relativePath}`);
  try {
    const response = await axiosInstance.get(relativePath);
    return response.data || [];
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || "Error al cargar colecciones.";
    console.error(`API Error (getCollections - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function createCollection(name, itemsModel) {
  const relativePath = "/api/collections";
  console.log(`API (createCollection - axios): POST ${relativePath} con data:`, { name, itemsModel });
  try {
    const response = await axiosInstance.post(relativePath, { name, itemsModel });
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || "Error al crear la colección.";
    console.error(`API Error (createCollection - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function addItemsToCollection(collectionId, items) {
    const relativePath = `/api/collections/${collectionId}/items`;
    console.log(`API (addItemsToCollection - axios): PUT ${relativePath} con data:`, { items });
    try {
        const response = await axiosInstance.put(relativePath, { items });
        return response.data;
    } catch (error) {
        const errorMsg = error.response?.data?.error || error.response?.data?.message || "Error al agregar elementos a la colección.";
        console.error(`API Error (addItemsToCollection - axios): ${errorMsg}`, error.response?.data);
        throw new Error(errorMsg);
    }
}

export async function removeItemsFromCollection(collectionId, itemIds) {
    const relativePath = `/api/collections/${collectionId}/items`;
    console.log(`API (removeItemsFromCollection - axios): DELETE ${relativePath} con data:`, { items: itemIds });
    try {
        const response = await axiosInstance.delete(relativePath, { data: { items: itemIds } });
        return response.data;
    } catch (error) {
        const errorMsg = error.response?.data?.error || error.response?.data?.message || "Error al eliminar elementos de la colección.";
        console.error(`API Error (removeItemsFromCollection - axios): ${errorMsg}`, error.response?.data);
        throw new Error(errorMsg);
    }
}

/* =================== MI LISTA =================== */
export async function fetchMyList() {
  const relativePath = "/api/my-list";
  console.log(`API (fetchMyList - axios): GET ${relativePath}`);
  try {
    const response = await axiosInstance.get(relativePath);
    return response.data || [];
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || "Error al cargar mi lista.";
    console.error(`API Error (fetchMyList - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function addToMyList(videoId) {
  const relativePath = "/api/my-list/add";
  console.log(`API (addToMyList - axios): POST ${relativePath} con data:`, { videoId });
  try {
    const response = await axiosInstance.post(relativePath, { videoId });
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || "Error al agregar a mi lista.";
    console.error(`API Error (addToMyList - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function removeFromMyList(videoId) {
  const relativePath = "/api/my-list/remove";
  console.log(`API (removeFromMyList - axios): POST ${relativePath} con data:`, { videoId });
  try {
    const response = await axiosInstance.post(relativePath, { videoId });
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || "Error al remover de mi lista.";
    console.error(`API Error (removeFromMyList - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

/* =================== RECOMENDACIONES =================== */

/**
 * Obtiene recomendaciones similares para un video específico
 * @param {string} videoId - ID del video
 * @param {number} limit - Número máximo de recomendaciones (default: 6)
 * @returns {Promise<Array>} Array de videos recomendados
 */
export async function fetchVideoRecommendations(videoId, limit = 6) {
  const relativePath = `/api/videos/${videoId}/recommendations`;
  const params = { limit };
  console.log(`API (fetchVideoRecommendations - axios): GET ${relativePath} con params:`, params);
  try {
    const response = await axiosInstance.get(relativePath, { params });
    return response.data?.recommendations || [];
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Error al obtener recomendaciones.";
    console.error(`API Error (fetchVideoRecommendations - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

/**
 * Obtiene videos similares filtrados por género
 * @param {string} videoId - ID del video
 * @param {number} limit - Número máximo de resultados (default: 10)
 * @returns {Promise<Array>} Array de videos similares
 */
export async function fetchSimilarByGenre(videoId, limit = 10) {
  const relativePath = `/api/videos/${videoId}/similar-by-genre`;
  const params = { limit };
  console.log(`API (fetchSimilarByGenre - axios): GET ${relativePath} con params:`, params);
  try {
    const response = await axiosInstance.get(relativePath, { params });
    return response.data?.similarVideos || [];
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Error al obtener videos similares.";
    console.error(`API Error (fetchSimilarByGenre - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

/**
 * Obtiene recomendaciones personalizadas basadas en el historial del usuario
 * @param {number} limit - Número máximo de recomendaciones (default: 10)
 * @returns {Promise<Array>} Array de videos recomendados personalizadamente
 */
export async function fetchPersonalizedRecommendations(limit = 10) {
  const relativePath = `/api/videos/recommendations/personalized`;
  const params = { limit };
  console.log(`API (fetchPersonalizedRecommendations - axios): GET ${relativePath} con params:`, params);
  try {
    const response = await axiosInstance.get(relativePath, { params });
    return response.data?.recommendations || [];
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Error al obtener recomendaciones personalizadas.";
    console.error(`API Error (fetchPersonalizedRecommendations - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

/**
 * Obtiene todos los videos de un género específico
 * @param {string} genre - Nombre del género
 * @param {string} tipo - Tipo de contenido (opcional)
 * @param {number} limit - Número máximo de resultados (default: 20)
 * @param {number} page - Número de página (default: 1)
 * @returns {Promise<Object>} Objeto con videos y paginación
 */
export async function fetchVideosByGenre(genre, tipo = null, limit = 20, page = 1) {
  const relativePath = `/api/videos/genre/${genre}`;
  const params = { limit, page };
  if (tipo) {
    params.tipo = tipo;
  }
  console.log(`API (fetchVideosByGenre - axios): GET ${relativePath} con params:`, params);
  try {
    const response = await axiosInstance.get(relativePath, { params });
    return {
      videos: response.data?.videos || [],
      total: response.data?.total || 0,
      page: response.data?.page || 1,
      pages: response.data?.pages || 0
    };
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Error al obtener videos por género.";
    console.error(`API Error (fetchVideosByGenre - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}