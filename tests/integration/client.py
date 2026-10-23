import urllib.request, urllib.error, urllib.parse, json, pathlib, os
urllib.request.install_opener(urllib.request.build_opener(urllib.request.ProxyHandler({})))
base=os.environ.get('LIBRARY_CURATOR_QA_URL','http://127.0.0.1:18097')
auth='MediaBrowser Client="LibraryCurator QA", Device="QA", DeviceId="library-curator-qa", Version="0.1.0"'
def api(path,method='GET',data=None,token=None):
 headers={'Authorization':auth+(', Token="'+token+'"' if token else '')}
 if data is not None: headers['Content-Type']='application/json'
 req=urllib.request.Request(base+path,data=json.dumps(data).encode() if data is not None else None,headers=headers,method=method)
 try:
  with urllib.request.urlopen(req,timeout=30) as r:
   body=r.read();return json.loads(body) if body else None
 except urllib.error.HTTPError as e:
  raise RuntimeError(str(e.code)+' '+method+' '+path+' '+e.read().decode()[:400]) from None
