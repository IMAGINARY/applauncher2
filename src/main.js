// import '@babel/polyfill';
import Promise from 'bluebird';
import AppLauncherLoader from './applauncher-loader';
import LoaderView from './components/loader-view';
import AppLauncher from './applauncher';

window.Promise = Promise;

if (!window.IMAGINARY) {
  window.IMAGINARY = {};
}

// OnReady
$(() => {
  const loaderView = new LoaderView();
  $('body').append(loaderView.render());

  const loader = new AppLauncherLoader();
  loader.events.on('progress', (progress) => {
    loaderView.setProgress(progress);
  });
  loader.run().catch((e) => {
    loaderView.showError(e.message);
    throw e;
  }).then((cfg) => {
    loaderView.$element.remove();
    const appLauncher = new AppLauncher(cfg);
    window.IMAGINARY.AppLauncher = appLauncher;
    $('body').append(appLauncher.render());
    appLauncher.onResize();
  });
});
