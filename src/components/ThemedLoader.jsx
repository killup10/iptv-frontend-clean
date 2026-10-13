import React from "react";

export const THEMED_LOADERS = {
  peliculas: {
    emoji: "🍿",
    text: "Preparando pochoclo...",
    subtext: "Cargando cartelera",
    spinnerColor: "#ef4444",
    textColor: "#fca5a5",
    bg: "radial-gradient(circle at 50% 20%, #2a0a0a 0%, #0b0614 60%, #000 100%)",
    glow: "0 0 25px rgba(239,68,68,0.45)",
  },
  movies: {
    emoji: "🍿",
    text: "Preparando pochoclo...",
    subtext: "Cargando cartelera",
    spinnerColor: "#ef4444",
    textColor: "#fca5a5",
    bg: "radial-gradient(circle at 50% 20%, #2a0a0a 0%, #0b0614 60%, #000 100%)",
    glow: "0 0 25px rgba(239,68,68,0.45)",
  },
  series: {
    emoji: "📺",
    text: "Sintonizando maratón...",
    subtext: "Cargando episodios",
    spinnerColor: "#00e5ff",
    textColor: "#67e8f9",
    bg: "radial-gradient(circle at 50% 20%, #082a33 0%, #0b0614 60%, #000 100%)",
    glow: "0 0 25px rgba(0,229,255,0.45)",
  },
  serie: {
    emoji: "📺",
    text: "Sintonizando maratón...",
    subtext: "Cargando episodios",
    spinnerColor: "#00e5ff",
    textColor: "#67e8f9",
    bg: "radial-gradient(circle at 50% 20%, #082a33 0%, #0b0614 60%, #000 100%)",
    glow: "0 0 25px rgba(0,229,255,0.45)",
  },
  animes: {
    emoji: "⛩️",
    text: "Invocando chakra...",
    subtext: "Cargando opening",
    spinnerColor: "#f472b6",
    textColor: "#f9a8d4",
    bg: "radial-gradient(circle at 50% 20%, #2b0a2e 0%, #0b0614 60%, #000 100%)",
    glow: "0 0 25px rgba(244,114,182,0.45)",
  },
  anime: {
    emoji: "⛩️",
    text: "Invocando chakra...",
    subtext: "Cargando opening",
    spinnerColor: "#f472b6",
    textColor: "#f9a8d4",
    bg: "radial-gradient(circle at 50% 20%, #2b0a2e 0%, #0b0614 60%, #000 100%)",
    glow: "0 0 25px rgba(244,114,182,0.45)",
  },
  music: {
    emoji: "🎧",
    text: "Afinando instrumentos...",
    subtext: "Subiendo volumen",
    spinnerColor: "#d946ef",
    textColor: "#e9a0f5",
    bg: "radial-gradient(circle at 50% 20%, #230a33 0%, #0b0614 60%, #000 100%)",
    glow: "0 0 25px rgba(217,70,239,0.45)",
  },
  doramas: {
    emoji: "🌸",
    text: "Preparando tu drama...",
    subtext: "Cargando emociones",
    spinnerColor: "#fb7185",
    textColor: "#fda4af",
    bg: "radial-gradient(circle at 50% 20%, #2e0a1e 0%, #0b0614 60%, #000 100%)",
    glow: "0 0 25px rgba(251,113,133,0.45)",
  },
  dorama: {
    emoji: "🌸",
    text: "Preparando tu drama...",
    subtext: "Cargando emociones",
    spinnerColor: "#fb7185",
    textColor: "#fda4af",
    bg: "radial-gradient(circle at 50% 20%, #2e0a1e 0%, #0b0614 60%, #000 100%)",
    glow: "0 0 25px rgba(251,113,133,0.45)",
  },
  novelas: {
    emoji: "🌹",
    text: "Escribiendo capítulo...",
    subtext: "Cargando pasión",
    spinnerColor: "#f43f5e",
    textColor: "#fda4af",
    bg: "radial-gradient(circle at 50% 20%, #33101a 0%, #0b0614 60%, #000 100%)",
    glow: "0 0 25px rgba(244,63,94,0.45)",
  },
  documentales: {
    emoji: "🌍",
    text: "Explorando historias...",
    subtext: "Cargando descubrimientos",
    spinnerColor: "#34d399",
    textColor: "#6ee7b7",
    bg: "radial-gradient(circle at 50% 20%, #062a22 0%, #0b0614 60%, #000 100%)",
    glow: "0 0 25px rgba(52,211,153,0.45)",
  },
  kids: {
    emoji: "🧸",
    text: "Reuniendo diversión...",
    subtext: "Cargando aventuras",
    spinnerColor: "#38bdf8",
    textColor: "#7dd3fc",
    bg: "radial-gradient(circle at 50% 20%, #0a2540 0%, #0b0614 60%, #000 100%)",
    glow: "0 0 25px rgba(56,189,248,0.45)",
  },
  halloween: {
    emoji: "🎃",
    text: "Invocando espíritus...",
    subtext: "",
    spinnerColor: "#ff6b00",
    textColor: "#fdba74",
    bg: "radial-gradient(circle at 50% 20%, #2a0a3b 0%, #0b0614 60%, #000 100%)",
    glow: "0 0 25px rgba(255,107,0,0.45)",
  },
  live: {
    emoji: "📡",
    text: "Sintonizando señal en vivo...",
    subtext: "Conectando transmisión",
    spinnerColor: "#22c55e",
    textColor: "#86efac",
    bg: "radial-gradient(circle at 50% 20%, #052e1b 0%, #0b0614 60%, #000 100%)",
    glow: "0 0 25px rgba(34,197,94,0.45)",
  },
  colecciones: {
    emoji: "📚",
    text: "Abriendo tu colección...",
    subtext: "Ordenando estantes",
    spinnerColor: "#a78bfa",
    textColor: "#c4b5fd",
    bg: "radial-gradient(circle at 50% 20%, #1c1233 0%, #0b0614 60%, #000 100%)",
    glow: "0 0 25px rgba(167,139,250,0.45)",
  },
  home: {
    emoji: null,
    text: "Cargando magia TeamG...",
    subtext: "Preparando tu inicio",
    spinnerColor: "#00e5ff",
    textColor: "#a5f3fc",
    bg: "radial-gradient(circle at 50% 20%, #0a1a33 0%, #0b0614 60%, #000 100%)",
    glow: "0 0 25px rgba(0,229,255,0.45)",
  },
  default: {
    emoji: "✨",
    text: "Cargando...",
    subtext: "",
    spinnerColor: "#00e5ff",
    textColor: "#a5f3fc",
    bg: "radial-gradient(circle at 50% 20%, #0a1a33 0%, #0b0614 60%, #000 100%)",
    glow: "0 0 25px rgba(0,229,255,0.45)",
  },
};

export const ThemedLoader = ({
  theme = "default",
  emoji,
  text,
  subtext,
  fullScreen = true,
  size = "md",
}) => {
  const cfg = THEMED_LOADERS[theme] || THEMED_LOADERS.default;
  const finalEmoji = emoji || cfg.emoji;
  const finalText = text || cfg.text;
  const finalSub = subtext !== undefined ? subtext : cfg.subtext;

  const emojiSize = size === "sm" ? "text-4xl" : size === "lg" ? "text-7xl" : "text-6xl";
  const spinnerSize = size === "sm" ? "w-10 h-10" : size === "lg" ? "w-20 h-20" : "w-16 h-16";

  return (
    <div
      className={`flex justify-center items-center ${fullScreen ? "min-h-screen" : "min-h-[calc(100vh-128px)]"}`}
      style={{ background: cfg.bg }}
    >
      <div className="text-center px-4">
        {finalEmoji && <div className={`${emojiSize} mb-4 animate-bounce`} style={{ filter: `drop-shadow(${cfg.glow})` }}>
          {finalEmoji}
        </div>}
        <div
          className={`${spinnerSize} mx-auto border-4 border-t-transparent rounded-full animate-spin`}
          style={{ borderColor: cfg.spinnerColor, borderTopColor: "transparent", boxShadow: cfg.glow }}
        />
        <p className="mt-4 font-semibold text-base" style={{ color: cfg.textColor }}>
          {finalText}
        </p>
        {finalSub ? (
          <p className="mt-1 text-xs opacity-60" style={{ color: cfg.textColor }}>
            {finalSub}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default ThemedLoader;
