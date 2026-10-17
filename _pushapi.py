import os, base64, json, subprocess, tempfile

TOKEN = os.environ['GHTOKEN']
REPO = 'my788525/street-snacks-collection'
API = 'https://api.github.com'
ROOT = os.path.dirname(os.path.abspath(__file__))
SKIP = {'.git', '.workbuddy', 'node_modules', '_pushapi.py'}

def curl(method, path, data=None):
    url = API + path
    cmd = ['curl', '-s', '-X', method, url,
           '-H', 'Authorization: Bearer ' + TOKEN,
           '-H', 'Accept: application/vnd.github+json',
           '-H', 'User-Agent: push-script']
    tmp = None
    if data is not None:
        cmd += ['-H', 'Content-Type: application/json']
        tmp = tempfile.NamedTemporaryFile('w', suffix='.json', delete=False, encoding='utf-8')
        tmp.write(json.dumps(data)); tmp.close()
        cmd += ['-d', '@' + tmp.name]
    for attempt in range(4):
        try:
            out = subprocess.run(cmd, capture_output=True, text=True, timeout=40)
            if tmp and os.path.exists(tmp.name):
                os.remove(tmp.name)
            if out.returncode != 0:
                print('curl fail', out.stderr[:200]); continue
            rj = json.loads(out.stdout) if out.stdout.strip() else {}
            return rj
        except Exception as e:
            print('err', e, 'retry', attempt)
    raise RuntimeError('API failed: ' + path)

# 0) 初始化：用 Contents API 放一个 README，使仓库脱离空状态（仅首次需要）
try:
    head = curl('GET', '/repos/%s/git/refs/heads/main' % REPO)
    parent = head['object']['sha']
    print('已有 main，parent =', parent[:8])
except Exception:
    readme = ('# 街头小吃模拟经营合集\n\n'
              '12 款独立网页小游戏（蛋烘糕/肠粉/肉夹馍/煎饼果子/臭豆腐/螺蛳粉/小面/热干面/烤冷面/清补凉/炸鸡/驴肉火烧）。\n\n'
              '- `common/` 数据驱动公共引擎\n- `games/<小吃>/` 各带 `profile.js`\n'
              '- 部署：纯静态，Cloudflare Pages 构建命令留空、输出目录为仓库根\n')
    init = curl('PUT', '/repos/%s/contents/README.md' % REPO,
                {'message': 'init', 'content': base64.b64encode(readme.encode()).decode()})
    parent = init['commit']['sha']
    print('init commit', parent[:8])

# 1) 收集文件
files = []
for dp, dn, fns in os.walk(ROOT):
    dn[:] = [d for d in dn if d not in SKIP]
    for fn in fns:
        rel = os.path.relpath(os.path.join(dp, fn), ROOT).replace(os.sep, '/')
        files.append(rel)
files.sort()
print('files:', len(files))

# 2) blobs
tree = []
for rel in files:
    with open(os.path.join(ROOT, rel), 'rb') as f:
        b64 = base64.b64encode(f.read()).decode()
    r = curl('POST', '/repos/%s/git/blobs' % REPO, {'content': b64, 'encoding': 'base64'})
    tree.append({'path': rel, 'mode': '100644', 'type': 'blob', 'sha': r['sha']})
    print('blob', rel, r['sha'][:8])

# 3) tree
tr = curl('POST', '/repos/%s/git/trees' % REPO, {'tree': tree})
print('tree', tr['sha'][:8])

# 4) commit（父 = 现有 main）
cm = curl('POST', '/repos/%s/git/commits' % REPO,
          {'message': '街头小吃模拟经营合集：12 款游戏（公共引擎 + profile 驱动）',
           'tree': tr['sha'], 'parents': [parent]})
print('commit', cm['sha'][:8])

# 5) 更新 main 指向新 commit
ref = curl('PATCH', '/repos/%s/git/refs/heads/main' % REPO, {'sha': cm['sha']})
print('ref', ref.get('ref'), '->', cm['sha'][:8])
print('DONE')
