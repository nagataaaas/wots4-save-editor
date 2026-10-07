---
event_id: 61
state_offset: "0x36E5"

title:
  ja: 鬼怒川の魔手
  en: Kinugawa's Evil Influence

faction:
  name: 外国
  route: >-
    外国ルートの分かれ目。ローラを守りきると成功して[夕暮れの船上](foreigners__after_kinugawa__twilight_on_board.md)へ、
    ローラが死ぬと失敗して[討ち入り](foreigners__after_kinugawa__the_raid.md)へ進む。

summary: >-
  願い虚しくの大通りの戦闘のあと、大老・鬼怒川が現れ、伯爵を魔鱗組に襲わせたことを明かしてローラを殺そうとする。
  魔鱗組からローラを守り、15人倒すと領事館へ逃れて成功。ローラが倒れると失敗し、ローラは死亡、居留地の門が閉じる。

timing:
  phase: 剣術大会以降（510）
  slot: 夕
  note: 願い虚しくの戦闘から続けて起こる。始まると段階 520・時間帯が夜になる

location: 大通り → 居留地・領事館内（成功時）

conditions:
  - flag: "0x36E0"
    serial: 56
    test: "== 3"
    meaning: 願い虚しくの大通りの戦闘を終えた（続けて起こる）
    confidence: 🔶
  - flag: 時間帯
    test: "== 1"
    meaning: 夕
    confidence: 🟢
  - flag: 現在の地域
    test: "== 13"
    meaning: 大通りにいる
    confidence: 🟢

failure_conditions:
  - flag: "0x36D8"
    serial: 48
    test: "== 5"
    meaning: 剣術大会（外国）で負けた・降参した（最後通告へ進み、前の願い虚しくが起きない）
    confidence: 🟢
  - flag: "0x370A"
    serial: 98
    test: "== 4"
    meaning: 優勝後の表彰式で表彰台に上がった（釜茹で侍の結末へ進み、前の願い虚しくが起きない）
    confidence: 🟢

flag_changes:
  - flag: "0x36E0"
    serial: 56
    value: "= 4"
    when: このイベントの場面が始まったとき
    meaning: 願い虚しくの成功
    confidence: 🟢
  - flag: 段階
    value: "= 520"
    when: 場面が始まったとき
    meaning: 剣術大会以降（520）
    confidence: 🟢
  - flag: 時間帯
    value: "= 2"
    when: 場面が始まったとき
    meaning: 夜になる
    confidence: 🟢
  - flag: "0x36E5"
    serial: 61
    value: "= 3"
    when: 鬼怒川との会話のあと、魔鱗組との戦闘の前
    meaning: 進行中
    confidence: 🟢
  - flag: "0x36E5"
    serial: 61
    value: "= 4"
    when: 魔鱗組を15人倒して領事館へ逃れたとき（領事館の場面でもう一度 4）
    meaning: イベント成功
    confidence: 🟢
  - flag: "0x36E5"
    serial: 61
    value: "= 5"
    when: 魔鱗組との戦闘でローラの体力が尽きたとき
    meaning: イベント失敗
    confidence: 🟢
  - flag: "0x3757"
    serial: 175
    value: "= 1"
    when: 失敗したとき
    meaning: ローラが死亡
    confidence: 🟢
  - flag: "0x3764"
    serial: 188
    value: "= 1"
    when: 失敗したとき
    meaning: 居留地の門（大寄せ以降）が閉じる
    confidence: 🟢
  - flag: "0x3790"
    serial: 232
    value: "= 1"
    when: 失敗したとき
    meaning: 不明（ローラが阿弥浜を去る場面でも同じ値になる）
    confidence: 🟢
  - flag: "0x37A4"
    serial: 252
    value: "= 2"
    when: 失敗したとき
    meaning: 不明（同上）
    confidence: 🟢
  - flag: 段階
    value: "= 600"
    when: 失敗したとき
    meaning: 鬼怒川の魔手以降（600）
    confidence: 🟢
  - flag: 時間帯
    value: "= 0"
    when: 失敗したとき
    meaning: 昼になる
    confidence: 🟢

sources: [A]
---

# 鬼怒川の魔手（Kinugawa's Evil Influence）

## 流れ

1. [願い虚しく](foreigners__after_tournament__wasted_wish.md)の大通りの戦闘が終わると、そのまま場面が始まる。`0x36E0`（通し番号 56）= 4、段階 520、時間帯が夜になる
2. ローラが英国人と日本人の死者を共に弔おうとしていると、大老・鬼怒川が現れる。伯爵を襲ったのは攘夷ではなく、鬼怒川が魔鱗組にやらせたことが明かされる。鬼怒川は、ローラも紛争に巻き込まれて死んだことにすると言い、魔鱗組をけしかける
3. `0x36E5`（通し番号 61）= 3 になり、魔鱗組との戦闘。ローラを守りながら戦う。メリンダが生きていれば味方にいて、体力が尽きると「女王陛下万歳……」と言って倒れる
4. 結末
   - 魔鱗組を15人倒す：ローラを連れて領事館へ逃れる。`0x36E5` = 4（成功）。夜の領事館で、ローラが本国から帰還命令が出たことを告げ、「私の傍にいて下さいませんか」と頼む。ここでもう一度 `0x36E5` = 4 になり、[夕暮れの船上](foreigners__after_kinugawa__twilight_on_board.md)へ続く
   - ローラの体力が尽きる：ローラが死亡（`0x3757` = 1）。`0x36E5` = 5（失敗）。居留地の門が閉じ（`0x3764` = 1）、段階 600・時間帯が昼になる。以後は[討ち入り](foreigners__after_kinugawa__the_raid.md)へ進む

## 選択肢

選択肢はない。分岐は戦闘の結果だけで決まる。

| 場面 | 結果 | 状態 |
|---|---|---|
| 魔鱗組との戦闘 | 15人倒して領事館へ逃れる | 成功（`0x36E5` = 4）→ 夕暮れの船上 |
| 魔鱗組との戦闘 | ローラの体力が尽きる | 失敗（`0x36E5` = 5）、ローラ死亡 → 討ち入り |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| イベントの状態 `0x36E0`（願い虚しく） | = 4 | 場面の始まり | 🟢 |
| 段階・時間帯 | 520・夜 | 場面の始まり | 🟢 |
| イベントの状態 `0x36E5` | = 3 → 4 | 15人倒した・領事館の場面 | 🟢 |
| イベントの状態 `0x36E5` | = 5 | ローラの体力が尽きた | 🟢 |
| 人物 | ローラ死亡（`0x3757`（通し番号 175）= 1） | 失敗 | 🟢 |
| 門 | 居留地の門（大寄せ以降）が閉じる（`0x3764`（通し番号 188）= 1） | 失敗 | 🟢 |
| `0x3790`（通し番号 232）・`0x37A4`（通し番号 252） | = 1・= 2 | 失敗 | 🟢 |
| 段階・時間帯 | 600・昼 | 失敗 | 🟢 |
| 人物 | メリンダが倒れる（場面の中の出来事。`0x3759` は書き換えない） | 戦闘 | 🟢 |

ローラの好感度（`0x3792`）はこのイベントの分岐に関わらず、変わりもしない（🟢）。勢力の友好度・所持金も変わらない（🟢）。

## 前後のイベント

- 前：[願い虚しく](foreigners__after_tournament__wasted_wish.md)（大通りの戦闘から続けて起こる）
- 次：[夕暮れの船上](foreigners__after_kinugawa__twilight_on_board.md)（成功時）／[討ち入り](foreigners__after_kinugawa__the_raid.md)（失敗時）
- 結末：成功から [海外雄飛](foreigners__ending__setting_off_to_foreign_lands.md) または 討ち入り→[侍一直線](foreigners__ending__samurai_straight.md)。失敗からは討ち入り→侍一直線だけ

## 未確認のこと

- [A] は「ローラの防御力は難易度が高いほど上がる」と書く。難易度との関係は分からない。要ゲーム内確認
- [A] は「夜の大通りで魔鱗組と戦闘」と書く。始まりの時間帯は夕で、場面の中で夜に変わる（🟢）
- 🔶 開始は願い虚しくの戦闘からの連続で、単独で起こす条件（時間帯・地域以外）は分からない
- ❓ 成功したとき、位置の分からない値が 5 になる。意味は分からない
- ❓ `0x3790`・`0x37A4` の意味（ローラが死ぬ・去るときにそろって書かれる）
- 戦闘から逃げたときの扱いは分からない。要ゲーム内確認
