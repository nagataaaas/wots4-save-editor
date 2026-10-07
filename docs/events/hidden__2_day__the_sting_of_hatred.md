---
event_id: 74
state_offset: "0x36F2"

title:
  ja: 怒りの矛先
  en: The Sting of Hatred

faction:
  name: 隠しルート
  route: >-
    隠しルートの2日目昼。[再起の望み](hidden__1_day__praying_for_recovery.md)で赤城が死んだときに起きる。
    小暮を斬ると隠しルートの希望の光への道が閉じ、[大老暗殺計画](hidden__2_day__plot_to_assassinate_the_chief_minister.md)へ進む。

summary: >-
  赤城を失った小暮が、怒りのやり場がないと主人公に一騎打ちを挑む。倒すと小暮は「これで赤城のもとへ行ける」と息絶える。

timing:
  phase: 2日目 昼
  slot: なし
  note: ""

location: 神社（奥）

conditions:
  - flag: "0x36F2"
    serial: 74
    test: "<= 0"
    meaning: まだ起きていない
    confidence: 🟢
  - flag: "0x374E"
    serial: 166
    test: "== 1"
    meaning: 赤城が死んだ（再起の望みの失敗）
    confidence: 🟢
  - flag: "0x378E"
    serial: 230
    test: "== 1"
    meaning: 隠しルート
    confidence: 🟢
  - flag: 段階
    test: "== 200"
    meaning: 2日目昼
    confidence: 🟢
  - flag: 現在の地域
    test: "== 4"
    meaning: 神社にいる（小暮に近づく）
    confidence: 🟢

failure_conditions:
  - flag: "0x374E"
    serial: 166
    test: "== 3"
    meaning: 赤城が病院に送られて助かった（再起の望みの成功。代わりに将の器が起きる）
    confidence: 🟢
  - flag: "0x378E"
    serial: 230
    test: "== 2"
    meaning: 隠しルートを外れた（再起の望みで小暮を倒した）
    confidence: 🟢

flag_changes:
  - flag: "0x3788"
    serial: 224
    value: "= 1"
    when: 小暮に近づいて場面が始まったとき
    meaning: 攘夷と敵対する
    confidence: 🟢
  - flag: "0x36F2"
    serial: 74
    value: "= 3"
    when: 小暮に近づいて場面が始まったとき
    meaning: 進行中
    confidence: 🟢
  - flag: "0x36F2"
    serial: 74
    value: "= 4"
    when: 一騎打ちで小暮を倒したとき
    meaning: イベント成功
    confidence: 🟢
  - flag: "0x374F"
    serial: 167
    value: "= 1"
    when: 成功したとき
    meaning: 小暮死亡
    confidence: 🟢
  - flag: "0x378E"
    serial: 230
    value: "= 2"
    when: 成功したとき
    meaning: 隠しルートの希望の光への道が閉じ、大老暗殺計画へ進む
    confidence: 🟢
  - flag: "0x37A2"
    serial: 250
    value: "= 2"
    when: 成功したとき
    meaning: ❓（闇討ちの開始条件の1つだが、`0x378E` が 2 になるので闇討ちは起きない）
    confidence: 🟢
  - flag: 時間帯を進める保留量
    value: "+ 10"
    when: 成功したとき
    meaning: 時間帯を進める
    confidence: 🟢

sources: ["[A]"]
---

# 怒りの矛先（The Sting of Hatred）

## 流れ

1. 神社の奥で小暮に近づくと場面が始まる（`0x36F2`（通し番号 74）= 3、攘夷と敵対 `0x3788` = 1）
2. 小暮は「あんたを助けようとしたばかりに…」「赤城は死んだ……」と、怒りのやり場がないことを語り、一騎打ちになる
3. 小暮を倒すと「これで……俺も……赤城のもとへ行ける」と息絶える。成功（`0x36F2` = 4、小暮 `0x374F` = 1）
4. 隠しルート `0x378E` が 2 になり、以後は[大老暗殺計画](hidden__2_day__plot_to_assassinate_the_chief_minister.md)へ進む [A]

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| — | なし | 一騎打ちのみ |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| 攘夷の敵対状態 `0x3788`（通し番号 224） | 1 | 開始 | 🟢 |
| 小暮 `0x374F`（通し番号 167） | 1（死亡） | 成功 | 🟢 |
| 隠しルート `0x378E`（通し番号 230） | 2 | 成功 | 🟢 |
| `0x37A2`（通し番号 250） | 2 | 成功 | 🟢 |
| 時間帯を進める保留量 | +10 | 成功 | 🟢 |

- `0x378E` = 2 のときは、2日目昼から4日目以降（剣術大会前）まで、大通りで大老暗殺計画が起きる（大老暗殺計画の開始条件は三姉妹見参の成功と `0x378E` = 2）
- `0x378E` = 2 になると、隠しルートの2日目夕以降のイベント（伯爵に刺激を・運命のルーレット・闇討ちなど、`0x378E` = 1 が条件のもの）は起きない

## 前後のイベント

- 前：[再起の望み](hidden__1_day__praying_for_recovery.md)（失敗時）
- 次：[大老暗殺計画](hidden__2_day__plot_to_assassinate_the_chief_minister.md)

## 未確認のこと

- ❓ 一騎打ちから逃げたときの扱い（失敗の値 5 は出てこない。状態は 3 のまま残り、開始条件が「0 以下」なので再び起きない 🔶）
