#!/usr/bin/env python3
"""
Lurk — Report Generator
Requires: weasyprint==62.3 jinja2==3.1.4

Usage:
  python generate_report.py --data '{...json...}' --output /tmp/report.pdf
  python generate_report.py --data '{...json...}' --format html
  python generate_report.py --file /tmp/data.json --output /tmp/report.pdf

Self-hosted only — WeasyPrint requires libpango + libcairo.
On Vercel, use the /reports/[slug] page with window.print().
"""

import sys
import json
import argparse
from pathlib import Path

try:
    from jinja2 import Template
    from weasyprint import HTML, CSS
except ImportError as e:
    print(f"Missing dependency: {e}", file=sys.stderr)
    print("Run: pip install weasyprint==62.3 jinja2==3.1.4", file=sys.stderr)
    sys.exit(1)

SEVERITY_COLORS = {
    "critical": "#FF4444",
    "high":     "#FF8C00",
    "medium":   "#FFD700",
    "low":      "#4A90D9",
    "info":     "#888888",
}

CATEGORY_LABELS = {
    "rls_misconfiguration": "Database Access Control",
    "broken_auth":          "Authentication & Sessions",
    "supply_chain":         "Supply Chain",
    "prompt_injection":     "Prompt Injection",
    "other":                "Other",
}

SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"]

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  :root {
    --navy:    #0B1120;
    --green:   #00FF94;
    --surface: #111827;
    --border:  #1F2937;
    --text:    #F9FAFB;
    --muted:   #9CA3AF;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    background: var(--navy);
    color: var(--text);
    font-size: 13px;
    line-height: 1.6;
  }

  /* COVER */
  .cover {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 60px;
    page-break-after: always;
  }
  .cover-brand { display: flex; align-items: center; gap: 14px; }
  .cover-brand img { height: 44px; }
  .brand-name { font-size: 20px; font-weight: 600; }
  .cover-body {
    border-left: 3px solid var(--green);
    padding-left: 28px;
  }
  .cover-eyebrow {
    font-size: 11px; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--green); margin-bottom: 10px;
  }
  .cover-title { font-size: 40px; font-weight: 300; line-height: 1.15; margin-bottom: 8px; }
  .cover-client { font-size: 18px; color: var(--muted); }
  .cover-footer {
    display: flex; justify-content: space-between; align-items: flex-end;
    border-top: 1px solid var(--border); padding-top: 20px;
  }
  .cover-meta { color: var(--muted); font-size: 12px; line-height: 1.9; }
  .score-block { text-align: right; }
  .score-number {
    font-family: 'Courier New', monospace;
    font-size: 52px; font-weight: 700;
    color: {{ score_color }}; line-height: 1;
  }
  .score-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; }

  /* CONTENT */
  .page { padding: 48px 60px; }
  .section-title {
    font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
    color: var(--green); margin-bottom: 20px;
    padding-bottom: 8px; border-bottom: 1px solid var(--border);
  }

  /* SUMMARY GRID */
  .summary-grid {
    display: flex; gap: 14px; margin-bottom: 36px;
  }
  .stat-card {
    flex: 1; background: var(--surface);
    border: 1px solid var(--border); border-radius: 8px; padding: 18px;
  }
  .stat-value {
    font-family: 'Courier New', monospace;
    font-size: 30px; font-weight: 700; line-height: 1; margin-bottom: 4px;
  }
  .stat-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.07em; }

  /* SEVERITY BARS */
  .severity-table { width: 100%; margin-bottom: 36px; border-collapse: collapse; }
  .severity-table td { padding: 5px 8px; }
  .sev-label { width: 80px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.07em; }
  .sev-bar-cell { width: 100%; }
  .sev-bar-track {
    width: 100%; height: 6px; background: var(--border);
    border-radius: 3px; overflow: hidden;
  }
  .sev-bar-fill { height: 6px; border-radius: 3px; }
  .sev-count { width: 28px; text-align: right; font-family: 'Courier New', monospace; font-size: 12px; color: var(--muted); }

  /* FINDINGS */
  .finding {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 8px; margin-bottom: 18px; overflow: hidden;
    page-break-inside: avoid;
  }
  .finding-header {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 18px; border-bottom: 1px solid var(--border);
  }
  .sev-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .finding-title { font-weight: 500; font-size: 14px; flex: 1; }
  .sev-badge {
    font-size: 10px; font-weight: 700; letter-spacing: 0.09em;
    text-transform: uppercase; padding: 3px 7px; border-radius: 4px;
    background: #1F2937;
  }
  .finding-body { padding: 14px 18px; }
  .finding-meta { display: flex; gap: 20px; margin-bottom: 10px; }
  .meta-item { font-size: 11px; }
  .meta-label { color: var(--muted); }
  .meta-val { font-family: 'Courier New', monospace; color: var(--text); font-size: 11px; }
  .finding-desc { color: var(--muted); margin-bottom: 12px; line-height: 1.7; }
  .code-block {
    background: #0D1117; border: 1px solid var(--border); border-radius: 6px;
    padding: 12px; font-family: 'Courier New', monospace; font-size: 11px;
    color: #E6EDF3; white-space: pre-wrap; word-break: break-all; margin-bottom: 12px;
  }
  .fix-box {
    background: rgba(0,255,148,0.05); border: 1px solid rgba(0,255,148,0.2);
    border-radius: 6px; padding: 12px 14px;
  }
  .fix-label {
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;
    color: var(--green); margin-bottom: 6px; font-weight: 700;
  }
  .fix-text { color: #D1FAE5; font-size: 12px; line-height: 1.7; }
  .cve { font-size: 11px; color: var(--muted); margin-top: 8px; }

  /* FOOTER */
  .report-footer {
    margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--border);
    font-size: 11px; color: var(--muted); text-align: center;
  }

  @page {
    size: A4;
    margin: 0;
    @bottom-center {
      content: "Page " counter(page) " of " counter(pages);
      font-size: 10px; color: #6B7280;
      font-family: 'Helvetica Neue', sans-serif;
    }
  }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div class="cover-brand">
    {% if agency_logo_url %}
    <img src="{{ agency_logo_url }}" alt="{{ agency_name }}">
    {% else %}
    <span style="font-size:28px">🛡️</span>
    {% endif %}
    <span class="brand-name">{{ agency_name if agency_name else 'Lurk' }}</span>
  </div>

  <div class="cover-body">
    <div class="cover-eyebrow">Security Audit Report</div>
    <div class="cover-title">Code Vulnerability<br>Assessment</div>
    {% if client_name %}
    <div class="cover-client">Prepared for {{ client_name }}</div>
    {% endif %}
  </div>

  <div class="cover-footer">
    <div class="cover-meta">
      <div><strong>Repository</strong><br>{{ repo_name }}</div>
      {% if pr_title %}
      <div style="margin-top:10px"><strong>Pull Request</strong><br>{{ pr_title }}</div>
      {% endif %}
      <div style="margin-top:10px"><strong>Date</strong><br>{{ report_date }}</div>
    </div>
    <div class="score-block">
      <div class="score-number">{{ severity_score }}</div>
      <div class="score-label">Severity Score</div>
      <div style="font-size:13px; color:{{ score_color }}; margin-top:4px; font-weight:600;">{{ status_text }}</div>
    </div>
  </div>
</div>

<!-- EXECUTIVE SUMMARY -->
<div class="page">
  <div class="section-title">Executive Summary</div>

  <div class="summary-grid">
    <div class="stat-card">
      <div class="stat-value" style="color:{{ score_color }}">{{ severity_score }}</div>
      <div class="stat-label">Severity Score</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{{ total_findings }}</div>
      <div class="stat-label">Total Findings</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color:#FF4444">{{ critical_count }}</div>
      <div class="stat-label">Critical</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color:#FF8C00">{{ high_count }}</div>
      <div class="stat-label">High</div>
    </div>
  </div>

  <div class="section-title" style="margin-top:0">Severity Breakdown</div>
  <table class="severity-table">
    {% for sev, count in severity_counts.items() %}
    {% if count > 0 or loop.index <= 3 %}
    <tr>
      <td class="sev-label" style="color:{{ severity_colors[sev] }}">{{ sev }}</td>
      <td class="sev-bar-cell">
        <div class="sev-bar-track">
          <div class="sev-bar-fill" style="
            width: {{ (count / (total_findings if total_findings > 0 else 1) * 100)|int }}%;
            background: {{ severity_colors[sev] }};
          "></div>
        </div>
      </td>
      <td class="sev-count">{{ count }}</td>
    </tr>
    {% endif %}
    {% endfor %}
  </table>
</div>

<!-- FINDINGS -->
{% if findings %}
<div class="page" style="page-break-before: always;">
  <div class="section-title">Detailed Findings ({{ total_findings }})</div>

  {% for f in findings %}
  <div class="finding">
    <div class="finding-header">
      <div class="sev-dot" style="background:{{ severity_colors[f.severity] }}"></div>
      <div class="finding-title">{{ f.title }}</div>
      <div class="sev-badge" style="color:{{ severity_colors[f.severity] }}">{{ f.severity }}</div>
    </div>
    <div class="finding-body">
      <div class="finding-meta">
        {% if f.file_path %}
        <div class="meta-item">
          <span class="meta-label">File </span>
          <span class="meta-val">{{ f.file_path }}{% if f.line_start %}:{{ f.line_start }}{% endif %}</span>
        </div>
        {% endif %}
        <div class="meta-item">
          <span class="meta-label">Category </span>
          <span class="meta-val">{{ category_labels.get(f.category, f.category) }}</span>
        </div>
      </div>
      {% if f.description %}
      <div class="finding-desc">{{ f.description }}</div>
      {% endif %}
      {% if f.code_snippet %}
      <div class="code-block">{{ f.code_snippet }}</div>
      {% endif %}
      {% if f.fix_suggestion %}
      <div class="fix-box">
        <div class="fix-label">Recommended Fix</div>
        <div class="fix-text">{{ f.fix_suggestion }}</div>
      </div>
      {% endif %}
      {% if f.cve_reference %}
      <div class="cve">CVE Reference: {{ f.cve_reference }}</div>
      {% endif %}
    </div>
  </div>
  {% endfor %}
</div>
{% endif %}

<!-- FOOTER -->
<div class="page">
  <div class="report-footer">
    {% if agency_name and agency_name != 'Lurk' %}
    {{ agency_name }}{% if client_name %} · Prepared for {{ client_name }}{% endif %} ·
    {% endif %}
    Generated by Lurk · {{ report_date }} ·
    This report was produced by automated security scanning and should be reviewed by a security professional.
  </div>
</div>

</body>
</html>"""


def build_context(data: dict) -> dict:
    findings = data.get("findings", [])
    severity_order = ["critical", "high", "medium", "low", "info"]

    # Sort findings by severity
    findings_sorted = sorted(
        findings,
        key=lambda f: severity_order.index(f.get("severity", "info"))
    )

    severity_counts = {s: sum(1 for f in findings if f.get("severity") == s) for s in severity_order}
    score = data.get("severity_score", 0)

    if score >= 75:
        score_color, status_text = "#FF4444", "CRITICAL"
    elif score >= 50:
        score_color, status_text = "#FF8C00", "HIGH RISK"
    elif score >= 25:
        score_color, status_text = "#FFD700", "MEDIUM RISK"
    elif score > 0:
        score_color, status_text = "#4A90D9", "LOW RISK"
    else:
        score_color, status_text = "#00FF94", "PASSED"

    from datetime import datetime
    return {
        "findings": findings_sorted,
        "severity_counts": severity_counts,
        "severity_colors": SEVERITY_COLORS,
        "category_labels": CATEGORY_LABELS,
        "total_findings": len(findings),
        "critical_count": severity_counts["critical"],
        "high_count": severity_counts["high"],
        "severity_score": score,
        "score_color": score_color,
        "status_text": status_text,
        "repo_name": data.get("repo_name", "Unknown Repository"),
        "pr_title": data.get("pr_title"),
        "client_name": data.get("client_name"),
        "agency_name": data.get("agency_name", "Lurk"),
        "agency_logo_url": data.get("agency_logo_url"),
        "report_date": datetime.now().strftime("%B %d, %Y"),
    }


def render_html(data: dict) -> str:
    ctx = build_context(data)
    tmpl = Template(HTML_TEMPLATE)
    return tmpl.render(**ctx)


def render_pdf(data: dict, output_path: str) -> None:
    html_content = render_html(data)
    HTML(string=html_content).write_pdf(
        output_path,
        stylesheets=[CSS(string="@page { size: A4; margin: 0; }")]
    )


def main():
    parser = argparse.ArgumentParser(description="Lurk report generator")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--data", help="JSON data as string")
    group.add_argument("--file", help="Path to JSON data file")
    parser.add_argument("--output", help="Output PDF path (omit for HTML to stdout)")
    parser.add_argument("--format", choices=["pdf", "html"], default="pdf")
    args = parser.parse_args()

    if args.data:
        data = json.loads(args.data)
    else:
        with open(args.file) as f:
            data = json.load(f)

    if args.output or args.format == "pdf":
        output = args.output or "/tmp/sentinel_report.pdf"
        render_pdf(data, output)
        print(output)  # Print path for the caller to read
    else:
        print(render_html(data))


if __name__ == "__main__":
    main()
