import React, { useState, useEffect, useRef } from 'react';
import { registerPlugin, Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

// Register the custom native plugin
const AppUpdate = registerPlugin('AppUpdatePlugin');

export default function UpdateModal({ isOpen, latestVersion, notes, downloadUrl, onClose }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [needsPermissionRedirect, setNeedsPermissionRedirect] = useState(false);
  
  const updateBtnRef = useRef(null);
  const cancelBtnRef = useRef(null);
  const isAndroid = Capacitor.getPlatform() === 'android';

  // Focus the update button when the modal opens (crucial for TV D-Pad support)
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (updateBtnRef.current) {
          updateBtnRef.current.focus();
        }
      }, 300);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdate = async () => {
    setError('');
    
    if (isAndroid) {
      try {
        setIsDownloading(true);
        setStatusMessage('Verificando permisos de instalación...');
        
        // 1. Check native package install permissions
        const { granted } = await AppUpdate.checkInstallPermission();
        if (!granted) {
          setStatusMessage('Se requiere permiso para instalar actualizaciones de fuentes externas. Abriendo ajustes...');
          setNeedsPermissionRedirect(true);
          
          // Open settings after 2 seconds
          setTimeout(async () => {
            await AppUpdate.requestInstallPermission();
            setIsDownloading(false);
            setStatusMessage('Por favor, activa el permiso para "Instalar apps desconocidas" en ajustes y regresa a la app.');
          }, 2000);
          return;
        }

        // 2. Setup download listener to update progress bar
        setStatusMessage('Iniciando descarga en segundo plano...');
        setDownloadProgress(0);
        
        let progressListener;
        try {
          progressListener = await Filesystem.addListener('downloadProgress', (progress) => {
            const percent = Math.round((progress.bytesWritten / progress.contentLength) * 100);
            setDownloadProgress(isNaN(percent) ? 0 : percent);
            setStatusMessage(`Descargando actualización: ${percent}%`);
          });
        } catch (listenerError) {
          console.warn('Could not add download progress listener:', listenerError);
        }

        // 3. Download the APK file to cache directory
        const downloadResult = await Filesystem.downloadFile({
          url: downloadUrl,
          path: 'update.apk',
          directory: Directory.Cache,
          progress: true
        });

        if (progressListener) {
          progressListener.remove();
        }

        // 4. Trigger native APK installation
        setStatusMessage('Descarga completada. Abriendo instalador...');
        await AppUpdate.installApk({ filePath: downloadResult.path });
        setIsDownloading(false);
        onClose();
      } catch (err) {
        console.error('Update error:', err);
        setError('Error al procesar la actualización: ' + (err.message || err));
        setIsDownloading(false);
      }
    } else {
      // Desktop / Web browser update fallback
      try {
        setStatusMessage('Abriendo enlace de descarga...');
        window.open(downloadUrl, '_blank');
        onClose();
      } catch (err) {
        setError('No se pudo abrir el enlace de actualización.');
      }
    }
  };

  const handleRetryPermission = async () => {
    setNeedsPermissionRedirect(false);
    handleUpdate();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      
      {/* Modal Card - Glassmorphism & Cyber-glow */}
      <div className="relative w-full max-w-md bg-gradient-to-br from-[#0c1024] to-[#040610] border border-cyan-500/30 rounded-3xl p-6 md:p-8 text-white shadow-[0_0_50px_rgba(6,182,212,0.15)] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
        
        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl">
            <svg className="w-6 h-6 text-cyan-400 animate-bounce" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight italic bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              Actualización Disponible
            </h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Nueva versión: v{latestVersion}</p>
          </div>
        </div>

        {/* Change Notes */}
        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-6 text-sm text-gray-300">
          <p className="font-extrabold uppercase text-[10px] tracking-wider text-cyan-400 mb-1.5">Novedades de esta versión:</p>
          <p className="leading-relaxed text-xs">{notes}</p>
        </div>

        {/* Status / Progress Indicator */}
        {isDownloading && (
          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-400">
              <span className="truncate max-w-[280px]">{statusMessage}</span>
              {downloadProgress > 0 && <span className="font-mono text-cyan-400">{downloadProgress}%</span>}
            </div>
            {downloadProgress > 0 ? (
              <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            ) : (
              <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
                <div className="h-full w-1/3 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full absolute animate-infinite-loading" />
              </div>
            )}
          </div>
        )}

        {/* Permission retry block */}
        {needsPermissionRedirect && !isDownloading && (
          <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl text-xs text-yellow-400 space-y-3">
            <p>⚠️ Para auto-actualizar, debes habilitar la opción de <strong>Instalar Aplicaciones Desconocidas</strong> para TeamG Play.</p>
            <button
              onClick={handleRetryPermission}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-xl font-bold transition focus:ring-2 focus:ring-yellow-400 outline-none"
            >
              Hacer clic tras dar el permiso
            </button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          {!isDownloading && !needsPermissionRedirect ? (
            <>
              <button
                ref={updateBtnRef}
                onClick={handleUpdate}
                className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black py-3 rounded-2xl font-bold uppercase tracking-wider text-xs transition duration-200 focus:scale-[1.03] focus:ring-4 focus:ring-cyan-500/40 focus:border-cyan-400 border border-transparent outline-none cursor-pointer"
                tabIndex={0}
              >
                Actualizar Ahora
              </button>
              <button
                ref={cancelBtnRef}
                onClick={onClose}
                className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 py-3 rounded-2xl font-bold uppercase tracking-wider text-xs transition duration-200 focus:scale-[1.03] focus:ring-4 focus:ring-white/10 border border-white/5 outline-none cursor-pointer"
                tabIndex={0}
              >
                Recordar más tarde
              </button>
            </>
          ) : (
            <button
              disabled
              className="w-full bg-white/5 text-gray-500 py-3 rounded-2xl font-bold uppercase tracking-wider text-xs border border-white/5 cursor-not-allowed"
            >
              Procesando actualización...
            </button>
          )}
        </div>

      </div>
      
      {/* Indeterminate loading animation style override */}
      <style>{`
        @keyframes infinite-loading {
          0% { left: -33%; }
          100% { left: 100%; }
        }
        .animate-infinite-loading {
          animation: infinite-loading 1.5s infinite linear;
        }
      `}</style>
    </div>
  );
}
