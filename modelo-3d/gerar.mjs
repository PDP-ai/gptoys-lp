// Gerador procedural do Kid Play. Uso: node gerar.mjs <comprimento> <largura> <altura> <saida.glb> [pulapula]
// Medidas em metros. So a caixa externa e oficial; o interior e ilustrativo (proporcional a caixa).
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'fs';

globalThis.FileReader = class {
  readAsArrayBuffer(b) { b.arrayBuffer().then(r => { this.result = r; this.onloadend?.(); }); }
  readAsDataURL(b) { b.arrayBuffer().then(r => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(r).toString('base64'); this.onloadend?.(); }); }
};

const [L, W, H] = process.argv.slice(2, 5).map(Number);
const out = process.argv[5] || 'kidplay.glb';
if (!(L > 0 && W > 0 && H > 0)) { console.error('uso: node gerar.mjs L W H saida.glb'); process.exit(1); }

const C = { verde: 0x1fa64a, rosa: 0xe8318f, amarelo: 0xffd400, azul: 0x1f4fd8, vermelho: 0xe0202a, laranja: 0xff6a1a,
  roxo: 0x5b2a9a, branco: 0xf4f4f0, azulclaro: 0x2f9be8, verdeclaro: 0x8fe02b, preto: 0x111111 };
const groups = {}; // cor -> lista de geometrias
const add = (cor, geo, m) => { geo = geo.clone(); geo.applyMatrix4(m || new THREE.Matrix4()); if (geo.index) geo = geo.toNonIndexed(); geo.deleteAttribute('uv'); (groups[cor] ||= []).push(geo); };
const T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);

// tubo acolchoado: gomos ligeiramente abaulados entre a e b
function tubo(cor, a, b, r = 0.055) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length();
  const n = Math.max(1, Math.round(len / 0.16)), seg = len / n;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  for (let i = 0; i < n; i++) {
    const c = A.clone().addScaledVector(d.clone().normalize(), seg * (i + 0.5));
    add(cor, new THREE.CylinderGeometry(r, r, seg * 0.94, 10), new THREE.Matrix4().compose(c, q, new THREE.Vector3(1, 1, 1)));
  }
}
const caixa = (cor, x0, y0, z0, x1, y1, z1) => add(cor, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), T((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
const r = 0.055;

// ---- proporcoes (ilustrativas), tudo relativo a caixa externa ----
const deckY = Math.min(1.1, H * 0.5), poolX = L * 0.30, wallX = L * 0.55, slideX = L * 0.84;
// coordenadas: x 0..L, y 0..H, z 0..W

// 1) tubos das quinas e travessas (moldura externa)
const cantos = [[0, 0], [L, 0], [0, W], [L, W]], cores4 = ['verde', 'azul', 'verdeclaro', 'laranja'];
cantos.forEach(([x, z], i) => tubo(cores4[i], [x === 0 ? r : L - r, 0, z === 0 ? r : W - r], [x === 0 ? r : L - r, H, z === 0 ? r : W - r]));
const xs = (x) => Math.min(Math.max(x, r), L - r), zs = (z) => Math.min(Math.max(z, r), W - r);
const cor = (i, l) => l[i % l.length];
for (const [y, lst] of [[H - r, ['verde', 'rosa', 'amarelo', 'azul']], [r, ['vermelho', 'roxo', 'rosa']], [deckY, ['laranja', 'azul']]]) {
  [0, W].forEach((z0, k) => {
    const z = zs(z0), nseg = 4;
    for (let i = 0; i < nseg; i++) tubo(cor(i + k, lst), [r + (L - 2 * r) * i / nseg, y, z], [r + (L - 2 * r) * (i + 1) / nseg, y, z]);
  });
  [0, L].forEach((x0, k) => tubo(cor(k, lst), [xs(x0), y, r], [xs(x0), y, W - r]));
}
// postes intermediarios
for (const x of [poolX, wallX, slideX]) [0, W].forEach((z, k) => tubo(['azul', 'vermelho', 'amarelo'][k + (x > wallX ? 1 : 0)], [x, 0, zs(z)], [x, H, zs(z)]));

// 2) piso de tatames coloridos (grade)
const pal = ['vermelho', 'roxo', 'rosa', 'azulclaro', 'verde', 'laranja', 'amarelo', 'azul'];
const nx = Math.round(L / 0.5), nz = Math.max(1, Math.round(W / 0.5));
for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
  const x0 = L * i / nx, x1 = L * (i + 1) / nx;
  if (x1 <= poolX) continue; // piscina no lugar
  caixa(pal[(i * 3 + j * 5) % pal.length], x0 + 0.005, 0, W * j / nz + 0.005, x1 - 0.005, 0.04, W * (j + 1) / nz - 0.005);
}
// 3) piscina de bolinhas: borda acolchoada + fundo + esferas
caixa('azulclaro', 0.02, 0, 0.02, poolX, 0.03, W - 0.02);
const bord = 0.32;
caixa('azul', 0.02, 0, 0.02, poolX, bord, 0.08); caixa('azul', 0.02, 0, W - 0.08, poolX, bord, W - 0.02); caixa('azul', 0.02, 0, 0.02, 0.08, bord, W - 0.02);
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const bcores = ['vermelho', 'amarelo', 'azul', 'verde'];
const bg = new THREE.SphereGeometry(0.075, 8, 6);
const nb = Math.round(320 * (poolX * W) / (1.8 * 2)); // densidade ~constante
for (let i = 0; i < nb; i++) add(bcores[i % 4], bg, T(0.13 + rnd() * (poolX - 0.22), 0.06 + rnd() * 0.22, 0.14 + rnd() * (W - 0.28)));

// 4) plataforma superior (andar 2) sobre a area direita
caixa('laranja', wallX, deckY - 0.06, 0.06, slideX, deckY, W - 0.06);
caixa('azul', wallX - 0.9 < poolX ? poolX : wallX - 0.9, deckY - 0.06, 0.06, wallX, deckY, W * 0.5); // patamar azul a esquerda
// pilares de apoio do deck
[[wallX + 0.1, W * 0.5]].forEach(([x, z]) => tubo('laranja', [x, 0, z], [x, deckY - 0.06, z], 0.07));
// area sob o deck: tatame rosa
caixa('rosa', wallX, 0.04, 0.06, slideX, 0.07, W - 0.06);
// 5) parede de escalada inclinada: do chao (poolX) ate o deck (wallX)
const wl = Math.hypot(wallX - poolX, deckY), ang = Math.atan2(deckY, wallX - poolX);
const wallM = new THREE.Matrix4().compose(new THREE.Vector3((poolX + wallX) / 2, deckY / 2, W / 2), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), ang), new THREE.Vector3(1, 1, 1));
const wallPart = (cor, z0, z1) => add(cor, new THREE.BoxGeometry(wl, 0.05, z1 - z0), wallM.clone().multiply(T(0, 0, (z0 + z1) / 2 - W / 2)));
const zw = W * 0.7, zc = W / 2, zwa = zc - zw / 2, zwb = zc + zw / 2;
wallPart('vermelho', zwa, zwa + zw * 0.55); wallPart('branco', zwa + zw * 0.55, zwb);
wallPart('rosa', zwa - 0.001, zwa + zw * 0.55); // faixa rosa leve
// pegadas hexagonais na face superior da parede
const hexc = ['azul', 'laranja', 'amarelo', 'roxo', 'verde', 'rosa', 'azulclaro', 'laranja'];
const hg = new THREE.CylinderGeometry(0.07, 0.07, 0.05, 6); hg.rotateX(Math.PI / 2);
for (let k = 0; k < 14; k++) {
  const u = -wl / 2 + wl * (0.12 + 0.76 * ((k * 5) % 7) / 6 * 0.6 + (Math.floor(k / 2) / 7) * 0.4), v = zwa + zw * (0.12 + ((k * 37) % 10) / 10 * 0.76);
  add(hexc[k % hexc.length], hg, wallM.clone().multiply(T(u, 0.045, v - W / 2)));
}
// apoio triangular lateral da parede
const tri = new THREE.Shape([new THREE.Vector2(poolX, 0), new THREE.Vector2(wallX, 0), new THREE.Vector2(wallX, deckY)]);
for (const z of [zwa - 0.03, zwb + 0.0]) { const g = new THREE.ExtrudeGeometry(tri, { depth: 0.03, bevelEnabled: false }); add('amarelo', g, T(0, 0, z)); }

// 6) escorregador duplo azul (descendo para +x, a partir do deck)
const sl = Math.hypot(L - slideX - 0.2, deckY - 0.1) - 0.02, sang = -Math.atan2(deckY - 0.1, L - slideX - 0.1);
const sw = Math.min(0.9, W * 0.55) / 2;
for (const dz of [-sw / 2 - 0.03, sw / 2 + 0.03]) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3((slideX + L - 0.12) / 2, deckY / 2 + 0.02, W / 2 + dz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), sang), new THREE.Vector3(1, 1, 1));
  add('azul', new THREE.BoxGeometry(sl, 0.04, sw - 0.02), m);
  for (const s of [-1, 1]) add('azul', new THREE.BoxGeometry(sl, 0.12, 0.03), m.clone().multiply(T(0, 0.06, s * (sw / 2 - 0.02))));
}
// 7) cilindro de brinquedo no deck (rolo colorido) e obstaculo
add('roxo', new THREE.CylinderGeometry(0.16, 0.16, Math.min(0.8, W * 0.4), 14), new THREE.Matrix4().compose(new THREE.Vector3(wallX + 0.6, deckY + 0.16, W * 0.35), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), new THREE.Vector3(1, 1, 1)));

// ---- monta cena ----
const root = new THREE.Group(); root.name = `KidPlay_${L}x${W}x${H}m`;
for (const [c, geos] of Object.entries(groups)) {
  const g = mergeGeometries(geos); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: C[c], roughness: 0.55, metalness: 0, name: c }));
  m.name = c; root.add(m);
}
// rede semitransparente nas 4 faces
const rede = new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0.12, roughness: 1, side: THREE.DoubleSide, name: 'rede' });
const faces = [[L, H, 0, [L / 2, H / 2, 0.005]], [L, H, 0, [L / 2, H / 2, W - 0.005]], [W, H, Math.PI / 2, [0.005, H / 2, W / 2]], [W, H, Math.PI / 2, [L - 0.005, H / 2, W / 2]]];
for (const [a, b, ry, p] of faces) { const m = new THREE.Mesh(new THREE.PlaneGeometry(a, b), rede); m.rotation.y = ry; m.position.set(...p); m.name = 'rede'; root.add(m); }
// caixa externa invisivel nao exportada: as medidas oficiais estao no nome do no
new GLTFExporter().parse(root, (glb) => { fs.writeFileSync(out, Buffer.from(glb)); console.log(out, glb.byteLength, 'bytes'); }, (e) => { console.error(e); process.exit(1); }, { binary: true });
