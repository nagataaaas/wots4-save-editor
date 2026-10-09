# datatable

IDを持つデータの一覧。1ファイル＝1つのリストの CSV。新しいファイルは `TEMPLATE.csv` をコピーして作る。

コードはこの CSV を直接読まず、`pnpm gen:dataset` で生成した `src/save/master/dataset/*.ts`（`id_dec` をキーにした型付きのオブジェクト）を使う。
CSV を直したら `pnpm gen:dataset` を実行する（生成物が古いとテストが落ちる）。列は名前で引くので、列の追加・並べ替えはしてよい。
列の型は値から決まる（すべて整数・小数・`0x` の16進数なら数値で、空は null。それ以外は文字列で、空は空文字。すべて空の列は null）。

<!--
書き方
- ファイルを追加・移動・削除したら、§1 の表も直す
- 迷ったらリストを分ける（例：刃と鍔は分ける。刃を刀用と槍用に分けてもよい）
- 同じID空間を共有するリストは、同じディレクトリに置き、§3 に区分を書く
- ファイル名は英小文字のケバブケース
-->

## 1. ファイル一覧

| ファイル                      | 内容               | ID空間                   | 保存形式                     | 空き・なし   | 参照元                                                    |
| ----------------------------- | ------------------ | ------------------------ | ---------------------------- | ------------ | --------------------------------------------------------- |
| `weapon/blade.csv`            | 刃（刀・槍）       | 通常パーツ               | u16 LE。直後に鞘 X（u16 LE） | `FFFF`       | [weapon-record](../chunks/weapon-record/README.md) +0x02  |
| `weapon/blade-special.csv`    | 刃（特殊武器）     | 特殊武器の刃             | ID u16 LE＋X `FF FF`         |              | [weapon-record](../chunks/weapon-record/README.md) +0x02  |
| `weapon/guard.csv`            | 鍔                 | 通常パーツ               | u16 LE                       | `FFFF`       | [weapon-record](../chunks/weapon-record/README.md) +0x06  |
| `weapon/grip.csv`             | 柄                 | 通常パーツ               | u16 LE                       |              | [weapon-record](../chunks/weapon-record/README.md) +0x08  |
| `weapon/title.csv`            | 銘                 | このリストのみ（362〜381）| 3 B。`<銘ID下位> 01 <番号>`  | `FF FF FF`   | [weapon-record](../chunks/weapon-record/README.md) +0x90  |
| `weapon/charm.csv`            | 魅力               | このリストのみ（0〜9）   | u16 LE。個数 u16 と組で 4 B  | `FFFF`       | [weapon-record](../chunks/weapon-record/README.md) +0x1E  |
| `weapon/complete.csv`         | 完成武器（2〜116） | このリストのみ           | u16 LE                       | `FFFF`＝自作 | [weapon-record](../chunks/weapon-record/README.md) +0x00  |
| `item/item.csv`               | 通常アイテム       | アイテム                 | u16 LE                       | `FFFF`       | [items](../chunks/items/README.md)                        |
| `item/valuable.csv`           | 貴重品             | アイテム                 | u16 LE                       | `FFFF`       | [items](../chunks/items/README.md)                        |
| `accessory/accessory.csv`     | 装飾品（0〜157）   | このリストのみ           | 所持フラグの添字（u8 × 158） |              | [accessories](../chunks/accessories/README.md)            |
| `appearance/cloth.csv`        | 容姿の服（0〜241） | このリストのみ           | ビット番号（`0x3AB5C` から） |              | [appearance](../chunks/appearance/README.md)              |
| `appearance/person.csv`       | 人物（容姿）       | このリストのみ（0〜245） | u16 LE                       | `FFFF`       | [appearance](../chunks/appearance/README.md) `0x3AAD4`    |
| `appearance/face.csv`         | 顔（0〜47）        | このリストのみ           | u16 LE                       | `FFFF`       | [appearance](../chunks/appearance/README.md) `0x3AAFC`    |
| `appearance/hair.csv`         | 髪型（0〜46）      | このリストのみ           | u16 LE                       | `FFFF`       | [appearance](../chunks/appearance/README.md) `0x3AB08`    |
| `appearance/upper.csv`        | 上半身（0〜146）   | このリストのみ           | u16 LE                       | `FFFF`       | [appearance](../chunks/appearance/README.md) `0x3AAE4`    |
| `appearance/lower.csv`        | 下半身（0〜171）   | このリストのみ           | u16 LE                       | `FFFF`       | [appearance](../chunks/appearance/README.md) `0x3AAF0`    |
| `appearance/feet.csv`         | 足元（0〜67）      | このリストのみ           | u16 LE                       | `FFFF`       | [appearance](../chunks/appearance/README.md) `0x3AB20`    |
| `appearance/body.csv`         | 部品 k＝4（0〜14。種類は ❓） | このリストのみ   | u16 LE                       | `FFFF`       | [appearance](../chunks/appearance/README.md) `0x3AB14`    |
| `appearance/extra.csv`        | 手甲・脚絆・前掛け・合羽（0〜53） | このリストのみ | u16 LE                   | `FFFF`       | [appearance](../chunks/appearance/README.md) `0x3AB2C`〜 |
| `unlock/unlock.csv`           | 特典解除（0〜105） | このリストのみ           | 先頭16件・31・101 ✅ [U]／ほか 🔶 U-17 |       | [unlocks](../chunks/unlocks/README.md)                    |
| `event/event.csv`             | イベント           | このリストのみ（添字）   | 配列の添字（u8 × 件数）      |              | [event-chart](../chunks/event-chart/README.md)            |
| `event/chart-node.csv`        | イベントチャートのノード（0〜118） | このリストのみ | u16 LE                   |              | [hint](../chunks/hint/README.md) 0x3900                   |
| `event/chart-cell.csv`        | イベントチャートの升（枠と線、335件） | このリストのみ | セーブにない（チャートの並び） |        | [event-chart](../chunks/event-chart/README.md)            |
| `place/start-location.csv`    | 開始地点（現在地） | このリストのみ           | u8                           |              | [date-location](../chunks/date-location/README.md) 0x0013 |
| `place/night-visit-place.csv` | 夜の約束の場所     | このリストのみ           | u16 LE                       |              | [night-visit](../chunks/night-visit/README.md) +0x08      |
| `place/night-visit-layout.csv` | 夜の約束の配置（0〜61） | このリストのみ        | u16 LE                       |              | [night-visit](../chunks/night-visit/README.md) +0x0A      |
| `place/night-visit-row.csv`   | 夜の約束の組（0〜74） | このリストのみ        | 約束の枠の +0x00〜+0x1B（28 B） |           | [night-visit](../chunks/night-visit/README.md) +0x00〜+0x1B |
| `npc/night-visit-partner.csv` | 約束できる相手の種類 | 町の人の種類（0〜796）のうち約束できるもの | u32 LE        | `FFFFFFFF`＝約束なし | [night-visit](../chunks/night-visit/README.md) +0x04 |
| `npc/npc-look.csv`            | 人物の見た目と声（1〜245） | 人物（容姿）と同じ番号 | u32 LE                 | `FFFFFFFF`＝約束なし | [night-visit](../chunks/night-visit/README.md) +0x20 |
| `occupation/occupation.csv`   | なりわい（3〜212） | このリストのみ（0〜255） | 状態の表の添字・u16 LE       |              | [occupation](../chunks/occupation/README.md)              |
| `npc/npc-name.csv`            | 人物の名前         | このリストのみ（1〜8200）| u32 LE                       |              | [night-visit](../chunks/night-visit/README.md) +0x1C・記録 +0x04 |
| `sect/sect.csv`               | 流派（0〜112）     | このリストのみ           | i16 LE                       |              | [styles](../chunks/styles/README.md)、[sect-scrolls](../chunks/sect-scrolls/README.md) |
| `sect/stance.csv`             | 構え（0〜12）      | このリストのみ           | i16 LE                       |              | [skill-states](../chunks/skill-states/README.md)          |
| `sect/skill-sheet.csv`        | 技の表（0〜93）    | このリストのみ           | i16 LE                       | `FFFF`       | [styles](../chunks/styles/README.md) +0x08〜+0x0C         |
| `sect/sheet-skill.csv`        | 技の表ごとの技     | 技の表 × 128＋技の番号   | 状態の表の添字（u8 × 128）   |              | [skill-states](../chunks/skill-states/README.md)          |
| `sect/skill.csv`              | 技（0〜961）       | このリストのみ           | u16 LE                       |              | [belt-copy](../chunks/belt-copy/README.md) 技の +2、[skill-kills](../chunks/skill-kills/README.md) +0 |
| `sect/stance-skill.csv`       | 構えごとの技       | 構え × 128＋技の番号     | 状態の表の添字・u8           |              | [skill-states](../chunks/skill-states/README.md)、[belt-copy](../chunks/belt-copy/README.md) |

リスト固有の列：

- `weapon/blade.csv` の `sheath_x`：その刃を組み立てたときに書かれる鞘の ID（X、[weapon-record](../chunks/weapon-record/README.md) +0x0A）🟢。見た目の鞘が同じ武器どうしは同じ値になる
- `weapon/blade.csv`・`guard.csv`・`grip.csv` の `save_bytes_le`：[TS] の定義値、または実セーブでゲーム内の表示を確かめたバイト列（刃・鍔は 3 B、柄は 2 B）。
  エディタはこの値をそのまま書く。空欄の行は ID だけが分かっている行で、ID（と刃は `sheath_x`）から書く値を組み立てる（[weapon-record](../chunks/weapon-record/README.md) のパーツ、U-3）
- `weapon/complete.csv` の `reading`：名前の読み（ひらがな）。武器の名前を五十音順に並べるのに使う（刃の読みは 🟢 に合わせた。ユーザー判断 2026-10-07）。特殊武器は ID 順に並べるので空欄
- `weapon/complete.csv` の `blade`・`sheath_x`・`guard`・`grip`：その完成武器の部品の ID 🟢。特殊武器は `blade` が特殊武器の刃の ID（`weapon/blade-special.csv`）で、ほかは空欄。
  `weapon_type` はその完成武器の武器種（[weapon-record](../chunks/weapon-record/README.md) +0x18。0＝刀 1＝槍 2＝爪 3＝拳銃 4＝ライフル）🟢
- `weapon/complete.csv` の `unique_bytes`・`name_no`・`flag_22`：その完成武器のレコードに入る値 🟢。[weapon-record](../chunks/weapon-record/README.md) の
  +0x0A〜+0x0F（固有武器の6バイト。空欄は `FF` × 6）、+0x6C（名前の番号。特殊武器は +0x1A にも入る）、+0x1C（列の名前の 22 は [TS] の配置での位置）
- `weapon/blade-special.csv`・`weapon/complete.csv` の `name_en`：英語版のゲーム内の表記 🟢
- `place/night-visit-place.csv` の `name_ja`：約束の画面に出る場所の名前（✅ [U]）。
  `layout`：その場所で正しく表示される「人と布団の配置」（約束の枠 +0x0A）。実データで見た組と 🟢 の組を書く。複数あるときは `;` で区切る。どれが実データで見た組かは `備考` に書く。
  🟢 の組は町の人の約束と特別な相手（さよ・先生・ローラ・メリンダ・三姉妹など）の約束で使われる組（全72組）。実データで見た組はすべてこの中にある
- `event/event.csv` の `name_en`：英語版のゲーム内の表記
- `occupation/occupation.csv`：ID 3〜212 の全170件（欠番あり）、全行 🟢。`name_ja`・`name_en`・`client_ja`（依頼主）はゲーム内の表記。`type` は種類（討伐・破壊・配達・伝言・説得・説得・盗み）、`alignment` は善良・悪質（空欄はどちらでもない）、`reward` は成功報酬（文）、`bonus` は1人・1つあたりの追加報酬（文）、`deadline_days` は期限の日数（空欄は期限なし）
- `event/chart-node.csv`：全行 🟢。`name_ja`・`name_en` はチャートの枠に出る名前で、同じイベントの別の枠は名前が違うことがある（39 町の薬師＝小公女倒れる、30 闇討ち ～小暮捜索）。
  `event_id` はそのノードのイベントの通し番号（`event/event.csv` の ID）。イベントに当たらないノードは空欄
  `phase` はそのノードの段階（[date-location](../chunks/date-location/README.md) の `0x0010` と同じ値。段階のないノードは空欄）、
  `route` はチャートの行の種類（`prajna` 攘夷・`shogunate` 幕府・`foreigners` 外国・`other` 共通・無所属・`best` 真ルート・`tutorial` チャートに出ないノード）
- `event/chart-cell.csv`：イベントチャートの升の並び。全行 🟢。ID は升の順（上の行から、行の中は左から）。`col`・`row` は格子の位置（列 0〜46・行 0〜10。枠は偶数の列）。
  `type` は `frame`（枠）か `line`（線）。`node` は枠のノード番号（`event/chart-node.csv`）。`shape` は線の形（左・右・上・下のどちらへ伸びるか。1 ─、2 ┼、3 ┬、4 ┴、5 ┤、6 ├、7 ┘、8 ┐、9 ┌、10 └、11 │）。
  `備考` が「短い横線」の線は、枠の列にある横線。`hidden` は 1 が真ルートの升（ふだんは出ない）、2 が真ルートへの分かれ目の線、0 が通常。出し方は [event-chart](../chunks/event-chart/README.md)
- `item/item.csv`：ID 0x00〜0xF1 の全242件（欠番なし）と 0xFFFF。`name_ja`・`name_en`・`description_ja`・`description_en` はゲーム内の表記のまま 🟢
  （同じ名前が複数の ID にあるもの（部品箱・茶器・伝説の魚・熱燗など）も表記のまま。ゲーム内で見分けた違いは `備考` に書く）。
  `reading` は読み（ひらがな）で、ゲーム内の表記のまま 🟢（0x00・0xE7 は仮の値だったので空欄。`備考` 参照）。
  `kind` は種別 🟢：0＝道具、1＝料理（料理屋でその場で食べる）、2＝宿（梅・竹・松の間、入院）、3＝なし（手に入る経路がない。未使用とみられる）。
  `max_stack` は手持ちの1枠にまとめて持てる最大数 🟢（ほとんど 1。がらくた 10、お宝 5、鉄 999、コイン 9999、エサ 10、宿 0）。
  箪笥の枠はこの数を超えて入る（[U] sample）
- `sect/sect.csv`：流派（全 110 件）🟢。`name_ja`・`name_en` はゲーム内の表記（「……」は主人公が手に入れられない流派。英語版で仮の名前の行は空欄）。
  `stance` は構え（`sect/stance.csv`）、`slot` は構えの組（[styles](../chunks/styles/README.md) `0x18A00 + 2×slot`）、`sheet1`〜`sheet3` は技の表（`sect/skill-sheet.csv`。空欄はなし）、
  `thr1`〜`thr4` は弐段〜伍段になる修練度、`scroll_no` は流派の書の番号（[sect-scrolls](../chunks/sect-scrolls/README.md) +0x00。空欄は書がない）
- `sect/stance.csv`：構え 0〜12 🟢。`slot` は構えの組（0 刀・1 槍・2 無手・3 拳銃・4 ライフル・5 二刀）
- `sect/skill-sheet.csv`：技の表 🟢（84・85 は欠番）。`stance` は構え、`skill_count` は技の数。`name_ja`・`name_en` は技の表の名前で、番号との対応は 🔶（使う流派の名前と一致する）
- `sect/sheet-skill.csv`：技の表ごとの技 🟢。ID は「技の表 × 128 ＋ 技の番号」。`skill_no` は構えの中の技の番号（状態の表の添字）、`skill_id` は技の ID（[skill-kills](../chunks/skill-kills/README.md)・[belt-copy](../chunks/belt-copy/README.md) の技の ID）。
  名前が空欄の技は名前のない技（ゲームでは「……」）。`cond` は習得条件の番号（0＝流派を装備したときに覚える基本の技）、`cond_ja` はゲーム内の技の表に出る条件の文、
  `rank` は必要な段（0＝初段 … 4＝伍段、−1＝なし）、`points` は覚えたときに増える腕前点、`parent` は派生元の技の番号
- `sect/skill.csv`：技 🟢（ID は技の ID。`sheet-skill.csv`・`stance-skill.csv` の `skill_id`）。`command` はコマンドの値（0＝なし。防御技はすべて 0）、
  `command_ja` はその表記（弱＝弱攻撃、強＝強攻撃、ガード、→ は相手の方、← は相手と逆、←→ は左右に入れる、ジャンプ中強は 🔶。ゲームの画面ではキー設定のキーの絵で出る）、
  `defense_group` は防御技の組（空欄は攻撃技。同じ組の防御技は俺流の 1 つの構えに 1 つまで）、`attack` は技の詳細に出る攻撃力（「攻：」）、`points` は腕前点、
  `attrs` は技の属性（浮かせる・吹き飛ばす・投げ・当て身投げ・防御不可能・打撃投げ・防御崩し・攻撃を受けてものけぞらない・特定の武器でしか使えない。`・` 区切り）
- `sect/stance-skill.csv`：構えごとの全技 🟢（技の表にない技も含む）。ID は「構え × 128 ＋ 技の番号」。`first` は 1＝初段の技（構えから最初に出せる技）、
  `next` は続けて出せる技の番号、`prev` はこの技の前に出す技の番号（どちらも空白区切り）。俺流の技の表の技はこの表から作る
- `appearance/cloth.csv`：容姿設定の服の番号。0〜241 のうち194件（欠番は服がない番号）。全行 🟢（32〜46・238〜241 はゲーム内で確認 ✅）。
  `name_ja`・`name_en` はその番号に入る部品の名前（ゲーム内の表記のまま、複数あるときは ` / ` で区切る）。`category` は部品の種類（上半身・下半身・足元・小物。小物は合羽・手甲・脚絆・前掛け）。
  `description_ja`・`description_en` は部品の説明 🟢。複数部品で同じ説明は1回だけ載せ、異なる説明は部品の順に ` / ` で区切る。番号240はセットの表示名「さよ」と説明「白地に藍色のかつての少女を思い出させる色合い。」を使う（✅ 表示名・説明 [U]、🟢 番号との対応）。
  `dlc` は DLC の番号（1＝新撰組、2＝ドナドナ・さよ）。特典解除で手に入る服はこの表にない（`unlock/unlock.csv`）
- `appearance/outfit.csv`：全身の服の表示名・説明22件 🟢。`id_dec` は全身の番号で、服の解放ビット番号ではない。`cloth_id` は服の解放番号（さよ：全身245 → 服240）、`unlock_id` は特典番号（まだら：全身53 → 特典80）。特典番号と保存位置の対応は 🔶 U-17 のまま。
  全身の表示名・説明がある服では、それを部品名・部品の説明より優先する。1つの特典に複数の全身衣装がある場合は ` / ` で並べる。特典解除ページは特典の名前・効果を引き続き表示し、容姿ページは衣装の名前・説明を表示する。
- `appearance/person.csv`：主人公設定で選べる人物（容姿）の88件と、出ない見た目の組3件 🟢。ID は人物の番号（セーブの `0x3AAD4`）で、連番ではない。`height` はその人物の身長（cm、ふつうのとき）。
  `upper`・`lower`・`face`・`hair`・`body`（部品 k＝4）・`feet`・`gauntlet`（手甲）・`leggings`（脚絆）・`apron`（前掛け）・`cape`（合羽）はその人物の部品の番号（各部品の CSV の ID。空欄はなし）。
  `body_kind` は体の種類（`0x3AADC` の 0＝男、1＝女、2＝ローラ、3＝子供）、`second_id` は `0x3AAD6` に入るとみられる値（空欄＝`FFFF`）🔶、`hair_color` はその人物の髪の色（`0x3AADA`）。
  `selectable` は 1＝主人公設定の一覧に出る人物（88件。全部出るかは 🔶）、0＝出ない見た目の組（ローラ・男の子・女の子 ✅ [U]。エディタでは別の組に分けて出し、どのモードでも選べる）。
  主人公3人の行は、ゲームで選んで保存した値に合わせてある（青年・壮年 ✅ [U]、若年 🔶）
- `appearance/face.csv`・`hair.csv`・`upper.csv`・`lower.csv`・`body.csv`・`feet.csv`・`extra.csv`：主人公の見た目の部品。全行 🟢（`body.csv` は手。名前はない）。番号は部品の種類ごとに別の空間。
  `gender` は使える性別（男・女。空欄は指定なし。服・小物は男用と女用で別の番号になる）。元の値は性別のビット（1＝男、2＝女）とほかのビット（上半身・下半身は服の系統 🔶、小物は種類）の組で、この列は性別のビットだけ。ローラ・子供・動物の部品は指定なしで、子供・ローラ用の値はない 🟢。`unlock_id` は解除に必要な特典（`unlock/unlock.csv` の ID。空欄は不要）、`dlc` は DLC の番号、
  `cloth_id` は服の番号（`appearance/cloth.csv`。容姿のビット）。`extra.csv` の `kind` は手甲・脚絆・前掛け・合羽 🟢（✅ [U] 2026-10-08）。
  `save_models` はその部品のモデルの値（u16 LE × 4、`FF FF`＝なし）で、部品の組の +4〜+B に部品の番号と組で書く値 🟢。
  値はテクスチャの番号で、層の形（メッシュ）は部品の番号で決まる（✅ [U] 2026-10-08：形はそのまま、別の部品の値でテクスチャだけが替わった）。
  `layer_meshes` は層1〜4のメッシュの名前（「部位（持ち主）」。`|` 区切り、空欄＝その層なし）🟢。持ち主の名前は区別のために付けた呼び名で、「男2」のような番号付きもある。
  `layer_textures` は層1〜4で選べるテクスチャの番号（色違いの順に空白区切り、`|` 区切り、空欄＝その層なし）🟢。`save_models` の値はどれもこの中にある。
  この2列は表から作る列で、手では直さない。
  `alias_ja` は名前のない部品と、同じ名前の色違いの部品の見た目（ゲーム内で確認 ✅ [U]、選べる人物の部品 🟢、推定 🔶。確度は `備考`）。手で足した列なので、表を作り直すときも残す。
  `crash` は 1＝ロードでクラッシュする部品（✅ [U]）。
  名前のない部品は、特典の服の部品か、主人公設定に出ない部品（`備考`）。髪型の `cloth_id`（99〜125）は `cloth.csv` にない番号で、服のビット列で解放する（112〜119 は ✅ [U]）
- `unlock/unlock.csv`：特典解除の一覧の106件。先頭16件の番号とゲーム内表示、31（J.J. の顔）の解除前後の差分、101（ライフルの免許）への2の書き込みの反映は ✅ [U]、ほかの対応は 🔶 U-17。`name_*`（名前）・`condition_*`（解除の条件）・`effect_*`（解除で何ができるか）はゲーム内の表記のまま 🟢。
  `category` は名前から付けた分類（武器箪笥・難易度・肌の色・髪の色・体型・顔・髪型・服・装飾品・免許・その他）。
  この番号がセーブの状態の表の添字と同じかは、先頭16件・31・101以外は未確認（`備考` が 🔶、U-17）。85〜99・105 は装飾品の特典で、装飾品の ID（`accessory/accessory.csv`）とは別の番号
- `accessory/accessory.csv`：ID 0〜157 の全158件（欠番なし）。全行 🟢。`name_ja`・`name_en`・`description_ja`・`description_en` はゲーム内の表記のまま。
  `part` は付ける場所（head＝頭、chest＝胸・背中、main＝腰、r_shoulder＝手・肩）。`dlc` は DLC の番号（空欄＝本編、0＝龍馬の脇差、1＝新撰組（近藤・土方）、2＝ドナドナ・さよ）。
  `shop` は 1＝店で買える、0＝買えない（DLC か、特典の解除で手に入る物）。`menu_order` はゲーム内の一覧の並び順 🔶（0〜158、122 が欠番）。
  ID と一覧の並び順は一致しない（ID 0 は新撰組の鉢金）
- `npc/npc-name.csv`：全行 🟢。`sex` は m＝男、f＝女。`group` は unique＝固有の名前（1〜215）、placeholder＝勢力ごとの仮の名前（1001〜6002）、
  town＝町の人の名前の候補（7001〜7150・8001〜8200）。約束の相手の町の人の名前は town のうち、相手の性別（`sex`）が同じものから選ばれる 🟢。
  7000 台は日本人（女性 7001〜7100、男性 7101〜7150）、8000 台は外国人（女性 8001〜8104、男性 8105〜8200）
- `place/night-visit-layout.csv`：全行 🟢。配置ごとの夜這いの場の中身。`house` は家の種類（家の人の見た目の組：町人の家・外国人の家・般若党の家・侍の家）、
  `people` はいつもいる家の人、`people_maybe` は確率で出る家の人の数（確率は `name_ja`）、`dog` は犬の数、`futon` は布団の枚数（12 枚まで。相手のほかの布団には寝ている人がいる）、
  `rival` はライバルが出る確率（%、空欄は出ない）、`doshin`・`okappiki` は夜這いに失敗したときに出てくる同心・岡っ引きの数。`name_ja` は家の種類と人数の表記。
  家の中の人は配置だけで決まり、場所・相手の種類・勢力・治安では変わらない。
  人数が同じ配置でも、人と布団の座標は配置ごとに違い、場所（マップ）と合う配置は `night-visit-place.csv` の `layout` 列のものだけ
- `place/night-visit-row.csv`：全行 🟢。約束すると、この表の1行（28 B、`save_bytes_le`）が約束の枠の +0x00〜+0x1B に写され、+0x04 だけが相手の種類で上書きされる。
  `stage` は段階（空欄＝特別な相手）、`group` はまとまり（0＝特別な相手、1・2＝町の人。3 の行を選ぶ相手はいない）、`partner` は特別な相手の番号（`name_ja` がその相手）、
  `place`・`layout` は場所と配置（`night-visit-place.csv`）。`備考` の「確かめた組」は実データか書き込みでゲームの反映を確かめた組
- `npc/night-visit-partner.csv`：約束できる相手の種類（約束の枠の +0x04 の値）。`kind` は special＝名前のある相手（値はすべて決まっている）、town＝町の人。
  `sex` は相手の性別、`name_list` は町の人の名前の候補（7＝7000 台、8＝8000 台。どちらも `sex` が同じ名前から選ばれる）、`name` は名前のある相手の名前の ID。
  `looks` は見た目の候補（`;` 区切り。名前のある相手は1つ）、`age` は年齢（255＝「？」）。`age_random` が 1 なら、`age` の十の位はそのままで一の位を 0〜9 から選ぶ。
  `blood` は血液型（0＝1〜4 から選ぶ）、`group` は町の人が使う `night-visit-row.csv` のまとまり、`row` は名前のある相手が使う行。
  `status` は 🟢 か、ゲームの反映を確かめたもの（✅ 実データ＝ゲームが作った約束を見た、✅ 書き込みで確認＝この表の値を書いて夜這いできた）。
  町の人は、女児・男児（「惚れた」の会話がない）と、約束すると枠が壊れる坂本を入れていない
- `npc/npc-look.csv`：全行 🟢。町の人の種類が使う見た目（モデル）と声の222件。番号は `appearance/person.csv`（人物）と同じで、`person` が 1 の行は人物の表にもある（`name_ja` は人物の名前）。
  `person` が 0 の行の `name_ja` は、その見た目を使う町の人の種類の名前。`used_by` はその見た目を使う町の人の種類（`・` 区切り）、`sex` は見た目の性別
- `place/start-location.csv`：開始地点（現在地、位置 0x13 の u8）。`crash` は 1＝クラッシュが報告されている値（選択肢に出さない）。
  `warning_ja` は選べるが注意が必要な値の注意書き（画面にそのまま出す）。0xC5 以降は未調査で表にない
- `source`（パーツ・銘・魅力・完成武器・アイテム）：出典。`CT`＝Cheat Engine テーブル、`TS`＝[TS] の定義、`U`＝ユーザーのゲーム内確認、`SE-BBS`＝PS3版の掲示板。複数あるときは `;` で区切る

## 2. CSV の列

`TEMPLATE.csv` の見出し行をそのまま使う。1行＝1つのID。ID の昇順に並べる。

| 列              | 内容                                                                                  |
| --------------- | ------------------------------------------------------------------------------------- |
| `id_dec`        | ID（10進）                                                                            |
| `id_hex`        | ID（`0x` 付きの16進）                                                                 |
| `save_bytes_le` | セーブに書かれるバイト列（空白区切り、例：`6A 01 00`）。ID と1対1で自明なら空欄でよい |
| `name_ja`       | 日本語名                                                                              |
| `name_en`       | 英語名（刃・鍔・柄・銘・魅力は [CT] の表記のまま）                                    |
| `備考`          | 確定でない場合の確度と理由、U-n、同じIDに別の名前がある場合など                       |

- 行は確定（✅）として扱う。確定でないものだけ、`備考` の先頭に確度の記号（🟢🟡🔶❓、`../README.md` §1.1）を書き、続けて何が怪しいかを書く
  - コードに取り込むときは、`備考` の先頭の記号で確定かどうかを判定する。🟢 は確定と同じに扱う
- 刃・鍔・柄・魅力・銘の ID と名前、刃の `sheath_x`、完成武器の ID と名前は、全行 🟢 で裏付けてある。`source` が `CT` だけの行も同じ。行ごとの 🟢 は、`source` と食い違った点や `source` にない値がある行だけに書く
- `item/item.csv` の `source` に `U` を含む行は、重要品の空き枠に ID を順に入れ、ゲーム内の一覧の並び順で名前を対応づけたもの。
  対応づけが1つずれていた回があり（[items](../chunks/items/README.md) の調査記録）、ほかの回も同じようにずれている可能性がある 🔶
- 日本語名が「推定」のものは、裏取りなしに備考の記号を外さない
- 値に半角カンマを含めるときは `"..."` で囲む
- リスト固有の列が必要なら、末尾（`備考` の前）に足し、§1 にその列の意味を書く

## 3. ID空間

### 3.1 通常パーツ（0〜362）

刃・鞘・鍔・柄は共通のID空間 🟢。1つの ID は刃・鞘・鍔・柄のどれか1つだけを表す。

| 種別 | 件数 | リスト                                                         |
| ---- | ---- | -------------------------------------------------------------- |
| 刃   | 103  | `weapon/blade.csv`                                             |
| 鍔   | 60   | `weapon/guard.csv`                                             |
| 柄   | 95   | `weapon/grip.csv`                                              |
| 鞘   | 94   | リストなし。刃ごとの値は `weapon/blade.csv` の `sheath_x`       |

- 鞘の ID：24, 26, 38〜42, 45, 46, 48, 52, 57, 83〜105, 155, 158, 162, 164, 167, 168, 171〜216, 313, 326, 344, 353〜355, 359 🟢。
  どの刃にも使われない鞘（41, 42 など）もある
- 爪・拳銃・ライフルの部品はこの空間にない（刃は §3.2 の特殊武器の刃）
- 刃 0・3・43・44、鍔 2・5・157、柄 1・4・51・156 は名前のない試作用らしい部品なので、リストに載せない（ユーザー判断 2026-10-07）。どの完成武器にも使われていない 🟢
- 銘（`weapon/title.csv`）は別のフィールドに書く別の値。銘の u16（362〜381）は鍔 362 と同じ数になるが、重ならない 🟢

並びの規則（同じ武器セットの鍔と柄は隣り合うことが多い。刀は「柄, 鍔」の順で柄 = 鍔 − 1、槍は「鍔, 柄」の順で柄 = 鍔 + 1）：

| ブロック         | 刃ID       | 鍔・柄の規則                                                                                              |
| ---------------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| A: 基本セット    | 6〜11      | 柄 = 2×刃、鍔 = 2×刃 + 1（12〜23）                                                                        |
| B: 固有3点セット | 25〜37     | 刀：刃, 柄, 鍔 が連番（29/30/31 など）。槍：刃, 鞘, 鍔, 柄（25/26/27/28）                                 |
| C                | 47〜59     | 47/48/49/50（槍の刃・鞘・鍔・柄）、53/54（ハルユキの柄・鍔）、56/57/58/59（美帝骨の刃・鞘・柄・鍔）       |
| D: 通常武器      | 55, 60〜82 | 柄 = 2×刃 − 12、鍔 = 柄 + 1（108〜153）。55のみ 106/107。鞘は 83〜105                                    |
| E                | 154〜170   | 154→165/166、160/161（クルセイダーの柄・鍔）、163→217、169→231/338、170→246                               |
| F: 色違い・後期  | 265〜311   | 柄 = 刃 − 47（265〜277）、刃 − 46（278〜291）、刃 − 45（292〜）。柄は217〜264に並ぶ。鍔は一部のみ330〜342。鞘は 171〜216 |
| G                | 312〜362   | 318/319/320、327/328/329、343/345/346、347〜352、360/361/362                                              |

- ID 265〜310 には「色違い版」の刃が、基本版（6〜11, 25〜35, 55〜82）と同じ順番で並ぶ（例：274 鮫肌九←60 鮫肌丸、298 柾重←79 村柾）
- 完成武器は同名パーツ3種で構成されるとは限らない（例：正道刀は中道刀の鍔を使う）。完成武器ごとの部品は `weapon/complete.csv`

### 3.2 特殊武器の刃（0x00〜0x0B）

ジャクリーン・十手・出刃包丁などの刃。保存時は ID の u16 の直後（鞘 X）が `FF FF` になり、通常パーツと区別できる ✅ [TS][I-3]。
0x00〜0x0B の12件ですべて（ユーザー判断 2026-10-05）。

### 3.3 アイテム

`item/item.csv` と `item/valuable.csv` は同じ ID 空間 🟢（`item.csv` は貴重品の ID も含む全件。`valuable.csv` は重要品の画面で扱う ID の一覧）。
0x73・0x75〜0xC3 は 0x1C の茶器の複製で、手に入る経路がない 🟢。

### 3.4 そのほか

魅力・完成武器・イベント・開始地点・夜の約束の場所・なりわいは、それぞれ独立した空間。
