import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  KeyboardAvoidingView,
  Keyboard,
  TextInput,
  Platform,
  StyleSheet,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
  type NativeSyntheticEvent,
  type TargetedEvent,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

export type KeyboardAwareScrollViewProps = ScrollViewProps & {
  children?: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  extraScrollHeight?: number;
  enableSafeArea?: boolean;
  safeAreaEdges?: readonly Edge[];
  keyboardVerticalOffset?: number;
};

export const KeyboardAwareScrollView = forwardRef<ScrollView, KeyboardAwareScrollViewProps>(
  (
    {
      children,
      style,
      contentContainerStyle,
      extraScrollHeight = 140,
      enableSafeArea = false,
      safeAreaEdges,
      keyboardVerticalOffset = Platform.OS === 'ios' ? 64 : 0,
      keyboardShouldPersistTaps = 'handled',
      automaticallyAdjustKeyboardInsets = true,
      keyboardDismissMode = 'interactive',
      ...rest
    },
    ref,
  ) => {
    const scrollRef = useRef<ScrollView | null>(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useImperativeHandle(ref, () => scrollRef.current as ScrollView);

    useEffect(() => {
      const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
      const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

      const showSub = Keyboard.addListener(showEvent, (e) => {
        const height = e.endCoordinates ? e.endCoordinates.height : 0;
        setKeyboardHeight(height);

        const focused = TextInput.State.currentlyFocusedInput();
        if (focused && scrollRef.current) {
          setTimeout(() => {
            try {
              scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(
                focused,
                extraScrollHeight,
                true,
              );
            } catch {
              // fallback if handle is unavailable
            }
          }, 80);
        }
      });

      const hideSub = Keyboard.addListener(hideEvent, () => {
        setKeyboardHeight(0);
      });

      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }, [extraScrollHeight]);

    const handleFocus = (e: NativeSyntheticEvent<TargetedEvent>) => {
      const target = e.nativeEvent?.target;
      if (target != null && scrollRef.current) {
        setTimeout(() => {
          try {
            scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(
              target,
              extraScrollHeight,
              true,
            );
          } catch {
            // fallback if handle is unavailable
          }
        }, 120);
      }
    };

    const innerContent = (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          ref={scrollRef}
          style={[styles.scroll, style]}
          contentContainerStyle={[
            styles.contentContainer,
            contentContainerStyle,
            {
              paddingBottom:
                extraScrollHeight + (Platform.OS === 'android' ? keyboardHeight : 0),
            },
          ]}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          automaticallyAdjustKeyboardInsets={automaticallyAdjustKeyboardInsets}
          keyboardDismissMode={keyboardDismissMode}
          showsVerticalScrollIndicator={false}
          {...rest}
        >
          <View style={styles.innerView} onFocus={handleFocus}>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );

    if (enableSafeArea) {
      return (
        <SafeAreaView
          style={[styles.safeArea, style]}
          {...(safeAreaEdges !== undefined ? { edges: safeAreaEdges } : {})}
        >
          {innerContent}
        </SafeAreaView>
      );
    }

    return innerContent;
  },
);

KeyboardAwareScrollView.displayName = 'KeyboardAwareScrollView';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  innerView: {
    flex: 1,
  },
});
