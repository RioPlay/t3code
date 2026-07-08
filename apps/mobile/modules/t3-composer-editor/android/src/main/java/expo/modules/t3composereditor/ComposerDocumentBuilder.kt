package expo.modules.t3composereditor

import android.content.Context
import android.text.SpannableStringBuilder
import android.text.Spanned

internal object ComposerDocumentBuilder {
  const val CHIP_REPLACEMENT_CHAR = "\uFFFC"

  fun buildSpannable(
    context: Context,
    value: String,
    tokens: List<ComposerTokenPayload>,
    theme: ComposerThemePayload,
    fontSize: Float,
  ): SpannableStringBuilder {
    val builder = SpannableStringBuilder()
    var cursor = 0
    for (token in validTokens(value, tokens)) {
      if (token.start < cursor) {
        continue
      }
      if (token.start > cursor) {
        builder.append(value.substring(cursor, token.start))
      }
      val start = builder.length
      builder.append(CHIP_REPLACEMENT_CHAR)
      val drawable =
        ComposerChipRenderer.renderChipDrawable(
          context = context,
          label = token.label,
          theme = theme,
          isSkill = token.type == "skill",
          fontSize = fontSize,
        )
      builder.setSpan(
        ComposerChipSpan(token.source, drawable),
        start,
        start + 1,
        Spanned.SPAN_EXCLUSIVE_EXCLUSIVE,
      )
      cursor = token.end
    }
    if (cursor < value.length) {
      builder.append(value.substring(cursor))
    }
    return builder
  }

  fun serializedText(text: CharSequence): String {
    if (text.isEmpty()) {
      return ""
    }
    if (text !is Spanned) {
      return text.toString()
    }
    val builder = StringBuilder()
    var cursor = 0
    val spans = text.getSpans(0, text.length, ComposerChipSpan::class.java)
      .sortedBy { text.getSpanStart(it) }
    for (span in spans) {
      val spanStart = text.getSpanStart(span)
      val spanEnd = text.getSpanEnd(span)
      if (spanStart > cursor) {
        builder.append(text.subSequence(cursor, spanStart))
      }
      builder.append(span.source)
      cursor = spanEnd
    }
    if (cursor < text.length) {
      builder.append(text.subSequence(cursor, text.length))
    }
    return builder.toString()
  }

  fun sourceOffset(text: CharSequence, displayOffset: Int): Int {
    if (displayOffset <= 0) {
      return 0
    }
    if (text !is Spanned) {
      return minOf(displayOffset, text.length)
    }
    var sourceOffset = 0
    var displayCursor = 0
    val spans = text.getSpans(0, text.length, ComposerChipSpan::class.java)
      .sortedBy { text.getSpanStart(it) }
    var spanIndex = 0
    while (displayCursor < displayOffset && displayCursor < text.length) {
      val nextSpanStart =
        if (spanIndex < spans.size) text.getSpanStart(spans[spanIndex]) else text.length
      if (displayCursor < nextSpanStart) {
        val chunk = minOf(nextSpanStart, displayOffset) - displayCursor
        sourceOffset += chunk
        displayCursor += chunk
        continue
      }
      val span = spans[spanIndex]
      sourceOffset += span.source.length
      displayCursor += text.getSpanEnd(span) - text.getSpanStart(span)
      spanIndex += 1
    }
    return sourceOffset
  }

  fun displayOffset(value: String, tokens: List<ComposerTokenPayload>, sourceOffset: Int): Int {
    val boundedOffset = sourceOffset.coerceIn(0, value.length)
    var collapsedLength = 0
    for (token in validTokens(value, tokens)) {
      if (token.end <= boundedOffset) {
        collapsedLength += maxOf(0, token.end - token.start - 1)
      }
    }
    val insideToken =
      validTokens(value, tokens).firstOrNull { token ->
        token.start < boundedOffset && boundedOffset < token.end
      }
    if (insideToken != null) {
      return insideToken.start - collapsedLength + 1
    }
    return boundedOffset - collapsedLength
  }
}