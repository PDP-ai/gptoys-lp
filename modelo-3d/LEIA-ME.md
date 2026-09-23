# Modelo 3D do Kid Play (protótipo)

1. O modelo foi desenhado por código (não por IA de imagem): o programa `gerar.mjs` monta tubos, plataformas, rede, bolinhas, parede de escalada e escorregador.
2. O resultado é o arquivo `kidplay-6m.glb`, um formato 3D que celulares e navegadores entendem. Pesa cerca de 3 MB.
3. A página `index.html` mostra o modelo, deixa girar com o dedo e abre a realidade aumentada no celular, no tamanho real.
4. Só a caixa externa tem medida oficial (6 x 2 x 2 m). O interior é ilustrativo e está avisado na página.
5. Para gerar os outros modelos, instale o Node, rode `npm install` nesta pasta e use: `node gerar.mjs comprimento largura altura arquivo.glb`.
6. Exemplos: Kid Play 4 m `node gerar.mjs 4 2 2 kidplay-4m.glb`; 6 m grande `node gerar.mjs 6 3.8 3 kidplay-6m-grande.glb`; 7 m `node gerar.mjs 7 2 2.7 kidplay-7m.glb`.
7. Para cada novo modelo, copie o `index.html` e troque o nome do arquivo e as medidas no texto.
8. Falta: o pula-pula do modelo de 7 m (área 2 x 2 m) ainda não é desenhado; falta conferir o desenho interno com a GP Toys; falta testar a realidade aumentada em iPhone e Android reais.
9. Falta também decidir a cor exata de cada peça com fotos de cada modelo e, se quiserem, texturas nos tatames.
10. Nada aqui tem preço, prazo ou promessa. Não faça deploy sem revisão humana.
