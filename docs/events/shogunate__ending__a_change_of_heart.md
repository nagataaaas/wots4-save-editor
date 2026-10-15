---
event_id: 94
state_offset: "0x3706"

title:
  ja: 変わり往く心
  en: A Change of Heart

faction:
  name: 幕府
  route: >-
    幕府ルートで鬼怒川に背いた場合の結末。[闇黒の意志](shogunate__after_tournament__a_dark_will.md)で鬼怒川を拒み、
    [憂国の士](shogunate__after_tournament__patriots.md)→[三匹で斬る](shogunate__after_tournament__the_three_kataneers.md)→[武人 琴吹光](shogunate__after_tournament__hikaru_kotobuki_military_man.md)と進み、琴吹たちを全員倒すと続けて起きる。

summary: >-
  攘夷が一掃されて阿弥浜に留まる理由を失った鬼怒川は江戸へ帰り、阿弥浜は一気に近代化する。茂呂は財閥を築いて伯爵の称号を得て、主人公はその相談役になる。
  晩年の茂呂が、侍はもう必要なくなったから滅んだと語る場面で終わる。

summary_en: >-
  With the Prajnas wiped out and no reason left to stay in Amihama, Kinugawa returns to Edo, and Amihama rapidly modernizes. Moro builds a business empire and gains the title of count, and the hero becomes his advisor.
  It ends with the aged Moro saying that the samurai died out because they were no longer needed.

timing:
  phase: 結末
  slot: なし
  note: "段階 999。武人 琴吹光から続けて起きる"

location: 阿弥浜（数日後）

conditions:
  - flag: "0x36EA"
    serial: 66
    test: "== 4"
    meaning: 武人 琴吹光で琴吹たちを全員倒した（成功の直後に続けて始まる）
    confidence: 🟢

failure_conditions:
  - flag: "0x36DE"
    serial: 54
    test: ">= 3"
    meaning: 闇黒の意志で鬼怒川に従い、大老武断の側に進んだ（前の三匹で斬る・武人 琴吹光が起きない）
    confidence: 🟢
  - flag: "0x3789"
    serial: 225
    test: "== 2"
    meaning: 幕府ルートが閉じ、前の三匹で斬るが起きない（大寄せで入れないと決まった、公儀の剣で失敗した、東国の騎士・志士の刀を引き受けた、最後通告を見た）
    confidence: 🟢

flag_changes:
  - flag: "0x3706"
    serial: 94
    value: "= 4"
    when: 結末の場面
    meaning: この結末を迎えた
    confidence: 🟢
  - flag: 段階
    value: "= 999"
    when: 結末の場面
    meaning: 結末
    confidence: 🟢

sources: [A]
---

# 変わり往く心（A Change of Heart）

## 流れ

1. [武人 琴吹光](shogunate__after_tournament__hikaru_kotobuki_military_man.md)で琴吹たちを全員倒すと、続けて始まる
2. 数日後、攘夷が一掃されて阿弥浜に留まる理由を失った鬼怒川は江戸へ帰る
3. 血で血を洗う戦いが終わり、阿弥浜には一気に近代化の花が開く。茂呂は手腕を振るって茂呂財閥を築き、伯爵の称号も得る。その傍らには相談役として、かつて共に戦った侍（主人公とみられる 🔶）の姿がある
4. 文明開化の象徴の舞踏会が連日開かれ、美女と踊る紳士の多くはかつて侍と呼ばれた男たちだった
5. 晩年の茂呂は「侍はもうこの国には必要なくなったから 滅んだのだと……」と語るが、その目はどこか哀しそうだった、と語られ、スタッフロールになる。結末を迎える（`0x3706`（通し番号 94）= 4）

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| なし | — | 選択肢はない |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| 結末の状態 `0x3706` | = 4 | 結末の場面 | 🟢 |
| 段階 | = 999 | 結末の場面 | 🟢 |

[破滅への道](shogunate__ending__road_to_ruin.md)と違い、黒船の扱い（`0x37A4`（通し番号 252））は書き換えない（🟢）。

## 前後のイベント

- 前：[武人 琴吹光](shogunate__after_tournament__hikaru_kotobuki_military_man.md)（琴吹たちを全員倒す）
- 幕府ルートのもう一つの結末：[破滅への道](shogunate__ending__road_to_ruin.md)（[大老武断](shogunate__after_tournament__chief_minister_at_war.md)の側）
- 次：なし（周回の終わり）

## 未確認のこと

- ❓ この結末を周回をまたいで記録する位置（[event-chart](../save_format/chunks/event-chart/README.md) の記録 B）がどう変わるか（要ゲーム内確認）
