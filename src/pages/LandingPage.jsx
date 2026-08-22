// src/pages/LandingPage.jsx
import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { isWeb } from "../utils/platformUtils.js";
import heroShowcase from "../assets/hero_showcase.png";

function LandingPage() {
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState("mensual"); // "mensual" | "anual"
  const [simulatedPip, setSimulatedPip] = useState(false);
  const [pricingGroup, setPricingGroup] = useState("recomendados"); // "recomendados" | "iniciales"
  const [activeFaq, setActiveFaq] = useState(null);
  const [isAppsModalOpen, setIsAppsModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyDownloaderCode = () => {
    navigator.clipboard.writeText("3895210");
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // --- PIP Player Interactive State & Drag / Resize Logic ---
  // Helper to convert Dropbox URLs to raw direct streaming URLs
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

  const channelVideos = {
    promo: DEFAULT_PROMO_VIDEO,
    deportes: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    cine: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  };

  const handleSelectChannel = (channelKey) => {
    setPipChannel(channelKey);
    const url = channelVideos[channelKey] || DEFAULT_PROMO_VIDEO;
    setActiveVideoUrl(url);
    if (pipVideoRef.current) {
      pipVideoRef.current.src = url;
      pipVideoRef.current.play().catch(() => {});
      setPipPlaying(true);
    }
  };

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
      console.log("[LandingPage] Usuario logueado detectado. Redirigiendo a /home...");
      navigate("/home", { replace: true });
    }
  }, [user, isLoadingAuth, navigate]);

  // Redireccionar si estamos dentro de una app instalada (Electron o Capacitor nativo)
  useEffect(() => {
    if (!isLoadingAuth && !isWeb() && !user) {
      console.log("[LandingPage] Detectada app nativa sin sesión. Redirigiendo a /login...");
      navigate("/login", { replace: true });
    }
  }, [user, isLoadingAuth, navigate]);

  // Función para desplazamiento suave a anclas sin romper el HashRouter de React Router
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Datos de los 5 planes activos
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
        "Más de 90 canales en vivo",
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
        "Más de 90 canales en vivo",
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
        "Más de 90 canales en vivo",
        "Todos los canales deportivos",
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
        "Más de 90 canales en vivo",
        "Cine de estreno 2026",
        "VODs en 4K Ultra HD",
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
        "Más de 300 canales en vivo",
        "Incluye Liga 1 Max y DSports",
        "Cine de estreno 2026 (4K Ultra HD)",
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
          background: rgba(4, 4, 10, 0.75);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }

        .capcut-card-bg {
          background: radial-gradient(circle at 50% 0%, rgba(15, 15, 30, 0.95), rgba(6, 6, 14, 0.98));
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .capcut-card-bg:hover {
          border-color: rgba(0, 240, 255, 0.4);
          box-shadow: 0 12px 40px rgba(0, 240, 255, 0.12);
        }

        .perspective-mockup {
          transform: perspective(1200px) rotateY(-8deg) rotateX(4deg) scale(0.96);
          transition: all 600ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .perspective-mockup:hover {
          transform: perspective(1200px) rotateY(0deg) rotateX(0deg) scale(1);
          box-shadow: 0 30px 70px rgba(0, 240, 255, 0.25);
        }

        @keyframes marquee-scroll {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee-scroll 24s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }

        .ambient-glow-cyan {
          background: radial-gradient(circle, rgba(0, 240, 255, 0.18) 0%, transparent 70%);
        }
        .ambient-glow-fuchsia {
          background: radial-gradient(circle, rgba(217, 70, 239, 0.15) 0%, transparent 70%);
        }
      `}</style>

      {/* Atmospheric Ambient Lighting Glows */}
      <div className="absolute top-[-5%] left-[-10%] w-[55vw] h-[55vw] rounded-full ambient-glow-fuchsia blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-[20%] right-[-10%] w-[60vw] h-[60vw] rounded-full ambient-glow-cyan blur-[140px] pointer-events-none z-0" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_20%,#000_70%,transparent_100%)] pointer-events-none z-0" />

      {/* CapCut Style Fixed Island Header */}
      <header className="w-full z-50 sticky top-4 max-w-6xl mx-auto px-4">
        <div className="mx-auto px-6 py-3.5 rounded-full capcut-glass-nav border border-white/10 flex items-center justify-between shadow-[0_16px_50px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-3">
            <img src="./logo-teamg.png" alt="TeamG Play Logo" className="h-8 drop-shadow-[0_0_12px_rgba(0,240,255,0.5)]" />
            <span className="font-outfit font-black text-sm tracking-wider text-white">TEAMG <span className="text-[#00F0FF]">PLAY</span></span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[12px] font-semibold text-slate-300">
            <button onClick={() => scrollToSection("caracteristicas")} className="hover:text-[#00F0FF] transition-colors duration-200">Características</button>
            <button onClick={() => scrollToSection("catalogo")} className="hover:text-[#00F0FF] transition-colors duration-200">Catálogo</button>
            <button onClick={() => scrollToSection("planes")} className="hover:text-[#00F0FF] transition-colors duration-200">Planes y Precios</button>
            <button onClick={() => setIsAppsModalOpen(true)} className="hover:text-[#00F0FF] text-[#00F0FF] transition-colors duration-200 flex items-center gap-1.5 font-bold">
              <Download className="w-3.5 h-3.5" /> Descargar Apps
            </button>
            <button onClick={() => scrollToSection("testimonios")} className="hover:text-[#00F0FF] transition-colors duration-200">Opiniones</button>
            <button onClick={() => scrollToSection("faq")} className="hover:text-[#00F0FF] transition-colors duration-200">FAQ</button>
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
      <section className="relative w-full max-w-6xl mx-auto px-6 pt-16 md:pt-28 pb-28 flex flex-col lg:flex-row items-center gap-14 z-10">
        
        {/* Left Text Column */}
        <div className="flex-1 text-left flex flex-col items-start">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-cyan-400/30 text-[10px] font-extrabold uppercase tracking-widest text-[#00F0FF] mb-6 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-[#00F0FF]" />
            Streaming Ultra Fluido & HD
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-outfit font-extrabold tracking-tight leading-[1.02] mb-6 text-white">
            Lleva tu entretenimiento <br />
            <span className="capcut-accent-gradient">al siguiente nivel.</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-lg mb-8 font-normal leading-relaxed">
            Experimenta el futuro del IPTV sin cortes. Más de 300 canales en vivo, eventos deportivos exclusivos (Liga 1 Max, DSports) y un catálogo infinito de películas y series de estreno 2026 en 4K Ultra HD.
          </p>

          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto mb-10">
            <button
              onClick={() => scrollToSection("planes")}
              className="px-8 py-4 rounded-full bg-[#00F0FF] hover:bg-[#33F3FF] text-black font-black text-xs uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(0,240,255,0.5)] flex items-center gap-3"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              Comenzar Ahora
            </button>

            <button
              onClick={() => setIsAppsModalOpen(true)}
              className="px-7 py-4 rounded-full bg-white/5 border border-white/15 hover:bg-white/15 text-slate-200 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 hover:border-[#00F0FF]/50 hover:text-white"
            >
              <Tv className="w-4 h-4 text-cyan-400" />
              Apps TV / PC / Móvil
            </button>
          </div>

          {/* Quick Stats Badges */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/10 w-full max-w-lg">
            <div>
              <p className="text-xl sm:text-2xl font-outfit font-black text-white">+300</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Canales en Vivo</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-outfit font-black text-[#00F0FF]">4K Ultra HD</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Calidad VOD</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-outfit font-black text-fuchsia-400">24/7</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Soporte Técnico</p>
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
                    <p className="text-xs font-bold text-white">Streaming 4K Sin Lag</p>
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
      <section className="w-full py-8 bg-black/50 border-y border-white/10 overflow-hidden z-10">
        <div className="text-center mb-4">
          <p className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-slate-400">Canales y Contenido Incluido</p>
        </div>
        <div className="flex w-[200%] gap-12 items-center animate-marquee select-none whitespace-nowrap">
          <span className="text-sm font-outfit font-black tracking-widest text-slate-400 mx-4">LIGA 1 MAX</span>
          <span className="text-sm font-outfit font-black tracking-widest text-[#00F0FF] mx-4">DSPORTS</span>
          <span className="text-sm font-outfit font-black tracking-widest text-slate-400 mx-4">ESPN PREMIUM</span>
          <span className="text-sm font-outfit font-black tracking-widest text-fuchsia-400 mx-4">HBO MAX</span>
          <span className="text-sm font-outfit font-black tracking-widest text-slate-400 mx-4">DIRECTV SPORTS</span>
          <span className="text-sm font-outfit font-black tracking-widest text-[#00F0FF] mx-4">FOX SPORTS</span>
          <span className="text-sm font-outfit font-black tracking-widest text-slate-400 mx-4">DISNEY+</span>
          <span className="text-sm font-outfit font-black tracking-widest text-fuchsia-400 mx-4">UNIVERSAL+</span>

          <span className="text-sm font-outfit font-black tracking-widest text-slate-400 mx-4">LIGA 1 MAX</span>
          <span className="text-sm font-outfit font-black tracking-widest text-[#00F0FF] mx-4">DSPORTS</span>
          <span className="text-sm font-outfit font-black tracking-widest text-slate-400 mx-4">ESPN PREMIUM</span>
          <span className="text-sm font-outfit font-black tracking-widest text-fuchsia-400 mx-4">HBO MAX</span>
          <span className="text-sm font-outfit font-black tracking-widest text-slate-400 mx-4">DIRECTV SPORTS</span>
          <span className="text-sm font-outfit font-black tracking-widest text-[#00F0FF] mx-4">FOX SPORTS</span>
          <span className="text-sm font-outfit font-black tracking-widest text-slate-400 mx-4">DISNEY+</span>
          <span className="text-sm font-outfit font-black tracking-widest text-fuchsia-400 mx-4">UNIVERSAL+</span>
        </div>
      </section>

      {/* BENTO GRID FEATURES SECTION */}
      <section id="caracteristicas" className="w-full max-w-6xl mx-auto px-6 py-28 z-10">
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
              <span className="text-slate-400 text-xs font-medium">Video real, arrastrable, redimensionable y compatible con links de Dropbox</span>
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
                Transmisiones estables de la Liga 1 Max, Champions League y torneos internacionales sin retrasos.
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
                <h3 className="text-xl font-outfit font-bold mb-2 text-white">Cine 4K, Series, Animes & Deportes</h3>
                <p className="text-slate-300 text-sm font-normal leading-relaxed max-w-lg">
                  Catálogo categorizado por plataformas (Netflix, Disney, Prime, HBO). Contenido actualizado diariamente.
                </p>
              </div>
            </div>
            <div className="mt-6 text-xs font-semibold text-[#00F0FF]">
              Actualización constante sin cobros adicionales por nuevo contenido.
            </div>
          </div>
        </div>
      </section>

      {/* CATALOG PREVIEW GRID SECTION */}
      <section id="catalogo" className="w-full max-w-6xl mx-auto px-6 py-20 border-t border-white/10 z-10">
        <div className="mb-14 text-center">
          <div className="text-[11px] uppercase tracking-[0.2em] font-extrabold text-fuchsia-400 mb-2">Variedad Infinita</div>
          <h2 className="text-3xl sm:text-5xl font-outfit font-extrabold tracking-tight mb-3 text-white">
            Explora una muestra del contenido
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">Disfruta de las mejores producciones en la más alta resolución.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="relative group overflow-hidden rounded-3xl border border-white/10 bg-[#080814]">
            <img src="https://picsum.photos/seed/action2026/400/600" alt="Estrenos 4K" className="w-full h-80 object-cover filter brightness-90 group-hover:scale-105 transition-all duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent p-5 flex flex-col justify-end">
              <span className="text-[9px] bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 px-2.5 py-0.5 rounded-full w-max mb-2 font-bold">Cine 4K</span>
              <h4 className="text-sm font-bold text-white">Estrenos de Cine 2026</h4>
            </div>
          </div>

          <div className="relative group overflow-hidden rounded-3xl border border-white/10 bg-[#080814]">
            <img src="https://picsum.photos/seed/soccer2026/400/600" alt="Deportes en Vivo" className="w-full h-80 object-cover filter brightness-90 group-hover:scale-105 transition-all duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent p-5 flex flex-col justify-end">
              <span className="text-[9px] bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 px-2.5 py-0.5 rounded-full w-max mb-2 font-bold">Deportes</span>
              <h4 className="text-sm font-bold text-white">Liga 1 Max & DSports</h4>
            </div>
          </div>

          <div className="relative group overflow-hidden rounded-3xl border border-white/10 bg-[#080814]">
            <img src="https://picsum.photos/seed/anime2026/400/600" alt="Anime & Series" className="w-full h-80 object-cover filter brightness-90 group-hover:scale-105 transition-all duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent p-5 flex flex-col justify-end">
              <span className="text-[9px] bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 px-2.5 py-0.5 rounded-full w-max mb-2 font-bold">Series</span>
              <h4 className="text-sm font-bold text-white">Series, Animes & KDramas</h4>
            </div>
          </div>

          <div className="relative group overflow-hidden rounded-3xl border border-white/10 bg-[#080814]">
            <img src="https://picsum.photos/seed/kids2026/400/600" alt="Zona Kids" className="w-full h-80 object-cover filter brightness-90 group-hover:scale-105 transition-all duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent p-5 flex flex-col justify-end">
              <span className="text-[9px] bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 px-2.5 py-0.5 rounded-full w-max mb-2 font-bold">Kids</span>
              <h4 className="text-sm font-bold text-white">Zona Infantil Segura</h4>
            </div>
          </div>
        </div>
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
        <div className="flex flex-col md:flex-row justify-center items-stretch gap-6 max-w-4xl mx-auto">
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
              "Uso el reproductor PIP flotante en mi computadora mientras trabajo. Excelente resolución y la activación fue en menos de 5 minutos."
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
                Al presionar "Adquirir Plan", se abrirá un chat directo de WhatsApp con nuestro equipo. Al confirmar el pago, te generaremos tu usuario y contraseña de inmediato para que inicies sesión.
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
                Puedes acceder desde cualquier navegador en PC o teléfono, usar nuestra app nativa de Windows (con modo flotante PiP), app móvil Android, o en Smart TVs (Android TV, Chromecast, Xiaomi TV Box, etc.).
              </p>
            )}
          </div>

          <div className="rounded-2xl capcut-card-bg overflow-hidden p-6 cursor-pointer" onClick={() => setActiveFaq(activeFaq === 2 ? null : 2)}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">¿Qué ventaja tiene el plan Anual respecto al Mensual?</h3>
              <ChevronRight className={`w-5 h-5 text-[#00F0FF] transition-transform ${activeFaq === 2 ? "rotate-90" : ""}`} />
            </div>
            {activeFaq === 2 && (
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mt-3 pt-3 border-t border-white/10 font-normal">
                Además de ahorrar un monto considerable al año, los planes anuales Cinéfilo y Premium permiten reproducción simultánea en 1 Smart TV y 1 Celular al mismo tiempo.
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
            <span className="font-semibold text-xs text-slate-400">© 2026 TeamG Play. Todos los derechos reservados.</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-400">
            <button onClick={() => scrollToSection("caracteristicas")} className="hover:text-white transition-colors">Características</button>
            <button onClick={() => scrollToSection("planes")} className="hover:text-white transition-colors">Precios</button>
            <button onClick={() => setIsAppsModalOpen(true)} className="hover:text-[#00F0FF] text-[#00F0FF] transition-colors flex items-center gap-1 font-bold">
              <Download className="w-3.5 h-3.5" /> Descargar Apps
            </button>
            <button onClick={() => scrollToSection("testimonios")} className="hover:text-white transition-colors">Opiniones</button>
            <Link to="/login" className="hover:text-white text-[#00F0FF] font-bold">Iniciar Sesión</Link>
          </div>
        </div>
      </footer>

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
                Selecciona tu equipo para descargar la aplicación oficial optimizada en 4K.
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
                        Android TV, Fire TV Stick, Google TV, Xiaomi TV Box, TCL, Hisense
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
                  href="https://play.teamg.store/downloads/TeamG%20Play%20Mobile%201.5.8.apk"
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
                    <p className="text-xs text-slate-400">Reproductor MPV nativo con modo flotante PiP y cero cortes</p>
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

      {/* REAL DRAGGABLE & RESIZABLE PIP PLAYER OVERLAY WITH DROPBOX VIDEO SUPPORT */}
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
