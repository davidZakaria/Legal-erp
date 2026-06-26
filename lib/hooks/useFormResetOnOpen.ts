"use client";

import { useEffect } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";

export function useFormResetOnOpen<T extends FieldValues>(
  form: UseFormReturn<T>,
  isOpen: boolean,
  initialData: Partial<T> | null | undefined,
  defaultValues: Partial<T>
) {
  const { reset } = form;

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      reset({ ...(defaultValues as T), ...initialData } as T);
    } else {
      reset(defaultValues as T);
    }
  }, [initialData, isOpen, reset, defaultValues]);
}
