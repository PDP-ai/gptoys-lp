// Validação automática de tudo que o gerador produz. Uso (na pasta modelo-3d): npm run validar
// 1) JSON de entrada contra os esquemas (esquema/*.schema.json)
// 2) Cada GLB no validador oficial do glTF (Khronos): 0 erros e 0 avisos
// 3) Limites do Android (Scene Viewer) e regras do iPhone que aprendemos no teste de 23/09
// 4) Cada USDZ no verificador ARKit do USD (validar_usdz.py) + metros, eixo, caixa, pivô
// 5) A mesma "versao" dentro dos 5 arquivos de cada modelo e no catálogo
// Grava saida/validacao.json. Sai com erro (código 1) se algo falhar.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const validator = require('gltf-validator');
const Ajv2020 = require('ajv/dist/2020').default;

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SAIDA = path.join(RAIZ, 'saida');
const lerJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
// Limites: Scene Viewer (developers.google.com/ar/develop/scene-viewer) e regras próprias para o iPhone (RealityKit)
const LIM = { tri_max: 100000, tri_ideal: 50000, materiais_max: 10, alpha_ar: 0, alpha_max: 2, textura_max: 2048, mb_rec: 10, mb_max: 15, uv_por_malha: 1, ext_permitidas: ['KHR_materials_unlit', 'KHR_texture_transform'], tol_m: 0.001 };
const falhas = [], avisos = [];
const falha = (onde, msg) => falhas.push(`${onde}: ${msg}`), aviso = (onde, msg) => avisos.push(`${onde}: ${msg}`);

// ---- 1) esquemas ----
const ajv = new Ajv2020({ allErrors: true, strict: false });
const vModelo = ajv.compile(lerJSON(path.join(RAIZ, 'esquema/modelo.schema.json'))), vCores = ajv.compile(lerJSON(path.join(RAIZ, 'esquema/cores.schema.json'))), vCat = ajv.compile(lerJSON(path.join(RAIZ, 'esquema/catalogo.schema.json')));
const cores = lerJSON(path.join(RAIZ, 'dados/cores.json'));
if (!vCores(cores)) falha('dados/cores.json', ajv.errorsText(vCores.errors));
const specs = fs.readdirSync(path.join(RAIZ, 'dados/modelos')).filter(f => f.endsWith('.json')).map(f => { const s = lerJSON(path.join(RAIZ, 'dados/modelos', f)); if (!vModelo(s)) falha(`dados/modelos/${f}`, ajv.errorsText(vModelo.errors)); if (`${s.id}.json` !== f) falha(`dados/modelos/${f}`, 'id diferente do nome do arquivo'); for (const c of s.cores.opcoes) if (!cores.esquemas[c]) falha(`dados/modelos/${f}`, `cor ${c} não existe`); return s; });
const cat = lerJSON(path.join(SAIDA, 'catalogo.json'));
if (!vCat(cat)) falha('saida/catalogo.json', ajv.errorsText(vCat.errors));

// ---- 2) e 3) GLB ----
function lerGLB(f) { const b = fs.readFileSync(f), jl = b.readUInt32LE(12); return { b, j: JSON.parse(b.toString('utf8', 20, 20 + jl)), bs: 20 + jl + 8 }; }
async function conferirGLB(f, tipo, spec, versao) {
  const onde = path.relative(RAIZ, f), { b, j, bs } = lerGLB(f);
  const r = await validator.validateBytes(new Uint8Array(b), { uri: path.basename(f), maxIssues: 30 });
  if (r.issues.numErrors) falha(onde, `validador glTF: ${r.issues.numErrors} erro(s): ${r.issues.messages.filter(m => m.severity === 0).map(m => m.code).join(', ')}`);
  if (r.issues.numWarnings) falha(onde, `validador glTF: ${r.issues.numWarnings} aviso(s): ${r.issues.messages.filter(m => m.severity === 1).map(m => m.code).join(', ')}`);
  const mats = j.materials || [], alpha = mats.filter(m => m.alphaMode && m.alphaMode !== 'OPAQUE').length;
  const tri = r.info.totalTriangleCount, mb = b.length / 1048576, ext = j.extensionsUsed || [];
  const dims = (j.images || []).map(im => { const v = j.bufferViews[im.bufferView], o = bs + (v.byteOffset || 0); return [b.readUInt32BE(o + 16), b.readUInt32BE(o + 20)]; });
  const uvMax = Math.max(0, ...j.meshes.map(m => Math.max(0, ...m.primitives.map(p => Object.keys(p.attributes).filter(a => a.startsWith('TEXCOORD_')).length))));
  const cor = j.meshes.some(m => m.primitives.some(p => Object.keys(p.attributes).some(a => a.startsWith('COLOR_'))));
  const malhasPorMaterial = new Map(); j.meshes.forEach(m => m.primitives.forEach(p => malhasPorMaterial.set(p.material, (malhasPorMaterial.get(p.material) || 0) + 1)));
  if (tri > LIM.tri_max) falha(onde, `${tri} triângulos (máx. recomendado ${LIM.tri_max})`); else if (tri > LIM.tri_ideal) aviso(onde, `${tri} triângulos (ideal até ${LIM.tri_ideal})`);
  if (mats.length > LIM.materiais_max) falha(onde, `${mats.length} materiais (máx. ${LIM.materiais_max})`);
  if (tipo === 'web' ? alpha > LIM.alpha_max : alpha > LIM.alpha_ar) falha(onde, `${alpha} material(is) com transparência`);
  if (dims.some(([w, h]) => w > LIM.textura_max || h > LIM.textura_max)) falha(onde, `textura acima de ${LIM.textura_max}`);
  if (uvMax > LIM.uv_por_malha) falha(onde, `${uvMax} conjuntos de UV numa malha`);
  if (cor) falha(onde, 'tem cor por vértice (Scene Viewer não aceita)');
  if (ext.some(e => !LIM.ext_permitidas.includes(e))) falha(onde, `extensões não aceitas pelo Scene Viewer: ${ext.join(', ')}`);
  if ([...malhasPorMaterial.values()].some(n => n > 1)) falha(onde, 'mais de uma malha por material');
  if (mb > LIM.mb_max) falha(onde, `${mb.toFixed(2)} MB (máx. ${LIM.mb_max})`); else if (mb > LIM.mb_rec) aviso(onde, `${mb.toFixed(2)} MB (recomendado até ${LIM.mb_rec})`);
  if (tipo !== 'web') {
    for (const m of mats) { const p = m.pbrMetallicRoughness || {}; if ((p.metallicFactor ?? 1) > 0) falha(onde, `material ${m.name} com metal (no iPhone fica branco)`); if (m.doubleSided) falha(onde, `material ${m.name} com dupla face (o iPhone ignora)`); }
  }
  // caixa e pivô (lidos dos acessores POSITION; o gerador não usa transformação nos nós)
  if ((j.nodes || []).some(n => n.matrix || n.translation || n.rotation || n.scale)) falha(onde, 'nó com transformação (esperado: nenhuma)');
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const m of j.meshes) for (const p of m.primitives) { const a = j.accessors[p.attributes.POSITION]; for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], a.min[i]); mx[i] = Math.max(mx[i], a.max[i]); } }
  const k = tipo === 'mini' ? 0.1 : 1, of = [spec.medidas_m.comprimento, spec.medidas_m.altura, spec.medidas_m.largura].map(v => v * k), caixa = mx.map((v, i) => v - mn[i]), tol = LIM.tol_m * k;
  if (caixa.some((v, i) => Math.abs(v - of[i]) > tol)) falha(onde, `caixa ${caixa.map(v => v.toFixed(3)).join(' x ')} m ≠ oficial ${of.join(' x ')}`);
  if (Math.abs((mn[0] + mx[0]) / 2) > tol || Math.abs((mn[2] + mx[2]) / 2) > tol || Math.abs(mn[1]) > tol) falha(onde, 'pivô fora do centro da base');
  const v = j.asset?.extras?.versao; if (v !== versao) falha(onde, `versão ${v} ≠ catálogo ${versao}`);
  return { arquivo: onde, triangulos: tri, vertices: r.info.totalVertexCount, malhas: j.meshes.length, materiais: mats.length, com_transparencia: alpha, texturas: dims.map(d => d.join('x')), mb: +mb.toFixed(2), caixa_m: caixa.map(v => +v.toFixed(3)), erros_glTF: r.issues.numErrors, avisos_glTF: r.issues.numWarnings, infos_glTF: r.issues.numInfos, versao: v };
}

const resultados = [], usdz = [];
for (const m of cat.modelos) {
  const spec = specs.find(s => s.id === m.id); if (!spec) { falha(m.id, 'está no catálogo mas não tem JSON em dados/modelos'); continue; }
  for (const c of spec.cores.opcoes) if (!m.cores[c]) falha(m.id, `cor ${c} sem arquivos (rode npm run gerar)`);
  for (const [corId, c] of Object.entries(m.cores)) {
    for (const [k, tipo] of [['web', 'web'], ['ar', 'ar'], ['mini', 'mini']]) {
      const f = path.join(SAIDA, c.arquivos[k]); if (!fs.existsSync(f)) { falha(c.arquivos[k], 'arquivo não existe'); continue; }
      resultados.push({ modelo: m.id, cor: corId, tipo, ...(await conferirGLB(f, tipo, spec, m.versao)) });
    }
    for (const [k, tipo] of [['ar_usdz', 'ar'], ['mini_usdz', 'mini']]) { const f = path.join(SAIDA, c.arquivos[k]); if (fs.existsSync(f)) usdz.push({ f, tipo, modelo: m.id, cor: corId, spec, versao: m.versao }); else falha(c.arquivos[k], 'arquivo não existe'); }
  }
}

// ---- 4) USDZ ----
const py = process.env.PYTHON_VALIDAR || process.env.PYTHON || 'python3';
const out = spawnSync(py, [path.join(RAIZ, 'validar/validar_usdz.py'), ...usdz.map(u => u.f)], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
if (out.status !== 0) falha('validar_usdz.py', (out.stderr || '').trim().split('\n').slice(-3).join(' | '));
const linhas = (out.stdout || '').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
const resUsdz = [];
for (const u of usdz) {
  const r = linhas.find(l => path.resolve(l.arquivo) === path.resolve(u.f)), onde = path.relative(RAIZ, u.f); if (!r) { falha(onde, 'não conferido'); continue; }
  const k = u.tipo === 'mini' ? 0.1 : 1, of = [u.spec.medidas_m.comprimento, u.spec.medidas_m.altura, u.spec.medidas_m.largura].map(v => v * k), tol = LIM.tol_m * k;
  if (r.arkit.ok === false) falha(onde, `verificador ARKit: ${r.arkit.erros.slice(0, 3).join(' | ')}`); else if (r.arkit.ok === null) aviso(onde, r.arkit.avisos.join(' | '));
  if (r.usd_validation?.ok === false) falha(onde, `UsdValidation: ${r.usd_validation.erros.slice(0, 3).join(' | ')}`);
  if (r.metros_por_unidade !== 1 || r.eixo_up !== 'Y') falha(onde, `unidade/eixo ${r.metros_por_unidade} ${r.eixo_up}`);
  if (r.caixa_m.some((v, i) => Math.abs(v - of[i]) > tol)) falha(onde, `caixa ${r.caixa_m.join(' x ')} ≠ oficial ${of.join(' x ')}`);
  if (Math.abs(r.centro_xz_m[0]) > tol || Math.abs(r.centro_xz_m[1]) > tol || Math.abs(r.minimo_m[1]) > tol) falha(onde, 'pivô fora do centro da base');
  for (const [campo, txt] of [['com_transparencia', 'transparência'], ['com_metal', 'metal'], ['com_subdivisao', 'subdivisão'], ['com_dupla_face', 'dupla face']]) if (r[campo].length) falha(onde, `${txt}: ${r[campo].join(', ')}`);
  if (Object.values(r.texturas).some(d => !d || d[0] > LIM.textura_max || d[1] > LIM.textura_max)) falha(onde, 'textura inválida ou grande demais');
  if (r.versao !== u.versao || r.versao_assetInfo !== u.versao) falha(onde, `versão ${r.versao} ≠ catálogo ${u.versao}`);
  if (r.bytes / 1048576 > LIM.mb_rec) aviso(onde, `${(r.bytes / 1048576).toFixed(2)} MB`);
  resUsdz.push({ modelo: u.modelo, cor: u.cor, tipo: u.tipo, arquivo: onde, triangulos: r.triangulos, malhas: r.malhas, materiais: r.materiais, texturas: Object.values(r.texturas).map(d => d.join('x')), mb: +(r.bytes / 1048576).toFixed(2), caixa_m: r.caixa_m, arkit: r.arkit.ok === true ? 'Success' : r.arkit.ok === false ? 'FALHOU' : 'não verificado', usd_validation: r.usd_validation?.ok === true ? `0 erros (${r.usd_validation.validadores} validadores)` : r.usd_validation?.ok === false ? 'FALHOU' : 'indisponível', usd: r.arkit.usd, versao: r.versao });
}
// glb (ar) x usdz (ar): mesmos triângulos
for (const u of resUsdz) { const g = resultados.find(r => r.modelo === u.modelo && r.cor === u.cor && r.tipo === u.tipo); if (g && g.triangulos !== u.triangulos) falha(u.arquivo, `triângulos ${u.triangulos} ≠ GLB ${g.triangulos}`); }

// ---- relatório ----
const resumo = { data: new Date().toISOString(), limites: LIM, total_glb: resultados.length, total_usdz: resUsdz.length, falhas, avisos, glb: resultados, usdz: resUsdz };
fs.writeFileSync(path.join(SAIDA, 'validacao.json'), JSON.stringify(resumo, null, 1) + '\n');
const linha = (r) => `${r.modelo.padEnd(21)} ${r.cor.padEnd(13)} ${r.tipo.padEnd(4)} ${String(r.triangulos).padStart(6)} tri ${String(r.materiais).padStart(2)} mat ${r.mb.toFixed(2).padStart(5)} MB  ${r.caixa_m.join(' x ')}`;
console.log('GLB (validador glTF + limites Scene Viewer):'); for (const r of resultados.filter(r => r.cor === 'arco-iris')) console.log('  ' + linha(r) + `  erros ${r.erros_glTF} avisos ${r.avisos_glTF}`);
console.log('USDZ (verificador ARKit):'); for (const r of resUsdz.filter(r => r.cor === 'arco-iris')) console.log('  ' + linha(r) + `  ARKit ${r.arkit} · UsdValidation ${r.usd_validation}`);
console.log(`(as outras cores têm os mesmos números de triângulos; detalhes em saida/validacao.json)`);
console.log(`\n${resultados.length} GLB e ${resUsdz.length} USDZ conferidos. Avisos: ${avisos.length}. Falhas: ${falhas.length}.`);
for (const a of avisos.slice(0, 20)) console.log('  aviso:', a);
for (const f of falhas.slice(0, 40)) console.log('  FALHA:', f);
process.exit(falhas.length ? 1 : 0);
