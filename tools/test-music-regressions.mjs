import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const player = readFileSync(new URL('../src/components/music/GlobalMusicPlayer.jsx', import.meta.url), 'utf8');
const service = readFileSync(new URL('../src/services/musicService.js', import.meta.url), 'utf8');
const sandbox = { assert, console };
vm.createContext(sandbox);
vm.runInContext(player.slice(player.indexOf('function parseLrc'), player.indexOf('// Consulta de letras')) +
`assert.equal(JSON.stringify(parseLrc('[offset:-500]\\n[00:20.00][00:40.00]Chorus\\n[00:01.25]Intro\\n[00:30.00]')), JSON.stringify([{time:.75,text:'Intro'},{time:19.5,text:'Chorus'},{time:29.5,text:''},{time:39.5,text:'Chorus'}]));
assert.equal(parseLrc('[ar:Artist]'),null);`, sandbox);
sandbox.formatItunesTrack = t => ({ id: t.trackId, trackNumber: t.trackNumber });
sandbox.fetchDeezerApi = () => { throw Error('Wrong provider'); };
sandbox.fetch = async url => {
  assert.match(url, /lookup\?id=123&entity=song/);
  return { ok:true, json:async()=>({results:[
    {wrapperType:'collection',collectionId:123},
    {wrapperType:'track',collectionId:123,trackId:2,trackNumber:2},
    {wrapperType:'track',collectionId:123,trackId:1,trackNumber:1},
    {wrapperType:'track',collectionId:456,trackId:3}
  ]})};
};
const start = service.indexOf('  async getAlbumTracks(');
const method = service.slice(start, service.indexOf('  /**', start));
const albumService = vm.runInContext('({' + method + '})', sandbox);
assert.equal(JSON.stringify(await albumService.getAlbumTracks('itunes_album_123')), JSON.stringify([{id:1,trackNumber:1},{id:2,trackNumber:2}]));
console.log('PASS: LRC offsets, repeated timestamps, instrumental reset, exact collection lookup, foreign collection exclusion, track order');

const officialStart = service.indexOf('export function selectOfficialVideo');
const officialEnd = service.indexOf('export const musicService', officialStart);
const selectOfficialVideo = vm.runInContext(service.slice(officialStart, officialEnd).replace('export function', 'function') + ';selectOfficialVideo;', sandbox);
const renderer = (id,title) => ({videoRenderer:{videoId:id,title:{simpleText:title},ownerText:{simpleText:'NirvanaVEVO'}}});
assert.equal(selectOfficialVideo([renderer('lyrics','Nirvana - Smells Like Teen Spirit (Official Lyric Video)'),renderer('audio','Nirvana - Smells Like Teen Spirit (Official Audio)'),renderer('official','Nirvana - Smells Like Teen Spirit (Official Music Video)')],'Nirvana','Smells Like Teen Spirit').id,'official');
assert.equal(selectOfficialVideo([renderer('lyrics','Nirvana - Smells Like Teen Spirit (Official Lyric Video)')],'Nirvana','Smells Like Teen Spirit'),null);
const native = readFileSync(new URL('../android/app/src/main/java/play/teamg/store/MusicPlaybackPlugin.java',import.meta.url),'utf8');
assert.match(native,/Math.round\(call.getDouble\("position", 0.0\)\)/);
assert.doesNotMatch(native,/call.getLong\("position"/);
console.log('PASS: official videoclip selection rejects lyric/audio, Android accepts numeric seek');

assert.equal(selectOfficialVideo({videoWithContextRenderer:{videoId:'android',headline:{runs:[{text:'Nirvana - Smells Like Teen Spirit (Official Music Video)'}]},shortBylineText:{simpleText:'Nirvana'}}},'Nirvana','Smells Like Teen Spirit').id,'android');
console.log('PASS: Android official video result format');

const {consolidateAlbums,recentCatalog}=await import('../src/services/musicCatalog.js');
const albums=consolidateAlbums([{id:'a',title:'Blurryface',trackCount:14},{id:'b',title:'Blurryface (Deluxe Edition)',trackCount:16},{id:'c',title:'Blurryface',trackCount:1},{id:'d',title:'Heathens - Single',trackCount:1},{id:'e',title:'Trench',trackCount:14}]);
assert.equal(albums.length,2);assert.equal(albums.find(a=>a.title.startsWith('Blurry')).trackCount,16);
const recent=recentCatalog([{id:1,title:'Song',artist:'Artist',releaseDate:'2026-09-30'},{id:2,title:'Song',artist:'Artist',releaseDate:'2026-09-30'},{id:3,title:'Future',releaseDate:'2026-10-02'},{id:4,title:'Old',releaseDate:'2025-09-30'},{id:5,title:'Unknown'},{id:6,title:'New',releaseDate:'2026-10-01'}],150,new Date('2026-10-01'));
assert.deepEqual(recent.map(t=>t.id),[6,1]);
console.log('PASS: album editions consolidated, singles excluded, recent dates verified, future/old/unknown releases excluded, cross-provider duplicate songs removed');

sandbox.consolidateAlbums=consolidateAlbums; sandbox.ITUNES_SEARCH_URL="https://itunes.apple.com/search";
sandbox.sessionStorage={getItem:()=>null,setItem:()=>{}};
let releaseDeezer;const slowDeezer=new Promise(resolve=>{releaseDeezer=resolve;});
sandbox.fetchDeezerApi=()=>slowDeezer;
let artistCalls=0;
sandbox.itunesJson=async url=>{artistCalls++;
 if(url.includes('entity=musicArtist'))return {results:[{artistId:123,artistName:'QA Artist'}]};
 if(url.includes('entity=album'))return {results:[{wrapperType:'collection',collectionId:456,collectionName:'Full Album',artistName:'QA Artist',trackCount:14}]};
 return {results:[{wrapperType:'track',trackId:1,artistName:'QA Artist',collectionId:456}]};
};
const artistStart=service.indexOf('  getArtistDetails(');const artistEnd=service.indexOf('  /**',artistStart);
const artistApi=vm.runInContext('({'+service.slice(artistStart,artistEnd)+'})',sandbox);
const updates=[];const pending=artistApi.getArtistDetails('QA Artist',null,data=>updates.push(data));
await new Promise(resolve=>setTimeout(resolve,0));assert.ok(updates.some(data=>data.albums?.[0]?.trackCount===14 && data.isLoading));
releaseDeezer(null);const detail=await pending;assert.equal(detail.albums.length,1);assert.equal(detail.albums[0].trackCount,14);
const beforeCache=artistCalls;await artistApi.getArtistDetails('QA Artist');assert.equal(artistCalls,beforeCache);
console.log('PASS: artist opens progressively while other provider waits, full collection counts retained, repeat profile uses cache');
