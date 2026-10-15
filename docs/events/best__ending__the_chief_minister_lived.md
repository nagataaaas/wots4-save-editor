---
event_id: 99
state_offset: "0x370B"

title:
  ja: 大老は生きていた
  en: The Chief Minister Lived

faction:
  name: 真ルート
  route: >-
    真ルートに失敗したときの結末。[大老暗殺計画](best__2_day__plot_to_assassinate_the_chief_minister.md)の成功から続けて起きる。
    真ルートを最後まで進めたときの結末は[希望の光](best__ending__the_light_of_hope.md)。

summary: >-
  暗殺の翌日、死んだはずの鬼怒川が現れ、陰謀は失敗に終わったと告げる。暗殺した鬼怒川は影武者だった。
  「正義が必ず勝つとは限らない」という語りで終わる。

summary_en: >-
  The day after the assassination, Kinugawa, who should be dead, appears and announces that the plot has failed. The Kinugawa who was assassinated was a body double.
  It ends with narration saying "Justice does not always prevail."

timing:
  phase: 結末
  slot: なし
  note: "大老暗殺計画から続けて起きる"

location: 代官所内 → 阿弥浜（翌日）

conditions:
  - flag: "0x36FB"
    serial: 83
    test: "== 4"
    meaning: 大老暗殺計画で鬼怒川を倒した直後に続けて起きる（単独の発生条件はない）
    confidence: 🔶

failure_conditions:
  - flag: 段階
    test: ">= 410"
    meaning: 真ルートを外れないまま人間湯通しの恐怖を終えた（大老暗殺計画が起きなくなる）
    confidence: 🟢

flag_changes:
  - flag: 時間帯
    value: "= 1"
    when: 結末の始まり
    meaning: 夕
    confidence: 🔶
  - flag: 段階
    value: "= 999"
    when: 結末の始まり
    meaning: 結末
    confidence: 🟢
  - flag: "0x370B"
    serial: 99
    value: "= 4"
    when: 結末の始まり
    meaning: この結末を見た
    confidence: 🟢

sources: [A]
---

# 大老は生きていた（The Chief Minister Lived）

## 流れ

1. [大老暗殺計画](best__2_day__plot_to_assassinate_the_chief_minister.md)で鬼怒川を倒すと、続けてこの結末になる。段階 = 999、`0x370B`（通し番号 99）= 4 になる
2. 暗殺に加わった仲間（琴吹と、小暮・茂呂・J.J・メリンダのうち状態が 0 で、戦闘で倒れなかった者）が場面に残る
3. 「次の日」。鬼怒川が現れ、「諸君らの浅はかな陰謀は 失敗に終わりました」「私の方が 一枚上手だった」と告げる
4. 語り：暗殺した鬼怒川は影武者だった。正義は往々にして少数派であり、より多くの力を結集しなければ真の勝利は得られないのかもしれない、と結ばれる
5. スタッフロール（通常の版）

## 選択肢

選択肢はない（🟢）。

| 場面 | 選択肢 | 結果 |
|---|---|---|
| — | — | — |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| イベントの状態 `0x370B` | = 4 | 結末の始まり | 🟢 |
| 段階 | = 999 | 結末の始まり | 🟢 |
| 時間帯 | = 1 | 結末の始まり | 🔶 |

## 前後のイベント

- 前：[大老暗殺計画](best__2_day__plot_to_assassinate_the_chief_minister.md)
- 真ルートのもう1つの結末：[希望の光](best__ending__the_light_of_hope.md)

## 未確認のこと

- 🔶 スタッフロールで、ほかの結末（熱き魂・攘夷の炎・破滅への道・変わり往く心・海外雄飛・侍一直線）のうち、状態が 4 のものに応じて絵が変わる
- [A] は「【大老暗殺計画】で偽鬼怒川を倒す」と書く。戦闘中の鬼怒川が影武者だったことは結末の語りで明かされる
