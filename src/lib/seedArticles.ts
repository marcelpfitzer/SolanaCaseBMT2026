// The starting articles, written for PayPerRead. They are loaded into the
// database the first time the app starts (see db.ts). Paragraphs are separated
// by an empty line.

export const seedArticles = [
  {
    title: "Why a Coffee Costs More Than a Good Story",
    teaser:
      "We happily pay €3 for a coffee we forget in ten minutes, yet balk at paying anything for journalism that took days to produce. Micropayments could change that math.",
    body: `Think about the last article that genuinely changed your mind about something. Someone spent hours, maybe days, making phone calls, reading documents and checking facts so that you could understand a topic in five minutes. Now think about what you paid for it. For most of us, the honest answer is nothing.

Newsrooms know this problem well. For years the answer was advertising, but ads pay very little per reader and push publishers toward clickbait. The second answer was the subscription. Subscriptions work well for people who read one publication every day. They work badly for everyone else, which is most of us.

The way people actually read news looks nothing like a subscription. We follow a link from a friend, a search result or a social feed. We read one article from a newspaper we have never visited before, and then we leave. Asking that reader to sign up for a monthly plan is like asking someone who wants one coffee to sign a year-long contract with the café.

Micropayments offer a different deal: pay a few cents for the one article you want, and nothing more. The idea is old. It failed in the past for a simple reason: card payments carry fixed fees that are larger than the payment itself. Charging five cents with a card can cost the publisher more than five cents.

Blockchain payments change that. On networks like Solana, sending money costs a fraction of a cent and arrives in seconds, which makes a five-cent payment practical for the first time. Paired with a stablecoin, a digital token that stays worth one euro, the price is also predictable for both sides.

The model has open questions. Will readers accept a small payment prompt on every article? Will writers earn enough per article to make it worthwhile? Those are exactly the questions a prototype like PayPerRead exists to test. The price of a coffee sets a useful benchmark: if a story is worth a sip of it, readers should be able to pay for that, and nothing more.`,
  },
  {
    title: "Stablecoins, Explained Without the Hype",
    teaser:
      "They are crypto tokens designed to be boring on purpose. Here is what a stablecoin actually is, how it keeps its value, and where the risks are.",
    body: `Most crypto assets are famous for swinging wildly in price. A stablecoin is the opposite: a token designed to keep a steady value, usually one unit of a traditional currency such as the euro or the US dollar.

The most common kind is the fiat-backed stablecoin. A company issues one token for every euro or dollar it holds in reserve, typically in bank deposits and short-term government bonds. If you hand the issuer one euro, you receive one token. If you return the token, you get your euro back. As long as people trust that this exchange works, the token's market price stays very close to one euro.

Why would anyone want a token that behaves like ordinary money? Because it can move like crypto. A stablecoin can be sent to anyone with a wallet address, at any time of day, across borders, usually within seconds and for very low fees on fast networks. That combination of predictable value and cheap, instant transfer is what makes stablecoins interesting for payments, including very small payments like paying a few cents to read an article.

There are real risks. A fiat-backed stablecoin is only as good as its reserves and the honesty of its issuer. If reserves are missing, badly managed or frozen, the token can lose its peg, meaning its price drops below one euro. Readers should also know that some stablecoins do not hold full reserves at all and instead try to keep their price stable with algorithms, an approach that has failed dramatically in the past.

Regulation is catching up. In the European Union, the MiCA regulation sets rules for issuers of stablecoins, including requirements on reserves and on how holders can redeem their tokens. Rules like these are meant to make stablecoins behave more like the boring, reliable money they are supposed to be.

For a reader, the practical advice is simple: prefer well-known stablecoins from regulated issuers, keep only small amounts in a hot wallet, and remember that a stablecoin is a claim on an issuer, not a bank deposit protected by a government guarantee.`,
  },
  {
    title: "What Actually Happens When You Press “Unlock”",
    teaser:
      "Behind a single click on PayPerRead sit a digital signature, a public ledger and a server that trusts nothing it cannot check. A step-by-step look.",
    body: `When you press "Unlock" on an article here, the page does not simply flip a switch. Several things happen in a few seconds, and each one exists for a reason.

First, the page builds a payment. It is a small instruction that says: move this amount from the reader's wallet to the writer's wallet. On PayPerRead, the money goes directly to the person who wrote the article, not to a platform account in between.

Second, your wallet signs the payment. A wallet holds a secret key that only you control. Signing proves that the owner of the wallet approved this exact payment. Phantom asks you to confirm; the demo wallet on this site signs automatically so that testing is quick. Nobody, including the website, can create that signature without your key.

Third, the signed payment is sent to the Solana network. Validators, computers that maintain the shared ledger, check the signature and the balance, then record the transfer in a block. The record is public: anyone can look up the transaction by its ID, called a signature.

Fourth, the website's server checks the payment itself. This is the step people often forget. The page in your browser could lie about having paid, so the server does not take its word for it. Instead, it asks the Solana network directly: does this transaction exist, did it succeed, did it send enough money from your wallet to this article's writer? Only if every answer is yes does it unlock the article.

Fifth, the purchase is remembered. The server stores that your account bought this article, together with the transaction ID. That is why the article stays unlocked when you come back later, and why the same payment can never be used to unlock a second article.

All of this happens on Devnet, Solana's test network, so the money involved has no real value. The steps, however, are the same ones a real payment would take.`,
  },
  {
    title: "Devnet, Testnet, Mainnet: A Beginner's Map of Solana",
    teaser:
      "Solana is not one network but several. Knowing which one you are on is the difference between a harmless experiment and spending real money.",
    body: `If you set up a Solana wallet for the first time, you may notice a setting that lets you switch networks. It is worth understanding, because the same wallet address exists on all of them, but the money on each is completely separate.

Mainnet Beta is the real network. Tokens on mainnet have real market value, and every transaction costs real, if small, fees. When people talk about buying or holding SOL, they mean mainnet.

Devnet is the playground for developers. It behaves like mainnet, with the same kinds of accounts, programs and transactions, but its SOL has no value. Developers get devnet SOL for free from a faucet, a service that hands out test tokens. Devnet is where most apps are built and tested before launch, and it is where this website runs. Faucets are often rate-limited, because otherwise a single person could drain them.

Testnet is mainly used to test changes to Solana itself, such as new validator software. As an app builder or a reader you will rarely need it.

There is also a fourth option developers use: a local validator, a private copy of the network running on their own computer. It is fast and has unlimited test SOL, but nobody else can see it.

The practical rule for beginners: always check which network your wallet is set to before you confirm anything. On devnet, a mistake costs nothing. On mainnet, the same click spends real money. A good app makes the network visible, which is why PayPerRead shows a Devnet notice on every page.`,
  },
  {
    title: "Five Questions to Ask Before You Trust a Crypto App",
    teaser:
      "Connecting a wallet takes one click. Undoing a bad decision can be impossible. These five questions help you tell a careful app from a risky one.",
    body: `Crypto apps ask for more trust than most websites. When you connect a wallet and sign a transaction, there is usually no bank to call and no chargeback button. A few minutes of checking before you click can save a lot of trouble.

1. What exactly am I signing? A good wallet shows what a transaction will do: which account receives money, and how much. If the amount or the recipient looks different from what the app told you, stop. Be especially careful with requests that give an app permission to move your tokens later.

2. Which network am I on? The same wallet address exists on test networks and on the real one. A reputable app tells you clearly whether it is running on a test network like devnet or on mainnet with real money.

3. Does the app ever ask for my secret phrase? It should not, ever. Your recovery phrase is the master key to your wallet. No legitimate website, support agent or app needs it. Anyone asking for it is trying to take your funds.

4. Who is behind it, and can I verify that? Look for a real team, an address, open-source code or an audit. Anonymity is not automatically bad, but it means you are relying on the code alone, so the code should be public.

5. How much can I lose? Use a separate wallet with a small balance for new apps, the same way you would carry only some cash in your pocket. If something goes wrong, the damage stays small.

None of these questions guarantees safety, but together they filter out most of the obvious traps. The best habit is the simplest one: when an app makes you feel rushed, slow down.`,
  },
  {
    title: "The Paywall Problem: Why Most Readers Never Subscribe",
    teaser:
      "Paywalls ask a one-time visitor for a long-term commitment. For most readers that trade never makes sense, and publishers lose them for good.",
    body: `A paywall is a simple deal: pay a monthly fee and read as much as you like. For a loyal reader who visits every morning, it is a good deal. The trouble is that loyal readers are a small group, and every publisher is competing for the same people.

Everyone else meets the paywall in a different way. They arrive from a link, read the first paragraph, and are asked to create an account and enter card details for a monthly plan. The price may be reasonable, but the question is wrong. The reader wanted one article, not a relationship.

Faced with that question, most people do the rational thing and leave. Some search for the same story elsewhere. Some give up on the topic entirely. The publisher gets no money, and the reader gets no journalism.

Stacking subscriptions makes it worse. A person who follows local news, national politics, technology and sport might need four or five of them to read everything they come across in a week. Few households will pay for all of them, so they pick one and ignore the rest.

Publishers have tried workarounds: metered paywalls that allow a few free articles per month, bundles that combine several titles, and day passes. Each helps a little, and each adds another decision for the reader.

Pay-per-article flips the question. Instead of asking "do you want to commit to us?", it asks "is this story worth a few cents to you right now?" That is a question a casual reader can answer yes to. It will not replace subscriptions for the loyal core, but it gives every other visitor a way to pay that matches how they actually read.`,
  },
  {
    title: "What Is a Crypto Wallet, Really?",
    teaser:
      "It doesn't hold your coins, it can't be reset, and it fits in twelve words. A plain-language guide to the thing you connect when you press “Connect wallet”.",
    body: `The word wallet suggests a place where money sits. A crypto wallet works differently. Your tokens are recorded on the blockchain, a public ledger shared by thousands of computers. What your wallet keeps is a pair of keys.

The public key, usually shown as your wallet address, is safe to share. It is where others send you money, much like an account number. On Solana it is a long string of letters and numbers.

The private key is the secret. It lets you sign transactions, which is how you prove to the network that the owner of an address approved a payment. Whoever has the private key controls the funds. There is no bank that can reset it for you.

Most wallets also give you a recovery phrase, twelve or twenty-four ordinary words from which all your keys can be recreated. If your phone breaks, the phrase restores your wallet on a new device. If someone else gets the phrase, they get your wallet.

Wallets come in different forms. Browser extensions and mobile apps like Phantom are convenient for everyday use. Hardware wallets keep the keys on a separate device and are safer for larger amounts. The demo wallet on this site is the simplest kind: it keeps its key in your browser, which is fine for a test network and unsuitable for real money.

When you press "Connect wallet" on a website, you are not handing over your keys. You are letting the site see your public address and ask your wallet to sign transactions. Every payment still needs your approval, and a trustworthy wallet shows you exactly what you are approving.`,
  },
  {
    title: "Transaction Fees, Explained: Why a Cent Can Be Too Expensive",
    teaser:
      "A payment that costs more to process than it is worth will never happen. Why fees decide which business models are possible, and what changed.",
    body: `Every payment has a cost to move it from one person to another. Most of the time we don't notice, because the cost is small compared with what we are buying. Micropayments are where that cost suddenly matters.

Card payments typically combine a percentage of the amount with a fixed fee per transaction. The percentage is harmless for small amounts. The fixed part is not. When the fixed fee is similar to, or larger than, the price itself, a five-cent sale becomes a loss for the seller before anyone has read a word.

That is why small online purchases have long been bundled. Credits, prepaid balances and subscriptions all exist partly to turn many tiny purchases into one bigger card payment, so the fixed fee is paid only once.

Blockchain networks work differently. Instead of a card network and banks, validators process transactions and charge a network fee. On Solana, the base fee for a simple transfer is a tiny fraction of a cent, and it does not grow with the amount sent. Moving five cents costs roughly the same as moving five thousand euros.

That changes the arithmetic. A publisher can charge five cents and keep almost all of it. A reader can pay for a single article without buying credits first.

Fees are not the whole story. Wallets still need to be set up, prices need to be stable, which is why stablecoins matter, and the experience has to be as quick as a click. But without low fees, none of the rest would matter. They are the reason the old idea of paying per article is worth trying again.`,
  },
  {
    title: "How to Read a Blockchain Explorer",
    teaser:
      "Every payment on Solana leaves a public record. With a free tool called an explorer, you can check any transaction yourself in under a minute.",
    body: `One of the stranger features of public blockchains is that anyone can look at any transaction. You do not need permission or an account. You need an explorer, a website that displays what is recorded on the network in a readable form.

For Solana, the official explorer lives at explorer.solana.com. By default it shows mainnet, the network with real money. For test payments like the ones on this site, switch the cluster setting to devnet, otherwise your transaction will appear to be missing.

The search box accepts several things. Paste a wallet address and you see its balance and recent activity. Paste a transaction signature, the long ID every payment receives, and you see that single transaction in detail.

On a transaction page, start with the result. It should say that the transaction succeeded. Then check the time, which tells you when it was confirmed, and the fee, which on Solana is usually a tiny amount of SOL.

The most useful part is the list of balance changes or instructions. For a simple payment you will see a transfer from one address to another and the amount, in SOL or in lamports, the smallest unit, where one SOL equals one billion lamports.

Why would a reader care? Because it lets you verify instead of trust. If an app claims your payment reached a writer, you can check it yourself. The admin page on this site links each purchase to the explorer for exactly that reason.

A final reminder: because everything is public, anyone who knows your address can see your transactions. That is worth keeping in mind before you share it widely.`,
  },
  {
    title: "Writers as Small Businesses: Getting Paid per Piece",
    teaser:
      "When readers pay per article and the money goes straight to the author, every story becomes a small product. That brings new freedom and new pressure.",
    body: `For most of the history of journalism, writers were paid by publishers, and publishers were paid by readers and advertisers. The writer's income had little direct connection to whether readers valued a particular piece.

Direct payments per article change that connection. When a reader pays five cents and the money lands in the writer's wallet within seconds, the writer can see, story by story, what their audience is willing to pay for.

That has real advantages. Freelancers no longer need to wait weeks for an invoice to be paid. Writers who serve a small but loyal niche can earn from it, even if a large publication would never commission the topic. And the relationship with readers becomes more direct: you write, they read, they pay you.

It also brings pressure. Headlines that promise more than the article delivers may earn money once, but readers who feel tricked will not pay again. Topics that matter but don't sell, such as slow investigations or local council meetings, may look unattractive in a sales dashboard.

Some of this can be balanced by design. Generous teasers let readers judge an article before buying. Bundles, tips and sponsored investigations can fund work that single sales cannot. Editors still have a role in deciding what deserves to be written, even when readers decide what gets paid.

Seen this way, pay-per-article does not replace the newsroom. It gives individual writers a second channel, one where good work is rewarded quickly and directly. For many freelancers, that alone would be a big improvement.`,
  },
  {
    title: "Phishing in Web3: The Tricks Scammers Use",
    teaser:
      "Fake support agents, look-alike websites and harmless-looking signature requests. How crypto scams work, and the habits that stop almost all of them.",
    body: `Most crypto theft does not involve clever hacking. It involves persuading someone to hand over access themselves. The tricks are old, adapted to wallets instead of bank logins.

The most common one is the fake support agent. You post a question in a forum or chat, and someone offers help in a private message. Sooner or later they ask for your recovery phrase to "sync" or "validate" your wallet. No real support ever needs it. Anyone asking for it is a thief.

The second is the look-alike website. A link leads to a page that looks exactly like a known app, but the address differs by a letter or uses a different ending. When you connect your wallet and sign, you are signing whatever the scammer wants. Bookmark the apps you use and open them from your bookmarks.

The third is the dangerous signature. Some transactions do more than send a payment: they give an app permission to move your tokens later. Scam sites dress these up as harmless actions such as "claim reward" or "verify wallet". Read what your wallet shows before approving, and reject anything you don't understand.

The fourth is the surprise airdrop. Unknown tokens appear in your wallet with a message pointing to a website where you can supposedly claim more. The website is the trap.

The defences are simple habits. Never share your recovery phrase. Use bookmarks instead of links. Read every signature request. Keep a separate wallet with a small balance for new apps. And treat urgency as a warning sign: real services rarely need you to act in the next five minutes.`,
  },
  {
    title: "Your Reading Data: What a Pay-per-Article Site Needs to Know",
    teaser:
      "Paying per article creates a record of what you read. Who can see it, what a site actually needs to store, and what you should expect in return.",
    body: `A subscription tells a publisher that you are a reader. Paying per article tells it exactly what you read. That is a more detailed picture, and it deserves careful handling.

Some of that data is unavoidable. To keep an article unlocked after you pay, a site has to remember that your account bought it. To stop the same payment from being used twice, it has to store the transaction ID. Without these records, the service would not work.

Much else is optional. A site does not need your real name to sell you an article. It does not need your date of birth, your contacts or your location. Collecting data "just in case" creates risk without benefit, because data that is never stored can never leak.

On a public blockchain there is an extra layer. The payment itself, from one wallet address to another, is visible to anyone. If your wallet address can be linked to your identity, your reading purchases could be linked to you too. Using a separate wallet for reading keeps that link weaker.

In the European Union, data protection law gives readers rights over their personal data, including the right to see what is stored about them and, in many cases, to have it deleted. A trustworthy service explains in plain language what it keeps, why, and for how long.

A reasonable expectation for any pay-per-article site: store what you need to deliver what I paid for, protect it properly, and nothing more. This prototype follows that idea. It stores a username, a password hash, the articles you bought and the payment IDs, and that is all.`,
  },
];

// Podcast episodes. The audio is generated from scripts/podcasts/<file>.txt by
// scripts/make-podcasts.py and saved as media/podcasts/<file>.m4a.
export const seedPodcasts = [
  {
    file: "five-cent-question",
    title: "The Five-Cent Question",
    teaser:
      "Sam and Dan ask whether tiny payments can keep journalism alive: why micropayments failed before, what changed, and how to avoid decision fatigue.",
  },
  {
    file: "keys-seeds-wallets",
    title: "Keys, Seeds and Wallets for Beginners",
    teaser:
      "What your wallet really holds, why your seed phrase is the master key, and three rules that keep your money safe. A calm introduction for newcomers.",
  },
  {
    file: "building-pay-per-read",
    title: "Behind the Build: How a Pay-per-Read App Works",
    teaser:
      "Where the article lives before you pay, why the server never trusts the browser, and the one check that stops a payment from being used twice.",
  },
];
