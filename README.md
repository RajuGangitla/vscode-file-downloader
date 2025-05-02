# File Downloader VS Code Extension

A VS Code extension that allows you to select multiple files from your workspace, concatenate their contents, and download them as a single text file.

## Features

- Trigger the extension via a Status Bar button ("Download Files").
- Filter files by extension (e.g., `.txt`, `.js`).
- Select multiple files using a dialog with checkboxes.
- Specify a custom name for the output file.
- Choose the save location for the downloaded file.
- Clear formatting in the output file with file names and spacing.

## Installation

1. Open VS Code.
2. Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X` on macOS).
3. Search for `File Downloader` by `raju-file-downloader`.
4. Click **Install**.

## How to Use

1. Open a workspace in VS Code.
2. Click the "Download Files" button in the Status Bar (bottom right).
3. Enter file extensions to filter (e.g., `txt,js` or `*` for all files).
4. Select the files you want to download from the dialog (use the spacebar to select/deselect).
5. Enter a custom name for the output file (or press Enter for the default).
6. Choose a save location for the output file.
7. The files will be concatenated into a single text file, and the file explorer will open to show the result.

## Requirements

- VS Code version 1.85.0 or higher.

## Known Issues

- None at this time. Please report any issues in the Issues section.

## Release Notes

### 0.1.1

- Added GitHub repository link to the Marketplace listing.

### 0.1.0

- Initial release of File Downloader.

---

**Enjoy!**