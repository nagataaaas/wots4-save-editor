---
event_id: 45
state_offset: "0x36D5"

title:
  ja: 根無し草
  en: Idle Chatter

faction:
  name: 共通・無所属
  route: >-
    大老の大寄せでどの勢力のルートにも入れなかったとき（無所属）の4日目のイベント。
    これを終えると、剣術大会開催で無所属の組み合わせの剣術大会に出られる。

summary: >-
  町で町人たちが剣術大会の噂話をしている場面を見るだけのイベント。戦闘・選択肢はない。

timing:
  phase: 4日目以降（剣術大会前）
  slot: 昼
  note: ""

location: 町

conditions:
  - flag: "0x36D5"
    serial: 45
    test: "<= 0"
    meaning: このイベントをまだ見ていない
    confidence: 🟢
  - flag: "0x378D"
    serial: 229
    test: "== 1"
    meaning: 通常の周回
    confidence: 🟢
  - flag: "0x3789, 0x378A, 0x378B"
    test: "すべて == 2"
    meaning: 幕府・外国・攘夷のどのルートにも入れない（大老の大寄せの判定）
    confidence: 🟢
  - flag: 段階
    test: "== 400"
    meaning: 4日目以降（剣術大会前）
    confidence: 🟢
  - flag: 時間帯
    test: "== 0"
    meaning: 昼
    confidence: 🔶
  - flag: 現在の地域
    test: "== 町"
    meaning: 町に入る
    confidence: 🟢

failure_conditions:
  - flag: 段階
    test: "> 400"
    meaning: このイベントを見ずに剣術大会に出て、1回戦より先へ進んだ
    confidence: 🟢

flag_changes:
  - flag: "0x36D5"
    serial: 45
    value: "= 4"
    when: 場面の終わり
    meaning: イベント成功
    confidence: 🟢

sources: [A, F]
---

# 根無し草（Idle Chatter）

## 流れ

1. [大老の大寄せ](other__4_day__the_chief_ministers_big_move.md) で3勢力のルート分岐がすべて 2 になったあと、昼に町へ入ると始まる
2. 町人たちが、身分を問わず出られる剣術大会と、勝てば魔鱗組に取り立てられる話をしている場面が流れる
3. 場面が終わると `0x36D5` = 4

## 選択肢

なし。

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| `0x36D5`（通し番号 45） | 4 | 場面の終わり | 🟢 |
| 門・ルート分岐 | このイベントでは変わらない（大老の大寄せで決まっている） | | 🟢 |

## 前後のイベント

- 前：[大老の大寄せ](other__4_day__the_chief_ministers_big_move.md)（3勢力とも 2）
- 次：[剣術大会開催](other__4_day__battle_tournament_opens.md) → [剣術大会（無所属）](other__4_day__battle_tournament_independent.md)

## 未確認のこと

- [A] の条件は「どこにも所属せず4日目以降になる、または各勢力のフラグを潰す」。発生条件は3勢力のルート分岐がすべて 2 であることで、合っている
- 英語名は [F] の表の位置からの推定（[../event.md](../event.md)）。ゲーム内の英語名は Idle Chatter
- [gates](../save_format/chunks/gates/README.md) の「根無し草では4つとも 1（閉）」は、大老の大寄せの判定で3勢力とも 2 になった結果で、このイベント自体は門を変えない
- 大老の大寄せでどれかの勢力のルート分岐が 1 になっても、その勢力の4日目のイベントの場面で 2 に戻ることがあるので、開始前の失敗には書いていない（🔶）
