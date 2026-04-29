import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MagnifyingGlassIcon, MicrophoneIcon } from '@heroicons/react/24/solid';
import './TVSearch.css';
import {
  focusTVContent,
  getTVFocusZone,
  setTVFocusZone,
  TV_FOCUS_ZONE_MODAL,
} from '../utils/tvFocusZone.js';
import {
  getTVItemDescription,
  getTVItemGenre,
  getTVItemImage,
  getTVItemQualityBadges,
  getTVItemTitle,
  getTVItemYear,
  resolveTVItemType,
} from '../utils/tvContentUtils.js';
import {
  checkAndRequestMicrophonePermission,
  supportsSpeechRecognition,
} from '../utils/microphonePermission.js';
import { normalizeSearchText } from '../utils/searchUtils.js';

function buildSearchIndex(item) {
  return normalizeSearchText([
    getTVItemTitle(item),
    getTVItemDescription(item),
    getTVItemGenre(item),
    item?.section,
    item?.mainSection,
    item?.subcategoria,
    item?.channelName,
    item?.title,
    item?.titulo,
    item?.name,
  ].filter(Boolean).join(' '));
}

function resolveAction(event) {
  switch (event.key) {
    case 'ArrowUp':
    case 'ArrowDown':
    case 'ArrowLeft':
    case 'ArrowRight':
    case 'Enter':
      return event.key;
    case ' ':
    case 'Spacebar':
    case 'Select':
    case 'MediaPlayPause':
      return 'Enter';
    case 'Backspace':
    case 'Delete':
      return 'delete';
    case 'Escape':
    case 'GoBack':
    case 'BrowserBack':
      return 'close';
    default:
      break;
  }

  switch (event.keyCode) {
    case 19:
      return 'ArrowUp';
    case 20:
      return 'ArrowDown';
    case 21:
      return 'ArrowLeft';
    case 22:
      return 'ArrowRight';
    case 23:
    case 66:
    case 62:
      return 'Enter';
    case 8:
    case 46:
      return 'delete';
    case 4:
    case 27:
    case 111:
      return 'close';
    default:
      return null;
  }
}

function getResultColumns(width) {
  if (width >= 1600) return 4;
  if (width >= 1180) return 3;
  if (width >= 860) return 2;
  return 1;
}

export default function TVSearch({
  allContent = [],
  onSelectItem,
  onClose,
  title = 'Buscar en TeamG Play',
  placeholder = 'Escribe para buscar (EX, GOT, Netflix...)',
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredResults, setFilteredResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [focusArea, setFocusArea] = useState('input');
  const [resultColumns, setResultColumns] = useState(() => getResultColumns(window.innerWidth || 1280));
  const [isListening, setIsListening] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const searchInputRef = useRef(null);
  const voiceButtonRef = useRef(null);
  const recognitionRef = useRef(null);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const focusInput = useCallback((shouldFocusDom = false) => {
    setFocusArea('input');

    if (!shouldFocusDom) {
      return;
    }

    window.requestAnimationFrame(() => {
      const input = searchInputRef.current;
      if (!input) return;

      try {
        input.focus({ preventScroll: true });
      } catch {
        input.focus();
      }

      try {
        const valueLength = input.value?.length || 0;
        input.setSelectionRange(valueLength, valueLength);
      } catch {
      }
    });
  }, []);

  const openKeyboardInput = useCallback(() => {
    focusInput(true);

    window.requestAnimationFrame(() => {
      try {
        searchInputRef.current?.click();
      } catch {
      }
    });
  }, [focusInput]);

  const focusVoiceButton = useCallback(() => {
    if (!isVoiceSupported) {
      return;
    }

    setFocusArea('voice');

    window.requestAnimationFrame(() => {
      try {
        voiceButtonRef.current?.focus({ preventScroll: true });
      } catch {
        voiceButtonRef.current?.focus();
      }
    });
  }, [isVoiceSupported]);

  useEffect(() => {
    setTVFocusZone(TV_FOCUS_ZONE_MODAL);
    const timer = window.setTimeout(() => {
      focusInput();
    }, 60);

    return () => {
      window.clearTimeout(timer);
      focusTVContent();
    };
  }, [focusInput]);

  useEffect(() => {
    const handleResize = () => {
      setResultColumns(getResultColumns(window.innerWidth || 1280));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const supported = supportsSpeechRecognition();
    setIsVoiceSupported(supported);

    if (!supported) {
      recognitionRef.current = null;
      return undefined;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'es-ES';

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      setVoiceError('');
    };

    recognitionRef.current.onresult = (event) => {
      let finalTranscript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index]?.[0]?.transcript || '';
        if (event.results[index].isFinal) {
          finalTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setSearchQuery(finalTranscript.trim());
      }
    };

    recognitionRef.current.onerror = (event) => {
      let message = 'Ocurrio un error con la busqueda por voz.';

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        message = 'Permiso de microfono denegado. Activalo en Ajustes > Aplicaciones > TeamG Play > Permisos.';
      } else if (event.error === 'no-speech') {
        message = 'No se detecto audio. Intenta hablar mas cerca del microfono.';
      } else if (event.error === 'network') {
        message = 'Error de conexion al servicio de voz. Revisa internet e intenta otra vez.';
      } else if (event.error === 'aborted') {
        message = '';
      } else if (event.error) {
        message = `Error de voz: ${event.error}`;
      }

      setVoiceError(message);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
      focusInput();
    };

    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, [focusInput]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredResults([]);
      setSelectedIndex(0);
      return;
    }

    const normalizedQuery = normalizeSearchText(searchQuery.trim());
    const nextResults = allContent
      .filter((item) => buildSearchIndex(item).includes(normalizedQuery))
      .slice(0, 60);

    setFilteredResults(nextResults);
    setSelectedIndex(0);
  }, [allContent, searchQuery]);

  useEffect(() => {
    if (focusArea !== 'results') {
      return;
    }

    const selectedElement = document.querySelector(`[data-result-index="${selectedIndex}"]`);
    selectedElement?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });

    if (selectedElement && typeof selectedElement.focus === 'function') {
      window.requestAnimationFrame(() => {
        try {
          selectedElement.focus({ preventScroll: true });
        } catch {
          selectedElement.focus();
        }
      });
    }
  }, [focusArea, selectedIndex]);

  const handleSelectResult = useCallback((item) => {
    console.log('[TVSearch] Selecting item:', {
      title: getTVItemTitle(item),
      id: item.id || item._id,
      focusArea: focusArea,
      focusZone: getTVFocusZone(),
    });
    onSelectItem?.(item);
  }, [onSelectItem, focusArea]);

  const toggleVoiceSearch = useCallback(async () => {
    if (!isVoiceSupported || !recognitionRef.current) {
      setVoiceError('Busqueda por voz no disponible en este dispositivo.');
      return;
    }

    if (isListening) {
      recognitionRef.current.abort();
      setIsListening(false);
      return;
    }

    setVoiceError('');
    focusVoiceButton();

    try {
      const hasPermission = await checkAndRequestMicrophonePermission();
      if (!hasPermission) {
        setVoiceError('Permiso de microfono denegado. Activalo en los ajustes del dispositivo.');
        return;
      }

      recognitionRef.current.start();
    } catch (error) {
      setIsListening(false);
      setVoiceError(error?.message || 'No se pudo iniciar la busqueda por voz.');
    }
  }, [focusVoiceButton, isListening, isVoiceSupported]);

  const handleWindowKeyDown = useCallback((event) => {
    const currentZone = getTVFocusZone();

    if (currentZone !== TV_FOCUS_ZONE_MODAL) {
      console.log('[TVSearch] Ignoring key - wrong focus zone:', {
        currentZone,
        expected: TV_FOCUS_ZONE_MODAL,
        key: event.key
      });
      return;
    }

    const action = resolveAction(event);
    const inputIsActive = document.activeElement === searchInputRef.current || focusArea === 'input';
    const voiceIsActive = focusArea === 'voice';

    if (action === 'close') {
      event.preventDefault();
      handleClose();
      return;
    }

    if (action === 'delete' && !inputIsActive) {
      event.preventDefault();
      setSearchQuery((prev) => prev.slice(0, -1));
      focusInput();
      return;
    }

    if (voiceIsActive) {
      switch (action) {
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          focusInput();
          break;
        case 'ArrowDown':
          if (!filteredResults.length) {
            return;
          }
          event.preventDefault();
          setFocusArea('results');
          setSelectedIndex(0);
          console.log('[TVSearch] Focus moved to results, index 0');
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          toggleVoiceSearch();
          break;
        default:
          if (
            event.key?.length === 1 &&
            !event.ctrlKey &&
            !event.altKey &&
            !event.metaKey
          ) {
            event.preventDefault();
            setSearchQuery((prev) => `${prev}${event.key}`);
            focusInput();
          }
          break;
      }
      return;
    }

    if (inputIsActive) {
      if (action === 'Enter') {
        if (filteredResults.length > 0) {
          event.preventDefault();
          handleSelectResult(filteredResults[0]);
          return;
        }

        event.preventDefault();
        openKeyboardInput();
      }

      if (action === 'ArrowRight' && isVoiceSupported) {
        event.preventDefault();
        focusVoiceButton();
        return;
      }

      if (action === 'ArrowDown' && filteredResults.length > 0) {
        event.preventDefault();
        searchInputRef.current?.blur();
        setFocusArea('results');
        setSelectedIndex(0);
        console.log('[TVSearch] Focus moved from input to results');
      }
      return;
    }

    // Handle results navigation and selection
    const currentFocusArea = focusArea;
    console.log('[TVSearch] Processing key in results area:', {
      action,
      selectedIndex,
      focusArea: currentFocusArea,
      resultsCount: filteredResults.length,
      selectedItemTitle: filteredResults[selectedIndex] ? getTVItemTitle(filteredResults[selectedIndex]) : 'N/A'
    });

    switch (action) {
      case 'ArrowLeft':
        event.preventDefault();
        setSelectedIndex((prev) => Math.max(0, prev - 1));
        break;
      case 'ArrowRight':
        event.preventDefault();
        setSelectedIndex((prev) => Math.min(filteredResults.length - 1, prev + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (selectedIndex - resultColumns < 0) {
          focusInput();
          return;
        }
        setSelectedIndex((prev) => Math.max(0, prev - resultColumns));
        break;
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex((prev) => Math.min(filteredResults.length - 1, prev + resultColumns));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        console.log('[TVSearch] SELECT pressed at index:', selectedIndex, 'item:', filteredResults[selectedIndex] ? getTVItemTitle(filteredResults[selectedIndex]) : 'NONE');
        if (filteredResults[selectedIndex]) {
          handleSelectResult(filteredResults[selectedIndex]);
        } else {
          console.warn('[TVSearch] No item at selected index:', selectedIndex);
        }
        break;
      default:
        if (
          event.key?.length === 1 &&
          !event.ctrlKey &&
          !event.altKey &&
          !event.metaKey
        ) {
          event.preventDefault();
          setSearchQuery((prev) => `${prev}${event.key}`);
          focusInput();
        }
        break;
    }
  }, [
    filteredResults,
    focusArea,
    focusInput,
    focusVoiceButton,
    handleClose,
    handleSelectResult,
    isVoiceSupported,
    openKeyboardInput,
    resultColumns,
    selectedIndex,
    toggleVoiceSearch,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [handleWindowKeyDown]);

  useEffect(() => {
    const handleSystemBack = (event) => {
      event.preventDefault?.();
      handleClose();
    };

    document.addEventListener('backbutton', handleSystemBack);
    return () => document.removeEventListener('backbutton', handleSystemBack);
  }, [handleClose]);

  const getItemTypeColor = (type) => {
    const colors = {
      channel: '#FF6B6B',
      movie: '#4ECDC4',
      serie: '#45B7D1',
      series: '#45B7D1',
      anime: '#F7DC6F',
      dorama: '#BB8FCE',
      novela: '#F8B88B',
      documental: '#85C1E2',
      'zona kids': '#F59E0B',
    };
    return colors[type?.toLowerCase()] || '#999';
  };

  const handleInputKeyDownCapture = (event) => {
    const action = resolveAction(event);

    if (action === 'ArrowDown' && filteredResults.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      searchInputRef.current?.blur();
      setFocusArea('results');
      setSelectedIndex(0);
      return;
    }

    if (action === 'Enter' && filteredResults.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      handleSelectResult(filteredResults[0]);
    }
  };

  return (
    <div className="tv-search-overlay">
      <div className="tv-search-container">
        <div className="tv-search-header">
          <h1 className="tv-search-title">{title}</h1>
          <p className="tv-search-subtitle">
            {isListening
              ? 'Escuchando...'
              : isVoiceSupported
                ? 'Usa el teclado del TV o mueve RIGHT al microfono para buscar por voz.'
                : 'Usa el teclado del TV o escribe con teclado fisico.'}
          </p>
        </div>

        <div className="tv-search-input-wrapper">
          <div className={`tv-search-input-box ${focusArea === 'input' ? 'focused' : ''}`}>
            <MagnifyingGlassIcon className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => setFocusArea('input')}
              onClick={() => {
                setFocusArea('input');
              }}
              onKeyDownCapture={handleInputKeyDownCapture}
              placeholder={placeholder}
              className="tv-search-input"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="search"
              enterKeyHint="search"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  focusInput();
                }}
                className="search-clear-btn"
                aria-label="Limpiar busqueda"
              >
                x
              </button>
            ) : null}
          </div>

          <button
            ref={voiceButtonRef}
            type="button"
            onClick={toggleVoiceSearch}
            className={`tv-search-voice-btn ${isListening ? 'listening' : ''} ${focusArea === 'voice' ? 'focused' : ''}`}
            aria-label="Busqueda por voz"
            disabled={!isVoiceSupported && !isListening}
          >
            <MicrophoneIcon className="voice-icon" />
          </button>
        </div>

        {voiceError ? (
          <div className="tv-search-error">{voiceError}</div>
        ) : null}

        <div className="tv-search-results-wrapper">
          {filteredResults.length > 0 ? (
            <div
              className="tv-search-results"
              style={{ gridTemplateColumns: `repeat(${resultColumns}, minmax(0, 1fr))` }}
            >
              {filteredResults.map((item, index) => {
                const isFocused = focusArea === 'results' && index === selectedIndex;
                const itemType = resolveTVItemType(item);
                const qualityBadges = getTVItemQualityBadges(item);

                const handleResultKeyDown = (e) => {
                  console.log('[TVSearch] Result button keydown:', {
                    key: e.key,
                    code: e.code,
                    index,
                    title: getTVItemTitle(item)
                  });

                  if (
                    e.key === 'Enter' ||
                    e.key === ' ' ||
                    e.key === 'Spacebar' ||
                    e.code === 'Select' ||
                    e.code === 'MediaPlayPause' ||
                    e.keyCode === 23 ||
                    e.keyCode === 66 ||
                    e.keyCode === 62
                  ) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[TVSearch] Result SELECTED via keyboard');
                    handleSelectResult(item);
                  }
                };

                const handleResultClick = (e) => {
                  console.log('[TVSearch] Result clicked:', {
                    index,
                    title: getTVItemTitle(item),
                    button: e.button
                  });
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectResult(item);
                };

                return (
                  <button
                    key={`${item.id || item._id || getTVItemTitle(item)}-${index}`}
                    type="button"
                    data-result-index={index}
                    className={`tv-search-result-item ${isFocused ? 'focused' : ''}`}
                    onClick={handleResultClick}
                    onKeyDown={handleResultKeyDown}
                    onFocus={() => {
                      setFocusArea('results');
                      setSelectedIndex(index);
                    }}
                    onMouseDown={handleResultClick}
                    tabIndex={0}
                    aria-label={`Select ${getTVItemTitle(item)}`}
                  >
                    <div className="result-image">
                      <img
                        src={getTVItemImage(item)}
                        alt={getTVItemTitle(item)}
                        className="result-poster"
                      />
                      <div
                        className="result-type-badge"
                        style={{ backgroundColor: getItemTypeColor(itemType) }}
                      >
                        {itemType.toUpperCase()}
                      </div>
                    </div>

                    <div className="result-info">
                      <h3 className="result-name">{getTVItemTitle(item)}</h3>
                      {getTVItemDescription(item) ? (
                        <p className="result-description">{getTVItemDescription(item)}</p>
                      ) : null}
                      <p className="result-meta">
                        {[getTVItemYear(item), getTVItemGenre(item)].filter(Boolean).join(' | ') || itemType}
                      </p>
                      {qualityBadges.length ? (
                        <div className="result-badge-list">
                          {qualityBadges.map((badge) => (
                            <span
                              key={`${getTVItemTitle(item)}-${badge}`}
                              className={`result-quality-badge ${badge.includes('4K') ? 'is-4k' : 'is-60fps'}`}
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : searchQuery ? (
            <div className="tv-search-no-results">
              <p>No se encontraron resultados para "{searchQuery}"</p>
              <p className="subtitle">Prueba con otro titulo, canal o genero.</p>
            </div>
          ) : (
            <div className="tv-search-empty">
              <p>Comienza a escribir para buscar</p>
              <p className="subtitle">OK sobre el campo abre el teclado del Smart TV si tu dispositivo lo soporta.</p>
            </div>
          )}
        </div>

        <div className="tv-search-instructions">
          <span>Abajo entra a resultados</span>
          {isVoiceSupported ? <span>RIGHT va al microfono</span> : null}
          <span>OK selecciona</span>
          {isVoiceSupported ? <span>OK en micro inicia voz</span> : null}
          <span>Back cierra</span>
          <span>Borrar usa el teclado del TV o la tecla borrar</span>
        </div>
      </div>
    </div>
  );
}
