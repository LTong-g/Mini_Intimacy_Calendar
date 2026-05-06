package com.ltongg.MinimalistWeaponEnhancementCalendar

import android.app.AlarmManager
import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import java.io.ByteArrayOutputStream
import java.util.Locale
import java.util.concurrent.Executors
import kotlin.math.max
import kotlin.math.min

class UsageAccessModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  private val backgroundExecutor = Executors.newSingleThreadExecutor()

  override fun getName(): String = "UsageAccessModule"

  @ReactMethod
  fun getStatus(promise: Promise) {
    try {
      promise.resolve(buildStatus())
    } catch (error: Exception) {
      promise.reject("USAGE_ACCESS_STATUS_FAILED", error)
    }
  }

  @ReactMethod
  fun openUsageAccessSettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("OPEN_USAGE_ACCESS_SETTINGS_FAILED", error)
    }
  }

  @ReactMethod
  fun openAppDetailsSettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
        data = Uri.parse("package:${reactContext.packageName}")
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("OPEN_APP_DETAILS_SETTINGS_FAILED", error)
    }
  }

  @ReactMethod
  fun openExactAlarmSettings(promise: Promise) {
    try {
      val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
          data = Uri.parse("package:${reactContext.packageName}")
        }
      } else {
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
          data = Uri.parse("package:${reactContext.packageName}")
        }
      }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("OPEN_EXACT_ALARM_SETTINGS_FAILED", error)
    }
  }

  @ReactMethod
  fun openBatteryOptimizationSettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (error: Exception) {
      try {
        val fallbackIntent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
          data = Uri.parse("package:${reactContext.packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        reactContext.startActivity(fallbackIntent)
        promise.resolve(true)
      } catch (fallbackError: Exception) {
        promise.reject("OPEN_BATTERY_OPTIMIZATION_SETTINGS_FAILED", fallbackError)
      }
    }
  }

  @ReactMethod
  fun requestIgnoreBatteryOptimizations(promise: Promise) {
    try {
      val powerManager = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
      if (powerManager.isIgnoringBatteryOptimizations(reactContext.packageName)) {
        promise.resolve(true)
        return
      }

      val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
        data = Uri.parse("package:${reactContext.packageName}")
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("REQUEST_IGNORE_BATTERY_OPTIMIZATIONS_FAILED", error)
    }
  }

  @ReactMethod
  fun setFeatureEnabled(enabled: Boolean, promise: Promise) {
    try {
      UsageAccessScheduler.setEnabled(reactContext, enabled)
      promise.resolve(buildStatus())
    } catch (error: Exception) {
      promise.reject("SET_USAGE_ACCESS_FEATURE_FAILED", error)
    }
  }

  @ReactMethod
  fun clearStoredUsageRecords(promise: Promise) {
    try {
      UsageAccessScheduler.clearStoredUsageRecords(reactContext)
      promise.resolve(buildStatus())
    } catch (error: Exception) {
      promise.reject("CLEAR_USAGE_RECORDS_FAILED", error)
    }
  }

  @ReactMethod
  fun getLaunchableApplications(promise: Promise) {
    backgroundExecutor.execute {
      try {
        val packageManager = reactContext.packageManager
        val launcherIntent = Intent(Intent.ACTION_MAIN).apply {
          addCategory(Intent.CATEGORY_LAUNCHER)
        }
        val apps = packageManager.queryIntentActivities(launcherIntent, 0)
          .map { resolveInfo ->
            val packageName = resolveInfo.activityInfo.packageName
            val label = resolveInfo.loadLabel(packageManager)?.toString()?.trim()
            val iconInfo = drawableToIconInfo(resolveInfo.loadIcon(packageManager))
            LaunchableApp(
              packageName,
              if (label.isNullOrBlank()) packageName else label,
              iconInfo?.dataUri,
              iconInfo?.dominantColor
            )
          }
          .distinctBy { it.packageName }
          .sortedWith(
            compareBy<LaunchableApp> { it.label.lowercase(Locale.getDefault()) }
              .thenBy { it.packageName }
          )

        val result = Arguments.createArray()
        apps.forEach { app ->
          result.pushMap(Arguments.createMap().apply {
            putString("packageName", app.packageName)
            putString("label", app.label)
            putString("icon", app.icon)
            putString("color", app.color)
          })
        }
        promise.resolve(result)
      } catch (error: Exception) {
        promise.reject("GET_LAUNCHABLE_APPLICATIONS_FAILED", error)
      }
    }
  }

  @ReactMethod
  fun queryUsageIntervals(packageNames: ReadableArray, beginTime: Double, endTime: Double, promise: Promise) {
    try {
      if (!hasUsageAccess()) {
        promise.reject("USAGE_ACCESS_NOT_GRANTED", "Usage access is not granted.")
        return
      }

      val selectedPackages = mutableSetOf<String>()
      for (index in 0 until packageNames.size()) {
        packageNames.getString(index)?.let { packageName ->
          if (packageName.isNotBlank()) selectedPackages.add(packageName)
        }
      }

      if (selectedPackages.isEmpty()) {
        promise.resolve(Arguments.createArray())
        return
      }

      val result = queryIntervals(
        selectedPackages,
        beginTime.toLong(),
        endTime.toLong()
      )
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("QUERY_USAGE_INTERVALS_FAILED", error)
    }
  }

  private fun buildStatus(): WritableMap {
    val map = Arguments.createMap()
    map.putBoolean("featureEnabled", UsageAccessScheduler.isEnabled(reactContext))
    map.putBoolean("usageAccessGranted", hasUsageAccess())
    map.putBoolean("ignoringBatteryOptimizations", isIgnoringBatteryOptimizations())
    map.putBoolean("canScheduleExactAlarms", canScheduleExactAlarms())
    map.putBoolean("canRevokeUsageAccessInApp", false)
    return map
  }

  private fun hasUsageAccess(): Boolean {
    val appOps = reactContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      appOps.unsafeCheckOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        android.os.Process.myUid(),
        reactContext.packageName
      )
    } else {
      appOps.checkOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        android.os.Process.myUid(),
        reactContext.packageName
      )
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  private fun isIgnoringBatteryOptimizations(): Boolean {
    val powerManager = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
    return powerManager.isIgnoringBatteryOptimizations(reactContext.packageName)
  }

  private fun canScheduleExactAlarms(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return alarmManager.canScheduleExactAlarms()
  }

  private fun drawableToIconInfo(drawable: Drawable?): IconInfo? {
    if (drawable == null) return null
    val width = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth else 128
    val height = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight else 128
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    drawable.setBounds(0, 0, canvas.width, canvas.height)
    drawable.draw(canvas)

    val output = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)
    val encoded = Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP)
    return IconInfo("data:image/png;base64,$encoded", extractDominantColor(bitmap))
  }

  private fun extractDominantColor(bitmap: Bitmap): String? {
    val sampleSize = 24
    val stepX = max(1, bitmap.width / sampleSize)
    val stepY = max(1, bitmap.height / sampleSize)
    val buckets = mutableMapOf<Int, ColorBucket>()

    var y = 0
    while (y < bitmap.height) {
      var x = 0
      while (x < bitmap.width) {
        val color = bitmap.getPixel(x, y)
        val alpha = Color.alpha(color)
        if (alpha >= 64) {
          val red = Color.red(color)
          val green = Color.green(color)
          val blue = Color.blue(color)
          val saturation = colorSaturation(red, green, blue)
          val brightness = (max(red, max(green, blue)) / 255.0)
          if (saturation >= 0.18 && brightness >= 0.18) {
            val key = ((red / 32) shl 16) or ((green / 32) shl 8) or (blue / 32)
            val bucket = buckets.getOrPut(key) { ColorBucket() }
            bucket.count += 1
            bucket.score += saturation * alpha
            bucket.colors[color] = (bucket.colors[color] ?: 0) + 1
          }
        }
        x += stepX
      }
      y += stepY
    }

    val bucket = buckets.values.maxByOrNull { it.score + it.count } ?: return null
    if (bucket.count <= 0) return null

    val dominantColor = bucket.colors.maxByOrNull { it.value }?.key ?: return null
    return "#%02X%02X%02X".format(
      Color.red(dominantColor),
      Color.green(dominantColor),
      Color.blue(dominantColor)
    )
  }

  private fun colorSaturation(red: Int, green: Int, blue: Int): Double {
    val maxValue = max(red, max(green, blue)).toDouble()
    val minValue = min(red, min(green, blue)).toDouble()
    if (maxValue <= 0.0) return 0.0
    return (maxValue - minValue) / maxValue
  }

  private fun queryIntervals(
    selectedPackages: Set<String>,
    beginTime: Long,
    endTime: Long
  ): WritableArray {
    val usageStatsManager = reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val usageEvents = usageStatsManager.queryEvents(beginTime, endTime)
    val event = UsageEvents.Event()
    val activeStarts = mutableMapOf<String, Long>()
    val intervals = mutableListOf<UsageInterval>()

    while (usageEvents.hasNextEvent()) {
      usageEvents.getNextEvent(event)
      val packageName = event.packageName ?: continue
      if (!selectedPackages.contains(packageName)) continue

      when (event.eventType) {
        UsageEvents.Event.ACTIVITY_RESUMED,
        UsageEvents.Event.MOVE_TO_FOREGROUND -> {
          if (!activeStarts.containsKey(packageName)) {
            activeStarts[packageName] = event.timeStamp.coerceAtLeast(beginTime)
          }
        }
        UsageEvents.Event.ACTIVITY_PAUSED,
        UsageEvents.Event.ACTIVITY_STOPPED,
        UsageEvents.Event.MOVE_TO_BACKGROUND -> {
          val startTime = activeStarts.remove(packageName)
          if (startTime != null) {
            val end = event.timeStamp.coerceAtMost(endTime)
            if (end > startTime) {
              intervals.add(UsageInterval(packageName, startTime, end))
            }
          }
        }
      }
    }

    activeStarts.forEach { entry ->
      if (endTime > entry.value) {
        intervals.add(UsageInterval(entry.key, entry.value, endTime))
      }
    }

    val result = Arguments.createArray()
    intervals
      .sortedWith(compareBy<UsageInterval> { it.startTime }.thenBy { it.packageName })
      .forEach { interval ->
        result.pushMap(Arguments.createMap().apply {
          putString("packageName", interval.packageName)
          putDouble("startTime", interval.startTime.toDouble())
          putDouble("endTime", interval.endTime.toDouble())
          putDouble("durationMs", (interval.endTime - interval.startTime).toDouble())
        })
      }
    return result
  }

  private data class UsageInterval(
    val packageName: String,
    val startTime: Long,
    val endTime: Long
  )

  private data class LaunchableApp(
    val packageName: String,
    val label: String,
    val icon: String?,
    val color: String?
  )

  private data class IconInfo(
    val dataUri: String,
    val dominantColor: String?
  )

  private data class ColorBucket(
    var count: Int = 0,
    var score: Double = 0.0,
    val colors: MutableMap<Int, Int> = mutableMapOf()
  )
}
