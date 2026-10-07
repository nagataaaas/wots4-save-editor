---
event_id: 95
state_offset: "0x3707"

title:
  ja: 海外雄飛
  en: Setting Off to Foreign Lands

faction:
  name: 外国
  route: >-
    外国ルートの結末の一つ。鬼怒川の魔手でローラを守りきり、夕暮れの船上でローラと共に行くと答えたときだけに至る。

summary: >-
  ローラと共に英国へ渡る結末。西洋と東洋の出会いが二人を結び、いつかこの国へ戻ってくることを語る語りのあと、
  スタッフロールが流れて周回が終わる。

timing:
  phase: 結末
  slot: なし
  note: 夕暮れの船上の選択から続けて起こる

location: 黒船・甲板（夕暮れの船上から続く）

conditions:
  - flag: "0x36EC"
    serial: 68
    test: "== 4"
    meaning: 夕暮れの船上で「ローラ……」か「いつの日か戻ってこよう」を選んだ（続けて起こる）
    confidence: 🟢
  - flag: "0x36E5"
    serial: 61
    test: "== 4"
    meaning: 鬼怒川の魔手でローラを守りきった（夕暮れの船上が起こる前提）
    confidence: 🟢

failure_conditions:
  - flag: "0x36EC"
    serial: 68
    test: "== 5"
    meaning: 夕暮れの船上で「許せ 為すべき大儀が残っている…」と答えてローラと別れた（討ち入りへ進む）
    confidence: 🟢
  - flag: "0x36E5"
    serial: 61
    test: "== 5"
    meaning: 鬼怒川の魔手で、魔鱗組との戦闘中にローラの体力が尽きた（ローラが死亡し、夕暮れの船上が起きない）
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
  - flag: "0x3707"
    serial: 95
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

# 海外雄飛（Setting Off to Foreign Lands）

## 流れ

1. [夕暮れの船上](foreigners__after_kinugawa__twilight_on_board.md)で「ローラ……」か「いつの日か戻ってこよう」を選ぶと、そのまま結末になる。`0x3707`（通し番号 95）= 4
2. 語り：歴史の上で西洋と東洋の出会いは常に不幸だったが、ローラと侍は互いに素晴らしい出会いをした。東洋で咲いた愛を西洋で育み、いつの日か二人でこの国に戻ってくる
3. スタッフロール（飛ばせる）。段階が 999 になり、周回が終わる

## 選択肢

選択肢はない。この結末に至る分岐は前のイベントにある。

| 場面 | 選択肢 | 結果 |
|---|---|---|
| 夕暮れの船上 | 「ローラ……」／「いつの日か戻ってこよう」 | この結末（`0x3707` = 4） |
| 夕暮れの船上 | 「許せ 為すべき大儀が残っている…」 | この結末にはならない（討ち入りへ） |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| イベントの状態 `0x3707` | = 4 | 結末の始まり | 🟢 |
| 段階 | = 999 | 結末の終わり | 🟢 |
| 周回をまたぐ記録 B `0x3897`（`0x3838` + 95） | 周回の終わりに A の内容が写る | 周回の終わり | 🔶 |

ローラ（`0x3757`）・居留地の門（`0x3764`）は変わらない（🟢）。

## 前後のイベント

- 前：[夕暮れの船上](foreigners__after_kinugawa__twilight_on_board.md)（共に行く）。その前は [鬼怒川の魔手](foreigners__after_tournament__kinugawas_evil_influence.md)（成功）
- 外国ルートのもう一つの結末：[侍一直線](foreigners__ending__samurai_straight.md)

## 未確認のこと

- 🔶 記録 B への写り方（結末のあと、チャートに名前が出るか）は要ゲーム内確認
- [A] の条件「ローラの誘いに乗る」と合う。ローラの好感度（`0x3792`）はこの結末の条件に入らない（🟢）
