---
event_id: 71
state_offset: "0x36EF"

title:
  ja: お早い到着
  en: A Speedy Arrival

faction:
  name: 真ルート
  route: >-
    真ルートの1日目夕。[三姉妹見参](best__prologue__meeting_with_the_three_sisters.md)のあと、大通りの人だかりで起きる。
    成功するとそのまま1日目夜の[再起の望み](best__1_day__praying_for_recovery.md)に続く。

summary: >-
  大通りに大老 鬼怒川怨仙の行列が来る。娘に恥をかかせたと主人公が狙われ、赤城・小暮が加勢して琴吹・魔鱗組と戦う。
  戦いのあと鉄砲隊の一斉射撃で赤城が撃たれ、般若党は退く。

timing:
  phase: 1日目 夕
  slot: なし
  note: 時間帯に関係なく起きる

location: 大通り（人だかり）

conditions:
  - flag: "0x36EF"
    serial: 71
    test: "<= 0"
    meaning: まだ起きていない
    confidence: 🟢
  - flag: "0x378E"
    serial: 230
    test: "== 1"
    meaning: 真ルート
    confidence: 🟢
  - flag: 段階
    test: "== 110"
    meaning: 1日目夕
    confidence: 🟢
  - flag: 現在の地域
    test: "== 13"
    meaning: 大通りにいる
    confidence: 🟢

failure_conditions: []

flag_changes:
  - flag: "0x36EF"
    serial: 71
    value: "= 3"
    when: 人だかりに近づいて導入の場面が始まったとき
    meaning: 進行中
    confidence: 🟢
  - flag: "0x36EF"
    serial: 71
    value: "= 4"
    when: 戦闘のあと、赤城が撃たれる場面
    meaning: イベント成功
    confidence: 🟢
  - flag: 段階
    value: "= 120"
    when: 成功したとき
    meaning: 1日目夜へ進み、そのまま再起の望みが始まる
    confidence: 🟢

sources: ["[A]"]
---

# お早い到着（A Speedy Arrival）

## 流れ

1. 大通りの人だかりに近づくと、町人が大老の到着を噂している。般若党の赤城・小暮も様子を見ている（`0x36EF`（通し番号 71）= 3）
2. 大老 鬼怒川怨仙の行列が到着し、三姉妹が主人公を指して「あの男ですわ」。鬼怒川が琴吹たちをけしかける
3. 赤城（「手を貸すぜ」）と小暮が加勢し、琴吹・魔鱗組と戦闘になる。敵を一定数倒すと戦闘が終わる（🔶 10人）。琴吹・赤城・小暮は体力が半分を切ると倒れない（🔶）
4. 戦いのあと、鉄砲隊の一斉射撃で赤城が撃たれ、小暮が赤城を抱えて退く。成功（`0x36EF` = 4）
5. 段階が1日目夜（120）になり、続けて[再起の望み](best__1_day__praying_for_recovery.md)が始まる

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| — | なし | 会話と戦闘のみ |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| 段階 | 120（1日目夜） | 成功 | 🟢 |
| 時間帯を進める保留量 | 変わらない | — | 🟢 |

- 赤城の状態 `0x374E`（通し番号 166）はこのイベントでは変わらない。撃たれた赤城がどうなるかは再起の望みで決まる

## 前後のイベント

- 前：[三姉妹見参](best__prologue__meeting_with_the_three_sisters.md)
- 次：[再起の望み](best__1_day__praying_for_recovery.md)

## 未確認のこと

- 🔶 戦闘の終わる条件（敵を10人倒す）と、琴吹・赤城・小暮が倒れなくなる体力の割合
- ❓ 戦闘で負けたとき・逃げたときの扱い（このイベントに失敗の値 5 は出てこない）
