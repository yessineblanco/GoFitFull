import React from 'react';
import { TouchableWithoutFeedback, Keyboard, View, ViewProps } from 'react-native';

interface KeyboardDismissViewProps extends ViewProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that dismisses keyboard when tapping outside input fields
 */
export const KeyboardDismissView: React.FC<KeyboardDismissViewProps> = ({
  children,
  style,
  ...props
}) => {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={style} {...props}>
        {children}
      </View>
    </TouchableWithoutFeedback>
  );
};

