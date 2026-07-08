package expo.modules.t3composereditor

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.text.Editable
import android.text.TextWatcher
import android.view.Gravity
import android.view.ViewGroup
import android.view.inputmethod.InputMethodManager
import androidx.appcompat.widget.AppCompatEditText
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import expo.modules.kotlin.viewevent.EventDispatcher
import org.json.JSONObject
import kotlin.math.max
import kotlin.math.min

class T3ComposerEditorView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val editText = AppCompatEditText(context)
  private val onComposerChange by EventDispatcher()
  private val onComposerSelectionChange by EventDispatcher()
  private val onComposerFocus by EventDispatcher()
  private val onComposerBlur by EventDispatcher()
  private val onComposerSubmit by EventDispatcher()
  private val onComposerPasteImages by EventDispatcher()
  private val onComposerContentSizeChange by EventDispatcher()

  private var eventCount = 0
  private var applyingControlledDocument = false
  private var lastControlledEventCount = -1
  private var placeholderText = ""
  private var contentInsetVerticalPx = 0f

  init {
    editText.layoutParams = LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.MATCH_PARENT,
    )
    editText.gravity = Gravity.TOP or Gravity.START
    editText.setBackgroundColor(Color.TRANSPARENT)
    editText.setPadding(0, 0, 0, 0)
    editText.isSingleLine = false
    editText.addTextChangedListener(
      object : TextWatcher {
        override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit

        override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit

        override fun afterTextChanged(s: Editable?) {
          if (applyingControlledDocument) return
          emitComposerChange()
        }
      },
    )
    editText.setOnFocusChangeListener { _, hasFocus ->
      if (hasFocus) {
        onComposerFocus(mapOf())
      } else {
        onComposerBlur(mapOf())
      }
    }
    addView(editText)
  }

  fun setControlledDocumentJson(documentJson: String) {
    val payload = runCatching { JSONObject(documentJson) }.getOrNull() ?: return
    val value = payload.optString("value", "")
    val controlledEventCount = payload.optInt("mostRecentEventCount", 0)
    if (controlledEventCount == lastControlledEventCount && editText.text?.toString() == value) {
      return
    }
    lastControlledEventCount = controlledEventCount
    applyingControlledDocument = true
    try {
      if (editText.text?.toString() != value) {
        editText.setText(value)
      }
      val selection = payload.optJSONObject("selection")
      if (selection != null && !payload.optBoolean("isNativeEcho", false)) {
        val start = selection.optInt("start", value.length)
        val end = selection.optInt("end", start)
        val safeStart = min(max(0, start), value.length)
        val safeEnd = min(max(safeStart, end), value.length)
        editText.setSelection(safeStart, safeEnd)
      } else {
        val cursor = min(max(0, value.length), editText.selectionStart)
        editText.setSelection(cursor, cursor)
      }
    } finally {
      applyingControlledDocument = false
    }
  }

  fun setThemeJson(themeJson: String) {
    val theme = runCatching { JSONObject(themeJson) }.getOrNull() ?: return
    val textColor = parseColor(theme.optString("text", "#000000"))
    val placeholderColor = parseColor(theme.optString("placeholder", "#888888"))
    editText.setTextColor(textColor)
    editText.setHintTextColor(placeholderColor)
  }

  fun setPlaceholder(placeholder: String) {
    placeholderText = placeholder
    editText.hint = placeholder
  }

  fun setFontFamily(fontFamily: String) {
    if (fontFamily.isBlank()) return
    editText.typeface = Typeface.create(fontFamily, Typeface.NORMAL)
  }

  fun setFontSize(fontSize: Float) {
    editText.textSize = fontSize
  }

  fun setLineHeight(lineHeight: Float) {
    val fontSize = editText.textSize
    if (fontSize <= 0f) return
    editText.setLineSpacing(lineHeight - fontSize, 1f)
  }

  fun setContentInsetVertical(contentInsetVertical: Float) {
    contentInsetVerticalPx = contentInsetVertical
    val inset = contentInsetVertical.toInt()
    editText.setPadding(editText.paddingLeft, inset, editText.paddingRight, inset)
  }

  fun setEditable(editable: Boolean) {
    editText.isEnabled = editable
    editText.isFocusable = editable
    editText.isFocusableInTouchMode = editable
  }

  fun setScrollEnabled(scrollEnabled: Boolean) {
    editText.isVerticalScrollBarEnabled = scrollEnabled
    editText.movementMethod =
      if (scrollEnabled) {
        android.text.method.ScrollingMovementMethod.getInstance()
      } else {
        null
      }
  }

  fun setAutoFocus(autoFocus: Boolean) {
    if (autoFocus) {
      editText.post { focusEditor() }
    }
  }

  fun setAutoCorrect(autoCorrect: Boolean) {
    editText.inputType =
      if (autoCorrect) {
        android.text.InputType.TYPE_CLASS_TEXT or
          android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE or
          android.text.InputType.TYPE_TEXT_FLAG_CAP_SENTENCES
      } else {
        android.text.InputType.TYPE_CLASS_TEXT or
          android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE or
          android.text.InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
      }
  }

  fun setSpellCheck(spellCheck: Boolean) {
    if (!spellCheck) {
      editText.inputType =
        editText.inputType or android.text.InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
    }
  }

  fun focusEditor() {
    editText.requestFocus()
    val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
    imm?.showSoftInput(editText, InputMethodManager.SHOW_IMPLICIT)
  }

  fun blurEditor() {
    editText.clearFocus()
    val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
    imm?.hideSoftInputFromWindow(editText.windowToken, 0)
  }

  fun setSelection(start: Int, end: Int) {
    val length = editText.text?.length ?: 0
    val safeStart = min(max(0, start), length)
    val safeEnd = min(max(safeStart, end), length)
    editText.setSelection(safeStart, safeEnd)
  }

  private fun emitComposerChange() {
    eventCount += 1
    val value = editText.text?.toString() ?: ""
    val selection = mapOf(
      "start" to editText.selectionStart,
      "end" to editText.selectionEnd,
    )
    val payload = mapOf(
      "value" to value,
      "selection" to selection,
      "eventCount" to eventCount,
    )
    onComposerChange(payload)
    onComposerSelectionChange(payload)
    onComposerContentSizeChange(
      mapOf(
        "width" to width,
        "height" to height,
      ),
    )
  }

  private fun parseColor(value: String): Int {
    return runCatching { Color.parseColor(value) }.getOrDefault(Color.BLACK)
  }
}