"""
Plain definitions and FAQs, one entry per page. _docs/add-faq.py writes
them into the page (a "What is" block under the header, a Questions
section before Related setups) plus FAQPage JSON-LD. Text is plain;
keep each answer to facts the page itself states.
"""

FAQ = {
"/setups/hitchhiker-scalp.html": {
 "q": "What is the Hitchhiker Scalp?",
 "a": "The Hitchhiker Scalp is an intraday momentum scalp adapted from SMB Capital. After a stock in play makes an outsized move on strong volume, you wait for the first pullback to the 9 EMA on the 2-minute chart, enter as the pullback slows, stop out on a 2-minute close past the 21 EMA, take 70% into momentum and trail the last 30%.",
 "faq": [
  ("What time frame does the Hitchhiker Scalp use?", "The 2-minute chart. The 9 EMA marks the entry area and a 2-minute close past the 21 EMA is the stop."),
  ("Why not just buy the breakout?", "After an outsized move the stock is stretched from its short-term moving averages. A stop wide enough to survive the pullback makes a scalp not worth taking, so you wait for the first pullback to the 9 EMA on lighter volume instead."),
  ("How do you take profits on the Hitchhiker Scalp?", "Sell about 70% into momentum, roughly 5% at a time, and trail the last 30% on the prior 2-minute bar."),
  ("Does the Hitchhiker Scalp work?", "In our test it was break-even: the indicator took 16,136 trades on the 2-minute chart across 10 large-cap stocks plus SPY and QQQ from Nov 2021 to Nov 2026, with a 46% win rate, a 1.01 profit factor and +0.006R per trade. First-hour entries after a strong-volume move did best, at +0.03R per trade. The test couldn't pick stocks in play the way the setup asks."),
 ],
},
"/setups/technical-catalyst-breakout.html": {
 "q": "What is a technical catalyst breakout?",
 "a": "A technical catalyst breakout is a breakout with no news behind it, where the level itself is the catalyst. From an SMB Capital video, the stock or ETF clears a 9 or 10 out of 10 higher-timeframe level it couldn't break for weeks, on elevated relative volume, with a volume spike on the breakout bar and buyers paying the offer.",
 "faq": [
  ("What makes a level 9 out of 10?", "A multi-week or multi-month ceiling on the daily chart that kept turning price away. A 6 or 7 inside a sloppy range is a pass, and a random intraday line isn't a level at all."),
  ("How much relative volume does a technical breakout need?", "It has to be elevated going in. In the ETHA example full-day relative volume was over two times normal. A monthly ceiling attempted on normal or half volume is a red flag and no trade."),
  ("Where does the stop go on a technical catalyst breakout?", "Under the breakout candle, and never right on a round number. Give it a penny more, 9, 14 or 24 cents instead of 10, 20 or 25, to stay out of random liquidity sweeps."),
  ("When do you exit?", "On one of three defined signals: a break of the prior 2-minute bar low, a breakdown of a clean consolidation, or a clear shift on the tape. If it never gets going, scratch it at break-even or a two-cent loss."),
 ],
},
"/setups/nine-ema-continuation.html": {
 "q": "What is a 9 EMA continuation trade?",
 "a": "A 9 EMA continuation is a pullback entry after a breakout on real volume. Instead of chasing the spike, you wait for price to come back to the 9-period EMA, watch whether buyers step back in, and enter when price reclaims the line with strength, with a stop below the pullback low.",
 "faq": [
  ("Do you buy the first touch of the 9 EMA?", "No. The touch only tells you where to watch. The trigger is buyers stepping back in and price reclaiming the 9 EMA. A mechanical version buys the first candle that closes back above the 9 EMA after the first touch."),
  ("Where is the stop on a 9 EMA pullback?", "Below the low of the candle, or of the pullback, that tested the 9 EMA, not an arbitrary distance from the entry."),
  ("What if the stock never pulls back to the 9 EMA?", "About two times in ten it never gives you the touch. That's a normal miss rate, not a reason to chase. Let it go and wait for the next one."),
  ("Does the 9 EMA continuation work?", "Our test with the page's indicator rules lost a little: 7,094 trades on 5-minute bars across 10 large-cap stocks, Nov 2021 to Nov 2026, with a 33% win rate, a 0.93 profit factor and -0.03R per trade. Three of the 10 stocks were positive."),
 ],
},
"/setups/fashionably-late.html": {
 "q": "What is the Fashionably Late trade?",
 "a": "Fashionably Late is a momentum scalp built on two studies, the 9 EMA and VWAP. You let the stock put in its low, wait for price to work back toward VWAP, and enter the moment the 9 EMA crosses VWAP, with a stop a third of the way back to the low and a target one full low-to-cross distance above.",
 "faq": [
  ("What time of day does Fashionably Late work?", "Two windows: 10:00 to 10:45 in the morning and 10:46 to 1:30 midday. Outside them the same cross under-performs, so skip it."),
  ("Where are the stop and target?", "Measure from the low of day to the cross. The stop goes a third of that distance back toward the low and the target one full distance above the entry, which makes it 3 to 1."),
  ("Can you trade Fashionably Late short?", "Yes. It's the same trade in reverse: the 9 EMA crossing down through VWAP, with the stop and target mirrored."),
  ("Does Fashionably Late work?", "Not after costs in our test. On SPY 5-minute bars it made about +0.06R a trade before costs and -0.18R after 1 bp a side, over 848 trades, and other timeframes and single stocks were flat."),
 ],
},
"/setups/liquidity-refill.html": {
 "q": "What is a liquidity refill setup?",
 "a": "A liquidity refill is a two-candle pattern from a quant trader's order book research. After a relatively big candle (C1) out of compression, the next candle (C2) dips early and shallow, in the top 10 to 20% of C1, and gets absorbed fast. You buy when C2 breaks C1's high, stop past the wick, and exit after three or four candles.",
 "faq": [
  ("What does liquidity refill mean?", "It's the rate at which new limit orders are added back as old ones get taken. When buyers take liquidity faster than sellers can refill it, price has only one way to go."),
  ("How early does the C2 wick have to come?", "On a 1-minute chart, in the first 10 to 15 seconds of C2. On a 5-minute chart roughly the first minute, on a 15-minute chart the first couple of minutes, and on a daily chart the first few hours."),
  ("When should you skip a liquidity refill?", "In chop with same-size big candles, when the wick comes late in C2, when it goes past C1's 50% level, or when C2 never breaks C1's high. A break on C3 doesn't count."),
  ("Has the liquidity refill been backtested?", "Not fairly. On 5-minute bars it made +0.83R a trade over 73 trades, but bars can't show whether the wick came first. On 1-minute bars only 10 trades clearly did, so a real test needs tick or second-by-second data."),
 ],
},
"/four-pillars.html": {
 "q": "What are the four pillars of trading?",
 "a": "The four pillars are a simple framework you can repeat on every trade: levels, the prices the market keeps reacting to; context, the trend and the bigger picture around a level; position sizing, the same small risk on every trade; and discipline, following the plan you wrote while calm instead of chasing.",
 "faq": [
  ("Why use fewer indicators?", "Past a certain point more inputs just mean more conflicting signals, and conflict means hesitation at the moment you need clarity. A level the market has proven it respects, plus the context around it, carries most of what the indicators try to say."),
  ("What makes a level worth trading?", "How many times price actually reacted there, across different conditions. A line drawn once and touched once doesn't count, and neither does how clean it looks."),
  ("How should you size a trade?", "Risk a small, fixed percentage of the account on every trade, one you could repeat a hundred times in a row, and fit the position to that risk rather than to how good the setup feels."),
  ("Why is discipline a pillar?", "Most blown-up accounts are a discipline problem, not a strategy problem: chasing a missed entry, widening risk mid-trade, or sizing up to win back a loss. The simplest framework is useless if you can't follow it under pressure."),
 ],
},
"/setups/qqe-mod.html": {
 "q": "What is the QQE Mod + EMA 50 strategy?",
 "a": "It's an indicator setup on a 5-minute gold chart. The EMA 50 picks the side: above it you only buy, below it you only sell. You trade the QQE Mod histogram's color change (red to blue for a buy) on a strong closed candle, enter at the next open, stop beyond the last swing, and take a 2R target only if the next level leaves room.",
 "faq": [
  ("What QQE Mod settings does it use?", "Mihkel00's QQE Mod with RSI length 8 and RSI smoothing 5, everything else at default, plus a 50-period EMA."),
  ("What do the QQE Mod colors mean?", "Blue means both of the indicator's RSI calculations agree on bullish momentum, red means they agree on bearish momentum, and gray or nothing means they don't agree or the RSI is near 50."),
  ("When should you skip a QQE Mod signal?", "When price is chopping across the EMA 50, when the stop beyond the last swing is too big for your risk limit, or when the next support or resistance sits between the entry and the 2R target."),
  ("Does the QQE Mod strategy work?", "In our test it came out just under break-even: 256 trades on 5-minute bars across 10 large-cap stocks, Aug to Nov 2026, with a 48% win rate, a 0.97 profit factor and -0.01R per trade. That was on stocks, not the 5-minute gold chart from the video."),
 ],
},
"/stacked-imbalances.html": {
 "q": "What is a stacked imbalance?",
 "a": "A stacked imbalance is three or more prices in a row on a footprint chart where one side traded about four times harder than the other. Because markets have memory, price often reacts when it returns to that zone, which makes it a place to get long (a buying stack) or short (a selling stack) with a small stop.",
 "faq": [
  ("What ratio counts as an imbalance?", "About 4 to 1 is the closest thing to a standard. Some traders use 3, 5 or 6 to 1. Pick one and stick with it so your levels mean the same thing every day."),
  ("Diagonal or horizontal imbalances?", "Most footprint software compares the bid at one price with the offer one tick up (diagonal). Some traders compare bid and ask at the same price (horizontal). Both look for one side hitting far harder than the other; pick one and stay with it."),
  ("Why does it matter where the stack sits in the candle?", "A stack mid-body is a level to mark for later support or resistance. Buy imbalances at the top of a red candle followed by a move down mean those buyers are trapped, and trapped-trader stacks in the wicks are the ones Futures Flow trades most."),
  ("What does a stacked imbalance trade look like?", "In the payroll example a buying stack formed around 3,973 to 3,974. Price came back to 3,974, held for four bars with a stop at 3,973, then rallied to 3,994. The trader himself says that is the best case, not the usual one."),
 ],
},
"/thesis-to-trade.html": {
 "q": "What is the thesis to trade method?",
 "a": "It's Vincent Desiano's daily process from his live stream. Build levels only on the weekly, daily, 4-hour and hourly charts and group nearby lows into zones, write an if-then game plan for each zone, read whether price holds, fails or traps there, enter on the break and retest after confirmation, and manage the trade with intraday structure.",
 "faq": [
  ("How wide should a zone be?", "About 20 to 30 points on the S&P and about 100 on the Nasdaq. A 200-point demand zone isn't a zone."),
  ("Why only higher time frames for levels?", "An intraday trade should come off a major inflection point, not a little pivot from yesterday, so levels come from the weekly, daily, 4-hour and hourly charts and nothing lower."),
  ("What is a break and retest entry?", "Price reaches a zone, holds it with higher lows and buyers stepping up, and only then do you enter, with the stop under the level. In the stream's S&P example the 7,469 to 7,490 zone held and the long ran almost 100 points."),
  ("When do you exit?", "When the intraday structure breaks, using the EMA cloud in trending markets. On a short, price holding back above a previous low means the structure is gone and so is the trade."),
 ],
},
"/setups/qullamaggie.html": {
 "q": "What is the Qullamaggie breakout setup?",
 "a": "It's Kristjan Kullamägi's momentum swing trade. Find the top 1 to 2% of stocks by recent gains, wait for a tight base on the 10 and 20-day averages, buy the opening range high on breakout day with the stop at the low of the day, sell a third to a half after three to five days, and trail the rest on the 10 or 20-day.",
 "faq": [
  ("How much does Qullamaggie risk per trade?", "About 0.5% of the account, and never more than 1%. Skip the trade if the low of the day is further from the entry than the stock's average daily range."),
  ("What makes a good base?", "Two weeks to two months of sideways action after a big move, with higher lows, tighter ranges, drying volume, and price riding on top of the 10 and 20-day averages."),
  ("When do you sell the rest of the position?", "On the first daily close below the trailing average: the 10-day for faster, more extended stocks and the 20-day for slower ones. There are no price targets."),
  ("Does the Qullamaggie breakout work?", "It was one of two setups on this site (with Day Three Breakout) that clearly beat random entries in our tests: 158 trades with a 5-minute opening range entry averaged +0.63R against -0.21R for random entries with the same exits, though only 35% of trades won."),
 ],
},
"/setups/pmh-break.html": {
 "q": "What is a premarket high break?",
 "a": "A premarket high (PMH) break is an opening-drive trade on the 2-minute chart. When a stock with a real catalyst opens above yesterday's high and the prior close, you buy the close of the first 2-minute candle that closes above the premarket high on heavy volume, with the stop under that candle's low.",
 "faq": [
  ("What has to be true before the open?", "The market's daily chart above its 10 and 20 SMA, the sector moving at least as hard as the market, a real catalyst with heavy premarket volume, and no obvious resistance for 3 to 5%."),
  ("What is the 9:30 gate?", "The opening print must be above both yesterday's high and the prior close. If it opens below yesterday's high, there's no opening drive trade, however good the news is."),
  ("What does the breakout candle need?", "A real green body that closes above the premarket high, an upper wick no bigger than half the body, and relative volume above 3. A wick through the level without a close doesn't count."),
  ("Does the premarket high break work?", "Not in our test: 188 trades on 2-minute bars across SPY, QQQ and 10 large-cap stocks from Nov 2021 to Nov 2026 had a 37% win rate, a 0.94 profit factor and -0.03R per trade."),
 ],
},
"/setups/opening-range-break.html": {
 "q": "What is an opening range breakout?",
 "a": "An opening range breakout (ORB) uses the high and low of the first 15 or 30 minutes of trading. Once that range has fully formed, you enter when price breaks it on real volume with the higher time frame agreeing, put the stop a few cents past the breakout bar, and take profits in layers, often at 1 and 2 ATR.",
 "faq": [
  ("15 or 30-minute opening range?", "Either works. Pick one window, stay consistent with it, and don't take the break before that window has finished."),
  ("Where does the stop go on an opening range breakout?", "A few cents beyond the high or low of the actual breakout bar, not an arbitrary distance from the range. If price comes back through that bar, the thing that triggered the trade has failed."),
  ("What does the higher time frame add?", "The best breaks agree with something bigger: a key level lost or reclaimed, a fresh catalyst, clear relative strength, or a first red day after a big run."),
  ("Does the opening range breakout work?", "Our first look lost money: 249 trades on 5-minute bars across 10 large-cap stocks, Aug to Nov 2026, had a 36% win rate, a 0.76 profit factor and -0.15R per trade. The higher-time-frame filter couldn't be coded, and the sample is short."),
 ],
},
"/setups/anchored-vwap.html": {
 "q": "What is an anchored VWAP?",
 "a": "An anchored VWAP is a volume-weighted average price that starts at an event you choose, such as an earnings release, instead of the start of the day. It shows the average price everyone has paid since the news, so price above it means buyers have been in control since then and price below it means sellers have.",
 "faq": [
  ("Where do you anchor the VWAP for earnings?", "On the candle where the news hit. A 15-minute chart with extended hours shows the after-hours reaction. For a strong stock in an uptrend, set the source to the low of each bar."),
  ("How much after-hours volume do you want?", "At least 20% of the stock's average daily volume in the after-hours session, and 50 to 70% is better."),
  ("What is the anchored VWAP entry?", "On day one or day two, the stock dips off the open toward the anchored VWAP and reclaims. Buy the strength after the dip, not the dip itself."),
  ("When do you sell?", "Cut at least half on a daily close below the anchored VWAP. An intraday dip under it isn't enough."),
  ("Does the anchored VWAP earnings setup work?", "Not in our test. Over 22,554 earnings trades on every liquid US stock (2,055 of them) from 2021 to 2026, the indicator's rules lost 0.18R a trade with a 28% win rate, and 0.38R at the 20% after-hours minimum. The same rules on random days lost 0.77R, so the earnings anchor helps, but the tight stop under the line gets hit on the entry day too often."),
 ],
},
"/setups/silver-bullet.html": {
 "q": "What is the ICT Silver Bullet?",
 "a": "The Silver Bullet is an ICT intraday model traded in three one-hour New York windows: 3 to 4 am, 10 to 11 am and 2 to 3 pm. Price sweeps an untouched level, a strong displacement candle leaves a fair value gap, and you place a limit at the gap's near edge, stop a tick past the sweep, and target the next untouched level.",
 "faq": [
  ("What counts as a sweep?", "A candle trading at least one tick through an untouched level such as a swing high or low, a session range, or the previous day's high or low. A wick is enough; an exact touch isn't."),
  ("What makes a valid fair value gap here?", "Three candles where the first and third don't overlap, a middle candle body of at least 1 ATR(14), a gap of at least 0.1 ATR, all inside the window and after the sweep."),
  ("What is the Silver Bullet target?", "The nearest untouched level on the other side. If it's closer than 1.5 times the risk the setup is skipped, and with no level at all the target is 2R."),
  ("Does the Silver Bullet work?", "Not in the study this page is built on. Over 16 years on four futures markets it lost money after costs in all 92 hour and market tests, and about 1 in 4 trades won."),
 ],
},
"/setups/ict-made-simple.html": {
 "q": "What is ICT trading, made simple?",
 "a": "ICT trading, as Trader Mayne strips it down, is a price action framework in six pieces: the trend, market structure breaks, the range and its 0.5 premium and discount, three points of interest (order blocks, breakers, fair value gaps), and the draw on liquidity. You map it on a high time frame and enter on a low time frame breaker.",
 "faq": [
  ("What is a market structure break?", "A candle body closing through the last swing high in an uptrend (or swing low in a downtrend). A wick doesn't count. A market structure shift is price breaking the last higher low instead, a sign the trend may be turning."),
  ("What are premium and discount?", "Draw a Fibonacci from the significant low to the significant high of the current leg. Above the 0.5 is premium, where you sell; below it is discount, where you buy. 0.618 to 0.786 is the optimal trade entry."),
  ("What are the three points of interest?", "An order block (the move before the move that broke structure), a breaker (an order block that failed and flipped), and a fair value gap (three candles where price only went one way)."),
  ("How do you enter with two time frames?", "When price reaches the high time frame point of interest, zoom in and wait for the low time frame to flip back in line. Enter on its breaker, stop under the turn, and target external range liquidity."),
 ],
},
"/setups/gap-give-and-go.html": {
 "q": "What is the Gap Give and Go?",
 "a": "The Gap Give and Go is an opening gap trade from an SMB Capital playbook review. A stock gaps up on fresh news, then drops fast on light volume into a key level (the give). Wait for a quiet range, then buy the turn (the go) when the tape flips, with a stop under the low of day.",
 "faq": [
  ("What are the three checks before a Gap Give and Go trade?", "A stock in play with a very strong (or very weak) fresh catalyst (the video's trade graded its news an 8 out of 10), a real key level such as a daily breakout or a big round number, and relative volume well above normal."),
  ("Why not buy the give?", "A give can keep on giving, and you don't know where it ends until it has. Waiting for the go means you give up the low but only own the days that actually turn."),
  ("How big a gap is too big?", "About 10% is significant for an 8 out of 10 catalyst and about 20% is a reasonable ceiling. Past 30%, only a 9 to 10 out of 10 catalyst, news that changes the company, can carry it."),
  ("What are the targets?", "Back through the open, the premarket high and the high of day, then a measured move of about half the relative volume times the daily ATR. Sell into extensions and hold the rest until the trend ends."),
 ],
},
"/setups/the-strat.html": {
 "q": "What is The Strat?",
 "a": "The Strat is a way of reading price that numbers every bar 1, 2 or 3. A 1 stays inside the last bar, a 2 takes out one side and a 3 takes out both. You use the broadening formation as a map, check whether price is above or below the quarter, month, week and day opens, and trade only when a whole group of related assets breaks the same level at the same time.",
 "faq": [
  ("What do 1, 2 and 3 mean in The Strat?", "A 1 is an inside bar that stays inside the last bar's range. A 2 takes out the high (2 up) or the low (2 down). A 3 is an outside bar that takes out both. The break decides the number, not the candle's color."),
  ("What is time frame continuity?", "Checking last price against the opens of four time frames. Above all four, the buyers in every group are more aggressive; below all four, the sellers are. The bigger the time frame, the bigger the money."),
  ("What is a simultaneous break?", "Two or more correlated assets, like the major indexes, sector ETFs, or a sector and its holdings, breaking a 2 in the same direction at the same time. Only an institution is big enough to do that, so it is the evidence the page waits for."),
  ("Where does the stop go?", "At worst, just past the current bar's other extreme, for a weekly short just above this week's high. A lower time frame inside bar lets you tighten it."),
 ],
},
"/setups/fib-ote.html": {
 "q": "What is the Fibonacci OTE?",
 "a": "The Fibonacci Optimal Trade Entry (OTE) is a pullback entry from ICT and the smart money crowd. You draw the Fibonacci retracement on the latest impulse of a clean trend and put a limit order at 0.702, the middle of the 0.618 to 0.786 zone, with the stop past the swing that started the impulse and half off near the old high.",
 "faq": [
  ("What is the OTE zone?", "The part of the retracement between 0.618 and 0.786, where price is cheapest for a buyer (discount) or dearest for a seller (premium). This page uses the classic levels; ICT's original is 0.62 to 0.79 with 0.705 in the middle."),
  ("Which way do you draw the Fibonacci on the impulse?", "For a long, 1 on the swing low and 0 on the swing high; for a short, the other way round. If price keeps going, move the 0 with it. A pullback that doesn't reach 0.382 is noise."),
  ("What if price never reaches 0.618?", "The limit order never fills and there's no trade. Missed fills are part of the plan: wait for the next impulse."),
  ("Does the Fibonacci OTE work?", "Not better than chance in our test. Run with the indicator's own rules on the 1-hour chart, the 0.702 limit made +0.02R a trade over 892 trades with a 34% win rate, about the same as random entries on the same impulse with the same stop and targets (−0.01R)."),
 ],
},
"/setups/micro-range.html": {
 "q": "What is a micro range?",
 "a": "A micro range is the small range price builds after it breaks out of a bigger one, from an institutional trader's breakout filter for ES and NQ. A burst out of a range is only price, not value. When price goes sideways beyond the old value, business is being done up there, and that range after the range is what you trade.",
 "faq": [
  ("What is one time framing?", "On the weekly and daily, a higher high, a higher low and a higher close than the last bar (up), or the mirror (down). It means one side controls the auction. Anything else is balance."),
  ("Why skip the first breakout?", "A spike out of the range with no value built beyond it is price, not value. The market is in balance about 70% of the time, and those first breakouts usually fail."),
  ("What are plan A and plan B?", "Plan A buys an absorbed flush under the micro range low as price reclaims it. Plan B buys aggressive buying through the micro range high. One risk budget is split between the two, not added to."),
  ("What do you do when the market is in balance?", "Don't trade momentum. Fade failed auctions at the value area edges, with the point of control as the first target and the other side of value next."),
 ],
},
"/setups/look-above-and-fail.html": {
 "q": "What is a look above and fail?",
 "a": "A look above and fail is a value area fade for balanced days on NQ and ES. Let the day's volume profile build for 30 minutes, mark the value area high and low, and wait. When aggressive buyers push over the high (or sellers under the low) and price comes right back inside, they're trapped. You trade the reclaim to the point of control, then the other side of value.",
 "faq": [
  ("Why wait 30 minutes?", "A fresh profile's edges shift a lot early on. Before 10:00, use the previous day's regular-hours value area high and low instead."),
  ("Where does the stop go?", "Just past the big trades that made the push. If those traders get back to profit, the idea is likely wrong. Every trade is planned for at least 2R."),
  ("When should you not trade it?", "On a trending day, within 5 to 10 minutes of scheduled news, after three stop-outs in the same range, or anywhere between the value area edges."),
  ("Does the look above and fail work?", "Not in our test. On 5-minute bars it looked profitable, but fake value area edges moved by a quarter of the range made as much. On 1-minute bars it lost on SPY and QQQ (-0.07R)."),
 ],
},
"/setups/ten-am-orb.html": {
 "q": "What is the 10 AM ORB?",
 "a": "The 10 AM ORB is an opening range breakout for ES and NQ futures that waits for the clock. You set a bias from the larger time frame before the open, take no trades between 9:30 and 9:45 ET when fakeouts are most common, and mark the high, low and 50% of the first 15 minutes. The first break in the direction of your bias is confirmation, not the entry. Around 10:00, when the real direction for the day usually shows, you enter on the retest of the range edge or a higher low (lower high for shorts), with the stop past the reaction and the target at the next key level.",
 "faq": [
  ("Why not trade the first break of the opening range?", "Because 9:30 to 9:45 is when volume is highest and big money is filling orders, and the easiest fills come from trapping breakout traders. The first break is often faked out in both directions before the real move starts, usually around 10:00."),
  ("What is the 50% rule?", "When the opening range is very large, often from news, a break of its high or low comes too late. The halfway line of the range becomes the key level instead: in the direction of your bias, look for a reaction there and take a base hit back to the range edge."),
  ("Where does the stop go?", "Just past the reaction candle or the retest low (high for shorts), or outside the 15-minute range. The coach in the video risks about $250 to $350 a trade, aims for 1:2 or 1:3, and moves the stop to break-even once the trade works."),
  ("What happens at 11:00?", "The 1-hour candle prints at 11:00, and price often shakes out against the trend into it before the trend resumes. If nothing broke out of the range between 10:00 and 10:30, treat it as a range day and wait for the next hourly candle."),
  ("When should you not trade it?", "Before 9:45, without a bias or against it, on level 3 news and FOMC days, and after the move has already run from the range."),
 ],
},
"/setups/gamma-wall-footprint.html": {
 "q": "What is the Gamma Wall Footprint?",
 "a": "The Gamma Wall Footprint is a set of three NQ futures day trades at the levels from a GEX (gamma exposure) map: the put wall, the call wall and zero gamma. The wall tells you where, not when. A slow drift into a wall means look for the reaction right at it; a fast push means let it overshoot and enter on the reclaim. The footprint chart confirms the entry with absorption, stacked imbalances, a delta flip or trapped traders. The third setup goes with the move when price breaks below zero gamma and holds.",
 "faq": [
  ("What are the call wall, put wall and zero gamma?", "The call wall is the strike with the most positive gamma, where dealers tend to sell rallies. The put wall is the strike with the most negative gamma, where dealers tend to buy dips. Zero gamma is the border: above it dealer hedging absorbs moves, below it the hedging adds fuel and moves stretch."),
  ("Why not just buy or sell at the wall?", "Because the wall tells you where, not when. Price can run straight through it, especially on a fast approach. You wait for the footprint to show someone defending the level, or for a fast move to overshoot and come back (the reclaim)."),
  ("Where does the stop go?", "Where the wall idea is proven wrong: past the failed low or the overshoot high, often 30 to 50 ticks on NQ. The target is the next level. Entering close to the level is what makes the reward big: in the video's first example, entering at the wall was about 8.5R to the next level; the video shows the same trade chased late at 0.5R."),
  ("When should you not trade the levels?", "On a single big options print without context, when a wall has broken and price accepted beyond it, on OPEX, triple witching and VIX expiration days when the levels move, and right after a loss if the next trade isn't from the plan."),
  ("Does the gamma wall footprint work?", "Not in our test. On a year of NQ with real gamma walls and real footprints, the full entry recipe gave only one wall trade. With any one footprint sign as the trigger, 70 trades won 17% of the time and lost 0.40R a trade on average, worse than random entries with the same stops and targets (-0.16R) and worse than the same rules on fake levels."),
 ],
},
"/setups/heatmap-scalp.html": {
 "q": "What is the Heatmap Scalp?",
 "a": "The Heatmap Scalp is an order flow day trade on NQ and ES futures from a funded trader's live session. Market structure and VWAP set the side: higher lows above VWAP means longs only. A liquidity heatmap such as Bookmap times the entry: on a pullback, the other side's big market orders stop moving price and the resting liquidity holds, so you get in on the bid. The stop is a fixed dollar amount, you add on pullbacks while in profit, and you exit just before a big wall of liquidity.",
 "faq": [
  ("What does a liquidity heatmap show?", "Resting limit orders as bright horizontal bars (brighter means more contracts at that price) and filled market orders as bubbles, green for buyers and red for sellers. It shows where the size is and whether it's being taken or pulled."),
  ("When do you get out early?", "When big orders stack against the trade: large red bubbles on a long and the bid liquidity under you keeps getting taken. In the video that cut the first loss to about half the planned risk."),
  ("When do you add to the trade?", "Only on a pullback while you're already in profit and the trend still holds, not on a breakout. The stop for both goes under VWAP, then to just above the first entry once the local high breaks."),
  ("How many trades a day?", "Three at most for a day trader. A fourth is usually a re-entry for the adrenaline, and after a green morning he only risks what keeps the day green."),
 ],
},
"/setups/ready-aim-fire.html": {
 "q": "What is the Ready, Aim, Fire setup?",
 "a": "Ready, Aim, Fire is an auction market theory and order flow day trade for NQ and ES futures. Ready: read the higher time frame as trend or balance. Aim: wait for price to reach a level from yesterday's profile, the overnight session or a composite. Fire: enter only when order flow shows one side putting in effort and not getting paid for it. The stop goes past the fight and the target is the next level, at 1:1 or better.",
 "faq": [
  ("Which levels does Ready, Aim, Fire use?", "Yesterday's value area high, point of control and value area low, the prior day high and low, the overnight high and low, today's session VWAP, composite high volume nodes, and big GEX walls as secondary levels."),
  ("What is effort without reward?", "On a 5-minute chart, one side pushes through a level with size and volume piles up there, but price goes nowhere and comes back. That failed push is the trigger. No trigger, no trade."),
  ("Where does the stop go?", "Past the high the sellers defended (or the low the buyers defended for a long), with room for a wick or one more test. About 50 ticks on NQ is a starting point, wider in fast markets."),
  ("What reward does the trade need?", "At least 1:1 to the next or second level. If you can't find it, there's no trade. Once in, don't move the stop, jump to break even or add."),
 ],
},
"/setups/knock-twice.html": {
 "q": "What is the Knock Twice setup?",
 "a": "Knock Twice is a break of structure trade on the 5-minute chart. After price breaks an old swing high and makes a new high, it comes back, touches the old high once and closes back above it. That's the knock. You enter on that close with the stop a tick under the knock candle, and a close above the new high confirms it.",
 "faq": [
  ("Why not buy the first break?", "Plenty of first breaks close straight back under the level. Waiting for price to go away and come back to hold the old high from above is what separates a real break from a stop run."),
  ("What are the four filters?", "At least 5 bars clear of the old high after the break, a leg of 0.6 to 3 times the 14-bar ATR, a close back on the right side of the level, and new breaks only between 9:35 and 3:30."),
  ("What is the target?", "T2 is the new high plus the leg from the old high to the new one, a measured move. With the stop this close, it is usually several times the risk."),
  ("What cancels a Knock Twice trade?", "A close more than 4 ticks back through the old level, no close above the new high within 24 bars of the knock, or a fresh break the other way."),
 ],
},
"/setups/day-three-breakout.html": {
 "q": "What is a day three breakout?",
 "a": "A day three breakout is a long-biased momentum trade over three days. A real catalyst drives a big move on day one, day two is a tight, low-volume inside day, and the entry is the break of the day-two high on day three, often right off the open.",
 "faq": [
  ("What should day two look like?", "A quiet, low-volume day that stays inside day one's range. A wide, heavy-volume day two is distribution, not accumulation."),
  ("Where does the stop go?", "Either a few cents below the 5-minute bar that broke the day-two high, or low of day for a wider version. Pick one before the entry and stay with it."),
  ("How do you take profits?", "Sell a third or a quarter at a time into blow-off volume, whole-dollar levels and higher time frame resistance. Ride the rest above the 9 EMA on the 2-minute chart and take another piece on its first close below; cut the last piece on the first close below the 9 EMA on the 5-minute chart."),
  ("What if you miss the break at the open?", "Don't chase an extended move. Wait for a pullback toward VWAP or the day-two high that holds, and get long against low of day."),
  ("Does the day three breakout work?", "In our test, yes. On 445 liquid day threes from 2021 to 2026, the indicator's rules made +0.50R a trade with a 40% win rate, positive before and after June 2024, while random entries on the same days with the same exits made about +0.10R. Most trades lose; a few big runners carry the result."),
 ],
},
"/setups/cup-and-handle.html": {
 "q": "What is a cup and handle?",
 "a": "A cup and handle is a swing continuation pattern in an uptrend. Price forms a smooth, rounded base (the cup) and then a shallow, tightening pullback just below the old resistance (the handle). The trade is a stop order above the cup's resistance and the handle's high, taken only when price actually breaks it on expanding volume.",
 "faq": [
  ("What trend does a cup and handle need?", "Price above its 20, 50 and 200-period simple moving averages, with the 50 sloping up. The rising 50 is often where the base of the cup forms."),
  ("What should volume do?", "Heavy early in the cup, tapering into the base, ticking back up as price recovers, fading again in the handle, then expanding on the breakout."),
  ("Where does the stop go?", "1.5 times the ATR, the \"baby bear\" stop: tighter than a 2.0 times position-trading stop and looser than a 1.2 times tight trailing stop. The video sets it as a trailing stop, so by the first target it sits above the entry."),
  ("Does the cup and handle work?", "Not better than chance in our test. Across every liquid US stock over five years it made +0.16R a trade over 226 trades with a 39% win rate, but random uptrend stocks bought on the same days with the same stop and targets made about the same."),
 ],
},
"/setups/vwap-reversal.html": {
 "q": "What is a VWAP reversal?",
 "a": "A VWAP reversal is a fade that stacks three signals at one price: a touch of the second VWAP band, an old horizontal level from the higher time frame, and a failure test that prints a reversal candle. You enter at that candle's close, with the stop just past the pattern's extreme and about 2:1 reward to risk.",
 "faq": [
  ("What settings does the VWAP need?", "The built-in VWAP with a second bands multiplier turned on, calculated by standard deviation, so there is an outer band and not just the median line."),
  ("What is a failure test?", "Price briefly pushes through the level and then falls straight back. It traps breakout buyers, and their stops just beyond the level add fuel to the reversal."),
  ("Which candle confirms it?", "A shooting star at resistance or a hammer at support. Enter at its close, not while it is still printing."),
  ("Does the VWAP reversal work?", "Not in our test: 11,090 trades on 5-minute bars came out just under break-even, with a 39% win rate, a 0.98 profit factor and -0.01R per trade."),
 ],
},
"/setups/energy-in-the-tank.html": {
 "q": "What is the Energy in the Tank setup?",
 "a": "Energy in the Tank is a volatility cycle breakout on the daily chart or higher. A squeeze on the higher time frame means volatility is compressed and energy is stored. You buy the close above the range top on an outlier volume bar, more than two standard deviations above average, and invalidate on a close back below the level.",
 "faq": [
  ("What counts as a squeeze?", "Two standard deviations of closing prices over 20 bars falling below roughly 1.5 times the ATR, one time frame up from the one you trade: weekly for a daily breakout, monthly for a multi-quarter position."),
  ("Why does the breakout need outlier volume?", "Compressed volatility is the stored energy and heavy volume on the break is the fuel. A breakout on thin volume is a poke, not a launch."),
  ("When do you take profits?", "When the same volatility measure swings to its expansion extreme, 6 times the ATR, the presenter's expansion line. Most of the stored energy is spent, so he prepares for mean reversion; trimming there is our reading."),
  ("Does Energy in the Tank work?", "No. Run on every US stock from 2022 to 2026 with this page's indicator, it lost 2.2% a trade over 21,401 trades with a 15% win rate, and random entries on the same stocks with the same exits made +1.5%. An earlier profit on 13 large caps came from stocks picked with hindsight."),
 ],
},
"/setups/market-memory.html": {
 "q": "What is the market memory day two model?",
 "a": "Market memory is a day two playbook on the 5-minute chart. On a stock that made a big move yesterday, you draw a box from yesterday's high and low plus one or two levels where price fought hard. When price returns to an edge, you wait for a John Wick candle, a sharp wick through the level that closes back inside, and trade toward the other side of the box.",
 "faq": [
  ("What is a John Wick candle?", "A sharp wick through a remembered level followed by a distinct close back on the other side: a wick above resistance that closes red, or a wick below support that closes green."),
  ("What are the two costly mistakes?", "Buying when price runs quickly into or just above yesterday's high without holding there, and selling when it runs quickly into or below yesterday's low without holding there."),
  ("Where do the stop and target go?", "Enter on the break of the John Wick candle, stop on its far side, and target the other side of the box. Move the stop to break even once price clears the level with a real hold."),
  ("Does market memory work?", "Not in our test: 8,236 trades on 5-minute bars won 23% of the time, with a 0.87 profit factor and -0.10R per trade."),
 ],
},
"/setups/atr-band-hybrid.html": {
 "q": "What is the ATR Hybrid Scalp?",
 "a": "The ATR Hybrid Scalp is a 5-minute Micro Nasdaq futures (MNQ) system where longs and shorts are different strategies. Longs buy a touch of a band 3.1 times the ATR below the previous close, with a 2 ATR target and a 1.5 ATR stop. Shorts sell after a candle with a long upper wick and exit at the close of the next candle.",
 "faq": [
  ("Why is the band anchored to the previous close?", "A band that moves with live price can never be caught. Measuring from the last closed candle makes it a fixed level for the next 5 minutes."),
  ("What is the short signal?", "A candle with a long upper wick, a rejection off the highs. The presenter's test version needs an upper wick at least twice the body and a lower wick no more than about a tenth of the upper wick. Enter at the next candle's open and close at that candle's close, with no target or stop."),
  ("Why don't the shorts mirror the longs?", "Inverting the long model for shorts was tested in the source and didn't work. In the presenter's test, shorts did better after a red prior day, but on only about 60 trades."),
  ("Does the ATR Hybrid Scalp work?", "Not on our stand-in test: with the page's indicator rules on QQQ and SPY 5-minute bars, 2,108 trades had a 43% win rate, a 0.87 profit factor and -0.04R per trade. The longs were about break-even; the shorts lost. A test on MNQ futures could come out differently."),
 ],
},
"/setups/volume-profile-system.html": {
 "q": "What is the volume profile system?",
 "a": "The volume profile system reads the previous session's volume profile three ways. If it closed outside its value area, trade a bounce off the point of control. If it closed inside, trade a reversal back into the value area. A breakout that holds its pullback and breaks structure works either way. Every setup uses a fixed 2R target.",
 "faq": [
  ("What are the point of control and value area?", "The point of control is the single price with the most volume. The value area high and low bound the zone holding 70% of the volume traded."),
  ("Why use the previous session's profile?", "The current session's profile is still forming, so its levels keep moving. Yesterday's is finished and stable. The page uses a fixed range profile with row size 60 and a 70% value area."),
  ("What confirms the value area reversal?", "Price crosses outside the value area and then a full candle closes back inside. A wick alone doesn't count."),
  ("Does the volume profile system work?", "Not in our test: 14,779 trades across the three setups on 5-minute bars came out at break-even or worse, with a 38% win rate, a 0.98 profit factor and -0.01R per trade."),
 ],
},
"/setups/volume-sr-rejection.html": {
 "q": "What is a volume S/R rejection?",
 "a": "A volume S/R rejection trades support and resistance only where real volume changed hands. A 600-bar volume profile decides which swing highs and lows count as levels. You take the rejection when a bar touches the level, closes back on the right side, and the buy/sell volume balance flips your way.",
 "faq": [
  ("Which levels count?", "Swing highs and lows, five bars either side, with a heavy volume node close by. A swing with little volume nearby has nobody defending it."),
  ("Why does the point of control matter?", "When it sits on a level, two reads of volume agree on one price, making it the strongest zone on the chart: fade into it, or use it as a target."),
  ("What is the volume balance shift?", "The winning side holds at least 60% of the bar's volume and its share is up at least 15 points on the previous three bars."),
  ("Does the volume S/R rejection work?", "Not in our test of an approximation of the rules. Across 119,572 trades on 5-minute bars it won 62% of the time but lost 0.20R per trade, with a 0.78 profit factor, because the winners were small and the losers weren't."),
 ],
},
"/setups/gex-levels.html": {
 "q": "What are GEX levels?",
 "a": "GEX levels are prices where options dealers' hedging is concentrated, measured as gamma exposure at each strike. The call wall is the strike above price with the biggest call gamma and tends to act as resistance. The put wall is the strike below price with the biggest put gamma and tends to act as support. The gamma flip is where total gamma crosses zero, and it sets the regime: fade the walls above it, follow the break below it.",
 "faq": [
  ("How is gamma exposure calculated?", "For each strike: gamma times open interest times 100 times spot squared times 1%. Calls count positive and puts negative. The page uses expirations out to 30 days, priced at the 9:30 open."),
  ("What does the gamma flip tell you?", "Not direction, but how price moves. Above it dealers are long gamma, sell rips and buy dips, so moves get damped. Below it they hedge with the move, so moves stretch."),
  ("How long are GEX levels good for?", "One session. Pull them each morning before the open, rerun midday for 0DTE names like SPY and QQQ or after a big move, and never carry today's walls into tomorrow."),
  ("Do GEX levels work?", "Partly. In our test of 2,831 signals on 43 tickers, every wall signal did better at the real walls than at fake ones, so the levels carry information. Traded mechanically, they broke even at -0.02R per trade, with only six weeks of levels so far."),
 ],
},
"/setups/zero-lag-pullback.html": {
 "q": "What is a zero lag pullback?",
 "a": "A zero lag pullback is a trend pullback trade using a 50 and a 100-period zero-lag EMA. In an uptrend, you wait for a close between the two lines, then buy when a green candle closes back above the 50 on volume at or above average. The stop goes below the 100 and the target is 2R.",
 "faq": [
  ("What is a zero-lag EMA?", "An EMA that adds back the gap between an EMA and an EMA of that EMA, so it turns sooner than a plain EMA of the same length."),
  ("Why not trade the cross?", "The cross only says the trend may have turned. Deep pullbacks and ranges cross the lines too, so the entry waits for a pullback inside the new trend."),
  ("What cancels the setup?", "A close below the 100-period line, or the 50 crossing back under the 100. A reclaim of the 50 on below-average volume is skipped."),
  ("Does the zero lag pullback work?", "Not better than chance in our test. On SPY 5-minute bars, 446 trades made +0.01R a trade with a 35% win rate. On slower charts the long side made money, but random long entries in the same uptrend with the same stop and 2R target made as much."),
 ],
},
"/setups/three-candle-crt.html": {
 "q": "What is a three-candle CRT?",
 "a": "A three-candle CRT is a Candle Range Theory trigger. Candle 1 on the 1-hour, 30 or 15-minute chart marks a range. Candle 2 wicks beyond one side and closes back inside it, a sweep. You enter only if candle 3 breaks candle 2's high (long) or low (short), with the target at the opposing extreme and the stop set to make exactly 1.5R.",
 "faq": [
  ("What is the difference between a sweep and a breakout?", "A sweep wicks beyond candle 1's range and closes back inside it. A candle that closes beyond the range is a breakout, and the setup is void."),
  ("What if candle 3 doesn't break candle 2?", "The setup is dead. A fourth or later candle breaking the same level is too low-quality to take."),
  ("Direct break or rebreak?", "A direct break enters the instant candle 3 crosses the level: more trades, lower win rate. A rebreak waits for a break, a pullback and a second break, timed on the 1-minute chart: fewer trades, higher win rate."),
  ("Does the three-candle CRT work?", "Not in our test. On QQQ 15-minute it looked strong without TradingView's bar magnifier (+0.21R), but with it on, 537 trades had a 43% win rate and -0.09R per trade, and it was near zero on every timeframe."),
 ],
},
"/setups/macd-continuation-scalp.html": {
 "q": "What is a MACD continuation scalp?",
 "a": "A MACD continuation scalp uses a 3/9/5 MACD on the 1-minute chart. After 3 to 15 minutes of the MACD flat around zero, it expands away from zero, pulls back toward its signal line while staying on the same side of zero, and the cross back is the entry. The stop goes below the pullback low and you exit when the lines cross the other way.",
 "faq": [
  ("Why 3/9/5 instead of 12/26/9?", "The MACD line is the spread between a 3 and a 9-period moving average and the signal line is a 5-period average of it, faster than the default. The histogram isn't used."),
  ("Why must the lines stay on one side of zero?", "Staying above zero through the pullback (below for a short) keeps you trading with the trend already established. A cross that straddles zero isn't this trade."),
  ("When should you not take it?", "On a choppy ticker with no consolidation or context, or on a second cross of a move that already ran through the full sequence."),
  ("Does the MACD continuation scalp work?", "Not in our test: 286 trades on 5-minute bars won 27% of the time, with a 0.67 profit factor and -0.11R per trade, losing on 7 of 10 stocks. The page teaches it on 1-minute bars."),
 ],
},
"/relative-volume.html": {
 "q": "What is relative volume (RVOL)?",
 "a": "Relative volume (RVOL) is a stock's volume so far today divided by its normal volume by the same time of day. 1.0x is a normal day. If a stock usually trades 1 million shares by now and has traded 5 million, it's at 5x. It tells you whether participation is abnormal compared to the stock itself, which total volume alone can't.",
 "faq": [
  ("Why not just look at total volume?", "10 million shares isn't special for a stock that normally trades 50 million (0.2x), while 2 million is a massive change for one that normally trades 200,000 (10x). Most shares traded isn't the same as most unusual."),
  ("Why does RVOL make breakouts cleaner?", "On a high-RVOL name, many traders are watching the same premarket high, prior day high, VWAP and opening range, so the reaction at those levels is more predictable. It doesn't mean every breakout works."),
  ("What is cumulative RVOL?", "At every bar, today's volume so far compared with what's normal by that same time of day, using a 20-day and a 5-day baseline, rather than one number for the whole day."),
  ("Does an RVOL filter improve a setup?", "Not in our one test. Requiring RVOL of at least 1.0 on the Zero Lag Pullback made it worse (-0.18R against -0.02R), but on only 44 trades, and the test couldn't pick stocks in play the way RVOL is meant to."),
 ],
},
"/trailing-stops.html": {
 "q": "What is a trailing stop?",
 "a": "A trailing stop is an exit that moves with the trade as it goes your way. It doesn't give a trade its edge. It protects the edge you already have from selling too early and from overstaying. This page covers four styles, from tightest to most passive: the bar trail, the EMA and parabolic SAR trails, and the ATR trail.",
 "faq": [
  ("What is a bar trail?", "The stop rises to just below the prior bar's low on a long (above the prior bar's high on a short). A 2-minute bar trail is the tightest, a 5-minute holds through an opening drive, and a 15-minute can keep you in a full intraday trend. Keep it for explosive volume breakouts."),
  ("What is an ATR trail?", "A stop set a multiple of the Average True Range away from price. It flattens as price consolidates, which makes it good for holding a trend. A common starting point is a period of 3 and a factor of 3, and you exit on a full bar close below it."),
  ("Where do the EMA and parabolic SAR fit?", "In the middle. A 9 EMA trail, exiting on a close below it, gives more room than a bar trail and reacts faster than an ATR trail. A parabolic SAR starts wide and tightens as time passes."),
  ("Can you use more than one trail on a trade?", "Yes. Split the size: trail the momentum part tight, such as a 5-minute bar trail, and hold the rest with a looser trail, such as a 15-minute ATR trail, to stay with a bigger move."),
 ],
},
"/order-flow.html": {
 "q": "What is order flow?",
 "a": "Order flow is the record of every executed trade inside each candle, split into trades at the bid and at the ask. A candle only shows four prices, while a footprint chart shows volume at every price inside it: where buyers and sellers were active, where big players traded and who was more aggressive.",
 "faq": [
  ("What does the bid and ask side of a footprint mean?", "The bid side is aggressive sellers hitting market orders or passive limit buyers getting filled. The ask side is aggressive buyers or passive limit sellers. You can't know which for certain, so context decides the best guess."),
  ("What do you need to read order flow?", "A platform that draws footprint charts, such as NinjaTrader, TradingView's volume footprint or Sierra Chart, and level 1 data for one exchange: executed trades with the bid and ask they traded at."),
  ("Why futures and not spot forex?", "Footprints need accurate volume at every price, which needs a central exchange. Futures have one, so everyone sees the same data. Spot forex doesn't, so read the currency future instead."),
  ("Where should a beginner read order flow?", "Only at a level you already marked. A big print in the middle of nowhere is a guess; heavy prints right at support or resistance are a reasonable read."),
 ],
},
"/auction-market-theory.html": {
 "q": "What is auction market theory?",
 "a": "Auction market theory describes the market as an auction that moves through three phases: balance, where price rotates between two walls; transition, where big orders accept value outside the range; and imbalance, a trend toward the next area of value where a new balance forms. On this page, from Fabio Valentini's video, the first step is reading which regime the market is in before picking a trade.",
 "faq": [
  ("Can a trending market be in balance?", "Yes. Through one summer the Nasdaq rotated inside a three-month range on the composite profile, running to one extreme, getting rejected and running to the other."),
  ("What ends a balance?", "A transition candle, also called an initiative auction, where big orders accept value outside the area. Long term, a fundamental catalyst is usually the reason a market leaves balance."),
  ("How do you trade inside balance?", "Wall to wall. Trade the rejection at one wall toward the other, then expect the opposite at the other boundary. The realistic target is about 1:1.5 to 1:2, not 1:5."),
  ("How much should you risk on an add?", "About a third of the profit you've already locked in."),
 ],
},
"/pyramiding.html": {
 "q": "What is pyramiding into winners?",
 "a": "Pyramiding is adding to a trade only after it moves in your favor, with every add smaller than the one before. From an SMB Capital video, the first entry is a full 1R, the first add about 0.5R, then 0.25R and down to 0.1R, and the stop moves up behind each add. The size grows while the risk falls.",
 "faq": [
  ("How is pyramiding different from martingale?", "Martingale adds bigger bets as a trade goes against you. Pyramiding adds smaller bets only after favorable movement and never goes past the original risk."),
  ("What do most traders get wrong when pyramiding?", "They undersize the first entry and oversize the adds, trying to get paid more because the trade is working."),
  ("Where does the stop go after an add?", "Up to the prior support the add came from. By the third entry you can hold your biggest position of the trade while risking less than on the first entry."),
  ("Is open profit a cushion for a big add?", "No. Up 3R near target, add something like 0.5R and move the whole stop to the initial target, so the worst case is still up 2.5R."),
 ],
},
"/covered-calls.html": {
 "q": "What is a covered call?",
 "a": "A covered call is selling a call option on stock you already own, 100 shares per contract. You collect the premium today and keep it whatever happens. In exchange your upside stops at the strike, and the stock can still fall. In the page's example, with INTC at $32, selling the $34 call two months out paid $1.50 a share.",
 "faq": [
  ("What is the most you can make on a covered call?", "The rise to the strike plus the premium. In the INTC example that's $2 plus $1.50, or $350 per contract, about 10.9% over two months."),
  ("What is the break-even?", "The stock price you paid minus the premium: $32 minus $1.50 is $30.50 in the example."),
  ("Does a covered call protect your shares?", "No. If the stock falls more than the premium you still lose money. At $25 the example loses $5.50 a share instead of $7."),
  ("What does assigned mean?", "The buyer used the call and your shares were sold at the strike, so you keep the premium plus the gain up to the strike but miss anything above it."),
 ],
},
"/dynamic-risk-sizing.html": {
 "q": "What is dynamic risk sizing?",
 "a": "Dynamic risk sizing means risking more on your best setups and less on your weakest, instead of the same amount on every trade. From an SMB Capital video, two traders took the same three trades. The one who sized each trade to its grade finished the day up $7,065, the one who used the same risk every time $4,797.",
 "faq": [
  ("What are the risk tiers?", "A+ setups get the most risk (for example $400), A setups really good risk ($300), B setups your baseline ($200), and C setups really small ($100)."),
  ("How much more should you risk on an A setup?", "Small steps. In the example the A trade got 50% more than the $200 baseline, not ten times more."),
  ("What makes a trade an A?", "A strong catalyst, a key higher time frame level, volume on the break, a clear trigger, a tight consolidation and a good time of day. A wide, choppy range or a midday breakout pushes it toward a C."),
  ("Can a trade's grade change?", "Yes. In the example the same stock at the same level was a B- on a wide, choppy first look, then an A once it tightened into a wedge and broke on big volume."),
 ],
},
"/trading-earnings.html": {
 "q": "How do you trade earnings?",
 "a": "This page follows a four-step process from a prop trading desk: watch the headline reaction without chasing it, listen to the conference call, wait for price to confirm, then build a Plan A and a Plan B for the next day. In the example the headline spike toward 152 faded, and the better long came near 154 after the call changed the story.",
 "faq": [
  ("Why not buy the earnings beat?", "The stock cares whether results beat what investors already expected, not whether the headline sounds good. A beat can be priced in, or traders who positioned before earnings sell the spike."),
  ("What should you listen for on the earnings call?", "Contracts, next quarter's guidance, financing, dilution and share unlocks. The first two shape the story; the last three are about new supply of stock."),
  ("Does a faded spike mean you should short?", "No. Good news giving back the move doesn't make the report bad. It only means the first reaction hasn't confirmed anything yet."),
  ("What are Plan A and Plan B?", "Plan A is what you do if buyers defend a key area, in the example holding 155 to 156. Plan B is what you do if it loses that area and can't reclaim it, so you stop forcing the long."),
 ],
},
"/level-radar.html": {
 "q": "What is Level Radar?",
 "a": "Level Radar is a TradingView indicator that shows, for ten levels day traders watch, the chance in percent that price touches each one before the session ends. The levels are the previous day's high, low and close, the overnight high and low, today's open, the opening range high and low, and today's high and low so far. The odds update on every bar.",
 "faq": [
  ("How are the odds worked out?", "It compares each level's distance with how far price usually still travels in the time left today, using the last ten sessions' range, shrunk as the session runs out, then checks how often price went that far on past days at the same time of day."),
  ("What do the colors mean?", "Green levels are above price and red below. Brighter and thicker means higher odds. A tick mark means the level was already touched today."),
  ("Where does the history come from?", "Fifteen years of index and gold futures built into the script, plus the last twenty sessions of your own chart."),
  ("Are Level Radar's odds accurate?", "On SPY and QQQ, in our check, yes: levels marked 60 to 70% were touched about 62% of the time, usually within 1 to 3 points. On single stocks the middle-range odds ran 8 to 11 points too high."),
 ],
},
"/get-better-faster.html": {
 "q": "How do you get better at trading faster?",
 "a": "Shorten the feedback loop. Pick one setup, trade it, review it, correct it and see it again, until the pattern becomes obvious. Watching videos, following alerts, changing strategies and adding indicators feel like work, but if none of it changes how you execute, you're staying busy rather than improving.",
 "faq": [
  ("Why one setup instead of trading in general?", "Trading is too broad to get good at. One setup that shows up often enough to study, recognize and improve at gives you depth. The page's goal is 100 examples of one setup, not 50 strategies."),
  ("How do you know if you have a setup?", "You can answer six questions before the trade: why the stock is in play, the level, the trigger, where you're wrong, the target, and what would make you pass."),
  ("How do you get more reps on a setup?", "Add review to live trading: replays, chart review after the close, the best opportunities of the day, historical examples and backtests, and watching the tape. One live rep a day can become about nine."),
  ("Is market intuition real?", "It's pattern recognition built from reps. Show yourself the same setup 500 times and you stop thinking about it and start seeing it."),
 ],
},
"/edge.html": {
 "q": "What is a trading edge?",
 "a": "A trading edge is a reason a trade should work that doesn't come from a belief about the stock or a good mood about your day. On this page it is built in a fixed order: read the price action across time frames, structure the idea as catalyst, setup and trade, and start with your stop. Once you have it, it's an inch wide and miles deep.",
 "faq": [
  ("How do you know why your trade has edge?", "Structure it as catalyst, setup and trade. The catalyst is why other people have to act, the setup is the price action combination, and the trade is the scoped execution. Know who is on the wrong side and losing money."),
  ("Why start with the stop?", "Your stop sets your risk and your risk sets your size. Put it where the price action shows your edge began, and move it only when price action gives a new reason, never because of your P&L."),
  ("How many ideas should you screen per trade?", "Flesh out four or five ideas for every one you actually put risk on."),
  ("What does inch wide, mile deep mean?", "The what-ifs of fear, FOMO and greed are a mile wide and only an inch deep. Real edge is the opposite: one catalyst, one setup, one read, held with conviction once you're in it."),
 ],
},
"/stop-placement.html": {
 "q": "Where should you put your stop loss?",
 "a": "Where the trade is proven wrong, not where it feels comfortable. On this page, from an SMB Capital video, Jeff Holden says the question isn't how to avoid being wrong, it's what price would have to do to prove the trade has changed. For an opening range break that's back inside the range and under VWAP, which is usually much closer than the low of the day.",
 "faq": [
  ("Why is a low-of-day stop often wrong for a breakout?", "It sits far past the point where the breakout has already failed. On the CRWV trade in the video it risked about 3.82 to make 2.18, so the trade had to win about 64% of the time just to break even."),
  ("Does a closer stop lower the win rate?", "A little, sometimes. In a choppy opening range a failed break usually runs back to the other side fast, so a stop under VWAP barely changes the odds while cutting the risk roughly in half."),
  ("Can you start with a wide stop?", "Yes, but move it as the trade works. Ask at each level, like VWAP, the pre-market high or the opening price, whether losing it would make the trade wrong. If yes, the stop goes there."),
  ("What is a turn trade stop?", "A stop just under the level you bought. The thesis is that buyers defend that level right away, so if it breaks or price just sits there, you're out. The best turn trades risk 10 to 20 cents to make a dollar."),
  ("How do you know if a tighter stop is better?", "Test it on your own trades first: how often the closer stop got hit, the average loss, and what the wider stop cost when it was hit. Let the sample decide before it becomes a rule."),
 ],
},
"/futures-basics.html": {
 "q": "How do futures work?",
 "a": "A futures contract is an agreement to buy or sell a set amount of something at a set price on a set date. Unlike an option, both sides are obligated. You put up a small deposit called margin, often around 5% of the contract's value, and your account is marked to market every day, so gains and losses are paid in cash daily.",
 "faq": [
  ("What is the difference between futures and options?", "An option gives the buyer the right to buy or sell, and the most the buyer can lose is the premium. A futures contract is an obligation for both sides: unless you close it before it expires, you have to go through with it."),
  ("Is futures margin a loan?", "No. In stocks, margin means borrowing from your broker and paying interest. In futures, margin is a security deposit that shows you can cover losses. There's no loan and no interest, and it's only a small slice of the contract's value."),
  ("What is a margin call in futures?", "If daily losses push your balance below the maintenance margin, you have to deposit enough to bring it back up to the initial margin. If you don't, or the market keeps moving against you, the broker can close your position for you."),
  ("How much is one tick worth?", "It depends on the contract. One crude oil contract is 1,000 barrels with a 1-cent tick, so a tick is $10 and a $1 move is $1,000. The E-mini S&P 500 is $50 times the index with a quarter-point tick worth $12.50."),
  ("Can you lose more than you put in with futures?", "Yes. Because of leverage, a big enough move against you can lose more than your margin deposit, and you can end up owing your broker money. With 5% margin, a 5% move against you wipes out the whole deposit."),
  ("How did oil prices go negative in April 2020?", "Demand collapsed and storage filled up. The expiring May crude contract was physically settled, so holders who couldn't take delivery paid others to take it. It settled at minus $37.63 on April 20, 2020, while later months stayed positive."),
 ],
},
"/investment-funds.html": {
 "q": "What are the main types of investment funds?",
 "a": "Almost every fund is explained by three questions. How you buy it: a mutual fund from the fund company once a day, an ETF on the stock exchange, a closed-end fund from other investors, or a private fund like a hedge fund. Who decides what it buys: a manager (active) or nobody, because it copies an index. And what's inside: from money market and bond funds to stock, real estate, commodity and leveraged funds.",
 "faq": [
  ("What is the difference between an ETF and a mutual fund?", "Mostly how you buy them. An ETF trades on the stock exchange like a single stock, any time the market is open. A mutual fund is bought from the fund company and priced once a day after the close, at its net asset value (NAV)."),
  ("Is an index fund an ETF or a mutual fund?", "It can be either. Index describes who decides what the fund buys: nobody, because it copies a list like the S&P 500. An S&P 500 index ETF and an S&P 500 index mutual fund own basically the same companies; only the way you buy them differs."),
  ("What is an expense ratio?", "The yearly fee a fund charges, as a percentage of your money. Index funds often charge under 0.15%, stock mutual funds around 0.4% on average, and some active funds 1% or more."),
  ("How much do fund fees really cost?", "In the video's example, $10,000 invested for 30 years at 7% a year before fees ends near $75,000 with a 0.05% fee and near $57,000 with a 1% fee: about $18,000 less, with nothing else changed."),
  ("Why do bond funds fall when interest rates rise?", "If your old bond pays 3% and new bonds pay 5%, nobody pays full price for yours. Bond prices fall, and so does the fund. Funds of long-term bonds move the most."),
  ("Why do leveraged ETFs lose value in a flat market?", "They reset every day. In the video's example, an index that goes up 3% and down 3% for 20 days ends less than 1% lower, but a 3x fund moving 9% each way ends almost 8% lower."),
 ],
},
"/options-basics.html": {
 "q": "How do options work?",
 "a": "An option is the right, not the obligation, to buy (a call) or sell (a put) 100 shares at a fixed price, the strike, until a deadline, the expiration. The buyer pays a premium and can lose no more than that. The seller keeps the premium and takes on the obligation, with much larger risk.",
 "faq": [
  ("What is the difference between a call and a put?", "A call gives you the right to buy at the strike price, so it gains when the stock rises. A put gives you the right to sell at the strike price, so it gains when the stock falls."),
  ("How do you calculate an option's break-even?", "For a call, add the premium per share to the strike: a $100 call bought for $2 breaks even at $102. For a put, subtract it: a $100 put bought for $2 breaks even at $98."),
  ("What does in the money mean?", "A call is in the money when the stock is above the strike, and a put when it's below. In the money isn't the same as profitable: a $100 call at $101 is worth $100 per contract, but if you paid $200 you're still down $100."),
  ("What is time decay?", "Part of an option's price is time value, paid for the chance the stock moves before expiration. It shrinks every day, faster near expiration, so an option can lose value even when the stock doesn't move."),
  ("What is a volatility crush?", "Options get expensive when the market is nervous, like before earnings. After the news, the fear disappears and the option's price can drop sharply even if the stock barely moves. In the video, a $200 call fell to $80."),
  ("Do you have to exercise an option to make money?", "No. Most traders sell the contract itself back to the market. Exercising early throws away the time value still in the price."),
 ],
},
"/recession-investing.html": {
 "q": "How should you invest during a recession?",
 "a": "Decide what you'll do before it happens, then follow it. The danger in a recession is less the drop, which has been temporary almost every time, than selling in a panic. Set your emergency fund, what happens to your regular and extra contributions, and a concrete rebalancing trigger while you're calm.",
 "faq": [
  ("Who decides when the US is in a recession?", "The National Bureau of Economic Research (NBER). It looks at jobs, income, industrial production and spending, and announces a recession months after it starts. A common rule of thumb is two quarters in a row of falling GDP."),
  ("How long do recessions last?", "The US has had 34 since the 1850s, about 17 months on average, but only about 10 to 11 months on average since World War II. 2007 to 2009 lasted 18 months; the 2020 recession lasted 2."),
  ("Why do stocks recover before the economy?", "The market looks ahead, pricing what investors expect months from now. Economic data like unemployment and GDP looks back. In 2020 the S&P 500 bottomed on March 23, and was already about 44% off its low when the recession was officially announced on June 8."),
  ("Should you wait for good news before investing again?", "Waiting usually means missing the recovery, because the data confirming it arrives after it has started. In March 2020 some of the best days of the S&P 500 came within days of some of the worst."),
  ("What is recency bias in investing?", "Giving too much weight to the crisis happening now and too little to how similar ones played out. Every recession feels like this time is different: 2000, 2008 and 2020 all did."),
 ],
},
"/arbitrage.html": {
 "q": "What is arbitrage?",
 "a": "Buying an asset where it's cheap and selling the same asset where it's more expensive, at the same time, to profit from the price gap. If something trades at $100 on one exchange and $105 on another, buying one and selling the other earns $5 a unit before fees.",
 "faq": [
  ("Is arbitrage really risk-free?", "In theory, yes. In practice it's low risk, not zero risk: the price can move before your order fills, fees can eat the gap, there may not be enough size at the good price, and transfers between exchanges take time."),
  ("Why do price gaps happen?", "Different exchanges don't all move at the same speed, regions differ in supply, taxes or capital controls, and news reaches one market a fraction of a second before another."),
  ("What is triangular arbitrage?", "A currency trade in a loop, such as dollars to euros, euros to yen and yen back to dollars. If the three exchange rates don't quite line up, you end with more than you started, before fees."),
  ("What is merger arbitrage?", "After a takeover offer, the target's stock usually trades slightly below the offer price. Traders buy it, betting the deal closes. It's also called risk arbitrage because the deal can fail and the stock can drop."),
  ("Can retail traders profit from arbitrage?", "Rarely. High-frequency firms with servers next to the exchange, direct data feeds, tiny fees and big capital usually close a gap within milliseconds, before a person could spot it."),
 ],
},
"/analysis-types.html": {
 "q": "What is the difference between fundamental, technical and macro analysis?",
 "a": "Fundamental analysis works out what a company is worth from its financial statements and qualities like its brand and leadership. Technical analysis reads the price chart: price, volume, trends, support and resistance. Macro analysis looks at the economy: interest rates, government spending, GDP, jobs and world events.",
 "faq": [
  ("What is quantitative vs qualitative analysis?", "Quantitative analysis uses numbers you can measure, from the income statement, balance sheet and cash flow report. Qualitative analysis judges what's hard to measure: brand strength, leadership, competitive advantage and industry trends."),
  ("What are support and resistance?", "Support is a price floor where buyers tend to step in and the stock stops falling. Resistance is a ceiling where sellers tend to take profits and the stock stops rising."),
  ("What is a fakeout?", "A move through support or resistance that quickly snaps back inside. It can trap traders who jumped in too soon, which is why many wait for a close beyond the level."),
  ("How do interest rates affect stocks?", "Low rates make borrowing cheap, so companies expand and people spend, which often pushes stocks higher. Rising rates slow borrowing and spending, and stocks usually take a hit."),
  ("Which type of analysis is best?", "Each has a blind spot. Fundamentals don't time entries, technicals don't explain why price moves, and macro says nothing about a single company. Many investors combine them."),
 ],
},
"/eps-pe-ratio.html": {
 "q": "What are EPS and the P/E ratio?",
 "a": "Earnings per share (EPS) is a company's net income, minus preferred dividends, divided by its shares outstanding: the profit each share earns. The price-to-earnings (P/E) ratio is the share price divided by EPS: how many dollars investors pay for each dollar of yearly earnings.",
 "faq": [
  ("How do you calculate earnings per share?", "Subtract preferred dividends from net income, then divide by the common shares outstanding. A company with $5,000,000 of net income, $200,000 of preferred dividends and 1,000,000 shares has an EPS of $4.80."),
  ("What makes EPS go up or down?", "Profit and the share count. Higher net income raises EPS. Issuing new shares (dilution) lowers it, and buying shares back raises it, even with no change in profit."),
  ("What is a good P/E ratio?", "There isn't one number. P/E ranges differ by industry: growth industries like tech often run high, mature or cyclical ones like utilities run low. Compare a company with its own industry's average."),
  ("What is the difference between trailing and forward P/E?", "Trailing P/E uses the last 12 months of actual earnings. Forward P/E uses analysts' estimates for the next 12 months. A forward P/E below the trailing one means earnings are expected to grow."),
  ("Can EPS be negative?", "Yes, when a company has a net loss. Then the P/E isn't meaningful. It doesn't automatically mean a bad investment: look at why, and at revenue growth, cash flow and debt."),
  ("Does a low P/E mean a stock is cheap?", "Not always. It can mean the stock is undervalued, or that the company is facing problems. A high P/E can mean expected growth rather than overvaluation."),
 ],
},
"/24-hour-stock-trading.html": {
 "q": "When does 24-hour stock trading start?",
 "a": "Sunday, Dec 6, 2026 at 9 PM ET. From then on, US stocks trade from Sunday 9 PM to Friday 8 PM, with a one-hour pause from 8 to 9 PM each weeknight. The new part is an overnight session from 9 PM to 4 AM on Nasdaq, NYSE Arca, Cboe EDGX, MEMX and 24X.",
 "faq": [
  ("Do premarket and regular hours change?", "No. Premarket (4:00 to 9:30), regular hours (9:30 to 4:00) and after-hours (4:00 to 8:00) stay the same, and so do the 9:30 open and 4:00 close auctions and the official close."),
  ("Which day does an overnight trade count toward?", "The next one. Trades between 9 PM and midnight count toward the next day, the way futures work."),
  ("Do overnight trades change the day's high or low?", "No. Overnight trades add to volume but don't set the day's last price, high or low."),
  ("How much trading happens overnight?", "Only about 1% of share volume (0.9% in August 2026, per SEC staff data), so the overnight session is thin."),
  ("Are there trading halts overnight?", "Not automatic ones. Each stock gets fixed overnight price bands, 20% beyond its reference prices, and trades outside them are blocked with no 5-minute pause. The listing exchange can still halt a stock, and it then stays halted until 4 AM."),
  ("How are overnight trades cleared?", "The same way as daytime trades. NSCC, part of DTCC, clears them 24x5, and they settle T+1 from the next-day trade date, so a 10 PM Monday buy settles Wednesday."),
 ],
},
"/eight-trading-rules.html": {
 "q": "How do you get out of a trading slump?",
 "a": "Make the game easier. On this page, from an SMB Capital video, Mike Bellafiore gives a struggling trader eight rules: lower your size and risk, be more selective, shorten your time frame, don't do it alone, aim for one good trade, grade your entries daily, keep your heart rate low, and write your solution down and send it to someone.",
 "faq": [
  ("Is a trading slump normal?", "Yes. Every trader goes through one. What isn't okay is struggling and not changing anything."),
  ("Why lower size in a slump?", "Smaller size and risk take pressure off, so you can get back to executing what used to work without each loss doing more damage."),
  ("What is the one good trade rule?", "Stop trying to make it all back today. Aim for one good trade, executed well."),
  ("Why write the plan down?", "Talking about fixes isn't the same as making them. Writing the solution down and sending it to two people makes it a commitment someone can hold you to."),
 ],
},
"/let-winners-run.html": {
 "q": "How do you let winners run?",
 "a": "Let the move, not a fixed target, decide when you exit a winning trade. Most traders already cut losers fine and lose money by selling winners at a static target. This page covers three exit rules that keep a winner open while it keeps working, with the same entries and stops as before.",
 "faq": [
  ("Doesn't letting winners run lower your win rate?", "Yes, and that's expected. A 60% win rate at 1R per winner earns +0.2R a trade. A 40% win rate with 3R winners earns +0.6R, three times as much."),
  ("What is the One Below rule?", "Exit on the first close below the previous candle's low. It works as both your stop and your profit exit from the moment you're in."),
  ("What decides your results?", "Expected value over your next 1,000 trades: win rate times average win minus loss rate times average loss, not what one trade does."),
  ("Is an ATR trailing stop a good exit?", "Not in our test. On the Energy in the Tank breakout the ATR trail made +0.36% a trade, while holding until a daily close back under the breakout made +2.3 to +3.9%."),
 ],
},
"/linda-raschke.html": {
 "q": "What are Linda Raschke's trading rules?",
 "a": "Linda Raschke is a Market Wizard who has day traded the S&P since the day it listed and ran a $300 million fund. Her rules, as this page sums them up: read price, not the tape; know what kind of day it is; bet the same size every time; and pick your exits like an actuary. Get the main idea right and that's 90% of the game.",
 "faq": [
  ("Why does she prefer price to order flow?", "If buyers are really stepping in, price lifts on a plain bar chart. The biggest players hide their moves across accounts and firms, and the tape is full of algorithm noise."),
  ("What is the volume spike test?", "Take an intraday volume spike, drop to the 1-minute chart and look left. About 80% of volume spikes land on a prior swing point."),
  ("Is a trailing stop the best exit?", "Only about 15% of the time, in her view."),
  ("What indicators does she use?", "Few. Moving averages and oscillators lag price. For a model with a real statistical edge she says ATR or percentage functions do much better than oscillators."),
 ],
},
"/mistakes.html": {
 "q": "What are the biggest support and resistance mistakes?",
 "a": "A support or resistance level is just an input. This page covers the five mistakes that cost traders money around it: trading the level without the bigger picture, treating every level the same, not looking left on the chart, ignoring volume at the level, and not planning what to do if the level actually works.",
 "faq": [
  ("Why check the market before trading a level?", "On a day when the index trends hard and everything is being sold, a support level often sets up a better trade the other way: the break, not the bounce."),
  ("What does looking left mean?", "Checking the daily or weekly chart for important levels from prior sessions. An intraday low can sit right above much stronger support."),
  ("Why does volume matter at a level?", "A break on light volume with no catalyst gives little reason to expect follow-through. Without real volume, the fade is usually the better trade."),
  ("Is the same price always the same level?", "No. A level that is tested and quickly rejected is different from one that holds and closes above on real volume. Size each one by its quality."),
 ],
},
"/price-action-rules.html": {
 "q": "What are the three price action rules?",
 "a": "This page's three rules: trade the continuation you're already wired to recognize (a break, a touch back to the broken level, then the go), define your stop before you consider the entry, and add to winners only on a new setup, not because you feel undersized.",
 "faq": [
  ("What is a break, touch and go?", "Price breaks a consolidation's low, pops back up to retest the broken support as resistance, then continues in the original direction. Read it on a higher time frame, like the 15-minute, and execute on the 1 or 2-minute."),
  ("Where does the stop go?", "In the continuation example, above the high of the candle that made the touch, with the target at the low of the original move. Know both before you're in."),
  ("How often should you add to a winner?", "Roughly one in five trades offers a real chance to add. Treat that as the baseline rather than forcing it."),
  ("What makes a valid add?", "A completely new setup: a fresh, tighter consolidation after the move works, with its own stop above its high and its own entry on the break of its low."),
 ],
},
"/seven-cheat-codes.html": {
 "q": "What are the seven cheat codes of a profitable scalper?",
 "a": "From Scarface Trades' video, seven rules that build on each other: find a strategy with a proven edge, master market structure, combine time frames to enter, expect scalps to work right away, start small and scale slowly, only trade A+ conditions, and practice daily.",
 "faq": [
  ("What scalping setups does he trade?", "Three, all retests: the premarket high and low from 4:00 to 9:30 a.m. Eastern, the one candle rule (the last down-close candle in an uptrend), and the 5-minute opening range."),
  ("Why enter on the retest instead of the break?", "The breakout candle is where many traders get faked out, buying the top with a wide stop. The pullback into the level gives a small stop and a bigger target."),
  ("How fast should a scalp work?", "Within about 5 minutes. If it doesn't, get out."),
  ("Why do most traders fail?", "Emotions, and losing too often or too big. One big red day can take a week of profit."),
 ],
},
"/seven-trading-traps.html": {
 "q": "What are the seven trading traps?",
 "a": "From an SMB Capital desk reset meeting, the seven traps are the historical reasons experienced traders lose money, starting with style drift and missing a regime change. When the P&L bleeds, the page swaps the excuse \"it's not my market\" for a search: which trap am I in?",
 "faq": [
  ("What is style drift?", "Abandoning your proven setups for trades outside your playbook, like a short-term momentum team buying calls far out in time and holding longer, where they had no statistical edge."),
  ("Why is \"it's not my market\" dangerous?", "It means waiting it out and changing nothing. The page treats a losing stretch as a reason to scrutinize your trading against each trap and adapt."),
  ("What should you do when a setup goes cold?", "Cut size, by about 50% the moment it goes cold, and downgrade a trade three notches when one nuance is missing."),
  ("Does a market regime filter help?", "Not in our test. Adding trap 2's QQQ filter to the Zero Lag Pullback cut about 60% of the trades and didn't improve the rest (-0.02R against +0.01R)."),
 ],
},
"/six-momentum-trades.html": {
 "q": "What are the six momentum trades?",
 "a": "Most strategy names aren't different trades. They describe a location (VWAP, high of day), a shape (bull flag) or a behavior (failed breakout). This page groups them into six things price can actually do, such as a pullback continuation, a consolidation continuation or a breakout, so you ask what the market is doing instead of which pattern this is.",
 "faq": [
  ("Is a VWAP pullback a different trade from a 9 EMA pullback?", "No. VWAP and the 9 EMA are opportunity zones, places to look. The trade underneath both is a pullback continuation."),
  ("What are the five checks before an entry?", "Stock in play, setup, momentum trade, opportunity zone and trigger, in that order. Then the plan: allocation, stop, entry and target."),
  ("What is a trigger?", "The price action event that tells you the move is actually happening, not that it might."),
  ("Why do fewer trades get through?", "Running all five layers every time filters out trades taken on \"I see a pattern, I'm in\". That's the point."),
 ],
},
"/expected-move.html": {
 "q": "What is the expected move?",
 "a": "The expected move is the range the options market is pricing for a stock between now and an expiration, usually one standard deviation either side of the price. In a simplified bell-curve model, price has about a 68% chance of finishing inside it at expiration. This page's calculator draws it on a chart from the at-the-money straddle, a straddle plus strangle, implied volatility or the 16 delta strikes.",
 "faq": [
  ("Does 68% mean price stays inside the range all week?", "No. 68% is where it finishes, not where it travels. In the same model the odds of never trading outside the range all week are only about 37%, so a mid-week touch of an edge is normal."),
  ("Which expiration should you use?", "Any. A weekly read uses the coming Friday's expiration; a monthly read often uses the standard monthly about a month out."),
  ("Where does the expected move work best?", "Where options are deep and liquid, such as SPY and QQQ."),
  ("What is implied vs actual?", "A comparison of the move the options market is pricing with how much the stock usually moves over the same number of days."),
 ],
},
"/famous-strategies/can-slim.html": {
 "q": "What is CAN SLIM?",
 "a": "CAN SLIM is William O'Neil's growth stock method from How to Make Money in Stocks (1988). Each letter is a test a stock must pass before its big move: strong current and annual earnings, something new, supply and demand, a market leader, institutional sponsorship, and a market in a confirmed uptrend. You buy the breakout from a sound base on heavy volume and cut every loss at 7 to 8%.",
 "faq": [
  ("What earnings does CAN SLIM look for?", "Quarterly and annual earnings per share growth of 25% or more, with return on equity of 17% or more."),
  ("When do you buy a CAN SLIM stock?", "Only when the general market is in a confirmed uptrend, on a breakout over the pivot of a sound base with volume 40 to 50% or more above normal, within 5% of the pivot."),
  ("When do you sell?", "Always on a loss of 7 to 8% from your cost. Most gains are taken at 20 to 25%."),
  ("Does CAN SLIM work?", "A little better than random in our test. The price and volume rules on the whole US market made +1.3% a trade over 2,474 trades, against +0.4 to +1.1% for random entries with the same exits. Adding the earnings letters lifted it to +1.7%, on only 140 trades."),
 ],
},
"/famous-strategies/cross-sectional-momentum.html": {
 "q": "What is cross-sectional momentum?",
 "a": "Cross-sectional momentum ranks every stock on its return over the past 3 to 12 months, buys the top tenth and sells short the bottom tenth, and holds for a few months. Jegadeesh and Titman's 1993 paper found the winners kept beating the losers, with the best version earning 1.49% a month.",
 "faq": [
  ("How is it different from trend following?", "Cross-sectional momentum ranks each stock against every other stock on the same date. Trend following, or time-series momentum, compares a stock with its own past. In a crash the cross-sectional winners can be the stocks that fell least."),
  ("Is there a stop or a target?", "No. The ranking does all the work. A fresh portfolio is built every month and each one is held for its set period."),
  ("What did the paper test?", "NYSE and AMEX stocks from 1965 to 1989, with lookbacks and holding periods of 3, 6, 9 or 12 months. The 6-month / 6-month version made 12.01% a year, compounded."),
  ("Does momentum still work?", "Not better than the market in our test. The 12-1 long-short made +8.4% a year with a 0.44 Sharpe ratio, against +9.9% and a 0.66 Sharpe for simply owning every stock equally."),
 ],
},
"/famous-strategies/dual-momentum.html": {
 "q": "What is dual momentum?",
 "a": "Dual momentum is Gary Antonacci's method from Dual Momentum Investing (2014). Once a month, relative momentum picks the stronger of US and non-US stocks over 12 months, and absolute momentum checks whether US stocks beat T-bills. If they didn't, the money goes to US aggregate bonds. His Global Equities Momentum (GEM) model uses both.",
 "faq": [
  ("What is the difference between relative and absolute momentum?", "Relative momentum picks which market is stronger, so it always holds something. Absolute momentum asks whether stocks are beating cash at all, and steps into bonds when they aren't."),
  ("How often do you check it?", "At each month-end, using 12-month total returns."),
  ("What did the book's backtest show?", "From 1974 to 2013, before costs and taxes, GEM made 17.43% a year with a worst drawdown of 22.72%, against 8.85% and 60.21% for world stocks."),
  ("Does dual momentum work?", "It trailed holding SPY in our test: +13.8% a year for GEM against +17.6% for SPY held, over five years with no long bear market."),
 ],
},
"/famous-strategies/intraday-momentum.html": {
 "q": "What is intraday momentum?",
 "a": "Intraday momentum is the link Gao, Han, Li and Zhou (2018) found on SPY: the return from yesterday's 4:00 pm close to 10:00 am today tends to point the way the last half-hour goes. At 3:30 pm you buy SPY if that return was positive, or short it if negative, and close at 4:00.",
 "faq": [
  ("Why would the morning predict the close?", "The paper gives two reasons: funds and hedgers who rebalance once a day near the close, and traders who act late on the morning's news, both push price the way the morning pointed."),
  ("How strong was the effect?", "Small and daily. From 1993 to 2013 the timing rule was right on 54.37% of days and made 6.67% a year, with an R-squared of 1.6%."),
  ("When was it stronger?", "On volatile and high-volume days, in recessions and on macro news days."),
  ("Does intraday momentum still work?", "Not in our test: the last half hour went the morning's way on only 49% of days, and the trade averaged -0.01% a day on SPY and -0.02% on QQQ."),
 ],
},
"/famous-strategies/low-volatility.html": {
 "q": "What is the low-volatility anomaly?",
 "a": "The low-volatility anomaly is the finding that the calmest stocks earned about as much as the riskiest, and the noisiest did worst, against the textbook idea that more risk pays more. It comes from Ang, Hodrick, Xing and Zhang (2006) and Frazzini and Pedersen's Betting Against Beta (2014). The strategy owns the calm stocks and rebalances on a schedule.",
 "faq": [
  ("Volatility or beta?", "Two ways to measure calm. Volatility is how much a stock swings; beta is how much it moves with the market. They mostly agree."),
  ("How big was the effect in the papers?", "The noisiest fifth of stocks trailed the calmest by 1.06% a month. Lowest-beta stocks had a 0.70 Sharpe ratio against 0.28 for the highest, and betting against beta had a 0.78 Sharpe from 1926 to 2012."),
  ("What is the catch?", "It lags in roaring rallies."),
  ("Does low volatility work?", "Lower risk, lower return in our test. The calmest 20% had a worst drop of only 10% but made +7.7% a year against +12.9% for the average stock."),
 ],
},
"/famous-strategies/magic-formula.html": {
 "q": "What is the Magic Formula?",
 "a": "The Magic Formula is Joel Greenblatt's stock-picking method from The Little Book That Beats the Market (2005). Rank the largest US stocks on earnings yield (EBIT divided by enterprise value) and return on capital, add the two ranks, buy the 20 to 30 best totals, hold each for a year and replace it.",
 "faq": [
  ("Why exclude financials and utilities?", "Their balance sheets don't fit the formula."),
  ("Why EBIT and enterprise value instead of P/E?", "EBIT is operating profit before interest and taxes, so companies with different debt and tax situations compare on the same footing. Enterprise value counts debt, so a cheap P/E bought with a pile of debt doesn't look cheap."),
  ("What did the book's test show?", "30.8% a year against 12.4% for the S&P 500, from 1988 to 2004."),
  ("Does the Magic Formula work?", "It beat the average stock but not SPY in our test: +11.3% a year from 2022 to 2026, against +5.7% for the equal-weight market and +13.0% for SPY."),
 ],
},
"/famous-strategies/opening-range-breakout.html": {
 "q": "What is the opening range breakout strategy?",
 "a": "This version, from Toby Crabel (1990) as tested by Zarattini, Barbon and Aziz (2024), trades the first 5-minute candle. A green candle means longs only, red shorts only. You place a stop order at its high or low, risk 10% of the 14-day ATR sized to 1% of capital, and hold to the 4:00 close, on stocks in play.",
 "faq": [
  ("What counts as a stock in play?", "In the paper, the 20 US stocks with the highest relative volume that day, at 100% or more above normal."),
  ("How did it do in the paper?", "1,637% net from 2016 to 2023 on stocks in play, with a 2.81 Sharpe ratio. The same rules on every stock made 29%."),
  ("Why no profit target?", "A tight stop with no target means many small losses and a few days that pay several times the risk. It only adds up on stocks with a reason to trend."),
  ("Does it work?", "A small edge on QQQ in our test: +0.07R a trade over 1,158 trades on 1-minute bars, about 0.14R better than random direction. On SPY and 10 single stocks it lost."),
 ],
},
"/famous-strategies/overnight-effect.html": {
 "q": "What is the overnight effect?",
 "a": "The overnight effect is the finding that since the 1990s the US market's gain has come almost entirely between the 4:00 pm close and the next morning's open, not during the trading day. Cliff, Cooper and Gulen (2008) found nights beat days in all 14 big ETFs they studied.",
 "faq": [
  ("How do you trade the overnight effect?", "Buy a broad index fund such as SPY at the 4:00 pm close, sell at the 9:30 am open, and stay flat during the day. That's about 252 round trips a year."),
  ("What did the research find?", "From 1993 to 2006, S&P 500 stocks averaged 0.028% to 0.048% a night and -0.028% to 0.002% a day. On SPY, nights beat days by 0.068% a day."),
  ("Can you use it without trading every night?", "Yes, as timing: buy index funds near the close and sell near the open."),
  ("Does the overnight effect work?", "Nights beat days before costs in our test, but both trailed holding. SPY held only overnight made +33% before costs and +17.3% after, against +58.3% for simply holding."),
 ],
},
"/famous-strategies/pairs-trading.html": {
 "q": "What is pairs trading?",
 "a": "Pairs trading bets on the gap between two stocks that have moved together. In Gatev, Goetzmann and Rouwenhorst's 2006 paper, each stock is paired with the one whose price line stayed closest to its own over 12 months. When the gap reaches two standard deviations, you short the leader and buy the laggard, and close both when their prices cross.",
 "faq": [
  ("How are the pairs chosen?", "By distance, not industry: the smallest sum of squared gaps between prices normalized to start at $1 over the 12-month formation period."),
  ("How long is a pair traded?", "For the next six months. Anything still open then is closed, and a new cycle starts every month."),
  ("How did it do in the paper?", "Up to about 11% a year above the risk-free rate on liquid US stocks from 1962 to 2002."),
  ("Does pairs trading work?", "Not in our test: 1,457 pair trades lost about 0.19% a trade after costs."),
 ],
},
"/famous-strategies/post-earnings-drift.html": {
 "q": "What is post-earnings announcement drift?",
 "a": "Post-earnings announcement drift (PEAD) is the tendency of stocks with big earnings surprises to keep moving the same way for weeks. Bernard and Thomas (1989) scored each surprise against the company's own history, bought the biggest beats, shorted the biggest misses and held for about 60 days.",
 "faq": [
  ("What is SUE?", "Standardized unexpected earnings: reported earnings minus what was expected, divided by how much the company's earnings usually miss the forecast."),
  ("How strong was the drift in the paper?", "The long-short made money in 41 of 48 quarters from 1974 to 1985, and 25 to 30% of the drift landed at the next earnings reports."),
  ("Who found it first?", "Ball and Brown, in 1968."),
  ("Does post-earnings drift still work?", "Weakly in our test. The biggest surprises beat the biggest misses by about 1% over 60 days, positive in only 11 of 20 quarters, though our surprise date came from the later 10-Q filing."),
 ],
},
"/famous-strategies/rsi-2.html": {
 "q": "What is the RSI(2) strategy?",
 "a": "RSI(2) is Larry Connors and Cesar Alvarez's pullback strategy for index ETFs like SPY and QQQ. Buy when the 2-period RSI closes at or below 5 while price is above its 200-day average, and sell on the first close above the 5-day average.",
 "faq": [
  ("Why a 2-period RSI?", "Looking back two days instead of fourteen turns a slow gauge into one that hits extremes on almost every pullback."),
  ("Does RSI(2) use a stop?", "No. Connors found stops hurt results on indexes."),
  ("Can you short with RSI(2)?", "The mirror image: below the 200-day, short when RSI(2) is at or above 95."),
  ("Does RSI(2) work?", "As described, but too rarely to judge in our test. It won 80% of the time on SPY and QQQ but fired only about 20 times on each in five years, making +1.0% a trade on SPY and +0.7% on QQQ."),
 ],
},
"/famous-strategies/sector-rotation.html": {
 "q": "What is sector rotation?",
 "a": "Sector rotation ranks industry sectors on their recent returns, holds the top few and swaps out any that fall behind. Based on Moskowitz and Grinblatt (1999) and tested by Mebane Faber (2010), it ranks ten sectors each month and holds the top three, a third each, with no view on the economy needed.",
 "faq": [
  ("How are sectors ranked?", "By trailing total return. Faber's combined score averages the 1, 3, 6, 9 and 12-month returns."),
  ("How did it do in Faber's test?", "About 3 to 6% a year over holding all ten sectors, before costs, beating buy and hold in roughly 70% of years."),
  ("Is this business cycle rotation?", "No. Business cycle rotation picks sectors from a forecast of the economy. This version just follows the ranking."),
  ("Does sector rotation work?", "Within the noise in our test: the top 3 of the 11 sector SPDRs made +15.6% a year against +14.5% for an equal mix of all of them."),
 ],
},
"/famous-strategies/ten-month-sma.html": {
 "q": "What is the 10-month moving average strategy?",
 "a": "Mebane Faber's 2007 timing rule: on the last trading day of each month, if the price closed above its 10-month simple moving average, own the asset for the next month. If it closed below, sell and hold 90-day T-bills.",
 "faq": [
  ("Why does it help?", "The worst stretches for stocks have tended to happen when prices were already below their long-term trend, so stepping aside then cuts the deepest drops."),
  ("What did Faber's test show?", "On the S&P 500 from 1901 to 2012, 10.2% a year timed against 9.3% held, with the worst drawdown cut from 83.5% to 50.3%, before costs and taxes."),
  ("What is the downside?", "Whipsaws and lag. It sells after a decline has started and buys back after a rebound, so it trails in choppy markets."),
  ("Does the 10-month moving average work?", "It cut the drops and the gains with them in our test: +9.5% a year on SPY timed against +17.6% held, over five years with no long bear market."),
 ],
},
"/famous-strategies/turn-of-the-month.html": {
 "q": "What is the turn of the month effect?",
 "a": "The turn of the month effect is the finding that US stocks earned most of their return on four trading days each month: the last day of the month and the first three of the next. McConnell and Xu (2008) found 0.15% a day in that window from 1926 to 2005, and about nothing on other days.",
 "faq": [
  ("How do you trade the turn of the month?", "Buy a broad index fund at the close of the day before the month's last trading day, and sell at the close of the third trading day of the new month."),
  ("Is it only a US effect?", "No. McConnell and Xu found it in 31 of 35 countries."),
  ("Is it caused by fund inflows?", "They found no extra volume or fund inflows that explained it."),
  ("Does the turn of the month still work?", "Not in our test. The turn days were 19% of trading days and made 9.8% in total, while the rest of the month made 46.9%, so they earned about their share and no more."),
 ],
},
"/famous-strategies/value-and-size.html": {
 "q": "What is the value and size effect?",
 "a": "Fama and French's 1992 paper found two easy numbers lined up with stock returns far better than beta: size (small stocks earned more) and book-to-market (cheap stocks earned more). The strategy tilts toward small and cheap stocks and rebalances once a year.",
 "faq": [
  ("What is book-to-market?", "A company's book value of equity divided by its market value. A high number means a stock is priced cheaply against its book value."),
  ("How big was the value premium?", "From 1963 to 1990, value beat growth by 1.53% a month. After 1991 the value premium shrank to about 0.11% a month."),
  ("Did the paper say risk doesn't matter?", "No. It said beta, measured the usual way, wasn't the risk the market was paying for."),
  ("Does value and size investing work?", "Value did, size didn't, in our test: cheap stocks beat expensive ones by about 6.2% a year, and small stocks beat big ones by only 1.6%."),
 ],
},
}
