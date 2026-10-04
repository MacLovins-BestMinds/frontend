// Рендер HTML-карточки в PNG через WebKit: swift tools/og/render.swift <card.html> <out.png> [ширина] [высота]
import AppKit
import WebKit

let args = CommandLine.arguments
let input = URL(fileURLWithPath: args[1]).standardizedFileURL
let output = URL(fileURLWithPath: args[2])
let width = args.count > 3 ? Double(args[3])! : 1200
let height = args.count > 4 ? Double(args[4])! : 630

final class Renderer: NSObject, WKNavigationDelegate {
  let view = WKWebView(frame: NSRect(x: 0, y: 0, width: width, height: height))
  func start() {
    view.navigationDelegate = self
    // доступ к папке над репозиторием: шрифты из node_modules (бывает ссылкой на соседнюю папку) и рисунки из assets
    view.loadFileURL(input, allowingReadAccessTo: input.deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent())
  }
  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    // ждём шрифты и картинки
    webView.evaluateJavaScript("document.fonts.ready.then(() => Promise.all([...document.images].map(i => i.decode().catch(() => {})))).then(() => 1)") { _, _ in
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
        let config = WKSnapshotConfiguration()
        config.rect = NSRect(x: 0, y: 0, width: width, height: height)
        config.snapshotWidth = NSNumber(value: width)
        webView.takeSnapshot(with: config) { image, error in
          guard let image, let tiff = image.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff),
                let png = rep.representation(using: .png, properties: [:]) else {
            print("snapshot failed: \(String(describing: error))"); exit(1)
          }
          try! png.write(to: output)
          print("saved \(output.path) \(rep.pixelsWide)x\(rep.pixelsHigh)")
          exit(0)
        }
      }
    }
  }
}

let app = NSApplication.shared
let renderer = Renderer()
renderer.start()
app.run()
