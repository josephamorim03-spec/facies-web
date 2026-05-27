"use client";

import { useRef, useState } from "react";

export type OptionLetter = "A" | "B" | "C" | "D" | "E";

export type SwipeOption = {
  questionNumber: number;
  letter: OptionLetter;
};

export type SwipePreview = {
  questionNumber: number;
  letter: OptionLetter;
  offsetX: number;
};

const SWIPE_REVEAL_PX = 36;
const SWIPE_OPEN_THRESHOLD_PX = 18;
const SWIPE_CANCEL_VERTICAL_PX = 30;

export type SwipeGesturesState = {
  openSwipeOption: SwipeOption | null;
  swipePreview: SwipePreview | null;
};

export type SwipeGesturesActions = {
  handleOptionTouchStart: (
    e: React.TouchEvent,
    questionNumber: number,
    letter: OptionLetter,
  ) => void;
  handleOptionTouchMove: (
    e: React.TouchEvent,
    questionNumber: number,
    letter: OptionLetter,
  ) => void;
  handleOptionTouchEnd: (questionNumber: number, letter: OptionLetter) => void;
  clearSwipeGestureState: () => void;
  closeSwipeOption: () => void;
};

function isSameOption(
  left: SwipeOption | null | undefined,
  right: SwipeOption | null | undefined,
): boolean {
  if (!left || !right) return false;
  return left.questionNumber === right.questionNumber && left.letter === right.letter;
}

export function useSwipeGestures(): [SwipeGesturesState, SwipeGesturesActions] {
  const [openSwipeOption, setOpenSwipeOption] = useState<SwipeOption | null>(null);
  const [swipePreview, setSwipePreview] = useState<SwipePreview | null>(null);

  const swipeTouchStartX = useRef<number | null>(null);
  const swipeTouchStartY = useRef<number | null>(null);
  const swipeTouchId = useRef<number | null>(null);
  const swipeTouchQuestionNumber = useRef<number | null>(null);
  const swipeTouchLetter = useRef<OptionLetter | null>(null);
  const swipeBaseOffsetX = useRef(0);

  function clearSwipeGestureState() {
    swipeTouchId.current = null;
    swipeTouchStartX.current = null;
    swipeTouchStartY.current = null;
    swipeTouchQuestionNumber.current = null;
    swipeTouchLetter.current = null;
    swipeBaseOffsetX.current = 0;
  }

  function handleOptionTouchStart(
    e: React.TouchEvent,
    questionNumber: number,
    letter: OptionLetter,
  ) {
    if (swipeTouchId.current !== null) return;
    const touch = e.touches[0];
    const option = { questionNumber, letter };
    const isOpen = isSameOption(openSwipeOption, option);
    swipeTouchId.current = touch.identifier;
    swipeTouchStartX.current = touch.clientX;
    swipeTouchStartY.current = touch.clientY;
    swipeTouchQuestionNumber.current = questionNumber;
    swipeTouchLetter.current = letter;
    swipeBaseOffsetX.current = isOpen ? -SWIPE_REVEAL_PX : 0;
    setSwipePreview({
      questionNumber,
      letter,
      offsetX: swipeBaseOffsetX.current,
    });
  }

  function handleOptionTouchMove(
    e: React.TouchEvent,
    questionNumber: number,
    letter: OptionLetter,
  ) {
    if (swipeTouchId.current === null || swipeTouchStartX.current === null) return;
    const touch = Array.from(e.touches).find(
      (t) => t.identifier === swipeTouchId.current,
    );
    if (!touch) return;
    if (
      swipeTouchQuestionNumber.current !== questionNumber
      || swipeTouchLetter.current !== letter
    ) {
      return;
    }

    const deltaX = touch.clientX - swipeTouchStartX.current;
    const deltaY = Math.abs(touch.clientY - (swipeTouchStartY.current ?? 0));
    if (deltaY > SWIPE_CANCEL_VERTICAL_PX) {
      setSwipePreview(null);
      clearSwipeGestureState();
      return;
    }
    if (Math.abs(deltaX) > Math.abs(deltaY) && e.cancelable) {
      e.preventDefault();
    }

    const rawOffsetX = swipeBaseOffsetX.current + deltaX;
    const clampedOffsetX = Math.max(-SWIPE_REVEAL_PX, Math.min(0, rawOffsetX));
    setSwipePreview({ questionNumber, letter, offsetX: clampedOffsetX });
  }

  function handleOptionTouchEnd(questionNumber: number, letter: OptionLetter) {
    if (
      swipeTouchQuestionNumber.current !== questionNumber
      || swipeTouchLetter.current !== letter
    ) {
      setSwipePreview(null);
      clearSwipeGestureState();
      return;
    }

    const fallbackOffsetX = isSameOption(openSwipeOption, { questionNumber, letter })
      ? -SWIPE_REVEAL_PX
      : 0;
    const finalOffsetX = isSameOption(swipePreview, { questionNumber, letter })
      ? swipePreview?.offsetX ?? fallbackOffsetX
      : fallbackOffsetX;
    const shouldOpen = Math.abs(finalOffsetX) >= SWIPE_OPEN_THRESHOLD_PX;
    setOpenSwipeOption(shouldOpen ? { questionNumber, letter } : null);
    setSwipePreview(null);
    clearSwipeGestureState();
  }

  function closeSwipeOption() {
    setOpenSwipeOption(null);
    setSwipePreview(null);
  }

  return [
    { openSwipeOption, swipePreview },
    {
      handleOptionTouchStart,
      handleOptionTouchMove,
      handleOptionTouchEnd,
      clearSwipeGestureState,
      closeSwipeOption,
    },
  ];
}
