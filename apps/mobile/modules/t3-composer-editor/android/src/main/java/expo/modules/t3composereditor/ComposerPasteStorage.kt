package expo.modules.t3composereditor

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

internal object ComposerPasteStorage {
  private const val DIRECTORY_NAME = "t3-composer-paste"
  private const val STALE_AGE_MS = 60L * 60L * 1000L

  fun writeTemporaryPng(context: Context, bitmap: Bitmap): String? {
    val directory = File(context.cacheDir, DIRECTORY_NAME)
    if (!directory.exists() && !directory.mkdirs()) {
      return null
    }
    removeStaleFiles(directory)
    val file = File(directory, "${UUID.randomUUID()}.png")
    return try {
      FileOutputStream(file).use { output ->
        if (!bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)) {
          return null
        }
      }
      fileUri(file)
    } catch (_: Exception) {
      null
    }
  }

  fun readBitmapFromUri(context: Context, uri: Uri): Bitmap? {
    return try {
      context.contentResolver.openInputStream(uri)?.use { stream ->
        BitmapFactory.decodeStream(stream)
      }
    } catch (_: Exception) {
      null
    }
  }

  private fun fileUri(file: File): String = "file://${file.absolutePath}"

  private fun removeStaleFiles(directory: File) {
    val cutoff = System.currentTimeMillis() - STALE_AGE_MS
    directory.listFiles()?.forEach { file ->
      if (file.isFile && file.lastModified() < cutoff) {
        file.delete()
      }
    }
  }
}