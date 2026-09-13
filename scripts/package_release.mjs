import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = process.cwd();
const PKG_DIR = path.join(ROOT_DIR, 'release_distribution');

// Clean and create target dir
if (fs.existsSync(PKG_DIR)) {
  fs.rmSync(PKG_DIR, { recursive: true, force: true });
}
fs.mkdirSync(PKG_DIR, { recursive: true });

// 1. Copy NSIS installer
const nsisSrc = path.join(ROOT_DIR, 'src-tauri', 'target', 'release', 'bundle', 'nsis', 'life-strategy-game_0.1.0_x64-setup.exe');
const nsisDst = path.join(PKG_DIR, '人生战略游戏_v0.1.0_安装包.exe');
if (fs.existsSync(nsisSrc)) {
  fs.copyFileSync(nsisSrc, nsisDst);
  console.log('✓ Copied installer to:', nsisDst);
} else {
  console.error('X Installer not found at:', nsisSrc);
}

// 2. Prepare green portable package
const greenDir = path.join(PKG_DIR, '人生战略游戏_v0.1.0_绿色便携版');
fs.mkdirSync(greenDir, { recursive: true });

const exeSrc = path.join(ROOT_DIR, 'src-tauri', 'target', 'release', 'life-strategy-game.exe');
const exeDst = path.join(greenDir, '人生战略游戏.exe');
fs.copyFileSync(exeSrc, exeDst);
console.log('✓ Copied portable exe to:', exeDst);

const greenReadme = `=============================================
  人生战略游戏 (Life Strategy Game) v0.1.0
=============================================

【使用指南】
1. 本程序为免安装绿色便携版，解压后双击「人生战略游戏.exe」即可直接运行。
2. 系统要求：Windows 10 / Windows 11 64位系统。
   (本程序采用系统内置的 WebView2 引擎渲染，Win10/Win11 均已原生内置，即开即用)
3. 数据安全与隐私：
   - 所有人生空间、国策树、活跃特质、随笔日记与数据均保存在本地 SQLite 数据库中。
   - 完全离线可用，无需连接任何外部服务器，数据百分之百归您本地所有。
4. 核心功能与操作：
   - 鼠标左键拖拽平移国策树画布，滚轮缩放视图
   - 战略总览：查看当前生效的活跃特质（最多同时装备 4 个，其余特质可在特质库中设为活跃或下阵退居幕后）
   - 国策树：制定战略路线，推进国策以累积进度与奖励
   - 随笔记录：随时记录人生心得与反思
   - 存档管理：可在设置中创建新人格/新人生空间，支持随时删档重开

祝您在人生战略中运筹帷幄，达成宏伟目标！
=============================================
`;
fs.writeFileSync(path.join(greenDir, '使用说明.txt'), greenReadme, 'utf8');

// 3. Compress green portable package into zip
const zipDst = path.join(PKG_DIR, '人生战略游戏_v0.1.0_免安装绿色版.zip');
console.log('Compressing portable package...');
try {
  // Use PowerShell Compress-Archive
  const psCmd = `Compress-Archive -Path '${greenDir}' -DestinationPath '${zipDst}' -Force`;
  execSync(`powershell -NoProfile -Command "${psCmd}"`, { stdio: 'inherit' });
  console.log('✓ Created zip package at:', zipDst);
} catch (err) {
  console.error('Error compressing zip:', err);
}

// 4. Release distribution readme
const distReadme = `======================================================
     人生战略游戏 v0.1.0 发行分发包 (Release Distribution)
======================================================

您可以将本文件夹内的任意一个文件直接分享给他人使用：

1. 【推荐首选】人生战略游戏_v0.1.0_安装包.exe (约 3.0 MB)
   - 完整的 Windows 安装向导。
   - 自动在桌面生成快捷方式，支持开始菜单与控制面板正常卸载。
   - 体积仅约 3MB，极小极轻，可以通过微信、QQ、网盘秒发秒传。

2. 【绿色免安装】人生战略游戏_v0.1.0_免安装绿色版.zip (约 3.6 MB)
   - 纯绿色压缩包，解压后双击「人生战略游戏.exe」直接打开。
   - 适合放在 U 盘随身携带或不想在电脑上执行安装向导的用户。

【对方运行环境要求】
- 操作系统：Windows 10 / Windows 11 (64位)
- 无需安装 Node.js、Rust、Git 或任何开发编程工具，普通用户双击即玩！
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
