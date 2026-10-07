---
event_id: 93
state_offset: "0x3705"

title:
  ja: 破滅への道
  en: Road to Ruin

faction:
  name: 幕府
  route: >-
    幕府ルートで鬼怒川に従った場合の結末。[闇黒の意志](shogunate__after_tournament__a_dark_will.md)で鬼怒川に従い、
    [大老武断](shogunate__after_tournament__chief_minister_at_war.md)→[般若党壊滅](shogunate__after_tournament__annihilation_of_the_prajnas.md)→[黒船を我が手に](shogunate__after_tournament__black_ship_in_hand.md)→[剣客 茂呂茂](shogunate__after_tournament__shigeru_moro_swordsman.md)と進み、茂呂を倒すと続けて起きる。

summary: >-
  数日後、鬼怒川は製糸工場の約束を反故にして兵器工場を作り、借りた黒船も返さずローラを領事館に閉じ込める。
  日本は鬼怒川の独裁の下で軍国主義へ進み、誰も滅亡に向かっていることに気づかなかった、と語られて終わる。

timing:
  phase: 結末
  slot: なし
  note: "段階 999。剣客 茂呂茂から続けて起きる"

location: 居留地・領事館（数日後）ほか

conditions:
  - flag: "0x36E9"
    serial: 65
    test: "== 4"
    meaning: 剣客 茂呂茂で茂呂を倒した（成功の直後に続けて始まる）
    confidence: 🟢

failure_conditions:
  - flag: "0x36DF"
    serial: 55
    test: ">= 3"
    meaning: 闇黒の意志で鬼怒川を拒み、憂国の士の側に進んだ（前の般若党壊滅・黒船を我が手に・剣客 茂呂茂が起きない）
    confidence: 🟢
  - flag: "0x3789"
    serial: 225
    test: "== 2"
    meaning: 黒船を我が手にの前に幕府ルートが閉じた（大寄せで入れないと決まった、公儀の剣で失敗した、東国の騎士・志士の刀を引き受けた、最後通告を見た）
    confidence: 🟢

flag_changes:
  - flag: 時間帯
    value: "= 0"
    when: 場面の開始
    meaning: 昼にする
    confidence: 🟢
  - flag: "0x3705"
    serial: 93
    value: "= 4"
    when: 結末の場面
    meaning: この結末を迎えた
    confidence: 🟢
  - flag: "0x37A4"
    serial: 252
    value: "= 2"
    when: 結末の場面
    meaning: 黒船を幕府が返さない（黒船を我が手にで 1 になった値）
    confidence: 🔶
  - flag: 段階
    value: "= 999"
    when: 結末の場面
    meaning: 結末
    confidence: 🟢

sources: [A]
---

# 破滅への道（Road to Ruin）

## 流れ

1. [剣客 茂呂茂](shogunate__after_tournament__shigeru_moro_swordsman.md)で茂呂を倒すと、続けて始まる。時間帯は昼になる
2. 数日後、ローラが製糸工場の建設はどうなったかと尋ねると、鬼怒川は「あれはやめましたよ」「兵器工場を作ることにしました」と答える。小さな国が強くなるには植民地を獲得して資源を確保するのが早道で、それは列強に学んだことだと言う
3. ローラが黒船を返すよう求めると、鬼怒川は「あれは我々が貰っておくことにしました」「黒船も大砲も我らが握っているのですよ」と拒み、ローラを領事館へ送り返して、当分は領事館の外に出ることも本国との連絡も禁じる
4. やがて鬼怒川は黒船の建造に成功したと演説し、植民地獲得の戦へ兵士を送り出す
5. 「鬼怒川独裁の下 日本は軍国主義をひた走る」「まさか滅亡に向かって ひた走っていようとは 誰一人気がつかなかったのである」と語られ、スタッフロールになる。結末を迎える（`0x3705`（通し番号 93）= 4）

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| なし | — | 選択肢はない |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| 結末の状態 `0x3705` | = 4 | 結末の場面 | 🟢 |
| 黒船の扱い `0x37A4`（通し番号 252） | = 2 | 結末の場面 | 🟢（値）／🔶（意味） |
| 段階 | = 999 | 結末の場面 | 🟢 |
| 時間帯 | = 0（昼） | 開始 | 🟢 |

## 前後のイベント

- 前：[剣客 茂呂茂](shogunate__after_tournament__shigeru_moro_swordsman.md)（茂呂を倒す）
- 幕府ルートのもう一つの結末：[変わり往く心](shogunate__ending__a_change_of_heart.md)（[憂国の士](shogunate__after_tournament__patriots.md)の側）
- 次：なし（周回の終わり）

## 未確認のこと

- 🔶 `0x37A4`（通し番号 252）の意味（[黒船を我が手に](shogunate__after_tournament__black_ship_in_hand.md)を参照）
- ❓ この結末を周回をまたいで記録する位置（[event-chart](../save_format/chunks/event-chart/README.md) の記録 B）がどう変わるか（要ゲーム内確認）
