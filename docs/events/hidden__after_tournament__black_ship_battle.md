---
event_id: 89
state_offset: "0x3701"

title:
  ja: 黒船の決闘
  en: Black Ship Battle

faction:
  name: 隠しルート
  route: >-
    [鬼怒川を追え](hidden__after_tournament__in_pursuit_of_kinugawa.md)から続けて起きる、隠しルート最後の戦闘。
    成功するとそのまま結末の[希望の光](hidden__ending__the_light_of_hope.md)へ続く。

summary: >-
  鬼怒川に黒船を奪われ、主人公は単身で黒船に乗り込んで鬼怒川と1対1で戦う。倒された鬼怒川は「私の勝ちだ」と言い残し、
  港の仲間たちが黒船と主人公の姿を見て「武士の中の武士だ」とたたえる。

timing:
  phase: 剣術大会以降
  slot: 昼
  note: "港の場面は昼。黒船に乗り込むと段階が 510、時間帯が夕になる"

location: 港 → 黒船の上

conditions:
  - flag: "0x3700"
    serial: 88
    test: "== 4"
    meaning: 鬼怒川を追えの敵を全員倒した直後に続けて起きる（単独の発生条件はない）
    confidence: 🔶
  - flag: 段階
    test: "== 500"
    meaning: 剣術大会以降
    confidence: 🟢
  - flag: 時間帯
    test: "== 0"
    meaning: 昼
    confidence: 🟢
  - flag: 現在の地域
    test: "== 39"
    meaning: 港
    confidence: 🟢

failure_conditions:
  - flag: "0x378E"
    serial: 230
    test: "== 2"
    meaning: 隠しルートを外れた（3日目夕までの場面で 2 になる。人間湯通しの恐怖から先が起きない）
    confidence: 🟢
  - flag: "0x3758"
    serial: 176
    test: "== 1"
    meaning: J.J が死んだ（運命のルーレットの成功、伯爵に刺激をで J.J を倒した。伯爵救出から先が起きない）
    confidence: 🟢

flag_changes:
  - flag: "0x3700"
    serial: 88
    value: "= 4"
    when: 港の場面が始まったとき
    meaning: 鬼怒川を追えの成功
    confidence: 🟢
  - flag: "0x3701"
    serial: 89
    value: "= 3"
    when: 港の場面が終わり、黒船へ移るとき
    meaning: 進行中
    confidence: 🟢
  - flag: 段階
    value: "= 510"
    when: 黒船の上の場面
    meaning: 剣術大会以降（510）に進む
    confidence: 🟢
  - flag: 時間帯
    value: "= 1"
    when: 黒船の上の場面
    meaning: 夕
    confidence: 🔶
  - flag: "0x3701"
    serial: 89
    value: "= 4"
    when: 鬼怒川を倒したあとの場面
    meaning: イベント成功
    confidence: 🟢

sources: [A]
---

# 黒船の決闘（Black Ship Battle）

## 流れ

1. 港で、鬼怒川の姿が見えないと思ったところで黒船を奪われたことに気づく（「しまった 黒船を奪われたぞ」）。仲間たちが援護し、主人公は黒船へ向かう。ここで[鬼怒川を追え](hidden__after_tournament__in_pursuit_of_kinugawa.md)が成功（`0x3700`（通し番号 88）= 4）になる
2. `0x3701`（通し番号 89）= 3 になり、黒船の上の場面へ移る。段階が 510、時間帯が夕になる
3. 鬼怒川が「どこまで私の邪魔をすれば気が済むのやら」「さぁ 来なさい」と迎え、鬼怒川と1対1で戦う
4. 鬼怒川を倒すと、鬼怒川は「まだだ……」と立ち上がろうとしたあと、「私の勝ちだ」「秩序と規律の体制を守ったのです」と言い残す
5. 成功（`0x3701` = 4）。港の仲間たちが黒船を見て「もとより覚悟の上だったか」「あいつこそ武士の中の武士だ」と言い、結末の[希望の光](hidden__ending__the_light_of_hope.md)へ移る

## 選択肢

選択肢はない（🟢）。

| 場面 | 選択肢 | 結果 |
|---|---|---|
| — | — | — |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| イベントの状態 `0x3700` | = 4 | 港の場面の始まり | 🟢 |
| イベントの状態 `0x3701` | = 3 | 黒船へ移るとき | 🟢 |
| 段階 | = 510 | 黒船の上の場面 | 🟢 |
| 時間帯 | = 1（夕） | 黒船の上の場面 | 🔶 |
| イベントの状態 `0x3701` | = 4 | 鬼怒川を倒したあと | 🟢 |
| 人物 | 鬼怒川の状態（`0x3756`）は変わらない | — | 🟢 |
| 所持金・勢力の友好度 | 変わらない | — | 🟢 |

失敗（`0x3701` = 5）になる場面はない（🟢）。

## 前後のイベント

- 前：[鬼怒川を追え](hidden__after_tournament__in_pursuit_of_kinugawa.md)（続けて起きる）
- 次：[希望の光](hidden__ending__the_light_of_hope.md)（結末。続けて起きる）

## 未確認のこと

- ❓ 港の場面で、主人公が武器を持っていないときに別の小道具を使う分岐がある（「貸せ」）。内容は分からない
- ❓ 鬼怒川との戦闘の前に、手持ちの道具の数が変わる処理がある（回復の道具を使えなくするなど）。内容は分からない
- 🔶 鬼怒川の「私の勝ちだ」のあと、黒船と主人公がどうなるか（結末の語りでは主人公は「希望の光」として語られる）
- ❓ 選択肢はないが、場面の始まりに位置の分からない値が 5 になる。意味は分からない
