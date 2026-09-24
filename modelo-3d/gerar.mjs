// Gerador procedural do Kid Play (semana 2: atlas de cores, materiais por familia, texturas geradas por codigo).
// Uso: node gerar.mjs skus/kidplay-6m.json modelos/kidplay-6m   (grava web.glb e ar.glb na pasta)
// So a caixa externa e oficial; o interior e ilustrativo (proporcional a caixa).
import * as THREE from 'three';
import fs from 'fs';
import path from 'path';
import { atlasSolido, vinilTubo, redeLosangos, REDE_S } from './texturas.mjs';

const [cfgPath, outDir] = process.argv.slice(2, 4);
if (!cfgPath || !outDir) { console.error('uso: node gerar.mjs skus/kidplay-6m.json modelos/kidplay-6m'); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const { comprimento: L, largura: W, altura: H } = cfg.caixa_externa_m;
if (!(L > 0 && W > 0 && H > 0)) { console.error('medidas invalidas em', cfgPath); process.exit(1); }
const P = cfg.proporcoes;

// ---- atlas: ordem fixa das cores (ate 16 celulas) ----
const chaves = [...Object.keys(cfg.paleta), 'metal'];
const METAL_WEB = process.env.METAL_WEB || '#b9bdc4', METAL_AR = '#8a8f96'; // AR: cinza medio nao-metal (correcao 2)
const hexes = [...Object.values(cfg.paleta), METAL_WEB];
const hexesAr = [...Object.values(cfg.paleta), METAL_AR];
if (chaves.length > 16) throw new Error('atlas comporta 16 cores');
const idx = (c) => { const i = chaves.indexOf(c); if (i < 0) throw new Error('cor fora do atlas: ' + c); return i; };

// ---- coletor de geometria por material (familia) ----
const FAM = {};  // familia -> {pos:[], nor:[], uv:[]}
const T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
// modo 'centro': todos os vertices apontam para o centro da amostra de cor (atlas solido 4x4)
// modo 'celula': o UV 0..1 da peca e comprimido na celula do vinil (atlas de trama 4x4, com margem)
function add(fam, cor, geo, m, modo = 'centro', suave = null) {
  geo = geo.clone(); if (geo.index) geo = geo.toNonIndexed();
  if (!geo.attributes.normal) geo.computeVertexNormals();
  if (suave) { const p = geo.attributes.position, n = geo.attributes.normal; for (let i = 0; i < p.count; i++) n.setXYZ(i, p.getX(i), p.getY(i), p.getZ(i)); for (let i = 0; i < n.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(n, i).normalize(); n.setXYZ(i, v.x, v.y, v.z); } }
  let tan = null; // tangente (so vinil de tubo): direcao em que o U cresce, em volta do tubo
  if (fam === 'vinil_tubo') {
    const p = geo.attributes.position, mm = new THREE.Matrix3().setFromMatrix4(m), n = p.count; tan = new Float32Array(n * 4);
    for (let k = 0; k < n; k++) { const th = Math.atan2(p.getX(k), p.getZ(k)), v = new THREE.Vector3(Math.cos(th), 0, -Math.sin(th)).applyMatrix3(mm).normalize(); tan.set([v.x, v.y, v.z, -1], k * 4); }
  }
  geo.applyMatrix4(m || new THREE.Matrix4());
  const i = idx(cor), col = i % 4, row = Math.floor(i / 4), n = geo.attributes.position.count;
  const uv = new Float32Array(n * 2), src = geo.attributes.uv;
  for (let k = 0; k < n; k++) {
    if (modo === 'celula' && src) {
      const mg = 3 / 512, s = 128 / 512 - 2 * mg;
      uv[2 * k] = col * 0.25 + mg + Math.min(1, Math.max(0, src.getX(k))) * s;
      uv[2 * k + 1] = row * 0.25 + mg + Math.min(1, Math.max(0, src.getY(k))) * s;
    } else { uv[2 * k] = (col + 0.5) / 4; uv[2 * k + 1] = (row + 0.5) / 4; }
  }
  const f = (FAM[fam] ||= { pos: [], nor: [], uv: [] });
  f.pos.push(geo.attributes.position.array); f.nor.push(geo.attributes.normal.array); f.uv.push(uv); if (tan) (f.tan ||= []).push(tan);
}

// tubo de vinil: gomos (8 lados, abaulados no meio) sobre um miolo de metal fino
const gomoBase = (() => {
  const g = new THREE.CylinderGeometry(1, 1, 1, 8, 2, true);
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), k = Math.abs(y) < 1e-6 ? 1 : 0.9;
    p.setXYZ(i, p.getX(i) * k, y, p.getZ(i) * k);
    const v = new THREE.Vector3(p.getX(i), Math.abs(y) < 1e-6 ? 0 : Math.sign(y) * 0.45, p.getZ(i)).normalize(); n.setXYZ(i, v.x, v.y, v.z);
  }
  return g;
})();
const miolo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
function tubo(cor, a, b, r = 0.055) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length(), dn = d.clone().normalize();
  const n = Math.max(1, Math.round(len / 0.2)), seg = len / n;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dn);
  for (let i = 0; i < n; i++) {
    const c = A.clone().addScaledVector(dn, seg * (i + 0.5));
    add('vinil_tubo', cor, gomoBase, new THREE.Matrix4().compose(c, q, new THREE.Vector3(r, seg * 0.94, r)), 'celula');
  }
  add('metal', 'metal', miolo, new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), q, new THREE.Vector3(r * 0.8, len, r * 0.8)));
}
const caixa = (cor, x0, y0, z0, x1, y1, z1, fam = 'plataforma') => add(fam, cor, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), T((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
const r = 0.055;
const PP = cfg.pula_pula || null, ppX1 = PP ? PP.x_ini + PP.comprimento : 0; // area de pula-pula (2 x 2 m oficial); resto ilustrativo

// ---- proporcoes (ilustrativas), tudo relativo a caixa externa ----
const deckY = cfg.niveis.deck_m, poolX = L * P.piscina_fim, wallX = L * P.parede_fim, slideX = L * P.escorregador_inicio;
// coordenadas: x 0..L, y 0..H, z 0..W

// 1) tubos das quinas e travessas (moldura externa)
const cantos = [[0, 0], [L, 0], [0, W], [L, W]], cores4 = ['verde', 'azul', 'verdeclaro', 'laranja'];
cantos.forEach(([x, z], i) => tubo(cores4[i], [x === 0 ? r : L - r, 0, z === 0 ? r : W - r], [x === 0 ? r : L - r, H, z === 0 ? r : W - r]));
const xs = (x) => Math.min(Math.max(x, r), L - r), zs = (z) => Math.min(Math.max(z, r), W - r);
const cor = (i, l) => l[i % l.length];
for (const [y, lst] of [[H - r, ['verde', 'rosa', 'amarelo', 'azul']], [r, ['vermelho', 'roxo', 'rosa']], [deckY, ['laranja', 'azul']]]) {
  [0, W].forEach((z0, k) => {
    const z = zs(z0), nseg = P.travessas_por_lado;
    for (let i = 0; i < nseg; i++) tubo(cor(i + k, lst), [r + (L - 2 * r) * i / nseg, y, z], [r + (L - 2 * r) * (i + 1) / nseg, y, z]);
  });
  [0, L].forEach((x0, k) => tubo(cor(k, lst), [xs(x0), y, r], [xs(x0), y, W - r]));
}
// postes intermediarios
for (const x of [poolX, wallX, slideX]) [0, W].forEach((z, k) => tubo(['azul', 'vermelho', 'amarelo'][k + (x > wallX ? 1 : 0)], [x, 0, zs(z)], [x, H, zs(z)]));
// capas de canto em metal (so onde ha juncao de quina e muda a silhueta): 8 quinas da caixa + 4 do deck
const cubo = new THREE.BoxGeometry(1, 1, 1);
for (const [x, z] of cantos) for (const y of [r, H - r, deckY]) add('metal', 'metal', cubo, new THREE.Matrix4().compose(new THREE.Vector3(xs(x), y, zs(z)), new THREE.Quaternion(), new THREE.Vector3(2 * r, 2 * r, 2 * r)));

// 2) piso de tatames coloridos em quadros
const pal = cfg.paleta_tatames;
const nx = Math.round(L / P.tatame_m), nz = Math.max(1, Math.round(W / P.tatame_m));
for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
  const x0 = L * i / nx, x1 = L * (i + 1) / nx;
  if (x1 <= poolX) continue; // piscina no lugar
  caixa(pal[(i * 3 + j * 5) % pal.length], x0 + 0.005, 0, W * j / nz + 0.005, x1 - 0.005, 0.04, W * (j + 1) / nz - 0.005, 'tatame');
}
// 3) piscina de bolinhas: borda acolchoada + fundo + bolinhas individuais (baixa resolucao, reproduziveis por seed)
const px0 = PP ? ppX1 + 0.02 : 0.02; // a piscina comeca depois do pula-pula
caixa('azulclaro', px0, 0, 0.02, poolX, 0.03, W - 0.02);
const bord = 0.32;
caixa('azul', px0, 0, 0.02, poolX, bord, 0.08); caixa('azul', px0, 0, W - 0.08, poolX, bord, W - 0.02); caixa('azul', px0, 0, 0.02, px0 + 0.06, bord, W - 0.02);
let seed = cfg.seed; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const bcores = cfg.paleta_bolinhas;
const bg = new THREE.IcosahedronGeometry(0.075, 0); // 20 triangulos
const nb = Math.round(P.bolinhas_ref * ((poolX - (PP ? ppX1 : 0)) * W) / (P.bolinhas_ref_area_m2)); // densidade ~constante; NAO e a quantidade oficial
for (let i = 0; i < nb; i++) add('bolinhas', bcores[i % 4], bg, T(px0 + 0.11 + rnd() * (poolX - px0 - 0.20), 0.09 + rnd() * 0.2, 0.14 + rnd() * (W - 0.28)), 'centro', true);

// 3b) area de pula-pula (so quando o SKU tem 'pula_pula'): cama elastica preta, borda acolchoada colorida, moldura de tubos
if (PP) {
  const yb = PP.altura_cama_m, x0 = PP.x_ini, x1 = ppX1, z0 = (W - PP.largura) / 2, z1 = z0 + PP.largura, pd = 0.25, ins = 0.12;
  caixa('roxo', x0 + 0.01, 0, z0 + 0.01, x1 - 0.01, 0.03, z1 - 0.01, 'tatame'); // base de piso
  caixa('preto', x0 + pd, yb, z0 + pd, x1 - pd, yb + 0.03, z1 - pd, 'cama'); // cama elastica
  const b = PP.cor_borda;
  caixa(b, x0, yb - 0.04, z0, x1, yb + 0.1, z0 + pd, 'plataforma'); caixa(b, x0, yb - 0.04, z1 - pd, x1, yb + 0.1, z1, 'plataforma');
  caixa(b, x0, yb - 0.04, z0 + pd, x0 + pd, yb + 0.1, z1 - pd, 'plataforma'); caixa(b, x1 - pd, yb - 0.04, z0 + pd, x1, yb + 0.1, z1 - pd, 'plataforma');
  const c = PP.cor_estrutura, xa = x0 + ins, xb = x1 - ins, za = z0 + ins, zb = z1 - ins, yr = yb - 0.06;
  for (const [x, z] of [[xa, za], [xb, za], [xa, zb], [xb, zb]]) tubo(c, [x, 0, z], [x, yr, z], 0.045); // pernas
  tubo(c, [xa, yr, za], [xb, yr, za], 0.045); tubo(c, [xa, yr, zb], [xb, yr, zb], 0.045); tubo(c, [xa, yr, za], [xa, yr, zb], 0.045); tubo(c, [xb, yr, za], [xb, yr, zb], 0.045);
}
// 4) plataforma superior (andar 2) sobre a area direita
caixa('laranja', wallX, deckY - 0.06, 0.06, slideX, deckY, W - 0.06);
caixa('azul', wallX - 0.9 < poolX ? poolX : wallX - 0.9, deckY - 0.06, 0.06, wallX, deckY, W * 0.5); // patamar azul a esquerda
[[wallX + 0.1, W * 0.5]].forEach(([x, z]) => tubo('laranja', [x, 0, z], [x, deckY - 0.06, z], 0.07)); // pilar de apoio do deck
caixa('rosa', wallX, 0.04, 0.06, slideX, 0.07, W - 0.06); // area sob o deck: tatame rosa
// 5) parede de escalada inclinada: do chao (poolX) ate o deck (wallX)
const wl = Math.hypot(wallX - poolX, deckY), ang = Math.atan2(deckY, wallX - poolX);
const wallM = new THREE.Matrix4().compose(new THREE.Vector3((poolX + wallX) / 2, deckY / 2 + 0.03, W / 2), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), ang), new THREE.Vector3(1, 1, 1));
const wallPart = (cor, z0, z1) => add('plataforma', cor, new THREE.BoxGeometry(wl, 0.05, z1 - z0), wallM.clone().multiply(T(0, 0, (z0 + z1) / 2 - W / 2)));
const zw = W * 0.7, zc = W / 2, zwa = zc - zw / 2, zwb = zc + zw / 2;
wallPart('vermelho', zwa, zwa + zw * 0.55); wallPart('branco', zwa + zw * 0.55, zwb);
// pegadas hexagonais na face superior da parede (plastico)
const hexc = ['azul', 'laranja', 'amarelo', 'roxo', 'verde', 'rosa', 'azulclaro', 'laranja'];
const hg = new THREE.CylinderGeometry(0.07, 0.07, 0.05, 6); hg.rotateX(Math.PI / 2);
for (let k = 0; k < 14; k++) {
  const u = -wl / 2 + wl * (0.12 + 0.76 * ((k * 5) % 7) / 6 * 0.6 + (Math.floor(k / 2) / 7) * 0.4), v = zwa + zw * (0.12 + ((k * 37) % 10) / 10 * 0.76);
  add('escorregador_plastico', hexc[k % hexc.length], hg, wallM.clone().multiply(T(u, 0.045, v - W / 2)));
}
// apoio triangular lateral da parede
const tri = new THREE.Shape([new THREE.Vector2(poolX, 0), new THREE.Vector2(wallX, 0), new THREE.Vector2(wallX, deckY)]);
for (const z of [zwa - 0.03, zwb + 0.0]) add('plataforma', 'amarelo', new THREE.ExtrudeGeometry(tri, { depth: 0.03, bevelEnabled: false }), T(0, 0, z));

// 6) escorregador duplo azul: duas calhas em U (descendo para +x, a partir do deck)
{
  const S = new THREE.Vector3(slideX + 0.02, deckY + 0.02, 0), E = new THREE.Vector3(L - 0.16, 0.1, 0);
  const d = E.clone().sub(S), sl = d.length(); d.normalize();
  const up = new THREE.Vector3(Math.sin(Math.atan2(-d.y, d.x)), Math.cos(Math.atan2(-d.y, d.x)), 0);
  const sw = Math.min(0.9, W * 0.55) / 2, a = sw / 2 - 0.01, t = 0.03, hh = 0.15;
  const fora = [[-a, hh], [-a, 0.08], [-a * 0.8, 0.02], [-a * 0.4, 0], [a * 0.4, 0], [a * 0.8, 0.02], [a, 0.08], [a, hh]];
  const dentro = [[a - t, hh], [a - t, 0.09], [a * 0.8 - t * 0.6, 0.05], [a * 0.4, t], [-a * 0.4, t], [-a * 0.8 + t * 0.6, 0.05], [-a + t, 0.09], [-a + t, hh]];
  const shape = new THREE.Shape([...fora, ...dentro].map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: sl, bevelEnabled: false, curveSegments: 1 });
  for (const dz of [-sw / 2 - 0.03, sw / 2 + 0.03]) {
    const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), up, d); m.setPosition(S.x, S.y, W / 2 + dz);
    add('escorregador_plastico', 'azul', g, m);
  }
}
// 7) rolo colorido no deck
add('plataforma', 'roxo', new THREE.CylinderGeometry(0.16, 0.16, Math.min(0.8, W * 0.4), 14), new THREE.Matrix4().compose(new THREE.Vector3(wallX + 0.6, deckY + 0.16, W * 0.35), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), new THREE.Vector3(1, 1, 1)));

// 7b) pecas INSPIRADAS NAS FOTOS (gp-13, gp-14, gp-03, gp-06), genericas e ilustrativas, SEM medida oficial:
//     saco/pendulo azul pendurado, tunel cilindrico deitado, painel azul com janela triangular vazada.
//     Reusam os materiais existentes (plataforma, metal); nenhum material novo.
{
  const dx = slideX - wallX;
  const flip = (g) => { g = g.index ? g.toNonIndexed() : g.clone(); const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i += 3) for (const at of [p, n, g.attributes.uv]) { const a1 = [at.getX(i + 1), at.getY(i + 1)], a2 = [at.getX(i + 2), at.getY(i + 2)];
      if (at.itemSize === 3) { const zz = at.getZ(i + 1); at.setXYZ(i + 1, at.getX(i + 2), at.getY(i + 2), at.getZ(i + 2)); at.setXYZ(i + 2, a1[0], a1[1], zz); } else { at.setXY(i + 1, a2[0], a2[1]); at.setXY(i + 2, a1[0], a1[1]); } }
    for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i)); return g; };
  // (a) 3 saquinhos-pendulo azuis presos por cordas a uma travessa no alto, sobre o deck
  const bx = wallX + 0.12, topY = H - r;
  tubo('vermelho', [bx, topY, r], [bx, topY, W - r]);
  const cord = 0.35, bag = new THREE.CapsuleGeometry(0.085, 0.26, 3, 8), cg = new THREE.CylinderGeometry(0.008, 0.008, 1, 5);
  for (const f of [0.25, 0.5, 0.75]) {
    add('metal', 'metal', cg, new THREE.Matrix4().compose(new THREE.Vector3(bx, topY - cord / 2, W * f), new THREE.Quaternion(), new THREE.Vector3(1, cord, 1)));
    add('plataforma', 'azul', bag, T(bx, topY - cord - 0.215, W * f), 'centro', true);
  }
  // (b) tunel cilindrico deitado (eixo x) no deck, com dois aneis nas pontas
  const R = 0.22, tl = Math.min(0.7, dx * 0.5), tx = slideX - 0.1 - tl / 2, tz = W * 0.7, ty = deckY + R;
  const oc = new THREE.CylinderGeometry(R, R, tl, 16, 1, true).rotateZ(Math.PI / 2), ic = flip(new THREE.CylinderGeometry(R - 0.03, R - 0.03, tl, 16, 1, true).rotateZ(Math.PI / 2));
  add('plataforma', 'verdeclaro', oc, T(tx, ty, tz), 'centro', true); add('plataforma', 'verdeclaro', ic, T(tx, ty, tz), 'centro', true);
  const ring = new THREE.TorusGeometry(R - 0.015, 0.022, 6, 16).rotateY(Math.PI / 2);
  for (const sx of [-1, 1]) add('plataforma', 'amarelo', ring, T(tx + sx * tl / 2, ty, tz), 'centro', true);
  // (c) painel azul com janela triangular vazada, em pe na borda do deck (lado z = W)
  const pw = Math.min(0.9, dx * 0.6), ph = 0.7, px = wallX + dx * 0.55, tw = Math.min(0.34, pw * 0.5), th = 0.32;
  const sh = new THREE.Shape([[-pw / 2, 0], [pw / 2, 0], [pw / 2, ph], [-pw / 2, ph]].map(([a, b]) => new THREE.Vector2(a, b)));
  const hole = new THREE.Path([[-tw / 2, ph / 2 - th / 2], [tw / 2, ph / 2 - th / 2], [0, ph / 2 + th / 2]].map(([a, b]) => new THREE.Vector2(a, b)));
  sh.holes.push(hole);
  add('plataforma', 'azul', new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false }), T(px, deckY, W - 0.14));
}
// 8) rede: 4 paineis com textura de losangos (alphaMode MASK, dupla face, um so material)
{
  const f = (FAM.rede = { pos: [], nor: [], uv: [] }), S = REDE_S; // a textura cobre 1,2 m
  const painel = (a, b, ry, p) => {
    const g = new THREE.PlaneGeometry(a, b); g.rotateY(ry); g.translate(...p);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * a / S, uv.getY(i) * b / S);
    const gg = g.toNonIndexed(); f.pos.push(gg.attributes.position.array); f.nor.push(gg.attributes.normal.array); f.uv.push(gg.attributes.uv.array);
  };
  painel(L, H, 0, [L / 2, H / 2, 0.005]); painel(L, H, 0, [L / 2, H / 2, W - 0.005]); painel(W, H, Math.PI / 2, [0.005, H / 2, W / 2]); painel(W, H, Math.PI / 2, [L - 0.005, H / 2, W / 2]);
}

// 8b) rede em GEOMETRIA para o ar.glb (sem alpha): faixas planas finas, uma faixa continua por diagonal e por painel,
//     dupla face, material opaco #333. w = largura do fio (m), p = passo do losango (m, medido no eixo).
const REDE_GEO_W = +(process.env.REDE_GEO_W || 0.010), REDE_GEO_P = +(process.env.REDE_GEO_P || 0.20);
const redeAr = { pos: [], nor: [], uv: [] };
{
  const w = REDE_GEO_W, p = REDE_GEO_P, h = w / 2, ins = h;
  const painel = (a, b, ry, pt) => {
    const tris = [];
    for (const s of [1, -1]) {
      const kmin = s === 1 ? 0 : -Math.ceil(b / p) - 1, kmax = s === 1 ? Math.ceil((a + b) / p) : Math.ceil(a / p) + 1;
      for (let k = kmin; k <= kmax; k++) {
        const c = k * p; let x0, x1;
        if (s === 1) { x0 = Math.max(ins, c - (b - ins)); x1 = Math.min(a - ins, c - ins); } else { x0 = Math.max(ins, c + ins); x1 = Math.min(a - ins, c + b - ins); }
        if (x1 - x0 < 1e-4) continue;
        const y = (x) => (s === 1 ? c - x : x - c);
        const P0 = [x0, y(x0)], P1 = [x1, y(x1)], dx = P1[0] - P0[0], dy = P1[1] - P0[1], l = Math.hypot(dx, dy), nx = -dy / l * h, ny = dx / l * h;
        const A = [P0[0] - nx, P0[1] - ny], B = [P1[0] - nx, P1[1] - ny], C = [P1[0] + nx, P1[1] + ny], D = [P0[0] + nx, P0[1] + ny];
        for (const t of [A, B, C, A, C, D]) tris.push(t[0] - a / 2, t[1] - b / 2, 0);
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(tris, 3)); g.rotateY(ry); g.translate(...pt);
    const n = tris.length / 3, nor = new Float32Array(n * 3), v = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
    for (let i = 0; i < n; i++) nor.set([v.x, v.y, v.z], i * 3);
    redeAr.pos.push(g.attributes.position.array); redeAr.nor.push(nor); redeAr.uv.push(new Float32Array(n * 2));
  };
  painel(L, H, 0, [L / 2, H / 2, 0.005]); painel(L, H, 0, [L / 2, H / 2, W - 0.005]); painel(W, H, Math.PI / 2, [0.005, H / 2, W / 2]); painel(W, H, Math.PI / 2, [L - 0.005, H / 2, W / 2]);
}

// ---- escreve o GLB (sem extensoes, 1 conjunto de UV, sem vertex colors) ----
const cat = (arrs) => { const n = arrs.reduce((s, a) => s + a.length, 0), o = new Float32Array(n); let k = 0; for (const a of arrs) { o.set(a, k); k += a.length; } return o; };
const vin = vinilTubo(hexes), vinAr = vinilTubo(hexesAr);
const METAL_WEB_PBR = process.env.METAL_WEB_NAOMETAL ? { metallicFactor: 0, roughnessFactor: 0.5 } : { metallicFactor: 0.8, roughnessFactor: 0.35 };
function escrever(ar) {
const FAMx = ar ? { ...FAM, rede: redeAr } : FAM;
const imagens = ar ? [vin.cor, vin.normal, vin.rugosidade, atlasSolido(hexesAr)] : [vin.cor, vin.normal, vin.rugosidade, atlasSolido(hexes), redeLosangos()];
const nomesImg = ['vinil_cor', 'vinil_normal', 'vinil_rugosidade', 'atlas_cores', 'rede_losangos'];
const materiais = {
  vinil_tubo: { pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicRoughnessTexture: { index: 2 }, metallicFactor: 0, roughnessFactor: 1 }, normalTexture: { index: 1, scale: 0.8 } },
  plataforma: { pbrMetallicRoughness: { baseColorTexture: { index: 3 }, metallicFactor: 0, roughnessFactor: 0.5 } },
  tatame: { pbrMetallicRoughness: { baseColorTexture: { index: 3 }, metallicFactor: 0, roughnessFactor: 0.4 } },
  escorregador_plastico: { pbrMetallicRoughness: { baseColorTexture: { index: 3 }, metallicFactor: 0, roughnessFactor: 0.22 } },
  cama: { pbrMetallicRoughness: { baseColorTexture: { index: 3 }, metallicFactor: 0, roughnessFactor: 0.85 } },
  bolinhas: { pbrMetallicRoughness: { baseColorTexture: { index: 3 }, metallicFactor: 0, roughnessFactor: 0.28 } },
  metal: { pbrMetallicRoughness: { baseColorTexture: { index: 3 }, ...(ar ? { metallicFactor: 0, roughnessFactor: 0.5 } : METAL_WEB_PBR) } },
  rede: ar ? { pbrMetallicRoughness: { baseColorFactor: [0.0331, 0.0331, 0.0331, 1], metallicFactor: 0, roughnessFactor: 0.8 }, doubleSided: true } : { pbrMetallicRoughness: { baseColorTexture: { index: 4 }, metallicFactor: 0, roughnessFactor: 1 }, alphaMode: 'MASK', alphaCutoff: +(process.env.REDE_CORTE || 0.25), doubleSided: true },
};
const partes = []; let off = 0;
const view = (buf, target) => { const pad = (4 - (off % 4)) % 4; if (pad) { partes.push(Buffer.alloc(pad)); off += pad; } const v = { buffer: 0, byteOffset: off, byteLength: buf.length }; if (target) v.target = target; partes.push(buf); off += buf.length; return v; };
const j = { asset: { version: '2.0', generator: 'gerar.mjs (GP Toys, prototipo)', extras: { aviso: cfg.aviso, caixa_externa_m: cfg.caixa_externa_m } }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: `KidPlay_${L}x${W}x${H}m`, children: [] }], meshes: [], materials: [], accessors: [], bufferViews: [], images: [], textures: [], samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }, { magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }] };
const bv = (v) => j.bufferViews.push(v) - 1, ac = (a) => j.accessors.push(a) - 1;
imagens.forEach((b, i) => { j.images.push({ name: nomesImg[i], mimeType: 'image/png', bufferView: bv(view(b)) }); j.textures.push({ source: i, sampler: i === 4 ? 1 : 0 }); });
for (const [nome, f] of Object.entries(FAMx)) {
  const pos = cat(f.pos); for (let i = 0; i < pos.length; i += 3) { pos[i] -= L / 2; pos[i + 2] -= W / 2; } /* pivo no centro da base: x,z centrados, y=0 no piso */
  const nor = cat(f.nor), uv = cat(f.uv), n = pos.length / 3;
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i++) { mn[i % 3] = Math.min(mn[i % 3], pos[i]); mx[i % 3] = Math.max(mx[i % 3], pos[i]); }
  const aP = ac({ bufferView: bv(view(Buffer.from(pos.buffer), 34962)), componentType: 5126, count: n, type: 'VEC3', min: mn, max: mx });
  const aN = ac({ bufferView: bv(view(Buffer.from(nor.buffer), 34962)), componentType: 5126, count: n, type: 'VEC3' });
  const aU = ac({ bufferView: bv(view(Buffer.from(uv.buffer), 34962)), componentType: 5126, count: n, type: 'VEC2' });
  const aT = f.tan ? ac({ bufferView: bv(view(Buffer.from(cat(f.tan).buffer), 34962)), componentType: 5126, count: n, type: 'VEC4' }) : null;
  j.materials.push({ name: nome, ...materiais[nome] });
  j.meshes.push({ name: nome, primitives: [{ attributes: { POSITION: aP, NORMAL: aN, TEXCOORD_0: aU, ...(aT !== null ? { TANGENT: aT } : {}) }, material: j.materials.length - 1, mode: 4 }] });
  j.nodes.push({ name: nome, mesh: j.meshes.length - 1 }); j.nodes[0].children.push(j.nodes.length - 1);
}
const bin = Buffer.concat(partes); j.buffers = [{ byteLength: bin.length }];
let js = Buffer.from(JSON.stringify(j)); js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]);
const binP = Buffer.concat([bin, Buffer.alloc((4 - bin.length % 4) % 4)]);
const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + binP.length, 8);
const ch = (t, b) => { const h = Buffer.alloc(8); h.writeUInt32LE(b.length, 0); h.writeUInt32LE(t, 4); return Buffer.concat([h, b]); };
const glb = Buffer.concat([head, ch(0x4e4f534a, js), ch(0x004e4942, binP)]);
return glb;
}
fs.mkdirSync(outDir, { recursive: true });
// web.glb: rede em textura MASK; ar.glb: rede em geometria opaca e metal nao-metalico (sem Draco/KTX2/meshopt)
const gw = escrever(false), ga = escrever(true);
fs.writeFileSync(path.join(outDir, 'web.glb'), gw); fs.writeFileSync(path.join(outDir, 'ar.glb'), ga);
console.log(outDir, 'web', gw.length, 'ar', ga.length, 'bytes');
