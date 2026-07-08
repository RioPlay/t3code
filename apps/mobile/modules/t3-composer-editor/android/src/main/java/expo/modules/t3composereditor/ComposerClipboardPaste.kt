package expo.modules.t3composereditor

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.graphics.drawable.BitmapDrawable
import android.net.Uri

internal object ComposerClipboardPaste {
  fun hasPasteableImages(context: Context): Boolean {
    val clip = primaryClip(context) ?: return false
    for (index in 0 until clip.itemCount) {
      if (isImageClipItem(context, clip.getItemAt(index))) {
        return true
      }
    }
    return false
  }

  fun readImageUris(context: Context): List<String> {
    val clip = primaryClip(context) ?: return emptyList()
    val uris = mutableListOf<String>()
    for (index in 0 until clip.itemCount) {
      val item = clip.getItemAt(index)
      val bitmap =
        when {
          item.uri != null -> {
            val mime = context.contentResolver.getType(item.uri) ?: ""
            if (!mime.startsWith("image/")) {
              null
            } else {
              ComposerPasteStorage.readBitmapFromUri(context, item.uri)
            }
          }
          else -> {
            val drawable = item.coerceToDrawable(context.resources)
            if (drawable is BitmapDrawable) drawable.bitmap else null
          }
        }
      if (bitmap != null) {
        ComposerPasteStorage.writeTemporaryPng(context, bitmap)?.let { uris.add(it) }
      }
    }
    return uris
  }

  private fun primaryClip(context: Context): ClipData? {
    val clipboard =
      context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager ?: return null
    if (!clipboard.hasPrimaryClip()) {
      return null
    }
    return clipboard.primaryClip
  }

  private fun isImageClipItem(context: Context, item: ClipData.Item): Boolean {
    val uri = item.uri
    if (uri != null) {
      val mime = context.contentResolver.getType(uri) ?: return false
      return mime.startsWith("image/")
    }
    return item.coerceToDrawable(context.resources) is BitmapDrawable
  }
}