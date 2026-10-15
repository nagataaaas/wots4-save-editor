---
event_id: 21
state_offset: "0x36BD"

title:
  ja: 語学無用
  en: We Don't Need No Stinkin' Language School!

faction:
  name: 攘夷（般若党）
  route: >-
    攘夷（般若党）の2日目夕のイベントで、語学所が閉じているときに起きる（開いているときは[講師を亡き者に](prajna__2_day__the_lecturer_is_a_dead_man.md)）。
    [欺きの代価](prajna__2_day__a_deceptive_price.md)に続き、夜の[カジノを破壊せよ](prajna__2_day__destroy_the_casino.md)または[カジノ再建断固阻止](prajna__2_day__put_an_end_to_the_casinos_reconstruction.md)へ続く。

summary: >-
  神社で赤城に誘われ、港に着いた語学所の講師を襲う。護衛の琴吹・茂呂（メリンダが生きていればメリンダも）と戦い、講師を斬るか追い返すと成功し、語学所は閉じたままになる。
  攘夷の友好度が上がり、幕府・外国とは敵対する。

summary_en: >-
  Invited by Akagi at the Shrine, you attack the Language School's lecturer, who has arrived at the Harbor. Fight his escorts Kotobuki and Moro (and Melinda, if she is alive), and cut down or drive off the lecturer to succeed; the Language School stays closed.
  Friendship with the Prajnas rises, and the Shogunate and the Foreigners become hostile.

timing:
  phase: 2日目 夕
  slot: 夕
  note: ""

location: 神社（赤城）→ 港から町への道

conditions:
  - flag: 段階
    test: "== 210"
    meaning: 2日目夕
    confidence: 🟢
  - flag: "0x36BD"
    serial: 21
    test: "<= 2"
    meaning: このイベントがまだ進行中でない
    confidence: 🟢
  - flag: "0x36BE"
    serial: 22
    test: "<= 2"
    meaning: 講師を亡き者にもまだ進行中でない
    confidence: 🟢
  - flag: "0x375F"
    serial: 183
    test: "== 0"
    meaning: 語学所が閉じている（1 のときは講師を亡き者にが起きる）
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
    test: "== 4"
    meaning: 神社にいる
    confidence: 🟢

failure_conditions: []

flag_changes:
  - flag: "0x36BD"
    serial: 21
    value: "= 2"
    when: 誘いを断ったとき、または答えなかったとき
    meaning: 導入を見て断った（般若党は港へ向かう）
    confidence: 🟢
  - flag: "0x36BD"
    serial: 21
    value: "= 3"
    when: 誘いに乗ったとき
    meaning: 進行中
    confidence: 🟢
  - flag: "0x3788"
    serial: 224
    value: "= 0"
    when: 誘いに乗ったとき・成功したとき
    meaning: 攘夷との敵対状態を解く
    confidence: 🟢
  - flag: "0x37FC"
    serial: 340
    value: "= 0 / = 22"
    when: 襲撃の始めに 0、講師が町まで逃げ切ると 22
    meaning: 講師が町に着いた（報酬が 500 文になる）
    confidence: 🟢
  - flag: "0x36BD"
    serial: 21
    value: "= 4"
    when: 講師を斬ったとき、護衛を全員退けたとき、または講師が町まで逃げ切ったとき
    meaning: イベント成功
    confidence: 🟢
  - flag: "0x375F"
    serial: 183
    value: "= 0"
    when: 成功したとき
    meaning: 語学所は閉じたまま
    confidence: 🟢
  - flag: "0x3782"
    serial: 218
    value: "+ 1"
    when: 成功したとき
    meaning: 攘夷の友好ポイント（行0）
    confidence: 🟢
  - flag: "0x3784"
    serial: 220
    value: "+ 1"
    when: 成功したとき・襲撃から逃げたとき
    meaning: 外国の対立ポイント（行1）
    confidence: 🟢
  - flag: "0x3787"
    serial: 223
    value: "= 1"
    when: 同上
    meaning: 外国と敵対する
    confidence: 🟢
  - flag: "0x3783"
    serial: 219
    value: "+ 1"
    when: 同上
    meaning: 幕府の対立ポイント（行1）
    confidence: 🟢
  - flag: "0x3786"
    serial: 222
    value: "= 1"
    when: 同上
    meaning: 幕府と敵対する
    confidence: 🟢
  - flag: 所持金
    value: "+ 1500 / + 3000 / + 500"
    when: 講師を斬った 1500、護衛を全員退けて講師が逃げ帰った 3000、講師が町まで逃げ切った 500
    meaning: 報酬
    confidence: 🟢
  - flag: "0x36BD"
    serial: 21
    value: "= 5"
    when: 失敗したとき（下の表）
    meaning: イベント失敗
    confidence: 🟢
  - flag: "0x3785"
    serial: 221
    value: "+ 1"
    when: 襲撃から逃げたとき、般若党 100 人と戦ったとき
    meaning: 攘夷の対立ポイント（行1）
    confidence: 🟢
  - flag: "0x3788"
    serial: 224
    value: "= 1"
    when: 同上
    meaning: 攘夷と敵対する
    confidence: 🟢
  - flag: 時間帯を進める保留量
    value: "+ 4 / + 10"
    when: 断ったあと般若党が先に着いた・100 人の戦闘から逃げた +4、成功・そのほかの失敗 +10
    meaning: 時間帯が進む
    confidence: 🟢

sources: [A]
---

# 語学無用（We Don't Need No Stinkin' Language School!）

## 流れ

1. 2日目夕、語学所が閉じている（`0x375F`（通し番号 183）= 0）とき、神社で赤城に近づくと、港に着く語学所の講師を襲う誘いを受ける
   - 攘夷と敵対中（`0x3788`（通し番号 224）= 1）は「…まだ生きてたか」と迎えられる（下の表）
2. 誘いに乗ると `0x36BD`（通し番号 21）= 3、攘夷との敵対状態が解ける。港から町へ向かう講師の一行を襲う（`0x37FC`（通し番号 340）= 0）
3. 戦闘の相手は護衛の琴吹・茂呂、メリンダが生きている（`0x3759`（通し番号 177）= 0）ときはメリンダも。護衛と赤城・小暮は体力が4割まで減ると退く（死なない）
4. 終わり方
   - 講師を斬る → 「よくぞ講師を始末してくれた」。1500 文
   - 護衛（琴吹・茂呂・メリンダ）を全員退ける → 講師が逃げ帰る。3000 文
   - 講師が町まで逃げ切る（`0x37FC` = 22）→ 講師は逃げ帰った扱い。500 文
   - どれでも成功（`0x36BD` = 4）。語学所は閉じたまま（`0x375F` = 0）。攘夷 +1、幕府・外国の対立ポイント・敵対
5. 襲撃の戦闘から逃げると失敗し、攘夷・幕府・外国のすべてと敵対する
6. 誘いを断ると `0x36BD` = 2 で、般若党は港へ向かう（🔶 赤城に近づかないでいても、般若党は誘わずに港へ向かい始める）。あとから追いついて話しかけると改めて誘われる。般若党が先に着いてしまうと失敗（`0x36BD` = 5）

## 選択肢

| 場面                                                                                | 選択肢                        | 結果                                     |
| ----------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------- |
| 導入（初回）                                                                        | 「いいだろう」                | 参加（`0x36BD` = 3）                     |
| 導入（初回）                                                                        | 「断る」、または答えない      | 断る（`0x36BD` = 2）。般若党は港へ向かう |
| 断ったあと、港へ向かう般若党に追いつく                                              | 「気が変わった 手を貸そう」   | 参加（`0x36BD` = 3）                     |
| 同上                                                                                | 「お前らの 好きにはさせん！」 | 般若党 100 人と戦闘 → 失敗               |
| 誘いを受けないうちに般若党が港へ向かい始め、追いついて話しかける（状態が 0 のまま） | 「いいだろう」                | 参加（`0x36BD` = 3）                     |
| 同上                                                                                | 「ここがお前達の墓場だ」      | 般若党 100 人と戦闘 → 失敗               |
| 同上                                                                                | 答えない                      | `0x36BD` = 2                             |
| 導入（攘夷と敵対中）                                                                | 「すまなかった」              | 参加（`0x36BD` = 3、敵対状態が解ける）   |
| 導入（攘夷と敵対中）                                                                | 「…まだ生きてたか」           | 般若党 100 人と戦闘 → 失敗               |

般若党 100 人との戦闘は、100 人を斬って勝っても、逃げても失敗（`0x36BD` = 5）で、攘夷の対立ポイント・敵対になる。

## 変化する内容

| 対象                     | 変化                                                                                            | 場面                                         | 確度 |
| ------------------------ | ----------------------------------------------------------------------------------------------- | -------------------------------------------- | ---- |
| イベントの状態 `0x36BD`  | = 4                                                                                             | 講師を斬った・護衛を退けた・講師が町に着いた | 🟢    |
| 施設                     | 語学所 `0x375F` = 0（閉じたまま）                                                               | 成功                                         | 🟢    |
| 所持金                   | 講師を斬った +1500、護衛を退けた +3000、講師が町に着いた +500 文                                | 成功                                         | 🟢    |
| 勢力の友好度             | 攘夷 +1（`0x3782`（通し番号 218）+1）                                                           | 成功                                         | 🟢    |
| 勢力の友好度             | 外国 −1（`0x3784`（通し番号 220）+1）、幕府 −1（`0x3783`（通し番号 219）+1）                    | 成功・襲撃から逃げた                         | 🟢    |
| 勢力の敵対状態           | 外国 = 1（`0x3787`（通し番号 223））、幕府 = 1（`0x3786`（通し番号 222））                      | 成功・襲撃から逃げた                         | 🟢    |
| 勢力の敵対状態           | 攘夷 = 0（`0x3788`）                                                                            | 参加・成功                                   | 🟢    |
| 勢力の友好度             | 攘夷 −1（`0x3785`（通し番号 221）+1）                                                           | 襲撃から逃げた・般若党 100 人と戦った        | 🟢    |
| 勢力の敵対状態           | 攘夷 = 1（`0x3788`）                                                                            | 同上                                         | 🟢    |
| `0x37FC`（通し番号 340） | 襲撃の始めに 0、講師が町に着くと 22                                                             | 襲撃                                         | 🟢    |
| 時間帯を進める保留量     | +4 または +10（フロントマター）                                                                 | —                                            | 🟢    |
| 人物                     | 講師が死ぬことがある。主要人物（琴吹・茂呂・メリンダ・赤城・小暮）は4割で退き、状態は変わらない | 襲撃                                         | 🟢    |

朱美の好感度は変わらない。

## 前後のイベント

- 前：[欺きの代価](prajna__2_day__a_deceptive_price.md)（2日目昼。発生条件にはならない）
- 同じ枠の対：語学所が開いているときは[講師を亡き者に](prajna__2_day__the_lecturer_is_a_dead_man.md)。どちらかが進行中になると、もう一方は起きない
- 同じ時間帯のほかの勢力：[講師ご到着](shogunate__2_day__the_lecturer_arrives.md)（語学所が閉じているとき）、[お団子物語](foreigners__2_day__a_dumpling_tale.md)
- 次：カジノ `0x375E` が 0（開）なら[カジノを破壊せよ](prajna__2_day__destroy_the_casino.md)、1（閉）なら[カジノ再建断固阻止](prajna__2_day__put_an_end_to_the_casinos_reconstruction.md)（2日目夜）

## 未確認のこと

- 🔶 「講師が町まで逃げ切る」は、講師が港から町への道の決まった地点に着いたときの終わり方。[A] は「港から町までの間に講師を斬る」と書いており、逃げ切ったときも成功（500 文）になるかは要ゲーム内確認
- [A] の「茂呂らに一定のダメージでも可」は、護衛を全員4割まで減らすと講師が逃げ帰る（3000 文）ことに当たる（🟢）
- 🔶 断ったあと、般若党が港の決まった地点に着くと失敗になる（追いつけなかったとき）
