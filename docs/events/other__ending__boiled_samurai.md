---
event_id: 98
state_offset: "0x370A"

title:
  ja: 釜茹で侍
  en: Boiled Samurai

faction:
  name: 共通・無所属
  route: >-
    勢力側（幕府・外国・攘夷）で剣術大会に優勝し、表彰台に上ったときの結末。
    [覇者となる](other__4_day__we_are_the_champions.md) の表彰式で辞退しないとこの結末になり、辞退すると各勢力の剣術大会以降のイベントに進む。

summary: >-
  表彰台に上った優勝者たちが鬼怒川の罠にかかり、表彰台ごと釜茹でにされて周回が終わる。

summary_en: >-
  The winners who stepped up onto the podium fall into Kinugawa's trap and are boiled alive along with the podium, and the playthrough ends.

timing:
  phase: 結末
  slot: なし
  note: "剣術大会の当日。表彰式から直接つながる"

location: 剣術大会会場（表彰台）

conditions:
  - flag: "0x36D7"
    serial: 47
    test: "== 4"
    meaning: 剣術大会（幕府）・（外国）・（攘夷）のどれかで3回戦に勝った（`0x36D7`・`0x36D8`・`0x36D9` のどれかが 4）
    confidence: 🟢
  - flag: "0x36DA"
    serial: 50
    test: "!= 4"
    meaning: 無所属で優勝していない（4 なら魔鱗組としてになる）
    confidence: 🟢

failure_conditions:
  - flag: "0x36D2, 0x36D3, 0x36D4, 0x36D6"
    test: "0x36D2〜0x36D4 がどれも != 4 のまま 0x36D6 >= 4"
    meaning: 公儀の剣・東国の騎士・志士の刀のどれも成功させずに剣術大会開催を迎えた（無所属の大会になる）
    confidence: 🟢
  - flag: "0x36D7, 0x36D8, 0x36D9"
    test: "どれか == 5"
    meaning: 勢力の剣術大会の試合で負けるか降参した（最後通告へ進む）
    confidence: 🟢
  - flag: 段階
    test: ">= 500"
    meaning: 表彰式で琴吹に呼び止められて「辞退する…」を選び、剣術大会以降に進んだ（覇者となるの状態は表彰式の始めに 4 になるので、どちらの経路でも 4）
    confidence: 🟢

flag_changes:
  - flag: "0x36DB"
    serial: 51
    value: "= 4"
    when: 表彰式の始め（優勝したときは必ず）
    meaning: 覇者となるの完了
    confidence: 🟢
  - flag: "0x375A"
    value: "= 1"
    when: 結末の場面の準備で、堂島（`0x375A`）が 0 かつ堂島の職（`0x3799`）が 0 のとき
    meaning: 堂島がほかの優勝者として表彰台に並び、釜茹でになる。条件に合わなければ別の人物が並び、値は変わらない
    confidence: 🟢 値 ／ 🔶 意味
  - flag: "0x370A"
    serial: 98
    value: "= 4"
    when: 結末の場面の最後（スタッフロールの前）
    meaning: この結末を見た
    confidence: 🟢
  - flag: 段階
    value: "= 999"
    when: 同上
    meaning: 結末（`0x0010` か 🔶）
    confidence: 🟢 値 ／ 🔶 位置

sources: [A]
---

# 釜茹で侍（Boiled Samurai）

## 流れ

1. [剣術大会（幕府）](shogunate__4_day__battle_tournament_shogunate.md)・[剣術大会（外国）](foreigners__4_day__battle_tournament_foreigners.md)・[剣術大会（攘夷）](prajna__4_day__battle_tournament_prajnas.md) のどれかで3回戦に勝つ（`0x36D7`〜`0x36D9` のどれかが 4）
2. 表彰式が始まり、[覇者となる](other__4_day__we_are_the_champions.md)（`0x36DB`）が 4 になる。`0x36DA` が 4 でないので、会場を自由に歩ける場面になる（🟢）
3. 表彰台の方へ進むとそのまま、会場から出ようとすると琴吹に「待て どこへ行く」と呼び止められて選択肢になる（どちらがどちらの位置かは 🔶）
4. 表彰台に上ると、鬼怒川が勝者たちを称え、褒美を授けると言う。台が熱くなり、罠だと明かされて釜茹でにされる
5. `0x370A`（通し番号 98）が 4、段階が 999 になり、スタッフロールで周回が終わる

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| 琴吹に呼び止められる | 「ああ…今行く」 | 表彰台に上り、この結末になる |
| 琴吹に呼び止められる | 「興奮しすぎた…」 | 同上 |
| 琴吹に呼び止められる | 「辞退する…」 | 結末にならない。ほかの優勝者が釜茹でにされるのを見たあと、段階が 500（剣術大会以降）、時間帯が昼（🔶）になり、勢力ごとのイベントへ進む |

この結末になる条件をまとめると次のとおり（どれも 🟢）。

| 位置 | 値 | 意味 |
|---|---|---|
| `0x36D7`・`0x36D8`・`0x36D9`（剣術大会の幕府・外国・攘夷） | どれかが 4 | 勢力側で優勝した |
| `0x36DA`（剣術大会（無所属）） | 4 以外 | 無所属で優勝していない |
| 表彰式の選択 | 「辞退する…」以外 | 表彰台に上る |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| `0x36DB`（覇者となる） | = 4 | 表彰式の始め | 🟢 |
| 堂島（`0x375A`） | 0 → 1 | 結末の場面の準備（堂島が 0 かつ堂島の職 `0x3799` が 0 のときだけ） | 🟢 値 ／ 🔶 意味 |
| `0x370A`（通し番号 98） | = 4 | 結末の最後 | 🟢 |
| 段階 | = 999 | 結末の最後 | 🟢 値 ／ 🔶 位置 |

「辞退する…」を選んだときも、ほかの優勝者が釜茹でにされる場面で、同じ条件で堂島（`0x375A`）が 1 になる（🟢）。

## 前後のイベント

- 前：[剣術大会（幕府）](shogunate__4_day__battle_tournament_shogunate.md)・[剣術大会（外国）](foreigners__4_day__battle_tournament_foreigners.md)・[剣術大会（攘夷）](prajna__4_day__battle_tournament_prajnas.md) → [覇者となる](other__4_day__we_are_the_champions.md)
- 次：なし（周回の終わり）
- 辞退したとき：[闇黒の意志](shogunate__after_tournament__a_dark_will.md)（幕府）／[願い虚しく](foreigners__after_tournament__wasted_wish.md)（外国）／[臆病風](prajna__after_tournament__loss_of_nerve.md)（攘夷）[A]

## 未確認のこと

- 🔶 会場の自由に歩ける場面で、どの位置へ進むと表彰台に上り、どの位置で琴吹に呼び止められるか
- 🔶 堂島（`0x375A`）が 1 になるのは、表彰台で釜茹でになった（死亡した）ことを表すとみられる。町の人の状態の「堂島の死亡」（`0x0264`）との関係は ❓
- ❓ `0x370A` の値で、結末の場面を早送りできるかが変わるとみられる（🔶）。どの値で早送りできるかは要ゲーム内確認
