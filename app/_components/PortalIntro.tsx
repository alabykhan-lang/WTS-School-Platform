"use client";

import { useEffect, useState } from "react";

/**
 * 3D cinematic intro before staff sign-in.
 * Pure CSS 3D transforms (no WebGL) so it stays light on phones.
 * ~5.5s total; tap anywhere to skip. Skipped automatically when the
 * device prefers reduced motion.
 */
export function PortalIntro() {
  const [phase, setPhase] = useState<"play" | "leaving" | "done">("play");

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setPhase("leaving"), 4600),
      window.setTimeout(() => setPhase("done"), 5500),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  if (phase === "done") return null;

  return (
    <div
      className={"portalIntro" + (phase === "leaving" ? " portalIntro--leaving" : "")}
      role="presentation"
      onClick={() => setPhase("done")}
    >
      <div className="portalIntro__scene">
        <div className="portalIntro__ring" />
        <div className="portalIntro__ring portalIntro__ring--second" />
        <div className="portalIntro__badge">
          <div className="portalIntro__badgeFace portalIntro__badgeFace--front">
            <img src="/images/logo.webp" alt="" />
          </div>
          <div className="portalIntro__badgeFace portalIntro__badgeFace--back">
            <span>WTS</span>
          </div>
        </div>
      </div>
      <div className="portalIntro__wordmark">
        <span className="portalIntro__word">Way</span>{" "}
        <span className="portalIntro__word">to</span>{" "}
        <span className="portalIntro__word">Success</span>
      </div>
      <p className="portalIntro__sub">Standard Schools · Ejigbo</p>
      <button className="portalIntro__skip" type="button" onClick={() => setPhase("done")}>
        Skip
      </button>
    </div>
  );
}
