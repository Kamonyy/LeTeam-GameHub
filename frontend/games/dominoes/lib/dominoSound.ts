let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
	if (typeof window === "undefined") return null;
	if (!audioCtx) {
		const Ctx =
			window.AudioContext ||
			(window as unknown as { webkitAudioContext?: typeof AudioContext })
				.webkitAudioContext;
		if (!Ctx) return null;
		audioCtx = new Ctx();
	}
	return audioCtx;
}

export type DominoSoundVariant = "snap" | "draw";

/** Short tactile ivory-on-felt click via Web Audio API */
export function playDominoSnapSound(variant: DominoSoundVariant = "snap") {
	const ctx = getAudioContext();
	if (!ctx) return;

	if (ctx.state === "suspended") {
		void ctx.resume();
	}

	const now = ctx.currentTime;
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	const filter = ctx.createBiquadFilter();

	const isDraw = variant === "draw";

	osc.type = isDraw ? "sine" : "triangle";
	if (isDraw) {
		osc.frequency.setValueAtTime(320, now);
		osc.frequency.exponentialRampToValueAtTime(720, now + 0.14);
		filter.frequency.setValueAtTime(1800, now);
	} else {
		osc.frequency.setValueAtTime(880, now);
		osc.frequency.exponentialRampToValueAtTime(220, now + 0.06);
		filter.frequency.setValueAtTime(2400, now);
	}

	filter.type = "lowpass";

	const peak = isDraw ? 0.14 : 0.22;
	const duration = isDraw ? 0.14 : 0.09;

	gain.gain.setValueAtTime(0.0001, now);
	gain.gain.exponentialRampToValueAtTime(peak, now + 0.004);
	gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

	osc.connect(filter);
	filter.connect(gain);
	gain.connect(ctx.destination);

	osc.start(now);
	osc.stop(now + duration + 0.02);
}

/** Softer slide when a tile leaves the boneyard */
export function playDominoDrawSound() {
	playDominoSnapSound("draw");
}
