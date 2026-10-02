import React, {useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {MusicProvider,useMusic,useMusicLibrary} from '../src/context/MusicContext.jsx';
import {AuthProvider} from '../src/context/AuthContext.jsx';
import Music from '../src/pages/Music.jsx';
import Player from '../src/components/music/GlobalMusicPlayer.jsx';
import {musicService} from '../src/services/musicService.js';
import '../src/index.css';
class TestAudio extends EventTarget {
 constructor(){super();this.currentTime=0;this.duration=240;this.paused=true;this.src='';}
 play(){window.qaAudioPlays?.push(this.src);this.paused=false;this.dispatchEvent(new Event('play'));return Promise.resolve();}
 pause(){this.paused=true;this.dispatchEvent(new Event('pause'));}
 load(){this.dispatchEvent(new Event('loadedmetadata'));}
}
window.Audio=TestAudio;
window.qaAudioPlays=[]; window.qaResolvers={}; window.qaDelayAudio=false;
musicService.getFullAudioUrl=async id=> window.qaDelayAudio ? new Promise(resolve=>{window.qaResolvers[id]=resolve;}) : 'https://test.invalid/'+id+'.mp3';
musicService.getYouTubeId=async()=> 'aaaaaaaaaaa';
musicService.getOfficialVideo=async()=>({id:'bbbbbbbbbbb',title:'Official Video'});
window.fetch=async()=>({ok:false,json:async()=>({}),text:async()=>''});
const tracks=[1,2,3].map(n=>({id:'test-'+n,title:'Canción '+n,artist:'Un artista con un nombre bastante largo',album:'Álbum de prueba',youtubeId:'aaaaaaaaaaa',duration:240,cover:'/logo-teamg.png'}));
musicService.getTopTracks=async region=>tracks.map(t=>({...t,title:region+' '+t.title}));
musicService.getTracksByGenre=async()=>tracks;
const cloudLists=new Map();
musicService.getUserPlaylists=async()=>[...cloudLists.values()];
musicService.syncUserPlaylists=async lists=>{for(const list of lists)cloudLists.set(list.id,list);return [...cloudLists.values()];};
musicService.deleteUserPlaylist=async id=>{cloudLists.delete(id);return true;};
musicService.getCuratedPlaylists=async()=>[];
musicService.getCommunityUserPlaylists=async()=>[];
musicService.searchTracks=async()=>tracks;
musicService.getArtistDetails=async(name,id,onUpdate)=>{const detail={id:'qa-artist',name:'QA Artist',topTracks:tracks,albums:[{id:'qa-album',title:'QA Album',trackCount:14,cover:'/logo-teamg.png'}]};onUpdate?.(detail);return detail;};
const LibraryProbe=React.memo(function LibraryProbe(){useMusicLibrary();window.qaLibraryRenders=(window.qaLibraryRenders||0)+1;return null;});
musicService.getAlbumTracks=async()=>tracks;
function Seed(){const m=useMusic();window.qa=m;useEffect(()=>{m.playTrack(tracks[1],tracks);m.setIsExpandedPlayer(true);},[]);return <><LibraryProbe/><Music/><Player/></>}
createRoot(document.getElementById('root')).render(<BrowserRouter><AuthProvider><MusicProvider><Seed/></MusicProvider></AuthProvider></BrowserRouter>);
