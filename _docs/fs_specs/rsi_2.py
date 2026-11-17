from fs_build import panel, pair, calc, qb
import fs_mock as M


def mock():
    p = []
    import random
    random.seed(4)
    path = [(0, 100), (10, 104), (16, 101.5), (24, 106), (30, 103.2), (38, 108), (44, 105.4), (52, 110), (59, 112)]
    def tr(i):
        for k in range(1, len(path)):
            if i <= path[k][0]:
                a, b = path[k - 1], path[k]
                return a[1] + (b[1] - a[1]) * (i - a[0]) / (b[0] - a[0])
        return path[-1][1]
    vals = [tr(i) + random.uniform(-0.5, 0.5) for i in range(60)]
    X, Y = M.scale(vals, 16, 352, 44, 296, 94, 114)
    p.append(M.candles(vals, X, Y, seed=5, w=3.2))
    p.append(M.ln(16, Y(96), 352, Y(101), "#f4b942", 2))
    p.append(M.pl([(X(i), Y(sum(vals[i - 4:i + 1]) / 5)) for i in range(4, 60)], "#86868b", 1.2))
    for i, lab in ((16, "buy"), (30, "buy"), (44, "buy")):
        p.append(M.r(X(i) - 22, Y(vals[i]) + 14, 44, 26, "#2997ff", 0.95, 4))
        p.append(M.t(X(i), Y(vals[i]) + 25, "RSI(2) 3", "#fff", 8.5, "middle", 700))
        p.append(M.t(X(i), Y(vals[i]) + 35, lab, "#fff", 8.5, "middle", 600))
    for i in (20, 33, 47):
        p.append(M.r(X(i) - 20, Y(vals[i]) - 30, 40, 16, "#30d158", 0.9, 4))
        p.append(M.t(X(i), Y(vals[i]) - 19, "exit +1.4%", "#fff", 8, "middle", 700))
    p.append(M.t(352, Y(101) + 14, "200-day", "#f4b942", 10, "end", 700))
    p.append(M.t(16, 24, "RSI(2) &#183; daily", "#86868b", 12))
    rows = [
        ([("RSI(2)", "#86868b"), ("3.8", "#2997ff")], "#1d1d1f"),
        ([("Trend (200-day)", "#86868b"), ("above: buys only", "#30d158")], "#1d1d1f"),
        ([("Exit line (5-day)", "#86868b"), ("109.42", "#f5f5f7")], "#1d1d1f"),
        ([("Position", "#86868b"), ("long from 108.10", "#f5f5f7")], "#1d1d1f"),
        ([("Days held", "#86868b"), ("1", "#f5f5f7")], "#1d1d1f"),
    ]
    p.append(M.table(368, 40, rows, widths=(100, 100)))
    return M.svg("An illustrative mock of the indicator: made-up daily candles above a rising 200-day average, blue buy labels where RSI(2) dropped to about 3, green exit labels a few days later where price closed above the 5-day average, and a table showing RSI(2), the trend, the exit line, the position and days held.", p)


SPEC = {
    "slug": "rsi-2",
    "name": "RSI(2)",
    "seo_title": "RSI(2) Pullback Strategy (Larry Connors), Explained",
    "desc": "Larry Connors' RSI(2) strategy: buy an index ETF like SPY or QQQ above its 200-day average when the 2-period RSI drops to 5 or below, and sell on the first close above the 5-day average. Short, frequent trades with a high hit rate and no stop loss. Animated walkthroughs plus a free TradingView indicator.",
    "kicker": "Famous strategies &middot; ETFs &middot; Larry Connors &amp; Cesar Alvarez, 2008",
    "h1": "RSI<span>(2)</span>",
    "thesis": "In a rising market, sharp two- or three-day pullbacks in an index tend to snap back. A 2-period RSI finds them. Buy when it's deeply oversold and the long-term trend is up, and get out on the first bounce.",
    "thesis_em": "Buy the dip, but only in an uptrend.",
    "counts": [("2", "days in the RSI, not the usual 14"), ("&le; 5", "the buy level Connors preferred"), ("200", "days in the trend filter")],
    "ribbon": ["Above the 200-day", "RSI(2) at or below 5", "Buy near the close", "Out above the 5-day average", "Size for no stop"],
    "facts": [
        ("book", "<i>Short Term Trading Strategies That Work</i> (2008)"),
        ("authors", "Larry Connors and Cesar Alvarez"),
        ("market", "Index ETFs such as SPY and QQQ, daily bars"),
        ("trend", "Buy only above the 200-day simple moving average"),
        ("entry", "RSI(2) at or below 5 (tested 0&ndash;10), near the close"),
        ("exit", "The first close above the 5-day simple moving average"),
        ("stops", "None: Connors found stops hurt results on indexes"),
        ("shorts", "Mirror image below the 200-day, RSI(2) at or above 95"),
    ],
    "blocks": [
        {"type": "head", "id": "rsi", "h2": "A very short RSI", "p": "The Relative Strength Index compares recent gains with recent losses. Connors' change was to look back two days instead of fourteen, which turns a slow gauge into one that hits extremes on almost every pullback."},
        {"type": "anim", "key": "rsi", "title": "RSI(2) next to price", "aria": "A made-up index ETF in an uptrend with its 2-period RSI underneath, dropping under 10 on each short pullback, compared with a 14-day RSI that barely moves."},
        {"type": "head", "id": "trade", "h2": "One trade", "p": "The rules fit on an index card: a trend filter, an oversold entry and a simple exit."},
        {"type": "anim", "key": "trade", "title": "Buy the dip, sell the bounce", "aria": "A made-up index ETF above its 200-day average falls three days in a row, RSI(2) drops under 5, it's bought near the close and sold a few days later on the first close above its 5-day average."},
        {"type": "main", "stage": {"h3": "The rule", "li": [
            "Use daily bars of a broad index ETF, such as SPY or QQQ. Only buy when the close is above the 200-day simple moving average.",
            "Buy when the 2-period RSI closes at or below 5. Connors tested levels from 0 to 10; the lower the reading, the better the results.",
            "Sell on the first close above the 5-day simple moving average. Connors entered just before the close and used no stop loss.",
        ], "why": "Index funds hold hundreds of stocks, so short pullbacks in an uptrend are usually noise rather than news. Buying the noise and selling the bounce is a bet on that mean reversion."},
            "right": [
                panel("Two kinds of strategy", "Where RSI(2) sits.", pair(
                    ("yes", "mean reversion", "Buy weakness", "RSI(2) buys after a drop and sells into strength, within a few days."),
                    ("care", "trend following", "Buy strength", "The 10-month average and momentum pages buy what's rising and hold for months."))),
                calc("Our run of the indicator", "SPY daily, about the last 12 years, default settings.", [("Trades", "127"), ("Winners", "80%"), ("Average trade", "+0.77%"), ("Costs, slippage, dividends", "not included", "tot")]),
            ]},
        {"type": "head", "id": "filter", "h2": "Why the 200-day", "p": "Without the trend filter, the same signals would buy every leg of a bear market. The 200-day average keeps the strategy on the side of the long-term trend."},
        {"type": "anim", "key": "filter", "title": "Dips in a downtrend", "aria": "A made-up index ETF below its falling 200-day average: RSI(2) drops under 5 on every leg down, prices keep falling, and the filter crosses out every buy signal."},
        {"type": "head", "id": "odds", "h2": "What it's like to trade", "p": "The appeal is a high win rate and short holds. The cost is the occasional dip that keeps going, with no stop in the rules to cap it."},
        {"type": "anim", "key": "odds", "title": "Many small wins", "aria": "Twenty made-up RSI(2) trades: seventeen small gains, two small losses and one loss of 5.2%, with a running total that still ends positive."},
        {"type": "four", "cards": [
            ("#30d158", "hit rate", "High", "Our SPY run of the indicator: 80% of 127 trades won, before costs."),
            ("#2997ff", "holding time", "A few days", "Out on the first close above the 5-day average, usually within a week."),
            ("#ff453a", "the risk", "No stop", "Losses are rare but can be several times a typical win. Size for them."),
            ("#f4b942", "where", "Index ETFs", "Diversified funds such as SPY and QQQ, not single stocks with news risk."),
        ]},
        {"type": "timeline", "items": [
            ("#2997ff", "1978", "RSI", "J. Welles Wilder introduces the Relative Strength Index, with a 14-day lookback."),
            ("#30d158", "2000s", "Connors Research", "Larry Connors tests short-term oversold setups on stocks and index funds."),
            ("#f4b942", "2008", "<i>Short Term Trading Strategies That Work</i>", "Connors and Alvarez publish the 2-period RSI rules: 200-day filter, RSI(2) entry, 5-day exit."),
            ("#2997ff", "Since", "A standard test", "RSI(2) becomes one of the most widely tested mean-reversion rules for index ETFs."),
        ]},
    ],
    "steps": [
        {"h3": "Trend", "li": ["Daily chart of SPY or QQQ.", "Only buy when the close is above the 200-day simple moving average."], "why": "Dips in an uptrend tend to bounce."},
        {"h3": "Dip", "li": ["Wait for the 2-period RSI to close at or below 5.", "Usually two or three down days in a row."], "why": "A short, sharp pullback."},
        {"h3": "Buy", "li": ["Buy near the close of the signal day.", "Or at the next open, accepting the gap."], "why": "Connors entered just before the close."},
        {"h3": "Exit", "li": ["Sell on the first close above the 5-day simple moving average.", "No profit target."], "why": "Take the bounce, not the trend."},
        {"h3": "Size", "li": ["There's no stop in the rules.", "Keep positions small enough to survive a dip that keeps going."], "why": "The rare loser decides the result."},
    ],
    "indicator": {
        "note": "One TradingView script for this strategy (Pine Script v6). It plots the 200-day and 5-day averages, marks every RSI(2) buy and exit with the trade's gain or loss, and alerts on both. It marks and alerts. It doesn't place trades.",
        "name": "RSI(2) Pullback",
        "blurbs": [
            "On the chart: the 200-day average (the trend filter) and the 5-day average (the exit), a buy label with the RSI(2) reading on each signal, and an exit label with the trade's percentage gain or loss. Open trades are shaded.",
            "A table with today's RSI(2), whether the trend allows buys, the exit line, the open position and days held. Settings let you change the buy level, add Connors' mirror-image shorts below the 200-day, or add a time stop.",
            "<span style=\"color:var(--ash)\">On SPY daily bars over about the last 12 years, the default settings marked 127 trades, 80% of them winners, averaging +0.77% each, before costs and without dividends. That's our run of this indicator, not a published study.</span>",
        ],
        "mock": mock(),
        "howto": [
            "Copy the code below, or download the .pine file.",
            "In TradingView, open the Pine Editor at the bottom of a chart, paste it in, and click <b>Add to chart</b>.",
            "Use a daily chart of a broad index ETF such as SPY or QQQ.",
            "To get alerted, create an alert on the chart and pick <b>RSI(2) buy</b> or <b>RSI(2) exit long</b>. Connors acted just before the close, so set the alert to fire on each update.",
        ],
    },
    "related": [
        ("/famous-strategies/ten-month-sma.html", "#f4b942", "famous strategy", "10-Month Moving Average", "The opposite style: a slow trend filter held for months."),
        ("/famous-strategies/sector-rotation.html", "#2997ff", "famous strategy", "Sector Rotation", "Momentum on ETFs instead of mean reversion."),
        ("/setups/vwap-reversal.html", "#30d158", "setup", "VWAP Reversal", "Mean reversion on an intraday chart."),
        ("/famous-strategies/opening-range-breakout.html", "#ff9f0a", "famous strategy", "Opening Range Breakout", "A short-term strategy that buys strength instead."),
    ],
    "rule": {
        "h2": "Try it on paper first.",
        "p": "Put the indicator on a daily SPY chart and write down every signal for three months: the RSI(2) reading, your entry, the exit and the result. Note the worst trade and how many average winners it cost.",
        "li": ["Only take signals above the 200-day.", "Exit on the first close above the 5-day.", "Size so the worst trade you've seen wouldn't change your plan."],
    },
    "sources": [
        "Connors, L. &amp; Alvarez, C. (2008). <i>Short Term Trading Strategies That Work</i>. TradingMarkets.<small>The 2-period RSI strategy: buy above the 200-day moving average when RSI(2) is oversold, exit on a close above the 5-day moving average; entries near the close; no stop loss.</small>",
        "StockCharts ChartSchool. RSI(2).<small>Summary of Connors' rules: 200-day filter, buy at or below 5 (tested 0&ndash;10), short at or above 95 (tested 90&ndash;100), exit at the 5-day moving average; lower buy levels gave higher returns; Connors found stops hurt performance.</small>",
        "Wilder, J. W. (1978). <i>New Concepts in Technical Trading Systems</i>. Trend Research.<small>The Relative Strength Index.</small>",
    ],
    "src": "Built from the book and the sources listed above. Every bar and trade in the walkthroughs is made up for illustration. The SPY figures are from our own TradingView run of the indicator on this page, not from a published study, and exclude costs, slippage and dividends. Past results don't promise future returns. It's shared for education, not as trading advice.",
    "market": "ETFs",
    "who": "Larry Connors",
    "card": "Above the 200-day, buy when the 2-period RSI drops to 5 or below; sell on the first close above the 5-day average.",
}
