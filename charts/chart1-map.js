// CHART 1 — CHOROPLETH MAP
// Responsive: reads container width on load and on window resize
(function () {
    const colorRange = [
        "rgb(215,25,28)",
        "rgb(253,174,97)",
        "rgb(255,255,191)",
        "rgb(166,217,106)",
        "rgb(26,150,65)"
    ];

    let selectedYear = 1997, yearlyMap = new Map(), geoFeatures = null;
    let svgEl = null, mapG = null, projection = null, pathGen = null, zoom = null;

    // ── Dimensions ─────────────────────────────────────────────────────────
    // On mobile the map stacks above the controls panel, so we can use full
    // container width. On wider screens we cap at 600px to leave room for the
    // controls panel beside it.
    function getDims() {
        const container = document.getElementById("map-svg-container");
        const W = Math.min(container.clientWidth || 600, 600);
        // Keep SF's ~1:1 aspect ratio
        const H = Math.round(W * 0.88);
        return { W, H };
    }

    // ── Build or rebuild the SVG ────────────────────────────────────────────
    function buildSvg() {
        const container = document.getElementById("map-svg-container");
        const { W, H } = getDims();

        // Clear any existing SVG
        container.innerHTML = "";

        const svg = d3.select(container)
            .append("svg")
            .attr("width", W)
            .attr("height", H);

        svg.append("rect").attr("width", W).attr("height", H).attr("fill", "#a8cfe0");

        mapG = svg.append("g");
        projection = d3.geoMercator();
        pathGen    = d3.geoPath().projection(projection);

        zoom = d3.zoom().scaleExtent([0.5, 14]).on("zoom", event => {
            mapG.attr("transform", event.transform);
            mapG.selectAll(".neighborhood").attr("stroke-width", 0.8 / event.transform.k);
        });
        svg.call(zoom);
        svg.on("dblclick.zoom", null);

        svgEl = svg;

        // Re-fit projection to new dimensions if data is loaded
        if (geoFeatures) {
            const EXCLUDE = new Set(["Treasure Island"]);
            const fitGeo = {
                type: "FeatureCollection",
                features: geoFeatures.filter(f => !EXCLUDE.has(f.properties.nhood))
            };
            projection.fitExtent([[W * 0.12, H * 0.18], [W * 0.9, H * 1.02]], fitGeo);
            updateMap();
        }
    }

    // ── Color scale ─────────────────────────────────────────────────────────
    function makeColorScale(counts) {
        const maxVal = d3.max(Array.from(counts.values()).filter(v => v > 0)) || 1;
        return d3.scaleSequential()
            .domain([0, maxVal])
            .interpolator(d3.interpolateRgbBasis([...colorRange].reverse()));
    }

    // ── Legend ──────────────────────────────────────────────────────────────
    function drawLegend(counts) {
        const ls = d3.select("#legend-svg");
        ls.selectAll("*").remove();
        const defs = ls.append("defs");
        const grad = defs.append("linearGradient").attr("id", "map-legend-grad");
        [...colorRange].reverse().forEach((c, i) =>
            grad.append("stop")
                .attr("offset", `${i / (colorRange.length - 1) * 100}%`)
                .attr("stop-color", c));
        ls.append("rect").attr("width", 140).attr("height", 16).attr("rx", 2)
            .style("fill", "url(#map-legend-grad)");
        const maxVal = d3.max(Array.from(counts.values()).filter(v => v > 0)) || 0;
        d3.select("#legend-min").text("0");
        d3.select("#legend-max").text(maxVal.toLocaleString());
    }

    // ── Top 5 ───────────────────────────────────────────────────────────────
    function drawTop5(counts) {
        const top5 = Array.from(counts.entries()).filter(([k]) => k)
            .sort((a, b) => b[1] - a[1]).slice(0, 5);
        const maxC = top5[0]?.[1] || 1;
        const el = document.getElementById("top5-bars");
        el.innerHTML = "";
        top5.forEach(([name, count], i) => {
            const pct   = ((count / maxC) * 100).toFixed(0);
            const short = name.length > 19 ? name.slice(0, 17) + "…" : name;
            const row   = document.createElement("div");
            row.className = "top5-row";
            row.innerHTML = `
                <div class="top5-label">${i + 1}. ${short}</div>
                <div class="top5-bar-track"><div class="top5-bar-fill" style="width:${pct}%"></div></div>
                <div class="top5-count">${count.toLocaleString()}</div>`;
            el.appendChild(row);
        });
    }

    // ── Render neighborhoods ─────────────────────────────────────────────────
    function updateMap() {
        if (!geoFeatures || !mapG) return;
        const counts = yearlyMap.get(selectedYear) || new Map();
        drawLegend(counts);
        drawTop5(counts);
        const scale = makeColorScale(counts);
        const total = d3.sum(Array.from(counts.values()));

        mapG.selectAll(".neighborhood").data(geoFeatures, d => d.properties.nhood)
            .join(
                enter => enter.append("path")
                    .attr("class", "neighborhood")
                    .attr("d", pathGen)
                    .on("mousemove", (event, d) => {
                        const name  = d.properties.nhood;
                        const count = counts.get(name) || 0;
                        const pct   = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
                        showTip(event, `
                            <div class="tooltip-name">${name}</div>
                            <div class="tooltip-count">${count.toLocaleString()} eviction notices</div>
                            <div class="tooltip-pct">${pct}% of citywide total</div>`);
                    })
                    .on("mouseleave", hideTip),
                update => update
            )
            .transition().duration(300)
            .attr("fill", d => scale(counts.get(d.properties.nhood) || 0));
    }

    // ── Load data ────────────────────────────────────────────────────────────
    Promise.all([
        d3.csv("data/evictions_clean.csv"),
        d3.json("data/Analysis_Neighborhoods.geojson")
    ]).then(([raw, geo]) => {
        const nested = d3.rollup(raw, v => v.length, d => +d.year, d => d["Neighborhood - Analysis"]);
        nested.forEach((nh, yr) => yearlyMap.set(yr, nh));
        geoFeatures = geo.features;

        // Initial draw — projection fitted inside buildSvg
        buildSvg();
    });

    // ── Slider ───────────────────────────────────────────────────────────────
    document.getElementById("year-slider").addEventListener("input", function () {
        selectedYear = 1997 + (+this.value);
        document.getElementById("year-display").textContent = selectedYear;
        updateMap();
    });

    // ── Responsive resize ────────────────────────────────────────────────────
    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(buildSvg, 250);
    });

})();