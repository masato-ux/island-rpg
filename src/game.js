const canvas = document.querySelector('#world');
const notice = document.querySelector('#notice');
const position = document.querySelector('#position');
try {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2Dを初期化できませんでした。');
  ctx.imageSmoothingEnabled = false;
  const W = 24, H = 16, T = 16;
  const trees = new Set(['5,5','6,5','17,4','18,5','4,9','18,10','17,11','7,3']);
  const player = { x: 12 * T, y: 8 * T, facing: 'down' };
  const held = new Set();
  const keys = { ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right', w:'up', s:'down', a:'left', d:'right' };
  const vectors = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] };
  function land(x,y) { return x>=2 && x<=21 && y>=2 && y<=13 && !((x<4||x>19)&&(y<4||y>11)); }
  function walkable(x,y) { const tx=Math.floor(x/T), ty=Math.floor(y/T); return land(tx,ty)&&!trees.has(`${tx},${ty}`); }
  const rect=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
  function draw(time=0) {
    rect(0,0,384,256,'#4c9ba9');
    for(let y=0;y<H;y++) for(let x=0;x<W;x++) {
      const px=x*T,py=y*T;
      if(!land(x,y)){if((x*3+y)%4===0)rect(px+3,py+7,8,1,'#7ac0be');continue;}
      const edge=!land(x-1,y)||!land(x+1,y)||!land(x,y-1)||!land(x,y+1);
      rect(px,py,T,T,edge?'#e3ce91':((x+y)%3===0?'#8fa65d':'#96ad63'));
      if(!edge){if((x*7+y*3)%5===0){rect(px+3,py+6,1,3,'#698b50');rect(px+5,py+5,1,4,'#698b50');}if((x*13+y*7)%31===0){rect(px+10,py+10,3,2,'#eedc9d');rect(px+11,py+9,1,4,'#f6ebbb');}}
      if((x===12&&y>=9&&y<=12)||(y===9&&x>=9&&x<=15))rect(px,py,T,T,'#c3b37c');
    }
    for(const key of trees){const [x,y]=key.split(',').map(Number);rect(x*T+4,y*T+12,10,4,'#758d50');rect(x*T+7,y*T+6,4,9,'#766144');rect(x*T+2,y*T-4,14,13,'#426e4c');rect(x*T+4,y*T-8,10,13,'#528350');rect(x*T+5,y*T-6,5,5,'#69964f');}
    // A small wooden sign beside the path.
    rect(15*T+7,9*T+5,2,11,'#786341');rect(15*T+2,9*T+2,12,7,'#9e8151');rect(15*T+4,9*T+4,7,1,'#d1b378');
    const x=Math.round(player.x),y=Math.round(player.y),step=held.size?Math.floor(time/140)%2:0;
    rect(x-6,y+3,12,4,'#718450');
    rect(x-4,y-2,8,6,'#344e67');rect(x-4,y+4,3,3+step,'#3d4141');rect(x+1,y+4,3,4-step,'#3d4141');
    rect(x-5,y-8,10,7,'#edbe88');rect(x-6,y-10,12,4,'#684d39');rect(x-4,y-12,8,3,'#82603d');rect(x-6,y-2,2,5,'#dfac75');rect(x+4,y-2,2,5,'#dfac75');
    if(player.facing!=='up'){rect(x+(player.facing==='left'?-4:player.facing==='right'?2:-3),y-6,1,2,'#35403c');if(player.facing==='down')rect(x+2,y-6,1,2,'#35403c');}
    rect(x-4,y-1,8,2,'#c7d3ab');
    canvas.dataset.playerX=player.x.toFixed(2);canvas.dataset.playerY=player.y.toFixed(2);
    position.textContent=`座標 ${Math.floor(player.x/T)}, ${Math.floor(player.y/T)}`;
  }
  const buttons=[...document.querySelectorAll('[data-dir]')];
  const pointers=new Map(), keyboard=new Set();
  function refresh(){held.clear();for(const d of keyboard)held.add(d);for(const d of pointers.values())held.add(d);buttons.forEach(b=>b.classList.toggle('active',held.has(b.dataset.dir)));}
  function clear(){keyboard.clear();pointers.clear();refresh();}
  addEventListener('keydown',e=>{const d=keys[e.key]||keys[e.key.toLowerCase()];if(d&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();keyboard.add(d);refresh();}});
  addEventListener('keyup',e=>{const d=keys[e.key]||keys[e.key.toLowerCase()];if(d){keyboard.delete(d);refresh();}});
  buttons.forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,b.dataset.dir);refresh();});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>{pointers.delete(e.pointerId);refresh();});b.addEventListener('contextmenu',e=>e.preventDefault());});
  addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{clear();last=0;});
  document.querySelector('#reset').addEventListener('click',()=>{clear();player.x=12*T;player.y=8*T;player.facing='down';draw();});
  let last=0;
  function frame(now){const dt=last?Math.min((now-last)/1000,0.04):0;last=now;let dx=0,dy=0;for(const d of held){dx+=vectors[d][0];dy+=vectors[d][1];player.facing=d;}const length=Math.hypot(dx,dy)||1;dx=dx/length*64*dt;dy=dy/length*64*dt;
    if(walkable(player.x+dx-4,player.y-2)&&walkable(player.x+dx+4,player.y+5))player.x+=dx;
    if(walkable(player.x-4,player.y+dy-2)&&walkable(player.x+4,player.y+dy+5))player.y+=dy;
    draw(now);requestAnimationFrame(frame);
  }
  draw();notice.hidden=true;canvas.dataset.ready='true';requestAnimationFrame(frame);
} catch(error) { notice.hidden=false;notice.textContent=`ゲームを起動できませんでした。ページを再読み込みしてください。 ${error.message}`; }
