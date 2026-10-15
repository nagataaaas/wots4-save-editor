---
event_id: 64
state_offset: "0x36E8"

title:
  ja: 三匹で斬る
  en: The Three Kataneers

faction:
  name: 幕府
  route: >-
    幕府ルートで鬼怒川に背く側の2つ目。[憂国の士](shogunate__after_tournament__patriots.md)の成功後に神社へ入ると起き、
    成功すると続けて[武人 琴吹光](shogunate__after_tournament__hikaru_kotobuki_military_man.md)になる。

summary: >-
  茂呂・伯爵と三人で神社の洞窟（般若党の本拠）に奇襲をかけ、般若党を倒して最深部で赤城と小暮を斬る。
  流れは般若党壊滅と同じで、味方が茂呂と伯爵になる。神社の門は閉じない。

summary_en: >-
  With Moro and the Count, the three of you launch a surprise attack on the cave at the Shrine (the Prajna base), defeat the Prajnas, and cut down Akagi and Kogure at the deepest point.
  The flow is the same as Annihilation of the Prajnas, but your allies are Moro and the Count. The gate of the Shrine does not close.

timing:
  phase: 剣術大会以降
  slot: なし
  note: "段階 510。時間帯の条件はない（茂呂は「決行は夕刻」と言う）"

location: 神社 → 神社の洞窟（般若党の本拠）

conditions:
  - flag: "0x36E8"
    serial: 64
    test: "<= 0"
    meaning: このイベントがまだ始まっていない
    confidence: 🟢
  - flag: "0x36DF"
    serial: 55
    test: "== 4"
    meaning: 憂国の士が成功している
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
  - flag: "0x36DE"
    serial: 54
    test: ">= 3"
    meaning: 闇黒の意志で鬼怒川に従い、大老武断の側に進んだ（開始条件の憂国の士の成功 `0x36DF` = 4 が満たされなくなる）
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
  - flag: "0x36E8"
    serial: 64
    value: "= 3"
    when: 神社に入って場面が始まったとき（戦闘の区切りごとにも 3 を書き直す）
    meaning: 進行中
    confidence: 🟢
  - flag: "0x36E8"
    serial: 64
    value: "= 4"
    when: 赤城・小暮を倒し、洞窟を出たとき（または 180 秒たったとき）
    meaning: イベント成功
    confidence: 🟢
  - flag: "0x3791"
    serial: 233
    value: "= 1"
    when: 成功したとき
    meaning: 攘夷の退場（般若党などが町から出なくなる）
    confidence: 🟢
  - flag: "0x37A2"
    serial: 250
    value: "= 1"
    when: 成功したとき
    meaning: 不明（大寄せで 2 になる値）
    confidence: ❓

sources: [A]
---

# 三匹で斬る（The Three Kataneers）

## 流れ

1. [憂国の士](shogunate__after_tournament__patriots.md)の成功後（`0x36DF`（通し番号 55）= 4）、神社に入ると始まる（`0x36E8`（通し番号 64）= 3）。茂呂が「多勢に無勢だ」「慎重の上にも慎重に進むんだぞ」と言うが、伯爵が騒いで見つかり（「こっちのほうがエキサイティングでスリリングじゃないか」）、茂呂が「こんな奴 連れて来るんじゃなかった」とぼやく
2. 入口の戦闘：般若党と戦いながら奥の地点まで進む
3. 洞窟内の戦闘：敵を 40 人倒すと先へ進める
4. さらに奥の地点まで進むと、本拠で赤城・小暮と対面する。茂呂が外国の文明を取り入れないと日本は取り残されると説き、赤城が「黙れ 売国奴」と返す
5. 最深部の戦闘：赤城と小暮を斬る
6. 二人を倒すと、赤城「赤城烈斗……死しても魂は死せず」、小暮「赤城 すまん……あの世で会おう……」。茂呂が「攘夷はこれで壊滅」「もはや鬼怒川がここにいる理由はない」と言う
7. 洞窟の出口まで歩くか 180 秒たつと成功（`0x36E8` = 4）。続けて[武人 琴吹光](shogunate__after_tournament__hikaru_kotobuki_military_man.md)になる

味方の茂呂・伯爵は、体力が一定まで減ると戦線を離れる（🔶。死なない）。離れる体力の割合は、戦闘が進むほど低くなる（4 割 → 3 割 → 2 割 → 1 割）。

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| なし | — | 選択肢はない。神社に入ると始まる |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| イベントの状態 `0x36E8` | = 3 → 4 | 開始 → 成功 | 🟢 |
| `0x3791`（通し番号 233） | = 1（攘夷の退場。[best-route](../save_format/chunks/best-route/README.md)「勢力の退場」） | 成功 | 🟢 |
| `0x37A2`（通し番号 250） | = 1 | 成功 | 🟢（値）／❓（意味） |
| 人物 | 赤城・小暮が死亡 | 最深部の戦闘 | 🟢 |

[般若党壊滅](shogunate__after_tournament__annihilation_of_the_prajnas.md)と違い、神社の門（`0x37C3`（通し番号 283））と `0x3761`（通し番号 185）は書き換えない（🟢）。
報酬（所持金）・友好度・時間帯を進める保留量は変わらない（🟢）。失敗（`0x36E8` = 5）になる場面はない。

## 前後のイベント

- 前：[憂国の士](shogunate__after_tournament__patriots.md)（成功が発生条件）
- 対になる分岐：[般若党壊滅](shogunate__after_tournament__annihilation_of_the_prajnas.md)（同じ洞窟で、味方が琴吹・三姉妹・魔鱗組）
- 次：[武人 琴吹光](shogunate__after_tournament__hikaru_kotobuki_military_man.md)（続けて起きる）

## 未確認のこと

- ❓ `0x37A2` の意味
- 🔶 赤城・小暮の死亡を、人物の状態（[characters](../save_format/chunks/characters/README.md)）にどう記録するか。このイベントでは人物の状態の位置を書き換えない
- 🔶 味方が戦線を離れるだけで、失敗にはならないこと（要ゲーム内確認）
- ❓ 成功の場面で、位置の分からない値が 5 になる。意味は分からない
