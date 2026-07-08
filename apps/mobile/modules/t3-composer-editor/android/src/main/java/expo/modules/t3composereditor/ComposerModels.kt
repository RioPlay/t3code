package expo.modules.t3composereditor

import org.json.JSONArray
import org.json.JSONObject

internal data class ComposerSelectionPayload(
  val start: Int,
  val end: Int,
)

internal data class ComposerTokenPayload(
  val type: String,
  val source: String,
  val label: String,
  val iconUri: String?,
  val start: Int,
  val end: Int,
)

internal data class ComposerThemePayload(
  val text: String,
  val placeholder: String,
  val chipBackground: String,
  val chipBorder: String,
  val chipText: String,
  val skillBackground: String,
  val skillBorder: String,
  val skillText: String,
  val fileTint: String,
) {
  companion object {
    fun fromJson(json: JSONObject): ComposerThemePayload =
      ComposerThemePayload(
        text = json.optString("text", "#262626"),
        placeholder = json.optString("placeholder", "#8e8e93"),
        chipBackground = json.optString("chipBackground", "#f2f2f7"),
        chipBorder = json.optString("chipBorder", "#dedee3"),
        chipText = json.optString("chipText", "#262626"),
        skillBackground = json.optString("skillBackground", "#f9e8fb"),
        skillBorder = json.optString("skillBorder", "#e5a6eb"),
        skillText = json.optString("skillText", "#a21caf"),
        fileTint = json.optString("fileTint", "#737373"),
      )
  }
}

internal fun parseComposerTokens(tokensJson: String): List<ComposerTokenPayload> {
  val array = runCatching { JSONArray(tokensJson) }.getOrNull() ?: return emptyList()
  val tokens = mutableListOf<ComposerTokenPayload>()
  for (index in 0 until array.length()) {
    val item = array.optJSONObject(index) ?: continue
    tokens.add(
      ComposerTokenPayload(
        type = item.optString("type", ""),
        source = item.optString("source", ""),
        label = item.optString("label", ""),
        iconUri = item.optString("iconUri").takeIf { it.isNotBlank() },
        start = item.optInt("start", 0),
        end = item.optInt("end", 0),
      ),
    )
  }
  return tokens
}

internal fun validTokens(value: String, tokens: List<ComposerTokenPayload>): List<ComposerTokenPayload> {
  return tokens.filter { token ->
    token.start >= 0 &&
      token.end > token.start &&
      token.end <= value.length &&
      value.substring(token.start, token.end) == token.source
  }.sortedBy { it.start }
}