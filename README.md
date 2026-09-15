# Life-focus (人生战略模拟器 / 人生国策系统)

> **以大战略沙盘推演视角重构个人成长决策的桌面级应用**  
> 灵感源自钢铁雄心4（Hearts of Iron IV）国策树系统与大战略兵棋推演。

---

## 🌟 核心特色

- 🗺️ **战区羊皮纸沙盘推演**：采用 React Flow 构建的高自由度人生国策路线图，支持前置依赖推演与互斥路线决断。
- 🎖️ **3D 悬挂勋章国策节点**：物理质感军功勋带与浮雕徽章，取代普通卡片。
- 📋 **指挥官档案与心智特质体系**：包含战略人事档案、特质负载分配与国家精神 Buff 体系。
- ⚡ **即时心智稳定度监控**：实时心智稳定度动态调节，复盘历史战略调令。
- 🔕 **离线 Web Audio 物理音效**：沉浸式机械开关咬合与战略决议盖章音效。
- 🔒 **本地优先与跨平台运行**：基于 Tauri 2.0 + SQLite，全部个人数据本地持久化存储，无需联网账号；仅在你主动配置并使用 AI 功能时，才会向所选模型服务发送请求。

---

## 🛠️ 技术栈

- **前端技术**：React 19 + TypeScript + Vite + Tailwind CSS
- **可视化图谱**：@xyflow/react (React Flow)
- **桌面端运行时**：Tauri v2 + Rust
- **本地存储**：SQLite（Rust `rusqlite`）
- **图标与音效**：Lucide React + Web Audio API

---

## 🚀 本地开发与运行

### 1. 环境准备
- Node.js 18+ & pnpm
- Rust 工具链（`rustup`）

### 2. 安装依赖
```bash
pnpm install
```

### 3. 启动开发模式
```bash
# 启动 Web 前端预览 (默认 http://localhost:1420)
pnpm dev

# 启动 Tauri 桌面应用开发模式
pnpm tauri dev
```

### 4. 生产打包
```bash
# 编译打包 Windows 安装包 (MSI & NSIS Setup)
pnpm tauri build
```
打包输出路径位于 `src-tauri/target/release/bundle/`。

---

## 📄 开源许可
MIT License
