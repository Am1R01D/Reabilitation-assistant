import bcrypt from 'bcryptjs';
import { getDb } from '../src/lib/db';

async function seed() {
  const db = getDb();

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) {
    console.log('Database already seeded. Skipping.');
    return;
  }

  const passwordHash = await bcrypt.hash('password123', 10);

  const insertUser = db.prepare(
    'INSERT INTO users (email, name, role, password_hash) VALUES (?, ?, ?, ?)'
  );

  const doctor = insertUser.run('dr.smith@clinic.com', 'Dr. Sarah Smith', 'doctor', passwordHash);
  const patient1 = insertUser.run('john.doe@email.com', 'John Doe', 'patient', passwordHash);
  const patient2 = insertUser.run('maria.garcia@email.com', 'Maria Garcia', 'patient', passwordHash);

  const insertPatient = db.prepare(
    'INSERT INTO patients (user_id, doctor_id, condition, start_date) VALUES (?, ?, ?, ?)'
  );

  insertPatient.run(patient1.lastInsertRowid, doctor.lastInsertRowid, 'Post-surgical shoulder rehabilitation', '2025-08-15');
  insertPatient.run(patient2.lastInsertRowid, doctor.lastInsertRowid, 'Rotator cuff strain recovery', '2025-09-01');

  const insertCheckIn = db.prepare(
    `INSERT INTO check_ins (patient_id, date, pain, swelling, mobility, fatigue, sleep_quality, exercises_completed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const checkInData = [
    [1, '2025-09-10', 6, 'mild', 4, 5, 6, 1],
    [1, '2025-09-11', 5, 'mild', 5, 4, 7, 1],
    [1, '2025-09-12', 5, 'none', 5, 4, 7, 1],
    [1, '2025-09-13', 4, 'none', 6, 3, 8, 1],
    [1, '2025-09-14', 4, 'none', 6, 3, 7, 0],
    [1, '2025-09-15', 3, 'none', 7, 2, 8, 1],
    [1, '2025-09-16', 3, 'none', 7, 2, 8, 1],
    [1, '2025-09-17', 2, 'none', 8, 2, 9, 1],
    [2, '2025-09-14', 7, 'mild', 3, 6, 5, 0],
    [2, '2025-09-15', 7, 'mild', 3, 6, 5, 0],
    [2, '2025-09-16', 8, 'severe', 2, 7, 4, 0],
    [2, '2025-09-17', 8, 'mild', 3, 6, 5, 0],
  ];

  for (const row of checkInData) {
    insertCheckIn.run(...row);
  }

  const insertSession = db.prepare(
    `INSERT INTO exercise_sessions (patient_id, exercise_type, reps, average_angle, range_of_motion, form_score, duration)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const sessionData = [
    [1, 'bicep_curl', 10, 85, 120, 78, 180],
    [1, 'bicep_curl', 12, 88, 125, 82, 200],
    [1, 'bicep_curl', 12, 90, 130, 85, 195],
    [1, 'bicep_curl', 15, 92, 135, 88, 210],
    [2, 'bicep_curl', 6, 70, 90, 55, 240],
    [2, 'bicep_curl', 5, 65, 85, 50, 250],
  ];

  for (const row of sessionData) {
    insertSession.run(...row);
  }

  db.prepare(
    'INSERT INTO gamification (patient_id, recovery_streak, exercise_streak, weekly_goal, weekly_completed) VALUES (?, ?, ?, ?, ?)'
  ).run(1, 5, 4, 5, 4);

  db.prepare(
    'INSERT INTO gamification (patient_id, recovery_streak, exercise_streak, weekly_goal, weekly_completed) VALUES (?, ?, ?, ?, ?)'
  ).run(2, 2, 0, 5, 2);

  db.prepare(
    `INSERT INTO alerts (patient_id, type, message, severity)
     VALUES (?, ?, ?, ?)`
  ).run(
    2,
    'severe_swelling',
    'Patient reported severe swelling during check-in. Clinician review recommended.',
    'high'
  );

  db.prepare(
    `INSERT INTO alerts (patient_id, type, message, severity)
     VALUES (?, ?, ?, ?)`
  ).run(
    2,
    'pain_increase',
    'Pain has increased over several consecutive check-ins. Clinician review recommended.',
    'medium'
  );

  console.log('Database seeded successfully!');
  console.log('');
  console.log('Demo accounts (password: password123):');
  console.log('  Doctor:  dr.smith@clinic.com');
  console.log('  Patient: john.doe@email.com');
  console.log('  Patient: maria.garcia@email.com');
}

seed().catch(console.error);
