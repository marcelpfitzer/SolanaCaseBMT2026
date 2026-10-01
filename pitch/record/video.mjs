// Records the PayPerRead showcase: scripted browser session + captions + fake cursor.
// Frames come from Chrome's screencast (CDP) and are saved as JPEGs with timestamps.
import puppeteer from "puppeteer-core";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const BASE = "http://localhost:3100";
const FRAMES = new URL("./frames/", import.meta.url).pathname;
const WALLET = readFileSync(new URL("./video-wallet.json", import.meta.url), "utf8");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--hide-scrollbars", "--font-render-hinting=none"],
});

// Overlay: fake cursor + caption bar, re-installed on every page load.
async function prepare(page, { autoConnect = false } = {}) {
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1.5 });
  await page.evaluateOnNewDocument(
    (wallet, autoConnect) => {
      localStorage.setItem("payperread-demo-wallet", wallet);
      if (autoConnect) localStorage.setItem("walletName", JSON.stringify("Demo Wallet"));
      const install = () => {
        if (document.getElementById("__cur")) return;
        const style = document.createElement("style");
        style.textContent = "nextjs-portal{display:none!important} html{scroll-behavior:auto}";
        document.documentElement.appendChild(style);
        const cur = document.createElement("div");
        cur.id = "__cur";
        cur.innerHTML =
          '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M4 2.5l15 8.2-6.6 1.6L9 18.8z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
        const [x, y] = JSON.parse(sessionStorage.getItem("__cur") || "[900,420]");
        Object.assign(cur.style, {
          position: "fixed", left: "-4px", top: "-2px", zIndex: 2147483647, pointerEvents: "none",
          transform: `translate(${x}px,${y}px)`, transition: "transform 750ms cubic-bezier(.45,0,.2,1)",
          filter: "drop-shadow(0 2px 3px rgba(0,0,0,.35))",
        });
        document.documentElement.appendChild(cur);
        const cap = document.createElement("div");
        cap.id = "__cap";
        Object.assign(cap.style, {
          position: "fixed", left: "50%", bottom: "26px", transform: "translateX(-50%)", zIndex: 2147483646,
          pointerEvents: "none", background: "rgba(20,20,22,.86)", color: "#fff", padding: "12px 24px",
          borderRadius: "14px", maxWidth: "82%", textAlign: "center", letterSpacing: "-0.2px",
          font: '500 21px/1.35 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
          opacity: 0, transition: "opacity 350ms", boxShadow: "0 8px 30px rgba(0,0,0,.25)",
        });
        const text = sessionStorage.getItem("__cap");
        if (text) {
          cap.textContent = text;
          cap.style.opacity = 1;
        }
        document.documentElement.appendChild(cap);
      };
      // Hide the "Low balance" pop-up in the video (the tiny Devnet test balance would trigger it).
      setInterval(() => {
        for (const p of document.querySelectorAll("p")) {
          if (p.textContent.trim() === "Low balance") {
            let box = p;
            while (box.parentElement && getComputedStyle(box).position !== "fixed") box = box.parentElement;
            box.style.display = "none";
          }
        }
      }, 100);
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
      else install();
    },
    WALLET,
    autoConnect,
  );
}

const caption = async (page, text) => {
  await page.evaluate(async (text) => {
    const cap = document.getElementById("__cap");
    sessionStorage.setItem("__cap", text || "");
    if (!cap) return;
    if (cap.style.opacity === "1" && cap.textContent !== text) {
      cap.style.opacity = 0;
      await new Promise((r) => setTimeout(r, 350));
    }
    cap.textContent = text || "";
    cap.style.opacity = text ? 1 : 0;
  }, text);
};

async function find(page, selector, text) {
  const handle = await page.waitForFunction(
    (selector, text) =>
      [...document.querySelectorAll(selector)].find(
        (el) => (!text || el.textContent.trim().includes(text)) && el.getBoundingClientRect().width > 0,
      ),
    { timeout: 60000 },
    selector,
    text,
  );
  return handle.asElement();
}

async function moveTo(page, el) {
  const box = await el.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.evaluate((x, y) => {
    const cur = document.getElementById("__cur");
    if (cur) cur.style.transform = `translate(${x}px,${y}px)`;
    sessionStorage.setItem("__cur", JSON.stringify([x, y]));
  }, x, y);
  await page.mouse.move(x, y, { steps: 8 });
  await wait(850);
  return { x, y };
}

async function click(page, selector, text, { nav = false } = {}) {
  const el = await find(page, selector, text);
  await el.evaluate((e) => e.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  await wait(400);
  const { x, y } = await moveTo(page, el);
  const before = page.url();
  await page.mouse.click(x, y);
  if (nav) {
    // Works for full page loads and for Next.js client-side navigation.
    await page.waitForFunction((before) => location.href !== before, { timeout: 30000 }, before);
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 30000 }).catch(() => {});
  }
  await wait(500);
}

// Click a filter tab; if the page did not switch, click again (logs it, so we notice).
async function tab(page, label, query) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await click(page, "nav[aria-label=Filter] button", label);
    const ok = await page
      .waitForFunction((q) => location.search.includes(q), { timeout: 6000 }, query)
      .then(() => true, () => false);
    if (ok) return;
    console.log(`tab "${label}" did not switch (attempt ${attempt})`);
  }
  throw new Error(`tab ${label} never switched`);
}

async function scrollTo(page, selector, text, block = "start", ms = 1600) {
  const el = await find(page, selector, text);
  await el.evaluate((e, block) => e.scrollIntoView({ block, behavior: "smooth" }), block);
  await wait(ms);
}

const scrollBy = async (page, y, ms = 1600) => {
  await page.evaluate((y) => window.scrollBy({ top: y, behavior: "smooth" }), y);
  await wait(ms);
};

async function type(page, selector, text) {
  const el = await find(page, selector);
  await moveTo(page, el);
  await el.click();
  await page.keyboard.type(text, { delay: 70 });
}

async function login(page, username) {
  await type(page, "input[name=username]", username);
  await type(page, "input[name=password]", "1234");
  await click(page, "form button", "Log in", { nav: true });
}

async function logout(page) {
  await click(page, "button[aria-haspopup=menu]");
  await click(page, "button[role=menuitem]", "Log out");
  await page.waitForFunction(() => document.querySelector('nav a[href="/login"]'), { timeout: 30000 });
  await wait(800);
}

// ---------- Recording ----------
const page = await browser.newPage();
await prepare(page);
await page.goto(BASE, { waitUntil: "networkidle2" });
await page.evaluate(() => sessionStorage.clear());
await page.reload({ waitUntil: "networkidle2" });

const cdp = await page.createCDPSession();
const stamps = [];
cdp.on("Page.screencastFrame", (f) => {
  const i = stamps.length;
  stamps.push(f.metadata.timestamp);
  writeFileSync(`${FRAMES}${String(i).padStart(6, "0")}.jpg`, Buffer.from(f.data, "base64"));
  cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080 });
const t0 = Date.now();
const mark = (label) => console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s  ${label}`);

try {
  // 1. Landing page
  mark("landing");
  await wait(1200);
  await caption(page, "PayPerRead: pay per story, not per month.");
  await wait(3000);
  await scrollBy(page, 560, 2200);
  await caption(page, "Stories for €0.05, podcasts for €0.20, paid on Solana straight to the creator.");
  await wait(3200);
  await scrollBy(page, -2000, 1500);

  // 2. Log in as a reader
  mark("login");
  await caption(page, "Log in as a reader.");
  await click(page, 'nav a[href="/login"]', null, { nav: true });
  await login(page, "demo");

  // 3. Personal home page + filters
  mark("home");
  await caption(page, "A personal home page, with picks based on what you bought.");
  await wait(3000);
  await scrollBy(page, 480, 2000);
  await wait(1500);
  await scrollTo(page, "nav[aria-label=Filter]", null, "center");
  await caption(page, "Switch between stories and podcasts.");
  await tab(page, "Podcasts", "type=podcast");
  await wait(1800);
  await tab(page, "Stories", "type=article");
  await wait(1800);

  // 4. A locked article
  mark("article");
  await click(page, 'a[href="/articles/3"]', null, { nav: true });
  await caption(page, "Every teaser is free to read.");
  await wait(2800);
  await scrollTo(page, "p", "Keep reading for", "center", 1800);
  await caption(page, "The rest costs €0.05. One payment, no subscription.");
  await wait(2800);

  // 5. Connect the wallet and pay
  mark("pay");
  await caption(page, "Connect a wallet: Phantom, or the built-in Demo Wallet.");
  await click(page, "button", "Connect wallet to unlock");
  await wait(1200);
  await click(page, ".wallet-adapter-modal button", "Demo Wallet");
  await wait(1500);
  await caption(page, "Pay €0.05 in SOL directly to the writer’s wallet on Solana Devnet…");
  await click(page, "button", "Unlock for");
  await page.waitForFunction(() => !document.body.innerText.includes("Keep reading for"), { timeout: 120000 });
  await caption(page, "…the server verifies the payment on-chain. Unlocked!");
  await wait(1500);
  await scrollBy(page, 420, 2200);
  await wait(2200);

  // 6. Library
  mark("library");
  await click(page, 'nav a[href="/library"]', null, { nav: true });
  await caption(page, "Your library: everything you bought, saved for offline reading.");
  await wait(3000);
  await scrollTo(page, "h2", "Why this is really yours", "center", 1800);
  await caption(page, "Each purchase has a memo on the blockchain, so it can be restored from your wallet.");
  await wait(3500);

  // 7. Settings: balance, profile icon, become an author
  mark("settings");
  await click(page, "button[aria-haspopup=menu]");
  await wait(900);
  await click(page, "a[role=menuitem]", "Settings", { nav: true });
  await caption(page, "Settings: your wallet and live balance, with a warning when it runs low.");
  await wait(1000);
  await scrollTo(page, "h2", "Balance", "center", 1800);
  await wait(2500);
  await scrollTo(page, "p", "Profile picture", "center", 1600);
  await caption(page, "Upload a photo or pick an icon.");
  await click(page, 'label:has(input[value="fox-reading.png"])');
  await wait(600);
  await click(page, "button", "Use this icon");
  await wait(2200);
  await scrollTo(page, "#author", null, "start", 1800);
  await caption(page, "Readers can apply to become authors.");
  await page.evaluate(() => {
    const set = (name, value) => (document.querySelector(`#author [name=${name}]`).value = value);
    set(
      "motivation",
      "I write about everyday money and technology, and I want readers to pay for single pieces instead of subscriptions.",
    );
    set(
      "sampleText",
      "Most people never think about the fee they pay when they buy a coffee with a card. It is small, hidden and taken by companies they never see. " +
        "Now imagine paying five cents for a story, and all five cents reach the person who wrote it. That is the promise of micropayments on a fast blockchain, " +
        "and it is finally cheap enough to work. In this piece I look at what changes for readers, writers and small newsrooms when every article can be sold on its own.",
    );
  });
  await scrollTo(page, "#author [name=topics]", null, "center", 1200);
  await type(page, "#author [name=topics]", "Everyday money, fintech");
  await wait(500);
  await click(page, "#author button", "Send application");
  await wait(2200);
  await caption(page, "The application goes to the editors for review.");
  await wait(2500);

  // 8. Admin approves
  mark("admin");
  await caption(page, "The admin reviews every application.");
  await logout(page);
  await click(page, 'nav a[href="/login"]', null, { nav: true });
  await login(page, "admin");
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle2" });
  await wait(2500);
  await scrollTo(page, "button", "Approve as author", "center", 1500);
  await click(page, "button", "Approve as author");
  await wait(1500);
  await caption(page, "Approved: Daniel can now publish his own stories.");
  await wait(3000);

  // 9. Writer dashboard + live sale
  mark("writer");
  await logout(page);
  await caption(page, "Now the writer’s view.");
  await click(page, 'nav a[href="/login"]', null, { nav: true });
  await login(page, "writer_demo");
  await page.goto(`${BASE}/write`, { waitUntil: "networkidle2" });
  await caption(page, "The writer dashboard: revenue, sales, views and conversion.");
  await wait(3500);
  await scrollBy(page, 420, 2000);
  const chart = await page.evaluateHandle(() =>
    [...document.querySelectorAll("svg")].sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0],
  );
  const cb = await chart.asElement().boundingBox();
  for (const fx of [0.55, 0.75, 0.9]) {
    await page.evaluate((x, y) => {
      document.getElementById("__cur").style.transform = `translate(${x}px,${y}px)`;
    }, cb.x + cb.width * fx, cb.y + cb.height * 0.6);
    await page.mouse.move(cb.x + cb.width * fx, cb.y + cb.height * 0.6, { steps: 10 });
    await wait(1100);
  }
  await caption(page, "What’s working, what needs attention, and why.");
  await wait(3000);
  await scrollTo(page, "h2", "Latest sales", "center", 1800);

  // Meanwhile, a reader buys a story in a second (invisible) browser window.
  await caption(page, "Live: a reader buys a story in another window right now…");
  const buyerContext = await browser.createBrowserContext();
  const buyer = await buyerContext.newPage();
  await prepare(buyer, { autoConnect: true });
  await buyer.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await buyer.type("input[name=username]", "demo");
  await buyer.type("input[name=password]", "1234");
  await Promise.all([buyer.waitForNavigation(), buyer.click("form button")]);
  await buyer.goto(`${BASE}/articles/7`, { waitUntil: "networkidle2" });
  const buy = await find(buyer, "button", "Unlock for");
  await buy.click();
  await page.waitForFunction(() => document.body.innerText.includes("New sale"), { timeout: 120000 });
  await caption(page, "…and the writer sees the sale within seconds. The money is already in their wallet.");
  await wait(6000);
  await buyerContext.close();

  // 10. End card
  mark("end");
  await caption(page, "");
  await page.evaluate(() => {
    const end = document.createElement("div");
    end.innerHTML = `<img src="/logo-white.png" style="height:64px"><p style="margin-top:28px;font-size:30px;font-weight:600;letter-spacing:-.4px">Read what matters. Pay for just that.</p><p style="margin-top:14px;font-size:18px;opacity:.6">Solana Devnet prototype · github.com/marcelpfitzer/SolanaCaseBMT2026</p>`;
    Object.assign(end.style, {
      position: "fixed", inset: 0, zIndex: 2147483647, background: "#000", color: "#fff", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 800ms",
      font: '17px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
    });
    document.documentElement.appendChild(end);
    requestAnimationFrame(() => (end.style.opacity = 1));
  });
  await wait(5000);
  mark("done");
} catch (err) {
  console.error("FAILED:", err.message);
  await page.screenshot({ path: new URL("./video-fail.png", import.meta.url).pathname });
  process.exitCode = 1;
} finally {
  await cdp.send("Page.stopScreencast").catch(() => {});
  writeFileSync(new URL("./frames.json", import.meta.url), JSON.stringify(stamps));
  await browser.close();
}
