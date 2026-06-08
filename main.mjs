import { connect } from 'puppeteer-real-browser'
import { setTimeout } from 'node:timers/promises'

const args = ['--no-sandbox', '--disable-setuid-sandbox']
if (process.env.PROXY_SERVER) {
    const proxy_url = new URL(process.env.PROXY_SERVER)
    proxy_url.username = ''
    proxy_url.password = ''
    args.push(`--proxy-server=${proxy_url}`.replace(/\/$/, ''))
}

const { browser, page } = await connect({
    headless: false,
    args,
    customConfig: {},
    turnstile: true,
    connectOption: {
        defaultViewport: { width: 1920, height: 1080 }
    },
    disableXvfb: false,
    ignoreAllFlags: false,
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
    await page.waitForNavigation({ waitUntil: 'networkidle2' })
    await page.locator('text=更新する').click()
    await page.locator('text=引き続き無料VPSの利用を継続する').click()
    await page.waitForNavigation({ waitUntil: 'networkidle2' })

    // CAPTCHA処理
    const body = await page.$eval('img[src^="data:"]', img => img.src)
    const code = await fetch('https://captcha-120546510085.asia-northeast1.run.app', { method: 'POST', body }).then(r => r.text())
    await page.locator('[placeholder="上の画像の数字を入力"]').fill(code.trim())
    console.log('CAPTCHA入力:', code.trim())
    await setTimeout(1000)

    // Cloudflareチェックボックスの位置を取得してクリック
    const cfBox = await page.evaluate(() => {
        const iframes = document.querySelectorAll('iframe')
        for (const iframe of iframes) {
            const rect = iframe.getBoundingClientRect()
            if (rect.width > 0 && rect.height > 0) {
                return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, src: iframe.src }
            }
        }
        return null
    })

    if (cfBox) {
        console.log('iframe found:', cfBox)
        await page.mouse.click(cfBox.x + 25, cfBox.y + cfBox.height / 2)
        console.log('✅ Cloudflareクリック座標:', cfBox.x + 25, cfBox.y + cfBox.height / 2)
    } else {
        console.log('iframe not found, trying direct click')
        // CAPTCHAフォームの下にあるチェックボックス付近をクリック
        const inputBox = await page.$eval('[placeholder="上の画像の数字を入力"]', el => {
            const rect = el.getBoundingClientRect()
            return { x: rect.x, y: rect.y, height: rect.height }
        })
        // 入力欄の下100px付近をクリック
        await page.mouse.click(inputBox.x + 25, inputBox.y + inputBox.height + 60)
        console.log('✅ 直接座標クリック')
    }

    await setTimeout(5000)
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
