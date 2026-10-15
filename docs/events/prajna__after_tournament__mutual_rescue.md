---
event_id: 58
state_offset: "0x36E2"

title:
  ja: 同士救出
  en: Mutual Rescue

faction:
  name: 攘夷（般若党）
  route: >-
    臆病風で出発を選ぶと続けて始まる、攘夷ルートの剣術大会以降の2番目のイベント。
    成功するとそのまま旅籠に移り、領事館斬り込みが始まる。

summary: >-
  赤城・小暮らと代官所に斬り込み、魔鱗組の大将を倒して鍵を奪い、牢の同志を救い出して裏門から逃げる。
  逃げ延びると、留守の間に鬼怒川に神社を押さえられたと知り、般若党は旅籠へ移る。救えた同志の数で報酬が変わる。

summary_en: >-
  Storm the Magistrate's Office with Akagi, Kogure and the others, defeat the Demonscale General to take the key, free your comrades from the jail, and escape through the back gate.
  Once you get away, you learn that Kinugawa seized the Shrine while you were gone, and the Prajnas move to the Inn. The reward depends on how many comrades you rescue.

timing:
  phase: 剣術大会以降
  slot: 昼
  note: "単独では始まらない。臆病風で「よし 早速出発だ！」を選んだ直後に続けて始まる"

location: 代官所（門の外 → 代官所内 → 牢 → 裏門）

conditions:
  - flag: "0x36E1"
    serial: 57
    test: "== 4"
    meaning: 臆病風で「よし 早速出発だ！」を選んだ（その場で続けて始まる）
    confidence: 🟢

failure_conditions:
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
  - flag: "0x36E2"
    serial: 58
    value: "= 1"
    when: 門の外の戦闘に勝ち、代官所内に入ったとき
    meaning: 導入を見た
    confidence: 🟢
  - flag: "0x3778"
    value: "= 1"
    when: 牢の場面の開始時
    meaning: 不明
    confidence: ❓
  - flag: "0x36E2"
    serial: 58
    value: "= 3"
    when: 牢の戦闘の前
    meaning: 進行中
    confidence: 🟢
  - flag: "0x36E2"
    serial: 58
    value: "= 4"
    when: 裏門から逃げ延びたあと
    meaning: イベント成功
    confidence: 🟢
  - flag: "0x37A2"
    value: "= 1"
    when: 成功したとき
    meaning: 不明
    confidence: ❓
  - flag: "0x37C3"
    value: "= 1"
    when: 成功したとき
    meaning: 神社の門（神社入口の柵）を閉じる
    confidence: 🟢
  - flag: "0x3761"
    value: "= 1"
    when: 成功したとき
    meaning: 不明（大寄せでも 1 になるバイト）
    confidence: ❓
  - flag: 所持金
    value: "+ 3000 / 1500 / 500 / 100"
    when: 成功したとき。救えた同志の数による（下の「変化する内容」）
    meaning: 報酬
    confidence: 🟢

sources: [A]
---

# 同士救出（Mutual Rescue）

## 流れ

1. [臆病風](prajna__after_tournament__loss_of_nerve.md)で出発を選ぶと、代官所の門の外へ移る。門番に見咎められ、同心・魔鱗組と戦闘になる（20人倒すと先へ進む）
2. 代官所内に入ると `0x36E2`（通し番号 58）= 1。魔鱗組の大将との戦闘になる。大将を倒すと鍵が手に入り、牢の扉で鍵を使うと扉が開く（重要品 `0xED` 拷問部屋の鍵を 1 本使う）
3. 牢に入ると `0x36E2` = 3。囚われていた同志 6 人を守りながら魔鱗組と戦う。12 人倒すか、地図の外へ出て戦闘から離れると脱出の場面に移る
4. 脱出の場面では、裏門のほうへ向かい、決められた位置まで逃げ延びると戦闘が終わる
5. 逃げ延びると成功（= 4）。般若党は、留守の間に鬼怒川に本拠の神社を押さえられたと知り（「ここは捨てる……」「他へ移ろう」）、神社の柵が閉じる。報酬を受け取り、そのまま旅籠に移って[領事館斬り込み](prajna__after_tournament__raiding_the_consulate.md)が始まる

戦闘中に赤城・小暮の体力が減ると、二人は戦闘から外れて見物に回る。イベントが失敗になる場面はない。

[真実](prajna__3_day__the_truth.md)が成功（`0x36CE`（通し番号 38）= 4）で、朱美の状態（`0x3750`）が 0 のときは、拷問部屋に朱美がいて、拷問部屋の扉が開いた状態になる（🟢）。このときは牢の戦闘の始まり方が変わる（❓ 下の「未確認のこと」）。

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| — | なし | 会話の選択肢は出ない（🟢） |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| 所持金 | +3000 文 | 成功。同志 6 人全員が生きている | 🟢 |
| 所持金 | +1500 文 | 成功。同志が 3〜5 人生きている | 🟢 |
| 所持金 | +500 文 | 成功。同志が 1〜2 人生きている | 🟢 |
| 所持金 | +100 文 | 成功。同志が全員死んだ | 🟢 |
| 重要品 `0xED`（拷問部屋の鍵） | −1 | 牢の扉を開けたとき | 🟢 |
| `0x37C3`（神社の門） | = 1（閉じる） | 成功 | 🟢 |
| `0x37A2`（意味 ❓） | = 1 | 成功 | 🟢値 ／ ❓意味 |
| `0x3761`（意味 ❓） | = 1 | 成功 | 🟢値 ／ ❓意味 |
| `0x3778`（意味 ❓） | = 1 | 牢の場面の開始 | 🟢値 ／ ❓意味 |

## 前後のイベント

- 前：[臆病風](prajna__after_tournament__loss_of_nerve.md)（「よし 早速出発だ！」）
- 次：[領事館斬り込み](prajna__after_tournament__raiding_the_consulate.md)（成功の直後に旅籠で続けて始まる。旅籠で `0x36E2` = 4 のときにも始まる）

## 未確認のこと

- [A] は鍵で開けるのを「獄門塔の扉」としている。使う重要品は `0xED`（拷問部屋の鍵）で、扉の呼び名との対応は要ゲーム内確認
- ❓ 大将が鍵を落とすのか、倒すと自動で手に入るのか
- ❓ 拷問部屋に朱美がいるとき、牢の戦闘がどう始まるか、朱美を助けられるか。朱美と話す場面（「おまえを助けに来た」など）や、赤城が「朱美を助けるということは俺たちを敵にするということだぞ」と止める場面が出るかは要ゲーム内確認
- ❓ `0x3778`・`0x3761`・`0x37A2` の意味
- ❓ 赤城・小暮が見物に回ったあと、成功の判定や報酬に影響するか
