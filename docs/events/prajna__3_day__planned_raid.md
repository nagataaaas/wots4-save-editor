---
event_id: 39
state_offset: "0x36CF"

title:
  ja: 仕組まれた襲撃
  en: Planned Raid

faction:
  name: 攘夷（般若党）
  route: >-
    攘夷（般若党）の3日目夜の港のイベント。[真実](prajna__3_day__the_truth.md)が成功していないときに起きる（成功していれば[罠を破れ](prajna__3_day__break_the_snare.md)）。
    罠を破れで赤城の説得に失敗したときも、この後半（三姉妹・魔鱗組との戦闘）に入る。剣術大会前の[志士の刀](prajna__4_day__blades_of_the_patriots.md)へ続く。

summary: >-
  夜の港で、外国商人から武器を受け取る茂呂を般若党と襲い、茂呂を斬る。直後に三姉妹と魔鱗組が現れ、罠だったと分かる。
  三姉妹を退けると成功し、1500 文。茂呂は死ぬ。

timing:
  phase: 3日目 夜
  slot: 夜
  note: ""

location: 港

conditions:
  - flag: 段階
    test: "== 320"
    meaning: 3日目夜
    confidence: 🟢
  - flag: "0x36C4"
    serial: 28
    test: "> 0"
    meaning: 大老 鬼怒川怨仙が起きた
    confidence: 🟢
  - flag: "0x36CF"
    serial: 39
    test: "<= 1"
    meaning: このイベントがまだ進行中でない
    confidence: 🟢
  - flag: "0x36CE"
    serial: 38
    test: "!= 4"
    meaning: 真実が成功していない（未到達・失敗。4 なら罠を破れが起きる）
    confidence: 🟢
  - flag: "0x378D"
    serial: 229
    test: "== 1"
    meaning: 通常ルート（真ルートでは 2 になり起きない）
    confidence: 🟢
  - flag: 時間帯
    test: "== 2"
    meaning: 夜
    confidence: 🟢
  - flag: 現在の地域
    test: "== 1"
    meaning: 港にいる
    confidence: 🟢

failure_conditions:
  - flag: "0x36CE"
    serial: 38
    test: "== 4"
    meaning: 真実が成功した（同じ3日目夜に墓場で朱美を問い詰めたとき。罠を破れが代わりに起きる）
    confidence: 🟢

flag_changes:
  - flag: "0x36CF"
    serial: 39
    value: "= 1"
    when: 港に入ったとき（売国奴を斬れが成功していないとき）
    meaning: 導入を見た
    confidence: 🟢
  - flag: "0x36CF"
    serial: 39
    value: "= 2"
    when: 赤城に「じゃあ そうしよう」と答えたとき
    meaning: 話を後回しにした（次に近づくとそのまま合流する）
    confidence: 🟢
  - flag: "0x36CF"
    serial: 39
    value: "= 3"
    when: 赤城と合流し、物陰で茂呂を待つ場面
    meaning: 進行中
    confidence: 🟢
  - flag: "0x3768"
    serial: 192
    value: "= 1"
    when: 同上
    meaning: ❓ 意味は分からない
    confidence: 🟢
  - flag: "0x3752"
    serial: 170
    value: "= 1"
    when: 茂呂を斬ったとき（体力 0）。茂呂との戦闘から逃げたときも、時間帯を進める保留量が 10 以上なら 1
    meaning: 茂呂の状態（死亡）
    confidence: 🟢
  - flag: "0x36CF"
    serial: 39
    value: "= 4"
    when: 三姉妹・魔鱗組との戦闘に勝ったとき
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
  - flag: "0x3783"
    serial: 219
    value: "+ 1"
    when: 成功したとき
    meaning: 幕府の対立ポイント（行1）
    confidence: 🟢
  - flag: "0x3786"
    serial: 222
    value: "= 1"
    when: 成功したとき・戦闘から逃げたとき
    meaning: 幕府と敵対する
    confidence: 🟢
  - flag: 所持金
    value: "+ 1500"
    when: 成功したとき
    meaning: 赤城からの報酬
    confidence: 🟢
  - flag: "0x36CF"
    serial: 39
    value: "= 5"
    when: 戦闘から逃げたとき
    meaning: イベント失敗
    confidence: 🟢
  - flag: "0x3785"
    serial: 221
    value: "+ 1"
    when: 戦闘から逃げたとき
    meaning: 攘夷の対立ポイント（行1）
    confidence: 🟢
  - flag: "0x3788"
    serial: 224
    value: "= 1"
    when: 戦闘から逃げたとき
    meaning: 攘夷と敵対する
    confidence: 🟢
  - flag: 時間帯を進める保留量
    value: "+ 10"
    when: 成功・失敗
    meaning: 時間帯が進む
    confidence: 🟢

sources: [A]
---

# 仕組まれた襲撃（Planned Raid）

## 流れ

1. 3日目夜、真実が成功していない（`0x36CE`（通し番号 38）≠ 4）とき、港に入ると、赤城たちが茂呂を待ち伏せている
   - 売国奴を斬れが成功している（`0x36CB`（通し番号 35）= 4）：赤城に近づくと、そのまま合流する
   - 成功していない：港に入ると導入が流れ（`0x36CF`（通し番号 39）= 1）、赤城に近づくと選択肢（下の表）。後回しにすると `0x36CF` = 2 で、次に近づくとそのまま合流する
2. 合流すると `0x36CF` = 3、`0x3768`（通し番号 192）= 1。物陰で待つと、茂呂が西洋の商人から武器を受け取る
3. 般若党が斬り込み、茂呂と戦う。茂呂を斬ると（体力 0）茂呂の状態 `0x3752`（通し番号 170）= 1。赤城・小暮は4割で退く
4. 茂呂を斬った直後、三姉妹と魔鱗組が現れ「厄介者の茂呂を始末してくれて こっちは大助かり」。般若党は利用されていた
5. 三姉妹・魔鱗組と戦う（三姉妹は4割、赤城・小暮は2割で退く）。勝つと成功（`0x36CF` = 4）。攘夷 +1・敵対が解け、幕府の対立ポイント・敵対、1500 文
6. どちらの戦闘でも、逃げると失敗（`0x36CF` = 5）。攘夷・幕府の両方と敵対する。茂呂との戦闘から逃げたときは、時間帯を進める保留量（+10 したあと）が 10 以上なら茂呂の状態も 1 になる

## 選択肢

| 場面                                     | 選択肢                                   | 結果                                     |
| ---------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| 港・赤城（売国奴を斬れが成功していない） | 「ぜひ助太刀させてくれ」、または答えない | 合流（`0x36CF` = 3）                     |
| 港・赤城（売国奴を斬れが成功していない） | 「じゃあ そうしよう」                    | 後回し（`0x36CF` = 2）。次に近づくと合流 |
| 戦闘中                                   | 逃げる                                   | 失敗（`0x36CF` = 5）                     |

## 変化する内容

| 対象                     | 変化                                     | 場面                                                               | 確度          |
| ------------------------ | ---------------------------------------- | ------------------------------------------------------------------ | ------------- |
| イベントの状態 `0x36CF`  | = 4                                      | 三姉妹・魔鱗組に勝った                                             | 🟢             |
| 人物                     | 茂呂 `0x3752`（通し番号 170）= 1（死亡） | 茂呂を斬った（茂呂との戦闘から逃げたときも、保留量が 10 以上なら） | 🟢             |
| 所持金                   | +1500 文                                 | 成功                                                               | 🟢             |
| 勢力の友好度             | 攘夷 +1（`0x3782`（通し番号 218）+1）    | 成功                                                               | 🟢             |
| 勢力の敵対状態           | 攘夷 = 0（`0x3788`（通し番号 224））     | 成功                                                               | 🟢             |
| 勢力の友好度             | 幕府 −1（`0x3783`（通し番号 219）+1）    | 成功                                                               | 🟢             |
| 勢力の敵対状態           | 幕府 = 1（`0x3786`（通し番号 222））     | 成功・逃げた                                                       | 🟢             |
| 勢力の友好度             | 攘夷 −1（`0x3785`（通し番号 221）+1）    | 逃げた                                                             | 🟢             |
| 勢力の敵対状態           | 攘夷 = 1（`0x3788`）                     | 逃げた                                                             | 🟢             |
| `0x3768`（通し番号 192） | = 1                                      | 合流                                                               | 🟢（意味は ❓） |
| 時間帯を進める保留量     | +10                                      | 成功・失敗                                                         | 🟢             |

施設・朱美の好感度は変わらない。三姉妹・赤城・小暮は退くだけで死なない。

## 前後のイベント

- 前：[売国奴を斬れ](prajna__3_day__kill_the_traitor.md)（3日目夕。合流のしかたが変わる）、墓場の[真実](prajna__3_day__the_truth.md)（成功していないことが条件）または[夜の墓場で](prajna__3_day__at_the_cemetery_in_the_night.md)
- 同じ港の対：真実が成功しているときは[罠を破れ](prajna__3_day__break_the_snare.md)。罠を破れで説得に失敗し、茂呂が斬られると、この後半（三姉妹・魔鱗組との戦闘）に入り、勝つと `0x36CF` = 4 になる
- 同じ時間帯のほかの勢力：[剣術大会の準備](shogunate__3_day__preparing_for_the_battle_tournament.md)、[危険な賭け](foreigners__3_day__a_risky_gamble.md)
- 次：[志士の刀](prajna__4_day__blades_of_the_patriots.md)（大寄せのあと、攘夷ルートのとき）
- 茂呂が死ぬと、幕府ルート（[公儀の剣](shogunate__4_day__imperial_sword.md)）に入れない（[characters](../save_format/chunks/characters/README.md)）

## 未確認のこと

- 🔶 茂呂との戦闘は茂呂を斬ると終わるので、成功の流れでは茂呂は必ず死ぬとみられる
- ❓ `0x3768`（通し番号 192）の意味
- 🔶 茂呂との戦闘から逃げたときに保留量で茂呂の生死が分かれる理由（時間帯が進むと襲撃が済んだ扱いになるとみられる）
