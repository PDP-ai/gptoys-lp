# Modelo 3D do Kid Play (protótipo)

1. O modelo foi desenhado por código (não por IA de imagem): o programa `gerar.mjs` monta tubos, plataformas, rede, bolinhas, parede de escalada e escorregador.
2. O resultado é o arquivo `kidplay-6m.glb`, um formato 3D que celulares e navegadores entendem. Pesa cerca de 3 MB.
3. A página `index.html` mostra o modelo, deixa girar com o dedo e abre a realidade aumentada no celular, no tamanho real.
4. Só a caixa externa tem medida oficial (6 x 2 x 2 m). O interior é ilustrativo e está avisado na página.
5. Cada modelo tem uma configuração em `skus/` (`kidplay-4m.json`, `kidplay-6m.json`, `kidplay-6m-grande.json`). Para gerar: instale o Node, rode `npm install` e use `node gerar.mjs skus/kidplay-6m.json kidplay-6m.glb`.
6. `node medir.mjs arquivo.glb` imprime triângulos, malhas, materiais, texturas, UVs e tamanho. Veja `INVENTARIO.md` (medidas, lacunas para a fábrica) e `COMPATIBILIDADE.md` (limites de Android e iPhone).
7. A página `index.html` tem um seletor com os 3 modelos. Os nomes soquinho, saguinho e marinho da ficha não foram modelados: o arranjo interno é genérico e ilustrativo.
8. Falta: conferir o desenho interno com a GP Toys; reduzir para 10 materiais (hoje 11); testar a realidade aumentada em iPhone e Android reais (NÃO testada); realismo (texturas, rede em losangos, bolas individuais) fica para a semana 2.
9. Nada aqui tem preço, prazo ou promessa. Não faça deploy sem revisão humana.
