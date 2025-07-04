import express from 'express';
import puppeteer from 'puppeteer';

const app = express();
const PORT = 3001;

console.log("START!");

app.get('/track', async (req, res) => {
  const { tracking } = req.query;
  if (!tracking) return res.status(400).json({ error: 'Trackingnummer fehlt' });

  try {
    const url = `https://service.post.ch/ekp-web/ui/entry/search/${tracking}?lang=de`;
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });

    await page.waitForSelector('.font-weight-bold.h4', { timeout: 15000 });

    // Button "Frühere anzeigen" immer anklicken solange vorhanden
    let hasMore = true;
    while (hasMore) {
      hasMore = await page.evaluate(() => {
        const allLinks = Array.from(document.querySelectorAll('a.text-link'));
        const match = allLinks.find(a => a.textContent.includes('Frühere anzeigen'));
        if (match) { match.click(); return true; }
        return false;
      });
      if (hasMore) await new Promise(r => setTimeout(r, 700));
    }

    // Neu: deliveryEstimate extrahieren!
    let deliveryEstimate = null;
    try {
      deliveryEstimate = await page.$eval(
        '#calculatedDeliveryDateNoAveDeliveryRange .font-weight-bold.h4',
        el => el.textContent.trim()
      );
    } catch (e) {
      deliveryEstimate = null;
    }

    // Timeline wie gehabt
    const timeline = await page.$$eval('ekp-event-day', days =>
      Array.from(days).flatMap(day => {
        const date = day.querySelector('.sub-menu-item span')?.innerText ?? '';
        return Array.from(day.querySelectorAll('ekp-event-item .row.event')).map(row => {
          const time = row.querySelector('.time')?.innerText.trim() ?? '';
          const desc = row.querySelectorAll('div.col-8 > div')[0]?.innerText.trim() ?? '';
          const location = row.querySelectorAll('div.col-8 > div')[1]?.innerText.trim() ?? '';
          return { date, time, desc, location };
        });
      })
    );

    await browser.close();

    // Rückgabe jetzt inkl. deliveryEstimate!
    res.json({ deliveryEstimate, timeline });
  } catch (err) {
    console.error("SCRAPER-ERROR:", err);
    res.status(500).json({ error: "Scraper-Fehler", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});