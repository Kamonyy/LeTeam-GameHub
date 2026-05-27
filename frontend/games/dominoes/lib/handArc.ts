export type HandEdge = "bottom" | "top" | "left" | "right";

export function opponentSeatPositions(
	count: number,
): Array<"top" | "left" | "right"> {
	if (count === 1) return ["top"];
	if (count === 2) return ["left", "right"];
	return ["left", "top", "right"];
}

export function arcFanTransform(
	index: number,
	count: number,
	edge: HandEdge,
	opts?: { selected?: boolean; dragging?: boolean },
): string {
	if (count <= 0) return "";
	const center = (count - 1) / 2;
	const t = count === 1 ? 0 : (index - center) / Math.max(center, 1);
	const maxAngle =
		edge === "bottom" || edge === "top" ?
			Math.min(50, 12 + count * 4.5)
		:	Math.min(38, 10 + count * 3.5);
	const angle = t * maxAngle;

	if (opts?.selected || opts?.dragging) {
		if (edge === "bottom") {
			return `rotate(${angle}deg) translateY(-2rem) scale(1.1)`;
		}
		if (edge === "top") {
			return `rotate(${-angle}deg) translateY(1.25rem) scale(1.04)`;
		}
	}

	switch (edge) {
		case "bottom": {
			const arcLift = -(1 - Math.abs(t)) * 22;
			const edgeDrop = Math.abs(t) * 8;
			return `rotate(${angle}deg) translateY(${arcLift + edgeDrop}px)`;
		}
		case "top": {
			const arcDrop = (1 - Math.abs(t)) * 16;
			const edgeLift = Math.abs(t) * 5;
			return `rotate(${-angle}deg) translateY(${-arcDrop - edgeLift}px)`;
		}
		case "left": {
			const arcOut = (1 - Math.abs(t)) * 14;
			return `rotate(${88 + angle * 0.55}deg) translateX(${arcOut}px)`;
		}
		case "right": {
			const arcOut = (1 - Math.abs(t)) * 14;
			return `rotate(${-88 - angle * 0.55}deg) translateX(${-arcOut}px)`;
		}
		default:
			return "";
	}
}
