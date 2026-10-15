---
event_id: 34
state_offset: "0x36CA"

title:
  ja: 小公女倒れる
  en: The Ambassador Collapses

faction:
  name: 外国
  route: >-
    外国勢力の3日目夕のイベント。[大老 鬼怒川怨仙](other__3_day__chief_minister_onsen_kinugawa.md)のあとに起き、同じ日の夜の[危険な賭け](foreigners__3_day__a_risky_gamble.md)へ続く。
    成功は、3日目夜にローラと夜這いの約束をする条件の1つ。

summary: >-
  領事館でローラが過労で倒れ、J.J に精のつく薬を買って来るよう頼まれる。町の薬屋で薬を受け取り、居留地へ戻ると般若党に襲われる。
  撃退して薬を届けると成功し、報酬 3000 文を受け取る。

summary_en: >-
  At the Consulate, Laura collapses from overwork, and J.J. asks you to buy her a restorative medicine. You pick up the medicine at the pharmacy in Town and are attacked by the Prajnas on the way back to Little Britain.
  Fight them off and deliver the medicine to succeed and receive a 3000 mon reward.

timing:
  phase: 3日目 夕
  slot: 夕
  note: 依頼（領事館内）・薬屋（町）・般若党の襲撃（居留地）の3か所に分かれて進む

location: 居留地・領事館内（依頼）→ 町・薬屋 → 居留地（般若党との戦闘）→ 領事館

conditions:
  - flag: "0x36C4"
    serial: 28
    test: "> 0"
    meaning: 大老 鬼怒川怨仙が起きている
    confidence: 🟢
  - flag: "0x36CA"
    serial: 34
    test: "<= 3"
    meaning: 依頼の場面。このイベントがまだ終わっていない
    confidence: 🟢
  - flag: "0x378D"
    serial: 229
    test: "== 1"
    meaning: 通常ルート
    confidence: 🟢
  - flag: 時間帯
    test: "== 1"
    meaning: 夕（3つの場面すべて）
    confidence: 🟢
  - flag: 現在の地域
    test: "== 11"
    meaning: 依頼の場面は領事館内にいる
    confidence: 🟢
  - flag: "0x36CA"
    serial: 34
    test: "== 3"
    meaning: 薬屋・般若党の場面は、依頼を受けたあと
    confidence: 🟢
  - flag: "0x37A1"
    serial: 249
    test: "== 0"
    meaning: 薬屋の場面は、薬をまだ受け取っていない。町にいる（地域 6）
    confidence: 🟢
  - flag: "0x37A1"
    serial: 249
    test: "== 1"
    meaning: 般若党の場面は、薬を受け取ったあと。居留地にいる（地域 3）
    confidence: 🟢

failure_conditions: []

flag_changes:
  - flag: "0x36CA"
    serial: 34
    value: "= 1"
    when: 状態 0 で領事館内に入り、ローラが倒れる場面を見たとき
    meaning: 導入を見た
    confidence: 🟢
  - flag: "0x36CA"
    serial: 34
    value: "= 3"
    when: J.J の依頼の選択肢でどちらを選んでも（答えなくても）
    meaning: 依頼を受けた（薬を探しに行く）
    confidence: 🟢
  - flag: "0x3787"
    serial: 223
    value: "= 0"
    when: 依頼の選択肢を選んだとき
    meaning: 外国との敵対状態を解く
    confidence: 🟢
  - flag: "0x37C7"
    serial: 287
    value: "= 1"
    when: 依頼の選択肢を選んだとき
    meaning: 意味は ❓
    confidence: 🟢
  - flag: "0x37A1"
    serial: 249
    value: "= 1"
    when: 町の薬屋で薬を調合してもらったとき
    meaning: 薬を手に入れた
    confidence: 🟢
  - flag: "0x37C6"
    serial: 286
    value: "= 1"
    when: 居留地で般若党との戦闘が始まるとき、成功したとき
    meaning: 意味は ❓
    confidence: 🟢
  - flag: "0x36CA"
    serial: 34
    value: "= 4"
    when: 般若党を全滅させて（または制限時間を過ぎて）薬を届けたとき
    meaning: イベント成功
    confidence: 🟢
  - flag: "0x3781"
    serial: 217
    value: "+ 1"
    when: 成功したとき
    meaning: 外国の友好ポイント（行0）
    confidence: 🟢
  - flag: "0x3787"
    serial: 223
    value: "= 0"
    when: 成功したとき
    meaning: 外国との敵対状態を解く
    confidence: 🟢
  - flag: "0x3792"
    serial: 234
    value: "+ 2"
    when: 成功したとき
    meaning: ローラの好感度
    confidence: 🟢
  - flag: "0x37A1"
    serial: 249
    value: "= 0"
    when: 成功したとき
    meaning: 薬を届け終えた
    confidence: 🟢
  - flag: 所持金
    value: "+ 3000"
    when: 成功したとき
    meaning: 薬代と報酬
    confidence: 🟢
  - flag: 時間帯を進める保留量
    value: "+ 10"
    when: 成功したとき・薬屋が閉まっていて失敗したとき
    meaning: 時間帯が進む
    confidence: 🟢
  - flag: "0x36CA"
    serial: 34
    value: "= 5"
    when: 薬屋が閉まっている（`0x375C` が 0 でない）とき、依頼を受けて町に入ったとき
    meaning: イベント失敗
    confidence: 🟢

sources: [A]
---

# 小公女倒れる（The Ambassador Collapses）

## 流れ

1. 3日目夕、領事館内に入ると、ローラが立ちくらみで倒れる場面になる（`0x36CA`（通し番号 34）が 0 のとき。`0x36CA` = 1）
2. J.J かローラに近づくと、J.J が「どこかで精のつく薬を買って来てくれないか？」と頼む。外国と敵対している（`0x3787` = 1）ときは「なんだキミ いたのか？」で始まる別の頼み方になる
3. どちらの選択肢を選んでも（答えなくても）依頼を受けたことになり、`0x36CA` = 3、外国との敵対状態が解け、`0x37C7` = 1 になる。断る選択肢はない
4. 依頼のあと、領事館内でローラに近づくと話しかけられる。[小公女と大老](foreigners__3_day__the_little_public_servant_the_big_minister.md)が成功している（`0x36C6` = 4）ときだけ、鍋に触れる選択肢が出る（台詞が変わるだけ）
5. 町の薬屋に近づくと、店主が疲労に効く薬を調合してくれる（代金はかからない）。`0x37A1`（通し番号 249）= 1
   - 薬屋の状態（`0x375C`、通し番号 180）が 0 でないときは、薬屋の店主がおらず、町人に「薬屋ならやっていないよ」と言われて失敗（`0x36CA` = 5）
6. 薬を持って居留地に戻ると、般若党に「その薬……さては夷人どもに頼まれて買って来たのだな！」と襲われ、戦闘になる（`0x37C6` = 1）
7. 般若党を全滅させるか、制限時間（360 秒）を過ぎると、領事館で J.J に薬を渡す場面になり成功（`0x36CA` = 4）。報酬 3000 文、外国の友好ポイント が 1、ローラの好感度が 2 増える
8. 戦闘から逃げても失敗にはならない。`0x36CA` = 3・`0x37A1` = 1 のままなので、夕のうちに居留地へ戻るとまた襲われる

## 選択肢

| 場面                     | 選択肢                                                                              | 結果                                                   |
| ------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 依頼（通常）             | 「よし！わかった」                                                                  | 依頼を受ける（`0x36CA` = 3）                           |
| 依頼（通常）             | 「気が向いたらな」                                                                  | 依頼を受ける（`0x36CA` = 3。J.J の返事だけ変わる）     |
| 依頼（外国と敵対中）     | 「任せておけ！」                                                                    | 依頼を受ける（`0x36CA` = 3、`0x3787` = 0）             |
| 依頼（外国と敵対中）     | 「面倒臭いな…」                                                                     | 依頼を受ける（`0x36CA` = 3、`0x3787` = 0）             |
| 依頼のあとにローラと話す | 「もう少しの辛抱だぞ！」／「鍋の食いすぎだろ…」／「毒だ！鍋に毒が入っていたのだ！」 | 台詞だけ変わる。小公女と大老が成功しているときだけ出る |
| 戦闘中に場を離れる       | 逃げる側の選択肢（「逃げるが勝ちだ」など。表示はランダム）                          | 逃走。状態は変わらず、居留地に戻ると再戦               |

## 変化する内容

| 対象                    | 変化                                                     | 場面               | 確度          |
| ----------------------- | -------------------------------------------------------- | ------------------ | ------------- |
| イベントの状態 `0x36CA` | = 1 → 3 → 4                                              | 導入 → 依頼 → 成功 | 🟢             |
| 所持金                  | +3000 文                                                 | 成功               | 🟢             |
| 勢力の友好度            | 外国 +1（`0x3781`（通し番号 217）+1）                    | 成功               | 🟢             |
| 勢力の敵対状態          | 外国 = 0（`0x3787`（通し番号 223））                     | 依頼を受けた・成功 | 🟢             |
| ローラの好感度          | `0x3792`（通し番号 234）+2                               | 成功               | 🟢             |
| 薬を持っている          | `0x37A1`（通し番号 249）= 1 → 0                          | 薬屋 → 成功        | 🟢             |
| フラグ                  | `0x37C7`（通し番号 287）= 1                              | 依頼を受けた       | 🟢（意味は ❓） |
| フラグ                  | `0x37C6`（通し番号 286）= 1                              | 戦闘の開始・成功   | 🟢（意味は ❓） |
| イベントの状態 `0x36CA` | = 5                                                      | 薬屋が閉まっている | 🟢             |
| 時間帯を進める保留量    | +10                                                      | 成功・失敗         | 🟢             |
| 勢力の友好度            | 攘夷は変わらない（般若党を斬っても `0x3785` は増えない） | 戦闘               | 🟢             |
| 人物                    | 主要人物の生死は変わらない                               | —                  | 🟢             |

施設は変わらない（🟢）。

## 前後のイベント

- 前：[大老 鬼怒川怨仙](other__3_day__chief_minister_onsen_kinugawa.md)（起きていることが条件）。[小公女と大老](foreigners__3_day__the_little_public_servant_the_big_minister.md)の結果は会話だけに影響する
- 同じ時間帯のほかの勢力：[大老と三姉妹](shogunate__3_day__the_chief_minister_the_three_sisters.md)、[売国奴を斬れ](prajna__3_day__kill_the_traitor.md)
- 次：[危険な賭け](foreigners__3_day__a_risky_gamble.md)（3日目夜。このイベントが成功しているかで J.J の最初の台詞が変わる）
- 3日目夜にローラの好感度 `0x3792` が 10 以上で、このイベントが成功していると、ローラの部屋で夜這いの約束ができる（[night-visit](../save_format/chunks/night-visit/README.md)）

## 未確認のこと

- 🔶 般若党の戦闘には、般若党3人のほかに荒くれ者・刀や槍の者など別の組の人物も配置され、どれも主人公を狙う。[A] は「般若党3人を倒す」とだけ書く。全滅の対象にほかの組が入るかは要ゲーム内確認
- 🔶 制限時間（360 秒）を過ぎても成功の場面に進む。要ゲーム内確認
- ❓ `0x37C6`・`0x37C7` の意味。`0x37C6` は大寄せでも 1 になる
- ❓ 薬屋の状態 `0x375C` を 0 以外にする場面は見つかっていない。通常のプレイでは薬屋の失敗は起きないとみられる
- ❓ 成功したときに、位置の分からない値がもう1つ 1 になる。意味は分からない
