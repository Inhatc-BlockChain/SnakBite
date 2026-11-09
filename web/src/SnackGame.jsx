import { useEffect, useRef, useState } from "react";

const SIZE = 16;              // 칸 수
const CELL = 26;              // 칸 크기 (px)
const GAME_SECONDS = 60;
const START_DELAY = 140;      // 한 칸 움직이는 시간 (ms)
const MIN_DELAY = 70;

const SNACKS = [
  { emoji: "🍪", points: 10, weight: 6, faster: false },
  { emoji: "🍩", points: 20, weight: 3, faster: false },
  { emoji: "🌶️", points: 30, weight: 1, faster: true }   // 점수가 크지만 빨라짐
];

// e.code 를 씀: 한글 입력 상태에서도 WASD 가 동작
const KEYS = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0]
};

function newSnack(body) {
  while (true) {
    const x = Math.floor(Math.random() * SIZE);
    const y = Math.floor(Math.random() * SIZE);
    if (body.some((p) => p.x === x && p.y === y)) continue;

    let r = Math.random() * 10;
    const kind = SNACKS.find((s) => (r -= s.weight) < 0);
    return { x, y, ...kind };
  }
}

function newGame() {
  const body = [{ x: 5, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 8 }];
  return {
    body,
    dir: [1, 0],
    nextDir: [1, 0],
    snack: newSnack(body),
    score: 0,
    delay: START_DELAY,
    endsAt: Date.now() + GAME_SECONDS * 1000
  };
}

function draw(ctx, game) {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      ctx.fillStyle = (x + y) % 2 ? "#fff3dc" : "#ffe9c4";
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${CELL - 6}px "Segoe UI Emoji", sans-serif`;
  ctx.fillText(game.snack.emoji, (game.snack.x + 0.5) * CELL, (game.snack.y + 0.5) * CELL + 1);

  game.body.slice(1).forEach((p) => {
    ctx.fillStyle = "#e8852b";
    ctx.beginPath();
    ctx.arc((p.x + 0.5) * CELL, (p.y + 0.5) * CELL, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
  });

  const head = game.body[0];
  ctx.fillText("😋", (head.x + 0.5) * CELL, (head.y + 0.5) * CELL + 1);
}

// 게임이 끝나면 onFinish(점수) 호출
export default function SnackGame({ onFinish }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  if (!gameRef.current) gameRef.current = newGame();
  const [status, setStatus] = useState("ready");   // ready, playing, over
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(GAME_SECONDS);
  const [reason, setReason] = useState("");

  useEffect(() => {
    draw(canvasRef.current.getContext("2d"), gameRef.current);
  }, []);

  useEffect(() => {
    if (status !== "playing") return;

    const onKey = (e) => {
      const dir = KEYS[e.code];
      if (!dir) return;
      e.preventDefault();    // 화살표로 페이지가 움직이지 않게
      const game = gameRef.current;
      const reverse = dir[0] === -game.dir[0] && dir[1] === -game.dir[1];
      if (!reverse) game.nextDir = dir;
    };
    window.addEventListener("keydown", onKey);

    let timer;
    const finish = (text) => {
      setReason(text);
      setStatus("over");
      onFinish(gameRef.current.score);
    };
    const step = () => {
      const game = gameRef.current;
      const remain = Math.ceil((game.endsAt - Date.now()) / 1000);
      setLeft(Math.max(remain, 0));
      if (remain <= 0) return finish("시간 종료");

      game.dir = game.nextDir;
      const head = { x: game.body[0].x + game.dir[0], y: game.body[0].y + game.dir[1] };
      const eating = head.x === game.snack.x && head.y === game.snack.y;
      const rest = eating ? game.body : game.body.slice(0, -1);   // 먹으면 꼬리가 그대로 → 한 칸 길어짐

      if (head.x < 0 || head.y < 0 || head.x >= SIZE || head.y >= SIZE) return finish("벽에 부딪혔습니다");
      if (rest.some((p) => p.x === head.x && p.y === head.y)) return finish("몸에 부딪혔습니다");

      game.body = [head, ...rest];
      if (eating) {
        game.score += game.snack.points;
        if (game.snack.faster) game.delay = Math.max(game.delay - 10, MIN_DELAY);
        game.snack = newSnack(game.body);
        setScore(game.score);
      }
      draw(canvasRef.current.getContext("2d"), game);
      timer = setTimeout(step, game.delay);
    };
    timer = setTimeout(step, gameRef.current.delay);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [status, onFinish]);

  const start = () => {
    gameRef.current = newGame();
    setScore(0);
    setLeft(GAME_SECONDS);
    setReason("");
    draw(canvasRef.current.getContext("2d"), gameRef.current);
    setStatus("playing");
  };

  return (
    <div className="game">
      <div className="hud">
        <span>점수 <b id="score">{score}</b></span>
        <span>남은 시간 <b>{left}</b>초</span>
      </div>
      <canvas ref={canvasRef} width={SIZE * CELL} height={SIZE * CELL} />
      <p className="reason">{reason}</p>
      <button onClick={start} disabled={status === "playing"}>
        {status === "ready" ? "게임 시작" : status === "playing" ? "게임 중…" : "다시 하기"}
      </button>
      <p className="help">방향키 또는 WASD · 🍪 10점 · 🍩 20점 · 🌶️ 30점 (빨라짐)</p>
    </div>
  );
}
