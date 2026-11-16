import React, { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, TextInputProps } from 'react-native';
import { colors, fonts } from '../theme';

interface Props extends TextInputProps {
  error?: boolean;
}


export const AuthInput = forwardRef<React.ElementRef<typeof TextInput>, Props>(
  ({ error, style, onFocus, onBlur, ...rest }, ref) => {
    const [focused, setFocused] = useState(false);
    return (
      <TextInput
        ref={ref}
        placeholderTextColor={colors.muted}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, focused && styles.focused, error && styles.error, style]}
      />
    );
  },
);
AuthInput.displayName = 'AuthInput';

export const inputBase = {
  height: 50,
  paddingHorizontal: 14,
  borderRadius: 8,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
} as const;

const styles = StyleSheet.create({
  input: {
    ...inputBase,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  focused: { borderColor: colors.accent, backgroundColor: colors.black },
  error: { borderColor: colors.danger },
});
