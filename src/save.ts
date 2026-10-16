import type { Snapshot } from './session.ts';
import { species } from './session.ts';
import { World } from './state.ts';
export interface StorageLike {getItem(key:string):string|null;setItem(key:string,value:string):void}
interface RecordData {generation:number; checksum:string; data:Snapshot}
const PREFIX='silent-castaway.v1.';
function object(v:unknown):v is Record<string,unknown>{return typeof v==='object'&&v!==null&&!Array.isArray(v);}
function number(v:unknown,min:number,max:number){return typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;}
export function checksum(text:string){let hash=2166136261;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);return (hash>>>0).toString(16);}
export function validateSnapshot(v:unknown):Snapshot{
 if(!object(v)||v.version!==1||!Number.isInteger(v.rngSeed)||!number(v.rngSeed,0,4294967295)||!number(v.clock,0,1e12)||!number(v.escapeGrace,0,3)||!number(v.hp,1,120)||!number(v.mp,0,160)||!['VIL','GRASS'].includes(String(v.mapId))||!['up','down','left','right'].includes(String(v.facing))||!number(v.x,0,1152)||!number(v.y,0,896))throw new Error('保存データの形式・バージョンが正しくありません。');
 if(!object(v.story))throw new Error('物語データが不正です。');
 const flags=v.story;
 if(!['rescued','gathered','trained','wedge'].every(k=>typeof flags[k]==='boolean'))throw new Error('物語データが不正です。');
 const story=v.story;if(!story.wedge||!story.trained||!story.gathered||!story.rescued)throw new Error('魂の楔の取得前のデータは保存できません。');
 if(!object(v.inventory)||Object.keys(v.inventory).length>100||!Object.values(v.inventory).every(n=>Number.isInteger(n)&&number(n,0,1e6))||v.inventory['魂の楔']!==1)throw new Error('所持品データが不正です。');
 if(!Array.isArray(v.enemies)||v.enemies.length!==6)throw new Error('魔物データが不正です。');
 const ids=new Set();for(const e of v.enemies){if(!object(e)||!['rat','slime'].includes(String(e.kind))||typeof e.id!=='string'||!/^enemy-[0-5]$/.test(e.id)||ids.has(e.id)||!number(e.x,16,1136)||!number(e.y,16,880)||!number(e.hp,0,species[e.kind as 'rat'|'slime'].hp)||!number(e.respawnAt,0,1e12)||!number(e.heading,-100,100)||!number(e.aiTimer,-1,10))throw new Error('魔物データが不正です。');ids.add(e.id);}
 const s=v as unknown as Snapshot,w=new World();w.mapId=s.mapId;if(!w.canStand(s.x,s.y))throw new Error('保存位置が通行できない場所です。');
 return structuredClone(s);
}
function parse(raw:string):RecordData{
 if(raw.length>1_000_000)throw new Error('保存データが大きすぎます。');
 const record:unknown=JSON.parse(raw);if(!object(record)||!Number.isSafeInteger(record.generation)||!number(record.generation,1,Number.MAX_SAFE_INTEGER)||typeof record.checksum!=='string'||record.checksum!==checksum(JSON.stringify(record.data)))throw new Error('保存データのチェックサムが一致しません。');
 return {generation:record.generation as number,checksum:record.checksum,data:validateSnapshot(record.data)};
}
export class SaveStore {
 private storage:StorageLike;
 constructor(storage:StorageLike){this.storage=storage;}
 private entries(){return ['A','B'].map(slot=>{const raw=this.storage.getItem(PREFIX+slot);if(!raw)return null;try{return {slot,record:parse(raw)};}catch{return null;}}).filter(e=>e!==null).sort((a,b)=>b.record.generation-a.record.generation);}
 load(){const data=this.entries()[0]?.record.data;if(data)return data;if(['A','B'].some(slot=>this.storage.getItem(PREFIX+slot)!==null))throw new Error('保存データが破損しています。正常なJSONを読み込んでください。');return null;}
 save(snapshot:Snapshot){const data=validateSnapshot(snapshot),previous=this.entries()[0];const generation=(previous?.record.generation??0)+1;
  const raw=JSON.stringify({generation,checksum:checksum(JSON.stringify(data)),data});
  // Write the older slot; never overwrite the newest valid generation first.
  const slot=previous?.slot==='A'?'B':'A';this.storage.setItem(PREFIX+slot,raw);return data;
 }
 export(snapshot:Snapshot){const data=validateSnapshot(snapshot);return JSON.stringify({generation:1,checksum:checksum(JSON.stringify(data)),data},null,2);}
 import(raw:string){const data=parse(raw).data;this.save(data);return data;}
}
