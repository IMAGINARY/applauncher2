function isAbsoluteURL(url) {
  return /^[a-z][a-z\d+.-]*:/.test(url);
}

module.exports = {
  isAbsoluteURL,
};
