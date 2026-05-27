'use client';

const EMBERS = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${(i * 17 + 7) % 94}%`,
  delay: `${(i * 0.7) % 12}s`,
  duration: `${10 + (i % 5) * 2}s`,
  drift: `${(i % 2 === 0 ? 1 : -1) * (12 + (i % 4) * 8)}px`,
}));

export default function WordGameAtmosphere() {
  return (
    <div className="sw-atmosphere" aria-hidden>
      <div className="sw-atmosphere__runes" />
      <div className="sw-atmosphere__silhouette-left" />
      <div className="sw-atmosphere__silhouette-right" />
      <div className="sw-atmosphere__vignette" />
      {EMBERS.map((e) => (
        <span
          key={e.id}
          className="sw-ember"
          style={{
            left: e.left,
            bottom: `${(e.id % 4) * 8}%`,
            animationDelay: e.delay,
            animationDuration: e.duration,
            ['--sw-drift' as string]: e.drift,
          }}
        />
      ))}
    </div>
  );
}
