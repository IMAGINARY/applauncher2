import BrowserHelper from '../helpers/browser-helper';

export default class AppIcon {
  constructor(props) {
    this.$element = null;
    this.props = props;
  }

  render() {
    const { app, onClick, lang } = this.props;
    this.$element = $('<a href="#" class="button menu-main-button"></a>')
      .on('click', () => { onClick(app); });

    this.$element.append($(`<img src="${app.getIcon()}" class="icon"></div>`));
    this.$element.append($(`<div class="name">${app.getName(lang)}</div>`));

    BrowserHelper.disableDrag(this.$element);

    return this.$element;
  }
}
