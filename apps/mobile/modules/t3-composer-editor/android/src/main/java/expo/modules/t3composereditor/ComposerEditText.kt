package expo.modules.t3composereditor

import android.content.Context
import android.text.Editable
import android.text.Spanned
import android.view.KeyEvent
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import android.view.inputmethod.InputConnectionWrapper
import androidx.appcompat.widget.AppCompatEditText
import androidx.core.view.ContentInfoCompat
import androidx.core.view.ViewCompat
import androidx.core.view.inputmethod.EditorInfoCompat
import androidx.core.view.inputmethod.InputConnectionCompat

internal class ComposerEditText(
  context: Context,
) : AppCompatEditText(context) {
  var onSelectionChanged: ((start: Int, end: Int) -> Unit)? = null
  var onPasteImages: ((uris: List<String>) -> Unit)? = null

  init {
    installReceiveContentListener()
  }

  override fun onSelectionChanged(selStart: Int, selEnd: Int) {
    super.onSelectionChanged(selStart, selEnd)
    onSelectionChanged?.invoke(selStart, selEnd)
  }

  override fun onTextContextMenuItem(id: Int): Boolean {
    if (id == android.R.id.paste && tryPasteImagesFromClipboard()) {
      return true
    }
    return super.onTextContextMenuItem(id)
  }

  override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
    if (keyCode == KeyEvent.KEYCODE_DEL && deleteChipBeforeCursor()) {
      return true
    }
    return super.onKeyDown(keyCode, event)
  }

  override fun onCreateInputConnection(outAttrs: EditorInfo): InputConnection? {
    val connection = super.onCreateInputConnection(outAttrs) ?: return null
    EditorInfoCompat.setContentMimeTypes(outAttrs, arrayOf("image/*", "image/png", "image/jpeg"))
    val wrapped =
      InputConnectionCompat.createWrapper(
        ComposerChipInputConnection(connection, this),
        outAttrs,
      ) { _, inputContentInfo, _, _ ->
        val uri = inputContentInfo.contentUri
        val bitmap = ComposerPasteStorage.readBitmapFromUri(context, uri) ?: return@createWrapper false
        val fileUri = ComposerPasteStorage.writeTemporaryPng(context, bitmap) ?: return@createWrapper false
        onPasteImages?.invoke(listOf(fileUri))
        true
      }
    return wrapped
  }

  fun deleteChipBeforeCursor(): Boolean {
    if (selectionStart != selectionEnd || selectionStart <= 0) {
      return false
    }
    val editable = text ?: return false
    if (editable !is Spanned) {
      return false
    }
    val previousOffset = selectionStart - 1
    val spans = editable.getSpans(previousOffset, selectionStart, ComposerChipSpan::class.java)
    if (spans.isEmpty()) {
      return false
    }
    val span = spans[0]
    val start = editable.getSpanStart(span)
    val end = editable.getSpanEnd(span)
    editable.delete(start, end)
    return true
  }

  private fun tryPasteImagesFromClipboard(): Boolean {
    if (!ComposerClipboardPaste.hasPasteableImages(context)) {
      return false
    }
    val uris = ComposerClipboardPaste.readImageUris(context)
    if (uris.isEmpty()) {
      return false
    }
    onPasteImages?.invoke(uris)
    return true
  }

  private fun installReceiveContentListener() {
    ViewCompat.setOnReceiveContentListener(
      this,
      arrayOf("image/*", "image/png", "image/jpeg", "image/webp"),
    ) { _, payload ->
      val uris = readImageUrisFromContent(payload)
      if (uris.isEmpty()) {
        return@setOnReceiveContentListener payload
      }
      onPasteImages?.invoke(uris)
      null
    }
  }

  private fun readImageUrisFromContent(payload: ContentInfoCompat): List<String> {
    val clip = payload.clip
    val uris = mutableListOf<String>()
    for (index in 0 until clip.itemCount) {
      val item = clip.getItemAt(index)
      val uri = item.uri ?: continue
      val mime = context.contentResolver.getType(uri) ?: payload.clipDescription.getMimeType(index)
      if (!mime.startsWith("image/")) {
        continue
      }
      val bitmap = ComposerPasteStorage.readBitmapFromUri(context, uri) ?: continue
      ComposerPasteStorage.writeTemporaryPng(context, bitmap)?.let { uris.add(it) }
    }
    return uris
  }

  private class ComposerChipInputConnection(
    target: InputConnection,
    private val editText: ComposerEditText,
  ) : InputConnectionWrapper(target, true) {
    override fun deleteSurroundingText(beforeLength: Int, afterLength: Int): Boolean {
      if (beforeLength == 1 && afterLength == 0 && editText.deleteChipBeforeCursor()) {
        return true
      }
      return super.deleteSurroundingText(beforeLength, afterLength)
    }
  }
}