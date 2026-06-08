import puppeteer from 'puppeteer'
import { setTimeout } from 'node:timers/promises'

const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
]
if (process.env.PROXY_SERVER) {
    const proxy_url = new URL(process.env.PROXY_SERVER)
    proxy_url.username = ''
    proxy_url.password = ''
    args.push(`--proxy-server=${proxy_url}`.replace(/\/$/, ''))
}

const browser = await puppeteer.launch({
    defaultViewport: { width: 1080, height: 1024 },
    args,
})
const [page] = await browser.pages()
const userAgent = await browser.userAgent()
await page.setUserAgent(userAgent.replace('Headless', '').replace('HeadlessChrome', 'Chrome'))

// ボット検知回避
await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false })
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] })
})

const recorder = await page.screencast({ path: 'recording.webm' })

try {
    if (process.env.PROXY_SERVER) {
        const { username, password } = new URL(process.env.PROXY_SERVER)
        if (username && password) {
            await page.authenticate({ username, password })
        }
    }

    await page.goto('https://secure.xserver.ne.jp/xapanel/login/xvps/', { waitUntil: 'networkidle2' })
    await page.locator('#memberid').fill(process.env.EMAIL)
    await page.locator('#user_password').fill(process.env.PASSWORD)
    await page.locator('text=ログインする').click()
    await page.waitForNavigation({ waitUntil: 'networkidle2' })
    await page.locator('a[href^="/xapanel/xvps/server/detail?id="]').click()
    await page.locator('text=更新する').click()
    await page.locator('text=引き続き無料VPSの利用を継続する').click()
    await page.waitForNavigation({ waitUntil: 'networkidle2' })
    const body = await page.$eval('img[src^="data:"]', img => img.src)
    const code = await fetch('https://captcha-120546510085.asia-northeast1.run.app', { method: 'POST', body }).then(r => r.text())
    await page.locator('[placeholder="上の画像の数字を入力"]').fill(code)

    // Cloudflare Turnstileのチェックボックス処理
    await setTimeout(2000)
    let cfClicked = false
    for (let i = 0; i < 10; i++) {
        const frames = page.frames()
        for (const frame of frames) {
            try {
                const checkbox = await frame.$('input[type="checkbox"]')
                if (checkbox) {
                    const box = await checkbox.boundingBox()
                    if (box) {
                        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
                        cfClicked = true
                        console.log('✅ Cloudflareチェックボックスクリック成功')
                        break
                    }
                }
            } catch (_) {}
        }
        if (cfClicked) break
        await setTimeout(1000)
    }
    await setTimeout(3000)

    await page.locator('text=無料VPSの利用を継続する').click()
    await page.waitForNavigation({ waitUntil: 'networkidle2' })
    console.log('✅ 更新完了！')
} catch (e) {
    console.error(e)
} finally {
    await setTimeout(5000)
    await recorder.stop()
    await browser.close()
}

try {
    if (process.env.PROXY_SERVER) {
        const { username, password } = new URL(process.env.PROXY_SERVER)
        if (username && password) {
            await page.authenticate({ username, password })
        }
    }

    await page.goto('https://secure.xserver.ne.jp/xapanel/login/xvps/', { waitUntil: 'networkidle2' })
    await page.locator('#memberid').fill(process.env.EMAIL)
    await page.locator('#user_password').fill(process.env.PASSWORD)
    await page.locator('text=ログインする').click()
    await page.waitForNavigation({ waitUntil: 'networkidle2' })
    await page.locator('a[href^="/xapanel/xvps/server/detail?id="]').click()
    await page.locator('text=更新する').click()
    await page.locator('text=引き続き無料VPSの利用を継続する').click()
    await page.waitForNavigation({ waitUntil: 'networkidle2' })
    const body = await page.$eval('img[src^="data:"]', img => img.src)
    const code = await fetch('https://captcha-120546510085.asia-northeast1.run.app', { method: 'POST', body }).then(r => r.text())
    await page.locator('[placeholder="上の画像の数字を入力"]').fill(code)

    // Cloudflareチェックボックス処理
    await setTimeout(2000)
    try {
        const frames = page.frames()
        for (const frame of frames) {
            if (frame.url().includes('challenges.cloudflare.com') || frame.url().includes('cloudflare')) {
                try {
                    await frame.locator('input[type="checkbox"]').click({ timeout: 5000 })
                    await setTimeout(3000)
                    break
                } catch (_) {}
            }
        }
        // iframeが見つからない場合はページ内のチェックボックスを直接クリック
        await page.evaluate(() => {
            const checkboxes = document.querySelectorAll('input[type="checkbox"]')
            for (const cb of checkboxes) {
                if (!cb.checked) cb.click()
            }
        })
        await setTimeout(2000)
    } catch (e) {
        console.log('Cloudflare checkbox error (continuing):', e.message)
    }

    await page.locator('text=無料VPSの利用を継続する').click()
    await page.waitForNavigation({ waitUntil: 'networkidle2' })
    console.log('✅ 更新完了！')
} catch (e) {
    console.error(e)
} finally {
    await setTimeout(5000)
    await recorder.stop()
    await browser.close()
}
