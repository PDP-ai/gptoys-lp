// Le um ou mais GLBs e imprime: triangulos, malhas, materiais (e com alpha), texturas, extensoes, UVs e tamanho.
// Uso: node medir.mjs arquivo.glb [outro.glb ...]   (sem dependencias)
import fs from 'fs';

function ler(caminho) {
  const buf = fs.readFileSync(caminho);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('nao e um GLB: ' + caminho);
  const tamJson = buf.readUInt32LE(12);
  const j = JSON.parse(buf.toString('utf8', 20, 20 + tamJson));
  let tri = 0, comUV = 0, primitivas = 0, maxUVporMalha = 0;
  for (const m of j.meshes || []) {
    let uvs = new Set();
    for (const p of m.primitives) {
      primitivas++;
      const modo = p.mode ?? 4;
      const n = p.indices !== undefined ? j.accessors[p.indices].count : j.accessors[p.attributes.POSITION].count;
      if (modo === 4) tri += n / 3; else if (modo === 5 || modo === 6) tri += n - 2;
      for (const a of Object.keys(p.attributes)) if (a.startsWith('TEXCOORD_')) uvs.add(a);
    }
    if (uvs.size) comUV++;
    maxUVporMalha = Math.max(maxUVporMalha, uvs.size);
  }
  // texturas: dimensoes lidas do cabecalho PNG; vertex colors; caixa (min/max dos POSITION, sem transformacoes de no)
  const dims = (j.images || []).map(im => { const v = j.bufferViews[im.bufferView], o = 20 + tamJson + 8 + v.byteOffset; return buf.readUInt32BE(o + 16) + 'x' + buf.readUInt32BE(o + 20); });
  let vertexColors = false; const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const m of j.meshes || []) for (const p of m.primitives) {
    if (Object.keys(p.attributes).some(a => a.startsWith('COLOR_'))) vertexColors = true;
    const a = j.accessors[p.attributes.POSITION]; if (a.min) for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], a.min[i]); mx[i] = Math.max(mx[i], a.max[i]); }
  }
  const mats = j.materials || [];
  const comAlpha = mats.filter(m => (m.alphaMode && m.alphaMode !== 'OPAQUE')).length;
  return {
    arquivo: caminho, tamanho_bytes: buf.length, tamanho_MB: +(buf.length / 1048576).toFixed(2),
    triangulos: tri, malhas: (j.meshes || []).length, primitivas: primitivas,
    materiais: mats.length, materiais_com_alpha: comAlpha,
    texturas: (j.textures || []).length, imagens: (j.images || []).length,
    extensoes_usadas: j.extensionsUsed || [], extensoes_exigidas: j.extensionsRequired || [],
    texturas_dimensoes: dims, vertex_colors: vertexColors, caixa_m: mn.map((v, i) => +(mx[i] - v).toFixed(3)),
    malhas_com_UV: comUV, max_UVs_por_malha: maxUVporMalha
  };
}
const arqs = process.argv.slice(2);
if (!arqs.length) { console.error('uso: node medir.mjs arquivo.glb [...]'); process.exit(1); }
for (const a of arqs) console.log(JSON.stringify(ler(a), null, 2));
