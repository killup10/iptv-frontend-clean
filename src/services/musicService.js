import { consolidateAlbums, recentCatalog } from './musicCatalog.js';
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
    artistId: item.artistId || null,
    albumId: item.collectionId || null,
    albumTrackCount: item.trackCount || 0,
    trackNumber: item.trackNumber || 0,
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
    releaseDate: item.releaseDate ? item.releaseDate.substring(0, 10) : '',
    isRadio: false,
    externalUrl: item.trackViewUrl || ''
  };
}

// Helper para transformar resultados de feeds RSS en vivo de iTunes / Apple Music (Top Songs, New Releases)
function formatItunesRssTrack(e) {
  if (!e) return null;
  const title = e['im:name']?.label || 'Canción Desconocida';
  const artist = e['im:artist']?.label || 'Artista Desconocido';
  const rawId = e.id?.attributes?.['im:id'] || `${title}-${artist}`.replace(/\s+/g, '-').toLowerCase();

  // Artwork HD: convert 170x170 a 600x600bb
  const rawImg = e['im:image']?.slice(-1)[0]?.label || '';
  const hdCover = rawImg
    ? rawImg.replace(/\/\d+x\d+bb\.(png|jpg)/, '/600x600bb.jpg')
    : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';

  // Audio Preview URL
  let audioUrl = '';
  if (Array.isArray(e.link)) {
    const audioLinkObj = e.link.find(l => l.attributes?.type?.includes('audio') || l.attributes?.['im:assetType'] === 'preview');
    audioUrl = audioLinkObj?.attributes?.href || '';
  } else if (e.link?.attributes?.href) {
    audioUrl = e.link.attributes.href;
  }

  const rawDate = e['im:releaseDate']?.label || '';
  const releaseDate = rawDate ? rawDate.substring(0, 10) : '';
  const genre = e.category?.attributes?.label || 'Música';
  const album = e['im:collection']?.['im:name']?.label || title;

  return {
    id: `itunes-${rawId}`,
    trackId: rawId,
    title,
    artist,
    album,
    cover: hdCover,
    audioUrl,
    previewUrl: audioUrl,
    duration: 210,
    fullDuration: 210,
    isPreviewOnly: true,
    youtubeId: null,
    genre,
    releaseDate,
    isRadio: false,
    externalUrl: e.id?.label || ''
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
    artistId: item.artist?.id || null,
    albumId: item.album?.id || null,
    title: item.title || 'Canción Desconocida',
    artist: item.artist?.name || 'Artista Desconocido',
    artistPicture: item.artist?.picture_big || item.artist?.picture_medium || '',
    album: item.album?.title || item.title || 'Sencillo',
    cover,
    audioUrl: item.preview || '',
    previewUrl: item.preview || '',
    duration: duration,
    fullDuration: duration,
    isPreviewOnly: true,
    youtubeId: null,
    genre: 'Música',
    releaseDate: item.release_date ? String(item.release_date).substring(0, 10) : (item.album?.release_date ? String(item.album.release_date).substring(0, 10) : ''),
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

  let score = 0;
  // Boost masivo si el ARTISTA coincide con la búsqueda (ej: buscar "Zen" o "Libido")
  if (artist === qClean) score += 1200;
  else if (artist.startsWith(qClean + ' ') || artist.endsWith(' ' + qClean)) score += 700;
  else if (artist.includes(qClean)) score += 350;

  // Coincidencias en el título de la canción
  if (title === qClean) score += 500;
  else if (title.startsWith(qClean)) score += 300;
  else if (title.includes(qClean)) score += 150;

  let matchedWords = 0;
  for (const w of words) {
    if (artist.includes(w)) {
      score += 60;
      matchedWords++;
    } else if (title.includes(w)) {
      score += 40;
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
        url: `https://api.deezer.com${endpoint}`,
        connectTimeout: 3000, readTimeout: 4000
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

// Estreno oficial Septiembre 2026: Falling In Reverse - Joseph (feat. Corey Taylor & Serj Tankian)
export const JOSEPH_FIR_TRACK = {
  id: 'fir-joseph-2026',
  title: 'Joseph (feat. Corey Taylor & Serj Tankian)',
  artist: 'Falling In Reverse',
  album: 'Joseph - Single',
  cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&auto=format&fit=crop&q=80',
  audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/a9/de/33/a9de335a-6297-21ef-1de8-8c11a3c69370/mzaf_16397496827139916532.plus.aac.p.m4a',
  previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/a9/de/33/a9de335a-6297-21ef-1de8-8c11a3c69370/mzaf_16397496827139916532.plus.aac.p.m4a',
  youtubeId: null,
  isPreviewOnly: false,
  duration: 254,
  fullDuration: 254,
  genre: 'Rock / Metalcore',
  releaseDate: '2026-09-14',
  isRadio: false
};

// Canciones destacadas de arranque instantáneo (Estrenos 2026).
// El youtubeId se resuelve dinámicamente para la versión completa sin bloquear.
export const INITIAL_FEATURED_TRACKS = [
  JOSEPH_FIR_TRACK,
  {
    id: 'feat-1',
    title: 'To Whom It May Concern',
    artist: 'A Perfect Circle',
    album: 'To Whom It May Concern',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    audioUrl: '',
    previewUrl: '',
    youtubeId: null,
    isPreviewOnly: true,
    duration: 230,
    fullDuration: 230,
    genre: 'Rock Alternativo',
    releaseDate: '2026-09-29',
    isRadio: false
  },
  {
    id: 'feat-2',
    title: 'MIENTES',
    artist: 'Laura Pausini',
    album: 'MIENTES',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    audioUrl: '',
    previewUrl: '',
    youtubeId: null,
    isPreviewOnly: true,
    duration: 215,
    fullDuration: 215,
    genre: 'Pop Latino',
    releaseDate: '2026-09-29',
    isRadio: false
  },
  {
    id: 'feat-3',
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
    releaseDate: '2026-09-24',
    isRadio: false
  },
  {
    id: 'feat-4',
    title: 'Make Me Love You',
    artist: 'Nickelback',
    album: 'Make Me Love You',
    cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&auto=format&fit=crop&q=80',
    audioUrl: '',
    previewUrl: '',
    youtubeId: null,
    isPreviewOnly: true,
    duration: 210,
    fullDuration: 210,
    genre: 'Rock',
    releaseDate: '2026-09-25',
    isRadio: false
  },
  {
    id: 'feat-5',
    title: 'Soy Un Joven',
    artist: 'Los Gemelos De Sinaloa & Fuerza Regida',
    album: 'Soy Un Joven',
    cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
    audioUrl: '',
    previewUrl: '',
    youtubeId: null,
    isPreviewOnly: true,
    duration: 195,
    fullDuration: 195,
    genre: 'Música Mexicana',
    releaseDate: '2026-09-23',
    isRadio: false
  },
  {
    id: 'feat-6',
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
    releaseDate: '2026-08-07',
    isRadio: false
  },
  {
    id: 'feat-7',
    title: 'Ahí',
    artist: 'KAROL G & Drake',
    album: 'Ahí',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/2b/66/b2/2b66b26c-ab23-faa1-c4ee-06fa2cce8f76/26UM1IM00558.rgb.jpg/600x600bb.jpg',
    audioUrl: '',
    previewUrl: '',
    youtubeId: null,
    isPreviewOnly: true,
    duration: 218,
    fullDuration: 218,
    genre: 'Urbano Latino',
    releaseDate: '2026-08-07',
    isRadio: false
  },
  {
    id: 'feat-8',
    title: 'CARITA FELIZ',
    artist: 'Myke Towers',
    album: 'CARITA FELIZ',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    audioUrl: '',
    previewUrl: '',
    youtubeId: null,
    isPreviewOnly: true,
    duration: 198,
    fullDuration: 198,
    genre: 'Urbano Latino',
    releaseDate: '2026-08-19',
    isRadio: false
  },
  {
    id: 'feat-9',
    title: 'Sour Grapes',
    artist: 'NiziU',
    album: 'Sour Grapes',
    cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
    audioUrl: '',
    previewUrl: '',
    youtubeId: null,
    isPreviewOnly: true,
    duration: 180,
    fullDuration: 180,
    genre: 'Pop',
    releaseDate: '2026-09-28',
    isRadio: false
  },
  {
    id: 'feat-10',
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
    releaseDate: '2025-01-05',
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

export function selectOfficialVideo(data, artist, title) {
  const text = v => v?.simpleText || v?.runs?.map(r => r.text).join('') || '';
  const normalized = v => String(v || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const song = normalized(title.replace(/\(.*?\)|\[.*?\]/g, ''));
  const primary = normalized(artist.split(/,|&| feat\.? /i)[0]);
  const videos = [];
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    const v = node.videoRenderer || node.videoWithContextRenderer || node.compactVideoRenderer || node.gridVideoRenderer;
    if (v?.videoId) {
      const name = text(v.title || v.headline), channel = text(v.ownerText || v.longBylineText || v.shortBylineText);
      const n = normalized(name), c = normalized(channel);
      const excluded = /lyric|letra|subtit|karaoke|cover|visualiz|official audio|audio oficial|live|en vivo|reaction|remix/.test(n);
      const official = /official.*video|video.*official|video oficial|videoclip/.test(n);
      if (!excluded && official && song && n.includes(song) && primary && (n.includes(primary) || c.includes(primary))) {
        videos.push({ id: v.videoId, title: name, channel });
      }
    }
    for (const value of Object.values(node)) if (typeof value === 'object') visit(value);
  };
  visit(data);
  return videos[0] || null;
}

const artistDetailsCache = new Map();
const artistRequests = new Map();
const artistCacheKey = name => String(name || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const ARTIST_TTL = 30 * 60 * 1000;
function cachedArtist(name) {
  const key = artistCacheKey(name);
  let entry = artistDetailsCache.get(key);
  if (!entry) {
    try { entry = JSON.parse(sessionStorage.getItem('teamg_artist_v3_' + key) || 'null'); } catch {}
  }
  if (entry && Date.now() - entry.time < ARTIST_TTL) return entry.details;
  return null;
}
async function itunesJson(url) {
  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.get({ url, connectTimeout: 3500, readTimeout: 4500 });
    if (response.status !== 200) return null;
    return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  return response.ok ? response.json() : null;
}

export const musicService = {
  /**
   * Top de éxitos frescos (vía backend; sin el RSS deprecado de Apple).
   * country: 'global' | 'latin' | 'PE' | 'US' | 'ES' | 'MX'
   */
  async getTopTracks(country = 'global', forceRefresh = false) {
    const normCountry = String(country || 'global').toLowerCase();
    const cacheKey = 'teamg_music_chart_v6_' + normCountry;

    // Purgar cachés obsoletas de versiones anteriores (Deezer chart 0 antiguo)
    try {
      localStorage.removeItem('teamg_music_top_cached');
      localStorage.removeItem('teamg_music_chart_v3_global');
      localStorage.removeItem('teamg_music_chart_v4_global');
      localStorage.removeItem('teamg_music_chart_v3_pe');
      localStorage.removeItem('teamg_music_chart_v3_mx');
    } catch {}

    if (!forceRefresh) {
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
        if (cached && Date.now() - cached.ts < 3600000 && Array.isArray(cached.tracks) && cached.tracks.length > 0) {
          return cached.tracks;
        }
      } catch {}
    }

    if (normCountry === 'global') {
      const regions = ['US', 'GB', 'MX', 'ES', 'PE'];
      const lists = await Promise.all(regions.map(r => this.getTopTracks(r, forceRefresh).catch(() => [])));
      const validLists = lists.filter(l => Array.isArray(l) && l.length > 0);

      if (validLists.length === 0) {
        return await this.getTopTracks('US', forceRefresh);
      }

      const combined = new Map();
      const identity = v => String(v || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      validLists.forEach(list => {
        const seen = new Set();
        list.forEach((track, index) => {
          const key = identity(track.title) + '::' + identity(track.artist);
          if (seen.has(key)) return;
          seen.add(key);
          const entry = combined.get(key) || { track, score: 0 };
          entry.score += 1 / (index + 1);
          combined.set(key, entry);
        });
      });

      const tracks = [...combined.values()]
        .sort((a, b) => b.score - a.score)
        .map(({ track }) => ({ ...track, chartSource: 'Top Global' }))
        .filter(t => {
          const year = parseInt(String(t.releaseDate || '').substring(0, 4), 10);
          if (year > 0 && year < 2023) return false;
          return true;
        })
        .slice(0, 100);

      if (tracks.length > 0) {
        try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), tracks })); } catch {}
        return tracks;
      }
      return await this.getTopTracks('US', forceRefresh);
    }

    // 1) Feed oficial más reproducido de Apple Music para el país solicitado
    try {
      const feedCountry = ['pe', 'es', 'mx', 'us', 'gb', 'br'].includes(normCountry) ? normCountry : (normCountry === 'latin' ? 'pe' : 'us');
      const data = await itunesJson(`https://rss.marketingtools.apple.com/api/v2/${feedCountry}/music/most-played/100/songs.json`);
      if (data) {
        const results = data?.feed?.results || [];
        if (results.length > 0) {
          const ids = results.map((r) => r.id).filter(Boolean);
          const lookupMap = new Map();
          try {
            const lData = await itunesJson(
              `https://itunes.apple.com/lookup?id=${ids.join(',')}&country=${feedCountry.toUpperCase()}`
            );
            if (lData && Array.isArray(lData.results)) {
              lData.results.forEach((item) => {
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
              chartSource: `Apple Music · ${feedCountry.toUpperCase()}`,
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
                ? String(lItem.releaseDate).substring(0, 10)
                : (item.releaseDate ? String(item.releaseDate).substring(0, 10) : ''),
              isRadio: false,
              externalUrl: item.url || '',
            };
          }).filter((t) => {
            if (!t || !t.title) return false;
            const lower = t.title.toLowerCase();
            if (lower.includes('sonido de lluvia') || lower.includes('lluvia para dormir') || lower.includes('white noise') || lower.includes('ruido blanco')) return false;
            const year = parseInt(String(t.releaseDate || '').substring(0, 4), 10);
            if (year > 0 && year < 2023) return false;
            return true;
          });

          if (mapped.length > 0) {
            try {
              localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), tracks: mapped }));
            } catch {}
            return mapped;
          }
        }
      }
    } catch (err) {
      console.warn('[MusicService] Fallback RSS Apple falló:', err);
    }

    // 2) Si no hay respuesta directa, intentar backend oficial
    try {
      const res = await axiosInstance.get('/api/music/charts', {
        params: { country: normCountry },
        timeout: 6000
      });
      if (res.data?.tracks && Array.isArray(res.data.tracks) && res.data.tracks.length > 0) {
        const clean = res.data.tracks.map(normalizeBackendTrack).filter(t => {
          if (!t || !t.title) return false;
          const year = parseInt(String(t.releaseDate || '').substring(0, 4), 10);
          if (year > 0 && year < 2023) return false;
          return true;
        });
        if (clean.length > 0) {
          try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), tracks: clean })); } catch {}
          return clean;
        }
      }
    } catch {}

    // 3) Caché persistida previa
    try {
      const offlineCached = localStorage.getItem(cacheKey);
      if (offlineCached) {
        const parsed = JSON.parse(offlineCached)?.tracks;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    return [];
  },

  /**
   * Busca cualquier canción, artista o álbum en tiempo real sin límite artificial de 30.
   * Consulta Deezer e iTunes en paralelo para cobertura exhaustiva,
   * detecta artistas coincidentes e impulsa sus temas más emblemáticos al inicio.
   */
  async searchTracks(query, limit = 150) {
    if (!query || query.trim().length === 0) return [];
    const cleanQuery = query.trim();
    const lowerQuery = cleanQuery.toLowerCase();

    // 1) En paralelo: iTunes (hasta 200), Deezer Search (hasta 100) y Deezer Artists
    const [itunesTracks, deezerData, artistData] = await Promise.all([
      this.searchItunesOnly(cleanQuery, Math.min(200, Math.max(100, limit))).catch(() => []),
      fetchDeezerApi(`/search?q=${encodeURIComponent(cleanQuery)}&limit=${Math.min(100, limit)}`).catch(() => null),
      fetchDeezerApi(`/search/artist?q=${encodeURIComponent(cleanQuery)}&limit=10`).catch(() => null)
    ]);

    const deezerTracks = (deezerData?.data || []).map(formatDeezerTrack).filter(Boolean);
    const matchingArtists = (artistData?.data || []).map(a => ({
      id: a.id,
      name: a.name,
      picture: a.picture_big || a.picture_medium || a.picture || '',
      pictureSmall: a.picture_small || a.picture_medium || '',
      fans: a.nb_fan || 0,
      albumsCount: a.nb_album || 0
    }));

    // 2) Si un artista coincide directamente con la búsqueda (ej: "Zen" o "Libido"),
    // obtener sus canciones top para asegurar que sus mayores éxitos estén incluidos al inicio
    let artistTopTracks = [];
    const directArtist = matchingArtists.find(a => a.name.toLowerCase() === lowerQuery);
    if (directArtist) {
      try {
        const topRes = await fetchDeezerApi(`/artist/${directArtist.id}/top?limit=30`);
        artistTopTracks = (topRes?.data || []).map(formatDeezerTrack).filter(Boolean);
      } catch {}
    }

    // Caso especial "zen" (agrupación de rock peruana consolidada id: 15435 / 209349377)
    if (lowerQuery === 'zen') {
      try {
        const [zen1, zen2] = await Promise.all([
          fetchDeezerApi(`/artist/15435/top?limit=30`).catch(() => null),
          fetchDeezerApi(`/artist/209349377/top?limit=30`).catch(() => null)
        ]);
        const zTracks = [
          ...((zen1?.data || []).map(formatDeezerTrack).filter(Boolean)),
          ...((zen2?.data || []).map(formatDeezerTrack).filter(Boolean))
        ];
        artistTopTracks = [...artistTopTracks, ...zTracks];
      } catch {}
    }

    // Mapa de canciones de iTunes indexadas para cruzamiento de fechas reales oficiales
    const itunesMap = new Map();
    for (const it of itunesTracks) {
      if (it?.title && it?.artist) {
        const key = `${it.title}_${it.artist}`.toLowerCase().replace(/[^a-z0-9]/g, '');
        itunesMap.set(key, it);
      }
    }

    const seen = new Set();
    const merged = [];

    // Priorizar canciones top del artista coincidente
    for (const track of artistTopTracks) {
      if (!track || !track.title || !track.artist) continue;
      const key = `${track.title}_${track.artist}`.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(track);
      }
    }

    // Priorizar canciones de iTunes (metadatos oficiales y año real verificado)
    for (const track of itunesTracks) {
      if (!track || !track.title || !track.artist) continue;
      const key = `${track.title}_${track.artist}`.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(track);
      }
    }

    // Complementar con canciones de Deezer
    for (const track of deezerTracks) {
      if (!track || !track.title || !track.artist) continue;
      const key = `${track.title}_${track.artist}`.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!seen.has(key)) {
        seen.add(key);
        const itMatch = itunesMap.get(key);
        if (itMatch && itMatch.releaseDate && (!track.releaseDate || track.releaseDate === '2026')) {
          track.releaseDate = itMatch.releaseDate;
        }
        merged.push(track);
      }
    }

    // Estreno Falling In Reverse
    if (lowerQuery.includes('joseph') || lowerQuery.includes('falling in reverse') || lowerQuery.includes('ronnie radke')) {
      const alreadyHas = merged.some(t => t.id === JOSEPH_FIR_TRACK.id || (t.title?.toLowerCase().includes('joseph') && t.artist?.toLowerCase().includes('falling in reverse')));
      if (!alreadyHas) {
        merged.unshift(JOSEPH_FIR_TRACK);
      }
    }

    // Ordenar por relevancia exacta según la consulta
    merged.sort((a, b) => scoreTrackRelevance(b, cleanQuery) - scoreTrackRelevance(a, cleanQuery));
    
    const finalResults = merged.slice(0, Math.max(limit, 100));
    finalResults.matchedArtists = matchingArtists;
    return finalResults;
  },

  /**
   * Busca artistas coincidentes en tiempo real.
   */
  async searchArtists(query, limit = 8) {
    if (!query || !query.trim()) return [];
    try {
      const clean = query.trim().toLowerCase();
      const data = await fetchDeezerApi(`/search/artist?q=${encodeURIComponent(clean)}&limit=15`);
      let list = data?.data && Array.isArray(data.data) ? [...data.data] : [];

      // Si busca "zen", asegurar que la banda de rock peruana ZEN (ID 209349377) esté incluida
      if (clean === 'zen' && !list.some(a => a.id === 209349377)) {
        try {
          const zenDirect = await fetchDeezerApi('/artist/209349377');
          if (zenDirect && zenDirect.id) {
            list.unshift(zenDirect);
          }
        } catch {}
      }

      // Filtrar coincidencias semánticas reales
      list = list.filter(a => {
        const n = (a.name || '').toLowerCase();
        return n.includes(clean) || clean.includes(n);
      });

      // Ordenar: Coincidencia exacta de nombre primero, luego por cantidad de fans
      list.sort((a, b) => {
        const aExact = (a.name || '').toLowerCase() === clean ? 1 : 0;
        const bExact = (b.name || '').toLowerCase() === clean ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;
        return (b.nb_fan || 0) - (a.nb_fan || 0);
      });

      return list.slice(0, limit).map(a => ({
        id: a.id,
        name: a.name,
        picture: a.picture_big || a.picture_medium || a.picture || '',
        pictureSmall: a.picture_small || a.picture_medium || '',
        fans: a.nb_fan || 0,
        albumsCount: a.nb_album || 0,
        link: a.link || ''
      }));
    } catch (e) {
      console.warn('[MusicService] Error buscando artistas:', e);
    }
    return [];
  },

  /**
   * Obtiene la información completa de un artista, sus canciones populares y álbumes.
   */
  getCachedArtistDetails(name) { return cachedArtist(name) || artistRequests.get(artistCacheKey(name))?.latest || null; },
  getArtistDetails(artistName, artistId = null, onUpdate = null) {
    const cleanName = String(artistName || '').trim();
    if (!cleanName) return Promise.resolve(null);
    const cached = cachedArtist(cleanName);
    if (cached) { onUpdate?.(cached); return Promise.resolve(cached); }
    const key = artistCacheKey(cleanName);
    if (artistRequests.has(key)) {
      const request = artistRequests.get(key);
      if (onUpdate) request.listeners.add(onUpdate);
      if (request.latest) onUpdate?.(request.latest);
      return request.promise;
    }
    const request = { listeners: new Set(onUpdate ? [onUpdate] : []), latest: null, promise: null };
    const metadata = { id: `artist_${key}`, name: cleanName, picture: '', fans: 0 };
    const tracks = new Map();
    const candidates = [];
    const publish = (loading) => {
      const albums = consolidateAlbums(candidates);
      const details = { ...metadata, topTracks: [...tracks.values()], albums, albumsCount: albums.length, isLoading: loading };
      request.latest = details;
      for (const listener of request.listeners) listener(details);
      return details;
    };
    const addTracks = list => { for (const track of list) if (track?.title) {
      const trackKey = artistCacheKey(track.title).replace(/[^a-z0-9]/g, '');
      if (!tracks.has(trackKey)) tracks.set(trackKey, track);
    } };
    const apple = async () => {
      const artists = await itunesJson(`${ITUNES_SEARCH_URL}?term=${encodeURIComponent(cleanName)}&entity=musicArtist&limit=10`);
      const primaryKey = artistCacheKey(cleanName.split(/[,&]|\bfeat\.?|\bft\.?/i)[0]);
      const artist = artists?.results?.find(a => artistCacheKey(a.artistName) === key) || artists?.results?.find(a => artistCacheKey(a.artistName) === primaryKey);
      if (!artist?.artistId) return;
      const resolvedArtistKey = artistCacheKey(artist.artistName);
      metadata.name = artist.artistName;
      const [albums, songs] = await Promise.allSettled([
        itunesJson(`https://itunes.apple.com/lookup?id=${artist.artistId}&entity=album&limit=200`),
        itunesJson(`${ITUNES_SEARCH_URL}?term=${encodeURIComponent(cleanName)}&entity=song&limit=50`)
      ]);
      for (const album of (albums.status === 'fulfilled' ? albums.value?.results || [] : [])) {
        if (album.wrapperType !== 'collection' || artistCacheKey(album.artistName) !== resolvedArtistKey) continue;
        candidates.push({ id: `itunes_album_${album.collectionId}`, title: album.collectionName,
          cover: album.artworkUrl100?.replace(/100x100bb/, '600x600bb') || '', releaseDate: album.releaseDate?.slice(0, 10) || '',
          trackCount: album.trackCount || 0, source: 'itunes' });
      }
      const appleTracks = (songs.status === 'fulfilled' ? songs.value?.results || [] : [])
        .filter(t => t.wrapperType === 'track' && artistCacheKey(t.artistName?.split(/[,&]/)[0]) === resolvedArtistKey).map(formatItunesTrack);
      addTracks(appleTracks);
      metadata.picture ||= candidates[0]?.cover || appleTracks[0]?.cover || '';
      publish(true);
    };
    const deezer = async () => {
      let search = await fetchDeezerApi(`/search/artist?q=${encodeURIComponent(cleanName)}&limit=10`);
      const primaryName = cleanName.split(/[,&]|\bfeat\.?|\bft\.?/i)[0].trim();
      if (!search?.data?.length && primaryName !== cleanName) search = await fetchDeezerApi(`/search/artist?q=${encodeURIComponent(primaryName)}&limit=10`);
      const artist = search?.data?.find(a => artistCacheKey(a.name) === key) || search?.data?.find(a => artistCacheKey(a.name) === artistCacheKey(primaryName));
      if (!artist?.id) return;
      metadata.id = artist.id;
      metadata.name = artist.name;
      metadata.picture = artist.picture_xl || artist.picture_big || artist.picture_medium || metadata.picture;
      metadata.fans = artist.nb_fan || 0;
      publish(true);
      const [top, albums] = await Promise.allSettled([
        fetchDeezerApi(`/artist/${artist.id}/top?limit=50`), fetchDeezerApi(`/artist/${artist.id}/albums?limit=100`)
      ]);
      addTracks((top.status === 'fulfilled' ? top.value?.data || [] : []).map(formatDeezerTrack).filter(Boolean));
      const rawAlbums = albums.status === 'fulfilled' ? albums.value?.data || [] : [];
      // Artist album listings often omit nb_tracks; resolve collection metadata rather than infer a count from hits.
      for (let i = 0; i < rawAlbums.length; i += 6) {
        const batch = await Promise.all(rawAlbums.slice(i, i + 6).map(async album => {
          const detail = album.nb_tracks > 0 ? album : await fetchDeezerApi(`/album/${album.id}`).catch(() => null);
          if (!detail) return null;
          return { id: album.id, title: detail.title || album.title, cover: detail.cover_big || album.cover_big || '',
            releaseDate: detail.release_date || album.release_date || '', trackCount: detail.nb_tracks || 0, source: 'deezer' };
        }));
        candidates.push(...batch.filter(Boolean));
        publish(true);
      }
    };
    request.promise = Promise.allSettled([apple(), deezer()]).then(() => {
      const details = publish(false);
      if (details.topTracks.length || details.albums.length) {
        const entry = { time: Date.now(), details };
        artistDetailsCache.set(key, entry);
        try { sessionStorage.setItem('teamg_artist_v3_' + key, JSON.stringify(entry)); } catch {}
      }
      artistRequests.delete(key);
      return details;
    });
    artistRequests.set(key, request);
    return request.promise;
  },

  /**
   * Obtiene las canciones de un álbum específico.
   */
  async getAlbumTracks(albumId, albumTitle = '', artistName = '') {
    if (!albumId) return [];
    try {
      if (/^itunes_album_\d+$/.test(String(albumId))) {
        const collectionId = String(albumId).replace('itunes_album_', '');
        const response = await fetch(`https://itunes.apple.com/lookup?id=${collectionId}&entity=song&limit=200`);
        if (response.ok) {
          const data = await response.json();
          return (data.results || []).filter(t => t.wrapperType === 'track' && String(t.collectionId) === collectionId)
            .map(formatItunesTrack).sort((a, b) => a.trackNumber - b.trackNumber);
        }
        return [];
      }
      if (String(albumId).startsWith('itunes_album_') || isNaN(Number(albumId))) {
        // Álbum indexado desde iTunes: buscar canciones del álbum
        const query = `${albumTitle} ${artistName}`.trim();
        const tracks = await this.searchItunesOnly(query, 50);
        return tracks.filter(t => t.album?.toLowerCase().includes(albumTitle.toLowerCase()));
      }

      // Álbum en Deezer:
      const [albumData, tracksData] = await Promise.all([
        fetchDeezerApi(`/album/${albumId}`).catch(() => null),
        fetchDeezerApi(`/album/${albumId}/tracks?limit=100`).catch(() => null)
      ]);

      const albumCover = albumData?.cover_xl || albumData?.cover_big || albumData?.cover_medium || '';
      const actualTracks = tracksData?.data || albumData?.tracks?.data || [];

      if (Array.isArray(actualTracks) && actualTracks.length > 0) {
        return actualTracks.map((t, idx) => ({
          ...formatDeezerTrack(t),
          album: albumData?.title || albumTitle || t.album?.title,
          cover: albumCover || formatDeezerTrack(t).cover,
          trackNumber: t.track_position || idx + 1,
          artist: t.artist?.name || artistName,
        })).filter(Boolean);
      }

      // Si Deezer no devolvió canciones, fallback a búsqueda en iTunes
      if (albumTitle && artistName) {
        const query = `${albumTitle} ${artistName}`.trim();
        const tracks = await this.searchItunesOnly(query, 50);
        return tracks.filter(t => t.album?.toLowerCase().includes(albumTitle.toLowerCase()));
      }
    } catch (e) {
      console.error('[MusicService] Error obteniendo canciones del álbum:', e);
    }
    return [];
  },

  /**
   * Búsqueda en iTunes con metadatos oficiales y fechas reales de lanzamiento.
   */
  async searchItunesOnly(query, limit = 25) {
    // 1) Petición directa a iTunes con entity=song para fechas oficiales exactas
    try {
      const cleanQuery = encodeURIComponent(query.trim());
      const res = await fetch(`${ITUNES_SEARCH_URL}?term=${cleanQuery}&entity=song&limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
          return data.results.map(formatItunesTrack);
        }
      }
    } catch {}

    // 2) Backend vía axiosInstance (normalizado + sin CORS)
    try {
      const res = await axiosInstance.get('/api/music/search', {
        params: { q: query.trim(), limit },
        timeout: 4500
      });
      if (res.data?.tracks && Array.isArray(res.data.tracks) && res.data.tracks.length > 0) {
        return res.data.tracks.map(normalizeBackendTrack).filter(Boolean);
      }
    } catch {}

    return [];
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

  // Discover across territories and expand collections into real songs, never a fixed artist list.
  async getRecentTracks(limit = 150, forceRefresh = false) {
    const cacheKey = 'teamg_music_releases_v4';
    if (!forceRefresh) {
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
        if (cached && Date.now()-cached.ts < 3600000 && cached.tracks.length >= 20)
          return recentCatalog(cached.tracks,limit);
      } catch {}
    }
    const territories = ['pe','us','mx','es','gb'];
    const feeds = await Promise.allSettled(territories.flatMap(country => ['songs','albums'].map(async type => {
      const data = await itunesJson('https://rss.marketingtools.apple.com/api/v2/'+country+'/music/most-played/100/'+type+'.json');
      return { country, type, results:data?.feed?.results || [] };
    })));
    const songs = [], collections = new Map(), songIds = new Set();
    const cutoff = Date.now()-90*86400000;
    for (const result of feeds) {
      if (result.status !== 'fulfilled') continue;
      const {country,type,results} = result.value;
      for (const item of results) {
        if (type === 'albums') {
          if (Date.parse(item.releaseDate) >= cutoff) collections.set(String(item.id),country);
        } else songIds.add(String(item.id));
      }
    }
    // Lookup is necessary for accurate dates, album identity and playback metadata.
    const ids = [...songIds];
    await Promise.allSettled(Array.from({length:Math.ceil(ids.length/100)},async(_,i)=>{
      const data = await itunesJson('https://itunes.apple.com/lookup?id='+ids.slice(i*100,(i+1)*100).join(',')+'&entity=song');
      for (const item of data?.results || []) {
        if (item.wrapperType !== 'track') continue;
        const track=formatItunesTrack(item); songs.push(track);
        if (Date.parse(item.releaseDate)>=cutoff && item.collectionId) collections.set(String(item.collectionId),'us');
      }
    }));
    // Bound concurrency to avoid provider throttling while including complete recent albums.
    const albums = [...collections].slice(0,60);
    for (let i=0;i<albums.length;i+=6) {
      await Promise.allSettled(albums.slice(i,i+6).map(async([id,country])=>{
        const data=await itunesJson('https://itunes.apple.com/lookup?id='+id+'&entity=song&limit=200&country='+country);
        for (const item of data?.results || []) if(item.wrapperType==='track' && String(item.collectionId)===id) songs.push(formatItunesTrack(item));
      }));
    }
    const tracks=recentCatalog(songs,limit);
    if(tracks.length) { try { localStorage.setItem(cacheKey,JSON.stringify({ts:Date.now(),tracks})); } catch {} }
    if(tracks.length) return tracks;
    try { return recentCatalog(JSON.parse(localStorage.getItem(cacheKey)||'null')?.tracks || [],limit); } catch { return []; }
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
  async getOfficialVideo(artist, title) {
    const query = `${artist} ${title.replace(/\(.*?\)|\[.*?\]/g, '').trim()} official music video`;
    if (Capacitor.isNativePlatform()) {
      try {
        const response = await CapacitorHttp.post({
          url: `https://www.youtube.com/youtubei/v1/search?key=${YT_INNER_KEY}`,
          headers: { 'Content-Type': 'application/json' },
          data: { context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38', hl: 'es', gl: 'PE' } }, query }
        });
        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        return selectOfficialVideo(data, artist, title);
      } catch {}
    }
    try {
      const response = await axiosInstance.get('/api/music/video', { params: { artist, title }, timeout: 10000 });
      return response.data?.video || null;
    } catch { return null; }
  },

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
  async getFullAudioUrl(trackOrId, { deviceOnly = false } = {}) {
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

    if (deviceOnly) return null;
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
  },

  // --- CLOUD PLAYLIST SYNC & COMMUNITY APIS ---
  async syncUserPlaylists(localPlaylists = []) {
    try {
      const res = await axiosInstance.post('/api/music/playlists/sync', {
        playlists: localPlaylists,
      }, { timeout: 10000 });
      return res.data?.playlists || [];
    } catch (err) {
      console.warn('[MusicService] syncUserPlaylists failed, fallback to local:', err?.message);
      return null;
    }
  },

  async getUserPlaylists() {
    try {
      const res = await axiosInstance.get('/api/music/playlists/my', { timeout: 10000 });
      return res.data?.playlists || [];
    } catch (err) {
      console.warn('[MusicService] getUserPlaylists failed:', err?.message);
      return null;
    }
  },

  async saveUserPlaylist(playlist) {
    try {
      const res = await axiosInstance.post('/api/music/playlists', playlist, { timeout: 8000 });
      return res.data?.playlist || playlist;
    } catch (err) {
      console.warn('[MusicService] saveUserPlaylist failed:', err?.message);
      return playlist;
    }
  },

  async updateUserPlaylist(customId, data) {
    try {
      const res = await axiosInstance.put(`/api/music/playlists/${encodeURIComponent(customId)}`, data, { timeout: 8000 });
      return res.data?.playlist || null;
    } catch (err) {
      console.warn('[MusicService] updateUserPlaylist failed:', err?.message);
      return null;
    }
  },

  async deleteUserPlaylist(customId) {
    try {
      const res = await axiosInstance.delete(`/api/music/playlists/${encodeURIComponent(customId)}`, { timeout: 8000 });
      return res.data?.success || false;
    } catch (err) {
      console.warn('[MusicService] deleteUserPlaylist failed:', err?.message);
      return false;
    }
  },

  async getCommunityUserPlaylists(limit = 60) {
    try {
      const res = await axiosInstance.get('/api/music/playlists/community', {
        params: { limit },
        timeout: 10000
      });
      return res.data?.playlists || [];
    } catch (err) {
      console.warn('[MusicService] getCommunityUserPlaylists failed:', err?.message);
      return [];
    }
  }
};
