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

  /**
   * Close the app
   */
  close() {
    this.emit('close');
  }
}
