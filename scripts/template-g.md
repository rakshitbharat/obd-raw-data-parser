Okay, here is the template file (`template-changes.md`) containing examples of file modifications in the specified format. Your script can use this structure to parse the file paths and the corresponding code content.

```markdown
--- START OF FILE template-changes.md ---

# Template for File Changes Script

This document shows the correct format for defining file modifications
that can be parsed and applied by an automated script. Each file modification
must be wrapped in the specified START and END markers, and the code block
must include a `// filepath:` comment indicating the target file path.

--- START OF MODIFIED FILE src/services/apiClient.ts ---
```

```typescript
// filepath: src/services/apiClient.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for adding auth tokens
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

export default apiClient;
```

```markdown
--- END OF MODIFIED FILE src/services/apiClient.ts ---
```

---

```markdown
--- START OF MODIFIED FILE src/components/common/Button.tsx ---
```

```tsx
// filepath: src/components/common/Button.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  style,
  textStyle,
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabledButton, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 5,
  },
  disabledButton: {
    backgroundColor: '#A9A9A9', // Grey out when disabled
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

```markdown
--- END OF MODIFIED FILE src/components/common/Button.tsx ---
```

---

```markdown
--- START OF MODIFIED FILE src/utils/formatting.ts ---
```

```typescript
// filepath: src/utils/formatting.ts

/**
 * Formats a number as currency.
 * Example: formatCurrency(1234.5) => "$1,234.50"
 *
 * @param value - The number to format.
 * @param currencySymbol - The currency symbol to use (default: '$').
 * @param decimalPlaces - The number of decimal places (default: 2).
 * @returns The formatted currency string.
 */
export const formatCurrency = (
  value: number,
  currencySymbol: string = '$',
  decimalPlaces: number = 2,
): string => {
  if (isNaN(value)) {
    return ''; // Return empty for invalid input
  }
  const fixedValue = value.toFixed(decimalPlaces);
  const parts = fixedValue.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); // Add thousand separators
  return `${currencySymbol}${parts.join('.')}`;
};

// Example of adding another function to the same file
/**
 * Capitalizes the first letter of a string.
 * @param str The input string.
 * @returns The capitalized string.
 */
export const capitalizeFirstLetter = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

```

```markdown
--- END OF MODIFIED FILE src/utils/formatting.ts ---
```

---

```markdown
--- START OF MODIFIED FILE src/config/constants.ts ---
```

```typescript
// filepath: src/config/constants.ts
// Example of modifying an existing file by adding a constant

export const API_BASE_URL = '/api/v1';
export const DEFAULT_TIMEOUT = 5000;

// Added constant
export const MAX_RETRIES = 3;
```

```markdown
--- END OF MODIFIED FILE src/config/constants.ts ---
```

--- END OF FILE template-changes.md ---
```