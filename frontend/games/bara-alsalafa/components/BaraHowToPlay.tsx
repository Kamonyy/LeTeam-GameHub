"use client";

import clsx from "clsx";
import { Eye, MessageCircle, Vote, Scale, UserX, Trophy } from "lucide-react";

const STEPS = [
	{
		icon: Eye,
		title: "اكشف واستعد",
		body: "كل لاعب يكشف بطاقته. الداخلون يرون الكلمة السرية والفئة؛ برا السالفة يرى تنبيهاً فقط أنه خارج السالفة. اضغط «جاهز» عندما تفهم دورك.",
	},
	{
		icon: MessageCircle,
		title: "الاستجواب",
		body: "يتناوب اللاعبون: واحد يسأل وآخر يجيب ضمن وقت محدد. راقب الإجابات — من يتردد أو يتلعثم قد يكون برا السالفة.",
	},
	{
		icon: Vote,
		title: "طلب التصويت والتصويت",
		body: "يمكن طلب إنهاء الاستجواب عندما يوافق ثلثا اللاعبين تقريباً. بعدها صوّت سراً على من تشتبه أنه برا السالفة (لا يمكنك التصويت لنفسك).",
	},
	{
		icon: Scale,
		title: "عند التعادل",
		body: "إن تعادل أكثر من لاعب في الأصوات، يُسأل كل متعادل سؤالاً واحداً من لاعب عشوائي، ثم تُعاد التصويت بين المتعادلين فقط.",
	},
	{
		icon: UserX,
		title: "الطرد والتخمين",
		body: "من يحصل على أكثر الأصوات يُطرد. إن كان داخل السالفة — برا السالفة يفوز الجولة ويربح نقطتين. إن كان برا السالفة — يختار من 6 كلمات من نفس الفئة.",
	},
	{
		icon: Trophy,
		title: "الفوز",
		body: "النقاط تُجمع كل جولة. المباراة تنتهي عندما يصل فريق الداخلين أو برا السالفة إلى عدد «جولات للفوز» الذي يحدده المضيف (3 أو 5 أو 7).",
	},
] as const;

const SCORING_RULES = [
	"تصويت على شخص داخلي بالخطأ → نقطتان لبرا السالفة + فوز جولة له",
	"برا السالفة يُطرد ويخمّن الكلمة صح → نقطتان له + فوز جولة",
	"برا السالفة يُطرد ويخطئ التخمين → نقطة لكل داخلين + فوز جولة للداخلين",
] as const;

interface BaraHowToPlayProps {
	className?: string;
}

export default function BaraHowToPlay({ className }: BaraHowToPlayProps) {
	return (
		<div className={clsx("bara-howto", className)}>
			<p className="bara-howto__lead">
				لعبة حفلات للتخمين: الجميع يعرف الكلمة السرية{" "}
				<strong className="text-[#fda4af]">إلا شخص واحد</strong>.
			</p>

			<div className="bara-howto-roles" aria-label="الأدوار">
				<div className="bara-howto-role bara-howto-role--in">
					<p className="bara-howto-role__label">داخل السالفة</p>
					<p className="bara-howto-role__text">
						تعرف الكلمة — اكتشف من لا يعرفها
					</p>
				</div>
				<div className="bara-howto-role bara-howto-role--out">
					<p className="bara-howto-role__label">برا السالفة</p>
					<p className="bara-howto-role__text">
						لا تعرف الكلمة — تظهر أنك تعرف
					</p>
				</div>
			</div>

			<p className="bara-howto__steps-heading">سير الجولة</p>

			<ol className="bara-howto-list">
				{STEPS.map((step, index) => {
					const Icon = step.icon;
					return (
						<li key={step.title} className="bara-howto-step">
							<span className="bara-howto-step__rail" aria-hidden>
								<span className="bara-howto-step__num">{index + 1}</span>
								{index < STEPS.length - 1 && (
									<span className="bara-howto-step__line" />
								)}
							</span>
							<div className="bara-howto-step__body">
								<div className="bara-howto-step__title-row">
									<Icon
										className="bara-howto-step__icon"
										aria-hidden
										strokeWidth={1.75}
									/>
									<p className="bara-howto-step__title">{step.title}</p>
								</div>
								<p className="bara-howto-step__text">{step.body}</p>
							</div>
						</li>
					);
				})}
			</ol>

			<div className="bara-howto-scoring">
				<p className="bara-howto__steps-heading">النقاط (Out of the Loop)</p>
				<ul className="bara-howto-scoring__list">
					{SCORING_RULES.map((rule) => (
						<li key={rule}>{rule}</li>
					))}
				</ul>
			</div>

			<p className="bara-howto__tip">
				<strong>نصيحة:</strong> اختر في اللوبي حزم فئات متنوعة (أكلات، مهن،
				أماكن…) لجولات أمتع — من 3 إلى 12 لاعباً.
			</p>
		</div>
	);
}
