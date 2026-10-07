---
event_id: 3
state_offset: "0x36AB"

title:
  ja: 嵐のあと
  en: After the Storm

faction:
  name: 共通・無所属
  route: >-
    阿弥浜港争乱を成功させなかったときに、1日目 昼の港で起きる。このあと1日目 昼に起こせる勢力のイベントは志士との出会いだけになる。

summary: >-
  港の騒ぎが収まったあとの場面を見るだけのイベント。赤城が退き、琴吹が追い、ローラ・茂呂・J.J. が港に残る。戦闘・選択肢はない。

timing:
  phase: 1日目 昼
  slot: 昼
  note: "2周目以降に人だかりを避けた場合と、阿弥浜港争乱に失敗した場合に起きる"

location: 港

conditions:
  - flag: "0x36A8"
    serial: 0
    test: "== 4"
    meaning: 船上の侍を終えた
    confidence: 🟢
  - flag: "0x36A9"
    serial: 1
    test: "!= 4"
    meaning: 阿弥浜港争乱を成功させていない（未到達・失敗）
    confidence: 🟢
  - flag: "0x36AB"
    serial: 3
    test: "<= 0"
    meaning: このイベントをまだ見ていない
    confidence: 🟢
  - flag: 段階
    test: "== 100"
    meaning: 1日目 昼
    confidence: 🟢
  - flag: 時間帯
    test: "== 0"
    meaning: 昼
    confidence: 🔶
  - flag: 現在の地域
    test: "== 港"
    meaning: 港に入る
    confidence: 🟢

failure_conditions:
  - flag: "0x36A9"
    serial: 1
    test: "== 4"
    meaning: 阿弥浜港争乱を成功させた（結末 A〜D・大砲の結末。開始条件「`0x36A9` != 4」が満たされなくなる）
    confidence: 🟢

flag_changes:
  - flag: "0x36AB"
    serial: 3
    value: "= 4"
    when: 場面の終わり
    meaning: イベント成功
    confidence: 🟢
  - flag: "0x378D"
    serial: 229
    value: "= 1"
    when: 場面の終わり
    meaning: 通常の周回
    confidence: 🟢
  - flag: "0x376B"
    serial: 195
    value: "= 1"
    when: 場面の終わり
    meaning: 不明。序章を抜けた印か（阿弥浜港争乱の結末でも 1）
    confidence: 🟢値 ／ ❓意味
  - flag: 段階
    value: "= 100"
    when: 場面の終わり
    meaning: 1日目 昼
    confidence: 🟢
  - flag: 時間帯
    value: "= 0"
    when: 場面の終わり
    meaning: 昼
    confidence: 🔶

sources: [A]
---

# 嵐のあと（After the Storm）

## 流れ

1. 次のどちらかの状態で、昼に港へ入ると始まる
   - 2周目以降、[船上の侍](other__prologue__samurai_on_board.md) のあと港の人だかりに近づかずに別の地図へ移り、港に戻る（段階は船上の侍で 100 になっている）
   - [阿弥浜港争乱](other__prologue__amihama_harbor_skirmish.md) に失敗した（`0x36A9` = 5。[簀巻き日和](other__prologue__all_wrapped_up.md) や拷問のあと）
2. 騒ぎが収まった港の場面が流れる。赤城が手下を退かせ、琴吹が追いかけ、ローラ・茂呂・J.J. が騒ぎの終わりを見届ける
3. 場面が終わると `0x36AB` = 4

## 選択肢

なし。

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| `0x36AB`（通し番号 3） | 4 | 場面の終わり | 🟢 |
| `0x378D`（通し番号 229） | 1 | 場面の終わり | 🟢 |
| `0x376B`（通し番号 195） | 1 | 場面の終わり | 🟢（意味は ❓） |
| 段階・時間帯 | 100・昼 | 場面の終わり | 🟢 |

## 前後のイベント

- 前：[船上の侍](other__prologue__samurai_on_board.md)（2周目以降で人だかりを避けた）／[簀巻き日和](other__prologue__all_wrapped_up.md)・阿弥浜港争乱の拷問（失敗のあと）
- 次：[志士との出会い](prajna__1_day__encounter_with_the_patriots.md)。発生条件が「`0x36A9` = 4 または `0x36AB` = 4」なので、このイベントのあとでも起きる（🟢）。
  [代官所の面々](shogunate__1_day__the_magistrates_offices.md)・[小公女謁見](foreigners__1_day__audience_with_the_littlest_public_servant.md) は `0x36A9` = 4 が要るので起きない

## 未確認のこと

- [scenario-flags](../save_format/chunks/scenario-flags/README.md) の観察では、`0x376B` は志士との出会いの開始で 1 → 0 になる。志士との出会いの場面の中では 0 にしないので、どこで 0 に戻るかは ❓
- ❓ 1周目に阿弥浜港争乱で失敗したときも、同じ条件で起きるか（失敗の結末で段階が 100 になるので、起きるとみられる）
