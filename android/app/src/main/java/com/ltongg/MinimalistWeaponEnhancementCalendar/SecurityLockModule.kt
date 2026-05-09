package com.ltongg.MinimalistWeaponEnhancementCalendar

import android.content.ComponentName
import android.content.pm.PackageManager
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

class SecurityLockModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  private val secureRandom = SecureRandom()

  override fun getName(): String = "SecurityLockModule"

  @ReactMethod
  fun setLauncherMode(mode: String, promise: Promise) {
    try {
      val memoMode = mode == "memo"
      if (memoMode) {
        setComponentEnabled(memoAlias(), true)
        setComponentEnabled(originalAlias(), false)
      } else {
        setComponentEnabled(originalAlias(), true)
        setComponentEnabled(memoAlias(), false)
      }
      promise.resolve(if (memoMode) "memo" else "normal")
    } catch (error: Exception) {
      promise.reject("SET_LAUNCHER_MODE_FAILED", error)
    }
  }

  @ReactMethod
  fun getLauncherMode(promise: Promise) {
    try {
      val packageManager = reactContext.packageManager
      val memoState = packageManager.getComponentEnabledSetting(memoAlias())
      promise.resolve(if (memoState == PackageManager.COMPONENT_ENABLED_STATE_ENABLED) "memo" else "normal")
    } catch (error: Exception) {
      promise.reject("GET_LAUNCHER_MODE_FAILED", error)
    }
  }

  @ReactMethod
  fun createPasswordCredential(password: String, promise: Promise) {
    try {
      val salt = ByteArray(SALT_BYTES)
      secureRandom.nextBytes(salt)
      val hash = derivePasswordHash(password, salt, DEFAULT_PASSWORD_ITERATIONS)
      val payload = Arguments.createMap()
      payload.putString("passwordSalt", encodeBase64(salt))
      payload.putString("passwordHash", encodeBase64(hash))
      payload.putString("passwordAlgorithm", PASSWORD_ALGORITHM)
      payload.putInt("passwordIterations", DEFAULT_PASSWORD_ITERATIONS)
      promise.resolve(payload)
    } catch (error: Exception) {
      promise.reject("CREATE_PASSWORD_CREDENTIAL_FAILED", error)
    }
  }

  @ReactMethod
  fun verifyPasswordCredential(
    password: String,
    saltBase64: String,
    expectedHash: String,
    algorithm: String,
    iterations: Int,
    promise: Promise
  ) {
    try {
      val actualHash = when (algorithm) {
        PASSWORD_ALGORITHM -> encodeBase64(
          derivePasswordHash(password, decodeBase64(saltBase64), iterations.coerceAtLeast(1))
        )
        LEGACY_PASSWORD_ALGORITHM -> legacyPasswordHash(password, saltBase64)
        else -> ""
      }
      promise.resolve(MessageDigest.isEqual(actualHash.toByteArray(Charsets.UTF_8), expectedHash.toByteArray(Charsets.UTF_8)))
    } catch (_: Exception) {
      promise.resolve(false)
    }
  }

  private fun setComponentEnabled(componentName: ComponentName, enabled: Boolean) {
    reactContext.packageManager.setComponentEnabledSetting(
      componentName,
      if (enabled) PackageManager.COMPONENT_ENABLED_STATE_ENABLED else PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
      PackageManager.DONT_KILL_APP
    )
  }

  private fun originalAlias(): ComponentName =
    ComponentName(reactContext.packageName, "${reactContext.packageName}.OriginalLauncherActivity")

  private fun memoAlias(): ComponentName =
    ComponentName(reactContext.packageName, "${reactContext.packageName}.MemoLauncherActivity")

  private fun derivePasswordHash(password: String, salt: ByteArray, iterations: Int): ByteArray {
    val spec = PBEKeySpec(password.toCharArray(), salt, iterations, HASH_BITS)
    return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded
  }

  private fun legacyPasswordHash(password: String, salt: String): String {
    val bytes = MessageDigest.getInstance("SHA-256")
      .digest("$salt:$password".toByteArray(Charsets.UTF_8))
    return bytes.joinToString("") { "%02x".format(it.toInt() and 0xff) }
  }

  private fun encodeBase64(bytes: ByteArray): String =
    Base64.encodeToString(bytes, Base64.NO_WRAP)

  private fun decodeBase64(value: String): ByteArray =
    Base64.decode(value, Base64.NO_WRAP)

  companion object {
    private const val PASSWORD_ALGORITHM = "pbkdf2_sha256"
    private const val LEGACY_PASSWORD_ALGORITHM = "legacy_sha256"
    private const val DEFAULT_PASSWORD_ITERATIONS = 120000
    private const val SALT_BYTES = 16
    private const val HASH_BITS = 256
  }
}
