/* Voice orbs, painted on the GPU. One canvas draws every orb in a scene: each is a disc of slowly flowing
   colour from its voice's palette, stirred like paint in a bowl (domain-warped simplex noise turning in a
   slow vortex), lit from the upper left, with a fine grain fixed to the orb like the grain of a print. The
   orb in focus is fuller in colour than the ones beside it; while a voice speaks its colours move faster and
   its centre warms. Where WebGL is missing, a still gradient disc stands in. */

export type OrbDraw = {
  x: number; y: number; r: number;            // centre and radius, in CSS pixels of the canvas
  palette: readonly string[];                  // main, light, deep, and an accent of another hue
  seed: number;                                // where in the noise this voice's colours start
  time: number;                                // this orb's own clock: it runs faster in focus and while it speaks
  amp?: number;                                // loudness, 0..1
  focus?: number;                              // 1 in the middle of the reel, 0 off to the side
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
uniform vec3 uMain, uLight, uDeep, uAccent;
uniform float uTime, uSeed, uAmp, uAlpha, uRpx, uFocus;

/* 2D simplex noise by Ian McEwan and Stefan Gustavson (Ashima Arts), MIT licence. It is built on a
   permutation polynomial rather than a sine hash, so it paints the same smooth field on every GPU. */
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 10.0) * x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 2; i++) { v += a * snoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 7.3; a *= 0.45; }
  return 0.5 + 0.5 * v / 0.725;
}
/* film grain: "hash without sine" by Dave Hoskins, MIT licence */
float grain(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

void main() {
  vec2 p = vP;
  float r = length(p);
  float aa = 1.6 / uRpx;
  float edge = 1.0 - smoothstep(1.0 - aa, 1.0, r);
  if (edge <= 0.0) discard;
  float z = sqrt(max(0.0, 1.0 - r * r));
  float t = uTime;
  /* a slow vortex: the middle turns further than the rim, more so while the voice speaks */
  float ang = 0.45 * sin(t * 1.1 + uSeed) + (1.0 - r) * (0.7 + 0.7 * uAmp) * sin(t * 0.8 + 1.3);
  float ca = cos(ang), sa = sin(ang);
  vec2 q = mat2(ca, sa, -sa, ca) * (p * (1.16 - 0.36 * z)) * 0.5 + vec2(uSeed, uSeed * 0.37);
  vec2 w = vec2(fbm(q * 0.8 + vec2(0.0, 0.6 * t)), fbm(q * 0.8 + vec2(5.2, -0.5 * t)));
  float n = fbm(q * 0.75 + (1.0 + 0.8 * uAmp) * w + 0.1 * t);
  float m = fbm(q * 0.9 - 0.8 * w + vec2(3.7, 1.1) - 0.08 * t);
  /* a few large, soft blooms rather than veins: wide blends between the four colours */
  vec3 col = mix(uLight, uMain, smoothstep(0.12, 0.64, n));
  col = mix(col, uDeep, smoothstep(0.58, 0.95, n) * 0.75);
  col = mix(col, uAccent, smoothstep(0.52, 0.9, m) * 0.6);
  col = mix(col, uLight, smoothstep(0.6, 0.95, w.y) * 0.3);
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, 0.84 + 0.3 * uFocus);
  vec3 nrm = normalize(vec3(p, z + 0.3));
  float key = clamp(dot(nrm, normalize(vec3(-0.45, 0.55, 0.72))), 0.0, 1.0);
  col *= 0.82 + 0.28 * key;
  col += vec3(1.0, 0.97, 0.92) * pow(key, 8.0) * 0.1;
  col += uAmp * 0.12 * (1.0 - r) * vec3(1.0, 0.86, 0.72);
  col *= 1.0 - 0.12 * smoothstep(1.0 - 3.0 * aa, 1.0, r);   /* a hairline at the rim, as on a printed disc */
  col += (grain(floor(vP * uRpx) + uSeed * 31.0) - 0.5) * 0.075;
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
  const U = { view: u("uView"), orb: u("uOrb"), main: u("uMain"), light: u("uLight"), deep: u("uDeep"), accent: u("uAccent"), time: u("uTime"), seed: u("uSeed"), amp: u("uAmp"), focus: u("uFocus"), alpha: u("uAlpha"), rpx: u("uRpx") };
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
        gl.uniform3fv(U.main, col(o.palette[0])); gl.uniform3fv(U.light, col(o.palette[1])); gl.uniform3fv(U.deep, col(o.palette[2])); gl.uniform3fv(U.accent, col(o.palette[3] ?? o.palette[0]));
        gl.uniform1f(U.time, o.time); gl.uniform1f(U.seed, o.seed); gl.uniform1f(U.amp, o.amp ?? 0); gl.uniform1f(U.focus, o.focus ?? 1); gl.uniform1f(U.alpha, a); gl.uniform1f(U.rpx, o.r * dpr);
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
        grad.addColorStop(0, o.palette[1]); grad.addColorStop(0.5, o.palette[0]); grad.addColorStop(0.8, o.palette[3] ?? o.palette[0]); grad.addColorStop(1, o.palette[2]);
        g.globalAlpha = o.alpha ?? 1; g.fillStyle = grad; g.beginPath(); g.arc(o.x, o.y, o.r, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
    },
    destroy() {},
  };
}
