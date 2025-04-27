// puppeteer_script.js
import {setTimeout} from "node:timers/promises";
import puppeteer from "puppeteer";
// const puppeteer = require("puppeteer");

(async () => {
  // Launch a headless browser instance
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1280, height: 720 }
  });
  const page = await browser.newPage();
  await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });

  // Define ranges for phaseOffset values (adjust these arrays as needed)
  const xValues = [0, 1, 2.15, 3]; // red channel offsets
  const yValues = [-1, -0.5, 0, 0.5, 1]; // green channel offsets
  const zValues = [0, 1.2, 2]; // blue channel offsets

  let screenshotCount = 0;

  await page.waitForFunction(() => window.auroraMesh !== undefined, { timeout: 5000 });

  // Loop through combinations
  for (let x of xValues) {
    for (let y of yValues) {
      for (let z of zValues) {
        // Update the phaseOffset uniform via page.evaluate.
        await page.evaluate(
          (x, y, z) => {
            // Check if our auroraMesh is available
            if (window.auroraMesh && window.auroraMesh.material) {
              window.auroraMesh.material.uniforms.phaseOffset.value.set(x, y, z);
              // Force a recompile/update if needed:
              window.auroraMesh.material.needsUpdate = true;
            }
          },
          x,
          y,
          z
        );

        // Give a short delay for the change to take effect
        // await page.waitForTimeout(300);
        await setTimeout(1000);

        // Save a screenshot
        const screenshotName = `./screenshots/screenshot_${screenshotCount}.png`;
        await page.screenshot({ path: screenshotName });
        console.log(`Saved ${screenshotName} for phaseOffset (${x}, ${y}, ${z})`);
        screenshotCount++;
      }
    }
  }

  await browser.close();
})();