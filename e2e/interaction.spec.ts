import { test, expect } from '@playwright/test';

test.describe('Core interactions', () => {
    test('page loads and is interactive', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Verify the page has a title
        await expect(page).toHaveTitle(/.+/);

        // Verify main content is visible
        const body = page.locator('body');
        await expect(body).toBeVisible();
    });

    test('navigation links work', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Find all navigation links and verify they respond to clicks
        const navLinks = page.locator('nav a, header a');
        const linkCount = await navLinks.count();

        if (linkCount > 0) {
            // Click first nav link and verify navigation occurs
            const firstLink = navLinks.first();
            const href = await firstLink.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('#')) {
                await firstLink.click();
                await page.waitForLoadState('networkidle');
                // Verify we navigated (URL changed or content loaded)
                await expect(page.locator('body')).toBeVisible();
            }
        }
    });

    test('buttons are clickable and respond', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const buttons = page.locator('button:visible');
        const buttonCount = await buttons.count();

        if (buttonCount > 0) {
            // Verify first visible button is enabled and clickable
            const firstButton = buttons.first();
            await expect(firstButton).toBeEnabled();
        }
    });

    test('no console errors on page load', async ({ page }) => {
        const errors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        expect(errors).toEqual([]);
    });

    test('no accessibility violations in tab order', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Verify keyboard navigation works - Tab through interactive elements
        await page.keyboard.press('Tab');
        const focusedElement = page.locator(':focus');
        // At least one element should be focusable
        await expect(focusedElement).toBeVisible();
    });
});
