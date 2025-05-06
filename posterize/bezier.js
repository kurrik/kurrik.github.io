// Utility: Find contours for a binary mask using simple border-following (Moore-Neighbor tracing)
function findContours(mask, w, h) {
  const contours = [];
  const visited = new Uint8Array(w * h);
  const dx = [1, 1, 0, -1, -1, -1, 0, 1];
  const dy = [0, -1, -1, -1, 0, 1, 1, 1];
  for (let y = 0; y < h; ++y) {
    for (let x = 0; x < w; ++x) {
      const idx = y * w + x;
      if (mask[idx] && !visited[idx]) {
        // Start contour tracing
        let contour = [], cx = x, cy = y, dir = 0, start = idx;
        let foundStart = false;
        do {
          contour.push([cx, cy]);
          visited[cy * w + cx] = 1;
          foundStart = true;
          let found = false;
          for (let i = 0; i < 8; ++i) {
            const ndir = (dir + i) % 8;
            const nx = cx + dx[ndir], ny = cy + dy[ndir];
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const nidx = ny * w + nx;
            if (mask[nidx] && !visited[nidx]) {
              cx = nx; cy = ny; dir = (ndir + 6) % 8; found = true; break;
            }
          }
          if (!found) break;
        } while ((cx !== x || cy !== y) && contour.length < 10000);
        if (contour.length > 2 && foundStart) contours.push(contour);
      }
    }
  }
  return contours;
}

// Utility: Fit a sequence of points with cubic Bezier curves using Ramer-Douglas-Peucker for simplification
function fitBezierCurve(points, tolerance) {
  // Use RDP to reduce points
  function rdp(pts, eps) {
    if (pts.length < 3) return pts;
    let dmax = 0, idx = 0;
    for (let i = 1; i < pts.length - 1; ++i) {
      const d = perpDist(pts[i], pts[0], pts[pts.length - 1]);
      if (d > dmax) { dmax = d; idx = i; }
    }
    if (dmax > eps) {
      const left = rdp(pts.slice(0, idx + 1), eps);
      const right = rdp(pts.slice(idx), eps);
      return left.slice(0, -1).concat(right);
    } else {
      return [pts[0], pts[pts.length - 1]];
    }
  }
  function perpDist(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
    const px = a[0] + t * dx, py = a[1] + t * dy;
    return Math.hypot(p[0] - px, p[1] - py);
  }
  // Catmull-Rom to Bezier conversion
  function catmullRom2bezier(pts) {
    let d = '';
    const n = pts.length;
    if (n < 2) return d;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = pts[(i + 2) % n];
      if (i === 0) d += `M${p1[0]},${p1[1]}`;
      const c1 = [
        p1[0] + (p2[0] - p0[0]) / 6,
        p1[1] + (p2[1] - p0[1]) / 6
      ];
      const c2 = [
        p2[0] - (p3[0] - p1[0]) / 6,
        p2[1] - (p3[1] - p1[1]) / 6
      ];
      d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
    }
    d += 'Z';
    return d;
  }
  const rdpPts = rdp(points, tolerance);
  if (rdpPts.length < 3) return '';
  return catmullRom2bezier(rdpPts);
}

// Connected-component labeling (4-connectivity)
function labelConnectedComponents(mask, w, h) {
  const labels = new Int32Array(w * h).fill(-1);
  let currentLabel = 0;
  const dx = [1, 0, -1, 0];
  const dy = [0, 1, 0, -1];
  for (let y = 0; y < h; ++y) {
    for (let x = 0; x < w; ++x) {
      const idx = y * w + x;
      if (mask[idx] && labels[idx] === -1) {
        // Flood fill
        const queue = [[x, y]];
        labels[idx] = currentLabel;
        while (queue.length) {
          const [cx, cy] = queue.shift();
          for (let dir = 0; dir < 4; ++dir) {
            const nx = cx + dx[dir], ny = cy + dy[dir];
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const nidx = ny * w + nx;
            if (mask[nidx] && labels[nidx] === -1) {
              labels[nidx] = currentLabel;
              queue.push([nx, ny]);
            }
          }
        }
        currentLabel++;
      }
    }
  }
  return {labels, count: currentLabel};
}

// Find all contours in a labeled region (outer and holes)
function findRegionContours(labels, regionLabel, w, h) {
  // Outer: pixels of regionLabel, Holes: pixels not regionLabel but inside bbox
  // We'll use border-following for both, but track visited for each
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; ++i) mask[i] = labels[i] === regionLabel ? 1 : 0;
  // Find all outer and hole contours
  const contours = findContours(mask, w, h);
  // Now find holes: invert mask, but only inside region's bbox
  let minx=w, miny=h, maxx=0, maxy=0;
  for (let i = 0; i < w * h; ++i) {
    if (mask[i]) {
      const x = i % w, y = Math.floor(i / w);
      if (x < minx) minx = x;
      if (y < miny) miny = y;
      if (x > maxx) maxx = x;
      if (y > maxy) maxy = y;
    }
  }
  // Mask for holes: only 0s inside bbox
  const holesMask = new Uint8Array(w * h);
  for (let y = miny; y <= maxy; ++y) {
    for (let x = minx; x <= maxx; ++x) {
      const idx = y * w + x;
      if (!mask[idx]) holesMask[idx] = 1;
    }
  }
  const holeContours = findContours(holesMask, w, h).filter(contour => {
    // Only keep holes that are completely surrounded by this region
    // (all neighbors of all points are either region or hole)
    return contour.every(([x, y]) => {
      for (const [dx, dy] of [[1,0],[0,1],[-1,0],[0,-1]]) {
        const nx = x+dx, ny = y+dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const nidx = ny * w + nx;
        if (mask[nidx]) return true;
      }
      return false;
    });
  });
  return {outer: contours, holes: holeContours};
}

// For each region in mask, return SVG path string (with holes) for fill-rule="evenodd"
function regionsToSvgPaths(mask, w, h, tolerance, fitCurve) {
  const {labels, count} = labelConnectedComponents(mask, w, h);
  const paths = [];
  for (let label = 0; label < count; ++label) {
    const {outer} = findRegionContours(labels, label, w, h);
    // Only keep the largest outer contour (by area)
    let maxArea = 0;
    let largest = null;
    for (const contour of outer) {
      if (contour.length > 2) {
        // Approximate area using the shoelace formula
        let area = 0;
        for (let i = 0; i < contour.length; ++i) {
          const [x0, y0] = contour[i];
          const [x1, y1] = contour[(i + 1) % contour.length];
          area += x0 * y1 - x1 * y0;
        }
        area = Math.abs(area) / 2;
        if (area > maxArea) {
          maxArea = area;
          largest = contour;
        }
      }
    }
    if (largest) {
      const d = fitCurve(largest, tolerance);
      if (d && d.length > 2) paths.push(d);
    }
  }
  return paths;
}

// Export for use in index.html
window.findContours = findContours;
window.fitBezierCurve = fitBezierCurve;
window.regionsToSvgPaths = regionsToSvgPaths;
