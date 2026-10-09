# 侍道4（Steam版）セーブデータの形式

セーブファイル `S4-DATA_00`〜`04` について、現時点でわかっていることをまとめる。
ファイル内のどの範囲にどんな情報があるかをこのファイルに書き、範囲ごとの詳細は `chunks/{chunk_slug}/README.md` に書く。
IDの一覧（パーツ、アイテム、銘など）は `datatable/` に置く。

<!--
書き方
- このファイルには全体に関わることだけを書く。個別の範囲のフィールドや調査の記録は chunks/ に書く
- まとまり（chunk）を追加・削除・統合・修正したら、§3 の表も直す
- その時点で正しい情報だけを書く。覆された説や試行錯誤の経過は残さない（経過は chunks/{chunk_slug}/reserch/ に残す）
-->

## 1. 凡例

### 1.1 確度

| 記号 | 意味                                                                                   |
| ---- | -------------------------------------------------------------------------------------- |
| ✅    | 確定：PC版の実データ、PC版を対象にした資料、または [TS] の実装（I-3 の範囲）で確認済み |
| 🟢    | ほぼ確定として扱い、実データやゲーム内の動作と食い違いが見つかった時点で直す           |
| 🟡    | 高確度：PS3版の改造コードなどから逆算したもの。PC版ではまだ検証していない              |
| 🔶    | 推測：データの並びや数値規則から推定したもの                                           |
| ❓    | 未確認：位置や意味がわかっていないもの                                                 |

🟡🔶❓の情報、および判定待ち（U-n）の項目をコードに書くときは、コメントとテストの両方に確度・項目番号を残す（`AGENTS.md`）。
🟢 の情報は確定と同じに扱ってよいが、食い違いが見つかったときに辿れるよう、コードのコメントに 🟢 と出典を残す。

### 1.2 出典の略号

| 略号             | 内容                                                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [TS]             | tarotshogun/WayOfTheSamurai4SaveEditor（V1.06 Take 2 対応、コミット `cad824d`）                                                                                      |
| [I-1]〜[I-3]     | `inspection.md` の調査結果（I-1 主人公名は31文字まで／I-2 武器レコード長は0xA0／I-3 実装されている範囲では [TS] は正しい）。I-3 の適用範囲は `../check-diff.md` §0.2 |
| [W-PC] [W]       | 侍道4攻略@wiki（PC版ページ／その他のページ）                                                                                                                         |
| [SE-BBS] [SE-GG] | PS3版のセーブエディター掲示板／Game Genieコード                                                                                                                      |
| [CT]             | Cheat Engine テーブル（Steam V1006）                                                                                                                                 |
| [U]              | ユーザー自身の解析データ                                                                                                                                             |
| D-n              | 2つの解析ノートの相違のうち判定済みのもの（`../check-diff.md` §2）                                                                                                   |
| U-n              | 判定待ちの相違（`../check-diff.md` §1）。判明したものも番号を残して §3 に置く                                                                                        |

### 1.3 判定待ちの書き方

判定できていない相違点は `../check-diff.md` に U-n として置き、chunk からは次の形でリンクする。

> ❓ **判定待ち → [U-4](../check-diff.md#u-4)**　案A：… ／ 案B：…　**採用までの扱い**：…

## 2. ファイル全体

| 項目                       | 内容                                                                                                                                                                      | 確度 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| Steam AppID                | 312780                                                                                                                                                                    | ✅    |
| 保存場所                   | `%USERPROFILE%\Documents\My Games\Ghostlight Ltd\Way of the Samurai 4\`。ドキュメントのリダイレクトや OneDrive で実際の場所が変わることがある。インストールフォルダとは別 | ✅    |
| ファイル                   | `S4-DATA_00`〜`S4-DATA_04`（拡張子なし。00がスロット1、04がスロット5）                                                                                                    | ✅    |
| 設定ファイル               | `<ゲームフォルダ>\S4-SETTINGS.ini`                                                                                                                                        | ✅    |
| Steam Cloud                | 保存場所の全ファイル（pattern `*`）を同期する                                                                                                                             | ✅    |
| エンディアン               | リトルエンディアン。PS3版はビッグエンディアン                                                                                                                             | ✅    |
| 文字列                     | UTF-16LE、1文字2バイト、固定長フィールド。上書きのみ                                                                                                                      | ✅    |
| 暗号化・圧縮・チェックサム | なし（[TS] はチェックサムを再計算せずに書き戻して動く [I-3]。差分にも検査値らしき変化はない）                                                                             | ✅    |
| ファイルサイズ             | 0x48BB0（297,904）バイト（[TS] の構造体サイズ）                                                                                                                           | ✅    |
| 対応バージョン             | [TS] は V1.06 Take 2 のみ対応。2025年6月の日本語対応アップデート後に形式が変わったかは不明                                                                                | ❓    |

### 2.1 参考：[TS] の構造体の配置

宣言順と Pack = 1 から計算した位置。**`Padding` という名前でも空き領域とは限らない**（中に解析済みのフィールドがある）。

| 開始       | 終了（含む） | フィールド                                                                    |
| ---------- | ------------ | ----------------------------------------------------------------------------- |
| `0x000000` | `0x000007`   | `Padding0000_0007`                                                            |
| `0x000008` | `0x00000B`   | `Money`                                                                       |
| `0x00000C` | `0x00000F`   | `Cashbox`                                                                     |
| `0x000010` | `0x0000DB`   | `Padding0010_00CF`、`Padding00D0_00DB`                                        |
| `0x0000DC` | `0x00011B`   | `Name`                                                                        |
| `0x00011C` | `0x000B3B`   | `Padding011C_011F`、`Padding0120_0B2F`、`Padding0B30_0B3B`                    |
| `0x000B3C` | `0x000B3F`   | `SamuraiPoint`                                                                |
| `0x000B40` | `0x0035A3`   | `Padding0B40_359F`、`Padding35A0_35A4`                                        |
| `0x0035A4` | `0x0035A7`   | `Katsuryoku`（名前と実際の意味は合わない。[vitals](chunks/vitals/README.md)） |
| `0x0035A8` | `0x0035AB`   | `Hp`                                                                          |
| `0x0035AC` | `0x0058BF`   | `Padding35AC_35AF`、`Padding35B0_58BF`                                        |
| `0x0058C0` | `0x005B3F`   | `CabinetItems`                                                                |
| `0x005B40` | `0x005B8F`   | `CarriedItems`                                                                |
| `0x005B90` | `0x005BDF`   | `RareItems`                                                                   |
| `0x005BE0` | `0x00A4C1`   | `Padding5BE0_A4BF`、`PaddingA4C0_A4C1`                                        |
| `0x00A4C2` | `0x00A6A1`   | `CarriedWeapons`                                                              |
| `0x00A6A2` | `0x00A6A9`   | `PaddingA6A2_A6A9`                                                            |
| `0x00A6AA` | `0x00ACE9`   | `BaggedWeapons`                                                               |
| `0x00ACEA` | `0x00ACED`   | `PaddingACEA_ACED`                                                            |
| `0x00ACEE` | `0x0129ED`   | `CabinetWeapons`                                                              |
| `0x0129EE` | `0x01920F`   | `Padding129EE_129EF`、`Padding129F0_1920F`                                    |
| `0x019210` | `0x01A60F`   | `MyRyuhaName`（作者が位置不正と注記。U-6）                                    |
| `0x01A610` | `0x048BAF`   | `Padding1A610_`                                                               |

## 3. まとまりの一覧

`0x36A8`〜`0x3837` は、1バイトの値が並ぶ一続きの領域で、通し番号 0〜399 で数える（番号 N が `0x36A8 + N`、🟢）。
続く記録 B（`0x3838`〜）も同じ並びの 400〜 とみられる（🔶）。

開始・終了はセーブ先頭からの固定オフセット。離れた複数の範囲を持つまとまりは、範囲ごとに1行にする。

| 開始            | 終了（含む） | まとまり                                          | 内容                                           | 確度                         |
| --------------- | ------------ | ------------------------------------------------- | ---------------------------------------------- | ---------------------------- |
| `0x000000`      | `0x000000`   | [difficulty](chunks/difficulty/README.md)         | 難易度（`0x0001`〜`0x0007` は詰め物）          | ✅ 0・3 ／ 🟢 1・2             |
| `0x000008`      | `0x00000F`   | [money](chunks/money/README.md)                   | 所持金・金庫                                   | ✅                            |
| `0x000010`      | `0x0000DB`   | [date-location](chunks/date-location/README.md)   | シナリオの段階・時間帯・現在地（開始地点）・治安・踏み倒した店（`0x001C`〜 は予約） | ✅位置 ／ 🟢 ／ 一部 🔶❓       |
| `0x0000DC`      | `0x00011B`   | [player-name](chunks/player-name/README.md)       | 主人公名                                       | ✅                            |
| `0x00011C`      | `0x000B33`   | [townsfolk](chunks/townsfolk/README.md)           | なりわいのフラグ（64 B）と町の人ごとのレコード（12 B × 210、死亡のビット） | 🟢 ／ 一部 ✅                 |
| `0x000B34`      | `0x000C63`   | [stats](chunks/stats/README.md)                   | 侍評価（侍度・称号・侍点）・プレイ時間・移動距離・斬殺数・経過日数・人物ごとの痛手 | 🟢 ／ 一部 ✅                 |
| `0x000C64`      | `0x001C03`   | [kill-counts](chunks/kill-counts/README.md)       | 技ごとの斬殺数（周回中）                       | 🟢                            |
| `0x001C04`      | `0x002BA3`   | [kill-counts](chunks/kill-counts/README.md)       | 技ごとの斬殺数（累計）                         | 🟢                            |
| `0x002BA4`      | `0x0033A3`   | [item-uses](chunks/item-uses/README.md)           | 道具ごとの使用回数（周回中・累計）             | 🟢                            |
| `0x0033A4`      | `0x0035A3`   | [occupation](chunks/occupation/README.md)         | なりわいの状態の表                             | ✅                            |
| `0x0035A4`      | `0x0035B3`   | [vitals](chunks/vitals/README.md)                 | HP・活力                                       | 一部 ✅（U-4）                |
| `0x003634`      | `0x0036A7`   | [item-effects](chunks/item-effects/README.md)     | 時間で切れる道具の効果（残り時間・倍率。読み込みでは使われない） | 🟢                            |
| `0x0036A8`      | `0x00374D`   | [event-chart](chunks/event-chart/README.md)       | イベントの状態 A（周回中）                     | ✅                            |
| `0x00374E`      | `0x003837`   | [scenario-flags](chunks/scenario-flags/README.md) | シナリオのフラグ列（下の5つを含む）            | 🟢範囲 ／ 一部 ✅              |
| `0x00374E`      | `0x00375C`   | [characters](chunks/characters/README.md)         | 重要人物の状態                                 | 🟢人物 ／ 一部 ✅              |
| `0x00375D`      | `0x00375F`   | [facilities](chunks/facilities/README.md)         | 施設（病院・カジノ・語学所）                   | ✅                            |
| `0x003764`      | `0x0037FB`   | [gates](chunks/gates/README.md)                   | 門の開閉（飛び飛びの7バイト）                  | ✅ ／ `0x37FB` 🟢              |
| `0x003780`      | `0x00378C`   | [factions](chunks/factions/README.md)             | 勢力の友好度・敵対状態・ルート分岐             | ✅                            |
| `0x00378D`      | `0x0037AA`   | [best-route](chunks/best-route/README.md)         | 真ルートと、その周りの好感度・職など           | ✅ 0x378E ／ 一部 🟢 ／ ほか ❓ |
| `0x003838`      | `0x0038FF`   | [event-chart](chunks/event-chart/README.md)       | イベントの記録 B（周回をまたぐ）               | ✅                            |
| `0x003900`      | `0x003901`   | [hint](chunks/hint/README.md)                     | 次のイベントのヒント（最後に進めたイベントのノード番号） | ✅位置 ／ 🟢値 ／ ❓文との対応 |
| `0x003902`      | `0x00399F`   | [accessories](chunks/accessories/README.md)       | 装飾品の所持フラグ（ID 0〜157 の順に 1 B ずつ） | ✅                            |
| `0x0048CC`      | `0x0058BD`   | [sect-scrolls](chunks/sect-scrolls/README.md)     | 流派の書（持ち歩き 20 枠・道場の箪笥 150 枠・箪笥の件数） | 🟢                            |
| `0x0058C0`      | `0x005BDF`   | [items](chunks/items/README.md)                   | 箪笥・手持ち・貴重品のアイテム                 | ✅                            |
| `0x005C3C`      | `0x006197`   | [memory-garbage](chunks/memory-garbage/README.md) | アドレス風の値（0x7C 刻み12か所）              | 🔶                            |
| `0x00A4C8`      | `0x0129F6`   | [weapon-record](chunks/weapon-record/README.md)   | 帯刀中・武器袋・武器箪笥の武器（0xA0 × 213件）と武器箪笥の本数・容量 | ✅ ／ 🟢境界・本数と容量 |
| `0x00A6A8`      | `0x00A6AF`   | [belt-state](chunks/belt-state/README.md)         | 帯刀の状態（本数・選択中・二刀流・峰打）       | ✅読み ／ 🟢読み込み ／ ❓書き込み |
| `0x0137EC`      | `0x014037`   | [night-visit](chunks/night-visit/README.md)       | 夜這いの回数・記録（100件）・段階・相手ごとの回数 | 一部 ✅ ／ 🟢                 |
| `0x014038`      | `0x014063`   | [night-visit](chunks/night-visit/README.md)       | 夜の約束の枠                                   | 一部 ✅                       |
| `0x01417C`      | `0x0189FB`   | [skill-states](chunks/skill-states/README.md)     | 技の覚え状況（技の表ごと 128 枠・構えごと 13 × 128） | 🟢                            |
| `0x0189FC`      | `0x01920D`   | [styles](chunks/styles/README.md)                 | 習得技数・腕前点・構えの組ごとの装備・流派ごとの修練度・段・倒した数（16 B × 128 枠） | 🟢                            |
| `0x01920E`      | `0x01A60F`   | [custom-style](chunks/custom-style/README.md)     | 俺流（件数・80 B × 64 枠）                     | 🟢                            |
| `0x01A610`      | `0x03AA11`   | [belt-copy](chunks/belt-copy/README.md)           | 俺流の技の表（件数・0x408 B × 128 枠。後半はゲームの状態ではない値） | 🟢                            |
| `0x03AA12`      | `0x03AAD1`   | [skill-kills](chunks/skill-kills/README.md)       | 技ごとの斬殺数（6 B × 32 枠。俺流に組み込む条件）    | 🟢                            |
| `0x03AAD4`      | `0x03AB5B`   | [appearance](chunks/appearance/README.md)         | 主人公の見た目（人物・肌色・タイプ・体型・身長・部品の番号） | ✅肌色・体型・身長 ／ 🟢部品 ／ 一部 ❓ |
| `0x03AB5C`      | `0x03AB7A`   | [appearance](chunks/appearance/README.md)         | 容姿の解放ビット（服の番号 0〜241 ごとに1ビット） | ✅位置 ／ 🟢服の対応          |
| `0x043318`      | `0x043381`   | [unlocks](chunks/unlocks/README.md)               | 特典解除の状態（1 B × 106）                    | 先頭16件・101 ✅ [U]／ほか 🔶 U-17 |
| `0x0433A6`      | `0x0433A7`   | [occupation](chunks/occupation/README.md)         | クリアしたなりわいの数                         | 🔶                            |
| `0x0440D8`      | `0x045F3B`   | [market-weapons](chunks/market-weapons/README.md) | 流通中の武器（15件 × 0xA4 B）・道具・刃・鍔・柄 | 🟢                            |
| `0x045F40`      | `0x045F55`   | [occupation](chunks/occupation/README.md)         | 受注中のなりわい                               | 🔶                            |

## 4. PS3版でだけ分かっている位置

出典は [SE-BBS] と [SE-GG]。PC版では未検証（🟡）。PS3版の武器レコード（0xA4D8〜、0x9C刻み）と武器箪笥（0xACD0〜）は PC版と合わないので使わない（D-1, D-2）。

| データ         | PS3でのアドレス | 型・値の例                                           |
| -------------- | --------------- | ---------------------------------------------------- |
| 魂技ゲージ     | 0x35B4 / 0x35B8 | float                                                |
| 弟子           | 0x13D0C〜       | 20人分、構造は不明                                   |
| 腕前           | 0x186AA         | u16                                                  |
| 流派書の経験値 | 0x186CC〜       | u16 の配列                                           |
| 特典解除       | 0x43030〜       | 状態値（1=解除可能、2=解除済み表示だが反映されない） |

## 5. 位置が分かっていないゲーム側の仕様

位置を特定したら chunk を作り、根拠の差分を `reserch/` に置く。

| 項目                     | 仕様                                                                                                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 外見                     | 現在の体型 `0x3AADD`・身長 `0x3AAE0`（float32 LE）・肌色 `0x3AAD8` は ✅ [U]（U-18、[appearance](chunks/appearance/README.md)）。人物の番号 `0x3AAD4`、顔・髪型・服の部品の番号 `0x3AAE4`〜（12 B × 10）は 🟢（顔・髪型の書き込みは ✅ [U]）。髪の色 `0x3AADA` は位置 ✅ [U]・値 ❓（U-19） |
| 斬殺数（全体）           | 流派ごとの斬殺数は [styles](chunks/styles/README.md) の +0x06 🟢。全体は [stats](chunks/stats/README.md) の 0x0BC8・0x0BCC 🟢。技ごとは [kill-counts](chunks/kill-counts/README.md) 🟢                                    |
| エンディング記録・周回数 | 周回数は [stats](chunks/stats/README.md) の `0x0B8C` 🟢。難易度ごとのクリア回数・立ち去った回数は [date-location](chunks/date-location/README.md)。エンディングごとの記録は ❓ |
| 特典（PC版）             | ❓（PS3版は §4）                                                                                                                                                      |
| 座標                     | ロード時は決まった地点から始まるので、保存されていない可能性が高い 🔶                                                                                                 |
| デフォルト武器名         | 完成武器のデフォルト名を書き換えても、帯刀すると元に戻るという報告がある                                                                                             |

エンディング（[W]）：

| #   | 名称             | 条件の要点                                                 |
| --- | ---------------- | ---------------------------------------------------------- |
| 1   | 熱き魂           | 攘夷ルートで【真実】が起きない、または失敗する             |
| 2   | 攘夷の炎         | 攘夷ルートで【真実】でまだらを斬る                         |
| 3   | 破滅への道       | 幕府ルートで鬼怒川に賛同する（茂呂の生存が必須）           |
| 4   | 変わり往く心     | 幕府ルートで鬼怒川に背く（茂呂の生存が必須）               |
| 5   | 海外雄飛         | 外国ルートでローラを守り、ローラに賛同する                 |
| 6   | 侍一直線         | 外国ルートでローラが死亡する、または大義を選ぶ             |
| 7   | 魔鱗組として     | 無所属で剣術大会に優勝する                                 |
| 8   | 釜茹で侍         | 勢力に所属した状態で優勝し、表彰台に上る                   |
| 9   | 希望の光         | 真ルート。語学所・病院が開設、カジノが閉鎖などの条件あり   |
| 10  | 大老は生きていた | 真ルートで「希望の光」の条件を満たさない                   |

エンディングは本来11種類あった模様。イベントの添字（[event.csv](datatable/event/event.csv)）にも同じ名前のイベントがある。

## 6. 既知の不具合と注意点

ゲーム側：

- 前の周回と同じ勢力のルートが確定すると、ロード時にフリーズすることがある
- 牢屋（開始地点 0x14）でセーブしたデータは、ラスボス戦の後に落ちる
- 「タイトルに戻る」からロードすると夜這いのフラグが消える。テストのたびにゲームを完全に終了する
- 名前が長すぎるとロードできなくなる。文字列は上書きのみで、挿入はしない
- 攻撃力501以上や魅力4つ以上など、正規の範囲外の値は表示崩れや箪笥を開けなくなる原因になる
- Steam Cloud で古いデータに戻されることがある。写真家の画面で削除すると、クラウド側のデータも消える

既存エディタ：

- [TS]：V1.06 Take 2 のみ対応。構造体サイズ分だけ読み、`FileMode.Create` で同じサイズを書き出す。名前の書き込みで文字数とバイト数を混同している。未知のIDを既定値に変換するので、読み込んで保存すると未知の値が変わることがある。3バイト単位のパーツ編集は鞘 X の一部も書き換える
- Web版（https://wots4saveeditor.neocities.org/ 、2026-10-04時点）：所持金・金庫・魅力の位置は本書と一致。魅力3の個数に魅力IDを書く不具合と、疾風（Squall）の値を 6 にする誤り（正しくは 5）がある

## 7. 調べ方

### 7.1 位置の求め方

セーブ先頭からの固定オフセットで読み書きする。ファイルサイズ（0x48BB0）、領域の境界、値の範囲を検証し、通らない領域は読み取り専用にする。書き込みのたびに自動でバックアップを取り、ファイルサイズは変えない。

### 7.2 差分解析の共通ルール

- Steam Cloud をオフにする
- 同じスロットで、操作の直前と直後にセーブする
- テストのたびにゲームを完全に終了する
- 同じ操作を2回行い、両方で再現した差分だけを採用する
- 時間で進む値（[stats](chunks/stats/README.md) のプレイ時間・0x0BC0、[vitals](chunks/vitals/README.md) の活力、武器レコードの +0x80/+0x84）、[memory-garbage](chunks/memory-garbage/README.md)、[item-effects](chunks/item-effects/README.md) の枠の +0x08〜+0x0F、[belt-copy](chunks/belt-copy/README.md) は差分から除いて読む

2案以上ある項目で「正しく編集できた」と判定する基準は `../check-diff.md` §0.3。

### 7.3 未解決のタスク

| タスク                                              | 差分を取るゲーム内操作                           | 関連 |
| --------------------------------------------------- | ------------------------------------------------ | ---- |
| 武器レコード内の未解析領域（+0x1C・+0x8E の意味など） | 帯刀中の武器のダンプとゲーム内の表示値を照合する |      |
| 治安 `0x0015` の初期値（1日目のセーブで 0 の例がある）（[date-location](chunks/date-location/README.md)） | 新しい周回を始めて1日目にセーブし、ゲーム内の治安と照合する |      |
| エンディング記録と周回数、エンディングで初期化される範囲（[date-location](chunks/date-location/README.md)） | 同じ周回のエンディングの直前と直後のセーブを比べる |      |
| なりわいの失敗の値                                  | なりわいに失敗する前後                           |      |
| 特典解除（PC版）                                    | 特典を1つ解除する前後                            |      |
| 外見                                                | 理髪屋で髪型だけ変える前後                       |      |
| 爪・拳銃・ライフルのパーツID                        | 該当武器を帯刀したセーブの +0x02〜+0x09 を読む   |      |

## 8. 参考資料

- [TS] tarotshogun/WayOfTheSamurai4SaveEditor（コミット `cad824d1321fb615b724174ea81544f0b0e8675b`、2024-04-20）https://github.com/tarotshogun/WayOfTheSamurai4SaveEditor
  - 主に参照したファイル：`Models/RawData/RawSaveData.cs`（構造体）、`Models/SaveDataFileIO/SaveDataAccessor.cs`（入出力）、
    `Models/SaveData/WeaponMaterial.cs`（パーツID）、`WeaponId.cs`（完成武器ID）、`WeaponAttribute.cs`（魅力・銘）、`Item.cs`・`RareItem.cs`（アイテム）、
    `Models/SaveDataConversion/` 配下の各 Converter
- [W-PC] 侍道4攻略@wiki「PC版 侍道4」 https://w.atwiki.jp/samuraidou4/pages/55.html
- [W] 侍道4攻略@wiki（パーツ一覧 p14、武器一覧 p13、エンディング p37、FAQ p4、イベント p44、鍛冶屋 p20、施設 p52、固有キャラ p41、バグ関連 p46、特典解除 p32） https://w.atwiki.jp/samuraidou4/
- [SE-BBS] PS3セーブエディター掲示板「侍道4」 https://web.save-editor.com/cache/bbs_savedata_ps3/1139.html
- [SE-GG] SAVE-EDITOR.com NPUB30755 Game Genieコード https://www.save-editor.com/tools_original/wse_ps3_save_editor_code_title.html?id=NPUB30755
- [CT] Cheat Engine テーブル：FearLess t=977（Steam V1006）、t=6746（GOG）。ユーザー提供の `WayOfTheSamurai4.txt`（"Char Info" テーブル）
- Web版エディタ https://wots4saveeditor.neocities.org/
- Steam コミュニティ：保存先 https://steamcommunity.com/app/312780/discussions/0/541906989397971655/ 、
  ドキュメント移動と保存不具合 https://steamcommunity.com/app/312780/discussions/0/591775577045733234/ 、
  Web エディタ使用報告 https://steamcommunity.com/app/312780/discussions/0/541906989409558559/?ctp=2&l=japanese
- SteamDB 312780 / PCGamingWiki「Way of the Samurai 4」
- GameFAQs 攻略（EVERYTHING69）：パーツの英語名と日本語名の照合に使用
- PS3 のセーブ書き換えブログ（Steam版の根拠には使わない）https://ameblo.jp/axl-low22/entry-11149209268.html 、https://ameblo.jp/kenbousanjou/entry-10826898858.html

## 9. 関連ドキュメント

- `chunks/README.md` — まとまりの追加のしかた
- `datatable/README.md` — IDの一覧の置き場所
- `../check-diff.md` — 判定待ち（U-n）と判定済みの相違（D-n）
- `../event.md` — イベントの分岐・内容・条件
