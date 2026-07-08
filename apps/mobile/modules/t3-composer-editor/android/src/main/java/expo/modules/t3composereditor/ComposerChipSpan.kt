package expo.modules.t3composereditor

import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.drawable.BitmapDrawable
import android.text.style.ImageSpan

internal class ComposerChipSpan(
  val source: String,
  drawable: BitmapDrawable,
) : ImageSpan(drawable, ALIGN_BOTTOM) {
  override fun draw(
    canvas: Canvas,
    text: CharSequence,
    start: Int,
    end: Int,
    x: Float,
    top: Int,
    y: Int,
    bottom: Int,
    paint: Paint,
  ) {
    val drawable = drawable
    canvas.save()
    val transY = bottom - drawable.bounds.bottom
    canvas.translate(x, transY.toFloat())
    drawable.draw(canvas)
    canvas.restore()
  }
}