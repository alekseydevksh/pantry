import { screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { setErrorReporter, type ErrorContext } from '@/lib/observability';
import { renderWithProviders } from '@/test/render';

import { FeatureErrorBoundary } from '../FeatureErrorBoundary';

const broken = { value: true };
function Bomb() {
  if (broken.value) throw new Error('render failed');
  return <Text>Screen content</Text>;
}

describe('FeatureErrorBoundary', () => {
  const reports: { error: unknown; context: ErrorContext }[] = [];
  let restoreReporter = () => {};

  beforeEach(() => {
    broken.value = true;
    reports.length = 0;
    restoreReporter = setErrorReporter((error, context) => reports.push({ error, context }));
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    restoreReporter();
    jest.restoreAllMocks();
  });

  it('shows a message with a retry instead of a red screen, and the retry works', async () => {
    const user = userEvent.setup();
    await renderWithProviders(
      <FeatureErrorBoundary feature="test">
        <Bomb />
      </FeatureErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeOnTheScreen();
    expect(screen.getByText('This screen ran into a problem. Try again.')).toBeOnTheScreen();
    expect(screen.queryByText('Screen content')).not.toBeOnTheScreen();

    broken.value = false;
    await user.press(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('Screen content')).toBeOnTheScreen();
    expect(screen.queryByText('Something went wrong')).not.toBeOnTheScreen();
  });

  it('reports the error with the name of the feature', async () => {
    await renderWithProviders(
      <FeatureErrorBoundary feature="recipe">
        <Bomb />
      </FeatureErrorBoundary>,
    );

    expect(reports).toHaveLength(1);
    expect(reports[0]?.error).toEqual(new Error('render failed'));
    expect(reports[0]?.context.source).toBe('react-boundary');
    expect(reports[0]?.context.extra?.feature).toBe('recipe');
    expect(reports[0]?.context.extra?.componentStack).toEqual(expect.stringContaining('Bomb'));
  });

  it('shows the message in Polish', async () => {
    await renderWithProviders(
      <FeatureErrorBoundary feature="test">
        <Bomb />
      </FeatureErrorBoundary>,
      { language: 'pl' },
    );

    expect(screen.getByText('Coś poszło nie tak')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Spróbuj ponownie' })).toBeOnTheScreen();
  });

  it('does nothing visible while the children work', async () => {
    broken.value = false;

    await renderWithProviders(
      <FeatureErrorBoundary feature="test">
        <Bomb />
      </FeatureErrorBoundary>,
    );

    expect(screen.getByText('Screen content')).toBeOnTheScreen();
    expect(reports).toHaveLength(0);
  });
});
