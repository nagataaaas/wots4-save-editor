---
event_id: 49
state_offset: "0x36D9"

title:
  ja: 剣術大会（攘夷）
  en: Battle Tournament (Prajnas)

faction:
  name: 攘夷（般若党）
  route: >-
    [志士の刀](prajna__4_day__blades_of_the_patriots.md) に協力した（`0x36D4` が 4）ときの剣術大会の記録。
    [剣術大会開催](other__4_day__battle_tournament_opens.md) で 3 になり、3回戦に勝つと 4 で [覇者となる](other__4_day__we_are_the_champions.md)、負けると 5 で [最後通告](other__ending__final_warning.md) に進む。

summary: >-
  攘夷側として出場した剣術大会の結果。チャートに名前の出ない記録で、対戦相手は 嘉門夫作 → チャールズ → メリンダ／斉藤一二三。
  3回戦の相手はメリンダの状態で決まる。メリンダに峰打ちで勝つとメリンダの峰打ちの点数が +5。

summary_en: >-
  The result of the Battle Tournament when you enter on the Prajnas' side. A record whose name does not appear on the chart; the opponents are Fusaku Kamon, then Charles, then Melinda / Hifumi Saitou.
  The third-round opponent depends on Melinda's state. Beating Melinda with the back of your blade adds 5 to her back-of-the-blade count.

timing:
  phase: 4日目以降（剣術大会）
  slot: 昼
  note: "剣術大会開催の続き。2回戦のあとに時間帯が夕になる（🔶）"

location: 剣術大会会場

conditions:
  - flag: "0x36D2"
    serial: 42
    test: "!= 4"
    meaning: 公儀の剣に協力していない（4 なら幕府側が優先される）
    confidence: 🟢
  - flag: "0x36D3"
    serial: 43
    test: "!= 4"
    meaning: 東国の騎士に協力していない（4 なら外国側が優先される）
    confidence: 🟢
  - flag: "0x36D4"
    serial: 44
    test: "== 4"
    meaning: 志士の刀に協力した
    confidence: 🟢
  - flag: "0x36D6"
    serial: 46
    test: "== 4"
    meaning: 剣術大会開催の会場の場面を見た
    confidence: 🟢

failure_conditions:
  - flag: "0x36D4"
    serial: 44
    test: "== 5"
    meaning: 志士の刀で戦闘になった（赤城たちに斬りかかる、「誰でもいいから殺したい…」を選ぶ）
    confidence: 🟢
  - flag: "0x378B"
    serial: 227
    test: "== 2"
    meaning: 志士の刀の前に攘夷のルートに入れなくなった（大寄せで攘夷の友好度が 3 に足りなかったとき、公儀の剣・東国の騎士を引き受けたとき。志士の刀が起きない）
    confidence: 🟢

flag_changes:
  - flag: "0x36D9"
    serial: 49
    value: "= 3"
    when: 剣術大会開催の会場の場面のあと、1回戦の前
    meaning: 攘夷側として出場
    confidence: 🟢
  - flag: "0x37AB"
    value: "= 1 / 2 / 3"
    when: 1・2・3回戦に勝ったとき
    meaning: 勝ち抜いた試合数（4勢力で共通）
    confidence: 🟢
  - flag: "0x36D9"
    serial: 49
    value: "= 5"
    when: 1〜3回戦のどれかで負けたとき
    meaning: 敗退。最後通告へ進む
    confidence: 🟢
  - flag: "0x36D9"
    serial: 49
    value: "= 4"
    when: 3回戦（メリンダ・斉藤一二三）に勝ったとき。斬っても峰打ちでも同じ
    meaning: 優勝
    confidence: 🟢
  - flag: "0x37F8"
    value: "= 1"
    when: 3回戦でメリンダに勝ったとき（斬っても峰打ちでも）
    meaning: メリンダに勝った
    confidence: 🟢 値と場面 ／ 🔶 意味
  - flag: "0x3797"
    value: "+ 5"
    when: 3回戦でメリンダに峰打ちで勝ったとき
    meaning: メリンダの峰打ちの点数
    confidence: 🟢 値 ／ 🔶 峰打ちの場面であること

sources: [A]
---

# 剣術大会（攘夷）（Battle Tournament (Prajnas)）

## 流れ

1. [剣術大会開催](other__4_day__battle_tournament_opens.md) の会場の場面のあと、公儀の剣（`0x36D2`）・東国の騎士（`0x36D3`）がどちらも 4 でなく、志士の刀（`0x36D4`）が 4 なら `0x36D9`（通し番号 49）が 3 になり、攘夷側の対戦表で始まる（🟢）
2. 1回戦：貧乏浪人の嘉門夫作
3. 2回戦：英国紳士のチャールズ。勝つと幕間の場面に移り、時間帯が夕になる（🔶）
4. 3回戦：メリンダ（`0x3759`）が 0 ならメリンダ、0 以外なら魔鱗組三番隊隊長の斉藤一二三（🟢）
5. 結末
   - 3回戦に勝つ：`0x36D9` = 4。表彰式（[覇者となる](other__4_day__we_are_the_champions.md)）へ
   - どの試合でも、負ける・降参する：`0x36D9` = 5。[最後通告](other__ending__final_warning.md) へ

各試合の終わり方は3通りある（🟢）。相手を斬って勝つ、峰打ちで勝つ、負ける。どれがどの終わり方かは台詞からの判断（🔶）。

## 選択肢

試合中に相手に話しかけると、次の3つから選べる。

| 場面 | 選択肢 | 結果 |
|---|---|---|
| 1回戦（嘉門夫作） | 「待て！」「降参する」「勝負あったな」 | 「降参する」で負けになるとみられる（🔶）。ほかの2つの効果は ❓ |
| 2回戦（チャールズ） | 「こっちに来い！」「降参する」「勝負あったな」 | 同上 |
| 3回戦（メリンダ） | 「待った！」「降参する」「勝負あったな」 | 同上 |
| 3回戦（斉藤一二三） | 「待った！」「降参する」「…勝負はついた」 | 同上 |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| `0x36D9`（通し番号 49） | = 3 | 大会の開始 | 🟢 |
| `0x37AB`（勝ち抜いた試合数） | = 1 → 2 → 3 | 各試合に勝ったとき | 🟢 |
| `0x36D9` | = 4 | 3回戦に勝つ | 🟢 |
| `0x36D9` | = 5 | どの試合でも負ける | 🟢 |
| `0x37F8` | = 1 | 3回戦でメリンダに勝つ（斬っても峰打ちでも） | 🟢 |
| メリンダの峰打ちの点数（`0x3797`） | +5 | 3回戦でメリンダに峰打ちで勝つ | 🟢 値 ／ 🔶 場面 |
| 時間帯 | 夕 | 2回戦のあとの幕間 | 🔶 |

## 前後のイベント

- 前：[志士の刀](prajna__4_day__blades_of_the_patriots.md) → [剣術大会開催](other__4_day__battle_tournament_opens.md)
- 次：[覇者となる](other__4_day__we_are_the_champions.md)（優勝）／[最後通告](other__ending__final_warning.md)（敗退）
- 優勝後：表彰台に上ると [釜茹で侍](other__ending__boiled_samurai.md)、辞退すると [臆病風](prajna__after_tournament__loss_of_nerve.md) へ [A]

## 未確認のこと

- 🔶 試合の3通りの終わり方（斬る・峰打ち・負け）の対応は台詞からの判断。負けにはもう1通りの判定があり、降参と相手に倒されるのどちらがどれかは ❓
- ❓ 「勝負あったな」などの選択肢の効果
- ❓ 3回戦でメリンダを斬って勝ったとき、メリンダ（`0x3759`）が死亡扱いになるか。この大会の場面では `0x3759` は変わらない
- ❓ `0x37F8` が 1 のとき、のちのイベントに何が起きるか
- 🔶 峰打ちで勝ったあとの場面で、段階（`0x0010` か）が 410（1回戦）・420（2回戦）になる。斬って勝ったときには変わらない
