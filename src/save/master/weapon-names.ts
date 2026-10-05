// 武器名のマスターデータ。刃・鍔・柄・鞘・完成武器ID の表（weapon-ids.ts）は、名前をここのキーで参照する。
// ほかのモジュールに依存しない（依存の順：weapon-names → weapon-ids → weapon → 画面）。
//
// - キー：日本語名（補足なし）。表示には ja／en を使う
// - ja：日本語の表示名（[TS]・[CT]・ゲーム内の表示。特殊武器は補足つき）
// - en：英語の表示名。[CT] の英語名（docs/wos4_id_table.csv の name_en から「Blade - 」などを除いたもの）。
//   資料にないもの（特殊武器）は null で、表示は ja で代用する
// - reading：ja の読み（五十音順に並べるため。ユーザー判断 2026-10-05）。駄洒落の元（CSV の備考：半ライス→汎来巣、神経痛→真啓通、
//   弾頭→断頭など）があるものはそれに合わせ、残りはユーザーが見直した（2026-10-05）。特殊武器は ID 順に並べるので持たない
// - kind：sword（刀）／spear（槍）／special（特殊武器）。槍は [CT] の英語名が「Spear Blade／Guard／Grip」のもの
//   （ユーザー判断で [CT] を確定扱い 2026-10-05）。焔魔・霜柱・立奈美の刃と藤奈美（武器種 1）はゲーム内でも槍と確認した（[U] 2026-10-05）

export type Lang = "ja" | "en";

export type WeaponKind = "sword" | "spear" | "special";

export type WeaponNameEntry = {
  ja: string;
  en: string | null;
  reading?: string;
  kind: WeaponKind;
};

export const WEAPON_NAMES = {
  中道刀: { ja: "中道刀", en: "Basal Blade", reading: "ちゅうどうとう", kind: "sword" },
  数寄者: { ja: "数寄者", en: "Snatcher", reading: "すきしゃ", kind: "sword" }, // D-13
  徳母里: { ja: "徳母里", en: "Big Bertha", reading: "とくもり", kind: "sword" },
  与根助: { ja: "与根助", en: "Last Rites", reading: "よねすけ", kind: "sword" }, // D-13
  絶天: { ja: "絶天", en: "Lost Prayer", reading: "ぜってん", kind: "sword" },
  一発丸: { ja: "一発丸", en: "Finisher", reading: "いっぱつまる", kind: "sword" },
  黒獅子: { ja: "黒獅子", en: "Black Lion", reading: "くろじし", kind: "spear" },
  天井割: { ja: "天井割", en: "Ceiling Cut", reading: "てんじょうわり", kind: "sword" },
  寂蓮: { ja: "寂蓮", en: "Rose of Sharon", reading: "じゃくれん", kind: "sword" },
  曼珠沙華: { ja: "曼珠沙華", en: "Manjusaka", reading: "まんじゅしゃげ", kind: "sword" },
  風花: { ja: "風花", en: "Snowdrift", reading: "かざはな", kind: "spear" },
  貫誠: { ja: "貫誠", en: "Boy Howdy", reading: "かんせい", kind: "sword" },
  美帝骨: { ja: "美帝骨", en: "Tailbwnd", reading: "びていこつ", kind: "sword" },
  鮫肌丸: { ja: "鮫肌丸", en: "Sharkfin Sluicer", reading: "さめはだまる", kind: "sword" },
  大黒生: { ja: "大黒生", en: "Aleshaft", reading: "おおくろなま", kind: "sword" },
  微熱: { ja: "微熱", en: "Fever", reading: "びねつ", kind: "sword" },
  竹刀: { ja: "竹刀", en: "Bamboo Sword", reading: "しない", kind: "sword" },
  龍魔治: { ja: "龍魔治", en: "Pain' the Town", reading: "りうまち", kind: "sword" },
  精霊舞: { ja: "精霊舞", en: "Big Deal", reading: "せれぶ", kind: "sword" },
  炎天過: { ja: "炎天過", en: "Blazelet", reading: "えんてんか", kind: "sword" },
  氷天過: { ja: "氷天過", en: "Icy Glare", reading: "ひょうてんか", kind: "sword" },
  ジョゼフィーヌ: { ja: "ジョゼフィーヌ", en: "Josephine", reading: "じょぜふぃーぬ", kind: "sword" },
  一文字: { ja: "一文字", en: "Beeline", reading: "いちもんじ", kind: "sword" },
  阿摩羅: { ja: "阿摩羅", en: "Longshaft", reading: "あまら", kind: "sword" },
  センチュリオン: { ja: "センチュリオン", en: "Centurion", reading: "せんちゅりおん", kind: "sword" },
  闇緊: { ja: "闇緊", en: "Black Mark't", reading: "やみきん", kind: "sword" },
  浅餓王: { ja: "浅餓王", en: "Morning Vainglory", reading: "あさがおう", kind: "sword" },
  斬鬼丸: { ja: "斬鬼丸", en: "Demonbane", reading: "ざんきまる", kind: "sword" },
  馬通一: { ja: "馬通一", en: "Strike One", reading: "ばついち", kind: "sword" },
  阿修羅: { ja: "阿修羅", en: "Asura", reading: "あしゅら", kind: "sword" },
  凍雲小太刀: { ja: "凍雲小太刀", en: "Raincloud", reading: "いてぐもこだち", kind: "sword" },
  赤マムシ: { ja: "赤マムシ", en: "Red Viper", reading: "あかまむし", kind: "sword" },
  村柾: { ja: "村柾", en: "Muramassa", reading: "むらまさ", kind: "sword" },
  黒蜻蛉: { ja: "黒蜻蛉", en: "Dragonfly", reading: "くろとんぼ", kind: "sword" },
  羅刹: { ja: "羅刹", en: "Rakshasa", reading: "らせつ", kind: "spear" },
  藤奈美: { ja: "藤奈美", en: "Wisteriam", reading: "ふじなみ", kind: "spear" },
  真心: { ja: "真心", en: "Devotion", reading: "まごころ", kind: "sword" },
  ハルユキ: { ja: "ハルユキ", en: "Haruyuki", reading: "はるゆき", kind: "sword" },
  空道刀: { ja: "空道刀", en: "Flesh Spelunker", reading: "くうどうとう", kind: "sword" },
  虎吉竹刀: { ja: "虎吉竹刀", en: "Lucky Bamboo", reading: "とらきちしない", kind: "sword" },
  馬通二: { ja: "馬通二", en: "Strike Two", reading: "ばつに", kind: "sword" },
  正道刀: { ja: "正道刀", en: "Breakright", reading: "せいどうとう", kind: "sword" },
  天道刀: { ja: "天道刀", en: "New Religion", reading: "てんどうとう", kind: "sword" },
  源平: { ja: "源平", en: "Two-Face", reading: "げんぺい", kind: "sword" },
  汎来巣: { ja: "汎来巣", en: "Rice Burner", reading: "はんらいす", kind: "sword" },
  五郎縞: { ja: "五郎縞", en: "Goro Doe", reading: "ごろうじま", kind: "sword" },
  絶海: { ja: "絶海", en: "New World", reading: "ぜっかい", kind: "sword" },
  奮発丸: { ja: "奮発丸", en: "Xerter", reading: "ふんぱつまる", kind: "sword" },
  律儀: { ja: "律儀", en: "Integrity", reading: "りちぎ", kind: "sword" },
  賢皇骨: { ja: "賢皇骨", en: "Scapulator", reading: "けんこうこつ", kind: "sword" },
  鮫肌九: { ja: "鮫肌九", en: "Sharkfin Mk. 9", reading: "さめはだきゅう", kind: "sword" },
  大樽生: { ja: "大樽生", en: "Alebarrow", reading: "おおたるなま", kind: "sword" },
  余熱: { ja: "余熱", en: "Heatsink", reading: "よねつ", kind: "sword" },
  マサトシ: { ja: "マサトシ", en: "Masatoshi", reading: "まさとし", kind: "sword" },
  真啓通: { ja: "真啓通", en: "Nerveknive", reading: "しんけいつう", kind: "sword" },
  粋逸: { ja: "粋逸", en: "Cavitater", reading: "すいいつ", kind: "sword" },
  断頭: { ja: "断頭", en: "Warhead", reading: "だんとう", kind: "sword" },
  霊禍: { ja: "霊禍", en: "Critical Frame", reading: "れいか", kind: "sword" },
  ジョアンナ: { ja: "ジョアンナ", en: "Joanna", reading: "じょあんな", kind: "sword" },
  砕苦論: { ja: "砕苦論", en: "Cyclone", reading: "さいくろん", kind: "sword" },
  零魂磨: { ja: "零魂磨", en: "Soul Culler", reading: "れいこんま", kind: "sword" },
  チーフテン: { ja: "チーフテン", en: "Chieftain", reading: "ちーふてん", kind: "sword" },
  斗壱: { ja: "斗壱", en: "Shady Deal", reading: "といち", kind: "sword" },
  物干竿: { ja: "物干竿", en: "Laundry Pole", reading: "ものほしざお", kind: "sword" },
  日本橋: { ja: "日本橋", en: "Nihonbashi", reading: "にほんばし", kind: "sword" },
  手長: { ja: "手長", en: "Longarm", reading: "てなが", kind: "sword" },
  幽餓王: { ja: "幽餓王", en: "Full Moonflower", reading: "ゆうがおう", kind: "sword" },
  貪鬼丸: { ja: "貪鬼丸", en: "Ogrenip", reading: "どんきまる", kind: "sword" },
  迦楼羅: { ja: "迦楼羅", en: "Garuda", reading: "かるら", kind: "sword" },
  猿丸: { ja: "猿丸", en: "Monkeytail", reading: "さるまる", kind: "sword" },
  蝉丸: { ja: "蝉丸", en: "Cicadian Schism", reading: "せみまる", kind: "sword" },
  小式部: { ja: "小式部", en: "Accountability", reading: "こしきぶ", kind: "sword" },
  浮雲小太刀: { ja: "浮雲小太刀", en: "Snowcloud", reading: "うきぐもこだち", kind: "sword" },
  毒マムシ: { ja: "毒マムシ", en: "Poison Viper", reading: "どくまむし", kind: "sword" },
  柾重: { ja: "柾重", en: "Spindler", reading: "まさしげ", kind: "sword" },
  蛇蜻蛉: { ja: "蛇蜻蛉", en: "Wyvernfly", reading: "へびとんぼ", kind: "sword" },
  百代草: { ja: "百代草", en: "Hundred-Year Itch", reading: "ももよぐさ", kind: "sword" },
  不語仙: { ja: "不語仙", en: "Silent Song", reading: "ふごせん", kind: "sword" },
  金盞花: { ja: "金盞花", en: "Marigold", reading: "きんせんか", kind: "sword" },
  二心: { ja: "二心", en: "Two Heart", reading: "ふたごころ", kind: "sword" },
  富士ヶ根: { ja: "富士ヶ根", en: "Borrower", reading: "ふじがね", kind: "spear" },
  大文字: { ja: "大文字", en: "Fat Messenger", reading: "だいもんじ", kind: "spear" },
  麒麟児: { ja: "麒麟児", en: "Prodigy", reading: "きりんじ", kind: "spear" },
  焔魔: { ja: "焔魔", en: "Hellgirl", reading: "えんま", kind: "spear" },
  霜柱: { ja: "霜柱", en: "Ice Needle", reading: "しもばしら", kind: "spear" },
  立奈美: { ja: "立奈美", en: "Wisterianum", reading: "たちなみ", kind: "spear" },
  見栄春: { ja: "見栄春", en: "Bloomer", reading: "みえはる", kind: "sword" },
  大天狗: { ja: "大天狗", en: "Great Tengu", reading: "おおてんぐ", kind: "sword" },
  クルセイダー: { ja: "クルセイダー", en: "Crusader", reading: "くるせいだー", kind: "sword" },
  イプスカリバ: { ja: "イプスカリバ", en: "Ipscalibur", reading: "いぷすかりば", kind: "sword" },
  なまくら刀: { ja: "なまくら刀", en: "Blunt Sword", reading: "なまくらがたな", kind: "sword" },
  残月: { ja: "残月", en: "Morning Moon", reading: "ざんげつ", kind: "sword" },
  高楊枝: { ja: "高楊枝", en: "AruKinza Toothpick", reading: "たかようじ", kind: "sword" },
  無天下: { ja: "無天下", en: "Diet Slice", reading: "むてんか", kind: "sword" },
  乃理州: { ja: "乃理州", en: "Norris", reading: "のりす", kind: "sword" },
  蒼伯: { ja: "蒼伯", en: "Choking Earl", reading: "そうはく", kind: "sword" },
  霧単穂: { ja: "霧単穂", en: "Kiritampo", reading: "きりたんぽ", kind: "spear" },
  珍比羅: { ja: "珍比羅", en: "Smackuza", reading: "ちんぴら", kind: "sword" },
  陸奥守吉行: { ja: "陸奥守吉行", en: "Mutsunokami", reading: "むつのかみよしゆき", kind: "sword" },
  虎徹: { ja: "虎徹", en: "Kotetsu", reading: "こてつ", kind: "sword" },
  和泉守兼定: { ja: "和泉守兼定", en: "Izuminokami", reading: "いずみのかみかねさだ", kind: "sword" },
  活火山: { ja: "活火山", en: "Volcano", reading: "かっかざん", kind: "sword" },
  夜葬: { ja: "夜葬", en: "Wildgrass", reading: "やそう", kind: "sword" },
  // 特殊武器（D-15）。英語名は資料にない
  ジャクリーン: { ja: "ジャクリーン", en: null, kind: "special" },
  虎爪: { ja: "虎爪（無手）", en: null, kind: "special" },
  "53年式ライフル": { ja: "53年式ライフル", en: null, kind: "special" },
  竹富士: { ja: "竹富士", en: null, kind: "special" },
  十手: { ja: "十手", en: null, kind: "special" },
  冥澱: { ja: "冥澱", en: null, kind: "special" },
  鬼ヶ島: { ja: "鬼ヶ島", en: null, kind: "special" },
  クズリ爪: { ja: "クズリ爪", en: null, kind: "special" },
  出刃包丁: { ja: "出刃包丁", en: null, kind: "special" },
  エンジェル: { ja: "エンジェル（ライフル）", en: null, kind: "special" },
  カツオ: { ja: "カツオ", en: null, kind: "special" },
  M2リボルバー: { ja: "M2リボルバー", en: null, kind: "special" },
} as const satisfies Record<string, WeaponNameEntry>;

export type WeaponKey = keyof typeof WEAPON_NAMES;

const entry = (key: WeaponKey): WeaponNameEntry => WEAPON_NAMES[key];

/** 表示名。英語名がなければ日本語名で代用する */
export function weaponName(key: WeaponKey, lang: Lang = "ja"): string {
  const e = entry(key);
  return lang === "en" ? (e.en ?? e.ja) : e.ja;
}

/** 検索に使う語（読み・ja・en。ないものは除く） */
export function weaponSearchTerms(key: WeaponKey): string[] {
  const e = entry(key);
  return [e.reading, e.ja, e.en].filter((s): s is string => !!s);
}

export function weaponKind(key: WeaponKey): WeaponKind {
  return entry(key).kind;
}

/** 種別の表示名（選択肢の見出しなど） */
export const WEAPON_KIND_LABELS: Record<WeaponKind, Record<Lang, string>> = {
  sword: { ja: "刀", en: "Sword" },
  spear: { ja: "槍", en: "Spear" },
  special: { ja: "特殊", en: "Special" },
};

const collators: Record<Lang, Intl.Collator> = {
  ja: new Intl.Collator("ja"),
  en: new Intl.Collator("en"),
};

/** 名前順に比べる。ja は読み（なければ ja）の五十音順、en は表示名のアルファベット順 */
export function compareWeaponNames(a: WeaponKey, b: WeaponKey, lang: Lang = "ja"): number {
  const sortKey = (k: WeaponKey) => (lang === "ja" ? (entry(k).reading ?? entry(k).ja) : weaponName(k, "en"));
  return collators[lang].compare(sortKey(a), sortKey(b));
}
