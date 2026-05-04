// CHART 3 — LINE CHART
(function() {
    const annotations = [
        { year:1998, title:"Dot-com boom peak:",    body:"evictions surge",            context:"The late-1990s tech boom drove rapid rent increases and owner move-in evictions as landlords sought higher-paying tenants. Filings peaked near 3,000 annually.", lx:8,   ly:-68,  anchor:"start" },
        { year:2001, title:"Dot-com bust:",          body:"rapid decline",              context:"The collapse of the dot-com bubble triggered mass layoffs across the Bay Area tech sector, cooling the rental market and sharply reducing eviction pressure.",   lx:22,  ly:-68,  anchor:"start" },
        { year:2009, title:"2008 Financial Crisis:", body:"filings hit decade low",     context:"The national mortgage crisis reduced investor activity in SF's rental market. Foreclosures and economic uncertainty suppressed eviction filings to their lowest point in over a decade.", lx:-16, ly:-88,  anchor:"start" },
        { year:2016, title:"Tech boom 2.0:",         body:"evictions near 1990s highs", context:"A second wave of tech industry growth reignited gentrification pressure, pushing Ellis Act and owner move-in evictions back toward 1990s levels.",               lx:0,   ly:-88,  anchor:"start" },
        { year:2020, title:"COVID-19 moratorium:",   body:"sharp drop in filings",      context:"California's eviction moratorium, enacted in March 2020, effectively halted most residential evictions statewide. Filings dropped by over 60% in a single year.", lx:-16, ly:-132, anchor:"start" },
        { year:2023, title:"Post-pandemic stall:",   body:"filings remain suppressed",  context:"Despite the expiration of moratorium protections, filings have not returned to pre-pandemic levels. Ongoing tenant protections and landlord uncertainty have kept numbers unusually low.", lx:0, ly:-88,  anchor:"start" },
    ];

    const margin = { top:24, right:90, bottom:50, left:66 };
    const totalW = 950, totalH = 473;
    const W = totalW - margin.left - margin.right;
    const H = totalH - margin.top  - margin.bottom;

    const svg = d3.select("#chart-linechart").append("svg")
        .attr("width", totalW).attr("height", totalH)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    d3.csv("data/evictions_clean.csv").then(raw => {
        const counts = d3.rollup(raw, v=>v.length, d=>+d.year);
        const data   = Array.from(counts, ([year,count])=>({year,count}))
            .filter(d=>d.year>=1997&&d.year<=2025).sort((a,b)=>a.year-b.year);

        const x = d3.scaleLinear().domain([1997,2025]).range([0,W]);
        const y = d3.scaleLinear().domain([0, d3.max(data,d=>d.count)*1.38]).range([H,0]);

        svg.append("g").attr("class","grid")
            .call(d3.axisLeft(y).tickSize(-W).tickFormat("").ticks(6));

        svg.append("path").datum(data).attr("class","area-fill")
            .attr("d", d3.area().x(d=>x(d.year)).y0(H).y1(d=>y(d.count)).curve(d3.curveMonotoneX));
        svg.append("path").datum(data).attr("class","main-line")
            .attr("d", d3.line().x(d=>x(d.year)).y(d=>y(d.count)).curve(d3.curveMonotoneX));

        // Data dots
        svg.selectAll(".data-dot").data(data).enter().append("circle")
            .attr("class","data-dot")
            .attr("cx", d=>x(d.year)).attr("cy", d=>y(d.count)).attr("r", 4)
            .on("mousemove", (event,d) => {
                const ann = annotations.find(a=>a.year===d.year);
                showTip(event,`<div class="tooltip-year">${d.year}</div>
                    <div class="tooltip-count">${d.count.toLocaleString()} eviction notices</div>
                    ${ann?`<div class="tooltip-context">${ann.context}</div>`:""}`);
            })
            .on("mouseleave", hideTip);

        // Axes
        svg.append("g").attr("class","axis").attr("transform",`translate(0,${H})`)
            .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(15))
            .selectAll("text").style("font-size","0.82rem");

        svg.append("g").attr("class","axis")
            .call(d3.axisLeft(y).ticks(6).tickFormat(d=>d.toLocaleString()))
            .selectAll("text").style("font-size","0.82rem");

        // Y-axis label
        svg.append("text")
            .attr("transform","rotate(-90)").attr("y",-54).attr("x",-(H/2))
            .attr("text-anchor","middle").attr("fill","#555")
            .style("font-size","0.84rem").style("font-family","Georgia, serif")
            .text("Eviction Notices Filed");

        // Annotations
        annotations.forEach(ann => {
            const pt = data.find(d=>d.year===ann.year); if(!pt) return;
            const cx=x(pt.year), cy=y(pt.count);
            const labelX=cx+ann.lx, labelY=cy+ann.ly;
            const tipY = ann.ly<0 ? labelY+30 : labelY;

            svg.append("line").attr("class","ann-line")
                .attr("x1",cx).attr("y1",cy).attr("x2",labelX).attr("y2",tipY);

            svg.append("circle").attr("class","ann-dot").attr("cx",cx).attr("cy",cy).attr("r",6)
                .on("mousemove", event => showTip(event,
                    `<div class="tooltip-year">${ann.title.replace(":","")}</div>
                    <div class="tooltip-count">${pt.count.toLocaleString()} eviction notices</div>
                    <div class="tooltip-context">${ann.context}</div>`))
                .on("mouseleave", hideTip);

            svg.append("text").attr("class","ann-title")
                .attr("x",labelX).attr("y",labelY)
                .attr("text-anchor",ann.anchor)
                .style("font-size","0.80rem")
                .text(ann.title);

            svg.append("text").attr("class","ann-body")
                .attr("x",labelX).attr("y",labelY+16)
                .attr("text-anchor",ann.anchor)
                .style("font-size","0.78rem")
                .text(ann.body);
        });
    });
})();