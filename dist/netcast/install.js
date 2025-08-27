// Media Station X Installation Script for TeamG Play
// Este script facilita la instalación en LG NetCast via Media Station X

var MediaStationX = {
    appInfo: {
        id: "com.teamg.play.netcast",
        name: "TeamG Play TV",
        version: "1.0.0",
        description: "La mejor experiencia de streaming para LG NetCast",
        icon: "TeamG Play.png",
        category: "Entertainment"
    },
    
    // Configuración específica para Media Station X
    config: {
        resolution: "1920x1080",
        orientation: "landscape",
        transparent: false,
        audio: true,
        video: true,
        network: true,
        storage: true,
        mediastation: true
    },
    
    // Función de instalación
    install: function() {
        try {
            console.log("Iniciando instalación de TeamG Play en Media Station X...");
            
            // Verificar compatibilidad con NetCast
            if (typeof NetCastBack !== 'undefined' && typeof NetCastExit !== 'undefined') {
                console.log("✓ Plataforma NetCast detectada");
                
                // Registrar la aplicación en Media Station X
                if (typeof MediaStationAPI !== 'undefined') {
                    MediaStationAPI.registerApp(this.appInfo);
                    console.log("✓ Aplicación registrada en Media Station X");
                    return true;
                } else {
                    console.log("⚠ Media Station X API no disponible, usando instalación estándar");
                    return this.standardInstall();
                }
            } else {
                console.log("⚠ Plataforma NetCast no detectada, continuando con instalación web");
                return this.webInstall();
            }
        } catch (error) {
            console.error("Error durante la instalación:", error);
            return false;
        }
    },
    
    // Instalación estándar para NetCast
    standardInstall: function() {
        console.log("Usando instalación estándar NetCast...");
        
        // Configurar eventos NetCast
        window.addEventListener('load', function() {
            console.log("TeamG Play cargado correctamente en NetCast");
        });
        
        return true;
    },
    
    // Instalación web fallback
    webInstall: function() {
        console.log("Usando instalación web fallback...");
        return true;
    },
    
    // Función de desinstalación
    uninstall: function() {
        try {
            if (typeof MediaStationAPI !== 'undefined') {
                MediaStationAPI.unregisterApp(this.appInfo.id);
                console.log("✓ Aplicación desregistrada de Media Station X");
            }
            return true;
        } catch (error) {
            console.error("Error durante la desinstalación:", error);
            return false;
        }
    }
};

// Auto-ejecutar instalación cuando se carga el script
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function() {
        MediaStationX.install();
    });
}

// Exportar para uso en otros scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MediaStationX;
}
