const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const scoreEls = {
  panda: document.getElementById('score-panda'),
  fox: document.getElementById('score-fox'),
};
const messageEl = document.getElementById('message');

const COURT = {
  width: canvas.width,
  height: canvas.height,
  ground: canvas.height - 80,
  netX: canvas.width / 2 - 6,
  netWidth: 12,
  netHeight: 180,
};

const PHYSICS = {
  gravity: 0.55,
  airDrag: 0.995,
  bounce: 0.86,
  playerFriction: 0.8,
  playerMoveAccel: 0.55,
  playerMaxSpeed: 6.5,
  jumpPower: 12,
};

const MATCH_POINT = 5;

const keyState = Object.create(null);

const players = [
  createPlayer('panda', 160, {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    jump: 'ArrowUp',
  }),
  createPlayer('fox', COURT.width - 224, {
    left: 'KeyA',
    right: 'KeyD',
    jump: 'KeyW',
  }),
];

const ball = {
  x: COURT.width / 2,
  y: COURT.height / 2,
  vx: 0,
  vy: 0,
  radius: 18,
};

const state = {
  scores: { panda: 0, fox: 0 },
  nextServer: 'panda',
  playing: false,
  betweenRounds: true,
  lastSideTouched: null,
  frame: 0,
};

function createPlayer(id, startX, controls) {
  return {
    id,
    controls,
    width: 72,
    height: 110,
    x: startX,
    y: COURT.ground - 110,
    vx: 0,
    vy: 0,
    onGround: true,
  };
}

function resetPlayer(player, index) {
  if (player.id === 'panda') {
    player.x = 160;
  } else {
    player.x = COURT.width - 232;
  }
  player.y = COURT.ground - player.height;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
}

function setMessage(text, visible = true) {
  messageEl.textContent = text;
  messageEl.classList.toggle('visible', visible);
}

function updateScoreboard() {
  scoreEls.panda.textContent = state.scores.panda;
  scoreEls.fox.textContent = state.scores.fox;
}

function resetMatch() {
  state.scores.panda = 0;
  state.scores.fox = 0;
  state.nextServer = Math.random() > 0.5 ? 'panda' : 'fox';
  state.playing = false;
  state.betweenRounds = true;
  updateScoreboard();
  players.forEach(resetPlayer);
  placeBallForServe();
  setMessage('按空白鍵開始比賽！');
}

function placeBallForServe() {
  const sideFactor = state.nextServer === 'panda' ? 0.3 : 0.7;
  ball.x = COURT.width * sideFactor;
  ball.y = COURT.ground - players[0].height - 140;
  ball.vx = state.nextServer === 'panda' ? 5.5 : -5.5;
  ball.vy = -6;
}

function startRound() {
  state.playing = true;
  state.betweenRounds = false;
  state.lastSideTouched = null;
  setMessage('', false);
  players.forEach(resetPlayer);
  placeBallForServe();
}

function awardPoint(team) {
  state.scores[team] += 1;
  updateScoreboard();

  if (state.scores[team] >= MATCH_POINT) {
    state.playing = false;
    state.betweenRounds = true;
    setMessage(`${team === 'panda' ? '清大熊貓' : '交大狐狸'} 獲勝！按空白鍵再來一場！`);
    state.nextServer = team === 'panda' ? 'fox' : 'panda';
    return;
  }

  state.nextServer = team;
  state.playing = false;
  state.betweenRounds = true;
  setMessage(`${team === 'panda' ? '清大熊貓' : '交大狐狸'} 得分！按空白鍵繼續。`);
  placeBallForServe();
}

document.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
    event.preventDefault();
  }
  keyState[event.code] = true;

  if (event.code === 'Space') {
    if (state.betweenRounds) {
      if (state.scores.panda >= MATCH_POINT || state.scores.fox >= MATCH_POINT) {
        resetMatch();
      }
      startRound();
    }
  }

  players.forEach((player) => {
    if (event.code === player.controls.jump && player.onGround) {
      player.vy = -PHYSICS.jumpPower;
      player.onGround = false;
    }
  });
});

document.addEventListener('keyup', (event) => {
  keyState[event.code] = false;
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updatePlayer(player) {
  const leftPressed = !!keyState[player.controls.left];
  const rightPressed = !!keyState[player.controls.right];

  if (leftPressed) {
    player.vx -= PHYSICS.playerMoveAccel;
  }
  if (rightPressed) {
    player.vx += PHYSICS.playerMoveAccel;
  }

  if (!leftPressed && !rightPressed) {
    player.vx *= PHYSICS.playerFriction;
    if (Math.abs(player.vx) < 0.01) {
      player.vx = 0;
    }
  }

  player.vx = clamp(player.vx, -PHYSICS.playerMaxSpeed, PHYSICS.playerMaxSpeed);
  player.vy += PHYSICS.gravity;

  player.x += player.vx;
  player.y += player.vy;

  const leftBoundary = player.id === 'panda' ? 40 : COURT.width / 2 + 12;
  const rightBoundary =
    player.id === 'panda'
      ? COURT.width / 2 - player.width - 12
      : COURT.width - player.width - 40;

  if (player.x < leftBoundary) player.x = leftBoundary;
  if (player.x > rightBoundary) player.x = rightBoundary;

  if (player.y + player.height >= COURT.ground) {
    player.y = COURT.ground - player.height;
    player.vy = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  if (player.y < 120) {
    player.y = 120;
    player.vy = 0;
  }
}

function updateBall() {
  ball.vy += PHYSICS.gravity;
  ball.vx *= PHYSICS.airDrag;
  ball.vy *= PHYSICS.airDrag;

  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.vx = Math.abs(ball.vx) * 0.8;
  }

  if (ball.x + ball.radius > COURT.width) {
    ball.x = COURT.width - ball.radius;
    ball.vx = -Math.abs(ball.vx) * 0.8;
  }

  if (ball.y - ball.radius < 80) {
    ball.y = 80 + ball.radius;
    ball.vy = Math.abs(ball.vy) * 0.8;
  }

  // Net collision
  const netTop = COURT.ground - COURT.netHeight;
  if (
    ball.x + ball.radius > COURT.netX &&
    ball.x - ball.radius < COURT.netX + COURT.netWidth &&
    ball.y + ball.radius > netTop
  ) {
    if (ball.x < COURT.width / 2) {
      ball.x = COURT.netX - ball.radius;
      ball.vx = -Math.abs(ball.vx) * 0.7;
    } else {
      ball.x = COURT.netX + COURT.netWidth + ball.radius;
      ball.vx = Math.abs(ball.vx) * 0.7;
    }
    if (ball.y > netTop) {
      ball.y = netTop - ball.radius;
      ball.vy = -Math.abs(ball.vy) * 0.8;
    }
  }

  // Player collisions
  players.forEach((player) => {
    const rect = {
      left: player.x,
      top: player.y,
      right: player.x + player.width,
      bottom: player.y + player.height,
    };
    const closestX = clamp(ball.x, rect.left, rect.right);
    const closestY = clamp(ball.y, rect.top, rect.bottom);

    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    const distanceSq = dx * dx + dy * dy;

    if (distanceSq < ball.radius * ball.radius) {
      const distance = Math.sqrt(distanceSq) || 0.001;
      const nx = dx / distance;
      const ny = dy / distance;

      ball.x = closestX + nx * (ball.radius + 1);
      ball.y = closestY + ny * (ball.radius + 1);

      const relativeVelocity = ball.vx * nx + ball.vy * ny;
      const bounce = -relativeVelocity * 1.15;
      ball.vx += nx * bounce;
      ball.vy += ny * bounce;

      ball.vx = clamp(ball.vx, -12, 12);
      ball.vy = clamp(ball.vy, -12, 12);

      state.lastSideTouched = player.id;
    }
  });

  if (ball.y + ball.radius >= COURT.ground) {
    const landedOnPandaSide = ball.x < COURT.width / 2;
    ball.y = COURT.ground - ball.radius;
    ball.vy = -Math.abs(ball.vy) * PHYSICS.bounce;

    if (state.playing) {
      if (landedOnPandaSide) {
        awardPoint('fox');
      } else {
        awardPoint('panda');
      }
    }
  }
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, COURT.height);
  gradient.addColorStop(0, '#1b2a6d');
  gradient.addColorStop(0.45, '#2d3e8a');
  gradient.addColorStop(0.9, '#1b1f37');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, COURT.width, COURT.height);

  ctx.fillStyle = '#2c3a7a';
  ctx.fillRect(0, 80, COURT.width / 2, 120);
  ctx.fillStyle = '#0d47a1';
  ctx.fillRect(COURT.width / 2, 80, COURT.width / 2, 120);

  // Crowd confetti colors
  for (let i = 0; i < 50; i += 1) {
    const x = (i / 50) * COURT.width;
    ctx.fillStyle = i < 25 ? 'rgba(164, 118, 255, 0.4)' : 'rgba(0, 180, 255, 0.4)';
    ctx.fillRect(x, 80 + (i % 5) * 8, COURT.width / 50, 12);
  }

  ctx.fillStyle = '#101225';
  ctx.fillRect(0, COURT.ground, COURT.width, COURT.height - COURT.ground);

  const floorGradient = ctx.createLinearGradient(0, COURT.ground - 10, 0, COURT.height);
  floorGradient.addColorStop(0, '#d68c45');
  floorGradient.addColorStop(1, '#b76b29');
  ctx.fillStyle = floorGradient;
  ctx.fillRect(0, COURT.ground - 10, COURT.width, 90);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, COURT.ground - 1.5);
  ctx.lineTo(COURT.width, COURT.ground - 1.5);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.fillRect(COURT.netX, COURT.ground - COURT.netHeight, COURT.netWidth, COURT.netHeight);

  // Net detail lines
  ctx.strokeStyle = 'rgba(180, 200, 255, 0.5)';
  ctx.lineWidth = 1;
  for (let y = COURT.ground - COURT.netHeight; y < COURT.ground; y += 18) {
    ctx.beginPath();
    ctx.moveTo(COURT.netX, y);
    ctx.lineTo(COURT.netX + COURT.netWidth, y);
    ctx.stroke();
  }
}

function drawPlayer(player) {
  const { x, y, width, height } = player;
  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);

  if (player.id === 'panda') {
    drawPandaCharacter(width, height, player);
  } else {
    drawFoxCharacter(width, height, player);
  }

  ctx.restore();
}

function drawPandaCharacter(width, height, player) {
  ctx.save();
  ctx.translate(0, 10);

  // body
  ctx.fillStyle = '#f2f2f2';
  drawRoundedRect(-width / 2 + 8, -height / 2 + 28, width - 16, height - 48, 26);

  // arms
  ctx.fillStyle = '#f2f2f2';
  drawRoundedRect(-width / 2 + 6, -height / 2 + 48, 24, 56, 14);
  drawRoundedRect(width / 2 - 30, -height / 2 + 48, 24, 56, 14);

  // ears
  ctx.fillStyle = '#1c1c1c';
  ctx.beginPath();
  ctx.arc(-24, -height / 2 + 20, 16, 0, Math.PI * 2);
  ctx.arc(24, -height / 2 + 20, 16, 0, Math.PI * 2);
  ctx.fill();

  // head
  ctx.beginPath();
  ctx.fillStyle = '#ffffff';
  ctx.ellipse(0, -height / 2 + 40, 48, 46, 0, 0, Math.PI * 2);
  ctx.fill();

  // eye patches
  ctx.fillStyle = '#1c1c1c';
  ctx.beginPath();
  ctx.ellipse(-20, -height / 2 + 40, 16, 18, -0.2, 0, Math.PI * 2);
  ctx.ellipse(20, -height / 2 + 40, 16, 18, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // eyes
  ctx.fillStyle = '#fefefe';
  ctx.beginPath();
  ctx.arc(-18, -height / 2 + 36, 6, 0, Math.PI * 2);
  ctx.arc(18, -height / 2 + 36, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0d0d0d';
  ctx.beginPath();
  ctx.arc(-18, -height / 2 + 36, 3, 0, Math.PI * 2);
  ctx.arc(18, -height / 2 + 36, 3, 0, Math.PI * 2);
  ctx.fill();

  // nose
  ctx.fillStyle = '#1c1c1c';
  ctx.beginPath();
  ctx.arc(0, -height / 2 + 52, 6, 0, Math.PI * 2);
  ctx.fill();

  // legs
  ctx.fillStyle = '#1c1c1c';
  drawRoundedRect(-width / 2 + 16, height / 2 - 48, 28, 42, 12);
  drawRoundedRect(width / 2 - 44, height / 2 - 48, 28, 42, 12);

  ctx.restore();
}

function drawFoxCharacter(width, height, player) {
  ctx.save();
  ctx.translate(0, 10);

  // tail
  ctx.fillStyle = '#f7941d';
  ctx.beginPath();
  ctx.ellipse(width / 2 - 20, height / 2 - 40, 28, 60, Math.PI / 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe0b2';
  ctx.beginPath();
  ctx.ellipse(width / 2 - 10, height / 2 - 48, 18, 32, Math.PI / 8, 0, Math.PI * 2);
  ctx.fill();

  // body
  ctx.fillStyle = '#f7941d';
  drawRoundedRect(-width / 2 + 10, -height / 2 + 28, width - 20, height - 48, 28);

  // belly
  ctx.fillStyle = '#ffe0b2';
  drawRoundedRect(-width / 2 + 28, -height / 2 + 56, width - 56, height - 110, 20);

  // arms
  ctx.fillStyle = '#f7941d';
  drawRoundedRect(-width / 2 + 4, -height / 2 + 52, 24, 56, 14);
  drawRoundedRect(width / 2 - 28, -height / 2 + 52, 24, 56, 14);

  // ears
  ctx.fillStyle = '#f7941d';
  ctx.beginPath();
  ctx.moveTo(-34, -height / 2 + 20);
  ctx.lineTo(-8, -height / 2 + 70);
  ctx.lineTo(-52, -height / 2 + 60);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(34, -height / 2 + 20);
  ctx.lineTo(8, -height / 2 + 70);
  ctx.lineTo(52, -height / 2 + 60);
  ctx.closePath();
  ctx.fill();

  // head
  ctx.fillStyle = '#f7941d';
  ctx.beginPath();
  ctx.ellipse(0, -height / 2 + 44, 46, 42, 0, 0, Math.PI * 2);
  ctx.fill();

  // facial patch
  ctx.fillStyle = '#ffe0b2';
  ctx.beginPath();
  ctx.ellipse(0, -height / 2 + 56, 32, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  // eyes
  ctx.fillStyle = '#311b0b';
  ctx.beginPath();
  ctx.arc(-16, -height / 2 + 44, 6, 0, Math.PI * 2);
  ctx.arc(16, -height / 2 + 44, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff3e0';
  ctx.beginPath();
  ctx.arc(-16, -height / 2 + 42, 2.5, 0, Math.PI * 2);
  ctx.arc(16, -height / 2 + 42, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // nose
  ctx.fillStyle = '#311b0b';
  ctx.beginPath();
  ctx.moveTo(0, -height / 2 + 60);
  ctx.lineTo(-6, -height / 2 + 68);
  ctx.lineTo(6, -height / 2 + 68);
  ctx.closePath();
  ctx.fill();

  // legs
  ctx.fillStyle = '#311b0b';
  drawRoundedRect(-width / 2 + 20, height / 2 - 48, 28, 42, 12);
  drawRoundedRect(width / 2 - 48, height / 2 - 48, 28, 42, 12);

  ctx.restore();
}

function drawBall() {
  const gradient = ctx.createRadialGradient(ball.x - 8, ball.y - 8, 6, ball.x, ball.y, ball.radius);
  gradient.addColorStop(0, '#fff8e1');
  gradient.addColorStop(1, '#ffb347');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius - 4, 0, Math.PI * 2);
  ctx.stroke();
}

function drawRoundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

function loop() {
  state.frame += 1;
  drawBackground();

  if (state.playing) {
    players.forEach(updatePlayer);
    updateBall();
  } else {
    players.forEach((player) => {
      player.vx *= 0.9;
      player.vy = 0;
    });
  }

  players.forEach(drawPlayer);
  drawBall();

  requestAnimationFrame(loop);
}

resetMatch();
requestAnimationFrame(loop);
