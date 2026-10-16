import { WIDTH, HEIGHT, TILE } from './constants.ts';
import { tileAt } from './maps.ts';
import { World } from './state.ts';
export class Renderer {
 constructor(private ctx:CanvasRenderingContext2D){ctx.imageSmoothingEnabled=false;}
 draw(world:World){
  const ctx=this.ctx,rect=(x:number,y:number,w:number,h:number,c:string)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
  const camX=Math.max(0,Math.min(world.map.width*TILE-WIDTH,Math.round(world.x-WIDTH/2)));
  const camY=Math.max(0,Math.min(world.map.height*TILE-HEIGHT,Math.round(world.y-HEIGHT/2)));
  rect(0,0,WIDTH,HEIGHT,'#4c9ba9');
  // Only visible tiles are drawn, including one row above for tree crowns.
  for(let y=Math.floor(camY/TILE);y<=Math.ceil((camY+HEIGHT)/TILE);y++)for(let x=Math.floor(camX/TILE);x<=Math.ceil((camX+WIDTH)/TILE);x++){
   const px=x*TILE-camX,py=y*TILE-camY,tile=tileAt(world.map,x,y);
   if(tile==='water'){if((x+y)%3===0)rect(px+3,py+7,8,1,'#7ac0be');continue;}
   rect(px,py,TILE,TILE,tile==='sand'?'#e3ce91':tile==='path'?'#c3b37c':(x+y)%3?'#96ad63':'#8fa65d');
   if(tile==='grass'&&(x*7+y*3)%5===0){rect(px+3,py+6,1,3,'#698b50');rect(px+5,py+5,1,4,'#698b50');}
   if(tile==='tree'){rect(px+7,py+7,3,8,'#766144');rect(px+1,py,14,11,'#426e4c');rect(px+4,py-4,9,12,'#528350');rect(px+5,py-2,4,5,'#69964f');}
   if(tile==='house'){rect(px,py,16,16,'#b6a17b');rect(px,py,16,6,'#79584c');rect(px+5,py+9,6,6,'#3b5556');}
  }
  for(const b of world.map.buildings){const x=(b.x+b.w/2)*TILE-camX,y=(b.y+b.h)*TILE-camY;rect(x-4,y-9,8,9,'#63513f');if(x>-40&&x<WIDTH+40&&y>-10&&y<HEIGHT+20){ctx.font='7px sans-serif';ctx.textAlign='center';ctx.fillStyle='#fff3ce';ctx.fillText(b.name,x,y+7);}}
  const x=world.x-camX,y=world.y-camY,step=world.moving?Math.floor(world.animation/0.16)%2:0;
  rect(x-6,y+2,12,4,'#718450');rect(x-4,y-3,8,6,'#344e67');
  rect(x-4,y+3,3,3+step,'#3d4141');rect(x+1,y+3,3,4-step,'#3d4141');rect(x-5,y-9,10,7,'#edbe88');rect(x-6,y-12,12,4,'#684d39');rect(x-4,y-14,8,3,'#82603d');
  rect(x-6,y-3,2,5,'#dfac75');rect(x+4,y-3,2,5,'#dfac75');rect(x-4,y-2,8,2,'#c7d3ab');
  if(world.facing==='up'){rect(x-4,y-8,8,4,'#684d39');}else if(world.facing==='down'){rect(x-3,y-7,1,2,'#35403c');rect(x+2,y-7,1,2,'#35403c');}else{rect(x+(world.facing==='left'?-4:3),y-7,1,2,'#35403c');}
  if(world.fade>0){ctx.fillStyle=`rgba(20,47,50,${world.fade})`;ctx.fillRect(0,0,WIDTH,HEIGHT);}
 }
}
