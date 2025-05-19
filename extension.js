

const vscode = require('vscode');
const sanitize = require('sanitize-filename');
const fs = require('fs').promises;
const path = require('path');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    // Create a Status Bar button
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(download) Download Files";
    statusBarItem.tooltip = "Download selected files as a single text file";
    statusBarItem.command = 'fileDownloader.downloadFiles';
    statusBarItem.show();

    let disposable = vscode.commands.registerCommand('fileDownloader.downloadFiles', async () => {
        try {
            // Find all files in the workspace
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            // Define exclusion patterns for framework-specific directories (simplified)
            const excludePattern = '{**/node_modules/**,**/.git/**}'; // Only exclude node_modules and .git for now
            
            // Create output channel for debugging
            const outputChannel = vscode.window.createOutputChannel('File Downloader Debug');
            outputChannel.appendLine('Starting file search...');
            outputChannel.show();
            
            // Show progress notification
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Scanning workspace files",
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0 });
                
                try {
                    const files = await vscode.workspace.findFiles('**/*', excludePattern);
                    outputChannel.appendLine(`Found ${files.length} files before filtering`);
                    
                    // Log first 20 files found for debugging
                    if (files.length > 0) {
                        outputChannel.appendLine('First 20 files found:');
                        files.slice(0, 20).forEach(file => {
                            outputChannel.appendLine(`- ${file.fsPath}`);
                        });
                    }
                    
                    progress.report({ increment: 50, message: "Filtering files..." });
                    
                    // Manually filter out any remaining framework-specific directories (simplified)
                    const frameworkDirs = [
                        'node_modules', '.git'
                    ];
                    const filteredFiles = files;  // Don't filter further for now
                    
                    outputChannel.appendLine(`After filtering: ${filteredFiles.length} files`);
                    
                    progress.report({ increment: 100, message: "Done" });
                    
                    if (filteredFiles.length === 0) {
                        vscode.window.showErrorMessage('No relevant files found in the workspace');
                        return;
                    }

                    // Create Quick Pick items for each file
                    const quickPickItems = filteredFiles.map(file => ({
                        label: vscode.workspace.asRelativePath(file.fsPath),
                        picked: false, // Default: not selected
                        fileUri: file // Store the file URI for later use
                    }));

                    // Show Quick Pick dialog with multi-select
                    const quickPick = await vscode.window.showQuickPick(quickPickItems, {
                        placeHolder: 'Select files to download (use space to select/deselect)',
                        canPickMany: true,
                        ignoreFocusOut: true,
                        title: 'Select Files to Download'
                    });

                    // If no files were selected or the user canceled
                    if (!quickPick || quickPick.length === 0) {
                        vscode.window.showInformationMessage('No files selected for download');
                        return;
                    }

                    // Get the selected files
                    const selectedFiles = quickPick.map(item => item.fileUri);

                    // Create text content by concatenating selected files with clear formatting
                    let textContent = '';
                    let errorFiles = [];
                    
                    for (const fileUri of selectedFiles) {
                        const filePath = fileUri.fsPath;
                        const relativePath = vscode.workspace.asRelativePath(filePath);
                        
                        try {
                            // Check if file is binary
                            const stats = await fs.stat(filePath);
                            if (stats.size > 1024 * 1024 * 5) { // Skip files larger than 5MB
                                errorFiles.push({ path: relativePath, reason: 'File too large (>5MB)' });
                                textContent += `=== File: ${relativePath} ===\n\n[Content not included: File too large]\n\n\n=== End of ${relativePath} ===\n\n\n`;
                                continue;
                            }
                            
                            const content = await fs.readFile(filePath, 'utf8');
                            // Add file name, content, and spacing
                            textContent += `=== File: ${relativePath} ===\n\n${content}\n\n\n=== End of ${relativePath} ===\n\n\n`;
                        } catch (error) {
                            console.error(`Error reading ${filePath}:`, error);
                            errorFiles.push({ path: relativePath, reason: error.message });
                            textContent += `=== File: ${relativePath} ===\n\n[Error reading file: ${error.message}]\n\n\n=== End of ${relativePath} ===\n\n\n`;
                        }
                    }

                    // Prompt the user to select a save location
                    const workspaceName = vscode.workspace.name || 'workspace';
                    const sanitizedName = sanitize(workspaceName);
                    const defaultUri = vscode.Uri.file(path.join(workspaceFolders[0].uri.fsPath, `${sanitizedName}-files.txt`));
                    const saveUri = await vscode.window.showSaveDialog({
                        defaultUri: defaultUri,
                        filters: {
                            'Text Files': ['txt'],
                            'All Files': ['*']
                        },
                        title: 'Choose where to save the downloaded files'
                    });

                    // If the user canceled the save dialog
                    if (!saveUri) {
                        vscode.window.showInformationMessage('Download canceled');
                        return;
                    }

                    // Save the concatenated content to the selected location
                    await fs.writeFile(saveUri.fsPath, textContent);
                    
                    // Show success message
                    if (errorFiles.length > 0) {
                        vscode.window.showWarningMessage(
                            `Files downloaded with ${errorFiles.length} errors. See Output panel for details.`,
                            'Show Details'
                        ).then(selection => {
                            if (selection === 'Show Details') {
                                const outputChannel = vscode.window.createOutputChannel('File Downloader');
                                outputChannel.appendLine('The following files could not be properly processed:');
                                errorFiles.forEach(file => {
                                    outputChannel.appendLine(`- ${file.path}: ${file.reason}`);
                                });
                                outputChannel.show();
                            }
                        });
                    } else {
                        vscode.window.showInformationMessage(`Files successfully downloaded to ${saveUri.fsPath}`);
                    }

                    // Open the containing folder to show the file
                    await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(saveUri.fsPath));
                } catch (error) {
                    vscode.window.showErrorMessage(`Error processing files: ${error.message}`);
                }
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error downloading files: ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
    context.subscriptions.push(statusBarItem);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};