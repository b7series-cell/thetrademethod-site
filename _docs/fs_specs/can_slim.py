from fs_build import panel, pair, calc, qb
import fs_mock as M


def mock():
    p = []
    path = [(0, 100), (8, 114), (20, 93), (28, 91), (38, 110), (42, 115.6), (47, 110.5), (51, 113), (52, 119), (60, 126)]
    def tr(i):
        for k in range(1, len(path)):
            if i <= path[k][0]:
                a, b = path[k - 1], path[k]
                return a[1] + (b[1] - a[1]) * (i - a[0]) / (b[0] - a[0])
        return path[-1][1]
    import random
    random.seed(2)
    vals = [tr(i) + random.uniform(-1, 1) for i in range(61)]
    vals[52] = 119.5
    X, Y = M.scale(vals, 16, 352, 44, 296, 84, 132)
    p.append(M.candles(vals, X, Y, seed=6, w=3.2))
    piv = 116.0
    p.append(M.ln(X(36), Y(piv), 352, Y(piv), "#2997ff", 2))
    p.append(M.ln(X(52), Y(piv * 1.05), 352, Y(piv * 1.05), "#f4b942", 1.2, "4 4"))
    p.append(M.ln(X(52), Y(119.5 * 0.92), 352, Y(119.5 * 0.92), "#ff453a", 1.4, "4 4"))
    p.append(M.r(X(52) - 52, Y(vals[52]) + 22, 104, 32, "#30d158", 0.95, 6))
    p.append(M.t(X(52), Y(vals[52]) + 35, "CAN SLIM breakout", "#fff", 10, "middle", 700))
    p.append(M.t(X(52), Y(vals[52]) + 48, "6/6 + check I", "#fff", 10, "middle", 600))
    p.append(M.t(20, Y(piv) - 6, "", "#2997ff", 10))
    p.append(M.t(352, Y(piv) - 5, "pivot", "#2997ff", 10, "end", 700))
    p.append(M.t(352, Y(piv * 1.05) - 5, "+5%", "#f4b942", 10, "end", 700))
    p.append(M.t(352, Y(119.5 * 0.92) + 12, "stop &#8722;8%", "#ff453a", 10, "end", 700))
    p.append(M.t(16, 24, "CAN SLIM &#183; daily", "#86868b", 12))
    rows = [
        ([("C", "#f5f5f7"), ("EPS vs yr ago 41%", "#86868b"), ("&#10003;", "#30d158")], "#1d1d1f"),
        ([("A", "#f5f5f7"), ("3-yr 33%/yr, ROE 26%", "#86868b"), ("&#10003;", "#30d158")], "#1d1d1f"),
        ([("N", "#f5f5f7"), ("within 15% of high", "#86868b"), ("&#10003;", "#30d158")], "#1d1d1f"),
        ([("S", "#f5f5f7"), ("volume 1.8x avg", "#86868b"), ("&#10003;", "#30d158")], "#1d1d1f"),
        ([("L", "#f5f5f7"), ("12-mo vs bench +38", "#86868b"), ("&#10003;", "#30d158")], "#1d1d1f"),
        ([("I", "#f5f5f7"), ("check by hand", "#86868b"), ("?", "#f4b942")], "#1d1d1f"),
        ([("M", "#f5f5f7"), ("bench > 50 & 200 MA", "#86868b"), ("&#10003;", "#30d158")], "#1d1d1f"),
        ([("", "#86868b"), ("Score 6 of 6 checked", "#f5f5f7"), ("", "#f5f5f7")], "#141416"),
    ]
    p.append(M.table(368, 40, rows, widths=(18, 140, 20)))
    return M.svg("An illustrative mock of the indicator: made-up daily candles forming a cup with handle, a breakout labelled CAN SLIM breakout 6 of 6 plus check I, lines for the pivot, the 5% buy-zone top and an 8% stop, and a checklist table with C, A, N, S, L and M ticked and I marked to check by hand.", p)


SPEC = {
    "slug": "can-slim",
    "name": "CAN SLIM",
    "seo_title": "CAN SLIM (William O'Neil), Explained",
    "desc": "William O'Neil's CAN SLIM: seven letters for growth leaders, bought on base breakouts and cut at a 7-8% loss. Checklist, sell rules, an indicator.",
    "kicker": "Famous strategies &middot; Stocks &middot; William O'Neil, <i>How to Make Money in Stocks</i>, 1988",
    "h1": "CAN <span>SLIM</span>",
    "thesis": "What did the biggest stock winners have in common before their big moves? O'Neil's answer is seven letters: strong earnings, something new, heavy buying, market leadership and a rising market. Buy the breakout, and cut every loss at 7 to 8%.",
    "thesis_em": "Buy leaders, cut losers fast.",
    "counts": [("7", "letters every stock has to pass"), ("25%", "earnings growth, quarterly and yearly"), ("7&ndash;8%", "the loss that ends every trade")],
    "ribbon": ["Check the market", "Screen the letters", "Find a sound base", "Buy the breakout", "Sell by the rules"],
    "facts": [
        ("book", "<i>How to Make Money in Stocks</i> (1988, several later editions)"),
        ("author", "William J. O'Neil, founder of <i>Investor's Business Daily</i>"),
        ("based on", "A study of the biggest US stock winners back to the 1950s"),
        ("earnings", "Quarterly and annual EPS growth of 25%+, ROE 17%+"),
        ("leadership", "Relative strength of 80 or more"),
        ("entry", "Breakout over the pivot on volume 40&ndash;50%+ above normal"),
        ("exit", "&minus;7&ndash;8% always; most gains taken at 20&ndash;25%"),
        ("headline", "Three out of four stocks follow the market"),
    ],
    "blocks": [
        {"type": "head", "id": "letters", "h2": "Seven letters", "p": "O'Neil studied the biggest winners in the US market and listed what they had in common just before their big moves. CAN SLIM is that list, turned into a checklist a stock has to pass before you look at its chart."},
        {"type": "anim", "key": "letters", "title": "The checklist", "aria": "A made-up stock run through the seven letters: current earnings up 38%, annual earnings up 29% a year with return on equity of 24%, a new product near highs, volume 70% above average, relative strength 94, rising fund ownership, and a market in an uptrend."},
        {"type": "main", "stage": {"h3": "The rule", "li": [
            "M first: only buy when the general market is in a confirmed uptrend.",
            "Screen for C, A, N, S, L and I: strong and accelerating earnings, something new, real demand, a leading stock in a leading group, and growing ownership by good funds.",
            "Buy when a stock that passes breaks out of a sound base on heavy volume, within 5% of the pivot. Sell any position that falls 7 to 8% below your cost, and take most gains at 20 to 25%.",
        ], "why": "It mixes fundamentals and charts on purpose: the earnings pick the stock, the chart picks the day, and the market picks whether you're buying at all."},
            "right": [
                panel("Growth, not value", "CAN SLIM buys the opposite of what a value screen looks for.", pair(
                    ("yes", "CAN SLIM", "Expensive and rising", "High earnings growth, near new highs, strong relative strength. O'Neil: buy stocks that are going up, not bargains."),
                    ("care", "value strategies", "Cheap and ignored", "Low prices against earnings or book value, often near lows. See the Magic Formula and Value and Size pages."))),
                calc("The made-up checklist", "What the walkthrough's stock showed.", [("C: quarterly EPS vs a year ago", "+38%"), ("A: 3-year EPS growth, ROE", "29%/yr, 24%"), ("L: relative strength", "94"), ("S: breakout volume", "+70%"), ("Letters passed", "7 of 7", "tot")]),
            ]},
        {"type": "head", "id": "base", "h2": "The buy point", "p": "A stock that passes the checklist still has to be bought at the right moment. O'Neil's moment is the breakout from a base, and his favorite base is the cup with handle."},
        {"type": "anim", "key": "base", "title": "Cup, handle, breakout", "aria": "A made-up leader builds a rounded cup over more than seven weeks, drifts down in a light-volume handle, then breaks out over the pivot on volume about 90% above average, with a buy zone from the pivot to 5% above it."},
        {"type": "main", "stage": {"h3": "Buying the breakout", "li": [
            "Wait for a base of at least seven weeks: a cup with handle, a double bottom or a flat base.",
            "The pivot is the top of the handle (or the base's high). Buy as the stock trades through it.",
            "Breakout volume should be at least 40 to 50% above the stock's average. Don't buy more than 5% above the pivot.",
        ], "why": "Buying near the pivot keeps the 7 to 8% stop below the base. Chase it 10% higher and a normal pullback stops you out."},
            "right": [
                qb("<b>Buy high, sell higher.</b> O'Neil's most repeated, and most resisted, idea: the best stocks look expensive when they're ready to move, and the ones near their lows usually have a reason to be there."),
                calc("The made-up breakout", "Levels from the walkthrough.", [("Pivot (top of the handle)", "$116.20"), ("Top of the buy zone (+5%)", "$122.01"), ("Breakout volume vs average", "+90%"), ("Stop if bought at the pivot (&minus;8%)", "$106.90", "tot")]),
            ]},
        {"type": "head", "id": "sell", "h2": "Selling", "p": "O'Neil spent as much of the book on selling as on buying. The loss rule is the part of CAN SLIM that has no exceptions."},
        {"type": "anim", "key": "sell", "title": "Small losses, bigger gains", "aria": "Two made-up breakouts bought at $100: one fails and is sold at $92, an 8% loss; the other rises and most of the gain is taken at about 20%; a note explains the 8-week hold rule for stocks up 20% within three weeks."},
        {"type": "four", "cards": [
            ("#ff453a", "always", "Cut at 7&ndash;8%", "Sell any stock that falls 7 to 8% below what you paid. No averaging down, no waiting for it to come back."),
            ("#30d158", "usually", "Take 20&ndash;25%", "Take most gains when a stock is up 20 to 25%. With the loss rule, that's about 3 to 1."),
            ("#f4b942", "the exception", "Hold the monsters", "A stock that gains 20% within three weeks of breaking out is held at least eight weeks."),
            ("#2997ff", "the math", "Why it works", "Win only a third of the time at +20% and lose at &minus;7%, and you still come out ahead."),
        ]},
        {"type": "head", "id": "market", "h2": "M: the market decides", "p": "The last letter overrides the other six. O'Neil read the market's own chart for when to step aside and when to start buying again."},
        {"type": "anim", "key": "market", "title": "Distribution and the follow-through day", "aria": "A made-up index has five distribution days, rolls into a correction where breakouts are avoided, then makes a follow-through day on higher volume that starts a confirmed uptrend."},
        {"type": "timeline", "items": [
            ("#2997ff", "1963", "O'Neil &amp; Co.", "William O'Neil founds his research firm, building a database of stock charts and earnings."),
            ("#2997ff", "1984", "<i>Investor's Business Daily</i>", "O'Neil launches the paper, with ratings for earnings and relative strength."),
            ("#30d158", "1988", "<i>How to Make Money in Stocks</i>", "The CAN SLIM book; later editions update the study of past winners."),
            ("#f4b942", "Since", "Screens and students", "AAII's screen tracking ranked a CAN SLIM screen as its top performer for 1998&ndash;2009. Traders such as Mark Minervini built on the same ideas."),
        ]},
    ],
    "steps": [
        {"h3": "Market", "li": ["Is the general market in a confirmed uptrend? If not, don't buy.", "Count distribution days; wait for a follow-through day after a correction."], "why": "Three out of four stocks follow the market."},
        {"h3": "Screen", "li": ["C and A: quarterly and annual earnings up 25%+, ROE 17%+.", "N, S, L, I: something new, real demand, relative strength 80+, more good funds buying."], "why": "The checklist makes a stock a candidate."},
        {"h3": "Base", "li": ["A base of at least seven weeks: a cup with handle, double bottom or flat base.", "Mark the pivot: the top of the handle."], "why": "The base is where weak holders leave."},
        {"h3": "Buy", "li": ["Through the pivot on volume 40&ndash;50%+ above average.", "No more than 5% above the pivot."], "why": "Close to the pivot keeps the stop below the base."},
        {"h3": "Sell", "li": ["Always at 7&ndash;8% below your cost.", "Most gains at 20&ndash;25%, unless it gained 20% in three weeks (then hold eight)."], "why": "The loss rule is the one with no exceptions."},
    ],
    "indicator": {
        "note": "One TradingView script for this strategy (Pine Script v6). It checks six of the seven letters from TradingView's earnings data and the chart, marks the pivot, the 5% buy zone and an 8% stop, and alerts on a breakout that passes. It marks and alerts. It doesn't place trades.",
        "name": "CAN SLIM Checklist",
        "blurbs": [
            "A checklist table on your chart: C (quarterly EPS vs a year ago), A (three-year EPS growth and return on equity), N (within 15% of the 52-week high), S (volume vs the 50-day average), L (12-month return vs SPY) and M (SPY above its 50- and 200-day averages). I, institutional ownership, isn't in TradingView's data, so it says to check by hand.",
            "On the chart: the pivot (the high of the last seven weeks), the top of the buy zone 5% above it, and a breakout label with the score when price closes through the pivot on heavy volume in an uptrending market. The 8% stop is drawn from the entry, with a label if it's hit.",
            "<span style=\"color:var(--ash)\">L here is the stock against SPY, a simple stand-in for IBD's relative strength rating, which ranks every stock. Every threshold is a setting. Use a daily chart of a stock that reports earnings.</span>",
        ],
        "mock": mock(),
        "howto": [
            "Copy the code below, or download the .pine file.",
            "In TradingView, open the Pine Editor at the bottom of a chart, paste it in, and click <b>Add to chart</b>.",
            "Use a daily chart of a growth stock. Check the I (institutions) row yourself in the stock's fund-ownership data.",
            "To get alerted, create an alert on the chart and pick <b>CAN SLIM breakout</b> or <b>Stop hit</b>.",
        ],
    },
    "related": [
        ("/setups/cup-and-handle.html", "#30d158", "setup", "Cup and Handle", "O'Neil's favorite base, step by step on the chart."),
        ("/setups/qullamaggie.html", "#2997ff", "setup", "Qullamaggie Breakout", "A modern momentum-breakout trader's take on the same idea."),
        ("/famous-strategies/post-earnings-drift.html", "#f4b942", "famous strategy", "Post-Earnings Drift", "Why big earnings surprises keep pushing prices for weeks: the research behind C."),
        ("/famous-strategies/cross-sectional-momentum.html", "#ff9f0a", "famous strategy", "Cross-Sectional Momentum", "The research behind L: past winners keep winning, for a while."),
    ],
    "rule": {
        "h2": "Try it on paper first.",
        "p": "Find five stocks that pass the checklist and are building bases. Write down each pivot, the 5% buy zone and the 8% stop before anything happens. Track every breakout for three months, and count how many hit the stop before 20%.",
        "li": ["Check M before every buy, not just once.", "Never move the stop lower.", "Note how many breakouts failed in a weak market."],
    },
    "sources": [
        "O'Neil, W. J. (1988). <i>How to Make Money in Stocks: A Winning System in Good Times or Bad</i>. McGraw-Hill, and later editions. <a class=\"cite-link\" href=\"https://www.mheducation.com/highered/mhp/product/how-make-money-stocks-winning-system-good-times-or-bad.html\" target=\"_blank\" rel=\"noopener\">Source &rsaquo;</a><small>The seven letters and their thresholds (25% earnings growth, ROE 17%, relative strength 80), bases of at least seven weeks, the pivot and the 5% buy zone, breakout volume 40&ndash;50% above normal, the 7&ndash;8% loss rule, 20&ndash;25% profits and the 8-week rule, three out of four stocks following the market, distribution days and the follow-through day.</small>",
        "American Association of Individual Investors (AAII), stock screen performance tracking. <a class=\"cite-link\" href=\"https://www.aaii.com/stock-screens/performance\" target=\"_blank\" rel=\"noopener\">Source &rsaquo;</a><small>The CAN SLIM screen as the top performer of AAII's screens for 1998&ndash;2009, as reported in summaries of AAII's results.</small>",
    ],
    "src": "Built from William O'Neil's book and the sources listed above. Every company, chart, price and checklist value in the walkthroughs is made up for illustration. CAN SLIM is a practitioner's method, not an academic study, and the book's results come from the author's own research. The indicator checks a simplified version of six letters. Past results don't promise future returns. It's shared for education, not as trading advice.",
    "market": "Stocks",
    "who": "William O'Neil",
    "card": "Seven letters for growth leaders, bought on breakouts from sound bases, every loss cut at 7–8%.",
}
