import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import axiosInstance from "@/utils/axiosInstance.js";
import { normalizeSearchText } from "@/utils/searchUtils.js";
import {
  fetchAdminChannels, createAdminChannel, updateAdminChannel,
  deleteAdminChannel, processM3UForAdmin,
  createAdminVideo, updateAdminVideo, deleteAdminVideo,
  fetchAdminUsers, updateAdminUserPlan, updateAdminUserStatus, deleteAdminUser
} from "@/utils/api.js";
import AdminUserDevices from "@/components/admin/AdminUserDevices.jsx";
import MigrationPanel from "@/components/MigrationPanel.jsx";

// --- Componentes UI ---
const Tab = ({ label, value, activeTab, onTabChange, disabled = false }) => (
  <button
    onClick={() => !disabled && onTabChange(value)}
    disabled={disabled}
    className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors duration-150 whitespace-nowrap ${
      activeTab === value
        ? "border-b-2 border-red-500 text-white"
        : "text-gray-400 hover:text-gray-200 hover:border-b-2 hover:border-gray-500"
    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    {label}
  </button>
);

const Input = React.forwardRef((props, ref) => (
  <input
    ref={ref}
    {...props}
    className={`w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:ring-1 focus:ring-red-500 focus:border-red-500 text-white placeholder-gray-400 ${
      props.className || ""
    } ${props.disabled ? "opacity-70 cursor-not-allowed" : ""}`}
  />
));

const Textarea = React.forwardRef((props, ref) => (
  <textarea
    ref={ref}
    {...props}
    className={`w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:ring-1 focus:ring-red-500 focus:border-red-500 text-white placeholder-gray-400 h-24 ${
      props.className || ""
    } ${props.disabled ? "opacity-70 cursor-not-allowed" : ""}`}
  />
));

const Select = React.forwardRef((props, ref) => (
  <select
    ref={ref}
    {...props}
    className={`w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:ring-1 focus:ring-red-500 focus:border-red-500 text-white ${
      props.className || ""
    } ${props.disabled ? "opacity-70 cursor-not-allowed" : ""}`}
  >
    {props.children}
  </select>
));

const Checkbox = ({ label, checked, onChange, disabled, name, value }) => (
  <label className="flex items-center space-x-2 cursor-pointer">
    <input
      type="checkbox"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className={`form-checkbox h-5 w-5 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-offset-gray-800 focus:ring-red-500 ${disabled ? "opacity-70 cursor-not-allowed" : ""}`}
    />
    <span className={`text-sm ${disabled ? "text-gray-500" : "text-gray-300"}`}>{label}</span>
  </label>
);

const Button = ({ children, className, disabled, isLoading, ...props }) => (
  <button
    {...props}
    disabled={disabled || isLoading}
    className={`font-semibold py-2.5 px-5 rounded-md transition-colors duration-150 ease-in-out flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
      className || ""
    } ${
      disabled || isLoading
        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
        : "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
    }`}
  >
    {isLoading ? (
      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    ) : (
      children
    )}
  </button>
);

const MAIN_SECTION_VOD_OPTIONS = [
  { key: "POR_GENERO", displayName: "POR GÉNEROS"},
  { key: "ESPECIALES", displayName: "ESPECIALES (Festividades)"},
  { key: "CINE_2026", displayName: "CINE 2026 (Estrenos)"},
  { key: "CINE_2025", displayName: "CINE 2025 (Estrenos)"},
  { key: "CINE_4K", displayName: "CINE 4K UHD"},
  { key: "CINE_60FPS", displayName: "CINE 60 FPS"},
  { key: "ZONA_KIDS", displayName: "ZONA KIDS"},
];

const SERIES_SUBCATEGORIES = [ "Netflix", "Prime Video", "Disney", "Apple TV", "HBO Max", "Hulu y Otros", "Retro", "Animadas", "ZONA KIDS" ];

const ALL_AVAILABLE_PLANS = [
  { key: "gplay", displayName: "GPlay" },
  { key: "estandar", displayName: "Estándar" },
  { key: "cinefilo", displayName: "Cinéfilo" },
  { key: "sports", displayName: "Sports" },
  { key: "premium", displayName: "Premium" },
];

const WORLD_CUP_TEAMS = [
  "Alemania", "Angola", "Arabia Saudita", "Argelia", "Argentina", "Australia", "Austria",
  "Bélgica", "Bolivia", "Bosnia y Herzegovina", "Brasil", "Cabo Verde", "Camerún", "Canadá", "Catar", "Chile", "China", "Colombia",
  "Corea del Sur", "Costa de Marfil", "Costa Rica", "Croacia", "Curazao", "Dinamarca", "Ecuador", "EE. UU.",
  "Egipto", "El Salvador", "Escocia", "España", "Francia", "Gales", "Ghana", "Grecia", "Haití", "Honduras",
  "Hungría", "Inglaterra", "Irak", "Irán", "Irlanda", "Islandia", "Italia", "Jamaica", "Japón", "Jordania",
  "Marruecos", "México", "Nigeria", "Noruega", "Nueva Zelanda", "Países Bajos", "Panamá", "Paraguay",
  "Perú", "Polonia", "Portugal", "R. D. del Congo", "República Checa", "Rumania", "Senegal", "Serbia", "Sudáfrica",
  "Suecia", "Suiza", "Túnez", "Turquía", "Ucrania", "Uruguay", "Uzbekistán", "Venezuela"
].sort();

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
  "Bosnia y Herzegovina": "ba",
  "Brasil": "br",
  "Cabo Verde": "cv",
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
  "Curazao": "cw",
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
  "Haití": "ht",
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
  "Jordania": "jo",
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
  "R. D. del Congo": "cd",
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
  "Uzbekistán": "uz",
  "Venezuela": "ve"
};

const WORLD_CUP_STADIUMS = [
  "Estadio Azteca, CDMX, México",
  "MetLife Stadium, NY/NJ, EE. UU.",
  "BC Place, Vancouver, Canadá",
  "SoFi Stadium, Los Ángeles, EE. UU.",
  "Mercedes-Benz Stadium, Atlanta, EE. UU.",
  "Gillette Stadium, Boston, EE. UU.",
  "AT&T Stadium, Dallas, EE. UU.",
  "NRG Stadium, Houston, EE. UU.",
  "Arrowhead Stadium, Kansas City, EE. UU.",
  "Hard Rock Stadium, Miami, EE. UU.",
  "Lincoln Financial Field, Filadelfia, EE. UU.",
  "Lumen Field, Seattle, EE. UU.",
  "Estadio BBVA, Monterrey, México",
  "Estadio Akron, Guadalajara, México",
  "BMO Field, Toronto, Canadá"
];

const WORLD_CUP_PHASES = [
  "Fase de Grupos - Grupo A (Inaugural)", "Fase de Grupos - Grupo A", "Fase de Grupos - Grupo B", "Fase de Grupos - Grupo C",
  "Fase de Grupos - Grupo D", "Fase de Grupos - Grupo E", "Fase de Grupos - Grupo F",
  "Fase de Grupos - Grupo G", "Fase de Grupos - Grupo H", "Fase de Grupos - Grupo I",
  "Fase de Grupos - Grupo J", "Fase de Grupos - Grupo K", "Fase de Grupos - Grupo L",
  "Dieciseisavos de Final", "Octavos de Final", "Cuartos de Final", "Semifinal", "Tercer Puesto", "Gran Final"
];

const BRACKET_SLOTS_BY_PHASE = {
  "Dieciseisavos de Final": [
    { key: "d-1", label: "Dieciseisavos - Llave 1 (1A vs 3º Mejor 1)" },
    { key: "d-2", label: "Dieciseisavos - Llave 2 (2B vs 2C)" },
    { key: "d-3", label: "Dieciseisavos - Llave 3 (1C vs 3º Mejor 2)" },
    { key: "d-4", label: "Dieciseisavos - Llave 4 (1B vs 2D)" },
    { key: "d-5", label: "Dieciseisavos - Llave 5 (1E vs 3º Mejor 3)" },
    { key: "d-6", label: "Dieciseisavos - Llave 6 (2E vs 2F)" },
    { key: "d-7", label: "Dieciseisavos - Llave 7 (1G vs 3º Mejor 4)" },
    { key: "d-8", label: "Dieciseisavos - Llave 8 (2G vs 2H)" },
    { key: "d-9", label: "Dieciseisavos - Llave 9 (1I vs 3º Mejor 5)" },
    { key: "d-10", label: "Dieciseisavos - Llave 10 (2I vs 2J)" },
    { key: "d-11", label: "Dieciseisavos - Llave 11 (1K vs 3º Mejor 6)" },
    { key: "d-12", label: "Dieciseisavos - Llave 12 (2K vs 2L)" },
    { key: "d-13", label: "Dieciseisavos - Llave 13 (1H vs 3º Mejor 7)" },
    { key: "d-14", label: "Dieciseisavos - Llave 14 (1J vs 3º Mejor 8)" },
    { key: "d-15", label: "Dieciseisavos - Llave 15 (1F vs 2A)" },
    { key: "d-16", label: "Dieciseisavos - Llave 16 (1L vs 2J)" }
  ],
  "Octavos de Final": [
    { key: "o-1", label: "Octavos - Llave 1 (Ganador Llave 1 vs 2)" },
    { key: "o-2", label: "Octavos - Llave 2 (Ganador Llave 3 vs 4)" },
    { key: "o-3", label: "Octavos - Llave 3 (Ganador Llave 5 vs 6)" },
    { key: "o-4", label: "Octavos - Llave 4 (Ganador Llave 7 vs 8)" },
    { key: "o-5", label: "Octavos - Llave 5 (Ganador Llave 9 vs 10)" },
    { key: "o-6", label: "Octavos - Llave 6 (Ganador Llave 11 vs 12)" },
    { key: "o-7", label: "Octavos - Llave 7 (Ganador Llave 13 vs 14)" },
    { key: "o-8", label: "Octavos - Llave 8 (Ganador Llave 15 vs 16)" }
  ],
  "Cuartos de Final": [
    { key: "c-1", label: "Cuartos - Llave 1 (Ganador Octavos 1 vs 2)" },
    { key: "c-2", label: "Cuartos - Llave 2 (Ganador Octavos 3 vs 4)" },
    { key: "c-3", label: "Cuartos - Llave 3 (Ganador Octavos 5 vs 6)" },
    { key: "c-4", label: "Cuartos - Llave 4 (Ganador Octavos 7 vs 8)" }
  ],
  "Semifinal": [
    { key: "s-1", label: "Semifinal - Llave 1 (Ganador Cuartos 1 vs 2)" },
    { key: "s-2", label: "Semifinal - Llave 2 (Ganador Cuartos 3 vs 4)" }
  ],
  "Gran Final": [
    { key: "f-1", label: "Gran Final (Ganador Semis 1 vs 2)" }
  ]
};

const VOD_MANAGEMENT_TABS = [
    { value: 'manage_vod', label: 'Gestionar VOD', tipo: '' },
    { value: 'manage_series', label: 'Gestionar Series', tipo: 'serie' },
    { value: 'manage_movies', label: 'Películas', tipo: 'pelicula' },
    { value: 'manage_animes', label: 'Animes', tipo: 'anime' },
    { value: 'manage_doramas', label: 'Doramas', tipo: 'dorama' },
    { value: 'manage_novelas', label: 'Novelas', tipo: 'novela' },
    { value: 'manage_documentales', label: 'Documentales', tipo: 'documental' },
];

export default function AdminPanel() {
  const VODS_PER_PAGE = 50;
  const { user } = useAuth();
  const [m3uFile, setM3uFile] = useState(null);
  const [m3uFileNameDisplay, setM3uFileNameDisplay] = useState("");
  const [channelId, setChannelId] = useState(null);
  const [channelForm, setChannelForm] = useState({ name: "", url: "", logo: "", description: "", section: "General", active: true, isFeatured: false, requiresPlan: [], isPubliclyVisible: true, });
  const [vodId, setVodId] = useState(null);
  const [bulkCategoria, setBulkCategoria] = useState("");
  const [bulkSubcategoria, setBulkSubcategoria] = useState("");
  const [vodForm, setVodForm] = useState({
    title: "",
    url: "",
    logo: "",
    customThumbnail: "",
    bannerImage: "",
    description: "",
    trailerUrl: "",
    releaseYear: new Date().getFullYear().toString(),
    isFeatured: false,
    active: true,
    tipo: "pelicula",
    mainSection: MAIN_SECTION_VOD_OPTIONS[0]?.key || "",
    genres: "",
    requiresPlan: [],
    seasons: [],
    subcategoria: "Netflix",
    hasNewEpisodes: false,
    is4K: false,
    is60FPS: false,
    showInBanner: false
  });



  const [channels, setChannels] = useState([]);
  const [videos, setVideos] = useState([]);
  // Información temporal de arrastre (drag): { fromSeason, fromChapter }
  const [dragInfo, setDragInfo] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [userEdits, setUserEdits] = useState({}); // Estado local para ediciones de usuarios
  const [expandedDevices, setExpandedDevices] = useState({}); // Estado local para expandir dispositivos de cada usuario

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState({ channels: false, vod: false, m3u: false, users: false });
  const [activeTab, setActiveTab] = useState("manage_users");

  // --- Estados para el Mundial 2026 Admin ---
  const [mundialMatches, setMundialMatches] = useState([]);
  const [selectedBracketAdminRound, setSelectedBracketAdminRound] = useState('octavos');
  const [editingMatchId, setEditingMatchId] = useState(null);
  const [matchForm, setMatchForm] = useState({
    equipo1: "México",
    equipo2: "Sudáfrica",
    fecha: "11 de Junio, 2026",
    hora: "14:00",
    estadio: "Estadio Azteca, CDMX, México",
    fase: "Fase de Grupos - Grupo A (Inaugural)",
    canales: [],
    goles1: 0,
    goles2: 0,
    estado: "PRÓXIMO",
    clave: false,
    grupo: "A",
    bracketKey: ""
  });

  // Mapa de búsqueda rápida O(1) de canales para optimizar el panel de administración
  const channelsMap = React.useMemo(() => {
    const map = new Map();
    channels.forEach(ch => {
      const id = ch.id || ch._id;
      if (id) {
        map.set(String(id), ch);
      }
    });
    return map;
  }, [channels]);

  // Memoizar los partidos cargados con sus canales resueltos y ordenados por relevancia (EN VIVO -> PRÓXIMO -> FINALIZADO)
  const resolvedMundialMatches = React.useMemo(() => {
    const list = mundialMatches.map(match => {
      const associated = (match.canales || [])
        .map(chId => channelsMap.get(String(chId)))
        .filter(Boolean);
      return {
        ...match,
        associatedChannels: associated
      };
    });

    // Ordenar: EN VIVO primero, luego PRÓXIMO, luego FINALIZADO
    return list.sort((a, b) => {
      if (a.estado === "EN VIVO" && b.estado !== "EN VIVO") return -1;
      if (a.estado !== "EN VIVO" && b.estado === "EN VIVO") return 1;
      if (a.estado === "PRÓXIMO" && b.estado === "FINALIZADO") return -1;
      if (a.estado === "FINALIZADO" && b.estado === "PRÓXIMO") return 1;
      return a.id - b.id;
    });
  }, [mundialMatches, channelsMap]);

  // --- Cálculo del Bracket y Standing para Administración ---
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

    resolvedMundialMatches.forEach((match) => {
      let grupoVal = match.grupo;
      if (!grupoVal && match.fase && match.fase.includes("Grupo ")) {
        const matchGroup = match.fase.match(/Grupo\s+([A-L])/i);
        if (matchGroup) {
          grupoVal = matchGroup[1].toUpperCase();
        }
      }

      if (grupoVal && (match.estado === "FINALIZADO" || match.estado === "EN VIVO")) {
        const groupKey = String(grupoVal).toUpperCase();
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

    thirds.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const diffA = a.gf - a.gc;
      const diffB = b.gf - b.gc;
      if (diffB !== diffA) return diffB - diffA;
      return b.gf - a.gf;
    });
    return thirds;
  }, [GROUPS_DATA]);

  const knockoutBracket = React.useMemo(() => {
    const pairings = [
      { t1: { type: 'winner', group: 'A' }, t2: { type: 'third', index: 0 } },
      { t1: { type: 'runnerup', group: 'B' }, t2: { type: 'runnerup', group: 'C' } },
      { t1: { type: 'winner', group: 'C' }, t2: { type: 'third', index: 1 } },
      { t1: { type: 'winner', group: 'B' }, t2: { type: 'runnerup', group: 'D' } },
      { t1: { type: 'winner', group: 'E' }, t2: { type: 'third', index: 2 } },
      { t1: { type: 'runnerup', group: 'E' }, t2: { type: 'runnerup', group: 'F' } },
      { t1: { type: 'winner', group: 'G' }, t2: { type: 'third', index: 3 } },
      { t1: { type: 'runnerup', group: 'G' }, t2: { type: 'runnerup', group: 'H' } },
      { t1: { type: 'winner', group: 'I' }, t2: { type: 'third', index: 4 } },
      { t1: { type: 'runnerup', group: 'I' }, t2: { type: 'runnerup', group: 'J' } },
      { t1: { type: 'winner', group: 'K' }, t2: { type: 'third', index: 5 } },
      { t1: { type: 'runnerup', group: 'K' }, t2: { type: 'runnerup', group: 'L' } },
      { t1: { type: 'winner', group: 'H' }, t2: { type: 'third', index: 6 } },
      { t1: { type: 'winner', group: 'J' }, t2: { type: 'third', index: 7 } },
      { t1: { type: 'winner', group: 'F' }, t2: { type: 'runnerup', group: 'A' } },
      { t1: { type: 'winner', group: 'L' }, t2: { type: 'runnerup', group: 'J' } }
    ];

    const getTeamName = (source) => {
      if (source.type === 'winner') {
        const group = GROUPS_DATA[source.group];
        return group && group[0] ? group[0].pais : `1º Grupo ${source.group}`;
      } else if (source.type === 'runnerup') {
        const group = GROUPS_DATA[source.group];
        return group && group[1] ? group[1].pais : `2º Grupo ${source.group}`;
      } else if (source.type === 'third') {
        const third = bestThirds[source.index];
        return third ? third.pais : `3º Mejor Tercero ${source.index + 1}`;
      }
      return 'Por definir';
    };

    const dieciseisavos = pairings.map((p, idx) => {
      const equipo1 = getTeamName(p.t1);
      const equipo2 = getTeamName(p.t2);
      const dbMatch = resolvedMundialMatches.find(m => 
        m.bracketKey === `d-${idx + 1}` || (
          !m.bracketKey &&
          (m.fase?.toLowerCase().includes("dieciseis") || m.fase?.toLowerCase().includes("16avos") || m.fase?.toLowerCase().includes("1/16") || m.fase?.toLowerCase().includes("32avos")) &&
          (
            ((m.equipo1?.toLowerCase() === equipo1.toLowerCase() && m.equipo2?.toLowerCase() === equipo2.toLowerCase()) ||
             (m.equipo1?.toLowerCase() === equipo2.toLowerCase() && m.equipo2?.toLowerCase() === equipo1.toLowerCase()))
          )
        )
      );

      if (dbMatch) {
        const useExactDbTeams = dbMatch.bracketKey === `d-${idx + 1}`;
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

  const handleProgramBracketSlot = (slotKey, calculatedEquipo1, calculatedEquipo2, phaseName) => {
    // 1. Buscar si ya existe un partido guardado con ese bracketKey en resolvedMundialMatches
    const dbMatch = resolvedMundialMatches.find(m => m.bracketKey === slotKey);
    
    if (dbMatch) {
      // Editar el partido existente
      handleEditMatch(dbMatch);
    } else {
      // Programar un nuevo partido para este slot con los nombres pre-calculados
      setEditingMatchId(null);
      setMatchForm({
        equipo1: calculatedEquipo1 || "",
        equipo2: calculatedEquipo2 || "",
        fecha: "Por definir",
        hora: "Por definir",
        estadio: "Por definir",
        fase: phaseName,
        grupo: "",
        bracketKey: slotKey,
        canales: [],
        goles1: 0,
        goles2: 0,
        estado: "PRÓXIMO",
        clave: true
      });
    }

    // Scroll suave al contenedor del formulario
    setTimeout(() => {
      const formElement = document.getElementById("match-form-container");
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };


  const loadMundialMatches = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/api/worldcup/matches");
      if (Array.isArray(response.data)) {
        setMundialMatches(response.data);
      }
    } catch (error) {
      console.error("Error al cargar partidos del Mundial desde base de datos:", error);
      setErrorMsg("No se pudieron cargar los partidos del Mundial desde la base de datos.");
    }
  }, []);

  const handleEditMatch = (match) => {
    setEditingMatchId(match.id);
    setMatchForm({
      equipo1: match.equipo1,
      equipo2: match.equipo2,
      fecha: match.fecha,
      hora: match.hora,
      estadio: match.estadio,
      fase: match.fase,
      canales: match.canales || [],
      goles1: match.goles1 !== undefined ? match.goles1 : 0,
      goles2: match.goles2 !== undefined ? match.goles2 : 0,
      estado: match.estado || "PRÓXIMO",
      clave: match.clave !== undefined ? match.clave : false,
      grupo: match.grupo || "",
      bracketKey: match.bracketKey || ""
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteMatch = async (matchId) => {
    if (!window.confirm("¿Seguro que deseas eliminar este partido del fixture?")) return;
    try {
      await axiosInstance.delete(`/api/worldcup/matches/${matchId}`);
      setMundialMatches(prev => prev.filter(m => String(m.id) !== String(matchId)));
      setSuccessMsg("Partido eliminado con éxito de la base de datos.");
    } catch (error) {
      console.error("Error al eliminar partido:", error);
      setErrorMsg("No se pudo eliminar el partido de la base de datos.");
    }
  };

  const handleClearMatchForm = () => {
    setEditingMatchId(null);
    setMatchForm({
      equipo1: "México",
      equipo2: "Sudáfrica",
      fecha: "11 de Junio, 2026",
      hora: "14:00",
      estadio: "Estadio Azteca, CDMX, México",
      fase: "Fase de Grupos - Grupo A (Inaugural)",
      canales: [],
      goles1: 0,
      goles2: 0,
      estado: "PRÓXIMO",
      clave: false,
      grupo: "A",
      bracketKey: ""
    });
  };

  const handleMatchFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setMatchForm(prev => {
      const updated = { ...prev, [name]: val };
      if (name === "fase") {
        if (val && val.includes("Grupo ")) {
          const matchGroup = val.match(/Grupo\s+([A-L])/i);
          if (matchGroup) {
            updated.grupo = matchGroup[1].toUpperCase();
          }
          updated.bracketKey = "";
        } else {
          updated.grupo = "";
        }
      }
      return updated;
    });
  };

  const handleMatchChannelSelect = (channelId) => {
    setMatchForm(prev => {
      const current = prev.canales || [];
      const updated = current.includes(channelId)
        ? current.filter(id => id !== channelId)
        : [...current, channelId].slice(0, 3);
      return { ...prev, canales: updated };
    });
  };

  const handleSaveMatch = async (e) => {
    e.preventDefault();
    if (matchForm.equipo1 === matchForm.equipo2) {
      setErrorMsg("Un equipo no puede jugar contra sí mismo.");
      return;
    }
    
    try {
      if (editingMatchId) {
        const response = await axiosInstance.put(`/api/worldcup/matches/${editingMatchId}`, matchForm);
        setMundialMatches(prev => prev.map(m => String(m.id) === String(editingMatchId) ? response.data : m));
        setSuccessMsg("Partido actualizado con éxito en la base de datos.");
      } else {
        const response = await axiosInstance.post("/api/worldcup/matches", matchForm);
        setMundialMatches(prev => [...prev, response.data]);
        setSuccessMsg("Partido agregado al fixture en la base de datos.");
      }
      handleClearMatchForm();
    } catch (error) {
      console.error("Error al guardar el partido del Mundial:", error);
      setErrorMsg("No se pudo guardar el partido en la base de datos.");
    }
  };
  const [bulkVodFile, setBulkVodFile] = useState(null);
  const [bulkVodFileNameDisplay, setBulkVodFileNameDisplay] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("");
  const [selectedVods, setSelectedVods] = useState([]);

  
  const clearMessages = useCallback(() => { setErrorMsg(""); setSuccessMsg(""); }, []);


  // --- Lógica para carga masiva de VODs ---
  const handleBulkVodFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBulkVodFile(file);
      setBulkVodFileNameDisplay(file.name);
      setSuccessMsg("");
      setErrorMsg("");
    } else {
      setBulkVodFile(null);
      setBulkVodFileNameDisplay("");
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!bulkVodFile) {
      setErrorMsg("Por favor, selecciona un archivo M3U o texto.");
      return;
    }
    setIsLoading(prev => ({ ...prev, bulkVod: true }));
    clearMessages();
    setUploadProgress(0);
    setProcessingStatus("Iniciando carga...");
    const formData = new FormData();
    formData.append("file", bulkVodFile);

    try {
      const axiosWithExtendedTimeout = axiosInstance.create({
        timeout: 300000
      });
      setProcessingStatus("Subiendo archivo al servidor...");
      formData.append("categoria", bulkCategoria);
      if (bulkCategoria === "pelicula" || bulkCategoria === "serie") {
        formData.append("subcategoria", bulkSubcategoria);
      }
      const response = await axiosWithExtendedTimeout.post("/api/videos/upload-text", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${user.token}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
          if (percentCompleted === 100) {
            setProcessingStatus("Archivo subido. Procesando contenido...");
          } else {
            setProcessingStatus(`Subiendo archivo... ${percentCompleted}%`);
          }
        }
      });

      const result = response.data;
      let successMessage = result.message || `Archivo procesado exitosamente. `;
      if (result.added !== undefined || result.skipped !== undefined) {
        successMessage = `Archivo procesado exitosamente. Videos añadidos: ${result.added || 0}, Omitidos (duplicados): ${result.skipped || 0}`;
      } else if (result.summary) {
        successMessage = `Archivo procesado exitosamente. Videos creados: ${result.summary.totalProcessed || 0}`;
        if (result.summary.movies > 0) successMessage += `, Películas: ${result.summary.movies}`;
        if (result.summary.series > 0) successMessage += `, Series: ${result.summary.series}`;
      }
      setSuccessMsg(successMessage);
      setProcessingStatus("");
      if (result.errors && result.errors.length > 0) {
        console.error("Errores durante el procesamiento:", result.errors);
        setErrorMsg(`Se encontraron ${result.errors.length} errores durante el procesamiento. Ver consola para detalles.`);
      }
      setBulkVodFile(null);
      setBulkVodFileNameDisplay("");
      setUploadProgress(0);
      if (e.target.reset) e.target.reset();
      fetchVideosList();
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "Error al procesar el archivo de VODs";
      setErrorMsg(errorMsg);
      setProcessingStatus("");
      setUploadProgress(0);
    } finally {
      setIsLoading(prev => ({ ...prev, bulkVod: false }));
    }
  };

  // --- Lógica para Canales y VODs ---
  const fetchChannelsList = useCallback(async () => {
    setIsLoading(prev => ({ ...prev, channels: true })); clearMessages();
    try {
      const data = await fetchAdminChannels();
      setChannels(data || []);
      if (!data || data.length === 0) setSuccessMsg("No hay canales para mostrar.");
    } catch (err) {
      setErrorMsg(err.message || "Fallo al cargar canales."); setChannels([]);
    } finally {
      setIsLoading(prev => ({ ...prev, channels: false }));
    }
  }, [clearMessages]);
  const clearChannelForm = useCallback(() => { setChannelId(null); setChannelForm({ name: "", url: "", logo: "", description: "", section: "General", active: true, isFeatured: false, requiresPlan: [], isPubliclyVisible: true, }); }, []);
  const handleChannelFormChange = (e) => { const { name, value, type, checked } = e.target; setChannelForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); };
  const handleChannelPlanChange = (planKey) => { setChannelForm(prev => ({ ...prev, requiresPlan: prev.requiresPlan.includes(planKey) ? prev.requiresPlan.filter(p => p !== planKey) : [...prev.requiresPlan, planKey] })); };
  const handleEditChannelClick = useCallback((channel) => {
    setChannelId(channel.id || channel._id); setChannelForm({
      name: channel.name || "", url: channel.url || "", logo: channel.logo || "", description: channel.description || "", section: channel.section || "General",
      active: channel.active !== undefined ? channel.active : true, isFeatured: channel.isFeatured || false, requiresPlan: Array.isArray(channel.requiresPlan) ? channel.requiresPlan.map(String) : (channel.requiresPlan ? [String(channel.requiresPlan)] : []), isPubliclyVisible: channel.isPubliclyVisible === undefined ? true : channel.isPubliclyVisible,
    }); setActiveTab("add_channel"); clearMessages(); window.scrollTo(0, 0);
  }, [clearMessages]);
  const submitChannelForm = async (e) => {
    e.preventDefault(); setIsSubmitting(true); clearMessages();
    try {
      const dataToSend = { ...channelForm };
      if (channelId) {
        await updateAdminChannel(channelId, dataToSend);
        setSuccessMsg(`Canal "${dataToSend.name}" actualizado.`);
      } else {
        await createAdminChannel(dataToSend);
        setSuccessMsg(`Canal "${dataToSend.name}" creado.`);
      }
      clearChannelForm(); fetchChannelsList(); setActiveTab("manage_channels");
    } catch (err) {
      setErrorMsg(err.message || "Error al guardar canal.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleDeleteChannelClick = async (id, name) => {
    if (!id || !window.confirm(`¿Estás seguro de que quieres eliminar el canal "${name || 'este canal'}"?`)) return; setIsSubmitting(true); clearMessages();
    try {
      await deleteAdminChannel(id); setSuccessMsg(`Canal "${name || ''}" eliminado.`); fetchChannelsList(); if (channelId === id) clearChannelForm();
    } catch (err) {
      setErrorMsg(err.message || "Error al eliminar canal.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleM3UFileChange = (e) => { const file = e.target.files[0]; if (file) { setM3uFile(file); setM3uFileNameDisplay(file.name); setSuccessMsg(""); setErrorMsg(""); } else { setM3uFile(null); setM3uFileNameDisplay(""); } };
  const submitM3UFile = async (e) => {
    e.preventDefault(); if (!m3uFile) { setErrorMsg("Por favor, selecciona un archivo M3U."); return; } setIsLoading(prev => ({ ...prev, m3u: true })); clearMessages(); const formData = new FormData(); formData.append("m3uFile", m3uFile);
    try { const result = await processM3UForAdmin(formData); setSuccessMsg(result.message || "Archivo M3U procesado."); setM3uFile(null); setM3uFileNameDisplay(""); if (e.target.reset) e.target.reset(); fetchChannelsList();
    } catch (err) { setErrorMsg(err.message || "Error al procesar el archivo M3U."); } finally { setIsLoading(prev => ({ ...prev, m3u: false })); }
  };

  // --- VOD PAGINACIÓN Y BÚSQUEDA ---
  const [vodCurrentPage, setVodCurrentPage] = useState(1);
  const [vodTotalPages, setVodTotalPages] = useState(1);
  const [vodTotalCount, setVodTotalCount] = useState(0);
  const [vodSearchTerm, setVodSearchTerm] = useState("");
  const [vodFilterTipo, setVodFilterTipo] = useState("");
  const fetchVideosList = useCallback(async (requestedPage = 1, search = '', tipo = '') => {
    setIsLoading(prev => ({ ...prev, vod: true }));
    clearMessages();
    try {
      const pageNum = parseInt(requestedPage, 10) || 1;
      const params = { view: 'admin', limit: VODS_PER_PAGE, page: pageNum };
      if (search.trim()) params.search = search.trim();
      
      if (tipo) {
        params.tipo = tipo;
      }

      console.log('Parámetros enviados al backend:', params);
      const response = await axiosInstance.get('/api/videos', { params });
      const data = response.data;
      console.log('Respuesta del backend:', data);

      setVideos(Array.isArray(data.videos) ? data.videos : []);
      setVodCurrentPage(data.page || 1);

      const totalCount = data.total || 0;
      const calculatedPages = Math.ceil(totalCount / VODS_PER_PAGE);
      setVodTotalCount(totalCount);
      setVodTotalPages(calculatedPages);

      if (!data.videos || data.videos.length === 0) {
        setSuccessMsg('No se encontraron VODs con los criterios actuales.');
      } else {
        setSuccessMsg(''); // Limpiar mensaje si hay datos
      }
    } catch (err) {
      console.error('Error al cargar VODs:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Fallo al cargar VODs.');
      setVideos([]);
      setVodTotalPages(1);
      setVodTotalCount(0);
    } finally {
      setIsLoading(prev => ({ ...prev, vod: false }));
    }
  },
  [clearMessages]
);

  const clearVodForm = useCallback(() => {
    setVodId(null);
    setVodForm({
      title: "",
      url: "",
      customThumbnail: "",
      bannerImage: "",
      description: "",
      trailerUrl: "",
      releaseYear: new Date().getFullYear().toString(),
      isFeatured: false,
      active: true,
      tipo: "pelicula",
      mainSection: MAIN_SECTION_VOD_OPTIONS[0]?.key || "",
      genres: "",
      requiresPlan: [],
      seasons: [],
      subcategoria: "Netflix",
      hasNewEpisodes: false,
      is4K: false,
      is60FPS: false,
      showInBanner: false
    });
  }, []);

  const handleVodFormChange = (e) => { const { name, value, type, checked } = e.target; setVodForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); };
  const handleVodPlanChange = (planKey) => { setVodForm(prev => { const currentPlans = prev.requiresPlan || []; const newPlans = currentPlans.includes(planKey) ? currentPlans.filter(p => p !== planKey) : [...currentPlans, planKey]; return { ...prev, requiresPlan: newPlans }; }); };
  const handleEditVodClick = useCallback((video) => { 
    setVodId(video.id || video._id); 
    let plansForForm = []; 
    if (Array.isArray(video.requiresPlan)) { 
      plansForForm = video.requiresPlan.map(p => p === "basico" ? "gplay" : String(p)); 
    } else if (video.requiresPlan) { 
      plansForForm = [video.requiresPlan === "basico" ? "gplay" : String(video.requiresPlan)]; 
    }
    
    // Usar customThumbnail si existe, si no usar tmdbThumbnail o thumbnail
    const customThumb = video.customThumbnail || video.tmdbThumbnail || video.thumbnail || "";
    
    setVodForm({
      title: video.title || "",
      url: video.url || "",
      customThumbnail: customThumb,
      bannerImage: video.bannerImage || "",
      description: video.description || "",
      trailerUrl: video.trailerUrl || "",
      releaseYear: video.releaseYear?.toString() || new Date().getFullYear().toString(),
      isFeatured: video.isFeatured || false,
      active: video.active !== undefined ? video.active : true,
      tipo: video.tipo || "pelicula",
      mainSection: video.mainSection || MAIN_SECTION_VOD_OPTIONS[0]?.key || "",
      genres: Array.isArray(video.genres) ? video.genres.join(", ") : (video.genres || ""),
      requiresPlan: plansForForm.filter(p => ALL_AVAILABLE_PLANS.some(ap => ap.key === p)),
      seasons: Array.isArray(video.seasons) ? video.seasons : [],
      subcategoria: video.subcategoria || "Netflix",
      hasNewEpisodes: video.hasNewEpisodes || false,
      is4K: video.is4K || false,
      is60FPS: video.is60FPS || false,
      showInBanner: video.showInBanner || false
    });

    setActiveTab("add_vod"); 
    clearMessages(); 
    window.scrollTo(0, 0); 
  }, [clearMessages]);
  const submitVodForm = async (e) => { 
    e.preventDefault(); 
    setIsSubmitting(true); 
    clearMessages(); 
    try { 
      // Validaciones
      if (vodForm.tipo !== "pelicula") {
        if (!vodForm.title || !vodForm.tipo) {
          setErrorMsg("Título y Tipo son obligatorios.");
          setIsSubmitting(false);
          return;
        }
        if (!Array.isArray(vodForm.seasons) || vodForm.seasons.length === 0) {
          setErrorMsg("Debe agregar al menos una temporada para este tipo de contenido.");
          setIsSubmitting(false);
          return;
        }
        for (const season of vodForm.seasons) {
          if (!season.chapters || season.chapters.length === 0) {
            setErrorMsg(`La temporada ${season.seasonNumber} debe tener al menos un capítulo.`);
            setIsSubmitting(false);
            return;
          }
          const invalidChapters = season.chapters.filter(ch => !ch.title || !ch.url);
          if (invalidChapters.length > 0) {
            setErrorMsg(`Todos los capítulos en la Temporada ${season.seasonNumber} deben tener título y URL.`);
            setIsSubmitting(false);
            return;
          }
        }
      } else {
        if (!vodForm.title || !vodForm.url || !vodForm.tipo) {
          setErrorMsg("Título, URL y Tipo son obligatorios.");
          setIsSubmitting(false);
          return;
        }
      }

      const plansToSend = (vodForm.requiresPlan || []).map(p => p === "basico" ? "gplay" : p).filter(p => ALL_AVAILABLE_PLANS.some(ap => ap.key === p)); 
      
      const dataToSend = { 
        ...vodForm, 
        tipo: vodForm.tipo.toLowerCase(),
        genres: vodForm.genres.split(',').map(g => g.trim()).filter(g => g), 
        requiresPlan: plansToSend,
        subcategoria: (vodForm.tipo !== "pelicula") ? vodForm.subcategoria : undefined,
        seasons: (vodForm.tipo !== 'pelicula' && Array.isArray(vodForm.seasons)) ? vodForm.seasons : [],
        is4K: Boolean(vodForm.is4K),
        is60FPS: Boolean(vodForm.is60FPS),
        showInBanner: Boolean(vodForm.showInBanner),
        customThumbnail: vodForm.customThumbnail || "",
        bannerImage: vodForm.bannerImage || "",
      };
      delete dataToSend.chapters;
      
      console.log("AdminPanel: Enviando dataToSend (VOD) al backend:", JSON.stringify(dataToSend, null, 2)); 
      
      if (vodId) { 
        await updateAdminVideo(vodId, dataToSend); 
        setSuccessMsg(`VOD "${dataToSend.title}" actualizado.`); 
      } else { 
        await createAdminVideo(dataToSend); 
        setSuccessMsg(`VOD "${dataToSend.title}" creado.`); 
      } 
      clearVodForm(); 
      fetchVideosList(); 
      setActiveTab("manage_vod"); 
    } catch (err) { 
      setErrorMsg(err.message || "Error al guardar VOD."); 
    } finally { 
      setIsSubmitting(false); 
    } 
  };

  const handleDeleteVodClick = async (id, title) => { if (!id || !window.confirm(`¿Estás seguro de que quieres eliminar el VOD "${title || 'este VOD'}"?`)) return; setIsSubmitting(true); clearMessages(); try { await deleteAdminVideo(id); setSuccessMsg(`VOD "${title || ''}" eliminado.`); fetchVideosList(vodCurrentPage, vodSearchTerm, vodFilterTipo); if (vodId === id) clearVodForm(); } catch (err) { setErrorMsg(err.message || "Error al eliminar VOD."); } finally { setIsSubmitting(false); } };

  // --- Funciones para gestionar temporadas y capítulos ---
  const handleAddSeason = () => {
    setVodForm(prev => ({
      ...prev,
      seasons: [...(prev.seasons || []), { 
        seasonNumber: (prev.seasons?.length || 0) + 1, 
        title: `Temporada ${(prev.seasons?.length || 0) + 1}`, 
        chapters: [] 
      }]
    }));
  };

  const handleRemoveSeason = (seasonIndex) => {
    setVodForm(prev => ({
      ...prev,
      seasons: prev.seasons.filter((_, i) => i !== seasonIndex)
    }));
  };

  const handleSeasonChange = (seasonIndex, field, value) => {
    setVodForm(prev => {
      const newSeasons = JSON.parse(JSON.stringify(prev.seasons));
      newSeasons[seasonIndex][field] = value;
      return { ...prev, seasons: newSeasons };
    });
  };

  const handleAddChapter = (seasonIndex) => {
    setVodForm(prev => {
      const newSeasons = JSON.parse(JSON.stringify(prev.seasons));
      const season = newSeasons[seasonIndex];
      season.chapters.push({ 
        title: `Capítulo ${(season.chapters?.length || 0) + 1}`, 
        url: '', 
        thumbnail: '', 
        duration: '0:00', 
        description: '' 
      });
      return { ...prev, seasons: newSeasons };
    });
  };

  const handleRemoveChapter = (seasonIndex, chapterIndex) => {
    setVodForm(prev => {
      const newSeasons = JSON.parse(JSON.stringify(prev.seasons));
      const season = newSeasons[seasonIndex];
      season.chapters.splice(chapterIndex, 1);
      return { ...prev, seasons: newSeasons };
    });
  };

  const handleChapterChange = (seasonIndex, chapterIndex, field, value) => {
    setVodForm(prev => {
      const newSeasons = JSON.parse(JSON.stringify(prev.seasons));
      newSeasons[seasonIndex].chapters[chapterIndex][field] = value;
      return { ...prev, seasons: newSeasons };
    });
  };

  // Mover capítulos dentro de la misma temporada (subir/bajar)
  const handleMoveChapterUp = (seasonIndex, chapterIndex) => {
    if (chapterIndex <= 0) return;
    setVodForm(prev => {
      const newSeasons = JSON.parse(JSON.stringify(prev.seasons));
      const chapters = newSeasons[seasonIndex].chapters;
      const tmp = chapters[chapterIndex - 1];
      chapters[chapterIndex - 1] = chapters[chapterIndex];
      chapters[chapterIndex] = tmp;
      return { ...prev, seasons: newSeasons };
    });
  };

  const handleMoveChapterDown = (seasonIndex, chapterIndex) => {
    setVodForm(prev => {
      const newSeasons = JSON.parse(JSON.stringify(prev.seasons));
      const chapters = newSeasons[seasonIndex].chapters;
      if (chapterIndex >= chapters.length - 1) return prev;
      const tmp = chapters[chapterIndex + 1];
      chapters[chapterIndex + 1] = chapters[chapterIndex];
      chapters[chapterIndex] = tmp;
      return { ...prev, seasons: newSeasons };
    });
  };

  // Drag & Drop handlers para capítulos (permite reordenar y mover entre temporadas)
  const handleDragStart = (e, seasonIndex, chapterIndex) => {
    e.dataTransfer.effectAllowed = 'move';
    // Guardar info del capítulo arrastrado
    setDragInfo({ fromSeason: seasonIndex, fromChapter: chapterIndex });
    try { e.dataTransfer.setData('text/plain', JSON.stringify({ seasonIndex, chapterIndex })); } catch (err) {}
  };

  const handleDragOverChapter = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnChapter = (e, toSeasonIndex, toChapterIndex) => {
    e.preventDefault();
    const from = dragInfo || (() => { try { return JSON.parse(e.dataTransfer.getData('text/plain')); } catch (err) { return null; }})();
    if (!from) return;
    const { fromSeason, fromChapter } = from;
    // Si es el mismo índice, nada que hacer
    if (fromSeason === toSeasonIndex && fromChapter === toChapterIndex) return;

    setVodForm(prev => {
      const newSeasons = JSON.parse(JSON.stringify(prev.seasons || []));
      const srcChapters = newSeasons[fromSeason].chapters;
      const [moved] = srcChapters.splice(fromChapter, 1);
      // Si soltamos sobre un capítulo, insertar antes
      const destChapters = newSeasons[toSeasonIndex].chapters;
      const insertIndex = (fromSeason === toSeasonIndex && fromChapter < toChapterIndex) ? toChapterIndex - 0 : toChapterIndex;
      destChapters.splice(insertIndex, 0, moved);
      return { ...prev, seasons: newSeasons };
    });
    setDragInfo(null);
  };

  const handleDropOnSeason = (e, toSeasonIndex) => {
    e.preventDefault();
    const from = dragInfo || (() => { try { return JSON.parse(e.dataTransfer.getData('text/plain')); } catch (err) { return null; }})();
    if (!from) return;
    const { fromSeason, fromChapter } = from;
    setVodForm(prev => {
      const newSeasons = JSON.parse(JSON.stringify(prev.seasons || []));
      const [moved] = newSeasons[fromSeason].chapters.splice(fromChapter, 1);
      // añadir al final de la temporada destino
      newSeasons[toSeasonIndex].chapters.push(moved);
      return { ...prev, seasons: newSeasons };
    });
    setDragInfo(null);
  };

  // --- Funciones para upload de portada VOD ---

  const handleVodSelect = (vodId) => {
    setSelectedVods((prev) =>
      prev.includes(vodId)
        ? prev.filter((id) => id !== vodId)
        : [...prev, vodId]
    );
  };

  const handleDeleteSelectedVods = async () => {
    if (selectedVods.length === 0) return;
    if (
      !window.confirm(
        `¿Estás seguro de que quieres eliminar ${selectedVods.length} VOD(s)?`
      )
    )
      return;

    console.log("Eliminando VODs con IDs:", selectedVods);
    setIsSubmitting(true);
    clearMessages();

    try {
      // Corregir la estructura de datos enviada al backend
      console.log("🚀 Payload batch-delete:", { videoIds: selectedVods });
      const response = await axiosInstance.delete("/api/videos/batch", {
        data: { videoIds: selectedVods }
      });
      
      setSuccessMsg(response.data.message || `${selectedVods.length} VOD(s) eliminados.`);
      setSelectedVods([]);
      
      // Recargar la lista después de eliminar
      const currentTab = VOD_MANAGEMENT_TABS.find(t => t.value === activeTab);
      await fetchVideosList(vodCurrentPage, vodSearchTerm, currentTab?.tipo || vodFilterTipo);
      
    } catch (err) {
      console.error("Error al eliminar VODs:", err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || "Error al eliminar VODs.";
      setErrorMsg(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAllVods = () => {
    if (selectedVods.length === videos.length) {
      setSelectedVods([]);
    } else {
      setSelectedVods(videos.map(v => v.id || v._id));
    }
  };

  // --- LÓGICA PARA GESTIÓN DE USUARIOS ---
  const fetchAdminUsersList = useCallback(async () => {
    setIsLoading(prev => ({ ...prev, users: true })); clearMessages();
    try {
      const data = await fetchAdminUsers();
      setAdminUsers(data || []);
      if (!data || data.length === 0) setSuccessMsg("No hay usuarios para mostrar.");
    } catch (err) { setErrorMsg(err.message || "Fallo al cargar la lista de usuarios."); setAdminUsers([]);
    } finally { setIsLoading(prev => ({ ...prev, users: false })); }
  }, [clearMessages]);

  const handleUserPlanChange = async (userId, newPlan) => {
    setIsSubmitting(true); clearMessages();
    try {
      await updateAdminUserPlan(userId, newPlan);
      setSuccessMsg("Plan del usuario actualizado.");
      fetchAdminUsersList(); 
    } catch (err) { setErrorMsg(err.message || "Error al actualizar el plan del usuario.");
    } finally { setIsSubmitting(false); }
  };

  const handleUserStatusChange = async (userId, currentIsActive) => {
    setIsSubmitting(true); clearMessages();
    try {
      await updateAdminUserStatus(userId, !currentIsActive);
      setSuccessMsg(`Usuario ${!currentIsActive ? 'activado' : 'desactivado'}.`);
      fetchAdminUsersList();
    } catch (err) { setErrorMsg(err.message || "Error al cambiar el estado del usuario.");
    } finally { setIsSubmitting(false); }
  };

  const handleUserExpirationChange = (userId, expiresAt) => {
    setUserEdits(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        expiresAt
      }
    }));
  };

  const handleUserObservationsChange = (userId, observations) => {
    setUserEdits(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        observations
      }
    }));
  };

  const handleSaveUserChanges = async (userId) => {
    setIsSubmitting(true); clearMessages();
    try {
      const edits = userEdits[userId] || {};
      const expiresAt = edits.expiresAt !== undefined ? edits.expiresAt : null;
      const observations = edits.observations !== undefined ? edits.observations : null;
      
      await updateAdminUserStatus(userId, undefined, expiresAt, observations);
      setSuccessMsg("Cambios del usuario guardados correctamente.");
      // Limpiar los edits para ese usuario
      setUserEdits(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      fetchAdminUsersList();
    } catch (err) { setErrorMsg(err.message || "Error al guardar los cambios del usuario.");
    } finally { setIsSubmitting(false); }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el usuario "${username}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    setIsSubmitting(true); clearMessages();
    try {
      await deleteAdminUser(userId);
      setSuccessMsg(`Usuario "${username}" eliminado exitosamente.`);
      fetchAdminUsersList();
    } catch (err) { setErrorMsg(err.message || "Error al eliminar el usuario.");
    } finally { setIsSubmitting(false); }
  };
  // --- FIN LÓGICA USUARIOS ---

 useEffect(() => {
    if (user?.token && user?.role === 'admin') {
        setSelectedVods([]);
        const vodTabInfo = VOD_MANAGEMENT_TABS.find(tab => tab.value === activeTab);

        if (vodTabInfo) {
            const tipoParaFiltrar = vodTabInfo.tipo;
            setVodFilterTipo(tipoParaFiltrar); 
            fetchVideosList(1, vodSearchTerm, tipoParaFiltrar);
        } else if (activeTab === "manage_channels" || activeTab === "m3u_to_channels" || activeTab === "manage_mundial") {
            fetchChannelsList();
            if (activeTab === "manage_mundial") {
                loadMundialMatches();
            }
        } else if (activeTab === "manage_users") {
            fetchAdminUsersList();
        }

        if (activeTab === "add_channel" && !channelId) clearChannelForm();
        if (activeTab === "add_vod" && !vodId) clearVodForm();
    }
}, [activeTab, user?.token, user?.role, fetchVideosList, fetchChannelsList, fetchAdminUsersList, loadMundialMatches, clearChannelForm, clearVodForm, vodSearchTerm]);



  if (!user?.token || user?.role !== "admin") { return <div className="flex justify-center items-center min-h-screen"><p className="text-xl text-red-500">Acceso denegado. Debes ser administrador.</p></div>; }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 max-w-7xl mx-auto bg-gray-900 text-white min-h-screen">
      <h1 className="text-3xl md:text-4xl font-bold text-center text-red-500">Panel de Administración</h1>
      
      <div className="my-4 min-h-[2.5rem] text-center">
        {errorMsg && <div className="p-3 bg-red-800 text-red-100 rounded shadow text-sm inline-block" role="alert">{errorMsg}</div>}
        {successMsg && <div className="p-3 bg-green-800 text-green-100 rounded shadow text-sm inline-block" role="alert">{successMsg}</div>}
      </div>

      <div className="flex flex-wrap justify-center border-b border-gray-700 mb-6">
        <Tab label="Gestionar Usuarios" value="manage_users" activeTab={activeTab} onTabChange={setActiveTab} />
        <Tab label={vodId ? "Editar VOD" : "Agregar VOD"} value="add_vod" activeTab={activeTab} onTabChange={setActiveTab} />
        <Tab label="Todos los VODs" value="manage_vod" activeTab={activeTab} onTabChange={setActiveTab} />
        <Tab label="Películas" value="manage_movies" activeTab={activeTab} onTabChange={setActiveTab} />
        <Tab label="Series" value="manage_series" activeTab={activeTab} onTabChange={setActiveTab} />
        <Tab label="Animes" value="manage_animes" activeTab={activeTab} onTabChange={setActiveTab} />
        <Tab label="Doramas" value="manage_doramas" activeTab={activeTab} onTabChange={setActiveTab} />
        <Tab label="Novelas" value="manage_novelas" activeTab={activeTab} onTabChange={setActiveTab} />
        <Tab label="Documentales" value="manage_documentales" activeTab={activeTab} onTabChange={setActiveTab} />
        <Tab label="Carga Masiva VOD" value="bulk_vod_upload" activeTab={activeTab} onTabChange={setActiveTab} />
        <Tab label="🔄 Migración" value="migration_panel" activeTab={activeTab} onTabChange={setActiveTab} />
        <Tab label="🏆 Mundial 2026" value="manage_mundial" activeTab={activeTab} onTabChange={setActiveTab} />
        <Tab label="Gestionar Canales" value="manage_channels" activeTab={activeTab} onTabChange={setActiveTab} />
        <Tab label="Subir M3U Canales" value="m3u_to_channels" activeTab={activeTab} onTabChange={setActiveTab} />
        <Tab label={channelId ? "Editar Canal" : "Agregar Canal"} value="add_channel" activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {activeTab === "m3u_to_channels" && ( <section className="p-4 sm:p-6 bg-gray-800 rounded-lg shadow-xl max-w-lg mx-auto"> <h2 className="text-2xl font-semibold mb-6 text-center">Procesar Archivo M3U para Canales</h2> <form onSubmit={submitM3UFile} className="space-y-4"> <div> <label htmlFor="m3uFile" className="block text-sm font-medium text-gray-300 mb-1">Archivo .m3u o .m3u8</label> <Input type="file" id="m3uFile" name="m3uFile" accept=".m3u,.m3u8" onChange={handleM3UFileChange} className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700" /> {m3uFileNameDisplay && <p className="text-xs text-gray-400 mt-1">Archivo seleccionado: {m3uFileNameDisplay}</p>} </div> <Button type="submit" isLoading={isLoading.m3u} disabled={!m3uFile || isLoading.m3u} className="w-full bg-green-600 hover:bg-green-700"> {isLoading.m3u ? "Procesando..." : "Procesar M3U"} </Button> </form> </section> )}
      
      {activeTab === "add_channel" && ( <section className="p-4 sm:p-6 bg-gray-800 rounded-lg shadow-xl max-w-2xl mx-auto"> <h2 className="text-2xl font-semibold mb-6 text-center">{channelId ? "Editar Canal" : "Agregar Nuevo Canal"}</h2> <form onSubmit={submitChannelForm} className="space-y-4"> <Input name="name" placeholder="Nombre del Canal" value={channelForm.name} onChange={handleChannelFormChange} required /> <Input name="url" type="url" placeholder="URL del Stream (.m3u8, etc.)" value={channelForm.url} onChange={handleChannelFormChange} required /> <Input name="logo" type="url" placeholder="URL del Logo del Canal" value={channelForm.logo} onChange={handleChannelFormChange} /> <Textarea name="description" placeholder="Descripción (opcional)" value={channelForm.description} onChange={handleChannelFormChange} /> <Input name="section" placeholder="Sección/Categoría (Ej: Deportes, Noticias)" value={channelForm.section} onChange={handleChannelFormChange} /> <div className="space-y-2 pt-2"> <p className="text-sm font-medium text-gray-300">Planes Requeridos (Canal):</p> <div className="grid grid-cols-2 sm:grid-cols-3 gap-2"> {ALL_AVAILABLE_PLANS.map(plan => ( <Checkbox key={plan.key} label={plan.displayName} value={plan.key} checked={channelForm.requiresPlan.includes(plan.key)} onChange={() => handleChannelPlanChange(plan.key)} /> ))} </div> </div> <div className="flex items-center space-x-6 pt-2"> <Checkbox label="Activo" name="active" checked={channelForm.active} onChange={handleChannelFormChange} /> <Checkbox label="Destacado" name="isFeatured" checked={channelForm.isFeatured} onChange={handleChannelFormChange} /> <Checkbox label="Visible Públicamente (si no requiere plan)" name="isPubliclyVisible" checked={channelForm.isPubliclyVisible} onChange={handleChannelFormChange} /> </div> <Button type="submit" isLoading={isSubmitting} className="w-full"> {isSubmitting ? (channelId ? "Actualizando..." : "Creando...") : (channelId ? "Actualizar Canal" : "Crear Canal")} </Button> {channelId && <Button type="button" onClick={clearChannelForm} className="w-full bg-gray-600 hover:bg-gray-500 mt-2">Cancelar Edición</Button>} </form> </section> )}
      
      {activeTab === "manage_channels" && (
        <section className="p-1 sm:p-6 bg-gray-800 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold mb-4 px-4 pt-4 sm:px-0 sm:pt-0">Gestionar Canales Existentes</h2>
          {isLoading.channels ? (
            <div className="text-center py-10 text-gray-400">Cargando canales...</div>
          ) : (channels && channels.length > 0) ? (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
              {channels.map((ch) => (
                <div key={ch.id || ch._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-700 hover:bg-gray-600/80 transition-colors rounded-md gap-3">
                  <img
                    src={ch.customThumbnail || ch.logo || '/img/placeholder-thumbnail.png'}
                    alt={ch.name || 'logo'}
                    className="w-20 h-14 sm:w-24 sm:h-16 object-contain bg-black rounded-sm mr-0 sm:mr-3 flex-shrink-0 self-center sm:self-start border border-gray-600"
                    onError={(e) => { e.currentTarget.src = '/img/placeholder-thumbnail.png'; }}
                  />
                  <div className="flex-grow mb-2 sm:mb-0 text-sm min-w-0 text-center sm:text-left">
                    <strong className={`text-base block truncate ${!ch.active ? 'text-gray-500 line-through' : 'text-white'}`} title={ch.name || "Sin Nombre"}>{ch.name || "Sin Nombre"}</strong>
                    <p className="text-xs text-gray-400 truncate" title={ch.url}>{ch.url}</p>
                    <p className="text-xs text-gray-500">Sección: <span className="text-gray-400">{ch.section || "N/A"}</span></p>
                    <p className="text-xs text-gray-500">Planes: <span className="text-gray-400">{(Array.isArray(ch.requiresPlan) ? ch.requiresPlan : [ch.requiresPlan]).map(pKey => ALL_AVAILABLE_PLANS.find(p => p.key === pKey)?.displayName || pKey).join(', ') || 'N/A'}</span></p>
                    <p className="text-xs text-gray-500">{ch.active ? "Activo" : "Inactivo"} | {ch.isFeatured ? "Destacado" : "No Dest."} | {ch.isPubliclyVisible ? "Público" : "Privado"}</p>
                  </div>
                  <div className="flex flex-row sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2 flex-shrink-0 self-center sm:self-auto w-full sm:w-auto justify-around sm:justify-start">
                    <Button onClick={() => handleEditChannelClick(ch)} className="flex-1 sm:flex-none bg-yellow-500 hover:bg-yellow-600 text-black text-xs px-3 py-1.5">Editar</Button>
                    <Button onClick={() => handleDeleteChannelClick(ch.id || ch._id, ch.name)} isLoading={isSubmitting} className="flex-1 sm:flex-none bg-red-500 hover:bg-red-400 text-xs px-3 py-1.5">Eliminar</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-10">{!errorMsg ? "No hay canales para mostrar." : ""}</p>
          )}
        </section>
      )}
      
      {activeTab === "add_vod" && (
        <section className="p-4 sm:p-6 bg-gray-800 rounded-lg shadow-xl max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6 text-center">{vodId ? "Editar VOD" : "Agregar Nuevo VOD"}</h2>
          <form onSubmit={submitVodForm} className="space-y-4">
            <Input name="title" placeholder="Título del VOD" value={vodForm.title} onChange={handleVodFormChange} required />
            <Select name="tipo" value={vodForm.tipo} onChange={handleVodFormChange}>
              <option value="pelicula">Película</option>
              <option value="serie">Serie</option>
              <option value="anime">Anime</option>
              <option value="dorama">Dorama</option>
              <option value="novela">Novela</option>
              <option value="documental">Documental</option>
              <option value="zona kids">Zona Kids</option>
            </Select>
            {vodForm.tipo === "pelicula" ? (
              <Input name="url" type="url" placeholder="URL del Video/Stream Principal" value={vodForm.url} onChange={handleVodFormChange} required />
            ) : (
              <div className="space-y-4 p-4 border border-gray-700 rounded-lg">
                <h3 className="text-lg font-semibold text-white">Gestión de Temporadas</h3>
                {(vodForm.seasons || []).map((season, seasonIndex) => (
                  <div key={seasonIndex} className="space-y-3 p-4 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="text-md font-semibold text-gray-200">Temporada</h4>
                      <Button type="button" onClick={() => handleRemoveSeason(seasonIndex)} className="bg-red-800 hover:bg-red-700 text-xs px-2 py-1">
                        Eliminar Temporada
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        type="number"
                        value={season.seasonNumber}
                        onChange={(e) => handleSeasonChange(seasonIndex, 'seasonNumber', parseInt(e.target.value, 10))}
                        placeholder="Número de Temporada"
                      />
                      <Input
                        type="text"
                        value={season.title}
                        onChange={(e) => handleSeasonChange(seasonIndex, 'title', e.target.value)}
                        placeholder="Título de la Temporada (opcional)"
                      />
                    </div>
                    
                    <h5 className="text-sm font-semibold text-gray-300 pt-2 border-t border-gray-600">Capítulos de esta temporada</h5>
                    {(season.chapters || []).map((chapter, chapterIndex) => (
                      <div
                        key={chapterIndex}
                        className="space-y-2 p-3 bg-gray-600/50 rounded-md"
                        draggable
                        onDragStart={(e) => handleDragStart(e, seasonIndex, chapterIndex)}
                        onDragOver={handleDragOverChapter}
                        onDrop={(e) => handleDropOnChapter(e, seasonIndex, chapterIndex)}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-gray-400">Capítulo {chapterIndex + 1}</p>
                          <div className="flex items-center space-x-2">
                            <button type="button" onClick={() => handleMoveChapterUp(seasonIndex, chapterIndex)} disabled={chapterIndex === 0} className="text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-40" title="Subir capítulo">↑</button>
                            <button type="button" onClick={() => handleMoveChapterDown(seasonIndex, chapterIndex)} disabled={chapterIndex === (season.chapters?.length || 1) - 1} className="text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-40" title="Bajar capítulo">↓</button>
                            <Button type="button" onClick={() => handleRemoveChapter(seasonIndex, chapterIndex)} className="bg-red-900 hover:bg-red-800 text-xs px-2 py-1">
                              X
                            </Button>
                          </div>
                        </div>
                        <Input
                          type="text"
                          value={chapter.title}
                          onChange={(e) => handleChapterChange(seasonIndex, chapterIndex, 'title', e.target.value)}
                          placeholder={`Título del capítulo ${chapterIndex + 1}`}
                        />
                        <Input
                          type="url"
                          value={chapter.url}
                          onChange={(e) => handleChapterChange(seasonIndex, chapterIndex, 'url', e.target.value)}
                          placeholder="URL del capítulo"
                        />
                        <Input
                          type="text"
                          value={chapter.duration}
                          onChange={(e) => handleChapterChange(seasonIndex, chapterIndex, 'duration', e.target.value)}
                          placeholder="Duración (ej: 23:45)"
                        />

                      </div>
                    ))}
                    <div
                      onDragOver={(e) => { e.preventDefault(); }}
                      onDrop={(e) => handleDropOnSeason(e, seasonIndex)}
                    >
                      <Button type="button" onClick={() => handleAddChapter(seasonIndex)} className="w-full bg-blue-600 hover:bg-blue-500 text-xs mt-2">
                      + Añadir Capítulo a Temporada {season.seasonNumber}
                    </Button>
                    </div>
                  </div>
                ))}
                <Button type="button" onClick={handleAddSeason} className="w-full bg-green-600 hover:bg-green-500">
                  + Añadir Nueva Temporada
                </Button>
              </div>
            )}

            {vodForm.tipo !== "pelicula" && (
              <>
                {(vodForm.tipo === "serie") && (
                  <Select name="subcategoria" value={vodForm.subcategoria} onChange={handleVodFormChange}>
                    {SERIES_SUBCATEGORIES.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </Select>
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Portada del VOD (Vertical - Para Cards)</label>
              <p className="text-xs text-gray-400 mb-2">Ingresa la URL de una imagen JPG o PNG para usar como portada vertical (se mostrará en las caratulas/cards)</p>
              <Input name="customThumbnail" type="url" placeholder="https://ejemplo.com/portada-vertical.jpg" value={vodForm.customThumbnail} onChange={handleVodFormChange} />
              {vodForm.customThumbnail && (
                <div className="mt-3 p-3 bg-gray-700/50 rounded">
                  <p className="text-sm text-gray-300 mb-2">Vista previa vertical:</p>
                  <img
                    src={vodForm.customThumbnail}
                    alt="Portada vertical"
                    className="h-40 object-cover rounded border border-gray-600"
                    onError={(e) => {
                      e.target.src = '/img/placeholder-thumbnail.png';
                    }}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Banner del VOD (Horizontal - Para Hero Banner)</label>
              <p className="text-xs text-gray-400 mb-2">Ingresa la URL de una imagen JPG o PNG para usar como banner horizontal (se mostrará en el hero banner de inicio)</p>
              <Input name="bannerImage" type="url" placeholder="https://ejemplo.com/banner-horizontal.jpg" value={vodForm.bannerImage} onChange={handleVodFormChange} />
              {vodForm.bannerImage && (
                <div className="mt-3 p-3 bg-gray-700/50 rounded">
                  <p className="text-sm text-gray-300 mb-2">Vista previa horizontal:</p>
                  <img
                    src={vodForm.bannerImage}
                    alt="Banner horizontal"
                    className="w-full h-24 object-cover rounded border border-gray-600"
                    onError={(e) => {
                      e.target.src = '/img/placeholder-thumbnail.png';
                    }}
                  />
                </div>
              )}
            </div>
            <Textarea name="description" placeholder="Descripción/Sinopsis" value={vodForm.description} onChange={handleVodFormChange} />
            <Input name="trailerUrl" type="url" placeholder="URL del Tráiler (YouTube u otro)" value={vodForm.trailerUrl} onChange={handleVodFormChange} />
            <Input name="releaseYear" type="number" placeholder="Año de Estreno" value={vodForm.releaseYear} onChange={handleVodFormChange} />
            <Input name="genres" placeholder="Géneros (separados por coma, ej: Acción, Comedia)" value={vodForm.genres} onChange={handleVodFormChange} />
            {vodForm.tipo === "pelicula" && (
              <Select name="mainSection" value={vodForm.mainSection} onChange={handleVodFormChange}>
                <option value="">-- Sin Sección Principal --</option>
                {MAIN_SECTION_VOD_OPTIONS.map(opt => (
                  <option key={opt.key} value={opt.key}>{opt.displayName}</option>
                ))}
              </Select>
            )}
            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium text-gray-300">Planes Requeridos para este VOD:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_AVAILABLE_PLANS.map(plan => (
                  <Checkbox
                    key={plan.key}
                    label={plan.displayName}
                    value={plan.key}
                    checked={(vodForm.requiresPlan || []).includes(plan.key)}
                    onChange={() => handleVodPlanChange(plan.key)}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-6 pt-2">
              <Checkbox label="Activo" name="active" checked={vodForm.active} onChange={handleVodFormChange} />
              <Checkbox label="Destacado" name="isFeatured" checked={vodForm.isFeatured} onChange={handleVodFormChange} />
              <Checkbox label="Mostrar en Banner" name="showInBanner" checked={vodForm.showInBanner} onChange={handleVodFormChange} />
              {vodForm.tipo !== 'pelicula' && (
                <Checkbox 
                  label="Nuevos Episodios (48h)" 
                  name="hasNewEpisodes" 
                  checked={!!vodForm.hasNewEpisodes} 
                  onChange={handleVodFormChange} 
                />
              )}
            </div>
            {vodForm.tipo !== 'pelicula' && vodForm.tipo !== 'movie' && vodForm.tipo !== 'channel' && (
              <div className="space-y-2 pt-2 border-t border-gray-600 mt-4 pt-4">
                <p className="text-sm font-medium text-gray-300">Calidad:</p>
                <div className="flex items-center space-x-6">
                  <Checkbox 
                    label="4K ULTRAHD" 
                    name="is4K" 
                    checked={!!vodForm.is4K} 
                    onChange={handleVodFormChange} 
                  />
                  <Checkbox 
                    label="60 FPS" 
                    name="is60FPS" 
                    checked={!!vodForm.is60FPS} 
                    onChange={handleVodFormChange} 
                  />
                </div>
              </div>
            )}
            <Button type="submit" isLoading={isSubmitting} className="w-full">
              {isSubmitting ? (vodId ? "Actualizando VOD..." : "Creando VOD...") : (vodId ? "Actualizar VOD" : "Crear VOD")}
            </Button>
            {vodId && (
              <Button type="button" onClick={clearVodForm} className="w-full bg-gray-600 hover:bg-gray-500 mt-2">
                Cancelar Edición
              </Button>
            )}
          </form>
        </section>
      )}

      {VOD_MANAGEMENT_TABS.some(t => t.value === activeTab) && (
        <section className="p-1 sm:p-6 bg-gray-800 rounded-lg shadow-xl">
          <div className="flex justify-between items-center mb-4 px-4 pt-4 sm:px-0 sm:pt-0">
            <h2 className="text-2xl font-semibold">
              {VOD_MANAGEMENT_TABS.find(t => t.value === activeTab)?.label || 'Gestionar Contenido'}
            </h2>
            {selectedVods.length > 0 && (
              <Button
                onClick={handleDeleteSelectedVods}
                isLoading={isSubmitting}
                className="bg-red-700 hover:bg-red-800"
              >
                Eliminar ({selectedVods.length})
              </Button>
            )}
          </div>
          <form
            onSubmit={e => {
              e.preventDefault();
              const currentTab = VOD_MANAGEMENT_TABS.find(t => t.value === activeTab);
              fetchVideosList(1, vodSearchTerm, currentTab?.tipo || vodFilterTipo);
            }}
            className="flex flex-col sm:flex-row gap-4 items-center justify-between px-4 mb-6"
          >
            <Input
              type="text"
              placeholder={`Buscar en ${VOD_MANAGEMENT_TABS.find(t => t.value === activeTab)?.label || 'VODs'}...`}
              value={vodSearchTerm}
              onChange={e => setVodSearchTerm(e.target.value)}
              className="w-full sm:max-w-xs"
            />
            {activeTab === 'manage_vod' && (
              <Select
                value={vodFilterTipo}
                onChange={e => setVodFilterTipo(e.target.value)}
                className="w-full sm:max-w-xs"
              >
                <option value="">Todos los Tipos</option>
                <option value="pelicula">Película</option>
                <option value="serie">Serie</option>
                <option value="anime">Anime</option>
                <option value="dorama">Dorama</option>
                <option value="novela">Novela</option>
                <option value="documental">Documental</option>
              </Select>
            )}
            <Button type="submit" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
              Buscar
            </Button>
          </form>
          <div className="flex items-center px-4 mb-4">
            <Checkbox
              label="Seleccionar Todos en esta página"
              checked={videos.length > 0 && selectedVods.length === videos.length}
              onChange={handleSelectAllVods}
              disabled={videos.length === 0}
            />
          </div>
          {vodTotalCount > 0 && (
            <p className="text-sm text-gray-400 text-center sm:text-left px-4 mb-4">
              Mostrando {videos.length} de {vodTotalCount} VODs totales
            </p>
          )}
          {isLoading.vod ? (
            <div className="text-center py-10 text-gray-400">Cargando...</div>
          ) : videos && videos.length > 0 ? (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
              {videos.map(vid => (
                <div key={vid.id || vid._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-700 hover:bg-gray-600/80 transition-colors rounded-md gap-3">
                  <div className="flex items-center flex-shrink-0 self-center sm:self-start">
                    <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-offset-gray-800 focus:ring-red-500 mr-4"
                      checked={selectedVods.includes(vid.id || vid._id)}
                      onChange={() => handleVodSelect(vid.id || vid._id)}
                    />
                    <img 
                      src={vid.customThumbnail || vid.logo || vid.thumbnail || vid.tmdbThumbnail || '/img/placeholder-thumbnail.png'} 
                      alt={vid.title || 'logo'} 
                      className="w-16 h-24 object-cover bg-black rounded-sm border border-gray-600" 
                      onError={(e) => {e.currentTarget.src = '/img/placeholder-thumbnail.png';}}
                    />
                  </div>
                  <div className="flex-grow mb-2 sm:mb-0 text-sm min-w-0 text-center sm:text-left sm:ml-4">
                    <strong className={`text-base block truncate ${!vid.active ? 'text-gray-500 line-through' : 'text-white'}`} title={vid.title || "Sin Título"}>
                      {vid.title || "Sin Título"}
                    </strong>
                    <p className="text-xs text-gray-500">
                      Tipo: <span className="text-gray-400">{vid.tipo || 'N/A'}</span>
                    </p>
                    {vid.tipo !== "pelicula" && (
                      <p className="text-xs text-gray-500">
                        Capítulos: <span className="text-gray-400">{(vid.seasons || []).reduce((acc, season) => acc + (season.chapters?.length || 0), 0)}</span>
                      </p>
                    )}

                    {vid.subcategoria && (
                      <p className="text-xs text-gray-500">
                        Subcategoría: <span className="text-gray-400">{vid.subcategoria}</span>
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Planes: <span className="text-gray-400">{(Array.isArray(vid.requiresPlan) ? vid.requiresPlan : [vid.requiresPlan]).map(pKey => ALL_AVAILABLE_PLANS.find(p => p.key === (pKey === "basico" ? "gplay" : pKey))?.displayName || pKey).join(', ') || 'N/A'}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Géneros: <span className="text-gray-400">{Array.isArray(vid.genres) ? vid.genres.join(', ') : (vid.genres || 'N/A')}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {vid.active ? "Activo" : "Inactivo"} | {vid.isFeatured ? "Destacado" : "No Dest."}
                    </p>
                  </div>
                  <div className="flex flex-row sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2 flex-shrink-0 self-center sm:self-auto w-full sm:w-auto justify-around sm:justify-start">
                    <Button 
                      onClick={() => handleEditVodClick(vid)} 
                      className="flex-1 sm:flex-none bg-yellow-500 hover:bg-yellow-600 text-black text-xs px-3 py-1.5"
                    >
                      Editar
                    </Button>
                    <Button 
                      onClick={() => handleDeleteVodClick(vid.id || vid._id, vid.title)} 
                      isLoading={isSubmitting} 
                      className="flex-1 sm:flex-none bg-red-500 hover:bg-red-400 text-xs px-3 py-1.5"
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-10">
              {!errorMsg ? "No hay contenido para mostrar." : ""}
            </p>
          )}
          {vodTotalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 sm:space-x-4 mt-6">
              <Button
                onClick={() => fetchVideosList(1, vodSearchTerm, vodFilterTipo)}
                disabled={vodCurrentPage <= 1 || isLoading.vod}
                className="text-xs px-2 py-1"
              >
                {'<< Primera'}
              </Button>
              <Button
                onClick={() => fetchVideosList(vodCurrentPage - 1, vodSearchTerm, vodFilterTipo)}
                disabled={vodCurrentPage <= 1 || isLoading.vod}
                className="text-xs px-2 py-1"
              >
                {'< Anterior'}
              </Button>
              <span className="text-gray-300 text-sm">
                Página {vodCurrentPage} de {vodTotalPages}
              </span>
              <Button
                onClick={() => fetchVideosList(vodCurrentPage + 1, vodSearchTerm, vodFilterTipo)}
                disabled={vodCurrentPage >= vodTotalPages || isLoading.vod}
                className="text-xs px-2 py-1"
              >
                {'Siguiente >'}
              </Button>
              <Button
                onClick={() => fetchVideosList(vodTotalPages, vodSearchTerm, vodFilterTipo)}
                disabled={vodCurrentPage >= vodTotalPages || isLoading.vod}
                className="text-xs px-2 py-1"
              >
                {'Última >>'}
              </Button>
            </div>
          )}
        </section>
      )}

      {activeTab === "manage_users" && (
        <section className="p-1 sm:p-6 bg-gray-800 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold mb-6 text-center sm:text-left">Gestionar Usuarios</h2>
          {isLoading.users ? (
            <div className="text-center py-10 text-gray-400">Cargando usuarios...</div>
          ) : (adminUsers && adminUsers.length > 0) ? (
            <div className="space-y-8">
              {adminUsers.map((usr) => (
                <div key={usr._id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div className="flex-1">
                      <p className="text-white font-semibold text-lg">{usr.username} ({usr.role})</p>
                      <p className="text-gray-400 text-sm mb-2">Plan actual: {ALL_AVAILABLE_PLANS.find(p => p.key === (usr.plan === "basico" ? "gplay" : usr.plan))?.displayName || usr.plan}</p>
                      <Select
                        value={usr.plan === "basico" ? "gplay" : usr.plan}
                        onChange={(e) => handleUserPlanChange(usr._id, e.target.value)}
                        disabled={isSubmitting}
                        className="text-xs py-1.5 bg-gray-700 mb-3"
                      >
                        {ALL_AVAILABLE_PLANS.map(plan => (
                          <option key={plan.key} value={plan.key}>{plan.displayName}</option>
                        ))}
                      </Select>
                      
                      <div className="mt-3">
                        <label className="block text-gray-300 text-xs font-medium mb-1">Fecha de Expiración</label>
                        <input
                          type="date"
                          value={userEdits[usr._id]?.expiresAt !== undefined ? userEdits[usr._id].expiresAt : (usr.expiresAt ? usr.expiresAt.split('T')[0] : '')}
                          onChange={(e) => handleUserExpirationChange(usr._id, e.target.value || null)}
                          disabled={isSubmitting}
                          className="w-full sm:w-48 px-2 py-1.5 text-xs bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                        />
                        {usr.expiresAt && (
                          <p className="text-gray-400 text-xs mt-1">Expira: {new Date(usr.expiresAt).toLocaleDateString()}</p>
                        )}
                      </div>

                      <div className="mt-3">
                        <label className="block text-gray-300 text-xs font-medium mb-1">Observaciones</label>
                        <textarea
                          value={userEdits[usr._id]?.observations !== undefined ? userEdits[usr._id].observations : (usr.observations || '')}
                          onChange={(e) => handleUserObservationsChange(usr._id, e.target.value)}
                          disabled={isSubmitting}
                          placeholder="Añade notas sobre este usuario (máximo 500 caracteres)"
                          className="w-full px-2 py-1.5 text-xs bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-500 focus:outline-none resize-none h-20"
                          maxLength={500}
                        />
                        <p className="text-gray-500 text-xs mt-1">
                          {(userEdits[usr._id]?.observations !== undefined ? userEdits[usr._id].observations : (usr.observations || '')).length}/500
                        </p>
                      </div>

                      <div className="mt-4 flex gap-2">
                        {userEdits[usr._id] && (
                          <Button
                            onClick={() => handleSaveUserChanges(usr._id)}
                            isLoading={isSubmitting}
                            className="text-xs px-4 py-2 bg-blue-600 hover:bg-blue-700"
                          >
                            Guardar Cambios
                          </Button>
                        )}
                        {userEdits[usr._id] && (
                          <button
                            onClick={() => setUserEdits(prev => {
                              const updated = { ...prev };
                              delete updated[usr._id];
                              return updated;
                            })}
                            disabled={isSubmitting}
                            className="text-xs px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded font-semibold transition-colors"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>

                      <div className="mt-3">
                        <span className={`px-2 py-1 text-xs rounded-full font-semibold ${usr.isActive ? 'bg-green-700 text-green-100' : 'bg-red-700 text-red-100'}`}>
                          {usr.isActive ? "Activo" : "Inactivo"}
                        </span>
                        <Button
                          onClick={() => handleUserStatusChange(usr._id, usr.isActive)}
                          isLoading={isSubmitting}
                          className={`ml-2 text-xs px-3 py-1.5 ${usr.isActive ? "bg-yellow-600 hover:bg-yellow-700" : "bg-green-600 hover:bg-green-700"}`}
                        >
                          {usr.isActive ? "Desactivar" : "Activar"}
                        </Button>
                        <Button
                          onClick={() => handleDeleteUser(usr._id, usr.username)}
                          isLoading={isSubmitting}
                          className="ml-2 text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700"
                        >
                          Eliminar Usuario
                        </Button>
                        <Button
                          onClick={() => setExpandedDevices(prev => ({ ...prev, [usr._id]: !prev[usr._id] }))}
                          className="ml-2 text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {expandedDevices[usr._id] ? "Ocultar Dispositivos" : "Ver Dispositivos"}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    {expandedDevices[usr._id] && (
                      <AdminUserDevices userId={usr._id} username={usr.username} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-10">{!errorMsg ? "No hay usuarios para mostrar." : ""}</p>
          )}
        </section>
      )}
      {activeTab === "manage_series" && (
        <section className="p-1 sm:p-6 bg-gray-800 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold mb-4 px-4 pt-4 sm:px-0 sm:pt-0">Gestionar Series</h2>
          
          <form
            onSubmit={e => {
              e.preventDefault();
              setVodCurrentPage(1);
              fetchVideosList(1, vodSearchTerm, "serie");
            }}
            className="flex flex-col sm:flex-row gap-4 items-center justify-between px-4 mb-6"
          >
            <Input
              type="text"
              placeholder="Buscar serie..."
              value={vodSearchTerm}
              onChange={e => setVodSearchTerm(e.target.value)}
              className="w-full sm:max-w-xs"
            />
            <Select
              value={vodFilterTipo}
              onChange={e => setVodFilterTipo(e.target.value)}
              className="w-full sm:max-w-xs"
            >
              <option value="serie">Todas las Series</option>
              {SERIES_SUBCATEGORIES.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </Select>

            <Button type="submit" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
              Buscar
            </Button>
          </form>

          {vodTotalCount > 0 && (
            <p className="text-sm text-gray-400 text-center sm:text-left px-4 mb-4">
              Mostrando {videos.length} de {vodTotalCount} series totales
            </p>
          )}

          {isLoading.vod ? (
            <div className="text-center py-10 text-gray-400">Cargando series...</div>
          ) : videos && videos.length > 0 ? (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
              {videos.map(vid => (
                <div key={vid.id || vid._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-700 hover:bg-gray-600/80 transition-colors rounded-md gap-3">
                  <img 
                    src={vid.customThumbnail || vid.logo || vid.thumbnail || vid.tmdbThumbnail || '/img/placeholder-thumbnail.png'} 
                    alt={vid.title || 'logo'} 
                    className="w-16 h-24 object-cover bg-black rounded-sm mr-0 sm:mr-3 flex-shrink-0 self-center sm:self-start border border-gray-600" 
                    onError={(e) => {e.currentTarget.src = '/img/placeholder-thumbnail.png';}}
                  />
                  <div className="flex-grow mb-2 sm:mb-0 text-sm min-w-0 text-center sm:text-left">
                    <strong className={`text-base block truncate ${!vid.active ? 'text-gray-500 line-through' : 'text-white'}`} title={vid.title || "Sin Título"}>
                      {vid.title || "Sin Título"}
                    </strong>
                    <p className="text-xs text-gray-500">
                      Subcategoría: <span className="text-gray-400">{vid.subcategoria || 'N/A'}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Capítulos: <span className="text-gray-400">{(vid.seasons || []).reduce((acc, season) => acc + (season.chapters?.length || 0), 0)}</span>
                    </p>

                    <p className="text-xs text-gray-500">
                      Planes: <span className="text-gray-400">{(Array.isArray(vid.requiresPlan) ? vid.requiresPlan : [vid.requiresPlan]).map(pKey => ALL_AVAILABLE_PLANS.find(p => p.key === (pKey === "basico" ? "gplay" : pKey))?.displayName || pKey).join(', ') || 'N/A'}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Géneros: <span className="text-gray-400">{Array.isArray(vid.genres) ? vid.genres.join(', ') : (vid.genres || 'N/A')}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {vid.active ? "Activo" : "Inactivo"} | {vid.isFeatured ? "Destacado" : "No Dest."}
                    </p>
                  </div>
                  <div className="flex flex-row sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2 flex-shrink-0 self-center sm:self-auto w-full sm:w-auto justify-around sm:justify-start">
                    <Button 
                      onClick={() => handleEditVodClick(vid)} 
                      className="flex-1 sm:flex-none bg-yellow-500 hover:bg-yellow-600 text-black text-xs px-3 py-1.5"
                    >
                      Editar
                    </Button>
                    <Button 
                      onClick={() => handleDeleteVodClick(vid.id || vid._id, vid.title)} 
                      isLoading={isSubmitting} 
                      className="flex-1 sm:flex-none bg-red-500 hover:bg-red-400 text-xs px-3 py-1.5"
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-10">{!errorMsg ? "No hay series para mostrar." : ""}</p>
          )}
        </section>
      )}

      {activeTab === "bulk_vod_upload" && (
       <section className="p-4 sm:p-6 bg-gray-800 rounded-lg shadow-xl max-w-lg mx-auto">
          <h2 className="text-2xl font-semibold mb-6 text-center">Carga Masiva de VODs</h2>
          <form onSubmit={handleBulkUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Categoría</label>
              <Select
                name="categoria"
                value={bulkCategoria}
                onChange={e => {
                  setBulkCategoria(e.target.value);
                  setBulkSubcategoria("");
                }}
                required
              >
                <option value="">Selecciona una categoría...</option>
                <option value="pelicula">Películas</option>
                <option value="serie">Series</option>
                <option value="anime">Animes</option>
                <option value="dorama">Dorama</option>
                <option value="novela">Novelas</option>
                <option value="documental">Documentales</option>
              </Select>
            </div>

            {(bulkCategoria === "pelicula" || bulkCategoria === "serie") && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Subcategoría</label>
                <Select
                  name="subcategoria"
                  value={bulkSubcategoria}
                  onChange={e => setBulkSubcategoria(e.target.value)}
                  required
                >
                  <option value="">Selecciona una subcategoría...</option>
                  {bulkCategoria === "pelicula" && (
                    <>
                      <option value="CINE_2026">CINE 2026</option>
                      <option value="CINE_2025">CINE 2025</option>
                      <option value="CINE_4K">CINE 4K</option>
                      <option value="CINE_60FPS">CINE 60 FPS</option>
                      <option value="POR_GENERO">POR GÉNEROS</option>
                    </>
                  )}
                  {bulkCategoria === "serie" && (
                    <>
                      {SERIES_SUBCATEGORIES.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </>
                  )}

                </Select>
              </div>
            )}

            <div>
              <label htmlFor="bulkVodFile" className="block text-sm font-medium text-gray-300 mb-1">
                Archivo M3U o texto con VODs
              </label>
              <Input
                type="file"
                id="bulkVodFile"
                name="bulkVodFile"
                accept=".m3u,.m3u8,.txt"
                onChange={handleBulkVodFileChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700"
              />
              {bulkVodFileNameDisplay && (
                <p className="text-xs text-gray-400 mt-1">
                  Archivo seleccionado: {bulkVodFileNameDisplay}
                </p>
              )}
            </div>

            {(uploadProgress > 0 || processingStatus) && (
              <div className="space-y-2">
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div 
                      className="bg-red-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}
                {processingStatus && (
                  <p className="text-sm text-gray-300 text-center animate-pulse">
                    {processingStatus}
                  </p>
                )}
              </div>
            )}

            <div className="bg-gray-700 p-4 rounded-md">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Formato esperado:</h3>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Películas: #EXTINF:-1,Título de la Película</li>
                <li>• Series: #EXTINF:-1,Título de la Serie S01E01</li>
                <li>• Incluir metadatos: tvg-logo, group-title, etc.</li>
                <li>• Una URL por entrada después de #EXTINF</li>
              </ul>
            </div>

            <Button
              type="submit"
              isLoading={isLoading.bulkVod}
              disabled={!bulkVodFile || isLoading.bulkVod || !bulkCategoria || ((bulkCategoria==="pelicula"||bulkCategoria==="serie") && !bulkSubcategoria)}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isLoading.bulkVod ? "Procesando..." : "Procesar Archivo"}
            </Button>
          </form>
        </section>
      )}

      {activeTab === "migration_panel" && <MigrationPanel />}

      {activeTab === "manage_mundial" && (
        <section className="space-y-8">
          <div id="match-form-container" className="p-4 sm:p-6 bg-gray-800 rounded-lg shadow-xl max-w-2xl mx-auto border border-red-500/20">
            <h2 className="text-2xl font-bold mb-6 text-center text-red-500">
              {editingMatchId ? "Editar Partido de Fixture" : "Agregar Nuevo Partido al Fixture"}
            </h2>
            
            <form onSubmit={handleSaveMatch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1">Selección 1</label>
                  <Select
                    name="equipo1"
                    value={matchForm.equipo1}
                    onChange={handleMatchFormChange}
                    required
                  >
                    {WORLD_CUP_TEAMS.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1">Selección 2</label>
                  <Select
                    name="equipo2"
                    value={matchForm.equipo2}
                    onChange={handleMatchFormChange}
                    required
                  >
                    {WORLD_CUP_TEAMS.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1">Fecha</label>
                  <Input
                    name="fecha"
                    type="text"
                    placeholder="Ej: 11 de Junio, 2026"
                    value={matchForm.fecha}
                    onChange={handleMatchFormChange}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1">Hora (Huso Horario Local/Sede)</label>
                  <Input
                    name="hora"
                    type="text"
                    placeholder="Ej: 14:00"
                    value={matchForm.hora}
                    onChange={handleMatchFormChange}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">Estadio y Sede</label>
                <Select
                  name="estadio"
                  value={matchForm.estadio}
                  onChange={handleMatchFormChange}
                  required
                >
                  {WORLD_CUP_STADIUMS.map(stadium => (
                    <option key={stadium} value={stadium}>{stadium}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">Fase del Torneo</label>
                <Select
                  name="fase"
                  value={matchForm.fase}
                  onChange={handleMatchFormChange}
                  required
                >
                  {WORLD_CUP_PHASES.map(phase => (
                    <option key={phase} value={phase}>{phase}</option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {BRACKET_SLOTS_BY_PHASE[matchForm.fase] ? (
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1">Llave / Slot del Bracket (Opcional)</label>
                    <Select
                      name="bracketKey"
                      value={matchForm.bracketKey || ""}
                      onChange={handleMatchFormChange}
                    >
                      <option value="">Ninguno (Automático por Nombres)</option>
                      {BRACKET_SLOTS_BY_PHASE[matchForm.fase].map(slot => (
                        <option key={slot.key} value={slot.key}>{slot.label}</option>
                      ))}
                    </Select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1">Grupo (A - L)</label>
                    <Select
                      name="grupo"
                      value={matchForm.grupo}
                      onChange={handleMatchFormChange}
                    >
                      <option value="">Ninguno (Fase Eliminatoria)</option>
                      {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].map(g => (
                        <option key={g} value={g}>Grupo {g}</option>
                      ))}
                    </Select>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1">Estado del Partido</label>
                  <Select
                    name="estado"
                    value={matchForm.estado}
                    onChange={handleMatchFormChange}
                    required
                  >
                    <option value="PRÓXIMO">PRÓXIMO (Próximamente)</option>
                    <option value="EN VIVO">EN VIVO (Jugándose)</option>
                    <option value="FINALIZADO">FINALIZADO (Concluido)</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1">Goles {matchForm.equipo1}</label>
                  <Input
                    name="goles1"
                    type="number"
                    min="0"
                    value={matchForm.goles1}
                    onChange={handleMatchFormChange}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1">Goles {matchForm.equipo2}</label>
                  <Input
                    name="goles2"
                    type="number"
                    min="0"
                    value={matchForm.goles2}
                    onChange={handleMatchFormChange}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  id="clave-match-checkbox"
                  name="clave"
                  type="checkbox"
                  checked={matchForm.clave}
                  onChange={handleMatchFormChange}
                  className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500 focus:ring-2 focus:ring-offset-gray-800"
                />
                <label htmlFor="clave-match-checkbox" className="text-sm font-semibold text-gray-300 cursor-pointer select-none">
                  ⭐ Destacar como Partido Clave (barra lateral derecha)
                </label>
              </div>

              <div className="border-t border-gray-700 pt-4 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <h3 className="text-md font-bold text-lime-400">
                    Asociar Canales de TV (Máx 3)
                  </h3>
                  <span className="text-xs text-gray-400 font-medium">
                    Seleccionados: {(matchForm.canales || []).length} / 3
                  </span>
                </div>
                
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar canal por nombre..."
                    id="match-channel-search"
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 text-sm text-white"
                    onChange={(e) => {
                      const value = e.target.value.toLowerCase();
                      const items = document.querySelectorAll(".channel-item-select");
                      items.forEach(item => {
                        const name = item.getAttribute("data-name").toLowerCase();
                        if (name.includes(value)) {
                          item.classList.remove("hidden");
                        } else {
                          item.classList.add("hidden");
                        }
                      });
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1 border border-gray-700/60 p-2 rounded bg-gray-900/40 custom-scrollbar">
                  {channels.map((ch) => {
                    const isSelected = (matchForm.canales || []).includes(ch.id || ch._id);
                    return (
                      <div
                        key={ch.id || ch._id}
                        data-name={ch.name || ""}
                        onClick={() => handleMatchChannelSelect(ch.id || ch._id)}
                        className={`channel-item-select p-2 rounded cursor-pointer border flex items-center space-x-2 transition-all select-none ${
                          isSelected
                            ? "bg-red-950/40 border-red-500 text-white"
                            : "bg-gray-800/80 border-gray-700 text-gray-300 hover:bg-gray-700/60 hover:text-white"
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full bg-black/40 flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/5">
                          <img
                            src={ch.logo || '/img/placeholder-thumbnail.png'}
                            alt={ch.name}
                            className="w-full h-full object-contain p-0.5"
                            onError={(e) => { e.currentTarget.src = '/img/placeholder-thumbnail.png'; }}
                          />
                        </div>
                        <span className="text-xs truncate flex-1 font-semibold">{ch.name}</span>
                        <div className={`w-3 h-3 rounded-full border flex items-center justify-center flex-shrink-0 ${
                          isSelected ? "bg-red-500 border-red-500" : "border-gray-500"
                        }`}>
                          {isSelected && (
                            <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {channels.length === 0 && (
                    <p className="text-xs text-gray-500 text-center col-span-full py-4">No se cargaron canales disponibles.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingMatchId ? "Guardar Cambios" : "Crear Partido"}
                </Button>
                {editingMatchId && (
                  <button
                    type="button"
                    onClick={handleClearMatchForm}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* NUEVO: Control de Llaves del Bracket */}
          <div className="p-4 sm:p-6 bg-gray-800 rounded-lg shadow-xl border border-lime-500/20">
            <h2 className="text-2xl font-bold mb-2 text-lime-400">Control de Llaves del Bracket (Fase Eliminatoria)</h2>
            <p className="text-xs text-slate-400 mb-6">
              Selecciona una ronda del bracket para ver los partidos proyectados con los clasificados actuales de la base de datos.
              Haz clic en "Programar Llave" o "Editar Programación" para configurar su fecha, hora y canales de transmisión rápidamente sin escribir nombres manualmente.
            </p>
            
            {/* Selector de ronda del bracket */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { key: 'dieciseisavos', label: 'Dieciseisavos' },
                { key: 'octavos', label: 'Octavos de Final' },
                { key: 'cuartos', label: 'Cuartos de Final' },
                { key: 'semis', label: 'Semifinales' },
                { key: 'final', label: 'Gran Final' }
              ].map(round => (
                <button
                  key={round.key}
                  type="button"
                  onClick={() => setSelectedBracketAdminRound(round.key)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                    selectedBracketAdminRound === round.key 
                      ? 'bg-lime-500 text-slate-950 font-black shadow-lg shadow-lime-500/20' 
                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {round.label}
                </button>
              ))}
            </div>

            {/* Listado de partidos en la ronda seleccionada */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(knockoutBracket[selectedBracketAdminRound] || []).map((slot) => {
                const isScheduled = resolvedMundialMatches.some(m => m.bracketKey === slot.id);
                
                return (
                  <div 
                    key={slot.id} 
                    className={`p-4 rounded-xl border flex flex-col justify-between transition ${
                      isScheduled 
                        ? 'bg-gray-900/80 border-lime-500/30' 
                        : 'bg-slate-800/40 border-slate-700/60 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 border-b border-slate-700 pb-2">
                        <span className="text-lime-400 font-extrabold uppercase bg-lime-950/30 px-1.5 py-0.5 rounded border border-lime-500/10">
                          {slot.id.toUpperCase()}
                        </span>
                        <span>
                          {isScheduled ? (
                            <span className="text-lime-400 font-bold">PROGRAMADO</span>
                          ) : (
                            <span className="text-yellow-400/80 font-bold">PENDIENTE</span>
                          )}
                        </span>
                      </div>

                      {/* Equipos */}
                      <div className="space-y-2 py-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200">{slot.equipo1}</span>
                          {isScheduled && (
                            <span className="text-xs font-black text-lime-400 font-mono bg-lime-950/20 px-1.5 py-0.5 rounded">{slot.goles1}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200">{slot.equipo2}</span>
                          {isScheduled && (
                            <span className="text-xs font-black text-lime-400 font-mono bg-lime-950/20 px-1.5 py-0.5 rounded">{slot.goles2}</span>
                          )}
                        </div>
                      </div>

                      {/* Info Programación */}
                      {isScheduled && (
                        <div className="text-[10px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-700/50 font-medium">
                          <p>📅 {slot.fecha} • 🕒 {slot.hora}</p>
                          {slot.associatedChannels && slot.associatedChannels.length > 0 && (
                            <p className="text-lime-400/90 font-semibold">📺 {slot.associatedChannels.length} canales vinculados</p>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleProgramBracketSlot(
                        slot.id, 
                        slot.equipo1, 
                        slot.equipo2,
                        selectedBracketAdminRound === 'dieciseisavos' ? 'Dieciseisavos de Final' :
                        selectedBracketAdminRound === 'octavos' ? 'Octavos de Final' :
                        selectedBracketAdminRound === 'cuartos' ? 'Cuartos de Final' :
                        selectedBracketAdminRound === 'semis' ? 'Semifinal' : 'Gran Final'
                      )}
                      className={`w-full mt-4 py-2 rounded-lg text-xs font-bold transition ${
                        isScheduled 
                          ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30 hover:bg-lime-500 hover:text-slate-950' 
                          : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500 hover:text-slate-950'
                      }`}
                    >
                      {isScheduled ? 'Editar Programación' : 'Programar Llave'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 sm:p-6 bg-gray-800 rounded-lg shadow-xl">
            <h2 className="text-2xl font-semibold mb-6">Fixture Programado del Mundial</h2>
            
            {resolvedMundialMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resolvedMundialMatches.map((match) => {
                  const associatedChannels = match.associatedChannels || [];

                  return (
                    <div
                      key={match.id}
                      className="bg-gray-700/80 hover:bg-gray-700 transition-colors border border-gray-600/50 p-4 rounded-xl flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs text-gray-400 font-bold border-b border-gray-600 pb-2">
                          <span className="flex items-center gap-1.5 flex-wrap">
                            {match.fase}
                            {match.bracketKey && (
                              <span className="text-[10px] text-lime-400 font-extrabold uppercase bg-lime-950/45 px-1.5 py-0.5 rounded border border-lime-500/20">
                                Llave: {match.bracketKey.toUpperCase()}
                              </span>
                            )}
                          </span>
                          <span className="text-red-400 font-mono">{match.hora}</span>
                        </div>
                        
                        <div className="flex items-center justify-between py-2">
                          <div className="flex items-center space-x-2">
                            <img
                              src={`https://flagcdn.com/w40/${countryToCode[match.equipo1] || 'un'}.png`}
                              alt={match.equipo1}
                              className="w-6 h-4 object-cover rounded shadow-sm border border-white/10"
                              onError={(e) => { e.currentTarget.src = 'https://flagcdn.com/w40/un.png'; }}
                            />
                            <span className="font-bold text-sm text-slate-200">{match.equipo1}</span>
                          </div>
                          
                          <span className="text-xs font-black text-slate-500 px-2 select-none">VS</span>
                          
                          <div className="flex items-center space-x-2 flex-row-reverse">
                            <img
                              src={`https://flagcdn.com/w40/${countryToCode[match.equipo2] || 'un'}.png`}
                              alt={match.equipo2}
                              className="w-6 h-4 object-cover rounded shadow-sm border border-white/10 ml-2"
                              onError={(e) => { e.currentTarget.src = 'https://flagcdn.com/w40/un.png'; }}
                            />
                            <span className="font-bold text-sm text-slate-200">{match.equipo2}</span>
                          </div>
                        </div>

                        <div className="text-xs text-gray-400 space-y-1">
                          <p>📅 {match.fecha}</p>
                          <p>📍 {match.estadio}</p>
                        </div>

                        {associatedChannels.length > 0 ? (
                          <div className="pt-2 border-t border-gray-600/40">
                            <p className="text-[10px] uppercase tracking-widest text-lime-400 font-bold mb-1.5">
                              Canales Vinculados:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {associatedChannels.map(ch => (
                                <span
                                  key={ch.id || ch._id}
                                  className="inline-flex items-center bg-gray-900/60 border border-gray-600 px-2 py-0.5 rounded text-[10px] text-gray-300 font-semibold"
                                >
                                  <img
                                    src={ch.logo || '/img/placeholder-thumbnail.png'}
                                    alt=""
                                    className="w-3.5 h-3.5 object-contain mr-1 bg-black/20 rounded-full"
                                    onError={(e) => { e.currentTarget.src = '/img/placeholder-thumbnail.png'; }}
                                  />
                                  {ch.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="pt-2 border-t border-gray-600/40">
                            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                              Sin canales vinculados
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-600/30">
                        <Button
                          onClick={() => handleEditMatch(match)}
                          className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black text-xs py-1.5 rounded-lg"
                        >
                          Editar
                        </Button>
                        <Button
                          onClick={() => handleDeleteMatch(match.id)}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-xs py-1.5 rounded-lg text-white"
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8 bg-gray-900/20 border border-dashed border-gray-700 rounded-xl">
                No hay partidos registrados en el fixture. Utiliza el formulario superior para agregar uno.
              </p>
            )}
          </div>
        </section>
      )}

      {activeTab === "migration_panel" && <MigrationPanel />}

    </div>
  );
}
