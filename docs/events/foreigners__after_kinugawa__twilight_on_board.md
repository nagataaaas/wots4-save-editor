---
event_id: 68
state_offset: "0x36EC"

title:
  ja: 夕暮れの船上
  en: Twilight On Board

faction:
  name: 外国
  route: >-
    鬼怒川の魔手でローラを守りきったときの最後の分かれ道。ローラと英国へ行くと
    [海外雄飛](foreigners__ending__setting_off_to_foreign_lands.md)、断ると[討ち入り](foreigners__after_kinugawa__the_raid.md)へ進む。

summary: >-
  帰国するローラの船の上で、夕暮れの景色を前にローラが想いを打ち明ける。共に行くと答えれば海外雄飛の結末になる。
  「為すべき大儀が残っている」と断ると、主人公は船を降り、ローラは一人で去る。居留地の門が閉じ、討ち入りへ進む。

timing:
  phase: 鬼怒川の魔手以降（600）
  slot: 夕
  note: 鬼怒川の魔手の成功（領事館の場面）から続けて起こる。始まると段階 600・時間帯が夕になる

location: 黒船・甲板（ローラの帰国の船）

conditions:
  - flag: "0x36E5"
    serial: 61
    test: "== 4"
    meaning: 鬼怒川の魔手でローラを守りきった（続けて起こる）
    confidence: 🔶
  - flag: 時間帯
    test: "== 0"
    meaning: 昼
    confidence: 🟢
  - flag: 現在の地域
    test: "== 2"
    meaning: 黒船の甲板
    confidence: 🟢

failure_conditions:
  - flag: "0x36E5"
    serial: 61
    test: "== 5"
    meaning: 前の鬼怒川の魔手で、魔鱗組との戦闘中にローラの体力が尽きた（ローラが死亡し、討ち入りへ進む）
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
  - flag: 段階
    value: "= 600"
    when: 場面が始まったとき
    meaning: 鬼怒川の魔手以降（600）
    confidence: 🟢
  - flag: 時間帯
    value: "= 1"
    when: 場面が始まったとき
    meaning: 夕になる
    confidence: 🟢
  - flag: "0x36EC"
    serial: 68
    value: "= 4"
    when: 「ローラ……」「いつの日か戻ってこよう」を選んだとき
    meaning: イベント成功（そのまま海外雄飛へ）
    confidence: 🟢
  - flag: "0x36EC"
    serial: 68
    value: "= 5"
    when: 「許せ 為すべき大儀が残っている…」を選んだとき
    meaning: イベント失敗（ローラが去る）
    confidence: 🟢
  - flag: "0x3764"
    serial: 188
    value: "= 1"
    when: 断ったとき
    meaning: 居留地の門（大寄せ以降）が閉じる
    confidence: 🟢
  - flag: "0x3790"
    serial: 232
    value: "= 1"
    when: 断ったとき
    meaning: 外国の退場（外国勢が町から出なくなる）
    confidence: 🟢
  - flag: "0x37A4"
    serial: 252
    value: "= 2"
    when: 断ったとき
    meaning: 不明（同上）
    confidence: 🟢

sources: [A]
---

# 夕暮れの船上（Twilight On Board）

## 流れ

1. [鬼怒川の魔手](foreigners__after_tournament__kinugawas_evil_influence.md)の最後に、ローラから「私の傍にいて下さいませんか」と頼まれたあと、そのまま帰国の船の甲板の場面になる。段階 600、時間帯が夕になる
2. ローラが、初めて船で来たときの期待と、この国での辛い出来事を振り返り、「あなたに出会えたから」この国に来て良かったと打ち明ける
3. 主人公の返答で分かれる
   - 「ローラ……」「いつの日か戻ってこよう」：ローラが「必ず戻って来ましょうね」と応じ、`0x36EC`（通し番号 68）= 4（成功）。そのまま[海外雄飛](foreigners__ending__setting_off_to_foreign_lands.md)の結末になる
   - 「許せ 為すべき大儀が残っている…」：主人公が船を降り、ローラは「やっぱりあなたは 侍だったのですね」と見送る。`0x36EC` = 5（失敗）。居留地の門が閉じ（`0x3764` = 1）、以後は[討ち入り](foreigners__after_kinugawa__the_raid.md)へ進む

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| ローラの告白 | 「ローラ……」 | 成功（`0x36EC` = 4）→ 海外雄飛 |
| ローラの告白 | 「いつの日か戻ってこよう」 | 成功（`0x36EC` = 4）→ 海外雄飛 |
| ローラの告白 | 「許せ 為すべき大儀が残っている…」 | 失敗（`0x36EC` = 5）。ローラが去り、居留地の門が閉じる → 討ち入り |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| 段階・時間帯 | 600・夕 | 場面の始まり | 🟢 |
| イベントの状態 `0x36EC` | = 4 | 共に行く | 🟢 |
| イベントの状態 `0x36EC` | = 5 | 断る | 🟢 |
| 門 | 居留地の門（大寄せ以降）が閉じる（`0x3764`（通し番号 188）= 1） | 断る | 🟢 |
| `0x3790`（通し番号 232）・`0x37A4`（通し番号 252） | = 1・= 2 | 断る | 🟢 |
| 人物 | ローラは死なない（`0x3757` は書き換えない）。阿弥浜を去る | 断る | 🟢 |

ローラの好感度（`0x3792`）は分岐に関わらない（🟢）。勢力の友好度・所持金は変わらない（🟢）。

## 前後のイベント

- 前：[鬼怒川の魔手](foreigners__after_tournament__kinugawas_evil_influence.md)（成功から続けて起こる）
- 次：[海外雄飛](foreigners__ending__setting_off_to_foreign_lands.md)（共に行く）／[討ち入り](foreigners__after_kinugawa__the_raid.md)（断る）
- 断ったあと討ち入りで三姉妹に勝つと [侍一直線](foreigners__ending__samurai_straight.md)。このとき結末の語りが長い版になる（`0x36EC` = 5 のとき）

## 未確認のこと

- 🔶 開始は鬼怒川の魔手の成功からの連続で、単独で起こす条件（時間帯・地域以外）は分からない
- ❓ 断ったとき、位置の分からない値が 5 になる。選択肢の場面の前後で同じ値が 6 になることもある。意味は分からない
- ❓ `0x37A4` の意味。`0x3790` は外国の退場（外国勢が町から出なくなる。[best-route](../save_format/chunks/best-route/README.md)「勢力の退場」）
- [A] は海外雄飛の条件を「ローラの誘いに乗る」とだけ書く。選択肢の3つのうち2つが共に行く側（🟢）
