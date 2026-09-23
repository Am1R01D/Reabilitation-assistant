export type ExerciseType = 'bicep_curl' | 'finger_flexion' | 'straight_leg_raise' | 'ankle_pumps';

export interface ExerciseDefinition {
  id: ExerciseType;
  name: string;
  description: string;
  duration: string;
  targetReps: number;
  bodyArea: 'arm' | 'leg';
  requiresCastRemoved: boolean;
  cameraInstruction: string;
  angleLabel: string;
}

export const exerciseDefinitions: ExerciseDefinition[] = [
  {
    id: 'finger_flexion',
    name: 'Finger Flexion',
    description: 'Slowly open and close your hand. MediaPipe tracks the finger joints and counts each complete movement.',
    duration: '3-5 min',
    targetReps: 10,
    bodyArea: 'arm',
    requiresCastRemoved: false,
    cameraInstruction: 'Hold your hand clearly in front of the camera with the palm facing forward.',
    angleLabel: 'Finger motion',
  },
  {
    id: 'bicep_curl',
    name: 'Bicep Curl',
    description: 'Bend and straighten the arm while MediaPipe tracks elbow movement and form.',
    duration: '5-10 min',
    targetReps: 12,
    bodyArea: 'arm',
    requiresCastRemoved: true,
    cameraInstruction: 'Position yourself so your upper body and working arm are visible.',
    angleLabel: 'Elbow angle',
  },
  {
    id: 'ankle_pumps',
    name: 'Ankle Movements',
    description: 'Move the foot gently up and down while MediaPipe follows the ankle and foot.',
    duration: '3-5 min',
    targetReps: 12,
    bodyArea: 'leg',
    requiresCastRemoved: false,
    cameraInstruction: 'Position the camera so your knee, ankle, and foot are fully visible.',
    angleLabel: 'Ankle angle',
  },
  {
    id: 'straight_leg_raise',
    name: 'Straight Leg Raise',
    description: 'Raise a straight leg while lying down. MediaPipe tracks hip movement and knee alignment.',
    duration: '5-8 min',
    targetReps: 10,
    bodyArea: 'leg',
    requiresCastRemoved: true,
    cameraInstruction: 'Lie sideways to the camera with your full body and working leg visible.',
    angleLabel: 'Hip angle',
  },
];

export function getExerciseDefinition(type: string | null) {
  return exerciseDefinitions.find((exercise) => exercise.id === type) ?? exerciseDefinitions[1];
}

export function parsePatientCondition(condition: string) {
  const normalized = condition.toLowerCase();
  const bodyArea: 'arm' | 'leg' | 'unknown' = normalized.includes('arm')
    ? 'arm'
    : normalized.includes('leg')
      ? 'leg'
      : 'unknown';
  const castRemoved = normalized.includes('removed') || normalized.includes('without cast');
  return { bodyArea, castRemoved };
}
