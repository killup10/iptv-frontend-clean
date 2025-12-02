/**
 * 🔒 Utilidades para usar el proxy seguro de streams
 * 
 * Beneficios:
 * 1. URLs no se exponen en console del navegador
 * 2. Resuelve problemas de CORS con ciertos M3U8
 * 3. User-Agent configurable para CDNs restringidos
 * 4. Caching del servidor backend
 */

/**
 * Obtiene URL proxificada para un stream
 * @param {string} streamUrl - URL original del stream
 * @param {boolean} useProxy - Si usar proxy (default: true para URLs HTTPS o Dropbox)
 * @returns {string} URL proxificada o original
 */
export function getProxiedStreamUrl(streamUrl, useProxy = null) {
  if (!streamUrl) return '';

  // Auto-detectar si usar proxy
  if (useProxy === null) {
    useProxy = shouldUseProxy(streamUrl);
  }

  if (!useProxy) {
    return streamUrl;
  }

  try {
    // Codificar URL en base64 para seguridad
    const encoded = btoa(streamUrl);
    // Usar API proxy del backend
    return `/api/channels/proxy/stream?url=${encoded}`;
  } catch (error) {
    console.error('[StreamProxy] Error codificando URL:', error);
    return streamUrl; // Fallback a URL original
  }
}

/**
 * Detecta si una URL debería usar proxy
 */
function shouldUseProxy(url) {
  if (!url) return false;

  const urlLower = url.toLowerCase();

  // URLs que DEBEN usar proxy:
  // - Dropbox: problemas de CORS
  // - HTTPS: muchos CDNs tienen restricciones
  // - URLs con .m3u8 HTTPS: especialmente problématicas
  // - URLs con .m3u HTTPS
  
  return (
    urlLower.includes('dropbox') ||
    urlLower.includes('live-evg') ||
    urlLower.includes('tv360') ||
    urlLower.includes('.m3u8') ||  // Todos los M3U8
    urlLower.includes('.m3u') ||   // Todos los M3U
    urlLower.includes('https://') ||  // Todas las URLs HTTPS
    urlLower.includes('origin-')
  );
}

/**
 * Wrapper para fetch de streams con reintentos y timeouts
 */
export async function fetchStreamWithRetry(streamUrl, options = {}) {
  const {
    retries = 3,
    timeout = 15000,
    useProxy = null,
  } = options;

  const proxiedUrl = getProxiedStreamUrl(streamUrl, useProxy);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[StreamFetch] Intento ${attempt}/${retries} para ${proxiedUrl === streamUrl ? 'stream directo' : 'stream proxificado'}`);

      const response = await fetch(proxiedUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL',
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`[StreamFetch] ✅ Stream cargado correctamente`);
        return response;
      }

      if (response.status === 404 || response.status === 403) {
        console.error(`[StreamFetch] ❌ Error ${response.status}: Stream no disponible`);
        throw new Error(`Stream error: ${response.status}`);
      }

      // Reintentar en caso de errores temporales
      if (attempt < retries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
        console.log(`[StreamFetch] Reintentando en ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        console.error(`[StreamFetch] ⏱️ Timeout después de ${timeout}ms`);
      } else {
        console.error(`[StreamFetch] Error en intento ${attempt}: ${error.message}`);
      }

      if (attempt === retries) {
        throw error;
      }
    }
  }
}
