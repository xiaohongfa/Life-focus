$ErrorActionPreference = "Stop"

$ROOT_DIR = (Get-Location).Path
$REPO = "xiaohongfa/Life-focus"
$TAG = "v0.1.0"
$RELEASE_NAME = "人生战略游戏 v0.1.0 · 经典绝密作战室 纯净便携版"

# 1. Retrieve token
$token = powershell -NoProfile -ExecutionPolicy Bypass -File "$ROOT_DIR\scripts\get_token.ps1"
if (-not $token) {
    Write-Error "Failed to retrieve GitHub token from Windows Credential Manager."
    exit 1
}
Write-Host "✓ Retrieved GitHub credentials successfully."

$headers = @{
    "Authorization" = "Bearer $token"
    "User-Agent" = "Life-Focus-Agent"
    "Accept" = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

$bodyNotes = @"
## 人生战略游戏 (Life Strategy Game) v0.1.0 经典绝密作战室

本版本为依据架构与安全审查规范重构完成的全新正式版，采用二战/冷战绝密作战室 1:1 物理拟物化美术风格。

### 🌟 核心亮点与整改说明
- **经典绝密作战室 1:1 物理拟物化**：暗调羊皮纸沙盘、立体悬挂勋带、微型黄铜接头滚珠、牛皮纸绝密档案袋。
- **纯净绿色便携模式 (True Portable Mode)**：绿色压缩包内置 \`portable.flag\`，运行时自动将 SQLite 数据库与 AI 凭据保存在同级 \`./data/\` 目录，免安装便携使用。
- **本地 LLM 安全代理**：全面移除渲染层网络直连，所有 AI 参谋请求由 Rust 本地后端统一中继代理，支持 Google Gemini 原生 REST 协议与 OpenAI 协议双模，未启用 AI 服务时不会产生外部网络通信，安全凭据本地掩码隔离。
- **数据完整性加固**：前置国策依赖图引入 BFS 环路检测，严防死锁成环；强制跨空间数据隔离；特质装备状态平滑迁移。

### 📦 分发下载指引
1. **【推荐】\`人生战略游戏_v0.1.0_绿色纯净版.zip\`**：免安装纯绿色压缩包，解压后双击 \`人生战略游戏.exe\` 即可运行。
2. **\`人生战略游戏_v0.1.0_安装包.exe\`**：标准 Windows 安装向导。
"@

# 2. Check if release exists or create it
Write-Host "Checking release for tag $TAG..."
$releases = Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/releases" -Headers $headers -Method Get
$release = $releases | Where-Object { $_.tag_name -eq $TAG }

if (-not $release) {
    Write-Host "Creating release for $TAG..."
    $createPayload = @{
        tag_name = $TAG
        target_commitish = "main"
        name = $RELEASE_NAME
        body = $bodyNotes
        draft = $false
        prerelease = $false
    } | ConvertTo-Json -Depth 5

    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/releases" -Headers $headers -Method Post -Body $createPayload -ContentType "application/json; charset=utf-8"
    Write-Host "✓ Created release: $($release.name) (ID: $($release.id))"
} else {
    Write-Host "Release already exists: $($release.name) (ID: $($release.id))"
}

# 3. Upload assets
$assets = @(
    @{
        Name = "Life-focus-v0.1.0-portable.zip"
        Label = "人生战略游戏 v0.1.0 绿色纯净版 (免安装便携版)"
        Path = "$ROOT_DIR\release_distribution\人生战略游戏_v0.1.0_绿色纯净版.zip"
        Type = "application/zip"
    },
    @{
        Name = "Life-focus-v0.1.0-setup.exe"
        Label = "人生战略游戏 v0.1.0 安装包 (Windows Setup)"
        Path = "$ROOT_DIR\release_distribution\人生战略游戏_v0.1.0_安装包.exe"
        Type = "application/octet-stream"
    }
)

# Clean up any existing assets in this release
$currentAssets = (Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/releases/$($release.id)/assets" -Headers $headers -Method Get)
foreach ($a in $currentAssets) {
    Write-Host "Cleaning asset $($a.name)..."
    Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/releases/assets/$($a.id)" -Headers $headers -Method Delete
}

foreach ($item in $assets) {
    if (-not (Test-Path $item.Path)) {
        Write-Warning "File not found: $($item.Path), skipping..."
        continue
    }

    $fileSizeMB = [Math]::Round((Get-Item $item.Path).Length / 1MB, 2)
    $nameParam = [System.Uri]::EscapeDataString($item.Name)
    $labelParam = [System.Uri]::EscapeDataString($item.Label)
    $uploadUri = "https://uploads.github.com/repos/$REPO/releases/$($release.id)/assets?name=$nameParam&label=$labelParam"

    $uploadHeaders = @{
        "Authorization" = "Bearer $token"
        "User-Agent" = "Life-Focus-Agent"
        "Accept" = "application/vnd.github+json"
    }

    $uploaded = $false
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        try {
            Write-Host "Uploading $($item.Name) ($fileSizeMB MB, attempt $attempt/3)..."
            # Ensure partial failed uploads are cleared
            $existing = (Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/releases/$($release.id)/assets" -Headers $headers -Method Get) | Where-Object { $_.name -eq $item.Name }
            if ($existing) {
                Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/releases/assets/$($existing.id)" -Headers $headers -Method Delete
            }

            $upRes = Invoke-RestMethod -Uri $uploadUri -Method Post -Headers $uploadHeaders -InFile $item.Path -ContentType $item.Type -TimeoutSec 120
            Write-Host "✓ Uploaded $($item.Name) -> $($upRes.browser_download_url)"
            $uploaded = $true
            break
        } catch {
            Write-Warning "Attempt $attempt failed: $($_.Exception.Message)"
            Start-Sleep -Seconds 2
        }
    }
    if (-not $uploaded) {
        Write-Error "Failed to upload $($item.Name) after 3 attempts."
    }
}

Write-Host "`n🎉 Release published successfully!"
Write-Host "Release page: $($release.html_url)"
