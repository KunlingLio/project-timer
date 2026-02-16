import * as vscode from 'vscode';
import * as timer from './core/timer';
import * as statusBar from './ui/statusbar';
import * as storage from './core/storage';
import { openStatistics } from './ui/statistics';
import { set as setContext } from './utils/context';
import { addCleanup } from './utils';

function deleteAllStorage() {
    // pop up windows for second confirm
    vscode.window.showWarningMessage(
        "Are you sure you want to delete all storage? This action cannot be undone.",
        { modal: true },
        "Yes"
    ).then(answer => {
        if (answer === "Yes") {
            storage.deleteAll();
        }
    });
}

function exportData() {
    vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ''),
        filters: {
            'JSON files': ['json']
        },
        saveLabel: 'Export Data'
    }).then(fileUri => {
        if (fileUri) {
            const data = storage.exportAll();
            const content = Buffer.from(JSON.stringify(data, null, 2));
            vscode.workspace.fs.writeFile(fileUri, content).then(() => {
                vscode.window.showInformationMessage('Data exported successfully.');
            }, error => {
                vscode.window.showErrorMessage(`Failed to export data. Error: ${error}`);
            });
        }
    });
}

function importData() {
    vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        defaultUri: vscode.Uri.file(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ''),
        filters: {
            'JSON files': ['json']
        },
        openLabel: 'Import Data'
    }).then(fileUri => {
        if (fileUri && fileUri[0]) {
            vscode.workspace.fs.readFile(fileUri[0]).then(content => {
                try {
                    const data = JSON.parse(content.toString());
                    storage.importAll(data);
                    vscode.window.showInformationMessage('Data imported successfully.');
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to import JSON file. Error: ${error}`);
                }
            });
        }
    });
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Start activate Project Timer extension...');
    setContext(context);

    const disposables: vscode.Disposable[] = [];
    // 1. register commands
    disposables.push(vscode.commands.registerCommand('project-timer.deleteAllStorage', () => deleteAllStorage()));
    disposables.push(vscode.commands.registerCommand('project-timer.openStatistics', () => openStatistics()));
    disposables.push(vscode.commands.registerCommand('project-timer.exportData', () => exportData()));
    disposables.push(vscode.commands.registerCommand('project-timer.importData', () => importData()));
    // 2. init core modules
    disposables.push(timer.init());
    disposables.push(storage.init());
    // 3. add ui components
    disposables.push(statusBar.activate());

    addCleanup(disposables);
    console.log('Project Timer extension activated.');
}

export function deactivate() {
    storage.flush();
}
