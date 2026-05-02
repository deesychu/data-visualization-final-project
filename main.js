// main.js — shared utilities for all charts

// Single scroll observer
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
    });
}, { threshold: 0.1 });

document.querySelectorAll(".fade-in").forEach(el => {
    observer.observe(el);
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add("visible");
    }
});

// Shared tooltip
const tooltip = d3.select("#shared-tooltip");
function showTip(event, html) {
    tooltip.style("opacity", 1)
        .style("left", (event.pageX + 14) + "px")
        .style("top",  (event.pageY - 30) + "px")
        .html(html);
}
function hideTip() { tooltip.style("opacity", 0); }