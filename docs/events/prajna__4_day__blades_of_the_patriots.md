---
event_id: 44
state_offset: "0x36D4"

title:
  ja: 志士の刀
  en: Blades of the Patriots

faction:
  name: 攘夷（般若党）
  route: >-
    大老の大寄せのあと、攘夷ルートに入れるときに起きる4日目以降の最初のイベント。
    引き受けると剣術大会を攘夷側で戦う（剣術大会（攘夷））。斬りかかると攘夷ルートが閉じる。

summary: >-
  神社で赤城が剣術大会に乗じて大老を討つ計画を話し、参加者の残る一枠を主人公に頼む。
  引き受けると成功し、幕府・外国のルートが閉じる。赤城たちに斬りかかると戦闘になり、失敗して攘夷ルートが閉じる。

summary_en: >-
  At the Shrine, Akagi explains a plan to strike down the Chief Minister during the Battle Tournament and asks the hero to take the last remaining entry. Agreeing is a success and closes the Shogunate and Foreigner routes.
  Attacking Akagi and his men starts a fight, fails the event, and closes the Prajna route.

timing:
  phase: 4日目以降（剣術大会前）
  slot: 昼
  note: "「考えさせてくれ…」で保留すると、同じ条件で何度でも赤城に話しかけられる"

location: 神社（赤城のもと）

conditions:
  - flag: "0x36D4"
    serial: 44
    test: "<= 2"
    meaning: このイベントがまだ終わっていない（未到達、または保留中）
    confidence: 🟢
  - flag: "0x378B"
    test: "== 1"
    meaning: ルート分岐：攘夷 が「ルートに入れる」
    confidence: 🟢
  - flag: "0x378D"
    test: "== 1"
    meaning: 通常の周回（真ルートでない）
    confidence: 🟢
  - flag: 時間帯
    test: "== 0"
    meaning: 昼
    confidence: 🟢
  - flag: 現在の地域
    test: "== 4"
    meaning: 神社（地域の番号は開始地点 ID と同じとみなした）
    confidence: 🔶

failure_conditions:
  - flag: "0x378B"
    serial: 227
    test: "== 2"
    meaning: 攘夷のルートに入れなくなった（大寄せで攘夷の友好度が 3 に足りなかったとき、公儀の剣・東国の騎士を引き受けたとき）
    confidence: 🟢
  - flag: 段階
    test: "> 400"
    meaning: 剣術大会より先へ進んだ（剣術大会の表彰式を辞退すると 500。峰打ちの勝ち・最後通告で 410・420）
    confidence: 🟢

flag_changes:
  - flag: "0x36D4"
    serial: 44
    value: "= 2"
    when: 初回に「考えさせてくれ…」で保留したとき
    meaning: 保留中（次に話しかけると「決まったか」から始まる）
    confidence: 🟢
  - flag: "0x36D4"
    serial: 44
    value: "= 4"
    when: 「任せてくれ！」または「やらせて貰おう！」で引き受けたとき
    meaning: イベント成功
    confidence: 🟢
  - flag: "0x3789"
    value: "= 2"
    when: 引き受けたとき
    meaning: ルート分岐：幕府 を「入れない」にする
    confidence: 🟢
  - flag: "0x378A"
    value: "= 2"
    when: 引き受けたとき
    meaning: ルート分岐：外国 を「入れない」にする
    confidence: 🟢
  - flag: "0x36D4"
    serial: 44
    value: "= 5"
    when: 戦闘になったとき
    meaning: イベント失敗
    confidence: 🟢
  - flag: "0x378B"
    value: "= 2"
    when: 戦闘になったとき
    meaning: ルート分岐：攘夷 を「入れない」にする
    confidence: 🟢
  - flag: "0x37A2"
    value: "= 2"
    when: 戦闘になったとき
    meaning: 不明
    confidence: ❓

sources: [A]
---

# 志士の刀（Blades of the Patriots）

## 流れ

1. 4日目以降の昼、神社へ行くと、般若党が剣術大会の触れについて話している。赤城は「身分前歴を問わず」の一文から、大会に出て大老を討つ機会があると言い、参加者に小暮・細川を指名し、残る一人を主人公に頼む
2. 引き受けると「頼もしい奴」で終わり、成功（`0x36D4`（通し番号 44）= 4）。幕府・外国のルートが閉じる
3. 保留すると「判ってるな」「時間はないぞ」と言われて終わる（= 2）。再び赤城のもとへ行くと「決まったか」と聞かれ、同じ二択になる
4. 赤城たちの前で刀を抜くと「おいおい 危ねえじゃねえか」と咎められ、三択になる。謝るか稽古と答えれば収まる
5. 赤城・小暮・細川ら般若党に斬りかかるか「誰でもいいから殺したい…」を選ぶと、般若党全員と戦闘になる。戦闘の開始時点で失敗（= 5）になり、攘夷ルートが閉じる。戦闘は地図の外へ出て逃げられる

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| 初回の依頼 | 「任せてくれ！」 | 引き受ける。成功（`0x36D4` = 4）、幕府・外国のルートが閉じる |
| 初回の依頼 | 「考えさせてくれ…」 | 保留（`0x36D4` = 2）。後で話しかけ直せる |
| 2回目以降（「決まったか」） | 「やらせて貰おう！」 | 引き受ける（初回の「任せてくれ！」と同じ） |
| 2回目以降（「決まったか」） | 「もう少し待ってくれ」 | 保留のまま終わる |
| 刀を抜いたとき | 「これは すまん」 | 刀を収めて終わる |
| 刀を抜いたとき | 「ただの稽古だ」 | 刀を収めて終わる |
| 刀を抜いたとき | 「誰でもいいから殺したい…」 | 般若党と戦闘。失敗（`0x36D4` = 5）、攘夷ルートが閉じる |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| `0x3789`（ルート分岐：幕府） | = 2（入れない） | 引き受けた | 🟢 |
| `0x378A`（ルート分岐：外国） | = 2（入れない） | 引き受けた | 🟢 |
| `0x378B`（ルート分岐：攘夷） | = 2（入れない） | 戦闘になった | 🟢 |
| `0x37A2`（意味 ❓） | = 2 | 戦闘になった | 🟢値 ／ ❓意味 |
| 報酬 | なし | — | 🟢 |

## 前後のイベント

- 前：[大老の大寄せ](other__4_day__the_chief_ministers_big_move.md)
- 次：[剣術大会開催](other__4_day__battle_tournament_opens.md) → [剣術大会（攘夷）](prajna__4_day__battle_tournament_prajnas.md)（成功時。`0x36D4` = 4 のとき剣術大会が攘夷側で開かれる 🟢）
- 失敗時：攘夷ルートが閉じる。幕府・外国のルート分岐は変わらないので、その後は[公儀の剣](shogunate__4_day__imperial_sword.md)・[東国の騎士](foreigners__4_day__the_eastern_knight.md)・[根無し草](other__4_day__idle_chatter.md)のどれかに進むとみられる（🔶）

## 未確認のこと

- 🔶 発生場所の地域番号 4 を神社とみなしたのは、開始地点 ID の表と番号が同じだという仮定による
- ❓ 戦闘で赤城・小暮・細川を倒したときに、人物の状態（`0x374E` 赤城 など）が変わるか
- ❓ 失敗したあと、ほかの勢力のルートに入れるかはゲーム内で未確認
