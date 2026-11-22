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
}
