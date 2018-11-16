import IframeApplication from './applications/iframe-application';
import ExecutableApplication from './applications/executable-application';
import UtilBar from './components/util-bar';
import ImageLogo from './components/logo-img';
import TextLogo from './components/logo-text';
import LangMenu from './components/lang-menu';
import Overlay from './components/overlay';
import AppArea from './components/app-area';
import InputMask from './components/input-mask';
import AppMenu from './components/app-menu';

/**
 * The main AppLauncher Application
 */
export default class AppLauncher {

  constructor(config) {
    this.$element = null;
    this.config = Object.assign({}, AppLauncher.defaultCfg, config);
    this.lang = this.config.lang;
    this.apps = [];
    this.runningApp = null;
    this.infoApp = this.config.infoApp ? this.config.infoApp : null;

    this.$body = $('body');
    this.$body.addClass('lock-position');

    AppLauncher.loadTheme(this.config.theme);

    this.config.apps.forEach((appRoot, i) => {
      this.apps[i] = AppLauncher.createApplication(this.config.appCfgs[appRoot]);
    });
    if (this.config.infoApp) {
      this.infoApp = new IframeApplication(this.config.appCfgs[this.config.infoApp]);
    }

    this.overlay = new Overlay({
      onShow: this.onOverlayShow.bind(this),
      onClose: this.onOverlayClose.bind(this),
    });
    this.logo = this.createLogo();
    this.appMenu = new AppMenu({
      apps: this.apps,
      iconsPerRow: this.config.iconsPerRow,
      onAppClick: this.onAppMenuClick.bind(this),
      lang: this.lang,
    });
    this.utilBar = new UtilBar({
      langMenuShow: this.config.langMenuShow,
      infoAppShow: !!this.infoApp,
      onLangButton: this.onUtilLangButton.bind(this),
      onInfoButton: this.onUtilInfoButton.bind(this),
      onBackButton: this.onUtilBackButton.bind(this),
    });
    this.appArea = new AppArea();
    this.inputMask = new InputMask();

    this.setTitle();
    this.setMenuMode();
    this.initResizeHandler();
  }

  /**
   * Inits the window resize handler
   *
   * The resize handler is throttled (out of love for CPUs everywhere).
   */
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

  /**
   * Loads and activates a theme
   *
   * @param {string} themeName
   */
  static loadTheme(themeName) {
    if (themeName !== undefined) {
      const $themeCSSFile = $('<link>');
      $themeCSSFile.attr('rel', 'stylesheet');
      $themeCSSFile.attr('type', 'text/css');
      $themeCSSFile.attr('href', `themes/${themeName}/default.css`);
      $themeCSSFile.appendTo('head');
    }
  }

  /**
   * Factory method to create Application objects from a configuration
   *
   * @param {object} appConfig
   *  The app's configuration
   * @return {Application}
   */
  static createApplication(appConfig) {
    if (appConfig.type === 'iframe') {
      return new IframeApplication(appConfig);
    } else if (appConfig.type === 'executable') {
      return new ExecutableApplication(appConfig);
    }
    throw new Error(`Unknown application type : ${appConfig.type}`);
  }

  /**
   * Returns the localized value of a configuration item
   *
   * If the passed item is a string it's returned directly. If it's an object
   * with language code as keys the most appropriate option is returned
   * (the current language, 'default' or english)
   *
   * @param {string|object} item
   *  A string or object with language codes as keys
   * @return {*}
   */
  getLocalizedValue(item) {
    if (typeof item === 'string') {
      return item;
    } else if (typeof item === 'object') {
      if (item[this.lang] !== undefined) {
        return item[this.lang];
      } else if (item.default !== undefined) {
        return item.default;
      } else if (item.en !== undefined) {
        return item.en;
      }
    }

    return '';
  }

  /**
   * Sets the active language
   *
   * @param {string} langCode
   *  ISO language code
   */
  setLang(langCode) {
    this.lang = langCode;
    this.setTitle();

    const newLogo = this.createLogo();
    this.logo.$element.replaceWith(newLogo.render());
    this.logo = newLogo;
    this.appMenu.props.lang = langCode;
    this.appMenu.$element.replaceWith(this.appMenu.render());
    this.logo.resize();
  }

  /**
   * Top logo click handler
   *
   * @return {boolean}
   */
  onLogoClicked() {
    this.closeApp();
    this.setMenuMode();
    return false;
  }

  /**
   * Language switch button handler
   */
  onUtilLangButton() {
    const langMenu = new LangMenu({
      items: this.config.langMenuItems,
      onSelect: this.onLangMenuChoice.bind(this),
    });
    this.overlay.show(langMenu.render());
  }

  /**
   * Info button handler
   */
  onUtilInfoButton() {
    if (this.runningApp === this.infoApp) {
      return false;
    }
    this.runApp(this.infoApp);
    return false;
  }

  /**
   * Close button handler
   *
   * @return {boolean}
   */
  onUtilBackButton() {
    if (this.overlay.visible) {
      this.overlay.close();
    } else {
      this.closeApp();
      this.setMenuMode();
    }
    return false;
  }

  /**
   * App icon click handler
   *
   * @param {object} app
   *  The app config
   * @return {boolean}
   */
  onAppMenuClick(app) {
    this.runApp(app);
    return false;
  }

  /**
   * Run an application
   *
   * @param {object} app
   *  The configuration of the app to run
   */
  runApp(app) {
    this.inputMask.disableUserInput();
    this.closeApp();
    if (app.type === 'iframe') {
      this.setAppMode();
      if (app !== this.infoApp) {
        this.utilBar.displayTitle(app.getName(this.lang));
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
      app.run(this.appArea.getContainer(), this.lang);
      this.setAppVisible(true);
      this.runningApp = app;
      this.inputMask.enableUserInput();
    }, 500);
  }

  /**
   * Close the active app
   */
  closeApp() {
    this.setAppVisible(false);
    this.runningApp = null;
    this.utilBar.hideTitle();
    this.appArea.clear();
  }

  /**
   * Clear the active mode
   */
  clearMode() {
    this.$body.removeClass((index, className) => (className.match(/(^|\s)mode-\S+/g) || []).join(' '));
  }

  /**
   * Sets the title
   */
  setTitle() {
    document.title = this.getLocalizedValue(this.config.title);
  }

  /**
   * Sets the launcher mode to 'menu'
   */
  setMenuMode() {
    this.clearMode();
    this.$body.addClass('mode-menu');
  }

  /**
   * Sets the launcher mode to 'app'
   */
  setAppMode() {
    this.clearMode();
    this.$body.addClass('mode-app');
  }

  /**
   * Sets the launcher mode to 'blank'
   */
  setBlankMode() {
    this.clearMode();
    this.$body.addClass('mode-blank');
  }

  /**
   * Sets the app visibility
   *
   * @param {bool} visibility
   *  true if the app should be visible
   */
  setAppVisible(visibility) {
    if (visibility) {
      this.$body.addClass('app-visible');
    } else {
      this.$body.removeClass('app-visible');
    }
  }

  onOverlayShow() {
    this.setAppMode();
  }

  onOverlayClose() {
    if (this.runningApp === null) {
      this.setMenuMode();
    }
  }

  /**
   * Creates the logo
   *
   * @return {Logo}
   */
  createLogo() {
    const logoImgUrl = this.getLocalizedValue(this.config.logo);
    if (logoImgUrl !== '') {
      return new ImageLogo({
        imgUrl: logoImgUrl,
        onClick: this.onLogoClicked.bind(this),
      });
    }
    return new TextLogo({
      text: this.getLocalizedValue(this.config.title),
      onClick: this.onLogoClicked.bind(this),
    });
  }

  /**
   * Language menu selection handler
   *
   * @param code
   * @return {boolean}
   */
  onLangMenuChoice(code) {
    this.overlay.close();
    this.setLang(code);
    return false;
  }

  /**
   * Resize handler
   */
  onResize() {
    this.logo.resize();
  }

  /**
   * Renders the app Launcher
   *
   * @return {JQuery | jQuery | HTMLElement}
   */
  render() {
    this.$element = $("<div class='appLauncher'></div>");
    const rowCount = Math.ceil(this.apps.length / AppMenu.MAX_ITEMS_PER_ROW);
    this.$element.addClass(`appLauncher-${rowCount}-rows`);

    this.$element.append(this.logo.render());
    this.$element.append(this.appMenu.render());
    this.$element.append(this.appArea.render());
    this.$element.append(this.overlay.render());
    this.$element.append(this.utilBar.render());
    this.$element.append(this.inputMask.render());

    return this.$element;
  }
}


AppLauncher.defaultCfg = {
  lang: 'en',
  title: 'IMAGINARY',
  langMenuShow: false,
  theme: 'default',
};
