// Galaxy Survivor - game.js
// Controls: ← → or A D to move ; game auto-shoots ; P to pause

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const startBtn = document.getElementById('startBtn');
const resumeBtn = document.getElementById('resumeBtn');
const resetBtn = document.getElementById('resetBtn');
const statusEl = document.getElementById('status');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const titleEl = document.getElementById('title');

const W = canvas.width;
const H = canvas.height;

// Game state
let state = 'menu'; // menu, running, paused, gameover
let keys = {};
let lastTime = 0;
let spawnTimer = 0;
let spawnInterval = 1200; // ms
let enemySpeedBase = 1.2;
let shootTimer = 0;
let shootInterval = 350; // ms
let score = 0;
let kills = 0;
let level = 1;
let lives = 3;

// Entities
let player, bullets, enemies, powerups;

// Optional audio (put files in same folder)
const bgMusic = new Audio('bg-music.mp3'); bgMusic.loop = true; bgMusic.volume = 0.25;
const sHit = new Audio('hit.wav'); sHit.volume = 0.6;
const sPower = new Audio('powerup.wav'); sPower.volume = 0.6;

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
  bgMusic.currentTime = 0;
  // try to play (browsers require user interaction)
  try{ bgMusic.play().catch(()=>{}); }catch(e){}
  loop();
}

function gameOver(){
  state = 'gameover';
  resetBtn.style.display = 'inline-block';
  resumeBtn.style.display = 'none';
  startBtn.style.display = 'inline-block';
  titleEl.textContent = 'Game Over - Galaxy Survivor';
  try{ sHit.play().catch(()=>{}); }catch(e){}
}

function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

function spawnEnemy(){
  const size = Math.random()*26 + 18;
  const x = Math.random()*(W - size);
  const speed = enemySpeedBase + Math.random()*1.2;
  const type = Math.random() < 0.12 ? 'tough' : 'basic';
  enemies.push({x, y: -size, w: size, h: size, speed, type});
}

function spawnPowerup(){
  // types: life, rapid
  const types = ['life','rapid'];
  const t = types[Math.floor(Math.random()*types.length)];
  const size = 22;
  const x = Math.random()*(W - size);
  powerups.push({x, y:-size, w:size, h:size, type: t, speed:1.2});
}

function shoot(){
  const bx = player.x + player.w/2 - 4;
  const by = player.y - 8;
  const speed = -6;
  const damage = (player.rapid ? 2 : 1);
  bullets.push({x:bx,y:by,w:8,h:12, speed, damage});
}

function update(dt){
  if(state !== 'running') return;

  // movement input
  if(keys['ArrowLeft'] || keys['a'] || keys['A']){
    player.x -= player.speed;
  } else if(keys['ArrowRight'] || keys['d'] || keys['D']){
    player.x += player.speed;
  }
  player.x = clamp(player.x, 6, W - player.w - 6);

  // shooting
  shootTimer += dt;
  const currentShootInterval = player.rapid ? Math.max(120, shootInterval/2) : shootInterval;
  if(shootTimer > currentShootInterval){
    shoot();
    shootTimer = 0;
  }

  // update bullets
  for(let i=bullets.length-1;i>=0;i--){
    const b = bullets[i];
    b.y += b.speed;
    if(b.y + b.h < 0) bullets.splice(i,1);
  }

  // spawn enemies
  spawnTimer += dt;
  if(spawnTimer > spawnInterval){
    spawnEnemy();
    spawnTimer = 0;
    // occasionally spawn a powerup
    if(Math.random() < 0.12) spawnPowerup();
  }

  // update enemies
  for(let i=enemies.length-1;i>=0;i--){
    const e = enemies[i];
    e.y += e.speed * (1 + (level-1)*0.12);
    if(e.y > H + 40){
      enemies.splice(i,1);
      // penalty? we just remove
    }
  }

  // update powerups
  for(let i=powerups.length-1;i>=0;i--){
    const p = powerups[i];
    p.y += p.speed;
    if(p.y > H + 30) powerups.splice(i,1);
  }

  // bullets vs enemies
  for(let bi=bullets.length-1; bi>=0; bi--){
    const b = bullets[bi];
    for(let ei=enemies.length-1; ei>=0; ei--){
      const e = enemies[ei];
      if(rectsCollide(b, e)){
        // hit
        bullets.splice(bi,1); // remove bullet
        // handle enemy HP by type
        if(e.type === 'tough'){
          if(!e.hp) e.hp = 2;
          e.hp--;
          if(e.hp <= 0){
            enemies.splice(ei,1);
            kills++;
            score += 120;
          }
        } else {
          enemies.splice(ei,1);
          kills++;
          score += 50;
        }
        try{ sHit.play().catch(()=>{}); }catch(e){}
        break;
      }
    }
  }

  // enemies vs player
  for(let i=enemies.length-1;i>=0;i--){
    const e = enemies[i];
    if(rectsCollide(e, player)){
      enemies.splice(i,1);
      lives--;
      updateHUD();
      if(lives <= 0){
        gameOver();
        return;
      }
    }
  }

  // powerups vs player
  for(let i=powerups.length-1;i>=0;i--){
    const p = powerups[i];
    if(rectsCollide(p, player)){
      if(p.type === 'life'){
        lives = Math.min(5, lives+1);
        score += 80;
        try{ sPower.play().catch(()=>{}); }catch(e){}
      } else if(p.type === 'rapid'){
        player.rapid = true;
        player.rapidEnd = performance.now() + 5000; // 5s
        score += 100;
        try{ sPower.play().catch(()=>{}); }catch(e){}
      }
      powerups.splice(i,1);
      updateHUD();
    }
  }

  // check rapid end
  if(player.rapid && performance.now() > player.rapidEnd){
    player.rapid = false;
  }

  // increase difficulty by kills
  if(kills >= level * 10){
    level++;
    enemySpeedBase += 0.6;
    spawnInterval = Math.max(480, spawnInterval - 120);
    updateHUD();
  }

  // score increases over time
  score += dt * 0.02;
}

function rectsCollide(a,b){
  return a.x < b.x + b.w &&
         a.x + (a.w||0) > b.x &&
         a.y < b.y + b.h &&
         (a.y + (a.h||0)) > b.y;
}

function draw(){
  // background
  ctx.fillStyle = '#00121a';
  ctx.fillRect(0,0,W,H);

  // stars background
  drawStars();

  // player
  ctx.fillStyle = player.color;
  roundRect(ctx, player.x, player.y, player.w, player.h, 6, true, false);
  // player "window"
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
    // simple rotation
    ctx.rotate((e.y+e.x)*0.001);
    ctx.fillRect(-e.w/2, -e.h/2, e.w, e.h);
    ctx.restore();
    // small health bar
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

  // HUD (overlay)
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(0,0,W,36);
  ctx.fillStyle = '#fff';
  ctx.font = '16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Score: ' + Math.floor(score), 12, 24);
  ctx.textAlign = 'right';
  ctx.fillText('Lives: ' + lives, W - 12, 24);

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

function drawStars(){
  // static stars using seeded positions for lightweight background
  ctx.fillStyle = '#082';
  for(let i=0;i<40;i++){
    const x = (i*53)%W;
    const y = (i*97 + (performance.now()*0.01*(i%3)))%H;
    ctx.fillStyle = i%6===0 ? '#ffffff' : '#99c2ff';
    ctx.fillRect(x, y, (i%5===0?2:1), (i%7===0?2:1));
  }
}

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

function updateHUD(){
  statusEl.textContent = 'Vidas: ' + lives;
  scoreEl.textContent = 'Score: ' + Math.floor(score);
  levelEl.textContent = 'Nivel: ' + level;
}

// main loop
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

// input
window.addEventListener('keydown', (e)=> {
  if(e.key === 'p' || e.key === 'P'){
    if(state === 'running'){ state = 'paused'; titleEl.textContent = 'Paused'; resumeBtn.style.display='inline-block'; }
    else if(state === 'paused'){ state='running'; titleEl.textContent='Galaxy Survivor'; resumeBtn.style.display='none'; lastTime = performance.now(); loop(); }
    return;
  }
  keys[e.key] = true;
});

window.addEventListener('keyup', (e)=> { keys[e.key] = false; });

// buttons
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

// initial menu
function showMenu(){
  state = 'menu';
  startBtn.style.display = 'inline-block';
  resetBtn.style.display = 'none';
  resumeBtn.style.display = 'none';
  updateHUD();
  draw();
}
initEntities();
showMenu();
