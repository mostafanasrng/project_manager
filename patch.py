import os

file_path = "pages/TechnicalOffice.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace cbsNodes.find and estimates.find with cleanCode equivalents
old_cbs = "cbsNodes.find(n => n.code === item.code && String(n.projectId) === String(selectedProjectId))"
new_cbs = "cbsNodes.find(n => cleanCode(n.code) === cleanCode(item.code) && String(n.projectId) === String(selectedProjectId))"

old_est = "estimates.find(e => e.code === item.code && String(e.projectId) === String(selectedProjectId))"
new_est = "estimates.find(e => cleanCode(e.code) === cleanCode(item.code) && String(e.projectId) === String(selectedProjectId))"

replaced_cbs_count = content.count(old_cbs)
content = content.replace(old_cbs, new_cbs)

replaced_est_count = content.count(old_est)
content = content.replace(old_est, new_est)

print(f"Replaced {replaced_cbs_count} occurrences of cbsNodes.find")
print(f"Replaced {replaced_est_count} occurrences of estimates.find")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
