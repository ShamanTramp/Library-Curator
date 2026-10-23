const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const fs = require('node:fs');
const html=fs.readFileSync('src/Jellyfin.Plugin.LibraryCurator/Configuration/configPage.html','utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,30));
const id='cccccccccccccccccccccccccccccccc', missing='dddddddddddddddddddddddddddddddd';
function setup(t, fail=false) {
    const writes=[];
    const dom=new JSDOM(html,{url:'http://localhost/web/',runScripts:'dangerously',beforeParse(win) {
        win.ApiClient={getCurrentUserId:()=> 'user',getUrl:(p,args)=>p+(args?'?'+new URLSearchParams(args):''),
            getDisplayPreferences:async()=>({CustomPrefs:{'app-language':'fr'}}),
            getPluginConfiguration:async()=>({Enabled:true,HideCollections:true,ExemptAdministrators:true,PlaylistLibraryName:'',HiddenCollectionIds:[id,missing]}),
            getJSON:async path=>{
                if(path.includes('Admin/Status')) return {InjectorRegistered:false};
                if(fail) throw new Error('offline');
                return {Items:[{Id:id,Name:'<b>Collection & test</b>'}],TotalRecordCount:1};
            },
            updatePluginConfiguration:async(_,config)=>{writes.push(config);}
        };
    }});
    t.after(()=>dom.window.close());
    dom.window.document.querySelector('[data-role="page"]').dispatchEvent(new dom.window.Event('viewshow'));
    return {win:dom.window,writes};
}
test('configuration lists missing selections and renders names as text',async t=>{
    const {win,writes}=setup(t);await tick();
    const doc=win.document;
    assert.match(doc.querySelector('#lc-list').textContent,/Collection introuvable/);
    assert.match(doc.querySelector('#lc-list').textContent,/<b>Collection & test<\/b>/);
    assert.equal(doc.querySelector('#lc-list b'),null);
    assert.match(doc.querySelector('#lc-status').textContent,/absent/);
    const missingLabel=[...doc.querySelectorAll('#lc-list label')].find(x=>x.textContent.includes(missing));
    const checkbox=missingLabel.querySelector('input');checkbox.checked=false;checkbox.dispatchEvent(new win.Event('change'));
    doc.querySelector('#lc-playlists').value='  Mes sélections  ';
    doc.querySelector('form').dispatchEvent(new win.Event('submit',{cancelable:true}));await tick();
    assert.deepEqual([...writes[0].HiddenCollectionIds],[id]);assert.equal(writes[0].PlaylistLibraryName,'Mes sélections');
});
test('failed list loading never enables saving an incomplete selection',async t=>{
    const {win,writes}=setup(t,true);await tick();
    assert.equal(win.document.querySelector('#lc-save').disabled,true);
    assert.match(win.document.querySelector('#lc-error').textContent,/Impossible/);
    win.document.querySelector('form').dispatchEvent(new win.Event('submit',{cancelable:true}));await tick();
    assert.equal(writes.length,0);
});
test('search finds saved collections by identifier',async t=>{
    const {win}=setup(t);await tick();
    const input=win.document.querySelector('#lc-search');input.value=missing;input.dispatchEvent(new win.Event('input'));
    assert.equal(win.document.querySelectorAll('#lc-list label').length,1);
    assert.match(win.document.querySelector('#lc-list').textContent,/introuvable/);
});
