# Modelo 3D do Kid Play (protótipo)

1. O que é: modelos 3D ilustrativos do brinquedão Kid Play (4 m, 6 m, 6 m grande e 7 m com pula-pula), desenhados por código (não por IA de imagem), com uma página `index.html` que gira o modelo e abre a realidade aumentada (RA). Só a caixa externa tem medida oficial; o interior é ilustrativo.
2. Como gerar os 4 (instale o Node, rode `npm install` uma vez): `node gerar.mjs skus/kidplay-4m.json modelos/kidplay-4m`, o mesmo para `kidplay-6m`, `kidplay-6m-grande` e `kidplay-7m-pula-pula` (cada um cria `web.glb` e `ar.glb`).
3. Para o iPhone, gere o `ar.usdz` de cada um: `python3 glb_para_usdz.py modelos/<modelo>/ar.glb modelos/<modelo>/ar.usdz` (precisa de `pip install usd-core`). Confira com `node medir.mjs arquivo.glb` e `python3 verificar_usdz.py arquivo.usdz`.
4. O que falta: a fábrica confirmar o desenho interno e as peças (ver lacunas no `INVENTARIO.md`); testar a RA em iPhone e Android de verdade (NÃO testada); conferir cores e a rede contra fotos reais.
5. Nada aqui tem preço, prazo ou promessa, e nada está "igual ao real". Não faça deploy sem revisão humana. Limites de Android e iPhone: `COMPATIBILIDADE.md`.
6. Rodada 23/09: `ar.glb` tem rede em geometria (sem transparência) e conectores cinza não-metálicos; origem dos modelos no centro da base. Tamanho real = `ar-scale="fixed"`; a página tem também "Ver em miniatura" (`ar-scale="auto"`). Detalhes em `COMPATIBILIDADE.md`.
