```markdown
# 🏥 AI-Powered Disease Prediction System

An intelligent healthcare web application that predicts diseases based on user symptoms using Machine Learning and provides healthcare assistance through an AI-powered chatbot.

## 📌 Overview

The AI-Powered Disease Prediction System is designed to help users obtain preliminary health insights by analyzing symptoms and predicting possible diseases. The system uses a Random Forest Machine Learning model for disease prediction and integrates an AI Healthcare Chatbot for guidance and support.

This project combines Machine Learning, Artificial Intelligence, Web Development, and Database Management into a single healthcare platform.

---

## ✨ Features

### 👤 User Features
- User Registration and Login
- Secure Authentication
- Disease Prediction Based on Symptoms
- Prediction Result with Confidence Score
- AI Healthcare Chatbot
- Prediction History Management
- PDF Report Generation
- User Profile Management

### 🤖 Machine Learning Features
- Symptom-Based Disease Prediction
- Random Forest Classifier
- Data Preprocessing and Feature Encoding
- Fast and Accurate Predictions

### 📊 Additional Features
- Prediction History Storage
- MySQL Database Integration
- Responsive User Interface
- Healthcare Guidance System

---

## 🛠️ Technology Stack

### Frontend
- React.js
- Vite
- HTML5
- CSS3
- Bootstrap

### Backend
- Python
- Flask

### Database
- MySQL

### Machine Learning
- Scikit-Learn
- Random Forest Classifier
- Pandas
- NumPy

### AI Integration
- OpenAI API

### Development Tools
- Visual Studio Code
- Git & GitHub
- Postman

---

## 🏗️ System Architecture

```

User
│
▼
React Frontend
│
▼
Flask Backend
│
├── Random Forest Model
│
├── OpenAI Chatbot
│
▼
MySQL Database
│
▼
Result & PDF Report

````

---

## ⚙️ Installation

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/AI-Powered-Disease-Prediction-System.git
cd AI-Powered-Disease-Prediction-System
````

### 2️⃣ Create Virtual Environment

```bash
python -m venv venv
```

### 3️⃣ Activate Virtual Environment

#### Windows

```bash
venv\Scripts\activate
```

#### Linux / Mac

```bash
source venv/bin/activate
```

### 4️⃣ Install Dependencies

```bash
pip install -r requirements.txt
```

### 5️⃣ Configure Database

Create a MySQL database and update database credentials in the configuration file.

Example:

```python
MYSQL_HOST = "localhost"
MYSQL_USER = "root"
MYSQL_PASSWORD = "your_password"
MYSQL_DB = "disease_prediction"
```

### 6️⃣ Configure OpenAI API Key

Create a `.env` file:

```env
OPENAI_API_KEY=your_api_key
```

### 7️⃣ Run the Application

```bash
python app.py
```

Application will start at:

```
http://127.0.0.1:5000
```

---

## 📂 Project Modules

### Authentication Module

* Registration
* Login
* Logout
* Session Management

### Disease Prediction Module

* Symptom Selection
* Prediction Generation
* Confidence Score Calculation

### Chatbot Module

* AI-Powered Healthcare Assistant
* Health Guidance and Suggestions

### History Module

* Store Predictions
* View Previous Reports

### PDF Report Module

* Generate Downloadable Reports

---

## 📸 Screenshots

### Home Page

![Home Page](screenshots/home.png)

### Disease Prediction Page

![Prediction Page](screenshots/prediction.png)

### Result Page

![Result Page](screenshots/result.png)

### Chatbot Page

![Chatbot Page](screenshots/chatbot.png)

---

## 📈 Machine Learning Model

**Algorithm Used:** Random Forest Classifier

### Why Random Forest?

* High Accuracy
* Handles Large Datasets
* Reduces Overfitting
* Suitable for Classification Problems

---

## 🔮 Future Enhancements

* Support More Diseases
* Deep Learning-Based Prediction
* Doctor Appointment Booking
* Mobile Application
* Multilingual Support
* Cloud Deployment
* Real-Time Health Monitoring

---

## 🎓 Academic Information

**Project Title:** AI-Powered Disease Prediction System

**Course:** Master of Computer Applications (MCA)

**College:** Trinity Academy of Engineering, Pune

**University:** Savitribai Phule Pune University (SPPU)

**Academic Year:** 2025-2026

---

## 👨‍💻 Author

**Aniket Dubhashe**

MCA Student | Data Analyst | AI & Machine Learning Enthusiast

GitHub: https://github.com/Aniket4141-coder

LinkedIn: Add Your LinkedIn Profile Here

---

## 📜 License

This project is developed for educational and academic purposes.

---

⭐ If you found this project useful, please consider giving it a star on GitHub.

```
```
