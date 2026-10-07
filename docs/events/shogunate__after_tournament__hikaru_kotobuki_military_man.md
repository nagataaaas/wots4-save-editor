---
event_id: 66
state_offset: "0x36EA"

title:
  ja: 武人 琴吹光
  en: Hikaru Kotobuki, Military Man

faction:
  name: 幕府
  route: >-
    幕府ルートで鬼怒川に背く側の最後のイベント。[三匹で斬る](shogunate__after_tournament__the_three_kataneers.md)の成功に続けて起き、
    琴吹と魔鱗組を全員倒すと結末[変わり往く心](shogunate__ending__a_change_of_heart.md)になる。

summary: >-
  洞窟から出た茂呂・伯爵・主人公を、琴吹が魔鱗組と大砲を連れて待ち構える。反逆者として三人を見逃せない琴吹と戦い、全員を倒す。
  琴吹は最後まで幕臣であったと伝えてくれと言い残して死に、伯爵が三人を領事館にかくまう。

timing:
  phase: 剣術大会以降
  slot: 夜
  note: "三匹で斬るから続けて起き、単独では起きない。始まると段階を 520、時間帯を夜にする"

location: 神社（洞窟の外）

conditions:
  - flag: "0x36E8"
    serial: 64
    test: "== 4"
    meaning: 三匹で斬るが成功した（成功の直後に続けて始まる）
    confidence: 🟢

failure_conditions:
  - flag: "0x36DE"
    serial: 54
    test: ">= 3"
    meaning: 闇黒の意志で鬼怒川に従い、大老武断の側に進んだ（前の三匹で斬るが起きない）
    confidence: 🟢
  - flag: "0x3789"
    serial: 225
    test: "== 2"
    meaning: 幕府ルートが閉じ、前の三匹で斬るが起きない（大寄せで入れないと決まった、公儀の剣で失敗した、東国の騎士・志士の刀を引き受けた、最後通告を見た）
    confidence: 🟢
  - flag: 段階
    test: "> 510"
    meaning: 三匹で斬るを起こさないまま、剣術大会以降の次の段階（520 以降）に進んだ
    confidence: 🟢

flag_changes:
  - flag: 段階
    value: "= 520"
    when: 場面の開始
    meaning: 剣術大会以降（520）にする
    confidence: 🟢
  - flag: 時間帯
    value: "= 2"
    when: 場面の開始
    meaning: 夜にする
    confidence: 🟢
  - flag: "0x3786"
    serial: 222
    value: "= 0"
    when: 場面の開始
    meaning: 幕府との敵対状態を解く
    confidence: 🟢
  - flag: "0x3787"
    serial: 223
    value: "= 0"
    when: 場面の開始
    meaning: 外国との敵対状態を解く
    confidence: 🟢
  - flag: "0x36EA"
    serial: 66
    value: "= 3"
    when: 場面の開始
    meaning: 進行中
    confidence: 🟢
  - flag: "0x36EA"
    serial: 66
    value: "= 4"
    when: 琴吹と魔鱗組（敵）を全員倒したとき
    meaning: イベント成功。続けて結末の変わり往く心になる
    confidence: 🟢

sources: [A]
---

# 武人 琴吹光（Hikaru Kotobuki, Military Man）

## 流れ

1. [三匹で斬る](shogunate__after_tournament__the_three_kataneers.md)が成功すると、続けて夜の神社（洞窟の外）の場面になる。段階が 520、時間帯が夜になり、幕府・外国との敵対状態（`0x3786`（通し番号 222）・`0x3787`（通し番号 223））が 0 になる。`0x36EA`（通し番号 66）= 3
2. 琴吹が魔鱗組と大砲を連れて待ち構えている。「茂 どうしておまえがここに……」と驚き、茂呂の狙いが大老を江戸へ帰らせることだと見抜く
3. 琴吹は、茂呂にはすでに反逆者の烙印が押されていて見て見ぬ振りはできないと言い、戦闘になる
4. 琴吹と魔鱗組（敵）を全員倒す。琴吹は倒れると死ぬ。味方の茂呂・伯爵は体力が一定まで減ると戦線を離れる（🔶）
5. 全員を倒すと、琴吹は「阿弥浜代官 琴吹光は 最後まで幕臣であったと……」と言い残して死ぬ。茂呂は「恨むなら時代を恨もうな」とつぶやき、伯爵が「キミたちを幕府方には渡すものか」「領事館に来たまえ かくまってやる」と言う
6. 成功（`0x36EA` = 4）。続けて結末[変わり往く心](shogunate__ending__a_change_of_heart.md)になる

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| なし | — | 選択肢はない |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| イベントの状態 `0x36EA` | = 3 → 4 | 開始 → 全員を倒す | 🟢 |
| 勢力の敵対状態 | 幕府 `0x3786` = 0、外国 `0x3787` = 0 | 開始 | 🟢 |
| 段階 | = 520 | 開始 | 🟢 |
| 時間帯 | = 2（夜） | 開始 | 🟢 |
| 人物 | 琴吹が死亡 | 戦闘 | 🟢 |

報酬・友好度・時間帯を進める保留量は変わらない（🟢）。琴吹の状態（`0x3751`（通し番号 169））はこのイベントでは書き換えない（🟢）。
戦闘から逃げる手段はなく、失敗（`0x36EA` = 5）になる場面はない（🔶）。

## 前後のイベント

- 前：[三匹で斬る](shogunate__after_tournament__the_three_kataneers.md)（成功に続けて起きる）
- 対になる分岐の最後：[剣客 茂呂茂](shogunate__after_tournament__shigeru_moro_swordsman.md)
- 次：[変わり往く心](shogunate__ending__a_change_of_heart.md)（全員を倒すと続けて起きる）

## 未確認のこと

- [A] は「琴吹・魔鱗組を全員倒す」と書く。琴吹の側には大砲の兵もいて、成功には敵を全員倒す必要がある（🔶 大砲の兵が倒す相手に含まれるか）
- 🔶 味方の茂呂・伯爵が戦線を離れるだけで、失敗にはならないこと（要ゲーム内確認）
- 🔶 主人公が倒れたときの扱い
