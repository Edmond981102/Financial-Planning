import type { InputHTMLAttributes } from 'react';

function stripCommas(value: string): string {
  return value.replace(/,/g, '');
}

function formatWithCommas(raw: string): string {
  if (!raw) return '';
  const [intPart, decPart] = raw.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
}

interface MoneyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: string | number;
  onChange: (raw: string) => void;
}

// Plain number inputs can't display thousands separators, so amounts are typed
// and shown as text here, stripping commas back out before the value reaches
// the caller's onChange.
export default function MoneyInput({ value, onChange, ...rest }: MoneyInputProps) {
  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      value={formatWithCommas(String(value ?? ''))}
      onChange={(e) => {
        const raw = stripCommas(e.target.value);
        if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return;
        onChange(raw);
      }}
    />
  );
}
