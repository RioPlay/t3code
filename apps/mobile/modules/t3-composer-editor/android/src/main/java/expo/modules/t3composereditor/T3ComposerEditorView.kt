package expo.modules.t3composereditor

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.text.Editable
import android.text.SpannableStringBuilder
import android.text.TextWatcher
import android.util.TypedValue
import android.view.Gravity
import android.view.ViewGroup
import android.view.inputmethod.InputMethodManager

import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import expo.modules.kotlin.viewevent.EventDispatcher
import org.json.JSONObject
import kotlin.math.max
import kotlin.math.min

class T3ComposerEditorView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val editText = ComposerEditText(context)
  private val onComposerChange by EventDispatcher()
  private val onComposerSelectionChange by EventDispatcher()
  private val onComposerFocus by EventDispatcher()
  private val onComposerBlur by EventDispatcher()
  private val onComposerSubmit by EventDispatcher()
  private val onComposerPasteImages by EventDispatcher()
  private val onComposerContentSizeChange by EventDispatcher()

  private var eventCount = 0
  private var nativeEventCount = 0
  private var applyingControlledDocument = false
  private var value = ""
  private var tokensJson = "[]"
  private var tokens: List<ComposerTokenPayload> = emptyList()
  private var tokensNeedRebuild = false
  private var requestedSelection: ComposerSelectionPayload? = null
  private var theme = ComposerThemePayload.fromJson(JSONObject())
  private var fontSize = 14f
  private var fontSizePx = dipToPx(14f)
  private var lineHeightPx = 0f
  private var fontFamily = "DMSans_400Regular"

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
          emitTextChange()
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
    editText.onSelectionChanged = { _, _ ->
      if (!applyingControlledDocument) {
        emitSelection()
      }
    }
    editText.onPasteImages = { uris ->
      if (uris.isNotEmpty()) {
        onComposerPasteImages(mapOf("uris" to uris))
      }
    }
    addView(editText)
  }

  fun setControlledDocumentJson(documentJson: String) {
    val payload = runCatching { JSONObject(documentJson) }.getOrNull() ?: return
    val controlledEventCount = payload.optInt("mostRecentEventCount", 0)
    if (controlledEventCount < nativeEventCount) {
      return
    }
    if (payload.optBoolean("isNativeEcho", false)) {
      val nextValue = payload.optString("value", "")
      if (serializedText() != nextValue) {
        return
      }
    }
    val nextValue = payload.optString("value", "")
    val nextTokensJson = payload.optString("tokensJson", "[]")
    if (tokensJson != nextTokensJson) {
      tokensJson = nextTokensJson
      tokens = parseComposerTokens(nextTokensJson)
      tokensNeedRebuild = true
    }
    value = nextValue
    requestedSelection =
      payload.optJSONObject("selection")?.let { selection ->
        ComposerSelectionPayload(
          start = selection.optInt("start", nextValue.length),
          end = selection.optInt("end", selection.optInt("start", nextValue.length)),
        )
      }
    applyControlledDocument(force = tokensNeedRebuild)
    applyRequestedSelection()
    if (tokensMatchCurrentValue()) {
      tokensNeedRebuild = false
    }
  }

  fun setThemeJson(themeJson: String) {
    val nextTheme = runCatching { JSONObject(themeJson) }.getOrNull() ?: return
    theme = ComposerThemePayload.fromJson(nextTheme)
    applyTheme()
    applyControlledDocument(force = true)
  }

  fun setPlaceholder(placeholder: String) {
    editText.hint = placeholder
    updatePlaceholderVisibility()
  }

  fun setFontFamily(fontFamily: String) {
    if (fontFamily.isBlank()) return
    this.fontFamily = fontFamily
    editText.typeface = Typeface.create(fontFamily, Typeface.NORMAL)
    applyControlledDocument(force = true)
  }

  fun setFontSize(fontSize: Float) {
    this.fontSize = fontSize
    fontSizePx = dipToPx(fontSize)
    editText.setTextSize(TypedValue.COMPLEX_UNIT_PX, fontSizePx)
    applyLineHeight()
    applyControlledDocument(force = true)
  }

  fun setLineHeight(lineHeight: Float) {
    lineHeightPx = dipToPx(lineHeight)
    applyLineHeight()
  }

  fun setContentInsetVertical(contentInsetVertical: Float) {
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
    requestedSelection = ComposerSelectionPayload(start, end)
    applyRequestedSelection()
  }

  private fun applyControlledDocument(force: Boolean = false) {
    val currentSource = serializedText()
    if (!force && currentSource == value && documentMatchesExpectedTokens()) {
      updatePlaceholderVisibility()
      return
    }
    val previousSelection = sourceSelection()
    applyingControlledDocument = true
    try {
      val spannable =
        ComposerDocumentBuilder.buildSpannable(
          context = context,
          value = value,
          tokens = tokens,
          theme = theme,
          fontSize = fontSize,
        )
      editText.setText(spannable)
      val targetSelection = requestedSelection ?: previousSelection
      requestedSelection = null
      val displayRangeStart =
        ComposerDocumentBuilder.displayOffset(value, tokens, targetSelection.start)
      val displayRangeEnd =
        ComposerDocumentBuilder.displayOffset(value, tokens, targetSelection.end)
      val length = editText.text?.length ?: 0
      val safeStart = min(max(0, displayRangeStart), length)
      val safeEnd = min(max(safeStart, displayRangeEnd), length)
      editText.setSelection(safeStart, safeEnd)
    } finally {
      applyingControlledDocument = false
    }
    updatePlaceholderVisibility()
    emitContentSizeIfNeeded()
  }

  private fun applyRequestedSelection() {
    val selection = requestedSelection ?: return
    val displayStart = ComposerDocumentBuilder.displayOffset(value, tokens, selection.start)
    val displayEnd = ComposerDocumentBuilder.displayOffset(value, tokens, selection.end)
    val length = editText.text?.length ?: 0
    val safeStart = min(max(0, displayStart), length)
    val safeEnd = min(max(safeStart, displayEnd), length)
    applyingControlledDocument = true
    try {
      editText.setSelection(safeStart, safeEnd)
    } finally {
      applyingControlledDocument = false
      requestedSelection = null
    }
  }

  private fun applyTheme() {
    editText.setTextColor(parseColor(theme.text))
    editText.setHintTextColor(parseColor(theme.placeholder))
  }

  private fun emitTextChange() {
    if (applyingControlledDocument) return
    value = serializedText()
    val selection = sourceSelection()
    nativeEventCount += 1
    eventCount = nativeEventCount
    val payload =
      mapOf(
        "value" to value,
        "selection" to mapOf("start" to selection.start, "end" to selection.end),
        "eventCount" to nativeEventCount,
      )
    onComposerChange(payload)
    updatePlaceholderVisibility()
    emitContentSizeIfNeeded()
  }

  private fun emitSelection() {
    val currentValue = serializedText()
    val selection = sourceSelection()
    onComposerSelectionChange(
      mapOf(
        "value" to currentValue,
        "selection" to mapOf("start" to selection.start, "end" to selection.end),
        "eventCount" to nativeEventCount,
      ),
    )
  }

  private fun serializedText(): String {
    return ComposerDocumentBuilder.serializedText(editText.text ?: "")
  }

  private fun sourceSelection(): ComposerSelectionPayload {
    val text = editText.text ?: ""
    return ComposerSelectionPayload(
      start = ComposerDocumentBuilder.sourceOffset(text, editText.selectionStart),
      end = ComposerDocumentBuilder.sourceOffset(text, editText.selectionEnd),
    )
  }

  private fun tokensMatchCurrentValue(): Boolean =
    validTokens(value, tokens).size == tokens.size

  private fun documentMatchesExpectedTokens(): Boolean {
    val text = editText.text ?: return tokens.isEmpty()
    val renderedSources =
      text.getSpans(0, text.length, ComposerChipSpan::class.java)
        .sortedBy { text.getSpanStart(it) }
        .map { it.chipSource }
    val expectedSources =
      validTokens(value, tokens).map { it.source }
    return renderedSources == expectedSources
  }

  private fun updatePlaceholderVisibility() {
    editText.alpha = if (value.isEmpty()) 1f else 1f
  }

  private fun emitContentSizeIfNeeded() {
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

  private fun applyLineHeight() {
    if (fontSizePx <= 0f || lineHeightPx <= 0f) {
      return
    }
    editText.setLineSpacing(lineHeightPx - fontSizePx, 1f)
  }

  private fun dipToPx(value: Float): Float {
    return value * context.resources.displayMetrics.density
  }
}
