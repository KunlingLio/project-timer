import * as vscode from 'vscode';
import { get_context } from './context';

/// Get project name of current window.
/// If no folder is opened, return undefined.
export function get_project_name(): string | undefined {
    const workspace_folders = vscode.workspace.workspaceFolders;
    if (workspace_folders === undefined || workspace_folders.length === 0) {
        console.log('No workspace folders found.');
        return;
    }
    if (workspace_folders.length > 1) {
        // multi root workspace
        return vscode.workspace.name; // use workspace name as project name 
    }
    return workspace_folders?.[0].name;
}

/// Register callback function to all event related to user activities.
export function on_active(callback: () => void) {
    const context = get_context();
    const activityEvents = [
        vscode.workspace.onDidChangeTextDocument,
        vscode.workspace.onDidSaveTextDocument,
        vscode.window.onDidChangeActiveTextEditor,
        vscode.window.onDidChangeTextEditorSelection,
        vscode.window.onDidChangeTextEditorVisibleRanges,
        vscode.window.onDidChangeWindowState,
    ];

    activityEvents.forEach(event => {
        context.subscriptions.push(event(callback));
    });
}