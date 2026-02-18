/**
 * Type override for react-hook-form (published package types reference missing ../src).
 * Remove when the package fixes its declaration exports.
 */
declare module 'react-hook-form' {
  import type React from 'react';
  type FieldValues = Record<string, unknown>;
  type RegisterReturn = { name: string; onChange: (e: unknown) => void; onBlur: (e: unknown) => void; ref: (instance: unknown) => void };
  type UseFormReturn<T extends FieldValues = FieldValues> = {
    register: (name: keyof T & string, options?: unknown) => RegisterReturn;
    handleSubmit: (onValid: (data: T) => void) => (e?: React.BaseSyntheticEvent) => void;
    formState: { errors: Record<string, { message?: string }>; isSubmitting?: boolean };
    reset: (values?: Partial<T>) => void;
    setValue: (name: keyof T & string, value: unknown) => void;
    watch: (name?: keyof T & string) => unknown;
    control: unknown;
    getValues: () => T;
    setError: (name: string, error: { message?: string }) => void;
    clearErrors: (name?: string) => void;
    trigger: (name?: string) => Promise<boolean>;
  };
  type UseFormProps<T extends FieldValues = FieldValues> = {
    defaultValues?: Partial<T>;
    resolver?: unknown;
    mode?: 'onBlur' | 'onChange' | 'onSubmit' | 'onTouched' | 'all';
  };
  export function useForm<T extends FieldValues = FieldValues, C = unknown>(
    props?: UseFormProps<T>
  ): UseFormReturn<T>;
  export function useFormContext<T extends FieldValues = FieldValues>(): UseFormReturn<T>;
  export function useFormState<T extends FieldValues = FieldValues>(props?: { control?: unknown }): { errors: Record<string, { message?: string }> };
  export function useWatch<T = unknown>(props: { control: unknown; name?: string; defaultValue?: T }): T;
  export const Controller: React.ComponentType<{ control: unknown; name: string; render: (p: { field: unknown }) => React.ReactElement }>;
  export const FormProvider: React.ComponentType<{ children: React.ReactNode } & UseFormReturn>;
  export function useFieldArray<T extends FieldValues>(props: { control: unknown; name: keyof T & string }): { fields: unknown[]; append: (v: unknown) => void; remove: (i: number) => void };
}
