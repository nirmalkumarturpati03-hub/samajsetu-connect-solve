import { useEffect, useRef } from "react";

type Particle = {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
  color: string;
};

const COLORS = ["11, 93, 42", "22, 138, 69", "89, 171, 113", "188, 225, 199"];

/** A decorative, pointer-transparent canvas that listens on its hero parent. */
export function CursorParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const touchPrimary = window.matchMedia("(hover: none), (pointer: coarse)");
    let width = 1;
    let height = 1;
    let frame = 0;
    let particles: Particle[] = [];
    let reduced = reduceMotion.matches;
    let touch = touchPrimary.matches;
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0, active: false, speed: 0 };

    const makeParticles = () => {
      const count = reduced ? 28 : touch ? 58 : Math.min(260, Math.max(135, Math.floor((width * height) / 4000)));
      particles = Array.from({ length: count }, () => {
        // The resting field is quieter on the copy side, but fills the entire
        // hero as soon as the cursor draws the vortex through it.
        const baseX = width * (0.08 + Math.pow(Math.random(), 0.72) * 0.88);
        const baseY = height * (0.04 + Math.random() * 0.92);
        return {
          baseX,
          baseY,
          x: baseX,
          y: baseY,
          vx: 0,
          vy: 0,
          size: 0.5 + Math.random() * 1.15,
          alpha: 0.14 + Math.random() * 0.32,
          phase: Math.random() * Math.PI * 2,
          color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? "22, 138, 69",
        };
      });
      mouse.x = mouse.targetX = width * 0.72;
      mouse.y = mouse.targetY = height * 0.5;
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      makeParticles();
    };

    const move = (event: PointerEvent) => {
      if (touch || reduced) return;
      const rect = host.getBoundingClientRect();
      const nextX = event.clientX - rect.left;
      const nextY = event.clientY - rect.top;
      mouse.speed = Math.min(40, Math.hypot(nextX - mouse.targetX, nextY - mouse.targetY));
      mouse.targetX = nextX;
      mouse.targetY = nextY;
      mouse.active = true;
    };
    const leave = () => { mouse.active = false; };
    const motionChange = () => { reduced = reduceMotion.matches; touch = touchPrimary.matches; makeParticles(); };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      mouse.x += (mouse.targetX - mouse.x) * 0.11;
      mouse.y += (mouse.targetY - mouse.y) * 0.11;
      mouse.speed *= 0.9;

      for (const particle of particles) {
        const ambientX = Math.sin(time * 0.00032 + particle.phase) * (reduced ? 0.3 : 1.4);
        const ambientY = Math.cos(time * 0.00027 + particle.phase) * (reduced ? 0.25 : 1.1);
        let forceX = 0;
        let forceY = 0;
        if (mouse.active && !reduced && !touch) {
          const dx = particle.x - mouse.x;
          const dy = particle.y - mouse.y;
          const distance = Math.max(18, Math.hypot(dx, dy));
          const influence = Math.max(0, 1 - distance / 340) ** 1.35;
          // Tangential pull makes the visible spiral. A small inward component
          // gathers nearby dots into a focused, cursor-following vortex.
          const strength = influence * (1.65 + mouse.speed * 0.07);
          forceX = (-dy / distance) * strength - (dx / distance) * strength * 0.27;
          forceY = (dx / distance) * strength - (dy / distance) * strength * 0.27;
        }
        particle.vx += (particle.baseX + ambientX - particle.x) * 0.011 + forceX;
        particle.vy += (particle.baseY + ambientY - particle.y) * 0.011 + forceY;
        particle.vx *= 0.9;
        particle.vy *= 0.9;
        const velocity = Math.hypot(particle.vx, particle.vy);
        if (velocity > 5.2) {
          particle.vx = (particle.vx / velocity) * 5.2;
          particle.vy = (particle.vy / velocity) * 5.2;
        }
        particle.x += particle.vx;
        particle.y += particle.vy;
        context.beginPath();
        context.fillStyle = `rgba(${particle.color}, ${particle.alpha})`;
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      }
      if (mouse.active && !reduced && !touch) {
        const glow = context.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 145);
        glow.addColorStop(0, "rgba(22, 138, 69, 0.13)");
        glow.addColorStop(0.22, "rgba(89, 171, 113, 0.055)");
        glow.addColorStop(0.48, "rgba(89, 171, 113, 0.025)");
        glow.addColorStop(1, "rgba(89, 171, 113, 0)");
        context.fillStyle = glow;
        context.beginPath();
        context.arc(mouse.x, mouse.y, 145, 0, Math.PI * 2);
        context.fill();
      }
      frame = window.requestAnimationFrame(draw);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    host.addEventListener("pointermove", move, { passive: true });
    host.addEventListener("pointerleave", leave, { passive: true });
    reduceMotion.addEventListener("change", motionChange);
    touchPrimary.addEventListener("change", motionChange);
    resize();
    frame = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
      reduceMotion.removeEventListener("change", motionChange);
      touchPrimary.removeEventListener("change", motionChange);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0" />;
}
