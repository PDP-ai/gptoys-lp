// Texturas procedurais (geradas por código, sem imagens externas) e um escritor de PNG mínimo.
// Nada aqui depende de navegador: roda no Node (usa só o zlib).
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

// ---- atlas de cor sólida: 256 x 256, grade 8 x 8 de amostras de 32 px (até 64 cores) ----
// Cada peça aponta o UV para o centro da amostra da sua cor (UV constante por face: sem mistura de cores no mipmap).
export const ATLAS_N = 8;
export function atlasSolido(cores /* lista de '#rrggbb' */) {
  if (cores.length > ATLAS_N * ATLAS_N) throw new Error(`atlas comporta ${ATLAS_N * ATLAS_N} cores`);
  const N = 256, C = N / ATLAS_N, px = new Uint8Array(N * N * 3);
  for (let i = 0; i < ATLAS_N * ATLAS_N; i++) {
    const [r, g, b] = hex(cores[i] || '#808080');
    const cx = (i % ATLAS_N) * C, cy = Math.floor(i / ATLAS_N) * C;
    for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) { const o = ((cy + y) * N + cx + x) * 3; px[o] = r; px[o + 1] = g; px[o + 2] = b; }
  }
  return png(N, N, 3, px);
}

// ---- isotubo (espuma colorida): cor + relevo (normal) + rugosidade, 512 x 512, grade 4 x 4 de células de 128 px ----
// Cada célula é UM gomo do tubo (u = em volta, v = ao longo). Relevo de espuma suave, periódico na célula.
// O relevo já vem "assado" na intensidade final: o glTF usa escala 1 e o USDZ (iPhone) não aceita escala de normal,
// então os dois mostram o mesmo relevo.
export const VINIL_N = 4;
export function isotuboTexturas(cores, relevo = 0.55) {
  if (cores.length > VINIL_N * VINIL_N) throw new Error(`isotubo comporta ${VINIL_N * VINIL_N} cores`);
  const N = 512, C = N / VINIL_N;
  // ruído periódico: soma de ondas com frequências inteiras (repete exatamente na borda da célula)
  const ondas = [[19, 7, 0.9, 0.3], [11, 23, 0.7, 1.7], [29, 13, 0.5, 2.9], [37, 5, 0.35, 4.1], [9, 41, 0.3, 5.3], [47, 31, 0.2, 0.7]];
  const soma = ondas.reduce((s, o) => s + o[2], 0);
  const alt = (x, y) => { let h = 0; for (const [m, n, a, f] of ondas) h += a * Math.cos(2 * Math.PI * (m * x + n * y) + f); return 0.5 + 0.5 * h / soma; };
  const cor = new Uint8Array(N * N * 3), nor = new Uint8Array(N * N * 3), rug = new Uint8Array(N * N * 3);
  // inclinação máxima do relevo = 'relevo' (0,18 = ~10 graus): normaliza pelo maior gradiente da célula
  const e = 1 / C, grad = (u, v) => [(alt(u + e, v) - alt(u - e, v)) / (2 * e), (alt(u, v + e) - alt(u, v - e)) / (2 * e)];
  let gmax = 1e-9; for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) { const [a, b] = grad(x / C, y / C); gmax = Math.max(gmax, Math.hypot(a, b)); }
  const kN = relevo / gmax;
  for (let i = 0; i < VINIL_N * VINIL_N; i++) {
    const [r, g, b] = hex(cores[i] || '#808080');
    const cx = (i % VINIL_N) * C, cy = Math.floor(i / VINIL_N) * C;
    for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
      const u = x / C, v = y / C, h = alt(u, v), [dx, dy] = grad(u, v);
      let nx = -dx * kN, ny = dy * kN, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const o = ((cy + y) * N + cx + x) * 3, k = 0.96 + 0.06 * h; // variação leve de tom, como espuma
      cor[o] = Math.min(255, r * k); cor[o + 1] = Math.min(255, g * k); cor[o + 2] = Math.min(255, b * k);
      nor[o] = Math.round((nx * 0.5 + 0.5) * 255); nor[o + 1] = Math.round((ny * 0.5 + 0.5) * 255); nor[o + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      rug[o] = 255; rug[o + 1] = Math.round(255 * (0.52 + 0.12 * (1 - h))); rug[o + 2] = 0; // G = rugosidade, B = metal (0)
    }
  }
  return { cor: png(N, N, 3, cor), normal: png(N, N, 3, nor), rugosidade: png(N, N, 3, rug) };
}

// ---- rede de losangos (só no web.glb): 1024 x 1024 RGBA, corte de alfa (alphaMode MASK) + mipmaps ----
// A textura cobre REDE_S = 1,2 m x 1,2 m: losango de 15 cm, fio de ~4,7 mm, cinza-escuro #333 (escolhido em 23/09).
export const REDE_S = 1.2;
export function redeLosangos(corFio = 51) {
  const N = 1024, p = 128, w = 4, borda = 0.5, px = new Uint8Array(N * N * 4);
  const dist = (t) => { const m = ((t % p) + p) % p; return Math.min(m, p - m); };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.min(dist(x + y), dist(x - y)) / Math.SQRT2;
    const a = Math.max(0, Math.min(1, ((w * 0.5 - d) / (2 * borda) + 0.5)));
    const o = (y * N + x) * 4; px[o] = corFio; px[o + 1] = corFio; px[o + 2] = corFio; px[o + 3] = Math.round(a * 255);
  }
  return png(N, N, 4, px);
}
