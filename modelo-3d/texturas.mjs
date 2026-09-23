// Texturas procedurais (geradas por codigo, sem imagens externas) e escritor de PNG minimo.
import zlib from 'zlib';

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(tipo, dados) {
  const t = Buffer.from(tipo, 'ascii'), len = Buffer.alloc(4), crc = Buffer.alloc(4);
  len.writeUInt32BE(dados.length); crc.writeUInt32BE(crc32(Buffer.concat([t, dados])));
  return Buffer.concat([len, t, dados, crc]);
}
// px: Uint8Array w*h*canais (3 = RGB, 4 = RGBA)
export function png(w, h, canais, px) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = canais === 4 ? 6 : 2;
  const linhas = Buffer.alloc((w * canais + 1) * h);
  for (let y = 0; y < h; y++) { linhas[y * (w * canais + 1)] = 0; Buffer.from(px.buffer, px.byteOffset + y * w * canais, w * canais).copy(linhas, y * (w * canais + 1) + 1); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(linhas, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

export const hex = (s) => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));

// ---- atlas de cor solido: 256x256, grade 4x4 de amostras de 64 px ----
export function atlasSolido(cores /* lista de '#rrggbb' */) {
  const N = 256, C = 64, px = new Uint8Array(N * N * 3);
  for (let i = 0; i < 16; i++) {
    const [r, g, b] = hex(cores[i] || '#ff00ff');
    const cx = (i % 4) * C, cy = Math.floor(i / 4) * C;
    for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) { const o = ((cy + y) * N + cx + x) * 3; px[o] = r; px[o + 1] = g; px[o + 2] = b; }
  }
  return png(N, N, 3, px);
}

// ---- vinil de tubo: cor + normal + rugosidade, 512x512, grade 4x4 de celulas de 128 px ----
// Cada celula e UM gomo do tubo (u = em volta, v = ao longo). O padrao e uma trama diagonal, periodica na celula.
export function vinilTubo(cores) {
  const N = 512, C = 128, n = 12;
  const alt = (x, y) => { // altura 0..1, periodica em 1 (x,y em 0..1)
    const a = Math.cos(2 * Math.PI * n * (x + y)), b = Math.cos(2 * Math.PI * n * (x - y));
    const trama = 0.5 + 0.25 * (a + b);                 // losangos da trama
    const fio = Math.max(0, Math.cos(2 * Math.PI * n * x * 0.5)) * 0.15; // leve fio longitudinal
    return Math.min(1, trama * 0.85 + fio);
  };
  const cor = new Uint8Array(N * N * 3), nor = new Uint8Array(N * N * 3), rug = new Uint8Array(N * N * 3);
  for (let i = 0; i < 16; i++) {
    const [r, g, b] = hex(cores[i] || '#ff00ff');
    const cx = (i % 4) * C, cy = Math.floor(i / 4) * C;
    for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
      const u = x / C, v = y / C, h = alt(u, v);
      const e = 1 / C, dx = (alt(u + e, v) - alt(u - e, v)) * C * 0.5, dy = (alt(u, v + e) - alt(u, v - e)) * C * 0.5;
      let nx = -dx * 1.2, ny = dy * 1.2, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const o = ((cy + y) * N + cx + x) * 3, k = 0.82 + 0.26 * h; // sulcos um pouco mais escuros
      cor[o] = Math.min(255, r * k); cor[o + 1] = Math.min(255, g * k); cor[o + 2] = Math.min(255, b * k);
      nor[o] = (nx * 0.5 + 0.5) * 255; nor[o + 1] = (ny * 0.5 + 0.5) * 255; nor[o + 2] = (nz * 0.5 + 0.5) * 255;
      rug[o] = 255; rug[o + 1] = 255 * (0.55 + 0.35 * (1 - h)); rug[o + 2] = 0; // G = rugosidade, B = metal
    }
  }
  return { cor: png(N, N, 3, cor), normal: png(N, N, 3, nor), rugosidade: png(N, N, 3, rug) };
}

// ---- rede de losangos: 512x512 RGBA, mascara binaria por corte de alfa (alphaMode MASK) ----
// A textura cobre 1,0 m x 1,0 m: losango de ~12 cm, fio de ~8 mm (aproximado das fotos).
export function redeLosangos() {
  const N = 512, p = 64, w = 4, px = new Uint8Array(N * N * 4);
  const dist = (t) => { const m = ((t % p) + p) % p; return Math.min(m, p - m); };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.min(dist(x + y), dist(x - y)) / Math.SQRT2 * 1.0; // distancia ate a diagonal mais proxima
    const a = Math.max(0, Math.min(1, (w * 0.5 / Math.SQRT2 * 1.4 - d) / 1.2 + 0.5));
    const o = (y * N + x) * 4; px[o] = 17; px[o + 1] = 17; px[o + 2] = 17; px[o + 3] = Math.round(a * 255);
  }
  return png(N, N, 4, px);
}
