import { World } from './state.ts';
import { maps, isBlocked, type MapId } from './maps.ts';
import type { Direction } from './constants.ts';

export type Species = 'rat' | 'slime' | 'fowl';
export const species = {
 rat: { name:'野ネズミ', hp:18, atk:8, def:2, spd:4, cooldown:1.8, drop:'小さな皮' },
 slime: { name:'森スライム', hp:24, atk:10, def:3, spd:2, cooldown:3.8, drop:'粘液' },
 fowl: { name:'家禽（模擬戦）', hp:16, atk:4, def:1, spd:2, cooldown:3, drop:'' },
} as const;
export interface Enemy { id:string; kind:Species; x:number; y:number; hp:number; respawnAt:number; heading:number; aiTimer:number }
export interface Battle { enemyId:string; attackTimer:number; inputTimer:number; defending:boolean; elapsed:number }
export interface Story { rescued:boolean; gathered:boolean; trained:boolean; wedge:boolean }
export interface Snapshot {
 version:1; rngSeed:number; clock:number; escapeGrace:number; mapId:MapId; x:number; y:number; facing:Direction;
 hp:number; mp:number; enemies:Enemy[]; inventory:Record<string,number>; story:Story;
}
export type Command = 'attack' | 'defend' | 'escape';
const initialEnemies=():Enemy[]=>Array.from({length:6},(_,i)=>({
 id:`enemy-${i}`,kind:i%2?'slime':'rat', x:(i%2?38:34)*16+8, y:(50-i*6)*16+8,
 hp:i%2?24:18,respawnAt:0,heading:0,aiTimer:0,
}));
export class Session {
 world=new World(); clock=8*3600; rngSeed=0x4137ac;
 hp=120; mp=160; inventory:Record<string,number>={'流木':1};
 story:Story={rescued:false,gathered:false,trained:false,wedge:false};
 enemies=initialEnemies(); battle:Battle|null=null;
 screen:'title'|'field'|'dead'='title'; message='';
 checkpoint:Snapshot; gathering=0; private escapeGrace=0;
 constructor(){this.checkpoint=this.snapshot();}
 random(){this.rngSeed=(Math.imul(1664525,this.rngSeed)+1013904223)>>>0;return this.rngSeed/4294967296;}
 get timeLabel(){const total=Math.floor(this.clock/60);return `DAY ${Math.floor(total/1440)+1} ${String(Math.floor(total/60)%24).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;}
 get enemy(){return this.battle?this.enemies.find(e=>e.id===this.battle!.enemyId):undefined;}
 start(){this.screen='field';this.message='声を奪われ、南海岸へ漂着した。流木を手に取ると、無言のまま魔力が漏れた。近くの畜産家ダンを調べよう。';}
 update(seconds:number,held:ReadonlySet<Direction>,hidden=false){
  if(this.screen!=='field'||hidden)return;
  const dt=Math.max(0,Math.min(seconds,0.1)); this.clock+=dt*10;
  this.escapeGrace=Math.max(0,this.escapeGrace-dt);
  if(this.gathering>0){const progress=Math.min(dt,this.gathering);this.gathering-=progress;this.clock+=progress*140;if(this.gathering<=0){this.story.gathered=true;this.inventory['草']=1;this.message='草を採った。ダンのところへ戻ろう。';}return;}
  if(this.battle){
   this.world.moving=false;this.battle.elapsed+=dt;this.battle.inputTimer=Math.max(0,this.battle.inputTimer-dt);
   this.battle.attackTimer-=dt;
   if(this.battle.attackTimer<=0){const e=this.enemy!;this.battle.attackTimer+=species[e.kind].cooldown;this.enemyAttack(e);}
   return;
  }
  this.world.update(dt,held);
  if(this.world.mapId!=='GRASS')return;
  const w=this.world;
  for(const e of this.enemies){
   if(e.kind==='fowl')continue;
   if(e.hp<=0){if(this.clock<e.respawnAt)continue;e.hp=species[e.kind].hp;}
   e.aiTimer-=dt;
   if(e.aiTimer<=0){e.heading=this.random()*Math.PI*2;e.aiTimer=1+this.random()*2;}
   const distance=Math.hypot(w.x-e.x,w.y-e.y);
   // Rats flee; slimes wander slowly. Neither sees across the map boundary.
   const angle=e.kind==='rat'&&distance<64?Math.atan2(e.y-w.y,e.x-w.x):e.heading;
   const speed=e.kind==='rat'?18:7;
   const nx=e.x+Math.cos(angle)*speed*dt,ny=e.y+Math.sin(angle)*speed*dt;
   if(nx>16&&nx<(maps.GRASS.width-1)*16&&ny>16&&ny<(maps.GRASS.height-3)*16&&!isBlocked(maps.GRASS,Math.floor(nx/16),Math.floor(ny/16))){e.x=nx;e.y=ny;}
   if(this.escapeGrace===0&&distance<13){this.beginBattle(e);break;}
  }
 }
 beginBattle(enemy:Enemy){if(this.screen!=='field'||this.battle||enemy.hp<=0)return;this.battle={enemyId:enemy.id,attackTimer:species[enemy.kind].cooldown,inputTimer:0,defending:false,elapsed:0};this.message=`${species[enemy.kind].name}と遭遇した。選択中も敵は攻撃する。`;}
 private hit(atk:number,def:number,spd:number,targetSpd:number){if(this.random()*100>=Math.min(95,Math.max(55,85+(spd-targetSpd)*1.5)))return 0;const critical=this.random()<.05?1.6:1;return Math.max(1,Math.floor((atk*(.85+this.random()*.3)-def*.45)*critical));}
 private enemyAttack(e:Enemy){const s=species[e.kind];let damage=this.hit(s.atk,0,s.spd,1/3);
  if(this.battle!.defending){damage=Math.ceil(damage*.5);this.battle!.defending=false;}
  if(damage&&this.random()<.04)damage=Math.ceil(damage*.5);
  this.hp=Math.max(0,this.hp-damage);this.message=damage?`${s.name}の攻撃。${damage}ダメージ。`:`${s.name}の攻撃をかわした。`;
  if(!this.hp){if(e.kind==='fowl'){this.hp=120;this.finishTraining();this.message='気絶した。ダンに介抱された。模擬戦はこれで終わりだ。';}else{this.battle=null;this.screen='dead';this.message='命が尽きた。魂を戻すと、最後の保存時点へすべて巻き戻る。';}}
 }
 command(command:Command){if(!this.battle||this.battle.inputTimer>0||this.screen!=='field')return false;
  this.battle.inputTimer=.4;const e=this.enemy!,s=species[e.kind];
  if(command==='defend'){this.battle.defending=true;this.message='次の敵の攻撃を半減する。';return true;}
  if(command==='escape'){
   const chance=Math.min(90,Math.max(20,60+(1/3-s.spd)*2+(e.kind==='rat'?10:0)));
   if(this.random()*100<chance){if(e.kind==='fowl')this.finishTraining();else this.battle=null;this.escapeGrace=3;this.message='距離をとって離脱した。';}else this.message='逃げきれなかった。';return true;
  }
  const damage=this.hit(2+2, s.def,1/3,s.spd); // Driftwood base ATK 2; sword skill Lv1.
  e.hp=Math.max(0,e.hp-damage);this.message=damage?`${s.name}に${damage}ダメージ。`:'攻撃が外れた。';
  if(!e.hp){if(e.kind==='fowl'){this.finishTraining();}else{e.respawnAt=this.clock+(30+Math.floor(this.random()*61))*60;this.inventory[s.drop]=(this.inventory[s.drop]||0)+1;this.battle=null;this.message=`${s.name}を倒し、${s.drop}を手に入れた。銅貨は落とさない。`;}}
  return true;
 }
 private finishTraining(){this.battle=null;this.story.trained=true;this.enemies=this.enemies.filter(e=>e.kind!=='fowl');this.message='家禽との一度きりの模擬戦を終えた。村長ロアンに報告しよう。';}
 get objective(){return !this.story.rescued?'浜辺のダンに話しかける':!this.story.gathered?'村の薬草畑の草を採る':!this.story.trained?'ダンに戻り、家禽の模擬戦へ':!this.story.wedge?'村長ロアンに報告する':'草原へ探索に出よう。メニューから魂の楔で保存できる。';}
 interact(){
  if(this.screen!=='field'||this.battle||this.gathering>0)return;
  const w=this.world,near=(x:number,y:number)=>Math.hypot(w.x-x*16-8,w.y-y*16-8)<36;
  if(w.mapId==='VIL'){
   const dan=this.story.rescued?{x:16,y:30}:{x:25,y:34};
   if(near(dan.x,dan.y)){
    if(!this.story.rescued){this.story.rescued=true;this.inventory['紙とペン']=1;this.message='ダン「声が出ないのか。紙とペンを渡そう。これで筆談するといい。家畜小屋を貸そう。まずは道沿いの草を採ってみなさい」';}
    else if(!this.story.gathered)this.message='ダン「小屋の東、道沿いの草を調べてみなさい」';
    else if(!this.story.trained){const e:Enemy={id:'training',kind:'fowl',x:w.x+16,y:w.y,hp:16,respawnAt:0,heading:0,aiTimer:0};this.enemies.push(e);this.beginBattle(e);}
    else this.message='ダン「村長に居住の許可をもらっておいで」';return;
   }
   if(near(24,30)){if(!this.story.rescued)this.message='まず近くのダンに声の代わりに身振りで話しかけよう。';else if(!this.story.gathered){this.gathering=2;this.message='安全な村の草を採っている…（ゲーム内5分）';}else this.message='草は採取済みだ。';return;}
   if(near(29,17)){if(!this.story.trained){this.message='ロアン「まずダンに島の暮らしを教わるといい」';}else if(!this.story.wedge){this.story.wedge=true;this.inventory['魔法の袋']=1;this.inventory['魂の楔']=1;this.message='ロアン「居住を認めよう。魔法の袋と魂の楔を授ける。楔で保存すれば、死んでも保存した時点へ戻れる」';}else this.message='ロアン「草原へ行くなら、魂の楔で保存を忘れずに」';return;}
  }
  this.message=this.objective;
 }
 snapshot():Snapshot{return structuredClone({version:1,rngSeed:this.rngSeed,clock:this.clock,escapeGrace:this.escapeGrace,mapId:this.world.mapId,x:this.world.x,y:this.world.y,facing:this.world.facing,hp:this.hp,mp:this.mp,enemies:this.enemies,inventory:this.inventory,story:this.story});}
 restore(s:Snapshot){this.world.reset();this.world.mapId=s.mapId;this.world.x=s.x;this.world.y=s.y;this.world.facing=s.facing;this.clock=s.clock;this.rngSeed=s.rngSeed;this.hp=s.hp;this.mp=s.mp;this.inventory=structuredClone(s.inventory);this.story=structuredClone(s.story);this.enemies=structuredClone(s.enemies);this.battle=null;this.gathering=0;this.escapeGrace=s.escapeGrace;this.screen='field';this.message='保存時点へ戻った。';}
}
