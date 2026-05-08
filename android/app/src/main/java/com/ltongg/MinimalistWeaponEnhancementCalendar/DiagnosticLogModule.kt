package com.ltongg.MinimalistWeaponEnhancementCalendar

import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.net.URLEncoder

class DiagnosticLogModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "DiagnosticLogModule"

  @ReactMethod(isBlockingSynchronousMethod = true)
  fun recordProblemSync(source: String, message: String, stack: String?): Boolean {
    return DiagnosticLogManager.writeProblem(
      reactContext,
      source = source.ifBlank { "js-problem" },
      message = message.ifBlank { "No message." },
      stack = stack,
      threadName = "js"
    )
  }

  @ReactMethod
  fun hasLogs(promise: Promise) {
    try {
      promise.resolve(DiagnosticLogManager.hasLogs(reactContext))
    } catch (error: Exception) {
      promise.reject("DIAGNOSTIC_LOG_STATUS_FAILED", error)
    }
  }

  @ReactMethod
  fun openLogFolder(promise: Promise) {
    try {
      val logDir = DiagnosticLogManager.getLogDirectory(reactContext)
      if (!logDir.exists() || !logDir.isDirectory) {
        promise.reject("DIAGNOSTIC_LOG_FOLDER_MISSING", "Log folder does not exist.")
        return
      }

      if (openWithSystemFileManager()) {
        promise.resolve(true)
        return
      }
      promise.reject("OPEN_DIAGNOSTIC_LOG_FOLDER_FAILED", "当前设备无法直接打开问题日志文件夹。")
    } catch (error: Exception) {
      promise.reject("OPEN_DIAGNOSTIC_LOG_FOLDER_FAILED", error)
    }
  }

  private fun openWithSystemFileManager(): Boolean {
    for (intent in buildLogFolderIntents()) {
      try {
        reactContext.startActivity(intent)
        return true
      } catch (_: ActivityNotFoundException) {
        // Try the next known DocumentsUI package name.
      } catch (_: SecurityException) {
        // Some systems block direct Android/data directory views.
      }
    }
    return false
  }

  private fun buildLogFolderIntents(): List<Intent> {
    val documentsPath = "primary:Android/data/${reactContext.packageName}/files/diagnostic-logs"
    val encodedPath = URLEncoder.encode(documentsPath, "UTF-8")
    val uri = Uri.parse("content://com.android.externalstorage.documents/document/$encodedPath")
    return listOf(
      buildLogFolderIntent(uri, "com.google.android.documentsui"),
      buildLogFolderIntent(uri, "com.android.documentsui")
    )
  }

  private fun buildLogFolderIntent(uri: Uri, packageName: String): Intent {
    return Intent(Intent.ACTION_VIEW).apply {
      setDataAndType(uri, "vnd.android.document/directory")
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        putExtra("android.provider.extra.SHOW_ADVANCED", true)
      }
      component = ComponentName(
        packageName,
        "com.android.documentsui.files.FilesActivity"
      )
    }
  }
}
