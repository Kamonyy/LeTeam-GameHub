'use client';

/** Layered arcade environment behind hub content */
export default function HubArcadeBackdrop() {
  return (
    <div className="hub-arcade-bg" aria-hidden>
      <div className="hub-arcade-bg__gradient" />
      <div className="hub-arcade-bg__grid" />
      <div className="hub-arcade-bg__carpet" />
      <div className="hub-arcade-bg__neon hub-arcade-bg__neon--left">PLAY</div>
      <div className="hub-arcade-bg__neon hub-arcade-bg__neon--right">WIN</div>
      <div className="hub-arcade-bg__marquee">
        <span>★ LE TEAM ARCADE ★ SECRET WORD ★ برا السالفة ★ DOMINOES ★ </span>
        <span aria-hidden>★ LE TEAM ARCADE ★ SECRET WORD ★ برا السالفة ★ DOMINOES ★ </span>
      </div>
      <div className="hub-arcade-bg__cabinet hub-arcade-bg__cabinet--1" />
      <div className="hub-arcade-bg__cabinet hub-arcade-bg__cabinet--2" />
      <div className="hub-arcade-bg__cabinet hub-arcade-bg__cabinet--3" />
      <div className="hub-arcade-bg__scanlines" />
      <div className="hub-arcade-bg__vignette" />
    </div>
  );
}
