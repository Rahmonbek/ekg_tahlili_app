import argparse
from ultralytics import YOLO

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="data.yaml", help="data.yaml fayl yo‘li")
    parser.add_argument("--model", default="yolov8n.pt", help="Boshlang‘ich YOLO model")
    parser.add_argument("--epochs", type=int, default=50, help="Necha marta o‘qitish")
    parser.add_argument("--imgsz", type=int, default=640, help="Rasm o‘lchami")
    parser.add_argument("--batch", type=int, default=8, help="Batch size")
    args = parser.parse_args()

    model = YOLO(args.model)

    model.train(
        data=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        project="runs/detect",
        name="nmed_parasite",
        exist_ok=True
    )

    print("\n✅ Training tugadi.")
    print("Model fayl:")
    print("runs/detect/nmed_parasite/weights/best.pt")

if __name__ == "__main__":
    main()
