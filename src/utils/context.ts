import * as vscode from 'vscode';

let _context: vscode.ExtensionContext | undefined;

export function set(context: vscode.ExtensionContext) {
    _context = context;
}

export function get(): vscode.ExtensionContext {
    if (!_context) {
        throw new Error("Context not initialized! Make sure to call set_context in activate().");
    }
    return _context;
}