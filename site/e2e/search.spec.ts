import { test, expect } from '@playwright/test'

test('landing page shows stats', async ({ page }) => {
  await page.goto('/publications/')
  await expect(page.locator('h1')).toContainText('OIML publication')
  // Stats should be visible
  const stats = page.locator('.bp-metric__value')
  await expect(stats.first()).toBeVisible()
})

test('browse page shows publication cards', async ({ page }) => {
  await page.goto('/publications/browse/')
  // Should have at least 100 cards
  const cards = page.locator('.pub-card-wrapper')
  await expect(cards.first()).toBeVisible()
  expect(await cards.count()).toBeGreaterThan(50)
})

test('browse filter works', async ({ page }) => {
  await page.goto('/publications/browse/recommendation/')
  // Click "Superseded" filter
  const filterBtn = page.locator('[data-status-filter="superseded"]')
  await filterBtn.click()
  // Cards should be filtered
  const visibleCards = page.locator('.pub-card-wrapper:visible')
  expect(await visibleCards.count()).toBeGreaterThan(0)
})

test('search loads Pagefind', async ({ page }) => {
  await page.goto('/publications/search/')
  // Wait for Pagefind input to appear
  await page.waitForSelector('#pf-search input[type="search"]', { timeout: 10000 })
  await expect(page.locator('#pf-search input[type="search"]')).toBeVisible()
})

test('search with query returns results', async ({ page }) => {
  await page.goto('/publications/search/?q=load+cell')
  await page.waitForSelector('#pf-search input[type="search"]', { timeout: 10000 })
  // Should have results
  await page.waitForSelector('.pagefind-ui__result', { timeout: 10000 })
  const results = page.locator('.pagefind-ui__result')
  expect(await results.count()).toBeGreaterThan(0)
})

test('pub series page shows editions', async ({ page }) => {
  await page.goto('/publications/pub/r60/')
  await expect(page.locator('h1')).toContainText('Metrological regulation for load cells')
  // Should list editions
  const editions = page.locator('section h2:has-text("Editions")')
  await expect(editions).toBeVisible()
})

test('pub instance page shows PDF viewer', async ({ page }) => {
  await page.goto('/publications/pub/b1-1968-e/')
  await expect(page.locator('h1')).toBeVisible()
  // PDF canvas should eventually render
  await page.waitForSelector('#pdf-canvas', { timeout: 10000 })
})

test('theme toggle works', async ({ page }) => {
  await page.goto('/publications/')
  const html = page.locator('html')
  const initialClass = await html.getAttribute('class')
  // Click theme toggle button
  const toggle = page.locator('button[aria-label="Toggle dark mode"]')
  await toggle.click()
  const newClass = await html.getAttribute('class')
  expect(newClass).not.toBe(initialClass)
})
