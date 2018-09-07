'use scrict';
import * as vscode from 'vscode';
import { IToolAPI, IToolRunner } from 'vscode-wpilibapi';

import * as nls from 'vscode-nls';
import nlsConfig from './nls';
const localize = nls.config(nlsConfig)();

interface IToolQuickPick extends vscode.QuickPickItem {
  runner: IToolRunner;
}

// The tools API provider. Lists tools added to it in a quick pick to select.
export class ToolAPI implements IToolAPI {
  private tools: IToolQuickPick[] = [];
  private disposables: vscode.Disposable[] = [];

  public async startTool(): Promise<boolean> {
    if (this.tools.length <= 0) {
      vscode.window.showErrorMessage(localize('message.noTool', 'No tools found. Please install some.'));
      return false;
    }

    const result = await vscode.window.showQuickPick(this.tools, { placeHolder: localize('layout.pickTool', 'Pick a tool') });

    if (result === undefined) {
      vscode.window.showInformationMessage(localize('message.toolRunCancelled', 'Tool run canceled.'));
      return false;
    }

    const ret =  result.runner.runTool();
    if (!ret) {
      await vscode.window.showInformationMessage(localize('message.toolRunFailed', 'Failed to start tool: {0}', result.runner.getDisplayName()));
    }
    return ret;
  }
  public addTool(tool: IToolRunner): void {
    const qpi: IToolQuickPick = {
      description: tool.getDescription(),
      label: tool.getDisplayName(),
      runner: tool,
    };
    this.tools.push(qpi);
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
