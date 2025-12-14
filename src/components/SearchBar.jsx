import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Search, X, Mic } from 'lucide-react';
import { isAndroidTV } from '../utils/platformUtils';
import { checkAndRequestMicrophonePermission, supportsSpeechRecognition } from '../utils/microphonePermission';
import { App as CapacitorApp } from '@capacitor/app';

/**
 * Normaliza texto: elimina tildes y convierte a minúsculas
 * 'América' -> 'america'
 * 'SERIE' -> 'serie'
 */
function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Elimina diacríticos
}

/**
 * SearchBar - Buscador global ultra-rápido
 * Funciona en Web, Mobile y TV
 * - Búsqueda instantánea (digito por digito)
 * - Soporte para control de voz en TV
 * - Resultados en tiempo real
 * - SIN diferenciar tildes/mayúsculas
 */
export default function SearchBar({ 
  items = [], 
  onSelectItem,
  onSearchChange,
  placeholder = "Buscar canales, películas, series..."
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const isTV = isAndroidTV();

  // Debug: Loguear items disponibles
  useEffect(() => {
    // console.log('[SearchBar] Items disponibles:', items.length, items.slice(0, 5));
  }, [items]);

  // Búsqueda ultra-rápida (debounce muy corto para TV)
  const performSearch = useCallback((query) => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    // Normaliza la búsqueda (sin tildes, mayúsculas)
    const normalizedQuery = normalizeText(query);
    
    const filtered = items.filter(item => {
      const name = normalizeText(item.name || item.title || '');
      const description = normalizeText(item.description || '');
      const genre = normalizeText(item.genre || '');
      
      return (
        name.includes(normalizedQuery) ||
        description.includes(normalizedQuery) ||
        genre.includes(normalizedQuery)
      );
    }).slice(0, 20); // Máximo 20 resultados

    setResults(filtered);
    setSelectedIndex(0);
    onSearchChange?.(filtered);
  }, [items, onSearchChange]);

  // Manejo de búsqueda con input
  const handleSearchInput = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    performSearch(query);
  };

  // Teclas en TV
  const handleKeyDown = (e) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(0, prev - 1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(results.length - 1, prev + 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelectItem(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  // Manejador de selección
  const handleSelectItem = (item) => {
    onSelectItem?.(item);
    setIsOpen(false);
    setSearchQuery('');
    setResults([]);
  };

  // Control de voz mejorado
  const startVoiceSearch = async () => {
    setVoiceError('');
    
    // Verificar soporte de Web Speech API
    if (!supportsSpeechRecognition()) {
      setVoiceError('Tu dispositivo no soporta la búsqueda por voz.');
      return;
    }

    try {
      // Solicitar permiso de micrófono
      console.log('[SearchBar] 🎤 Solicitando permiso de micrófono...');
      const hasPermission = await checkAndRequestMicrophonePermission();
      
      if (!hasPermission) {
        setVoiceError('🔒 PERMISO DENEGADO: Abre Ajustes > Aplicaciones > TeamG Play > Permisos > Micrófono y ACTÍVALO.\n\nLuego vuelve e intenta de nuevo.');
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'es-ES';
      recognition.continuous = false;
      recognition.interimResults = false;

      setIsListening(true);

      recognition.onstart = () => {
        console.log('[SearchBar] 🎤 Escuchando...');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('[SearchBar] ✅ Transcripción:', transcript);
        setSearchQuery(transcript);
        performSearch(transcript);
      };

      recognition.onerror = (event) => {
        console.error('[SearchBar] ❌ Error de reconocimiento de voz:', event.error);
        let errorMsg = 'Ocurrió un error con la búsqueda por voz.';
        
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          errorMsg = '🔒 Permiso denegado: Ve a Ajustes > Aplicaciones > TeamG Play > Permisos > Micrófono y actívalo.';
        } else if (event.error === 'no-speech') {
          errorMsg = '🔇 No se detectó audio. Por favor, intenta de nuevo más cerca del micrófono.';
        } else if (event.error === 'network') {
          errorMsg = '🌐 Error de conexión. Verifica tu conexión a internet.';
        } else if (event.error === 'bad-grammar') {
          errorMsg = '❌ No entendí bien. Intenta hablar más claro.';
        } else if (event.error === 'aborted') {
          errorMsg = '⏹️ Búsqueda cancelada.';
        }
        
        setVoiceError(errorMsg);
        setIsListening(false);
      };

      recognition.onend = () => {
        console.log('[SearchBar] 🏁 Reconocimiento finalizado');
        setIsListening(false);
      };

      console.log('[SearchBar] 🚀 Iniciando reconocimiento de voz...');
      recognition.start();
    } catch (err) {
      console.error('[SearchBar] ❌ Error iniciando reconocimiento de voz:', err);
      setVoiceError('No se pudo iniciar la búsqueda por voz.');
      setIsListening(false);
    }
  };


  // Auto-scroll en resultados
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedElement = listRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedIndex]);

  // Focus al abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // 🔥 NUEVO: Manejar el botón atrás del dispositivo (Android)
  useEffect(() => {
    let handleRef = null;
    let unsub = null;

    const setupBackButton = async () => {
      try {
        if (isOpen && CapacitorApp.addListener) {
          // 🔥 NUEVO: Setear flag global para que App.jsx NO navegue
          window.searchBarOpen = true;
          console.log('[SearchBar] 🔥 SearchBar abierto - flag global seteada');
          
          const handle = await CapacitorApp.addListener('backButton', () => {
            console.log('[SearchBar] 🔥 Back button presionado - cerrando búsqueda');
            setIsOpen(false);
            setSearchQuery('');
            setResults([]);
            window.searchBarOpen = false;
          });
          handleRef = handle;
          if (handle && typeof handle.remove === 'function') {
            unsub = () => handle.remove();
          } else if (typeof handle === 'function') {
            unsub = handle;
          }
        } else {
          // 🔥 NUEVO: Limpiar flag cuando se cierra
          window.searchBarOpen = false;
        }
      } catch (err) {
        console.warn('[SearchBar] Error al configurar backButton listener:', err);
        window.searchBarOpen = false;
      }
    };

    setupBackButton();

    return () => {
      try {
        if (typeof unsub === 'function') {
          unsub();
        } else if (handleRef && typeof handleRef.remove === 'function') {
          handleRef.remove();
        }
        window.searchBarOpen = false;
      } catch (err) {
        console.warn('[SearchBar] Error removiendo backButton listener:', err);
      }
    };
  }, [isOpen]);

  // Tecla "/" o "/" para abrir búsqueda
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // "/" en teclado
      if ((e.key === '/' || e.key === '?') && !isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
      // "/" o "buscar" en TV
      if (isTV && e.key === 's' && e.ctrlKey && !isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, isTV]);

  return (
    <>
    <style>{`
/* SearchBar - Diseño de Input Sutil */
.search-bar-container {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 320px; /* Ancho moderado para desktop */
}

/* Botón de Búsqueda Rectangular */
.search-trigger-button {
  display: flex;
  align-items: center;
  justify-content: space-between; /* Alinear texto a la izquierda e icono a la derecha */
  width: 100%;
  padding: 0.6rem 0.9rem;
  background-color: rgba(30, 41, 59, 0.6); /* Fondo oscuro semitransparente */
  border: 1px solid #334155; /* Borde sutil */
  border-radius: 0.625rem; /* Bordes redondeados */
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease; /* Transición sutil */
  backdrop-filter: blur(5px);
}

.search-trigger-button:hover {
  border-color: #94a3b8; /* Gris claro en hover */
  background-color: rgba(30, 41, 59, 0.8);
}

.search-trigger-text {
  font-size: 0.9rem;
  color: #94a3b8; /* Color de placeholder */
  font-weight: 400;
  margin-right: 0.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-trigger-icon {
  color: #94a3b8; /* Lupa gris */
  flex-shrink: 0; /* Evita que el icono se encoja */
}


/* Overlay y Modal (sin cambios) */
.search-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  z-index: 99999;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 5vh;
}

.search-modal {
  width: 100%;
  max-width: 800px; /* Un poco más ancho para el grid */
  background-color: #0f172a;
  border-radius: 1rem;
  border: 1px solid #1e293b;
  display: flex;
  flex-direction: column;
  max-height: 85vh;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
}

.search-header {
  padding: 1.5rem;
  border-bottom: 1px solid #1e293b;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.search-icon {
  position: absolute;
  left: 1rem;
  color: #94a3b8;
  flex-shrink: 0;
}

.search-input {
  width: 100%;
  padding: 0.875rem 2.5rem 0.875rem 3.5rem;
  background-color: #1e293b;
  border-radius: 0.75rem;
  border: 2px solid #334155;
  color: white;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.2s;
}

.search-input::placeholder {
  color: #64748b;
}

.search-input:focus {
  outline: none;
  border-color: #e5e7eb;
  background-color: #0f172a;
}

.search-clear {
  position: absolute;
  right: 3.5rem;
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.5rem;
  transition: all 0.2s;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-clear:hover {
  color: #ef4444;
  background-color: rgba(239, 68, 68, 0.1);
}

.search-voice-button {
  position: absolute;
  right: 0.5rem;
  padding: 0.5rem;
  background-color: transparent;
  border: none;
  color: #64748b;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.search-voice-button.listening {
  color: #e5e7eb;
}

.search-voice-button:hover:not(:disabled) {
  color: #e5e7eb;
}

/* --- NUEVO DISEÑO DE RESULTADOS EN GRID --- */
.search-results {
  flex-grow: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.results-list {
  display: grid;
  /* Grid responsivo: se ajusta automáticamente */
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1.25rem;
}

/* Tarjeta de resultado */
.result-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 2px solid transparent;
  background-color: #1e293b;
  overflow: hidden;
}

.result-item.selected {
  border-color: #e5e7eb; /* Borde blanco/gris para selección */
  transform: scale(1.05);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
}

.result-image {
  width: 100%;
  height: 180px;
  object-fit: cover;
  border-radius: 0;
  border-bottom: 1px solid #334155;
  background-color: #0f172a; /* Fondo para imágenes que no cargan */
}

.result-info {
  padding: 0.5rem 0.75rem 0.75rem;
  min-width: 0;
}

.result-name {
  font-weight: 600;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.35rem;
  font-size: 0.875rem;
}

.result-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.result-year {
  font-weight: 500;
  color: #94a3b8;
}

/* Categoría con estilo neutro */
.result-category {
  background-color: #334155;
  color: #cbd5e1;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: 600;
  text-transform: capitalize;
  font-size: 0.7rem;
}

.result-focus-indicator {
  /* El borde en .selected es suficiente */
  display: none;
}

/* --- FIN DISEÑO DE GRID --- */

.search-no-results, .search-hints, .search-listening, .search-voice-error {
  text-align: center;
  padding: 2.5rem 1rem;
  color: #94a3b8;
}

.search-voice-error {
  color: #f87171; /* Color rojo para errores */
}

/* Mobile */
@media (max-width: 640px) {
  .search-bar-container {
    max-width: none;
  }
  .search-overlay {
    padding: 0;
  }
  .search-modal {
    max-width: 100%;
    height: 100%;
    max-height: 100%;
    border-radius: 0;
  }
  .results-list {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 1rem;
  }
  .result-image {
    height: 150px;
  }
}

/* TV y pantallas grandes */
@media (min-width: 1280px) {
  .results-list {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1.5rem;
  }
  .result-image {
    height: 220px;
  }
}
    `}</style>
    <div className={`search-bar-container ${isTV ? 'tv' : ''}`}>
      {/* Botón de búsqueda con nuevo diseño tipo input */}
      <button
        className="search-trigger-button"
        onClick={() => setIsOpen(true)}
        title={isTV ? "Presiona / para buscar" : "Click para buscar"}
      >
        <span className="search-trigger-text">Busca aquí...</span>
        <Search size={isTV ? 22 : 18} className="search-trigger-icon" />
      </button>

      {/* Modal de búsqueda - renderizado como portal para estar al frente de todo */}
      {isOpen && ReactDOM.createPortal(
        <div className="search-overlay" onClick={() => setIsOpen(false)}>
          <div className="search-modal" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="search-header">
              <div className="search-input-wrapper">
                <Search size={isTV ? 24 : 18} className="search-icon" />
                <input
                  ref={inputRef}
                  type="text"
                  className="search-input"
                  placeholder={placeholder}
                  value={searchQuery}
                  onChange={handleSearchInput}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
                {searchQuery && (
                  <button
                    className="search-clear"
                    onClick={() => {
                      setSearchQuery('');
                      setResults([]);
                      inputRef.current?.focus();
                    }}
                    title="Limpiar búsqueda"
                  >
                    <X size={isTV ? 24 : 18} />
                  </button>
                )}
                <button
                  className={`search-voice-button ${isListening ? 'listening' : ''}`}
                  onClick={startVoiceSearch}
                  disabled={isListening}
                  title="Búsqueda por voz"
                >
                  <Mic size={24} />
                </button>
              </div>

            </div>

            {/* Resultados en Grid */}
            <div className="search-results">
              {isListening && (
                <div className="search-listening">
                  <p>Escuchando...</p>
                </div>
              )}

              {voiceError && (
                <div className="search-voice-error">
                  <p>{voiceError}</p>
                </div>
              )}

              {!isListening && !voiceError && results.length > 0 && (
                <div className="results-list" ref={listRef}>
                  {results.map((item, index) => (
                    <div
                      key={`${item.id || item._id}-${index}`}
                      className={`result-item ${index === selectedIndex ? 'selected' : ''}`}
                      onClick={() => handleSelectItem(item)}
                    >
                      <img
                        src={item.customThumbnail || item.thumbnail || item.image || item.logo || item.poster || item.tmdbThumbnail || '/img/placeholder-thumbnail.png'}
                        alt={item.name || item.title}
                        className="result-image"
                        onError={(e) => { e.target.onerror = null; e.target.src='/img/placeholder-thumbnail.png'; }}
                      />
                      <div className="result-info">
                        <div className="result-name">{item.name || item.title}</div>
                        <div className="result-meta">
                          {(item.releaseYear || item.year) && <span className="result-year">{item.releaseYear || item.year}</span>}
                          {item.type && <span className="result-category">{item.type}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isListening && !voiceError && searchQuery && results.length === 0 && (
                <div className="search-no-results">
                  <p>No se encontraron resultados para "{searchQuery}"</p>
                </div>
              )}

              {!searchQuery && !isListening && !voiceError && (
                <div className="search-hints">
                  <p>💡 Escribe para buscar canales, películas, series...</p>
                  {isTV && (
                    <p>🎤 O presiona el botón de micrófono para búsqueda por voz</p>
                  )}
                </div>
              )}
            </div>

            {/* Footer con instrucciones */}
            {isTV && results.length > 0 && (
              <div className="search-instructions">
                <span>↑↓ Navegar</span>
                <span>|</span>
                <span>OK Seleccionar</span>
                <span>|</span>
                <span>ESC Cerrar</span>
              </div>
            )}
          </div>
        </div>
      , document.body)}
    </div>
    </>
  );
}
