"""Verify each deployed frontend route and its Next.js application shell."""
import sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
base=sys.argv[1].rstrip('/')
paths=['dashboard','command-center','agents','analytics','sales','customers','inventory','forecasting','memory','reflection','tools','performance','datasets','reports','settings']
def check(path):
    with urllib.request.urlopen(base+'/'+path,timeout=90) as r:
        html=r.read().decode()
        assert r.status==200 and 'RETAILMIND' in html and 'next' in html,(path,r.status)
    return path
with ThreadPoolExecutor(max_workers=4) as pool:
    for path in pool.map(check,paths):print('PASS /'+path)
print('15 frontend route checks passed')
