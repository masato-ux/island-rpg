export type MapId = 'VIL' | 'GRASS';
export type Tile = 'grass' | 'sand' | 'water' | 'path' | 'tree' | 'house';
export interface Building {x:number; y:number; w:number; h:number; name:string}
export interface GameMap {id:MapId; name:string; width:number; height:number; buildings:Building[]}
export const maps:Record<MapId,GameMap> = {
 VIL:{id:'VIL',name:'南の村・海岸',width:48,height:40,buildings:[
 {x:26,y:12,w:6,h:4,name:'村長宅'}, {x:32,y:20,w:6,h:4,name:'農家'},
 {x:9,y:20,w:6,h:4,name:'畜産家'}, {x:9,y:26,w:6,h:4,name:'家畜小屋'},
 {x:19,y:20,w:4,h:4,name:'鍛冶屋'}, {x:26,y:20,w:4,h:4,name:'薬屋'}]},
 GRASS:{id:'GRASS',name:'南部草原',width:72,height:56,buildings:[]}
};
export function tileAt(map:GameMap,x:number,y:number):Tile {
 if(x<0||y<0||x>=map.width||y>=map.height)return 'water';
 const cx=map.width/2;
 if(Math.abs(x-cx)<=1 && (map.id==='GRASS'||y<34))return 'path';
 if(map.id==='VIL'){
  if(y>=37||x<2||x>=46)return 'water';
  if(y>=33)return 'sand';
  if(map.buildings.some(b=>x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h))return 'house';
  if(y===24&&x>=8&&x<=38)return 'path';
  if(x<5||x>42||((x*13+y*7)%43===0&&y<30))return 'tree';
 }else{
  if(x===0||y===0||x===map.width-1)return 'tree';
  if((x*17+y*11)%53===0||((x<9||x>62)&&y%3!==0))return 'tree';
  if(x>48&&x<58&&y>18&&y<25)return 'water';
 }
 return 'grass';
}
export function isBlocked(map:GameMap,x:number,y:number){return ['water','tree','house'].includes(tileAt(map,x,y));}
