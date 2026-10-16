import { test, expect } from '@playwright/test';
async function x(page){return Number(await page.locator('canvas').getAttribute('data-player-x'));}
test('描画、キー移動、衝突、リセット',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');
 const pixels=await page.locator('canvas').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let lit=0;const colors=new Set();for(let i=0;i<d.length;i+=4){if(d[i]+d[i+1]+d[i+2]>100)lit++;colors.add(`${d[i]},${d[i+1]},${d[i+2]}`);}return {lit,colors:colors.size};});
 expect(pixels.lit).toBeGreaterThan(90000);expect(pixels.colors).toBeGreaterThan(15);
 const initial=await x(page);await page.keyboard.down('ArrowRight');await page.waitForTimeout(350);await page.keyboard.up('ArrowRight');expect(await x(page)).toBeGreaterThan(initial+10);
 await page.keyboard.down('a');await page.waitForTimeout(3500);await page.keyboard.up('a');expect(await x(page)).toBeGreaterThanOrEqual(36);
 await page.getByRole('button',{name:'スタート位置へ'}).click();expect(await x(page)).toBe(192);expect(errors).toEqual([]);
});
test('タッチ操作、キャンセル、回転、復帰',async({page},testInfo)=>{
 await page.goto('/');await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');
 const button=page.getByRole('button',{name:'右に移動'});
 if(testInfo.project.name==='mobile'){
 const session=await page.context().newCDPSession(page);const box=await button.boundingBox();
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});await page.waitForTimeout(400);
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }else{await button.hover();await page.mouse.down();await page.waitForTimeout(400);await page.mouse.up();}
 expect(await x(page)).toBeGreaterThan(202);const stopped=await x(page);await page.waitForTimeout(150);expect(await x(page)).toBe(stopped);
 await button.dispatchEvent('pointerdown',{pointerId:9});await button.dispatchEvent('pointercancel',{pointerId:9});const cancelled=await x(page);await page.waitForTimeout(150);expect(await x(page)).toBe(cancelled);
 await page.screenshot({path:`test-results/${testInfo.project.name}-portrait.png`,fullPage:true});
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(100);await expect(page.locator('canvas')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.keyboard.down('ArrowRight');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));const blurred=await x(page);await page.waitForTimeout(150);expect(await x(page)).toBe(blurred);await page.keyboard.up('ArrowRight');
 await page.keyboard.down('ArrowDown');await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));const resumed=await page.locator('canvas').getAttribute('data-player-y');await page.waitForTimeout(150);expect(await page.locator('canvas').getAttribute('data-player-y')).toBe(resumed);await page.keyboard.up('ArrowDown');
 await page.screenshot({path:`test-results/${testInfo.project.name}.png`,fullPage:true});
});
test('Canvas初期化失敗時に案内を表示',async({page})=>{await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null;});await page.goto('/');await expect(page.getByRole('status')).toContainText('ゲームを起動できませんでした');});
