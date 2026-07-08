package expo.modules.t3composereditor

import android.content.Context
import androidx.appcompat.widget.AppCompatEditText

internal class ComposerEditText(
  context: Context,
) : AppCompatEditText(context) {
  var onSelectionChanged: ((start: Int, end: Int) -> Unit)? = null

  override fun onSelectionChanged(selStart: Int, selEnd: Int) {
    super.onSelectionChanged(selStart, selEnd)
    onSelectionChanged?.invoke(selStart, selEnd)
  }
}