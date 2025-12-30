

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const WATER_LINE = HEIGHT * 0.18;
const SAND_Y = HEIGHT * 0.82;

const PANEL_MARGIN = 10;
const PANEL_WIDTH = 200;
const PLAY_MIN_X = PANEL_MARGIN + PANEL_WIDTH + 30;
const PLAY_MAX_X = WIDTH - PANEL_MARGIN - PANEL_WIDTH - 30;

const PLAYER_RADIUS = 14;
const GAME_TIME = 120;

// DOM
const timerText = document.getElementById("timerText");
const scoreP1El = document.getElementById("scoreP1");
const scoreP2El = document.getElementById("scoreP2");
const hpFillP1 = document.getElementById("hpFillP1");
const hpFillP2 = document.getElementById("hpFillP2");
const oxygenP1Fill = document.getElementById("oxygenP1");
const oxygenP2Fill = document.getElementById("oxygenP2");
const invP1 = document.getElementById("invP1");
const invP2 = document.getElementById("invP2");
const overlay = document.getElementById("overlay");
const bigMsg = document.getElementById("bigMsg");
const smallMsg = document.getElementById("smallMsg");
const hudP1 = document.getElementById("hudP1");
const hudP2 = document.getElementById("hudP2");

const timingP1Box = document.getElementById("timingP1");
const timingP2Box = document.getElementById("timingP2");
const timingRedP1 = document.getElementById("timingRedP1");
const timingRedP2 = document.getElementById("timingRedP2");
const timingPointerP1 = document.getElementById("timingPointerP1");
const timingPointerP2 = document.getElementById("timingPointerP2");
const coolP1 = document.getElementById("coolP1");
const coolP2 = document.getElementById("coolP2");

// 입력
const keys = {};
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;

  if (gameState === "lobby" || gameState === "gameover") {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      if (gameState === "lobby") startCountdown();
      else resetGame();
      return;
    }
  }

  // ✅ 쿨타임이면 미니게임 입력 무시
  if (gameState === "minigame" && activePlayer && !miniLocked) {
    if (activePlayer.id === "P1") {
      if (["w", "a", "s", "d"].includes(k)) {
        e.preventDefault();
        resolveMiniGame();
      }
    } else {
      const code = e.code.toLowerCase();
      if (code === "arrowup" || code === "arrowdown" || code === "arrowleft" || code === "arrowright") {
        e.preventDefault();
        resolveMiniGame();
      }
    }
  }
});
window.addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));

canvas.addEventListener("click", () => {
  if (gameState === "lobby") startCountdown();
  else if (gameState === "gameover") resetGame();
});

// 플레이어
function createPlayer(id, mainColor, accentColor, finColor, startX) {
  return {
    id,
    x: startX,
    y: (WATER_LINE + SAND_Y) / 2,
    facing: 1,
    speed: 240,
    isMoving: false,
    oxygen: 1.3,
    hp: 1,
    score: 0,
    alive: true,
    colorMain: mainColor,
    colorAccent: accentColor,
    colorFin: finColor,
  };
}

const player1 = createPlayer("P1", "#00bcd4", "#00838f", "#ffca28", (PLAY_MIN_X + PLAY_MAX_X) / 2 - 80);
const player2 = createPlayer("P2", "#f06292", "#c2185b", "#ffb3c1", (PLAY_MIN_X + PLAY_MAX_X) / 2 + 80);

// 상태
let gameState = "lobby";
let timeLeft = GAME_TIME;
let countdownValue = 3;
let countdownTimer = 0;
let globalTime = 0;

// 스팟
const spots = [];
let spotTimer = 0;
const MAX_SPOTS = 5;

// 미니게임
let activePlayer = null;
let activeSpot = null;
let miniPointer = 0;
let miniDir = 1;
let miniSpeed = 1.2;
let miniRedStart = 0.4;
let miniRedWidth = 0.2;

// ✅ 실패 후 2초 쿨타임
let miniLocked = false;
let miniLockTimer = 0;
const MINI_FAIL_COOLDOWN = 2.0;

// 쓰레기
const TRASH = [
  { name: "플라스틱 병", baseScore: 10, icon: "🧴" },
  { name: "비닐봉지", baseScore: 12, icon: "🛍️" },
  { name: "캔 조각", baseScore: 14, icon: "🥫" },
  { name: "일회용 컵", baseScore: 16, icon: "🥤" },
  { name: "낚시줄", baseScore: 18, icon: "🪢" },
  { name: "담배꽁초", baseScore: 20, icon: "🚬" },
  { name: "폐어망", baseScore: 24, icon: "🧵" },
  { name: "타이어 조각", baseScore: 28, icon: "🛞" },
  { name: "녹슨 드럼통", baseScore: 32, icon: "🛢️" },
  { name: "정체불명 고철", baseScore: 36, icon: "⚙️" },
];

function randTrash(depthFactor) {
  const base = TRASH[Math.floor(Math.random() * TRASH.length)];
  const depthBonus = Math.round(depthFactor * 10);
  return { name: base.name, score: base.baseScore + depthBonus, icon: base.icon };
}

// 생성
function createSpot() {
  const marginX = 20;
  const yTop = WATER_LINE + 40;
  const yBottom = SAND_Y - 24;

  for (let attempt = 0; attempt < 15; attempt++) {
    const x = PLAY_MIN_X + marginX + Math.random() * (PLAY_MAX_X - PLAY_MIN_X - marginX * 2);
    const t = Math.random();
    const y = yTop + t * t * (yBottom - yTop);
    const radius = 11;

    let ok = true;
    for (const s of spots) {
      if (Math.hypot(x - s.x, y - s.y) < radius + s.radius + 10) { ok = false; break; }
    }
    if (ok) return { x, y, radius, depthT: t };
  }

  return {
    x: PLAY_MIN_X + marginX + Math.random() * (PLAY_MAX_X - PLAY_MIN_X - marginX * 2),
    y: yTop + Math.random() * (yBottom - yTop),
    radius: 11,
    depthT: Math.random(),
  };
}

// 산소/HP
const OXYGEN_MAX = 1.3;
const OXYGEN_DRAIN_BASE = 1 / 36;
const OXYGEN_REGEN_PER_SEC = 1 / 4;
const HP_DRAIN_PER_SEC = 1 / 10;

function applyBreathing(player, dt) {
  if (!player.alive) return;

  const surfaceY = WATER_LINE - 4;
  const bottomY = SAND_Y - PLAYER_RADIUS - 2;

  if (player.y < surfaceY) {
    player.oxygen = Math.min(OXYGEN_MAX, player.oxygen + OXYGEN_REGEN_PER_SEC * dt);
  } else {
    const depthRatio = Math.min(1, Math.max(0, (player.y - surfaceY) / (bottomY - surfaceY)));
    const drain = OXYGEN_DRAIN_BASE * (1 + depthRatio * 1.8);
    player.oxygen = Math.max(0, player.oxygen - drain * dt);
  }

  if (player.oxygen <= 0) {
    player.hp = Math.max(0, player.hp - HP_DRAIN_PER_SEC * dt);
    if (player.hp === 0) player.alive = false;
  }
}

// UI
function updateScoreUI() {
  scoreP1El.textContent = player1.score;
  scoreP2El.textContent = player2.score;

  hudP1.classList.remove("leader");
  hudP2.classList.remove("leader");
  if (player1.score > player2.score) hudP1.classList.add("leader");
  else if (player2.score > player1.score) hudP2.classList.add("leader");
}

function updateBarsUI() {
  const hp1 = Math.max(0, player1.hp);
  const hp2 = Math.max(0, player2.hp);
  const o1 = Math.max(0, player1.oxygen / OXYGEN_MAX);
  const o2 = Math.max(0, player2.oxygen / OXYGEN_MAX);

  hpFillP1.style.transform = `scaleY(${hp1})`;
  hpFillP2.style.transform = `scaleY(${hp2})`;
  oxygenP1Fill.style.transform = `scaleY(${o1})`;
  oxygenP2Fill.style.transform = `scaleY(${o2})`;

  // ✅ 낮을 때 깜빡임
  hpFillP1.classList.toggle("blinkLow", hp1 <= 0.3 && player1.alive);
  hpFillP2.classList.toggle("blinkLow", hp2 <= 0.3 && player2.alive);
  oxygenP1Fill.classList.toggle("blinkLowO2", o1 <= 0.3 && player1.alive);
  oxygenP2Fill.classList.toggle("blinkLowO2", o2 <= 0.3 && player2.alive);
}

function addTrashToInventory(player, trash) {
  const parent = player.id === "P1" ? invP1 : invP2;
  const item = document.createElement("div");
  item.className = "trashItem";

  const icon = document.createElement("div");
  icon.className = "trashIcon";
  icon.textContent = trash.icon;

  const text = document.createElement("div");
  text.textContent = `${trash.name} (+${trash.score})`;

  item.appendChild(icon);
  item.appendChild(text);
  parent.appendChild(item);

  while (parent.children.length > 16) parent.removeChild(parent.firstChild);
}

// 미니게임
function setupMiniGame(spot, player, elapsedRatio) {
  activeSpot = spot;
  activePlayer = player;
  gameState = "minigame";

  const depthFactor = spot.depthT;
  miniRedWidth = Math.max(0.15, 0.45 - depthFactor * 0.2 - elapsedRatio * 0.1);
  miniRedStart = 0.5 - miniRedWidth / 2;

  miniSpeed = 1 + depthFactor * 0.8 + elapsedRatio * 0.7;
  miniPointer = Math.random();
  miniDir = Math.random() < 0.5 ? -1 : 1;

  miniLocked = false;
  miniLockTimer = 0;
  coolP1.textContent = "";
  coolP2.textContent = "";

  if (activePlayer.id === "P1") {
    timingP1Box.style.display = "flex";
    timingP2Box.style.display = "none";
  } else {
    timingP1Box.style.display = "none";
    timingP2Box.style.display = "flex";
  }
}

function resolveMiniGame() {
  if (!activeSpot || !activePlayer) return;

  const inRed = miniPointer >= miniRedStart && miniPointer <= miniRedStart + miniRedWidth;

  if (inRed) {
    const trash = randTrash(activeSpot.depthT);
    activePlayer.score += trash.score;
    addTrashToInventory(activePlayer, trash);
    updateScoreUI();

    const idx = spots.indexOf(activeSpot);
    if (idx >= 0) spots.splice(idx, 1);

    // 성공 -> 종료
    activeSpot = null;
    activePlayer = null;
    timingP1Box.style.display = "none";
    timingP2Box.style.display = "none";
    gameState = "playing";
  } else {
    // ✅ 실패 -> 2초 쿨타임 후 다시 시도 가능(미니게임 화면 유지)
    miniLocked = true;
    miniLockTimer = MINI_FAIL_COOLDOWN;
  }
}

// 이동
function handleMovement(player, dt, map) {
  if (!player.alive) { player.isMoving = false; return; }

  let vx = 0, vy = 0;
  if (keys[map.up]) vy -= 1;
  if (keys[map.down]) vy += 1;
  if (keys[map.left]) vx -= 1;
  if (keys[map.right]) vx += 1;

  if (vx || vy) {
    const len = Math.hypot(vx, vy);
    vx /= len; vy /= len;
    player.x += vx * player.speed * dt;
    player.y += vy * player.speed * dt;
    if (vx > 0.1) player.facing = 1;
    else if (vx < -0.1) player.facing = -1;
    player.isMoving = true;
  } else player.isMoving = false;

  const minY = WATER_LINE - 10;
  const maxY = SAND_Y - PLAYER_RADIUS - 2;
  player.y = Math.min(maxY, Math.max(minY, player.y));
  player.x = Math.min(PLAY_MAX_X - PLAYER_RADIUS, Math.max(PLAY_MIN_X + PLAYER_RADIUS, player.x));
}

function findCollision() {
  for (const p of [player1, player2]) {
    for (const s of spots) {
      if (Math.hypot(p.x - s.x, p.y - s.y) <= PLAYER_RADIUS + s.radius + 4) {
        return { player: p, spot: s };
      }
    }
  }
  return null;
}

// 배경 색
function lerp(a,b,t){ return a + (b-a)*t; }
function hexToRgb(hex){
  const h = hex.replace("#","");
  const n = parseInt(h,16);
  return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
}
function lerpColor(c1,c2,t){
  const a = hexToRgb(c1), b = hexToRgb(c2);
  const r = Math.round(lerp(a.r,b.r,t));
  const g = Math.round(lerp(a.g,b.g,t));
  const bl= Math.round(lerp(a.b,b.b,t));
  return `rgb(${r},${g},${bl})`;
}

// 게임 흐름
function resetGame() {
  Object.assign(player1, createPlayer("P1","#00bcd4","#00838f","#ffca28",(PLAY_MIN_X+PLAY_MAX_X)/2-80));
  Object.assign(player2, createPlayer("P2","#f06292","#c2185b","#ffb3c1",(PLAY_MIN_X+PLAY_MAX_X)/2+80));

  timeLeft = GAME_TIME;
  countdownValue = 3;
  countdownTimer = 0;

  spots.length = 0;
  spotTimer = 0;

  activePlayer = null;
  activeSpot = null;
  miniLocked = false;
  miniLockTimer = 0;

  timingP1Box.style.display = "none";
  timingP2Box.style.display = "none";
  coolP1.textContent = "";
  coolP2.textContent = "";

  invP1.innerHTML = "";
  invP2.innerHTML = "";

  updateScoreUI();
  updateBarsUI();

  bigMsg.textContent = "2인용 바다 쓰레기 줍기";
  smallMsg.textContent = "P1: WASD / P2: 방향키\nSpace 또는 Enter로 시작";
  overlay.style.display = "flex";
  gameState = "lobby";
}

function startCountdown(){
  gameState = "countdown";
  countdownValue = 3;
  countdownTimer = 0;
  bigMsg.textContent = "3";
  smallMsg.textContent = "";
}

function startPlaying(){
  gameState = "playing";
  overlay.style.display = "none";
}

function endGame(id){
  gameState = "gameover";
  overlay.style.display = "flex";
  bigMsg.textContent = (id==="P1") ? "PLAYER 1 승리!" : (id==="P2") ? "PLAYER 2 승리!" : "무승부!";
  smallMsg.textContent = `P1 점수: ${player1.score}\nP2 점수: ${player2.score}\n\nSpace 또는 Enter로 다시 시작`;
}

// 루프
let lastTime = 0;
function loop(ts){
  if(!lastTime) lastTime = ts;
  const dt = (ts-lastTime)/1000;
  lastTime = ts;
  globalTime += dt;

  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function update(dt){
  if(gameState==="playing" || gameState==="minigame"){
    timeLeft = Math.max(0, timeLeft - dt);
  }
  const m = Math.floor(timeLeft/60);
  const s = Math.floor(timeLeft%60);
  timerText.textContent = `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;

  updateBarsUI();

  if(gameState==="countdown"){
    countdownTimer += dt;
    if(countdownTimer>=1){
      countdownTimer-=1;
      countdownValue -= 1;
      if(countdownValue<=0) startPlaying();
      else bigMsg.textContent = String(countdownValue);
    }
    return;
  }

  if(gameState==="playing"){
    handleMovement(player1, dt, {up:"w",down:"s",left:"a",right:"d"});
    handleMovement(player2, dt, {up:"arrowup",down:"arrowdown",left:"arrowleft",right:"arrowright"});

    applyBreathing(player1, dt);
    applyBreathing(player2, dt);

    if(!player1.alive && !player2.alive){ endGame("draw"); return; }
    if(!player1.alive){ endGame("P2"); return; }
    if(!player2.alive){ endGame("P1"); return; }

    if(timeLeft<=0){
      if(player1.score>player2.score) endGame("P1");
      else if(player2.score>player1.score) endGame("P2");
      else endGame("draw");
      return;
    }

    spotTimer += dt;
    if(spots.length<MAX_SPOTS && spotTimer>=1.6){
      spots.push(createSpot());
      spotTimer = 0;
    }

    if(!activeSpot){
      const col = findCollision();
      if(col){
        const elapsedRatio = 1 - timeLeft/GAME_TIME;
        setupMiniGame(col.spot, col.player, elapsedRatio);
      }
    }
  }

  if(gameState==="minigame"){
    applyBreathing(player1, dt);
    applyBreathing(player2, dt);

    if(!player1.alive && !player2.alive){ endGame("draw"); return; }
    if(!player1.alive){ endGame("P2"); return; }
    if(!player2.alive){ endGame("P1"); return; }

    // 포인터 이동
    miniPointer += miniDir * miniSpeed * dt;
    if(miniPointer>1){ miniPointer=1; miniDir=-1; }
    if(miniPointer<0){ miniPointer=0; miniDir=1; }

    // UI 반영
    const red = (activePlayer && activePlayer.id==="P1") ? timingRedP1 : timingRedP2;
    const pointer = (activePlayer && activePlayer.id==="P1") ? timingPointerP1 : timingPointerP2;
    const cool = (activePlayer && activePlayer.id==="P1") ? coolP1 : coolP2;

    red.style.left = `${miniRedStart*100}%`;
    red.style.width = `${miniRedWidth*100}%`;
    pointer.style.left = `${miniPointer*100}%`;

    // ✅ 실패 쿨타임 처리
    if(miniLocked){
      miniLockTimer -= dt;
      const t = Math.max(0, miniLockTimer);
      cool.textContent = `실패! ${t.toFixed(1)}초 후 재시도`;
      if(miniLockTimer <= 0){
        miniLocked = false;
        cool.textContent = "다시 시도!";
      }
    }else{
      cool.textContent = "";
    }
  }
}

// draw
function draw(){
  ctx.clearRect(0,0,WIDTH,HEIGHT);

  const progress = 1 - timeLeft / GAME_TIME;
  const p = Math.min(Math.max(progress,0),1);

  // 하늘
  let sky;
  if(p<0.5) sky = lerpColor("#b3e5fc","#ffcc80", p/0.5);
  else sky = lerpColor("#ffcc80","#001a33", (p-0.5)/0.5);
  ctx.fillStyle = sky;
  ctx.fillRect(0,0,WIDTH,WATER_LINE);

  // 물
  const waterTop = lerpColor("#4fc3f7","#004f7a",p);
  const waterBottom = lerpColor("#01579b","#00111c",p);
  const g = ctx.createLinearGradient(0,WATER_LINE,0,HEIGHT);
  g.addColorStop(0,waterTop);
  g.addColorStop(1,waterBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0,WATER_LINE,WIDTH,HEIGHT-WATER_LINE);

  // 모래
  ctx.fillStyle = "#e8d3a5";
  ctx.fillRect(0,SAND_Y,WIDTH,HEIGHT-SAND_Y);

  // 수면선
  ctx.fillStyle = "#00bcd4";
  ctx.fillRect(0,WATER_LINE-2,WIDTH,4);

  // ✅ [ ! ] 먼저 그려서 뒤로 가게(플레이어가 앞)
  drawSpots();

  // ✅ 플레이어를 나중에 그려서 앞에 오게
  drawDiver(player1);
  drawDiver(player2);
}

function drawSpots(){
  ctx.font = "bold 18px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for(const s of spots){
    ctx.save();
    ctx.translate(s.x,s.y);
    ctx.beginPath();
    ctx.arc(0,0,s.radius+5,0,Math.PI*2);
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fill();
    ctx.fillStyle = "#ffeb3b";
    ctx.fillText("!",0,1);
    ctx.restore();
  }
}

function drawDiver(player){
  if(!player) return;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.scale(player.facing,1);

  const phase = globalTime * (player.isMoving ? 8 : 3);
  const armSwing = Math.sin(phase) * 0.4;
  const legSwing = Math.sin(phase + Math.PI/2) * 0.3;
  const bodyW = 18;
  const bodyH = 32;

  // 산소통
  ctx.save();
  ctx.translate(-bodyW/2-5, -bodyH/3);
  ctx.fillStyle = "#455a64";
  ctx.fillRect(-3.5,-9,7,24);
  ctx.restore();

  // 몸통
  ctx.fillStyle = player.colorMain;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-bodyW/2, -bodyH/2, bodyW, bodyH, 7);
  ctx.fill();
  ctx.stroke();

  // 헬멧
  ctx.beginPath();
  ctx.arc(0, -bodyH/2-9, 10, 0, Math.PI*2);
  ctx.fillStyle = "#eceff1";
  ctx.fill();
  ctx.stroke();

  // 바이저
  ctx.beginPath();
  ctx.arc(0, -bodyH/2-9, 6, 0, Math.PI*2);
  const visor = ctx.createRadialGradient(-2, -bodyH/2-11, 2, 0, -bodyH/2-9, 7);
  visor.addColorStop(0, "#fff");
  visor.addColorStop(1, "#90caf9");
  ctx.fillStyle = visor;
  ctx.fill();

  // 팔
  ctx.lineWidth = 3;
  ctx.lineCap = "round";

  ctx.save();
  ctx.translate(bodyW/2, -bodyH/4);
  ctx.rotate(0.4 + armSwing);
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.lineTo(13,0);
  ctx.strokeStyle = player.colorMain;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(-bodyW/2, -bodyH/4);
  ctx.rotate(-0.4 - armSwing);
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.lineTo(-13,0);
  ctx.strokeStyle = player.colorAccent;
  ctx.stroke();
  ctx.restore();

  // 다리+오리발
  ctx.lineWidth = 3.2;

  ctx.save();
  ctx.translate(bodyW/4, bodyH/2);
  ctx.rotate(0.6 + legSwing);
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,13);
  ctx.strokeStyle = player.colorAccent; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-4,13); ctx.lineTo(4,13); ctx.lineTo(6,19); ctx.lineTo(-6,19);
  ctx.closePath();
  ctx.fillStyle = player.colorFin; ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(-bodyW/4, bodyH/2);
  ctx.rotate(0.6 - legSwing);
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,13);
  ctx.strokeStyle = player.colorAccent; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-4,13); ctx.lineTo(4,13); ctx.lineTo(6,19); ctx.lineTo(-6,19);
  ctx.closePath();
  ctx.fillStyle = player.colorFin; ctx.fill();
  ctx.restore();

  ctx.restore();
}

// 시작
resetGame();
requestAnimationFrame(loop);


