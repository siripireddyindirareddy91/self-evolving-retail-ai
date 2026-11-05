"""Deterministic synthetic retail data. Every metric is computed from these records."""
import math
import numpy as np
import pandas as pd

PRODUCTS = [
 ('P01','Studio Headphones','Electronics',129,63,48,30),
 ('P02','Everyday Backpack','Accessories',79,32,180,25),
 ('P03','Linen Shirt','Apparel',59,24,18,40),
 ('P04','Running Sneakers','Footwear',119,54,92,35),
 ('P05','Smart Watch','Electronics',199,98,12,25),
 ('P06','Ceramic Mug Set','Home',39,14,240,30),
 ('P07','Cotton Hoodie','Apparel',89,37,76,35),
 ('P08','Desk Lamp','Home',69,28,105,20),
 ('P09','Leather Wallet','Accessories',49,18,56,25),
 ('P10','Trail Shoes','Footwear',139,61,160,25),
 ('P11','Wireless Speaker','Electronics',89,38,32,25),
 ('P12','Organic Towel Set','Home',45,17,310,30),
]

def sample_data():
    rng=np.random.default_rng(42)
    end=pd.Timestamp('2026-11-04')
    rows=[]
    for day_index,day in enumerate(pd.date_range(end-pd.Timedelta(days=364),end)):
        count=int(rng.poisson(12+day_index/70+4*math.sin(day_index/28)))
        if day_index==330: count=3
        for j in range(max(1,count)):
            p=PRODUCTS[int(rng.choice(len(PRODUCTS)))]; quantity=int(rng.integers(1,5)); discount=float(rng.choice([0,.05,.1,.15])); revenue=round(p[3]*quantity*(1-discount),2); cost=p[4]*quantity
            rows.append({'order_id':f'ORD-{day_index:03}-{j:03}','order_date':day.date().isoformat(),'customer_id':f'C{int(rng.integers(1,651)):04}','product_id':p[0],'product_name':p[1],'category':p[2],'quantity':quantity,'unit_price':p[3],'discount':discount,'revenue':revenue,'cost':cost,'profit':round(revenue-cost,2),'region':str(rng.choice(['North','South','East','West'])),'inventory_stock':p[5],'reorder_level':p[6]})
    return pd.DataFrame(rows)

SAMPLE=sample_data()
REQUIRED=['order_id','order_date','customer_id','product_id','product_name','category','quantity','unit_price','region']

def clean_records(records, mapping=None):
    df=pd.DataFrame(records)
    if mapping: df=df.rename(columns=mapping)
    aliases={'date':'order_date','sales':'revenue','price':'unit_price','product':'product_name','customer':'customer_id','stock':'inventory_stock'}
    df=df.rename(columns={k:v for k,v in aliases.items() if k in df and v not in df})
    missing=[c for c in REQUIRED if c not in df]
    if missing: raise ValueError('Map required columns: '+', '.join(missing))
    before=len(df); duplicates=int(df.duplicated().sum()); nulls={c:int(v) for c,v in df.isna().sum().items() if v}
    df=df.drop_duplicates().copy()
    dates=pd.to_datetime(df['order_date'],errors='coerce',utc=True)
    if dates.isna().any(): raise ValueError('order_date contains invalid or missing dates')
    df['order_date']=dates.dt.strftime('%Y-%m-%d')
    for c in ['quantity','unit_price','discount','revenue','cost','profit','inventory_stock','reorder_level']:
        if c in df:
            df[c]=pd.to_numeric(df[c],errors='coerce')
            if df[c].isna().any() or not np.isfinite(df[c]).all(): raise ValueError(c+' must contain finite numbers')
    if (df['quantity']<=0).any() or (df['unit_price']<0).any(): raise ValueError('quantity must be positive and unit_price nonnegative')
    for c in REQUIRED:
        if df[c].isna().any() or df[c].astype(str).str.strip().eq('').any(): raise ValueError(c+' contains missing values')
    if 'discount' not in df: df['discount']=0.
    if ((df['discount']<0)|(df['discount']>1)).any(): raise ValueError('discount must be a fraction between 0 and 1')
    if 'revenue' not in df: df['revenue']=df['quantity']*df['unit_price']*(1-df['discount'])
    if 'cost' not in df: df['cost']=0.
    df['profit']=df['revenue']-df['cost']
    if 'inventory_stock' not in df: df['inventory_stock']=0
    if 'reorder_level' not in df: df['reorder_level']=0
    return df,{'originalRows':before,'rows':len(df),'duplicatesRemoved':duplicates,'missingValues':nulls,'columns':list(df.columns),'valid':True,'warnings':['Cost absent: profit assumes zero cost.'] if 'cost' not in pd.DataFrame(records) else []}
