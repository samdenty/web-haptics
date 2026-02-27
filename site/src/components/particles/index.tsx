import styles from "./styles.module.scss";

import React, {
  createContext,
  useContext,
  useRef,
  useCallback,
  useEffect,
} from "react";

type ParticlesContextValue = {
  create: (x: number, y: number, emojis: string[], duration?: number) => void;
};

interface Particle {
  x: number;
  y: number;
  xv: number;
  yv: number;
  a: number;
  s: number;
  opacity: number;
  life: number;
  maxLife: number;
  emoji: string;
  fontSize: number;
  radius: number;
}

const ParticlesContext = createContext<ParticlesContextValue | null>(null);

export const useParticles = () => {
  const ctx = useContext(ParticlesContext);
  if (!ctx) {
    throw new Error("useParticles must be used within a ParticlesProvider");
  }
  return ctx;
};

const MAX_ACTIVE = 2000;
const ANIM_FRAMES = 120;

// --- Emoji cache ---

const emojiCache = new Map<string, HTMLCanvasElement>();

function getEmojiCanvas(emoji: string): HTMLCanvasElement {
  const existing = emojiCache.get(emoji);
  if (existing) return existing;

  const dpr = window.devicePixelRatio || 1;
  const CANONICAL_PX = 64;
  const fontSize = Math.ceil(CANONICAL_PX * dpr);
  // Pad canvas so glyphs that overflow the em-square aren't clipped
  const size = Math.ceil(fontSize * 1.5);

  const offscreen = document.createElement("canvas");
  offscreen.width = size;
  offscreen.height = size;

  const ctx = offscreen.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${fontSize}px serif`;
  ctx.fillText(emoji, size / 2, size / 2);

  emojiCache.set(emoji, offscreen);
  return offscreen;
}

// --- Physics ---

function updateParticle(p: Particle): boolean {
  p.a += p.xv * 0.5;
  p.yv *= 0.9;
  p.y += p.yv;
  p.xv *= 0.98;
  p.x += p.xv;
  p.s += (1 - p.s) * 0.3;
  p.yv += (-1.5 + p.yv) * 0.1;

  p.radius = p.fontSize * p.s * 0.5;

  p.life--;
  const lifeRatio = p.life / p.maxLife;
  if (lifeRatio < 0.25) {
    p.opacity = lifeRatio / 0.25;
  }

  return p.life > 0 && p.opacity > 0.01;
}

function resolveCollisions(particles: Particle[]) {
  const n = particles.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = particles[i];
      const b = particles[j];

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distSq = dx * dx + dy * dy;
      const minDist = a.radius + b.radius;

      if (distSq < minDist * minDist && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;

        // Push apart
        const overlap = minDist - dist;
        const sep = overlap * 0.5;
        a.x -= nx * sep;
        a.y -= ny * sep;
        b.x += nx * sep;
        b.y += ny * sep;

        // Elastic velocity exchange along normal
        const dvx = a.xv - b.xv;
        const dvy = a.yv - b.yv;
        const dvDotN = dvx * nx + dvy * ny;

        if (dvDotN > 0) {
          const restitution = 0.5;
          const impulse = dvDotN * restitution;
          a.xv -= impulse * nx;
          a.yv -= impulse * ny;
          b.xv += impulse * nx;
          b.yv += impulse * ny;
        }
      }
    }
  }
}

// --- Canvas sizing ---

function resizeCanvas(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const targetW = Math.round(width * dpr);
  const targetH = Math.round(height * dpr);

  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }
}

// --- Spawning ---

function spawnBurst(
  particles: Particle[],
  x: number,
  y: number,
  emojis: string[],
) {
  const amount = 4;
  if (particles.length + amount > MAX_ACTIVE) return;

  for (let i = 0; i < amount; i++) {
    const xv = Math.random() * 16 - 8;
    const yv =
      (i === 0 ? 4 : i === 1 ? 8 : i === 2 ? 8 : 0) *
      (0.25 + Math.random() * 0.25);

    particles.push({
      x,
      y,
      xv,
      yv,
      a: 0,
      s: 0.2,
      opacity: 1,
      life: ANIM_FRAMES,
      maxLife: ANIM_FRAMES,
      emoji: emojis[Math.floor(Math.random() * emojis.length)] || "\u2728",
      fontSize: 20 + Math.ceil(Math.random() * 40),
      radius: 0,
    });
  }
}

// --- Component ---

export const ParticlesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Non-null assertion safe: we checked above and canvas doesn't change
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    resizeCanvas(canvas);

    const onResize = () => resizeCanvas(canvas);
    window.addEventListener("resize", onResize);

    let rafId: number;

    function frame() {
      rafId = requestAnimationFrame(frame);

      const dpr = window.devicePixelRatio || 1;
      const particles = particlesRef.current;

      // Update physics, cull dead particles (swap-and-pop)
      for (let i = particles.length - 1; i >= 0; i--) {
        if (!updateParticle(particles[i])) {
          particles[i] = particles[particles.length - 1];
          particles.pop();
        }
      }

      resolveCollisions(particles);

      // Clear
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Draw
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const emojiImg = getEmojiCanvas(p.emoji);
        // 1.5 matches the padding factor in getEmojiCanvas
        const drawSize = p.fontSize * p.s * 1.5;

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.a * Math.PI) / 180);
        ctx.drawImage(
          emojiImg,
          -drawSize / 2,
          -drawSize / 2,
          drawSize,
          drawSize,
        );
        ctx.restore();
      }
    }

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const create = useCallback(
    (
      x: number,
      y: number,
      emojis: string[] = ["\u2728", "\uD83D\uDD25"],
      duration?: number,
    ) => {
      const particles = particlesRef.current;
      spawnBurst(particles, x, y, emojis);

      if (duration && duration > 0) {
        const interval = 150;
        const count = Math.floor(duration / interval);
        for (let i = 1; i <= count; i++) {
          setTimeout(() => spawnBurst(particles, x, y, emojis), i * interval);
        }
      }
    },
    [],
  );

  return (
    <ParticlesContext.Provider value={{ create }}>
      {children}
      <canvas ref={canvasRef} className={styles.particles} />
    </ParticlesContext.Provider>
  );
};
