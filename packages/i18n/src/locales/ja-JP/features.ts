const features = {
  heading: "このボイラープレートを選ぶ理由",
  subheading:
    "本番グレードのフルスタックアーキテクチャ — データベースからデプロイまで全レイヤーを網羅、実戦テスト済み",
  trpc: {
    title: "エンドツーエンド型安全",
    desc: "Rust の DTO から ts-rs で TypeScript 型を自動生成、Zod v4 バリデーションと組み合わせ、ランタイムオーバーヘッドゼロの完全な型安全",
  },
  ssr: {
    title: "React 19 + React Router v7",
    desc: "最先端の React アーキテクチャ — ファイルベースルーティング、クライアントローダー、コード分割、TanStack Query v5 によるサーバー状態管理",
  },
  db: {
    title: "Sea-ORM + PostgreSQL 18",
    desc: "型安全なクエリとコネクションプーリングを備えた Rust 非同期 ORM、Prisma によるゼロダウンタイムスキーママイグレーション",
  },
  backend: {
    title: "Rust (Axum) バックエンド",
    desc: "超高速非同期 Web フレームワーク — jemalloc 搭載の単一バイナリにコンパイル、メモリ安全でゼロコスト抽象化",
  },
  tailwind: {
    title: "TailwindCSS 4 + ダークモード",
    desc: "CSS 変数テーマシステムによるユーティリティファーストスタイリング、ライト/ダークモード、サードパーティ不要の自社コンポーネントライブラリ",
  },
  devtools: {
    title: "厳格な開発ツールチェーン",
    desc: "Cargo ワークスペース + clippy pedantic lint、rustfmt、TypeScript 用 Biome、Turborepo によるオーケストレーションビルド",
  },
  deploy: {
    title: "ワンコマンドデプロイ",
    desc: "マルチステージ Docker ビルド — Rust バイナリ + 組み込み SPA 静的ファイル、SSH でワンコマンドデプロイ",
  },
  multiplatform: {
    title: "Web + ミニプログラム + WASM",
    desc: "React SPA、WeChat ミニプログラム（Taro 4）、WebAssembly モジュール — 1 つのモノレポから 3 プラットフォーム",
  },
};

export default features;
