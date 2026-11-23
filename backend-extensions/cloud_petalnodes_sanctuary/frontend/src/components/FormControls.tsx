import React from 'react';
import {
  Checkbox as MantineCheckbox,
  PasswordInput as MantinePasswordInput,
  Radio as MantineRadio,
  Select as MantineSelect,
  Textarea as MantineTextarea,
  TextInput as MantineTextInput,
  type CheckboxProps as MantineCheckboxProps,
  type PasswordInputProps as MantinePasswordInputProps,
  type SelectProps as MantineSelectProps,
  type TextareaProps as MantineTextareaProps,
  type TextInputProps as MantineTextInputProps,
} from '@mantine/core';
import { AlertCircle, CheckCircle2, ChevronDown, Eye, EyeOff, Search, X } from 'lucide-react';

export interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  optional?: boolean;
  hint?: string;
}

export function FieldLabel({
  children,
  required,
  optional,
  hint,
  className = '',
  ...rest
}: FieldLabelProps) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <label
        className={`text-[13px] font-medium text-[var(--calagopus-text)] leading-snug ${className}`}
        {...rest}
      >
        {children}
        {required ? (
          <span className="ml-1 text-[var(--calagopus-danger)]" aria-hidden="true">
            *
          </span>
        ) : null}
        {optional ? (
          <span className="ml-1.5 text-[12px] font-normal text-[var(--calagopus-text-secondary)]">
            (Optional)
          </span>
        ) : null}
      </label>
      {hint ? (
        <span className="text-[12px] text-[var(--calagopus-text-secondary)]">{hint}</span>
      ) : null}
    </div>
  );
}

export interface ValidationMessageProps {
  type?: 'error' | 'success' | 'hint';
  message?: string;
  id?: string;
}

export function ValidationMessage({ type = 'error', message, id }: ValidationMessageProps) {
  if (!message) return null;

  const tone =
    type === 'error'
      ? 'text-[var(--calagopus-danger-text)]'
      : type === 'success'
        ? 'text-[var(--calagopus-success-text)]'
        : 'text-[var(--calagopus-text-secondary)]';

  return (
    <p
      id={id}
      role={type === 'error' ? 'alert' : undefined}
      className={`mt-1.5 flex items-center gap-1.5 text-[12px] font-medium leading-snug ${tone}`}
    >
      {type === 'error' ? <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
      {type === 'success' ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : null}
      <span>{message}</span>
    </p>
  );
}

export interface TextInputProps extends Omit<MantineTextInputProps, 'size'> {
  optional?: boolean;
  successMessage?: string;
}

export function TextInput({
  label,
  required,
  optional,
  error,
  successMessage,
  description,
  id,
  classNames,
  ...rest
}: TextInputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <div className="w-full">
      {label ? (
        <FieldLabel htmlFor={inputId} required={required} optional={optional}>
          {label}
        </FieldLabel>
      ) : null}
      <MantineTextInput
        id={inputId}
        required={required}
        error={Boolean(error)}
        styles={{
          input: {
            minHeight: 40,
            fontSize: '0.875rem',
            borderColor: error ? 'var(--calagopus-danger)' : 'var(--calagopus-border)',
            backgroundColor: 'var(--calagopus-surface)',
            color: 'var(--calagopus-text)',
          },
        }}
        classNames={classNames}
        {...rest}
      />
      {typeof error === 'string' && error ? (
        <ValidationMessage type="error" message={error} />
      ) : successMessage ? (
        <ValidationMessage type="success" message={successMessage} />
      ) : description ? (
        <ValidationMessage type="hint" message={String(description)} />
      ) : null}
    </div>
  );
}

export interface PasswordInputProps extends Omit<MantinePasswordInputProps, 'size'> {
  optional?: boolean;
}

export function PasswordInput({
  label,
  required,
  optional,
  error,
  description,
  id,
  ...rest
}: PasswordInputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <div className="w-full">
      {label ? (
        <FieldLabel htmlFor={inputId} required={required} optional={optional}>
          {label}
        </FieldLabel>
      ) : null}
      <MantinePasswordInput
        id={inputId}
        required={required}
        error={Boolean(error)}
        visibilityToggleIcon={({ reveal }) =>
          reveal ? (
            <EyeOff className="h-4 w-4 text-[var(--calagopus-text-secondary)]" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4 text-[var(--calagopus-text-secondary)]" aria-hidden="true" />
          )
        }
        visibilityToggleButtonProps={{
          'aria-label': 'Toggle password visibility',
        }}
        styles={{
          input: {
            minHeight: 40,
            fontSize: '0.875rem',
            borderColor: error ? 'var(--calagopus-danger)' : 'var(--calagopus-border)',
            backgroundColor: 'var(--calagopus-surface)',
            color: 'var(--calagopus-text)',
          },
          innerInput: {
            fontSize: '0.875rem',
            color: 'var(--calagopus-text)',
          },
        }}
        {...rest}
      />
      {typeof error === 'string' && error ? (
        <ValidationMessage type="error" message={error} />
      ) : description ? (
        <ValidationMessage type="hint" message={String(description)} />
      ) : null}
    </div>
  );
}

export interface SearchFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  onClear?: () => void;
}

export function SearchField({
  value,
  onChange,
  onClear,
  label,
  placeholder = 'Search...',
  className = '',
  id,
  ...rest
}: SearchFieldProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <div className={`w-full ${className}`}>
      {label ? <FieldLabel htmlFor={inputId}>{label}</FieldLabel> : null}
      <div className="relative flex items-center">
        <Search
          className="pointer-events-none absolute left-3 h-4 w-4 text-[var(--calagopus-text-secondary)]"
          aria-hidden="true"
        />
        <input
          id={inputId}
          type="text"
          role="searchbox"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="blush-transition blush-focus-ring h-10 w-full rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] pl-9 pr-9 text-sm text-[var(--calagopus-text)] placeholder:text-[var(--calagopus-text-secondary)] hover:border-[var(--calagopus-border-strong)] focus:border-[var(--calagopus-primary)] focus:outline-none"
          {...rest}
        />
        {value ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              onChange('');
              onClear?.();
            }}
            className="blush-focus-ring absolute right-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--calagopus-text-secondary)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-text)] cursor-pointer"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export interface TextareaProps extends Omit<MantineTextareaProps, 'size'> {
  optional?: boolean;
  monospace?: boolean;
}

export function Textarea({
  label,
  required,
  optional,
  monospace = false,
  error,
  description,
  id,
  minRows = 3,
  ...rest
}: TextareaProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <div className="w-full">
      {label ? (
        <FieldLabel htmlFor={inputId} required={required} optional={optional}>
          {label}
        </FieldLabel>
      ) : null}
      <MantineTextarea
        id={inputId}
        required={required}
        minRows={minRows}
        error={Boolean(error)}
        styles={{
          input: {
            fontSize: monospace ? '0.8125rem' : '0.875rem',
            fontFamily: monospace ? 'var(--calagopus-font-mono)' : undefined,
            borderColor: error ? 'var(--calagopus-danger)' : 'var(--calagopus-border)',
            backgroundColor: 'var(--calagopus-surface)',
            color: 'var(--calagopus-text)',
            paddingTop: '10px',
            paddingBottom: '10px',
          },
        }}
        {...rest}
      />
      {typeof error === 'string' && error ? (
        <ValidationMessage type="error" message={error} />
      ) : description ? (
        <ValidationMessage type="hint" message={String(description)} />
      ) : null}
    </div>
  );
}

export interface SelectDropdownProps extends Omit<MantineSelectProps, 'size'> {
  optional?: boolean;
}

export function SelectDropdown({
  label,
  required,
  optional,
  error,
  description,
  id,
  ...rest
}: SelectDropdownProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <div className="w-full">
      {label ? (
        <FieldLabel htmlFor={inputId} required={required} optional={optional}>
          {label}
        </FieldLabel>
      ) : null}
      <MantineSelect
        id={inputId}
        required={required}
        error={Boolean(error)}
        rightSection={
          <ChevronDown className="h-4 w-4 text-[var(--calagopus-text-secondary)]" aria-hidden="true" />
        }
        rightSectionWidth={32}
        styles={{
          input: {
            minHeight: 40,
            fontSize: '0.875rem',
            borderColor: error ? 'var(--calagopus-danger)' : 'var(--calagopus-border)',
            backgroundColor: 'var(--calagopus-surface)',
            color: 'var(--calagopus-text)',
          },
          section: {
            pointerEvents: 'none',
          },
        }}
        {...rest}
      />
      {typeof error === 'string' && error ? (
        <ValidationMessage type="error" message={error} />
      ) : description ? (
        <ValidationMessage type="hint" message={String(description)} />
      ) : null}
    </div>
  );
}

export type CheckboxProps = MantineCheckboxProps;

export function Checkbox({ label, description, ...rest }: CheckboxProps) {
  return (
    <MantineCheckbox
      label={label}
      description={description}
      color="#F4A6C1"
      iconColor="#29232A"
      styles={{
        input: {
          borderColor: 'var(--calagopus-border-strong)',
          cursor: 'pointer',
        },
        label: {
          fontSize: '0.875rem',
          color: 'var(--calagopus-text)',
          cursor: 'pointer',
        },
        description: {
          fontSize: '0.75rem',
          color: 'var(--calagopus-text-secondary)',
        },
      }}
      {...rest}
    />
  );
}

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly RadioOption[];
  error?: string;
}

export function RadioGroup({
  name,
  label,
  value,
  onChange,
  options,
  error,
}: RadioGroupProps) {
  return (
    <MantineRadio.Group
      name={name}
      value={value}
      onChange={onChange}
      label={
        label ? (
          <span className="text-[13px] font-medium text-[var(--calagopus-text)]">{label}</span>
        ) : undefined
      }
      error={error}
    >
      <div className="mt-2 flex flex-col gap-2.5">
        {options.map((opt) => (
          <MantineRadio
            key={opt.value}
            value={opt.value}
            label={opt.label}
            description={opt.description}
            disabled={opt.disabled}
            color="#F4A6C1"
            iconColor="#29232A"
            styles={{
              radio: {
                borderColor: 'var(--calagopus-border-strong)',
                cursor: 'pointer',
              },
              label: {
                fontSize: '0.875rem',
                color: 'var(--calagopus-text)',
                cursor: 'pointer',
              },
              description: {
                fontSize: '0.75rem',
                color: 'var(--calagopus-text-secondary)',
              },
            }}
          />
        ))}
      </div>
    </MantineRadio.Group>
  );
}

export interface SwitchInputProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}

export function SwitchInput({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  id,
}: SwitchInputProps) {
  const generatedId = React.useId();
  const switchId = id ?? generatedId;

  return (
    <div className="inline-flex items-center gap-2.5">
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`blush-transition blush-focus-ring relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border p-0.5 ${
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        } ${
          checked
            ? 'border-[var(--calagopus-primary)] bg-[var(--calagopus-primary)]'
            : 'border-[var(--calagopus-border-strong)] bg-[var(--calagopus-surface)]'
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full shadow-xs transition-transform duration-150 ${
            checked
              ? 'translate-x-4 bg-[#29232A]'
              : 'translate-x-0 bg-[var(--calagopus-text-secondary)]'
          }`}
        />
      </button>
      <div className="min-w-0">
        <label
          htmlFor={switchId}
          className={`block text-[13px] font-medium text-[var(--calagopus-text)] leading-snug select-none ${
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
          }`}
        >
          {label}
        </label>
        {description ? (
          <p className="text-[12px] text-[var(--calagopus-text-secondary)]">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size' | 'type' | 'value'> {
  label?: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
}

export function NumberInput({
  label,
  required,
  optional,
  error,
  description,
  value,
  onChange,
  id,
  className = '',
  min,
  max,
  step,
  ...rest
}: NumberInputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <div className="w-full">
      {label ? (
        <FieldLabel htmlFor={inputId} required={required} optional={optional}>
          {label}
        </FieldLabel>
      ) : null}
      <input
        id={inputId}
        type="number"
        min={min}
        max={max}
        step={step}
        required={required}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const next = e.currentTarget.value === '' ? 0 : Number(e.currentTarget.value);
          onChange(Number.isFinite(next) ? next : 0);
        }}
        className={`blush-transition blush-focus-ring h-10 w-full rounded-lg border px-3 text-sm font-mono text-[var(--calagopus-text)] bg-[var(--calagopus-surface)] focus:border-[var(--calagopus-primary)] focus:outline-none ${
          error ? 'border-[var(--calagopus-danger)]' : 'border-[var(--calagopus-border)]'
        } ${className}`}
        {...rest}
      />
      {error ? (
        <ValidationMessage type="error" message={error} />
      ) : description ? (
        <ValidationMessage type="hint" message={description} />
      ) : null}
    </div>
  );
}


