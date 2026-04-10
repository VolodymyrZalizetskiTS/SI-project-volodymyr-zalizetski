// lapie glowna plansze gry z html
const board = document.querySelector("#board");
// tu pokazujemy aktualny wynik
const scoreEl = document.querySelector("#score");
// tu lecimy z rekordem
const bestScoreEl = document.querySelector("#best-score");
// to miejsce na odliczanie czasu
const timeEl = document.querySelector("#time-left");
// to jest tekst statusu (np pauza, koniec)
const statusEl = document.querySelector("#status");
// krotki komunikat dla gracza
const hintEl = document.querySelector("#hint");
// przycisk start
const startBtn = document.querySelector("#start-btn");
// przycisk reset
const resetBtn = document.querySelector("#reset-btn");
// formularz do wpisania nicku
const form = document.querySelector("#player-form");
// input z nazwa gracza
const nameInput = document.querySelector("#nickname");
// miejsce, gdzie pokazujemy nick
const nameEl = document.querySelector("#player-name");
// tu pokazujemy ostatni klikniety klawisz
const keyEl = document.querySelector("#last-key");
// tu siedzi tryb gry (gra / pauza / stop)
const modeEl = document.querySelector("#mode");

// rozmiar planszy 20x20
const GRID = 20;
// liczba wszystkich komorek
const CELLS = GRID * GRID;

// jeden obiekt na caly stan gry, zeby latwo to ogarniac
let game = {
  // segmenty weza (pierwszy to glowa)
  body: [
    // startowa glowa
    { x: 9, y: 10 },
    // startowy segment 2
    { x: 8, y: 10 },
    // startowy segment 3
    { x: 7, y: 10 },
  ],
  // aktualny kierunek ruchu
  dir: { x: 1, y: 0 },
  // aktualny wynik
  score: 0,
  // rekord sesji
  best: 0,
  // czy gra w ogole trwa
  running: false,
  // czy gra jest zapauzowana
  paused: false,
  // czas rundy (ms)
  maxTime: 90000,
  // moment startu rundy
  start: null,
  // laczny czas pauz (ms), zeby dobrze liczyc timer
  pauseDiff: 0,
  // kiedy zaczela sie ostatnia pauza
  pauseAt: null,
  // id interwalu logiki gry
  loopId: null,
  // id interwalu timera
  timerId: null,
  // predkosc weza (im mniej, tym szybciej)
  speed: 140,
};

// ustawia tekst statusu jednym wywolaniem
function setStatus(txt) {
  // podmiana tresci statusu
  statusEl.textContent = txt;
}

// krotki komunikat dla gracza (na chwile)
function say(msg) {
  // wrzucamy wiadomosc
  hintEl.textContent = msg;
  // dodajemy klase do efektu wizualnego
  hintEl.classList.add("flash");
  // po chwili wracamy do stalego tekstu podpowiedzi
  setTimeout(() => {
    // kasujemy efekt "flash"
    hintEl.classList.remove("flash");
    // przywracamy domyslny hint
    hintEl.textContent = "Strzalki steruja. Spacja przyspiesza. P pauza.";
  }, 850);
}

// zamienia wspolrzedne (x,y) na indeks jednowymiarowej tablicy komorek
function pos2idx({ x, y }) {
  // klasyczny wzor: wiersz * szerokosc + kolumna
  return y * GRID + x;
}

// losuje losowe pole planszy
function randPos() {
  // dwa niezalezne losowania: x i y
  return { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
}

// sprawdza, czy podana pozycja jest juz zajeta przez weza
function onSnake(pos) {
  // szukamy dowolnego segmentu o tych samych wspolrzednych
  return game.body.some(s => s.x === pos.x && s.y === pos.y);
}

// ustawia jablko tak, zeby nie weszlo na weza
function setFood() {
  // bierzemy losowa pozycje
  let pos = randPos();
  // jak trafilo na weza, losujemy jeszcze raz
  while (onSnake(pos)) pos = randPos();
  // zapisujemy finalna pozycje jablka
  game.food = pos;
}

// buduje cala plansze (400 przyciskow-komorek)
function buildGrid() {
  // czyå›cimy poprzednia zawartosc planszy
  board.innerHTML = "";
  // lecimy po kazdej komorce
  for (let i = 0; i < CELLS; i++) {
    // tworzymy element button
    const btn = document.createElement("button");
    // ustawiamy typ button, zeby nie zachowywal sie jak submit
    btn.type = "button";
    // dajemy klase potrzebna do stylowania
    btn.className = "grid-cell";
    // trzymamy indeks komorki w data-atribucie
    btn.dataset.index = i;
    // dorzucamy komorke do planszy
    board.appendChild(btn);
  }
  // szerokosc i wysokosc pojedynczej komorki (idealna kratka 20x20)
  const sz = `calc(100% / ${GRID})`;
  // ustawiamy style kazdej komorki
  document.querySelectorAll(".grid-cell").forEach(c => {
    // szerokosc komorki
    c.style.width = sz;
    // wysokosc komorki
    c.style.height = sz;
  });
}

// czysci klasy stanu z calej planszy przed ponownym rysowaniem
function clearCells() {
  // iterujemy po wszystkich komorkach
  document.querySelectorAll(".grid-cell").forEach(c => {
    // zdejmujemy klasy, ktore zmieniaja wyglad
    c.classList.remove("snake", "head", "food", "marked");
  });
}

// rysuje weza i jablko na planszy
function draw() {
  // najpierw czyå›cimy stare klasy
  clearCells();
  // pobieramy aktualna liste komorek
  const cells = document.querySelectorAll(".grid-cell");

  // rysowanie wszystkich segmentow weza
  game.body.forEach((s, i) => {
    // liczymy indeks komorki dla segmentu
    const cell = cells[pos2idx(s)];
    // bezpiecznik: jak komorka nie istnieje, nic nie robimy
    if (cell) {
      // segment ciala
      cell.classList.add("snake");
      // pierwszy segment to glowa
      if (i === 0) {
        // dajemy klase glowy
        cell.classList.add("head");
        // delikatny losowy efekt stylu planszy
        board.style.setProperty("--glow", Math.random().toFixed(2));
      }
    }
  });

  // liczymy komorke jablka
  const foodCell = cells[pos2idx(game.food)];
  // jesli istnieje, nadajemy klase food
  if (foodCell) foodCell.classList.add("food");
}

// aktualizuje wynik i rekord
function addScore(n) {
  // zapisujemy nowy score
  game.score = n;
  // wyswietlamy score
  scoreEl.textContent = game.score;
  // jesli pobity rekord, aktualizujemy best
  if (game.score > game.best) {
    // zapis nowego rekordu
    game.best = game.score;
    // wyswietlenie rekordu
    bestScoreEl.textContent = game.best;
  }
}

// ile czasu minelo od startu (z poprawka o pauzy)
function elapsed() {
  // jesli gra jeszcze nie ruszyla, to 0
  if (!game.start) return 0;
  // obliczenie: teraz - start - czas pauz
  return Date.now() - game.start.getTime() - game.pauseDiff;
}

// tick odliczania czasu
function tick() {
  // jak nie gramy albo jest pauza, nie robimy nic
  if (!game.running || game.paused) return;

  // ile czasu zostalo
  const left = Math.max(0, game.maxTime - elapsed());
  // pokazujemy czas w sekundach z 1 miejscem po przecinku
  timeEl.textContent = (left / 1000).toFixed(1);

  // jak czas sie skonczyl, konczymy gre
  if (left <= 0) end("Koniec czasu");
}

// restartuje glowna petle gry (np po zmianie predkosci)
function restartLoop() {
  // zatrzymujemy stary interwal
  clearInterval(game.loopId);
  // odpalamy nowy z aktualna predkoscia
  game.loopId = setInterval(step, game.speed);
}

// konczy gre i ustawia finalny stan ui
function end(why) {
  // gra juz nie trwa
  game.running = false;
  // pauza tez false, bo gra zakonczona
  game.paused = false;
  // wyswietlamy stop
  modeEl.textContent = "Stop";
  // pokazujemy powod konca
  setStatus(why);
  // czyå›cimy petle logiki
  clearInterval(game.loopId);
  // czyå›cimy petle timera
  clearInterval(game.timerId);
  // krotka wiadomosc dla gracza
  say(`Koniec. Wynik: ${game.score}`);
}

// blokuje zawracanie o 180 stopni w tej samej klatce
function opposite(d) {
  // kierunek przeciwny = oba wektory z odwrotnym znakiem
  return d.x === -game.dir.x && d.y === -game.dir.y;
}

// jeden krok symulacji gry
function step() {
  // nie ruszamy symulacji, jesli gra stoi/pauzuje
  if (!game.running || game.paused) return;

  // akceptujemy nowy kierunek tylko jesli nie jest przeciwny
  if (!opposite(game.nextDir)) {
    // przepisujemy kierunek na aktualny
    game.dir = { ...game.nextDir };
  }

  // aktualna glowa weza
  const head = game.body[0];
  // liczymy nowa pozycje glowy (z zawijaniem na krawedziach)
  const next = {
    // nowy x z modulo planszy
    x: (head.x + game.dir.x + GRID) % GRID,
    // nowy y z modulo planszy
    y: (head.y + game.dir.y + GRID) % GRID,
  };

  // sprawdzamy kolizje z cialem (bez ostatniego segmentu, bo moze "uciec")
  if (game.body.slice(0, -1).some(s => s.x === next.x && s.y === next.y)) {
    // kolizja = koniec gry
    end("Kolizja z cialem");
    // konczymy ten krok
    return;
  }

  // dodajemy nowa glowe na poczatek tablicy
  game.body.unshift(next);

  // sprawdzamy, czy nowa glowa stoi na jablku
  if (next.x === game.food.x && next.y === game.food.y) {
    // punkt za zjedzenie
    addScore(game.score + 1);
    // losujemy nowe jablko
    setFood();
    // komunikat dla gracza
    say("Mniam +1");
    // delikatnie przyspieszamy, ale nie ponizej sensownego limitu
    if (game.speed > 75) {
      // obnizamy opoznienie interwalu
      game.speed -= 2;
      // restart petli, zeby nowa predkosc od razu weszla
      restartLoop();
    }
  } else {
    // jak nie zjedlismy jablka, usuwamy ogon -> dlugosc bez zmian
    game.body.pop();
  }

  // na koniec kroku odswiezamy rysunek planszy
  draw();
}

// przywraca stan poczatkowy weza i podstawowych pol
function reset() {
  // startowy ksztalt weza
  game.body = [
    // glowa
    { x: 9, y: 10 },
    // segment 2
    { x: 8, y: 10 },
    // segment 3
    { x: 7, y: 10 },
  ];
  // kierunek startowy
  game.dir = { x: 1, y: 0 };
  // domyslna predkosc
  game.speed = 140;
  // zerujemy narastajacy czas pauz
  game.pauseDiff = 0;
  // losujemy jablko na nowo
  setFood();
}

// startuje nowa runde
function start() {
  // zerujemy stan mechaniki
  reset();
  // zerujemy wynik rundy
  addScore(0);
  // zapisujemy timestamp startu
  game.start = new Date();
  // flaga: gra dziala
  game.running = true;
  // flaga: nie ma pauzy
  game.paused = false;

  // pokazujemy pelny czas rundy
  timeEl.textContent = (game.maxTime / 1000).toFixed(1);
  // status dla usera
  setStatus("Trwa gra");
  // tryb dla usera
  modeEl.textContent = "Gra";

  // dla bezpieczenstwa zamykamy stare interwaly
  clearInterval(game.loopId);
  // dla bezpieczenstwa zamykamy stare interwaly timera
  clearInterval(game.timerId);
  // odpalamy petle logiki
  game.loopId = setInterval(step, game.speed);
  // odpalamy petle odliczania czasu
  game.timerId = setInterval(tick, 100);

  // rysujemy stan poczatkowy rundy
  draw();
}

// zatrzymuje gre i wraca do stanu "gotowy"
function stop() {
  // stop logiki
  clearInterval(game.loopId);
  // stop timera
  clearInterval(game.timerId);

  // flaga: nie gramy
  game.running = false;
  // flaga: brak pauzy
  game.paused = false;
  // pokaz status
  setStatus("Gotowy");
  // pokaz tryb
  modeEl.textContent = "Gra";
  // wyswietl pelny czas na liczniku
  timeEl.textContent = (game.maxTime / 1000).toFixed(1);

  // twardy reset mechaniki
  reset();
  // twardy reset punktow
  addScore(0);
  // odswiez plansze
  draw();
}

// przelacza pauze
function pause() {
  // jak gra nie trwa, nic nie robimy
  if (!game.running) return;

  // zmieniamy true/false na odwrotne
  game.paused = !game.paused;
  // jesli wlasnie weszlismy w pauze
  if (game.paused) {
    // zapamietujemy czas startu pauzy
    game.pauseAt = Date.now();
    // status ui
    setStatus("Pauza");
    // tryb ui
    modeEl.textContent = "Pauza";
  } else {
    // po wyjsciu z pauzy dopisujemy ile trwala
    game.pauseDiff += Date.now() - game.pauseAt;
    // status ui
    setStatus("Trwa gra");
    // tryb ui
    modeEl.textContent = "Gra";
  }
}

// klik na start odpala gre
startBtn.addEventListener("click", start);
// klik na reset zatrzymuje i resetuje
resetBtn.addEventListener("click", stop);

// obsluga formularza nicku
form.addEventListener("submit", e => {
  // blokujemy domyslne wyslanie formularza
  e.preventDefault();
  // bierzemy nick i obcinamy spacje z bokow
  const nm = nameInput.value.trim();
  // jesli pusty, to "anon"
  nameEl.textContent = nm || "Anon";
  // komunikat, ze sie udalo
  say("Nick zapisany");
});

// klik planszy ustawia jablko w kliknietym miejscu
board.addEventListener("click", e => {
  // bierzemy najblizsza komorke pod kursorem
  const cell = e.target.closest(".grid-cell");
  // czytamy indeks kliknietej komorki
  const idx = Number(cell.dataset.index);
  // zamieniamy indeks na (x,y) i ustawiamy jablko
  game.food = { x: idx % GRID, y: Math.floor(idx / GRID) };
  // odswiezamy plansze
  draw();
  // dajemy feedback graczowi
  say("Klik ustawil nowe jedzenie");
});

// reakcja na klawisze sterujace
window.addEventListener("keydown", e => {
  // blokujemy przewijanie strony strzalkami/spacja
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
    e.preventDefault();
  }

  // zmiana kierunku albo turbo
  switch (e.key) {
    // gora
    case "ArrowUp": game.nextDir = { x: 0, y: -1 }; break;
    // dol
    case "ArrowDown": game.nextDir = { x: 0, y: 1 }; break;
    // lewo
    case "ArrowLeft": game.nextDir = { x: -1, y: 0 }; break;
    // prawo
    case "ArrowRight": game.nextDir = { x: 1, y: 0 }; break;
    // spacja = chwilowe turbo
    case " ":
      // turbo dziala tylko jak faktycznie gramy
      if (game.running && !game.paused) {
        // minimalna wartosc to 55ms
        game.speed = Math.max(55, game.speed - 8);
        // od razu restart petli z nowa predkoscia
        restartLoop();
        // krotki komunikat
        say("Turbo");
      }
      break;
  }

  // wyswietlamy ostatni klawisz
  keyEl.textContent = e.key;
});

// "p" przelacza pauze
window.addEventListener("keypress", e => {
  // sprawdzamy male litery, zeby "p" i "p" dzialalo tak samo
  if (e.key.toLowerCase() === "p") {
    // zmiana stanu pauzy
    pause();
    // komunikat zalezny od aktualnego stanu
    say(game.paused ? "Pauza" : "Wznowiono");
  }
});

// przy zmianie rozmiaru okna pilnujemy prostego transformu
window.addEventListener("resize", () => {
  // narzucamy brak transformacji 3d
  board.style.transform = "none";
});

// przy scrollu delikatnie ruszamy cieniem planszy
window.addEventListener("scroll", () => {
  // wyliczamy lekki offset cienia zalezny od scrolla
  const d = Math.min(8, window.scrollY / 80);
  // ustawiamy nowy box-shadow przez style inline
  board.style.boxShadow = `inset 0 0 0 1px #c6d1b9, 0 ${2 + d}px 10px rgba(44, 62, 40, 0.12)`;
});

// tworzymy plansze po zaladowaniu skryptu
buildGrid();
// ustawiamy stan startowy gry
stop();
