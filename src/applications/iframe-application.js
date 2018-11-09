import Application from './application';

/**
 * Web applications that run in an iframe
 */
export default class IframeApplicatione extends Application {

  constructor(config) {
    super(config);
    this.width = config.width;
    this.height = config.height;
  }

  run(container, lang = 'en') {
    window.IMAGINARY.CindyViewer.create(
      container,
      `${this.root}/${this.main}`,
      this.width ? this.width : null,
      this.height ? this.height : null,
      lang
    );
  }
}
