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

class LolAudioEngine {
  private unlocked = false;
  private muted = false;
  private readonly channels: Record<Channel, HTMLAudioElement | null> = {
    sfx: null,
    voice: null,
  };

  constructor() {
    if (typeof window === 'undefined') return;
    try {
      this.muted = localStorage.getItem(STORAGE_KEY) === '1';
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
  }

  get unlockedReady(): boolean {
    return this.unlocked;
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
    void this.playUrl(LOL_UI_SFX[key], 'sfx', volume);
  }

  playUrl(url: string, channel: Channel, volume: number): Promise<void> {
    if (typeof window === 'undefined' || this.muted || !url) {
      return Promise.resolve();
    }

    const el = this.getChannel(channel);
    el.volume = Math.min(1, Math.max(0, volume));
    el.src = url;

    const attempt = () =>
      el.play().then(() => undefined).catch(() => undefined);

    if (!this.unlocked) {
      return Promise.resolve();
    }

    if (channel === 'voice') {
      el.pause();
      el.currentTime = 0;
    }

    return attempt();
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
