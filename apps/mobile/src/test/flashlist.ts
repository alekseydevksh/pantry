// FlashList in Jest. The list measures itself on the native side, which Jest does not have, so
// FlashList ships a Jest setup that fakes the layout (a 400 × 900 screen, rows of 100 pt). Rows of
// 100 pt make the list look short: it thinks the user is already at the end and asks for the next
// page at once, which a real feed with 280 pt cards never does. This mock keeps the idea and uses
// card-sized rows, so the tests start the way a real screen does.
//
// With these sizes only the rows near the scroll position are rendered, as on a device. A test
// scrolls with `scrollListTo` (src/test/flashlist-events.ts) to bring later rows into view.

/** Height of the fake screen, and the height of one row (a card with its photo). */
export const TEST_VIEWPORT = { width: 400, height: 800 };
export const TEST_ROW_HEIGHT = 280;

export const measureLayoutMock = () => ({
  ...jest.requireActual('@shopify/flash-list/dist/recyclerview/utils/measureLayout'),
  measureParentSize: () => ({ x: 0, y: 0, ...TEST_VIEWPORT }),
  measureFirstChildLayout: () => ({ x: 0, y: 0, ...TEST_VIEWPORT }),
  measureItemLayout: () => ({ x: 0, y: 0, width: TEST_VIEWPORT.width, height: TEST_ROW_HEIGHT }),
});
