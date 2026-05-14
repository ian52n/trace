// Generates a 1024x1024 app icon for Trace.
// Run: swift tools/generate_app_icon.swift
// Writes: Trace/Assets.xcassets/AppIcon.appiconset/Icon-1024.png

import AppKit
import CoreText

let size = CGSize(width: 1024, height: 1024)

let parchment = NSColor(srgbRed: 0.96, green: 0.94, blue: 0.89, alpha: 1.0)
let ink       = NSColor(srgbRed: 0.13, green: 0.11, blue: 0.10, alpha: 1.0)
let accent    = NSColor(srgbRed: 0.61, green: 0.26, blue: 0.13, alpha: 1.0)

guard let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(size.width),
    pixelsHigh: Int(size.height),
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 32
) else {
    FileHandle.standardError.write("Failed to allocate bitmap\n".data(using: .utf8)!)
    exit(1)
}

NSGraphicsContext.saveGraphicsState()
guard let ctx = NSGraphicsContext(bitmapImageRep: bitmap) else {
    FileHandle.standardError.write("Failed to create graphics context\n".data(using: .utf8)!)
    exit(1)
}
NSGraphicsContext.current = ctx

// Background
parchment.setFill()
NSRect(origin: .zero, size: size).fill()

// "T" — use New York serif if available, fall back to Georgia.
let fontSize: CGFloat = 680
let font = NSFont(name: "NewYork-Semibold", size: fontSize)
    ?? NSFont(name: "NewYorkExtraLarge-Semibold", size: fontSize)
    ?? NSFont(name: "Georgia-Bold", size: fontSize)!

let paragraph = NSMutableParagraphStyle()
paragraph.alignment = .center

let attrs: [NSAttributedString.Key: Any] = [
    .font: font,
    .foregroundColor: ink,
    .paragraphStyle: paragraph,
]
let str = NSAttributedString(string: "T", attributes: attrs)
let strSize = str.size()
let strOrigin = NSPoint(
    x: (size.width - strSize.width) / 2,
    y: (size.height - strSize.height) / 2 + 30
)
str.draw(at: strOrigin)

// Thin horizontal rule below the T, in accent color
accent.setStroke()
let rule = NSBezierPath()
rule.lineWidth = 10
let ruleY: CGFloat = 220
rule.move(to: NSPoint(x: 340, y: ruleY))
rule.line(to: NSPoint(x: size.width - 340, y: ruleY))
rule.stroke()

NSGraphicsContext.restoreGraphicsState()

guard let data = bitmap.representation(using: NSBitmapImageRep.FileType.png, properties: [:]) else {
    FileHandle.standardError.write("Failed to encode PNG\n".data(using: .utf8)!)
    exit(1)
}

let outPath = "Trace/Assets.xcassets/AppIcon.appiconset/Icon-1024.png"
let outURL = URL(fileURLWithPath: outPath)
do {
    try data.write(to: outURL)
    print("Wrote \(outPath) (\(data.count) bytes, font: \(font.fontName))")
} catch {
    FileHandle.standardError.write("Write failed: \(error)\n".data(using: .utf8)!)
    exit(1)
}
