import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';

/**
 * False until this screen's push has finished. Lets heavy native views like maps mount
 * after the slide instead of during it. The timer covers screens that never animate in.
 */
export default function useAfterTransition(fallbackMs = 500) {
  const navigation = useNavigation();
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const finish = () => setFinished(true);
    const timer = setTimeout(finish, fallbackMs);
    const unsubscribe = navigation.addListener('transitionEnd', () => {
      clearTimeout(timer);
      finish();
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [navigation, fallbackMs]);

  return finished;
}
