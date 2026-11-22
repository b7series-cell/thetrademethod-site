from fs_build import panel, pair, calc, qb
import fs_mock as M


def mock():
    p = []
    # stepped lines for earnings yield (gold) and ROC (blue) over ~3 years of quarters
    ey = [5.1, 5.4, 5.0, 6.2, 6.8, 7.4, 7.1, 8.3, 9.0, 8.6, 9.4, 10.1]
    roc = [31, 33, 32, 35, 38, 41, 40, 44, 47, 46, 49, 52]
    X0, X1, Yt, Yb = 16, 352, 44, 296
    def X(i): return X0 + i * (X1 - X0) / len(ey)
    def Y(v): return Yb - v / 60 * (Yb - Yt)
    p.append(M.r(X(8), 40, X1 - X(8), 256, "#30d158", 0.13))
    for v in (0, 20, 40, 60):
        p.append(M.ln(X0, Y(v), X1, Y(v), "#2c2c2e", 1))
        p.append(M.t(X1 + 4, Y(v) + 4, "%d%%" % v, "#6e6e73", 10))
    def step(vals, col, w):
        pts = []
        for i, v in enumerate(vals):
            pts += [(X(i), Y(v)), (X(i + 1), Y(v))]
        return M.pl(pts, col, w)
    p.append(step(roc, "#2997ff", 2.2))
    p.append(step(ey, "#f4b942", 2.4))
    p.append(M.t(X(1), Y(roc[1]) - 8, "return on capital", "#2997ff", 11, "start", 700))
    p.append(M.t(X(1), Y(ey[1]) - 8, "earnings yield", "#f4b942", 11, "start", 700))
    p.append(M.t((X(8) + X1) / 2, 58, "in the top 3", "#30d158", 11, "middle", 700))
    p.append(M.t(16, 24, "Magic Formula &#183; quarterly data", "#86868b", 12))
    rows = [
        ([("#", "#86868b"), ("Symbol", "#86868b"), ("EY", "#86868b"), ("ROC", "#86868b")], "#141416"),
        ([("1", "#86868b"), ("Stock A", "#f5f5f7"), ("11.6%", "#f5f5f7"), ("62%", "#f5f5f7")], "#173d24"),
        ([("2", "#86868b"), ("This stock", "#f5f5f7"), ("10.1%", "#f5f5f7"), ("52%", "#f5f5f7")], "#5b4a1f"),
        ([("3", "#86868b"), ("Stock C", "#f5f5f7"), ("7.9%", "#f5f5f7"), ("71%", "#f5f5f7")], "#173d24"),
        ([("4", "#86868b"), ("Stock D", "#f5f5f7"), ("6.2%", "#f5f5f7"), ("44%", "#f5f5f7")], "#1d1d1f"),
        ([("5", "#86868b"), ("Stock E", "#f5f5f7"), ("4.8%", "#f5f5f7"), ("58%", "#f5f5f7")], "#1d1d1f"),
        ([("6", "#86868b"), ("Stock F", "#f5f5f7"), ("9.0%", "#f5f5f7"), ("12%", "#f5f5f7")], "#1d1d1f"),
        ([("7", "#86868b"), ("Stock G", "#f5f5f7"), ("3.3%", "#f5f5f7"), ("21%", "#f5f5f7")], "#1d1d1f"),
        ([("8", "#86868b"), ("Stock H", "#f5f5f7"), ("2.9%", "#f5f5f7"), ("9%", "#f5f5f7")], "#1d1d1f"),
    ]
    p.append(M.table(382, 40, rows, widths=(18, 72, 40, 36)))
    return M.svg("An illustrative mock of the indicator: a pane with the stock's earnings yield in gold and return on capital in blue as stepped lines, a green background while it ranks in the top 3 of the list, and a table ranking eight stocks with this stock second.", p)


SPEC = {
    "slug": "magic-formula",
    "name": "Magic Formula",
    "seo_title": "Greenblatt's Magic Formula, Explained",
    "desc": "Joel Greenblatt's Magic Formula: rank stocks on earnings yield and return on capital and buy the best for a year. Results, losing years, indicator.",
    "kicker": "Famous strategies &middot; Stocks &middot; Joel Greenblatt, <i>The Little Book That Beats the Market</i>, 2005",
    "h1": "Magic <span>Formula</span>",
    "thesis": "Can two numbers pick stocks? Rank every company on how cheap it is and how good a business it is, add the two ranks, and buy the 20 to 30 best totals. Hold each for a year, then replace it.",
    "thesis_em": "Good companies at bargain prices.",
    "counts": [("2", "numbers: earnings yield and return on capital"), ("20&ndash;30", "stocks held, bought a few at a time"), ("30.8%", "a year in the book's 1988&ndash;2004 test")],
    "ribbon": ["Screen the market", "Score two numbers", "Add the ranks", "Buy in batches", "Sell at one year"],
    "facts": [
        ("book", "<i>The Little Book That Beats the Market</i> (2005); <i>&hellip;Still Beats the Market</i> (2010)"),
        ("author", "Joel Greenblatt, Gotham Capital"),
        ("universe", "The largest 3,500 US stocks, without financials or utilities"),
        ("cheap", "Earnings yield: EBIT &divide; enterprise value"),
        ("good", "Return on capital: EBIT &divide; (net working capital + net fixed assets)"),
        ("trade", "Buy the best combined ranks, 20&ndash;30 stocks"),
        ("hold", "One year each, then replace from the new list"),
        ("headline", "30.8% a year vs 12.4% for the S&amp;P 500, 1988&ndash;2004"),
    ],
    "blocks": [
        {"type": "head", "id": "two", "h2": "Two numbers", "p": "Greenblatt boiled value investing down to two questions any business owner would ask: how much does the business earn for what I'm paying, and how much does it earn on the money it needs to run?"},
        {"type": "anim", "key": "two", "title": "Cheap, and good", "aria": "A made-up company with $100M of EBIT: against an enterprise value of $800M it has an earnings yield of 12.5%, and against $400M of working capital and fixed assets it has a return on capital of 25%."},
        {"type": "main", "stage": {"h3": "The rule", "li": [
            "Start with the largest US stocks (the book used 3,500), and leave out financials and utilities, whose balance sheets don't fit the formula.",
            "Rank them all on earnings yield (EBIT &divide; enterprise value), best first, and again on return on capital (EBIT &divide; net working capital plus net fixed assets).",
            "Add the two ranks, buy the stocks with the lowest totals, hold each for a year, and replace it from the current list.",
        ], "why": "Both numbers use EBIT, operating profit before interest and taxes, so companies with different debt and tax situations compare on the same footing."},
            "right": [
                panel("Why these two, and not P/E and ROE?", "The book's versions fix two common distortions.", pair(
                    ("yes", "earnings yield", "Uses enterprise value", "Price plus debt, minus excess cash. A cheap P/E bought with a pile of debt isn't really cheap."),
                    ("yes", "return on capital", "Uses tangible capital", "Working capital plus plants and equipment, the money the business actually needs. Goodwill and accounting leverage don't flatter it."))),
                calc("The made-up company", "Both numbers from one income line.", [("EBIT", "$100M"), ("Enterprise value", "$800M"), ("Earnings yield", "12.5%"), ("Working capital + fixed assets", "$400M"), ("Return on capital", "25%", "tot")]),
            ]},
        {"type": "head", "id": "rank", "h2": "Rank, add, buy", "p": "Neither number decides alone. A stock has to rank well on both to reach the top, which keeps out cheap businesses that are cheap for a reason and great businesses at silly prices."},
        {"type": "anim", "key": "rank", "title": "Two ranks, one list", "aria": "Twelve made-up stocks ranked on earnings yield and on return on capital; the two ranks are added, the list is sorted by the total, and the three best totals are bought, while the cheapest stock is left out because its business is poor."},
        {"type": "main", "stage": {"h3": "The book's buying schedule", "li": [
            "Buy 5 to 7 of the top-ranked stocks.",
            "Every two or three months, buy another 5 to 7 from the current list, until you hold 20 to 30.",
            "Sell each one after a year and replace it. In a taxable account, the book suggests selling losers just before the year is up and winners just after.",
        ], "why": "Staggering the buys means no single ranking date decides the whole portfolio, and it turns the portfolio over a little at a time."},
            "right": [
                qb("<b>Good businesses at bargain prices.</b> That's the whole book in four words, and the formula is just a mechanical way to find them without having to judge each business yourself."),
                calc("A $30,000 start", "One way to follow the schedule (made-up amounts).", [("Month 0: 6 stocks", "$7,500"), ("Month 3: 6 more", "$7,500"), ("Month 6: 6 more", "$7,500"), ("Month 9: 6 more", "$7,500"), ("Month 12 on", "replace the oldest batch", "tot")]),
            ]},
        {"type": "head", "id": "results", "h2": "What the book reported", "p": "The book's backtest was striking. It's a backtest the author ran and published himself, before costs and taxes, so treat it as the best case."},
        {"type": "anim", "key": "results", "title": "The book's numbers", "aria": "Bars from the book: 30.8% a year for the formula against 12.4% for the S&P 500 from 1988 to 2004; $10,000 growing to about $960,000 against $73,000; 22.9% a year in the largest 1,000 stocks; and in the updated edition through 2009, 23.8% and 19.7% against 9.5%."},
        {"type": "four", "cards": [
            ("#30d158", "the book", "30.8% vs 12.4%", "A year, 1988&ndash;2004, top 30 of the largest 3,500 stocks, held a year at a time."),
            ("#f4b942", "big stocks", "22.9% a year", "The same test limited to the largest 1,000 stocks: less edge where more people look."),
            ("#2997ff", "updated", "23.8% vs 9.5%", "A year through 2009, in the updated edition. Ahead, by less than the first test."),
            ("#ff453a", "the catch", "A backtest", "Run and published by the author, before costs and taxes. Treat it as the best case, not a forecast."),
        ]},
        {"type": "head", "id": "patience", "h2": "The hard part is sticking with it", "p": "Greenblatt is blunt about it: the formula doesn't work every year, and he thinks that's exactly why it keeps working."},
        {"type": "anim", "key": "patience", "title": "Losing years, and the schedule", "aria": "Made-up yearly results against the market, four of sixteen years behind; then the book's schedule of buying 5 to 7 stocks every two to three months and selling each after a year."},
        {"type": "timeline", "items": [
            ("#2997ff", "1985", "Gotham Capital", "Greenblatt starts the fund where he ran the concentrated, special-situations version of this kind of investing."),
            ("#30d158", "2005", "The Little Book", "<i>The Little Book That Beats the Market</i> lays out the two numbers and the 1988&ndash;2004 test."),
            ("#30d158", "2010", "&hellip;Still Beats the Market", "The updated edition carries the test through 2009 and reports smaller, still positive, excess returns."),
            ("#ff453a", "Since", "A famous screen", "Free screeners run the formula daily. Like every published edge, a crowd following it may shrink what's left."),
        ]},
    ],
    "steps": [
        {"h3": "Screen", "li": ["Large enough US stocks (the book used the largest 3,500; above $50 million to $1 billion in its tests).", "Leave out financials and utilities."], "why": "The formula's numbers don't make sense for banks' and utilities' balance sheets."},
        {"h3": "Score", "li": ["Earnings yield: EBIT &divide; enterprise value.", "Return on capital: EBIT &divide; (net working capital + net fixed assets)."], "why": "How cheap, and how good."},
        {"h3": "Rank", "li": ["Rank everything on each number, best = 1.", "Add the two ranks; lowest total first."], "why": "Good on both beats great on one."},
        {"h3": "Buy", "li": ["5 to 7 stocks from the top of the list.", "Repeat every two or three months until you hold 20 to 30."], "why": "No single ranking date decides everything."},
        {"h3": "Replace", "li": ["Sell each stock after a year and buy from the current list.", "Keep going for years; the book says three to five at the least."], "why": "The losing years are part of the deal."},
    ],
    "indicator": {
        "note": "One TradingView script for this strategy (Pine Script v6). It pulls TradingView's fundamental data to compute both numbers for the chart's stock, ranks it against a list of up to 7 others the way the book does, and alerts when it moves into or out of the top. It marks and alerts. It doesn't place trades.",
        "name": "Magic Formula Rank",
        "blurbs": [
            "A pane under your chart with the stock's earnings yield (gold) and return on capital (blue), stepping as each new quarter's numbers arrive. The background turns green while the stock is in the top N of your list.",
            "A table ranks the whole list on the combined score: both numbers, each stock's place, the top N in green and the chart's stock highlighted. It ships with seven large US stocks; swap in your own shortlist.",
            "<span style=\"color:var(--ash)\">EBIT is the trailing twelve months, the balance sheet the latest quarter. TradingView doesn't separate excess cash, so working capital includes all cash: a close version of the book's formula, not an exact one. Use it on stocks only, and leave banks and utilities out of the list.</span>",
        ],
        "mock": mock(),
        "howto": [
            "Copy the code below, or download the .pine file.",
            "In TradingView, open the Pine Editor at the bottom of a chart, paste it in, and click <b>Add to chart</b>.",
            "Open any timeframe chart of a US stock, then put your own shortlist into the settings (up to 7 symbols) and set how many count as the top.",
            "To get alerted, create an alert on the chart and pick <b>Moved into the top</b> or <b>Dropped out of the top</b>.",
        ],
    },
    "related": [
        ("/famous-strategies/cross-sectional-momentum.html", "#30d158", "famous strategy", "Cross-Sectional Momentum", "Another rank-and-hold strategy, ranking on past returns instead of value."),
        ("/famous-strategies/post-earnings-drift.html", "#2997ff", "famous strategy", "Post-Earnings Drift", "What happens to prices after the earnings numbers this formula is built on."),
        ("/trading-earnings.html", "#f4b942", "fundamentals", "How to Trade Earnings", "Reading the report itself: the headline, the call and the reaction."),
        ("/four-pillars.html", "#ff9f0a", "fundamentals", "Four Pillars", "Sizing and discipline, the parts that decide whether you stick with a system."),
    ],
    "rule": {
        "h2": "Try it on paper first.",
        "p": "Run a free Magic Formula screen today, write down the top 30, and pick 6 to follow. Add 6 more every three months. Check them against the S&P 500 after a year, and note how you felt in the months they lagged.",
        "li": ["Fix the size cut-off and the number of stocks before you start.", "Write down the buy date of every batch, so you know when each is due.", "Decide now what you'll do after a losing year."],
    },
    "sources": [
        "Greenblatt, J. (2005). <i>The Little Book That Beats the Market</i>. Wiley. <a class=\"cite-link\" href=\"https://www.wiley.com/en-us/The+Little+Book+That+Beats+the+Market-p-9780470893661\" target=\"_blank\" rel=\"noopener\">Source &rsaquo;</a><small>The two numbers and their definitions, the largest 3,500 stocks, the exclusions, the buying and selling schedule, 30.8% vs 12.4% a year (1988&ndash;2004), $10,000 to about $960,000 vs $73,000, 22.9% in the largest 1,000 stocks, and underperforming in about one year in four.</small>",
        "Greenblatt, J. (2010). <i>The Little Book That Still Beats the Market</i>. Wiley. <a class=\"cite-link\" href=\"https://www.wiley.com/en-us/The+Little+Book+That+Still+Beats+the+Market-p-9780470624159\" target=\"_blank\" rel=\"noopener\">Source &rsaquo;</a><small>The updated test through 2009: about 23.8% (above $50 million) and 19.7% (above $1 billion) a year, against 9.5% for the S&amp;P 500.</small>",
    ],
    "src": "Built from Joel Greenblatt's two books. The figures quoted from the books are labelled as such on the charts; they come from the author's own backtests, before trading costs and taxes. Every company, ranking, yearly result and dollar amount in the walkthroughs is made up for illustration, and the smooth growth lines are drawn at the average rates, not the real year-by-year path. The indicator uses TradingView's fundamental data and a close version of the formula. Past results don't promise future returns. It's shared for education, not as trading advice.",
    "market": "Stocks",
    "who": "Joel Greenblatt",
    "card": "Rank stocks on earnings yield and return on capital, add the ranks, and hold the best totals for a year.",
}
