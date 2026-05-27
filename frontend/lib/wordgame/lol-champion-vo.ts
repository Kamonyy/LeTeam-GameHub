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
  stinger?: string;
}

const manifestCache = new Map<string, ChampionVoiceManifest>();
const inflight = new Map<string, Promise<ChampionVoiceManifest | null>>();
let voiceRequestGeneration = 0;

/** Drop in-flight champion VO (mute, leave game, new line). */
export function invalidateChampionVoicePlayback(): void {
  voiceRequestGeneration += 1;
}

function linesFromAudio(audio: LolChampionAudio | undefined): string[] {
  if (!audio) return [];
  const lines = [audio.choose, audio.ban].filter(
    (url): url is string => typeof url === 'string' && url.length > 0
  );
  return [...new Set(lines)];
}

function warmManifestLines(manifest: ChampionVoiceManifest): void {
  for (const url of manifest.lines) {
    lolAudio.warmUrl(url);
  }
  if (manifest.stinger) lolAudio.warmUrl(manifest.stinger);
}

function manifestFromChampion(champion: LolChampion): ChampionVoiceManifest | null {
  const lines = linesFromAudio(champion.audio);
  const stinger = champion.audio?.stinger;
  if (lines.length === 0 && !stinger) return null;
  return {
    championId: champion.id,
    lines,
    ...(stinger ? { stinger } : {}),
  };
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
    const stinger = data.stingerSfxPath ?
      cdragonAssetUrl(data.stingerSfxPath)
    : undefined;
    if (lines.length === 0 && !stinger) return null;
    return {
      championId: champion.id,
      lines: [...new Set(lines)],
      ...(stinger ? { stinger } : {}),
    };
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

    const embedded = manifestFromChampion(champ);
    if (embedded) {
      manifestCache.set(championId, embedded);
      warmManifestLines(embedded);
      return embedded;
    }

    const remote = await fetchManifestFromCdragon(champ);
    if (remote) {
      manifestCache.set(championId, remote);
      warmManifestLines(remote);
    }
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

function playVoiceUrl(url: string, volume: number, requestGen: number): void {
  if (requestGen !== voiceRequestGeneration) return;
  if (!lolAudio.canPlay()) return;
  lolAudio.stopVoice();
  lolAudio.playUrl(url, 'voice', volume);
}

/** Preload manifest and audio clips for a champion. */
export function preloadChampionVoice(championId: string): void {
  if (!championId) return;

  const champ = getLolChampionById(championId);
  if (!champ) return;

  const embedded = manifestFromChampion(champ);
  if (embedded) {
    manifestCache.set(championId, embedded);
    warmManifestLines(embedded);
    return;
  }

  void getChampionVoiceManifest(championId);
}

/** Play a random champ-select style voice line for this champion. */
export function playRandomChampionVoiceLine(
  championId: string,
  volume = 0.88
): void {
  if (!lolAudio.canPlay() || !championId) return;

  const requestGen = ++voiceRequestGeneration;
  const cached = manifestCache.get(championId);

  if (cached) {
    const url = pickRandomVoiceLine(cached);
    if (url) playVoiceUrl(url, volume, requestGen);
    return;
  }

  void getChampionVoiceManifest(championId).then((manifest) => {
    if (!manifest) return;
    const url = pickRandomVoiceLine(manifest);
    if (url) playVoiceUrl(url, volume, requestGen);
  });
}

export function getChampionStingerUrl(championId: string): string | null {
  const champ = getLolChampionById(championId);
  const embedded = champ?.audio?.stinger ?? null;
  if (embedded) {
    lolAudio.warmUrl(embedded);
    return embedded;
  }

  const cached = manifestCache.get(championId);
  const fromCache = cached?.stinger ?? null;
  if (fromCache) lolAudio.warmUrl(fromCache);
  return fromCache;
}
