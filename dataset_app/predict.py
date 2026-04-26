import argparse
from collections import defaultdict
from ultralytics import YOLO

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="runs/detect/nmed_parasite/weights/best.pt")
    parser.add_argument("--image", required=True)
    parser.add_argument("--conf", type=float, default=0.35)
    args = parser.parse_args()

    model = YOLO(args.model)

    results = model.predict(
        source=args.image,
        conf=args.conf,
        save=True,
        save_txt=True,
        save_conf=True
    )

    class_names = model.names

    print("\nNatija:")
    found = False

    class_counts = defaultdict(int)
    class_conf = defaultdict(list)

    for result in results:
        if result.boxes is None:
            continue

        for box in result.boxes:
            found = True
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])

            class_counts[cls_id] += 1
            class_conf[cls_id].append(conf)

    if not found:
        print("Gijja tuxumi topilmadi.")
    else:
        for cls_id, count in class_counts.items():
            name = class_names[cls_id]
            max_conf = max(class_conf[cls_id])
            print(f"- {name}: {count} ta (conf={max_conf:.2f})")

        print("\n⚠️ Bu AI taxmini. Laboratoriya tasdig‘i kerak.")

    print("\nNatija saqlandi: runs/detect/predict*")

if __name__ == "__main__":
    main()