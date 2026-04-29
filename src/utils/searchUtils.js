/**
 * Normaliza texto removiendo tildes y acentos para bÃºsqueda insensible
 * @param {unknown} text - Texto a normalizar
 * @returns {string} - Texto sin tildes/acentos en minÃºsculas
 */
export function normalizeSearchText(text) {
  if (text === null || text === undefined) return '';

  const rawValue = Array.isArray(text) ? text.join(' ') : String(text);

  return rawValue
    .toLowerCase()
    .replace(/[×✕✖]/g, 'x')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Elimina diacrÃ­ticos
}

/**
 * Busca en un array de objetos ignorando tildes
 * @param {Array} items - Array de items a buscar
 * @param {string} searchTerm - TÃ©rmino de bÃºsqueda
 * @param {Array<string>} searchFields - Campos a buscar (ej: ['title', 'name'])
 * @returns {Array} - Items que coinciden
 */
export function filterBySearchIgnoreAccents(items, searchTerm, searchFields = ['title', 'name']) {
  if (!searchTerm || !items?.length) return items;

  const normalizedSearch = normalizeSearchText(searchTerm);

  return items.filter(item => {
    return searchFields.some(field => {
      const fieldValue = item[field];
      if (fieldValue === null || fieldValue === undefined) return false;

      const normalizedField = normalizeSearchText(fieldValue);
      return normalizedField.includes(normalizedSearch);
    });
  });
}
