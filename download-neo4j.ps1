$zipUrl = "https://neo4j.com/artifact.php?name=neo4j-community-2025.01.0-windows.zip"
$zipContents = "neo4j-community-2025.01.0"
$zipPath = "$env:TEMP\downloaded.zip"
$extractPath = "$env:TEMP\extracted"
$finalDestination = "neo4j"

$webClient = New-Object System.Net.WebClient

Write-Host "Starting download..."
$webClient.DownloadFile($zipUrl, $zipPath)  # Using synchronous download

# Extract
Write-Host "Extracting..."
Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

# Move the contents of the $zipContents folder to the final destination
Write-Host "Moving..."
$filesFolder = Join-Path $extractPath "$zipContents"
if (Test-Path $filesFolder) {
    Get-ChildItem -Path $extractPath | Move-Item -Destination $finalDestination -Force
} else {
    Write-Host "Folder '$zipContents' not found in the extracted content..."
}

# Cleanup
Remove-Item -Path $zipPath -Force
Remove-Item -Path $extractPath -Recurse -Force

Write-Host "Done"
