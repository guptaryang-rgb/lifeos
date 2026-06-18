/* ═══════════════════════════════════════════════════════════════════════════
   LifeOS · Wellness & Daily Growth Module
   Water · Sleep · Mood · Meditation · Journal · Daily Reads
   Replaces Headspace, Blinkist, and wellness apps
   ═══════════════════════════════════════════════════════════════════════════ */

const Wellness = (() => {
  'use strict';

  /* ── Storage Keys ── */
  const KEYS = {
    wellness: 'lifeos_wellness',
    journal:  'lifeos_journal',
    reads:    'lifeos_reads',
  };

  /* ── Helpers ── */
  const _load = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const _save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const _today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const _daysBetween = (a, b) => Math.floor((new Date(b) - new Date(a)) / 86400000);
  const _dateOffset = (days) => {
    const d = new Date(); d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const esc = typeof escHtml === 'function' ? escHtml : (s) => {
    const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
  };

  /* ── Default Data ── */
  const _defaults = () => ({
    water: {},        // { '2026-06-17': { glasses: 5, goal: 8 } }
    waterGoal: 8,
    sleep: [],        // [{ date, bedtime, wakeup, hours, quality }]
    mood: [],         // [{ date, mood, note, time }]
    meditation: [],   // [{ date, minutes, completedAt }]
    readHistory: [],  // [{ articleId, readAt }]
    userTopics: ['finance', 'tech', 'health', 'productivity'],
  });

  const _data = () => _load(KEYS.wellness) || _defaults();
  const _saveData = (d) => _save(KEYS.wellness, d);

  /* ── Journal Data ── */
  const _journalEntries = () => _load(KEYS.journal) || [];
  const _saveJournal = (entries) => _save(KEYS.journal, entries);

  /* ══════════════════════════════════════════════════════════════════════════
     DAILY READS LIBRARY — 48 fully-written micro-articles, 6 per topic
     ══════════════════════════════════════════════════════════════════════════ */

  const TOPICS = [
    { id: 'finance',      name: 'Personal Finance',    icon: '💰', color: '#00b894' },
    { id: 'tech',         name: 'Technology',           icon: '💻', color: '#6c5ce7' },
    { id: 'health',       name: 'Health & Fitness',     icon: '🏋️', color: '#e17055' },
    { id: 'psychology',   name: 'Psychology',           icon: '🧠', color: '#fd79a8' },
    { id: 'business',     name: 'Business & Startups',  icon: '🚀', color: '#fdcb6e' },
    { id: 'science',      name: 'Science',              icon: '🔬', color: '#74b9ff' },
    { id: 'productivity', name: 'Productivity',         icon: '⚡', color: '#a29bfe' },
    { id: 'philosophy',   name: 'Philosophy',           icon: '📜', color: '#00cec9' },
  ];

  const LIBRARY = [

    /* ── FINANCE (6 articles) ── */
    {
      id: 'fin_01', topic: 'finance', readTime: '3 min',
      title: 'The Power of Compound Interest',
      author: 'LifeOS Knowledge',
      content: `Albert Einstein reportedly called compound interest the eighth wonder of the world, and whether or not the attribution is real, the math certainly is. Compound interest is interest earned on both your original deposit and on the interest that has already accumulated. Over short time horizons the effect is modest, but over decades it becomes transformative.

Consider a simple example: if you invest $5,000 at age 20 with an annual return of 8%, by age 60 that single deposit grows to roughly $108,000 — more than 21 times your original investment — without adding another dollar. The key ingredient isn't a high salary or a genius stock pick; it's time. Every year you wait costs you disproportionately because you're not just losing one year of returns, you're losing all the compounding that year would have generated for every subsequent year.

The Rule of 72 is a quick mental shortcut: divide 72 by your expected annual return to estimate how many years it takes your money to double. At 8% it doubles roughly every 9 years. That means between ages 20 and 56 your money doubles four times — turning $5,000 into $80,000 — and the real account value is even higher because of the fractional compounding in between.

Compound interest also has a dark twin: compound debt. Credit card balances at 20-25% APR grow just as relentlessly in the opposite direction. A $3,000 balance left unpaid for five years at 22% becomes over $8,000. Understanding compounding in both directions — and consciously putting it to work for you rather than against you — is the single most important financial concept most people learn too late.`
    },
    {
      id: 'fin_02', topic: 'finance', readTime: '3 min',
      title: 'Why You Should Start Investing at 20',
      author: 'LifeOS Knowledge',
      content: `The most common excuse young professionals give for not investing is "I don't have enough money yet." Ironically, that mindset is the most expensive mistake you can make. Thanks to compound returns, small amounts invested early vastly outperform larger amounts invested later. An investor who puts away $200 per month starting at age 22 will have roughly $700,000 by age 62 at an average 9% annual return. Someone who starts at 32 with the same contribution ends up with only about $300,000 — less than half — despite investing for just ten fewer years.

Starting early also gives you another irreplaceable advantage: risk tolerance through time. Markets will crash — that's not a possibility, it's a guarantee. But a 25-year-old who watches their portfolio drop 30% in a bear market has decades for recovery, while a 55-year-old facing the same drawdown may need that money within years. Time transforms what feels like gambling into what statistically becomes near-certain growth; the S&P 500 has never produced a negative return over any 20-year rolling period in its history.

Your twenties are also the ideal decade to build investment habits. Start with something embarrassingly small if you need to — $50 a month into a broad index fund is infinitely better than $0. Automate the transfer so it happens before you see the money, and raise the amount each time you get a raise. By your thirties, investing will feel as natural as paying rent.

Finally, investing early teaches you lessons about volatility, fees, and behavior that are worth more than any finance textbook. You'll learn, with real but manageable stakes, that the market's short-term noise is meaningless and that the biggest risk isn't a market crash — it's never starting at all.`
    },
    {
      id: 'fin_03', topic: 'finance', readTime: '2 min',
      title: 'The 50/30/20 Budget Rule',
      author: 'LifeOS Knowledge',
      content: `The 50/30/20 rule, popularized by Senator Elizabeth Warren in her book "All Your Worth," is one of the simplest budgeting frameworks ever created — and that simplicity is exactly why it works. The idea: allocate 50% of your after-tax income to needs, 30% to wants, and 20% to savings and debt repayment.

Needs include housing, utilities, groceries, insurance, minimum debt payments, and transportation — the bills that keep your life functioning. If this category exceeds 50%, you're financially vulnerable; a single disruption like a job loss could cascade quickly. The goal isn't to slash needs to zero, but to keep them at or below half your take-home pay, which might mean choosing a more modest apartment or driving a used car a few more years.

Wants are everything that makes life enjoyable but isn't strictly necessary: dining out, streaming subscriptions, new clothes, vacations, hobby gear. Capping wants at 30% forces you to prioritize experiences and purchases that genuinely bring you joy, rather than spreading money thinly across impulse buys. If you can't fit a want into this bucket, it waits — and you'll often find the desire fades on its own.

The magic 20% goes to your future self: emergency fund contributions, retirement accounts, extra debt payments beyond minimums, and other investment goals. This single habit, maintained consistently, is what separates people who build wealth from those who live paycheck to paycheck regardless of income. If 20% feels impossible right now, start at 5% and increase by 1% each month until you reach the target.`
    },
    {
      id: 'fin_04', topic: 'finance', readTime: '3 min',
      title: 'Understanding Credit Scores',
      author: 'LifeOS Knowledge',
      content: `Your credit score is a three-digit number — typically between 300 and 850 — that summarizes how reliably you've handled borrowed money. It determines whether you get approved for loans, apartments, and sometimes even jobs, and it directly controls the interest rates you're offered. A score of 760 versus 660 on a 30-year mortgage can mean paying over $50,000 less in interest over the life of the loan.

The score is calculated from five components, weighted differently. Payment history (35%) is the most important: even a single payment more than 30 days late can drop your score by 100 points. Credit utilization (30%) measures how much of your available credit you're using; keeping it below 30% is good, below 10% is excellent. Length of credit history (15%) rewards long-standing accounts, which is why closing your oldest credit card is usually a mistake. New credit inquiries (10%) and credit mix (10%) round out the formula.

Building a strong score is straightforward but requires patience. Pay every bill on time — set up autopay for at least the minimum. Keep credit card balances low relative to their limits. Don't open multiple new accounts in a short period. And check your free credit reports annually at annualcreditreport.com for errors; studies have found that one in five reports contains a mistake significant enough to affect your score.

The most counterintuitive lesson about credit is that you need to use credit to build credit. Having no debt and no credit cards might feel financially virtuous, but it leaves you with a "thin file" that makes lenders nervous. A single credit card, used for routine purchases and paid in full each month, costs you nothing in interest and steadily builds the history that unlocks better financial opportunities.`
    },
    {
      id: 'fin_05', topic: 'finance', readTime: '2 min',
      title: 'Emergency Fund: Your Financial Safety Net',
      author: 'LifeOS Knowledge',
      content: `An emergency fund is the most boring and most important piece of any financial plan. It's cash — liquid, accessible, and untouched — sitting in a savings account waiting for the unexpected: a job loss, a medical bill, a car repair, a broken furnace. Financial advisors typically recommend three to six months of essential expenses, though the right number depends on your job stability and obligations.

Without an emergency fund, every unexpected expense becomes a crisis. You're forced to put it on a high-interest credit card, borrow from family, or take a predatory payday loan — all of which make the problem worse. With one, a $1,500 car repair is an inconvenience, not a catastrophe. That psychological shift alone reduces stress in ways that improve your health, relationships, and job performance.

Start with a mini goal of $1,000. That single milestone covers the most common emergencies: a towed car, a trip to urgent care, a last-minute flight for a family situation. Once you hit $1,000, aim for one month of expenses, then build toward three months. Keep the fund in a high-yield savings account — not invested in stocks, not locked in a CD — so it's there the moment you need it.

The hardest part about an emergency fund is leaving it alone. It's tempting to "borrow" from it for a vacation or a sale. Resist. Rename the account "Do Not Touch" if you have to. Every dollar in that fund is buying you freedom from the fear of the unknown — and that freedom is worth more than any purchase.`
    },
    {
      id: 'fin_06', topic: 'finance', readTime: '3 min',
      title: 'Index Funds vs Individual Stocks',
      author: 'LifeOS Knowledge',
      content: `The debate between index funds and individual stock picking has a clear winner for the vast majority of investors: index funds. An index fund is a basket of stocks designed to mirror a market benchmark — like the S&P 500 — and it offers instant diversification, extremely low fees, and historically reliable returns. Warren Buffett has repeatedly recommended the S&P 500 index fund as the best investment for most people, and he backed up that advice by betting a million dollars that an index fund would outperform a collection of hedge funds over ten years. He won.

The data is stark. Over any 15-year period, roughly 90% of actively managed funds — run by professional stock pickers with teams of analysts — underperform their benchmark index. The primary culprit is fees: actively managed funds charge 0.5% to 1.5% annually versus 0.03% to 0.10% for top index funds. That fee difference might seem trivial, but compounded over 30 years, it consumes a staggering portion of your returns.

Individual stock picking isn't inherently wrong, but it demands something most people underestimate: emotional discipline. When a stock you researched drops 40%, can you rationally assess whether to hold, sell, or buy more? Most individuals panic-sell at the bottom and FOMO-buy at the top, which is why the average stock investor's actual returns significantly lag the market's returns. Index funds remove the temptation to trade by design.

A sensible approach for most people is to build a core portfolio of index funds — a total US stock market fund, an international fund, and a bond fund — and allocate a small "play money" bucket (5-10% of your portfolio) for individual stocks if you enjoy researching companies. That way you participate in the learning and excitement of stock picking without risking your financial future on your ability to outsmart Wall Street.`
    },

    /* ── TECHNOLOGY (6 articles) ── */
    {
      id: 'tech_01', topic: 'tech', readTime: '3 min',
      title: 'How AI is Changing Everything',
      author: 'LifeOS Knowledge',
      content: `Artificial intelligence is no longer a futuristic concept confined to research labs — it's embedded in products billions of people use every day. When Netflix recommends a show, when Gmail finishes your sentence, when your phone unlocks with your face, AI is doing the work. But the current wave, driven by large language models and generative AI, represents a qualitative leap that's rewriting the rules of nearly every industry.

The key breakthrough is foundation models — AI systems trained on enormous datasets that develop general capabilities rather than narrow ones. GPT-4, Claude, Gemini, and similar models can write essays, analyze code, summarize legal contracts, diagnose medical symptoms, and generate art. They're not perfect, but they're already more capable than most people expected AI to be by 2030. This has compressed the timeline for disruption across white-collar work dramatically.

For individuals, the practical impact is bifurcated. People who learn to use AI tools effectively — prompt engineering, understanding model limitations, integrating AI into workflows — will see their productivity multiply. A software developer using an AI coding assistant can write code 30-50% faster. A marketer using generative AI can produce first drafts in minutes instead of hours. Those who ignore these tools risk being outcompeted not by AI itself, but by humans who use AI.

The societal implications are profound and unresolved. Questions about job displacement, intellectual property, misinformation, and the concentration of power in companies controlling the largest models are actively debated by policymakers worldwide. What's clear is that AI literacy — understanding what these systems can and cannot do — is becoming as essential as computer literacy was in the 1990s.`
    },
    {
      id: 'tech_02', topic: 'tech', readTime: '3 min',
      title: 'What is Blockchain Really?',
      author: 'LifeOS Knowledge',
      content: `Stripped of hype and jargon, a blockchain is a distributed ledger — a database shared across many computers where every participant holds an identical copy, and no single entity controls it. When someone adds a new record (a "transaction"), it's bundled with other transactions into a "block," verified by the network through a consensus mechanism, and cryptographically chained to the previous block. Once written, the data is practically immutable: altering any historical block would require re-computing every subsequent block across a majority of the network simultaneously.

Bitcoin, the first blockchain, was designed to solve a specific problem: how can two strangers send money to each other without trusting a bank? By replacing the bank with a decentralized network of validators incentivized by cryptocurrency rewards, Bitcoin created "trustless" transactions — trust in institutions was replaced by trust in mathematics and code. Ethereum extended this concept by adding programmable logic called smart contracts, allowing developers to build decentralized applications (dApps) that execute automatically when conditions are met.

The technology's genuine strengths are in scenarios where trust is scarce and intermediaries add cost or friction. Supply chain verification, cross-border remittances, digital identity for the unbanked, and transparent charitable donation tracking are compelling use cases with real deployments. Enterprise blockchains (like Hyperledger) are used by companies including Walmart, Maersk, and IBM for supply chain management.

However, blockchain is not a universal solution. It's slower and more expensive than a traditional database for most applications. The energy consumption of proof-of-work chains like Bitcoin remains controversial, though proof-of-stake alternatives (used by Ethereum post-Merge) are far more efficient. The most important question to ask about any blockchain project is: "Does this actually need to be decentralized?" If a trusted central party already exists and works fine, a blockchain adds complexity without clear benefit.`
    },
    {
      id: 'tech_03', topic: 'tech', readTime: '3 min',
      title: 'The Future of Quantum Computing',
      author: 'LifeOS Knowledge',
      content: `Classical computers store information as bits — zeros and ones. Quantum computers use qubits, which can exist in a superposition of both states simultaneously. When qubits are entangled, measuring one instantly affects the other regardless of distance. These quantum mechanical properties allow quantum computers to explore vast solution spaces in parallel, making them exponentially faster than classical machines for specific categories of problems.

The problems quantum computing excels at are not "everything faster." They're particular: factoring large numbers (which threatens current encryption), simulating molecular interactions (revolutionary for drug discovery and materials science), solving optimization problems (logistics, financial modeling), and certain machine learning tasks. For everyday tasks like browsing the web or editing documents, a quantum computer offers no advantage — and in fact performs worse than your laptop.

The current state of quantum computing is best described as the "noisy intermediate-scale quantum" (NISQ) era. Companies like IBM, Google, and startups like IonQ and Rigetti have built machines with 50-1000+ qubits, but these qubits are fragile. They require temperatures near absolute zero, are highly susceptible to errors from environmental noise, and can only maintain their quantum state (coherence) for microseconds. Error correction remains the field's central challenge; useful quantum computing may require millions of physical qubits to create thousands of reliable logical qubits.

Most experts estimate that practically useful, fault-tolerant quantum computers are 10-20 years away for broad applications. But "quantum readiness" matters now. Organizations that handle sensitive encrypted data should be preparing for "harvest now, decrypt later" attacks, where adversaries collect encrypted data today to decrypt it once quantum computers are powerful enough. NIST has already finalized post-quantum cryptographic standards, and migrating to them is an urgent priority for governments and enterprises.`
    },
    {
      id: 'tech_04', topic: 'tech', readTime: '3 min',
      title: 'Web3: Hype or Revolution?',
      author: 'LifeOS Knowledge',
      content: `Web3 is the umbrella term for a vision of the internet where platforms are decentralized, users own their data, and value flows directly between creators and consumers without corporate intermediaries. It builds on blockchain technology, smart contracts, and tokenized incentives to reimagine everything from social media to financial services. Proponents argue it's the natural evolution from Web1 (read-only static pages) through Web2 (interactive platforms controlled by Big Tech) to Web3 (user-owned, permissionless networks).

The strongest case for Web3 lies in its early successes. Decentralized finance (DeFi) protocols like Uniswap and Aave have facilitated billions in lending, trading, and yield farming without traditional banks. NFTs, despite the speculative bubble bursting, demonstrated a viable mechanism for digital ownership and creator royalties. DAOs (decentralized autonomous organizations) have coordinated millions of dollars in community-driven governance. These aren't theoretical — they're functioning systems with real users and real money.

The critique of Web3 is equally substantive. Many Web3 projects are Web2 services with a token bolted on — adding complexity and gas fees without genuine decentralization benefits. User experience remains poor: managing private keys, understanding gas fees, and navigating wallet interfaces are significant barriers. Regulatory uncertainty creates risk for builders and users alike. And the "decentralization" of many protocols is illusory — a handful of venture capital firms and whale holders often control governance in practice.

The honest assessment is that Web3 contains both genuine innovation and speculative excess. The underlying technologies — programmable money, verifiable digital ownership, trustless coordination — are powerful primitives. But whether they'll reshape the internet as profoundly as Web3 advocates claim, or remain niche tools for specific use cases, depends on solving real problems — UX, scalability, regulation — that no amount of ideological enthusiasm can bypass.`
    },
    {
      id: 'tech_05', topic: 'tech', readTime: '3 min',
      title: 'Why Rust is the Future of Systems Programming',
      author: 'LifeOS Knowledge',
      content: `For decades, C and C++ have been the languages of choice for systems programming — operating systems, game engines, databases, embedded devices. They offer unmatched performance through direct memory management. But that power comes with a cost: memory safety bugs. Buffer overflows, use-after-free errors, and data races account for roughly 70% of all security vulnerabilities in major software projects, according to studies by Microsoft and Google's Project Zero.

Rust, created by Mozilla and first released in 2015, was designed to solve exactly this problem. Its ownership system — a set of rules checked at compile time — guarantees memory safety and thread safety without a garbage collector. If your Rust code compiles, entire categories of bugs are physically impossible. You get the performance of C++ with the safety guarantees that previously required managed languages like Java or Go, which carry runtime overhead.

The adoption curve has been remarkable. The Linux kernel — arguably the most important C codebase in the world — began accepting Rust code in 2022. Android, Windows, and Chrome all now use Rust for security-critical components. Cloudflare, Discord, Dropbox, and AWS have rewritten performance-sensitive services in Rust. The language has topped Stack Overflow's "most loved language" survey for eight consecutive years, reflecting genuine developer satisfaction rather than just hype.

Rust isn't without trade-offs. The learning curve is steep — the borrow checker, lifetimes, and ownership model require rethinking habits built over years of programming in other languages. Compile times are slower than C. The ecosystem, while growing rapidly, is younger and smaller than C/C++. But for new systems-level projects where security, concurrency, and reliability matter — which is increasingly everything — Rust represents a genuine paradigm improvement, not just a new language.`
    },
    {
      id: 'tech_06', topic: 'tech', readTime: '4 min',
      title: 'How Large Language Models Work',
      author: 'LifeOS Knowledge',
      content: `Large language models (LLMs) like GPT-4, Claude, and Gemini are built on the transformer architecture, introduced in a 2017 Google research paper titled "Attention Is All You Need." At their core, these models predict the next word (technically, token) in a sequence based on all the preceding context. What makes them remarkable isn't a fundamentally different approach to language — it's the scale at which this simple prediction task is performed.

Training an LLM involves two phases. First, pre-training: the model reads enormous amounts of text — books, websites, code, scientific papers — and adjusts billions of numerical parameters to minimize its prediction errors. GPT-4 is estimated to have over a trillion parameters trained on trillions of tokens. This process requires thousands of specialized GPUs running for months and costs tens of millions of dollars. During pre-training, the model develops an internal representation of language, facts, reasoning patterns, and even code structure — all as a byproduct of getting better at next-token prediction.

The second phase is alignment: fine-tuning the model to be helpful, harmless, and honest through techniques like Reinforcement Learning from Human Feedback (RLHF). Human raters evaluate model outputs, and the model is adjusted to prefer responses that humans rate highly. This is what transforms a raw text predictor into a useful assistant. Without alignment, a pre-trained model will generate plausible-sounding text but won't reliably follow instructions or avoid harmful content.

The "intelligence" of LLMs is a topic of intense debate. These models don't understand language the way humans do — they have no sensory experience, no embodied interaction with the world, no persistent memory across conversations. Yet they exhibit emergent capabilities — chain-of-thought reasoning, analogical thinking, translation between languages they weren't explicitly trained on — that surprise even their creators. Whether this constitutes genuine understanding or is an extraordinarily sophisticated pattern matching remains one of the most fascinating open questions in computer science.

What's practically important is understanding their limitations: LLMs can hallucinate (generate confident but false statements), they have knowledge cutoffs, they can't verify their own outputs, and they reflect biases present in their training data. Using them effectively means treating them as powerful but fallible tools — always verifying critical information and maintaining human judgment in the loop.`
    },

    /* ── HEALTH & FITNESS (6 articles) ── */
    {
      id: 'health_01', topic: 'health', readTime: '3 min',
      title: 'The Science of Sleep',
      author: 'LifeOS Knowledge',
      content: `Sleep is not downtime — it's the most productive thing your body does. During sleep, your brain consolidates memories, clears metabolic waste through the glymphatic system, repairs cellular damage, and regulates hormones that control appetite, mood, and immune function. Cutting sleep to gain "productive hours" is a false economy: cognitive performance after 24 hours without sleep is equivalent to a blood alcohol level of 0.10% — legally drunk in every US state.

Sleep architecture consists of four stages cycling roughly every 90 minutes. Stages 1-2 are light sleep, during which your body transitions from wakefulness. Stage 3 is deep (slow-wave) sleep, critical for physical recovery, immune function, and memory consolidation. REM sleep, where most dreaming occurs, is essential for emotional processing, creativity, and procedural memory. Missing any stage has specific consequences: insufficient deep sleep impairs physical recovery; insufficient REM sleep degrades emotional regulation and learning.

The single most impactful change you can make is consistency. Going to bed and waking up at the same time every day — including weekends — synchronizes your circadian rhythm. Your body's internal clock controls not just sleepiness but hormone release, body temperature, and metabolism. Irregular sleep schedules create a state similar to perpetual jet lag, which research links to increased risks of obesity, diabetes, cardiovascular disease, and depression.

Practical sleep hygiene includes: keeping your bedroom cool (65-68°F is optimal), eliminating screens 30-60 minutes before bed (blue light suppresses melatonin), avoiding caffeine after 2 PM (its half-life is 5-7 hours), limiting alcohol (it fragments sleep architecture despite feeling sedating), and using your bed only for sleep so your brain associates it with rest. These aren't luxuries — they're non-negotiable investments in every other aspect of your performance.`
    },
    {
      id: 'health_02', topic: 'health', readTime: '3 min',
      title: 'The 80/20 Nutrition Principle',
      author: 'LifeOS Knowledge',
      content: `Most nutrition advice fails because it demands perfection. Strict diets work for weeks, then collapse under the weight of willpower depletion, social pressure, and the biological reality that your body fights caloric restriction. The 80/20 principle offers a sustainable alternative: eat whole, nutrient-dense foods 80% of the time, and allow yourself flexibility for the remaining 20% without guilt or compensation.

The 80% should be built around what nutrition science consistently supports across decades of research: vegetables, fruits, lean proteins, whole grains, legumes, nuts, and healthy fats. These foods provide the vitamins, minerals, fiber, and micronutrients your body needs while naturally regulating calorie intake through satiety signals. You don't need to count calories if the majority of your plate is minimally processed food — your hunger hormones (leptin and ghrelin) work correctly when they're not disrupted by hyper-palatable engineered foods.

The 20% flexibility isn't just psychological comfort — it's metabolically strategic. Occasional caloric variation prevents metabolic adaptation, the process where your body downregulates energy expenditure in response to consistent restriction. It also preserves your relationship with food, which is critical for long-term adherence. A Friday pizza night with friends, birthday cake, a vacation indulgence — these aren't failures. They're features of a sustainable system.

The most common mistake people make is obsessing over specific macronutrient ratios or demonizing food groups (carbs, fat, etc.) while ignoring food quality. A diet of 40% carbs from vegetables and quinoa is profoundly different from 40% carbs from soda and white bread, even though the macros are identical. Focus on food quality first, quantity second, and specific macros third. That hierarchy solves 90% of nutrition problems without requiring a spreadsheet.`
    },
    {
      id: 'health_03', topic: 'health', readTime: '2 min',
      title: 'Why Walking Is the Most Underrated Exercise',
      author: 'LifeOS Knowledge',
      content: `In a fitness culture obsessed with high-intensity workouts, the humble walk is routinely dismissed. That's a mistake. Walking is the single most accessible, sustainable, and research-supported form of physical activity. A meta-analysis published in the British Journal of Sports Medicine found that walking 7,000-8,000 steps per day reduces all-cause mortality by 50-70% compared to sedentary behavior — benefits that rival or exceed many pharmaceutical interventions.

Walking's advantages extend far beyond cardiovascular health. It reduces cortisol and lowers anxiety within minutes. It improves creative thinking — a Stanford study found that walking increased creative output by an average of 60%. It supports metabolic health by improving insulin sensitivity, particularly after meals; a 10-minute post-meal walk is one of the most effective blood sugar management tools available. And it's joint-friendly, making it sustainable for decades regardless of age or fitness level.

The key insight is that walking doesn't replace intense exercise — it complements it. Elite athletes walk extensively as active recovery. The healthiest populations in the world (the "Blue Zones") don't do CrossFit; they walk everywhere as part of daily life. Aim for a baseline of 7,000-10,000 steps per day woven naturally into your routine — walking meetings, parking farther away, taking stairs — and add structured exercise on top. Your body was designed to move frequently at low intensity, and honoring that design pays dividends that no gym session alone can match.`
    },
    {
      id: 'health_04', topic: 'health', readTime: '3 min',
      title: 'Hydration: More Than Just Drinking Water',
      author: 'LifeOS Knowledge',
      content: `Your body is roughly 60% water, and even mild dehydration — as little as 1-2% body weight loss — measurably impairs cognitive performance, mood, and physical endurance. A landmark study at the University of Connecticut found that dehydration caused headaches, difficulty concentrating, and increased perception of task difficulty, regardless of whether subjects were exercising or sitting at a desk. Most people walk around mildly dehydrated without realizing it because thirst is a lagging indicator — by the time you feel thirsty, you're already impaired.

The "eight glasses a day" rule is a reasonable starting point but not a scientific prescription. Actual needs vary based on body size, activity level, climate, and diet. A more practical guideline is to aim for urine that's pale yellow — not clear (which can indicate overhydration) and not dark amber (dehydration). Athletes, people in hot climates, and those consuming high-protein diets need more. Coffee and tea, despite mild diuretic effects, count toward fluid intake — the hydration they provide outweighs the fluid lost.

Electrolytes are the overlooked half of the hydration equation. Sodium, potassium, magnesium, and calcium are essential for nerve function, muscle contraction, and fluid balance. Drinking large volumes of plain water without adequate electrolytes can actually dilute your blood sodium (hyponatremia) — a surprisingly common issue among endurance athletes and aggressive hydrators. Adding a pinch of salt to water, eating potassium-rich foods like bananas and avocados, or using sugar-free electrolyte mixes ensures your hydration is functional, not just volumetric.

Front-load your water intake. Drinking 16-20 ounces within the first hour of waking rehydrates your body after 7-8 hours of sleep-induced fasting and kickstarts your metabolism. Carry a water bottle as a visual cue. And remember that roughly 20% of your daily water intake comes from food, especially fruits and vegetables — another reason whole foods support health in ways supplements cannot replicate.`
    },
    {
      id: 'health_05', topic: 'health', readTime: '3 min',
      title: 'Strength Training: Not Just for Bodybuilders',
      author: 'LifeOS Knowledge',
      content: `Strength training — also called resistance training — is arguably the most important form of exercise for long-term health, yet it's the most underutilized. Beginning around age 30, adults lose 3-8% of muscle mass per decade (a process called sarcopenia), accelerating after 50. This muscle loss doesn't just mean weakness; it drives metabolic decline, insulin resistance, bone loss, increased fall risk, and reduced independence in later years. Strength training is the only intervention proven to reverse it.

The metabolic benefits are substantial. Muscle is metabolically active tissue — it burns calories at rest, improves insulin sensitivity, and serves as a glucose storage reservoir. After a strength workout, your metabolism stays elevated for 24-72 hours (excess post-exercise oxygen consumption, or EPOC). This means strength training is actually more effective for long-term fat loss than steady-state cardio, which burns calories only during the activity.

You don't need a gym or heavy weights to start. Bodyweight exercises — push-ups, squats, lunges, planks — provide sufficient resistance for beginners. The principle of progressive overload is what matters: gradually increasing the challenge over time, whether through added weight, more reps, slower tempos, or harder variations. Two to three sessions per week, each 30-45 minutes, is enough to produce significant improvements in strength, body composition, and metabolic health.

For longevity, the evidence is overwhelming. A 2022 systematic review in the British Journal of Sports Medicine found that 30-60 minutes of weekly strength training was associated with a 10-20% reduction in all-cause mortality, cardiovascular disease, cancer, and diabetes. Beyond the numbers, strength training builds functional capability — the ability to carry groceries, play with your kids, climb stairs at 80 — that defines quality of life in ways no other exercise modality matches.`
    },
    {
      id: 'health_06', topic: 'health', readTime: '3 min',
      title: 'Stress Management: Your Body\'s Emergency System',
      author: 'LifeOS Knowledge',
      content: `The stress response — the fight-or-flight system — evolved to save your life in acute physical danger. When a threat is detected, your hypothalamus triggers a cascade: adrenaline and cortisol flood your bloodstream, your heart rate spikes, blood diverts to muscles, digestion halts, and your immune system temporarily ramps up. This response is brilliant for escaping a predator and catastrophic when triggered by email notifications, traffic jams, and work deadlines.

Chronic stress — the modern epidemic — keeps cortisol perpetually elevated. The consequences are systemic: suppressed immune function, disrupted sleep, increased visceral fat storage (especially around the abdomen), impaired memory and learning, elevated blood pressure, and accelerated cellular aging. A landmark study by Elizabeth Blackburn (Nobel Prize, 2009) demonstrated that chronic psychological stress literally shortens telomeres — the protective caps on chromosomes — accelerating biological aging at the cellular level.

The most effective stress management isn't avoidance — it's deliberate activation of the parasympathetic nervous system, the "rest and digest" counterbalance to fight-or-flight. Techniques with strong evidence include: diaphragmatic breathing (5 seconds in, 5 seconds out activates the vagus nerve within minutes), progressive muscle relaxation, regular exercise (which metabolizes stress hormones), time in nature (even 20 minutes in a park reduces cortisol by 20%), and social connection (isolation is as damaging to health as smoking 15 cigarettes a day).

The cognitive dimension matters too. Much of modern stress comes from rumination — replaying past events or catastrophizing future ones. Cognitive reappraisal (reframing a stressor as a challenge rather than a threat) has been shown to reduce cortisol and improve performance under pressure. The goal isn't to eliminate stress — some stress (eustress) drives growth and achievement — but to ensure you have effective recovery mechanisms so that stress remains episodic rather than chronic.`
    },

    /* ── PSYCHOLOGY (6 articles) ── */
    {
      id: 'psych_01', topic: 'psychology', readTime: '3 min',
      title: 'The Science of Habit Formation',
      author: 'LifeOS Knowledge',
      content: `Every habit follows the same neurological loop: cue, craving, routine, reward. A cue triggers a craving (the motivational force), which drives a routine (the behavior), which delivers a reward (the satisfaction). Over time, this loop gets encoded in the basal ganglia, allowing it to run on autopilot without conscious decision-making. This is why habits feel effortless once established — and why they're so hard to break.

Research by Phillippa Lally at University College London found that the average time to form a new habit is 66 days — not the popular "21 days" myth. But the range was enormous: from 18 to 254 days, depending on the complexity of the behavior and the individual. The key finding was that missing a single day didn't significantly affect long-term habit formation. Consistency matters more than perfection; what kills habits is missed days turning into missed weeks.

The most effective habit-building strategy, popularized by James Clear in "Atomic Habits," is to make the desired behavior obvious (place your running shoes by the door), attractive (pair it with something enjoyable), easy (start with two minutes — "just put on your shoes"), and satisfying (track your streak). Habit stacking — attaching a new habit to an existing one ("after I pour my morning coffee, I will meditate for two minutes") — leverages the established neural pathways of the existing habit to anchor the new one.

Breaking bad habits requires inverting the same framework: make the cue invisible (remove junk food from the house), the craving unattractive (visualize long-term consequences), the routine difficult (add friction, like deleting social media apps from your phone), and the reward unsatisfying (use commitment devices or accountability partners). Understanding that habits are neurological loops — not character traits — removes moral judgment and replaces it with engineering, which is far more effective.`
    },
    {
      id: 'psych_02', topic: 'psychology', readTime: '3 min',
      title: 'Cognitive Biases That Hijack Your Decisions',
      author: 'LifeOS Knowledge',
      content: `Your brain processes roughly 11 million bits of sensory information per second, but your conscious mind can handle only about 50. To bridge this gap, your brain relies on mental shortcuts called heuristics. They're usually helpful — but when they go wrong, they become cognitive biases: systematic errors in thinking that distort judgment and decision-making. Understanding the most common ones is like gaining a superpower in daily life.

Confirmation bias is the tendency to seek, interpret, and remember information that confirms what you already believe. It's why political debates rarely change minds — both sides literally process the same facts differently. The antidote is to actively seek disconfirming evidence and ask: "What would change my mind?" The anchoring effect causes you to rely too heavily on the first piece of information you encounter. In negotiation, the first number mentioned disproportionately influences the outcome. Knowing this lets you either set the anchor or consciously adjust away from someone else's.

The availability heuristic makes you judge probability based on how easily examples come to mind. After watching news coverage of a plane crash, people overestimate the danger of flying despite it being statistically the safest transportation mode. The sunk cost fallacy keeps you investing in failing projects, bad relationships, or unwatched streaming subscriptions because you've "already put so much in" — even though past costs are irrelevant to future decisions. Loss aversion means losing $100 feels roughly twice as painful as gaining $100 feels good, which makes people irrationally risk-averse with gains and risk-seeking with losses.

The practical value of knowing these biases isn't to eliminate them — they're deeply wired into human cognition — but to create decision-making systems that compensate. Use checklists for important decisions. Seek dissenting opinions deliberately. Sleep on major choices to reduce emotional distortion. And remember: the feeling of certainty is not evidence of being correct. The most dangerous cognitive bias is the belief that you don't have any.`
    },
    {
      id: 'psych_03', topic: 'psychology', readTime: '2 min',
      title: 'The Growth Mindset: Rethinking Intelligence',
      author: 'LifeOS Knowledge',
      content: `Stanford psychologist Carol Dweck's research on mindset has transformed how we understand learning, resilience, and achievement. Her core finding: people who believe their abilities are fixed ("I'm just not a math person") behave fundamentally differently from those who believe abilities can be developed through effort and strategy. The former avoid challenges, give up easily, and see effort as pointless. The latter embrace challenges, persist through setbacks, and see effort as the path to mastery.

The distinction isn't about blind optimism or ignoring natural talent. It's about the relationship between effort and outcome. In studies across age groups and cultures, students praised for being "smart" subsequently chose easier tasks to protect their identity, while students praised for working hard chose harder tasks to continue growing. The type of praise literally changed risk tolerance, persistence, and ultimately performance over time.

Developing a growth mindset is a practice, not a switch. Start by noticing fixed-mindset self-talk: "I can't do this" becomes "I can't do this yet." Reframe failure from "I'm not good enough" to "This strategy didn't work — what should I try next?" Seek out challenges that stretch you slightly beyond your comfort zone (what psychologist Lev Vygotsky called the "zone of proximal development") where growth actually happens.

The most powerful application of growth mindset is in how you respond to feedback and criticism. Fixed-mindset individuals perceive critical feedback as a personal attack; growth-mindset individuals treat it as valuable data. This single shift transforms relationships, accelerates learning, and builds the resilience that distinguishes people who achieve long-term success from those who plateau early and wonder why.`
    },
    {
      id: 'psych_04', topic: 'psychology', readTime: '3 min',
      title: 'The Psychology of Procrastination',
      author: 'LifeOS Knowledge',
      content: `Procrastination is not laziness. This distinction, backed by decades of research, is crucial. Laziness is apathy — not caring about the outcome. Procrastination is the opposite: you care intensely about the outcome, which is exactly why you avoid it. At its core, procrastination is an emotional regulation problem, not a time management one. You procrastinate because the task triggers negative emotions — anxiety, boredom, frustration, self-doubt — and your brain seeks short-term mood repair by switching to something pleasant.

Dr. Timothy Pychyl, a leading procrastination researcher at Carleton University, describes it as "giving in to feel good." The prefrontal cortex (responsible for long-term planning) loses the battle to the amygdala (driven by immediate emotional relief). This is why procrastinators often report feeling better immediately after deciding to delay a task — and then worse as the deadline approaches and guilt, shame, and panic compound the original negative emotions.

The most effective anti-procrastination strategies target the emotional component, not the schedule. The "just get started" technique works because the hardest part of any task is beginning — once you've invested even five minutes, the Zeigarnik effect (our brain's tendency to fixate on incomplete tasks) takes over and provides momentum. Implementation intentions ("At 9 AM, I will open the document and write the first paragraph") reduce the decision-making friction that enables avoidance.

Breaking tasks into absurdly small steps also helps: "Write the introduction" feels overwhelming; "Write one sentence" doesn't. Temptation bundling — pairing an unpleasant task with something enjoyable (working on taxes while drinking your favorite coffee at a nice café) — addresses the emotional deficit directly. Self-compassion, counterintuitively, reduces procrastination more than self-criticism; research shows that people who forgive themselves for procrastinating are less likely to procrastinate in the future because they've broken the guilt-avoidance cycle.`
    },
    {
      id: 'psych_05', topic: 'psychology', readTime: '3 min',
      title: 'Emotional Intelligence: The Other IQ',
      author: 'LifeOS Knowledge',
      content: `In 1995, psychologist Daniel Goleman published a book that challenged the assumption that cognitive intelligence (IQ) was the primary predictor of success. His research showed that emotional intelligence (EQ) — the ability to recognize, understand, manage, and effectively use emotions — accounted for nearly 90% of what sets high performers apart from peers with similar technical skills. The finding has been replicated across industries: EQ predicts leadership effectiveness, team performance, and career advancement more reliably than IQ alone.

Emotional intelligence has four components. Self-awareness is the foundation: accurately recognizing your own emotions as they occur, understanding your triggers, and knowing your strengths and limitations. Self-management is the ability to regulate disruptive emotions, maintain composure under pressure, and adapt to changing circumstances. Social awareness involves reading others' emotions, understanding group dynamics, and practicing empathy. Relationship management — the most visible component — is the ability to inspire, influence, develop others, manage conflict, and build cooperative teams.

Unlike IQ, which is largely stable after early adulthood, EQ is highly trainable. The key practice is developing a gap between stimulus and response. When someone criticizes your work, the untrained response is immediate defensiveness. An emotionally intelligent response involves noticing the defensive impulse (self-awareness), pausing before reacting (self-management), considering the other person's perspective (social awareness), and responding constructively (relationship management). This gap — even a few seconds — transforms interactions.

Practical exercises to build EQ include: labeling your emotions specifically (replacing "I feel bad" with "I feel frustrated because my contribution wasn't acknowledged"), active listening without formulating your response while the other person speaks, asking for feedback and sitting with the discomfort, and keeping an emotion journal. The compounding returns of investing in EQ are extraordinary — because every human interaction, from salary negotiations to friendships, runs on emotional undercurrents that most people never learn to navigate.`
    },
    {
      id: 'psych_06', topic: 'psychology', readTime: '3 min',
      title: 'Decision Fatigue and Choice Architecture',
      author: 'LifeOS Knowledge',
      content: `A famous study of Israeli parole judges revealed that favorable rulings dropped from 65% to nearly 0% over the course of a session — then jumped back to 65% after a meal break. The judges weren't biased; they were mentally exhausted. Each decision depleted a shared cognitive resource, causing them to default to the easiest option (denying parole). This phenomenon — decision fatigue — explains why you make worse choices at the end of a long day and why Steve Jobs wore the same outfit every morning.

Your brain makes an estimated 35,000 decisions per day, most unconsciously. But every conscious decision — what to eat, what to wear, how to respond to an email, whether to exercise — draws from a finite pool of executive function. The implications are practical: front-load important decisions to the morning when your willpower reservoir is full. Batch similar decisions together. And ruthlessly eliminate trivial choices: meal prep on Sunday, set out clothes the night before, automate recurring bills.

Choice architecture — a concept from behavioral economics — is the deliberate design of environments to make good decisions easy and bad decisions hard. Place healthy food at eye level and junk food on high shelves. Keep your phone in another room while working. Set up automatic transfers to savings. Use website blockers during focus hours. You're not relying on willpower; you're engineering your environment to make the desired behavior the default.

The most powerful application is creating what psychologists call "bright lines" — clear, binary rules that eliminate decision-making entirely. "I don't check email before 10 AM" is a bright line. "I'll try to check email less" is a decision you have to make repeatedly, each time depleting willpower. The more decisions you can convert from active choices to automatic rules or environmental defaults, the more cognitive energy you preserve for the decisions that truly matter.`
    },

    /* ── BUSINESS & STARTUPS (6 articles) ── */
    {
      id: 'biz_01', topic: 'business', readTime: '3 min',
      title: 'Lean Startup Methodology',
      author: 'LifeOS Knowledge',
      content: `Eric Ries's Lean Startup methodology, published in 2011, fundamentally changed how entrepreneurs think about building companies. The core insight is deceptively simple: most startups fail not because they can't build their product, but because they build a product nobody wants. The solution is to minimize the time between having a hypothesis about customer needs and testing that hypothesis with real customers — a cycle Ries calls "Build, Measure, Learn."

The minimum viable product (MVP) is the methodology's most famous concept. An MVP is the smallest version of your product that lets you test your core hypothesis with real users. It's not a prototype and it's not a beta — it's a strategic experiment. Dropbox's MVP was a three-minute video showing how the product would work; it generated 75,000 email signups overnight, validating demand before a single line of production code was written. Zappos's MVP was a website with photos of shoes from local stores; the founder bought and shipped them manually to test whether people would buy shoes online.

Validated learning is what separates lean methodology from "just launching fast." Every experiment should test a specific, falsifiable hypothesis: "We believe that [customer segment] will [take action] because [reason]." You measure the result with actionable metrics (not vanity metrics like page views), and you make a decision: persevere on the current path, or pivot to a new hypothesis. Pivoting isn't failure — it's the methodology working as designed. Instagram pivoted from a location-based check-in app called Burbn. Slack pivoted from a failed video game.

The methodology applies beyond startups. Corporate innovation teams, nonprofits, and even individuals planning career changes benefit from the same principles: identify your riskiest assumption, design the cheapest possible experiment to test it, measure the result honestly, and iterate. The alternative — spending months or years building something in isolation before discovering the market doesn't want it — is the most expensive mistake in business, and it's almost entirely preventable.`
    },
    {
      id: 'biz_02', topic: 'business', readTime: '3 min',
      title: 'Product-Market Fit: The Only Thing That Matters',
      author: 'LifeOS Knowledge',
      content: `Marc Andreessen, co-founder of Netscape and the venture firm a16z, wrote that "the only thing that matters" for a startup is product-market fit (PMF). It's the moment when your product satisfies a strong market demand — when customers are buying as fast as you can produce, usage grows organically, and you're hiring as fast as you can. Before PMF, nothing else matters; after PMF, most things are fixable. The concept sounds obvious, but the majority of startups that fail never achieve it.

The challenge is that product-market fit is easier to recognize than to measure. Sean Ellis, who coined the term "growth hacking," proposed a practical survey: ask users, "How would you feel if you could no longer use this product?" If 40% or more answer "very disappointed," you likely have PMF. Below 40%, you're still searching. This benchmark has been validated across hundreds of startups and provides a concrete, testable metric in a space that's otherwise dominated by gut feelings and vanity metrics.

The path to PMF is rarely linear. Most successful companies iterate through multiple versions of their product, target customer, and value proposition before finding the fit. Airbnb nearly died multiple times before discovering that professional photography of listings — not a technology improvement — was the key to unlocking demand. The founders went door-to-door with cameras. The lesson: PMF often requires deep, unglamorous customer understanding rather than brilliant engineering.

Once you achieve PMF, the challenge shifts from "does anyone want this?" to "can we scale this?" — and the two require very different skills. Before PMF, spend 80% of your time talking to customers and iterating on the product. After PMF, invest in growth, hiring, and operational infrastructure. The most common mistake is scaling before PMF: pouring money into marketing, hiring executives, and building infrastructure for a product the market hasn't embraced. It's like stepping on the gas before knowing which direction to drive.`
    },
    {
      id: 'biz_03', topic: 'business', readTime: '3 min',
      title: 'The Art of Negotiation',
      author: 'LifeOS Knowledge',
      content: `Most people approach negotiation as a competitive zero-sum game: whatever you gain, the other side loses. Chris Voss, a former FBI lead hostage negotiator and author of "Never Split the Difference," argues this framing is wrong — and dangerous. The most effective negotiation isn't about crushing your opponent; it's about understanding their constraints, emotions, and true priorities so thoroughly that you can craft solutions that satisfy both parties. The best deals leave everyone feeling they got something valuable.

Tactical empathy is Voss's central technique: deliberately demonstrating that you understand the other party's perspective without necessarily agreeing with it. Labeling emotions — "It sounds like you're frustrated with the timeline" — validates their experience and reduces defensive reactions. Mirroring — repeating the last 1-3 words they said — encourages them to elaborate and reveals information they wouldn't share in response to direct questions. These techniques feel deceptively simple but require practice to use naturally.

The power of "no" is counterintuitive but critical. Most negotiation training teaches you to get the other side to say "yes" early and often. Voss flips this: people feel protected and in control when they say "no," so questions designed to elicit "no" ("Is it a bad idea to...?" or "Have you given up on...?") actually create more engagement and honesty than "yes"-oriented questions, which trigger suspicion of manipulation.

Preparation is where most negotiations are won or lost. Before any significant negotiation — salary, business deal, even a difficult conversation with a partner — identify your BATNA (Best Alternative To Negotiated Agreement), which is your walkaway point. Research the other party's constraints and incentives. Prepare specific, non-round numbers (asking for $83,500 instead of $85,000 signals research and precision). And never negotiate against yourself by lowering your position before the other side has responded. Silence, deployed deliberately, is one of the most powerful negotiation tools that almost nobody uses.`
    },
    {
      id: 'biz_04', topic: 'business', readTime: '3 min',
      title: 'Network Effects: How Winners Take All',
      author: 'LifeOS Knowledge',
      content: `A network effect occurs when a product becomes more valuable as more people use it. The telephone is the classic example: one telephone is useless; two can communicate; a million create an indispensable communication network. In the digital economy, network effects are the most powerful competitive advantage a company can build — more durable than technology, brand, or even capital. Facebook, Uber, Airbnb, and Visa all derive their dominance primarily from network effects.

There are several types. Direct network effects (Metcalfe's Law) occur when each new user adds value to all existing users — messaging apps, social networks, multiplayer games. Indirect (two-sided) network effects emerge in platform businesses: more riders attract more drivers to Uber, which attracts more riders, creating a virtuous cycle. Data network effects occur when usage generates data that improves the product: Google's search results improve with every query, which attracts more users, which generates more data.

The strategic implications are profound. Network effects create winner-take-most markets because the leading platform's advantage compounds with each new user, making it increasingly difficult for competitors to catch up. This explains why most categories have one dominant platform (Google in search, WhatsApp in messaging, LinkedIn in professional networking) and why startups in network-effect businesses focus on growth over profitability in early stages — the first to reach critical mass often wins permanently.

For entrepreneurs, the key question is: how do you bootstrap a network when the product has no users and therefore no value? Strategies include starting in a narrow niche (Facebook launched at Harvard only), providing standalone value that doesn't require a network (Instagram was a great photo editing app before it was a social network), seeding one side of a two-sided market (Uber subsidized early drivers), and creating switching costs that lock in early adopters. Understanding network effects isn't just academic — it determines whether your business builds a moat or gets commoditized.`
    },
    {
      id: 'biz_05', topic: 'business', readTime: '3 min',
      title: 'Remote Work: Managing Distributed Teams',
      author: 'LifeOS Knowledge',
      content: `The pandemic forced a global experiment in remote work, and the data is now clear: remote and hybrid models are not temporary accommodations but permanent features of the knowledge economy. Studies by Stanford economist Nicholas Bloom found that hybrid work (3 days office, 2 days remote) reduces quit rates by 35% with no impact on productivity or career advancement. Fully remote companies like GitLab (1,500+ employees, no office) have demonstrated that distributed work can scale — but it requires fundamentally different management practices.

Communication in remote teams must be deliberate where it was previously ambient. The most successful remote organizations practice "documentation as default": every decision, meeting outcome, and process is written down in a shared knowledge base. This creates an asynchronous communication layer where team members can access information on their schedule rather than depending on being in the right meeting or overhearing the right hallway conversation. GitLab's public handbook is over 2,000 pages and serves as the single source of truth for the entire company.

The biggest remote work pitfall is "presence bias" — the tendency for managers to assume that visible workers are productive workers. This leads to performative behaviors: excessive Slack messaging, unnecessary video calls, and status-signaling activity that adds no value. The antidote is outcome-based management: define clear deliverables with deadlines, give people autonomy over how and when they work, and evaluate results rather than hours logged. This requires trust, which is built through transparency, consistent communication, and following through on commitments.

For individuals, remote work requires deliberate boundary management. Without a physical office, work can bleed into every waking hour — a phenomenon called "the always-on trap." Effective practices include: maintaining a dedicated workspace (even if it's a corner of a room), establishing firm start and end times, using a shutdown ritual to signal the end of the workday, and scheduling social interactions intentionally since they no longer happen organically. Remote work isn't working from home — it's a different mode of professional operation that rewards self-awareness and proactive communication.`
    },
    {
      id: 'biz_06', topic: 'business', readTime: '3 min',
      title: 'Pricing Psychology: How to Value Your Work',
      author: 'LifeOS Knowledge',
      content: `Pricing is the single most impactful lever in business, yet it's the least studied by most entrepreneurs. A McKinsey study found that a 1% improvement in price, on average, increases operating profit by 11% — more than a 1% improvement in volume, variable costs, or fixed costs. Despite this, most businesses set prices by looking at competitors and adding or subtracting a small margin, leaving enormous value on the table.

Value-based pricing — setting prices based on the customer's perceived value rather than your costs — is the gold standard. If your software saves a company $500,000 per year, charging $50,000 is justified regardless of whether it costs you $5,000 or $50 to deliver. The key is understanding and quantifying the value you create, then capturing a fair share of it. This requires deep customer research: what alternatives do they have? What's the cost of their current solution? What would they lose if your product didn't exist?

Pricing psychology reveals consistent human behaviors that affect willingness to pay. Charm pricing ($9.99 vs. $10.00) works for commodity goods but signals cheapness for premium products. Anchoring — showing a higher-priced option first — makes subsequent prices seem reasonable by comparison (this is why SaaS companies always show the enterprise plan first). The decoy effect uses a strategically inferior middle option to push buyers toward the premium tier. And price framing matters: "$1 per day" feels more affordable than "$365 per year," even though they're identical.

The most common pricing mistake is underpricing out of fear. Founders and freelancers worry that higher prices will drive customers away, but research consistently shows that moderate price increases cause far less volume loss than expected — and the increased margin more than compensates. Furthermore, higher prices attract better customers who value quality, pay on time, and are less likely to churn. If nobody ever pushes back on your price, you're almost certainly charging too little.`
    },

    /* ── SCIENCE (6 articles) ── */
    {
      id: 'sci_01', topic: 'science', readTime: '3 min',
      title: 'CRISPR: Gene Editing Revolution',
      author: 'LifeOS Knowledge',
      content: `CRISPR-Cas9, which earned Jennifer Doudna and Emmanuelle Charpentier the 2020 Nobel Prize in Chemistry, is a gene-editing technology that allows scientists to precisely cut and modify DNA in any living organism. The system was adapted from a natural defense mechanism used by bacteria to fight viruses: bacteria store snippets of viral DNA (the CRISPR sequences) and use a protein called Cas9 as molecular scissors to cut matching viral DNA during future infections. Scientists realized they could program Cas9 with a custom guide RNA to cut any specific DNA sequence they chose.

The precision is what makes CRISPR transformative. Previous gene-editing technologies (ZFNs, TALENs) were expensive, slow, and often inaccurate — like editing a book by ripping out pages. CRISPR is more like a find-and-replace function: it can locate a specific sequence among three billion base pairs of human DNA and make targeted modifications. A single experiment that previously took months and cost thousands of dollars can now be done in weeks for hundreds.

The medical applications are already moving from lab to clinic. In December 2023, the FDA approved Casgevy — the first CRISPR-based therapy — for sickle cell disease, effectively curing patients by editing their own blood stem cells to produce functional hemoglobin. Clinical trials are underway for genetic blindness, certain cancers, high cholesterol, and HIV. The potential to cure thousands of genetic diseases caused by known single-gene mutations is no longer theoretical — it's an engineering challenge with a clear path forward.

The ethical debates are as significant as the science. Germline editing — modifying DNA in embryos so changes are inherited by future generations — raises questions no technology has posed before. In 2018, Chinese scientist He Jiankui created the first gene-edited babies, drawing worldwide condemnation for acting recklessly and without proper oversight. The scientific community broadly agrees that germline editing is premature given our incomplete understanding of gene interactions, but the technology exists, and governing its use requires international coordination that doesn't yet exist.`
    },
    {
      id: 'sci_02', topic: 'science', readTime: '3 min',
      title: 'Neuroplasticity: Your Brain Can Rewire Itself',
      author: 'LifeOS Knowledge',
      content: `For most of the 20th century, neuroscience held a firm belief: the adult brain was fixed. You were born with a set number of neurons, they wired themselves during childhood, and after a "critical period" the architecture was set. Learning was possible, but fundamental rewiring was not. This belief was wrong. Research over the past three decades has demonstrated that the brain remains remarkably malleable throughout life — a property called neuroplasticity.

Neuroplasticity operates on multiple scales. At the synaptic level, connections between neurons strengthen with repeated use (long-term potentiation) and weaken with disuse (long-term depression) — the cellular basis of "neurons that fire together wire together." At the structural level, the brain can grow new neurons (neurogenesis, particularly in the hippocampus), form new synaptic connections, and even repurpose entire cortical regions. Blind individuals, for example, show activation of their visual cortex during Braille reading — the brain reallocated unused visual processing capacity to tactile processing.

The practical implications are profound. London taxi drivers, who spend years memorizing the city's labyrinthine streets, develop measurably larger hippocampi than bus drivers who follow fixed routes. Musicians who practice extensively show expanded cortical representation of the hand they use most. Meditation practitioners develop thicker prefrontal cortices and altered amygdala responses. These aren't metaphorical changes — they're physical, measurable alterations in brain structure driven by sustained behavioral practice.

The flip side is that neuroplasticity is value-neutral: the brain rewires in response to whatever you repeatedly do, helpful or harmful. Chronic stress shrinks the hippocampus. Addictive substances hijack the reward circuitry and strengthen compulsive pathways. Excessive social media use may be reshaping attention systems. Understanding neuroplasticity empowers you to be intentional about which neural pathways you're strengthening — because you're always strengthening something, whether you choose it consciously or not.`
    },
    {
      id: 'sci_03', topic: 'science', readTime: '3 min',
      title: 'The Microbiome: Your Body\'s Hidden Organ',
      author: 'LifeOS Knowledge',
      content: `You are more microbe than human. Your body hosts roughly 38 trillion bacterial cells — slightly more than your 30 trillion human cells — along with viruses, fungi, and archaea, collectively called the microbiome. The majority reside in your gut, where they form an ecosystem so complex and functionally important that scientists now refer to it as a "hidden organ." These microbes aren't passengers; they're active participants in digestion, immune regulation, vitamin synthesis, and even brain function.

The gut-brain axis — the bidirectional communication highway between your gut microbiome and your brain — is one of the most exciting frontiers in neuroscience. Gut bacteria produce approximately 95% of the body's serotonin (the "happiness" neurotransmitter) and significant quantities of GABA, dopamine, and norepinephrine. Animal studies have shown that transferring gut bacteria from anxious mice to calm mice makes the calm mice anxious — and vice versa. Human studies are still early but consistently find associations between microbiome composition and conditions including depression, anxiety, autism spectrum disorder, and Parkinson's disease.

Your microbiome composition is shaped primarily by diet. Fiber is the key variable: gut bacteria ferment dietary fiber into short-chain fatty acids (SCFAs) like butyrate, which nourish the intestinal lining, reduce inflammation, and regulate immune function. A diverse, plant-rich diet (30+ different plant foods per week is a benchmark from the American Gut Project) supports microbial diversity, which correlates with better health outcomes. Conversely, the typical Western diet — high in processed food, sugar, and artificial additives — is associated with reduced microbial diversity and increased intestinal permeability ("leaky gut").

Antibiotic use, while lifesaving when needed, can devastate microbiome diversity. A single course of broad-spectrum antibiotics can eliminate beneficial bacterial species that take months to recover — and some may never return. Probiotic supplements are aggressively marketed but the evidence is mixed; most commercial probiotics contain species that don't colonize the gut permanently. The most reliable strategy is to feed the bacteria you already have with prebiotic fiber (onions, garlic, bananas, asparagus, oats) and fermented foods (yogurt, kimchi, sauerkraut, kefir) that introduce beneficial live cultures.`
    },
    {
      id: 'sci_04', topic: 'science', readTime: '3 min',
      title: 'Climate Science: What the Data Actually Shows',
      author: 'LifeOS Knowledge',
      content: `Earth's average surface temperature has risen approximately 1.1°C (2.0°F) since the pre-industrial era (1850-1900), with the rate of warming accelerating. The last decade was the warmest in recorded history, and each of the past four decades has been successively warmer than any preceding decade since 1850. These aren't model projections — they're direct measurements from thousands of weather stations, ocean buoys, satellites, and ice cores that provide consistent, independent confirmation.

The cause is unambiguous in the scientific literature. Carbon dioxide (CO₂) absorbs infrared radiation that would otherwise escape to space — a property demonstrated in laboratory physics since the 1850s. Atmospheric CO₂ has risen from 280 parts per million (ppm) before industrialization to over 420 ppm today, primarily from burning fossil fuels. Ice cores show that current CO₂ levels are higher than at any point in the past 800,000 years. The correlation between CO₂ concentration and temperature is not just statistical — it's causal, verified by the fundamental physics of molecular absorption spectra.

The consequences scale non-linearly with temperature. At 1.5°C of warming, coral reef die-off accelerates dramatically. At 2°C, extreme weather events (heat waves, floods, droughts) become significantly more frequent and severe. At 3°C, large-scale disruptions to agriculture, water supply, and human habitability in tropical regions become likely. Current policies put the world on track for approximately 2.5-2.8°C by 2100, though the range of uncertainty extends higher.

The solutions landscape has shifted dramatically. Solar energy costs have dropped 90% since 2010 and are now the cheapest source of new electricity in most of the world. Wind power, battery storage, electric vehicles, and heat pumps are all on exponential adoption curves. The question is no longer whether clean technology can replace fossil fuels — it's whether deployment can happen fast enough to avoid the worst outcomes. Individual actions matter (diet, transportation, consumption choices), but systemic changes in energy policy, industrial processes, and land use are the primary levers at the scale required.`
    },
    {
      id: 'sci_05', topic: 'science', readTime: '3 min',
      title: 'The Physics of Everyday Life',
      author: 'LifeOS Knowledge',
      content: `Physics isn't abstract — it's the operating system of everything you experience. Every time you microwave food, drive a car, or charge your phone, you're relying on physical principles that were once considered cutting-edge research. Understanding the basics doesn't require equations; it requires curiosity about the "why" behind things you've always taken for granted.

Your microwave oven works by emitting electromagnetic radiation at 2.45 GHz — a frequency that causes water molecules to rotate rapidly. This molecular rotation generates heat through friction, which is why dry foods don't heat well in a microwave and why the center of thick foods stays cold (microwaves penetrate only about 1-2 centimeters; the interior heats through conduction). The turntable exists because microwave ovens create standing waves with hot and cold spots; rotation moves food through the hot spots for more even heating.

GPS — the system your phone uses for navigation — is a triumph of Einstein's relativity. Twenty-four satellites orbit Earth at 20,200 km altitude, each carrying an atomic clock accurate to one nanosecond. Your phone calculates its position by comparing signals from multiple satellites and computing the time differences. But here's the physics twist: the satellites' clocks tick faster than ground clocks by 38 microseconds per day due to both special relativity (moving clocks run slow) and general relativity (clocks in weaker gravity run fast, which dominates). Without relativistic corrections applied every day, GPS would accumulate errors of about 10 kilometers daily.

Airplane flight relies on Bernoulli's principle and Newton's third law working together. The curved upper surface of a wing forces air to travel faster above than below, creating lower pressure above (Bernoulli) and generating lift. Simultaneously, the wing deflects air downward, and by Newton's third law, the air pushes the wing upward. A commercial jet generates enough lift to keep 400 tons airborne through these principles, discovered centuries ago and refined through engineering into one of humanity's safest transportation systems.`
    },
    {
      id: 'sci_06', topic: 'science', readTime: '3 min',
      title: 'The Science of Aging — And How to Slow It',
      author: 'LifeOS Knowledge',
      content: `Aging was long considered an inevitable, unalterable process — the gradual wear and tear of a biological machine. Modern geroscience has overturned this view. Aging is now understood as a collection of specific, interconnected biological processes — the "hallmarks of aging" — that are potentially modifiable. Researchers have identified nine hallmarks including telomere shortening, mitochondrial dysfunction, cellular senescence (zombie cells that accumulate and cause inflammation), and epigenetic drift (changes to gene expression patterns without changes to DNA).

The most promising interventions target these hallmarks directly. Caloric restriction (reducing calorie intake by 15-30% while maintaining nutrition) consistently extends lifespan and healthspan in organisms from yeast to primates. The mechanism involves activating cellular maintenance pathways (like autophagy — the cell's recycling system) that are suppressed when nutrients are abundant. Intermittent fasting may provide some of the same benefits through similar pathway activation, though human evidence is still accumulating.

Exercise is the closest thing to an anti-aging drug that exists. Regular aerobic and resistance exercise improves mitochondrial function, reduces cellular senescence markers, maintains telomere length, enhances autophagy, reduces chronic inflammation, and preserves cognitive function. A 2023 study in Nature Aging found that physically active 75-year-olds had immune profiles resembling those of people decades younger. No pharmaceutical intervention comes close to matching this breadth of effect.

The longevity research field is also pursuing pharmacological approaches. Rapamycin (an immunosuppressant that activates autophagy) extends lifespan in every organism tested. Senolytics — drugs that clear senescent cells — have shown remarkable results in animal models, with human trials underway. Metformin, a cheap diabetes drug, is being studied in the large-scale TAME trial for its potential to delay age-related diseases broadly. Whether these will work in humans as well as in animal models remains to be proven, but the scientific framework for understanding — and potentially intervening in — aging has never been stronger.`
    },

    /* ── PRODUCTIVITY (6 articles) ── */
    {
      id: 'prod_01', topic: 'productivity', readTime: '3 min',
      title: 'Deep Work: Rules for Focused Success',
      author: 'LifeOS Knowledge',
      content: `Cal Newport's "Deep Work" thesis is built on a simple observation: the ability to focus without distraction on cognitively demanding tasks is simultaneously becoming rarer (due to social media, open offices, and constant connectivity) and more valuable (as routine tasks are increasingly automated). Those who cultivate this ability will thrive; those who don't will struggle to produce work that stands out in a competitive economy.

Deep work is defined as professional activities performed in a state of distraction-free concentration that push your cognitive capabilities to their limit. It's distinct from "shallow work" — logistically necessary but cognitively undemanding tasks like email, meetings, and administrative busywork. Newport argues that most knowledge workers spend the majority of their time on shallow work while telling themselves they're busy, and that the solution is to treat deep work as a practice that requires scheduling, protection, and ritual.

The practical framework involves four rules. First, work deeply: schedule blocks of uninterrupted time (90-120 minutes minimum) for your most important cognitive work, and protect these blocks as you would a meeting with your CEO. Second, embrace boredom: if you reach for your phone every time you're bored (in line, waiting for an elevator), you're training your brain to demand novelty, making sustained focus physiologically harder. Third, quit social media — or at least subject each platform to a rigorous cost-benefit analysis and use it deliberately rather than habitually. Fourth, drain the shallows: audit your time, minimize unnecessary meetings, and batch shallow tasks into designated periods.

The average knowledge worker can sustain approximately four hours of deep work per day. This might sound limiting, but consider: if you're currently getting 30 minutes of true focus scattered throughout an eight-hour day (which research suggests is typical), moving to even two concentrated hours represents a fourfold increase in your most valuable output. The goal isn't to work more hours — it's to make the hours you work produce disproportionate results.`
    },
    {
      id: 'prod_02', topic: 'productivity', readTime: '3 min',
      title: 'Time Blocking: Your Calendar Is Your Strategy',
      author: 'LifeOS Knowledge',
      content: `Time blocking is the practice of dividing your day into specific blocks of time, each dedicated to a particular task or category of tasks. Instead of working from a to-do list and hoping you get to everything, you assign each task a specific time slot on your calendar. It's the method used by Cal Newport, Elon Musk, Bill Gates, and many other high performers — not because they're busier than you, but because they understand that time is a non-renewable resource that requires explicit allocation.

The power of time blocking comes from three psychological mechanisms. First, it eliminates decision fatigue about what to work on next — every moment has a pre-assigned purpose. Second, it creates artificial deadlines (Parkinson's Law states that work expands to fill the time available; a 90-minute block constrains expansion). Third, it makes time tangible — when you see your day as a series of blocks, you can't delude yourself about how much you can actually accomplish, which forces prioritization.

A practical time-blocking system works as follows: each evening (or morning), review your tasks and assign them to specific blocks on tomorrow's calendar. Include blocks for deep work, meetings, email processing, breaks, and even personal time. Start with 30-60 minute blocks and adjust. When interruptions occur — and they will — re-block the remainder of your day rather than abandoning the system. The value isn't in rigidly following the original plan; it's in always having a plan.

Common mistakes include blocking too tightly (leave buffer between blocks for transitions and overruns), not blocking personal time (leading to burnout), and abandoning the system after the first disrupted day. Think of time blocking not as a rigid schedule but as a budget: you can reallocate funds (time) as priorities change, but you should always know where every dollar (minute) is going. The alternative — an unblocked day that "gets away from you" — is the productivity equivalent of spending without tracking.`
    },
    {
      id: 'prod_03', topic: 'productivity', readTime: '2 min',
      title: 'The Two-Minute Rule',
      author: 'LifeOS Knowledge',
      content: `David Allen's Getting Things Done (GTD) methodology contains dozens of insights, but one stands above the rest for immediate practical impact: the two-minute rule. If a task takes less than two minutes to complete, do it immediately. Don't add it to a list, don't set a reminder, don't think about it — just do it. The logic is simple: the administrative overhead of capturing, organizing, and reviewing a two-minute task exceeds the time it would take to simply complete it.

The two-minute rule works because it addresses the hidden cost of deferred tasks: cognitive load. Every incomplete task occupies mental bandwidth. Psychologist Bluma Zeigarnik discovered that uncompleted tasks create a state of cognitive tension that persists until the task is done — your brain keeps "pinging" you about it. Ten deferred two-minute tasks create ten sources of background anxiety. Clearing them immediately frees cognitive resources for complex work that actually requires your full attention.

The rule also creates momentum. Completing a quick task triggers a small dopamine hit — the same reward mechanism that makes checking notifications addictive, but channeled productively. Knocking out three or four two-minute tasks in succession creates a sense of progress and competence that makes tackling bigger tasks feel less daunting. It's the productive equivalent of Newton's first law: an object in motion stays in motion.

The important nuance is that the two-minute threshold is a guideline, not a law. If you're in the middle of deep focus work, batching small tasks for later makes sense — interrupting a flow state for a two-minute task costs far more than two minutes. The rule applies best during transition periods: processing email, reviewing your inbox, or handling administrative tasks. During those windows, ruthlessly eliminate anything that takes two minutes or less, and watch your task list shrink dramatically.`
    },
    {
      id: 'prod_04', topic: 'productivity', readTime: '3 min',
      title: 'Energy Management vs Time Management',
      author: 'LifeOS Knowledge',
      content: `Traditional productivity advice focuses on time management: organize your hours, eliminate waste, squeeze more tasks into each day. But time is a finite, fixed resource — you can't create more of it. Energy, however, is renewable, expandable, and variable throughout the day. The most productive people don't manage time better than everyone else; they manage energy better, matching their highest-energy periods to their most demanding work.

Human energy follows ultradian rhythms — roughly 90-120 minute cycles of higher and lower alertness throughout the day. Most people experience peak cognitive energy in the late morning (9-11 AM for typical chronotypes), a significant dip after lunch (the "post-prandial dip" is biological, not just food-related), and a secondary peak in the late afternoon. Fighting these rhythms — scheduling creative work during your 2 PM slump — is like swimming upstream. Aligning with them — scheduling deep work during peaks and administrative tasks during troughs — multiplies output without adding hours.

Energy has four dimensions, as described by Jim Loehr and Tony Schwartz in "The Power of Full Engagement": physical (sleep, nutrition, exercise), emotional (positive relationships, self-regulation), mental (focus, creativity, time management), and spiritual (purpose, values, meaning). Deficiency in any dimension affects the others. An executive who sleeps five hours, skips meals, and has no meaningful relationships outside work may be "managing time well" but is operating at a fraction of their cognitive capacity.

The practical application is to audit your energy patterns for one week. Track your alertness, focus, and mood at two-hour intervals. You'll discover your unique chronotype — when you're sharpest, when you crash, and what activities restore you. Then restructure your day accordingly: protect peak energy blocks for your most important cognitive work, schedule meetings and email during moderate-energy periods, use low-energy periods for rest or mindless tasks. A focused hour at peak energy produces more value than three scattered hours at low energy.`
    },
    {
      id: 'prod_05', topic: 'productivity', readTime: '3 min',
      title: 'The Eisenhower Matrix: Urgent vs Important',
      author: 'LifeOS Knowledge',
      content: `Dwight Eisenhower, before becoming president, served as Supreme Allied Commander in World War II — a role requiring constant triage of competing priorities under life-and-death pressure. His decision-making framework, later formalized as the Eisenhower Matrix, divides all tasks into four quadrants based on two dimensions: urgency (requires immediate attention) and importance (contributes to long-term goals and values).

Quadrant 1 (Urgent + Important) includes genuine crises: a server outage, a medical emergency, a critical deadline. These demand immediate action, but if you live in Q1 constantly, you're a firefighter, not a strategist. Quadrant 2 (Not Urgent + Important) is where the magic happens: strategic planning, relationship building, exercise, learning, prevention. These activities never scream for your attention today but determine the quality of your life over years. The most successful people spend the majority of their discretionary time in Q2.

Quadrant 3 (Urgent + Not Important) is the trap. These are interruptions that feel urgent but don't advance your goals: most emails, many meetings, other people's priorities disguised as yours. The key insight is that urgency is frequently other people's urgency, not yours. Learning to delegate, decline, or defer Q3 items is perhaps the most impactful productivity skill you can develop. Quadrant 4 (Not Urgent + Not Important) is pure time waste: mindless scrolling, excessive TV, busy work. Minimizing Q4 is straightforward once you recognize it.

The matrix's greatest value is diagnostic. At the end of each day, classify how you spent your time across the four quadrants. Most people are shocked to discover they spend 60-80% of their time in Q1 and Q3 — reactive and urgent — with almost no time in Q2. The fix is to schedule Q2 activities proactively (exercise, planning, learning, relationship maintenance) before the day fills with urgencies. If you don't deliberately allocate time to what's important, everything urgent will consume all available space.`
    },
    {
      id: 'prod_06', topic: 'productivity', readTime: '3 min',
      title: 'Digital Minimalism: Reclaiming Your Attention',
      author: 'LifeOS Knowledge',
      content: `The average person checks their phone 150+ times per day, spends 2-4 hours on social media, and switches tasks every 3 minutes. This isn't a failure of willpower — it's the result of thousands of engineers at the world's most valuable companies optimizing for one metric: your attention. Notifications, infinite scroll, autoplay, streak counters, and variable-ratio reinforcement (the same mechanism that makes slot machines addictive) are all deliberately designed to maximize engagement at the expense of your autonomy.

Cal Newport's Digital Minimalism philosophy proposes a systematic response: start from zero and add technology back only when it clearly serves something you deeply value. This isn't Luddism — it's intentionality. A digital minimalist might use Instagram deliberately to maintain connections with distant family members (posting once a week, checking messages, then closing the app) rather than mindlessly scrolling a feed algorithm-optimized to keep them watching. The distinction between using a tool and being used by it is the central question.

The 30-day "digital declutter" is the recommended starting point. Remove all optional technology from your life for 30 days — social media, news apps, streaming services, games. During this period, rediscover analog activities that provide genuine satisfaction: reading physical books, face-to-face conversations, walks without headphones, hobbies that produce rather than consume. After 30 days, add back only the technologies that pass a strict test: does this technology directly support something I deeply value, and is this the best way to use it?

The economics of attention make this increasingly urgent. Your attention is finite and non-recoverable — every hour spent consuming algorithmically curated content is an hour not spent on relationships, creative work, physical health, or simply thinking. Studies consistently find that reducing social media use improves well-being, reduces anxiety and depression symptoms, and increases life satisfaction. The irony is that the technologies marketed as connecting us often leave users feeling more isolated, envious, and distracted than before. Reclaiming sovereignty over your attention may be the single highest-leverage personal change available in the modern world.`
    },

    /* ── PHILOSOPHY (6 articles) ── */
    {
      id: 'phil_01', topic: 'philosophy', readTime: '3 min',
      title: 'Stoicism: A Practical Guide for Modern Life',
      author: 'LifeOS Knowledge',
      content: `Stoicism, founded in Athens around 300 BCE by Zeno of Citium, is not about suppressing emotions or being cold — that's a common misconception. It's a practical philosophy for living a good life, focused on a single powerful distinction: what is within your control and what is not. Your judgments, intentions, desires, and actions are within your control. Everything else — other people's opinions, market movements, weather, health outcomes, what has already happened — is not. Suffering, the Stoics argued, comes not from events themselves but from our judgments about events.

The three most influential Stoic thinkers — Marcus Aurelius (Roman emperor), Epictetus (former slave), and Seneca (senator and adviser) — demonstrated that the philosophy works across every circumstance. Marcus Aurelius governed a plague-ravaged empire while writing "Meditations," one of history's most personal philosophical journals, never intended for publication. Epictetus, born into slavery, taught that "it's not what happens to you but how you react to it that matters." Seneca, one of the wealthiest men in Rome, wrote extensively on the shortness of life and the importance of using time wisely.

Practical Stoic exercises include negative visualization (premeditatio malorum) — briefly imagining losing the things you value to cultivate gratitude and reduce attachment. The view from above — imagining your problems from a cosmic perspective — reduces their emotional intensity. The dichotomy of control — before reacting to any situation, asking "is this within my control?" — prevents wasted energy on things you cannot change. And the evening review — reflecting on what you did well and what you could improve — builds self-awareness without self-flagellation.

Stoicism has experienced a remarkable revival in the 21st century precisely because its core message addresses modern anxieties. In a world of information overload, constant comparison through social media, and perceived helplessness in the face of global problems, the Stoic emphasis on controlling your own responses, focusing on what you can influence, and finding meaning through virtue rather than external validation offers a genuinely liberating framework. It's not a retreat from engagement — it's a foundation for acting effectively in a chaotic world.`
    },
    {
      id: 'phil_02', topic: 'philosophy', readTime: '3 min',
      title: 'Ikigai: Finding Your Reason for Being',
      author: 'LifeOS Knowledge',
      content: `Ikigai (生き甲斐) is a Japanese concept meaning "a reason for being" — the intersection of what gives your life purpose, fulfillment, and joy. While Western popular culture has simplified it into a Venn diagram of four circles (what you love, what you're good at, what the world needs, and what you can be paid for), the traditional Japanese understanding is both simpler and more profound: ikigai is the feeling of being alive and motivated that comes from doing things that matter to you, regardless of scale or income.

In Okinawa, Japan — one of the world's Blue Zones where people routinely live past 100 — ikigai is not a grand life purpose but a daily practice. A 102-year-old's ikigai might be tending her garden each morning. A fisherman's might be the act of fishing itself, not the catch. The lesson is that ikigai doesn't require discovering a singular passion or achieving external success. It emerges from consistent engagement with activities, relationships, and communities that bring you satisfaction and give your days structure and meaning.

The Western productivity culture's emphasis on "finding your passion" creates a paralysis that ikigai sidesteps. Research by Stanford psychologist Carol Dweck and others suggests that passions aren't "found" — they're developed through sustained engagement and growing competence. You don't need to know your ikigai before acting; you discover it by paying attention to what energizes you, what you'd do even without external rewards, and where your skills naturally converge with genuine needs. It's iterative, not revelatory.

Practically, exploring your ikigai involves three practices. First, notice what makes you lose track of time — these flow states indicate alignment between challenge and skill. Second, identify activities where you feel a sense of contribution — where your effort matters to someone else. Third, experiment broadly, especially in your twenties and thirties; premature commitment to a narrow path prevents the exploration that reveals unexpected intersections. Ikigai isn't a destination you arrive at. It's a compass heading that becomes clearer the more actively you engage with life.`
    },
    {
      id: 'phil_03', topic: 'philosophy', readTime: '3 min',
      title: 'Existentialism: Freedom and Responsibility',
      author: 'LifeOS Knowledge',
      content: `Jean-Paul Sartre's famous declaration "existence precedes essence" is the foundational claim of existentialism: you are not born with a fixed nature, purpose, or identity. Unlike a hammer (designed for a purpose before it exists), a human being exists first and defines themselves through choices and actions. There is no predetermined script for your life, no cosmic role you're meant to fill. You are, as Sartre put it, "condemned to be free" — radically free to choose, and fully responsible for the consequences.

This freedom, far from being liberating in a comfortable sense, produces what existentialists call "anxiety" (Angst). When you truly confront the fact that you could quit your job, move to another country, end a relationship, or completely reinvent yourself at any moment — and that no external authority can tell you which choice is "right" — the weight of responsibility becomes vertiginous. Most people flee from this anxiety into what Sartre called "bad faith": pretending they have no choice ("I have to stay in this job"), adopting roles defined by others ("I'm just following orders"), or hiding behind social norms to avoid the burden of personal decision.

Simone de Beauvoir, Sartre's intellectual partner, extended existentialism to reveal how social structures — gender roles, class expectations, racial categorization — constrain freedom by convincing people that their situation is natural and inevitable rather than constructed and changeable. Her masterwork "The Second Sex" demonstrated that "one is not born, but rather becomes, a woman" — that femininity is a social construction, not a biological destiny. This insight applies broadly: many of the constraints we experience as fixed are, upon examination, choices maintained by collective agreement.

The existentialist project isn't nihilism — it's the opposite. Because there is no pre-given meaning, you are both free and obligated to create meaning through authentic engagement with life. Albert Camus, in "The Myth of Sisyphus," argued that even in the face of an absurd universe, we must "imagine Sisyphus happy" — finding meaning not in the destination but in the struggle itself. The practical takeaway: stop waiting for purpose to be revealed and start creating it through committed action, honest self-examination, and acceptance of responsibility for the life you're building.`
    },
    {
      id: 'phil_04', topic: 'philosophy', readTime: '3 min',
      title: 'Effective Altruism: Doing Good Better',
      author: 'LifeOS Knowledge',
      content: `Effective altruism (EA) is both a philosophy and a social movement that applies evidence and rigorous reasoning to determine the most impactful ways to help others. The core insight is simple but challenging: not all charitable actions are equally effective. A dollar spent deworming children in sub-Saharan Africa prevents roughly 100 times more suffering than a dollar spent on most US-based charities, according to analyses by GiveWell, a nonprofit that evaluates charity cost-effectiveness.

The movement, associated with philosopher Peter Singer and organizations like 80,000 Hours, argues that we should treat our charitable resources — time, money, career choices — as investments and optimize them for maximum impact. This means asking uncomfortable questions: Is this charity actually improving outcomes, or just making donors feel good? Am I choosing causes based on emotional appeal (cute animals, local visibility) or on scale of suffering and tractability? Could I help more people by earning more in a high-paying career and donating strategically ("earning to give") than by working directly in a lower-impact nonprofit?

EA has identified several high-priority cause areas based on scale, neglectedness, and tractability. Global health and poverty (malaria nets, deworming, direct cash transfers) offer the most proven, cost-effective interventions available today. Existential risk reduction (AI safety, pandemic preparedness, nuclear security) addresses low-probability but civilization-threatening scenarios. Animal welfare (factory farming affects billions of sentient beings annually) is massively neglected relative to its scale.

The movement has faced legitimate criticism. The FTX cryptocurrency scandal, involving EA-aligned figures, raised questions about ends-justify-means reasoning. Critics argue that EA's utilitarian framework can be cold, reductive, or culturally presumptuous — imposing Western optimization frameworks on complex local contexts. The strongest versions of EA acknowledge these limitations: use evidence and reason as starting points, not final answers. Remain humble about uncertainty. And remember that doing significant good imperfectly is infinitely better than doing nothing while searching for the theoretically optimal action.`
    },
    {
      id: 'phil_05', topic: 'philosophy', readTime: '3 min',
      title: 'Mindfulness: The Philosophy Behind the Practice',
      author: 'LifeOS Knowledge',
      content: `Mindfulness has been commodified into apps, corporate workshops, and Instagram aesthetics, but its philosophical roots are profound. Originating in Buddhist psychology over 2,500 years ago, mindfulness (sati in Pali) is the practice of paying deliberate, non-judgmental attention to present-moment experience. It's not about relaxation (though that often results), clearing your mind (a common misconception), or achieving a special state. It's about seeing clearly — observing your thoughts, emotions, and sensations as they are, without adding stories, judgments, or resistance.

The philosophical insight underlying mindfulness is that most psychological suffering comes not from experience itself but from our relationship to experience. Pain is inevitable; suffering is the resistance to pain. Anxiety is not the presence of uncertain thoughts but the attempt to eliminate uncertainty. Depression often involves not sadness itself but the judgment that sadness means something is wrong with you. Mindfulness creates a gap between experience and reaction — between feeling angry and acting on anger — that transforms automatic reactivity into conscious response.

The neuroscience validates the philosophy. Regular mindfulness meditation (as little as 10 minutes daily) measurably reduces activity in the default mode network — the brain regions active during mind-wandering and self-referential rumination. It increases gray matter density in the prefrontal cortex (executive function), hippocampus (memory), and temporoparietal junction (empathy), while reducing amygdala volume and reactivity (fear and stress responses). An eight-week mindfulness-based stress reduction (MBSR) program produces structural brain changes visible on MRI.

The deepest philosophical contribution of mindfulness is the insight of impermanence (anicca). Every sensation, emotion, and thought arises and passes away. The anxiety you feel right now will not last. Neither will the joy. This isn't pessimistic — it's liberating. When you directly observe impermanence through practice, attachment loosens naturally. You enjoy pleasant experiences more fully because you're not anxiously trying to hold onto them, and you endure difficult experiences more gracefully because you know, from direct observation, that they will change.`
    },
    {
      id: 'phil_06', topic: 'philosophy', readTime: '3 min',
      title: 'Pragmatism: Truth Is What Works',
      author: 'LifeOS Knowledge',
      content: `Pragmatism, America's most original contribution to philosophy, was developed by Charles Sanders Peirce, William James, and John Dewey in the late 19th century. Its central claim is radical: the meaning of an idea lies entirely in its practical consequences. If two theories produce identical observable effects, their "difference" is meaningless. Truth isn't correspondence to some abstract reality — it's what works reliably in practice. As William James put it, "The true is the name of whatever proves itself to be good in the way of belief."

This sounds relativistic but isn't. Pragmatism doesn't say "believe whatever you want." It says beliefs must be tested against experience. A belief that leads to successful predictions, effective actions, and productive inquiries is "true" in the only sense that matters. A belief that leads to failed predictions, harmful actions, or dead-end inquiries is false, regardless of how logically elegant it appears. The scientific method is, in pragmatist terms, institutionalized pragmatism — systematic testing of beliefs against observable reality.

John Dewey applied pragmatism to education, democracy, and daily life. He argued against the spectator theory of knowledge — the idea that knowing is passively receiving truth — and for an active, experimental approach. Learning isn't absorbing facts; it's solving problems. Democracy isn't just voting; it's collective problem-solving through open communication and shared inquiry. Personal growth isn't contemplating ideals; it's testing hypotheses about how to live well and refining them based on results.

The practical value of pragmatist thinking is enormous. When facing a dilemma — career change, relationship decision, philosophical question — ask: "What concrete difference would it make in my life if one option were true versus the other?" If the answer is "none," the question might not be worth agonizing over. If the answer is specific and testable, you have a path forward: try it, observe the results, and adjust. Pragmatism replaces paralysis-by-analysis with experimental engagement, and it treats mistakes not as failures but as data. In a world drowning in abstract debates and ideological certainty, the pragmatist question — "Does this actually work?" — remains the most powerful and underutilized intellectual tool available.`
    },
  ];

  /* ══════════════════════════════════════════════════════════════════════════
     SEED DATA — 14 days of wellness history
     ══════════════════════════════════════════════════════════════════════════ */

  const _seedData = () => {
    const existing = _load(KEYS.wellness);
    if (existing && Object.keys(existing.water || {}).length > 0) return; // Already seeded

    const data = _defaults();
    const moods = ['great', 'good', 'okay', 'good', 'great', 'okay', 'bad', 'good', 'great', 'good', 'okay', 'good', 'great', 'good'];
    const moodNotes = [
      'Had a fantastic morning workout', 'Productive day at work', 'Feeling a bit tired today',
      'Great lunch with friends', 'Nailed my presentation!', 'Rainy day, low energy',
      'Stressed about deadlines', 'Good progress on my project', 'Morning meditation was amazing',
      'Solid sleep last night', 'Feeling average', 'Coffee date was nice',
      'Best workout in weeks', 'Relaxing Sunday morning',
    ];

    for (let i = 13; i >= 0; i--) {
      const date = _dateOffset(-i);

      // Water
      data.water[date] = {
        glasses: Math.floor(Math.random() * 5) + 4, // 4-8 glasses
        goal: 8,
      };

      // Sleep
      const bedHour = 22 + Math.random() * 2; // 10 PM - midnight
      const sleepHours = 5.5 + Math.random() * 3; // 5.5-8.5 hours
      data.sleep.push({
        date,
        bedtime: `${Math.floor(bedHour) % 24}:${String(Math.floor((bedHour % 1) * 60)).padStart(2,'0')}`,
        wakeup: `${Math.floor((bedHour + sleepHours) % 24)}:${String(Math.floor(((bedHour + sleepHours) % 1) * 60)).padStart(2,'0')}`,
        hours: Math.round(sleepHours * 10) / 10,
        quality: Math.floor(Math.random() * 3) + 3, // 3-5
      });

      // Mood
      data.mood.push({
        date,
        mood: moods[i],
        note: moodNotes[i],
        time: `${9 + Math.floor(Math.random() * 8)}:${String(Math.floor(Math.random() * 60)).padStart(2,'0')}`,
      });

      // Meditation (some days)
      if (Math.random() > 0.35) {
        const mins = [5, 10, 15, 20][Math.floor(Math.random() * 4)];
        data.meditation.push({ date, minutes: mins, completedAt: new Date(date + 'T08:00:00').toISOString() });
      }

      // Read history (some days)
      if (Math.random() > 0.3) {
        const randomArticle = LIBRARY[Math.floor(Math.random() * LIBRARY.length)];
        data.readHistory.push({ articleId: randomArticle.id, readAt: new Date(date + 'T20:00:00').toISOString() });
      }
    }

    _saveData(data);

    // Seed journal entries
    const existingJournal = _load(KEYS.journal);
    if (existingJournal && existingJournal.length > 0) return;

    const journalEntries = [
      { id: 'j_1', date: _dateOffset(-13), mood: 'great', content: 'Started the day with a 5K run. The weather was perfect — cool and sunny. Had a really productive brainstorming session at work afterwards. Feeling like I\'m in a great flow state lately.', gratitude: ['Morning sunshine', 'My running shoes', 'Supportive coworkers'] },
      { id: 'j_2', date: _dateOffset(-11), mood: 'good', content: 'Read an interesting article about compound interest and it really motivated me to increase my investment contributions. Set up an automatic transfer for an extra $100/month. Small steps!', gratitude: ['Financial literacy', 'Technology that automates savings', 'My morning coffee ritual'] },
      { id: 'j_3', date: _dateOffset(-9), mood: 'okay', content: 'Tough day. A project deadline moved up and I had to scramble. But I managed to get the core deliverables done by staying focused and not checking my phone for 3 hours straight. Deep work really does work.', gratitude: ['Resilience', 'Focus music playlists', 'A comfortable home office'] },
      { id: 'j_4', date: _dateOffset(-7), mood: 'great', content: 'Weekend hike with friends! We did the ridge trail — 8 miles total with stunning views. Packed lunch at the summit and just talked about life. These moments are what it\'s all about.', gratitude: ['Nature', 'Close friendships', 'Physical health'] },
      { id: 'j_5', date: _dateOffset(-5), mood: 'good', content: 'Meditation streak is now 10 days. I can feel the difference — I\'m less reactive in meetings and more patient in conversations. Started with 5 minutes and now doing 15. Consistency over intensity.', gratitude: ['Mental clarity', 'My meditation app', 'Patience'] },
      { id: 'j_6', date: _dateOffset(-3), mood: 'good', content: 'Had a great conversation with my mentor about career growth. She suggested I start writing about what I\'m learning, even if nobody reads it. The act of articulating ideas clarifies thinking. Starting a blog this week.', gratitude: ['My mentor', 'Good advice', 'Growth opportunities'] },
      { id: 'j_7', date: _dateOffset(-1), mood: 'great', content: 'Finished reading "Atomic Habits" and immediately implemented two-minute versions of the habits I want to build. Also reorganized my desk and workspace — the environment design chapter really resonated. Feeling optimistic about the coming week.', gratitude: ['Books that change perspective', 'A fresh start', 'Clean workspace'] },
    ];
    _saveJournal(journalEntries);
  };

  /* ══════════════════════════════════════════════════════════════════════════
     INJECT CSS
     ══════════════════════════════════════════════════════════════════════════ */

  const _injectCSS = () => {
    if (document.getElementById('wellness-styles')) return;
    const style = document.createElement('style');
    style.id = 'wellness-styles';
    style.textContent = `
      .well-container { max-width: 960px; margin: 0 auto; }

      /* ── Daily Read Card ── */
      .well-daily-read {
        background: linear-gradient(135deg, #1e1e2e 0%, #2d2b55 100%);
        border-radius: 20px; padding: 32px; margin-bottom: 24px;
        border: 1px solid rgba(255,255,255,.08);
        position: relative; overflow: hidden;
      }
      .well-daily-read::before {
        content: ''; position: absolute; top: -50%; right: -20%;
        width: 300px; height: 300px; border-radius: 50%;
        background: radial-gradient(circle, rgba(108,92,231,.15), transparent 70%);
      }
      .well-read-badge {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 4px 12px; border-radius: 20px; font-size: 12px;
        font-weight: 600; margin-bottom: 14px; position: relative;
      }
      .well-read-time {
        color: rgba(255,255,255,.45); font-size: 13px; margin-bottom: 10px;
        position: relative;
      }
      .well-read-title {
        font-size: 24px; font-weight: 800; color: #fff; line-height: 1.3;
        margin-bottom: 18px; position: relative;
      }
      .well-read-content {
        color: rgba(255,255,255,.72); font-size: 15px; line-height: 1.8;
        position: relative; max-height: 300px; overflow: hidden;
        transition: max-height .4s ease;
      }
      .well-read-content.expanded { max-height: 3000px; }
      .well-read-toggle {
        background: linear-gradient(transparent, #2d2b55 60%);
        position: absolute; bottom: 0; left: 0; right: 0;
        padding: 40px 0 0; text-align: center;
      }
      .well-read-toggle-btn {
        background: rgba(108,92,231,.3); border: 1px solid rgba(108,92,231,.4);
        color: #a29bfe; padding: 8px 24px; border-radius: 20px;
        font-size: 13px; font-weight: 600; cursor: pointer;
        transition: all .2s;
      }
      .well-read-toggle-btn:hover { background: rgba(108,92,231,.5); }
      .well-read-nav {
        display: flex; gap: 8px; margin-top: 16px; position: relative;
      }
      .well-read-nav-btn {
        padding: 6px 14px; border-radius: 8px; font-size: 12px;
        background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
        color: rgba(255,255,255,.6); cursor: pointer; transition: all .15s;
      }
      .well-read-nav-btn:hover { background: rgba(255,255,255,.12); color: #fff; }
      .well-read-mark-btn {
        margin-left: auto; background: #6c5ce7; border: none;
        color: #fff; padding: 6px 16px; border-radius: 8px;
        font-size: 12px; font-weight: 600; cursor: pointer;
      }
      .well-read-mark-btn:hover { background: #5a4bd1; }
      .well-read-mark-btn.done { background: #00b894; }

      /* ── Wellness Dashboard Grid ── */
      .well-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; margin-bottom: 24px; }
      .well-card {
        background: var(--bg-card, #1e1e2e); border-radius: 16px; padding: 22px;
        border: 1px solid var(--border, rgba(255,255,255,.06));
      }
      .well-card-title {
        font-size: 16px; font-weight: 700; color: var(--text-primary, #fff);
        margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
      }

      /* ── Water Tracker ── */
      .well-water-glasses { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
      .well-water-glass {
        width: 36px; height: 42px; border-radius: 6px 6px 10px 10px;
        border: 2px solid rgba(116,185,255,.3); cursor: pointer;
        display: flex; align-items: flex-end; justify-content: center;
        transition: all .2s; position: relative; overflow: hidden;
      }
      .well-water-glass::after {
        content: ''; position: absolute; bottom: 0; left: 0; right: 0;
        height: 0%; background: linear-gradient(to top, #0984e3, #74b9ff);
        border-radius: 0 0 8px 8px; transition: height .3s ease;
      }
      .well-water-glass.filled::after { height: 100%; }
      .well-water-glass:hover { border-color: #74b9ff; transform: scale(1.05); }
      .well-water-count {
        text-align: center; color: var(--text-secondary, #888);
        font-size: 13px; margin-top: 6px;
      }

      /* ── Sleep Tracker ── */
      .well-sleep-bar {
        height: 8px; border-radius: 4px; background: rgba(255,255,255,.06);
        margin-bottom: 8px; overflow: hidden;
      }
      .well-sleep-fill {
        height: 100%; border-radius: 4px;
        background: linear-gradient(90deg, #6c5ce7, #a29bfe);
        transition: width .4s ease;
      }
      .well-sleep-stats { display: flex; justify-content: space-between; }
      .well-sleep-stat { text-align: center; }
      .well-sleep-stat-val { font-size: 22px; font-weight: 700; color: var(--text-primary, #fff); }
      .well-sleep-stat-label { font-size: 11px; color: var(--text-secondary, #888); }

      /* ── Mood Tracker ── */
      .well-mood-selector { display: flex; gap: 8px; flex-wrap: wrap; }
      .well-mood-btn {
        width: 48px; height: 48px; border-radius: 14px;
        background: rgba(255,255,255,.04); border: 2px solid transparent;
        cursor: pointer; font-size: 24px; transition: all .2s;
        display: flex; align-items: center; justify-content: center;
      }
      .well-mood-btn:hover { background: rgba(255,255,255,.08); transform: scale(1.1); }
      .well-mood-btn.active { border-color: #fd79a8; background: rgba(253,121,168,.1); transform: scale(1.15); }
      .well-mood-label { font-size: 11px; color: var(--text-secondary, #888); text-align: center; margin-top: 4px; }
      .well-mood-note {
        width: 100%; margin-top: 10px; padding: 8px 12px; border-radius: 10px;
        background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
        color: var(--text-primary, #fff); font-size: 13px; font-family: inherit;
        resize: none; box-sizing: border-box;
      }
      .well-mood-save {
        margin-top: 8px; padding: 6px 16px; border-radius: 8px; border: none;
        background: #fd79a8; color: #fff; font-size: 12px; font-weight: 600;
        cursor: pointer;
      }

      /* ── Meditation ── */
      .well-med-durations { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
      .well-med-dur {
        padding: 6px 14px; border-radius: 20px; font-size: 13px;
        background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
        color: var(--text-secondary, #888); cursor: pointer; transition: all .15s;
      }
      .well-med-dur.active { background: rgba(162,155,254,.2); border-color: #a29bfe; color: #a29bfe; }
      .well-med-start {
        width: 100%; padding: 12px; border-radius: 12px; border: none;
        background: linear-gradient(135deg, #6c5ce7, #a29bfe);
        color: #fff; font-size: 15px; font-weight: 700; cursor: pointer;
        transition: all .2s;
      }
      .well-med-start:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(108,92,231,.4); }
      .well-med-active {
        text-align: center; padding: 20px;
      }
      .well-med-timer {
        font-size: 48px; font-weight: 200; color: #a29bfe;
        font-variant-numeric: tabular-nums; margin-bottom: 12px;
      }
      .well-med-stop {
        padding: 10px 28px; border-radius: 10px; border: none;
        background: #ff4757; color: #fff; font-size: 14px; font-weight: 600;
        cursor: pointer;
      }
      .well-med-stats { display: flex; justify-content: space-around; margin-top: 14px; }
      .well-med-stat-val { font-size: 20px; font-weight: 700; color: var(--text-primary, #fff); text-align: center; }
      .well-med-stat-label { font-size: 11px; color: var(--text-secondary, #888); text-align: center; }

      /* ── Journal ── */
      .well-journal-section { margin-bottom: 24px; }
      .well-journal-form {
        background: var(--bg-card, #1e1e2e); border-radius: 16px; padding: 22px;
        border: 1px solid var(--border, rgba(255,255,255,.06)); margin-bottom: 16px;
      }
      .well-journal-textarea {
        width: 100%; min-height: 100px; padding: 12px; border-radius: 12px;
        background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
        color: var(--text-primary, #fff); font-size: 14px; font-family: inherit;
        resize: vertical; margin-bottom: 12px; line-height: 1.6; box-sizing: border-box;
      }
      .well-journal-gratitude {
        display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;
      }
      .well-journal-grat-input {
        flex: 1; min-width: 140px; padding: 8px 12px; border-radius: 8px;
        background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
        color: var(--text-primary, #fff); font-size: 13px; font-family: inherit;
        box-sizing: border-box;
      }
      .well-journal-save {
        padding: 10px 24px; border-radius: 10px; border: none;
        background: #00b894; color: #fff; font-size: 14px; font-weight: 600;
        cursor: pointer;
      }
      .well-journal-entries { display: flex; flex-direction: column; gap: 12px; }
      .well-journal-entry {
        background: var(--bg-card, #1e1e2e); border-radius: 14px; padding: 18px;
        border: 1px solid rgba(255,255,255,.06);
      }
      .well-journal-entry-date {
        font-size: 12px; color: var(--text-secondary, #888); margin-bottom: 6px;
        display: flex; align-items: center; gap: 8px;
      }
      .well-journal-entry-content {
        font-size: 14px; color: var(--text-primary, #e0e0e0); line-height: 1.6;
        margin-bottom: 8px;
      }
      .well-journal-entry-gratitude {
        display: flex; flex-wrap: wrap; gap: 6px;
      }
      .well-journal-grat-tag {
        padding: 3px 10px; border-radius: 12px; font-size: 11px;
        background: rgba(0,184,148,.1); color: #00b894;
      }

      /* ── Topic Preferences ── */
      .well-topics { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 24px; }
      .well-topic-pill {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 8px 16px; border-radius: 20px; cursor: pointer;
        font-size: 13px; font-weight: 600; transition: all .2s;
        border: 2px solid transparent; user-select: none;
      }
      .well-topic-pill.inactive {
        background: rgba(255,255,255,.04); color: var(--text-secondary, #888);
        border-color: rgba(255,255,255,.08);
      }
      .well-topic-pill.active { color: #fff; }

      /* ── Reading History ── */
      .well-history { display: flex; flex-direction: column; gap: 10px; }
      .well-history-item {
        display: flex; align-items: center; gap: 12px;
        padding: 12px 16px; border-radius: 12px;
        background: rgba(255,255,255,.03); cursor: pointer;
        transition: all .15s;
      }
      .well-history-item:hover { background: rgba(255,255,255,.06); }
      .well-history-icon { font-size: 24px; }
      .well-history-title { font-size: 14px; color: var(--text-primary, #e0e0e0); font-weight: 500; }
      .well-history-meta { font-size: 11px; color: var(--text-secondary, #888); }
      .well-history-check { margin-left: auto; color: #00b894; font-size: 18px; }

      /* ── Section Titles ── */
      .well-section-title {
        font-size: 20px; font-weight: 800; color: var(--text-primary, #fff);
        margin: 28px 0 14px; display: flex; align-items: center; gap: 10px;
      }

      /* ── All Reads Browser ── */
      .well-reads-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px,1fr)); gap: 14px; }
      .well-reads-card {
        background: var(--bg-card, #1e1e2e); border-radius: 14px; padding: 18px;
        border: 1px solid rgba(255,255,255,.06); cursor: pointer; transition: all .2s;
      }
      .well-reads-card:hover { border-color: rgba(108,92,231,.4); transform: translateY(-2px); }
      .well-reads-card-topic { font-size: 11px; font-weight: 600; margin-bottom: 6px; }
      .well-reads-card-title { font-size: 15px; font-weight: 700; color: var(--text-primary, #fff); margin-bottom: 6px; }
      .well-reads-card-time { font-size: 12px; color: var(--text-secondary, #888); }

      /* Breathing Visualizer */
      .well-med-visualizer-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 180px;
        position: relative;
        margin: 20px 0;
      }
      .well-med-breath-circle {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(108,92,231,0.6) 0%, rgba(162,155,254,0.2) 70%);
        box-shadow: 0 0 30px rgba(108,92,231,0.5);
        transition: transform 4s cubic-bezier(0.4, 0, 0.2, 1), background 4s, box-shadow 4s;
        position: absolute;
      }
      .well-med-breath-circle.inhale {
        transform: scale(1.6);
        background: radial-gradient(circle, rgba(0, 206, 201, 0.6) 0%, rgba(129, 236, 236, 0.2) 70%);
        box-shadow: 0 0 50px rgba(0, 206, 201, 0.7);
      }
      .well-med-breath-circle.hold {
        transform: scale(1.6);
        background: radial-gradient(circle, rgba(162,155,254,0.6) 0%, rgba(162,155,254,0.2) 70%);
        box-shadow: 0 0 60px rgba(162, 155, 254, 0.8);
      }
      .well-med-breath-circle.exhale {
        transform: scale(0.95);
        background: radial-gradient(circle, rgba(108,92,231,0.5) 0%, rgba(162,155,254,0.1) 70%);
        box-shadow: 0 0 20px rgba(108,92,231,0.3);
      }
      .well-med-breath-circle.hold-empty {
        transform: scale(0.95);
        background: radial-gradient(circle, rgba(108,92,231,0.4) 0%, rgba(162,155,254,0.1) 70%);
        box-shadow: 0 0 15px rgba(108,92,231,0.2);
      }
      .well-med-breath-text {
        font-size: 18px;
        font-weight: 700;
        color: #fff;
        z-index: 10;
        text-shadow: 0 2px 4px rgba(0,0,0,0.5);
      }

      /* Water Cup Visualizer */
      .well-water-visualizer {
        display: flex;
        justify-content: center;
        margin: 10px 0;
      }
      .well-water-cup {
        width: 80px;
        height: 110px;
        border: 4px solid rgba(255, 255, 255, 0.2);
        border-top: none;
        border-radius: 0 0 16px 16px;
        position: relative;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.03);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
      }
      .well-water-wave {
        width: 100%;
        position: absolute;
        bottom: 0;
        background: #0984e3;
        transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .wave-svg {
        position: absolute;
        top: -15px;
        left: 0;
        width: 200%;
        height: 20px;
        animation: wave-motion 3s linear infinite;
        fill: #0984e3;
      }
      @keyframes wave-motion {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      .well-water-btn {
        background: rgba(108,92,231,0.15);
        border: 1px solid rgba(108,92,231,0.4);
        color: #a29bfe;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        box-sizing: border-box;
      }
      .well-water-btn:hover {
        background: rgba(108,92,231,0.3);
        transform: translateY(-1px);
      }

      /* Prompt chips */
      .well-journal-prompts {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 12px;
      }
      .well-prompt-chip {
        padding: 4px 10px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px;
        font-size: 11px;
        color: rgba(255,255,255,0.6);
        cursor: pointer;
        transition: all 0.15s;
        user-select: none;
      }
      .well-prompt-chip:hover {
        background: rgba(108,92,231,0.2);
        border-color: #a29bfe;
        color: #fff;
      }
    `;
    document.head.appendChild(style);
  };

  /* ══════════════════════════════════════════════════════════════════════════
     MEDITATION TIMER STATE
     ══════════════════════════════════════════════════════════════════════════ */
  let _medInterval = null;
  let _medStartTime = null;
  let _medDuration = 0;

  let _medAudioCtx = null;
  let _medOsc1 = null;
  let _medOsc2 = null;
  let _medGainNode = null;

  const _startMeditationAudio = () => {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;
      _medAudioCtx = new AudioCtxClass();

      _medOsc1 = _medAudioCtx.createOscillator();
      _medOsc1.type = 'sine';
      _medOsc1.frequency.setValueAtTime(110, _medAudioCtx.currentTime);

      _medOsc2 = _medAudioCtx.createOscillator();
      _medOsc2.type = 'sine';
      _medOsc2.frequency.setValueAtTime(110.5, _medAudioCtx.currentTime);

      _medGainNode = _medAudioCtx.createGain();
      _medGainNode.gain.setValueAtTime(0.12, _medAudioCtx.currentTime);

      const filter = _medAudioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, _medAudioCtx.currentTime);

      _medOsc1.connect(filter);
      _medOsc2.connect(filter);
      filter.connect(_medGainNode);
      _medGainNode.connect(_medAudioCtx.destination);

      _medOsc1.start();
      _medOsc2.start();
    } catch (e) {
      console.warn('Web Audio initialization failed:', e);
    }
  };

  const _stopMeditationAudio = () => {
    try {
      if (_medOsc1) { _medOsc1.stop(); _medOsc1.disconnect(); _medOsc1 = null; }
      if (_medOsc2) { _medOsc2.stop(); _medOsc2.disconnect(); _medOsc2 = null; }
      if (_medGainNode) { _medGainNode.disconnect(); _medGainNode = null; }
      if (_medAudioCtx) {
        if (_medAudioCtx.state !== 'closed') {
          _medAudioCtx.close();
        }
        _medAudioCtx = null;
      }
    } catch (e) {
      console.warn('Web Audio cleanup failed:', e);
    }
  };

  const _modulateMeditationAudio = (phase) => {
    if (!_medGainNode || !_medAudioCtx) return;
    const now = _medAudioCtx.currentTime;
    if (phase === 'inhale') {
      _medGainNode.gain.exponentialRampToValueAtTime(0.22, now + 4);
    } else if (phase === 'exhale') {
      _medGainNode.gain.exponentialRampToValueAtTime(0.06, now + 4);
    } else {
      _medGainNode.gain.setValueAtTime(_medGainNode.gain.value, now);
    }
  };

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════════════ */

  const _render = (container) => {
    _injectCSS();
    _seedData();
    const data = _data();
    const journal = _journalEntries();
    const today = _today();

    // Get today's water
    const todayWater = data.water[today] || { glasses: 0, goal: data.waterGoal };

    // Get today's mood
    const todayMood = data.mood.find(m => m.date === today);

    // Get last sleep
    const lastSleep = data.sleep.length > 0 ? data.sleep[data.sleep.length - 1] : null;
    const avgSleep = data.sleep.length > 0
      ? { hours: +(data.sleep.reduce((s, e) => s + e.hours, 0) / data.sleep.length).toFixed(1), quality: +(data.sleep.reduce((s, e) => s + e.quality, 0) / data.sleep.length).toFixed(1) }
      : { hours: 0, quality: 0 };

    // Daily read
    const userTopics = data.userTopics || ['finance', 'tech'];
    const topicArticles = LIBRARY.filter(a => userTopics.includes(a.topic));
    const readIds = new Set((data.readHistory || []).map(r => r.articleId));
    const unread = topicArticles.filter(a => !readIds.has(a.id));
    // Use day-of-year to pick a stable daily read
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const dailyRead = unread.length > 0 ? unread[dayOfYear % unread.length] : topicArticles[dayOfYear % topicArticles.length];
    const dailyTopic = TOPICS.find(t => t.id === dailyRead?.topic);

    // Meditation stats
    const totalMedMinutes = data.meditation.reduce((s, m) => s + m.minutes, 0);
    const medSessions = data.meditation.length;

    // Mood emoji map
    const moodEmojis = { great: '😄', good: '🙂', okay: '😐', bad: '😔', terrible: '😢' };

    // Journal streak
    const journalDates = new Set(journal.map(j => j.date));
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      if (journalDates.has(_dateOffset(-i))) streak++;
      else break;
    }

    const formatParagraphs = (text) => text.split('\n\n').map(p => `<p style="margin-bottom:14px;">${esc(p)}</p>`).join('');

    const getMoodTrendSVG = () => {
      const moodHistory = data.mood.slice(-7); // Last 7 logs
      if (moodHistory.length < 2) {
        return `<p style="color:var(--text-secondary,#888);font-size:13px;text-align:center;padding:20px 10px;">Log your mood for a few days to see trends here! 🧠</p>`;
      }
      const moodVals = { terrible: 1, bad: 2, okay: 3, good: 4, great: 5 };
      const width = 280;
      const height = 100;
      const padding = 15;
      
      const points = moodHistory.map((item, idx) => {
        const x = padding + (idx * (width - 2 * padding)) / (moodHistory.length - 1);
        const val = moodVals[item.mood] || 3;
        const y = height - padding - ((val - 1) * (height - 2 * padding)) / 4;
        return { x, y, emoji: moodEmojis[item.mood], date: item.date };
      });

      const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
      
      return `
        <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:100px;">
          <!-- Grid lines -->
          ${[1, 2, 3, 4, 5].map(v => {
            const y = height - padding - ((v - 1) * (height - 2 * padding)) / 4;
            return `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="rgba(255,255,255,0.04)" stroke-dasharray="2,2"/>`;
          }).join('')}
          
          <!-- Line path -->
          <path d="${pathD}" fill="none" stroke="url(#mood-grad)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          
          <!-- Points -->
          ${points.map(p => `
            <circle cx="${p.x}" cy="${p.y}" r="4" fill="#fd79a8" />
            <text x="${p.x}" y="${p.y - 8}" font-size="10" text-anchor="middle">${p.emoji}</text>
          `).join('')}
          
          <!-- Gradient definition -->
          <defs>
            <linearGradient id="mood-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#fd79a8" />
              <stop offset="100%" stop-color="#a29bfe" />
            </linearGradient>
          </defs>
        </svg>
        <div style="display:flex;justify-content:space-between;padding:0 ${padding}px;font-size:9px;color:rgba(255,255,255,0.4);">
          <span>${new Date(points[0].date).toLocaleDateString('en-US', {month:'short', day:'numeric'})}</span>
          <span>Mood Trend (7d)</span>
          <span>${new Date(points[points.length-1].date).toLocaleDateString('en-US', {month:'short', day:'numeric'})}</span>
        </div>
      `;
    };

    container.innerHTML = `
      <div class="well-container">
        <h2 style="color:var(--text-primary,#fff);font-size:28px;font-weight:800;margin-bottom:4px;">
          🌱 Wellness & Growth
        </h2>
        <p style="color:var(--text-secondary,#888);font-size:14px;margin-bottom:24px;">
          Your daily companion for mind, body, and knowledge
        </p>

        <!-- ═══ DAILY READ ═══ -->
        ${dailyRead ? `
        <div class="well-daily-read" id="well-daily-read-card">
          <div class="well-read-badge" style="background:${dailyTopic?.color || '#6c5ce7'}22;color:${dailyTopic?.color || '#6c5ce7'}">
            ${dailyTopic?.icon || '📖'} ${dailyTopic?.name || 'Read'}
          </div>
          <div class="well-read-time">📖 ${esc(dailyRead.readTime)} read · Today's Feature</div>
          <div class="well-read-title">${esc(dailyRead.title)}</div>
          <div class="well-read-content" id="well-read-body">
            ${formatParagraphs(dailyRead.content)}
          </div>
          <div class="well-read-toggle" id="well-read-toggle">
            <button class="well-read-toggle-btn" id="well-read-expand">Continue Reading ↓</button>
          </div>
          <div class="well-read-nav">
            <button class="well-read-nav-btn" id="well-read-prev">← Previous</button>
            <button class="well-read-nav-btn" id="well-read-next">Next →</button>
            <button class="well-read-mark-btn ${readIds.has(dailyRead.id) ? 'done' : ''}" id="well-read-mark" data-id="${dailyRead.id}">
              ${readIds.has(dailyRead.id) ? '✓ Read' : '☐ Mark as Read'}
            </button>
          </div>
        </div>
        ` : '<div class="well-daily-read"><p style="color:rgba(255,255,255,.5);">Select some topics below to get daily reads!</p></div>'}
        
        <!-- ═══ WELLNESS DASHBOARD ═══ -->
        <div class="well-grid">
          <!-- Water -->
          <div class="well-card" style="display:flex;flex-direction:column;justify-content:space-between;min-height:220px;">
            <div class="well-card-title">💧 Water Intake</div>
            <div class="well-water-visualizer">
              <div class="well-water-cup">
                <div class="well-water-wave" id="well-water-wave" style="height: ${Math.min(100, (todayWater.glasses / data.waterGoal) * 100)}%">
                  <svg viewBox="0 0 120 28" class="wave-svg">
                    <path d="M0,15 C30,5 90,25 120,15 L120,30 L0,30 Z" fill="#0984e3"/>
                  </svg>
                </div>
              </div>
            </div>
            <div class="well-water-controls" style="display:flex;justify-content:center;gap:8px;margin-top:8px;">
              <button class="well-water-btn" id="well-water-add">+1 Glass</button>
              <button class="well-water-btn" id="well-water-sub" style="background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.5);border-color:rgba(255,255,255,0.1);">-1 Glass</button>
            </div>
            <div class="well-water-count" style="margin-top:6px;text-align:center;font-size:12px;color:var(--text-secondary,#888);">
              <strong>${todayWater.glasses}</strong> / ${data.waterGoal} glasses today
            </div>
          </div>

          <!-- Sleep -->
          <div class="well-card" style="display:flex;flex-direction:column;justify-content:space-between;min-height:220px;">
            <div class="well-card-title">😴 Sleep Tracker</div>
            ${lastSleep ? `
              <div>
                <div class="well-sleep-bar">
                  <div class="well-sleep-fill" style="width:${Math.min(100, (lastSleep.hours / 9) * 100)}%"></div>
                </div>
                <div class="well-sleep-stats">
                  <div class="well-sleep-stat">
                    <div class="well-sleep-stat-val">${lastSleep.hours}h</div>
                    <div class="well-sleep-stat-label">Last Night</div>
                  </div>
                  <div class="well-sleep-stat">
                    <div class="well-sleep-stat-val">${'⭐'.repeat(lastSleep.quality)}</div>
                    <div class="well-sleep-stat-label">Quality</div>
                  </div>
                  <div class="well-sleep-stat">
                    <div class="well-sleep-stat-val">${avgSleep.hours}h</div>
                    <div class="well-sleep-stat-label">Avg (14d)</div>
                  </div>
                </div>
              </div>
            ` : '<p style="color:var(--text-secondary,#888);font-size:13px;text-align:center;padding:30px 0;">No sleep data logged yet</p>'}
          </div>

          <!-- Mood Tracker -->
          <div class="well-card" style="display:flex;flex-direction:column;justify-content:space-between;min-height:220px;">
            <div class="well-card-title">😊 Log Mood</div>
            <div class="well-mood-selector" id="well-mood-selector" style="justify-content:space-between;margin-bottom:8px;">
              ${Object.entries(moodEmojis).map(([mood, emoji]) => `
                <div style="text-align:center;">
                  <div class="well-mood-btn ${todayMood?.mood === mood ? 'active' : ''}" data-mood="${mood}" style="width:40px;height:40px;font-size:20px;">${emoji}</div>
                  <div class="well-mood-label" style="font-size:9px;">${mood}</div>
                </div>
              `).join('')}
            </div>
            <textarea class="well-mood-note" id="well-mood-note" placeholder="What's causing this mood?" rows="1" style="margin-top:0;padding:6px 10px;font-size:12px;height:34px;">${todayMood?.note || ''}</textarea>
            <button class="well-mood-save" id="well-mood-save" style="width:100%;margin-top:6px;padding:6px;font-size:12px;">Save Mood</button>
          </div>

          <!-- Mood Trends Chart -->
          <div class="well-card" style="display:flex;flex-direction:column;justify-content:space-between;min-height:220px;">
            <div class="well-card-title">🧠 Mood Analytics</div>
            <div id="well-mood-trend-chart" style="flex-grow:1;display:flex;flex-direction:column;justify-content:center;">
              ${getMoodTrendSVG()}
            </div>
          </div>
        </div>

        <!-- ═══ MEDITATION ═══ -->
        <div class="well-section-title">🧘 Meditation</div>
        <div class="well-card" style="margin-bottom:24px;">
          <div id="well-med-content">
            <div class="well-med-durations" id="well-med-durations">
              ${[1,3,5,10,15,20,30].map((d,i) => `
                <div class="well-med-dur ${i === 2 ? 'active' : ''}" data-dur="${d}">${d} min</div>
              `).join('')}
            </div>
            <button class="well-med-start" id="well-med-start">▶ Start Meditation</button>
          </div>
          <div class="well-med-stats">
            <div>
              <div class="well-med-stat-val">${totalMedMinutes}</div>
              <div class="well-med-stat-label">Total Minutes</div>
            </div>
            <div>
              <div class="well-med-stat-val">${medSessions}</div>
              <div class="well-med-stat-label">Sessions</div>
            </div>
            <div>
              <div class="well-med-stat-val">${medSessions > 0 ? Math.round(totalMedMinutes / medSessions) : 0}</div>
              <div class="well-med-stat-label">Avg Minutes</div>
            </div>
          </div>
        </div>

        <!-- ═══ JOURNAL ═══ -->
        <div class="well-section-title">📓 Journal ${streak > 0 ? `<span style="font-size:13px;font-weight:500;color:#00b894;">🔥 ${streak}-day streak</span>` : ''}</div>
        <div class="well-journal-section">
          <div class="well-journal-form">
            <div class="well-journal-prompts" id="well-journal-prompts">
              <span class="well-prompt-chip">What made you smile today?</span>
              <span class="well-prompt-chip">What challenge did you overcome today?</span>
              <span class="well-prompt-chip">What is one thing you are proud of?</span>
              <span class="well-prompt-chip">How did you invest in yourself today?</span>
            </div>
            <textarea class="well-journal-textarea" id="well-journal-content" placeholder="What's on your mind today? Reflect on your day...">${journal.find(j => j.date === today)?.content || ''}</textarea>
            <p style="color:var(--text-secondary,#888);font-size:12px;margin-bottom:6px;">✨ Three things I'm grateful for:</p>
            <div class="well-journal-gratitude">
              <input class="well-journal-grat-input" id="well-grat-1" placeholder="1st gratitude" value="${journal.find(j => j.date === today)?.gratitude?.[0] || ''}">
              <input class="well-journal-grat-input" id="well-grat-2" placeholder="2nd gratitude" value="${journal.find(j => j.date === today)?.gratitude?.[1] || ''}">
              <input class="well-journal-grat-input" id="well-grat-3" placeholder="3rd gratitude" value="${journal.find(j => j.date === today)?.gratitude?.[2] || ''}">
            </div>
            <button class="well-journal-save" id="well-journal-save">💾 Save Entry</button>
          </div>
          <div class="well-journal-entries">tton class="well-mood-save" id="well-mood-save">Save Mood</button>
          </div>
        </div>

        <!-- ═══ MEDITATION ═══ -->
        <div class="well-section-title">🧘 Meditation</div>
        <div class="well-card" style="margin-bottom:24px;">
          <div id="well-med-content">
            <div class="well-med-durations" id="well-med-durations">
              ${[1,3,5,10,15,20,30].map((d,i) => `
                <div class="well-med-dur ${i === 2 ? 'active' : ''}" data-dur="${d}">${d} min</div>
              `).join('')}
            </div>
            <button class="well-med-start" id="well-med-start">▶ Start Meditation</button>
          </div>
          <div class="well-med-stats">
            <div>
              <div class="well-med-stat-val">${totalMedMinutes}</div>
              <div class="well-med-stat-label">Total Minutes</div>
            </div>
            <div>
              <div class="well-med-stat-val">${medSessions}</div>
              <div class="well-med-stat-label">Sessions</div>
            </div>
            <div>
              <div class="well-med-stat-val">${medSessions > 0 ? Math.round(totalMedMinutes / medSessions) : 0}</div>
              <div class="well-med-stat-label">Avg Minutes</div>
            </div>
          </div>
        </div>

        <!-- ═══ JOURNAL ═══ -->
        <div class="well-section-title">📓 Journal ${streak > 0 ? `<span style="font-size:13px;font-weight:500;color:#00b894;">🔥 ${streak}-day streak</span>` : ''}</div>
        <div class="well-journal-section">
          <div class="well-journal-form">
            <textarea class="well-journal-textarea" id="well-journal-content" placeholder="What's on your mind today? Reflect on your day...">${journal.find(j => j.date === today)?.content || ''}</textarea>
            <p style="color:var(--text-secondary,#888);font-size:12px;margin-bottom:6px;">✨ Three things I'm grateful for:</p>
            <div class="well-journal-gratitude">
              <input class="well-journal-grat-input" id="well-grat-1" placeholder="1st gratitude" value="${journal.find(j => j.date === today)?.gratitude?.[0] || ''}">
              <input class="well-journal-grat-input" id="well-grat-2" placeholder="2nd gratitude" value="${journal.find(j => j.date === today)?.gratitude?.[1] || ''}">
              <input class="well-journal-grat-input" id="well-grat-3" placeholder="3rd gratitude" value="${journal.find(j => j.date === today)?.gratitude?.[2] || ''}">
            </div>
            <button class="well-journal-save" id="well-journal-save">💾 Save Entry</button>
          </div>
          <div class="well-journal-entries">
            ${journal.filter(j => j.date !== today).slice(-5).reverse().map(j => `
              <div class="well-journal-entry">
                <div class="well-journal-entry-date">
                  ${moodEmojis[j.mood] || '📝'} ${new Date(j.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <div class="well-journal-entry-content">${esc(j.content.substring(0, 250))}${j.content.length > 250 ? '...' : ''}</div>
                ${j.gratitude?.length ? `
                  <div class="well-journal-entry-gratitude">
                    ${j.gratitude.map(g => `<span class="well-journal-grat-tag">🙏 ${esc(g)}</span>`).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <!-- ═══ TOPIC PREFERENCES ═══ -->
        <div class="well-section-title">🏷️ Your Topics</div>
        <div class="well-topics" id="well-topics">
          ${TOPICS.map(t => `
            <div class="well-topic-pill ${userTopics.includes(t.id) ? 'active' : 'inactive'}"
                 data-topic="${t.id}"
                 style="${userTopics.includes(t.id) ? `background:${t.color}22;border-color:${t.color};color:${t.color}` : ''}">
              ${t.icon} ${t.name}
            </div>
          `).join('')}
        </div>

        <!-- ═══ BROWSE ALL READS ═══ -->
        <div class="well-section-title">📚 Browse Articles</div>
        <div class="well-reads-grid" id="well-reads-grid">
          ${LIBRARY.slice(0, 12).map(a => {
            const t = TOPICS.find(tp => tp.id === a.topic);
            return `
            <div class="well-reads-card" data-article-id="${a.id}">
              <div class="well-reads-card-topic" style="color:${t?.color || '#888'}">${t?.icon || ''} ${t?.name || ''}</div>
              <div class="well-reads-card-title">${esc(a.title)}</div>
              <div class="well-reads-card-time">${a.readTime} · ${readIds.has(a.id) ? '✓ Read' : 'Unread'}</div>
            </div>`;
          }).join('')}
        </div>
        <button id="well-load-more" style="
          display:block; margin:16px auto 32px; padding:10px 28px; border-radius:10px;
          background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1);
          color:var(--text-secondary,#888); font-size:13px; cursor:pointer;
        ">Show All ${LIBRARY.length} Articles</button>
      </div>
    `;

    /* ═══ EVENT BINDINGS ═══ */

    // Expand/collapse daily read
    const expandBtn = container.querySelector('#well-read-expand');
    const readBody = container.querySelector('#well-read-body');
    const toggleDiv = container.querySelector('#well-read-toggle');
    if (expandBtn && readBody) {
      expandBtn.addEventListener('click', () => {
        const isExpanded = readBody.classList.toggle('expanded');
        if (isExpanded) {
          toggleDiv.style.display = 'none';
        }
      });
    }

    // Mark as read
    const markBtn = container.querySelector('#well-read-mark');
    if (markBtn) {
      markBtn.addEventListener('click', () => {
        const d = _data();
        const aid = markBtn.dataset.id;
        if (!d.readHistory.find(r => r.articleId === aid)) {
          d.readHistory.push({ articleId: aid, readAt: new Date().toISOString() });
          _saveData(d);
          markBtn.textContent = '✓ Read';
          markBtn.classList.add('done');
        }
      });
    }

    // Navigate reads
    let _currentReadIndex = LIBRARY.findIndex(a => a.id === dailyRead?.id);
    const _showArticle = (idx) => {
      const article = LIBRARY[idx];
      if (!article) return;
      const topic = TOPICS.find(t => t.id === article.topic);
      const card = container.querySelector('#well-daily-read-card');
      if (!card) return;
      card.querySelector('.well-read-badge').innerHTML = `${topic?.icon || '📖'} ${topic?.name || ''}`;
      card.querySelector('.well-read-badge').style.background = `${topic?.color || '#6c5ce7'}22`;
      card.querySelector('.well-read-badge').style.color = topic?.color || '#6c5ce7';
      card.querySelector('.well-read-time').innerHTML = `📖 ${esc(article.readTime)} read`;
      card.querySelector('.well-read-title').textContent = article.title;
      const body = card.querySelector('#well-read-body');
      body.innerHTML = formatParagraphs(article.content);
      body.classList.remove('expanded');
      const toggle = card.querySelector('#well-read-toggle');
      if (toggle) toggle.style.display = '';
      const mark = card.querySelector('#well-read-mark');
      const d = _data();
      const isRead = d.readHistory.some(r => r.articleId === article.id);
      mark.dataset.id = article.id;
      mark.textContent = isRead ? '✓ Read' : '☐ Mark as Read';
      mark.className = 'well-read-mark-btn' + (isRead ? ' done' : '');
    };

    container.querySelector('#well-read-prev')?.addEventListener('click', () => {
      _currentReadIndex = (_currentReadIndex - 1 + LIBRARY.length) % LIBRARY.length;
      _showArticle(_currentReadIndex);
    });
    container.querySelector('#well-read-next')?.addEventListener('click', () => {
      _currentReadIndex = (_currentReadIndex + 1) % LIBRARY.length;
      _showArticle(_currentReadIndex);
    });

    // Water Intake
    container.querySelector('#well-water-add')?.addEventListener('click', () => {
      const d = _data();
      if (!d.water[today]) d.water[today] = { glasses: 0, goal: d.waterGoal };
      d.water[today].glasses++;
      _saveData(d);
      
      const wave = container.querySelector('#well-water-wave');
      if (wave) wave.style.height = `${Math.min(100, (d.water[today].glasses / d.waterGoal) * 100)}%`;
      
      const count = container.querySelector('.well-water-count');
      if (count) count.innerHTML = `<strong>${d.water[today].glasses}</strong> / ${d.waterGoal} glasses today`;
    });

    container.querySelector('#well-water-sub')?.addEventListener('click', () => {
      const d = _data();
      if (!d.water[today]) d.water[today] = { glasses: 0, goal: d.waterGoal };
      if (d.water[today].glasses > 0) {
        d.water[today].glasses--;
        _saveData(d);
        
        const wave = container.querySelector('#well-water-wave');
        if (wave) wave.style.height = `${Math.min(100, (d.water[today].glasses / d.waterGoal) * 100)}%`;
        
        const count = container.querySelector('.well-water-count');
        if (count) count.innerHTML = `<strong>${d.water[today].glasses}</strong> / ${d.waterGoal} glasses today`;
      }
    });

    // Mood
    let _selectedMood = todayMood?.mood || null;
    container.querySelector('#well-mood-selector')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.well-mood-btn');
      if (!btn) return;
      _selectedMood = btn.dataset.mood;
      container.querySelectorAll('.well-mood-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });

    container.querySelector('#well-mood-save')?.addEventListener('click', () => {
      if (!_selectedMood) {
        if (typeof App !== 'undefined' && App.toast) App.toast('Please select a mood first', 'warning');
        return;
      }
      const d = _data();
      const note = container.querySelector('#well-mood-note').value.trim();
      const existing = d.mood.findIndex(m => m.date === today);
      const entry = { date: today, mood: _selectedMood, note, time: new Date().toTimeString().slice(0, 5) };
      if (existing !== -1) d.mood[existing] = entry;
      else d.mood.push(entry);
      _saveData(d);
      if (typeof App !== 'undefined' && App.toast) App.toast('Mood saved!', 'success');
    });

    // Meditation duration picker
    let _selectedMedDuration = 5;
    container.querySelector('#well-med-durations')?.addEventListener('click', (e) => {
      const dur = e.target.closest('.well-med-dur');
      if (!dur) return;
      _selectedMedDuration = parseInt(dur.dataset.dur);
      container.querySelectorAll('.well-med-dur').forEach(d => d.classList.remove('active'));
      dur.classList.add('active');
    });

    // Start meditation
    container.querySelector('#well-med-start')?.addEventListener('click', () => {
      const medContent = container.querySelector('#well-med-content');
      _medDuration = _selectedMedDuration * 60; // seconds
      _medStartTime = Date.now();
      let remaining = _medDuration;

      medContent.innerHTML = `
        <div class="well-med-active" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px;">
          <div class="well-med-visualizer-container">
            <div class="well-med-breath-circle" id="well-med-breath-circle"></div>
            <div class="well-med-breath-text" id="well-med-breath-text">Prepare</div>
          </div>
          <div class="well-med-timer" id="well-med-timer">${String(Math.floor(remaining / 60)).padStart(2,'0')}:${String(remaining % 60).padStart(2,'0')}</div>
          <button class="well-med-stop" id="well-med-stop">⏹ Stop</button>
        </div>
      `;

      // Start synthesizer audio drone
      _startMeditationAudio();

      _medInterval = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - _medStartTime) / 1000);
        remaining = Math.max(0, _medDuration - elapsedSeconds);
        
        const timerEl = container.querySelector('#well-med-timer');
        if (timerEl) timerEl.textContent = `${String(Math.floor(remaining / 60)).padStart(2,'0')}:${String(remaining % 60).padStart(2,'0')}`;
        
        // Calculate box breathing phase (4s Inhale, 4s Hold, 4s Exhale, 4s Hold)
        const cycleTime = elapsedSeconds % 16;
        let phase = 'inhale';
        let text = 'Breathe In';
        if (cycleTime >= 4 && cycleTime < 8) {
          phase = 'hold';
          text = 'Hold';
        } else if (cycleTime >= 8 && cycleTime < 12) {
          phase = 'exhale';
          text = 'Breathe Out';
        } else if (cycleTime >= 12) {
          phase = 'hold-empty';
          text = 'Hold';
        }

        const circleEl = container.querySelector('#well-med-breath-circle');
        const textEl = container.querySelector('#well-med-breath-text');
        if (circleEl && textEl) {
          textEl.textContent = text;
          // Clean classes and apply phase
          circleEl.className = 'well-med-breath-circle ' + phase;
        }

        // Modulate volume tone
        _modulateMeditationAudio(phase);

        if (remaining <= 0) {
          clearInterval(_medInterval);
          _medInterval = null;
          _stopMeditationAudio();
          
          // Save session
          const d = _data();
          d.meditation.push({ date: today, minutes: _selectedMedDuration, completedAt: new Date().toISOString() });
          _saveData(d);
          if (typeof App !== 'undefined' && App.toast) App.toast(`🧘 ${_selectedMedDuration}-minute meditation complete!`, 'success');
          _render(container);
        }
      }, 1000);

      container.querySelector('#well-med-stop')?.addEventListener('click', () => {
        clearInterval(_medInterval);
        _medInterval = null;
        _stopMeditationAudio();
        
        const elapsed = Math.floor((Date.now() - _medStartTime) / 60000);
        if (elapsed >= 1) {
          const d = _data();
          d.meditation.push({ date: today, minutes: elapsed, completedAt: new Date().toISOString() });
          _saveData(d);
        }
        _render(container);
      });
    });

    // Journal save
    container.querySelector('#well-journal-save')?.addEventListener('click', () => {
      const content = container.querySelector('#well-journal-content').value.trim();
      if (!content) {
        if (typeof App !== 'undefined' && App.toast) App.toast('Write something in your journal first', 'warning');
        return;
      }
      const gratitude = [
        container.querySelector('#well-grat-1').value.trim(),
        container.querySelector('#well-grat-2').value.trim(),
        container.querySelector('#well-grat-3').value.trim(),
      ].filter(Boolean);
      const entries = _journalEntries();
      const existing = entries.findIndex(j => j.date === today);
      const entry = { id: 'j_' + Date.now(), date: today, mood: _selectedMood || 'okay', content, gratitude };
      if (existing !== -1) entries[existing] = { ...entries[existing], ...entry };
      else entries.push(entry);
      _saveJournal(entries);
      if (typeof App !== 'undefined' && App.toast) App.toast('Journal entry saved!', 'success');
    });

    // Journal reflection prompts
    container.querySelector('#well-journal-prompts')?.addEventListener('click', (e) => {
      const chip = e.target.closest('.well-prompt-chip');
      if (!chip) return;
      const ta = container.querySelector('#well-journal-content');
      if (ta) {
        ta.value = `Prompt: "${chip.textContent}"\n` + ta.value;
        ta.focus();
      }
    });

    // Topic toggling
    container.querySelector('#well-topics')?.addEventListener('click', (e) => {
      const pill = e.target.closest('.well-topic-pill');
      if (!pill) return;
      const topicId = pill.dataset.topic;
      const d = _data();
      const idx = d.userTopics.indexOf(topicId);
      if (idx !== -1) {
        d.userTopics.splice(idx, 1);
      } else {
        d.userTopics.push(topicId);
      }
      _saveData(d);
      _render(container);
    });

    // Article cards
    container.querySelectorAll('.well-reads-card').forEach(card => {
      card.addEventListener('click', () => {
        const aid = card.dataset.articleId;
        const idx = LIBRARY.findIndex(a => a.id === aid);
        if (idx !== -1) {
          _currentReadIndex = idx;
          _showArticle(idx);
          container.querySelector('#well-daily-read-card')?.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // Load more articles
    container.querySelector('#well-load-more')?.addEventListener('click', () => {
      const grid = container.querySelector('#well-reads-grid');
      grid.innerHTML = LIBRARY.map(a => {
        const t = TOPICS.find(tp => tp.id === a.topic);
        return `
          <div class="well-reads-card" data-article-id="${a.id}">
            <div class="well-reads-card-topic" style="color:${t?.color || '#888'}">${t?.icon || ''} ${t?.name || ''}</div>
            <div class="well-reads-card-title">${esc(a.title)}</div>
            <div class="well-reads-card-time">${a.readTime} · ${readIds.has(a.id) ? '✓ Read' : 'Unread'}</div>
          </div>`;
      }).join('');
      container.querySelector('#well-load-more').style.display = 'none';
      // Re-bind click events
      grid.querySelectorAll('.well-reads-card').forEach(card => {
        card.addEventListener('click', () => {
          const aid = card.dataset.articleId;
          const idx = LIBRARY.findIndex(a => a.id === aid);
          if (idx !== -1) {
            _currentReadIndex = idx;
            _showArticle(idx);
            container.querySelector('#well-daily-read-card')?.scrollIntoView({ behavior: 'smooth' });
          }
        });
      });
    });
  };

  /* ══════════════════════════════════════════════════════════════════════════
     PUBLIC API
     ══════════════════════════════════════════════════════════════════════════ */

  return {
    /* ── Water ── */
    water: {
      log: (glasses) => {
        const d = _data();
        const today = _today();
        if (!d.water[today]) d.water[today] = { glasses: 0, goal: d.waterGoal };
        d.water[today].glasses = Math.min(d.water[today].glasses + glasses, 20);
        _saveData(d);
        return d.water[today];
      },
      getToday: () => {
        const d = _data();
        return (d.water[_today()] || { glasses: 0 }).glasses;
      },
      goal: 8,
      setGoal: (n) => {
        const d = _data();
        d.waterGoal = Math.max(1, Math.min(20, parseInt(n) || 8));
        _saveData(d);
      },
    },

    /* ── Sleep ── */
    sleep: {
      log: (bedtime, wakeup, quality) => {
        const d = _data();
        // Parse hours
        const [bh, bm] = bedtime.split(':').map(Number);
        const [wh, wm] = wakeup.split(':').map(Number);
        let hours = (wh + wm / 60) - (bh + bm / 60);
        if (hours < 0) hours += 24;
        d.sleep.push({
          date: _today(),
          bedtime, wakeup,
          hours: Math.round(hours * 10) / 10,
          quality: Math.max(1, Math.min(5, parseInt(quality) || 3)),
        });
        _saveData(d);
      },
      getLastNight: () => {
        const d = _data();
        return d.sleep.length > 0 ? d.sleep[d.sleep.length - 1] : null;
      },
      getThisWeek: () => {
        const d = _data();
        const weekAgo = _dateOffset(-7);
        return d.sleep.filter(s => s.date >= weekAgo);
      },
      getAverage: () => {
        const d = _data();
        if (d.sleep.length === 0) return { hours: 0, quality: 0 };
        return {
          hours: +(d.sleep.reduce((s, e) => s + e.hours, 0) / d.sleep.length).toFixed(1),
          quality: +(d.sleep.reduce((s, e) => s + e.quality, 0) / d.sleep.length).toFixed(1),
        };
      },
    },

    /* ── Mood ── */
    mood: {
      log: (mood, note = '') => {
        const d = _data();
        const today = _today();
        const existing = d.mood.findIndex(m => m.date === today);
        const entry = { date: today, mood, note, time: new Date().toTimeString().slice(0, 5) };
        if (existing !== -1) d.mood[existing] = entry;
        else d.mood.push(entry);
        _saveData(d);
        return entry;
      },
      getToday: () => {
        const d = _data();
        return d.mood.find(m => m.date === _today()) || null;
      },
      getThisWeek: () => {
        const d = _data();
        const weekAgo = _dateOffset(-7);
        return d.mood.filter(m => m.date >= weekAgo);
      },
      getMoodTrend: () => {
        const d = _data();
        const monthAgo = _dateOffset(-30);
        return d.mood.filter(m => m.date >= monthAgo);
      },
    },

    /* ── Meditation ── */
    meditation: {
      durations: [1, 3, 5, 10, 15, 20, 30],
      start: (minutes) => {
        _medDuration = (minutes || 5) * 60;
        _medStartTime = Date.now();
        // Caller handles UI
        return { started: true, duration: minutes };
      },
      stop: () => {
        const elapsed = _medStartTime ? Math.floor((Date.now() - _medStartTime) / 60000) : 0;
        _medStartTime = null;
        if (elapsed >= 1) {
          const d = _data();
          d.meditation.push({ date: _today(), minutes: elapsed, completedAt: new Date().toISOString() });
          _saveData(d);
        }
        return { elapsed };
      },
      getHistory: () => _data().meditation,
      getTotalMinutes: () => _data().meditation.reduce((s, m) => s + m.minutes, 0),
    },

    /* ── Journal ── */
    journal: {
      add: (entry) => {
        const entries = _journalEntries();
        const newEntry = {
          id: 'j_' + Date.now(),
          date: entry.date || _today(),
          content: entry.content || '',
          mood: entry.mood || 'okay',
          gratitude: entry.gratitude || [],
        };
        const existing = entries.findIndex(j => j.date === newEntry.date);
        if (existing !== -1) entries[existing] = { ...entries[existing], ...newEntry };
        else entries.push(newEntry);
        _saveJournal(entries);
        return newEntry;
      },
      getAll: () => _journalEntries(),
      getByDate: (date) => _journalEntries().find(j => j.date === date) || null,
      getStreak: () => {
        const dates = new Set(_journalEntries().map(j => j.date));
        let streak = 0;
        for (let i = 0; i < 365; i++) {
          if (dates.has(_dateOffset(-i))) streak++;
          else break;
        }
        return streak;
      },
    },

    /* ── Reads ── */
    reads: {
      topics: TOPICS,
      library: LIBRARY,
      getDailyRead: () => {
        const data = _data();
        const userTopics = data.userTopics || [];
        const topicArticles = LIBRARY.filter(a => userTopics.includes(a.topic));
        const readIds = new Set((data.readHistory || []).map(r => r.articleId));
        const unread = topicArticles.filter(a => !readIds.has(a.id));
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        return unread.length > 0 ? unread[dayOfYear % unread.length] : (topicArticles[dayOfYear % topicArticles.length] || null);
      },
      getByTopic: (topic) => LIBRARY.filter(a => a.topic === topic),
      markRead: (articleId) => {
        const d = _data();
        if (!d.readHistory.find(r => r.articleId === articleId)) {
          d.readHistory.push({ articleId, readAt: new Date().toISOString() });
          _saveData(d);
        }
      },
      getReadHistory: () => {
        const d = _data();
        return (d.readHistory || []).map(r => ({
          ...r,
          article: LIBRARY.find(a => a.id === r.articleId),
        }));
      },
      getUserTopics: () => (_data().userTopics || []),
      setUserTopics: (topics) => {
        const d = _data();
        d.userTopics = topics;
        _saveData(d);
      },
    },

    /* ── Render ── */
    render: _render,
  };
})();
