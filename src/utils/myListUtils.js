import axiosInstance from './axiosInstance.js';

export const MY_LIST_UPDATED_EVENT = 'teamg:my-list-updated';

function emitMyListUpdated(detail) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(MY_LIST_UPDATED_EVENT, { detail }));
}

export async function addItemToMyList(item) {
  const itemId = item?._id || item?.id || item?.itemId;
  if (!itemId) {
    throw new Error('Contenido sin identificador valido.');
  }

  const resolvedType = item?.tipo || item?.itemType || item?.type || 'movie';
  const resolvedTitle = item?.name || item?.title || item?.titulo || 'Contenido';
  const resolvedThumbnail = item?.customThumbnail
    || item?.thumbnail
    || item?.poster
    || item?.image
    || item?.logo
    || '';
  const resolvedDescription = item?.description
    || item?.descripcion
    || item?.overview
    || item?.plot
    || '';

  try {
    await axiosInstance.post('/api/users/my-list/add', {
      itemId,
      tipo: resolvedType,
      title: resolvedTitle,
      thumbnail: resolvedThumbnail,
      description: resolvedDescription,
    });

    emitMyListUpdated({
      action: 'added',
      itemId: String(itemId),
      tipo: resolvedType,
    });

    return { status: 'added' };
  } catch (error) {
    if (error?.response?.status === 409) {
      return { status: 'duplicate' };
    }

    throw new Error(error?.response?.data?.error || error?.message || 'No se pudo agregar a Mi Lista.');
  }
}
