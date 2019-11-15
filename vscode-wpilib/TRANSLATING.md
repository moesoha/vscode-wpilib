# VS Code WPILib Translation

We want to be able to support alternate languages in the VS Code WPILib extension, however us at WPILib do not have the resources to do this properly. This is something we want assistance from the community on, and they will likely do a better job as well. So we are asking for your help. This document is a guide on how to setup translations.

## Design

Before you start, here is something you should know. 

Locale strings are places in `./locale/{locale}/{domain}.yaml`, and all strings are described in YAML ([Check Wikipedia for its syntax](https://en.wikipedia.org/wiki/YAML#Syntax)). `locale` is the locale code that we will mention in the next section, and `domain` is the group of strings.

Key is for looking up the translations. This is often set to the original English string, only when the original very long or contains HTML tag, this is set to a short name.

## Adding a whole new language

This is a VSCode plugin, only supports locales that VSCode supports. For a locale list, please visit [Visual Studio Code Display Language (Locale)](https://code.visualstudio.com/docs/getstarted/locales#_available-locales).

For adding a language, you need to modify the `gulpfile.js` file in the extension root. There is a variable called languages there, which is an array of object. To add a new language, use the following object in `languages`.

```js
{
	id: 'locale-code'
}
```

Once you have that, in the `locale` folder, you need to create a copy of one of the existing languages, with your language id in lower case. You'll then need to go through and update all the strings to match your new language.

## Translate strings

This section introduces how to localize strings.

### Command palette

Translating command palette is special. All strings of it are in the domain named `package.i18n`. 

After running `npm run gulp`, `package.nls.{locale}.json` will appear. The strings that is not translated will be shown in a warning on console, you just need to translate that key in `package.i18n.yaml`.

For example, `npm run gulp` reminds me this: 
```
[21:42:36] [i18n] Generating localized messages for 'zh-CN' resulted in the following problems:
[21:42:36] [i18n]
[21:42:36] [i18n] No localized message found for key wpilibcore.importGradle2019Project.title
[21:42:36] [i18n]
```
Then I add this line in `./locale/zh-cn/package.i18n.yaml` to finish the translation.
```yaml
wpilibcore.importGradle2019Project.title: 导入使用 Gradle 2019 的项目
```

### Extension main

TypeScript codes in `src/` but not in `src/webviews` are main codes for this extension. There should be an import like this:
```typescript
import { localize as i18n } from './locale';
```

Strings are localized with `i18n(domain: string, message: string | string[], ...args: any[])`. First argument selects the translation domain, the second is the message to translate, and the following arguments will replace placeholders in message. When an array is passed with the argument `message`, the function will treat it as `[translationKey, fallbackMessage]`. Here are some examples.

```typescript
let placeholder = i18n('message', 'Failed to install {0}', file.name);
let defineI18nKey = i18n('generator', [ 'generateJavaDeployHint',
`Files placed in this directory will be deployed to the RoboRIO into the
'deploy' directory in the home folder. Use the 'Filesystem.getDeployDirectory' wpilib function
to get a proper path relative to the deploy directory.` ]);
```

### WebView pages

WebView pages takes its name as default domains (for example, `projectcreator.html` is `projectcreator`). 2 attributes is used for localization, `data-i18n-trans` and `data-i18n-key`.

If `data-i18n-trans` presents in a tag, then its `innerHTML` will be treated as key for translating. To define a key instead of `innerHTML` for this tag, use `data-i18n-key="yourI18nKey"`.

`data-i18n-trans` also accepts a value for selecting a specific domain for translation, for example `data-i18n-trans="ui"`.
