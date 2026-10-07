---
event_id: 59
state_offset: "0x36E3"

title:
  ja: 般若党壊滅
  en: Annihilation of the Prajnas

faction:
  name: 幕府
  route: >-
    幕府ルートで鬼怒川に従う側の2つ目。[大老武断](shogunate__after_tournament__chief_minister_at_war.md)の成功後に神社へ入ると起き、
    成功すると続けて[黒船を我が手に](shogunate__after_tournament__black_ship_in_hand.md)になる。

summary: >-
  琴吹・三姉妹・魔鱗組と、英国の大砲を携えて神社の洞窟（般若党の本拠）へ攻め込む。洞窟を進んで般若党を倒し、最深部で赤城と小暮を斬る。
  成功すると神社の門が閉じる。

timing:
  phase: 剣術大会以降
  slot: なし
  note: "段階 510。時間帯の条件はない"

location: 神社 → 神社の洞窟（般若党の本拠）

conditions:
  - flag: "0x36E3"
    serial: 59
    test: "<= 0"
    meaning: このイベントがまだ始まっていない
    confidence: 🟢
  - flag: "0x36DE"
    serial: 54
    test: "== 4"
    meaning: 大老武断が成功している
    confidence: 🟢
  - flag: "0x3789"
    serial: 225
    test: "== 1"
    meaning: 幕府ルートに入れる
    confidence: 🟢
  - flag: 段階
    test: "== 510"
    meaning: 剣術大会以降（510）
    confidence: 🟢
  - flag: 現在の地域
    test: "== 4"
    meaning: 神社に入った
    confidence: 🟢

failure_conditions:
  - flag: "0x36DF"
    serial: 55
    test: ">= 3"
    meaning: 闇黒の意志で鬼怒川を拒み、憂国の士の側に進んだ（開始条件の大老武断の成功 `0x36DE` = 4 が満たされなくなる）
    confidence: 🟢
  - flag: "0x3789"
    serial: 225
    test: "== 2"
    meaning: 幕府ルートが閉じた（大寄せで入れないと決まった、公儀の剣で失敗した、東国の騎士・志士の刀を引き受けた、最後通告を見た）
    confidence: 🟢
  - flag: 段階
    test: "> 510"
    meaning: このイベントを起こさないまま、剣術大会以降の次の段階（520 以降）に進んだ
    confidence: 🟢

flag_changes:
  - flag: "0x36E3"
    serial: 59
    value: "= 3"
    when: 神社に入って場面が始まったとき
    meaning: 進行中
    confidence: 🟢
  - flag: "0x37AE"
    serial: 262
    value: "= 0 → 1 → 2 → 3 → 99"
    when: 戦闘の区切りごと（開始、入口の突破、40人を倒したあと、最深部の手前、赤城・小暮を倒したあと）
    meaning: イベント内の進み具合（ほかのイベントでも使い回す値）
    confidence: 🟢
  - flag: "0x36E3"
    serial: 59
    value: "= 4"
    when: 赤城・小暮を倒し、洞窟を出たとき（または 180 秒たったとき）
    meaning: イベント成功
    confidence: 🟢
  - flag: "0x3791"
    serial: 233
    value: "= 1"
    when: 成功したとき
    meaning: 不明（三匹で斬るの成功でも 1 になる）
    confidence: ❓
  - flag: "0x37A2"
    serial: 250
    value: "= 1"
    when: 成功したとき
    meaning: 不明（大寄せで 2 になる値）
    confidence: ❓
  - flag: "0x37C3"
    serial: 283
    value: "= 1"
    when: 成功したとき
    meaning: 神社の門を閉じる
    confidence: 🟢
  - flag: "0x3761"
    serial: 185
    value: "= 1"
    when: 成功したとき
    meaning: 不明（大寄せで 1 になる値）
    confidence: ❓

sources: [A]
---

# 般若党壊滅（Annihilation of the Prajnas）

## 流れ

1. [大老武断](shogunate__after_tournament__chief_minister_at_war.md)の成功後（`0x36DE`（通し番号 54）= 4）、神社に入ると始まる（`0x36E3`（通し番号 59）= 3）。琴吹が「これから般若党の本拠に突入する」「我らには英国の最新大砲あり」と号令をかける
2. 入口の戦闘：般若党と戦いながら奥の地点まで進む
3. 洞窟内の戦闘：般若党が「すげえ大砲だ」「扉を閉めろ」と守りを固める。敵を 40 人倒すと先へ進める
4. さらに奥の地点まで進むと、本拠で赤城・小暮と対面する。三姉妹が大砲を見せつけ、赤城が「毛唐の武器に頼るとは恥を知れ」と言い、大砲が撃ち込まれる
5. 最深部の戦闘：赤城と小暮を斬る。二人に近づくか攻撃すると場面が挟まる
6. 二人を倒すと、赤城「死して尚 我が魂は戦い続ける……」、小暮「刀であの世へ送られるのが せめてもの救いか……」。琴吹が攘夷殲滅を喜び、大老に報告せねばと言う
7. 洞窟の出口まで歩くか 180 秒たつと成功（`0x36E3` = 4）。神社の門が閉じ（`0x37C3`（通し番号 283）= 1）、続けて[黒船を我が手に](shogunate__after_tournament__black_ship_in_hand.md)になる

味方（琴吹・三姉妹・魔鱗組・大砲の兵）は、体力が一定まで減ると戦線を離れる（🔶。死なない）。離れる体力の割合は、戦闘が進むほど低くなる（5 割 → 4 割 → 3 割 → 1 割 → 1 分）。

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| なし | — | 選択肢はない。神社に入ると始まる |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| イベントの状態 `0x36E3` | = 3 → 4 | 開始 → 成功 | 🟢 |
| 神社の門 `0x37C3`（通し番号 283） | = 1（閉じる） | 成功 | 🟢 |
| `0x3791`（通し番号 233） | = 1 | 成功 | 🟢（値）／❓（意味） |
| `0x37A2`（通し番号 250） | = 1 | 成功 | 🟢（値）／❓（意味） |
| `0x3761`（通し番号 185） | = 1 | 成功 | 🟢（値）／❓（意味） |
| 進み具合 `0x37AE`（通し番号 262） | 0・1・2・3・99 | 戦闘の区切り | 🟢 |
| 人物 | 赤城・小暮が死亡 | 最深部の戦闘 | 🟢 |

報酬（所持金）・友好度・時間帯を進める保留量は変わらない（🟢）。失敗（`0x36E3` = 5）になる場面はなく、戦闘から逃げる手段もない（🔶）。

## 前後のイベント

- 前：[大老武断](shogunate__after_tournament__chief_minister_at_war.md)（成功が発生条件）
- 対になる分岐：[三匹で斬る](shogunate__after_tournament__the_three_kataneers.md)（同じ洞窟で、味方が茂呂・伯爵）
- 次：[黒船を我が手に](shogunate__after_tournament__black_ship_in_hand.md)（続けて起きる）

## 未確認のこと

- ❓ `0x3791`・`0x37A2`・`0x3761` の意味。`0x37A2`・`0x3761` は大寄せでも書き換わる（[scenario-flags](../save_format/chunks/scenario-flags/README.md)）。このイベントでは 1 になる
- 🔶 赤城・小暮の死亡を、人物の状態（[characters](../save_format/chunks/characters/README.md)）にどう記録するか。このイベントでは人物の状態の位置を書き換えない
- 🔶 味方が戦線を離れるだけで、失敗にはならないこと（要ゲーム内確認）
- ❓ 成功の場面で、位置の分からない値が 5 になる。意味は分からない
