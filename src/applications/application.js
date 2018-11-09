import EventEmitter from 'events';

export default class Application extends EventEmitter {

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

  getName(lang = 'en') {
    if (this.name[lang]) {
      return this.name[lang];
    }
    return this.name.en;
  }

  getDescription(lang = 'en') {
    if (this.description[lang]) {
      return this.description[lang];
    }
    return this.description.en;
  }

  getIcon() {
    return `${this.root}/icons/icon.png`;
  }

  close() {
    this.emit('close');
  }

  // run(container, lang = 'en') {
  //
  // }
}
