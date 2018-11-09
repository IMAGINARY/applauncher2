import Promise from 'bluebird';
import AppLauncher from './applauncher';

window.Promise = Promise;

if (!window.IMAGINARY) {
  window.IMAGINARY = {};
}

const appLauncher = new AppLauncher();
window.IMAGINARY.AppLauncher = appLauncher;
// OnReady
$(() => {
  appLauncher.init().then(() => {
    $('body').append(appLauncher.render());
    appLauncher.onReady();
  });
});
