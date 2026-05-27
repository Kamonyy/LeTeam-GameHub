'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { lolAudio } from '@/lib/wordgame/lol-audio';
import { useLolAudioActions } from '../hooks/useWordGameAudio';

export interface WordGameAudioContextValue {
  enabled: boolean;
  muted: boolean;
  volume: number;
  setVolume: (scale: number) => void;
  toggleMuted: () => void;
  unlock: () => void;
  playSfx: ReturnType<typeof useLolAudioActions>['playSfx'];
  playChampionVoice: ReturnType<typeof useLolAudioActions>['playChampionVoice'];
  playChampionStinger: ReturnType<typeof useLolAudioActions>['playChampionStinger'];
  preloadChampion: ReturnType<typeof useLolAudioActions>['preloadChampion'];
}

export const WordGameAudioContext =
  createContext<WordGameAudioContextValue | null>(null);

interface WordGameAudioProviderProps {
  enabled: boolean;
  children: ReactNode;
  showMuteControl?: boolean;
}

export default function WordGameAudioProvider({
  enabled,
  children,
  showMuteControl = false,
}: WordGameAudioProviderProps) {
  const [muted, setMuted] = useState(() => lolAudio.isMuted());
  const [volume, setVolumeState] = useState(() => lolAudio.getVolume());
  const actions = useLolAudioActions(enabled);

  const setVolume = useCallback((scale: number) => {
    lolAudio.setVolume(scale);
    setVolumeState(lolAudio.getVolume());
  }, []);

  useEffect(() => {
    if (!enabled) {
      lolAudio.stopAll();
      return;
    }
    lolAudio.preloadUiSfx();
  }, [enabled]);

  const toggleMuted = useCallback(() => {
    const next = lolAudio.toggleMuted();
    setMuted(next);
  }, []);

  const unlock = useCallback(() => {
    actions.unlock();
    lolAudio.unlock();
  }, [actions]);

  useEffect(() => {
    if (!enabled) return;
    const onPointer = () => lolAudio.unlock();
    window.addEventListener('pointerdown', onPointer, { passive: true });
    return () => window.removeEventListener('pointerdown', onPointer);
  }, [enabled]);

  const value = useMemo<WordGameAudioContextValue>(
    () => ({
      enabled,
      muted,
      volume,
      setVolume,
      toggleMuted,
      unlock,
      playSfx: actions.playSfx,
      playChampionVoice: actions.playChampionVoice,
      playChampionStinger: actions.playChampionStinger,
      preloadChampion: actions.preloadChampion,
    }),
    [enabled, muted, volume, setVolume, toggleMuted, unlock, actions]
  );

  return (
    <WordGameAudioContext.Provider value={value}>
      {children}
      {enabled && showMuteControl && (
        <button
          type="button"
          onClick={toggleMuted}
          className="sw-audio-mute"
          aria-label={muted ? 'Unmute game sounds' : 'Mute game sounds'}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ?
            <VolumeX className="w-4 h-4" />
          :	<Volume2 className="w-4 h-4" />}
        </button>
      )}
    </WordGameAudioContext.Provider>
  );
}
