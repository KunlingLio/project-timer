import * as vscode from 'vscode';

interface Config {
    statusBar: {
        displayPrecision: "second" | "minute" | "hour" | "auto";
        displayStyle: "verbose" | "compact";
    };
    timer: {
        pauseWhenUnfocused: boolean;
        idleThreshold: number;
    };
}

export function get_config(): Config {
    const config = vscode.workspace.getConfiguration('project-timer');
    return {
        statusBar: {
            displayPrecision: config.get("statusBar.displayPrecision", "minute") as Config['statusBar']['displayPrecision'],
            displayStyle: config.get("statusBar.displayStyle", "verbose") as Config['statusBar']['displayStyle']
        },
        timer: {
            pauseWhenUnfocused: config.get("timer.pauseWhenUnfocused", false) as Config['timer']['pauseWhenUnfocused'],
            idleThreshold: config.get("timer.idleThreshold", 300) as Config['timer']['idleThreshold']
        }
    };
}