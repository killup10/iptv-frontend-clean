import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { isAndroidTV } from "../utils/platformUtils.js";
import { requestDeviceCode, checkDeviceCode } from "../utils/AuthService.js";
import { Laptop, Smartphone, Tv, Copy, CheckCheck, Eye, EyeOff, Loader2, Trash2, X, AlertTriangle, RefreshCw, Check } from "lucide-react";

const getDeviceIcon = (device) => {
  const type = (device?.deviceType || '').toLowerCase();
  const ua = (device?.browser || device?.userAgent || '').toLowerCase();

  if (type === 'tv' || ua.includes('tv') || ua.includes('smart-tv') || ua.includes('tizen')) {
    return <Tv className="w-6 h-6 text-cyan-400 shrink-0" />;
  }
  if (type === 'mobile' || type === 'tablet' || ua.includes('mobi') || ua.includes('android') || ua.includes('iphone')) {
    return <Smartphone className="w-6 h-6 text-fuchsia-400 shrink-0" />;
  }
  return <Laptop className="w-6 h-6 text-emerald-400 shrink-0" />;
};

const TV_LOGIN_FOCUSABLE_COUNT = 7;

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
  const { user, isLoadingAuth, login, loginWithCode, loginWithSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isTVMode = isAndroidTV();

  useEffect(() => {
    if (!isLoadingAuth && user) {
      const from = location.state?.from?.pathname || (isTVMode ? "/" : "/home");
      navigate(from, { replace: true });
    }
  }, [user, isLoadingAuth, navigate, location.state, isTVMode]);

  const [authMode, setAuthMode] = useState("credentials"); // "credentials" (2 disp) | "code" (1 disp)
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tvLoginFocusIndex, setTVLoginFocusIndex] = useState(0);
  const [deviceModalFocusIndex, setDeviceModalFocusIndex] = useState(0);

  // Estados para el código que le sale al cliente en pantalla
  const [clientDeviceCode, setClientDeviceCode] = useState("");
  const [clientFormattedCode, setClientFormattedCode] = useState("");
  const [isLoadingDeviceCode, setIsLoadingDeviceCode] = useState(false);
  const [copiedDeviceCode, setCopiedDeviceCode] = useState(false);
  const [isCheckingDeviceCode, setIsCheckingDeviceCode] = useState(false);
  const [showManualCodeInput, setShowManualCodeInput] = useState(false);

  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [activeDevicesList, setActiveDevicesList] = useState([]);
  const [maxDevicesAllowed, setMaxDevicesAllowed] = useState(2);
  const [unlinkingDeviceId, setUnlinkingDeviceId] = useState(null);

  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyDownloaderCode = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    navigator.clipboard.writeText("3895210");
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const tvLoginRefs = useRef([]);
  const usernameInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const codeInputRef = useRef(null);

  const fetchDevicePairCode = async () => {
    setIsLoadingDeviceCode(true);
    setLoginError("");
    try {
      const res = await requestDeviceCode();
      if (res?.code) {
        setClientDeviceCode(res.code);
        setClientFormattedCode(res.formattedCode || `${res.code.slice(0, 3)} ${res.code.slice(3)}`);
      } else if (res?.error || res?.message) {
        throw new Error(res.error || res.message);
      }
    } catch (err) {
      console.error("Error al obtener código de dispositivo:", err);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "No se pudo obtener el código del dispositivo. Revisa tu conexión a internet.";
      if (authMode === "code") {
        setLoginError(msg);
      }
    } finally {
      setIsLoadingDeviceCode(false);
    }
  };

  // Pre-cargar el código de vinculación en segundo plano desde el montaje
  useEffect(() => {
    if (!clientDeviceCode && !isLoadingDeviceCode) {
      fetchDevicePairCode();
    }
  }, []);

  // Solicitar código del dispositivo automáticamente al entrar al modo "code" si aún no se tiene
  useEffect(() => {
    if (authMode === "code" && !clientDeviceCode && !isLoadingDeviceCode && !showManualCodeInput) {
      fetchDevicePairCode();
    }
  }, [authMode, clientDeviceCode, showManualCodeInput]);

  // Polling automático cada 3s esperando que el admin active este código
  useEffect(() => {
    if (authMode !== "code" || !clientDeviceCode || showManualCodeInput) {
      return undefined;
    }

    let isMounted = true;
    const intervalId = setInterval(async () => {
      try {
        const res = await checkDeviceCode(clientDeviceCode);
        if (!isMounted) return;
        if (res?.status === "activated" && res.token && res.user) {
          clearInterval(intervalId);
          setIsLoggingIn(true);
          await loginWithSession(res.token, res.user);
          const from = location.state?.from?.pathname || (isTVMode ? "/" : "/home");
          navigate(from, { replace: true });
        }
      } catch (err) {
        // Ignorar errores de red transitorios durante el polling
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [authMode, clientDeviceCode, showManualCodeInput, loginWithSession, location.state, isTVMode, navigate]);

  const handleCopyClientCode = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!clientDeviceCode) return;
    navigator.clipboard.writeText(clientDeviceCode);
    setCopiedDeviceCode(true);
    setTimeout(() => setCopiedDeviceCode(false), 2500);
  };

  const handleManualCheckDeviceCode = async () => {
    if (!clientDeviceCode) return;
    setIsCheckingDeviceCode(true);
    setLoginError("");
    try {
      const res = await checkDeviceCode(clientDeviceCode);
      if (res?.status === "activated" && res.token && res.user) {
        setIsLoggingIn(true);
        await loginWithSession(res.token, res.user);
        const from = location.state?.from?.pathname || (isTVMode ? "/" : "/home");
        navigate(from, { replace: true });
      } else if (res?.status === "expired") {
        setLoginError("El código anterior ha expirado. Solicitando uno nuevo...");
        fetchDevicePairCode();
      } else {
        setLoginError("Tu dispositivo aún no ha sido activado por tu proveedor. Por favor envíale tu código.");
      }
    } catch (err) {
      setLoginError("Error al comprobar la activación. Intenta nuevamente.");
    } finally {
      setIsCheckingDeviceCode(false);
    }
  };

  const performLogin = async (unlinkId = null) => {
    setLoginError("");
    if (unlinkId) {
      setUnlinkingDeviceId(unlinkId);
    } else {
      setIsLoggingIn(true);
    }
    try {
      await login({ username, password, unlinkDeviceId: unlinkId });
      setShowDeviceModal(false);
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    } catch (err) {
      const responseData = err.response?.data;
      if (
        err.response?.status === 403 &&
        (responseData?.code === "DEVICE_LIMIT_REACHED" ||
          responseData?.devices ||
          responseData?.deviceList ||
          responseData?.error?.includes("Limite de dispositivos") ||
          responseData?.error?.includes("Límite de dispositivos"))
      ) {
        const list = responseData?.devices || responseData?.deviceList || [];
        setActiveDevicesList(list);
        setMaxDevicesAllowed(responseData?.maxDevices || 2);
        setDeviceModalFocusIndex(0);
        setShowDeviceModal(true);
        setLoginError("");
        return;
      }

      if (err.response?.status === 426 || responseData?.code === "UPDATE_REQUIRED") {
        window.dispatchEvent(
          new CustomEvent("teamg-update-required", {
            detail: {
              latestVersion: responseData?.latestVersion || "1.5.11",
              error: responseData?.error || "Nueva versión disponible. Por favor actualiza para continuar.",
              url: responseData?.url || (isTVMode ? "https://teamg.store/teamgplay2TV.apk" : "https://teamg.store/teamgplay.apk"),
              force: true,
            },
          })
        );
        setLoginError("");
        return;
      }

      setLoginError(err.message || "Error al iniciar sesión");
    } finally {
      setIsLoggingIn(false);
      setUnlinkingDeviceId(null);
    }
  };

  const performCodeLogin = async () => {
    const clean = String(activationCode || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
    if (clean.length < 4) {
      setLoginError("Ingresa tu código de activación de 6 caracteres.");
      return;
    }
    setLoginError("");
    setIsLoggingIn(true);
    try {
      await loginWithCode(clean);
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    } catch (err) {
      setLoginError(err.message || "Código de activación inválido.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (authMode === "code") {
      await performCodeLogin();
    } else {
      await performLogin();
    }
  };

  useEffect(() => {
    if (!isTVMode) return undefined;

    const timer = setTimeout(() => {
      focusElementWithoutScroll(tvLoginRefs.current[tvLoginFocusIndex]);
    }, 100);

    const handleTVLoginKeyDown = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      if (showDeviceModal) {
        const action = resolveTVLoginAction(event);
        const isBack = event.key === "Escape" || event.key === "Backspace" || event.keyCode === 4 || event.keyCode === 27;
        if (isBack) {
          event.preventDefault();
          event.stopPropagation();
          setShowDeviceModal(false);
          return;
        }
        if (!action) return;
        event.preventDefault();
        event.stopPropagation();
        const maxModalIdx = activeDevicesList.length; // 0..length-1 = devices, length = Cancelar
        if (action === "ArrowUp") {
          setDeviceModalFocusIndex((prev) => Math.max(0, prev - 1));
        } else if (action === "ArrowDown") {
          setDeviceModalFocusIndex((prev) => Math.min(maxModalIdx, prev + 1));
        } else if (action === "Enter" && !isLoggingIn && unlinkingDeviceId === null) {
          if (deviceModalFocusIndex < activeDevicesList.length) {
            const dev = activeDevicesList[deviceModalFocusIndex];
            if (dev?.deviceId) performLogin(dev.deviceId);
          } else {
            setShowDeviceModal(false);
          }
        }
        return;
      }

      const action = resolveTVLoginAction(event);
      if (!action) return;

      event.preventDefault();
      event.stopPropagation();

      if (action === "ArrowUp") {
        setTVLoginFocusIndex((current) => {
          if (authMode === "code" && current === 2) return 0;
          return Math.max(-1, current - 1);
        });
        return;
      }

      if (action === "ArrowDown") {
        setTVLoginFocusIndex((current) => {
          if (current === -1) return 0;
          if (authMode === "code" && current === 0) return 2;
          return Math.min(TV_LOGIN_FOCUSABLE_COUNT - 1, current + 1);
        });
        return;
      }

      if (action === "ArrowLeft") {
        if (tvLoginFocusIndex === -1) {
          setAuthMode("credentials");
          setLoginError("");
          return;
        }
        if (tvLoginFocusIndex === 5) {
          setTVLoginFocusIndex(4);
          return;
        }
        if (tvLoginFocusIndex === 6) {
          setTVLoginFocusIndex(5);
          return;
        }
        if (authMode === "credentials" && tvLoginFocusIndex === 1 && showPassword && !isLoggingIn) {
          setShowPassword(false);
        }
        return;
      }

      if (action === "ArrowRight") {
        if (tvLoginFocusIndex === -1) {
          setAuthMode("code");
          setLoginError("");
          return;
        }
        if (tvLoginFocusIndex === 4) {
          setTVLoginFocusIndex(5);
          return;
        }
        if (tvLoginFocusIndex === 5) {
          setTVLoginFocusIndex(6);
          return;
        }
        if (authMode === "credentials" && tvLoginFocusIndex === 1 && !showPassword && !isLoggingIn) {
          setShowPassword(true);
        }
        return;
      }

      if (action !== "Enter" || isLoggingIn) return;

      if (tvLoginFocusIndex === -1) {
        setAuthMode((prev) => (prev === "credentials" ? "code" : "credentials"));
        setLoginError("");
        return;
      }

      if (tvLoginFocusIndex === 0) {
        if (authMode === "code") {
          activateTextInput(codeInputRef.current);
        } else {
          activateTextInput(usernameInputRef.current);
        }
        return;
      }

      if (tvLoginFocusIndex === 1 && authMode === "credentials") {
        activateTextInput(passwordInputRef.current);
        return;
      }

      if (tvLoginFocusIndex === 2) {
        if (authMode === "code") {
          performCodeLogin();
        } else {
          performLogin();
        }
        return;
      }

      tvLoginRefs.current[tvLoginFocusIndex]?.click?.();
    };

    window.addEventListener("keydown", handleTVLoginKeyDown, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleTVLoginKeyDown, true);
    };
  }, [
    activeDevicesList,
    authMode,
    activationCode,
    deviceModalFocusIndex,
    isLoggingIn,
    isTVMode,
    showDeviceModal,
    showPassword,
    tvLoginFocusIndex,
    unlinkingDeviceId,
    username,
    password,
  ]);

  useEffect(() => {
    if (isTVMode && tvLoginRefs.current[tvLoginFocusIndex]) {
      focusElementWithoutScroll(tvLoginRefs.current[tvLoginFocusIndex]);
    }
  }, [tvLoginFocusIndex, isTVMode, authMode]);

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
        className={`min-h-screen flex ${isTVMode ? 'flex-row' : 'flex-col lg:flex-row'} items-center justify-center p-3 sm:p-6 md:p-8 lg:p-12 relative overflow-hidden select-none classic-bg-custom`}
      >
        
        {/* PANEL IZQUIERDO: LOGO DESTACADO Y BIENVENIDA */}
        <div className="flex-1 flex flex-col items-center justify-center text-center p-2 sm:p-4 lg:p-8 max-w-2xl z-10">
          
          {/* Logo Principal Gigante de TeamG Play */}
          <div className="relative flex items-center justify-center h-28 sm:h-48 md:h-72 lg:h-[28rem] w-full mb-2 sm:mb-4 float-logo-animation select-none">
            <img
              src="./logo-teamg.png"
              alt="TeamG Play"
              className="h-24 sm:h-44 md:h-64 lg:h-[26rem] max-h-[30vh] lg:max-h-[70vh] object-contain logo-glow-large transition-transform duration-300 hover:scale-105"
            />
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white tracking-tight mb-1 sm:mb-2">
            Bienvenido a <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-pink-500">TeamG Play</span>
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-slate-300 max-w-md font-medium leading-relaxed">
            Tu plataforma de entretenimiento. Accede a tu cuenta o activa tu dispositivo con código para comenzar.
          </p>
        </div>

        {/* PANEL DERECHO: FORMULARIO DE INICIO DE SESIÓN / ACTIVACIÓN POR CÓDIGO */}
        <div className="w-full max-w-md z-10">
          <div className="double-bezel-outer-custom rounded-3xl p-2 md:p-3 shadow-2xl">
            <div className="double-bezel-inner-custom rounded-[calc(1.5rem-0.25rem)] p-6 md:p-8">
              
              <div className="text-center mb-5">
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  {authMode === "code" ? "Activar con Código" : "Iniciar Sesión"}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {authMode === "code"
                    ? "Activa tu dispositivo proporcionando el código que aparece en pantalla."
                    : "Accede con tu usuario y contraseña."}
                </p>
              </div>

              {/* Selector de Modo: Usuario/Clave vs Activar por Código */}
              <div
                ref={(node) => setTVLoginRef(-1, node)}
                className={`grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-black/70 border border-white/10 mb-5 ${getTVLoginFocusClasses(-1, "")}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("credentials");
                    setLoginError("");
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    authMode === "credentials"
                      ? "bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.35)]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  🔑 Usuario y Clave
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("code");
                    setLoginError("");
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    authMode === "code"
                      ? "bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white shadow-[0_0_15px_rgba(217,70,239,0.35)]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  ⚡ Activar por Código
                </button>
              </div>

              {loginError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl p-3 mb-5 text-center text-sm">
                  ⚠️ {loginError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                {authMode === "code" && !showManualCodeInput ? (
                  <div className="space-y-4">
                    <div className="p-5 rounded-2xl bg-black/80 border border-cyan-500/40 text-center shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 mb-2 uppercase tracking-wider">
                        ⚡ Código de Activación
                      </div>

                      <h3 className="text-sm font-bold text-slate-200 mt-1">
                        Tu Código de Activación:
                      </h3>

                      <div className="my-3 py-3 px-4 rounded-xl bg-slate-950/90 border-2 border-cyan-400/60 shadow-[0_0_30px_rgba(34,211,238,0.25)] flex items-center justify-center">
                        {isLoadingDeviceCode ? (
                          <div className="flex items-center gap-2 text-cyan-300 py-1">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm font-semibold">Generando código...</span>
                          </div>
                        ) : (
                          <span className="font-mono text-3xl sm:text-4xl font-black text-cyan-300 tracking-[0.25em]">
                            {clientFormattedCode || "--- ---"}
                          </span>
                        )}
                      </div>

                      {/* Estado con pulso animado */}
                      <div className="flex items-center justify-center gap-2 my-2 text-xs text-slate-300">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                        </span>
                        <span className="font-semibold text-slate-300">Esperando que tu proveedor active este código...</span>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed max-w-sm mx-auto mt-2">
                        Pásale este código a tu proveedor de TeamG Play (por WhatsApp o soporte). En cuanto lo active en el sistema, esta pantalla entrará automáticamente a tu contenido.
                      </p>

                      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={handleCopyClientCode}
                          disabled={!clientDeviceCode}
                          className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                        >
                          {copiedDeviceCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedDeviceCode ? "¡Copiado!" : "Copiar Código"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleManualCheckDeviceCode}
                          disabled={isCheckingDeviceCode || !clientDeviceCode}
                          className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5 cursor-pointer"
                        >
                          {isCheckingDeviceCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          <span>Comprobar Estado</span>
                        </button>

                        <button
                          type="button"
                          onClick={fetchDevicePairCode}
                          disabled={isLoadingDeviceCode}
                          className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                          title="Genera otro código si el anterior expiró"
                        >
                          Nuevo Código
                        </button>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/10 text-center">
                        <button
                          type="button"
                          onClick={() => setShowManualCodeInput(true)}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                        >
                          ¿Tienes un código para ingresar manualmente? Haz clic aquí
                        </button>
                      </div>
                    </div>
                  </div>
                ) : authMode === "code" && showManualCodeInput ? (
                  <div
                    ref={(node) => setTVLoginRef(0, node)}
                    className={`rounded-xl p-0.5 custom-spring-transition-fast ${getTVLoginFocusClasses(0, "")}`}
                  >
                    <div className="flex items-center justify-between mb-1.5 ml-1">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-cyan-300">
                        Código de Activación Manual
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowManualCodeInput(false)}
                        className="text-[11px] text-slate-400 hover:text-cyan-400 underline cursor-pointer"
                      >
                        ← Volver a ver mi código
                      </button>
                    </div>
                    <input
                      ref={codeInputRef}
                      type="text"
                      placeholder="EJ: 849201"
                      maxLength={10}
                      value={activationCode}
                      onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                      onFocus={() => isTVMode && setTVLoginFocusIndex(0)}
                      className="w-full rounded-xl px-4 py-4 bg-black/80 border border-cyan-500/40 text-cyan-300 placeholder-slate-600 text-center font-mono text-2xl font-black tracking-[0.3em] uppercase transition-all duration-300 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400"
                      disabled={isLoggingIn}
                      autoComplete="off"
                      required
                    />
                    <p className="text-[11px] text-slate-400 text-center mt-2">
                      Escribe el código proporcionado por tu proveedor para activar este equipo.
                    </p>
                  </div>
                ) : (
                  <>
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
                  </>
                )}

                {/* Botón Entrar / Activar (para credenciales o ingreso manual de código) */}
                {(authMode === "credentials" || showManualCodeInput) && (
                  <div
                    ref={(node) => setTVLoginRef(2, node)}
                    className={`rounded-xl p-0.5 mt-2 custom-spring-transition-fast ${getTVLoginFocusClasses(2, "")}`}
                  >
                    <button
                      type="submit"
                      onClick={handleSubmit}
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
                          {authMode === "code" ? "Activar Dispositivo" : "Entrar"}
                        </span>
                      )}
                    </button>
                  </div>
                )}
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
                <h3 className="mb-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Descargar la aplicación
                </h3>

                {/* Botón Principal Smart TV + Código Downloader */}
                <div className="mb-2.5">
                  <a
                    ref={(node) => setTVLoginRef(4, node)}
                    href="https://teamg.store/teamgplay2TV.apk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full flex items-center justify-between rounded-xl border border-cyan-400/40 bg-gradient-to-r from-cyan-950/60 via-purple-950/40 to-black/80 py-2.5 px-3 text-white transition-all duration-300 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] ${getTVLoginFocusClasses(4, "")}`}
                    onFocus={() => isTVMode && setTVLoginFocusIndex(4)}
                  >
                    <div className="flex items-center gap-2">
                      <Tv className="h-4 w-4 text-cyan-400 shrink-0" />
                      <div className="text-left">
                        <span className="font-extrabold text-[11px] uppercase tracking-wider text-white flex items-center gap-1.5">
                          Smart TV / TV Box
                        </span>
                        <span className="text-[9px] text-slate-400 block -mt-0.5">Descargar APK Oficial</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 bg-black/70 border border-white/15 rounded-lg px-2 py-1">
                      <span className="text-[8px] uppercase font-black text-orange-400">Downloader:</span>
                      <span className="font-mono text-xs font-black text-cyan-300">3895210</span>
                      <button
                        type="button"
                        onClick={handleCopyDownloaderCode}
                        className="text-slate-400 hover:text-white p-0.5 ml-0.5"
                        title="Copiar código Downloader"
                      >
                        {copiedCode ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </a>
                </div>

                {/* Fila Secundaria: Windows & Android Móvil */}
                <div className="flex flex-row justify-center gap-2.5">
                  <a
                    ref={(node) => setTVLoginRef(5, node)}
                    href="https://teamg.store/teamgplay-desktop.exe"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2 px-3 text-white transition-all duration-300 hover:bg-white/10 hover:border-cyan-400/30 ${getTVLoginFocusClasses(5, "")}`}
                    onFocus={() => isTVMode && setTVLoginFocusIndex(5)}
                  >
                    <Laptop className="h-4 w-4 text-cyan-400" />
                    <span className="font-extrabold text-[10px] uppercase tracking-wider">Windows</span>
                  </a>
                  <a
                    ref={(node) => setTVLoginRef(6, node)}
                    href="https://teamg.store/teamgplay.apk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2 px-3 text-white transition-all duration-300 hover:bg-white/10 hover:border-fuchsia-400/30 ${getTVLoginFocusClasses(6, "")}`}
                    onFocus={() => isTVMode && setTVLoginFocusIndex(6)}
                  >
                    <Smartphone className="h-4 w-4 text-fuchsia-400" />
                    <span className="font-extrabold text-[10px] uppercase tracking-wider">Android Móvil</span>
                  </a>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* MODAL DE RESOLUCIÓN DE LÍMITE DE DISPOSITIVOS */}
      {showDeviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg double-bezel-outer-custom rounded-3xl p-2 sm:p-3 shadow-2xl border border-white/10">
            <div className="double-bezel-inner-custom rounded-[calc(1.5rem-0.25rem)] p-6 sm:p-7 max-h-[85vh] flex flex-col">
              
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                      Límite de Dispositivos
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Máximo {maxDevicesAllowed} dispositivos permitidos
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeviceModal(false)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-300 mt-4 leading-relaxed font-medium">
                Has alcanzado el límite de dispositivos simultáneos en tu cuenta. Selecciona cuál de tus dispositivos activos deseas <span className="text-rose-400 font-bold">desvincular</span> para entrar desde este equipo:
              </p>

              {/* Devices List */}
              <div className="mt-4 space-y-3 overflow-y-auto pr-1 flex-1 max-h-[45vh] custom-scrollbar">
                {activeDevicesList.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No se encontraron dispositivos activos para mostrar.
                  </div>
                ) : (
                  activeDevicesList.map((device, idx) => {
                    const isThisDeviceUnlinking = unlinkingDeviceId === device.deviceId;
                    const isDeviceFocused = isTVMode && deviceModalFocusIndex === idx;
                    return (
                      <div
                        key={device.deviceId}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl transition-all ${
                          isDeviceFocused
                            ? "bg-rose-500/15 border-2 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.35)]"
                            : "bg-white/[0.03] border border-white/10 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                            {getDeviceIcon(device)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-white truncate">
                              {device.browser || device.deviceType || "Dispositivo"}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                              {device.os && <span>{device.os}</span>}
                              {device.os && <span>•</span>}
                              <span>{device.lastSeen ? new Date(device.lastSeen).toLocaleString() : "Reciente"}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => performLogin(device.deviceId)}
                          disabled={isLoggingIn || unlinkingDeviceId !== null}
                          className={`self-end sm:self-auto px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${
                            isDeviceFocused
                              ? "bg-rose-600 text-white border border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.5)] scale-105"
                              : "bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 hover:border-rose-600 shadow-[0_0_15px_rgba(244,63,94,0.2)]"
                          }`}
                        >
                          {isThisDeviceUnlinking ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Desvinculando...</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Desvincular y Entrar</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="mt-5 pt-4 border-t border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeviceModal(false)}
                  disabled={unlinkingDeviceId !== null}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                    isTVMode && deviceModalFocusIndex === activeDevicesList.length
                      ? "text-white bg-white/20 ring-2 ring-cyan-400 scale-105"
                      : "text-slate-400 hover:text-white bg-white/5 hover:bg-white/10"
                  }`}
                >
                  Cancelar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Login;
