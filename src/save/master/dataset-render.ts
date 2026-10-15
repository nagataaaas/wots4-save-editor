// docs/save_format/datatable/**/*.csv から src/save/master/dataset/*.ts を作る（pnpm gen:dataset）。
// ファイルの読み書きは scripts/gen-dataset.ts。ここは文字列から文字列への変換だけを持ち、
// テスト（dataset.test.ts）で生成物が CSV と同じ内容かを確かめるのにも使う。
//
// 生成物：id_dec をキーにした `as const` のオブジェクト。型の上でも値（名前など）が分かるので、
// nameOf.npc(40) にカーソルを当てると返り値の文字列が見える。
// 出す列は DATASET_COLUMNS の許可リストで CSV ごとに決める（AGENTS.md「datatable から生成するデータは、画面で使う列だけを出力する」）。
// リストにない列（id_hex・save_bytes_le・source・備考・status など）は出さない。id_dec はいつも出す。
// 列の種類もリストで決める（全部空の列でも CSV ごとに "" と null に分かれないように）：
//   'string'：そのままの文字列（空は ""）
//   'number'：整数・小数・0x で始まる16進数を数値にする（空は null）。読めない値があれば生成を止める
//   並びの形式（ListKind）：生成時に形式を検証して配列へ変換する（空は []）
// 備考・status は確度が入るので出さない（下の DERIVED_COLUMNS で変換したものだけ出す）。

/** RFC 4180 の CSV を行・列に分ける（"..." の中のカンマ・改行・"" に対応） */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const DECIMAL = /^-?\d+(\.\d+)?$/;
const HEX = /^0x[0-9a-f]+$/i;
type ListKind =
  /** "0x10;0xFF" → [16, 255] */
  | 'hex-list'
  /** "07 00 A2" → [7, 0, 162] */
  | 'bytes'
  /** "41 02 0A 00 61 00" → [65, 2, 10, 0, 97, 0]。空か 6 B */
  | 'bytes-6'
  /** "46 01 FF FF …"（8 B）→ u16 LE ×4、FFFF は −1 */
  | 'models'
  /** "足|小物||" → 層4つ */
  | 'meshes'
  /** "299 300|309||" → 層4つの番号の並び */
  | 'textures'
  /** "2 3" → [2, 3] */
  | 'numbers'
  /** "投げ・防御" → ["投げ", "防御"] */
  | 'attrs';

export type ColumnKind = 'string' | 'number' | ListKind;
/** 出す列（列名 → 種類）。id_dec は書かない（いつも数値で出す） */
export type DatasetColumns = Readonly<Record<string, ColumnKind>>;

const S = 'string';
const N = 'number';

const NAMES = { name_ja: S, name_en: S } as const;
const APPEARANCE_PART = {
  ...NAMES,
  gender: S,
  save_models: 'models',
  layer_meshes: 'meshes',
  layer_textures: 'textures',
} as const;
const APPEARANCE_PART_FULL = { ...APPEARANCE_PART, alias_ja: S, alias_en: S, crash: N, cloth_id: N, unlock_id: N, dlc: N } as const;

/**
 * 出す列の許可リスト（datatable からの相対パス → 列 → 種類）。コードから使う列だけを書く。
 * 使う列を増やすときはここに足す。CSV にない列を書くと生成を止める
 */
export const DATASET_COLUMNS: Readonly<Record<string, DatasetColumns>> = {
  'accessory/accessory.csv': {
    ...NAMES, part: S, dlc: N, shop: N, menu_order: N, description_ja: S, description_en: S,
    default_attachment_id: N, default_attachment_ja: S, default_attachment_en: S,
    default_position_x: N, default_position_y: N, default_position_z: N,
    default_rotation_x: N, default_rotation_y: N, default_rotation_z: N,
    default_size: N,
  },
  'appearance/body.csv': { ...APPEARANCE_PART, alias_ja: S, alias_en: S, crash: N },
  'appearance/cloth.csv': { ...NAMES, category: S, dlc: N, description_ja: S, description_en: S },
  'appearance/extra.csv': { ...APPEARANCE_PART, kind: S, cloth_id: N, unlock_id: N, dlc: N },
  'appearance/face.csv': APPEARANCE_PART_FULL,
  'appearance/feet.csv': APPEARANCE_PART_FULL,
  'appearance/hair.csv': APPEARANCE_PART_FULL,
  'appearance/lower.csv': APPEARANCE_PART_FULL,
  'appearance/upper.csv': APPEARANCE_PART_FULL,
  'appearance/outfit.csv': { ...NAMES, description_ja: S, description_en: S, cloth_id: N, unlock_id: N },
  'appearance/person.csv': {
    ...NAMES, dlc: N, height: N,
    upper: N, lower: N, face: N, hair: N, body: N, feet: N, gauntlet: N, leggings: N, apron: N, cape: N,
    body_kind: S, second_id: N, hair_color: N, selectable: N,
  },
  'event/chart-cell.csv': { col: N, row: N, type: S, node: N, shape: N, hidden: N },
  'event/chart-node.csv': { ...NAMES, event_id: N, phase: N, route: S },
  'event/event.csv': { ...NAMES, day: S },
  'item/item.csv': {
    ...NAMES, reading: S, kind: N, max_stack: N, use_action: N, description_ja: S, description_en: S,
  },
  'item/valuable.csv': NAMES,
  'npc/night-visit-count.csv': { npc: N },
  'npc/night-visit-partner.csv': {
    ...NAMES, kind: S, sex: S, name_list: N, name: N, looks: 'hex-list',
    age: N, age_random: N, blood: N, group: N, row: N, note_en: S,
  },
  'npc/npc-look.csv': { ...NAMES, sex: S, used_by: S, used_by_en: S },
  'npc/npc-name.csv': { ...NAMES, sex: S },
  'npc/pupil.csv': { ...NAMES, sex: S, point: N, name: N, looks: 'hex-list' },
  'npc/townsfolk-person.csv': { npc: N, second_npc: N, separator: S, suffix: S, group: S, display_order: N },
  'occupation/occupation.csv': {
    ...NAMES, client_ja: S, client_en: S, type: S, alignment: S, reward: N, bonus: N, deadline_days: N, note_en: S,
  },
  'place/night-visit-layout.csv': {
    ...NAMES, house: S, people: N, people_maybe: N, dog: N, futon: N, rival: N, doshin: N, okappiki: N,
  },
  'place/night-visit-place.csv': { ...NAMES, layout: 'hex-list' },
  'place/night-visit-row.csv': { save_bytes_le: 'bytes', ...NAMES, stage: N, group: N, place: N, layout: N },
  'place/start-location.csv': { ...NAMES, crash: N, warning_ja: S, warning_en: S },
  'sect/sect.csv': {
    ...NAMES, stance: N, slot: N, sheet1: N, sheet2: N, sheet3: N,
    thr1: N, thr2: N, thr3: N, thr4: N, scroll_no: N,
  },
  'sect/sheet-skill.csv': {
    sheet: N, skill_no: N, skill_id: N, ...NAMES, cond: N, cond_ja: S, cond_en: S, rank: N, points: N, parent: N,
  },
  'sect/skill-sheet.csv': { stance: N, ...NAMES },
  'sect/skill.csv': {
    ...NAMES, command: N, command_ja: S, command_en: S, defense_group: N, attack: N, points: N, attrs: 'attrs',
  },
  'sect/stance-skill.csv': {
    stance: N, skill_no: N, skill_id: N, ...NAMES, first: N, next: 'numbers', prev: 'numbers',
  },
  'sect/stance.csv': { ...NAMES, slot: N },
  'unlock/unlock.csv': { ...NAMES, category: S, condition_ja: S, condition_en: S, effect_ja: S, effect_en: S },
  'weapon/blade.csv': { save_bytes_le: 'bytes', ...NAMES, sheath_x: N },
  'weapon/blade-special.csv': NAMES,
  'weapon/charm.csv': NAMES,
  'weapon/complete.csv': {
    ...NAMES, reading: S, blade: N, sheath_x: N, guard: N, grip: N, weapon_type: N,
    unique_bytes: 'bytes-6', name_no: N, flag_22: N, image_url: S,
  },
  'weapon/grip.csv': { save_bytes_le: 'bytes', ...NAMES },
  'weapon/guard.csv': { save_bytes_le: 'bytes', ...NAMES },
  'weapon/title.csv': { save_bytes_le: 'bytes', ...NAMES },
};

function listValue(kind: ListKind, text: string): unknown {
  const numbers = (value: string, separator: RegExp, hex = false): number[] => {
    if (!value.trim()) return [];
    return value.trim().split(separator).map(token => {
      if (!(hex ? /^(?:0x)?[0-9a-f]+$/i : /^-?\d+$/).test(token)) throw new Error(`配列の値が読めません: ${token}`);
      const n = hex ? parseInt(token, 16) : Number(token);
      if (!Number.isSafeInteger(n)) throw new Error(`配列の値が大きすぎます: ${token}`);
      return n;
    });
  };
  if (kind === 'hex-list') return numbers(text, /;/, true);
  if (kind === 'numbers') return numbers(text, /\s+/);
  if (kind === 'attrs') return text ? text.split('・') : [];
  if (kind === 'meshes' || kind === 'textures') {
    const layers = text.split('|');
    if (layers.length !== 4) throw new Error('層は4つ必要です');
    return kind === 'meshes' ? layers : layers.map(layer => numbers(layer, /\s+/));
  }
  const bytes = numbers(text, /\s+/, true);
  if (bytes.some(b => b < 0 || b > 255)) throw new Error('バイトは00〜FFの範囲です');
  if (kind === 'bytes') return bytes;
  if (kind === 'bytes-6') {
    if (bytes.length !== 0 && bytes.length !== 6) throw new Error('空か6バイト必要です');
    return bytes;
  }
  if (bytes.length !== 8) throw new Error('8バイト必要です');
  return [0, 2, 4, 6].map(i => {
    const n = bytes[i] | (bytes[i + 1] << 8);
    return n === 0xffff ? -1 : n;
  });
}

/** 1つの値を生成物の式にする */
function columnValue(kind: ColumnKind, text: string): string {
  if (kind === 'string') return JSON.stringify(text);
  if (kind === 'number') {
    if (text === "") return "null";
    if (!DECIMAL.test(text) && !HEX.test(text)) throw new Error(`数値ではありません: ${text}`);
    return String(Number(text));
  }
  return JSON.stringify(listValue(kind, text));
}

/** 読めない値のエラーに、どのファイル・列・行かを添える */
function columnValueAt(kind: ColumnKind, text: string, where: string): string {
  try {
    return columnValue(kind, text);
  } catch (e) {
    throw new Error(`${where}: ${e instanceof Error ? e.message : String(e)}`, { cause: e });
  }
}

/** 確度の記号・語・U-n / D-n。これを含む文字列は生成物に出さない */
export const CERTAINTY_PATTERN =
  /✅|🟢|🟡|🔶|❓|未確認|要ゲーム内確認|確認済み|未検証|推測|推定|確度|判定待ち|U-[0-9]+|D-[0-9]+/;

/** 確度の入る列。許可リストに書けない（AGENTS.md「UI に確度を出さない」）。画面で使うものだけを DERIVED_COLUMNS で変えて出す */
const CERTAINTY_COLUMNS = new Set(["備考", "status"]);

/** from 列の値を、確度を含まない文字列としてそのまま出す（含んでいたら生成を止める） */
type DerivedColumn = { name: string; from: string };

/**
 * 確度の入る列から作る列（datatable からの相対パス → 列）。画面で使うものだけ。
 * 英語（note_en）は CSV の列にあり、DATASET_COLUMNS から出す
 */
const DERIVED_COLUMNS: Readonly<Record<string, readonly DerivedColumn[]>> = {
  // 選択肢のラベルに添える注記（「夜這い用の姿」など）
  "npc/night-visit-partner.csv": [{ name: "note_ja", from: "備考" }],
  // なりわいの一覧の InfoTip
  "occupation/occupation.csv": [{ name: "note_ja", from: "備考" }],
};

/** "npc/npc-name.csv" → { file: "npc-name.ts", name: "NPC_NAME_TABLE" } */
export function datasetNameOf(csvPath: string): { file: string; name: string } {
  const base = csvPath.replace(/^.*\//, "").replace(/\.csv$/, "");
  return { file: `${base}.ts`, name: `${base.replace(/-/g, "_").toUpperCase()}_TABLE` };
}

/**
 * csvPath は datatable からの相対パス（"npc/npc-name.csv"）。
 * spec は出す列（省略時は DATASET_COLUMNS の csvPath の行。テストで別の列を渡す）
 */
export function renderDataset(csvPath: string, text: string, spec: DatasetColumns | undefined = DATASET_COLUMNS[csvPath]): string {
  if (!spec) throw new Error(`${csvPath} の出す列が DATASET_COLUMNS にありません`);
  const [header, ...body] = parseCsv(text.replace(/^﻿/, ""));
  const rows = body.filter((r) => r.length > 1);
  const idCol = header.indexOf("id_dec");
  if (idCol < 0) throw new Error(`${csvPath} に id_dec 列がありません`);

  for (const name of Object.keys(spec)) {
    if (name === "id_dec" || CERTAINTY_COLUMNS.has(name)) throw new Error(`${csvPath} の ${name} 列は出す列に書けません`);
    if (!header.includes(name)) throw new Error(`${csvPath} に ${name} 列がありません`);
  }
  // CSV の列の順に出す
  const columns = header
    .map((name, i) => ({ name, i, kind: spec[name] }))
    .filter((c): c is { name: string; i: number; kind: ColumnKind } => Object.hasOwn(spec, c.name));

  const derived = (DERIVED_COLUMNS[csvPath] ?? []).map((d) => {
    const i = header.indexOf(d.from);
    if (i < 0) throw new Error(`${csvPath} に ${d.from} 列がありません`);
    if (header.includes(d.name)) throw new Error(`${csvPath} の ${d.name} 列が作る列と重なります`);
    return { ...d, i };
  });

  const seen = new Set<number>();
  let prev = -Infinity;
  const lines = rows.map((r) => {
    const id = Number(r[idCol]);
    if (!Number.isInteger(id)) throw new Error(`${csvPath} の id_dec が整数ではありません: ${r[idCol]}`);
    if (seen.has(id)) throw new Error(`${csvPath} の id_dec が重複しています: ${id}`);
    if (id < prev) throw new Error(`${csvPath} の id_dec が昇順ではありません: ${id}`);
    seen.add(id);
    prev = id;
    const fields = [`"id_dec": ${id}`];
    for (const c of columns) {
      const value = columnValueAt(c.kind, r[c.i] ?? "", `${csvPath} の ${c.name} 列（id_dec ${id}）`);
      fields.push(`${JSON.stringify(c.name)}: ${value}`);
    }
    for (const d of derived) {
      const v = r[d.i] ?? "";
      if (CERTAINTY_PATTERN.test(v))
        throw new Error(`${csvPath} の ${d.from} 列（id_dec ${id}）に確度の表記があり、${d.name} に出せません: ${v}`);
      fields.push(`${JSON.stringify(d.name)}: ${JSON.stringify(v)}`);
    }
    return `  ${id}: { ${fields.join(", ")} },`;
  });

  const { name } = datasetNameOf(csvPath);
  return [
    `// 生成ファイル。docs/save_format/datatable/${csvPath} から pnpm gen:dataset で作る。直接編集しない。`,
    `export const ${name} = {`,
    ...lines,
    `} as const;`,
    "",
  ].join("\n");
}
