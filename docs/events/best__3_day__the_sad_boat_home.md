---
event_id: 80
state_offset: "0x36F8"

title:
  ja: 傷心の帰国船
  en: The Sad Boat Home

faction:
  name: 真ルート
  route: >-
    真ルートの3日目夕で、J.J が死んでいるか寿司屋の店主が死んでいるときの分岐（どちらも生きていて J.J と友なら[刺激が欲しい](best__3_day__in_need_of_encouragement.md)）。
    伯爵の死の責任を問われたローラが本国へ帰る。成功で真ルートの希望の光への道が閉じ、[大老暗殺計画](best__2_day__plot_to_assassinate_the_chief_minister.md)へ進む。

summary: >-
  港でローラが帰国の船に乗る場面に立ち会う。J.J が死んでいてメリンダが生きていれば、メリンダが「おまえのせいで公使様は失脚された」と海兵隊と襲ってくる。
  寿司屋の店主が死んでいるとき、メリンダが死んでいるときは戦闘なしで終わる。以後、居留地の門が閉じる。

timing:
  phase: 3日目 夕
  slot: なし
  note: ""

location: 港（ローラ。[A] では港のカジノ付近）

conditions:
  - flag: "0x36F8"
    serial: 80
    test: "<= 2"
    meaning: まだ進行中でない
    confidence: 🟢
  - flag: "0x378E"
    serial: 230
    test: "== 1"
    meaning: 真ルート
    confidence: 🟢
  - flag: "0x3758"
    serial: 176
    test: "== 1"
    meaning: J.J が死んでいる（次の行とどちらか一方を満たせばよい）
    confidence: 🟢
  - flag: "0x37F9"
    serial: 337
    test: "== 1"
    meaning: 寿司屋の店主が死んでいる（前の行とどちらか一方を満たせばよい）
    confidence: 🟢
  - flag: 段階
    test: "== 310"
    meaning: 3日目夕
    confidence: 🟢
  - flag: 現在の地域
    test: "== 1"
    meaning: 港にいる（ローラに近づく）
    confidence: 🟢

failure_conditions:
  - flag: "0x378E"
    serial: 230
    test: "== 2"
    meaning: 真ルートを外れた（再起の望みで小暮を倒した、怒りの矛先の成功、小暮が死んでいるときに J.J を倒した、闇討ちの失敗）
    confidence: 🟢

flag_changes:
  - flag: "0x36F8"
    serial: 80
    value: "= 3"
    when: 寿司屋の店主が生きていてメリンダが生きているとき、見送りの場面のあと
    meaning: 進行中（メリンダとの戦闘へ）
    confidence: 🟢
  - flag: "0x36F8"
    serial: 80
    value: "= 4"
    when: メリンダとの戦闘に勝ったとき。戦闘がない場合は見送りの場面のあと
    meaning: イベント成功
    confidence: 🟢
  - flag: "0x378E"
    serial: 230
    value: "= 2"
    when: 成功したとき
    meaning: 真ルートの希望の光への道が閉じ、大老暗殺計画へ進む
    confidence: 🟢
  - flag: "0x3764"
    serial: 188
    value: "= 1"
    when: 見送りの場面のあと（戦闘の有無によらない）
    meaning: 居留地の門（大寄せ以降）を閉じる
    confidence: 🟢
  - flag: "0x3790"
    serial: 232
    value: "= 1"
    when: 見送りの場面のあと
    meaning: 外国の退場（外国勢が町から出なくなる）
    confidence: 🟢
  - flag: "0x37A4"
    serial: 252
    value: "= 2"
    when: 見送りの場面のあと
    meaning: ❓
    confidence: 🟢
  - flag: "0x3759"
    serial: 177
    value: "= 1"
    when: メリンダとの戦闘でメリンダを倒したとき
    meaning: メリンダ死亡
    confidence: 🟢
  - flag: 時間帯を進める保留量
    value: "+ 10"
    when: 成功したとき
    meaning: 時間帯を進める
    confidence: 🟢

sources: ["[A]"]
---

# 傷心の帰国船（The Sad Boat Home）

## 流れ

1. 3日目夕に港でローラに近づくと、帰国するローラの見送りの場面になる。ローラは「お世話になった日本の皆様に何のご恩返しも出来なかった」と言い残して船へ向かう
2. 分かれ方：

| 寿司屋の店主 | メリンダ `0x3759` | 結果 |
|---|---|---|
| 生きている（J.J が死んでいる） | 0（生きている） | メリンダが「おまえのせいで公使様は失脚された」「伯爵が殺された事件の責任を問われ本国へ召還された」と襲ってくる（`0x36F8`（通し番号 80）= 3）。メリンダと海兵隊（[A] ではパツキン隊）と戦闘。全員倒すと成功 |
| 生きている（J.J が死んでいる） | 1（死んでいる） | 戦闘なしで成功 |
| 死んでいる | — | 戦闘なしで成功 |

3. 成功（`0x36F8` = 4）。真ルート `0x378E`（通し番号 230）が 2 になり、居留地の門 `0x3764`（通し番号 188）が閉じる

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| — | なし | 会話と戦闘のみ |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| 真ルート `0x378E`（通し番号 230） | 2（[大老暗殺計画](best__2_day__plot_to_assassinate_the_chief_minister.md)へ） | 成功 | 🟢 |
| 居留地の門（大寄せ以降）`0x3764`（通し番号 188） | 1（閉じる）。[A] の「以後、領事館内と黒船に入れない」に当たる | 見送りのあと | 🟢 |
| `0x3790`（通し番号 232） | 1（外国の退場。外国勢が町から出なくなる。[best-route](../save_format/chunks/best-route/README.md)「勢力の退場」） | 見送りのあと | 🟢 |
| `0x37A4`（通し番号 252） | 2（意味は ❓。外国ルートでローラが死ぬ場面でも 2 になる） | 見送りのあと | 🟢 |
| メリンダ `0x3759`（通し番号 177） | 1（死亡） | 戦闘でメリンダを倒したとき | 🟢 |
| 時間帯を進める保留量 | +10 | 成功 | 🟢 |

- ローラの状態 `0x3757`（通し番号 175）はこのイベントでは変わらない
- 寿司屋の状態 `0x37F9` は寿司屋の店主を殺すと 1 になる（[scenario-flags](../save_format/chunks/scenario-flags/README.md)）。[A] の「寿司屋の店員を学問のすすめ前に殺しても発生（戦闘なし）」はこの条件に当たる

## 前後のイベント

- 前：[学問のすすめ](best__3_day__pursuit_of_knowledge.md)（[運命のルーレット](best__2_day__dice_of_destiny.md)・[伯爵に刺激を](best__2_day__down_for_the_count.md)で J.J が死んだとき、または寿司屋の店主が死んでいるとき）
- 次：[大老暗殺計画](best__2_day__plot_to_assassinate_the_chief_minister.md)

## 未確認のこと

- ❓ 寿司屋の店主を殺す時期の条件。開始条件には時期の制限がなく、3日目夕の時点で店主が死んでいれば起きる。[A] の「学問のすすめ前に」は、3日目夕より前という意味とみられる（🔶）
- ❓ メリンダとの戦闘から逃げた・負けたときの扱い
- ❓ `0x37A4` の意味
