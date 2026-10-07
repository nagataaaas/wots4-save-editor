---
event_id: 96
state_offset: "0x3708"

title:
  ja: 侍一直線
  en: Samurai Straight

faction:
  name: 外国
  route: >-
    外国ルートの結末の一つ。ローラが死ぬか、夕暮れの船上でローラと別れたあと、討ち入りで三姉妹を倒すと至る。

summary: >-
  侍が鬼怒川を追って江戸へ向かう結末。その後の侍を誰も知らないという語りのあと、スタッフロールが流れて周回が終わる。
  夕暮れの船上でローラと別れていたときは、語りに続きがつく。

timing:
  phase: 結末
  slot: なし
  note: 討ち入りの成功から続けて起こる（代官所の中で所定の場所に着くか、180 秒たつと始まる）

location: 代官所（討ち入りから続く）

conditions:
  - flag: "0x36ED"
    serial: 69
    test: "== 4"
    meaning: 討ち入りで三姉妹を倒した（続けて起こる）
    confidence: 🟢

failure_conditions:
  - flag: "0x36EC"
    serial: 68
    test: "== 4"
    meaning: 夕暮れの船上でローラと共に行くと答えた（海外雄飛の結末になり、討ち入りが起きない）
    confidence: 🟢
  - flag: "0x36D8"
    serial: 48
    test: "== 5"
    meaning: 剣術大会（外国）で負けた・降参した（最後通告へ進み、剣術大会以降の外国のイベントが起きない）
    confidence: 🟢
  - flag: "0x370A"
    serial: 98
    test: "== 4"
    meaning: 優勝後の表彰式で表彰台に上がった（釜茹で侍の結末へ進み、剣術大会以降の外国のイベントが起きない）
    confidence: 🟢

flag_changes:
  - flag: "0x3708"
    serial: 96
    value: "= 4"
    when: 結末の場面が始まったとき
    meaning: この結末を見た
    confidence: 🟢
  - flag: 段階
    value: "= 999"
    when: 結末の場面が終わったとき
    meaning: 周回の終わり
    confidence: 🟢

sources: [A]
---

# 侍一直線（Samurai Straight）

## 流れ

1. [討ち入り](foreigners__after_kinugawa__the_raid.md)で三姉妹を倒し、代官所の中で所定の場所に着くか 180 秒たつと、結末になる。`0x3708`（通し番号 96）= 4
2. 語り：侍は鬼怒川を追って江戸へ向かった。目的を遂げたのか、命を散らしたのか、その後は誰も知らない
3. `0x36EC`（夕暮れの船上、通し番号 68）が 5（ローラと別れた）のときだけ、続きの語りがつく：その時代の多くの若者と同じく、侍も国を憂い、あえて苦難の道を選んだのだ
4. スタッフロール（飛ばせる）。段階が 999 になり、周回が終わる

## 選択肢

選択肢はない。語りの長さは前のイベントの結果で分かれる。

| 前の結果 | 語り |
|---|---|
| 夕暮れの船上でローラと別れた（`0x36EC` = 5） | 江戸へ向かった語り＋「あえて苦難の道を選んだ」の続き |
| 鬼怒川の魔手でローラが死んだ（`0x36E5` = 5、`0x36EC` は 5 でない） | 江戸へ向かった語りだけ |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| イベントの状態 `0x3708` | = 4 | 結末の始まり | 🟢 |
| 段階 | = 999 | 結末の終わり | 🟢 |
| 周回をまたぐ記録 B `0x3898`（`0x3838` + 96） | 周回の終わりに A の内容が写る | 周回の終わり | 🔶 |

## 前後のイベント

- 前：[討ち入り](foreigners__after_kinugawa__the_raid.md)（三姉妹を倒す）。その前は [鬼怒川の魔手](foreigners__after_tournament__kinugawas_evil_influence.md)（失敗）または [夕暮れの船上](foreigners__after_kinugawa__twilight_on_board.md)（失敗）
- 外国ルートのもう一つの結末：[海外雄飛](foreigners__ending__setting_off_to_foreign_lands.md)

## 未確認のこと

- 🔶 結末が始まる「所定の場所」がどこか、180 秒の扱いは要ゲーム内確認
- 🔶 記録 B への写り方は要ゲーム内確認
- [A] の条件「【討ち入り】で三姉妹に勝つ」と合う。イベントチャートの条件文「鬼怒川を追いかける」は語りの内容に当たる
