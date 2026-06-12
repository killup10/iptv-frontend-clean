import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchUserChannels } from "../utils/api.js";
import { rewriteImageUrl } from "../utils/imageUrl.js";
import { Play, Trophy, Calendar, MapPin, Users, Info, ChevronLeft, ChevronRight, Bell, Sparkles } from "lucide-react";
import axiosInstance from "../utils/axiosInstance.js";

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
                      onClick={() => setFilterTab("active")}
                      className={`text-xs px-3.5 py-1.5 rounded-lg font-bold tracking-wide transition-all duration-200 ${
                        filterTab === "active"
                          ? "bg-lime-500 text-slate-950 shadow-md shadow-lime-500/10"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      En Vivo / Próximos
                    </button>
                    <button
                      onClick={() => setFilterTab("finished")}
                      className={`text-xs px-3.5 py-1.5 rounded-lg font-bold tracking-wide transition-all duration-200 ${
                        filterTab === "finished"
                          ? "bg-lime-500 text-slate-950 shadow-md shadow-lime-500/10"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Finalizados
                    </button>
                    <button
                      onClick={() => setFilterTab("all")}
                      className={`text-xs px-3.5 py-1.5 rounded-lg font-bold tracking-wide transition-all duration-200 ${
                        filterTab === "all"
                          ? "bg-lime-500 text-slate-950 shadow-md shadow-lime-500/10"
                          : "text-slate-400 hover:text-white"
                      }`}
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
                                      onClick={() => handleChannelClick(channel)}
                                      className="group/channel cursor-pointer rounded-xl bg-slate-950/60 border border-white/5 hover:border-lime-400/40 p-2.5 flex items-center gap-3 transition-all duration-300 hover:bg-slate-900/80 active:scale-[0.98]"
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-3.5">
                  <h2 className="text-lg md:text-xl font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-lime-400" /> Clasificaciones de Grupos
                  </h2>
                  
                  {/* Selector de Pestañas de Grupos */}
                  <div className="flex gap-1 overflow-x-auto max-w-full pb-2 sm:pb-0 hide-scrollbar">
                    {Object.keys(GROUPS_DATA).map((group) => (
                      <button
                        key={group}
                        onClick={() => setActiveGroupTab(group)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs font-black uppercase transition-all duration-300 cursor-pointer ${
                          activeGroupTab === group
                            ? "bg-lime-400 text-black font-extrabold"
                            : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                        }`}
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
                      <tr className="border-b border-white/5 text-slate-500 text-xs sm:text-sm font-black uppercase tracking-wider bg-white/[0.02]">
                        <th className="py-4 sm:py-5 px-4 w-12 text-center">Pos</th>
                        <th className="py-4 sm:py-5 px-4">País</th>
                        <th className="py-4 sm:py-5 px-4 text-center">PJ</th>
                        <th className="py-4 sm:py-5 px-4 text-center">G</th>
                        <th className="py-4 sm:py-5 px-4 text-center">E</th>
                        <th className="py-4 sm:py-5 px-4 text-center">P</th>
                        <th className="py-5 sm:py-6 px-4 text-center">GF:GC</th>
                        <th className="py-4 sm:py-5 px-4 text-center font-bold text-lime-400">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {GROUPS_DATA[activeGroupTab].map((team, idx) => (
                        <tr
                          key={team.pais}
                          className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-5 sm:py-7 px-4 text-center font-bold text-sm sm:text-base text-slate-400">{idx + 1}</td>
                          <td className="py-5 sm:py-7 px-4 flex items-center gap-4">
                            <img src={getFlagUrl(team.pais)} alt={team.pais} className="w-8 h-5.5 object-cover rounded shadow-md" />
                            <span className="font-bold text-base sm:text-lg text-slate-200">{team.pais}</span>
                          </td>
                          <td className="py-5 sm:py-7 px-4 text-center text-sm sm:text-base text-slate-300">{team.pj}</td>
                          <td className="py-5 sm:py-7 px-4 text-center text-sm sm:text-base text-slate-300">{team.g}</td>
                          <td className="py-5 sm:py-7 px-4 text-center text-sm sm:text-base text-slate-300">{team.e}</td>
                          <td className="py-5 sm:py-7 px-4 text-center text-sm sm:text-base text-slate-300">{team.p}</td>
                          <td className="py-5 sm:py-7 px-4 text-center text-sm sm:text-base text-slate-400">
                            {team.gf}:{team.gc}
                          </td>
                          <td className="py-5 sm:py-7 px-4 text-center font-black text-base sm:text-lg text-lime-300">{team.pts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                        <div className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-500 uppercase">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span>{match.estadio}</span>
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
    </>
  );
}

export default Mundial2026;
