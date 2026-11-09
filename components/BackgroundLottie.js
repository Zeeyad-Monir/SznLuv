// A looping decorative animation that rests when its screen is covered or the user prefers reduced motion.
import React, { useEffect, useRef } from 'react';
import LottieView from 'lottie-react-native';
import { useIsFocused } from '@react-navigation/native';
import useReduceMotion from '../hooks/useReduceMotion';

export default function BackgroundLottie(props) {
  const focused = useIsFocused();
  const reduceMotion = useReduceMotion();
  const animation = useRef(null);
  const playing = focused && !reduceMotion;

  useEffect(() => {
    if (playing) animation.current?.resume?.();
    else animation.current?.pause?.();
  }, [playing]);

  return <LottieView ref={animation} autoPlay={!reduceMotion} loop {...props} />;
}
