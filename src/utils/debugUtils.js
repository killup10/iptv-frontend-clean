/**
 * 🔒 Utilidades de debug seguros - Ofuscación de URLs sensibles
 * Previene que URLs de Dropbox y otros servicios se vean en la consola
 */

/**
 * Ofusca una URL para que no sea visible en la consola
 * @param {string} url - URL a ofuscar
 * @returns {string} URL ofuscada segura
 */
export function maskUrl(url) {
  if (!url || typeof url !== 'string') return url;
  
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname;
    const protocol = urlObj.protocol.replace(':', '');
    
    // Ocultar todo excepto el dominio y protocolo
    const lastSlashIdx = url.lastIndexOf('/');
    const pathLength = url.length - lastSlashIdx - 1;
    
    return `${protocol}://${host}/[${pathLength} chars]`;
  } catch {
    // Si no es URL válida, ocultar con puntos suspensivos
    return url.substring(0, 20) + '...[MASKED]';
  }
}

/**
 * Log seguro sin mostrar URLs sensibles
 */
export function safeLog(tag, message, data = null) {
  if (process.env.NODE_ENV !== 'development') return;
  
  let logMessage = `[${tag}] ${message}`;
  let logData = data;
  
  // Ofuscar URLs en el objeto data
  if (data && typeof data === 'object') {
    logData = maskUrlsInObject(data);
  }
  
  if (logData) {
    console.log(logMessage, logData);
  } else {
    console.log(logMessage);
  }
}

/**
 * Reemplaza URLs en un objeto con versiones ofuscadas
 */
function maskUrlsInObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const masked = Array.isArray(obj) ? [...obj] : { ...obj };
  
  for (const key in masked) {
    if (key.toLowerCase().includes('url') || key.toLowerCase().includes('src')) {
      if (typeof masked[key] === 'string') {
        masked[key] = maskUrl(masked[key]);
      }
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskUrlsInObject(masked[key]);
    }
  }
  
  return masked;
}

/**
 * Log de error sin mostrar URLs sensibles
 */
export function safeError(tag, message, error = null) {
  if (process.env.NODE_ENV !== 'development') return;
  
  let errorInfo = error;
  if (error && typeof error === 'object') {
    errorInfo = maskUrlsInObject(error);
  }
  
  console.error(`[${tag}] ${message}`, errorInfo || '');
}
