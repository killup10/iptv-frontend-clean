import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import axiosInstance from "../utils/axiosInstance.js";

const AVATAR_CATEGORIES = [
  {
    id: "Aventura",
    style: "adventurer",
    seeds: ["adv1", "adv2", "adv3", "adv4", "adv5", "adv6", "adv7", "adv8"]
  },
  {
    id: "Neutral",
    style: "adventurer-neutral",
    seeds: ["neu1", "neu2", "neu3", "neu4", "neu5", "neu6", "neu7", "neu8"]
  },
  {
    id: "Big Ears",
    style: "big-ears",
    seeds: ["bear1", "bear2", "bear3", "bear4", "bear5", "bear6", "bear7", "bear8"]
  }
];

const DEFAULT_AVATAR = "https://api.dicebear.com/9.x/adventurer/svg?seed=adv1";

const BG_COLORS = [
  "24 95% 53%",   // Naranja
  "215 25% 27%",  // Gris Oscuro
  "38 92% 50%",   // Dorado
  "142 71% 45%",  // Verde
  "199 89% 48%",  // Celeste
  "285 65% 60%",  // Violeta
  "25 100% 50%",  // Naranja Intenso
  "322 75% 50%",  // Fucsia
];

export default function Profiles() {
  const { user, selectProfile } = useAuth();
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState([]);
  const [maxProfiles, setMaxProfiles] = useState(2);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Aventura");

  // Modales y Formularios
  const [activeModal, setActiveModal] = useState(null); // 'create' | 'edit' | 'pin'
  const [selectedProfile, setSelectedProfile] = useState(null);

  // Estado del Formulario
  const [formData, setFormData] = useState({
    name: "",
    avatar: DEFAULT_AVATAR,
    color: BG_COLORS[0],
    isKids: false,
    pin: "",
    removePin: false,
  });

  // Estado de Seguridad PIN
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const pinRefs = useRef([]);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get("/api/profiles");
      setProfiles(response.data.profiles || []);
      setMaxProfiles(response.data.maxProfiles || 2);
    } catch (err) {
      console.error("Error al obtener perfiles:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (profile) => {
    if (isEditingMode) {
      // Abrir modal de edición
      setSelectedProfile(profile);
      setFormData({
        name: profile.name,
        avatar: profile.avatar || DEFAULT_AVATAR,
        color: profile.color || BG_COLORS[0],
        isKids: profile.isKids || false,
        pin: "",
        removePin: false,
      });
      setActiveModal("edit");
    } else {
      // Cargar perfil
      if (profile.hasPin) {
        setSelectedProfile(profile);
        setPinInput("");
        setPinError("");
        setActiveModal("pin");
      } else {
        proceedWithProfile(profile);
      }
    }
  };

  const proceedWithProfile = (profile) => {
    selectProfile(profile);
    navigate("/");
  };

  // Crear Perfil
  const handleOpenCreate = () => {
    const nextPresetIndex = profiles.length % 8;
    const defaultAv = `https://api.dicebear.com/9.x/adventurer/svg?seed=adv${nextPresetIndex + 1}`;
    setFormData({
      name: "",
      avatar: defaultAv,
      color: BG_COLORS[nextPresetIndex],
      isKids: false,
      pin: "",
      removePin: false,
    });
    setActiveModal("create");
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      const response = await axiosInstance.post("/api/profiles", {
        name: formData.name.trim(),
        avatar: formData.avatar,
        color: formData.color,
        isKids: formData.isKids,
        pin: formData.pin || null,
      });
      setProfiles([...profiles, response.data]);
      setActiveModal(null);
    } catch (err) {
      alert(err.response?.data?.error || "Error al crear perfil");
    }
  };

  // Editar Perfil
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      const response = await axiosInstance.put(`/api/profiles/${selectedProfile._id}`, {
        name: formData.name.trim(),
        avatar: formData.avatar,
        color: formData.color,
        isKids: formData.isKids,
        pin: formData.pin || null,
        removePin: formData.removePin,
      });

      setProfiles(
        profiles.map((p) => (p._id === selectedProfile._id ? response.data : p))
      );
      setActiveModal(null);
    } catch (err) {
      alert(err.response?.data?.error || "Error al guardar perfil");
    }
  };

  // Eliminar Perfil
  const handleDeleteProfile = async () => {
    if (selectedProfile.isOwner) {
      alert("No se puede eliminar el perfil principal.");
      return;
    }
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el perfil "${selectedProfile.name}"? Se perderá todo su historial.`)) {
      return;
    }

    try {
      await axiosInstance.delete(`/api/profiles/${selectedProfile._id}`);
      setProfiles(profiles.filter((p) => p._id !== selectedProfile._id));
      setActiveModal(null);
    } catch (err) {
      alert(err.response?.data?.error || "Error al eliminar perfil");
    }
  };

  // Verificar PIN
  const handlePinSubmit = async (e) => {
    e?.preventDefault();
    if (pinInput.length < 4) return;

    try {
      const response = await axiosInstance.post(`/api/profiles/${selectedProfile._id}/verify-pin`, {
        pin: pinInput,
      });
      if (response.data.valid) {
        setActiveModal(null);
        proceedWithProfile(selectedProfile);
      } else {
        setPinInput("");
        setPinError("PIN incorrecto. Intenta de nuevo.");
      }
    } catch (err) {
      setPinInput("");
      setPinError("PIN incorrecto o error al validar.");
    }
  };

  const handleKeypadPress = (val) => {
    setPinError("");
    if (val === "delete") {
      setPinInput(pinInput.slice(0, -1));
    } else if (pinInput.length < 4) {
      const nextPin = pinInput + val;
      setPinInput(nextPin);
      if (nextPin.length === 4) {
        // Enviar automáticamente al completar los 4 dígitos
        setTimeout(() => {
          verifyPinDirectly(nextPin);
        }, 100);
      }
    }
  };

  const verifyPinDirectly = async (pinCode) => {
    try {
      const response = await axiosInstance.post(`/api/profiles/${selectedProfile._id}/verify-pin`, {
        pin: pinCode,
      });
      if (response.data.valid) {
        setActiveModal(null);
        proceedWithProfile(selectedProfile);
      } else {
        setPinInput("");
        setPinError("PIN incorrecto. Intenta de nuevo.");
      }
    } catch (err) {
      setPinInput("");
      setPinError("PIN incorrecto o error de red.");
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] text-white flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans select-none">
      {/* Background glowing mesh gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-fuchsia-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-4xl w-full text-center z-10 animate-fade-in py-12">
        <h1 className="text-3xl sm:text-5xl font-black mb-10 tracking-tight drop-shadow-md">
          {isEditingMode ? "Administrar Perfiles" : "¿Quién está viendo?"}
        </h1>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 mb-14">
            {profiles.map((profile) => (
              <div
                key={profile._id}
                onClick={() => handleSelect(profile)}
                className="group flex flex-col items-center cursor-pointer focus:outline-none"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleSelect(profile)}
              >
                {/* Avatar Outer Double-Bezel Enclosure */}
                <div className="relative p-1.5 rounded-[1.8rem] bg-white/5 border border-white/10 group-hover:border-fuchsia-500/50 group-hover:scale-105 active:scale-[0.98] transition-all duration-300 shadow-xl">
                  {/* Inner Container with HSL color border/shadow */}
                  <div
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-[1.4rem] overflow-hidden flex items-center justify-center relative shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]"
                    style={{
                      backgroundColor: `hsl(${profile.color || "263 64% 15%"})`,
                    }}
                  >
                    <img
                      src={profile.avatar}
                      alt={profile.name}
                      className="w-[85%] h-[85%] object-contain"
                    />

                    {/* Edit mode pencil overlay */}
                    {isEditingMode && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-[1.4rem]">
                        <svg
                          className="w-8 h-8 text-white drop-shadow"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Kids Badge */}
                  {profile.isKids && (
                    <span className="absolute -top-2 -right-2 bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md shadow-md border border-cyan-300">
                      Kids
                    </span>
                  )}

                  {/* Lock PIN badge */}
                  {profile.hasPin && !isEditingMode && (
                    <span className="absolute -bottom-1 -right-1 bg-gray-900 border border-white/20 p-1.5 rounded-full shadow-lg">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </span>
                  )}
                </div>

                {/* Profile Name */}
                <span className="mt-4 text-base sm:text-lg font-bold text-gray-300 group-hover:text-white transition duration-200">
                  {profile.name}
                </span>
              </div>
            ))}

            {/* Create Profile Card */}
            {!isEditingMode && profiles.length < maxProfiles && (
              <div
                onClick={handleOpenCreate}
                className="group flex flex-col items-center cursor-pointer focus:outline-none"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleOpenCreate()}
              >
                <div className="p-1.5 rounded-[1.8rem] bg-white/[0.02] border border-dashed border-white/20 group-hover:border-cyan-500/50 group-hover:scale-105 active:scale-[0.98] transition-all duration-300">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[1.4rem] flex items-center justify-center bg-white/[0.04]">
                    <svg
                      className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 group-hover:text-cyan-400 transition duration-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </div>
                </div>
                <span className="mt-4 text-base sm:text-lg font-bold text-gray-400 group-hover:text-white transition duration-200">
                  Agregar Perfil
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setIsEditingMode(!isEditingMode)}
            className={`border px-6 py-3 rounded-full text-sm font-bold tracking-wider uppercase transition-all duration-300 active:scale-95 ${
              isEditingMode
                ? "bg-white text-black border-white hover:bg-gray-200"
                : "border-white/30 text-gray-400 hover:text-white hover:border-white bg-white/5"
            }`}
          >
            {isEditingMode ? "Listo" : "Administrar Perfiles"}
          </button>
        </div>
      </div>

      {/* CREATE PROFILE MODAL */}
      {activeModal === "create" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setActiveModal(null)} />
          <div className="relative bg-[#0b0816] border border-white/10 p-8 rounded-[2rem] max-w-md w-full shadow-2xl z-10 animate-scale-up">
            <h2 className="text-2xl font-bold mb-6 text-center">Crear Perfil</h2>
            <form onSubmit={handleCreateSubmit} className="space-y-6">
              {/* Avatar & Color Picker Preview */}
              <div className="flex justify-center items-center gap-4">
                <div
                  className="w-20 h-20 rounded-[1.2rem] flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: `hsl(${formData.color})` }}
                >
                  <img src={formData.avatar} className="w-[85%] h-[85%]" alt="Preview" />
                </div>
                <div className="flex-grow flex-1">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                    Elegir Avatar
                  </label>
                  {/* Category Buttons */}
                  <div className="flex gap-1 mb-2 bg-white/5 p-1 rounded-lg">
                    {AVATAR_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategory(cat.id)}
                        className={`flex-1 text-[10px] font-bold py-1 rounded-md transition ${
                          activeCategory === cat.id
                            ? "bg-fuchsia-600 text-white"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        {cat.id}
                      </button>
                    ))}
                  </div>
                  {/* Grid of Avatars for selected category */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {(AVATAR_CATEGORIES.find((c) => c.id === activeCategory)?.seeds || []).map((seed, idx) => {
                      const avUrl = `https://api.dicebear.com/9.x/${
                        AVATAR_CATEGORIES.find((c) => c.id === activeCategory).style
                      }/svg?seed=${seed}`;
                      return (
                        <button
                          key={seed}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              avatar: avUrl,
                              color: BG_COLORS[idx % BG_COLORS.length],
                            })
                          }
                          className={`w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center p-0.5 border-2 transition ${
                            formData.avatar === avUrl
                              ? "border-fuchsia-500 scale-105 bg-white/10"
                              : "border-transparent bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          <img src={avUrl} className="w-full h-full object-contain" alt="" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Nombre del Perfil
                </label>
                <input
                  type="text"
                  maxLength={18}
                  placeholder="Ej. Juan, Kids, etc."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 rounded-xl px-4 py-3 text-white outline-none transition"
                  required
                />
              </div>

              {/* Kids Mode Toggle */}
              <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                <div>
                  <h4 className="text-sm font-bold">Perfil Infantil</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Filtra contenido para niños</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isKids: !formData.isKids })}
                  className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${
                    formData.isKids ? "bg-cyan-500" : "bg-white/10"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-black shadow-md transition-transform duration-300 ${
                      formData.isKids ? "translate-x-6 bg-white" : ""
                    }`}
                  />
                </button>
              </div>

              {/* PIN Code */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  PIN de Acceso (Opcional - 4 números)
                </label>
                <input
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="Escribe 4 dígitos"
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, "") })}
                  className="w-full bg-white/5 border border-white/10 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 rounded-xl px-4 py-3 text-white font-mono tracking-[0.4em] text-center outline-none transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-1/2 border border-white/10 hover:bg-white/5 rounded-full py-3 text-sm font-bold text-gray-400 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!formData.name.trim()}
                  className="w-1/2 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 disabled:opacity-50 disabled:pointer-events-none rounded-full py-3 text-sm font-bold transition shadow-lg shadow-fuchsia-950/40"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {activeModal === "edit" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setActiveModal(null)} />
          <div className="relative bg-[#0b0816] border border-white/10 p-8 rounded-[2rem] max-w-md w-full shadow-2xl z-10 animate-scale-up">
            <h2 className="text-2xl font-bold mb-6 text-center">Editar Perfil</h2>
            <form onSubmit={handleEditSubmit} className="space-y-5">
              {/* Avatar & Color Picker Preview */}
              <div className="flex justify-center items-center gap-4">
                <div
                  className="w-20 h-20 rounded-[1.2rem] flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: `hsl(${formData.color})` }}
                >
                  <img src={formData.avatar} className="w-[85%] h-[85%]" alt="Preview" />
                </div>
                <div className="flex-grow flex-1">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                    Elegir Avatar
                  </label>
                  {/* Category Buttons */}
                  <div className="flex gap-1 mb-2 bg-white/5 p-1 rounded-lg">
                    {AVATAR_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategory(cat.id)}
                        className={`flex-1 text-[10px] font-bold py-1 rounded-md transition ${
                          activeCategory === cat.id
                            ? "bg-fuchsia-600 text-white"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        {cat.id}
                      </button>
                    ))}
                  </div>
                  {/* Grid of Avatars for selected category */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {(AVATAR_CATEGORIES.find((c) => c.id === activeCategory)?.seeds || []).map((seed, idx) => {
                      const avUrl = `https://api.dicebear.com/9.x/${
                        AVATAR_CATEGORIES.find((c) => c.id === activeCategory).style
                      }/svg?seed=${seed}`;
                      return (
                        <button
                          key={seed}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              avatar: avUrl,
                              color: BG_COLORS[idx % BG_COLORS.length],
                            })
                          }
                          className={`w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center p-0.5 border-2 transition ${
                            formData.avatar === avUrl
                              ? "border-fuchsia-500 scale-105 bg-white/10"
                              : "border-transparent bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          <img src={avUrl} className="w-full h-full object-contain" alt="" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Nombre del Perfil
                </label>
                <input
                  type="text"
                  maxLength={18}
                  placeholder="Ej. Juan, Kids, etc."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 rounded-xl px-4 py-3 text-white outline-none transition"
                  required
                />
              </div>

              {/* Kids Mode Toggle */}
              <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                <div>
                  <h4 className="text-sm font-bold">Perfil Infantil</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Filtra contenido para niños</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isKids: !formData.isKids })}
                  className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${
                    formData.isKids ? "bg-cyan-500" : "bg-white/10"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-black shadow-md transition-transform duration-300 ${
                      formData.isKids ? "translate-x-6 bg-white" : ""
                    }`}
                  />
                </button>
              </div>

              {/* Security PIN Option */}
              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold">PIN de Seguridad</h4>
                    <p className="text-xs text-gray-400 mt-0.5">Protege el acceso a este perfil</p>
                  </div>
                  {selectedProfile.hasPin && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, removePin: !formData.removePin })}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full transition ${
                        formData.removePin
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {formData.removePin ? "Remover PIN" : "Quitar PIN"}
                    </button>
                  )}
                </div>

                {!formData.removePin && (
                  <input
                    type="text"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder={selectedProfile.hasPin ? "Escribe para cambiar PIN" : "Configurar 4 dígitos"}
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, "") })}
                    className="w-full bg-black/30 border border-white/10 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 rounded-xl px-4 py-2.5 text-white font-mono tracking-[0.4em] text-center outline-none transition"
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="w-1/2 border border-white/10 hover:bg-white/5 rounded-full py-3 text-sm font-bold text-gray-400 hover:text-white transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.name.trim()}
                    className="w-1/2 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 disabled:opacity-50 disabled:pointer-events-none rounded-full py-3 text-sm font-bold transition shadow-lg shadow-fuchsia-950/40"
                  >
                    Guardar
                  </button>
                </div>

                {!selectedProfile.isOwner && (
                  <button
                    type="button"
                    onClick={handleDeleteProfile}
                    className="w-full mt-2 bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-full py-2.5 text-xs font-bold transition"
                  >
                    Eliminar Perfil
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECURITY PIN VERIFICATION MODAL */}
      {activeModal === "pin" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-lg" />
          <div className="relative p-6 max-w-sm w-full text-center z-10 animate-fade-in">
            <h2 className="text-xl font-bold mb-1 text-white">Introduce tu PIN</h2>
            <p className="text-xs text-gray-400 mb-6">El perfil de {selectedProfile?.name} está bloqueado</p>

            {/* Bullets visual cue */}
            <div className="flex justify-center gap-4 mb-8">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border border-white/30 transition-all duration-200 ${
                    pinInput.length > idx
                      ? "bg-fuchsia-500 scale-110 shadow-[0_0_8px_rgba(217,70,239,0.7)]"
                      : "bg-transparent"
                  }`}
                />
              ))}
            </div>

            {pinError && <p className="text-red-400 text-xs font-bold mb-4 animate-shake">{pinError}</p>}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num)}
                  className="w-16 h-16 rounded-full bg-white/5 border border-white/10 hover:border-fuchsia-500/50 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 active:scale-90 flex items-center justify-center text-xl font-bold transition duration-150"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-16 h-16 rounded-full bg-transparent flex items-center justify-center text-xs font-bold text-gray-400 hover:text-white"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress(0)}
                className="w-16 h-16 rounded-full bg-white/5 border border-white/10 hover:border-fuchsia-500/50 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 active:scale-90 flex items-center justify-center text-xl font-bold transition duration-150"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress("delete")}
                className="w-16 h-16 rounded-full bg-white/5 border border-white/10 hover:border-red-500/50 hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500 active:scale-90 flex items-center justify-center text-sm font-bold transition duration-150 text-red-400"
              >
                ⌫
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
