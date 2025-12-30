 const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");




const WIDTH = canvas.width;
const HEIGHT = canvas.height;


const startScreen = document.getElementById("startScreen");
const howToPlayScreen = document.getElementById("howToPlayScreen");
const gameOverlay = document.getElementById("overlay");


const gameContainer = document.getElementById("gameContainer");
const centerTime = document.getElementById("centerTime"); // [수정] 긴장감 효과용




const WATER_LINE = HEIGHT * 0.18;
const SAND_Y = HEIGHT * 0.82;




const PANEL_MARGIN = 10;
const PANEL_WIDTH = 180;
const PLAY_MIN_X = PANEL_MARGIN + PANEL_WIDTH + 30;
const PLAY_MAX_X = WIDTH - PANEL_MARGIN - PANEL_WIDTH - 30;




const PLAYER_RADIUS = 14;
const GAME_TIME = 120; // 2분




// DOM Elements
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




// --- Game State ---
const keys = {};
let gameState = "lobby";
let timeLeft = GAME_TIME;
let countdownValue = 3;
let countdownTimer = 0;
let globalTime = 0;




window.showInstructions = function() {
  gameState = "instructions";
  startScreen.style.display = "none";
  howToPlayScreen.style.display = "flex";
}


// 설명창에서 'PLAY NOW' 버튼 클릭 시 호출
window.startGameFromMenu = function() {
  howToPlayScreen.style.display = "none";
  gameOverlay.style.display = "flex";
  startCountdown();
}


// 키보드 입력 처리
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;


  if (gameState === "lobby") {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      window.showInstructions(); // 수정된 함수 호출
    }
  } else if (gameState === "instructions") {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      window.startGameFromMenu(); // 수정된 함수 호출
    }
  } else if (gameState === "gameover") {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      resetGame(); // resetToLobby 대신 기존에 정의된 resetGame 사용
    }
  }
});


  function showHowToPlay() {
  gameState = "instructions";
  startScreen.style.display = "none";
  howToPlayScreen.style.display = "flex";
}


function startGameNow() {
  howToPlayScreen.style.display = "none";
  gameOverlay.style.display = "flex";
  startCountdown();
}


// Particles & Floating Text
let bubbles = [];
let floatingTexts = []; // [수정] 실패 텍스트 등 부유 텍스트 관리




// --- Player Setup ---
function createPlayer(id, mainColor, accentColor, finColor, startX) {
  return {
    id,
    x: startX,
    y: (WATER_LINE + SAND_Y) / 2,
    facing: 1,
    speed: 240,
    isMoving: false,
    oxygen: 1.3,
    hp: 1.0,
    hpTimer: 0, // [수정] 체력 감소를 위한 누적 타이머
    score: 0,
    alive: true,
    colorMain: mainColor,
    colorAccent: accentColor,
    colorFin: finColor,
    auraTimer: 0
  };
}
const player1 = createPlayer("P1", "#00bcd4", "#00838f", "#ffca28", (PLAY_MIN_X + PLAY_MAX_X) / 2 - 80);
const player2 = createPlayer("P2", "#f06292", "#c2185b", "#ffb3c1", (PLAY_MIN_X + PLAY_MAX_X) / 2 + 80);




// --- Spots & Minigames ---
const spots = [];
let spotTimer = 0;
const MAX_SPOTS = 5;




// minigames: { P1: { ..., locked: bool, lockTimer: number }, P2: ... }
const minigames = { P1: null, P2: null };




// --- Trash Data ---
const TRASH_COMMON = [
  { name: "플라스틱 병", baseScore: 10, icon: "🧴", rarity: "common" },
  { name: "비닐봉지", baseScore: 12, icon: "🛍️", rarity: "common" },
  { name: "캔 조각", baseScore: 14, icon: "🥫", rarity: "common" },
  { name: "일회용 컵", baseScore: 16, icon: "🥤", rarity: "common" },
  { name: "낚시줄", baseScore: 18, icon: "🪢", rarity: "common" },
  { name: "담배꽁초", baseScore: 20, icon: "🚬", rarity: "common" },
  { name: "타이어 조각", baseScore: 24, icon: "🛞", rarity: "common" },
  { name: "녹슨 드럼통", baseScore: 28, icon: "🛢️", rarity: "common" },
];




const TRASH_RARE = [
  { name: "보물 상자", baseScore: 80, icon: "💎", rarity: "rare" },
  { name: "고대 유물", baseScore: 100, icon: "🏺", rarity: "rare" },
];




function randTrash(depthFactor) {
  const rareChance = 0.05 + (depthFactor * 0.25);
  let base;
  if (Math.random() < rareChance) {
    base = TRASH_RARE[Math.floor(Math.random() * TRASH_RARE.length)];
  } else {
    base = TRASH_COMMON[Math.floor(Math.random() * TRASH_COMMON.length)];
  }
  const depthBonus = Math.round(depthFactor * 10);
  return { ...base, score: base.baseScore + depthBonus };
}




// --- Background Decorations ---
let decorations = {
  clouds: [],
  rocks: [],
  seaweeds: [],
  fishSchools: [],
  crabs: [],
  turtle: null,
  boat: { x: 100, y: WATER_LINE - 12, w: 100, dir: 1, speed: 15 }
};




// --- Input Handling ---
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




  if (gameState === "playing" || gameState === "minigame") {
    // P1 (WASD)
    if (["w", "a", "s", "d"].includes(k)) {
      if (minigames["P1"] && !minigames["P1"].locked) {
        if (minigames["P1"].inputWait <= 0) {
          e.preventDefault();
          resolveMiniGameFor("P1");
        }
      }
    }
    // P2 (Arrows)
    if (e.code.startsWith("Arrow")) {
      if (minigames["P2"] && !minigames["P2"].locked) {
        if (minigames["P2"].inputWait <= 0) {
          e.preventDefault();
          resolveMiniGameFor("P2");
        }
      }
    }
  }
});
window.addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));




canvas.addEventListener("click", () => {
  if (gameState === "lobby") startCountdown();
  else if (gameState === "gameover") resetGame();
});




// --- Core Logic ---




const OXYGEN_MAX = 1.3;
const OXYGEN_REGEN_PER_SEC = 1 / 3;
const OXYGEN_DRAIN_BASE = 1 / 36;
// [수정] 체력 로직 상수
const HP_DAMAGE_BLOCK = 0.1; // 한 칸 (10%)
const HP_DAMAGE_INTERVAL = 1.8; // 1.8초마다




function createBubble(x, y) {
  bubbles.push({
    x: x, y: y,
    r: 2 + Math.random() * 2,
    speed: 30 + Math.random() * 20,
    life: 1.0
  });
}




// [수정] 실패 텍스트 생성
function spawnFloatingText(x, y, text, color) {
  floatingTexts.push({
    x, y, text, color,
    life: 1.0, // 1초 유지
    dy: -20 // 위로 떠오름
  });
}




function applyBreathing(player, dt) {
  if (!player.alive) return;




  const surfaceY = WATER_LINE - 4;
  const bottomY = SAND_Y - PLAYER_RADIUS - 2;




  if (player.y < surfaceY) {
    // 수면 위: 산소 회복
    player.oxygen = Math.min(OXYGEN_MAX, player.oxygen + OXYGEN_REGEN_PER_SEC * dt);
   
    // [수정] 숨 쉬면 체력 감소 타이머 초기화 (누적 데미지 취소)
    player.hpTimer = 0;
  } else {
    // 수중: 산소 소모
    const depthRatio = Math.min(1, Math.max(0, (player.y - surfaceY) / (bottomY - surfaceY)));
    const drain = OXYGEN_DRAIN_BASE * (1 + depthRatio * 1.8);
    player.oxygen = Math.max(0, player.oxygen - drain * dt);
   
    // 버블 생성
    if (player.oxygen > 0 && Math.random() < 0.1) {
      createBubble(player.x + (player.facing * 5), player.y - 5);
    }
  }




  // [수정] 산소 고갈 시 체력 로직 (계단식 감소)
  if (player.oxygen <= 0) {
    player.hpTimer += dt;
   
    // 1.8초가 지날 때마다 한 칸씩 깎음
    if (player.hpTimer >= HP_DAMAGE_INTERVAL) {
      player.hp = Math.max(0, player.hp - HP_DAMAGE_BLOCK);
      player.hpTimer = 0; // 타이머 리셋 (다음 칸 대기)
    }




    // 버블 조금
    if (Math.random() < 0.2) {
      createBubble(player.x + (player.facing * 5), player.y - 5);
    }




    if (player.hp <= 0) {
      player.alive = false;
    }
  }




  if (player.auraTimer > 0) player.auraTimer -= dt;
}




// --- Minigame System ---
function setupMiniGameFor(spot, player, elapsedRatio) {
  for (const pid of ["P1", "P2"]) {
    if (minigames[pid] && minigames[pid].spot === spot) return false;
  }




  const depthFactor = spot.depthT;
  const miniRedWidth = Math.max(0.12, 0.40 - (depthFactor * 0.15) - (elapsedRatio * 0.1));
  const miniRedStart = 0.5 - miniRedWidth / 2;
  const miniSpeed = 1.0 + (depthFactor * 1.0) + (elapsedRatio * 0.5);




  minigames[player.id] = {
    spot,
    player,
    pointer: Math.random(),
    dir: Math.random() < 0.5 ? -1 : 1,
    speed: miniSpeed,
    redStart: miniRedStart,
    redWidth: miniRedWidth,
    locked: false,
    lockTimer: 0,
    inputWait: 0.3 // [수정] 입력 대기 0.3초
  };




  const box = player.id === "P1" ? timingP1Box : timingP2Box;
  const ptr = player.id === "P1" ? timingPointerP1 : timingPointerP2;
  box.style.display = "flex";
  ptr.classList.add("waiting");




  gameState = "minigame";
  return true;
}




function spawnRareEffect(x, y) {
  const rect = gameContainer.getBoundingClientRect();
  const scaleX = rect.width / WIDTH;
  const scaleY = rect.height / HEIGHT;




  for (let i = 0; i < 3; i++) {
    const star = document.createElement("div");
    star.className = "star rare";
    const rx = (x + (Math.random() - 0.5) * 40) * scaleX;
    const ry = (y - 20 + (Math.random() - 0.5) * 30) * scaleY;
    star.style.left = `${rx}px`;
    star.style.top = `${ry}px`;
    const s = 8 + Math.random() * 6;
    star.style.width = `${s}px`;
    star.style.height = `${s}px`;
    star.style.animationDelay = `${i * 0.2}s`;
    gameContainer.appendChild(star);
    setTimeout(() => { if (star.parentNode) star.parentNode.removeChild(star); }, 1500);
  }
}




function resolveMiniGameFor(playerId) {
  const mg = minigames[playerId];
  if (!mg || mg.locked) return;




  const inRed = mg.pointer >= mg.redStart && mg.pointer <= mg.redStart + mg.redWidth;




  if (inRed) {
    // 성공
    const trash = randTrash(mg.spot.depthT);
    mg.player.score += trash.score;
    addTrashToInventory(mg.player, trash);
    updateScoreUI();




    if (trash.rarity === "rare") {
      mg.player.auraTimer = 1.0;
      spawnRareEffect(mg.player.x, mg.player.y);
    }




    const idx = spots.indexOf(mg.spot);
    if (idx >= 0) spots.splice(idx, 1);




    minigames[playerId] = null;
    if (playerId === "P1") timingP1Box.style.display = "none";
    else timingP2Box.style.display = "none";




    if (!minigames["P1"] && !minigames["P2"]) gameState = "playing";




  } else {
    // 실패
    mg.locked = true;
    mg.lockTimer = 2.0;
    const box = playerId === "P1" ? timingP1Box : timingP2Box;
    const cool = playerId === "P1" ? coolP1 : coolP2;
   
    box.style.display = "none";
    cool.textContent = `실패! ${mg.lockTimer.toFixed(1)}초 후 재시도`;
   
    // [수정] 실패 시 "실패!" 텍스트 띄우기
    spawnFloatingText(mg.player.x, mg.player.y - 30, "실패!", "#ff1744");
  }
}




// --- Movement ---
function handleMovement(player, dt, map) {
  if (!player.alive) { player.isMoving = false; return; }




  const mg = minigames[player.id];
  if (mg && !mg.locked) {
    player.isMoving = false;
    return;
  }




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




// --- Main Loop & Update ---
function update(dt) {
  if (gameState === "playing" || gameState === "minigame") {
    timeLeft = Math.max(0, timeLeft - dt);
  }
  const m = Math.floor(timeLeft / 60);
  const s = Math.floor(timeLeft % 60);
  timerText.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;




  // [수정] 15초 이하일 때 경고 클래스 추가
  if (timeLeft <= 15 && timeLeft > 0) {
    centerTime.classList.add("warning");
  } else {
    centerTime.classList.remove("warning");
  }




  updateBarsUI();




  // 버블 업데이트
  for (let i = bubbles.length - 1; i >= 0; i--) {
    let b = bubbles[i];
    b.y -= b.speed * dt;
    b.x += Math.sin(globalTime * 10 + b.y * 0.1) * 0.5;
    b.life -= dt;
    if (b.life <= 0 || b.y < WATER_LINE) bubbles.splice(i, 1);
  }




  // 부유 텍스트 업데이트
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    let ft = floatingTexts[i];
    ft.life -= dt;
    ft.y += ft.dy * dt;
    if (ft.life <= 0) floatingTexts.splice(i, 1);
  }




  if (gameState === "countdown") {
    countdownTimer += dt;
    if (countdownTimer >= 1) {
      countdownTimer -= 1;
      countdownValue -= 1;
      if (countdownValue <= 0) startPlaying();
      else bigMsg.textContent = String(countdownValue);
    }
    return;
  }




  if (gameState === "playing" || gameState === "minigame") {
    handleMovement(player1, dt, { up: "w", down: "s", left: "a", right: "d" });
    handleMovement(player2, dt, { up: "arrowup", down: "arrowdown", left: "arrowleft", right: "arrowright" });




    applyBreathing(player1, dt);
    applyBreathing(player2, dt);




    if (!player1.alive && !player2.alive) { endGame("draw"); return; }
    if (!player1.alive) { endGame("P2"); return; }
    if (!player2.alive) { endGame("P1"); return; }




    if (timeLeft <= 0) {
      if (player1.score > player2.score) endGame("P1");
      else if (player2.score > player1.score) endGame("P2");
      else endGame("draw");
      return;
    }




    spotTimer += dt;
    if (spots.length < MAX_SPOTS && spotTimer >= 1.6) {
        const newSpot = createSpot();
        if(newSpot) spots.push(newSpot);
        spotTimer = 0;
    }




    // Minigame Trigger
    if (!minigames["P1"]) {
      const s1 = spots.find(s => Math.hypot(player1.x - s.x, player1.y - s.y) <= PLAYER_RADIUS + s.radius + 4);
      if (s1) setupMiniGameFor(s1, player1, 1 - timeLeft / GAME_TIME);
    }
    if (!minigames["P2"]) {
      const s2 = spots.find(s => Math.hypot(player2.x - s.x, player2.y - s.y) <= PLAYER_RADIUS + s.radius + 4);
      if (s2) setupMiniGameFor(s2, player2, 1 - timeLeft / GAME_TIME);
    }
  }




  // Update Minigames
  for (const pid of ["P1", "P2"]) {
    const mg = minigames[pid];
    if (!mg) {
      const box = pid === "P1" ? timingP1Box : timingP2Box;
      const cool = pid === "P1" ? coolP1 : coolP2;
      cool.textContent = ""; box.style.display = "none";
      continue;
    }




    if (mg.inputWait > 0) {
      mg.inputWait -= dt;
      if (mg.inputWait <= 0) {
        const ptr = pid === "P1" ? timingPointerP1 : timingPointerP2;
        ptr.classList.remove("waiting");
      }
    }




    if (!mg.locked) {
      mg.pointer += mg.dir * mg.speed * dt;
      if (mg.pointer > 1) { mg.pointer = 1; mg.dir = -1; }
      if (mg.pointer < 0) { mg.pointer = 0; mg.dir = 1; }




      const red = pid === "P1" ? timingRedP1 : timingRedP2;
      const pointer = pid === "P1" ? timingPointerP1 : timingPointerP2;
      red.style.left = `${mg.redStart * 100}%`;
      red.style.width = `${mg.redWidth * 100}%`;
      pointer.style.left = `${mg.pointer * 100}%`;




      const dist = Math.hypot(mg.player.x - mg.spot.x, mg.player.y - mg.spot.y);
      if (dist > PLAYER_RADIUS + mg.spot.radius + 20) {
         minigames[pid] = null;
         const box = pid === "P1" ? timingP1Box : timingP2Box;
         box.style.display = "none";
      }
    } else {
      mg.lockTimer -= dt;
      const cool = pid === "P1" ? coolP1 : coolP2;
      cool.textContent = `실패! ${Math.max(0, mg.lockTimer).toFixed(1)}초 후 재시도`;
     
      if (mg.lockTimer <= 0) {
        minigames[pid] = null;
        cool.textContent = "";
      }
    }
  }
}




// --- Render ---




function drawDecorations(dt) {
  const tRatio = 1 - (timeLeft / GAME_TIME);
 
  // Sky
  let skyColor;
  if (tRatio < 0.5) skyColor = lerpColor("#64b5f6", "#1a237e", tRatio * 2);
  else skyColor = lerpColor("#1a237e", "#000510", (tRatio - 0.5) * 2);
  ctx.fillStyle = skyColor;
  ctx.fillRect(0, 0, WIDTH, WATER_LINE);




  if (tRatio < 0.6) {
    const sunX = WIDTH * 0.2 + (WIDTH * 0.6) * (tRatio / 0.6);
    const sunY = 50 + Math.pow((tRatio / 0.6) - 0.5, 2) * 200;
    ctx.save(); translate(ctx, sunX, sunY);
    ctx.fillStyle = "#ffeb3b"; ctx.beginPath(); ctx.arc(0,0, 20, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
  if (tRatio > 0.4) {
    const moonProgress = (tRatio - 0.4) / 0.6;
    const moonX = WIDTH * 0.1 + (WIDTH * 0.8) * moonProgress;
    const moonY = 80 - Math.sin(moonProgress * Math.PI) * 40;
    ctx.save(); translate(ctx, moonX, moonY);
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0,0, 16, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }




  // [수정] 구름 디자인 변경 (전형적인 구름 모양)
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for(const c of decorations.clouds) {
    c.x += c.speed * dt;
    if(c.x > WIDTH + 50) c.x = -50;
   
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.beginPath();
    // 바닥은 평평하게, 위는 둥글게
    ctx.moveTo(-c.size, 0);
    ctx.lineTo(c.size, 0);
    // 3단 굴곡
    ctx.bezierCurveTo(c.size, -c.size*0.5, c.size*0.5, -c.size, 0, -c.size*0.8);
    ctx.bezierCurveTo(-c.size*0.5, -c.size, -c.size, -c.size*0.5, -c.size, 0);
    ctx.fill();
    ctx.restore();
  }




  // Sea
  const seaTop = lerpColor("#006994", "#001b2e", tRatio);
  const seaBot = lerpColor("#001b2e", "#000000", tRatio);
  const grad = ctx.createLinearGradient(0, WATER_LINE, 0, HEIGHT);
  grad.addColorStop(0, seaTop);
  grad.addColorStop(1, seaBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, WATER_LINE, WIDTH, HEIGHT - WATER_LINE);
  ctx.fillStyle = "#c7b199"; ctx.fillRect(0, SAND_Y, WIDTH, HEIGHT - SAND_Y);




  drawSimpleObjects(dt);
}




function drawSimpleObjects(dt) {
  // Boat
  const boat = decorations.boat;
  boat.x += boat.dir * boat.speed * dt;
  if(boat.x>PLAY_MAX_X-40) boat.dir=-1; if(boat.x<PLAY_MIN_X+20) boat.dir=1;
  ctx.save(); translate(ctx, boat.x, boat.y); ctx.scale(boat.dir,1);
  ctx.fillStyle = "#8d6e63"; ctx.beginPath(); ctx.moveTo(-40,0); ctx.lineTo(40,0); ctx.quadraticCurveTo(35,20,20,20); ctx.lineTo(-30,20); ctx.quadraticCurveTo(-45,20,-40,0); ctx.fill();
  ctx.fillStyle="#eee"; ctx.fillRect(-20,-15,30,15);
  ctx.fillStyle="#5d4037"; ctx.fillRect(15,-35,4,35);
  ctx.fillStyle="#ff5252"; ctx.beginPath(); ctx.moveTo(19,-35); ctx.lineTo(40,-28); ctx.lineTo(19,-20); ctx.fill();
  ctx.restore();




  // Rocks
  ctx.fillStyle = "#795548";
  for(const r of decorations.rocks){
    ctx.save(); translate(ctx, r.x, r.y);
    ctx.beginPath(); ctx.moveTo(-r.w/2,0); ctx.lineTo(-r.w/3,-r.h); ctx.lineTo(r.w/4,-r.h*0.8); ctx.lineTo(r.w/2,0); ctx.fill();
    ctx.restore();
  }
  // Seaweed
  ctx.fillStyle = "#4caf50";
  for(const s of decorations.seaweeds){
    ctx.save(); translate(ctx, s.x, s.baseY);
    const sway = Math.sin(globalTime*2+s.x)*10*s.sway;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(5,-s.h/3,sway,-s.h); ctx.quadraticCurveTo(-5,-s.h/3,0,0); ctx.fill();
    ctx.restore();
  }
}




function drawDiver(player) {
  if (!player) return;




  if (player.auraTimer > 0) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.beginPath();
    ctx.arc(0, -6, 28, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(213, 0, 249, ${player.auraTimer * 0.6})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(224, 64, 251, ${player.auraTimer})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }




  ctx.save();
  ctx.translate(player.x, player.y);
 
  ctx.fillStyle = "#fff";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 4;
  ctx.fillText(player.id === "P1" ? "Player 1" : "Player 2", 0, -45);
  ctx.shadowBlur = 0;




  ctx.scale(player.facing, 1);




  const bodyW = 18, bodyH = 32;
  const phase = globalTime * (player.isMoving ? 10 : 3);
 
  // Tank
  ctx.save(); ctx.translate(-bodyW/2-5, -bodyH/3);
  ctx.fillStyle = "#455a64"; ctx.fillRect(-3.5,-9,7,24); ctx.restore();




  // Body
  ctx.fillStyle = player.colorMain; ctx.strokeStyle="#fff"; ctx.lineWidth=2;
  ctx.beginPath(); roundRect(ctx, -bodyW/2, -bodyH/2, bodyW, bodyH, 7); ctx.fill(); ctx.stroke();




  // Helmet
  ctx.beginPath(); ctx.arc(0, -bodyH/2-9, 10, 0, Math.PI*2); ctx.fillStyle="#eceff1"; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -bodyH/2-9, 6, 0, Math.PI*2);
  const visor = ctx.createRadialGradient(-2,-bodyH/2-11,2,0,-bodyH/2-9,7);
  visor.addColorStop(0,"#fff"); visor.addColorStop(1,"#90caf9");
  ctx.fillStyle=visor; ctx.fill();




  // Arms
  ctx.lineWidth=3; ctx.lineCap="round";
  ctx.save(); ctx.translate(bodyW/2, -bodyH/4); ctx.rotate(0.4+Math.sin(phase)*0.4);
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(13,0); ctx.strokeStyle=player.colorMain; ctx.stroke(); ctx.restore();




  ctx.save(); ctx.translate(-bodyW/2, -bodyH/4); ctx.rotate(-0.4-Math.sin(phase)*0.4);
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-13,0); ctx.strokeStyle=player.colorAccent; ctx.stroke(); ctx.restore();




  // [수정] 다리 두 개 복구 및 애니메이션 교차 적용
  // Right Leg
  ctx.save(); ctx.translate(bodyW/4, bodyH/2); ctx.rotate(0.6+Math.sin(phase + Math.PI)*0.4);
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,13); ctx.strokeStyle=player.colorAccent; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-4,13); ctx.lineTo(4,13); ctx.lineTo(6,19); ctx.lineTo(-6,19); ctx.closePath(); ctx.fillStyle=player.colorFin; ctx.fill(); ctx.restore();




  // Left Leg
  ctx.save(); ctx.translate(-bodyW/4, bodyH/2); ctx.rotate(0.6+Math.sin(phase)*0.4);
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,13); ctx.strokeStyle=player.colorAccent; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-4,13); ctx.lineTo(4,13); ctx.lineTo(6,19); ctx.lineTo(-6,19); ctx.closePath(); ctx.fillStyle=player.colorFin; ctx.fill(); ctx.restore();




  ctx.restore();
}




function drawBubbles() {
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
  ctx.lineWidth = 1;
  for (const b of bubbles) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}




function drawFloatingTexts() {
  ctx.textAlign = "center";
  ctx.font = "bold 14px sans-serif";
  for (const ft of floatingTexts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.life); // 점점 투명해짐
    ctx.fillStyle = ft.color;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}




// Helpers
function createSpot() {
  const marginX = 20;
  const yTop = WATER_LINE + 40;
  const yBottom = SAND_Y - 24;
  for (let attempt = 0; attempt < 15; attempt++) {
    const x = PLAY_MIN_X + marginX + Math.random() * (PLAY_MAX_X - PLAY_MIN_X - marginX * 2);
    const t = Math.random();
    const y = yTop + t * t * (yBottom - yTop);
    let ok = true;
    for (const s of spots) {
      if (Math.hypot(x - s.x, y - s.y) < 11 + s.radius + 10) { ok = false; break; }
    }
    if (ok) return { x, y, radius: 11, depthT: t };
  }
  return null;
}
function translate(ctx, x, y) { ctx.translate(x, y); }
function lerp(a, b, t) { return a + (b - a) * t; }
function hexToRgb(hex) {
  const h = hex.replace("#", ""); const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function lerpColor(c1, c2, t) {
  const a = hexToRgb(c1), b = hexToRgb(c2);
  const r = Math.round(lerp(a.r, b.r, t));
  const g = Math.round(lerp(a.g, b.g, t));
  const bl = Math.round(lerp(a.b, b.b, t));
  return `rgb(${r},${g},${bl})`;
}
function roundRect(ctx, x, y, w, h, r) {
  const min = Math.min(w, h) / 2; if (r > min) r = min;
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}




// UI Setup
function updateScoreUI() {
  scoreP1El.textContent = player1.score; scoreP2El.textContent = player2.score;
  hudP1.classList.toggle("leader", player1.score > player2.score);
  hudP2.classList.toggle("leader", player2.score > player1.score);
}
function updateBarsUI() {
  const hp1 = Math.max(0, player1.hp); const hp2 = Math.max(0, player2.hp);
  const o1 = Math.max(0, player1.oxygen / OXYGEN_MAX); const o2 = Math.max(0, player2.oxygen / OXYGEN_MAX);
  hpFillP1.style.transform = `scaleY(${hp1})`; hpFillP2.style.transform = `scaleY(${hp2})`;
  oxygenP1Fill.style.transform = `scaleY(${o1})`; oxygenP2Fill.style.transform = `scaleY(${o2})`;
 
  // 체력 바는 깜빡임 제거 (뚝뚝 끊기므로), 산소만 깜빡임 유지
  oxygenP1Fill.classList.toggle("blinkLowO2", o1 <= 0.3 && player1.alive);
  oxygenP2Fill.classList.toggle("blinkLowO2", o2 <= 0.3 && player2.alive);
}
function addTrashToInventory(player, trash) {
  const parent = player.id === "P1" ? invP1 : invP2;
  const item = document.createElement("div");
  item.className = "trashItem";
  if (trash.rarity === "rare") item.classList.add("rare");
 
  const icon = document.createElement("div"); icon.className = "trashIcon"; icon.textContent = trash.icon;
  const text = document.createElement("div"); text.textContent = `${trash.name} (+${trash.score})`;
  item.appendChild(icon); item.appendChild(text);
  parent.insertBefore(item, parent.firstChild);
  while (parent.children.length > 16) parent.removeChild(parent.lastChild);
}




// Init Game
function initDecorations() {
  decorations.clouds = [];
  for (let i = 0; i < 4; i++) {
    // [수정] 구름 크기 좀 더 키움
    decorations.clouds.push({ x: Math.random() * WIDTH, y: 30 + Math.random() * 50, size: 28 + Math.random() * 10, speed: 6 + Math.random() * 8 });
  }
  decorations.rocks = [];
  for (let i = 0; i < 3; i++) decorations.rocks.push({ x: PLAY_MIN_X + 40 + i * 160 + Math.random() * 60, y: SAND_Y + 5, w: 40 + Math.random() * 20, h: 25 + Math.random() * 15 });
  decorations.seaweeds = [];
  for (let i = 0; i < 5; i++) decorations.seaweeds.push({ x: PLAY_MIN_X + 20 + i * 180 + Math.random() * 80, baseY: SAND_Y, h: 40 + Math.random() * 30, sway: Math.random() * 1.2 });
}




function resetGame() {
  Object.assign(player1, createPlayer("P1", "#00bcd4", "#00838f", "#ffca28", (PLAY_MIN_X + PLAY_MAX_X) / 2 - 80));
  Object.assign(player2, createPlayer("P2", "#f06292", "#c2185b", "#ffb3c1", (PLAY_MIN_X + PLAY_MAX_X) / 2 + 80));
  timeLeft = GAME_TIME; countdownValue = 3; countdownTimer = 0;
  spots.length = 0; spotTimer = 0; bubbles = []; floatingTexts = [];
  minigames.P1 = null; minigames.P2 = null;
  timingP1Box.style.display = "none"; timingP2Box.style.display = "none";
  coolP1.textContent = ""; coolP2.textContent = "";
  invP1.innerHTML = ""; invP2.innerHTML = "";
  updateScoreUI(); updateBarsUI();
  bigMsg.textContent = "Ocean Cleaners"; smallMsg.textContent = "클릭 또는 Space로 시작";
  overlay.style.display = "flex"; gameState = "lobby";
  centerTime.classList.remove("warning");
  initDecorations();
}




function startCountdown() { gameState = "countdown"; countdownValue = 3; countdownTimer = 0; bigMsg.textContent = "3"; smallMsg.textContent = ""; }
function startPlaying() { gameState = "playing"; overlay.style.display = "none"; }
function endGame(id) {
  gameState = "gameover"; overlay.style.display = "flex";
  centerTime.classList.remove("warning");
  if (id === "draw") bigMsg.textContent = "무승부!";
  else bigMsg.textContent = `${id === "P1" ? "Player 1" : "Player 2"} 승리!`;
  smallMsg.textContent = `P1: ${player1.score} / P2: ${player2.score}\n클릭하여 재시작`;
}




// Loop
let lastTime = 0;
function loop(ts) {
  if (!lastTime) lastTime = ts; const dt = (ts - lastTime) / 1000; lastTime = ts;
  globalTime += dt;
  update(dt);
 
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawDecorations(dt);
 
  ctx.font = "bold 18px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const s of spots) {
    ctx.save(); translate(ctx, s.x, s.y);
    ctx.beginPath(); ctx.arc(0, 0, s.radius + 5, 0, Math.PI * 2); ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fill();
    ctx.fillStyle = "#ffeb3b"; ctx.fillText("!", 0, 1);
    ctx.restore();
  }




  drawDiver(player1);
  drawDiver(player2);
  drawBubbles();
  drawFloatingTexts(); // [수정] 텍스트 그리기
 
  requestAnimationFrame(loop);
}




resetGame();
requestAnimationFrame(loop);



