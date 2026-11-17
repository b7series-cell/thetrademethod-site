from fs_build import panel, pair, calc, qb
import fs_mock as M


def mock():
    p = []
    bm = [0.52, 0.55, 0.61, 0.58, 0.66, 0.71, 0.69, 0.74, 0.79, 0.76, 0.82, 0.88]
    v70 = [0.70, 0.71, 0.71, 0.72, 0.72, 0.73, 0.72, 0.72, 0.73, 0.74, 0.73, 0.73]
    g30 = [0.22, 0.22, 0.23, 0.23, 0.22, 0.23, 0.24, 0.23, 0.23, 0.22, 0.23, 0.23]
    X0, X1, Yt, Yb = 16, 352, 44, 296
    def X(i): return X0 + i * (X1 - X0) / len(bm)
    def Y(v): return Yb - v / 1.0 * (Yb - Yt)
    p.append(M.r(X(7), 40, X1 - X(7), 256, "#30d158", 0.13))
    for v in (0, 0.25, 0.5, 0.75, 1.0):
        p.append(M.ln(X0, Y(v), X1, Y(v), "#2c2c2e", 1))
        p.append(M.t(X1 + 4, Y(v) + 4, "%.2f" % v, "#6e6e73", 10))
    def step(vals, col, w):
        pts = []
        for i, v in enumerate(vals):
            pts += [(X(i), Y(v)), (X(i + 1), Y(v))]
        return M.pl(pts, col, w)
    p.append(step(v70, "#30d158", 1.2))
    p.append(step(g30, "#ff453a", 1.2))
    p.append(step(bm, "#f4b942", 2.4))
    p.append(M.t(X(1), Y(bm[1]) - 8, "book-to-market", "#f4b942", 11, "start", 700))
    p.append(M.t(X(1), Y(v70[1]) - 6, "value line", "#30d158", 10, "start", 600))
    p.append(M.t(X(1), Y(g30[1]) - 6, "growth line", "#ff453a", 10, "start", 600))
    p.append(M.t((X(7) + X1) / 2, 58, "small value", "#30d158", 11, "middle", 700))
    p.append(M.t(16, 24, "Value/Size &#183; this stock vs your list", "#86868b", 12))
    rows = [
        ([("F", "#f5f5f7"), ("Growth", "#86868b"), ("Neutral", "#86868b"), ("Value", "#86868b")], "#141416"),
        ([("Small", "#86868b"), ("1", "#f5f5f7"), ("2", "#f5f5f7"), ("&#9679; 3", "#f5f5f7")], "#1d1d1f"),
        ([("Big", "#86868b"), ("3", "#f5f5f7"), ("2", "#f5f5f7"), ("1", "#f5f5f7")], "#1d1d1f"),
        ([("B/M", "#86868b"), ("0.88", "#f5f5f7"), ("Size", "#86868b"), ("48.1B", "#f5f5f7")], "#1d1d1f"),
    ]
    p.append(M.table(370, 40, rows, widths=(40, 50, 52, 40)))
    p.append(M.r(370 + 40 + 50 + 52, 40 + 19, 42, 18, "#5b4a1f", 0.85))
    p.append(M.t(370 + 40 + 50 + 52 + 6, 40 + 19 + 13, "&#9679; 3", "#f5f5f7", 11, "start", 600))
    return M.svg("An illustrative mock of the indicator: a pane with the stock's book-to-market in gold rising above the list's value line, a green background while it sits in the small-value box, and a two-by-three table counting the list's stocks in each size and value box with this stock marked in small value.", p)


SPEC = {
    "slug": "value-and-size",
    "name": "Value and Size",
    "seo_title": "Fama-French Value and Size Effects, Explained",
    "desc": "The Fama-French value and size effects (1992, 1993): beta didn't explain returns, but size and book-to-market did. The sorts, the six boxes behind SMB and HML, how much the premiums shrank after publication, plus a free TradingView indicator.",
    "kicker": "Famous strategies &middot; Stocks &middot; Fama and French, <i>Journal of Finance</i>, 1992",
    "h1": "Value <span>and Size</span>",
    "thesis": "Do cheap stocks and small stocks earn more? Fama and French found that two easy numbers, market value and book-to-market, lined up with average returns far better than beta did. Tilt toward small and cheap, rebalance once a year, and wait.",
    "thesis_em": "Two numbers, not one.",
    "counts": [("1.53%", "a month: value minus growth, 1963&ndash;1990"), ("6", "boxes behind the SMB and HML factors"), ("0.11%", "a month: the value premium after 1991")],
    "ribbon": ["Measure size and value", "Sort into boxes", "Tilt small and cheap", "Rebalance each June", "Wait out the droughts"],
    "facts": [
        ("paper", "\"The Cross-Section of Expected Stock Returns\""),
        ("authors", "Eugene Fama &amp; Kenneth French"),
        ("published", "<i>Journal of Finance</i> 47(2), 1992, pp. 427&ndash;465"),
        ("sample", "Nonfinancial NYSE, AMEX and NASDAQ stocks, 1963&ndash;1990"),
        ("signals", "Size (market value) and book-to-market"),
        ("follow-up", "The three-factor model, <i>Journal of Financial Economics</i>, 1993"),
        ("rebalance", "Once a year, in June"),
        ("headline", "Lowest to highest book-to-market: 0.30% to 1.83% a month"),
    ],
    "blocks": [
        {"type": "head", "id": "beta", "h2": "The paper that sank beta", "p": "For decades the textbook answer was that a stock's beta, how much it moves with the market, sets its expected return. Fama and French tested it on almost three decades of US stocks, and it didn't hold up."},
        {"type": "anim", "key": "beta", "title": "Flat, not rising", "aria": "A chart of beta against average monthly return: the CAPM line rises, but the made-up portfolio dots and the line the paper found are flat, with two portfolios of very different beta both earning about 1.2% a month."},
        {"type": "main", "stage": {"h3": "What the paper found", "li": [
            "From 1963 to 1990, the relation between beta and average return was flat, even when beta was the only thing tested.",
            "Two simple numbers did line up with returns: size (smaller stocks earned more) and book-to-market (stocks priced cheaply against their book value earned more).",
            "Together, size and book-to-market absorbed the effects of leverage and earnings-to-price that earlier studies had found.",
        ], "why": "It didn't say risk doesn't matter. It said beta, measured the usual way, wasn't the risk the market was paying for."},
            "right": [
                qb("<b>From the abstract:</b> \"Two easily measured variables, size and book-to-market equity, combine to capture the cross-sectional variation in average stock returns associated with market &beta;, size, leverage, book-to-market equity, and earnings-price ratios.\""),
                calc("Beta on its own", "The paper's test of beta alone, 1963&ndash;1990.", [("Slope on beta", "0.15% a month"), ("t-statistic", "0.46"), ("Verdict", "no reliable relation", "tot")]),
            ]},
        {"type": "head", "id": "sort", "h2": "The two sorts", "p": "The method is simple enough to copy: rank every stock on one number, split them into ten groups, and see what each group earned over the next year."},
        {"type": "anim", "key": "sort", "title": "Small beat big, cheap beat expensive", "aria": "Ten size groups with the smallest earning 1.64% a month and the largest 0.90%, then ten book-to-market groups with the lowest earning 0.30% and the highest 1.83%, a gap of 1.53% a month, 1963 to 1990."},
        {"type": "main", "stage": {"h3": "How the portfolios were built", "li": [
            "Each June, measure size as market value at the end of June, and book-to-market from the previous fiscal year's book equity and December's market value.",
            "Use NYSE stocks to set the cut-offs, so the many tiny NASDAQ stocks don't fill every group, then hold each group from July to the next June.",
            "Leave out financial companies, whose high leverage means something different from an industrial company's.",
        ], "why": "The six-month gap between the fiscal year end and July makes sure the accounting numbers were public before the portfolio is formed."},
            "right": [
                panel("What \"value\" means here", "Book-to-market is the paper's measure of cheap.", pair(
                    ("yes", "high book-to-market", "Value", "The market prices the company low against the equity on its books. Often out-of-favor, slow-growing or troubled companies."),
                    ("care", "low book-to-market", "Growth", "The market pays many times book value, expecting growth the accounts don't show yet."))),
                calc("A made-up stock", "Book-to-market in one line.", [("Book equity", "$4.0B"), ("Market value", "$5.0B"), ("Book-to-market", "0.80", "tot")]),
            ]},
        {"type": "head", "id": "boxes", "h2": "Six boxes and two factors", "p": "The 1993 follow-up turned the two effects into factors anyone can measure, and they became the standard yardstick for judging funds and new strategies."},
        {"type": "anim", "key": "boxes", "title": "SMB and HML", "aria": "A two-by-three grid of small and big against growth, neutral and value; SMB is the small row minus the big row, HML is the value column minus the growth column, and with the market they make the three-factor model."},
        {"type": "four", "cards": [
            ("#2997ff", "market", "The market", "Stocks minus T-bills. What every stock portfolio earns for owning stocks at all."),
            ("#30d158", "SMB", "Small minus big", "The extra return of small stocks over big ones, with value and growth balanced out."),
            ("#f4b942", "HML", "High minus low", "The extra return of high book-to-market (value) over low (growth), with size balanced out."),
            ("#ff9f0a", "how it's used", "The yardstick", "If a fund's returns are explained by these three, its manager added nothing you couldn't buy cheaply."),
        ]},
        {"type": "head", "id": "decline", "h2": "After the paper", "p": "Like most famous anomalies, both effects got weaker once they were famous. How much weaker is still argued about, by the same two authors among others."},
        {"type": "anim", "key": "decline", "title": "Smaller, and noisy", "aria": "The value premium of 0.42% a month in 1963 to 1991 falling to 0.11% a month in 1992 to 2019, a made-up noisy monthly line around it, and a note that the size effect was weak after 1981 unless low-quality stocks are removed."},
        {"type": "timeline", "items": [
            ("#2997ff", "1981", "Banz", "Small stocks earn more than their betas say: the size effect."),
            ("#30d158", "1992", "Fama &amp; French", "Beta is flat; size and book-to-market capture the differences in returns."),
            ("#30d158", "1993", "Fama &amp; French", "The three-factor model: market, SMB and HML."),
            ("#2997ff", "2015", "Fama &amp; French", "A five-factor model adds profitability and investment."),
            ("#ff453a", "2021", "Fama &amp; French", "\"The Value Premium\": 0.42% a month before 1992, 0.11% after, with too much noise to be sure."),
        ]},
    ],
    "steps": [
        {"h3": "Measure", "li": ["Size: price times shares outstanding.", "Book-to-market: book equity divided by market value."], "why": "Two numbers from any annual report."},
        {"h3": "Sort", "li": ["Small or big, split at the median (the paper uses NYSE stocks for the cut-off).", "Growth, neutral or value, split at the 30th and 70th percentiles."], "why": "Six boxes, as in the 1993 paper."},
        {"h3": "Tilt", "li": ["Put more money toward small and value, or hold a fund that does.", "Small value is where both effects stack."], "why": "It's a tilt, not a stock pick: you own lots of names."},
        {"h3": "Rebalance", "li": ["Re-sort once a year. The papers form portfolios each June.", "Trade as little as possible in between."], "why": "The premiums are small. Turnover costs can eat them."},
        {"h3": "Wait", "li": ["Value has had long stretches of losing to growth, including much of the 2010s.", "Decide in advance how long you'll give it."], "why": "The premium, if it's there, shows up over decades, not months."},
    ],
    "indicator": {
        "note": "One TradingView script for this strategy (Pine Script v6). It reads TradingView's fundamental data to compute book-to-market and market value for the chart's stock and up to 11 others, sorts the list into the paper's six boxes, and shows which box the chart's stock is in. It marks and alerts. It doesn't place trades.",
        "name": "Value and Size Box",
        "blurbs": [
            "A pane under your chart with the stock's book-to-market (gold) against your list's value line (its 70th percentile, green) and growth line (its 30th percentile, red). The background turns green while the stock sits in the small-value box.",
            "A table shows the six boxes, small and big against growth, neutral and value, with how many of your stocks fall in each and a dot on the chart's stock, plus its book-to-market and market value.",
            "<span style=\"color:var(--ash)\">It sorts the list you give it, not the whole market, so \"small\" means small within your list. Book value is the latest quarter. Leave banks and insurers out, as the paper did.</span>",
        ],
        "mock": mock(),
        "howto": [
            "Copy the code below, or download the .pine file.",
            "In TradingView, open the Pine Editor at the bottom of a chart, paste it in, and click <b>Add to chart</b>.",
            "Open a chart of a US stock and put your own list of 11 stocks into the settings. A wider spread of sizes gives a more meaningful sort.",
            "To get alerted, create an alert on the chart and pick <b>Moved into small value</b>.",
        ],
    },
    "related": [
        ("/famous-strategies/magic-formula.html", "#30d158", "famous strategy", "Magic Formula", "A value strategy that also demands a good business, to avoid cheap-for-a-reason stocks."),
        ("/famous-strategies/cross-sectional-momentum.html", "#2997ff", "famous strategy", "Cross-Sectional Momentum", "The factor the three-factor model couldn't explain, added by Carhart in 1997."),
        ("/famous-strategies/pairs-trading.html", "#f4b942", "famous strategy", "Pairs Trading", "A market-neutral way to bet on relative value between two stocks."),
        ("/four-pillars.html", "#ff9f0a", "fundamentals", "Four Pillars", "The discipline it takes to hold a strategy through years of lagging."),
    ],
    "rule": {
        "h2": "Try it on paper first.",
        "p": "Pick 30 stocks across sizes and sectors, with no banks. Sort them into the six boxes with the indicator, and write down the small-value names. Check them against the S&amp;P 500 next June, and the June after.",
        "li": ["Fix the list and the sort date before you start.", "Compare against a plain index fund, not a hand-picked benchmark.", "Write down how long you'll give it before deciding."],
    },
    "sources": [
        "Fama, E. F., &amp; French, K. R. (1992). The cross-section of expected stock returns. <i>Journal of Finance</i>, 47(2), 427&ndash;465.<small>The sample, the June portfolio formation, the flat beta relation (1.20% vs 1.18%; slope 0.15%, t = 0.46), size returns of 1.64% to 0.90% a month, book-to-market returns of 0.30% to 1.83% (a 1.53% gap), and the abstract quoted.</small>",
        "Fama, E. F., &amp; French, K. R. (1993). Common risk factors in the returns on stocks and bonds. <i>Journal of Financial Economics</i>, 33(1), 3&ndash;56.<small>The six size and book-to-market portfolios, SMB, HML and the three-factor model.</small>",
        "Fama, E. F., &amp; French, K. R. (2021). The value premium. <i>Review of Asset Pricing Studies</i>, 11(1), 105&ndash;121.<small>The value premium of 0.42% a month in 1963&ndash;1991 and 0.11% in 1992&ndash;2019, and the caution that volatility limits confidence in the decline.</small>",
        "Banz, R. W. (1981). The relationship between return and market value of common stocks. <i>Journal of Financial Economics</i>, 9(1), 3&ndash;18.",
        "Fama, E. F., &amp; French, K. R. (2015). A five-factor asset pricing model. <i>Journal of Financial Economics</i>, 116(1), 1&ndash;22.",
        "Asness, C., Frazzini, A., Israel, R., Moskowitz, T. J., &amp; Pedersen, L. H. (2018). Size matters, if you control your junk. <i>Journal of Financial Economics</i>, 129(3), 479&ndash;509.",
    ],
    "src": "Built from Fama and French's papers and the research listed above. The figures quoted from the papers are labelled as such on the charts. Every stock, portfolio dot and monthly line in the walkthroughs is made up for illustration, and the middle groups of each sort are left blank rather than invented. The indicator sorts a list you choose, not the whole market. Past results from these studies don't promise future returns. It's shared for education, not as trading advice.",
    "market": "Stocks",
    "who": "Fama & French, 1992–93",
    "card": "Beta didn't explain returns; size and book-to-market did. Tilt small and cheap, re-sort each June.",
}
