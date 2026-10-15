---
event_id: 92
state_offset: "0x3704"

title:
  ja: 攘夷の炎
  en: The Flames of Prajna

faction:
  name: 攘夷（般若党）
  route: >-
    攘夷ルートの結末の一つ。真実を通って領事館斬り込みで J.J を倒し、武士の魂で琴吹と三姉妹を倒すと迎える。

summary: >-
  琴吹と三姉妹を倒した般若党を幕府の大軍が囲む。深手を負った赤城は主人公に攘夷の志を託して逃がし、仲間と幕軍へ突撃する。
  一か月後に英国艦隊が阿弥浜へ押し寄せ、主人公が赤城の遺志を継いだ男として語られる後日談とスタッフロールで周回が終わる。

summary_en: >-
  A great Shogunate army surrounds the Prajnas who defeated Kotobuki and the Three Sisters. The badly wounded Akagi entrusts the hero with the Prajna cause and lets him escape, then charges the Shogunate forces with his comrades.
  A month later a British fleet descends on Amihama, and the playthrough ends with an epilogue telling of the hero as the man who carried on Akagi's will, followed by the staff roll.

timing:
  phase: 結末
  slot: なし
  note: "武士の魂の成功直後に続けて始まる。途中で時間帯が夜になる（🔶）"

location: 居留地・領事館 → 阿弥浜

conditions:
  - flag: "0x36E7"
    serial: 63
    test: "== 4"
    meaning: 武士の魂で琴吹・万由・千佳・百合を倒した（その場で続けて始まる）
    confidence: 🟢

failure_conditions:
  - flag: "0x36CE"
    serial: 38
    test: "!= 4"
    meaning: 真実が成功しなかった（3日目夜に朱美を見逃すと 5。売国奴を斬れが成功していないと真実が起きず、0 のまま。領事館斬り込みから熱き魂へ進む）
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
  - flag: 時間帯
    value: "= 2"
    when: 一か月後の場面の前
    meaning: 夜
    confidence: 🔶
  - flag: "0x3704"
    serial: 92
    value: "= 4"
    when: 後日談・スタッフロールの場面
    meaning: この結末を迎えた
    confidence: 🟢

sources: [A]
---

# 攘夷の炎（The Flames of Prajna）

## 流れ

1. [武士の魂](prajna__after_tournament__the_samurai_spirit.md)で4人を倒すと続けて始まる
2. 幕府の大軍が現れ、厳罰に処すと告げる。深手を負った赤城は、自分たちが幕軍に突っ込む隙に脱出し、決して振り返らないよう主人公に約束を求める
3. 選択肢（下の表）はどちらを選んでも赤城の返事が変わるだけで、結末は同じ
4. 般若党は「志士の最期を見せてやる」と幕軍へ突撃し、主人公は脱出する
5. 一か月後、英国艦隊が阿弥浜の海を埋め尽くす。幕府は崩壊へ向かい、攘夷の炎が国中に広がったこと、その先頭に立ったのが般若党党首・赤城の遺志を継いだ男（主人公）だったことが語られる
6. スタッフロールが流れ、この結末を迎えた記録（`0x3704`（通し番号 92）= 4）が残る

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| 赤城に脱出を頼まれる | 「約束だ…」 | 赤城「あんたに出会えてよかった」。そのまま脱出の場面へ |
| 赤城に脱出を頼まれる | 「ともに死に花を咲かせよう」 | 赤城が攘夷の志を伝える者が要ると説き伏せる。結果は同じ |
| 同上（何も選ばない） | — | 赤城が「頼む 受け継いでくれ」と頼む。結果は同じ |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| 時間帯 | = 2（夜） | 一か月後の場面の前 | 🔶 |
| `0x3704`（この結末） | = 4 | 後日談 | 🟢 |

## 前後のイベント

- 前：[武士の魂](prajna__after_tournament__the_samurai_spirit.md)
- 次：なし（周回の終わり）
- 真実が成功していなければ、[領事館斬り込み](prajna__after_tournament__raiding_the_consulate.md)から[熱き魂](prajna__ending__fevered_spirits.md)へ分かれる

## 未確認のこと

- 🔶 「何も選ばない」の行は、選択肢を選ばずに時間切れになったときの台詞とみなしたもの
- 🔶 時間帯のセーブ上の位置は未確定
- ❓ 周回をまたぐ記録（`0x3838`〜 の記録 B）にこの結末がどう残るか
