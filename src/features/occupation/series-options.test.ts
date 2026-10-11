import { describe, expect, it } from "vitest";
import { HOMELESS_SERIES_VALUES, POLICE_SERIES_VALUES } from "@/save/flags/occupation";
import { seriesOptions } from "./series-options";

const jobs = [171, 172, 173, 174, 175, 176, 177, 178];
const find = (options: ReturnType<typeof seriesOptions>, value: number) =>
  options.find((option) => option.value === String(value))!;

describe("連続なりわいの選択肢", () => {
  it("DLC と同じく、依頼主に会う前のあとに仕事名の見出しで 受注前・受注済 をまとめる", () => {
    const options = seriesOptions(4, POLICE_SERIES_VALUES, jobs);
    expect(find(options, 0)).toMatchObject({ label: "依頼主に会う前", group: undefined });
    const before = find(options, 20);
    const accepted = find(options, 21);
    expect(before.group).toBe("「督促状」");
    expect(accepted.group).toBe(before.group);
    expect(before.label).toBe("受注前");
    expect(accepted.label).toBe("受注済");
    expect(before.selectedLabel).toBe("「督促状」 受注前");
    expect(accepted.selectedLabel).toBe("「督促状」 受注済");
    expect(find(options, 10).group).toBe(find(options, 11).group);
    expect(find(options, 10).label).toBe("受注前");
  });

  it("既存の選択値をそのまま残す", () => {
    expect(seriesOptions(4, POLICE_SERIES_VALUES, jobs).map((option) => option.value))
      .toEqual(POLICE_SERIES_VALUES.map((state) => String(state.value)));
  });

  it("🟢 おっつぁんは欠番と派生依頼を除いた順で仕事名をまとめる", () => {
    const options = seriesOptions(7, HOMELESS_SERIES_VALUES, [195, 196, 197, 199, 201, 202, 203, 204, 205, 206]);
    expect(find(options, 80).group).toBe(find(options, 81).group);
    expect(find(options, 80).group).toMatch(/^「.+」$/);
    expect(find(options, 80).label).toBe("受注前");
    // 🟢 小鳩・おっつぁんの81には受注の割り当てがない。表示変更で受注扱いにしない。
    expect(find(options, 81).label).toBe("受注済（受注中にはならない）");
  });

  it("🟢 8件目のあとは、値とその会話を「8件目の仕事名」のあと・すべて終えた の見出しで出す", () => {
    const options = seriesOptions(4, POLICE_SERIES_VALUES, jobs);
    expect(find(options, 97)).toMatchObject({
      label: "出された浪人（虎鉄）に礼を言われた（野戸仏の話はまだ）",
      group: "「真犯人」のあと",
    });
    expect(find(options, 100)).toMatchObject({
      label: "野戸仏の話も虎鉄の礼も済み、岡っ引きの仕事をやり遂げた",
      group: "すべて終えた",
    });
    expect(find(options, 102)).toMatchObject({ label: "熊神が亡くなった", group: "すべて終えた" });
  });
});
