export default class BrowserHelper {
  /**
   * Gets the query string
   * @return {object} map of query string parameters
   */
  static getQueryString() {
    const pl = /\+/g;  // Regex for replacing addition symbol with a space
    const search = /([^&=]+)=?([^&]*)/g;
    const decode = (s => decodeURIComponent(s.replace(pl, ' ')));
    const query = window.location.search.substring(1);

    const urlParams = {};
    let match = search.exec(query);
    while (match) {
      urlParams[decode(match[1])] = decode(match[2]);
      match = search.exec(query);
    }

    return urlParams;
  }

  static disableDrag($element) {
    $element.on('dragstart', () => false);
  }
}
