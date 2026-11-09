// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// SnakBite 순위표: 플레이어마다 최고 기록 1개만 저장
// 쓰기(submitScore)는 저장만 하고, 정렬은 읽기(getTop)에서 함
// → 다른 사람이 먼저 올려도 가스량이 달라지지 않음 (가스 예상이 맞음), 정렬 비용은 view 라서 가스비 X
contract SnakBite {
    uint32 public constant MAX_SCORE = 9999;
    uint256 public constant MAX_NAME_BYTES = 30;   // 한글 10자

    struct Entry {
        address player;
        string name;
        uint32 score;
        uint64 time;
    }

    mapping(address => Entry) private records;
    address[] public players;

    event ScoreSubmitted(address indexed player, string name, uint32 score);

    // 점수는 브라우저가 보내는 값을 그대로 믿음 → 조작할 수 있음 (생각해 보기)
    function submitScore(uint32 score, string calldata name) external {
        require(score > 0 && score <= MAX_SCORE, "invalid score");
        require(bytes(name).length > 0 && bytes(name).length <= MAX_NAME_BYTES, "invalid name");

        Entry storage record = records[msg.sender];
        require(score > record.score, "not your best");

        if (record.player == address(0)) {
            record.player = msg.sender;
            players.push(msg.sender);
        }
        record.name = name;
        record.score = score;
        record.time = uint64(block.timestamp);

        emit ScoreSubmitted(msg.sender, name, score);
    }

    // 상위 limit 명: 점수가 높은 순, 같은 점수면 먼저 달성한 순
    function getTop(uint256 limit) external view returns (Entry[] memory) {
        uint256 size = limit < players.length ? limit : players.length;
        Entry[] memory top = new Entry[](size);
        if (size == 0) return top;

        uint256 filled = 0;
        for (uint256 i = 0; i < players.length; i++) {
            Entry memory current = records[players[i]];
            if (filled == size && !isAhead(current, top[size - 1])) continue;

            uint256 j = filled < size ? filled++ : size - 1;
            while (j > 0 && isAhead(current, top[j - 1])) {
                top[j] = top[j - 1];
                j--;
            }
            top[j] = current;
        }
        return top;
    }

    // 전체 순위 (1위부터), 기록이 없으면 0
    function rankOf(address player) external view returns (uint256) {
        Entry memory mine = records[player];
        if (mine.player == address(0)) return 0;

        uint256 rank = 1;
        for (uint256 i = 0; i < players.length; i++) {
            if (players[i] != player && isAhead(records[players[i]], mine)) rank++;
        }
        return rank;
    }

    function bestScore(address player) external view returns (uint32) {
        return records[player].score;
    }

    function playerCount() external view returns (uint256) {
        return players.length;
    }

    function isAhead(Entry memory a, Entry memory b) private pure returns (bool) {
        return a.score > b.score || (a.score == b.score && a.time < b.time);
    }
}
