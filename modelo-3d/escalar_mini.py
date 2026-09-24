# Gera mini.glb (escala 1:10 na GEOMETRIA) a partir de ar.glb. Uso: python3 escalar_mini.py ar.glb mini.glb
import sys, json, struct
import numpy as np
S = 0.1
b = bytearray(open(sys.argv[1], 'rb').read())
jl = struct.unpack('<I', b[12:16])[0]
j = json.loads(bytes(b[20:20 + jl])); bs = 20 + jl + 8
assert not any('matrix' in n or 'scale' in n or 'translation' in n for n in j['nodes'])
done = set()
for me in j['meshes']:
    for p in me['primitives']:
        i = p['attributes']['POSITION']
        if i in done: continue
        done.add(i); a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]
        o = bs + v.get('byteOffset', 0) + a.get('byteOffset', 0)
        arr = np.frombuffer(b, dtype='<f4', count=a['count'] * 3, offset=o).reshape(-1, 3) * np.float32(S)
        b[o:o + arr.nbytes] = arr.astype('<f4').tobytes()
        a['min'] = [float(x) for x in arr.min(0)]; a['max'] = [float(x) for x in arr.max(0)]
nj = json.dumps(j, separators=(',', ':')).encode(); nj += b' ' * (-len(nj) % 4)
out = bytearray(b[:12]) + struct.pack('<I', len(nj)) + b'JSON' + nj + b[20 + jl:]
struct.pack_into('<I', out, 8, len(out))
open(sys.argv[2], 'wb').write(out)
