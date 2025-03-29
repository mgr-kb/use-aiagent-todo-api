src/
├── index.ts                   # アプリケーションエントリーポイント
├── config/                    # 設定ファイル
│   └── index.ts               # 環境変数管理
├── middleware/                # ミドルウェア
│   ├── auth.ts                # Supabase JWT検証
│   └── error.ts               # エラーハンドリング
├── routes/                    # ルーティング
├── controllers/               # コントローラー
├── services/                  # サービス（ビジネスロジック）
├── models/                    # データモデル
└── utils/                     # ユーティリティ
    ├── supabase.ts            # Supabaseクライアント
    ├── validation.ts          # バリデーション
    └── error.ts               # エラー定義