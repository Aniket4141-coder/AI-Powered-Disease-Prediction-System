CREATE DATABASE disease_prediction;

USE disease_prediction;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    symptoms TEXT,
    prediction VARCHAR(100),
    confidence FLOAT,
    risk_level VARCHAR(20),
    top_predictions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE user_activity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE disease_info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    disease_name VARCHAR(100) UNIQUE,
    description TEXT,
    precautions TEXT,
    treatment TEXT
);

CREATE TABLE chat_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    message TEXT,
    response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

select * from users;
