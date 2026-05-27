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

type Channel = 'sfx' | 'voice';

const STORAGE_KEY = 'sw-lol-audio-muted';
export const LOL_AUDIO_VOLUME_STORAGE_KEY = 'sw-lol-audio-volume';
const DEFAULT_VOLUME = 0.5;

function clampVolume(value: number): number {
  return Math.min(1, Math.max(0, value));
}

class LolAudioEngine {
  private unlocked = false;
  private muted = false;
  private volumeScale = DEFAULT_VOLUME;
  private uiSfxPreloaded = false;
  private readonly warmed = new Map<string, HTMLAudioElement>();
  private readonly channels: Record<Channel, HTMLAudioElement | null> = {
    sfx: null,
    voice: null,
  };

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
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOL_AUDIO_VOLUME_STORAGE_KEY, String(this.volumeScale));
    } catch {
      /* ignore */
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (muted) this.stopAll();
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
    const el = new Audio();
    el.preload = 'auto';
    el.src = url;
    el.load();
    this.warmed.set(url, el);
  }

  stopAll(): void {
    for (const ch of Object.keys(this.channels) as Channel[]) {
      const el = this.channels[ch];
      if (!el) continue;
      el.pause();
      el.currentTime = 0;
    }
  }

  stopVoice(): void {
    const el = this.channels.voice;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
  }

  playUiSfx(key: LolUiSfxKey, volume = 0.55): void {
    this.playUrl(LOL_UI_SFX[key], 'sfx', volume);
  }

  playUrl(url: string, channel: Channel, volume: number): void {
    if (typeof window === 'undefined' || this.muted || !url || !this.unlocked) {
      return;
    }

    this.warmUrl(url);

    const vol = clampVolume(volume * this.volumeScale);
    const warmed = this.warmed.get(url);

    if (channel === 'voice') {
      const el = this.getChannel('voice');
      el.volume = vol;
      el.src = url;
      el.pause();
      el.currentTime = 0;
      void el.play().catch(() => undefined);
      return;
    }

    if (warmed && warmed.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const clone = warmed.cloneNode() as HTMLAudioElement;
      clone.volume = vol;
      void clone.play().catch(() => undefined);
      return;
    }

    const el = this.getChannel('sfx');
    el.volume = vol;
    if (el.src !== url) el.src = url;
    el.currentTime = 0;
    void el.play().catch(() => undefined);
  }

  private getChannel(channel: Channel): HTMLAudioElement {
    let el = this.channels[channel];
    if (!el) {
      el = new Audio();
      el.preload = 'auto';
      this.channels[channel] = el;
    }
    return el;
  }
}

export const lolAudio = new LolAudioEngine();
