// Editorial order for the Android TV Home. Match station names, not substring
// searches: TNT Sports, ESPN 2 and ATV+ must not replace the requested stations.
export const HOME_LIVE_STATIONS = [
  { title: 'América TV', aliases: ['america tv', 'america', 'america television'] },
  { title: 'TNT', aliases: ['tnt'] },
  { title: 'L1 MAX', aliases: ['l1 max', 'liga1 max', 'liga 1 max', 'liga uno max'] },
  { title: 'Discovery Kids', aliases: ['discovery kids', 'discovery kids latino', 'discovery kids latinoamerica'] },
  { title: 'Latina', aliases: ['latina', 'latina tv', 'latina television'] },
  { title: 'ADN 40', aliases: ['adn 40', 'adn40'] },
  { title: 'ESPN', aliases: ['espn', 'espn latino', 'espn latinoamerica'] },
  { title: 'AMC', aliases: ['amc'] },
  { title: 'ATV', aliases: ['atv', 'atv tv'] },
];

export function normalizeHomeStationName(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/\b(?:uhd|fhd|hd|sd|4k|1080p|720p|h264|h265|hevc)\b/g, ' ')
    .replace(/\b(?:peru|per|mexico|mex|latam)\b/g, ' ')
    .replace(/[._-]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function selectHomeLiveChannels(channels) {
  const available = Array.isArray(channels) ? channels : [];
  return HOME_LIVE_STATIONS.map(station => available.find(channel => {
    const url = channel?.url || channel?.streamUrl || channel?.stream_url || channel?.playbackUrl || channel?.videoUrl;
    return url && station.aliases.includes(normalizeHomeStationName(channel.name || channel.title));
  })).filter(Boolean);
}
