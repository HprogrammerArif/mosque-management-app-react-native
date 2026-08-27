import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { Button } from './Button';

const wrap = (ui: React.ReactElement) => render(ui, { wrapper: ThemeProvider });

describe('Button', () => {
  it('exposes an accessible button role with its label', () => {
    const { getByRole } = wrap(<Button label="Sign in" onPress={() => {}} />);
    expect(getByRole('button', { name: 'Sign in' })).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByRole } = wrap(<Button label="Sign in" onPress={onPress} />);
    fireEvent.press(getByRole('button', { name: 'Sign in' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByRole } = wrap(<Button label="Sign in" disabled onPress={onPress} />);
    fireEvent.press(getByRole('button', { name: 'Sign in' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('announces the disabled state', () => {
    const { getByRole } = wrap(<Button label="Sign in" disabled onPress={() => {}} />);
    expect(getByRole('button', { name: 'Sign in' }).props.accessibilityState.disabled).toBe(true);
  });

  it('does not call onPress while loading', () => {
    const onPress = jest.fn();
    const { getByRole } = wrap(<Button label="Sign in" loading onPress={onPress} />);
    fireEvent.press(getByRole('button', { name: 'Sign in' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('meets the 48dp minimum touch target', () => {
    const { getByRole } = wrap(<Button label="Sign in" onPress={() => {}} />);
    const style = getByRole('button', { name: 'Sign in' }).props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
    expect(flat.minHeight).toBeGreaterThanOrEqual(48);
  });
});
