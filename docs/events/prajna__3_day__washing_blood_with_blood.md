---
event_id: 31
state_offset: "0x36C7"

title:
  ja: 血で血を洗う戦い
  en: Washing Blood With Blood

faction:
  name: 攘夷（般若党）
  route: >-
    攘夷（般若党）の3日目昼のイベント。[大老 鬼怒川怨仙](other__3_day__chief_minister_onsen_kinugawa.md)のあとに起きる。
    断ると[白昼の激突](other__3_day__clash_at_midday.md)が起きるようになる。夕の[売国奴を斬れ](prajna__3_day__kill_the_traitor.md)へ続く。

summary: >-
  神社で赤城から、魔鱗組と琴吹たちが志士狩りを始めたと聞かされ、町で琴吹・三姉妹・魔鱗組と戦う。琴吹と三姉妹を退けると成功し、1500 文。
  幕府の友好度が高いと琴吹に呼び止められ、答えしだいで幕府の側に寝返る（魔鱗組の力の成功になる）。

summary_en: >-
  At the Shrine, Akagi tells you that the Demonscales and Kotobuki's men have begun hunting down activists, and you fight Kotobuki, the Three Sisters and the Demonscales in Town. Fend off Kotobuki and the Three Sisters to succeed and earn 1500 mon.
  If your friendship with the Shogunate is high, Kotobuki stops you, and based on your answer you defect to the Shogunate's side (counted as a success of The Might of the Demonscales).

timing:
  phase: 3日目 昼
  slot: 昼
  note: ""

location: 神社（赤城）→ 町

conditions:
  - flag: 段階
    test: "== 300"
    meaning: 3日目昼
    confidence: 🟢
  - flag: "0x36C4"
    serial: 28
    test: "> 0"
    meaning: 大老 鬼怒川怨仙が起きた
    confidence: 🟢
  - flag: "0x36C7"
    serial: 31
    test: "<= 0"
    meaning: このイベントがまだ始まっていない（断ると 5 になり、もう起きない）
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
  - flag: "0x36C7"
    serial: 31
    value: "= 3"
    when: 「言うまでもない！」、敵対中は「この前はすまなかった」を選んだとき。白昼の激突で「赤城殿 助太刀いたす」を選んだときも 3
    meaning: 進行中
    confidence: 🟢
  - flag: "0x3788"
    serial: 224
    value: "= 0"
    when: 参加したとき・成功したとき
    meaning: 攘夷との敵対状態を解く
    confidence: 🟢
  - flag: "0x36C7"
    serial: 31
    value: "= 5"
    when: 誘いを断ったとき
    meaning: イベント失敗（白昼の激突が起きるようになる）
    confidence: 🟢
  - flag: "0x36C7"
    serial: 31
    value: "= 4"
    when: 琴吹と三姉妹（万由・千佳・百合）をすべて体力3割まで減らしたとき
    meaning: イベント成功
    confidence: 🟢
  - flag: "0x3782"
    serial: 218
    value: "+ 1"
    when: 成功したとき
    meaning: 攘夷の友好ポイント（行0）
    confidence: 🟢
  - flag: "0x3783"
    serial: 219
    value: "+ 1"
    when: 成功したとき
    meaning: 幕府の対立ポイント（行1）
    confidence: 🟢
  - flag: "0x3786"
    serial: 222
    value: "= 1"
    when: 成功したとき
    meaning: 幕府と敵対する
    confidence: 🟢
  - flag: 所持金
    value: "+ 1500"
    when: 成功したとき
    meaning: 赤城からの報酬
    confidence: 🟢
  - flag: 時間帯を進める保留量
    value: "+ 4 / + 10"
    when: 断った +4、成功 +10
    meaning: 時間帯が進む
    confidence: 🟢

sources: [A]
---

# 血で血を洗う戦い（Washing Blood With Blood）

## 流れ

1. 3日目昼、大老 鬼怒川怨仙のあと、神社で赤城に近づくと、魔鱗組と琴吹たちが志士狩りを始めたと知らされ、加勢を求められる
   - 攘夷と敵対中（`0x3788`（通し番号 224）= 1）は「何の用だ？」と迎えられる（下の表）
2. 加勢すると `0x36C7`（通し番号 31）= 3、攘夷との敵対状態が解ける。町で琴吹・三姉妹・魔鱗組と般若党がにらみ合う場に出る
3. ここで幕府の友好度（`0x3780`（通し番号 216）−`0x3783`（通し番号 219））が 3 以上だと、琴吹に「なぜおぬしがそこにいる」と呼び止められる（下の表）。3 未満なら呼び止められずに戦闘に入る
4. 般若党と一緒に、琴吹・万由・千佳・百合・魔鱗組と戦う。琴吹と三姉妹は体力3割で退く。4人とも退けると成功（`0x36C7` = 4）
   - 攘夷 +1、幕府の対立ポイント・敵対、赤城から 1500 文
5. 琴吹の呼び止めに「違う！これは何かの間違いだ！」と答えると幕府の側に寝返り、琴吹・三姉妹と一緒に赤城・小暮と戦う。赤城・小暮を1割まで減らすと
   [魔鱗組の力](shogunate__3_day__the_might_of_the_demonscales.md)の成功（`0x36C5`（通し番号 29）= 4、幕府 +1、攘夷の対立ポイント・敵対、1500 文）になる。`0x36C7` は 3 のまま
6. 誘いを断ると失敗（`0x36C7` = 5）。このあと[白昼の激突](other__3_day__clash_at_midday.md)が起きるようになる

## 選択肢

| 場面                                            | 選択肢                                         | 結果                                   |
| ----------------------------------------------- | ---------------------------------------------- | -------------------------------------- |
| 導入                                            | 「言うまでもない！」                           | 加勢（`0x36C7` = 3）                   |
| 導入                                            | 「今はその時ではない…」                        | 失敗（`0x36C7` = 5）→ 白昼の激突へ     |
| 導入                                            | 「残念！帰って洗濯しないと！」、または答えない | 失敗（`0x36C7` = 5）→ 白昼の激突へ     |
| 導入（攘夷と敵対中）                            | 「この前はすまなかった」                       | 加勢（`0x36C7` = 3、敵対状態が解ける） |
| 導入（攘夷と敵対中）                            | 「用なぞ無い」、または答えない                 | 失敗（`0x36C7` = 5）→ 白昼の激突へ     |
| 町・琴吹に呼び止められる（幕府の友好度 3 以上） | 「幕府の犬ではない」                           | 攘夷の側で戦う                         |
| 同上                                            | 「すべて芝居だったのだ」                       | 攘夷の側で戦う                         |
| 同上                                            | 「違う！これは何かの間違いだ！」               | 幕府の側に寝返る → 魔鱗組の力の成功    |

## 変化する内容

| 対象                    | 変化                                                                                                                                      | 場面                       | 確度 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ---- |
| イベントの状態 `0x36C7` | = 4                                                                                                                                       | 琴吹・三姉妹を退けた       | 🟢    |
| 所持金                  | +1500 文                                                                                                                                  | 成功                       | 🟢    |
| 勢力の友好度            | 攘夷 +1（`0x3782`（通し番号 218）+1）                                                                                                     | 成功                       | 🟢    |
| 勢力の敵対状態          | 攘夷 = 0（`0x3788`）                                                                                                                      | 加勢・成功                 | 🟢    |
| 勢力の友好度            | 幕府 −1（`0x3783`（通し番号 219）+1）                                                                                                     | 成功                       | 🟢    |
| 勢力の敵対状態          | 幕府 = 1（`0x3786`（通し番号 222））                                                                                                      | 成功                       | 🟢    |
| 寝返ったとき            | 魔鱗組の力 `0x36C5` = 4、幕府 +1（`0x3780`）・幕府 = 0（`0x3786`）、攘夷 −1（`0x3785`（通し番号 221）+1）・攘夷 = 1（`0x3788`）、+1500 文 | 寝返って赤城・小暮を退けた | 🟢    |
| イベントの状態 `0x36C7` | = 5                                                                                                                                       | 断った                     | 🟢    |
| 時間帯を進める保留量    | 断った +4、成功 +10                                                                                                                       | —                          | 🟢    |
| 人物                    | 死亡する主要人物はいない（琴吹・三姉妹は3割、赤城・小暮は3割または1割で退く）                                                             | 戦闘                       | 🟢    |

施設・朱美の好感度は変わらない。戦闘から逃げたときの場面はない。

## 前後のイベント

- 前：[大老 鬼怒川怨仙](other__3_day__chief_minister_onsen_kinugawa.md)（`0x36C4` が 0 より大きいことが条件）
- 断ったとき：[白昼の激突](other__3_day__clash_at_midday.md)（`0x36C7` = 5 または魔鱗組の力 `0x36C5` = 5 で起きる）。「赤城殿 助太刀いたす」を選ぶと `0x36C7` = 3 になり、同じ町の戦闘に入って成功すると `0x36C7` = 4
- 同じ時間帯のほかの勢力：[魔鱗組の力](shogunate__3_day__the_might_of_the_demonscales.md)、[小公女と大老](foreigners__3_day__the_little_public_servant_the_big_minister.md)
- 次：[売国奴を斬れ](prajna__3_day__kill_the_traitor.md)（3日目夕。発生条件にはならない）

## 未確認のこと

- [A] は「町で琴吹＋三姉妹の誰か1人を倒すと成功」と書くが、成功になるのは琴吹と三姉妹の4人をすべて3割まで減らしたとき（🟢）。要ゲーム内確認
- 🔶 琴吹の呼び止めの3つの答えのうち、寝返りになるのは3つ目（「違う！これは何かの間違いだ！」）。ゲーム内の選択肢の並びと合うかは要確認
- ❓ 誘いの場面と成功の場面で、持ち物が1つ減るとみられる。何が減るかは分からない
