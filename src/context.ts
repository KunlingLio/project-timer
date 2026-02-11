import * as vscode from 'vscode';

let _context: vscode.ExtensionContext | undefined;
export function set_context(context: vscode.ExtensionContext) {
    _context = context;
}

export function get_context(): vscode.ExtensionContext {
    if (!_context) {
        throw new Error("Context not initialized! Make sure to call set_context in activate().");
    }
    return _context;
}