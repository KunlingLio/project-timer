import * as vscode from 'vscode';

interface Config {
    displayPrecision: "second" | "minute" | "hour" | "auto";
    displayStyle: "verbose" | "compact";
}

export function get_config(): Config {
    const config = vscode.workspace.getConfiguration('project-timer');
    return {
        displayPrecision: config.get("displayPrecision", "minute") as Config['displayPrecision'],
        displayStyle: config.get("displayStyle", "verbose") as Config['displayStyle']
    };
}

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