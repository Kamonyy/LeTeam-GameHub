/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./games/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			colors: {
				hub: {
					bg: "#0f1117",
					surface: "#1a1d27",
					card: "#222633",
					border: "#2e3345",
					muted: "#6b7280",
					accent: "#3b82f6",
					"accent-dim": "#2563eb",
					success: "#22c55e",
					warning: "#f59e0b",
					danger: "#ef4444",
				},
			},
			fontFamily: {
				sans: ["Inter", "system-ui", "sans-serif"],
			},
			animation: {
				"fade-in": "fadeIn 0.3s ease-out",
				"slide-up": "slideUp 0.3s ease-out",
				"pulse-soft": "pulseSoft 2s ease-in-out infinite",
				"tile-snap": "tileSnap 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
				"tile-snap-magnetic":
					"tileSnapMagnetic 0.55s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
				"drop-glow": "dropGlow 1.5s ease-in-out infinite",
				"tile-lift": "tileLift 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
				"hand-deal":
					"handDeal 0.55s cubic-bezier(0.175, 0.885, 0.32, 1.275) backwards",
				"table-glow": "tableGlowEmerald 3s ease-in-out infinite",
				"table-glow-urgent": "tableGlowAmber 1.2s ease-in-out infinite",
				"table-shockwave": "tableShockwave 0.85s ease-out forwards",
				"drop-pulse": "dropPulse 1.2s ease-in-out infinite",
				"overlay-pop": "overlayPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
				"ghost-fade-in": "ghostFadeIn 0.2s ease-out",
				"boneyard-draw-fly":
					"boneyardDrawFly 0.62s cubic-bezier(0.22, 0.61, 0.36, 1) forwards",
				"boneyard-stack-pop":
					"boneyardStackPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
				"opponent-thinking":
					"opponentThinking 0.9s ease-in-out infinite",
				"bara-seat-entry":
					"baraSeatEntry 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) backwards",
				"bara-vibrate": "baraVibrate 0.45s ease-in-out infinite",
				"bara-shake": "baraShake 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)",
				"bara-explosion": "baraExplosion 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
				"hub-drop-in": "hubDropIn 0.85s cubic-bezier(0.34, 1.56, 0.64, 1) both",
				"hub-slide-up": "hubSlideUp 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both",
				"hub-aura-breathe": "hubAuraBreathe 6s ease-in-out infinite",
			},
			keyframes: {
				fadeIn: {
					"0%": { opacity: "0" },
					"100%": { opacity: "1" },
				},
				slideUp: {
					"0%": { opacity: "0", transform: "translateY(8px)" },
					"100%": { opacity: "1", transform: "translateY(0)" },
				},
				pulseSoft: {
					"0%, 100%": { opacity: "1" },
					"50%": { opacity: "0.6" },
				},
				tileSnap: {
					"0%": { opacity: "0.6", transform: "scale(0.85) translateY(12px)" },
					"100%": { opacity: "1", transform: "scale(1) translateY(0)" },
				},
				tileSnapMagnetic: {
					"0%": { transform: "scale(1)" },
					"35%": { transform: "scale(0.93)" },
					"65%": { transform: "scale(1.04)" },
					"100%": { transform: "scale(1)" },
				},
				dropGlow: {
					"0%, 100%": {
						boxShadow: "0 0 12px rgba(52, 211, 153, 0.25)",
						borderColor: "rgba(52, 211, 153, 0.5)",
					},
					"50%": {
						boxShadow: "0 0 24px rgba(52, 211, 153, 0.55)",
						borderColor: "rgba(52, 211, 153, 0.85)",
					},
				},
				overlayPop: {
					"0%": { opacity: "0", transform: "scale(0.7)" },
					"100%": { opacity: "1", transform: "scale(1)" },
				},
				tileLift: {
					"0%": { transform: "translateY(0) scale(1)" },
					"100%": { transform: "translateY(-8px) scale(1.05)" },
				},
				handDeal: {
					"0%": {
						opacity: "0",
						transform:
							"translateY(-140px) translateX(var(--deal-from-x, 0px)) rotate(90deg) scale(0.75)",
					},
					"100%": {
						opacity: "1",
						transform:
							"translateY(0) translateX(0) rotate(var(--fan-rotate, 0deg)) scale(1)",
					},
				},
				tableGlowEmerald: {
					"0%, 100%": {
						boxShadow:
							"inset 0 0 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(52,211,153,0.08), 0 16px 48px rgba(0,0,0,0.5)",
					},
					"50%": {
						boxShadow:
							"inset 0 0 55px rgba(16,185,129,0.12), 0 0 0 1px rgba(52,211,153,0.2), 0 16px 48px rgba(0,0,0,0.5)",
					},
				},
				tableGlowAmber: {
					"0%, 100%": {
						boxShadow:
							"inset 0 0 45px rgba(245,158,11,0.08), 0 0 0 1px rgba(251,191,36,0.15), 0 16px 48px rgba(0,0,0,0.5)",
					},
					"50%": {
						boxShadow:
							"inset 0 0 60px rgba(245,158,11,0.18), 0 0 0 2px rgba(251,191,36,0.35), 0 16px 48px rgba(0,0,0,0.5)",
					},
				},
				tableShockwave: {
					"0%": {
						boxShadow:
							"inset 0 0 30px rgba(251,191,36,0.05), 0 0 0 0 rgba(251,191,36,0.5)",
					},
					"40%": {
						boxShadow:
							"inset 0 0 80px rgba(251,191,36,0.25), 0 0 0 12px rgba(251,191,36,0.15)",
					},
					"100%": {
						boxShadow:
							"inset 0 0 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(52,211,153,0.08), 0 16px 48px rgba(0,0,0,0.5)",
					},
				},
				dropPulse: {
					"0%, 100%": { opacity: "0.85", transform: "scale(1)" },
					"50%": { opacity: "1", transform: "scale(1.04)" },
				},
				ghostFadeIn: {
					"0%": { opacity: "0" },
					"100%": { opacity: "0.4" },
				},
				boneyardDrawFly: {
					"0%": {
						transform:
							"translate(-50%, -50%) rotate(-16deg) scale(0.82)",
						opacity: "0.9",
						filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.45))",
					},
					"42%": {
						transform:
							"translate(calc(-50% + var(--fly-dx) * 0.5), calc(-50% + var(--fly-dy) * 0.5 + var(--fly-arc, -32px))) rotate(8deg) scale(0.94)",
						opacity: "1",
						filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.35))",
					},
					"100%": {
						transform:
							"translate(calc(-50% + var(--fly-dx)), calc(-50% + var(--fly-dy))) rotate(var(--fly-end-rot, 0deg)) scale(1)",
						opacity: "1",
						filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.25))",
					},
				},
				boneyardStackPop: {
					"0%": { transform: "translateY(0) scale(1)" },
					"35%": { transform: "translateY(-6px) scale(1.04)" },
					"100%": { transform: "translateY(0) scale(1)" },
				},
				opponentThinking: {
					"0%, 100%": { opacity: "0.55" },
					"50%": { opacity: "1" },
				},
				baraSeatEntry: {
					"0%": { opacity: "0", transform: "scale(0.6)" },
					"100%": { opacity: "1", transform: "scale(1)" },
				},
				baraVibrate: {
					"0%, 100%": { transform: "translateX(0)" },
					"25%": { transform: "translateX(-3px)" },
					"75%": { transform: "translateX(3px)" },
				},
				baraShake: {
					"0%, 100%": { transform: "translateX(0)" },
					"20%": { transform: "translateX(-8px) rotate(-1deg)" },
					"40%": { transform: "translateX(8px) rotate(1deg)" },
					"60%": { transform: "translateX(-6px)" },
					"80%": { transform: "translateX(6px)" },
				},
				baraExplosion: {
					"0%": { transform: "scale(0.85)", opacity: "0.5" },
					"50%": { transform: "scale(1.08)", opacity: "1" },
					"100%": { transform: "scale(1)", opacity: "1" },
				},
				hubDropIn: {
					"0%": { opacity: "0", transform: "translateY(-36px)" },
					"100%": { opacity: "1", transform: "translateY(0)" },
				},
				hubSlideUp: {
					"0%": { opacity: "0", transform: "translateY(48px)" },
					"100%": { opacity: "1", transform: "translateY(0)" },
				},
				hubAuraBreathe: {
					"0%, 100%": { opacity: "0.45", transform: "scale(1)" },
					"50%": { opacity: "0.75", transform: "scale(1.08)" },
				},
			},
		},
	},
	plugins: [],
};
