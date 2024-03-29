# uuGle

**uuGle** Chrome extension for fast and user-friendly search in Unicorn uuBookKit books.

![demo](https://i.imgur.com/jnZJtxs.gif)

## Usage 

1. Install uuGle from [uuGle Chrome Web Store page](https://chrome.google.com/webstore/detail/uugle/makckafajckddaiinilmeogejgdmacmi)
2. **uuGle** automatically indexes every Unicorn bookkit book you open. Just open any single page of any book, and a 
   list of all the pages in that book will be indexed and for search.
   - **uuGle is not fulltext search** - it indexes only **page title and book name**, not a whole page content.
   - It does not matter which page of book you open (home page is quite enough), all pages of that book are indexed.
3. Click extension icon or use **keyboard shortcut** <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>U</kbd> on Windows,
   <kbd>Ctrl</kbd>+<kbd>U</kbd> on Linux, <kbd>Command</kbd>+<kbd>U</kbd> on 
   Mac.
   - Type a keyword to start search in indexed content.
   - You don't need to type whole word, search words are automatically expanded. E.g. type "trans" and search 
     results containing word "transaction" will be suggested. This can be used to quickly find uuCommand designs: e.g. 
     type "trans list" to search for transaction/list CMD.  
   - Search results are sorted by relevance in descending order
   - When too many results across many books are found, try adding the tile of the product, application or component
     to the search query.   
4. For each page found, there is a link to that page. By default, the link opens in currently selected tab. You can 
   <kbd>Ctrl</kbd>+<kbd>Click</kbd> to open it in new browser tab. 
   - Color of page link corresponds to book type (i.e. user guide, application model, business model etc.)
   - Breadcrumb navigation is available to better differentiate pages with a similar or identical name. Each link to 
     page ancestor in menu hierarchy can be clicked to open in currently selected tab or in new tab 
     (<kbd>Ctrl</kbd>+<kbd>Click</kbd>).
   - There is a **_w_** icon next to page title to indicate "_work in progress_" status of that page.
5. You can use <kbd>&#8593;</kbd> and <kbd>&#8595;</kbd> keys to navigate in search results. To open page link you can 
   use <kbd>Enter</kbd> to open it in the currently selected tab, or <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to open it in new 
   browser tab.
6. Every indexed book is being re-indexed after some time once you open it again to keep your uuGle page index up-to-date.

## How it works

- Book pages index is permanently stored in the browser's [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) database.
- For searching **uuGle** uses [Elasticlunr.js](http://elasticlunr.com/).

## Constraints
1. Only english language fulltext search is supported.

## Road map
1. GUI to control book indexing - delete index, reindex single book etc.
1. Automatic pre-indexing of books from some online catalogue, so you don't need to open every book first individually to index it.  

# Development guide

<span style="color:red">Use the following lines for extension **development only**, you don't need to read it for regular extension usage.</span>  

# Chrome Extension Boilerplate with React 16.13 and Webpack 4

[![npm](https://img.shields.io/npm/v/chrome-extension-boilerplate-react)](https://www.npmjs.com/package/chrome-extension-boilerplate-react)
[![npm-download](https://img.shields.io/npm/dw/chrome-extension-boilerplate-react)](https://www.npmjs.com/package/chrome-extension-boilerplate-react)
[![npm](https://img.shields.io/npm/dm/chrome-extension-boilerplate-react)](https://www.npmjs.com/package/chrome-extension-boilerplate-react)

[![dependencies Status](https://david-dm.org/lxieyang/chrome-extension-boilerplate-react/status.svg)](https://david-dm.org/lxieyang/chrome-extension-boilerplate-react)
[![devDependencies Status](https://david-dm.org/lxieyang/chrome-extension-boilerplate-react/dev-status.svg)](https://david-dm.org/lxieyang/chrome-extension-boilerplate-react?type=dev)

## Features

This is a basic Chrome Extensions boilerplate to help you write modular and modern Javascript code, load CSS easily and [automatic reload the browser on code changes](https://webpack.github.io/docs/webpack-dev-server.html#automatic-refresh).

This boilerplate is updated with:

- [React 16.13](https://reactjs.org)
- [Webpack 4](https://webpack.js.org/)
- [React Hot Loader](https://github.com/gaearon/react-hot-loader)
- [eslint-config-react-app](https://www.npmjs.com/package/eslint-config-react-app)
- [Prettier](https://prettier.io/)

This boilerplate is heavily inspired by and adapted from [https://github.com/samuelsimoes/chrome-extension-webpack-boilerplate](https://github.com/samuelsimoes/chrome-extension-webpack-boilerplate), with additional support for React 16.13 features and Webpack 4.

Please open up an issue to nudge me to keep the npm packages up-to-date. FYI, it takes time to make different packages with different versions work together nicely.

## Installing and Running

### Procedures:

1. Check if your [Node.js](https://nodejs.org/) version is >= **10.13**.
2. Clone this repository.
3. Change the package's `name`, `description`, and `repository` fields in `package.json`.
4. Change the name of your extension on `src/manifest.json`.
5. Run `npm install` to install the dependencies.
6. Run `npm start`
7. Load your extension on Chrome following:
   1. Access `chrome://extensions/`
   2. Check `Developer mode`
   3. Click on `Load unpacked extension`
   4. Select the `build` folder.
8. Happy hacking.

## Structure

All your extension's code must be placed in the `src` folder.

The boilerplate is already prepared to have a popup, an options page, a background page, and a new tab page (which replaces the new tab page of your browser). But feel free to customize these.

## Webpack auto-reload and HRM

To make your workflow much more efficient this boilerplate uses the [webpack server](https://webpack.github.io/docs/webpack-dev-server.html) to development (started with `npm start`) with auto reload feature that reloads the browser automatically every time that you save some file in your editor.

You can run the dev mode on other port if you want. Just specify the env var `port` like this:

```
$ PORT=6002 npm run start
```

## Content Scripts

Although this boilerplate uses the webpack dev server, it's also prepared to write all your bundles files on the disk at every code change, so you can point, on your extension manifest, to your bundles that you want to use as [content scripts](https://developer.chrome.com/extensions/content_scripts), but you need to exclude these entry points from hot reloading [(why?)](https://github.com/samuelsimoes/chrome-extension-webpack-boilerplate/issues/4#issuecomment-261788690). To do so you need to expose which entry points are content scripts on the `webpack.config.js` using the `chromeExtensionBoilerplate -> notHotReload` config. Look the example below.

Let's say that you want use the `myContentScript` entry point as content script, so on your `webpack.config.js` you will configure the entry point and exclude it from hot reloading, like this:

```js
{
  …
  entry: {
    myContentScript: "./src/js/myContentScript.js"
  },
  chromeExtensionBoilerplate: {
    notHotReload: ["myContentScript"]
  }
  …
}
```

and on your `src/manifest.json`:

```json
{
  "content_scripts": [
    {
      "matches": ["https://www.google.com/*"],
      "js": ["myContentScript.bundle.js"]
    }
  ]
}
```

## Intelligent Code Completion

Thanks to [@hudidit](https://github.com/lxieyang/chrome-extension-boilerplate-react/issues/4)'s kind suggestions, this boilerplate supports chrome-specific intelligent code completion using [@types/chrome](https://www.npmjs.com/package/@types/chrome). For example:

![intellisense](https://lxieyang.github.io/static/chrome-extension-boilerplate-dev-intellisense-ed9e7c485d3eaf66417e5da4748e2c97.png)

## Packing

After the development of your extension run the command

```
$ NODE_ENV=production npm run build
```

Now, the content of `build` folder will be the extension ready to be submitted to the Chrome Web Store. Just take a look at the [official guide](https://developer.chrome.com/webstore/publish) to more infos about publishing.

## Secrets

If you are developing an extension that talks with some API you probably are using different keys for testing and production. Is a good practice you not commit your secret keys and expose to anyone that have access to the repository.

To this task this boilerplate import the file `./secrets.<THE-NODE_ENV>.js` on your modules through the module named as `secrets`, so you can do things like this:

_./secrets.development.js_

```js
export default { key: '123' };
```

_./src/popup.js_

```js
import secrets from 'secrets';
ApiCall({ key: secrets.key });
```

:point_right: The files with name `secrets.*.js` already are ignored on the repository.

## Resources:

- [Webpack documentation](https://webpack.js.org/concepts/)
- [Chrome Extension documentation](https://developer.chrome.com/extensions/getstarted)

---

Michael Xieyang Liu | [Website](https://lxieyang.github.io)
