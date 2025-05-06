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
  // For each segment, fit a cubic Bezier (simple: just use endpoints and 1/3, 2/3 points as controls)
  const rdpPts = rdp(points, tolerance);
  if (rdpPts.length < 2) return '';
  let d = `M${rdpPts[0][0]},${rdpPts[0][1]}`;
  for (let i = 1; i < rdpPts.length; ++i) {
    const p0 = rdpPts[i - 1], p1 = rdpPts[i];
    // Approximate control points for smoothness
    const c1 = [p0[0] + (p1[0] - p0[0]) / 3, p0[1] + (p1[1] - p0[1]) / 3];
    const c2 = [p0[0] + 2 * (p1[0] - p0[0]) / 3, p0[1] + 2 * (p1[1] - p0[1]) / 3];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p1[0]},${p1[1]}`;
  }
  d += 'Z';
  return d;
}

// Export for use in index.html
window.findContours = findContours;
window.fitBezierCurve = fitBezierCurve;
