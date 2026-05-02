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

### Expo 多尺寸测试与构建落库方案分析
- 已读取并核对现有工程配置：`package.json`、`eas.json`、`app.json`。
- 已确认当前脚本以 `expo start --dev-client` 与 `expo run:android/ios` 为主，构建配置已包含 `development/preview/production` 三个 EAS profile。
- 已确认项目当前测试方式以 Expo Go/Dev Client 实机为主，存在设备覆盖面受限的问题。
- 可执行方案：通过 Android 模拟器（含多分辨率 AVD）、Web 响应式预览、必要时 iOS 模拟器补充多尺寸验证。
- 构建落库方案：使用本地构建 `eas build --local` 直接在仓库内（如 `dist/`）统一归档 apk/aab/ipa，降低手动下载与 release 管理成本。
- 风险记录：本地构建对本机环境一致性要求较高（Android SDK/Java/Xcode），且 iOS 本地构建仅支持 macOS。

### Android 本机构建链路环境诊断与排障记录
- 已确认基础环境可用：Android SDK 位于 `D:\ASoftware\Android\Sdk`，Java 位于 `D:\ASoftware\Java\jdk-21`，Gradle Wrapper 可用（Gradle `8.13`），`adb`/`emulator` 可用。
- 第 1 次在原始路径 `D:\B0Projects\my_tools\MinimalistWeaponEnhancementCalendar\android` 执行 `.\gradlew.bat assembleDebug` 失败，失败任务为 `:react-native-reanimated:buildCMakeDebug[armeabi-v7a][reanimated,worklets]`，报错 `ninja: error: mkdir(...) No such file or directory`。
- 已确认该失败不属于 SDK/Java/Gradle 缺失，而是进入 native 编译后触发路径过深相关问题。
- 已确认系统长路径开关 `LongPathsEnabled=1`。
- 第 2 次在原始路径清理缓存后重试仍失败；日志出现 object file 目录长度警告（对象目录 `188` 字符，提示对象文件完整路径上限 `250` 字符）并再次失败于 `react-native-reanimated` 的 Ninja `mkdir`。
- 已确认“仅清缓存”不能消除根因，根因仍为原始工程路径过深导致的 native 编译路径风险。
- 第 3 次使用 `subst` 将工程目录映射为短路径 `M:\` 后，从 `M:\android` 构建成功（`BUILD SUCCESSFUL`）。
- 在切换构建根路径过程中出现 Kotlin 增量缓存 `different roots` 报错（`D:\...` 与 `M:\android` 混用），随后 Kotlin 编译降级到无 daemon 回退路径并完成构建。
- 已确认当前可行稳定方案为固定使用短路径 `M:\` 进行本机构建，不与原始长路径混用。

### 临时映射构建流程固化
- 已记录新的持久偏好：不希望 `M:` 长驻系统盘符界面，改为“构建前映射、构建后无论成功失败都取消映射、每次构建重新映射”。
- 已在 `AGENTS.md` 更新对应协作规则，替代“固定长期使用 `M:\`”的表述。
- 已新增脚本 `scripts/android-build-tempmap.ps1`，采用 `try/finally` 实现构建后强制 `subst /D` 取消映射。
- 已在 `package.json` 增加快捷命令：
- `android:build:debug:tempmap` -> 临时映射后执行 `assembleDebug`
- `android:install:debug:tempmap` -> 临时映射后执行 `installDebug`
- 已在 `developer_guide.md` 增加“Windows 本地构建（临时短路径映射）”操作步骤与示例命令。
- 已完成脚本轻量实测：通过 `-GradleTask "-v"` 在 `M:\android` 成功执行 Gradle，脚本结束后 `M:` 映射已自动取消。

### 本机完整环境复验
- 已复验核心命令均可解析：`node`、`npm`、`npx`、`java`、`javac`、`adb`、`emulator`、`sdkmanager`、`avdmanager`、`eas`。
- 已复验环境变量：`JAVA_HOME=D:\ASoftware\Java\jdk-21`，`ANDROID_HOME`/`ANDROID_SDK_ROOT=D:\ASoftware\Android\Sdk`。
- 已复验 SDK 目录完整性：`platform-tools`、`cmdline-tools`、`emulator`、`platforms`、`build-tools`、`system-images`、`ndk`、`cmake` 均存在。
- 已复验关键版本：JDK `21.0.4`、ADB `35.0.2`、Emulator `35.4.9.0`、SDK Manager `20.0`、EAS CLI `16.17.3`。
- 已复验 AVD：存在 `Pixel_6_API_35`（`android-35/google_apis/x86_64`）。
- 已执行 `npm run android:build:debug:tempmap`，`BUILD SUCCESSFUL`，本地 native 链路可用（包含 `react-native-reanimated` CMake/Ninja 任务）。
- 已复验构建后 `subst` 无残留映射（`M:` 未长驻）。
- 已复验 APK 产物存在：`android/app/build/outputs/apk/debug/app-debug.apk`（`190596265` bytes）。
- 已复验当前 `adb devices -l` 无在线设备，说明真机调试能力可用但当前会话下未连接设备。

### 模拟器本机测试执行记录
- 已启动本地 AVD `Pixel_6_API_35` 并等待系统引导完成。
- 已读取模拟器参数：`Physical size: 1080x2400`，`Physical density: 420`。
- 已执行 `npm run android:install:debug:tempmap`，`installDebug` 成功安装到 `Pixel_6_API_35(AVD) - 15`。
- 已通过 `adb shell monkey` 拉起应用包 `com.ltongg.MinimalistWeaponEnhancementCalendar`。
- 已确认进程存在（`pidof` 返回 `3935`）且前台窗口为 `MainActivity`，模拟器内应用可正常启动运行。

### AGENTS 构建流程澄清
- 已在 `AGENTS.md` 新增“Windows Android 构建执行流程（强约束）”段落。
- 已将“映射-构建-取消映射”拆分为明确步骤：构建前映射、映射路径内构建、`finally` 清理映射、构建后校验 `subst`、下次构建重新映射。
- 已在同段明确两条标准入口命令：`android:build:debug:tempmap` 与 `android:install:debug:tempmap`。
- 已明确禁止在原始长路径直接执行 `gradlew`，避免再次触发路径深度与缓存根路径混用问题。

## 2026-05-02

### 提交边界事故规则加固
- 已发生第二次“仅提交部分改动”场景中的提交边界事故反馈。
- 已恢复此前被误从工作区排除的 `develop_log.md` 段落“每日多次记录功能改造范围分析”，并保持为未提交状态。
- 已在 `AGENTS.md` 将该场景规则加固为命令级约束：优先 `git add -p` 选择性暂存，禁止通过修改/删除工作区内容来排除提交。
- 已补充异常处置要求：若误改工作区内容，必须在同一会话立即恢复并追加日志事实记录。

### 换行规范与忽略规则修复
- 已在 `AGENTS.md` 新增协作约束：仓库文本文件统一使用 Windows 换行符（CRLF）。
- 已修复 `.gitignore`：去除重复块并保留有效忽略项，同时保留 Gradle 本地缓存与构建产物忽略规则。
- 已将本次涉及文档文件统一转换为 CRLF。

### Android 模拟器黑屏排障
- 已确认当前黑屏时 `adb devices -l` 曾显示 `emulator-5554 offline`，说明模拟器系统未正常完成启动。
- 已检查 `Pixel_6_API_35` 的启动记录，当前 `npm run start` 按 `a` 会以普通 `@Pixel_6_API_35` 方式启动，不会自动附带冷启动或 GPU 回退参数。
- 已备份 `D:\ASoftware\Android\.android\avd\Pixel_6_API_35.avd\config.ini` 到 `config.ini.bak_20260502_black_screen`，并备份 `quickbootChoice.ini` 到 `quickbootChoice.ini.bak_20260502_black_screen`。
- 已删除 `Pixel_6_API_35.avd\snapshots\default_boot` 快照目录，用于排除 quickboot 快照损坏导致的黑屏或离线。
- 已将 `quickbootChoice.ini` 改为 `saveOnExit = false`，避免退出时继续保存异常快照。
- 已将 AVD 配置调整为冷启动优先：`fastboot.forceColdBoot=yes`、`fastboot.forceFastBoot=no`，并关闭 firstboot 本地/下载快照读取与保存。
- 已将 AVD GPU 配置固定为 `hw.gpu.enabled=yes` 与 `hw.gpu.mode=swiftshader_indirect`，用于规避硬件 GPU/窗口渲染相关黑屏风险。
- 验证限制：Codex 沙箱内直接启动 emulator 访问 `D:\ASoftware\Android\.android` 时会出现权限噪声，最终启动验证应以用户本机 PowerShell 执行为准。

### 旧 AVD 清理与新 AVD 重建
- 已按用户要求删除旧 AVD Pixel_6_API_35。
- 已基于 system-images;android-35;google_apis;x86_64 新建 AVD AVD_2560x1600 与 AVD_2640x1200。
- 已将 AVD_2560x1600 配置为 hw.lcd.width=2560、hw.lcd.height=1600，并设置 hw.initialOrientation=landscape、showDeviceFrame=no。
- 已将 AVD_2640x1200 配置为 hw.lcd.width=2640、hw.lcd.height=1200，并设置 hw.initialOrientation=landscape、showDeviceFrame=no。
- 已通过 avdmanager list avd 复核，新 AVD 列表仅包含 AVD_2560x1600 与 AVD_2640x1200。

### AVD 尺寸语义约定落地
- 已在 `AGENTS.md` 追加用户尺寸语义约定：`AVD_2640x1200` 为手机尺寸默认机型，`AVD_2560x1600` 为平板尺寸机型。

### 默认启动脚本调整
- 已将 `package.json` 的默认 `android` 脚本固定为 `expo run:android --device AVD_2640x1200`（默认手机尺寸）。
- 已新增脚本 `android:phone`（`AVD_2640x1200`）与 `android:tablet`（`AVD_2560x1600`），用于显式指定启动目标。

### 手机 AVD 竖屏修正
- 已按用户要求直接修改 `AVD_2640x1200` 配置为竖屏手机尺寸：`hw.lcd.width=1200`、`hw.lcd.height=2640`、`hw.initialOrientation=portrait`。
- 已在修改前备份 `AVD_2640x1200.avd\config.ini` 为 `config.ini.bak_20260502_202047_portrait_fix`。
