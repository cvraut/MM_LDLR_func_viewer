/**
 * src/render/canvas.ts
 * ----------------------------------------------------------------------------
 * Small canvas utilities shared by all renderers:
 *   - sizeCanvas: crisp drawing on high-DPI screens
 *   - rich labels: "log_{2}FC" / "x^{2}" sub- and superscripts for axis titles
 *   - cssVar: read theme colors from src/styles/theme.css
 */

/** Resize a canvas to CSS size w×h and return a context scaled for devicePixelRatio. */
export function sizeCanvas(canvas: HTMLCanvasElement, w: number, h: number): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;
  const pw = Math.max(1, Math.round(w * dpr));
  const ph = Math.max(1, Math.round(h * dpr));
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return ctx;
}

const varCache = new Map<string, string>();
/** Read a CSS custom property from :root (cached; call clearCssVarCache after theme changes). */
export function cssVar(name: string): string {
  let v = varCache.get(name);
  if (v === undefined) {
    v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    varCache.set(name, v);
  }
  return v;
}
export const clearCssVarCache = () => varCache.clear();

/** Resolve "var(--ink)" style colors for canvas, which can't read CSS variables. */
export function resolveColor(color: string): string {
  const m = /^var\((--[\w-]+)\)$/.exec(color.trim());
  return m ? cssVar(m[1]) : color;
}

export function font(px: number, weight = 400): string {
  return `${weight} ${px}px ${cssVar('--font-sans') || 'Helvetica, Arial, sans-serif'}`;
}

export interface RichSegment {
  text: string;
  shift: 0 | -1 | 1; // -1 subscript, 1 superscript
}

/** "log_{2}FC" → [log][2 sub][FC]; "-log_{10} p" uses a real minus sign. */
export function parseRichLabel(label: string): RichSegment[] {
  const segs: RichSegment[] = [];
  const re = /([_^])\{([^}]*)\}|([_^])(\S)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const clean = (s: string) => s.replace(/(^|\s)-/g, '$1\u2212');
  while ((m = re.exec(label))) {
    if (m.index > last) segs.push({ text: clean(label.slice(last, m.index)), shift: 0 });
    const kind = m[1] ?? m[3];
    segs.push({ text: m[2] ?? m[4], shift: kind === '_' ? -1 : 1 });
    last = re.lastIndex;
  }
  if (last < label.length) segs.push({ text: clean(label.slice(last)), shift: 0 });
  return segs;
}

/** Width of a rich label at a given font size. */
export function measureRich(ctx: CanvasRenderingContext2D, segs: RichSegment[], size: number): number {
  let w = 0;
  for (const s of segs) {
    ctx.font = font(s.shift ? size * 0.72 : size);
    w += ctx.measureText(s.text).width;
  }
  return w;
}

/** Draw a rich label starting at (x, baseline y). */
export function drawRich(ctx: CanvasRenderingContext2D, segs: RichSegment[], x: number, y: number, size: number): void {
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  for (const s of segs) {
    const fs = s.shift ? size * 0.72 : size;
    ctx.font = font(fs);
    ctx.fillText(s.text, x, y + (s.shift === -1 ? size * 0.28 : s.shift === 1 ? -size * 0.4 : 0));
    x += ctx.measureText(s.text).width;
  }
}
