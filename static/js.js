const board = document.querySelector("#board");
const scoreEl = document.querySelector("#score");
const bestScoreEl = document.querySelector("#best-score");
const timeEl = document.querySelector("#time-left");
const statusEl = document.querySelector("#status");
const hintEl = document.querySelector("#hint");
const startBtn = document.querySelector("#start-btn");
const resetBtn = document.querySelector("#reset-btn");
const form = document.querySelector("#player-form");
const nameInput = document.querySelector("#nickname");
const nameEl = document.querySelector("#player-name");
const keyEl = document.querySelector("#last-key");
const modeEl = document.querySelector("#mode");

const GRID = 20;
const CELLS = GRID * GRID;

let game = {
  body: [
    { x: 9, y: 10 },
    { x: 8, y: 10 },
    { x: 7, y: 10 },
  ],
  dir: { x: 1, y: 0 },
  nextDir: { x: 1, y: 0 },
  food: { x: 14, y: 10 },
  score: 0,
  best: 0,
  running: false,
  paused: false,
  maxTime: 90000,
  start: null,
  pauseDiff: 0,
  pauseAt: null,
  loopId: null,
  timerId: null,
  speed: 140,
};

function setStatus(txt) {
  statusEl.textContent = txt;
}

function say(msg) {
  hintEl.textContent = msg;
  hintEl.classList.add("flash");
  setTimeout(() => {
    hintEl.classList.remove("flash");
    hintEl.textContent = "Strzalki steruja. Spacja przyspiesza. P pauza.";
  }, 850);
}

function pos2idx({ x, y }) {
  return y * GRID + x;
}

function randPos() {
  return { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
}

function onSnake(pos) {
  return game.body.some(s => s.x === pos.x && s.y === pos.y);
}

function setFood() {
  let pos = randPos();
  while (onSnake(pos)) pos = randPos();
  game.food = pos;
}

function buildGrid() {
  board.innerHTML = "";
  for (let i = 0; i < CELLS; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "grid-cell";
    btn.dataset.index = i;
    board.appendChild(btn);
  }
  const sz = `calc(100% / ${GRID})`;
  document.querySelectorAll(".grid-cell").forEach(c => {
    c.style.width = sz;
    c.style.height = sz;
  });
}

function clearCells() {
  document.querySelectorAll(".grid-cell").forEach(c => {
    c.classList.remove("snake", "head", "food", "marked");
  });
}

function draw() {
  clearCells();
  const cells = document.querySelectorAll(".grid-cell");
  
  game.body.forEach((s, i) => {
    const cell = cells[pos2idx(s)];
    if (cell) {
      cell.classList.add("snake");
      if (i === 0) {
        cell.classList.add("head");
        board.style.setProperty("--glow", Math.random().toFixed(2));
      }
    }
  });
  
  const foodCell = cells[pos2idx(game.food)];
  if (foodCell) foodCell.classList.add("food");
}

function addScore(n) {
  game.score = n;
  scoreEl.textContent = game.score;
  if (game.score > game.best) {
    game.best = game.score;
    bestScoreEl.textContent = game.best;
  }
}

function elapsed() {
  if (!game.start) return 0;
  return Date.now() - game.start.getTime() - game.pauseDiff;
}

function tick() {
  if (!game.running || game.paused) return;
  
  const left = Math.max(0, game.maxTime - elapsed());
  timeEl.textContent = (left / 1000).toFixed(1);
  
  if (left <= 0) end("Koniec czasu");
}

function restartLoop() {
  clearInterval(game.loopId);
  game.loopId = setInterval(step, game.speed);
}

function end(why) {
  game.running = false;
  game.paused = false;
  modeEl.textContent = "Stop";
  setStatus(why);
  clearInterval(game.loopId);
  clearInterval(game.timerId);
  say(`Koniec. Wynik: ${game.score}`);
}

function opposite(d) {
  return d.x === -game.dir.x && d.y === -game.dir.y;
}

function step() {
  if (!game.running || game.paused) return;

  if (!opposite(game.nextDir)) {
    game.dir = { ...game.nextDir };
  }

  const head = game.body[0];
  const next = {
    x: (head.x + game.dir.x + GRID) % GRID,
    y: (head.y + game.dir.y + GRID) % GRID,
  };

  if (game.body.slice(0, -1).some(s => s.x === next.x && s.y === next.y)) {
    end("Kolizja z cialem");
    return;
  }

  game.body.unshift(next);

  if (next.x === game.food.x && next.y === game.food.y) {
    addScore(game.score + 1);
    setFood();
    say("Mniam +1");
    if (game.speed > 75) {
      game.speed -= 2;
      restartLoop();
    }
  } else {
    game.body.pop();
  }

  draw();
}

function reset() {
  game.body = [
    { x: 9, y: 10 },
    { x: 8, y: 10 },
    { x: 7, y: 10 },
  ];
  game.dir = { x: 1, y: 0 };
  game.nextDir = { x: 1, y: 0 };
  game.speed = 140;
  game.pauseDiff = 0;
  setFood();
}

function start() {
  reset();
  addScore(0);
  game.start = new Date();
  game.running = true;
  game.paused = false;
  
  timeEl.textContent = (game.maxTime / 1000).toFixed(1);
  setStatus("Trwa gra");
  modeEl.textContent = "Gra";
  
  clearInterval(game.loopId);
  clearInterval(game.timerId);
  game.loopId = setInterval(step, game.speed);
  game.timerId = setInterval(tick, 100);
  
  draw();
}

function stop() {
  clearInterval(game.loopId);
  clearInterval(game.timerId);
  
  game.running = false;
  game.paused = false;
  setStatus("Gotowy");
  modeEl.textContent = "Gra";
  timeEl.textContent = (game.maxTime / 1000).toFixed(1);
  
  reset();
  addScore(0);
  draw();
}

function pause() {
  if (!game.running) return;
  
  game.paused = !game.paused;
  if (game.paused) {
    game.pauseAt = Date.now();
    setStatus("Pauza");
    modeEl.textContent = "Pauza";
  } else {
    game.pauseDiff += Date.now() - game.pauseAt;
    setStatus("Trwa gra");
    modeEl.textContent = "Gra";
  }
}

startBtn.addEventListener("click", start);
resetBtn.addEventListener("click", stop);

form.addEventListener("submit", e => {
  e.preventDefault();
  const nm = nameInput.value.trim();
  nameEl.textContent = nm || "Anon";
  say("Nick zapisany");
});

board.addEventListener("click", e => {
  const cell = e.target.closest(".grid-cell");
  if (!cell) return;
  
  document.querySelectorAll(".grid-cell").forEach(c => c.classList.remove("marked"));
  cell.classList.add("marked");
  
  const idx = Number(cell.dataset.index);
  game.food = { x: idx % GRID, y: Math.floor(idx / GRID) };
  draw();
  say("Klik ustawil nowe jedzenie");
});

window.addEventListener("keydown", e => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
    e.preventDefault();
  }
  
  switch (e.key) {
    case "ArrowUp": game.nextDir = { x: 0, y: -1 }; break;
    case "ArrowDown": game.nextDir = { x: 0, y: 1 }; break;
    case "ArrowLeft": game.nextDir = { x: -1, y: 0 }; break;
    case "ArrowRight": game.nextDir = { x: 1, y: 0 }; break;
    case " ":
      if (game.running && !game.paused) {
        game.speed = Math.max(55, game.speed - 8);
        restartLoop();
        say("Turbo");
      }
      break;
  }
  
  keyEl.textContent = e.key;
});

window.addEventListener("keypress", e => {
  if (e.key.toLowerCase() === "p") {
    pause();
    say(game.paused ? "Pauza" : "Wznowiono");
  }
});

window.addEventListener("resize", () => {
  board.style.transform = "none";
});

window.addEventListener("scroll", () => {
  const d = Math.min(8, window.scrollY / 80);
  board.style.boxShadow = `inset 0 0 0 1px #c6d1b9, 0 ${2 + d}px 10px rgba(44, 62, 40, 0.12)`;
});

buildGrid();
stop();
