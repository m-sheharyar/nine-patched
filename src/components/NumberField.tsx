import { Field } from './Field';
import { NumberInput } from './NumberInput';

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  float?: boolean;
}

export function NumberField({ label, ...input }: NumberFieldProps) {
  return <Field label={label}>{(id) => <NumberInput id={id} {...input} />}</Field>;
}
