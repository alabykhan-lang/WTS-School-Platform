"use client";

import { useEffect, useRef } from "react";

/**
 * 3D intro before/after sign-in. JavaScript-driven (requestAnimationFrame),
 * not CSS keyframes: Android WebViews can zero out CSS animation durations,
 * which made the intro invisible inside the school APK. JS animation is immune.
 * ~6s total; tap anywhere to skip.
 */
export function PortalIntro() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    document.documentElement.classList.add("pintro-lock");

    const badge = el.querySelector<HTMLDivElement>("#pintroBadge");
    const scene = el.querySelector<HTMLDivElement>("#pintroScene");
    const rings = [
      el.querySelector<HTMLDivElement>("#pintroRing1"),
      el.querySelector<HTMLDivElement>("#pintroRing2"),
    ];
    const words = [1, 2, 3].map((n) => el.querySelector<HTMLSpanElement>(`#pintroW${n}`));
    const sub = el.querySelector<HTMLParagraphElement>("#pintroSub");

    const DUR = 5200;
    let started: number | null = null;
    let skipped = false;
    let raf = 0;
    let outTimer = 0;
    let fade: number | undefined;
    let done = false;

    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    function cleanup() {
      document.documentElement.classList.remove("pintro-lock");
    }

    function finish() {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(outTimer);
      const elNow = ref.current;
      if (!elNow) { cleanup(); return; }
      let o = 1;
      fade = window.setInterval(() => {
        o -= 0.12;
        elNow.style.opacity = String(Math.max(0, o));
        elNow.style.transform = `scale(${1 + (1 - Math.max(0, o)) * 0.18})`;
        if (o <= 0) {
          window.clearInterval(fade);
          elNow.remove();
          cleanup();
        }
      }, 40);
    }

    function frame(now: number) {
      if (started === null) started = now;
      const t = Math.min(Math.max((now - started) / DUR, 0), 1);
      const inT = Math.min(t / 0.5, 1);
      const b = t < 0.5 ? 0 : 0.06 * Math.sin((t - 0.5) * 12.56);
      if (badge) {
        badge.style.opacity = String(Math.min(1, inT * 2.2));
        badge.style.transform =
          `rotateY(${(1 - ease(inT)) * 360}deg) scale(${0.55 + 0.45 * ease(inT)})` +
          (t >= 0.5 ? ` rotateZ(${b * 3}deg) rotateY(${b * 12}deg)` : "");
      }
      if (scene) scene.style.transform = `scale(${0.7 + 0.3 * ease(Math.min(t / 0.7, 1))})`;
      if (rings[0]) {
        rings[0].style.transform = `rotateX(72deg) scale(${0.35 + 0.8 * ease(Math.min(t / 0.45, 1))})`;
        rings[0].style.opacity = String(Math.max(0, 0.85 - t * 0.6));
      }
      if (rings[1]) {
        rings[1].style.transform = `rotateX(72deg) scale(${0.3 + 0.85 * ease(Math.min(Math.max(t - 0.08, 0) / 0.5, 1))})`;
        rings[1].style.opacity = String(Math.max(0, 0.5 - t * 0.4));
      }
      const wl = [1.35 / 5.2, 1.6 / 5.2, 1.85 / 5.2];
      words.forEach((w, i) => {
        if (!w) return;
        const wt = Math.min(Math.max((t - wl[i]) / 0.17, 0), 1);
        const e = 1 - Math.pow(1 - wt, 3);
        w.style.opacity = String(e);
        w.style.transform = `translateY(${(1 - e) * 26}px) rotateX(${(1 - e) * 75}deg)`;
      });
      if (sub) sub.style.opacity = String(Math.min(Math.max((t - 2.5 / 5.2) / 0.19, 0), 1));
      if (now - started < DUR && !done) raf = requestAnimationFrame(frame);
      else finish();
    }

    el.addEventListener("click", finish);
    raf = requestAnimationFrame(frame);
    outTimer = window.setTimeout(finish, DUR + 900);

    return () => {
      done = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(outTimer);
      if (fade) window.clearInterval(fade);
      cleanup();
      el.remove();
    };
  }, []);

  return (
    <div className="portalIntro" id="portalIntro" role="presentation" ref={ref}>
      <style>{`
html.pintro-lock{overflow:hidden}
.portalIntro{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.4rem;background:radial-gradient(120% 90% at 50% 20%,#0d2a4d 0%,#071527 55%,#030b16 100%);cursor:pointer;overflow:hidden;perspective:1100px}
.portalIntro__scene{position:relative;width:190px;height:190px;transform-style:preserve-3d;will-change:transform}
.portalIntro__badge{position:absolute;inset:0;border-radius:50%;background:linear-gradient(150deg,#f8fbff,#cfe0f2 60%,#9fbcd8);box-shadow:0 24px 60px rgba(2,12,26,.55),0 0 0 1px rgba(255,255,255,.35) inset;display:flex;align-items:center;justify-content:center;will-change:transform,opacity}
.portalIntro__badge img{width:74%;height:74%;object-fit:contain;border-radius:50%}
.portalIntro__ring{position:absolute;inset:-26px;border-radius:50%;border:2px solid rgba(120,190,255,.5);opacity:.8}
.portalIntro__ring--second{inset:-48px;border-color:rgba(120,190,255,.22);opacity:.5}
.portalIntro__wordmark{display:flex;gap:.45em;font-size:clamp(1.5rem,6vw,2.4rem);font-weight:800;color:#eef6ff}
.portalIntro__word{display:inline-block;opacity:0;will-change:transform,opacity;text-shadow:0 2px 24px rgba(96,180,255,.4)}
.portalIntro__sub{margin:0;color:#8fbede;font-size:.95rem;letter-spacing:.18em;text-transform:uppercase;opacity:0}
.portalIntro__skip{position:absolute;right:18px;bottom:16px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.25);color:#cfe4f6;padding:.45rem 1.1rem;border-radius:999px;font-size:.85rem;z-index:2}
`}</style>
      <div className="portalIntro__scene" id="pintroScene">
        <div className="portalIntro__ring" id="pintroRing1"></div>
        <div className="portalIntro__ring portalIntro__ring--second" id="pintroRing2"></div>
        <div className="portalIntro__badge" id="pintroBadge">
          <img src="/images/logo.webp" alt="" />
        </div>
      </div>
      <div className="portalIntro__wordmark">
        <span className="portalIntro__word" id="pintroW1">Way</span>{" "}
        <span className="portalIntro__word" id="pintroW2">to</span>{" "}
        <span className="portalIntro__word" id="pintroW3">Success</span>
      </div>
      <p className="portalIntro__sub" id="pintroSub">Standard Schools · Ejigbo</p>
      <button className="portalIntro__skip" type="button">Skip</button>
    </div>
  );
}
