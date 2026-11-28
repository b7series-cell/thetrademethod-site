/* =====================================================================
   nav.js — THE SETUP REGISTRY

   This is the only place the setup list lives. Add a setup to the
   SETUPS array below and four things update on their own:

     1. the sitenav on every page
     2. the directory cards on index.html
     3. the counts in the index header
     4. the indicator block on that setup's own page

   Never hand-edit nav or indicator markup in a page. If something is
   wrong on a page, it is wrong here.

   Paths are root-relative ("/setups/...") so they resolve the same
   from the homepage and from inside /setups/.
   ===================================================================== */

const SETUPS = [
  {
    slug:    "pmh-break",
    href:    "/setups/pmh-break.html",
    nav:     "PMH Break",
    title:   "Premarket High Break",
    thesis:  "Price reclaims the premarket high on the opening drive and holds it. The break is the entry; the reclaim level is the invalidation.",
    session: "09:30 – 10:15",
    side:    "long",
    stages:  6,
    filters: 4,
    status:  "live",

    indicators: [
      {
        name:  "Pre-Market High / Low + Prior Day",
        blurb: "Marks the pre-market range and yesterday's high, low, and close, glows on abnormal time-of-day volume, and fires the long setup when a 9:30–9:45 bar closes above the PDH through the PMH on a glowing candle.",
        url:   "",
        file:  "/pine/pmh-prior-levels.pine",
        alerts: true
      }
    ]
  },
  {
    slug:    "market-memory",
    href:    "/setups/market-memory.html",
    nav:     "Market Memory",
    title:   "Market Memory — Day Two Model",
    thesis:  "Yesterday's real buyers and sellers left a map. Price returns to those levels and reacts on the John Wick candle, the confirmed rejection that says which way memory is pulling it.",
    session: "09:30 – 16:00",
    side:    "both",
    stages:  7,
    filters: 4,
    status:  "live",
    indicators: []
  },
  {
    slug:    "fashionably-late",
    href:    "/setups/fashionably-late.html",
    nav:     "Fashionably Late",
    title:   "Fashionably Late — 9 EMA x VWAP Scalp",
    thesis:  "Let the low print, let momentum build back to VWAP, and buy the moment the 9 EMA crosses it — proof the turn already happened, not a guess that it will.",
    session: "10:00 – 13:30",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: [
      {
        name:  "EMA/VWAP Reversal Cross R1.2",
        blurb: "BUY when the 9 EMA crosses over VWAP after a same-day pivot low, SELL on the mirror, inside two intraday windows, with target and stop off the pivot-to-entry distance, JSON webhook alerts and a win/loss panel.",
        url:   "",
        file:  "/pine/ema-vwap-reversal-cross.pine",
        alerts: true
      }
    ]
  },
  {
    slug:    "energy-in-the-tank",
    href:    "/setups/energy-in-the-tank.html",
    nav:     "Energy in the Tank",
    title:   "Energy in the Tank — Volatility Cycle Breakout",
    thesis:  "A squeeze on the higher time frame stores energy. An outlier volume bar on the breakout is what spends it — the same signal behind some of the biggest continuation moves in recent memory.",
    session: "Multi-timeframe",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: [
      {
        name:  "Energy in the Tank — The Trade Method",
        blurb: "Plots the squeeze measure with its 1.5x and 6x lines, arms on a weekly squeeze, buys a daily close above the top of the weekly range on 2-sigma volume, stops on a close back below the level and flags the 6x trim cue, with alerts.",
        url:   "",
        file:  "/pine/energy-in-the-tank.pine",
        alerts: true
      }
    ]
  },
  {
    slug:    "opening-range-break",
    href:    "/setups/opening-range-break.html",
    nav:     "Opening Range Break",
    title:   "Opening Range Break — the same range, every single day",
    thesis:  "Let the first 15\u201330 minutes set the range, then trust the break only when volume and the higher time frame agree \u2014 the ticker changes, the mechanics never do.",
    session: "09:30 \u2013 10:00",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: [
      { name: "Opening Range Break",
        blurb: "Boxes the first 2, 5, 15 or 30 minutes, numbers every break attempt, takes a close outside the range on 1.5x the 20-bar volume with the stop 5 cents past the breakout bar, half off at 1 daily ATR from the low or high of day and the rest on a close through the 9 EMA. Marks no trade, low vol and no room.",
        url: "", file: "/pine/opening-range-break.pine", alerts: true }
    ]
  },
  {
    slug:    "day-three-breakout",
    href:    "/setups/day-three-breakout.html",
    nav:     "Day Three Breakout",
    title:   "Day Three Breakout — catalyst, inside day, and the break",
    thesis:  "A real catalyst drives day one, a quiet low-volume day sets up day two, and the break of that day-two high on day three is the entry \u2014 the same three-day sequence, six different tickers.",
    session: "09:30 \u2013 10:00",
    side:    "long",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: [
      {
        name:  "Day Three Breakout — The Trade Method",
        blurb: "Checks for a catalyst-style day one and a quiet inside day two, arms a buy stop at the day-two high, takes an early break with the stop under the breakout bar, and scales out in thirds to a 9 EMA close, with webhook-ready alerts.",
        url:   "",
        file:  "/pine/day-three-breakout.pine",
        alerts: true
      }
    ]
  },
  {
    slug:    "nine-ema-continuation",
    href:    "/setups/nine-ema-continuation.html",
    nav:     "9 EMA Continuation",
    title:   "9 EMA Continuation — read the reclaim, not the touch",
    thesis:  "Don't chase the breakout \u2014 wait for the pullback into the 9 EMA, read whether buyers actually step back up, and enter on the reclaim, not the tap.",
    session: "09:30 \u2013 11:00",
    side:    "long",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: [
      { name: "9 EMA Continuation",
        blurb: "Marks the breakout on volume, the touch of the 9 EMA, the failed tests and the reclaim entry, with the stop under the pullback low, half off at 2R and the exit on a close under the 9 EMA.",
        url: "", file: "/pine/nine-ema-continuation.pine", alerts: true }
    ]
  },
  {
    slug:    "macd-continuation-scalp",
    href:    "/setups/macd-continuation-scalp.html",
    nav:     "MACD Continuation Scalp",
    title:   "MACD Continuation Scalp — consolidation, expansion, and the cross back",
    thesis:  "Let a flat consolidation build, wait for the expansion move, then trade the pullback — enter when the MACD line crosses back over the signal line on its side of zero, custom 3/9/5 settings, no histogram.",
    session: "09:30 – 16:00",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: []
  },
  {
    slug:    "vwap-reversal",
    href:    "/setups/vwap-reversal.html",
    nav:     "VWAP Reversal",
    title:   "VWAP Reversal — three signals, one trade",
    thesis:  "Stack a VWAP band touch, an old horizontal level, and a failure-test reversal candle at the same price — one signal is a guess, three is a trade.",
    session: "09:30 – 16:00",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: []
  },
  {
    slug:    "atr-band-hybrid",
    href:    "/setups/atr-band-hybrid.html",
    nav:     "ATR Hybrid Scalp",
    title:   "ATR Hybrid Scalp — band-touch longs, wick-reversal shorts",
    thesis:  "Longs and shorts run two completely different playbooks on the same chart — longs enter on a touch of a 3.1× ATR band and exit on a fixed 2/1.5 ATR target and stop, shorts enter on a single rejection candle and exit on a stopwatch.",
    session: "09:30 – 16:00",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: [
      { name: "ATR Hybrid Scalp",
        blurb: "Draws the band (previous close − 3.1 ATR), marks each band-touch long with its 2 ATR target and 1.5 ATR stop, and marks each rejection wick and the one-candle short after it. Skips the opening candle.",
        url: "", file: "/pine/atr-band-hybrid.pine", alerts: true }
    ]
  },
  {
    slug:    "cup-and-handle",
    href:    "/setups/cup-and-handle.html",
    nav:     "Cup and Handle",
    title:   "Cup and Handle — plan the trade, trade the plan",
    thesis:  "Five questions qualify the pattern — uptrend, a volume-confirmed cup, a tightening handle, clean air above, and sector/market alignment — then enter only on the break, sized off a 1.5× ATR stop with two scaled profit targets.",
    session: "Swing – multi-day hold",
    side:    "long",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: [
      {
        name:  "Cup and Handle — Trade Plan R1.0",
        blurb: "Finds cup-and-handle bases with the page's checks, arms a buy stop just over resistance, and draws the 1.5× ATR stop and both scaled targets, with webhook-ready alerts.",
        url:   "",
        file:  "/pine/cup-and-handle.pine",
        alerts: true
      }
    ]
  },
  {
    slug:    "three-candle-crt",
    href:    "/setups/three-candle-crt.html",
    nav:     "3-Candle CRT",
    title:   "Three-Candle CRT — sweep, confirm, break",
    thesis:  "Candle Range Theory in three candles — mark the extreme, wait for the sweep-and-close-back-in, then trade only the break — sized to an exact 1.5 reward-to-risk ratio every time, never a fixed stop distance.",
    session: "New York AM · 9:30–12:00 ET",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",

    indicators: [
      {
        name:  "CRT NY — 3-Candle Model",
        blurb: "Builds the three CRT candles from 15m/30m/1H, reads the higher-timeframe bias off a key-level sweep, and fires direct-break or rebreak entries inside the New York window — with a dashboard, TP/SL lines dragged to an exact 1.5R, and webhook-ready alerts at every stage.",
        url:   "",
        file:  "/pine/three-candle-crt.pine",
        alerts: true
      }
    ]
  },
  {
    slug:    "volume-profile-system",
    href:    "/setups/volume-profile-system.html",
    nav:     "Volume Profile System",
    title:   "Volume Profile Trading System — PC, value area, breakout",
    thesis:  "One tool, read three different ways depending on how the prior session closed — a point-of-control bounce, a value-area reversal, or a value-area breakout continuation — all sized to a fixed 2R.",
    session: "Intraday — any timeframe below the daily chart",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",

    indicators: [
      {
        name:  "VP System — PC · VA Reversal · VA Breakout",
        blurb: "Builds the previous session's volume profile and extends its PC, VAH, and VAL into today, marks PC bounces, value area reversals, and breakout continuations with 2R targets, with webhook-ready alerts.",
        url:   "",
        file:  "/pine/volume-profile-system.pine",
        alerts: true
      }
    ]
  }
  ,{
    slug:    "volume-sr-rejection",
    href:    "/setups/volume-sr-rejection.html",
    nav:     "Volume S/R Rejection",
    title:   "Volume S/R Rejection — volume-backed levels, confirmed on the close",
    thesis:  "Trade only the support and resistance the volume profile backs, mark where the point of control stacks on a level, and take the rejection when the bar closes and the volume balance flips your way.",
    session: "Intraday — any timeframe",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",

    indicators: [
      {
        name:  "Volume Profile + S/R Rejection R1.0",
        blurb: "A rolling buy/sell volume profile with its POC, support and resistance drawn only where the profile backs a swing point, an estimated buy/sell volume pane with a current-candle table, and bar-close BUY/SELL rejection signals with alerts.",
        url:   "",
        file:  "/pine/volume-sr-rejection.pine",
        alerts: true
      }
    ]
  },
  {
    slug:    "gex-levels",
    href:    "/setups/gex-levels.html",
    nav:     "GEX Levels",
    title:   "GEX Levels — Call Wall, Put Wall, Gamma Flip",
    thesis:  "Dealer hedging leaves fingerprints at a few prices every morning. The walls say where price is likely to stall; the gamma flip says whether to fade them or follow the break.",
    session: "09:30 – 16:00",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: [
      {
        name:  "GEX Levels — Paste-In",
        blurb: "Paste the morning call wall, put wall and gamma flip for each ticker; it draws them with confidence and size, tints the regime above and below the flip, and signals wall rejections, holds, flip losses, retests and breaks with JSON alerts.",
        url:   "",
        file:  "/pine/gex-levels.pine",
        alerts: true
      }
    ]
  }

  ,{
    slug:    "zero-lag-pullback",
    href:    "/setups/zero-lag-pullback.html",
    nav:     "Zero Lag Pullback",
    title:   "Zero Lag Pullback — Trade the Reclaim, Not the Cross",
    thesis:  "Two zero-lag EMAs, 50 and 100, mark the trend. Wait for a close between them, then buy the green candle that closes back over the fast line on above-average volume. Stop on the slow line, target 2R.",
    session: "09:30 – 16:00",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: [
      {
        name:  "Zero Lag Trend Pullback",
        blurb: "Zero-lag EMA 50 and 100 with the zone tinted by trend; BUY and SELL when a pullback that closed between the lines is reclaimed on volume at or above its average, with the stop on the slow line, a 2R target, share size, and alerts.",
        url:   "",
        file:  "/pine/zero-lag-pullback.pine",
        alerts: true
      }
    ]
  }

  ,{
    slug:    "knock-twice",
    href:    "/setups/knock-twice.html",
    nav:     "Knock Twice",
    title:   "Knock Twice — Break, Knock, Break Again",
    thesis:  "Price closes through an old swing high, runs, stays away for five bars, then comes back and knocks on the old level once and holds. Buy the knock with the stop a tick under it. The break of the new high confirms it, and T2 is one more leg.",
    session: "09:35 – 15:30",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: [
      {
        name:  "Valid BOS Pullback v2",
        blurb: "Swing breaks with the old level and new extreme drawn as they develop, every touch marked and the qualifying knock circled, the confirmed break checked, T2 and the plan stop, a stats table, and alerts with JSON messages.",
        url:   "",
        file:  "/pine/knock-twice.pine",
        alerts: true
      }
    ]
  }

  ,{
    slug:    "silver-bullet",
    href:    "/setups/silver-bullet.html",
    nav:     "Silver Bullet",
    title:   "Silver Bullet — ICT's Magic Hours, Tested",
    thesis:  "In three one-hour New York windows, wait for a sweep of untouched liquidity and a displacement candle that leaves a fair value gap, then buy or sell the return to the gap. Tested over 16 years on four futures markets, it lost money after costs in every hour.",
    session: "10:00 – 11:00 · 14:00 – 15:00",
    group:   "day",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: [
      {
        name:  "Silver Bullet [GBB]",
        blurb: "The three windows, the session levels, each window's first sweep and displacement gap, every trade's limit, stop and target with its result in net R, a stats panel by window or by hour, and alerts.",
        url:   "",
        file:  "/pine/silver-bullet.pine",
        alerts: true
      }
    ]
  }

  ,{
    slug:    "gap-give-and-go",
    href:    "/setups/gap-give-and-go.html",
    nav:     "Gap Give and Go",
    title:   "Gap Give and Go — Let It Give, Buy the Go",
    thesis:  "A stock gaps on a real catalyst, then gives back fast on light volume into a key level. Let the give finish, wait for the quiet range where sellers can't push it any lower, and buy the go when the tape turns, with the stop under the low of the day.",
    session: "09:30 – 10:30",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: []
  }

  ,{
    slug:    "qullamaggie",
    href:    "/setups/qullamaggie.html",
    nav:     "Qullamaggie Breakout",
    title:   "Qullamaggie Breakout — Buy the Leaders, Trail the 10-Day",
    thesis:  "Take the top 1 to 2% of movers, wait for a tight base on the 10 and 20-day averages, and buy the opening range high on breakout day with the stop at the low of the day. Sell a third after 3 to 5 days and trail the rest until a close under the 10-day.",
    session: "Swing – multi-day hold",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: []
  }

  ,{
    slug:    "qqe-mod",
    href:    "/setups/qqe-mod.html",
    nav:     "QQE Mod + EMA 50",
    title:   "QQE Mod + EMA 50 — Trade the Color Change With the Trend",
    thesis:  "Let the EMA 50 pick the side. Above it, buy when QQE Mod turns from red to blue on a strong candle that has closed; below it, sell the mirror image. Enter at the next open, stop beyond the last swing, and take 2R only if the next level leaves room.",
    session: "Any session · 5-minute",
    group:   "day",
    side:    "both",
    stages:  6,
    filters: 3,
    status:  "live",
    indicators: [
      {
        name:  "QQE MOD + EMA 50",
        blurb: "One script: the QQE Mod histogram (RSI 8, smoothing 5) in a pane and the EMA 50 on the chart, BUY and SELL labels when the color changes with the EMA on a strong closed candle, entry, swing stop and 2R target lines, a no-room mark when an earlier swing sits before the target, chop and chase filters, and alerts.",
        url:   "",
        file:  "/pine/qqe-mod-ema50.pine",
        alerts: true
      },
      {
        name:  "QQE MOD",
        blurb: "The QQE Mod histogram on its own: two QQE calculations on a smoothed RSI, blue or red only when both agree, a white trend line, a zero line, and alerts when the primary RSI crosses 50. Set the primary RSI length to 8 for this setup.",
        url:   "",
        file:  "/pine/qqe-mod.pine",
        alerts: true
      }
    ]
  }

  ,{
    slug:    "technical-catalyst-breakout",
    href:    "/setups/technical-catalyst-breakout.html",
    nav:     "Technical Catalyst Breakout",
    title:   "Technical Catalyst Breakout — When the Level Is the News",
    thesis:  "No headline needed. When a stock or ETF finally clears a 9 out of 10 level it couldn't get through for weeks, the level is the catalyst. Take it on elevated RVOL and a volume spike, with the tape paying the offer; stop a penny under the breakout candle, add over the pauses, and scratch it if the velocity isn't there.",
    session: "Any session · 1-minute",
    group:   "day",
    side:    "both",
    stages:  8,
    filters: 4,
    status:  "live",
    indicators: [
      {
        name:  "Technical Catalyst Breakout",
        blurb: "The multi-week level from completed daily bars with its tests and days held, time-of-day RVOL and breakout-bar volume checks, A or B size from a market symbol against its VWAP, a stop a penny past round numbers, adds over tight pauses with a trailing stop, exits (stop, back through the level, scratch, prior bars broken), and alerts.",
        url:   "",
        file:  "/pine/technical-catalyst-breakout.pine",
        alerts: true
      }
    ]
  }

  ,{
    slug:    "anchored-vwap",
    href:    "/setups/anchored-vwap.html",
    nav:     "Anchored VWAP",
    title:   "Anchored VWAP — Frame the Catalyst, Buy the Reclaim",
    thesis:  "Anchor a VWAP on the earnings release or catalyst candle, with its source set to the low, and let it tell you whether buyers are in control. Buy the day-one or day-two dip that reclaims near the line, stop under it, and trail it: a daily close below means cut at least half.",
    session: "Swing · earnings and catalysts",
    group:   "swing",
    side:    "long",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: [
      { name: "Anchored VWAP (Earnings and Catalysts)",
        blurb: "Click the release candle: draws the low-source anchored VWAP, grades the after-hours volume, marks the day-one or day-two dip and reclaim, and flags each daily close below the line (cut half) and back above it.",
        url: "", file: "/pine/anchored-vwap.pine", alerts: true }
    ]
  }

  ,{
    slug:    "the-strat",
    href:    "/setups/the-strat.html",
    nav:     "The Strat",
    title:   "The Strat — Read the Evidence, Not the Pattern",
    thesis:  "Price can only do three things: stay inside the last bar (a 1), take out one side (a 2) or both (a 3). Use the broadening formation as the map and time frame continuity to see who's more aggressive, then wait for the evidence: a simultaneous break, when a whole group takes last week's level at once. Enter in force, stop just past the bar, target the other side.",
    session: "Swing · weekly + intraday",
    group:   "swing",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: []
  }

  ,{
    slug:    "hitchhiker-scalp",
    href:    "/setups/hitchhiker-scalp.html",
    nav:     "Hitchhiker Scalp",
    title:   "Hitchhiker Scalp — Wait for the First Pullback to the 9 EMA",
    thesis:  "Right direction, wrong entry is still a loss. Let a stock in play make its outsized move, then wait for the first pullback to the 9 EMA on the 2-minute chart, on lighter volume. Enter as it slows, out on a 2-minute close past the 21 EMA, take 70% into momentum and trail the last 30% on the prior bar.",
    session: "Any session · 2-minute",
    group:   "day",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: [
      {
        name:  "Hitchhiker Scalp",
        blurb: "Finds the outsized move on volume, waits for the first pullback to the 9 EMA, grades its volume against the move (skips heavy), marks the entry as the pullback turns, the stop on a 2-minute close past the 21 EMA and the tightened stop, 70% trimmed in pieces on new highs, the runner trailed on the prior bar, and alerts.",
        url:   "",
        file:  "/pine/hitchhiker-scalp.pine",
        alerts: true
      }
    ]
  }

  ,{
    slug:    "liquidity-refill",
    href:    "/setups/liquidity-refill.html",
    nav:     "Liquidity Refill",
    title:   "Liquidity Refill — The Two-Candle Imbalance Setup",
    thesis:  "When buyers take liquidity faster than sellers can refill it, price has one way to go. After a relatively big candle out of compression, watch the next candle's first seconds: a quick wick that stays in the top 10–20% and gets absorbed. Buy the break of the first candle's high, stop past the wick, out after three or four candles.",
    session: "Any time frame · 1-minute to daily",
    group:   "day",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: [
      { name: "Liquidity Refill",
        blurb: "Finds C1 out of compression, times C2's early wick from intrabar data, and marks the C1 break entry, the stop past the wick and the 3-4 candle exit.",
        url: "", file: "/pine/liquidity-refill.pine", alerts: true }
    ]
  }

  ,{
    slug:    "look-above-and-fail",
    href:    "/setups/look-above-and-fail.html",
    nav:     "Look Above and Fail",
    title:   "Look Above and Fail — The Value Area Failed-Auction Scalp",
    thesis:  "Markets range more than they trend, and in a range the money is made at the edges. After the first 30 minutes, mark the developing value area high and low and wait. When aggressive buyers push over the high (sellers under the low) and price comes right back inside, they're trapped: trade the reclaim, stop past the big trades, partial at POC, target the other side of value.",
    session: "After 10:00 · 2-minute, NQ and ES",
    group:   "day",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: [
      { name: "Look Above and Fail",
        blurb: "Builds the developing regular-hours profile, draws the value area high, low and POC, and marks the fast reclaim after a poke past an edge, with the stop, the POC partial and the other-side target.",
        url: "", file: "/pine/look-above-and-fail.pine", alerts: true }
    ]
  }

  ,{
    slug:    "micro-range",
    href:    "/setups/micro-range.html",
    nav:     "Micro Range",
    title:   "Micro Range — Trade the Range After the Range",
    thesis:  "Price isn't value. Map the regime first: one time framing up or down on the weekly and daily means momentum is allowed; anything else is balance, where you fade failed auctions at the value edges. Never buy the first breakout. Wait for the micro range, the range after the range, then buy the absorbed flush back into it (plan A) or aggressive buying out of it (plan B), with the risk split between them.",
    session: "Cash open · weekly/daily map, 1-minute ES and NQ",
    group:   "day",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: []
  }

  ,{
    slug:    "fib-ote",
    href:    "/setups/fib-ote.html",
    nav:     "Fibonacci OTE",
    title:   "Fibonacci OTE — Buy the Pullback in the Optimal Trade Entry",
    thesis:  "Price moves in waves, so don't buy the impulse. In a clean trend, draw the Fibonacci retracement on the latest impulse and let the pullback come to you: a limit at 0.702, the middle of ICT's Optimal Trade Entry (0.618 to 0.786), in discount for a buy and premium for a sell. Stop past the swing, half off at the old high, the rest at the next higher time frame level, and only with room to get there.",
    session: "Any session · 1-hour, 5-minute entries",
    group:   "day",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: [
      { name: "Fibonacci OTE",
        blurb: "Finds the break of structure, draws the fib on the latest impulse with the OTE and premium and discount, works the limit at 0.702 with the stop past the swing, and follows the trade to TP1 (half, stop to entry) and the next higher time frame level. Marks no fills and skips setups with no room.",
        url: "", file: "/pine/fib-ote.pine", alerts: true }
    ]
  }

  ,{
    slug:    "ready-aim-fire",
    href:    "/setups/ready-aim-fire.html",
    nav:     "Ready, Aim, Fire",
    title:   "Ready, Aim, Fire — Trend, Level, then an Order Flow Trigger",
    thesis:  "Three pieces, and every trade needs all three. Ready: read the higher time frame, trend or balance. Aim: wait for price to reach a level from yesterday's profile, the overnight range, VWAP or a composite high volume node. Fire: only when order flow on the 5-minute shows one side putting in the effort without getting paid, then a rejection. Stop past the fight, target the next level, 1:1 or better.",
    session: "NY open · daily/15-minute map, 5-minute NQ and ES",
    group:   "day",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: []
  }

  ,{
    slug:    "ict-made-simple",
    href:    "/setups/ict-made-simple.html",
    nav:     "ICT Made Simple",
    title:   "ICT Made Simple — the Whole Framework on Two Time Frames",
    thesis:  "Strip ICT down to what moves the needle. Map it on the high time frame: an obvious trend, a close through the swing, the range from the significant low to high and its 0.5, an order block, breaker or fair value gap in the discount, and the draw on liquidity. When price reaches that POI, zoom in and enter on the low time frame breaker. Stop under the turn, target external range liquidity.",
    session: "Any market · two time frames, weekly/daily to 1-hour/5-minute",
    group:   "swing",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: [
      { name: "ICT Made Simple",
        blurb: "Maps the high time frame on closed candles: trend, MSB and MSS on a body close, the range with its 0.5 and OTE zone, and boxed fair value gaps, order blocks and breakers (a failed order block flips into a breaker). At a discount (premium) POI it waits on your chart for the low taken and the close through the high, enters on the breaker retest or the MSS close, stops past the turn and targets external liquidity. Pre-trade checklist, share size from your dollar risk, JSON alerts.",
        url: "", file: "/pine/ict-made-simple.pine", alerts: true }
    ]
  }

  ,{
    slug:    "heatmap-scalp",
    href:    "/setups/heatmap-scalp.html",
    nav:     "Heatmap Scalp",
    title:   "Heatmap Scalp — Trend, VWAP and the Liquidity on the Book",
    thesis:  "The chart gives the side, the heatmap gives the moment. Higher lows above VWAP means longs only (the mirror for shorts). On a pullback, when the sellers' big orders stop pushing price lower and the bid holds, get long on the bid. Fixed dollar stop, cut it early if big orders stack against you, add on the next pullback, and get out a few ticks before the big wall of liquidity.",
    session: "London and NY · 1-minute NQ and ES with a liquidity heatmap",
    group:   "day",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: []
  }

  ,{
    slug:    "gamma-wall-footprint",
    href:    "/setups/gamma-wall-footprint.html",
    nav:     "Gamma Wall Footprint",
    title:   "Gamma Wall Footprint — Three GEX Setups the Footprint Confirms",
    thesis:  "The wall tells you where, not when. Mark the put wall, call wall and zero gamma before the open. A slow drift into a wall: look for the reaction right at it. A fast push: let it overshoot and take the reclaim. Only take it when the footprint knocks (absorption, stacked imbalances, a delta flip or trapped traders). Stop where the idea is wrong, target the next level, half off at the first reaction. If price loses zero gamma and holds, go with it instead.",
    session: "NY morning · 5-minute NQ with a footprint and the GEX map",
    group:   "day",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: [
      {
        name:  "Gamma Wall Footprint — The Trade Method",
        blurb: "Type in the day's put wall, call wall and zero gamma. It sorts each touch into a slow or fast approach, reads TradingView's footprint for absorption, stacked imbalances, a delta flip or trapped traders, and marks the entry, the stop past the failed reaction, half off and the next-level target. Also the zero gamma break short. Needs footprint data (Premium).",
        url:   "",
        file:  "/pine/gamma-wall-footprint.pine",
        alerts: true
      }
    ]
  }

  ,{
    slug:    "ten-am-orb",
    href:    "/setups/ten-am-orb.html",
    nav:     "The 10 AM ORB",
    title:   "The 10 AM ORB — an opening range breakout that waits for 10:00",
    thesis:  "The first break of the opening range is where most traders get faked out. Set the bias before the bell, take nothing from 9:30 to 9:45, mark the 15-minute range and its 50% line, and let 10:00 show the real direction. The break with your bias is confirmation; the retest that holds is the entry. Stop past the reaction, target the next key level at 1:2 or better, break-even once it works, and expect a shakeout into 11:00.",
    session: "NY open · 9:45–11:00 ET · 5-minute ES and NQ",
    group:   "open",
    side:    "both",
    stages:  6,
    filters: 4,
    status:  "live",
    indicators: []
  }

  /* -------------------------------------------------------------------
     Copy this block for the next setup. Keep the trailing comma on the
     entry above when you do. Leave `indicators` as an empty array if a
     setup has none — the block disappears from that page on its own.

  ,{
    slug:    "orb-fail",
    href:    "/setups/orb-fail.html",
    nav:     "ORB Fail",
    title:   "Opening Range Break Failure",
    thesis:  "One line. What the setup claims and what kills it.",
    session: "09:30 – 10:30",
    side:    "short",          // "long" | "short" | "both"
    stages:  6,
    filters: 4,
    status:  "draft",          // "live" | "draft" — drafts are hidden
    indicators: []
  }
  ------------------------------------------------------------------- */
];

/* ---------------------------------------------------------------------
   Nothing below here needs editing when you add a setup.
   --------------------------------------------------------------------- */

(function () {
  "use strict";

  var live = SETUPS.filter(function (s) { return s.status !== "draft"; });

  function samePage(href) {
    var here = location.pathname.replace(/\/index\.html$/, "/");
    return here === href || here === href.replace(/\.html$/, "");
  }

  function esc(str) {
    return String(str).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function indicatorsFor(setup) {
    return (setup && setup.indicators) || [];
  }

  function currentSetup() {
    for (var i = 0; i < SETUPS.length; i++) {
      if (samePage(SETUPS[i].href)) return SETUPS[i];
    }
    return null;
  }

  function renderNav() {
    var mount = document.querySelector("[data-sitenav]");
    if (!mount) return;

    var home = samePage("/")
      ? '<span class="sitenav-home is-here">Setups</span>'
      : '<a class="sitenav-home" href="/">Setups</a>';

    var links = live.map(function (s) {
      var here = samePage(s.href);
      return '<li><a class="sitenav-link' + (here ? " is-here" : "") + '"' +
             (here ? ' aria-current="page"' : "") +
             ' href="' + esc(s.href) + '">' + esc(s.nav) + "</a></li>";
    }).join("");

    mount.innerHTML = home + '<ul class="sitenav-list">' + links + "</ul>";
  }

  function renderDirectory() {
    var mount = document.querySelector("[data-directory]");
    if (!mount) return;

    if (!live.length) {
      mount.innerHTML =
        '<p class="dir-empty">No setups published yet. ' +
        'Add the first one to the SETUPS array in js/nav.js.</p>';
      return;
    }

    mount.innerHTML = live.map(function (s) {
      var n = indicatorsFor(s).length;
      var indMeta = n
        ? '<span><b>' + n + "</b> indicator" + (n === 1 ? "" : "s") + "</span>"
        : "";

      return '' +
        '<a class="dir-card dir-card--' + esc(s.side) + '" href="' + esc(s.href) + '">' +
          '<div class="dir-card-top">' +
            '<span class="dir-side dir-side--' + esc(s.side) + '">' + esc(s.side) + "</span>" +
            '<span class="dir-session">' + esc(s.session) + "</span>" +
          "</div>" +
          '<h3 class="dir-title">' + esc(s.title) + "</h3>" +
          '<p class="dir-thesis">' + esc(s.thesis) + "</p>" +
          '<div class="dir-meta">' +
            '<span><b>' + esc(s.stages) + "</b> stages</span>" +
            '<span><b>' + esc(s.filters) + "</b> filters</span>" +
            indMeta +
          "</div>" +
        "</a>";
    }).join("");
  }

  function renderIndicators() {
    var mount = document.querySelector("[data-indicators]");
    if (!mount) return;

    var setup = currentSetup();
    var list  = indicatorsFor(setup);

    /* No indicators for this setup: clear the section so the page never
       shows an empty heading. */
    if (!list.length) {
      mount.innerHTML = "";
      mount.hidden = true;
      return;
    }

    mount.hidden = false;

    var cards = list.map(function (ind) {
      var links = [];

      if (ind.url) {
        links.push('<a class="ind-link" href="' + esc(ind.url) +
                   '" target="_blank" rel="noopener">Open on TradingView</a>');
      }
      if (ind.file) {
        links.push('<a class="ind-link ind-link--quiet" href="' + esc(ind.file) +
                   '" download>Download source</a>');
      }
      if (!links.length) {
        links.push('<span class="ind-link ind-link--pending">Link pending</span>');
      }

      return '' +
        '<li class="ind-card">' +
          '<div class="ind-card-top">' +
            '<h3 class="ind-name">' + esc(ind.name) + "</h3>" +
            (ind.alerts ? '<span class="ind-alerts">alerts</span>' : "") +
          "</div>" +
          '<p class="ind-blurb">' + esc(ind.blurb) + "</p>" +
          '<div class="ind-links">' + links.join("") + "</div>" +
        "</li>";
    }).join("");

    mount.innerHTML =
      '<h2 class="ind-heading">Indicators for this setup</h2>' +
      '<p class="ind-note">Add these to a TradingView chart to mark the ' +
      'levels this page describes. They draw and alert on the setup \u2014 ' +
      'they do not place trades.</p>' +
      '<ul class="ind-list">' + cards + "</ul>";
  }

  function renderCounts() {
    var sessions = live.reduce(function (set, s) {
      set[s.session] = 1;
      return set;
    }, {});
    var stages = live.reduce(function (n, s) { return n + (s.stages || 0); }, 0);
    var inds   = live.reduce(function (n, s) { return n + indicatorsFor(s).length; }, 0);

    var values = {
      setups:     live.length,
      sessions:   Object.keys(sessions).length,
      stages:     stages,
      indicators: inds
    };

    Object.keys(values).forEach(function (key) {
      var el = document.querySelector('[data-count="' + key + '"]');
      if (el) el.textContent = values[key];
    });
  }

  function boot() {
    renderNav();
    renderDirectory();
    renderIndicators();
    renderCounts();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
