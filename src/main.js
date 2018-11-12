// import '@babel/polyfill';
import Promise from 'bluebird';
import AppLauncherLoader from './applauncher-loader';
import AppLauncher from './applauncher';

window.Promise = Promise;

if (!window.IMAGINARY) {
  window.IMAGINARY = {};
}

// OnReady
$(() => {
  const loader = new AppLauncherLoader();
  loader.run().then((cfg) => {
    const appLauncher = new AppLauncher(cfg);
    window.IMAGINARY.AppLauncher = appLauncher;
    $('body').append(appLauncher.render());
    appLauncher.resizeTitle();
  }).catch((e) => {
    // todo: display fatal error
  });
});
