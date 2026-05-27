'use client';

import { useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import type { WordGameAudioContextValue } from './WordGameAudioProvider';

const VOLUME_PREVIEW_DELAY_MS = 320;

type WordGameVolumeControlProps = {
  audio: WordGameAudioContextValue;
};

export default function WordGameVolumeControl({ audio }: WordGameVolumeControlProps) {
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumePercent = Math.round(audio.volume * 100);

  useEffect(() => {
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  const applyVolume = (percent: number) => {
    audio.unlock();
    audio.setVolume(percent / 100);
  };

  const scheduleVolumePreview = () => {
    if (audio.muted) return;
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => {
      previewTimerRef.current = null;
      audio.previewVolume();
    }, VOLUME_PREVIEW_DELAY_MS);
  };

  const cancelVolumePreview = () => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
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
        onPointerDown={cancelVolumePreview}
        onInput={(e) => applyVolume(Number(e.currentTarget.value))}
        onPointerUp={scheduleVolumePreview}
        onKeyUp={(e) => {
          if (
            e.key === 'ArrowLeft' ||
            e.key === 'ArrowRight' ||
            e.key === 'ArrowUp' ||
            e.key === 'ArrowDown' ||
            e.key === 'Home' ||
            e.key === 'End'
          ) {
            scheduleVolumePreview();
          }
        }}
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
