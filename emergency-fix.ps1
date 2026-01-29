$file = "supabase/functions/whatsapp-inbound/index.ts"
$lines = Get-Content $file
# Remove lines 157-178 (indices 156-177 in 0-indexed array)
# Since we want to remove a range, we can select lines before and after
$newLines = $lines[0..155] + $lines[178..($lines.Count - 1)]
$newLines | Set-Content $file -Encoding UTF8
Write-Host "Lines 157-178 removed successfully."
