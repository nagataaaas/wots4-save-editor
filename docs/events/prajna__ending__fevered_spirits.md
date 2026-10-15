---
event_id: 91
state_offset: "0x3703"

title:
  ja: 熱き魂
  en: Fevered Spirits

faction:
  name: 攘夷（般若党）
  route: >-
    攘夷ルートの結末の一つ。真実を通らずに領事館斬り込みへ進み、領事館でまだら・暗闇脳天を全員倒すと迎える。

summary: >-
  領事館でまだらと暗闇脳天を倒した般若党は、幕府の大軍に包囲される。降伏を拒んだ赤城たちは最後の一人まで戦って倒れ、
  その後の時代を語る後日談とスタッフロールで周回が終わる。

summary_en: >-
  The Prajnas who defeated Madara and the Black Masks at the Consulate are surrounded by a great Shogunate army. Refusing to surrender, Akagi and the others fight to the last man and fall,
  and the playthrough ends with an epilogue about the era that followed and the staff roll.

timing:
  phase: 結末
  slot: なし
  note: "領事館斬り込みの最後の戦闘に勝つと続けて始まる"

location: 居留地・領事館

conditions:
  - flag: "0x36CE"
    serial: 38
    test: "!= 4"
    meaning: 真実が成功していない（領事館でまだら・暗闇脳天と戦う分岐に入る条件）
    confidence: 🟢
  - flag: "0x36E6"
    serial: 62
    test: "== 3"
    meaning: 領事館斬り込みの進行中に、領事館でまだら・暗闇脳天を全員倒す
    confidence: 🟢

failure_conditions:
  - flag: "0x36CE"
    serial: 38
    test: "== 4"
    meaning: 真実が成功した（3日目夜に墓場で朱美を問い詰めたとき。領事館斬り込みから武士の魂へ進む）
    confidence: 🟢
  - flag: "0x378B"
    serial: 227
    test: "== 2"
    meaning: 攘夷のルートに入れなくなった（大寄せで攘夷の友好度が 3 に足りなかったとき、公儀の剣・東国の騎士を引き受けたとき、志士の刀で戦闘になったとき、最後通告のとき）
    confidence: 🟢
  - flag: "0x36D9"
    serial: 49
    test: "== 5"
    meaning: 剣術大会（攘夷）で負けた（最後通告へ進み、剣術大会以降に入らない）
    confidence: 🟢
  - flag: "0x370A"
    serial: 98
    test: "== 4"
    meaning: 剣術大会の表彰式で表彰台に上った（釜茹で侍の結末へ進む）
    confidence: 🟢


flag_changes:
  - flag: "0x36E6"
    serial: 62
    value: "= 4"
    when: 結末の冒頭
    meaning: 領事館斬り込みの成功
    confidence: 🟢
  - flag: "0x3703"
    serial: 91
    value: "= 4"
    when: 後日談・スタッフロールの場面
    meaning: この結末を迎えた
    confidence: 🟢

sources: [A]
---

# 熱き魂（Fevered Spirits）

## 流れ

1. [領事館斬り込み](prajna__after_tournament__raiding_the_consulate.md)で、[真実](prajna__3_day__the_truth.md)が成功していない（`0x36CE`（通し番号 38）≠ 4）と、領事館でまだらと暗闇脳天が待ち構えている。全員倒すと始まる
2. 冒頭で領事館斬り込みが成功（`0x36E6`（通し番号 62）= 4）になる
3. 鉄砲隊を含む幕府の大軍が押し寄せ、般若党は包囲される。降伏を求められた赤城は拒み、最後の一人まで戦うと宣言して討たれる（「諮られたな」）
4. 幕府の崩壊と近代化、忘れ去られた攘夷志士を語る後日談とスタッフロールが流れ、この結末を迎えた記録（`0x3703`（通し番号 91）= 4）が残る

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| — | なし | 選択肢は出ない（🟢） |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| `0x36E6`（領事館斬り込み） | = 4 | 冒頭 | 🟢 |
| `0x3703`（この結末） | = 4 | 後日談 | 🟢 |

## 前後のイベント

- 前：[領事館斬り込み](prajna__after_tournament__raiding_the_consulate.md)（真実が成功していない場合）
- 次：なし（周回の終わり）
- 真実が成功していれば、同じ場面から[武士の魂](prajna__after_tournament__the_samurai_spirit.md)を経て[攘夷の炎](prajna__ending__the_flames_of_prajna.md)へ分かれる

## 未確認のこと

- ❓ 周回をまたぐ記録（`0x3838`〜 の記録 B）にこの結末がどう残るか
