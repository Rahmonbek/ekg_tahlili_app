import React from 'react';
import Cleave from 'cleave.js/react';

const phoneOptions = {
  prefix: '+998',
  delimiters: [' (', ') ', '-', '-'],
  blocks: [4, 2, 3, 2, 2],
  numericOnly: true,
};

const PhoneInput = React.forwardRef(({ value, onChange, className = 'ant-input claveInput', ...props }, ref) => (
  <Cleave
    htmlRef={ref}
    value={value}
    onChange={onChange}
    options={phoneOptions}
    placeholder="+998 (__) ___-__-__"
    className={className}
    style={{ width: '100%', ...(props.style || {}) }}
    {...props}
  />
));

export default PhoneInput;
