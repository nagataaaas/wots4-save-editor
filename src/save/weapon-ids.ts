// 武器の ID 表。docs/wos4_id_table.csv から生成した（2026-10-05）。表を直したら作り直す。
// 名前は武器名のマスター（master/weapon-names.ts）のキーで参照する（依存の順：weapon-names → weapon-ids → weapon → 画面）。
//
// source の意味：
//   'ts'：[TS] の定義値（✅ [TS][I-3]。U-3 案A：この値のまま書けば正しく動く）、または実セーブのバイト列をゲーム内の表示で確認した値（✅ [U]）。
//         value は刃・鍔が 3 B、柄が 2 B を LE で読んだ値
//   'ct'：Cheat Engine テーブル [CT] の ID（u16）だけが分かっているもの。ユーザー判断で確定扱い（2026-10-05。ゲーム内では未確認）。
//         value は ID。刃は X（§5.5）を 🔶 規則で計算して書く（U-3 案C、ユーザー判断 2026-10-05）。規則外の刃は x が null で、
//         ID だけを書き X は元の値のまま残す（U-3 案B。ゲーム内で分解→組み立てると正しい X になるので、それで X を調べる。ユーザー判断 2026-10-05）
// U-13 は案A（CT の刃 305〜316 は +1 ずれている）で決着した（ユーザー判断 2026-10-05）。CSV の ID は −1 した値
// 正道刀の鍔（[TS] の定義値 0xAC0109）は作者が異常値と注記しており I-3 の対象外なので載せない。

import {
  weaponKind,
  weaponName,
  type Lang,
  type WeaponKey,
  type WeaponKind,
} from "./master/weapon-names";

export type PartOption = {
  source: "ts" | "ct";
  value: number;
  /** 武器名のマスターのキー */
  name: WeaponKey;
  /**
   * 刃だけ：X（鞘の ID、u16）。
   * 'ct' は 🔶 規則で計算した X、または ✅ 実セーブで確かめた X。null は規則外で X 不明（ID だけ書く。U-3 案B）。
   * 'ts' は鞘が 0x100 以上のときだけ持つ（3 B 値には X の下位バイトしかない）。ないときは X ＝ 3 B 値の3バイト目
   */
  x?: number | null;
  /** x が、規則を確かめた範囲（0x3F〜0x51、0x109〜0x134）の外に規則を延ばして計算した値（ユーザー判断 2026-10-05、ゲーム内で確認待ち） */
  xExtended?: boolean;
};

/** 刃（+0x08〜）。ts は 3 B（3バイト目は 🔶 X の下位バイト）、ct は ID（u16）＋規則で計算した X（u16） */
export const BLADES: readonly PartOption[] = [
  { source: "ts", value: 0x180006, name: "中道刀" },
  { source: "ts", value: 0xa20007, name: "数寄者" }, // D-13
  { source: "ts", value: 0x2d0008, name: "徳母里" },
  { source: "ts", value: 0x2e0009, name: "与根助" }, // D-13
  { source: "ts", value: 0xa7000a, name: "絶天" },
  { source: "ts", value: 0xa4000b, name: "一発丸" },
  { source: "ts", value: 0x1a0019, name: "黒獅子" },
  { source: "ts", value: 0x26001d, name: "天井割" },
  { source: "ts", value: 0x270020, name: "寂蓮" },
  { source: "ts", value: 0x280023, name: "曼珠沙華" },
  { source: "ts", value: 0x30002f, name: "風花" },
  { source: "ts", value: 0xa80037, name: "貫誠" }, // U-3 [U] 分解→組み立て後の実セーブ（sample/S4-DATA_01）
  { source: "ts", value: 0x390038, name: "美帝骨" }, // U-3 [U] 分解→組み立て後の実セーブ（sample/S4-DATA_01）
  { source: "ts", value: 0x53003c, name: "鮫肌丸" }, // U-3 [U] 分解→組み立て後の実セーブ（sample/S4-DATA_01）
  { source: "ts", value: 0x54003d, name: "大黒生" }, // U-3 [U] 分解→組み立て後の実セーブ（sample/S4-DATA_01）
  { source: "ts", value: 0x55003e, name: "微熱" }, // U-3 [U] 分解→組み立て後の実セーブ（sample/S4-DATA_01）
  { source: "ts", value: 0x56003f, name: "竹刀" },
  { source: "ct", value: 0x40, name: "龍魔治", x: 0x57 },
  { source: "ts", value: 0x580041, name: "精霊舞" },
  { source: "ts", value: 0x590042, name: "炎天過" },
  { source: "ts", value: 0x5a0043, name: "氷天過" },
  { source: "ts", value: 0x5b0044, name: "ジョゼフィーヌ" },
  { source: "ts", value: 0x5c0045, name: "一文字" },
  { source: "ts", value: 0x5d0046, name: "阿摩羅" },
  { source: "ts", value: 0x5e0047, name: "センチュリオン" },
  { source: "ts", value: 0x5f0048, name: "闇緊" },
  { source: "ts", value: 0x600049, name: "浅餓王" },
  { source: "ct", value: 0x4a, name: "斬鬼丸", x: 0x61 },
  { source: "ct", value: 0x4b, name: "馬通一", x: 0x62 },
  { source: "ts", value: 0x63004c, name: "阿修羅" },
  { source: "ct", value: 0x4d, name: "凍雲小太刀", x: 0x64 },
  { source: "ct", value: 0x4e, name: "赤マムシ", x: 0x65 },
  { source: "ct", value: 0x4f, name: "村柾", x: 0x66 },
  { source: "ts", value: 0x670050, name: "黒蜻蛉" },
  { source: "ts", value: 0x680051, name: "羅刹" },
  { source: "ts", value: 0x9e0052, name: "藤奈美" },
  { source: "ts", value: 0x9b009a, name: "真心" },
  { source: "ts", value: 0x34009f, name: "ハルユキ" }, // U-3 [U] 分解→組み立て後の実セーブ（sample/S4-DATA_01）
  { source: "ts", value: 0xab00a3, name: "空道刀" }, // U-3 [U] 分解→組み立て後の実セーブ（sample/S4-DATA_01）
  { source: "ts", value: 0x5600a9, name: "虎吉竹刀" }, // U-3 [U] 分解→組み立て後の実セーブ（sample/S4-DATA_01）
  { source: "ts", value: 0x6200aa, name: "馬通二" },
  { source: "ts", value: 0xac0109, name: "正道刀" },
  { source: "ts", value: 0xad010a, name: "天道刀" },
  { source: "ts", value: 0xae010b, name: "源平" },
  { source: "ts", value: 0xaf010c, name: "汎来巣" },
  { source: "ts", value: 0xb0010d, name: "五郎縞" },
  { source: "ct", value: 0x10e, name: "絶海", x: 0xb1 },
  { source: "ct", value: 0x10f, name: "奮発丸", x: 0xb2 },
  { source: "ts", value: 0xb30110, name: "律儀" },
  { source: "ct", value: 0x111, name: "賢皇骨", x: 0xb4 },
  { source: "ct", value: 0x112, name: "鮫肌九", x: 0xb5 },
  { source: "ct", value: 0x113, name: "大樽生", x: 0xb6 },
  { source: "ts", value: 0xb70114, name: "余熱" },
  { source: "ct", value: 0x115, name: "マサトシ", x: 0xb8 },
  { source: "ct", value: 0x116, name: "真啓通", x: 0xb9 },
  { source: "ct", value: 0x117, name: "粋逸", x: 0xba },
  { source: "ct", value: 0x118, name: "断頭", x: 0xbb },
  { source: "ct", value: 0x119, name: "霊禍", x: 0xbc },
  { source: "ct", value: 0x11a, name: "ジョアンナ", x: 0xbd },
  { source: "ct", value: 0x11b, name: "砕苦論", x: 0xbe },
  { source: "ct", value: 0x11c, name: "零魂磨", x: 0xbf },
  { source: "ct", value: 0x11d, name: "チーフテン", x: 0xc0 },
  { source: "ct", value: 0x11e, name: "斗壱", x: 0xc1 },
  { source: "ts", value: 0xc2011f, name: "物干竿" },
  { source: "ts", value: 0xc30120, name: "日本橋" },
  { source: "ts", value: 0xc40121, name: "手長" },
  { source: "ts", value: 0xc50122, name: "幽餓王" },
  { source: "ts", value: 0xc60123, name: "貪鬼丸" },
  { source: "ct", value: 0x124, name: "迦楼羅", x: 0xc7 },
  { source: "ts", value: 0xc80125, name: "猿丸" },
  { source: "ts", value: 0xc90126, name: "蝉丸" },
  { source: "ts", value: 0xca0127, name: "小式部" },
  { source: "ct", value: 0x128, name: "浮雲小太刀", x: 0xcb },
  { source: "ct", value: 0x129, name: "毒マムシ", x: 0xcc },
  { source: "ts", value: 0xcd012a, name: "柾重" },
  { source: "ts", value: 0xce012b, name: "蛇蜻蛉" },
  { source: "ts", value: 0xcf012c, name: "百代草" },
  { source: "ts", value: 0xd0012d, name: "不語仙" },
  { source: "ts", value: 0xd1012e, name: "金盞花" },
  { source: "ct", value: 0x12f, name: "二心", x: 0xd2 },
  { source: "ts", value: 0xd30130, name: "富士ヶ根" }, // D-14
  { source: "ts", value: 0xd40131, name: "大文字" }, // D-14
  { source: "ts", value: 0xd50132, name: "麒麟児" }, // D-14
  { source: "ts", value: 0xd60133, name: "焔魔" }, // U-10; U-13
  { source: "ts", value: 0xd70134, name: "霜柱" }, // D-14
  { source: "ts", value: 0xd80135, name: "立奈美" }, // U-13
  { source: "ts", value: 0x260136, name: "見栄春" }, // U-13
  { source: "ts", value: 0x270137, name: "大天狗" }, // U-13
  { source: "ts", value: 0x390138, name: "クルセイダー", x: 0x139 }, // D-14
  { source: "ts", value: 0x5b013a, name: "イプスカリバ" }, // U-13
  { source: "ts", value: 0x18013b, name: "なまくら刀" }, // D-14
  { source: "ts", value: 0x28013e, name: "残月" }, // U-3 [U] 分解→組み立て後の実セーブ（sample/S4-DATA_01）
  { source: "ts", value: 0xab0141, name: "高楊枝" },
  { source: "ts", value: 0xb00142, name: "無天下" },
  { source: "ts", value: 0x600143, name: "乃理州" },
  { source: "ts", value: 0xcb0144, name: "蒼伯" },
  { source: "ts", value: 0xd50145, name: "霧単穂" },
  { source: "ts", value: 0x460147, name: "珍比羅", x: 0x146 },
  { source: "ts", value: 0x580157, name: "陸奥守吉行", x: 0x158 },
  { source: "ts", value: 0x610164, name: "虎徹", x: 0x161 },
  // X が 0x100 以上で 3 B 値に収まらないので、ID と実測の X を 2 B ずつ書く（U-3 [U] 分解→組み立て後の実セーブ sample/S4-DATA_01）
  { source: "ct", value: 0x165, name: "和泉守兼定", x: 0x162 },
  { source: "ct", value: 0x166, name: "活火山", x: 0x163 },
  { source: "ct", value: 0x168, name: "夜葬", x: 0x167 },
];

/** 鍔。ts は +0x0B〜+0x0D の 3 B（1バイト目は 🔶 X の上位バイト）、ct は +0x0C〜+0x0D の ID（u16） */
export const GUARDS: readonly PartOption[] = [
  { source: "ts", value: 0xd00, name: "中道刀" },
  { source: "ts", value: 0xf00, name: "数寄者" }, // D-13
  { source: "ts", value: 0x1100, name: "徳母里" },
  { source: "ts", value: 0x1300, name: "与根助" }, // D-13
  { source: "ts", value: 0x1500, name: "絶天" },
  { source: "ts", value: 0x1700, name: "一発丸" },
  { source: "ts", value: 0x1b00, name: "黒獅子" },
  { source: "ts", value: 0x1f00, name: "天井割" },
  { source: "ts", value: 0x2200, name: "寂蓮" },
  { source: "ts", value: 0x2500, name: "曼珠沙華" },
  { source: "ts", value: 0x3100, name: "風花" },
  { source: "ct", value: 0x36, name: "ハルユキ" },
  { source: "ct", value: 0x3b, name: "美帝骨" },
  { source: "ts", value: 0x6b00, name: "貫誠" },
  { source: "ct", value: 0x6d, name: "鮫肌丸" },
  { source: "ct", value: 0x6f, name: "大黒生" },
  { source: "ts", value: 0x7100, name: "微熱" },
  { source: "ts", value: 0x7300, name: "竹刀" },
  { source: "ct", value: 0x75, name: "龍魔治" },
  { source: "ts", value: 0x7700, name: "精霊舞" },
  { source: "ts", value: 0x7900, name: "炎天過" },
  { source: "ts", value: 0x7b00, name: "氷天過" },
  { source: "ts", value: 0x7d00, name: "ジョゼフィーヌ" },
  { source: "ts", value: 0x7f00, name: "一文字" },
  { source: "ts", value: 0x8100, name: "阿摩羅" },
  { source: "ts", value: 0x8300, name: "センチュリオン" },
  { source: "ts", value: 0x8500, name: "闇緊" },
  { source: "ts", value: 0x8700, name: "浅餓王" },
  { source: "ts", value: 0x8900, name: "斬鬼丸" }, // D-16
  { source: "ts", value: 0x8b00, name: "馬通一" },
  { source: "ts", value: 0x8d00, name: "阿修羅" },
  { source: "ct", value: 0x8f, name: "凍雲小太刀" },
  { source: "ct", value: 0x91, name: "赤マムシ" },
  { source: "ts", value: 0x9300, name: "村柾" },
  { source: "ts", value: 0x9500, name: "黒蜻蛉" },
  { source: "ts", value: 0x9700, name: "羅刹" },
  { source: "ts", value: 0x9900, name: "藤奈美" },
  { source: "ts", value: 0xa101, name: "クルセイダー" },
  { source: "ts", value: 0xa600, name: "真心" },
  { source: "ts", value: 0x13d00, name: "なまくら刀" },
  { source: "ct", value: 0x140, name: "残月" },
  { source: "ts", value: 0x14801, name: "珍比羅" },
  { source: "ct", value: 0x14a, name: "砕苦論" },
  { source: "ct", value: 0x14b, name: "真啓通" },
  { source: "ct", value: 0x14c, name: "ジョアンナ" },
  { source: "ct", value: 0x14d, name: "零魂磨" },
  { source: "ct", value: 0x14e, name: "絶海" },
  { source: "ct", value: 0x14f, name: "奮発丸" },
  { source: "ct", value: 0x150, name: "大樽生" },
  { source: "ts", value: 0x15100, name: "霜柱" },
  { source: "ct", value: 0x152, name: "虎吉竹刀" },
  { source: "ct", value: 0x153, name: "断頭" },
  { source: "ts", value: 0x15400, name: "霊禍" },
  { source: "ct", value: 0x155, name: "粋逸" },
  { source: "ct", value: 0x156, name: "立奈美" },
  { source: "ts", value: 0x15a01, name: "陸奥守吉行" },
  { source: "ts", value: 0x15c01, name: "虎徹" },
  { source: "ct", value: 0x15e, name: "和泉守兼定" },
  { source: "ct", value: 0x160, name: "活火山" },
  { source: "ct", value: 0x167, name: "夜葬" },
];

/** 柄（+0x0E〜+0x0F の 2 B）。ts・ct とも ID（u16） */
export const GRIPS: readonly PartOption[] = [
  { source: "ts", value: 0xc, name: "中道刀" },
  { source: "ts", value: 0xe, name: "数寄者" }, // D-13
  { source: "ts", value: 0x10, name: "徳母里" },
  { source: "ts", value: 0x12, name: "与根助" }, // D-13
  { source: "ts", value: 0x14, name: "絶天" },
  { source: "ts", value: 0x16, name: "一発丸" },
  { source: "ts", value: 0x1c, name: "黒獅子" },
  { source: "ts", value: 0x1e, name: "天井割" },
  { source: "ts", value: 0x21, name: "寂蓮" },
  { source: "ts", value: 0x24, name: "曼珠沙華" },
  { source: "ts", value: 0x32, name: "風花" },
  { source: "ct", value: 0x35, name: "ハルユキ" },
  { source: "ct", value: 0x3a, name: "美帝骨" },
  { source: "ct", value: 0x6a, name: "貫誠" },
  { source: "ct", value: 0x6c, name: "鮫肌丸" },
  { source: "ct", value: 0x6e, name: "大黒生" },
  { source: "ct", value: 0x70, name: "微熱" },
  { source: "ts", value: 0x72, name: "竹刀" },
  { source: "ct", value: 0x74, name: "龍魔治" },
  { source: "ts", value: 0x76, name: "精霊舞" },
  { source: "ts", value: 0x78, name: "炎天過" },
  { source: "ts", value: 0x7a, name: "氷天過" },
  { source: "ts", value: 0x7c, name: "ジョゼフィーヌ" },
  { source: "ts", value: 0x7e, name: "一文字" },
  { source: "ts", value: 0x80, name: "阿摩羅" },
  { source: "ts", value: 0x82, name: "センチュリオン" },
  { source: "ts", value: 0x84, name: "闇緊" },
  { source: "ts", value: 0x86, name: "浅餓王" },
  { source: "ct", value: 0x88, name: "斬鬼丸" },
  { source: "ct", value: 0x8a, name: "馬通一" },
  { source: "ts", value: 0x8c, name: "阿修羅" },
  { source: "ct", value: 0x8e, name: "凍雲小太刀" },
  { source: "ct", value: 0x90, name: "赤マムシ" },
  { source: "ct", value: 0x92, name: "村柾" },
  { source: "ts", value: 0x94, name: "黒蜻蛉" },
  { source: "ts", value: 0x96, name: "羅刹" },
  { source: "ts", value: 0x98, name: "藤奈美" },
  { source: "ts", value: 0xa0, name: "クルセイダー" },
  { source: "ts", value: 0xa5, name: "真心" },
  { source: "ct", value: 0xd9, name: "空道刀" },
  { source: "ts", value: 0xda, name: "正道刀" },
  { source: "ts", value: 0xdb, name: "天道刀" },
  { source: "ts", value: 0xdc, name: "源平" },
  { source: "ts", value: 0xdd, name: "汎来巣" },
  { source: "ts", value: 0xde, name: "五郎縞" },
  { source: "ct", value: 0xdf, name: "絶海" },
  { source: "ct", value: 0xe0, name: "奮発丸" },
  { source: "ts", value: 0xe1, name: "律儀" },
  { source: "ct", value: 0xe2, name: "賢皇骨" },
  { source: "ct", value: 0xe3, name: "鮫肌九" },
  { source: "ct", value: 0xe4, name: "大樽生" },
  { source: "ts", value: 0xe5, name: "余熱" },
  { source: "ct", value: 0xe6, name: "マサトシ" },
  { source: "ct", value: 0xe7, name: "虎吉竹刀" },
  { source: "ct", value: 0xe8, name: "真啓通" },
  { source: "ct", value: 0xe9, name: "粋逸" },
  { source: "ct", value: 0xea, name: "断頭" },
  { source: "ct", value: 0xeb, name: "霊禍" },
  { source: "ct", value: 0xec, name: "ジョアンナ" },
  { source: "ct", value: 0xed, name: "砕苦論" },
  { source: "ct", value: 0xee, name: "零魂磨" },
  { source: "ct", value: 0xef, name: "チーフテン" },
  { source: "ct", value: 0xf0, name: "斗壱" },
  { source: "ts", value: 0xf1, name: "物干竿" },
  { source: "ts", value: 0xf2, name: "日本橋" },
  { source: "ts", value: 0xf3, name: "手長" },
  { source: "ts", value: 0xf4, name: "幽餓王" },
  { source: "ts", value: 0xf5, name: "貪鬼丸" },
  { source: "ts", value: 0xf6, name: "馬通二" },
  { source: "ct", value: 0xf7, name: "迦楼羅" },
  { source: "ts", value: 0xf8, name: "猿丸" },
  { source: "ts", value: 0xf9, name: "蝉丸" },
  { source: "ts", value: 0xfa, name: "小式部" },
  { source: "ct", value: 0xfb, name: "浮雲小太刀" },
  { source: "ct", value: 0xfc, name: "毒マムシ" },
  { source: "ts", value: 0xfd, name: "柾重" },
  { source: "ts", value: 0xfe, name: "蛇蜻蛉" },
  { source: "ts", value: 0xff, name: "百代草" },
  { source: "ts", value: 0x100, name: "不語仙" },
  { source: "ts", value: 0x101, name: "金盞花" },
  { source: "ct", value: 0x102, name: "二心" },
  { source: "ts", value: 0x103, name: "富士ヶ根" },
  { source: "ts", value: 0x104, name: "大文字" },
  { source: "ts", value: 0x105, name: "麒麟児" },
  { source: "ct", value: 0x106, name: "焔魔" },
  { source: "ts", value: 0x107, name: "霜柱" },
  { source: "ct", value: 0x108, name: "立奈美" },
  { source: "ts", value: 0x13c, name: "なまくら刀" },
  { source: "ct", value: 0x13f, name: "残月" },
  { source: "ts", value: 0x149, name: "珍比羅" },
  { source: "ts", value: 0x159, name: "陸奥守吉行" },
  { source: "ts", value: 0x15b, name: "虎徹" },
  { source: "ct", value: 0x15d, name: "和泉守兼定" },
  { source: "ct", value: 0x15f, name: "活火山" },
  { source: "ct", value: 0x169, name: "夜葬" },
];

/**
 * 特殊武器の刃（3バイト目 0xFF。D-15 で通常パーツと別扱い）。[TS] の値と、ゲーム内で確認した値（[U]）。
 * 下位16ビット 0x00〜0x0B ですべて（ユーザー判断 2026-10-05。0x0C 以降はないものとする）
 */
export const SPECIAL_BLADES: readonly PartOption[] = [
  { source: "ts", value: 0xff0000, name: "ジャクリーン" }, // D-15
  { source: "ts", value: 0xff0001, name: "虎爪" }, // D-15 [U]
  { source: "ts", value: 0xff0002, name: "53年式ライフル" }, // D-15 [U]
  { source: "ts", value: 0xff0003, name: "竹富士" }, // D-15 [U]
  { source: "ts", value: 0xff0004, name: "十手" }, // D-15
  { source: "ts", value: 0xff0005, name: "冥澱" }, // D-15 [U]
  { source: "ts", value: 0xff0006, name: "鬼ヶ島" }, // D-15 [U]
  { source: "ts", value: 0xff0007, name: "クズリ爪" }, // D-15 [U]
  { source: "ts", value: 0xff0008, name: "出刃包丁" }, // D-15
  { source: "ts", value: 0xff0009, name: "エンジェル" }, // D-15 [U]
  { source: "ts", value: 0xff000a, name: "カツオ" }, // D-15
  { source: "ts", value: 0xff000b, name: "M2リボルバー" }, // D-15
];

/** パーツの表示名 */
export function partName(option: PartOption, lang: Lang = "ja"): string {
  return weaponName(option.name, lang);
}

/**
 * 鞘（X、+0x0A〜+0x0B の u16。§5.5）。✅ X は鞘の ID（[U] 2026-10-05）。names は同じ X を使う刃。0xFFFF は鞘なし（[U] 2026-10-05）。
 * 🔶 U-3 案C の行は、[CT] の刃の X を規則（ID＋0x17／ID−0x5D）で計算した値から逆算して足した鞘（ユーザー判断 2026-10-05）。ゲーム内では未確認
 */
export type SheathOption = { id: number; names: readonly WeaponKey[] };

export const NO_SHEATH = 0xffff;

export const SHEATHS: readonly SheathOption[] = [
  { id: 0x18, names: ["中道刀", "なまくら刀"] },
  { id: 0x1a, names: ["黒獅子"] },
  { id: 0x26, names: ["天井割", "見栄春"] },
  { id: 0x27, names: ["寂蓮", "大天狗"] },
  { id: 0x28, names: ["曼珠沙華", "残月"] },
  { id: 0x2d, names: ["徳母里"] },
  { id: 0x2e, names: ["与根助"] },
  { id: 0x30, names: ["風花"] },
  { id: 0x34, names: ["ハルユキ"] },
  { id: 0x39, names: ["美帝骨"] },
  { id: 0x53, names: ["鮫肌丸"] },
  { id: 0x54, names: ["大黒生"] },
  { id: 0x55, names: ["微熱"] },
  { id: 0x56, names: ["竹刀", "虎吉竹刀"] },
  { id: 0x57, names: ["龍魔治"] }, // 🔶 U-3 案C
  { id: 0x58, names: ["精霊舞"] },
  { id: 0x59, names: ["炎天過"] },
  { id: 0x5a, names: ["氷天過"] },
  { id: 0x5b, names: ["ジョゼフィーヌ", "イプスカリバ"] },
  { id: 0x5c, names: ["一文字"] },
  { id: 0x5d, names: ["阿摩羅"] },
  { id: 0x5e, names: ["センチュリオン"] },
  { id: 0x5f, names: ["闇緊"] },
  { id: 0x60, names: ["浅餓王", "乃理州"] },
  { id: 0x61, names: ["斬鬼丸"] }, // 🔶 U-3 案C
  { id: 0x62, names: ["馬通二"] },
  { id: 0x63, names: ["阿修羅"] },
  { id: 0x64, names: ["凍雲小太刀"] }, // 🔶 U-3 案C
  { id: 0x65, names: ["赤マムシ"] }, // 🔶 U-3 案C
  { id: 0x66, names: ["村柾"] }, // 🔶 U-3 案C
  { id: 0x67, names: ["黒蜻蛉"] },
  { id: 0x68, names: ["羅刹"] },
  { id: 0x9b, names: ["真心"] },
  { id: 0x9e, names: ["藤奈美"] },
  { id: 0xa2, names: ["数寄者"] },
  { id: 0xa4, names: ["一発丸"] },
  { id: 0xa7, names: ["絶天"] },
  { id: 0xa8, names: ["貫誠"] },
  { id: 0xab, names: ["高楊枝", "空道刀"] },
  { id: 0xac, names: ["正道刀"] },
  { id: 0xad, names: ["天道刀"] },
  { id: 0xae, names: ["源平"] },
  { id: 0xaf, names: ["汎来巣"] },
  { id: 0xb0, names: ["五郎縞", "無天下"] },
  { id: 0xb1, names: ["絶海"] }, // 🔶 U-3 案C
  { id: 0xb2, names: ["奮発丸"] }, // 🔶 U-3 案C
  { id: 0xb3, names: ["律儀"] },
  { id: 0xb4, names: ["賢皇骨"] }, // 🔶 U-3 案C
  { id: 0xb5, names: ["鮫肌九"] }, // 🔶 U-3 案C
  { id: 0xb6, names: ["大樽生"] }, // 🔶 U-3 案C
  { id: 0xb7, names: ["余熱"] },
  { id: 0xb8, names: ["マサトシ"] }, // 🔶 U-3 案C
  { id: 0xb9, names: ["真啓通"] }, // 🔶 U-3 案C
  { id: 0xba, names: ["粋逸"] }, // 🔶 U-3 案C
  { id: 0xbb, names: ["断頭"] }, // 🔶 U-3 案C
  { id: 0xbc, names: ["霊禍"] }, // 🔶 U-3 案C
  { id: 0xbd, names: ["ジョアンナ"] }, // 🔶 U-3 案C
  { id: 0xbe, names: ["砕苦論"] }, // 🔶 U-3 案C
  { id: 0xbf, names: ["零魂磨"] }, // 🔶 U-3 案C
  { id: 0xc0, names: ["チーフテン"] }, // 🔶 U-3 案C
  { id: 0xc1, names: ["斗壱"] }, // 🔶 U-3 案C
  { id: 0xc2, names: ["物干竿"] },
  { id: 0xc3, names: ["日本橋"] },
  { id: 0xc4, names: ["手長"] },
  { id: 0xc5, names: ["幽餓王"] },
  { id: 0xc6, names: ["貪鬼丸"] },
  { id: 0xc7, names: ["迦楼羅"] }, // 🔶 U-3 案C
  { id: 0xc8, names: ["猿丸"] },
  { id: 0xc9, names: ["蝉丸"] },
  { id: 0xca, names: ["小式部"] },
  { id: 0xcb, names: ["蒼伯"] },
  { id: 0xcc, names: ["毒マムシ"] }, // 🔶 U-3 案C
  { id: 0xcd, names: ["柾重"] },
  { id: 0xce, names: ["蛇蜻蛉"] },
  { id: 0xcf, names: ["百代草"] },
  { id: 0xd0, names: ["不語仙"] },
  { id: 0xd1, names: ["金盞花"] },
  { id: 0xd2, names: ["二心"] }, // 🔶 U-3 案C
  { id: 0xd3, names: ["富士ヶ根"] },
  { id: 0xd4, names: ["大文字"] },
  { id: 0xd5, names: ["麒麟児", "霧単穂"] },
  { id: 0xd6, names: ["焔魔"] },
  { id: 0xd7, names: ["霜柱"] },
  { id: 0xd8, names: ["立奈美"] },
  { id: 0x139, names: ["クルセイダー"] },
  { id: 0x146, names: ["珍比羅"] },
  { id: 0x158, names: ["陸奥守吉行"] },
  { id: 0x161, names: ["虎徹"] },
  { id: 0x162, names: ["和泉守兼定"] },
  { id: 0x163, names: ["活火山"] },
  { id: 0x167, names: ["夜葬"] },
  { id: NO_SHEATH, names: [] },
];

/** 鞘の種別（刀・槍）。同じ鞘を使う刃の最初の1つで決める。鞘なしは null */
export function sheathKind(sheath: SheathOption): WeaponKind | null {
  return sheath.names.length === 0 ? null : weaponKind(sheath.names[0]);
}

/** 鞘の表示名。同じ鞘を使う刃の名前を「・」でつなぐ。鞘なしは「鞘なし」 */
export function sheathName(sheath: SheathOption, lang: Lang = "ja"): string {
  if (sheath.names.length === 0) return lang === "en" ? "No sheath" : "鞘なし";
  return sheath.names.map((n) => weaponName(n, lang)).join(lang === "en" ? " / " : "・");
}

/**
 * 完成武器ID（+0x06 の u16。§5.8 ✅ [TS][I-3]）。name が null は自作武器（0xFFFF）。
 * [TS] のコード表記の異字（数奇者・ジョセフィーヌ・律義・青伯）は、パーツと同じ名前（数寄者・ジョゼフィーヌ・律儀・蒼伯）にまとめた（2026-10-05）
 */
export type WeaponIdOption = { id: number; name: WeaponKey | null };

export const CUSTOM_WEAPON_ID = 0xffff;

export const WEAPON_IDS: readonly WeaponIdOption[] = [
  { id: 0x0002, name: "中道刀" },
  { id: 0x0003, name: "数寄者" },
  { id: 0x0004, name: "徳母里" },
  { id: 0x0005, name: "与根助" },
  { id: 0x0006, name: "絶天" },
  { id: 0x0007, name: "一発丸" },
  { id: 0x0009, name: "ジャクリーン" },
  { id: 0x0011, name: "竹刀" },
  { id: 0x0013, name: "竹富士" },
  { id: 0x0014, name: "精霊舞" },
  { id: 0x0015, name: "十手" },
  { id: 0x0016, name: "炎天過" },
  { id: 0x0017, name: "氷天過" },
  { id: 0x0018, name: "ジョゼフィーヌ" },
  { id: 0x0019, name: "一文字" },
  { id: 0x001a, name: "阿摩羅" },
  { id: 0x001b, name: "センチュリオン" },
  { id: 0x001c, name: "闇緊" },
  { id: 0x001e, name: "浅餓王" },
  { id: 0x001f, name: "天井割" },
  { id: 0x0021, name: "阿修羅" },
  { id: 0x0022, name: "寂蓮" },
  { id: 0x0026, name: "黒蜻蛉" },
  { id: 0x0027, name: "真心" },
  { id: 0x0028, name: "黒獅子" },
  { id: 0x0029, name: "羅刹" },
  { id: 0x002a, name: "風花" },
  { id: 0x002b, name: "藤奈美" },
  { id: 0x002c, name: "クルセイダー" },
  { id: 0x002f, name: "正道刀" },
  { id: 0x0030, name: "天道刀" },
  { id: 0x0031, name: "源平" },
  { id: 0x0032, name: "汎来巣" },
  { id: 0x0033, name: "五郎縞" },
  { id: 0x0036, name: "律儀" },
  { id: 0x003a, name: "余熱" },
  { id: 0x0044, name: "チーフテン" },
  { id: 0x0046, name: "物干竿" },
  { id: 0x0047, name: "日本橋" },
  { id: 0x0048, name: "手長" },
  { id: 0x0049, name: "幽餓王" },
  { id: 0x004a, name: "貪鬼丸" },
  { id: 0x004b, name: "馬通二" },
  { id: 0x004d, name: "猿丸" },
  { id: 0x004e, name: "蝉丸" },
  { id: 0x004f, name: "小式部" },
  { id: 0x0052, name: "柾重" },
  { id: 0x0053, name: "蛇蜻蛉" },
  { id: 0x0054, name: "曼珠沙華" },
  { id: 0x0055, name: "百代草" },
  { id: 0x0056, name: "不語仙" },
  { id: 0x0057, name: "金盞花" },
  { id: 0x0059, name: "富士ヶ根" },
  { id: 0x005a, name: "大文字" },
  { id: 0x005b, name: "麒麟児" },
  { id: 0x005d, name: "霜柱" },
  { id: 0x005e, name: "高楊枝" },
  { id: 0x005f, name: "無天下" },
  { id: 0x0060, name: "乃理州" },
  { id: 0x0061, name: "蒼伯" },
  { id: 0x0063, name: "霧単穂" },
  { id: 0x0067, name: "なまくら刀" },
  { id: 0x0068, name: "珍比羅" },
  { id: 0x006a, name: "鬼ヶ島" },
  { id: 0x006b, name: "出刃包丁" },
  { id: 0x006d, name: "陸奥守吉行" },
  { id: 0x006e, name: "M2リボルバー" },
  { id: 0x006f, name: "カツオ" },
  { id: 0x0070, name: "虎徹" },
  { id: CUSTOM_WEAPON_ID, name: null },
];

/** 完成武器ID の表示名。自作は「自作」 */
export function weaponIdName(option: WeaponIdOption, lang: Lang = "ja"): string {
  if (option.name === null) return lang === "en" ? "Custom" : "自作";
  return weaponName(option.name, lang);
}
