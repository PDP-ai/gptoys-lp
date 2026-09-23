# Compatibilidade dos modelos 3D com web e realidade aumentada (RA)

Quem lê: pessoa leiga. "Limite" = o que a documentação oficial diz. Consultado em 23/09/2026. Onde não consegui abrir a fonte, está escrito NÃO VERIFICADO.

## Limites (fontes oficiais)

Reconferido na semana 2 (23/09/2026) abrindo o texto das páginas.

| Item | Web (model-viewer) | Android Scene Viewer | iOS Quick Look |
|---|---|---|---|
| Formato | só glTF/GLB (docs no repositório google/model-viewer, arquivo docs.json, atributo src) | glTF 2.0 / GLB (só extensões KHR_materials_unlit e KHR_texture_transform) | página da Apple cita só USDZ; GLB não é citado |
| Materiais | NÃO VERIFICADO | recomendado 10, dos quais 2 podem ter alpha; "mire no menor número possível" | não especificado na página consultada |
| Texturas | NÃO VERIFICADO | máx. 2048 x 2048 (aviso, não erro) | não especificado |
| UVs | NÃO VERIFICADO | 1 UV por malha (limite rígido, erro do validador) | não especificado |
| Vertex colors | NÃO VERIFICADO | NÃO suportado (erro VERTEX_COLOR_USED) | não especificado |
| Triângulos | NÃO VERIFICADO | recomendado até 100 mil; ideal 30 a 50 mil | não especificado |
| Tamanho do arquivo | NÃO VERIFICADO | recomendado 10 MB ("maiores podem dar experiência ruim"); o validador do Google avisa acima de 15 MB | não especificado |
| Draco / KTX2 / meshopt | NÃO VERIFICADO | só duas extensões aceitas (acima); qualquer outra dá erro UNSUPPORTED_GLTF_EXTENSION_USED | não especificado |
| Modo de primitiva | NÃO VERIFICADO | só lista, tira e leque de triângulos | não especificado |

Sobre o model-viewer (confirmado no docs.json do repositório oficial): sem `ios-src`, com `quick-look` em `ar-modes`, ele gera o USDZ na hora quando o botão de RA é tocado, e a própria documentação diz que "a geração de USDZ não é perfeita". Se essa geração respeita textura, alphaMode MASK e dupla face: NÃO VERIFICADO. `ar-scale="fixed"` mantém 100% da escala (confirmado). `shadow-intensity` padrão é 0 e `environment-image` sem valor usa iluminação neutra padrão (confirmado); estes só afetam a tela do site.

Fontes abertas: developers.google.com/ar/develop/scene-viewer; developer.apple.com/augmented-reality/quick-look (sem limites técnicos); github.com/google/model-viewer (README e packages/modelviewer.dev/data/docs.json). A página modelviewer.dev/docs continua sem conteúdo legível sem JavaScript, por isso usei o arquivo-fonte dela. Os limites de material, textura, triângulos e tamanho do lado da Apple continuam NÃO VERIFICADOS.

## Status de cada modelo (medido com medir.mjs)

| Limite (Scene Viewer) | 4 m | 6 m | 6 m grande |
|---|---|---|---|
| Materiais (rec. 10) | 11: ACIMA | 11: ACIMA | 11: ACIMA |
| Com alpha (até 2) | 1: ok | 1: ok | 1: ok |
| Texturas | 0: ok | 0: ok | 0: ok |
| UV por malha (1) | 1: ok | 1: ok | 1: ok |
| Triângulos | 32.016: ok (perto do ideal) | 43.600: ideal | 72.232: abaixo de 100 mil, acima do ideal |
| Tamanho (10 MB) | 2,21 MB: ok | 3,00 MB: ok | 4,97 MB: ok |
| Validador glTF | 0 erros | 0 erros | 0 erros |
| Draco/KTX2/meshopt | não usa | não usa | não usa |

Teste em aparelho real (Android/iPhone): NÃO FEITO. A RA continua não testada.

## Correção proposta para a semana 2
Os 3 modelos têm 11 materiais (10 cores + a rede transparente). Proposta: fundir cores muito parecidas (por exemplo verde e verde-claro, azul e azul-claro) ou a que menos aparece, chegando a 10 ou menos, sem mudar a aparência de forma notável. Fazer isso junto com a semana 2 (texturas) e reconferir com medir.mjs. Para o 6 m grande, considerar também reduzir triângulos (menos gomos por tubo) rumo a 50 mil.
