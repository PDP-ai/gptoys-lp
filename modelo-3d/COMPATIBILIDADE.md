# Compatibilidade dos modelos 3D com web e realidade aumentada (RA)

Quem lê: pessoa leiga. "Limite" = o que a documentação oficial diz. Consultado em 23/09/2026. Onde não consegui abrir a fonte, está escrito NÃO VERIFICADO.

## Limites (fontes oficiais)

| Item | Web (model-viewer) | Android Scene Viewer | iOS Quick Look |
|---|---|---|---|
| Formato | NÃO VERIFICADO (página do modelviewer.dev não abriu com conteúdo) | glTF 2.0 / GLB (só extensões KHR_materials_unlit e KHR_texture_transform) | Só USDZ é citado na página da Apple; GLB não é citado |
| Materiais | NÃO VERIFICADO | limite recomendado 10, dos quais 2 podem ter alpha | não especificado na página consultada |
| Texturas | NÃO VERIFICADO | máx. 2048 x 2048 | não especificado |
| UVs | NÃO VERIFICADO | 1 UV por malha (limite rígido) | não especificado |
| Triângulos | NÃO VERIFICADO | recomendado até 100 mil; ideal 30 a 50 mil | não especificado |
| Tamanho do arquivo | NÃO VERIFICADO | 10 MB (maiores dão experiência ruim) | não especificado |
| Draco / KTX2 / meshopt | NÃO VERIFICADO | a documentação não menciona suporte | não especificado |

Fontes: developers.google.com/ar/develop/scene-viewer (aberta); developer.apple.com/augmented-reality/quick-look (aberta, sem limites técnicos); modelviewer.dev/docs (NÃO abriu conteúdo). Observação: na página do Google o texto diz "recomendado" para materiais e tamanho; o "máx. 15 MB" informado antes NÃO apareceu nesta leitura e fica NÃO VERIFICADO. Como o site usa `ar-modes="webxr scene-viewer quick-look"`, o iOS depende da conversão automática de GLB para USDZ feita pelo model-viewer, que NÃO VERIFICADO aqui.

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
