package com.ltongg.MinimalistWeaponEnhancementCalendar

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import java.util.concurrent.Executors

class UsageAccessRefreshReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_MY_PACKAGE_REPLACED -> {
        if (UsageAccessScheduler.isEnabled(context)) {
          UsageAccessScheduler.scheduleDailyRefresh(context)
        }
      }
      else -> {
        if (UsageAccessScheduler.isEnabled(context)) {
          val minute = intent.getIntExtra("minute", -1)
          val pendingResult = goAsync()
          executor.execute {
            try {
              UsageAccessScheduler.refreshUsageStats(context, "daily_23_${minute}")
              UsageAccessScheduler.scheduleDailyRefresh(context)
            } finally {
              pendingResult.finish()
            }
          }
        }
      }
    }
  }

  companion object {
    private val executor = Executors.newSingleThreadExecutor()
  }
}
