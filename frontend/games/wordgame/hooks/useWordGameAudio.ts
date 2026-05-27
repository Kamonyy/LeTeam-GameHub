'use client';

import { useCallback, useContext, useEffect, useMemo } from 'react';
import { lolAudio, type LolUiSfxKey } from '@/lib/wordgame/lol-audio';
import {
  playRandomChampionVoiceLine,
  preloadChampionVoice,
  getChampionStingerUrl,
  getChampionVoiceManifest,
} from '@/lib/wordgame/lol-champion-vo';
import { WordGameAudioContext } from '../components/WordGameAudioProvider';

export function useWordGameAudio() {
  const ctx = useContext(WordGameAudioContext);
  if (!ctx) {
    throw new Error('useWordGameAudio must be used within WordGameAudioProvider');
  }
  return ctx;
}

/** Safe hook when provider may be absent (returns no-op handlers). */
export function useWordGameAudioOptional() {
  return useContext(WordGameAudioContext);
}

export function useLolAudioActions(enabled: boolean) {
  const unlock = useCallback(() => {
    if (enabled) lolAudio.unlock();
  }, [enabled]);

  const playSfx = useCallback(
    (key: LolUiSfxKey, volume?: number) => {
      if (!enabled || lolAudio.isMuted()) return;
      lolAudio.unlock();
      lolAudio.playUiSfx(key, volume);
    },
    [enabled]
  );

  const playChampionVoice = useCallback(
    (championId: string) => {
      if (!enabled || lolAudio.isMuted() || !championId) return;
      lolAudio.unlock();
      playRandomChampionVoiceLine(championId);
    },
    [enabled]
  );

  const playChampionStinger = useCallback(
    (championId: string, volume = 0.45) => {
      if (!enabled || lolAudio.isMuted() || !championId) return;
      lolAudio.unlock();
      const url = getChampionStingerUrl(championId);
      if (url) {
        lolAudio.playUrl(url, 'sfx', volume);
        return;
      }
      void getChampionVoiceManifest(championId).then(() => {
        if (!enabled || lolAudio.isMuted()) return;
        const resolved = getChampionStingerUrl(championId);
        if (resolved) lolAudio.playUrl(resolved, 'sfx', volume);
      });
    },
    [enabled]
  );

  const preloadChampion = useCallback(
    (championId: string) => {
      if (!enabled || !championId) return;
      preloadChampionVoice(championId);
    },
    [enabled]
  );

  useEffect(() => {
    if (!enabled) return;
    lolAudio.preloadUiSfx();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const onKey = () => lolAudio.unlock();
    window.addEventListener('keydown', onKey, { once: true });
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);

  return useMemo(
    () => ({
      unlock,
      playSfx,
      playChampionVoice,
      playChampionStinger,
      preloadChampion,
      isMuted: lolAudio.isMuted(),
      toggleMuted: () => lolAudio.toggleMuted(),
    }),
    [unlock, playSfx, playChampionVoice, playChampionStinger, preloadChampion]
  );
}
