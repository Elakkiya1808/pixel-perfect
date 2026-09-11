-- AI Course Timetable — MySQL schema (WAMP / phpMyAdmin friendly)
CREATE DATABASE IF NOT EXISTS timetable_db CHARACTER SET utf8mb4;
USE timetable_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120),
  role ENUM('admin','faculty','student') NOT NULL,
  faculty_id INT NULL,
  department VARCHAR(40) NULL,
  section VARCHAR(10) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faculty (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  department VARCHAR(40) NOT NULL,
  email VARCHAR(120) NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_number VARCHAR(40) NOT NULL,
  room_type ENUM('Classroom','Lab') NOT NULL,
  capacity INT NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(160) NOT NULL,
  credit INT NOT NULL,
  required_hours INT NOT NULL,
  course_type ENUM('Theory','Lab') NOT NULL,
  faculty_id INT NULL,
  department VARCHAR(40) NOT NULL,
  section VARCHAR(10) NOT NULL,
  student_count INT NOT NULL DEFAULT 60,
  room_type ENUM('Classroom','Lab') NOT NULL,
  periods_per_week INT NOT NULL,
  max_periods_per_day INT NOT NULL,
  consecutive_block TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS semester_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  semester_name VARCHAR(80) NOT NULL,
  semester_start_date DATE NULL,
  semester_end_date DATE NULL,
  semester_months INT NOT NULL DEFAULT 5,
  teaching_weeks INT NOT NULL DEFAULT 20,
  period_duration_minutes INT NOT NULL DEFAULT 55
);

CREATE TABLE IF NOT EXISTS timetable (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  occurrence INT NOT NULL,
  day VARCHAR(12) NOT NULL,
  period INT NOT NULL,
  timing VARCHAR(40) NOT NULL,
  room_id INT NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS generation_runs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  initial_fitness DECIMAL(10,2) NOT NULL DEFAULT 0,
  optimized_fitness DECIMAL(10,2) NOT NULL DEFAULT 0,
  validation_score INT NOT NULL DEFAULT 0,
  hard_violations INT NOT NULL DEFAULT 0,
  soft_violations INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO semester_settings (semester_name, semester_months, teaching_weeks, period_duration_minutes)
SELECT 'Odd Semester 2025-26', 5, 20, 55
WHERE NOT EXISTS (SELECT 1 FROM semester_settings);
