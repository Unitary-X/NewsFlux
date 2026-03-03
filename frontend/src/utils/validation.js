/**
 * Form validation utilities for consistent validation across the app.
 * Can be used with react-hook-form or standalone.
 * @module utils/validation
 */

/**
 * Reusable validation rule creators
 * Each validator returns an object with 'value' (for react-hook-form) and 'message' (error text)
 * @type {Object}
 */
export const validators = {
  /**
   * @param {string} fieldName - Display name of the field
   * @returns {{value: boolean, message: string}} Required validation rule
   */
  required: (fieldName) => ({
    value: true,
    message: `${fieldName} is required`
  }),

  /**
   * @param {number} length - Minimum character length
   * @param {string} fieldName - Display name of the field
   * @returns {{value: number, message: string}} Min length validation rule
   */
  minLength: (length, fieldName) => ({
    value: length,
    message: `${fieldName} must be at least ${length} characters`
  }),

  /**
   * @param {number} length - Maximum character length
   * @param {string} fieldName - Display name of the field
   * @returns {{value: number, message: string}} Max length validation rule
   */
  maxLength: (length, fieldName) => ({
    value: length,
    message: `${fieldName} must not exceed ${length} characters`
  }),

  /**
   * @param {RegExp} regex - Pattern to match
   * @param {string} message - Error message if pattern doesn't match
   * @returns {{value: RegExp, message: string}} Pattern validation rule
   */
  pattern: (regex, message) => ({
    value: regex,
    message
  }),

  /** Email validation - regex pattern and error message */
  email: {
    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
    message: 'Invalid email address'
  },

  /** Phone validation - allows digits, spaces, dashes, plus, parentheses */
  phone: {
    value: /^[\d\s\-\+\(\)]+$/,
    message: 'Invalid phone number'
  },

  /** Number validation - allows integers and decimals */
  number: {
    value: /^\d+(\.\d+)?$/,
    message: 'Must be a valid number'
  },

  /** Positive number validation - excludes zero and negatives */
  positiveNumber: {
    value: /^[1-9]\d*(\.\d+)?$/,
    message: 'Must be a positive number'
  },

  /** Username validation - 3-20 chars of letters, numbers, underscores */
  username: {
    value: /^[a-zA-Z0-9_]{3,20}$/,
    message: 'Username must be 3-20 characters (letters, numbers, underscores only)'
  },

  /**
   * Dynamic password length validation
   * @param {number} minLength - Minimum password length (default: 6)
   * @returns {{value: RegExp, message: string}} Password validation rule
   */
  password: (minLength = 6) => ({
    value: new RegExp(`^.{${minLength},}$`),
    message: `Password must be at least ${minLength} characters`
  }),

  /** URL validation - must start with http:// or https:// */
  url: {
    value: /^https?:\/\/.+/,
    message: 'Must be a valid URL'
  },

  /**
   * Custom validation function
   * @param {Function} validationFn - Function that returns true if valid
   * @param {string} message - Error message if validation fails
   * @returns {Function} Validation function to use with react-hook-form
   */
  custom: (validationFn, message) => (value) => {
    return validationFn(value) || message;
  }
};

/**
 * Pre-built validation schemas for common forms
 * Each schema maps field names to their validation rules
 * @type {Object<string, Object<string, *>>}
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
 * Validate a single field value against validation rules
 * Useful for standalone validation outside of react-hook-form
 * 
 * @param {*} value - Field value to validate
 * @param {Object} rules - Validation rules object with rule names as keys
 * @returns {string|null} Error message if validation fails, null if valid
 * 
 * @example
 * const error = validateField('john', { 
 *   required: { value: true, message: 'Required' },
 *   minLength: { value: 5, message: 'Too short' }
 * });
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
 * Validate entire form object against a schema
 * 
 * @param {Object} formData - Object with field names as keys and values to validate
 * @param {Object} schema - Validation schema with field names and their rules
 * @returns {{isValid: boolean, errors: Object<string, string>}} Validation result
 * 
 * @example
 * const result = validateForm(
 *   { name: 'John', age: '' },
 *   { name: { required: {...} }, age: { required: {...} } }
 * );
 * // { isValid: false, errors: { age: 'Age is required' } }
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
 * Get error props for Material-UI or similar components
 * Simplifies passing error state to form components
 * 
 * @param {Object} errors - Errors object from validateForm()
 * @param {string} fieldName - Name of the field to get error props for
 * @returns {{error: boolean, helperText: string}|{}} Props object or empty if no error
 * 
 * @example
 * <TextField {...getErrorProps(errors, 'email')} />
 * // Returns { error: true, helperText: 'Invalid email address' } if error exists
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

