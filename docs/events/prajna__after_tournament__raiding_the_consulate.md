---
event_id: 62
state_offset: "0x36E6"

title:
  ja: 領事館斬り込み
  en: Raiding the Consulate

faction:
  name: 攘夷（般若党）
  route: >-
    同士救出の直後に旅籠で始まる、攘夷ルートの剣術大会以降の3番目のイベント。
    真実を通っていれば領事館で J.J と戦い武士の魂へ、通っていなければまだらと戦い熱き魂（結末）へ分かれる。

summary: >-
  旅籠で赤城が英国領事館を襲って英国と幕府を戦わせる計画を明かし、居留地で英国兵と戦ったあと領事館へ突入する。
  真実が成功していれば領事館で J.J と一騎打ち（または三対一）になり、倒すと武士の魂へ続く。
  真実が成功していなければ領事館でまだら・暗闇脳天と戦い、全員倒すと結末の熱き魂へ進む。

summary_en: >-
  At the Inn, Akagi reveals a plan to attack the British Consulate and set Britain against the Shogunate; after fighting British soldiers in Little Britain, you storm the Consulate.
  If The Truth succeeded, you face J.J. at the Consulate in a duel (or three against one), and defeating him leads to The Samurai Spirit. If The Truth did not succeed, you fight Madara and the Black Masks at the Consulate, and defeating them all leads to the Fevered Spirits ending.

timing:
  phase: 剣術大会以降（510）
  slot: 夕
  note: "始まると段階が 510、時間帯が夕になる。「準備をしてくる…」で保留すると、旅籠へ戻るたびに選び直せる"

location: 大通り・旅籠 → 居留地 → 居留地・領事館内

conditions:
  - flag: "0x36E6"
    serial: 62
    test: "<= 2"
    meaning: このイベントがまだ終わっていない（未到達、または保留中）
    confidence: 🟢
  - flag: "0x36E2"
    serial: 58
    test: "== 4"
    meaning: 同士救出が成功した
    confidence: 🟢
  - flag: "0x378B"
    test: "== 1"
    meaning: ルート分岐：攘夷 が「ルートに入れる」
    confidence: 🟢
  - flag: 現在の地域
    test: "== 15"
    meaning: 大通り・旅籠（地域の番号は開始地点 ID と同じとみなした）。同士救出の成功直後は場所を問わず続けて始まる
    confidence: 🔶

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
  - flag: 段階
    value: "= 510"
    when: 開始時
    meaning: 剣術大会以降（510）へ進む
    confidence: 🔶
  - flag: 時間帯
    value: "= 1"
    when: 開始時
    meaning: 夕
    confidence: 🔶
  - flag: "0x36E6"
    serial: 62
    value: "= 2"
    when: 「準備をしてくる…」で保留したとき
    meaning: 保留中
    confidence: 🟢
  - flag: "0x36E6"
    serial: 62
    value: "= 3"
    when: 「いつでも行ける…」を選び、血盟の盃の場面のあと
    meaning: 進行中
    confidence: 🟢
  - flag: "0x3758"
    value: "= 1"
    when: J.J を倒したとき（真実が成功している場合）
    meaning: J.J の状態（いなくなる）
    confidence: 🟢
  - flag: "0x36E6"
    serial: 62
    value: "= 4"
    when: J.J を倒したとき、またはまだら・暗闇脳天を全員倒して熱き魂に入ったとき
    meaning: イベント成功
    confidence: 🟢

sources: [A]
---

# 領事館斬り込み（Raiding the Consulate）

## 流れ

1. [同士救出](prajna__after_tournament__mutual_rescue.md)の成功直後、旅籠で始まる。段階が 510、時間帯が夕になる（🔶）
2. 赤城は、真の敵は異国だとして英国領事館に斬り込み、英国と幕府の戦争を起こして攘夷の炎を国中に広げると明かし、主人公に覚悟を問う
3. 「いつでも行ける…」を選ぶと血盟の盃を交わし、`0x36E6`（通し番号 62）= 3 になって居留地へ向かう。「準備をしてくる…」なら保留（= 2）で、旅籠の決まった位置へ戻ると同じ二択になる
4. 居留地で英国兵と戦闘になる。メリンダが生きている（`0x3759` = 0）ならメリンダ・パツキン隊・海兵隊、死んでいれば新隊長が率いる隊が相手。30 人倒すか、360 秒たつと次へ進む
5. 領事館へ突入したあと、[真実](prajna__3_day__the_truth.md)の結果で分かれる
   - 真実が成功（`0x36CE`（通し番号 38）= 4）：J.J が一人で待っている。J.J と問答のあと戦闘。倒すと J.J の状態（`0x3758`）= 1、`0x36E6` = 4 になり、そのまま[武士の魂](prajna__after_tournament__the_samurai_spirit.md)へ続く
   - 真実が成功していない：まだらと暗闇脳天が待っている。全員倒すと結末の[熱き魂](prajna__ending__fevered_spirits.md)に入り、その冒頭で `0x36E6` = 4 になる

戦闘中に赤城・小暮の体力が減ると、二人は戦闘から外れて見物に回る。イベントが失敗になる場面はない。

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| 旅籠で覚悟を問われる | 「いつでも行ける…」 | 血盟の盃のあと居留地での戦闘へ（`0x36E6` = 3） |
| 旅籠で覚悟を問われる | 「準備をしてくる…」 | 保留（`0x36E6` = 2）。旅籠に戻ると再び選べる |
| 領事館で J.J に「三対一かい」と言われる（真実が成功のとき） | 「二人とも…手出しは無用だ」 | 赤城・小暮は見物し、J.J と一騎打ち |
| 同上 | 「泣き言か 観念しろ！」 | 赤城・小暮も加わり、三人で J.J と戦う |

J.J との戦闘はどちらを選んでも、倒せば同じく武士の魂へ進む。

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| 段階 | = 510 | 開始時 | 🔶 |
| 時間帯 | = 1（夕） | 開始時 | 🔶 |
| `0x3758`（J.J） | = 1 | J.J を倒した | 🟢 |
| 報酬 | なし | — | 🟢 |

## 前後のイベント

- 前：[同士救出](prajna__after_tournament__mutual_rescue.md)
- 次：[武士の魂](prajna__after_tournament__the_samurai_spirit.md)（真実が成功していて J.J を倒した）／[熱き魂](prajna__ending__fevered_spirits.md)（真実が成功していない。まだら・暗闇脳天を全員倒す）

## 未確認のこと

- [A] は J.J との戦闘を武士の魂に含めているが、J.J を倒した時点で領事館斬り込みが成功（= 4）になり、武士の魂はそのあとの琴吹・三姉妹との戦闘から始まる。チャート上の区切りは要ゲーム内確認
- 🔶 段階・時間帯のセーブ上の位置は未確定（`0x0010` が段階の候補）
- 🔶 旅籠の地域番号 15 は、開始地点 ID の表と番号が同じだという仮定による
- ❓ 居留地の戦闘で 360 秒たったときと 30 人倒したときで、その後に違いがあるか
- ❓ 居留地の戦闘でメリンダを倒したとき、メリンダの状態（`0x3759`）が変わるか
