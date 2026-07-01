"use client";

import type { CSSProperties } from "react";
import styles from "./KrosIntro.module.css";

type KrosIntroProps = {
  size?: string;
  className?: string;
};

export function KrosIntro({
  size = "clamp(112px, 10vw, 142px)",
  className = "",
}: KrosIntroProps) {
  const rootClassName = [styles.root, className].filter(Boolean).join(" ");

  return (
    <div className={rootClassName} style={{ "--kros-size": size } as CSSProperties}>
      <div className={styles.sprite} role="img" aria-label="KrosMed" />
    </div>
  );
}
