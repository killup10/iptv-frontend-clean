const fs = require('fs');
const path = require('path');

const file = path.join('c:/Users/USUARIO/Desktop/TeamG-Play/iptv-frontend-clean-updated/src/pages/Watch.jsx');
let content = fs.readFileSync(file, 'utf8');

// Fix 1: Add movie progress loading
content = content.replace(
`        // Si tiene capítulos, cargar el último progreso
        if (normalizedData.chapters.length > 0) {
          const lastProgress = await storage.getItem(\`videoProgress_\${normalizedData.id}\`);
          if (lastProgress) {
            try {
              const parsed = JSON.parse(lastProgress);
              if (parsed.seasonIndex !== undefined && parsed.chapterIndex !== undefined) {
                setCurrentChapterInfo({ seasonIndex: parsed.seasonIndex, chapterIndex: parsed.chapterIndex });
                setSelectedSeasonIndex(parsed.seasonIndex);
              } else {
                setCurrentChapterInfo({ seasonIndex: 0, chapterIndex: 0 });
              }
            } catch {
              setCurrentChapterInfo({ seasonIndex: 0, chapterIndex: 0 });
            }
          } else {
            setCurrentChapterInfo({ seasonIndex: 0, chapterIndex: 0 });
          }
        }`,
`        // Si tiene capítulos, cargar el último progreso
        if (normalizedData.chapters.length > 0) {
          const lastProgress = await storage.getItem(\`videoProgress_\${normalizedData.id}\`);
          if (lastProgress) {
            try {
              const parsed = JSON.parse(lastProgress);
              if (parsed.seasonIndex !== undefined && parsed.chapterIndex !== undefined) {
                setCurrentChapterInfo({ seasonIndex: parsed.seasonIndex, chapterIndex: parsed.chapterIndex });
                setSelectedSeasonIndex(parsed.seasonIndex);
              } else {
                setCurrentChapterInfo({ seasonIndex: 0, chapterIndex: 0 });
              }
            } catch {
              setCurrentChapterInfo({ seasonIndex: 0, chapterIndex: 0 });
            }
          } else {
            setCurrentChapterInfo({ seasonIndex: 0, chapterIndex: 0 });
          }
        } else {
          const lastProgress = await storage.getItem(\`videoProgress_\${normalizedData.id}\`);
          if (lastProgress) {
            try {
              const parsed = JSON.parse(lastProgress);
              if (parsed && (parsed.currentTime > 0 || parsed.progress > 0 || parsed.lastSeason !== undefined || parsed.lastChapter !== undefined)) {
                setCurrentChapterInfo({ isMovieProgress: true, ...parsed });
              }
            } catch {}
          }
        }`
);

// Fix 2: Add availableActions and fix handleKeyDown
const oldEffect = `  useEffect(() => {
    if (itemType === 'channel' || (isTVMode && vodPlaybackRequested) || loading || !itemData) return;

    const isSeries = itemData.seasons.length > 0;
    
    const handleKeyDown = (e) => {
      if (getTVFocusZone() !== TV_FOCUS_ZONE_CONTENT) return;
      
      const key = e.key;
      const keyCode = e.keyCode;

      // Acciones de navegación
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape', 'Backspace'].includes(key)) {
        // No prevenimos por defecto para que los hijos (TVSeriesChapters) puedan escuchar
      }

      if (key === 'Escape' || keyCode === 27 || keyCode === 4 || key === 'Backspace' || keyCode === 8) {
        e.preventDefault();
        handleBackNavigation();
        return;
      }

      if (focusedVodDetailSection === 'actions') {
        if (key === 'ArrowLeft') {
          e.preventDefault();
          if (focusedVodActionIndex > 0) setFocusedVodActionIndex(0);
          else focusTVNav();
        } else if (key === 'ArrowRight') {
          e.preventDefault();
          if (focusedVodActionIndex < 1) setFocusedVodActionIndex(1);
        } else if (key === 'ArrowDown') {
          if (isSeries) {
            e.preventDefault();
            setFocusedVodDetailSection('chapters');
          }
        } else if (key === 'ArrowUp') {
          e.preventDefault();
          focusTVNav();
        } else if (key === 'Enter' || keyCode === 13 || keyCode === 66 || keyCode === 23) {
          e.preventDefault();
          if (focusedVodActionIndex === 0) setVodPlaybackRequested(true);
          else handleBackNavigation();
        }
      } else if (focusedVodDetailSection === 'chapters') {
        // TVSeriesChapters maneja su propia navegación interna
        // Pero necesitamos una forma de volver arriba
        if (key === 'ArrowUp') {
          // Si estamos en la zona de temporadas y damos arriba, volvemos a las acciones
          // Nota: El componente hijo debe permitir que este evento burbujee o detectamos aquí
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, itemData, itemType, isTVMode, vodPlaybackRequested, focusedVodDetailSection, focusedVodActionIndex]);`;

const newEffect = `  const availableActions = useMemo(() => {
    if (!itemData) return [];
    const actions = ['play'];
    if (itemData.trailerUrl) actions.push('trailer');
    actions.push('mylist', 'close');
    return actions;
  }, [itemData]);

  useEffect(() => {
    if (itemType === 'channel' || (isTVMode && vodPlaybackRequested) || loading || !itemData) return;

    const isSeries = itemData.seasons.length > 0;
    const hasProgress = !!currentChapterInfo;
    
    const handleKeyDown = (e) => {
      if (getTVFocusZone() !== TV_FOCUS_ZONE_CONTENT) return;
      
      const key = e.key;
      const keyCode = e.keyCode;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape', 'Backspace'].includes(key)) {}

      if (key === 'Escape' || keyCode === 27 || keyCode === 4 || key === 'Backspace' || keyCode === 8) {
        e.preventDefault();
        handleBackNavigation();
        return;
      }

      if (focusedVodDetailSection === 'actions') {
        if (key === 'ArrowLeft') {
          e.preventDefault();
          if (focusedVodActionIndex > 0) setFocusedVodActionIndex(prev => prev - 1);
          else focusTVNav();
        } else if (key === 'ArrowRight') {
          e.preventDefault();
          if (focusedVodActionIndex < availableActions.length - 1) setFocusedVodActionIndex(prev => prev + 1);
        } else if (key === 'ArrowDown') {
          e.preventDefault();
          if (hasProgress) {
            setFocusedVodDetailSection('resume');
          } else if (isSeries) {
            setFocusedVodDetailSection('chapters');
          }
        } else if (key === 'ArrowUp') {
          e.preventDefault();
          focusTVNav();
        } else if (key === 'Enter' || keyCode === 13 || keyCode === 66 || keyCode === 23) {
          e.preventDefault();
          const action = availableActions[focusedVodActionIndex];
          if (action === 'play') setVodPlaybackRequested(true);
          else if (action === 'trailer') setActiveTrailerUrl(itemData.trailerUrl);
          else if (action === 'mylist') addItemToMyList(itemData.id, itemType);
          else if (action === 'close') handleBackNavigation();
        }
      } else if (focusedVodDetailSection === 'resume') {
        if (key === 'ArrowUp') {
          e.preventDefault();
          setFocusedVodDetailSection('actions');
        } else if (key === 'ArrowDown') {
          if (isSeries) {
            e.preventDefault();
            setFocusedVodDetailSection('chapters');
          }
        } else if (key === 'Enter' || keyCode === 13 || keyCode === 66 || keyCode === 23) {
          e.preventDefault();
          setVodPlaybackRequested(true);
        }
      } else if (focusedVodDetailSection === 'chapters') {
        if (key === 'ArrowUp') {
          // Handled via onChaptersRequestFocusUp
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, itemData, itemType, isTVMode, vodPlaybackRequested, focusedVodDetailSection, focusedVodActionIndex, availableActions, currentChapterInfo]);`;

content = content.replace(oldEffect, newEffect);

// Fix 3: onChaptersRequestFocusUp
content = content.replace(
`  const onChaptersRequestFocusUp = useCallback(() => {
    setFocusedVodDetailSection('actions');
  }, []);`,
`  const onChaptersRequestFocusUp = useCallback(() => {
    if (currentChapterInfo) {
      setFocusedVodDetailSection('resume');
    } else {
      setFocusedVodDetailSection('actions');
    }
  }, [currentChapterInfo]);`
);

// Fix 4: The UI
const oldUI = \`                  {/* ACCIONES PRINCIPALES */}
                  <div className="flex gap-4 flex-wrap">
                    <button 
                      ref={tvHeroFocusRef}
                      onClick={() => setVodPlaybackRequested(true)}
                      className={\\\`transition-all duration-300 px-6 py-2.5 rounded-lg font-black text-sm flex items-center gap-3 whitespace-nowrap \\\${
                        focusedVodDetailSection === 'actions' && focusedVodActionIndex === 0 
                          ? 'bg-cyan-500 text-black scale-110 shadow-[0_0_30px_rgba(0,255,255,0.6)]' 
                          : 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-600/30'
                      }\\\`}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      REPRODUCIR
                    </button>

                    {itemData.trailerUrl && (
                      <button 
                        onClick={() => setActiveTrailerUrl(itemData.trailerUrl)}
                        className={\\\`transition-all duration-300 px-6 py-2.5 rounded-lg font-black text-sm flex items-center gap-3 whitespace-nowrap \\\${
                          focusedVodDetailSection === 'actions' && focusedVodActionIndex === 1
                            ? 'bg-purple-500 text-white scale-110 shadow-[0_0_30px_rgba(147,51,234,0.6)]'
                            : 'bg-purple-600/20 text-purple-300 border border-purple-500/50 hover:bg-purple-600/30'
                        }\\\`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        TRAILER
                      </button>
                    )}

                    <button 
                      onClick={() => {
                        addItemToMyList(itemData.id, itemType);
                      }}
                      className={\\\`transition-all duration-300 px-6 py-2.5 rounded-lg font-black text-sm flex items-center gap-3 whitespace-nowrap \\\${
                        focusedVodDetailSection === 'actions' && focusedVodActionIndex === 2
                          ? 'bg-amber-500 text-black scale-110 shadow-[0_0_30px_rgba(217,119,6,0.6)]'
                          : 'bg-amber-600/20 text-amber-300 border border-amber-500/50 hover:bg-amber-600/30'
                      }\\\`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      MI LISTA
                    </button>

                    <button 
                      onClick={handleBackNavigation}
                      className={\\\`transition-all duration-300 px-6 py-2.5 rounded-lg font-black text-sm flex items-center gap-3 whitespace-nowrap \\\${
                        focusedVodDetailSection === 'actions' && focusedVodActionIndex === 3
                          ? 'bg-red-600 text-white scale-110 shadow-[0_0_30px_rgba(220,38,38,0.6)]'
                          : 'bg-slate-700/30 text-slate-400 border border-slate-600/50 hover:bg-slate-700/50'
                      }\\\`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      CERRAR
                    </button>
                  </div>
                </section>

                {/* SECCIÓN DE CONTINUAR VIENDO - Si hay progreso */}
                {currentChapterInfo && itemData.seasons.length > 0 && (
                  <section className="mb-6 bg-slate-900/40 border border-slate-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
                      <h3 className="text-sm font-bold text-cyan-300 uppercase">Continuar Viendo</h3>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      {itemData.seasons[currentChapterInfo.seasonIndex]?.seasonNumber && 
                        \\\`Temporada \\\${itemData.seasons[currentChapterInfo.seasonIndex].seasonNumber} • \\\`}
                      {itemData.seasons[currentChapterInfo.seasonIndex]?.chapters?.[currentChapterInfo.chapterIndex]?.title || \\\`Episodio \\\${currentChapterInfo.chapterIndex + 1}\\\`}
                    </p>
                    <button
                      onClick={() => setVodPlaybackRequested(true)}
                      className="w-full bg-cyan-500/30 hover:bg-cyan-500/50 text-cyan-300 font-bold text-xs py-2 rounded-lg transition-all duration-200 border border-cyan-500/50"
                    >
                      ► Continuar desde donde lo dejaste
                    </button>
                  </section>
                )}\`;

const newUI = \`                  {/* ACCIONES PRINCIPALES */}
                  <div className="flex gap-4 flex-wrap">
                    <button 
                      ref={tvHeroFocusRef}
                      onClick={() => setVodPlaybackRequested(true)}
                      className={\\\`transition-all duration-300 px-6 py-2.5 rounded-lg font-black text-sm flex items-center gap-3 whitespace-nowrap \\\${
                        focusedVodDetailSection === 'actions' && availableActions[focusedVodActionIndex] === 'play'
                          ? 'bg-cyan-500 text-black scale-110 shadow-[0_0_30px_rgba(0,255,255,0.6)]' 
                          : 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-600/30'
                      }\\\`}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      REPRODUCIR
                    </button>

                    {itemData.trailerUrl && (
                      <button 
                        onClick={() => setActiveTrailerUrl(itemData.trailerUrl)}
                        className={\\\`transition-all duration-300 px-6 py-2.5 rounded-lg font-black text-sm flex items-center gap-3 whitespace-nowrap \\\${
                          focusedVodDetailSection === 'actions' && availableActions[focusedVodActionIndex] === 'trailer'
                            ? 'bg-purple-500 text-white scale-110 shadow-[0_0_30px_rgba(147,51,234,0.6)]'
                            : 'bg-purple-600/20 text-purple-300 border border-purple-500/50 hover:bg-purple-600/30'
                        }\\\`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        TRAILER
                      </button>
                    )}

                    <button 
                      onClick={() => {
                        addItemToMyList(itemData.id, itemType);
                      }}
                      className={\\\`transition-all duration-300 px-6 py-2.5 rounded-lg font-black text-sm flex items-center gap-3 whitespace-nowrap \\\${
                        focusedVodDetailSection === 'actions' && availableActions[focusedVodActionIndex] === 'mylist'
                          ? 'bg-amber-500 text-black scale-110 shadow-[0_0_30px_rgba(217,119,6,0.6)]'
                          : 'bg-amber-600/20 text-amber-300 border border-amber-500/50 hover:bg-amber-600/30'
                      }\\\`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      MI LISTA
                    </button>

                    <button 
                      onClick={handleBackNavigation}
                      className={\\\`transition-all duration-300 px-6 py-2.5 rounded-lg font-black text-sm flex items-center gap-3 whitespace-nowrap \\\${
                        focusedVodDetailSection === 'actions' && availableActions[focusedVodActionIndex] === 'close'
                          ? 'bg-red-600 text-white scale-110 shadow-[0_0_30px_rgba(220,38,38,0.6)]'
                          : 'bg-slate-700/30 text-slate-400 border border-slate-600/50 hover:bg-slate-700/50'
                      }\\\`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      CERRAR
                    </button>
                  </div>
                </section>

                {/* SECCIÓN DE CONTINUAR VIENDO - Si hay progreso */}
                {currentChapterInfo && (
                  <section className={\\\`mb-6 bg-slate-900/40 border rounded-xl p-4 transition-all duration-300 \\\${
                    focusedVodDetailSection === 'resume' ? 'border-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.3)] scale-[1.02]' : 'border-slate-700/50'
                  }\\\`}>
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
                      <h3 className="text-sm font-bold text-cyan-300 uppercase">Continuar Viendo</h3>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      {itemData.seasons.length > 0 && itemData.seasons[currentChapterInfo.seasonIndex]?.seasonNumber && 
                        \\\`Temporada \\\${itemData.seasons[currentChapterInfo.seasonIndex].seasonNumber} • \\\`}
                      {itemData.seasons.length > 0 && (itemData.seasons[currentChapterInfo.seasonIndex]?.chapters?.[currentChapterInfo.chapterIndex]?.title || \\\`Episodio \\\${currentChapterInfo.chapterIndex + 1}\\\`)}
                      {itemData.seasons.length === 0 && \\\`Continuar Película\\\`}
                    </p>
                    <button
                      onClick={() => setVodPlaybackRequested(true)}
                      className={\\\`w-full font-bold text-xs py-2 rounded-lg transition-all duration-200 border \\\${
                        focusedVodDetailSection === 'resume'
                          ? 'bg-cyan-500 text-black border-cyan-400'
                          : 'bg-cyan-500/30 hover:bg-cyan-500/50 text-cyan-300 border-cyan-500/50'
                      }\\\`}
                    >
                      ► Continuar desde donde lo dejaste
                    </button>
                  </section>
                )}\`;

content = content.replace(oldUI, newUI);

fs.writeFileSync(file, content);
console.log('Done replacement');
