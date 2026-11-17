#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BIRD-DEX 3 圖標產生器（零新依賴：純 stdlib zlib/struct）。

圖標概念：**精靈球 × 鳥** —— 紅白精靈球（＝捕捉），中心鈕內嵌鳥頭側影（＝雀），
16px 讀到球、32px+ 讀到鳥，一看就知道係「捕捉鳥類／精靈」。

產出（全部對應同一設計，坐標系 64×64，球直徑 59% ≤ maskable 66% 安全区）：
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

BG = (11, 15, 25)          # #0B0F19 app 背景
RED = (255, 59, 78)        # 球上半 #FF3B4E
WHITE = (242, 244, 248)    # 球下半 / 眼白 #F2F4F8
INK = (20, 22, 28)         # 帶 / 鈕環 / 鳥 #14161C

CX, CY, R = 32.0, 33.0, 19.0   # 球
BAND_TOP, BAND_BOT = 30.0, 36.0
BTN_R, MED_R = 7.5, 5.5        # 鈕環 / 白色獎章
HEAD_CX, HEAD_R = 30.8, 3.1    # 鳥頭
BEAK = ((33.0, 31.6), (36.9, 33.0), (33.0, 34.4))
EYE = (31.5, 32.1, 0.75)


def _in_tri(px, py, tri):
    (x1, y1), (x2, y2), (x3, y3) = tri
    d1 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2)
    d2 = (px - x3) * (y2 - y3) - (x2 - x3) * (py - y3)
    d3 = (px - x1) * (y3 - y1) - (x3 - x1) * (py - y1)
    neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
    pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
    return not (neg and pos)


def _in_round_rect(px, py, w, h, radius):
    if px < 0 or py < 0 or px >= w or py >= h:
        return False
    rx = min(px, w - 1 - px)
    ry = min(py, h - 1 - py)
    if rx >= radius or ry >= radius:
        return True
    return (radius - rx) ** 2 + (radius - ry) ** 2 <= radius * radius


def sample(x, y, rounded_bg):
    """(x, y) 係 64×64 座標系；rounded_bg=False 用於 PNG（全出血，maskable 要求）。"""
    if rounded_bg:
        if not _in_round_rect(x, y, 64, 64, 14):
            return None
    elif not (0 <= x < 64 and 0 <= y < 64):
        return None
    col = BG
    d = math.hypot(x - CX, y - CY)
    if d <= R:
        col = WHITE
        if y <= CY:
            col = RED
    if BAND_TOP <= y <= BAND_BOT and d <= R:
        col = INK
    bd = math.hypot(x - CX, y - CY)
    if bd <= BTN_R:
        col = INK
    if bd <= MED_R:
        col = WHITE
    if math.hypot(x - HEAD_CX, y - CY) <= HEAD_R:
        col = INK
    if _in_tri(x, y, BEAK):
        col = INK
    if math.hypot(x - EYE[0], y - EYE[1]) <= EYE[2]:
        col = WHITE
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
