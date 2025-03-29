# TODOアプリケーション要件定義・設計ドキュメント

## 要件定義

### 機能要件

1. **タスク管理**
   - タスクの作成・閲覧・更新・削除（CRUD操作）
   - タスクのステータス管理（未完了・進行中・完了など）
   - 期限設定と通知機能
   - タグ/カテゴリによる分類

2. **ユーザー管理**
   - Google認証によるユーザー登録・ログイン
   - ユーザープロファイル管理

3. **共有機能**
   - チームでのタスク共有（将来的な拡張）

### 非機能要件

1. **スケーラビリティ**
   - 将来的な大規模化に備えた設計
   - 段階的な拡張が可能なアーキテクチャ

2. **可用性**
   - ダウンタイムを最小化
   - エラー処理の適切な実装

3. **パフォーマンス**
   - 迅速なレスポンス時間
   - 効率的なデータアクセス

4. **セキュリティ**
   - 適切な認証・認可の実装
   - データ保護とプライバシー確保

5. **コスト効率**
   - 初期段階でのコスト最小化
   - 無料枠の最大活用

## アーキテクチャ設計

### 全体構成

```
[Next.js Frontend] → [Cloudflare Pages]
        ↓
[Backend API] → [Cloudflare Workers + Hono]
        ↓
[Database] → [Supabase (PostgreSQL)]
        ↓
[Auth] → [Supabase Auth]
```

#### 認証フロー
1. ユーザーがGoogleログインボタンをクリック
2. Supabaseの認証機能を使用してGoogle OAuth認証
3. 認証後、コールバックURLにリダイレクト
4. ユーザー情報を取得しセッション確立
5. ダッシュボードページへリダイレクト

#### 状態管理
- SWR/React Queryを使用したデータフェッチング
- Supabaseクライアントを通じたリアルタイム更新（将来的な拡張）
- 楽観的UIアップデートの実装

### バックエンド設計

#### 技術スタック
- **フレームワーク**: Hono.js
- **実行環境**: Cloudflare Workers
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth + JWT検証

#### データベース設計

**テーブル構造**:
```sql
-- ユーザーテーブル（Supabaseが自動生成するauthスキーマを活用）
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- タスクテーブル
CREATE TABLE public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
```

#### セキュリティ設計

**行レベルセキュリティポリシー（RLS）**:
```sql
-- プロファイルのRLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "プロファイルは本人のみ参照可能" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
  
CREATE POLICY "プロファイルは本人のみ更新可能" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- タスクのRLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "タスクは所有者のみ参照可能" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "タスクは所有者のみ更新可能" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "タスクは所有者のみ削除可能" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);
  
CREATE POLICY "タスクは所有者のみ作成可能" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### API エンドポイント

1. **認証関連**
   - Supabase Authによる管理（バックエンドAPIは不要）

2. **タスク管理**
   - `GET /api/tasks` - タスク一覧取得
   - `POST /api/tasks` - タスク作成
   - `GET /api/tasks/:id` - 特定タスク取得
   - `PUT /api/tasks/:id` - タスク更新
   - `DELETE /api/tasks/:id` - タスク削除

3. **ユーザー管理**
   - `GET /api/users/me` - 現在のユーザー情報取得
   - `PUT /api/users/me` - ユーザー情報更新

## 段階的実装計画

### Phase 1（MVP）
- Google認証によるユーザー登録・ログイン
- 基本的なタスクCRUD機能
- シンプルなUI実装

### Phase 2（機能拡張）
- タグ/カテゴリ機能追加
- タスクの期限設定と通知
- UI/UXの改善

### Phase 3（スケーリング）
- チーム共有機能の実装
- パフォーマンス最適化
- 高度な検索・フィルタリング機能

## コスト効率

### 初期段階（無料枠内）
- Supabase無料プラン（500MBまでのデータベース）
- Cloudflare Workers無料枠（毎日10万リクエストまで）
- Cloudflare Pagesの無料ホスティング

### 成長段階
- Supabaseのプロプラン（$25/月）
- Cloudflare Workersの有料プラン（必要に応じて）

### 大規模化
- 複数のCloudflare Workersへの分割（マイクロサービス化）
- Supabaseのデータベース拡張またはマネージドPostgreSQLへの移行

## 将来的な拡張可能性

1. **リアルタイム機能**
   - Supabaseのリアルタイムサブスクリプションを活用

2. **オフラインサポート**
   - PWA実装によるオフライン操作対応

3. **高度な分析**
   - タスク完了率や生産性分析機能

4. **多言語対応**
   - 国際化（i18n）の実装

5. **Compute-Storage分離**
   - 大規模化に備えたデータベースアーキテクチャの進化