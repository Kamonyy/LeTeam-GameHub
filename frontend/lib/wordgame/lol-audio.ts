import { CDRAGON_CHAMP_SELECT_SFX } from './lol-cdragon';

/** Champion Select / client UI sounds (Community Dragon). */
export const LOL_UI_SFX = {
  click: `${CDRAGON_CHAMP_SELECT_SFX}/sfx-cs-button-thumbnail-click.ogg`,
  gridClick: `${CDRAGON_CHAMP_SELECT_SFX}/sfx-uikit-grid-click.ogg`,
  gridHover: `${CDRAGON_CHAMP_SELECT_SFX}/sfx-uikit-grid-hover.ogg`,
  lockIn: `${CDRAGON_CHAMP_SELECT_SFX}/sfx-cs-lockin-button-click.ogg`,
  pickConfirm: `${CDRAGON_CHAMP_SELECT_SFX}/sfx-cs-draft-notif-yourpick.ogg`,
  pickIntro: `${CDRAGON_CHAMP_SELECT_SFX}/sfx-cs-draft-pick-intro.ogg`,
  banClick: `${CDRAGON_CHAMP_SELECT_SFX}/sfx-cs-draft-ban-button-click.ogg`,
  roundFinalize: `${CDRAGON_CHAMP_SELECT_SFX}/sfx-cs-draft-ban-team-bans-locked.ogg`,
  cardSelect: `${CDRAGON_CHAMP_SELECT_SFX}/sfx-cs-aram-card-select.ogg`,
  splashForward: `${CDRAGON_CHAMP_SELECT_SFX}/sfx-cs-splash-forward.ogg`,
} as const;

export type LolUiSfxKey = keyof typeof LOL_UI_SFX;

type Channel = 'voice';

const STORAGE_KEY = 'sw-lol-audio-muted';
export const LOL_AUDIO_VOLUME_STORAGE_KEY = 'sw-lol-audio-volume';
const DEFAULT_VOLUME = 0.5;
const SFX_POOL_SIZE = 8;
const WARM_CACHE_MAX = 96;

function clampVolume(value: number): number {
  return Math.min(1, Math.max(0, value));
}

class LolAudioEngine {
  private unlocked = false;
  private muted = false;
  private volumeScale = DEFAULT_VOLUME;
  private uiSfxPreloaded = false;
  private persistVolumeTimer: ReturnType<typeof setTimeout> | null = null;
  private sfxPoolIndex = 0;
  private voicePlayGeneration = 0;
  private readonly sfxPool: HTMLAudioElement[] = [];
  private readonly activeSfx = new Set<HTMLAudioElement>();
  private readonly sfxRelativeGain = new WeakMap<HTMLAudioElement, number>();
  private readonly warmed = new Map<string, HTMLAudioElement>();
  private readonly warmOrder: string[] = [];
  private voiceEl: HTMLAudioElement | null = null;
  private voiceRelativeGain = 0.88;

  constructor() {
    if (typeof window === 'undefined') return;
    try {
      this.muted = localStorage.getItem(STORAGE_KEY) === '1';
      const raw = localStorage.getItem(LOL_AUDIO_VOLUME_STORAGE_KEY);
      if (raw != null) {
        const parsed = parseFloat(raw);
        if (Number.isFinite(parsed)) {
          this.volumeScale = clampVolume(parsed);
        }
      }
    } catch {
      /* ignore */
    }
  }

  getVolume(): number {
    return this.volumeScale;
  }

  setVolume(scale: number): void {
    this.volumeScale = clampVolume(scale);
    this.applyMasterVolume();
    if (typeof window === 'undefined') return;
    if (this.persistVolumeTimer) clearTimeout(this.persistVolumeTimer);
    this.persistVolumeTimer = setTimeout(() => {
      this.persistVolumeTimer = null;
      try {
        localStorage.setItem(LOL_AUDIO_VOLUME_STORAGE_KEY, String(this.volumeScale));
      } catch {
        /* ignore */
      }
    }, 300);
  }

  private effectiveVolume(relative: number): number {
    if (this.muted) return 0;
    return clampVolume(relative * this.volumeScale);
  }

  private applyMasterVolume(): void {
    if (typeof window === 'undefined') return;
    for (const el of this.activeSfx) {
      if (el.paused && el.ended) continue;
      const rel = this.sfxRelativeGain.get(el) ?? 0.55;
      el.volume = this.effectiveVolume(rel);
    }
    if (this.voiceEl && !this.voiceEl.paused) {
      this.voiceEl.volume = this.effectiveVolume(this.voiceRelativeGain);
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  canPlay(): boolean {
    return this.unlocked && !this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (muted) {
      this.stopAll();
      return;
    }
    this.applyMasterVolume();
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /** Call once after user gesture so autoplay policies allow sound. */
  unlock(): void {
    this.unlocked = true;
    this.preloadUiSfx();
  }

  get unlockedReady(): boolean {
    return this.unlocked;
  }

  /** Warm Community Dragon UI clips (idempotent). */
  preloadUiSfx(): void {
    if (typeof window === 'undefined' || this.uiSfxPreloaded) return;
    this.uiSfxPreloaded = true;
    for (const url of Object.values(LOL_UI_SFX)) {
      this.warmUrl(url);
    }
  }

  /** Decode a clip ahead of time so play() can start on the next frame. */
  warmUrl(url: string): void {
    if (typeof window === 'undefined' || !url || this.warmed.has(url)) return;

    if (this.warmOrder.length >= WARM_CACHE_MAX) {
      const evict = this.warmOrder.shift();
      if (evict) this.warmed.delete(evict);
    }

    const el = new Audio();
    el.preload = 'auto';
    el.src = url;
    el.load();
    this.warmed.set(url, el);
    this.warmOrder.push(url);
  }

  stopAll(): void {
    this.voicePlayGeneration += 1;
    for (const el of this.activeSfx) {
      el.pause();
      el.currentTime = 0;
    }
    this.activeSfx.clear();
    if (this.voiceEl) {
      this.voiceEl.pause();
      this.voiceEl.currentTime = 0;
    }
  }

  stopVoice(): void {
    this.voicePlayGeneration += 1;
    if (this.voiceEl) {
      this.voiceEl.pause();
      this.voiceEl.currentTime = 0;
    }
  }

  playUiSfx(key: LolUiSfxKey, volume = 0.55): void {
    this.playUrl(LOL_UI_SFX[key], 'sfx', volume);
  }

  playUrl(url: string, channel: 'sfx' | 'voice', volume: number): void {
    if (typeof window === 'undefined' || this.muted || !url || !this.unlocked) {
      return;
    }

    this.warmUrl(url);
    const vol = this.effectiveVolume(volume);

    if (channel === 'voice') {
      this.playVoice(url, vol, volume);
      return;
    }

    this.playSfxFromPool(url, vol, volume);
  }

  private playVoice(url: string, vol: number, relativeGain: number): void {
    const playId = ++this.voicePlayGeneration;
    this.voiceRelativeGain = relativeGain;

    if (!this.voiceEl) {
      this.voiceEl = new Audio();
      this.voiceEl.preload = 'auto';
    }

    const el = this.voiceEl;
    el.volume = vol;
    el.src = url;
    el.pause();
    el.currentTime = 0;

    const cleanup = () => {
      if (playId === this.voicePlayGeneration) {
        el.removeEventListener('ended', cleanup);
      }
    };
    el.addEventListener('ended', cleanup, { once: true });

    void el.play().catch(() => undefined);
  }

  private playSfxFromPool(url: string, vol: number, relativeGain: number): void {
    let el = this.sfxPool.find((candidate) => candidate.paused || candidate.ended);

    if (!el) {
      if (this.sfxPool.length < SFX_POOL_SIZE) {
        el = new Audio();
        el.preload = 'auto';
        this.sfxPool.push(el);
      } else {
        el = this.sfxPool[this.sfxPoolIndex % this.sfxPool.length];
        this.sfxPoolIndex += 1;
        el.pause();
        this.activeSfx.delete(el);
      }
    }

    if (el.src !== url) el.src = url;
    el.volume = vol;
    el.currentTime = 0;
    this.sfxRelativeGain.set(el, relativeGain);
    this.activeSfx.add(el);

    const onEnd = () => {
      this.activeSfx.delete(el);
      el.removeEventListener('ended', onEnd);
    };
    el.addEventListener('ended', onEnd, { once: true });

    void el.play().catch(() => undefined);
  }
}

export const lolAudio = new LolAudioEngine();
