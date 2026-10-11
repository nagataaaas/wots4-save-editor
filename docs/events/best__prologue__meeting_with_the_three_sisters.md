---
event_id: 70
state_offset: "0x36EE"

title:
  ja: 三姉妹見参
  en: Meeting with the Three Sisters

faction:
  name: 真ルート
  route: >-
    真ルートの入口。[阿弥浜港争乱](other__prologue__amihama_harbor_skirmish.md)で大砲を操作している般若党を倒していると、3連戦のあとにこのイベントへ続く。
    成功すると真ルートに入り、1日目夕の[お早い到着](best__1_day__a_speedy_arrival.md)へ進む。

summary: >-
  阿弥浜港争乱の3連戦の直後、鬼怒川三姉妹（万由・千佳・百合）が港に乗り込んできて戦闘になる。3人とも倒しきれず、一定まで削ると倒れて退散する。
  成功すると真ルートに入り、段階が1日目夕に飛ぶ。

timing:
  phase: 序章
  slot: 昼
  note: 阿弥浜港争乱から続けて起きる。チャートの枠からは開始しない

location: 港（騒乱）

conditions:
  - flag: "0x379F"
    serial: 247
    test: "== 1"
    meaning: 序章の大砲の状態。阿弥浜港争乱の赤城戦の最中に、大砲を操作している般若党を倒すと 1 になる
    confidence: 🟢
  - flag: "0x36A9"
    serial: 1
    test: "== 4"
    meaning: 阿弥浜港争乱の3連戦を終えた（大砲の状態が 1 のとき、3連戦の最後で阿弥浜港争乱を成功にしてからこのイベントへ進む）
    confidence: 🟢

failure_conditions:
  - flag: "0x379F"
    serial: 247
    test: "== 0"
    meaning: 阿弥浜港争乱の赤城戦で、大砲を操作している般若党を倒さないまま3連戦を終えた（このイベントへ進まない）
    confidence: 🟢

flag_changes:
  - flag: "0x378D"
    serial: 229
    value: "= 1"
    when: 阿弥浜港争乱の3連戦の最後（このイベントに入る直前）
    meaning: 序章を終えた印。1 のあいだだけ通常の1〜3日目のイベントが起きる
    confidence: 🟢
  - flag: "0x36EE"
    serial: 70
    value: "= 3"
    when: 三姉妹が現れる場面
    meaning: 進行中
    confidence: 🟢
  - flag: "0x36EE"
    serial: 70
    value: "= 4"
    when: 三姉妹を全員退けたあとの場面
    meaning: イベント成功
    confidence: 🟢
  - flag: "0x3786"
    serial: 222
    value: "= 0"
    when: 成功したとき
    meaning: 幕府との敵対状態を解く
    confidence: 🟢
  - flag: "0x3787"
    serial: 223
    value: "= 0"
    when: 成功したとき
    meaning: 外国との敵対状態を解く
    confidence: 🟢
  - flag: "0x3788"
    serial: 224
    value: "= 0"
    when: 成功したとき
    meaning: 攘夷との敵対状態を解く
    confidence: 🟢
  - flag: "0x377D"
    serial: 213
    value: "= 1"
    when: 成功したとき
    meaning: 代官所の門（大寄せ前）を開く／幕府からの勧誘
    confidence: 🟢
  - flag: "0x377E"
    serial: 214
    value: "= 1"
    when: 成功したとき
    meaning: 居留地の門（大寄せ前）を開く
    confidence: 🟢
  - flag: "0x377F"
    serial: 215
    value: "= 1"
    when: 成功したとき
    meaning: 神社の門（大寄せ前）を開く
    confidence: 🟢
  - flag: "0x378E"
    serial: 230
    value: "= 1"
    when: 成功したとき
    meaning: 真ルートに入る
    confidence: 🟢
  - flag: "0x378D"
    serial: 229
    value: "= 2"
    when: 成功したとき
    meaning: 通常の1〜3日目のイベントが起きなくなる
    confidence: 🟢
  - flag: 段階
    value: "= 110"
    when: 成功したとき
    meaning: 1日目夕へ飛ぶ（1日目昼のイベントは起きない）
    confidence: 🟢

sources: ["[A]"]
---

# 三姉妹見参（Meeting with the Three Sisters）

## 流れ

1. [阿弥浜港争乱](other__prologue__amihama_harbor_skirmish.md)の赤城戦の最中に、大砲を操作している般若党2人を倒す（序章の大砲の状態 `0x379F`（通し番号 247）が 1 になる）[A]
2. 赤城・琴吹・メリンダとの3連戦 [A] を終えると、阿弥浜港争乱が成功（`0x36A9`（通し番号 1）= 4）になり、`0x378D`（通し番号 229）が 1 になる。大砲の状態が 1 ならこのイベントへ続く（0 なら通常の序章の結末へ進む）
3. 三姉妹が船で港に乗り込んできて「そこの貴方 お相手して頂けます」と戦闘になる（`0x36EE`（通し番号 70）= 3）
4. 三姉妹は倒しきれない。体力を一定まで削ると倒れる（🔶 [A] では半分まで）。3人とも倒れると捨て台詞を残して退散する
5. 町人に喝采され、赤城・小暮・朱美、琴吹、ローラ・J.J・茂呂がそれぞれ主人公に声をかけて去る。成功（`0x36EE` = 4）。段階が1日目夕に進む

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| — | なし | 戦闘のみ |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| 真ルート `0x378E`（通し番号 230） | 0 → 1 | 成功 | 🟢 |
| `0x378D`（通し番号 229） | 1 → 2。2 のあいだ通常の1〜3日目のイベント（志士との出会い・代官所の面々・小公女謁見など）は起きない | 成功 | 🟢 |
| 勢力の敵対状態 `0x3786`〜`0x3788`（通し番号 222〜224） | 幕府・外国・攘夷すべて 0 | 成功 | 🟢 |
| 大寄せ前の門 `0x377D`〜`0x377F`（通し番号 213〜215） | 代官所・居留地・神社すべて 1（開く） | 成功 | 🟢 |
| 段階 | 110（1日目夕） | 成功 | 🟢 |

- 真ルートに入るには `0x378E` = 1 と、このイベントの成功（`0x36EE` = 4）の両方が要る（[best-route](../save_format/chunks/best-route/README.md)）
- 序章の大砲の状態 `0x379F` はこのイベントの成否では変わらない

## 前後のイベント

- 前：[阿弥浜港争乱](other__prologue__amihama_harbor_skirmish.md)
- 次：[お早い到着](best__1_day__a_speedy_arrival.md)

## 未確認のこと

- 🔶 三姉妹が倒れる体力の割合（[A] は半分。4割前後の可能性がある）
- ❓ 三姉妹との戦闘で負けたとき・逃げたときの扱い（このイベントに失敗の値 5 は出てこない）
