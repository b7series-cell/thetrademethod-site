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
  ("Does the Hitchhiker Scalp work?", "In our test it was break-even: 2,291 trades on the 2-minute chart across SPY, QQQ and 10 large-cap stocks from Nov 2021 to Nov 2026 had a 40% win rate, a 1.03 profit factor and +0.01R per trade. The test couldn't pick stocks in play the way the setup asks."),
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
  ("Does the 9 EMA continuation work?", "Our mechanical test lost a little: 552 trades on 5-minute bars across 10 large-cap stocks, Aug to Nov 2026, with a 30% win rate, a 0.87 profit factor and -0.06R per trade. Four of the 10 stocks were positive."),
 ],
},
"/setups/fashionably-late.html": {
 "q": "What is the Fashionably Late trade?",
 "a": "Fashionably Late is a momentum scalp built on two studies, the 9 EMA and VWAP. You let the stock put in its low, wait for price to work back toward VWAP, and enter the moment the 9 EMA crosses VWAP, with a stop a third of the way back to the low and a target one full low-to-cross distance above.",
 "faq": [
  ("What time of day does Fashionably Late work?", "Two windows: 10:00 to 10:45 in the morning and 10:46 to 1:30 midday. Outside them the same cross under-performs, so skip it."),
  ("Where are the stop and target?", "Measure from the low of day to the cross. The stop goes a third of that distance back toward the low and the target one full distance above the entry, which makes it 3 to 1."),
  ("Can you trade Fashionably Late short?", "Yes. It's the same trade in reverse: the 9 EMA crossing down through a flat or falling VWAP."),
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
  ("Does the QQE Mod strategy work?", "In our test it came out just under break-even: 256 trades on 5-minute bars across 10 large-cap stocks, Aug to Nov 2026, with a 48% win rate, a 0.97 profit factor and -0.01R per trade. That was on stocks, not the gold futures from the video."),
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
  ("Does the Qullamaggie breakout work?", "It was the only setup on this site that clearly beat random entries in our tests: 158 trades with a 5-minute opening range entry averaged +0.63R against -0.21R for random entries with the same exits, though only 35% of trades won."),
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
 "a": "The Gap Give and Go is an opening gap trade from an SMB Capital playbook review. A stock gaps up on strong, fresh news, then drops fast on light volume into a key level (the give). You don't buy that drop. You wait for a quiet range where sellers can't push it lower, then buy the turn (the go) when the tape flips, with a hard stop under the low of the day.",
 "faq": [
  ("What are the three checks before a Gap Give and Go trade?", "A stock in play with a fresh catalyst graded 8 out of 10 or better, a real key level such as a daily breakout or a big round number, and relative volume well above normal."),
  ("Why not buy the give?", "A give can keep on giving, and you don't know where it ends until it has. Waiting for the go means you give up the low but only own the days that actually turn."),
  ("How big a gap is too big?", "About 10% is significant for an 8 out of 10 catalyst and about 20% is a reasonable ceiling. Past 30%, only a 9.5 or 10 catalyst, news that changes the company, can carry it."),
  ("What are the targets?", "Back through the open, the premarket high, then a measured move of about half the relative volume times the daily ATR. Sell into extensions and hold the rest until the trend ends."),
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
  ("Does the Fibonacci OTE work?", "Not better than chance in our test. On the 1-hour chart the 0.702 limit made +0.02R a trade over 856 trades with a 34% win rate, about the same as random entries on the same impulse with the same stop and targets (+0.01R)."),
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
  ("How do you take profits?", "Scale out in thirds into blow-off volume, whole-dollar levels and higher time frame resistance. Trail the rest above the 9 EMA on the 2 or 5-minute chart and exit on the first close below it."),
  ("What if you miss the break at the open?", "Don't chase an extended move. Wait for a pullback toward VWAP or the day-two high that holds, and get long against low of day."),
 ],
},
"/setups/cup-and-handle.html": {
 "q": "What is a cup and handle?",
 "a": "A cup and handle is a swing continuation pattern in an uptrend. Price forms a smooth, rounded base (the cup) and then a shallow, tightening pullback just below the old resistance (the handle). The trade is a stop order above the cup's resistance and the handle's high, taken only when price actually breaks it on expanding volume.",
 "faq": [
  ("What trend does a cup and handle need?", "Price above its 20, 50 and 200-period simple moving averages, with the 50 sloping up. The rising 50 is often where the base of the cup forms."),
  ("What should volume do?", "Heavy early in the cup, tapering into the base, ticking back up as price recovers, fading again in the handle, then expanding on the breakout."),
  ("Where does the stop go?", "1.5 times the ATR, the \"baby bear\" stop: tighter than a 2.0 times position-trading stop and looser than a 1.2 times scalp trail."),
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
  ("When do you take profits?", "When the same volatility measure swings to its expansion extreme, roughly 6 times the ATR in the page's examples. Most of the stored energy is spent, so trim or expect mean reversion."),
  ("Does Energy in the Tank work?", "Partly. On 13 large caps it made +2.3% a trade over 126 trades with a 22% win rate, mostly from a few multi-year holds. A plain 20-day breakout with the same exits did better (+3.5%), so the exit works but the squeeze signal isn't why."),
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
  ("What is the short signal?", "A candle with an upper wick about twice its body and little or no lower wick. Enter at the next candle's open and close at that candle's close, with no target or stop."),
  ("Why don't the shorts mirror the longs?", "Inverting the long model for shorts was tested in the source and didn't work. Shorts did better when only taken after a red prior day."),
  ("Does the ATR Hybrid Scalp work?", "Not on our stand-in test: on QQQ and SPY 5-minute bars, 2,725 trades had a 41% win rate, a 0.76 profit factor and -0.11R per trade. A test on MNQ futures could come out differently."),
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
}
