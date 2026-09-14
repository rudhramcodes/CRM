"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useSpring, useTransform } from "framer-motion";

import { cn } from "../../utils/cn"; // assuming standard utility, we'll fix import if needed

let _id = 0;

function DigitCell({
  char,
  isDigit,
  className,
  enterStiffness = 150,
  enterDamping = 15,
  exitStiffness = 150,
  exitDamping = 15,
  direction = "dynamic",
  enterY = 20,
  enterBlur = 4,
  enterScale = 0.85,
}) {
  const [exitQueue, setExitQueue] = useState([]);

  const prevCharRef = useRef(char);
  const isFirstRender = useRef(true);

  // Springs — jump() snaps the spring itself (position + velocity reset)
  const springConfig = { stiffness: enterStiffness, damping: enterDamping };
  const y = useSpring(0, springConfig);
  const opacity = useSpring(1, springConfig);
  const scale = useSpring(1, springConfig);
  const blur = useSpring(0, springConfig);
  const filter = useTransform(blur, (v) => `blur(${v}px)`);

  useEffect(() => {
    if (!isDigit) return;

    const prev = prevCharRef.current;
    prevCharRef.current = char;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (char === prev || !/\d/.test(prev)) return;

    const up =
      direction === "dynamic"
        ? Number(char) > Number(prev)
        : direction === "up";

    const id = _id++;
    setExitQueue((q) => {
      const next = [...q, { id, char: prev, exitY: up ? -enterY : enterY }];
      return next.length > 3 ? next.slice(-3) : next;
    });

    y.jump(up ? enterY : -enterY);
    opacity.jump(0);
    scale.jump(enterScale);
    blur.jump(enterBlur);

    y.set(0);
    opacity.set(1);
    scale.set(1);
    blur.set(0);
  }, [
    char,
    isDigit,
    direction,
    enterY,
    enterBlur,
    enterScale,
    y,
    opacity,
    scale,
    blur,
  ]);

  if (!isDigit) {
    return <span className={className}>{char}</span>;
  }

  return (
    <div
      className={cn(
        "relative grid place-items-center [&>*]:col-start-1 [&>*]:row-start-1",
        className
      )}
    >
      <AnimatePresence>
        {exitQueue.map(({ id, char: exitChar, exitY }) => (
          <motion.span
            key={id}
            aria-hidden
            initial={{ opacity: 1, scale: 1, filter: "blur(0px)", y: 0 }}
            animate={{ opacity: 0, scale: enterScale, filter: `blur(${enterBlur}px)`, y: exitY }}
            transition={{
              type: "spring",
              stiffness: exitStiffness,
              damping: exitDamping,
            }}
            onAnimationComplete={() =>
              setExitQueue((q) => q.filter((item) => item.id !== id))
            }
          >
            {exitChar}
          </motion.span>
        ))}
      </AnimatePresence>
      <motion.span style={{ opacity, scale, filter, y }}>{char}</motion.span>
    </div>
  );
}

function AnimateDigits({
  value,
  gap = 2,
  className,
  digitClassName,
  enterStiffness,
  enterDamping,
  exitStiffness,
  exitDamping,
  direction,
  enterY,
  enterBlur,
  enterScale,
  animationDelay = 80,
}) {
  // displayedValue is what the cells actually render — advanced one step at a time
  const [displayedValue, setDisplayedValue] = useState(value);

  const pendingQueue = useRef([]);
  const isAnimating = useRef(false);
  const timerRef = useRef(null);
  const displayedRef = useRef(value);

  const processQueue = () => {
    if (pendingQueue.current.length === 0) {
      isAnimating.current = false;
      return;
    }

    isAnimating.current = true;
    const next = pendingQueue.current.shift();
    displayedRef.current = next;
    setDisplayedValue(next);

    timerRef.current = setTimeout(processQueue, animationDelay);
  };

  useEffect(() => {
    if (value === displayedRef.current) return;

    pendingQueue.current.push(value);

    if (!isAnimating.current) {
      processQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const chars = String(displayedValue).split("");

  return (
    <div
      className={cn("flex items-center tabular-nums", className)}
      style={{ gap }}
    >
      {chars.map((char, i) => (
        <DigitCell
          key={i}
          char={char}
          isDigit={/\d/.test(char)}
          className={digitClassName}
          enterStiffness={enterStiffness}
          enterDamping={enterDamping}
          exitStiffness={exitStiffness}
          exitDamping={exitDamping}
          direction={direction}
          enterY={enterY}
          enterBlur={enterBlur}
          enterScale={enterScale}
        />
      ))}
    </div>
  );
}

export { AnimateDigits };
