const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const fs = require('node:fs');
const script = fs.readFileSync('src/Jellyfin.Plugin.LibraryCurator/Web/library-curator.js', 'utf8');
const collectionRoot = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const playlistRoot = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const hidden = 'cccccccccccccccccccccccccccccccc';
const other = 'dddddddddddddddddddddddddddddddd';
const user = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const tick = () => new Promise(resolve => setTimeout(resolve, 15));
function setup(t, overrides = {}, html = '', before) {
    const dom = new JSDOM('<title>Jellyfin</title>' + html, { url:'https://media.example/web/#/home.html', runScripts:'outside-only' });
    const win = dom.window, calls = [];
    let account = user;
    const options = { UserId:user, HiddenCollectionIds:[hidden], PlaylistLibraryName:'Mes sélections', Views:[{Id:collectionRoot,CollectionType:'boxsets'}, {Id:playlistRoot,CollectionType:'playlists'}], ...overrides };
    win.ApiClient = {
        getCurrentUserId: () => account,
        getUrl: path => { if (!path) throw new Error('Url name cannot be empty'); return 'https://media.example/jellyfin/' + path; },
        getJSON: async () => ({...options,UserId:account}),
        getItems: async function (...args) { calls.push(args); return { Items:[], TotalRecordCount:0 }; }
    };
    if (before) before(win);
    win.eval(script);
    t.after(() => { win.LibraryCurator.dispose(); dom.window.close(); });
    return {win, calls, options, setAccount: value => { account = value; }};
}
test('merges exclusions before pagination without modifying query or extra arguments', async t => {
    const {win, calls} = setup(t);
    const query = {ParentId:collectionRoot,IncludeItemTypes:'BoxSet',ExcludeItemIds:other,StartIndex:100,Limit:25,SortBy:'DateCreated',NameStartsWith:'A'};
    const snapshot = structuredClone(query);
    await win.ApiClient.getItems(user,query,'extra');
    assert.deepEqual(query,snapshot);
    assert.equal(calls[0][1].ExcludeItemIds,other + ',' + hidden);
    assert.equal(calls[0][1].StartIndex,100); assert.equal(calls[0][1].Limit,25);
    assert.equal(calls[0][2],'extra'); assert.equal(calls[0][1].NameStartsWith,'A');
});
test('leaves global search, item details, other libraries and mixed item queries unchanged', async t => {
    const {win,calls} = setup(t);
    const queries = [{SearchTerm:'foo',IncludeItemTypes:'BoxSet'}, {ParentId:hidden}, {ParentId:other,IncludeItemTypes:'BoxSet'}, {ParentId:collectionRoot,IncludeItemTypes:'Movie'}, {ParentId:collectionRoot,IncludeItemTypes:'BoxSet,Movie'}];
    for (const query of queries) await win.ApiClient.getItems(user,query);
    calls.forEach((call,index) => assert.equal(call[1],queries[index]));
});
test('effective admin exemption or disabled setting preserves original query', async t => {
    const {win,calls} = setup(t,{HiddenCollectionIds:[]});
    const query = {ParentId:collectionRoot};
    await win.ApiClient.getItems(user,query); assert.equal(calls[0][1],query);
});
test('normalizes GUIDs, accepts array exclusions and deduplicates', async t => {
    const {win,calls} = setup(t);
    await win.ApiClient.getItems(user,{ParentId:'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA',ExcludeItemIds:[hidden,other,hidden]});
    assert.equal(calls[0][1].ExcludeItemIds,hidden + ',' + other);
});
test('renames library cards and menu text without changing icons, actions or playlist items', async t => {
    const html = `<div data-id="${playlistRoot}"><a><span class="cardText">Playlists</span></a></div><a href="#/list.html?parentId=${playlistRoot}"><span class="material-icons">queue_music</span><span class="navMenuOptionText">Playlists</span></a><div data-id="${other}"><span class="cardText">Playlists</span></div><button>New playlist</button>`;
    const {win} = setup(t,{},html); await tick();
    assert.equal(win.document.querySelector('.cardText').textContent,'Mes sélections');
    assert.equal(win.document.querySelector('.navMenuOptionText').textContent,'Mes sélections');
    assert.equal(win.document.querySelector('.material-icons').textContent,'queue_music');
    assert.equal(win.document.querySelector(`[data-id="${other}"] .cardText`).textContent,'Playlists');
    assert.equal(win.document.querySelector('button').textContent,'New playlist');
});
test('covers SDK-rendered late cards and direct menu text', async t => {
    const {win} = setup(t); await tick();
    const card = win.document.createElement('div'); card.dataset.id=playlistRoot;
    card.innerHTML='<div class="cardText">Playlists</div>'; win.document.body.append(card);
    const link=win.document.createElement('a'); link.href='#/list.html?topParentId='+playlistRoot;
    link.innerHTML='<span class="material-icons">queue_music</span>Playlists'; win.document.body.append(link);
    await tick(); assert.equal(card.textContent,'Mes sélections'); assert.equal(link.lastChild.textContent,'Mes sélections');
});
test('renames library page title, handles special characters as text and restores when disabled', async t => {
    const {win,options} = setup(t,{PlaylistLibraryName:'<b>Été & cinéma</b>'},'<h3 class="pageTitle">Playlists</h3>');
    win.location.hash='#/list.html?parentId='+playlistRoot; await tick();
    const heading=win.document.querySelector('.pageTitle');
    assert.equal(heading.textContent,'<b>Été & cinéma</b>'); assert.equal(heading.children.length,0);
    assert.equal(win.document.title,'<b>Été & cinéma</b>');
    options.PlaylistLibraryName=''; win.LibraryCurator.refresh(); await tick();
    assert.equal(heading.textContent,'Playlists'); assert.equal(win.document.title,'Jellyfin');
});
test('leaving library does not rename an individual playlist title', async t => {
    const {win} = setup(t,{},'<h3 class="pageTitle">Playlists</h3>');
    win.location.hash='#/list.html?parentId='+playlistRoot; await tick();
    win.location.hash='#/details?id='+other; win.document.querySelector('.pageTitle').textContent='My playlist';
    win.document.title='My playlist'; await tick();
    assert.equal(win.document.querySelector('.pageTitle').textContent,'My playlist'); assert.equal(win.document.title,'My playlist');
});
test('double injection never adds another wrapper', async t => {
    const {win,calls} = setup(t); const wrapped=win.ApiClient.getItems;
    win.eval(script); assert.equal(win.ApiClient.getItems,wrapped);
    await win.ApiClient.getItems(user,{ParentId:collectionRoot}); assert.equal(calls.length,1);
});
for (const order of ['before','after']) test('composes with Community Rating loaded '+order,async t => {
    const community = win => { const previous=win.ApiClient.getItems; win.ApiClient.getItems=function(...args) { return previous.apply(this,args); }; };
    const {win,calls}=setup(t,{},'',order==='before'?community:null); if(order==='after') community(win);
    await win.ApiClient.getItems(user,{ParentId:collectionRoot}); assert.equal(calls[0][1].ExcludeItemIds,hidden);
});
test('settings failure fails open and keeps native requests working', async t => {
    const {win,calls}=setup(t,{},'',win=>{win.ApiClient.getJSON=async()=>{throw new Error('Offline');};win.console.warn=()=>{};});
    const query={ParentId:collectionRoot}; await win.ApiClient.getItems(user,query); assert.equal(calls[0][1],query);
});
test('account switch never uses previous account exclusions', async t => {
    const {win,calls,setAccount}=setup(t); await tick();
    const newUser='ffffffffffffffffffffffffffffffff'; setAccount(newUser);
    win.ApiClient.getJSON=async()=>({UserId:newUser,HiddenCollectionIds:[],Views:[],PlaylistLibraryName:''});
    await win.ApiClient.getItems(newUser,{ParentId:collectionRoot}); assert.equal(calls[0][1].ExcludeItemIds,undefined);
});
test('logout restores library labels', async t => {
    const {win,setAccount}=setup(t,{},`<div data-id="${playlistRoot}"><span class="cardText">Playlists</span></div>`);await tick();
    setAccount('');win.dispatchEvent(new win.HashChangeEvent('hashchange'));await tick();
    assert.equal(win.document.querySelector('.cardText').textContent,'Playlists');
});
test('preserves real Jellyfin home card links and updates their accessible labels', async t => {
    const html=`<div data-id="${playlistRoot}"><div class="cardText"><a href="#/list?parentId=${playlistRoot}" data-id="${playlistRoot}" title="Playlists" class="itemAction textActionButton">Playlists</a></div></div>`;
    const {win}=setup(t,{},html); await tick();
    const link=win.document.querySelector('.itemAction');
    assert.ok(link); assert.equal(link.textContent,'Mes sélections'); assert.equal(link.title,'Mes sélections');
    assert.equal(link.getAttribute('href'),'#/list?parentId='+playlistRoot);
    win.LibraryCurator.dispose(); assert.equal(link.title,'Playlists'); assert.equal(link.textContent,'Playlists');
});
test('waits for authentication on login pages and then initializes on sign-in',async t=>{
    let account='';let requests=0;
    const {win,calls}=setup(t,{},'',win=>{
        win.ApiClient.getCurrentUserId=()=>account;
        win.ApiClient.getJSON=async()=>{requests++;return {UserId:account,Views:[{Id:collectionRoot,CollectionType:'boxsets'}],HiddenCollectionIds:[hidden],PlaylistLibraryName:''};};
    });
    await tick(); assert.equal(requests,0);
    account=user; win.dispatchEvent(new win.HashChangeEvent('hashchange'));await tick();
    await win.ApiClient.getItems(user,{ParentId:collectionRoot});assert.equal(requests,1);assert.equal(calls[0][1].ExcludeItemIds,hidden);
});
for (const order of ['before','after']) test('composes with the real released Community Rating script '+order,async t=>{
    const community=fs.readFileSync('tests/fixtures/community-rating-0.1.5.0.js','utf8');
    const {win,calls}=setup(t,{},'',order==='before'?win=>win.eval(community):null);
    if(order==='after') win.eval(community);
    await tick();
    await win.ApiClient.getItems(user,{ParentId:collectionRoot,IncludeItemTypes:'BoxSet'});
    assert.equal(calls.length,1);assert.equal(calls[0][1].ExcludeItemIds,hidden);
    assert.ok(win.document.querySelector('#communityRatingStyles'));
});
