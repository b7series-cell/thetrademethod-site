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
}
