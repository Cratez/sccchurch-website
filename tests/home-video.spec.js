/**
 * FEATURE: "Latest service" YouTube embed on the home page, and its fallback message when
 *          the page is opened straight from a file (YouTube refuses to play there: "Error 153").
 * COVERS:  index.html (#watch section), assets/js/home.js, the .video styles in assets/css/home.css
 * WHY:     The embed must use the channel's uploads playlist so the newest service plays without
 *          weekly edits, and double-clicking index.html should explain why the video is missing.
 * UPDATE WHEN: the channel or playlist changes, or the video section is redesigned.
 * REMOVE WHEN: the home page no longer embeds a video.
 */
const path = require('path');
const { pathToFileURL } = require('url');
const { test, expect } = require('./support/fixtures');

const PLAYLIST = 'UU1Svz8uLW3raCDDP9I1eg_A';

test('embeds the channel uploads playlist, with a YouTube link as backup', async ({ page }) => {
  await page.goto('index.html');
  const iframe = page.locator('#watch .video iframe');
  await expect(iframe).toHaveAttribute('src', `https://www.youtube.com/embed/videoseries?list=${PLAYLIST}`);
  await expect(iframe).toHaveAttribute('title', /latest service/);
  await expect(page.locator('#watch .head a', { hasText: 'Watch on YouTube' })).toHaveAttribute('href', /youtube\.com/);
});

test('"Watch the latest service" button jumps to the video', async ({ page }) => {
  await page.goto('index.html');
  await page.getByRole('link', { name: /Watch the latest/ }).click();
  await expect(page).toHaveURL(/#watch$/);
  await expect(page.locator('#watch .video')).toBeInViewport();
});

test('opened from a file, shows an explanation and link instead of the player', async ({ page }) => {
  await page.goto(pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href);
  const box = page.locator('#watch .video');
  await expect(box).toHaveClass(/fallback/);
  await expect(box.locator('iframe')).toHaveCount(0);
  await expect(box).toContainText('only works on the live site or a local server');
  await expect(box.getByRole('link', { name: 'Watch on YouTube' })).toHaveAttribute('href', /youtube\.com/);
});
