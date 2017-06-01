import AppLauncher from './applauncher';

if (!window.IMAGINARY) {
  window.IMAGINARY = {};
}

const appLauncher = new AppLauncher();
window.IMAGINARY.AppLauncher = appLauncher;
appLauncher.init().then(() => {
  $('body').append(appLauncher.render());
});
