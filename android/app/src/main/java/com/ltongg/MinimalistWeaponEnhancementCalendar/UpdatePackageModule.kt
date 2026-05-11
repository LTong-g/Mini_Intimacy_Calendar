package com.ltongg.MinimalistWeaponEnhancementCalendar

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale
import java.util.concurrent.Executors

class UpdatePackageModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  private val backgroundExecutor = Executors.newSingleThreadExecutor()

  override fun getName(): String = "UpdatePackageModule"

  @ReactMethod
  fun getDownloadedUpdate(promise: Promise) {
    backgroundExecutor.execute {
      try {
        promise.resolve(findDownloadedUpdate())
      } catch (error: Exception) {
        promise.reject("GET_DOWNLOADED_UPDATE_FAILED", error)
      }
    }
  }

  @ReactMethod
  fun deleteDownloadedUpdate(fileName: String, promise: Promise) {
    backgroundExecutor.execute {
      try {
        val file = resolveUpdateFile(fileName)
        promise.resolve(file.exists() && file.delete())
      } catch (error: Exception) {
        promise.reject("DELETE_DOWNLOADED_UPDATE_FAILED", error)
      }
    }
  }

  @ReactMethod
  fun downloadUpdate(downloadUrl: String, fileName: String?, expectedVersion: String?, promise: Promise) {
    backgroundExecutor.execute {
      try {
        val uri = Uri.parse(downloadUrl)
        if (uri.scheme != "https" && uri.scheme != "http") {
          promise.reject("INVALID_UPDATE_DOWNLOAD_URL", "更新包下载链接无效。")
          return@execute
        }

        val dir = getUpdateDirectory()
        if (!dir.exists()) dir.mkdirs()

        val targetName = sanitizeFileName(fileName)
          ?: "Mini_Intimacy_Calendar-v${sanitizeVersion(expectedVersion)}-android.apk"
        val target = File(dir, targetName)
        val temp = File(dir, "$targetName.download")
        if (temp.exists()) temp.delete()

        val connection = (URL(downloadUrl).openConnection() as HttpURLConnection).apply {
          connectTimeout = 15000
          readTimeout = 30000
          instanceFollowRedirects = true
          requestMethod = "GET"
        }

        try {
          val responseCode = connection.responseCode
          if (responseCode !in 200..299) {
            promise.reject("UPDATE_DOWNLOAD_HTTP_FAILED", "下载安装包失败，HTTP 状态 $responseCode。")
            return@execute
          }

          connection.inputStream.use { input ->
            FileOutputStream(temp).use { output ->
              input.copyTo(output)
            }
          }
        } finally {
          connection.disconnect()
        }

        val info = readApkInfo(temp)
        if (info == null) {
          temp.delete()
          promise.reject("INVALID_UPDATE_APK", "下载完成的文件不是有效安装包。")
          return@execute
        }
        if (info.packageName != reactContext.packageName) {
          temp.delete()
          promise.reject("UPDATE_APK_PACKAGE_MISMATCH", "安装包不属于当前应用。")
          return@execute
        }
        if (!expectedVersion.isNullOrBlank() && info.versionName != expectedVersion) {
          temp.delete()
          promise.reject("UPDATE_APK_VERSION_MISMATCH", "安装包版本与检查到的新版本不一致。")
          return@execute
        }
        if (compareVersions(info.versionName, getCurrentVersionName()) <= 0) {
          temp.delete()
          promise.reject("UPDATE_APK_NOT_NEWER", "安装包版本不高于当前版本。")
          return@execute
        }

        cleanupOtherUpdatePackages(targetName)
        if (target.exists()) target.delete()
        if (!temp.renameTo(target)) {
          temp.delete()
          promise.reject("SAVE_UPDATE_APK_FAILED", "安装包保存失败。")
          return@execute
        }
        promise.resolve(buildPackageMap(target, info))
      } catch (error: Exception) {
        promise.reject("DOWNLOAD_UPDATE_FAILED", error)
      }
    }
  }

  @ReactMethod
  fun installUpdate(fileName: String, promise: Promise) {
    try {
      val file = resolveUpdateFile(fileName)
      if (!file.exists() || !file.isFile) {
        promise.reject("UPDATE_APK_MISSING", "安装包文件不存在。")
        return
      }

      val info = readApkInfo(file)
      if (info == null || info.packageName != reactContext.packageName) {
        promise.reject("INVALID_UPDATE_APK", "安装包无效或不属于当前应用。")
        return
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !reactContext.packageManager.canRequestPackageInstalls()) {
        val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
          data = Uri.parse("package:${reactContext.packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        reactContext.startActivity(intent)
        promise.resolve(Arguments.createMap().apply {
          putBoolean("started", false)
          putBoolean("permissionRequired", true)
        })
        return
      }

      val authority = "${reactContext.packageName}.updatefileprovider"
      val apkUri = FileProvider.getUriForFile(reactContext, authority, file)
      val intent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(apkUri, "application/vnd.android.package-archive")
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      reactContext.startActivity(intent)
      promise.resolve(Arguments.createMap().apply {
        putBoolean("started", true)
        putBoolean("permissionRequired", false)
      })
    } catch (error: ActivityNotFoundException) {
      promise.reject("OPEN_UPDATE_INSTALLER_FAILED", "当前设备无法打开系统安装器。")
    } catch (error: Exception) {
      promise.reject("OPEN_UPDATE_INSTALLER_FAILED", error)
    }
  }

  private fun findDownloadedUpdate(): WritableMap? {
    val dir = getUpdateDirectory()
    if (!dir.exists() || !dir.isDirectory) return null

    val currentVersion = getCurrentVersionName()
    var best: Pair<File, ApkInfo>? = null
    dir.listFiles { file -> file.isFile && file.name.endsWith(".apk", ignoreCase = true) }
      ?.forEach { file ->
        val info = readApkInfo(file)
        if (info == null || info.packageName != reactContext.packageName) {
          file.delete()
          return@forEach
        }
        if (compareVersions(info.versionName, currentVersion) <= 0) {
          file.delete()
          return@forEach
        }
        val currentBest = best
        if (currentBest == null || compareVersions(info.versionName, currentBest.second.versionName) > 0) {
          best = file to info
        }
      }

    return best?.let { buildPackageMap(it.first, it.second) }
  }

  private fun cleanupOtherUpdatePackages(keepFileName: String) {
    getUpdateDirectory().listFiles()?.forEach { file ->
      if (file.isFile && file.name != keepFileName) {
        file.delete()
      }
    }
  }

  private fun readApkInfo(file: File): ApkInfo? {
    val packageInfo = reactContext.packageManager.getPackageArchiveInfo(file.absolutePath, 0) ?: return null
    val versionName = packageInfo.versionName ?: return null
    return ApkInfo(packageInfo.packageName, versionName, getLongVersionCode(packageInfo))
  }

  private fun buildPackageMap(file: File, info: ApkInfo): WritableMap =
    Arguments.createMap().apply {
      putString("fileName", file.name)
      putString("filePath", file.absolutePath)
      putString("packageName", info.packageName)
      putString("versionName", info.versionName)
      putDouble("versionCode", info.versionCode.toDouble())
      putDouble("size", file.length().toDouble())
      putDouble("downloadedAt", file.lastModified().toDouble())
    }

  private fun getUpdateDirectory(): File =
    File(reactContext.filesDir, "update-packages")

  private fun resolveUpdateFile(fileName: String): File {
    val safeName = sanitizeFileName(fileName) ?: throw IllegalArgumentException("Invalid file name.")
    return File(getUpdateDirectory(), safeName)
  }

  private fun getCurrentVersionName(): String {
    val info = reactContext.packageManager.getPackageInfo(reactContext.packageName, 0)
    return info.versionName ?: "0.0.0"
  }

  private fun getLongVersionCode(packageInfo: android.content.pm.PackageInfo): Long =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      packageInfo.longVersionCode
    } else {
      @Suppress("DEPRECATION")
      packageInfo.versionCode.toLong()
    }

  private fun sanitizeFileName(value: String?): String? {
    val trimmed = value?.trim().orEmpty()
    if (trimmed.isBlank()) return null
    val name = trimmed.substringAfterLast('/').substringAfterLast('\\')
    val safe = name.replace(Regex("[^A-Za-z0-9._-]"), "_")
    if (!safe.lowercase(Locale.US).endsWith(".apk")) return null
    return safe
  }

  private fun sanitizeVersion(value: String?): String =
    value?.replace(Regex("[^A-Za-z0-9._-]"), "_")?.takeIf { it.isNotBlank() } ?: "update"

  private fun compareVersions(left: String?, right: String?): Int {
    val leftParts = normalizeVersionParts(left)
    val rightParts = normalizeVersionParts(right)
    val length = maxOf(leftParts.size, rightParts.size)
    for (index in 0 until length) {
      val leftPart = leftParts.getOrNull(index) ?: 0
      val rightPart = rightParts.getOrNull(index) ?: 0
      if (leftPart != rightPart) return leftPart.compareTo(rightPart)
    }
    return 0
  }

  private fun normalizeVersionParts(value: String?): List<Int> =
    value.orEmpty()
      .trim()
      .removePrefix("v")
      .removePrefix("V")
      .split(".")
      .map { part -> part.toIntOrNull() ?: 0 }

  private data class ApkInfo(
    val packageName: String,
    val versionName: String,
    val versionCode: Long
  )
}
