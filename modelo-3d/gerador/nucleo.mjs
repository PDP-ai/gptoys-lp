// Núcleo do gerador: lê a especificação de um modelo (JSON) e um esquema de cores, monta a geometria
// por família de material e escreve os GLB (web.glb, ar.glb e mini.glb). Não lê nem grava disco.
// Só a caixa externa (comprimento x largura x altura) é oficial; o interior é ilustrativo.
import * as THREE from 'three';
import { atlasSolido, isotuboTexturas, redeLosangos, REDE_S, ATLAS_N, VINIL_N } from './texturas.mjs';

export const R = 0.055;                 // raio do isotubo (11 cm de diâmetro)
const CONEXAO = 2 * R;                  // conexão de alumínio: cubo do tamanho do tubo
const FOLGA = CONEXAO / 2 + 0.012;      // o isotubo para 1,2 cm antes da conexão (aparece o galvanizado)
const MIOLO = 0.45;                     // raio do tubo galvanizado em relação ao isotubo
const GOMO_M = 0.15;                    // comprimento de cada gomo do isotubo (sulcos a cada ~15 cm, como nas fotos)
const REDE_FIO = 0.010, REDE_PASSO = 0.20; // rede em geometria (RA): fio de 10 mm, losango de 20 cm
const TATAME_H = 0.045, TATAME_BISEL = 0.015;
const BOLA_R = 0.045;                   // bolinha de 9 cm no desenho

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
const ciclo = (l, i) => l[((i % l.length) + l.length) % l.length];
const srgbParaLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

// gomo do isotubo: 8 lados, abaulado no meio (raio 1) e mais fino nas pontas (0,86); gomos encostados formam o sulco
const gomoBase = (() => {
  const g = new THREE.CylinderGeometry(1, 1, 1, 8, 2, true);
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), meio = Math.abs(y) < 1e-6, k = meio ? 1 : 0.86;
    p.setXYZ(i, p.getX(i) * k, y, p.getZ(i) * k);
    const v = V(p.getX(i), meio ? 0 : Math.sign(y) * 0.6, p.getZ(i)).normalize(); n.setXYZ(i, v.x, v.y, v.z);
  }
  return g;
})();
const miolo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
const cubo = new THREE.BoxGeometry(1, 1, 1);

// tatame com a borda de cima chanfrada (aspecto almofadado das fotos); sem a face de baixo (fica no chão)
function tatameGeo(sx, h, sz, b) {
  const x = sx / 2, z = sz / 2, xi = x - b, zi = z - b;
  const P = { a: [-x, 0, -z], b: [x, 0, -z], c: [x, 0, z], d: [-x, 0, z], A: [-xi, h, -zi], B: [xi, h, -zi], C: [xi, h, zi], D: [-xi, h, zi] };
  const quads = [['A', 'D', 'C', 'B'], ['a', 'A', 'B', 'b'], ['b', 'B', 'C', 'c'], ['c', 'C', 'D', 'd'], ['d', 'D', 'A', 'a']];
  const pos = [];
  for (const [p0, p1, p2, p3] of quads) for (const k of [p0, p1, p2, p0, p2, p3]) pos.push(...P[k]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
}
// inverte a face (ordem dos vértices e normal): usado no lado de dentro do túnel
function inverter(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone(); const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i += 3) for (const at of [p, n, uv].filter(Boolean)) {
    const s = at.itemSize, a = [], b = [];
    for (let c = 0; c < s; c++) { a.push(at.getComponent(i + 1, c)); b.push(at.getComponent(i + 2, c)); }
    for (let c = 0; c < s; c++) { at.setComponent(i + 1, c, b[c]); at.setComponent(i + 2, c, a[c]); }
  }
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return g;
}

// ---------------------------------------------------------------------------------------------
class Cena {
  constructor() { this.fam = {}; this.solidas = []; this.tubos = []; this.origem = V(0, 0, 0); }
  corSolida(web, ar = web) {
    const k = `${web}|${ar}`; let i = this.solidas.findIndex(c => c.k === k);
    if (i < 0) { i = this.solidas.push({ k, web, ar }) - 1; if (i >= ATLAS_N * ATLAS_N) throw new Error('cores demais no atlas'); }
    return i;
  }
  corTubo(hex) {
    let i = this.tubos.indexOf(hex);
    if (i < 0) { i = this.tubos.push(hex) - 1; if (i >= VINIL_N * VINIL_N) throw new Error('cores de tubo demais (máx. 16)'); }
    return i;
  }
  // fam: família de material; cor: índice no atlas (sólido) ou no isotubo (modo 'celula')
  add(fam, cor, geo, m, { modo = 'centro', suave = false } = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (!g.attributes.normal) g.computeVertexNormals();
    const p = g.attributes.position, n = p.count;
    if (suave) for (let i = 0; i < n; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)).normalize(); g.attributes.normal.setXYZ(i, v.x, v.y, v.z); }
    let tan = null;
    if (modo === 'celula') { // tangente = direção em que o U cresce, em volta do tubo
      const m3 = new THREE.Matrix3().setFromMatrix4(m); tan = new Float32Array(n * 4);
      for (let k = 0; k < n; k++) { const th = Math.atan2(p.getX(k), p.getZ(k)), t = V(Math.cos(th), 0, -Math.sin(th)).applyMatrix3(m3).normalize(); tan.set([t.x, t.y, t.z, -1], k * 4); }
    }
    g.applyMatrix4(T(this.origem.x, this.origem.y, this.origem.z).multiply(m));
    const uv = new Float32Array(n * 2), src = g.attributes.uv;
    if (modo === 'celula') {
      const col = cor % VINIL_N, row = Math.floor(cor / VINIL_N), mg = 3 / 512, s = 1 / VINIL_N - 2 * mg;
      for (let k = 0; k < n; k++) { uv[2 * k] = col / VINIL_N + mg + Math.min(1, Math.max(0, src.getX(k))) * s; uv[2 * k + 1] = row / VINIL_N + mg + Math.min(1, Math.max(0, src.getY(k))) * s; }
    } else {
      const col = cor % ATLAS_N, row = Math.floor(cor / ATLAS_N);
      for (let k = 0; k < n; k++) { uv[2 * k] = (col + 0.5) / ATLAS_N; uv[2 * k + 1] = (row + 0.5) / ATLAS_N; }
    }
    const f = (this.fam[fam] ||= { pos: [], nor: [], uv: [], tan: [] });
    f.pos.push(g.attributes.position.array); f.nor.push(g.attributes.normal.array); f.uv.push(uv); if (tan) f.tan.push(tan);
  }
  // geometria crua (já em coordenadas finais, sem UV): rede em fios
  addCru(fam, pos, nor) { const f = (this.fam[fam] ||= { pos: [], nor: [], uv: [], tan: [], semUV: true }); f.pos.push(pos); f.nor.push(nor); }
}

// ---------------------------------------------------------------------------------------------
// Monta a cena de um modelo. spec = JSON do modelo; esq = esquema de cores; fixas = cores fixas.
export function montar(spec, esq, fixas) {
  const cena = new Cena();
  const { comprimento: L, largura: W, altura: H } = spec.medidas_m;
  if (!(L > 0 && W > 0 && H > 0)) throw new Error(`${spec.id}: medidas inválidas`);
  const base = spec.base || null;
  const X0 = base ? base.cambao_m : 0, Y0 = base ? base.altura_chassi_m : 0; // início da área de brincar
  const Lp = L - X0, Hp = H - Y0;                                            // área de brincar
  const mods = spec.modulos || [];
  const deckMod = mods.find(m => m.tipo === 'deck');
  const deckY = deckMod ? spec.estrutura.altura_deck_m : null;
  if (deckY !== null && !(deckY > 0.3 && deckY < Hp - 0.4)) throw new Error(`${spec.id}: altura do andar fora da área`);
  for (const m of mods) if (!(m.de_m >= 0 && m.ate_m <= Lp + 1e-6 && m.ate_m > m.de_m)) throw new Error(`${spec.id}: módulo ${m.tipo} fora da área (0 a ${Lp} m)`);
  const pl = esq.plataformas, ac = esq.acolchoados;
  const S = (hex) => cena.corSolida(hex);
  const corConexao = cena.corSolida(fixas.conexoes_web, fixas.conexoes_ar), corGalv = cena.corSolida(fixas.galvanizado);

  // ---- caixas e tubos (coordenadas da área de brincar: x 0..Lp, y 0..Hp, z 0..W) ----
  const caixa = (fam, hex, x0, y0, z0, x1, y1, z1) => cena.add(fam, S(hex), cubo, new THREE.Matrix4().compose(V((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), new THREE.Quaternion(), V(x1 - x0, y1 - y0, z1 - z0)));
  const juncoes = [];
  const temJuncao = (p) => juncoes.some(q => q.distanceTo(p) < 0.02);
  let kTubo = 0;
  const corDoTubo = () => ciclo(esq.tubos, kTubo++ * 5 + 1);
  function tubo(a, b, { cor = null, r = R, comFolga = true } = {}) {
    const A = V(...a), B = V(...b), d = B.clone().sub(A), len = d.length(), dn = d.clone().normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dn);
    const ia = comFolga && temJuncao(A) ? FOLGA : 0, ib = comFolga && temJuncao(B) ? FOLGA : 0, l2 = len - ia - ib;
    const ti = cena.corTubo(cor || corDoTubo());
    if (l2 > 0.03) {
      const n = Math.max(1, Math.round(l2 / GOMO_M)), seg = l2 / n;
      for (let i = 0; i < n; i++) cena.add('isotubo', ti, gomoBase, new THREE.Matrix4().compose(A.clone().addScaledVector(dn, ia + seg * (i + 0.5)), q, V(r, seg, r)), { modo: 'celula' });
    }
    cena.add('metal', corGalv, miolo, new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), q, V(r * MIOLO, len, r * MIOLO)));
  }
  const conexao = (p) => cena.add('metal', corConexao, cubo, new THREE.Matrix4().compose(p, new THREE.Quaternion(), V(CONEXAO, CONEXAO, CONEXAO)));

  // ---- 0) base da carretinha (coordenadas globais) ----
  if (base) {
    if (base.tipo !== 'carretinha') throw new Error(`${spec.id}: base desconhecida ${base.tipo}`);
    const yc = Y0, xc = X0, rr = base.raio_roda_m, chassi = S(fixas.chassi), pneu = S(fixas.pneus);
    const cx = (fam, cor, x0, y0, z0, x1, y1, z1) => cena.add(fam, cor, cubo, new THREE.Matrix4().compose(V((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), new THREE.Quaternion(), V(x1 - x0, y1 - y0, z1 - z0)));
    if (rr * 2 > yc - 0.03) throw new Error(`${spec.id}: roda maior que a altura do chassi`);
    cx('metal', chassi, xc, yc - 0.025, 0, L, yc, W);                                        // piso da carretinha
    for (const z of [0.28, W - 0.38]) cx('metal', chassi, xc, yc - 0.15, z, L, yc - 0.025, z + 0.1); // longarinas
    const nt = Math.max(2, Math.round(Lp / 1.0));
    for (let i = 0; i <= nt; i++) { const x = xc + 0.05 + (Lp - 0.1) * i / nt; cx('metal', chassi, x - 0.04, yc - 0.13, 0.38, x + 0.04, yc - 0.035, W - 0.38); } // travessas
    const meio = xc + Lp * 0.52, eixos = base.eixos === 1 ? [meio] : [meio - 0.36, meio + 0.36];
    const roda = new THREE.CylinderGeometry(rr, rr, 0.17, 16).rotateX(Math.PI / 2), aro = new THREE.CylinderGeometry(rr * 0.58, rr * 0.58, 0.176, 12).rotateX(Math.PI / 2);
    const eixo = new THREE.CylinderGeometry(0.03, 0.03, W - 0.4, 8).rotateX(Math.PI / 2);
    for (const x of eixos) {
      cena.add('metal', chassi, eixo, T(x, rr, W / 2));
      for (const z of [0.11, W - 0.11]) { cena.add('borracha', pneu, roda, T(x, rr, z)); cena.add('metal', chassi, aro, T(x, rr, z)); }
    }
    // cambão em "V" até o engate, e roda de apoio
    const yb = yc - 0.09;
    for (const z of [0.33, W - 0.33]) { const A = V(xc, yb, z), B = V(0.17, yb, W / 2), d = B.clone().sub(A), q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize()); cena.add('metal', chassi, new THREE.CylinderGeometry(0.035, 0.035, 1, 8), new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), q, V(1, d.length(), 1))); }
    cx('metal', chassi, 0, yb - 0.05, W / 2 - 0.06, 0.18, yb + 0.05, W / 2 + 0.06);           // engate
    cena.add('metal', chassi, new THREE.CylinderGeometry(0.03, 0.03, yb - 0.12, 8), T(0.55, 0.12 + (yb - 0.12) / 2, W / 2)); // roda de apoio (haste)
    cena.add('borracha', pneu, new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12).rotateX(Math.PI / 2), T(0.55, 0.08, W / 2));
  }
  cena.origem.set(X0, Y0, 0); // daqui em diante: coordenadas da área de brincar

  // ---- 1) estrutura: postes nos cantos e nos limites dos módulos, travessas em 2 ou 3 alturas, conexões ----
  const limites = [0, Lp, ...mods.flatMap(m => [m.de_m, m.ate_m])].sort((a, b) => a - b);
  const xsPoste = [];
  for (const x of limites) if (!xsPoste.length || x - xsPoste[xsPoste.length - 1] > 0.15) xsPoste.push(x);
  if (Lp - xsPoste[xsPoste.length - 1] > 1e-6) xsPoste[xsPoste.length - 1] = Lp;
  const px = xsPoste.map(x => Math.min(Math.max(x, R), Lp - R));
  const zsLado = [R, W - R], niveis = deckY !== null ? [R, deckY, Hp - R] : [R, Hp - R];
  for (const x of px) for (const z of zsLado) for (const y of niveis) juncoes.push(V(x, y, z));
  const sacos = deckMod && (deckMod.itens || []).includes('sacos_pancada');
  const xSacos = sacos ? deckMod.de_m + 0.3 : null;
  if (sacos) for (const z of zsLado) juncoes.push(V(xSacos, Hp - R, z));
  for (const p of juncoes) conexao(p);
  const passoMax = spec.estrutura?.trecho_max_m || 1.5;
  const trechos = (a, b) => { const k = Math.max(1, Math.ceil((b - a) / passoMax - 1e-6)); return Array.from({ length: k }, (_, i) => [a + (b - a) * i / k, a + (b - a) * (i + 1) / k]); };
  for (const y of niveis) {
    for (const z of zsLado) for (let i = 0; i + 1 < px.length; i++) for (const [a, b] of trechos(px[i], px[i + 1])) tubo([a, y, z], [b, y, z]);
    for (const x of [px[0], px[px.length - 1]]) for (const [a, b] of trechos(R, W - R)) tubo([x, y, a], [x, y, b]);
  }
  for (const x of px) for (const z of zsLado) for (let i = 0; i + 1 < niveis.length; i++) tubo([x, niveis[i], z], [x, niveis[i + 1], z]);

  // ---- 2) piso de tatames (fora da piscina e do pula-pula); sob o andar, cor única ----
  const ocupado = mods.filter(m => m.tipo === 'piscina_bolinhas' || m.tipo === 'pula_pula');
  const tam = spec.acabamentos?.piso_tatames_m || 0.5, nx = Math.max(1, Math.round(Lp / tam)), nz = Math.max(1, Math.round(W / tam));
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const x0 = Lp * i / nx, x1 = Lp * (i + 1) / nx, z0 = W * j / nz, z1 = W * (j + 1) / nz, xm = (x0 + x1) / 2;
    if (ocupado.some(m => xm > m.de_m && xm < m.ate_m)) continue;
    const sobDeck = deckMod && xm > deckMod.de_m && xm < deckMod.ate_m;
    const hex = sobDeck ? esq.piso.sob_deck : ciclo(esq.piso.tatames, i * 3 + j * 5);
    cena.add('piso', S(hex), tatameGeo(x1 - x0 - 0.008, TATAME_H, z1 - z0 - 0.008, TATAME_BISEL), T(xm, 0, (z0 + z1) / 2));
  }

  let seed = spec.seed || 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const m of mods) {
    // ---- 3) piscina de bolinhas: borda acolchoada, fundo elevado e uma camada densa de bolinhas ----
    if (m.tipo === 'piscina_bolinhas') {
      const x0 = m.de_m + 0.02, x1 = m.ate_m, bord = m.borda_altura_m || 0.32, fundo = 0.15;
      caixa('acolchoado', ac.piscina_fundo, x0 + 0.06, 0, 0.08, x1, fundo, W - 0.08);
      caixa('acolchoado', ac.piscina_borda, x0, 0, 0.02, x1, bord, 0.08); caixa('acolchoado', ac.piscina_borda, x0, 0, W - 0.08, x1, bord, W - 0.02);
      caixa('acolchoado', ac.piscina_borda, x0, 0, 0.08, x0 + 0.06, bord, W - 0.08);
      const bola = new THREE.IcosahedronGeometry(BOLA_R, 0), s = BOLA_R * 1.9;
      const ax = x0 + 0.06 + BOLA_R, bx = x1 - BOLA_R - 0.02, az = 0.08 + BOLA_R, bz = W - 0.08 - BOLA_R;
      const ni = Math.max(1, Math.floor((bx - ax) / s)), nj = Math.max(1, Math.floor((bz - az) / s)); let k = 0;
      for (let i = 0; i <= ni; i++) for (let j = 0; j <= nj; j++) {
        const x = ax + (bx - ax) * i / ni + (rnd() - 0.5) * s * 0.5, z = az + (bz - az) * j / nj + (rnd() - 0.5) * s * 0.5, y = fundo + BOLA_R * 0.8 + rnd() * 0.035;
        cena.add('bolinhas', S(ciclo(esq.bolinhas, k++ * 7 + Math.floor(rnd() * 3))), bola, T(Math.min(bx, Math.max(ax, x)), y, Math.min(bz, Math.max(az, z))), { suave: true });
      }
    }
    // ---- 3b) pula-pula: cama elástica, borda acolchoada e moldura de tubos (área oficial de 2 x 2 m) ----
    if (m.tipo === 'pula_pula') {
      const yb = m.altura_cama_m, x0 = m.de_m, x1 = m.ate_m, z0 = (W - m.largura_m) / 2, z1 = z0 + m.largura_m, pd = 0.25, ins = 0.12;
      caixa('acolchoado', ac.base_pula_pula, x0 + 0.01, 0, z0 + 0.01, x1 - 0.01, 0.03, z1 - 0.01);
      caixa('borracha', fixas.cama_pula_pula, x0 + pd, yb, z0 + pd, x1 - pd, yb + 0.03, z1 - pd);
      const b = ac.borda_pula_pula;
      caixa('acolchoado', b, x0, yb - 0.04, z0, x1, yb + 0.1, z0 + pd); caixa('acolchoado', b, x0, yb - 0.04, z1 - pd, x1, yb + 0.1, z1);
      caixa('acolchoado', b, x0, yb - 0.04, z0 + pd, x0 + pd, yb + 0.1, z1 - pd); caixa('acolchoado', b, x1 - pd, yb - 0.04, z0 + pd, x1, yb + 0.1, z1 - pd);
      const c = ciclo(esq.tubos, 3), xa = x0 + ins, xb = x1 - ins, za = z0 + ins, zb = z1 - ins, yr = yb - 0.06, o = { cor: c, r: 0.045, comFolga: false };
      for (const [x, z] of [[xa, za], [xb, za], [xa, zb], [xb, zb]]) tubo([x, 0, z], [x, yr, z], o);
      tubo([xa, yr, za], [xb, yr, za], o); tubo([xa, yr, zb], [xb, yr, zb], o); tubo([xa, yr, za], [xa, yr, zb], o); tubo([xb, yr, za], [xb, yr, zb], o);
    }
    // ---- 4) parede de escalada inclinada: do chão (início) até o andar (fim), com pegadas e apoios ----
    if (m.tipo === 'parede_escalada') {
      if (deckY === null) throw new Error(`${spec.id}: parede de escalada precisa de um andar`);
      const a = m.de_m, b = m.ate_m, wl = Math.hypot(b - a, deckY), ang = Math.atan2(deckY, b - a);
      const wallM = new THREE.Matrix4().compose(V((a + b) / 2, deckY / 2 + 0.03, W / 2), new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), ang), V(1, 1, 1));
      const parte = (hex, z0, z1) => cena.add('plataforma', S(hex), new THREE.BoxGeometry(wl, 0.05, z1 - z0), wallM.clone().multiply(T(0, 0, (z0 + z1) / 2 - W / 2)));
      const zw = W * 0.7, zwa = W / 2 - zw / 2, zwb = W / 2 + zw / 2;
      parte(pl.parede[0], zwa, zwa + zw * 0.55); parte(ciclo(pl.parede, 1), zwa + zw * 0.55, zwb);
      const hg = new THREE.CylinderGeometry(0.07, 0.07, 0.05, 6); hg.rotateX(Math.PI / 2);
      for (let k = 0; k < (m.pegadas || 14); k++) {
        const u = -wl / 2 + wl * (0.12 + 0.76 * ((k * 5) % 7) / 6 * 0.6 + (Math.floor(k / 2) / 7) * 0.4), v = zwa + zw * (0.12 + ((k * 37) % 10) / 10 * 0.76);
        cena.add('plastico', S(ciclo(esq.pegadas, k)), hg, wallM.clone().multiply(T(u, 0.045, v - W / 2)));
      }
      const tri = new THREE.Shape([new THREE.Vector2(a, 0), new THREE.Vector2(b, 0), new THREE.Vector2(b, deckY)]);
      for (const z of [zwa - 0.03, zwb]) cena.add('plataforma', S(pl.apoio), new THREE.ExtrudeGeometry(tri, { depth: 0.03, bevelEnabled: false }), T(0, 0, z));
    }
    // ---- 5) andar (deck) e o que fica em cima dele ----
    if (m.tipo === 'deck') {
      const a = m.de_m, b = m.ate_m, dx = b - a, it = new Set(m.itens || []);
      caixa('plataforma', pl.deck, a, deckY - 0.06, 0.06, b, deckY, W - 0.06);
      if (it.has('patamar')) { const parede = mods.find(o => o.tipo === 'parede_escalada'); const xa = Math.max(parede ? parede.de_m : 0, a - 0.9); caixa('plataforma', pl.patamar, xa, deckY - 0.06, 0.06, a, deckY, W * 0.5); }
      if (it.has('pilar')) tubo([a + 0.1, 0, W / 2], [a + 0.1, deckY - 0.06, W / 2], { cor: pl.deck, r: 0.07, comFolga: false });
      if (it.has('rolo')) { const xr = Math.min(a + 0.6, b - 0.2); cena.add('acolchoado', S(ac.rolo), new THREE.CylinderGeometry(0.16, 0.16, Math.min(0.8, W * 0.4), 14), new THREE.Matrix4().compose(V(xr, deckY + 0.16, W * 0.35), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), V(1, 1, 1))); }
      if (it.has('sacos_pancada')) { // travessa no alto e 3 saquinhos pendurados por cordas
        const topY = Hp - R, cord = 0.35, bag = new THREE.CapsuleGeometry(0.085, 0.26, 3, 8), cg = new THREE.CylinderGeometry(0.008, 0.008, 1, 5);
        tubo([xSacos, topY, R], [xSacos, topY, W - R]);
        for (const f of [0.25, 0.5, 0.75]) {
          cena.add('metal', corGalv, cg, new THREE.Matrix4().compose(V(xSacos, topY - cord / 2, W * f), new THREE.Quaternion(), V(1, cord, 1)));
          cena.add('acolchoado', S(ac.sacos), bag, T(xSacos, topY - cord - 0.215, W * f));
        }
      }
      if (it.has('tunel')) { // túnel deitado com anéis nas pontas (opaco: a fábrica não faz tubo transparente)
        const Rt = 0.22, tl = Math.min(0.7, dx * 0.5), tx = b - 0.1 - tl / 2, tz = W * 0.7, ty = deckY + Rt;
        const oc = new THREE.CylinderGeometry(Rt, Rt, tl, 16, 1, true).rotateZ(Math.PI / 2), ic = inverter(new THREE.CylinderGeometry(Rt - 0.03, Rt - 0.03, tl, 16, 1, true).rotateZ(Math.PI / 2));
        cena.add('acolchoado', S(ac.tunel), oc, T(tx, ty, tz)); cena.add('acolchoado', S(ac.tunel), ic, T(tx, ty, tz));
        const anel = new THREE.TorusGeometry(Rt - 0.015, 0.022, 6, 16).rotateY(Math.PI / 2);
        for (const sx of [-1, 1]) cena.add('acolchoado', S(ac.aneis), anel, T(tx + sx * tl / 2, ty, tz));
      }
      if (it.has('painel_janela')) { // painel com janela triangular vazada, em pé na borda do andar
        const pw = Math.min(0.9, dx * 0.6), ph = 0.7, pxm = a + dx * 0.55, tw = Math.min(0.34, pw * 0.5), th = 0.32;
        const sh = new THREE.Shape([[-pw / 2, 0], [pw / 2, 0], [pw / 2, ph], [-pw / 2, ph]].map(([u, v]) => new THREE.Vector2(u, v)));
        sh.holes.push(new THREE.Path([[-tw / 2, ph / 2 - th / 2], [tw / 2, ph / 2 - th / 2], [0, ph / 2 + th / 2]].map(([u, v]) => new THREE.Vector2(u, v))));
        cena.add('plataforma', S(pl.painel), new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false }), T(pxm, deckY, W - 0.14));
      }
    }
    // ---- 6) escorregador duplo de plástico: duas calhas em U descendo do andar ----
    if (m.tipo === 'escorregador_duplo') {
      if (deckY === null) throw new Error(`${spec.id}: escorregador precisa de um andar`);
      const Sp = V(m.de_m + 0.02, deckY + 0.02, 0), E = V(m.ate_m - 0.16, 0.1, 0), d = E.clone().sub(Sp), sl = d.length(); d.normalize();
      const up = V(Math.sin(Math.atan2(-d.y, d.x)), Math.cos(Math.atan2(-d.y, d.x)), 0);
      const sw = Math.min(0.9, W * 0.55) / 2, a = sw / 2 - 0.01, t = 0.03, hh = 0.15;
      const fora = [[-a, hh], [-a, 0.08], [-a * 0.8, 0.02], [-a * 0.4, 0], [a * 0.4, 0], [a * 0.8, 0.02], [a, 0.08], [a, hh]];
      const dentro = [[a - t, hh], [a - t, 0.09], [a * 0.8 - t * 0.6, 0.05], [a * 0.4, t], [-a * 0.4, t], [-a * 0.8 + t * 0.6, 0.05], [-a + t, 0.09], [-a + t, hh]];
      const g = new THREE.ExtrudeGeometry(new THREE.Shape([...fora, ...dentro].map(([x, y]) => new THREE.Vector2(x, y))), { depth: sl, bevelEnabled: false, curveSegments: 1 });
      for (const dz of [-sw / 2 - 0.03, sw / 2 + 0.03]) { const mm = new THREE.Matrix4().makeBasis(V(0, 0, -1), up, d); mm.setPosition(Sp.x, Sp.y, W / 2 + dz); cena.add('plastico', S(esq.escorregador), g, mm); }
    }
  }

  // ---- 7) rede de nylon nas 4 laterais: web = textura com corte; RA = fios em geometria com as 2 faces ----
  const redeWeb = { pos: [], nor: [], uv: [] }, redeAr = { pos: [], nor: [] };
  if (spec.acabamentos?.rede_lateral !== false) {
    const o = cena.origem;
    const paineis = [[Lp, Hp, 0, [Lp / 2, Hp / 2, 0.005]], [Lp, Hp, 0, [Lp / 2, Hp / 2, W - 0.005]], [W, Hp, Math.PI / 2, [0.005, Hp / 2, W / 2]], [W, Hp, Math.PI / 2, [Lp - 0.005, Hp / 2, W / 2]]];
    for (const [a, b, ry, p] of paineis) {
      const g = new THREE.PlaneGeometry(a, b); g.rotateY(ry); g.translate(p[0] + o.x, p[1] + o.y, p[2] + o.z);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * a / REDE_S, uv.getY(i) * b / REDE_S);
      const gg = g.toNonIndexed(); redeWeb.pos.push(gg.attributes.position.array); redeWeb.nor.push(gg.attributes.normal.array); redeWeb.uv.push(gg.attributes.uv.array);
      // fios: uma faixa contínua por diagonal, nos dois sentidos; depois a mesma faixa com a face virada para o outro lado
      const w = REDE_FIO, pp = REDE_PASSO, h = w / 2, ins = h, tris = [];
      for (const s of [1, -1]) {
        const kmin = s === 1 ? 0 : -Math.ceil(b / pp) - 1, kmax = s === 1 ? Math.ceil((a + b) / pp) : Math.ceil(a / pp) + 1;
        for (let k = kmin; k <= kmax; k++) {
          const c = k * pp; let x0, x1;
          if (s === 1) { x0 = Math.max(ins, c - (b - ins)); x1 = Math.min(a - ins, c - ins); } else { x0 = Math.max(ins, c + ins); x1 = Math.min(a - ins, c + b - ins); }
          if (x1 - x0 < 1e-4) continue;
          const y = (x) => (s === 1 ? c - x : x - c);
          const P0 = [x0, y(x0)], P1 = [x1, y(x1)], ddx = P1[0] - P0[0], ddy = P1[1] - P0[1], l = Math.hypot(ddx, ddy), nx = -ddy / l * h, ny = ddx / l * h;
          const A = [P0[0] - nx, P0[1] - ny], B = [P1[0] - nx, P1[1] - ny], C = [P1[0] + nx, P1[1] + ny], D = [P0[0] + nx, P0[1] + ny];
          for (const t of [A, B, C, A, C, D]) tris.push(t[0] - a / 2, t[1] - b / 2, 0);
          for (const t of [A, C, B, A, D, C]) tris.push(t[0] - a / 2, t[1] - b / 2, 0); // face de trás (RealityKit não faz dupla face)
        }
      }
      const gf = new THREE.BufferGeometry(); gf.setAttribute('position', new THREE.Float32BufferAttribute(tris, 3)); gf.rotateY(ry); gf.translate(p[0] + o.x, p[1] + o.y, p[2] + o.z);
      const n = tris.length / 3, nor = new Float32Array(n * 3), v = V(0, 0, 1).applyAxisAngle(V(0, 1, 0), ry);
      for (let i = 0; i < n; i++) { const sgn = Math.floor(i / 6) % 2 === 0 ? 1 : -1; nor.set([v.x * sgn, v.y * sgn, v.z * sgn], i * 3); }
      redeAr.pos.push(gf.attributes.position.array); redeAr.nor.push(nor);
    }
  }
  return { cena, redeWeb, redeAr, L, W, H };
}

// ---------------------------------------------------------------------------------------------
// junta vértices iguais (mesma posição, normal, UV e tangente) e cria o índice: arquivo menor, mesmos triângulos
const cat = (arrs) => { const n = arrs.reduce((s, a) => s + a.length, 0), o = new Float32Array(n); let k = 0; for (const a of arrs) { o.set(a, k); k += a.length; } return o; };
function indexar(pos, nor, uv, tan) {
  const n = pos.length / 3, mapa = new Map(), idx = new Uint32Array(n), P = [], N = [], U = [], TG = [];
  const q = (v, s) => Math.round(v * s);
  for (let i = 0; i < n; i++) {
    let key = `${q(pos[3 * i], 1e5)},${q(pos[3 * i + 1], 1e5)},${q(pos[3 * i + 2], 1e5)}|${q(nor[3 * i], 1e4)},${q(nor[3 * i + 1], 1e4)},${q(nor[3 * i + 2], 1e4)}`;
    if (uv) key += `|${q(uv[2 * i], 1e6)},${q(uv[2 * i + 1], 1e6)}`;
    if (tan) key += `|${q(tan[4 * i], 1e4)},${q(tan[4 * i + 1], 1e4)},${q(tan[4 * i + 2], 1e4)}`;
    let j = mapa.get(key);
    if (j === undefined) {
      j = P.length / 3; mapa.set(key, j); P.push(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]);
      const l = Math.hypot(nor[3 * i], nor[3 * i + 1], nor[3 * i + 2]) || 1; N.push(nor[3 * i] / l, nor[3 * i + 1] / l, nor[3 * i + 2] / l);
      if (uv) U.push(uv[2 * i], uv[2 * i + 1]); if (tan) TG.push(tan[4 * i], tan[4 * i + 1], tan[4 * i + 2], tan[4 * i + 3]);
    }
    idx[i] = j;
  }
  // descarta triângulos degenerados (área zero), que não aparecem e o validador aponta
  const P3 = new Float32Array(P), keep = [];
  for (let t = 0; t < n; t += 3) {
    const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]]; if (a === b || b === c || a === c) continue;
    const ab = V(P3[3 * b] - P3[3 * a], P3[3 * b + 1] - P3[3 * a + 1], P3[3 * b + 2] - P3[3 * a + 2]), ac = V(P3[3 * c] - P3[3 * a], P3[3 * c + 1] - P3[3 * a + 1], P3[3 * c + 2] - P3[3 * a + 2]);
    if (ab.cross(ac).length() < 1e-12) continue; keep.push(a, b, c);
  }
  const nv = P.length / 3;
  return { pos: P3, nor: new Float32Array(N), uv: uv ? new Float32Array(U) : null, tan: tan ? new Float32Array(TG) : null, idx: nv < 65536 ? new Uint16Array(keep) : new Uint32Array(keep) };
}

// ---------------------------------------------------------------------------------------------
// Escreve um GLB. alvo: 'web' (tela) | 'ar' (Android/iPhone) ; escala: 1 (tamanho real) ou 0.1 (miniatura)
const ORDEM = ['isotubo', 'metal', 'plataforma', 'piso', 'acolchoado', 'plastico', 'bolinhas', 'borracha', 'rede'];
export function escreverGLB(montado, materiais, fixas, { alvo, escala = 1, meta }) {
  const { cena, redeWeb, redeAr, L, W } = montado;
  const fams = {};
  for (const [k, f] of Object.entries(cena.fam)) fams[k] = { pos: cat(f.pos), nor: cat(f.nor), uv: cat(f.uv), tan: f.tan.length ? cat(f.tan) : null };
  if (alvo === 'web' && redeWeb.pos.length) fams.rede = { pos: cat(redeWeb.pos), nor: cat(redeWeb.nor), uv: cat(redeWeb.uv), tan: null };
  if (alvo === 'ar' && redeAr.pos.length) fams.rede = { pos: cat(redeAr.pos), nor: cat(redeAr.nor), uv: null, tan: null };
  // imagens: só as que alguma família usa
  const coresAtlas = cena.solidas.map(c => (alvo === 'web' ? c.web : c.ar));
  const iso = fams.isotubo ? isotuboTexturas(cena.tubos, materiais.isotubo.relevo) : null;
  const imagens = [], texIdx = {};
  const addImg = (nome, buf, sampler) => { texIdx[nome] = imagens.push({ nome, buf, sampler }) - 1; };
  if (iso) { addImg('isotubo_cor', iso.cor, 0); addImg('isotubo_relevo', iso.normal, 0); addImg('isotubo_rugosidade', iso.rugosidade, 0); }
  if (Object.keys(fams).some(k => k !== 'isotubo' && k !== 'rede')) addImg('atlas_cores', atlasSolido(coresAtlas), 0);
  if (fams.rede && alvo === 'web') addImg('rede_losangos', redeLosangos(parseInt(fixas.rede.slice(1, 3), 16)), 1);
  const corRede = [1, 3, 5].map(i => srgbParaLinear(parseInt(fixas.rede.slice(i, i + 2), 16) / 255));
  const material = (nome) => {
    const M = materiais[nome] || {};
    if (nome === 'isotubo') return { pbrMetallicRoughness: { baseColorTexture: { index: texIdx.isotubo_cor }, metallicRoughnessTexture: { index: texIdx.isotubo_rugosidade }, metallicFactor: 0, roughnessFactor: 1 }, normalTexture: { index: texIdx.isotubo_relevo } };
    if (nome === 'rede') return alvo === 'web'
      ? { pbrMetallicRoughness: { baseColorTexture: { index: texIdx.rede_losangos }, metallicFactor: 0, roughnessFactor: 1 }, alphaMode: 'MASK', alphaCutoff: 0.25, doubleSided: true }
      : { pbrMetallicRoughness: { baseColorFactor: [...corRede, 1], metallicFactor: 0, roughnessFactor: M.rugosidade ?? 0.8 } };
    const p = M[alvo] && typeof M[alvo] === 'object' ? M[alvo] : M;
    return { pbrMetallicRoughness: { baseColorTexture: { index: texIdx.atlas_cores }, metallicFactor: p.metal ?? 0, roughnessFactor: p.rugosidade ?? 0.5 } };
  };
  const partes = []; let off = 0;
  const view = (buf, target) => { const pad = (4 - (off % 4)) % 4; if (pad) { partes.push(Buffer.alloc(pad)); off += pad; } const v = { buffer: 0, byteOffset: off, byteLength: buf.length }; if (target) v.target = target; partes.push(buf); off += buf.length; return v; };
  const usados = [...new Set(imagens.map(i => i.sampler))];
  const j = {
    asset: { version: '2.0', generator: 'GP Toys modelo-3d (gerador por JSON)', extras: { ...meta, alvo, escala } },
    scene: 0, scenes: [{ name: meta.nome, nodes: [0] }], nodes: [{ name: `${meta.modelo}_${meta.cores}`, children: [] }],
    meshes: [], materials: [], accessors: [], bufferViews: [], images: [], textures: [],
    samplers: usados.map(s => (s === 1 ? { magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 } : { magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 })),
  };
  const bv = (v) => j.bufferViews.push(v) - 1, ac = (a) => j.accessors.push(a) - 1;
  imagens.forEach((im) => { j.images.push({ name: im.nome, mimeType: 'image/png', bufferView: bv(view(im.buf)) }); j.textures.push({ source: j.images.length - 1, sampler: usados.indexOf(im.sampler) }); });
  const est = { triangulos: 0, vertices: 0, malhas: 0, materiais: 0 };
  const caixa = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  for (const nome of ORDEM) {
    const f = fams[nome]; if (!f) continue;
    const pos = f.pos.slice(); for (let i = 0; i < pos.length; i += 3) { pos[i] = (pos[i] - L / 2) * escala; pos[i + 1] *= escala; pos[i + 2] = (pos[i + 2] - W / 2) * escala; } // pivô no centro da base
    const g = indexar(pos, f.nor, f.uv, f.tan), nv = g.pos.length / 3;
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < g.pos.length; i++) { mn[i % 3] = Math.min(mn[i % 3], g.pos[i]); mx[i % 3] = Math.max(mx[i % 3], g.pos[i]); }
    for (let i = 0; i < 3; i++) { caixa.min[i] = Math.min(caixa.min[i], mn[i]); caixa.max[i] = Math.max(caixa.max[i], mx[i]); }
    const at = {
      POSITION: ac({ bufferView: bv(view(Buffer.from(g.pos.buffer), 34962)), componentType: 5126, count: nv, type: 'VEC3', min: mn, max: mx }),
      NORMAL: ac({ bufferView: bv(view(Buffer.from(g.nor.buffer), 34962)), componentType: 5126, count: nv, type: 'VEC3' }),
    };
    if (g.uv) at.TEXCOORD_0 = ac({ bufferView: bv(view(Buffer.from(g.uv.buffer), 34962)), componentType: 5126, count: nv, type: 'VEC2' });
    if (g.tan) at.TANGENT = ac({ bufferView: bv(view(Buffer.from(g.tan.buffer), 34962)), componentType: 5126, count: nv, type: 'VEC4' });
    const ind = ac({ bufferView: bv(view(Buffer.from(g.idx.buffer), 34963)), componentType: g.idx instanceof Uint16Array ? 5123 : 5125, count: g.idx.length, type: 'SCALAR' });
    j.materials.push({ name: nome, ...material(nome) });
    j.meshes.push({ name: nome, primitives: [{ attributes: at, indices: ind, material: j.materials.length - 1, mode: 4 }] });
    j.nodes.push({ name: nome, mesh: j.meshes.length - 1 }); j.nodes[0].children.push(j.nodes.length - 1);
    est.triangulos += g.idx.length / 3; est.vertices += nv; est.malhas++; est.materiais++;
  }
  const bin = Buffer.concat(partes); j.buffers = [{ byteLength: bin.length }];
  let js = Buffer.from(JSON.stringify(j)); js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]);
  const binP = Buffer.concat([bin, Buffer.alloc((4 - bin.length % 4) % 4)]);
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + binP.length, 8);
  const ch = (t, b) => { const h = Buffer.alloc(8); h.writeUInt32LE(b.length, 0); h.writeUInt32LE(t, 4); return Buffer.concat([h, b]); };
  const glb = Buffer.concat([head, ch(0x4e4f534a, js), ch(0x004e4942, binP)]);
  return { glb, estatisticas: { ...est, bytes: glb.length, caixa_m: caixa.max.map((v, i) => +(v - caixa.min[i]).toFixed(4)), minimo_m: caixa.min.map(v => +v.toFixed(4)), texturas: imagens.length } };
}
