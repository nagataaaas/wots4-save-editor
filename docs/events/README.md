# シナリオイベント

イベントチャート（スタートメニュー「状況」）に出るイベントを1つずつ、流れ・選択肢・発生条件・失敗条件・書き換えるフラグの形でまとめたもの。
セーブ上のイベントの状態は [event-chart](../save_format/chunks/event-chart/README.md)、フラグの領域は [scenario-flags](../save_format/chunks/scenario-flags/README.md)、
外部 Wiki の要約とチャートの全体図は [../event.md](../event.md) にある。

## ファイル

```text
events/
  README.md                                      ← このファイル（命名・書き方・索引）
  TEMPLATE.md                                    ← 1イベントのひな形
  {kind}__{phase_label_slug}__{title_en_slug}.md ← 1イベント1ファイル
```

### ファイル名

| 部分 | 値 |
|---|---|
| `kind` | `prajna` 攘夷（般若党）／`shogunate` 幕府／`foreigners` 外国／`other` 共通・無所属／`best` 真ルート |
| `phase_label_slug` | `prologue` 序章／`1_day`〜`3_day` 1〜3日目／`4_day` 4日目以降（剣術大会前）／`after_tournament` 剣術大会以降／`after_kinugawa` 鬼怒川の魔手以降／`ending` 結末。複数の段階に出るイベントは最初の段階 |
| `title_en_slug` | 英語名を小文字にし、アポストロフィを除いて、英数字以外の並びを `_` 1つにしたもの |

例：`prajna__1_day__encounter_with_the_patriots.md`（志士との出会い）

## 書き方

ひな形は [TEMPLATE.md](TEMPLATE.md)。フロントマターに条件とフラグを機械的に読める形で書き、本文に流れ・選択肢・変化する内容を書く。

- 確度記号は [../save_format/README.md](../save_format/README.md) §1.1 と同じ
- 外部資料の略号：[A]・[F] は [../event.md](../event.md) の出典、[U] はユーザー自身の確認
- 位置は `0x36AE`（通し番号 6）の形で書く。通し番号は [../save_format/README.md](../save_format/README.md) §3
- 値・場面・関わるイベントだけを書き、どう調べたかは書かない

### フラグの位置

| 通し番号 | 位置 | 内容 |
|---|---|---|
| 0〜165 | `0x36A8`〜`0x374D` | イベントの状態（通し番号＝イベント）。[event-chart](../save_format/chunks/event-chart/README.md) |
| 166〜399 | `0x374E`〜`0x3837` | シナリオのフラグ（人物・施設・門・勢力・ルートなど）。[scenario-flags](../save_format/chunks/scenario-flags/README.md) |

番号 N の値は `0x36A8 + N`（u8）にある（🟢）。

この領域の外にあって、イベントで増減するもの（位置は 🔶 または ❓）：

| 名前 | 位置 | 内容 |
|---|---|---|
| 所持金 | `0x0008` | 報酬で増える（✅ 位置） |
| 段階 | `0x0010` か 🔶 | 序章 0、1日目昼 100 … 結末 999（下の表） |
| 時間帯を進める保留量 | `0x0012` か 🔶 | イベントを終えると増える |
| 治安 | `0x0015` | イベントで代入・加算される（✅ 位置） |
| 時間帯 | ❓ | 0 昼・1 夕・2 夜 🔶 |

### イベントの状態の値

| 値 | 意味 | 確度 |
|---|---|---|
| `00` | 未到達 | 🔶 |
| `01` | 導入を見た | 🟢 |
| `02` | 導入を見て断った・保留した（もう一度話しかけると誘い直しの会話になる） | 🟢 |
| `03` | 引き受けた・進行中（会話・移動のあと、戦闘の前） | 🟢 |
| `04` | 成功・完了。大成功と成功はどちらも `04`。護衛の相手を死なせても `04` になるイベントがある | 🟢 |
| `05` | 失敗（逃走・主要人物の死亡など） | ✅ |
| `FF` | 未到達（周回の開始時） | ✅ |

「参加した」を表す値は `03` で、誘いや依頼を引き受けた時点で入る（🟢）。ただし次のイベントは `03` を通らない。

- 4日目以降の勢力のイベント（公儀の剣・東国の騎士・志士の刀など）：引き受けた時点で `04`
- 選択の場面がないイベント（序章・大寄せ・結末、前のイベントから続けて起こるもの）：`04` だけ、または `01` → `04`
- `01` は、話しかけずに場所へ入るだけで導入が流れるイベント（剣術大会の準備・魔鱗組の力・真実・売国奴を斬れ など）で使う

発生条件は、多くが「そのイベントの状態が `02` 以下（まだ引き受けていない）」と「直前の時間帯のイベントの状態」「勢力・人物・施設のフラグ」の組み合わせ。

### 開始前の失敗

フロントマターの `failure_conditions` には、イベントが始まる前に、そのイベントを起こせなくなる条件を書く。イベントの中で失敗する条件（逃走・人物の死亡など）は `flag_changes` の「= 5」に書く。

次のものは全イベント共通なので、各ファイルには書かない。

- 時間帯が過ぎた：状態は `00` のまま、日数からチャートに失敗と表示される（✅）
- 同じ時間帯のイベントを1つ終えた：時間帯が進み、その枠のほかのイベントは起こせなくなる。2日目の施設（病院 `0x375D`・カジノ `0x375E`・語学所 `0x375F`）の状態で、同じ枠の2つのイベントのどちらが起きるかが決まるが、これもこの規則に含める
- 同じ枠の対になるイベントを引き受けた：開始条件「状態 `<= 2`」が満たされなくなる（🟢。チャートの表示は ❓）
- 真ルートに入った（`0x378D`（通し番号 229）= 2）：序章の[三姉妹見参](best__prologue__meeting_with_the_three_sisters.md)の成功で 2 になり、その周回では 1 に戻らない。序章より後の、真ルート以外のイベントはすべて起こせなくなる（🟢）

各ファイルに書くのは次のもの。

| 種類 | 状態の値 | 書き方 |
|---|---|---|
| 開始条件のフラグが戻らない値になった（人物の死亡、ルートが閉じた、真ルートを外れた など） | `02` 以下のまま（チャートの表示は ❓） | そのフラグと値 |
| 別の場面で状態に `05` が書かれる | `05` | 書かれる場面を `meaning` に書く |

開始条件のフラグでも、あとで元に戻るもの（勢力との敵対など）は書かない。日数に関係なく進むイベント（4日目以降・剣術大会以降）で、段階が先へ進むと起こせなくなるものは「段階」の条件として書く。

### 段階

| 値 | 段階 |
|---|---|
| 0 | 序章 |
| 100・110・120 | 1日目 昼・夕・夜 |
| 200・210・220 | 2日目 昼・夕・夜 |
| 300・310・320 | 3日目 昼・夕・夜 |
| 400 | 4日目以降（剣術大会前） |
| 410・420 | 真ルートの4日目以降。剣術大会の1回戦・2回戦のあと、最後通告でもこの値になる |
| 500・510・520 | 剣術大会以降 |
| 600 | 鬼怒川の魔手以降 |
| 999 | 結末 |

## 索引

通し番号の順。「状態」はそのイベントの状態の位置。

### 序章・共通・無所属

| 通し番号 | 状態 | イベント | 段階 |
|---|---|---|---|
| 0 | `0x36A8` | [船上の侍](other__prologue__samurai_on_board.md) | 序章 |
| 1 | `0x36A9` | [阿弥浜港争乱](other__prologue__amihama_harbor_skirmish.md) | 序章 |
| 2 | `0x36AA` | [簀巻き日和](other__prologue__all_wrapped_up.md) | 序章 |
| 3 | `0x36AB` | [嵐のあと](other__1_day__after_the_storm.md) | 1日目 昼 |
| 28 | `0x36C4` | [大老 鬼怒川怨仙](other__3_day__chief_minister_onsen_kinugawa.md) | 3日目 昼〜4日目以降 |
| 32 | `0x36C8` | [白昼の激突](other__3_day__clash_at_midday.md) | 3日目 昼 |
| 41 | `0x36D1` | [大老の大寄せ](other__4_day__the_chief_ministers_big_move.md) | 4日目以降 |
| 45 | `0x36D5` | [根無し草](other__4_day__idle_chatter.md) | 4日目以降 |
| 46 | `0x36D6` | [剣術大会開催](other__4_day__battle_tournament_opens.md) | 4日目以降 |
| 50 | `0x36DA` | [剣術大会（無所属）](other__4_day__battle_tournament_independent.md) | 4日目以降 |
| 51 | `0x36DB` | [覇者となる](other__4_day__we_are_the_champions.md) | 4日目以降 |
| 52 | `0x36DC` | [最後通告](other__ending__final_warning.md) | 結末 |
| 97 | `0x3709` | [魔鱗組として](other__ending__as_a_demonscale.md) | 結末 |
| 98 | `0x370A` | [釜茹で侍](other__ending__boiled_samurai.md) | 結末 |

### 幕府

| 通し番号 | 状態 | イベント | 段階 |
|---|---|---|---|
| 4 | `0x36AC` | [代官所の面々](shogunate__1_day__the_magistrates_offices.md) | 1日目 昼 |
| 7 | `0x36AF` | [琴吹光探検隊](shogunate__1_day__hikaru_kotobukis_explorers_club.md) | 1日目 夕 |
| 10 | `0x36B2` | [阿片密売を阻止せよ](shogunate__1_day__stop_the_opium_smugglers.md) | 1日目 夜 |
| 13 | `0x36B5` | [西洋医学お断り](shogunate__2_day__denying_western_medicine.md) | 2日目 昼 |
| 14 | `0x36B6` | [病院廃業の企て](shogunate__2_day__plan_to_shut_down_the_hospital.md) | 2日目 昼 |
| 18 | `0x36BA` | [講師ご到着](shogunate__2_day__the_lecturer_arrives.md) | 2日目 夕 |
| 19 | `0x36BB` | [語学所開設](shogunate__2_day__the_language_school_opens.md) | 2日目 夕 |
| 23 | `0x36BF` | [ガイジンとゲイシャ](shogunate__2_day__gaijin_geisha.md) | 2日目 夜 |
| 29 | `0x36C5` | [魔鱗組の力](shogunate__3_day__the_might_of_the_demonscales.md) | 3日目 昼 |
| 33 | `0x36C9` | [大老と三姉妹](shogunate__3_day__the_chief_minister_the_three_sisters.md) | 3日目 夕 |
| 36 | `0x36CC` | [剣術大会の準備](shogunate__3_day__preparing_for_the_battle_tournament.md) | 3日目 夜 |
| 42 | `0x36D2` | [公儀の剣](shogunate__4_day__imperial_sword.md) | 4日目以降 |
| 47 | `0x36D7` | [剣術大会（幕府）](shogunate__4_day__battle_tournament_shogunate.md) | 4日目以降 |
| 53 | `0x36DD` | [闇黒の意志](shogunate__after_tournament__a_dark_will.md) | 剣術大会以降 |
| 54 | `0x36DE` | [大老武断](shogunate__after_tournament__chief_minister_at_war.md) | 剣術大会以降 |
| 55 | `0x36DF` | [憂国の士](shogunate__after_tournament__patriots.md) | 剣術大会以降 |
| 59 | `0x36E3` | [般若党壊滅](shogunate__after_tournament__annihilation_of_the_prajnas.md) | 剣術大会以降 |
| 60 | `0x36E4` | [黒船を我が手に](shogunate__after_tournament__black_ship_in_hand.md) | 剣術大会以降 |
| 64 | `0x36E8` | [三匹で斬る](shogunate__after_tournament__the_three_kataneers.md) | 剣術大会以降 |
| 65 | `0x36E9` | [剣客 茂呂茂](shogunate__after_tournament__shigeru_moro_swordsman.md) | 剣術大会以降 |
| 66 | `0x36EA` | [武人 琴吹光](shogunate__after_tournament__hikaru_kotobuki_military_man.md) | 剣術大会以降 |
| 67 | `0x36EB` | [悲しみのローラ](shogunate__after_tournament__grief_stricken_laura.md)（ゲーム内では起きない） | 剣術大会以降 |
| 93 | `0x3705` | [破滅への道](shogunate__ending__road_to_ruin.md) | 結末 |
| 94 | `0x3706` | [変わり往く心](shogunate__ending__a_change_of_heart.md) | 結末 |

### 外国

| 通し番号 | 状態 | イベント | 段階 |
|---|---|---|---|
| 5 | `0x36AD` | [小公女謁見](foreigners__1_day__audience_with_the_littlest_public_servant.md) | 1日目 昼 |
| 8 | `0x36B0` | [電信あり](foreigners__1_day__the_telegraph.md) | 1日目 夕 |
| 11 | `0x36B3` | [辻斬りを辻斬る](foreigners__1_day__killing_casual_killing.md) | 1日目 夜 |
| 15 | `0x36B7` | [病院占拠事件](foreigners__2_day__owh_occupy_western_hospital.md) | 2日目 昼 |
| 16 | `0x36B8` | [祝 病院開業](foreigners__2_day__hooray_the_hospitals_grand_opening.md) | 2日目 昼 |
| 20 | `0x36BC` | [お団子物語](foreigners__2_day__a_dumpling_tale.md) | 2日目 夕 |
| 24 | `0x36C0` | [ライジングサン](foreigners__2_day__rising_sun.md) | 2日目 夜 |
| 25 | `0x36C1` | [カジノ再建を急げ](foreigners__2_day__hurrying_to_rebuild_the_casino.md) | 2日目 夜 |
| 30 | `0x36C6` | [小公女と大老](foreigners__3_day__the_little_public_servant_the_big_minister.md) | 3日目 昼 |
| 34 | `0x36CA` | [小公女倒れる](foreigners__3_day__the_ambassador_collapses.md) | 3日目 夕 |
| 37 | `0x36CD` | [危険な賭け](foreigners__3_day__a_risky_gamble.md) | 3日目 夜 |
| 43 | `0x36D3` | [東国の騎士](foreigners__4_day__the_eastern_knight.md) | 4日目以降 |
| 48 | `0x36D8` | [剣術大会（外国）](foreigners__4_day__battle_tournament_foreigners.md) | 4日目以降 |
| 56 | `0x36E0` | [願い虚しく](foreigners__after_tournament__wasted_wish.md) | 剣術大会以降 |
| 61 | `0x36E5` | [鬼怒川の魔手](foreigners__after_tournament__kinugawas_evil_influence.md) | 剣術大会以降 |
| 68 | `0x36EC` | [夕暮れの船上](foreigners__after_kinugawa__twilight_on_board.md) | 鬼怒川の魔手以降 |
| 69 | `0x36ED` | [討ち入り](foreigners__after_kinugawa__the_raid.md) | 鬼怒川の魔手以降 |
| 95 | `0x3707` | [海外雄飛](foreigners__ending__setting_off_to_foreign_lands.md) | 結末 |
| 96 | `0x3708` | [侍一直線](foreigners__ending__samurai_straight.md) | 結末 |

### 攘夷（般若党）

| 通し番号 | 状態 | イベント | 段階 |
|---|---|---|---|
| 6 | `0x36AE` | [志士との出会い](prajna__1_day__encounter_with_the_patriots.md) | 1日目 昼 |
| 9 | `0x36B1` | [海兵隊の横暴](prajna__1_day__violent_behavior_of_the_marine_corps.md) | 1日目 夕 |
| 12 | `0x36B4` | [代官所潜入](prajna__1_day__sneaking_into_the_magistrates_office.md) | 1日目 夜 |
| 17 | `0x36B9` | [欺きの代価](prajna__2_day__a_deceptive_price.md) | 2日目 昼 |
| 21 | `0x36BD` | [語学無用](prajna__2_day__we_dont_need_no_stinkin_language_school.md) | 2日目 夕 |
| 22 | `0x36BE` | [講師を亡き者に](prajna__2_day__the_lecturer_is_a_dead_man.md) | 2日目 夕 |
| 26 | `0x36C2` | [カジノを破壊せよ](prajna__2_day__destroy_the_casino.md) | 2日目 夜 |
| 27 | `0x36C3` | [カジノ再建断固阻止](prajna__2_day__put_an_end_to_the_casinos_reconstruction.md) | 2日目 夜 |
| 31 | `0x36C7` | [血で血を洗う戦い](prajna__3_day__washing_blood_with_blood.md) | 3日目 昼 |
| 35 | `0x36CB` | [売国奴を斬れ](prajna__3_day__kill_the_traitor.md) | 3日目 夕 |
| 38 | `0x36CE` | [真実](prajna__3_day__the_truth.md) | 3日目 夜 |
| 39 | `0x36CF` | [仕組まれた襲撃](prajna__3_day__planned_raid.md) | 3日目 夜 |
| 40 | `0x36D0` | [罠を破れ](prajna__3_day__break_the_snare.md) | 3日目 夜 |
| 116 | `0x371C` | [夜の墓場で](prajna__3_day__at_the_cemetery_in_the_night.md) | 3日目 夜 |
| 44 | `0x36D4` | [志士の刀](prajna__4_day__blades_of_the_patriots.md) | 4日目以降 |
| 49 | `0x36D9` | [剣術大会（攘夷）](prajna__4_day__battle_tournament_prajnas.md) | 4日目以降 |
| 57 | `0x36E1` | [臆病風](prajna__after_tournament__loss_of_nerve.md) | 剣術大会以降 |
| 58 | `0x36E2` | [同士救出](prajna__after_tournament__mutual_rescue.md) | 剣術大会以降 |
| 62 | `0x36E6` | [領事館斬り込み](prajna__after_tournament__raiding_the_consulate.md) | 剣術大会以降 |
| 63 | `0x36E7` | [武士の魂](prajna__after_tournament__the_samurai_spirit.md) | 剣術大会以降 |
| 91 | `0x3703` | [熱き魂](prajna__ending__fevered_spirits.md) | 結末 |
| 92 | `0x3704` | [攘夷の炎](prajna__ending__the_flames_of_prajna.md) | 結末 |

### 真ルート

| 通し番号 | 状態 | イベント | 段階 |
|---|---|---|---|
| 70 | `0x36EE` | [三姉妹見参](best__prologue__meeting_with_the_three_sisters.md) | 序章 |
| 71 | `0x36EF` | [お早い到着](best__1_day__a_speedy_arrival.md) | 1日目 夕 |
| 72 | `0x36F0` | [再起の望み](best__1_day__praying_for_recovery.md) | 1日目 夜 |
| 73 | `0x36F1` | [将の器](best__2_day__ability_to_lead.md) | 2日目 昼 |
| 74 | `0x36F2` | [怒りの矛先](best__2_day__the_sting_of_hatred.md) | 2日目 昼 |
| 75 | `0x36F3` | [伯爵に刺激を](best__2_day__down_for_the_count.md) | 2日目 夕 |
| 76 | `0x36F4` | [運命のルーレット](best__2_day__dice_of_destiny.md) | 2日目 夕 |
| 77 | `0x36F5` | [闇討ち](best__2_day__strike_in_the_dark.md) | 2日目 夜 |
| 83 | `0x36FB` | [大老暗殺計画](best__2_day__plot_to_assassinate_the_chief_minister.md) | 2日目 昼〜4日目以降 |
| 78 | `0x36F6` | [学問のすすめ](best__3_day__pursuit_of_knowledge.md) | 3日目 昼 |
| 79 | `0x36F7` | [刺激が欲しい](best__3_day__in_need_of_encouragement.md) | 3日目 夕 |
| 80 | `0x36F8` | [傷心の帰国船](best__3_day__the_sad_boat_home.md) | 3日目 夕 |
| 81 | `0x36F9` | [伯爵救出](best__3_day__rescuing_the_count.md) | 3日目 夜 |
| 82 | `0x36FA` | [人間湯通しの恐怖](best__4_day__a_day_at_the_spa.md) | 4日目以降 |
| 84 | `0x36FC` | [（名前不明）](best__4_day__event_84.md)（ローラの決意の前半の導入） | 4日目以降（410） |
| 85 | `0x36FD` | [ローラの決意](best__4_day__lauras_determination.md) | 4日目以降（410） |
| 86 | `0x36FE` | [士魂は屈せず](best__4_day__the_fighting_spirit_never_dies.md) | 4日目以降（420） |
| 87 | `0x36FF` | [ローラ奪還](best__4_day__rescuing_laura.md) | 4日目以降（420） |
| 88 | `0x3700` | [鬼怒川を追え](best__after_tournament__in_pursuit_of_kinugawa.md) | 剣術大会以降 |
| 89 | `0x3701` | [黒船の決闘](best__after_tournament__black_ship_battle.md) | 剣術大会以降 |
| 90 | `0x3702` | [希望の光](best__ending__the_light_of_hope.md) | 結末 |
| 99 | `0x370B` | [大老は生きていた](best__ending__the_chief_minister_lived.md) | 結末 |

### 載せていない番号

| 通し番号 | 状態 | 理由 |
|---|---|---|
| 100〜115、117〜165 | `0x370C`〜 | イベントに当たらない番号 ❓ |
| 102 | `0x370E` | ガイジンとゲイシャで 3 のときだけの会話があるが、値を書く場面がない。使われていない番号（🟢） |
