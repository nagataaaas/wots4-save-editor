---
event_id: 65
state_offset: "0x36E9"

title:
  ja: 剣客 茂呂茂
  en: Shigeru Moro, Swordsman

faction:
  name: 幕府
  route: >-
    幕府ルートで鬼怒川に従う側の最後のイベント。[黒船を我が手に](shogunate__after_tournament__black_ship_in_hand.md)の成功後、夜に黒船の中へ入ると起き、
    茂呂を倒すと結末[破滅への道](shogunate__ending__road_to_ruin.md)になる。

summary: >-
  黒船の警備中、船内で茂呂が待ち構えている。鬼怒川は怪物だと説く茂呂と一騎打ちになり、倒すと茂呂は「鬼怒川を斬れ」と言い残して死ぬ。
  そのまま結末の破滅への道へ進む。

summary_en: >-
  While you are guarding the Black Ship, Moro is waiting inside. A duel begins with Moro, who argues that Kinugawa is a monster; defeated, Moro dies saying "Cut down Kinugawa."
  It goes straight on to the Road to Ruin ending.

timing:
  phase: 剣術大会以降
  slot: 夜
  note: "段階 520"

location: 黒船の中（船長室の付近）

conditions:
  - flag: "0x36E9"
    serial: 65
    test: "<= 0"
    meaning: このイベントがまだ始まっていない
    confidence: 🟢
  - flag: "0x36E4"
    serial: 60
    test: "== 4"
    meaning: 黒船を我が手にが成功している
    confidence: 🟢
  - flag: "0x3789"
    serial: 225
    test: "== 1"
    meaning: 幕府ルートに入れる
    confidence: 🟢
  - flag: 段階
    test: "== 520"
    meaning: 剣術大会以降（520）
    confidence: 🟢
  - flag: 時間帯
    test: "== 2"
    meaning: 夜
    confidence: 🟢
  - flag: 現在の地域
    test: "== 5"
    meaning: 黒船の中にいる（さらに船内の決まった場所まで進むと始まる）
    confidence: 🟢

failure_conditions:
  - flag: "0x36DF"
    serial: 55
    test: ">= 3"
    meaning: 闇黒の意志で鬼怒川を拒み、憂国の士の側に進んだ（開始条件の黒船を我が手にの成功 `0x36E4` = 4 が満たされなくなる）
    confidence: 🟢
  - flag: "0x3789"
    serial: 225
    test: "== 2"
    meaning: 黒船を我が手にの前に幕府ルートが閉じた（大寄せで入れないと決まった、公儀の剣で失敗した、東国の騎士・志士の刀を引き受けた、最後通告を見た）。黒船を我が手にの成功で 1 に戻る
    confidence: 🟢

flag_changes:
  - flag: "0x36E9"
    serial: 65
    value: "= 3"
    when: 場面が始まったとき
    meaning: 進行中
    confidence: 🟢
  - flag: "0x36E9"
    serial: 65
    value: "= 4"
    when: 茂呂を倒したとき
    meaning: イベント成功。続けて結末の破滅への道になる
    confidence: 🟢

sources: [A]
---

# 剣客 茂呂茂（Shigeru Moro, Swordsman）

## 流れ

1. [黒船を我が手に](shogunate__after_tournament__black_ship_in_hand.md)の成功後（`0x36E4`（通し番号 60）= 4）、夜に黒船の中へ入り、船内の決まった場所（船長室の付近 [A]）まで進むと始まる（`0x36E9`（通し番号 65）= 3）
2. 茂呂が「黒船の番を頼まれたのか」と現れ、鬼怒川が本心から産業の発展や英国との友好を願っていると信じているのか、「あの男は怪物だ」と問いかける
3. どの返事を選んでも、茂呂は「残念だな」と言って刀を抜き、一騎打ちになる
4. 茂呂を倒すと、茂呂は「今からでも遅くない……鬼怒川を……斬れ……」「日本は……滅びるぞ……」と言い残して死ぬ
5. 成功（`0x36E9` = 4）。続けて結末[破滅への道](shogunate__ending__road_to_ruin.md)になる

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| 茂呂の問いかけ | 「すでに 決めた道だ…」 | 茂呂と一騎打ち |
| 茂呂の問いかけ | 「恥知らずの裏切り者が！」 | 茂呂と一騎打ち |
| 茂呂の問いかけ | 「世迷い言は終わったか？」、または答えない | 茂呂と一騎打ち |

どれを選んでも茂呂の返事（「残念だな」）と一騎打ちは同じ（🟢）。

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| イベントの状態 `0x36E9` | = 3 → 4 | 開始 → 茂呂を倒す | 🟢 |
| 人物 | 茂呂が死亡 | 一騎打ち | 🟢 |

報酬・友好度・時間帯を進める保留量は変わらない（🟢）。茂呂の状態（`0x3752`（通し番号 170））はこのイベントでは書き換えない（🟢）。
一騎打ちからは逃げられず、失敗（`0x36E9` = 5）になる場面はない（🔶）。

## 前後のイベント

- 前：[黒船を我が手に](shogunate__after_tournament__black_ship_in_hand.md)（成功が発生条件）
- 対になる分岐の最後：[武人 琴吹光](shogunate__after_tournament__hikaru_kotobuki_military_man.md)
- 次：[破滅への道](shogunate__ending__road_to_ruin.md)（茂呂を倒すと続けて起きる）

## 未確認のこと

- [A] は場所を「黒船の船長室」と書く。始まる場所が船長室かどうかは要ゲーム内確認（🔶）
- 🔶 一騎打ちで負けた（主人公が倒れた）ときの扱い
- ❓ 選択のあとに、位置の分からない値が 5・6 になる。意味は分からない
