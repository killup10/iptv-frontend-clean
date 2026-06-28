import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchUserChannels } from "../utils/api.js";
import { rewriteImageUrl } from "../utils/imageUrl.js";
import { Play, Trophy, Calendar, MapPin, Users, Info, ChevronLeft, ChevronRight, Bell, Sparkles } from "lucide-react";
import axiosInstance from "../utils/axiosInstance.js";
import { isAndroidTV } from "../utils/platformUtils.js";
import { getTVFocusZone, focusTVNav, TV_FOCUS_ZONE_CONTENT } from "../utils/tvFocusZone.js";

// Lista de palabras clave para filtrar canales de deportes
const SPORTS_KEYWORDS = ["deporte", "sport", "espn", "fox", "directv", "dtv", "telemundo", "televisa", "azteca", "liga", "gol", "tnt", "win", "bein", "sky", "tyc", "direct"];

// Componentes para el contador regresivo estilo FIFA 2026
const DigitSlot = ({ digit, isLime = false }) => (
  <div className={`relative w-6 sm:w-8 md:w-10 h-9 sm:h-12 md:h-14 flex items-center justify-center bg-[#070314] border border-white/10 rounded-lg overflow-hidden shadow-lg shadow-black/85 ${isLime ? 'border-lime-500/30' : ''}`}>
    {/* Sombras cilíndricas de profundidad 3D */}
    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-0" />
    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-0" />
    
    {/* Línea divisoria central típica de pantalla de solapa/flip */}
    <div className="absolute top-[50%] left-0 right-0 h-[1.5px] bg-[#000000]/90 z-10" />
    
    {/* El dígito */}
    <span className={`text-sm sm:text-base md:text-2xl font-black ${isLime ? 'text-lime-400 drop-shadow-[0_0_8px_rgba(163,230,53,0.55)]' : 'text-white'} font-mono select-none z-20`}>
      {digit}
    </span>
  </div>
);

const DigitGroup = ({ value, label, length = 2, isLime = false }) => {
  const digits = String(value).padStart(length, "0").split("");
  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-0.5 sm:gap-1">
        {digits.map((digit, idx) => (
          <DigitSlot key={idx} digit={digit} isLime={isLime} />
        ))}
      </div>
      <span className="text-[7px] sm:text-[8px] uppercase tracking-widest text-slate-400 font-extrabold mt-1.5">
        {label}
      </span>
    </div>
  );
};

const GroupSeparator = () => (
  <div className="flex items-center justify-center h-9 sm:h-12 md:h-14 px-0.5 sm:px-1">
    <span className="text-xs sm:text-sm font-black text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.65)] animate-pulse">·</span>
  </div>
);

// Mapeador de países a códigos ISO para banderas de FlagCDN
const countryToCode = {
  "Alemania": "de",
  "Angola": "ao",
  "Arabia Saudita": "sa",
  "Argelia": "dz",
  "Argentina": "ar",
  "Australia": "au",
  "Austria": "at",
  "Bélgica": "be",
  "Bolivia": "bo",
  "Brasil": "br",
  "Camerún": "cm",
  "Canadá": "ca",
  "Catar": "qa",
  "Chile": "cl",
  "China": "cn",
  "Colombia": "co",
  "Corea del Sur": "kr",
  "Costa de Marfil": "ci",
  "Costa Rica": "cr",
  "Croacia": "hr",
  "Dinamarca": "dk",
  "Ecuador": "ec",
  "EE. UU.": "us",
  "Egipto": "eg",
  "El Salvador": "sv",
  "Escocia": "gb-sct",
  "España": "es",
  "Francia": "fr",
  "Gales": "gb-wls",
  "Ghana": "gh",
  "Grecia": "gr",
  "Honduras": "hn",
  "Hungría": "hu",
  "Inglaterra": "gb-eng",
  "Irak": "iq",
  "Irán": "ir",
  "Irlanda": "ie",
  "Islandia": "is",
  "Italia": "it",
  "Jamaica": "jm",
  "Japón": "jp",
  "Marruecos": "ma",
  "México": "mx",
  "Nigeria": "ng",
  "Noruega": "no",
  "Nueva Zelanda": "nz",
  "Países Bajos": "nl",
  "Panamá": "pa",
  "Paraguay": "py",
  "Perú": "pe",
  "Polonia": "pl",
  "Portugal": "pt",
  "República Checa": "cz",
  "Rumania": "ro",
  "Senegal": "sn",
  "Serbia": "rs",
  "Sudáfrica": "za",
  "Suecia": "se",
  "Suiza": "ch",
  "Túnez": "tn",
  "Turquía": "tr",
  "Ucrania": "ua",
  "Uruguay": "uy",
  "Venezuela": "ve"
};

const getFlagUrl = (countryName) => {
  const code = countryToCode[countryName];
  if (!code) return "https://flagcdn.com/w40/un.png";
  return `https://flagcdn.com/w40/${code}.png`;
};

function Mundial2026() {
  const navigate = useNavigate();
  const [mundialMatches, setMundialMatches] = useState([]);
  const [allCatalogChannels, setAllCatalogChannels] = useState([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [activeGroupTab, setActiveGroupTab] = useState("A");
  const [filterTab, setFilterTab] = useState("active"); // "active", "finished", "all"
  const [activeSectionTab, setActiveSectionTab] = useState("groups"); // "groups" | "brackets"
  const [selectedBracketMatch, setSelectedBracketMatch] = useState(null);
  const [focusedModalChannelIndex, setFocusedModalChannelIndex] = useState(0);

  // TV focus states
  const [tvFocusArea, setTvFocusArea] = useState("filters"); // "filters", "channels", "groups", "bracket-modal", "sectionTabs", "brackets"
  const [focusedFilterIndex, setFocusedFilterIndex] = useState(0);
  const [focusedChannelIndex, setFocusedChannelIndex] = useState(0);
  const [focusedGroupIndex, setFocusedGroupIndex] = useState(0);
  const [focusedSectionTabIndex, setFocusedSectionTabIndex] = useState(0); // 0: groups, 1: brackets
  const [focusedRoundIndex, setFocusedRoundIndex] = useState(0); // 0..4
  const [focusedMatchIndex, setFocusedMatchIndex] = useState(0); // index inside round

  // Mapa de búsqueda rápida O(1) de canales para optimizar el renderizado y evitar lag
  const channelsMap = React.useMemo(() => {
    const map = new Map();
    allCatalogChannels.forEach(ch => {
      const id = ch._id || ch.id;
      if (id) {
        map.set(String(id), ch);
      }
    });
    return map;
  }, [allCatalogChannels]);

  // Memoizar los partidos del Mundial con sus canales ya resueltos
  // Esto evita re-calcular asociaciones O(N) por cada segundo del contador regresivo
  const resolvedMundialMatches = React.useMemo(() => {
    return mundialMatches.map(match => {
      const associated = (match.canales || [])
        .map(chId => channelsMap.get(String(chId)))
        .filter(Boolean);
      
      // Fallback para extraer el grupo de la fase si el campo 'grupo' está vacío
      let grupoVal = match.grupo;
      if (!grupoVal && match.fase && match.fase.includes("Grupo ")) {
        const matchGroup = match.fase.match(/Grupo\s+([A-L])/i);
        if (matchGroup) {
          grupoVal = matchGroup[1].toUpperCase();
        }
      }

      return {
        ...match,
        grupo: grupoVal || "",
        associatedChannels: associated
      };
    });
  }, [mundialMatches, channelsMap]);



  const handleBracketMatchClick = (match) => {
    let channels = [];
    if (match.associatedChannels && match.associatedChannels.length > 0) {
      channels = match.associatedChannels;
    } else {
      channels = allCatalogChannels.filter(ch => {
        const nameLower = (ch.name || "").toLowerCase();
        return SPORTS_KEYWORDS.some(k => nameLower.includes(k));
      }).slice(0, 6);
    }

    setSelectedBracketMatch({
      ...match,
      channels
    });
    
    if (isAndroidTV()) {
      setTvFocusArea('bracket-modal');
      setFocusedModalChannelIndex(0);
    }
  };

  // Memoizar la lista de partidos a mostrar, filtrada y ordenada por relevancia
  const displayMatches = React.useMemo(() => {
    let list = [...resolvedMundialMatches];

    // Ordenar: EN VIVO primero, luego PRÓXIMO, luego FINALIZADO
    list.sort((a, b) => {
      if (a.estado === "EN VIVO" && b.estado !== "EN VIVO") return -1;
      if (a.estado !== "EN VIVO" && b.estado === "EN VIVO") return 1;
      if (a.estado === "PRÓXIMO" && b.estado === "FINALIZADO") return -1;
      if (a.estado === "FINALIZADO" && b.estado === "PRÓXIMO") return 1;
      return a.id - b.id;
    });

    if (filterTab === "active") {
      return list.filter(m => m.estado === "EN VIVO" || m.estado === "PRÓXIMO");
    }
    if (filterTab === "finished") {
      return list.filter(m => m.estado === "FINALIZADO");
    }
    return list;
  }, [resolvedMundialMatches, filterTab]);

  // Memoizar canales enfocables para navegación D-pad en 1D
  const focusableChannels = React.useMemo(() => {
    const list = [];
    displayMatches.forEach((match, matchIndex) => {
      const channels = match.associatedChannels || [];
      channels.forEach((channel, channelIndex) => {
        list.push({
          channel,
          match,
          matchIndex,
          channelIndex,
          id: channel._id || channel.id
        });
      });
    });
    return list;
  }, [displayMatches]);

  const findChannelGlobalIndex = (matchIdx, chIdx) => {
    return focusableChannels.findIndex(
      item => item.matchIndex === matchIdx && item.channelIndex === chIdx
    );
  };

  // Clampear el índice del canal enfocado si cambia la lista
  useEffect(() => {
    if (focusableChannels.length === 0) {
      setFocusedChannelIndex(0);
    } else if (focusedChannelIndex >= focusableChannels.length) {
      setFocusedChannelIndex(focusableChannels.length - 1);
    }
  }, [focusableChannels, focusedChannelIndex]);

  // Cuenta regresiva para el Mundial 2026 (11 de Junio, 2026)
  const [timeLeft, setTimeLeft] = useState({
    dias: 0,
    horas: 0,
    minutos: 0,
    segundos: 0,
  });

  useEffect(() => {
    const targetDate = new Date("June 11, 2026 14:00:00").getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        clearInterval(interval);
      } else {
        const dias = Math.floor(difference / (1000 * 60 * 60 * 24));
        const horas = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutos = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ dias, horas, minutos, segundos });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Cargar canales del catálogo de la app y partidos del fixture reales desde la base de datos (MongoDB)
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingChannels(true);
        // 1. Cargar canales del catálogo completo
        const channelsData = await fetchUserChannels("Todos");
        if (Array.isArray(channelsData)) {
          setAllCatalogChannels(channelsData);
        }

        // 2. Cargar partidos de la base de datos (MongoDB)
        const response = await axiosInstance.get("/api/worldcup/matches");
        if (Array.isArray(response.data)) {
          setMundialMatches(response.data);
        }
      } catch (err) {
        console.error("Error al cargar datos para el Mundial:", err);
      } finally {
        setLoadingChannels(false);
      }
    }

    loadData();
  }, []);

  // Escuchar cuando el foco pase del Nav al Contenido
  useEffect(() => {
    const handleFocusContent = () => {
      if (isAndroidTV()) {
        setTvFocusArea('filters');
        setFocusedFilterIndex(0);
      }
    };

    window.addEventListener("teamg:tv-focus-content", handleFocusContent);
    return () => window.removeEventListener("teamg:tv-focus-content", handleFocusContent);
  }, []);

  // Manejar keydown para control remoto en Smart TV (D-pad)
  useEffect(() => {
    if (!isAndroidTV()) return;

    const getRoundMatchesCount = (roundIdx) => {
      if (roundIdx === 0) return (knockoutBracket.dieciseisavos || []).length;
      if (roundIdx === 1) return (knockoutBracket.octavos || []).length;
      if (roundIdx === 2) return (knockoutBracket.cuartos || []).length;
      if (roundIdx === 3) return (knockoutBracket.semis || []).length;
      if (roundIdx === 4) return (knockoutBracket.final || []).length;
      return 0;
    };

    const getRoundMatch = (roundIdx, matchIdx) => {
      let list = [];
      if (roundIdx === 0) list = knockoutBracket.dieciseisavos || [];
      else if (roundIdx === 1) list = knockoutBracket.octavos || [];
      else if (roundIdx === 2) list = knockoutBracket.cuartos || [];
      else if (roundIdx === 3) list = knockoutBracket.semis || [];
      else if (roundIdx === 4) list = knockoutBracket.final || [];
      return list[matchIdx];
    };

    const handleKeyDown = (event) => {
      if (getTVFocusZone() !== TV_FOCUS_ZONE_CONTENT) {
        return;
      }

      let key = event.key;
      if (event.keyCode === 19) key = 'ArrowUp';
      else if (event.keyCode === 20) key = 'ArrowDown';
      else if (event.keyCode === 21) key = 'ArrowLeft';
      else if (event.keyCode === 22) key = 'ArrowRight';
      else if (event.keyCode === 23 || event.keyCode === 66) key = 'Enter';
      else if (event.keyCode === 4 || event.key === 'Backspace' || event.key === 'Escape') key = 'Escape';

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape'].includes(key)) {
        event.preventDefault();
      } else {
        return;
      }

      if (selectedBracketMatch) {
        if (key === 'Escape') {
          setSelectedBracketMatch(null);
          setTvFocusArea('brackets');
          return;
        }

        const channels = selectedBracketMatch.channels || [];
        const N = channels.length;

        if (key === 'ArrowLeft') {
          if (focusedModalChannelIndex < N && focusedModalChannelIndex % 2 === 1) {
            setFocusedModalChannelIndex(prev => prev - 1);
          }
        } else if (key === 'ArrowRight') {
          if (focusedModalChannelIndex < N && focusedModalChannelIndex % 2 === 0 && focusedModalChannelIndex + 1 < N) {
            setFocusedModalChannelIndex(prev => prev + 1);
          }
        } else if (key === 'ArrowUp') {
          if (focusedModalChannelIndex === N) {
            setFocusedModalChannelIndex(N - 1);
          } else if (focusedModalChannelIndex - 2 >= 0) {
            setFocusedModalChannelIndex(prev => prev - 2);
          }
        } else if (key === 'ArrowDown') {
          if (focusedModalChannelIndex < N) {
            if (focusedModalChannelIndex + 2 < N) {
              setFocusedModalChannelIndex(prev => prev + 2);
            } else {
              setFocusedModalChannelIndex(N);
            }
          }
        } else if (key === 'Enter') {
          if (focusedModalChannelIndex === N) {
            setSelectedBracketMatch(null);
            setTvFocusArea('brackets');
          } else if (channels[focusedModalChannelIndex]) {
            handleChannelClick(channels[focusedModalChannelIndex]);
          }
        }
        return;
      }

      if (tvFocusArea === 'filters') {
        if (key === 'ArrowLeft') {
          if (focusedFilterIndex === 0) {
            focusTVNav();
          } else {
            setFocusedFilterIndex(prev => prev - 1);
          }
        } else if (key === 'ArrowRight') {
          if (focusedFilterIndex < 2) {
            setFocusedFilterIndex(prev => prev + 1);
          }
        } else if (key === 'ArrowDown') {
          if (focusableChannels.length > 0) {
            setTvFocusArea('channels');
            setFocusedChannelIndex(0);
          } else {
            setTvFocusArea('sectionTabs');
            setFocusedSectionTabIndex(0);
          }
        } else if (key === 'Enter') {
          const filterTabs = ["active", "finished", "all"];
          setFilterTab(filterTabs[focusedFilterIndex]);
        }
      } 
      else if (tvFocusArea === 'channels') {
        if (focusableChannels.length === 0) {
          setTvFocusArea('filters');
          return;
        }

        const currentFocusItem = focusableChannels[focusedChannelIndex];
        if (!currentFocusItem) {
          setFocusedChannelIndex(0);
          return;
        }

        const currentMatch = currentFocusItem.match;
        const matchChannels = currentMatch.associatedChannels || [];
        const i = currentFocusItem.channelIndex;
        const col = i % 3;

        if (key === 'ArrowLeft') {
          if (col === 0) {
            focusTVNav();
          } else {
            setFocusedChannelIndex(prev => prev - 1);
          }
        } else if (key === 'ArrowRight') {
          if (i + 1 < matchChannels.length && col < 2) {
            setFocusedChannelIndex(prev => prev + 1);
          }
        } else if (key === 'ArrowUp') {
          if (i - 3 >= 0) {
            const targetIdx = findChannelGlobalIndex(currentFocusItem.matchIndex, i - 3);
            if (targetIdx !== -1) setFocusedChannelIndex(targetIdx);
          } else {
            let found = false;
            for (let mIdx = currentFocusItem.matchIndex - 1; mIdx >= 0; mIdx--) {
              const prevMatch = displayMatches[mIdx];
              if (prevMatch && prevMatch.associatedChannels && prevMatch.associatedChannels.length > 0) {
                const prevLen = prevMatch.associatedChannels.length;
                const lastRowStart = Math.floor((prevLen - 1) / 3) * 3;
                const targetChIdx = Math.min(lastRowStart + col, prevLen - 1);
                const targetIdx = findChannelGlobalIndex(mIdx, targetChIdx);
                if (targetIdx !== -1) {
                  setFocusedChannelIndex(targetIdx);
                  found = true;
                  break;
                }
              }
            }
            if (!found) {
              setTvFocusArea('filters');
            }
          }
        } else if (key === 'ArrowDown') {
          if (i + 3 < matchChannels.length) {
            const targetIdx = findChannelGlobalIndex(currentFocusItem.matchIndex, i + 3);
            if (targetIdx !== -1) setFocusedChannelIndex(targetIdx);
          } else {
            let found = false;
            for (let mIdx = currentFocusItem.matchIndex + 1; mIdx < displayMatches.length; mIdx++) {
              const nextMatch = displayMatches[mIdx];
              if (nextMatch && nextMatch.associatedChannels && nextMatch.associatedChannels.length > 0) {
                const nextLen = nextMatch.associatedChannels.length;
                const targetChIdx = Math.min(col, nextLen - 1);
                const targetIdx = findChannelGlobalIndex(mIdx, targetChIdx);
                if (targetIdx !== -1) {
                  setFocusedChannelIndex(targetIdx);
                  found = true;
                  break;
                }
              }
            }
            if (!found) {
              setTvFocusArea('sectionTabs');
              setFocusedSectionTabIndex(0);
            }
          }
        } else if (key === 'Enter') {
          handleChannelClick(currentFocusItem.channel);
        }
      } 
      else if (tvFocusArea === 'sectionTabs') {
        if (key === 'ArrowLeft') {
          if (focusedSectionTabIndex === 0) {
            focusTVNav();
          } else {
            setFocusedSectionTabIndex(0);
          }
        } else if (key === 'ArrowRight') {
          if (focusedSectionTabIndex === 0) {
            setFocusedSectionTabIndex(1);
          }
        } else if (key === 'ArrowUp') {
          if (focusableChannels.length > 0) {
            setTvFocusArea('channels');
            setFocusedChannelIndex(focusableChannels.length - 1);
          } else {
            setTvFocusArea('filters');
            setFocusedFilterIndex(0);
          }
        } else if (key === 'ArrowDown') {
          if (activeSectionTab === 'groups') {
            setTvFocusArea('groups');
            setFocusedGroupIndex(0);
          } else {
            setTvFocusArea('brackets');
            setFocusedRoundIndex(0);
            setFocusedMatchIndex(0);
          }
        } else if (key === 'Enter') {
          setActiveSectionTab(focusedSectionTabIndex === 0 ? "groups" : "brackets");
        }
      }
      else if (tvFocusArea === 'groups') {
        const groupTabs = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
        if (key === 'ArrowLeft') {
          if (focusedGroupIndex === 0) {
            focusTVNav();
          } else {
            setFocusedGroupIndex(prev => prev - 1);
          }
        } else if (key === 'ArrowRight') {
          if (focusedGroupIndex < 11) {
            setFocusedGroupIndex(prev => prev + 1);
          }
        } else if (key === 'ArrowUp') {
          setTvFocusArea('sectionTabs');
          setFocusedSectionTabIndex(0);
        } else if (key === 'Enter') {
          setActiveGroupTab(groupTabs[focusedGroupIndex]);
        }
      }
      else if (tvFocusArea === 'brackets') {
        const roundLen = getRoundMatchesCount(focusedRoundIndex);
        if (key === 'ArrowUp') {
          if (focusedMatchIndex > 0) {
            setFocusedMatchIndex(prev => prev - 1);
          } else {
            setTvFocusArea('sectionTabs');
            setFocusedSectionTabIndex(1);
          }
        } else if (key === 'ArrowDown') {
          if (focusedMatchIndex < roundLen - 1) {
            setFocusedMatchIndex(prev => prev + 1);
          }
        } else if (key === 'ArrowLeft') {
          if (focusedRoundIndex > 0) {
            const prevRound = focusedRoundIndex - 1;
            const prevLen = getRoundMatchesCount(prevRound);
            setFocusedRoundIndex(prevRound);
            setFocusedMatchIndex(Math.min(focusedMatchIndex * 2, prevLen - 1));
          } else {
            focusTVNav();
          }
        } else if (key === 'ArrowRight') {
          if (focusedRoundIndex < 4) {
            const nextRound = focusedRoundIndex + 1;
            const nextLen = getRoundMatchesCount(nextRound);
            setFocusedRoundIndex(nextRound);
            setFocusedMatchIndex(Math.min(Math.floor(focusedMatchIndex / 2), nextLen - 1));
          }
        } else if (key === 'Enter') {
          const match = getRoundMatch(focusedRoundIndex, focusedMatchIndex);
          if (match) {
            handleBracketMatchClick(match);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tvFocusArea, focusedFilterIndex, focusedChannelIndex, focusedGroupIndex, focusedSectionTabIndex, focusedRoundIndex, focusedMatchIndex, activeSectionTab, focusableChannels, displayMatches, selectedBracketMatch, focusedModalChannelIndex, knockoutBracket]);

  // Hacer scroll automático al elemento enfocado en Smart TV
  useEffect(() => {
    if (!isAndroidTV()) return;

    let targetId = "";
    if (tvFocusArea === 'filters') {
      targetId = `tv-filter-${focusedFilterIndex}`;
    } else if (tvFocusArea === 'channels') {
      const focusedChannel = focusableChannels[focusedChannelIndex];
      if (focusedChannel) {
        targetId = `tv-channel-${focusedChannel.channel._id || focusedChannel.channel.id}`;
      }
    } else if (tvFocusArea === 'groups') {
      targetId = `tv-group-${focusedGroupIndex}`;
    } else if (tvFocusArea === 'sectionTabs') {
      targetId = `tv-section-tab-${focusedSectionTabIndex}`;
    } else if (tvFocusArea === 'brackets') {
      targetId = `tv-bracket-match-${focusedRoundIndex}-${focusedMatchIndex}`;
    } else if (tvFocusArea === 'bracket-modal' && selectedBracketMatch) {
      targetId = focusedModalChannelIndex === selectedBracketMatch.channels.length
        ? "tv-modal-close"
        : `tv-modal-channel-${focusedModalChannelIndex}`;
    }

    if (targetId) {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }
  }, [tvFocusArea, focusedFilterIndex, focusedChannelIndex, focusedGroupIndex, focusedSectionTabIndex, focusedRoundIndex, focusedMatchIndex, focusedModalChannelIndex, selectedBracketMatch]);

  // CSS helpers for D-pad focus states on Smart TV
  const isChannelFocused = (channelId) => {
    if (!isAndroidTV() || tvFocusArea !== 'channels') return false;
    const focusedChannel = focusableChannels[focusedChannelIndex];
    return focusedChannel && (focusedChannel.channel._id || focusedChannel.channel.id) === channelId;
  };

  const getFilterBtnClass = (tabName, index) => {
    const isActive = filterTab === tabName;
    const isFocused = isAndroidTV() && tvFocusArea === 'filters' && focusedFilterIndex === index;
    
    let base = "text-xs px-3.5 py-1.5 rounded-lg font-bold tracking-wide transition-all duration-200 ";
    if (isFocused) {
      base += "outline-none ring-4 ring-lime-400 scale-[1.04] border-lime-400/50 shadow-[0_0_25px_rgba(163,230,53,0.8)] z-10 bg-lime-500 text-slate-950 ";
    } else if (isActive) {
      base += "bg-lime-500 text-slate-950 shadow-md shadow-lime-500/10 ";
    } else {
      base += "text-slate-400 hover:text-white ";
    }
    return base;
  };

  const getGroupBtnClass = (groupName, index) => {
    const isActive = activeGroupTab === groupName;
    const isFocused = isAndroidTV() && tvFocusArea === 'groups' && focusedGroupIndex === index;
    
    let base = "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs font-black uppercase transition-all duration-300 cursor-pointer ";
    if (isFocused) {
      base += "outline-none ring-4 ring-lime-400 scale-[1.08] border-lime-400/50 shadow-[0_0_25px_rgba(163,230,53,0.8)] z-10 bg-lime-400 text-black font-extrabold ";
    } else if (isActive) {
      base += "bg-lime-400 text-black font-extrabold ";
    } else {
      base += "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white ";
    }
    return base;
  };

  const getChannelBtnClass = (channelId) => {
    const isFocused = isChannelFocused(channelId);
    let base = "group/channel cursor-pointer rounded-xl bg-slate-950/60 border border-white/5 p-2.5 flex items-center gap-3 transition-all duration-300 hover:bg-slate-900/80 active:scale-[0.98] ";
    if (isFocused) {
      base += "outline-none ring-4 ring-lime-400 scale-[1.04] border-lime-400/50 shadow-[0_0_25px_rgba(163,230,53,0.8)] z-10 bg-slate-900/80 ";
    } else {
      base += "hover:border-lime-400/40 ";
    }
    return base;
  };

  const getSectionTabClass = (tabName, index) => {
    const isActive = activeSectionTab === tabName;
    const isFocused = isAndroidTV() && tvFocusArea === 'sectionTabs' && focusedSectionTabIndex === index;
    
    let base = "text-sm font-black uppercase tracking-wider pb-2 border-b-2 transition-all duration-300 ";
    if (isFocused) {
      base += "outline-none text-lime-400 border-lime-400 scale-[1.04] ring-2 ring-lime-400 px-2 rounded-lg bg-lime-400/10 ";
    } else if (isActive) {
      base += "text-lime-400 border-lime-400 ";
    } else {
      base += "text-slate-400 border-transparent hover:text-white ";
    }
    return base;
  };

  const getBracketMatchClass = (match, rIdx, mIdx) => {
    const isLive = match.estado === "EN VIVO";
    const isFocused = isAndroidTV() && tvFocusArea === 'brackets' && focusedRoundIndex === rIdx && focusedMatchIndex === mIdx;
    
    let base = "relative overflow-hidden rounded-2xl bg-[#090616]/70 border p-3 flex flex-col gap-2 transition-all duration-300 cursor-pointer ";
    if (isFocused) {
      base += "outline-none ring-4 ring-lime-400 scale-[1.04] border-lime-400/50 shadow-[0_0_25px_rgba(163,230,53,0.8)] z-10 ";
    } else if (isLive) {
      base += "border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:border-red-500/60 ";
    } else {
      base += "border-white/5 hover:border-lime-400/40 hover:scale-[1.03] ";
    }
    return base;
  };

  // Datos de los Grupos del Mundial Oficiales (Format de 48 Equipos - Grupos A al L) - Calculados Dinámicamente
  const GROUPS_DATA = React.useMemo(() => {
    const groups = {
      A: [
        { pais: "México", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Corea del Sur", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Sudáfrica", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "República Checa", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
      ],
      B: [
        { pais: "Canadá", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Suiza", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Catar", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Bosnia y Herzegovina", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
      ],
      C: [
        { pais: "Brasil", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Marruecos", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Escocia", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Haití", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
      ],
      D: [
        { pais: "EE. UU.", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Paraguay", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Australia", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Turquía", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
      ],
      E: [
        { pais: "Alemania", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Ecuador", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Costa de Marfil", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Curazao", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
      ],
      F: [
        { pais: "Países Bajos", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Japón", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Túnez", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Suecia", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
      ],
      G: [
        { pais: "Bélgica", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Irán", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Egipto", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Nueva Zelanda", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
      ],
      H: [
        { pais: "España", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Uruguay", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Arabia Saudita", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Cabo Verde", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
      ],
      I: [
        { pais: "Francia", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Senegal", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Noruega", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Irak", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
      ],
      J: [
        { pais: "Argentina", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Austria", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Argelia", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Jordania", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
      ],
      K: [
        { pais: "Portugal", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Colombia", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Uzbekistán", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "R. D. del Congo", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
      ],
      L: [
        { pais: "Inglaterra", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Croacia", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Panamá", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
        { pais: "Ghana", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
      ]
    };

    // Computar estadísticas en base a los partidos cargados desde base de datos
    resolvedMundialMatches.forEach((match) => {
      if (match.grupo && (match.estado === "FINALIZADO" || match.estado === "EN VIVO")) {
        const groupKey = String(match.grupo).toUpperCase();
        const groupTeams = groups[groupKey];
        if (groupTeams) {
          const t1 = groupTeams.find(t => t.pais === match.equipo1);
          const t2 = groupTeams.find(t => t.pais === match.equipo2);
          
          if (t1 && t2) {
            const g1 = Number(match.goles1 || 0);
            const g2 = Number(match.goles2 || 0);
            
            t1.pj += 1;
            t2.pj += 1;
            t1.gf += g1;
            t1.gc += g2;
            t2.gf += g2;
            t2.gc += g1;
            
            if (g1 > g2) {
              t1.g += 1;
              t2.p += 1;
              t1.pts += 3;
            } else if (g2 > g1) {
              t2.g += 1;
              t1.p += 1;
              t2.pts += 3;
            } else {
              t1.e += 1;
              t2.e += 1;
              t1.pts += 1;
              t2.pts += 1;
            }
          }
        }
      }
    });

    // Ordenar los equipos de cada grupo según reglas oficiales (PTS, luego Diferencia, luego Favor)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        const diffA = a.gf - a.gc;
        const diffB = b.gf - b.gc;
        if (diffB !== diffA) return diffB - diffA;
        return b.gf - a.gf;
      });
    });

    return groups;
  }, [resolvedMundialMatches]);

  // 1. Calcular los mejores terceros en base a la tabla de posiciones actual
  const bestThirds = React.useMemo(() => {
    const thirds = [];
    Object.keys(GROUPS_DATA).forEach(groupKey => {
      const group = GROUPS_DATA[groupKey];
      if (group && group[2]) {
        thirds.push({
          ...group[2],
          grupo: groupKey
        });
      }
    });
    // Ordenar terceros: Puntos, Diferencia, Goles a Favor
    thirds.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const diffA = a.gf - a.gc;
      const diffB = b.gf - b.gc;
      if (diffB !== diffA) return diffB - diffA;
      return b.gf - a.gf;
    });
    return thirds;
  }, [GROUPS_DATA]);

  // 2. Calcular partidos de la Fase Eliminatoria (Brackets) dinámicamente
  const knockoutBracket = React.useMemo(() => {
    // Definición de emparejamientos de Dieciseisavos: [Equipo1Source, Equipo2Source]
    const pairings = [
      { t1: { type: 'winner', group: 'A' }, t2: { type: 'third', index: 0 } },  // 1A vs Mejor Tercero 1
      { t1: { type: 'runnerup', group: 'B' }, t2: { type: 'runnerup', group: 'C' } }, // 2B vs 2C
      { t1: { type: 'winner', group: 'C' }, t2: { type: 'third', index: 1 } },  // 1C vs Mejor Tercero 2
      { t1: { type: 'winner', group: 'B' }, t2: { type: 'runnerup', group: 'D' } }, // 1B vs 2D
      { t1: { type: 'winner', group: 'E' }, t2: { type: 'third', index: 2 } },  // 1E vs Mejor Tercero 3
      { t1: { type: 'runnerup', group: 'E' }, t2: { type: 'runnerup', group: 'F' } }, // 2E vs 2F
      { t1: { type: 'winner', group: 'G' }, t2: { type: 'third', index: 3 } },  // 1G vs Mejor Tercero 4
      { t1: { type: 'runnerup', group: 'G' }, t2: { type: 'runnerup', group: 'H' } }, // 2G vs 2H
      { t1: { type: 'winner', group: 'I' }, t2: { type: 'third', index: 4 } },  // 1I vs Mejor Tercero 5
      { t1: { type: 'runnerup', group: 'I' }, t2: { type: 'runnerup', group: 'J' } }, // 2I vs 2J
      { t1: { type: 'winner', group: 'K' }, t2: { type: 'third', index: 5 } },  // 1K vs Mejor Tercero 6
      { t1: { type: 'runnerup', group: 'K' }, t2: { type: 'runnerup', group: 'L' } }, // 2K vs 2L
      { t1: { type: 'winner', group: 'H' }, t2: { type: 'third', index: 6 } },  // 1H vs Mejor Tercero 7
      { t1: { type: 'winner', group: 'J' }, t2: { type: 'third', index: 7 } },  // 1J vs Mejor Tercero 8
      { t1: { type: 'winner', group: 'F' }, t2: { type: 'runnerup', group: 'A' } }, // 1F vs 2A
      { t1: { type: 'winner', group: 'L' }, t2: { type: 'runnerup', group: 'J' } }  // 1L vs 2J
    ];

    const getTeamName = (source) => {
      if (source.type === 'winner') {
        const group = GROUPS_DATA[source.group];
        if (group && group[0] && group[0].pj > 0) {
          return group[0].pais;
        }
        return `1º Grupo ${source.group}`;
      }
      if (source.type === 'runnerup') {
        const group = GROUPS_DATA[source.group];
        if (group && group[1] && group[1].pj > 0) {
          return group[1].pais;
        }
        return `2º Grupo ${source.group}`;
      }
      if (source.type === 'third') {
        const thirdTeam = bestThirds[source.index];
        if (thirdTeam && thirdTeam.pj > 0) {
          return thirdTeam.pais;
        }
        return `3º Mejor ${source.index + 1}`;
      }
      return 'Por definir';
    };

    // Crear mapa de equipo a grupo para poder identificar emparejamientos dinámicos
    const teamToGroup = {};
    Object.keys(GROUPS_DATA).forEach(groupKey => {
      GROUPS_DATA[groupKey].forEach(team => {
        teamToGroup[team.pais.toLowerCase()] = groupKey;
      });
    });

    const teamMatchesSource = (teamName, source) => {
      if (!teamName || !source) return false;
      const nameLower = teamName.toLowerCase();
      
      const computedName = getTeamName(source);
      if (nameLower === computedName.toLowerCase()) return true;
      
      const teamGroup = teamToGroup[nameLower];
      if (!teamGroup) return false;
      
      if (source.type === 'winner' || source.type === 'runnerup') {
        return teamGroup === source.group;
      }
      if (source.type === 'third') {
        return true; // Permitir cualquier tercer lugar si el otro equipo coincide
      }
      return false;
    };

    // Dieciseisavos de Final (Round of 32)
    const dieciseisavos = pairings.map((p, idx) => {
      const equipo1 = getTeamName(p.t1);
      const equipo2 = getTeamName(p.t2);
      
      const dbMatch = resolvedMundialMatches.find(m => 
        m.bracketKey === `d-${idx + 1}` || (
          !m.bracketKey &&
          (m.fase?.toLowerCase().includes("dieciseis") || m.fase?.toLowerCase().includes("16avos") || m.fase?.toLowerCase().includes("1/16") || m.fase?.toLowerCase().includes("32avos") || m.fase?.toLowerCase().includes("diez y seis")) &&
          (
            ((m.equipo1?.toLowerCase() === equipo1.toLowerCase() && m.equipo2?.toLowerCase() === equipo2.toLowerCase()) ||
             (m.equipo1?.toLowerCase() === equipo2.toLowerCase() && m.equipo2?.toLowerCase() === equipo1.toLowerCase())) ||
            (teamMatchesSource(m.equipo1, p.t1) && teamMatchesSource(m.equipo2, p.t2)) ||
            (teamMatchesSource(m.equipo1, p.t2) && teamMatchesSource(m.equipo2, p.t1))
          )
        )
      );

      if (dbMatch) {
        const useExactDbTeams = dbMatch.bracketKey === `d-${idx + 1}` || 
          (!dbMatch.bracketKey && (
            (teamMatchesSource(dbMatch.equipo1, p.t1) && teamMatchesSource(dbMatch.equipo2, p.t2)) ||
            (teamMatchesSource(dbMatch.equipo1, p.t2) && teamMatchesSource(dbMatch.equipo2, p.t1))
          ));
        const isReversed = !useExactDbTeams && dbMatch.equipo1?.toLowerCase() === equipo2.toLowerCase();
        return {
          id: `d-${idx + 1}`,
          dbId: dbMatch._id || dbMatch.id,
          equipo1: useExactDbTeams ? dbMatch.equipo1 : (isReversed ? dbMatch.equipo2 : dbMatch.equipo1),
          goles1: useExactDbTeams ? dbMatch.goles1 : (isReversed ? dbMatch.goles2 : dbMatch.goles1),
          equipo2: useExactDbTeams ? dbMatch.equipo2 : (isReversed ? dbMatch.equipo1 : dbMatch.equipo2),
          goles2: useExactDbTeams ? dbMatch.goles2 : (isReversed ? dbMatch.goles1 : dbMatch.goles2),
          estado: dbMatch.estado || "PRÓXIMO",
          fecha: dbMatch.fecha || "Por definir",
          hora: dbMatch.hora || "Por definir",
          ganador: dbMatch.estado === "FINALIZADO" 
            ? (Number(dbMatch.goles1) > Number(dbMatch.goles2) ? dbMatch.equipo1 : dbMatch.equipo2)
            : null,
          associatedChannels: dbMatch.associatedChannels || []
        };
      }

      return {
        id: `d-${idx + 1}`,
        equipo1,
        goles1: 0,
        equipo2,
        goles2: 0,
        estado: "PRÓXIMO",
        fecha: "Por definir",
        hora: "Por definir",
        ganador: null,
        associatedChannels: []
      };
    });

    // Octavos de Final (Round of 16)
    const octavosPairings = [
      { m1: dieciseisavos[0], m2: dieciseisavos[1] },
      { m1: dieciseisavos[2], m2: dieciseisavos[3] },
      { m1: dieciseisavos[4], m2: dieciseisavos[5] },
      { m1: dieciseisavos[6], m2: dieciseisavos[7] },
      { m1: dieciseisavos[8], m2: dieciseisavos[9] },
      { m1: dieciseisavos[10], m2: dieciseisavos[11] },
      { m1: dieciseisavos[12], m2: dieciseisavos[13] },
      { m1: dieciseisavos[14], m2: dieciseisavos[15] }
    ];

    const octavos = octavosPairings.map((p, idx) => {
      const equipo1 = p.m1.ganador || `Ganador 16avos ${idx * 2 + 1}`;
      const equipo2 = p.m2.ganador || `Ganador 16avos ${idx * 2 + 2}`;

      const dbMatch = resolvedMundialMatches.find(m => 
        m.bracketKey === `o-${idx + 1}` || (
          !m.bracketKey &&
          m.fase?.toLowerCase().includes("octavo") &&
          ((m.equipo1?.toLowerCase() === equipo1.toLowerCase() && m.equipo2?.toLowerCase() === equipo2.toLowerCase()) ||
           (m.equipo1?.toLowerCase() === equipo2.toLowerCase() && m.equipo2?.toLowerCase() === equipo1.toLowerCase()))
        )
      );

      if (dbMatch) {
        const useExactDbTeams = dbMatch.bracketKey === `o-${idx + 1}`;
        const isReversed = !useExactDbTeams && dbMatch.equipo1?.toLowerCase() === equipo2.toLowerCase();
        return {
          id: `o-${idx + 1}`,
          dbId: dbMatch._id || dbMatch.id,
          equipo1: isReversed ? dbMatch.equipo2 : dbMatch.equipo1,
          goles1: isReversed ? dbMatch.goles2 : dbMatch.goles1,
          equipo2: isReversed ? dbMatch.equipo1 : dbMatch.equipo2,
          goles2: isReversed ? dbMatch.goles1 : dbMatch.goles2,
          estado: dbMatch.estado || "PRÓXIMO",
          fecha: dbMatch.fecha || "Por definir",
          hora: dbMatch.hora || "Por definir",
          ganador: dbMatch.estado === "FINALIZADO" 
            ? (Number(dbMatch.goles1) > Number(dbMatch.goles2) ? dbMatch.equipo1 : dbMatch.equipo2)
            : null,
          associatedChannels: dbMatch.associatedChannels || []
        };
      }

      return {
        id: `o-${idx + 1}`,
        equipo1,
        goles1: 0,
        equipo2,
        goles2: 0,
        estado: "PRÓXIMO",
        fecha: "Por definir",
        hora: "Por definir",
        ganador: null,
        associatedChannels: []
      };
    });

    // Cuartos de Final
    const cuartosPairings = [
      { m1: octavos[0], m2: octavos[1] },
      { m1: octavos[2], m2: octavos[3] },
      { m1: octavos[4], m2: octavos[5] },
      { m1: octavos[6], m2: octavos[7] }
    ];

    const cuartos = cuartosPairings.map((p, idx) => {
      const equipo1 = p.m1.ganador || `Ganador Octavos ${idx * 2 + 1}`;
      const equipo2 = p.m2.ganador || `Ganador Octavos ${idx * 2 + 2}`;

      const dbMatch = resolvedMundialMatches.find(m => 
        m.bracketKey === `c-${idx + 1}` || (
          !m.bracketKey &&
          m.fase?.toLowerCase().includes("cuarto") &&
          ((m.equipo1?.toLowerCase() === equipo1.toLowerCase() && m.equipo2?.toLowerCase() === equipo2.toLowerCase()) ||
           (m.equipo1?.toLowerCase() === equipo2.toLowerCase() && m.equipo2?.toLowerCase() === equipo1.toLowerCase()))
        )
      );

      if (dbMatch) {
        const useExactDbTeams = dbMatch.bracketKey === `c-${idx + 1}`;
        const isReversed = !useExactDbTeams && dbMatch.equipo1?.toLowerCase() === equipo2.toLowerCase();
        return {
          id: `c-${idx + 1}`,
          dbId: dbMatch._id || dbMatch.id,
          equipo1: isReversed ? dbMatch.equipo2 : dbMatch.equipo1,
          goles1: isReversed ? dbMatch.goles2 : dbMatch.goles1,
          equipo2: isReversed ? dbMatch.equipo1 : dbMatch.equipo2,
          goles2: isReversed ? dbMatch.goles1 : dbMatch.goles2,
          estado: dbMatch.estado || "PRÓXIMO",
          fecha: dbMatch.fecha || "Por definir",
          hora: dbMatch.hora || "Por definir",
          ganador: dbMatch.estado === "FINALIZADO" 
            ? (Number(dbMatch.goles1) > Number(dbMatch.goles2) ? dbMatch.equipo1 : dbMatch.equipo2)
            : null,
          associatedChannels: dbMatch.associatedChannels || []
        };
      }

      return {
        id: `c-${idx + 1}`,
        equipo1,
        goles1: 0,
        equipo2,
        goles2: 0,
        estado: "PRÓXIMO",
        fecha: "Por definir",
        hora: "Por definir",
        ganador: null,
        associatedChannels: []
      };
    });

    // Semifinales
    const semisPairings = [
      { m1: cuartos[0], m2: cuartos[1] },
      { m1: cuartos[2], m2: cuartos[3] }
    ];

    const semis = semisPairings.map((p, idx) => {
      const equipo1 = p.m1.ganador || `Ganador Cuartos ${idx * 2 + 1}`;
      const equipo2 = p.m2.ganador || `Ganador Cuartos ${idx * 2 + 2}`;

      const dbMatch = resolvedMundialMatches.find(m => 
        m.bracketKey === `s-${idx + 1}` || (
          !m.bracketKey &&
          (m.fase?.toLowerCase().includes("semifinal") || m.fase?.toLowerCase().includes("semi-final")) &&
          ((m.equipo1?.toLowerCase() === equipo1.toLowerCase() && m.equipo2?.toLowerCase() === equipo2.toLowerCase()) ||
           (m.equipo1?.toLowerCase() === equipo2.toLowerCase() && m.equipo2?.toLowerCase() === equipo1.toLowerCase()))
        )
      );

      if (dbMatch) {
        const useExactDbTeams = dbMatch.bracketKey === `s-${idx + 1}`;
        const isReversed = !useExactDbTeams && dbMatch.equipo1?.toLowerCase() === equipo2.toLowerCase();
        return {
          id: `s-${idx + 1}`,
          dbId: dbMatch._id || dbMatch.id,
          equipo1: isReversed ? dbMatch.equipo2 : dbMatch.equipo1,
          goles1: isReversed ? dbMatch.goles2 : dbMatch.goles1,
          equipo2: isReversed ? dbMatch.equipo1 : dbMatch.equipo2,
          goles2: isReversed ? dbMatch.goles1 : dbMatch.goles2,
          estado: dbMatch.estado || "PRÓXIMO",
          fecha: dbMatch.fecha || "Por definir",
          hora: dbMatch.hora || "Por definir",
          ganador: dbMatch.estado === "FINALIZADO" 
            ? (Number(dbMatch.goles1) > Number(dbMatch.goles2) ? dbMatch.equipo1 : dbMatch.equipo2)
            : null,
          associatedChannels: dbMatch.associatedChannels || []
        };
      }

      return {
        id: `s-${idx + 1}`,
        equipo1,
        goles1: 0,
        equipo2,
        goles2: 0,
        estado: "PRÓXIMO",
        fecha: "Por definir",
        hora: "Por definir",
        ganador: null,
        associatedChannels: []
      };
    });

    // Gran Final
    const finalPairings = [
      { m1: semis[0], m2: semis[1] }
    ];

    const final = finalPairings.map((p, idx) => {
      const equipo1 = p.m1.ganador || `Ganador Semis 1`;
      const equipo2 = p.m2.ganador || `Ganador Semis 2`;

      const dbMatch = resolvedMundialMatches.find(m => 
        m.bracketKey === `f-${idx + 1}` || (
          !m.bracketKey &&
          m.fase?.toLowerCase().includes("final") && !m.fase?.toLowerCase().includes("semi") && !m.fase?.toLowerCase().includes("cuarto") && !m.fase?.toLowerCase().includes("octavo") &&
          ((m.equipo1?.toLowerCase() === equipo1.toLowerCase() && m.equipo2?.toLowerCase() === equipo2.toLowerCase()) ||
           (m.equipo1?.toLowerCase() === equipo2.toLowerCase() && m.equipo2?.toLowerCase() === equipo1.toLowerCase()))
        )
      );

      if (dbMatch) {
        const useExactDbTeams = dbMatch.bracketKey === `f-${idx + 1}`;
        const isReversed = !useExactDbTeams && dbMatch.equipo1?.toLowerCase() === equipo2.toLowerCase();
        return {
          id: `f-${idx + 1}`,
          dbId: dbMatch._id || dbMatch.id,
          equipo1: isReversed ? dbMatch.equipo2 : dbMatch.equipo1,
          goles1: isReversed ? dbMatch.goles2 : dbMatch.goles1,
          equipo2: isReversed ? dbMatch.equipo1 : dbMatch.equipo2,
          goles2: isReversed ? dbMatch.goles1 : dbMatch.goles2,
          estado: dbMatch.estado || "PRÓXIMO",
          fecha: dbMatch.fecha || "Por definir",
          hora: dbMatch.hora || "Por definir",
          ganador: dbMatch.estado === "FINALIZADO" 
            ? (Number(dbMatch.goles1) > Number(dbMatch.goles2) ? dbMatch.equipo1 : dbMatch.equipo2)
            : null,
          associatedChannels: dbMatch.associatedChannels || []
        };
      }

      return {
        id: `f-${idx + 1}`,
        equipo1,
        goles1: 0,
        equipo2,
        goles2: 0,
        estado: "PRÓXIMO",
        fecha: "Por definir",
        hora: "Por definir",
        ganador: null,
        associatedChannels: []
      };
    });

    return {
      dieciseisavos,
      octavos,
      cuartos,
      semis,
      final
    };
  }, [GROUPS_DATA, bestThirds, resolvedMundialMatches]);

  // Calendario de partidos destacados reales - Filtrados por "clave" desde base de datos
  const MATCHES = React.useMemo(() => {
    const filtered = resolvedMundialMatches.filter(m => m.clave === true);
    
    // Si no hay ninguno destacado en la base de datos, mostramos los primeros 4 partidos de la lista
    const listToMap = filtered.length > 0 ? filtered : resolvedMundialMatches.slice(0, 4);
    
    return listToMap.map(m => ({
      id: m.id,
      fase: m.fase,
      fecha: m.fecha,
      hora: m.hora,
      estadio: m.estadio,
      equipo1: { nombre: m.equipo1, score: m.goles1 || 0 },
      equipo2: { nombre: m.equipo2, score: m.goles2 || 0 },
      estado: m.estado || "PRÓXIMO"
    }));
  }, [resolvedMundialMatches]);

  // Estadios emblemáticos
  const STADIUMS = [
    {
      nombre: "Estadio Azteca",
      ciudad: "Ciudad de México, México",
      capacidad: "87,523",
      descripcion: "El legendario estadio que albergará su tercer partido inaugural de la Copa del Mundo.",
      imagen: "https://revistamercado.do/wp-content/uploads/2026/06/Estadio-Azteca-60-an%CC%83os-tres-mundiales-y-los-momentos-que-cambiaron-el-fu%CC%81tbol.jpg",
    },
    {
      nombre: "MetLife Stadium",
      ciudad: "East Rutherford, Nueva Jersey, EE. UU.",
      capacidad: "82,500",
      descripcion: "El gigante de Nueva York seleccionado para albergar la Gran Final del Mundial 2026.",
      imagen: "https://copaamerica-imagens-prod.s3.sa-east-1.amazonaws.com/Metlife_Stadium_2_8333461e8b.jpeg",
    },
    {
      nombre: "BC Place",
      ciudad: "Vancouver, Canadá",
      capacidad: "54,500",
      descripcion: "Espectacular estadio con techo retráctil situado a orillas de la bahía de Vancouver.",
      imagen: "https://wwf.ca/wp-content/uploads/2024/01/BCP5-scaled.jpg",
    },
    {
      nombre: "SoFi Stadium",
      ciudad: "Los Ángeles, California, EE. UU.",
      capacidad: "70,240",
      descripcion: "Una maravilla arquitectónica de alta tecnología, la más costosa y moderna del planeta.",
      imagen: "https://st1.uvnimg.com/57/06/1ea828bd4fd2a0bbd5583b39f240/002-sofi-stadium-donde-queda-y-que-partidos-de-copa-america-se-jugaran-ahi.jpg",
    },
  ];

  const renderBracket = () => {
    const rounds = [
      { title: "Dieciseisavos de Final", data: knockoutBracket.dieciseisavos || [] },
      { title: "Octavos de Final", data: knockoutBracket.octavos || [] },
      { title: "Cuartos de Final", data: knockoutBracket.cuartos || [] },
      { title: "Semifinales", data: knockoutBracket.semis || [] },
      { title: "Gran Final", data: knockoutBracket.final || [] }
    ];

    return (
      <div className="w-full overflow-x-auto py-4 hide-scrollbar select-none">
        <div className="flex gap-6 min-w-[1250px] justify-between px-2">
          {rounds.map((round, rIdx) => (
            <div key={rIdx} className="flex-1 flex flex-col min-w-[220px]">
              <div className="text-center py-2 bg-slate-900/60 border border-white/5 rounded-xl mb-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                  {round.title}
                </span>
              </div>
              <div className="flex-1 flex flex-col justify-around gap-4 min-h-[480px]">
                {round.data.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed border-white/5 rounded-2xl bg-white/[0.01] min-h-[100px]">
                    <span className="text-[9px] uppercase font-black tracking-widest text-slate-500 text-center">
                      Por definir
                    </span>
                  </div>
                ) : (
                  round.data.map((match, mIdx) => {
                    const isFinished = match.estado === "FINALIZADO";
                    const isLive = match.estado === "EN VIVO";
                    
                    const win1 = match.ganador === match.equipo1;
                    const win2 = match.ganador === match.equipo2;
                    
                    const hasWinner = !!match.ganador;

                    return (
                      <div
                        id={`tv-bracket-match-${rIdx}-${mIdx}`}
                        key={match.id}
                        onClick={() => handleBracketMatchClick(match)}
                        className={getBracketMatchClass(match, rIdx, mIdx)}
                      >
                        {/* Live Badge */}
                        {isLive && (
                          <span className="absolute top-2 right-2 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                        )}

                        {/* Header details */}
                        <div className="flex justify-between items-center text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-1.5 mb-0.5">
                          <span>{match.fecha}</span>
                          <span className={isLive ? "text-red-400 font-extrabold animate-pulse" : "text-slate-400 font-bold"}>
                            {isLive ? "EN VIVO" : match.hora}
                          </span>
                        </div>

                        {/* Team 1 Row */}
                        <div className={`flex items-center justify-between gap-2 ${hasWinner && !win1 ? "opacity-40" : ""}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={getFlagUrl(match.equipo1)}
                              alt=""
                              className="w-5 h-3.5 object-cover rounded shadow-sm border border-white/10 flex-shrink-0"
                              onError={(e) => { e.currentTarget.src = "https://flagcdn.com/w40/un.png"; }}
                            />
                            <span className={`text-[11px] truncate ${win1 ? "text-lime-300 font-extrabold" : "text-slate-200 font-bold"}`}>
                              {match.equipo1}
                            </span>
                          </div>
                          {!isFinished && !isLive ? (
                            <span className="text-[10px] text-slate-600 font-bold font-mono">-</span>
                          ) : (
                            <span className={`text-[11px] font-black font-mono ${win1 ? "text-lime-300" : "text-slate-300"}`}>
                              {match.goles1}
                            </span>
                          )}
                        </div>

                        {/* Team 2 Row */}
                        <div className={`flex items-center justify-between gap-2 ${hasWinner && !win2 ? "opacity-40" : ""}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={getFlagUrl(match.equipo2)}
                              alt=""
                              className="w-5 h-3.5 object-cover rounded shadow-sm border border-white/10 flex-shrink-0"
                              onError={(e) => { e.currentTarget.src = "https://flagcdn.com/w40/un.png"; }}
                            />
                            <span className={`text-[11px] truncate ${win2 ? "text-lime-300 font-extrabold" : "text-slate-200 font-bold"}`}>
                              {match.equipo2}
                            </span>
                          </div>
                          {!isFinished && !isLive ? (
                            <span className="text-[10px] text-slate-600 font-bold font-mono">-</span>
                          ) : (
                            <span className={`text-[11px] font-black font-mono ${win2 ? "text-lime-300" : "text-slate-300"}`}>
                              {match.goles2}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleChannelClick = (channel) => {
    navigate(`/watch/channel/${channel._id || channel.id}`, {
      state: { from: "/mundial-2026" }
    });
  };

  return (
    <>
      <style>{`
        .mundial-bg {
          background-color: #050212;
          background-image: 
            radial-gradient(circle at 10% 20%, rgba(190, 242, 100, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 80% 10%, rgba(34, 211, 238, 0.1) 0%, transparent 35%),
            radial-gradient(circle at 50% 90%, rgba(236, 72, 153, 0.06) 0%, transparent 45%);
          min-height: 100vh;
        }

        .border-double-bezel {
          border: 1px solid rgba(190, 242, 100, 0.15);
          background: rgba(18, 10, 36, 0.65);
          backdrop-filter: blur(20px);
          box-shadow: 
            0 0 0 1px rgba(255, 255, 255, 0.02) inset,
            0 12px 30px rgba(0, 0, 0, 0.6);
        }

        .inner-bezel {
          background: rgba(4, 2, 10, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .volt-glow-border:hover {
          border-color: rgba(190, 242, 100, 0.5);
          box-shadow: 0 0 20px rgba(190, 242, 100, 0.18);
        }

        .text-glow-volt {
          text-shadow: 0 0 10px rgba(190, 242, 100, 0.4);
        }

        .custom-spring-transition {
          transition: all 600ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <div className="mundial-bg text-white pb-8 pt-3">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* SECCIÓN HERO COUNTDOWN */}
          <div className="border-double-bezel rounded-[2.5rem] p-1.5 mb-5">
            <div className="inner-bezel rounded-[calc(2.5rem-0.375rem)] p-4 md:p-6 flex flex-col lg:flex-row items-center justify-between gap-5 relative overflow-hidden">
              {/* Blur atmosférico decorativo */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-lime-400/10 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="flex-1 text-center lg:text-left z-10">
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] bg-lime-400/10 text-lime-300 mb-2 border border-lime-400/20">
                  <Sparkles className="w-3.5 h-3.5" /> Portal Especial Mundial 2026
                </div>
                <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter mb-2 leading-none">
                  COPA MUNDIAL DE LA <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-300 via-cyan-400 to-fuchsia-500 text-glow-volt">FIFA 2026</span>
                </h1>
                <p className="text-slate-300 text-xs md:text-sm max-w-xl leading-relaxed">
                  Sigue la máxima cita del fútbol mundial organizada por Canadá, México y Estados Unidos. Disfruta de transmisiones en vivo, estadios icónicos y el fixture completo.
                </p>
              </div>

              {/* CONTADOR COUNTDOWN AL ESTILO OFICIAL FIFA 2026 */}
              <div className="z-10 bg-[#0d0722]/55 border border-indigo-500/10 backdrop-blur-xl rounded-[2rem] p-4 sm:p-5 flex flex-col items-center justify-center min-w-[280px] sm:min-w-[340px] shadow-2xl relative">
                <span className="text-[10px] uppercase tracking-[0.25em] font-black text-cyan-400 mb-2.5 flex items-center gap-1.5 drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]">
                  <Trophy className="w-3.5 h-3.5 text-cyan-400" /> Cuenta Regresiva al Kickoff
                </span>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <DigitGroup value={timeLeft.dias} label="Días" length={timeLeft.dias >= 100 ? 3 : 2} />
                  <GroupSeparator />
                  <DigitGroup value={timeLeft.horas} label="Horas" length={2} />
                  <GroupSeparator />
                  <DigitGroup value={timeLeft.minutos} label="Minutos" length={2} />
                  <GroupSeparator />
                  <DigitGroup value={timeLeft.segundos} label="Segundos" length={2} isLime={true} />
                </div>
                <div className="mt-3.5 border-t border-white/10 pt-3 w-full text-center">
                  <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">
                    Jueves, 11 de Junio del 2026 - 14:00
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* GRID BENTO ASIMÉTRICO */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            
            {/* CARD 1: FIXTURE OFICIAL DE PARTIDOS Y TRANSMISIONES (col-span-8) */}
            <div className="lg:col-span-8 border-double-bezel rounded-[2rem] p-1.5 flex flex-col justify-between">
              <div className="inner-bezel rounded-[calc(2rem-0.375rem)] p-4 sm:p-5 h-full flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg md:text-xl font-black uppercase tracking-wider text-white flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-lime-400" /> Fixture & Transmisiones del Mundial
                    </h2>
                    <span className="text-xs font-bold bg-lime-500/10 text-lime-300 py-1 px-3 rounded-full border border-lime-400/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-lime-500 rounded-full animate-pulse"></span>
                      EN VIVO
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs md:text-sm mb-3.5">
                    Selecciona un partido del fixture y haz clic en los canales disponibles debajo para ver la transmisión en directo.
                  </p>
                  
                  {/* Selector de Pestañas de Fixture */}
                  <div className="flex flex-wrap gap-1 p-1 bg-slate-950/60 border border-white/5 rounded-xl mb-4 self-start">
                    <button
                      id="tv-filter-0"
                      onClick={() => setFilterTab("active")}
                      className={getFilterBtnClass("active", 0)}
                    >
                      En Vivo / Próximos
                    </button>
                    <button
                      id="tv-filter-1"
                      onClick={() => setFilterTab("finished")}
                      className={getFilterBtnClass("finished", 1)}
                    >
                      Finalizados
                    </button>
                    <button
                      id="tv-filter-2"
                      onClick={() => setFilterTab("all")}
                      className={getFilterBtnClass("all", 2)}
                    >
                      Todos ({resolvedMundialMatches.length})
                    </button>
                  </div>
                </div>

                {loadingChannels ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-10 h-10 border-2 border-lime-400 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Cargando fixture y canales...</p>
                  </div>
                ) : displayMatches.length > 0 ? (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {displayMatches.map((match) => {
                      const associatedChannels = match.associatedChannels || [];

                      return (
                        <div
                          key={match.id}
                          className="group/match relative overflow-hidden rounded-2xl bg-slate-950/40 border border-white/5 hover:border-lime-500/20 p-4 transition-all duration-300"
                        >
                          {/* Fondo de resplandor sutil al hacer hover */}
                          <div className="absolute inset-0 bg-gradient-to-r from-lime-500/[0.02] to-cyan-500/[0.02] opacity-0 group-hover/match:opacity-100 transition-opacity pointer-events-none" />

                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-3 mb-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] uppercase tracking-wider font-extrabold text-cyan-400 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-500/10">
                                {match.fase}
                              </span>
                              {match.grupo && (
                                <span className="text-[10px] uppercase tracking-wider font-extrabold text-lime-400 bg-lime-950/30 px-2 py-0.5 rounded border border-lime-500/10">
                                  Grupo {match.grupo}
                                </span>
                              )}
                              {match.estado !== "PRÓXIMO" && (
                                <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded border ${
                                  match.estado === "EN VIVO"
                                    ? "text-red-400 bg-red-950/30 border-red-500/20 animate-pulse"
                                    : "text-purple-400 bg-purple-950/30 border-purple-500/20"
                                }`}>
                                  {match.estado}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-lime-400" /> {match.fecha}</span>
                              <span className="text-white font-bold font-mono bg-white/5 px-2 py-0.5 rounded">{match.hora}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-7 items-center justify-center gap-4 py-2">
                            {/* Equipo 1 */}
                            <div className="sm:col-span-3 flex items-center justify-start sm:justify-end gap-3">
                              <span className="font-extrabold text-sm sm:text-base text-slate-200 order-2 sm:order-1">{match.equipo1}</span>
                              <img
                                src={getFlagUrl(match.equipo1)}
                                alt=""
                                className="w-8 h-5.5 object-cover rounded shadow-md border border-white/10 order-1 sm:order-2"
                                onError={(e) => { e.currentTarget.src = "https://flagcdn.com/w40/un.png"; }}
                              />
                            </div>

                            {/* VS Badge / Score */}
                            <div className="sm:col-span-1 flex flex-col items-center justify-center">
                              {match.estado === "PRÓXIMO" ? (
                                <span className="text-xs font-black px-3 py-1 rounded-full bg-slate-900 border border-white/10 text-slate-500 select-none shadow-inner">
                                  VS
                                </span>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-sm font-black font-mono px-3.5 py-1 rounded-xl bg-lime-400/10 border border-lime-400/30 text-lime-400 select-none shadow-md shadow-lime-400/5 tracking-wider">
                                    {match.goles1} - {match.goles2}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Equipo 2 */}
                            <div className="sm:col-span-3 flex items-center justify-start gap-3">
                              <img
                                src={getFlagUrl(match.equipo2)}
                                alt=""
                                className="w-8 h-5.5 object-cover rounded shadow-md border border-white/10"
                                onError={(e) => { e.currentTarget.src = "https://flagcdn.com/w40/un.png"; }}
                              />
                              <span className="font-extrabold text-sm sm:text-base text-slate-200">{match.equipo2}</span>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            <span>{match.estadio}</span>
                          </div>

                          {/* Sección de Canales Vinculados */}
                          <div className="mt-4 pt-3 border-t border-white/5">
                            {associatedChannels.length > 0 ? (
                              <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-lime-400 block">
                                  📺 CANALES TRANSMITIENDO EN VIVO:
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {associatedChannels.map((channel) => (
                                    <div
                                      key={channel._id || channel.id}
                                      id={`tv-channel-${channel._id || channel.id}`}
                                      onClick={() => handleChannelClick(channel)}
                                      className={getChannelBtnClass(channel._id || channel.id)}
                                    >
                                      <div className="w-8 h-8 rounded-lg bg-black/50 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover/channel:border-lime-400/30 transition-colors">
                                        <img
                                          src={rewriteImageUrl(channel.customThumbnail || channel.logo || channel.thumbnail)}
                                          alt={channel.name}
                                          onError={(e) => { e.target.src = "./logo-teamg.png"; }}
                                          className="w-full h-full object-contain p-1 group-hover/channel:scale-105 transition-transform"
                                        />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <span className="font-bold text-xs text-slate-300 group-hover/channel:text-white truncate block">
                                          {channel.name}
                                        </span>
                                        <span className="text-[9px] text-lime-400 font-semibold flex items-center gap-1 mt-0.5">
                                          <span className="w-1.5 h-1.5 bg-lime-400 rounded-full animate-ping inline-block mr-1"></span>
                                          REPRODUCIR
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-2 bg-slate-950/20 border border-dashed border-white/5 rounded-xl">
                                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                                  Transmisión no asignada para este encuentro
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-950/20 border border-white/5 rounded-2xl w-full">
                    <p className="text-slate-400 text-sm mb-2">
                      No hay partidos en esta categoría
                    </p>
                    {filterTab === "active" && (
                      <button
                        onClick={() => setFilterTab("all")}
                        className="text-xs text-lime-400 font-bold hover:underline"
                      >
                        Ver todos los partidos ({resolvedMundialMatches.length})
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* CARD 2: DATO RÁPIDO Y DETALLES DEL MUNDIAL (col-span-4) */}
            <div className="lg:col-span-4 border-double-bezel rounded-[2rem] p-1.5">
              <div className="inner-bezel rounded-[calc(2rem-0.375rem)] p-5 sm:p-6 h-full flex flex-col justify-between">
                <div>
                  <h2 className="text-lg md:text-2xl font-black uppercase tracking-wider text-white mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5 text-fuchsia-400 animate-pulse" /> Ficha Técnica FIFA
                  </h2>
                  <div className="space-y-6 md:space-y-8 my-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3.5">
                      <span className="text-sm sm:text-base font-semibold text-slate-400">Edición</span>
                      <span className="text-sm sm:text-base font-bold text-white">23ª Copa del Mundo</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-3.5">
                      <span className="text-sm sm:text-base font-semibold text-slate-400">Países Anfitriones</span>
                      <span className="text-sm sm:text-base font-bold text-white">Canadá, México, EE. UU.</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-3.5">
                      <span className="text-sm sm:text-base font-semibold text-slate-400">Equipos Totales</span>
                      <span className="text-sm sm:text-base font-bold text-lime-300">48 Países (Récord)</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-3.5">
                      <span className="text-sm sm:text-base font-semibold text-slate-400">Partidos Totales</span>
                      <span className="text-sm sm:text-base font-bold text-white">104 Encuentros</span>
                    </div>
                    <div className="flex justify-between items-center pb-2">
                      <span className="text-sm sm:text-base font-semibold text-slate-400">Fórmula de Grupos</span>
                      <span className="text-sm sm:text-base font-bold text-white">12 Grupos de 4 Equipos</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 md:mt-16 bg-gradient-to-br from-fuchsia-900/20 to-purple-900/10 border border-fuchsia-500/20 rounded-2xl p-5 sm:p-6">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-fuchsia-300 mb-2 flex items-center gap-1.5">
                    ⚽ Formato Expandido 2026
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Clasificarán los dos primeros equipos de cada uno de los 12 grupos junto con los ocho mejores terceros para conformar la nueva fase eliminatoria de dieciseisavos de final.
                  </p>
                </div>
              </div>
            </div>

            {/* CARD 3: TABLA DE GRUPOS (col-span-8) */}
            <div className="lg:col-span-8 border-double-bezel rounded-[2rem] p-1.5">
              <div className="inner-bezel rounded-[calc(2rem-0.375rem)] p-4 sm:p-5">
                
                {/* Selector de Sección (Tablas de Grupos vs Brackets) */}
                <div className="flex border-b border-white/5 pb-3 mb-4 gap-4">
                  <button
                    id="tv-section-tab-0"
                    onClick={() => setActiveSectionTab("groups")}
                    className={getSectionTabClass("groups", 0)}
                  >
                    Tablas de Grupos
                  </button>
                  <button
                    id="tv-section-tab-1"
                    onClick={() => setActiveSectionTab("brackets")}
                    className={getSectionTabClass("brackets", 1)}
                  >
                    Fase Eliminatoria (Brackets)
                  </button>
                </div>

                {activeSectionTab === "groups" ? (
                  <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-3.5">
                      <h2 className="text-lg md:text-xl font-black uppercase tracking-wider text-white flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-lime-400" /> Clasificaciones de Grupos
                      </h2>
                      
                      {/* Selector de Pestañas de Grupos */}
                      <div className="grid grid-cols-6 sm:flex sm:flex-wrap gap-1 max-w-full pb-2 sm:pb-0">
                        {Object.keys(GROUPS_DATA).map((group, idx) => (
                          <button
                            key={group}
                            id={`tv-group-${idx}`}
                            onClick={() => setActiveGroupTab(group)}
                            className={getGroupBtnClass(group, idx)}
                          >
                            {group}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tabla de Resultados del Grupo */}
                    <div className="overflow-x-auto border border-white/5 rounded-2xl bg-black/25">
                      <table className="min-w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 text-slate-500 text-[10px] sm:text-sm font-black uppercase tracking-wider bg-white/[0.02]">
                            <th className="py-3 sm:py-5 px-1 sm:px-4 w-8 sm:w-12 text-center">Pos</th>
                            <th className="py-3 sm:py-5 px-1.5 sm:px-4">País</th>
                            <th className="py-3 sm:py-5 px-1 sm:px-4 text-center">PJ</th>
                            <th className="py-3 sm:py-5 px-1 sm:px-4 text-center">G</th>
                            <th className="py-3 sm:py-5 px-1 sm:px-4 text-center">E</th>
                            <th className="py-3 sm:py-5 px-1 sm:px-4 text-center">P</th>
                            <th className="py-3 sm:py-5 px-1 sm:px-4 text-center">GF:GC</th>
                            <th className="py-3 sm:py-5 px-1.5 sm:px-4 text-center font-bold text-lime-400">Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {GROUPS_DATA[activeGroupTab].map((team, idx) => (
                            <tr
                              key={team.pais}
                              className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                            >
                              <td className="py-3 sm:py-5 px-1 sm:px-4 text-center font-bold text-xs sm:text-base text-slate-400">{idx + 1}</td>
                              <td className="py-3 sm:py-5 px-1.5 sm:px-4 flex items-center gap-1.5 sm:gap-4 min-w-0">
                                <img
                                  src={getFlagUrl(team.pais)}
                                  alt={team.pais}
                                  className="w-5 h-3.5 sm:w-8 sm:h-5.5 object-cover rounded shadow-md flex-shrink-0"
                                  onError={(e) => { e.currentTarget.src = "https://flagcdn.com/w40/un.png"; }}
                                />
                                <span className="font-bold text-xs sm:text-base text-slate-200 truncate">{team.pais}</span>
                              </td>
                              <td className="py-3 sm:py-5 px-1 sm:px-4 text-center text-xs sm:text-base text-slate-300">{team.pj}</td>
                              <td className="py-3 sm:py-5 px-1 sm:px-4 text-center text-xs sm:text-base text-slate-300">{team.g}</td>
                              <td className="py-3 sm:py-5 px-1 sm:px-4 text-center text-xs sm:text-base text-slate-300">{team.e}</td>
                              <td className="py-3 sm:py-5 px-1 sm:px-4 text-center text-xs sm:text-base text-slate-300">{team.p}</td>
                              <td className="py-3 sm:py-5 px-1 sm:px-4 text-center text-xs sm:text-base text-slate-400">
                                {team.gf}:{team.gc}
                              </td>
                              <td className="py-3 sm:py-5 px-1.5 sm:px-4 text-center font-black text-xs sm:text-lg text-lime-300">{team.pts}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  renderBracket()
                )}

              </div>
            </div>

            {/* CARD 4: CRONOGRAMA DE PARTIDOS DESTACADOS (col-span-4) */}
            <div className="lg:col-span-4 border-double-bezel rounded-[2rem] p-1.5 flex flex-col justify-between">
              <div className="inner-bezel rounded-[calc(2rem-0.375rem)] p-4 sm:p-5 h-full flex flex-col justify-between">
                <div>
                  <h2 className="text-lg md:text-xl font-black uppercase tracking-wider text-white mb-2.5 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-cyan-400" /> Partidos Clave
                  </h2>
                  <div className="space-y-2.5">
                    {MATCHES.map((match) => (
                      <div
                        key={match.id}
                        className="bg-slate-950/50 border border-white/5 rounded-2xl p-2.5 sm:p-3 flex flex-col gap-2 transition-colors hover:border-white/10"
                      >
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                          <span>{match.fase}</span>
                          <span className={
                            match.estado === "EN VIVO"
                              ? "text-lime-400 font-extrabold uppercase tracking-widest animate-pulse flex items-center gap-1"
                              : match.estado === "FINALIZADO"
                              ? "text-fuchsia-400 uppercase tracking-widest"
                              : "text-cyan-400 uppercase tracking-widest"
                          }>
                            {match.estado === "EN VIVO" && <span className="w-1.5 h-1.5 rounded-full bg-lime-400 inline-block mr-1"></span>}
                            {match.estado}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          {/* Equipo 1 */}
                          <div className="flex items-center gap-2">
                            <img src={getFlagUrl(match.equipo1.nombre)} alt={match.equipo1.nombre} className="w-5 h-3.5 object-cover rounded-sm shadow-sm" />
                            <span className="font-bold text-xs text-slate-300">{match.equipo1.nombre}</span>
                          </div>
                          {/* Score simulated */}
                          <div className="bg-black/50 border border-white/10 rounded-lg px-2 py-0.5 text-[11px] font-black text-white/60">
                            {match.estado === "PRÓXIMO" ? (
                              "-"
                            ) : (
                              <span className="text-lime-300 font-mono font-black">{match.equipo1.score} - {match.equipo2.score}</span>
                            )}
                          </div>
                          {/* Equipo 2 */}
                          <div className="flex items-center gap-2 flex-row-reverse">
                            <img src={getFlagUrl(match.equipo2.nombre)} alt={match.equipo2.nombre} className="w-5 h-3.5 object-cover rounded-sm shadow-sm" />
                            <span className="font-bold text-xs text-slate-300">{match.equipo2.nombre}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-semibold text-slate-500 uppercase border-t border-white/5 pt-2">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span className="max-w-[110px] truncate">{match.estadio}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-lime-400" />
                            <span className="text-slate-400">{match.fecha}</span>
                            <span className="text-white font-bold font-mono bg-white/5 px-1.5 py-0.5 rounded text-[10px]">
                              {match.hora}
                            </span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 5: SEDES Y ESTADIOS DESTACADOS (col-span-12) */}
            <div className="lg:col-span-12 border-double-bezel rounded-[2rem] p-1.5">
              <div className="inner-bezel rounded-[calc(2rem-0.375rem)] p-4 sm:p-5">
                <h2 className="text-lg md:text-xl font-black uppercase tracking-wider text-white mb-3.5 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-lime-400" /> Sedes Emblemáticas
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {STADIUMS.map((stadium) => (
                    <div
                      key={stadium.nombre}
                      className="group overflow-hidden rounded-[1.5rem] border border-white/5 bg-slate-950/30 flex flex-col justify-between transition-all duration-300 hover:border-lime-400/30"
                    >
                      <div className="relative h-44 overflow-hidden bg-black/40">
                        <img
                          src={stadium.imagen}
                          alt={stadium.nombre}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4">
                          <h3 className="font-black text-sm text-white text-glow-volt">{stadium.nombre}</h3>
                          <p className="text-[10px] text-slate-300 font-medium">{stadium.ciudad}</p>
                        </div>
                      </div>
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <p className="text-[11px] text-slate-400 leading-relaxed mb-2.5">
                          {stadium.descripcion}
                        </p>
                        <div className="border-t border-white/5 pt-3 flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase text-slate-500">Capacidad</span>
                          <span className="text-xs font-black text-lime-300 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-lime-400" /> {stadium.capacidad}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {selectedBracketMatch && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="border-double-bezel rounded-[2rem] p-1.5 max-w-lg w-full shadow-2xl relative">
            <div className="inner-bezel rounded-[calc(2rem-0.375rem)] p-6 flex flex-col gap-6">
              
              {/* Match Header */}
              <div className="text-center border-b border-white/5 pb-4">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-cyan-400 bg-cyan-950/30 px-2.5 py-1 rounded border border-cyan-500/10 inline-block mb-3">
                  {selectedBracketMatch.fase || "Fase Eliminatoria"}
                </span>
                <h3 className="text-xl font-black text-white flex items-center justify-center gap-3">
                  <span>{selectedBracketMatch.equipo1}</span>
                  <img
                    src={getFlagUrl(selectedBracketMatch.equipo1)}
                    alt=""
                    className="w-7 h-5 object-cover rounded shadow border border-white/10"
                    onError={(e) => { e.currentTarget.src = "https://flagcdn.com/w40/un.png"; }}
                  />
                  <span className="text-slate-500 font-bold px-2">VS</span>
                  <img
                    src={getFlagUrl(selectedBracketMatch.equipo2)}
                    alt=""
                    className="w-7 h-5 object-cover rounded shadow border border-white/10"
                    onError={(e) => { e.currentTarget.src = "https://flagcdn.com/w40/un.png"; }}
                  />
                  <span>{selectedBracketMatch.equipo2}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-2 font-semibold">
                  {selectedBracketMatch.fecha} &middot; {selectedBracketMatch.hora}
                </p>
              </div>

              {/* Channels Grid */}
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-lime-400 block mb-1">
                  📺 SELECCIONA UN CANAL PARA VER LA TRANSMISIÓN:
                </span>
                
                <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {selectedBracketMatch.channels.map((channel, idx) => {
                    const isFocused = isAndroidTV() && focusedModalChannelIndex === idx;
                    return (
                      <div
                        key={channel._id || channel.id}
                        id={`tv-modal-channel-${idx}`}
                        onClick={() => handleChannelClick(channel)}
                        className={`group/modal-channel cursor-pointer rounded-xl bg-slate-950/60 border p-3 flex items-center gap-3 transition-all duration-300 ${
                          isFocused
                            ? "outline-none ring-4 ring-lime-400 scale-[1.04] border-lime-400/50 shadow-[0_0_25px_rgba(163,230,53,0.8)] z-10 bg-slate-900/80"
                            : "border-white/5 hover:border-lime-400/40 hover:bg-slate-900/40"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-black/50 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                          <img
                            src={rewriteImageUrl(channel.customThumbnail || channel.logo || channel.thumbnail)}
                            alt={channel.name}
                            onError={(e) => { e.target.src = "./logo-teamg.png"; }}
                            className="w-full h-full object-contain p-1"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-xs text-slate-300 group-hover/modal-channel:text-white truncate block">
                            {channel.name}
                          </span>
                          <span className="text-[9px] text-lime-400 font-semibold flex items-center gap-1 mt-0.5 animate-pulse">
                            VER EN VIVO
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-center border-t border-white/5 pt-4">
                <button
                  id="tv-modal-close"
                  onClick={() => {
                    setSelectedBracketMatch(null);
                    setTvFocusArea('channels');
                  }}
                  className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                    isAndroidTV() && focusedModalChannelIndex === selectedBracketMatch.channels.length
                      ? "bg-lime-400 text-slate-950 ring-4 ring-lime-400 scale-[1.05] shadow-[0_0_25px_rgba(163,230,53,0.8)]"
                      : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  Cerrar Ventana
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Mundial2026;
