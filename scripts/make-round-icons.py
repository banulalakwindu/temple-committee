"""Make logo assets circular with transparent corners (for Windows title bar / taskbar)."""
from __future__ import annotations

import io
import struct
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "resources" / "icons" / "icon_1024x1024.png"
if not SRC.exists():
    SRC = ROOT / "src" / "assets" / "logo.png"


def to_round_transparent(img: Image.Image, black_threshold: int = 28) -> Image.Image:
    """Clear near-black corners and soft-mask outside the inscribed circle."""
    rgba = img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    cx, cy = (w - 1) / 2, (h - 1) / 2
    radius = min(w, h) / 2 - 0.5

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            dx, dy = x - cx, y - cy
            dist = (dx * dx + dy * dy) ** 0.5
            if dist > radius + 0.75:
                px[x, y] = (0, 0, 0, 0)
                continue
            if r <= black_threshold and g <= black_threshold and b <= black_threshold:
                px[x, y] = (0, 0, 0, 0)
                continue
            # Anti-alias edge of circle
            if dist > radius - 1.25:
                edge_a = max(0, min(255, int(255 * (radius + 0.75 - dist) / 2.0)))
                px[x, y] = (r, g, b, min(a, edge_a))

    return rgba


def save_png(img: Image.Image, path: Path, size: int | None = None) -> None:
    out = img.resize((size, size), Image.Resampling.LANCZOS) if size else img
    path.parent.mkdir(parents=True, exist_ok=True)
    out.save(path, format="PNG")
    print(f"wrote {path.relative_to(ROOT)} ({out.size[0]}x{out.size[1]})")


def save_ico(img: Image.Image, path: Path, sizes: list[int]) -> None:
    """Write a real multi-size .ico with PNG payloads (Vista+). Pillow often keeps only one size."""
    path.parent.mkdir(parents=True, exist_ok=True)
    ordered = sorted(set(sizes))
    blobs: list[tuple[int, bytes]] = []
    for size in ordered:
        frame = img.resize((size, size), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        frame.save(buf, format="PNG")
        blobs.append((size, buf.getvalue()))

    count = len(blobs)
    offset = 6 + 16 * count
    parts = [struct.pack("<HHH", 0, 1, count)]
    data_parts: list[bytes] = []
    for size, png in blobs:
        # 0 means 256 in ICONDIRENTRY width/height fields
        w = 0 if size >= 256 else size
        h = 0 if size >= 256 else size
        parts.append(struct.pack("<BBBBHHII", w, h, 0, 0, 1, 32, len(png), offset))
        data_parts.append(png)
        offset += len(png)

    path.write_bytes(b"".join(parts) + b"".join(data_parts))

    check = Image.open(path)
    found: list[tuple[int, int]] = []
    i = 0
    try:
        while True:
            check.seek(i)
            found.append(check.size)
            i += 1
    except EOFError:
        pass
    print(f"wrote {path.relative_to(ROOT)} embedded={found}")


def main() -> None:
    print(f"source: {SRC}")
    base = to_round_transparent(Image.open(SRC))

    # Packaged / window / taskbar — include DPI-common sizes (24/40/48/64)
    win_sizes = [16, 20, 24, 32, 40, 48, 64, 128, 256]
    save_png(base, ROOT / "resources" / "icon.png", 512)
    save_ico(base, ROOT / "resources" / "icon.ico", win_sizes)

    # Size variants
    icons_dir = ROOT / "resources" / "icons"
    for size in (16, 24, 32, 48, 64, 128, 256, 1024):
        save_png(base, icons_dir / f"icon_{size}x{size}.png", size)
    save_ico(base, icons_dir / "icon_16x16.ico", [16])
    save_ico(base, icons_dir / "icon_32x32.ico", [32])
    save_ico(base, icons_dir / "icon_48x48.ico", [48])
    save_ico(base, icons_dir / "icon_256x256.ico", [256])
    save_ico(base, icons_dir / "icon_1024x1024.ico", [256])  # ICO max useful 256

    # App UI + favicon (keep round logos — do not overwrite with wide splash)
    save_png(base, ROOT / "src" / "assets" / "logo.png", 512)
    save_png(base, ROOT / "src" / "assets" / "logo-mark.png", 256)
    save_png(base, ROOT / "public" / "favicon.png", 32)
    save_ico(base, ROOT / "public" / "favicon.ico", [16, 24, 32, 48])

    print("done")


if __name__ == "__main__":
    main()
