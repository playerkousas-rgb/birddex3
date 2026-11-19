#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BIRD-DEX 3 圖標產生器（零新依賴：純 stdlib zlib/struct）。

圖標概念（2026-11-19 去 Pokémon 化）：**雙筒望遠鏡 × 小鳥**
—— 金/奶白圓底（同 AvianDex「前往 BIRD-DEX 3 拍鳥」連結一致），
深綠雙筒望遠鏡＋上方小鳥剪影，一看就知係「觀鳥／拍鳥」，唔再係精靈球。

產出（全部對應同一設計，坐標系 64×64，圓直徑 59% ≤ maskable 66% 安全區）：
  public/icon-16.png    public/icon-32.png    public/icon-180.png
  public/icon-192.png   public/icon-512.png   public/favicon.ico (16+32 PNG-in-ICO)

用法：python3 scripts/gen-icons.py
"""
import math
import os
import struct
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(os.path.dirname(HERE), "public")

BG = (11, 15, 25)        # #0B0F19 app 背景
CREAM = (246, 229, 191)  # #F6E5BF 上半圓（跟 AvianDex 連結掣）
GOLD = (201, 178, 120)   # #C9B278 下半圓
INK = (38, 53, 40)       # #263528 望遠鏡／鳥
LENS = (168, 205, 187)   # 鏡片高光

CX, CY, R = 32.0, 33.0, 19.0
BEAK = ((30.0, 21.4), (26.4, 22.3), (30.0, 23.0))
TAIL = ((36.0, 22.6), (40.0, 20.4), (38.5, 23.6))
EYE = (31.0, 21.4, 0.5)


def _in_tri(px, py, tri):
    (ax, ay), (bx, by), (cx, cy) = tri
    def side(x1, y1, x2, y2):
        return (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2)
    d1 = side(ax, ay, bx, by)
    d2 = side(bx, by, cx, cy)
    d3 = side(cx, cy, ax, ay)
    neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
    pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
    return not (neg and pos)


def _in_rect(px, py, x0, y0, x1, y1, radius):
    if not (x0 <= px <= x1 and y0 <= py <= y1):
        return False
    rx = min(px - x0, x1 - px)
    ry = min(py - y0, y1 - py)
    if rx >= radius or ry >= radius:
        return True
    return (radius - rx) ** 2 + (radius - ry) ** 2 <= radius ** 2


def _in_round_rect(px, py, w, h, radius):
    if px < 0 or py < 0 or px >= w or py >= h:
        return False
    return _in_rect(px, py, 0, 0, w - 1, h - 1, radius)


def sample(x, y, rounded_bg=False):
    """(x, y) 係 64×64 座標系；rounded_bg=False 用於 PNG（全出血，maskable 要求）。"""
    if rounded_bg:
        if not _in_round_rect(x, y, 64, 64, 14):
            return None
    elif not (0 <= x < 64 and 0 <= y < 64):
        return None
    col = BG
    d = math.hypot(x - CX, y - CY)
    if d <= R:
        col = CREAM if y <= CY + 3 else GOLD
        if d <= R - 0.5:
            # 小鳥頭（望遠鏡上方）：圓頭＋尖嘴＋眼，16px 都讀到
            if math.hypot(x - 32.0, y - 22.0) <= 2.6 or _in_tri(x, y, BEAK):
                col = INK
            if math.hypot(x - EYE[0], y - EYE[1]) <= EYE[2]:
                col = CREAM
            # 雙筒望遠鏡：兩支鏡筒＋橋
            if (_in_rect(x, y, 18.0, 29.0, 30.0, 46.0, 3.0)
                    or _in_rect(x, y, 34.0, 29.0, 46.0, 46.0, 3.0)
                    or _in_rect(x, y, 29.0, 35.0, 35.0, 40.0, 1.5)):
                col = INK
            if math.hypot(x - 24.0, y - 43.0) <= 3.4 or math.hypot(x - 40.0, y - 43.0) <= 3.4:
                col = LENS
    return col


def render(size, rounded_bg=False, ss=3):
    """回傳 RGBA bytes（rows）。"""
    out = bytearray(size * size * 4)
    step = 64.0 / size
    inv = 1.0 / (ss * ss)
    for row in range(size):
        for col in range(size):
            rr = gg = bb = aa = 0.0
            for sy in range(ss):
                for sx in range(ss):
                    x = (col + (sx + 0.5) / ss) * step
                    y = (row + (sy + 0.5) / ss) * step
                    c = sample(x, y, rounded_bg)
                    if c is None:
                        continue
                    rr += c[0]
                    gg += c[1]
                    bb += c[2]
                    aa += 255
            i = (row * size + col) * 4
            n = ss * ss
            out[i] = int(rr / n + 0.5)
            out[i + 1] = int(gg / n + 0.5)
            out[i + 2] = int(bb / n + 0.5)
            out[i + 3] = int(aa * inv + 0.5)
    return bytes(out)


def write_png(path, size, rgba):
    def chunk(tag, data):
        payload = tag + data
        return struct.pack(">I", len(data)) + payload + struct.pack(">I", zlib.crc32(payload) & 0xFFFFFFFF)

    rows = b"".join(b"\x00" + rgba[r * size * 4:(r + 1) * size * 4] for r in range(size))
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # RGBA8
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(rows, 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as f:
        f.write(png)


def write_ico(path, png_blobs):
    """PNG-in-ICO（Vista+）。png_blobs: [(size, bytes), ...]"""
    count = len(png_blobs)
    header = struct.pack("<HHH", 0, 1, count)
    offset = 6 + 16 * count
    entries = b""
    for size, blob in png_blobs:
        dim = size if size < 256 else 0
        entries += struct.pack("<BBBBHHII", dim, dim, 0, 0, 1, 32, len(blob), offset)
        offset += len(blob)
    with open(path, "wb") as f:
        f.write(header + entries + b"".join(blob for _, blob in png_blobs))


def png_bytes(size, rgba):
    def chunk(tag, data):
        payload = tag + data
        return struct.pack(">I", len(data)) + payload + struct.pack(">I", zlib.crc32(payload) & 0xFFFFFFFF)

    rows = b"".join(b"\x00" + rgba[r * size * 4:(r + 1) * size * 4] for r in range(size))
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(rows, 9)) + chunk(b"IEND", b"")


def main():
    os.makedirs(PUBLIC, exist_ok=True)
    for size, ss in ((16, 4), (32, 4), (180, 3), (192, 3), (512, 2)):
        rgba = render(size, rounded_bg=False, ss=ss)
        path = os.path.join(PUBLIC, f"icon-{size}.png")
        write_png(path, size, rgba)
        print(f"wrote {path} ({os.path.getsize(path)} bytes)")
    ico = os.path.join(PUBLIC, "favicon.ico")
    blobs = []
    for size in (32, 16):
        blobs.append((size, png_bytes(size, render(size, rounded_bg=False, ss=4))))
    write_ico(ico, blobs)
    print(f"wrote {ico} ({os.path.getsize(ico)} bytes)")


if __name__ == "__main__":
    main()
