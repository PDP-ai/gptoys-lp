# Modelos 3D e realidade aumentada (RA) dos brinquedões GP Toys

1. **O que é**: um gerador que transforma um arquivo de texto (JSON) de cada brinquedão em arquivos 3D para o site, o Android e o iPhone, e uma página (`index.html`) para mostrar o brinquedão no espaço do cliente na visita técnica. **Modelo ilustrativo até validação da fábrica**: só a caixa externa tem medida oficial.
2. **Modelos e cores**: um JSON por modelo em `dados/modelos/` (medidas, módulos, cores disponíveis); cores por família em `dados/cores.json`; materiais reais em `dados/materiais.json`. Formatos em `esquema/` (servem para o GP Toys Studio).
3. **Gerar e conferir tudo** (uma vez: instale Node e Python, rode `npm install` e `pip install usd-core`):
   - `npm run tudo` → cria `saida/<modelo>/<cor>/` com `web.glb`, `ar.glb`, `ar.usdz`, `mini.glb`, `mini.usdz` (mesma versão nos 5) e o `saida/catalogo.json`; depois valida tudo e grava `saida/validacao.json`.
   - Só um modelo: `node gerador/gerar.mjs kidplay-6m` · só uma cor: `--cores azul-amarelo`.
4. **Página**: abra `modelo-3d/` pelo link do site (não pelo arquivo no computador). Escolha modelo e cores, toque em "Ver no espaço — tamanho real" ou "miniatura 1:10". O QR abre a mesma escolha em outro celular.
5. **Regras**: nada de preço, R$/m², prazo ou promessa nestes arquivos (preço fica no Studio). Não publicar sem revisão humana. Resultados, limites oficiais e o que testar no celular: `RELATORIO.md`.
