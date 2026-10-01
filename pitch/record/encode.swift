// Turns frames/*.jpg + frames.json (capture timestamps in seconds) into a 30 fps H.264 MP4.
// Usage: encode <framesDir> <frames.json> <out.mp4> [audio.m4a]
import AVFoundation
import AppKit

let args = CommandLine.arguments
let dir = URL(fileURLWithPath: args[1])
let stamps = try! JSONDecoder().decode([Double].self, from: Data(contentsOf: URL(fileURLWithPath: args[2])))
let out = URL(fileURLWithPath: args[3])
try? FileManager.default.removeItem(at: out)

let W = 1920, H = 1080, FPS: Int32 = 30
let writer = try! AVAssetWriter(outputURL: out, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: W, AVVideoHeightKey: H,
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 12_000_000, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel],
])
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB, kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H,
])
writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

func buffer(for index: Int) -> CVPixelBuffer {
  let path = dir.appendingPathComponent(String(format: "%06d.jpg", index)).path
  let image = NSImage(contentsOfFile: path)!.cgImage(forProposedRect: nil, context: nil, hints: nil)!
  var pb: CVPixelBuffer?
  CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb)
  let buf = pb!
  CVPixelBufferLockBaseAddress(buf, [])
  let ctx = CGContext(data: CVPixelBufferGetBaseAddress(buf), width: W, height: H, bitsPerComponent: 8,
                      bytesPerRow: CVPixelBufferGetBytesPerRow(buf), space: CGColorSpaceCreateDeviceRGB(),
                      bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
  ctx.setFillColor(CGColor.black)
  ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))
  // Fit the frame into 1920×1080 (letterbox if the aspect ratio differs).
  let scale = min(Double(W) / Double(image.width), Double(H) / Double(image.height))
  let w = Double(image.width) * scale, h = Double(image.height) * scale
  ctx.interpolationQuality = .high
  ctx.draw(image, in: CGRect(x: (Double(W) - w) / 2, y: (Double(H) - h) / 2, width: w, height: h))
  CVPixelBufferUnlockBaseAddress(buf, [])
  return buf
}

// For every output frame (30 per second) show the latest captured frame at that moment.
let start = stamps[0]
let total = stamps.last! - start + 1.0
let frameCount = Int(total * Double(FPS))
var src = 0
var current: CVPixelBuffer? = nil
var currentIndex = -1
for n in 0..<frameCount {
  let t = start + Double(n) / Double(FPS)
  while src + 1 < stamps.count && stamps[src + 1] <= t { src += 1 }
  if src != currentIndex { current = buffer(for: src); currentIndex = src }
  while !input.isReadyForMoreMediaData { usleep(2000) }
  adaptor.append(current!, withPresentationTime: CMTime(value: CMTimeValue(n), timescale: FPS))
}
input.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
print(writer.status == .completed ? "wrote \(out.path) (\(frameCount) frames, \(String(format: "%.1f", total)) s)" : "error: \(String(describing: writer.error))")
