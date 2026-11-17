"""Small SVG helpers for the illustrative indicator mock on Famous Strategies pages."""
import random

W, H = 560, 330


def svg(aria, parts):
    return ('<svg viewBox="0 0 %d %d" role="img" aria-label="%s"><rect width="%d" height="%d" rx="14" fill="#141416"/>' % (W, H, aria.replace('"', "'"), W, H)
            + "".join(parts) + '<text x="%d" y="%d" fill="#6e6e73" font-size="11" text-anchor="end">Illustrative mock &middot; made-up values</text></svg>' % (W - 14, H - 10))


def t(x, y, s, col="#86868b", size=11, anchor="start", weight=600):
    return '<text x="%.1f" y="%.1f" fill="%s" font-size="%s" font-weight="%s" text-anchor="%s">%s</text>' % (x, y, col, size, weight, anchor, s)


def r(x, y, w, h, col, op=1, rx=0):
    return '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%s" fill="%s" opacity="%s"/>' % (x, y, w, h, rx, col, op)


def ln(x1, y1, x2, y2, col, w=1, dash=None):
    return '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%s"%s/>' % (x1, y1, x2, y2, col, w, (' stroke-dasharray="%s"' % dash) if dash else "")


def pl(pts, col, w=2):
    return '<polyline fill="none" stroke="%s" stroke-width="%s" stroke-linejoin="round" points="%s"/>' % (col, w, " ".join("%.1f,%.1f" % p for p in pts))


def walk(n, start, drift, vol, seed, shocks=None):
    random.seed(seed)
    v, out = start, []
    for i in range(n):
        v += drift(i) if callable(drift) else drift
        v += random.uniform(-vol, vol)
        if shocks and i in shocks:
            v += shocks[i]
        out.append(v)
    return out


def scale(vals, x0, x1, y0, y1, lo=None, hi=None):
    lo = min(vals) if lo is None else lo
    hi = max(vals) if hi is None else hi
    n = len(vals)
    X = lambda i: x0 + i * (x1 - x0) / (n - 1)
    Y = lambda v: y1 - (v - lo) / (hi - lo or 1) * (y1 - y0)
    return X, Y


def candles(vals, X, Y, seed=3, w=4):
    random.seed(seed)
    out, prev = [], vals[0]
    for i, c in enumerate(vals):
        o = prev
        hi = max(o, c) + random.uniform(0, abs(c - o) * 0.6 + 0.3)
        lo = min(o, c) - random.uniform(0, abs(c - o) * 0.6 + 0.3)
        col = "#30d158" if c >= o else "#ff453a"
        out.append(ln(X(i), Y(hi), X(i), Y(lo), col, 1))
        out.append(r(X(i) - w / 2, Y(max(o, c)), w, max(1.2, abs(Y(o) - Y(c))), col))
        prev = c
    return "".join(out)


def table(x, y, rows, widths=(150,), rh=19, title=None):
    """rows: list of (cells[list of (text,color)], bg)."""
    out = []
    if title:
        out.append(t(x, y - 8, title))
    wt = sum(widths)
    for k, (cells, bg) in enumerate(rows):
        yy = y + k * rh
        out.append(r(x, yy, wt, rh - 1, bg))
        cx = x + 6
        for j, (s, col) in enumerate(cells):
            out.append(t(cx, yy + 13, s, col, 11, "start", 600))
            cx += widths[j] if j < len(widths) else 50
    return "".join(out)
