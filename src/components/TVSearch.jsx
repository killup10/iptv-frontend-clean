import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MagnifyingGlassIcon, MicrophoneIcon } from '@heroicons/react/24/solid';
import { isAndroidTV } from '../utils/platformUtils';
import './TVSearch.css';

/**
 * TVSearch - Búsqueda ultra-rápida para Android TV
 * Características:
 * - Filtrado instantáneo digito por digito
 * - Control de voz (speech recognition)
 * - Búsqueda en todos los contenidos (canales, películas, series, etc)
 * - Navegación con D-Pad
 */
export default function TVSearch({ 
  allContent = [], // Array con todos los items { name, title, type, id, image, etc }
  onSelectItem,
  onClose 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredResults, setFilteredResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const searchInputRef = useRef(null);
  const resultsContainerRef = useRef(null);
  const recognitionRef = useRef(null);

  // Inicializar Speech Recognition
  useEffect(() => {
    if (!isAndroidTV()) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition no disponible');
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'es-ES';

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      setVoiceError('');
    };

    recognitionRef.current.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setSearchQuery(prev => prev + transcript);
        } else {
          interimTranscript += transcript;
        }
      }
    };

    recognitionRef.current.onerror = (event) => {
      setVoiceError(`Error: ${event.error}`);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Filtrar resultados instantáneamente
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredResults([]);
      setSelectedIndex(0);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = allContent
      .filter(item => {
        const name = (item.name || item.title || '').toLowerCase();
        return name.includes(query);
      })
      .slice(0, 50); // Limitar a 50 resultados para rendimiento

    setFilteredResults(results);
    setSelectedIndex(0);
  }, [searchQuery, allContent]);

  // Auto-scroll al item seleccionado
  useEffect(() => {
    const selectedElement = document.querySelector(`[data-result-index="${selectedIndex}"]`);
    if (selectedElement && resultsContainerRef.current) {
      selectedElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, [selectedIndex]);

  // Manejo de navegación D-Pad
  const handleKeyDown = useCallback((e) => {
    const key = e.key;

    // Arrow Down: siguiente resultado
    if (key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredResults.length - 1));
    }
    // Arrow Up: resultado anterior
    else if (key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    }
    // Enter: seleccionar item
    else if (key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        handleSelectResult(filteredResults[selectedIndex]);
      }
    }
    // Backspace: borrar último carácter
    else if (key === 'Backspace') {
      e.preventDefault();
      setSearchQuery(prev => prev.slice(0, -1));
    }
    // Escape: cerrar búsqueda
    else if (key === 'Escape') {
      e.preventDefault();
      onClose?.();
    }
    // Caracteres normales
    else if (key.length === 1 && /[a-zA-Z0-9\s]/.test(key)) {
      e.preventDefault();
      setSearchQuery(prev => prev + key);
    }
  }, [filteredResults, selectedIndex, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Focus en input al montar
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const handleSelectResult = (item) => {
    if (onSelectItem) {
      onSelectItem(item);
    }
  };

  const toggleVoiceSearch = () => {
    if (isListening) {
      recognitionRef.current?.abort();
      setIsListening(false);
    } else {
      setSearchQuery(''); // Limpiar búsqueda anterior
      recognitionRef.current?.start();
    }
  };

  const getItemTypeColor = (type) => {
    const colors = {
      'channel': '#FF6B6B',
      'movie': '#4ECDC4',
      'serie': '#45B7D1',
      'series': '#45B7D1',
      'anime': '#F7DC6F',
      'dorama': '#BB8FCE',
      'novela': '#F8B88B',
      'documental': '#85C1E2'
    };
    return colors[type?.toLowerCase()] || '#999';
  };

  return (
    <div className="tv-search-overlay">
      <div className="tv-search-container">
        {/* Header */}
        <div className="tv-search-header">
          <h1 className="tv-search-title">Buscar en TeamG Play</h1>
          <p className="tv-search-subtitle">
            {isListening ? '🎤 Escuchando...' : 'Escribe o usa voz para buscar'}
          </p>
        </div>

        {/* Input y Voz */}
        <div className="tv-search-input-wrapper">
          <div className="tv-search-input-box">
            <MagnifyingGlassIcon className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Escribe para buscar (EX, GOT, Netflix...)"
              className="tv-search-input"
              autoComplete="off"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="search-clear-btn"
                aria-label="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={toggleVoiceSearch}
            className={`tv-search-voice-btn ${isListening ? 'listening' : ''}`}
            aria-label="Búsqueda por voz"
          >
            <MicrophoneIcon className="voice-icon" />
          </button>
        </div>

        {voiceError && (
          <div className="tv-search-error">
            {voiceError}
          </div>
        )}

        {/* Resultados */}
        <div className="tv-search-results-wrapper">
          {filteredResults.length > 0 ? (
            <div ref={resultsContainerRef} className="tv-search-results">
              {filteredResults.map((item, index) => (
                <div
                  key={`${item.id || item._id}-${index}`}
                  data-result-index={index}
                  className={`tv-search-result-item ${index === selectedIndex ? 'focused' : ''}`}
                  onClick={() => handleSelectResult(item)}
                >
                  <div className="result-image">
                    <img
                      src={item.image || item.logo || item.poster || '/placeholder.png'}
                      alt={item.name || item.title}
                      className="result-poster"
                    />
                    <div 
                      className="result-type-badge"
                      style={{ backgroundColor: getItemTypeColor(item.type || item.itemType) }}
                    >
                      {(item.type || item.itemType || 'Contenido').toUpperCase()}
                    </div>
                  </div>

                  <div className="result-info">
                    <h3 className="result-name">{item.name || item.title}</h3>
                    {item.description && (
                      <p className="result-description">{item.description.substring(0, 80)}...</p>
                    )}
                    {item.year && (
                      <span className="result-year">{item.year}</span>
                    )}
                  </div>

                  {index === selectedIndex && (
                    <div className="result-focus-indicator">
                      <div className="focus-glow"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : searchQuery ? (
            <div className="tv-search-no-results">
              <p>No se encontraron resultados para "{searchQuery}"</p>
              <p className="subtitle">Intenta con otra búsqueda</p>
            </div>
          ) : (
            <div className="tv-search-empty">
              <p>🔍 Comienza a escribir para buscar</p>
              <p className="subtitle">o usa el botón 🎤 para búsqueda por voz</p>
            </div>
          )}
        </div>

        {/* Instrucciones */}
        <div className="tv-search-instructions">
          <span>↑↓ Navegar</span>
          <span>•</span>
          <span>OK Seleccionar</span>
          <span>•</span>
          <span>⌫ Borrar</span>
          <span>•</span>
          <span>ESC Cerrar</span>
        </div>
      </div>
    </div>
  );
}
