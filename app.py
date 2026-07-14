from flask import Flask, render_template, request, redirect, url_for, session, jsonify, get_flashed_messages
from flask_cors import CORS
from flask_mysqldb import MySQL
import pickle
import numpy as np
import json
from flask import flash
import os
import base64
import hashlib
import hmac
import time
import re
from pathlib import Path
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
try:
    import bcrypt
    _BCRYPT_AVAILABLE = True
except Exception:
    bcrypt = None
    _BCRYPT_AVAILABLE = False

disease_info = {

"Flu":{
"description":"Viral infection affecting respiratory system.",
"precautions":["Drink plenty of fluids","Take proper rest","Consult doctor if needed"],
"doctor":"General Physician"
},

"Dengue":{
"description":"Mosquito-borne viral infection causing high fever.",
"precautions":["Stay hydrated","Avoid mosquito bites","Consult doctor"],
"doctor":"Infectious Disease Specialist"
},

"Migraine":{
"description":"Severe headache condition.",
"precautions":["Avoid stress","Sleep properly","Avoid bright light"],
"doctor":"Neurologist"
},

"Hypertension":{
"description":"High blood pressure condition.",
"precautions":["Reduce salt intake","Exercise regularly","Monitor BP"],
"doctor":"Cardiologist"
},

"Acne":{
"description":"Skin condition due to clogged pores.",
"precautions":["Keep skin clean","Avoid oily products","Use medicated creams"],
"doctor":"Dermatologist"
}

}

app = Flask(__name__)
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

app.secret_key = os.getenv("SECRET_KEY", "dev-only-secret-key")
CORS(app)

UPLOAD_FOLDER = str(BASE_DIR / 'static' / 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
# ---------------- MYSQL CONFIG ----------------
app.config['MYSQL_HOST'] = os.getenv('MYSQL_HOST', 'localhost')
app.config['MYSQL_USER'] = os.getenv('MYSQL_USER', 'root')
app.config['MYSQL_PASSWORD'] = os.getenv('MYSQL_PASSWORD', '4141')
app.config['MYSQL_DB'] = os.getenv('MYSQL_DB', 'disease_prediction')
app.config['MYSQL_PORT'] = int(os.getenv('MYSQL_PORT', '3306'))

mysql = MySQL(app)

# ---------------- CHATBOT CONFIG ----------------
CHAT_TOKEN_TTL_SECONDS = int(os.getenv("CHATBOT_TOKEN_TTL_SECONDS", 60 * 60 * 24 * 7))
CHAT_MAX_MESSAGE_CHARS = int(os.getenv("CHATBOT_MAX_MESSAGE_CHARS", 1000))
CHAT_LOCAL_LLM_URL = os.getenv("LOCAL_LLM_URL", "").strip()
CHAT_OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
CHAT_OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()

# ---------------- DB INIT ----------------
def ensure_tables():
    cursor = mysql.connection.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100),
            email VARCHAR(100) UNIQUE,
            password VARCHAR(255)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            symptoms TEXT,
            prediction VARCHAR(100),
            confidence FLOAT,
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            symptoms TEXT,
            prediction VARCHAR(100),
            confidence FLOAT,
            risk_level VARCHAR(20),
            top_predictions TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_activity (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            action VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS disease_info (
            id INT AUTO_INCREMENT PRIMARY KEY,
            disease_name VARCHAR(100) UNIQUE,
            description TEXT,
            precautions TEXT,
            treatment TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            message TEXT,
            response TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    # Ensure newer columns exist on older predictions table
    cursor.execute("SHOW COLUMNS FROM predictions")
    existing_columns = {row[0] for row in cursor.fetchall()}
    columns_to_ensure = {
        "prediction": "ALTER TABLE predictions ADD COLUMN prediction VARCHAR(100)",
        "confidence": "ALTER TABLE predictions ADD COLUMN confidence FLOAT",
        "risk_level": "ALTER TABLE predictions ADD COLUMN risk_level VARCHAR(20)",
        "top_predictions": "ALTER TABLE predictions ADD COLUMN top_predictions TEXT",
        "created_at": "ALTER TABLE predictions ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
    }
    if "disease" in existing_columns:
        columns_to_ensure.pop("prediction", None)
    for column, alter_sql in columns_to_ensure.items():
        cursor.execute("SHOW COLUMNS FROM predictions LIKE %s", (column,))
        if cursor.fetchone() is None:
            cursor.execute(alter_sql)
    mysql.connection.commit()
    cursor.close()


# ---------------- LOAD MODEL ----------------
with open(BASE_DIR / "models" / "model.pkl", "rb") as model_file:
    model = pickle.load(model_file)
with open(BASE_DIR / "models" / "features.pkl", "rb") as features_file:
    features = pickle.load(features_file)


def build_feature_vector(symptom_list):
    vector = [0] * len(features)
    symptom_set = set(symptom_list or [])
    for idx, symptom in enumerate(features):
        if symptom in symptom_set:
            vector[idx] = 1
    return np.array([vector])


def get_prediction_results(symptom_list):
    X = build_feature_vector(symptom_list)
    results = []
    probabilities = []
    diseases = []
    prediction = None
    confidence = 0.0

    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(X)[0]
        classes = list(getattr(model, "classes_", [])) or [str(i) for i in range(len(probs))]
        scored = sorted(zip(classes, probs), key=lambda x: x[1], reverse=True)
        results = [(name, round(score * 100, 2)) for name, score in scored]
    else:
        pred = model.predict(X)[0]
        results = [(pred, 100.0)]

    if results:
        prediction = results[0][0]
        confidence = results[0][1]
        diseases = [item[0] for item in results]
        probabilities = [item[1] for item in results]

    info = disease_info.get(prediction, {
        "description": "No information available.",
        "precautions": [],
        "doctor": "General Physician"
    })

    return prediction, confidence, results, diseases, probabilities, info


def normalize_top_results(results, top_n=3):
    if not results:
        return []
    top_results = results[:top_n]
    total = sum(score for _, score in top_results if isinstance(score, (int, float)) and score > 0)
    if total <= 0:
        return []
    normalized = []
    for disease, score in top_results:
        normalized_score = round((score / total) * 100, 2)
        normalized.append((disease, normalized_score))
    return normalized


def fetch_disease_info(disease_name):
    try:
        cursor = mysql.connection.cursor()
        cursor.execute(
            "SELECT description, precautions, treatment FROM disease_info WHERE disease_name=%s",
            (disease_name,)
        )
        row = cursor.fetchone()
        cursor.close()
        if not row:
            return None
    except Exception:
        return None
    precautions_raw = row[1] if row[1] is not None else ""
    precautions_list = []
    if isinstance(precautions_raw, (bytes, bytearray)):
        precautions_raw = precautions_raw.decode("utf-8")
    if isinstance(precautions_raw, str):
        try:
            parsed = json.loads(precautions_raw)
            if isinstance(parsed, list):
                precautions_list = parsed
            else:
                precautions_list = [item.strip() for item in precautions_raw.split(",") if item.strip()]
        except Exception:
            precautions_list = [item.strip() for item in precautions_raw.split(",") if item.strip()]

    return {
        "description": row[0] or "",
        "precautions": precautions_list,
        "treatment": row[2] or ""
    }


USER_NAME_COLUMN = None
PREDICTION_COLUMN = None


def resolve_user_name_column():
    global USER_NAME_COLUMN
    if USER_NAME_COLUMN is not None:
        return USER_NAME_COLUMN
    try:
        cursor = mysql.connection.cursor()
        cursor.execute("SHOW COLUMNS FROM users")
        columns = [row[0] for row in cursor.fetchall()]
        cursor.close()
    except Exception:
        USER_NAME_COLUMN = None
        return USER_NAME_COLUMN

    if "full_name" in columns:
        USER_NAME_COLUMN = "full_name"
    elif "name" in columns:
        USER_NAME_COLUMN = "name"
    else:
        USER_NAME_COLUMN = None
    return USER_NAME_COLUMN


def resolve_prediction_column():
    global PREDICTION_COLUMN
    if PREDICTION_COLUMN is not None:
        return PREDICTION_COLUMN
    try:
        cursor = mysql.connection.cursor()
        cursor.execute("SHOW COLUMNS FROM predictions")
        columns = [row[0] for row in cursor.fetchall()]
        cursor.close()
    except Exception:
        PREDICTION_COLUMN = "prediction"
        return PREDICTION_COLUMN

    if "disease" in columns:
        PREDICTION_COLUMN = "disease"
    elif "prediction" in columns:
        PREDICTION_COLUMN = "prediction"
    else:
        PREDICTION_COLUMN = "prediction"
    return PREDICTION_COLUMN


def resolve_request_user_id(payload=None):
    payload = payload or {}
    session_user_id = session.get('user_id')
    if session_user_id:
        return session_user_id, None

    payload_user_id = payload.get('user_id')
    if not payload_user_id:
        return None, "user_id required"
    try:
        payload_user_id = int(payload_user_id)
    except (TypeError, ValueError):
        return None, "user_id must be an integer"

    try:
        cursor = mysql.connection.cursor()
        cursor.execute("SELECT id FROM users WHERE id=%s", (payload_user_id,))
        row = cursor.fetchone()
        cursor.close()
    except Exception:
        return None, "Unable to verify user_id"
    if not row:
        return None, "Invalid user_id"
    return payload_user_id, None


def require_user_access(target_user_id):
    requester_id = session.get('user_id')
    if not requester_id:
        return None, ("Unauthorized", 401)
    if requester_id == target_user_id or is_admin_user(requester_id):
        return requester_id, None
    return requester_id, ("Forbidden", 403)

def is_admin_user(user_id):
    if not user_id:
        return False
    try:
        cursor = mysql.connection.cursor()
        cursor.execute("SELECT id, email FROM users WHERE id=%s", (user_id,))
        row = cursor.fetchone()
        cursor.close()
    except Exception:
        return False
    if not row:
        return False
    email = (row[1] or "").lower()
    if row[0] == 1:
        return True
    if email.startswith("admin@") or email.endswith("@admin.com") or "+admin" in email:
        return True
    return False


def _jwt_b64url_encode(data_bytes):
    return base64.urlsafe_b64encode(data_bytes).rstrip(b'=').decode('utf-8')


def _jwt_b64url_decode(data_str):
    padding = '=' * (-len(data_str) % 4)
    return base64.urlsafe_b64decode(data_str + padding)


def create_auth_token(user_id):
    secret = (app.secret_key or '').encode('utf-8')
    if not secret:
        return None
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": int(user_id),
        "exp": int(time.time()) + CHAT_TOKEN_TTL_SECONDS
    }
    header_b64 = _jwt_b64url_encode(json.dumps(header, separators=(',', ':')).encode('utf-8'))
    payload_b64 = _jwt_b64url_encode(json.dumps(payload, separators=(',', ':')).encode('utf-8'))
    signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    signature = hmac.new(secret, signing_input, hashlib.sha256).digest()
    signature_b64 = _jwt_b64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{signature_b64}"


def verify_auth_token(token):
    if not token:
        return None
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        header_b64, payload_b64, signature_b64 = parts
        secret = (app.secret_key or '').encode('utf-8')
        if not secret:
            return None
        signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_sig = hmac.new(secret, signing_input, hashlib.sha256).digest()
        provided_sig = _jwt_b64url_decode(signature_b64)
        if not hmac.compare_digest(expected_sig, provided_sig):
            return None
        payload = json.loads(_jwt_b64url_decode(payload_b64).decode('utf-8'))
        exp = int(payload.get("exp", 0))
        if exp and time.time() > exp:
            return None
        return int(payload.get("sub", 0)) or None
    except Exception:
        return None


def record_user_activity(user_id, action):
    if not user_id:
        return
    try:
        cursor = mysql.connection.cursor()
        cursor.execute(
            "INSERT INTO user_activity(user_id, action) VALUES(%s, %s)",
            (user_id, action)
        )
        mysql.connection.commit()
        cursor.close()
    except Exception:
        pass


def is_health_related(message):
    text = (message or "").lower()
    keywords = [
        "health", "symptom", "pain", "fever", "cough", "cold", "flu", "headache", "nausea",
        "vomit", "diarrhea", "dizzy", "fatigue", "rash", "infection", "blood pressure",
        "bp", "heart", "breathing", "asthma", "diabetes", "cholesterol", "medicine",
        "medication", "dose", "tablet", "pill", "treatment", "exercise", "diet", "sleep",
        "stress", "anxiety", "injury", "wound", "allergy", "pregnancy", "period", "menstrual",
        "skin", "burn", "itch", "swelling", "migraine"
    ]
    return any(keyword in text for keyword in keywords)


def build_chat_prompt():
    return (
        "You are a professional healthcare assistant.\n"
        "Answer clearly in simple language.\n"
        "Always include:\n"
        "* Explanation\n"
        "* Possible causes\n"
        "* Advice\n"
        "* Warning (if serious)\n"
        "Do not provide a final diagnosis. Keep the response helpful, calm, and practical."
    )


def build_structured_reply(explanation, causes, advice, warning):
    return (
        f"Explanation: {explanation}\n\n"
        f"Causes: {causes}\n\n"
        f"Advice: {advice}\n\n"
        f"Warning: {warning}"
    )


def ensure_structured_reply(reply_text, default_reply=None):
    if not reply_text:
        return default_reply
    text = str(reply_text).strip()
    if not text:
        return default_reply
    if all(label in text for label in ("Explanation:", "Causes:", "Advice:", "Warning:")):
        return text
    return build_structured_reply(
        text,
        "Many health concerns can have several possible causes, including infection, inflammation, lifestyle factors, stress, dehydration, or a chronic condition.",
        "Rest, stay hydrated, track your symptoms, and speak with a clinician if the issue continues or affects daily life.",
        "If symptoms are sudden, severe, worsening, or include trouble breathing, chest pain, confusion, fainting, or weakness, seek urgent medical care."
    )


def _matches_any(text, phrases):
    return any(phrase in text for phrase in phrases)


def _health_reply_from_rules(message):
    text = (message or "").lower()
    compact = re.sub(r"\s+", " ", text).strip()

    if _matches_any(compact, [
        "chest pain", "shortness of breath", "difficulty breathing", "trouble breathing",
        "one sided weakness", "one-sided weakness", "face drooping", "fainting",
        "severe bleeding", "cannot breathe", "blue lips", "seizure", "stroke"
    ]):
        return build_structured_reply(
            "Your symptoms could be a medical emergency and should be treated seriously.",
            "Possible causes include heart, lung, neurological, or severe allergic problems.",
            "Call emergency services or go to the nearest emergency department now. Do not drive yourself if you feel faint or short of breath.",
            "Seek immediate urgent care, especially if chest pain, breathing trouble, confusion, blue lips, or weakness is present."
        )

    if _matches_any(compact, ["fever", "high temperature", "temperature", "chills", "body ache", "body aches"]):
        return build_structured_reply(
            "Fever usually means the body is reacting to an infection or inflammation.",
            "Common causes include viral infections, bacterial infections, dehydration, heat exposure, or inflammatory illness.",
            "Drink plenty of fluids, rest, monitor your temperature, and consider paracetamol/acetaminophen if you normally can take it safely. See a doctor if the fever lasts more than 3 days or keeps returning.",
            "Get urgent care if the fever is very high, you have trouble breathing, a stiff neck, confusion, severe dehydration, a rash, or chest pain."
        )

    if _matches_any(compact, ["diabetes", "blood sugar", "sugar level", "glucose"]):
        return build_structured_reply(
            "Diabetes is a condition where blood sugar stays too high because the body does not use insulin properly.",
            "It can be linked to genetics, weight gain, low physical activity, diet patterns, insulin resistance, or damage to the pancreas.",
            "Focus on balanced meals, reduce sugary drinks, stay active, check blood sugar if advised, and follow your clinician's treatment plan carefully.",
            "Seek medical help urgently if you have vomiting, extreme thirst, confusion, very high blood sugar, rapid breathing, or signs of low blood sugar such as shaking or sweating."
        )

    if _matches_any(compact, ["immunity", "immune", "immunity boost", "low immunity"]):
        return build_structured_reply(
            "A strong immune system depends on nutrition, sleep, movement, and managing stress.",
            "Poor diet, lack of sleep, chronic stress, smoking, dehydration, and some medical conditions can weaken immunity.",
            "Eat protein-rich foods, fruits, vegetables, and whole grains; sleep 7 to 9 hours; exercise regularly; stay hydrated; and keep vaccinations up to date.",
            "If you get frequent infections, unexplained weight loss, or prolonged fatigue, speak with a doctor for evaluation."
        )

    if _matches_any(compact, ["headache", "migraine", "head pain"]):
        return build_structured_reply(
            "Headaches are common and can happen for many reasons, from simple tension to more specific medical issues.",
            "Possible causes include dehydration, stress, lack of sleep, eye strain, sinus problems, migraine, fever, or high blood pressure.",
            "Drink water, rest in a quiet room, reduce screen time, and notice triggers like skipped meals or poor sleep. If headaches keep coming back, get checked by a clinician.",
            "Seek urgent care for a sudden severe headache, headache after injury, weakness, speech trouble, vision loss, fever with neck stiffness, or a headache that is much worse than usual."
        )

    if _matches_any(compact, ["cold", "cough", "sore throat", "runny nose", "flu", "congestion"]):
        return build_structured_reply(
            "A cold or cough is often caused by a mild respiratory infection or irritation in the airways.",
            "Common causes include viral infection, allergies, post-nasal drip, dust, smoke, or sinus irritation.",
            "Rest, drink warm fluids, use honey if appropriate, avoid smoking, and consider saline gargles or steam for comfort. Watch how long it lasts.",
            "See a doctor urgently if there is trouble breathing, chest pain, high fever, wheezing, coughing blood, or symptoms lasting longer than about 10 to 14 days."
        )

    if _matches_any(compact, ["stress", "anxiety", "panic", "overwhelmed", "mental health"]):
        return build_structured_reply(
            "Stress and anxiety can affect sleep, concentration, mood, and the body.",
            "Common causes include work pressure, personal problems, poor sleep, health worries, or ongoing emotional strain.",
            "Try slow breathing, regular exercise, sleep routines, limiting caffeine, and talking to someone you trust. If it is ongoing, a counselor or doctor can help with a proper plan.",
            "Seek urgent help if you have thoughts of self-harm, chest pain with panic symptoms, severe panic attacks, or you feel unable to stay safe."
        )

    if _matches_any(compact, ["stomach pain", "abdominal pain", "belly pain", "vomit", "vomiting", "diarrhea", "nausea", "indigestion"]):
        return build_structured_reply(
            "Stomach or digestive symptoms are often related to food, infection, or irritation in the gut.",
            "Possible causes include indigestion, stomach infection, food poisoning, acid reflux, constipation, or dehydration.",
            "Sip fluids, eat bland foods if tolerated, avoid heavy or greasy meals, and rest. If symptoms persist, get medical advice.",
            "Seek urgent care for severe pain, blood in vomit or stool, dehydration, black stools, a swollen abdomen, or pain with fever that is getting worse."
        )

    if _matches_any(compact, ["blood pressure", "hypertension", "bp"]):
        return build_structured_reply(
            "Blood pressure problems can increase strain on the heart, brain, and kidneys.",
            "They can be influenced by salt intake, weight, stress, inactivity, family history, kidney disease, or other health conditions.",
            "Reduce salt, stay active, manage weight, limit alcohol, and take prescribed medicines consistently. Home BP monitoring can also help track trends.",
            "Seek urgent care for a very high reading with chest pain, severe headache, shortness of breath, confusion, or weakness."
        )

    if _matches_any(compact, ["rash", "itch", "itching", "skin", "allergy", "swelling", "burn"]):
        return build_structured_reply(
            "Skin symptoms often come from irritation, allergy, infection, or inflammation.",
            "Possible causes include allergic reactions, eczema, fungal infection, heat rash, insect bites, or contact with an irritant.",
            "Avoid scratching, keep the area clean, use gentle skin care, and identify any new products or foods that may have triggered it. If needed, a clinician can suggest the right treatment.",
            "Get urgent help if there is swelling of the lips or face, trouble breathing, a rapidly spreading rash, blisters, or signs of infection like pus and fever."
        )

    return build_structured_reply(
        "Based on your question, this may be related to general health or wellness.",
        "It could involve lifestyle factors such as diet, sleep, hydration, stress, activity level, or an underlying medical condition.",
        "Maintain a balanced diet, stay hydrated, exercise regularly, rest well, and share more details such as symptoms, duration, severity, age, and any medicines you are taking.",
        "If you have chest pain, breathing trouble, fainting, severe pain, sudden worsening, or another alarming symptom, please seek urgent medical care."
    )


def get_recent_chat_context(user_id, limit=3):
    if not user_id:
        return []
    try:
        cursor = mysql.connection.cursor()
        cursor.execute(
            """
            SELECT message, response
            FROM chat_history
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (user_id, limit)
        )
        rows = cursor.fetchall()
        cursor.close()
    except Exception:
        return []

    context_messages = []
    for message, response in reversed(rows or []):
        if message:
            context_messages.append({"role": "user", "content": message})
        if response:
            context_messages.append({"role": "assistant", "content": response})
    return context_messages


def call_local_llm(system_prompt, user_message):
    if not CHAT_LOCAL_LLM_URL:
        return None
    try:
        import requests
        response = requests.post(
            CHAT_LOCAL_LLM_URL,
            json={"prompt": system_prompt, "message": user_message},
            timeout=20
        )
        if not response.ok:
            return None
        payload = response.json()
        return payload.get("reply") or payload.get("response") or payload.get("text")
    except Exception:
        return None


def call_openai_chat(system_prompt, messages):
    if not CHAT_OPENAI_API_KEY:
        return None
    try:
        from openai import OpenAI
        client = OpenAI(api_key=CHAT_OPENAI_API_KEY)
        payload_messages = [{"role": "system", "content": system_prompt}]
        payload_messages.extend(messages or [])
        response = client.chat.completions.create(
            model=CHAT_OPENAI_MODEL,
            messages=payload_messages,
            temperature=0.2,
            max_tokens=420
        )
        return response.choices[0].message.content
    except Exception:
        return None


def generate_chat_reply(message, user_id=None):
    safe_message = (message or "").strip()
    fallback_reply = _health_reply_from_rules(safe_message)
    if not safe_message:
        return fallback_reply
    if len(safe_message) > CHAT_MAX_MESSAGE_CHARS:
        safe_message = safe_message[:CHAT_MAX_MESSAGE_CHARS]

    system_prompt = build_chat_prompt()
    history_messages = get_recent_chat_context(user_id, limit=3)
    messages = history_messages + [{"role": "user", "content": safe_message}]

    reply = call_openai_chat(system_prompt, messages)
    if reply:
        return ensure_structured_reply(reply, default_reply=fallback_reply)

    return fallback_reply


def verify_password(stored_password, provided_password, email=None, source=""):
    stored_text = stored_password.decode('utf-8') if isinstance(stored_password, (bytes, bytearray)) else str(stored_password or '')
    password_len = len(provided_password or '')
    if stored_text.startswith(('$2a$', '$2b$', '$2y$')):
        hash_type = 'bcrypt'
    else:
        hash_type = stored_text.split('$', 1)[0] if '$' in stored_text else 'unknown'

    app.logger.info("Auth check %s email=%s hash_type=%s password_len=%s", source, email, hash_type, password_len)

    is_valid = False
    try:
        is_valid = check_password_hash(stored_text, provided_password)
    except Exception as exc:
        app.logger.warning("Auth check %s email=%s check_password_hash failed: %s", source, email, exc)

    if not is_valid and stored_text.startswith(('$2a$', '$2b$', '$2y$')) and _BCRYPT_AVAILABLE:
        try:
            is_valid = bcrypt.checkpw((provided_password or '').encode('utf-8'), stored_text.encode('utf-8'))
        except Exception as exc:
            app.logger.warning("Auth check %s email=%s bcrypt failed: %s", source, email, exc)

    app.logger.info("Auth result %s email=%s ok=%s", source, email, is_valid)
    return is_valid

# ----------- CATEGORY LOGIC -----------
# ----------- ADVANCED CATEGORY LOGIC -----------

category_keywords = {
    "Fever & Infection": ['fever', 'chills', 'sweating', 'infection'],
    "Pain & Body Issues": ['pain', 'headache', 'joint', 'muscle', 'cramps', 'back'],
    "Digestive Issues": ['vomit', 'nausea', 'stomach', 'abdominal', 'indigestion', 'constipation', 'diarrhea'],
    "Respiratory Issues": ['cough', 'breath', 'throat', 'phlegm', 'sneeze', 'congestion'],
    "Skin Problems": ['rash', 'itching', 'skin', 'blister', 'redness'],
    "Neurological Issues": ['dizziness', 'confusion', 'weakness', 'fatigue', 'blurred', 'vision'],
    "Urinary Issues": ['urine', 'urinary', 'bladder'],
    "Heart & Circulation": ['heart', 'chest', 'pulse', 'blood', 'pressure']
}

categories = {category: [] for category in category_keywords}
categories["Other Symptoms"] = []

for feature in features:
    placed = False

    for category, keywords in category_keywords.items():
        if any(keyword in feature for keyword in keywords):
            categories[category].append(feature)
            placed = True
            break

    if not placed:
        categories["Other Symptoms"].append(feature)

        
# ---------------- HOME ----------------
@app.route('/')
def home():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('predict_page'))

# ---------------- REGISTER ----------------
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':

        name = (request.form.get('name') or '').strip()
        email = (request.form.get('email') or '').strip().lower()
        password = request.form.get('password') or ''

        if not name or not email or not password:
            flash("Enter valid credentials", "danger")
            return render_template("register.html")

        cur = mysql.connection.cursor()

        # Check if email already exists
        cur.execute("SELECT * FROM users WHERE email=%s", (email,))
        existing_user = cur.fetchone()

        if existing_user:
            flash("Email already registered", "danger")
            cur.close()
            return render_template("register.html")

        hashed_password = generate_password_hash(password)

        cur.execute(
            "INSERT INTO users(name,email,password) VALUES(%s,%s,%s)",
            (name, email, hashed_password)
        )
        mysql.connection.commit()
        cur.close()

        flash("Registration successful! Please login.", "success")
        return redirect(url_for('login'))

    return render_template("register.html")



# ---------------- LOGIN ----------------
# @app.route('/login', methods=['GET', 'POST'])
# def login():
#     if request.method == 'POST':

#         email = request.form.get('email')
#         password = request.form.get('password')

#         if not email or not password:
#             flash("Enter valid credentials", "danger")
#             return render_template("login.html")

#         cur = mysql.connection.cursor()
#         cur.execute("SELECT * FROM users WHERE email=%s", (email,))
#         user = cur.fetchone()
#         cur.close()

#         if user and bcrypt.checkpw(password.encode('utf-8'), user[3].encode('utf-8')):
#             session['user_id'] = user[0]
#             record_user_activity(user[0], 'login')
#             return redirect(url_for('dashboard'))
#         else:
#             flash("Enter valid credentials", "danger")

#     return render_template("login.html")

@app.route('/login', methods=['GET', 'POST'])
def login():

    if request.method == 'GET':
        return render_template("register.html")

    if request.method == 'POST':
        email = (request.form.get('email') or '').strip().lower()
        password = request.form.get('password') or ''

        cur = mysql.connection.cursor()
        cur.execute("SELECT * FROM users WHERE email=%s", (email,))
        user = cur.fetchone()
        cur.close()

        if not user:
            flash("Invalid credentials", "danger")
            return redirect(url_for('login'))

        stored_password = user[3]
        if verify_password(stored_password, password, email=email, source="form_login"):
            
            session['user_id'] = user[0]
            record_user_activity(user[0], 'login')   # session set
            
            return redirect(url_for('dashboard'))   # go to dashboard
        
        else:
            flash("Invalid credentials", "danger")
            return redirect(url_for('login'))

    return render_template("register.html")


@app.route('/logout')
def logout():
    if 'user_id' in session:
        record_user_activity(session.get('user_id'), 'logout')
    session.clear()
    return redirect(url_for('login'))

#---------------- History Page-----------------

@app.route('/history')
def history():

    if 'user_id' not in session:
        return redirect(url_for('login'))

    user_id = session['user_id']

    cursor = mysql.connection.cursor()

    cursor.execute("SELECT name FROM users WHERE id=%s", (user_id,))
    user_row = cursor.fetchone()
    user_name = user_row[0] if user_row else "Care Member"

    prediction_column = resolve_prediction_column()
    cursor.execute(
        f"""
        SELECT symptoms, {prediction_column} AS prediction, confidence, risk_level, created_at
        FROM predictions
        WHERE user_id = %s
        ORDER BY created_at DESC
        """,
        (user_id,)
    )

    history_rows = [
        {
            "symptoms": row[0],
            "disease": row[1],
            "model": row[2],
            "time": str(row[3])
        }
        for row in cursor.fetchall()
    ]

    page_state = {
        "data": {
            "history": history_rows
        },
        "meta": {
            "title": "History Timeline",
            "user": {
                "name": user_name
            }
        },
        "flash": get_flashed_messages(with_categories=True)
    }

    return render_template("history.html", page_state=page_state)

# ---------------- DASHBOARD ----------------
@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    user_id = session['user_id']
    cursor = mysql.connection.cursor()

    # Total predictions
    cursor.execute("SELECT COUNT(*) FROM predictions WHERE user_id=%s", (user_id,))
    total_predictions = cursor.fetchone()[0]

    # Most common disease
    prediction_column = resolve_prediction_column()
    cursor.execute(
        f"""
        SELECT {prediction_column} AS prediction, COUNT(*) as count
        FROM predictions
        WHERE user_id=%s
        GROUP BY {prediction_column}
        ORDER BY count DESC
        LIMIT 1
        """,
        (user_id,)
    )

    common = cursor.fetchone()
    most_common = common[0] if common else "N/A"

    # Chart data
    cursor.execute(
        f"""
        SELECT {prediction_column} AS prediction, COUNT(*)
        FROM predictions
        WHERE user_id=%s
        GROUP BY {prediction_column}
        """,
        (user_id,)
    )

    chart_data = cursor.fetchall()

    diseases = [row[0] for row in chart_data]
    counts = [row[1] for row in chart_data]

    cursor.execute("SELECT name FROM users WHERE id=%s", (user_id,))
    user_row = cursor.fetchone()
    user_name = user_row[0] if user_row else "Care Member"

    page_state = {
        "data": {
            "total": total_predictions,
            "mostCommon": most_common,
            "diseases": diseases,
            "counts": counts
        },
        "meta": {
            "title": "Dashboard Overview",
            "user": {
                "name": user_name
            }
        },
        "flash": get_flashed_messages(with_categories=True)
    }

    return render_template("dashboard.html", page_state=page_state)

# ---------------- PREDICT PAGE ----------------
@app.route('/predict')
@app.route('/predict_page')
def predict_page():
    user_name = None
    if 'user_id' in session:
        cursor = mysql.connection.cursor()
        cursor.execute("SELECT name FROM users WHERE id=%s", (session['user_id'],))
        user_row = cursor.fetchone()
        user_name = user_row[0] if user_row else None

    page_state = {
        "data": {
            "categories": categories
        },
        "meta": {
            "title": "Predict Disease",
            "user": {
                "name": user_name or "Care Member"
            }
        },
        "flash": get_flashed_messages(with_categories=True)
    }

    return render_template("predict.html", page_state=page_state)


@app.route('/result')
def result_page():
    payload = session.get('last_result')
    if not payload:
        return redirect(url_for('predict_page'))
    user_name = None
    if 'user_id' in session:
        cursor = mysql.connection.cursor()
        cursor.execute("SELECT name FROM users WHERE id=%s", (session['user_id'],))
        user_row = cursor.fetchone()
        user_name = user_row[0] if user_row else None
    return render_template(
        "result.html",
        results=payload.get("results", []),
        symptoms=payload.get("symptoms", []),
        diseases=payload.get("diseases", []),
        probabilities=payload.get("probabilities", []),
        info=payload.get("info", {}),
        user_name=user_name
    )


@app.route('/predict', methods=['POST'])
def predict():
    try:
        symptoms = [key for key in request.form.keys()]
        prediction, confidence, results, diseases, probabilities, info = get_prediction_results(symptoms)

        if 'user_id' in session:
            risk_level = "Low"
            if confidence > 70:
                risk_level = "High"
            elif confidence > 40:
                risk_level = "Medium"

            top_results = normalize_top_results(results)
            top_predictions_json = json.dumps(top_results)

            prediction_column = resolve_prediction_column()
            cursor = None
            try:
                cursor = mysql.connection.cursor()
                cursor.execute(
                    f"""
                    INSERT INTO predictions
                    (user_id, symptoms, {prediction_column}, confidence, risk_level, top_predictions)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (session['user_id'], json.dumps(symptoms), prediction, confidence, risk_level, top_predictions_json)
                )
                mysql.connection.commit()
                record_user_activity(session['user_id'], 'prediction')
            except Exception as exc:
                app.logger.exception("Failed to save prediction: %s", exc)
                flash("Prediction saved failed. Please try again.", "warning")
            finally:
                if cursor:
                    cursor.close()

        db_info = fetch_disease_info(prediction) or {}
        info = {
            "description": db_info.get("description") or info.get("description", ""),
            "precautions": db_info.get("precautions") or info.get("precautions", []),
            "treatment": db_info.get("treatment") or "",
            "doctor": info.get("doctor", "")
        }

        session['last_result'] = {
            "results": results,
            "symptoms": symptoms,
            "diseases": diseases,
            "probabilities": probabilities,
            "info": info
        }

        user_name = None
        if 'user_id' in session:
            cursor = mysql.connection.cursor()
            cursor.execute("SELECT name FROM users WHERE id=%s", (session['user_id'],))
            user_row = cursor.fetchone()
            user_name = user_row[0] if user_row else None

        return render_template(
            "result.html",
            results=results,
            symptoms=symptoms,
            diseases=diseases,
            probabilities=probabilities,
            info=info,
            user_name=user_name
        )
    except Exception as error:
        flash("Prediction failed. Please try again.", "danger")
        return redirect(url_for('predict_page'))

# ---------------- SYMPTOMS API ----------------
@app.route('/api/symptoms')
def api_symptoms():
    try:
        with open("symptom_categories.json", "r") as file:
            data = json.load(file)
        symptoms = [symptom for items in data.values() for symptom in items]
        return jsonify(symptoms)
    except Exception:
        return jsonify([])


@app.route('/api/predict', methods=['POST'])
def api_predict():
    try:
        payload = request.get_json(silent=True) or {}
        symptoms = payload.get('symptoms', [])
        if not isinstance(symptoms, list) or not symptoms:
            return jsonify({"error": "Symptoms list required"}), 400

        prediction, confidence, results, diseases, probabilities, info = get_prediction_results(symptoms)

        user_id, user_error = resolve_request_user_id(payload)
        if user_error:
            return jsonify({"error": user_error}), 400
        try:
            print("Predict insert:", user_id, prediction, confidence)
        except Exception:
            pass

        risk_level = "Low"
        if confidence > 70:
            risk_level = "High"
        elif confidence > 40:
            risk_level = "Medium"

        top_results = normalize_top_results(results)
        top_predictions_json = json.dumps(top_results)

        prediction_column = resolve_prediction_column()
        cursor = None
        try:
            cursor = mysql.connection.cursor()
            cursor.execute(
                f"""
                INSERT INTO predictions
                (user_id, symptoms, {prediction_column}, confidence, risk_level, top_predictions)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (user_id, json.dumps(symptoms), prediction, confidence, risk_level, top_predictions_json)
            )
            mysql.connection.commit()
        except Exception as exc:
            app.logger.exception("Prediction insert failed: %s", exc)
            return jsonify({"error": "Failed to save prediction"}), 500
        finally:
            if cursor:
                cursor.close()

        record_user_activity(user_id, 'prediction')

        db_info = fetch_disease_info(prediction) or {}
        info = {
            "description": db_info.get("description") or info.get("description", ""),
            "precautions": db_info.get("precautions") or info.get("precautions", []),
            "treatment": db_info.get("treatment") or "",
            "doctor": info.get("doctor", "")
        }

        response = {
            "prediction": prediction,
            "confidence": confidence,
            "risk_level": risk_level,
            "top_predictions": top_results,
            "results": results,
            "symptoms": symptoms,
            "diseases": diseases,
            "probabilities": probabilities,
            "info": info,
            "top_predictions": top_results
        }
        return jsonify(response)
    except Exception as error:
        return jsonify({"error": "Prediction failed"}), 500


@app.route('/api/chat', methods=['POST'])
def api_chat():
    print("Chat API called")
    payload = request.get_json(silent=True) or {}
    message = (payload.get("message") or "")
    print("Incoming message:", message)
    message = message.strip()

    user_id = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        user_id = verify_auth_token(token)
        if not user_id:
            return jsonify({"error": "Invalid or expired token"}), 401
    elif session.get("user_id"):
        user_id = session.get("user_id")
    elif payload.get("user_id"):
        resolved_user_id, user_error = resolve_request_user_id(payload)
        if user_error:
            return jsonify({"error": user_error}), 400
        user_id = resolved_user_id
    else:
        return jsonify({"error": "Unauthorized"}), 401

    if not message:
        reply = _health_reply_from_rules(message)
        return jsonify({"reply": reply})

    try:
        reply = generate_chat_reply(message, user_id=user_id)
        if not reply:
            reply = _health_reply_from_rules(message)
        print("User:", message)
        print("AI:", reply)
    except Exception as exc:
        print("Chat error:", str(exc))
        reply = _health_reply_from_rules(message)
        return jsonify({"reply": reply})

    try:
        cursor = mysql.connection.cursor()
        cursor.execute(
            "INSERT INTO chat_history(user_id, message, response) VALUES(%s, %s, %s)",
            (user_id, message, reply)
        )
        mysql.connection.commit()
        cursor.close()
    except Exception:
        pass

    return jsonify({"reply": reply})


@app.route('/api/dashboard')
def api_dashboard():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    user_id = session['user_id']
    cursor = mysql.connection.cursor()

    cursor.execute("SELECT COUNT(*) FROM predictions WHERE user_id=%s", (user_id,))
    total_predictions = cursor.fetchone()[0]

    prediction_column = resolve_prediction_column()
    cursor.execute(
        f"""
        SELECT {prediction_column} AS prediction, COUNT(*) as count
        FROM predictions
        WHERE user_id=%s
        GROUP BY {prediction_column}
        ORDER BY count DESC
        LIMIT 1
        """,
        (user_id,)
    )
    common = cursor.fetchone()
    most_common = common[0] if common else "N/A"

    cursor.execute(
        f"""
        SELECT {prediction_column} AS prediction, COUNT(*)
        FROM predictions
        WHERE user_id=%s
        GROUP BY {prediction_column}
        """,
        (user_id,)
    )
    chart_data = cursor.fetchall()

    diseases = [row[0] for row in chart_data]
    counts = [row[1] for row in chart_data]

    return jsonify({
        "total": total_predictions,
        "mostCommon": most_common,
        "diseases": diseases,
        "counts": counts
    })


@app.route('/api/history')
def api_history():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    user_id = session['user_id']
    cursor = mysql.connection.cursor()

    prediction_column = resolve_prediction_column()
    cursor.execute(
        f"""
        SELECT id, symptoms, {prediction_column} AS prediction, confidence, risk_level, top_predictions, created_at
        FROM predictions
        WHERE user_id = %s
        ORDER BY created_at DESC
        """,
        (user_id,)
    )

    history = cursor.fetchall()
    payload = [
        {
            "id": row[0],
            "symptoms": json.loads(row[1]) if row[1] else [],
            "prediction": row[2],
            "confidence": row[3],
            "risk_level": row[4],
            "top_predictions": json.loads(row[5]) if row[5] else [],
            "date": str(row[6])
        }
        for row in history
    ]

    return jsonify({"history": payload})


@app.route('/api/history/<int:user_id>')
def api_history_by_user(user_id):
    cursor = mysql.connection.cursor()
    prediction_column = resolve_prediction_column()
    cursor.execute(
        f"""
        SELECT id, symptoms, {prediction_column} AS prediction, confidence, risk_level, top_predictions, created_at
        FROM predictions
        WHERE user_id = %s
        ORDER BY created_at DESC
        """,
        (user_id,)
    )
    history = cursor.fetchall()
    payload = [
        {
            "id": row[0],
            "symptoms": json.loads(row[1]) if row[1] else [],
            "prediction": row[2],
            "confidence": row[3],
            "risk_level": row[4],
            "top_predictions": json.loads(row[5]) if row[5] else [],
            "date": str(row[6])
        }
        for row in history
    ]
    return jsonify({"history": payload})


@app.route('/api/history/<int:user_id>', methods=['DELETE'])
def api_history_delete(user_id):
    cursor = mysql.connection.cursor()
    cursor.execute("DELETE FROM predictions WHERE user_id = %s", (user_id,))
    deleted = cursor.rowcount
    mysql.connection.commit()
    cursor.close()
    return jsonify({"success": True, "deleted": deleted})


@app.route('/api/predictions/<int:user_id>', methods=['GET', 'DELETE'])
def api_predictions_by_user(user_id):
    try:
        if not user_id:
            return jsonify({"error": "user_id required"}), 400
        _, access_error = require_user_access(user_id)
        if access_error:
            message, status = access_error
            return jsonify({"error": message}), status
        if request.method == 'DELETE':
            cursor = mysql.connection.cursor()
            cursor.execute("DELETE FROM predictions WHERE user_id = %s", (user_id,))
            deleted = cursor.rowcount
            mysql.connection.commit()
            cursor.close()
            return jsonify({"success": True, "deleted": deleted})

        cursor = mysql.connection.cursor()
        prediction_column = resolve_prediction_column()
        cursor.execute(
            f"""
            SELECT id, symptoms, {prediction_column} AS prediction, confidence, risk_level, top_predictions, created_at
            FROM predictions
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (user_id,)
        )
        rows = cursor.fetchall()
        payload = [
            {
                "id": row[0],
                "symptoms": json.loads(row[1]) if row[1] else [],
                "prediction": row[2],
                "confidence": row[3],
                "risk_level": row[4],
                "top_predictions": json.loads(row[5]) if row[5] else [],
                "date": str(row[6])
            }
            for row in rows
        ]
        return jsonify({"predictions": payload})
    except Exception:
        return jsonify({"error": "Failed to load predictions"}), 500


@app.route('/api/predictions', methods=['GET'])
def api_predictions():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    user_id = session['user_id']
    prediction_column = resolve_prediction_column()
    cursor = mysql.connection.cursor()
    cursor.execute(
        f"""
        SELECT id, symptoms, {prediction_column} AS prediction, confidence, risk_level, top_predictions, created_at
        FROM predictions
        WHERE user_id = %s
        ORDER BY created_at DESC
        """,
        (user_id,)
    )
    rows = cursor.fetchall()
    cursor.close()
    payload = [
        {
            "id": row[0],
            "symptoms": json.loads(row[1]) if row[1] else [],
            "prediction": row[2],
            "confidence": row[3],
            "risk_level": row[4],
            "top_predictions": json.loads(row[5]) if row[5] else [],
            "date": str(row[6])
        }
        for row in rows
    ]
    return jsonify({"predictions": payload})


@app.route('/api/register', methods=['POST'])
def api_register():
    try:
        payload = request.get_json(silent=True) or {}
        name = (payload.get('name') or '').strip()
        email = (payload.get('email') or '').strip().lower()
        password = payload.get('password') or ''

        if not name or not email or not password:
            return jsonify({"error": "Name, email, and password are required"}), 400

        cur = mysql.connection.cursor()
        cur.execute("SELECT id FROM users WHERE email=%s", (email,))
        existing_user = cur.fetchone()
        if existing_user:
            cur.close()
            return jsonify({"error": "Email already registered"}), 409

        hashed_password = generate_password_hash(password)
        cur.execute(
            "INSERT INTO users(name,email,password) VALUES(%s,%s,%s)",
            (name, email, hashed_password)
        )
        mysql.connection.commit()
        cur.close()

        return jsonify({"success": True})
    except Exception as exc:
        app.logger.exception("Registration failed: %s", exc)
        return jsonify({"error": "Registration failed"}), 500


@app.route('/api/login', methods=['POST'])
def api_login():
    try:
        payload = request.get_json(silent=True) or {}
        email = (payload.get('email') or '').strip().lower()
        password = payload.get('password') or ''

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        cur = mysql.connection.cursor()
        cur.execute("SELECT id, name, email, password FROM users WHERE email=%s", (email,))
        user = cur.fetchone()
        cur.close()

        if not user:
            return jsonify({"error": "Invalid credentials"}), 401

        stored_password = user[3]
        app.logger.info("Login debug email=%s stored_password=%s entered_password=%s", email, stored_password, password)
        if not verify_password(stored_password, password, email=email, source="api_login"):
            return jsonify({"error": "Invalid credentials"}), 401

        session['user_id'] = user[0]
        record_user_activity(user[0], 'login')

        return jsonify({
            "id": user[0],
            "name": user[1],
            "email": user[2],
            "token": create_auth_token(user[0]),
            "token_type": "Bearer"
        })
    except Exception as exc:
        app.logger.exception("Login failed: %s", exc)
        return jsonify({"error": "Login failed"}), 500


@app.route('/api/logout', methods=['POST'])
def api_logout():
    payload = request.get_json(silent=True) or {}
    user_id = payload.get('user_id')
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    record_user_activity(user_id, 'logout')
    return jsonify({"success": True})


@app.route('/api/profile')
def api_profile():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    user_id = session['user_id']
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT name, email FROM users WHERE id=%s", (user_id,))
    user = cursor.fetchone()

    profile_pic = session.get('profile_pic', '')
    return jsonify({
        "user": {
            "full_name": user[0] if user else '',
            "email": user[1] if user else '',
            "age": '',
            "gender": '',
            "profile_pic": profile_pic
        }
    })


@app.route('/api/admin/overview')
def api_admin_overview():
    requester_id = request.args.get('user_id', type=int) or session.get('user_id')
    if not is_admin_user(requester_id):
        return jsonify({"error": "Unauthorized"}), 403

    cursor = mysql.connection.cursor()
    cursor.execute("SELECT COUNT(*) FROM users")
    total_users = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM predictions")
    total_predictions = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(DISTINCT user_id) FROM user_activity WHERE DATE(created_at) = CURDATE()")
    active_sessions = cursor.fetchone()[0]

    name_column = resolve_user_name_column()
    if name_column:
        cursor.execute(
            f"""
            SELECT ua.id, ua.action, ua.created_at, u.{name_column}, u.email
            FROM user_activity ua
            LEFT JOIN users u ON u.id = ua.user_id
            ORDER BY ua.created_at DESC
            LIMIT 8
            """
        )
    else:
        cursor.execute(
            """
            SELECT ua.id, ua.action, ua.created_at, NULL, u.email
            FROM user_activity ua
            LEFT JOIN users u ON u.id = ua.user_id
            ORDER BY ua.created_at DESC
            LIMIT 8
            """
        )
    recent_rows = cursor.fetchall()
    cursor.close()

    recent_activity = [
        {
            "id": row[0],
            "action": row[1],
            "created_at": str(row[2]),
            "user_name": row[3],
            "user_email": row[4]
        }
        for row in recent_rows
    ]

    return jsonify({
        "total_users": total_users,
        "total_predictions": total_predictions,
        "active_sessions": active_sessions,
        "recent_activity": recent_activity
    })


@app.route('/api/admin/users')
def api_admin_users():
    requester_id = request.args.get('user_id', type=int) or session.get('user_id')
    if not is_admin_user(requester_id):
        return jsonify({"error": "Unauthorized"}), 403

    name_column = resolve_user_name_column()
    cursor = mysql.connection.cursor()
    if name_column:
        cursor.execute(
            f"""
            SELECT u.id, u.{name_column}, u.email, COUNT(p.id) as prediction_count
            FROM users u
            LEFT JOIN predictions p ON p.user_id = u.id
            GROUP BY u.id
            ORDER BY u.id DESC
            """
        )
    else:
        cursor.execute(
            """
            SELECT u.id, NULL, u.email, COUNT(p.id) as prediction_count
            FROM users u
            LEFT JOIN predictions p ON p.user_id = u.id
            GROUP BY u.id
            ORDER BY u.id DESC
            """
        )
    rows = cursor.fetchall()
    cursor.close()

    payload = [
        {
            "id": row[0],
            "name": row[1],
            "email": row[2],
            "prediction_count": row[3]
        }
        for row in rows
    ]
    return jsonify({"users": payload})


@app.route('/api/admin/predictions')
def api_admin_predictions():
    requester_id = request.args.get('user_id', type=int) or session.get('user_id')
    if not is_admin_user(requester_id):
        return jsonify({"error": "Unauthorized"}), 403

    name_column = resolve_user_name_column()
    prediction_column = resolve_prediction_column()
    cursor = mysql.connection.cursor()
    if name_column:
        cursor.execute(
            f"""
            SELECT p.id, p.user_id, p.{prediction_column} AS prediction, p.confidence, p.created_at, u.{name_column}, u.email
            FROM predictions p
            LEFT JOIN users u ON u.id = p.user_id
            ORDER BY p.created_at DESC
            LIMIT 25
            """
        )
    else:
        cursor.execute(
            f"""
            SELECT p.id, p.user_id, p.{prediction_column} AS prediction, p.confidence, p.created_at, NULL, u.email
            FROM predictions p
            LEFT JOIN users u ON u.id = p.user_id
            ORDER BY p.created_at DESC
            LIMIT 25
            """
        )
    rows = cursor.fetchall()
    cursor.close()

    payload = [
        {
            "id": row[0],
            "user_id": row[1],
            "prediction": row[2],
            "confidence": row[3],
            "created_at": str(row[4]),
            "user_name": row[5],
            "user_email": row[6]
        }
        for row in rows
    ]
    return jsonify({"predictions": payload})


@app.route('/api/admin/users/<int:target_user_id>', methods=['DELETE'])
def api_admin_delete_user(target_user_id):
    requester_id = request.args.get('user_id', type=int) or session.get('user_id')
    if not is_admin_user(requester_id):
        return jsonify({"error": "Unauthorized"}), 403

    try:
        cursor = mysql.connection.cursor()
        cursor.execute("DELETE FROM user_activity WHERE user_id = %s", (target_user_id,))
        cursor.execute("DELETE FROM predictions WHERE user_id = %s", (target_user_id,))
        cursor.execute("DELETE FROM history WHERE user_id = %s", (target_user_id,))
        cursor.execute("DELETE FROM users WHERE id = %s", (target_user_id,))
        mysql.connection.commit()
        cursor.close()
        return jsonify({"success": True})
    except Exception:
        return jsonify({"error": "Unable to delete user"}), 500


# ---------------- RUN ----------------
# ---------------- UPDATE PROFILE ----------------
    
@app.route('/update_profile', methods=['POST'])
def update_profile():
    user_id = session['user_id']

    full_name = request.form.get('full_name', '')

    cursor = mysql.connection.cursor()
    cursor.execute("UPDATE users SET name=%s WHERE id=%s", (full_name, user_id))

    mysql.connection.commit()

    return redirect('/profile')

# ---------------- UPDATE PROFILE ----------------

@app.route('/upload_profile_pic', methods=['POST'])
def upload_profile_pic():
    file = request.files['profile_pic']

    if file:
        filename = file.filename
        path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(path)

        session['profile_pic'] = path

    return redirect('/profile')


@app.route('/profile')
def profile():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    user_id = session['user_id']
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT name, email FROM users WHERE id=%s", (user_id,))
    user = cursor.fetchone()

    profile_pic = session.get('profile_pic', '')
    user_tuple = (
        user[0] if user else '',
        user[1] if user else '',
        '',
        '',
        profile_pic
    )

    page_state = {
        "data": {
            "user": {
                "full_name": user_tuple[0],
                "email": user_tuple[1],
                "age": user_tuple[2],
                "gender": user_tuple[3],
                "profile_pic": user_tuple[4]
            }
        },
        "meta": {
            "title": "Profile & Preferences",
            "user": {
                "name": user_tuple[0] or "Care Member"
            }
        },
        "flash": get_flashed_messages(with_categories=True)
    }

    return render_template("profile.html", page_state=page_state)


# ---------------- RUN ----------------
if __name__ == "__main__":
    with app.app_context():
        ensure_tables()
    app.run(
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "0") == "1"
    )



