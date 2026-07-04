import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Laptop, Smartphone, PlayCircle, Star, Check, Sparkles, Tv, Flame, MessageCircle, HelpCircle, ArrowRight, Zap, Monitor, Heart, Shield, Award, Users, RefreshCw } from "lucide-react";
import { isWeb } from "../utils/platformUtils.js";
import heroShowcase from "../assets/hero_showcase.png";

function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState("mensual"); // "mensual" | "anual"
  const [simulatedPip, setSimulatedPip] = useState(false);
  const [pipChannel, setPipChannel] = useState("deportes"); // "deportes" | "cine" | "kids"
  const [activeCategoryTab, setActiveCategoryTab] = useState("deportes");
  const [pricingGroup, setPricingGroup] = useState("recomendados"); // "recomendados" | "iniciales"

  // Redireccionar si el usuario ya está autenticado
  useEffect(() => {
    if (user) {
      console.log("[LandingPage] Usuario logueado detectado. Redirigiendo a /home...");
      navigate("/home", { replace: true });
    }
  }, [user, navigate]);

  // Redireccionar si estamos dentro de una app instalada (Electron o Capacitor nativo)
  useEffect(() => {
    if (!isWeb() && !user) {
      console.log("[LandingPage] Detectada app nativa. Redirigiendo a /login...");
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

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
      icon: <PlayCircle className="w-4 h-4 text-cyan-400" strokeWidth={1.5} />,
      priceMonthly: 12,
      priceYearly: 70,
      devices: {
        mensual: "1 Dispositivo",
        anual: "1 Dispositivo",
      },
      features: [
        "Más de 90 canales en vivo",
        "Acceso desde PC, Móvil o TV",
        "Soporte técnico premium",
        "Sin anuncios publicitarios",
      ],
      badge: "Esencial",
      color: "hover:border-cyan-500/20 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)]",
      btnColor: "bg-white/5 border border-white/10 hover:bg-white/10 text-white",
      group: "iniciales"
    },
    {
      id: "estandar",
      name: "Estándar",
      icon: <Laptop className="w-4 h-4 text-cyan-400" strokeWidth={1.5} />,
      priceMonthly: 15,
      priceYearly: 90,
      devices: {
        mensual: "1 Dispositivo",
        anual: "1 Dispositivo",
      },
      features: [
        "Más de 90 canales en vivo",
        "Cine y Series por categorías",
        "Documentales premium",
        "Acceso multisección ilimitado",
      ],
      badge: "Popular",
      color: "hover:border-cyan-500/20 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)]",
      btnColor: "bg-white/5 border border-white/10 hover:bg-white/10 text-white",
      group: "iniciales"
    },
    {
      id: "sports",
      name: "Sports",
      icon: <Flame className="w-4 h-4 text-pink-400" strokeWidth={1.5} />,
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
      color: "border-pink-500/30 shadow-[0_0_30px_rgba(236,72,153,0.08)] hover:border-pink-500/50",
      btnColor: "bg-pink-500 hover:bg-pink-600 text-white font-extrabold shadow-[0_4px_12px_rgba(236,72,153,0.2)]",
      highlighted: true,
      group: "recomendados"
    },
    {
      id: "cinefilo",
      name: "Cinéfilo",
      icon: <Star className="w-4 h-4 text-cyan-400" strokeWidth={1.5} />,
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
        "Series, Animes, Novelas, KDramas y Kids",
      ],
      badge: "Cine Completo",
      color: "hover:border-cyan-500/20 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)]",
      btnColor: "bg-white/5 border border-white/10 hover:bg-white/10 text-white",
      group: "recomendados"
    },
    {
      id: "premium",
      name: "Premium",
      icon: <Sparkles className="w-4 h-4 text-pink-400" strokeWidth={1.5} />,
      priceMonthly: 25,
      priceYearly: 180,
      devices: {
        mensual: "1 Dispositivo",
        anual: "1 SmartTV + 1 Celular",
      },
      features: [
        "Más de 300 canales en vivo",
        "Incluye Liga 1 Max y DSports",
        "Cine de estreno 2026 (VODs 4K)",
        "Series, Animes, KDramas y Novelas",
        "Sección Zona Kids especial",
        "Dragon Ball: Colección Completa",
      ],
      badge: "VIP - Acceso Total",
      color: "border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.12)] hover:border-cyan-500/60 ring-1 ring-cyan-500/10",
      btnColor: "bg-gradient-to-r from-cyan-500 to-pink-500 hover:opacity-95 text-white font-extrabold shadow-[0_4px_20px_rgba(6,182,212,0.25)]",
      highlighted: true,
      isPremium: true,
      group: "recomendados"
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

  const selectedPlans = plans.filter(p => p.group === pricingGroup);

  return (
    <main className="overflow-x-hidden w-full max-w-full min-h-screen bg-[#030206] text-white flex flex-col font-plus-jakarta select-none relative">
      
      {/* Styles Injection */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Syne:wght@700;800&display=swap');
        
        .font-plus-jakarta {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .font-syne {
          font-family: 'Syne', sans-serif;
        }

        .custom-transition {
          transition: all 700ms cubic-bezier(0.25, 1, 0.25, 1);
        }

        .perspective-tilt {
          transform: perspective(1400px) rotateY(-6deg) rotateX(3deg) scale(0.98);
          box-shadow: -15px 15px 40px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255,255,255,0.03) inset;
        }
        .perspective-tilt:hover {
          transform: perspective(1400px) rotateY(0deg) rotateX(0deg) scale(1);
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.7);
        }

        @keyframes ambient-glow {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.12; }
          50% { transform: translateY(-40px) scale(1.15); opacity: 0.22; }
        }
        .animate-ambient-glow-pink {
          animation: ambient-glow 14s ease-in-out infinite;
        }
        .animate-ambient-glow-cyan {
          animation: ambient-glow 18s ease-in-out infinite;
        }
        
        .glass-card-core {
          background: rgba(6, 4, 15, 0.75);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
        }

        /* Double bezel card styling */
        .double-bezel-outer {
          border-radius: 2.25rem;
          padding: 6px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%);
          border: 1px solid rgba(255, 255, 255, 0.03);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        }

        .double-bezel-inner {
          border-radius: calc(2.25rem - 6px);
          background: #080512;
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.06);
        }

        /* Marquee styles */
        @keyframes marquee-scroll {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee-scroll 25s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Cinematic Ambient Glow (Vanguard UI Architect) */}
      <div className="absolute top-[-10%] left-[-15%] w-[70%] h-[60%] rounded-full bg-pink-500/15 blur-[140px] pointer-events-none animate-ambient-glow-pink" />
      <div className="absolute bottom-[20%] right-[-15%] w-[65%] h-[65%] rounded-full bg-cyan-500/15 blur-[150px] pointer-events-none animate-ambient-glow-cyan" />
      <div className="absolute top-[40%] left-[25%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      {/* Discrete Noise & Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.007)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.007)_1px,transparent_1px)] bg-[size:6rem_6rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_15%,#000_50%,transparent_100%)] pointer-events-none" />

      {/* Floating Island Header */}
      <header className="w-full z-50 sticky top-5 max-w-6xl mx-auto px-4">
        <div className="mx-2 px-6 py-3.5 rounded-full bg-[#070510]/80 border border-white/5 backdrop-blur-xl flex items-center justify-between shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-3">
            <img src="./logo-teamg.png" alt="TeamG Play Logo" className="h-8 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]" />
            <span className="font-syne font-extrabold text-sm tracking-widest bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-transparent">TEAMG PLAY</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
            <button onClick={() => scrollToSection("caracteristicas")} className="hover:text-white transition-colors duration-200">Características</button>
            <button onClick={() => scrollToSection("previsualizar")} className="hover:text-white transition-colors duration-200">Catálogo</button>
            <button onClick={() => scrollToSection("planes")} className="hover:text-white transition-colors duration-200">Precios</button>
            <button onClick={() => scrollToSection("testimonios")} className="hover:text-white transition-colors duration-200">Opiniones</button>
            <button onClick={() => scrollToSection("faq")} className="hover:text-white transition-colors duration-200">FAQ</button>
          </nav>

          <div>
            <Link 
              to="/login" 
              className="px-5 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] font-extrabold tracking-widest uppercase transition-all duration-300 shadow-md active:scale-95 text-slate-200"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative w-full max-w-6xl mx-auto px-6 pt-20 md:pt-32 pb-36 flex flex-col lg:flex-row items-center gap-16 z-10">
        
        {/* Left Column */}
        <div className="flex-1 text-left flex flex-col items-start">
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#0e0c1a] border border-white/5 text-[9px] uppercase tracking-[0.25em] font-extrabold text-pink-400 mb-6 shadow-inner">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            IPTV Multiplataforma de Alta Gama
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-syne font-extrabold tracking-tight leading-[0.95] mb-6 max-w-xl text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400">
            La Televisión <br />
            <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-pink-500 bg-clip-text text-transparent">Reimaginada.</span>
          </h1>
          
          <p className="text-slate-400 text-sm sm:text-base max-w-lg mb-10 leading-relaxed font-light">
            Transmite más de 300 canales en vivo, eventos deportivos exclusivos (Liga 1 Max, DSports) y miles de películas y series de estreno (Cine 2026, VODs en 4K Ultra HD, KDramas, Animes y más). Todo en una interfaz adaptada a tu Smart TV.
          </p>

          <div className="flex flex-wrap gap-4 w-full sm:w-auto">
            {/* Button-in-Button primary CTA */}
            <button 
              onClick={() => scrollToSection("planes")} 
              className="group pl-6 pr-2 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-pink-500 text-white font-extrabold text-[10px] uppercase tracking-widest hover:scale-102 transition-all duration-300 active:scale-98 shadow-lg shadow-cyan-500/10 flex items-center gap-4"
            >
              Comenzar Ahora
              <div className="w-9 h-9 rounded-full bg-black/10 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </div>
            </button>
            <Link 
              to="/login" 
              className="px-6 py-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 font-bold text-[10px] uppercase tracking-widest transition-all active:scale-98"
            >
              Instaladores TV / PC
            </Link>
          </div>
        </div>

        {/* Right Column: Hero Visual Showcase */}
        <div className="flex-1 w-full flex flex-col justify-center items-center relative">
          {/* Logo prominently integrated behind mockup */}
          <div className="absolute -top-12 -left-8 w-40 h-40 opacity-15 pointer-events-none filter blur-[1px]">
            <img src="./logo-teamg.png" alt="Logo Watermark" className="w-full h-full object-contain" />
          </div>

          <div className="w-full max-w-md p-1.5 rounded-[2.25rem] bg-gradient-to-b from-white/10 to-transparent border border-white/5 shadow-2xl relative group overflow-hidden perspective-tilt custom-transition">
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-pink-500/10 opacity-40 group-hover:opacity-85 transition-opacity duration-700 pointer-events-none" />
            
            <div className="rounded-[calc(2.25rem-1.5px)] overflow-hidden border border-white/5 bg-[#05030c] shadow-[inset_0_1px_3px_rgba(255,255,255,0.1)]">
              <img 
                src={heroShowcase} 
                alt="Mockup General de Canales" 
                className="w-full h-auto object-cover opacity-85 group-hover:opacity-100 transition-opacity duration-700" 
              />
            </div>

            {/* Float Badges */}
            <div className="absolute -bottom-3 -left-3 bg-[#0a0518]/90 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl flex items-center gap-2.5 hidden sm:flex">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                <Tv className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-[8px] text-slate-500 uppercase tracking-widest font-extrabold">Smart TV</p>
                <p className="text-[10px] font-bold text-white">Navegación Mando</p>
              </div>
            </div>
            
            <div className="absolute -top-3 -right-3 bg-[#0a0518]/90 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl flex items-center gap-2.5 hidden sm:flex">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-[8px] text-slate-500 uppercase tracking-widest font-extrabold">Multitarea</p>
                <p className="text-[10px] font-bold text-white">Modo Flotante PIP</p>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* Infinite Marquee of Channels (Visual Hunger) */}
      <section className="w-full py-10 bg-black/30 border-y border-white/5 overflow-hidden z-10 flex flex-col justify-center">
        <div className="text-center mb-6">
          <p className="text-[9px] uppercase tracking-[0.25em] font-extrabold text-slate-500">Transmisión de los mejores canales y productoras</p>
        </div>
        <div className="flex w-[200%] gap-12 items-center animate-marquee select-none whitespace-nowrap">
          {/* First set of marquee items */}
          <span className="text-sm font-syne font-black tracking-widest text-slate-700 mx-4">LIGA 1 MAX</span>
          <span className="text-sm font-syne font-black tracking-widest text-pink-600/30 mx-4">DSPORTS</span>
          <span className="text-sm font-syne font-black tracking-widest text-slate-700 mx-4">ESPN PREMIUM</span>
          <span className="text-sm font-syne font-black tracking-widest text-cyan-500/30 mx-4">HBO MAX</span>
          <span className="text-sm font-syne font-black tracking-widest text-slate-700 mx-4">DIRECTV SPORTS</span>
          <span className="text-sm font-syne font-black tracking-widest text-pink-600/30 mx-4">FOX SPORTS</span>
          <span className="text-sm font-syne font-black tracking-widest text-slate-700 mx-4">DISNEY+</span>
          <span className="text-sm font-syne font-black tracking-widest text-cyan-500/30 mx-4">UNIVERSAL+</span>
          
          {/* Duplicate set for loop */}
          <span className="text-sm font-syne font-black tracking-widest text-slate-700 mx-4">LIGA 1 MAX</span>
          <span className="text-sm font-syne font-black tracking-widest text-pink-600/30 mx-4">DSPORTS</span>
          <span className="text-sm font-syne font-black tracking-widest text-slate-700 mx-4">ESPN PREMIUM</span>
          <span className="text-sm font-syne font-black tracking-widest text-cyan-500/30 mx-4">HBO MAX</span>
          <span className="text-sm font-syne font-black tracking-widest text-slate-700 mx-4">DIRECTV SPORTS</span>
          <span className="text-sm font-syne font-black tracking-widest text-pink-600/30 mx-4">FOX SPORTS</span>
          <span className="text-sm font-syne font-black tracking-widest text-slate-700 mx-4">DISNEY+</span>
          <span className="text-sm font-syne font-black tracking-widest text-cyan-500/30 mx-4">UNIVERSAL+</span>
        </div>
      </section>

      {/* Asymmetric Bento Grid Features Section */}
      <section id="caracteristicas" className="w-full max-w-6xl mx-auto px-6 py-32 z-10">
        <div className="mb-20 text-left max-w-xl">
          <div className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-cyan-400 mb-3">La mejor tecnología</div>
          <h2 className="text-4xl sm:text-5xl font-syne font-extrabold tracking-tight leading-none mb-4">Experiencia de Usuario Elevada</h2>
          <p className="text-slate-400 font-light text-xs sm:text-sm">Dejamos atrás las interfaces lentas y aburridas para ofrecerte una experiencia fluida y adaptada.</p>
        </div>

        {/* Grid System */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 grid-flow-dense">
          
          {/* Card 1: Interactive PIP Demo (col-span-2) */}
          <div className="md:col-span-2 double-bezel-outer group">
            <div className="double-bezel-inner p-8 h-full flex flex-col justify-between overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-3xl pointer-events-none" />
              
              <div>
                <span className="text-[8px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-black px-2.5 py-1 rounded-full uppercase tracking-wider mb-6 inline-block">
                  Exclusivo Windows / Web PC
                </span>
                <h3 className="text-xl font-syne font-bold mb-3">Modo Flotante PIP (Picture-in-Picture)</h3>
                <p className="text-slate-400 text-xs sm:text-sm font-light leading-relaxed max-w-md">
                  No detengas tu entretenimiento. Nuestra aplicación te permite reducir el video a una esquina flotante para ver partidos en vivo o películas mientras juegas, estudias o trabajas.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => setSimulatedPip(true)}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-pink-500 text-white font-extrabold text-[9px] uppercase tracking-wider active:scale-95 custom-transition shadow-lg shadow-cyan-500/10"
                >
                  Probar Demo PIP
                </button>
                <span className="text-slate-500 text-[10px] font-semibold">Haz clic para experimentar cómo flota el reproductor</span>
              </div>
            </div>
          </div>

          {/* Card 2: Smart TV Native (col-span-1) */}
          <div className="double-bezel-outer group">
            <div className="double-bezel-inner p-8 h-full flex flex-col justify-between">
              <div>
                <span className="text-[8px] bg-pink-500/10 border border-pink-500/20 text-pink-400 font-black px-2.5 py-1 rounded-full uppercase tracking-wider mb-6 inline-block">
                  Soporte Smart TV
                </span>
                <h3 className="text-xl font-syne font-bold mb-3">D-Pad Navigation</h3>
                <p className="text-slate-400 text-xs sm:text-sm font-light leading-relaxed">
                  ¿Cansado de conectar un mouse a tu Android TV? Nuestra aplicación tiene soporte nativo total para el control remoto de tu televisor.
                </p>
              </div>
              <div className="mt-6 flex items-center text-[10px] font-bold text-pink-400/80">
                Optimizado para TV Box, JVC, Xiaomi, Chromecast
              </div>
            </div>
          </div>

          {/* Card 3: Fútbol en Vivo (col-span-1) */}
          <div className="double-bezel-outer group">
            <div className="double-bezel-inner p-8 h-full flex flex-col justify-between">
              <div>
                <span className="text-[8px] bg-pink-500/10 border border-pink-500/20 text-pink-400 font-black px-2.5 py-1 rounded-full uppercase tracking-wider mb-6 inline-block">
                  Deportes en Vivo
                </span>
                <h3 className="text-xl font-syne font-bold mb-3">Fútbol Profesional</h3>
                <p className="text-slate-400 text-xs sm:text-sm font-light leading-relaxed">
                  Transmisión directa y estable de los torneos más importantes de Perú y del mundo en calidad Premium y sin interrupciones.
                </p>
              </div>
              <div className="mt-6 flex items-center text-[10px] font-bold text-pink-400 gap-1.5">
                <Flame className="w-3.5 h-3.5 text-cyan-400" /> Liga 1 Max, DSports y más
              </div>
            </div>
          </div>

          {/* Card 4: Categorías Interactivas (col-span-2) */}
          <div className="md:col-span-2 double-bezel-outer group">
            <div className="double-bezel-inner p-8 h-full flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 blur-3xl pointer-events-none" />
              
              <div>
                <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                  <span className="text-[8px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Catálogo de Contenido
                  </span>
                  
                  {/* Category switcher */}
                  <div className="flex gap-1.5 p-1 rounded-full bg-black/40 border border-white/5 text-[9px] font-bold">
                    <button 
                      onClick={() => setActiveCategoryTab("deportes")}
                      className={`px-3 py-1 rounded-full transition-all duration-300 ${activeCategoryTab === "deportes" ? "bg-cyan-500/15 text-cyan-400" : "text-slate-500 hover:text-slate-305"}`}
                    >
                      Deportes
                    </button>
                    <button 
                      onClick={() => setActiveCategoryTab("cine")}
                      className={`px-3 py-1 rounded-full transition-all duration-300 ${activeCategoryTab === "cine" ? "bg-cyan-500/15 text-cyan-400" : "text-slate-500 hover:text-slate-350"}`}
                    >
                      Cine & Series
                    </button>
                    <button 
                      onClick={() => setActiveCategoryTab("kids")}
                      className={`px-3 py-1 rounded-full transition-all duration-300 ${activeCategoryTab === "kids" ? "bg-cyan-500/15 text-cyan-400" : "text-slate-500 hover:text-slate-350"}`}
                    >
                      Zona Kids
                    </button>
                  </div>
                </div>

                <div className="min-h-[90px]">
                  {activeCategoryTab === "deportes" && (
                    <div>
                      <h3 className="text-lg font-syne font-bold mb-2">Fútbol, Tenis, F1 y mucho más</h3>
                      <p className="text-slate-400 text-xs sm:text-sm font-light leading-relaxed max-w-md">
                        Acceso a toda la grilla de canales deportivos locales e internacionales en vivo, con servidores optimizados para no tener retrasos ni lag.
                      </p>
                    </div>
                  )}
                  {activeCategoryTab === "cine" && (
                    <div>
                      <h3 className="text-lg font-syne font-bold mb-2">Estrenos de Cine 2026 en VOD 4K Ultra HD</h3>
                      <p className="text-slate-400 text-xs sm:text-sm font-light leading-relaxed max-w-md">
                        Categorización inteligente de las principales plataformas. Series, Animes, KDramas y Novelas actualizadas a diario.
                      </p>
                    </div>
                  )}
                  {activeCategoryTab === "kids" && (
                    <div>
                      <h3 className="text-lg font-syne font-bold mb-2">Zona Infantil Segura</h3>
                      <p className="text-slate-400 text-xs sm:text-sm font-light leading-relaxed max-w-md">
                        Perfil especializado para niños con las mejores series infantiles, películas animadas y canales en vivo diseñados para su diversión.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-8 text-[10px] font-semibold text-cyan-400">
                Catálogo dinámico actualizado diariamente sin costos adicionales.
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Visual Previews / Catalog Grid Section (Visual Hunger) */}
      <section id="previsualizar" className="w-full max-w-6xl mx-auto px-6 py-20 border-t border-white/5 z-10">
        <div className="mb-16 text-center">
          <div className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-pink-400 mb-3">¿Qué vas a ver hoy?</div>
          <h2 className="text-4xl font-syne font-extrabold tracking-tight mb-4">Películas de Estreno y Canales en Vivo</h2>
          <p className="text-slate-400 font-light text-xs sm:text-sm max-w-md mx-auto">Explora una pequeña muestra del contenido premium disponible de manera instantánea.</p>
        </div>

        {/* Staggered Content Cards (Z-Axis Cascade concept) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="relative group overflow-hidden rounded-2xl border border-white/5 bg-[#0e0c1a]">
            <img src="https://picsum.photos/seed/action/400/600" alt="Cine de Acción" className="w-full h-72 object-cover filter grayscale contrast-125 opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-4 flex flex-col justify-end">
              <span className="text-[8px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full w-max mb-1.5 font-bold">Cine</span>
              <h4 className="text-xs font-bold">Cine de Estreno 2026 (VODs 4K)</h4>
            </div>
          </div>
          <div className="relative group overflow-hidden rounded-2xl border border-white/5 bg-[#0e0c1a]">
            <img src="https://picsum.photos/seed/soccer/400/600" alt="Liga de Fútbol" className="w-full h-72 object-cover filter grayscale contrast-125 opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-4 flex flex-col justify-end">
              <span className="text-[8px] bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2 py-0.5 rounded-full w-max mb-1.5 font-bold">Deportes</span>
              <h4 className="text-xs font-bold">Partidos en Vivo (Liga 1 Max & DSports)</h4>
            </div>
          </div>
          <div className="relative group overflow-hidden rounded-2xl border border-white/5 bg-[#0e0c1a]">
            <img src="https://picsum.photos/seed/anime/400/600" alt="Anime Colección" className="w-full h-72 object-cover filter grayscale contrast-125 opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-4 flex flex-col justify-end">
              <span className="text-[8px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full w-max mb-1.5 font-bold">Animación</span>
              <h4 className="text-xs font-bold">Series completas y Animes</h4>
            </div>
          </div>
          <div className="relative group overflow-hidden rounded-2xl border border-white/5 bg-[#0e0c1a]">
            <img src="https://picsum.photos/seed/kids/400/600" alt="Zona Kids" className="w-full h-72 object-cover filter grayscale contrast-125 opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-4 flex flex-col justify-end">
              <span className="text-[8px] bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2 py-0.5 rounded-full w-max mb-1.5 font-bold">Kids</span>
              <h4 className="text-xs font-bold">Diversión Infantil Segura</h4>
            </div>
          </div>
        </div>
      </section>

      {/* Redesigned Pricing Section */}
      <section id="planes" className="w-full max-w-6xl mx-auto px-6 py-32 border-t border-white/5 z-10">
        <div className="text-center mb-16 flex flex-col items-center">
          <div className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-cyan-400 mb-3">Acceso ilimitado</div>
          <h2 className="text-4xl font-syne font-extrabold tracking-tight mb-6">Planes Flexibles para tu Entretenimiento</h2>
          <p className="text-slate-450 max-w-md text-xs sm:text-sm font-light mb-10">
            Ahorra contratando la suscripción anual. Selecciona tu ciclo y categoría.
          </p>

          {/* Pricing Filters (Combats Clutter) */}
          <div className="flex flex-col sm:flex-row gap-6 items-center justify-center mb-12">
            
            {/* Billing switch */}
            <div className="relative p-0.5 rounded-full bg-[#06040d] border border-white/10 inline-flex items-center shadow-inner">
              <button 
                onClick={() => setBillingCycle("mensual")}
                className={`px-5 py-2 rounded-full text-[10px] font-extrabold uppercase tracking-widest transition-all duration-300 ${billingCycle === "mensual" ? "bg-gradient-to-r from-cyan-500 to-pink-500 text-white" : "text-slate-400 hover:text-white"}`}
              >
                Mensual
              </button>
              <button 
                onClick={() => setBillingCycle("anual")}
                className={`px-5 py-2 rounded-full text-[10px] font-extrabold uppercase tracking-widest transition-all duration-300 flex items-center gap-1.5 ${billingCycle === "anual" ? "bg-gradient-to-r from-cyan-500 to-pink-500 text-white" : "text-slate-400 hover:text-white"}`}
              >
                Anual
                <span className="text-[8px] bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 px-1.5 py-0.5 rounded font-black">Ahorro</span>
              </button>
            </div>

            {/* Category tabs */}
            <div className="relative p-0.5 rounded-full bg-[#06040d] border border-white/10 inline-flex items-center shadow-inner">
              <button 
                onClick={() => setPricingGroup("recomendados")}
                className={`px-5 py-2 rounded-full text-[10px] font-extrabold uppercase tracking-widest transition-all duration-300 ${pricingGroup === "recomendados" ? "bg-gradient-to-r from-cyan-500 to-pink-500 text-white" : "text-slate-400 hover:text-white"}`}
              >
                Recomendados
              </button>
              <button 
                onClick={() => setPricingGroup("iniciales")}
                className={`px-5 py-2 rounded-full text-[10px] font-extrabold uppercase tracking-widest transition-all duration-300 ${pricingGroup === "iniciales" ? "bg-gradient-to-r from-cyan-500 to-pink-500 text-white" : "text-slate-400 hover:text-white"}`}
              >
                Planes Básicos
              </button>
            </div>

          </div>
        </div>

        {/* Pricing Cards Grid (Cleaned and grouped) */}
        <div className="flex flex-col md:flex-row justify-center items-stretch gap-6 max-w-4xl mx-auto">
          {selectedPlans.map((plan) => {
            const price = billingCycle === "mensual" ? plan.priceMonthly : plan.priceYearly;
            const savings = (plan.priceMonthly * 12) - plan.priceYearly;
            
            return (
              <div 
                key={plan.id}
                className={`flex-1 double-bezel-outer custom-transition ${plan.color} ${plan.highlighted ? 'scale-[1.02] border-white/15' : ''}`}
              >
                <div className="double-bezel-inner p-8 h-full flex flex-col justify-between relative overflow-hidden">
                  
                  {plan.isPremium && (
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-cyan-500/5 blur-2xl pointer-events-none" />
                  )}

                  <div>
                    {/* Badge */}
                    <div className="h-6 mb-4">
                      {plan.badge ? (
                        <span className="text-[8px] uppercase tracking-widest font-black text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2.5 py-0.5 rounded-full">
                          {plan.badge}
                        </span>
                      ) : (
                        billingCycle === "anual" && (
                          <span className="text-[8px] uppercase tracking-widest font-black text-pink-400 bg-pink-400/10 border border-pink-400/20 px-2.5 py-0.5 rounded-full">
                            Ahorro S/ {savings}
                          </span>
                        )
                      )}
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-syne font-bold tracking-tight">{plan.name}</h3>
                      <div className="p-2 bg-white/5 border border-white/10 rounded-lg">
                        {plan.icon}
                      </div>
                    </div>

                    {/* Precios */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-syne font-black text-white">S/ {price}</span>
                        <span className="text-slate-500 text-[10px] font-bold">/{billingCycle === "mensual" ? "mes" : "año"}</span>
                      </div>
                      
                      <span className="text-[9px] text-pink-400 font-extrabold tracking-widest block mt-1.5 uppercase">
                        {billingCycle === "mensual" ? plan.devices.mensual : plan.devices.anual}
                      </span>
                    </div>

                    {/* Separador */}
                    <div className="h-[1px] bg-white/5 w-full mb-6" />

                    {/* Características */}
                    <ul className="space-y-3.5 mb-8">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex gap-2 text-xs text-slate-350 font-light leading-relaxed">
                          <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" strokeWidth={2.5} />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <button 
                    onClick={() => handleBuy(plan)}
                    className={`w-full py-3.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest transition-all duration-300 active:scale-95 text-white flex items-center justify-center gap-1.5 ${plan.btnColor}`}
                  >
                    <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                    Adquirir Plan
                  </button>

                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Testimonials / Social Proof Section */}
      <section id="testimonios" className="w-full max-w-6xl mx-auto px-6 py-32 border-t border-white/5 z-10">
        <div className="mb-20 text-center">
          <div className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-pink-400 mb-3">Testimonios</div>
          <h2 className="text-4xl font-syne font-extrabold tracking-tight mb-4">Lo que Dicen Nuestros Clientes</h2>
          <p className="text-slate-400 font-light text-xs sm:text-sm max-w-md mx-auto">La estabilidad y rapidez de nuestro servicio nos respalda.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 relative">
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-light mb-6">
              "Buscaba una plataforma para ver fútbol peruano sin cortes. Con el Plan Sports puedo ver Liga 1 Max y DSports. La estabilidad es impecable."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center font-bold text-xs text-cyan-400">
                JR
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold">Jorge Ramírez</h4>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Plan Sports Anual</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 relative">
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-light mb-6">
              "El catálogo de películas de estreno 2026 en VOD 4K es gigante. Mis hijos adoran la sección Zona Kids. Muy cómodo navegar por los menús en la TV usando el mando."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-pink-500/20 border border-pink-500/30 flex items-center justify-center font-bold text-xs text-pink-400">
                MA
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold">María Alva</h4>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Plan Cinéfilo Anual</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 relative">
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-light mb-6">
              "Uso el reproductor PIP flotante en mi computadora mientras trabajo en la oficina. Excelente resolución y la activación fue en menos de 5 minutos."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-indigo-400">
                CP
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold">Carlos Paredes</h4>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Plan Premium Mensual</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges / Security Section */}
      <section className="w-full py-16 bg-black/40 border-t border-white/5 z-10 text-center">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="flex flex-col items-center gap-3">
            <Shield className="w-6 h-6 text-cyan-400" strokeWidth={1.5} />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Compra Segura</h4>
            <p className="text-[10px] text-slate-500 max-w-[150px]">Atención y confirmación directa mediante WhatsApp oficial.</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <Zap className="w-6 h-6 text-pink-400" strokeWidth={1.5} />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Activación Rápida</h4>
            <p className="text-[10px] text-slate-500 max-w-[150px]">Tu cuenta estará configurada y lista en menos de 5 minutos.</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 text-cyan-400" strokeWidth={1.5} />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Servidores Estables</h4>
            <p className="text-[10px] text-slate-500 max-w-[150px]">Red dedicada de transmisión sin cortes ni caídas.</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <Users className="w-6 h-6 text-pink-400" strokeWidth={1.5} />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Soporte Continuo</h4>
            <p className="text-[10px] text-slate-500 max-w-[150px]">Asistencia técnica inmediata para cualquier dispositivo.</p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="w-full max-w-4xl mx-auto px-6 py-32 border-t border-white/5 z-10">
        <div className="text-center mb-16">
          <div className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-cyan-400 mb-3">Dudas resueltas</div>
          <h2 className="text-4xl font-syne font-extrabold tracking-tight mb-4">Preguntas Frecuentes</h2>
          <p className="text-slate-400 font-light text-xs sm:text-sm">Encuentra respuestas rápidas para comenzar hoy mismo.</p>
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[2px] h-full bg-cyan-500/40" />
            <h3 className="text-sm sm:text-base font-bold mb-2">
              ¿Cómo obtengo mi cuenta y contraseña después de realizar el pago?
            </h3>
            <p className="text-slate-450 text-xs sm:text-sm leading-relaxed font-light">
              Al presionar "Adquirir Plan", se abrirá una conversación de WhatsApp con un mensaje preconfigurado. Al confirmar el pago, nuestro equipo te creará el usuario de acceso y te enviará las credenciales al instante para que inicies sesión en tu dispositivo.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[2px] h-full bg-pink-500/40" />
            <h3 className="text-sm sm:text-base font-bold mb-2">
              ¿En qué dispositivos puedo utilizar la aplicación?
            </h3>
            <p className="text-slate-450 text-xs sm:text-sm leading-relaxed font-light">
              Puedes acceder desde cualquier navegador web en PC y móviles, instalar la app oficial de Windows (que incluye el reproductor flotante PIP), usar la aplicación móvil para Android, o instalarla en televisores Smart TV (Android TV, Chromecast, Xiaomi TV Box, JVC Smart TV).
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[2px] h-full bg-indigo-500/40" />
            <h3 className="text-sm sm:text-base font-bold mb-2">
              ¿Qué ventajas incluye el plan Anual en comparación al Mensual?
            </h3>
            <p className="text-slate-450 text-xs sm:text-sm leading-relaxed font-light">
              Además de una reducción significativa de la tarifa (ahorro de hasta S/ 120 al año), las licencias anuales de los planes Cinéfilo y Premium te otorgan la posibilidad de reproducir de manera simultánea en 1 Smart TV y 1 teléfono móvil. Los planes mensuales están limitados a 1 único dispositivo activo a la vez.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 bg-[#020105] z-10 py-16">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="./logo-teamg.png" alt="TeamG Play Logo" className="h-8" />
            <span className="font-extrabold text-xs tracking-tight text-slate-500">© 2026 TeamG Play. Todos los derechos reservados.</span>
          </div>

          <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <button onClick={() => scrollToSection("caracteristicas")} className="hover:text-white transition-colors duration-200">Características</button>
            <button onClick={() => scrollToSection("planes")} className="hover:text-white transition-colors duration-200">Precios</button>
            <button onClick={() => scrollToSection("testimonios")} className="hover:text-white transition-colors duration-200">Opiniones</button>
            <Link to="/login" className="hover:text-white transition-colors duration-200 text-pink-500 font-extrabold">Iniciar Sesión</Link>
          </div>
        </div>
      </footer>

      {/* Interactive PIP Player Simulator */}
      {simulatedPip && (
        <div className="fixed bottom-6 right-6 w-80 h-48 rounded-2xl bg-[#080512] border border-cyan-500/30 shadow-[0_10px_45px_rgba(6,182,212,0.3)] z-[9999] overflow-hidden flex flex-col transition-all duration-500">
          
          {/* Header */}
          <div className="bg-[#0b081c] px-4 py-2 flex items-center justify-between border-b border-white/5">
            <span className="text-[9px] uppercase font-black text-cyan-400 tracking-widest flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Reproductor Flotante PIP (Demo)
            </span>
            <button 
              onClick={() => setSimulatedPip(false)}
              className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 transition"
            >
              ✕
            </button>
          </div>

          {/* Video Simulation content */}
          <div className="relative flex-1 bg-slate-950 flex flex-col justify-between overflow-hidden p-3">
            {/* Mesh background playing simulation */}
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-600/10 via-slate-950 to-pink-600/10 animate-pulse" />
            
            <div className="z-10 text-center flex-1 flex flex-col justify-center items-center">
              <PlayCircle className="w-7 h-7 text-white mb-1.5 opacity-85" />
              {pipChannel === "deportes" && (
                <p className="text-[10px] font-bold text-white">Transmisión: Alianza Lima vs Melgar (En Vivo DSports)</p>
              )}
              {pipChannel === "cine" && (
                <p className="text-[10px] font-bold text-white">Cine 4K: Gladiator II (Cine 2026) - VOD</p>
              )}
              {pipChannel === "kids" && (
                <p className="text-[10px] font-bold text-white">Zona Kids: Dragon Ball Daima (Episodio 12)</p>
              )}
              <p className="text-[8px] text-slate-500 mt-1">Sigue haciendo scroll mientras el video te acompaña</p>
            </div>

            {/* Simulated interactive channel changer inside PIP */}
            <div className="z-10 flex gap-1 justify-center mt-2">
              <button 
                onClick={() => setPipChannel("deportes")}
                className={`px-2 py-0.5 rounded text-[8px] font-bold ${pipChannel === "deportes" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-black/40 text-slate-400"}`}
              >
                Fútbol
              </button>
              <button 
                onClick={() => setPipChannel("cine")}
                className={`px-2 py-0.5 rounded text-[8px] font-bold ${pipChannel === "cine" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-black/40 text-slate-400"}`}
              >
                Película
              </button>
              <button 
                onClick={() => setPipChannel("kids")}
                className={`px-2 py-0.5 rounded text-[8px] font-bold ${pipChannel === "kids" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-black/40 text-slate-400"}`}
              >
                Kids
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default LandingPage;
