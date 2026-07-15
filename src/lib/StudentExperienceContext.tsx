"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import {
  getStudentExperience,
  STUDENT_EXPERIENCE_INVALIDATED_EVENT,
  type StudentExperience,
} from "@/lib/api/domains/student-experience";
import { getAuthToken } from "@/lib/auth";

type StudentExperienceContextValue = {
  enabled: boolean;
  experience: StudentExperience | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const FEATURE_ENABLED = process.env.NEXT_PUBLIC_STUDENT_EXPERIENCE_V1 === "1";

const StudentExperienceContext = createContext<StudentExperienceContextValue>({
  enabled: false,
  experience: null,
  loading: false,
  refresh: async () => undefined,
});

export function StudentExperienceProvider({ children }: { children: ReactNode }) {
  const [experience, setExperience] = useState<StudentExperience | null>(null);
  const [loading, setLoading] = useState(FEATURE_ENABLED);
  const enabled = FEATURE_ENABLED && experience?.enabled === true;

  const refresh = useCallback(async () => {
    if (!FEATURE_ENABLED) return;
    setLoading(true);
    try {
      setExperience(await getStudentExperience(getAuthToken(), "week"));
    } catch {
      // Existing module endpoints remain the feature-flagged fallback.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!FEATURE_ENABLED) return;
    void refresh();
    const handleInvalidation = () => void refresh();
    window.addEventListener(STUDENT_EXPERIENCE_INVALIDATED_EVENT, handleInvalidation);
    return () => window.removeEventListener(STUDENT_EXPERIENCE_INVALIDATED_EVENT, handleInvalidation);
  }, [refresh]);

  return (
    <StudentExperienceContext.Provider value={{ enabled, experience, loading, refresh }}>
      {children}
    </StudentExperienceContext.Provider>
  );
}

export function useStudentExperience() {
  return useContext(StudentExperienceContext);
}
