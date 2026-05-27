import {
  getLolChampionById,
  type LolChampion,
  type LolChampionAudio,
} from './lol-champions';
import { cdragonAssetUrl, cdragonChampionJsonUrl } from './lol-cdragon';
import { lolAudio } from './lol-audio';

export interface ChampionVoiceManifest {
  championId: string;
  lines: string[];
}

const manifestCache = new Map<string, ChampionVoiceManifest>();
const inflight = new Map<string, Promise<ChampionVoiceManifest | null>>();

function linesFromAudio(audio: LolChampionAudio | undefined): string[] {
  if (!audio) return [];
  const lines = [audio.choose, audio.ban].filter(
    (url): url is string => typeof url === 'string' && url.length > 0
  );
  return [...new Set(lines)];
}

async function fetchManifestFromCdragon(
  champion: LolChampion
): Promise<ChampionVoiceManifest | null> {
  try {
    const res = await fetch(cdragonChampionJsonUrl(champion.key), {
      credentials: 'omit',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      chooseVoPath?: string;
      banVoPath?: string;
      stingerSfxPath?: string;
    };
    const lines = [
      data.chooseVoPath ? cdragonAssetUrl(data.chooseVoPath) : '',
      data.banVoPath ? cdragonAssetUrl(data.banVoPath) : '',
    ].filter(Boolean);
    if (lines.length === 0) return null;
    return { championId: champion.id, lines: [...new Set(lines)] };
  } catch {
    return null;
  }
}

/** Resolve playable champion VO URLs (choose + ban from Riot game-data). */
export async function getChampionVoiceManifest(
  championId: string
): Promise<ChampionVoiceManifest | null> {
  const cached = manifestCache.get(championId);
  if (cached) return cached;

  const pending = inflight.get(championId);
  if (pending) return pending;

  const promise = (async () => {
    const champ = getLolChampionById(championId);
    if (!champ) return null;

    const embedded = linesFromAudio(champ.audio);
    if (embedded.length > 0) {
      const manifest = { championId, lines: embedded };
      manifestCache.set(championId, manifest);
      return manifest;
    }

    const remote = await fetchManifestFromCdragon(champ);
    if (remote) manifestCache.set(championId, remote);
    return remote;
  })().finally(() => {
    inflight.delete(championId);
  });

  inflight.set(championId, promise);
  return promise;
}

export function pickRandomVoiceLine(manifest: ChampionVoiceManifest): string | null {
  if (manifest.lines.length === 0) return null;
  const i = Math.floor(Math.random() * manifest.lines.length);
  return manifest.lines[i] ?? null;
}

/** Preload manifest (and warm HTTP cache) for a champion. */
export async function preloadChampionVoice(championId: string): Promise<void> {
  await getChampionVoiceManifest(championId);
}

/** Play a random champ-select style voice line for this champion. */
export async function playRandomChampionVoiceLine(
  championId: string,
  volume = 0.88
): Promise<void> {
  const manifest = await getChampionVoiceManifest(championId);
  if (!manifest) return;
  const url = pickRandomVoiceLine(manifest);
  if (!url) return;
  lolAudio.stopVoice();
  await lolAudio.playUrl(url, 'voice', volume);
}

export function getChampionStingerUrl(championId: string): string | null {
  const champ = getLolChampionById(championId);
  return champ?.audio?.stinger ?? null;
}
