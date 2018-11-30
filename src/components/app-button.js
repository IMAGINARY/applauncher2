import BrowserHelper from '../helpers/browser-helper';

export default class AppButton {
  constructor(props) {
    this.$element = null;
    this.props = props;
  }

  render() {
    const { appID, name, icon, onClick } = this.props;
    this.$element = $('<a href="#" class="button menu-main-button"></a>')
      .on('click', () => { onClick(appID); });

    this.$element.append($(`<img src="${icon}" class="icon"></div>`)
      .on('error', (ev) => { ev.target.src = 'assets/img/icon_fallback.png'; }));
    this.$element.append($(`<div class="name">${name}</div>`));

    BrowserHelper.disableDrag(this.$element);

    return this.$element;
  }
}
