import superagent from 'superagent';
import yaml from 'js-yaml';
import languages from 'languages';
import { countries } from 'countries-list';
import IframeApplication from './applications/iframe-application';
import ExecutableApplication from './applications/executable-application';
import BrowserHelper from './helpers/browser-helper';

/**
 * The main AppLauncher Application
 */
export default class AppLauncher {

  constructor() {
    this.config = {};
    this.lang = 'en';
    this.title = 'IMAGINARY';
    this.logo = '';
    this.apps = [];
    this.appContainer = null;
    this.runningApp = null;
    this.infoApp = null;
    this.$body = null;
    this.$inputMask = $('<div class="inputmask"></div>');
    this.$titlePane = $('<div class="titlePane"></div>');
    this.$logoText = null;
    this.$overlayContainer = null;
    this.overlayVisible = false;
    this.MAX_ITEMS_PER_ROW = 6;
  }

  init() {
    this.$body = $('body');
    this.$body.addClass('lock-position');
    const validCfgName = /^[a-zA-Z0-9_\-.]+$/;
    const cfgName = validCfgName.test(BrowserHelper.getQueryString().cfg) ?
      BrowserHelper.getQueryString().cfg : '';
    return this.readConfig(cfgName)
      .then((config) => {
        this.config = config;
        const tasks = [];
        tasks.push(AppLauncher.loadTheme(config.theme));
        tasks.push(this.loadApps(config.apps));
        if (config.infoApp) {
          tasks.push(this.loadInfoApp(config.infoApp));
        }
        return Promise.all(tasks);
      })
      .then(() => {
        const qs = BrowserHelper.getQueryString();
        if (qs.lang) {
          this.lang = qs.lang;
        }
        this.setTitle();
        this.setMenuMode();
        this.initResizeHandler();
        this.enableUserInput();
      });
  }

  initResizeHandler() {
    // Timeout for throttled resize
    let resizeTimeout;

    window.addEventListener('resize', () => {
      // ignore resize events as long as an actualResizeHandler execution is in the queue
      if (!resizeTimeout) {
        resizeTimeout = setTimeout(() => {
          resizeTimeout = null;
          this.onResize();
          // The actualResizeHandler will execute at a rate of 15fps
        }, 66);
      }
    });
  }

  readConfig(configName) {
    return new Promise((accept, reject) => {
      const prefix = configName ? `${configName}.` : '';
      superagent
        .get(`cfg/${prefix}config.yml?cache=${Date.now()}`)
        .then((response) => {
          const config = yaml.safeLoad(response.text);
          if (config.lang) {
            this.lang = config.lang;
          }
          if (config.infoApp) {
            this.infoApp = config.infoApp;
          }
          accept(config);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  static loadAppConfig(appRoot) {
    return superagent.get(`${appRoot}/app.json?cache=${Date.now()}`)
      .set('Accept', 'json')
      .then((response) => {
        const appConfig = response.body;
        appConfig.root = appRoot;
        if (appConfig.type === undefined) {
          appConfig.type = 'iframe';
        }
        return appConfig;
      });
  }

  static loadTheme(themeName) {
    if (themeName !== undefined && themeName !== 'default') {
      const $themeCSSFile = $('<link>');
      $themeCSSFile.attr('rel', 'stylesheet');
      $themeCSSFile.attr('type', 'text/css');
      $themeCSSFile.attr('href', `themes/${themeName}/default.css`);
      $themeCSSFile.appendTo('head');
    }
    return Promise.resolve();
  }

  static createApplication(appConfig) {
    if (appConfig.type === 'iframe') {
      return new IframeApplication(appConfig);
    } else if (appConfig.type === 'executable') {
      return new ExecutableApplication(appConfig);
    }
    throw new Error(`Unknown application type : ${appConfig.type}`);
  }

  loadApps(appList) {
    this.apps = [];
    const appLoaders = [];
    let i = 0;
    for (const appRoot of appList) {
      const appIndex = i;
      appLoaders.push(
        AppLauncher.loadAppConfig(appRoot)
          .then((appConfig) => {
            this.apps[appIndex] = (AppLauncher.createApplication(appConfig));
          }
        )
      );
      i += 1;
    }

    return Promise.all(appLoaders);
  }

  loadInfoApp(appRoot) {
    return AppLauncher.loadAppConfig(appRoot)
      .then((appConfig) => {
        this.infoApp = new IframeApplication(appConfig);
      });
  }

  setLang(langCode) {
    this.lang = langCode;
    this.setTitle();
    $('.logo').replaceWith(this.renderLogo());
    $('.menu-main').replaceWith(this.renderMainMenu());
    this.resizeTitle();
  }

  onLogoClicked() {
    this.closeApp();
    this.setMenuMode();
    return false;
  }

  onLangButton() {
    this.showOverlay(this.renderLangMenu());
  }

  onInfoButton() {
    if (this.runningApp === this.infoApp) {
      return false;
    }
    this.runApp(this.infoApp);
    return false;
  }

  onCloseButton() {
    if (this.overlayVisible) {
      this.closeOverlay();
    } else {
      this.closeApp();
      this.setMenuMode();
    }
    return false;
  }

  onAppButton(app) {
    this.runApp(app);
    return false;
  }

  runApp(app) {
    this.disableUserInput();
    this.closeApp();
    if (app.type === 'iframe') {
      this.setAppMode();
      if (app !== this.infoApp) {
        this.displayTitle(app.getName(this.lang));
      }
    } else {
      this.setBlankMode();
    }
    // Delay for fluid animation
    window.setTimeout(() => {
      app.once('close', () => {
        this.closeApp();
        this.setMenuMode();
      });
      app.run(this.appContainer, this.lang);
      this.setAppVisible(true);
      this.runningApp = app;
      this.enableUserInput();
    }, 500);
  }

  closeApp() {
    this.setAppVisible(false);
    this.runningApp = null;
    this.hideTitle();
    $(this.appContainer).empty();
  }

  clearMode() {
    this.$body.removeClass((index, className) => (className.match(/(^|\s)mode-\S+/g) || []).join(' '));
  }

  setTitle() {
    if (typeof this.config.title === 'string') {
      this.title = this.config.title;
    } else if (typeof this.config.title === 'object') {
      if (this.config.title[this.lang] !== undefined) {
        this.title = this.config.title[this.lang];
      } else {
        // Defaults to english
        this.title = this.config.title.en;
      }
    }
    document.title = this.title;
  }

  setMenuMode() {
    this.clearMode();
    this.$body.addClass('mode-menu');
  }

  setAppMode() {
    this.clearMode();
    this.$body.addClass('mode-app');
  }

  setBlankMode() {
    this.clearMode();
    this.$body.addClass('mode-blank');
  }

  setAppVisible(visibility) {
    if (visibility) {
      this.$body.addClass('app-visible');
    } else {
      this.$body.removeClass('app-visible');
    }
  }

  showOverlay(content) {
    this.overlayVisible = true;
    this.setAppMode();
    this.$body.addClass('overlay-visible');
    this.$overlayContainer.append(content);
  }

  closeOverlay() {
    this.$body.removeClass('overlay-visible');
    this.$overlayContainer.empty();
    if (this.runningApp === null) {
      this.setMenuMode();
    }
    this.overlayVisible = false;
  }

  displayTitle(aTitle) {
    this.$titlePane.text(aTitle);
    this.$titlePane.addClass('visible');
  }

  hideTitle() {
    this.$titlePane.removeClass('visible');
  }

  disableUserInput() {
    this.$inputMask.show();
  }

  enableUserInput() {
    this.$inputMask.hide();
  }

  renderUtilBar() {
    const utilBar = $('<div class="util-bar"></div>');

    if (this.config.langMenuShow) {
      utilBar.append(
        $("<a class='util-button util-button-lang' href='#'><span class='fa fa-language'></span></a>")
          .on('click', this.onLangButton.bind(this))
      );
    }

    // Info button
    if (this.infoApp) {
      utilBar.append(
        $("<a class='util-button util-button-info' href='#'><span class='fa fa-info-circle'></span></a>")
          .on('click', this.onInfoButton.bind(this))
      );
    }

    // Close button
    utilBar.append(
      $("<a class='util-button util-button-close' href='#'><span class='fa fa-arrow-left'></span></a>")
        .on('click', this.onCloseButton.bind(this))
    );

    utilBar.append(this.$titlePane);

    BrowserHelper.disableDrag(utilBar);

    return utilBar;
  }

  static itemsPerRow6(itemCount) {
    const layouts = {
      1: [1],
      2: [2],
      3: [3],
      4: [4],
      5: [5],
      6: [6],
      7: [4, 3],
      8: [4, 4],
      9: [5, 4],
      10: [5, 5],
      11: [6, 5],
      12: [6, 6],
      13: [4, 5, 4],
      14: [5, 4, 5],
      15: [5, 5, 5],
      16: [5, 6, 5],
      17: [6, 5, 6],
      18: [6, 6, 6],
    };

    return layouts[itemCount];
  }

  itemsPerRow(itemCount, maxItemsPerRow) {
    const itemsPerRow = [];

    // If there's an applicable layout in the configuration, use it
    if (this.config.iconsPerRow &&
      Array.isArray(this.config.iconsPerRow) &&
      this.config.iconsPerRow.length <= 3 &&
      this.config.iconsPerRow.reduce((sum, a) => sum + a) === itemCount &&
      Math.max.apply(null, this.config.iconsPerRow) <= maxItemsPerRow
    ) {
      return this.config.iconsPerRow;
    }

    // Hardwired handling
    if (itemCount <= 18 && maxItemsPerRow === 6) {
      return AppLauncher.itemsPerRow6(itemCount);
    }

    const rowCount = Math.ceil(itemCount / maxItemsPerRow);
    let remainingItems = this.apps.length;
    for (let i = 0; i !== rowCount; i += 1) {
      const itemsInRow = Math.ceil(remainingItems / (rowCount - i));
      itemsPerRow.push(itemsInRow);
      remainingItems -= itemsInRow;
    }

    return itemsPerRow;
  }

  renderMainMenu() {
    const mainMenu = $('<div class="menu-main"></div>');
    const itemsPerRow = this.itemsPerRow(this.apps.length, this.MAX_ITEMS_PER_ROW);

    let currApp = 0;
    for (let i = 0; i !== itemsPerRow.length; i += 1) {
      const newRow = $('<div class="menu-main-row"></div>');
      newRow.addClass(`menu-main-row-${Math.max(...itemsPerRow)}`);
      for (let j = 0; j !== itemsPerRow[i]; j += 1) {
        newRow.append(this.renderMainMenuItem(this.apps[currApp]));
        currApp += 1;
      }
      mainMenu.append(newRow);
    }

    return mainMenu;
  }

  renderMainMenuItem(app) {
    const item = $('<a href="#" class="button menu-main-button"></a>')
      .on('click', this.onAppButton.bind(this, app));

    item.append($(`<img src="${app.getIcon()}" class="icon"></div>`));
    item.append($(`<div class="name">${app.getName(this.lang)}</div>`));

    BrowserHelper.disableDrag(item);

    return item;
  }

  renderAppContainer() {
    const appContainer = $('<div class="appContainer"></div>');
    this.appContainer = appContainer[0];
    return appContainer;
  }

  renderLogo() {
    const $logo = $("<a href='#' class='logo'></a>")
      .on('click', this.onLogoClicked.bind(this));

    if (this.config.logo !== undefined) {
      if (typeof this.config.logo === 'string') {
        this.logo = this.config.logo;
      } else if (typeof this.config.logo === 'object') {
        if (this.config.logo[this.lang] !== undefined) {
          this.logo = this.config.logo[this.lang];
        } else if (this.config.logo.default !== undefined) {
          this.logo = this.config.logo.default;
        }
      }
    }

    if (this.logo !== '') {
      $logo.css('background-image', `url(${this.logo})`);
    } else {
      // If there is no logo use the title
      this.$logoText = $("<div class='logo-text'></div>").text(this.title);
      $logo.append($("<div class='logo-text-wrapper'></div>").append(this.$logoText));
    }

    BrowserHelper.disableDrag($logo);

    return $logo;
  }

  renderOverlayContainer() {
    const $overlay = $("<div class='overlay'></div>");
    $overlay.append($("<div class='overlay-background'></div>"));
    this.$overlayContainer = $("<div class='overlay-container'></div>");
    $overlay.append(this.$overlayContainer);

    return $overlay;
  }

  onLangMenuChoice(code) {
    this.closeOverlay();
    this.setLang(code);
    return false;
  }

  renderLangMenu() {
    const $menu = $("<ul class='menu-lang'></ul>");

    // Count the regional variations of each language
    const variations = {};
    for (const langCode of this.config.langMenuItems) {
      const langCodeParts = langCode.split('-');
      variations[langCodeParts[0]] = (variations[langCodeParts[0]] || 0) + 1;
    }

    // Build the menu
    for (const langCode of this.config.langMenuItems) {
      const langCodeParts = langCode.split('-');
      let itemText;
      // Handle xx-xx and xx language codes separately
      if (langCodeParts.length === 2) {
        // For xx-xx languages we only show the country name if there
        // is more than one variation of the language active in the configuration
        const languageName =
          languages.getLanguageInfo(langCodeParts[0]).nativeName || langCodeParts[0];
        if (variations[langCodeParts[0]] > 1) {
          const countryName =
            (countries[langCodeParts[1].toUpperCase()] &&
          countries[langCodeParts[1].toUpperCase()].native) || langCodeParts[1];
          itemText = `${languageName} (${countryName})`;
        } else {
          itemText = languageName;
        }
      } else {
        itemText = languages.getLanguageInfo(langCode).nativeName;
      }

      const $item = $('<li></li>');
      const $link = $("<a href='#'></a>");
      $link.text(itemText);
      $link.on('click', this.onLangMenuChoice.bind(this, langCode));
      $item.append($link);
      $menu.append($item);
    }

    BrowserHelper.disableDrag($menu);

    return $menu;
  }

  resizeTitle() {
    if (this.$logoText) {
      const maxWidth = window.innerWidth * 0.9;
      const maxHeight = window.innerHeight * 0.15;
      const newScale = Math.min(
        maxHeight / this.$logoText.outerHeight(),
        maxWidth / this.$logoText.outerWidth(),
        1
      );

      this.$logoText.css('transform', `scale(${newScale})`);
    }
  }

  onResize() {
    this.resizeTitle();
  }

  onReady() {
    this.resizeTitle();
  }

  render() {
    const view = $("<div class='appLauncher'></div>");
    const rowCount = Math.ceil(this.apps.length / this.MAX_ITEMS_PER_ROW);
    view.addClass(`appLauncher-${rowCount}-rows`);

    view.append(this.renderLogo());
    view.append(this.renderMainMenu());
    view.append($('<div class="appPane"></div>'));
    view.append(this.renderAppContainer());
    view.append(this.renderOverlayContainer());
    view.append(this.renderUtilBar());
    view.append(this.$inputMask);

    return view;
  }
}
