"""Exercise a disposable local workspace. Never targets a hosted deployment."""
import json, urllib.request, urllib.error, uuid
BASE='http://127.0.0.1:4174'
ACTOR='test-'+str(uuid.uuid4())
def call(path='/api/workspace',payload=None,actor=ACTOR,origin=BASE,method=None):
 h={'oai-authenticated-user-id':actor,'oai-authenticated-user-email':'test@example.test'} if actor else {}
 if payload is not None:h.update({'Content-Type':'application/json','Origin':origin})
 req=urllib.request.Request(BASE+path,headers=h,data=None if payload is None else json.dumps(payload).encode(),method=method)
 try:
  with urllib.request.urlopen(req) as r:return r.status,json.load(r)
 except urllib.error.HTTPError as e:
  return e.code,json.loads(e.read())
status,initial=call();assert status==200,(status,initial)
assert len(initial['jobs'])==12
status,_=call(actor='');assert status==401
status,_=call(payload={'action':'createTask','task':{'title':'Test action','customer':'Test','due':'2026-09-20','time':'10:00'}},origin='https://untrusted.example');assert status==403
new={'customer':'API test customer','contact':'test@example.test','title':'Test signage order','category':'LED signage','value':10000,'cost':6000,'due':'2026-09-25','owner':'Test owner','source':'Website','priority':'Normal','notes':'Test specifications'}
status,r=call(payload={'action':'createJob','job':new});assert status==200,(status,r)
id=r['id'];job=next(j for j in r['data']['jobs'] if j['id']==id)
def mutate(action,**kw):
 global job
 status,r=call(payload={'action':action,'id':id,'version':job['version'],**kw})
 if status==200:job=next(j for j in r['data']['jobs'] if j['id']==id)
 return status,r
assert mutate('advance',stage='Production')[0]==400
for stage in ['Qualified','Quotation','Confirmed','Design']:assert mutate('advance',stage=stage)[0]==200
assert mutate('advance',stage='Production')[0]==400
assert mutate('approveArtwork',reference='Artwork v1 approved in test')[0]==200
assert mutate('editJob',job={**new,'notes':'Changed artwork scope'})[0]==200
assert not job['artworkApproved']
assert mutate('advance',stage='Production')[0]==400
assert mutate('approveArtwork',reference='Updated artwork v2 approved in test')[0]==200
assert mutate('advance',stage='Production')[0]==200
assert mutate('editJob',job={**new,'value':12000})[0]==400
assert mutate('advance',stage='Quality check')[0]==200
assert mutate('advance',stage='Ready')[0]==400
assert mutate('passQC',reference='Test inspector passed all checks')[0]==200
assert mutate('advance',stage='Ready')[0]==200
assert mutate('advance',stage='Delivered')[0]==400
assert mutate('recordDelivery',reference='Test recipient confirmed receipt')[0]==200
assert mutate('advance',stage='Paid')[0]==400
assert mutate('payment',amount=10001,reference='Overpayment test')[0]==400
old=job['version'];assert mutate('payment',amount=4000,reference='TEST-UPI-1')[0]==200
assert call(payload={'action':'payment','id':id,'version':old,'amount':4000,'reference':'TEST-UPI-1'})[0]==409
assert mutate('payment',amount=6000,reference='TEST-UPI-2')[0]==200
assert mutate('advance',stage='Paid')[0]==200
assert call(payload={'action':'note','id':id,'text':'Unauthorized'},actor='different-'+ACTOR)[0]==404
status,r=call();persisted=next(j for j in r['jobs'] if j['id']==id);assert persisted['stage']=='Paid' and persisted['paid']==10000
status,r=call(payload={'action':'createTask','task':{'title':'Confirm installation','customer':'Test customer','due':'2026-09-20','time':'10:00'}});assert status==200;task_id=r['id']
status,r=call(payload={'action':'completeTask','id':task_id,'done':True});assert status==200 and next(t for t in r['data']['tasks'] if t['id']==task_id)['done']
status,r=call(payload={'action':'createJob','job':{**new,'value':-1}});assert status==400
assert call(payload={'action':'createJob','job':{**new,'due':'2026-02-31'}})[0]==400
print('PASS: authentication, origin protection, validation, all workflow gates, payment bounds, stale-write conflict, cross-user isolation, task completion, and durable readback.')
