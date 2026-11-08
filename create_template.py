import pandas as pd

filepath = r"D:\備課ai\41_英語學扶資源\更新紀錄_欄位範本.xlsx"
columns = ["發布日期", "更新類型", "關聯年級", "關聯領域/單元", "更新內容說明", "前台顯示狀態", "備註(暫不公開)"]
data = [
    ["2026-03-20", "📢系統公告", "系統全域", "無", "正式建立「更新紀錄」功能，未來教師可在此查看最新上架的英語學扶資源。", "顯示", "這是一個範例"],
    ["2026-03-22", "🆕新增資源", "三年級", "英語", "新增 5 筆關於字母拼讀(Phonics)的互動式 PPT 遊戲資源。", "顯示", "測試新增"],
    ["2026-03-25", "🔄內容修正", "五年級", "重點整理", "修正了「現在進行式」講義的失效連結，現已可正常下載。", "顯示", "失效連結"]
]

df = pd.DataFrame(data, columns=columns)
df.to_excel(filepath, index=False, sheet_name="更新紀錄")
print(f"Created template at {filepath}")
