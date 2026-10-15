import { tr } from "@/lib/i18n";
import { parseInteger } from "@/lib/parse";
import type { ParseResult } from "@/components/field-row";

/** この画面の数の欄は、どれも0以上の整数 */
export const parseCount = (input: string, validate: (v: number) => string | null): ParseResult<number> =>
  parseInteger(input, validate, {
    error: tr({ ja: "0以上の整数を入力してください", en: "Enter a whole number of 0 or more" }),
  });
