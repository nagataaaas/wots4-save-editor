---
event_id: 51
state_offset: "0x36DB"

title:
  ja: 覇者となる
  en: We Are the Champions

faction:
  name: 共通・無所属
  route: >-
    剣術大会の3回戦（決勝）に勝ったあとの表彰式。無所属の大会なら魔鱗組として（結末）へ、
    勢力の大会なら表彰台に上がると釜茹で侍（結末）、辞退すると剣術大会以降の勢力ルートへ進む。

summary: >-
  表彰式で、勝ち抜いた者たちに表彰台へ上がるよう告げられる。表彰台は鬼怒川の罠で、上がった者は釜茹でにされる。
  勢力の大会では、帰ろうとすると琴吹に呼び止められ、「辞退する…」を選ぶと罠を逃れて先へ進める。

summary_en: >-
  At the award ceremony, the winners are told to step up onto the podium. The podium is Kinugawa's trap, and those who step up are boiled alive.
  In a faction's tournament, Kotobuki stops you as you try to leave, and choosing "I'll decline..." lets you escape the trap and move on.

timing:
  phase: 4日目以降（剣術大会前）
  slot: 夕
  note: "剣術大会の決勝に勝つと、そのまま続く"

location: 大通り（剣術大会の会場）

conditions:
  - flag: "0x36D7, 0x36D8, 0x36D9, 0x36DA"
    test: "どれか == 4"
    meaning: 剣術大会（幕府・外国・攘夷・無所属のどれか）の3回戦に勝った（その場面から直接始まる）
    confidence: 🟢

failure_conditions:
  - flag: "0x36D7, 0x36D8, 0x36D9, 0x36DA"
    test: "どれか == 5"
    meaning: 剣術大会（幕府・外国・攘夷・無所属のどれか）の試合で負けるか降参した（最後通告へ進む）
    confidence: 🟢
  - flag: "0x36D6"
    serial: 46
    test: "== 5"
    meaning: 4日目のイベントをどれも成功させずに剣術大会に出て、2回戦のあと打ち切られた（最後通告へ進む）
    confidence: 🔶

flag_changes:
  - flag: "0x36DB"
    serial: 51
    value: "= 4"
    when: 表彰式の始め（どの経路でも）
    meaning: イベント成功
    confidence: 🟢
  - flag: "0x375A"
    serial: 178
    value: "= 1"
    when: 「辞退する…」のあと、堂島 0x375A が 0 かつ堂島の職 0x3799 が 0 のとき（幕府・外国・攘夷の大会）
    meaning: 堂島が優勝者の1人として表彰台に上がり、釜茹でにされる
    confidence: 🟢値 ／ 🔶死亡の意味
  - flag: 時間帯
    value: "= 0"
    when: 「辞退する…」のあと、場面の終わり
    meaning: 昼
    confidence: 🔶
  - flag: 段階
    value: "= 500"
    when: 「辞退する…」のあと、場面の終わり
    meaning: 剣術大会以降
    confidence: 🟢

sources: [A]
---

# 覇者となる（We Are the Champions）

## 流れ

1. 剣術大会の3回戦に勝つと、表彰式が始まる。始めに `0x36DB` = 4
2. 無所属の大会（`0x36DA` = 4）：そのまま [魔鱗組として](other__ending__as_a_demonscale.md)（結末）へ進む
3. 勢力の大会（幕府・外国・攘夷）：表彰台へ上がるよう告げられ、主人公は会場の中を動ける
   - 表彰台へ上がる、またはその場に留まる → 琴吹に急かされて表彰台へ → [釜茹で侍](other__ending__boiled_samurai.md)（結末）
   - 会場から帰ろうとする → 琴吹に「待て どこへ行く」と呼び止められる（選択肢は下の表）
4. 「辞退する…」：琴吹があきれて去る。ほかの優勝者が表彰台に上がり、鬼怒川が熱した表彰台で釜茹でにする場面、
   続けて鬼怒川と三姉妹が鍋を囲む場面が流れる。終わると段階 500（剣術大会以降）、時間帯は昼になり、町へ移る
   - 堂島が生きていて（`0x375A` = 0）職がない（`0x3799` = 0）と、堂島も優勝者の1人として釜茹でにされ、`0x375A` = 1

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| 帰ろうとして琴吹に呼び止められる | 「ああ…今行く」「興奮しすぎた…」、または無言 | 表彰台へ → 釜茹で侍（結末） |
| 同上 | 「辞退する…」 | 釜茹でを逃れ、剣術大会以降へ（段階 500） |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| `0x36DB`（通し番号 51） | 4 | 表彰式の始め | 🟢 |
| 堂島 `0x375A`（通し番号 178） | 1 | 「辞退する…」で、堂島が生きていて職がないとき | 🟢 |
| 段階 | 500（剣術大会以降） | 「辞退する…」の場面の終わり | 🟢 |
| 時間帯 | 昼 | 同上 | 🔶 |

## 前後のイベント

- 前：剣術大会の決勝（[幕府](shogunate__4_day__battle_tournament_shogunate.md)・[外国](foreigners__4_day__battle_tournament_foreigners.md)・[攘夷](prajna__4_day__battle_tournament_prajnas.md)・[無所属](other__4_day__battle_tournament_independent.md)）
- 次：[魔鱗組として](other__ending__as_a_demonscale.md)（無所属の大会）／[釜茹で侍](other__ending__boiled_samurai.md)（表彰台に上がる）／
  「辞退する…」のあとは剣術大会以降の勢力ルート（[闇黒の意志](shogunate__after_tournament__a_dark_will.md)・[願い虚しく](foreigners__after_tournament__wasted_wish.md)・[臆病風](prajna__after_tournament__loss_of_nerve.md)）

## 未確認のこと

- [A] の条件は「勢力ルートで3連勝」。無所属の大会で優勝したときも状態は 4 になり、選択肢なしで魔鱗組として（結末）へ進む
- 🔶 表彰台に向かったとみなす位置（会場の3か所）と、呼び止められる位置（会場の外寄り）の区別。要ゲーム内確認
- 🔶 堂島の状態 1 が死亡を表すか（[characters](../save_format/chunks/characters/README.md) では値の意味は ❓）
- ❓ 結末へ進んだ場合に、このイベントの状態以外が変わるか（結末のファイルを参照）
