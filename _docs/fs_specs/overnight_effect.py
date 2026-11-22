from fs_build import panel, pair, calc, qb
import fs_mock as M


def mock():
    p = []
    import random
    random.seed(7)
    n_, d_ = [100.0], [100.0]
    for i in range(120):
        n_.append(n_[-1] * (1 + 0.0011 + random.uniform(-0.006, 0.006)))
        d_.append(d_[-1] * (1 + 0.0001 + random.uniform(-0.009, 0.009)))
    lo, hi = min(min(n_), min(d_)) - 2, max(max(n_), max(d_)) + 2
    X, Y = M.scale(n_, 16, 352, 60, 296, lo, hi)
    p.append(M.r(16, Y(100), 336, 1, "#86868b", 0.5))

    def path(vals, col):
        pts = " ".join("%.1f,%.1f" % (X(i), Y(v)) for i, v in enumerate(vals))
        return '<polyline points="%s" fill="none" stroke="%s" stroke-width="2"/>' % (pts, col)
    p.append(path(n_, "#30d158"))
    p.append(path(d_, "#f4b942"))
    p.append(M.t(16, 24, "Overnight &#183; daily &#183; separate pane", "#86868b", 12))
    p.append(M.t(X(120) - 4, Y(n_[-1]) - 8, "overnight only", "#30d158", 9, "end", 700))
    p.append(M.t(X(120) - 4, Y(d_[-1]) + 16, "intraday only", "#f4b942", 9, "end", 700))
    rows = [
        ([("Avg night (close to open)", "#86868b"), ("+0.033%", "#30d158")], "#1d1d1f"),
        ([("Avg day (open to close)", "#86868b"), ("+0.007%", "#f4b942")], "#1d1d1f"),
        ([("100 grew to, night / day", "#86868b"), ("1359 / 124", "#f5f5f7")], "#1d1d1f"),
        ([("Up nights / up days", "#86868b"), ("55.0% / 52.4%", "#f5f5f7")], "#1d1d1f"),
        ([("Days counted", "#86868b"), ("8508 since 1993", "#f5f5f7")], "#1d1d1f"),
    ]
    p.append(M.table(368, 40, rows, widths=(140, 106)))
    return M.svg("An illustrative mock of the indicator in its own pane: two made-up growth lines starting at 100, a green one for holding only overnight that climbs and a gold one for holding only during the day that stays near flat, and a table of the average night and day returns from our SPY run.", p)


SPEC = {
    "slug": "overnight-effect",
    "name": "Overnight Effect",
    "seo_title": "The Overnight Effect: Stock Returns Come at Night",
    "desc": "Most of the US stock market's gain has come between the close and the next open. The 2008 study, the numbers, the costs and a free indicator.",
    "kicker": "Famous strategies &middot; ETFs &middot; Cliff, Cooper &amp; Gulen 2008",
    "h1": "The Overnight <span>Effect</span>",
    "thesis": "Split each trading day into two halves: the night, from the 4 pm close to the next morning's open, and the day, from the open to the close. Since the 1990s, the US market's gain has come almost entirely from the night.",
    "thesis_em": "Earned while the market was shut.",
    "counts": [("0.028&ndash;0.048%", "average night, S&amp;P 500 stocks, 1993&ndash;2006"), ("&minus;0.028&ndash;0.002%", "average day, same stocks"), ("14 of 14", "big ETFs where nights beat days")],
    "ribbon": ["Buy at the close", "Hold overnight", "Sell at the open", "Flat all day", "Costs decide it"],
    "facts": [
        ("studied by", "Cliff, Cooper &amp; Gulen, working paper, 2008"),
        ("sample", "Intraday prices, 1993&ndash;2006"),
        ("night", "4:00 pm close to the 9:30 am open"),
        ("S&amp;P 500 stocks", "0.028% to 0.048% a night, &minus;0.028% to 0.002% a day"),
        ("SPY", "Nights beat days by 0.068% a day"),
        ("14 big ETFs", "Nights beat days in all 14; days negative in 12"),
        ("QQQQ, 1999&ndash;2006", "Kelly &amp; Clark: +23.7% vs &minus;23.3% risk premium"),
        ("what it costs", "About 252 round trips a year"),
    ],
    "blocks": [
        {"type": "head", "id": "split", "h2": "Two halves of every day", "p": "Every daily candle hides two returns: the gap from yesterday's close to today's open, and the move from the open to the close."},
        {"type": "anim", "key": "split", "title": "Night and day", "aria": "Eight made-up daily candles of an index fund. Dashed links from each close to the next open show the overnight returns, mostly up; the candle bodies show the intraday returns, mixed. Totals: the nights added up to a gain, the days gave a little back."},
        {"type": "main", "stage": {"h3": "The rule", "li": [
            "Buy a broad index fund such as SPY at the close, 4:00 pm New York time.",
            "Hold it overnight, while the exchanges are shut.",
            "Sell at the next morning's open, 9:30 am, and stay flat until the close. Repeat every trading day.",
        ], "why": "If the market's return really arrives overnight, owning only the nights keeps that return and sits out the day's swings."},
            "right": [
                panel("How to use it", "Two ways traders apply it.", pair(
                    ("care", "on its own", "Every night, flat every day", "About 252 round trips a year. Only works if each costs less than the average night earns."),
                    ("yes", "as timing", "When to buy and sell", "Already buying or selling an index fund? Buying near the close and selling near the open leans on the pattern."))),
                calc("Cliff, Cooper &amp; Gulen, 1993&ndash;2006", "Average return per night or day, and the gap for SPY.", [("S&amp;P 500 stocks, night", "0.028&ndash;0.048%"), ("S&amp;P 500 stocks, day", "&minus;0.028&ndash;0.002%"), ("SPY, night minus day", "0.068%"), ("QQQQ, night minus day", "0.18%", "tot")]),
            ]},
        {"type": "head", "id": "paper", "h2": "What the research found", "p": "Using intraday prices from 1993 to 2006, the study split the day at the bell. The difference was large, and it showed up in nearly everything they tested."},
        {"type": "anim", "key": "paper", "title": "1993&ndash;2006", "aria": "Cliff, Cooper and Gulen's averages, 1993 to 2006: S&amp;P 500 stocks returned 0.028% to 0.048% a night and minus 0.028% to 0.002% a day. Night minus day per day: QQQQ 0.18%, SPY 0.068%, DIA 0.061%. Across 14 ETFs, the day's return was negative in 12."},
        {"type": "head", "id": "spy", "h2": "On SPY since 1993", "p": "We ran this page's indicator on SPY's daily history to see whether the split held after the paper's sample ended."},
        {"type": "anim", "key": "spy", "title": "Night and day on SPY", "aria": "Our run of the indicator on SPY daily bars since 1993, price only: 100 dollars held only overnight grew to about 1,359; held only during the day, to about 124. Average night +0.033%, average day +0.007%; nights up 55.0% of the time, days 52.4%. Kelly and Clark, QQQQ 1999 to 2006: +23.7% close to open, minus 23.3% open to close."},
        {"type": "head", "id": "costs", "h2": "The catch: a trade every day", "p": "The pattern is strong. Trading it means a buy and a sell every day, and the average night is small next to what each round trip can cost."},
        {"type": "anim", "key": "costs", "title": "After costs", "aria": "Arithmetic on our SPY run: the average night of +0.033% minus a cost per round trip, from 0 to 0.06%. The line crosses zero at 0.033%, about 3 cents on a 100 dollar share; above that the average night loses money."},
        {"type": "four", "cards": [
            ("#30d158", "the research", "0.028&ndash;0.048% a night", "S&amp;P 500 stocks, 1993&ndash;2006, against &minus;0.028% to 0.002% a day."),
            ("#2997ff", "14 big ETFs", "14 of 14", "Nights beat days in every one; days were negative in 12."),
            ("#f4b942", "our SPY run", "$1,359 vs $124", "$100 held only overnight vs only by day, SPY since 1993, price only."),
            ("#ff453a", "the catch", "252 round trips", "A year. Break-even near 0.033% a round trip on our run, before tax."),
        ]},
        {"type": "timeline", "items": [
            ("#2997ff", "2008", "Cliff, Cooper &amp; Gulen", "1993&ndash;2006: the market's return came at night; the day earned about nothing. Not explained by earnings announcements."),
            ("#2997ff", "2011", "Kelly &amp; Clark", "Index ETFs: QQQQ's close-to-open premium +23.7% against &minus;23.3% open to close, 1999&ndash;2006."),
            ("#30d158", "2019", "Lou, Polk &amp; Skouras", "Across 14 trading strategies, profits tend to arrive in one half of the day, often with the opposite sign in the other."),
            ("#f4b942", "2023", "Bondarenko &amp; Muravyev", "Around-the-clock S&amp;P 500 futures: the average return arrived in about four hours around the European open."),
        ]},
    ],
    "steps": [
        {"h3": "Close", "li": ["Buy a broad index fund at the close.", "A market-on-close order fills at the closing price."], "why": "The night starts at 4 pm."},
        {"h3": "Night", "li": ["Hold while the exchanges are shut.", "This is where the research found the return."], "why": "News lands overnight."},
        {"h3": "Open", "li": ["Sell at the next morning's open.", "A market-on-open order fills at the opening price."], "why": "The night ends at 9:30 am."},
        {"h3": "Day", "li": ["No position from the open to the close.", "On average the day has earned about nothing."], "why": "Sit out the session."},
        {"h3": "Repeat", "li": ["Every trading day.", "Track every fill and cost."], "why": "Costs decide if it pays."},
    ],
    "indicator": {
        "note": "One TradingView script for this strategy (Pine Script v6). It splits each daily bar into its overnight and intraday halves, draws what owning only each half would have done, and on intraday charts marks the session's last and first bars with alerts. It marks and alerts. It doesn't place trades.",
        "name": "Overnight Effect",
        "blurbs": [
            "In its own pane: a green growth-of-100 line for owning only the nights (close to the next open) and a gold one for owning only the days (open to close), from the start year you choose.",
            "A table with the average night and day, what 100 grew to in each half, how often each was up, and the days counted. On SPY's daily history since 1993, our run showed +0.033% a night and +0.007% a day, and 100 growing to about 1,359 overnight against 124 by day, price only.",
            "<span style=\"color:var(--ash)\">On an intraday chart it marks the last bar of each session (buy at the close) and the first (sell at the open), with alerts for both. Prices are price only, so ex-dividend drops land in the overnight half.</span>",
        ],
        "mock": mock(),
        "howto": [
            "Copy the code below, or download the .pine file.",
            "In TradingView, open the Pine Editor at the bottom of a chart, paste it in, and click <b>Add to chart</b>.",
            "Use a daily chart of SPY, QQQ or another index fund for the split and the table.",
            "For alerts, switch to an intraday chart and create an alert on <b>Overnight: buy at the close</b> or <b>Overnight: sell at the open</b>.",
        ],
    },
    "related": [
        ("/famous-strategies/intraday-momentum.html", "#30d158", "famous strategy", "Intraday Momentum", "The other side of the clock: what the first half-hour says about the last."),
        ("/famous-strategies/turn-of-the-month.html", "#2997ff", "famous strategy", "Turn of the Month", "Another calendar pattern: four days a month."),
        ("/famous-strategies/rsi-2.html", "#f4b942", "famous strategy", "RSI(2)", "A short-hold index fund strategy with fewer trades."),
        ("/famous-strategies/opening-range-breakout.html", "#ff9f0a", "famous strategy", "Opening Range Breakout", "Trading the open the overnight holder sells into."),
    ],
    "rule": {
        "h2": "Try it on paper first.",
        "p": "Put the indicator on a daily SPY chart, then for a month write down the closing price each day and the next morning's opening price. Price your own spread and commissions per round trip and see what's left of the average night.",
        "li": ["Record real closing and opening prints.", "Count every round trip's cost.", "Compare with simply holding SPY."],
    },
    "sources": [
        "Cliff, M., Cooper, M. J. &amp; Gulen, H. (2008). Return Differences between Trading and Non-Trading Hours: Like Night and Day. Working paper, SSRN 1004081.<small>Intraday data, 1993&ndash;2006: S&amp;P 500 stocks averaged 0.028% to 0.048% from the close to the open and &minus;0.028% to 0.002% from the open to the close, depending on the averaging; night minus day 0.18% for QQQQ, 0.068% for SPY and 0.061% for DIA; across 14 high-volume ETFs nights beat days in all 14 and days were negative in 12; overnight returns less volatile; also in equity index futures; not determined by earnings announcements.</small>",
        "Kelly, M. A. &amp; Clark, S. P. (2011). Returns in Trading versus Non-Trading Hours: The Difference Is Day and Night. <i>Journal of Asset Management</i>, 12(2), 132&ndash;145.<small>Broad index ETFs; for QQQQ, 1999&ndash;2006, a geometric average close-to-open risk premium of +23.7% against &minus;23.3% open to close, with lower volatility overnight.</small>",
        "Lou, D., Polk, C. &amp; Skouras, S. (2019). A Tug of War: Overnight versus Intraday Expected Returns. <i>Journal of Financial Economics</i>, 134(1), 192&ndash;213.",
        "Bondarenko, O. &amp; Muravyev, D. (2023). Market Return Around the Clock: A Puzzle. <i>Journal of Financial and Quantitative Analysis</i>, 58(3).",
    ],
    "src": "Built from the papers listed above. The candles in the first walkthrough are made up for illustration. The research bars use the published numbers. The SPY figures are from our own TradingView run of the indicator on this page, daily bars since 1993, price only, not from a published study, and the cost chart is simple arithmetic on that run. Past results don't promise future returns. It's shared for education, not as trading advice.",
    "market": "ETFs",
    "who": "Cliff, Cooper & Gulen, 2008",
    "card": "Own the index only from the close to the next open, and stay flat while the market trades.",
}
