import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { isAndroidTV } from "../utils/platformUtils.js";
import { Laptop, Smartphone, Eye, EyeOff, Loader2, Trophy, Users, PlayCircle, Star } from "lucide-react";
import axiosInstance from "../utils/axiosInstance.js";

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


const TV_LOGIN_FOCUSABLE_COUNT = 6;

const resolveTVLoginAction = (event) => {
  switch (event.key) {
    case "ArrowUp":
    case "ArrowDown":
    case "ArrowLeft":
    case "ArrowRight":
    case "Enter":
      return event.key;
    default:
      break;
  }

  switch (event.keyCode) {
    case 19:
      return "ArrowUp";
    case 20:
      return "ArrowDown";
    case 21:
      return "ArrowLeft";
    case 22:
      return "ArrowRight";
    case 23:
    case 66:
      return "Enter";
    default:
      return null;
  }
};

const focusElementWithoutScroll = (element) => {
  if (!element) return;

  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
};

const activateTextInput = (input) => {
  if (!input) return;

  focusElementWithoutScroll(input);

  try {
    const valueLength = input.value?.length || 0;
    input.setSelectionRange(valueLength, valueLength);
  } catch {}

  try {
    input.click();
  } catch {}
};

// SVG personalizado de un balón de fútbol
const SoccerBallIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m12 2-2 3.5 2 2.5 2-2.5z" />
    <path d="m12 22-2-3.5 2-2.5 2 2.5z" />
    <path d="M2 12h3.5l2.5-2-2.5-2z" />
    <path d="M22 12h-3.5l-2.5 2 2.5 2z" />
    <path d="m5.5 6.5 2 2.5-2.5 2-2-2.5z" />
    <path d="m18.5 17.5-2-2.5 2.5-2 2 2.5z" />
  </svg>
);

// Componentes para el contador regresivo estilo FIFA 2026
const DigitSlot = ({ digit, isLime = false }) => (
  <div className={`relative w-7 sm:w-10 md:w-12 h-10 sm:h-14 md:h-16 flex items-center justify-center bg-[#070314] border border-white/10 rounded-lg sm:rounded-xl overflow-hidden shadow-lg shadow-black/85 ${isLime ? 'border-lime-500/30' : ''}`}>
    {/* Sombras cilíndricas de profundidad 3D */}
    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-0" />
    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-0" />
    
    {/* Línea divisoria central típica de pantalla de solapa/flip */}
    <div className="absolute top-[50%] left-0 right-0 h-[1.5px] bg-[#000000]/90 z-10" />
    
    {/* El dígito */}
    <span className={`text-base sm:text-xl md:text-3xl font-black ${isLime ? 'text-lime-400 drop-shadow-[0_0_8px_rgba(163,230,53,0.55)]' : 'text-white'} font-mono select-none z-20`}>
      {digit}
    </span>
  </div>
);

const DigitGroup = ({ value, label, length = 2, isLime = false }) => {
  const digits = String(value).padStart(length, "0").split("");
  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-1">
        {digits.map((digit, idx) => (
          <DigitSlot key={idx} digit={digit} isLime={isLime} />
        ))}
      </div>
      <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-slate-400 font-extrabold mt-2">
        {label}
      </span>
    </div>
  );
};

const GroupSeparator = () => (
  <div className="flex items-center justify-center h-10 sm:h-14 md:h-16 px-1 sm:px-1.5">
    <span className="text-sm sm:text-lg font-black text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.65)] animate-pulse">·</span>
  </div>
);

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isTVMode = isAndroidTV();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tvLoginFocusIndex, setTVLoginFocusIndex] = useState(0);

  const tvLoginRefs = useRef([]);
  const usernameInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState({
    dias: 0,
    horas: 0,
    minutos: 0,
    segundos: 0,
  });

  const [nextMatch, setNextMatch] = useState({
    equipo1: "México",
    equipo2: "Sudáfrica",
    fecha: "11 de Junio, 2026",
    hora: "14:00",
    estado: "PRÓXIMO",
    goles1: 0,
    goles2: 0
  });

  // Cargar el partido más próximo desde el backend
  useEffect(() => {
    async function loadNextMatch() {
      try {
        const response = await axiosInstance.get("/api/worldcup/public/next-match");
        if (response.data) {
          setNextMatch(response.data);
        }
      } catch (error) {
        console.error("Error al cargar el próximo partido:", error);
      }
    }
    loadNextMatch();
  }, []);

  // Cuenta regresiva exacta al 11 de Junio, 2026 a las 14:00 (Hora del partido inaugural)
  useEffect(() => {
    const targetDate = new Date("June 11, 2026 14:00:00").getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        setTimeLeft({ dias: 0, horas: 0, minutos: 0, segundos: 0 });
      } else {
        const dias = Math.floor(difference / (1000 * 60 * 60 * 24));
        const horas = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutos = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ dias, horas, minutos, segundos });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const performLogin = async () => {
    setLoginError("");
    setIsLoggingIn(true);
    try {
      await login({ username, password });
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    } catch (err) {
      setLoginError(err.message || "Error al iniciar sesión");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await performLogin();
  };

  useEffect(() => {
    if (!isTVMode) return undefined;

    const timer = setTimeout(() => {
      focusElementWithoutScroll(tvLoginRefs.current[tvLoginFocusIndex]);
    }, 100);

    const handleTVLoginKeyDown = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      const action = resolveTVLoginAction(event);
      if (!action) return;

      event.preventDefault();
      event.stopPropagation();

      if (action === "ArrowUp") {
        setTVLoginFocusIndex((current) => Math.max(0, current - 1));
        return;
      }

      if (action === "ArrowDown") {
        setTVLoginFocusIndex((current) => Math.min(TV_LOGIN_FOCUSABLE_COUNT - 1, current + 1));
        return;
      }

      if (action === "ArrowLeft") {
        if (tvLoginFocusIndex === 5) {
          setTVLoginFocusIndex(4);
          return;
        }
        if (tvLoginFocusIndex === 1 && showPassword && !isLoggingIn) {
          setShowPassword(false);
        }
        return;
      }

      if (action === "ArrowRight") {
        if (tvLoginFocusIndex === 4) {
          setTVLoginFocusIndex(5);
          return;
        }
        if (tvLoginFocusIndex === 1 && !showPassword && !isLoggingIn) {
          setShowPassword(true);
        }
        return;
      }

      if (action !== "Enter" || isLoggingIn) return;

      if (tvLoginFocusIndex === 0) {
        activateTextInput(usernameInputRef.current);
        return;
      }

      if (tvLoginFocusIndex === 1) {
        activateTextInput(passwordInputRef.current);
        return;
      }

      tvLoginRefs.current[tvLoginFocusIndex]?.click?.();
    };

    window.addEventListener("keydown", handleTVLoginKeyDown, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleTVLoginKeyDown, true);
    };
  }, [isLoggingIn, isTVMode, showPassword, tvLoginFocusIndex]);

  useEffect(() => {
    if (isTVMode && tvLoginRefs.current[tvLoginFocusIndex]) {
      focusElementWithoutScroll(tvLoginRefs.current[tvLoginFocusIndex]);
    }
  }, [tvLoginFocusIndex, isTVMode]);

  const setTVLoginRef = (index, node) => {
    tvLoginRefs.current[index] = node;
  };

  const getTVLoginFocusClasses = (index, baseClasses = "") => {
    if (!isTVMode) return baseClasses;
    if (tvLoginFocusIndex === index) {
      return `${baseClasses} ring-2 ring-amber-400 ring-offset-2 ring-offset-black scale-[1.02] border-amber-400/50 shadow-[0_0_25px_rgba(251,191,36,0.4)]`;
    }
    return baseClasses;
  };

  return (
    <>
      <style>{`
        .stadium-bg-custom {
          background-color: #03010b;
          background-image: 
            linear-gradient(to bottom, rgba(3, 1, 10, 0.45), rgba(3, 1, 10, 0.96)),
            url("./fondo_mundial.png");
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
        }

        .double-bezel-outer-custom {
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(13, 8, 30, 0.65);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          box-shadow: 
            0 0 0 1px rgba(255, 255, 255, 0.02) inset,
            0 24px 60px -15px rgba(0, 0, 0, 0.9);
        }

        .double-bezel-inner-custom {
          background: rgba(4, 2, 10, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.03);
        }

        .logo-glow-pink {
          filter: drop-shadow(0 0 25px rgba(217, 70, 239, 0.45));
        }

        .logo-glow-combined {
          filter: drop-shadow(0 0 15px rgba(250, 204, 21, 0.85)) drop-shadow(0 0 35px rgba(217, 70, 239, 0.6));
        }

        @keyframes float-wizard-hat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(1.5deg); }
        }
        .float-wizard-hat-animation {
          animation: float-wizard-hat 5.5s ease-in-out infinite;
        }

        /* Bloque Flip de la Cuenta Regresiva */
        .countdown-flip-box {
          background: rgba(15, 11, 28, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 
            0 8px 16px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.03) inset;
        }

        .countdown-divider {
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 1px;
          background: rgba(255, 255, 255, 0.06);
        }
      `}</style>

      <div 
        className={`min-h-screen flex ${isTVMode ? 'flex-row' : 'flex-col lg:flex-row'} items-center justify-center p-4 md:p-8 lg:p-12 relative overflow-hidden select-none`}
        style={{
          backgroundColor: "#03010b",
          backgroundImage: "linear-gradient(to bottom, rgba(3, 1, 10, 0.45), rgba(3, 1, 10, 0.96)), url('./fondo_mundial.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed"
        }}
      >
        
        {/* PANEL IZQUIERDO: CONTENIDO DE BIENVENIDA Y CUENTA REGRESIVA */}
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 lg:p-8 max-w-2xl z-10">
          
          {/* Sombrero de Mago Flotante */}
          <div className="relative flex items-center justify-center h-48 md:h-60 w-full mb-6 float-wizard-hat-animation select-none">
            <img
              src="./logo-teamg.png"
              alt="Logo de TeamG Play"
              className="h-36 md:h-48 object-contain logo-glow-combined"
            />
          </div>

          {/* Titular Copa del Mundo */}
          <div className="mb-6 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-1">
              <svg viewBox="0 0 100 100" className="w-6 h-6 drop-shadow-[0_0_10px_rgba(250,204,21,0.7)]">
                <path d="M50 15 C54 15 57 18 56 22 C55 24 53 26 51 28 C55 29 59 32 58 37 C57 41 54 44 50 45 C46 44 43 41 42 37 C41 32 45 29 49 28 C47 26 45 24 44 22 C43 18 46 15 50 15 Z" fill="#FACC15" />
                <path d="M42 37 C42 45 40 48 45 58 C47 62 47 68 45 74 C43 78 40 80 38 82 L62 82 C60 80 57 78 55 74 C53 68 53 62 55 58 C60 48 58 45 58 37 Z" fill="#EAB308" />
                <rect x="42" y="82" width="16" height="4" fill="#10B981" rx="1" />
                <rect x="40" y="86" width="20" height="4" fill="#FACC15" rx="1" />
              </svg>
              <span className="text-2xl md:text-3xl font-black text-white tracking-widest flex items-center gap-1.5">
                <span className="text-[#3b82f6] drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]">U</span>
                <span className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]">S</span>
                <span className="text-[#ef4444] drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]">A</span>
                <span className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)] ml-1">2026</span>
              </span>
            </div>
            <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.25em] text-slate-400">
              La Copa del Mundo está por comenzar
            </p>
          </div>

          {/* CAJA DE CUENTA REGRESIVA AL ESTILO OFICIAL FIFA 2026 */}
          <div className="w-full max-w-md border border-indigo-500/10 bg-[#0d0722]/50 backdrop-blur-xl rounded-3xl p-5 md:p-6 mb-5 shadow-2xl relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full bg-[#1b103c] border border-indigo-500/20 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.25)]">
              Faltan
            </div>
            
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 mt-2">
              <DigitGroup value={timeLeft.dias} label="Días" length={timeLeft.dias >= 100 ? 3 : 2} />
              <GroupSeparator />
              <DigitGroup value={timeLeft.horas} label="Horas" length={2} />
              <GroupSeparator />
              <DigitGroup value={timeLeft.minutos} label="Minutos" length={2} />
              <GroupSeparator />
              <DigitGroup value={timeLeft.segundos} label="Segundos" length={2} isLime={true} />
            </div>
          </div>

          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5">
            Vive cada partido. Cada momento. En TeamG Play.
          </p>

          {/* INFORMACIÓN ADICIONAL DE PARTIDOS DEBAJO DEL CONTADOR */}
          <div className="w-full max-w-md bg-[#0e0725]/45 backdrop-blur-xl border border-white/5 rounded-2xl p-4 mb-6 shadow-2xl text-center">
            <div className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-lime-400 flex items-center justify-center gap-1">
              🏆 TODOS LOS 104 PARTIDOS EN VIVO
            </div>
            
            <div className="border-t border-white/10 my-2.5"></div>
            
            <div>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] mb-1.5 flex items-center justify-center gap-1">
                ⚽ {nextMatch.estado === "EN VIVO" ? "PARTIDO EN VIVO" : "PRÓXIMO PARTIDO"}
              </div>
              <div className="text-sm font-black text-white flex items-center justify-center gap-3">
                <div className="flex items-center gap-1.5">
                  <img
                    src={getFlagUrl(nextMatch.equipo1)}
                    alt={nextMatch.equipo1}
                    className="w-5 h-3.5 object-cover rounded-sm border border-white/5"
                    onError={(e) => { e.currentTarget.src = "https://flagcdn.com/w40/un.png"; }}
                  />
                  <span>{nextMatch.equipo1}</span>
                </div>
                <span className="text-slate-400 text-xs font-extrabold">
                  {nextMatch.estado === "EN VIVO" ? `${nextMatch.goles1 || 0} - ${nextMatch.goles2 || 0}` : "vs"}
                </span>
                <div className="flex items-center gap-1.5">
                  <img
                    src={getFlagUrl(nextMatch.equipo2)}
                    alt={nextMatch.equipo2}
                    className="w-5 h-3.5 object-cover rounded-sm border border-white/5"
                    onError={(e) => { e.currentTarget.src = "https://flagcdn.com/w40/un.png"; }}
                  />
                  <span>{nextMatch.equipo2}</span>
                </div>
              </div>
              <div className="text-[11px] text-lime-400 font-bold mt-1 tracking-wider uppercase">
                {nextMatch.fecha} - {nextMatch.hora}
              </div>
            </div>
          </div>

          {/* Menú de Categorías de Deportes al pie */}
          <div className="grid grid-cols-4 gap-2 w-full max-w-md pt-2 border-t border-white/5">
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-1">
                <SoccerBallIcon className="w-4 h-4 text-cyan-400" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Partidos en Vivo</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-1">
                <Trophy className="w-4 h-4 text-rose-500" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Torneos Exclusivos</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-1">
                <PlayCircle className="w-4 h-4 text-cyan-400" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Contenido On Demand</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-1">
                <Users className="w-4 h-4 text-rose-500" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Comunidad Global</span>
            </div>
          </div>

        </div>

        {/* PANEL DERECHO: FORMULARIO DE INICIO DE SESIÓN DE CRISTAL */}
        <div className="flex-1 w-full max-w-md p-2 lg:p-4 z-10">
          
          <div className="double-bezel-outer-custom rounded-[2.5rem] p-1.5 md:p-2 custom-spring-transition">
            <div className="double-bezel-inner-custom rounded-[calc(2.5rem-0.5rem)] p-6 md:p-8">
              
              <div className="text-center mb-6">
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  Iniciar Sesión
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Accede a tu cuenta para continuar viendo tu contenido.
                </p>
              </div>

              {loginError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl p-3 mb-6 text-center text-sm">
                  ⚠️ {loginError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                {/* Usuario */}
                <div
                  ref={(node) => setTVLoginRef(0, node)}
                  className={`rounded-xl p-0.5 custom-spring-transition-fast ${getTVLoginFocusClasses(0, "")}`}
                >
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                    Usuario
                  </label>
                  <input
                    ref={usernameInputRef}
                    type="text"
                    placeholder="Tu nombre de usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => isTVMode && setTVLoginFocusIndex(0)}
                    className="w-full rounded-lg px-4 py-3 bg-black/60 border border-white/10 text-white placeholder-slate-500 transition-all duration-300 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    disabled={isLoggingIn}
                    autoComplete="username"
                    required
                  />
                </div>

                {/* Contraseña */}
                <div
                  ref={(node) => setTVLoginRef(1, node)}
                  className={`rounded-xl p-0.5 custom-spring-transition-fast ${getTVLoginFocusClasses(1, "")}`}
                >
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      ref={passwordInputRef}
                      type={showPassword ? "text" : "password"}
                      placeholder="Tu contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => isTVMode && setTVLoginFocusIndex(1)}
                      className="w-full rounded-lg px-4 py-3 bg-black/60 border border-white/10 text-white placeholder-slate-500 transition-all duration-300 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 pr-10"
                      disabled={isLoggingIn}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors"
                      disabled={isLoggingIn}
                      tabIndex="-1"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="mt-2 text-right">
                    <Link
                      to="/forgot-password"
                      className="text-xs text-slate-400 hover:text-cyan-300 transition-colors inline-block"
                      tabIndex={isTVMode ? -1 : undefined}
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                </div>

                {/* Botón Entrar */}
                <div
                  ref={(node) => setTVLoginRef(2, node)}
                  className={`rounded-xl p-0.5 mt-2 custom-spring-transition-fast ${getTVLoginFocusClasses(2, "")}`}
                >
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    onFocus={() => isTVMode && setTVLoginFocusIndex(2)}
                    className="w-full relative group overflow-hidden rounded-lg py-3.5 text-black font-black text-sm tracking-widest uppercase transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.45)]"
                    style={{
                      background: isLoggingIn
                        ? "#4b5563"
                        : "linear-gradient(90deg, #f59e0b, #ea580c)",
                    }}
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                        <span className="text-white">Procesando...</span>
                      </>
                    ) : (
                      <span className="text-slate-950 font-black">
                        Entrar
                      </span>
                    )}
                  </button>
                </div>
              </form>

              {/* Registro */}
              <p className="mt-6 text-center text-sm text-slate-400">
                ¿No tienes cuenta?{" "}
                <Link
                  ref={(node) => setTVLoginRef(3, node)}
                  to="/register"
                  className={`font-semibold text-lime-400 hover:text-lime-300 transition-colors p-1 rounded ${getTVLoginFocusClasses(3, "")}`}
                  onFocus={() => isTVMode && setTVLoginFocusIndex(3)}
                >
                  Regístrate aquí
                </Link>
              </p>

              {/* Descargar Aplicación */}
              <div className="mt-8 border-t border-white/10 pt-6">
                <h3 className="mb-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Descargar la aplicación
                </h3>
                <div className="flex flex-row justify-center gap-3">
                  <a
                    ref={(node) => setTVLoginRef(4, node)}
                    href="https://teamg.store/teamgplay-desktop.exe"
                    download="teamgplay-desktop.exe"
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 px-3 text-white transition-all duration-300 hover:bg-white/10 hover:border-cyan-400/30 ${getTVLoginFocusClasses(4, "")}`}
                    onFocus={() => isTVMode && setTVLoginFocusIndex(4)}
                  >
                    <Laptop className="h-4 w-4 text-cyan-400" />
                    <span className="font-extrabold text-[10px] uppercase tracking-wider">Windows</span>
                  </a>
                  <a
                    ref={(node) => setTVLoginRef(5, node)}
                    href="https://teamg.store/teamgplay.apk"
                    download="teamgplay.apk"
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 px-3 text-white transition-all duration-300 hover:bg-white/10 hover:border-fuchsia-400/30 ${getTVLoginFocusClasses(5, "")}`}
                    onFocus={() => isTVMode && setTVLoginFocusIndex(5)}
                  >
                    <Smartphone className="h-4 w-4 text-fuchsia-400" />
                    <span className="font-extrabold text-[10px] uppercase tracking-wider">Android</span>
                  </a>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </>
  );
}

export default Login;
