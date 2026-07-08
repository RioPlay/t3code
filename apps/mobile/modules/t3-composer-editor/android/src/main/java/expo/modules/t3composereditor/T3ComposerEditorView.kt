package expo.modules.t3composereditor

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.view.Gravity
import android.view.ViewGroup
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import androidx.core.widget.doAfterTextChanged
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import expo.modules.kotlin.viewevent.EventDispatcher
import org.json.JSONObject
import kotlin.math.max
import kotlin.math.min

class T3ComposerEditorView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val editText = EditText(context)
  private val onComposerChange by EventDispatcher()
  private val onComposerSelectionChange by EventDispatcher()
  private val onComposerFocus by EventDispatcher()
  private val onComposerBlur by EventDispatcher()
  private val onComposerSubmit by EventDispatcher()
  private val onComposerPasteImages by EventDispatcher()
  private val onComposerContentSizeChange by EventDispatcher()

  private var value = ""
  private var nativeEventCount = 0
  private var isApplyingControlledValue = false
  private var shouldAutoFocus = false
  private var didAutoFocus = false
  private var requestedSelectionStart: Int? = null
  private var requestedSelectionEnd: Int? = null

  private var textColor = Color.parseColor("#262626")
  private var placeholderColor = Color.parseColor("#8E8E93")
  private var fontFamilyName = "DMSans_400Regular"
  private var fontSizeSp = 14f
  private var lineHeightSp = 20f
  private var contentInsetVerticalPx = 0f
  private var placeholderText = ""

  init {
    editText.layoutParams = LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.MATCH_PARENT,
    )
    editText.background = null
    editText.gravity = Gravity.TOP or Gravity.START
    editText.setPadding(0, 0, 0, 0)
    editText.isSingleLine = false
    editText.setHorizontallyScrolling(false)
    applyTypography()
    applyTheme()

    editText.setOnFocusChangeListener { _, hasFocus ->
      if (hasFocus) {
        onComposerFocus(emptyMap())
      } else {
        onComposerBlur(emptyMap())
      }
    }

    editText.doAfterTextChanged { editable ->
      if (isApplyingControlledValue) return@doAfterTextChanged
      val nextValue = editable?.toString() ?: ""
      if (nextValue == value) return@doAfterTextChanged
      value = nextValue
      emitTextChange()
    }

    addView(editText)
  }

  fun setControlledDocumentJson(documentJson: String) {
    val document = parseControlledDocument(documentJson) ?: return
    if (document.mostRecentEventCount < nativeEventCount) return
    if (document.isNativeEcho && editText.text.toString() != document.value) return

    value = document.value
    requestedSelectionStart = document.selectionStart
    requestedSelectionEnd = document.selectionEnd
    applyControlledDocument()
    applyRequestedSelection()
  }

  fun setThemeJson(themeJson: String) {
    val theme = parseTheme(themeJson) ?: return
    textColor = parseColor(theme.text, textColor)
    placeholderColor = parseColor(theme.placeholder, placeholderColor)
    applyTheme()
  }

  fun setPlaceholder(placeholder: String) {
    placeholderText = placeholder
    editText.hint = placeholder
    editText.setHintTextColor(placeholderColor)
  }

  fun setFontFamily(fontFamily: String) {
    fontFamilyName = fontFamily
    applyTypography()
  }

  fun setFontSize(fontSize: Float) {
    fontSizeSp = fontSize
    applyTypography()
  }

  fun setLineHeight(lineHeight: Float) {
    lineHeightSp = lineHeight
    applyTypography()
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
    editText.movementMethod = if (scrollEnabled) {
      android.text.method.ScrollingMovementMethod.getInstance()
    } else {
      null
    }
  }

  fun setAutoFocus(autoFocus: Boolean) {
    shouldAutoFocus = autoFocus
    if (autoFocus && !didAutoFocus && editText.isAttachedToWindow) {
      requestEditorFocus()
    }
  }

  fun setAutoCorrect(autoCorrect: Boolean) {
    editText.inputType = if (autoCorrect) {
      android.text.InputType.TYPE_CLASS_TEXT or
        android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE or
        android.text.InputType.TYPE_TEXT_FLAG_CAP_SENTENCES
    } else {
      android.text.InputType.TYPE_CLASS_TEXT or
        android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE
    }
  }

  fun setSpellCheck(spellCheck: Boolean) {
    if (spellCheck) {
      editText.inputType = editText.inputType or android.text.InputType.TYPE_TEXT_FLAG_AUTO_CORRECT
    } else {
      editText.inputType = editText.inputType and android.text.InputType.TYPE_TEXT_FLAG_AUTO_CORRECT.inv()
    }
  }

  fun focusEditor() {
    requestEditorFocus()
  }

  fun blurEditor() {
    editText.clearFocus()
    val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
    imm?.hideSoftInputFromWindow(editText.windowToken, 0)
  }

  fun setSelection(start: Int, end: Int) {
    val textLength = editText.text?.length ?: 0
    val clampedStart = min(max(0, start), textLength)
    val clampedEnd = min(max(clampedStart, end), textLength)
    editText.setSelection(clampedStart, clampedEnd)
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    if (shouldAutoFocus && !didAutoFocus) {
      requestEditorFocus()
    }
  }

  private fun requestEditorFocus() {
    didAutoFocus = true
    editText.requestFocus()
    val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
    imm?.showSoftInput(editText, InputMethodManager.SHOW_IMPLICIT)
  }

  private fun applyControlledDocument() {
    val currentValue = editText.text?.toString() ?: ""
    if (currentValue == value) return

    isApplyingControlledValue = true
    editText.setText(value)
    isApplyingControlledValue = false
  }

  private fun applyRequestedSelection() {
    val start = requestedSelectionStart ?: return
    val end = requestedSelectionEnd ?: return
    requestedSelectionStart = null
    requestedSelectionEnd = null
    setSelection(start, end)
  }

  private fun emitTextChange() {
    nativeEventCount += 1
    val selectionStart = editText.selectionStart
    val selectionEnd = editText.selectionEnd
    val payload = mapOf(
      "value" to value,
      "selection" to mapOf(
        "start" to selectionStart,
        "end" to selectionEnd,
      ),
      "eventCount" to nativeEventCount,
    )
    onComposerChange(payload)
    onComposerSelectionChange(payload)
    emitContentSizeIfNeeded()
  }

  private fun emitContentSizeIfNeeded() {
    val width = editText.width
    val height = editText.height
    if (width <= 0 || height <= 0) return
    onComposerContentSizeChange(
      mapOf(
        "width" to width.toDouble(),
        "height" to height.toDouble(),
      ),
    )
  }

  private fun applyTypography() {
    editText.textSize = fontSizeSp
    editText.setLineSpacing(lineHeightSp - fontSizeSp, 1f)
    editText.typeface = resolveTypeface(fontFamilyName)
  }

  private fun applyTheme() {
    editText.setTextColor(textColor)
    editText.setHintTextColor(placeholderColor)
    if (placeholderText.isNotEmpty()) {
      editText.hint = placeholderText
    }
  }

  private fun resolveTypeface(fontFamily: String): Typeface {
    return when (fontFamily) {
      "DMSans_400Regular" -> Typeface.create("sans-serif", Typeface.NORMAL)
      "DMSans_500Medium" -> Typeface.create("sans-serif-medium", Typeface.NORMAL)
      "DMSans_700Bold" -> Typeface.create("sans-serif", Typeface.BOLD)
      else -> Typeface.create(fontFamily, Typeface.NORMAL)
    }
  }

  private data class ControlledDocument(
    val value: String,
    val selectionStart: Int?,
    val selectionEnd: Int?,
    val mostRecentEventCount: Int,
    val isNativeEcho: Boolean,
  )

  private data class ThemePayload(
    val text: String,
    val placeholder: String,
  )

  private fun parseControlledDocument(documentJson: String): ControlledDocument? {
    return try {
      val document = JSONObject(documentJson)
      val selection = document.optJSONObject("selection")
      ControlledDocument(
        value = document.optString("value", ""),
        selectionStart = selection?.optInt("start"),
        selectionEnd = selection?.optInt("end"),
        mostRecentEventCount = document.optInt("mostRecentEventCount", 0),
        isNativeEcho = document.optBoolean("isNativeEcho", false),
      )
    } catch (_: Exception) {
      null
    }
  }

  private fun parseTheme(themeJson: String): ThemePayload? {
    return try {
      val theme = JSONObject(themeJson)
      ThemePayload(
        text = theme.optString("text", "#262626"),
        placeholder = theme.optString("placeholder", "#8E8E93"),
      )
    } catch (_: Exception) {
      null
    }
  }

  private fun parseColor(value: String, fallback: Int): Int {
    return try {
      Color.parseColor(value)
    } catch (_: Exception) {
      fallback
    }
  }
}