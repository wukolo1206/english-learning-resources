import pandas as pd
import math
import os

# Data Loading
file_path = r'd:\test ch\英語學扶資源\新北英語學扶資源.xlsx'
df = pd.read_excel(file_path, sheet_name='English')

# Fill NaNs with empty strings for easier processing
df = df.fillna('')

# Convert URL floats to string and remove '.0' if any
df['連結 (URL)'] = df['連結 (URL)'].apply(lambda x: str(x) if x != '' else '')
df['資源名稱'] = df['資源名稱'].apply(lambda x: str(x) if x != '' else '')
df['資源形式'] = df['資源形式'].apply(lambda x: str(x) if x != '' else '')
df['項目類型'] = df['項目類型'].apply(lambda x: str(x) if x != '' else '')
df['單元/子分類'] = df['單元/子分類'].apply(lambda x: str(x) if x != '' else '')

# --- Grouping Data ---
# Structure: {grade: {domain: {type: {unit: [{name, form, url}, ...]}}}}
tree = {}

for index, row in df.iterrows():
    grade = row['年級']
    domain = row['領域/類別']
    item_type = row['項目類型']
    unit = row['單元/子分類']
    
    # Validation
    if grade == '': continue
    
    name = row['資源名稱']
    form = row['資源形式']
    url = row['連結 (URL)']
    
    if grade not in tree: tree[grade] = {}
    if domain not in tree[grade]: tree[grade][domain] = {}
    if item_type not in tree[grade][domain]: tree[grade][domain][item_type] = {}
    if unit not in tree[grade][domain][item_type]: tree[grade][domain][item_type][unit] = []
        
    tree[grade][domain][item_type][unit].append({
        'name': name,
        'form': form,
        'url': url
    })

# --- CSS Variables ---
CSS_BASE = """
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700;900&display=swap');

    :root {
        --primary: #6366f1;
        --primary-dark: #4f46e5;
        --primary-light: #e0e7ff;
        --text-main: #1e293b;
        --text-muted: #64748b;
        --bg-main: #f1f5f9;
        --bg-card: #ffffff;
        --border-color: #e2e8f0;
        --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.08);
        --shadow-md: 0 4px 12px -2px rgb(0 0 0 / 0.12);
        --radius: 0.5rem;
        --font-size-base: 16px;
    }
    body {
        font-family: 'Noto Sans TC', -apple-system, BlinkMacSystemFont, sans-serif;
        background-color: var(--bg-main);
        color: var(--text-main);
        font-size: var(--font-size-base);
        line-height: 1.6;
        margin: 0;
        padding: 0;
        -webkit-font-smoothing: antialiased;
    }
    a {
        color: var(--primary-dark);
        text-decoration: none;
        transition: color 0.15s ease;
        font-weight: 500;
    }
    a:hover { color: var(--primary); text-decoration: underline; }
    .badge {
        display: inline-flex;
        align-items: center;
        padding: 0.2rem 0.6rem;
        border-radius: 9999px;
        background: var(--primary-light);
        color: var(--primary-dark);
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.02em;
        margin-right: 0.6rem;
        white-space: nowrap;
    }
    .resource-card {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: var(--radius);
        padding: 0.85rem 1.1rem;
        margin-top: 0.5rem;
        margin-bottom: 0.5rem;
        box-shadow: var(--shadow-sm);
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
        border-left: 3px solid transparent;
    }
    .resource-card:hover {
        border-left-color: var(--primary);
        box-shadow: var(--shadow-md);
        transform: translateX(3px);
        background: #fdfdff;
    }
    .resource-title {
        font-weight: 600;
        font-size: 1rem;
        margin-bottom: 0.4rem;
        display: flex;
        align-items: center;
        color: var(--text-main);
    }
    header {
        background: white;
        border-bottom: 1px solid var(--border-color);
        padding: 1rem 2rem;
        position: sticky;
        top: 0;
        z-index: 10;
        box-shadow: var(--shadow-sm);
    }
    h1 { margin: 0; font-size: 1.4rem; color: var(--primary); }
"""

# --- VERSION 1: Collapsible Tree ---
html_tree = f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>新北英語學扶數位資源庫 (樹狀目錄版)</title>
    <style>
        {CSS_BASE}
        .container {{ max-width: 800px; margin: 2rem auto; padding: 0 1rem; }}
        details {{
            background: white; margin-bottom: 0.5rem; border: 1px solid var(--border-color);
            border-radius: 0.5rem; overflow: hidden;
        }}
        summary {{
            padding: 1rem; cursor: pointer; font-weight: 600; background: #fff;
            list-style: none; display: flex; align-items: center;
        }}
        summary::-webkit-details-marker {{ display: none; }}
        summary::before {{
            content: '▶'; display: inline-block; margin-right: 0.5rem; font-size: 0.8em;
            transition: transform 0.2s; color: var(--text-muted);
        }}
        details[open] > summary::before {{ transform: rotate(90deg); }}
        details[open] > summary {{ border-bottom: 1px solid var(--border-color); background: var(--primary-light); }}
        .details-content {{ padding: 1rem; }}
        
        /* Nesting styles */
        .level-2 details {{ border-left: 3px solid #60A5FA; margin-left:1rem; margin-top:0.5rem; }}
        .level-3 details {{ border-left: 3px solid #34D399; margin-left:1rem; margin-top:0.5rem; }}
        .level-4 details {{ border-left: 3px solid #F87171; margin-left:1rem; margin-top:0.5rem; }}
        
    </style>
</head>
<body>
    <header>
        <h1>新北英語學扶數位資源庫</h1>
        <p style="color: var(--text-muted); font-size: 0.875rem; margin-top:0.5rem;">
            編輯團隊：新北市更寮國小吳國榮、王筱瑛、屏東縣竹田國小劉蘋老師<br>
            點擊箭頭展開分類，逐層瀏覽學習資源。
        </p>
    </header>
    <div class="container">
"""

for grade, domains in tree.items():
    html_tree += f"\n<details><summary>🎓 {grade}</summary>\n<div class='details-content level-2'>\n"
    for domain, types in domains.items():
        html_tree += f"  <details><summary>📚 {domain}</summary>\n  <div class='details-content level-3'>\n"
        for item_type, units in types.items():
            html_tree += f"    <details><summary>📂 {item_type}</summary>\n    <div class='details-content level-4'>\n"
            for unit, items in units.items():
                html_tree += f"      <details><summary>📖 {unit}</summary>\n      <div class='details-content'>\n"
                for item in items:
                    name = item['name']
                    form = item['form']
                    url = item['url']
                    
                    form_badge = f"<span class='badge'>{form}</span>" if form else ""
                    
                    html_tree += f"        <div class='resource-card'>\n"
                    html_tree += f"          <div class='resource-title'>{form_badge}<span>{name}</span></div>\n"
                    if url and str(url).lower() != 'nan' and url != '':
                        html_tree += f"          <div style='margin-top:0.5rem;'><a href='{url}' target='_blank'>🔗 點此開啟資源</a></div>\n"
                    html_tree += f"        </div>\n"
                    
                html_tree += "      </div></details>\n"
            html_tree += "    </div></details>\n"
        html_tree += "  </div></details>\n"
    html_tree += "</div></details>\n"
    
html_tree += """
    </div>
</body>
</html>
"""

with open(r'd:\test ch\英語學扶資源\index_tree.html', 'w', encoding='utf-8') as f:
    f.write(html_tree)


# --- VERSION 2: Scrollable Sidebar ---
html_scroll = f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>新北英語學扶數位資源庫 (側邊目錄版)</title>
    <style>
        {CSS_BASE}
        /* ===================== LAYOUT ===================== */
        .layout {{ 
            display: flex; 
            height: calc(100vh - 70px);
            overflow: hidden; 
            margin-top: 70px; 
            background-color: var(--bg-main);
        }}
        
        /* ===================== TOP HEADER ===================== */
        .top-header {{
            position: fixed;
            top: 0; left: 0;
            width: 100%;
            background: rgba(255, 255, 255, 0.92);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-bottom: 1px solid var(--border-color);
            padding: 0 2rem;
            z-index: 50;
            box-shadow: var(--shadow-sm);
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-sizing: border-box;
            height: 70px;
        }}
        .top-header h1 {{ 
            font-size: 1.5rem; 
            margin: 0; 
            font-weight: 900;
            background: linear-gradient(120deg, var(--primary), #a855f7);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -0.02em;
        }}
        .top-header .editors {{
            color: var(--text-muted); 
            font-size: 0.85rem;
            font-weight: 500;
            text-align: right;
            line-height: 1.5;
            background: var(--bg-main);
            padding: 0.3rem 0.85rem;
            border-radius: 9999px;
            border: 1px solid var(--border-color);
        }}

        /* ===================== SIDEBAR ===================== */
        .sidebar {{
            width: 260px; 
            background: white; 
            border-right: 1px solid var(--border-color);
            display: flex; 
            flex-direction: column; 
            height: 100%;
            flex-shrink: 0;
        }}
        .sidebar-nav {{ 
            overflow-y: auto; 
            padding: 1rem 0; 
            flex-grow: 1; 
        }}
        .nav-grade {{
            padding: 0.6rem 1.25rem 0.2rem; 
            font-weight: 800; 
            color: var(--text-main);
            text-transform: uppercase; 
            font-size: 0.8rem; 
            letter-spacing: 0.06em; 
            margin-top: 0.75rem;
        }}
        .nav-link {{
            display: flex; 
            align-items: center;
            gap: 0.4rem;
            padding: 0.55rem 1.25rem 0.55rem 2.25rem; 
            color: var(--text-muted);
            font-size: 0.95rem; 
            font-weight: 500;
            transition: all 0.15s ease;
            border-left: 3px solid transparent;
            line-height: 1.4;
        }}
        .nav-link:hover {{ 
            background: var(--bg-main); 
            color: var(--primary-dark); 
            text-decoration: none; 
            border-left-color: var(--primary);
        }}
        
        /* ===================== MAIN CONTENT ===================== */
        .main-content {{
            flex-grow: 1; 
            overflow-y: auto; 
            padding: 1.75rem 2.5rem; 
            background: var(--bg-main); 
            scroll-behavior: smooth;
        }}
        .content-container {{ 
            max-width: 860px; 
            margin: 0 auto; 
        }}
        
        /* ---- Grade ---- */
        .grade-section {{ margin-bottom: 2.5rem; }}
        .grade-title {{ 
            font-size: 1.6rem; 
            font-weight: 900;
            padding-bottom: 0.6rem; 
            margin-bottom: 1rem; 
            color: var(--text-main);
            border-bottom: 2px solid var(--border-color);
            position: relative;
            margin-top: 0;
        }}
        .grade-title::after {{
            content: '';
            position: absolute;
            bottom: -2px; left: 0;
            width: 50px; height: 2px;
            background: var(--primary);
        }}
        
        /* ---- Domain (1st level collapsible) ---- */
        .domain-section {{ 
            margin-bottom: 0.6rem; 
            background: white; 
            border-radius: var(--radius); 
            border: 1px solid var(--border-color); 
            box-shadow: var(--shadow-sm);
            overflow: hidden;
        }}
        .domain-title {{ 
            font-size: 1.1rem; 
            font-weight: 700;
            margin: 0;
            padding: 0.85rem 1.25rem;
            display: flex; 
            align-items: center; 
            gap: 0.6rem;
            color: var(--text-main);
            cursor: pointer;
            transition: background 0.15s;
            list-style: none;
            user-select: none;
        }}
        .domain-title:hover {{ background: var(--bg-main); }}
        .domain-section[open] .domain-title {{ 
            border-bottom: 1px solid var(--border-color);
            background: var(--bg-main);
        }}
        .domain-body {{ padding: 1rem 1.25rem; }}
        
        /* ---- Type (2nd level collapsible) ---- */
        .type-section {{ 
            margin-bottom: 0.5rem;
            border-left: 3px solid var(--primary-light);
            border-radius: 0 var(--radius) var(--radius) 0;
            background: #fafbff;
            overflow: hidden;
        }}
        .type-title {{ 
            font-size: 0.95rem;
            font-weight: 700;
            color: var(--text-muted);
            padding: 0.6rem 1rem;
            margin: 0;
            cursor: pointer;
            list-style: none;
            display: flex;
            align-items: center;
            gap: 0.4rem;
            transition: background 0.15s, color 0.15s;
            user-select: none;
        }}
        .type-title:hover {{ background: var(--primary-light); color: var(--primary-dark); }}
        .type-section[open] .type-title {{ 
            background: var(--primary-light); 
            color: var(--primary-dark);
            border-bottom: 1px solid #c7d2fe;
        }}
        .type-body {{ padding: 0.6rem 0.75rem; }}
        
        /* ---- Unit (3rd level collapsible) ---- */
        .unit-section {{ margin-bottom: 0.4rem; }}
        .unit-title {{ 
            font-size: 0.9rem; 
            color: var(--text-main); 
            font-weight: 600; 
            margin-bottom: 0; 
            background: transparent;
            padding: 0.45rem 0.75rem;
            border-radius: var(--radius);
            display: flex;
            align-items: center;
            gap: 0.4rem;
            cursor: pointer;
            list-style: none;
            transition: background 0.15s;
            user-select: none;
        }}
        .unit-title:hover {{ background: #e0e7ff50; }}
        .unit-body {{ padding-left: 1.25rem; padding-top: 0.3rem; }}
        
        /* ---- Resource Card ---- */
        .resource-card {{
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-left: 3px solid transparent;
            border-radius: var(--radius);
            padding: 0.7rem 1rem;
            margin-top: 0.35rem;
            margin-bottom: 0.35rem;
            box-shadow: var(--shadow-sm);
            transition: all 0.15s ease;
        }}
        .resource-card:hover {{
            border-left-color: var(--primary);
            box-shadow: var(--shadow-md);
            transform: translateX(2px);
        }}
        .resource-title {{
            font-weight: 600;
            font-size: 0.95rem;
            margin-bottom: 0.3rem;
            display: flex;
            align-items: center;
            color: var(--text-main);
        }}
        
        /* ---- Hint Bar ---- */
        .sticky-search-hint {{
            background: var(--primary-light);
            color: var(--primary-dark); 
            padding: 0.65rem 1rem;
            border-radius: var(--radius); 
            margin-bottom: 1.25rem; 
            font-size: 0.875rem;
            display: flex; 
            align-items: center; 
            gap: 0.6rem;
        }}

    </style>
</head>
<body>
    <header class="top-header">
        <div>
            <h1>新北英語學扶數位資源庫</h1>
        </div>
        <div class="editors">
            編輯團隊：新北市更寮國小吳國榮、王筱瑛、屏東縣竹田國小劉蘋老師
        </div>
    </header>
    <div class="layout">
        <aside class="sidebar">
            <nav class="sidebar-nav">
"""

# Generate Sidebar Links
for grade, domains in tree.items():
    safe_grade_id = str(grade).replace(" ", "_").replace("/", "_")
    html_scroll += f"                <div class='nav-grade'>🎓 {grade}</div>\n"
    for domain in domains.keys():
        safe_domain_id = str(domain).replace(" ", "_").replace("/", "_")
        html_scroll += f"                <a href='#{safe_grade_id}-{safe_domain_id}' class='nav-link'>📚 {domain}</a>\n"

html_scroll += """
            </nav>
        </aside>
        
        <main class="main-content">
            <div class="content-container">
                <div class="sticky-search-hint">
                    💡 <strong>小提示：</strong>您可以使用鍵盤 <code>Ctrl + F</code> (Windows) 或 <code>Cmd + F</code> (Mac) 直接在整頁搜尋關鍵字（例如：「字首」）。
                </div>
"""

# Generate Content Sections
for grade, domains in tree.items():
    safe_grade_id = str(grade).replace(" ", "_").replace("/", "_")
    html_scroll += f"\n                <section class='grade-section'>\n"
    html_scroll += f"                    <h2 class='grade-title'>{grade}</h2>\n"
    
    for domain, types in domains.items():
        safe_domain_id = str(domain).replace(" ", "_").replace("/", "_")
        html_scroll += f"                    <div id='{safe_grade_id}-{safe_domain_id}' style='scroll-margin-top: 80px;'>\n"
        html_scroll += f"                    <details class='domain-section'>\n"
        html_scroll += f"                        <summary class='domain-title'>📚 {domain}</summary>\n"
        html_scroll += f"                        <div class='domain-body'>\n"
        
        for item_type, units in types.items():
            html_scroll += f"                        <details class='type-section'>\n"
            html_scroll += f"                            <summary class='type-title'>📂 {item_type}</summary>\n"
            html_scroll += f"                            <div class='type-body'>\n"
            
            for unit, items in units.items():
                html_scroll += f"                            <details class='unit-section'>\n"
                html_scroll += f"                                <summary class='unit-title'>📖 {unit}</summary>\n"
                html_scroll += f"                                <div class='unit-body'>\n"
                
                for item in items:
                    name = item['name']
                    form = item['form']
                    url = item['url']
                    
                    form_badge = f"<span class='badge'>{form}</span>" if form else ""
                    
                    html_scroll += f"                                <div class='resource-card'>\n"
                    html_scroll += f"                                    <div class='resource-title'>{form_badge}<span>{name}</span></div>\n"
                    if url and str(url).lower() != 'nan' and url != '':
                        html_scroll += f"                                    <div><a href='{url}' target='_blank'>🔗 點此開啟資源</a></div>\n"
                    html_scroll += f"                                </div>\n"
                    
                html_scroll += "                                </div>\n" # end unit-body
                html_scroll += "                            </details>\n" # end unit
            html_scroll += "                            </div>\n" # end type-body
            html_scroll += "                        </details>\n" # end type
        html_scroll += "                        </div>\n" # end domain-body
        html_scroll += "                    </details>\n" # end domain
        html_scroll += "                    </div>\n" # end anchor div
    html_scroll += "                </section>\n" # end grade

html_scroll += """
            </div>
        </main>
    </div>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            // Setup smooth scrolling for sidebar links and handle accordion state
            const navLinks = document.querySelectorAll('.nav-link');
            const allDomains = document.querySelectorAll('.domain-section');
            
            navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    // Close all domain sections
                    allDomains.forEach(domain => domain.removeAttribute('open'));
                    
                    // The href is the ID we want to open
                    const targetId = link.getAttribute('href').substring(1);
                    const targetSection = document.getElementById(targetId);
                    
                    if (targetSection) {
                        const targetDetails = targetSection.querySelector('details.domain-section');
                        if (targetDetails) {
                            targetDetails.setAttribute('open', '');
                        }
                    }
                });
            });

            // Handle nested details logic (exclusive accordions)
            // When opening a type-section, close all other type-sections within the SAME domain
            const allTypes = document.querySelectorAll('.type-section');
            allTypes.forEach(typeDetails => {
                typeDetails.addEventListener('toggle', (e) => {
                    if (typeDetails.open) {
                        // Find the parent domain
                        const parentDomain = typeDetails.closest('.domain-section');
                        if (parentDomain) {
                            // Find all specific type sections in this domain
                            const siblings = Array.from(parentDomain.querySelectorAll('.type-section'));
                            siblings.forEach(sibling => {
                                if (sibling !== typeDetails && sibling.open) {
                                    sibling.removeAttribute('open');
                                }
                            });
                        }
                    }
                });
            });
            
            // Handle unit details logic (exclusive accordions)
            const allUnits = document.querySelectorAll('.unit-section');
            allUnits.forEach(unitDetails => {
                unitDetails.addEventListener('toggle', (e) => {
                    if (unitDetails.open) {
                        const parentType = unitDetails.closest('.type-section');
                        if (parentType) {
                            const siblings = Array.from(parentType.querySelectorAll('.unit-section'));
                            siblings.forEach(sibling => {
                                if (sibling !== unitDetails && sibling.open) {
                                    sibling.removeAttribute('open');
                                }
                            });
                        }
                    }
                });
            });
            
            // Similar logic for top-level domains: opening one closes others
            allDomains.forEach(domainDetails => {
                domainDetails.addEventListener('toggle', (e) => {
                    if (domainDetails.open) {
                        allDomains.forEach(otherDomain => {
                            if (otherDomain !== domainDetails && otherDomain.open) {
                                otherDomain.removeAttribute('open');
                            }
                        });
                    }
                });
            });
            
            // Finally, initially close everything so it's clean, except maybe let the user decide
            // allDomains.forEach(d => d.removeAttribute('open'));
        });
    </script>
</body>
</html>
"""

with open(r'd:\test ch\英語學扶資源\index_scroll.html', 'w', encoding='utf-8') as f:
    f.write(html_scroll)

print("Successfully generated index_tree.html and index_scroll.html")
