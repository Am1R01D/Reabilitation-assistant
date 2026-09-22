import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// Vercel's deployment filesystem is read-only. `/tmp` is writable for the
// lifetime of a function instance, which makes it suitable for the demo DB.
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'rehab-assist') : path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'rehab.db');

let db: DatabaseSync | null = null;

function initSchema(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('patient', 'doctor')),
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      doctor_id INTEGER NOT NULL,
      condition TEXT NOT NULL,
      start_date TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (doctor_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS check_ins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      pain REAL NOT NULL,
      swelling TEXT NOT NULL CHECK(swelling IN ('none', 'mild', 'severe')),
      mobility REAL NOT NULL,
      fatigue REAL NOT NULL,
      sleep_quality REAL NOT NULL,
      exercises_completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(patient_id, date),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS exercise_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      exercise_type TEXT NOT NULL,
      reps INTEGER NOT NULL,
      average_angle REAL NOT NULL,
      range_of_motion REAL NOT NULL,
      form_score REAL NOT NULL,
      duration REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high')),
      acknowledged INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS gemini_analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      summary TEXT NOT NULL,
      positive_trends TEXT NOT NULL,
      concerning_changes TEXT NOT NULL,
      adherence_summary TEXT NOT NULL,
      clinician_points TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS gamification (
      patient_id INTEGER PRIMARY KEY,
      recovery_streak INTEGER NOT NULL DEFAULT 0,
      exercise_streak INTEGER NOT NULL DEFAULT 0,
      weekly_goal INTEGER NOT NULL DEFAULT 5,
      weekly_completed INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );
  `);
}

function seedDemoData(database: DatabaseSync) {
  const count = database.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (count.count > 0) return;

  const passwordHash = bcrypt.hashSync('password123', 10);
  const addUser = database.prepare(
    'INSERT INTO users (email, name, role, password_hash) VALUES (?, ?, ?, ?)'
  );
  const doctor = addUser.run('dr.smith@clinic.com', 'Dr. Sarah Smith', 'doctor', passwordHash);
  const patient1 = addUser.run('john.doe@email.com', 'John Doe', 'patient', passwordHash);
  const patient2 = addUser.run('maria.garcia@email.com', 'Maria Garcia', 'patient', passwordHash);

  const addPatient = database.prepare(
    'INSERT INTO patients (user_id, doctor_id, condition, start_date) VALUES (?, ?, ?, ?)'
  );
  addPatient.run(patient1.lastInsertRowid, doctor.lastInsertRowid, 'Post-surgical shoulder rehabilitation', '2025-08-15');
  addPatient.run(patient2.lastInsertRowid, doctor.lastInsertRowid, 'Rotator cuff strain recovery', '2025-09-01');

  const addCheckIn = database.prepare(
    `INSERT INTO check_ins (patient_id, date, pain, swelling, mobility, fatigue, sleep_quality, exercises_completed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const row of [
    [1, '2025-09-10', 6, 'mild', 4, 5, 6, 1], [1, '2025-09-11', 5, 'mild', 5, 4, 7, 1],
    [1, '2025-09-12', 5, 'none', 5, 4, 7, 1], [1, '2025-09-13', 4, 'none', 6, 3, 8, 1],
    [1, '2025-09-14', 4, 'none', 6, 3, 7, 0], [1, '2025-09-15', 3, 'none', 7, 2, 8, 1],
    [1, '2025-09-16', 3, 'none', 7, 2, 8, 1], [1, '2025-09-17', 2, 'none', 8, 2, 9, 1],
    [2, '2025-09-14', 7, 'mild', 3, 6, 5, 0], [2, '2025-09-15', 7, 'mild', 3, 6, 5, 0],
    [2, '2025-09-16', 8, 'severe', 2, 7, 4, 0], [2, '2025-09-17', 8, 'mild', 3, 6, 5, 0],
  ]) addCheckIn.run(...row);

  const addSession = database.prepare(
    `INSERT INTO exercise_sessions (patient_id, exercise_type, reps, average_angle, range_of_motion, form_score, duration)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  for (const row of [
    [1, 'bicep_curl', 10, 85, 120, 78, 180], [1, 'bicep_curl', 12, 88, 125, 82, 200],
    [1, 'bicep_curl', 12, 90, 130, 85, 195], [1, 'bicep_curl', 15, 92, 135, 88, 210],
    [2, 'bicep_curl', 6, 70, 90, 55, 240], [2, 'bicep_curl', 5, 65, 85, 50, 250],
  ]) addSession.run(...row);

  database.prepare(
    'INSERT INTO gamification (patient_id, recovery_streak, exercise_streak, weekly_goal, weekly_completed) VALUES (?, ?, ?, ?, ?)'
  ).run(1, 5, 4, 5, 4);
  database.prepare(
    'INSERT INTO gamification (patient_id, recovery_streak, exercise_streak, weekly_goal, weekly_completed) VALUES (?, ?, ?, ?, ?)'
  ).run(2, 2, 0, 5, 2);
  database.prepare('INSERT INTO alerts (patient_id, type, message, severity) VALUES (?, ?, ?, ?)')
    .run(2, 'severe_swelling', 'Patient reported severe swelling during check-in. Clinician review recommended.', 'high');
  database.prepare('INSERT INTO alerts (patient_id, type, message, severity) VALUES (?, ?, ?, ?)')
    .run(2, 'pain_increase', 'Pain has increased over several consecutive check-ins. Clinician review recommended.', 'medium');
}

export function getDb(): DatabaseSync {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    initSchema(db);
    if (process.env.VERCEL && process.env.SEED_DEMO_DATA !== 'false') {
      seedDemoData(db);
    }
  }
  return db;
}
