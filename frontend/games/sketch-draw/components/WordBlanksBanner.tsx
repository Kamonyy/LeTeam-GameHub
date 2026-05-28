'use client';

import clsx from 'clsx';

type WordBlanksBannerProps = {
  blanks: string | null;
  drawerWord?: string | null;
  className?: string;
};

export default function WordBlanksBanner({
  blanks,
  drawerWord,
  className,
}: WordBlanksBannerProps) {
  if (!blanks) return null;

  return (
    <div
      className={clsx(
        'sketch-word-blanks shrink-0 flex flex-col items-center justify-center py-2 px-4',
        className
      )}
    >
      <p className="text-[10px] uppercase tracking-widest text-hub-muted mb-1">
        {drawerWord ? 'Your word' : 'Guess the word'}
      </p>
      <p
        className="font-mono text-2xl sm:text-3xl font-bold tracking-[0.35em] text-violet-200 select-none"
        aria-label={drawerWord ? `Draw: ${drawerWord}` : 'Hidden word length hint'}
      >
        {blanks}
      </p>
      {drawerWord && (
        <p className="text-sm text-fuchsia-300 font-semibold mt-1">{drawerWord}</p>
      )}
    </div>
  );
}
