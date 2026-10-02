const {chromium}=require('C:/Users/USUARIO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({headless:true, channel:'msedge'});
try {
const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:5178') ? route.continue() : route.abort());
await page.addInitScript(()=>{
window.qaYT=[];
window.YT={loaded:1,PlayerState:{UNSTARTED:-1,ENDED:0,PLAYING:1,PAUSED:2,BUFFERING:3,CUED:5},Player:class {
 constructor(container,options){this.time=0;this.options=options;this.el=document.createElement('div');this.el.textContent='Official videoclip test';container.append(this.el);window.qaYT.push(this);setTimeout(()=>options.events.onReady(),10);}
 getIframe(){return this.el;}getDuration(){return 240;}getCurrentTime(){return this.time;}getVideoLoadedFraction(){return 1;}seekTo(t){this.time=t;}playVideo(){this.options.events.onStateChange({data:1});}pauseVideo(){this.options.events.onStateChange({data:2});}stopVideo(){}setVolume(){}mute(){}unMute(){}destroy(){this.el.remove();}setPlaybackRate(){}cueVideoById(){}
}};
localStorage.setItem('user',JSON.stringify({username:'UI Test',plan:'premium',role:'user',expiresAt:'2099-01-01'}));localStorage.setItem('token','test-only');localStorage.setItem('teamg_music_recent_searches',JSON.stringify(['Nirvana','Karol G']));});
await page.goto('http://127.0.0.1:5178/tools/music-player-qa.html');
await page.waitForFunction(()=>window.qa?.currentTrack?.id==='test-2');
await page.waitForTimeout(500);
async function gesture(x,y,endX,endY){
await page.evaluate(({x,y,endX,endY})=>{const root=document.querySelector('.fixed.inset-0.z-\\[99999\\]') || [...document.querySelectorAll('div')].find(e=>e.className.includes('z-[99999]'));for(const [type,px,py] of [['pointerdown',x,y],['pointermove',endX,endY],['pointerup',endX,endY]]){const event=new PointerEvent(type,{bubbles:true,clientX:px,clientY:py,pointerId:1,pointerType:'touch',isPrimary:true});if(type==='pointerdown')root.setPointerCapture=()=>{};root.dispatchEvent(event);}}, {x,y,endX,endY});
await page.waitForTimeout(600);
}
await gesture(270,220,80,220);assert.equal(await page.evaluate(()=>window.qa.currentTrack.id),'test-3');
await gesture(80,220,270,220);assert.equal(await page.evaluate(()=>window.qa.currentTrack.id),'test-2');
await gesture(190,220,190,360);await page.getByText('Letra Oficial',{exact:true}).waitFor();
const seek=page.locator('input[type=range]').last();
await seek.evaluate(e=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'125');e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));});
assert.equal(await page.evaluate(()=>window.qa.audioRef.current.currentTime),125);
await page.getByRole('button',{name:'Volver a carátula'}).click();
const metrics=await page.evaluate(()=>{const e=[...document.querySelectorAll('div')].find(e=>e.dataset.testid==='music-actions');return {width:e.getBoundingClientRect().width,children:e.children.length,overflow:document.documentElement.scrollWidth>innerWidth}});
assert.equal(metrics.children,6);assert.equal(metrics.overflow,false);
await page.screenshot({path:'tmp-music-mobile-qa.png'});
await page.getByRole('button',{name:'Videoclip',exact:true}).click();
await page.waitForFunction(()=>window.qa.videoPlaybackActive && window.qaYT.length===1);
assert.equal(await page.evaluate(()=>window.qa.audioRef.current.paused),true);
await page.evaluate(()=>window.qa.seekTo(150));await page.waitForTimeout(1100);
assert.equal(await page.evaluate(()=>window.qaYT[0].time),150);
assert.equal(await page.evaluate(()=>window.qa.currentTime),150);
await page.getByRole('button',{name:'Ampliar video'}).click();
assert.equal(await page.evaluate(()=>window.qaYT.length),1);
await page.getByRole('button',{name:'Reducir video'}).click();
assert.equal(await page.evaluate(()=>window.qaYT.length),1);
await page.evaluate(()=>window.qaYT[0].options.events.onError({data:150}));
await page.getByText('El propietario no permite reproducir este videoclip aquí.').waitFor();
await page.waitForFunction(()=>!window.qa.videoPlaybackActive);
assert.equal(await page.evaluate(()=>window.qa.audioRef.current.currentTime),150);
await page.getByRole('button',{name:'Volver al audio',exact:true}).click();
await page.evaluate(()=>window.scrollTo(0,500));
await gesture(190,360,190,220);
await page.getByText('QA Artist',{exact:true}).first().waitFor();
assert.equal(await page.evaluate(()=>window.scrollY),0);
assert.equal(await page.evaluate(()=>window.qa.isExpandedPlayer),false);
assert.equal(await page.evaluate(()=>window.qa.isPlaying),true);
await page.getByText('Álbumes y Discografía (1)',{exact:true}).first().click();
await page.evaluate(()=>window.scrollTo(0,300));
await page.getByText('QA Album',{exact:true}).click();
await page.getByText('QA Album',{exact:true}).first().waitFor();
assert.equal(await page.evaluate(()=>window.scrollY),0);
await page.evaluate(()=>window.__musicBackHandler());
await page.evaluate(()=>window.__musicBackHandler());
const history=page.locator('[aria-label="Búsquedas recientes"]');
assert.equal(await history.count(),0);
const search=page.getByRole('textbox',{name:'Buscar música'});await search.focus();await history.waitFor();
assert.equal(await history.evaluate(e=>getComputedStyle(e).position),'absolute');
await history.getByRole('button',{name:'Nirvana',exact:true}).click();assert.equal(await search.inputValue(),'Nirvana');assert.equal(await history.count(),0);
await search.fill('');await search.focus();await history.waitFor();await search.press('Escape');assert.equal(await history.count(),0);
await page.getByRole('button',{name:'Perú',exact:true}).click();await page.getByText('Top Perú',{exact:true}).waitFor();await page.getByText('PE Canción 1',{exact:true}).first().waitFor();
const libraryRenders=await page.evaluate(()=>window.qaLibraryRenders);
for(let i=0;i<5;i++){await page.evaluate(time=>window.qa.setCurrentTime(time),i+10);await page.waitForTimeout(30);}
assert.equal(await page.evaluate(()=>window.qaLibraryRenders),libraryRenders);
await page.evaluate(()=>{
 window.qa.togglePlay(); window.qaDelayAudio=true; window.qaAudioPlays=[];
 window.qa.playTrack({id:'late-A',title:'Late A',artist:'Artist',youtubeId:'lateaaaaaaa',isPreviewOnly:true,audioUrl:'https://test.invalid/preview30.mp3',previewUrl:'https://test.invalid/preview30.mp3'});
});
await page.waitForFunction(()=>window.qaResolvers.lateaaaaaaa);
await page.evaluate(()=>{window.qa.playTrack({id:'late-B',title:'Late B',artist:'Artist',youtubeId:'latebbbbbbb',isPreviewOnly:true,audioUrl:'https://test.invalid/preview30.mp3',previewUrl:'https://test.invalid/preview30.mp3'});});
await page.waitForFunction(()=>window.qaResolvers.latebbbbbbb);
await page.evaluate(()=>window.qaResolvers.lateaaaaaaa('https://test.invalid/old-full.mp3'));
await page.waitForTimeout(100);assert.deepEqual(await page.evaluate(()=>window.qaAudioPlays),[]);
await page.evaluate(()=>window.qaResolvers.latebbbbbbb('https://test.invalid/new-full.mp3'));
await page.waitForFunction(()=>window.qa.audioRef.current.src.includes('new-full'));
assert.equal(await page.evaluate(()=>window.qa.isPlaying),true);
assert.deepEqual(await page.evaluate(()=>window.qaAudioPlays),['https://test.invalid/new-full.mp3']);
await page.evaluate(()=>{window.qa.playTrack({id:'late-C',title:'Late C',artist:'Artist',youtubeId:'lateccccccc'});});
await page.waitForFunction(()=>window.qaResolvers.lateccccccc);
await page.evaluate(()=>{window.qa.togglePlay();window.qaResolvers.lateccccccc('https://test.invalid/paused-full.mp3');});
await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.qa.isPlaying),false);assert.equal(await page.evaluate(()=>window.qa.audioRef.current.paused),true);
await page.evaluate(()=>{const list=window.qa.createPlaylist('Cross device');window.qa.addTrackToPlaylist(list.id,{id:'saved-song',title:'Stored song',artist:'QA'});window.qa.togglePlaylistPrivacy(list.id);});
await page.waitForFunction(()=>window.qa.playlistCloudStatus==='synced');
assert.equal(await page.evaluate(()=>window.qa.customPlaylists.find(p=>p.name==='Cross device').tracks.length),1);
assert.equal(await page.evaluate(()=>window.qa.customPlaylists.find(p=>p.name==='Cross device').isPublic),true);
assert.deepEqual(errors,[]);console.log('PASS: official video owns audio, video seek persists, large view reuses player, blocked video restores audio, left next, right previous, down lyrics, up opens artist and keeps playback, seek 125s, six aligned actions, no previews or stale audio, pause during loading respected, library clock isolated, no overflow or runtime errors');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
