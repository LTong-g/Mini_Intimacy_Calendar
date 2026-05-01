> 提示：请使用 UTF-8 编码读取本文件。

# 开发日志
撰写规则：
- 本日志在默认情况下只能追加记录，不能删除/改写旧内容。除非得到用户的明确指示。
- 每天只记录一条时间戳，时间戳作为二级标题，以 `##` 开头。
- 每条时间戳下面，每次记录如果新开一段，则写一个标题作为三级标题，以 `###` 开头，与上一行用空行分隔。标题下面记录内容，以 `-`分点。如果延续上个话题，则无需新开一段，直接在上一段内追加记录。

# 待开发功能：
- 允许每日多次记录
- 允许设置黑名单应用，根据黑名单应用自动记录
- 优化开发工作流

# 日志内容

## 2026-05-01 

### 初始化记录
- 创建了 `AGENTS.md`，并在其中引用 `developer_guide.md` 与 `develop_log.md`。
- 新增 `developer_guide.md`，面向开发者的详细技术说明。
- 创建了 `readme.md`，面向用户的介绍页内容，用于网页展示。
- 建立了项目基线事实记录：
- 项目为 Expo + React Native 应用（`minimalistweaponenhancementcalendar`）。
- 核心存储键为 `checkin_status`，位掩码值为 `1/2/4`。
- 主要功能包含：
- 日/月/年日历视图
- 打卡切换
- 统计表格与折线图
- 设置页 JSON 导入导出


### 发布版本控制/版本表示一致性分析
- 已核对发布相关版本字段来源：`app.json`、`eas.json`、`package.json`、`package-lock.json`、`android/app/build.gradle`、`dist/metadata.json`。
- 已确认语义版本 `1.1.1` 在 `app.json`、`package.json`、`package-lock.json` 与 Android `versionName` 中保持一致。
- 已确认 `runtimeVersion` 存在平台配置口径不一致：iOS 采用 `policy: appVersion`，Android 使用硬编码 `"1.1.1"`。
- 已确认构建版本来源存在混用：`eas.json` 启用 `appVersionSource: remote` 且生产环境 `autoIncrement: true`，同时 Android 原生层仍固定 `versionCode 1`。
- 已识别风险：在云构建与本地原生构建并行使用时，版本号（尤其 build 号）可能发生漂移。
- 已识别追溯缺口：现有 `dist/` 产物元数据未体现业务语义版本，不利于发布归档与回溯。

### 发布版本统一方案
- “单一事实源”方案：`package.json` 的 `version` 作为唯一语义版本来源，`app.json`/原生文件不再手工维护重复版本号。
- 配置统一方案：将平台 `runtimeVersion` 统一为 `policy: appVersion`，避免 iOS 策略化与 Android 硬编码并存。
- 构建号统一方案：继续使用 `eas.json` 中 `cli.appVersionSource: remote` 与 `build.production.autoIncrement: true` 作为开发者版本号（Android `versionCode`）唯一来源。
- 同步机制方案：发布前执行 `eas build:version:sync`，将 EAS 远端构建号回写本地，降低 `expo run:android` 与 EAS 构建号漂移风险。
- 发布口径方案：`production` 仅走 `eas build`（云或 `--local`），`expo run:android` 仅用于开发调试，不作为发布产物来源。
- 产物追溯方案：构建产物命名引入 `appVersion` 与构建号（示例：`MinimalistWeaponEnhancementCalendar-v1.1.1+42-android.apk`），并在仓库内保存同名元数据记录。

### 发布版本统一落地
- 已将 Android `runtimeVersion` 从硬编码字符串改为 `policy: appVersion`，与 iOS 保持一致，统一运行时版本策略来源。
- 已在 `package.json` 新增脚本 `release:sync-version`，命令为 `eas build:version:sync`，用于发布前同步 EAS 远端版本号到本地配置。
- 已完成配置有效性校验：`app.json` 与 `package.json` JSON 解析通过。
- 已在 `developer_guide.md` 新增“发布版本管理与统一工作流”章节，记录版本定义位置、当前版本值、更新入口、同步命令与 Android 发布流程。
- 已明确文档口径：`runtimeVersion` 采用 `policy: appVersion`，构建号由 EAS 远端管理，`expo run:android` 仅用于开发调试。

### 提交事故复盘规则文档化
- 已在 `AGENTS.md` 增加“仅提交部分文件/部分改动”防错规则，覆盖提交边界确认、显式暂存、混合改动备份恢复、提交后复核与异常修复要求。
- 已在 `developer_guide.md` 新增“Git 提交防事故流程”章节，固化提交前检查、最小提交构造、提交后复核的命令级步骤。

