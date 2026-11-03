// Gera os arquivos 3D de cada modelo a partir dos JSON em dados/.
// Uso (na pasta modelo-3d):  npm run gerar            -> todos os modelos, todas as cores
//                            node gerador/gerar.mjs kidplay-6m            -> um modelo
//                            node gerador/gerar.mjs kidplay-6m --cores arco-iris
// Saída: saida/<modelo>/<cor>/{web.glb, ar.glb, mini.glb, ar.usdz, mini.usdz} e saida/catalogo.json.
// Os 5 arquivos de um modelo saem da MESMA execução e levam a mesma "versao" (gravada dentro de cada arquivo).
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { montar, escreverGLB } from './nucleo.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url)), RAIZ = path.resolve(AQUI, '..');
const lerJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const args = process.argv.slice(2), soCor = args.includes('--cores') ? args[args.indexOf('--cores') + 1] : null;
const soModelos = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--cores');

const cores = lerJSON(path.join(RAIZ, 'dados/cores.json')), materiais = lerJSON(path.join(RAIZ, 'dados/materiais.json')).materiais;
const dirModelos = path.join(RAIZ, 'dados/modelos');
const specs = fs.readdirSync(dirModelos).filter(f => f.endsWith('.json')).map(f => lerJSON(path.join(dirModelos, f))).sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99) || a.id.localeCompare(b.id));
for (const s of specs) if (!/^[a-z0-9-]+$/.test(s.id)) throw new Error(`id inválido: ${s.id}`);
const alvo = soModelos.length ? specs.filter(s => soModelos.includes(s.id)) : specs;
if (soModelos.length && alvo.length !== soModelos.length) throw new Error(`modelo não encontrado: ${soModelos.filter(m => !specs.some(s => s.id === m)).join(', ')}`);

// versão = revisão do modelo + resumo (hash) de tudo que influencia o resultado: JSON do modelo, cores, materiais e o código do gerador
const fontes = ['gerador/nucleo.mjs', 'gerador/texturas.mjs', 'gerador/glb_para_usdz.py', 'dados/cores.json', 'dados/materiais.json'].map(f => fs.readFileSync(path.join(RAIZ, f)));
const versaoDe = (spec) => `r${spec.revisao || 1}-${crypto.createHash('sha256').update(JSON.stringify(spec)).update(Buffer.concat(fontes)).digest('hex').slice(0, 10)}`;

const SAIDA = path.join(RAIZ, 'saida'), catPath = path.join(SAIDA, 'catalogo.json');
const catalogo = fs.existsSync(catPath) ? lerJSON(catPath) : { modelos: [] };
const pares = [], novos = [];
const fmt = (n) => String(n).replace('.', ',');
for (const spec of alvo) {
  const versao = versaoDe(spec), opcoes = soCor ? [soCor] : spec.cores.opcoes;
  const entrada = {
    id: spec.id, nome: spec.nome, linha: spec.linha, status: spec.status, versao,
    medidas_m: spec.medidas_m, medidas_texto: `${fmt(spec.medidas_m.comprimento)} m de comprimento × ${fmt(spec.medidas_m.largura)} m de largura × ${fmt(spec.medidas_m.altura)} m de altura`,
    ficha_fabrica: spec.ficha_fabrica, ilustrativo: spec.ilustrativo || [], cor_padrao: spec.cores.padrao, cores: {},
  };
  for (const corId of opcoes) {
    const esq = cores.esquemas[corId]; if (!esq) throw new Error(`${spec.id}: esquema de cores "${corId}" não existe em dados/cores.json`);
    const montado = montar(spec, esq, cores.fixas);
    const meta = { versao, modelo: spec.id, nome: spec.nome, cores: corId, medidas_m: spec.medidas_m, aviso: 'Modelo ilustrativo até validação da fábrica. Só a caixa externa tem medida oficial.' };
    const dir = path.join(SAIDA, spec.id, corId); fs.mkdirSync(dir, { recursive: true });
    const res = {};
    for (const [nome, opts] of [['web', { alvo: 'web' }], ['ar', { alvo: 'ar' }], ['mini', { alvo: 'ar', escala: 0.1 }]]) {
      const { glb, estatisticas } = escreverGLB(montado, materiais, cores.fixas, { ...opts, meta });
      fs.writeFileSync(path.join(dir, `${nome}.glb`), glb); res[nome] = estatisticas;
    }
    // confere a caixa: precisa bater com a medida oficial (até 1 mm) no tamanho real e 1/10 na miniatura
    const of = [spec.medidas_m.comprimento, spec.medidas_m.altura, spec.medidas_m.largura];
    for (const [nome, k] of [['web', 1], ['ar', 1], ['mini', 0.1]]) {
      const c = res[nome].caixa_m; if (c.some((v, i) => Math.abs(v - of[i] * k) > 0.001 * Math.max(k, 0.1))) throw new Error(`${spec.id}/${corId}/${nome}.glb: caixa ${c.join(' x ')} diferente da oficial ${of.map(v => v * k).join(' x ')}`);
    }
    pares.push([path.join(dir, 'ar.glb'), path.join(dir, 'ar.usdz')], [path.join(dir, 'mini.glb'), path.join(dir, 'mini.usdz')]);
    const rel = (f) => `${spec.id}/${corId}/${f}`;
    entrada.cores[corId] = {
      nome: esq.nome, amostra: [...new Set([...esq.tubos, esq.plataformas.deck, esq.escorregador])].slice(0, 4),
      arquivos: { web: rel('web.glb'), ar: rel('ar.glb'), ar_usdz: rel('ar.usdz'), mini: rel('mini.glb'), mini_usdz: rel('mini.usdz') },
      triangulos: { web: res.web.triangulos, ar: res.ar.triangulos, mini: res.mini.triangulos },
      bytes: { web: res.web.bytes, ar: res.ar.bytes, mini: res.mini.bytes },
    };
    console.log(`${spec.id} / ${corId}: web ${res.web.triangulos} tri ${(res.web.bytes / 1048576).toFixed(2)} MB | ar ${res.ar.triangulos} tri ${(res.ar.bytes / 1048576).toFixed(2)} MB | mini ${(res.mini.bytes / 1048576).toFixed(2)} MB | caixa ${res.ar.caixa_m.join(' x ')} m`);
  }
  novos.push(entrada);
}

// iPhone: converte ar.glb -> ar.usdz e mini.glb -> mini.usdz (Python + usd-core) na mesma execução
const py = process.env.PYTHON || 'python3';
const conv = spawnSync(py, [path.join(AQUI, 'glb_para_usdz.py'), ...pares.flat()], { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' });
if (conv.status !== 0) { console.error(conv.stdout || ''); throw new Error('falhou a conversão para USDZ (precisa de: pip install usd-core). Nenhum catálogo foi atualizado.'); }
process.stdout.write(conv.stdout);
for (const e of novos) for (const c of Object.values(e.cores)) for (const k of ['ar_usdz', 'mini_usdz']) c.bytes[k] = fs.statSync(path.join(SAIDA, c.arquivos[k])).size;

// catálogo: o que a página de RA (e o GP Toys Studio) leem para saber quais modelos, cores e arquivos existem
const porId = new Map(catalogo.modelos.map(m => [m.id, m]));
for (const e of novos) { const antigo = porId.get(e.id); if (antigo && soCor) e.cores = { ...antigo.cores, ...e.cores }; porId.set(e.id, e); }
const ordem = specs.map(s => s.id);
const final = {
  $schema: '../esquema/catalogo.schema.json',
  aviso: 'Modelo ilustrativo até validação da fábrica.',
  gerado_por: 'modelo-3d/gerador/gerar.mjs',
  esquemas_cores: Object.fromEntries(Object.entries(cores.esquemas).map(([k, v]) => [k, { nome: v.nome, descricao: v.descricao, amostra: [...new Set([...v.tubos, v.plataformas.deck, v.escorregador])].slice(0, 4) }])),
  modelos: [...porId.values()].sort((a, b) => ordem.indexOf(a.id) - ordem.indexOf(b.id)),
};
fs.writeFileSync(catPath, JSON.stringify(final, null, 2) + '\n');
console.log('catálogo:', path.relative(RAIZ, catPath), '|', final.modelos.length, 'modelos');
