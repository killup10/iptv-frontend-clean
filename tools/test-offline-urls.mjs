import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
const source=readFileSync(new URL('../src/services/offlineStorage.js',import.meta.url),'utf8');const start=source.indexOf('export async function resolveDirectVideoUrl');const end=source.indexOf('/**',start);
let requested;const scope={URL,console,navigator:{onLine:true},axiosInstance:{defaults:{baseURL:'https://api.teamg.store'},get:async url=>{requested=url;return {data:{downloadUrl:'https://www.dropbox.com/s/video.mp4?dl=1'}};}}};vm.createContext(scope);
const resolve=vm.runInContext(source.slice(start,end).replace('export async','async')+';resolveDirectVideoUrl;',scope);
assert.equal(await resolve('/api/videos/playback/token'),'https://dl.dropboxusercontent.com/s/video.mp4?dl=1');assert.equal(requested,'https://api.teamg.store/api/videos/playback/token?resolve=1');
await resolve('http://localhost/api/videos/playback/token');assert.equal(requested,'https://api.teamg.store/api/videos/playback/token?resolve=1');
await assert.rejects(resolve('http://localhost/video.mp4'),/servidor de contenido/);await assert.rejects(resolve('relative.mp4'),/válido/);
scope.axiosInstance.get=async()=>({data:{}});await assert.rejects(resolve('/api/videos/playback/token'),/enlace directo/);
console.log('PASS: relative and localhost playback URLs resolve against real API, direct CDN links normalized, local video and invalid resolver responses rejected');
