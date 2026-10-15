---
event_id: 55
state_offset: "0x36DF"

title:
  ja: 憂国の士
  en: Patriots

faction:
  name: 幕府
  route: >-
    幕府ルートで鬼怒川に背く側の1つ目。[闇黒の意志](shogunate__after_tournament__a_dark_will.md)で鬼怒川を拒むと続けて起き、
    成功すると[三匹で斬る](shogunate__after_tournament__the_three_kataneers.md)が起きるようになる。

summary: >-
  先に席を立った茂呂と合流し、攘夷の大将・副将の赤城と小暮を討てば鬼怒川が阿弥浜にいる理由がなくなり、江戸へ帰るはずだという策を聞く。
  伯爵が加わり、三人で神社の洞窟へ奇襲をかけることになる。会話のみ。

summary_en: >-
  You join Moro, who walked out first, and hear his plan: if you kill the Prajna leader and second-in-command, Akagi and Kogure, Kinugawa will have no reason to stay in Amihama and should return to Edo.
  The Count joins, and the three of you decide to launch a surprise attack on the cave at the Shrine. Conversation only.

timing:
  phase: 剣術大会以降
  slot: 昼
  note: "段階 500。闇黒の意志から続けて起き、単独では起きない"

location: 代官所の門の外（茂呂）→ 場所を変えて茂呂の話

conditions:
  - flag: "0x36DF"
    serial: 55
    test: "== 3"
    meaning: 闇黒の意志で鬼怒川を拒んだ（このとき 3 になり、続けてこのイベントが始まる）
    confidence: 🟢

failure_conditions:
  - flag: "0x36DE"
    serial: 54
    test: ">= 3"
    meaning: 闇黒の意志で鬼怒川に従い、大老武断の側に進んだ（このイベントの 3 は闇黒の意志で鬼怒川を拒むときだけ書かれる）
    confidence: 🟢
  - flag: "0x3789"
    serial: 225
    test: "== 2"
    meaning: 幕府ルートが閉じ、闇黒の意志が起きない（大寄せで入れないと決まった、公儀の剣で失敗した、東国の騎士・志士の刀を引き受けた、最後通告を見た）
    confidence: 🟢
  - flag: 段階
    test: "> 500"
    meaning: 闇黒の意志を起こさないまま、剣術大会以降の次の段階（510 以降）に進んだ
    confidence: 🟢

flag_changes:
  - flag: "0x36DF"
    serial: 55
    value: "= 4"
    when: 会話が終わったとき
    meaning: イベント成功
    confidence: 🟢
  - flag: 時間帯を進める保留量
    value: "+ 10"
    when: 会話が終わったとき
    meaning: 時間帯が進む
    confidence: 🟢

sources: [A]
---

# 憂国の士（Patriots）

## 流れ

1. [闇黒の意志](shogunate__after_tournament__a_dark_will.md)で鬼怒川を拒むと（`0x36DF`（通し番号 55）= 3）、続けて代官所の外で茂呂に「お前さんも逃げてきたのか」「まっとうな判断だな」と声をかけられ、場所を変える
2. 茂呂は、鬼怒川こそ一番血に飢えた人で、このままでは幕府も日本も滅びると言う。そもそも鬼怒川が阿弥浜に来たのは攘夷志士がはびこったからだと気づいた、と続ける
3. 1つ目の選択肢（誰を消すのか）は茂呂の返事が変わるだけ。茂呂の策は、攘夷志士を一掃して鬼怒川の役目をなくし、江戸へ帰らせること
4. 攘夷の中心は大将の赤城と副将の小暮で、釜茹でで志士が脱落している今が好機だが、二人だけでは厳しいと茂呂が言う。2つ目の選択肢も返事が変わるだけ
5. 伯爵が「ボクも混ぜてくれよ」と加わる（「ただ刺激が欲しいだけさ」）。決行は夕刻、準備ができたら洞窟の前に集合と言われて終わる
6. 成功（`0x36DF` = 4）

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| 茂呂の話 | 「大老を消すのか？」 | 茂呂「いくら何でもそいつは俺たちの力だけでは無理だ」。何も変わらない |
| 茂呂の話 | 「琴吹を消すのか？」 | 茂呂「そりゃ見当違いってもんだろ」。何も変わらない |
| 茂呂の話 | 「攘夷志士を消すのか？」、または答えない | 茂呂が策を説明する。何も変わらない |
| 二人だけだと言われる | 「望むところ」／「二人なんて無茶だ」 | 返事が変わるだけ。どちらも伯爵が加わる |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| イベントの状態 `0x36DF` | = 4 | 会話の終わり | 🟢 |
| 時間帯を進める保留量 | +10 | 会話の終わり | 🟢 |

報酬・友好度・人物の生死は変わらない（🟢）。失敗になる場面はない。
[大老武断](shogunate__after_tournament__chief_minister_at_war.md)と違い、黒船の大砲の印（`0x37C0`（通し番号 280））は立たない（🟢）。

## 前後のイベント

- 前：[闇黒の意志](shogunate__after_tournament__a_dark_will.md)（「…御免」→「まったく…話しにならん」）
- 対になる分岐：[大老武断](shogunate__after_tournament__chief_minister_at_war.md)
- 次：[三匹で斬る](shogunate__after_tournament__the_three_kataneers.md)（このイベントの成功 `0x36DF` = 4 が発生条件）

## 未確認のこと

- 茂呂は「決行は夕刻」と言うが、[三匹で斬る](shogunate__after_tournament__the_three_kataneers.md)には時間帯の条件がなく、神社に入れば始まる（🟢）。ゲーム内での見え方は要確認
- ❓ 選択のあとに、位置の分からない値が 5・6 になる。意味は分からない
