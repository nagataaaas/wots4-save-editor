---
event_id: 48
state_offset: "0x36D8"

title:
  ja: 剣術大会（外国）
  en: Battle Tournament (Foreigners)

faction:
  name: 外国
  route: >-
    [東国の騎士](foreigners__4_day__the_eastern_knight.md) に協力した（`0x36D3` が 4）ときの剣術大会の記録。
    [剣術大会開催](other__4_day__battle_tournament_opens.md) で 3 になり、3回戦に勝つと 4 で [覇者となる](other__4_day__we_are_the_champions.md)、負けると 5 で [最後通告](other__ending__final_warning.md) に進む。

summary: >-
  外国側として出場した剣術大会の結果。チャートに名前の出ない記録で、対戦相手は 江里香 → 鬼瓦 → 小暮。
  3回戦の相手はほかの勢力と違って分岐しない。

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
    test: "== 4"
    meaning: 東国の騎士に協力した
    confidence: 🟢
  - flag: "0x36D6"
    serial: 46
    test: "== 4"
    meaning: 剣術大会開催の会場の場面を見た
    confidence: 🟢

failure_conditions:
  - flag: "0x378A"
    serial: 226
    test: "== 2"
    meaning: 外国ルートが閉じた（大寄せで外国ルートに入れなかった、公儀の剣・志士の刀に参加を決めた、東国の騎士で伯爵に斬りかかった）。東国の騎士が起きない
    confidence: 🟢
  - flag: "0x36D3"
    serial: 43
    test: "!= 4（`0x36D6` = 4 のとき）"
    meaning: 東国の騎士で参加を決めないまま剣術大会開催の会場の場面を見た（外国側で出場しない）
    confidence: 🟢

flag_changes:
  - flag: "0x36D8"
    serial: 48
    value: "= 3"
    when: 剣術大会開催の会場の場面のあと、1回戦の前
    meaning: 外国側として出場
    confidence: 🟢
  - flag: "0x37AB"
    value: "= 1 / 2 / 3"
    when: 1・2・3回戦に勝ったとき
    meaning: 勝ち抜いた試合数（4勢力で共通）
    confidence: 🟢
  - flag: "0x36D8"
    serial: 48
    value: "= 5"
    when: 1〜3回戦のどれかで負けたとき
    meaning: 敗退。最後通告へ進む
    confidence: 🟢
  - flag: "0x36D8"
    serial: 48
    value: "= 4"
    when: 3回戦（小暮）に勝ったとき。斬っても峰打ちでも同じ
    meaning: 優勝
    confidence: 🟢

sources: [A]
---

# 剣術大会（外国）（Battle Tournament (Foreigners)）

## 流れ

1. [剣術大会開催](other__4_day__battle_tournament_opens.md) の会場の場面のあと、公儀の剣（`0x36D2`）が 4 でなく、東国の騎士（`0x36D3`）が 4 なら `0x36D8`（通し番号 48）が 3 になり、外国側の対戦表で始まる（🟢）
2. 1回戦：槍使い女の江里香
3. 2回戦：格闘家の鬼瓦。勝つと幕間の場面に移り、時間帯が夕になる（🔶）
4. 3回戦：小暮。人物の状態に関係なく、いつも小暮（🟢）
5. 結末
   - 3回戦に勝つ：`0x36D8` = 4。表彰式（[覇者となる](other__4_day__we_are_the_champions.md)）へ
   - どの試合でも、負ける・降参する：`0x36D8` = 5。[最後通告](other__ending__final_warning.md) へ

各試合の終わり方は3通りある（🟢）。相手を斬って勝つ、峰打ちで勝つ、負ける。どれがどの終わり方かは台詞からの判断（🔶）。

## 選択肢

試合中に相手に話しかけると、次の3つから選べる。

| 場面 | 選択肢 | 結果 |
|---|---|---|
| 1回戦（江里香） | 「かかって来い年増！」「降参する」「勝負あったな」 | 「降参する」で負けになるとみられる（🔶）。ほかの2つの効果は ❓ |
| 2回戦（鬼瓦） | 「待て！」「降参する」「勝負あったな」 | 同上 |
| 3回戦（小暮） | 「待った！」「降参する」「勝負あったな」 | 同上 |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| `0x36D8`（通し番号 48） | = 3 | 大会の開始 | 🟢 |
| `0x37AB`（勝ち抜いた試合数） | = 1 → 2 → 3 | 各試合に勝ったとき | 🟢 |
| `0x36D8` | = 4 | 3回戦に勝つ | 🟢 |
| `0x36D8` | = 5 | どの試合でも負ける | 🟢 |
| 時間帯 | 夕 | 2回戦のあとの幕間 | 🔶 |

## 前後のイベント

- 前：[東国の騎士](foreigners__4_day__the_eastern_knight.md) → [剣術大会開催](other__4_day__battle_tournament_opens.md)
- 次：[覇者となる](other__4_day__we_are_the_champions.md)（優勝）／[最後通告](other__ending__final_warning.md)（敗退）
- 優勝後：表彰台に上ると [釜茹で侍](other__ending__boiled_samurai.md)、辞退すると [願い虚しく](foreigners__after_tournament__wasted_wish.md) へ [A]

## 未確認のこと

- [A] では「剣術大会で小暮を峰打ちにしていれば、願い虚しくで小暮も敵になる」。斬ると小暮が死に、[願い虚しく](foreigners__after_tournament__wasted_wish.md)に出ないという意味とみられる。
  3回戦を斬って終えると「無念……」、峰打ちで終えると「見事だ……」と台詞は分かれるが、どちらも `0x36D8` は 4 で、小暮の状態 `0x374F` は書き換わらない（🟢）。
  願い虚しくは `0x374F` だけで小暮が出るかを決めるので、斬ったあとのセーブで `0x374F` が 1 になっているかは要ゲーム内確認
- 🔶 試合の3通りの終わり方（斬る・峰打ち・負け）の対応は台詞からの判断。負けにはもう1通りの判定があり、降参と相手に倒されるのどちらがどれかは ❓
- ❓ 「かかって来い年増！」「勝負あったな」などの選択肢の効果
- 🔶 峰打ちで勝ったあとの場面で、段階（`0x0010` か）が 410（1回戦）・420（2回戦）になる。斬って勝ったときには変わらない
