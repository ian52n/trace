// Generates a 1024x1024 app icon for Trace.
// Run: swift tools/generate_app_icon.swift
// Writes: Trace/Assets.xcassets/AppIcon.appiconset/Icon-1024.png
//
// iOS app icons must NOT have an alpha channel — App Store Connect rejects
// or hides icons with transparency. We render to a CGContext with
// `noneSkipLast` (32-bit storage, alpha channel ignored) and the resulting
// PNG is encoded without an alpha channel.

import AppKit
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let size = CGSize(width: 1024, height: 1024)
let parchment = NSColor(srgbRed: 0.96, green: 0.94, blue: 0.89, alpha: 1.0)
let ink       = NSColor(srgbRed: 0.13, green: 0.11, blue: 0.10, alpha: 1.0)
let accent    = NSColor(srgbRed: 0.61, green: 0.26, blue: 0.13, alpha: 1.0)

let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
let bitmapInfo = CGImageAlphaInfo.noneSkipLast.rawValue | CGBitmapInfo.byteOrder32Little.rawValue

guard let ctx = CGContext(
    data: nil,
    width: Int(size.width),
    height: Int(size.height),
    bitsPerComponent: 8,
    bytesPerRow: 0,
    space: colorSpace,
    bitmapInfo: bitmapInfo
) else {
    FileHandle.standardError.write("Failed to create CGContext\n".data(using: .utf8)!)
    exit(1)
}

// Background
ctx.setFillColor(parchment.cgColor)
ctx.fill(CGRect(origin: .zero, size: size))

// Text via NSGraphicsContext sitting on top of our CGContext
let nsCtx = NSGraphicsContext(cgContext: ctx, flipped: false)
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = nsCtx

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

NSGraphicsContext.restoreGraphicsState()

// Accent horizontal rule below the T
ctx.setStrokeColor(accent.cgColor)
ctx.setLineWidth(10)
ctx.move(to: CGPoint(x: 340, y: 220))
ctx.addLine(to: CGPoint(x: size.width - 340, y: 220))
ctx.strokePath()

guard let cgImage = ctx.makeImage() else {
    FileHandle.standardError.write("Failed to make CGImage\n".data(using: .utf8)!)
    exit(1)
}

let outPath = "Trace/Assets.xcassets/AppIcon.appiconset/Icon-1024.png"
let outURL = URL(fileURLWithPath: outPath)

guard let dest = CGImageDestinationCreateWithURL(
    outURL as CFURL,
    UTType.png.identifier as CFString,
    1, nil
) else {
    FileHandle.standardError.write("Failed to create image destination\n".data(using: .utf8)!)
    exit(1)
}
// Force PNG encoder to drop the alpha channel.
let props: [CFString: Any] = [kCGImagePropertyHasAlpha: false]
CGImageDestinationAddImage(dest, cgImage, props as CFDictionary)

if CGImageDestinationFinalize(dest) {
    print("Wrote \(outPath) (font: \(font.fontName))")
} else {
    FileHandle.standardError.write("Failed to finalize PNG\n".data(using: .utf8)!)
    exit(1)
}
