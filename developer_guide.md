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

## 7. 开发回归建议
- 改动打卡逻辑后至少验证：
- 打卡切换正确性
- 月/年视图着色与状态显示
- 统计表与折线图数据一致性
