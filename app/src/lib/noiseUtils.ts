// app/src/lib/noiseUtils.ts
import { createNoise2D } from 'simplex-noise'

// Single shared noise instance seeded from a fixed value so the
// garden looks the same every load.
export const noise2D = createNoise2D(() => 0.42)
