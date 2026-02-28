# Ralph Wiggum Loop - Fresh context per iteration (PowerShell 5)
# Usage: .\loop.ps1 [plan|build] [max_iterations]
#
# Examples:
#   .\loop.ps1 plan      # Planning mode, unlimited
#   .\loop.ps1 plan 5    # Planning mode, max 5 iterations
#   .\loop.ps1 build     # Build mode, unlimited
#   .\loop.ps1 build 20  # Build mode, max 20 iterations

param(
    [string]$Mode = "build",
    [int]$MaxIterations = 0
)

$ErrorActionPreference = "Stop"

if ($Mode -eq "plan") {
    $PromptFile = "PROMPT_plan.md"
} elseif ($Mode -eq "build") {
    $PromptFile = "PROMPT_build.md"
} else {
    Write-Host "Usage: .\loop.ps1 [plan|build] [max_iterations]"
    exit 1
}

if (-not (Test-Path $PromptFile)) {
    Write-Host "Error: $PromptFile not found"
    exit 1
}

Write-Host "=========================================="
Write-Host "Ralph Wiggum Loop"
Write-Host "Mode: $Mode"
Write-Host "Prompt: $PromptFile"
if ($MaxIterations -gt 0) {
    Write-Host "Max iterations: $MaxIterations"
}
Write-Host "=========================================="

$Iteration = 0

while ($true) {
    if ($MaxIterations -gt 0 -and $Iteration -ge $MaxIterations) {
        Write-Host ""
        Write-Host "Reached max iterations ($MaxIterations). Stopping."
        break
    }

    $Iteration++
    Write-Host ""
    Write-Host "=========================================="
    Write-Host "Iteration $Iteration (Mode: $Mode)"
    Write-Host (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    Write-Host "=========================================="

    # Fresh Claude session each iteration - context resets!
    Get-Content $PromptFile -Raw | claude -p `
        --dangerously-skip-permissions `
        --model sonnet

    # Auto-commit progress after each iteration
    git add -A
    $staged = git diff --staged --quiet 2>&1
    if ($LASTEXITCODE -ne 0) {
        git commit -m "Ralph iteration $Iteration ($Mode mode)`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
        Write-Host "Changes committed."
    } else {
        Write-Host "No changes to commit."
    }

    Write-Host "Iteration $Iteration complete."
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "Ralph loop finished after $Iteration iterations."
