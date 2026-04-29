import { rewriteImageUrl } from './imageUrl.js';

const TYPE_MAP = {
  pelicula: 'movie',
  movie: 'movie',
  serie: 'serie',
  series: 'serie',
  channel: 'channel',
  canal: 'channel',
  anime: 'anime',
  dorama: 'dorama',
  novela: 'novela',
  documental: 'documental',
  kids: 'zona kids',
  'zona kids': 'zona kids',
  'continue-watching': 'continue-watching',
  continuar: 'continue-watching',
};

export function unwrapTVItems(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.videos)) return response.videos;
  if (Array.isArray(response?.channels)) return response.channels;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

export function getTVItemId(item) {
  return item?._id || item?.id || null;
}

export function getTVItemTitle(item) {
  return item?.name || item?.title || item?.titulo || 'Contenido';
}

export function getTVItemDescription(item) {
  return item?.description || item?.descripcion || item?.sinopsis || item?.synopsis || item?.overview || item?.plot || item?.resumen || '';
}

export function getTVItemYear(item) {
  return (
    item?.releaseYear ||
    item?.year ||
    item?.release_year ||
    item?.ano ||
    item?.año ||
    item?.first_air_date?.slice?.(0, 4) ||
    item?.release_date?.slice?.(0, 4) ||
    item?.airDate?.slice?.(0, 4) ||
    ''
  );
}

export function getTVItemGenre(item) {
  if (Array.isArray(item?.genres)) {
    return item.genres.join(', ');
  }

  if (Array.isArray(item?.generos)) {
    return item.generos.join(', ');
  }

  return (
    item?.genre ||
    item?.genres ||
    item?.genero ||
    item?.categoria ||
    item?.categoryName ||
    item?.subcategoria ||
    item?.section ||
    item?.mainSection ||
    ''
  );
}

export function getTVItemRating(item) {
  const rawValue =
    item?.ratingDisplay ??
    item?.tmdbRating ??
    item?.rating ??
    item?.vote_average ??
    item?.ranking ??
    item?.rankingLabel ??
    item?.displayRating ??
    null;

  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return '';
  }

  const numeric = Number(rawValue);
  if (!Number.isNaN(numeric)) {
    return numeric.toFixed(1);
  }

  return String(rawValue);
}

export function resolveTVItemType(item, fallbackType = 'movie') {
  const rawType = String(item?.itemType || item?.tipo || item?.type || fallbackType || 'movie').toLowerCase();
  return TYPE_MAP[rawType] || fallbackType;
}

export function getTVItemImage(item) {
  const image =
    item?.customThumbnail ||
    item?.customPoster ||
    item?.tmdbThumbnail ||
    item?.thumbnail ||
    item?.poster ||
    item?.portada ||
    item?.posterPath ||
    item?.poster_path ||
    item?.image ||
    item?.logo ||
    '';

  return rewriteImageUrl(image) || '/img/placeholder-thumbnail.png';
}

export function getTVItemBackdrop(item) {
  const backdrop =
    item?.bannerImage ||
    item?.bannerUrl ||
    item?.customBanner ||
    item?.customBackdrop ||
    item?.horizontalImage ||
    item?.horizontalThumbnail ||
    item?.heroBanner ||
    item?.heroImage ||
    item?.landscapeThumbnail ||
    item?.backdropPath ||
    item?.backdrop_path ||
    item?.backdrop ||
    item?.banner ||
    item?.cover ||
    item?.imagenHorizontal ||
    item?.portadaHorizontal ||
    item?.thumbnail ||
    item?.customThumbnail ||
    item?.tmdbThumbnail ||
    item?.logo ||
    item?.image ||
    '';

  return rewriteImageUrl(backdrop) || getTVItemImage(item);
}

export function getTVItemTrailerUrl(item) {
  const trailerUrl =
    item?.trailerUrl ||
    item?.trailer_url ||
    item?.urlTrailer ||
    item?.trailer ||
    item?.trailerLink ||
    item?.officialTrailer ||
    item?.youtube ||
    item?.youtubeUrl ||
    item?.youtube_url ||
    item?.url_trailer ||
    '';

  return String(trailerUrl || '').trim();
}

function getNormalizedEpisodeNumber(chapter, chapterIndex = 0) {
  const rawEpisodeNumber =
    chapter?.episodeNumber ??
    chapter?.chapterNumber ??
    chapter?.numero ??
    chapter?.numeroCapitulo ??
    chapter?.capitulo ??
    chapter?.episode ??
    chapter?.number ??
    null;

  const episodeNumber = Number(rawEpisodeNumber);
  return Number.isFinite(episodeNumber) && episodeNumber > 0 ? episodeNumber : (chapterIndex + 1);
}

function normalizeTVItemChapters(chapters) {
  if (!Array.isArray(chapters)) {
    return [];
  }

  return chapters
    .filter(Boolean)
    .map((chapter, chapterIndex) => ({
      ...chapter,
      episodeNumber: getNormalizedEpisodeNumber(chapter, chapterIndex),
    }));
}

function getSeasonChapters(season) {
  return (
    season?.chapters ||
    season?.episodes ||
    season?.capitulos ||
    season?.episodios ||
    season?.items ||
    []
  );
}

function getSeasonNumber(season, seasonIndex = 0) {
  const rawSeasonNumber =
    season?.seasonNumber ??
    season?.temporada ??
    season?.season ??
    season?.number ??
    season?.numero ??
    null;

  const seasonNumber = Number(rawSeasonNumber);
  return Number.isFinite(seasonNumber) && seasonNumber > 0 ? seasonNumber : (seasonIndex + 1);
}

export function getTVItemSeasons(item) {
  const rawSeasons =
    item?.seasons ||
    item?.temporadas ||
    item?.seasonList ||
    [];

  if (Array.isArray(rawSeasons) && rawSeasons.length > 0) {
    return rawSeasons
      .filter(Boolean)
      .map((season, seasonIndex) => ({
        ...season,
        seasonNumber: getSeasonNumber(season, seasonIndex),
        title:
          season?.title ||
          season?.name ||
          season?.nombre ||
          `Temporada ${getSeasonNumber(season, seasonIndex)}`,
        chapters: normalizeTVItemChapters(getSeasonChapters(season)),
      }));
  }

  const rawEpisodes =
    item?.chapters ||
    item?.episodes ||
    item?.capitulos ||
    item?.episodios ||
    [];

  const normalizedEpisodes = normalizeTVItemChapters(rawEpisodes);
  if (normalizedEpisodes.length > 0) {
    return [{
      seasonNumber: 1,
      title: 'Temporada 1',
      chapters: normalizedEpisodes,
    }];
  }

  return [];
}

function collectTVItemQualityTokens(item) {
  const rawTokens = [
    item?.title,
    item?.titulo,
    item?.name,
    item?.mainSection,
    item?.section,
    item?.subcategoria,
    item?.genre,
    item?.quality,
    item?.resolution,
    item?.videoQuality,
    ...(Array.isArray(item?.genres) ? item.genres : []),
  ];

  return rawTokens
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
}

export function isTVItem4K(item) {
  if (!item) {
    return false;
  }

  if (Boolean(item?.is4K)) {
    return true;
  }

  return collectTVItemQualityTokens(item).some((token) => (
    token.includes('cine_4k') ||
    token.includes('4k') ||
    token.includes('2160p') ||
    token.includes('uhd') ||
    token.includes('ultra hd') ||
    token.includes('ultrahd')
  ));
}

export function isTVItem60FPS(item) {
  if (!item) {
    return false;
  }

  if (Boolean(item?.is60FPS)) {
    return true;
  }

  return collectTVItemQualityTokens(item).some((token) => (
    token.includes('cine_60fps') ||
    token.includes('60fps') ||
    token.includes('60 fps') ||
    token.includes('60-fps') ||
    token.includes('fps60')
  ));
}

export function getTVItemQualityBadges(item) {
  const badges = [];

  if (isTVItem4K(item)) {
    badges.push('4K UHD');
  }

  if (isTVItem60FPS(item)) {
    badges.push('60 FPS');
  }

  return badges;
}

export function getTVItemBadges(item, fallbackType = 'movie') {
  const badges = [];
  const type = resolveTVItemType(item, fallbackType);
  const qualityBadges = getTVItemQualityBadges(item);
  const year = getTVItemYear(item);
  const genre = getTVItemGenre(item);
  const rating = getTVItemRating(item);

  if (type && type !== 'movie') {
    badges.push(type.toUpperCase());
  }
  badges.push(...qualityBadges);
  if (year) {
    badges.push(String(year));
  }
  if (genre) {
    badges.push(genre);
  }
  if (rating) {
    badges.push(`IMDb ${rating}`);
  }

  return badges.slice(0, 4);
}
