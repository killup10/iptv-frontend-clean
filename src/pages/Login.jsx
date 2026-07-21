import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { isAndroidTV } from "../utils/platformUtils.js";
import { Laptop, Smartphone, Eye, EyeOff, Loader2 } from "lucide-react";

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
      return `${baseClasses} ring-2 ring-cyan-400 ring-offset-2 ring-offset-black scale-[1.02] border-cyan-400/60 shadow-[0_0_25px_rgba(34,211,238,0.4)]`;
    }
    return baseClasses;
  };

  return (
    <>
      <style>{`
        .classic-bg-custom {
          background-color: #03010b;
          background-image: 
            linear-gradient(to bottom, rgba(3, 1, 10, 0.45), rgba(3, 1, 10, 0.92)),
            url("./fondo.png");
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
        }

        .double-bezel-outer-custom {
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(13, 8, 30, 0.7);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          box-shadow: 
            0 0 0 1px rgba(255, 255, 255, 0.02) inset,
            0 24px 60px -15px rgba(0, 0, 0, 0.9);
        }

        .double-bezel-inner-custom {
          background: rgba(4, 2, 10, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.03);
        }

        .logo-glow-large {
          filter: drop-shadow(0 0 25px rgba(6, 182, 212, 0.45)) drop-shadow(0 0 45px rgba(168, 85, 247, 0.35));
        }

        @keyframes float-logo {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .float-logo-animation {
          animation: float-logo 5s ease-in-out infinite;
        }
      `}</style>

      <div 
        className={`min-h-screen flex ${isTVMode ? 'flex-row' : 'flex-col lg:flex-row'} items-center justify-center p-4 md:p-8 lg:p-12 relative overflow-hidden select-none classic-bg-custom`}
      >
        
        {/* PANEL IZQUIERDO: LOGO DESTACADO Y BIENVENIDA (SIN ICONOS SECUNDARIOS) */}
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 lg:p-8 max-w-2xl z-10">
          
          {/* Logo Principal Gigante de TeamG Play */}
          <div className="relative flex items-center justify-center h-80 sm:h-[28rem] md:h-[34rem] w-full mb-4 float-logo-animation select-none">
            <img
              src="./logo-teamg.png"
              alt="TeamG Play"
              className="h-72 sm:h-[26rem] md:h-[32rem] max-h-[70vh] object-contain logo-glow-large transition-transform duration-300 hover:scale-105"
            />
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-2">
            Bienvenido a <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-pink-500">TeamG Play</span>
          </h1>

          <p className="text-sm md:text-base text-slate-300 max-w-md font-medium leading-relaxed">
            Tu plataforma de entretenimiento. Accede a tu cuenta para continuar disfrutando de tu contenido favorito.
          </p>
        </div>

        {/* PANEL DERECHO: FORMULARIO DE INICIO DE SESIÓN */}
        <div className="w-full max-w-md z-10">
          <div className="double-bezel-outer-custom rounded-3xl p-2 md:p-3 shadow-2xl">
            <div className="double-bezel-inner-custom rounded-[calc(1.5rem-0.25rem)] p-6 md:p-8">
              
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
                    className="w-full rounded-xl px-4 py-3 bg-black/60 border border-white/10 text-white placeholder-slate-500 transition-all duration-300 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
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
                      className="w-full rounded-xl px-4 py-3 bg-black/60 border border-white/10 text-white placeholder-slate-500 transition-all duration-300 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 pr-10"
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
                    className="w-full relative group overflow-hidden rounded-xl py-3.5 text-white font-black text-sm tracking-widest uppercase transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
                    style={{
                      background: isLoggingIn
                        ? "#4b5563"
                        : "linear-gradient(90deg, #06b6d4, #a855f7)",
                    }}
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                        <span className="text-white">Procesando...</span>
                      </>
                    ) : (
                      <span className="text-white font-black">
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
                  className={`font-semibold text-cyan-400 hover:text-cyan-300 transition-colors p-1 rounded ${getTVLoginFocusClasses(3, "")}`}
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
