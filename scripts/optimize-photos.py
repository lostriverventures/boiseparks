#!/usr/bin/env python3
"""Resize and re-encode the park hero photos in parks-photos/.

The Wikimedia Commons originals arrive at ~1280px and quality ~95, which is 3-5x
more than the site ever displays: the park-page hero renders in a max-w-4xl
column (896 CSS px) and the homepage cards are thumbnails. That made the photos
the LCP element on every park page that has one.

Not part of build.sh on purpose -- re-encoding a JPEG repeatedly loses quality
every pass. Files already at or below MAX_W are treated as done and skipped, so
running this twice is safe and only new drops get processed.

Usage: python3 scripts/optimize-photos.py [--dry-run]
"""
import glob
import os
import sys

from PIL import Image

MAX_W = 1000     # display width is 896 CSS px; 1000 leaves a little headroom
QUALITY = 75

def main():
    dry = '--dry-run' in sys.argv
    root = os.path.join(os.path.dirname(__file__), '..')
    files = sorted(glob.glob(os.path.join(root, 'parks-photos', '*.jpg')))
    before = after = skipped = 0

    for f in files:
        size = os.path.getsize(f)
        before += size
        with Image.open(f) as im:
            w, h = im.size
            if w <= MAX_W:
                skipped += 1
                after += size
                continue
            im = im.convert('RGB')
            im.thumbnail((MAX_W, MAX_W), Image.LANCZOS)
            if not dry:
                # No exif= argument, so camera metadata is dropped with the re-encode.
                im.save(f, 'JPEG', quality=QUALITY, optimize=True, progressive=True)
        new = os.path.getsize(f) if not dry else size
        after += new if not dry else 0
        print(f'  {os.path.basename(f):<48} {w}x{h} {size // 1024:>4}KB -> {new // 1024:>4}KB')

    print(f'\n{len(files)} photos, {skipped} already optimized (skipped)')
    if not dry:
        print(f'total {before / 1e6:.1f} MB -> {after / 1e6:.1f} MB '
              f'({100 - after / before * 100:.0f}% smaller)')

if __name__ == '__main__':
    main()
