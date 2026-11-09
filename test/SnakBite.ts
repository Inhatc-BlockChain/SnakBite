import { expect } from "chai";
import hre from "hardhat";

const { ethers } = await hre.network.create();

describe("SnakBite", function () {

  async function deploy() {
    const game = await ethers.deployContract("SnakBite");
    const signers = await ethers.getSigners();
    return { game, signers };
  }

  // 순위표를 [이름, 점수] 목록으로 읽기
  async function top(game: any, limit: bigint) {
    const rows = await game.getTop(limit);
    return rows.map((r: any) => [r.name, Number(r.score)]);
  }


  it("점수가 높은 순으로 정렬된다", async function () {
    const { game, signers } = await deploy();

    await (await game.connect(signers[0]).submitScore(30, "가")).wait();
    await (await game.connect(signers[1]).submitScore(90, "나")).wait();
    await (await game.connect(signers[2]).submitScore(60, "다")).wait();

    expect(await top(game, 10n))
      .to.deep.equal([["나", 90], ["다", 60], ["가", 30]]);
  });


  it("limit 명만 돌려주고, 기록이 없으면 빈 목록이다", async function () {
    const { game, signers } = await deploy();

    expect(await top(game, 10n)).to.deep.equal([]);

    for (let i = 0; i < 5; i++) {
      await (await game.connect(signers[i]).submitScore(10 + i, `p${i}`)).wait();
    }

    expect(await top(game, 2n)).to.deep.equal([["p4", 14], ["p3", 13]]);
    expect(await top(game, 0n)).to.deep.equal([]);
  });


  it("같은 점수면 먼저 달성한 사람이 앞선다", async function () {
    const { game, signers } = await deploy();

    await (await game.connect(signers[0]).submitScore(50, "먼저")).wait();
    await (await game.connect(signers[1]).submitScore(50, "나중")).wait();

    expect(await top(game, 10n)).to.deep.equal([["먼저", 50], ["나중", 50]]);
    expect(await game.rankOf(signers[0].address)).to.equal(1n);
    expect(await game.rankOf(signers[1].address)).to.equal(2n);
  });


  it("기록을 경신하면 한 줄만 남고 순위가 바뀐다", async function () {
    const { game, signers } = await deploy();

    await (await game.connect(signers[0]).submitScore(10, "가")).wait();
    await (await game.connect(signers[1]).submitScore(20, "나")).wait();
    await (await game.connect(signers[0]).submitScore(30, "새이름")).wait();

    expect(await top(game, 10n)).to.deep.equal([["새이름", 30], ["나", 20]]);
    expect(await game.playerCount()).to.equal(2n);
    expect(await game.bestScore(signers[0].address)).to.equal(30n);
    expect(await game.rankOf(signers[0].address)).to.equal(1n);
  });


  it("기록이 없으면 rankOf 는 0 이다", async function () {
    const { game, signers } = await deploy();

    expect(await game.rankOf(signers[0].address)).to.equal(0n);
  });


  it("최고 기록을 넘지 못하면 revert 된다", async function () {
    const { game } = await deploy();

    await (await game.submitScore(50, "가")).wait();

    await expect(game.submitScore(50, "가"))
      .to.be.revertedWith("not your best");
  });


  it("점수가 0 이거나 최대값을 넘으면 revert 된다", async function () {
    const { game } = await deploy();

    await expect(game.submitScore(0, "가"))
      .to.be.revertedWith("invalid score");
    await expect(game.submitScore(10000, "가"))
      .to.be.revertedWith("invalid score");

    await (await game.submitScore(9999, "가")).wait();
    expect(await game.bestScore((await ethers.getSigners())[0].address))
      .to.equal(9999n);
  });


  it("이름은 1~30바이트 (한글 10자) 이다", async function () {
    const { game } = await deploy();

    await expect(game.submitScore(10, ""))
      .to.be.revertedWith("invalid name");
    await expect(game.submitScore(10, "가나다라마바사아자차카"))
      .to.be.revertedWith("invalid name");

    await (await game.submitScore(10, "가나다라마바사아자차")).wait();
  });


  it("ScoreSubmitted 이벤트를 발생시킨다", async function () {
    const { game, signers } = await deploy();

    await expect(game.submitScore(70, "가"))
      .to.emit(game, "ScoreSubmitted")
      .withArgs(signers[0].address, "가", 70n);
  });


  it("다른 사람의 기록이 늘어나도 등록 가스는 같다", async function () {
    const { game, signers } = await deploy();

    // 처음에는 기록 1개
    await (await game.connect(signers[1]).submitScore(5, "앞사람")).wait();
    const before = await game.connect(signers[0]).submitScore.estimateGas(50, "가");

    // 다른 사람이 높은 점수, 낮은 점수로 여러 명 등록
    for (let i = 2; i < 12; i++) {
      await (await game.connect(signers[i]).submitScore(i % 2 ? 1000 + i : 1 + i, "다른사람")).wait();
    }
    const after = await game.connect(signers[0]).submitScore.estimateGas(50, "가");

    expect(after).to.equal(before);
  });

});
