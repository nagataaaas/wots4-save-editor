---
event_id: 32
state_offset: "0x36C8"

title:
  ja: 白昼の激突
  en: Clash At Midday

faction:
  name: 共通・無所属
  route: >-
    3日目 昼、血で血を洗う戦い（攘夷）か魔鱗組の力（幕府）を断ったときの受け皿。
    町での般若党と魔鱗組の衝突に出くわし、どちらに助太刀するかで、その勢力の3日目昼のイベントの戦闘に合流する。

summary: >-
  町で赤城・小暮の般若党と、琴吹・三姉妹・魔鱗組がぶつかっている。赤城と琴吹の双方から声をかけられ、
  赤城に助太刀すると血で血を洗う戦い、琴吹に助太刀すると魔鱗組の力の戦闘になる。「ただの通りすがりだ」を選ぶと失敗。

summary_en: >-
  In Town, Akagi and Kogure's Prajnas are clashing with Kotobuki, the Three Sisters and the Demonscales. Both Akagi and Kotobuki call out to you: helping Akagi leads to the Washing Blood With Blood fight, and helping Kotobuki leads to The Might of the Demonscales fight.
  Choosing "I'm just passing through" fails the event.

timing:
  phase: 3日目 昼
  slot: 昼
  note: ""

location: 町

conditions:
  - flag: "0x36C4"
    serial: 28
    test: "> 0"
    meaning: 大老 鬼怒川怨仙を終えた（成功・失敗を問わない）
    confidence: 🟢
  - flag: "0x36C7, 0x36C5"
    test: "0x36C7 == 5 または 0x36C5 == 5"
    meaning: 血で血を洗う戦い（通し番号 31）か魔鱗組の力（通し番号 29）が失敗（断った）
    confidence: 🟢
  - flag: "0x378D"
    serial: 229
    test: "== 1"
    meaning: 通常の周回
    confidence: 🟢
  - flag: 段階
    test: "== 300"
    meaning: 3日目 昼
    confidence: 🟢
  - flag: 時間帯
    test: "== 0"
    meaning: 昼
    confidence: 🔶
  - flag: 現在の地域
    test: "== 町"
    meaning: 町に入る
    confidence: 🟢

failure_conditions: []

flag_changes:
  - flag: "0x36C7"
    serial: 31
    value: "= 3"
    when: 「赤城殿 助太刀いたす」
    meaning: 血で血を洗う戦いを進行中に戻す（その戦闘に合流する）
    confidence: 🟢
  - flag: "0x36C5"
    serial: 29
    value: "= 3"
    when: 「琴吹殿 助太刀いたす」
    meaning: 魔鱗組の力を進行中に戻す（その戦闘に合流する）
    confidence: 🟢
  - flag: "0x36C8"
    serial: 32
    value: "= 4"
    when: どちらかに助太刀したとき（戦闘の前）
    meaning: イベント成功
    confidence: 🟢
  - flag: "0x36C8"
    serial: 32
    value: "= 5"
    when: 「ただの通りすがりだ」、または無言
    meaning: イベント失敗
    confidence: 🟢
  - flag: 時間帯を進める保留量
    value: "+ 10"
    when: 同上（失敗）
    meaning: イベントを終えた扱いで時間帯を進める
    confidence: 🟢値 ／ 🔶位置

sources: [A]
---

# 白昼の激突（Clash At Midday）

## 流れ

1. 3日目 昼、[血で血を洗う戦い](prajna__3_day__washing_blood_with_blood.md) か [魔鱗組の力](shogunate__3_day__the_might_of_the_demonscales.md) のどちらかが失敗（断った）状態で町へ入ると始まる
2. 町では般若党（赤城・小暮）と、琴吹・三姉妹・魔鱗組が斬り合っている。主人公に気づいた琴吹が助太刀に来たのかと喜び、赤城は「俺たちの仲間だろ」と呼びかける
3. 選択肢（下の表）で分かれる
   - 赤城に助太刀：`0x36C7` = 3、`0x36C8` = 4。血で血を洗う戦いの戦闘（琴吹・三姉妹・魔鱗組が相手）になり、その結末はそのイベントで決まる
   - 琴吹に助太刀：`0x36C5` = 3、`0x36C8` = 4。魔鱗組の力の戦闘（赤城・小暮・般若党が相手）になり、その結末はそのイベントで決まる
   - 通りすがり：双方に追い払われて終わる。`0x36C8` = 5

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| 赤城と琴吹に呼びかけられる | 「赤城殿 助太刀いたす」 | 血で血を洗う戦いの戦闘へ（`0x36C7` = 3、`0x36C8` = 4） |
| 同上 | 「琴吹殿 助太刀いたす」 | 魔鱗組の力の戦闘へ（`0x36C5` = 3、`0x36C8` = 4） |
| 同上 | 「ただの通りすがりだ」、または無言 | 「目障りだ、帰ってくれ」と追い払われる（`0x36C8` = 5、時間帯を進める保留量 +10） |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| `0x36C8`（通し番号 32） | 4 | 助太刀する | 🟢 |
| `0x36C8` | 5 | 通りすがり | 🟢 |
| 血で血を洗う戦い `0x36C7` | 5 → 3 | 赤城に助太刀 | 🟢 |
| 魔鱗組の力 `0x36C5` | 5 → 3 | 琴吹に助太刀 | 🟢 |
| 時間帯を進める保留量 | +10 | 通りすがり | 🟢 |
| 勢力の友好度・敵対状態 | このイベントでは変わらない。合流した戦闘の結末で決まる | | 🟢 |

## 前後のイベント

- 前：[大老 鬼怒川怨仙](other__3_day__chief_minister_onsen_kinugawa.md)、[血で血を洗う戦い](prajna__3_day__washing_blood_with_blood.md)・[魔鱗組の力](shogunate__3_day__the_might_of_the_demonscales.md)（どちらかの失敗）
- 次：[血で血を洗う戦い](prajna__3_day__washing_blood_with_blood.md)（赤城に助太刀）／[魔鱗組の力](shogunate__3_day__the_might_of_the_demonscales.md)（琴吹に助太刀）

## 未確認のこと

- [A] は「「ただの通りすがりです」はチャートに残らない」としている。ゲーム内の選択肢の文言は「ただの通りすがりだ」で、選ぶと状態は 5（失敗）になる。チャートに失敗の枠が出ないのかは要ゲーム内確認
- 🔶 助太刀したあと、合流した戦闘で負けたり逃げたりしたとき、このイベントの状態（4）が変わるか
