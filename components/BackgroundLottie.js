// A looping decorative animation that holds still when the user prefers reduced motion.
// Playback is set only through props: React Native reuses native Lottie views between
// screens, so a view paused by command can come back frozen on the next page.
import React from 'react';
import LottieView from 'lottie-react-native';
import useReduceMotion from '../hooks/useReduceMotion';

export default function BackgroundLottie({ speed = 1, ...props }) {
  const reduceMotion = useReduceMotion();
  return <LottieView autoPlay={!reduceMotion} loop {...props} speed={reduceMotion ? 0 : speed} />;
}
