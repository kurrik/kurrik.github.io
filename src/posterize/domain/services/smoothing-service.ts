/**
 * Domain service for smoothing edges in posterized images
 */
import { ISmoothingService } from '../../types/interfaces';

export class SmoothingService implements ISmoothingService {
  /**
   * Smooth bucket assignments to reduce jagged edges
   * This improves the appearance of region boundaries
   */
  smoothBuckets(
    buckets: Uint8Array, 
    width: number, 
    height: number, 
    colorCount: number,
    iterations: number
  ): void {
    // Define 8-direction neighborhood (including diagonals)
    const dx = [-1, 0, 1, -1, 1, -1, 0, 1];
    const dy = [-1, -1, -1, 0, 0, 1, 1, 1];
    
    // Create buffers for the smoothing process
    let src = buckets;
    let dst = new Uint8Array(width * height);
    
    // Perform multiple smoothing iterations if requested
    for (let it = 0; it < iterations; ++it) {
      for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
          const idx = y * width + x;
          
          // Count neighboring bucket frequencies
          const counts = new Array(colorCount).fill(0);
          
          // Check all 8 neighboring pixels
          for (let d = 0; d < 8; ++d) {
            const nx = x + dx[d];
            const ny = y + dy[d];
            
            // Skip out-of-bounds coordinates
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            
            // Increment count for the neighbor's bucket
            counts[src[ny * width + nx]]++;
          }
          
          // Majority vote with tie-breaking in favor of current value
          let maxBucket = src[idx];
          let maxCount = counts[src[idx]];
          
          for (let i = 0; i < counts.length; ++i) {
            if (counts[i] > maxCount) {
              maxCount = counts[i];
              maxBucket = i;
            }
          }
          
          // Assign the majority bucket to the destination buffer
          dst[idx] = maxBucket;
        }
      }
      
      // Swap source and destination buffers for the next iteration
      const tmp = src;
      src = dst;
      dst = tmp;
    }
    
    // If the final result is in the temporary buffer, copy it back to the original buckets
    if (src !== buckets) {
      for (let i = 0; i < width * height; ++i) {
        buckets[i] = src[i];
      }
    }
  }
}
