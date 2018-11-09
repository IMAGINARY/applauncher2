import EventEmitter from 'events';

/**
 * abstract Application
 *
 * An application is a program / webapp / etc. that can be launched by the appLauncher
 */
export default class Application extends EventEmitter {

  /**
   * Constructor
   *
   * @param {object} config
   *  The app config object
   */
  constructor(config) {
    super();

    if (new.target === Application) {
      throw new TypeError('Cannot construct Application instances directly');
    }

    this.id = config.id;
    this.type = config.type;
    this.root = config.root;
    this.version = config.version;
    this.main = config.main;
    this.name = config.name;
    this.description = config.description;
  }

  /**
   * Get the localized app name
   *
   * @param {string} lang
   *  (optional) ISO Language code. Defaults to 'en'.
   * @return {string}
   */
  getName(lang = 'en') {
    if (this.name[lang]) {
      return this.name[lang];
    }
    return this.name.en;
  }

  /**
   * Get the localized app description
   *
   * @param {string} lang
   *  (optional) ISO Language code. Defaults to 'en'.
   * @return {string}
   */
  getDescription(lang = 'en') {
    if (this.description[lang]) {
      return this.description[lang];
    }
    return this.description.en;
  }

  /**
   * Gets the path to the app's icon
   *
   * @return {string}
   */
  getIcon() {
    return `${this.root}/icons/icon.png`;
  }

  /**
   * Close the app
   */
  close() {
    this.emit('close');
  }

  /**
   * Run the application
   *
   * @param {object} container
   *  A container element within the appLauncher that can be used to embed the application if needed
   * @param {string} lang
   *  (optional) ISO Language code. Defaults to 'en'.
   */
// eslint-disable-next-line no-unused-vars
  run(container, lang = 'en') {
    throw new Error('The run method must be overriden');
  }
}
