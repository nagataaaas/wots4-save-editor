---
event_id: 78
state_offset: "0x36F6"

title:
  ja: 学問のすすめ
  en: Pursuit of Knowledge

faction:
  name: 真ルート
  route: >-
    真ルートの3日目昼。[闇討ち](best__2_day__strike_in_the_dark.md)で小暮を説得すると起きる。
    3日目夕は J.J の状態と寿司屋の状態で[刺激が欲しい](best__3_day__in_need_of_encouragement.md)か[傷心の帰国船](best__3_day__the_sad_boat_home.md)に分かれる。

summary: >-
  語学所で、茂呂に誘われて来た小暮と一緒に英語と地理の授業を受ける。そこへ御大老の命で語学所を取り潰しに来た一団が現れ、小暮と一緒に戦う。
  そのあと小暮は茂呂と語り合い、病院の赤城に「攘夷で本当に日本は救われるのか」と問いかける。

summary_en: >-
  At the Language School, you take English and geography lessons alongside Kogure, who came at Moro's invitation. A group sent by the Chief Minister to shut the school down appears, and you fight them with Kogure.
  Afterwards Kogure talks with Moro, then asks Akagi at the Hospital, "Will driving out the foreigners really save Japan?"

timing:
  phase: 3日目 昼
  slot: 昼
  note: 昼か夕に語学所へ入ると始まる

location: 町・語学所 →（居留地・病院）

conditions:
  - flag: "0x36F6"
    serial: 78
    test: "<= 2"
    meaning: まだ進行中でない
    confidence: 🟢
  - flag: "0x36F5"
    serial: 77
    test: "== 4"
    meaning: 闇討ちの成功（小暮を説得した）
    confidence: 🟢
  - flag: "0x378E"
    serial: 230
    test: "== 1"
    meaning: 真ルート
    confidence: 🟢
  - flag: 段階
    test: "== 300"
    meaning: 3日目昼
    confidence: 🟢
  - flag: 時間帯
    test: "in [0, 1]"
    meaning: 昼か夕
    confidence: 🟢
  - flag: 現在の地域
    test: "== 9"
    meaning: 町・語学所に入った（入った時点で始まる）
    confidence: 🟢

failure_conditions:
  - flag: "0x378E"
    serial: 230
    test: "== 2"
    meaning: 真ルートを外れた（再起の望みで小暮を倒した、怒りの矛先の成功、小暮が死んでいるときに J.J を倒した、闇討ちの失敗）
    confidence: 🟢
  - flag: "0x374F"
    serial: 167
    test: "== 1"
    meaning: 小暮が死んだ（将の器で小暮を倒した。闇討ちが起きず、成功しない）
    confidence: 🟢

flag_changes:
  - flag: "0x36F6"
    serial: 78
    value: "= 3"
    when: 取り潰しに来た一団との戦闘が始まるとき
    meaning: 進行中
    confidence: 🟢
  - flag: "0x36F6"
    serial: 78
    value: "= 4"
    when: 小暮と赤城の場面が終わったとき
    meaning: イベント成功
    confidence: 🟢
  - flag: 時間帯を進める保留量
    value: "+ 10"
    when: 成功したとき
    meaning: 時間帯を進める
    confidence: 🟢

sources: ["[A]"]
---

# 学問のすすめ（Pursuit of Knowledge）

## 流れ

1. 3日目の昼か夕に語学所へ入ると、その場で始まる。講師が子供たちに「This is a pen !」と教えている
2. 講師と、後ろの席の小暮に話しかけると選択肢が出る（どれも会話のみ）
3. 地理の授業で日本の小ささに小暮が怒る場面のあと、御大老の命で語学所を取り潰しに来た一団が乗り込み、子供たちを追い出そうとする。小暮が「やめろっ」と止める
4. 抜刀するか一団に話しかけると戦闘になり、小暮と一緒に戦う（`0x36F6`（通し番号 78）= 3）。小暮は倒れても死なない（🔶）。全員倒すと次へ。[A] は相手を魔鱗組としている
5. 茂呂と小暮が語学所の授業について語り合い、茂呂が「お前さんも己の心に従って生きるべきではないかな」と言う
6. 小暮が病院の赤城を訪ね、「攘夷で本当に日本は救われるのか」と問うが、赤城は「お前 開国論者の茂呂に洗脳されたな」と突き放す。成功（`0x36F6` = 4）

## 選択肢

| 場面 | 選択肢 | 結果 |
|---|---|---|
| 講師 | 「This is a pen !」 | 会話のみ |
| 講師 | 「どういう意味だ？」 | 「『これはペンだ！』という意味ですよ」 |
| 小暮（1回目） | 「怪しい奴め！」 | 「それがどうした」 |
| 小暮（1回目） | 「小暮か？」 | 「知らん 人違いだ」 |
| 小暮（1回目） | 「やはり来たか」 | 「何のことだ」 |
| 小暮（2回目） | 「無理は良くないぞ」 | 「私語は慎め」 |
| 小暮（2回目） | 「誰かと思えば小暮じゃないか」 | 「斬られたいのか……」 |
| 小暮（2回目） | 「小暮が来たぞー！」 | 「頼むから 静かにしてくれ」 |
| 取り潰しの場面 | 抜刀する／一団に話しかける | 戦闘 |

## 変化する内容

| 対象 | 変化 | 場面 | 確度 |
|---|---|---|---|
| 時間帯を進める保留量 | +10 | 成功 | 🟢 |

- 所持金・勢力の友好度・人物の状態・施設（語学所）の開閉は変わらない
- 最後の場面は赤城が病院で生きている前提の内容になっている

## 前後のイベント

- 前：[闇討ち](best__2_day__strike_in_the_dark.md)（成功時）
- 次：[刺激が欲しい](best__3_day__in_need_of_encouragement.md)（J.J `0x3758` = 4 で寿司屋の店主が生きているとき）／[傷心の帰国船](best__3_day__the_sad_boat_home.md)（J.J が死んでいるか寿司屋の店主が死んでいるとき）

## 未確認のこと

- ❓ 取り潰しの一団との戦闘で負けたとき・逃げたときの扱い（失敗の値 5 は出てこない）
- ❓ 刺激が欲しい・傷心の帰国船の開始条件には、このイベントの成功が含まれていない。このイベントを起こさずに3日目夕を迎えたときも両イベントが起きるか
