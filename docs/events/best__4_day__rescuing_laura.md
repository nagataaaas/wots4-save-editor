---
event_id: 87
state_offset: "0x36FF"

title:
  ja: ローラ奪還
  en: Rescuing Laura

faction:
  name: 真ルート
  route: >-
    [士魂は屈せず](best__4_day__the_fighting_spirit_never_dies.md)のあと、代官所内から出ようとすると起きる。
    成功するとそのまま[鬼怒川を追え](best__after_tournament__in_pursuit_of_kinugawa.md)へ続く。

summary: >-
  大通りの処刑台でローラの釜茹でを止める。魔鱗組、鬼怒川、魔鱗親衛隊と3回戦う。途中で赤城が駆けつけてローラを逃がし、
  最後は J.J・メリンダも加わる。鬼怒川は倒しても起き上がり、港へ逃げる。

summary_en: >-
  Stop Laura from being boiled alive on the execution stage at the Main Plaza. You fight three times: the Demonscales, Kinugawa, and the Demonscale Elite.
  Midway, Akagi rushes in and helps Laura escape, and at the end J.J. and Melinda join too. Kinugawa gets back up even after being defeated and flees to the Harbor.

timing:
  phase: 4日目以降（420）
  slot: 夜
  note: "途中で段階が 500（剣術大会以降）、時間帯が昼になる"

location: 代官所内（出口）→ 大通り（処刑台）

conditions:
  - flag: "0x36FE"
    serial: 86
    test: "== 4"
    meaning: 士魂は屈せずが成功し、代官所内から出ようとした（単独の発生条件はない）
    confidence: 🔶
  - flag: 段階
    test: "== 420"
    meaning: 真ルートの4日目以降（420）
    confidence: 🟢
  - flag: 時間帯
    test: "== 2"
    meaning: 夜
    confidence: 🟢
  - flag: 現在の地域
    test: "== 41"
    meaning: 大通り（処刑台のある状態）
    confidence: 🔶

failure_conditions:
  - flag: "0x378E"
    serial: 230
    test: "== 2"
    meaning: 真ルートを外れた（3日目夕までの場面で 2 になる。人間湯通しの恐怖から先が起きない）
    confidence: 🟢
  - flag: "0x3758"
    serial: 176
    test: "== 1"
    meaning: J.J が死んだ（運命のルーレットの成功、伯爵に刺激をで J.J を倒した。伯爵救出から先が起きない）
    confidence: 🟢

flag_changes:
  - flag: "0x36FF"
    serial: 87
    value: "= 3"
    when: 処刑台の場面が始まったとき
    meaning: 進行中
    confidence: 🟢
  - flag: "0x3786"
    serial: 222
    value: "= 0"
    when: 1回目と3回目の戦闘の前
    meaning: 幕府との敵対状態を解く
    confidence: 🟢
  - flag: "0x3787"
    serial: 223
    value: "= 0"
    when: 1回目と3回目の戦闘の前
    meaning: 外国との敵対状態を解く
    confidence: 🟢
  - flag: "0x3788"
    serial: 224
    value: "= 0"
    when: 1回目と3回目の戦闘の前
    meaning: 攘夷との敵対状態を解く
    confidence: 🟢
  - flag: "0x374E"
    serial: 166
    value: "= 0"
    when: 赤城が駆けつける場面
    meaning: 赤城の状態を生存に戻す（病院から復帰）
    confidence: 🟢
  - flag: "0x3758"
    serial: 176
    value: "= 0"
    when: 赤城が駆けつける場面
    meaning: J.J の状態を 0 に戻す（療養から復帰）
    confidence: 🟢
  - flag: 段階
    value: "= 500"
    when: 赤城が駆けつける場面
    meaning: 剣術大会以降に進む
    confidence: 🟢
  - flag: 時間帯
    value: "= 0"
    when: 赤城が駆けつける場面
    meaning: 昼
    confidence: 🔶
  - flag: "0x36FF"
    serial: 87
    value: "= 4"
    when: 魔鱗親衛隊との戦闘のあと
    meaning: イベント成功
    confidence: 🟢

sources: [A]
---

# ローラ奪還（Rescuing Laura）

## 流れ

1. [士魂は屈せず](best__4_day__the_fighting_spirit_never_dies.md)のあと、茂呂・小暮と代官所内の出口へ向かうと、大通りの処刑台の場面に移る（`0x3760` = 1 のときは続けて移る）
2. 捕らえられかけた琴吹のところへ主人公たちが駆けつけ、`0x36FF`（通し番号 87）= 3 になる。琴吹・茂呂・小暮と一緒に魔鱗組と戦う（1回目）
3. 鬼怒川がローラの命を盾に脅すが、赤城が「待たせたな」と駆けつけ、その隙にローラが逃げる。ここで赤城と J.J の状態が 0 に戻り、段階が 500、時間帯が昼になる
4. 鬼怒川と1対1で戦う（2回目）。鬼怒川に追い詰められて「落ちなさい」と迫られる場面で選択肢が出る（台詞だけ変わる）
5. 鬼怒川を倒すと「為政者は時として鬼になる」と言い残して倒れるが、「一度や二度殺したくらいでは死なない」と起き上がり、魔鱗親衛隊を呼ぶ
6. 琴吹・茂呂・小暮・J.J・赤城、メリンダ（生きていれば）と一緒に魔鱗親衛隊と戦う（3回目）。親衛隊を倒すと仲間が「ここは引き受けた」「早く鬼怒川を追うんだ」と言い、成功（`0x36FF` = 4）
7. そのまま[鬼怒川を追え](best__after_tournament__in_pursuit_of_kinugawa.md)へ移る

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| 鬼怒川に「落ちなさい」と迫られる | 「侍の魂を無くしたか！」 | 台詞だけ変わる |
| 鬼怒川に「落ちなさい」と迫られる | 「やめろ！卑怯者！」 | 台詞だけ変わる |
| 鬼怒川に「落ちなさい」と迫られる | 「ごめんなさい！許して！！」 | 台詞だけ変わる |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| イベントの状態 `0x36FF` | = 3 | 処刑台の場面の始まり | 🟢 |
| イベントの状態 `0x36FF` | = 4 | 魔鱗親衛隊を倒したあと | 🟢 |
| 勢力の敵対状態 | 幕府・外国・攘夷 = 0（`0x3786`〜`0x3788`（通し番号 222〜224）） | 1回目・3回目の戦闘の前 | 🟢 |
| 人物 | 赤城（`0x374E`（通し番号 166））= 0、J.J（`0x3758`（通し番号 176））= 0 | 赤城が駆けつける場面 | 🟢 |
| 段階 | = 500 | 赤城が駆けつける場面 | 🟢 |
| 時間帯 | = 0（昼） | 赤城が駆けつける場面 | 🔶 |
| 所持金・勢力の友好度 | 変わらない | — | 🟢 |

味方のうち琴吹・茂呂・小暮・J.J・赤城は体力に下限があり、戦闘で死なないとみられる（🔶）。メリンダは `0x3759`（通し番号 177）が 0 のときだけ加わる（🟢）。

## 前後のイベント

- 前：[士魂は屈せず](best__4_day__the_fighting_spirit_never_dies.md)
- 次：[鬼怒川を追え](best__after_tournament__in_pursuit_of_kinugawa.md)（続けて起きる）

## 未確認のこと

- 🔶 発生する地域の番号（41）は、処刑台のある大通りとみなした（人間湯通しの恐怖と同じ番号）
- [A] は鬼怒川を追えに「鬼怒川・魔鱗組、処刑台で鬼怒川、魔鱗親衛隊」との戦闘を含めているが、この3回の戦闘はローラ奪還の中（`0x36FF` = 3 の間）で起き、親衛隊を倒すとローラ奪還が成功になる
- ❓ 鬼怒川に「落ちなさい」と迫られる場面で、実際に落ちたとき（時間切れなど）にどうなるか
- ❓ 選択肢を選ぶと、位置の分からない値が 5 または 6 になる。意味は分からない
