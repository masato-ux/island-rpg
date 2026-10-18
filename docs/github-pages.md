# iPhoneで遊ぶためのGitHub Pages公開

公開用ワークフローは `.github/workflows/pages.yml` です。`main` または `feat/browser-rpg-foundation` へのpushでビルド・単体テスト・PC／スマホ相当のブラウザテストを行い、成功した `dist/` をGitHub Pagesへ配信します。PRの作成だけでは公開せず、上記ブランチへのpushで公開内容を更新します。

初回のPages有効化も自動処理で試みますが、GitHub側の権限・リポジトリの公開設定・契約によっては管理画面での設定が必要です。非公開リポジトリでもPagesのサイトが一般公開になる場合があります。公開対象はビルドしたゲームのみで、ローカルのセーブや秘密情報は含みません。

## 初回だけ必要になる操作

1. GitHubで `masato-ux/island-rpg` を開きます。
2. リポジトリの **Settings → Pages** を開きます。Settingsが見当たらない場合は、リポジトリ上部の追加メニューを確認してください。管理権限が必要です。
3. **Build and deployment → Source** を **GitHub Actions** に設定します。
4. **Actions → Publish game to GitHub Pages** を開き、実行中または直近の実行結果を確認します。設定前に失敗していた場合は、その実行を開いて **Re-run all jobs** を選びます。
5. 成功後、実行結果の `deploy` に表示される公開URLを開きます。`Settings → Pages` にもURLが表示されます。

標準の公開先候補は `https://masato-ux.github.io/island-rpg/` です。公開成功を確認するまでは、利用可能なURLとして扱わないでください。カスタムドメインが設定されている場合はGitHubが表示するURLを使います。

このクラウド環境ではGitHubの設定APIがForbiddenのため、Pages設定やActionsの成功をAPIで確認できません。ワークフローのpushと、サイトが公開されたことは別です。

## 実行が止まった場合

- `build` が失敗：Actionsの赤いステップのログを確認します。テスト失敗時は公開しません。
- `deploy` がPages未設定・権限エラー：上記のSource設定を確認します。Pagesの項目が使えない場合は、GitHubが示す公開範囲・契約の条件を確認します。リポジトリを無断で公開へ変更する必要はありません。
- `github-pages` 環境でブランチが拒否：Settings → Environments → github-pages のDeployment branches and tagsに、`feat/browser-rpg-foundation` を許可します。`main` にも同じワークフローがある状態でPRをマージした後は、mainからの公開も可能です。
- 承認待ち：Actionsに表示される環境の承認を行います。公開成功後のURLから実機テストを開始します。

## iPhoneで最初に確認すること

Safariで公開URLを開き、主人公の表示・十字キー長押しと停止・画面回転・ホームに戻って復帰を確認してください。続いてダンの案内、村長から魂の楔を取得、メニューで保存、再読込後に「続きから」を確認します。詳しい手順は `validation.md` にあります。

更新後はゲームのタブをすべて閉じてからURLを開き直してください。保存はこのサイトを開いたブラウザ内です。別のURLやプライベートブラウズへ移る前にJSONを書き出してください。
