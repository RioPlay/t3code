package com.t3tools.t3code.network

import android.content.Context
import com.facebook.react.modules.network.OkHttpClientProvider
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Installs an OkHttp [javax.net.SocketFactory] that binds sockets to the Android
 * [android.net.Network] with a non-default route to the destination.
 *
 * Why: on modern Android (especially when the phone is a SoftAP/hotspot and
 * cellular remains the default INTERNET network), React Native's OkHttp client
 * opens sockets on the default network. Private LAN/hotspot clients are then
 * unreachable even though the kernel has a valid route on the tether interface.
 *
 * Binding is per-socket (not process-wide), so concurrent traffic to the public
 * internet on cellular continues to work.
 */
object MultiNetworkRouting {
  private val installed = AtomicBoolean(false)

  @JvmStatic
  fun install(context: Context) {
    if (!installed.compareAndSet(false, true)) {
      return
    }

    val appContext = context.applicationContext
    OkHttpClientProvider.setOkHttpClientFactory {
      OkHttpClientProvider.createClientBuilder(appContext)
        .socketFactory(MultiNetworkSocketFactory(appContext))
        .build()
    }
  }
}
