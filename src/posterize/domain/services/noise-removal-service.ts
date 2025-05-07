/**
 * Domain service for noise removal in posterized images
 */
import { INoiseRemovalService } from '../../types/interfaces';

export class NoiseRemovalService implements INoiseRemovalService {
  /**
   * Remove small isolated regions from the posterized image
   * This improves output quality by eliminating visual noise
   */
  removeNoise(
    buckets: Uint8Array, 
    width: number, 
    height: number, 
    minSize: number,
    colorCount: number
  ): void {
    // Create a copy of the buckets for tracking visited pixels
    const visited = new Uint8Array(width * height);
    
    // Define movement in 4 directions (right, left, down, up)
    const dx = [1, -1, 0, 0];
    const dy = [0, 0, 1, -1];
    
    // Scan through all pixels
    for (let y = 0; y < height; ++y) {
      for (let x = 0; x < width; ++x) {
        const idx = y * width + x;
        
        // Skip already visited pixels
        if (visited[idx]) continue;
        
        // Start a new region
        const region: number[] = [];
        const queue: [number, number][] = [[x, y]];
        const originalBucket = buckets[idx];
        
        visited[idx] = 1;
        region.push(idx);
        
        // Breadth-first search to find all connected pixels of the same bucket
        while (queue.length) {
          const [cx, cy] = queue.pop()!;
          
          // Check all 4 directions
          for (let d = 0; d < 4; ++d) {
            const nx = cx + dx[d];
            const ny = cy + dy[d];
            
            // Skip out-of-bounds coordinates
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            
            const neighborIdx = ny * width + nx;
            
            // If not visited and same bucket, add to region
            if (!visited[neighborIdx] && buckets[neighborIdx] === originalBucket) {
              visited[neighborIdx] = 1;
              queue.push([nx, ny]);
              region.push(neighborIdx);
            }
          }
        }
        
        // If region is smaller than minimum size, replace with majority neighbor bucket
        if (region.length < minSize) {
          // Count bucket frequencies of neighboring pixels
          const counts = new Array(colorCount).fill(0);
          
          for (const ridx of region) {
            const rx = ridx % width;
            const ry = Math.floor(ridx / width);
            
            // Check neighbors of each pixel in the region
            for (let d = 0; d < 4; ++d) {
              const nx = rx + dx[d];
              const ny = ry + dy[d];
              
              // Skip out-of-bounds coordinates
              if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
              
              const neighborIdx = ny * width + nx;
              
              // Count different neighbor buckets
              if (buckets[neighborIdx] !== originalBucket) {
                counts[buckets[neighborIdx]]++;
              }
            }
          }
          
          // Find bucket with maximum frequency
          let maxBucket = originalBucket;
          let maxCount = -1;
          
          for (let i = 0; i < counts.length; ++i) {
            if (counts[i] > maxCount) {
              maxCount = counts[i];
              maxBucket = i;
            }
          }
          
          // Replace all pixels in the region with the majority bucket
          for (const ridx of region) {
            buckets[ridx] = maxBucket;
          }
        }
      }
    }
  }
}
