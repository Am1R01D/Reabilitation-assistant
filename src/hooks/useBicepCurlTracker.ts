'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

export type MovementState = 'idle' | 'extended' | 'bent' | 'curling';

export interface TrackerState {
  reps: number;
  elbowAngle: number;
  movementState: MovementState;
  feedback: string;
  isReady: boolean;
  isRunning: boolean;
  formScore: number;
  angleHistory: number[];
}

const EXTENDED_THRESHOLD = 150;
const BENT_THRESHOLD = 70;
const MIN_ROM = 60;

function calculateAngle(
  shoulder: { x: number; y: number },
  elbow: { x: number; y: number },
  wrist: { x: number; y: number }
): number {
  const v1 = { x: shoulder.x - elbow.x, y: shoulder.y - elbow.y };
  const v2 = { x: wrist.x - elbow.x, y: wrist.y - elbow.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  if (mag1 === 0 || mag2 === 0) return 180;
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

function getFeedback(
  angle: number,
  state: MovementState,
  elbowStable: boolean,
  rom: number
): string {
  if (state === 'extended' && angle < EXTENDED_THRESHOLD - 10) {
    return 'Straighten your arm fully';
  }
  if (state === 'bent' && angle > BENT_THRESHOLD + 20) {
    return 'Raise your arm higher';
  }
  if (!elbowStable) {
    return 'Keep your elbow stable';
  }
  if (state === 'curling' && rom < MIN_ROM) {
    return 'Increase your range of motion';
  }
  if (state === 'bent' || state === 'curling') {
    return 'Good form';
  }
  return 'Ready — extend your arm';
}

export function useBicepCurlTracker() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const lastFeedbackRef = useRef<string>('');
  const lastSpeakTimeRef = useRef<number>(0);

  const repPhaseRef = useRef<'extended' | 'bent'>('extended');
  const repsRef = useRef(0);
  const angleHistoryRef = useRef<number[]>([]);
  const minAngleRef = useRef(180);
  const maxAngleRef = useRef(0);
  const elbowPositionsRef = useRef<{ x: number; y: number }[]>([]);

  const [state, setState] = useState<TrackerState>({
    reps: 0,
    elbowAngle: 180,
    movementState: 'idle',
    feedback: 'Initializing camera...',
    isReady: false,
    isRunning: false,
    formScore: 100,
    angleHistory: [],
  });

  const speakFeedback = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const now = Date.now();
    if (text === lastFeedbackRef.current && now - lastSpeakTimeRef.current < 3000) return;
    lastFeedbackRef.current = text;
    lastSpeakTimeRef.current = now;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
  }, []);

  const initPose = useCallback(async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
      );
      landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      });
      setState((s) => ({ ...s, feedback: 'Camera ready — press Start', isReady: true }));
    } catch {
      setState((s) => ({ ...s, feedback: 'Failed to initialize pose detection', isReady: false }));
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false,
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      await initPose();
    } catch {
      setState((s) => ({
        ...s,
        feedback: 'Camera access denied. Please allow camera permissions.',
        isReady: false,
      }));
    }
  }, [initPose]);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !canvas || !landmarker || video.readyState < 2) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const results = landmarker.detectForVideo(video, performance.now());
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0];
      const drawingUtils = new DrawingUtils(ctx);

      drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
        color: '#2d9186',
        lineWidth: 2,
      });
      drawingUtils.drawLandmarks(landmarks, { color: '#ef4444', lineWidth: 1, radius: 3 });

      const shoulder = landmarks[12];
      const elbow = landmarks[14];
      const wrist = landmarks[16];

      if (shoulder && elbow && wrist) {
        const angle = calculateAngle(shoulder, elbow, wrist);
        angleHistoryRef.current.push(angle);
        if (angleHistoryRef.current.length > 300) angleHistoryRef.current.shift();

        minAngleRef.current = Math.min(minAngleRef.current, angle);
        maxAngleRef.current = Math.max(maxAngleRef.current, angle);

        elbowPositionsRef.current.push({ x: elbow.x, y: elbow.y });
        if (elbowPositionsRef.current.length > 30) elbowPositionsRef.current.shift();

        const elbowVariance =
          elbowPositionsRef.current.length > 10
            ? Math.max(
                ...elbowPositionsRef.current.map((p) => p.y)
              ) -
              Math.min(...elbowPositionsRef.current.map((p) => p.y))
            : 0;
        const elbowStable = elbowVariance < 0.05;

        let movementState: MovementState = 'idle';
        if (angle >= EXTENDED_THRESHOLD) {
          movementState = 'extended';
          if (repPhaseRef.current === 'bent') {
            repsRef.current += 1;
            repPhaseRef.current = 'extended';
            speakFeedback(`Rep ${repsRef.current}`);
          }
        } else if (angle <= BENT_THRESHOLD) {
          movementState = 'bent';
          repPhaseRef.current = 'bent';
        } else {
          movementState = 'curling';
        }

        const rom = maxAngleRef.current - minAngleRef.current;
        const feedback = getFeedback(angle, movementState, elbowStable, rom);

        const romScore = Math.min(100, (rom / 120) * 100);
        const stabilityScore = elbowStable ? 100 : 60;
        const depthScore =
          minAngleRef.current <= BENT_THRESHOLD ? 100 : Math.max(0, 100 - (minAngleRef.current - BENT_THRESHOLD) * 2);
        const formScore = Math.round((romScore + stabilityScore + depthScore) / 3);

        if (feedback !== lastFeedbackRef.current) {
          speakFeedback(feedback);
        }

        setState((s) => ({
          ...s,
          reps: repsRef.current,
          elbowAngle: Math.round(angle),
          movementState,
          feedback,
          formScore,
          angleHistory: [...angleHistoryRef.current.slice(-50)],
        }));

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(`${Math.round(angle)}°`, elbow.x * canvas.width + 10, elbow.y * canvas.height);
      }
    }

    animationRef.current = requestAnimationFrame(processFrame);
  }, [speakFeedback]);

  const startSession = useCallback(() => {
    repsRef.current = 0;
    repPhaseRef.current = 'extended';
    angleHistoryRef.current = [];
    minAngleRef.current = 180;
    maxAngleRef.current = 0;
    elbowPositionsRef.current = [];
    startTimeRef.current = Date.now();
    setState((s) => ({ ...s, reps: 0, isRunning: true, feedback: 'Session started' }));
    animationRef.current = requestAnimationFrame(processFrame);
  }, [processFrame]);

  const stopSession = useCallback(() => {
    cancelAnimationFrame(animationRef.current);
    setState((s) => ({ ...s, isRunning: false }));

    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    const angles = angleHistoryRef.current;
    const avgAngle =
      angles.length > 0 ? angles.reduce((a, b) => a + b, 0) / angles.length : 0;
    const rom = maxAngleRef.current - minAngleRef.current;

    return {
      reps: repsRef.current,
      averageAngle: Math.round(avgAngle * 10) / 10,
      rangeOfMotion: Math.round(rom * 10) / 10,
      formScore: state.formScore,
      exerciseDuration: duration,
    };
  }, [state.formScore]);

  useEffect(() => {
    startCamera();
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
      landmarkerRef.current?.close();
    };
  }, [startCamera]);

  return { videoRef, canvasRef, state, startSession, stopSession };
}
