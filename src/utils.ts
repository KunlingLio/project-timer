import * as vscode from 'vscode';

interface Config {
    displayPrecision: "second" | "minute" | "hour";
}

export function get_config(): Config {
    const config = vscode.workspace.getConfiguration('project-timer');
    return {
        displayPrecision: config.get("displayPrecision", "minute") as Config['displayPrecision']
    };
}