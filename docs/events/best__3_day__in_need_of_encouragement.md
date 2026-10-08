---
event_id: 79
state_offset: "0x36F7"

title:
  ja: 刺激が欲しい
  en: In Need of Encouragement

faction:
  name: 真ルート
  route: >-
    真ルートの3日目夕。[伯爵に刺激を](best__2_day__down_for_the_count.md)で J.J と友になり、寿司屋の店主が生きているときに起きる。
    成功すると3日目夜の[伯爵救出](best__3_day__rescuing_the_count.md)へ進む。

summary: >-
  寿司屋に入ると、J.J が寿司屋の店主に弟子入りして寿司を握っている。J.J の寿司を食べたあと、御大老の命で J.J が「日本の伝統文化を汚した罪」で連行され、
  店主に J.J を助けてほしいと頼まれる。会話のみで戦闘はない。

timing:
  phase: 3日目 夕
  slot: なし
  note: 寿司屋に入ると始まる

location: 港・寿司屋

conditions:
  - flag: "0x36F7"
    serial: 79
    test: "<= 2"
    meaning: まだ進行中でない（「店を間違えたようだ」で出た場合を含む）
    confidence: 🟢
  - flag: "0x3758"
    serial: 176
    test: "== 4"
    meaning: J.J と友になった（伯爵に刺激をの成功）
    confidence: 🟢
  - flag: "0x37F9"
    serial: 337
    test: "== 0"
    meaning: 寿司屋の店主が生きている
    confidence: 🟢
  - flag: "0x378E"
    serial: 230
    test: "== 1"
    meaning: 真ルート
    confidence: 🟢
  - flag: 段階
    test: "== 310"
    meaning: 3日目夕
    confidence: 🟢
  - flag: 現在の地域
    test: "== 22"
    meaning: 港・寿司屋に入った（入った時点で始まる）
    confidence: 🟢

failure_conditions:
  - flag: "0x378E"
    serial: 230
    test: "== 2"
    meaning: 真ルートを外れた（再起の望みで小暮を倒した、怒りの矛先の成功、小暮が死んでいるときに J.J を倒した、闇討ちの失敗）
    confidence: 🟢
  - flag: "0x3758"
    serial: 176
    test: "== 1"
    meaning: J.J が死んだ（運命のルーレットの成功、伯爵に刺激をで J.J を倒した。代わりに傷心の帰国船が起きる）
    confidence: 🟢
  - flag: "0x37F9"
    serial: 337
    test: "== 1"
    meaning: 寿司屋の店主が死んだ（代わりに傷心の帰国船が起きる）
    confidence: 🔶

flag_changes:
  - flag: "0x36F7"
    serial: 79
    value: "= 2"
    when: 「店を間違えたようだ」を選んで店を出たとき
    meaning: 出直し（もう一度入ると始めからやり直す）
    confidence: 🟢
  - flag: "0x36F7"
    serial: 79
    value: "= 4"
    when: J.J が連行され、店主に頼まれる場面が終わったとき
    meaning: イベント成功
    confidence: 🟢
  - flag: "0x3758"
    serial: 176
    value: "= 5"
    when: 成功したとき
    meaning: J.J が捕らえられた（伯爵救出の前提）
    confidence: 🟢
  - flag: 時間帯を進める保留量
    value: "+ 10"
    when: 成功したとき
    meaning: 時間帯を進める
    confidence: 🟢

sources: ["[A]"]
---

# 刺激が欲しい（In Need of Encouragement）

## 流れ

1. 3日目夕に寿司屋に入ると、その場で始まる。板前姿の J.J が「ヘイ らっしゃい！」と迎える
2. J.J への選択肢。「店を間違えたようだ」を選ぶと店を出て、状態が 2 になる（入り直すとやり直し）
3. J.J は店主に弟子入りしたと話し、寿司を握る。食べたあと味を聞かれて選択肢（どれも会話のみ）
4. 寿司屋に来た侍が J.J の寿司を褒めたあと、「英国副使・ジェット・ジェンキンス伯爵だな？」と、御大老の命で J.J を連行する。琴吹（代官）も止められない
5. 店主に「あっしの弟子を助けてやって下せえ」と頼まれる。成功（`0x36F7`（通し番号 79）= 4、J.J `0x3758`（通し番号 176）= 5）
6. 店にアイテムが置かれる（[A] では「伯爵の寿司」が手に入る）

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| 入店時 | 「その格好は！？」 | J.J が弟子入りを話す。先へ進む |
| 入店時 | 「何か握って貰おうか」 | 「あいよ！」。先へ進む |
| 入店時 | 「店を間違えたようだ」 | 店を出る。`0x36F7` = 2 |
| 寿司を食べたあと | 「旨い！」 | 「本当かい！それは良かった」 |
| 寿司を食べたあと | 「食えたもんじゃない…」 | 「まだまだ修行が足りないな」 |
| 寿司を食べたあと | 「何とも言えん」 | 「もう少し改良が必要だな」 |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| J.J `0x3758`（通し番号 176） | 4 → 5（捕らえられた） | 成功 | 🟢 |
| アイテム | 店に置かれたものを拾える（[A] では伯爵の寿司） | 成功 | 🔶 |
| 時間帯を進める保留量 | +10 | 成功 | 🟢 |

- [A] は「終了で希望の光・ED が確定」としている。このイベントで真ルート `0x378E` は書き換えない

## 前後のイベント

- 前：[学問のすすめ](best__3_day__pursuit_of_knowledge.md)（[伯爵に刺激を](best__2_day__down_for_the_count.md)の成功が前提）
- 次：[伯爵救出](best__3_day__rescuing_the_count.md)

## 未確認のこと

- 🔶 置かれるアイテムが伯爵の寿司（[items](../save_format/datatable/item/item.csv) の `0x0001`）か
- ❓ 開始条件に学問のすすめの成功は含まれていない。学問のすすめを起こさずに3日目夕を迎えたときも起きるか
- 🔶 寿司屋の店主の状態 `0x37F9` が 1 になる場面（店主を斬ったときとみられる）と、1 から戻らないこと
- ❓ 「希望の光・ED が確定」[A] の意味（このイベントの成功が結末の条件に使われるか）
