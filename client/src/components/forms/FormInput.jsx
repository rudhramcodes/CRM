import { forwardRef } from 'react';
import Input from '../ui/Input';

const FormInput = forwardRef(function FormInput(
  { label, error, ...props },
  ref,
) {
  return <Input ref={ref} label={label} error={error} {...props} />;
});

export default FormInput;
