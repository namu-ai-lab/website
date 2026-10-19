/* Voice orbs, painted on the GPU. One canvas draws every orb in a scene: each is a disc of slowly flowing,
   marbled colour from its voice's palette (domain-warped noise), lit from the upper left, with a fine grain
   fixed to the orb like the grain of a print. While a voice speaks its colours move faster and its centre
   warms. Where WebGL is missing, a still gradient disc stands in. */

export type OrbDraw = {
  x: number; y: number; r: number;            // centre and radius, in CSS pixels of the canvas
  palette: [string, string, string];           // main, light, deep
  seed: number;                                // where in the noise this voice's colours start
  time: number;                                // this orb's own clock: it runs faster while it speaks
  amp?: number;                                // loudness, 0..1
  alpha?: number;
};

export type OrbRenderer = { size(w: number, h: number): void; draw(orbs: OrbDraw[]): void; destroy(): void };

const VERT = `
attribute vec2 aCorner;
uniform vec2 uView;
uniform vec3 uOrb;
varying vec2 vP;
void main() {
  vP = aCorner * 1.02;
  vec2 px = uOrb.xy + vP * uOrb.z;
  vec2 clip = px / uView * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vP;
uniform vec3 uMain, uLight, uDeep;
uniform float uTime, uSeed, uAmp, uAlpha, uRpx;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = m * p; a *= 0.48; }
  return v;
}
void main() {
  vec2 p = vP;
  float r = length(p);
  float aa = 1.6 / uRpx;
  float edge = 1.0 - smoothstep(1.0 - aa, 1.0, r);
  if (edge <= 0.0) discard;
  float z = sqrt(max(0.0, 1.0 - r * r));
  vec2 q = p * (1.18 - 0.4 * z) * 0.72 + uSeed;   /* magnified in the middle, gathered at the rim: a sphere */
  float t = uTime;
  vec2 w1 = vec2(fbm(q * 0.9 + vec2(0.0, t)), fbm(q * 0.9 + vec2(5.2, -0.8 * t)));
  vec2 w2 = vec2(fbm(q * 1.0 + 1.7 * w1 + vec2(1.7, 9.2) + 0.35 * t), fbm(q * 1.0 + 1.7 * w1 + vec2(8.3, 2.8) - 0.3 * t));
  float n = fbm(q * 0.85 + (1.9 + 0.8 * uAmp) * w2);
  vec3 col = mix(uLight, uMain, smoothstep(0.12, 0.52, n));
  col = mix(col, uDeep, smoothstep(0.48, 0.86, n) * 0.85);
  col = mix(col, uDeep * 0.66, smoothstep(0.6, 0.95, w2.x) * 0.42);
  col = mix(col, uLight, smoothstep(0.55, 0.92, w1.y) * 0.38);
  col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, 1.14);   /* a little more body in the colour */
  vec3 nrm = normalize(vec3(p, z + 0.3));
  float key = clamp(dot(nrm, normalize(vec3(-0.45, 0.55, 0.72))), 0.0, 1.0);
  col *= 0.8 + 0.32 * key;
  col += vec3(1.0, 0.96, 0.9) * pow(key, 7.0) * 0.09;
  col += uAmp * 0.11 * (1.0 - r) * vec3(1.0, 0.86, 0.7);
  col *= 1.0 - 0.14 * smoothstep(1.0 - 3.0 * aa, 1.0, r);   /* a hairline at the rim, as on a printed disc */
  float g = hash(floor(vP * uRpx) + uSeed * 31.0);
  col += (g - 0.5) * 0.1;
  float a = edge * uAlpha;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0) * a, a);
}`;

const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export function createOrbRenderer(canvas: HTMLCanvasElement): OrbRenderer {
  const dpr = Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  const size = (w: number, h: number) => { W = w; H = h; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); };

  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false, alpha: true }) as WebGLRenderingContext | null;
  if (!gl) return fallback(canvas, size, () => [W, H, dpr]);

  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "aCorner"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (n: string) => gl.getUniformLocation(prog, n);
  const U = { view: u("uView"), orb: u("uOrb"), main: u("uMain"), light: u("uLight"), deep: u("uDeep"), time: u("uTime"), seed: u("uSeed"), amp: u("uAmp"), alpha: u("uAlpha"), rpx: u("uRpx") };
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const colours = new Map<string, [number, number, number]>();
  const col = (hex: string) => { let c = colours.get(hex); if (!c) { c = rgb(hex); colours.set(hex, c); } return c; };

  return {
    size,
    draw(orbs) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.view, W, H);
      for (const o of orbs) {
        const a = o.alpha ?? 1;
        if (a < 0.01 || o.r < 1) continue;
        gl.uniform3f(U.orb, o.x, o.y, o.r);
        gl.uniform3fv(U.main, col(o.palette[0])); gl.uniform3fv(U.light, col(o.palette[1])); gl.uniform3fv(U.deep, col(o.palette[2]));
        gl.uniform1f(U.time, o.time); gl.uniform1f(U.seed, o.seed); gl.uniform1f(U.amp, o.amp ?? 0); gl.uniform1f(U.alpha, a); gl.uniform1f(U.rpx, o.r * dpr);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    },
    /* the context belongs to the canvas: let it go only once the canvas has left the page (React may mount the
       same canvas twice in development, and the second mount needs it) */
    destroy() { setTimeout(() => { if (!canvas.isConnected) gl.getExtension("WEBGL_lose_context")?.loseContext(); }, 0); },
  };
}

/* Without WebGL: a still disc, light at the upper left, the deep colour at the lower right. */
function fallback(canvas: HTMLCanvasElement, size: (w: number, h: number) => void, dims: () => [number, number, number]): OrbRenderer {
  const g = canvas.getContext("2d");
  return {
    size,
    draw(orbs) {
      if (!g) return;
      const [W, H, dpr] = dims();
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      for (const o of orbs) {
        const grad = g.createRadialGradient(o.x - o.r * 0.35, o.y - o.r * 0.4, o.r * 0.05, o.x, o.y, o.r);
        grad.addColorStop(0, o.palette[1]); grad.addColorStop(0.55, o.palette[0]); grad.addColorStop(1, o.palette[2]);
        g.globalAlpha = o.alpha ?? 1; g.fillStyle = grad; g.beginPath(); g.arc(o.x, o.y, o.r, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
    },
    destroy() {},
  };
}
