'use strict';
import * as vscode from 'vscode';
import { ICommandAPI, ICommandCreator } from 'vscode-wpilibapi';

import * as nls from 'vscode-nls';
import nlsConfig from './nls';
const localize = nls.config(nlsConfig)();

interface ICreatorQuickPick extends vscode.QuickPickItem {
  creator: ICommandCreator;
}

interface ILanguageQuickPick extends vscode.QuickPickItem {
  creators: ICreatorQuickPick[];
}

export class CommandAPI implements ICommandAPI {
  private disposables: vscode.Disposable[] = [];
  private creators: ILanguageQuickPick[] = [];

  public addCommandProvider(provider: ICommandCreator): void {
    let lp: ILanguageQuickPick | undefined;
    for (const p of this.creators) {
      if (p.label === provider.getLanguage()) {
        lp = p;
        break;
      }
    }

    if (lp === undefined) {
      // Not found
      lp = {
        creators: [],
        description: localize('layout.languageChoice', 'Choice of language'),
        label: provider.getLanguage(),
      };
      this.creators.push(lp);
    }

    lp.creators.push({
      creator: provider,
      description: provider.getDescription(),
      label: provider.getDisplayName(),
    });
  }
  public async createCommand(workspace: vscode.WorkspaceFolder, folder: vscode.Uri): Promise<boolean> {
    if (this.creators.length === 0) {
      await vscode.window.showInformationMessage(localize('message.noCommandProvider', 'No command providers found'));
      return false;
    }

    const validLanguages: ILanguageQuickPick[] = [];
    for (const c of this.creators) {
      for (const d of c.creators) {
        if (!await d.creator.getIsCurrentlyValid(workspace)) {
          continue;
        }
        const language = d.creator.getLanguage();
        let lp: ILanguageQuickPick | undefined;
        for (const p of validLanguages) {
          if (p.label === language) {
            lp = p;
            break;
          }
        }
        if (lp === undefined) {
          // Not found
          lp = {
            creators: [],
            description: localize('layout.languageChoice', 'Choice of language'),
            label: language,
          };
          validLanguages.push(lp);
        }

        lp.creators.push(d);
      }
    }

    let langSelection: ILanguageQuickPick;

    if (validLanguages.length <= 0) {
      vscode.window.showInformationMessage(localize('message.noCommandCreator', 'No available command creators'));
      return false;
    } else if (validLanguages.length === 1) {
      langSelection = validLanguages[0];
    } else {
      const lSelect = await vscode.window.showQuickPick(validLanguages, { placeHolder: localize('layout.pickLanguage', 'Pick a language') });
      if (lSelect === undefined) {
        await vscode.window.showInformationMessage(localize('message.invalidSelection', 'Selection exited. Cancelling'));
        return false;
      }
      langSelection = lSelect;
    }

    const selection = await vscode.window.showQuickPick(langSelection.creators, { placeHolder: localize('layout.pickCommand', 'Pick a command') });
    if (selection === undefined) {
      await vscode.window.showInformationMessage(localize('message.invalidSelection', 'Invalid selection'));
      return false;
    }

    return selection.creator.generate(folder, workspace);
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
