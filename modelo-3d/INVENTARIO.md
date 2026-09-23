# Inventário dos modelos Kid Play (semana 1, base)

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
