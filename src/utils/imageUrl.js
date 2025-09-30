export const rewriteImageUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  
  // Replace HTTP backend URL with HTTPS to avoid mixed content warnings
  const backendHttp = 'http://iptv-backend-qhbr.onrender.com';
  const backendHttps = 'https://iptv-backend-qhbr.onrender.com';
  
  if (url.startsWith(backendHttp)) {
    return url.replace(backendHttp, backendHttps);
  }
  
  // If it's a local fallback, leave as is
  if (url.startsWith('/img/') || url.startsWith('http')) {
    return url;
  }
  
  return url;
};
