# -*- coding: utf-8 -*-
"""
tested_data.py: our own backtest results, one entry per site page.

Read by _docs/build_tested.py, which writes the "We tested it" section on
each page, the hero chip, the TESTED map in js/site.js and the
/tested-results.html overview. Edit here, then run:

    python3 _docs/build_tested.py

Verdicts (colour on the page):
    edge   green   beat the random-entry benchmark
    mixed  orange  some result, but with a real catch
    none   red     no edge after costs, or no better than random
    thin   grey    too few trades, or too little data, to judge
    info   blue    an accuracy check, not a trade

Text is plain HTML (use &minus;, &rarr; etc.). Keep it honest: losing results
stay in. Numbers come from the evaluation notes of 2026-11-16 to 2026-11-21.
"""

# ---- how the tests were run (shared "How we tested" lines) ----------------
LOCAL = ("5 years of price history, Nov 2021 to Nov 2026, on SPY, QQQ and 10 large-cap stocks (AAPL, AMD, COIN, GOOG, "
         "HOOD, META, MSFT, MU, NVDA, TSLA). Rules coded from this page at its default settings. Fills at the bar close, the "
         "stop wins when stop and target are hit in the same bar, 0.5 bp a side for the spread, results in R capped at +10R. "
         "Trades before June 2024 are the training half, after it the holdout.")
TV_STOCKS = ("TradingView backtest of the 10 large-cap stocks (AAPL, AMD, COIN, GOOG, HOOD, META, MSFT, MU, NVDA, TSLA) "
             "together on 5-minute bars, Aug to Nov 2026 (the last 5,000 bars, so about 3.5 months). Rules coded from this "
             "page, 0.5 bp a side for the spread.")
TV_GRID = ("TradingView Deep Backtesting with the bar magnifier on, 2020 to 2026, 1 bp a side or a 1-cent spread, plus a "
           "multi-ticker run on 10 large-cap stocks (AAPL, AMD, COIN, GOOG, HOOD, META, MSFT, MU, NVDA, TSLA).")
FAMOUS = ("Every US stock that traded from Nov 2021 to Nov 2026, delisted ones included, so there's no survivorship bias. "
          "Company figures from SEC filings, used only from the day they were filed. 0.5 bp a side on SPY, QQQ and ETFs, 5 bp "
          "a side on single stocks. Stock returns are price only; ETF returns include dividends. Five years is short for a "
          "monthly strategy, and 2022 to 2026 was a strong large-cap market that is hard for any timing rule to beat.")

PAGES = [

# =============================== SETUPS ===============================
{
 "path": "setups/qullamaggie.html", "name": "Qullamaggie Breakout", "group": "Setups",
 "verdict": "edge", "chip": "Beat random entries",
 "headline": "One of two setups that beat random entries",
 "lead": "Of every setup on this site we could code, this is one of two (with Day Three Breakout) that clearly did better than random entries with the "
         "same exits. It still loses on most trades: the profit comes from a few big trend trades.",
 "stats": [["158", "trades, daily + 5-minute ORH"], ["35%", "win rate"], ["+0.63R", "average per trade", "pos"],
           ["&minus;0.21R", "random entries, same exits", "neg"]],
 "table": {"head": ["Entry", "Trail", "Trades", "Avg R"],
           "rows": [["1-minute opening range", "10-day", "176", "+0.62R"],
                    ["5-minute opening range", "10-day", "158", "+0.62R"],
                    ["15-minute opening range", "20-day", "110", "+0.84R"],
                    ["30-minute opening range", "20-day", "97", "+1.00R"],
                    ["Daily close", "20-day", "82", "+0.87R"]]},
 "notes": ["Positive in both halves: +0.47R before June 2024, +0.75R after, and on 11 of the 11 tickers that traded.",
           "Each filter adds to it. A plain opening-range break on any day made +0.03R; add the uptrend, the tight base and the "
           "30% prior move and it climbs to +0.63R.",
           "The catch: it lost in 2022 (&minus;0.73R) and so far in 2026 (&minus;0.39R). The median trade is a 1R loss, and the "
           "top 5 trades made 46 of the 99R.",
           "The real setup scans the whole market for the top 1 to 2% of movers. This test only had 12 hand-picked tickers, "
           "which flatters it. A whole-market run is next."],
 "how": LOCAL,
},
{
 "path": "setups/energy-in-the-tank.html", "name": "Energy in the Tank", "group": "Setups",
 "verdict": "none", "chip": "Worse than random entries",
 "headline": "Loses, and random entries did better",
 "lead": "Run on every US stock for five years with this page's indicator, the squeeze breakout lost money. Random entries on "
         "the same stocks with the same exits did better, so the signal adds nothing. The earlier profit came from 13 stocks "
         "picked with hindsight.",
 "stats": [["21,401", "trades, every US stock, daily"], ["15%", "win rate"], ["&minus;2.2%", "a trade after costs", "neg"],
           ["+1.5%", "random entries, same exits", "pos"]],
 "table": {"head": ["Version", "Trades", "Win %", "Avg a trade"],
           "rows": [["Every signal, both sides", "21,401", "15%", "&minus;2.2%"],
                    ["Random entries, same stocks and exits", "107,005", "17%", "+1.5%"],
                    ["Longs only", "9,872", "14%", "&minus;0.1%"],
                    ["Random longs", "49,360", "16%", "+4.6%"],
                    ["Liquid longs ($5+, $10M a day)", "3,750", "14%", "+1.3%"],
                    ["Liquid longs, each trade capped at +50%", "3,750", "14%", "&minus;1.4%"],
                    ["Shorts only", "11,529", "16%", "&minus;3.9%"],
                    ["Earlier test: 13 hindsight large caps, capped", "126", "22%", "+2.3%"]]},
 "notes": ["About 83% of trades end on the stop, a daily close back through the level, with a median hold of 10 trading days.",
           "The 6&times; trim cue is rare: only about 7% of longs ever reach it before the stop.",
           "Among liquid longs, the top 5% of trades made more than the whole total; without them it loses. Capped at +50% a "
           "trade, every year was negative except 2023, which broke even.",
           "The earlier +2.3% came from 13 of today's winners picked with hindsight. On every stock the same rules lose."],
 "how": "Every US common stock, delisted ones included, on daily bars from Nov 2021 to Nov 27, 2026 (signals from April 2022 "
        "after the weekly warm-up). Rules coded line for line from this page's indicator at its default settings: a weekly "
        "squeeze arms it, a daily close beyond the top or bottom of the 20-week closing range on 2&sigma; volume enters, a close "
        "back through the level or the measure above 6 exits. 5 bp a side. Random entries: five random days on the same stock "
        "and side for every trade, with the level the same distance away and the same exits. Results are in % because the "
        "stop is a close, which can land well past the level.",
},
{
 "path": "setups/cup-and-handle.html", "name": "Cup and Handle", "group": "Setups",
 "verdict": "none", "chip": "No better than random",
 "headline": "Slightly positive, but random stocks did as well",
 "lead": "Run on every liquid US stock over five years, it made a small profit. Random stocks in an uptrend, bought on the same "
         "days with the same stop and targets, made about the same.",
 "stats": [["226", "trades, whole US market, daily"], ["39%", "win rate"], ["+0.16R", "average per trade", "pos"],
           ["+0.11R", "random uptrend stocks (+0.07 to +0.20)"]],
 "table": {"head": ["Version", "Trades", "Avg R"],
           "rows": [["Site rules", "226", "+0.16R"],
                    ["Before June 2024 / after", "", "+0.38R / &minus;0.01R"],
                    ["Without the base-volume filter", "547", "&minus;0.02R"],
                    ["Without all four filters", "1,358", "&minus;0.02R"],
                    ["Second target at the full measured move", "226", "+0.19R"],
                    ["The video's trailing stop instead of breakeven", "229", "+0.09R"]]},
 "notes": ["All of the profit came before mid-2024. Since then it's flat.",
           "The volume taper into the base is the filter that matters. Without it the setup loses.",
           "On intraday charts the exact rules found almost no trades, and a scaled-down version didn't beat random entries.",
           "The video's 1.5&times; ATR trailing stop did worse than a fixed stop with breakeven: most trades were trailed out "
           "within a few days, and only 20 of 229 reached target 2."],
 "how": ("Every US common stock over $10 trading at least $20M a day, delisted ones included, Nov 2021 to Nov 2026. Rules "
         "coded line for line from this page's indicator, 5 bp a side."),
},
{
 "path": "setups/day-three-breakout.html", "name": "Day Three Breakout", "group": "Setups",
 "verdict": "edge", "chip": "Beat random entries",
 "headline": "Positive, and better than random entries on the same days",
 "lead": "Run on every US stock that had a day one and a quiet inside day two over five years, the indicator's rules made money "
         "in both halves of the test and in every full year. Random entries in the first 30 minutes of the same days made far less.",
 "stats": [["445", "trades, whole US market, 5-minute"], ["40%", "win rate"], ["+0.50R", "average per trade", "pos"],
           ["+0.10R", "random entries, same days (extremes trimmed)"]],
 "table": {"head": ["Version", "Trades", "Avg R"],
           "rows": [["Indicator rules (stop under the breakout bar)", "445", "+0.50R"],
                    ["Before June 2024 / after", "193 / 252", "+0.43R / +0.56R"],
                    ["Low-of-day stop instead", "445", "+0.44R"],
                    ["Stocks over $10", "240", "+0.56R"],
                    ["Random entry in the first 30 minutes, same days (1% extremes trimmed; untrimmed &minus;0.63R)", "4,450", "+0.10R"],
                    ["Thin names (day one under $10M traded)", "324", "Gapped through stops"]]},
 "notes": ["Positive every full year from 2022 to 2026 (+0.38R to +0.76R). Per trade it made about 1.1% of the entry price on average.",
           "Most trades lose: the median is a 0.44R loss and 157 of 445 were stopped out. The profit comes from the runners; "
           "the 10 best trades made 100R of the 225R total.",
           "287 of the 733 day threes broke the day-two high after 10:00 and were skipped, as the rules say.",
           "Thinly traded names don't work with a stop a few cents under a 5-minute bar: their bars gap straight through it. "
           "The test only counts stocks that traded $10M or more on day one."],
 "how": ("Every US common stock over $1 with a day one up 20% on 3&times; volume and an inside day two, delisted ones included, "
         "Nov 2021 to Nov 2026, 5-minute bars on day three. Rules coded line for line from this page's indicator, 5 bp a side. "
         "The catalyst check can't be coded, so this tests the price and volume pattern only."),
},
{
 "path": "setups/anchored-vwap.html", "name": "Anchored VWAP", "group": "Setups",
 "verdict": "none", "chip": "Loses",
 "headline": "Loses, though the earnings anchor beats a random one",
 "lead": "Run on five years of earnings releases from every liquid US stock, 2,055 of them, the indicator's rules lost money. The same rules "
         "anchored on random days lost far more, so the earnings line carries real information, just not enough to pay for the stop-outs.",
 "stats": [["22,554", "trades, 2,055 stocks, 15-minute + daily"], ["28%", "win rate"], ["&minus;0.18R", "average per trade", "neg"],
           ["&minus;0.77R", "same rules, random anchors"]],
 "table": {"head": ["Version", "Trades", "Avg R"],
           "rows": [["Every liquid US stock, every release", "22,554", "&minus;0.18R"],
                    ["Before June 2024 / after", "", "&minus;0.21R / &minus;0.16R"],
                    ["After-hours volume &ge; 20% (the indicator's minimum)", "4,703", "&minus;0.38R"],
                    ["After-hours volume &ge; 50% (strong)", "3,099", "&minus;0.49R"],
                    ["Random anchors, same rules", "22,289", "&minus;0.77R"],
                    ["450 most-traded stocks only", "5,126", "&minus;0.15R"],
                    ["450 stocks, no intraday stop, daily closes only (&ge; 20%)", "1,000", "&minus;0.71R"],
                    ["18 large caps, big earnings beats (&gt; 15%)", "33", "&minus;0.79R"]]},
 "notes": ["In the 450-stock run, 40 to 46% of trades were stopped out on the entry day, at about &minus;1.1R. The stop just under the line gets hit by normal post-earnings swings.",
           "The ones that survived the first day went on to make +0.4R, but that doesn't cover the stop-outs.",
           "The indicator's own after-hours filter makes it worse, and the more after-hours volume, the bigger the loss.",
           "Beating estimates didn't help either: on 18 large caps with earnings-surprise data, big beats were the worst group. Misses were the only positive group (+0.13R), on just 27 trades.",
           "Not tested: the page's &ldquo;daily chart breaking out of a long base&rdquo; condition, which is a judgment call."],
 "how": ("38,830 earnings releases from every US common stock that was ever liquid (price at least $10 and $20M traded a day, delisted stocks "
         "included), Dec 2021 to Oct 2026, 15-minute bars with extended hours. Anchor at the release time from the SEC 8-K filing. Rules coded "
         "from this page's indicator with default settings; after the entry day, the first daily close below the line sells half and the next "
         "sells the rest (ours), 60-day cap. 5 bp a side. The first run on the 450 most-traded stocks and the earnings-surprise run on 18 large caps "
         "used the same rules."),
},
{
 "path": "setups/zero-lag-pullback.html", "name": "Zero Lag Pullback", "group": "Setups",
 "verdict": "none", "chip": "No edge vs random",
 "headline": "Break-even, and random entries did as well",
 "lead": "On the 5-minute chart it's about break-even. On slower charts the long side makes money, but random long entries in "
         "the same uptrend, with the same stop and 2R target, made just as much.",
 "stats": [["446", "trades, SPY 5-minute"], ["35%", "win rate"], ["+0.01R", "average per trade"],
           ["+0.44R vs +0.47R", "4-hour longs vs random longs"]],
 "table": {"head": ["Test", "Trades", "Avg R"],
           "rows": [["SPY 5-minute, both sides", "446", "+0.01R"],
                    ["QQQ 5-minute, both sides", "511", "+0.03R"],
                    ["NVDA / TSLA / AMD 5-minute", "~530 each", "&minus;0.15 / &minus;0.05 / +0.05R"],
                    ["10 stocks, 4-hour, longs", "355", "+0.44R (random +0.47R)"],
                    ["10 stocks, daily, longs", "222", "+0.35R (random +0.15R, &plusmn;0.2R by seed)"]]},
 "notes": ["Shorts lost on every slower chart (&minus;0.25R on 4-hour and daily).",
           "Going flat at 4:00 made it worse (&minus;0.07R): it cuts the winners. Overnight gaps caused 10 to 14R losses on single stocks.",
           "A market-regime filter and an RVOL filter didn't help.",
           "The long-side profit comes from being long these stocks in a bull market, not from the pullback and volume trigger."],
 "how": TV_GRID,
},
{
 "path": "setups/fib-ote.html", "name": "Fibonacci OTE", "group": "Setups",
 "verdict": "none", "chip": "No edge vs random",
 "headline": "No better than a random entry on the same impulse",
 "lead": "Run with the indicator's own rules on the 1-hour chart, the timeframe it's taught on, the 0.702 limit made almost exactly "
         "what a random entry made while the same impulse was armed, with the same stop and targets.",
 "stats": [["892", "trades, 1-hour"], ["34%", "win rate"], ["+0.02R", "average per trade"],
           ["&minus;0.01R", "random entries, same stop and targets"]],
 "table": {"head": ["Version", "Trades", "Avg R"],
           "rows": [["Site default, limit at 0.702", "892", "+0.02R"],
                    ["Limit at 0.618", "984", "+0.01R"],
                    ["Limit at 0.786", "780", "+0.04R"],
                    ["Longs only, 0.786", "369", "+0.16R (random longs +0.07R)"],
                    ["Shorts, any version", "", "&minus;0.01 to &minus;0.07R"],
        ["Level filter on, longs (32 tickers)", "84", "+0.67R (random longs +0.05R)"],
        ["Level filter on, shorts (32 tickers)", "77", "+0.03R"]]},
 "notes": ["SPY and QQQ together lost &minus;0.07R. Four of the 12 tickers were negative, NVDA worst at &minus;0.40R.",
           "By year: &minus;0.17, &minus;0.07, +0.01, +0.10, &minus;0.07 and +0.25R. No steady pattern.",
           "The long side at 0.786 sits about 0.09R above random. That's possible, not proven, and it's the same pattern as "
           "other long-only trend rules on hand-picked winners in a bull market.",
           "The one thing that helped: a support or resistance level near the OTE zone. With 15-bar pivot levels from the 1-hour and 4-hour charts, kept after a break as the opposite type (support turned resistance), and one of them within 15% of the impulse of the 0.618 to 0.786 zone, longs made +0.67R over 84 trades on 32 stocks and ETFs, against +0.05R for random longs. It held on 20 tickers the first test never saw. Shorts stayed flat. It's a small sample, so it's an off-by-default setting in the indicator, not the page's rule.",
         "Re-run Nov 28, 2026 with the fixed indicator (a break the other way no longer touches an open trade, and the new "
           "direction is measured from the swing the break started at). The old run made +0.02R over 856 trades."],
 "how": LOCAL + " Trades managed on 5-minute bars inside each hour.",
},
{
 "path": "setups/ict-made-simple.html", "name": "ICT Made Simple", "group": "Setups",
 "verdict": "none", "chip": "No edge on stocks",
 "headline": "The video's rules made money on Bitcoin and lost on US stocks",
 "lead": "We coded the video's own rules, and they take both of its Bitcoin trades. On Bitcoin, the video's market, they "
         "made money, but only 28 trades since 2016. Across every liquid US stock they lost, and they lost on every intraday pairing.",
 "stats": [["26,629", "trades, whole US market, daily / weekly"], ["26%", "win rate"], ["0.93", "profit factor"],
           ["&minus;0.05R", "average per trade", "neg"]],
 "table": {"head": ["Market", "Chart &rarr; HTF", "Trades", "Avg R"],
           "rows": [["Bitcoin, the video's market", "Daily &rarr; weekly", "28", "+2.45R, no costs"],
                    ["Every liquid US stock", "Daily &rarr; weekly", "26,629", "&minus;0.05R"],
                    ["12 tickers", "Daily &rarr; weekly", "137", "+0.30R"],
                    ["12 tickers", "4-hour &rarr; daily", "233", "+0.05R"],
                    ["12 tickers", "1-hour &rarr; daily", "994", "&minus;0.02R"],
                    ["12 tickers", "15-minute &rarr; 4-hour", "3,452", "&minus;0.18R"],
                    ["12 tickers", "5-minute &rarr; 1-hour", "9,052", "&minus;0.17R"]]},
 "notes": ["On Bitcoin it won 13 of 28 trades for +68.6R in total, almost all of it from longs (14 trades, +62.4R). That is "
           "too few trades to call an edge.",
           "On US stocks it made +0.02R a trade before June 2024 and lost &minus;0.13R after. Longs made +0.07R; shorts lost "
           "&minus;0.18R. Only 1,206 of 2,622 stocks came out positive.",
           "The 12-ticker daily / weekly row (+0.30R) rests on 137 trades and lost after June 2024 (&minus;0.08R).",
           "The earlier test used our indicator's old numbers (2-candle swings, a 0.1 ATR stop buffer, a minimum gap size, "
           "breaker retest entries) and lost &minus;0.08R on the whole market."],
 "how": ("The video's rules, as the indicator now runs them by default: closed higher-time-frame candles, 3-candle swings "
         "(the video's \"I like three\"), MSB and MSS on closes, POIs (order blocks, breakers, any fair value gap) in discount "
         "for longs and premium for shorts. On the chart: a low taken, then a close through the high (the MSS), entry on that "
         "close, stop at the low before the turn, target the external range liquidity, skipped under 1.5R. A stopped trade "
         "counts as a new low taken. Ours: 12 POIs kept and a 60-bar wait after a POI tag. It takes both of the video's "
         "trades: the April 2025 long and the May 2026 short on Bitcoin. Bitcoin: the indicator in TradingView on Coinbase "
         "daily bars, 2016 to Nov 2026, no costs. Stocks: every liquid US stock, delisted ones included, daily bars, 2021 to "
         "Nov 2026, 5 bp a side. Intraday: 1-minute bars on SPY, QQQ and 10 large-cap stocks, Nov 2021 to Nov 2026, 0.5 bp a "
         "side. The stop wins when stop and target share a bar, and a gap past the stop fills at the open."),
},
{
 "path": "setups/look-above-and-fail.html", "name": "Look Above and Fail", "group": "Setups",
 "verdict": "none", "chip": "Fake levels did as well",
 "headline": "Fake value areas made as much as the real ones",
 "lead": "On 5-minute bars it looked profitable. Then the same rules ran on fake value-area edges, moved in or out by a quarter "
         "of the range, and made the same. On 1-minute bars, the most realistic test, it lost on SPY and QQQ.",
 "stats": [["30,489", "trades, 10 stocks, 5-minute"], ["+0.21R", "real value area, 5-minute"],
           ["+0.26R", "fake edges moved in 25%", "neg"], ["&minus;0.07R", "SPY/QQQ, 1-minute", "neg"]],
 "table": {"head": ["Bars", "SPY / QQQ", "10 stocks"],
           "rows": [["1-minute", "&minus;0.07R (9,436)", "0.00R (40,155)"],
                    ["2-minute", "+0.02R (8,740)", "+0.07R (36,193)"],
                    ["5-minute", "+0.20R (7,167)", "+0.22R (30,489)"]]},
 "notes": ["The profit comes from bar size, not the value area: the entry fills inside the edge partway through a bar, and the "
           "trade is only managed from the next bar. Coarser bars flatter that.",
           "It's built for NQ and ES futures. SPY and QQQ stood in for them. A fair test needs tick data on the futures."],
 "how": ("SPY, QQQ and 10 large-cap stocks (AAPL, AMD, COIN, GOOG, HOOD, META, MSFT, MU, NVDA, TSLA), Nov 2021 to Nov 2026, on "
         "1, 2 and 5-minute bars. Rules from this page's indicator at its defaults, 0.5 bp a side. Fake edges: the same rules "
         "with the value area high and low moved out or in by 25% or 50% of its width."),
},
{
 "path": "setups/heatmap-scalp.html", "name": "Heatmap Scalp", "group": "Setups",
 "verdict": "none", "chip": "Breaks even",
 "headline": "With real order flow it breaks even, no clear edge",
 "lead": "We tested the video's rules on NQ futures with real buy and sell market orders: higher lows above VWAP, a pullback "
         "where heavy selling stops moving price and the next minute is net buying, a 20-point stop, 2:1, cut early, add on a "
         "pullback. It broke even. The order-flow trigger did better than the same pullbacks without it, but not by enough to trust.",
 "stats": [["163", "trades, NQ 1-minute, 279 days"], ["29%", "win rate"], ["&minus;0.01R", "average per trade"],
           ["&minus;0.04R", "random entries, same stop and target"]],
 "table": {"head": ["Version", "Rules", "Random entries"],
           "rows": [["The video's rules (20-point stop, 2:1)", "&minus;0.01R (163)", "&minus;0.04R"],
                    ["Same pullbacks, no order-flow trigger", "&minus;0.08R (727)", ""],
                    ["40-point stop (his wider NY stop)", "+0.03R (159)", "+0.01R"],
                    ["Heavier selling (2x average)", "+0.02R (85)", "&minus;0.07R"],
                    ["Lighter selling (1x average)", "&minus;0.01R (254)", "&minus;0.07R"]]},
 "notes": ["163 trades is a small sample: the likely range for the average runs from about &minus;0.20R to +0.18R. Nothing here is "
           "clearly better than random.",
           "Adds almost never happened (1 in 163): by the time a second trigger came, the trade had usually hit its stop or target.",
           "Not tested: the resting limit orders (the heatmap's bright bars), &ldquo;the bid holds&rdquo; and exiting before the wall. "
           "That needs order-book data. Also not tested: London and ES. Our data covers 9:30 to noon New York on NQ.",
           "Our earlier chart-only version on QQQ and SPY (wick into VWAP, 0.08% stop, target at the high of day) lost &minus;0.11R over "
           "2,344 trades."],
 "how": ("NQ futures 1-minute bars and footprints with the real CME buy and sell side (Databento), Oct 2025 to Nov 2026, 279 days, "
         "entries 9:30 to noon New York. Rules from this page's indicator: long when price is above VWAP (from 9:30) and the last two "
         "swing lows rise (5 bars left, 2 right, ours); short is the mirror with lower highs. A minute in the pullback zone (within 5 points "
         "of VWAP or the last swing low, ours) with sell volume over buy volume by at least 1.5x the last 20 minutes' average (ours), then "
         "a minute that holds its low and is net buying: buy its close. Stop 20 points, target 2:1, out early on another heavy-selling "
         "minute while under water, add once on a new trigger in profit with the stop under VWAP, three trades a day, two losses on one "
         "side ends that side. 0.5 points a lot round trip. Random entries: 20 per rules trade at random minutes and sides, same stop, "
         "target and cut-early rule."),
},
{
 "path": "setups/three-candle-crt.html", "name": "3-Candle CRT", "group": "Setups",
 "verdict": "none", "chip": "No edge",
 "headline": "Near zero on every timeframe",
 "lead": "Without TradingView's bar magnifier it looked great on QQQ 15-minute: +0.21R and a 57% win rate. With the magnifier on, "
         "which checks what happened inside each bar, it lost.",
 "stats": [["537", "trades, QQQ 15-minute"], ["43%", "win rate"], ["&minus;0.09R", "average per trade", "neg"],
           ["+0.21R", "the same test without the bar magnifier"]],
 "table": {"head": ["Market and chart", "Trades", "Avg R"],
           "rows": [["QQQ 15-minute", "537", "&minus;0.09R"],
                    ["QQQ 30-minute", "830", "+0.05R"],
                    ["QQQ 1-hour", "436", "&minus;0.04R"],
                    ["SPY 30-minute", "770", "&minus;0.01R"],
                    ["SPY 1-hour", "", "+0.01R"]]},
 "notes": ["Shorts on QQQ did a little better (+0.09R on 30-minute, +0.11R on 1-hour), but not on SPY or on 15-minute. A lead, not a plan.",
           "This is an approximation: a direct break only (the page's default is a 1-minute rebreak) and a simplified 1-hour bias."],
 "how": TV_GRID,
},
{
 "path": "setups/fashionably-late.html", "name": "Fashionably Late", "group": "Setups",
 "verdict": "none", "chip": "No edge after costs",
 "headline": "A small edge before costs, gone after them",
 "lead": "Before costs it made about +0.06R a trade on SPY. Spread and commission take more than that, and on other timeframes "
         "and on single stocks it was flat.",
 "stats": [["848", "trades, SPY 5-minute"], ["28%", "win rate"], ["&minus;0.18R", "average after 1 bp a side", "neg"],
           ["+0.06R", "average before costs"]],
 "table": {"head": ["Test", "Avg R"],
           "rows": [["SPY 1-minute", "&minus;0.09R"], ["SPY 5 / 15 / 30-minute", "+0.01 / +0.02 / &minus;0.01R"],
                    ["QQQ 5 / 15-minute", "&minus;0.01 / +0.01R"], ["10 stocks 5 / 15 / 30-minute", "&minus;0.03 / &minus;0.02 / +0.02R"]]},
 "notes": ["Tested on 5-minute and slower bars. The page teaches it on the 2-minute chart, which the test couldn't use, and "
           "faster charts only make costs a bigger share of each trade."],
 "how": TV_GRID,
},
{
 "path": "setups/pmh-break.html", "name": "PMH Break", "group": "Setups",
 "verdict": "none", "chip": "No edge",
 "headline": "Slightly negative over five years",
 "lead": "With premarket highs on 2-minute bars, the opening-drive break above the premarket high lost a little on average.",
 "stats": [["188", "trades, 2-minute"], ["37%", "win rate"], ["0.94", "profit factor"], ["&minus;0.03R", "average per trade", "neg"]],
 "how": LOCAL,
},
{
 "path": "setups/hitchhiker-scalp.html", "name": "Hitchhiker Scalp", "group": "Setups",
 "verdict": "none", "chip": "Break-even",
 "headline": "Break-even over 16,136 trades",
 "lead": "The site's indicator at its default settings, run on the 2-minute chart with the 70/30 exit, roughly paid for its costs and no more.",
 "stats": [["16,136", "trades, 2-minute"], ["46%", "win rate"], ["1.01", "profit factor"], ["+0.006R", "average per trade"]],
 "table": {"head": ["Version", "Trades", "Avg per trade", "Before / after Jun 2024"],
           "rows": [["Defaults", "16,136", "+0.006R", "+0.017 / &minus;0.006"],
                    ["First hour only", "8,382", "+0.026R", "+0.009 / +0.043"],
                    ["Strong volume (2.5&times;)", "7,625", "+0.017R", "+0.021 / +0.013"],
                    ["First hour + strong volume", "6,663", "+0.030R", "+0.032 / +0.027"],
                    ["Skip chop + daily mid-range", "7,551", "+0.005R", "+0.023 / &minus;0.012"]]},
 "notes": ["First-hour entries after a strong-volume move were the steadiest version, but +0.03R per trade is about the size of a slightly worse fill, and it drops to about zero at 1 bp a side in costs.",
           "The test can't pick stocks in play the way the page asks, so it ran on the same 10 large-cap stocks plus SPY and QQQ every day.",
           "The full breakdown by side, time of day, year and stock is in the blog post <a href=\"/blog/does-the-hitchhiker-scalp-work.html\">Does the hitchhiker scalp work?</a>"],
 "how": ("5 years of 2-minute bars, Nov 2021 to Nov 2026, on SPY, QQQ and 10 large-cap stocks (AAPL, AMD, COIN, GOOG, "
         "HOOD, META, MSFT, MU, NVDA, TSLA). This page's indicator ported line for line at its default settings: entry a tick "
         "past the prior bar, stop on a close past the 21 EMA, 70% trimmed and 30% trailed, flat at the close. 0.5 bp a side "
         "for the spread, results in R capped at &plusmn;10R. Trades before June 2024 are the training half, after it the holdout."),
},
{
 "path": "setups/volume-profile-system.html", "name": "Volume Profile System", "group": "Setups",
 "verdict": "none", "chip": "No edge",
 "headline": "All three setups land at break-even or worse",
 "lead": "Almost 15,000 trades across the prior-close bounce, the value-area reversal and the value-area breakout, and none of "
         "them made money.",
 "stats": [["14,779", "trades, 5-minute"], ["38%", "win rate"], ["0.98", "profit factor"], ["&minus;0.01R", "average per trade"]],
 "table": {"head": ["Setup", "Avg R"],
           "rows": [["Prior-close bounce", "&minus;0.09R"], ["Value-area breakout", "+0.01R"], ["Value-area reversal", "0.00R"]]},
 "how": LOCAL,
},
{
 "path": "setups/volume-sr-rejection.html", "name": "Volume S/R Rejection", "group": "Setups",
 "verdict": "none", "chip": "Loses",
 "headline": "Wins 62% of the time and still loses",
 "lead": "A high win rate isn't an edge. The winners were small and the losers weren't, so it lost a fifth of its risk on "
         "every trade.",
 "stats": [["119,572", "trades, 5-minute"], ["62%", "win rate"], ["0.78", "profit factor"], ["&minus;0.20R", "average per trade", "neg"]],
 "notes": ["This is an approximation of the page's rules, so treat it as a first look."],
 "how": LOCAL,
},
{
 "path": "setups/vwap-reversal.html", "name": "VWAP Reversal", "group": "Setups",
 "verdict": "none", "chip": "No edge",
 "headline": "Break-even over 11,000 trades",
 "lead": "The 2-sigma band touch at a key level with a reversal candle and a 2R target came out just under break-even.",
 "stats": [["11,090", "trades, 5-minute"], ["39%", "win rate"], ["0.98", "profit factor"], ["&minus;0.01R", "average per trade"]],
 "how": LOCAL,
},
{
 "path": "setups/market-memory.html", "name": "Market Memory", "group": "Setups",
 "verdict": "none", "chip": "Loses",
 "headline": "Lost a tenth of its risk per trade",
 "lead": "Day-two John Wick candles at yesterday's high and low, traded to the other side of the box, won less than a quarter "
         "of the time.",
 "stats": [["8,236", "trades, 5-minute"], ["23%", "win rate"], ["0.87", "profit factor"], ["&minus;0.10R", "average per trade", "neg"]],
 "how": LOCAL,
},
{
 "path": "setups/atr-band-hybrid.html", "name": "ATR Hybrid Scalp", "group": "Setups",
 "verdict": "none", "chip": "Loses",
 "headline": "Lost on the index ETFs",
 "lead": "Run with the page's indicator rules on QQQ and SPY 5-minute bars in place of MNQ futures, the two playbooks together lost a little.",
 "stats": [["2,108", "trades, 5-minute"], ["43%", "win rate"], ["0.87", "profit factor"], ["&minus;0.04R", "average per trade", "neg"]],
 "notes": ["The page is built for MNQ futures. QQQ and SPY are a stand-in, so a futures test could come out differently.",
           "The loss came from the shorts: 1,645 trades, a 0.70 profit factor, &minus;0.06R. The longs were about break-even: 463 trades, a 1.04 profit factor, +0.02R (+0.12R on SPY, &minus;0.09R on QQQ).",
           "The shorts have no stop, so their R uses the long side&#x27;s yardstick for that candle, 1.5 &times; the previous ATR. An earlier run that gave the shorts a stop lost &minus;0.11R overall."],
 "how": "5 years of 5-minute bars, Nov 2021 to Nov 2026, on QQQ and SPY, run with the same rules as this page&#x27;s indicator at its default settings (prior-day-red filter on). Longs fill at the band; shorts go in at the next open and out at its close. 0.5 bp a side for the spread. Before June 2024 it lost &minus;0.06R a trade, after it &minus;0.02R.",
},
{
 "path": "setups/opening-range-break.html", "name": "Opening Range Break", "group": "Setups",
 "verdict": "none", "chip": "Loses",
 "headline": "Lost on 8 of 10 stocks",
 "lead": "A 15-minute range, a break on 1.5 times average volume and a one-ATR target lost money over a short, recent sample.",
 "stats": [["249", "trades, 5-minute"], ["36%", "win rate"], ["0.76", "profit factor"], ["&minus;0.15R", "average per trade", "neg"]],
 "notes": ["Only 2 of the 10 stocks were positive.", "The sample is about 3.5 months, so it's a first look, not a verdict.",
           "The page's higher-time-frame story can't be coded, so it's left out."],
 "how": TV_STOCKS,
},
{
 "path": "setups/macd-continuation-scalp.html", "name": "MACD Continuation Scalp", "group": "Setups",
 "verdict": "none", "chip": "Loses",
 "headline": "Lost on 7 of 10 stocks",
 "lead": "A flat MACD near zero, then a continuation cross, won about a quarter of the time and lost a tenth of its risk per trade.",
 "stats": [["286", "trades, 5-minute"], ["27%", "win rate"], ["0.67", "profit factor"], ["&minus;0.11R", "average per trade", "neg"]],
 "notes": ["The page teaches it on the 1-minute chart; this ran on 5-minute bars over about 3.5 months.",
           "&ldquo;Flat&rdquo; had to be defined: MACD inside a band around zero for 3 to 15 bars."],
 "how": TV_STOCKS,
},
{
 "path": "setups/nine-ema-continuation.html", "name": "9 EMA Continuation", "group": "Setups",
 "verdict": "none", "chip": "Loses",
 "headline": "A small loss over five years",
 "lead": "Run with the page's indicator rules: a breakout on volume, then the first green close back above the 9 EMA after "
         "the first touch, half off at 2R and the rest trailed on the 9 EMA.",
 "stats": [["7,094", "trades, 5-minute"], ["33%", "win rate"], ["0.93", "profit factor"], ["&minus;0.03R", "average per trade", "neg"]],
 "notes": ["3 of the 10 stocks were positive. Before June 2024 it lost &minus;0.01R a trade, after it &minus;0.05R.",
           "The latest months were the worst: Aug to Nov 2026 lost &minus;0.13R a trade over 421 trades. An earlier "
           "TradingView run of those months lost &minus;0.06R."],
 "how": ("5 years of 5-minute bars, Nov 2021 to Nov 2026, on 10 large-cap stocks (AAPL, AMD, COIN, GOOG, HOOD, META, "
         "MSFT, MU, NVDA, TSLA), run with the same rules as this page's indicator at its default settings, long only. "
         "Fills at the bar close, the stop wins when it is hit, 0.5 bp a side for the spread, results in R capped at +10R."),
},
{
 "path": "setups/qqe-mod.html", "name": "QQE Mod + EMA 50", "group": "Setups",
 "verdict": "none", "chip": "Break-even",
 "headline": "Wins almost half the time, and breaks even",
 "lead": "The red-to-blue flip above the EMA 50, entered at the next open with a 2R target, came out just under break-even.",
 "stats": [["256", "trades, 5-minute"], ["48%", "win rate"], ["0.97", "profit factor"], ["&minus;0.01R", "average per trade"]],
 "notes": ["4 of the 10 stocks were positive. About 3.5 months of data, on stocks rather than the gold futures in the video."],
 "how": TV_STOCKS,
},
{
 "path": "setups/knock-twice.html", "name": "Knock Twice", "group": "Setups",
 "verdict": "thin", "chip": "Too few trades",
 "headline": "Too few trades to judge",
 "lead": "The rules are strict, so only 33 trades turned up in a 3.5-month test on 10 stocks. Its one-tick stops also got "
         "distorted by overnight gaps.",
 "stats": [["33", "trades, 5-minute"], ["Not judged", "too small a sample"]],
 "notes": ["A five-year run is still to do."],
 "how": TV_STOCKS,
},
{
 "path": "setups/liquidity-refill.html", "name": "Liquidity Refill", "group": "Setups",
 "verdict": "thin", "chip": "Can't be tested on bars",
 "headline": "Looked great, but the bars can't show the trigger",
 "lead": "On 5-minute bars it made +0.83R a trade. But the setup needs the wick in the first seconds of the candle, before the "
         "break. On 1-minute bars only 10 trades clearly had the wick first.",
 "stats": [["73", "trades, 5-minute"], ["51%", "win rate"], ["+0.83R", "average per trade"], ["10", "trades with the wick clearly first"]],
 "notes": ["Not judged. A fair test needs tick or second-by-second data."],
 "how": LOCAL,
},
{
 "path": "setups/gamma-wall-footprint.html", "name": "Gamma Wall Footprint", "group": "Setups",
 "verdict": "none", "chip": "Worse than random entries",
 "headline": "Lost money at the walls, and did worse than random entries",
 "lead": "We ran the indicator's rules on a year of NQ with real gamma walls and real footprints. The page's full recipe almost "
         "never lines up on a 5-minute chart. With any one footprint sign as the trigger, the wall fades lost about half a risk "
         "unit a trade, more than random entries with the same stops and targets.",
 "stats": [["70", "trades, NQ 5-minute, 1 year"], ["17%", "win rate"], ["&minus;0.40R", "average per trade", "neg"],
           ["&minus;0.16R", "random entries, same stops and targets"]],
 "table": {"head": ["Version", "Trades", "Avg R", "Random entries"],
           "rows": [["Entry rules: absorption, then a stack and a delta flip (the indicator's default)", "11", "+0.35R", "+0.34R"],
                    ["Any one footprint sign (the checklist's version)", "70", "&minus;0.40R", "&minus;0.16R"],
                    ["&nbsp;&nbsp;Put wall longs / call wall shorts", "32 / 28", "&minus;0.46R / &minus;0.50R", "&minus;0.20R / &minus;0.30R"],
                    ["&nbsp;&nbsp;Zero gamma break shorts", "10", "+0.09R", "+0.39R"],
                    ["Same rules, every level moved 1% up / down", "53 / 51", "&minus;0.19R / +0.31R", ""],
                    ["Stop capped at 50 ticks (the page's usual size)", "26", "&minus;0.57R", "&minus;0.17R"]]},
 "notes": ["The full entry recipe is rare. In a year, 199 wall touches turned into 2 wall trades: 29 slow touches showed "
           "absorption and none then printed the stack and the flip. The 11 trades are mostly zero gamma breaks, too few to judge.",
           "Fake walls did better than the real ones, so in this test the levels themselves didn't help the fade.",
           "The stop past the failed reaction was wider than the page's usual 30 to 50 ticks on 58 of 70 trades. Capping it at "
           "50 ticks made it worse: price ran through the tighter stops.",
           "Footprint rows of 1 point or 1 tick instead of the video's 5 points gave the same answer (&minus;0.42R and &minus;0.30R).",
           "Our earlier 1-minute tests on the same data agree: 761 wall touches over the year averaged &minus;0.08R, and no "
           "footprint sign made the fade better."],
 "how": ("NQ futures, Oct 6 2025 to Nov 24 2026: 234 trading days, OPEX and VIX expiration days skipped. 5-minute bars, regular "
         "hours. Put wall, call wall and zero gamma each morning from NQ's own CME options open interest, not the video's data "
         "provider. Footprints from every CME trade with its real buy or sell side, 9:30 to noon. Rules coded line for line from "
         "this page's indicator; exits walked on 1-minute bars; no commissions or slippage. Random entries: 200 per real trade, "
         "same day and side, any 5-minute close from 9:30 to 11:30, same stop and target distance."),
},
{
 "path": "setups/gex-levels.html", "name": "GEX Levels", "group": "Setups",
 "verdict": "mixed", "chip": "Levels matter, trades broke even",
 "headline": "Price reacts to the walls, but trading them broke even",
 "lead": "Every wall signal did better at the real gamma walls than at fake ones, so the levels carry information. Traded "
         "mechanically, they came out at about break-even. There are only six weeks of levels so far.",
 "stats": [["2,831", "signals, 43 tickers"], ["&minus;0.02R", "average, all signals"], ["&minus;0.11R", "same rules on fake levels"],
           ["+0.14R", "best signal: put wall breakdown", "pos"]],
 "table": {"head": ["Signal", "Trades", "Real levels", "Fake levels (avg)"],
           "rows": [["Put wall breakdown (short)", "492", "+0.14R", "0.00R"],
                    ["Call wall rejection (short)", "451", "+0.02R", "&minus;0.08R"],
                    ["Put wall hold (long)", "685", "&minus;0.06R", "&minus;0.23R"],
                    ["Flip reclaim (long)", "277", "&minus;0.08R", ""],
                    ["Flip retest hold (long)", "203", "&minus;0.32R", ""]]},
 "notes": ["The put wall breakdown isn't proven: fake levels ranged up to +0.18R, and it lost in 2 of the 7 weeks.",
           "The warning about fading below the flip didn't show here: wall fades did the same above and below it.",
           "This is a first look. It gets re-run as more daily levels build up."],
 "how": ("Recorded GEX levels for 43 tickers, Oct 8 to Nov 17 2026, on 2-minute bars. Each bar uses that day's newest levels, "
         "never yesterday's. Enter at the signal close, stop past the level, target the next level, skip anything under 1R, "
         "flat at 4:00. Fake levels: each day's levels shifted together by a random 0.5 to 2%."),
},

# ============================ FUNDAMENTALS ============================
{
 "path": "level-radar.html", "name": "Level Radar", "group": "Fundamentals",
 "verdict": "info", "chip": "Accurate on SPY/QQQ",
 "headline": "Well calibrated on index ETFs, too hopeful on single stocks",
 "lead": "We checked whether its odds come true. On SPY and QQQ a level marked 60 to 70% got touched about 62% of the time. On "
         "single stocks the odds ran 8 to 11 points too high in the middle range.",
 "stats": [["+29%", "better than a flat forecast (Brier score), SPY/QQQ", "pos"], ["1&ndash;3 pts", "typical miss, SPY/QQQ"],
           ["8&ndash;11 pts", "too optimistic, single stocks", "neg"]],
 "table": {"head": ["Radar said", "SPY/QQQ touched", "10 stocks touched"],
           "rows": [["10&ndash;20%", "15.2%", "7.9%"], ["40&ndash;50%", "42.7%", "34.5%"], ["60&ndash;70%", "62.1%", "55.6%"],
                    ["80&ndash;90%", "84.7%", "80.6%"], ["90&ndash;100%", "94.6%", "93.5%"]]},
 "notes": ["Yesterday's high and low got touched less than forecast (about 40% against 48%). The overnight high and low and "
           "the opening range ran about 6 points optimistic.",
           "Its built-in history is index futures, which is why it fits SPY and QQQ better than single stocks.",
           "It's a good map of what's likely today. It isn't a trade signal on its own."],
 "how": "The script's odds model coded from its Pine, run on 5-minute bars of SPY, QQQ and 10 large-cap stocks, 2021 to 2026, and scored like its own scoreboard.",
},
{
 "path": "seven-trading-traps.html", "name": "Seven Trading Traps", "group": "Fundamentals",
 "verdict": "none", "chip": "Regime filter: no help",
 "headline": "The QQQ regime filter, tested on a setup",
 "lead": "We added trap 2's filter (longs only with QQQ above its 20 and 50-day averages and within 10% of its high) to the Zero "
         "Lag Pullback. It cut about 60% of the trades and didn't improve the ones that were left.",
 "stats": [["446 &rarr; 160", "trades, SPY 5-minute"], ["+0.01R", "without the filter"], ["&minus;0.02R", "with it"]],
 "notes": ["One setup, one market. It says the filter didn't rescue a setup with no edge, not that it's useless as a risk check.",
           "It didn't help the Qullamaggie Breakout either."],
 "how": TV_GRID,
},
{
 "path": "relative-volume.html", "name": "Relative Volume", "group": "Fundamentals",
 "verdict": "none", "chip": "RVOL filter: no help",
 "headline": "An RVOL filter, tested on a setup",
 "lead": "We required cumulative RVOL of at least 1.0 at the signal on the Zero Lag Pullback (on top of a market-regime filter). "
         "It made the result worse, on a small sample.",
 "stats": [["44", "trades left, SPY 5-minute"], ["&minus;0.02R", "regime filter only"], ["&minus;0.18R", "regime + RVOL &ge; 1", "neg"]],
 "notes": ["44 trades is too few to say much. RVOL is a filter for picking stocks in play, and this test couldn't pick stocks."],
 "how": TV_GRID,
},
{
 "path": "let-winners-run.html", "name": "Let Winners Run", "group": "Fundamentals",
 "verdict": "none", "chip": "ATR trail lagged",
 "headline": "The ATR trail, tested as an exit",
 "lead": "On the Energy in the Tank breakout, rule 2's ATR trail took small wins often. Holding until a daily close back under "
         "the breakout made far more per trade.",
 "stats": [["166", "trades, 13 large caps, daily"], ["45%", "win rate with the trail"], ["+0.36%", "a trade with the ATR trail"],
           ["+2.3 to +3.9%", "a trade with the setup's own exit", "pos"]],
 "notes": ["It fits Linda Raschke's point that a trailing stop is rarely the best exit for a trend trade."],
 "how": "TradingView backtest of 13 large caps on daily bars, 2010 to 2026, 1 bp a side.",
},

# ========================== FAMOUS STRATEGIES ==========================
{
 "path": "famous-strategies/opening-range-breakout.html", "name": "Opening Range Breakout", "group": "Famous strategies",
 "verdict": "mixed", "chip": "Small edge on QQQ",
 "headline": "A small edge on QQQ, losses on single stocks",
 "lead": "On QQQ with 1-minute bars it beat random-direction entries by about 0.14R a trade. On the 10 stocks and on SPY it lost.",
 "stats": [["1,158", "trades, QQQ 1-minute"], ["+0.07R", "average per trade", "pos"], ["&minus;0.07R", "random direction, same exits", "neg"],
           ["&minus;0.12R", "SPY", "neg"]],
 "table": {"head": ["Test", "Avg R"],
           "rows": [["QQQ, 1-minute bars", "+0.07R"], ["QQQ before / after June 2024", "+0.01R / +0.12R"],
                    ["QQQ, 5-minute bars", "&minus;0.22R"], ["10 stocks, in-play days", "&minus;0.20R"],
                    ["10 stocks, all days", "&minus;0.14R"], ["SPY", "&minus;0.12R"]]},
 "notes": ["Bar size matters: the stop is 10% of ATR, which is too tight for 5-minute candles.",
           "The paper scanned 7,000 stocks for the 20 most in play each day. This test only had 10 stocks, SPY and QQQ."],
 "how": FAMOUS,
},
{
 "path": "famous-strategies/can-slim.html", "name": "CAN SLIM", "group": "Famous strategies",
 "verdict": "mixed", "chip": "Slightly better than random",
 "headline": "A little better than random entries",
 "lead": "The price and volume rules on the whole market made +1.3% a trade. Random entries on the same days with the same exits "
         "made +0.4 to +1.1%.",
 "stats": [["2,474", "trades, price and volume rules"], ["+1.3%", "a trade", "pos"], ["+0.4 to +1.1%", "random entries"],
           ["+1.7%", "with the earnings letters (140 trades)", "pos"]],
 "notes": ["Adding C, A and ROE of 17% or more from SEC filings lifted it to +1.7% a trade, but on only 140 trades."],
 "how": FAMOUS,
},
{
 "path": "famous-strategies/magic-formula.html", "name": "Magic Formula", "group": "Famous strategies",
 "verdict": "mixed", "chip": "Beat the average stock, not SPY",
 "headline": "Beat the average stock, but not the S&amp;P 500",
 "lead": "The top 30 stocks, held a year, made about twice the equal-weight market's return. Holding SPY still did better.",
 "stats": [["+11.3%", "a year, 2022&ndash;26", "pos"], ["+5.7%", "equal-weight market"], ["+13.0%", "SPY"]],
 "how": FAMOUS,
},
{
 "path": "famous-strategies/value-and-size.html", "name": "Value and Size", "group": "Famous strategies",
 "verdict": "mixed", "chip": "Value positive, size flat",
 "headline": "Value worked, small caps didn't",
 "lead": "Cheap stocks beat expensive ones by about 6% a year over the five years. Small stocks barely beat big ones.",
 "stats": [["+6.2%", "a year, value minus growth", "pos"], ["+1.6%", "a year, small minus big"]],
 "how": FAMOUS,
},
{
 "path": "famous-strategies/low-volatility.html", "name": "Low-Volatility", "group": "Famous strategies",
 "verdict": "mixed", "chip": "Lower risk, lower return",
 "headline": "Smaller drops, smaller gains",
 "lead": "The calmest 20% of stocks did what the papers say on risk: the worst drop was only 10%. But they made well under the "
         "average stock.",
 "stats": [["+7.7%", "a year, calmest 20%"], ["&minus;10%", "worst drop"], ["+12.9%", "equal-weight market"]],
 "how": FAMOUS,
},
{
 "path": "famous-strategies/ten-month-sma.html", "name": "10-Month SMA", "group": "Famous strategies",
 "verdict": "mixed", "chip": "Smaller drops, trails holding",
 "headline": "Cut the drops, and the gains with them",
 "lead": "On SPY alone it made about half of buy and hold. Across five assets it halved the worst drop but trailed holding them.",
 "stats": [["+9.5%", "a year, SPY timed"], ["+17.6%", "SPY held"], ["+6.8%", "a year, 5 assets timed"], ["+10.0%", "5 assets held"]],
 "notes": ["Worst drop across the five assets: &minus;3.6% timed against &minus;7.7% held.",
           "Timing rules earn their keep in long bear markets, and these five years didn't have one."],
 "how": FAMOUS,
},
{
 "path": "famous-strategies/dual-momentum.html", "name": "Dual Momentum", "group": "Famous strategies",
 "verdict": "none", "chip": "Trails holding SPY",
 "headline": "Trailed simply holding SPY",
 "lead": "Switching between US stocks, foreign stocks and bonds made a solid return, but less than staying in SPY.",
 "stats": [["+13.8%", "a year, GEM"], ["+17.6%", "a year, SPY held"]],
 "how": FAMOUS,
},
{
 "path": "famous-strategies/sector-rotation.html", "name": "Sector Rotation", "group": "Famous strategies",
 "verdict": "none", "chip": "Within noise",
 "headline": "About the same as holding every sector",
 "lead": "Holding the top 3 of the 11 sector SPDRs beat an equal mix of all of them by about a point a year, which is within the "
         "noise for five years of monthly results.",
 "stats": [["+15.6%", "a year, top 3"], ["+14.5%", "a year, all 11 sectors"]],
 "how": FAMOUS,
},
{
 "path": "famous-strategies/cross-sectional-momentum.html", "name": "Cross-Sectional Momentum", "group": "Famous strategies",
 "verdict": "none", "chip": "Trails the market",
 "headline": "Positive, but no better than holding the market",
 "lead": "Long the last year's winners and short the losers made money, with a rougher ride and less return than simply owning "
         "every stock.",
 "stats": [["+8.4%", "a year, 12-1 long-short"], ["0.44", "Sharpe ratio"], ["+9.9%", "equal-weight market (Sharpe 0.66)"],
           ["+5.2%", "a year, the paper's 6/6 version"]],
 "how": FAMOUS,
},
{
 "path": "famous-strategies/post-earnings-drift.html", "name": "Post-Earnings Drift", "group": "Famous strategies",
 "verdict": "none", "chip": "Weak",
 "headline": "A weak drift, positive about half the time",
 "lead": "The biggest earnings surprises beat the biggest misses by about 1% over the next 60 days, and that held in only 11 of "
         "20 quarters.",
 "stats": [["+1.0%", "per 60 days, top minus bottom tenth"], ["11 of 20", "quarters positive"]],
 "notes": ["The surprise was measured from the 10-Q filing date, which comes after the press release, so some of the drift "
           "had already happened. Consensus estimates weren't available."],
 "how": FAMOUS,
},
{
 "path": "famous-strategies/pairs-trading.html", "name": "Pairs Trading", "group": "Famous strategies",
 "verdict": "none", "chip": "No edge",
 "headline": "Lost a little on each pair trade",
 "lead": "Entering at a z-score of 2 and exiting on the return to the mean lost about a fifth of a percent per trade after costs.",
 "stats": [["1,457", "pair trades"], ["&minus;0.19%", "a trade", "neg"]],
 "how": FAMOUS,
},
{
 "path": "famous-strategies/rsi-2.html", "name": "RSI(2)", "group": "Famous strategies",
 "verdict": "thin", "chip": "Too few trades",
 "headline": "Works as described, but too rare to judge",
 "lead": "It won 80% of the time on SPY and QQQ, as the book says, but it only fired about 20 times on each in five years.",
 "stats": [["20", "trades each, SPY and QQQ"], ["80%", "win rate"], ["+1.0%", "a trade, SPY", "pos"], ["+0.7%", "a trade, QQQ", "pos"]],
 "how": FAMOUS,
},
{
 "path": "famous-strategies/intraday-momentum.html", "name": "Intraday Momentum", "group": "Famous strategies",
 "verdict": "none", "chip": "No edge",
 "headline": "The first half hour didn't predict the last",
 "lead": "Trading the last half hour in the direction of the morning was right on 49% of days, and slightly negative overall.",
 "stats": [["49%", "of days right"], ["&minus;0.01%", "a day, SPY"], ["&minus;0.02%", "a day, QQQ"]],
 "how": FAMOUS,
},
{
 "path": "famous-strategies/turn-of-the-month.html", "name": "Turn of the Month", "group": "Famous strategies",
 "verdict": "none", "chip": "No edge here",
 "headline": "The turn of the month wasn't special in these years",
 "lead": "The days around the turn are 19% of trading days and made 9.8% in total. The rest of the month made 46.9%, so the turn "
         "earned about its share and no more.",
 "stats": [["+9.8%", "total, turn-of-month days"], ["19%", "of trading days"], ["+46.9%", "total, the rest of the month"]],
 "how": FAMOUS,
},
{
 "path": "famous-strategies/overnight-effect.html", "name": "Overnight Effect", "group": "Famous strategies",
 "verdict": "mixed", "chip": "Trails holding",
 "headline": "Nights beat days before costs, and both trail holding",
 "lead": "Holding SPY only overnight made +33% before costs and +17.3% after them. The daytime made +18.2%, and simply holding made +58.3%.",
 "stats": [["+33%", "nights, before costs"], ["+17.3%", "nights, after costs"], ["+18.2%", "days"], ["+58.3%", "SPY held", "pos"]],
 "notes": ["Trading in and out every day costs about half of the overnight return."],
 "how": FAMOUS,
},
]
