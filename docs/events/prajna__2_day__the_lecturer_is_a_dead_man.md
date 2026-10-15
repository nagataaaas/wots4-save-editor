---
event_id: 22
state_offset: "0x36BE"

title:
  ja: 講師を亡き者に
  en: The Lecturer Is a Dead Man

faction:
  name: 攘夷（般若党）
  route: >-
    攘夷（般若党）の2日目夕のイベントで、語学所が開いているときに起きる（閉じているときは[語学無用](prajna__2_day__we_dont_need_no_stinkin_language_school.md)）。
    [欺きの代価](prajna__2_day__a_deceptive_price.md)に続き、夜の[カジノを破壊せよ](prajna__2_day__destroy_the_casino.md)または[カジノ再建断固阻止](prajna__2_day__put_an_end_to_the_casinos_reconstruction.md)へ続く。

summary: >-
  神社で赤城に誘われ、町の語学所から出てきた講師を襲う。茂呂と捕り方が守る講師を斬ると語学所が閉じ、3000 文。
  講師に大通り側まで逃げられても成功になるが、語学所は開いたままで 500 文。攘夷の友好度が上がり、幕府・外国とは敵対する。

summary_en: >-
  Invited by Akagi at the Shrine, you attack the lecturer as he leaves the Language School in Town. Cut down the lecturer, who is guarded by Moro and officers, and the Language School closes and you earn 3000 mon.
  If the lecturer escapes toward the Main Plaza it is still a success, but the Language School stays open and you earn 500 mon. Friendship with the Prajnas rises, and the Shogunate and the Foreigners become hostile.

timing:
  phase: 2日目 夕
  slot: 夕
  note: ""

location: 神社（赤城）→ 町から大通りへの道

conditions:
  - flag: 段階
    test: "== 210"
    meaning: 2日目夕
    confidence: 🟢
  - flag: "0x36BE"
    serial: 22
    test: "<= 2"
    meaning: このイベントがまだ進行中でない
    confidence: 🟢
  - flag: "0x36BD"
    serial: 21
    test: "<= 2"
    meaning: 語学無用もまだ進行中でない
    confidence: 🟢
  - flag: "0x375F"
    serial: 183
    test: "== 1"
    meaning: 語学所が開いている（0 のときは語学無用が起きる）
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
  - flag: "0x36BE"
    serial: 22
    value: "= 2"
    when: 誘いを断ったとき、または答えなかったとき
    meaning: 導入を見て断った（般若党は町へ向かう）
    confidence: 🟢
  - flag: "0x36BE"
    serial: 22
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
    value: "= 0 / = 1"
    when: 襲撃の始めに 0、茂呂が体力4割まで減るか 30 秒が過ぎて場面が変わると 1
    meaning: 襲撃の後半に入った
    confidence: 🟢
  - flag: "0x36BE"
    serial: 22
    value: "= 4"
    when: 講師を斬ったとき、または講師が大通り側まで逃げ切ったとき
    meaning: イベント成功
    confidence: 🟢
  - flag: "0x375F"
    serial: 183
    value: "= 0 / = 1"
    when: 講師を斬ると 0（語学所が閉じる）、講師に逃げ切られると 1（開いたまま）
    meaning: 語学所
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
    when: 成功したとき
    meaning: 外国の対立ポイント（行1）
    confidence: 🟢
  - flag: "0x3787"
    serial: 223
    value: "= 1"
    when: 成功したとき
    meaning: 外国と敵対する
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
    value: "+ 3000 / + 500"
    when: 講師を斬った 3000、講師に逃げ切られた 500
    meaning: 報酬
    confidence: 🟢
  - flag: "0x36BE"
    serial: 22
    value: "= 5"
    when: 失敗したとき（下の表）
    meaning: イベント失敗
    confidence: 🟢
  - flag: "0x3785"
    serial: 221
    value: "+ 1"
    when: 般若党 100 人と戦ったとき
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

# 講師を亡き者に（The Lecturer Is a Dead Man）

## 流れ

1. 2日目夕、語学所が開いている（`0x375F`（通し番号 183）= 1）とき、神社で赤城に近づくと、語学所の講師を襲う誘いを受ける
   - 攘夷と敵対中（`0x3788`（通し番号 224）= 1）は下の表の選択肢になる
2. 誘いに乗ると `0x36BE`（通し番号 22）= 3、攘夷との敵対状態が解ける。町で講師の一行を襲う（`0x37FC`（通し番号 340）= 0）
3. 講師は茂呂と捕り方に守られ、大通り側へ逃げようとする。茂呂の体力が4割まで減るか 30 秒が過ぎると、茂呂の場面をはさんで戦闘が続く（`0x37FC` = 1）。
   茂呂は2割、赤城・小暮は3〜4割で退く（死なない）
4. 終わり方
   - 講師を斬る → 「日本文化侵略の拠点に大打撃」。語学所が閉じる（`0x375F` = 0）。3000 文
   - 講師が大通り側の決まった地点まで逃げ切る → 「少ないが報酬だ」。語学所は開いたまま（`0x375F` = 1）。500 文
   - どちらも成功（`0x36BE` = 4）。攘夷 +1、幕府・外国の対立ポイント・敵対
5. 誘いを断ると `0x36BE` = 2 で、般若党は出発する。あとから追いついて話しかけると改めて誘われる。般若党が先に着いてしまうと失敗（`0x36BE` = 5）

## 選択肢

| 場面                                                                        | 選択肢                          | 結果                                   |
| --------------------------------------------------------------------------- | ------------------------------- | -------------------------------------- |
| 導入（初回）                                                                | 「いいだろう」                  | 参加（`0x36BE` = 3）                   |
| 導入（初回）                                                                | 「断る」、または答えない        | 断る（`0x36BE` = 2）                   |
| 断ったあと、般若党に追いつく                                                | 「ついて行かせてくれ…」         | 参加（`0x36BE` = 3）                   |
| 同上                                                                        | 「お前達はクズ以下だ」          | 般若党 100 人と戦闘 → 失敗             |
| 誘いを受けないうちに般若党が出発し、追いついて話しかける（状態が 0 のまま） | 「ああ 行こう」                 | 参加（`0x36BE` = 3）                   |
| 同上                                                                        | 「この人殺し！」                | 般若党 100 人と戦闘 → 失敗             |
| 同上                                                                        | 答えない                        | `0x36BE` = 2                           |
| 導入（攘夷と敵対中）                                                        | 「すまなかった」                | 参加（`0x36BE` = 3、敵対状態が解ける） |
| 導入（攘夷と敵対中）                                                        | 「愚か者の息の根を止めに来た…」 | 般若党 100 人と戦闘 → 失敗             |

般若党 100 人との戦闘は、100 人を斬って勝っても、逃げても失敗（`0x36BE` = 5）で、攘夷の対立ポイント・敵対になる。

## 変化する内容

| 対象                     | 変化                                                                         | 場面                             | 確度 |
| ------------------------ | ---------------------------------------------------------------------------- | -------------------------------- | ---- |
| イベントの状態 `0x36BE`  | = 4                                                                          | 講師を斬った・講師に逃げ切られた | 🟢    |
| 施設                     | 語学所 `0x375F`：講師を斬ると 0（閉じる）、逃げ切られると 1（開いたまま）    | 成功                             | 🟢    |
| 所持金                   | 講師を斬った +3000、逃げ切られた +500 文                                     | 成功                             | 🟢    |
| 勢力の友好度             | 攘夷 +1（`0x3782`（通し番号 218）+1）                                        | 成功                             | 🟢    |
| 勢力の友好度             | 外国 −1（`0x3784`（通し番号 220）+1）、幕府 −1（`0x3783`（通し番号 219）+1） | 成功                             | 🟢    |
| 勢力の敵対状態           | 外国 = 1（`0x3787`（通し番号 223））、幕府 = 1（`0x3786`（通し番号 222））   | 成功                             | 🟢    |
| 勢力の敵対状態           | 攘夷 = 0（`0x3788`）                                                         | 参加・成功                       | 🟢    |
| 勢力の友好度             | 攘夷 −1（`0x3785`（通し番号 221）+1）                                        | 般若党 100 人と戦った            | 🟢    |
| 勢力の敵対状態           | 攘夷 = 1（`0x3788`）                                                         | 同上                             | 🟢    |
| `0x37FC`（通し番号 340） | 襲撃の始めに 0、後半に入ると 1                                               | 襲撃                             | 🟢    |
| 時間帯を進める保留量     | +4 または +10（フロントマター）                                              | —                                | 🟢    |
| 人物                     | 講師が死ぬことがある。茂呂・赤城・小暮は退き、状態は変わらない               | 襲撃                             | 🟢    |

朱美の好感度は変わらない。

## 前後のイベント

- 前：[欺きの代価](prajna__2_day__a_deceptive_price.md)（2日目昼。発生条件にはならない）
- 同じ枠の対：語学所が閉じているときは[語学無用](prajna__2_day__we_dont_need_no_stinkin_language_school.md)。どちらかが進行中になると、もう一方は起きない
- 同じ時間帯のほかの勢力：[語学所開設](shogunate__2_day__the_language_school_opens.md)（語学所が開いているとき）、[お団子物語](foreigners__2_day__a_dumpling_tale.md)
- 次：カジノ `0x375E` が 0（開）なら[カジノを破壊せよ](prajna__2_day__destroy_the_casino.md)、1（閉）なら[カジノ再建断固阻止](prajna__2_day__put_an_end_to_the_casinos_reconstruction.md)（2日目夜）

## 未確認のこと

- 襲撃の戦闘には逃げたときの場面がない（逃げられるかは要ゲーム内確認）
- [A] の「赤城を攻撃するなどすると般若党約200人と戦闘」に対し、戦闘は 100 人を斬ると終わる（🟢）
- 🔶 茂呂が2割まで減ったときに流れる場面のあと、戦闘がどう続くか
