/**
 * Finds which pixels of a product photo are the product itself, using ORMBG (Apache-2.0)
 * through Transformers.js, entirely in the browser. Admin-only: loaded on demand the first
 * time the yarn-colour tool runs; the model is downloaded once and cached by the browser.
 * Returns null on any failure so the tool falls back to colour-only detection.
 */

const MODEL = 'onnx-community/ormbg-ONNX'

type Segmenter = (input: string) => Promise<unknown>
let segmenterPromise: Promise<Segmenter> | null = null

async function getSegmenter(onProgress?: (pct: number) => void): Promise<Segmenter> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers')
      const files = new Map<string, { loaded: number; total: number }>()
      const seg = await pipeline('background-removal', MODEL, {
        progress_callback: (e: { status?: string; file?: string; loaded?: number; total?: number }) => {
          if (e.status !== 'progress' || !e.file || !e.total) return
          files.set(e.file, { loaded: e.loaded ?? 0, total: e.total })
          let loaded = 0
          let total = 0
          for (const f of files.values()) {
            loaded += f.loaded
            total += f.total
          }
          onProgress?.(Math.round((loaded / total) * 100))
        },
      })
      return seg as unknown as Segmenter
    })()
    segmenterPromise.catch(() => {
      segmenterPromise = null
    })
  }
  return segmenterPromise
}

interface RawImageLike {
  width: number
  height: number
  channels: number
  data: Uint8Array | Uint8ClampedArray
}

/** 1 = product pixel, 0 = background, at `width`×`height`; null if it couldn't be worked out. */
export async function detectProduct(url: string, width: number, height: number, onProgress?: (pct: number) => void): Promise<Uint8Array | null> {
  try {
    const segment = await getSegmenter(onProgress)
    const out = await segment(url)
    const img = (Array.isArray(out) ? out[0] : out) as RawImageLike
    if (!img?.data || img.channels !== 4) return null

    // the pipeline returns the photo with the background made transparent: read its alpha
    const src = document.createElement('canvas')
    src.width = img.width
    src.height = img.height
    src.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0)
    const dst = document.createElement('canvas')
    dst.width = width
    dst.height = height
    const ctx = dst.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(src, 0, 0, width, height)
    const rgba = ctx.getImageData(0, 0, width, height).data

    const product = new Uint8Array(width * height)
    let count = 0
    for (let p = 0; p < product.length; p++) {
      if (rgba[p * 4 + 3] > 127) {
        product[p] = 1
        count++
      }
    }
    // nothing (or everything) found means the model didn't understand this photo
    return count > product.length * 0.02 && count < product.length * 0.98 ? product : null
  } catch {
    return null
  }
}
