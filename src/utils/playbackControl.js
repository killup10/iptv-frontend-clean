import VideoPlayerPlugin from "../plugins/VideoPlayerPlugin";
import { backgroundPlaybackService } from "../services/backgroundPlayback";

export async function stopActivePlayback(reason = "session_revoked") {
  try {
    if (window?.electronMPV?.stop) {
      await window.electronMPV.stop();
    }
  } catch (error) {
    console.warn("[playbackControl] No se pudo detener electronMPV:", error);
  }

  try {
    if (VideoPlayerPlugin?.stopVideo) {
      await VideoPlayerPlugin.stopVideo();
    }
  } catch (error) {
    console.warn("[playbackControl] No se pudo detener el reproductor nativo:", error);
  }

  try {
    if (backgroundPlaybackService?.stopPlayback) {
      await backgroundPlaybackService.stopPlayback();
    }
  } catch (error) {
    console.warn("[playbackControl] No se pudo detener background playback:", error);
  }

  try {
    document.querySelectorAll("video, audio").forEach((mediaElement) => {
      try {
        mediaElement.pause();
        mediaElement.removeAttribute("src");
        mediaElement.load?.();
      } catch (mediaError) {
        console.warn("[playbackControl] No se pudo limpiar un elemento media:", mediaError);
      }
    });
  } catch (error) {
    console.warn("[playbackControl] No se pudieron limpiar los elementos media del DOM:", error);
  }

  window.dispatchEvent(new CustomEvent("teamg-playback-stopped", { detail: { reason } }));
}
