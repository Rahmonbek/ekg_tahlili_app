"""plan.json dagi fayllarni bitta zip ga yig'adi (serverga bitta fayl bo'lib boradi).

Zip ichidagi yo'llar plan.json dagidek (`2025/Апрель/01,04/....xlsx`), UTF-8
nomlar bilan. Serverda: `python -m zipfile -e labs.zip labaratoriya/`.

Ishlatish: python pack.py <plan.json> <root> <out.zip>
"""
import json
import os
import sys
import zipfile


def main():
    plan_path, root, out = sys.argv[1], sys.argv[2], sys.argv[3]
    plan = json.load(open(plan_path, encoding="utf-8"))
    paths = sorted({f for p in plan for u in p["uploads"] for f in u["files"]})
    # xlsx allaqachon siqilgan — STORED tezroq va hajmi deyarli bir xil
    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_STORED, allowZip64=True) as z:
        for i, rel in enumerate(paths, 1):
            z.write(os.path.join(root, rel), arcname=rel)
            if i % 2000 == 0:
                print(f"{i}/{len(paths)}", flush=True)
    print(f"{len(paths)} fayl → {out} ({os.path.getsize(out) / 1024 / 1024:.0f} MB)")


if __name__ == "__main__":
    main()
