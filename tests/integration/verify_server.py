from client import api
import argparse
parser=argparse.ArgumentParser(description="Verify a disposable seeded Jellyfin server. Never use production accounts.")
parser.add_argument("--state",required=True,help="Private JSON file with QA account tokens and fixture IDs")
args=parser.parse_args()
import json, urllib.parse, pathlib
s=json.load(open(args.state));admin=s['token'];members=[u['token'] for u in s['users']]
checks=[]
def check(name,condition):
 assert condition,name
 checks.append(name);print('PASS',name)
admin_options=api('/LibraryCurator/DisplayOptions',token=admin)
check('Admin exemption',admin_options['HiddenCollectionIds']==[])
for i,token in enumerate(members):
 options=api('/LibraryCurator/DisplayOptions',token=token)
 check('Member '+str(i+1)+' exclusions',len(options['HiddenCollectionIds'])==8)
 root=next(v['Id'] for v in options['Views'] if v.get('CollectionType')=='boxsets')
 check('Playlist virtual view recognized',any(v.get('CollectionType')=='playlists' for v in options['Views']))
 total=[]
 for start in [0,10]:
  result=api('/Items?'+urllib.parse.urlencode({'userId':s['users'][i]['Id'],'parentId':root,'includeItemTypes':'BoxSet','excludeItemIds':','.join(options['HiddenCollectionIds']),'startIndex':start,'limit':10,'sortBy':'SortName','recursive':'true'}),token=token)
  print('Page',start,'total',result['TotalRecordCount'],'length',len(result['Items']))
  check('Correct filtered total/page '+str(i)+'/'+str(start),result['TotalRecordCount']==17 and len(result['Items'])==(10 if start==0 else 7))
  total.extend(item['Id'] for item in result['Items'])
 check('No hidden collection leaked into pages',not(set(total)&set(s['collections'][:8])))
 for route in ['/LibraryCurator/Admin/Collections','/LibraryCurator/Admin/Status']:
  try:api(route,token=token);raise AssertionError('Admin route accessible')
  except RuntimeError as e:check('Member forbidden '+route,str(e).startswith('403'))
 check('Direct collection access remains',api('/Items/'+s['collections'][0]+'?userId='+s['users'][i]['Id'],token=token)['Id']==s['collections'][0])
try:api('/LibraryCurator/DisplayOptions');raise AssertionError('Anonymous allowed')
except RuntimeError as e:check('Anonymous denied',str(e).startswith('401'))
check('Injector registration',api('/LibraryCurator/Admin/Status',token=admin)['InjectorRegistered'])
check('Admin searchable list',api('/LibraryCurator/Admin/Collections?limit=10&searchTerm=QA%20Collection%202',token=admin)['TotalRecordCount']==5)
try:
 config=s['config'].copy();config['ExemptAdministrators']=False
 api('/Plugins/a7c41c34-c6a1-4cab-9c87-7f548ba37bb8/Configuration','POST',config,admin)
 check('Admin masking can be enabled',len(api('/LibraryCurator/DisplayOptions',token=admin)['HiddenCollectionIds'])==8)
 config['Enabled']=False
 api('/Plugins/a7c41c34-c6a1-4cab-9c87-7f548ba37bb8/Configuration','POST',config,admin)
 options=api('/LibraryCurator/DisplayOptions',token=members[0])
 check('Disable restores native presentation',not options['HiddenCollectionIds'] and options['PlaylistLibraryName']=='')
finally:
 api('/Plugins/a7c41c34-c6a1-4cab-9c87-7f548ba37bb8/Configuration','POST',s['config'],admin)
pathlib.Path(args.state).with_name('api-report.json').write_text(json.dumps({'checks':checks},indent=2))
print('API checks:',len(checks))
