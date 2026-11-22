from fs_build import panel, pair, calc, qb
import fs_mock as M


def mock():
    p = []
    import random
    random.seed(5)
    path = [(0, 50.4), (1, 50.75), (3, 50.95), (10, 51.3), (20, 51.1), (32, 52.0), (44, 52.4), (56, 52.2), (66, 53.0), (77, 53.4)]
    def tr(i):
        for k in range(1, len(path)):
            if i <= path[k][0]:
                a, b = path[k - 1], path[k]
                return a[1] + (b[1] - a[1]) * (i - a[0]) / (b[0] - a[0])
        return path[-1][1]
    vals = [tr(i) + random.uniform(-0.12, 0.12) for i in range(78)]
    X, Y = M.scale(vals, 16, 352, 44, 296, 50.0, 53.8)
    p.append(M.r(16, 44, X(1) - 16, 252, "#2997ff", 0.12))
    p.append(M.candles(vals, X, Y, seed=4, w=2.6))
    p.append(M.ln(X(1), Y(50.82), 352, Y(50.82), "#30d158", 2))
    p.append(M.ln(X(1), Y(50.12), 352, Y(50.12), "#ff453a", 2))
    p.append(M.ln(X(3), Y(50.61), 352, Y(50.61), "#f4b942", 1.4, "4 4"))
    p.append(M.r(X(3) - 4, Y(50.95) + 26, 64, 30, "#30d158", 0.95, 6))
    p.append(M.t(X(3) + 28, Y(50.95) + 39, "ORB long", "#fff", 10, "middle", 700))
    p.append(M.t(X(3) + 28, Y(50.95) + 51, "RV 412%", "#fff", 10, "middle", 600))
    p.append(M.t(352, Y(50.82) - 5, "range high", "#30d158", 10, "end", 700))
    p.append(M.t(352, Y(50.12) + 12, "range low", "#ff453a", 10, "end", 700))
    p.append(M.t(352, Y(50.61) + 12, "stop 10% ATR", "#f4b942", 10, "end", 700))
    p.append(M.t(16, 24, "ORB &#183; 5-minute", "#86868b", 12))
    rows = [
        ([("Range (5 min)", "#86868b"), ("50.12 &#8211; 50.82", "#f5f5f7")], "#1d1d1f"),
        ([("First candle", "#86868b"), ("green: longs only", "#30d158")], "#1d1d1f"),
        ([("Relative volume", "#86868b"), ("412%", "#30d158")], "#1d1d1f"),
        ([("14-day ATR", "#86868b"), ("2.10", "#f5f5f7")], "#1d1d1f"),
        ([("Stop distance", "#86868b"), ("0.21", "#f4b942")], "#1d1d1f"),
        ([("In play", "#86868b"), ("yes", "#30d158")], "#1d1d1f"),
        ([("Position", "#86868b"), ("long from 50.82", "#f5f5f7")], "#1d1d1f"),
    ]
    p.append(M.table(368, 40, rows, widths=(92, 92)))
    return M.svg("An illustrative mock of the indicator: made-up 5-minute candles with the first five minutes shaded, green and red lines at the opening range high and low, a dashed stop 10% of ATR under the entry, an ORB long label with relative volume 412%, and a table showing the range, a green first candle, relative volume, ATR, stop distance, in play yes and a long position.", p)


SPEC = {
    "slug": "opening-range-breakout",
    "name": "Opening Range Breakout",
    "seo_title": "Opening Range Breakout (ORB) on Stocks in Play",
    "desc": "The opening range breakout from Crabel to Zarattini (2024): trade the first 5-minute candle's break on stocks in play only. Results and an indicator.",
    "kicker": "Famous strategies &middot; Stocks &middot; Crabel 1990 &middot; Zarattini, Barbon &amp; Aziz 2024",
    "h1": "Opening Range <span>Breakout</span>",
    "thesis": "The first minutes of the session are when overnight news gets priced. On a stock with real news, the direction of the first five minutes tends to continue. Trade the break of that first candle, keep the stop tight, and hold to the close, but only on stocks in play.",
    "thesis_em": "The first five minutes set the day.",
    "counts": [("5", "minutes: the range that worked best"), ("1,637%", "net, 2016&ndash;2023, on stocks in play"), ("29%", "the same rules on every stock")],
    "ribbon": ["Find stocks in play", "Read the first candle", "Stop order at its high or low", "Stop at 10% of ATR", "Out at the close"],
    "facts": [
        ("origin", "Toby Crabel, <i>Day Trading with Short Term Price Patterns and Opening Range Breakout</i>, 1990"),
        ("tested by", "Zarattini, Barbon &amp; Aziz, 2024; Zarattini &amp; Aziz, 2023 (QQQ)"),
        ("data", "7,000+ US stocks, 2016&ndash;2023, with commissions"),
        ("filter", "Relative volume 100%+, top 20 a day"),
        ("entry", "Stop order at the first 5-minute candle's high (green) or low (red)"),
        ("stop", "10% of the 14-day ATR, sized to risk 1% of capital"),
        ("exit", "At the 4:00 pm close; no profit target"),
        ("headline", "Sharpe 2.81, beta 0.00, worst drawdown 12%"),
    ],
    "blocks": [
        {"type": "head", "id": "rules", "h2": "Five minutes, one side", "p": "Crabel's idea was simple: mark the range of the open and trade whichever way price breaks it. The modern version tested by Zarattini, Barbon and Aziz uses the first 5-minute candle twice: its color picks the side, and its high or low is the entry."},
        {"type": "anim", "key": "candle", "title": "One day, one stock", "aria": "A made-up stock in play makes a green first 5-minute candle, a buy stop sits at its high of 50.82, the order fills with a stop 21 cents lower (10% of a 2.10 ATR), and the position rides to the 4:00 pm close near 53.40."},
        {"type": "main", "stage": {"h3": "The rule", "li": [
            "At 9:35, look at the first 5-minute candle. Green: longs only today. Red: shorts only. A doji: no trade.",
            "Place a stop order to buy at its high (or sell short at its low). If price never gets there, there's no trade.",
            "Stop loss 10% of the stock's 14-day ATR from the entry, sized so a stop-out costs 1% of capital. No target: close whatever is left at 4:00 pm.",
        ], "why": "A tight stop with no target means many small losses and a few days that pay several times the risk. It only adds up on stocks with a reason to trend."},
            "right": [
                panel("Two tests, one idea", "The same authors ran it twice.", pair(
                    ("yes", "2024: stocks in play", "1,637% net", "The 20 US stocks with the highest relative volume each day, 2016&ndash;2023. Sharpe 2.81, annual alpha 35.8%."),
                    ("care", "2023: QQQ", "1,484% vs 169%", "The Nasdaq-100 ETF, with leverage up to 4x and a 10R target, against 169% for holding QQQ over the same years."))),
                calc("The made-up trade", "The walkthrough's numbers.", [("Buy stop (first candle's high)", "$50.82"), ("14-day ATR", "$2.10"), ("Stop (10% of ATR below)", "$50.61"), ("Risk per share", "$0.21"), ("Closed at 4:00 pm", "$53.40, about 12R", "tot")]),
            ]},
        {"type": "head", "id": "inplay", "h2": "Only stocks in play", "p": "A stock in play is one trading far more than usual, usually because of news: earnings, an upgrade, a deal. The paper measured it with relative volume, and that filter turned out to be most of the result."},
        {"type": "anim", "key": "inplay", "title": "Relative volume at 9:35", "aria": "Nine made-up stocks ranked by relative volume, first-5-minute volume against their 14-day average; a 100% line drops the quiet ones, one stock fails the price, volume or ATR filter, and the top four are marked to trade."},
        {"type": "main", "stage": {"h3": "Finding stocks in play", "li": [
            "Relative volume: the first 5 minutes' volume divided by the average first-5-minute volume over the last 14 days. It has to be at least 100%.",
            "Basic filters: opening price over $5, 14-day average volume of at least 1 million shares, 14-day ATR over $0.50.",
            "Rank what's left by relative volume and trade the top 20.",
        ], "why": "Unusual volume at the open means new information is being priced. Those are the stocks most likely to keep going the way the open points."},
            "right": [
                qb("<b>The filter is the strategy.</b> On every stock that passed the basic filters, the same 5-minute rules made 29% in eight years. On the top 20 stocks by relative volume, they made 1,637%."),
                calc("The paper's setup", "Zarattini, Barbon &amp; Aziz, 2024.", [("Universe", "7,000+ US stocks"), ("Period", "2016&ndash;2023"), ("Starting capital", "$25,000"), ("Commission", "$0.0035 a share"), ("Maximum leverage", "4x", "tot")]),
            ]},
        {"type": "head", "id": "results", "h2": "What the backtest found", "p": "Every number in this chart is from the paper's tables, net of commissions. The bars use a square-root scale so the small results stay visible next to the big one."},
        {"type": "anim", "key": "results", "title": "Total return, 2016&ndash;2023", "title_plain": "Total return, 2016-2023", "aria": "Total returns from Zarattini, Barbon and Aziz, 2016 to 2023: 29% for the 5-minute ORB on every stock, 1,637% on the top 20 stocks in play, 272% with a 15-minute range, 21% with 30 minutes, 39% with 60 minutes, against 198% for the S&P 500."},
        {"type": "four", "cards": [
            ("#30d158", "5-minute, in play", "1,637%", "41.6% a year, Sharpe 2.81, annual alpha 35.8%, beta 0.00, worst drawdown 12%."),
            ("#2997ff", "15-minute, in play", "272%", "17.4% a year, Sharpe 1.43. Waiting for a longer range gave up most of the edge."),
            ("#86868b", "no filter", "29%", "3.2% a year, Sharpe 0.48. The same rules on every stock barely beat cash."),
            ("#f4b942", "S&amp;P 500", "198%", "14.2% a year, Sharpe 0.78, worst drawdown 34%."),
        ]},
        {"type": "head", "id": "odds", "h2": "Living with it", "p": "The result comes from a shape most traders find hard to sit through: more losing days than winning ones, and a few trend days that pay for everything."},
        {"type": "anim", "key": "odds", "title": "Lose often, win bigger", "aria": "Twenty made-up trades in R: thirteen losers capped at 1R or less, seven winners including trend days of 4.1R and 6.8R, and a running total that ends around plus 7R."},
        {"type": "timeline", "items": [
            ("#2997ff", "1990", "Toby Crabel", "<i>Day Trading with Short Term Price Patterns and Opening Range Breakout</i>: trading a break of a preset distance from the open."),
            ("#2997ff", "1990s&ndash;2000s", "Traders' staple", "The opening range becomes a standard intraday level, from 5 minutes to the first hour."),
            ("#30d158", "2023", "Zarattini &amp; Aziz", "The 5-minute ORB on QQQ: 1,484% against 169% for holding QQQ, 2016&ndash;2023."),
            ("#30d158", "2024", "Zarattini, Barbon &amp; Aziz", "Stocks in play: 1,637% net on the top 20 by relative volume, and 29% without the filter."),
        ]},
    ],
    "steps": [
        {"h3": "Scan", "li": ["At 9:35, rank stocks by relative volume: first-5-minute volume vs its 14-day average.", "Keep 100%+, over $5, 1M+ shares a day, ATR over $0.50."], "why": "Stocks with news are the ones that trend."},
        {"h3": "Side", "li": ["Green first 5-minute candle: longs only.", "Red: shorts only. Doji: skip it."], "why": "The open's direction is the bet."},
        {"h3": "Order", "li": ["Buy stop at the first candle's high, or sell stop at its low.", "No break, no trade."], "why": "Price has to confirm the direction first."},
        {"h3": "Stop", "li": ["10% of the 14-day ATR from the entry.", "Size it so a stop-out costs 1% of capital."], "why": "A small, fixed loss on every failure."},
        {"h3": "Close", "li": ["No profit target.", "Close what's left at 4:00 pm. Never hold overnight."], "why": "The trend days pay for the rest."},
    ],
    "indicator": {
        "note": "One TradingView script for this strategy (Pine Script v6). It marks the opening range, checks relative volume and the paper's filters, draws the entry and the 10% ATR stop, and alerts on the break. It marks and alerts. It doesn't place trades.",
        "name": "Opening Range Breakout",
        "blurbs": [
            "On the chart: the first 5 minutes shaded, the range high and low, and a long or short label when price breaks the side the first candle picked, with that day's relative volume. The stop is drawn 10% of the 14-day ATR from the entry, with labels when it's hit and when the day closes.",
            "A table with the range, the first candle's color, relative volume against the last 14 days' opening volume, the ATR, the stop distance, whether the stock counts as in play, and the open position.",
            "<span style=\"color:var(--ash)\">The paper picked the top 20 stocks in play from the whole market each morning. One chart can only check its own stock, so use a relative-volume scanner to find candidates and the indicator to trade them. The range can be set to 15, 30 or 60 minutes.</span>",
        ],
        "mock": mock(),
        "howto": [
            "Copy the code below, or download the .pine file.",
            "In TradingView, open the Pine Editor at the bottom of a chart, paste it in, and click <b>Add to chart</b>.",
            "Use a 1- or 5-minute chart of a US stock with regular trading hours only (extended hours off).",
            "To get alerted, create an alert on the chart and pick <b>ORB long</b>, <b>ORB short</b> or <b>ORB stop hit</b>.",
        ],
    },
    "related": [
        ("/setups/opening-range-break.html", "#30d158", "setup", "Opening Range Break", "The discretionary version of the same idea, step by step."),
        ("/relative-volume.html", "#2997ff", "fundamentals", "Relative Volume", "How to tell a stock in play from a quiet one."),
        ("/setups/gap-give-and-go.html", "#f4b942", "setup", "Gap Give and Go", "Another way to trade a stock in play in the first minutes."),
        ("/famous-strategies/can-slim.html", "#ff9f0a", "famous strategy", "CAN SLIM", "Breakouts on the daily chart instead of the first five minutes."),
    ],
    "rule": {
        "h2": "Try it on paper first.",
        "p": "Every morning for a month, write down the three stocks with the highest relative volume at 9:35, the color of each first candle, the entry and the stop. Mark each one at the stop or the close, in R, and compare your fills with the levels.",
        "li": ["Write the levels down before the break.", "Never widen the stop.", "Count your slippage in R: with a stop this tight it adds up fast."],
    },
    "sources": [
        "Zarattini, C., Barbon, A. &amp; Aziz, A. (2024). A Profitable Day Trading Strategy For The U.S. Equity Market. Swiss Finance Institute Research Paper No. 24-98. <a class=\"cite-link\" href=\"https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4729284\" target=\"_blank\" rel=\"noopener\">SSRN &rsaquo;</a><small>US stocks 2016&ndash;2023; the first 5-minute candle's direction; stop orders at its high or low; a stop 10% of the 14-day ATR from entry; exit at the close; 1% risk, 4x maximum leverage, $0.0035 a share commission; relative volume of 100%+ and the top 20; filters of $5, 1M shares and $0.50 ATR. Table results: 1,637% (IRR 41.6%, Sharpe 2.81, hit ratio 48.4%, MDD 12%, alpha 35.8%, beta 0.00); 15, 30 and 60 minutes 272%, 21%, 39%; no filter 29%; S&amp;P 500 198% (Sharpe 0.78, MDD 34%).</small>",
        "Zarattini, C. &amp; Aziz, A. (2023). Can Day Trading Really Be Profitable? Evidence of Sustainable Long-term Profits from Opening Range Breakout (ORB) Day Trading Strategy vs. Benchmark in the US Stock Market. SSRN 4416622. <a class=\"cite-link\" href=\"https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4416622\" target=\"_blank\" rel=\"noopener\">SSRN &rsaquo;</a><small>The 5-minute ORB on QQQ and TQQQ, 2016&ndash;2023: 1,484% against 169% for holding QQQ.</small>",
        "Crabel, T. (1990). <i>Day Trading with Short Term Price Patterns and Opening Range Breakout</i>. Traders Press. <a class=\"cite-link\" href=\"https://openlibrary.org/works/OL4182598W\" target=\"_blank\" rel=\"noopener\">Source &rsaquo;</a><small>The opening range breakout idea.</small>",
    ],
    "src": "Built from the papers listed above. Every stock, bar and trade in the walkthroughs is made up for illustration. The results chart and the result cards use the paper's published numbers, which are backtests with commissions; real fills on a stop this tight can cost a large share of each trade. Past results don't promise future returns. It's shared for education, not as trading advice.",
    "market": "Stocks",
    "who": "Crabel; Zarattini, Barbon, Aziz",
    "card": "Trade the break of the first 5-minute candle on stocks in play, a 10% ATR stop, out at the close.",
}
