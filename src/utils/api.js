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
export async function fetchUserMovies() {
  const relativePath = "/api/videos";
  const params = { tipo: "pelicula", page: 1, limit: 5000 };
  console.log(`API (fetchUserMovies - axios): GET ${relativePath} con params:`, params);
  try {
    const response = await axiosInstance.get(relativePath, { params });
    // CORRECCIÓN: Faltaba devolver los datos en esta función
    return response.data?.videos || []; 
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Error al obtener películas.";
    console.error(`API Error (fetchUserMovies - axios): ${errorMsg}`, error.response?.data);
    throw new Error(errorMsg);
  }
}

export async function fetchUserSeries() {
  const relativePath = "/api/videos";
  const params = { tipo: "serie", page: 1, limit: 1000 };
  console.log(`API (fetchUserSeries - axios): GET ${relativePath} con params:`, params);
  try {
    const response = await axiosInstance.get(relativePath, { params });
    const seriesData = Array.isArray(response.data?.videos) ? response.data.videos : Array.isArray(response.data) ? response.data : [];
    console.log('Series cargadas:', seriesData);
    return seriesData.map(serie => ({
      ...serie,
      // No asignar valor por defecto "Netflix" para animes
      subcategoria: (serie.tipo === "anime" || (serie.tipo === "serie" && serie.subtipo === "anime")) ? undefined : (serie.subcategoria || "Netflix")
    }));
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Error al obtener series.";
    console.error(`API Error (fetchUserSeries - axios): ${errorMsg}`, error.response?.data);
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

export async function updateAdminUserStatus(userId, isActive, expiresAt = null) {
  const relativePath = `/api/admin/users/${userId}/status`;
  const payload = { isActive };
  if (expiresAt !== null) { // Solo incluir expiresAt si se proporciona un valor
    payload.expiresAt = expiresAt;
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
