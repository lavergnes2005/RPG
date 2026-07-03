// ---------- Chlora Quest (pure vanilla JS, no external libraries) ----------

const TILE = 48;
const MAP_COLS = 14;
const MAP_ROWS = 10;

// 0 = grass, 1 = tree (blocked), 2 = path, 3 = encounter zone (tall grass)
const MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,2,2,2,0,0,3,3,0,0,1],
  [1,0,0,0,2,0,2,0,3,3,3,3,0,1],
  [1,0,1,0,2,0,2,0,3,3,3,3,0,1],
  [1,0,1,0,2,0,2,0,0,3,3,0,0,1],
  [1,0,0,0,2,2,2,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,2,0,0,1,1,0,0,1],
  [1,0,0,0,0,0,2,0,0,1,1,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const TILE_COLORS = {
  0: '#3a6b35', // grass
  1: '#1f3d1c', // tree
  2: '#8a6b4a', // path
  3: '#4f8a3d', // tall grass (encounter zone)
};

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = MAP_COLS * TILE;
canvas.height = MAP_ROWS * TILE;

const hintEl = document.getElementById('hint');

const playerSprite = new Image();
playerSprite.src = 'assets/player.png';
const SPRITE_FRAME = 32;
const FACING_ROWS = { down: 0, left: 1, right: 2, up: 3 };
let facing = 'down';
let animFrame = 0; // 0 = stand, 1/2 = walk frames
let animTimer = 0;

function statsForLevel(level) {
  return {
    maxHp: 26 + level * 6,
    maxMp: 10 + level * 2,
    atk: 5 + level * 2,
  };
}

const party = {
  name: 'Ryn',
  level: 1,
  xp: 0,
  xpToNext: 20,
  ...statsForLevel(1),
};
party.hp = party.maxHp;
party.mp = party.maxMp;

let state = 'world'; // 'world' or 'battle'
let playerTile = { x: 2, y: 2 };
let playerPixel = { x: playerTile.x * TILE + TILE / 2, y: playerTile.y * TILE + TILE / 2 };
let moving = false;
let stepsSinceEncounter = 0;

const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  handleBattleInput(e.key);
});
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

function isBlocked(tx, ty) {
  if (tx < 0 || ty < 0 || ty >= MAP_ROWS || tx >= MAP_COLS) return true;
  return MAP[ty][tx] === 1;
}

function drawWorld() {
  for (let y = 0; y < MAP_ROWS; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      ctx.fillStyle = TILE_COLORS[MAP[y][x]];
      ctx.fillRect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2);
    }
  }

  const row = FACING_ROWS[facing];
  const drawSize = TILE * 1.1;
  if (playerSprite.complete && playerSprite.naturalWidth > 0) {
    ctx.drawImage(
      playerSprite,
      animFrame * SPRITE_FRAME, row * SPRITE_FRAME, SPRITE_FRAME, SPRITE_FRAME,
      playerPixel.x - drawSize / 2, playerPixel.y - drawSize / 2, drawSize, drawSize
    );
  }

  // HUD
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(4, 4, 150, 20);
  ctx.fillStyle = '#ffcc66';
  ctx.font = '13px sans-serif';
  ctx.fillText(`Lv ${party.level}  XP ${party.xp}/${party.xpToNext}`, 10, 18);
}

function updateWorld() {
  if (moving) {
    const targetX = playerTile.x * TILE + TILE / 2;
    const targetY = playerTile.y * TILE + TILE / 2;
    const speed = 6;
    const dx = targetX - playerPixel.x;
    const dy = targetY - playerPixel.y;

    animTimer++;
    if (animTimer % 6 === 0) {
      animFrame = animFrame === 1 ? 2 : 1;
    }

    if (Math.abs(dx) <= speed && Math.abs(dy) <= speed) {
      playerPixel.x = targetX;
      playerPixel.y = targetY;
      moving = false;
      animFrame = 0;
      checkEncounter(playerTile.x, playerTile.y);
    } else {
      playerPixel.x += Math.sign(dx) * Math.min(speed, Math.abs(dx));
      playerPixel.y += Math.sign(dy) * Math.min(speed, Math.abs(dy));
    }
    return;
  }

  let dx = 0, dy = 0;
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) { dx = -1; facing = 'left'; }
  else if (keys['ArrowRight'] || keys['d'] || keys['D']) { dx = 1; facing = 'right'; }
  else if (keys['ArrowUp'] || keys['w'] || keys['W']) { dy = -1; facing = 'up'; }
  else if (keys['ArrowDown'] || keys['s'] || keys['S']) { dy = 1; facing = 'down'; }

  if (dx === 0 && dy === 0) return;

  const newX = playerTile.x + dx;
  const newY = playerTile.y + dy;
  if (isBlocked(newX, newY)) return;

  playerTile = { x: newX, y: newY };
  moving = true;
}

function checkEncounter(x, y) {
  if (MAP[y][x] !== 3) return;
  stepsSinceEncounter++;
  if (Math.random() < 0.25 || stepsSinceEncounter >= 6) {
    stepsSinceEncounter = 0;
    startBattle();
  }
}

// ---------- Battle ----------

const ENEMY_TYPES = [
  { name: 'Cave Slime', maxHp: 20, atk: 4, xp: 12 },
  { name: 'Rock Beetle', maxHp: 28, atk: 6, xp: 18 },
  { name: 'Marsh Wisp', maxHp: 16, atk: 5, xp: 14 },
];

let enemy = null;
let battleOver = false;
let playerTurn = true;
let selectedIndex = 0;
const menuItems = ['Attack', 'Fire', 'Potion', 'Ether', 'Run'];
let battleLog = '';

function startBattle() {
  state = 'battle';
  const template = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
  enemy = { ...template, hp: template.maxHp };
  battleOver = false;
  playerTurn = true;
  selectedIndex = 0;
  battleLog = `A wild ${enemy.name} appears!`;
  hintEl.textContent = 'Use ▲▼ to choose, SELECT to confirm.';
}

function endBattleToWorld() {
  state = 'world';
  hintEl.textContent = 'Use the D-pad to move. Walk into tall grass to trigger a battle.';
}

function handleBattleInput(key) {
  if (state !== 'battle' || battleOver || !playerTurn) return;

  if (key === 'ArrowUp' || key === 'w' || key === 'W') {
    selectedIndex = (selectedIndex + menuItems.length - 1) % menuItems.length;
  } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
    selectedIndex = (selectedIndex + 1) % menuItems.length;
  } else if (key === 'Enter' || key === ' ') {
    doAction(menuItems[selectedIndex]);
  }
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function doAction(action) {
  if (action === 'Attack') {
    const dmg = rand(party.atk - 2, party.atk + 2);
    enemy.hp = Math.max(0, enemy.hp - dmg);
    battleLog = `${party.name} attacks for ${dmg} damage!`;
  } else if (action === 'Fire') {
    if (party.mp < 4) {
      battleLog = 'Not enough MP!';
      return;
    }
    party.mp -= 4;
    const dmg = rand(8, 14);
    enemy.hp = Math.max(0, enemy.hp - dmg);
    battleLog = `${party.name} casts Fire for ${dmg} damage!`;
  } else if (action === 'Potion') {
    const heal = 15;
    party.hp = Math.min(party.maxHp, party.hp + heal);
    battleLog = `${party.name} drinks a potion, recovering ${heal} HP!`;
  } else if (action === 'Ether') {
    const restore = 8;
    party.mp = Math.min(party.maxMp, party.mp + restore);
    battleLog = `${party.name} drinks an ether, recovering ${restore} MP!`;
  } else if (action === 'Run') {
    battleLog = 'Got away safely!';
    battleOver = true;
    setTimeout(endBattleToWorld, 1000);
    return;
  }

  if (enemy.hp <= 0) {
    const xpGained = enemy.xp;
    party.xp += xpGained;
    let msg = `${enemy.name} was defeated! Gained ${xpGained} XP.`;

    while (party.xp >= party.xpToNext) {
      party.xp -= party.xpToNext;
      party.level++;
      party.xpToNext = party.level * 20;
      const stats = statsForLevel(party.level);
      party.maxHp = stats.maxHp;
      party.maxMp = stats.maxMp;
      party.atk = stats.atk;
      party.hp = party.maxHp;
      party.mp = party.maxMp;
      msg += ` Level up! Now level ${party.level}!`;
    }

    battleLog = msg;
    battleOver = true;
    setTimeout(endBattleToWorld, 1800);
    return;
  }

  playerTurn = false;
  setTimeout(enemyTurn, 900);
}

function enemyTurn() {
  const dmg = rand(enemy.atk - 1, enemy.atk + 2);
  party.hp = Math.max(0, party.hp - dmg);
  battleLog = `${enemy.name} attacks for ${dmg} damage!`;

  if (party.hp <= 0) {
    battleLog = `${party.name} was defeated... Game over.`;
    battleOver = true;
    setTimeout(() => {
      party.hp = party.maxHp;
      party.mp = party.maxMp;
      endBattleToWorld();
    }, 1600);
    return;
  }

  playerTurn = true;
}

function drawBattle() {
  ctx.fillStyle = '#150e2b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ffcc66';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('BATTLE', 20, 34);

  ctx.fillStyle = '#5b2a86';
  ctx.beginPath();
  ctx.arc(460, 110, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px sans-serif';
  ctx.fillText(enemy.name, 400, 175);
  ctx.fillStyle = '#ff8080';
  ctx.font = '14px sans-serif';
  ctx.fillText(`HP: ${enemy.hp}/${enemy.maxHp}`, 400, 195);

  ctx.fillStyle = '#ffcc66';
  ctx.beginPath();
  ctx.arc(110, 110, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px sans-serif';
  ctx.fillText(party.name, 60, 175);
  ctx.fillStyle = '#80ff80';
  ctx.font = '14px sans-serif';
  ctx.fillText(`HP: ${party.hp}/${party.maxHp}`, 60, 195);
  ctx.fillStyle = '#80c0ff';
  ctx.fillText(`MP: ${party.mp}/${party.maxMp}`, 60, 213);

  ctx.fillStyle = '#eeeeee';
  ctx.font = '15px sans-serif';
  wrapText(battleLog, 20, 250, canvas.width - 40, 18);

  menuItems.forEach((label, i) => {
    ctx.fillStyle = i === selectedIndex ? '#ffcc66' : '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.fillText((i === selectedIndex ? '> ' : '  ') + label, 20, 300 + i * 28);
  });
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let lineY = y;
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    if (ctx.measureText(testLine).width > maxWidth && line !== '') {
      ctx.fillText(line, x, lineY);
      line = words[i] + ' ';
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, lineY);
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (state === 'world') {
    updateWorld();
    drawWorld();
  } else {
    drawBattle();
  }
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

// ---------- Touch controls ----------

document.querySelectorAll('#dpad button').forEach((btn) => {
  const dir = btn.getAttribute('data-dir');

  const press = (e) => {
    e.preventDefault();
    keys[dir] = true;
    if (state === 'battle') {
      handleBattleInput(dir);
    }
  };
  const release = (e) => {
    e.preventDefault();
    keys[dir] = false;
  };

  btn.addEventListener('touchstart', press, { passive: false });
  btn.addEventListener('touchend', release, { passive: false });
  btn.addEventListener('touchcancel', release, { passive: false });
  btn.addEventListener('mousedown', press);
  btn.addEventListener('mouseup', release);
  btn.addEventListener('mouseleave', release);
});

const actionBtn = document.getElementById('action-btn');
const pressAction = (e) => {
  e.preventDefault();
  if (state === 'battle') {
    handleBattleInput('Enter');
  }
};
actionBtn.addEventListener('touchstart', pressAction, { passive: false });
actionBtn.addEventListener('mousedown', pressAction);
