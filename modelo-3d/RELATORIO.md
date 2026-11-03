# Relatório: gerador 3D por modelo e página de RA (03/11/2026)

Para quem lê sem ser técnico: o resumo e o "o que testar" estão no começo. O resto é detalhe para conferência.

## Resumo

1. **Gerador por modelo.** Cada brinquedão agora é um arquivo de texto (JSON) em `dados/modelos/` com as medidas, os módulos (piscina, parede, andar, escorregador, pula-pula, carretinha) e as cores. Um comando (`npm run tudo`) gera todos os arquivos 3D e confere todos eles.
2. **5 modelos × 3 cores.** Kid Play 4 m, 6 m, 6 m grande, 7 m com pula-pula e Carretinha 7 m, nas cores Arco-íris, Azul e amarelo e Rosa e lilás. Cada combinação tem 5 arquivos que saem juntos e levam a mesma versão gravada dentro: `web.glb` (site), `ar.glb` (Android), `ar.usdz` (iPhone), `mini.glb` e `mini.usdz` (miniatura 1:10).
3. **Visual do catálogo real** (escolhido pelo Prado em 03/11), calibrado nas fotos reais do site: isotubo de espuma em gomos de 15 cm, conexões de alumínio, tubo galvanizado aparecendo perto das conexões, rede de nylon preta, tatames com borda arredondada, bolinhas de 9 cm, escorregador de plástico. Nenhum tubo transparente.
4. **Arquivos mais leves**: o arquivo de RA caiu para cerca de metade (ex.: 6 m de 2,52 MB para 1,20 MB; iPhone de 2,03 MB para 0,90 MB).
5. **Correção para o iPhone**: a documentação da Apple diz que o renderizador do iPhone (RealityKit) **não desenha "dupla face"**. A rede em fios de setembro dependia disso, então parte dela podia sumir dependendo do lado. Agora cada fio tem as duas faces desenhadas de verdade.
6. **Página de RA** (`modelo-3d/index.html`): escolher modelo e cores, girar o 3D, "Ver no espaço — tamanho real", "Ver em miniatura na mesa (1:10)", QR para abrir no celular do cliente, botão de compartilhar e o aviso **"Modelo ilustrativo até validação da fábrica"**.
7. **Validação automática**: 45 GLB e 30 USDZ conferidos, **0 falhas e 0 avisos** (detalhe abaixo). Nada disso substitui o teste no celular.

Nada aqui tem preço, R$/m², prazo ou promessa. O preço fica no GP Toys Studio.

## O que testar no celular (só o aparelho confirma)

| # | Teste | Onde | Passou se... |
|---|---|---|---|
| 1 | Abrir a página pelo link da prévia e escolher Kid Play 6 m, Arco-íris | iPhone e Android | o 3D aparece e gira com o dedo |
| 2 | "Ver no espaço — tamanho real" | iPhone | abre o Quick Look; o brinquedão fica no chão com 6 m (meça com passos ou trena) e não dá para aumentar com os dedos |
| 3 | Andar em volta do brinquedão | iPhone | a **rede aparece dos 4 lados**, as conexões ficam cinza (não brancas) e o modelo não gira em volta de um canto |
| 4 | O mesmo no Android | Android | abre o Scene Viewer; se aparecer aviso de "Google Play Services para RA", instale/atualize e tente de novo |
| 5 | "Ver em miniatura na mesa" | os dois | o 6 m aparece com uns 60 cm em cima de uma mesa |
| 6 | Trocar para Azul e amarelo e para a Carretinha | os dois | a RA abre na cor e no modelo escolhidos |
| 7 | Escanear o QR com outro celular | outro aparelho | abre a mesma página já no modelo e cor escolhidos |
| 8 | Modelo maior (6 m grande) no tamanho real | os dois | não trava nem fica lento |
| 9 | Ver com luz do local | os dois | as cores ficam parecidas com as fotos reais (anote se ficaram escuras ou lavadas) |

Se algo falhar, anote o aparelho (modelo e sistema), o modelo/cor e tire um print.

## O que mudou (antes = protótipo de 23/09, branch `modelo-3d-prototipo`)

| Item | Antes | Agora |
|---|---|---|
| Entrada | 1 JSON por modelo com "proporções" fixas de um desenho só | 1 JSON por modelo com **módulos em metros** (de onde até onde vai cada peça), cores por família em `dados/cores.json` e materiais reais em `dados/materiais.json`, com esquema JSON em `esquema/` |
| Saída | `web.glb` e `ar.glb` pelo Node; `ar.usdz` e miniaturas por scripts separados | um comando gera `web.glb`, `ar.glb`, `mini.glb`, `ar.usdz` e `mini.usdz` juntos, com a **mesma versão** gravada nos 5 e no `saida/catalogo.json` |
| Modelos | 4 (Kid Play) | 5 (+ Carretinha 7 m) |
| Cores | 1 | 3 esquemas (dá para criar mais no `dados/cores.json`) |
| Tubos | gomos de 20 cm com folga mostrando anel de metal e trama de tecido | isotubo em gomos de 15 cm encostados (sulco entre eles), espuma lisa; galvanizado aparece só 1,2 cm antes de cada conexão |
| Conexões | só nos 12 cantos | em todas as junções de poste e travessa (cinza sem metal na RA) |
| Rede na RA | fios com "dupla face" (o iPhone ignora) | fios com as duas faces em geometria, opacos, sem transparência |
| Piso | placas lisas | tatames com borda chanfrada (aspecto almofadado das fotos) |
| Bolinhas | 15 cm de diâmetro, soltas em volume | 9 cm, camada densa perto da borda (como nas fotos) |
| Relevo do tubo | força 0,8 no Android e 1,0 no iPhone (diferente) | força já "assada" na imagem: igual nos dois |
| Malha | vértices repetidos (3 por triângulo) | vértices compartilhados com índice: cerca de 1/3 dos vértices, mesmo desenho |
| Página | 4 botões de modelo e 2 visualizadores | modelo + cor, RA real e miniatura, QR, compartilhar, aviso, lista do que é ilustrativo |

### Números medidos (arquivo de RA, cores Arco-íris; nas outras cores os triângulos são os mesmos e o peso varia até 0,05 MB)

| Modelo | Triângulos (antes → agora) | Vértices (antes → agora) | ar.glb MB (antes → agora) | ar.usdz MB (antes → agora) | Materiais |
|---|---|---|---|---|---|
| Kid Play 4 m | 16.760 → 19.592 | 50.280 → 16.746 | 2,09 → 1,02 | 1,67 → 0,77 | 7 → 8 |
| Kid Play 6 m | 20.660 → 25.076 | 61.980 → 20.868 | 2,52 → 1,20 | 2,03 → 0,90 | 7 → 8 |
| Kid Play 6 m grande | 30.684 → 39.248 | 92.052 → 31.602 | 3,60 → 1,68 | 2,94 → 1,22 | 7 → 8 |
| Kid Play 7 m com pula-pula | 24.160 → 30.496 | 72.480 → 26.038 | 3,03 → 1,47 | 2,35 → 1,05 | 8 → 9 |
| Carretinha 7 m | (novo) 26.536 | 22.420 | 1,26 | 0,94 | 9 |

- Mais triângulos que antes por causa da face de trás da rede, das bolinhas menores e em maior número, dos gomos mais curtos e das conexões novas. O maior (6 m grande) fica em 39 mil, abaixo do ideal de 50 mil do Android.
- Texturas da RA: 4 por arquivo (3 de 512 × 512 do isotubo e 1 de 256 × 256 com as cores). O `web.glb` tem mais uma de 1024 × 1024 (rede fina com corte de transparência, só para a tela).
- `mini.glb` e `mini.usdz` têm os mesmos triângulos do tamanho real, com a escala 1:10 aplicada na geometria.
- Caixas medidas dentro dos arquivos: 4 × 2 × 2, 6 × 2 × 2, 6 × 3,8 × 3, 7 × 2 × 2,7 e 7 × 2 × 2,7 m (comprimento × largura × altura), e 1/10 disso nas miniaturas. Pivô no centro da base nos 75 arquivos.
- Tudo em `saida/validacao.json` (gerado pelo `npm run validar`).

## Limites oficiais e como cada arquivo ficou

**Android (Scene Viewer)**, página `developers.google.com/ar/develop/scene-viewer`. Hoje essa página **não abriu nesta sessão** (o endereço está fora da rede liberada da nuvem); os números abaixo são os que foram lidos na própria página em 23/09 (`COMPATIBILIDADE.md`) e conferidos hoje no trecho da mesma página mostrado pela busca.

| Limite (Scene Viewer) | Valor | Nossos arquivos de RA |
|---|---|---|
| Triângulos | recomendado até 100 mil; ideal 30 a 50 mil | 19,6 a 39,2 mil: ok |
| Materiais | recomendado até 10, até 2 com transparência | 8 ou 9, nenhum com transparência: ok |
| Textura | até 2048 × 2048 | até 512 × 512: ok |
| UV | 1 conjunto por malha | 1 (a rede não usa): ok |
| Malhas | 1 malha por material | 1 por material: ok |
| Peso | recomendado até 10 MB (o validador do Google para em 15 MB) | 0,97 a 1,68 MB: ok |
| Extensões glTF | só KHR_materials_unlit e KHR_texture_transform | nenhuma: ok |
| Cor por vértice | não aceita | não usa: ok |
| Eixos e unidade | +Y para cima, frente em +Z, 1 unidade = 1 m | igual: ok |

**iPhone (AR Quick Look / RealityKit)**, lido hoje em `developer.apple.com/documentation/usd/creating-usd-files-for-apple-devices` e `.../validating-usd-files`. A Apple **não publica limite em números** (o "100 mil polígonos e textura 2048" é de uma palestra de 2018, citado em fórum, não está na documentação atual). O que ela diz, e como ficou:

| Orientação da Apple | Nossos USDZ |
|---|---|
| RealityKit não desenha "dupla face" | nenhuma malha usa; a rede tem as duas faces em geometria |
| Evitar transparência; preferir geometria a recorte com transparência | nenhuma transparência (a rede com textura transparente sumiu no iPhone em 23/09) |
| Desligar subdivisão de propósito (`subdivisionScheme = none`) | todas as malhas: ok |
| Aplicar MaterialBindingAPI | aplicado: ok |
| Texturas no USDZ: só JPEG, PNG, EXR ou AVIF | PNG: ok |
| Escala do relevo (normal) não é aceita | relevo já vem na força final na imagem: ok |
| Uma textura "empacotada" por material | rugosidade num canal de uma imagem só: ok |
| Y para cima e metros | ok |
| Validar com `usdchecker` e testar no aparelho | verificador ARKit "Success" nos 30; aparelho: **falta** |

Metal: não há limite oficial, mas no teste de 23/09 os cantos de metal ficaram brancos no iPhone. Nos arquivos de RA o metal é cinza sem efeito de metal (o `web.glb` mantém o brilho de metal só na tela).

## Validação automática (rode `npm run validar`)

| Verificação | Ferramenta | Resultado |
|---|---|---|
| 45 GLB (web, ar, mini × 5 modelos × 3 cores) | validador oficial do glTF (Khronos) 2.0.0-dev.3.10 | 0 erros, 0 avisos, 0 informações (antes: 2 informações em cada ar.glb e mini.glb, já resolvidas) |
| Limites do Scene Viewer e regras do iPhone nos GLB | `validar/validar.mjs` | 0 falhas, 0 avisos |
| 30 USDZ: regras ARKit (o mesmo do `usdchecker --arkit`) | `UsdUtils.ComplianceChecker(arkit=True)`, usd-core 25.8 | Success nos 30 |
| 30 USDZ: validadores novos do USD | `UsdValidation`, usd-core 25.8 (24 validadores) e 26.11 (30 validadores) | 0 erros nos 30, nas duas versões |
| Versão igual nos 5 arquivos e no catálogo | `validar/validar.mjs` | ok nos 5 modelos |
| JSON de entrada e catálogo contra os esquemas | ajv (JSON Schema 2020-12) | ok |

Teste da página em navegador sem tela (Chromium), simulando aparelhos: no "Android", os botões montam o mesmo link do Scene Viewer que o model-viewer 4.0.0 usa (versão 1.2, `ar_preferred`, `resizable=false`); no "iPhone", o mesmo link do Quick Look (`rel="ar"`, com imagem dentro e `#allowsContentScaling=0`); no computador, os botões somem e aparece o QR. Isso confere o link, **não prova que o celular abre a RA**.

Notas para quem for rodar a validação:
- O verificador ARKit existe no usd-core até a versão 25.8 (a 26 trocou pelo UsdValidation). O pacote 25.8 para Linux veio sem a pasta `pluginfo/usdShaders`; sem ela o verificador acusa erro falso em todos os materiais. Aqui a pasta foi copiada de uma instalação 26.11. O script avisa quando falta.
- Para escolher o Python da validação: `PYTHON_VALIDAR=/caminho/python npm run validar`.

## Página de RA

- Arquivos: `index.html`, `ra.js`, `vendor/qrcode.js` (gerador de QR, licença MIT, Kazuhiko Arase) e `saida/`.
- Lê só o `saida/catalogo.json`: um modelo novo aparece sozinho depois do `npm run tudo`.
- Link direto: `.../modelo-3d/?m=kidplay-6m&c=azul-amarelo` (o QR usa esse formato). Se o link vier sem a barra final (`.../modelo-3d`), a página corrige sozinha.
- iPhone: abre `ar.usdz` ou `mini.usdz` com o tamanho travado. Android: abre `ar.glb` ou `mini.glb` no Scene Viewer com o tamanho travado e sem oclusão (as pessoas na frente não "cortam" o modelo).
- Precisa de internet: o visualizador 3D (model-viewer 4.0.0) vem do servidor do Google e as fontes do Google Fonts, como no protótipo.
- `noindex`: a página não aparece no Google.

Hospedagem (para conferir quando houver um link):
- O Android baixa o `.glb` direto (fora do navegador): o link precisa ser público. Se a prévia pedir login da Vercel, a RA no Android não abre.
- O iPhone espera o `.usdz` com o tipo `model/vnd.usdz+zip`. Não conferido na Vercel.
- Esta sessão **não publicou nada**. Ao subir a branch, a Vercel costuma criar sozinha um link de prévia (como fez no PR #2).

## Integração com o GP Toys Studio

- **Ler**: `saida/catalogo.json` (formato em `esquema/catalogo.schema.json`) traz, para cada modelo: nome, medidas oficiais, versão, lista do que é ilustrativo e, para cada cor, os 5 arquivos, triângulos e pesos. O Studio mostra o `web.glb` na tela e usa `ar.glb` / `ar.usdz` para a RA.
- **Criar ou mudar um modelo**: escrever um JSON no formato de `esquema/modelo.schema.json` em `dados/modelos/` e rodar `npm run tudo`. Medidas em metros; módulos com `de_m` e `ate_m` ao longo do comprimento.
- **Cores**: `dados/cores.json` (formato em `esquema/cores.schema.json`), por família: tubos, plataformas, piso, acolchoados, escorregador, pegadas, bolinhas. Rede, conexões, galvanizado, cama do pula-pula e chassi são fixos.
- **Materiais reais → 3D**: `dados/materiais.json`.
- **Preço**: não existe em nenhum arquivo 3D e não deve entrar. Fica no Studio.

## O que continua ilustrativo ou a confirmar com a fábrica

- Só a caixa externa é oficial. Arranjo interno, altura do andar, peças (saguinho, marinho, passagem e soquinho não têm formato conhecido), cores e quantidade de bolinhas desenhada são ilustrativos. A página lista isso em cada modelo.
- **Carretinha**: premissa de que os 7 m × 2 m × 2,70 m incluem cambão, rodas e chassi; chassi de 0,5 m, cambão de 1 m, 2 eixos. Tudo a confirmar.
- **Etaflon 10 mm**: está na lista de materiais, mas o uso exato não foi informado; não foi desenhado como peça própria.
- Cores disponíveis de verdade (os 3 esquemas são exemplos).
- As 11 perguntas de `INVENTARIO.md` continuam valendo (fotos por modelo, planta, formato das peças, alturas).

## Ambiente desta sessão

- Rodou na nuvem: Node 22, three.js 0.170, usd-core 25.8 e 26.11, gltf-validator 2.0.0-dev.3.10, Chromium sem tela (renderização por software, que não prova nada sobre o celular).
- Não abriram daqui (rede da sessão): a página do Google (`developers.google.com`) e o sistema integrado para onde o site manda as rotas `/modelos` e `/respostas`. Para a próxima sessão ler essas páginas direto, os endereços precisam ser liberados nas configurações de rede do ambiente.
- Referência visual usada: as 6 fotos reais do site (`assets/gp-*.jpg`). No Drive e no Notion não havia fotos do catálogo (só material de marketing); nada do Drive foi copiado para cá.
- Tamanho: `saida/` tem 75 arquivos e 87 MB. Os arquivos antigos de `modelos/` saíram da pasta (continuam no histórico do git). Cada nova geração completa soma um tamanho parecido ao histórico do repositório.

## Glossário

- **GLB**: arquivo 3D usado no site e no Android. **USDZ**: arquivo 3D do iPhone.
- **Scene Viewer**: app do Google que mostra 3D em RA no Android. **Quick Look**: o mesmo no iPhone.
- **Triângulo**: menor pedaço do desenho 3D; quanto mais, mais pesado para o celular.
- **Textura**: imagem "pintada" em cima do desenho (cor, relevo, brilho).
- **Pivô**: ponto que o celular usa para apoiar e girar o modelo (aqui: centro da base).
- **Dupla face**: desenhar os dois lados de uma superfície fina. O iPhone ignora essa opção, por isso a rede foi feita com os dois lados de verdade.
- **Validador**: programa oficial que confere se o arquivo segue as regras do formato.
