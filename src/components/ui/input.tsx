import type { ComponentPropsWithoutRef, ReactNode } from "react"

import { cn } from "@/lib/utils"

const inputBase =
  "h-10 w-full rounded-md border bg-base-800 px-3 text-[0.8125rem] text-ink-100 outline-none transition-colors placeholder:text-ink-600 focus:border-brand-500/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_oklab,var(--color-brand-500)_72%,transparent)] disabled:cursor-not-allowed disabled:opacity-45"

export interface InputProps extends ComponentPropsWithoutRef<"input"> {
  mono?: boolean
  invalid?: boolean
}

export function Input({ className, mono, invalid, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        inputBase,
        mono && "font-mono",
        invalid ? "border-fallido/50 focus:border-fallido/70" : "border-rule",
        className
      )}
      {...props}
    />
  )
}

export interface FormFieldProps {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  className?: string
  children: ReactNode
}

export function FormField({ label, htmlFor, hint, error, className, children }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          className="text-xs text-fallido"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
