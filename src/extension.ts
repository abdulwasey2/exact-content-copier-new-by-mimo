import * as vscode from 'vscode';

import {
    CATEGORY_DIRECTORY_NAME,
    CategoryDefinition,
    listCategoryFiles
} from './categoryService';
import { runCopyPipeline } from './copyPipeline';
import { errorMessage } from './errors';

const COMMAND_ID = 'categorizedContentCopier.copyContent';

interface CategoryQuickPickItem extends vscode.QuickPickItem {
    readonly category: CategoryDefinition;
}

export function activate(context: vscode.ExtensionContext): void {
    const command = vscode.commands.registerCommand(COMMAND_ID, async () => {
        try {
            await copyContentOfFiles();
        } catch (err) {
            vscode.window.showErrorMessage(`Categorized Content Copier: ${errorMessage(err)}`);
        }
    });
    context.subscriptions.push(command);
}

export function deactivate(): void {
    // Nothing to clean up.
}

async function copyContentOfFiles(): Promise<void> {
    const projectRoot = getProjectRoot();
    if (projectRoot === undefined) {
        vscode.window.showWarningMessage(
            'Categorized Content Copier: open a project folder before running this command.'
        );
        return;
    }

    const categories = await listCategoryFiles(projectRoot);
    if (categories.length === 0) {
        vscode.window.showWarningMessage(
            `Categorized Content Copier: no category files found in '${CATEGORY_DIRECTORY_NAME}'.`
        );
        return;
    }

    const picked = await vscode.window.showQuickPick<CategoryQuickPickItem>(
        categories.map((category) => ({
            label: category.fileName,
            description: `${CATEGORY_DIRECTORY_NAME}/${category.fileName}`,
            category
        })),
        {
            placeHolder: 'Select the category whose content should be copied',
            ignoreFocusOut: true
        }
    );
    if (picked === undefined) {
        return;
    }

    const outcome = await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Copying content...',
            cancellable: false
        },
        (progress) =>
            runCopyPipeline(projectRoot, picked.category.absolutePath, (message) =>
                progress.report({ message })
            )
    );

    if (outcome.output === '') {
        vscode.window.showWarningMessage(
            'Categorized Content Copier: the selected category produced no output.'
        );
        return;
    }

    await vscode.env.clipboard.writeText(outcome.output);

    vscode.window.showInformationMessage(
        [
            'Content copied successfully!',
            '',
            `Files copied: ${outcome.stats.filesCopied}`,
            `Files skipped: ${outcome.stats.filesSkipped}`,
            `Paths not found: ${outcome.stats.pathsNotFound}`
        ].join('\n')
    );
}

function getProjectRoot(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (folders === undefined || folders.length === 0) {
        return undefined;
    }
    // Multi-root workspaces use the first folder as the project root.
    return folders[0].uri.fsPath;
}