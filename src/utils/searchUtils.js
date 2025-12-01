/**
 * Normaliza texto removiendo tildes y acentos para búsqueda insensible
 * @param {string} text - Texto a normalizar
 * @returns {string} - Texto sin tildes/acentos en minúsculas
 */
export function normalizeSearchText(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Elimina diacríticos
}

/**
 * Busca en un array de objetos ignorando tildes
 * @param {Array} items - Array de items a buscar
 * @param {string} searchTerm - Término de búsqueda
 * @param {Array<string>} searchFields - Campos a buscar (ej: ['title', 'name'])
 * @returns {Array} - Items que coinciden
 */
export function filterBySearchIgnoreAccents(items, searchTerm, searchFields = ['title', 'name']) {
  if (!searchTerm || !items?.length) return items;
  
  const normalizedSearch = normalizeSearchText(searchTerm);
  
  return items.filter(item => {
    return searchFields.some(field => {
      const fieldValue = item[field];
      if (!fieldValue || typeof fieldValue !== 'string') return false;
      
      const normalizedField = normalizeSearchText(fieldValue);
      return normalizedField.includes(normalizedSearch);
    });
  });
}
