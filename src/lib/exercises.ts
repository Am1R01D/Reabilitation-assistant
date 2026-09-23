export type ExerciseType = 'bicep_curl' | 'finger_flexion' | 'straight_leg_raise' | 'ankle_pumps';

export interface ExerciseDefinition {
  id: ExerciseType;
  name: string;
  nameRu: string;
  description: string;
  descriptionRu: string;
  duration: string;
  durationRu: string;
  targetReps: number;
  bodyArea: 'arm' | 'leg';
  requiresCastRemoved: boolean;
  cameraInstruction: string;
  cameraInstructionRu: string;
  angleLabel: string;
  angleLabelRu: string;
  tutorial: string[];
  tutorialRu: string[];
}

export const exerciseDefinitions: ExerciseDefinition[] = [
  {
    id: 'finger_flexion',
    name: 'Finger Flexion',
    nameRu: 'Сгибание пальцев',
    description: 'Slowly open and close your hand. MediaPipe tracks the finger joints and counts each complete movement.',
    descriptionRu: 'Медленно открывайте и закрывайте ладонь. MediaPipe отслеживает суставы пальцев и считает движения.',
    duration: '3-5 min',
    durationRu: '3–5 мин',
    targetReps: 10,
    bodyArea: 'arm',
    requiresCastRemoved: false,
    cameraInstruction: 'Hold your hand clearly in front of the camera with the palm facing forward.',
    cameraInstructionRu: 'Держите кисть перед камерой ладонью вперёд.',
    angleLabel: 'Finger motion',
    angleLabelRu: 'Движение пальцев',
    tutorial: ['Raise your hand with the palm facing the camera.', 'Slowly close the fingers into a comfortable fist.', 'Open the palm completely to finish one repetition.'],
    tutorialRu: ['Поднимите кисть ладонью к камере.', 'Медленно сожмите пальцы в комфортный кулак.', 'Полностью раскройте ладонь — это одно повторение.'],
  },
  {
    id: 'bicep_curl',
    name: 'Bicep Curl',
    nameRu: 'Сгибание руки',
    description: 'Bend and straighten the arm while MediaPipe tracks elbow movement and form.',
    descriptionRu: 'Сгибайте и разгибайте руку, пока MediaPipe отслеживает локоть и технику.',
    duration: '5-10 min',
    durationRu: '5–10 мин',
    targetReps: 12,
    bodyArea: 'arm',
    requiresCastRemoved: true,
    cameraInstruction: 'Position yourself so your upper body and working arm are visible.',
    cameraInstructionRu: 'Расположитесь так, чтобы камера видела верхнюю часть тела и рабочую руку.',
    angleLabel: 'Elbow angle',
    angleLabelRu: 'Угол локтя',
    tutorial: ['Stand or sit upright and keep the elbow close to the body.', 'Bend the arm slowly without moving the elbow forward.', 'Straighten the arm under control to complete the repetition.'],
    tutorialRu: ['Сядьте или встаньте ровно, прижмите локоть к телу.', 'Медленно согните руку, не выводя локоть вперёд.', 'Плавно разогните руку — это одно повторение.'],
  },
  {
    id: 'ankle_pumps',
    name: 'Ankle Movements',
    nameRu: 'Движения стопой',
    description: 'Move the foot gently up and down while MediaPipe follows the ankle and foot.',
    descriptionRu: 'Плавно двигайте стопой вверх и вниз, пока MediaPipe отслеживает голеностоп.',
    duration: '3-5 min',
    durationRu: '3–5 мин',
    targetReps: 12,
    bodyArea: 'leg',
    requiresCastRemoved: false,
    cameraInstruction: 'Position the camera so your knee, ankle, and foot are fully visible.',
    cameraInstructionRu: 'Расположите камеру так, чтобы были видны колено, голеностоп и стопа.',
    angleLabel: 'Ankle angle',
    angleLabelRu: 'Угол стопы',
    tutorial: ['Sit or lie down with the leg supported.', 'Pull the toes gently toward yourself.', 'Point the toes away and return slowly.'],
    tutorialRu: ['Сядьте или лягте, обеспечив опору ноге.', 'Плавно потяните носок на себя.', 'Направьте носок от себя и медленно вернитесь.'],
  },
  {
    id: 'straight_leg_raise',
    name: 'Straight Leg Raise',
    nameRu: 'Подъём прямой ноги',
    description: 'Raise a straight leg while lying down. MediaPipe tracks hip movement and knee alignment.',
    descriptionRu: 'Поднимайте прямую ногу лёжа. MediaPipe отслеживает тазобедренный сустав и положение колена.',
    duration: '5-8 min',
    durationRu: '5–8 мин',
    targetReps: 10,
    bodyArea: 'leg',
    requiresCastRemoved: true,
    cameraInstruction: 'Lie sideways to the camera with your full body and working leg visible.',
    cameraInstructionRu: 'Лягте боком к камере так, чтобы тело и рабочая нога были видны полностью.',
    angleLabel: 'Hip angle',
    angleLabelRu: 'Угол бедра',
    tutorial: ['Lie on your back and bend the resting leg for support.', 'Keep the working knee straight and raise the leg slowly.', 'Lower the leg without dropping it to complete the repetition.'],
    tutorialRu: ['Лягте на спину, вторую ногу согните для опоры.', 'Не сгибая рабочее колено, медленно поднимите ногу.', 'Плавно опустите ногу — это одно повторение.'],
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
