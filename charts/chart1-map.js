// CHART 1 — CHOROPLETH MAP
(function() {
    // Spectral 5-class from ColorBrewer: low evictions = green, high = orange/red
    const colorRange = ["#abdda4", "#ffffbf", "#fdae61", "#f46d43", "#d53e4f"];
    let selectedYear = null, yearlyMap = new Map(), allTotals = new Map(), geoFeatures = null;

    const W_MAP = 600, H_MAP = 500;

    const svg = d3.select("#map-svg-container")
        .append("svg").attr("width", W_MAP).attr("height", H_MAP);
    svg.append("rect").attr("width", W_MAP).attr("height", H_MAP).attr("fill", "#a8cfe0");

    const mapG = svg.append("g");
    const projection = d3.geoMercator();
    const pathGen    = d3.geoPath().projection(projection);

    const zoom = d3.zoom().scaleExtent([1,14]).on("zoom", event => {
        mapG.attr("transform", event.transform);
        mapG.selectAll(".neighborhood").attr("stroke-width", 0.8 / event.transform.k);
    });
    svg.call(zoom);
    svg.on("dblclick.zoom", null);

    function getCountsForYear(yr) { return yr === null ? allTotals : (yearlyMap.get(yr) || new Map()); }

    function makeColorScale(counts) {
        const maxVal = d3.max(Array.from(counts.values()).filter(v=>v>0)) || 1;
        return d3.scaleSequential().domain([0, maxVal]).interpolator(d3.interpolateRgbBasis(colorRange));
    }

    function drawLegend(counts) {
        const ls = d3.select("#legend-svg");
        ls.selectAll("*").remove();
        const defs = ls.append("defs");
        const grad = defs.append("linearGradient").attr("id","map-legend-grad");
        colorRange.forEach((c,i) =>
            grad.append("stop").attr("offset",`${i/(colorRange.length-1)*100}%`).attr("stop-color",c));
        ls.append("rect").attr("width",140).attr("height",16).attr("rx",2).style("fill","url(#map-legend-grad)");
        const maxVal = d3.max(Array.from(counts.values()).filter(v=>v>0)) || 0;
        d3.select("#legend-min").text("0");
        d3.select("#legend-max").text(maxVal.toLocaleString());
    }

    function drawTop5(counts) {
        const top5 = Array.from(counts.entries()).filter(([k])=>k).sort((a,b)=>b[1]-a[1]).slice(0,5);
        const maxC = top5[0]?.[1] || 1;
        const el = document.getElementById("top5-bars"); el.innerHTML = "";
        top5.forEach(([name,count],i) => {
            const pct = ((count/maxC)*100).toFixed(0);
            const short = name.length>19 ? name.slice(0,17)+"…" : name;
            const row = document.createElement("div"); row.className = "top5-row";
            row.innerHTML = `<div class="top5-label">${i+1}. ${short}</div>
                <div class="top5-bar-track"><div class="top5-bar-fill" style="width:${pct}%"></div></div>
                <div class="top5-count">${count.toLocaleString()}</div>`;
            el.appendChild(row);
        });
    }

    function updateMap() {
        if (!geoFeatures) return;
        const counts = getCountsForYear(selectedYear);
        drawLegend(counts); drawTop5(counts);
        const scale = makeColorScale(counts);
        const total = d3.sum(Array.from(counts.values()));
        mapG.selectAll(".neighborhood").data(geoFeatures, d=>d.properties.nhood)
            .join(enter => enter.append("path").attr("class","neighborhood").attr("d",pathGen)
                .on("mousemove", (event,d) => {
                    const name=d.properties.nhood, count=counts.get(name)||0;
                    const pct = total>0?((count/total)*100).toFixed(1):"0.0";
                    showTip(event,`<div class="tooltip-name">${name}</div>
                        <div class="tooltip-count">${count.toLocaleString()} eviction notices</div>
                        <div class="tooltip-pct">${pct}% of citywide total</div>`);
                })
                .on("mouseleave", hideTip),
                update => update)
            .transition().duration(300)
            .attr("fill", d => scale(counts.get(d.properties.nhood)||0));
    }

    Promise.all([d3.csv("data/evictions_clean.csv"), d3.json("data/Analysis_Neighborhoods.geojson")])
        .then(([raw, geo]) => {
            const EXCLUDE = new Set(["Treasure Island"]);
            const fitGeo = { type:"FeatureCollection", features: geo.features.filter(f=>!EXCLUDE.has(f.properties.nhood)) };
            projection.fitExtent([[80,100],[W_MAP-50,H_MAP+5]], fitGeo);
            const nested = d3.rollup(raw, v=>v.length, d=>+d.year, d=>d["Neighborhood - Analysis"]);
            nested.forEach((nh,yr) => yearlyMap.set(yr,nh));
            allTotals   = d3.rollup(raw, v=>v.length, d=>d["Neighborhood - Analysis"]);
            geoFeatures = geo.features;
            updateMap();
        });

    document.getElementById("year-slider").addEventListener("input", function() {
        const idx = +this.value;
        if (idx===0) { selectedYear=null; document.getElementById("year-display").textContent="All Years"; }
        else { selectedYear=1996+idx; document.getElementById("year-display").textContent=selectedYear; }
        updateMap();
    });
})();
