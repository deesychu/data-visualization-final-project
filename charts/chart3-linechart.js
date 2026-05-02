// CHART 3 — LINE CHART
(function() {
    const annotations = [
        { year:1998, title:"Dot-com boom peak:",    body:"evictions surge",            context:"The late-1990s tech boom drove rapid rent increases and owner move-in evictions as landlords sought higher-paying tenants. Filings peaked near 3,000 annually.", lx:8,   ly:-62,  anchor:"start" },
        { year:2001, title:"Dot-com bust:",          body:"rapid decline",              context:"The collapse of the dot-com bubble triggered mass layoffs across the Bay Area tech sector, cooling the rental market and sharply reducing eviction pressure.",   lx:20,  ly:-62,  anchor:"start" },
        { year:2009, title:"2008 Financial Crisis:", body:"filings hit decade low",     context:"The national mortgage crisis reduced investor activity in SF's rental market. Foreclosures and economic uncertainty suppressed eviction filings to their lowest point in over a decade.", lx:-15, ly:-80,  anchor:"start" },
        { year:2016, title:"Tech boom 2.0:",         body:"evictions near 1990s highs", context:"A second wave of tech industry growth reignited gentrification pressure, pushing Ellis Act and owner move-in evictions back toward 1990s levels.",               lx:0,   ly:-80,  anchor:"start" },
        { year:2020, title:"COVID-19 moratorium:",   body:"sharp drop in filings",      context:"California's eviction moratorium, enacted in March 2020, effectively halted most residential evictions statewide. Filings dropped by over 60% in a single year.", lx:-15, ly:-120, anchor:"start" },
        { year:2023, title:"Post-pandemic stall:",   body:"filings remain suppressed",  context:"Despite the expiration of moratorium protections, filings have not returned to pre-pandemic levels. Ongoing tenant protections and landlord uncertainty have kept numbers unusually low.", lx:-50, ly:-80,  anchor:"start" },
    ];

    const margin = { top:20, right:30, bottom:45, left:58 };
    const totalW=820, totalH=430;
    const W = totalW-margin.left-margin.right, H = totalH-margin.top-margin.bottom;

    const svg = d3.select("#chart-linechart").append("svg")
        .attr("width",totalW).attr("height",totalH)
        .append("g").attr("transform",`translate(${margin.left},${margin.top})`);

    d3.csv("data/evictions_clean.csv").then(raw => {
        const counts = d3.rollup(raw, v=>v.length, d=>+d.year);
        const data   = Array.from(counts, ([year,count])=>({year,count}))
            .filter(d=>d.year>=1997&&d.year<=2025).sort((a,b)=>a.year-b.year);

        const x = d3.scaleLinear().domain([1997,2025]).range([0,W]);
        const y = d3.scaleLinear().domain([0, d3.max(data,d=>d.count)*1.38]).range([H,0]);

        svg.append("g").attr("class","grid").call(d3.axisLeft(y).tickSize(-W).tickFormat("").ticks(6));
        svg.append("path").datum(data).attr("class","area-fill")
            .attr("d", d3.area().x(d=>x(d.year)).y0(H).y1(d=>y(d.count)).curve(d3.curveMonotoneX));
        svg.append("path").datum(data).attr("class","main-line")
            .attr("d", d3.line().x(d=>x(d.year)).y(d=>y(d.count)).curve(d3.curveMonotoneX));

        svg.selectAll(".data-dot").data(data).enter().append("circle")
            .attr("class","data-dot").attr("cx",d=>x(d.year)).attr("cy",d=>y(d.count)).attr("r",3)
            .on("mousemove", (event,d) => {
                const ann = annotations.find(a=>a.year===d.year);
                showTip(event,`<div class="tooltip-year">${d.year}</div>
                    <div class="tooltip-count">${d.count.toLocaleString()} eviction notices</div>
                    ${ann?`<div class="tooltip-context">${ann.context}</div>`:""}`);
            })
            .on("mouseleave", hideTip);

        svg.append("g").attr("class","axis").attr("transform",`translate(0,${H})`)
            .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(15));
        svg.append("g").attr("class","axis").call(d3.axisLeft(y).ticks(6).tickFormat(d=>d.toLocaleString()));
        svg.append("text").attr("transform","rotate(-90)").attr("y",-50).attr("x",-(H/2))
            .attr("text-anchor","middle").attr("fill","#555").style("font-size","0.75rem")
            .style("font-family","Georgia, serif").text("Eviction Notices Filed");

        annotations.forEach(ann => {
            const pt = data.find(d=>d.year===ann.year); if(!pt) return;
            const cx=x(pt.year), cy=y(pt.count), labelX=cx+ann.lx, labelY=cy+ann.ly, tipY=ann.ly<0?labelY+28:labelY;
            svg.append("line").attr("class","ann-line").attr("x1",cx).attr("y1",cy).attr("x2",labelX).attr("y2",tipY);
            svg.append("circle").attr("class","ann-dot").attr("cx",cx).attr("cy",cy).attr("r",5)
                .on("mousemove", event => showTip(event,`<div class="tooltip-year">${ann.title.replace(":","")}</div><div class="tooltip-count">${pt.count.toLocaleString()} eviction notices</div><div class="tooltip-context">${ann.context}</div>`))
                .on("mouseleave", hideTip);
            svg.append("text").attr("class","ann-title").attr("x",labelX).attr("y",labelY).attr("text-anchor",ann.anchor).text(ann.title);
            svg.append("text").attr("class","ann-body").attr("x",labelX).attr("y",labelY+14).attr("text-anchor",ann.anchor).text(ann.body);
        });
    });
})();
