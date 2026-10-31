"""Create a local, read-only snapshot of the public storefront assets and catalog."""
import concurrent.futures, hashlib, json, pathlib, re, urllib.request
from bs4 import BeautifulSoup

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'assets'
OUT.mkdir(parents=True, exist_ok=True)
urls = {}

def asset(url):
    if not url: return ''
    if url.startswith('/'): url = 'https://floume.ai' + url
    ext = pathlib.Path(url.split('?')[0]).suffix or '.webp'
    name = hashlib.sha256(url.encode()).hexdigest()[:16] + ext
    urls[url] = name
    return '/assets/' + name

def soup(path): return BeautifulSoup(path.read_text(), 'html.parser')
home = soup(ROOT / 'research/reference/desktop-home.html')
products = {}

def card(a):
    pid = a['href'].split('/')[-1]
    title = a.find('h3')
    img = a.find('img')
    if not title or not img: return None
    text = a.get_text(' ', strip=True)
    prices = re.findall(r'₼([\d,.]+)', text)
    p = {'id':pid,'name':title.get_text(strip=True),'price':float(prices[0].replace(',','')) if prices else 0,
         'image':asset(img.get('src')),'images':[], 'categoryIds':[], 'rating':5 if a.select_one('.tabler-icon-star-filled') else 0}
    if len(prices)>1: p['originalPrice']=float(prices[1].replace(',',''))
    products.setdefault(pid,p)
    return pid

sections=[]
for sec in home.select('main > div > section'):
    h=sec.find('h2')
    if not h: continue
    cats=[]
    for a in sec.select('a[href*="/categories/"]'):
        img=a.find('img')
        if img: cats.append({'id':a['href'].split('/')[-1],'name':img.get('alt',''),'image':asset(img.get('src'))})
    ids=[]
    for a in sec.select('a[href*="/products/"]'):
        pid=card(a)
        if pid: ids.append(pid)
    for pid in ids: products[pid]['categoryIds']=[c['id'] for c in cats[:1]]
    headings=sec.find_all('h2')
    sections.append({'name':h.get_text(strip=True),'categories':cats,'productHeading':headings[1].get_text(strip=True) if len(headings)>1 else (cats[0]['name'] if cats else ''),'productIds':ids})

detail = soup(ROOT / 'research/reference/desktop-product_loaded.html')
for a in detail.select('main a[href*="/products/"]'):
    card(a)
first = products['b99d12e1-4d70-4728-b7fc-10b4a818320b']
for heading in detail.select('main h2'):
    title = heading.get_text(strip=True)
    if title in ['Similar products','Other products from this store']:
        group = next(parent for parent in heading.parents if parent.select('a[href*="/products/"] h3'))
        ids = [a['href'].split('/')[-1] for a in group.select('a[href*="/products/"]') if a.find('h3')]
        first['similarIds' if title=='Similar products' else 'storeProductIds'] = ids

banners=[]
for a in home.select('main a[href*="/banners/"]'):
    img=a.find('img')
    if img: banners.append({'id':a['href'].split('/')[-1],'image':asset(img.get('src')),'alt':img.get('alt','')})

def enrich(p):
    try:
        pid=p['id']
        local=ROOT/'research/reference/desktop-product_loaded.html'
        if pid=='b99d12e1-4d70-4728-b7fc-10b4a818320b': doc=soup(local)
        else:
            req=urllib.request.Request('https://floume.ai/en/products/'+pid,headers={'User-Agent':'Mozilla/5.0'})
            doc=BeautifulSoup(urllib.request.urlopen(req,timeout=25).read(),'html.parser')
        main=doc.find('main'); form=main.find('form') if main else None
        if not main or not form: return
        image_urls=[]
        for im in main.select('section [data-slot="carousel-item"] img'):
            u=im.get('src')
            if u and u not in image_urls: image_urls.append(u)
        p['images']=[asset(u) for u in image_urls] or [p['image']]
        badge=form.select_one('[data-slot="badge"]')
        p['stockLabel']=badge.get_text(' ',strip=True) if badge else 'In stock'
        m=re.search(r'(\d+) left',p['stockLabel']);p['stock']=int(m[1]) if m else 20
        title=form.find('h1'); desc=title.find_next_sibling('p') if title else None
        p['description']=desc.get_text(' ',strip=True) if desc else ''
        store=form.select_one('a[href*="/stores/"]')
        if store:
            p['storeId']=store['href'].split('/')[-1]
            p['storeName']=store.get_text(' ',strip=True).removeprefix('Store ').strip()
            im=store.find('img');p['storeImage']=asset(im.get('src')) if im else ''
        text=form.get_text(' ',strip=True)
        for key in ['Width','Height']:
            m=re.search(key+r'\s*—\s*([\d.]+)',text)
            if m:p[key.lower()]=m[1]
    except Exception as e: print('Product metadata skipped',p['id'],str(e))

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:list(pool.map(enrich,list(products.values())))
for p in products.values():
    if not p['images']:p['images']=[p['image']]
    p.setdefault('stockLabel','In stock');p.setdefault('stock',20);p.setdefault('description','');p.setdefault('storeName','Floume');p.setdefault('storeId','floume');p.setdefault('storeImage','')

branding={'logo':asset('/images/logo.svg'),'logoIcon':asset('/images/logo-icon.svg'),'applePay':asset('/images/brand-logo/apple-pay.png'),'googlePay':asset('/images/brand-logo/google-pay.png'),'visa':asset('https://cdn.shadcnstudio.com/ss-assets/brand-logo/visa.png'),'mastercard':asset('https://cdn.shadcnstudio.com/ss-assets/brand-logo/master.png'),'inter':asset('/assets/inter-latin-wght-normal-Dx4kXJAl.woff2'),'playfair':asset('/assets/playfair-display-latin-wght-normal-BOwq7MWX.woff2')}
asset('/assets/styles-BC-jNGyW.css')

def download(item):
    url,name=item; path=OUT/name
    if path.exists():return
    try:
        req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
        path.write_bytes(urllib.request.urlopen(req,timeout=30).read())
    except Exception as e:print('Asset failed',url,str(e))
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(download,list(urls.items())))
(ROOT/'src/catalog.json').write_text(json.dumps({'branding':branding,'banners':banners,'sections':sections,'products':list(products.values())},ensure_ascii=False,indent=2))
(ROOT/'research/reference/asset-manifest.json').write_text(json.dumps(urls,indent=2))
print('Saved',len(products),'products,',len(sections),'sections,',len(urls),'assets')
