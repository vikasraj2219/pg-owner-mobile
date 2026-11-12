package com.pgowner.app

import android.content.Intent
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class WhatsAppShareModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "WhatsAppShare"

    @ReactMethod
    fun shareImageWithMessage(
        filePath: String,
        message: String,
        phone: String?,
        promise: Promise
    ) {
        try {
            val cleanPath = filePath.replace("file://", "")
            val file = File(cleanPath)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "File does not exist: $cleanPath")
                return
            }

            val contentUri = FileProvider.getUriForFile(
                reactContext,
                "${reactContext.packageName}.SharingFileProvider",
                file
            )

            // Normalize phone number to country-code format (e.g. 919876543210)
            val digits = phone?.replace(Regex("[^0-9]"), "") ?: ""
            val phoneWithCountry = when {
                digits.length == 10 -> "91$digits"
                digits.startsWith("0") && digits.length == 11 -> "91" + digits.substring(1)
                else -> digits
            }

            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "image/png"
                putExtra(Intent.EXTRA_STREAM, contentUri)
                putExtra(Intent.EXTRA_TEXT, message)
                if (phoneWithCountry.isNotEmpty()) {
                    putExtra("jid", "$phoneWithCountry@s.whatsapp.net")
                    putExtra("phone", phoneWithCountry)
                    putExtra("address", phoneWithCountry)
                }
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            val pm = reactContext.packageManager

            // Check if WhatsApp or WhatsApp Business is installed
            val isWhatsAppInstalled = try {
                pm.getPackageInfo("com.whatsapp", 0)
                true
            } catch (e: Exception) {
                false
            }

            val isW4BInstalled = try {
                pm.getPackageInfo("com.whatsapp.w4b", 0)
                true
            } catch (e: Exception) {
                false
            }

            val targetPackage = when {
                isWhatsAppInstalled -> "com.whatsapp"
                isW4BInstalled -> "com.whatsapp.w4b"
                else -> null
            }

            val activity = currentActivity
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "Current activity is null")
                return
            }

            if (targetPackage != null) {
                intent.setPackage(targetPackage)
                activity.grantUriPermission(
                    targetPackage,
                    contentUri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
                )
                activity.startActivity(intent)
            } else {
                val chooser = Intent.createChooser(intent, "Share Payment Card")
                val resInfoList = pm.queryIntentActivities(chooser, 0)
                for (resolveInfo in resInfoList) {
                    val packageName = resolveInfo.activityInfo.packageName
                    activity.grantUriPermission(
                        packageName,
                        contentUri,
                        Intent.FLAG_GRANT_READ_URI_PERMISSION
                    )
                }
                activity.startActivity(chooser)
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SHARE_ERROR", e.message, e)
        }
    }
}
