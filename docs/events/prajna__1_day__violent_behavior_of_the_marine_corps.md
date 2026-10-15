---
event_id: 9
state_offset: "0x36B1"

title:
  ja: 海兵隊の横暴
  en: Violent Behavior of the Marine Corps

faction:
  name: 攘夷（般若党）
  route: >-
    攘夷（般若党）の1日目夕のイベント。[志士との出会い](prajna__1_day__encounter_with_the_patriots.md)に続き、夜の[代官所潜入](prajna__1_day__sneaking_into_the_magistrates_office.md)へ続く。
    朱美の好感度が上がる最初のイベント。

summary: >-
  町の居酒屋で酔った海兵隊が朱美に絡んでいる。止めに入ると店の外で海兵隊と戦い、勝つと駆けつけたメリンダが部下の無礼を詫びる。
  成功すると攘夷の友好度と朱美の好感度が上がり、1500文を得る。海兵隊の側に付くと赤城と戦うことになり失敗する。

summary_en: >-
  At the bar in Town, drunken Royal Marines are harassing Akemi. Step in and you fight the Marines outside; win, and Melinda rushes over to apologize for her men's rudeness.
  Success raises friendship with the Prajnas and Akemi's affection, and earns 1500 mon. Siding with the Marines means fighting Akagi and fails the event.

timing:
  phase: 1日目 夕
  slot: 夕
  note: ""

location: 町の居酒屋 → 店の外

conditions:
  - flag: 段階
    test: "== 110"
    meaning: 1日目夕
    confidence: 🟢
  - flag: "0x36B1"
    serial: 9
    test: "<= 2"
    meaning: このイベントがまだ進行中でない
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
    test: "== 7"
    meaning: 町にいる（居酒屋に入ると導入が流れる）
    confidence: 🟢

failure_conditions: []

flag_changes:
  - flag: "0x36B1"
    serial: 9
    value: "= 2"
    when: 居酒屋に入り、海兵隊が朱美に絡む導入を見たとき。「邪魔したな」で店を出たときも 2
    meaning: 導入を見た（もう一度入ると、また起きる）
    confidence: 🟢
  - flag: "0x36B1"
    serial: 9
    value: "= 3"
    when: 「やめておけ」「拙者も混ぜてくれ」を選んだとき、または店の中で海兵隊に斬りかかったとき
    meaning: 進行中
    confidence: 🟢
  - flag: "0x376E"
    serial: 198
    value: "= 1"
    when: 進行中になったとき・失敗したとき
    meaning: ❓ 意味は分からない（成功すると 0 に戻る）
    confidence: 🟢
  - flag: "0x36B1"
    serial: 9
    value: "= 4"
    when: 海兵隊を倒し、朱美に礼を言われたとき
    meaning: イベント成功
    confidence: 🟢
  - flag: "0x3782"
    serial: 218
    value: "+ 1"
    when: 成功したとき
    meaning: 攘夷の友好ポイント（行0）
    confidence: 🟢
  - flag: "0x3788"
    serial: 224
    value: "= 0"
    when: 成功したとき
    meaning: 攘夷との敵対状態を解く
    confidence: 🟢
  - flag: "0x3787"
    serial: 223
    value: "= 0"
    when: 成功したとき（メリンダが生きていて詫びに来たときだけ）
    meaning: 外国との敵対状態を解く
    confidence: 🟢
  - flag: "0x3793"
    serial: 235
    value: "+ 1"
    when: 成功したとき
    meaning: 朱美の好感度
    confidence: 🟢
  - flag: "0x376E"
    serial: 198
    value: "= 0"
    when: 成功したとき
    meaning: ❓
    confidence: 🟢
  - flag: 所持金
    value: "+ 1500"
    when: 成功したとき
    meaning: 朱美からの礼
    confidence: 🟢
  - flag: "0x36B1"
    serial: 9
    value: "= 5"
    when: 失敗したとき（下の表）
    meaning: イベント失敗
    confidence: 🟢
  - flag: "0x3793"
    serial: 235
    value: "- 1"
    when: 失敗したとき（メリンダとの一騎打ちでメリンダを倒したときを除く）
    meaning: 朱美の好感度
    confidence: 🟢
  - flag: "0x3785"
    serial: 221
    value: "+ 1"
    when: 赤城を倒したとき（「拙者も混ぜてくれ」の戦闘、朱美に斬りかかったあとの戦闘）
    meaning: 攘夷の対立ポイント（行1）
    confidence: 🟢
  - flag: "0x3788"
    serial: 224
    value: "= 1"
    when: 赤城と戦って失敗したとき、赤城を倒したとき、朱美に斬りかかったあとの戦闘から逃げたとき
    meaning: 攘夷と敵対する
    confidence: 🟢
  - flag: "0x3784"
    serial: 220
    value: "+ 1"
    when: メリンダを倒したとき（一騎打ち、または朱美に斬りかかったあとの戦闘）
    meaning: 外国の対立ポイント（行1）
    confidence: 🟢
  - flag: "0x3787"
    serial: 223
    value: "= 1"
    when: メリンダを倒したとき、メリンダと戦う戦闘から逃げたとき
    meaning: 外国と敵対する
    confidence: 🟢
  - flag: "0x3797"
    serial: 239
    value: "+ 2"
    when: メリンダを峰打ちで倒したとき
    meaning: メリンダを峰打ちで倒した点数
    confidence: 🟢
  - flag: 時間帯を進める保留量
    value: "+ 4 / + 10"
    when: 導入で +4、成功・失敗で +10
    meaning: 時間帯が進む
    confidence: 🟢

sources: [A]
---

# 海兵隊の横暴（Violent Behavior of the Marine Corps）

## 流れ

1. 1日目夕、町の居酒屋に入ると、酔った海兵隊3人が朱美に絡んでいる。`0x36B1`（通し番号 9）= 2
2. 海兵隊に話しかけると選択肢が出る（下の表）。「やめておけ」を選ぶか、店の中で海兵隊に斬りかかると `0x36B1` = 3 になり、店の外へ出る
3. 店の外で海兵隊と戦う。素手のままだと酔った海兵隊3人と殴り合い、そのあと武器を持った海兵隊3人と戦う。刀を抜くと初めから武器を持った海兵隊3人と戦う（🔶 構えの判定による分かれ方）。海兵隊は死なない
4. 海兵隊を倒すと、メリンダ（`0x3759`（通し番号 177）= 0 で生きているとき）が駆けつけて部下を叱り、詫びる。朱美に礼を言われて成功（`0x36B1` = 4）、1500文を得る
   - メリンダが死んでいるときは詫びの場面がなく、外国との敵対状態は変わらない
5. メリンダが来ている場面でメリンダに斬りかかると、メリンダとの一騎打ちになり失敗する。朱美に斬りかかると、メリンダと赤城を相手に戦うことになり失敗する
6. 「拙者も混ぜてくれ」を選ぶと海兵隊の側に付き、赤城と戦う。赤城の体力を2割まで減らすと失敗（`0x36B1` = 5）、攘夷と敵対する

## 選択肢

| 場面                   | 選択肢               | 結果                                               |
| ---------------------- | -------------------- | -------------------------------------------------- |
| 居酒屋・海兵隊         | 「やめておけ」       | 店の外で海兵隊と戦う（`0x36B1` = 3）               |
| 居酒屋・海兵隊         | 「拙者も混ぜてくれ」 | 赤城と戦う（`0x36B1` = 3）→ 失敗（`0x36B1` = 5）   |
| 居酒屋・海兵隊         | 「邪魔したな」       | 店を出る（`0x36B1` = 2。もう一度入るとまた起きる） |
| 居酒屋                 | 海兵隊に斬りかかる   | 「やめておけ」と同じ                               |
| 店の外・メリンダの場面 | メリンダに斬りかかる | メリンダとの一騎打ち → 失敗                        |
| 店の外・メリンダの場面 | 朱美に斬りかかる     | メリンダ・赤城と戦闘 → 失敗                        |
| 戦闘中                 | 逃げる               | 失敗（`0x36B1` = 5）                               |

## 変化する内容

| 対象                                            | 変化                                                                                                 | 場面                                                                                                           | 確度          |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------- |
| イベントの状態 `0x36B1`                         | = 4                                                                                                  | 海兵隊を倒し、朱美に礼を言われた                                                                               | 🟢             |
| 所持金                                          | +1500 文                                                                                             | 成功                                                                                                           | 🟢             |
| 勢力の友好度                                    | 攘夷 +1（`0x3782`（通し番号 218）+1）                                                                | 成功                                                                                                           | 🟢             |
| 勢力の敵対状態                                  | 攘夷 = 0（`0x3788`（通し番号 224））、外国 = 0（`0x3787`（通し番号 223）。メリンダが詫びたときだけ） | 成功                                                                                                           | 🟢             |
| 朱美の好感度 `0x3793`（通し番号 235）           | +1                                                                                                   | 成功                                                                                                           | 🟢             |
| 朱美の好感度 `0x3793`                           | −1                                                                                                   | 失敗（逃走・赤城と戦う・朱美に斬りかかったあとの戦闘）。メリンダとの一騎打ちでメリンダを倒したときは変わらない | 🟢             |
| 勢力の友好度                                    | 攘夷 −1（`0x3785`（通し番号 221）+1）                                                                | 赤城を倒した                                                                                                   | 🟢             |
| 勢力の敵対状態                                  | 攘夷 = 1（`0x3788`）                                                                                 | 赤城と戦って失敗、赤城を倒した、朱美に斬りかかったあとの戦闘から逃げた                                         | 🟢             |
| 勢力の友好度                                    | 外国 −1（`0x3784`（通し番号 220）+1）                                                                | メリンダを倒した                                                                                               | 🟢             |
| 勢力の敵対状態                                  | 外国 = 1（`0x3787`）                                                                                 | メリンダを倒した、メリンダと戦う戦闘から逃げた                                                                 | 🟢             |
| メリンダの峰打ちの点数 `0x3797`（通し番号 239） | +2                                                                                                   | メリンダを峰打ちで倒した（一騎打ち・朱美に斬りかかったあとの戦闘のどちらでも）                                 | 🟢             |
| `0x376E`（通し番号 198）                        | 進行中・失敗で 1、成功で 0                                                                           | —                                                                                                              | 🟢（意味は ❓） |
| 時間帯を進める保留量                            | 導入 +4、成功・失敗 +10                                                                              | —                                                                                                              | 🟢             |
| 人物                                            | 死亡する主要人物はいない（メリンダは倒されると退く。赤城は2割、または4割で退く）                     | 戦闘                                                                                                           | 🟢             |

施設は変わらない。

## 前後のイベント

- 前：[志士との出会い](prajna__1_day__encounter_with_the_patriots.md)（1日目昼。発生条件にはならない）
- 同じ時間帯のほかの勢力：[琴吹光探検隊](shogunate__1_day__hikaru_kotobukis_explorers_club.md)、[電信あり](foreigners__1_day__the_telegraph.md)
- 次：[代官所潜入](prajna__1_day__sneaking_into_the_magistrates_office.md)（1日目夜）
- 朱美の好感度は、3日目夜の[真実](prajna__3_day__the_truth.md)・[夜の墓場で](prajna__3_day__at_the_cemetery_in_the_night.md)で朱美を送るときの夜這いの約束に使われる

## 未確認のこと

- ❓ 朱美の好感度が 0 のときに失敗すると、値がどうなるか（0 のままか、255 になるか）
- ❓ `0x376E`（通し番号 198）の意味。町の出口のフラグ（通し番号 197）の隣にある
- 🔶 店の外の戦闘が素手と抜刀で分かれる条件（構えの種類で判定している）
- [A] の「ライフル持ちまで全滅で 1500文」は、成功の報酬 1500 文と合う
