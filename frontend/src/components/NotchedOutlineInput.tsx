// src/components/NotchedOutlineInput.tsx
import React, { useState, useRef, useEffect, InputHTMLAttributes, ChangeEvent, FocusEvent, MouseEvent } from 'react';
import './NotchedOutlineInput.css'; // Make sure this path is correct

interface NotchedOutlineInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}

const NotchedOutlineInput: React.FC<NotchedOutlineInputProps> = ({
  label,
  id,
  value,
  onFocus,
  onBlur,
  onChange,
  disabled,
  type = "text", // Default type
  name,
  required,
  autoComplete,
  autoFocus,
  placeholder,
  readOnly,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(value != null && value !== '');
  // Internal state ONLY for password visibility toggle
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flag to determine if this component should have toggle functionality
  const isPasswordType = type === 'password';

  useEffect(() => {
    setHasValue(value != null && value !== '');
  }, [value]);

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    if (disabled || readOnly) return;
    setIsFocused(true);
    if (onFocus) {
      onFocus(event);
    }
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (disabled || readOnly) return;
    setIsFocused(false);
    // Use a slight delay on blur check in case the click was on the toggle icon
    setTimeout(() => {
      if (document.activeElement !== inputRef.current && document.activeElement?.closest('.password-toggle-icon') === null) {
        setHasValue(event.target.value != null && event.target.value !== '');
      }
    }, 0);
    if (onBlur) {
      onBlur(event);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
     if (disabled || readOnly) return;
     setHasValue(event.target.value != null && event.target.value !== '');
     if (onChange) {
         onChange(event);
     }
  };

  const togglePasswordVisibility = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault(); // Prevent potential form submit if inside form
    if (disabled || readOnly) return;
    setIsPasswordVisible(prev => !prev);
    // Optional: Refocus the input after toggling
    inputRef.current?.focus();
  };

  // Determine the actual type to pass to the input element
  const inputType = isPasswordType ? (isPasswordVisible ? 'text' : 'password') : type;

  const isLabelFloated = isFocused || hasValue || (!!placeholder && !value);
  const labelId = `${id}-label`;

  const containerClasses = [
    'notched-outline-input-container',
    isFocused ? 'is-focused' : '',
    isLabelFloated ? 'is-floated' : '',
    disabled ? 'is-disabled' : '',
    readOnly ? 'is-readonly' : '',
    isPasswordType ? 'has-toggle-icon' : '' // Add class if toggle is present
  ].filter(Boolean).join(' ');

  console.log(`Input ID: ${id}, isPasswordType: ${isPasswordType}`);
  return (
    <div className={containerClasses}>
      <label htmlFor={id} className="label" id={labelId}>
        {label}
      </label>
      <fieldset aria-hidden="true" className="fieldset">
        <legend className="legend">
           <span>{label}</span>
        </legend>
      </fieldset>
      <input
        ref={inputRef}
        id={id}
        value={value}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        disabled={disabled}
        type={inputType} // Use the dynamically determined type
        name={name}
        required={required}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        placeholder={placeholder}
        readOnly={readOnly}
        className="input"
        aria-labelledby={labelId}
        {...rest}
      />
      {/* Conditionally render the password toggle button */}
      {isPasswordType && (
          <button
            type="button" // Important: prevent form submission
            className="password-toggle-icon"
            onClick={togglePasswordVisibility}
            disabled={disabled || readOnly}
            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            tabIndex={-1} // Avoid tab stop for the button itself
          >
            {/* Ensure FontAwesome CSS is loaded in your project */}
            <i className={isPasswordVisible ? "fas fa-eye-slash" : "fas fa-eye"}></i>
          </button>
      )}
    </div>
  );
};

export default NotchedOutlineInput;
