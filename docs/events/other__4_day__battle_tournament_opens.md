---
event_id: 46
state_offset: "0x36D6"

title:
  ja: 剣術大会開催
  en: Battle Tournament Opens

faction:
  name: 共通・無所属
  route: >-
    4日目以降の勢力のイベント（公儀の剣・東国の騎士・志士の刀・根無し草）のあと、剣術大会の会場で始まる。
    成功させた4日目のイベントに応じて、幕府・外国・攘夷・無所属のどの組み合わせの剣術大会になるかが決まる。

summary: >-
  大通りの剣術大会の会場で、ローラ・鬼怒川・茂呂・J.J. らが観覧するなか、琴吹が大会の決まり（籤で選んだ相手と戦い、
  先に一本取った者が勝ち、三回戦を勝ち抜けば魔鱗組の資格）を告げる。続けて各勢力の剣術大会の1回戦へ進む。

timing:
  phase: 4日目以降（剣術大会前）
  slot: なし
  note: "大老の大寄せのあと、会場に入ったときに始まる"

location: 大通り（剣術大会の会場）

conditions:
  - flag: "0x36D6"
    serial: 46
    test: "<= 0"
    meaning: このイベントをまだ見ていない
    confidence: 🟢
  - flag: "0x378D"
    serial: 229
    test: "== 1"
    meaning: 通常の周回
    confidence: 🟢
  - flag: "0x36D1"
    serial: 41
    test: ">= 4"
    meaning: 大老の大寄せを終えた
    confidence: 🟢
  - flag: 段階
    test: "== 400"
    meaning: 4日目以降（剣術大会前）
    confidence: 🟢
  - flag: 現在の地域
    test: "== 剣術大会の会場"
    meaning: 大通りの会場に入る。時間帯は問わない
    confidence: 🟢
  - flag: "0x37AE"
    serial: 262
    test: "== 1"
    meaning: 汎用のフラグが 1 になったとき（会場の受付で「参加を希望する」を選んだときとみられる）
    confidence: 🔶

failure_conditions: []

flag_changes:
  - flag: "0x37AE"
    serial: 262
    value: "= 0"
    when: 会場の準備（大老の大寄せの終わり、会場に入ったとき）
    meaning: 汎用のフラグを 0 に戻す
    confidence: 🟢
  - flag: "0x36D6"
    serial: 46
    value: "= 4"
    when: 開会の場面の始め
    meaning: イベント成功
    confidence: 🟢
  - flag: "0x36D7"
    serial: 47
    value: "= 3"
    when: 公儀の剣（通し番号 42）が 4 のとき
    meaning: 剣術大会（幕府）を進行中にする
    confidence: 🟢
  - flag: "0x36D8"
    serial: 48
    value: "= 3"
    when: 公儀の剣が 4 でなく、東国の騎士（通し番号 43）が 4 のとき
    meaning: 剣術大会（外国）を進行中にする
    confidence: 🟢
  - flag: "0x36D9"
    serial: 49
    value: "= 3"
    when: 上の2つが 4 でなく、志士の刀（通し番号 44）が 4 のとき
    meaning: 剣術大会（攘夷）を進行中にする
    confidence: 🟢
  - flag: "0x36DA"
    serial: 50
    value: "= 3"
    when: 上の3つが 4 でないとき（根無し草が 4 のとき、またはどれも 4 でないとき）
    meaning: 剣術大会（無所属）を進行中にする
    confidence: 🟢
  - flag: "0x36D6"
    serial: 46
    value: "= 5"
    when: 4日目のイベントをどれも成功させずに大会に出て、2回戦に勝ったとき
    meaning: イベント失敗。続けて最後通告
    confidence: 🔶

sources: [A]
---

# 剣術大会開催（Battle Tournament Opens）

## 流れ

1. [大老の大寄せ](other__4_day__the_chief_ministers_big_move.md) のあと、大通りの剣術大会の会場に入る。受付で「参加を希望する」を選ぶと始まるとみられる（🔶。「もう少し考えるか…」では始まらない）
2. 開会の場面。始めに `0x36D6` = 4。ローラ・鬼怒川・J.J.・茂呂らが観覧席で話し、琴吹が大会の決まりを告げる
3. 成功させた4日目のイベントで、どの組み合わせの大会になるかが決まる（下の表）。上から順に判定する
4. 各勢力の剣術大会の1回戦へ進む。試合の内容と結末は、それぞれの剣術大会のファイルにある

| 優先 | 条件 | 進む大会 | 状態 |
|---|---|---|---|
| 1 | [公儀の剣](shogunate__4_day__imperial_sword.md) `0x36D2` = 4 | [剣術大会（幕府）](shogunate__4_day__battle_tournament_shogunate.md) | `0x36D7` = 3 |
| 2 | [東国の騎士](foreigners__4_day__the_eastern_knight.md) `0x36D3` = 4 | [剣術大会（外国）](foreigners__4_day__battle_tournament_foreigners.md) | `0x36D8` = 3 |
| 3 | [志士の刀](prajna__4_day__blades_of_the_patriots.md) `0x36D4` = 4 | [剣術大会（攘夷）](prajna__4_day__battle_tournament_prajnas.md) | `0x36D9` = 3 |
| 4 | [根無し草](other__4_day__idle_chatter.md) `0x36D5` = 4 | [剣術大会（無所属）](other__4_day__battle_tournament_independent.md) | `0x36DA` = 3 |
| 5 | どれも 4 でない | 剣術大会（無所属）の組み合わせ | `0x36DA` = 3 |

- 優先 5 の場合：2回戦に勝ったあと、3回戦の組み合わせが決まらず、`0x36D6` = 5 にして [最後通告](other__ending__final_warning.md) へ進む（🔶）
- どの大会でも、試合に負けるか降参すると、その大会の状態が 5 になり [最後通告](other__ending__final_warning.md) へ進む。3回戦（決勝）に勝つと [覇者となる](other__4_day__we_are_the_champions.md)

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| 会場の受付 | 「参加を希望する」 | 開会（🔶） |
| 同上 | 「もう少し考えるか…」 | 始まらない（🔶） |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| `0x36D6`（通し番号 46） | 4 | 開会の場面の始め | 🟢 |
| 剣術大会の状態 `0x36D7`〜`0x36DA` | どれか1つが 3 | 開会の場面の終わり | 🟢 |
| `0x36D6` | 5 | 優先 5 で2回戦に勝ったとき | 🔶 |
| `0x37AE`（通し番号 262） | 0 | 会場の準備 | 🟢 |

## 前後のイベント

- 前：[公儀の剣](shogunate__4_day__imperial_sword.md)／[東国の騎士](foreigners__4_day__the_eastern_knight.md)／[志士の刀](prajna__4_day__blades_of_the_patriots.md)／[根無し草](other__4_day__idle_chatter.md)
- 次：[剣術大会（幕府）](shogunate__4_day__battle_tournament_shogunate.md)／[剣術大会（外国）](foreigners__4_day__battle_tournament_foreigners.md)／[剣術大会（攘夷）](prajna__4_day__battle_tournament_prajnas.md)／[剣術大会（無所属）](other__4_day__battle_tournament_independent.md)

## 未確認のこと

- 🔶 開始の引き金が受付の「参加を希望する」か（汎用のフラグ `0x37AE` が 1 になると始まる）
- 🔶 4日目のイベントを1つも成功させずに会場へ来たとき（勢力ルートが 1 なのにその勢力のイベントを終えていない場合など）の扱い。開会はするが、2回戦のあと失敗になるとみられる
- チャートの発生条件の文は「4日目以降 昼 剣術大会会場を訪れる」だが、開始の条件に時間帯は入っていない。受付が昼だけいるのかは要ゲーム内確認
