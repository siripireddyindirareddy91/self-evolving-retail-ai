"""Real HTTP integration smoke test. Usage: python scripts/smoke.py BASE_URL.
Creates only non-sensitive synthetic demo records in its own anonymous session.
"""
import csv
import http.cookiejar
import io
import json
import sys
import urllib.error
import urllib.request
import uuid
from datetime import date, timedelta


class Client:
    def __init__(self, base):
        self.base = base.rstrip('/')
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.count = 0

    def request(self, path, body=None, method=None, raw=False, headers=None, expected=200):
        data = json.dumps(body).encode() if body is not None else None
        headers = {'User-Agent': 'RetailMind-smoke/1.0', **(headers or {})}
        if data is not None:
            headers['Content-Type'] = 'application/json'
        request = urllib.request.Request(self.base + path, data=data, headers=headers, method=method)
        try:
            response = self.opener.open(request, timeout=120)
        except urllib.error.HTTPError as error:
            if error.code != expected:
                raise AssertionError(f'{path}: HTTP {error.code}: {error.read(500).decode(errors="replace")}') from error
            self.count += 1
            return None
        assert response.status == expected, (path, response.status)
        content = response.read()
        self.count += 1
        print(f'PASS {request.get_method():4} {path}')
        return content if raw else json.loads(content)

    def upload(self, text):
        boundary = 'retailmind-' + uuid.uuid4().hex
        data = (f'--{boundary}\r\nContent-Disposition: form-data; name="mapping"\r\n\r\n{{"date":"order_date","price":"unit_price"}}\r\n'
                f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="http-smoke.csv"\r\nContent-Type: text/csv\r\n\r\n{text}\r\n--{boundary}--\r\n').encode()
        request = urllib.request.Request(self.base + '/api/datasets/upload', data=data,
                    headers={'Content-Type': 'multipart/form-data; boundary=' + boundary}, method='POST')
        with self.opener.open(request, timeout=120) as response:
            assert response.status == 200
            self.count += 1
            print('PASS POST /api/datasets/upload (mapped CSV)')
            return json.load(response)


def check(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    base = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8000'
    client = Client(base)
    health = client.request('/api/health')
    check(health['status'] == 'ok', 'Service health')
    print('Persistence:', health['persistence'])
    overview = client.request('/api/dashboard/overview')
    check(overview['kpis']['orders'] > 0, 'Calculated sample orders')
    short = client.request('/api/dashboard/overview?period=30d')
    check(short['kpis']['orders'] < overview['kpis']['orders'], 'Date filter changes data')
    for category in ['sales', 'customers', 'inventory', 'forecast', 'anomalies']:
        client.request('/api/analytics/' + category)
    check(len(client.request('/api/agents/status')) == 10, 'Ten agent roles')
    check(len(client.request('/api/tools')) >= 5, 'Executable tool registry')
    episode = client.request('/api/agents/query', {'query': 'Generate an executive report across all business performance areas', 'datasetId': 'sample'})
    check(episode['status'] == 'success', 'Workflow completed')
    check(len(episode['result']) == 5, 'Five specialists executed')
    check(len(episode['trace']) >= 6, 'Measured workflow trace')
    eid = episode['id']
    check(any(e['id'] == eid for e in client.request('/api/memory/episodes')), 'Episode persisted')
    client.request('/api/memory/episodes/' + eid)
    check(client.request('/api/memory/search', {'query': 'executive business performance report'}), 'Similarity retrieval')
    check(client.request('/api/reflection/history'), 'Reflection persisted')
    check(client.request('/api/tools/performance')['history'], 'Tool history recorded')
    client.request('/api/memory/episodes/' + eid + '/feedback', {'score': 5})
    client.request('/api/agents/performance')
    client.request('/api/reports')
    check(client.request(f'/api/reports/{eid}/download?format=pdf', raw=True).startswith(b'%PDF'), 'Real PDF export')
    check(b'section,content' in client.request(f'/api/reports/{eid}/download?format=csv', raw=True), 'CSV export')
    outsider = Client(base)
    outsider.request('/api/memory/episodes/' + eid, expected=404)
    print('PASS cross-session episode isolation')
    stream = io.StringIO()
    writer = csv.DictWriter(stream, fieldnames=['order_id', 'date', 'customer_id', 'product_id', 'product_name', 'category', 'quantity', 'price', 'region', 'cost', 'inventory_stock', 'reorder_level'])
    writer.writeheader()
    for i in range(20):
        writer.writerow({'order_id': f'SMOKE-{i}', 'date': (date(2026, 10, 1) + timedelta(days=i)).isoformat(), 'customer_id': f'C{i % 5}', 'product_id': f'P{i % 2}', 'product_name': f'Synthetic product {i % 2}', 'category': 'Test', 'quantity': 2, 'price': 10, 'region': 'North', 'cost': 8, 'inventory_stock': 10, 'reorder_level': 5})
    dataset = client.upload(stream.getvalue())
    did = dataset['id']
    check(dataset['rows'] == 20, 'Mapped upload row count')
    client.request('/api/datasets')
    check(client.request('/api/datasets/' + did + '/preview')['total'] == 20, 'Dataset preview')
    client.request('/api/datasets/' + did + '/select', method='POST')
    uploaded = client.request('/api/dashboard/overview')
    check(uploaded['kpis']['orders'] == 20, 'Selected upload drives dashboard')
    check(uploaded['kpis']['revenue'] == 400, 'Uploaded revenue computed correctly')
    check(b'SMOKE-' in client.request('/api/datasets/' + did + '/download', raw=True), 'Cleaned data export')
    outsider.request('/api/datasets/' + did + '/preview', expected=404)
    print('PASS cross-session dataset isolation')
    client.request('/api/datasets/sample/select', method='POST')
    before = client.request('/api/settings')
    changed = client.request('/api/settings', {'adaptive': not before['adaptive'], 'theme': 'dark'})
    check(changed['adaptive'] != before['adaptive'], 'Configuration updated')
    restored = client.request('/api/settings/revert', method='POST')
    check(restored['adaptive'] == before['adaptive'], 'Configuration reverted')
    client.request('/api/agents/query', {'query': ''}, expected=422)
    client.request('/api/analytics/invalid', expected=404)
    print(f'\nSUCCESS: {client.count + outsider.count} HTTP checks. Synthetic records retained in this isolated demo session.')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'FAIL: {error}', file=sys.stderr)
        sys.exit(1)

