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

## Status de cada modelo (semana 2, medido com medir.mjs; validador glTF 0 erros e 0 avisos)

| Limite (Scene Viewer) | 4 m | 6 m | 6 m grande |
|---|---|---|---|
| Materiais (rec. 10) | 7: ok | 7: ok | 7: ok |
| Com alpha (até 2) | 1: ok | 1: ok | 1: ok |
| Texturas (máx. 2048; usamos até 1024; até 6 por modelo) | 5: ok | 5: ok | 5: ok |
| UV por malha (1) | 1: ok | 1: ok | 1: ok |
| Vertex colors (não suportado) | não tem: ok | não tem: ok | não tem: ok |
| Triângulos (ideal 30 a 50 mil; máx. rec. 100 mil) | 14.920: ok | 18.740: ok | 28.324: ok |
| Tamanho (rec. 10 MB) | 1,93 MB: ok | 2,35 MB: ok | 3,38 MB: ok |
| Extensões glTF | nenhuma: ok | nenhuma: ok | nenhuma: ok |

Antes (semana 1) os 3 tinham 11 materiais (acima do recomendado); agora 7.
Teste em aparelho real (Android/iPhone): NÃO FEITO. A RA continua não testada. Quick Look: a conversão de GLB para USDZ é feita pelo model-viewer na hora e não foi verificada (texturas, alphaMode MASK, dupla face e normal map podem se comportar diferente).

## Rede afinada (rodada de 23/09/2026, depois da semana 2)

- Antes: losango de 12 cm, fio de 8 mm (no arquivo, ~4 px de 512), textura 512x512 sem mipmap, corte de alfa 0,5. Ficava escuro/denso e fazia chuvisco (moiré) de longe.
- Agora: losango de 15 cm, fio de ~4,7 mm, textura 1024x1024 (única mudança de tamanho; segue dentro do limite de 1024), mipmap ligado, corte de alfa 0,25, um único material `rede`, MASK, dupla face. Não usa BLEND. Medidas e metas: `medir.mjs` e o validador glTF confirmam 0 erros; nada das metas da semana 2 foi quebrado (ver tabela acima).
- Por que o corte 0,25: com mipmap, o fio fino vira "meio transparente" ao longe; com corte 0,5 ele sumiria aos pedaços. Com 0,25 o fio permanece e ainda fica fino. Fio de 3 px foi testado e deixou falhas (fios sumindo aos pedaços na distância média); 4 px ficou mais regular.
- Comparação com a foto real (gp-13-vista-frontal.jpg): a rede ficou mais leve e com losango mais coerente, mas ainda um pouco mais escura/contrastada que a foto na visão geral. Chuvisco reduzido, não eliminado: ainda aparece em ângulo bem rasante na distância média. Capturas em `capturas-rede/` (antes-* e depois-*, 3 distâncias por modelo), feitas em Chrome headless com renderização por software, que não prova como fica no celular.
- NÃO VERIFICADO: se o Scene Viewer (Android) usa mipmap na textura da rede e se respeita alphaCutoff 0,25. A página oficial do Scene Viewer não diz nada sobre isso. NÃO VERIFICADO: como o Quick Look (iPhone) trata mipmap e o limiar de alfa da rede.

## Arquivo do iPhone (ar.usdz)

- Caminho usado: (c) pacote `usd-core` (módulo `pxr` do Python), script `glb_para_usdz.py`, que lê o `ar.glb` e monta a cena em USD e empacota com `UsdUtils.CreateNewARKitUsdzPackage`. (a) Blender: não está instalado neste computador. (b) exportador USDZ do three.js: não foi tentado, ele precisa de um navegador (canvas) para as texturas e não dá controle do limiar de alfa da rede; por isso ficou o (c).
- Conteúdo: escala em metros, eixo Y para cima; cor, normal e rugosidade preservadas; rede com UsdPreviewSurface, opacidade lida do canal alfa da textura, `opacityThreshold` = 0,25, dupla face. Cada USDZ tem os mesmos triângulos, 7 materiais e 5 texturas do GLB.
- Perda conhecida: a intensidade do normal map (0,8 no GLB) vira 1,0 no USDZ, porque o validador da Apple exige escala 2 no normal de 8 bits.
- Resultado do `usdchecker --arkit`: Success! nos 3. Conferido reabrindo com `verificar_usdz.py`: caixa 4x2x2, 6x2x2 e 6x3x3,8 m (altura no eixo Y), texturas presentes, rede com limiar e dupla face. Pesos: 1,52 MB, 1,87 MB, 2,75 MB (meta: abaixo de 10 MB).
- Captura do USDZ: feita com `usdrecord` (renderizador de teste do próprio USD, em `capturas-usdz/`). NÃO é o Quick Look da Apple; o `qlmanage` deste Mac travou. NÃO VERIFICADO no iPhone real: abertura, escala na tela, aparência da rede e do normal.
- Ligado em `index.html` com `ios-src` para os 3 modelos.

## Rodada de 23/09/2026 (depois do teste no iPhone): rede em geometria, conectores, pivô

Teste real no iPhone mostrou: escala, cores, trama e bolinhas bons; rede NÃO apareceu; conectores de canto brancos; modelo "em cima" do usuário e girando em volta do canto.

1. Rede no `ar.glb` agora é GEOMETRIA: faixas planas finas de 10 mm, uma faixa contínua por diagonal em cada painel, losango de 20 cm, dupla face, material opaco #333, zero materiais com alpha. O `web.glb` mantém a rede em textura (MASK). Variantes testadas em 6 m: fio 10 mm com losango de 15, 20 e 25 cm (12 mm no de 25); escolhido 10 mm x 20 cm (o de 15 cm ficou denso, o de 25 cm deixou o fio irregular). Custo: +1,9 a 2,4 mil triângulos por modelo; o 6 m grande ficou com 30.684 (meta 50.000). Não foi preciso aumentar o losango no 6 m grande.
2. Conectores de canto no `ar.glb`: metalness 0, roughness 0,5, cor #8a8f96. O `web.glb` ficou como estava (metal 0,8), pois a página agora carrega o `ar.glb` também na tela.
3. Pivô: origem no centro da base (x e z de -C/2 a +C/2, y=0 no piso), nos 3 arquivos. Conferido nos acessores POSITION e no USDZ reaberto com pxr.
4. `index.html`: `src` = `ar.glb` (tela e Android), `ios-src` = `ar.usdz`; `ar-placement="floor"`, `ar-scale="fixed"` no botão de tamanho real e um segundo visualizador com `ar-scale="auto"` ("Ver em miniatura").

Como o model-viewer escolhe o arquivo (docs.json oficial, github.com/google/model-viewer): `src` é o modelo para a tela; `ios-src` é usado no Quick Look do iPhone. Não encontrei atributo oficial equivalente para Android: o Scene Viewer recebe o `src` (dedução da documentação, que só descreve `src` e `ios-src`). Por isso o `src` agora é o `ar.glb`. Semântica exata de `ar-scale` e `ar-placement` na doc oficial: NÃO VERIFICADO nesta rodada (só consta que `ar-scale="fixed"` mantém 100 % da escala, já confirmado antes).

Ainda NÃO VERIFICADO: aparência da rede geométrica e dos conectores no iPhone/Android reais; se o pivô resolve o problema relatado. Só um novo teste no celular confirma. Capturas em `capturas-rede-geometrica/` (Chrome headless com renderização por software; nas capturas "antes" a rede em textura aparece bem no Chrome, o problema era só no visualizador do celular; a captura "antes-media" do 4 m/6 m pode sair em branco por falha da captura).

## Miniatura de mesa 1:10 (mini.glb e mini.usdz)

No teste no iPhone 15 Pro Max, o tamanho real funcionou; o botão antigo de miniatura (`ar-scale="auto"` com o USDZ de tamanho real) deixou o usuário dentro do brinquedão. Agora a miniatura tem arquivos próprios, com a escala 1:10 aplicada na geometria (pivô no centro da base, y=0 no piso), e o visualizador usa `ar-scale="fixed"`. Medidas dos mini.usdz conferidas com pxr: 4 m = 0,40 x 0,20 x 0,20 m; 6 m = 0,60 x 0,20 x 0,20 m; 6 m grande = 0,60 x 0,30 x 0,38 m; 7 m = 0,70 x 0,27 x 0,20 m (1/10 dos oficiais). gltf-validator 0 erros e 0 avisos nos 4 mini.glb; `usdchecker --arkit` Success nos 4 mini.usdz. As texturas não foram reescaladas (o desenho dos tatames fica mais denso na miniatura).

NÃO VERIFICADO em aparelho: se o Quick Look (iPhone) e o Scene Viewer (Android) deixam colocar a miniatura sobre uma mesa com `ar-placement="floor"`. A documentação da Apple sobre posicionar em superfícies horizontais como mesas não foi confirmada aqui. Só um novo teste no celular confirma.
