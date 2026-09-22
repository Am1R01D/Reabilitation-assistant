import { getDb } from './db';

export function getGamification(patientId: number) {
  const db = getDb();
  let record = db
    .prepare('SELECT * FROM gamification WHERE patient_id = ?')
    .get(patientId) as
    | {
        patient_id: number;
        recovery_streak: number;
        exercise_streak: number;
        weekly_goal: number;
        weekly_completed: number;
      }
    | undefined;

  if (!record) {
    db.prepare(
      'INSERT INTO gamification (patient_id) VALUES (?)'
    ).run(patientId);
    record = {
      patient_id: patientId,
      recovery_streak: 0,
      exercise_streak: 0,
      weekly_goal: 5,
      weekly_completed: 0,
    };
  }

  return record;
}

export function updateStreaksOnCheckIn(patientId: number, exercisesCompleted: boolean) {
  const db = getDb();
  const g = getGamification(patientId);

  const yesterday = db
    .prepare(
      `SELECT date FROM check_ins
       WHERE patient_id = ? AND date = date('now', '-1 day')`
    )
    .get(patientId);

  const todayExists = db
    .prepare(
      `SELECT id FROM check_ins
       WHERE patient_id = ? AND date = date('now')`
    )
    .get(patientId);

  let recoveryStreak = g.recovery_streak;
  if (yesterday || !todayExists) {
    recoveryStreak = yesterday ? g.recovery_streak + 1 : 1;
  }

  let exerciseStreak = g.exercise_streak;
  if (exercisesCompleted) {
    exerciseStreak = yesterday ? g.exercise_streak + 1 : 1;
  }

  db.prepare(
    `UPDATE gamification
     SET recovery_streak = ?, exercise_streak = ?
     WHERE patient_id = ?`
  ).run(recoveryStreak, exerciseStreak, patientId);
}

export function updateWeeklyProgress(patientId: number) {
  const db = getDb();
  const weeklyCompleted = db
    .prepare(
      `SELECT COUNT(*) as count FROM exercise_sessions
       WHERE patient_id = ? AND created_at >= datetime('now', '-7 days')`
    )
    .get(patientId) as { count: number };

  db.prepare(
    `UPDATE gamification SET weekly_completed = ? WHERE patient_id = ?`
  ).run(weeklyCompleted.count, patientId);
}
