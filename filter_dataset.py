import pandas as pd

df = pd.read_csv("dataset/train.csv")

allowed = [
    "Common Cold",
    "Viral Fever",
    "Migraine",
    "Food Poisoning",
    "Gastritis",
    "Allergy",
    "Dengue",
    "Malaria",
    "Typhoid",
    "Arthritis"
]

df_filtered = df[df["prognosis"].isin(allowed)]

df_filtered.to_csv("dataset/filtered_train.csv", index=False)

print("Filtered dataset created successfully!")
print("Remaining diseases:", df_filtered["prognosis"].unique())