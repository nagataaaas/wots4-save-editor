---
event_id: 88
state_offset: "0x3700"

title:
  ja: 鬼怒川を追え
  en: In Pursuit of Kinugawa

faction:
  name: 真ルート
  route: >-
    [ローラ奪還](best__4_day__rescuing_laura.md)から続けて起きる。敵を全員倒すとそのまま[黒船の決闘](best__after_tournament__black_ship_battle.md)へ続く。

summary: >-
  逃げた鬼怒川を追って港へ向かい、待ち受ける敵と戦う。`0x3760` が 1 なら三姉妹ととぐろが相手で、まだらが味方につく。
  1 でなければ『暗闇脳天』のとぐろ・まだらが相手になる。

timing:
  phase: 剣術大会以降
  slot: 昼
  note: "ローラ奪還の途中で段階が 500、時間帯が昼になったあとに起きる"

location: 港

conditions:
  - flag: "0x36FF"
    serial: 87
    test: "== 4"
    meaning: ローラ奪還が成功した直後に続けて起きる（単独の発生条件はない）
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
    meaning: 真ルートを外れた（3日目夕までの場面で 2 になる。人間湯通しの恐怖から先が起きない）
    confidence: 🟢
  - flag: "0x3758"
    serial: 176
    test: "== 1"
    meaning: J.J が死んだ（運命のルーレットの成功、伯爵に刺激をで J.J を倒した。伯爵救出から先が起きない）
    confidence: 🟢

flag_changes:
  - flag: "0x3700"
    serial: 88
    value: "= 3"
    when: 港の場面が始まったとき
    meaning: 進行中
    confidence: 🟢
  - flag: 時間帯
    value: "= 0"
    when: 港の場面が始まったとき
    meaning: 昼
    confidence: 🔶
  - flag: "0x3700"
    serial: 88
    value: "= 4"
    when: 敵を全員倒し、黒船の決闘の場面が始まったとき
    meaning: イベント成功
    confidence: 🟢

sources: [A]
---

# 鬼怒川を追え（In Pursuit of Kinugawa）

## 流れ

[ローラ奪還](best__4_day__rescuing_laura.md)のあと、港へ移って `0x3700`（通し番号 88）= 3 になる。`0x3760`（通し番号 184）が 1 かどうかで相手が変わる（🟢）。

### `0x3760` が 1 のとき

1. 檻から出た三姉妹が「よくもあたいらを檻に閉じ込めてくれたね」と待ち受け、三姉妹ととぐろとの戦闘になる（1回目。時間か敵の体力で区切られる）
2. まだらが「私も手を貸すわ」と加わり、まだらと一緒に三姉妹・とぐろと戦う（2回目）。敵を全員倒すと終わる

### `0x3760` が 1 でないとき

1. とぐろ・まだらが「御大老様に逆らう者は生かしてはおけぬ」「我ら『暗闇脳天』が相手だ」と立ちふさがる
2. とぐろ・まだらとの戦闘。2人を倒すと終わる

どちらも、敵を全員倒すと[黒船の決闘](best__after_tournament__black_ship_battle.md)の場面へ移り、そこで成功（`0x3700` = 4）になる。

## 選択肢

選択肢はない（🟢）。

| 場面 | 選択肢 | 結果 |
|---|---|---|
| — | — | — |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| イベントの状態 `0x3700` | = 3 | 港の場面の始まり | 🟢 |
| イベントの状態 `0x3700` | = 4 | 敵を全員倒したあと | 🟢 |
| 時間帯 | = 0（昼） | 港の場面の始まり | 🔶 |
| 人物 | 倒した三姉妹・とぐろ・まだらは死ぬ台詞を言う。人物の状態のバイトは変わらない | 戦闘 | 🟢 |
| 所持金・勢力の友好度 | 変わらない | — | 🟢 |

失敗（`0x3700` = 5）になる場面はない（🟢）。

## 前後のイベント

- 前：[ローラ奪還](best__4_day__rescuing_laura.md)（続けて起きる）
- 次：[黒船の決闘](best__after_tournament__black_ship_battle.md)（続けて起きる）
- `0x3760` で[士魂は屈せず](best__4_day__the_fighting_spirit_never_dies.md)の流れも変わる（1 なら三姉妹は檻に閉じ込められ、ここで再び戦う。1 でなければ三姉妹は士魂は屈せずで倒される）

## 未確認のこと

- [A] は「鬼怒川・魔鱗組、処刑台で鬼怒川、魔鱗親衛隊、港でとぐろ・まだら・暗闇脳天と連戦」と書く。処刑台までの戦闘はローラ奪還の中で起きる。また『暗闇脳天』はとぐろ・まだらの組の名前で、港の敵は2人（`0x3760` が 1 なら三姉妹ととぐろ）
- ❓ `0x3760` が 1 になる場面（[士魂は屈せず](best__4_day__the_fighting_spirit_never_dies.md)の「未確認のこと」）
- ❓ 戦闘から逃げたとき、主人公が倒れたときの扱い
