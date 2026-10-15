---
event_id: 76
state_offset: "0x36F4"

title:
  ja: 運命のルーレット
  en: Dice of Destiny

faction:
  name: 真ルート
  route: >-
    真ルートの2日目夕で、カジノが開いているときの分岐（閉じているときは[伯爵に刺激を](best__2_day__down_for_the_count.md)）。
    成功すると J.J が死に、3日目夕は[傷心の帰国船](best__3_day__the_sad_boat_home.md)になる。

summary: >-
  港のカジノで、J.J の用心棒が借金を払えない客を脅している。用心棒2人を倒すと J.J が「今度はボクが相手になろう」と現れ、
  「ボクは自分が死ぬ方に賭ける」と言って戦い、J.J は死ぬ。

summary_en: >-
  At the Casino at the Harbor, J.J.'s bodyguards are threatening a customer who can't pay his debts. After you defeat the two bodyguards, J.J. appears saying "Now I'll be your opponent,"
  declares "I'm betting on my own death," fights you, and dies.

timing:
  phase: 2日目 夕
  slot: なし
  note: カジノに入ると始まる

location: 港・カジノ

conditions:
  - flag: "0x36F4"
    serial: 76
    test: "<= 3"
    meaning: まだ終わっていない（途中で逃げた場合を含む）
    confidence: 🟢
  - flag: "0x375E"
    serial: 182
    test: "== 0"
    meaning: カジノが開いている
    confidence: 🟢
  - flag: "0x378E"
    serial: 230
    test: "== 1"
    meaning: 真ルート
    confidence: 🟢
  - flag: 段階
    test: "== 210"
    meaning: 2日目夕
    confidence: 🟢
  - flag: 現在の地域
    test: "== 23"
    meaning: 港・カジノに入った
    confidence: 🟢

failure_conditions:
  - flag: "0x378E"
    serial: 230
    test: "== 2"
    meaning: 真ルートを外れた（再起の望みで小暮を倒した、怒りの矛先の成功）
    confidence: 🟢

flag_changes:
  - flag: "0x36F4"
    serial: 76
    value: "= 3"
    when: カジノに初めて入って導入の場面が始まったとき
    meaning: 進行中
    confidence: 🟢
  - flag: "0x36F4"
    serial: 76
    value: "= 4"
    when: J.J との戦闘のあとの場面
    meaning: イベント成功
    confidence: 🟢
  - flag: "0x3758"
    serial: 176
    value: "= 1"
    when: 成功したとき
    meaning: J.J 死亡
    confidence: 🟢
  - flag: "0x378E"
    serial: 230
    value: "= 2"
    when: 成功したとき、小暮 `0x374F` が 1（死亡）なら
    meaning: 真ルートの希望の光への道が閉じる
    confidence: 🟢
  - flag: 時間帯を進める保留量
    value: "+ 10"
    when: 成功したとき
    meaning: 時間帯を進める
    confidence: 🟢

sources: ["[A]"]
---

# 運命のルーレット（Dice of Destiny）

## 流れ

1. カジノが開いている2日目夕に港のカジノへ入ると、その場で始まる。状態が 0 なら、J.J の用心棒2人が借金を払えない客に「ワイフか娘を形に入れる」と迫っている導入（`0x36F4`（通し番号 76）= 3）。導入を見たあとは、用心棒に近づくと続きになる
2. 用心棒に話しかけて「いい加減にしろ…」を選ぶか、用心棒を攻撃すると、用心棒2人と戦闘（素手 [A]）。全員倒すと次へ
3. 客に礼を言われたところへ J.J が現れ、「面白い 今度はボクが相手になろう」と戦闘。勝負が決まるまで逃げられない
4. J.J を倒すと「運命のルーレットが回り始めた……」「ボクは自分が死ぬ方に賭ける……」「……勝った」と J.J が死ぬ。成功（`0x36F4` = 4、J.J `0x3758` = 1）
5. 用心棒との戦闘から逃げると、状態は 3 のまま残り、カジノに入り直すとやり直せる

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| 用心棒 | 「いい加減にしろ…」 | 「ゴートゥーヘル！」。用心棒と戦闘 |
| 用心棒 | 「何でもない…」 | 「だったら ひっこんでろ！」。何も起きない（もう一度話しかけられる） |
| 用心棒 | 攻撃する | 「ＯＫ ボーイ カモン！」。用心棒と戦闘 |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| J.J `0x3758`（通し番号 176） | 1（死亡） | 成功 | 🟢 |
| 真ルート `0x378E`（通し番号 230） | 2 | 成功、小暮が死んでいれば | 🟢 |
| 時間帯を進める保留量 | +10 | 成功 | 🟢 |

- カジノの開閉 `0x375E`（通し番号 182）はこのイベントでは変わらない
- カジノの開閉は前の周回から引き継がれ、真ルートでは2日目夕までに変わる場面がない（🟢）。周回の始めにカジノが閉じていれば、このイベントは起きない
- 成功しても J.J は死ぬので、3日目夕は[刺激が欲しい](best__3_day__in_need_of_encouragement.md)ではなく[傷心の帰国船](best__3_day__the_sad_boat_home.md)の条件（J.J 死亡）を満たす

## 前後のイベント

- 前：[将の器](best__2_day__ability_to_lead.md)（カジノ `0x375E` = 0 のとき）
- 次：[闇討ち](best__2_day__strike_in_the_dark.md) → [傷心の帰国船](best__3_day__the_sad_boat_home.md)

## 未確認のこと

- ❓ J.J との戦闘で負けたときの扱い（失敗の値 5 は出てこない）
