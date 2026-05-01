> 提示：请使用 UTF-8 编码读取本文件。

# Developer Guide

## 1. 项目定位
`MinimalistWeaponEnhancementCalendar` 是一个基于 Expo + React Native 的移动端打卡应用。  
它围绕“按日期记录三类行为”这个核心目标，提供日历视图、数据统计和数据导入导出能力。
三类行为均为代称，实际意义是三种应当自律，合理控制频率的行为。即软件功能为记录没有自律的时候，并提供一些统计分析。

## 2. 功能总览
### 2.1 日历主流程
- `日视图`：查看某一天的记录状态、图标信息、间隔天数。
- `月视图`：按网格展示某月每天的打卡状态，支持左右滑动切月。
- `年视图`：以 12 个月缩略日历展示全年分布，支持左右滑动切年。

### 2.2 打卡记录
- 三类打卡项：
- `tutorial`（观看教程）
- `weapon`（武器强化）
- `duo`（双人练习）
- 同一天支持多项并存（位掩码组合）。
- 未来日期不可编辑。

### 2.3 统计分析
- `总览统计`：总计、年均、分年统计。
- `年度统计`：指定年份总计、月均、逐月数据。
- `自定义区间统计`：按日期区间聚合统计。
- 折线图支持触摸查看点位数据。

### 2.4 数据管理
- `导出`：导出本地数据为 JSON 并分享。
- `导入`：从 JSON 恢复本地数据并做格式校验。

## 3. 数据模型与规则
### 3.1 存储结构
- 存储：`AsyncStorage`
- 键名：`checkin_status`
- 结构：`{ "YYYY-MM-DD": number }`

示例：
```json
{
  "2026-04-29": 3,
  "2026-04-30": 4,
  "2026-05-01": 7
}
```

### 3.2 位掩码
- `1`：tutorial
- `2`：weapon
- `4`：duo

常见组合：
- `0`：无记录
- `3`：tutorial + weapon
- `5`：tutorial + duo
- `6`：weapon + duo
- `7`：三项全选

### 3.3 校验约束
- 日期键必须为 `YYYY-MM-DD`。
- 值必须是数字，语义范围 `0..7`。
- 禁止未来日期修改。
- 导入 JSON 必须通过键值格式校验。

## 4. 技术栈
- React 19
- React Native 0.79
- Expo SDK 53
- React Navigation
- AsyncStorage
- react-native-svg + d3
- moment

## 5. 代码结构
```text
.
├─ App.js
├─ src
│  ├─ screens
│  │  ├─ DayView.js
│  │  ├─ MonthView.js
│  │  ├─ YearView.js
│  │  ├─ StatisticsScreen.js
│  │  ├─ SettingsScreen.js
│  │  └─ DatePickerScreen.js
│  ├─ components
│  ├─ hooks
│  │  ├─ useCheckinData.js
│  │  └─ useCheckinAggregation.js
│  └─ utils
│     ├─ checkInStorage.js
│     └─ statsUtils.js
└─ android
```

## 6. 运行方式
```bash
npm install
npm run start
npm run android
```

### 6.1 Windows 本地构建（临时短路径映射）
- 目的：避免 React Native native 模块在 Windows 下因工程路径过深导致的 CMake/Ninja 构建失败。
- 约束：每次构建前创建 `subst` 映射，每次构建后无论成功失败都取消映射，不让 `M:` 长驻。

推荐命令（仓库根目录执行）：
```powershell
npm run android:build:debug:tempmap
```

安装到已连接设备（仓库根目录执行）：
```powershell
npm run android:install:debug:tempmap
```

脚本位置：
- `scripts/android-build-tempmap.ps1`

可选参数示例（直接运行脚本）：
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\android-build-tempmap.ps1 -DriveLetter M -GradleTask assembleDebug -NodeEnv development
```

## 7. 开发回归建议
- 改动打卡逻辑后至少验证：
- 打卡切换正确性
- 月/年视图着色与状态显示
- 统计表与折线图数据一致性

## 8. 发布版本管理与统一工作流
### 8.1 版本定义位置
- 语义版本（`appVersion`）定义在：
- `package.json` -> `version`
- `app.json` -> `expo.version`
- 当前语义版本（截至 `2026-05-01`）：`1.1.1`。

### 8.2 统一策略
- `runtimeVersion` 统一使用 `policy: appVersion`（iOS/Android 一致）。
- 构建号统一由 EAS 远端管理：
- `eas.json` -> `cli.appVersionSource: remote`
- `eas.json` -> `build.production.autoIncrement: true`
- 发布前通过脚本同步远端版本状态到本地：
- `npm run release:sync-version`（执行 `eas build:version:sync`）。

### 8.3 版本更新时在哪里改
- 仅在发布新业务版本时修改语义版本：
- `package.json` 的 `version`
- `app.json` 的 `expo.version`
- 不手工维护 Android `versionCode`（由 EAS 递增与同步）。

### 8.4 推荐发布流程（Android）
1. 修改语义版本（示例：`1.1.1 -> 1.1.2`）。
2. 执行 `npm run release:sync-version`。
3. 执行 `eas build --platform android --profile production`。
4. 归档产物时带上语义版本与构建号（示例：`MinimalistWeaponEnhancementCalendar-v1.1.2+42-android.apk`）。

### 8.5 约束说明
- `expo run:android` 用于开发调试，不作为发布产物来源。
- 发布产物统一来自 EAS `production` profile（云构建或 `--local`）。

## 9. Git 提交防事故流程
适用场景：工作区存在多项改动，且本次只允许提交其中一部分。

### 9.1 提交前检查
1. 执行 `git status --short`，确认全部改动清单。
2. 执行 `git diff -- <目标文件>`，确认目标改动边界。
3. 若目标文件混有无关改动，先备份该文件（例如 `Copy-Item <file> <file>.bak`）。

### 9.2 构造最小提交
1. 只暂存目标文件：`git add <目标文件列表>`。
2. 提交信息按仓库规范填写（英文 `summary` + 逐文件 `description`）。
3. 完成提交后，若之前为隔离提交临时清理过文件内容，需把无关改动恢复回工作区未提交状态。

### 9.3 提交后复核
1. 执行 `git show --name-only --stat -1`，确认提交文件范围正确。
2. 执行 `git status --short`，确认无关改动仍在工作区且未被误提交/误丢失。
3. 若发生误覆盖，先恢复文件，再同步修正提交（必要时 `git commit --amend` 仅改提交信息，或新增修复提交）。
