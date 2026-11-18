// Scrolling a FlashList in a test. Not a test file; see ./flashlist.ts for the fake layout.
import { act, fireEvent, screen } from '@testing-library/react-native';

import { TEST_ROW_HEIGHT, TEST_VIEWPORT } from './flashlist';

/**
 * Scrolls the list with the given test id so that row number `rowIndex` is at the top, as if the
 * user had flicked down to it. `rowCount` is how many rows the list has loaded; the list needs
 * it for the content height, and it decides whether the end is near.
 */
export async function scrollListTo(testID: string, rowIndex: number, rowCount: number) {
  await act(async () => {
    fireEvent.scroll(screen.getByTestId(testID), {
      nativeEvent: {
        contentOffset: { y: rowIndex * TEST_ROW_HEIGHT },
        contentSize: { width: TEST_VIEWPORT.width, height: rowCount * TEST_ROW_HEIGHT },
        layoutMeasurement: TEST_VIEWPORT,
      },
    });
  });
}
