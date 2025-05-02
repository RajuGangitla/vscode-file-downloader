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

            // Define exclusion patterns for framework-specific directories
            const excludePattern = '{**/node_modules/**,**/node_modules,**/node_modules/*,**/.git/**,**/.git,**/.git/*,**/dist/**,**/dist,**/dist/*,**/build/**,**/build,**/build/*,**/.next/**,**/.next,**/.next/*,**/.svelte-kit/**,**/.svelte-kit,**/.svelte-kit/*,**/out/**,**/out,**/out/*,**/target/**,**/target,**/target/*,**/vendor/**,**/vendor,**/vendor/*,**/coverage/**,**/coverage,**/coverage/*,**/public/**,**/public,**/public/*,**/.venv/**,**/.venv,**/.venv/*,**/env/**,**/env,**/env/*,**/__pycache__/**,**/__pycache__,**/__pycache__/*,**/bin/**,**/bin,**/bin/*,**/obj/**,**/obj,**/obj/*,**/deps/**,**/deps,**/deps/*,**/.nuxt/**,**/.nuxt,**/.nuxt/*,**/.output/**,**/.output,**/.output/*,**/static/**,**/static,**/static/*,**/generated/**,**/generated,**/generated/*,**/migrations/**,**/migrations,**/migrations/*}';
            const files = await vscode.workspace.findFiles('**/*', excludePattern);

            // Manually filter out any remaining framework-specific directories
            const frameworkDirs = [
                'node_modules', '.git', 'dist', 'build', '.next', '.svelte-kit', 'out', 'target',
                'vendor', 'coverage', 'public', '.venv', 'env', '__pycache__', 'bin', 'obj', 'deps',
                '.nuxt', '.output', 'static', 'generated', 'migrations'
            ];
            const filteredFiles = files.filter(file => {
                const filePathLower = file.fsPath.toLowerCase();
                return !frameworkDirs.some(dir => filePathLower.includes(dir.toLowerCase()));
            });

            // Debug: Log the files found to the Output panel
            console.log('Files found:', filteredFiles.map(file => file.fsPath));

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
            for (const fileUri of selectedFiles) {
                const filePath = fileUri.fsPath;
                const relativePath = vscode.workspace.asRelativePath(filePath);
                const content = await fs.readFile(filePath, 'utf8');
                // Add file name, content, and spacing
                textContent += `=== File: ${relativePath} ===\n\n${content}\n\n\n=== End of ${relativePath} ===\n\n\n`;
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
            vscode.window.showInformationMessage(`Files downloaded to ${saveUri.fsPath}`);

            // Open the containing folder to show the file
            await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(saveUri.fsPath));

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