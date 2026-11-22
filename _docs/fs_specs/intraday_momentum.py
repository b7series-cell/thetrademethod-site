from fs_build import panel, pair, calc, qb
import fs_mock as M


def mock():
    p = []
    import random
    random.seed(7)
    vals = []
    v = 500.0
    for d in range(3):
        v += (2.4, -2.1, 1.6)[d]
        for i in range(13):
            v += random.uniform(-0.6, 0.6) + (0.15 if d != 1 else -0.12)
            vals.append(v)
    X, Y = M.scale(vals, 16, 352, 44, 296, min(vals) - 1, max(vals) + 1.5)
    for d in range(3):
        p.append(M.r(X(d * 13) - 3, 44, 7, 252, "#2997ff", 0.12))
        p.append(M.r(X(d * 13 + 12) - 3, 44, 7, 252, "#f4b942", 0.16))
    p.append(M.candles(vals, X, Y, seed=2, w=3.6))
    for d, up in ((0, True), (1, False), (2, True)):
        i = d * 13 + 11
        col = "#30d158" if up else "#ff453a"
        y = Y(vals[i]) + (18 if up else -34)
        p.append(M.r(X(i) - 24, y, 48, 18, col, 0.95, 4))
        p.append(M.t(X(i), y + 12, "long 3:30" if up else "short 3:30", "#fff", 8.5, "middle", 700))
    p.append(M.t(16, 24, "Intraday momentum &#183; 30-minute", "#86868b", 12))
    rows = [
        ([("First half-hour (r1)", "#86868b"), ("+0.42%", "#30d158")], "#1d1d1f"),
        ([("At 3:30 pm", "#86868b"), ("long into the close", "#f5f5f7")], "#1d1d1f"),
        ([("Days on this chart", "#86868b"), ("464", "#f5f5f7")], "#1d1d1f"),
        ([("Right direction", "#86868b"), ("47.8%", "#f5f5f7")], "#1d1d1f"),
        ([("Average last half-hour", "#86868b"), ("&#8722;0.004%", "#f5f5f7")], "#1d1d1f"),
    ]
    p.append(M.table(368, 40, rows, widths=(118, 100)))
    return M.svg("An illustrative mock of the indicator: three made-up days of 30-minute candles with the first half-hour shaded blue and the last half-hour shaded gold, long or short labels at 3:30 pm, and a table with the first half-hour return, the 3:30 call, and the hit rate and average result over the days on the chart.", p)


SPEC = {
    "slug": "intraday-momentum",
    "name": "Intraday Momentum",
    "seo_title": "Intraday Momentum Strategy on SPY, Explained",
    "desc": "On SPY, the move from the prior close to 10:00 am predicts the last half-hour. The 2018 study, an honest look at recent results, and an indicator.",
    "kicker": "Famous strategies &middot; ETFs &middot; Gao, Han, Li &amp; Zhou, <i>Journal of Financial Economics</i>, 2018",
    "h1": "Intraday <span>Momentum</span>",
    "thesis": "On the S&amp;P 500, the two ends of the trading day are linked. The return from yesterday's close to 10:00 am tends to point the way the last half-hour goes. Trade 30 minutes a day, in that direction.",
    "thesis_em": "The open points, the close follows.",
    "counts": [("30", "minutes in the market each day"), ("54.37%", "of days called right, 1993&ndash;2013"), ("1.6%", "R-squared: a small, daily edge")],
    "ribbon": ["Measure close to 10:00", "Wait", "3:30: long or short", "Out at the close", "Keep costs tiny"],
    "facts": [
        ("paper", "Market Intraday Momentum, <i>Journal of Financial Economics</i>, 2018"),
        ("authors", "Lei Gao, Yufeng Han, Sophia Zhengzi Li and Guofu Zhou"),
        ("data", "SPY, February 1993 to December 2013, half-hour returns"),
        ("signal", "Previous 4:00 pm close to 10:00 am today"),
        ("trade", "3:30 to 4:00 pm, in the signal's direction"),
        ("timing rule", "6.67% a year, Sharpe 1.08, right on 54.37% of days"),
        ("always long", "&minus;1.11% a year, Sharpe &minus;0.18, 50.42%"),
        ("stronger on", "Volatile, high-volume, recession and macro-news days"),
    ],
    "blocks": [
        {"type": "head", "id": "halves", "h2": "Two ends of the day", "p": "The authors cut every SPY trading day into thirteen half-hours and asked which ones predict which. Only one link stood out: the first half-hour and the last."},
        {"type": "anim", "key": "halves", "title": "The first and the last", "aria": "A made-up S&P 500 fund day as thirteen 30-minute bars; the first half-hour, measured from yesterday's close, is up and the last half-hour, 3:30 to 4:00 pm, is also up; the eleven half-hours in between show no pattern."},
        {"type": "main", "stage": {"h3": "The rule", "li": [
            "Measure the first half-hour return: from yesterday's 4:00 pm close to 10:00 am today, overnight gap included.",
            "At 3:30 pm, buy SPY if that return was positive, or sell it short if it was negative.",
            "Close the position at the 4:00 pm close. One 30-minute trade a day, never held overnight.",
        ], "why": "Big traders who rebalance once a day, and traders who get information late, both tend to act near the close in the direction the day's news pointed in the morning."},
            "right": [
                panel("Why the close", "The paper's two explanations.", pair(
                    ("yes", "rebalancing", "Infrequent trades", "Some funds and hedgers rebalance once a day, near the close, in the direction the market has moved."),
                    ("care", "late information", "Late-informed traders", "Traders who react slowly to the morning's news push the price the same way in the last half-hour."))),
                calc("The SPY timing rule", "1993&ndash;2013, before costs.", [("Return a year", "6.67%"), ("Volatility", "6.19%"), ("Sharpe ratio", "1.08"), ("Days called right", "54.37%", "tot")]),
            ]},
        {"type": "head", "id": "trade", "h2": "Trading it", "p": "There is no chart reading. The first half-hour sets the side, the clock sets the entry and the exit."},
        {"type": "anim", "key": "trade", "title": "Two days, two trades", "aria": "Two made-up days: on the first the first half-hour is up and the fund is bought at 3:30 pm and sold at the close; on the second it gaps down, the first half-hour is negative and the fund is shorted at 3:30 and covered at the close."},
        {"type": "head", "id": "noise", "h2": "A small edge", "p": "The pattern is real in the data, and it's weak on any single day. That matters for how it's traded."},
        {"type": "anim", "key": "noise", "title": "Mostly noise, slightly tilted", "aria": "A scatter of made-up days, first half-hour return against last half-hour return, with a slight upward tilt and wide scatter; the paper's R-squared of 1.6%, 2.6% with the 3:00 to 3:30 pm half-hour added."},
        {"type": "main", "stage": {"h3": "When it was stronger", "li": [
            "On more volatile days and higher-volume days.",
            "In recessions, and on days with major economic news releases.",
            "It showed up in ten other heavily traded US and international ETFs, not just SPY.",
        ], "why": "Those are the days when more information arrives in the morning, and more of it is still being acted on at the close."},
            "right": [
                qb("<b>Repeated daily, small edges add up.</b> An R-squared of 1.6% means the first half-hour explains very little of any one afternoon. The paper's result comes from taking the trade on every one of about 5,000 days."),
            ]},
        {"type": "head", "id": "results", "h2": "The published numbers, and since", "p": "The paper's results are before trading costs. We also ran this page's indicator on recent SPY data, and it's worth seeing both."},
        {"type": "anim", "key": "results", "title": "Timing rule vs always long", "aria": "From the paper, SPY last half-hour 1993 to 2013: the timing rule returned 6.67% a year against minus 1.11% for always long, with volatility of 6.19% against 6.21%, a Sharpe ratio of 1.08 against minus 0.18, and the right direction on 54.37% of days against 50.42%."},
        {"type": "four", "cards": [
            ("#f4b942", "1993&ndash;2013", "6.67% a year", "From 30 minutes a day, with a Sharpe ratio of 1.08, before costs."),
            ("#86868b", "always long", "&minus;1.11% a year", "Simply holding SPY in every last half-hour lost money over the same years."),
            ("#2997ff", "the fit", "R&sup2; 1.6%", "2.6% with the 3:00&ndash;3:30 pm half-hour added. Weak per day."),
            ("#ff453a", "our recent run", "47.8% right", "SPY 30-minute bars, the last 464 trading days: about zero on average, before costs."),
        ]},
        {"type": "timeline", "items": [
            ("#2997ff", "1993", "SPY", "The first S&amp;P 500 ETF lists, and its intraday data starts the paper's sample."),
            ("#2997ff", "2014", "Working paper", "Gao, Han, Li and Zhou circulate the first half-hour result."),
            ("#30d158", "2018", "<i>Journal of Financial Economics</i>", "Market Intraday Momentum is published."),
            ("#f4b942", "Since", "More tests", "Later studies look at other markets and at whether the effect has shrunk."),
        ]},
    ],
    "steps": [
        {"h3": "Measure", "li": ["At 10:00 am, compare SPY with yesterday's 4:00 pm close.", "Up or down: that's the side for today."], "why": "The overnight gap counts."},
        {"h3": "Wait", "li": ["Do nothing for the rest of the day.", "The middle half-hours showed no pattern."], "why": "The trade is at the other end."},
        {"h3": "Enter", "li": ["At 3:30 pm: long if the first half-hour was up, short if down.", "Optional: require 3:00&ndash;3:30 pm to agree."], "why": "Thirty minutes of exposure."},
        {"h3": "Exit", "li": ["Close at 4:00 pm.", "Never hold overnight."], "why": "The edge is only the last half-hour."},
        {"h3": "Costs", "li": ["Use the most liquid fund and the cheapest execution you have.", "Track your fills against the 3:30 and 4:00 prices."], "why": "A 30-minute edge is easily eaten by costs."},
    ],
    "indicator": {
        "note": "One TradingView script for this strategy (Pine Script v6). It measures the first half-hour from yesterday's close, marks the 3:30 pm long or short, labels each day's result at the close, and keeps a running hit rate. It marks and alerts. It doesn't place trades.",
        "name": "Intraday Momentum",
        "blurbs": [
            "On the chart: the first and last half-hours shaded, a long or short label at 3:30 pm with the first half-hour's return, and a label at the close with the last half-hour's result in the trade's direction.",
            "A table with today's first half-hour, the 3:30 call, and for every day on the chart: the number of days, the share called right and the average result. An option requires the 3:00&ndash;3:30 pm half-hour to agree, which the paper found adds to the prediction.",
            "<span style=\"color:var(--ash)\">On the last 464 days of SPY 30-minute bars, our run called 47.8% right, with an average near zero, before costs. The paper's 54.37% covers 1993&ndash;2013. Check it on your own data before trading it.</span>",
        ],
        "mock": mock(),
        "howto": [
            "Copy the code below, or download the .pine file.",
            "In TradingView, open the Pine Editor at the bottom of a chart, paste it in, and click <b>Add to chart</b>.",
            "Use a 1-, 5-, 15- or 30-minute chart of SPY with regular trading hours only (extended hours off).",
            "To get alerted, create an alert on the chart and pick <b>Intraday momentum: long</b> or <b>Intraday momentum: short</b>.",
        ],
    },
    "related": [
        ("/famous-strategies/opening-range-breakout.html", "#30d158", "famous strategy", "Opening Range Breakout", "Another way to trade what the first minutes say."),
        ("/famous-strategies/rsi-2.html", "#2997ff", "famous strategy", "RSI(2)", "A short-term ETF strategy that bets on reversal instead."),
        ("/setups/fashionably-late.html", "#f4b942", "setup", "Fashionably Late", "A discretionary intraday setup on the same index."),
        ("/famous-strategies/ten-month-sma.html", "#ff9f0a", "famous strategy", "10-Month Moving Average", "The opposite time scale: one check a month."),
    ],
    "rule": {
        "h2": "Try it on paper first.",
        "p": "For a month, write down SPY's change from yesterday's close at 10:00 am, the 3:30 pm price and the 4:00 pm close. Count how often the last half-hour went the first half-hour's way, and what a realistic fill would have cost you.",
        "li": ["Write the side down at 10:00, before you know the afternoon.", "Use the actual 3:30 and 4:00 prints.", "Subtract your commission and half the spread twice."],
    },
    "sources": [
        "Gao, L., Han, Y., Li, S. Z. &amp; Zhou, G. (2018). Market Intraday Momentum. <i>Journal of Financial Economics</i>, 129(2), 394&ndash;414. <a class=\"cite-link\" href=\"https://doi.org/10.1016/j.jfineco.2018.05.009\" target=\"_blank\" rel=\"noopener\">DOI &rsaquo;</a><small>SPY, February 1993 to December 2013: the first half-hour return (previous close to 10:00 am) predicts the last half-hour return, R&sup2; 1.6%, 2.6% with the twelfth half-hour; timing strategy 6.67% a year, standard deviation 6.19%, Sharpe 1.08, success rate 54.37%, against always long &minus;1.11%, 6.21%, &minus;0.18, 50.42%; stronger on volatile, high-volume, recession and macro-news days; present in ten other ETFs.</small>",
        "Bogousslavsky, V. (2016). Infrequent Rebalancing, Return Autocorrelation, and Seasonality. <i>Journal of Finance</i>, 71(6), 2967&ndash;3006. <a class=\"cite-link\" href=\"https://doi.org/10.1111/jofi.12436\" target=\"_blank\" rel=\"noopener\">DOI &rsaquo;</a><small>The infrequent-rebalancing explanation the paper draws on.</small>",
    ],
    "src": "Built from the paper and the sources listed above. Every bar and dot in the walkthroughs is made up for illustration. The results chart uses the paper's published numbers, which are before trading costs. The 464-day figures are from our own TradingView run of the indicator on this page, not from a published study. Past results don't promise future returns. It's shared for education, not as trading advice.",
    "market": "ETFs",
    "who": "Gao, Han, Li, Zhou",
    "card": "If SPY is up from yesterday's close at 10:00 am, buy at 3:30 pm; if down, short. Out at the close.",
}
