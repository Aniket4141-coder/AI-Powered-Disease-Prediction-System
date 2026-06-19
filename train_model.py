import pandas as pd
import pickle
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score

# Load dataset
df = pd.read_csv("dataset/large_disease_dataset.csv")
df = df.drop_duplicates()

X = df.drop("disease", axis=1)
y = df["disease"]

import numpy as np

X = X.copy()
X_np = X.values
mask = np.random.rand(*X_np.shape) < 0.05
X_np[mask] = 1 - X_np[mask]
X = pd.DataFrame(X_np, columns=X.columns)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

dt = DecisionTreeClassifier()
rf = RandomForestClassifier(
    n_estimators=80,
    max_depth=8,
    random_state=42
)

dt.fit(X_train, y_train)
rf.fit(X_train, y_train)

dt_acc = accuracy_score(y_test, dt.predict(X_test))
rf_acc = accuracy_score(y_test, rf.predict(X_test))

print("Decision Tree Accuracy:", dt_acc)
print("Random Forest Accuracy:", rf_acc)

best_model = rf if rf_acc > dt_acc else dt

pickle.dump(best_model, open("models/model.pkl", "wb"))
pickle.dump(list(X.columns), open("models/features.pkl", "wb"))

print("Model saved successfully!")
