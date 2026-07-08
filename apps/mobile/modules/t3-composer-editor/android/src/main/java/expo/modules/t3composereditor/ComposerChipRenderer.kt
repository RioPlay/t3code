package expo.modules.t3composereditor

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.graphics.drawable.BitmapDrawable
import kotlin.math.ceil

internal object ComposerChipRenderer {
  fun renderChipDrawable(
    context: Context,
    label: String,
    theme: ComposerThemePayload,
    isSkill: Boolean,
    fontSize: Float,
  ): BitmapDrawable {
    val backgroundColor = parseColor(if (isSkill) theme.skillBackground else theme.chipBackground)
    val borderColor = parseColor(if (isSkill) theme.skillBorder else theme.chipBorder)
    val textColor = parseColor(if (isSkill) theme.skillText else theme.chipText)

    val textPaint =
      Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = textColor
        textSize = maxOf(12f, fontSize - 2f)
        typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
      }
    val textWidth = textPaint.measureText(label)
    val height = 24f
    val width = ceil(18f + textWidth + 18f)
    val bitmap = Bitmap.createBitmap(width.toInt(), height.toInt(), Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val rect = RectF(0.5f, 0.5f, width - 0.5f, height - 0.5f)
    val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = backgroundColor }
    val strokePaint =
      Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = borderColor
        style = Paint.Style.STROKE
        strokeWidth = 1f
      }
    canvas.drawRoundRect(rect, 7f, 7f, fillPaint)
    canvas.drawRoundRect(rect, 7f, 7f, strokePaint)
    canvas.drawText(label, 9f, 17f, textPaint)
    return BitmapDrawable(context.resources, bitmap)
  }

  private fun parseColor(value: String): Int {
    return runCatching { android.graphics.Color.parseColor(value) }
      .getOrDefault(android.graphics.Color.BLACK)
  }
}