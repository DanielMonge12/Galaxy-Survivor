// Galaxy Survivor - game.js (integrado con UI: Start / Resume / Reset)
// Contiene boss que daña, boss bullets, reaparece cada +1000 pts si no se mata

// ===== AUDIO =====
const bgMusic = new Audio("relaxing-145038.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.25;

function playSound(src, vol = 1) {
  const s = new Audio(src);
  s.volume = vol;
  s.play().catch(()=>{});
}

// Nombres de Los sonidos att: Ismael Quijada
const sShoot = "mixkit-short-laser-gun-shot-1670.wav";
const sExplosion = "explosion-6055.mp3";
const sGameOver = "fail-144746.mp3";

// ===== DOM / CANVAS =====
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startBtn = document.getElementById('startBtn');
const resumeBtn = document.getElementById('resumeBtn');
const resetBtn = document.getElementById('resetBtn');
const statusEl = document.getElementById('status');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const titleEl = document.getElementById('title');

const W = canvas.width;
const H = canvas.height;

// ===== GAME STATE =====
let state = 'menu'; // menu, running, paused, gameover
let lastTime = 0;
let spawnTimer = 0;
let spawnInterval = 1200;
let enemySpeedBase = 1.2;
let shootTimer = 0;
let shootInterval = 350;
let score = 0;
let kills = 0;
let level = 1;
let lives = 3;

let player, bullets, enemies, powerups, boss;
let bossSpawnedAt = 0; // último score en que apareció o se descartó boss
let bossBullets = [];
let keys = {};
let musicStarted = false;

// ===== ENTITIES =====
function initEntities(){
  player = {
    x: W/2 - 20,
    y: H - 80,
    w: 40,
    h: 40,
    speed: 5,
    color: '#4cc9f0',
    rapid: false,
    rapidEnd: 0
  };
  bullets = [];
  enemies = [];
  powerups = [];
  boss = null;
  bossBullets = [];
}

// ===== HELPERS =====
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function rectsCollide(a,b){
  return a.x < b.x + (b.w||b.size||0) &&
         a.x + (a.w||a.width||0) > b.x &&
         a.y < b.y + (b.h||b.size||0) &&
         a.y + (a.h||a.height||0) > b.y;
}

function updateHUD(){
  statusEl.textContent = 'Vidas: ' + lives;
  scoreEl.textContent = 'Score: ' + Math.floor(score);
  levelEl.textContent = 'Nivel: ' + level;
}

// ===== SPAWN =====
function spawnEnemy(){
  const size = Math.random()*26 + 18;
  const x = Math.random()*(W - size);
  const speed = enemySpeedBase + Math.random()*1.2;
  const type = Math.random() < 0.12 ? 'tough' : 'basic';
  enemies.push({x, y: -size, w: size, h: size, speed, type});
}

function spawnPowerup(){
  const types = ['life','rapid'];
  const t = types[Math.floor(Math.random()*types.length)];
  const size = 22;
  const x = Math.random()*(W - size);
  powerups.push({x, y:-size, w:size, h:size, type: t, speed:1.2});
}

function spawnBoss(){
  // boss aparece con menos vida (ajustado), se inicializa shoot timer
  bossSpawnedAt = Math.floor(score);
  boss = { x: W/2 - 60, y: -140, size: 110, speed: 1.2, hp: 18, dir: 1, shootTimer: 0, shootInterval: 900 };
  bossBullets = [];
}

// SONIDO AL DISPARAR LA NAVESITA att isma
function shoot(){
  const bx = player.x + player.w/2 - 4;
  const by = player.y - 12;
  bullets.push({ x: bx, y: by, w: 8, h: 12, speed: -6, damage: player.rapid ? 2 : 1 });
  playSound(sShoot, 0.9);
}

// ===== BOSS BULLETS ===== att isma 
function bossCreateBullet(){
  if(!boss) return;
  bossBullets.push({
    x: boss.x + boss.size/2 - 4,
    y: boss.y + boss.size,
    w: 8,
    h: 12,
    speed: 4
  });
}

// ===== PERKS/MEJORAS att isma =====
function update(dt){
  if(state !== 'running') return;

  // input
  if(keys['ArrowLeft'] || keys['a'] || keys['A']) player.x -= player.speed;
  if(keys['ArrowRight'] || keys['d'] || keys['D']) player.x += player.speed;
  player.x = clamp(player.x, 6, W - player.w - 6);

// ===== NAVESITA att ismael =====
const playerImg = new Image();
playerImg.src = "navesita.jpg";


  // Diusparo automatico
  shootTimer += dt;
  const currentShootInterval = player.rapid ? Math.max(120, shootInterval/2) : shootInterval;
  if(shootTimer > currentShootInterval){
    shoot();
    shootTimer = 0;
  }

  // bullets
  for(let i = bullets.length - 1; i >= 0; i--){
    const b = bullets[i];
    b.y += b.speed;
    if(b.y + b.h < 0) bullets.splice(i,1);
  }

  // spawn enemies/powerups
  spawnTimer += dt;
  if(spawnTimer > spawnInterval){
    spawnEnemy();
    spawnTimer = 0;
    if(Math.random() < 0.12) spawnPowerup();
  }

  // enemies move
  for(let i = enemies.length - 1; i >= 0; i--){
    const e = enemies[i];
    e.y += e.speed * (1 + (level-1)*0.12);
    if(e.y > H + 40) enemies.splice(i,1);
  }

  // powerups move
  for(let i = powerups.length - 1; i >= 0; i--){
    const p = powerups[i];
    p.y += p.speed;
    if(p.y > H + 30) powerups.splice(i,1);
  }

  // bullets vs enemies
  for(let bi = bullets.length -1; bi >= 0; bi--){
    const b = bullets[bi];
    let hit = false;
    for(let ei = enemies.length -1; ei >= 0; ei--){
      const e = enemies[ei];
      if(rectsCollide(b, e)){
        // damage logic
        bullets.splice(bi,1);
        if(e.type === 'tough'){
          if(!e.hp) e.hp = 2;
          e.hp--;
          if(e.hp <= 0){
            enemies.splice(ei,1);
            kills++;
            score += 120;
            playSound(sExplosion, 0.8);
          } else {
            playSound(sExplosion, 0.6);
          }
        } else {
          enemies.splice(ei,1);
          kills++;
          score += 50;
          playSound(sExplosion, 0.8);
        }
        hit = true;
        break;
      }
    }
    if(hit) continue;
  }

  // bullets vs boss
  if(boss){
    for(let bi = bullets.length -1; bi >= 0; bi--){
      const b = bullets[bi];
      if(b.x < boss.x + boss.size &&
         b.x + b.w > boss.x &&
         b.y < boss.y + boss.size &&
         b.y + b.h > boss.y){
        bullets.splice(bi,1);
        boss.hp--;
        playSound(sExplosion, 0.9);
        if(boss.hp <= 0){
          // boss defeated
          boss = null;
          bossSpawnedAt = Math.floor(score);
          score += 500;
        }
        break;
      }
    }
  }

  // enemies vs player
  for(let i = enemies.length -1; i >= 0; i--){
    const e = enemies[i];
    if(rectsCollide(e, player)){
      enemies.splice(i,1);
      lives--;
      updateHUD();
      if(lives <= 0){
        triggerGameOver();
        return;
      }
    }
  }

  // powerups vs player
  for(let i = powerups.length -1; i >= 0; i--){
    const p = powerups[i];
    if(rectsCollide(p, player)){
      if(p.type === 'life'){
        lives = Math.min(5, lives+1);
        score += 80;
        playSound(sExplosion, 0.7);
      } else if(p.type === 'rapid'){
        player.rapid = true;
        player.rapidEnd = performance.now() + 5000;
        score += 100;
        playSound(sExplosion, 0.7);
      }
      powerups.splice(i,1);
      updateHUD();
    }
  }

  // rapid end
  if(player.rapid && performance.now() > player.rapidEnd) player.rapid = false;

  // increase difficulty by kills
  if(kills >= level * 10){
    level++;
    enemySpeedBase += 0.6;
    spawnInterval = Math.max(480, spawnInterval - 120);
    updateHUD();
  }

  // score over time
  score += dt * 0.02;

  // spawn boss every 1000 points (only when none)
  if(!boss && Math.floor(score) - bossSpawnedAt >= 1000){
    spawnBoss();
  }

  // boss movement & shooting & exit logic
  if(boss){
    // move down slowly until target y, then horizontal patrol
    if(boss.y < 40) boss.y += boss.speed;
    boss.x += boss.dir * boss.speed * 1.5;
    if(boss.x <= 6) { boss.x = 6; boss.dir = 1; }
    if(boss.x + boss.size >= W - 6) { boss.x = W - 6 - boss.size; boss.dir = -1; }

    // boss shooting (use dt for timing)
    boss.shootTimer += dt;
    if(boss.shootTimer >= boss.shootInterval){
      boss.shootTimer = 0;
      bossCreateBullet();
    }

    // if boss leaves bottom (player doesn't kill it), despawn and set next spawn point
    if(boss.y > H + boss.size){
      boss = null;
      bossSpawnedAt = Math.floor(score);
    }
  }

  // update boss bullets
  for(let i = bossBullets.length - 1; i >= 0; i--){
    const bb = bossBullets[i];
    bb.y += bb.speed;
    // collision with player
    if(rectsCollide(bb, player)){
      bossBullets.splice(i,1);
      lives--;
      updateHUD();
      playSound(sExplosion, 0.7);
      if(lives <= 0){
        triggerGameOver();
        return;
      }
      continue;
    }
    if(bb.y > H + 40) bossBullets.splice(i,1);
  }
}

// ===== DRAW =====
function draw(){
  // background
  ctx.fillStyle = '#00121a';
  ctx.fillRect(0,0,W,H);

  // stars (simple)
  for(let i=0;i<30;i++){
    ctx.fillStyle = i%5===0 ? '#fff' : '#99c2ff';
    ctx.fillRect((i*73)%W, (i*131 + (performance.now()*0.01*(i%3)))%H, (i%3?1:2), (i%7?1:2));
  }

  // player
  ctx.fillStyle = player.color;
  roundRect(ctx, player.x, player.y, player.w, player.h, 6, true, false);
  ctx.fillStyle = '#012';
  ctx.fillRect(player.x + 10, player.y + 10, player.w - 20, player.h - 18);

  // bullets
  ctx.fillStyle = '#fff';
  bullets.forEach(b => roundRect(ctx, b.x, b.y, b.w, b.h, 3, true, false));

  // enemies
  enemies.forEach(e=>{
    ctx.fillStyle = (e.type==='tough') ? '#e07a5f' : '#ef233c';
    ctx.save();
    ctx.translate(e.x + e.w/2, e.y + e.h/2);
    ctx.rotate((e.y+e.x)*0.001);
    ctx.fillRect(-e.w/2, -e.h/2, e.w, e.h);
    ctx.restore();
    if(e.type === 'tough'){
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(e.x, e.y-6, e.w, 3);
      ctx.fillStyle = '#4cc9f0';
      const hpRatio = (e.hp ? e.hp/2 : 1);
      ctx.fillRect(e.x, e.y-6, e.w * hpRatio, 3);
    }
  });

  // powerups
  powerups.forEach(p=>{
    ctx.fillStyle = (p.type==='life') ? '#6ee7b7' : '#ffd166';
    roundRect(ctx, p.x, p.y, p.w, p.h, 6, true, false);
    ctx.fillStyle = '#022';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(p.type === 'life' ? '+' : '⚡', p.x + p.w/2, p.y + p.h/2 + 4);
  });

  // boss
  if(boss){
    ctx.fillStyle = 'purple';
    ctx.fillRect(boss.x, boss.y, boss.size, boss.size);
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText('Boss HP: ' + boss.hp, boss.x + 10, boss.y - 8);
  }

  // boss bullets
  ctx.fillStyle = 'yellow';
  bossBullets.forEach(bb => roundRect(ctx, bb.x, bb.y, bb.w, bb.h, 3, true, false));

  // HUD strip
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(0,0,W,36);
  ctx.fillStyle = '#fff';
  ctx.font = '16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Score: ' + Math.floor(score), 12, 24);
  ctx.textAlign = 'right';
  ctx.fillText('Lives: ' + lives, W - 12, 24);

  // menu overlay
  if(state === 'menu'){
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(40,120,W-80,160);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = '26px Arial';
    ctx.fillText('Galaxy Survivor', W/2, 170);
    ctx.font = '16px Arial';
    ctx.fillText('Presiona Start para jugar', W/2, 200);
  }

  if(state === 'gameover'){
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(40,120,W-80,160);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = '30px Arial';
    ctx.fillText('GAME OVER', W/2, 170);
    ctx.font = '20px Arial';
    ctx.fillText('Score: ' + Math.floor(score), W/2, 210);
    ctx.font = '14px Arial';
    ctx.fillText('Presiona Reset para intentar de nuevo', W/2, 240);
  }
}

// ===== UTIL =====
function roundRect(ctx, x, y, w, h, r, fill, stroke){
  if (typeof stroke === 'undefined') stroke = true;
  if (typeof r === 'undefined') r = 5;
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

// ===== GAME CONTROL =====
function triggerGameOver(){
  state = 'gameover';
  resetBtn.style.display = 'inline-block';
  resumeBtn.style.display = 'none';
  startBtn.style.display = 'inline-block';
  titleEl.textContent = 'Game Over - Galaxy Survivor';
  playSound(sGameOver, 0.9);
  try { bgMusic.pause(); } catch(e){}
}

function resetGame(){
  state = 'running';
  score = 0;
  kills = 0;
  level = 1;
  lives = 3;
  spawnInterval = 1200;
  enemySpeedBase = 1.2;
  shootInterval = 350;
  initEntities();
  updateHUD();
  lastTime = performance.now();
  spawnTimer = 0;
  shootTimer = 0;
  bossSpawnedAt = 0;
  try{ bgMusic.currentTime = 0; bgMusic.play().catch(()=>{});}catch(e){}
  loop();
}

// ===== MAIN LOOP =====
function loop(ts){
  const now = ts || performance.now();
  const dt = now - lastTime;
  lastTime = now;

  if(state === 'running'){
    update(dt);
  }
  draw();
  updateHUD();

  if(state !== 'gameover'){
    requestAnimationFrame(loop);
  }
}

// ===== INPUT =====
window.addEventListener('keydown', (e)=>{
  if(e.key === 'p' || e.key === 'P'){
    if(state === 'running'){ state = 'paused'; titleEl.textContent = 'Paused'; resumeBtn.style.display='inline-block'; }
    else if(state === 'paused'){ state='running'; titleEl.textContent='Galaxy Survivor'; resumeBtn.style.display='none'; lastTime = performance.now(); loop(); }
    return;
  }
  keys[e.key] = true;
});

window.addEventListener('keyup', (e)=> { keys[e.key] = false; });

// Ensure music starts on first interaction (some browsers block autoplay)
canvas.addEventListener('click', ()=>{
  if(!musicStarted){
    musicStarted = true;
    try{ bgMusic.play().catch(()=>{}); }catch(e){}
  }
});

// ===== BUTTONS =====
startBtn.addEventListener('click', ()=>{
  startBtn.style.display='none';
  resetBtn.style.display='none';
  resumeBtn.style.display='none';
  titleEl.textContent = 'Galaxy Survivor';
  resetGame();
});

resumeBtn.addEventListener('click', ()=>{
  if(state === 'paused'){ state='running'; resumeBtn.style.display='none'; lastTime = performance.now(); loop(); }
});

resetBtn.addEventListener('click', ()=>{
  startBtn.style.display='none';
  resetBtn.style.display='none';
  titleEl.textContent = 'Galaxy Survivor';
  resetGame();
});

// ===== INIT =====
initEntities();
state = 'menu';
draw();
updateHUD();
