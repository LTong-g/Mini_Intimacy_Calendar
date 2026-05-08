package com.ltongg.MinimalistWeaponEnhancementCalendar

import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

object DiagnosticLogManager {
  private const val LOG_DIR_NAME = "diagnostic-logs"
  private const val ANR_TIMEOUT_MS = 8000L
  private const val ANR_LOG_INTERVAL_MS = 60000L
  private val installed = AtomicBoolean(false)
  private val lastAnrLogAt = AtomicLong(0L)

  fun install(context: Context) {
    val appContext = context.applicationContext
    if (!installed.compareAndSet(false, true)) return
    installUncaughtExceptionHandler(appContext)
    startAnrWatchdog(appContext)
  }

  fun getLogDirectory(context: Context): File {
    val externalRoot = context.getExternalFilesDir(null)
    val root = externalRoot ?: context.filesDir
    return File(root, LOG_DIR_NAME)
  }

  fun hasLogs(context: Context): Boolean {
    val dir = getLogDirectory(context)
    if (!dir.exists() || !dir.isDirectory) return false
    return dir.listFiles { file -> file.isFile && file.extension == "log" }?.isNotEmpty() == true
  }

  fun writeProblem(
    context: Context,
    source: String,
    message: String,
    stack: String? = null,
    threadName: String? = null
  ): Boolean {
    return try {
      val dir = getLogDirectory(context)
      if (!dir.exists()) {
        dir.mkdirs()
      }
      val timestamp = SimpleDateFormat("yyyyMMdd-HHmmss-SSS", Locale.US).format(Date())
      val file = File(dir, "diagnostic-$timestamp.log")
      file.writeText(
        buildLogContent(context, source, message, stack, threadName),
        Charsets.UTF_8
      )
      true
    } catch (_: Exception) {
      false
    }
  }

  private fun installUncaughtExceptionHandler(context: Context) {
    val previousHandler = Thread.getDefaultUncaughtExceptionHandler()
    Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
      writeProblem(
        context,
        source = "android-uncaught-exception",
        message = throwable.message ?: throwable.javaClass.name,
        stack = throwable.stackTraceToString(),
        threadName = thread.name
      )
      previousHandler?.uncaughtException(thread, throwable)
    }
  }

  private fun startAnrWatchdog(context: Context) {
    val mainHandler = Handler(Looper.getMainLooper())
    val marker = AtomicLong(0L)
    val watchdog = Thread({
      var sequence = 0L
      while (true) {
        sequence += 1
        marker.set(sequence)
        mainHandler.post {
          if (marker.get() == sequence) {
            marker.set(0L)
          }
        }
        try {
          Thread.sleep(ANR_TIMEOUT_MS)
        } catch (_: InterruptedException) {
          return@Thread
        }

        if (marker.get() == sequence) {
          val now = SystemClock.elapsedRealtime()
          val previous = lastAnrLogAt.get()
          if (now - previous >= ANR_LOG_INTERVAL_MS && lastAnrLogAt.compareAndSet(previous, now)) {
            val mainThread = Looper.getMainLooper().thread
            writeProblem(
              context,
              source = "android-main-thread-unresponsive",
              message = "Main thread did not respond for at least ${ANR_TIMEOUT_MS}ms.",
              stack = mainThread.stackTrace.joinToString(separator = "\n") { "  at $it" },
              threadName = mainThread.name
            )
          }
        }
      }
    }, "DiagnosticAnrWatchdog")
    watchdog.isDaemon = true
    watchdog.start()
  }

  private fun buildLogContent(
    context: Context,
    source: String,
    message: String,
    stack: String?,
    threadName: String?
  ): String {
    val createdAt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ", Locale.US).format(Date())
    val packageInfo = runCatching {
      context.packageManager.getPackageInfo(context.packageName, 0)
    }.getOrNull()
    return buildString {
      appendLine("createdAt=$createdAt")
      appendLine("source=$source")
      appendLine("package=${context.packageName}")
      appendLine("versionName=${packageInfo?.versionName ?: "unknown"}")
      appendLine("versionCode=${getVersionCode(packageInfo)}")
      appendLine("androidSdk=${Build.VERSION.SDK_INT}")
      appendLine("device=${Build.MANUFACTURER} ${Build.MODEL}")
      if (!threadName.isNullOrBlank()) {
        appendLine("thread=$threadName")
      }
      appendLine()
      appendLine("message:")
      appendLine(message)
      if (!stack.isNullOrBlank()) {
        appendLine()
        appendLine("stack:")
        appendLine(stack)
      }
    }
  }

  private fun getVersionCode(packageInfo: android.content.pm.PackageInfo?): String {
    if (packageInfo == null) return "unknown"
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      packageInfo.longVersionCode.toString()
    } else {
      @Suppress("DEPRECATION")
      packageInfo.versionCode.toString()
    }
  }
}
