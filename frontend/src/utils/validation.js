/**
 * Form validation utilities for consistent validation across the app.
 * Can be used with react-hook-form or standalone.
 */

export const validators = {
  required: (fieldName) => ({
    value: true,
    message: `${fieldName} is required`
  }),

  minLength: (length, fieldName) => ({
    value: length,
    message: `${fieldName} must be at least ${length} characters`
  }),

  maxLength: (length, fieldName) => ({
    value: length,
    message: `${fieldName} must not exceed ${length} characters`
  }),

  pattern: (regex, message) => ({
    value: regex,
    message
  }),

  email: {
    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
    message: 'Invalid email address'
  },

  phone: {
    value: /^[\d\s\-\+\(\)]+$/,
    message: 'Invalid phone number'
  },

  number: {
    value: /^\d+(\.\d+)?$/,
    message: 'Must be a valid number'
  },

  positiveNumber: {
    value: /^[1-9]\d*(\.\d+)?$/,
    message: 'Must be a positive number'
  },

  username: {
    value: /^[a-zA-Z0-9_]{3,20}$/,
    message: 'Username must be 3-20 characters (letters, numbers, underscores only)'
  },

  password: (minLength = 6) => ({
    value: new RegExp(`^.{${minLength},}$`),
    message: `Password must be at least ${minLength} characters`
  }),

  url: {
    value: /^https?:\/\/.+/,
    message: 'Must be a valid URL'
  },

  custom: (validationFn, message) => (value) => {
    return validationFn(value) || message;
  }
};

/**
 * Validation schemas for common forms
 */
export const schemas = {
  customer: {
    name: {
      required: validators.required('Customer name'),
      minLength: validators.minLength(2, 'Customer name'),
      maxLength: validators.maxLength(100, 'Customer name')
    },
    phone: {
      required: validators.required('Phone number'),
      pattern: validators.phone
    },
    address: {
      required: validators.required('Address'),
      minLength: validators.minLength(5, 'Address')
    }
  },

  worker: {
    username: {
      required: validators.required('Username'),
      pattern: validators.username
    },
    password: {
      required: validators.required('Password'),
      pattern: validators.password(6)
    }
  },

  newspaper: {
    name: {
      required: validators.required('Newspaper name'),
      minLength: validators.minLength(2, 'Newspaper name'),
      maxLength: validators.maxLength(100, 'Newspaper name')
    },
    base_price: {
      required: validators.required('Base price'),
      pattern: validators.positiveNumber
    }
  },

  subscription: {
    newspaper_id: {
      required: validators.required('Newspaper')
    },
    customer_id: {
      required: validators.required('Customer')
    },
    quantity: {
      required: validators.required('Quantity'),
      pattern: validators.positiveNumber
    },
    custom_price: {
      pattern: validators.positiveNumber
    }
  }
};

/**
 * Manual validation helper (for non-react-hook-form cases)
 */
export const validateField = (value, rules) => {
  for (const [ruleName, ruleConfig] of Object.entries(rules)) {
    if (ruleName === 'required' && ruleConfig.value) {
      if (!value || (typeof value === 'string' && !value.trim())) {
        return ruleConfig.message;
      }
    }

    if (ruleName === 'minLength' && value) {
      if (value.length < ruleConfig.value) {
        return ruleConfig.message;
      }
    }

    if (ruleName === 'maxLength' && value) {
      if (value.length > ruleConfig.value) {
        return ruleConfig.message;
      }
    }

    if (ruleName === 'pattern' && value) {
      if (!ruleConfig.value.test(value)) {
        return ruleConfig.message;
      }
    }
  }

  return null;
};

/**
 * Validate entire form object
 */
export const validateForm = (formData, schema) => {
  const errors = {};

  for (const [fieldName, rules] of Object.entries(schema)) {
    const error = validateField(formData[fieldName], rules);
    if (error) {
      errors[fieldName] = error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Display error helper component props
 */
export const getErrorProps = (errors, fieldName) => {
  if (errors[fieldName]) {
    return {
      error: true,
      helperText: errors[fieldName]
    };
  }
  return {};
};
