# Converte GLB -> USDZ (iPhone, AR Quick Look) com o usd-core (módulo pxr). Chamado pelo gerar.mjs.
# Uso: python3 glb_para_usdz.py entrada.glb saida.usdz [outra.glb outra.usdz ...]
# Mantém: metros, eixo Y para cima, pivô do GLB, cor/relevo/rugosidade, malhas indexadas, a "versao" e os dados do modelo.
# Não usa: dupla face (o renderizador da Apple ignora; a rede já vem com as duas faces em geometria), transparência, metal.
import sys, json, struct, os, tempfile, shutil
import numpy as np
from pxr import Usd, UsdGeom, UsdShade, Sdf, Gf, UsdUtils, Vt

WRAP = {33071: 'clamp', 10497: 'repeat', 33648: 'mirror'}


def zerar_datas(path):
    # O pacote USDZ é um zip: o pxr grava a hora da geração em cada arquivo interno. Fixamos 01/01/1980
    # para o mesmo JSON gerar sempre os mesmos bytes (o conteúdo, o alinhamento e a falta de compressão não mudam).
    import io, zipfile
    b = bytearray(open(path, 'rb').read())
    for info in zipfile.ZipFile(io.BytesIO(bytes(b))).infolist():
        o = info.header_offset
        if b[o:o + 4] != b'PK\x03\x04': raise SystemExit(f'{path}: zip inesperado')
        b[o + 10:o + 14] = b'\x00\x00\x21\x00'
    e = b.rfind(b'PK\x05\x06'); tam = int.from_bytes(b[e + 12:e + 16], 'little'); o = ini = int.from_bytes(b[e + 16:e + 20], 'little')
    while o < ini + tam:
        if b[o:o + 4] != b'PK\x01\x02': raise SystemExit(f'{path}: diretório do zip inesperado')
        b[o + 12:o + 16] = b'\x00\x00\x21\x00'
        o += 46 + int.from_bytes(b[o + 28:o + 30], 'little') + int.from_bytes(b[o + 30:o + 32], 'little') + int.from_bytes(b[o + 32:o + 34], 'little')
    open(path, 'wb').write(b)


def ler_glb(src):
    b = open(src, 'rb').read()
    jl = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + jl]); bs = 20 + jl + 8
    return b, j, bs


def converter(src, dst):
    b, j, bs = ler_glb(src)

    def acc(i):
        a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]
        n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
        dt = {5126: '<f4', 5125: '<u4', 5123: '<u2'}[a['componentType']]
        o = bs + v.get('byteOffset', 0) + a.get('byteOffset', 0)
        arr = np.frombuffer(b, dtype=dt, count=a['count'] * n, offset=o)
        return arr.reshape(-1, n) if n > 1 else arr

    tmp = tempfile.mkdtemp(); os.makedirs(os.path.join(tmp, 'tex'))
    imgs = []
    for im in j.get('images', []):
        v = j['bufferViews'][im['bufferView']]; o = bs + v.get('byteOffset', 0)
        p = f"tex/{im['name']}.png"; open(os.path.join(tmp, p), 'wb').write(b[o:o + v['byteLength']]); imgs.append(p)

    usd = os.path.join(tmp, 'modelo.usda')
    st = Usd.Stage.CreateNew(usd)
    UsdGeom.SetStageUpAxis(st, UsdGeom.Tokens.y); UsdGeom.SetStageMetersPerUnit(st, 1.0)
    root = UsdGeom.Xform.Define(st, '/Modelo'); st.SetDefaultPrim(root.GetPrim())
    extras = j['asset'].get('extras', {})
    # versão e dados do modelo dentro do arquivo (o validar.mjs confere que os 5 arquivos têm a mesma versão)
    dados = {k: (json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else v) for k, v in extras.items()}
    st.GetRootLayer().customLayerData = dados
    root.GetPrim().SetAssetInfoByKey('identifier', Sdf.AssetPath(f"{extras.get('modelo', 'modelo')}.usdz"))
    root.GetPrim().SetAssetInfoByKey('version', str(extras.get('versao', '')))
    root.GetPrim().SetAssetInfoByKey('name', str(extras.get('nome', '')))
    st.DefinePrim('/Modelo/Materiais', 'Scope')

    def textura(mp, nome, tex_index, canal, srgb, leitor, extra=None):
        tx = j['textures'][tex_index]; smp = j['samplers'][tx['sampler']] if 'sampler' in tx else {}
        t = UsdShade.Shader.Define(st, f'{mp}/{nome}'); t.CreateIdAttr('UsdUVTexture')
        t.CreateInput('file', Sdf.ValueTypeNames.Asset).Set(Sdf.AssetPath('./' + imgs[tx['source']]))
        t.CreateInput('st', Sdf.ValueTypeNames.Float2).ConnectToSource(leitor.ConnectableAPI(), 'result')
        t.CreateInput('wrapS', Sdf.ValueTypeNames.Token).Set(WRAP.get(smp.get('wrapS', 10497), 'repeat'))
        t.CreateInput('wrapT', Sdf.ValueTypeNames.Token).Set(WRAP.get(smp.get('wrapT', 10497), 'repeat'))
        t.CreateInput('sourceColorSpace', Sdf.ValueTypeNames.Token).Set('sRGB' if srgb else 'raw')
        for k, (ty, val) in (extra or {}).items(): t.CreateInput(k, ty).Set(val)
        t.CreateOutput(canal, Sdf.ValueTypeNames.Float3 if canal == 'rgb' else Sdf.ValueTypeNames.Float)
        return t

    mats = []
    for m in j['materials']:
        mp = f"/Modelo/Materiais/{m['name']}"; mat = UsdShade.Material.Define(st, mp)
        sh = UsdShade.Shader.Define(st, mp + '/Superficie'); sh.CreateIdAttr('UsdPreviewSurface')
        pbr = m['pbrMetallicRoughness']; leitor = None
        if any(k in pbr for k in ('baseColorTexture', 'metallicRoughnessTexture')) or 'normalTexture' in m:
            leitor = UsdShade.Shader.Define(st, mp + '/LeitorST'); leitor.CreateIdAttr('UsdPrimvarReader_float2')
            leitor.CreateInput('varname', Sdf.ValueTypeNames.String).Set('st'); leitor.CreateOutput('result', Sdf.ValueTypeNames.Float2)
        if 'baseColorTexture' in pbr:
            bc = textura(mp, 'Cor', pbr['baseColorTexture']['index'], 'rgb', True, leitor)
            sh.CreateInput('diffuseColor', Sdf.ValueTypeNames.Color3f).ConnectToSource(bc.ConnectableAPI(), 'rgb')
        else:  # cor constante (rede em geometria): baseColorFactor já é linear, como o diffuseColor do USD
            f = pbr.get('baseColorFactor', [1, 1, 1, 1]); sh.CreateInput('diffuseColor', Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(f[0], f[1], f[2]))
        sh.CreateInput('metallic', Sdf.ValueTypeNames.Float).Set(float(pbr.get('metallicFactor', 1)))
        if 'metallicRoughnessTexture' in pbr:
            rg = textura(mp, 'Rugosidade', pbr['metallicRoughnessTexture']['index'], 'g', False, leitor)
            sh.CreateInput('roughness', Sdf.ValueTypeNames.Float).ConnectToSource(rg.ConnectableAPI(), 'g')
        else:
            sh.CreateInput('roughness', Sdf.ValueTypeNames.Float).Set(float(pbr.get('roughnessFactor', 1)))
        if 'normalTexture' in m:  # PNG de 8 bits: o padrão do USD pede escala 2 e desvio -1 (o relevo já vem na força final)
            nt = textura(mp, 'Relevo', m['normalTexture']['index'], 'rgb', False, leitor,
                         {'scale': (Sdf.ValueTypeNames.Float4, Gf.Vec4f(2, 2, 2, 1)), 'bias': (Sdf.ValueTypeNames.Float4, Gf.Vec4f(-1, -1, -1, 0))})
            sh.CreateInput('normal', Sdf.ValueTypeNames.Normal3f).ConnectToSource(nt.ConnectableAPI(), 'rgb')
        if m.get('alphaMode', 'OPAQUE') != 'OPAQUE':
            raise SystemExit(f"{src}: material {m['name']} tem transparência; o arquivo de RA não pode ter (iPhone 23/09)")
        sh.CreateOutput('surface', Sdf.ValueTypeNames.Token)
        mat.CreateSurfaceOutput().ConnectToSource(sh.ConnectableAPI(), 'surface')
        mats.append(mat)

    tri = 0
    for me in j['meshes']:
        p = me['primitives'][0]; at = p['attributes']
        pos, nor = acc(at['POSITION']), acc(at['NORMAL'])
        idx = acc(p['indices']).astype(np.int32) if 'indices' in p else np.arange(len(pos), dtype=np.int32)
        g = UsdGeom.Mesh.Define(st, f"/Modelo/{me['name']}")
        g.CreatePointsAttr(Vt.Vec3fArray.FromNumpy(np.ascontiguousarray(pos)))
        g.CreateFaceVertexCountsAttr(Vt.IntArray.FromNumpy(np.full(len(idx) // 3, 3, dtype=np.int32)))
        g.CreateFaceVertexIndicesAttr(Vt.IntArray.FromNumpy(np.ascontiguousarray(idx)))
        g.CreateSubdivisionSchemeAttr('none')
        g.CreateNormalsAttr(Vt.Vec3fArray.FromNumpy(np.ascontiguousarray(nor))); g.SetNormalsInterpolation('vertex')
        if 'TEXCOORD_0' in at:
            uv = acc(at['TEXCOORD_0']).copy(); uv[:, 1] = 1 - uv[:, 1]  # glTF: origem em cima; USD: embaixo
            UsdGeom.PrimvarsAPI(g).CreatePrimvar('st', Sdf.ValueTypeNames.TexCoord2fArray, UsdGeom.Tokens.vertex).Set(Vt.Vec2fArray.FromNumpy(np.ascontiguousarray(uv)))
        g.CreateExtentAttr([Gf.Vec3f(*map(float, pos.min(0))), Gf.Vec3f(*map(float, pos.max(0)))])
        g.CreateDoubleSidedAttr(False)
        UsdShade.MaterialBindingAPI.Apply(g.GetPrim()).Bind(mats[p['material']])
        tri += len(idx) // 3
    st.GetRootLayer().Save()
    os.makedirs(os.path.dirname(os.path.abspath(dst)), exist_ok=True)
    if os.path.exists(dst): os.remove(dst)
    ok = UsdUtils.CreateNewARKitUsdzPackage(Sdf.AssetPath(usd), os.path.abspath(dst))
    shutil.rmtree(tmp)
    if not ok: raise SystemExit(f'falhou: {dst}')
    zerar_datas(dst)
    print(f"usdz ok  {os.path.relpath(dst)}  {os.path.getsize(dst) / 1048576:.2f} MB  {tri} triangulos  versao {extras.get('versao')}")


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a or len(a) % 2: raise SystemExit('uso: python3 glb_para_usdz.py entrada.glb saida.usdz [outra.glb outra.usdz ...]')
    for i in range(0, len(a), 2): converter(a[i], a[i + 1])
