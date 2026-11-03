# Confere arquivos USDZ (iPhone): verificador ARKit do USD (o mesmo do "usdchecker --arkit"), metros, eixo Y,
# sem subdivisão, sem dupla face, sem transparência, sem metal, texturas, caixa, pivô e a "versao" gravada.
# Uso: python3 validar_usdz.py arquivo.usdz [...]   -> imprime uma linha JSON por arquivo
# O verificador ARKit (UsdUtils.ComplianceChecker) existe no usd-core até a 25.8; nas versões novas o script avisa.
import sys, os, json, zipfile, struct
from pxr import Usd, UsdGeom, UsdShade, UsdUtils


def png_dim(b):
    return list(struct.unpack('>II', b[16:24])) if b[:8] == b'\x89PNG\r\n\x1a\n' else None


def conferir(f):
    st = Usd.Stage.Open(f); z = zipfile.ZipFile(f)
    meshes = [UsdGeom.Mesh(p) for p in st.Traverse() if p.IsA(UsdGeom.Mesh)]
    tri = sum(sum(c - 2 for c in m.GetFaceVertexCountsAttr().Get()) for m in meshes)
    rng = UsdGeom.BBoxCache(Usd.TimeCode.Default(), ['default']).ComputeWorldBound(st.GetDefaultPrim()).ComputeAlignedRange()
    mn, mx = rng.GetMin(), rng.GetMax()
    opac, metal, subdiv, dupla = [], [], [], []
    for p in st.Traverse():
        if p.IsA(UsdShade.Shader) and UsdShade.Shader(p).GetIdAttr().Get() == 'UsdPreviewSurface':
            s = UsdShade.Shader(p); o = s.GetInput('opacity'); m = s.GetInput('metallic')
            if o and (o.HasConnectedSource() or (o.Get() is not None and o.Get() < 1)): opac.append(p.GetParent().GetName())
            if m and (m.HasConnectedSource() or (m.Get() or 0) > 0): metal.append(p.GetParent().GetName())
    for m in meshes:
        if m.GetSubdivisionSchemeAttr().Get() != 'none': subdiv.append(m.GetPrim().GetName())
        if m.GetDoubleSidedAttr().Get(): dupla.append(m.GetPrim().GetName())
    texs = {n: png_dim(z.read(n)) for n in z.namelist() if n.lower().endswith(('.png', '.jpg', '.jpeg'))}
    first = z.namelist()[0] if z.namelist() else ''
    res = {
        'arquivo': f, 'bytes': os.path.getsize(f), 'triangulos': tri, 'pontos': sum(len(m.GetPointsAttr().Get()) for m in meshes),
        'malhas': len(meshes), 'materiais': len([p for p in st.Traverse() if p.IsA(UsdShade.Material)]),
        'texturas': texs, 'camada_raiz': first,
        'caixa_m': [round(mx[i] - mn[i], 4) for i in range(3)], 'minimo_m': [round(mn[i], 4) for i in range(3)],
        'centro_xz_m': [round((mn[0] + mx[0]) / 2, 4), round((mn[2] + mx[2]) / 2, 4)],
        'metros_por_unidade': UsdGeom.GetStageMetersPerUnit(st), 'eixo_up': UsdGeom.GetStageUpAxis(st),
        'com_transparencia': opac, 'com_metal': metal, 'com_subdivisao': subdiv, 'com_dupla_face': dupla,
        'versao': st.GetRootLayer().customLayerData.get('versao'),
        'versao_assetInfo': (st.GetDefaultPrim().GetAssetInfo() or {}).get('version'),
    }
    from pxr import Sdr
    sdr_ok = bool(Sdr.Registry().GetShaderNodeByIdentifier('UsdPreviewSurface'))
    if hasattr(UsdUtils, 'ComplianceChecker') and not sdr_ok:
        res['arkit'] = {'ok': None, 'erros': [], 'avisos': ['instalação do usd-core sem as definições de shader (shaderDefs.usda): o verificador daria erro falso; copie a pasta pluginfo/usdShaders de outra instalação'], 'usd': '.'.join(map(str, Usd.GetVersion()))}
    elif hasattr(UsdUtils, 'ComplianceChecker'):
        c = UsdUtils.ComplianceChecker(arkit=True, skipARKitRootLayerCheck=False, rootPackageOnly=False, skipVariants=False, verbose=False)
        c.CheckCompliance(f)
        res['arkit'] = {'ok': not (c.GetErrors() or c.GetFailedChecks()), 'erros': list(c.GetErrors()) + list(c.GetFailedChecks()), 'avisos': list(c.GetWarnings()), 'usd': '.'.join(map(str, Usd.GetVersion()))}
    else:
        res['arkit'] = {'ok': None, 'erros': [], 'avisos': ['verificador ARKit indisponível nesta versão do usd-core (use usd-core==25.8)'], 'usd': '.'.join(map(str, Usd.GetVersion()))}
    # validadores novos do USD (UsdValidation), quando a versão instalada tiver
    try:
        from pxr import UsdValidation
        vals = UsdValidation.ValidationRegistry().GetOrLoadAllValidators()
        erros = UsdValidation.ValidationContext(vals).Validate(st)
        res['usd_validation'] = {'ok': len(erros) == 0, 'validadores': len(vals), 'erros': [e.GetMessage()[:200] for e in erros][:10]}
    except Exception as e:  # versão sem UsdValidation ou com API diferente
        res['usd_validation'] = {'ok': None, 'validadores': 0, 'erros': [], 'aviso': str(e)[:120]}
    return res


if __name__ == '__main__':
    for f in sys.argv[1:]:
        print(json.dumps(conferir(f), ensure_ascii=False))
