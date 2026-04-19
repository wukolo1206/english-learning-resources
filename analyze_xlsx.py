import pandas as pd

file_path = r'd:\test ch\英語學扶資源\新北英語學扶資源.xlsx'
xls = pd.ExcelFile(file_path)

with open(r'd:\test ch\英語學扶資源\xlsx_analysis.txt', 'w', encoding='utf-8') as f:
    f.write(f"# Excel File Analysis: 新北英語學扶資源.xlsx\n\n")
    f.write(f"## Sheets: {', '.join(xls.sheet_names)}\n\n")
    
    for s in xls.sheet_names:
        f.write(f"### Sheet: {s}\n")
        df = xls.parse(s)
        f.write(f"- Rows: {df.shape[0]}, Columns: {df.shape[1]}\n")
        f.write("- Columns:\n")
        for col in df.columns:
            f.write(f"  - {col}\n")
        
        f.write("\n- Sample Data (First 3 rows):\n")
        f.write(df.head(3).to_string() + "\n\n")
