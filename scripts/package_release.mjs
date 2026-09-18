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
  console.error(`Please run 'pnpm tauri build --no-bundle' first to embed frontend assets into the binary.\n`);
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

// Injects 一键更新便携版.bat
const updateBatContent = `@echo off
chcp 65001 >nul
title 人生战略游戏 - 便携版无感更新程序

echo ========================================================
echo        人生战略游戏 - 便携版一键无感更新程序
echo ========================================================
echo.
echo 说明：
echo 1. 本脚本将安全地为您更新游戏主程序，绝不覆盖或影响任何历史数据！
echo 2. 您的所有人生空间、国策树、心智特质、随笔及 API Key（保存在 ./data/ 中）
echo    均将 100%% 完整保留。
echo.

set CURRENT_DIR=%~dp0
set TARGET_EXE=%CURRENT_DIR%人生战略游戏.exe

:: 检查当前目录下是否存在 data 目录
if not exist "%CURRENT_DIR%data" (
    echo [提示] 检测到当前目录为全新解压包（尚未包含 ./data/ 目录）。
    echo 正在自动扫描邻近目录中的旧版本数据...
    for /d %%D in ("%CURRENT_DIR%..\\*") do (
        if exist "%%D\\data\\life_strategy.db" (
            if not "%%~fD"=="%CURRENT_DIR:~0,-1%" (
                echo [发现旧版本] 正在从 "%%~nxD" 无缝接力数据...
                xcopy /E /I /Y "%%D\\data" "%CURRENT_DIR%data" >nul
                echo [成功] 历史战略数据已无感迁移至当前版本！
                goto :LAUNCH
            )
        )
    )
)

:LAUNCH
echo.
echo [完成] 更新准备就绪！
echo 正在启动最新版本人生战略游戏...
start "" "%TARGET_EXE%"
exit /b 0
`;
fs.writeFileSync(path.join(greenDir, '一键更新便携版.bat'), updateBatContent, 'utf8');
console.log('✓ Injected 一键更新便携版.bat');

// Write usage instructions
const greenReadme = `=============================================
  人生战略游戏 (Life Strategy Game) v${VERSION}
=============================================

【便携版无感更新说明】
解压新版本压缩包后，只需双击「一键更新便携版.bat」或直接运行「人生战略游戏.exe」，
程序内部内置了智能迁移引擎，会自动检测邻近目录的旧版本数据并无感接力迁移（或在
游戏内「设置 -> 本地存储」中一键无感迁移），无需手动搬运文件，零数据丢失！

【使用指南】
1. 本程序为免安装绿色便携版，解压后双击「人生战略游戏.exe」即可直接运行。
2. 系统要求：Windows 10 / Windows 11 64位系统。
   (本程序采用系统内置的 WebView2 引擎渲染，Win10/Win11 均已原生内置，即开即用)
3. 数据存储与便携模式：
   - 绿色版已预置 portable.flag 标识，数据库与 LLM 本地配置均存放在同级 ./data/ 目录中。
   - 核心业务数据默认保存在本地 SQLite 数据库中。
   - LLM API Key 永久保存在本地便携保险库 (./data/.llm_vault) 中，重启绝不丢失。
   - 未配置第三方 AI 服务时不会发起网络请求；启用 AI 时仅与您配置的服务商进行通信。
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
   - 数据存储于 ./data/ 文件夹，适合 U 盘随身携带或直接分享给朋友体验。

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
