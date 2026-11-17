from fs_build import panel, pair, calc, qb
import fs_mock as M


def mock():
    p = []
    import random
    random.seed(9)
    path = [(0, 100), (14, 124), (20, 128), (26, 112), (32, 102), (38, 112), (48, 132), (59, 146)]
    def tr(i):
        for k in range(1, len(path)):
            if i <= path[k][0]:
                a, b = path[k - 1], path[k]
                return a[1] + (b[1] - a[1]) * (i - a[0]) / (b[0] - a[0])
        return path[-1][1]
    vals = [tr(i) * (1 + random.uniform(-0.015, 0.015)) for i in range(60)]
    ma = [None if i < 9 else sum(vals[i - 9:i + 1]) / 10 for i in range(60)]
    X, Y = M.scale(vals, 16, 352, 44, 296, 92, 152)
    for i in range(10, 60):
        col = "#30d158" if vals[i - 1] > ma[i - 1] else "#ff453a"
        p.append(M.r(X(i) - 2.8, 44, 5.6, 252, col, 0.10))
    p.append(M.candles(vals, X, Y, seed=3, w=3.2))
    p.append(M.pl([(X(i), Y(ma[i])) for i in range(9, 60)], "#2997ff", 2))
    p.append(M.r(X(24) - 18, Y(vals[24]) - 36, 40, 18, "#ff453a", 0.95, 4))
    p.append(M.t(X(24) + 2, Y(vals[24]) - 23, "CASH", "#fff", 10, "middle", 700))
    p.append(M.r(X(36) - 14, Y(vals[36]) + 18, 28, 18, "#30d158", 0.95, 4))
    p.append(M.t(X(36), Y(vals[36]) + 31, "IN", "#fff", 10, "middle", 700))
    p.append(M.t(352, Y(ma[59]) + 14, "10-month SMA", "#2997ff", 10, "end", 700))
    p.append(M.t(16, 24, "10M SMA &#183; monthly", "#86868b", 12))
    rows = [
        ([("Last month's close", "#86868b"), ("vs 10M SMA", "#86868b"), ("", "#86868b")], "#141416"),
        ([("SPY (this chart)", "#f5f5f7"), ("+4.2%", "#86868b"), ("hold", "#30d158")], "#1d1d1f"),
        ([("US stocks", "#f5f5f7"), ("+4.2%", "#86868b"), ("hold", "#30d158")], "#1d1d1f"),
        ([("Foreign stocks", "#f5f5f7"), ("+2.8%", "#86868b"), ("hold", "#30d158")], "#1d1d1f"),
        ([("Bonds", "#f5f5f7"), ("&#8722;1.1%", "#86868b"), ("cash", "#ff453a")], "#1d1d1f"),
        ([("Real estate", "#f5f5f7"), ("+0.6%", "#86868b"), ("hold", "#30d158")], "#1d1d1f"),
        ([("Commodities", "#f5f5f7"), ("&#8722;3.4%", "#86868b"), ("cash", "#ff453a")], "#1d1d1f"),
        ([("Five-asset mix", "#86868b"), ("60% invested", "#f5f5f7"), ("40% cash", "#86868b")], "#141416"),
    ]
    p.append(M.table(368, 40, rows, widths=(96, 70, 40)))
    return M.svg("An illustrative mock of the indicator: made-up monthly prices with a blue 10-month moving average, green shading for invested months and red for cash, CASH and IN labels at the switches, and a table of five assets with their distance from the average, three on hold and two in cash, 60% invested.", p)


SPEC = {
    "slug": "ten-month-sma",
    "name": "10-Month Moving Average",
    "seo_title": "10-Month Moving Average Timing (Faber), Explained",
    "desc": "Mebane Faber's 10-month moving average rule: once a month, hold an asset if it closed above its 10-month average, move to T-bills if it closed below. On the S&P 500 since 1901, about the same return as holding with far smaller drawdowns, and a five-asset version. Animated walkthroughs plus a free TradingView indicator.",
    "kicker": "Famous strategies &middot; Stocks + ETFs &middot; Mebane Faber, 2007",
    "h1": "10-Month <span>Moving Average</span>",
    "thesis": "The worst stretches for stocks have tended to happen when prices were already below their long-term trend. Check once a month: if the price closed above its 10-month average, stay in. If it closed below, step aside into T-bills until it's back above.",
    "thesis_em": "One check a month.",
    "counts": [("10", "months in the average"), ("12", "checks a year, at the month-end close"), ("50% vs 84%", "worst S&amp;P 500 drawdown, timed vs held")],
    "ribbon": ["Wait for month-end", "Compare with the 10-month average", "Above: hold", "Below: T-bills", "Repeat for each asset"],
    "facts": [
        ("paper", "A Quantitative Approach to Tactical Asset Allocation, <i>Journal of Wealth Management</i>, 2007"),
        ("author", "Mebane Faber, updated in 2013"),
        ("signal", "Month-end close vs the 10-month simple moving average"),
        ("in cash", "90-day T-bills"),
        ("S&amp;P 500, 1901&ndash;2012", "10.2% a year timed vs 9.3% held"),
        ("risk", "Volatility 12.0% vs 17.9%; worst drawdown 50.3% vs 83.5%"),
        ("five assets, 1973&ndash;2012", "10.5% vs 9.9%; worst drawdown 9.5% vs 46.0%"),
        ("caveat", "Before trading costs and taxes"),
    ],
    "blocks": [
        {"type": "head", "id": "rule", "h2": "The whole rule", "p": "Faber wanted a rule simple enough to follow without judgment. It uses one number per month and one comparison, and the same rule works on any asset that has a price."},
        {"type": "anim", "key": "rule", "title": "Above or below", "aria": "A made-up monthly index with its 10-month average; months closing above are shaded green and invested, months closing below are shaded red and in cash, with a switch to cash and a switch back in marked."},
        {"type": "main", "stage": {"h3": "The rule", "li": [
            "On the last trading day of each month, compare the closing price with the average of the last ten month-end closes.",
            "If the close is above the average, own the asset for the next month. If it's below, sell and hold 90-day T-bills.",
            "Do nothing else until the next month-end. For several assets, run the rule on each one separately.",
        ], "why": "It's trend following at its simplest: stay with the market while it trends up, and step aside when a decline has gone on long enough to drag the price under a year of trend."},
            "right": [
                panel("Timing vs holding", "What changes and what doesn't.", pair(
                    ("yes", "timed", "Same return, smaller falls", "About the same long-run return as holding, with lower volatility and much shallower drawdowns."),
                    ("care", "the cost", "Whipsaws and lag", "It sells after a decline has started and buys back after a rebound. In choppy markets it trails."))),
                calc("The S&amp;P 500, 1901&ndash;2012", "Faber's 2013 update, before costs and taxes.", [("Return a year, timed", "10.2%"), ("Return a year, held", "9.3%"), ("Sharpe, timed vs held", "0.55 vs 0.32"), ("Worst drawdown, timed", "&minus;50.3%"), ("Worst drawdown, held", "&minus;83.5%", "tot")]),
            ]},
        {"type": "head", "id": "crash", "h2": "What it's for", "p": "The rule never sells the top or buys the bottom. Its job is to stay out of the long middle of a bear market, which is where most of the damage happens."},
        {"type": "anim", "key": "crash", "title": "A bear market, timed", "aria": "A made-up bear market: buy and hold falls the whole way, while the timed line moves to cash a few months into the decline and buys back after the index recovers above its average, ending with a much smaller worst drawdown."},
        {"type": "main", "stage": {"h3": "Late out, late in", "li": [
            "It exits after the decline has started, so it always takes part of the loss.",
            "It returns after the rebound has started, so it always misses part of the gain.",
            "The payoff comes when the decline is long and deep: missing the middle of it is worth more than the two late switches cost.",
        ], "why": "That's why the return ends up close to holding while the drawdown is much smaller. The rule trades a little return in good times for a lot of protection in bad ones."},
            "right": [
                qb("<b>Equity-like returns with bond-like volatility.</b> Faber's own summary of the five-asset version: about the same return as the buy-and-hold mix, with drawdowns closer to a bond fund's."),
                calc("Five assets, 1973&ndash;2012", "Equal weights, each asset timed on its own.", [("Return a year, timed", "10.5%"), ("Return a year, held", "9.9%"), ("Volatility, timed vs held", "7.0% vs 10.3%"), ("Sharpe, timed vs held", "0.73 vs 0.44"), ("Worst drawdown, timed vs held", "&minus;9.5% vs &minus;46.0%", "tot")]),
            ]},
        {"type": "head", "id": "whipsaw", "h2": "The price of it", "p": "No timing rule is free. This one pays in sideways markets, where the price keeps crossing its average and every cross is a trade."},
        {"type": "anim", "key": "whipsaw", "title": "Whipsaws", "aria": "A made-up sideways market crossing its 10-month average again and again; each cross is a switch, and the timed line ends behind buy and hold."},
        {"type": "head", "id": "results", "h2": "The published numbers", "p": "Every number below is from Faber's 2013 update, before trading costs and taxes."},
        {"type": "anim", "key": "results", "title": "Timed vs buy and hold", "aria": "Faber's published results. S&P 500 1901 to 2012: 10.2% a year timed against 9.3% held, volatility 12.0% against 17.9%, worst drawdown 50.3% against 83.5%. Five assets 1973 to 2012: 10.5% against 9.9%, volatility 7.0% against 10.3%, worst drawdown 9.5% against 46.0%."},
        {"type": "four", "cards": [
            ("#30d158", "return", "About the same", "10.2% vs 9.3% a year on the S&amp;P 500; 10.5% vs 9.9% for five assets."),
            ("#2997ff", "volatility", "About a third lower", "12.0% vs 17.9% on the S&amp;P 500; 7.0% vs 10.3% for five assets."),
            ("#f4b942", "worst drawdown", "Much shallower", "50.3% vs 83.5% on the S&amp;P 500; 9.5% vs 46.0% for five assets."),
            ("#ff453a", "not included", "Costs and taxes", "Each switch is a sale. In a taxable account, the gains it realizes are taxed."),
        ]},
        {"type": "timeline", "items": [
            ("#2997ff", "2006&ndash;07", "The paper", "Faber posts <i>A Quantitative Approach to Tactical Asset Allocation</i>; it's published in the <i>Journal of Wealth Management</i> in 2007."),
            ("#ff453a", "2008", "The test", "Weeks after publication, the financial crisis: the rule had moved most of the money out of stocks before the worst of the decline."),
            ("#30d158", "2009", "<i>The Ivy Portfolio</i>", "Faber and Eric Richardson's book applies the same rule to a mix like the big university endowments'."),
            ("#f4b942", "2013", "The update", "Faber extends the test: the S&amp;P 500 back to 1901 and five assets from 1973 to 2012."),
        ]},
    ],
    "steps": [
        {"h3": "Wait", "li": ["Don't check during the month.", "Only the month-end close counts."], "why": "Fewer checks, fewer false signals."},
        {"h3": "Check", "li": ["On the last trading day, compare the close with its 10-month simple moving average.", "Use the same rule on every asset you hold."], "why": "One comparison per asset."},
        {"h3": "Hold", "li": ["Closed above: own it for the next month.", "Already own it? Do nothing."], "why": "Stay with the trend."},
        {"h3": "Cash", "li": ["Closed below: sell, and hold 90-day T-bills.", "Buy back only after a month-end close above."], "why": "Step aside for the long declines."},
        {"h3": "Repeat", "li": ["Five assets: equal weights, each with its own signal.", "Rebalance monthly."], "why": "Some assets are always in; the mix is rarely all cash."},
    ],
    "indicator": {
        "note": "One TradingView script for this strategy (Pine Script v6). It plots the 10-month average on any chart, shades invested and cash months, marks each switch, and shows the signal for five ETFs that stand in for Faber's five assets. It marks and alerts. It doesn't place trades.",
        "name": "10-Month SMA Timing",
        "blurbs": [
            "On the chart: the 10-month simple moving average, green shading while the last month-end close was above it and red while it was below, and an IN or CASH label at each switch. The signal uses only completed months, so it never changes in the middle of a month.",
            "A table with how far the chart's last monthly close is above or below its average, and the same for five ETFs: SPY, EFA, IEF, VNQ and DBC for US stocks, foreign stocks, bonds, real estate and commodities, with the share of the five-asset mix that would be invested.",
            "<span style=\"color:var(--ash)\">Faber tested the indexes themselves, with history back to 1901 and 1973. The ETFs are a stand-in you can trade, and every symbol is a setting.</span>",
        ],
        "mock": mock(),
        "howto": [
            "Copy the code below, or download the .pine file.",
            "In TradingView, open the Pine Editor at the bottom of a chart, paste it in, and click <b>Add to chart</b>.",
            "Any timeframe works. A daily or weekly chart of SPY shows the switches clearly.",
            "To get alerted, create an alert on the chart and pick <b>10M SMA: buy</b> or <b>10M SMA: to cash</b>.",
        ],
    },
    "related": [
        ("/famous-strategies/cross-sectional-momentum.html", "#30d158", "famous strategy", "Cross-Sectional Momentum", "Ranking stocks against each other, instead of each against its own trend."),
        ("/famous-strategies/low-volatility.html", "#2997ff", "famous strategy", "Low-Volatility Anomaly", "Another way to take the edge off the drawdowns."),
        ("/famous-strategies/can-slim.html", "#f4b942", "famous strategy", "CAN SLIM", "O'Neil's M: only buy when the market itself is trending up."),
        ("/trailing-stops.html", "#ff9f0a", "fundamentals", "Trailing Stops", "The same idea on a single trade: let the trend decide when you're out."),
    ],
    "rule": {
        "h2": "Try it on paper first.",
        "p": "Put a reminder on the last trading day of each month. Write down SPY's close, its 10-month average and what the rule says to hold. Do it for a year, and count how many switches it made and what each one cost.",
        "li": ["Check only at month-end.", "Write the signal down before the next month starts.", "Count the switches that reversed within two months."],
    },
    "sources": [
        "Faber, M. T. (2007). A Quantitative Approach to Tactical Asset Allocation. <i>Journal of Wealth Management</i>, 9(4), 69&ndash;79. Updated 2013 (SSRN 962461).<small>The monthly 10-month SMA rule with cash in 90-day T-bills; S&amp;P 500 1901&ndash;2012: 10.2% vs 9.3% a year, volatility 12.0% vs 17.9%, Sharpe 0.55 vs 0.32, worst drawdown 50.3% vs 83.5%; five assets 1973&ndash;2012 (S&amp;P 500, MSCI EAFE, 10-year Treasuries, NAREIT, GSCI): 10.5% vs 9.9%, volatility 7.0% vs 10.3%, Sharpe 0.73 vs 0.44, worst drawdown 9.5% vs 46.0%; about 70% invested on average. Results before costs and taxes, as summarized by CXO Advisory.</small>",
        "Faber, M. T. &amp; Richardson, E. W. (2009). <i>The Ivy Portfolio</i>. Wiley.<small>The same rule applied to an endowment-style mix.</small>",
    ],
    "src": "Built from Faber's paper and the sources listed above. Every price in the first three walkthroughs is made up for illustration. The results chart and cards use the paper's published numbers, which are backtests on indexes, before trading costs and taxes. Past results don't promise future returns. It's shared for education, not as trading advice.",
    "market": "ETFs",
    "who": "Mebane Faber",
    "card": "Once a month: above the 10-month average, hold it; below it, move to T-bills.",
}
