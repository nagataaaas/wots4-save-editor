---
event_id: 35
state_offset: "0x36CB"

title:
  ja: 売国奴を斬れ
  en: Kill the Traitor

faction:
  name: 攘夷（般若党）
  route: >-
    攘夷（般若党）の3日目夕のイベント。成功すると夜に墓場で[真実](prajna__3_day__the_truth.md)が起き、成功しないと[夜の墓場で](prajna__3_day__at_the_cemetery_in_the_night.md)が起きる。
    港では[仕組まれた襲撃](prajna__3_day__planned_raid.md)・[罠を破れ](prajna__3_day__break_the_snare.md)へ続く。

summary: >-
  町の居酒屋で朱美から、茂呂が今夜港で外国商人から武器を受け取るという話を聞き、赤城に襲撃への加勢を頼まれる。
  引き受けるだけで成功し、戦闘・報酬はない。攘夷と敵対していると失敗する。

summary_en: >-
  At the bar in Town, Akemi tells you that Moro will receive weapons from a foreign merchant at the Harbor tonight, and Akagi asks you to join the attack.
  Simply agreeing is a success, with no fighting or reward. If you are hostile with the Prajnas, it fails.

timing:
  phase: 3日目 夕
  slot: 夕
  note: ""

location: 町の居酒屋

conditions:
  - flag: 段階
    test: "== 310"
    meaning: 3日目夕
    confidence: 🟢
  - flag: "0x36C4"
    serial: 28
    test: "> 0"
    meaning: 大老 鬼怒川怨仙が起きた
    confidence: 🟢
  - flag: "0x36CB"
    serial: 35
    test: "<= 2"
    meaning: このイベントがまだ終わっていない
    confidence: 🟢
  - flag: "0x378D"
    serial: 229
    test: "== 1"
    meaning: 通常ルート（真ルートでは 2 になり起きない）
    confidence: 🟢
  - flag: 時間帯
    test: "== 1"
    meaning: 夕
    confidence: 🟢
  - flag: 現在の地域
    test: "== 7"
    meaning: 町にいる（居酒屋に入ると導入が流れる）
    confidence: 🟢

failure_conditions: []

flag_changes:
  - flag: "0x36CB"
    serial: 35
    value: "= 1"
    when: 居酒屋に入り、朱美の話を聞く導入
    meaning: 導入を見た
    confidence: 🟢
  - flag: "0x36CB"
    serial: 35
    value: "= 4"
    when: 「いいだろう」を選んだとき
    meaning: イベント成功
    confidence: 🟢
  - flag: "0x3788"
    serial: 224
    value: "= 0"
    when: 頼みに答えたとき（引き受けても断っても）
    meaning: 攘夷との敵対状態を解く
    confidence: 🟢
  - flag: "0x36CB"
    serial: 35
    value: "= 5"
    when: 断ったとき・答えなかったとき・攘夷と敵対していたとき
    meaning: イベント失敗
    confidence: 🟢
  - flag: "0x37C5"
    serial: 285
    value: "= 1"
    when: イベントが終わるとき（成功・失敗とも）
    meaning: 🔶 この時間帯の攘夷のイベントを終えた
    confidence: 🟢
  - flag: "0x37B2"
    serial: 266
    value: "= 1"
    when: イベントが終わるとき（成功・失敗とも）
    meaning: ❓ 時間帯ごとのイベントの発生可否の並びの1つとみられる
    confidence: 🟢
  - flag: "0x37B3"
    serial: 267
    value: "= 1"
    when: イベントが終わるとき（成功・失敗とも）
    meaning: ❓ 同上
    confidence: 🟢
  - flag: 時間帯を進める保留量
    value: "+ 10"
    when: イベントが終わるとき（成功・失敗とも）
    meaning: 時間帯が進む
    confidence: 🟢

sources: [A]
---

# 売国奴を斬れ（Kill the Traitor）

## 流れ

1. 3日目夕、町の居酒屋に入ると、朱美が赤城たちに話をする（`0x36CB`（通し番号 35）= 1）
   - 鬼怒川が攘夷志士を懐柔するお触れを出したこと、茂呂が外国商人から武器を買い集めていて、今夜港で受け取ること
2. 店員を呼ぶ選択肢（「おーい！」／「お茶！」）は台詞が変わるだけ
3. 赤城に近づくと、今夜の港の襲撃に手を貸すよう頼まれる
   - 「いいだろう」：成功（`0x36CB` = 4）。「日が暮れるのを待って港に集合する」
   - 「断る」・答えない：失敗（`0x36CB` = 5）
   - 攘夷と敵対中（`0x3788`（通し番号 224）= 1）：頼まれずに失敗（`0x36CB` = 5）
4. どの終わり方でも、時間帯を進める保留量 +10、`0x37C5`（通し番号 285）・`0x37B2`（通し番号 266）・`0x37B3`（通し番号 267）= 1

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| 居酒屋・店員を呼ぶ | 「おーい！」／「お茶！」 | 台詞だけ変わる |
| 赤城の頼み | 「いいだろう」 | 成功（`0x36CB` = 4）、攘夷との敵対状態が解ける |
| 赤城の頼み | 「断る」、または答えない | 失敗（`0x36CB` = 5）。攘夷との敵対状態は解ける（`0x3788` = 0） |
| 攘夷と敵対中 | なし | 失敗（`0x36CB` = 5） |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| イベントの状態 `0x36CB` | = 1 → 4 または 5 | 導入 → 頼みへの答え | 🟢 |
| 勢力の敵対状態 | 攘夷 = 0（`0x3788`） | 頼みに答えたとき | 🟢 |
| `0x37C5`・`0x37B2`・`0x37B3` | = 1 | 終わるとき | 🟢（意味は ❓） |
| 時間帯を進める保留量 | +10 | 終わるとき | 🟢 |
| 勢力の友好度 | 変わらない | — | 🟢 |
| 所持金 | 変わらない | — | 🟢 |
| 人物 | 変わらない | — | 🟢 |

施設・朱美の好感度は変わらない。

## 前後のイベント

- 前：[血で血を洗う戦い](prajna__3_day__washing_blood_with_blood.md)（3日目昼。発生条件にはならない）
- 同じ時間帯のほかの勢力：[大老と三姉妹](shogunate__3_day__the_chief_minister_the_three_sisters.md)、[小公女倒れる](foreigners__3_day__the_ambassador_collapses.md)
- 次（3日目夜）：
  - 成功（`0x36CB` = 4）：墓場で[真実](prajna__3_day__the_truth.md)が起きる。港では、真実が成功していれば[罠を破れ](prajna__3_day__break_the_snare.md)、していなければ[仕組まれた襲撃](prajna__3_day__planned_raid.md)
  - 成功しなかった（`0x36CB` ≠ 4）：墓場で[夜の墓場で](prajna__3_day__at_the_cemetery_in_the_night.md)が起きる。港では[仕組まれた襲撃](prajna__3_day__planned_raid.md)（赤城に加勢を申し出る場面から）

## 未確認のこと

- ❓ 終わるときに、位置の分からない値（番号 1016）が 1 になる。意味は分からない
- ❓ `0x37B2`・`0x37B3` の意味（[scenario-flags](../save_format/chunks/scenario-flags/README.md) では、再起の望み・売国奴を斬れで変わる並びとしている）
