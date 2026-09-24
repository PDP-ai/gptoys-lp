# Inventário dos modelos Kid Play (semana 1 base, semana 2 realismo)

Texto para leigo. Regra deste projeto: só a caixa externa tem medida oficial. Nada aqui tem preço, prazo ou promessa. Nenhuma foto está identificada com um modelo específico (4 m, 6 m ou 6 m grande), então não afirmamos que "a foto X é o modelo Y".

## O que cada modelo tem de oficial

| | Kid Play 4 m | Kid Play 6 m | Kid Play 6 m grande |
|---|---|---|---|
| Caixa externa (comprimento x largura x altura) | 4 x 2 x 2 m | 6 x 2 x 2 m | 6 x 3,80 x 3 m |
| Estrutura citada na ficha | 2 curvas túnel, 4 soquinhos, 2 morrinhos, 2 passagens geométricas | 3 passagens, 6 saguinhos, 4 marinhos | 6 passagens, 8 saguinhos, 7 marinhos, 4 curvas |
| Escorregador | não citado na ficha | duplo | duplo |
| Bolinhas (ficha) | 500 | 1.000 | 2.500 |

"Soquinho", "saguinho" e "marinho" são nomes internos da fábrica. Não sabemos o formato exato, então NÃO foram desenhados literalmente: o modelo usa peças genéricas (tubos, tatames, piscina, deck, parede de escalada, escorregador, rolo). O arranjo interno é ilustrativo.

## O que as fotos mostram (observação direta, sem medida)

Fotos vistas: gp-13-vista-frontal, gp-14-amarelo-azul, gp-03-parede-escalada, gp-06-crianca-brincando, gp-02-divan-madeira.

1. Estrutura de tubos acolchoados coloridos, encapada com rede preta, com peças metálicas nas quinas (gp-13, gp-03, gp-06).
2. Dois andares: plataformas elevadas coloridas e área térrea (gp-13, gp-03, gp-06).
3. Parede de escalada inclinada com pegadas hexagonais coloridas, ao lado de uma piscina de bolinhas com borda acolchoada (gp-13, gp-03).
4. Escorregador duplo azul saindo de um andar alto, com piso de tatames coloridos em frente (gp-14, gp-02).
5. Rolo ou "morrinho" acolchoado sobre plataforma, painéis com formas vazadas (triângulo, hexágono, círculo) e túnel/tubo (gp-13, gp-06).
6. Instalações reais variam: em uma foto o piso é de grama sintética e a estrutura tem 2 blocos em L (gp-06); em outra há guarda-corpo de aço e piso de madeira do ambiente (gp-02).
7. Uma criança na gp-06 dá noção de escala, mas não permite medir.

Isso NÃO diz qual modelo é qual, nem quantas peças cada um tem.

## Lacunas: o que perguntar à fábrica

Para todos os modelos:
1. Qual foto corresponde a qual modelo (4 m, 6 m, 6 m grande)?
2. Existe planta ou desenho técnico (vista de cima e laterais) de cada modelo?
3. Formato real de soquinho, saguinho, marinho, passagem, curva e morrinho (fotos ou medidas de cada peça).
4. Altura dos andares, do deck e do topo do escorregador.
5. Cores oficiais de cada peça (o modelo usa cores das fotos, de forma aproximada).
6. Que material e cor a rede tem e como ela envolve a estrutura.
7. Dimensões do escorregador e da parede de escalada; tamanho da piscina e da borda.
8. Os modelos são iguais às fotos ou existem variações por cliente?

Só 4 m: 9. Onde ficam as 2 curvas túnel e os 2 morrinhos? Há escorregador? A ficha não cita.
Só 6 m: 10. Onde ficam as 3 passagens e como o escorregador duplo se conecta ao deck?
Só 6 m grande: 11. A altura de 3 m tem mais de 2 andares? Como ficam as 4 curvas e o dobro de passagens na largura de 3,80 m?

## Relatório-base (medido com `node medir.mjs`)

Referência do 6 m antes da mudança: 43,6 mil triângulos, 14 malhas, 11 materiais (1 com alpha), 0 texturas. Bateu com o medido.

| Modelo | Triângulos | Malhas | Materiais (com alpha) | Texturas | Extensões | UVs (malhas com UV / máx. por malha) | Tamanho |
|---|---|---|---|---|---|---|---|
| Kid Play 4 m | 32.016 | 14 | 11 (1) | 0 | nenhuma | 4 / 1 | 2,21 MB |
| Kid Play 6 m | 43.600 | 14 | 11 (1) | 0 | nenhuma | 4 / 1 | 3,00 MB |
| Kid Play 6 m grande | 72.232 | 14 | 11 (1) | 0 | nenhuma | 4 / 1 | 4,97 MB |

As 4 malhas com UV são as paredes de rede transparente. Validador glTF (gltf-validator 2.0.0-dev.3.10): 0 erros nos 3, 0 avisos. Compatibilidade com Android e iPhone: veja COMPATIBILIDADE.md.

## Como os 3 foram gerados
Cada modelo tem um arquivo em `skus/`. O 6 m gerado pela configuração ficou IDÊNTICO byte a byte ao GLB anterior (mesmo tamanho e conteúdo). O 4 m e o 6 m grande reusam os mesmos módulos, escalados para a caixa externa oficial; a altura do deck (1,0 m no 4 m e no 6 m; 1,5 m no grande) e a posição do escorregador são ilustrativas. Medidas lidas no navegador (comprimento x altura x largura): 4 x 2,02 x 2 m, 6 x 2,02 x 2 m e 6 x 3,02 x 3,8 m. Os 0,02 m a mais na altura vêm dos tubos do protótipo.


## Semana 2: realismo dentro dos limites de RA (antes x depois, medido com `node medir.mjs`)

Arquivos agora em `modelos/<modelo>/web.glb` e `ar.glb`. Nesta semana os dois são IGUAIS byte a byte (não houve ganho de compressão medido; nada de Draco, KTX2 ou meshopt). O model-viewer usa o `src` atual também na RA, por isso a página carrega o `web.glb` (não existe atributo separado para "arquivo de RA"). Validador glTF: 0 erros e 0 avisos nos 6 arquivos.

| Meta | Semana 1 (4 m / 6 m / 6 m grande) | Semana 2 (4 m / 6 m / 6 m grande) | Meta batida? |
|---|---|---|---|
| Materiais (máx. 10) | 11 / 11 / 11 | 7 / 7 / 7 | sim |
| Materiais com alpha (máx. 1) | 1 / 1 / 1 | 1 / 1 / 1 (rede, MASK) | sim |
| Triângulos (máx. 50.000) | 32.016 / 43.600 / 72.232 | 14.920 / 18.740 / 28.324 | sim (o 6 m grande caiu 61%) |
| UV por malha (1) | 1 / 1 / 1 | 1 / 1 / 1 | sim |
| Vertex colors | não | não | sim |
| Texturas (máx. 6, até 1024 x 1024) | 0 | 5 por modelo: 512, 512, 512, 256, 512 | sim |
| Extensões glTF | nenhuma | nenhuma | sim |
| Peso (máx. 10 MB) | 2,21 / 3,00 / 4,97 MB | 1,92 / 2,34 / 3,37 MB | sim |
| Caixa medida dentro do arquivo (comp. x alt. x larg.) | 4 x 2,02 x 2 / 6 x 2,02 x 2 / 6 x 3,02 x 3,8 | 4 x 2 x 2 / 6 x 2 x 2 / 6 x 3 x 3,8 | sim (tirei os 2 cm a mais) |

Nenhuma meta ficou de fora. O que NÃO foi possível medir: desempenho em celular real e a conversão automática para USDZ no iPhone.

### Como ficaram os 7 materiais (um por família)
1. Vinil de tubo (trama em normal map e mapa de rugosidade, 512 x 512 cada, uma célula por gomo, cor vem do atlas). 2. Plataforma (vinil liso e brilhante, cor do atlas). 3. Tatame. 4. Escorregador de plástico (também as pegadas hexagonais da parede). 5. Bolinhas (uma geometria só, 20 triângulos cada, sorteadas por seed). 6. Metal (miolo dos tubos e capas de canto). 7. Rede (painéis com losangos pretos, alphaMode MASK, dupla face, textura 512 x 512 que cobre 1 m).
O atlas de cores tem 256 x 256 (4 x 4 amostras). Cada peça aponta o UV para a amostra da sua cor; por isso não há vertex color. Cores calibradas por amostragem das fotos gp-13 e gp-14 (aproximadas, não oficiais).

### O que melhorou (comparando capturas em `capturas/` da semana 1 com `capturas-semana2/`)
- Tubos com gomos abaulados, trama de vinil visível de perto e anéis de metal entre os gomos, como nas fotos.
- Rede de losangos pretos no lugar do plano acinzentado quase transparente.
- Bolinhas individuais e mais numerosas na visão de perto; escorregador em duas calhas em U; cantos com capas de metal.
- Fundo do site com iluminação neutra e sombra moderada (só na tela do site).

### O que continua aproximado (não é "igual ao real")
- Interior (módulos, deck, posições, cores por peça) é ilustrativo; só a caixa externa é oficial.
- A quantidade de bolinhas desenhada não é a da ficha (500 / 1.000 / 2.500) e a página não diz isso.
- Tatames e plataformas são cor lisa com brilho: não têm a trama/ruga do vinil porque o modelo só pode ter um conjunto de UV e as cores vêm do atlas (trama só nos tubos).
- Rede: sem mipmap na textura (para o fio não sumir de longe). De longe aparece moiré e a rede é mais densa que na foto ao ver o modelo inteiro. Se o modo de RA (Scene Viewer ou a conversão para USDZ) respeita esse ajuste: NÃO VERIFICADO.
- RA continua NÃO testada em aparelho real; as capturas foram feitas em Chrome headless (software), que não prova nada sobre iPhone ou Android.

## Peças inspiradas nas fotos (semana 3)
Acrescentadas aos 4 modelos, INSPIRADAS nas fotos gp-13, gp-14, gp-03 e gp-06 e SEM medida oficial (tamanho, posição e cor são ilustrativos): 3 saquinhos-pêndulo azuis pendurados por cordas numa travessa alta sobre o deck; um túnel cilíndrico deitado no deck (com dois anéis nas pontas); um painel azul com janela triangular vazada na borda do deck; o rolo no deck já existia. Usam os materiais que já existiam (plataforma e metal); nenhum material novo.
