import Application from './application';

/**
 * Web applications that run in an iframe
 */
export default class IframeApplication extends Application {

  constructor(config, api) {
    super(config);
    this.width = config.width;
    this.height = config.height;
    this.api = api;
  }

  run(container, lang = 'en') {
    window.IMAGINARY.CindyViewer.create(
      container,
      `${this.root}/${this.main}`,
      this.width ? this.width : '100%',
      this.height ? this.height : '100%',
      lang
    );
    const innerWindow = $(container).find('iframe')[0].contentWindow;
    if (innerWindow.IMAGINARY === undefined) {
      innerWindow.IMAGINARY = {};
    }
    innerWindow.IMAGINARY.AppLauncher = this.api;
  }
}
