import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ className, type, ...props }, ref) => (
		<input
			type={type}
			className={cn(
				"flex h-10 w-full rounded-md border border-input bg-stone-950/60 px-3 py-2 text-sm text-foreground shadow-sm transition-all duration-300",
				"placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
				"disabled:cursor-not-allowed disabled:opacity-50",
				"[data-mafia-theme]_&:border-[color:var(--mf-glass-border)] [data-mafia-theme]_&:bg-[color:rgba(18,16,14,0.55)]",
				"[data-mafia-theme]_&:text-[color:var(--p1-ink)] [data-mafia-theme]_&:placeholder:text-[color:var(--p1-ink-dim)]",
				"[data-mafia-theme]_&:shadow-[inset_0_1px_0_rgba(248,228,168,0.06)]",
				"[data-mafia-theme]_&:focus-visible:ring-amber-600/45 [data-mafia-theme]_&:focus-visible:ring-offset-[color:var(--p1-abyss)]",
				className,
			)}
			ref={ref}
			{...props}
		/>
	),
);
Input.displayName = "Input";

export { Input };
