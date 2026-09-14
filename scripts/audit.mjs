import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { chromium } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';
const chrome = await launch({
  chromePath: chromium.executablePath(),
  chromeFlags: ['--headless', '--no-sandbox'],
});
try {
  const result = await lighthouse('http://127.0.0.1:4382', {
    port: chrome.port,
    output: 'html',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    logLevel: 'error',
  });
  await mkdir('docs/audits', { recursive: true });
  await writeFile('docs/audits/lighthouse.html', result.report);
  const summary = {
    categories: Object.fromEntries(
      Object.entries(result.lhr.categories).map(([k, v]) => [k, v.score * 100]),
    ),
    lcp: result.lhr.audits['largest-contentful-paint'].numericValue,
    cls: result.lhr.audits['cumulative-layout-shift'].numericValue,
    failed: Object.values(result.lhr.audits)
      .filter((a) => a.score !== null && a.score < 1)
      .map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        details: a.details,
      })),
  };
  await writeFile(
    'docs/audits/lighthouse.json',
    JSON.stringify(summary, null, 2),
  );
  console.log(
    JSON.stringify({
      categories: summary.categories,
      lcp: summary.lcp,
      cls: summary.cls,
    }),
  );
} finally {
  chrome.kill();
}
