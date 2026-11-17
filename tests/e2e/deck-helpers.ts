import { expect, type Page } from '@playwright/test';

/** Exercise the retained keyboard alternative; there are no pagination controls. */
export async function turnDeck(page: Page, step = 1) {
  const deck = page.getByTestId('home-recommendation-deck');
  await expect(deck).toHaveAttribute('aria-busy', 'false');
  await deck.focus();
  await deck.press(step < 0 ? 'ArrowLeft' : 'ArrowRight');
}
export async function expectDeckCursor(page: Page, cursor: number) {
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem('@shoseijutsu-roku/discovery-deck/v1/free');
    return raw ? JSON.parse(raw).cursor : null;
  })).toBe(cursor);
}
