import ExpoModulesCore
import Foundation

private let defaultServiceType = "_t3code._tcp."

private func normalizeServiceType(_ serviceType: String) -> String {
  let trimmed = serviceType.trimmingCharacters(in: .whitespacesAndNewlines)
  if trimmed.isEmpty {
    return defaultServiceType
  }
  var base = trimmed
  if base.hasPrefix("_") {
    base.removeFirst()
  }
  if base.hasSuffix("._tcp.") {
    return "_\(base)"
  }
  if base.hasSuffix("._tcp") {
    return "_\(base)."
  }
  return "_\(base)._tcp."
}

public class T3LanDiscoveryModule: Module, NetServiceBrowserDelegate, NetServiceDelegate {
  private var browser: NetServiceBrowser?
  private var resolvingServices: [String: NetService] = [:]

  public func definition() -> ModuleDefinition {
    Name("T3LanDiscovery")

    Events("onLanDiscoveryEvent")

    AsyncFunction("start") { (serviceType: String) in
      self.startBrowsing(serviceType: serviceType)
    }

    AsyncFunction("stop") {
      self.stopBrowsing()
    }
  }

  private func startBrowsing(serviceType: String) {
    stopBrowsing()
    let browser = NetServiceBrowser()
    browser.delegate = self
    browser.searchForServices(ofType: normalizeServiceType(serviceType), inDomain: "local.")
    self.browser = browser
  }

  private func stopBrowsing() {
    browser?.stop()
    browser?.delegate = nil
    browser = nil
    resolvingServices.removeAll()
  }

  public func netServiceBrowser(
    _ browser: NetServiceBrowser,
    didFind service: NetService,
    moreComing: Bool
  ) {
    guard let serviceName = service.name as String? else {
      return
    }
    if resolvingServices[serviceName] != nil {
      return
    }
    service.delegate = self
    resolvingServices[serviceName] = service
    service.resolve(withTimeout: 5)
  }

  public func netServiceBrowser(
    _ browser: NetServiceBrowser,
    didRemove service: NetService,
    moreComing: Bool
  ) {
    guard let serviceName = service.name as String? else {
      return
    }
    resolvingServices.removeValue(forKey: serviceName)
    sendEvent(
      "onLanDiscoveryEvent",
      [
        "type": "lost",
        "serviceName": serviceName,
      ]
    )
  }

  public func netServiceBrowser(_ browser: NetServiceBrowser, didNotSearch errorDict: [String: NSNumber]) {
    sendEvent(
      "onLanDiscoveryEvent",
      [
        "type": "error",
        "message": "LAN discovery failed to start.",
      ]
    )
    stopBrowsing()
  }

  public func netServiceDidResolveAddress(_ sender: NetService) {
    guard let serviceName = sender.name as String? else {
      return
    }
    guard sender.port > 0 else {
      return
    }
    guard let host = sender.hostName?.trimmingCharacters(in: CharacterSet(charactersIn: ".")) else {
      return
    }

    sendEvent(
      "onLanDiscoveryEvent",
      [
        "type": "resolved",
        "serviceName": serviceName,
        "host": host,
        "port": sender.port,
      ]
    )
  }

  public func netService(_ sender: NetService, didNotResolve errorDict: [String: NSNumber]) {
    guard let serviceName = sender.name as String? else {
      return
    }
    resolvingServices.removeValue(forKey: serviceName)
  }
}