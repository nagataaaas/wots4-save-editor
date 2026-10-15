---
event_id: 67
state_offset: "0x36EB"

title:
  ja: 悲しみのローラ
  en: Grief-Stricken Laura

faction:
  name: 幕府
  route: >-
    イベントチャートでは幕府の剣術大会以降（520）に置かれているが、ゲーム内では起きない（未実装とみられる）。
    内容は外国ルートの[鬼怒川の魔手](foreigners__after_tournament__kinugawas_evil_influence.md)と[夕暮れの船上](foreigners__after_kinugawa__twilight_on_board.md)の間の場面にあたる。

summary: >-
  ゲーム内では起きず、このイベントの状態はどの場面でも変わらない（未実装とみられる）。
  残っている内容は、夜の領事館でローラが流れた血と伯爵の死を嘆き、英国への帰還命令を告げたうえで、傍にいてほしいと主人公に頼む場面。

summary_en: >-
  It does not occur in the game, and this event's state never changes in any scene.
  What remains is a scene at the Consulate at night in which Laura grieves over the bloodshed and the Count's death, tells of her orders to return to Britain, and asks the hero to stay by her side.

timing:
  phase: 剣術大会以降
  slot: 夜
  note: "段階 520。単独では始まらない"

location: 居留地・領事館の中

conditions:
  - flag: なし
    test: "常に偽"
    meaning: 開始条件が常に成り立たず、単独では始まらない
    confidence: 🟢

failure_conditions: []

flag_changes:
  - flag: "0x36E5"
    serial: 61
    value: "= 4"
    when: 場面の終わり
    meaning: 鬼怒川の魔手の成功。続けて夕暮れの船上になる（このイベント自身の状態 0x36EB は書き換えない）
    confidence: 🟢

sources: [U]
---

# 悲しみのローラ（Grief-Stricken Laura）

ゲーム内では起きない（未実装とみられる [U]）。イベントチャートには幕府の剣術大会以降（520）の位置に「ローラを守り抜く」という条件で載るが、状態 `0x36EB`（通し番号 67）を 1〜5 にする場面はない（🟢）。

## 流れ

残っている内容（実際に流れるかは「未確認のこと」）：

1. 夜の領事館で、ローラが大老の企みと知らずに多くの血が流れたことを嘆く
2. 日本のためにと呼んだ商人たちが、伯爵が殺されてから帰り支度を始めたこと、自分にも英国への帰還命令が下ったことを告げる
3. 「どうかこれからも……私の傍にいて下さいませんか」と頼み、外国ルートの[夕暮れの船上](foreigners__after_kinugawa__twilight_on_board.md)へ続く

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| なし | — | 選択肢はない |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| 鬼怒川の魔手の状態 `0x36E5`（通し番号 61） | = 4 | 場面の終わり | 🟢 |
| このイベントの状態 `0x36EB` | 変わらない | — | 🟢 |

## 前後のイベント

- 内容上の前：[鬼怒川の魔手](foreigners__after_tournament__kinugawas_evil_influence.md)（外国ルート。ローラを守りきる）
- 内容上の次：[夕暮れの船上](foreigners__after_kinugawa__twilight_on_board.md)
- 幕府ルートのイベントからはつながらない

## 未確認のこと

- 未実装とみられる（[U] 2026-10-06）。状態 `0x36EB` を書き換える場面がなく、単独で始まる条件も常に成り立たない（🟢）
- 🔶 同じ内容の場面が、外国ルートの[鬼怒川の魔手](foreigners__after_tournament__kinugawas_evil_influence.md)でローラを守りきって敵を倒したあとに続けて流れ、`0x36E5` = 4 にして[夕暮れの船上](foreigners__after_kinugawa__twilight_on_board.md)へ進むとみられる。そのときもチャートの「悲しみのローラ」は点かない（要ゲーム内確認）
- 開始前の失敗条件（`failure_conditions`）は空にしている。起きないイベントなので、起こせなくなる条件をたどれない
- チャート上は幕府に分類されているが、内容は外国ルートのもの。[A]・[F] の要約（[../event.md](../event.md)）には載っていない
