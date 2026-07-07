package expo.modules.t3landiscovery

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.WifiManager
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.InetAddress
import java.util.concurrent.atomic.AtomicBoolean

class T3LanDiscoveryModule : Module() {
  private var nsdManager: NsdManager? = null
  private var discoveryListener: NsdManager.DiscoveryListener? = null
  private var multicastLock: WifiManager.MulticastLock? = null
  private val discovering = AtomicBoolean(false)
  private val resolvingServices = mutableSetOf<String>()

  override fun definition() = ModuleDefinition {
    Name("T3LanDiscovery")

    Events("onLanDiscoveryEvent")

    AsyncFunction("start") { serviceType: String ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      startDiscovery(context, normalizeServiceType(serviceType))
    }

    AsyncFunction("stop") {
      stopDiscovery()
    }
  }

  private fun normalizeServiceType(serviceType: String): String {
    val trimmed = serviceType.trim().ifEmpty { "_t3code._tcp" }
    val base = trimmed.removePrefix("_").removeSuffix("._tcp").removeSuffix(".")
    return "_${base}._tcp."
  }

  private fun startDiscovery(context: Context, serviceType: String) {
    stopDiscovery()

    val wifi = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
    multicastLock =
      wifi.createMulticastLock("t3-lan-discovery").apply {
        setReferenceCounted(true)
        acquire()
      }

    nsdManager = context.getSystemService(Context.NSD_SERVICE) as NsdManager
    discovering.set(true)
    resolvingServices.clear()

    discoveryListener =
      object : NsdManager.DiscoveryListener {
        override fun onDiscoveryStarted(regType: String) {}

        override fun onServiceFound(serviceInfo: NsdServiceInfo) {
          if (!discovering.get()) {
            return
          }
          val serviceName = serviceInfo.serviceName ?: return
          if (resolvingServices.contains(serviceName)) {
            return
          }
          resolvingServices.add(serviceName)

          nsdManager?.resolveService(
            serviceInfo,
            object : NsdManager.ResolveListener {
              override fun onResolveFailed(info: NsdServiceInfo, errorCode: Int) {
                resolvingServices.remove(serviceName)
              }

              override fun onServiceResolved(info: NsdServiceInfo) {
                resolvingServices.remove(serviceName)
                if (!discovering.get()) {
                  return
                }
                val host = info.host?.hostAddress ?: return
                val port = info.port
                if (port <= 0) {
                  return
                }
                sendEvent(
                  "onLanDiscoveryEvent",
                  mapOf(
                    "type" to "resolved",
                    "serviceName" to (info.serviceName ?: serviceName),
                    "host" to host,
                    "port" to port,
                  ),
                )
              }
            },
          )
        }

        override fun onServiceLost(serviceInfo: NsdServiceInfo) {
          val serviceName = serviceInfo.serviceName ?: return
          resolvingServices.remove(serviceName)
          sendEvent(
            "onLanDiscoveryEvent",
            mapOf(
              "type" to "lost",
              "serviceName" to serviceName,
            ),
          )
        }

        override fun onDiscoveryStopped(serviceType: String) {}

        override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
          sendEvent(
            "onLanDiscoveryEvent",
            mapOf(
              "type" to "error",
              "message" to "LAN discovery failed to start (code $errorCode).",
            ),
          )
          stopDiscovery()
        }

        override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {
          sendEvent(
            "onLanDiscoveryEvent",
            mapOf(
              "type" to "error",
              "message" to "LAN discovery failed to stop (code $errorCode).",
            ),
          )
        }
      }

    nsdManager?.discoverServices(serviceType, NsdManager.PROTOCOL_DNS_SD, discoveryListener)
  }

  private fun stopDiscovery() {
    discovering.set(false)
    resolvingServices.clear()

    val listener = discoveryListener
    if (listener != null) {
      try {
        nsdManager?.stopServiceDiscovery(listener)
      } catch (_: IllegalArgumentException) {
      }
    }
    discoveryListener = null
    nsdManager = null

    multicastLock?.let { lock ->
      if (lock.isHeld) {
        lock.release()
      }
    }
    multicastLock = null
  }
}