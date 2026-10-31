"""Save public media already observed in the signed-in bouquet configurator."""
from bs4 import BeautifulSoup
import concurrent.futures, hashlib, json, pathlib, re, urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/bouquet'; OUT.mkdir(parents=True,exist_ok=True)
manifest={}
def local(src):
 name=hashlib.sha256(src.encode()).hexdigest()[:16]+'.webp'; manifest[src]=name
 return '/assets/bouquet/'+name
def doc(name): return BeautifulSoup(json.load(open(ROOT/f'research/reference/customizer-{name}.json'))['html'],'html.parser')
s=doc('entry'); flowers=[];categories=[]
for b in s.find_all('button'):
 im=b.find('img'); name=b.get_text(' ',strip=True)
 if im:
  flowers.append({'id':'flower-'+str(len(flowers)+1),'name':name,'image':local(im['src']),'price':3,'category':''})
 elif name and name not in ['Close','Search flowers...','Continue']: categories.append(name)
for f in flowers:
 lower=f['name'].lower(); f['category']=next((c for c in categories if c!='All' and c.lower() in lower),'Rose' if 'mondial' in lower else 'Günəbaxan' if 'sunflower' in lower else 'Antirrhinum' if 'snapdragon' in lower else 'All')
bases=[]
for im in doc('base').find_all('img'):
 bases.append({'id':'base-'+str(len(bases)+1),'name':im.get('alt',''),'image':local(im['src']),'price':7})
decors=[]
for im in doc('decor').find_all('img'):
 name=im.get('alt','');decors.append({'id':'decor-'+str(len(decors)+1),'name':name,'image':local(im['src']),'price':.1 if 'Ribbon' in name else .2,'type':'ribbon' if 'Ribbon' in name else 'decor'})
store={'id':'aes-flowers','name':'Aes Flowers','image':local('https://floume-production.s3.eu-north-1.amazonaws.com/uploads/564da05a-e206-4acc-b3c6-ba21a125bb24-small.webp')}
def fetch(item):
 src,name=item;p=OUT/name
 if p.exists():return
 req=urllib.request.Request(src,headers={'User-Agent':'Mozilla/5.0'})
 try:p.write_bytes(urllib.request.urlopen(req,timeout=30).read())
 except Exception as e:print('FAILED',src,e)
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:list(ex.map(fetch,manifest.items()))
canvas=s.find(string=lambda t:t and 'The bouquet is empty' in t).parent.parent
points=[]
for span in canvas.find_all('span',recursive=False):
 style=span.get('style',''); vals=[]
 for axis in ['left','top']:
  match=re.search(axis+r': calc\(50% ([+-]) ([\deE.+-]+)px\)',style)
  if match:vals.append(50+(1 if match[1]=='+' else -1)*float(match[2])/384*100)
 if len(vals)==2:points.append({'x':round(vals[0],5),'y':round(vals[1],5)})
(ROOT/'src/bouquet-data.json').write_text(json.dumps({'categories':categories,'flowers':flowers,'bases':bases,'decors':decors,'store':store,'canvasPoints':points},ensure_ascii=False,indent=2))
(ROOT/'research/reference/bouquet-asset-manifest.json').write_text(json.dumps(manifest,indent=2))
print(len(flowers),'flowers',len(bases),'bases',len(decors),'decors',len(manifest),'local assets')
