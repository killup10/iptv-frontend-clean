import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../utils/axiosInstance';

export const useContentAccess = () => {
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessModalData, setAccessModalData] = useState(null);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const { user } = useAuth();

  const checkContentAccess = async (item, onSuccess) => {
    console.log('[useContentAccess] ===== STARTING ACCESS CHECK =====');
    console.log('[useContentAccess] Item received:', item);
    console.log('[useContentAccess] User:', user);
    console.log('[useContentAccess] onSuccess callback:', typeof onSuccess);
    
    try {
      // Si es admin, permitir acceso directo
      if (user?.role === 'admin') {
        console.log('[useContentAccess] Admin user, allowing direct access');
        onSuccess();
        return;
      }

      // Determinar el endpoint correcto según el tipo de contenido
      const itemType = item.itemType || item.tipo;
      const itemId = item.id || item._id;
      
      console.log('[useContentAccess] Item type:', itemType, 'Item ID:', itemId);
      
      let endpoint;
      
      if (itemType === 'channel') {
        endpoint = `/api/channels/id/${itemId}`;
      } else {
        endpoint = `/api/videos/${itemId}`;
      }

      console.log('[useContentAccess] Making request to endpoint:', endpoint);

      // Verificar acceso haciendo una petición GET al endpoint correspondiente
      // Solo necesitamos verificar si el usuario tiene acceso, no los datos completos
      const response = await axiosInstance.get(endpoint);
      
      console.log('[useContentAccess] ✅ Access granted! Response status:', response.status);
      // Si llegamos aquí, el usuario tiene acceso
      onSuccess();
      
    } catch (error) {
      console.log('[useContentAccess] ❌ Access check failed');
      console.log('[useContentAccess] Error status:', error.response?.status);
      console.log('[useContentAccess] Error data:', error.response?.data);
      
      if (error.response?.status === 403) {
        const errorData = error.response.data || {};
        
        console.log('[useContentAccess] 403 error detected, showing modal');
        console.log('[useContentAccess] Error data from backend:', errorData);
        
        // SIEMPRE mostrar modal personalizado para errores 403
        setPendingNavigation(onSuccess);
        setAccessModalData({
          title: item.name || item.title || 'Contenido Premium',
          error: errorData.error || 'Acceso denegado',
          message: errorData.message || 'Tu plan actual no permite acceder a este contenido.',
          currentPlan: errorData.currentPlan || user?.plan || 'gplay',
          requiredPlans: errorData.requiredPlans || ['premium'],
          upgradeMessage: errorData.upgradeMessage || 'Actualiza tu plan para acceder a todo el contenido premium.',
          trialMessage: errorData.trialMessage,
          trialMinutesRemaining: errorData.trialMinutesRemaining || 0,
          trialUsedToday: errorData.trialUsedToday || 0,
          // Guardar información del item para uso posterior
          itemId: item.id || item._id,
          itemType: item.itemType || item.tipo
        });
        
        console.log('[useContentAccess] Setting showAccessModal to true');
        setShowAccessModal(true);
      } else {
        // Otros errores - permitir navegación para que Watch.jsx maneje el error
        console.error('[useContentAccess] Non-403 error, allowing navigation:', error);
        onSuccess();
      }
    }
  };

  const closeAccessModal = () => {
    setShowAccessModal(false);
    setAccessModalData(null);
    setPendingNavigation(null);
  };

  const proceedWithTrial = () => {
    // Si hay tiempo de prueba disponible y navegación pendiente, proceder
    if (accessModalData?.trialMinutesRemaining > 0 && pendingNavigation) {
      try {
        // Persistir un flag para que Watch.jsx haga el fetch con ?useTrial=true
        if (accessModalData?.itemId) {
          localStorage.setItem(`useTrial:${accessModalData.itemId}`, '1');
        }
      } catch (e) {
        console.warn('[useContentAccess] No se pudo persistir flag useTrial en localStorage:', e);
      }
      const navigationCallback = pendingNavigation;
      closeAccessModal();
      navigationCallback();
    }
  };

  return {
    checkContentAccess,
    showAccessModal,
    accessModalData,
    closeAccessModal,
    proceedWithTrial
  };
};
