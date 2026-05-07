package com.ltongg.MinimalistWeaponEnhancementCalendar

import android.app.AlarmManager
import android.app.PendingIntent
import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.os.Build
import com.reactnativecommunity.asyncstorage.ReactDatabaseSupplier
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

object UsageAccessScheduler {
  private const val ACTION_REFRESH = "com.ltongg.MinimalistWeaponEnhancementCalendar.USAGE_ACCESS_REFRESH"
  private const val REQUEST_CODE_BASE = 235500
  private const val PREF_NAME = "usage_access_feature"
  private const val KEY_ENABLED = "enabled"
  private const val KEY_LAST_REFRESH_AT = "last_refresh_at"
  private const val KEY_LAST_REFRESH_REASON = "last_refresh_reason"
  private const val KEY_LAST_REFRESH_PACKAGE_COUNT = "last_refresh_package_count"
  private const val KEY_LAST_REFRESH_INTERVAL_COUNT = "last_refresh_interval_count"
  private const val KEY_LAST_REFRESH_SELECTED_COUNT = "last_refresh_selected_count"
  private const val KEY_LAST_REFRESH_ERROR = "last_refresh_error"
  private const val BLACKLIST_DATA_KEY = "app_data_blacklist"
  private const val LEGACY_BLACKLIST_KEY = "experimental_usage_blacklist"
  private const val LEGACY_INTERVALS_KEY = "experimental_usage_intervals"
  private const val ASYNC_STORAGE_TABLE = "catalystLocalStorage"
  private const val ASYNC_STORAGE_KEY_COLUMN = "key"
  private const val ASYNC_STORAGE_VALUE_COLUMN = "value"
  private const val MERGE_GAP_MS = 2 * 60 * 1000L
  private val refreshLock = Any()

  data class RefreshResult(
    val requestBeginTime: Long,
    val requestEndTime: Long,
    val actualBeginTime: Long?,
    val actualEndTime: Long?,
    val readIntervalCount: Int,
    val savedIntervalCount: Int,
    val packageCount: Int,
    val selectedCount: Int,
    val errorMessage: String?
  )

  fun setEnabled(context: Context, enabled: Boolean) {
    context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
      .edit()
      .putBoolean(KEY_ENABLED, enabled)
      .apply()

    if (enabled) {
      scheduleDailyRefresh(context)
    } else {
      cancelDailyRefresh(context)
    }
  }

  fun isEnabled(context: Context): Boolean {
    return context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
      .getBoolean(KEY_ENABLED, false)
  }

  fun scheduleDailyRefresh(context: Context) {
    if (!isEnabled(context)) return

    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    for (minute in 55..59) {
      val triggerAt = nextTriggerTime(minute)
      val pendingIntent = createPendingIntent(context, minute)
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarmManager.canScheduleExactAlarms()) {
          alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
        } else {
          alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
        }
      } catch (error: SecurityException) {
        alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
      }
    }
  }

  fun cancelDailyRefresh(context: Context) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    for (minute in 55..59) {
      val pendingIntent = buildPendingIntent(
        context,
        minute,
        PendingIntent.FLAG_NO_CREATE
      )
      if (pendingIntent != null) {
        alarmManager.cancel(pendingIntent)
        pendingIntent.cancel()
      }
    }
  }

  fun refreshUsageStats(context: Context, reason: String): RefreshResult {
    val endTime = System.currentTimeMillis()
    val beginTime = recentRefreshStartTime(endTime)
    return refreshUsageStats(context, beginTime, endTime, reason)
  }

  fun refreshUsageStats(
    context: Context,
    beginTime: Long,
    endTime: Long,
    reason: String
  ): RefreshResult {
    if (endTime <= beginTime) {
      val result = RefreshResult(
        requestBeginTime = beginTime,
        requestEndTime = endTime,
        actualBeginTime = null,
        actualEndTime = null,
        readIntervalCount = 0,
        savedIntervalCount = 0,
        packageCount = 0,
        selectedCount = 0,
        errorMessage = "Invalid refresh range."
      )
      writeRefreshState(context, reason, result)
      return result
    }

    var packageCount = 0
    var readIntervalCount = 0
    var savedIntervalCount = 0
    var selectedCount = 0
    var actualBeginTime: Long? = null
    var actualEndTime: Long? = null
    var errorMessage: String? = null

    synchronized(refreshLock) {
      try {
        if (!hasUsageAccess(context)) {
          errorMessage = "Usage access is not granted."
        } else {
          val periods = readBlacklistPeriods(context)
          val selectedPackages = periods
            .filter { it.overlaps(beginTime, endTime) }
            .map { it.packageName }
            .toSet()
          selectedCount = selectedPackages.size

          if (selectedPackages.isNotEmpty()) {
            val queriedIntervals = queryUsageIntervals(context, selectedPackages, beginTime, endTime)
            val clippedIntervals = clipIntervalsToPeriods(queriedIntervals, periods, beginTime, endTime)
            val mergedReadIntervals = mergeUsageIntervals(clippedIntervals)
            val mergedIntervals = mergeUsageIntervals(readStoredIntervals(context) + clippedIntervals)
            writeStoredIntervals(context, mergedIntervals)

            actualBeginTime = mergedReadIntervals.minOfOrNull { it.startTime }
            actualEndTime = mergedReadIntervals.maxOfOrNull { it.endTime }
            packageCount = mergedReadIntervals.map { it.packageName }.distinct().size
            readIntervalCount = mergedReadIntervals.size
            savedIntervalCount = mergedIntervals.size
          }
        }
      } catch (error: Exception) {
        errorMessage = error.message ?: error.javaClass.simpleName
      }
    }

    val result = RefreshResult(
      requestBeginTime = beginTime,
      requestEndTime = endTime,
      actualBeginTime = actualBeginTime,
      actualEndTime = actualEndTime,
      readIntervalCount = readIntervalCount,
      savedIntervalCount = savedIntervalCount,
      packageCount = packageCount,
      selectedCount = selectedCount,
      errorMessage = errorMessage
    )
    writeRefreshState(context, reason, result)
    return result
  }

  private fun writeRefreshState(context: Context, reason: String, result: RefreshResult) {
    context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
      .edit()
      .putLong(KEY_LAST_REFRESH_AT, System.currentTimeMillis())
      .putString(KEY_LAST_REFRESH_REASON, reason)
      .putInt(KEY_LAST_REFRESH_PACKAGE_COUNT, result.packageCount)
      .putInt(KEY_LAST_REFRESH_INTERVAL_COUNT, result.savedIntervalCount)
      .putInt(KEY_LAST_REFRESH_SELECTED_COUNT, result.selectedCount)
      .apply {
        if (result.errorMessage == null) {
          remove(KEY_LAST_REFRESH_ERROR)
        } else {
          putString(KEY_LAST_REFRESH_ERROR, result.errorMessage)
        }
      }
      .apply()
  }

  fun clearStoredUsageRecords(context: Context) {
    val data = readBlacklistData(context)
    data.put("intervals", JSONArray())
    data.put("refreshState", JSONObject())
    writeAsyncStorageItem(context, BLACKLIST_DATA_KEY, data.toString())
    context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
      .edit()
      .remove(KEY_LAST_REFRESH_AT)
      .remove(KEY_LAST_REFRESH_REASON)
      .remove(KEY_LAST_REFRESH_PACKAGE_COUNT)
      .remove(KEY_LAST_REFRESH_INTERVAL_COUNT)
      .remove(KEY_LAST_REFRESH_SELECTED_COUNT)
      .remove(KEY_LAST_REFRESH_ERROR)
      .apply()
  }

  private fun hasUsageAccess(context: Context): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      appOps.unsafeCheckOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        android.os.Process.myUid(),
        context.packageName
      )
    } else {
      appOps.checkOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        android.os.Process.myUid(),
        context.packageName
      )
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  private fun recentRefreshStartTime(now: Long): Long {
    return Calendar.getInstance().apply {
      timeInMillis = now
      add(Calendar.DAY_OF_YEAR, -2)
      set(Calendar.HOUR_OF_DAY, 0)
      set(Calendar.MINUTE, 0)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }.timeInMillis
  }

  private fun readBlacklistData(context: Context): JSONObject {
    val stored = readAsyncStorageItem(context, BLACKLIST_DATA_KEY)
    if (!stored.isNullOrBlank()) {
      try {
        return JSONObject(stored)
      } catch (_: Exception) {
      }
    }

    val legacyIntervals = readLegacyIntervals(context)
    val legacyStartByPackage = mutableMapOf<String, Long>()
    for (index in 0 until legacyIntervals.length()) {
      val item = legacyIntervals.optJSONObject(index) ?: continue
      val packageName = item.optString("packageName").trim()
      val startTime = item.optDouble("startTime", Double.NaN)
      if (packageName.isNotEmpty() && startTime.isFinite()) {
        val current = legacyStartByPackage[packageName]
        legacyStartByPackage[packageName] = if (current == null) {
          startTime.toLong()
        } else {
          minOf(current, startTime.toLong())
        }
      }
    }
    val now = System.currentTimeMillis()
    val legacyPeriods = JSONArray()
    val legacyBlacklist = readAsyncStorageItem(context, LEGACY_BLACKLIST_KEY)
    if (!legacyBlacklist.isNullOrBlank()) {
      try {
        val apps = JSONArray(legacyBlacklist)
        for (index in 0 until apps.length()) {
          val packageName = apps.optJSONObject(index)
            ?.optString("packageName")
            ?.trim()
            .orEmpty()
          if (packageName.isNotEmpty()) {
            legacyPeriods.put(
              JSONObject()
                .put("packageName", packageName)
                .put("startAt", legacyStartByPackage[packageName] ?: now)
                .put("endAt", JSONObject.NULL)
                .put("endReason", JSONObject.NULL)
            )
          }
        }
      } catch (_: Exception) {
      }
    }

    return JSONObject()
      .put("schemaVersion", 2)
      .put("appsByPackage", JSONObject())
      .put("periods", legacyPeriods)
      .put("intervals", legacyIntervals)
      .put("refreshState", JSONObject())
  }

  private fun readBlacklistPeriods(context: Context): List<BlacklistPeriod> {
    val periods = readBlacklistData(context).optJSONArray("periods") ?: return emptyList()
    val result = mutableListOf<BlacklistPeriod>()
    for (index in 0 until periods.length()) {
      val item = periods.optJSONObject(index) ?: continue
      val packageName = item.optString("packageName").trim()
      val startAt = item.optDouble("startAt", Double.NaN)
      val endAtValue = item.opt("endAt")
      val endAt = when (endAtValue) {
        null, JSONObject.NULL -> null
        is Number -> endAtValue.toLong()
        else -> item.optDouble("endAt", Double.NaN).takeIf { it.isFinite() }?.toLong()
      }
      if (
        packageName.isNotEmpty() &&
        startAt.isFinite() &&
        (endAt == null || endAt > startAt.toLong())
      ) {
        result.add(BlacklistPeriod(packageName, startAt.toLong(), endAt))
      }
    }
    return result
  }

  private fun readStoredIntervals(context: Context): List<UsageInterval> {
    val intervals = readBlacklistData(context).optJSONArray("intervals") ?: return readLegacyIntervalsAsList(context)
    val result = mutableListOf<UsageInterval>()
    for (index in 0 until intervals.length()) {
      val item = intervals.optJSONObject(index) ?: continue
      val packageName = item.optString("packageName").trim()
      val startTime = item.optDouble("startTime", Double.NaN)
      val endTime = item.optDouble("endTime", Double.NaN)
      if (
        packageName.isNotEmpty() &&
        startTime.isFinite() &&
        endTime.isFinite() &&
        endTime > startTime
      ) {
        result.add(UsageInterval(packageName, startTime.toLong(), endTime.toLong()))
      }
    }
    return result
  }

  private fun writeStoredIntervals(context: Context, intervals: List<UsageInterval>) {
    val array = JSONArray()
    intervals.forEach { interval ->
      array.put(
        org.json.JSONObject()
          .put("packageName", interval.packageName)
          .put("startTime", interval.startTime.toDouble())
          .put("endTime", interval.endTime.toDouble())
          .put("durationMs", (interval.endTime - interval.startTime).toDouble())
      )
    }
    val data = readBlacklistData(context)
    data.put("schemaVersion", 2)
    data.put("intervals", array)
    writeAsyncStorageItem(context, BLACKLIST_DATA_KEY, data.toString())
  }

  private fun readLegacyIntervals(context: Context): JSONArray {
    val stored = readAsyncStorageItem(context, LEGACY_INTERVALS_KEY) ?: return JSONArray()
    return try {
      JSONArray(stored)
    } catch (_: Exception) {
      JSONArray()
    }
  }

  private fun readLegacyIntervalsAsList(context: Context): List<UsageInterval> {
    val intervals = readLegacyIntervals(context)
    val result = mutableListOf<UsageInterval>()
    for (index in 0 until intervals.length()) {
      val item = intervals.optJSONObject(index) ?: continue
      val packageName = item.optString("packageName").trim()
      val startTime = item.optDouble("startTime", Double.NaN)
      val endTime = item.optDouble("endTime", Double.NaN)
      if (
        packageName.isNotEmpty() &&
        startTime.isFinite() &&
        endTime.isFinite() &&
        endTime > startTime
      ) {
        result.add(UsageInterval(packageName, startTime.toLong(), endTime.toLong()))
      }
    }
    return result
  }

  private fun queryUsageIntervals(
    context: Context,
    selectedPackages: Set<String>,
    beginTime: Long,
    endTime: Long
  ): List<UsageInterval> {
    val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val usageEvents = usageStatsManager.queryEvents(beginTime, endTime)
    val event = UsageEvents.Event()
    val activeStarts = mutableMapOf<String, Long>()
    val intervals = mutableListOf<UsageInterval>()

    while (usageEvents.hasNextEvent()) {
      usageEvents.getNextEvent(event)
      val packageName = event.packageName ?: continue
      val eventTime = event.timeStamp.coerceIn(beginTime, endTime)

      when (event.eventType) {
        UsageEvents.Event.ACTIVITY_RESUMED,
        UsageEvents.Event.MOVE_TO_FOREGROUND -> {
          activeStarts
            .filterKeys { activePackage -> activePackage != packageName }
            .forEach { entry ->
              if (eventTime > entry.value) {
                intervals.add(UsageInterval(entry.key, entry.value, eventTime))
              }
            }
          activeStarts.keys.removeAll { activePackage -> activePackage != packageName }

          if (selectedPackages.contains(packageName) && !activeStarts.containsKey(packageName)) {
            activeStarts[packageName] = eventTime
          }
        }
        UsageEvents.Event.ACTIVITY_PAUSED,
        UsageEvents.Event.ACTIVITY_STOPPED,
        UsageEvents.Event.MOVE_TO_BACKGROUND -> {
          if (!selectedPackages.contains(packageName)) continue
          val startTime = activeStarts.remove(packageName)
          if (startTime != null) {
            val end = eventTime
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

    return intervals
  }

  private fun clipIntervalsToPeriods(
    intervals: List<UsageInterval>,
    periods: List<BlacklistPeriod>,
    beginTime: Long,
    endTime: Long
  ): List<UsageInterval> {
    val result = mutableListOf<UsageInterval>()
    intervals.forEach { interval ->
      periods
        .filter {
          it.packageName == interval.packageName &&
            it.overlaps(beginTime, endTime) &&
            it.startAt < interval.endTime &&
            it.endTimeOrMax() > interval.startTime
        }
        .forEach { period ->
          val start = maxOf(interval.startTime, period.startAt, beginTime)
          val end = minOf(interval.endTime, period.endTimeOrMax(), endTime)
          if (end > start) {
            result.add(UsageInterval(interval.packageName, start, end))
          }
        }
    }
    return result
  }

  private fun mergeUsageIntervals(intervals: List<UsageInterval>): List<UsageInterval> {
    val deduped = linkedMapOf<String, UsageInterval>()
    intervals
      .filter { it.packageName.isNotBlank() && it.endTime > it.startTime }
      .forEach { interval ->
        deduped["${interval.packageName}:${interval.startTime}:${interval.endTime}"] = interval
      }

    val segments = buildNonOverlappingSegments(deduped.values.toList())
    val merged = mutableListOf<UsageInterval>()
    segments
      .sortedWith(
        compareBy<UsageInterval> { it.packageName }
          .thenBy { it.startTime }
          .thenBy { it.endTime }
      )
      .forEach { interval ->
        val last = merged.lastOrNull()
        if (
          last != null &&
          last.packageName == interval.packageName &&
          interval.startTime - last.endTime <= MERGE_GAP_MS &&
          !hasDifferentPackageUsageBetween(segments, interval.packageName, last.endTime, interval.startTime)
        ) {
          merged[merged.lastIndex] = UsageInterval(
            last.packageName,
            last.startTime,
            maxOf(last.endTime, interval.endTime)
          )
        } else {
          merged.add(interval)
        }
      }

    return merged.sortedWith(compareBy<UsageInterval> { it.startTime }.thenBy { it.packageName })
  }

  private fun buildNonOverlappingSegments(intervals: List<UsageInterval>): List<UsageInterval> {
    val boundaries = intervals
      .flatMap { listOf(it.startTime, it.endTime) }
      .distinct()
      .sorted()
    val segments = mutableListOf<UsageInterval>()

    for (index in 0 until boundaries.lastIndex) {
      val startTime = boundaries[index]
      val endTime = boundaries[index + 1]
      if (endTime <= startTime) continue

      val winner = intervals
        .filter { it.startTime < endTime && it.endTime > startTime }
        .sortedWith(
          compareByDescending<UsageInterval> { it.startTime }
            .thenBy { it.endTime - it.startTime }
            .thenBy { it.packageName }
        )
        .firstOrNull()
        ?: continue
      val last = segments.lastOrNull()
      if (last != null && last.packageName == winner.packageName && last.endTime == startTime) {
        segments[segments.lastIndex] = UsageInterval(last.packageName, last.startTime, endTime)
      } else {
        segments.add(UsageInterval(winner.packageName, startTime, endTime))
      }
    }

    return segments
  }

  private fun hasDifferentPackageUsageBetween(
    intervals: List<UsageInterval>,
    packageName: String,
    startTime: Long,
    endTime: Long
  ): Boolean {
    if (endTime <= startTime) return false
    return intervals.any {
      it.packageName != packageName &&
        it.startTime < endTime &&
        it.endTime > startTime
    }
  }

  private fun readAsyncStorageItem(context: Context, key: String): String? {
    val database = ReactDatabaseSupplier.getInstance(context).get()
    val cursor = database.query(
      ASYNC_STORAGE_TABLE,
      arrayOf(ASYNC_STORAGE_VALUE_COLUMN),
      "$ASYNC_STORAGE_KEY_COLUMN = ?",
      arrayOf(key),
      null,
      null,
      null
    )
    cursor.use {
      return if (it.moveToFirst()) it.getString(0) else null
    }
  }

  private fun writeAsyncStorageItem(context: Context, key: String, value: String) {
    val database = ReactDatabaseSupplier.getInstance(context).get()
    val values = ContentValues().apply {
      put(ASYNC_STORAGE_KEY_COLUMN, key)
      put(ASYNC_STORAGE_VALUE_COLUMN, value)
    }
    database.insertWithOnConflict(
      ASYNC_STORAGE_TABLE,
      null,
      values,
      SQLiteDatabase.CONFLICT_REPLACE
    )
  }

  private fun removeAsyncStorageItem(context: Context, key: String) {
    val database = ReactDatabaseSupplier.getInstance(context).get()
    database.delete(
      ASYNC_STORAGE_TABLE,
      "$ASYNC_STORAGE_KEY_COLUMN = ?",
      arrayOf(key)
    )
  }

  private fun nextTriggerTime(minute: Int): Long {
    val calendar = Calendar.getInstance()
    calendar.set(Calendar.HOUR_OF_DAY, 23)
    calendar.set(Calendar.MINUTE, minute)
    calendar.set(Calendar.SECOND, 0)
    calendar.set(Calendar.MILLISECOND, 0)

    if (calendar.timeInMillis <= System.currentTimeMillis()) {
      calendar.add(Calendar.DAY_OF_YEAR, 1)
    }

    return calendar.timeInMillis
  }

  private fun buildPendingIntent(
    context: Context,
    minute: Int,
    flags: Int
  ): PendingIntent? {
    val intent = Intent(context, UsageAccessRefreshReceiver::class.java).apply {
      action = ACTION_REFRESH
      putExtra("minute", minute)
    }
    val immutableFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_IMMUTABLE
    } else {
      0
    }
    return PendingIntent.getBroadcast(
      context,
      REQUEST_CODE_BASE + minute,
      intent,
      flags or immutableFlag
    )
  }

  private fun createPendingIntent(context: Context, minute: Int): PendingIntent {
    return buildPendingIntent(context, minute, PendingIntent.FLAG_UPDATE_CURRENT)
      ?: throw IllegalStateException("Failed to create pending intent for minute $minute")
  }

  private data class UsageInterval(
    val packageName: String,
    val startTime: Long,
    val endTime: Long
  )

  private data class BlacklistPeriod(
    val packageName: String,
    val startAt: Long,
    val endAt: Long?
  ) {
    fun endTimeOrMax(): Long = endAt ?: Long.MAX_VALUE

    fun overlaps(beginTime: Long, endTime: Long): Boolean {
      return startAt < endTime && endTimeOrMax() > beginTime
    }
  }
}
