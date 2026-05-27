'use client';

import { useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import type { WordGameAudioContextValue } from './WordGameAudioProvider';

type WordGameVolumeControlProps = {
  audio: WordGameAudioContextValue;
};

export default function WordGameVolumeControl({ audio }: WordGameVolumeControlProps) {
  const lastPreviewAt = useRef(0);
  const volumePercent = Math.round(audio.volume * 100);

  const handleVolumeChange = (percent: number) => {
    const scale = percent / 100;
    audio.unlock();
    audio.setVolume(scale);
    const now = Date.now();
    if (now - lastPreviewAt.current > 120) {
      lastPreviewAt.current = now;
      audio.previewVolume();
    }
  };

  return (
    <div className="sw-audio-volume">
      <button
        type="button"
        onClick={() => {
          audio.unlock();
          const isMuted = audio.toggleMuted();
          if (!isMuted) {
            audio.previewVolume();
          }
        }}
        className="sw-audio-volume__mute"
        aria-label={audio.muted ? 'Unmute game sounds' : 'Mute game sounds'}
        title={audio.muted ? 'Unmute' : 'Mute'}
      >
        {audio.muted ?
          <VolumeX className="w-4 h-4" />
        : <Volume2 className="w-4 h-4" />}
      </button>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={volumePercent}
        disabled={audio.muted}
        onInput={(e) => handleVolumeChange(Number(e.currentTarget.value))}
        className="sw-audio-volume__slider"
        aria-label="Game sound volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={volumePercent}
        aria-valuetext={`${volumePercent} percent`}
      />
      <span className="sw-audio-volume__label tabular-nums" aria-hidden>
        {volumePercent}%
      </span>
    </div>
  );
}
