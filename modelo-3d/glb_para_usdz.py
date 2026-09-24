# Converte ar.glb -> ar.usdz com pxr (usd-core). Caminho (c). Uso: python3 glb_para_usdz.py entrada.glb saida.usdz
import sys, json, struct, os, tempfile, shutil
import numpy as np
from pxr import Usd, UsdGeom, UsdShade, Sdf, Gf, UsdUtils, Vt

src, dst = sys.argv[1], sys.argv[2]
b = open(src, 'rb').read()
jl = struct.unpack('<I', b[12:16])[0]
j = json.loads(b[20:20 + jl]); bs = 20 + jl + 8

def acc(i):
    a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]
    n = {'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    o = bs + v.get('byteOffset', 0) + a.get('byteOffset', 0)
    return np.frombuffer(b, dtype='<f4', count=a['count'] * n, offset=o).reshape(-1, n)

tmp = tempfile.mkdtemp(); tex = os.path.join(tmp, 'tex'); os.makedirs(tex)
imgs = []
for k, im in enumerate(j['images']):
    v = j['bufferViews'][im['bufferView']]; o = bs + v.get('byteOffset', 0)
    p = f"tex/{im['name']}.png"; open(os.path.join(tmp, p), 'wb').write(b[o:o + v['byteLength']]); imgs.append(p)

usd = os.path.join(tmp, 'modelo.usda')
st = Usd.Stage.CreateNew(usd)
UsdGeom.SetStageUpAxis(st, UsdGeom.Tokens.y); UsdGeom.SetStageMetersPerUnit(st, 1.0)
root = UsdGeom.Xform.Define(st, '/Modelo'); st.SetDefaultPrim(root.GetPrim())
mats = st.DefinePrim('/Modelo/Materiais')

def tex_node(mat, name, path, ch, srgb, uvr, extra=None):
    t = UsdShade.Shader.Define(st, f'{mat}/{name}'); t.CreateIdAttr('UsdUVTexture')
    t.CreateInput('file', Sdf.ValueTypeNames.Asset).Set(Sdf.AssetPath('./' + path))
    t.CreateInput('st', Sdf.ValueTypeNames.Float2).ConnectToSource(uvr.ConnectableAPI(), 'result')
    t.CreateInput('wrapS', Sdf.ValueTypeNames.Token).Set('repeat'); t.CreateInput('wrapT', Sdf.ValueTypeNames.Token).Set('repeat')
    t.CreateInput('sourceColorSpace', Sdf.ValueTypeNames.Token).Set('sRGB' if srgb else 'raw')
    if extra:
        for k, (ty, val) in extra.items(): t.CreateInput(k, ty).Set(val)
    t.CreateOutput(ch, Sdf.ValueTypeNames.Float3 if ch == 'rgb' else Sdf.ValueTypeNames.Float)
    return t

matprims = {}
for m in j['materials']:
    mp = f"/Modelo/Materiais/{m['name']}"; mat = UsdShade.Material.Define(st, mp)
    sh = UsdShade.Shader.Define(st, mp + '/Superficie'); sh.CreateIdAttr('UsdPreviewSurface')
    rd = UsdShade.Shader.Define(st, mp + '/LeitorST'); rd.CreateIdAttr('UsdPrimvarReader_float2')
    rd.CreateInput('varname', Sdf.ValueTypeNames.String).Set('st'); rd.CreateOutput('result', Sdf.ValueTypeNames.Float2)
    pbr = m['pbrMetallicRoughness']
    if 'baseColorTexture' in pbr:
        bc = tex_node(mp, 'Cor', imgs[j['textures'][pbr['baseColorTexture']['index']]['source']], 'rgb', True, rd)
        sh.CreateInput('diffuseColor', Sdf.ValueTypeNames.Color3f).ConnectToSource(bc.ConnectableAPI(), 'rgb')
    else:  # cor constante opaca (rede em geometria): baseColorFactor linear
        f = pbr['baseColorFactor']; sh.CreateInput('diffuseColor', Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(f[0], f[1], f[2]))
    sh.CreateInput('metallic', Sdf.ValueTypeNames.Float).Set(float(pbr.get('metallicFactor', 0)))
    if 'metallicRoughnessTexture' in pbr:
        rg = tex_node(mp, 'Rugosidade', imgs[j['textures'][pbr['metallicRoughnessTexture']['index']]['source']], 'g', False, rd)
        sh.CreateInput('roughness', Sdf.ValueTypeNames.Float).ConnectToSource(rg.ConnectableAPI(), 'g')
    else:
        sh.CreateInput('roughness', Sdf.ValueTypeNames.Float).Set(float(pbr.get('roughnessFactor', 1)))
    if 'normalTexture' in m:
        s = 2.0  # o validador ARKit exige escala 2 (o 'scale' 0.8 do GLB nao e reproduzido no USDZ)
        nt = tex_node(mp, 'Normal', imgs[j['textures'][m['normalTexture']['index']]['source']], 'rgb', False, rd,
                      {'scale': (Sdf.ValueTypeNames.Float4, Gf.Vec4f(s, s, s, 1)), 'bias': (Sdf.ValueTypeNames.Float4, Gf.Vec4f(-1, -1, -1, 0))})
        sh.CreateInput('normal', Sdf.ValueTypeNames.Normal3f).ConnectToSource(nt.ConnectableAPI(), 'rgb')
    if m.get('alphaMode') == 'MASK':
        al = tex_node(mp, 'CorAlfa', imgs[j['textures'][pbr['baseColorTexture']['index']]['source']], 'a', True, rd)
        sh.CreateInput('opacity', Sdf.ValueTypeNames.Float).ConnectToSource(al.ConnectableAPI(), 'a')
        sh.CreateInput('opacityThreshold', Sdf.ValueTypeNames.Float).Set(float(m.get('alphaCutoff', 0.5)))
    sh.CreateOutput('surface', Sdf.ValueTypeNames.Token)
    mat.CreateSurfaceOutput().ConnectToSource(sh.ConnectableAPI(), 'surface')
    matprims[m['name']] = (mat, m.get('doubleSided', False))

tri = 0
for me in j['meshes']:
    p = me['primitives'][0]; at = p['attributes']
    pos, nor, uv = acc(at['POSITION']), acc(at['NORMAL']), acc(at['TEXCOORD_0']).copy()
    assert 'indices' not in p
    uv[:, 1] = 1 - uv[:, 1]
    n = len(pos); tri += n // 3
    g = UsdGeom.Mesh.Define(st, f"/Modelo/{me['name']}")
    g.CreatePointsAttr(Vt.Vec3fArray.FromNumpy(pos)); g.CreateFaceVertexCountsAttr(Vt.IntArray.FromNumpy(np.full(n // 3, 3, dtype=np.int32)))
    g.CreateFaceVertexIndicesAttr(Vt.IntArray.FromNumpy(np.arange(n, dtype=np.int32)))
    g.CreateSubdivisionSchemeAttr('none')
    g.CreateNormalsAttr(Vt.Vec3fArray.FromNumpy(nor)); g.SetNormalsInterpolation('faceVarying')
    UsdGeom.PrimvarsAPI(g).CreatePrimvar('st', Sdf.ValueTypeNames.TexCoord2fArray, 'faceVarying').Set(Vt.Vec2fArray.FromNumpy(uv))
    g.CreateExtentAttr(UsdGeom.Boundable.ComputeExtentFromPlugins(g, 0) or [Gf.Vec3f(*pos.min(0)), Gf.Vec3f(*pos.max(0))])
    mat, dbl = matprims[j['materials'][p['material']]['name']]
    UsdShade.MaterialBindingAPI.Apply(g.GetPrim()).Bind(mat)
    g.CreateDoubleSidedAttr(bool(dbl))
st.GetRootLayer().Save()
os.makedirs(os.path.dirname(os.path.abspath(dst)), exist_ok=True)
if os.path.exists(dst): os.remove(dst)
ok = UsdUtils.CreateNewARKitUsdzPackage(Sdf.AssetPath(usd), os.path.abspath(dst))
print('ok', ok, dst, os.path.getsize(dst), 'bytes', tri, 'triangulos')
shutil.rmtree(tmp)
