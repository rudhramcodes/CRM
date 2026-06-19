import { forwardRef } from 'react';
import Textarea from '../ui/Textarea';

const FormTextarea = forwardRef(function FormTextarea(
  { label, error, ...props },
  ref,
) {
  return <Textarea ref={ref} label={label} error={error} {...props} />;
});

export default FormTextarea;
