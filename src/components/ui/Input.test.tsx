import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { Input } from './Input';

const wrap = (ui: React.ReactElement) => render(ui, { wrapper: ThemeProvider });

describe('Input', () => {
  it('associates the visible label with the field', () => {
    const { getByLabelText } = wrap(<Input label="Password" value="" onChangeText={() => {}} />);
    expect(getByLabelText('Password')).toBeTruthy();
  });

  it('reports changes', () => {
    const onChangeText = jest.fn();
    const { getByLabelText } = wrap(<Input label="Password" value="" onChangeText={onChangeText} />);
    fireEvent.changeText(getByLabelText('Password'), 'secret');
    expect(onChangeText).toHaveBeenCalledWith('secret');
  });

  it('renders an error message and marks the field invalid', () => {
    const { getByText, getByLabelText } = wrap(
      <Input label="Password" value="" onChangeText={() => {}} error="Use at least 8 characters" />,
    );
    expect(getByText('Use at least 8 characters')).toBeTruthy();
    // aria-invalid, not accessibilityInvalid — the latter is not a real RN prop
    // and would be an inert passthrough that never reaches TalkBack.
    expect(getByLabelText('Password').props['aria-invalid']).toBe(true);
  });

  it('renders a hint when there is no error', () => {
    const { getByText } = wrap(
      <Input label="Phone" value="" onChangeText={() => {}} hint="Include the country code" />,
    );
    expect(getByText('Include the country code')).toBeTruthy();
  });
});
