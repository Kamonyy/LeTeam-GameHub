import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center rounded-sm border px-1.5 py-0.5 font-cinzel text-[0.58rem] font-bold uppercase tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
	{
		variants: {
			variant: {
				default:
					"border-amber-500/40 bg-amber-700/90 text-amber-50 shadow-[0_0_10px_rgba(180,83,9,0.25)]",
				secondary:
					"border-border bg-secondary/80 text-hub-text-secondary",
				destructive:
					"border-rose-500/50 bg-gradient-to-b from-red-950 to-red-950/80 text-red-100",
				outline: "border-border bg-transparent text-muted-foreground",
				dead: "border-rose-500/50 bg-gradient-to-b from-red-950 to-red-950/80 text-red-100",
				pending:
					"border-amber-500/50 bg-gradient-to-b from-amber-950 to-amber-950/80 text-amber-200",
				ok: "border-emerald-500/50 bg-gradient-to-b from-emerald-950 to-emerald-950/80 text-emerald-200",
				phase:
					"border-amber-600/55 bg-amber-950/55 text-[0.62rem] tracking-[0.14em] text-amber-50/90 shadow-[0_0_16px_rgba(201,162,39,0.42),inset_0_1px_0_rgba(248,228,168,0.12)]",
				step:
					"border-violet-700/45 bg-violet-950/50 text-[0.62rem] tracking-[0.14em] text-violet-200/90",
				jade:
					"border-emerald-500/50 bg-gradient-to-b from-emerald-900 to-emerald-950 text-emerald-100 shadow-[0_0_10px_rgba(74,216,149,0.25)]",
				rust:
					"border-orange-700/50 bg-gradient-to-b from-orange-950 to-stone-950 text-orange-200 shadow-[0_0_10px_rgba(196,106,46,0.25)]",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

export interface BadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
	return (
		<div className={cn(badgeVariants({ variant }), className)} {...props} />
	);
}

export { Badge, badgeVariants };
