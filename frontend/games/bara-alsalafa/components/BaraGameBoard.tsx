"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { SkipForward, CheckCircle2, Vote } from "lucide-react";
import { BARA_INTERROGATION_MS } from "@shared/games/bara-alsalafa/timing.js";
import type { BaraGameState } from "@/games/bara-alsalafa/types";
import type { LobbyState } from "@/lib/hub/types";
import PlayerGrid from "./PlayerGrid";
import RevealCard from "./RevealCard";
import BaraRoleBanner from "./BaraRoleBanner";
import CountdownRing from "./CountdownRing";
import InterrogationDuelHero from "./InterrogationDuelHero";
import BaraVotingPanel from "./BaraVotingPanel";
import OutcastGuessPanel from "./OutcastGuessPanel";

interface BaraGameBoardProps {
	gameState: BaraGameState;
	lobby: LobbyState;
	playerId: string;
	isHost: boolean;
	onReveal: () => Promise<boolean>;
	onReady: () => Promise<boolean>;
	onAdvanceInterrogation: () => Promise<boolean>;
	onRequestVoteEnd: () => Promise<boolean>;
	onVote: (targetId: string) => Promise<boolean>;
	onGuess: (guess: string) => Promise<boolean>;
}

function displayName(lobby: LobbyState, id: string) {
	return lobby.players.find((p) => p.id === id)?.displayName ?? "لاعب";
}

const PHASE_LABELS: Record<string, string> = {
	reveal: "كشف الأدوار",
	ready: "استعداد",
	interrogation: "استجواب",
	defend: "كسر التعادل",
	voting: "تصويت",
	revote: "إعادة تصويت",
	outcast_guess: "تخمين برا السالفة",
	round_end: "نهاية الجولة",
	match_over: "نهاية المباراة",
};

const ROLE_PLAY_PHASES = new Set([
	"ready",
	"interrogation",
	"voting",
	"defend",
	"revote",
]);

export default function BaraGameBoard({
	gameState,
	lobby,
	playerId,
	onReveal,
	onReady,
	onAdvanceInterrogation,
	onRequestVoteEnd,
	onVote,
	onGuess,
}: BaraGameBoardProps) {
	const [revealing, setRevealing] = useState(false);
	const [readying, setReadying] = useState(false);
	const [requestingVote, setRequestingVote] = useState(false);
	const boardRef = useRef<HTMLDivElement>(null);

	const phase = gameState.phase;
	const isTiebreak = phase === "interrogation" && gameState.isTiebreak;
	const isCalm =
		phase === "reveal" ||
		phase === "ready" ||
		(phase === "interrogation" && !isTiebreak);
	const isIntense =
		phase === "voting" ||
		phase === "revote" ||
		phase === "outcast_guess" ||
		(phase === "round_end" &&
			gameState.roundOutcome?.type === "wrong_accusation");

	const votingActive = phase === "voting" || phase === "revote";
	const spotlightId =
		phase === "outcast_guess" || phase === "round_end" ?
			(gameState.eliminatedThisRound ?? gameState.outcastId)
		:	null;

	const showCategory =
		phase === "reveal" || phase === "round_end" || phase === "match_over";
	const showRoleBanner = ROLE_PLAY_PHASES.has(phase) && !!gameState.roleView;

	const handleReveal = async () => {
		setRevealing(true);
		await onReveal();
		setRevealing(false);
	};

	const handleReady = async () => {
		setReadying(true);
		await onReady();
		setReadying(false);
	};

	const handleRequestVoteEnd = async () => {
		setRequestingVote(true);
		await onRequestVoteEnd();
		setRequestingVote(false);
	};

	const isReveal = phase === "reveal";
	const isInterrogation = phase === "interrogation";
	const phaseLabel =
		isTiebreak ? "كسر التعادل" : (PHASE_LABELS[phase] ?? "مرحلة غير معروفة");
	const tiedNames = gameState.tiedPlayerIds
		.map((id) => displayName(lobby, id))
		.join(" · ");
	const duelParticipantIds =
		(
			isInterrogation &&
			gameState.currentInterviewerId &&
			gameState.currentTargetId
		) ?
			[gameState.currentInterviewerId, gameState.currentTargetId]
		:	[];
	const isReady = phase === "ready";

	return (
		<div
			ref={boardRef}
			className={clsx(
				"bara-board",
				isReveal && "bara-board--reveal",
				isCalm && "bara-board--calm",
				isIntense && "bara-board--intense",
				votingActive && "bara-board--voting",
				isInterrogation && "bara-board--interrogation",
				isTiebreak && "bara-board--tiebreak",
				phase === "round_end" &&
					gameState.roundOutcome?.type === "outcast_stole_win" &&
					"animate-bara-shake",
			)}
			dir="rtl"
		>
			<header className="bara-board__head">
				<div className="bara-board__meta">
					<span className="bara-board__round">
						الجولة {gameState.roundNumber}
					</span>
					<span className="bara-board__dot" aria-hidden />
					<span className="bara-board__phase">{phaseLabel}</span>
				</div>
				{showCategory && gameState.categoryName && (
					<p className="bara-board__category">
						فئة الجولة: <strong>{gameState.categoryName}</strong>
					</p>
				)}
				{showCategory && gameState.selectedCategoryCount > 1 && (
					<p className="bara-board__categories-extra">
						الفئات المفعّلة ({gameState.selectedCategoryCount}):{" "}
						{gameState.categoryNamesSummary}
					</p>
				)}
			</header>

			{showRoleBanner && (
				<BaraRoleBanner gameState={gameState} compact={phase !== "ready"} />
			)}

			{isInterrogation &&
				gameState.currentInterviewerId &&
				gameState.currentTargetId && (
					<InterrogationDuelHero
						gameState={gameState}
						lobby={lobby}
						playerId={playerId}
						boardRef={boardRef}
					/>
				)}

			{isTiebreak && (
				<p className="bara-phase-callout bara-phase-callout--warn">
					تعادل في التصويت — سؤال واحد لكل متعادل ({gameState.tiebreakStep}/
					{gameState.tiebreakTotal}): <strong>{tiedNames}</strong>
				</p>
			)}

			<div
				className={clsx(
					"bara-board__main",
					(isReveal || isReady) && "bara-board__main--reveal",
					votingActive && "bara-board__main--voting",
				)}
			>
				<section className="bara-board__stage" aria-label="منطقة اللعب">
					{votingActive && (
						<BaraVotingPanel
							gameState={gameState}
							playerId={playerId}
							canVote={gameState.canVote}
							tiedDisplayNames={tiedNames}
						/>
					)}
					{isReveal && (
						<RevealCard
							gameState={gameState}
							onReveal={() => void handleReveal()}
							revealing={revealing}
						/>
					)}

					{isReady && (
						<div className="bara-ready-panel">
							<p className="bara-ready-panel__hint">
								راجع بطاقتك — عندما يجهز الجميع تبدأ الأسئلة
							</p>
							{gameState.canReady && (
								<button
									type="button"
									onClick={() => void handleReady()}
									disabled={readying}
									className="bara-btn-primary bara-ready-panel__btn"
								>
									<CheckCircle2 className="w-5 h-5" aria-hidden />
									{readying ? "جاري التأكيد…" : "جاهز"}
								</button>
							)}
							{!gameState.canReady && (
								<p className="bara-ready-panel__wait tabular-nums">
									{gameState.readyCount} / {gameState.readyExpected} جاهزين
								</p>
							)}
						</div>
					)}

					{phase === "interrogation" && (
						<div className="bara-stage-panel">
							<CountdownRing
								phaseEndsAt={gameState.phaseEndsAt}
								totalMs={BARA_INTERROGATION_MS}
								label={
									isTiebreak ?
										`سؤال كسر التعادل (${gameState.tiebreakStep}/${gameState.tiebreakTotal})`
									:	"وقت السؤال (١:٣٠)"
								}
							/>
							{gameState.canAdvanceInterrogation && (
								<button
									type="button"
									onClick={() => void onAdvanceInterrogation()}
									className="bara-btn-secondary bara-skip-btn"
								>
									<SkipForward className="w-4 h-4" aria-hidden />
									تخطي السؤال
								</button>
							)}
						</div>
					)}

					{phase === "outcast_guess" && gameState.canGuess && (
						<OutcastGuessPanel gameState={gameState} onGuess={onGuess} />
					)}

					{phase === "outcast_guess" && !gameState.canGuess && (
						<div className="bara-outcast-wait">
							<p className="bara-outcast-wait__title">
								برا السالفة يخمّن الآن…
							</p>
							<p className="bara-outcast-wait__hint">
								انتظر حتى يختار من بين الخيارات
							</p>
						</div>
					)}

					{phase === "round_end" && gameState.roundOutcome && (
						<RoundOutcomePanel gameState={gameState} lobby={lobby} />
					)}
				</section>

				<section
					className={clsx(
						"bara-board__seats",
						votingActive && "bara-board__seats--voting",
					)}
					aria-label="اللاعبون"
				>
					{votingActive && (
						<h2 className="bara-board__seats-label bara-board__seats-label--vote">
							اختر لاعباً
						</h2>
					)}
					{(isReveal || isReady) && !votingActive && (
						<h2 className="bara-board__seats-label">
							{isReady ? "حالة الاستعداد" : "حالة الكشف"}
						</h2>
					)}
					<PlayerGrid
						gameState={gameState}
						players={lobby.players}
						playerId={playerId}
						votingActive={votingActive}
						spotlightId={spotlightId}
						compact={isReveal || isReady}
						duelParticipantIds={duelParticipantIds}
						onVote={(id) => void onVote(id)}
					/>
				</section>
			</div>

			<div
				className={clsx(
					"bara-board__footer",
					phase === "interrogation" && "bara-board__footer--vote-dock",
				)}
			>
				{phase === "interrogation" && !gameState.isTiebreak && (
					<div className="bara-vote-end-bar">
						<button
							type="button"
							onClick={() => void handleRequestVoteEnd()}
							disabled={!gameState.canRequestVoteEnd || requestingVote}
							className="bara-btn-vote-end"
						>
							<Vote className="w-4 h-4 shrink-0" aria-hidden />
							{requestingVote ? "جاري الطلب…" : "صوّت على لاعب"}
						</button>
						<p className="bara-vote-end-bar__meta tabular-nums">
							{gameState.voteEndCount} / {gameState.voteEndExpected} طلبوا
							التصويت
						</p>
					</div>
				)}

				<footer className="bara-board__scores">
					<div className="bara-team-score" aria-label="فوز الجولات">
						<span className="bara-team-score__side bara-team-score__side--in">
							الداخلون{" "}
							<strong className="tabular-nums">
								{gameState.insiderRoundWins}/{gameState.roundsToWin}
							</strong>
						</span>
						<span className="bara-team-score__vs" aria-hidden>
							·
						</span>
						<span className="bara-team-score__side bara-team-score__side--out">
							برا السالفة{" "}
							<strong className="tabular-nums">
								{gameState.outcastRoundWins}/{gameState.roundsToWin}
							</strong>
						</span>
					</div>
					<div className="bara-board__scores-row">
						{Object.entries(gameState.scores).map(([id, score]) => (
							<span
								key={id}
								className={clsx(
									"bara-score-chip",
									id === playerId && "bara-score-chip--me",
									id === gameState.outcastId && "bara-score-chip--outcast-role",
								)}
							>
								<span className="bara-score-chip__name">
									{displayName(lobby, id)}
								</span>
								<span className="bara-score-chip__pts tabular-nums">
									{score} نقطة
								</span>
							</span>
						))}
					</div>
				</footer>
			</div>
		</div>
	);
}

function RoundOutcomePanel({
	gameState,
	lobby,
}: {
	gameState: BaraGameState;
	lobby: LobbyState;
}) {
	const outcome = gameState.roundOutcome!;
	const name = (id: string) =>
		lobby.players.find((p) => p.id === id)?.displayName ?? "لاعب";

	if (outcome.type === "wrong_accusation") {
		return (
			<div className="bara-outcome-card bara-outcome-card--danger animate-bara-shake">
				<p className="bara-outcome-card__title">وقع الاختيار على شخص خطأ!</p>
				<p className="bara-outcome-card__body">
					{outcome.eliminatedId && name(outcome.eliminatedId)} كان من الداخلين
				</p>
				<p className="bara-outcome-card__hint">
					+٢ نقاط لـ {gameState.outcastId && name(gameState.outcastId)} · فوز
					جولة لبرا السالفة ({gameState.outcastRoundWins}/
					{gameState.roundsToWin})
				</p>
				{gameState.revealedSecretWord && (
					<p className="bara-outcome-card__word">
						الكلمة: {gameState.revealedSecretWord}
					</p>
				)}
			</div>
		);
	}

	if (outcome.type === "outcast_stole_win") {
		const matchContinues =
			gameState.insiderRoundWins < gameState.roundsToWin &&
			gameState.outcastRoundWins < gameState.roundsToWin;
		return (
			<div className="bara-outcome-card bara-outcome-card--gold animate-bara-explosion">
				<p className="bara-outcome-card__title">سرق برا السالفة الفوز!</p>
				<p className="bara-outcome-card__hint">التخمين: {outcome.guess}</p>
				<p className="bara-outcome-card__body">
					+٢ نقاط لبرا السالفة · فوز جولة ({gameState.outcastRoundWins}/
					{gameState.roundsToWin} لصالح برا السالفة)
				</p>
				<p className="bara-outcome-card__hint">
					{matchContinues ?
						"المباراة تستمر — أول فريق يصل للحد يفوز"
					:	"انتهت المباراة!"}
				</p>
			</div>
		);
	}

	if (outcome.type === "insiders_win") {
		const matchContinues =
			gameState.insiderRoundWins < gameState.roundsToWin &&
			gameState.outcastRoundWins < gameState.roundsToWin;
		return (
			<div className="bara-outcome-card bara-outcome-card--success">
				<p className="bara-outcome-card__title">فوز الداخلين!</p>
				<p className="bara-outcome-card__hint">
					الكلمة: {outcome.secretWord ?? gameState.revealedSecretWord}
				</p>
				<p className="bara-outcome-card__body">
					+١ نقطة لكل داخلين · فوز جولة ({gameState.insiderRoundWins}/
					{gameState.roundsToWin} للداخلين)
				</p>
				<p className="bara-outcome-card__hint">
					{matchContinues ? "المباراة تستمر" : "انتهت المباراة!"}
				</p>
			</div>
		);
	}

	return null;
}
