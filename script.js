const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const overlayScore = document.getElementById('overlay-score');
const actionBtn = document.getElementById('action-btn');
const scoreDisplay = document.getElementById('score-display');

const W = canvas.width, H = canvas.height;
const PLAYER_SIZE = 22, PLAYER_X = 100;
const GRAVITY = 0.42, JUMP_VELOCITY = -10;
const BASE_SPEED = 3.5, SPIKE_W = 22, SPIKE_H = 40;
const ORB_RADIUS = 10, LANE_MARGIN = 60;

let gameState = 'start', score = 0, hiScore = 0, frameCount = 0;
let speed = BASE_SPEED, gravityDir = 1;
let playerY = H / 2, playerVY = 0;
let obstacles = [], orbs = [], particles = [];
let bgHue = 270, animId = null;

function resetGame() {
  score = 0; frameCount = 0; speed = BASE_SPEED;
  gravityDir = 1; playerY = H / 2; playerVY = -3;
  obstacles = []; orbs = []; particles = []; bgHue = 270;
}

function spawnObstaclePair() {
  const gap = H * 0.38;
  const minTop = LANE_MARGIN + SPIKE_H;
  const maxTop = H - LANE_MARGIN - SPIKE_H - gap;
  const topY = minTop + Math.random() * (maxTop - minTop);
  obstacles.push({ x: W + 10, y: 0, fromTop: true, height: topY });
  obstacles.push({ x: W + 10, y: topY + gap, fromTop: false, height: H - (topY + gap) });
}

function spawnOrb() {
  const y = LANE_MARGIN + Math.random() * (H - 2 * LANE_MARGIN);
  orbs.push({ x: W + 10, y, collected: false, scale: 1 });
}

function flipGravity() {
  if (gameState !== 'playing') return;
  gravityDir *= -1;
  playerVY = JUMP_VELOCITY * gravityDir;
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2, spd = 2 + Math.random() * 3;
    particles.push({ x: PLAYER_X + PLAYER_SIZE / 2, y: playerY + PLAYER_SIZE / 2,
      vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life: 1,
      color: gravityDir === 1 ? '#00f0ff' : '#ff2d9b', size: 3 + Math.random() * 3 });
  }
}

function checkCollision() {
  const margin = 4;
  for (const obs of obstacles) {
    const r = obs.fromTop ? { x: obs.x, y: 0, w: SPIKE_W, h: obs.height }
                          : { x: obs.x, y: obs.y, w: SPIKE_W, h: obs.height };
    if (PLAYER_X + margin < r.x + r.w && PLAYER_X + PLAYER_SIZE - margin > r.x &&
        playerY + margin < r.y + r.h && playerY + PLAYER_SIZE - margin > r.y) return true;
  }
  if (playerY < 0 || playerY + PLAYER_SIZE > H) {
    playerY = Math.max(0, Math.min(H - PLAYER_SIZE, playerY));
    playerVY *= -0.5;
  }
  return false;
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, `hsl(${bgHue},60%,5%)`);
  grad.addColorStop(0.5, `hsl(${bgHue+20},50%,3%)`);
  grad.addColorStop(1, `hsl(${bgHue},60%,5%)`);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = `hsl(${bgHue+40},60%,12%)`; ctx.lineWidth = 1;
  const offset = (frameCount * speed * 0.5) % 60;
  for (let x = -offset; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  ctx.strokeStyle = `hsl(${bgHue+60},80%,30%)`; ctx.lineWidth = 2;
  ctx.shadowColor = `hsl(${bgHue+60},80%,50%)`; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(W,0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,H); ctx.lineTo(W,H); ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawPlayer() {
  const color = gravityDir === 1 ? '#00f0ff' : '#ff2d9b';
  ctx.save();
  ctx.shadowColor = color; ctx.shadowBlur = 20; ctx.fillStyle = color;
  ctx.fillRect(PLAYER_X - 2, playerY - 2, PLAYER_SIZE + 4, PLAYER_SIZE + 4);
  ctx.shadowBlur = 0; ctx.fillStyle = '#fff';
  ctx.fillRect(PLAYER_X, playerY, PLAYER_SIZE, PLAYER_SIZE);
  const g = ctx.createLinearGradient(PLAYER_X, playerY, PLAYER_X+PLAYER_SIZE, playerY+PLAYER_SIZE);
  g.addColorStop(0, color+'cc'); g.addColorStop(1, color+'44');
  ctx.fillStyle = g; ctx.fillRect(PLAYER_X+3, playerY+3, PLAYER_SIZE-6, PLAYER_SIZE-6);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(gravityDir===1?'▼':'▲', PLAYER_X+PLAYER_SIZE/2, playerY+PLAYER_SIZE/2);
  ctx.restore();
}

function drawObstacle(obs) {
  ctx.save(); ctx.shadowColor = '#ff3333'; ctx.shadowBlur = 15;
  const x = obs.x;
  if (obs.fromTop) {
    const wH = obs.height - SPIKE_H;
    ctx.fillStyle = '#cc0033'; ctx.fillRect(x, 0, SPIKE_W, wH);
    ctx.fillStyle = '#ff2244'; ctx.beginPath();
    ctx.moveTo(x,wH); ctx.lineTo(x+SPIKE_W/2,wH+SPIKE_H); ctx.lineTo(x+SPIKE_W,wH); ctx.fill();
  } else {
    const wH = obs.height - SPIKE_H;
    ctx.fillStyle = '#cc0033'; ctx.fillRect(x, obs.y+SPIKE_H, SPIKE_W, wH);
    ctx.fillStyle = '#ff2244'; ctx.beginPath();
    ctx.moveTo(x,obs.y+SPIKE_H); ctx.lineTo(x+SPIKE_W/2,obs.y); ctx.lineTo(x+SPIKE_W,obs.y+SPIKE_H); ctx.fill();
  }
  ctx.restore();
}

function drawOrb(orb) {
  if (orb.collected) return;
  ctx.save();
  ctx.globalAlpha = 0.85 + 0.15 * Math.sin(frameCount * 0.08 + orb.x * 0.01);
  ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 18;
  const g = ctx.createRadialGradient(orb.x, orb.y, 1, orb.x, orb.y, ORB_RADIUS);
  g.addColorStop(0,'#fff'); g.addColorStop(0.4,'#ffd700'); g.addColorStop(1,'#ff8800');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(orb.x, orb.y, ORB_RADIUS, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function gameLoop() {
  if (gameState !== 'playing') return;
  frameCount++; score++; speed = BASE_SPEED + score * 0.003; bgHue = 270 + (score * 0.05) % 60;
  playerVY += GRAVITY * gravityDir;
  playerVY = Math.max(-14, Math.min(14, playerVY));
  playerY += playerVY;

  const si = Math.floor(Math.max(60, 140 - score * 0.05));
  if (frameCount % si === 0) spawnObstaclePair();
  const oi = Math.floor(Math.max(90, 180 - score * 0.03));
  if (frameCount % oi === 0 && Math.random() < 0.6) spawnOrb();

  for (const o of obstacles) o.x -= speed;
  for (const o of orbs) o.x -= speed;
  obstacles = obstacles.filter(o => o.x + SPIKE_W > -10);
  orbs = orbs.filter(o => o.x + ORB_RADIUS > -10 && !o.collected);

  for (const orb of orbs) {
    const dx = (PLAYER_X + PLAYER_SIZE/2) - orb.x, dy = (playerY + PLAYER_SIZE/2) - orb.y;
    if (Math.sqrt(dx*dx+dy*dy) < PLAYER_SIZE/2 + ORB_RADIUS) {
      orb.collected = true; score += 50;
      for (let i=0;i<10;i++) {
        const a=Math.random()*Math.PI*2, s=1.5+Math.random()*2.5;
        particles.push({x:orb.x,y:orb.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,color:'#ffd700',size:2+Math.random()*3});
      }
    }
  }

  if (checkCollision()) { endGame(); return; }

  for (const p of particles) { p.x+=p.vx; p.y+=p.vy; p.vy+=0.08; p.life-=0.04; }
  particles = particles.filter(p => p.life > 0);

  drawBackground();
  for (const p of particles) {
    ctx.save(); ctx.globalAlpha=p.life; ctx.fillStyle=p.color;
    ctx.shadowColor=p.color; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2); ctx.fill(); ctx.restore();
  }
  for (const o of obstacles) drawObstacle(o);
  for (const o of orbs) drawOrb(o);
  drawPlayer();
  scoreDisplay.textContent = `SCORE: ${score}`;
  scoreDisplay.style.display = 'block';
  animId = requestAnimationFrame(gameLoop);
}

function startGame() {
  resetGame(); gameState = 'playing';
  overlay.classList.add('hidden');
  scoreDisplay.style.display = 'block';
  animId = requestAnimationFrame(gameLoop);
}

function endGame() {
  gameState = 'gameover'; cancelAnimationFrame(animId);
  if (score > hiScore) hiScore = score;
  overlayTitle.textContent = 'GAME OVER';
  overlayMsg.innerHTML = `Score: <span style="color:#00f0ff">${score}</span>&nbsp;&nbsp;&nbsp;Best: <span style="color:#ffd700">${hiScore}</span>`;
  overlayScore.style.display = 'none';
  actionBtn.textContent = 'RESTART';
  overlay.classList.remove('hidden');
  scoreDisplay.style.display = 'none';
}

actionBtn.addEventListener('click', e => { e.preventDefault(); startGame(); });
document.addEventListener('keydown', e => {
  if (['Space','ArrowUp','ArrowDown'].includes(e.code)) { e.preventDefault(); gameState==='playing'?flipGravity():startGame(); }
});
canvas.addEventListener('click', () => { if (gameState==='playing') flipGravity(); });
canvas.addEventListener('touchstart', e => { e.preventDefault(); gameState==='playing'?flipGravity():startGame(); }, {passive:false});

overlayScore.style.display = 'none';
scoreDisplay.style.display = 'none';