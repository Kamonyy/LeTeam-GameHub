'use client';

import clsx from 'clsx';

/** Thematic silhouettes & decals — decorative only, behind UI (aria-hidden parent). */

function GallowsSilhouette() {
  return (
    <svg
      className="mf-atmo-gallows__svg"
      viewBox="0 0 120 140"
      fill="currentColor"
      aria-hidden
    >
      <path d="M18 132V48h8v84H18zm86 0V48h-8v84h8zM14 48h92v10H14V48z" />
      <path d="M60 48V18M48 18h24v8H48v-8z" />
      <path
        d="M60 58c0 0 4 22 4 38 0 8-2 14-4 18-2-4-4-10-4-18 0-16 4-38 4-38z"
        opacity="0.85"
      />
      <ellipse cx="60" cy="112" rx="14" ry="5" opacity="0.5" />
      <path d="M52 58h16v6a8 8 0 01-16 0V58z" opacity="0.7" />
    </svg>
  );
}

function CloakedFigure({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 120"
      fill="currentColor"
      aria-hidden
    >
      <path d="M40 8c-8 0-14 6-14 14 0 5 2 9 5 12-10 4-16 14-16 26v60h50V60c0-12-6-22-16-26 3-3 5-7 5-12 0-8-6-14-14-14z" />
      <path d="M8 118h64v4H8v-4z" opacity="0.6" />
      <ellipse cx="40" cy="22" rx="10" ry="12" opacity="0.35" />
    </svg>
  );
}

function ClockTower() {
  return (
    <svg
      className="mf-atmo-clock__tower"
      viewBox="0 0 200 220"
      fill="currentColor"
      aria-hidden
    >
      <path d="M70 220V90h60v130H70z" opacity="0.7" />
      <path d="M55 90h90l-8-28H63l-8 28z" opacity="0.55" />
      <path d="M78 62h44v12H78V62z" opacity="0.45" />
      <circle cx="100" cy="145" r="42" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.5" />
      <circle cx="100" cy="145" r="36" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.25" />
      {/* Hour hand */}
      <line
        className="mf-atmo-clock__hand mf-atmo-clock__hand--hour"
        x1="100"
        y1="145"
        x2="100"
        y2="118"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Minute hand */}
      <line
        className="mf-atmo-clock__hand mf-atmo-clock__hand--minute"
        x1="100"
        y1="145"
        x2="100"
        y2="108"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="100" cy="145" r="4" />
    </svg>
  );
}

function ChainAccent({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 48 120" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeWidth="2"
        d="M24 4c-6 0-10 4-10 9s4 9 10 9 10-4 10-9-4-9-10-9zm0 22c-6 0-10 4-10 9s4 9 10 9 10-4 10-9-4-9-10-9zm0 22c-6 0-10 4-10 9s4 9 10 9 10-4 10-9-4-9-10-9zm0 22c-6 0-10 4-10 9s4 9 10 9 10-4 10-9-4-9-10-9z"
      />
    </svg>
  );
}

function DaggerCrest({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 64 72" fill="currentColor" aria-hidden>
      <path d="M32 4L8 16v24c0 18 10 32 24 36 14-4 24-18 24-36V16L32 4z" opacity="0.5" />
      <path d="M32 22v38M26 32l12 12M38 32L26 44" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.65" />
      <path d="M28 58h8l-2 10h-4l-2-10z" opacity="0.55" />
    </svg>
  );
}

function ShackleAccent({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 56 40" fill="none" stroke="currentColor" aria-hidden>
      <ellipse cx="16" cy="20" rx="12" ry="14" strokeWidth="2" />
      <ellipse cx="40" cy="20" rx="12" ry="14" strokeWidth="2" />
      <path d="M28 20h0" strokeWidth="3" />
    </svg>
  );
}

export default function MafiaAtmosphereThemes({
  reduced = false,
}: {
  reduced?: boolean;
}) {
  return (
    <div
      className={clsx(
        'mf-atmosphere__thematic',
        reduced && 'mf-atmosphere__thematic--dim',
      )}
      aria-hidden
    >
      <div className="mf-atmo-parchment" />
      <div className="mf-atmo-windows" />
      <div className="mf-atmo-decals">
        <div className="mf-atmo-decal mf-atmo-decal--tl" />
        <div className="mf-atmo-decal mf-atmo-decal--br" />
        <div className="mf-atmo-decal mf-atmo-decal--claw" />
      </div>

      <div className="mf-atmo-clock">
        <ClockTower />
      </div>

      <div className="mf-atmo-gallows">
        <GallowsSilhouette />
      </div>

      <figure className="mf-atmo-cloak mf-atmo-cloak--1">
        <CloakedFigure className="mf-atmo-cloak__svg" />
      </figure>
      <figure className="mf-atmo-cloak mf-atmo-cloak--2">
        <CloakedFigure className="mf-atmo-cloak__svg" />
      </figure>
      <figure className="mf-atmo-cloak mf-atmo-cloak--3">
        <CloakedFigure className="mf-atmo-cloak__svg" />
      </figure>

      <div className="mf-atmo-ironmongery">
        <ChainAccent className="mf-atmo-chain mf-atmo-chain--left" />
        <ChainAccent className="mf-atmo-chain mf-atmo-chain--right" />
        <DaggerCrest className="mf-atmo-crest mf-atmo-crest--a" />
        <DaggerCrest className="mf-atmo-crest mf-atmo-crest--b" />
        <ShackleAccent className="mf-atmo-shackle mf-atmo-shackle--a" />
      </div>
    </div>
  );
}
