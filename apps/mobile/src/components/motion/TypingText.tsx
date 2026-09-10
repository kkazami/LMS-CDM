import React, { useEffect, useState } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

export function TypingText({
  text,
  speed = 40,
  style,
}: {
  text: string;
  speed?: number;
  style?: StyleProp<TextStyle>;
}) {
  const reducedMotion = useReducedMotion();
  const [displayed, setDisplayed] = useState(reducedMotion ? text : "");

  useEffect(() => {
    if (reducedMotion) {
      setDisplayed(text);
      return;
    }

    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, reducedMotion]);

  return <Text style={style}>{displayed}</Text>;
}
