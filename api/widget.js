export default function handler(req, res) {
  // Remove host check to allow testing from any domain
  // In production, only widget.teamg.store will route here via vercel.json

  // Set proper headers for JSON response
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  // Return the start.json content directly
  const startJson = {
    "version": "1.0.0",
    "id": "com.teamg.play.netcast",
    "name": "TeamG Play TV",
    "description": "TeamG Play optimizado para LG NetCast vía Media Station X.",
    "icon": "https://play.teamg.store/netcast/TeamG%20Play.png",
    "homepage": "https://play.teamg.store/netcast/index.html",
    "app": {
      "type": "web",
      "title": "TeamG Play TV",
      "url": "https://play.teamg.store/netcast/index.html",
      "icon": "https://play.teamg.store/netcast/TeamG%20Play.png"
    },
    "startup": {
      "url": "https://play.teamg.store/netcast/index.html"
    },
    "meta": {
      "platform": "LG NetCast",
      "via": "Media Station X",
      "maintainer": "TeamG"
    }
  };

  return res.status(200).json(startJson);
}
