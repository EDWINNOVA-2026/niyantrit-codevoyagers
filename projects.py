import csv
import json
from pathlib import Path

src = Path(r"D:\sinchu\niyantrit\niyantrit_projects_dataset_200.csv")
dst = src.with_suffix(".json")

with src.open(newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    rows = list(reader)  # list of dicts

with dst.open("w", encoding="utf-8") as f:
    json.dump(rows, f, ensure_ascii=False, indent=2)

print("saved", dst)
