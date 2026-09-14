// src/pages/LandingPage.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import {
  Laptop,
  Smartphone,
  PlayCircle,
  Star,
  Check,
  Sparkles,
  Tv,
  Flame,
  MessageCircle,
  HelpCircle,
  ArrowRight,
  Zap,
  Monitor,
  Heart,
  Shield,
  Award,
  Users,
  RefreshCw,
  Download,
  ChevronRight,
  Play,
  Pause,
  Eye,
  GripHorizontal,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Link2,
  Move,
  X,
  Copy,
  CheckCheck,
  ExternalLink,
  Search,
  Filter,
  Image as ImageIcon,
  Calendar,
  Clock,
  CreditCard,
} from "lucide-react";
import { isWeb } from "../utils/platformUtils.js";
import heroShowcase from "../assets/hero_showcase.png";
import { LANDING_CHANNELS_DATA } from "../data/landingChannelsData.js";

// Datos enriquecidos para la muestra de contenido con portadas reales y logotipos deportivos
const CATALOG_SHOWCASE_DATA = [
  {
    id: "cine2026",
    categoryLabel: "Cine 4K VOD",
    categoryTitle: "Estrenos de Cine 2026",
    badgeColor: "cyan",
    items: [
      {
        title: "Avatar: Fuego y Cenizas",
        subtitle: "Estreno Cine 2026 • 4K HDR",
        tag: "Estreno 2026",
        poster: "https://image.tmdb.org/t/p/w500/i9q5O7Vb6aA402jL7B4t5x0b2G7.jpg",
        quality: "4K HDR"
      },
      {
        title: "Deadpool & Wolverine",
        subtitle: "Marvel Studios • 4K Ultra HD",
        tag: "Top VOD",
        poster: "https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
        quality: "4K 60FPS"
      },
      {
        title: "Duna: Parte Dos",
        subtitle: "Ciencia Ficción • IMAX Audio",
        tag: "Imperdible",
        poster: "https://image.tmdb.org/t/p/w500/czembW0Rk1Ke7desVsc3umEvTX6.jpg",
        quality: "4K HDR"
      },
      {
        title: "Gladiador II",
        subtitle: "Acción Épica • 4K 60 FPS",
        tag: "Estreno",
        poster: "https://image.tmdb.org/t/p/w500/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg",
        quality: "4K UHD"
      },
      {
        title: "Capitán América: Brave New World",
        subtitle: "Marvel Studios • Estreno",
        tag: "Cine 2025/2026",
        poster: "https://image.tmdb.org/t/p/w500/pmB39e8Zc1Q1pA1M71fB7vG0D6.jpg",
        quality: "4K HDR"
      }
    ]
  },
  {
    id: "deportes",
    categoryLabel: "Deportes en Vivo",
    categoryTitle: "Liga 1 Max & DSports",
    badgeColor: "fuchsia",
    items: [
      {
        title: "Liga 1 Max Full HD",
        subtitle: "Fútbol Peruano • Torneo en Vivo",
        tag: "🔴 EN VIVO",
        poster: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=500&q=80",
        channelName: "LIGA 1 MAX",
        detailText: "Alianza Lima • Universitario • Cristal",
        quality: "Full HD 1080p"
      },
      {
        title: "DSports / DIRECTV",
        subtitle: "Copa Sudamericana & LaLiga",
        tag: "🏆 EXCLUSIVO",
        poster: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=500&q=80",
        channelName: "DSPORTS",
        detailText: "Conmebol Sudamericana • LaLiga EA",
        quality: "Full HD 1080p"
      },
      {
        title: "ESPN Premium & ESPN 1-4",
        subtitle: "Champions League, Premier & F1",
        tag: "⚡ EN VIVO",
        poster: "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=500&q=80",
        channelName: "ESPN PREMIUM",
        detailText: "Champions League • F1 • UFC",
        quality: "Full HD 1080p"
      },
      {
        title: "Fox Sports 1 & 2 HD",
        subtitle: "Copa Libertadores & UFC",
        tag: "🔥 EN VIVO",
        poster: "https://images.unsplash.com/photo-1518604666864-9ed5060764c6?w=500&q=80",
        channelName: "FOX SPORTS",
        detailText: "Copa Libertadores • SmackDown",
        quality: "Full HD 1080p"
      }
    ]
  },
  {
    id: "series",
    categoryLabel: "Series & Animes",
    categoryTitle: "Series, Animes & KDramas",
    badgeColor: "cyan",
    items: [
      {
        title: "Stranger Things 5",
        subtitle: "Temporada Final • Netflix 4K",
        tag: "Estreno",
        poster: "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
        quality: "4K HDR"
      },
      {
        title: "Demon Slayer (Kimetsu)",
        subtitle: "Castillo Infinito • Anime HD",
        tag: "Tendencia",
        poster: "https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg",
        quality: "Full HD 1080p"
      },
      {
        title: "La Casa del Dragón",
        subtitle: "Temporadas 1 y 2 • HBO Max",
        tag: "Top HBO",
        poster: "https://image.tmdb.org/t/p/w500/1X4h40fcB4WWUmIBK0auT4zRBAV.jpg",
        quality: "4K HDR"
      },
      {
        title: "Solo Leveling",
        subtitle: "Anime Tendencia • Audio Latino",
        tag: "Imperdible",
        poster: "https://image.tmdb.org/t/p/w500/geCRueV3ElhRTr0xtJuPxJ8HGqd.jpg",
        quality: "Full HD 1080p"
      },
      {
        title: "El Juego del Calamar 2",
        subtitle: "Serie Completa • Sub & Doblada",
        tag: "KDrama",
        poster: "https://image.tmdb.org/t/p/w500/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg",
        quality: "4K UHD"
      }
    ]
  },
  {
    id: "kids",
    categoryLabel: "Zona Kids",
    categoryTitle: "Zona Infantil Segura",
    badgeColor: "fuchsia",
    items: [
      {
        title: "IntensaMente 2",
        subtitle: "Disney Pixar • Audio Latino",
        tag: "Familiar",
        poster: "https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg",
        quality: "4K HDR"
      },
      {
        title: "Moana 2",
        subtitle: "Disney Animation • Estreno",
        tag: "Estreno",
        poster: "https://image.tmdb.org/t/p/w500/yh64qw9mgXBvlaWDi7Q9tpUBAvH.jpg",
        quality: "Full HD 1080p"
      },
      {
        title: "Super Mario Bros",
        subtitle: "Nintendo & Illumination",
        tag: "Animación",
        poster: "https://image.tmdb.org/t/p/w500/qNBAXBIQlnOThrVvA6mA2B5ggV6.jpg",
        quality: "4K UHD"
      },
      {
        title: "Kung Fu Panda 4",
        subtitle: "Universal Pictures • Divertido",
        tag: "Comedia",
        poster: "https://image.tmdb.org/t/p/w500/kDp1vUBnMpe8ak4rjgl3cLELqjU.jpg",
        quality: "Full HD 1080p"
      },
      {
        title: "Mi Villano Favorito 4",
        subtitle: "Minions • Apta para Todos",
        tag: "Kids",
        poster: "https://image.tmdb.org/t/p/w500/wWba3TaojhK7NdycRhoQpsG0FaH.jpg",
        quality: "4K HDR"
      }
    ]
  }
];

// Eventos deportivos destacados para el fixture interactivo
const UPCOMING_SPORTS_EVENTS = [
  {
    id: "sp1",
    tournament: "Liga 1 Te Apuesto (Clausura - Jornada 10)",
    homeTeam: "Alianza Lima",
    awayTeam: "ADT de Tarma",
    time: "Viernes 18/9 • 8:00 PM (Hora Perú)",
    channelBadge: "LIGA 1 MAX",
    tag: "🔴 EN VIVO • MATUTE",
    quality: "Full HD 1080p"
  },
  {
    id: "sp2",
    tournament: "Liga 1 Te Apuesto (Clausura - Jornada 10)",
    homeTeam: "Sporting Cristal",
    awayTeam: "Atlético Grau",
    time: "Sábado 19/9 • 3:30 PM (Hora Perú)",
    channelBadge: "LIGA 1 MAX",
    tag: "🔴 EN VIVO • L1 MAX",
    quality: "Full HD 1080p"
  },
  {
    id: "sp3",
    tournament: "LaLiga EA Sports (España)",
    homeTeam: "Real Madrid",
    awayTeam: "RCD Espanyol",
    time: "Sábado 20/9 • 2:00 PM (Hora Perú)",
    channelBadge: "DSPORTS (DIRECTV)",
    tag: "🔴 EN VIVO • LALIGA",
    quality: "Full HD 1080p"
  },
  {
    id: "sp4",
    tournament: "LaLiga EA Sports (España)",
    homeTeam: "Villarreal CF",
    awayTeam: "FC Barcelona",
    time: "Domingo 21/9 • 11:30 AM (Hora Perú)",
    channelBadge: "DSPORTS / ESPN",
    tag: "⚡ EN VIVO • DSPORTS",
    quality: "Full HD 1080p"
  },
  {
    id: "sp5",
    tournament: "Premier League (Inglaterra)",
    homeTeam: "Manchester City",
    awayTeam: "Arsenal FC",
    time: "Domingo 21/9 • 10:30 AM (Hora Perú)",
    channelBadge: "ESPN / DSPORTS",
    tag: "🔥 PARTIDAZO EN VIVO",
    quality: "Full HD 1080p"
  },
  {
    id: "sp6",
    tournament: "Liga 1 Te Apuesto (Clausura - Jornada 10)",
    homeTeam: "Universitario",
    awayTeam: "Sport Boys",
    time: "Domingo • 6:00 PM (Hora Perú)",
    channelBadge: "GOLPERU / L1 MAX",
    tag: "🔴 EN VIVO",
    quality: "Full HD 1080p"
  }
];

function ShowcaseColumnCard({ group, initialIndex = 0, onSelectPlanes }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % group.items.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [group.items.length, isHovered]);

  const currentItem = group.items[currentIndex] || group.items[0];
  const isCyan = group.badgeColor === "cyan";

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelectPlanes}
      className={`relative group overflow-hidden rounded-3xl border border-white/10 bg-[#080814] h-[360px] cursor-pointer transition-all duration-300 transform hover:-translate-y-2 hover:shadow-[0_16px_40px_rgba(0,0,0,0.8)] ${
        isCyan ? "hover:border-[#00F0FF]/50" : "hover:border-fuchsia-400/50"
      }`}
      style={{ transform: "translateZ(0)" }}
    >
      {/* Background Image Carousel with Smooth Fade */}
      {group.items.map((item, idx) => (
        <img
          key={item.title}
          src={item.poster}
          alt={item.title}
          loading="lazy"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            idx === currentIndex ? "opacity-100 scale-100" : "opacity-0 scale-105"
          }`}
          onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&q=80";
          }}
        />
      ))}

      {/* Dark Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />

      {/* Top Header Tags */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
        <span
          className={`text-[9px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider backdrop-blur-md ${
            isCyan
              ? "bg-[#00F0FF]/25 text-[#00F0FF] border border-[#00F0FF]/40 shadow-[0_0_12px_rgba(0,240,255,0.3)]"
              : "bg-fuchsia-500/25 text-fuchsia-300 border border-fuchsia-500/40 shadow-[0_0_12px_rgba(217,70,239,0.3)]"
          }`}
        >
          {group.categoryLabel}
        </span>

        <span className="text-[9px] font-mono font-black bg-black/60 border border-white/10 px-2 py-0.5 rounded-full text-slate-300">
          {currentItem.quality || "Full HD"}
        </span>
      </div>

      {/* Center Play Button on Hover */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md shadow-2xl transition-transform duration-300 group-hover:scale-110 ${
            isCyan
              ? "bg-[#00F0FF]/90 text-black shadow-[0_0_25px_rgba(0,240,255,0.6)]"
              : "bg-fuchsia-500/90 text-white shadow-[0_0_25px_rgba(217,70,239,0.6)]"
          }`}
        >
          <Play className="w-5 h-5 fill-current ml-0.5" />
        </div>
      </div>

      {/* Bottom Content Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col justify-end z-10 bg-gradient-to-t from-black via-black/80 to-transparent pt-12">
        {/* Specific Sports Channel Brand Logo / Banner */}
        {currentItem.channelName && (
          <div className="inline-flex items-center gap-1.5 mb-1 bg-black/70 border border-white/15 px-2 py-0.5 rounded-lg w-max">
            <Tv className="w-3 h-3 text-[#00F0FF]" />
            <span className="text-[10px] font-black text-white uppercase tracking-wider">
              {currentItem.channelName}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
              currentItem.tag.includes("VIVO")
                ? "bg-red-600/90 text-white animate-pulse"
                : isCyan
                ? "bg-[#00F0FF]/20 text-[#00F0FF]"
                : "bg-fuchsia-500/20 text-fuchsia-300"
            }`}
          >
            {currentItem.tag}
          </span>
          <span className="text-[10px] text-slate-400 font-medium truncate">
            {currentItem.subtitle}
          </span>
        </div>

        <h4 className="text-sm font-extrabold text-white group-hover:text-[#00F0FF] transition-colors duration-200 truncate">
          {currentItem.title}
        </h4>

        {/* Carousel Progress Indicators */}
        <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-white/10">
          {group.items.map((_, dotIdx) => (
            <button
              key={dotIdx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(dotIdx);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                dotIdx === currentIndex
                  ? isCyan
                    ? "w-5 bg-[#00F0FF]"
                    : "w-5 bg-fuchsia-400"
                  : "w-1.5 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
          <span className="text-[8px] text-slate-400 font-bold uppercase ml-auto tracking-wider">
            {currentIndex + 1}/{group.items.length}
          </span>
        </div>
      </div>
    </div>
  );
}

function CatalogShowcaseGrid({ onSelectPlanes }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {CATALOG_SHOWCASE_DATA.map((group, idx) => (
        <ShowcaseColumnCard
          key={group.id}
          group={group}
          initialIndex={idx % group.items.length}
          onSelectPlanes={onSelectPlanes}
        />
      ))}
    </div>
  );
}

function LandingPage() {
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState("mensual"); // "mensual" | "anual"
  const [simulatedPip, setSimulatedPip] = useState(false);
  const [pricingGroup, setPricingGroup] = useState("recomendados"); // "recomendados" | "iniciales"
  const [activeFaq, setActiveFaq] = useState(null);
  const [isAppsModalOpen, setIsAppsModalOpen] = useState(false);
  const [isGrillaModalOpen, setIsGrillaModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Search & Explorer Channels State
  const [channelSearchTerm, setChannelSearchTerm] = useState("");
  const [selectedChannelCategory, setSelectedChannelCategory] = useState("Todos");
  const [visibleChannelsCount, setVisibleChannelsCount] = useState(24);

  const channelCategories = [
    "Todos",
    "Deportes Premium",
    "Películas & Series",
    "Perú & Noticias",
    "Infantiles & Niños",
    "Culturales & Documentales",
    "Novelas & Variedad",
    "Canales 24/7",
    "Música & Radios",
  ];

  const filteredChannels = useMemo(() => {
    let list = LANDING_CHANNELS_DATA || [];
    if (selectedChannelCategory !== "Todos") {
      list = list.filter((c) => c.category === selectedChannelCategory);
    }
    if (channelSearchTerm.trim() !== "") {
      const term = channelSearchTerm.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.category.toLowerCase().includes(term)
      );
    }
    return list;
  }, [channelSearchTerm, selectedChannelCategory]);

  const handleCopyDownloaderCode = () => {
    navigator.clipboard.writeText("3895210");
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // --- PIP Player Interactive State & Drag / Resize Logic ---
  const resolveDropboxUrl = (url) => {
    if (!url || typeof url !== "string") return url;
    let clean = url.trim();
    if (clean.includes("dropbox.com")) {
      clean = clean
        .replace("www.dropbox.com", "dl.dropboxusercontent.com")
        .replace("dl.dropbox.com", "dl.dropboxusercontent.com")
        .replace("dropbox.com", "dl.dropboxusercontent.com")
        .replace("?dl=0", "?raw=1")
        .replace("&dl=0", "&raw=1");
      if (!clean.includes("raw=1") && !clean.includes("dl=1")) {
        clean += clean.includes("?") ? "&raw=1" : "?raw=1";
      }
    }
    return clean;
  };

  const DEFAULT_PROMO_VIDEO = resolveDropboxUrl(
    "https://dl.dropbox.com/scl/fi/m7kqaktw85h6kkhbyv82r/promolandingteamg.mp4?rlkey=xlnj0t9pktv8ezpde8ub39337"
  );

  const [pipChannel, setPipChannel] = useState("promo");
  const [pipSize, setPipSize] = useState("medium"); // "small" | "medium" | "large"
  const [pipPosition, setPipPosition] = useState({ x: null, y: null });
  const [activeVideoUrl, setActiveVideoUrl] = useState(DEFAULT_PROMO_VIDEO);
  const [pipPlaying, setPipPlaying] = useState(true);
  const [pipMuted, setPipMuted] = useState(true);
  const pipVideoRef = useRef(null);

  const togglePipFullscreen = () => {
    if (!pipVideoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      if (pipVideoRef.current.requestFullscreen) {
        pipVideoRef.current.requestFullscreen().catch(() => {});
      } else if (pipVideoRef.current.webkitRequestFullscreen) {
        pipVideoRef.current.webkitRequestFullscreen();
      }
    }
  };

  const togglePipPlay = () => {
    if (!pipVideoRef.current) return;
    if (pipPlaying) {
      pipVideoRef.current.pause();
      setPipPlaying(false);
    } else {
      pipVideoRef.current.play().catch(() => {});
      setPipPlaying(true);
    }
  };

  const togglePipMute = () => {
    if (!pipVideoRef.current) return;
    pipVideoRef.current.muted = !pipMuted;
    setPipMuted(!pipMuted);
  };

  // Dragging logic
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0 });

  const getPipDimensions = () => {
    if (pipSize === "small") return { width: 320, height: 200 };
    if (pipSize === "large") return { width: 640, height: 380 };
    return { width: 460, height: 280 }; // medium
  };

  const startDrag = (clientX, clientY) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: clientX, y: clientY };
    const dims = getPipDimensions();
    const currentX =
      pipPosition.x !== null ? pipPosition.x : Math.max(10, window.innerWidth - dims.width - 24);
    const currentY =
      pipPosition.y !== null ? pipPosition.y : Math.max(10, window.innerHeight - dims.height - 24);
    initialPosRef.current = { x: currentX, y: currentY };
  };

  const handleMouseDown = (e) => {
    if (e.target.closest(".no-drag")) return;
    startDrag(e.clientX, e.clientY);
    const onMouseMove = (moveEvent) => {
      if (!isDraggingRef.current) return;
      const dx = moveEvent.clientX - dragStartRef.current.x;
      const dy = moveEvent.clientY - dragStartRef.current.y;
      const dims = getPipDimensions();
      const newX = Math.max(10, Math.min(window.innerWidth - dims.width - 10, initialPosRef.current.x + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - dims.height - 10, initialPosRef.current.y + dy));
      setPipPosition({ x: newX, y: newY });
    };
    const onMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleTouchStart = (e) => {
    if (e.target.closest(".no-drag")) return;
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
    const onTouchMove = (moveEvent) => {
      if (!isDraggingRef.current) return;
      const t = moveEvent.touches[0];
      const dx = t.clientX - dragStartRef.current.x;
      const dy = t.clientY - dragStartRef.current.y;
      const dims = getPipDimensions();
      const newX = Math.max(10, Math.min(window.innerWidth - dims.width - 10, initialPosRef.current.x + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - dims.height - 10, initialPosRef.current.y + dy));
      setPipPosition({ x: newX, y: newY });
    };
    const onTouchEnd = () => {
      isDraggingRef.current = false;
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
  };

  // Redireccionar si el usuario ya está autenticado
  useEffect(() => {
    if (!isLoadingAuth && user) {
      navigate("/home", { replace: true });
    }
  }, [user, isLoadingAuth, navigate]);

  // Redireccionar si estamos dentro de una app instalada (Electron o Capacitor nativo)
  useEffect(() => {
    if (!isLoadingAuth && !isWeb() && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, isLoadingAuth, navigate]);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Datos de los planes activos con aclaración de calidad Full HD en TV en vivo
  const plans = [
    {
      id: "gplay",
      name: "G Play",
      icon: <PlayCircle className="w-4 h-4 text-cyan-400" strokeWidth={2} />,
      priceMonthly: 12,
      priceYearly: 70,
      devices: {
        mensual: "1 Dispositivo",
        anual: "1 Dispositivo",
      },
      features: [
        "Más de 90 canales en vivo (Full HD)",
        "Acceso desde PC, Móvil o TV",
        "Soporte técnico dedicado",
        "Transmisión sin anuncios",
      ],
      badge: "Esencial",
      color: "hover:border-cyan-500/30 hover:shadow-[0_0_35px_rgba(6,182,212,0.15)]",
      btnColor: "bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold",
      group: "iniciales",
    },
    {
      id: "estandar",
      name: "Estándar",
      icon: <Laptop className="w-4 h-4 text-cyan-400" strokeWidth={2} />,
      priceMonthly: 15,
      priceYearly: 90,
      devices: {
        mensual: "1 Dispositivo",
        anual: "1 Dispositivo",
      },
      features: [
        "Más de 90 canales en vivo (Full HD)",
        "Cine y Series organizados",
        "Documentales en alta definición",
        "Acceso multisección ilimitado",
      ],
      badge: "Popular",
      color: "hover:border-cyan-500/30 hover:shadow-[0_0_35px_rgba(6,182,212,0.15)]",
      btnColor: "bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold",
      group: "iniciales",
    },
    {
      id: "sports",
      name: "Sports",
      icon: <Flame className="w-4 h-4 text-pink-400" strokeWidth={2} />,
      priceMonthly: 20,
      priceYearly: 120,
      devices: {
        mensual: "1 Dispositivo",
        anual: "1 Dispositivo",
      },
      features: [
        "Más de 90 canales en vivo (Full HD)",
        "Todos los canales deportivos en vivo",
        "Incluye Liga 1 Max y DSports",
        "Cine, Series y Documentales",
      ],
      badge: "Recomendado Deportes",
      color: "border-pink-500/40 shadow-[0_0_40px_rgba(236,72,153,0.12)] hover:border-pink-500/70 ring-1 ring-pink-500/20",
      btnColor: "bg-gradient-to-r from-pink-500 to-rose-600 hover:opacity-95 text-white font-extrabold shadow-[0_4px_20px_rgba(236,72,153,0.3)]",
      highlighted: true,
      group: "recomendados",
    },
    {
      id: "cinefilo",
      name: "Cinéfilo",
      icon: <Star className="w-4 h-4 text-cyan-400" strokeWidth={2} />,
      priceMonthly: 18,
      priceYearly: 120,
      devices: {
        mensual: "1 Dispositivo",
        anual: "1 SmartTV + 1 Celular",
      },
      features: [
        "Más de 90 canales en vivo (Full HD)",
        "Cine de estreno 2026 en VOD",
        "Sección Especial 4K Ultra HD & 60 FPS",
        "Series, Animes, Novelas y Kids",
      ],
      badge: "Cine Completo",
      color: "hover:border-cyan-500/30 hover:shadow-[0_0_35px_rgba(6,182,212,0.15)]",
      btnColor: "bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold",
      group: "recomendados",
    },
    {
      id: "premium",
      name: "Premium VIP",
      icon: <Sparkles className="w-4 h-4 text-cyan-400" strokeWidth={2} />,
      priceMonthly: 25,
      priceYearly: 180,
      devices: {
        mensual: "1 Dispositivo",
        anual: "1 SmartTV + 1 Celular",
      },
      features: [
        "Más de 360 canales en vivo (Full HD 1080p)",
        "Incluye Liga 1 Max y DSports completos",
        "Cine de estreno 2026 (Especial 4K Ultra HD)",
        "Series, Animes, KDramas y Novelas",
        "Sección Zona Kids especial",
        "Colección Dragon Ball Completa",
      ],
      badge: "VIP - Acceso Total",
      color: "border-cyan-400/50 shadow-[0_0_50px_rgba(34,211,238,0.18)] hover:border-cyan-300 ring-1 ring-cyan-400/30",
      btnColor: "bg-gradient-to-r from-cyan-400 via-cyan-500 to-indigo-600 hover:opacity-95 text-black font-extrabold shadow-[0_4px_25px_rgba(34,211,238,0.35)]",
      highlighted: true,
      isPremium: true,
      group: "recomendados",
    },
  ];

  const handleBuy = (plan) => {
    const planName = plan.name;
    const price = billingCycle === "mensual" ? `S/ ${plan.priceMonthly} Mensual` : `S/ ${plan.priceYearly} Anual`;
    const message = `Hola TeamG Play, quiero adquirir el plan ${planName} ${billingCycle === "mensual" ? "Mensual" : "Anual"} por ${price}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/51912194777?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleInquireChannel = (channelName) => {
    const message = `Hola TeamG Play, quiero consultar si tienen disponible el canal "${channelName}" y probar el servicio.`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/51912194777?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
  };

  const selectedPlans = plans.filter((p) => p.group === pricingGroup);

  return (
    <main className="overflow-x-hidden w-full max-w-full min-h-screen bg-[#020206] text-white flex flex-col font-inter select-none relative">
      {/* Dynamic CapCut Style Custom CSS */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@600;700;800;900&display=swap');

        .font-inter { font-family: 'Inter', sans-serif; }
        .font-outfit { font-family: 'Outfit', sans-serif; }

        .capcut-accent-gradient {
          background: linear-gradient(135deg, #00F0FF 0%, #00B2FF 50%, #7000FF 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .capcut-glass-nav {
          background: rgba(8, 6, 18, 0.88);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          will-change: transform;
          transform: translateZ(0);
        }

        .capcut-card-bg {
          background: radial-gradient(circle at 50% 0%, rgba(15, 15, 30, 0.95), rgba(6, 6, 14, 0.98));
          border: 1px solid rgba(255, 255, 255, 0.08);
          transform: translateZ(0);
        }
        .capcut-card-bg:hover {
          border-color: rgba(0, 240, 255, 0.4);
        }

        .perspective-mockup {
          transform: translateZ(0);
          transition: transform 400ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 400ms ease;
          will-change: transform;
        }
        .perspective-mockup:hover {
          transform: translateY(-4px) scale(1.01);
        }

        @keyframes marquee-scroll {
          0% { transform: translate3d(0%, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee-scroll 28s linear infinite;
          will-change: transform;
          transform: translateZ(0);
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }

        .ambient-glow-cyan {
          background: radial-gradient(circle, rgba(0, 240, 255, 0.12) 0%, transparent 70%);
        }
        .ambient-glow-fuchsia {
          background: radial-gradient(circle, rgba(217, 70, 239, 0.10) 0%, transparent 70%);
        }
      `}</style>

      {/* Atmospheric Ambient Lighting Glows */}
      <div 
        className="absolute top-[-5%] left-[-10%] w-[50vw] h-[50vw] rounded-full pointer-events-none z-0 opacity-70"
        style={{
          background: 'radial-gradient(circle, rgba(217, 70, 239, 0.14) 0%, rgba(217, 70, 239, 0.03) 45%, transparent 70%)',
          transform: 'translateZ(0)'
        }}
      />
      <div 
        className="absolute top-[20%] right-[-10%] w-[55vw] h-[55vw] rounded-full pointer-events-none z-0 opacity-80"
        style={{
          background: 'radial-gradient(circle, rgba(0, 240, 255, 0.14) 0%, rgba(0, 240, 255, 0.03) 45%, transparent 70%)',
          transform: 'translateZ(0)'
        }}
      />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_20%,#000_70%,transparent_100%)] pointer-events-none z-0" />

      {/* Fixed Island Header */}
      <header className="w-full z-50 sticky top-4 max-w-6xl mx-auto px-4">
        <div className="mx-auto px-6 py-3.5 rounded-full capcut-glass-nav border border-white/10 flex items-center justify-between shadow-[0_16px_50px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-3">
            <img src="./logo-teamg.png" alt="TeamG Play Logo" className="h-8 drop-shadow-[0_0_12px_rgba(0,240,255,0.5)]" />
            <span className="font-outfit font-black text-sm tracking-wider text-white">TEAMG <span className="text-[#00F0FF]">PLAY</span></span>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-[12px] font-semibold text-slate-300">
            <button onClick={() => scrollToSection("caracteristicas")} className="hover:text-[#00F0FF] transition-colors duration-200">Características</button>
            <button onClick={() => scrollToSection("buscador-canales")} className="hover:text-[#00F0FF] text-[#00F0FF] transition-colors duration-200 flex items-center gap-1 font-bold">
              <Search className="w-3.5 h-3.5" /> Canales (+360)
            </button>
            <button onClick={() => scrollToSection("deportes-vivo")} className="hover:text-[#00F0FF] transition-colors duration-200">Deportes</button>
            <button onClick={() => scrollToSection("catalogo")} className="hover:text-[#00F0FF] transition-colors duration-200">Catálogo VOD</button>
            <button onClick={() => scrollToSection("planes")} className="hover:text-[#00F0FF] transition-colors duration-200">Planes y Precios</button>
            <button onClick={() => setIsAppsModalOpen(true)} className="hover:text-[#00F0FF] text-cyan-300 transition-colors duration-200 flex items-center gap-1.5 font-bold">
              <Download className="w-3.5 h-3.5" /> Apps TV
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-5 py-2 rounded-full bg-white/5 border border-white/15 hover:bg-white/15 text-xs font-bold text-slate-200 transition-all duration-300 shadow-md active:scale-95"
            >
              Entrar
            </Link>
            <button
              onClick={() => scrollToSection("planes")}
              className="hidden sm:inline-flex px-5 py-2 rounded-full bg-[#00F0FF] hover:bg-[#33F3FF] text-black font-extrabold text-xs transition-all duration-300 shadow-[0_0_20px_rgba(0,240,255,0.4)] active:scale-95"
            >
              Probar Gratis
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative w-full max-w-6xl mx-auto px-6 pt-16 md:pt-28 pb-20 flex flex-col lg:flex-row items-center gap-14 z-10">
        
        {/* Left Text Column */}
        <div className="flex-1 text-left flex flex-col items-start">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-cyan-400/30 text-[10px] font-extrabold uppercase tracking-widest text-[#00F0FF] mb-6 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-[#00F0FF]" />
            Streaming Ultra Fluido • Canales en Full HD
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-outfit font-extrabold tracking-tight leading-[1.02] mb-6 text-white">
            Lleva tu entretenimiento <br />
            <span className="capcut-accent-gradient">al siguiente nivel.</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-lg mb-8 font-normal leading-relaxed">
            Experimenta el futuro del IPTV sin cortes. Más de 360 canales en vivo en <strong>Full HD (1080p)</strong>, eventos deportivos exclusivos (Liga 1 Max, DSports) y estrenos de cine 2026 con <strong>secciones especiales en 4K Ultra HD & 60 FPS</strong>.
          </p>

          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto mb-10">
            <button
              onClick={() => scrollToSection("buscador-canales")}
              className="px-8 py-4 rounded-full bg-[#00F0FF] hover:bg-[#33F3FF] text-black font-black text-xs uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(0,240,255,0.5)] flex items-center gap-3"
            >
              <Search className="w-4 h-4 stroke-[2.5]" />
              Ver Grilla & Canales
            </button>

            <button
              onClick={() => setIsGrillaModalOpen(true)}
              className="px-7 py-4 rounded-full bg-white/5 border border-cyan-400/30 hover:bg-cyan-500/15 text-cyan-300 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 hover:border-[#00F0FF]/50"
            >
              <ImageIcon className="w-4 h-4 text-cyan-400" />
              Grilla Completa HD
            </button>
          </div>

          {/* Quick Stats Badges */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/10 w-full max-w-lg">
            <div>
              <p className="text-xl sm:text-2xl font-outfit font-black text-white">+360</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Canales en Vivo Full HD</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-outfit font-black text-[#00F0FF]">4K & 60 FPS</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Especial Cine 2026 VOD</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-outfit font-black text-fuchsia-400">912 194 777</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">WhatsApp Soporte</p>
            </div>
          </div>
        </div>

        {/* Right 3D Perspective Showcase Column */}
        <div className="flex-1 w-full flex justify-center items-center relative">
          <div className="w-full max-w-md p-2 rounded-[2.5rem] bg-gradient-to-b from-white/15 via-white/5 to-transparent border border-white/10 shadow-2xl relative group overflow-hidden perspective-mockup">
            
            <div className="rounded-[calc(2.5rem-2px)] overflow-hidden border border-white/10 bg-[#05030c] shadow-[inset_0_1px_4px_rgba(255,255,255,0.15)] relative">
              <img
                src={heroShowcase}
                alt="CapCut Style Mockup TeamG Play"
                className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black/60 backdrop-blur-md border border-white/15 p-3 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#00F0FF]/20 border border-[#00F0FF]/40 flex items-center justify-center text-[#00F0FF]">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Full HD 1080p Sin Lag</p>
                    <p className="text-[10px] text-slate-400">Servidores dedicados ultra estables</p>
                  </div>
                </div>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase">Online</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee Ticker */}
      <section className="w-full py-6 bg-black/50 border-y border-white/10 overflow-hidden z-10">
        <div className="text-center mb-3">
          <p className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-slate-400">Señales Deportivas y Entretenimiento Incluido</p>
        </div>
        <div className="flex w-[200%] gap-12 items-center animate-marquee select-none whitespace-nowrap">
          <span className="text-sm font-outfit font-black tracking-widest text-[#00F0FF] mx-4">LIGA 1 MAX</span>
          <span className="text-sm font-outfit font-black tracking-widest text-fuchsia-400 mx-4">DSPORTS (DIRECTV)</span>
          <span className="text-sm font-outfit font-black tracking-widest text-slate-300 mx-4">ESPN PREMIUM</span>
          <span className="text-sm font-outfit font-black tracking-widest text-[#00F0FF] mx-4">FOX SPORTS</span>
          <span className="text-sm font-outfit font-black tracking-widest text-slate-300 mx-4">HBO MAX</span>
          <span className="text-sm font-outfit font-black tracking-widest text-fuchsia-400 mx-4">DISNEY+</span>
          <span className="text-sm font-outfit font-black tracking-widest text-slate-300 mx-4">AMÉRICA TV HD</span>
          <span className="text-sm font-outfit font-black tracking-widest text-[#00F0FF] mx-4">ATV HD</span>

          <span className="text-sm font-outfit font-black tracking-widest text-[#00F0FF] mx-4">LIGA 1 MAX</span>
          <span className="text-sm font-outfit font-black tracking-widest text-fuchsia-400 mx-4">DSPORTS (DIRECTV)</span>
          <span className="text-sm font-outfit font-black tracking-widest text-slate-300 mx-4">ESPN PREMIUM</span>
          <span className="text-sm font-outfit font-black tracking-widest text-[#00F0FF] mx-4">FOX SPORTS</span>
          <span className="text-sm font-outfit font-black tracking-widest text-slate-300 mx-4">HBO MAX</span>
          <span className="text-sm font-outfit font-black tracking-widest text-fuchsia-400 mx-4">DISNEY+</span>
          <span className="text-sm font-outfit font-black tracking-widest text-slate-300 mx-4">AMÉRICA TV HD</span>
          <span className="text-sm font-outfit font-black tracking-widest text-[#00F0FF] mx-4">ATV HD</span>
        </div>
      </section>

      {/* EXPLORADOR Y BUSCADOR INTERACTIVO DE CANALES */}
      <section id="buscador-canales" className="w-full max-w-6xl mx-auto px-6 py-24 z-10">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-[10px] font-extrabold uppercase tracking-widest text-[#00F0FF] mb-3">
            <Tv className="w-3.5 h-3.5 text-[#00F0FF]" />
            Catálogo Completo y Transparente
          </div>
          <h2 className="text-3xl sm:text-5xl font-outfit font-extrabold tracking-tight mb-4 text-white">
            Explorador de <span className="capcut-accent-gradient">+360 Canales en Vivo</span>
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Busca cualquier canal en tiempo real. Todas nuestras señales en vivo son transmitidas en <strong>Full HD (1080p)</strong> con máxima estabilidad y cero cortes.
          </p>
        </div>

        {/* Action Banner: View & Download Full HD Channel Grid Poster */}
        <div className="mb-10 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-black/80 border border-[#00F0FF]/40 shadow-[0_0_40px_rgba(0,240,255,0.15)] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF]">
              <ImageIcon className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-outfit font-black text-xl text-white">Grilla Oficial de Canales TeamG Play</h3>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#00F0FF] text-black">
                  Póster HD
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                ¿Prefieres ver o descargar la imagen publicitaria con todos los logos oficiales organizados por categorías para compartir con tus amigos o clientes?
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsGrillaModalOpen(true)}
              className="flex-1 md:flex-none px-6 py-3.5 rounded-2xl bg-[#00F0FF] hover:bg-[#33F3FF] text-black font-black text-xs uppercase tracking-wider transition-all duration-200 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4 stroke-[2.5]" />
              Ver Imagen HD
            </button>
            <a
              href="/TeamG_Grilla_Completa_TODOS_Los_Canales.png"
              download="TeamG_Grilla_Oficial_Canales.png"
              className="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              title="Descargar póster en alta resolución"
            >
              <Download className="w-4 h-4" />
              Descargar
            </a>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative max-w-2xl mx-auto mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#00F0FF]" />
          <input
            type="text"
            placeholder="Buscar canal en vivo (ej: Liga 1 Max, ESPN, HBO, Cartoon, América TV)..."
            value={channelSearchTerm}
            onChange={(e) => {
              setChannelSearchTerm(e.target.value);
              setVisibleChannelsCount(24);
            }}
            className="w-full pl-12 pr-10 py-4 rounded-2xl bg-black/60 border border-white/15 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#00F0FF] focus:ring-1 focus:ring-[#00F0FF] shadow-inner transition-all"
          />
          {channelSearchTerm && (
            <button
              onClick={() => setChannelSearchTerm("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-thin scrollbar-thumb-white/10 justify-start sm:justify-center">
          {channelCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedChannelCategory(cat);
                setVisibleChannelsCount(24);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                selectedChannelCategory === cat
                  ? "bg-[#00F0FF] text-black shadow-[0_0_15px_rgba(0,240,255,0.4)] scale-105"
                  : "bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between mb-6 text-xs text-slate-400 font-semibold px-2">
          <span>
            Mostrando <strong className="text-[#00F0FF]">{Math.min(visibleChannelsCount, filteredChannels.length)}</strong> de <strong className="text-white">{filteredChannels.length}</strong> canales
            {selectedChannelCategory !== "Todos" && ` en "${selectedChannelCategory}"`}
          </span>
          <span className="text-emerald-400 flex items-center gap-1 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Todas las señales Full HD 1080p
          </span>
        </div>

        {/* Channels Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredChannels.slice(0, visibleChannelsCount).map((channel, idx) => (
            <div
              key={channel.name + idx}
              onClick={() => handleInquireChannel(channel.name)}
              className="group p-4 rounded-2xl bg-[#080816] border border-white/10 hover:border-[#00F0FF]/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] transition-all duration-200 flex flex-col items-center justify-between text-center cursor-pointer relative overflow-hidden"
            >
              {/* Quality Label Top */}
              <div className="w-full flex items-center justify-between mb-2">
                <span className="text-[8px] font-black uppercase tracking-wider text-[#00F0FF] bg-[#00F0FF]/10 px-1.5 py-0.5 rounded">
                  FHD 1080p
                </span>
                <span className="text-[8px] text-slate-400 font-medium truncate max-w-[80px]">
                  {channel.category.split("&")[0].trim()}
                </span>
              </div>

              {/* Channel Logo */}
              <div className="w-16 h-16 my-2 rounded-xl bg-black/60 border border-white/10 p-2 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                {channel.logo ? (
                  <img
                    src={channel.logo}
                    alt={channel.name}
                    className="max-w-full max-h-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/logo-teamg.png';
                    }}
                  />
                ) : (
                  <Tv className="w-7 h-7 text-[#00F0FF]/80" />
                )}
              </div>

              {/* Channel Name */}
              <h4 className="font-outfit font-extrabold text-xs text-white group-hover:text-[#00F0FF] transition-colors truncate w-full mt-1">
                {channel.name}
              </h4>

              {/* Ask WhatsApp Action */}
              <div className="mt-3 w-full pt-2 border-t border-white/5 flex items-center justify-center gap-1 text-[9px] font-bold text-slate-400 group-hover:text-emerald-300 transition-colors">
                <MessageCircle className="w-3 h-3 text-emerald-400" />
                <span>Pedir Demo</span>
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button */}
        {visibleChannelsCount < filteredChannels.length && (
          <div className="mt-10 text-center">
            <button
              onClick={() => setVisibleChannelsCount((prev) => prev + 24)}
              className="px-8 py-3 rounded-full bg-white/10 hover:bg-[#00F0FF] hover:text-black text-white font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 border border-white/15"
            >
              Cargar Más Canales ({filteredChannels.length - visibleChannelsCount} restantes) ➔
            </button>
          </div>
        )}
      </section>

      {/* SECCIÓN DEPORTES EN VIVO & FIXTURE DE EVENTOS */}
      <section id="deportes-vivo" className="w-full max-w-6xl mx-auto px-6 py-20 border-t border-white/10 z-10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/30 text-[10px] font-extrabold uppercase tracking-widest text-pink-400 mb-3">
            <Flame className="w-3.5 h-3.5 text-pink-400" />
            Fútbol en Vivo Sin Cortes
          </div>
          <h2 className="text-3xl sm:text-5xl font-outfit font-extrabold tracking-tight mb-4 text-white">
            Vive los mejores <span className="capcut-accent-gradient">Eventos Deportivos</span>
          </h2>
          <p className="text-slate-300 text-sm">
            Disfruta de la Liga 1 Max, Champions League, Copa Libertadores y torneos internacionales con señal nativa en Full HD.
          </p>
        </div>

        {/* Match Fixture Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {UPCOMING_SPORTS_EVENTS.map((match) => (
            <div
              key={match.id}
              className="p-6 rounded-3xl capcut-card-bg relative overflow-hidden group border border-white/10 hover:border-pink-500/40 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-pink-500/20 border border-pink-500/40 text-pink-300">
                  {match.tag}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  {match.quality}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">{match.tournament}</p>
                <h3 className="text-lg sm:text-xl font-outfit font-black text-white group-hover:text-pink-300 transition-colors">
                  {match.homeTeam} <span className="text-[#00F0FF] font-normal">vs</span> {match.awayTeam}
                </h3>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                  <Clock className="w-4 h-4 text-[#00F0FF]" />
                  <span>{match.time}</span>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/60 border border-white/15">
                  <Tv className="w-3.5 h-3.5 text-pink-400" />
                  <span className="text-xs font-black text-white tracking-wider">{match.channelBadge}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BENTO GRID FEATURES SECTION */}
      <section id="caracteristicas" className="w-full max-w-6xl mx-auto px-6 py-24 border-t border-white/10 z-10">
        <div className="mb-16 text-center md:text-left max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.2em] font-extrabold text-[#00F0FF] mb-3">Edición Potente & Interfaz Inteligente</div>
          <h2 className="text-3xl sm:text-5xl font-outfit font-extrabold tracking-tight mb-4 text-white">
            Diseñado para la máxima fluidez
          </h2>
          <p className="text-slate-400 font-normal text-sm leading-relaxed">
            Olvídate de las aplicaciones lentas e incómodas. Disfruta de funciones exclusivas pensadas para Smart TV y PC.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: PIP Simulator (col-span-2) */}
          <div className="md:col-span-2 rounded-3xl capcut-card-bg p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-72 h-72 ambient-glow-cyan pointer-events-none" />
            
            <div>
              <span className="text-[9px] bg-[#00F0FF]/15 border border-[#00F0FF]/30 text-[#00F0FF] font-black px-3 py-1 rounded-full uppercase tracking-wider mb-6 inline-block">
                Exclusivo PC & Web
              </span>
              <h3 className="text-2xl font-outfit font-bold mb-3 text-white">Reproductor Flotante PiP (Picture-in-Picture)</h3>
              <p className="text-slate-300 text-sm font-normal leading-relaxed max-w-lg">
                Mantén tus partidos o películas favoritas flotando en una ventana arrastrable y redimensionable en cualquier parte de la pantalla.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={() => setSimulatedPip(true)}
                className="px-6 py-3 rounded-full bg-[#00F0FF] hover:bg-[#33F3FF] text-black font-extrabold text-xs uppercase tracking-wider active:scale-95 transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] flex items-center gap-2"
              >
                <Move className="w-4 h-4" />
                Probar Demo PiP Interactivo
              </button>
              <span className="text-slate-400 text-xs font-medium">Video real, arrastrable, redimensionable y compatible con links directos</span>
            </div>
          </div>

          {/* Card 2: Smart TV Remote */}
          <div className="rounded-3xl capcut-card-bg p-8 flex flex-col justify-between transition-all duration-300 group">
            <div>
              <span className="text-[9px] bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300 font-black px-3 py-1 rounded-full uppercase tracking-wider mb-6 inline-block">
                Smart TV Native
              </span>
              <h3 className="text-xl font-outfit font-bold mb-3 text-white">Navegación por Control Remoto (D-Pad)</h3>
              <p className="text-slate-300 text-sm font-normal leading-relaxed">
                Navega cómodamente desde tu sillón utilizando el control remoto oficial de tu televisor sin necesidad de conectar mouse adicionales.
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <div className="text-xs font-semibold text-[#00F0FF]">
                Compatible con TV Box, Xiaomi, Chromecast, JVC & Android TV.
              </div>
              <button
                onClick={() => setIsAppsModalOpen(true)}
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-200 hover:text-[#00F0FF] transition-colors pt-2 border-t border-white/10"
              >
                <Download className="w-3.5 h-3.5 text-[#00F0FF]" /> Descargar APK TV o Código Downloader (3895210) ➔
              </button>
            </div>
          </div>

          {/* Card 3: Sports Live */}
          <div className="rounded-3xl capcut-card-bg p-8 flex flex-col justify-between transition-all duration-300 group">
            <div>
              <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-black px-3 py-1 rounded-full uppercase tracking-wider mb-6 inline-block">
                Deportes en Vivo
              </span>
              <h3 className="text-xl font-outfit font-bold mb-3 text-white">Fútbol & Eventos Premium</h3>
              <p className="text-slate-300 text-sm font-normal leading-relaxed">
                Transmisiones estables de la Liga 1 Max, Champions League y torneos internacionales en Full HD sin retrasos.
              </p>
            </div>
            <div className="mt-6 text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-emerald-400" /> Servidores dedicados anti-buffering
            </div>
          </div>

          {/* Card 4: Interactive Categories (col-span-2) */}
          <div className="md:col-span-2 rounded-3xl capcut-card-bg p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-72 h-72 ambient-glow-fuchsia pointer-events-none" />

            <div>
              <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                <span className="text-[9px] bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300 font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  Catálogo Inteligente
                </span>
              </div>

              <div className="min-h-[80px]">
                <h3 className="text-xl font-outfit font-bold mb-2 text-white">Cine Estreno 2026, Series, Animes & Deportes</h3>
                <p className="text-slate-300 text-sm font-normal leading-relaxed max-w-lg">
                  Catálogo categorizado por plataformas (Netflix, Disney, Prime, HBO). Contenido actualizado diariamente en VOD.
                </p>
              </div>
            </div>
            <div className="mt-6 text-xs font-semibold text-[#00F0FF]">
              Actualización constante sin cobros adicionales por nuevo contenido.
            </div>
          </div>
        </div>
      </section>

      {/* CATALOG PREVIEW GRID SECTION WITH DYNAMIC ROTATING COVERS */}
      <section id="catalogo" className="w-full max-w-6xl mx-auto px-6 py-20 border-t border-white/10 z-10">
        <div className="mb-14 text-center">
          <div className="text-[11px] uppercase tracking-[0.2em] font-extrabold text-fuchsia-400 mb-2">Variedad Infinita</div>
          <h2 className="text-3xl sm:text-5xl font-outfit font-extrabold tracking-tight mb-3 text-white">
            Explora una muestra del contenido VOD
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Disfruta de las mejores producciones, estrenos de cine 2026 en 4K Ultra HD y señales deportivas exclusivas en Full HD.
          </p>
        </div>

        {/* Dynamic Carousel Showcase Cards */}
        <CatalogShowcaseGrid onSelectPlanes={() => scrollToSection("planes")} />
      </section>

      {/* PLANES Y PRECIOS SECTION */}
      <section id="planes" className="w-full max-w-6xl mx-auto px-6 py-28 border-t border-white/10 z-10">
        <div className="text-center mb-16 flex flex-col items-center">
          <div className="text-[11px] uppercase tracking-[0.2em] font-extrabold text-[#00F0FF] mb-3">Planes Sin Contrato</div>
          <h2 className="text-3xl sm:text-5xl font-outfit font-extrabold tracking-tight mb-6 text-white">
            Elige el plan ideal para ti
          </h2>
          <p className="text-slate-400 max-w-md text-sm font-normal mb-10">
            Disfruta de la mejor calidad al mejor precio. Ahorra al elegir la suscripción anual.
          </p>

          {/* Pricing Toggle Controls */}
          <div className="flex flex-col sm:flex-row gap-5 items-center justify-center mb-12">
            <div className="p-1 rounded-full bg-black/60 border border-white/15 inline-flex items-center">
              <button
                onClick={() => setBillingCycle("mensual")}
                className={`px-6 py-2.5 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all ${billingCycle === "mensual" ? "bg-[#00F0FF] text-black shadow-[0_0_20px_rgba(0,240,255,0.4)]" : "text-slate-400 hover:text-white"}`}
              >
                Mensual
              </button>
              <button
                onClick={() => setBillingCycle("anual")}
                className={`px-6 py-2.5 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 ${billingCycle === "anual" ? "bg-[#00F0FF] text-black shadow-[0_0_20px_rgba(0,240,255,0.4)]" : "text-slate-400 hover:text-white"}`}
              >
                Anual
                <span className="text-[9px] bg-black/30 text-white px-2 py-0.5 rounded font-black">Ahorro</span>
              </button>
            </div>

            <div className="p-1 rounded-full bg-black/60 border border-white/15 inline-flex items-center">
              <button
                onClick={() => setPricingGroup("recomendados")}
                className={`px-6 py-2.5 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all ${pricingGroup === "recomendados" ? "bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
              >
                Recomendados
              </button>
              <button
                onClick={() => setPricingGroup("iniciales")}
                className={`px-6 py-2.5 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all ${pricingGroup === "iniciales" ? "bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
              >
                Planes Básicos
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="flex flex-col md:flex-row justify-center items-stretch gap-6 max-w-4xl mx-auto mb-16">
          {selectedPlans.map((plan) => {
            const price = billingCycle === "mensual" ? plan.priceMonthly : plan.priceYearly;
            const savings = plan.priceMonthly * 12 - plan.priceYearly;

            return (
              <div
                key={plan.id}
                className={`flex-1 rounded-3xl capcut-card-bg p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${plan.highlighted ? "border-[#00F0FF]/50 ring-1 ring-[#00F0FF]/30 scale-[1.02]" : ""}`}
              >
                {plan.isPremium && (
                  <div className="absolute top-0 right-0 w-40 h-40 ambient-glow-cyan pointer-events-none" />
                )}

                <div>
                  <div className="h-7 mb-4">
                    {plan.badge ? (
                      <span className="text-[9px] uppercase tracking-widest font-black text-[#00F0FF] bg-[#00F0FF]/15 border border-[#00F0FF]/30 px-3 py-1 rounded-full">
                        {plan.badge}
                      </span>
                    ) : (
                      billingCycle === "anual" && (
                        <span className="text-[9px] uppercase tracking-widest font-black text-fuchsia-300 bg-fuchsia-500/15 border border-fuchsia-500/30 px-3 py-1 rounded-full">
                          Ahorras S/ {savings}
                        </span>
                      )
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-outfit font-extrabold text-white tracking-tight">{plan.name}</h3>
                    <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl">
                      {plan.icon}
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-outfit font-black text-white">S/ {price}</span>
                      <span className="text-slate-400 text-xs font-bold">/{billingCycle === "mensual" ? "mes" : "año"}</span>
                    </div>

                    <span className="text-[10px] text-[#00F0FF] font-bold tracking-wider block mt-2 uppercase">
                      {billingCycle === "mensual" ? plan.devices.mensual : plan.devices.anual}
                    </span>
                  </div>

                  <div className="h-[1px] bg-white/10 w-full mb-6" />

                  <ul className="space-y-3.5 mb-8">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex gap-2.5 text-xs text-slate-300 font-normal leading-relaxed">
                        <Check className="w-4 h-4 text-[#00F0FF] shrink-0 mt-0.5" strokeWidth={2.5} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleBuy(plan)}
                  className={`w-full py-4 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 ${plan.btnColor}`}
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  Adquirir Plan
                </button>
              </div>
            );
          })}
        </div>

        {/* PAYMENT METHODS BANNER (NUEVA SECCIÓN CON YAPE, PLIN, INTERBANK, BANCO DE LA NACIÓN) */}
        <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-3xl bg-black/60 border border-white/15 backdrop-blur-md flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-[#00F0FF]" />
            <h4 className="font-outfit font-black text-base text-white uppercase tracking-wider">
              Medios de Pago Aceptados
            </h4>
          </div>
          <p className="text-xs text-slate-400 mb-6 max-w-lg">
            Aceptamos las billeteras y bancos más rápidos del Perú. Las cuentas y confirmación se gestionan de forma segura por WhatsApp:
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-6">
            {/* Yape Badge */}
            <div className="px-4 py-2.5 rounded-2xl bg-[#731963]/30 border border-[#731963] flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#8A2BE2] shadow-[0_0_8px_#8A2BE2]"></span>
              <span className="font-outfit font-black text-sm text-[#D896FF]">YAPE</span>
            </div>

            {/* Plin Badge */}
            <div className="px-4 py-2.5 rounded-2xl bg-[#00D4FF]/20 border border-[#00D4FF]/40 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#00D4FF] shadow-[0_0_8px_#00D4FF]"></span>
              <span className="font-outfit font-black text-sm text-[#00F0FF]">PLIN</span>
            </div>

            {/* Interbank Badge */}
            <div className="px-4 py-2.5 rounded-2xl bg-[#009B3A]/20 border border-[#009B3A]/40 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#00E050] shadow-[0_0_8px_#00E050]"></span>
              <span className="font-outfit font-black text-sm text-emerald-300">INTERBANK</span>
            </div>

            {/* Banco de la Nación Badge */}
            <div className="px-4 py-2.5 rounded-2xl bg-[#D92A2A]/20 border border-[#D92A2A]/40 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#FF4D4D] shadow-[0_0_8px_#FF4D4D]"></span>
              <span className="font-outfit font-black text-sm text-rose-300">BANCO DE LA NACIÓN</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-slate-300">
            🔒 <strong className="text-white">Activación en menos de 5 minutos:</strong> Los números de cuenta o QR de transferencia se coordinan directamente en el chat oficial de WhatsApp con soporte inmediato.
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section id="testimonios" className="w-full max-w-6xl mx-auto px-6 py-28 border-t border-white/10 z-10">
        <div className="mb-16 text-center">
          <div className="text-[11px] uppercase tracking-[0.2em] font-extrabold text-[#00F0FF] mb-2">Opiniones</div>
          <h2 className="text-3xl sm:text-5xl font-outfit font-extrabold tracking-tight mb-3 text-white">
            Lo que dicen nuestros usuarios
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">La satisfacción de nuestros clientes respalda nuestro servicio.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-7 rounded-3xl capcut-card-bg relative">
            <p className="text-slate-300 text-sm leading-relaxed font-normal mb-6">
              "Buscaba una plataforma para ver fútbol peruano sin cortes. Con el Plan Sports puedo ver Liga 1 Max y DSports. La estabilidad es impecable."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#00F0FF]/20 border border-[#00F0FF]/40 flex items-center justify-center font-bold text-xs text-[#00F0FF]">
                JR
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Jorge Ramírez</h4>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Plan Sports Anual</p>
              </div>
            </div>
          </div>

          <div className="p-7 rounded-3xl capcut-card-bg relative">
            <p className="text-slate-300 text-sm leading-relaxed font-normal mb-6">
              "El catálogo de películas de estreno 2026 en VOD 4K es gigante. Mis hijos adoran la sección Zona Kids. Muy cómodo navegar en la TV con el mando."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center font-bold text-xs text-fuchsia-300">
                MA
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">María Alva</h4>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Plan Cinéfilo Anual</p>
              </div>
            </div>
          </div>

          <div className="p-7 rounded-3xl capcut-card-bg relative">
            <p className="text-slate-300 text-sm leading-relaxed font-normal mb-6">
              "Uso el reproductor PIP flotante en mi computadora mientras trabajo. Excelente resolución y la activación fue en menos de 5 minutos por WhatsApp."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center font-bold text-xs text-indigo-300">
                CP
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Carlos Paredes</h4>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Plan Premium Mensual</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="w-full max-w-4xl mx-auto px-6 py-28 border-t border-white/10 z-10">
        <div className="text-center mb-16">
          <div className="text-[11px] uppercase tracking-[0.2em] font-extrabold text-[#00F0FF] mb-2">Preguntas Frecuentes</div>
          <h2 className="text-3xl sm:text-5xl font-outfit font-extrabold tracking-tight mb-3 text-white">
            ¿Tienes dudas? Te ayudamos
          </h2>
          <p className="text-slate-400 text-sm">Resuelve tus inquietudes para empezar de inmediato.</p>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl capcut-card-bg overflow-hidden p-6 cursor-pointer" onClick={() => setActiveFaq(activeFaq === 0 ? null : 0)}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">¿Cómo obtengo mi acceso después de realizar el pago?</h3>
              <ChevronRight className={`w-5 h-5 text-[#00F0FF] transition-transform ${activeFaq === 0 ? "rotate-90" : ""}`} />
            </div>
            {activeFaq === 0 && (
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mt-3 pt-3 border-t border-white/10 font-normal">
                Al presionar "Adquirir Plan", se abrirá un chat directo de WhatsApp con nuestro número oficial (+51 912 194 777). Al confirmar el pago por Yape, Plin o transferencia, te generaremos tu usuario y contraseña en menos de 5 minutos.
              </p>
            )}
          </div>

          <div className="rounded-2xl capcut-card-bg overflow-hidden p-6 cursor-pointer" onClick={() => setActiveFaq(activeFaq === 1 ? null : 1)}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">¿En qué dispositivos puedo usar la aplicación?</h3>
              <ChevronRight className={`w-5 h-5 text-[#00F0FF] transition-transform ${activeFaq === 1 ? "rotate-90" : ""}`} />
            </div>
            {activeFaq === 1 && (
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mt-3 pt-3 border-t border-white/10 font-normal">
                Puedes acceder desde cualquier navegador en PC o teléfono, usar nuestra app nativa de Windows (con modo flotante PiP), app móvil Android, o en Smart TVs (Android TV, Chromecast, Xiaomi TV Box, JVC, TCL mediante APK o código Downloader 3895210).
              </p>
            )}
          </div>

          <div className="rounded-2xl capcut-card-bg overflow-hidden p-6 cursor-pointer" onClick={() => setActiveFaq(activeFaq === 2 ? null : 2)}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">¿Qué resolución y calidad tienen los canales y el cine?</h3>
              <ChevronRight className={`w-5 h-5 text-[#00F0FF] transition-transform ${activeFaq === 2 ? "rotate-90" : ""}`} />
            </div>
            {activeFaq === 2 && (
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mt-3 pt-3 border-t border-white/10 font-normal">
                Todos los más de 360 canales de televisión en vivo se transmiten en <strong>Full HD (1080p)</strong> garantizando fluidez y estabilidad sin cortes. Adicionalmente, contamos con secciones especiales de Cine VOD de estreno 2026 y Series en <strong>4K Ultra HD y 60 FPS</strong>.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="w-full border-t border-white/10 bg-[#010103] z-10 py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="./logo-teamg.png" alt="TeamG Play Logo" className="h-8" />
            <span className="font-semibold text-xs text-slate-400">© 2026 TeamG Play. WhatsApp Oficial: +51 912 194 777.</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-400">
            <button onClick={() => scrollToSection("caracteristicas")} className="hover:text-white transition-colors">Características</button>
            <button onClick={() => scrollToSection("buscador-canales")} className="hover:text-white transition-colors">Canales</button>
            <button onClick={() => scrollToSection("planes")} className="hover:text-white transition-colors">Precios</button>
            <button onClick={() => setIsAppsModalOpen(true)} className="hover:text-[#00F0FF] text-[#00F0FF] transition-colors flex items-center gap-1 font-bold">
              <Download className="w-3.5 h-3.5" /> Descargar Apps
            </button>
            <Link to="/login" className="hover:text-white text-[#00F0FF] font-bold">Iniciar Sesión</Link>
          </div>
        </div>
      </footer>

      {/* PERMANENT FLOATING WHATSAPP BUTTON (912 194 777) */}
      <div className="fixed bottom-6 left-6 z-[9990] flex items-center gap-3">
        <a
          href="https://wa.me/51912194777?text=Hola%20TeamG%20Play,%20deseo%20m%C3%A1s%20informaci%C3%B3n%20sobre%20los%20canales%20y%20planes"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3 px-4 py-3 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-black font-extrabold text-xs shadow-[0_0_25px_rgba(37,211,102,0.5)] transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <div className="relative flex items-center justify-center">
            <MessageCircle className="w-5 h-5 fill-current text-black" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full animate-ping"></span>
          </div>
          <div className="flex flex-col text-left">
            <span className="font-black leading-tight">WhatsApp Oficial</span>
            <span className="text-[10px] text-black/80 font-bold">912 194 777</span>
          </div>
        </a>
      </div>

      {/* MODAL: FULL HD CHANNEL GRID POSTER LIGHTBOX */}
      {isGrillaModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-[#08081a] border border-cyan-500/40 rounded-3xl p-6 shadow-[0_0_60px_rgba(0,240,255,0.3)] text-white flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#00F0FF]/15 text-[#00F0FF]">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-outfit font-black text-lg text-white">Grilla Completa de Canales Oficial</h3>
                  <p className="text-xs text-slate-400">Todos los canales en vivo con logotipos oficiales en alta definición</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/TeamG_Grilla_Completa_TODOS_Los_Canales.png"
                  download="TeamG_Grilla_Oficial_Canales.png"
                  className="px-4 py-2 rounded-xl bg-[#00F0FF] hover:bg-[#33F3FF] text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Descargar Imagen
                </a>
                <button
                  onClick={() => setIsGrillaModalOpen(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Poster Image Viewer */}
            <div className="flex-1 overflow-auto my-4 rounded-2xl bg-black/80 border border-white/10 p-2 flex justify-center items-start">
              <img
                src="/TeamG_Grilla_Completa_TODOS_Los_Canales.png"
                alt="Grilla Completa TeamG Play"
                className="max-w-full h-auto object-contain rounded-xl shadow-2xl"
              />
            </div>

            {/* Footer */}
            <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
              <span>Resolución Ultra HD (2160 x 4500 px) • Formato PNG</span>
              <button
                onClick={() => setIsGrillaModalOpen(false)}
                className="text-slate-300 hover:text-white font-bold"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPS & TV DOWNLOADS MODAL */}
      {isAppsModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-[#08081a] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(0,240,255,0.25)] text-white">
            
            {/* Close Button */}
            <button
              onClick={() => setIsAppsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-[#00F0FF] text-[11px] font-extrabold uppercase tracking-widest mb-3">
                <Download className="w-3.5 h-3.5" /> Centro de Descargas Oficial
              </div>
              <h2 className="text-2xl sm:text-3xl font-outfit font-black tracking-tight text-white">
                Instala <span className="capcut-accent-gradient">TeamG Play</span> en tu dispositivo
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1.5 max-w-md mx-auto">
                Selecciona tu equipo para descargar la aplicación oficial optimizada en 4K y Full HD.
              </p>
            </div>

            {/* Devices Grid */}
            <div className="grid grid-cols-1 gap-4">
              
              {/* Option 1: Smart TV & TV Box (Featured) */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-purple-950/20 to-black/60 border-2 border-[#00F0FF]/50 relative overflow-hidden shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF]">
                      <Tv className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-outfit font-black text-lg text-white">Smart TV / TV Box</h3>
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#00F0FF] text-black">
                          Recomendado TV
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Android TV, Fire TV Stick, Google TV, Xiaomi TV Box, TCL, Hisense, JVC
                      </p>
                    </div>
                  </div>
                </div>

                {/* TV Method A: Direct APK Button */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <a
                      href="https://teamg.store/teamgplay2TV.apk"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 px-5 rounded-xl bg-[#00F0FF] hover:bg-[#33F3FF] text-black font-black text-xs uppercase tracking-wider transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4 stroke-[2.5]" />
                      Descargar APK Smart TV
                    </a>
                  </div>

                  {/* TV Method B: Downloader App Code */}
                  <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="px-2.5 py-1 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-400 font-black text-[10px] uppercase tracking-wider">
                        Downloader
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-white">Código en App Downloader:</p>
                        <p className="text-[11px] text-slate-400">Ingresa este código en tu TV para instalar en 10 seg.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="font-mono text-lg sm:text-xl font-black text-[#00F0FF] tracking-wider px-3 py-1 rounded-lg bg-[#00F0FF]/10 border border-[#00F0FF]/30">
                        3895210
                      </span>
                      <button
                        onClick={handleCopyDownloaderCode}
                        className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition flex items-center gap-1 text-xs font-bold"
                        title="Copiar código"
                      >
                        {copiedCode ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        <span className="hidden sm:inline">{copiedCode ? "Copiado" : "Copiar"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Option 2: Android Mobile */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-outfit font-black text-base text-white">Android Celular / Tablet</h3>
                    <p className="text-xs text-slate-400">Versión táctil ultra fluida 60 FPS con Menú 3D y Trailers</p>
                  </div>
                </div>

                <a
                  href="https://teamg.store/teamgplay.apk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs uppercase tracking-wider transition-all hover:scale-105 flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar APK Móvil
                </a>
              </div>

              {/* Option 3: Windows PC */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-400">
                    <Laptop className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-outfit font-black text-base text-white">Windows PC (App de Escritorio)</h3>
                    <p className="text-xs text-slate-400">Reproductor nativo con modo flotante PiP y cero cortes</p>
                  </div>
                </div>

                <a
                  href="https://play.teamg.store/downloads/TeamG%20Play%20Desktop%20Setup%201.5.8.exe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs uppercase tracking-wider transition-all hover:scale-105 flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar para PC (.exe)
                </a>
              </div>

            </div>

            {/* Fast Install Guide Footer */}
            <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
              <p className="text-[11px] text-slate-400">
                💡 <strong className="text-slate-300">¿Cómo usar el código Downloader en Smart TV?</strong> Abre la app <span className="text-orange-400 font-bold">Downloader</span> en tu televisor, escribe <strong className="text-[#00F0FF] font-mono">3895210</strong>, presiona <strong className="text-white">Go</strong> y la instalación iniciará sola.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* REAL DRAGGABLE & RESIZABLE PIP PLAYER OVERLAY WITH DIRECT VIDEO SUPPORT */}
      {simulatedPip && (
        <div
          style={{
            position: "fixed",
            left: pipPosition.x !== null ? `${pipPosition.x}px` : "auto",
            top: pipPosition.y !== null ? `${pipPosition.y}px` : "auto",
            right: pipPosition.x === null ? "24px" : "auto",
            bottom: pipPosition.y === null ? "24px" : "auto",
            width: pipSize === "small" ? "320px" : pipSize === "large" ? "640px" : "460px",
            height: pipSize === "small" ? "200px" : pipSize === "large" ? "380px" : "280px",
          }}
          className="rounded-3xl bg-[#070716] border border-[#00F0FF]/50 shadow-[0_20px_60px_rgba(0,240,255,0.4)] z-[9999] overflow-hidden flex flex-col transition-shadow duration-300"
        >
          {/* Draggable Header Bar */}
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className="bg-[#0b0b24] px-4 py-2.5 flex items-center justify-between border-b border-white/10 cursor-move select-none"
          >
            <div className="flex items-center gap-2">
              <GripHorizontal className="w-4 h-4 text-[#00F0FF] cursor-grab active:cursor-grabbing" />
              <span className="text-[10px] uppercase font-black text-[#00F0FF] tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Reproductor PIP (Arrastrar & Redimensionar)
              </span>
            </div>

            {/* Controls Header Tools */}
            <div className="flex items-center gap-1.5 no-drag">
              {/* Size Selectors */}
              <div className="flex items-center bg-black/60 rounded-lg p-0.5 border border-white/10 text-[9px] font-bold">
                <button
                  onClick={() => setPipSize("small")}
                  className={`px-1.5 py-0.5 rounded ${pipSize === "small" ? "bg-[#00F0FF] text-black" : "text-slate-400 hover:text-white"}`}
                  title="Tamaño Pequeño"
                >
                  S
                </button>
                <button
                  onClick={() => setPipSize("medium")}
                  className={`px-1.5 py-0.5 rounded ${pipSize === "medium" ? "bg-[#00F0FF] text-black" : "text-slate-400 hover:text-white"}`}
                  title="Tamaño Mediano"
                >
                  M
                </button>
                <button
                  onClick={() => setPipSize("large")}
                  className={`px-1.5 py-0.5 rounded ${pipSize === "large" ? "bg-[#00F0FF] text-black" : "text-slate-400 hover:text-white"}`}
                  title="Tamaño Grande"
                >
                  L
                </button>
              </div>

              {/* Fullscreen Button */}
              <button
                onClick={togglePipFullscreen}
                className="p-1 rounded bg-white/10 hover:bg-[#00F0FF] hover:text-black transition text-white"
                title="Pantalla Completa"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              {/* Close PIP */}
              <button
                onClick={() => setSimulatedPip(false)}
                className="p-1 rounded bg-white/10 hover:bg-red-500 text-slate-300 hover:text-white transition"
                title="Cerrar PIP"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* HTML5 Video Element & Overlay */}
          <div className="relative flex-1 bg-black overflow-hidden group">
            <video
              ref={pipVideoRef}
              src={activeVideoUrl}
              autoPlay
              loop
              muted={pipMuted}
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Video Controls Bar */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2.5 flex items-center justify-between no-drag opacity-90 group-hover:opacity-100 transition-opacity">
              {/* Channel Label */}
              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-0.5 rounded bg-[#00F0FF] text-black font-extrabold text-[10px] tracking-wide">
                  Demo TeamG Play
                </span>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePipPlay}
                  className="p-1 rounded bg-black/60 hover:bg-white/20 text-white transition"
                  title={pipPlaying ? "Pausar" : "Reproducir"}
                >
                  {pipPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                </button>
                <button
                  onClick={togglePipMute}
                  className="p-1 rounded bg-black/60 hover:bg-white/20 text-white transition"
                  title={pipMuted ? "Activar Sonido" : "Silenciar"}
                >
                  {pipMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
                <button
                  onClick={togglePipFullscreen}
                  className="p-1 rounded bg-black/60 hover:bg-[#00F0FF] hover:text-black text-white transition"
                  title="Pantalla Completa"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default LandingPage;
