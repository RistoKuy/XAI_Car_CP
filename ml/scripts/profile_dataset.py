"""Profiling dataset CP: filter Bekas/Used, QC, cek redundansi KM_1/KM_2."""
import os
import pandas as pd

DATASET_PATH = os.getenv("DATASET_PATH", "./dataset.csv")
PROCESSED_DIR = "./data/processed"

df = pd.read_csv(DATASET_PATH)
print(f"rows={len(df)} cols={list(df.columns)}")
print("listing__type:", df["listing__type"].value_counts().to_dict())
print("missing:", int(df.isna().sum().sum()))
print(df[["year", "KM_1", "KM_2", "price"]].describe().to_string())
print("corr KM_1-KM_2:", round(float(df[["KM_1", "KM_2"]].corr().iloc[0, 1]), 6))
print("brand:", df["brand"].nunique(), "brand_type:", df["brand_type"].nunique(),
      "location:", df["location"].nunique(), "machine:", df["machine_type"].unique().tolist())

used = df[df["listing__type"].isin(["Bekas", "Used"])].copy()
print(f"filtered Bekas/Used: {len(used)} (drop Baru={len(df) - len(used)})")
os.makedirs(PROCESSED_DIR, exist_ok=True)
used.to_csv(f"{PROCESSED_DIR}/used_filtered.csv", index=False)
print(f"saved {PROCESSED_DIR}/used_filtered.csv")
