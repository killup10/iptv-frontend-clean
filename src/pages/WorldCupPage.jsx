import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CalendarDays, CirclePlay, Clock3, Search, Shield, Trophy, Tv } from 'lucide-react';
import { fetchUserChannels, fetchWorldCupFixtures } from '../utils/api.js';
import { normalizeSearchText } from '../utils/searchUtils.js';

const WORLD_CUP_BACKGROUND_URL = 'https://laverdadnoticias.com/wp-content/uploads/2025/12/Sorteo-del-Mundial-2026-todo-lo-que-debes-saber.jpg';

const EVENT_DAYS = [
  {
    date: '2026-06-11',
    label: 'Hoy',
    matches: [
      {
        id: 'mexico-vs-sudafrica',
        group: 'Grupo A',
        status: 'live',
        minute: 65,
        home: { name: 'Mexico', flag: '🇲🇽', score: 1 },
        away: { name: 'Sudafrica', flag: '🇿🇦', score: 1 },
        kickoff: '20:00',
        channels: ['Latina TV', 'DirecTV Sports', 'ESPN HD'],
      },
      {
        id: 'peru-vs-brasil',
        group: 'Amistoso especial',
        status: 'upcoming',
        home: { name: 'Peru', flag: '🇵🇪' },
        away: { name: 'Brasil', flag: '🇧🇷' },
        kickoff: '22:00',
        channels: ['Latina TV', 'DirecTV Sports', 'ESPN HD'],
      },
      {
        id: 'argentina-vs-francia',
        group: 'Partido destacado',
        status: 'finished',
        home: { name: 'Argentina', flag: '🇦🇷', score: 2 },
        away: { name: 'Francia', flag: '🇫🇷', score: 1 },
        kickoff: '16:00',
        channels: ['TyC Sports', 'DirecTV Sports'],
      },
    ],
  },
  {
    date: '2026-06-12',
    label: 'Manana',
    matches: [
      {
        id: 'espana-vs-japon',
        group: 'Grupo B',
        status: 'upcoming',
        home: { name: 'Espana', flag: '🇪🇸' },
        away: { name: 'Japon', flag: '🇯🇵' },
        kickoff: '18:00',
        channels: ['ESPN HD', 'DirecTV Sports'],
      },
      {
        id: 'colombia-vs-uruguay',
        group: 'Grupo C',
        status: 'upcoming',
        home: { name: 'Colombia', flag: '🇨🇴' },
        away: { name: 'Uruguay', flag: '🇺🇾' },
        kickoff: '21:00',
        channels: ['Caracol TV', 'DirecTV Sports'],
      },
    ],
  },
];

const GROUP_TABLES = [
  {
    group: 'Grupo A',
    teams: [
      { flag: '🇧🇷', name: 'Brasil', pts: 6, pj: 2, dg: '+4' },
      { flag: '🇲🇽', name: 'Mexico', pts: 4, pj: 2, dg: '+2' },
      { flag: '🇨🇦', name: 'Canada', pts: 1, pj: 2, dg: '-1' },
      { flag: '🇿🇦', name: 'Sudafrica', pts: 0, pj: 2, dg: '-5' },
    ],
  },
  {
    group: 'Grupo B',
    teams: [
      { flag: '🇦🇷', name: 'Argentina', pts: 6, pj: 2, dg: '+3' },
      { flag: '🇪🇸', name: 'Espana', pts: 3, pj: 2, dg: '+1' },
      { flag: '🇯🇵', name: 'Japon', pts: 3, pj: 2, dg: '0' },
      { flag: '🇵🇪', name: 'Peru', pts: 0, pj: 2, dg: '-4' },
    ],
  },
  {
    group: 'Grupo C',
    teams: [
      { flag: '🇫🇷', name: 'Francia', pts: 4, pj: 2, dg: '+2' },
      { flag: '🇨🇴', name: 'Colombia', pts: 4, pj: 2, dg: '+1' },
      { flag: '🇺🇾', name: 'Uruguay', pts: 2, pj: 2, dg: '0' },
      { flag: '🇺🇸', name: 'Estados Unidos', pts: 0, pj: 2, dg: '-3' },
    ],
  },
];

const FEATURED_MATCH_ID = 'peru-vs-brasil';
const REMINDER_KEY = 'teamg-worldcup-reminders';

function getStatusLabel(match) {
  if (match.status === 'live') return `EN VIVO - ${match.minute || 0}'`;
  if (match.status === 'finished') return 'FINALIZADO';
  return 'PROXIMO';
}

function getStatusClass(status) {
  if (status === 'live') return 'bg-emerald-400 text-emerald-950';
  if (status === 'finished') return 'bg-red-500 text-white';
  return 'bg-amber-300 text-amber-950';
}

function findChannelByName(channels, channelName) {
  const target = normalizeSearchText(channelName);
  return channels.find((channel) => {
    const name = normalizeSearchText(channel?.name || channel?.title || '');
    return name.includes(target) || target.includes(name);
  });
}

function MatchCard({ match, channels, reminders, onWatchChannel, onToggleReminder }) {
  const availableChannels = match.channels
    .map((name) => ({ name, channel: findChannelByName(channels, name) }))
    .filter((item) => item.channel);
  const isReminderActive = reminders.includes(match.id);

  return (
    <article className="rounded-lg border border-white/10 bg-black/45 p-4 shadow-xl backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className={`rounded-full px-3 py-1 text-[11px] font-black tracking-wide ${getStatusClass(match.status)}`}>
          {getStatusLabel(match)}
        </span>
        <span className="text-xs font-semibold text-white/65">{match.group}</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="min-w-0 text-right">
          <p className="truncate text-sm font-bold text-white sm:text-base">{match.home.flag} {match.home.name}</p>
        </div>
        <div className="rounded-md bg-white px-3 py-2 text-center text-lg font-black text-slate-950">
          {match.status === 'upcoming'
            ? match.kickoff
            : `${match.home.score ?? 0} - ${match.away.score ?? 0}`}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white sm:text-base">{match.away.flag} {match.away.name}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {availableChannels.slice(0, 3).map(({ name, channel }) => (
          <button
            key={`${match.id}-${name}`}
            type="button"
            onClick={() => onWatchChannel(channel)}
            className="inline-flex items-center gap-2 rounded-md bg-cyan-400 px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-cyan-300"
          >
            <Tv className="h-4 w-4" />
            {name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onToggleReminder(match.id)}
          className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-black transition ${
            isReminderActive
              ? 'bg-fuchsia-500 text-white'
              : 'bg-white/10 text-white hover:bg-white/15'
          }`}
        >
          <Bell className="h-4 w-4" />
          {isReminderActive ? 'Recordatorio activo' : 'Notificarme'}
        </button>
      </div>

      {availableChannels.length === 0 && (
        <p className="mt-3 rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
          Asocia este partido a tus canales editando la lista manual de esta pagina.
        </p>
      )}
    </article>
  );
}

export default function WorldCupPage() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState([]);
  const [eventDays, setEventDays] = useState(EVENT_DAYS);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [selectedDay, setSelectedDay] = useState(EVENT_DAYS[0].date);
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const loadChannels = async () => {
      try {
        const data = await fetchUserChannels('Todos');
        if (!cancelled) setChannels(Array.isArray(data) ? data : []);
      } catch (error) {
        console.warn('[WorldCupPage] No se pudieron cargar canales:', error?.message || error);
      } finally {
        if (!cancelled) setLoadingChannels(false);
      }
    };

    loadChannels();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAutomaticFixtures = async () => {
      try {
        const today = EVENT_DAYS[0].date;
        const payload = await fetchWorldCupFixtures(today);
        if (cancelled || !Array.isArray(payload?.matches) || payload.matches.length === 0) {
          return;
        }

        setEventDays((current) => current.map((day, index) => (
          index === 0
            ? {
                ...day,
                matches: payload.matches.map((match) => ({
                  ...match,
                  channels: match.channels?.length ? match.channels : ['Latina TV', 'DirecTV Sports', 'ESPN HD'],
                })),
              }
            : day
        )));
      } catch (error) {
        console.warn('[WorldCupPage] Fixture automatico no disponible, usando datos manuales:', error?.message || error);
      }
    };

    loadAutomaticFixtures();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(REMINDER_KEY) || '[]');
      setReminders(Array.isArray(stored) ? stored : []);
    } catch {
      setReminders([]);
    }
  }, []);

  const allMatches = useMemo(() => eventDays.flatMap((day) => day.matches), [eventDays]);
  const featuredMatch = allMatches.find((match) => match.id === FEATURED_MATCH_ID) || allMatches[0];
  const liveMatches = allMatches.filter((match) => match.status === 'live');
  const selectedMatches = eventDays.find((day) => day.date === selectedDay)?.matches || eventDays[0].matches;
  const featuredChannels = featuredMatch.channels
    .map((name) => ({ name, channel: findChannelByName(channels, name) }))
    .filter((item) => item.channel);

  const onWatchChannel = (channel) => {
    const channelId = channel?.id || channel?._id;
    if (!channelId) return;
    navigate(`/watch/channel/${channelId}`, {
      replace: true,
      state: {
        fromSection: 'worldcup',
        channelName: channel.name,
      },
    });
  };

  const onToggleReminder = (matchId) => {
    setReminders((current) => {
      const next = current.includes(matchId)
        ? current.filter((id) => id !== matchId)
        : [...current, matchId];
      localStorage.setItem(REMINDER_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <div className="absolute inset-0 -z-20 bg-[#0a0a0a]" />
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center opacity-30 blur-sm scale-105"
        style={{ backgroundImage: `url('${WORLD_CUP_BACKGROUND_URL}')` }}
      />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_8%,rgba(0,255,170,0.35),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(255,0,85,0.25),transparent_28%),linear-gradient(135deg,rgba(0,0,0,0.96),rgba(10,10,10,0.86)_48%,rgba(20,0,10,0.78))]" />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black/60 p-6 shadow-2xl backdrop-blur-md sm:p-8">
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                <img src="./logo-mundial.png" alt="Mundial 26" className="h-12 w-12 object-contain drop-shadow-md" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                <span className="hidden text-3xl font-black text-black">26</span>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">Copa del Mundo 2026</p>
                <h1 className="text-4xl font-black tracking-tight sm:text-6xl bg-gradient-to-r from-white via-cyan-100 to-emerald-200 bg-clip-text text-transparent drop-shadow-sm">Zona Mundial</h1>
              </div>
            </div>

            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200">
                Partido destacado
              </p>
              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
                <div className="text-right">
                  <p className="text-4xl sm:text-5xl">{featuredMatch.home.flag}</p>
                  <p className="mt-2 text-xl font-black sm:text-3xl">{featuredMatch.home.name}</p>
                </div>
                <div className="rounded-lg bg-white px-4 py-3 text-center text-2xl font-black text-slate-950 sm:px-6 sm:text-3xl">
                  VS
                  <p className="mt-1 text-xs font-bold text-slate-500">{featuredMatch.kickoff}</p>
                </div>
                <div>
                  <p className="text-4xl sm:text-5xl">{featuredMatch.away.flag}</p>
                  <p className="mt-2 text-xl font-black sm:text-3xl">{featuredMatch.away.name}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {featuredChannels[0]?.channel && (
                  <button
                    type="button"
                    onClick={() => onWatchChannel(featuredChannels[0].channel)}
                    className="inline-flex items-center gap-2 rounded-md bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200"
                  >
                    <CirclePlay className="h-5 w-5" />
                    Ver en vivo
                  </button>
                )}
                <a
                  href="#canales"
                  className="inline-flex items-center gap-2 rounded-md bg-white/10 px-5 py-3 text-sm font-black text-white ring-1 ring-white/15 transition hover:bg-white/15"
                >
                  <Tv className="h-5 w-5" />
                  Ver canales disponibles
                </a>
              </div>
            </div>
          </div>

          <aside className="rounded-lg border border-white/10 bg-black/45 p-5 shadow-2xl backdrop-blur-md">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-300" />
              <h2 className="text-lg font-black">En vivo ahora</h2>
            </div>
            <div className="space-y-3">
              {liveMatches.length > 0 ? liveMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  channels={channels}
                  reminders={reminders}
                  onWatchChannel={onWatchChannel}
                  onToggleReminder={onToggleReminder}
                />
              )) : (
                <p className="rounded-md bg-white/10 px-4 py-4 text-sm text-white/70">
                  No hay partidos en vivo ahora.
                </p>
              )}
            </div>
          </aside>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-lg border border-white/10 bg-black/42 p-5 shadow-2xl backdrop-blur-md">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-cyan-300" />
                <h2 className="text-xl font-black">Fixture</h2>
              </div>
              <div className="flex rounded-md bg-white/10 p-1">
                {eventDays.map((day) => (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedDay(day.date)}
                    className={`rounded px-3 py-2 text-xs font-black transition ${
                      selectedDay === day.date ? 'bg-cyan-300 text-slate-950' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {selectedMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  channels={channels}
                  reminders={reminders}
                  onWatchChannel={onWatchChannel}
                  onToggleReminder={onToggleReminder}
                />
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/42 p-5 shadow-2xl backdrop-blur-md">
            <div className="mb-5 flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-300" />
              <h2 className="text-xl font-black">Fase de grupos</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {GROUP_TABLES.map((group) => (
                <div key={group.group} className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.06]">
                  <div className="bg-white/10 px-4 py-3">
                    <h3 className="font-black">{group.group}</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase tracking-wide text-white/50">
                      <tr>
                        <th className="px-3 py-2 text-left">Equipo</th>
                        <th className="px-2 py-2">Pts</th>
                        <th className="px-2 py-2">PJ</th>
                        <th className="px-2 py-2">DG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.teams.map((team) => (
                        <tr key={team.name} className="border-t border-white/10">
                          <td className="px-3 py-2 font-semibold">{team.flag} {team.name}</td>
                          <td className="px-2 py-2 text-center font-black text-amber-200">{team.pts}</td>
                          <td className="px-2 py-2 text-center text-white/75">{team.pj}</td>
                          <td className="px-2 py-2 text-center text-white/75">{team.dg}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="canales" className="mt-8 rounded-lg border border-white/10 bg-black/42 p-5 shadow-2xl backdrop-blur-md">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Tv className="h-5 w-5 text-amber-300" />
              <h2 className="text-xl font-black">Canales disponibles</h2>
            </div>
            <p className="text-xs font-semibold text-white/55">
              {loadingChannels ? 'Buscando canales...' : `${channels.length} canales en tu catalogo`}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[...new Set(allMatches.flatMap((match) => match.channels))].map((channelName) => {
              const channel = findChannelByName(channels, channelName);
              return (
                <button
                  key={channelName}
                  type="button"
                  disabled={!channel}
                  onClick={() => channel && onWatchChannel(channel)}
                  className={`flex items-center justify-between rounded-lg border px-4 py-4 text-left transition ${
                    channel
                      ? 'border-cyan-300/30 bg-cyan-300/10 hover:bg-cyan-300/18'
                      : 'border-white/10 bg-white/[0.04] opacity-60'
                  }`}
                >
                  <span>
                    <span className="block text-sm font-black">{channelName}</span>
                    <span className="mt-1 block text-xs text-white/55">
                      {channel ? 'Disponible en TeamG' : 'Pendiente de asociar'}
                    </span>
                  </span>
                  <CirclePlay className="h-5 w-5 text-cyan-200" />
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md">
            <Clock3 className="mb-3 h-5 w-5 text-amber-300" />
            <h3 className="font-black">Manual hoy, automatico despues</h3>
            <p className="mt-2 text-sm text-white/65">Edita partidos y tablas en este archivo. Luego se puede mover a MongoDB sin rehacer la UI.</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md">
            <Search className="mb-3 h-5 w-5 text-cyan-300" />
            <h3 className="font-black">Canales conectados</h3>
            <p className="mt-2 text-sm text-white/65">Los botones buscan tus canales por nombre y abren directamente el player.</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md">
            <Bell className="mb-3 h-5 w-5 text-fuchsia-300" />
            <h3 className="font-black">Recordatorios</h3>
            <p className="mt-2 text-sm text-white/65">Quedan guardados localmente; despues pueden convertirse en notificaciones reales.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
