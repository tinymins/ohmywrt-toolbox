const features = {
  heading: "為什麼選擇這個模板",
  subheading: "生產級全端架構——從資料庫到部署的每一層，千錘百煉、開箱即用",
  trpc: {
    title: "端到端類型安全",
    desc: "Rust DTO 透過 ts-rs 自動生成 TypeScript 類型，搭配 Zod v4 驗證——零執行時開銷，全鏈路類型安全",
  },
  ssr: {
    title: "React 19 + React Router v7",
    desc: "最前沿 React 架構——檔案路由、客戶端載入器、程式碼分割與 TanStack Query v5 伺服器狀態管理",
  },
  db: {
    title: "Sea-ORM + PostgreSQL 18",
    desc: "Rust 非同步 ORM，類型安全查詢與連線池管理，配合 Prisma 實現零停機 Schema 遷移",
  },
  backend: {
    title: "Rust (Axum) 後端",
    desc: "極速非同步 Web 框架——搭載 jemalloc 編譯為單一二進位檔案，記憶體安全、零開銷抽象",
  },
  tailwind: {
    title: "TailwindCSS 4 + 深色模式",
    desc: "原子化 CSS 搭配 CSS 變數主題系統，亮/暗模式切換，自研元件庫無需第三方 UI 框架",
  },
  devtools: {
    title: "嚴格開發工具鏈",
    desc: "Cargo Workspace + clippy pedantic 靜態分析、rustfmt、TypeScript Biome 檢查、Turborepo 編排構建",
  },
  deploy: {
    title: "一鍵部署",
    desc: "多階段 Docker 構建——Rust 二進位 + 嵌入式 SPA 靜態檔案，SSH 一鍵部署到任意伺服器",
  },
  multiplatform: {
    title: "Web + 小程式 + WASM",
    desc: "React SPA、微信小程式（Taro 4）與 WebAssembly 模組——一個 Monorepo 三大平台",
  },
};

export default features;
