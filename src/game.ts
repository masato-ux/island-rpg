import { WIDTH, HEIGHT, type Direction } from './constants.ts';
import { Session, species } from './session.ts';
import { SaveStore } from './save.ts';
import { Renderer } from './renderer.ts';

const canvas=document.querySelector<HTMLCanvasElement>('#world')!;
const notice=document.querySelector<HTMLElement>('#notice')!;
const $=<T extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
function fail(error:unknown){notice.hidden=false;notice.textContent=`ゲームを起動できませんでした。ページを再読み込みしてください。 ${error instanceof Error?error.message:String(error)}`;}
try {
 canvas.width=WIDTH;canvas.height=HEIGHT;
 function resize(){const available=canvas.parentElement!.clientWidth;const scale=available<WIDTH?available/WIDTH:Math.floor(available/WIDTH);canvas.style.width=`${WIDTH*scale}px`;canvas.style.height=`${HEIGHT*scale}px`;}
 resize();addEventListener('resize',resize);
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas 2Dを初期化できませんでした。');
 let session=new Session();
 const renderer=new Renderer(ctx),held=new Set<Direction>(),keyboard=new Set<Direction>(),pointers=new Map<number,Direction>();
 const store=new SaveStore({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)});
 const keys:Record<string,Direction>={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};
 const buttons=[...document.querySelectorAll<HTMLButtonElement>('[data-dir]')];
 let shift=false,alt=false,last:number|null=null,touchMode:'walk'|'run'|'sneak'='walk';
 let hasSave=false;
 function refresh(){held.clear();for(const d of keyboard)held.add(d);for(const d of pointers.values())held.add(d);buttons.forEach(b=>b.classList.toggle('active',held.has(b.dataset.dir as Direction)));}
 function clear(){keyboard.clear();pointers.clear();shift=false;alt=false;refresh();last=null;}
 function storageError(error:unknown){session.message=`保存データを扱えませんでした。JSON書き出しでバックアップしてください。 ${error instanceof Error?error.message:String(error)}`;}
 function checkSave(){try{hasSave=store.load()!==null;}catch(error){hasSave=false;storageError(error);}}
 function toggleMenu(){if(session.screen!=='field')return;$('#menu-panel').hidden=!$('#menu-panel').hidden;clear();}
 addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.target instanceof HTMLInputElement)return;
  if(e.key==='Escape'||e.key.toLowerCase()==='x'){$('#menu-panel').hidden=true;clear();return;}
  if(e.key.toLowerCase()==='c'){if(!e.repeat)toggleMenu();return;}
  if(e.key.toLowerCase()==='z'||e.key==='Enter'){if(!e.repeat&&session.screen==='field'&&$('#menu-panel').hidden&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();session.interact();}return;}
  const dir=keys[e.key]||keys[e.key.toLowerCase()];if(dir){e.preventDefault();keyboard.add(dir);refresh();}
  if(e.key==='Shift')shift=true;if(e.key==='Alt'){e.preventDefault();alt=true;}
 });
 addEventListener('keyup',e=>{const dir=keys[e.key]||keys[e.key.toLowerCase()];if(dir){keyboard.delete(dir);refresh();}if(e.key==='Shift')shift=false;if(e.key==='Alt')alt=false;});
 buttons.forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();if(e.isTrusted)b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,b.dataset.dir as Direction);refresh();});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>{pointers.delete((e as PointerEvent).pointerId);refresh();});b.addEventListener('contextmenu',e=>e.preventDefault());});
 addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
 $('#reset').addEventListener('click',()=>{if(session.battle||session.screen!=='field')return;clear();session.world.reset();render();});
 $('#mode').addEventListener('click',()=>{touchMode=touchMode==='walk'?'run':touchMode==='run'?'sneak':'walk';$('#mode').textContent={walk:'歩く',run:'走る',sneak:'忍び足'}[touchMode];});
 $('#inspect').addEventListener('click',()=>session.interact());
 $('#menu').addEventListener('click',toggleMenu);$('#close-menu').addEventListener('click',()=>{$('#menu-panel').hidden=true;clear();});
 $('#new-game').addEventListener('click',()=>{session=new Session();session.start();clear();render();});
 function load(){try{const saved=store.load();if(!saved)throw new Error('正常な保存データが見つかりません。');session.restore(saved);$('#menu-panel').hidden=true;clear();render();}catch(error){storageError(error);}}
 $('#continue').addEventListener('click',load);$('#load-game').addEventListener('click',load);
 $('#save-game').addEventListener('click',()=>{
  if(session.screen!=='field'||session.battle||session.gathering>0||session.world.transitioning||!session.story.wedge)return;
  try{store.save(session.snapshot());hasSave=true;session.message='魂の楔に現在の世界を保存した。';}catch(error){storageError(error);}
 });
 $('#export-save').addEventListener('click',()=>{
  if(!session.story.wedge||session.battle||session.gathering>0||session.world.transitioning)return;
  try{const raw=store.export(session.snapshot()),url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='silent-castaway-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);session.message='JSONを書き出した。安全な場所へ保管してください。';}catch(error){storageError(error);}
 });
 $('#import-save').addEventListener('change',async event=>{
  const input=event.target as HTMLInputElement,file=input.files?.[0];if(!file)return;
  try{if(file.size>1_000_000)throw new Error('1MB以下のJSONを選んでください。');const data=store.import(await file.text());session.restore(data);hasSave=true;$('#menu-panel').hidden=true;clear();render();}catch(error){storageError(error);}finally{input.value='';}
 });
 $('#return-title').addEventListener('click',()=>{session.screen='title';session.battle=null;$('#menu-panel').hidden=true;clear();checkSave();render();});
 $('#revive').addEventListener('click',()=>{if(!session.story.wedge){session.restore(session.checkpoint);session.message='漂着した時点からやり直す。';clear();}else load();});
 $('#death-title').addEventListener('click',()=>{session.screen='title';clear();checkSave();render();});
 document.querySelectorAll<HTMLButtonElement>('[data-command]').forEach(button=>button.addEventListener('click',()=>session.command(button.dataset.command as 'attack'|'defend'|'escape')));
 function text(selector:string,value:string){const element=$(selector);if(element.textContent!==value)element.textContent=value;}
 function render(){
  const world=session.world;renderer.draw(world,session);
  canvas.dataset.playerX=world.x.toFixed(2);canvas.dataset.playerY=world.y.toFixed(2);canvas.dataset.map=world.mapId;canvas.dataset.screen=session.screen;
  text('#position',`座標 ${Math.floor(world.x/16)}, ${Math.floor(world.y/16)}`);text('#map-name',world.map.name);text('.location',world.mapId==='VIL'?'VIL / 南の村・海岸':'GRASS / 南部草原');
  text('#clock',session.timeLabel);text('#stats',`HP ${session.hp}/120 · MP ${session.mp}/160`);text('#action-info',session.message);text('#objective',session.objective);
  $('#title-panel').hidden=session.screen!=='title';$('#death-panel').hidden=session.screen!=='dead';$('#battle-panel').hidden=!session.battle;
  $<HTMLButtonElement>('#continue').disabled=!hasSave;$<HTMLButtonElement>('#load-game').disabled=!hasSave||!!session.battle;
  $<HTMLButtonElement>('#revive').disabled=session.story.wedge&&!hasSave;
  const blocked=session.screen!=='field'||!!session.battle||session.gathering>0;
  for(const button of buttons)button.disabled=blocked;
  $<HTMLButtonElement>('#inspect').disabled=blocked;$<HTMLButtonElement>('#reset').disabled=blocked;
  const cannotSave=blocked||!session.story.wedge||world.transitioning;
  $<HTMLButtonElement>('#save-game').disabled=cannotSave;$<HTMLButtonElement>('#export-save').disabled=cannotSave;
  text('#save-hint',session.story.wedge?'戦闘中・採集中は保存できません。':'ダンの案内を終え、村長から魂の楔を受け取ると保存できます。');
  text('#inventory',Object.entries(session.inventory).map(([name,n])=>`${name} ×${n}`).join(' ／ '));
  if(session.battle){$('#menu-panel').hidden=true;const enemy=session.enemy!;text('#enemy-status',`${species[enemy.kind].name} · HP ${enemy.hp}/${species[enemy.kind].hp}`);document.querySelectorAll<HTMLButtonElement>('[data-command]').forEach(b=>b.disabled=session.battle!.inputTimer>0);}
 }
 checkSave();render();const pixels=ctx.getImageData(0,0,WIDTH,HEIGHT).data;if(!pixels.some((v,i)=>i%4!==3&&v>0))throw new Error('描画結果を確認できませんでした。');
 notice.hidden=true;canvas.dataset.ready='true';
 function frame(now:number){try{const dt=last===null?0:Math.max(0,Math.min((now-last)/1000,0.1));last=now;session.world.mode=alt?'sneak':shift?'run':touchMode;session.update(dt,$('#menu-panel').hidden?held:new Set(),document.hidden);render();requestAnimationFrame(frame);}catch(error){fail(error);}}
 requestAnimationFrame(frame);
}catch(error){fail(error);}
