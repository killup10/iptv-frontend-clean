export const rewriteImageUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  
  const apiBaseUrl = 'https://api.teamg.store';
  const legacyBackendUrls = [
    'http://iptv-backend-qhbr.onrender.com',
    'https://iptv-backend-qhbr.onrender.com',
    'http://iptv-backend-w6hf.onrender.com',
    'https://iptv-backend-w6hf.onrender.com',
  ];
  
  const legacyBackendUrl = legacyBackendUrls.find((baseUrl) => url.startsWith(baseUrl));
  if (legacyBackendUrl) {
    return url.replace(legacyBackendUrl, apiBaseUrl);
  }
  
  // If it's a local fallback, leave as is
  if (url.startsWith('/img/') || url.startsWith('http')) {
    return url;
  }
  
  return url;
};
