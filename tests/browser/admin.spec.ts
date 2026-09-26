import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import content from '../../data/content.json'
import gym from '../../data/gym.json'
import media from '../../data/media.json'
import { snapshotSchema, type Snapshot } from '../../lib/content-schema'

async function mockApi(page: Page, options: { signedIn?: boolean; interrupted?: boolean } = {}) {
  let signedIn = options.signedIn ?? true, saved = snapshotSchema.parse(structuredClone({ content, gym, media })), revision = 'a'.repeat(40)
  const original = structuredClone(saved), operations: string[] = []
  await page.route('**/api/admin/**', async route => {
    const request = route.request(), url = new URL(request.url()), endpoint = url.pathname.split('/').at(-1)
    const reply = (data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
    if (endpoint === 'login') { const body = request.postDataJSON(); if (body.password !== 'test-password') return reply({ error: 'Invalid username or password' }, 401); signedIn = true; return reply({ csrf: 'csrf', expiresAt: Date.now() + 28800000 }) }
    if (!signedIn) return reply({ error: 'Sign in to continue' }, 401)
    if (endpoint === 'session') return reply({ csrf: 'csrf', expiresAt: Date.now() + 28800000, environment: 'preview' })
    if (endpoint === 'logout') { signedIn = false; return reply({ ok: true }) }
    if (endpoint === 'content') return reply({ snapshot: saved, revision })
    if (endpoint === 'deployment') return reply({ state: 'live', message: 'Preview deployed', url: 'https://example.test' })
    if (endpoint === 'media') { const file = url.searchParams.get('path')!; const source = fs.existsSync(`public${file}`) ? `public${file}` : 'public/media/hero-gym.jpg'; return route.fulfill({ contentType: source.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg', body: fs.readFileSync(source) }) }
    if (endpoint === 'history') return reply([{ revision: 'a'.repeat(40), message: 'Original content', date: '2026-09-26T00:00:00Z' }, { revision, message: 'Updated content', date: '2026-09-26T01:00:00Z' }])
    if (endpoint === 'upload') return reply({ id: 'asset-upload', path: '/media/asset-upload.jpg', name: 'New photograph.jpg', type: 'image/jpeg', size: 500 }, 201)
    if (endpoint === 'save' || endpoint === 'restore') {
      const body = request.postDataJSON(); operations.push(body.operationId)
      if (options.interrupted && operations.length === 1) return route.abort('failed')
      saved = endpoint === 'restore' ? original : body.snapshot as Snapshot; revision = 'b'.repeat(40)
      return reply({ revision, operationId: body.operationId })
    }
    return reply({ error: 'Unknown endpoint' }, 404)
  })
  return { getSaved: () => saved, operations }
}
test('login errors and sign out work without exposing the editor', async ({ page }) => {
  await mockApi(page, { signedIn: false }); await page.goto('/admin')
  await expect(page.getByRole('heading', { name: /Your website.*Your updates/ })).toBeVisible()
  await page.getByLabel('Username').fill('admin'); await page.getByLabel('Password', { exact: true }).fill('wrong'); await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByText('Invalid username or password', { exact: true })).toBeVisible()
  await page.screenshot({ path: 'test-results/admin-login.png', fullPage: true })
  await page.getByLabel('Password', { exact: true }).fill('test-password'); await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click(); await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
})
test('edit details, add trainer, hide section, preview, save and restore', async ({ page }) => {
  const api = await mockApi(page); await page.goto('/admin')
  await page.getByRole('button', { name: 'Gym details', exact: true }).click()
  await page.getByLabel('Phone', { exact: true }).fill('+919999999999')
  await page.getByRole('button', { name: 'Trainers', exact: true }).click()
  await page.getByRole('button', { name: 'Add people' }).click()
  await expect(page.getByLabel('Name', { exact: true })).toHaveCount(7)
  await page.getByLabel('Name', { exact: true }).last().fill('New coach')
  await page.getByRole('button', { name: 'Page structure', exact: true }).click()
  await page.getByLabel('Gallery', { exact: true }).uncheck()
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(page.frameLocator('iframe').getByRole('heading', { name: 'New coach' })).toBeVisible({ timeout: 15000 })
  await expect(page.frameLocator('iframe').locator('#gallery')).toHaveCount(0)
  await page.getByRole('button', { name: 'Close preview' }).click()
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByText('All changes saved', { exact: true })).toBeVisible()
  expect(api.getSaved().gym.gym.contact.phone).toBe('+919999999999')
  expect(api.getSaved().content.trainers.people).toHaveLength(7)
  await page.getByRole('button', { name: 'History', exact: true }).click()
  page.once('dialog', d => d.accept()); await page.getByRole('button', { name: 'Restore', exact: true }).first().click()
  await expect(page.getByText('All changes saved', { exact: true })).toBeVisible()
  expect(api.getSaved().gym.gym.contact.phone).toBe(gym.gym.contact.phone)
})
test('save retry keeps the same operation identifier and locks edits', async ({ page }) => {
  const api = await mockApi(page, { interrupted: true }); await page.goto('/admin')
  await page.getByRole('button', { name: 'Gym details', exact: true }).click(); await page.getByLabel('Name', { exact: true }).fill('Updated gym')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Retry save' })).toBeVisible()
  await expect(page.getByLabel('Name', { exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Retry save' }).click()
  await expect(page.getByText('All changes saved', { exact: true })).toBeVisible()
  expect(api.operations).toHaveLength(2); expect(api.operations[0]).toBe(api.operations[1])
})
test('replaces a photograph everywhere and blocks deletion while referenced', async ({ page }) => {
  const api = await mockApi(page); await page.goto('/admin')
  await page.getByRole('button', { name: 'Media library', exact: true }).click()
  const asset = page.locator('article').filter({ has: page.getByRole('heading', { name: 'hero-gym.jpg', exact: true }) })
  await expect(asset.getByRole('button', { name: 'Remove', exact: true })).toBeDisabled()
  await asset.getByRole('button', { name: 'Replace', exact: true }).click()
  await page.getByLabel('Resize images to 2400px and compress when smaller').uncheck()
  await page.getByLabel('Upload media').setInputFiles('public/media/hero-gym.jpg')
  await expect(page.getByRole('heading', { name: 'New photograph.jpg' })).toBeVisible()
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByText('All changes saved', { exact: true })).toBeVisible()
  expect(api.getSaved().content.gallery.images[0].src).toBe('/media/asset-upload.jpg')
  expect(api.getSaved().content.hero.poster).toBe('/media/asset-upload.jpg')
})
test('desktop and mobile editors render without horizontal overflow', async ({ page }) => {
  await mockApi(page); await page.goto('/admin'); await page.getByRole('button', { name: 'Gym details', exact: true }).click()
  await expect(page.getByLabel('Name', { exact: true })).toBeVisible()
  await page.screenshot({ path: 'test-results/admin-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeVisible()
  await page.screenshot({ path: 'test-results/admin-mobile.png', fullPage: true })
  const overflow = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth }))
  expect(overflow, JSON.stringify(overflow)).toEqual({ width: 390, viewport: 390 })
})
test('public site retains its sections and WhatsApp links', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('main')).toBeVisible(); await expect(page.locator('#trainers article')).toHaveCount(6)
  await expect(page.locator('#gallery img')).toHaveCount(6)
  await expect(page.locator('.whatsapp-float')).toHaveAttribute('href', 'https://wa.me/919876543210')
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /hero-gym.jpg/)
  await page.screenshot({ path: 'test-results/public-desktop.png', fullPage: true })
})
