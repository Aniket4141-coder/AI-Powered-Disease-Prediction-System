import pandas as pd
import numpy as np
import random

# -------------------------
# Symptoms list
# -------------------------
symptoms = [
"fever","high_fever","chills","cough","dry_cough","runny_nose","sore_throat",
"fatigue","body_pain","headache","dizziness","nausea","vomiting","abdominal_pain",
"diarrhea","constipation","chest_pain","shortness_of_breath","skin_rash",
"itching","joint_pain","muscle_pain","sweating","weight_loss","weight_gain",
"blurred_vision","frequent_urination","burning_urination","loss_of_appetite",
"back_pain","neck_pain","ear_pain","red_eyes","anxiety","insomnia",
"palpitations","dry_skin","hair_loss","swelling","cold_hands_feet",
"yellow_skin","yellow_eyes","bloody_stool","dark_urine","breathlessness",
"loss_of_smell","loss_of_taste","chest_tightness","fainting","confusion",
"memory_loss","tremors","numbness","tingling","cold_sweats",
"irritability","dehydration","weakness","rapid_heartbeat"
]

# -------------------------
# Disease list (expandable)
# -------------------------
disease_symptoms = {

"Flu":["fever","cough","body_pain","fatigue","chills"],

"Common Cold":["cough","runny_nose","sore_throat"],

"COVID19":["fever","dry_cough","fatigue","loss_of_smell"],

"Dengue":["high_fever","joint_pain","muscle_pain","headache","skin_rash"],

"Migraine":["headache","dizziness","nausea"],

"Food Poisoning":["vomiting","nausea","abdominal_pain","diarrhea"],

"Asthma":["shortness_of_breath","cough","chest_pain"],

"Bronchitis":["cough","fatigue","chest_pain"],

"Hypertension":["dizziness","fatigue","chest_pain"],

"Kidney Stones":["abdominal_pain","vomiting","back_pain"],

"Urinary Tract Infection":["burning_urination","frequent_urination"],

"Acne":["skin_rash","itching"],

"Psoriasis":["skin_rash","itching"],

"Eczema":["skin_rash","itching"],

"Arthritis":["joint_pain","muscle_pain"],

"Diabetes":["frequent_urination","weight_loss","fatigue"]

}

# -------------------------
# Rows to generate
# -------------------------
rows = 5000
data = []

for i in range(rows):

    disease = random.choice(list(disease_symptoms.keys()))

    base_symptoms = disease_symptoms[disease]

    row = []

    for s in symptoms:

        if s in base_symptoms:
            value = np.random.binomial(1,0.8)   # strong symptom
        else:
            value = np.random.binomial(1,0.05)  # rare symptom

        row.append(value)

    row.append(disease)

    data.append(row)

columns = symptoms + ["disease"]

df = pd.DataFrame(data,columns=columns)

df.to_csv("dataset/large_disease_dataset.csv",index=False)

print("Dataset generated successfully")