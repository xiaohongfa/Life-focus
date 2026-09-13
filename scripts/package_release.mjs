import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = process.cwd();
const PKG_DIR = path.join(ROOT_DIR, 'release_distribution');

// Read version dynamically from package.json
const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
const VERSION = pkgJson.version || '0.1.0';

console.log(`=== Life Focus Packaging Pipeline (v${VERSION}) ===`);

// 1. Clean and recreate target distribution dir
if (fs.existsSync(PKG_DIR)) {
  fs.rmSync(PKG_DIR, { recursive: true, force: true });
}
fs.mkdirSync(PKG_DIR, { recursive: true });

// 2. Locate release executable
const exeSrc = path.join(ROOT_DIR, 'src-tauri', 'target', 'release', 'life-strategy-game.exe');
if (!fs.existsSync(exeSrc)) {
  console.error(`\n[FATAL] Release executable not found at: ${exeSrc}`);
  console.error(`Please run 'pnpm build && cd src-tauri && cargo build --release' or 'pnpm tauri build' first.\n`);
  process.exit(1);
}

// 3. Prepare green portable package directory
const greenDir = path.join(PKG_DIR, '人生战略游戏_绿色纯净版');
fs.mkdirSync(greenDir, { recursive: true });

// Copy executable
const exeDst = path.join(greenDir, '人生战略游戏.exe');
fs.copyFileSync(exeSrc, exeDst);
console.log('✓ Copied release exe to:', exeDst);

// Add portable.flag so the application defaults to local ./data/ for sqlite & llm keys
fs.writeFileSync(path.join(greenDir, 'portable.flag'), 'TRUE_PORTABLE_MODE\n', 'utf8');
console.log('✓ Injected portable.flag marker');

// Copy LICENSE
const licenseSrc = path.join(ROOT_DIR, 'LICENSE');
if (fs.existsSync(licenseSrc)) {
  fs.copyFileSync(licenseSrc, path.join(greenDir, 'LICENSE'));
}

// Write usage instructions
const greenReadme = `=============================================
  人生战略游戏 (Life Strategy Game) v${VERSION}
=============================================

【使用指南】
1. 本程序为免安装绿色便携版，解压后双击「人生战略游戏.exe」即可直接运行。
2. 系统要求：Windows 10 / Windows 11 64位系统。
   (本程序采用系统内置的 WebView2 引擎渲染，Win10/Win11 均已原生内置，即开即用)
3. 数据安全与便携模式：
   - 绿色版已预置 portable.flag 标识，数据库与 LLM 本地配置均存放在同级 ./data/ 目录中。
   - 所有人生空间、国策树、随笔日记与数据均在本地，随时打包带走，零注册表污染。
   - 完全离线可用，无需连接任何第三方云服务器，数据百分之百归您本地所有。
4. 核心功能与操作：
   - 鼠标左键拖拽平移国策树画布，滚轮缩放视图
   - 战略总览：查看当前生效的活跃特质（可在特质库中设为活跃或下阵退居幕后）
   - 国策树：制定战略路线，推进国策以累积进度与奖励
   - 随笔记录：随时记录人生心得与反思
   - 存档管理：可在设置中创建新人格/新人生空间，支持随时删档重开

祝您在人生战略中运筹帷幄，达成宏伟目标！
=============================================
`;
fs.writeFileSync(path.join(greenDir, '使用说明.txt'), greenReadme, 'utf8');

// 4. Compress green portable package into zip
const zipDst = path.join(PKG_DIR, `人生战略游戏_v${VERSION}_绿色纯净版.zip`);
console.log('Compressing portable package...');
try {
  const psCmd = `Compress-Archive -Path '${greenDir}\\*' -DestinationPath '${zipDst}' -Force`;
  execSync(`powershell -NoProfile -Command "${psCmd}"`, { stdio: 'inherit' });
  console.log('✓ Created zip package at:', zipDst);
} catch (err) {
  console.error('Error compressing zip package:', err);
}

// 5. Look for NSIS installer if available
const possibleNsisSrcs = [
  path.join(ROOT_DIR, 'src-tauri', 'target', 'release', 'bundle', 'nsis', `life-strategy-game_${VERSION}_x64-setup.exe`),
  path.join(ROOT_DIR, 'src-tauri', 'target', 'release', 'bundle', 'nsis', 'life-strategy-game_0.1.0_x64-setup.exe'),
];
let foundNsis = false;
for (const nsisSrc of possibleNsisSrcs) {
  if (fs.existsSync(nsisSrc)) {
    const nsisDst = path.join(PKG_DIR, `人生战略游戏_v${VERSION}_安装包.exe`);
    fs.copyFileSync(nsisSrc, nsisDst);
    console.log('✓ Copied installer to:', nsisDst);
    foundNsis = true;
    break;
  }
}
if (!foundNsis) {
  console.log('ℹ Notice: NSIS installer not found, skipping installer bundling.');
}

// 6. Release distribution summary
const distReadme = `======================================================
     人生战略游戏 发行分发包 (Release Distribution v${VERSION})
======================================================

您可以将本文件夹内的任意文件分享给他人使用：

1. 【绿色免安装】人生战略游戏_v${VERSION}_绿色纯净版.zip
   - 纯绿色压缩包，解压后双击「人生战略游戏.exe」直接打开！
   - 数据存储于 ./data/ 文件夹，完全便携，零注册表写入。
   - 适合放在 U 盘随身携带或直接分享给朋友体验。

2. 【便携目录】人生战略游戏_绿色纯净版/人生战略游戏.exe
   - 绿色独立运行文件，可直接运行。

【对方运行环境要求】
- 操作系统：Windows 10 / Windows 11 (64位)
- 无需安装 Node.js、Rust、Git 或任何开发编程工具，普通用户解压双击即玩！
======================================================
`;
fs.writeFileSync(path.join(PKG_DIR, '分享与使用说明.txt'), distReadme, 'utf8');

console.log('\n--- 发布包生成完成 (Release Distribution Ready) ---');
const files = fs.readdirSync(PKG_DIR);
for (const file of files) {
  const stat = fs.statSync(path.join(PKG_DIR, file));
  const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
  console.log(`- ${file} (${stat.isDirectory() ? '文件夹' : sizeMB + ' MB'})`);
}
