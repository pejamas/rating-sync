<p align="center">
  <img src="images/logo.svg" alt="评分同步 logo" width="960" />
</p>

<p align="center">
  Emby 插件：把 IMDb 社区评分与烂番茄影评人评分同步进媒体库元数据。
</p>

<p align="center">
  <a href="#功能">功能</a> ·
  <a href="#安装">安装</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#截图">截图</a> ·
  <a href="https://github.com/pejamas/rating-sync/releases">下载</a>
</p>

<p align="center">
  <a href="https://github.com/pejamas/rating-sync/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/pejamas/rating-sync/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://github.com/pejamas/rating-sync/releases"><img alt="下载量" src="https://img.shields.io/github/downloads/pejamas/rating-sync/total" /></a>
  <a href="https://github.com/pejamas/rating-sync/releases"><img alt="最新版本" src="https://img.shields.io/github/v/tag/pejamas/rating-sync?sort=semver" /></a>
  <a href="LICENSE"><img alt="许可证" src="https://img.shields.io/github/license/pejamas/rating-sync" /></a>
</p>

## 功能

- 更新电影、剧集，可选更新单集
- 优先使用 OMDb、MDBList 或两者，可选启用 IMDb 官方数据集回退
- 各数据源独立限速，并可配置每日 API 上限
- 智能扫描优先处理最近添加的内容，避免不必要的重复请求
- 可选分层重扫：新发布的作品在评分尚未稳定时更频繁地复查
- 支持全库扫描，也可精确指定电影、剧集、季或单集
- 实时结果保持稳定排序，可展开说明，并显示评分的前后变化
- 可筛选扫描历史、查看详细报告、复制结果或下载 JSON 报告
- 查找缺少社区评分或影评人评分的项目，并直接重扫单个项目
- 数据源失败会更快重试，不再被当成「评分未变化」
- 可在 Emby 后台侧边栏的「服务器」分类下找到

## 安装

1. 从[最新发布](https://github.com/pejamas/rating-sync/releases/latest)下载 `RatingSync.dll`。
2. 复制到 Emby 插件目录（通常是 `...\Emby-Server\programdata\plugins\`）。
3. 重启 Emby 服务器。
4. 打开 后台 → 插件 → 评分同步，或直接使用侧边栏中的「评分同步」。

## 快速开始

1. 填写 OMDb 和/或 MDBList 的 API 密钥，或单独启用 IMDb 评分回退。
2. 选择首选数据源，以及要更新哪些项目类型。
3. 可选：当主要 API 未返回社区评分时启用 IMDb 评分回退。
4. 打开「运行」页开始刷新（全库，或指定的剧集 / 季 / 单集）。

## 评分数据源

| 数据源 | 提供内容 |
| --- | --- |
| OMDb | IMDb 社区评分（以及相关元数据查询） |
| MDBList | 评分数据，可用时包含烂番茄 |
| IMDb 回退 | API 查不到评分时，使用 IMDb 官方评分数据集 |

单集使用 OMDb 和/或 IMDb 回退（MDBList 不支持单集查询）。

## 截图

### 设置

API 密钥、数据源、项目类型与速率限制。

<img src="docs/screenshots/settings.png" alt="评分同步设置" width="900" />

### 智能扫描

控制重扫频率，以及优先处理哪些内容。

<img src="docs/screenshots/smart-scanning.png" alt="智能扫描" width="900" />

### 运行

选择扫描范围，启动全库或指定刷新，并实时跟进完成情况。

<img src="docs/screenshots/run.png" alt="运行评分刷新" width="900" />

### 扫描报告

搜索和筛选已更新、已跳过与错误项；展开说明，或把完整报告下载为 JSON。

<img src="docs/screenshots/scan-report.png" alt="扫描报告" width="900" />

### 历史

按结果筛选历史扫描，打开任意一次查看详细报告。

<img src="docs/screenshots/history.png" alt="扫描历史" width="900" />

### 缺失评分

查找缺少社区评分或影评人评分的项目，并把选中的项目直接送去定向扫描。

<img src="docs/screenshots/missing-ratings.png" alt="缺失评分搜索" width="900" />

PNG 文件位于 [`docs/screenshots/`](docs/screenshots/)。

## 构建

```powershell
dotnet build -c Release
```

输出：`bin\Release\RatingSync.dll`

### 使用本机 Emby 程序集（可选）

如果本机安装了 Emby，可针对它的 `System` 目录构建：

```powershell
dotnet build -c Release -p:EmbyPath="C:\Program Files\Emby-Server\System"
```

## 发布

推送形如 `v1.2.2` 的标签，或修改 `RatingSync.csproj` 中的版本号，都会触发 Release 构建、创建 GitHub Release 并上传 `RatingSync.dll`。

参见 [RELEASING.md](RELEASING.md)。

## 版本规范

[语义化版本](https://semver.org/lang/zh-CN/)：`MAJOR.MINOR.PATCH`

- `PATCH`：缺陷修复与小改动
- `MINOR`：向后兼容的新功能
- `MAJOR`：破坏性变更（行为、配置或 API）
