// CHART 2 — HEATMAP
(function() {
    const TOP_CAUSES = ["Owner Move In","Breach","Nuisance","Non Payment","Ellis Act WithDrawal","Late Payments","Roommate Same Unit","Capital Improvement"];
    // Spectral 5-class from ColorBrewer: low evictions = green, high = orange/red
    const COLOR_RANGE = ["#abdda4", "#ffffbf", "#fdae61", "#f46d43", "#d53e4f"];
    const STANDOUT = 0.6;

    const narratives = {
        "Sunset/Parkside|Owner Move In":          "Sunset/Parkside leads all neighborhoods in Owner Move-In evictions. Its large stock of single-family homes and two-unit buildings makes it especially vulnerable to landlords reclaiming units for personal occupancy.",
        "Mission|Owner Move In":                  "The Mission's high Owner Move-In count reflects decades of gentrification pressure, as rising property values incentivized landlords to displace long-term tenants in favor of owner occupancy.",
        "Outer Richmond|Owner Move In":           "Outer Richmond's predominantly residential character and owner-occupied building stock have made Owner Move-In one of its most common eviction tools.",
        "Lakeshore|Breach":                       "Lakeshore's outsized Breach count is largely driven by a cluster of large apartment complexes, where lease violation filings have been filed at unusually high rates relative to the neighborhood's size.",
        "Mission|Breach":                         "Breach-of-lease filings in the Mission reflect the neighborhood's dense rental market, where landlord-tenant disputes over lease terms have been a persistent feature of the eviction landscape.",
        "Tenderloin|Breach":                      "The Tenderloin's high Breach count is tied to its concentration of single-room occupancy hotels and subsidized housing, where lease enforcement is frequently used as a displacement mechanism.",
        "Tenderloin|Nuisance":                    "The Tenderloin records more Nuisance evictions than any other neighborhood — nearly double its nearest rival. Its density, transient population, and SRO-heavy housing stock make it the city's epicenter of nuisance-based displacement.",
        "Mission|Nuisance":                       "The Mission's high Nuisance count reflects both the neighborhood's density and the use of nuisance filings as a tool during periods of intense gentrification pressure in the 2000s and 2010s.",
        "Mission|Non Payment":                    "The Mission leads in Non-Payment evictions, reflecting the financial vulnerability of its historically lower-income, working-class tenant base to economic downturns and rent increases.",
        "Bayview Hunters Point|Non Payment":      "Bayview Hunters Point's elevated Non-Payment rate reflects persistent income inequality and economic precarity in one of San Francisco's most disinvested neighborhoods.",
        "Mission|Ellis Act WithDrawal":           "The Mission has seen more Ellis Act evictions than any other neighborhood, a pattern closely tied to investor speculation and the conversion of rental properties during the dot-com and tech boom eras.",
        "Mission|Late Payments":                  "Late Payment filings in the Mission track closely with its Non-Payment numbers, reflecting the same pattern of economic stress among the neighborhood's rent-burdened tenant population.",
        "Sunset/Parkside|Late Payments":          "Sunset/Parkside's Late Payments notices mirror its Owner Move-In profile — both reflect a landlord base more likely to pursue formal legal action over tenancy issues.",
        "Mission|Roommate Same Unit":             "The Mission's density and culture of shared housing have produced the city's highest rate of Roommate Same Unit evictions, where landlords seek to remove unauthorized occupants or subtenants.",
        "Castro/Upper Market|Roommate Same Unit": "Castro/Upper Market's high Roommate Same Unit count reflects its concentration of older multi-unit buildings where subletting and shared occupancy arrangements are common.",
        "Mission|Capital Improvement":            "The Mission leads in Capital Improvement evictions, a pattern consistent with landlord-driven renovation strategies during the neighborhood's prolonged period of speculative investment.",
    };

    const margin = { top: 90, right: 150, bottom: 70, left: 180 };
    const totalW = 1050, cellH = 22, nRows = 20;
    const H = cellH * nRows, totalH = H + margin.top + margin.bottom;
    const W = totalW - margin.left - margin.right;

    const svg = d3.select("#chart-heatmap").append("svg")
        .attr("width", totalW).attr("height", totalH)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    d3.csv("data/evictions_clean.csv").then(raw => {
        const filtered = raw.filter(d => d["Neighborhood - Analysis"] && d.primary_cause);
        const nTotals  = d3.rollup(filtered, v=>v.length, d=>d["Neighborhood - Analysis"]);
        const top20    = Array.from(nTotals.entries()).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([n])=>n);
        const nested   = d3.rollup(
            filtered.filter(d=>top20.includes(d["Neighborhood - Analysis"])),
            v=>v.length, d=>d["Neighborhood - Analysis"], d=>d.primary_cause);

        const cells = [];
        top20.forEach(nhood => {
            const cm = nested.get(nhood)||new Map();
            TOP_CAUSES.forEach(cause => cells.push({ nhood, cause, count: cm.get(cause)||0 }));
        });

        const causeMax = new Map();
        TOP_CAUSES.forEach(cause =>
            causeMax.set(cause, d3.max(cells.filter(c=>c.cause===cause), c=>c.count)||1));

        const norm = (cause, count) => count / causeMax.get(cause);
        const cellColor = (cause, count) => d3.interpolateRgbBasis(COLOR_RANGE)(norm(cause,count));

        const x = d3.scaleBand().domain(TOP_CAUSES).range([0,W]).padding(0.06);
        const y = d3.scaleBand().domain(top20).range([0,H]).padding(0.06);

        svg.selectAll(".cell").data(cells).enter().append("rect")
            .attr("class", d => (norm(d.cause,d.count)>=STANDOUT && narratives[`${d.nhood}|${d.cause}`])
                ? "cell cell-standout" : "cell")
            .attr("x", d=>x(d.cause)).attr("y", d=>y(d.nhood))
            .attr("width", x.bandwidth()).attr("height", y.bandwidth())
            .attr("rx", 2).attr("fill", d=>cellColor(d.cause,d.count))
            .on("mousemove", (event,d) => {
                const text = narratives[`${d.nhood}|${d.cause}`];
                if (!text) return;
                showTip(event,`<div class="tooltip-header">${d.nhood} — ${d.cause}</div><div class="tooltip-insight">${text}</div>`);
            })
            .on("mouseleave", hideTip);

        svg.append("g").attr("class","axis").call(d3.axisTop(x).tickSize(0))
            .selectAll("text")
                .style("font-size","0.70rem").style("font-family","Georgia, serif").style("fill","#444")
                .attr("text-anchor","start").attr("dx","0.3em").attr("dy","-0.4em")
                .attr("transform","rotate(-40)");

        svg.append("g").attr("class","axis").call(d3.axisLeft(y).tickSize(0))
            .selectAll("text").style("font-size","0.72rem").style("font-family","Georgia, serif")
            .style("fill","#444").attr("dx","-0.4em");

        // Feedback #1: Legend spans full grid width, never cut off
        const legendW = W, legendH = 11, legendX = 0, legendY = H + 26;
        const lgDefs = svg.append("defs");
        const grad   = lgDefs.append("linearGradient").attr("id","hm-grad");
        COLOR_RANGE.forEach((c,i) =>
            grad.append("stop").attr("offset",`${i/(COLOR_RANGE.length-1)*100}%`).attr("stop-color",c));
        svg.append("rect").attr("x",legendX).attr("y",legendY)
            .attr("width",legendW).attr("height",legendH).attr("rx",2)
            .style("fill","url(#hm-grad)").style("outline","1px solid #bbb");
        svg.append("text").attr("x",legendX).attr("y",legendY+legendH+14)
            .attr("text-anchor","start").style("font-size","0.68rem").style("fill","#888")
            .style("font-family","Georgia, serif").text("Fewer notices (green)");
        svg.append("text").attr("x",legendX+legendW).attr("y",legendY+legendH+14)
            .attr("text-anchor","end").style("font-size","0.68rem").style("fill","#888")
            .style("font-family","Georgia, serif").text("More notices (orange)");
    });
})();
