// src/services/musicService.js
// Servicio de música TeamG Play: catálogo fresco + CANCIÓN COMPLETA.
import axiosInstance from '../utils/axiosInstance.js';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

const API_BASE =
  (typeof import.meta !== 'undefined' &&
    (import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_API_URL)) ||
  'https://api.teamg.store';

const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search';

// Radios en vivo de alta fidelidad (streaming 24/7 directo, siempre completas)
// Radios en vivo de alta fidelidad 100% verificadas (streaming 24/7 directo)
export const LIVE_RADIOS = [
  {
    id: 'radio-lazona',
    title: 'Radio La Zona 90.5 FM',
    artist: 'Música Urbana, Reggaetón & Trap',
    album: 'Emisora en Vivo',
    category: 'Reggaetón & Urbano',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://mdstrm.com/audio/5fada54116646e098d97e6a5/icecast.audio',
    isRadio: true,
    frequency: '90.5 FM',
    country: 'PE'
  },
  {
    id: 'radio-studio92',
    title: 'Studio 92 92.5 FM',
    artist: 'Primeros en tu Música - Pop & Hits',
    album: 'Emisora en Vivo',
    category: 'Pop & Éxitos',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://mdstrm.com/audio/5fada553978fe1080e3ac5ea/icecast.audio',
    isRadio: true,
    frequency: '92.5 FM',
    country: 'PE'
  },
  {
    id: 'radio-panamericana',
    title: 'Radio Panamericana 101.1 FM',
    artist: 'Lo que el Perú quiere escuchar - Salsa & Cumbia',
    album: 'Emisora en Vivo',
    category: 'Salsa & Cumbia',
    cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://mdstrm.com/audio/6598b62dded1380470f4e539/icecast.audio',
    isRadio: true,
    frequency: '101.1 FM',
    country: 'PE'
  },
  {
    id: 'radio-oxigeno',
    title: 'Radio Oxígeno 102.1 FM',
    artist: 'Clásicos del Rock & Pop',
    album: 'Emisora en Vivo',
    category: 'Rock Clásico',
    cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://mdstrm.com/audio/5fab0687bcd6c2389ee9480c/icecast.audio',
    isRadio: true,
    frequency: '102.1 FM',
    country: 'PE'
  },
  {
    id: 'radio-ondacero',
    title: 'Radio Onda Cero',
    artist: 'Te Activa - Reggaetón & Trap',
    album: 'Emisora en Vivo',
    category: 'Reggaetón & Urbano',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://mdstrm.com/audio/6598b65ab398c90871aff8cc/icecast.audio',
    isRadio: true,
    frequency: '98.1 FM',
    country: 'PE'
  },
  {
    id: 'radio-los40',
    title: 'Los 40 Principales',
    artist: 'Todos los Éxitos Globales',
    album: 'Emisora en Vivo',
    category: 'Pop & Éxitos',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40AAC.aac',
    isRadio: true,
    frequency: 'Global',
    country: 'ES'
  },
  {
    id: 'radio-disney',
    title: 'Radio Disney',
    artist: 'Escucha lo que quieres sentir - Pop Latino',
    album: 'Emisora en Vivo',
    category: 'Pop Latino',
    cover: 'https://images.unsplash.com/photo-1526478806334-5fd488fcaabc?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://playerservices.streamtheworld.com/api/livestream-redirect/DISNEY_ARG_BA_ADP.aac',
    isRadio: true,
    frequency: 'Online',
    country: 'LATAM'
  },
  {
    id: 'radio-ibiza',
    title: 'Ibiza Global Radio',
    artist: 'Electronic & Deep House 24/7',
    album: 'Emisora en Vivo',
    category: 'Electrónica & EDM',
    cover: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn-peer031.streaming-pro.com:8025/ibizaglobalradio.mp3',
    isRadio: true,
    frequency: 'Online',
    country: 'IBZ'
  },
  {
    id: 'radio-chillhop',
    title: 'Chillhop Beats Radio',
    artist: 'Lo-Fi / Relax / Study 24/7',
    album: 'Emisora en Vivo',
    category: 'Lo-Fi & Chill',
    cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://streams.ilovemusic.de/iloveradio17.mp3',
    isRadio: true,
    frequency: 'Online',
    country: 'Global'
  },
  {
    id: 'radio-rpp',
    title: 'RPP Noticias',
    artist: 'Confianza por todos los medios - Información 24/7',
    album: 'Emisora en Vivo',
    category: 'Noticias & Opinión',
    cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://mdstrm.com/audio/5fab3416b5f9ef165cfab6e9/icecast.audio',
    isRadio: true,
    frequency: '89.7 FM',
    country: 'PE'
  }
];

// Géneros con consultas actualizadas a estrenos y éxitos recientes 2025-2026
export const GENRES = [
  {
    id: 'reggaeton',
    name: 'Reggaetón',
    subtitle: 'Estrenos & Tendencias 2025-2026',
    bg: 'linear-gradient(135deg, #e1118c 0%, #8c0b57 100%)',
    query: 'reggaeton 2025 2026 exitos urbano',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'pop',
    name: 'Pop Latino',
    subtitle: 'Éxitos Actuales Globales',
    bg: 'linear-gradient(135deg, #27856a 0%, #134637 100%)',
    query: 'pop latino 2025 2026 exitos',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'cumbia',
    name: 'Salsa & Cumbia',
    subtitle: 'Fiesta & Ritmo Actual',
    bg: 'linear-gradient(135deg, #ba5d07 0%, #633204 100%)',
    query: 'salsa cumbia fiesta exitos 2025 2026',
    cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'rock',
    name: 'Rock Clásico',
    subtitle: 'En Español & Clásicos Inmortales',
    bg: 'linear-gradient(135deg, #e91429 0%, #7d0b16 100%)',
    query: 'rock en espanol clasicos exitos',
    cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'electronic',
    name: 'Electrónica',
    subtitle: 'EDM & House Hits',
    bg: 'linear-gradient(135deg, #8400e7 0%, #46007b 100%)',
    query: 'electronic dance hits edm 2025 2026',
    cover: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'trap',
    name: 'Trap & Drill',
    subtitle: 'Tendencias Callejeras',
    bg: 'linear-gradient(135deg, #477d95 0%, #1e3540 100%)',
    query: 'trap latino drill exitos 2025 2026',
    cover: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'lofi',
    name: 'Chill & Lo-Fi',
    subtitle: 'Enfoque & Relax',
    bg: 'linear-gradient(135deg, #1e3264 0%, #0e1830 100%)',
    query: 'lofi hip hop chill beats relax',
    cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'gym',
    name: 'Gym Beast',
    subtitle: 'Workout & Energía Pura',
    bg: 'linear-gradient(135deg, #e61e32 0%, #300005 100%)',
    query: 'workout motivation hits energy',
    cover: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&auto=format&fit=crop&q=80'
  }
];

// Playlists curadas predeterminadas con selecciones de varios artistas y nombres temáticos
export const DEFAULT_CURATED_PLAYLISTS = [
  {
    id: 'curated_1290316405',
    deezerId: 1290316405,
    name: 'Chill Relax & Lo-Fi',
    description: 'Vibras relajantes para descansar, estudiar o desconectar con melodías suaves.',
    cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
    trackCount: 45,
    isCurated: true,
    isPublic: true,
    creator: 'TeamG Curators'
  },
  {
    id: 'curated_1306931615',
    deezerId: 1306931615,
    name: 'Rock & Metal Essentials',
    description: 'Himnos eternos de AC/DC, Falling In Reverse, Linkin Park, Metallica y más.',
    cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&auto=format&fit=crop&q=80',
    trackCount: 50,
    isCurated: true,
    isPublic: true,
    creator: 'TeamG Curators'
  },
  {
    id: 'curated_178699142',
    deezerId: 178699142,
    name: 'Fuego Latino & Perreo',
    description: 'Los temas más encendidos de reggaetón, dembow y música urbana global.',
    cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
    trackCount: 60,
    isCurated: true,
    isPublic: true,
    creator: 'TeamG Curators'
  },
  {
    id: 'curated_2045665684',
    deezerId: 2045665684,
    name: 'Salsa & Bachata de Oro',
    description: 'Clásicos y éxitos románticos para bailar y disfrutar en toda fiesta.',
    cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    trackCount: 40,
    isCurated: true,
    isPublic: true,
    creator: 'TeamG Curators'
  },
  {
    id: 'curated_9590427822',
    deezerId: 9590427822,
    name: 'Deep House & Club Beats',
    description: 'Electrónica envolvente, sintetizadores y ritmos nocturnos sin interrupciones.',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    trackCount: 50,
    isCurated: true,
    isPublic: true,
    creator: 'TeamG Curators'
  },
  {
    id: 'curated_867825522',
    deezerId: 867825522,
    name: '80s & 90s Retro Hits',
    description: 'Nostalgia pura con las canciones que definieron dos generaciones doradas.',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    trackCount: 55,
    isCurated: true,
    isPublic: true,
    creator: 'TeamG Curators'
  },
  {
    id: 'curated_lofi_coding',
    name: '🎧 Lo-Fi Midnight Coding & Focus',
    query: 'lofi hip hop chill beats study relax',
    description: 'Beats instrumentales sin distracciones para programar, concentrarse y fluir de noche.',
    cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
    trackCount: 40,
    isCurated: true,
    isPublic: true,
    creator: 'DevCommunity'
  },
  {
    id: 'curated_gym_beast',
    name: '⚡ Modo Bestia Gym 200BPM',
    query: 'workout hardstyle phonk motivation gym hits',
    description: 'Phonk, hardstyle y ritmos pesados para romper récords personales en cada serie.',
    cover: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80',
    trackCount: 45,
    isCurated: true,
    isPublic: true,
    creator: 'IronPumpers'
  },
  {
    id: 'curated_perreo_2026',
    name: '🔥 Perreo Sucio 2026 Sin Censura',
    query: 'reggaeton perreo bellakeo 2026',
    description: 'El reggaetón más oscuro, explícito y pegajoso que está reventando las discotecas.',
    cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
    trackCount: 50,
    isCurated: true,
    isPublic: true,
    creator: 'DJ_Discoteca'
  },
  {
    id: 'curated_costa_verde',
    name: '🚗 Manejando de Noche por la Costa Verde',
    query: 'synthwave night drive retro chill outrun',
    description: 'Vistas al mar, luces de la ciudad y sintetizadores hipnóticos para manejar sin rumbo.',
    cover: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    trackCount: 35,
    isCurated: true,
    isPublic: true,
    creator: 'LimaNocturna'
  },
  {
    id: 'curated_emo_revival',
    name: '🖤 Emo & Post-Hardcore Revival',
    query: 'Falling In Reverse Pierce The Veil Bring Me The Horizon My Chemical Romance',
    description: 'Gritos catárticos y riffs inolvidables con Falling In Reverse, PTV, BMTH y clásicos 2000s.',
    cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&auto=format&fit=crop&q=80',
    trackCount: 42,
    isCurated: true,
    isPublic: true,
    creator: 'RonnieRadkeFan'
  },
  {
    id: 'curated_chicha_cumbia',
    name: '🍺 Chicha, Cumbia & Cerveza Helada',
    query: 'cumbia villera chicha armonia 10 chacalon los shapis grupo 5',
    description: 'Himnos populares de barrio, guitarra chichera y cumbia con sentimiento real.',
    cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    trackCount: 48,
    isCurated: true,
    isPublic: true,
    creator: 'SaborPopular'
  },
  {
    id: 'curated_gaming_night',
    name: '🎮 Gaming Session / Tryhard 100%',
    query: 'gaming edm dubstep electronic hype trap',
    description: 'Adrenalina pura para rankear en Valorant, CS, Warzone o LoL sin perder los reflejos.',
    cover: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
    trackCount: 40,
    isCurated: true,
    isPublic: true,
    creator: 'ClutchGamer'
  },
  {
    id: 'curated_madrugada',
    name: '🌙 Melancolía de Madrugada (3:00 AM)',
    query: 'sad indie acoustic slow melancholy emotional',
    description: 'Para cuando no puedes dormir y los pensamientos se vuelven canciones.',
    cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    trackCount: 38,
    isCurated: true,
    isPublic: true,
    creator: 'InsomnioClub'
  },
  {
    id: 'curated_indie_discovery',
    name: '🌱 Descubrimiento Indie & Bedroom Pop',
    query: 'The Marias Cuco Kevin Kaarl Ed Maverick Boy Pablo Men I Trust',
    description: 'Joyas ocultas fuera de la radio comercial: guitarras soñadoras y producciones caseras íntimas.',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    trackCount: 36,
    isCurated: true,
    isPublic: true,
    creator: 'IndieVibes'
  },
  {
    id: 'curated_acoustic_coffee',
    name: '☕ Acoustic Sunday & Coffee Vibes',
    query: 'acoustic guitar singer songwriter morning calm',
    description: 'Guitarras de palo, voces cálidas y una taza de café en una mañana tranquila.',
    cover: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80',
    trackCount: 32,
    isCurated: true,
    isPublic: true,
    creator: 'MorningMellow'
  }
];

// Artistas Independientes & Descubrimientos Recomendados
export const INDEPENDENT_ARTISTS = [
  {
    id: 'indie-themarias',
    name: 'The Marías',
    genre: 'Indie Pop / Dream Pop',
    origin: 'Los Ángeles, CA',
    bio: 'Banda liderada por María Zardoya, conocidos por su atmósfera sensual, elegante, psicodélica y bilingüe.',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    popularTrack: 'Hush / Cariño',
    query: 'The Marias'
  },
  {
    id: 'indie-cuco',
    name: 'Cuco',
    genre: 'Chicano Dream Pop / Lo-Fi',
    origin: 'Hawthorne, CA',
    bio: 'Pionero del bedroom pop latino con trompetas nostálgicas, sintetizadores y romance juvenil sincero.',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    popularTrack: 'Lo Que Siento / Amor de Siempre',
    query: 'Cuco'
  },
  {
    id: 'indie-kevinkaarl',
    name: 'Kevin Kaarl',
    genre: 'Folk Alternativo / Acústico',
    origin: 'Chihuahua, México',
    bio: 'Cantautor de voz profunda con letras melancólicas y poéticas que conectan con millones de jóvenes.',
    cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&auto=format&fit=crop&q=80',
    popularTrack: 'San Lucas / Colapso',
    query: 'Kevin Kaarl'
  },
  {
    id: 'indie-edmaverick',
    name: 'Ed Maverick',
    genre: 'Folk / Indie Rock',
    origin: 'Delicias, México',
    bio: 'Guitarra cruda, poesía juvenil honesta y acordes folk que definieron una generación independiente.',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    popularTrack: 'Fuentes de Ortiz / Acurrucar',
    query: 'Ed Maverick'
  },
  {
    id: 'indie-bratty',
    name: 'Bratty',
    genre: 'Bedroom Pop / Surf Indie',
    origin: 'Culiacán, México',
    bio: 'Proyecto de Jenny Juárez con riffs melódicos, distorsión suave y estética DIY nostálgica.',
    cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    popularTrack: 'Honey, No Estás / Quizás',
    query: 'Bratty'
  },
  {
    id: 'indie-depresion-sonora',
    name: 'Depresión Sonora',
    genre: 'Post-Punk / New Wave',
    origin: 'Madrid, España',
    bio: 'Marcos Crespo capturó el nihilismo bailable con cajas de ritmos aceleradas y guitarras frías de garage.',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    popularTrack: 'Ya No Hay Verano / Gasolina y Mechero',
    query: 'Depresion Sonora'
  },
  {
    id: 'indie-sensenra',
    name: 'Sen Senra',
    genre: 'R&B / Bedroom Pop',
    origin: 'Galicia, España',
    bio: 'Sensibilidad pop moderna, producciones pulidas y carisma magnético fuera de las discográficas convencionales.',
    cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
    popularTrack: 'Ya No Te Hago Falta / Subiendo al Cielo',
    query: 'Sen Senra'
  },
  {
    id: 'indie-menitrust',
    name: 'Men I Trust',
    genre: 'Dream Pop / Indie Chill',
    origin: 'Montreal, Canadá',
    bio: 'Banda canadiense que autogestiona su música de principio a fin, con un sonido suave y bajo hipnótico.',
    cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
    popularTrack: 'Show Me How / Norton Commander',
    query: 'Men I Trust'
  },
  {
    id: 'indie-silvanaestrada',
    name: 'Silvana Estrada',
    genre: 'Folklore Alternativo / Cantautora',
    origin: 'Coatepec, México',
    bio: 'Cuatro venezolano, voz prodigiosa e intensidad emocional que rescata las raíces latinoamericanas.',
    cover: 'https://images.unsplash.com/photo-1526478806334-5fd488fcaabc?w=600&auto=format&fit=crop&q=80',
    popularTrack: 'Te Guardo / Al Norte',
    query: 'Silvana Estrada'
  },
  {
    id: 'indie-boypablo',
    name: 'Boy Pablo',
    genre: 'Jangle Pop / Indie Rock',
    origin: 'Bergen, Noruega',
    bio: 'Chileno-noruego Nicolás Muñoz saltó a la fama mundial con guitarras vibrantes, risas y pop soleado.',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    popularTrack: 'Everytime / Feeling Lonely',
    query: 'Boy Pablo'
  },
  {
    id: 'indie-fallinginreverse',
    name: 'Falling In Reverse',
    genre: 'Post-Hardcore / Rock Alternativo',
    origin: 'Las Vegas, NV',
    bio: 'Ronnie Radke desafía las reglas de la industria con producciones independientes de rock potente como Joseph.',
    cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&auto=format&fit=crop&q=80',
    popularTrack: 'Joseph / Watch the World Burn',
    query: 'Falling In Reverse'
  }
];

// Helper para transformar resultados de iTunes a formato uniforme de TeamG Music.
// NOTA: previewUrl de Apple = SOLO 30 segundos. Se usa como arranque instantáneo;
// la versión COMPLETA llega vía youtubeId (resuelto por el backend).
function formatItunesTrack(item) {
  const rawCover = item.artworkUrl100 || item.artworkUrl60 || '';
  const hdCover = rawCover
    ? rawCover.replace(/100x100bb/, '600x600bb')
    : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';

  return {
    id: `itunes-${item.trackId || Math.random().toString(36).substring(7)}`,
    trackId: item.trackId,
    title: item.trackName || item.collectionName || 'Canción Desconocida',
    artist: item.artistName || 'Artista Desconocido',
    album: item.collectionName || 'Sencillo',
    cover: hdCover,
    audioUrl: item.previewUrl || '',
    previewUrl: item.previewUrl || '',
    duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 30,
    // La duración REAL (trackTimeMillis) es la de la canción completa;
    // mientras solo haya preview, el reproductor muestra 0:30.
    fullDuration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 0,
    isPreviewOnly: true,
    youtubeId: null,
    genre: item.primaryGenreName || 'Música',
    releaseDate: item.releaseDate ? item.releaseDate.substring(0, 4) : '',
    isRadio: false,
    externalUrl: item.trackViewUrl || ''
  };
}

function normalizeBackendTrack(t) {
  if (!t) return null;
  return {
    ...t,
    isPreviewOnly: !t.youtubeId,
    youtubeId: t.youtubeId || null
  };
}

// Formatear canciones de Deezer para enriquecer el catálogo con estrenos de cualquier artista (ej. Falling In Reverse - Joseph)
function formatDeezerTrack(item) {
  if (!item) return null;
  const cover =
    item.album?.cover_big ||
    item.album?.cover_medium ||
    item.artist?.picture_big ||
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';

  const duration = item.duration || 210;

  return {
    id: `deezer-${item.id}`,
    trackId: item.id,
    title: item.title || 'Canción Desconocida',
    artist: item.artist?.name || 'Artista Desconocido',
    album: item.album?.title || item.title || 'Sencillo',
    cover,
    audioUrl: item.preview || '',
    previewUrl: item.preview || '',
    duration: duration,
    fullDuration: duration,
    isPreviewOnly: true,
    youtubeId: null,
    genre: 'Música',
    releaseDate: '2026',
    isRadio: false,
    externalUrl: item.link || '',
    source: 'deezer'
  };
}

// Calificación de relevancia para priorizar canciones exactas en búsquedas por título o artista
function scoreTrackRelevance(track, query) {
  if (!track || !query) return 0;
  const qClean = query.toLowerCase().trim();
  const words = qClean.split(/\s+/).filter(w => w.length > 1);
  const title = (track.title || '').toLowerCase();
  const artist = (track.artist || '').toLowerCase();
  const full = `${title} ${artist}`;

  let score = 0;
  if (title === qClean) score += 500;
  if (title.includes(qClean)) score += 300;

  let matchedWords = 0;
  for (const w of words) {
    if (title.includes(w)) {
      score += 50;
      matchedWords++;
    } else if (artist.includes(w)) {
      score += 20;
      matchedWords++;
    }
  }
  if (words.length > 0 && matchedWords === words.length) {
    score += 200;
  }
  return score;
}

// Helper para consumir la API de Deezer (JSONP en web browsers sin CORS, CapacitorHttp en Android/TV, fetch en Node/Electron)
async function fetchDeezerApi(endpoint) {
  const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.();

  // 1) Móvil / Android TV nativo: CapacitorHttp sin restricciones de CORS
  if (isNative && CapacitorHttp) {
    try {
      const res = await CapacitorHttp.get({
        url: `https://api.deezer.com${endpoint}`
      });
      if (res.status === 200 && res.data) {
        return typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      }
    } catch (e) {
      console.warn('[MusicService] Deezer CapacitorHttp error:', e);
    }
  }

  // 2) Proceso Electron / Node
  if (typeof window !== 'undefined' && window.electronAPI) {
    try {
      const res = await fetch(`https://api.deezer.com${endpoint}`);
      if (res.ok) return await res.json();
    } catch {}
  }

  // 3) Web Browser estándar: Deezer soporta JSONP nativamente sin restricciones de CORS
  if (typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const cbName = `dz_cb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const script = document.createElement('script');
      const separator = endpoint.includes('?') ? '&' : '?';
      const url = `https://api.deezer.com${endpoint}${separator}output=jsonp&callback=${cbName}`;

      const timer = setTimeout(() => {
        cleanup();
        resolve(null);
      }, 5000);

      function cleanup() {
        clearTimeout(timer);
        try {
          delete window[cbName];
          if (script.parentNode) script.parentNode.removeChild(script);
        } catch {}
      }

      window[cbName] = (data) => {
        cleanup();
        resolve(data || null);
      };

      script.onerror = () => {
        cleanup();
        resolve(null);
      };

      script.src = url;
      document.head.appendChild(script);
    });
  }

  // 4) Fallback con fetch directo
  try {
    const res = await fetch(`https://api.deezer.com${endpoint}`);
    if (res.ok) return await res.json();
  } catch {}

  return null;
}

// Canciones destacadas de arranque instantáneo.
// El youtubeId se resuelve dinámicamente (no hardcodeado) para no congelar el catálogo.
export const INITIAL_FEATURED_TRACKS = [
  {
    id: 'feat-1',
    title: 'BbY WOW',
    artist: 'KAROL G, Judeline & rusowsky',
    album: 'BbY WOW',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/2b/66/b2/2b66b26c-ab23-faa1-c4ee-06fa2cce8f76/26UM1IM00558.rgb.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f3/08/da/f308da3d-00cc-7682-7be9-87cb882f4ea5/mzaf_129115212197250565.plus.aac.p.m4a',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f3/08/da/f308da3d-00cc-7682-7be9-87cb882f4ea5/mzaf_129115212197250565.plus.aac.p.m4a',
    youtubeId: null,
    isPreviewOnly: true,
    duration: 225,
    fullDuration: 225,
    genre: 'Urbano Latino',
    isRadio: false
  },
  {
    id: 'feat-2',
    title: 'NUEVAYoL',
    artist: 'Bad Bunny',
    album: 'DeBÍ TiRAR MÁS FOToS',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/90/5e/7e/905e7ed5-a8fa-a8f3-cd06-0028fdf3afaa/199066342442.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/2e/97/55/2e97555a-1ed3-9e07-de57-07e1213186c9/mzaf_7594924455925081680.plus.aac.p.m4a',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/2e/97/55/2e97555a-1ed3-9e07-de57-07e1213186c9/mzaf_7594924455925081680.plus.aac.p.m4a',
    youtubeId: null,
    isPreviewOnly: true,
    duration: 197,
    fullDuration: 197,
    genre: 'Urbano Latino',
    isRadio: false
  },
  {
    id: 'feat-3',
    title: 'LUNA',
    artist: 'Feid & ATL Jacob',
    album: 'FERXXOCALIPSIS',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/7c/54/aa/7c54aa94-9ae3-4b80-7b23-8b23955dc3a2/23UM1IM60703.rgb.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f8/b0/5b/f8b05b80-c7ea-9ea8-759c-5fd609c15341/mzaf_2589321753277640940.plus.aac.p.m4a',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f8/b0/5b/f8b05b80-c7ea-9ea8-759c-5fd609c15341/mzaf_2589321753277640940.plus.aac.p.m4a',
    youtubeId: null,
    isPreviewOnly: true,
    duration: 196,
    fullDuration: 196,
    genre: 'Reggaetón',
    isRadio: false
  },
  {
    id: 'feat-4',
    title: 'Taste',
    artist: 'Sabrina Carpenter',
    album: 'Short n\' Sweet',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/f6/15/d0/f615d0ab-e0c4-575d-907e-1cc084642357/24UMGIM61704.rgb.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/26/57/a6/2657a620-c596-e0e4-efa2-e814f3572d1c/mzaf_5475540510703120797.plus.aac.p.m4a',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/26/57/a6/2657a620-c596-e0e4-efa2-e814f3572d1c/mzaf_5475540510703120797.plus.aac.p.m4a',
    youtubeId: null,
    isPreviewOnly: true,
    duration: 157,
    fullDuration: 157,
    genre: 'Pop',
    isRadio: false
  },
  {
    id: 'feat-5',
    title: 'Touching The Sky',
    artist: 'Rauw Alejandro',
    album: 'Cosa Nuestra',
    cover: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=600&auto=format&fit=crop&q=80',
    audioUrl: '',
    previewUrl: '',
    youtubeId: null,
    isPreviewOnly: true,
    duration: 188,
    fullDuration: 188,
    genre: 'Pop Urbano',
    isRadio: false
  },
  {
    id: 'feat-6',
    title: 'Patient Zero',
    artist: 'Taylor Swift',
    album: 'Patient Zero',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/a0/dd/fd/a0ddfd72-ee9e-f046-6466-a5dbefc696fa/26UM1IM21436.rgb.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/0b/be/8c/0bbe8c0a-dc77-af41-97a5-c745cc43d38c/mzaf_11790447166833591507.plus.aac.p.m4a',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/0b/be/8c/0bbe8c0a-dc77-af41-97a5-c745cc43d38c/mzaf_11790447166833591507.plus.aac.p.m4a',
    youtubeId: null,
    isPreviewOnly: true,
    duration: 215,
    fullDuration: 215,
    genre: 'Pop',
    isRadio: false
  }
];

// ---------------------------------------------------------------------------
// Caché local de youtubeId (memoria + localStorage, 7 días)
// ---------------------------------------------------------------------------
const YT_CACHE_KEY = 'teamg_music_ytids_v1';
const YT_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const ytMemoryCache = new Map();

function readPersistentCache() {
  try {
    const raw = localStorage.getItem(YT_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {}
  return {};
}

function writePersistentCache(obj) {
  try {
    const keys = Object.keys(obj);
    // Acotar a 500 entradas más recientes
    if (keys.length > 500) {
      const trimmed = {};
      keys.slice(-500).forEach((k) => { trimmed[k] = obj[k]; });
      localStorage.setItem(YT_CACHE_KEY, JSON.stringify(trimmed));
    } else {
      localStorage.setItem(YT_CACHE_KEY, JSON.stringify(obj));
    }
  } catch {}
}

function ytCacheGet(query) {
  const key = query.toLowerCase().trim();
  if (ytMemoryCache.has(key)) return ytMemoryCache.get(key);
  const persisted = readPersistentCache();
  const entry = persisted[key];
  if (entry && Date.now() - entry.ts < YT_CACHE_TTL && entry.id) {
    ytMemoryCache.set(key, entry.id);
    return entry.id;
  }
  return null;
}

function ytCacheSet(query, id) {
  if (!id) return;
  const key = query.toLowerCase().trim();
  ytMemoryCache.set(key, id);
  const persisted = readPersistentCache();
  persisted[key] = { id, ts: Date.now() };
  writePersistentCache(persisted);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Caché de URLs de audio completo (memoria; el backend cachea 4h porque
// las URLs de googlevideo expiran ~6h)
// ---------------------------------------------------------------------------
const fullAudioCache = new Map(); // youtubeId -> { ts, url }
const FULL_AUDIO_TTL = 3 * 60 * 60 * 1000;
const YT_INNER_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

/**
 * Resuelve el ID de YouTube directamente en Android / Móvil sin pasar por el backend
 */
async function resolveYouTubeViaCapacitor(query) {
  if (typeof Capacitor === 'undefined' || !Capacitor.isNativePlatform?.()) return null;
  try {
    const res = await CapacitorHttp.post({
      url: `https://www.youtube.com/youtubei/v1/search?key=${YT_INNER_KEY}`,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip'
      },
      data: {
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: '20.10.38',
            androidSdkVersion: 30,
            hl: 'es',
            gl: 'PE'
          }
        },
        query: query + ' audio'
      }
    });
    const str = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    const matches = [...str.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map(m => m[1]);
    const uniqueIds = [...new Set(matches)];
    if (uniqueIds.length > 0) return uniqueIds[0];
  } catch (e) {
    console.warn('[MusicService] Capacitor InnerTube search failed:', e);
  }
  return null;
}

/**
 * Resuelve stream de audio directo en Android/Android TV/iOS usando CapacitorHttp nativo.
 * Se ejecuta en ~400ms directamente desde la IP del dispositivo del usuario (sin Render ni CORS).
 */
async function fetchAndroidStreamViaCapacitor(youtubeId) {
  if (typeof Capacitor === 'undefined' || !Capacitor.isNativePlatform?.()) return null;
  try {
    const res = await CapacitorHttp.post({
      url: `https://www.youtube.com/youtubei/v1/player?key=${YT_INNER_KEY}`,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip'
      },
      data: {
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: '20.10.38',
            androidSdkVersion: 30,
            hl: 'es',
            gl: 'PE'
          }
        },
        videoId: youtubeId,
        contentCheckOk: true,
        racyCheckOk: true
      }
    });

    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    if (data?.playabilityStatus?.status !== 'OK') return null;

    // Priorizar format 18 (MP4 progresivo con AAC completo, sin límite de 1MB/1:04 de Google Video)
    const fmt18 = (data.streamingData?.formats || []).find(f => Number(f.itag) === 18 && f.url);
    const chosen = fmt18
      || (data.streamingData?.adaptiveFormats || []).find(f => Number(f.itag) === 140 && f.url)
      || (data.streamingData?.adaptiveFormats || []).find(f => f.mimeType && f.mimeType.startsWith('audio/') && f.url)
      || (data.streamingData?.formats || [])[0];

    return chosen?.url || null;
  } catch (e) {
    console.warn('[MusicService] CapacitorHttp direct audio failed:', e);
    return null;
  }
}

export const musicService = {
  /**
   * Top de éxitos frescos (vía backend; sin el RSS deprecado de Apple).
   * country: 'global' | 'latin' | 'PE' | 'US' | 'ES' | 'MX'
   */
  async getTopTracks(country = 'global') {
    // 1) Backend vía axiosInstance (incluye headers x-app-version: 1.5.12 y puente Electron)
    try {
      const res = await axiosInstance.get('/api/music/charts', {
        params: { country },
        timeout: 10000
      });
      if (res.data?.tracks && Array.isArray(res.data.tracks) && res.data.tracks.length > 0) {
        const mapped = res.data.tracks.map(normalizeBackendTrack).filter(Boolean);
        try {
          localStorage.setItem('teamg_music_top_cached', JSON.stringify(mapped));
        } catch {}
        return mapped;
      }
    } catch (err) {
      console.warn('[MusicService] Backend charts no disponible, usando feed oficial Apple v2:', err?.message);
    }

    // 2) Fallback directo al feed oficial de Apple Music Most-Played con lookup de previews instantáneos
    try {
      const key = String(country || 'global').toLowerCase();
      const feedCountry = ['pe', 'es', 'mx', 'us'].includes(key) ? key : (key === 'latin' ? 'pe' : 'us');
      const res = await fetch(`https://rss.applemarketingtools.com/api/v2/${feedCountry}/music/most-played/50/songs.json`);
      if (res.ok) {
        const data = await res.json();
        const results = data?.feed?.results || [];
        if (results.length > 0) {
          const ids = results.map((r) => r.id).filter(Boolean);
          const lookupMap = new Map();
          try {
            const lRes = await fetch(
              `https://itunes.apple.com/lookup?id=${ids.join(',')}&country=${feedCountry.toUpperCase()}`
            );
            if (lRes.ok) {
              const lData = await lRes.json();
              (lData.results || []).forEach((item) => {
                if (item.trackId) lookupMap.set(String(item.trackId), item);
              });
            }
          } catch {}

          const mapped = results.map((item) => {
            const lItem = lookupMap.get(String(item.id));
            const rawCover = (lItem && lItem.artworkUrl100) || item.artworkUrl100 || '';
            const hdCover = rawCover
              ? rawCover.replace(/100x100bb/, '600x600bb')
              : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
            const audioPreview = (lItem && lItem.previewUrl) || '';
            const trackDuration = lItem?.trackTimeMillis ? Math.round(lItem.trackTimeMillis / 1000) : 210;

            return {
              id: `apple-${item.id}`,
              trackId: item.id,
              title: (lItem && lItem.trackName) || item.name || 'Canción Desconocida',
              artist: (lItem && lItem.artistName) || item.artistName || 'Artista Desconocido',
              album: (lItem && lItem.collectionName) || item.name || 'Sencillo',
              cover: hdCover,
              audioUrl: audioPreview,
              previewUrl: audioPreview,
              duration: trackDuration,
              fullDuration: trackDuration,
              isPreviewOnly: true,
              youtubeId: null,
              genre: (lItem && lItem.primaryGenreName) || (item.genres && item.genres[0] ? item.genres[0].name : 'Música'),
              releaseDate: lItem?.releaseDate
                ? String(lItem.releaseDate).substring(0, 4)
                : (item.releaseDate ? String(item.releaseDate).substring(0, 4) : '2026'),
              isRadio: false,
              externalUrl: item.url || '',
            };
          });

          try {
            localStorage.setItem('teamg_music_top_cached', JSON.stringify(mapped));
          } catch {}

          return mapped;
        }
      }
    } catch (err) {
      console.warn('[MusicService] Fallback RSS Apple falló:', err);
    }

    // Si no hay conexión (offline), cargar la última caché persistida de éxitos
    try {
      const offlineCached = localStorage.getItem('teamg_music_top_cached');
      if (offlineCached) {
        const parsed = JSON.parse(offlineCached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    return INITIAL_FEATURED_TRACKS;
  },

  /**
   * Busca cualquier canción, artista o álbum en tiempo real.
   * Consulta Deezer e iTunes en paralelo para cobertura total de artistas y novedades
   * (asegurando que temas recientes como "Joseph" de Falling In Reverse aparezcan de inmediato).
   */
  async searchTracks(query, limit = 30) {
    if (!query || query.trim().length === 0) return [];
    const cleanQuery = query.trim();

    // Consultamos Deezer e iTunes en paralelo
    const [deezerData, itunesTracks] = await Promise.all([
      fetchDeezerApi(`/search?q=${encodeURIComponent(cleanQuery)}&limit=${limit}`).catch(() => null),
      this.searchItunesOnly(cleanQuery, limit).catch(() => [])
    ]);

    const deezerTracks = (deezerData?.data || []).map(formatDeezerTrack).filter(Boolean);

    const seen = new Set();
    const merged = [];

    // Priorizar y unificar sin duplicados
    for (const track of [...deezerTracks, ...itunesTracks]) {
      if (!track || !track.title || !track.artist) continue;
      const key = `${track.title}_${track.artist}`.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(track);
      }
    }

    // Ordenar por relevancia exacta según la consulta
    merged.sort((a, b) => scoreTrackRelevance(b, cleanQuery) - scoreTrackRelevance(a, cleanQuery));
    return merged.slice(0, limit);
  },

  /**
   * Búsqueda en iTunes / Backend como respaldo complementario.
   */
  async searchItunesOnly(query, limit = 25) {
    // 1) Backend vía axiosInstance (normalizado + sin CORS)
    try {
      const res = await axiosInstance.get('/api/music/search', {
        params: { q: query.trim(), limit },
        timeout: 4500
      });
      if (res.data?.tracks && Array.isArray(res.data.tracks) && res.data.tracks.length > 0) {
        return res.data.tracks.map(normalizeBackendTrack).filter(Boolean);
      }
    } catch {}

    // 2) Fallback directo a iTunes
    try {
      const cleanQuery = encodeURIComponent(query.trim());
      const res = await fetch(`${ITUNES_SEARCH_URL}?term=${cleanQuery}&entity=song&limit=${limit}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || []).map(formatItunesTrack);
    } catch {
      return [];
    }
  },

  /**
   * Obtiene playlists curadas de la comunidad y tendencias (Deezer charts + presets).
   */
  async getCuratedPlaylists(limit = 24) {
    try {
      const data = await fetchDeezerApi(`/chart/0/playlists?limit=${limit}`);
      if (data && Array.isArray(data.data) && data.data.length > 0) {
        const deezerList = data.data.map(p => ({
          id: `curated_${p.id}`,
          deezerId: p.id,
          name: p.title,
          description: p.description || 'Playlist curada con los mejores éxitos en tendencia.',
          cover: p.picture_medium || p.picture_big || p.picture || '',
          trackCount: p.nb_tracks || 50,
          isCurated: true,
          isPublic: true,
          creator: 'Tendencias Globales',
          tracks: []
        }));
        const combined = [...DEFAULT_CURATED_PLAYLISTS, ...deezerList];
        const seen = new Set();
        return combined.filter(p => {
          if (!p.id || seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
      }
    } catch (e) {
      console.warn('[MusicService] Error cargando playlists curadas:', e);
    }
    return DEFAULT_CURATED_PLAYLISTS;
  },

  /**
   * Obtiene las canciones de una playlist curada de la comunidad.
   * Si es un ID numérico de Deezer, lo consulta; si es una temática personalizada, busca sus canciones correspondientes.
   */
  async getPlaylistTracks(playlistIdOrDeezerId) {
    const rawId = String(playlistIdOrDeezerId).replace(/^curated_/, '');
    if (/^\d+$/.test(rawId)) {
      try {
        const data = await fetchDeezerApi(`/playlist/${rawId}`);
        if (data && data.tracks && Array.isArray(data.tracks.data) && data.tracks.data.length > 0) {
          return data.tracks.data.map(formatDeezerTrack).filter(Boolean);
        }
      } catch (e) {
        console.warn('[MusicService] Error cargando canciones de playlist Deezer:', e);
      }
    }

    // Si es una playlist temática de nuestra lista o fallback
    const curated = DEFAULT_CURATED_PLAYLISTS.find(p => p.id === playlistIdOrDeezerId || String(p.deezerId) === rawId);
    const searchQuery = curated?.query || curated?.name || 'exitos 2026';
    return await this.searchTracks(searchQuery, 30);
  },

  /**
   * Obtiene los temas más recientes (Lanzamientos 2026 / singles nuevos).
   */
  async getRecentTracks(limit = 30) {
    try {
      const tracks = await this.searchTracks('2026 exitos nuevos sencillos estrenos', limit);
      if (tracks && tracks.length > 0) {
        return tracks.sort((a, b) => {
          const yearA = parseInt(a.releaseDate) || 0;
          const yearB = parseInt(b.releaseDate) || 0;
          return yearB - yearA;
        });
      }
    } catch (e) {
      console.warn('[MusicService] Error cargando temas recientes:', e);
    }
    return INITIAL_FEATURED_TRACKS;
  },

  /**
   * Artistas independientes recomendados.
   */
  getIndependentArtists() {
    return INDEPENDENT_ARTISTS;
  },

  /**
   * Canciones de artistas independientes / alternativos.
   */
  async getIndependentTracks(artistQuery = null, limit = 30) {
    const query = artistQuery || 'The Marias Cuco Kevin Kaarl Ed Maverick Bratty Depresion Sonora Sen Senra Men I Trust';
    return await this.searchTracks(query, limit);
  },

  /**
   * Obtiene canciones por género musical (priorizando lanzamientos recientes y éxitos actuales).
   */
  async getTracksByGenre(genreQuery, limit = 28) {
    const tracks = await this.searchTracks(genreQuery, limit);
    return tracks.sort((a, b) => {
      const yearA = parseInt(a.releaseDate) || 0;
      const yearB = parseInt(b.releaseDate) || 0;
      return yearB - yearA;
    });
  },

  /**
   * Lista de emisoras de radio en vivo.
   */
  getLiveRadios() {
    return LIVE_RADIOS;
  },

  /**
   * Géneros configurados.
   */
  getGenres() {
    return GENRES;
  },

  /**
   * Resuelve el ID de YouTube para reproducir la canción COMPLETA.
   * Orden: caché local -> backend /api/music/resolve -> Electron IPC -> Piped/Invidious.
   */
  async getYouTubeId(artist, title) {
    if (!title) return null;
    const cleanArtist = artist && artist !== 'Artista Desconocido' ? artist : '';
    const cleanTitle = title.replace(/\(.*?\)|\[.*?\]/g, '').trim();
    const query = `${cleanArtist} ${cleanTitle}`.trim();
    if (!query) return null;

    // 0. Caché local
    const cached = ytCacheGet(query);
    if (cached) return cached;

    // 1. Electron IPC (proceso principal Node.js con InnerTube integrado: ~200ms)
    if (typeof window !== 'undefined' && window.electronAPI?.getMusicYouTubeId) {
      try {
        const id = await window.electronAPI.getMusicYouTubeId(query);
        if (id) {
          ytCacheSet(query, id);
          return id;
        }
      } catch (e) {
        console.warn('[MusicService] Electron IPC getMusicYouTubeId falló:', e);
      }
    }

    // 2. Móvil / Android TV (Capacitor nativo): resolución directa en dispositivo sin CORS (~300ms)
    if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.()) {
      try {
        const nativeId = await resolveYouTubeViaCapacitor(query);
        if (nativeId) {
          ytCacheSet(query, nativeId);
          return nativeId;
        }
      } catch (e) {
        console.warn('[MusicService] Capacitor native resolve falló:', e);
      }
    }

    // 3. Backend vía axiosInstance (timeout corto 4s)
    try {
      const res = await axiosInstance.get('/api/music/resolve', {
        params: { artist: cleanArtist, title: cleanTitle },
        timeout: 4000
      });
      if (res.data?.youtubeId) {
        ytCacheSet(query, res.data.youtubeId);
        return res.data.youtubeId;
      }
    } catch (err) {
      console.warn('[MusicService] Backend resolve vía axiosInstance falló:', err?.message);
    }

    // 4. Fallback directo con fetch enviando x-app-version
    try {
      const res = await fetchWithTimeout(
        `${API_BASE}/api/music/resolve?artist=${encodeURIComponent(cleanArtist)}&title=${encodeURIComponent(cleanTitle)}`,
        {
          headers: {
            'Accept': 'application/json',
            'x-app-version': '1.5.12'
          }
        },
        5000
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.youtubeId) {
          ytCacheSet(query, data.youtubeId);
          return data.youtubeId;
        }
      }
    } catch (err) {
      console.warn('[MusicService] Backend resolve con fetch falló:', err?.message);
    }

    // 3. Piped / Invidious directos (solo web; última opción)
    const pipedInstances = [
      'https://pipedapi.adminforge.de',
      'https://pipedapi.reallyaweso.me',
      'https://pipedapi.leptons.xyz'
    ];
    for (const inst of pipedInstances) {
      try {
        const res = await fetchWithTimeout(
          `${inst}/search?q=${encodeURIComponent(query + ' audio')}&filter=videos`,
          {},
          8000
        );
        if (!res.ok) continue;
        const data = await res.json();
        const items = data.items || [];
        const video = items.find((v) => v.url && v.url.includes('/watch?v='));
        const idMatch = video ? String(video.url).match(/v=([a-zA-Z0-9_-]{11})/) : null;
        if (idMatch) {
          ytCacheSet(query, idMatch[1]);
          return idMatch[1];
        }
      } catch {}
    }

    const invidiousInstances = [
      'https://inv.tux.pizza',
      'https://invidious.nerdvpn.de',
      'https://yt.artemislena.eu',
      'https://iv.melmac.space'
    ];
    for (const inst of invidiousInstances) {
      try {
        const res = await fetchWithTimeout(
          `${inst}/api/v1/search?q=${encodeURIComponent(query + ' audio')}&type=video`,
          {},
          8000
        );
        if (!res.ok) continue;
        const data = await res.json();
        if (data && data[0]?.videoId) {
          ytCacheSet(query, data[0].videoId);
          return data[0].videoId;
        }
      } catch {}
    }

    return null;
  },

  /**
   * Obtiene la URL de AUDIO DIRECTO (mp3/m4a) de la canción completa.
   * Se reproduce en <audio> nativo: progreso y seek reales, sin bloqueos
   * de embed del iframe de YouTube. Retorna null si no hay stream.
   */
  async getFullAudioUrl(trackOrId) {
    const yid = typeof trackOrId === 'string' ? trackOrId : trackOrId?.youtubeId;
    if (!yid || !/^[a-zA-Z0-9_-]{11}$/.test(yid)) return null;

    const cached = fullAudioCache.get(yid);
    if (cached && Date.now() - cached.ts < FULL_AUDIO_TTL) return cached.url;

    // 1) Electron Desktop: extracción directa desde Node.js en ~400ms (sin CORS, sin Render)
    if (typeof window !== 'undefined' && window.electronAPI?.getMusicDirectAudio) {
      try {
        const directUrl = await window.electronAPI.getMusicDirectAudio(yid);
        if (directUrl) {
          if (fullAudioCache.size > 200) {
            const oldest = fullAudioCache.keys().next().value;
            fullAudioCache.delete(oldest);
          }
          fullAudioCache.set(yid, { ts: Date.now(), url: directUrl });
          return directUrl;
        }
      } catch (e) {
        console.warn('[MusicService] Electron getMusicDirectAudio error:', e);
      }
    }

    // 2) Móvil / Android TV (Capacitor nativo): extracción nativa en el dispositivo en ~400ms
    if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.()) {
      try {
        const directUrl = await fetchAndroidStreamViaCapacitor(yid);
        if (directUrl) {
          if (fullAudioCache.size > 200) {
            const oldest = fullAudioCache.keys().next().value;
            fullAudioCache.delete(oldest);
          }
          fullAudioCache.set(yid, { ts: Date.now(), url: directUrl });
          return directUrl;
        }
      } catch (e) {
        console.warn('[MusicService] Capacitor native direct audio error:', e);
      }
    }

    // 3) Backend /api/music/audio (timeout corto 6s para no bloquear la UI)
    try {
      const res = await axiosInstance.get('/api/music/audio', {
        params: { youtubeId: yid },
        timeout: 6000
      });
      if (res.data?.url) {
        if (fullAudioCache.size > 200) {
          const oldest = fullAudioCache.keys().next().value;
          fullAudioCache.delete(oldest);
        }
        fullAudioCache.set(yid, { ts: Date.now(), url: res.data.url });
        return res.data.url;
      }
    } catch (err) {
      console.warn('[MusicService] Backend stream directo no disponible:', err?.message);
    }
    return null;
  },

  /**
   * Enriquece una lista con youtubeId (versión completa) en segundo plano,
   * con concurrencia limitada. Devuelve las mismas instancias mutadas.
   */
  async enrichTracksWithYouTube(tracks, max = 10) {
    if (!Array.isArray(tracks) || tracks.length === 0) return tracks;
    const pending = tracks.filter((t) => t && !t.isRadio && !t.youtubeId).slice(0, max);
    const CONCURRENCY = 4;
    for (let i = 0; i < pending.length; i += CONCURRENCY) {
      const batch = pending.slice(i, i + CONCURRENCY);
      const ids = await Promise.all(
        batch.map((t) => this.getYouTubeId(t.artist, t.title).catch(() => null))
      );
      batch.forEach((t, j) => {
        if (ids[j]) {
          t.youtubeId = ids[j];
          t.isPreviewOnly = false;
        }
      });
    }
    return tracks;
  }
};
