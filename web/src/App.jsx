import { useCallback, useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import SnackGame from "./SnackGame.jsx";
import { abi, findAddress } from "./contract.js";

const SEPOLIA_HEX = "0xaa36a7";   // 11155111
const short = (address) => `${address.slice(0, 6)}…${address.slice(-4)}`;
const nameBytes = (text) => new TextEncoder().encode(text).length;
const errorText = (e) =>
  e.code === "ACTION_REJECTED" ? "MetaMask에서 거절함" : (e.reason ?? e.shortMessage ?? e.message);

export default function App() {
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState("");
  const [ranking, setRanking] = useState([]);
  const [players, setPlayers] = useState(0);
  const [best, setBest] = useState(0);
  const [rank, setRank] = useState(0);
  const [score, setScore] = useState(0);        // 방금 끝난 게임의 점수
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const connected = useRef(false);

  // 네트워크를 바꾸면 새로 고침, 연결된 뒤 계정을 바꿔도 새로 고침
  useEffect(() => {
    window.ethereum?.on("chainChanged", () => location.reload());
    window.ethereum?.on("accountsChanged", () => { if (connected.current) location.reload(); });
  }, []);

  const refresh = useCallback(async () => {
    if (!contract) return;
    // view 함수: 거래가 아니라서 가스비 X, MetaMask 창도 뜨지 않음
    const [top, count, myBest, myRank] = await Promise.all([
      contract.getTop(10),
      contract.playerCount(),
      contract.bestScore(account),
      contract.rankOf(account)
    ]);
    setRanking(top.map((r) => ({ player: r.player, name: r.name, score: Number(r.score) })));
    setPlayers(Number(count));
    setBest(Number(myBest));
    setRank(Number(myRank));
  }, [contract, account]);

  // 처음 읽고, 누가 점수를 올리면 다시 읽기
  useEffect(() => {
    if (!contract) return;
    refresh().catch((e) => setMessage(errorText(e)));
    contract.on("ScoreSubmitted", refresh);
    return () => { contract.off("ScoreSubmitted", refresh); };
  }, [contract, refresh]);

  const connect = async () => {
    if (!window.ethereum) return setMessage("MetaMask가 설치되어 있지 않습니다");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const { chainId } = await provider.getNetwork();

      const address = findAddress(chainId);
      if (!address) {
        // 이 네트워크에는 배포 기록이 없음 → MetaMask 에 Sepolia 로 바꿔 달라고 요청
        setMessage(`chain ${chainId} 에 배포 기록이 없습니다 → MetaMask에서 Sepolia로 전환해 주세요`);
        await provider.send("wallet_switchEthereumChain", [{ chainId: SEPOLIA_HEX }]);
        return;   // 전환되면 chainChanged → 새로 고침 → 연결 버튼 다시 누르기
      }

      connected.current = true;
      setAccount(signer.address);
      setContract(new ethers.Contract(address, abi, signer));
      setMessage("");
    } catch (e) {
      setMessage(errorText(e));
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      setMessage("MetaMask에서 확인해 주세요");
      // 가스는 보내기 전에 미리 실행해서 정함 → 실패할 거래(최고 기록 아님 등)는 이유와 함께 멈춤
      const tx = await contract.submitScore(score, name.trim());
      setMessage("블록에 담기기를 기다리는 중…");
      await tx.wait();
      setMessage("순위표에 올렸습니다 🎉");
      await refresh();
    } catch (e) {
      setMessage(errorText(e));
    }
    setBusy(false);
  };

  const onFinish = useCallback((finalScore) => setScore(finalScore), []);

  const trimmed = name.trim();
  const nameOk = trimmed.length > 0 && nameBytes(trimmed) <= 30;
  const canSubmit = contract && score > best && nameOk && !busy;

  return (
    <main>
      <h1>🍪 SnakBite</h1>
      <p className="intro">60초 동안 간식을 먹고, 최고 기록을 블록체인 순위표에 올리세요.</p>

      <div className="columns">
        <SnackGame onFinish={onFinish} />

        <section className="side">
          {account
            ? <p>계정: {short(account)}</p>
            : <button onClick={connect}>MetaMask 연결</button>}

          <div className="submit">
            <p>이번 점수: <b>{score}</b>점 / 내 최고 기록: <b>{best}</b>점{rank > 0 && ` (${rank}위)`}</p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름 (한글 10자까지)"
            />
            <button onClick={submit} disabled={!canSubmit}>순위표에 올리기</button>
            {contract && score > 0 && score <= best && <p className="hint">최고 기록을 넘어야 올릴 수 있습니다</p>}
            {name && !nameOk && <p className="hint">이름이 너무 깁니다</p>}
          </div>
          <p className="status">{message}</p>

          <h2>순위표 TOP 10 <small>참가 {players}명</small></h2>
          <table>
            <thead>
              <tr><th>순위</th><th>이름</th><th>점수</th><th>주소</th></tr>
            </thead>
            <tbody>
              {ranking.map((row, i) => (
                <tr key={row.player} className={row.player === account ? "me" : ""}>
                  <td>{i + 1}</td>
                  <td>{row.name}</td>
                  <td>{row.score}</td>
                  <td>{short(row.player)}</td>
                </tr>
              ))}
              {ranking.length === 0 && (
                <tr><td colSpan="4">{contract ? "아직 기록이 없습니다" : "MetaMask를 연결하면 보입니다"}</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
