export const rewriteImageUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  
  const apiBaseUrl = 'https://api.teamg.store';
  const legacyBackendUrls = [
    'http://iptv-backend-qhbr.onrender.com',
    'https://iptv-backend-qhbr.onrender.com',
    'http://iptv-backend-w6hf.onrender.com',
    'https://iptv-backend-w6hf.onrender.com',
  ];
  
  let rewrittenUrl = url;

  const legacyBackendUrl = legacyBackendUrls.find((baseUrl) => url.startsWith(baseUrl));
  if (legacyBackendUrl) {
    rewrittenUrl = url.replace(legacyBackendUrl, apiBaseUrl);
  }
  
  // Force HTTPS to avoid mixed content errors on Android TV/Capacitor
  if (rewrittenUrl.startsWith('http://')) {
    rewrittenUrl = rewrittenUrl.replace('http://', 'https://');
  }

  // Ensure absolute URLs for images that don't start with /img/ or protocol
  if (!rewrittenUrl.startsWith('http') && !rewrittenUrl.startsWith('/') && !rewrittenUrl.startsWith('data:')) {
    rewrittenUrl = `${apiBaseUrl}/${rewrittenUrl}`;
  }
  
  return rewrittenUrl;
};
