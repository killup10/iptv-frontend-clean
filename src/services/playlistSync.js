// Account-scoped local outbox. Only changed playlists are written to the server.
export class PlaylistSync {
  constructor({ account, storage, api, onChange, onStatus, delay = 1000 }) {
    Object.assign(this, { account, storage, api, onChange, onStatus, delay });
    this.key = 'teamg_playlists_v2_' + encodeURIComponent(account);
    this.closed = false; this.running = null; this.timer = null; this.lastSync = 0;
    let saved; try { saved = JSON.parse(storage.getItem(this.key) || 'null'); } catch {}
    const owner = storage.getItem('teamg_playlist_legacy_owner');
    let legacy = []; if (!saved && (!owner || owner === account)) {
      try { legacy = JSON.parse(storage.getItem('teamg_music_custom_playlists_v1') || '[]'); } catch {}
      storage.setItem('teamg_playlist_legacy_owner', account);
    }
    this.items = saved?.items || legacy; this.dirty = new Map(saved?.dirty || []);
    this.deleted = new Map(saved?.deleted || []); this.migrate = !saved; this.version = Date.now();
    onChange(this.items); this.persist();
  }
  persist() {
    this.storage.setItem(this.key, JSON.stringify({items:this.items,dirty:[...this.dirty],deleted:[...this.deleted]}));
  }
  update(items, dirtyIds = [], deletedIds = []) {
    this.items = items;
    for (const id of dirtyIds) { this.dirty.set(id, ++this.version); this.deleted.delete(id); }
    for (const id of deletedIds) { this.deleted.set(id, ++this.version); this.dirty.delete(id); }
    this.persist(); this.onStatus('pending'); clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush().catch(() => {}), this.delay);
  }
  merge(remote) {
    const local = new Map(this.items.map(p=>[p.id,p])); const merged = new Map();
    for (const item of remote) {
      if (this.deleted.has(item.id)) continue;
      let result = this.dirty.has(item.id) ? local.get(item.id) : item;
      if (this.migrate && local.has(item.id) && !this.dirty.has(item.id)) {
        const old=local.get(item.id);const tracks=new Map((item.tracks||[]).map(t=>[t.id,t]));
        for (const track of old.tracks||[]) if (!tracks.has(track.id)) tracks.set(track.id,track);
        if (tracks.size > (item.tracks||[]).length) {
          result={...item,tracks:[...tracks.values()]};this.dirty.set(item.id,++this.version);
        }
      }
      if (result) merged.set(item.id,result);
    }
    for (const item of this.items) if (!merged.has(item.id) && !this.deleted.has(item.id)) {
      if (this.dirty.has(item.id) || this.migrate) {
        merged.set(item.id,item);if (!this.dirty.has(item.id)) this.dirty.set(item.id,++this.version);
      }
    }
    this.items=[...merged.values()];this.migrate=false;this.persist();this.onChange(this.items);
  }
  flush({force=false}={}) {
    if (this.closed) return Promise.resolve();
    if (this.running) return this.running;
    if (!force && !this.dirty.size && !this.deleted.size && Date.now()-this.lastSync<90000) return Promise.resolve();
    clearTimeout(this.timer);this.onStatus('syncing');
    this.running=this.run(force).then(()=>{if(!this.closed)this.onStatus(this.dirty.size||this.deleted.size?'pending':'synced');})
      .catch(error=>{if(!this.closed)this.onStatus('error');throw error;}).finally(()=>{this.running=null;});
    return this.running;
  }
  async run(force) {
    if (force || !this.lastSync) {
      const remote=await this.api.getUserPlaylists(); if(this.closed)return;
      if(!Array.isArray(remote)) throw new Error('No se pudo consultar las playlists de tu cuenta.');
      this.merge(remote);
    }
    for (const [id,version] of [...this.deleted]) {
      const ok=await this.api.deleteUserPlaylist(id);if(this.closed)return;
      if(!ok)throw new Error('No se pudo eliminar la playlist de tu cuenta.');
      if(this.deleted.get(id)===version)this.deleted.delete(id);this.persist();
    }
    const versions=new Map(this.dirty);
    const pending=this.items.filter(p=>versions.has(p.id));
    if(pending.length){
      const remote=await this.api.syncUserPlaylists(pending);if(this.closed)return;
      if(!Array.isArray(remote))throw new Error('La playlist sigue guardada en este dispositivo; falta sincronizarla.');
      for(const [id,version]of versions)if(this.dirty.get(id)===version)this.dirty.delete(id);
      this.merge(remote);
    }
    this.lastSync=Date.now();this.persist();
    // Edits made during a request must be sent after that request, never overwritten by it.
    if(this.dirty.size || this.deleted.size) {clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush().catch(()=>{}),this.delay);}
  }
  close(){this.closed=true;clearTimeout(this.timer);}
}
