---
event_id: 72
state_offset: "0x36F0"

title:
  ja: 再起の望み
  en: Praying for Recovery

faction:
  name: 真ルート
  route: >-
    真ルートの1日目夜。[お早い到着](best__1_day__a_speedy_arrival.md)から続けて起きる。
    赤城を病院に運んで助けると2日目昼の[将の器](best__2_day__ability_to_lead.md)へ、赤城が死ぬと[怒りの矛先](best__2_day__the_sting_of_hatred.md)へ分かれる。

summary: >-
  撃たれた赤城が神社の奥で寝かされ、医者は手の施しようがないと言う。病院が開いていれば「英国の病院に連れて行こう」を選べ、赤城は手術で助かる（成功）。
  病院が閉じている、別の答えを選ぶ、赤城にとどめを刺す、のいずれかで赤城が死ぬ（失敗）。

timing:
  phase: 1日目 夜
  slot: 夜
  note: 始まると時間帯が夜になる

location: 神社（奥）→ 居留地・病院

conditions:
  - flag: "0x36F0"
    serial: 72
    test: "<= 3"
    meaning: まだ終わっていない
    confidence: 🟢
  - flag: "0x378E"
    serial: 230
    test: "== 1"
    meaning: 真ルート
    confidence: 🟢
  - flag: 段階
    test: "== 120"
    meaning: 1日目夜
    confidence: 🟢
  - flag: 現在の地域
    test: "== 4"
    meaning: 神社にいる（お早い到着から続けて始まる。途中で離れた場合は神社の小暮に話しかけると再開する）
    confidence: 🟢

failure_conditions: []

flag_changes:
  - flag: 時間帯
    value: "= 2"
    when: 始まったとき
    meaning: 夜
    confidence: 🔶
  - flag: "0x36F0"
    serial: 72
    value: "= 3"
    when: 医者の場面が始まったとき
    meaning: 進行中
    confidence: 🟢
  - flag: "0x36F0"
    serial: 72
    value: "= 4"
    when: 病院で手術が終わった場面
    meaning: イベント成功
    confidence: 🟢
  - flag: "0x374E"
    serial: 166
    value: "= 3"
    when: 成功したとき
    meaning: 赤城は病院に送られて助かった
    confidence: 🟢
  - flag: "0x37B2"
    serial: 266
    value: "= 1"
    when: 成功したとき
    meaning: ❓（時間帯ごとのイベントの発生可否の並びの1つとみられる）
    confidence: 🟢
  - flag: "0x37B3"
    serial: 267
    value: "= 1"
    when: 成功したとき
    meaning: ❓（同上）
    confidence: 🟢
  - flag: "0x37C7"
    serial: 287
    value: "= 1"
    when: 成功したとき
    meaning: ❓
    confidence: 🟢
  - flag: "0x36F0"
    serial: 72
    value: "= 5"
    when: 赤城が死んだとき（病院が閉じている、病院へ運ばない答えを選んだ、赤城にとどめを刺した）
    meaning: イベント失敗
    confidence: 🟢
  - flag: "0x374E"
    serial: 166
    value: "= 1"
    when: 赤城が死んだとき
    meaning: 赤城死亡
    confidence: 🟢
  - flag: "0x3791"
    serial: 233
    value: "= 1"
    when: 赤城が死んだとき
    meaning: ❓（赤城が死ぬ場面でだけ 1 になる）
    confidence: 🟢
  - flag: "0x37A2"
    serial: 250
    value: "= 2"
    when: 赤城が死んだとき
    meaning: 闇討ちの開始条件の1つ
    confidence: 🟢
  - flag: "0x3788"
    serial: 224
    value: "= 1"
    when: 赤城や小暮に斬りかかって戦闘になったとき
    meaning: 攘夷と敵対する
    confidence: 🟢
  - flag: "0x374F"
    serial: 167
    value: "= 1"
    when: 戦闘で小暮を倒したとき
    meaning: 小暮死亡
    confidence: 🟢
  - flag: "0x378E"
    serial: 230
    value: "= 2"
    when: 戦闘で小暮を倒したとき
    meaning: 真ルートの希望の光への道が閉じ、大老暗殺計画へ進む
    confidence: 🟢
  - flag: 時間帯を進める保留量
    value: "+ 10"
    when: 成功・失敗したとき
    meaning: 時間帯を進める
    confidence: 🟢

sources: ["[A]"]
---

# 再起の望み（Praying for Recovery）

## 流れ

1. [お早い到着](best__1_day__a_speedy_arrival.md)のあと、神社の奥で撃たれた赤城が寝かされている。小暮と般若党が医者を問い詰めている（`0x36F0`（通し番号 72）= 3、時間帯が夜になる）
2. 医者に話しかけると選択肢が出るが、どれを選んでも「手の施しようがない」「何度診ても同じだ」などと返され、話は進まない
3. 小暮に話しかけると、赤城をどうするかの選択肢が出る。病院 `0x375D`（通し番号 181）が開いているときだけ「英国の病院に連れて行こう」が出る
4. 「英国の病院に連れて行こう」：赤城は嫌がるが、小暮が「病院とやらに案内してくれ」。居留地の病院でローラが診て手術し、赤城は助かる。成功（`0x36F0` = 4、赤城 `0x374E` = 3）
5. 「これくらいでくたばる男じゃない」：小暮・般若党が赤城を励ますが、赤城は小暮に故郷の思い出を語って息を引き取る。失敗（`0x36F0` = 5、赤城 `0x374E` = 1）
6. 「坊さんを呼んでくるか？」：「縁起でも無いこと言うな」と叱られ、選び直しになる
7. 神社でも病院でも、赤城に斬りかかると赤城が死に、怒った小暮・般若党と戦闘になる（攘夷と敵対 `0x3788` = 1）。失敗（`0x36F0` = 5）。病院で手術のあとに斬った場合も成功が失敗に上書きされる

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| 医者 | 「なんとかしてくれ」 | 「手の施しようがない」。話は進まない |
| 医者 | 「もっとちゃんと診ろ！」 | 「何度診ても同じだ」。話は進まない |
| 医者 | 「このヤブ医者め！」 | 「不服なら 別の医者を呼びなさい」。話は進まない |
| 小暮（病院が開いている） | 「英国の病院に連れて行こう」 | 病院で手術して赤城が助かる。成功（`0x36F0` = 4） |
| 小暮 | 「これくらいでくたばる男じゃない」 | 赤城が死ぬ。失敗（`0x36F0` = 5） |
| 小暮 | 「坊さんを呼んでくるか？」 | 叱られて選び直し |
| 神社・病院 | 赤城に斬りかかる | 赤城が死に、小暮・般若党と戦闘。失敗（`0x36F0` = 5） |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| 赤城 `0x374E`（通し番号 166） | 3（病院で助かった） | 成功 | 🟢 |
| 赤城 `0x374E` | 1（死亡） | 失敗 | 🟢 |
| `0x37A2`（通し番号 250） | 2。[闇討ち](best__2_day__strike_in_the_dark.md)の開始条件の1つ | 失敗 | 🟢 |
| `0x3791`（通し番号 233） | 1（意味は ❓） | 失敗 | 🟢 |
| `0x37B2`・`0x37B3`・`0x37C7`（通し番号 266・267・287） | 1（意味は ❓） | 成功 | 🟢 |
| 攘夷の敵対状態 `0x3788`（通し番号 224） | 1 | 赤城・小暮に斬りかかって戦闘になったとき | 🟢 |
| 小暮 `0x374F`（通し番号 167） | 1（死亡） | 戦闘で小暮を倒したとき | 🟢 |
| 真ルート `0x378E`（通し番号 230） | 2（[大老暗殺計画](best__2_day__plot_to_assassinate_the_chief_minister.md)へ） | 戦闘で小暮を倒したとき | 🟢 |
| 時間帯を進める保留量 | +10 | 成功・失敗 | 🟢 |

- 病院の開閉は前の周回からの引き継ぎで決まる（[facilities](../save_format/chunks/facilities/README.md)）。病院が閉じていると赤城を助ける方法がない
- 赤城に斬りかかったときの戦闘では、最初は小暮を倒しきれず、赤城が死んだあとの戦闘で小暮を倒しきれる（🔶）

## 前後のイベント

- 前：[お早い到着](best__1_day__a_speedy_arrival.md)
- 次：[将の器](best__2_day__ability_to_lead.md)（成功時。赤城 `0x374E` = 3）／[怒りの矛先](best__2_day__the_sting_of_hatred.md)（失敗時。赤城 `0x374E` = 1）／[大老暗殺計画](best__2_day__plot_to_assassinate_the_chief_minister.md)（小暮を倒したとき）

## 未確認のこと

- 🔶 赤城に斬りかかったときの戦闘の細かい分かれ方（小暮が倒れる・逃げる・倒しきれるの区別）
- ❓ `0x3791`・`0x37B2`・`0x37B3`・`0x37C7` の意味
