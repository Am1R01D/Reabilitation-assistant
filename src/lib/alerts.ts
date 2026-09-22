import { getDb } from './db';
import type { CheckIn, ExerciseSession } from './types';

export function createAlert(
  patientId: number,
  type: string,
  message: string,
  severity: 'low' | 'medium' | 'high'
) {
  const db = getDb();
  const existing = db
    .prepare(
      `SELECT id FROM alerts
       WHERE patient_id = ? AND type = ? AND acknowledged = 0
       AND created_at > datetime('now', '-2 days')`
    )
    .get(patientId, type);

  if (existing) return;

  db.prepare(
    `INSERT INTO alerts (patient_id, type, message, severity)
     VALUES (?, ?, ?, ?)`
  ).run(patientId, type, message, severity);
}

export function evaluateCheckInAlerts(patientId: number, checkIn: CheckIn) {
  const db = getDb();

  if (checkIn.swelling === 'severe') {
    createAlert(
      patientId,
      'severe_swelling',
      'Patient reported severe swelling during check-in. Clinician review recommended.',
      'high'
    );
  }

  if (checkIn.pain >= 8) {
    createAlert(
      patientId,
      'high_pain',
      `Patient reported high pain level (${checkIn.pain}/10). Clinician review recommended.`,
      'high'
    );
  }

  const recentCheckIns = db
    .prepare(
      `SELECT pain FROM check_ins
       WHERE patient_id = ?
       ORDER BY date DESC LIMIT 4`
    )
    .all(patientId) as { pain: number }[];

  if (recentCheckIns.length >= 3) {
    const pains = recentCheckIns.map((c) => c.pain);
    const increasing = pains.every((p, i) => i === 0 || p >= pains[i - 1]);
    const significantIncrease = pains[0] - pains[pains.length - 1] >= 2;

    if (increasing && significantIncrease) {
      createAlert(
        patientId,
        'pain_increase',
        'Pain has increased over several consecutive check-ins. Clinician review recommended.',
        'medium'
      );
    }
  }
}

export function evaluateAdherenceAlerts(patientId: number) {
  const db = getDb();
  const recent = db
    .prepare(
      `SELECT exercises_completed FROM check_ins
       WHERE patient_id = ?
       ORDER BY date DESC LIMIT 7`
    )
    .all(patientId) as { exercises_completed: number }[];

  if (recent.length >= 5) {
    const completed = recent.filter((r) => r.exercises_completed).length;
    const rate = completed / recent.length;
    if (rate < 0.4) {
      createAlert(
        patientId,
        'adherence_drop',
        `Exercise adherence has dropped to ${Math.round(rate * 100)}% over recent check-ins.`,
        'medium'
      );
    }
  }
}

export function evaluatePerformanceAlerts(patientId: number, sessions: ExerciseSession[]) {
  if (sessions.length < 4) return;

  const recent = sessions.slice(0, 3);
  const older = sessions.slice(3, 6);
  if (older.length < 2) return;

  const recentAvgForm = recent.reduce((s, x) => s + x.form_score, 0) / recent.length;
  const olderAvgForm = older.reduce((s, x) => s + x.form_score, 0) / older.length;

  if (olderAvgForm - recentAvgForm >= 15) {
    createAlert(
      patientId,
      'performance_decline',
      'Exercise form scores have declined recently. Clinician review recommended.',
      'medium'
    );
  }

  const recentAvgRom = recent.reduce((s, x) => s + x.range_of_motion, 0) / recent.length;
  const olderAvgRom = older.reduce((s, x) => s + x.range_of_motion, 0) / older.length;

  if (olderAvgRom - recentAvgRom >= 20) {
    createAlert(
      patientId,
      'rom_decline',
      'Range of motion has decreased in recent exercise sessions.',
      'medium'
    );
  }
}

export function getAlertsForPatient(patientId: number) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM alerts WHERE patient_id = ?
       ORDER BY created_at DESC LIMIT 20`
    )
    .all(patientId);
}

export function getUnacknowledgedAlertsForDoctor(doctorId: number) {
  const db = getDb();
  return db
    .prepare(
      `SELECT a.*, u.name as patient_name, p.id as patient_record_id
       FROM alerts a
       JOIN patients p ON a.patient_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE p.doctor_id = ? AND a.acknowledged = 0
       ORDER BY
         CASE a.severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
         a.created_at DESC`
    )
    .all(doctorId);
}
