# Abre um USDZ de volta e confere escala, materiais, texturas, rede (limiar e dupla face). Uso: python3 verificar_usdz.py arquivo.usdz
import sys, zipfile
from pxr import Usd, UsdGeom, UsdShade
f = sys.argv[1]; z = zipfile.ZipFile(f)
st = Usd.Stage.Open(f)
cache = UsdGeom.BBoxCache(Usd.TimeCode.Default(), ['default'])
r = cache.ComputeWorldBound(st.GetDefaultPrim()).ComputeAlignedRange(); s = r.GetSize()
tri = sum(len(p.GetFaceVertexCountsAttr().Get()) for p in (UsdGeom.Mesh(x) for x in st.Traverse() if x.IsA(UsdGeom.Mesh)))
mats = [x for x in st.Traverse() if x.IsA(UsdShade.Material)]
pngs = [n for n in z.namelist() if n.endswith('.png')]
print(f, 'metrosPorUnidade', UsdGeom.GetStageMetersPerUnit(st), 'eixoUp', UsdGeom.GetStageUpAxis(st))
print(' caixa (m): %.3f x %.3f x %.3f' % (s[0], s[1], s[2]), '(comp x altura x largura; eixo Y = altura)')
print(' triangulos', tri, '| materiais', len(mats), '| texturas PNG no pacote', len(pngs), '| peso MB %.2f' % (__import__('os').path.getsize(f) / 1048576))
rede = st.GetPrimAtPath('/Modelo/Materiais/rede/Superficie'); sh = UsdShade.Shader(rede)
print(' rede: opacityThreshold =', sh.GetInput('opacityThreshold').Get(), '| opacity ligado a textura =', sh.GetInput('opacity').HasConnectedSource(), '| doubleSided =', UsdGeom.Mesh(st.GetPrimAtPath('/Modelo/rede')).GetDoubleSidedAttr().Get())
print(' normal ligado no vinil:', UsdShade.Shader(st.GetPrimAtPath('/Modelo/Materiais/vinil_tubo/Superficie')).GetInput('normal').HasConnectedSource(), '| texturas:', sorted(n.split('/')[-1] for n in pngs))
