"use client";

import { useEffect, useRef, useState } from "react";
import { HOLES } from "@/lib/holes";
import { FaInstagram, FaGithub, FaLinkedin } from "react-icons/fa6";

type Wave = [number, number, number, number]; // kx, ky, amplitude, phase

// Base [amplitude, frequency] pairs. Randomness is applied around these,
// so every terrain keeps a similar steepness and stays playable.
const BASE: [number, number][] = [
  [1.0, 1.3],
  [0.6, 1.7],
  [0.35, 2.5],
  [0.25, 2.8],
  [0.15, 3.8],
];

const makeWaves = (): Wave[] =>
  BASE.map(([amp, freq]): Wave => {
    const f = freq * (0.85 + Math.random() * 0.3);
    const angle = Math.random() * Math.PI * 2;
    return [
      f * Math.cos(angle),
      f * Math.sin(angle),
      amp * (0.8 + Math.random() * 0.4),
      Math.random() * Math.PI * 2,
    ];
  });

const SCALE = 6; // world units across the shorter screen side
const LEVELS = 6; // contour density

// Game tuning
const DEFAULT_RATING = 100; // "standard" slope rating

const slopeFor = (rating: number) => (rating - 55) * (1.3 / 58);
const FRICTION = 1.1; // rolling resistance (per second)
const POWER = 4.5; // shot strength
const MAX_PULL = 200; // max drag distance in px
const CUP_PX = 18; // cup radius in px
const CAPTURE_V = 2.1; // ball must be slower than this to drop in
const SINK_T = 0.28; // seconds for the drop animation

const VERT = `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform vec4 uW[5]; uniform float uScale, uLevels, uK;
out vec4 o;
void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / min(uRes.x, uRes.y) * uScale;
  float h = 0.;
  for (int i = 0; i < 5; i++) h += uW[i].z * sin(dot(uW[i].xy, p) + uW[i].w);
  float f = h * uLevels * uK;
  float w = max(fwidth(f), 1e-4);
  float line  = 1. - clamp(abs(fract(f - .5) - .5) / w, 0., 1.);
  float major = 1. - clamp(abs(fract(f / 5. - .5) - .5) / (w / 5.), 0., 1.);
  vec3 bg = mix(vec3(.02,.05,.035), vec3(.13,.30,.19), smoothstep(-1.7, 1.7, h));
  o = vec4(bg + vec3(.93,.92,.85) * (line * .22 + major * .45), 1.);
}`;

const height = (waves: Wave[], x: number, y: number) =>
  waves.reduce(
    (s, [kx, ky, a, ph]) => s + a * Math.sin(kx * x + ky * y + ph),
    0,
  );

const gradient = (waves: Wave[], x: number, y: number): [number, number] =>
  waves.reduce<[number, number]>(
    (g, [kx, ky, a, ph]) => {
      const c = a * Math.cos(kx * x + ky * y + ph);
      return [g[0] + kx * c, g[1] + ky * c];
    },
    [0, 0],
  );

export default function ContourHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const cupRefs = useRef<(HTMLDivElement | null)[]>([]);
  const openRef = useRef<number | null>(null);
  const respawnRef = useRef<(() => void) | undefined>(undefined);
  const [open, setOpen] = useState<number | null>(null);
  const [done, setDone] = useState<number[]>([]);
  const [strokes, setStrokes] = useState(0);
  const [rating, setRating] = useState(DEFAULT_RATING);
  const slopeRef = useRef(slopeFor(DEFAULT_RATING));
  const regenRef = useRef<(() => void) | null>(null);
  const close = () => {
    openRef.current = null;
    setOpen(null);
    respawnRef.current?.();
  };
  const resetBall = () => respawnRef.current?.();
  const resetCourse = () => {
    regenRef.current?.();
    respawnRef.current?.();
    setDone([]);
    setStrokes(0);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape" && openRef.current !== null) close();
      };
      if (openRef.current !== null) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext("webgl2");
    if (!gl) return;

    let waves = makeWaves();

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uW = gl.getUniformLocation(prog, "uW");
    gl.uniform4fv(uW, waves.flat());

    // Called by "Reset course": new terrain for both the shader and the physics.
    regenRef.current = () => {
      waves = makeWaves();
      gl.uniform4fv(uW, waves.flat());
    };
    gl.uniform1f(gl.getUniformLocation(prog, "uScale"), SCALE);
    gl.uniform1f(gl.getUniformLocation(prog, "uLevels"), LEVELS);
    const uK = gl.getUniformLocation(prog, "uK");

    // Ball state lives in world units (same space as the terrain).
    let px = 0,
      py = 0,
      vx = 0,
      vy = 0,
      scale = 1;
    let sink: { i: number; t: number } | null = null;

    let w = 0,
      h = 0,
      m = 1,
      ww = 1,
      wh = 1;
    const cups = HOLES.map(() => ({ x: 0, y: 0 }));

    const layout = () => {
      ww = (w / m) * SCALE;
      wh = (h / m) * SCALE;
      HOLES.forEach((c, i) => {
        cups[i] = { x: c.fx * ww, y: c.fy * wh };
        const el = cupRefs.current[i];
        if (el)
          el.style.transform = `translate3d(${c.fx * w}px, ${c.fy * h}px, 0)`;
      });
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      m = Math.min(w, h);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      layout();
    };
    const respawn = () => {
      px = 0.5 * ww;
      py = 0.5 * wh;
      vx = vy = 0;
      scale = 1;
      sink = null;
    };
    respawnRef.current = respawn;
    resize();
    respawn();
    window.addEventListener("resize", resize);

    // Click, drag backwards, release: golf-style shot.
    let aim: { sx: number; sy: number; cx: number; cy: number } | null = null;
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("[data-ui]")) return;
      if (openRef.current !== null || sink) return;
      if (Math.hypot(vx, vy) > 0.25) return; // wait for the ball to stop
      aim = { sx: e.clientX, sy: e.clientY, cx: e.clientX, cy: e.clientY };
    };
    const onMove = (e: PointerEvent) => {
      if (aim) {
        aim.cx = e.clientX;
        aim.cy = e.clientY;
      }
    };
    const onUp = () => {
      if (!aim) return;
      const dx = aim.sx - aim.cx,
        dy = aim.sy - aim.cy;
      aim = null;
      const len = Math.hypot(dx, dy);
      if (len < 8) return;
      const k = Math.min(len, MAX_PULL) / len;
      vx = ((dx * k) / m) * SCALE * POWER;
      vy = ((dy * k) / m) * SCALE * POWER;
      setStrokes((n) => n + 1);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const R = ((CUP_PX * 0.85) / m) * SCALE;

      if (openRef.current === null) {
        if (sink) {
          sink.t += dt;
          const c = cups[sink.i];
          if (c) {
            px += (c.x - px) * Math.min(1, dt * 18);
            py += (c.y - py) * Math.min(1, dt * 18);
          }
          scale = Math.max(0, 1 - sink.t / SINK_T);
          if (sink.t >= SINK_T) {
            const i = sink.i;
            sink = null;
            openRef.current = i;
            setOpen(i);
            setDone((d) => (d.includes(i) ? d : [...d, i]));
          }
        } else {
          const [gx, gy] = gradient(waves, px, py);
          let ax = -gx * slopeRef.current,
            ay = -gy * slopeRef.current;
          cups.forEach((c) => {
            const dx = c.x - px,
              dy = c.y - py;
            if (Math.hypot(dx, dy) < R * 3) {
              ax += dx * 8;
              ay += dy * 8;
            }
          });
          const speed = Math.hypot(vx, vy);
          vx += ax * dt;
          vy += ay * dt;
          const damp = Math.exp(-FRICTION * dt);
          vx *= damp;
          vy *= damp;
          if (speed < 0.06 && Math.hypot(ax, ay) < 0.5) vx = vy = 0; // rest
          px += vx * dt;
          py += vy * dt;

          const r = (7 / m) * SCALE; // ball radius in world units (the ball is 14px wide)
          if (px < r) {
            px = r;
            vx = Math.abs(vx) * 0.5;
          }
          if (px > ww - r) {
            px = ww - r;
            vx = -Math.abs(vx) * 0.5;
          }
          if (py < r) {
            py = r;
            vy = Math.abs(vy) * 0.5;
          }
          if (py > wh - r) {
            py = wh - r;
            vy = -Math.abs(vy) * 0.5;
          }

          if (Math.hypot(vx, vy) < CAPTURE_V) {
            cups.forEach((c, i) => {
              if (!sink && Math.hypot(c.x - px, c.y - py) < R)
                sink = { i, t: 0 };
            });
          }
        }
      }

      const k = Math.max(0.05, slopeRef.current / 1.3);
      gl.uniform1f(uK, k);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      const sx = (px / SCALE) * m,
        sy = (py / SCALE) * m;
      ballRef.current!.style.transform = `translate3d(${sx}px, ${sy}px, 0) scale(${scale})`;
      const elev = height(waves, px, py);
      hudRef.current!.textContent = `x ${px.toFixed(2)}  y ${py.toFixed(2)}  z ${elev >= 0 ? "+" : ""}${elev.toFixed(2)}`;

      const line = lineRef.current!;
      if (aim) {
        const dx = aim.sx - aim.cx,
          dy = aim.sy - aim.cy;
        const len = Math.hypot(dx, dy) || 1;
        const k = Math.min(len, MAX_PULL) / len;
        line.setAttribute("x1", String(sx));
        line.setAttribute("y1", String(sy));
        line.setAttribute("x2", String(sx + dx * k));
        line.setAttribute("y2", String(sy + dy * k));
        line.setAttribute("visibility", "visible");
      } else {
        line.setAttribute("visibility", "hidden");
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const hole = open !== null ? HOLES[open] : null;

  // Handicap differential: (score - par played) * 113 / slope rating.
  // Only meaningful once at least one hole has been sunk.
  const parPlayed = done.reduce((sum, i) => sum + (HOLES[i]?.par ?? 0), 0);
  const handicap =
    done.length > 0 ? ((strokes - parPlayed) * 113) / rating : null;
  const handicapLabel =
    handicap === null
      ? "—"
      : handicap < 0
        ? `+${Math.abs(handicap).toFixed(1)}`
        : handicap.toFixed(1);

  return (
    <div
      className="absolute inset-0 select-none overflow-hidden bg-[#08120d]"
      style={{ touchAction: "none" }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />

      {HOLES.map((c, i) => (
        <div
          key={c.label}
          ref={(el) => {
            cupRefs.current[i] = el;
          }}
          className="group pointer-events-none absolute left-0 top-0"
        >
          {/* the cup */}
          <div
            onClick={() => setOpen(i)}
            className={`pointer-events-auto -ml-[18px] -mt-[18px] h-9 w-9 cursor-pointer rounded-full border bg-black/80 shadow-[inset_0_2px_8px_rgba(0,0,0,.9)] transition-all duration-200 group-hover:border-[#ff6a1a] ${
              done.includes(i)
                ? "border-2 border-[#ff6a1a]"
                : "border-[#ece9d8]/40"
            }`}
          />

          {/* flagstick */}
          <div className="absolute left-0 top-0 -mt-[44px] h-[44px] w-[1px] bg-[#ece9d8]/80 transition-transform duration-[120ms] group-hover:-translate-y-2" />

          {/* pennant */}
          <div
            className="flag-wave absolute left-px top-0 -mt-[44px] transition-transform duration-[120ms] group-hover:-translate-y-2"
            style={{
              width: 0,
              height: 0,
              borderTop: "8px solid transparent",
              borderBottom: "8px solid transparent",
              borderLeft: "16px solid #ff6a1a",
              transformOrigin: "left center",
            }}
          />

          {/* the label */}
          <span
            onClick={() => setOpen(i)}
            className={`pointer-events-auto absolute left-0 top-0 mt-[26px] -translate-x-1/2 cursor-pointer whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.25em] transition-colors duration-200 sm:text-[16px] ${
              done.includes(i)
                ? "text-[#ff6a1a]"
                : "text-[#ece9d8]/60 group-hover:text-[#ff6a1a]"
            }`}
          >
            {String(c.number).padStart(2, "0")} {c.label}
            {done.includes(i) ? " ✓" : ""}
          </span>
        </div>
      ))}

      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        <line
          ref={lineRef}
          stroke="#ff6a1a"
          strokeWidth="2"
          strokeDasharray="2 8"
          strokeLinecap="round"
          visibility="hidden"
        />
      </svg>

      <div
        ref={ballRef}
        className="pointer-events-none absolute left-0 top-0 -ml-[7px] -mt-[7px] h-[14px] w-[14px] rounded-full"
        style={{
          background: "#ff6a1a",
          boxShadow: "0 0 24px 6px rgba(255,106,26,.55)",
        }}
      />

      <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap font-mono text-[11px] tracking-[0.12em] text-[#ece9d8]/60 sm:text-[14px] sm:tracking-[0.25em]">
        Strokes {strokes} · Holes {done.length}/{HOLES.length}
      </div>
      <div
        ref={hudRef}
        className="hidden sm:block pointer-events-none absolute top-6 left-6 font-mono text-xs tracking-wider text-[#ece9d8]/60"
      />
      <div className="hidden sm:block pointer-events-none absolute right-6 top-6 text-right font-mono text-[16px] uppercase tracking-[0.25em] text-[#ece9d8]/60">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="pointer-events-auto relative text-[#ece9d8]/60 transition-colors hover:text-[#ff6a1a] focus:text-[#ff6a1a]"
            title="Handicap score is calculated using the slope rating and assumes all holes are par 2."
            aria-label="Handicap calculation information"
          >
            Handicap Score ⓘ
          </button>
        </div>

        <div className="mt-1 text-4xl tracking-normal text-[#ff6a1a]">
          {handicapLabel}
        </div>

        {handicap !== null && (
          <div className="mt-1 text-[12px] tracking-[0.2em] text-[#ece9d8]/40">
            ({strokes} − {parPlayed}) × 113 / {rating}
          </div>
        )}
      </div>
      <div
        data-ui
        className="absolute left-1/2 top-14 flex -translate-x-1/2 flex-col items-center gap-3 font-mono text-[14px] uppercase tracking-[0.25em]"
      >
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={resetBall}
            className="whitespace-nowrap border border-[#ece9d8]/30 px-3 py-1 text-[11px] text-[#ece9d8]/70 transition-all hover:border-[#ff6a1a] hover:text-[#ff6a1a] sm:px-3 sm:py-1.5 sm:text-base duration-150 hover:scale-105"
          >
            Reset Ball
          </button>
          <button
            onClick={resetCourse}
            className="whitespace-nowrap border border-[#ece9d8]/30 px-3 py-1 text-[11px] text-[#ece9d8]/70 transition-all hover:border-[#ff6a1a] hover:text-[#ff6a1a] sm:px-3 sm:py-1.5 sm:text-base duration-150 hover:scale-105"
          >
            New Course
          </button>
        </div>

        <div className="flex w-full items-center gap-2 whitespace-nowrap text-[11px] text-[#ece9d8]/60 sm:gap-3 sm:text-base transition-all duration-200 hover:scale-105">
          <label htmlFor="slope" className="shrink-0">
            Slope rating
          </label>
          <input
            id="slope"
            type="range"
            min={55}
            max={155}
            step={1}
            value={rating}
            onChange={(e) => {
              const v = Number(e.target.value);
              setRating(v);
              slopeRef.current = slopeFor(v);
            }}
            className="h-1 min-w-0 flex-1 cursor-pointer accent-[#ff6a1a] sm:flex-none sm:w-32"
          />
          <span className="w-6 shrink-0 text-right sm:w-8">{rating}</span>
        </div>
      </div>

      {hole && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 backdrop-blur-sm sm:p-4"
          onClick={close}
        >
          <div
            className={`flex flex-col overflow-hidden border border-[#ece9d8]/20 bg-[#0b1a12] text-[#ece9d8] ${
              hole.type === "resume"
                ? "h-[96dvh] w-full max-w-7xl sm:h-[92dvh] sm:w-[95vw]"
                : "h-auto max-h-[80dvh] w-[90vw] max-w-[560px]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[#ece9d8]/15 p-4 sm:px-6 sm:py-4">
              <button
                onClick={close}
                className="shrink-0 font-mono text-sm uppercase tracking-[0.2em] text-[#ece9d8] transition-colors duration-100 hover:text-[#ff6a1a]"
              >
                ← Back to course
              </button>

              <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#ff6a1a]">
                <span className="block sm:inline">
                  Hole # {String(hole.number).padStart(2, "0")}
                </span>
                <span className="hidden sm:inline"> · </span>
                <span className="block sm:inline">Par {hole.par}</span>
                <span className="hidden sm:inline"> · </span>
                <span className="block sm:inline">{hole.yards} yds</span>
              </p>
            </div>

            {/* Main content */}
            {hole.type === "resume" ? (
              <div className="min-h-0 flex-1 bg-[#252525]">
                <iframe
                  src="/portfolio-resume.pdf#zoom=page-fit"
                  title="Dylan D'Eloia Resume"
                  className="h-full w-full border-0 bg-white"
                />
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-6 md:p-10">
                <h2 className="mt-0 font-serif text-4xl font-light md:text-5xl">
                  {hole.title}
                </h2>

                <p className="mt-4 text-[#ece9d8]/70">{hole.body}</p>

                {hole.type === "fast" && (
                  <>
                    <div className="mt-8">
                      <h3 className="font-mono text-sm uppercase tracking-[0.2em] text-[#ff6a1a]">
                        Experience
                      </h3>
                      <ul className="mt-4 space-y-3 font-mono text-sm text-[#ece9d8]/85">
                        {(hole.items ?? []).map((item) => (
                          <li
                            key={item}
                            className="border-l border-[#ff6a1a]/60 pl-4"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {hole.type === "contact" && (
                  <div className="mt-8 w-full">
                    <p className="mb-6 w-full text-center font-mono text-xs uppercase tracking-[0.25em] text-[#ece9d8]/50">
                      Find me online
                    </p>

                    <div className="flex items-center justify-center gap-8">
                      <a
                        href="https://github.com/dylandeloia1"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="GitHub"
                        className="text-[#ece9d8]/70 transition-colors hover:text-[#ff6a1a]"
                      >
                        <FaGithub size={28} />
                      </a>

                      <a
                        href="https://www.linkedin.com/in/dylandeloia/"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="LinkedIn"
                        className="text-[#ece9d8]/70 transition-colors hover:text-[#ff6a1a]"
                      >
                        <FaLinkedin size={28} />
                      </a>

                      <a
                        href="https://www.instagram.com/__dylanbrian/"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Instagram"
                        className="text-[#ece9d8]/70 transition-colors hover:text-[#ff6a1a]"
                      >
                        <FaInstagram size={28} />
                      </a>
                    </div>
                  </div>
                )}

                {hole.type === "about" && (
                  <>
                    {/* Graduation photo */}
                    <div className="mt-6 w-full overflow-hidden border border-[#ece9d8]/20 bg-[#ece9d8]/5">
                      <div className="relative aspect-[4/5] w-full max-h-[480px]">
                        <img
                          src="/mom-dad-graduation-day-4-5.jpeg"
                          alt="Mom and Dad"
                          className="absolute inset-0 h-full w-full object-cover object-center"
                        />
                      </div>
                    </div>

                    <ul className="mt-8 space-y-3 font-mono text-sm text-[#ece9d8]/85">
                      {(hole.items ?? []).map((item) => (
                        <li
                          key={item}
                          className="border-l border-[#ff6a1a]/60 pl-4"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
