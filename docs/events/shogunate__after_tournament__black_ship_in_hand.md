---
event_id: 60
state_offset: "0x36E4"

title:
  ja: 黒船を我が手に
  en: Black Ship In Hand

faction:
  name: 幕府
  route: >-
    幕府ルートで鬼怒川に従う側の3つ目。[般若党壊滅](shogunate__after_tournament__annihilation_of_the_prajnas.md)の成功に続けて起き、
    成功すると夜に[剣客 茂呂茂](shogunate__after_tournament__shigeru_moro_swordsman.md)が起きるようになる。

summary: >-
  領事館で鬼怒川が攘夷の駆逐を報告し、製糸工場の建設と引き換えに黒船を貸してほしいとローラに頼む。ローラは承知し、黒船は幕府が借り受ける。
  主人公はその晩の黒船の警備を任される。会話のみ。

timing:
  phase: 剣術大会以降
  slot: 夕
  note: "段階 510。般若党壊滅から続けて起き、単独では起きない"

location: 居留地・領事館の中

conditions:
  - flag: "0x36E3"
    serial: 59
    test: "== 4"
    meaning: 般若党壊滅が成功した（成功の直後に続けて始まる）
    confidence: 🟢

failure_conditions:
  - flag: "0x36DF"
    serial: 55
    test: ">= 3"
    meaning: 闇黒の意志で鬼怒川を拒み、憂国の士の側に進んだ（前の般若党壊滅が起きない）
    confidence: 🟢
  - flag: "0x3789"
    serial: 225
    test: "== 2"
    meaning: 幕府ルートが閉じ、前の般若党壊滅が起きない（大寄せで入れないと決まった、公儀の剣で失敗した、東国の騎士・志士の刀を引き受けた、最後通告を見た）
    confidence: 🟢
  - flag: 段階
    test: "> 510"
    meaning: 般若党壊滅を起こさないまま、剣術大会以降の次の段階（520 以降）に進んだ
    confidence: 🟢

flag_changes:
  - flag: "0x36E4"
    serial: 60
    value: "= 4"
    when: 会話が終わったとき
    meaning: イベント成功
    confidence: 🟢
  - flag: "0x37A4"
    serial: 252
    value: "= 1"
    when: 会話が終わったとき
    meaning: 黒船を幕府が借り受けた（破滅への道で 2 になる）
    confidence: 🔶
  - flag: 時間帯を進める保留量
    value: "+ 10"
    when: 会話が終わったとき
    meaning: 時間帯が進む
    confidence: 🟢

sources: [A]
---

# 黒船を我が手に（Black Ship In Hand）

## 流れ

1. [般若党壊滅](shogunate__after_tournament__annihilation_of_the_prajnas.md)が成功すると、続けて領事館の場面になる。鬼怒川・琴吹・三姉妹・ローラ・伯爵がいる
2. 鬼怒川が攘夷勢力の駆逐を報告し、ローラは「では もう不要な争いは起こらないのですね」と安堵する
3. 鬼怒川は、先進技術を取り入れる研究のために黒船をしばらく貸してほしいと言い出す。琴吹は「さすがにそれは無理な相談だろ」と言うが、鬼怒川は友好の証として製糸工場の建設を約束する
4. ローラは「日本のために黒船をお貸し致しましょう」と承知する。伯爵は「黒船を手放すなんて正気かい？」とあきれる
5. 琴吹に、黒船は幕府が借り受けることになったので今晩は黒船の警備を頼むと言われて終わる
6. 成功（`0x36E4`（通し番号 60）= 4）。`0x37A4`（通し番号 252）が 1 になる

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| なし | — | 選択肢はない |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| イベントの状態 `0x36E4` | = 4 | 会話の終わり | 🟢 |
| 黒船の扱い `0x37A4`（通し番号 252） | = 1 | 会話の終わり | 🟢（値）／🔶（意味） |
| 時間帯を進める保留量 | +10 | 会話の終わり | 🟢 |

報酬・友好度・人物の生死は変わらない（🟢）。進行中（3）を経ずに 4 になり、失敗になる場面はない。

## 前後のイベント

- 前：[般若党壊滅](shogunate__after_tournament__annihilation_of_the_prajnas.md)（成功に続けて起きる）
- 次：[剣客 茂呂茂](shogunate__after_tournament__shigeru_moro_swordsman.md)（このイベントの成功 `0x36E4` = 4 が発生条件。夜に黒船の中へ）

## 未確認のこと

- 🔶 `0x37A4`（通し番号 252）の意味。このイベントで 1、[破滅への道](shogunate__ending__road_to_ruin.md)で 2 になる。外国ルートのイベントでも書き換わるので、黒船の持ち主・状態を表すとみられる
- [A] は「【般若党壊滅】の後。会話のみ」と書き、場所は書かない。場所が領事館であることは 🟢
