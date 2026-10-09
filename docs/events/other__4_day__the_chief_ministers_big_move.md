---
event_id: 41
state_offset: "0x36D1"

title:
  ja: 大老の大寄せ
  en: The Chief Minister's Big Move

faction:
  name: 共通・無所属
  route: >-
    4日目以降の最初のイベントで、ここで勢力ルートが決まる。友好度が足りた勢力のルート分岐が 01 になり、
    足りない勢力の門が閉じる。どの勢力にも入れないと根無し草へ進む。

summary: >-
  4日目以降の昼に、どこにいても始まる。瓦版売りが剣術大会の番付を売り歩く場面が流れ、その裏で3勢力それぞれの
  「友好度 + − 友好度 −」が 3 以上かを判定して、ルート分岐と大寄せ以降の門を決める。

timing:
  phase: 4日目以降（剣術大会前）
  slot: 昼
  note: "地域を問わず、4日目以降の昼に地図へ入ったときに始まる"

location: どこでも（4日目以降の昼にいる場所）

conditions:
  - flag: "0x36C4"
    serial: 28
    test: ">= 3"
    meaning: 大老 鬼怒川怨仙を終えた（成功・失敗を問わない）
    confidence: 🟢
  - flag: "0x36D1"
    serial: 41
    test: "<= 0"
    meaning: このイベントをまだ見ていない
    confidence: 🟢
  - flag: "0x378D"
    serial: 229
    test: "== 1"
    meaning: 通常の周回
    confidence: 🟢
  - flag: 段階
    test: "== 400"
    meaning: 4日目以降（剣術大会前）
    confidence: 🟢
  - flag: 時間帯
    test: "== 0"
    meaning: 昼
    confidence: 🔶

failure_conditions: []

flag_changes:
  - flag: "0x36D1"
    serial: 41
    value: "= 4"
    when: 場面の終わり
    meaning: イベント成功
    confidence: 🟢
  - flag: "0x3789"
    serial: 225
    value: "= 1 / 2"
    when: 判定
    meaning: 幕府ルート。幕府の友好度（0x3780 − 0x3783）が 3 以上で、茂呂（0x3752）が 1（死亡）でなければ 1、それ以外は 2
    confidence: 🟢
  - flag: "0x378A"
    serial: 226
    value: "= 1 / 2"
    when: 判定
    meaning: 外国ルート。外国の友好度（0x3781 − 0x3784）が 3 以上なら 1、それ以外は 2
    confidence: 🟢
  - flag: "0x378B"
    serial: 227
    value: "= 1 / 2"
    when: 判定
    meaning: 攘夷ルート。攘夷の友好度（0x3782 − 0x3785）が 3 以上なら 1、それ以外は 2
    confidence: 🟢
  - flag: "0x378C"
    serial: 228
    value: "= 1"
    when: 判定で3勢力すべてが 2 のとき
    meaning: 無所属（根無し草）
    confidence: 🟢
  - flag: "0x37FA"
    serial: 338
    value: "= 1"
    when: 幕府ルートが 2 のとき
    meaning: 代官所の表門を閉じる
    confidence: 🟢
  - flag: "0x37FB"
    serial: 339
    value: "= 1"
    when: 幕府ルートが 2 のとき
    meaning: 代官所の裏門を閉じる
    confidence: 🟢
  - flag: "0x3764"
    serial: 188
    value: "= 1"
    when: 外国ルートが 2 のとき
    meaning: 居留地の門（大寄せ以降）を閉じる
    confidence: 🟢
  - flag: "0x37C6"
    serial: 286
    value: "= 1"
    when: 外国ルートが 2 のとき
    meaning: 不明（外国ルートに入れないときの印）。小公女倒れるの一部でも 1
    confidence: 🟢値 ／ ❓意味
  - flag: "0x37C3"
    serial: 283
    value: "= 1"
    when: 攘夷ルートが 2 のとき
    meaning: 神社の門（入口の柵）を閉じる
    confidence: 🟢
  - flag: "0x3761"
    serial: 185
    value: "= 1"
    when: 攘夷ルートが 2 のとき
    meaning: 不明（攘夷ルートに入れないときの印）。剣術大会以降の幕府・攘夷のイベントでも 0x37C3 と一緒に 1
    confidence: 🟢値 ／ ❓意味
  - flag: "0x37A2"
    serial: 250
    value: "= 2"
    when: 攘夷ルートが 2 のとき
    meaning: 不明。真ルートのイベントでも 2 になる
    confidence: 🟢値 ／ ❓意味
  - flag: "0x37A1"
    serial: 249
    value: "= 0"
    when: 場面の終わり
    meaning: 不明。小公女倒れるの場面の分かれ方に使うフラグ
    confidence: 🟢値 ／ ❓意味
  - flag: 所持品
    value: "アイテム 205 を 1 つ減らす"
    when: 場面の終わり
    meaning: 何のアイテムかは不明
    confidence: 🟢値 ／ ❓意味

sources: [A, F, U]
---

# 大老の大寄せ（The Chief Minister's Big Move）

## 流れ

1. 4日目以降（段階 400）の昼、[大老 鬼怒川怨仙](other__3_day__chief_minister_onsen_kinugawa.md) を終えていれば、どこにいても地図に入ったときに始まる
2. 判定（下の表）。勢力ごとに「友好度 +（`0x3780`〜`0x3782`）− 友好度 −（`0x3783`〜`0x3785`）」を求め、3 以上なら 1、そうでなければ 2 をルート分岐に入れる。
   2 の勢力は大寄せ以降の門を閉じる。3勢力とも 2 なら無所属（`0x378C` = 1）
3. 瓦版売りが「剣術大会 いよいよ始まるよ」と番付を売り歩く場面が流れる
4. 場面の終わりに `0x36D1` = 4。いる場所によって次のように動く（🔶）
   - 大通り：剣術大会の会場の地図に入れ替わり、剣術大会開催の準備（受付）が整う
   - 居留地：外国ルートが 2 なら、居留地の門を閉じて地図を入り直す
   - 代官所の門の外：幕府ルートが 2 なら、その地図から出される
   - 神社：攘夷ルートが 1 なら、その地図から出される（ほかの勢力と条件の向きが逆。🔶）

### 判定

| 勢力 | 条件（すべて満たすと 1） | 1 のとき | 2 のとき |
|---|---|---|---|
| 幕府 `0x3789` | `0x3780` − `0x3783` ≥ 3 かつ 茂呂 `0x3752` ≠ 1 | — | 代官所の表門 `0x37FA` = 1、裏門 `0x37FB` = 1 |
| 外国 `0x378A` | `0x3781` − `0x3784` ≥ 3 | — | 居留地の門 `0x3764` = 1、`0x37C6` = 1 |
| 攘夷 `0x378B` | `0x3782` − `0x3785` ≥ 3 | — | 神社の門 `0x37C3` = 1、`0x3761` = 1、`0x37A2` = 2 |
| 無所属 `0x378C` | 上の3つがすべて 2 | 1 | — |

- 敵対状態（`0x3786`〜`0x3788`）は判定に使わない（🟢。[factions](../save_format/chunks/factions/README.md) の ✅ と一致）
- 茂呂が 3日目夜までに死んでいる（`0x3752` = 1）と、友好度が足りても幕府ルートは 2 になる（🟢。[A] の「茂呂が3日目夜に死ぬと幕府ルートに入れない」と一致）

## 選択肢

なし。

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| `0x36D1`（通し番号 41） | 4 | 場面の終わり | 🟢 |
| ルート分岐 `0x3789`〜`0x378C` | 判定の表のとおり | 判定 | 🟢 |
| 大寄せ以降の門 `0x37FA`・`0x37FB`・`0x3764`・`0x37C3` | 1（閉じる） | ルートが 2 の勢力 | 🟢 |
| `0x37C6`・`0x3761`・`0x37A2` | 1・1・2 | 外国・攘夷ルートが 2 のとき | 🟢（意味は ❓） |
| `0x37A1`（通し番号 249） | 0 | 場面の終わり | 🟢（意味は ❓） |
| 所持品 | アイテム 205 を1つ減らす | 場面の終わり | 🟢（何のアイテムかは ❓） |

## 前後のイベント

- 前：[大老 鬼怒川怨仙](other__3_day__chief_minister_onsen_kinugawa.md)（3日目を終えて段階 400）
- 次：ルート分岐が 1 の勢力の4日目のイベント（[公儀の剣](shogunate__4_day__imperial_sword.md)・[東国の騎士](foreigners__4_day__the_eastern_knight.md)・[志士の刀](prajna__4_day__blades_of_the_patriots.md)）／
  3勢力とも 2 なら [根無し草](other__4_day__idle_chatter.md)。どちらのあとも [剣術大会開催](other__4_day__battle_tournament_opens.md)

## 未確認のこと

- [F] は「その勢力のイベントに2つ以上参加し、敵対イベントに参加していない」、[U]（2026-10-05）は「幕府のイベント3回以上で公儀の剣」としている。判定は友好度の差 ≥ 3 で、[U] と合う
- 🔶 場面の終わりの地域ごとの動き（特に神社で「攘夷ルートが 1 なら地図から出す」の向き）
- ❓ `0x3761`・`0x37C6`・`0x37A1` の意味（`0x37A2` は般若党の本拠。[best-route](../save_format/chunks/best-route/README.md)）（[scenario-flags](../save_format/chunks/scenario-flags/README.md) の「大寄せで 0 → 1／0 → 2」の観察は、根無し草のセーブで攘夷・外国が 2 になった結果と合う）
- ❓ 減らすアイテム 205 が何か。持っていないときにどうなるか
- 段階が 400 より先へ進むと起こせないが、剣術大会開催がこのイベントを条件にするので、通常の周回でこのイベントを見ずに段階が進むことはない
