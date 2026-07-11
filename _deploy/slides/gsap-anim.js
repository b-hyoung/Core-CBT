import gsap from "https://cdn.skypack.dev/gsap@3.12.5";
import { timeline as tlData } from "./data/timeline.js";

const EASE_OUT_QUART = "power3.out";
const EASE_OUT_EXPO = "expo.out";
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// --- Slide entry (calm, 3 buckets) ---
function animateSlideEntry(slide) {
  if (!slide) return;

  const heroTitle = slide.querySelector("h1.hero-title");
  const h2 = slide.querySelector("h2");
  // Top-level blocks only (no nested item-stagger that creates a "wave")
  const blocks = slide.querySelectorAll(
    ".lead, .hero-sub, .hero-meta, .chips, .stats, .timeline-wrap, .phase-card, .outro-list, p:not(.lead):not(.hero-sub):not(.hero-meta):not(.tl-caption)"
  );

  if (REDUCED) {
    gsap.set([heroTitle, h2, ...blocks].filter(Boolean), {
      opacity: 1,
      y: 0,
      clearProps: "all",
    });
    return;
  }

  // Kill any in-flight tweens on these targets first
  gsap.killTweensOf([heroTitle, h2, ...blocks].filter(Boolean));

  if (heroTitle) {
    gsap.fromTo(
      heroTitle,
      { opacity: 0 },
      { opacity: 1, duration: 0.9, ease: EASE_OUT_EXPO }
    );
  }

  if (h2) {
    gsap.fromTo(
      h2,
      { opacity: 0, y: 6 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: EASE_OUT_QUART,
        delay: heroTitle ? 0.1 : 0.05,
      }
    );
  }

  if (blocks.length) {
    gsap.fromTo(
      blocks,
      { opacity: 0 },
      {
        opacity: 1,
        duration: 0.45,
        ease: EASE_OUT_QUART,
        delay: 0.18,
        stagger: { each: 0.04, from: "start", amount: 0.22 },
      }
    );
  }
}

// --- Camera move per slide (subtle) ---
function moveCamera(idx) {
  if (!window.__bg || REDUCED) return;
  // small offsets, calm orbit
  const angle = (idx / 18) * Math.PI * 1.4;
  const r = 1.4;
  const x = Math.sin(angle) * r;
  const y = Math.cos(angle * 0.7) * 0.6;
  const z = 22 + Math.sin(angle * 0.5) * 1.5;

  gsap.to(window.__bg.targetCam, {
    x,
    y,
    z,
    duration: 1.4,
    ease: EASE_OUT_QUART,
  });
}

// --- Countups (numbers tick up) ---
function initCountups(scope) {
  const root = scope || document;
  root.querySelectorAll(".num[data-count]").forEach((el) => {
    if (el.dataset.done === "1") return;
    const target = parseInt(el.dataset.count, 10);
    if (REDUCED) {
      el.textContent = target.toLocaleString();
      el.dataset.done = "1";
      return;
    }
    const obj = { v: 0 };
    gsap.to(obj, {
      v: target,
      duration: 1.4,
      ease: EASE_OUT_QUART,
      delay: 0.35,
      onUpdate: () => {
        el.textContent = Math.round(obj.v).toLocaleString();
      },
      onComplete: () => {
        el.dataset.done = "1";
        el.textContent = target.toLocaleString();
      },
    });
  });
}

// --- Timeline SVG render + animate ---
function renderTimeline() {
  const svg = document.getElementById("timeline-svg");
  if (!svg || svg.dataset.done === "1") return;
  const w = 1100,
    h = 380,
    padX = 50,
    padY = 70;
  const max = Math.max(...tlData.map((d) => d[1]));
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const barW = innerW / tlData.length;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

  let html = "";

  // header label
  html += `<text class="tl-axis-label" x="${padX}" y="${
    padY - 22
  }">일별 커밋 · 총 250 · 2026-02-17 → 05-22</text>`;

  // baseline
  html += `<line x1="${padX}" y1="${h - padY}" x2="${w - padX}" y2="${
    h - padY
  }" stroke="rgba(255,255,255,0.10)" stroke-width="1"/>`;

  // bars
  tlData.forEach(([date, count], i) => {
    const bh = (count / max) * innerH;
    const x = padX + i * barW + barW * 0.15;
    const y = h - padY - bh;
    const isSpike = count >= 50;
    const color = isSpike ? "#8FA4FF" : count >= 15 ? "#D9DCE2" : "#6B6E78";
    const opacity = isSpike ? 1 : count >= 15 ? 0.9 : 0.55;
    html += `<rect class="tl-bar" data-final-h="${bh}" data-final-y="${y}" x="${x}" y="${
      h - padY
    }" width="${barW * 0.7}" height="0" fill="${color}" opacity="${opacity}" rx="2"/>`;
  });

  // month labels
  const months = ["02-17", "03-01", "04-01", "04-19", "05-22"];
  const monthIdx = [0, 9, 14, 24, 30];
  months.forEach((m, i) => {
    const idx = Math.min(monthIdx[i], tlData.length - 1);
    const x = padX + idx * barW + barW * 0.35;
    html += `<text class="tl-axis-label" x="${x}" y="${
      h - padY + 22
    }">${m}</text>`;
  });

  // spike annotation
  const spikeIdx = tlData.findIndex((d) => d[1] >= 50);
  const sx = padX + spikeIdx * barW + barW * 0.35;
  const sy = h - padY - (89 / max) * innerH - 14;
  html += `<text class="tl-spike-label" x="${sx}" y="${sy}" text-anchor="middle">89 / day · AI 코치 에이전트</text>`;
  html += `<line x1="${sx}" y1="${sy + 6}" x2="${sx}" y2="${
    h - padY - (89 / max) * innerH - 2
  }" stroke="#8FA4FF" stroke-width="1" opacity="0.6"/>`;

  svg.innerHTML = html;

  if (REDUCED) {
    svg.querySelectorAll(".tl-bar").forEach((t) => {
      t.setAttribute("y", t.getAttribute("data-final-y"));
      t.setAttribute("height", t.getAttribute("data-final-h"));
    });
  } else {
    gsap.to(svg.querySelectorAll(".tl-bar"), {
      duration: 0.85,
      stagger: { each: 0.018, amount: 0.55 },
      ease: EASE_OUT_QUART,
      delay: 0.35,
      attr: {
        y: (i, t) => t.getAttribute("data-final-y"),
        height: (i, t) => t.getAttribute("data-final-h"),
      },
    });
  }

  svg.dataset.done = "1";
}

// --- Reveal hooks ---
function init() {
  const Reveal = window.Reveal;
  if (!Reveal) {
    setTimeout(init, 50);
    return;
  }

  Reveal.on("ready", (ev) => {
    animateSlideEntry(ev.currentSlide);
    initCountups(ev.currentSlide);
    moveCamera(ev.indexh);
    if (ev.currentSlide.querySelector("#timeline-svg")) renderTimeline();
  });

  Reveal.on("slidechanged", (ev) => {
    animateSlideEntry(ev.currentSlide);
    initCountups(ev.currentSlide);
    moveCamera(ev.indexh);
    if (ev.currentSlide.querySelector("#timeline-svg")) renderTimeline();
  });
}

init();
