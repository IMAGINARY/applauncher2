import Application from './application';
import BrowserHelper from './browser-helper';

const Promise = require('bluebird');
const superagent = require('superagent');

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
    this.$inputMask = $('<div class="inputmask"></div>');
    this.$titlePane = $('<div class="titlePane"></div>');
  }

  init() {
    return this.readConfig()
      .then((config) => {
        this.config = config;
        const tasks = [];
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
        this.enableUserInput();
      });
  }

  readConfig() {
    console.log('Reading config');
    return new Promise((accept, reject) => {
      superagent
        .get('cfg/config.json')
        .set('Accept', 'json')
        .then((response) => {
          const config = response.body;
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

  loadAppConfig(appRoot) {
    return superagent.get(`${appRoot}/app.json`)
      .set('Accept', 'json')
      .then((response) => {
        const appConfig = response.body;
        appConfig.root = appRoot;
        return appConfig;
      });
  }

  loadApps(appList) {
    console.log('Loading apps');
    this.apps = [];
    const appLoaders = [];
    let i = 0;
    for (const appRoot of appList) {
      const appIndex = i;
      appLoaders.push(
        this.loadAppConfig(appRoot)
          .then((appConfig) => {
            this.apps[appIndex] = (new Application(appConfig));
          }
        )
      );
      i += 1;
    }

    return Promise.all(appLoaders);
  }

  loadInfoApp(appRoot) {
    console.log('Loading info app');
    return this.loadAppConfig(appRoot)
      .then((appConfig) => {
        this.infoApp = new Application(appConfig);
      });
  }

  onLogoClicked() {
    this.closeApp();
    this.setMenuMode();
    return false;
  }

  onInfoButton() {
    if (this.runningApp === this.infoApp) {
      return false;
    }
    this.runApp(this.infoApp);
    return false;
  }

  onCloseButton() {
    this.closeApp();
    this.setMenuMode();
    return false;
  }

  onAppButton(app) {
    this.runApp(app);
    this.displayTitle(app.getName(this.lang));
    return false;
  }

  runApp(app) {
    this.disableUserInput();
    this.closeApp();
    this.setAppMode();
    // Delay for fluid animation
    window.setTimeout(() => {
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
    $('body').removeClass((index, className) => (className.match(/(^|\s)mode-\S+/g) || []).join(' '));
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
    $('body').addClass('mode-menu');
  }

  setAppMode() {
    this.clearMode();
    $('body').addClass('mode-app');
  }

  setAppVisible(visibility) {
    if (visibility) {
      $('body').addClass('app-visible');
    } else {
      $('body').removeClass('app-visible');
    }
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

    return utilBar;
  }

  renderMainMenu() {
    const mainMenu = $('<div class="menu-main"></div>');
    const rowCount = Math.ceil(this.apps.length / 6);
    mainMenu.addClass(`menu-main-${rowCount}-rows`);

    let currRow = null;
    for (let i = 0; i !== this.apps.length; i += 1) {
      if (i % 6 === 0) {
        const rowItems = this.apps.length - i >= 6 ? 6 : this.apps.length - i;
        currRow = $('<div class="menu-main-row"></div>');
        currRow.addClass(`menu-main-row-${rowItems}`);
        mainMenu.append(currRow);
      }
      currRow.append(this.renderMainMenuItem(this.apps[i]));
    }

    return mainMenu;
  }

  renderMainMenuItem(app) {
    const item = $('<a href="#" class="button menu-main-button"></a>')
      .on('click', this.onAppButton.bind(this, app));

    item.append($(`<img src="${app.getIcon()}" class="icon"></div>`));
    item.append($(`<div class="name">${app.getName(this.lang)}</div>`));

    return item;
  }

  renderAppPane() {
    return $('<div class="appPane"></div>');
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

    $logo.css('background-image', `url(${this.logo})`);

    return $logo;
  }

  render() {
    const view = $("<div class='appLauncher'></div>");
    view.append(this.renderLogo());
    view.append(this.renderMainMenu());
    view.append(this.renderAppPane());
    view.append(this.renderAppContainer());
    view.append(this.renderUtilBar());
    view.append(this.$inputMask);

    return view;
  }
}
