// CHART 4 — STACKED BAR CHART
(function() {
    const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const TOP_CAUSES  = ["Owner Move In","Breach","Nuisance","Ellis Act WithDrawal","Non Payment","Capital Improvement"];
    const colors = {
        "Owner Move In":"#a6cee3","Breach":"#1f78b4","Nuisance":"#b2df8a",
        "Ellis Act WithDrawal":"#33a02c","Non Payment":"#fb9a99","Capital Improvement":"#e31a1c","Other":"#fdbf6f"
    };
    const causes = [...TOP_CAUSES,"Other"];

    const seasonalInsights = {
        "Jan":"Post-holiday financial strain begins to surface, with Non-Payment notices running higher than the annual average as renters recover from December expenses.",
        "Feb":"Ellis Act filings tick upward in February, often reflecting early-year landlord decisions to remove units from the rental market ahead of spring.",
        "Mar":"Owner Move-In filings begin climbing as landlords position units ahead of the spring and summer lease cycle — displacement pressure starts building.",
        "Apr":"April is the peak month for Owner Move-In evictions, with landlords timing displacement to align with lease expirations and the high-demand summer re-letting window.",
        "May":"The spring Owner Move-In surge continues through May, one of the highest-volume months for total eviction filings across all years combined.",
        "Jun":"June records the highest share of Owner Move-In evictions of any month, coinciding with academic year endings and the peak of annual tenant turnover.",
        "Jul":"Owner Move-In filings ease as the summer lease window closes, but Breach notices begin their late-summer climb as occupancy disputes increase.",
        "Aug":"Breach-of-lease filings reach their highest share of any month in August, suggesting landlords respond more aggressively to summer-period occupancy violations.",
        "Sep":"Non-Payment filings rise in September as post-summer financial strain sets in, while Breach notices remain elevated heading into the fall.",
        "Oct":"October is the most legally contested month of the fall — Breach and Nuisance filings both peak, reflecting end-of-year friction between landlords and tenants.",
        "Nov":"Nuisance evictions reach their highest share of any month in November, even as total filings dip ahead of the holiday season.",
        "Dec":"December sees the lowest overall filing volume but Non-Payment notices return to their highest share of the year, reflecting holiday-period financial hardship.",
    };

    const margin = { top:20, right:30, bottom:60, left:62 };
    const totalW=820, totalH=440;
    const W = totalW-margin.left-margin.right, H = totalH-margin.top-margin.bottom;

    const svg = d3.select("#chart-barchart").append("svg")
        .attr("width",totalW).attr("height",totalH)
        .append("g").attr("transform",`translate(${margin.left},${margin.top})`);

    d3.csv("data/evictions_clean.csv").then(raw => {
        const monthData = MONTH_NAMES.map((name,idx) => {
            const rows = raw.filter(d=>+d.month===idx+1);
            const entry = { month: name, _total: rows.length };
            TOP_CAUSES.forEach(c => { entry[c] = d3.sum(rows, d=>d[c]==="True"||d[c]==="true"?1:0); });
            const topSet = new Set(TOP_CAUSES);
            entry["Other"] = rows.filter(d=>!topSet.has(d.primary_cause)).length;
            return entry;
        });

        const series = d3.stack().keys(causes)(monthData);
        const x = d3.scaleBand().domain(MONTH_NAMES).range([0,W]).padding(0.25);
        const y = d3.scaleLinear().domain([0, d3.max(series[series.length-1], d=>d[1])*1.08]).range([H,0]);

        svg.append("g").attr("class","grid").call(d3.axisLeft(y).tickSize(-W).tickFormat("").ticks(6));

        svg.selectAll(".cause-group").data(series).enter().append("g").attr("fill",d=>colors[d.key])
            .selectAll("rect").data(d=>d.map(pt=>({...pt,cause:d.key}))).enter().append("rect")
                .attr("class","bar-segment")
                .attr("x",d=>x(d.data.month)).attr("y",d=>y(d[1]))
                .attr("height",d=>Math.max(0,y(d[0])-y(d[1]))).attr("width",x.bandwidth())
                .on("mousemove",(event,d) => {
                    // Feedback #1: Added total count to bar chart tooltip
                    const total = d.data._total;
                    showTip(event,`
                        <div class="tooltip-month">${d.data.month}</div>
                        <div class="tooltip-count">${total.toLocaleString()} total notices</div>
                        <div class="tooltip-insight">${seasonalInsights[d.data.month]}</div>
                    `);
                })
                .on("mouseleave",hideTip);

        svg.append("g").attr("class","axis").attr("transform",`translate(0,${H})`).call(d3.axisBottom(x).tickSizeOuter(0));
        svg.append("g").attr("class","axis").call(d3.axisLeft(y).ticks(6).tickFormat(d=>d.toLocaleString()));
        svg.append("text").attr("transform","rotate(-90)").attr("y",-52).attr("x",-(H/2))
            .attr("text-anchor","middle").attr("fill","#555").style("font-size","0.75rem")
            .style("font-family","Georgia, serif").text("Total Eviction Notices Filed");

        const swatchSize=11, colWidth=158;
        [causes.slice(0,4), causes.slice(4)].forEach((row,rowIdx) => {
            const startX = (W-row.length*colWidth)/2;
            row.forEach((cause,i) => {
                const lx=startX+i*colWidth, ly=H+32+rowIdx*18;
                svg.append("rect").attr("x",lx).attr("y",ly).attr("width",swatchSize).attr("height",swatchSize).attr("fill",colors[cause]);
                svg.append("text").attr("class","legend-label").attr("x",lx+swatchSize+5).attr("y",ly+swatchSize-1).text(cause);
            });
        });
    });
})();
