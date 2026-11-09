export const abi = [
  "function submitScore(uint32 score, string name)",
  "function getTop(uint256 limit) view returns (tuple(address player, string name, uint32 score, uint64 time)[])",
  "function rankOf(address player) view returns (uint256)",
  "function bestScore(address player) view returns (uint32)",
  "function playerCount() view returns (uint256)",
  "event ScoreSubmitted(address indexed player, string name, uint32 score)"
];

// Sepolia 배포 기록을 빌드할 때 읽어 옴 → 새로 배포한 뒤에는 npm run dev 를 다시 실행
const deployments = import.meta.glob(
  "../../ignition/deployments/chain-11155111/deployed_addresses.json",
  { eager: true, import: "default" }
);

// Sepolia 배포 주소 찾기, 없으면 undefined
export function findAddress() {
  return Object.values(deployments)[0]?.["SnakBiteModule#SnakBite"];
}
