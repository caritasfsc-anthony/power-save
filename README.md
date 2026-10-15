# 慳電英雄｜黑房揀燈

明愛（Caritas）慳電教育互動體驗——用 **Three.js** 走進一間幾乎全黑的房間，揀 LED／慳電燈／鎢絲燈，即時睇光色、亮度同耗電。

**Caritas energy-saving education** — an interactive Three.js dark-room where you pick a bulb type and see lighting + electricity cost update in real time.

---

## 功能 Highlights

- 🌑 開場冇光源（只有微弱輪廓）
- 💡 三種燈：LED（冷白）、慳電燈 CFL、鎢絲燈（暖黃）
- 📊 即時顯示總瓦數、每月度數、電費、相對鎢絲慳電 %
- ⚖️ 「同等亮度」模式：LED ≈ 9W · 慳電燈 ≈ 14W · 鎢絲 ≈ 60W（約 800 流明）
- 🔢 燈泡數量 1–8、每日使用時數、電費單價可調（預設中電約 $1.41／度；可切港燈約 $1.63）
- ❄️ 窗口式冷氣（約 900 W）＋雪櫃（約計 120 W）可開關，計入總瓦數／月費
- 📱 桌面＋手機 UI（繁體中文 zh-Hant-HK）

---

## 本機開發 Run locally

需要 Node.js 18+。

```bash
cd power-save
npm install
npm run dev
```

瀏覽器打開終端顯示的位址（預設 `http://localhost:5173/power-save/`；若 base 唔啱，見下方「Base 路徑」）。

純預覽 production build：

```bash
npm run build
npm run preview
```

---

## 建置 Build

```bash
npm run build
```

產出在 `dist/`，可直接用作靜態網站。

---

## 部署到 GitHub Pages

帳號建議：`caritasfsc-anthony`  
Repo 名稱若為 `power-save`，網站會係：

`https://caritasfsc-anthony.github.io/power-save/`

### 1. Base 路徑

`vite.config.js` 預設 `base: '/power-save/'`。  
若 repo 名唔同，可改 config，或建置時覆寫：

```bash
VITE_BASE=/你的repo名/ npm run build
```

根目錄站（user.github.io）則用：

```bash
VITE_BASE=/ npm run build
```

### 2. 推上 GitHub 後開 Pages

1. 把本專案 push 到 `caritasfsc-anthony/power-save`
2. GitHub → **Settings → Pages**
3. Source 選 **GitHub Actions** 或 **Deploy from a branch**（例如 `gh-pages` 分支的 `/`）

簡易做法：用 Actions 在 `main` 上 `npm ci && npm run build`，再把 `dist/` 發佈到 Pages。

範例 workflow（可存成 `.github/workflows/pages.yml`）：

```yaml
name: Deploy GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

---

## 專案結構

```
power-save/
├── index.html          # 入口
├── css/style.css       # UI overlay
├── js/
│   ├── main.js         # 渲染迴圈、相機、控制
│   ├── room.js         # 房間幾何與傢俬
│   ├── lights.js       # 天花燈／枱燈
│   ├── ui.js           # 面板互動
│   └── metrics.js      # 瓦數／度數／電費
├── public/             # 靜態資源（可放 mascot.png）
├── package.json
├── vite.config.js
└── README.md
```

可選：把吉祥物圖放到 `public/mascot.png`，右下角會自動顯示；否則用「慳電英雄」徽章。

---

## 技術栈

- [Three.js](https://threejs.org/) r170+
- [Vite](https://vitejs.dev/) 5
- 無需後端

---

## 授權／用途

供明愛慳電教育活動使用。內容屬教學示範，電費為估算。

預設跟香港 2026 平均淨電價約計：中電約 **HK$1.41／度**、港燈約 **HK$1.63／度**（實際賬單按級別同燃料調整變動）。
