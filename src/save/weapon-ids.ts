// 武器の ID 表。docs/wos4_id_table.csv から生成した（2026-10-05）。表を直したら作り直す。
//
// source の意味：
//   'ts'：[TS] の定義値（✅ [TS][I-3]。U-3 案A：この値のまま書けば正しく動く）、または実セーブのバイト列をゲーム内の表示で確認した値（✅ [U]）。
//         value は刃・鍔が 3 B、柄が 2 B を LE で読んだ値
//   'ct'：Cheat Engine テーブル [CT] の ID（u16）だけが分かっているもの。ユーザー判断で確定扱い（2026-10-05。ゲーム内では未確認）。
//         value は ID。刃は X（§5.5）を 🔶 規則で計算して書く（U-3 案C、ユーザー判断 2026-10-05）。規則外の刃は x が null で、
//         ID だけを書き X は元の値のまま残す（U-3 案B。ゲーム内で分解→組み立てると正しい X になるので、それで X を調べる。ユーザー判断 2026-10-05）
// 確定済みの値と ID が重なる行は「AAA（BBB？）」と表示し、ユーザーのゲーム内確認を待つ（ユーザー判断 2026-10-05）。
// U-13 は案A（CT の刃 305〜316 は +1 ずれている）で決着した（ユーザー判断 2026-10-05）。CSV の ID は −1 した値
// 正道刀の鍔（[TS] の定義値 0xAC0109）は作者が異常値と注記しており I-3 の対象外なので載せない。

export type IdOption = { id: number; label: string }

export type PartOption = {
  source: 'ts' | 'ct'
  value: number
  label: string
  /**
   * 刃だけ：X（鞘の ID、u16）。
   * 'ct' は 🔶 規則で計算した X、または ✅ 実セーブで確かめた X。null は規則外で X 不明（ID だけ書く。U-3 案B）。
   * 'ts' は鞘が 0x100 以上のときだけ持つ（3 B 値には X の下位バイトしかない）。ないときは X ＝ 3 B 値の3バイト目
   */
  x?: number | null
  /** x が、規則を確かめた範囲（0x3F〜0x51、0x109〜0x134）の外に規則を延ばして計算した値（ユーザー判断 2026-10-05、ゲーム内で確認待ち） */
  xExtended?: boolean
}

/** 刃（+0x08〜）。ts は 3 B（3バイト目は 🔶 X の下位バイト）、ct は ID（u16）＋規則で計算した X（u16） */
export const BLADES: readonly PartOption[] = [
  { source: 'ts', value: 0x180006, label: '中道刀' },
  { source: 'ts', value: 0xa20007, label: '数寄者' }, // D-13
  { source: 'ts', value: 0x2d0008, label: '徳母里' },
  { source: 'ts', value: 0x2e0009, label: '与根助' }, // D-13
  { source: 'ts', value: 0xa7000a, label: '絶天' },
  { source: 'ts', value: 0xa4000b, label: '一発丸' },
  { source: 'ts', value: 0x1a0019, label: '黒獅子' },
  { source: 'ts', value: 0x26001d, label: '天井割' },
  { source: 'ts', value: 0x270020, label: '寂蓮' },
  { source: 'ts', value: 0x280023, label: '曼珠沙華' },
  { source: 'ts', value: 0x30002f, label: '風花' },
  { source: 'ts', value: 0xa80037, label: '貫誠' }, // U-3 [U] 分解→組み立て後の実セーブ（sample/S4-DATA_01）
  { source: 'ts', value: 0x390038, label: '美帝骨' }, // U-3 [U] 分解→組み立て後の実セーブ（sample/S4-DATA_01）
  { source: 'ts', value: 0x53003c, label: '鮫肌丸' }, // U-3 [U] 分解→組み立て後の実セーブ（sample/S4-DATA_01）
  { source: 'ts', value: 0x54003d, label: '大黒生' }, // U-3 [U] 分解→組み立て後の実セーブ（sample/S4-DATA_01）
  { source: 'ts', value: 0x55003e, label: '微熱' }, // U-3 [U] 分解→組み立て後の実セーブ（sample/S4-DATA_01）
  { source: 'ts', value: 0x56003f, label: '竹刀' },
  { source: 'ct', value: 0x40, label: '龍魔治', x: 0x57 },
  { source: 'ts', value: 0x580041, label: '精霊舞' },
  { source: 'ts', value: 0x590042, label: '炎天過' },
  { source: 'ts', value: 0x5a0043, label: '氷天過' },
  { source: 'ts', value: 0x5b0044, label: 'ジョゼフィーヌ' },
  { source: 'ts', value: 0x5c0045, label: '一文字' },
  { source: 'ts', value: 0x5d0046, label: '阿摩羅' },
  { source: 'ts', value: 0x5e0047, label: 'センチュリオン' },
  { source: 'ts', value: 0x5f0048, label: '闇緊' },
  { source: 'ts', value: 0x600049, label: '浅餓王' },
  { source: 'ct', value: 0x4a, label: '斬鬼丸', x: 0x61 },
  { source: 'ct', value: 0x4b, label: '馬通一', x: 0x62 },
  { source: 'ts', value: 0x63004c, label: '阿修羅' },
  { source: 'ct', value: 0x4d, label: '凍雲小太刀', x: 0x64 },
  { source: 'ct', value: 0x4e, label: '赤マムシ', x: 0x65 },
  { source: 'ct', value: 0x4f, label: '村柾', x: 0x66 },
  { source: 'ts', value: 0x670050, label: '黒蜻蛉' },
  { source: 'ts', value: 0x680051, label: '羅刹' },
  { source: 'ts', value: 0x9e0052, label: '藤奈美' },
  { source: 'ts', value: 0x9b009a, label: '真心' },
  { source: 'ts', value: 0x34009f, label: 'ハルユキ' }, // U-3 [U] 分解→組み立て後の実セーブ（sample/S4-DATA_01）
  { source: 'ts', value: 0xab00a3, label: '空道刀' }, // U-3 [U] 分解→組み立て後の実セーブ（sample/S4-DATA_01）
  { source: 'ts', value: 0x5600a9, label: '虎吉竹刀' }, // U-3 [U] 分解→組み立て後の実セーブ（sample/S4-DATA_01）
  { source: 'ts', value: 0x6200aa, label: '馬通二' },
  { source: 'ts', value: 0xac0109, label: '正道刀' },
  { source: 'ts', value: 0xad010a, label: '天道刀' },
  { source: 'ts', value: 0xae010b, label: '源平' },
  { source: 'ts', value: 0xaf010c, label: '汎来巣' },
  { source: 'ts', value: 0xb0010d, label: '五郎縞' },
  { source: 'ct', value: 0x10e, label: '絶海', x: 0xb1 },
  { source: 'ct', value: 0x10f, label: '奮発丸', x: 0xb2 },
  { source: 'ts', value: 0xb30110, label: '律儀' },
  { source: 'ct', value: 0x111, label: '賢皇骨', x: 0xb4 },
  { source: 'ct', value: 0x112, label: '鮫肌九', x: 0xb5 },
  { source: 'ct', value: 0x113, label: '大樽生', x: 0xb6 },
  { source: 'ts', value: 0xb70114, label: '余熱' },
  { source: 'ct', value: 0x115, label: 'マサトシ', x: 0xb8 },
  { source: 'ct', value: 0x116, label: '真啓通', x: 0xb9 },
  { source: 'ct', value: 0x117, label: '粋逸', x: 0xba },
  { source: 'ct', value: 0x118, label: '断頭', x: 0xbb },
  { source: 'ct', value: 0x119, label: '霊禍', x: 0xbc },
  { source: 'ct', value: 0x11a, label: 'ジョアンナ', x: 0xbd },
  { source: 'ct', value: 0x11b, label: '砕苦論', x: 0xbe },
  { source: 'ct', value: 0x11c, label: '零魂磨', x: 0xbf },
  { source: 'ct', value: 0x11d, label: 'チーフテン', x: 0xc0 },
  { source: 'ct', value: 0x11e, label: '斗壱', x: 0xc1 },
  { source: 'ts', value: 0xc2011f, label: '物干竿' },
  { source: 'ts', value: 0xc30120, label: '日本橋' },
  { source: 'ts', value: 0xc40121, label: '手長' },
  { source: 'ts', value: 0xc50122, label: '幽餓王' },
  { source: 'ts', value: 0xc60123, label: '貪鬼丸' },
  { source: 'ct', value: 0x124, label: '迦楼羅', x: 0xc7 },
  { source: 'ts', value: 0xc80125, label: '猿丸' },
  { source: 'ts', value: 0xc90126, label: '蝉丸' },
  { source: 'ts', value: 0xca0127, label: '小式部' },
  { source: 'ct', value: 0x128, label: '浮雲小太刀', x: 0xcb },
  { source: 'ct', value: 0x129, label: '毒マムシ', x: 0xcc },
  { source: 'ts', value: 0xcd012a, label: '柾重' },
  { source: 'ts', value: 0xce012b, label: '蛇蜻蛉' },
  { source: 'ts', value: 0xcf012c, label: '百代草' },
  { source: 'ts', value: 0xd0012d, label: '不語仙' },
  { source: 'ts', value: 0xd1012e, label: '金盞花' },
  { source: 'ct', value: 0x12f, label: '二心', x: 0xd2 },
  { source: 'ts', value: 0xd30130, label: '富士ヶ根' }, // D-14
  { source: 'ts', value: 0xd40131, label: '大文字' }, // D-14
  { source: 'ts', value: 0xd50132, label: '麒麟児' }, // D-14
  { source: 'ts', value: 0xd60133, label: '焔魔' }, // U-10; U-13
  { source: 'ts', value: 0xd70134, label: '霜柱' }, // D-14
  { source: 'ts', value: 0xd80135, label: '立奈美' }, // U-13
  { source: 'ts', value: 0x260136, label: '見栄春' }, // U-13
  { source: 'ts', value: 0x270137, label: '大天狗' }, // U-13
  { source: 'ts', value: 0x390138, label: 'クルセイダー', x: 0x139 }, // D-14
  { source: 'ts', value: 0x5b013a, label: 'イプスカリバ' }, // U-13
  { source: 'ts', value: 0x18013b, label: 'なまくら刀' }, // D-14
  { source: 'ts', value: 0x28013e, label: '残月' }, // U-3 [U] 分解→組み立て後の実セーブ（sample/S4-DATA_01）
  { source: 'ts', value: 0xab0141, label: '高楊枝' },
  { source: 'ts', value: 0xb00142, label: '無天下' },
  { source: 'ts', value: 0x600143, label: '乃理州' },
  { source: 'ts', value: 0xcb0144, label: '蒼伯' },
  { source: 'ts', value: 0xd50145, label: '霧単穂' },
  { source: 'ts', value: 0x460147, label: '珍比羅', x: 0x146 },
  { source: 'ts', value: 0x580157, label: '陸奥守吉行', x: 0x158 },
  { source: 'ts', value: 0x610164, label: '虎徹', x: 0x161 },
  // X が 0x100 以上で 3 B 値に収まらないので、ID と実測の X を 2 B ずつ書く（U-3 [U] 分解→組み立て後の実セーブ sample/S4-DATA_01）
  { source: 'ct', value: 0x165, label: '和泉守兼定', x: 0x162 },
  { source: 'ct', value: 0x166, label: '活火山', x: 0x163 },
  { source: 'ct', value: 0x168, label: '夜葬', x: 0x167 },
]

/**
 * 槍のパーツの名前（刃・鍔・柄で共通）。ほかの通常パーツは刀。
 * [CT] の英語名が「Spear Blade／Guard／Grip」のもの（ユーザー判断で [CT] を確定扱い 2026-10-05）。
 * 焔魔・霜柱・立奈美の刃と藤奈美（武器種 1）はゲーム内でも槍と確認した（[U] 2026-10-05）
 */
export const SPEAR_PART_NAMES: ReadonlySet<string> = new Set([
  '黒獅子',
  '風花',
  '羅刹',
  '藤奈美',
  '富士ヶ根',
  '大文字',
  '麒麟児',
  '焔魔',
  '霜柱',
  '立奈美',
  '霧単穂',
])

/**
 * パーツの名前の読み（選択肢を五十音順に並べるため。ユーザー判断 2026-10-05）。
 * 駄洒落の元（CSV の備考：半ライス→汎来巣、神経痛→真啓通、弾頭→断頭など）があるものはそれに合わせた。
 * 🔶 推測（ゲーム内・資料で未確認）：不語仙、二心、凍雲小太刀、大樽生、大黒生、徳母里、数寄者、粋逸、精霊舞、蛇蜻蛉、貫誠、零魂磨、鮫肌九、百代草、阿摩羅
 */
export const PART_READINGS: Readonly<Record<string, string>> = {
  イプスカリバ: 'いぷすかりば',
  クルセイダー: 'くるせいだー',
  ジョアンナ: 'じょあんな',
  ジョゼフィーヌ: 'じょぜふぃーぬ',
  センチュリオン: 'せんちゅりおん',
  チーフテン: 'ちーふてん',
  なまくら刀: 'なまくらがたな',
  ハルユキ: 'はるゆき',
  マサトシ: 'まさとし',
  一文字: 'いちもんじ',
  一発丸: 'いっぱつまる',
  不語仙: 'ふごせん',
  与根助: 'よねすけ',
  中道刀: 'ちゅうどうとう',
  乃理州: 'のりす',
  二心: 'ふたごころ',
  五郎縞: 'ごろうじま',
  余熱: 'よねつ',
  凍雲小太刀: 'いてぐもこだち',
  和泉守兼定: 'いずみのかみかねさだ',
  夜葬: 'やそう',
  大天狗: 'だいてんぐ',
  大文字: 'だいもんじ',
  大樽生: 'おおだるなま',
  大黒生: 'だいこくなま',
  天井割: 'てんじょうわり',
  天道刀: 'てんどうとう',
  奮発丸: 'ふんぱつまる',
  寂蓮: 'じゃくれん',
  富士ヶ根: 'ふじがね',
  小式部: 'こしきぶ',
  幽餓王: 'ゆうがおう',
  律儀: 'りちぎ',
  微熱: 'びねつ',
  徳母里: 'とくもり',
  手長: 'てなが',
  数寄者: 'すきしゃ',
  斗壱: 'といち',
  斬鬼丸: 'ざんきまる',
  断頭: 'だんとう',
  日本橋: 'にほんばし',
  曼珠沙華: 'まんじゅしゃげ',
  村柾: 'むらまさ',
  柾重: 'まさしげ',
  正道刀: 'せいどうとう',
  残月: 'ざんげつ',
  毒マムシ: 'どくまむし',
  氷天過: 'ひょうてんか',
  汎来巣: 'はんらいす',
  活火山: 'かっかざん',
  浅餓王: 'あさがおう',
  浮雲小太刀: 'うきぐもこだち',
  源平: 'げんぺい',
  炎天過: 'えんてんか',
  焔魔: 'えんま',
  無天下: 'むてんか',
  物干竿: 'ものほしざお',
  猿丸: 'さるまる',
  珍比羅: 'ちんぴら',
  百代草: 'ももよぐさ',
  真啓通: 'しんけいつう',
  真心: 'まごころ',
  砕苦論: 'さいくろん',
  空道刀: 'くうどうとう',
  立奈美: 'たちなみ',
  竹刀: 'しない',
  粋逸: 'すいいつ',
  精霊舞: 'せいれいまい',
  絶天: 'ぜってん',
  絶海: 'ぜっかい',
  羅刹: 'らせつ',
  美帝骨: 'びていこつ',
  蒼伯: 'そうはく',
  藤奈美: 'ふじなみ',
  虎吉竹刀: 'とらきちしない',
  虎徹: 'こてつ',
  蛇蜻蛉: 'じゃとんぼ',
  蝉丸: 'せみまる',
  見栄春: 'みえはる',
  貪鬼丸: 'どんきまる',
  貫誠: 'かんせい',
  賢皇骨: 'けんこうこつ',
  赤マムシ: 'あかまむし',
  迦楼羅: 'かるら',
  金盞花: 'きんせんか',
  闇緊: 'やみきん',
  阿修羅: 'あしゅら',
  阿摩羅: 'あまら',
  陸奥守吉行: 'むつのかみよしゆき',
  零魂磨: 'れいこんま',
  霊禍: 'れいか',
  霜柱: 'しもばしら',
  霧単穂: 'きりたんぽ',
  風花: 'かざはな',
  馬通一: 'ばついち',
  馬通二: 'ばつに',
  高楊枝: 'たかようじ',
  鮫肌丸: 'さめはだまる',
  鮫肌九: 'さめはだきゅう',
  麒麟児: 'きりんじ',
  黒獅子: 'くろじし',
  黒蜻蛉: 'くろとんぼ',
  龍魔治: 'りうまち',
}

/** 鍔。ts は +0x0B〜+0x0D の 3 B（1バイト目は 🔶 X の上位バイト）、ct は +0x0C〜+0x0D の ID（u16） */
export const GUARDS: readonly PartOption[] = [
  { source: 'ts', value: 0xd00, label: '中道刀' },
  { source: 'ts', value: 0xf00, label: '数寄者' }, // D-13
  { source: 'ts', value: 0x1100, label: '徳母里' },
  { source: 'ts', value: 0x1300, label: '与根助' }, // D-13
  { source: 'ts', value: 0x1500, label: '絶天' },
  { source: 'ts', value: 0x1700, label: '一発丸' },
  { source: 'ts', value: 0x1b00, label: '黒獅子' },
  { source: 'ts', value: 0x1f00, label: '天井割' },
  { source: 'ts', value: 0x2200, label: '寂蓮' },
  { source: 'ts', value: 0x2500, label: '曼珠沙華' },
  { source: 'ts', value: 0x3100, label: '風花' },
  { source: 'ct', value: 0x36, label: 'ハルユキ' },
  { source: 'ct', value: 0x3b, label: '美帝骨' },
  { source: 'ts', value: 0x6b00, label: '貫誠' },
  { source: 'ct', value: 0x6d, label: '鮫肌丸' },
  { source: 'ct', value: 0x6f, label: '大黒生' },
  { source: 'ts', value: 0x7100, label: '微熱' },
  { source: 'ts', value: 0x7300, label: '竹刀' },
  { source: 'ct', value: 0x75, label: '龍魔治' },
  { source: 'ts', value: 0x7700, label: '精霊舞' },
  { source: 'ts', value: 0x7900, label: '炎天過' },
  { source: 'ts', value: 0x7b00, label: '氷天過' },
  { source: 'ts', value: 0x7d00, label: 'ジョゼフィーヌ' },
  { source: 'ts', value: 0x7f00, label: '一文字' },
  { source: 'ts', value: 0x8100, label: '阿摩羅' },
  { source: 'ts', value: 0x8300, label: 'センチュリオン' },
  { source: 'ts', value: 0x8500, label: '闇緊' },
  { source: 'ts', value: 0x8700, label: '浅餓王' },
  { source: 'ts', value: 0x8900, label: '斬鬼丸' }, // D-16
  { source: 'ts', value: 0x8b00, label: '馬通一' },
  { source: 'ts', value: 0x8d00, label: '阿修羅' },
  { source: 'ct', value: 0x8f, label: '凍雲小太刀' },
  { source: 'ct', value: 0x91, label: '赤マムシ' },
  { source: 'ts', value: 0x9300, label: '村柾' },
  { source: 'ts', value: 0x9500, label: '黒蜻蛉' },
  { source: 'ts', value: 0x9700, label: '羅刹' },
  { source: 'ts', value: 0x9900, label: '藤奈美' },
  { source: 'ts', value: 0xa101, label: 'クルセイダー' },
  { source: 'ts', value: 0xa600, label: '真心' },
  { source: 'ts', value: 0x13d00, label: 'なまくら刀' },
  { source: 'ct', value: 0x140, label: '残月' },
  { source: 'ts', value: 0x14801, label: '珍比羅' },
  { source: 'ct', value: 0x14a, label: '砕苦論' },
  { source: 'ct', value: 0x14b, label: '真啓通' },
  { source: 'ct', value: 0x14c, label: 'ジョアンナ' },
  { source: 'ct', value: 0x14d, label: '零魂磨' },
  { source: 'ct', value: 0x14e, label: '絶海' },
  { source: 'ct', value: 0x14f, label: '奮発丸' },
  { source: 'ct', value: 0x150, label: '大樽生' },
  { source: 'ts', value: 0x15100, label: '霜柱' },
  { source: 'ct', value: 0x152, label: '虎吉竹刀' },
  { source: 'ct', value: 0x153, label: '断頭' },
  { source: 'ts', value: 0x15400, label: '霊禍' },
  { source: 'ct', value: 0x155, label: '粋逸' },
  { source: 'ct', value: 0x156, label: '立奈美' },
  { source: 'ts', value: 0x15a01, label: '陸奥守吉行' },
  { source: 'ts', value: 0x15c01, label: '虎徹' },
  { source: 'ct', value: 0x15e, label: '和泉守兼定' },
  { source: 'ct', value: 0x160, label: '活火山' },
  { source: 'ct', value: 0x167, label: '夜葬' },
]

/** 柄（+0x0E〜+0x0F の 2 B）。ts・ct とも ID（u16） */
export const GRIPS: readonly PartOption[] = [
  { source: 'ts', value: 0xc, label: '中道刀' },
  { source: 'ts', value: 0xe, label: '数寄者' }, // D-13
  { source: 'ts', value: 0x10, label: '徳母里' },
  { source: 'ts', value: 0x12, label: '与根助' }, // D-13
  { source: 'ts', value: 0x14, label: '絶天' },
  { source: 'ts', value: 0x16, label: '一発丸' },
  { source: 'ts', value: 0x1c, label: '黒獅子' },
  { source: 'ts', value: 0x1e, label: '天井割' },
  { source: 'ts', value: 0x21, label: '寂蓮' },
  { source: 'ts', value: 0x24, label: '曼珠沙華' },
  { source: 'ts', value: 0x32, label: '風花' },
  { source: 'ct', value: 0x35, label: 'ハルユキ' },
  { source: 'ct', value: 0x3a, label: '美帝骨' },
  { source: 'ct', value: 0x6a, label: '貫誠' },
  { source: 'ct', value: 0x6c, label: '鮫肌丸' },
  { source: 'ct', value: 0x6e, label: '大黒生' },
  { source: 'ct', value: 0x70, label: '微熱' },
  { source: 'ts', value: 0x72, label: '竹刀' },
  { source: 'ct', value: 0x74, label: '龍魔治' },
  { source: 'ts', value: 0x76, label: '精霊舞' },
  { source: 'ts', value: 0x78, label: '炎天過' },
  { source: 'ts', value: 0x7a, label: '氷天過' },
  { source: 'ts', value: 0x7c, label: 'ジョゼフィーヌ' },
  { source: 'ts', value: 0x7e, label: '一文字' },
  { source: 'ts', value: 0x80, label: '阿摩羅' },
  { source: 'ts', value: 0x82, label: 'センチュリオン' },
  { source: 'ts', value: 0x84, label: '闇緊' },
  { source: 'ts', value: 0x86, label: '浅餓王' },
  { source: 'ct', value: 0x88, label: '斬鬼丸' },
  { source: 'ct', value: 0x8a, label: '馬通一' },
  { source: 'ts', value: 0x8c, label: '阿修羅' },
  { source: 'ct', value: 0x8e, label: '凍雲小太刀' },
  { source: 'ct', value: 0x90, label: '赤マムシ' },
  { source: 'ct', value: 0x92, label: '村柾' },
  { source: 'ts', value: 0x94, label: '黒蜻蛉' },
  { source: 'ts', value: 0x96, label: '羅刹' },
  { source: 'ts', value: 0x98, label: '藤奈美' },
  { source: 'ts', value: 0xa0, label: 'クルセイダー' },
  { source: 'ts', value: 0xa5, label: '真心' },
  { source: 'ct', value: 0xd9, label: '空道刀' },
  { source: 'ts', value: 0xda, label: '正道刀' },
  { source: 'ts', value: 0xdb, label: '天道刀' },
  { source: 'ts', value: 0xdc, label: '源平' },
  { source: 'ts', value: 0xdd, label: '汎来巣' },
  { source: 'ts', value: 0xde, label: '五郎縞' },
  { source: 'ct', value: 0xdf, label: '絶海' },
  { source: 'ct', value: 0xe0, label: '奮発丸' },
  { source: 'ts', value: 0xe1, label: '律儀' },
  { source: 'ct', value: 0xe2, label: '賢皇骨' },
  { source: 'ct', value: 0xe3, label: '鮫肌九' },
  { source: 'ct', value: 0xe4, label: '大樽生' },
  { source: 'ts', value: 0xe5, label: '余熱' },
  { source: 'ct', value: 0xe6, label: 'マサトシ' },
  { source: 'ct', value: 0xe7, label: '虎吉竹刀' },
  { source: 'ct', value: 0xe8, label: '真啓通' },
  { source: 'ct', value: 0xe9, label: '粋逸' },
  { source: 'ct', value: 0xea, label: '断頭' },
  { source: 'ct', value: 0xeb, label: '霊禍' },
  { source: 'ct', value: 0xec, label: 'ジョアンナ' },
  { source: 'ct', value: 0xed, label: '砕苦論' },
  { source: 'ct', value: 0xee, label: '零魂磨' },
  { source: 'ct', value: 0xef, label: 'チーフテン' },
  { source: 'ct', value: 0xf0, label: '斗壱' },
  { source: 'ts', value: 0xf1, label: '物干竿' },
  { source: 'ts', value: 0xf2, label: '日本橋' },
  { source: 'ts', value: 0xf3, label: '手長' },
  { source: 'ts', value: 0xf4, label: '幽餓王' },
  { source: 'ts', value: 0xf5, label: '貪鬼丸' },
  { source: 'ts', value: 0xf6, label: '馬通二' },
  { source: 'ct', value: 0xf7, label: '迦楼羅' },
  { source: 'ts', value: 0xf8, label: '猿丸' },
  { source: 'ts', value: 0xf9, label: '蝉丸' },
  { source: 'ts', value: 0xfa, label: '小式部' },
  { source: 'ct', value: 0xfb, label: '浮雲小太刀' },
  { source: 'ct', value: 0xfc, label: '毒マムシ' },
  { source: 'ts', value: 0xfd, label: '柾重' },
  { source: 'ts', value: 0xfe, label: '蛇蜻蛉' },
  { source: 'ts', value: 0xff, label: '百代草' },
  { source: 'ts', value: 0x100, label: '不語仙' },
  { source: 'ts', value: 0x101, label: '金盞花' },
  { source: 'ct', value: 0x102, label: '二心' },
  { source: 'ts', value: 0x103, label: '富士ヶ根' },
  { source: 'ts', value: 0x104, label: '大文字' },
  { source: 'ts', value: 0x105, label: '麒麟児' },
  { source: 'ct', value: 0x106, label: '焔魔' },
  { source: 'ts', value: 0x107, label: '霜柱' },
  { source: 'ct', value: 0x108, label: '立奈美' },
  { source: 'ts', value: 0x13c, label: 'なまくら刀' },
  { source: 'ct', value: 0x13f, label: '残月' },
  { source: 'ts', value: 0x149, label: '珍比羅' },
  { source: 'ts', value: 0x159, label: '陸奥守吉行' },
  { source: 'ts', value: 0x15b, label: '虎徹' },
  { source: 'ct', value: 0x15d, label: '和泉守兼定' },
  { source: 'ct', value: 0x15f, label: '活火山' },
  { source: 'ct', value: 0x169, label: '夜葬' },
]

/** 鞘（X、+0x0A〜+0x0B の u16。§5.5）。✅ X は鞘の ID（[U] 2026-10-05）。label は同じ X を使う刃の名前。0xFFFF は鞘なし（[U] 2026-10-05）。
 * 🔶 U-3 案C の行は、[CT] の刃の X を規則（ID＋0x17／ID−0x5D）で計算した値から逆算して足した鞘（ユーザー判断 2026-10-05）。ゲーム内では未確認
 */
export const SHEATHS: readonly IdOption[] = [
  { id: 0x18, label: '中道刀・なまくら刀' },
  { id: 0x1a, label: '黒獅子' },
  { id: 0x26, label: '天井割・見栄春' },
  { id: 0x27, label: '寂蓮・大天狗' },
  { id: 0x28, label: '曼珠沙華・残月' },
  { id: 0x2d, label: '徳母里' },
  { id: 0x2e, label: '与根助' },
  { id: 0x30, label: '風花' },
  { id: 0x34, label: 'ハルユキ' },
  { id: 0x39, label: '美帝骨' },
  { id: 0x53, label: '鮫肌丸' },
  { id: 0x54, label: '大黒生' },
  { id: 0x55, label: '微熱' },
  { id: 0x56, label: '竹刀・虎吉竹刀' },
  { id: 0x57, label: '龍魔治' }, // 🔶 U-3 案C
  { id: 0x58, label: '精霊舞' },
  { id: 0x59, label: '炎天過' },
  { id: 0x5a, label: '氷天過' },
  { id: 0x5b, label: 'ジョゼフィーヌ・イプスカリバ' },
  { id: 0x5c, label: '一文字' },
  { id: 0x5d, label: '阿摩羅' },
  { id: 0x5e, label: 'センチュリオン' },
  { id: 0x5f, label: '闇緊' },
  { id: 0x60, label: '浅餓王・乃理州' },
  { id: 0x61, label: '斬鬼丸' }, // 🔶 U-3 案C
  { id: 0x62, label: '馬通二' },
  { id: 0x63, label: '阿修羅' },
  { id: 0x64, label: '凍雲小太刀' }, // 🔶 U-3 案C
  { id: 0x65, label: '赤マムシ' }, // 🔶 U-3 案C
  { id: 0x66, label: '村柾' }, // 🔶 U-3 案C
  { id: 0x67, label: '黒蜻蛉' },
  { id: 0x68, label: '羅刹' },
  { id: 0x9b, label: '真心' },
  { id: 0x9e, label: '藤奈美' },
  { id: 0xa2, label: '数寄者' },
  { id: 0xa4, label: '一発丸' },
  { id: 0xa7, label: '絶天' },
  { id: 0xa8, label: '貫誠' },
  { id: 0xab, label: '高楊枝・空道刀' },
  { id: 0xac, label: '正道刀' },
  { id: 0xad, label: '天道刀' },
  { id: 0xae, label: '源平' },
  { id: 0xaf, label: '汎来巣' },
  { id: 0xb0, label: '五郎縞・無天下' },
  { id: 0xb1, label: '絶海' }, // 🔶 U-3 案C
  { id: 0xb2, label: '奮発丸' }, // 🔶 U-3 案C
  { id: 0xb3, label: '律儀' },
  { id: 0xb4, label: '賢皇骨' }, // 🔶 U-3 案C
  { id: 0xb5, label: '鮫肌九' }, // 🔶 U-3 案C
  { id: 0xb6, label: '大樽生' }, // 🔶 U-3 案C
  { id: 0xb7, label: '余熱' },
  { id: 0xb8, label: 'マサトシ' }, // 🔶 U-3 案C
  { id: 0xb9, label: '真啓通' }, // 🔶 U-3 案C
  { id: 0xba, label: '粋逸' }, // 🔶 U-3 案C
  { id: 0xbb, label: '断頭' }, // 🔶 U-3 案C
  { id: 0xbc, label: '霊禍' }, // 🔶 U-3 案C
  { id: 0xbd, label: 'ジョアンナ' }, // 🔶 U-3 案C
  { id: 0xbe, label: '砕苦論' }, // 🔶 U-3 案C
  { id: 0xbf, label: '零魂磨' }, // 🔶 U-3 案C
  { id: 0xc0, label: 'チーフテン' }, // 🔶 U-3 案C
  { id: 0xc1, label: '斗壱' }, // 🔶 U-3 案C
  { id: 0xc2, label: '物干竿' },
  { id: 0xc3, label: '日本橋' },
  { id: 0xc4, label: '手長' },
  { id: 0xc5, label: '幽餓王' },
  { id: 0xc6, label: '貪鬼丸' },
  { id: 0xc7, label: '迦楼羅' }, // 🔶 U-3 案C
  { id: 0xc8, label: '猿丸' },
  { id: 0xc9, label: '蝉丸' },
  { id: 0xca, label: '小式部' },
  { id: 0xcb, label: '蒼伯' },
  { id: 0xcc, label: '毒マムシ' }, // 🔶 U-3 案C
  { id: 0xcd, label: '柾重' },
  { id: 0xce, label: '蛇蜻蛉' },
  { id: 0xcf, label: '百代草' },
  { id: 0xd0, label: '不語仙' },
  { id: 0xd1, label: '金盞花' },
  { id: 0xd2, label: '二心' }, // 🔶 U-3 案C
  { id: 0xd3, label: '富士ヶ根' },
  { id: 0xd4, label: '大文字' },
  { id: 0xd5, label: '麒麟児・霧単穂' },
  { id: 0xd6, label: '焔魔' },
  { id: 0xd7, label: '霜柱' },
  { id: 0xd8, label: '立奈美' },
  { id: 0x139, label: 'クルセイダー' },
  { id: 0x146, label: '珍比羅' },
  { id: 0x158, label: '陸奥守吉行' },
  { id: 0x161, label: '虎徹' },
  { id: 0x162, label: '和泉守兼定' },
  { id: 0x163, label: '活火山' },
  { id: 0x167, label: '夜葬' },
  { id: 0xffff, label: '鞘なし' },
]

/**
 * 特殊武器の刃（3バイト目 0xFF。D-15 で通常パーツと別扱い）。[TS] の値と、ゲーム内で確認した値（[U]）。
 * 下位16ビット 0x00〜0x0B ですべて（ユーザー判断 2026-10-05。0x0C 以降はないものとする）
 */
export const SPECIAL_BLADES: readonly PartOption[] = [
  { source: 'ts', value: 0xff0000, label: 'ジャクリーン' }, // D-15
  { source: 'ts', value: 0xff0001, label: '虎爪（無手）' }, // D-15 [U]
  { source: 'ts', value: 0xff0002, label: '53年式ライフル' }, // D-15 [U]
  { source: 'ts', value: 0xff0003, label: '竹富士' }, // D-15 [U]
  { source: 'ts', value: 0xff0004, label: '十手' }, // D-15
  { source: 'ts', value: 0xff0005, label: '冥澱' }, // D-15 [U]
  { source: 'ts', value: 0xff0006, label: '鬼ヶ島' }, // D-15 [U]
  { source: 'ts', value: 0xff0007, label: 'クズリ爪' }, // D-15 [U]
  { source: 'ts', value: 0xff0008, label: '出刃包丁' }, // D-15
  { source: 'ts', value: 0xff0009, label: 'エンジェル（ライフル）' }, // D-15 [U]
  { source: 'ts', value: 0xff000a, label: 'カツオ' }, // D-15
  { source: 'ts', value: 0xff000b, label: 'M2リボルバー' }, // D-15
]

/** 完成武器ID（+0x06 の u16。§5.8 ✅ [TS][I-3]）。名前は [TS] のコード表記のまま。0xFFFF は自作武器 */
export const WEAPON_IDS: readonly IdOption[] = [
  { id: 0x0002, label: '中道刀' },
  { id: 0x0003, label: '数奇者' },
  { id: 0x0004, label: '徳母里' },
  { id: 0x0005, label: '与根助' },
  { id: 0x0006, label: '絶天' },
  { id: 0x0007, label: '一発丸' },
  { id: 0x0009, label: 'ジャクリーン' },
  { id: 0x0011, label: '竹刀' },
  { id: 0x0013, label: '竹富士' },
  { id: 0x0014, label: '精霊舞' },
  { id: 0x0015, label: '十手' },
  { id: 0x0016, label: '炎天過' },
  { id: 0x0017, label: '氷天過' },
  { id: 0x0018, label: 'ジョセフィーヌ' },
  { id: 0x0019, label: '一文字' },
  { id: 0x001a, label: '阿摩羅' },
  { id: 0x001b, label: 'センチュリオン' },
  { id: 0x001c, label: '闇緊' },
  { id: 0x001e, label: '浅餓王' },
  { id: 0x001f, label: '天井割' },
  { id: 0x0021, label: '阿修羅' },
  { id: 0x0022, label: '寂蓮' },
  { id: 0x0026, label: '黒蜻蛉' },
  { id: 0x0027, label: '真心' },
  { id: 0x0028, label: '黒獅子' },
  { id: 0x0029, label: '羅刹' },
  { id: 0x002a, label: '風花' },
  { id: 0x002b, label: '藤奈美' },
  { id: 0x002c, label: 'クルセイダー' },
  { id: 0x002f, label: '正道刀' },
  { id: 0x0030, label: '天道刀' },
  { id: 0x0031, label: '源平' },
  { id: 0x0032, label: '汎来巣' },
  { id: 0x0033, label: '五郎縞' },
  { id: 0x0036, label: '律義' },
  { id: 0x003a, label: '余熱' },
  { id: 0x0044, label: 'チーフテン' },
  { id: 0x0046, label: '物干竿' },
  { id: 0x0047, label: '日本橋' },
  { id: 0x0048, label: '手長' },
  { id: 0x0049, label: '幽餓王' },
  { id: 0x004a, label: '貪鬼丸' },
  { id: 0x004b, label: '馬通二' },
  { id: 0x004d, label: '猿丸' },
  { id: 0x004e, label: '蝉丸' },
  { id: 0x004f, label: '小式部' },
  { id: 0x0052, label: '柾重' },
  { id: 0x0053, label: '蛇蜻蛉' },
  { id: 0x0054, label: '曼珠沙華' },
  { id: 0x0055, label: '百代草' },
  { id: 0x0056, label: '不語仙' },
  { id: 0x0057, label: '金盞花' },
  { id: 0x0059, label: '富士ヶ根' },
  { id: 0x005a, label: '大文字' },
  { id: 0x005b, label: '麒麟児' },
  { id: 0x005d, label: '霜柱' },
  { id: 0x005e, label: '高楊枝' },
  { id: 0x005f, label: '無天下' },
  { id: 0x0060, label: '乃理州' },
  { id: 0x0061, label: '青伯' },
  { id: 0x0063, label: '霧単穂' },
  { id: 0x0067, label: 'なまくら刀' },
  { id: 0x0068, label: '珍比羅' },
  { id: 0x006a, label: '鬼ヶ島' },
  { id: 0x006b, label: '出刃包丁' },
  { id: 0x006d, label: '陸奥守吉行' },
  { id: 0x006e, label: 'M2リボルバー' },
  { id: 0x006f, label: 'カツオ' },
  { id: 0x0070, label: '虎徹' },
  { id: 0xffff, label: '自作' },
]
