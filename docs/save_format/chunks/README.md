# chunks

セーブファイルの範囲ごとのまとまり。1まとまり＝1ディレクトリ。一覧は `../README.md` §3。

```text
chunks/
  _templates/            ← コピー元。直接編集しない
    README.md
    reserch/
      README.md
      TEMPLATE.md
  {chunk_slug}/
    README.md            ← そのまとまりの現時点の仕様
    reserch/
      README.md          ← 調査ファイルの目次
      {yyyy-mm-dd}_{topic}.md
```

## まとまりの追加

1. `_templates/` を `{chunk_slug}/` としてコピーする
2. `{chunk_slug}/README.md` を書く
3. 調査の記録があれば `reserch/` に置き、`reserch/README.md` の目次に足す
4. `../README.md` §3 の表に1行足す

## 命名

- `{chunk_slug}`：英小文字のケバブケース。中身を表す名詞にする（例：`weapon-record`、`money`、`night-visit`）
- 調査ファイル：`{yyyy-mm-dd}_{topic}.md`。日付は差分を取った日（例：`2026-10-05_shop-diff.md`）

## まとまりの単位

- 1つの構造（レコードの形）を共有する範囲は1まとまりにする（例：帯刀中・武器袋・武器箪笥は同じ武器レコードなので `weapon-record`）
- 意味が近くても、離れた位置にあり構造が違うものは分ける
- 迷ったら分ける。統合は後からでもできる
