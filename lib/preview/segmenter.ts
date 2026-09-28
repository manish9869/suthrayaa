/**
 * Click-to-select with an object-segmentation model: SlimSAM (Segment Anything, compressed;
 * Apache-2.0) through Transformers.js, entirely in the browser. Admin-only; the model (~40 MB)
 * is downloaded on first use and cached by the browser.
 *
 * A session holds one photo's image embedding (computed once, ~a few seconds); each click is
 * then decoded in a fraction of a second into candidate shapes — typically the whole object,
 * a part of it, and a smaller part — which the admin chooses between.
 */

import type { Candidate } from './ai-suggest'

const MODEL = 'Xenova/slimsam-77-uniform'

export interface ClickPoint {
  x: number
  y: number
  /** true = include this spot, false = exclude it */
  positive: boolean
}

export interface SegmentSession {
  /** Candidate shapes for these clicks, at the working size, largest first. */
  decode(points: ClickPoint[]): Promise<Candidate[]>
}

type Loaded = { model: any; processor: any; tf: any } // eslint-disable-line @typescript-eslint/no-explicit-any
let loading: Promise<Loaded> | null = null

function loadModel(onProgress?: (pct: number) => void): Promise<Loaded> {
  if (!loading) {
    loading = (async () => {
      const tf = await import('@huggingface/transformers')
      const files = new Map<string, { loaded: number; total: number }>()
      const progress_callback = (e: { status?: string; file?: string; loaded?: number; total?: number }) => {
        if (e.status !== 'progress' || !e.file || !e.total) return
        files.set(e.file, { loaded: e.loaded ?? 0, total: e.total })
        let loaded = 0
        let total = 0
        for (const f of files.values()) {
          loaded += f.loaded
          total += f.total
        }
        onProgress?.(Math.round((loaded / total) * 100))
      }
      const [model, processor] = await Promise.all([
        tf.SamModel.from_pretrained(MODEL, { dtype: 'fp32', progress_callback }),
        tf.AutoProcessor.from_pretrained(MODEL, { progress_callback }),
      ])
      return { model, processor, tf }
    })()
    loading.catch(() => {
      loading = null
    })
  }
  return loading
}

/**
 * Prepares one photo (RGBA at working size). Returns null if the model can't run here, so
 * the editor falls back to colour-based tools.
 */
export async function createSegmentSession(rgba: Uint8ClampedArray, w: number, h: number, onProgress?: (pct: number) => void): Promise<SegmentSession | null> {
  try {
    const { model, processor, tf } = await loadModel(onProgress)
    const image = new tf.RawImage(new Uint8ClampedArray(rgba), w, h, 4).rgb()
    const inputs = await processor(image)
    const embeddings = await model.get_image_embeddings(inputs)
    const [rh, rw] = inputs.reshaped_input_sizes[0] as [number, number]

    return {
      async decode(points) {
        if (points.length === 0) return []
        const coords = points.flatMap((p) => [(p.x / w) * rw, (p.y / h) * rh])
        const input_points = new tf.Tensor('float32', coords, [1, 1, points.length, 2])
        const input_labels = new tf.Tensor('int64', points.map((p) => BigInt(p.positive ? 1 : 0)), [1, 1, points.length])
        const out = await model({ ...embeddings, input_points, input_labels })
        const masks = (await processor.post_process_masks(out.pred_masks, inputs.original_sizes, inputs.reshaped_input_sizes))[0]
        const scores = Array.from(out.iou_scores.data as Float32Array)
        const n = w * h
        const data = masks.data as Uint8Array | boolean[]
        return scores
          .map((score, k) => {
            const mask = new Uint8Array(n)
            for (let p = 0; p < n; p++) mask[p] = data[k * n + p] ? 1 : 0
            return { mask, score }
          })
          .sort((a, b) => b.mask.reduce((s, v) => s + v, 0) - a.mask.reduce((s, v) => s + v, 0))
      },
    }
  } catch {
    return null
  }
}
