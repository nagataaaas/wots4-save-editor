---
event_id: 53
state_offset: "0x36DD"

title:
  ja: 闇黒の意志
  en: A Dark Will

faction:
  name: 幕府
  route: >-
    幕府ルートの剣術大会以降の最初のイベント。ここでの選択で、鬼怒川に賛同する[大老武断](shogunate__after_tournament__chief_minister_at_war.md)（→ 結末[破滅への道](shogunate__ending__road_to_ruin.md)）と、
    鬼怒川に背く[憂国の士](shogunate__after_tournament__patriots.md)（→ 結末[変わり往く心](shogunate__ending__a_change_of_heart.md)）に分かれる。

summary: >-
  代官所の門前で三姉妹に招かれ、鬼怒川・琴吹・茂呂の話し合いに同席する。鬼怒川が英国の大砲で攘夷の残党を一掃すると言い出し、茂呂が席を立つ。
  茂呂に続いて席を立ち、鬼怒川を拒めば憂国の士へ、話を聞き続けるか鬼怒川に理解を示せば大老武断へ進む。

timing:
  phase: 剣術大会以降
  slot: なし
  note: "段階 500。時間帯の条件はない"

location: 代官所の門の外（三姉妹）→ 代官所の中（鬼怒川・琴吹・茂呂）

conditions:
  - flag: "0x36DD"
    serial: 53
    test: "<= 2"
    meaning: このイベントがまだ進行中でない
    confidence: 🟢
  - flag: "0x3789"
    serial: 225
    test: "== 1"
    meaning: 幕府ルートに入れる
    confidence: 🟢
  - flag: 段階
    test: "== 500"
    meaning: 剣術大会以降
    confidence: 🟢
  - flag: 現在の地域
    test: "== 18"
    meaning: 代官所の門の外にいる
    confidence: 🟢

failure_conditions:
  - flag: "0x3789"
    serial: 225
    test: "== 2"
    meaning: 幕府ルートが閉じた（大寄せで入れないと決まった、公儀の剣で失敗した、東国の騎士・志士の刀を引き受けた、最後通告を見た）
    confidence: 🟢
  - flag: 段階
    test: "> 500"
    meaning: このイベントを起こさないまま、剣術大会以降の次の段階（510 以降）に進んだ
    confidence: 🟢

flag_changes:
  - flag: "0x36DD"
    serial: 53
    value: "= 3"
    when: 三姉妹に近づいて場面が始まったとき
    meaning: 進行中
    confidence: 🟢
  - flag: "0x36DD"
    serial: 53
    value: "= 4"
    when: 鬼怒川への態度を決めたとき（どちらの分岐でも）
    meaning: イベント成功
    confidence: 🟢
  - flag: "0x36DE"
    serial: 54
    value: "= 3"
    when: 「どうぞ お続けください」または「大老の言にも一理ある」を選んだとき（答えなかったときも）
    meaning: 大老武断へ進む
    confidence: 🟢
  - flag: "0x36DF"
    serial: 55
    value: "= 3"
    when: 「…御免」のあと「まったく…話しにならん」を選んだとき
    meaning: 憂国の士へ進む
    confidence: 🟢

sources: [A]
---

# 闇黒の意志（A Dark Will）

## 流れ

1. 剣術大会のあと、代官所の門の外にいる三姉妹（万由・千佳・百合）に近づくと「いいところにお出で下さいました」「お父様がお待ちかねですわ」と招き入れられる（`0x36DD`（通し番号 53）= 3）
2. 代官所の中で、琴吹が剣術大会以来の鬼怒川のやり方を諫め、鬼怒川が「私一人が悪人になればよいのだと」と答える。茂呂が黙って席を立ち、鬼怒川は「捨て置きなさい」と言う
3. ここで最初の選択。「…御免」で茂呂に続いて席を立つと、琴吹に「なにっ お おぬしまで……」、鬼怒川に「ひねくれ者がもう一人いたようですね」と言われ、2つ目の選択になる
4. 鬼怒川を拒む（「まったく…話しにならん」）と、`0x36DD` = 4、`0x36DF`（通し番号 55）= 3 になり、そのまま[憂国の士](shogunate__after_tournament__patriots.md)へ続く
5. 話を聞き続ける（「どうぞ お続けください」）か鬼怒川に理解を示す（「大老の言にも一理ある」）と、鬼怒川が英国の大砲で攘夷の残党を吹き飛ばすと言い、三姉妹が「領事館へ行って交渉しましょう」と応じる。`0x36DD` = 4、`0x36DE`（通し番号 54）= 3 になり、そのまま[大老武断](shogunate__after_tournament__chief_minister_at_war.md)へ続く
6. 2つ目の選択で答えないと、琴吹に「御大老様はな 日本のために苦渋の決断をされたんだ」と諭され、もう一度同じ選択になる

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| 茂呂が席を立ったあと | 「…御免」 | 2つ目の選択へ |
| 茂呂が席を立ったあと | 「どうぞ お続けください」、または答えない | 大老武断へ（`0x36DD` = 4、`0x36DE` = 3） |
| 2つ目（「こら 最後まで話を聞かないと駄目だぞ」のあと） | 「まったく…話しにならん」 | 憂国の士へ（`0x36DD` = 4、`0x36DF` = 3） |
| 2つ目 | 「大老の言にも一理ある」 | 大老武断へ（`0x36DD` = 4、`0x36DE` = 3） |
| 2つ目 | 答えない | 琴吹に諭され、2つ目の選択をやり直す |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| イベントの状態 `0x36DD` | = 3 → 4 | 場面の開始 → 選択後 | 🟢 |
| 大老武断の状態 `0x36DE` | = 3 | 鬼怒川に従う側を選んだ | 🟢 |
| 憂国の士の状態 `0x36DF` | = 3 | 鬼怒川を拒んだ | 🟢 |

報酬・友好度・人物の生死は変わらない（🟢）。失敗（`0x36DD` = 5）になる場面はない。

## 前後のイベント

- 前：[覇者となる](other__4_day__we_are_the_champions.md)（剣術大会のあと。幕府ルートで表彰台に上らずに帰る [A]）
- 次：[大老武断](shogunate__after_tournament__chief_minister_at_war.md)（鬼怒川に従う）→ [般若党壊滅](shogunate__after_tournament__annihilation_of_the_prajnas.md) → [黒船を我が手に](shogunate__after_tournament__black_ship_in_hand.md) → [剣客 茂呂茂](shogunate__after_tournament__shigeru_moro_swordsman.md) → [破滅への道](shogunate__ending__road_to_ruin.md)
- 次：[憂国の士](shogunate__after_tournament__patriots.md)（鬼怒川を拒む）→ [三匹で斬る](shogunate__after_tournament__the_three_kataneers.md) → [武人 琴吹光](shogunate__after_tournament__hikaru_kotobuki_military_man.md) → [変わり往く心](shogunate__ending__a_change_of_heart.md)

## 未確認のこと

- [A] は「待ってもらえば準備に戻れる」と書くが、三姉妹に近づくとすぐ場面が始まり、待ってもらう選択肢はない（🔶。要ゲーム内確認）
- ❓ 選択のあとに、位置の分からない値が 5 になる。意味は分からない
