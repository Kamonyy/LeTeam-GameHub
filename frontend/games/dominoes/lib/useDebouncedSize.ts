"use client";

import { useEffect, useState, type RefObject } from "react";

/** Debounced element size for layout recalculation on resize */
export function useDebouncedSize(
	ref: RefObject<HTMLElement | null>,
	delayMs = 120,
): { width: number; height: number } {
	const [size, setSize] = useState({ width: 0, height: 0 });

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		let timer: ReturnType<typeof setTimeout> | null = null;

		const measure = () => {
			const rect = el.getBoundingClientRect();
			setSize({
				width: Math.round(rect.width),
				height: Math.round(rect.height),
			});
		};

		const schedule = () => {
			if (timer) clearTimeout(timer);
			timer = setTimeout(measure, delayMs);
		};

		measure();
		const ro = new ResizeObserver(schedule);
		ro.observe(el);
		window.addEventListener("resize", schedule);

		return () => {
			if (timer) clearTimeout(timer);
			ro.disconnect();
			window.removeEventListener("resize", schedule);
		};
	}, [ref, delayMs]);

	return size;
}
