import { FADE_SECONDS, RADIUS, SPEED, TILE, vectors, type Direction } from './constants.ts';
import { maps, isBlocked, type MapId } from './maps.ts';
export class World {
 mapId:MapId='VIL'; x=24*TILE+8; y=34*TILE+8; facing:Direction='down'; moving=false; animation=0;
 mode:'walk'|'run'|'sneak'='walk'; transition=0; private next:MapId|null=null;
 get map(){return maps[this.mapId];}
 reset(){this.mapId='VIL';this.x=24*TILE+8;this.y=34*TILE+8;this.transition=0;this.next=null;this.moving=false;this.facing='down';}
 canStand(x:number,y:number){return [[-RADIUS,-RADIUS],[RADIUS,-RADIUS],[-RADIUS,RADIUS],[RADIUS,RADIUS]].every(([dx,dy])=>!isBlocked(this.map,Math.floor((x+dx)/TILE),Math.floor((y+dy)/TILE)));}
 update(seconds:number,held:ReadonlySet<Direction>){
  const dt=Math.max(0,Math.min(seconds,0.1));this.moving=false;
  if(this.next){this.transition+=dt;if(this.transition>=FADE_SECONDS/2&&this.mapId!==this.next){this.mapId=this.next;this.x=(this.map.width/2+0.5)*TILE;this.y=this.mapId==='GRASS'?(this.map.height-1.5)*TILE:1.5*TILE;}if(this.transition>=FADE_SECONDS){this.next=null;this.transition=0;}return;}
  let dx=0,dy=0;for(const dir of held){dx+=vectors[dir][0];dy+=vectors[dir][1];this.facing=dir;}
  const norm=Math.hypot(dx,dy)||1,speed=SPEED*(this.mode==='run'?1.6:this.mode==='sneak'?0.5:1);
  // Small substeps preserve collision even after a delayed frame.
  const count=Math.max(1,Math.ceil(speed*dt/3));
  const beforeX=this.x,beforeY=this.y;
  for(let i=0;i<count;i++){const nx=this.x+dx/norm*speed*dt/count,ny=this.y+dy/norm*speed*dt/count;
   if(this.canStand(nx,this.y))this.x=nx;if(this.canStand(this.x,ny))this.y=ny;
   const center=this.map.width/2*TILE;
   if(Math.abs(this.x-center)<24&&((this.mapId==='VIL'&&this.y<16)||(this.mapId==='GRASS'&&this.y>(this.map.height-1)*TILE))){this.next=this.mapId==='VIL'?'GRASS':'VIL';this.transition=0;break;}
  }
  this.moving=this.x!==beforeX||this.y!==beforeY;if(this.moving)this.animation+=dt;
 }
 get transitioning(){return this.next!==null;}
 get fade(){return this.next?1-Math.abs(this.transition/(FADE_SECONDS/2)-1):0;}
}
