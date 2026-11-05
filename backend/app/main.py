"""RetailMind API. Demo ownership uses a signed, HttpOnly anonymous session cookie."""
import csv
import hashlib
import hmac
import io
import json
import logging
import os
import secrets
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from fastapi import FastAPI, Request, Response, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import select
from .database import Session, Dataset, Episode, Reflection, Setting, ToolExecution, uid, now, DB_URL
from .data import SAMPLE, clean_records
from . import analytics
from .orchestration import run_query, memory_search, tool_registry, AGENTS

app=FastAPI(title='RetailMind AI',version='1.0.0',docs_url='/api/docs',openapi_url='/api/openapi.json')
origins=[v.strip() for v in os.getenv('ALLOWED_ORIGINS','http://localhost:3000').split(',') if v.strip()]
app.add_middleware(CORSMiddleware,allow_origins=origins,allow_credentials=True,allow_methods=['GET','POST','DELETE'],allow_headers=['Content-Type','Authorization','X-Session-ID'])
SECRET=os.getenv('SESSION_SECRET') or secrets.token_hex(32)
BUCKETS=defaultdict(deque)

@app.middleware('http')
async def guard(request:Request, call_next):
    token=request.cookies.get('retailmind_session','');parts=token.split('.')
    valid=len(parts)==2 and hmac.compare_digest(hmac.new(SECRET.encode(),parts[0].encode(),hashlib.sha256).hexdigest(),parts[1])
    owner=parts[0] if valid else uid()
    request.state.owner=owner
    key=request.client.host if request.client else 'unknown';bucket=BUCKETS[key];stamp=time.monotonic()
    while bucket and stamp-bucket[0]>60:bucket.popleft()
    if len(bucket)>=120:return JSONResponse({'error':'Rate limit exceeded. Retry after one minute.'},429,headers={'Retry-After':'60'})
    bucket.append(stamp)
    if int(request.headers.get('content-length','0') or 0)>5_000_000:return JSONResponse({'error':'Maximum upload size is 5 MB.'},413)
    try:response=await call_next(request)
    except Exception:
        logging.exception('Request failed');return JSONResponse({'error':'Internal processing error. Consult server logs.'},500)
    if not valid:
        signed=owner+'.'+hmac.new(SECRET.encode(),owner.encode(),hashlib.sha256).hexdigest();response.set_cookie('retailmind_session',signed,httponly=True,secure=bool(os.getenv('VERCEL')),samesite='lax',max_age=2592000)
    response.headers['X-Content-Type-Options']='nosniff';response.headers['Referrer-Policy']='strict-origin-when-cross-origin'
    return response

@app.exception_handler(ValueError)
async def value_error(request,exc):return JSONResponse({'error':str(exc)},422)

class Query(BaseModel):
    query:str=Field(min_length=3,max_length=2000)
    datasetId:str|None=None
    dataset_id:str|None=None
    period:str|None=None
class Search(BaseModel): query:str=Field(min_length=1,max_length=2000)
class Feedback(BaseModel): score:int=Field(ge=1,le=5)
class SettingsInput(BaseModel): adaptive:bool=True;theme:str='dark';model:str='rule-based'
class Validate(BaseModel): records:list[dict]=Field(max_length=20000);mapping:dict[str,str]={}

def owner(request:Request):return request.state.owner

def dataframe(request,dataset_id=None):
    user=owner(request)
    with Session() as s:
        setting=s.get(Setting,user+':dataset');selected=dataset_id or (setting.payload.get('datasetId') if setting else 'sample')
        if not selected or selected=='sample':return SAMPLE.copy(),'sample'
        d=s.get(Dataset,selected)
        if not d or d.owner!=user:raise HTTPException(404,'Dataset not found')
        import pandas as pd
        return pd.DataFrame(d.payload['records']),selected

def filter_data(request,dataset_id=None,start=None,end=None,period=None):
    df,id=dataframe(request,dataset_id)
    if period and period != 'all':
        import pandas as pd
        try: days=int(str(period).rstrip('d'))
        except ValueError: raise HTTPException(422,'period must be all, 30d, 90d or 180d')
        start=(pd.to_datetime(df.order_date).max()-pd.Timedelta(days=max(1,min(days,3660))-1)).date().isoformat()
    if start:df=df[df.order_date>=start]
    if end:df=df[df.order_date<=end]
    if df.empty:raise HTTPException(422,'No data in selected period')
    return df,id

@app.get('/api/health')
def health():return {'status':'ok','version':'1.0.0','mode':'LLM-assisted' if os.getenv('OPENAI_API_KEY') else 'Rule-based demo','persistence':'PostgreSQL' if not DB_URL.startswith('sqlite') else 'Ephemeral instance-local SQLite on Vercel' if os.getenv('VERCEL') else 'Persistent local SQLite','llmConfigured':bool(os.getenv('OPENAI_API_KEY'))}

@app.get('/api/dashboard/overview')
def overview(request:Request,start:str|None=None,end:str|None=None,period:str|None=None,dataset_id:str|None=None):
    df,id=filter_data(request,dataset_id=dataset_id,start=start,end=end,period=period);data=analytics.overview(df)
    data['recentEpisodes']=episodes(request)[:5];data['system']=health();data['datasetId']=id
    return data

@app.get('/api/analytics/{category}')
def analysis(category:str,request:Request,start:str|None=None,end:str|None=None,horizon:int=30,product:str|None=None,period:str|None=None,dataset_id:str|None=None):
    if category not in ['sales','customers','inventory','forecast','anomalies']:raise HTTPException(404,'Unknown analysis')
    df,id=filter_data(request,dataset_id=dataset_id,start=start,end=end,period=period)
    if category=='forecast':return analytics.forecast(df,max(1,min(horizon,90)),product)
    return getattr(analytics,category)(df)

@app.post('/api/agents/query')
def query(body:Query,request:Request):
    df,id=filter_data(request,dataset_id=body.datasetId or body.dataset_id,period=body.period);return run_query(body.query,owner(request),df,id)

@app.get('/api/memory/episodes')
def episodes(request:Request,search:str=''):
    with Session() as s:items=[e.payload for e in s.scalars(select(Episode).where(Episode.owner==owner(request)).order_by(Episode.created_at.desc()).limit(200))]
    return [e for e in items if search.lower() in (e.get('query','')+' '+e.get('summary','')).lower()]

@app.get('/api/memory/episodes/{episode_id}')
def episode(episode_id:str,request:Request):
    with Session() as s:
        e=s.get(Episode,episode_id)
        if not e or e.owner!=owner(request):raise HTTPException(404,'Episode not found')
        return e.payload

@app.post('/api/memory/search')
def search(body:Search,request:Request):return memory_search(owner(request),body.query)

@app.post('/api/memory/episodes/{episode_id}/feedback')
def feedback(episode_id:str,body:Feedback,request:Request):
    with Session() as s:
        e=s.get(Episode,episode_id)
        if not e or e.owner!=owner(request):raise HTTPException(404,'Episode not found')
        e.payload={**e.payload,'feedback':body.score};s.commit();return e.payload

@app.get('/api/reflection/history')
def reflections(request:Request):
    with Session() as s:return [{'episodeId':r.episode_id,**r.payload} for r in s.scalars(select(Reflection).where(Reflection.owner==owner(request)))]

@app.post('/api/reflection/evaluate')
def evaluate(body:Query,request:Request):return query(body,request)['reflection']

@app.get('/api/agents/status')
def agents(request:Request):
    history=episodes(request);result=[]
    for id,name,description in AGENTS:
        runs=[e for e in history if id in e['agents']];success=sum(e['status']=='success' for e in runs)
        result.append({'id':id,'name':name,'role':description,'description':description,'status':'Idle','executions':len(runs),'successRate':round(success/len(runs)*100,1) if runs else None,'lastExecution':runs[0]['createdAt'] if runs else None,'performanceScore':round(sum(e['reflection']['score'] for e in runs)/len(runs),1) if runs else None})
    return result

@app.get('/api/agents/executions')
def executions(request:Request):return episodes(request)

@app.get('/api/tools')
def tools(request:Request):return tool_registry(owner(request))

@app.get('/api/tools/performance')
def tools_performance(request:Request):
    with Session() as s:history=[{'id':r.id,'tool':r.tool,'createdAt':r.created_at,**r.payload} for r in s.scalars(select(ToolExecution).where(ToolExecution.owner==owner(request)).order_by(ToolExecution.created_at.desc()).limit(200))]
    return {'tools':tools(request),'history':history}

@app.get('/api/agents/performance')
def performance(request:Request):
    runs=episodes(request);scores=[e['feedback'] for e in runs if e.get('feedback')]
    return {'agents':agents(request),'totalExecutions':len(runs),'successRate':round(sum(e['status']=='success' for e in runs)/len(runs)*100,1) if runs else None,'averageDuration':round(sum(e['duration'] for e in runs)/len(runs),2) if runs else 0,'averageFeedback':round(sum(scores)/len(scores),2) if scores else None,'episodes':runs}

@app.get('/api/datasets')
def datasets(request:Request):
    with Session() as s:items=[{'id':d.id,'name':d.name,'rows':len(d.payload['records']),'columns':d.payload['validation']['columns'],'createdAt':d.created_at,'validation':d.payload['validation']} for d in s.scalars(select(Dataset).where(Dataset.owner==owner(request)))]
    _,active=dataframe(request)
    return [{'id':'sample','name':'RetailMind sample retail sales','rows':len(SAMPLE),'columns':list(SAMPLE.columns),'createdAt':'2026-11-04T00:00:00Z','active':active=='sample','demo':True},*[{**d,'active':d['id']==active,'demo':False} for d in items]]

@app.post('/api/datasets/validate')
def validate(body:Validate):
    _,report=clean_records(body.records,body.mapping);return report

@app.post('/api/datasets/upload')
async def upload(request:Request,file:UploadFile=File(...),mapping:str=Form('{}')):
    if not file.filename or not file.filename.lower().endswith('.csv'):raise HTTPException(422,'Upload a .csv file')
    raw=await file.read(5_000_001)
    if len(raw)>5_000_000:raise HTTPException(413,'Maximum upload size is 5 MB')
    import pandas as pd
    try:
        df=pd.read_csv(io.BytesIO(raw),nrows=20001)
        if len(df)>20000:raise ValueError('Maximum dataset size is 20,000 rows')
        mapped=json.loads(mapping)
        if not isinstance(mapped,dict):raise ValueError('mapping must be a JSON object')
        df,validation=clean_records(df.to_dict(orient='records'),mapped)
    except (UnicodeDecodeError,pd.errors.ParserError,json.JSONDecodeError) as exc:raise HTTPException(422,'Invalid CSV or mapping JSON') from exc
    with Session() as s:
        d=Dataset(owner=owner(request),name=file.filename[:200],payload={'records':analytics.records(df),'validation':validation});s.add(d);s.commit();return {'id':d.id,'name':d.name,'rows':len(df),'validation':validation,'preview':analytics.records(df.head(10))}

@app.post('/api/datasets/{dataset_id}/select')
def select_dataset(dataset_id:str,request:Request):
    dataframe(request,dataset_id)
    with Session() as s:
        key=owner(request)+':dataset';setting=s.get(Setting,key)
        if setting:setting.payload={'datasetId':dataset_id}
        else:s.add(Setting(id=key,owner=owner(request),payload={'datasetId':dataset_id}))
        s.commit()
    return {'activeDataset':dataset_id}

@app.get('/api/datasets/{dataset_id}/preview')
def preview(dataset_id:str,request:Request):
    df,_=dataframe(request,dataset_id);return {'columns':list(df.columns),'rows':analytics.records(df.head(100)),'total':len(df)}

def safe_csv(df):
    df=df.copy()
    for col in df.select_dtypes(include=['object','string']).columns:df[col]=df[col].map(lambda x:"'"+x if isinstance(x,str) and x.startswith(('=','+','-','@','\t','\r')) else x)
    return df.to_csv(index=False)

@app.get('/api/datasets/{dataset_id}/download')
def download(dataset_id:str,request:Request):
    df,_=dataframe(request,dataset_id);return Response(safe_csv(df),media_type='text/csv',headers={'Content-Disposition':'attachment; filename="retail-data.csv"'})

@app.get('/api/settings')
def settings(request:Request):
    with Session() as s:r=s.get(Setting,owner(request)+':routing');value=r.payload if r else {'adaptive':True,'theme':'dark','model':'rule-based','version':1,'history':[]}
    return {**value,'system':health(),'llmModel':os.getenv('OPENAI_MODEL','gpt-4.1-mini'),'authentication':'Signed anonymous demo session; no enterprise identity provider configured.'}

@app.post('/api/settings')
def save_settings(body:SettingsInput,request:Request):
    with Session() as s:
        key=owner(request)+':routing';r=s.get(Setting,key);old=r.payload if r else {'adaptive':True,'theme':'dark','version':0,'history':[]};history=old.get('history',[])+[{'version':old.get('version',0),'adaptive':old.get('adaptive',True),'theme':old.get('theme','dark'),'timestamp':now()}];value={**body.model_dump(),'version':old.get('version',0)+1,'history':history[-20:]}
        if r:r.payload=value
        else:s.add(Setting(id=key,owner=owner(request),payload=value))
        s.commit();return value

@app.post('/api/settings/revert')
def revert_settings(request:Request):
    with Session() as s:
        r=s.get(Setting,owner(request)+':routing')
        if not r or not r.payload.get('history'):raise HTTPException(422,'No prior configuration to restore')
        history=r.payload['history'];prior=history[-1];r.payload={**r.payload,**prior,'version':r.payload['version']+1,'history':history[:-1]};s.commit();return r.payload

@app.get('/api/reports')
def reports(request:Request):return [{'id':e['id'],'title':e['query'],'createdAt':e['createdAt'],'category':e['category'],'summary':e['summary']} for e in episodes(request)]

@app.post('/api/reports/generate')
def generate_report(body:Query,request:Request):return query(body,request)

@app.get('/api/reports/{episode_id}/download')
def export_report(episode_id:str,request:Request,format:str='pdf'):
    e=episode(episode_id,request)
    if format=='csv':
        out=io.StringIO();writer=csv.writer(out);writer.writerow(['section','content']);writer.writerow(['query',e['query']]);writer.writerow(['summary',e['summary']]);writer.writerow(['generated_at',e['createdAt']]);writer.writerow(['dataset',e['dataset']]);writer.writerow(['mode',e['mode']])
        for rec in e['recommendations']:writer.writerow(['recommendation',rec])
        for category,result in e['result'].items():writer.writerow([category,json.dumps(result)])
        return Response(out.getvalue(),media_type='text/csv',headers={'Content-Disposition':'attachment; filename="retailmind-report.csv"'})
    if format!='pdf':raise HTTPException(422,'format must be pdf or csv')
    from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib import colors
    from xml.sax.saxutils import escape
    stream=io.BytesIO();styles=getSampleStyleSheet();story=[Paragraph('RETAILMIND AI | Intelligence Report',styles['Title']),Spacer(1,16)]
    for heading,value in [('Objective',e['query']),('Generated',e['createdAt']),('Execution mode',e['mode']),('Data source',e['dataset']),('Executive summary',e['summary'])]:story.extend([Paragraph(heading,styles['Heading2']),Paragraph(escape(str(value)),styles['BodyText']),Spacer(1,8)])
    story.append(Paragraph('Recommendations',styles['Heading2']))
    for value in e['recommendations']:story.extend([Paragraph(escape(value),styles['BodyText']),Spacer(1,7)])
    story.append(Paragraph('Evidence and methods',styles['Heading2']))
    for name,result in e['result'].items():
        scalar=[(key,str(value)) for key,value in result.items() if isinstance(value,(int,float,str)) or value is None]
        story.append(Paragraph(name.title(),styles['Heading3']))
        for key,value in scalar:story.append(Paragraph(escape(key+': '+value),styles['BodyText']))
    story.append(Paragraph('Limitations',styles['Heading2']))
    for value in e['reflection']['limitations']:story.append(Paragraph(escape(value),styles['BodyText']))
    SimpleDocTemplate(stream,title='RetailMind intelligence report').build(story)
    return Response(stream.getvalue(),media_type='application/pdf',headers={'Content-Disposition':'attachment; filename="retailmind-report.pdf"'})

