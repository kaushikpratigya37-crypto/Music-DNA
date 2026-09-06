import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Moon,
  Flame,
  Compass,
  Disc3,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  X,
  Heart,
  Search,
  Clock,
  Zap,
  Music2,
  Menu,
} from "lucide-react";

/* ============================================================
   DATA
   ============================================================ */

const DIMS = ["dreamer", "rebel", "explorer", "nostalgic"];

const ARCHETYPES = {
  dreamer: {
    key: "dreamer",
    name: "The Dreamer",
    icon: Moon,
    color: "#8B7CFF",
    glow: "rgba(139,124,255,0.35)",
    tagline: "You don't just listen to music. You disappear into it.",
    description:
      "You use music as a place to disappear, imagine and reflect. Slow builds, wide-open production and lyrics you can crawl inside all pull you in — a song isn't background noise, it's somewhere to go.",
  },
  rebel: {
    key: "rebel",
    name: "The Rebel",
    icon: Flame,
    color: "#FF5C87",
    glow: "rgba(255,92,135,0.35)",
    tagline: "You don't play music quietly. You play it like a statement.",
    description:
      "You gravitate toward bold sounds and music that feels different from everything around it. Big choruses, sharp edges, unfiltered energy — if it doesn't move something in you, it doesn't make the playlist.",
  },
  explorer: {
    key: "explorer",
    name: "The Explorer",
    icon: Compass,
    color: "#33D9C4",
    glow: "rgba(51,217,196,0.35)",
    tagline: "You're not looking for a favorite song. You're looking for the next one.",
    description:
      "You're driven by discovery and constantly look for sounds you've never heard. Genres are starting points, not categories, and the best find is always the one nobody's told you about yet.",
  },
  nostalgic: {
    key: "nostalgic",
    name: "The Nostalgic",
    icon: Disc3,
    color: "#FFB454",
    glow: "rgba(255,180,84,0.35)",
    tagline: "For you, a song is never just a song. It's a place you used to live.",
    description:
      "Music connects strongly with memories, people and moments from your past. A single opening chord can drop you right back into a summer, a car, a person — your playlists double as a timeline.",
  },
};

const QUESTIONS = [
  {
    prompt: "It's 11:47 PM. What are you listening to?",
    options: [
      { text: "Something slow & dreamy", dim: "dreamer" },
      { text: "Something nostalgic", dim: "nostalgic" },
      { text: "Something energetic", dim: "rebel" },
      { text: "Something completely new", dim: "explorer" },
    ],
  },
  {
    prompt: "Choose the place where music feels most like \u201cyou\u201d.",
    options: [
      { text: "A quiet bedroom at night", dim: "dreamer" },
      { text: "A crowded concert", dim: "rebel" },
      { text: "A road with no destination", dim: "explorer" },
      { text: "A caf\u00e9 on a rainy afternoon", dim: "nostalgic" },
    ],
  },
  {
    prompt: "A song becomes special to you when\u2026",
    options: [
      { text: "The lyrics tell a story", dim: "dreamer" },
      { text: "The beat is unforgettable", dim: "rebel" },
      { text: "It reminds you of someone", dim: "nostalgic" },
      { text: "It feels completely different", dim: "explorer" },
    ],
  },
  {
    prompt: "Your perfect music discovery is\u2026",
    options: [
      { text: "An old forgotten song", dim: "nostalgic" },
      { text: "A hidden indie artist", dim: "explorer" },
      { text: "A powerful anthem", dim: "rebel" },
      { text: "Something I've never heard before", dim: "dreamer" },
    ],
  },
  {
    prompt: "Choose your spontaneous mood.",
    options: [
      { text: "Dreamy", dim: "dreamer" },
      { text: "Curious", dim: "explorer" },
      { text: "Fearless", dim: "rebel" },
      { text: "Emotional", dim: "nostalgic" },
    ],
  },
  {
    prompt: "Which sentence sounds most like you?",
    options: [
      { text: "\u201cMusic helps me escape.\u201d", dim: "dreamer" },
      { text: "\u201cMusic helps me feel.\u201d", dim: "nostalgic" },
      { text: "\u201cMusic helps me express.\u201d", dim: "rebel" },
      { text: "\u201cMusic helps me explore.\u201d", dim: "explorer" },
    ],
  },
];

const SIBLING = { dreamer: "nostalgic", nostalgic: "dreamer", rebel: "explorer", explorer: "rebel" };

const ERAS = {
  dreamer: { name: "The 1970s", blurb: "Warm analog tones, dreamy album sides, music built for staring at the ceiling." },
  rebel: { name: "The 1990s", blurb: "Loud guitars and unapologetic attitude \u2014 music that refused to sit quietly." },
  explorer: { name: "The 2020s", blurb: "Genre-blurring and algorithm-defying, always chasing the next unheard sound." },
  nostalgic: { name: "The 2000s", blurb: "Burned CDs and first heartbreaks \u2014 songs that still know exactly who you were." },
};

const SAMPLE_PROFILES = [
  { key: "dreamer", scores: { dreamer: 58, nostalgic: 22, explorer: 12, rebel: 8 } },
  { key: "rebel", scores: { rebel: 55, explorer: 25, dreamer: 10, nostalgic: 10 } },
  { key: "explorer", scores: { explorer: 52, rebel: 24, dreamer: 14, nostalgic: 10 } },
  { key: "nostalgic", scores: { nostalgic: 60, dreamer: 20, rebel: 11, explorer: 9 } },
];

const COMPARISON = {
  alex: { name: "Alex", scores: { dreamer: 42, explorer: 27, nostalgic: 19, rebel: 12 } },
  maya: { name: "Maya", scores: { explorer: 39, nostalgic: 28, rebel: 15, dreamer: 18 } },
};

function normalizeScores(raw) {
  const total = DIMS.reduce((s, d) => s + raw[d], 0) || 1;
  const exact = DIMS.map((d) => (raw[d] / total) * 100);
  const floored = exact.map(Math.floor);
  let remainder = 100 - floored.reduce((a, b) => a + b, 0);
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  const result = [...floored];
  for (let k = 0; k < remainder; k++) result[order[k % order.length].i] += 1;
  const out = {};
  DIMS.forEach((d, i) => (out[d] = result[i]));
  return out;
}

function scoreQuiz(answers) {
  const raw = { dreamer: 0, rebel: 0, explorer: 0, nostalgic: 0 };
  answers.forEach((dim) => {
    if (!dim) return;
    raw[dim] += 4;
    raw[SIBLING[dim]] += 1;
  });
  return normalizeScores(raw);
}

function sortedDims(scores) {
  return [...DIMS].sort((a, b) => scores[b] - scores[a]);
}

function computeVibe(scores) {
  const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
  return {
    energy: clamp(scores.rebel * 1.15 + scores.explorer * 0.55 + 8),
    emotion: clamp(scores.dreamer * 1.05 + scores.nostalgic * 0.6 + 12),
    curiosity: clamp(scores.explorer * 1.25 + scores.rebel * 0.3 + 8),
    nostalgia: clamp(scores.nostalgic * 1.25 + scores.dreamer * 0.25 + 6),
  };
}

/* ============================================================
   SMALL VISUAL PRIMITIVES
   ============================================================ */

function RingProgress({ percent, color, size = 120, stroke = 10, label, sublabel }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(percent), 120);
    return () => clearTimeout(t);
  }, [percent]);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (animated / 100) * c;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.16,.8,.3,1)", filter: `drop-shadow(0 0 6px ${color}90)` }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: size * 0.2, color: "#F3EFFB" }}>
          {Math.round(animated)}%
        </span>
        {label && (
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 11, color: "#A79BC9", marginTop: 2 }}>{label}</span>
        )}
      </div>
    </div>
  );
}

function VibeBar({ icon: Icon, label, value, color }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(value), 150);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div
      className="glass-card"
      style={{ padding: "20px 22px", borderRadius: 18, display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: `${color}22`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={17} color={color} />
          </div>
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 14, color: "#D9D2EF" }}>{label}</span>
        </div>
        <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 15, color: "#F3EFFB" }}>{value}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${w}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            borderRadius: 999,
            transition: "width 1s cubic-bezier(.16,.8,.3,1)",
          }}
        />
      </div>
    </div>
  );
}

function DnaHelix({ size = 260, colors = ["#8B7CFF", "#FF5C87"], spin = true }) {
  const rungs = 9;
  const width = size;
  const height = size * 1.35;
  const amp = width * 0.24;
  const cx = width / 2;
  const rows = Array.from({ length: rungs });
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ animation: spin ? "dnaFloat 6s ease-in-out infinite" : "none" }}
    >
      {rows.map((_, i) => {
        const t = i / (rungs - 1);
        const y = 20 + t * (height - 40);
        const phase = t * Math.PI * 2.4;
        const x1 = cx + Math.sin(phase) * amp;
        const x2 = cx + Math.sin(phase + Math.PI) * amp;
        return (
          <g key={i}>
            <line x1={x1} y1={y} x2={x2} y2={y} stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} />
            <circle cx={x1} cy={y} r={7} fill={colors[0]} opacity={0.9} />
            <circle cx={x2} cy={y} r={7} fill={colors[1]} opacity={0.9} />
          </g>
        );
      })}
    </svg>
  );
}

function Waveform({ bars = 24, color = "#8B7CFF", height = 46, animated = true }) {
  const heights = useMemo(
    () => Array.from({ length: bars }, () => 0.25 + Math.random() * 0.75),
    [bars]
  );
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height }}>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            background: color,
            height: `${h * 100}%`,
            opacity: 0.8,
            animation: animated ? `waveBar 1.4s ease-in-out ${i * 0.05}s infinite` : "none",
          }}
        />
      ))}
    </div>
  );
}

/* ============================================================
   NAV
   ============================================================ */

function Nav({ onGo }) {
  const [open, setOpen] = useState(false);
  const links = [
    ["Take the test", "test"],
    ["How it works", "how"],
    ["Compare", "compare"],
    ["Explore", "explore"],
    ["About", "about"],
  ];
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        backdropFilter: "blur(14px)",
        background: "rgba(11,7,20,0.72)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }} onClick={() => onGo("hero")}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: "linear-gradient(135deg,#8B7CFF,#FF5C87)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Music2 size={16} color="#0B0714" />
          </div>
          <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 16, color: "#F3EFFB", letterSpacing: 0.2 }}>
            Music DNA
          </span>
        </div>
        <nav className="nav-links" style={{ display: "flex", gap: 28 }}>
          {links.map(([label, id]) => (
            <button
              key={id}
              onClick={() => onGo(id)}
              className="nav-btn"
              style={{
                background: "none",
                border: "none",
                fontFamily: "Sora, sans-serif",
                fontSize: 14,
                color: "#B9AFDA",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <button
          onClick={() => onGo("test")}
          className="btn-primary"
          style={{ display: "none" }}
          id="nav-cta-desktop"
        >
          Decode My Music DNA
        </button>
        <button
          className="menu-toggle"
          onClick={() => setOpen((o) => !o)}
          style={{
            background: "none",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 9,
            width: 36,
            height: 36,
            display: "none",
            alignItems: "center",
            justifyContent: "center",
            color: "#F3EFFB",
          }}
        >
          <Menu size={17} />
        </button>
      </div>
      {open && (
        <div
          className="mobile-menu"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: "8px 24px 18px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {links.map(([label, id]) => (
            <button
              key={id}
              onClick={() => {
                onGo(id);
                setOpen(false);
              }}
              style={{
                background: "none",
                border: "none",
                textAlign: "left",
                padding: "10px 0",
                fontFamily: "Sora, sans-serif",
                fontSize: 15,
                color: "#D9D2EF",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

/* ============================================================
   HERO
   ============================================================ */

function Hero({ onStart, onSample }) {
  return (
    <section
      id="hero"
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "96px 24px 120px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="orb orb-c" />
      <div
        style={{
          maxWidth: 1180,
          width: "100%",
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 48,
          alignItems: "center",
          position: "relative",
          zIndex: 2,
        }}
        className="hero-grid"
      >
        <div className="hero-fade-1">
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 14px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.04)",
              marginBottom: 26,
            }}
          >
            <Sparkles size={13} color="#FF5C87" />
            <span style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, color: "#C9BFE8" }}>
              6 questions, 60 seconds, one unique DNA
            </span>
          </div>
          <h1
            style={{
              fontFamily: "Fraunces, serif",
              fontWeight: 600,
              fontSize: "clamp(2.4rem, 5vw, 4rem)",
              lineHeight: 1.06,
              color: "#F6F3FF",
              margin: 0,
              maxWidth: 620,
            }}
          >
            What does your music say about you?
          </h1>
          <p
            style={{
              fontFamily: "Sora, sans-serif",
              fontSize: "1.15rem",
              color: "#B9AFDA",
              marginTop: 22,
              maxWidth: 480,
              lineHeight: 1.6,
            }}
          >
            Discover the personality hiding inside your playlists.
          </p>
          <div style={{ display: "flex", gap: 14, marginTop: 36, flexWrap: "wrap" }}>
            <button onClick={onStart} className="btn-primary">
              Decode My Music DNA
              <ArrowRight size={16} />
            </button>
            <button onClick={onSample} className="btn-ghost">
              Explore Sample DNA
            </button>
          </div>
        </div>
        <div
          className="hero-fade-2"
          style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}
        >
          <DnaHelix size={260} colors={["#8B7CFF", "#FF5C87"]} />
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   HOW IT WORKS
   ============================================================ */

function HowItWorks() {
  const steps = [
    { n: "01", title: "Choose", icon: Sparkles, color: "#8B7CFF", copy: "Answer questions about your musical preferences and everyday personality." },
    { n: "02", title: "Decode", icon: Zap, color: "#FF5C87", copy: "The system reads your choices across four personality dimensions." },
    { n: "03", title: "Discover", icon: Disc3, color: "#33D9C4", copy: "Get your unique Music DNA profile, built entirely from your answers." },
  ];
  return (
    <section id="how" style={{ padding: "70px 24px", maxWidth: 1180, margin: "0 auto" }}>
      <SectionHeading eyebrow="The process" title="From six answers to one DNA" />
      <div className="how-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginTop: 40 }}>
        {steps.map((s) => (
          <div key={s.n} className="glass-card hover-lift" style={{ padding: 28, borderRadius: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 13,
                  background: `${s.color}22`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <s.icon size={20} color={s.color} />
              </div>
              <span style={{ fontFamily: "Fraunces, serif", fontSize: 26, color: "rgba(255,255,255,0.16)" }}>{s.n}</span>
            </div>
            <h3 style={{ fontFamily: "Sora, sans-serif", fontSize: 19, color: "#F3EFFB", margin: "0 0 8px" }}>{s.title}</h3>
            <p style={{ fontFamily: "Sora, sans-serif", fontSize: 14.5, color: "#A79BC9", lineHeight: 1.6, margin: 0 }}>
              {s.copy}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, sub, align = "left" }) {
  return (
    <div style={{ textAlign: align, maxWidth: align === "center" ? 640 : 560, margin: align === "center" ? "0 auto" : 0 }}>
      <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, color: "#FF8FAE", fontWeight: 600 }}>{eyebrow}</span>
      <h2
        style={{
          fontFamily: "Fraunces, serif",
          fontWeight: 600,
          fontSize: "clamp(1.7rem, 3.2vw, 2.4rem)",
          color: "#F6F3FF",
          margin: "10px 0 0",
          lineHeight: 1.15,
        }}
      >
        {title}
      </h2>
      {sub && (
        <p style={{ fontFamily: "Sora, sans-serif", fontSize: 15.5, color: "#A79BC9", marginTop: 12, lineHeight: 1.6 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

/* ============================================================
   QUIZ
   ============================================================ */

function Quiz({ answers, setAnswers, step, setStep, onFinish }) {
  const q = QUESTIONS[step];
  const progress = ((step + (answers[step] ? 1 : 0)) / QUESTIONS.length) * 100;

  function choose(dim) {
    const next = [...answers];
    next[step] = dim;
    setAnswers(next);
  }

  function goNext() {
    if (!answers[step]) return;
    if (step === QUESTIONS.length - 1) {
      onFinish(answers);
    } else {
      setStep(step + 1);
    }
  }

  function goBack() {
    if (step > 0) setStep(step - 1);
  }

  return (
    <section id="test" style={{ padding: "70px 24px 90px", maxWidth: 780, margin: "0 auto" }}>
      <SectionHeading eyebrow="The Music DNA test" title="Answer honestly. There's no wrong playlist." align="center" />

      <div style={{ marginTop: 44 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, color: "#A79BC9" }}>
            Question {step + 1} of {QUESTIONS.length}
          </span>
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, color: "#A79BC9" }}>{Math.round(progress)}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg,#8B7CFF,#FF5C87)",
              borderRadius: 999,
              transition: "width .4s ease",
            }}
          />
        </div>

        <div key={step} className="quiz-card-enter glass-card" style={{ marginTop: 34, padding: "36px 32px", borderRadius: 22 }}>
          <h3
            style={{
              fontFamily: "Fraunces, serif",
              fontSize: "clamp(1.35rem, 2.6vw, 1.7rem)",
              color: "#F6F3FF",
              margin: "0 0 26px",
              lineHeight: 1.3,
            }}
          >
            {q.prompt}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="quiz-options">
            {q.options.map((opt) => {
              const selected = answers[step] === opt.dim;
              return (
                <button
                  key={opt.text}
                  onClick={() => choose(opt.dim)}
                  className="quiz-option"
                  style={{
                    textAlign: "left",
                    padding: "16px 18px",
                    borderRadius: 14,
                    border: selected ? "1px solid rgba(255,255,255,0.5)" : "1px solid rgba(255,255,255,0.1)",
                    background: selected ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                    color: "#F0ECFB",
                    fontFamily: "Sora, sans-serif",
                    fontSize: 14.5,
                    cursor: "pointer",
                    boxShadow: selected ? "0 0 0 1px rgba(255,255,255,0.15), 0 8px 22px rgba(139,124,255,0.18)" : "none",
                  }}
                >
                  {opt.text}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 26 }}>
          <button onClick={goBack} disabled={step === 0} className="btn-ghost" style={{ opacity: step === 0 ? 0.35 : 1 }}>
            <ArrowLeft size={16} />
            Back
          </button>
          <button onClick={goNext} disabled={!answers[step]} className="btn-primary" style={{ opacity: answers[step] ? 1 : 0.4 }}>
            {step === QUESTIONS.length - 1 ? "See my Music DNA" : "Next"}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   RESULT
   ============================================================ */

function ResultView({ scores, onRestart, title = "Your Music DNA", isSample = false }) {
  const order = sortedDims(scores);
  const primary = ARCHETYPES[order[0]];
  const secondary = ARCHETYPES[order[1]];
  const vibe = computeVibe(scores);
  const era = ERAS[order[0]];

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <div style={{ textAlign: "center" }}>
        <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, color: "#FF8FAE", fontWeight: 600 }}>{title}</span>
        <h2
          style={{
            fontFamily: "Fraunces, serif",
            fontWeight: 600,
            fontSize: "clamp(2.2rem, 5vw, 3.2rem)",
            color: "#F6F3FF",
            margin: "12px 0 0",
          }}
        >
          {primary.name}
          <primary.icon size={"0.7em"} style={{ marginLeft: 14, verticalAlign: "middle" }} color={primary.color} />
        </h2>
        <p
          style={{
            fontFamily: "Fraunces, serif",
            fontStyle: "italic",
            fontSize: "clamp(1.05rem, 2vw, 1.3rem)",
            color: "#D9D2EF",
            marginTop: 16,
          }}
        >
          {primary.tagline}
        </p>
      </div>

      <div
        className="glass-card"
        style={{
          marginTop: 40,
          padding: "36px 30px",
          borderRadius: 24,
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 40,
          alignItems: "center",
        }}
      >
        <DnaHelix size={170} colors={[primary.color, secondary.color]} />
        <div>
          <p style={{ fontFamily: "Sora, sans-serif", fontSize: 15, color: "#B9AFDA", lineHeight: 1.7, margin: "0 0 24px" }}>
            {primary.description}
          </p>
          <div className="ring-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
            {order.map((d) => (
              <div key={d} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <RingProgress percent={scores[d]} color={ARCHETYPES[d].color} size={92} stroke={8} />
                <span style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, color: "#A79BC9" }}>{ARCHETYPES[d].name.replace("The ", "")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 50 }}>
        <SectionHeading eyebrow="Vibe breakdown" title="What your DNA is made of" align="center" />
        <div className="vibe-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginTop: 30 }}>
          <VibeBar icon={Zap} label="Energy" value={vibe.energy} color="#FF5C87" />
          <VibeBar icon={Heart} label="Emotion" value={vibe.emotion} color="#8B7CFF" />
          <VibeBar icon={Search} label="Curiosity" value={vibe.curiosity} color="#33D9C4" />
          <VibeBar icon={Clock} label="Nostalgia" value={vibe.nostalgia} color="#FFB454" />
        </div>
        <p style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, color: "#78708F", textAlign: "center", marginTop: 22 }}>
          Your Music DNA is an entertainment-based personality experience, not a scientific assessment.
        </p>
      </div>

      <div className="era-hidden-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 50 }}>
        <div className="glass-card" style={{ padding: 30, borderRadius: 20 }}>
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, color: "#FF8FAE", fontWeight: 600 }}>
            If your personality were a musical era
          </span>
          <h3 style={{ fontFamily: "Fraunces, serif", fontSize: "1.8rem", color: "#F6F3FF", margin: "10px 0 10px" }}>
            {era.name}
          </h3>
          <p style={{ fontFamily: "Sora, sans-serif", fontSize: 14.5, color: "#A79BC9", lineHeight: 1.6, margin: 0 }}>
            {era.blurb}
          </p>
        </div>
        <div className="glass-card" style={{ padding: 30, borderRadius: 20 }}>
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, color: "#FF8FAE", fontWeight: 600 }}>
            There's another side to your Music DNA
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0 10px" }}>
            <secondary.icon size={20} color={secondary.color} />
            <h3 style={{ fontFamily: "Fraunces, serif", fontSize: "1.4rem", color: "#F6F3FF", margin: 0 }}>
              {secondary.name}
            </h3>
          </div>
          <p style={{ fontFamily: "Sora, sans-serif", fontSize: 14.5, color: "#A79BC9", lineHeight: 1.6, margin: 0 }}>
            You seem like {primary.name}, but your answers reveal a strong {secondary.name.replace("The ", "")} streak.
          </p>
        </div>
      </div>

      {!isSample && (
        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 50, flexWrap: "wrap" }}>
          <button onClick={onRestart} className="btn-ghost">
            <RotateCcw size={15} />
            Retake the test
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   COMPARISON DEMO
   ============================================================ */

function ComparisonSection() {
  return (
    <section id="compare" style={{ padding: "80px 24px", maxWidth: 1000, margin: "0 auto" }}>
      <SectionHeading
        eyebrow="Demo feature"
        title="How different are your Music DNAs?"
        sub="Different playlists. Different personalities. This side-by-side is a demo, not a real social system."
        align="center"
      />
      <div className="compare-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 40 }}>
        {Object.values(COMPARISON).map((p) => {
          const order = sortedDims(p.scores);
          return (
            <div key={p.name} className="glass-card" style={{ padding: 26, borderRadius: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${ARCHETYPES[order[0]].color}, ${ARCHETYPES[order[1]].color})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "Sora, sans-serif",
                    fontWeight: 700,
                    color: "#0B0714",
                    fontSize: 15,
                  }}
                >
                  {p.name[0]}
                </div>
                <span style={{ fontFamily: "Sora, sans-serif", fontSize: 16, fontWeight: 600, color: "#F3EFFB" }}>
                  {p.name}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {order.map((d) => (
                  <div key={d}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, color: "#B9AFDA" }}>
                        {ARCHETYPES[d].name}
                      </span>
                      <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, color: "#F3EFFB" }}>{p.scores[d]}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${p.scores[d]}%`,
                          background: ARCHETYPES[d].color,
                          borderRadius: 999,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ============================================================
   SAMPLE GALLERY
   ============================================================ */

function SampleGallery({ onOpen }) {
  return (
    <section id="explore" style={{ padding: "80px 24px", maxWidth: 1180, margin: "0 auto" }}>
      <SectionHeading eyebrow="Sample DNAs" title="Explore the four archetypes" sub="Tap a card to see a full sample profile." align="center" />
      <div className="gallery-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, marginTop: 40 }}>
        {SAMPLE_PROFILES.map((p) => {
          const a = ARCHETYPES[p.key];
          return (
            <button
              key={p.key}
              onClick={() => onOpen(p)}
              className="hover-lift"
              style={{
                textAlign: "left",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 20,
                padding: "26px 22px",
                background: `linear-gradient(160deg, ${a.glow}, rgba(255,255,255,0.02))`,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 13,
                  background: `${a.color}25`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <a.icon size={22} color={a.color} />
              </div>
              <div>
                <h3 style={{ fontFamily: "Fraunces, serif", fontSize: "1.2rem", color: "#F6F3FF", margin: "0 0 6px" }}>
                  {a.name}
                </h3>
                <p style={{ fontFamily: "Sora, sans-serif", fontSize: 13, color: "#A79BC9", lineHeight: 1.55, margin: 0 }}>
                  {a.tagline}
                </p>
              </div>
              <Waveform bars={14} color={a.color} height={26} animated={false} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SampleModal({ profile, onClose }) {
  if (!profile) return null;
  const a = ARCHETYPES[profile.key];
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6,4,12,0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card"
        style={{
          maxWidth: 620,
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          borderRadius: 24,
          padding: "34px 30px",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.05)",
            color: "#F3EFFB",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={16} />
        </button>
        <ResultView scores={profile.scores} title="Sample Music DNA" isSample />
      </div>
    </div>
  );
}

/* ============================================================
   ABOUT + FINAL CTA
   ============================================================ */

function About() {
  return (
    <section id="about" style={{ padding: "80px 24px", maxWidth: 780, margin: "0 auto", textAlign: "center" }}>
      <SectionHeading eyebrow="About Music DNA" title="A playful way to reflect on how you connect with music" align="center" />
      <p style={{ fontFamily: "Sora, sans-serif", fontSize: 15.5, color: "#A79BC9", marginTop: 20, lineHeight: 1.75 }}>
        Music DNA turns everyday music preferences into a playful visual personality experience. Instead of simply
        recommending songs, it helps you reflect on how you connect with music \u2014 what you reach for late at night,
        what pulls you back to old favorites, what makes you chase something new.
      </p>
      <p style={{ fontFamily: "Sora, sans-serif", fontSize: 13, color: "#78708F", marginTop: 18 }}>
        This is an entertainment and demo concept, built on fictional data. It is not a scientific personality test.
      </p>
    </section>
  );
}

function FinalCTA({ onGo }) {
  return (
    <section style={{ padding: "90px 24px 110px", textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div className="orb orb-d" />
      <div style={{ position: "relative", zIndex: 2 }}>
        <h2
          style={{
            fontFamily: "Fraunces, serif",
            fontWeight: 600,
            fontSize: "clamp(2rem, 4.5vw, 3rem)",
            color: "#F6F3FF",
            margin: 0,
          }}
        >
          Ready to decode yourself?
        </h2>
        <div style={{ marginTop: 30 }}>
          <button onClick={onGo} className="btn-primary">
            Discover My Music DNA
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   APP
   ============================================================ */

export default function App() {
  const [answers, setAnswers] = useState(Array(QUESTIONS.length).fill(null));
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [finalScores, setFinalScores] = useState(null);
  const [sampleProfile, setSampleProfile] = useState(null);

  const heroRef = useRef(null);
  const howRef = useRef(null);
  const testRef = useRef(null);
  const resultRef = useRef(null);
  const compareRef = useRef(null);
  const exploreRef = useRef(null);
  const aboutRef = useRef(null);

  const refs = { hero: heroRef, how: howRef, test: testRef, result: resultRef, compare: compareRef, explore: exploreRef, about: aboutRef };

  function scrollTo(id) {
    const r = refs[id];
    if (r && r.current) r.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleFinish(finalAnswers) {
    const scores = scoreQuiz(finalAnswers);
    setFinalScores(scores);
    setCompleted(true);
    setTimeout(() => scrollTo("result"), 60);
  }

  function handleRestart() {
    setAnswers(Array(QUESTIONS.length).fill(null));
    setStep(0);
    setCompleted(false);
    setFinalScores(null);
    setTimeout(() => scrollTo("test"), 60);
  }

  function goToTest() {
    scrollTo("test");
  }

  return (
    <div style={{ background: "#0B0714", minHeight: "100vh", position: "relative", overflowX: "hidden" }}>
      <GlobalStyles />
      <Nav onGo={scrollTo} />

      <div ref={heroRef}>
        <Hero onStart={goToTest} onSample={() => scrollTo("explore")} />
      </div>

      <div ref={howRef}>
        <HowItWorks />
      </div>

      <div ref={testRef}>
        {!completed ? (
          <Quiz answers={answers} setAnswers={setAnswers} step={step} setStep={setStep} onFinish={handleFinish} />
        ) : (
          <div style={{ padding: "70px 24px 20px", textAlign: "center" }}>
            <SectionHeading eyebrow="The Music DNA test" title="Your DNA has been decoded" align="center" />
            <button onClick={handleRestart} className="btn-ghost" style={{ margin: "26px auto 0" }}>
              <RotateCcw size={15} />
              Retake the test
            </button>
          </div>
        )}
      </div>

      {completed && finalScores && (
        <div ref={resultRef} style={{ padding: "20px 24px 40px" }}>
          <ResultView scores={finalScores} onRestart={handleRestart} />
        </div>
      )}

      <div ref={compareRef}>
        <ComparisonSection />
      </div>

      <div ref={exploreRef}>
        <SampleGallery onOpen={setSampleProfile} />
      </div>

      <div ref={aboutRef}>
        <About />
      </div>

      <FinalCTA onGo={goToTest} />

      <footer style={{ padding: "26px 24px 40px", textAlign: "center" }}>
        <span style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, color: "#5E5678" }}>
          Music DNA \u2014 an entertainment concept. Fictional data only.
        </span>
      </footer>

      <SampleModal profile={sampleProfile} onClose={() => setSampleProfile(null)} />
    </div>
  );
}

/* ============================================================
   GLOBAL STYLES
   ============================================================ */

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,500;0,600;1,500&family=Sora:wght@400;500;600;700&display=swap');

      * { box-sizing: border-box; }
      body { margin: 0; }

      .glass-card {
        background: rgba(255,255,255,0.035);
        border: 1px solid rgba(255,255,255,0.09);
        backdrop-filter: blur(10px);
      }

      .hover-lift { transition: transform .25s ease, border-color .25s ease; }
      .hover-lift:hover { transform: translateY(-4px); border-color: rgba(255,255,255,0.22); }

      .quiz-option { transition: background .2s ease, border-color .2s ease, transform .15s ease; }
      .quiz-option:hover { background: rgba(255,255,255,0.07) !important; border-color: rgba(255,255,255,0.28) !important; }
      .quiz-option:active { transform: scale(0.98); }

      .nav-btn { transition: color .2s ease; }
      .nav-btn:hover { color: #F3EFFB !important; }

      .btn-primary {
        display: inline-flex; align-items: center; gap: 8px;
        background: linear-gradient(135deg,#8B7CFF,#FF5C87);
        color: #0B0714; font-family: 'Sora', sans-serif; font-weight: 700; font-size: 14.5px;
        border: none; border-radius: 999px; padding: 14px 26px; cursor: pointer;
        transition: transform .2s ease, box-shadow .2s ease;
        box-shadow: 0 10px 30px rgba(139,124,255,0.28);
      }
      .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 14px 36px rgba(255,92,135,0.32); }
      .btn-primary:active { transform: translateY(0); }
      .btn-primary:disabled { cursor: not-allowed; }

      .btn-ghost {
        display: inline-flex; align-items: center; gap: 8px;
        background: rgba(255,255,255,0.04);
        color: #F0ECFB; font-family: 'Sora', sans-serif; font-weight: 600; font-size: 14.5px;
        border: 1px solid rgba(255,255,255,0.16); border-radius: 999px; padding: 14px 24px; cursor: pointer;
        transition: background .2s ease, border-color .2s ease;
      }
      .btn-ghost:hover { background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.3); }

      .orb {
        position: absolute; border-radius: 50%; filter: blur(70px); pointer-events: none; z-index: 1;
        animation: orbDrift 14s ease-in-out infinite;
      }
      .orb-a { width: 340px; height: 340px; background: rgba(139,124,255,0.28); top: -80px; left: -60px; }
      .orb-b { width: 300px; height: 300px; background: rgba(255,92,135,0.22); bottom: -100px; right: -40px; animation-delay: -4s; }
      .orb-c { width: 220px; height: 220px; background: rgba(51,217,196,0.16); top: 40%; left: 55%; animation-delay: -8s; }
      .orb-d { width: 380px; height: 380px; background: rgba(139,124,255,0.2); top: -120px; left: 50%; transform: translateX(-50%); }

      @keyframes orbDrift {
        0%, 100% { transform: translate(0,0) scale(1); }
        50% { transform: translate(20px,-24px) scale(1.06); }
      }

      @keyframes dnaFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }

      @keyframes waveBar {
        0%, 100% { transform: scaleY(0.6); }
        50% { transform: scaleY(1); }
      }

      .hero-fade-1 { animation: fadeUp .8s cubic-bezier(.16,.8,.3,1) both; }
      .hero-fade-2 { animation: fadeUp .9s cubic-bezier(.16,.8,.3,1) .15s both; }
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(18px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .quiz-card-enter { animation: cardIn .35s cubic-bezier(.16,.8,.3,1) both; }
      @keyframes cardIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @media (max-width: 860px) {
        .hero-grid { grid-template-columns: 1fr !important; }
        .hero-fade-2 { order: -1; }
        .how-grid { grid-template-columns: 1fr !important; }
        .ring-grid { grid-template-columns: repeat(2,1fr) !important; }
        .vibe-grid { grid-template-columns: repeat(2,1fr) !important; }
        .era-hidden-grid { grid-template-columns: 1fr !important; }
        .compare-grid { grid-template-columns: 1fr !important; }
        .gallery-grid { grid-template-columns: repeat(2,1fr) !important; }
        .quiz-options { grid-template-columns: 1fr !important; }
        .nav-links { display: none !important; }
        .menu-toggle { display: flex !important; }
      }

      @media (min-width: 861px) {
        #nav-cta-desktop { display: inline-flex !important; }
      }

      @media (max-width: 520px) {
        .gallery-grid { grid-template-columns: 1fr !important; }
      }

      @media (prefers-reduced-motion: reduce) {
        .orb, .hero-fade-1, .hero-fade-2, .quiz-card-enter { animation: none !important; }
      }

      button:focus-visible {
        outline: 2px solid #8B7CFF;
        outline-offset: 2px;
      }
    `}</style>
  );
}
