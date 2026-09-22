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

  db.prepare(
    'INSERT INTO gamification (patient_id, recovery_streak, exercise_streak, weekly_goal, weekly_completed) VALUES (?, ?, ?, ?, ?)'
  ).run(1, 0, 0, 5, 0);

  db.prepare(
    'INSERT INTO gamification (patient_id, recovery_streak, exercise_streak, weekly_goal, weekly_completed) VALUES (?, ?, ?, ?, ?)'
  ).run(2, 0, 0, 5, 0);

  console.log('Database seeded successfully!');
  console.log('');
  console.log('Demo accounts (password: password123):');
  console.log('  Doctor:  dr.smith@clinic.com');
  console.log('  Patient: john.doe@email.com');
  console.log('  Patient: maria.garcia@email.com');
}

seed().catch(console.error);
