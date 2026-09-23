'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DrawingUtils, FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { ExerciseType } from '@/lib/exercises';

type Point = { x: number; y: number; z: number; visibility: number };

export interface ExerciseTrackerState {
  reps: number;
  jointAngle: number;
  movementState: 'idle' | 'extended' | 'contracted' | 'moving';
  feedback: string;
  isReady: boolean;
  isRunning: boolean;
  formScore: number;
}

function angle(a: Point, b: Point, c: Point) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const denominator = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  if (!denominator) return 180;
  const cosine = Math.max(-1, Math.min(1, (ab.x * cb.x + ab.y * cb.y) / denominator));
  return (Math.acos(cosine) * 180) / Math.PI;
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function chooseSide(landmarks: Point[], right: number[], left: number[]) {
  const score = (indexes: number[]) => indexes.reduce((sum, index) => sum + (landmarks[index]?.visibility ?? 1), 0);
  return score(right) >= score(left) ? right : left;
}

export function useExerciseTracker(exerciseType: ExerciseType, language: 'en' | 'ru' = 'en') {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<PoseLandmarker | null>(null);
  const handRef = useRef<HandLandmarker | null>(null);
  const animationRef = useRef(0);
  const runningRef = useRef(false);
  const startTimeRef = useRef(0);
  const phaseRef = useRef<'extended' | 'contracted'>('extended');
  const repsRef = useRef(0);
  const valuesRef = useRef<number[]>([]);
  const minRef = useRef(Number.POSITIVE_INFINITY);
  const maxRef = useRef(Number.NEGATIVE_INFINITY);

  const [state, setState] = useState<ExerciseTrackerState>({
    reps: 0,
    jointAngle: 0,
    movementState: 'idle',
    feedback: language === 'ru' ? 'Инициализация камеры...' : 'Initializing camera...',
    isReady: false,
    isRunning: false,
    formScore: 100,
  });

  const tr = useCallback((en: string, ru: string) => language === 'ru' ? ru : en, [language]);

  const processMovement = useCallback((value: number, low: number, high: number, labels: [string, string]) => {
    valuesRef.current.push(value);
    if (valuesRef.current.length > 600) valuesRef.current.shift();
    minRef.current = Math.min(minRef.current, value);
    maxRef.current = Math.max(maxRef.current, value);

    let movementState: ExerciseTrackerState['movementState'] = 'moving';
    let feedback = tr('Continue the movement slowly', 'Продолжайте движение медленно');
    if (value <= low) {
      phaseRef.current = 'contracted';
      movementState = 'contracted';
      feedback = labels[0];
    } else if (value >= high) {
      movementState = 'extended';
      feedback = labels[1];
      if (phaseRef.current === 'contracted' && runningRef.current) {
        repsRef.current += 1;
        phaseRef.current = 'extended';
      }
    }

    const observedRange = Math.max(0, maxRef.current - minRef.current);
    const targetRange = Math.max(1, high - low);
    const formScore = Math.min(100, Math.round((observedRange / targetRange) * 100));
    setState((current) => ({ ...current, reps: repsRef.current, jointAngle: Math.round(value), movementState, feedback, formScore }));
  }, [tr]);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const drawing = new DrawingUtils(context);

    if (exerciseType === 'finger_flexion' && handRef.current) {
      const result = handRef.current.detectForVideo(video, performance.now());
      const hand = result.landmarks?.[0] as Point[] | undefined;
      if (hand) {
        drawing.drawConnectors(hand, HandLandmarker.HAND_CONNECTIONS, { color: '#2d9186', lineWidth: 3 });
        drawing.drawLandmarks(hand, { color: '#ef4444', radius: 3 });
        const tips = [8, 12, 16, 20];
        const bases = [5, 9, 13, 17];
        const openness = tips.reduce((sum, tip, index) => {
          const baseDistance = Math.max(0.001, distance(hand[bases[index]], hand[0]));
          return sum + distance(hand[tip], hand[0]) / baseDistance;
        }, 0) / tips.length;
        processMovement(openness * 100, 120, 165, [tr('Hand closed — now open', 'Кисть сжата — теперь разожмите'), tr('Hand open — now close', 'Кисть раскрыта — теперь сожмите')]);
      } else {
        setState((current) => ({ ...current, feedback: tr('Show one hand clearly to the camera', 'Покажите одну кисть камере целиком') }));
      }
    } else if (poseRef.current) {
      const result = poseRef.current.detectForVideo(video, performance.now());
      const landmarks = result.landmarks?.[0] as Point[] | undefined;
      if (landmarks) {
        drawing.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, { color: '#2d9186', lineWidth: 2 });
        drawing.drawLandmarks(landmarks, { color: '#ef4444', radius: 3 });

        if (exerciseType === 'bicep_curl') {
          const [shoulder, elbow, wrist] = chooseSide(landmarks, [12, 14, 16], [11, 13, 15]).map((index) => landmarks[index]);
          processMovement(angle(shoulder, elbow, wrist), 70, 150, [tr('Arm bent — now straighten', 'Рука согнута — теперь выпрямите'), tr('Arm straight — now bend', 'Рука выпрямлена — теперь согните')]);
        } else if (exerciseType === 'straight_leg_raise') {
          const [shoulder, hip, knee, ankle] = chooseSide(landmarks, [12, 24, 26, 28], [11, 23, 25, 27]).map((index) => landmarks[index]);
          const hipAngle = angle(shoulder, hip, ankle);
          const kneeAngle = angle(hip, knee, ankle);
          processMovement(hipAngle, 125, 165, [tr('Leg raised — lower slowly', 'Нога поднята — медленно опустите'), tr('Leg lowered — raise it straight', 'Нога опущена — поднимите её прямой')]);
          if (kneeAngle < 150) setState((current) => ({ ...current, feedback: tr('Keep your knee straight', 'Не сгибайте ногу в колене'), formScore: Math.min(current.formScore, 65) }));
        } else {
          const [knee, ankle, foot] = chooseSide(landmarks, [26, 28, 32], [25, 27, 31]).map((index) => landmarks[index]);
          processMovement(angle(knee, ankle, foot), 100, 125, [tr('Foot flexed — point away', 'Стопа согнута — потяните носок от себя'), tr('Foot pointed — pull it back', 'Носок вытянут — потяните стопу к себе')]);
        }
      } else {
        setState((current) => ({ ...current, feedback: tr('Move back so the required joints are visible', 'Отойдите назад, чтобы нужные суставы были видны') }));
      }
    }

    animationRef.current = requestAnimationFrame(processFrame);
  }, [exerciseType, processMovement, tr]);

  const initialize = useCallback(async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm');
      if (exerciseType === 'finger_flexion') {
        handRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate: 'GPU' },
          runningMode: 'VIDEO',
          numHands: 1,
        });
      } else {
        poseRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task', delegate: 'GPU' },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
      }
      setState((current) => ({ ...current, isReady: true, feedback: tr('Camera ready — press Start', 'Камера готова — нажмите «Начать»') }));
      animationRef.current = requestAnimationFrame(processFrame);
    } catch {
      setState((current) => ({ ...current, feedback: tr('Failed to initialize MediaPipe', 'Не удалось запустить MediaPipe') }));
    }
  }, [exerciseType, processFrame, tr]);

  useEffect(() => {
    const video = videoRef.current;
    let stream: MediaStream | null = null;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: false })
      .then(async (cameraStream) => {
        stream = cameraStream;
        if (!video) return;
        video.srcObject = cameraStream;
        await video.play();
        await initialize();
      })
      .catch(() => setState((current) => ({ ...current, feedback: tr('Camera access denied. Please allow camera permissions.', 'Нет доступа к камере. Разрешите доступ в настройках браузера.') })));

    return () => {
      cancelAnimationFrame(animationRef.current);
      stream?.getTracks().forEach((track) => track.stop());
      poseRef.current?.close();
      handRef.current?.close();
    };
  }, [initialize, tr]);

  const startSession = useCallback(() => {
    repsRef.current = 0;
    valuesRef.current = [];
    minRef.current = Number.POSITIVE_INFINITY;
    maxRef.current = Number.NEGATIVE_INFINITY;
    phaseRef.current = 'extended';
    startTimeRef.current = Date.now();
    runningRef.current = true;
    setState((current) => ({ ...current, reps: 0, formScore: 0, isRunning: true, feedback: tr('Session started', 'Тренировка началась') }));
  }, [tr]);

  const stopSession = useCallback(() => {
    runningRef.current = false;
    const values = valuesRef.current;
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    const range = Number.isFinite(minRef.current) && Number.isFinite(maxRef.current) ? maxRef.current - minRef.current : 0;
    setState((current) => ({ ...current, isRunning: false }));
    return {
      reps: repsRef.current,
      averageAngle: Math.round(average * 10) / 10,
      rangeOfMotion: Math.round(range * 10) / 10,
      formScore: state.formScore,
      exerciseDuration: Math.max(0, Math.round((Date.now() - startTimeRef.current) / 1000)),
    };
  }, [state.formScore]);

  return { videoRef, canvasRef, state, startSession, stopSession };
}
