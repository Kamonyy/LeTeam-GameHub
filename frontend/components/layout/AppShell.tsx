import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AppShellProps {
	children: ReactNode;
	className?: string;
	/** Apply safe-area top padding (sticky headers). */
	safeHeader?: boolean;
	/** Apply safe-area bottom padding (bottom rails / CTAs). */
	safeFooter?: boolean;
}

/**
 * Shared full-viewport shell for game clients and hub pages.
 * Uses dynamic viewport height and prevents horizontal overscroll bleed.
 */
export function AppShell({
	children,
	className,
	safeHeader = false,
	safeFooter = false,
}: AppShellProps) {
	return (
		<div
			className={cn(
				"flex min-h-dvh w-full flex-col overflow-x-hidden",
				safeHeader && "pt-safe-top",
				safeFooter && "pb-safe-bottom",
				className,
			)}
		>
			{children}
		</div>
	);
}

export interface AppShellHeaderProps {
	children: ReactNode;
	className?: string;
	sticky?: boolean;
}

export function AppShellHeader({
	children,
	className,
	sticky = true,
}: AppShellHeaderProps) {
	return (
		<header
			className={cn(
				"z-40 border-b border-hub-border/80 bg-hub-bg/90 glass-blur-md",
				sticky && "sticky top-0 pt-safe-top",
				className,
			)}
		>
			{children}
		</header>
	);
}

export interface AppShellFooterProps {
	children: ReactNode;
	className?: string;
}

export function AppShellFooter({ children, className }: AppShellFooterProps) {
	return (
		<footer
			className={cn(
				"pb-[max(1rem,var(--safe-bottom))]",
				className,
			)}
		>
			{children}
		</footer>
	);
}
