---
event_id: 47
state_offset: "0x36D7"

title:
  ja: 剣術大会（幕府）
  en: Battle Tournament (Shogunate)

faction:
  name: 幕府
  route: >-
    [公儀の剣](shogunate__4_day__imperial_sword.md) に協力した（`0x36D2` が 4）ときの剣術大会の記録。
    [剣術大会開催](other__4_day__battle_tournament_opens.md) で 3 になり、3回戦に勝つと 4 で [覇者となる](other__4_day__we_are_the_champions.md)、負けると 5 で [最後通告](other__ending__final_warning.md) に進む。

summary: >-
  幕府側として出場した剣術大会の結果。チャートに名前の出ない記録で、対戦相手は 細川 → 巣鴨 → まだら／とぐろ。
  3回戦の相手は朱美（`0x3750`）の状態で決まる。

timing:
  phase: 4日目以降（剣術大会）
  slot: 昼
  note: "剣術大会開催の続き。2回戦のあとに時間帯が夕になる（🔶）"

location: 剣術大会会場

conditions:
  - flag: "0x36D2"
    serial: 42
    test: "== 4"
    meaning: 公儀の剣に協力した。4 のとき、ほかの勢力より優先してこのイベントになる
    confidence: 🟢
  - flag: "0x36D6"
    serial: 46
    test: "== 4"
    meaning: 剣術大会開催の会場の場面を見た（同じ場面で 4 になったあと、このイベントが 3 になる）
    confidence: 🟢

failure_conditions:
  - flag: "0x36D2"
    serial: 42
    test: "== 5"
    meaning: 公儀の剣で琴吹に斬りかかって失敗した（幕府ルート分岐も 2 になり、公儀の剣に協力できない）
    confidence: 🟢
  - flag: "0x3789"
    serial: 225
    test: "== 2"
    meaning: 幕府ルートが閉じ、公儀の剣を起こせない（大寄せで入れないと決まった、または東国の騎士・志士の刀を引き受けた）
    confidence: 🟢

flag_changes:
  - flag: "0x36D7"
    serial: 47
    value: "= 3"
    when: 剣術大会開催の会場の場面のあと、1回戦の前
    meaning: 幕府側として出場
    confidence: 🟢
  - flag: "0x37AB"
    value: "= 1 / 2 / 3"
    when: 1・2・3回戦に勝ったとき
    meaning: 勝ち抜いた試合数（4勢力で共通）
    confidence: 🟢
  - flag: "0x36D7"
    serial: 47
    value: "= 5"
    when: 1〜3回戦のどれかで負けたとき（降参を含む）
    meaning: 敗退。最後通告へ進む
    confidence: 🟢
  - flag: "0x36D7"
    serial: 47
    value: "= 4"
    when: 3回戦（まだら・とぐろ）に勝ったとき。斬っても峰打ちでも同じ
    meaning: 優勝
    confidence: 🟢
  - flag: "0x37F7"
    value: "= 1"
    when: 3回戦でまだらに勝ったとき
    meaning: まだらに勝った（無所属のときもまだらに勝つと 1 になる）
    confidence: 🟢 値と場面 ／ 🔶 意味

sources: [A]
---

# 剣術大会（幕府）（Battle Tournament (Shogunate)）

## 流れ

1. [剣術大会開催](other__4_day__battle_tournament_opens.md) の会場の場面のあと、公儀の剣（`0x36D2`）が 4 なら `0x36D7`（通し番号 47）が 3 になり、幕府側の対戦表で始まる（🟢）。公儀の剣は東国の騎士・志士の刀・根無し草より優先される
2. 1回戦：般若党選抜の細川
3. 2回戦：老剣士の巣鴨。勝つと幕間の場面に移り、時間帯が夕になる（🔶）
4. 3回戦：朱美（`0x3750`）が 0 なら暗闇脳天のまだら、0 以外なら暗闇脳天のとぐろ（🟢）
5. 結末
   - 3回戦に勝つ：`0x36D7` = 4。表彰式（[覇者となる](other__4_day__we_are_the_champions.md)）へ
   - どの試合でも、負ける・降参する：`0x36D7` = 5。[最後通告](other__ending__final_warning.md) へ

各試合の終わり方は3通りある（🟢）。相手を斬って勝つ、峰打ちで勝つ（相手が「まだ生きてる」と言う場面になる）、負ける。どれがどの終わり方かは台詞からの判断（🔶）。

## 選択肢

試合中に相手に話しかけると、次の3つから選べる。

| 場面 | 選択肢 | 結果 |
|---|---|---|
| 1回戦（細川）・3回戦（まだら） | 「かかって来い！」「降参する」「勝負あったな」 | 「降参する」で負けになるとみられる（🔶）。ほかの2つの効果は ❓ |
| 2回戦（巣鴨） | 「待て！」「降参する」「勝負あったな」 | 同上 |
| 3回戦（とぐろ） | 「待った！」「降参する」「…勝負はついた」 | 同上 |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| `0x36D7`（通し番号 47） | = 3 | 大会の開始 | 🟢 |
| `0x37AB`（勝ち抜いた試合数） | = 1 → 2 → 3 | 各試合に勝ったとき | 🟢 |
| `0x36D7` | = 4 | 3回戦に勝つ | 🟢 |
| `0x36D7` | = 5 | どの試合でも負ける | 🟢 |
| `0x37F7` | = 1 | 3回戦でまだらに勝つ（斬っても峰打ちでも） | 🟢 |
| 時間帯 | 夕 | 2回戦のあとの幕間 | 🔶 |

## 前後のイベント

- 前：[公儀の剣](shogunate__4_day__imperial_sword.md) → [剣術大会開催](other__4_day__battle_tournament_opens.md)
- 次：[覇者となる](other__4_day__we_are_the_champions.md)（優勝）／[最後通告](other__ending__final_warning.md)（敗退）
- 優勝後：表彰台に上ると [釜茹で侍](other__ending__boiled_samurai.md)、辞退すると [闇黒の意志](shogunate__after_tournament__a_dark_will.md) へ [A]

## 未確認のこと

- 🔶 試合の3通りの終わり方（斬る・峰打ち・負け）の対応は台詞からの判断。負けにはもう1通りの判定があり、降参と相手に倒されるのどちらがどれかは ❓
- ❓ 「かかって来い！」「勝負あったな」などの選択肢の効果
- 🔶 まだらは朱美と同じ人物とみられる（朱美が 0 のときだけ出場する）
- ❓ `0x37F7` が 1 のとき、のちのイベントに何が起きるか
- 🔶 峰打ちで勝ったあとの場面で、段階（`0x0010` か）が 410（1回戦）・420（2回戦）になる。斬って勝ったときには変わらない
