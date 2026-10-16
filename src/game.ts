import { WIDTH, HEIGHT, type Direction } from './constants.ts';
import { World } from './state.ts';
import { Renderer } from './renderer.ts';
const canvas=document.querySelector<HTMLCanvasElement>('#world')!;
const notice=document.querySelector<HTMLElement>('#notice')!;
function fail(error:unknown){notice.hidden=false;notice.textContent=`ゲームを起動できませんでした。ページを再読み込みしてください。 ${error instanceof Error?error.message:String(error)}`;}
try{
 canvas.width=WIDTH;canvas.height=HEIGHT;
 function resize(){const available=canvas.parentElement!.clientWidth;const scale=available<WIDTH?available/WIDTH:Math.floor(available/WIDTH);canvas.style.width=`${WIDTH*scale}px`;canvas.style.height=`${HEIGHT*scale}px`;}
 resize();addEventListener('resize',resize);
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas 2Dを初期化できませんでした。');
 const world=new World(),renderer=new Renderer(ctx),held=new Set<Direction>(),keyboard=new Set<Direction>(),pointers=new Map<number,Direction>();
 const keys:Record<string,Direction>={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};
 const buttons=[...document.querySelectorAll<HTMLButtonElement>('[data-dir]')];
 let shift=false,alt=false,last:number|null=null;
 function refresh(){held.clear();for(const d of keyboard)held.add(d);for(const d of pointers.values())held.add(d);buttons.forEach(b=>b.classList.toggle('active',held.has(b.dataset.dir as Direction)));}
 function clear(){keyboard.clear();pointers.clear();shift=false;alt=false;refresh();last=null;}
 addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey)return;const dir=keys[e.key]||keys[e.key.toLowerCase()];if(dir){e.preventDefault();keyboard.add(dir);refresh();}if(e.key==='Shift')shift=true;if(e.key==='Alt'){e.preventDefault();alt=true;}});
 addEventListener('keyup',e=>{const dir=keys[e.key]||keys[e.key.toLowerCase()];if(dir){keyboard.delete(dir);refresh();}if(e.key==='Shift')shift=false;if(e.key==='Alt')alt=false;});
 buttons.forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();if(e.isTrusted)b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,b.dataset.dir as Direction);refresh();});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>{pointers.delete((e as PointerEvent).pointerId);refresh();});b.addEventListener('contextmenu',e=>e.preventDefault());});
 addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
 document.querySelector('#reset')!.addEventListener('click',()=>{clear();world.reset();render();});
 const mode=document.querySelector<HTMLButtonElement>('#mode')!;let touchMode:World['mode']='walk';
 mode.addEventListener('click',()=>{touchMode=touchMode==='walk'?'run':touchMode==='run'?'sneak':'walk';mode.textContent={walk:'歩く',run:'走る',sneak:'忍び足'}[touchMode];});
 const info=document.querySelector<HTMLElement>('#action-info')!;
 document.querySelector('#inspect')!.addEventListener('click',()=>{info.textContent=world.mapId==='VIL'?'南の村です。北へ進むと草原へ出られます。':'南部草原です。南へ戻ると村へ帰れます。';});
 document.querySelector('#menu')!.addEventListener('click',()=>{info.textContent='第1段階：移動・マップ切替の検証版です。会話・保存は開発予定です。';});
 function render(){renderer.draw(world);canvas.dataset.playerX=world.x.toFixed(2);canvas.dataset.playerY=world.y.toFixed(2);canvas.dataset.map=world.mapId;document.querySelector('#position')!.textContent=`座標 ${Math.floor(world.x/16)}, ${Math.floor(world.y/16)}`;document.querySelector('#map-name')!.textContent=world.map.name;document.querySelector('.location')!.textContent=world.mapId==='VIL'?'VIL / 南の村・海岸':'GRASS / 南部草原';}
 render();const pixels=ctx.getImageData(0,0,WIDTH,HEIGHT).data;if(!pixels.some((v,i)=>i%4!==3&&v>0))throw new Error('描画結果を確認できませんでした。');
 notice.hidden=true;canvas.dataset.ready='true';
 function frame(now:number){try{const dt=last===null?0:Math.max(0,Math.min((now-last)/1000,0.1));last=now;if(!document.hidden){world.mode=alt?'sneak':shift?'run':touchMode;world.update(dt,held);render();}requestAnimationFrame(frame);}catch(error){fail(error);}}
 requestAnimationFrame(frame);
}catch(error){fail(error);}
