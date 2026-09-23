# Modelo 3D do Kid Play (protótipo)

1. O modelo foi desenhado por código (não por IA de imagem): o programa `gerar.mjs` monta tubos, plataformas, rede, bolinhas, parede de escalada e escorregador.
2. O resultado, para cada modelo, são dois arquivos iguais em `modelos/<modelo>/`: `web.glb` (site) e `ar.glb` (RA). Pesam de 2 a 3,5 MB. As texturas (cores, trama do vinil, rede) são geradas por código em `texturas.mjs`.
3. A página `index.html` mostra o modelo, deixa girar com o dedo e abre a realidade aumentada no celular, no tamanho real.
4. Só a caixa externa tem medida oficial (6 x 2 x 2 m). O interior é ilustrativo e está avisado na página.
5. Cada modelo tem uma configuração em `skus/` (`kidplay-4m.json`, `kidplay-6m.json`, `kidplay-6m-grande.json`). Para gerar: instale o Node, rode `npm install` e use `node gerar.mjs skus/kidplay-6m.json modelos/kidplay-6m`.
6. `node medir.mjs arquivo.glb` imprime triângulos, malhas, materiais, texturas, UVs e tamanho. Veja `INVENTARIO.md` (medidas, lacunas para a fábrica) e `COMPATIBILIDADE.md` (limites de Android e iPhone).
7. A página `index.html` tem um seletor com os 3 modelos. Os nomes soquinho, saguinho e marinho da ficha não foram modelados: o arranjo interno é genérico e ilustrativo.
8. Falta: conferir o desenho interno com a GP Toys; testar a realidade aumentada em iPhone e Android reais (NÃO testada); a semana 2 (realismo) está registrada no INVENTARIO.md.
9. Nada aqui tem preço, prazo ou promessa. Não faça deploy sem revisão humana.
