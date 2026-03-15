import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useRateLimitState } from '../stores/rateLimitStore';

interface RateLimitedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  overrideDisabled?: boolean;
  disabledText?: string;
}

export default function RateLimitedButton({
  children,
  overrideDisabled = false,
  disabledText,
  disabled: propDisabled,
  className = '',
  ...restProps
}: RateLimitedButtonProps) {
  const { isRateLimited, remainingTime } = useRateLimitState();

  const isDisabled = propDisabled || isRateLimited || overrideDisabled;
  const displayDisabledText = disabledText || `Retry in ${remainingTime}s`;

  return (
    <button
      disabled={isDisabled}
      className={`
        ${isDisabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'cursor-pointer hover:bg-opacity-90'
        }
        ${className}
      `}
      title={isDisabled ? displayDisabledText : undefined}
      {...restProps}
    >
      {isDisabled ? displayDisabledText : children}
    </button>
  );
}
