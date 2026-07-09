package expo.modules.t3composereditor

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context

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
      val uri = item.uri ?: continue
      val mime = context.contentResolver.getType(uri) ?: ""
      if (!mime.startsWith("image/")) {
        continue
      }
      val bitmap = ComposerPasteStorage.readBitmapFromUri(context, uri) ?: continue
      ComposerPasteStorage.writeTemporaryPng(context, bitmap)?.let { uris.add(it) }
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
    val uri = item.uri ?: return false
    val mime = context.contentResolver.getType(uri) ?: return false
    return mime.startsWith("image/")
  }
}