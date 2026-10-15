---
event_id: 90
state_offset: "0x3702"

title:
  ja: 希望の光
  en: The Light of Hope

faction:
  name: 真ルート
  route: >-
    真ルートを最後まで進めたときの結末（ベストエンディング）。[黒船の決闘](best__after_tournament__black_ship_battle.md)の成功から続けて起きる。
    途中で真ルートに失敗すると、代わりに[大老暗殺計画](best__2_day__plot_to_assassinate_the_chief_minister.md)から[大老は生きていた](best__ending__the_chief_minister_lived.md)へ進む。

summary: >-
  内乱の危機が去り、ローラが将軍に謁見して琴吹・茂呂ら仲間の無実を認めさせ、幕府・外国・攘夷の若者がそれぞれの道を歩む後日談が語られる。
  阿弥浜の海に昇る朝日に、無名の浪人を「希望の光」と重ねて終わる。

summary_en: >-
  The threat of civil war passes, Laura has an audience with the Shogun and gets Kotobuki, Moro and the other companions declared innocent, and an epilogue tells how the young people of the Shogunate, the Foreigners and the Prajnas each go their own way.
  It ends with the nameless ronin likened to "the light of hope" as the sun rises over the sea of Amihama.

timing:
  phase: 結末
  slot: なし
  note: "黒船の決闘から続けて起きる"

location: 阿弥浜（後日談の語り）

conditions:
  - flag: "0x3701"
    serial: 89
    test: "== 4"
    meaning: 黒船の決闘が成功した直後に続けて起きる（単独の発生条件はない）
    confidence: 🔶

failure_conditions:
  - flag: "0x378E"
    serial: 230
    test: "== 2"
    meaning: 真ルートを外れた（3日目夕までの場面で 2 になる）。この結末には進まず、大老暗殺計画へ進む
    confidence: 🟢
  - flag: "0x3758"
    serial: 176
    test: "== 1"
    meaning: J.J が死んだ（運命のルーレットの成功、伯爵に刺激をで J.J を倒した。伯爵救出から先が起きない）
    confidence: 🟢

flag_changes:
  - flag: 時間帯
    value: "= 0"
    when: 結末の始まり
    meaning: 昼
    confidence: 🔶
  - flag: "0x3702"
    serial: 90
    value: "= 4"
    when: 結末の始まり
    meaning: この結末を見た
    confidence: 🟢
  - flag: 段階
    value: "= 999"
    when: 結末の始まり
    meaning: 結末
    confidence: 🟢

sources: [A]
---

# 希望の光（The Light of Hope）

## 流れ

1. [黒船の決闘](best__after_tournament__black_ship_battle.md)が終わると、続けてこの結末になる。`0x3702`（通し番号 90）= 4、段階 = 999 になる
2. 語り：動乱を戦った者たちが矛を納め、互いの理解と信頼によって内乱の危機が去る。ローラは将軍に謁見し、琴吹・茂呂をはじめとする仲間の無実を認めさせる
3. 幕府は庶民のために働いて国中に平和をもたらし、外国は日本の貿易と産業の発展を促し、攘夷の若者は草の根に生きる道を選ぶ
4. 「阿弥浜の海に今日も朝日が昇る……」。無名の浪人が「希望の光」となって後の世を照らし続ける、と結ばれる
5. スタッフロール。ほかの結末と違う版（ベストエンディング用）が流れる

## 選択肢

選択肢はない（🟢）。

| 場面 | 選択肢 | 結果 |
|---|---|---|
| — | — | — |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| イベントの状態 `0x3702` | = 4 | 結末の始まり | 🟢 |
| 段階 | = 999 | 結末の始まり | 🟢 |
| 時間帯 | = 0 | 結末の始まり | 🔶 |

## この結末に進むための条件

真ルート（`0x378E`（通し番号 230）= 1）のまま、次の順にイベントを成功させる（🟢）。
`0x378E` が 2 になると、以後は[大老暗殺計画](best__2_day__plot_to_assassinate_the_chief_minister.md)だけが起き、[大老は生きていた](best__ending__the_chief_minister_lived.md)に進む。

| 順 | イベント | 条件 |
|---|---|---|
| 1 | [刺激が欲しい](best__3_day__in_need_of_encouragement.md)（3日目夕） | 成功 |
| 2 | [伯爵救出](best__3_day__rescuing_the_count.md)（3日目夜） | 刺激が欲しいの成功 |
| 3 | [人間湯通しの恐怖](best__4_day__a_day_at_the_spa.md) → [（名前不明）](best__4_day__event_84.md) → [ローラの決意](best__4_day__lauras_determination.md) → [士魂は屈せず](best__4_day__the_fighting_spirit_never_dies.md) → [ローラ奪還](best__4_day__rescuing_laura.md) → [鬼怒川を追え](best__after_tournament__in_pursuit_of_kinugawa.md) → [黒船の決闘](best__after_tournament__black_ship_battle.md) | 順に続けて起きる |

`0x378E` を 2 にする場面は[大老暗殺計画](best__2_day__plot_to_assassinate_the_chief_minister.md)の「真ルートの失敗」にまとめた。

## 前後のイベント

- 前：[黒船の決闘](best__after_tournament__black_ship_battle.md)
- 真ルートのもう1つの結末：[大老は生きていた](best__ending__the_chief_minister_lived.md)

## 未確認のこと

- 🔶 スタッフロールで、ほかの結末（熱き魂・攘夷の炎・破滅への道・変わり往く心・海外雄飛・侍一直線）のうち、状態が 4 のものに応じて絵が変わる
- [A] の「前の周回までに語学所開設・病院開設・カジノ閉鎖にしておく」は、`0x378E` を 2 にしないための条件に当たる（🟢）。施設の開閉は周回をまたいで引き継がれ（[facilities](../save_format/chunks/facilities/README.md)）、どれか1つでも欠けると途中で `0x378E` = 2 になる
  - 病院 `0x375D` が閉じている：[再起の望み](best__1_day__praying_for_recovery.md)で「英国の病院に連れて行こう」が出ず、赤城が死ぬ → [怒りの矛先](best__2_day__the_sting_of_hatred.md)の成功で 2
  - 語学所 `0x375F` が閉じている：[闇討ち](best__2_day__strike_in_the_dark.md)で「赤城のようになりたくないのか？」が出ず、成功できない → 失敗で 2
  - カジノ `0x375E` が開いている：[伯爵に刺激を](best__2_day__down_for_the_count.md)ではなく[運命のルーレット](best__2_day__dice_of_destiny.md)が起き、J.J が死ぬ。[刺激が欲しい](best__3_day__in_need_of_encouragement.md)の条件（J.J `0x3758` = 4）がそろわず、[傷心の帰国船](best__3_day__the_sad_boat_home.md)の成功で 2
