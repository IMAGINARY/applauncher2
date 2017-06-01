export default class Application {

  constructor(config) {
    this.id = config.id;
    this.root = config.root;
    this.version = config.version;
    this.main = config.main;
    this.width = config.width;
    this.height = config.height;
    this.name = config.name;
    this.description = config.description;
    console.log(`Create app ${this.id}`);
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
