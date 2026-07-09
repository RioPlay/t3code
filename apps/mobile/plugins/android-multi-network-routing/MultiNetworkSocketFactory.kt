package com.t3tools.t3code.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.RouteInfo
import android.os.Build
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Socket
import java.net.SocketAddress
import java.net.UnknownHostException
import javax.net.SocketFactory

/**
 * SocketFactory that, before connecting, binds the socket to the [Network]
 * whose non-default routes best match the destination address.
 *
 * OkHttp creates sockets with [createSocket] and then [Socket.connect]; binding
 * must happen in [connect] because the destination is unknown earlier.
 */
internal class MultiNetworkSocketFactory(
  context: Context,
) : SocketFactory() {
  private val appContext = context.applicationContext

  private val connectivityManager: ConnectivityManager?
    get() =
      appContext.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager

  override fun createSocket(): Socket = RoutingSocket()

  override fun createSocket(host: String, port: Int): Socket =
    createSocket().apply { connect(InetSocketAddress(host, port)) }

  override fun createSocket(
    host: String,
    port: Int,
    localHost: InetAddress,
    localPort: Int,
  ): Socket =
    createSocket().apply {
      bind(InetSocketAddress(localHost, localPort))
      connect(InetSocketAddress(host, port))
    }

  override fun createSocket(host: InetAddress, port: Int): Socket =
    createSocket().apply { connect(InetSocketAddress(host, port)) }

  override fun createSocket(
    address: InetAddress,
    port: Int,
    localAddress: InetAddress,
    localPort: Int,
  ): Socket =
    createSocket().apply {
      bind(InetSocketAddress(localAddress, localPort))
      connect(InetSocketAddress(address, port))
    }

  private inner class RoutingSocket : Socket() {
    override fun connect(endpoint: SocketAddress) {
      bindToPreferredNetwork(endpoint)
      super.connect(endpoint)
    }

    override fun connect(endpoint: SocketAddress, timeout: Int) {
      bindToPreferredNetwork(endpoint)
      super.connect(endpoint, timeout)
    }

    private fun bindToPreferredNetwork(endpoint: SocketAddress) {
      if (isConnected || isBound) {
        return
      }
      val address = resolveEndpointAddress(endpoint) ?: return
      if (address.isAnyLocalAddress || address.isLoopbackAddress) {
        return
      }
      val network = selectNetworkForDestination(address) ?: return
      val active = connectivityManager?.activeNetwork
      if (active != null && active == network) {
        // Already the default path — no need to force-bind.
        return
      }
      try {
        network.bindSocket(this)
      } catch (_: Exception) {
        // Fall through to platform default routing if bind fails.
      }
    }
  }

  private fun resolveEndpointAddress(endpoint: SocketAddress): InetAddress? {
    if (endpoint !is InetSocketAddress) {
      return null
    }
    endpoint.address?.let {
      return it
    }
    val host = endpoint.hostString ?: return null
    return try {
      InetAddress.getByName(host)
    } catch (_: UnknownHostException) {
      null
    }
  }

  /**
   * Prefer the network with the most specific non-default route to [destination].
   * Falls back to a LOCAL_NETWORK / non-INTERNET Wi‑Fi network for RFC1918-like
   * destinations when route metadata is incomplete.
   */
  internal fun selectNetworkForDestination(destination: InetAddress): Network? {
    val cm = connectivityManager ?: return null
    // ConnectivityManager.allNetworks is deprecated but remains the only
    // synchronous snapshot API; NetworkCallback would be async and too late
    // for per-socket connect().
    @Suppress("DEPRECATION")
    val networks = cm.allNetworks
    if (networks.isEmpty()) {
      return null
    }

    var bestNetwork: Network? = null
    var bestPrefixLength = -1

    for (network in networks) {
      val linkProperties = cm.getLinkProperties(network) ?: continue
      for (route in linkProperties.routes) {
        if (route.isDefaultRoute) {
          continue
        }
        if (!routeMatches(route, destination)) {
          continue
        }
        val prefixLength = routePrefixLength(route)
        if (prefixLength > bestPrefixLength) {
          bestPrefixLength = prefixLength
          bestNetwork = network
        }
      }
    }

    if (bestNetwork != null) {
      return bestNetwork
    }

    if (!isLikelyLocalDestination(destination)) {
      return null
    }

    // SoftAP / tether interfaces often lack INTERNET and (on API 36+) carry
    // LOCAL_NETWORK. Prefer those when route tables did not yield a match.
    for (network in networks) {
      val caps = cm.getNetworkCapabilities(network) ?: continue
      if (hasLocalNetworkCapability(caps)) {
        return network
      }
      if (
        caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) &&
          !caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
      ) {
        return network
      }
    }

    return null
  }

  private fun routeMatches(route: RouteInfo, destination: InetAddress): Boolean {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      return route.matches(destination)
    }
    val prefix = route.destination ?: return false
    return prefixContains(prefix.address, prefix.prefixLength, destination)
  }

  private fun routePrefixLength(route: RouteInfo): Int {
    return route.destination?.prefixLength ?: -1
  }

  private fun prefixContains(
    networkAddress: InetAddress,
    prefixLength: Int,
    candidate: InetAddress,
  ): Boolean {
    val networkBytes = networkAddress.address
    val candidateBytes = candidate.address
    if (networkBytes.size != candidateBytes.size || prefixLength < 0) {
      return false
    }
    val fullBytes = prefixLength / 8
    val remainingBits = prefixLength % 8
    for (i in 0 until fullBytes) {
      if (networkBytes[i] != candidateBytes[i]) {
        return false
      }
    }
    if (remainingBits == 0) {
      return true
    }
    if (fullBytes >= networkBytes.size) {
      return true
    }
    val mask = (0xFF shl (8 - remainingBits)) and 0xFF
    return (networkBytes[fullBytes].toInt() and mask) == (candidateBytes[fullBytes].toInt() and mask)
  }

  private fun hasLocalNetworkCapability(caps: NetworkCapabilities): Boolean {
    // NET_CAPABILITY_LOCAL_NETWORK = 36, added in API 36.
    if (Build.VERSION.SDK_INT < 36) {
      return false
    }
    return try {
      caps.hasCapability(36)
    } catch (_: Exception) {
      false
    }
  }

  private fun isLikelyLocalDestination(address: InetAddress): Boolean {
    if (address.isSiteLocalAddress || address.isLinkLocalAddress) {
      return true
    }
    // Unique local IPv6 (fc00::/7)
    if (address.address.size == 16) {
      val first = address.address[0].toInt() and 0xFE
      if (first == 0xFC) {
        return true
      }
    }
    // Tailscale / Carrier-grade NAT 100.64.0.0/10
    if (address.address.size == 4) {
      val b0 = address.address[0].toInt() and 0xFF
      val b1 = address.address[1].toInt() and 0xFF
      if (b0 == 100 && b1 in 64..127) {
        return true
      }
    }
    return false
  }
}
