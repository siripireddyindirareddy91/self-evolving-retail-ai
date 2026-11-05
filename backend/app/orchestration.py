"""LangGraph supervised workflow with auditable adaptive tool ranking."""
import os
import re
import time
from typing import TypedDict, Any
from concurrent.futures import ThreadPoolExecutor
from sqlalchemy import select
from langgraph.graph import StateGraph, START, END
from .database import Session, Episode, Reflection, ToolExecution, Setting, uid, now
from . import analytics

AGENTS=[('supervisor','Retail Supervisor','Classifies tasks and combines evidence'),('sales','Sales Analytics','Revenue, margin, product and regional analysis'),('customers','Customer Intelligence','RFM segmentation and observed retention'),('inventory','Inventory Intelligence','Stock coverage and replenishment'),('forecast','Demand Forecasting','Time-aware regression with holdout validation'),('anomalies','Anomaly Detection','Isolation Forest statistical flags'),('memory','Memory','Owner-scoped episode retrieval'),('reflection','Reflection','Evaluate data coverage and execution outcomes'),('tools','Adaptive Tool Selection','Explainable reliability-weighted selection'),('reports','Report Generation','Executive findings and exports')]
TOOLS=[('sales','Sales Calculation Tool',['sales','report'],'Aggregates actual transaction values'),('customers','Customer Segmentation Tool',['customers','report'],'K-Means and repeat purchase calculations'),('inventory','Inventory Analysis Tool',['inventory','report'],'Recorded stock and observed demand'),('forecast','Demand Forecasting Tool',['forecast','report'],'Linear regression and chronological holdout'),('anomalies','Anomaly Detection Tool',['anomalies','report'],'Isolation Forest on daily patterns')]

class AgentState(TypedDict,total=False):
    query:str
    owner:str
    df:Any
    dataset:str
    category:str
    categories:list
    selected:list
    memories:list
    results:dict
    errors:list
    trace:list
    reflection:dict
    episode:dict
    started:float

def memory_search(owner,query,limit=5):
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    with Session() as s: episodes=[e.payload for e in s.scalars(select(Episode).where(Episode.owner==owner).order_by(Episode.created_at.desc()).limit(200))]
    if not episodes:return []
    texts=[query]+[e.get('query','')+' '+e.get('summary','') for e in episodes]
    try:
        matrix=TfidfVectorizer(stop_words='english').fit_transform(texts); scores=cosine_similarity(matrix[0],matrix[1:])[0]
    except ValueError: scores=[0]*len(episodes)
    return [{**e,'similarity':round(float(score),4)} for e,score in sorted(zip(episodes,scores),key=lambda x:x[1],reverse=True)[:limit] if score>0]

def tool_registry(owner):
    with Session() as s: runs=list(s.scalars(select(ToolExecution).where(ToolExecution.owner==owner)))
    output=[]
    for id,name,categories,description in TOOLS:
        history=[r for r in runs if r.tool==id]; success=sum(r.payload.get('success',False) for r in history); count=len(history)
        output.append({'id':id,'name':name,'description':description,'categories':categories,'executions':count,'successRate':round(success/count*100,1) if count else None,'averageDuration':round(sum(r.payload.get('duration',0) for r in history)/count,2) if count else 0,'lastUsed':history[-1].created_at if history else None,'inputSchema':{'dataset':'validated retail rows'},'outputSchema':{'result':'category analytics object'},'status':'Available'})
    return output

def event(state,step,summary): state['trace'].append({'step':step,'summary':summary,'timestamp':now(),'status':'completed'})

def classify(state):
    q=state['query'].lower(); rules={'forecast':['predict','forecast','next month','future','demand'],'inventory':['stock','inventory','replenish','reorder'],'customers':['customer','churn','retention','segment'],'anomalies':['anomal','unusual','suspicious','outlier'],'sales':['sales','revenue','profit','region','product','margin']}
    categories=[k for k,words in rules.items() if any(w in q for w in words)]
    if any(w in q for w in ['executive','all areas','business performance']) or ('report' in q and not categories):categories=list(rules)
    if not categories:categories=['sales']
    state['categories']=categories;state['category']=categories[0] if len(categories)==1 else 'report';state['results']={};state['errors']=[]
    event(state,'Supervisor',f"Rule-based classification: {', '.join(categories)}. No LLM used for routing.")
    return state

def retrieve(state):
    state['memories']=memory_search(state['owner'],state['query']);event(state,'Memory retrieval',f"Retrieved {len(state['memories'])} related episodes using TF-IDF cosine similarity.");return state

def select_tools(state):
    registry=tool_registry(state['owner']); selected=[]
    with Session() as s:config=s.get(Setting,state['owner']+':routing'); adaptive=not config or config.payload.get('adaptive',True)
    for cat in state['categories']:
        candidates=[t for t in registry if cat in t['categories']]
        for t in candidates:
            reliability=(t['successRate']/100) if t['successRate'] is not None else .5
            t['selectionScore']=round(.8+.2*reliability if adaptive else 1.,3)
            t['selectionExplanation']=f"Category match; {'80% relevance + 20% observed reliability' if adaptive else 'adaptation disabled'}; {t['executions']} recorded executions."
        selected.extend(sorted(candidates,key=lambda t:t['selectionScore'],reverse=True)[:1])
    state['selected']=selected;event(state,'Adaptive tool selection','; '.join(t['name']+': '+str(t['selectionScore']) for t in selected));return state

def execute_tool(state,tool):
    start=time.perf_counter();result=None;error=None
    for attempt in range(2):
        try:result=getattr(analytics,tool['id'])(state['df']);break
        except Exception as exc:error=str(exc)
    success=result is not None
    with Session() as s:
        s.add(ToolExecution(owner=state['owner'],tool=tool['id'],payload={'success':success,'duration':round((time.perf_counter()-start)*1000,2),'error':None if success else error,'selectionScore':tool['selectionScore'],'category':state['category'],'timestamp':now()}));s.commit()
    return tool['id'],result,None if success else error

def execute_single(state):return execute(state)
def execute_parallel(state):return execute(state)
def execute(state):
    with ThreadPoolExecutor(max_workers=4) as pool:outputs=list(pool.map(lambda t:execute_tool(state,t),state['selected']))
    for name,result,error in outputs:
        if error:state['errors'].append({'tool':name,'error':error})
        else:state['results'][name]=result
    event(state,'Specialist execution',f"Executed {len(outputs)} analytical tools; {len(state['errors'])} errors. Calculations use {len(state['df'])} validated retail rows.")
    return state

def validate(state):
    count=len(state['results']);complete=count==len(state['selected']);df=state['df']; limitations=['Synthetic demonstration dataset.' if state['dataset']=='sample' else 'Uploaded data has not been independently audited.','Observational findings do not establish causality.','No model retraining occurs; adaptation changes tool ranking from logged outcomes.']
    if 'forecast' in state['results'] and state['results']['forecast']['trainingDays']<60:limitations.append('Short forecast training history; use caution.')
    score=round(100*(.5*int(complete)+.3*int(not df.empty)+.2*int(count>0)))
    state['reflection']={'id':uid(),'objective':state['query'],'outcome':'success' if complete else 'partial' if count else 'failed','whatWorked':[f'{count} tools returned computed evidence.','Input rows passed validation.'],'whatFailed':state['errors'],'limitations':limitations,'improvements':['Collect actual outcomes and user feedback to assess recommendation quality.','Provide reliable costs and stock snapshots for margin and replenishment decisions.'],'score':score,'metrics':{'dataValidation':100,'toolSelectionAccuracy':None,'executionCompleteness':100 if complete else 0,'recommendationQuality':None,'errorRate':round(len(state['errors'])/max(1,len(state['selected']))*100,2)},'createdAt':now()}
    event(state,'Validation and reflection',f"Execution completeness score {score}/100. Recommendation quality requires user/outcome feedback.");return state

def summarize(state):
    results=state['results']; findings=[]; recommendations=[]
    if 'sales' in results:
        r=results['sales'];findings.append(f"Revenue is ${r['revenue']:,.2f}; observed profit is ${r['profit']:,.2f}. Trailing 30-day growth is {r['growth']:+.1f}%.");recommendations.append('Review the largest product and regional changes before adjusting campaigns.')
    if 'customers' in results:
        r=results['customers'];findings.append(f"{r['total']} customers; {r['retention']:.1f}% made repeat purchases; {r['atRisk']} have high recency-based churn risk.");recommendations.append('Prioritize a measured re-engagement campaign for customers with long purchase gaps.')
    if 'inventory' in results:
        r=results['inventory'];findings.append(f"{r['lowStock']} products are below reorder level and {r['overstock']} exceed 90 days of observed stock coverage.");recommendations.append('Check supplier lead times and validate stock counts before placing suggested replenishment orders.')
    if 'forecast' in results:
        r=results['forecast'];findings.append(f"Next {r['horizon']} days forecast: ${r['totalForecast']:,.2f}; holdout MAE ${r['mae']:,.2f}.");recommendations.append('Use forecast bands for planning and compare predictions with future realized sales.')
    if 'anomalies' in results:findings.append(f"{results['anomalies']['total']} daily patterns flagged by Isolation Forest.");recommendations.append('Investigate flagged dates against promotions and data import logs.')
    summary=' '.join(findings) or 'Analysis did not produce a usable result.'; mode='Rule-based demo'
    if os.getenv('OPENAI_API_KEY'):
        try:
            import httpx
            response=httpx.post(os.getenv('OPENAI_BASE_URL','https://api.openai.com/v1').rstrip('/')+'/chat/completions',headers={'Authorization':'Bearer '+os.environ['OPENAI_API_KEY']},json={'model':os.getenv('OPENAI_MODEL','gpt-4.1-mini'),'messages':[{'role':'system','content':'Summarize the supplied computed retail findings. Do not invent values, claim causality, or expose reasoning. Under 180 words.'},{'role':'user','content':summary}],'max_tokens':400},timeout=20);response.raise_for_status();summary=response.json()['choices'][0]['message']['content'];mode='LLM-assisted summary; local analytical execution'
        except Exception as exc:state['reflection']['limitations'].append('Configured LLM unavailable; analytical rule-based summary used.');event(state,'LLM fallback',type(exc).__name__)
    duration=round((time.perf_counter()-state['started'])*1000,2);episode_id=uid()
    episode={'id':episode_id,'query':state['query'],'category':state['category'],'createdAt':now(),'agents':['supervisor','memory','tools',*state['categories'],'reflection','reports'],'tools':[t['name'] for t in state['selected']],'selectedTools':state['selected'],'dataset':state['dataset'],'summary':summary,'result':results,'recommendations':recommendations,'confidence':state['reflection']['score']/100,'confidenceLabel':'Execution completeness, not prediction probability','duration':duration,'status':state['reflection']['outcome'],'reflection':state['reflection'],'trace':state['trace'],'memoryReferences':[{'id':e['id'],'query':e['query'],'similarity':e['similarity']} for e in state['memories']],'feedback':None,'mode':mode}
    event(state,'Memory update','Saved episode, tool execution statistics and reflection; future requests can retrieve this experience.')
    with Session() as s:
        s.add(Episode(id=episode_id,owner=state['owner'],category=state['category'],payload=episode));s.flush();s.add(Reflection(episode_id=episode_id,owner=state['owner'],payload=state['reflection']));s.commit()
    state['episode']=episode;return state

builder=StateGraph(AgentState)
for name,fn in [('supervisor',classify),('memory',retrieve),('tools',select_tools),('single',execute_single),('parallel',execute_parallel),('reflection',validate),('save',summarize)]:builder.add_node(name,fn)
builder.add_edge(START,'supervisor');builder.add_edge('supervisor','memory');builder.add_edge('memory','tools');builder.add_conditional_edges('tools',lambda s:'parallel' if len(s['selected'])>1 else 'single',{'parallel':'parallel','single':'single'});builder.add_edge('single','reflection');builder.add_edge('parallel','reflection');builder.add_edge('reflection','save');builder.add_edge('save',END)
WORKFLOW=builder.compile()

def run_query(query,owner,df,dataset):return WORKFLOW.invoke({'query':query,'owner':owner,'df':df,'dataset':dataset,'trace':[],'started':time.perf_counter()},{'recursion_limit':20})['episode']
