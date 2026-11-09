'use strict';

const CITIES = ['Vancouver', 'Brooklyn'];
const PEOPLE = {
  susan: { name: 'Susan Park', handle: '@susanoutdoors', initial: 'S', bio: 'Saving the long evenings, slow mornings, and places in between.' },
  alex: { name: 'Alex Rivera', handle: '@alexaroundtown', initial: 'A', bio: 'Making plans, one good spot at a time.' },
  szn: { name: 'SznLuv', handle: '@sznluv', initial: 'S', bio: 'Seasonal guides from the SznLuv team.' },
};
const CATALOG = [
  { id:'rooftop', name:'Juniper Rooftop', area:'Gastown', address:'Gastown, Vancouver', city:'Vancouver', art:'sun', icon:'sun', point:[49.2834,-123.1052] },
  { id:'beach', name:'Kitsilano Beach', area:'Kitsilano', address:'Kitsilano Beach, Vancouver', city:'Vancouver', art:'water', icon:'waves', point:[49.2748,-123.1548] },
  { id:'market', name:'Granville Island Market', area:'False Creek', address:'1689 Johnston St, Vancouver', city:'Vancouver', art:'city', icon:'building', point:[49.2726,-123.1351] },
  { id:'park', name:'Queen Elizabeth Park', area:'Riley Park', address:'4600 Cambie St, Vancouver', city:'Vancouver', art:'leaf', icon:'tree', point:[49.2415,-123.1128] },
  { id:'richmond', name:'Richmond Country Farms', area:'Richmond', address:'12900 Steveston Hwy, Richmond', city:'Vancouver', art:'sun', icon:'sun', point:[49.13301,-123.08376] },
  { id:'buntzen', name:'Buntzen Lake', area:'Anmore', address:'Buntzen Lake, Anmore', city:'Vancouver', art:'water', icon:'waves' },
  { id:'bridge', name:'Brooklyn Bridge Park', area:'DUMBO', address:'334 Furman St, Brooklyn', city:'Brooklyn', art:'water', icon:'waves', point:[40.6989,-73.9990] },
  { id:'botanic', name:'Brooklyn Botanic Garden', area:'Prospect Heights', address:'990 Washington Ave, Brooklyn', city:'Brooklyn', art:'leaf', icon:'tree', point:[40.6694,-73.9624] },
];
const PLACES = Object.fromEntries(CATALOG.map(spot => [spot.id, spot]));
const ICONS = {
  heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z',
  compass:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM16 8l-2 6-6 2 2-6Z',
  layers:'m12 2 10 5-10 5L2 7l10-5ZM2 12l10 5 10-5M2 17l10 5 10-5',
  user:'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  pin:'M20 10c0 5-8 11-8 11s-8-6-8-11a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  sun:'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5',
  waves:'M2 7c3 0 3-2 5-2 3 0 3 2 5 2s3-2 5-2 3 2 5 2M2 13c3 0 3-2 5-2 3 0 3 2 5 2s3-2 5-2 3 2 5 2M2 19c3 0 3-2 5-2 3 0 3 2 5 2s3-2 5-2 3 2 5 2',
  building:'M3 21h18M5 21V7h6v14M11 21V3h8v18M8 10v1m0 3v1m7-8h1m-1 4h1m-1 4h1',
  tree:'M12 2 6 10h3l-5 7h16l-5-7h3l-6-8Zm0 15v5',
  plus:'M12 5v14M5 12h14', check:'m5 12 4 4L19 6', next:'m9 18 6-6-6-6', down:'m6 9 6 6 6-6',
  back:'m12 19-7-7 7-7M5 12h14', close:'m6 6 12 12M18 6 6 18', up:'m6 15 6-6 6 6',
  lock:'M6 11V8a6 6 0 0 1 12 0v3M4 11h16v10H4z', globe:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z',
  bookmark:'M6 4h12v17l-6-4-6 4V4Z', link:'m10 13 4-4m-5 6-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 2 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0',
  map:'m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15', settings:'M4 7h16M4 17h16M8 4v6m8 4v6',
  edit:'m14 6 4 4M4 20l4-1 12-12-4-4L4 15v5Z', trash:'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  list:'M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01', directions:'m3 12 18-9-9 18-2-7-7-2Z',
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[name] || ICONS.pin}"/></svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const button = (action,label,glyph='',cls='',args='') => `<button type="button" class="btn ${cls}" data-action="${action}" ${args}>${glyph ? icon(glyph) : ''}${esc(label)}</button>`;
const iconButton = (action,label,glyph,args='') => `<button type="button" class="icon-btn quiet" data-action="${action}" aria-label="${esc(label)}" title="${esc(label)}" ${args}>${icon(glyph)}</button>`;
const art = spot => `<span class="art ${esc(spot.art || 'water')}" aria-hidden="true">${icon(spot.icon || 'pin')}</span>`;
const avatar = (id, tiny=false) => `<span class="avatar ${tiny?'tiny':''}" aria-hidden="true">${PEOPLE[id].initial}</span>`;
const badge = (label,glyph) => `<span class="badge">${icon(glyph)}${esc(label)}</span>`;
const locationName = spot => spot.area || spot.address || 'Dropped pin';
const row = (spot,note='',action='') => `<div class="row"><button type="button" class="row-open" data-action="spot" data-id="${esc(spot.id)}">${art(spot)}<span><strong>${esc(spot.name)}</strong><small>${esc(locationName(spot))}${spot.custom?' · Custom spot':''}</small>${note?`<q>${esc(note)}</q>`:''}</span></button>${action}</div>`;
const empty = (title,copy,action='') => `<div class="empty-state">${art({icon:'pin'})}<h2 class="section-heading">${esc(title)}</h2><p class="small muted">${esc(copy)}</p>${action}</div>`;
const newId = () => globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const count = n => `${n} ${n===1?'spot':'spots'}`;
const item = (id,note='') => ({spot:PLACES[id],note});
const starter = (id,owner,title,description,city,items,isPublic) => {
  const draft = {title,description,city,items};
  return {id,owner,draft,published:isPublic?structuredClone(draft):null};
};
const KEY = 'sznluv-spot-list-prototype-v1';
function sampleData() {
  return {
    lists:[
      starter('golden-hour','susan','Golden Hour in Vancouver','A few spots for that last hour of sunlight.','Vancouver',[item('beach','Bring a blanket for the steps.'),item('market','Pick up something sweet before heading out.')],true),
      starter('slow-sundays','szn','Slow Sundays in Vancouver','An easy day out, from the market to the park.','Vancouver',[item('market'),item('park'),item('buntzen')],true),
      starter('brooklyn-weekend','szn','A Green Weekend in Brooklyn','Two stops for a long walk and a little green space.','Brooklyn',[item('bridge'),item('botanic')],true),
      starter('birthday','alex','Birthday plans','A shortlist for this year.','Vancouver',[],false),
    ],
    tops:{
      susan:{Vancouver:{ids:['rooftop','beach','market','park'],public:true},Brooklyn:{ids:['bridge'],public:true}},
      alex:{}, szn:{},
    },
    follows:{susan:[],alex:[]}, people:{susan:[],alex:[]}, custom:{susan:[],alex:[]},
  };
}
function readData() {
  try { return JSON.parse(localStorage.getItem(KEY)) || sampleData(); }
  catch { return sampleData(); }
}
let data = readData();
function persist() {
  try { localStorage.setItem(KEY,JSON.stringify(data)); }
  catch { notify('Changes are available for this session.'); }
}
const appBar = document.querySelector('#app-bar');
const screen = document.querySelector('#screen');
const nav = document.querySelector('#tab-bar');
const sheet = document.querySelector('#sheet');
const desktop = document.querySelector('#desktop-controls');
const toast = document.querySelector('#toast');
let toastTimer;
let actor = 'alex';
let city = 'Vancouver';
let discoveryCity = 'Vancouver';
let libraryTab = 'mine';
let listMode = 'list';
let variants = {city:'picker',header:'compact',map:'toggle'};
let route = {name:'profile',id:'susan'};
let history = [];
let pendingSignIn;
let pickTarget;
let draftPin;

const getList = id => data.lists.find(list => list.id===id);
const owned = list => !!list && list.owner===actor;
const ownerLists = () => data.lists.filter(owned);
const getTop = (id,c=city) => data.tops[id]?.[c] || {ids:[],public:false};
const mutableTop = () => data.tops[actor][city] ||= {ids:[],public:false};
const lookup = id => PLACES[id] || Object.values(data.custom).flat().find(spot=>spot.id===id) ||
  data.lists.flatMap(l=>[...(l.published?.items || []),...(owned(l)?l.draft.items:[])]).find(entry=>entry.spot.id===id)?.spot;
function notify(message) {
  toast.textContent=message;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toast.textContent='',2800);
}
function closeSheet() {
  if (sheet.open) sheet.close();
}
function updateHash() {
  const hash = route.shared ? `#share/${encodeURIComponent(route.id)}` : '';
  if (location.hash!==hash) window.history.replaceState(null,'',location.href.split('#')[0]+hash);
}
function go(next,replace=false) {
  closeSheet();
  if (!replace) history.push({route,scroll:screen.scrollTop});
  route=next;
  listMode='list';
  updateHash();
  render(true);
}
function back() {
  closeSheet();
  const prev=history.pop();
  route=prev?.route || {name:'discover'};
  updateHash();
  render(true);
  screen.scrollTop=prev?.scroll || 0;
}
function start(next,as=actor) {
  actor=as;
  history=[];
  go(next,true);
}
function openHash() {
  const match=location.hash.match(/^#share\/([a-zA-Z0-9_-]+)$/);
  if (match) start({name:'list',id:match[1],shared:true},'guest');
  else render();
}
function showSheet(title,body) {
  sheet.innerHTML=`<div class="between"><h2 class="section-heading" id="sheet-title">${esc(title)}</h2>${iconButton('close','Close','close')}</div>${body}`;
  if (!sheet.open) sheet.showModal();
}
function tabs(entries,active,action) {
  return `<div class="segment">${entries.map(([value,label])=>`<button type="button" aria-pressed="${active===value}" data-action="${action}" data-id="${esc(value)}">${esc(label)}</button>`).join('')}</div>`;
}
function studioControls() {
  const choices = (name,label,options) => `<label class="control-label">${label}<select data-variant="${name}">${options.map(([value,label])=>`<option value="${value}" ${variants[name]===value?'selected':''}>${label}</option>`).join('')}</select></label>`;
  return `<div class="controls">
    <div><p class="eyebrow control-head">Test journeys</p><div class="control-actions">
      ${button('journey-owner','01 · Create a list','plus')}${button('journey-friend','02 · Open a shared link','link')}
      ${button('journey-profile','View Susan’s profile','user')}${button('journey-unavailable','Unavailable link','lock')}
    </div><p class="control-note">Viewing as <strong>${actor==='guest'?'a guest':PEOPLE[actor].name}</strong> · Demo data stays in this browser.</p></div>
    <details><summary>Compare layouts</summary>
      ${choices('city','City switcher',[['picker','City pill + picker'],['chips','City chips']])}
      ${choices('header','List header',[['compact','Compact byline'],['cover','Large cover']])}
      ${choices('map','Map placement',[['toggle','List first · toggle'],['preview','Preview after first spot'],['first','Map before spots']])}
    </details>
  </div>`;
}
function appChrome() {
  const sub=!['profile','library','discover'].includes(route.name) || history.length>0;
  const labels={list:route.shared?'Shared list':'Spot list',editor:'Edit list',manual:'Missing spot',top:'Edit Top 4',spot:'Spot details'};
  const brand='<span class="wordmark">szn<span>luv.</span></span>';
  appBar.innerHTML=`${sub && history.length?iconButton('back','Go back','back'):brand}<span class="page-label">${labels[route.name] || ''}</span>${iconButton('studio','Prototype controls','settings')}`;
  nav.innerHTML=actor==='guest'?'':[['discover','Explore','compass'],['library','Library','layers'],['profile','Profile','user']].map(([name,label,glyph])=>
    `<button type="button" class="tab" data-action="tab" data-id="${name}" ${route.name===name && (name!=='profile'||route.id===actor)?'aria-current="page"':''}>${icon(glyph)}${label}</button>`).join('');
  const open=desktop.querySelector('details')?.open;
  desktop.innerHTML=studioControls();
  desktop.querySelector('details').open=!!open;
}
function card(list,view=list.published,{visibility=false}={}) {
  return `<button type="button" class="list-card" data-action="${visibility?'editor':'list'}" data-id="${esc(list.id)}">
    ${art({art:list.owner==='szn'?'leaf':'sun',icon:list.owner==='szn'?'compass':'layers'})}
    <span class="card-copy"><strong>${esc(view.title)}</strong><small>${visibility?(list.published?'Public':'Private'):PEOPLE[list.owner].name} · ${esc(view.city)} · ${count(view.items.length)}</small>${view.description?`<small class="desc">${esc(view.description)}</small>`:''}</span>${icon('next')}</button>`;
}
function profile() {
  const id=route.id;
  const person=PEOPLE[id];
  const isMe=id===actor;
  const top=getTop(id);
  const listCards=data.lists.filter(l=>l.owner===id && l.published);
  const follows=(data.people[actor] || []).includes(id);
  const slots=(isMe || top.public?top.ids:[]).map(key=>lookup(key)).filter(Boolean);
  const shown=slots.map((spot,index)=>`<button type="button" class="pick" data-action="spot" data-id="${esc(spot.id)}">${art(spot)}<span><strong>${esc(spot.name)}</strong><small>${index+1} · ${esc(spot.area || 'Custom spot')}</small></span></button>`);
  if (isMe) while (shown.length<4) shown.push(`<button type="button" class="pick empty" data-action="top">${art({icon:'plus'})}<strong>Add pick</strong></button>`);
  return `<div class="content">
    <div class="hero" role="img" aria-label="Illustration of the Vancouver waterfront"><span>THE LOCAL EDIT</span></div>
    <div class="profile-head">
      <div class="between"><div class="person">${avatar(id)}<div><h1 class="heading">${person.name}</h1><p class="small muted">${person.handle}</p></div></div>
      ${!isMe&&id!=='szn'?button('follow-person',follows?'Following person':'Follow person',follows?'check':'plus',follows?'selected':'primary',`data-id="${id}"`):''}</div>
      <p class="bio">${person.bio}</p>
    </div>
    <section class="section"><div class="section-head between"><h2 class="section-heading">Top 4</h2>
      ${variants.city==='picker'?button('cities',city,'pin','chip city-pill','aria-label="Switch Top 4 city"'):''}</div>
      ${variants.city==='chips'?`<div class="city-pills cluster">${CITIES.map(c=>button('city',c,'pin',`chip ${c===city?'selected':''}`,`data-id="${c}" aria-pressed="${c===city}"`)).join('')}</div>`:''}
      ${shown.length?`<div class="grid">${shown.join('')}</div>`:empty('No picks here yet',`Check another city for ${person.name.split(' ')[0]}’s picks.`)}
      ${isMe?`<div class="between">${badge(top.public?'Public picks':'Private picks',top.public?'globe':'lock')}${button('top','Edit Top 4','edit','quiet')}</div>`:''}
    </section>
    <section class="section"><div class="section-head between"><h2 class="section-heading">Public lists</h2><span class="small muted">${listCards.length} published</span></div>
      <div class="stack">${listCards.length?listCards.map(l=>card(l)).join(''):empty('No public lists yet','Published lists appear here.')}</div>
    </section>
  </div>`;
}
function discover() {
  const lists=data.lists.filter(l=>l.published?.city===discoveryCity);
  const section=(label,matching)=>`<section class="section"><h2 class="section-heading section-head">${label}</h2><div class="stack">${matching.length?matching.map(l=>card(l)).join(''):empty('More to come','Check another city for lists.')}</div></section>`;
  return `<div class="content"><div class="hero ${discoveryCity==='Brooklyn'?'brooklyn':''}"><span>YOUR CITY, THIS SEASON</span></div><div class="section stack"><h1 class="heading">Explore the city</h1>${tabs(CITIES.map(c=>[c,c]),discoveryCity,'discovery-city')}</div>
    ${section('SznLuv guides',lists.filter(l=>l.owner==='szn'))}${section('Community picks',lists.filter(l=>l.owner!=='szn'))}</div>`;
}
function library() {
  const follows=(data.follows[actor] || []).map(getList).filter(l=>l?.published);
  const people=data.people[actor] || [];
  let body;
  if (libraryTab==='mine') body=`${button('new-list','New list','plus','primary wide')}${ownerLists().map(l=>card(l,l.draft,{visibility:true})).join('') || empty('Start with a spot','Create a private list for the places you want to keep.')}`;
  if (libraryTab==='followed') body=follows.map(l=>card(l)).join('') || empty('No followed lists yet','Follow a public list to see it here and get the creator’s latest edits.',button('tab','Explore lists','compass','', 'data-id="discover"'));
  if (libraryTab==='people') body=people.map(id=>`<button type="button" class="list-card" data-action="person" data-id="${id}">${avatar(id)}<span class="card-copy"><strong>${PEOPLE[id].name}</strong><small>${PEOPLE[id].handle}</small></span>${icon('next')}</button>`).join('') || empty('No followed people yet','Follow a person to return to their profile and public lists.');
  return `<div class="content stack"><p class="eyebrow">YOUR SAVED PLACES</p><h1 class="heading">Library</h1>${tabs([['mine','My lists'],['followed','Followed lists'],['people','People']],libraryTab,'library-tab')}${body}</div>`;
}
const geo = {Vancouver:[49.23,49.30,-123.17,-123.07],Brooklyn:[40.645,40.712,-74.02,-73.92]};
function mapArt(c) {
  const isBrooklyn=c==='Brooklyn';
  return `<svg viewBox="0 0 360 188" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <defs><pattern id="streets" width="19" height="15" patternUnits="userSpaceOnUse" patternTransform="rotate(${isBrooklyn?'25':'-13'})"><path d="M0 0H19V15" fill="none" stroke="#fffcf2" stroke-width="2"/></pattern></defs>
    <rect width="360" height="188" fill="#ece7d5"/><rect width="360" height="188" fill="url(#streets)"/>
    <path d="${isBrooklyn?'M0 0H126L96 30 80 64 51 90 35 136 0 164Z':'M0 0H360V28L288 20 245 42 168 49 124 68 88 75 34 66 0 84Z'}" fill="#c9e0df"/>
    <path d="M0 148 93 128l49 7 39-24 66-17 113 13M62 188l36-59 48-41 22-39M298 188l-28-76 28-84" stroke="#fffcf2" stroke-width="5" fill="none"/>
    <path d="M8 170q46-35 82-10l-8 28H4ZM219 138l43-9 24 30-53 23Z" fill="#d5dfc2"/>
    <text x="19" y="26" fill="#365b5a" font-size="10" font-family="system-ui">${isBrooklyn?'East River':'Burrard Inlet'}</text>
    <text x="195" y="126" fill="#5b554c" font-size="11" font-family="system-ui">${esc(c.toUpperCase())}</text>
  </svg>`;
}
function locationMap(c,items=[],selectable=false) {
  const [bottom,top,left,right]=geo[c];
  const marker=(point,body)=> {
    const [lat,lon]=point;
    if (lat<bottom || lat>top || lon<left || lon>right) return '';
    return body(`${Math.max(5,Math.min(95,100*(lon-left)/(right-left)))}%;top:${Math.max(8,Math.min(92,100*(top-lat)/(top-bottom)))}%`);
  };
  const marks=selectable?(draftPin?marker(draftPin,style=>`<span class="map-marker pin-preview" style="left:${style}">•</span>`):''):
    items.map(({spot},i)=>spot.point?marker(spot.point,style=>`<button type="button" class="map-marker" style="left:${style}" data-action="spot" data-id="${esc(spot.id)}" aria-label="${esc(spot.name)}">${i+1}</button>`):'').join('');
  const unmapped=items.filter(({spot})=>!spot.point || !marker(spot.point,()=>true)).length;
  const caption=selectable?'Illustrative map':unmapped?`${unmapped} ${unmapped===1?'spot is':'spots are'} outside this preview · See Spots for directions.`:'Illustrative map · Use spot details for directions.';
  return `<div class="map-box" aria-label="Illustrative map of ${esc(c)}">${selectable?`<button type="button" class="map-target" data-action="pin-drop" aria-label="Place pin on the demo map">${mapArt(c)}</button>`:mapArt(c)}${marks}</div><p class="small muted">${caption}</p>`;
}
function listView() {
  const list=getList(route.id);
  const view=route.preview && owned(list)?list.draft:list?.published;
  if (!view) return `<div class="content">${empty('This list is unavailable','The creator may have made it private or removed it.',button('tab','Explore SznLuv','compass','primary','data-id="discover"'))}</div>`;
  const following=(data.follows[actor] || []).includes(list.id);
  const followButton=owned(list)||route.preview?'':button('follow-list',following?'Following list':'Follow list',following?'check':'plus',following?'selected':'primary',`data-id="${esc(list.id)}"`);
  const rows=view.items.map(({spot,note})=>row(spot,note,route.preview?'':button('save-spot','Save spot','bookmark','',`data-id="${esc(spot.id)}"`)));
  const map=locationMap(view.city,view.items);
  let body=rows.join('');
  if (rows.length && variants.map==='toggle') body=`${tabs([['list','Spots'],['map','Map']],listMode,'list-mode')}${listMode==='map'?map:body}`;
  if (rows.length && variants.map==='preview') body=`${rows[0]}<details class="section"><summary>Preview map</summary>${map}</details>${rows.slice(1).join('')}`;
  if (rows.length && variants.map==='first') body=map+body;
  return `<div class="content">
    ${route.preview?'<p class="banner">Visitor preview · Only you can see this draft.</p>':''}
    ${variants.header==='cover'?`<div class="header-cover ${view.city==='Brooklyn'?'brooklyn':''}" role="img" aria-label="Illustrated cover"></div>`:''}
    <div class="list-head"><p class="eyebrow">${esc(view.city.toUpperCase())} · ${count(rows.length).toUpperCase()}</p><h1 class="heading">${esc(view.title)}</h1>
      <div class="byline">By <button type="button" class="inline-btn" data-action="person" data-id="${list.owner}">${avatar(list.owner,true)} ${PEOPLE[list.owner].name}</button></div>
      ${view.description?`<p>${esc(view.description)}</p>`:''}
      <div class="cluster">${followButton}${!route.preview?button('share','Share link','link','',`data-id="${esc(list.id)}"`):''}${owned(list)&&!route.preview?button('editor','Edit list','edit','',`data-id="${esc(list.id)}"`):''}</div>
    </div><section class="section">${body || empty('No spots yet','Check back for the first pick.')}</section>
  </div>`;
}
function editor() {
  const list=getList(route.id);
  if (!owned(list)) return listView();
  const draft=list.draft;
  const changed=list.published && JSON.stringify(draft)!==JSON.stringify(list.published);
  return `<div class="content stack">
    <div class="between"><h1 class="heading">Edit list</h1>${badge(list.published?'Public':'Private',list.published?'globe':'lock')}</div>
    <p class="small muted">${changed?'Draft changes are saved. Review them before updating the public list.':list.published?'This list is on your profile and accessible through its link.':'Draft changes are saved as you go. Only you can see this list.'}</p>
    <label class="field">Title<input data-field="title" maxlength="85" value="${esc(draft.title)}"></label>
    <label class="field">Description <span>Optional</span><textarea data-field="description" maxlength="260">${esc(draft.description)}</textarea></label>
    <label class="field">City<select data-field="city" ${draft.items.length?'disabled':''}>${CITIES.map(c=>`<option ${c===draft.city?'selected':''}>${c}</option>`).join('')}</select></label>
    <div class="between"><h2 class="section-heading">Spots <span class="muted small">${draft.items.length}</span></h2>${button('add','Add spot','plus','primary')}</div>
    ${draft.items.map(({spot,note},i)=>`<div class="edit-row"><div class="between"><div class="identity">${art(spot)}<div><strong>${esc(spot.name)}</strong><p class="small muted">${esc(locationName(spot))}${spot.custom?' · Custom':''}</p></div></div><div class="order">
      ${iconButton('order','Move '+spot.name+' up','up',`data-index="${i}" data-delta="-1" ${i===0?'disabled':''}`)}
      ${iconButton('order','Move '+spot.name+' down','down',`data-index="${i}" data-delta="1" ${i===draft.items.length-1?'disabled':''}`)}
      ${iconButton('remove','Remove '+spot.name,'trash',`data-index="${i}"`)}</div></div>
      <label class="field">Spot note <span>Optional</span><textarea data-note="${i}" maxlength="200" placeholder="What should someone know?">${esc(note)}</textarea></label></div>`).join('') || empty('Add your first spot','Search the catalog or add a place by address or pin.')}
    <div class="stack"><h2 class="section-heading">Visibility</h2><div class="cluster">${button('preview','Visitor preview','compass')}${button('publish-review',list.published?'Review public update':'Review & publish','globe','primary')}</div>
    ${list.published?`<div class="cluster">${button('share','Share link','link','',`data-id="${esc(list.id)}"`)}${button('private-review','Make private','lock')}</div>`:''}</div>
  </div>`;
}
function manual() {
  const list=getList(route.id);
  const c=route.target==='top'?city:list.draft.city;
  return `<div class="content stack"><h1 class="heading">Add a missing spot</h1><p class="muted small">Add a name and either a street address or a map pin in ${esc(c)}.</p>
  <form id="manual-form" class="stack"><label class="field">Spot name<input name="name" required maxlength="70" value="${esc(route.query)}"></label>
    <label class="field">Street address <span>Optional with a pin</span><input name="address" maxlength="120" placeholder="Street and number"></label>
    <div><strong>Drop a pin</strong>${locationMap(c,[],true)}<p id="pin-value" class="small muted" aria-live="polite">Tap the demo map to place a pin.</p></div>
    <p id="manual-error" class="field-error" role="alert"></p><button class="btn primary" type="submit">Add custom spot</button></form></div>`;
}
function topEdit() {
  const top=getTop(actor);
  return `<div class="content stack"><div class="between"><h1 class="heading">Edit Top 4</h1>${button('cities',city,'pin','chip city-pill','aria-label="Switch Top 4 city"')}</div>
    <p class="small muted">Choose up to four favorites in ${esc(city)}. Start with one and change the order anytime.</p>
    ${top.ids.map((id,i)=>{const s=lookup(id);return `<div class="edit-row"><div class="between"><div class="identity">${art(s)}<strong>${esc(s.name)}</strong></div><div class="order">
      ${iconButton('top-order','Move '+s.name+' up','up',`data-index="${i}" data-delta="-1" ${i===0?'disabled':''}`)}
      ${iconButton('top-order','Move '+s.name+' down','down',`data-index="${i}" data-delta="1" ${i===top.ids.length-1?'disabled':''}`)}
      ${iconButton('top-remove','Remove '+s.name,'trash',`data-index="${i}"`)}</div></div></div>`;}).join('')}
    ${top.ids.length<4?button('add-top','Add pick','plus','primary'):''}
    <div class="between">${badge(top.public?'Public picks':'Private picks',top.public?'globe':'lock')}${button('top-visibility',top.public?'Hide from profile':'Show on profile',top.public?'lock':'globe','',top.ids.length?'':'disabled')}</div>
    <p class="small muted">Visibility applies to ${esc(city)}. Public picks appear on your profile.</p>
  </div>`;
}
function spotDetail() {
  const spot=route.spot;
  const destination=spot.point?spot.point.join(','):spot.custom?`${spot.address}, ${spot.city}`:spot.address;
  const url='https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(destination);
  return `<div class="content stack">${art(spot)}<p class="eyebrow">${esc(spot.city)} · ${spot.custom?'Custom spot':'SznLuv catalog'}</p><h1 class="heading">${esc(spot.name)}</h1>
    <p class="muted">${esc(spot.address || (spot.point?spot.point.map(n=>n.toFixed(5)).join(', '):spot.area))}</p>
    <div class="cluster"><a class="btn" href="${url}" target="_blank" rel="noreferrer">${icon('directions')} Directions</a>${button('save-spot','Save spot','bookmark','primary',`data-id="${esc(spot.id)}"`)}</div>
    ${spot.point?locationMap(spot.city,[{spot}]):''}
  </div>`;
}
const VIEWS={profile,discover,library,list:listView,editor,manual,top:topEdit,spot:spotDetail};
function render(resetScroll=false) {
  appChrome();
  screen.innerHTML=VIEWS[route.name]();
  if (resetScroll) screen.scrollTop=0;
}
function chooseCity() {
  showSheet('Choose a city',`<div class="stack">${CITIES.map(c=>button('city',c,c===city?'check':'pin',c===city?'selected':'',`data-id="${c}"`)).join('')}</div>`);
}
function createForm(spot) {
  showSheet('New private list',`<form class="stack" id="create-form" data-id="${esc(spot?.id)}"><p class="muted small">${spot?`Start a list with ${esc(spot.name)}.`:'Give your list a title to get started.'}</p>
    <label class="field">List title<input name="title" required maxlength="85" placeholder="My Hottest Summer Spots"></label>
    <label class="field">City<select name="city" ${spot?'disabled':''}>${CITIES.map(c=>`<option ${c===(spot?.city || city)?'selected':''}>${c}</option>`).join('')}</select></label>
    <p class="field-error" role="alert"></p><button type="submit" class="btn primary">Create private list</button></form>`);
}
function addSearch(target) {
  pickTarget=target;
  showSheet(target==='top'?'Choose a favorite':'Add spot',`<div class="stack"><label class="field">Search SznLuv spots<input id="catalog-search" type="search" placeholder="Try rooftop or a neighborhood" maxlength="70"></label><div id="catalog-results"></div></div>`);
  searchResults('');
}
function searchResults(raw) {
  const draft=getList(route.id)?.draft;
  const c=pickTarget==='top'?city:draft.city;
  const existing=pickTarget==='top'?getTop(actor).ids:draft.items.map(e=>e.spot.id);
  const query=raw.trim().toLocaleLowerCase();
  const spots=[...CATALOG,...data.custom[actor]].filter(s=>s.city===c && `${s.name} ${s.area} ${s.address || ''}`.toLocaleLowerCase().includes(query));
  sheet.querySelector('#catalog-results').innerHTML=`<p class="eyebrow">${esc(c)} · ${spots.length} ${spots.length===1?'match':'matches'}</p>${spots.map(s=>row(s,'',button('add-match',existing.includes(s.id)?'Added':'Add','plus','',`data-id="${esc(s.id)}" ${existing.includes(s.id)?'disabled':''}`))).join('') || '<p class="banner">No matching spots. Try a different name or add it yourself.</p>'}
    <div class="section">${button('manual','Add a missing spot','pin','wide',`data-query="${esc(raw.trim())}"`)}</div>`;
}
function putSpot(spot,target) {
  if (target==='top') {
    const top=mutableTop();
    if (top.ids.length>=4 || top.ids.includes(spot.id)) return;
    if (top.public && spot.custom) {
      showSheet('Show this custom pick?',`<div class="stack"><p>Anyone can see ${esc(spot.name)} and its ${spot.point?'pin':'address'} on your ${esc(city)} Top 4.</p>
        <p class="small muted">${esc([spot.address,spot.point?.map(n=>n.toFixed(5)).join(', ')].filter(Boolean).join(' · '))}</p>
        ${button('top-add-public','Show pick','globe','primary wide',`data-id="${esc(spot.id)}"`)}${button('close','Cancel','','wide')}</div>`);
      return;
    }
    top.ids.push(spot.id);
  } else {
    const list=getList(route.id);
    if (!owned(list) || list.draft.items.some(e=>e.spot.id===spot.id)) return;
    list.draft.items.push({spot,note:''});
  }
  persist();
  closeSheet();
  render();
  notify(target==='top'?'Pick added to your Top 4.':`${spot.name} added.`);
}
function findVisibleSpot(id) {
  if (route.name==='spot') return route.spot.id===id?route.spot:null;
  if (route.name==='list') {
    const l=getList(route.id);
    const entries=route.preview&&owned(l)?l.draft.items:l?.published?.items;
    return entries?.find(e=>e.spot.id===id)?.spot;
  }
  if (route.name==='profile') {
    const t=getTop(route.id);
    if ((route.id===actor || t.public) && t.ids.includes(id)) return lookup(id);
  }
  if (sheet.open && sheet.querySelector('#catalog-results')) return lookup(id);
}
function savePicker(spot) {
  const matches=ownerLists().filter(l=>l.draft.city===spot.city);
  const saved=l=>l.draft.items.some(e=>e.spot.id===spot.id);
  showSheet('Save spot',`<div class="stack"><p class="small muted">Choose one of your lists for <strong>${esc(spot.name)}</strong>.</p>
    ${matches.map(l=>button('save-to',`${l.draft.title}${saved(l)?' · Already saved':''}`,saved(l)?'check':'bookmark','wide',`data-id="${esc(l.id)}" data-spot="${esc(spot.id)}" ${saved(l)?'disabled':''}`)).join('')}
    ${button('new-with-spot','Create a new list','plus','primary wide',`data-id="${esc(spot.id)}"`)}</div>`);
}
function requireActor(run) {
  if (actor!=='guest') {run();return;}
  pendingSignIn=run;
  showSheet('Continue to your library',`<div class="stack"><p class="muted">Sign in to follow lists and save spots. You can keep browsing as a guest.</p>
    ${button('sign-in','Continue as Alex','user','primary wide')}${button('close','Keep browsing','','wide')}</div>`);
}
function switchItem(array,i,delta) {
  const other=i+delta;
  if (i>=0 && i<array.length && other>=0 && other<array.length) [array[i],array[other]]=[array[other],array[i]];
}
function toggleFollow(collection,id) {
  const i=collection.indexOf(id);
  if (i<0) collection.push(id);
  else collection.splice(i,1);
  persist();
  render();
  return i<0;
}
function reviewPublish() {
  const l=getList(route.id);
  if (!l.draft.title.trim()) {notify('Add a title before publishing.');screen.querySelector('[data-field="title"]').focus();return;}
  const notes=l.draft.items.filter(e=>e.note.trim());
  const custom=l.draft.items.filter(e=>e.spot.custom);
  showSheet(l.published?'Review public update':'Publish this list?',`<div class="stack">
    <p>Anyone with the link can see <strong>${esc(l.draft.title.trim())}</strong>. It will also appear on your profile.</p>
    <div><strong>Spot notes</strong><ul class="exposure">${notes.length?notes.map(({spot,note})=>`<li>${esc(spot.name)} · ${esc(note)}</li>`).join(''):'<li>No notes to share.</li>'}</ul></div>
    <div><strong>Custom locations</strong><ul class="exposure">${custom.length?custom.map(({spot})=>`<li>${esc(spot.name)} · ${esc([spot.address,spot.point?.map(n=>n.toFixed(5)).join(', ')].filter(Boolean).join(' · '))}</li>`).join(''):'<li>No custom locations to share.</li>'}</ul></div>
    ${button('publish',l.published?'Update public list':'Publish list','globe','primary wide')}${button('close','Keep editing','','wide')}</div>`);
}
function share(id) {
  const l=getList(id);
  if (!l?.published) return;
  const url=location.href.split('#')[0]+'#share/'+id;
  showSheet('Share public list',`<div class="stack"><p class="muted small">Anyone with the link can browse this list.</p>
    <label class="field">Prototype link<input id="share-url" readonly value="${esc(url)}"></label>
    ${button('open-shared','Open as guest','link','primary wide',`data-id="${esc(id)}"`)}${button('copy-link','Copy link','','wide')}
    <p id="copy-status" class="small muted" role="status">This link uses the sample data in this browser.</p></div>`);
}
const ACTIONS = {
  close:closeSheet,back,
  studio:()=>showSheet('Prototype controls',studioControls()),
  'journey-owner':()=>{libraryTab='mine';start({name:'library'},'susan');},
  'journey-friend':()=>start({name:'list',id:data.lists.find(l=>l.owner==='susan' && l.published)?.id || 'golden-hour',shared:true},'guest'),
  'journey-profile':()=>{city='Vancouver';start({name:'profile',id:'susan'},'alex');},
  'journey-unavailable':()=>start({name:'list',id:'unavailable',shared:true},'guest'),
  tab:({id})=>start({name:id,...(id==='profile'?{id:actor}: {})},actor==='guest'?'alex':actor),
  cities:chooseCity,
  city:({id})=>{city=id;closeSheet();render();},
  'discovery-city':({id})=>{discoveryCity=id;render();},
  'library-tab':({id})=>{libraryTab=id;render();},
  'list-mode':({id})=>{listMode=id;render();},
  person:({id})=>go({name:'profile',id}),
  list:({id})=>go({name:'list',id}),
  editor:({id})=>go({name:'editor',id}),
  top:()=>go({name:'top'}),
  'top-visibility':()=>{
    const top=mutableTop();
    if (top.public) {top.public=false;persist();render();return;}
    const custom=top.ids.map(lookup).filter(spot=>spot.custom);
    showSheet('Show Top 4 on your profile?',`<div class="stack"><p>Anyone can see your ${esc(city)} picks. Public custom spots include their address or pin.</p>
      ${custom.length?`<ul class="exposure">${custom.map(spot=>`<li>${esc(spot.name)} · ${esc(spot.address || spot.point.join(', '))}</li>`).join('')}</ul>`:''}
      ${button('top-publish','Show picks','globe','primary wide')}</div>`);
  },
  'top-add-public':({id})=>{
    const top=mutableTop();
    if(top.ids.length<4 && !top.ids.includes(id)) top.ids.push(id);
    persist();closeSheet();render();
  },
  'top-publish':()=>{mutableTop().public=true;persist();closeSheet();render();},
  'top-order':({index,delta})=>{switchItem(mutableTop().ids,+index,+delta);persist();render();},
  'top-remove':({index})=>{const t=mutableTop();t.ids.splice(+index,1);if (!t.ids.length)t.public=false;persist();render();},
  'add-top':()=>addSearch('top'),
  add:()=>addSearch('list'),
  'add-match':({id})=>{const s=lookup(id);if (s) putSpot(s,pickTarget);},
  manual:({query})=>{draftPin=null;go({name:'manual',id:route.id,query,target:pickTarget});},
  'pin-drop':(_,el,event)=>{
    const bounds=el.getBoundingClientRect();
    const x=event.detail?Math.max(0,Math.min(1,(event.clientX-bounds.left)/bounds.width)):.55;
    const y=event.detail?Math.max(0,Math.min(1,(event.clientY-bounds.top)/bounds.height)):.45;
    const [b,t,l,r]=geo[route.target==='top'?city:getList(route.id).draft.city];
    draftPin=[t-y*(t-b),l+x*(r-l)];
    let pin=el.parentElement.querySelector('.pin-preview');
    if (!pin) {
      pin=document.createElement('span');
      pin.className='map-marker pin-preview';
      pin.textContent='•';
      el.after(pin);
    }
    pin.style.left=`${x*100}%`;
    pin.style.top=`${y*100}%`;
    document.querySelector('#pin-value').textContent=`Pin selected · ${draftPin.map(n=>n.toFixed(5)).join(', ')}`;
  },
  'new-list':()=>createForm(),
  'new-with-spot':({id})=>{const spot=findVisibleSpot(id);if(spot)createForm(spot);},
  'follow-person':({id})=>requireActor(()=>{if(id!==actor) notify(toggleFollow(data.people[actor],id)?`${PEOPLE[id].name} is in Library → People.`:'Person unfollowed.');}),
  'follow-list':({id})=>requireActor(()=>{if(getList(id)?.published) notify(toggleFollow(data.follows[actor],id)?'List added to Library → Followed lists.':'List unfollowed.');}),
  'sign-in':()=>{actor='alex';const run=pendingSignIn;pendingSignIn=null;closeSheet();render();run?.();},
  spot:({id})=>{const spot=findVisibleSpot(id);if(spot)go({name:'spot',spot,source:route.name==='list'?route.id:null});},
  'save-spot':({id})=>{const spot=findVisibleSpot(id);if(spot)requireActor(()=>savePicker(spot));},
  'save-to':({id,spot:key})=>{
    const list=getList(id),spot=findVisibleSpot(key);
    if (!spot || !owned(list) || list.draft.items.some(e=>e.spot.id===key)) return;
    list.draft.items.push({spot:structuredClone(spot),note:''});
    persist();closeSheet();render();notify(`Saved to ${list.draft.title}.`);
  },
  order:({index,delta})=>{switchItem(getList(route.id).draft.items,+index,+delta);persist();render();},
  remove:({index})=>{getList(route.id).draft.items.splice(+index,1);persist();render();},
  preview:()=>go({name:'list',id:route.id,preview:true}),
  'publish-review':reviewPublish,
  publish:()=>{
    const list=getList(route.id);
    list.draft.title=list.draft.title.trim();
    list.published=structuredClone(list.draft);
    persist();closeSheet();render();share(list.id);
  },
  'private-review':()=>showSheet('Make this list private?',`<div class="stack"><p>The link will stop working and the list will disappear from your profile and followers’ libraries.</p>${button('make-private','Make private','lock','primary wide')}${button('close','Keep public','','wide')}</div>`),
  'make-private':()=>{
    const list=getList(route.id);
    list.published=null;
    for (const id of Object.keys(data.follows)) data.follows[id]=data.follows[id].filter(key=>key!==list.id);
    persist();closeSheet();render();notify('List is private.');
  },
  share:({id})=>share(id),
  'open-shared':({id})=>start({name:'list',id,shared:true},'guest'),
  'copy-link':async ()=>{
    const field=sheet.querySelector('#share-url'), status=sheet.querySelector('#copy-status');
    try {await navigator.clipboard.writeText(field.value);status.textContent='Link copied.';}
    catch {field.select();status.textContent='Copy the selected prototype link.';}
  },
};
document.addEventListener('click',event=>{
  const control=event.target.closest('[data-action]');
  if (control && !control.disabled) ACTIONS[control.dataset.action]?.(control.dataset,control,event);
});
document.addEventListener('input',event=>{
  const field=event.target;
  if (field.id==='catalog-search') {searchResults(field.value);return;}
  if (route.name!=='editor') return;
  const list=getList(route.id);
  if (!owned(list)) return;
  if (field.dataset.note!==undefined) list.draft.items[+field.dataset.note].note=field.value;
  else if (field.dataset.field) list.draft[field.dataset.field]=field.value;
  else return;
  persist();
});
document.addEventListener('change',event=>{
  const variant=event.target.dataset.variant;
  if (variant) {
    const inDialog=sheet.contains(event.target);
    variants[variant]=event.target.value;
    if (variant==='city' && route.name!=='profile' && !inDialog) start({name:'profile',id:'susan'},actor);
    else if (variant!=='city' && route.name!=='list' && !inDialog) go({name:'list',id:'golden-hour'});
    else render();
    if (inDialog) {
      showSheet('Prototype controls',studioControls());
      sheet.querySelector('details').open=true;
      sheet.querySelector(`[data-variant="${variant}"]`).focus();
    } else desktop.querySelector(`[data-variant="${variant}"]`).focus();
  }
});
document.addEventListener('submit',event=>{
  const form=event.target;
  event.preventDefault();
  const fields=new FormData(form);
  if (form.id==='create-form') {
    const title=fields.get('title').trim();
    if (!title) {form.querySelector('.field-error').textContent='Enter a list title.';return;}
    const spot=form.dataset.id?findVisibleSpot(form.dataset.id):null;
    const id='list-'+newId();
    const list=starter(id,actor,title,'',spot?.city || fields.get('city'),spot?[{spot:structuredClone(spot),note:''}]:[],false);
    data.lists.unshift(list);persist();go({name:'editor',id});
  }
  if (form.id==='manual-form') {
    const name=fields.get('name').trim(), address=fields.get('address').trim();
    if (!name || (!address && !draftPin)) {
      form.querySelector('#manual-error').textContent=name?'Enter an address or place a pin.':'Enter a spot name.';
      return;
    }
    const c=route.target==='top'?city:getList(route.id).draft.city;
    const normal=value=>value.trim().toLocaleLowerCase();
    const match=[...CATALOG,...data.custom[actor]].find(s=>s.city===c && normal(s.name)===normal(name) &&
      ((address && normal(s.address || '')===normal(address)) || (draftPin && s.point && s.point.every((n,i)=>Math.abs(n-draftPin[i])<.00015))));
    const target=route.target;
    const spot=match || {id:'custom-'+newId(),name,address,city:c,point:draftPin,custom:true,art:'water',icon:'pin'};
    if (!match) data.custom[actor].push(spot);
    back();putSpot(spot,target);
    if (match) notify('Matched an existing spot.');
  }
});
window.addEventListener('storage',event=>{
  if (event.key!==KEY) return;
  data=readData();
  if (route.name==='spot' && route.source && !getList(route.source)?.published && !owned(getList(route.source))) back();
  if (route.name==='list' && !route.preview && !getList(route.id)?.published) closeSheet();
  render();
});
window.addEventListener('hashchange',openHash);
openHash();
