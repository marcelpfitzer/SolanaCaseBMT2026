import puppeteer from "puppeteer-core";
const OUT = process.argv[2];
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--hide-scrollbars"] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function page(user) {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await p.evaluateOnNewDocument(() => { const s = document.createElement("style"); s.textContent = "nextjs-portal{display:none!important}"; document.addEventListener("DOMContentLoaded", () => document.head.appendChild(s)); });
  if (user) {
    await p.goto("http://localhost:3000/login");
    await p.type("input[name=username]", user); await p.type("input[name=password]", "1234");
    await Promise.all([p.waitForNavigation(), p.click("form button")]);
  }
  return p;
}
const shot = async (p, name) => { await wait(1500); await p.screenshot({ path: `${OUT}/${name}.png` }); };
let p = await page(null);
await p.goto("http://localhost:3000/", { waitUntil: "networkidle2" }); await shot(p, "home-hero");
p = await page("demo");
await p.goto("http://localhost:3000/", { waitUntil: "networkidle2" }); await p.evaluate(() => window.scrollTo(0, 430)); await shot(p, "home-picks");
await p.goto("http://localhost:3000/articles/3", { waitUntil: "networkidle2" });
await p.evaluate(() => [...document.querySelectorAll("p")].find((e) => e.textContent.includes("Keep reading for")).scrollIntoView({ block: "center" })); await shot(p, "paywall");
await p.goto("http://localhost:3000/library", { waitUntil: "networkidle2" }); await shot(p, "library");
p = await page("writer_demo");
await p.goto("http://localhost:3000/write", { waitUntil: "networkidle2" }); await wait(2000); await p.evaluate(() => window.scrollTo(0, 200)); await shot(p, "dashboard");
await p.evaluate(() => [...document.querySelectorAll("h2")].find((e) => e.textContent.includes("What")).scrollIntoView({ block: "center" })).catch(() => {}); await shot(p, "dashboard-insights");
await b.close();
