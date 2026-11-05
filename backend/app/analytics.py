"""Evidence-based retail calculations, ML forecasts, segmentation and anomalies."""
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression

def records(df): return df.replace([np.inf,-np.inf],0).fillna(0).to_dict(orient='records')
def money(x): return round(float(x),2)

def sales(df):
    daily=df.groupby('order_date',as_index=False).agg(revenue=('revenue','sum'),orders=('order_id','nunique'),profit=('profit','sum'))
    monthly=df.assign(month=df.order_date.str[:7]).groupby('month',as_index=False).agg(revenue=('revenue','sum'),profit=('profit','sum'),orders=('order_id','nunique'))
    cats=df.groupby('category',as_index=False).revenue.sum().rename(columns={'category':'name'})
    products=df.groupby(['product_id','product_name'],as_index=False).agg(revenue=('revenue','sum'),quantity=('quantity','sum'),profit=('profit','sum')).sort_values('revenue',ascending=False).rename(columns={'product_name':'name'})
    regions=df.groupby('region',as_index=False).revenue.sum().rename(columns={'region':'name'})
    end=pd.to_datetime(df.order_date).max(); dates=pd.to_datetime(df.order_date)
    current=df[dates>end-pd.Timedelta(days=30)].revenue.sum(); prev=df[(dates<=end-pd.Timedelta(days=30))&(dates>end-pd.Timedelta(days=60))].revenue.sum()
    return {'revenueTrend':records(daily.round(2)),'monthly':records(monthly.round(2)),'categories':records(cats.round(2)),'products':records(products.round(2)),'regions':records(regions.round(2)),'revenue':money(df.revenue.sum()),'profit':money(df.profit.sum()),'growth':money((current/prev-1)*100) if prev else 0,'period':{'start':df.order_date.min(),'end':df.order_date.max()}}

def customers(df):
    end=pd.to_datetime(df.order_date).max()
    c=df.groupby('customer_id',as_index=False).agg(orders=('order_id','nunique'),revenue=('revenue','sum'),lastOrder=('order_date','max'))
    c['recency']=(end-pd.to_datetime(c.lastOrder)).dt.days
    c['churnRisk']=np.where(c.recency>60,'High',np.where(c.recency>30,'Medium','Low'))
    n=min(4,len(c)); features=StandardScaler().fit_transform(c[['orders','revenue','recency']])
    if n>1:
        labels=KMeans(n_clusters=n,random_state=42,n_init=10).fit_predict(features)
        ranks=c.assign(cluster=labels).groupby('cluster').revenue.mean().sort_values().index.tolist()
        names=['Occasional','Developing','Loyal','Champions'][-n:]
        c['segment']=[names[ranks.index(l)] for l in labels]
    else: c['segment']='Developing'
    segments=c.groupby('segment',as_index=False).agg(value=('customer_id','count'),revenue=('revenue','sum')).rename(columns={'segment':'name'})
    return {'customers':records(c.sort_values('revenue',ascending=False).round(2)),'segments':records(segments.round(2)),'total':len(c),'repeatCustomers':int((c.orders>1).sum()),'retention':money((c.orders>1).mean()*100),'averageLifetimeValue':money(c.revenue.mean()),'atRisk':int((c.churnRisk=='High').sum()),'method':'K-Means on standardized frequency, observed spend and recency. Churn risk is a recency heuristic, not a trained churn probability.'}

def inventory(df):
    end=pd.to_datetime(df.order_date).max(); days=max(1,(end-pd.to_datetime(df.order_date).min()).days+1)
    latest=df.sort_values('order_date').groupby('product_id').tail(1)[['product_id','product_name','category','inventory_stock','reorder_level','unit_price','cost','quantity']].copy()
    demand=df.groupby('product_id').quantity.sum()/days
    latest['dailyDemand']=latest.product_id.map(demand)
    latest['daysOfStock']=latest.inventory_stock/latest.dailyDemand.replace(0,np.nan)
    latest['recommendedOrder']=np.maximum(0,np.ceil(latest.dailyDemand*30-latest.inventory_stock)).astype(int)
    latest['status']=np.where(latest.inventory_stock<latest.reorder_level,'Low stock',np.where(latest.daysOfStock>90,'Overstock','Healthy'))
    latest['inventoryValue']=latest.inventory_stock*(latest.cost/latest.quantity)
    return {'products':records(latest.round(2)),'inventoryValue':money(latest.inventoryValue.sum()),'lowStock':int((latest.status=='Low stock').sum()),'overstock':int((latest.status=='Overstock').sum()),'totalUnits':int(latest.inventory_stock.sum()),'method':'Latest recorded stock; reorder target covers 30 days of observed daily demand.'}

def forecast(df,horizon=30,product=None):
    if product: df=df[df.product_id==product]
    if df.empty: raise ValueError('Product not found')
    daily=df.groupby('order_date').revenue.sum(); dates=pd.date_range(daily.index.min(),daily.index.max()); series=daily.reindex(dates.strftime('%Y-%m-%d'),fill_value=0)
    y=series.to_numpy(); n=len(y)
    def features(indices):
        t=np.asarray(indices); return np.column_stack([t,np.sin(2*np.pi*t/7),np.cos(2*np.pi*t/7)])
    split=max(1,n-min(30,max(1,n//5)))
    model=LinearRegression().fit(features(range(split)),y[:split]); validation=np.maximum(0,model.predict(features(range(split,n)))) if split<n else np.array([])
    mae=float(np.mean(np.abs(validation-y[split:]))) if len(validation) else 0
    model.fit(features(range(n)),y); prediction=np.maximum(0,model.predict(features(range(n,n+horizon))))
    residual=y-model.predict(features(range(n))); std=float(np.std(residual))
    future=pd.date_range(dates[-1]+pd.Timedelta(days=1),periods=horizon)
    points=[{'date':d.date().isoformat(),'forecast':money(p),'lower':money(max(0,p-1.96*std)),'upper':money(p+1.96*std)} for d,p in zip(future,prediction)]
    return {'forecast':points,'history':[{'date':d,'revenue':money(v)} for d,v in series.tail(60).items()],'totalForecast':money(prediction.sum()),'mae':money(mae),'mape':money(np.mean(np.abs(validation-y[split:])/np.maximum(y[split:],1))*100) if len(validation) else None,'horizon':horizon,'method':'Linear regression with weekly sine/cosine features; chronological holdout validation. Bands use residual standard deviation and are approximate.','trainingDays':n,'validationDays':n-split,'product':product}

def anomalies(df):
    d=df.groupby('order_date',as_index=False).agg(revenue=('revenue','sum'),orders=('order_id','nunique'),quantity=('quantity','sum'))
    if len(d)<8: return {'anomalies':[],'total':0,'method':'At least eight days required for Isolation Forest.'}
    model=IsolationForest(contamination=.035,random_state=42); d['isAnomaly']=model.fit_predict(d[['revenue','orders','quantity']])==-1; d['score']=-model.score_samples(d[['revenue','orders','quantity']]); a=d[d.isAnomaly].copy(); a['severity']=np.where(a.score>.7,'High','Medium'); a['recommendation']='Verify promotions, missing imports and operational disruptions before taking action.'
    return {'anomalies':records(a.round(3)),'total':len(a),'method':'Isolation Forest on daily revenue, order count and quantity. Statistical flags require business review.'}

def overview(df):
    s=sales(df); c=customers(df); i=inventory(df); orders=df.order_id.nunique()
    insights=[f"Trailing 30-day revenue changed {s['growth']:+.1f}% versus the previous 30 days.",f"{s['products'][0]['name']} leads product revenue at ${s['products'][0]['revenue']:,.2f}.",f"{i['lowStock']} products are below their recorded reorder level.",f"{c['retention']:.1f}% of observed customers made repeat purchases."]
    return {**s,'kpis':{'revenue':s['revenue'],'orders':int(orders),'customers':c['total'],'aov':money(df.revenue.sum()/orders) if orders else 0,'products':int(df.product_id.nunique()),'inventoryValue':i['inventoryValue'],'growth':s['growth'],'retention':c['retention'],'profit':s['profit']},'segments':c['segments'],'inventory':i['products'],'insights':insights}
