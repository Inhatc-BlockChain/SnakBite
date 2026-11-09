# SnakBite: 블록체인 순위표 예제 (Hardhat 3 + ethers.js + React)

60초 동안 간식을 먹는 브라우저 게임입니다. 게임은 브라우저에서 돌아가고, 최고 기록과 순위만 컨트랙트에 저장합니다.

| 파일 | 내용 |
|---|---|
| `contracts/SnakBite.sol` | 순위표 컨트랙트 |
| `ignition/modules/SnakBite.ts` | 배포 모듈 |
| `test/SnakBite.ts` | 테스트 10개 |
| `web/src/SnackGame.jsx` | 게임 (canvas) |
| `web/src/App.jsx` | MetaMask 연결, 점수 등록, 순위표 |
| `web/src/contract.js` | ABI, chain ID 로 배포 주소 찾기 |

## 설치와 테스트
Node.js 22.13 이상이 필요합니다.
```
git clone https://github.com/Inhatc-BlockChain/SnakBite.git
cd SnakBite
npm ci
npx hardhat test
```

## 내 PC에서 실행
터미널 3개를 씁니다.
```
npx hardhat node                 # 터미널 1 (끄지 않기)
npm run deploy:local             # 터미널 2
npm run dev                      # 터미널 3 → http://localhost:5173
```
MetaMask 를 Hardhat 로컬 네트워크(RPC `http://127.0.0.1:8545`, chain ID 31337)로 바꾸고 테스트 계정을 가져옵니다.

## Sepolia 에서 실행
다른 Hardhat 프로젝트에서 keystore 에 `SEPOLIA_RPC_URL`, `SEPOLIA_PRIVATE_KEY` 를 넣었다면 다시 넣지 않아도 됩니다.
```
npm run deploy:sepolia
npm run dev                      # MetaMask 를 Sepolia 로 → http://localhost:5173
```
- **배포한 뒤에 `npm run dev` 를 시작합니다.** 배포 기록은 시작할 때 읽으므로, 다시 배포했다면 껐다가 다시 실행합니다.
- 점수 등록에 ETH 를 보내지는 않고 가스비만 듭니다. 처음 등록은 가스 약 119,000 입니다.

## 반 전체가 같은 순위표 쓰기
각자 배포하면 순위표도 각자 따로입니다. 한 사람만 Sepolia 에 배포하고, 나머지는 그 주소로 파일을 만듭니다 (PowerShell).
```
New-Item -ItemType Directory -Force ignition\deployments\chain-11155111
Set-Content ignition\deployments\chain-11155111\deployed_addresses.json '{ "SnakBiteModule#SnakBite": "0x배포한주소" }'
npm run dev
```

## 수업에서 볼 곳
- **쓰기는 저장만, 정렬은 view 에서**: `submitScore` 는 내 기록만 저장하고, 정렬은 `getTop` 에서 합니다. 쓰기에서 배열을 정렬하면 다른 사람이 먼저 등록할 때 가스량이 달라져, 가스 예상이 어긋나고 out of gas 가 날 수 있습니다 (홀짝 게임의 가스 예상 문제와 같은 원인).
- **한 사람 한 줄**: `mapping(address => Entry)` 로 플레이어마다 최고 기록 하나만 둡니다.
- **미리 실행으로 거절**: 최고 기록을 넘지 못하면 `"not your best"` 로 멈추고 거래를 보내지 않습니다.
- **React 와 ethers.js**: `BrowserProvider` → `getSigner` → `Contract`, `contract.on("ScoreSubmitted", …)` 로 다른 사람이 올린 점수를 바로 반영합니다.

## 생각해 보기
- `submitScore(9999, "해커")` 를 콘솔에서 직접 호출하면? 컨트랙트는 점수가 진짜인지 모릅니다. 막으려면 서버 서명, 게임 시작 기록과 시간 제한, 입력 기록을 다시 계산하기 같은 방법이 필요하고, 각각 비용과 신뢰 문제가 있습니다.
- 참가자가 아주 많아지면 `getTop` 은 어떻게 될까요? view 라서 가스비는 없지만 RPC 의 실행 한도에 걸릴 수 있습니다.

## 확인 환경 (2026-11-09)
Node.js 24.20 / npm 11.19 / hardhat 3.20.0 / ethers 6.17.0 / React 19.3.1 / Vite 7.3.7 / solc 0.8.28

로컬 테스트 노드와 브라우저에서 확인했습니다. MetaMask 대신 시험용 지갑 코드를 썼으므로, 수업 전에 실제 MetaMask + Sepolia 로 한 번 리허설이 필요합니다.
