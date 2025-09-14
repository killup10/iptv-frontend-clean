import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import axiosInstance from "@/utils/axiosInstance.js";
import {
  fetchAdminChannels, createAdminChannel, updateAdminChannel,
  deleteAdminChannel, processM3UForAdmin,
  createAdminVideo, updateAdminVideo, deleteAdminVideo,
  fetchAdminUsers, updateAdminUserPlan, updateAdminUserStatus
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
  { key: "CINE_2025", displayName: "CINE 2025 (Estrenos)"},
  { key: "CINE_4K", displayName: "CINE 4K UHD"},
  { key: "CINE_60FPS", displayName: "CINE 60 FPS"},
];

const SERIES_SUBCATEGORIES = [ "Netflix", "Prime Video", "Disney", "Apple TV", "HBO MAX", "Hulu y Otros", "Retro", "Animadas", "ZONA KIDS" ];

const ALL_AVAILABLE_PLANS = [

  { key: "gplay", displayName: "GPlay" },
  { key: "estandar", displayName: "Estándar" },
  { key: "cinefilo", displayName: "Cinéfilo" },
  { key: "sports", displayName: "Sports" },
  { key: "premium", displayName: "Premium" },
];

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
    subcategoria: "Netflix"
  });



  const [channels, setChannels] = useState([]);
  const [videos, setVideos] = useState([]);
  // Información temporal de arrastre (drag): { fromSeason, fromChapter }
  const [dragInfo, setDragInfo] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState({ channels: false, vod: false, m3u: false, users: false });
  const [activeTab, setActiveTab] = useState("manage_users");
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
      logo: "", 
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
      subcategoria: "Netflix"
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
    setVodForm({ 
      title: video.title || "", 
      url: video.url || "", 
      logo: video.logo || video.thumbnail || "", 
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
      subcategoria: video.subcategoria || "Netflix"
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
  // --- FIN LÓGICA USUARIOS ---

 useEffect(() => {
    if (user?.token && user?.role === 'admin') {
        setSelectedVods([]);
        const vodTabInfo = VOD_MANAGEMENT_TABS.find(tab => tab.value === activeTab);

        if (vodTabInfo) {
            const tipoParaFiltrar = vodTabInfo.tipo;
            setVodFilterTipo(tipoParaFiltrar); 
            fetchVideosList(1, vodSearchTerm, tipoParaFiltrar);
        } else if (activeTab === "manage_channels" || activeTab === "m3u_to_channels") {
            fetchChannelsList();
        } else if (activeTab === "manage_users") {
            fetchAdminUsersList();
        }

        if (activeTab === "add_channel" && !channelId) clearChannelForm();
        if (activeTab === "add_vod" && !vodId) clearVodForm();
    }
}, [activeTab, user?.token, user?.role, fetchVideosList, fetchChannelsList, fetchAdminUsersList, clearChannelForm, clearVodForm, vodSearchTerm]);



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

            <Input name="logo" type="url" placeholder="URL del Poster/Logo (vertical)" value={vodForm.logo} onChange={handleVodFormChange} />
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
            </div>
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
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                    <div>
                      <p className="text-white font-semibold text-lg">{usr.username} ({usr.role})</p>
                      <p className="text-gray-400 text-sm mb-2">Plan actual: {ALL_AVAILABLE_PLANS.find(p => p.key === (usr.plan === "basico" ? "gplay" : usr.plan))?.displayName || usr.plan}</p>
                      <Select
                        value={usr.plan === "basico" ? "gplay" : usr.plan}
                        onChange={(e) => handleUserPlanChange(usr._id, e.target.value)}
                        disabled={isSubmitting}
                        className="text-xs py-1.5 bg-gray-700"
                      >
                        {ALL_AVAILABLE_PLANS.map(plan => (
                          <option key={plan.key} value={plan.key}>{plan.displayName}</option>
                        ))}
                      </Select>
                      <div className="mt-2">
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
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <AdminUserDevices userId={usr._id} username={usr.username} />
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

    </div>
  );
}
