"""Integration and analytical invariants, run with unittest."""
import io
import unittest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.data import SAMPLE, clean_records
from backend.app import analytics

class RetailTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.client=TestClient(app)
    def test_sales_invariants(self):
        r=analytics.sales(SAMPLE)
        self.assertAlmostEqual(r['revenue'],float(SAMPLE.revenue.sum()),2)
        self.assertAlmostEqual(sum(p['revenue'] for p in r['products']),r['revenue'],2)
    def test_customer_and_inventory(self):
        c=analytics.customers(SAMPLE);i=analytics.inventory(SAMPLE)
        self.assertEqual(sum(s['value'] for s in c['segments']),SAMPLE.customer_id.nunique())
        self.assertEqual(len(i['products']),SAMPLE.product_id.nunique())
        self.assertGreater(i['lowStock'],0)
    def test_forecast_and_anomalies(self):
        f=analytics.forecast(SAMPLE,14)
        self.assertEqual(len(f['forecast']),14)
        self.assertGreater(f['validationDays'],0)
        self.assertTrue(all(p['lower']<=p['forecast']<=p['upper'] for p in f['forecast']))
        self.assertGreater(analytics.anomalies(SAMPLE)['total'],0)
    def test_data_validation(self):
        records=SAMPLE.head(10).to_dict('records');df,report=clean_records(records+[records[0]])
        self.assertEqual(report['duplicatesRemoved'],1)
        with self.assertRaises(ValueError):clean_records([{'bad':1}])
        records[0]['quantity']=-1
        with self.assertRaises(ValueError):clean_records(records)
    def test_end_to_end(self):
        c=self.client
        self.assertEqual(c.get('/api/health').status_code,200)
        self.assertEqual(c.get('/api/dashboard/overview').status_code,200)
        response=c.post('/api/agents/query',json={'query':'Generate executive report across all business performance areas'})
        self.assertEqual(response.status_code,200,response.text);e=response.json()
        self.assertEqual(e['status'],'success')
        self.assertEqual(len(e['result']),5)
        self.assertGreaterEqual(len(e['trace']),6)
        self.assertTrue(c.get('/api/memory/episodes').json())
        self.assertTrue(c.get('/api/reflection/history').json())
        self.assertTrue(c.post('/api/memory/search',json={'query':'executive business performance report'}).json())
        self.assertTrue(c.get('/api/tools/performance').json()['history'])
        self.assertEqual(c.post(f"/api/memory/episodes/{e['id']}/feedback",json={'score':5}).status_code,200)
        self.assertTrue(c.get(f"/api/reports/{e['id']}/download?format=pdf").content.startswith(b'%PDF'))
        self.assertEqual(c.get(f"/api/reports/{e['id']}/download?format=csv").status_code,200)
        outsider=TestClient(app)
        self.assertEqual(outsider.get(f"/api/memory/episodes/{e['id']}").status_code,404)
    def test_upload_and_settings(self):
        c=self.client;raw=SAMPLE.head(20).to_csv(index=False).encode()
        r=c.post('/api/datasets/upload',files={'file':('sample.csv',raw,'text/csv')})
        self.assertEqual(r.status_code,200,r.text);id=r.json()['id']
        self.assertEqual(c.post(f'/api/datasets/{id}/select').status_code,200)
        self.assertEqual(c.get('/api/dashboard/overview').json()['kpis']['orders'],20)
        self.assertEqual(c.get(f'/api/datasets/{id}/download').status_code,200)
        self.assertEqual(c.post('/api/datasets/sample/select').status_code,200)
        self.assertEqual(c.post('/api/settings',json={'adaptive':False,'theme':'dark'}).status_code,200)
        self.assertFalse(c.get('/api/settings').json()['adaptive'])
        self.assertEqual(c.post('/api/settings/revert').status_code,200)
        self.assertTrue(c.get('/api/settings').json()['adaptive'])
        self.assertEqual(c.post('/api/agents/query',json={'query':''}).status_code,422)
        self.assertEqual(c.get('/api/analytics/invalid').status_code,404)

if __name__=='__main__':unittest.main()
