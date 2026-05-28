import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const mafiaButtonVariants = cva("", {
	variants: {
		variant: {
			primary: [
				"font-cinzel font-semibold uppercase tracking-[0.12em]",
				"border border-amber-500/55 text-amber-50",
				"bg-gradient-to-b from-amber-600/95 via-amber-800 to-amber-950",
				"shadow-[0_0_20px_rgba(180,83,9,0.35),inset_0_1px_0_rgba(251,191,36,0.35),inset_0_-2px_0_rgba(0,0,0,0.45)]",
				"hover:border-amber-400/70 hover:from-amber-500/95 hover:via-amber-700 hover:to-amber-900",
				"hover:shadow-[0_0_28px_rgba(217,119,6,0.45),inset_0_1px_0_rgba(255,230,160,0.4)]",
				"focus-visible:ring-amber-400/60",
			],
			destructive: [
				"font-cinzel font-semibold uppercase tracking-[0.1em]",
				"border border-red-900/70 text-red-100",
				"bg-gradient-to-b from-red-950/95 via-rose-950 to-stone-950",
				"shadow-[0_0_14px_rgba(76,5,25,0.45),inset_0_1px_0_rgba(248,113,113,0.12)]",
				"hover:border-red-700/80 hover:from-red-900/90 hover:via-rose-950 hover:to-stone-950",
				"hover:shadow-[0_0_20px_rgba(127,29,29,0.5)]",
				"focus-visible:ring-rose-500/50",
			],
			ghost: [
				"border border-[color:var(--mf-glass-border)] bg-stone-950/30 text-[color:var(--p1-ink-soft)]",
				"shadow-[inset_0_1px_0_rgba(248,228,168,0.08)]",
				"hover:border-amber-700/50 hover:bg-amber-950/25 hover:text-amber-50",
				"focus-visible:ring-amber-500/40",
			],
			outline: [
				"border border-amber-900/40 bg-gradient-to-b from-stone-900/55 to-stone-950/75 text-stone-200",
				"shadow-[inset_0_1px_0_rgba(212,166,74,0.12)]",
				"hover:border-amber-700/55 hover:from-stone-900/70 hover:to-stone-950/85",
				"focus-visible:ring-amber-500/35",
			],
		},
	},
	defaultVariants: {
		variant: "primary",
	},
});

export interface MafiaButtonProps
	extends Omit<ButtonProps, "variant">,
		VariantProps<typeof mafiaButtonVariants> {}

const MafiaButton = React.forwardRef<HTMLButtonElement, MafiaButtonProps>(
	({ className, variant = "primary", ...props }, ref) => (
		<Button
			ref={ref}
			variant="ghost"
			className={cn(mafiaButtonVariants({ variant }), className)}
			{...props}
		/>
	),
);
MafiaButton.displayName = "MafiaButton";

export { MafiaButton, mafiaButtonVariants };
