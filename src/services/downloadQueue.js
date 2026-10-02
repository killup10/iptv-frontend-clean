export class DownloadQueue {
  constructor(limit=2){this.limit=limit;this.running=0;this.pending=[];this.tasks=new Map();}
  enqueue(id, task, onQueued=()=>{}){
    if(this.tasks.has(id))return this.tasks.get(id);
    let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
    this.tasks.set(id,promise);this.pending.push({id,task,resolve,reject});onQueued();this.pump();return promise;
  }
  pump(){
    while(this.running<this.limit && this.pending.length){
      const job=this.pending.shift();this.running++;
      Promise.resolve().then(job.task).then(job.resolve,job.reject).finally(()=>{this.running--;this.tasks.delete(job.id);this.pump();});
    }
  }
}
