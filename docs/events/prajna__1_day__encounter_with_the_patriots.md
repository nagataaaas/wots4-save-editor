---
event_id: 6
state_offset: "0x36AE"

title:
  ja: 志士との出会い
  en: Encounter with the "Patriots"

faction:
  name: 攘夷（般若党）
  route: >-
    攘夷（般若党）の最初のイベント（1日目昼）。神社の門が開き、夕の[海兵隊の横暴](prajna__1_day__violent_behavior_of_the_marine_corps.md)、夜の[代官所潜入](prajna__1_day__sneaking_into_the_magistrates_office.md)へ続く。

summary: >-
  閉じた神社の門に近づくと赤城に呼ばれ、洞窟の奥で般若党の志を聞かされる。町の居酒屋で女将の朱美を紹介されて終わる。
  戦闘・報酬はない。成功すると攘夷の友好度が上がる。般若党に斬りかかると戦闘になり、失敗する。

timing:
  phase: 1日目 昼
  slot: 昼
  note: ""

location: 神社（門 → 洞窟の奥）→ 町の居酒屋

conditions:
  - flag: 段階
    test: "== 100"
    meaning: 1日目昼
    confidence: 🟢
  - flag: "0x36A9"
    serial: 1
    test: "== 4"
    meaning: 阿弥浜港争乱が成功（次の条件とどちらか一方）
    confidence: 🟢
  - flag: "0x36AB"
    serial: 3
    test: "== 4"
    meaning: 嵐のあとが成功（前の条件とどちらか一方）
    confidence: 🟢
  - flag: "0x36AE"
    serial: 6
    test: "<= 3"
    meaning: このイベントがまだ終わっていない（導入を見て門が開いたあとも続く）
    confidence: 🟢
  - flag: "0x378D"
    serial: 229
    test: "== 1"
    meaning: 通常ルート（真ルートでは 2 になり起きない）
    confidence: 🟢
  - flag: 時間帯
    test: "== 0"
    meaning: 昼
    confidence: 🟢
  - flag: 現在の地域
    test: "== 4"
    meaning: 神社にいる
    confidence: 🟢

failure_conditions: []

flag_changes:
  - flag: "0x36AE"
    serial: 6
    value: "= 3"
    when: 閉じた神社の門に近づき、赤城の「洞窟の奥へ来てくれ」の導入を見たとき（状態が 0 以下のときだけ）
    meaning: 導入を見た（門が開き、洞窟へ入れる）
    confidence: 🟢
  - flag: "0x377F"
    serial: 215
    value: "= 1"
    when: 同上
    meaning: 神社の門（大寄せ前）が開く
    confidence: 🟢
  - flag: "0x36AE"
    serial: 6
    value: "= 4"
    when: 居酒屋で朱美の紹介が終わったとき
    meaning: イベント成功
    confidence: 🟢
  - flag: "0x3782"
    serial: 218
    value: "+ 1"
    when: 成功したとき
    meaning: 攘夷の友好度 +（行0）
    confidence: 🟢
  - flag: "0x3788"
    serial: 224
    value: "= 0"
    when: 成功したとき
    meaning: 攘夷との敵対状態を解く
    confidence: 🟢
  - flag: "0x37C5"
    serial: 285
    value: "= 1"
    when: 成功したとき
    meaning: 🔶 この時間帯の攘夷のイベントを終えた
    confidence: 🟢
  - flag: 時間帯を進める保留量
    value: "+ 10"
    when: 成功したとき・失敗したとき
    meaning: 時間帯が進む
    confidence: 🟢
  - flag: "0x36AE"
    serial: 6
    value: "= 5"
    when: 般若党との戦闘で全員を倒したとき、または逃げたとき
    meaning: イベント失敗
    confidence: 🟢
  - flag: "0x3785"
    serial: 221
    value: "+ 1"
    when: 失敗したとき
    meaning: 攘夷の友好度 −（行1）
    confidence: 🟢
  - flag: "0x3788"
    serial: 224
    value: "= 1"
    when: 失敗したとき
    meaning: 攘夷と敵対する
    confidence: 🟢

sources: [A]
---

# 志士との出会い（Encounter with the "Patriots"）

## 流れ

1. 1日目昼、閉じた神社の門に近づくと、赤城に「志の何たるかを知りたければ洞窟の奥へ来てくれ」と呼ばれる。
   `0x36AE`（通し番号 6）= 3、神社の門 `0x377F`（通し番号 215）= 1 になり、門が開く（状態が 0 以下のときだけ流れる）
2. 洞窟の奥で赤城に近づくと、赤城・小暮が般若党の志を語る。会話の途中の選択肢は台詞が変わるだけ
3. 赤城の案内で町の居酒屋へ行き、女将の朱美を紹介される。ここで成功（`0x36AE` = 4）
4. 抜刀したまま赤城に近づくと「武器を納めろ」と言われる。「死ね悪党」を選ぶか、般若党に斬りかかると、赤城・小暮・党員8人と戦闘になる。
   赤城・小暮は体力が4割まで減ると退き、死なない。全員を倒すか逃げると失敗（`0x36AE` = 5）し、攘夷と敵対する

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| 抜刀して赤城に近づく | 「すまん」 | 刀を納めて続ける |
| 抜刀して赤城に近づく | 「死ね悪党」 | 般若党と戦闘 → 失敗（`0x36AE` = 5） |
| 般若党に斬りかかる | なし | 般若党と戦闘 → 失敗（`0x36AE` = 5） |
| 洞窟・赤城の話 | 「なぜ植民地にされてしまうんだ？」／「こんなところに住んでいるのか？」 | 台詞だけ変わる |
| 洞窟・小暮 | 「いい刀持ってるな」／「朝飯は食ったか？」 | 台詞だけ変わる |
| 居酒屋・朱美 | 「こいつらと仲間なのか？」／「お前は幾らだ？」 | 台詞だけ変わる |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| 神社の門 `0x377F`（通し番号 215） | = 1（開く） | 導入 | 🟢 |
| イベントの状態 `0x36AE` | = 3 → 4 | 導入 → 朱美の紹介が終わる | 🟢 |
| 勢力の友好度 | 攘夷 +1（`0x3782`（通し番号 218）+1） | 成功 | 🟢 |
| 勢力の敵対状態 | 攘夷 = 0（`0x3788`（通し番号 224）） | 成功 | 🟢 |
| `0x37C5`（通し番号 285） | = 1 | 成功 | 🟢（意味は 🔶） |
| 勢力の友好度 | 攘夷 −1（`0x3785`（通し番号 221）+1） | 失敗 | 🟢 |
| 勢力の敵対状態 | 攘夷 = 1（`0x3788`） | 失敗 | 🟢 |
| 時間帯を進める保留量 | +10 | 成功・失敗 | 🟢 |
| 所持金 | 変わらない | — | 🟢 |
| 人物 | 死亡する主要人物はいない（赤城・小暮は4割で退く） | 戦闘 | 🟢 |

施設・朱美の好感度は変わらない。

## 前後のイベント

- 前：[阿弥浜港争乱](other__prologue__amihama_harbor_skirmish.md)（成功）または[嵐のあと](other__1_day__after_the_storm.md)（成功）
- 同じ時間帯のほかの勢力：[代官所の面々](shogunate__1_day__the_magistrates_offices.md)、[小公女謁見](foreigners__1_day__audience_with_the_littlest_public_servant.md)
- 次：[海兵隊の横暴](prajna__1_day__violent_behavior_of_the_marine_corps.md)（1日目夕。発生条件にはならない）

## 未確認のこと

- ❓ 成功したときに、位置の分からない値（番号 1016）が 1 になる。意味は分からない
- [A] は「会話のみ」と書くが、斬りかかると戦闘になり失敗する（🟢）
