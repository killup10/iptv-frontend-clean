import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Mic } from 'lucide-react';
import { isAndroidTV } from '../utils/platformUtils';
import './SearchBar.css';

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
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const isTV = isAndroidTV();

  // Debug: Loguear items disponibles
  useEffect(() => {
    console.log('[SearchBar] Items disponibles:', items.length, items.slice(0, 5));
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
        setSearchQuery('');
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

  // Control de voz para TV
  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Tu dispositivo no soporta búsqueda por voz');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;

    setIsListening(true);

    recognition.onstart = () => {
      console.log('Escuchando...');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      setSearchQuery(transcript);
      performSearch(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Error de voz:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
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
    <div className={`search-bar-container ${isTV ? 'tv' : ''}`}>
      {/* Botón de búsqueda */}
      <button
        className="search-trigger-button"
        onClick={() => setIsOpen(true)}
        title={isTV ? "Presiona / para buscar" : "Click para buscar"}
      >
        <Search size={isTV ? 28 : 20} />
        <span className="search-trigger-text">{isTV ? "Buscar" : ""}</span>
      </button>

      {/* Modal de búsqueda */}
      {isOpen && (
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
                <button
                  className="search-close"
                  onClick={() => setIsOpen(false)}
                >
                  <X size={isTV ? 24 : 18} />
                </button>
              </div>

            </div>

            {/* Resultados */}
            <div className="search-results">
              {isListening && (
                <div className="search-listening">
                  <div className="listening-indicator"></div>
                  <p>Escuchando...</p>
                </div>
              )}

              {!isListening && results.length > 0 && (
                <div className="results-list" ref={listRef}>
                  {results.map((item, index) => (
                    <div
                      key={`${item.id || item._id}-${index}`}
                      className={`result-item ${index === selectedIndex ? 'selected' : ''}`}
                      onClick={() => handleSelectItem(item)}
                    >
                      <img
                        src={item.thumbnail || item.customThumbnail || item.tmdbThumbnail || item.logo || item.image || item.poster || '/placeholder.png'}
                        alt={item.name || item.title}
                        className="result-image"
                        onError={(e) => { e.currentTarget.src = '/placeholder.png'; }}
                      />
                      <div className="result-info">
                        <div className="result-name">{item.name || item.title}</div>
                        <div className="result-meta">
                          {item.type && <span className="result-type">{item.type}</span>}
                          {item.genre && <span className="result-genre">{item.genre}</span>}
                          {item.year && <span className="result-year">{item.year}</span>}
                        </div>
                      </div>
                      {index === selectedIndex && isTV && (
                        <div className="result-focus-indicator">▶</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!isListening && searchQuery && results.length === 0 && (
                <div className="search-no-results">
                  <p>No se encontraron resultados para "{searchQuery}"</p>
                </div>
              )}

              {!searchQuery && !isListening && (
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
      )}
    </div>
  );
}
